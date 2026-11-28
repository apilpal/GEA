"""Writes failed requests to the operations log (issue #40): refused access, failed bulk saves, server errors.

It looks only at the method, the path and the status code. It never reads the request or the response body.
"""

from fastapi import Request

from src.core import ops_log
from src.services.ops_rules import SERVER_ERROR, classify


async def ops_middleware(request: Request, call_next):
    try:
        response = await call_next(request)
    except Exception:
        ops_log.record(SERVER_ERROR, method=request.method, path=request.url.path, status=500, reason="unhandled error")
        raise
    kind = classify(request.method, request.url.path, response.status_code)
    if kind:
        ops_log.record(kind, method=request.method, path=request.url.path, status=response.status_code)
    return response
