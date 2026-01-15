import asyncio
import uuid
from types import MappingProxyType
from typing import Any

from openhands.core.config.mcp_config import MCPConfig
from openhands.core.logger import openhands_logger as logger
from openhands.core.schema.agent import AgentState
from openhands.events.action import CmdRunAction
from openhands.events.action.agent import ChangeAgentStateAction
from openhands.events.action.message import MessageAction
from openhands.events.event import EventSource
from openhands.experiments.experiment_manager import ExperimentManagerImpl
from openhands.integrations.provider import (
    CUSTOM_SECRETS_TYPE,
    PROVIDER_TOKEN_TYPE,
    ProviderToken,
)
from openhands.integrations.service_types import ProviderType
from openhands.server.data_models.agent_loop_info import AgentLoopInfo
from openhands.server.session.conversation_init_data import ConversationInitData
from openhands.server.shared import (
    ConversationStoreImpl,
    SecretsStoreImpl,
    SettingsStoreImpl,
    config,
    conversation_manager,
    server_config,
)
from openhands.server.types import AppMode, LLMAuthenticationError, MissingSettingsError
from openhands.storage.data_models.conversation_metadata import (
    ConversationMetadata,
    ConversationTrigger,
)
from openhands.storage.data_models.secrets import Secrets
from openhands.utils.async_utils import call_sync_from_async
from openhands.utils.conversation_summary import get_default_conversation_title


async def _run_init_command(
    agent_session,
    command: str,
    timeout: int = 60,
    hidden: bool = True,
) -> tuple[bool, str]:
    """Run a command during template init and return success status and output."""
    cmd_action = CmdRunAction(command=command, blocking=True, hidden=hidden)
    cmd_action.set_hard_timeout(timeout)

    try:
        obs = await call_sync_from_async(agent_session.runtime.run_action, cmd_action)
        output = getattr(obs, 'content', str(obs))
        exit_code = getattr(obs, 'exit_code', 1)
        return exit_code == 0, output
    except Exception as e:
        logger.error(f'Command failed: {command} - {e}')
        return False, str(e)


