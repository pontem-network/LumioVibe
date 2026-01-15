"""Runtime Pool for pre-creating standby conversations for whitelisted users.

This module provides a pool of pre-created conversations with running containers
that can be assigned to whitelisted users for faster session startup.
"""

import asyncio
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

from openhands.core.config import OpenHandsConfig
from openhands.core.logger import openhands_logger as logger
from openhands.server.services.lumio_service import LumioService
from openhands.storage.data_models.conversation_metadata import ConversationMetadata
from openhands.storage.files import FileStore
from openhands.storage.locations import (
    get_conversation_workspace_dir,
)

if TYPE_CHECKING:
    from openhands.server.session.session import WebSession


@dataclass
class StandbySession:
    """A pre-created standby session ready for assignment."""

    user_id: str
    conversation_id: str
    session: 'WebSession | None' = None
    assigned: bool = False


@dataclass
class RuntimePool:
    """Pool of pre-created standby conversations for whitelisted users.

    This pool pre-creates conversations with running containers for each
    whitelisted user at startup, allowing for near-instant session creation.
    """

    config: OpenHandsConfig
    file_store: FileStore
    lumio_service: LumioService
    _standby_sessions: dict[str, StandbySession] = field(default_factory=dict)
    _lock: asyncio.Lock = field(default_factory=asyncio.Lock)
    _initialized: bool = field(default=False, init=False)
    # Store factories for creating new standby sessions later
    _conversation_store_factory: Any | None = field(default=None, init=False)
    _session_factory: Any | None = field(default=None, init=False)
    _settings_factory: Any | None = field(default=None, init=False)

    async def initialize(
        self,
        conversation_store_factory,
        session_factory,
        settings_factory,
    ) -> None:
        """Initialize the pool by cleaning up old standby conversations and creating new ones.

        Args:
            conversation_store_factory: Async callable to get ConversationStore for a user
            session_factory: Callable to create a new Session
            settings_factory: Async callable to get Settings for a user
        """
        if self._initialized:
            logger.warning('RuntimePool already initialized')
            return

        print('>>> RuntimePool.initialize() called')
        logger.info('Initializing RuntimePool...')

        # Store factories for later use (creating new standby after one is used)
        self._conversation_store_factory = conversation_store_factory
        self._session_factory = session_factory
        self._settings_factory = settings_factory

        # Get whitelisted users from contract
        try:
            print('>>> Getting whitelist from contract...')
            whitelist = await self.lumio_service.get_whitelist()
            print(f'>>> Got whitelist: {len(whitelist)} users')
        except Exception as e:
            print(f'>>> Failed to get whitelist: {e}')
            logger.error(f'Failed to get whitelist: {e}')
            whitelist = []

        if not whitelist:
            print('>>> No whitelisted users found, pool will be empty')
            logger.warning('No whitelisted users found, pool will be empty')
            self._initialized = True
            return

        print(f'>>> Found {len(whitelist)} whitelisted users')
        logger.info(f'Found {len(whitelist)} whitelisted users')

        # Clean up old standby conversations for each user
        for user_id in whitelist:
            print(f'>>> Cleaning up standby for user {user_id[:16]}...')
            await self._cleanup_user_standby_conversations(
                user_id, conversation_store_factory
            )

        # Create new standby sessions
        for user_id in whitelist:
            try:
                print(f'>>> Creating standby session for user {user_id[:16]}...')
                await self._create_standby_session(
                    user_id,
                    conversation_store_factory,
                    session_factory,
                    settings_factory,
                )
                print(f'>>> Standby session created for user {user_id[:16]}')
            except Exception as e:
                print(f'>>> FAILED to create standby for {user_id[:16]}: {e}')
                logger.error(
                    f'Failed to create standby session for {user_id[:16]}: {e}'
                )

        logger.info(
            f'RuntimePool initialized: {len(self._standby_sessions)} standby sessions'
        )
        self._initialized = True

    async def _cleanup_user_standby_conversations(
        self,
        user_id: str,
        conversation_store_factory,
    ) -> None:
        """Clean up old standby conversations for a user (those without project files)."""
        from openhands.runtime import get_runtime_cls

        try:
            conversation_store = await conversation_store_factory(user_id)
            result = await conversation_store.search(limit=100)

            for metadata in result.results:
                if metadata.is_standby:
                    # Delete standby conversation
                    logger.info(
                        f'Deleting old standby conversation {metadata.conversation_id} '
                        f'for user {user_id[:16]}'
                    )
                    try:
                        # Delete the runtime container first
                        runtime_cls = get_runtime_cls(self.config.runtime)
                        await runtime_cls.delete(metadata.conversation_id)
                        logger.info(f'Deleted container for {metadata.conversation_id}')
                    except Exception as e:
                        logger.debug(
                            f'Failed to delete container for '
                            f'{metadata.conversation_id}: {e}'
                        )

                    try:
                        await conversation_store.delete_metadata(
                            metadata.conversation_id
                        )
                        # Also delete workspace directory
                        workspace_dir = get_conversation_workspace_dir(
                            metadata.conversation_id, user_id
                        )
                        self._delete_directory(workspace_dir)
                    except Exception as e:
                        logger.warning(
                            f'Failed to delete standby conversation '
                            f'{metadata.conversation_id}: {e}'
                        )
        except Exception as e:
            logger.warning(
                f'Failed to cleanup standby conversations for {user_id[:16]}: {e}'
            )

    def _delete_directory(self, path: str) -> None:
        """Delete a directory from file store."""
        try:
            # List and delete all files in directory
            files = self.file_store.list(path)
            for file_path in files:
                self.file_store.delete(file_path)
        except Exception as e:
            logger.debug(f'Failed to delete directory {path}: {e}')

    async def _create_standby_session(
        self,
        user_id: str,
        conversation_store_factory,
        session_factory,
        settings_factory,
    ) -> StandbySession:
        """Create a standby session for a user."""
        # Generate unique conversation ID
        conversation_id = f'standby-{uuid.uuid4().hex[:12]}'

        print(f'>>> _create_standby_session: {conversation_id} for {user_id[:16]}')
        logger.info(
            f'Creating standby session {conversation_id} for user {user_id[:16]}'
        )

        # Get conversation store and settings
        print(f'>>> Getting conversation store for {user_id[:16]}...')
        conversation_store = await conversation_store_factory(user_id)
        print(f'>>> Getting settings for {user_id[:16]}...')
        settings = await settings_factory(user_id)
        print(f'>>> Settings loaded: {settings is not None}')

        if settings is None:
            logger.warning(
                f'No settings found for user {user_id[:16]}, skipping standby creation'
            )
            raise ValueError(f'No settings for user {user_id[:16]}')

        # Create conversation metadata
        metadata = ConversationMetadata(
            conversation_id=conversation_id,
            user_id=user_id,
            selected_repository=None,
            title='New Conversation',
            created_at=datetime.now(timezone.utc),
            last_updated_at=datetime.now(timezone.utc),
            is_standby=True,
        )
        await conversation_store.save_metadata(metadata)

        # Create workspace directory
        workspace_dir = get_conversation_workspace_dir(conversation_id, user_id)
        self.file_store.write(f'{workspace_dir}/.keep', '')

        # Create session with running container
        print(f'>>> Creating session for {conversation_id}...')
        session = await session_factory(conversation_id, settings, user_id)

        # Wait for runtime to be fully initialized
        print(f'>>> Waiting for runtime to be ready for {conversation_id}...')
        max_wait_seconds = 120
        wait_interval = 1
        waited = 0
        while waited < max_wait_seconds:
            if (
                session.agent_session.runtime
                and session.agent_session.runtime.runtime_initialized
            ):
                print(f'>>> Runtime ready for {conversation_id} after {waited}s')
                break
            await asyncio.sleep(wait_interval)
            waited += wait_interval
        else:
            logger.warning(
                f'Runtime for {conversation_id} not ready after {max_wait_seconds}s'
            )

        standby = StandbySession(
            user_id=user_id,
            conversation_id=conversation_id,
            session=session,
            assigned=False,
        )

        async with self._lock:
            self._standby_sessions[user_id] = standby

        logger.info(
            f'Standby session {conversation_id} created for user {user_id[:16]}'
        )
        return standby

    async def acquire(self, user_id: str) -> str | None:
        """Acquire a standby conversation for a user.

        Args:
            user_id: The user's wallet address

        Returns:
            Conversation ID if available, None otherwise
        """
        async with self._lock:
            standby = self._standby_sessions.get(user_id)
            if standby and not standby.assigned:
                standby.assigned = True
                logger.info(
                    f'Assigned standby conversation {standby.conversation_id} '
                    f'to user {user_id[:16]}'
                )
                return standby.conversation_id
            return None

    async def mark_conversation_active(
        self,
        user_id: str,
        conversation_id: str,
        conversation_store_factory,
    ) -> None:
        """Mark a standby conversation as active (no longer standby).

        This should be called when the user actually starts using the conversation.
        Also triggers creation of a new standby session for this user in the background.
        """
        async with self._lock:
            standby = self._standby_sessions.get(user_id)
            if standby and standby.conversation_id == conversation_id:
                # Update metadata to remove standby flag
                try:
                    conversation_store = await conversation_store_factory(user_id)
                    metadata = await conversation_store.get_metadata(conversation_id)
                    metadata.is_standby = False
                    await conversation_store.save_metadata(metadata)
                    logger.info(
                        f'Marked conversation {conversation_id} as active for user {user_id[:16]}'
                    )
                except Exception as e:
                    logger.warning(f'Failed to mark conversation as active: {e}')

                # Remove from standby pool
                del self._standby_sessions[user_id]

                # Create a new standby session for this user in the background
                asyncio.create_task(self._create_new_standby_for_user(user_id))

    async def _create_new_standby_for_user(self, user_id: str) -> None:
        """Create a new standby session for a user after their previous one was used."""
        if not self._session_factory or not self._settings_factory:
            logger.warning('Cannot create new standby - factories not initialized')
            return

        try:
            logger.info(f'Creating new standby session for user {user_id[:16]}...')
            await self._create_standby_session(
                user_id,
                self._conversation_store_factory,
                self._session_factory,
                self._settings_factory,
            )
            logger.info(f'New standby session created for user {user_id[:16]}')
        except Exception as e:
            logger.error(f'Failed to create new standby for {user_id[:16]}: {e}')

    async def release(self, user_id: str) -> None:
        """Release a standby conversation back to the pool."""
        async with self._lock:
            standby = self._standby_sessions.get(user_id)
            if standby:
                standby.assigned = False
                logger.info(
                    f'Released standby conversation {standby.conversation_id} '
                    f'for user {user_id[:16]}'
                )

    async def initialize_template_on_standby(
        self, user_id: str, template_id: str
    ) -> bool:
        """Initialize a template on an acquired standby session.

        This should be called after acquiring a standby if a template_id is provided.

        Args:
            user_id: The user's ID
            template_id: The template to initialize

        Returns:
            True if initialization succeeded, False otherwise
        """
        async with self._lock:
            standby = self._standby_sessions.get(user_id)
            if not standby or not standby.session:
                return False

            session = standby.session
            if not session.agent_session or not session.agent_session.runtime:
                return False

            try:
                logger.info(
                    f'Initializing template {template_id} on standby {standby.conversation_id}'
                )
                await session.agent_session._initialize_template(
                    template_id, session.config
                )
                return True
            except Exception as e:
                logger.error(f'Failed to initialize template on standby: {e}')
                return False

    async def get_session(self, user_id: str) -> 'WebSession | None':
        """Get the session for a user's standby conversation."""
        async with self._lock:
            standby = self._standby_sessions.get(user_id)
            if standby:
                return standby.session
            return None

    async def get_status(self) -> dict:
        """Get pool status."""
        async with self._lock:
            total = len(self._standby_sessions)
            assigned = sum(1 for s in self._standby_sessions.values() if s.assigned)
            return {
                'total': total,
                'assigned': assigned,
                'available': total - assigned,
                'users': [
                    {
                        'user_id': s.user_id[:16],
                        'conversation_id': s.conversation_id,
                        'assigned': s.assigned,
                    }
                    for s in self._standby_sessions.values()
                ],
            }

    async def shutdown(self) -> None:
        """Shutdown all standby sessions."""
        logger.info('Shutting down RuntimePool...')
        async with self._lock:
            for user_id, standby in self._standby_sessions.items():
                try:
                    if standby.session:
                        await standby.session.close()
                    logger.debug(f'Closed standby session for {user_id[:16]}')
                except Exception as e:
                    logger.error(f'Error closing standby session for {user_id}: {e}')
            self._standby_sessions.clear()
        logger.info('RuntimePool shutdown complete')

    def is_user_in_pool(self, user_id: str) -> bool:
        """Check if a user has a standby session in the pool."""
        return user_id in self._standby_sessions

    def has_available_standby(self, user_id: str) -> bool:
        """Check if a user has an available (unassigned) standby session."""
        standby = self._standby_sessions.get(user_id)
        return standby is not None and not standby.assigned
