from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum


class DeploymentStatus(Enum):
    STOPPED = 'stopped'
    STARTING = 'starting'
    RUNNING = 'running'
    ERROR = 'error'
    REDEPLOYING = 'redeploying'


@dataclass
class DeploymentMetadata:
    """Metadata for a deployed application linked to a conversation."""

    conversation_id: str
    container_id: str | None = None
    status: DeploymentStatus = DeploymentStatus.STOPPED
    contract_address: str | None = None
    deployer_address: str | None = None
    app_port: int | None = None
    app_url: str | None = None
    started_at: datetime | None = None
    stopped_at: datetime | None = None
    total_runtime_seconds: float = 0.0
    total_cost: float = 0.0
    error_message: str | None = None
    last_deploy_at: datetime | None = None
    deploy_count: int = 0
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

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

    @classmethod
    def from_dict(cls, data: dict) -> 'DeploymentMetadata':
        """Create from dictionary."""
        return cls(
            conversation_id=data['conversation_id'],
            container_id=data.get('container_id'),
            status=DeploymentStatus(data.get('status', 'stopped')),
            contract_address=data.get('contract_address'),
            deployer_address=data.get('deployer_address'),
            app_port=data.get('app_port'),
            app_url=data.get('app_url'),
            started_at=datetime.fromisoformat(data['started_at'])
            if data.get('started_at')
            else None,
            stopped_at=datetime.fromisoformat(data['stopped_at'])
            if data.get('stopped_at')
            else None,
            total_runtime_seconds=data.get('total_runtime_seconds', 0.0),
            total_cost=data.get('total_cost', 0.0),
            error_message=data.get('error_message'),
            last_deploy_at=datetime.fromisoformat(data['last_deploy_at'])
            if data.get('last_deploy_at')
            else None,
            deploy_count=data.get('deploy_count', 0),
            created_at=datetime.fromisoformat(data['created_at'])
            if data.get('created_at')
            else datetime.now(timezone.utc),
        )