async def _initialize_template_async(
    conversation_id: str,
    template_id: str,
    agent_loop_info: 'AgentLoopInfo',
) -> None:
    """Initialize template asynchronously with progress tracking.

    Runs lu init in background and polls lu init-status for progress updates.
    """
    from openhands.server.services.template_manager import TemplateManager

    template_manager = TemplateManager()
    template = template_manager.get_template(template_id)

    if not template:
        logger.warning(f'Template not found: {template_id}')
        return

    agent_session = conversation_manager.get_agent_session(conversation_id)
    if not agent_session:
        logger.warning(f'No agent session for conversation {conversation_id}')
        return

    # Wait for runtime to be ready
    logger.info(f'Waiting for runtime to be ready for template init: {conversation_id}')
    max_wait = 120
    waited = 0
    while waited < max_wait:
        if agent_session.runtime and agent_session.runtime.runtime_initialized:
            break
        await asyncio.sleep(1)
        waited += 1

    if not agent_session.runtime or not agent_session.runtime.runtime_initialized:
        logger.warning(f'Runtime not ready after {max_wait}s, skipping template init')
        error_msg = MessageAction(
            content=f'Runtime not ready. You can manually initialize the template by running:\n```\nlu init {template_id} app\n```'
        )
        agent_session.event_stream.add_event(error_msg, EventSource.AGENT)
        return

    logger.info(f'Starting template initialization: {template_id} for {conversation_id}')

    project_name = 'app'
    workspace = config.workspace_mount_path_in_sandbox
    project_dir = f'{workspace}/{project_name}'

    try:
        # Start lu init in background
        command = f'lu init {template_id} {project_name} --dir {project_dir} --background'
        success, output = await _run_init_command(agent_session, command, timeout=30)

        if not success:
            error_msg = MessageAction(
                content=f'Failed to start initialization: {output[:200]}'
            )
            agent_session.event_stream.add_event(error_msg, EventSource.AGENT)
            return

        # Poll for progress
        last_step_num = 0
        max_poll_time = 300  # 5 minutes max
        poll_interval = 2
        poll_elapsed = 0
        deployer_address = None

        step_messages = {
            1: 'Creating Lumio account...',
            2: 'Funding account from faucet...',
            3: 'Copying template files...',
            4: 'Configuring project...',
            5: 'Deploying contract...',
            6: 'Starting frontend...',
        }

        while poll_elapsed < max_poll_time:
            await asyncio.sleep(poll_interval)
            poll_elapsed += poll_interval

            # Read status file directly
            _, status_output = await _run_init_command(
                agent_session, 'cat /tmp/lumiovibe-init-status 2>/dev/null || echo "starting"', timeout=5
            )
            status_output = status_output.strip()

            # Check if completed
            if status_output == 'complete':
                # Show any remaining steps
                while last_step_num < 6:
                    last_step_num += 1
                    if last_step_num in step_messages:
                        step_msg = MessageAction(content=step_messages[last_step_num])
                        agent_session.event_stream.add_event(step_msg, EventSource.AGENT)

                # Get deployer address
                _, config_content = await _run_init_command(
                    agent_session, f'cat {workspace}/.lumio/config.yaml', timeout=5
                )
                if config_content:
                    for line in config_content.split('\n'):
                        if 'account:' in line:
                            deployer_address = line.split(':')[-1].strip().strip('"\'')
                            if deployer_address and not deployer_address.startswith('0x'):
                                deployer_address = f'0x{deployer_address}'

                success_msg = MessageAction(
                    content=f'Project initialized successfully!\n\n'
                    f'Project: `{project_dir}`\n'
                    f'Contract: `{deployer_address or "unknown"}`'
                )
                agent_session.event_stream.add_event(success_msg, EventSource.AGENT)
                logger.info(f'Template {template_id} initialized successfully')
                break

            # Check if failed
            if status_output.startswith('error'):
                error_msg = MessageAction(
                    content=f'Template initialization failed: {status_output}'
                )
                agent_session.event_stream.add_event(error_msg, EventSource.AGENT)
                logger.error(f'Template init failed: {status_output}')
                break

            # Parse step number from format: step:N/6:action
            if status_output.startswith('step:'):
                parts = status_output.split(':')
                if len(parts) >= 2:
                    try:
                        current_step_num = int(parts[1].split('/')[0])

                        # Show all steps up to current (including skipped ones)
                        while last_step_num < current_step_num:
                            last_step_num += 1
                            if last_step_num in step_messages:
                                step_msg = MessageAction(content=step_messages[last_step_num])
                                agent_session.event_stream.add_event(step_msg, EventSource.AGENT)

                            # Show account address after step 1
                            if last_step_num == 1 and not deployer_address:
                                _, config_content = await _run_init_command(
                                    agent_session, f'cat {workspace}/.lumio/config.yaml', timeout=5
                                )
                                if config_content:
                                    for line in config_content.split('\n'):
                                        if 'account:' in line:
                                            deployer_address = line.split(':')[-1].strip().strip('"\'')
                                            if deployer_address and not deployer_address.startswith('0x'):
                                                deployer_address = f'0x{deployer_address}'
                                            if deployer_address:
                                                addr_msg = MessageAction(content=f'Account: `{deployer_address}`')
                                                agent_session.event_stream.add_event(addr_msg, EventSource.AGENT)
                                            break
                    except (ValueError, IndexError):
                        pass
        else:
            # Timeout
            logger.warning(f'Template init timed out after {max_poll_time}s')
            timeout_msg = MessageAction(
                content=f'Initialization timed out. Check status with `lu init-status`'
            )
            agent_session.event_stream.add_event(timeout_msg, EventSource.AGENT)

    except Exception as e:
        logger.error(f'Error during template init: {e}')
        error_msg = MessageAction(
            content=f'Error initializing template: {str(e)}\n\nYou can try manually: `lu init {template_id} app`'
        )
        agent_session.event_stream.add_event(error_msg, EventSource.AGENT)
    finally:
        # Set agent state back to AWAITING_USER_INPUT
        agent_session.event_stream.add_event(
            ChangeAgentStateAction(AgentState.AWAITING_USER_INPUT),
            EventSource.ENVIRONMENT,
        )


