import json
import os
import time
from pathlib import Path

from authx._internal import SignatureSerializer
from authx_extra.extra._memory import MemoryIO

from openhands.core.config.openhands_config import OPENHANDS_DIR, SESSION_SECRET_KEY
from openhands.core.logger import openhands_logger as logger


class MemoryIOSession(MemoryIO):
    root_dir: str

    def __init__(self) -> None:
        super().__init__()

        for child in Path(session_dir()).iterdir():
            if child.is_file() and child.suffix == '.json':
                with open(child, 'r') as f:
                    json_str = f.read()
                    value = json.loads(json_str)
                    self.raw_memory_store[child.stem] = value

    async def save_store(self, session_id: str) -> None:
        value = self.raw_memory_store.get(session_id, {})
        json_str: str = json.dumps(value)
        path_to_session = session_path(session_id)
        with open(path_to_session, 'w') as f:
            f.write(json_str)

        return None

    async def cleanup_old_sessions(self) -> None:
        current_time = int(time.time())
        sessions_to_delete = [
            session_id
            for session_id, session_info in self.raw_memory_store.items()
            if current_time - session_info['created_at'] > 3600 * 12
        ]
        for session_id in sessions_to_delete:
            delete_session_file(session_id)
            del self.raw_memory_store[session_id]


def session_dir() -> str:
    return OPENHANDS_DIR + '/sessval'


def get_session_id_from_usid_token(token: str) -> str | None:
    sign = SignatureSerializer(SESSION_SECRET_KEY, expired_in=0)
    decoded_dict, _err = sign.decode(token)
    if decoded_dict is None:
        return None

    return decoded_dict.get('usid')


def session_path(session_id: str) -> str:
    dir_session = session_dir()

    if not os.path.exists(dir_session):
        os.makedirs(dir_session)

    return dir_session + '/' + session_id + '.json'


def load_session_file(session_id: str):
    path = session_path(session_id)
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    else:
        return None


def delete_session_file(session_id: str):
    path = session_path(session_id)
    if os.path.exists(path):
        logger.warning('drop session %s', session_id)
        os.remove(path)
