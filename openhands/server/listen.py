import os

import socketio
from authx_extra.extra._memory import MemoryIO
from authx_extra.session import SessionMiddleware

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
    secret_key='MNMC-toqC-j2rd-aaU8',
    store=MemoryIO(),
    http_only=True,
    secure=False,
    max_age=0,
    session_cookie='sid',
    session_object='session',
)


app = socketio.ASGIApp(sio, other_asgi_app=base_app)
