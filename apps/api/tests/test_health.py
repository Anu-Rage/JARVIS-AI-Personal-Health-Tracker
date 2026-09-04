from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_users_me_requires_auth() -> None:
    response = client.get("/api/v1/users/me")
    assert response.status_code == 401