async def initialize_conversation(
    user_id: str | None,
    conversation_id: str | None,
    selected_repository: str | None,
    selected_branch: str | None,
    conversation_trigger: ConversationTrigger = ConversationTrigger.GUI,
    git_provider: ProviderType | None = None,
    template_id: str | None = None,
) -> ConversationMetadata:
    if conversation_id is None:
        conversation_id = uuid.uuid4().hex

    conversation_store = await ConversationStoreImpl.get_instance(config, user_id)

    if not await conversation_store.exists(conversation_id):
        logger.info(
            f'New conversation ID: {conversation_id}',
            extra={'user_id': user_id, 'session_id': conversation_id},
        )

        conversation_title = get_default_conversation_title(conversation_id)

        # If template_id is provided, use template name as title
        if template_id:
            from openhands.server.services.template_manager import TemplateManager

            template_manager = TemplateManager()
            template = template_manager.get_template(template_id)
            if template:
                conversation_title = template.name
                logger.info(f'Using template name as title: {conversation_title}')

        logger.info(f'Saving metadata for conversation {conversation_id}')
        conversation_metadata = ConversationMetadata(
            trigger=conversation_trigger,
            conversation_id=conversation_id,
            title=conversation_title,
            user_id=user_id,
            selected_repository=selected_repository,
            selected_branch=selected_branch,
            git_provider=git_provider,
            template_id=template_id,
        )

        await conversation_store.save_metadata(conversation_metadata)
        return conversation_metadata

    # Conversation exists - check if it's a standby conversation that needs updating
    conversation_metadata = await conversation_store.get_metadata(conversation_id)

    # If this is a standby conversation being activated, update its metadata
    if conversation_metadata.is_standby:
        logger.info(
            f'Updating standby conversation {conversation_id} with new metadata',
            extra={'user_id': user_id, 'session_id': conversation_id},
        )

        conversation_title = get_default_conversation_title(conversation_id)
        if template_id:
            from openhands.server.services.template_manager import TemplateManager

            template_manager = TemplateManager()
            template = template_manager.get_template(template_id)
            if template:
                conversation_title = template.name

        conversation_metadata.trigger = conversation_trigger
        conversation_metadata.title = conversation_title
        conversation_metadata.selected_repository = selected_repository
        conversation_metadata.selected_branch = selected_branch
        conversation_metadata.git_provider = git_provider
        conversation_metadata.template_id = template_id
        # Note: is_standby will be set to False by mark_standby_as_active

        await conversation_store.save_metadata(conversation_metadata)

    return conversation_metadata


