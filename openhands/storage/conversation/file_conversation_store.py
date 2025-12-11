from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

from pydantic import TypeAdapter

from openhands.core.config.openhands_config import OpenHandsConfig
from openhands.core.logger import openhands_logger as logger
from openhands.storage import get_file_store
from openhands.storage.conversation.conversation_store import ConversationStore
from openhands.storage.data_models.conversation_metadata import ConversationMetadata
from openhands.storage.data_models.conversation_metadata_result_set import (
    ConversationMetadataResultSet,
)
from openhands.storage.files import FileStore
from openhands.storage.locations import (
    get_conversation_metadata_filename,
    get_user_dir,
)
from openhands.utils.async_utils import call_sync_from_async
from openhands.utils.search_utils import offset_to_page_id, page_id_to_offset

conversation_metadata_type_adapter = TypeAdapter(ConversationMetadata)


@dataclass
class FileConversationStore(ConversationStore):
    file_store: FileStore
    user_id: str | None = field(default=None)

    async def save_metadata(self, metadata: ConversationMetadata) -> None:
        json_str = conversation_metadata_type_adapter.dump_json(metadata)
        path = self._get_metadata_path(metadata.conversation_id)
        await call_sync_from_async(self.file_store.write, path, json_str)

    async def get_metadata(self, conversation_id: str) -> ConversationMetadata:
        path = self._get_metadata_path(conversation_id)
        json_str = await call_sync_from_async(self.file_store.read, path)

        json_obj = json.loads(json_str)
        if 'created_at' not in json_obj:
            raise FileNotFoundError(path)

        if 'github_user_id' in json_obj:
            json_obj.pop('github_user_id')

        result = conversation_metadata_type_adapter.validate_python(json_obj)
        return result

    async def delete_metadata(self, conversation_id: str) -> None:
        path = str(Path(self._get_metadata_path(conversation_id)).parent)
        await call_sync_from_async(self.file_store.delete, path)

    async def exists(self, conversation_id: str) -> bool:
        path = self._get_metadata_path(conversation_id)
        try:
            await call_sync_from_async(self.file_store.read, path)
            return True
        except FileNotFoundError:
            return False

    async def search(
        self,
        page_id: str | None = None,
        limit: int = 20,
    ) -> ConversationMetadataResultSet:
        conversations: list[ConversationMetadata] = []
        conversations_dir = self._get_conversations_dir()
        try:
            conversation_ids = [
                Path(path).name
                for path in self.file_store.list(conversations_dir)
                if not Path(path).name.startswith('.')
            ]
        except FileNotFoundError:
            return ConversationMetadataResultSet([])
        num_conversations = len(conversation_ids)
        start = page_id_to_offset(page_id)
        end = min(limit + start, num_conversations)
        conversations = []
        for conversation_id in conversation_ids:
            try:
                conversations.append(await self.get_metadata(conversation_id))
            except Exception:
                logger.warning(
                    f'Could not load conversation metadata: {conversation_id}'
                )
        conversations.sort(key=_sort_key, reverse=True)
        conversations = conversations[start:end]
        next_page_id = offset_to_page_id(end, end < num_conversations)
        return ConversationMetadataResultSet(conversations, next_page_id)

    def _get_conversations_dir(self) -> str:
        if self.user_id:
            return f'{get_user_dir(self.user_id)}conversations/'
        return 'sessions/'

    def _get_metadata_path(self, conversation_id: str) -> str:
        return get_conversation_metadata_filename(conversation_id, self.user_id)

    @classmethod
    async def get_instance(
        cls, config: OpenHandsConfig, user_id: str | None
    ) -> FileConversationStore:
        file_store = get_file_store(
            file_store_type=config.file_store,
            file_store_path=config.file_store_path,
            file_store_web_hook_url=config.file_store_web_hook_url,
            file_store_web_hook_headers=config.file_store_web_hook_headers,
            file_store_web_hook_batch=config.file_store_web_hook_batch,
        )
        return FileConversationStore(file_store, user_id)


def _sort_key(conversation: ConversationMetadata) -> str:
    created_at = conversation.created_at
    if created_at:
        return created_at.isoformat()  # YYYY-MM-DDTHH:MM:SS for sorting
    return ''
