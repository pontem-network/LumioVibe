from dataclasses import field
from datetime import datetime, timezone
from enum import Enum
import glob
import os
from pathlib import Path
from venv import logger

from deprecated import deprecated
from pydantic import BaseModel
from openhands.storage.data_models.conversation_metadata import ConversationMetadata
from openhands.storage.locations import get_conversation_workspace_dir

class DeploymentStatus(Enum):
    STOPPED = 'stopped'
    STARTING = 'starting'
    RUNNING = 'running'
    ERROR = 'error'
    REDEPLOYING = 'redeploying'


class DeploymentMetadata(BaseModel):
    """Metadata for a deployed application linked to a conversation."""

    user_id: str | None = None
    title: str | None = None

    conversation_id: str | None = None
    container_id: str | None = None
    project_dir: str | None = None

    status: DeploymentStatus = DeploymentStatus.STOPPED
    contract_address: str | None = None
    deployer_address: str | None = None
    app_port: int | None = None
    app_url: str | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    started_at: datetime | None = None
    stopped_at: datetime | None = None
    last_deploy_at: datetime | None = None
    deploy_count: int = 0
    total_runtime_seconds: float = 0.0
    total_cost: float = 0.0
    error_message: str | None = None

    @deprecated('use __dict__ instead of to_dict')
    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            'conversation_id': self.conversation_id,
            'container_id': self.container_id,
            'status': self.status.value,
            'contract_address': self.contract_address,
            'deployer_address': self.deployer_address,
            'app_port': self.app_port,
            'app_url': self.app_url,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'stopped_at': self.stopped_at.isoformat() if self.stopped_at else None,
            'total_runtime_seconds': self.total_runtime_seconds,
            'total_cost': self.total_cost,
            'error_message': self.error_message,
            'last_deploy_at': self.last_deploy_at.isoformat()
            if self.last_deploy_at
            else None,
            'deploy_count': self.deploy_count,
            'created_at': self.created_at.isoformat(),
        }

    def from_conversation_data(data:ConversationMetadata, root_path: Path)-> 'DeploymentMetadata':
        deployment = DeploymentMetadata()
        deployment.conversation_id=data.conversation_id
        deployment.user_id=data.user_id
        deployment.title=data.title

        deployment.init_project_name(root_path)

        return deployment


    def init_project_name(self, root_path: Path)->bool:
        relative_conv_dir = get_conversation_workspace_dir(self.conversation_id, self.user_id)

        for found in glob.glob(f"{root_path}/{relative_conv_dir}*/spec.md"):
            self.project_dir=os.path.basename(Path(found).parent)
            return True

        return False

    def init_project_name_if_not_init_with_save(self, root_path: Path)->bool :
        if self.project_dir is not None:
            return False

        return self.init_project_name(root_path)

    def can_it_run(self, root_path: Path)-> bool:
        if self.project_dir is None:
            return False

        relative_conv_dir = get_conversation_workspace_dir(self.conversation_id, self.user_id)
        start_path = f"{root_path}/{relative_conv_dir}{self.project_dir}/frontend/start.sh"

        return os.path.exists(start_path)







