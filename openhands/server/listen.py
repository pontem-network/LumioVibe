import os

import socketio
from authx_extra.session import SessionMiddleware

from openhands.core.config.openhands_config import SESSION_SECRET_KEY
from openhands.server.app import app as base_app
from openhands.server.listen_socket import sio
from openhands.server.middleware import (
    CacheControlMiddleware,
    InMemoryRateLimiter,
    LocalhostCORSMiddleware,
    RateLimitMiddleware,
    TokenRateLimitMiddleware,
)
from openhands.server.static import SPAStaticFiles
from openhands.storage.session import MemoryIOSession

if os.getenv('SERVE_FRONTEND', 'true').lower() == 'true':
    base_app.mount(
        '/', SPAStaticFiles(directory='./frontend/build', html=True), name='dist'
    )

base_app.add_middleware(LocalhostCORSMiddleware)
base_app.add_middleware(CacheControlMiddleware)
base_app.add_middleware(TokenRateLimitMiddleware)
base_app.add_middleware(
    RateLimitMiddleware,
    rate_limiter=InMemoryRateLimiter(requests=10, seconds=1),
)
base_app.add_middleware(
    SessionMiddleware,
    secret_key=SESSION_SECRET_KEY,
    store=MemoryIOSession(),
    http_only=False,
    secure=False,
    max_age=3600,
    session_cookie='usid',
    session_object='session',
)


app = socketio.ASGIApp(sio, other_asgi_app=base_app)
