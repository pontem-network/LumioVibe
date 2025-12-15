from pydantic import BaseModel, Field


class DeploymentConfig(BaseModel):
    """Configuration for deployment/hosting functionality."""

    hourly_rate: float = Field(
        default=0.02,
        description='Cost per hour for hosting a deployed app (in LUM)',
    )
    auto_restart: bool = Field(
        default=True,
        description='Automatically restart container if it crashes',
    )
    max_restart_attempts: int = Field(
        default=3,
        description='Maximum number of restart attempts before giving up',
    )
    container_name_prefix: str = Field(
        default='openhands-deploy-',
        description='Prefix for deployment container names',
    )
    health_check_interval: int = Field(
        default=30,
        description='Interval in seconds between health checks',
    )
    startup_timeout: int = Field(
        default=120,
        description='Timeout in seconds for app startup',
    )
