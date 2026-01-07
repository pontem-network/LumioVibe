import asyncio
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, cast

import docker
import httpx
from docker.errors import NotFound
from docker.models.containers import Container

from openhands.core.config import OpenHandsConfig
from openhands.core.logger import openhands_logger as logger
from openhands.runtime.utils import find_available_tcp_port
from openhands.storage.conversation.file_conversation_store import FileConversationStore
from openhands.storage.data_models.deployment_metadata import (
    DeploymentMetadata,
    DeploymentStatus,
)
from openhands.storage.locations import get_conversation_workspace_dir

DEPLOY_PORT_RANGE = (50000, 54999)


class DeploymentManager:
    """Manages deployment containers for conversations."""

    def __init__(self, config: OpenHandsConfig):
        self.config = config
        self.deployment_config = config.deployment
        self.docker_client = docker.from_env()
        self._file_store_path = os.path.expanduser(config.file_store_path)

    def _get_abs_path(self, relative_path: str) -> Path:
        """Get absolute path from relative path within file store."""
        return Path(self._file_store_path) / relative_path

    def _get_metadata_path(self, conversation_id: str, user_id: str) -> Path:
        """Get path to deployment metadata file in conversation workspace."""
        workspace_rel = get_conversation_workspace_dir(conversation_id, user_id)
        return self._get_abs_path(workspace_rel) / '.deployment.json'

    def _load_metadata(
        self, conversation_id: str, user_id: str
    ) -> DeploymentMetadata | None:
        """Load deployment metadata from file."""
        path = self._get_metadata_path(conversation_id, user_id)
        if not path.exists():
            return None
        try:
            with open(path, 'r') as f:
                return DeploymentMetadata.model_validate_json(f.read())
        except Exception as e:
            logger.error(f'Failed to load deployment metadata: {e}')
            return None

    def _save_metadata(self, metadata: DeploymentMetadata, user_id: str | None):
        """Save deployment metadata to file."""
        if user_id is not None:
            metadata.user_id = user_id

        if metadata.conversation_id is None or metadata.user_id is None:
            raise ValueError('conversation_id and user_id must be set')

        path = self._get_metadata_path(metadata.conversation_id, metadata.user_id)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, 'w') as f:
            f.write(metadata.model_dump_json(indent=2))

    def _get_container_name(self, conversation_id: str) -> str:
        """Generate container name for deployment."""
        return f'{self.deployment_config.container_name_prefix}{conversation_id[:16]}'

    def _get_container(self, conversation_id: str) -> Container | None:
        """Get running container for conversation if exists."""
        container_name = self._get_container_name(conversation_id)
        try:
            container = self.docker_client.containers.get(container_name)
            return container
        except NotFound:
            return None

    def _is_deployable(self, conversation_id: str, user_id: str) -> bool:
        """Check if conversation workspace has deployable frontend with package.json."""
        workspace_rel = get_conversation_workspace_dir(conversation_id, user_id)
        workspace_path = self._get_abs_path(workspace_rel)
        if not workspace_path.exists():
            return False
        # Look for package.json in any project's frontend folder
        for project_dir in workspace_path.iterdir():
            if project_dir.is_dir():
                frontend_package = project_dir / 'frontend' / 'package.json'
                if frontend_package.exists():
                    return True
        return False

    def get_deployment_status(self, conversation_id: str, user_id: str) -> dict:
        """Get current deployment status with live stats."""
        metadata = self._load_metadata(conversation_id, user_id)
        container = self._get_container(conversation_id)

        if not metadata:
            metadata = DeploymentMetadata(conversation_id=conversation_id)

        result = metadata.__dict__
        result['is_deployable'] = self._is_deployable(conversation_id, user_id)

        if container:
            container.reload()
            state = container.attrs.get('State', {})
            is_running = state.get('Running', False)

            if is_running:
                metadata.status = DeploymentStatus.RUNNING
                metadata.container_id = container.id

                started_at_str = state.get('StartedAt', '')
                if started_at_str:
                    started_at = datetime.fromisoformat(
                        started_at_str.replace('Z', '+00:00')
                    )
                    metadata.started_at = started_at

                    uptime_seconds = (
                        datetime.now(timezone.utc) - started_at
                    ).total_seconds()
                    current_session_cost = (
                        uptime_seconds / 3600
                    ) * self.deployment_config.hourly_rate

                    result['uptime_seconds'] = uptime_seconds
                    result['current_session_cost'] = current_session_cost
            else:
                metadata.status = DeploymentStatus.STOPPED
        else:
            if metadata.status == DeploymentStatus.RUNNING:
                metadata.status = DeploymentStatus.STOPPED

        result['status'] = metadata.status.value
        result['hourly_rate'] = self.deployment_config.hourly_rate

        self._save_metadata(metadata, user_id)
        return result

    async def list_deployments(self, user_id: str) -> list[DeploymentMetadata]:
        conv_store: FileConversationStore = await FileConversationStore.get_instance(
            config=self.config, user_id=user_id
        )

        """List all deployments for user."""
        deployments: list[DeploymentMetadata] = []

        for id in conv_store.ids():
            loaded_from_file: DeploymentMetadata | None = self._load_metadata(
                id, user_id
            )
            deploy_data: DeploymentMetadata

            if loaded_from_file is None:
                conv_data = await conv_store.get_metadata(id)
                deploy_data = DeploymentMetadata.from_conversation_data(
                    data=conv_data, root_path=Path(self._file_store_path)
                )

                self._save_metadata(deploy_data, user_id)
            else:
                deploy_data = loaded_from_file
                if deploy_data.init_project_name_if_not_init_with_save(
                    Path(self._file_store_path)
                ):
                    self._save_metadata(deploy_data, user_id)

            if not deploy_data.can_it_run(Path(self._file_store_path)):
                continue

            deployments.append(deploy_data)

        return deployments

    async def start_deployment(self, conversation_id: str, user_id: str) -> dict:
        """Start deployment container for conversation."""

        metadata: DeploymentMetadata | None = self._load_metadata(
            conversation_id, user_id
        )
        if metadata is None:
            return {
                'success': False,
                'error': 'No deployment metadata found',
            }

        front_path: str | None = metadata.frontend_path()
        if front_path is None:
            return {
                'success': False,
                'error': 'No deployable frontend found in workspace',
            }
        workspace_dir: Path = self._get_abs_path(front_path).parent

        container = self._get_container(conversation_id)
        if container:
            container.reload()
            if container.attrs.get('State', {}).get('Running'):
                return {
                    'success': False,
                    'error': 'Deployment already running',
                }
            container.remove(force=True)

        container_name = self._get_container_name(conversation_id)

        app_port = find_available_tcp_port(*DEPLOY_PORT_RANGE)
        if not app_port:
            return {'success': False, 'error': 'No available port'}

        metadata.status = DeploymentStatus.STARTING
        metadata.app_port = app_port
        self._save_metadata(metadata, user_id)

        try:
            runtime_image = (
                self.config.sandbox.runtime_container_image
                or self.config.sandbox.base_container_image
                or 'ghcr.io/all-hands-ai/runtime:0.39-nikolaik'
            )

            startup_script = """#!/bin/bash
set -e;
ls -l /workspace/;
cd /workspace/frontend;
if [ ! -d "node_modules" ]; then
    pnpm install --store-dir /tmp/pnpm-store --shamefully-hoist
fi;
pnpm vite --host --port ${APP_PORT_1} --strictPort;
"""

            run_kwargs: dict[str, Any] = {
                'command': ['bash', '-c', startup_script],
                'name': container_name,
                'detach': True,
                'environment': {
                    'APP_PORT_1': str(app_port),
                    'APP_BASE_URL_1': f'http://localhost:{app_port}',
                },
                'ports': {f'{app_port}/tcp': app_port},
                'volumes': {
                    workspace_dir: {'bind': '/workspace', 'mode': 'rw'},
                },
                # 'restart_policy': {
                #     'Name': restart_policy_name,
                #     'MaximumRetryCount': self.deployment_config.max_restart_attempts,
                # },
                'labels': {
                    'openhands.deployment': 'true',
                    'openhands.conversation_id': conversation_id,
                    'openhands.user_id': user_id,
                },
            }
            container = cast(
                Container,
                self.docker_client.containers.run(runtime_image, **run_kwargs),
            )

            startup_timeout = self.deployment_config.startup_timeout
            start_time = time.time()
            is_ready = False

            logger.info(f'Waiting for app to start on port {app_port}...')

            while time.time() - start_time < startup_timeout:
                container.reload()
                state = container.attrs.get('State', {})

                if not state.get('Running'):
                    logs = container.logs(tail=100).decode('utf-8')
                    metadata.status = DeploymentStatus.ERROR
                    metadata.error_message = f'Container stopped unexpectedly:\n{logs}'
                    self._save_metadata(metadata, user_id)
                    logger.error(f'Container stopped: {logs[:500]}')
                    return {
                        'success': False,
                        'error': metadata.error_message,
                    }

                # Check if app is responding with HTTP request
                try:
                    async with httpx.AsyncClient() as client:
                        response = await client.head(
                            f'http://localhost:{app_port}',
                            timeout=2.0,
                        )
                        if response.status_code < 500:
                            is_ready = True
                            logger.info(f'App is ready on port {app_port}')
                            break
                except (httpx.ConnectError, httpx.TimeoutException):
                    pass
                except Exception as e:
                    logger.debug(f'Health check failed: {e}')

                await asyncio.sleep(2)

            if not is_ready:
                logs = container.logs(tail=100).decode('utf-8')
                container.stop()
                container.remove()
                metadata.status = DeploymentStatus.ERROR
                metadata.error_message = (
                    f'Startup timeout ({startup_timeout}s):\n{logs}'
                )
                self._save_metadata(metadata, user_id)
                logger.error(f'Startup timeout: {logs[:500]}')
                return {
                    'success': False,
                    'error': metadata.error_message,
                }

            metadata.status = DeploymentStatus.RUNNING
            metadata.container_id = container.id
            metadata.app_url = f'http://localhost:{app_port}'
            metadata.started_at = datetime.now(timezone.utc)
            metadata.error_message = None
            self._save_metadata(metadata, user_id)

            return {
                'success': True,
                'app_url': metadata.app_url,
                'port': app_port,
            }

        except Exception as e:
            logger.exception('Failed to start deployment')
            metadata.status = DeploymentStatus.ERROR
            metadata.error_message = str(e)
            self._save_metadata(metadata, user_id)
            return {'success': False, 'error': str(e)}

    async def stop_deployment(self, conversation_id: str, user_id: str) -> dict:
        """Stop deployment container."""
        metadata = self._load_metadata(conversation_id, user_id)
        container = self._get_container(conversation_id)

        if not container:
            return {'success': False, 'error': 'No deployment running'}

        try:
            container.reload()
            state = container.attrs.get('State', {})

            if state.get('Running') and metadata and metadata.started_at:
                uptime = (
                    datetime.now(timezone.utc) - metadata.started_at
                ).total_seconds()
                session_cost = (uptime / 3600) * self.deployment_config.hourly_rate
                metadata.total_runtime_seconds += uptime
                metadata.total_cost += session_cost

            container.stop(timeout=10)
            container.remove()

            if metadata:
                metadata.status = DeploymentStatus.STOPPED
                metadata.stopped_at = datetime.now(timezone.utc)
                metadata.container_id = None
                self._save_metadata(metadata, user_id)

            return {'success': True}

        except Exception as e:
            logger.exception('Failed to stop deployment')
            return {'success': False, 'error': str(e)}

    async def redeploy_contract(self, conversation_id: str, user_id: str) -> dict:
        """Redeploy contract to new address."""
        metadata = self._load_metadata(conversation_id, user_id) or DeploymentMetadata(
            conversation_id=conversation_id
        )

        await self.stop_deployment(conversation_id, user_id)

        metadata.status = DeploymentStatus.REDEPLOYING
        self._save_metadata(metadata, user_id)

        workspace_rel = get_conversation_workspace_dir(conversation_id, user_id)
        workspace_dir = str(self._get_abs_path(workspace_rel))
        container_name = f'{self._get_container_name(conversation_id)}-redeploy'

        try:
            runtime_image = (
                self.config.sandbox.runtime_container_image
                or self.config.sandbox.base_container_image
                or 'ghcr.io/all-hands-ai/runtime:0.39-nikolaik'
            )

            redeploy_script = """#!/bin/bash
set -e

export PATH="/openhands/bin:$PATH"

cd /workspace

# Create new account
lumio init --assume-yes --skip-faucet

# Get new address
NEW_ADDRESS=$(lumio account list | grep -oE '0x[a-fA-F0-9]+' | head -1)
echo "NEW_ADDRESS=$NEW_ADDRESS"

# Fund account
lumio account fund-with-faucet --amount 100000000

# Deploy contract
cd contract
lumio move publish --package-dir . --assume-yes

# Update useContract.ts with new address
if [ -f "../frontend/src/hooks/useContract.ts" ]; then
    sed -i "s/const CONTRACT_ADDRESS = '[^']*'/const CONTRACT_ADDRESS = '$NEW_ADDRESS'/" ../frontend/src/hooks/useContract.ts
fi

echo "DEPLOY_SUCCESS"
echo "CONTRACT_ADDRESS=$NEW_ADDRESS"
"""

            container = self.docker_client.containers.run(
                runtime_image,
                command=['bash', '-c', redeploy_script],
                name=container_name,
                detach=True,
                volumes={
                    workspace_dir: {'bind': '/workspace', 'mode': 'rw'},
                },
                labels={
                    'openhands.redeploy': 'true',
                    'openhands.conversation_id': conversation_id,
                },
            )

            exit_code = container.wait(timeout=120)
            logs = container.logs().decode('utf-8')
            container.remove()

            if exit_code.get('StatusCode', 1) != 0:
                metadata.status = DeploymentStatus.ERROR
                metadata.error_message = f'Redeploy failed:\n{logs}'
                self._save_metadata(metadata, user_id)
                return {'success': False, 'error': metadata.error_message}

            new_address = None
            for line in logs.split('\n'):
                if line.startswith('CONTRACT_ADDRESS='):
                    new_address = line.split('=')[1].strip()
                    break

            metadata.contract_address = new_address
            metadata.deployer_address = new_address
            metadata.deploy_count += 1
            metadata.last_deploy_at = datetime.now(timezone.utc)
            metadata.status = DeploymentStatus.STOPPED
            metadata.error_message = None
            self._save_metadata(metadata, user_id)

            start_result = await self.start_deployment(conversation_id, user_id)

            return {
                'success': True,
                'contract_address': new_address,
                'app_url': start_result.get('app_url'),
            }

        except Exception as e:
            logger.exception('Failed to redeploy contract')
            metadata.status = DeploymentStatus.ERROR
            metadata.error_message = str(e)
            self._save_metadata(metadata, user_id)
            return {'success': False, 'error': str(e)}
