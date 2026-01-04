CONVERSATION_BASE_DIR = 'sessions'
WORKSPACE_DIR_NAME = 'workspace'
USERS_BASE_DIR = 'users'


def get_user_dir(user_id: str | None) -> str:
    if user_id:
        return f'{USERS_BASE_DIR}/{user_id}/'
    return ''


def get_user_settings_filename(user_id: str | None) -> str:
    return f'{get_user_dir(user_id)}settings.json'


def get_user_secrets_filename(user_id: str | None) -> str:
    return f'{get_user_dir(user_id)}secrets.json'


def get_conversation_workspace_dir(sid: str, user_id: str | None = None) -> str:
    return f'{get_conversation_dir(sid, user_id)}{WORKSPACE_DIR_NAME}/'


def get_conversation_dir(sid: str, user_id: str | None = None) -> str:
    if user_id:
        return f'{get_user_dir(user_id)}conversations/{sid}/'
    else:
        return f'{CONVERSATION_BASE_DIR}/{sid}/'


def get_conversation_events_dir(sid: str, user_id: str | None = None) -> str:
    return f'{get_conversation_dir(sid, user_id)}events/'


def get_conversation_event_filename(
    sid: str, id: int, user_id: str | None = None
) -> str:
    return f'{get_conversation_events_dir(sid, user_id)}{id}.json'


def get_conversation_metadata_filename(sid: str, user_id: str | None = None) -> str:
    return f'{get_conversation_dir(sid, user_id)}metadata.json'


def get_conversation_init_data_filename(sid: str, user_id: str | None = None) -> str:
    return f'{get_conversation_dir(sid, user_id)}init.json'


def get_conversation_agent_state_filename(sid: str, user_id: str | None = None) -> str:
    return f'{get_conversation_dir(sid, user_id)}agent_state.pkl'


def get_conversation_llm_registry_filename(sid: str, user_id: str | None = None) -> str:
    return f'{get_conversation_dir(sid, user_id)}llm_registry.json'


def get_conversation_stats_filename(sid: str, user_id: str | None = None) -> str:
    return f'{get_conversation_dir(sid, user_id)}conversation_stats.pkl'


def get_experiment_config_filename(sid: str, user_id: str | None = None) -> str:
    return f'{get_conversation_dir(sid, user_id)}exp_config.json'


def get_conversation_image_filename(sid: str, user_id: str | None = None) -> str:
    return f'{get_conversation_dir(sid, user_id)}image.png'
