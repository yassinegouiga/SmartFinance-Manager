import uuid
import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

from tests.conftest import TEST_FIREBASE_UID

TEST_NOTIF_ID = uuid.uuid4()


def make_mock_notification(**overrides):
    defaults = {
        "id": TEST_NOTIF_ID,
        "user_id": TEST_FIREBASE_UID,
        "title": "Budget Alert",
        "message": "You have exceeded your grocery budget.",
        "type": "BUDGET_EXCEEDED",
        "is_read": False,
        "created_at": datetime.now(timezone.utc),
    }
    defaults.update(overrides)
    mock = MagicMock()
    for k, v in defaults.items():
        setattr(mock, k, v)
    return mock


class TestHealthCheck:
    @pytest.mark.asyncio
    async def test_health_returns_200(self, client):
        response = await client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"


class TestListNotifications:
    @pytest.mark.asyncio
    @patch("src.api.v1.endpoints.notifications.crud_notification.get_notifications", new_callable=AsyncMock)
    async def test_returns_empty_list(self, mock_get, client):
        mock_get.return_value = []
        response = await client.get("/api/v1/notifications/")
        assert response.status_code == 200
        assert response.json() == []

    @pytest.mark.asyncio
    @patch("src.api.v1.endpoints.notifications.crud_notification.get_notifications", new_callable=AsyncMock)
    async def test_returns_notifications(self, mock_get, client):
        mock_get.return_value = [make_mock_notification()]
        response = await client.get("/api/v1/notifications/")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["title"] == "Budget Alert"
        assert data[0]["is_read"] is False


class TestUnreadCount:
    @pytest.mark.asyncio
    @patch("src.api.v1.endpoints.notifications.crud_notification.get_unread_count", new_callable=AsyncMock)
    async def test_returns_count(self, mock_count, client):
        mock_count.return_value = 3
        response = await client.get("/api/v1/notifications/unread-count")
        assert response.status_code == 200
        assert response.json()["count"] == 3

    @pytest.mark.asyncio
    @patch("src.api.v1.endpoints.notifications.crud_notification.get_unread_count", new_callable=AsyncMock)
    async def test_returns_zero_when_none(self, mock_count, client):
        mock_count.return_value = 0
        response = await client.get("/api/v1/notifications/unread-count")
        assert response.status_code == 200
        assert response.json()["count"] == 0


class TestMarkRead:
    @pytest.mark.asyncio
    @patch("src.api.v1.endpoints.notifications.crud_notification.mark_as_read", new_callable=AsyncMock)
    async def test_mark_read_returns_ok(self, mock_mark, client):
        mock_mark.return_value = True
        response = await client.patch(f"/api/v1/notifications/{TEST_NOTIF_ID}/read")
        assert response.status_code == 200
        assert response.json()["ok"] is True

    @pytest.mark.asyncio
    @patch("src.api.v1.endpoints.notifications.crud_notification.mark_as_read", new_callable=AsyncMock)
    async def test_mark_nonexistent_returns_404(self, mock_mark, client):
        mock_mark.return_value = False
        response = await client.patch(f"/api/v1/notifications/{uuid.uuid4()}/read")
        assert response.status_code == 404


class TestMarkAllRead:
    @pytest.mark.asyncio
    @patch("src.api.v1.endpoints.notifications.crud_notification.mark_all_read", new_callable=AsyncMock)
    async def test_mark_all_read_returns_ok(self, mock_mark, client):
        mock_mark.return_value = None
        response = await client.patch("/api/v1/notifications/read-all")
        assert response.status_code == 200
        assert response.json()["ok"] is True
