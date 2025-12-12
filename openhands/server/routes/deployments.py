from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from openhands.deployment.deployment_manager import DeploymentManager
from openhands.server.shared import config
from openhands.server.user_auth import get_user_id

router = APIRouter(prefix='/api/deployments', tags=['deployments'])

_deployment_manager: DeploymentManager | None = None


def get_deployment_manager() -> DeploymentManager:
    global _deployment_manager
    if _deployment_manager is None:
        _deployment_manager = DeploymentManager(config)
    return _deployment_manager


class StartDeploymentRequest(BaseModel):
    pass


class RedeployRequest(BaseModel):
    pass


@router.get('')
async def list_deployments(
    request: Request,
    user_id: str | None = Depends(get_user_id),
):
    """List all deployments for user."""
    if not user_id:
        raise HTTPException(status_code=401, detail='Unauthorized')

    manager = get_deployment_manager()
    deployments = manager.list_deployments(user_id)
    return {'deployments': deployments}


@router.get('/{conversation_id}')
async def get_deployment(
    conversation_id: str,
    request: Request,
    user_id: str | None = Depends(get_user_id),
):
    """Get deployment status and stats."""
    if not user_id:
        raise HTTPException(status_code=401, detail='Unauthorized')

    manager = get_deployment_manager()
    status = manager.get_deployment_status(conversation_id, user_id)
    return status


@router.post('/{conversation_id}/start')
async def start_deployment(
    conversation_id: str,
    request: Request,
    user_id: str | None = Depends(get_user_id),
):
    """Start deployment for conversation."""
    if not user_id:
        raise HTTPException(status_code=401, detail='Unauthorized')

    manager = get_deployment_manager()
    result = await manager.start_deployment(conversation_id, user_id)

    if not result.get('success'):
        raise HTTPException(
            status_code=400,
            detail=result.get('error', 'Failed to start deployment'),
        )

    return result


@router.post('/{conversation_id}/stop')
async def stop_deployment(
    conversation_id: str,
    request: Request,
    user_id: str | None = Depends(get_user_id),
):
    """Stop deployment for conversation."""
    if not user_id:
        raise HTTPException(status_code=401, detail='Unauthorized')

    manager = get_deployment_manager()
    result = await manager.stop_deployment(conversation_id, user_id)

    if not result.get('success'):
        raise HTTPException(
            status_code=400,
            detail=result.get('error', 'Failed to stop deployment'),
        )

    return result


@router.post('/{conversation_id}/redeploy')
async def redeploy_contract(
    conversation_id: str,
    request: Request,
    user_id: str | None = Depends(get_user_id),
):
    """Redeploy contract to new address."""
    if not user_id:
        raise HTTPException(status_code=401, detail='Unauthorized')

    manager = get_deployment_manager()
    result = await manager.redeploy_contract(conversation_id, user_id)

    if not result.get('success'):
        raise HTTPException(
            status_code=400,
            detail=result.get('error', 'Failed to redeploy contract'),
        )

    return result


@router.get('/config/rates')
async def get_deployment_rates(request: Request):
    """Get deployment pricing rates."""
    return {
        'hourly_rate': config.deployment.hourly_rate,
        'currency': 'LUM',
    }
