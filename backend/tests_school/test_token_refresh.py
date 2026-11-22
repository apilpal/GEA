"""Token refresh: the cookie from /login must refresh, bad tokens must give 401.

Covers the bugs fixed together with migration 0003: the refresh cookie was never read
(a ``Cookie`` object was used as the token), tokens from /login could not be refreshed,
bad tokens caused 500 errors, and the enhanced flow needed the auth tables.

Run from backend/:   python -m pytest tests_school -q
"""
import asyncio
from types import SimpleNamespace

import pytest
import sqlalchemy as sa
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from main import app
from src.core.models import CreateUserRequest, get_db
from src.utils.user_utils import create_user

from .helpers import async_url, migrate, run_with_session

PASSWORD = "Password123"
CREDENTIALS = {"username_or_email": "admin", "password": PASSWORD}


@pytest.fixture
def env(tmp_path):
    db = tmp_path / "auth.db"
    migrate(db)
    run_with_session(db, lambda s: create_user(
        s, CreateUserRequest(username="admin", email="admin@school.local", password=PASSWORD, role="admin")))

    engine = create_async_engine(async_url(db))
    sessions = async_sessionmaker(engine, expire_on_commit=False)

    async def override_get_db():
        async with sessions() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    limiter = getattr(app.state, "limiter", None)
    limiter_was_enabled = getattr(limiter, "enabled", None)
    if limiter is not None:
        limiter.enabled = False  # these tests log in many times

    def new_client():
        # no `with`: skips the app start-up code, which would open the real database
        return TestClient(app, base_url="https://testserver", raise_server_exceptions=False)

    try:
        yield SimpleNamespace(client=new_client, db=db)
    finally:
        app.dependency_overrides.pop(get_db, None)
        if limiter is not None and limiter_was_enabled is not None:
            limiter.enabled = limiter_was_enabled
        asyncio.run(engine.dispose())


def test_login_cookie_refreshes_the_access_token(env):
    client = env.client()
    assert client.post("/api/auth/login", json=CREDENTIALS).status_code == 200

    response = client.post("/api/auth/token/refresh")

    assert response.status_code == 200
    body = response.json()
    assert body["access_token"] and body["user"]["username"] == "admin"
    assert client.get("/api/auth/me").status_code == 200


def test_legacy_refresh_endpoint_works_too(env):
    client = env.client()
    client.post("/api/auth/login", json=CREDENTIALS)

    response = client.post("/api/auth/refresh")

    assert response.status_code == 200
    assert response.json()["user"]["username"] == "admin"


def test_missing_refresh_cookie_is_401(env):
    assert env.client().post("/api/auth/token/refresh").status_code == 401


def test_garbage_refresh_cookie_is_401_not_500(env):
    client = env.client()
    client.cookies.set("refresh_token", "not-a-token")

    assert client.post("/api/auth/token/refresh").status_code == 401
    assert client.post("/api/auth/refresh").status_code == 401


def test_access_token_is_not_accepted_as_a_refresh_token(env):
    client = env.client()
    client.post("/api/auth/login", json=CREDENTIALS)
    access_token = client.cookies.get("access_token")
    client.cookies.clear()
    client.cookies.set("refresh_token", access_token)

    assert client.post("/api/auth/token/refresh").status_code == 401


def test_enhanced_refresh_rotates_the_token_and_revokes_the_old_one(env):
    client = env.client()
    assert client.post("/api/auth/login-enhanced", json=CREDENTIALS).status_code == 200
    first = client.cookies.get("refresh_token")

    refreshed = client.post("/api/auth/token/refresh")
    second = client.cookies.get("refresh_token")

    assert refreshed.status_code == 200 and refreshed.json()["user"]["username"] == "admin"
    assert second and second != first

    replay = env.client()
    replay.cookies.set("refresh_token", first)
    reused = replay.post("/api/auth/token/refresh")
    assert reused.status_code == 401
    assert "revoked" in reused.json()["detail"]

    assert client.post("/api/auth/token/refresh").status_code == 200  # the new one still works


def test_enhanced_login_and_refresh_are_written_to_the_audit_log(env):
    client = env.client()
    client.post("/api/auth/login-enhanced", json=CREDENTIALS)
    client.post("/api/auth/token/refresh")

    engine = sa.create_engine(f"sqlite:///{env.db}")
    with engine.connect() as conn:
        actions = [row[0] for row in conn.execute(sa.text("SELECT action FROM auth_audit_log ORDER BY id"))]
        blacklisted = conn.execute(sa.text("SELECT COUNT(*) FROM token_blacklist")).scalar()

    assert actions == ["login", "token_refresh"]
    assert blacklisted == 1  # the rotated refresh token