async def start_conversation(
    user_id: str | None,
    git_provider_tokens: PROVIDER_TOKEN_TYPE | None,
    custom_secrets: CUSTOM_SECRETS_TYPE | None,
    initial_user_msg: str | None,
    image_urls: list[str] | None,
    replay_json: str | None,
    conversation_id: str,
    conversation_metadata: ConversationMetadata,
    conversation_instructions: str | None,
    mcp_config: MCPConfig | None = None,
) -> AgentLoopInfo:
    logger.info(
        'Creating conversation',
        extra={
            'signal': 'create_conversation',
            'user_id': user_id,
            'trigger': conversation_metadata.trigger,
        },
    )
    logger.info('Loading settings')
    settings_store = await SettingsStoreImpl.get_instance(config, user_id)
    settings = await settings_store.load()
    if settings:
        settings = settings.merge_with_config_settings()
    logger.info('Settings loaded')

    session_init_args: dict[str, Any] = {}
    if settings:
        session_init_args = {**settings.__dict__, **session_init_args}
        # We could use litellm.check_valid_key for a more accurate check,
        # but that would run a tiny inference.
        model_name = settings.llm_model or ''
        is_bedrock_model = model_name.startswith('bedrock/')
        is_lemonade_model = model_name.startswith('lemonade/')

        if (
            not is_bedrock_model
            and not is_lemonade_model
            and (
                not settings.llm_api_key
                or settings.llm_api_key.get_secret_value().isspace()
            )
        ):
            logger.warning(f'Missing api key for model {settings.llm_model}')
            raise LLMAuthenticationError(
                'Error authenticating with the LLM provider. Please check your API key'
            )
        elif is_bedrock_model:
            logger.info(f'Bedrock model detected ({model_name}), API key not required')

    else:
        logger.warning('Settings not present, not starting conversation')
        raise MissingSettingsError('Settings not found')

    session_init_args['git_provider_tokens'] = git_provider_tokens
    session_init_args['selected_repository'] = conversation_metadata.selected_repository
    session_init_args['custom_secrets'] = custom_secrets
    session_init_args['selected_branch'] = conversation_metadata.selected_branch
    session_init_args['git_provider'] = conversation_metadata.git_provider
    session_init_args['conversation_instructions'] = conversation_instructions
    session_init_args['template_id'] = conversation_metadata.template_id
    if mcp_config:
        session_init_args['mcp_config'] = mcp_config

    conversation_init_data = ConversationInitData(**session_init_args)

    conversation_init_data = ExperimentManagerImpl.run_conversation_variant_test(
        user_id, conversation_id, conversation_init_data
    )

    logger.info(
        f'Starting agent loop for conversation {conversation_id}',
        extra={'user_id': user_id, 'session_id': conversation_id},
    )

    initial_message_action = None
    if initial_user_msg or image_urls:
        initial_message_action = MessageAction(
            content=initial_user_msg or '',
            image_urls=image_urls or [],
        )

    agent_loop_info = await conversation_manager.maybe_start_agent_loop(
        conversation_id,
        conversation_init_data,
        user_id,
        initial_user_msg=initial_message_action,
        replay_json=replay_json,
    )
    logger.info(f'Finished initializing conversation {agent_loop_info.conversation_id}')
    return agent_loop_info


async def create_new_conversation(
    user_id: str | None,
    git_provider_tokens: PROVIDER_TOKEN_TYPE | None,
    custom_secrets: CUSTOM_SECRETS_TYPE | None,
    selected_repository: str | None,
    selected_branch: str | None,
    initial_user_msg: str | None,
    image_urls: list[str] | None,
    replay_json: str | None,
    conversation_instructions: str | None = None,
    conversation_trigger: ConversationTrigger = ConversationTrigger.GUI,
    git_provider: ProviderType | None = None,
    conversation_id: str | None = None,
    mcp_config: MCPConfig | None = None,
    template_id: str | None = None,
) -> AgentLoopInfo:
    if template_id is None:
        from openhands.server.services.template_manager import TemplateManager

        template_manager = TemplateManager()
        default_template = template_manager.get_default_template()
        if default_template:
            template_id = default_template.id
            logger.info(f'Using default template: {template_id}')

    # Try to acquire a standby conversation if user_id is provided and no specific
    # conversation_id is requested
    standby_conversation_id = None
    if user_id and not conversation_id:
        standby_conversation_id = await conversation_manager.try_acquire_standby_conversation(
            user_id
        )
        if standby_conversation_id:
            logger.info(
                f'Using standby conversation {standby_conversation_id} for user {user_id[:16]}',
                extra={'session_id': standby_conversation_id, 'user_id': user_id},
            )
            conversation_id = standby_conversation_id

            # Template initialization will be done non-blocking after conversation starts

    conversation_metadata = await initialize_conversation(
        user_id,
        conversation_id,
        selected_repository,
        selected_branch,
        conversation_trigger,
        git_provider,
        template_id,
    )

    # Mark standby as active if we used one
    if standby_conversation_id and user_id:
        await conversation_manager.mark_standby_as_active(
            user_id, standby_conversation_id
        )

    agent_loop_info = await start_conversation(
        user_id,
        git_provider_tokens,
        custom_secrets,
        initial_user_msg,
        image_urls,
        replay_json,
        conversation_metadata.conversation_id,
        conversation_metadata,
        conversation_instructions,
        mcp_config,
    )

    # Start template initialization in background (non-blocking)
    if template_id:
        logger.info(
            f'Starting async template initialization for {agent_loop_info.conversation_id}',
            extra={'session_id': agent_loop_info.conversation_id, 'template_id': template_id},
        )

        # Add initial message to event stream BEFORE async task
        # This ensures it's in history when client loads
        agent_session = conversation_manager.get_agent_session(
            agent_loop_info.conversation_id
        )
        if agent_session and agent_session.event_stream:
            from openhands.server.services.template_manager import TemplateManager

            template_manager = TemplateManager()
            template = template_manager.get_template(template_id)
            template_name = template.name if template else template_id

            init_msg = MessageAction(
                content=f'Initializing project from template `{template_name}`...\n\nThis will set up a Lumio account, deploy the smart contract, and start the frontend.'
            )
            agent_session.event_stream.add_event(init_msg, EventSource.AGENT)

            # Set RUNNING state to block user input during initialization
            agent_session.event_stream.add_event(
                ChangeAgentStateAction(AgentState.RUNNING),
                EventSource.ENVIRONMENT,
            )

        asyncio.create_task(
            _initialize_template_async(
                agent_loop_info.conversation_id,
                template_id,
                agent_loop_info,
            )
        )

    return agent_loop_info


