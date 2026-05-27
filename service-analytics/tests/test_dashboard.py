import uuid
import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

from tests.conftest import TEST_FIREBASE_UID

TEST_NOTIF_ID = uuid.uuid4()


def make_mock_summary(**overrides):
    defaults = {
        "id": uuid.uuid4(),
        "user_id": TEST_FIREBASE_UID,
        "month": datetime.now().month,
        "year": datetime.now().year,
        "total_income": 1000.0,
        "total_expense": 400.0,
        "total_balance": 600.0,
        "updated_at": datetime.now(timezone.utc),
    }
    defaults.update(overrides)
    mock = MagicMock()
    for k, v in defaults.items():
        setattr(mock, k, v)
    return mock


def make_mock_notification(**overrides):
    defaults = {
        "id": TEST_NOTIF_ID,
        "user_id": TEST_FIREBASE_UID,
        "type": "INFO",
        "message": "Your budget is at 80%.",
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


class TestDashboardSummary:
    @pytest.mark.asyncio
    @patch("src.api.v1.endpoints.dashboard.crud_analytics.get_or_create_monthly_summary", new_callable=AsyncMock)
    @patch("src.api.v1.endpoints.dashboard.crud_analytics.get_unread_notifications", new_callable=AsyncMock)
    async def test_summary_returns_200(self, mock_notifs, mock_summary, client):
        mock_summary.return_value = make_mock_summary()
        mock_notifs.return_value = []
        response = await client.get("/api/v1/dashboard/summary")
        assert response.status_code == 200
        data = response.json()
        assert data["unread_notifications_count"] == 0
        assert data["current_month_summary"]["total_income"] == 1000.0

    @pytest.mark.asyncio
    @patch("src.api.v1.endpoints.dashboard.crud_analytics.get_or_create_monthly_summary", new_callable=AsyncMock)
    @patch("src.api.v1.endpoints.dashboard.crud_analytics.get_unread_notifications", new_callable=AsyncMock)
    async def test_summary_counts_unread_notifications(self, mock_notifs, mock_summary, client):
        mock_summary.return_value = make_mock_summary()
        mock_notifs.return_value = [make_mock_notification(), make_mock_notification(id=uuid.uuid4())]
        response = await client.get("/api/v1/dashboard/summary")
        assert response.status_code == 200
        assert response.json()["unread_notifications_count"] == 2


class TestGetNotifications:
    @pytest.mark.asyncio
    @patch("src.api.v1.endpoints.dashboard.crud_analytics.get_unread_notifications", new_callable=AsyncMock)
    async def test_returns_empty_list(self, mock_notifs, client):
        mock_notifs.return_value = []
        response = await client.get("/api/v1/dashboard/notifications")
        assert response.status_code == 200
        assert response.json() == []

    @pytest.mark.asyncio
    @patch("src.api.v1.endpoints.dashboard.crud_analytics.get_unread_notifications", new_callable=AsyncMock)
    async def test_returns_notifications(self, mock_notifs, client):
        mock_notifs.return_value = [make_mock_notification()]
        response = await client.get("/api/v1/dashboard/notifications")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["message"] == "Your budget is at 80%."


class TestMarkNotificationRead:
    @pytest.mark.asyncio
    @patch("src.api.v1.endpoints.dashboard.crud_analytics.mark_notification_read", new_callable=AsyncMock)
    async def test_mark_read_returns_200(self, mock_mark, client):
        mock_mark.return_value = make_mock_notification(is_read=True)
        response = await client.post(f"/api/v1/dashboard/notifications/{TEST_NOTIF_ID}/read")
        assert response.status_code == 200

    @pytest.mark.asyncio
    @patch("src.api.v1.endpoints.dashboard.crud_analytics.mark_notification_read", new_callable=AsyncMock)
    async def test_mark_read_nonexistent_returns_404(self, mock_mark, client):
        mock_mark.return_value = None
        response = await client.post(f"/api/v1/dashboard/notifications/{uuid.uuid4()}/read")
        assert response.status_code == 404
