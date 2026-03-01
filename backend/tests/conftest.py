import os

# Set environment variables BEFORE any app module is imported.
# database.py reads DATABASE_URL at import time and creates the engine.
# main.py reads REDIS_URL at import time and creates a Redis client.
os.environ["DATABASE_URL"] = "sqlite:///./test.db"
os.environ["REDIS_URL"] = "redis://localhost:6379/0"
os.environ["JWT_SECRET_KEY"] = "test-secret-key"

from unittest.mock import MagicMock

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from database import Base
from main import app, get_db
from auth import get_db as auth_get_db

# --- SQLite in-memory test engine ---

engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=engine
)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


# --- Mock Redis ---

mock_redis = MagicMock()
mock_redis.get.return_value = None
mock_redis.set.return_value = True
mock_redis.delete.return_value = True


# --- Fixtures ---

@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client():
    import main

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[auth_get_db] = override_get_db

    main.r = mock_redis
    mock_redis.reset_mock()
    mock_redis.get.return_value = None

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()


@pytest.fixture()
def registered_user(client):
    user_data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "testpassword123",
    }
    response = client.post("/register", json=user_data)
    assert response.status_code == 200
    return user_data


@pytest.fixture()
def auth_headers(client, registered_user):
    response = client.post(
        "/login",
        data={
            "username": registered_user["username"],
            "password": registered_user["password"],
        },
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def second_user_headers(client):
    client.post("/register", json={
        "username": "otheruser",
        "email": "other@example.com",
        "password": "otherpassword123",
    })
    response = client.post(
        "/login",
        data={"username": "otheruser", "password": "otherpassword123"},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