def create_provider_tokens_object(
    providers_set: list[ProviderType],
) -> PROVIDER_TOKEN_TYPE:
    """Create provider tokens object for the given providers."""
    provider_information: dict[ProviderType, ProviderToken] = {}

    for provider in providers_set:
        provider_information[provider] = ProviderToken(token=None, user_id=None)

    return MappingProxyType(provider_information)


async def setup_init_conversation_settings(
    user_id: str | None,
    conversation_id: str,
    providers_set: list[ProviderType],
    provider_tokens: PROVIDER_TOKEN_TYPE | None = None,
) -> ConversationInitData:
    """Set up conversation initialization data with provider tokens.

    Args:
        user_id: The user ID
        conversation_id: The conversation ID
        providers_set: List of provider types to set up tokens for
        provider_tokens: Optional provider tokens to use (for SAAS mode resume)

    Returns:
        ConversationInitData with provider tokens configured
    """
    settings_store = await SettingsStoreImpl.get_instance(config, user_id)
    settings = await settings_store.load()
    if settings:
        settings = settings.merge_with_config_settings()

    secrets_store = await SecretsStoreImpl.get_instance(config, user_id)
    user_secrets: Secrets | None = await secrets_store.load()

    if not settings:
        from socketio.exceptions import ConnectionRefusedError

        raise ConnectionRefusedError(
            'Settings not found', {'msg_id': 'CONFIGURATION$SETTINGS_NOT_FOUND'}
        )

    session_init_args: dict = {}
    session_init_args = {**settings.__dict__, **session_init_args}

    # Use provided tokens if available (for SAAS resume), otherwise create scaffold
    if provider_tokens:
        logger.info(
            f'Using provided provider_tokens: {list(provider_tokens.keys())}',
            extra={'session_id': conversation_id},
        )
        git_provider_tokens = provider_tokens
    else:
        logger.info(
            f'No provider_tokens provided, creating scaffold for: {providers_set}',
            extra={'session_id': conversation_id},
        )
        git_provider_tokens = create_provider_tokens_object(providers_set)
        logger.info(
            f'Git provider scaffold: {git_provider_tokens}',
            extra={'session_id': conversation_id},
        )

        if server_config.app_mode != AppMode.SAAS and user_secrets:
            logger.info(
                f'Non-SaaS mode: Overriding with user_secrets provider tokens: {list(user_secrets.provider_tokens.keys())}',
                extra={'session_id': conversation_id},
            )
            git_provider_tokens = user_secrets.provider_tokens

    session_init_args['git_provider_tokens'] = git_provider_tokens
    if user_secrets:
        session_init_args['custom_secrets'] = user_secrets.custom_secrets

    conversation_init_data = ConversationInitData(**session_init_args)
    # We should recreate the same experiment conditions when restarting a conversation
    return ExperimentManagerImpl.run_conversation_variant_test(
        user_id, conversation_id, conversation_init_data
    )
