import logging
import os

from fastapi import Depends, HTTPException, status
from fastapi.security import APIKeyHeader

logger = logging.getLogger(__name__)

_SESSION_API_KEY = os.getenv('SESSION_API_KEY')
_SESSION_API_KEY_HEADER = APIKeyHeader(name='X-Session-API-Key', auto_error=False)

_is_production = os.getenv('ENVIRONMENT', '').lower() == 'production'
if not _SESSION_API_KEY:
    if _is_production:
        logger.error(
            'SECURITY ERROR: SESSION_API_KEY not set in production environment. '
            'API endpoints are unprotected. Set SESSION_API_KEY environment variable.'
        )
    else:
        logger.warning(
            'SECURITY WARNING: SESSION_API_KEY not set. '
            'API endpoints are unprotected. Set SESSION_API_KEY for secure deployments.'
        )


def check_session_api_key(
    session_api_key: str | None = Depends(_SESSION_API_KEY_HEADER),
):
    """Check the session API key and throw an exception if incorrect. Having this as a dependency
    means it appears in OpenAPI Docs
    """
    if session_api_key != _SESSION_API_KEY:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED)


def get_dependencies() -> list[Depends]:
    result = []
    if _SESSION_API_KEY:
        result.append(Depends(check_session_api_key))
    return result
