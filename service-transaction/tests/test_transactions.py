import uuid
import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

from tests.conftest import TEST_FIREBASE_UID

TEST_TRANSACTION_ID = uuid.uuid4()
TEST_CATEGORY_ID = uuid.uuid4()


def make_mock_transaction(**overrides):
    defaults = {
        "id": TEST_TRANSACTION_ID,
        "user_id": TEST_FIREBASE_UID,
        "amount": 50.0,
        "type": "EXPENSE",
        "category_id": TEST_CATEGORY_ID,
        "date": datetime.now(timezone.utc),
        "description": "Test transaction",
        "is_recurring": False,
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


class TestListTransactions:
    @pytest.mark.asyncio
    @patch("src.api.v1.endpoints.transactions.crud_transaction.get_transactions", new_callable=AsyncMock)
    async def test_returns_empty_list(self, mock_get, client):
        mock_get.return_value = []
        response = await client.get("/api/v1/transactions/")
        assert response.status_code == 200
        assert response.json() == []

    @pytest.mark.asyncio
    @patch("src.api.v1.endpoints.transactions.crud_transaction.get_transactions", new_callable=AsyncMock)
    async def test_returns_transactions(self, mock_get, client):
        mock_get.return_value = [make_mock_transaction()]
        response = await client.get("/api/v1/transactions/")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["amount"] == 50.0
        assert data[0]["type"] == "EXPENSE"


class TestCreateTransaction:
    @pytest.mark.asyncio
    @patch("src.api.v1.endpoints.transactions.crud_category.get_category", new_callable=AsyncMock)
    @patch("src.api.v1.endpoints.transactions.crud_transaction.create_transaction", new_callable=AsyncMock)
    @patch("src.api.v1.endpoints.transactions.redis_publisher.publish_event", new_callable=AsyncMock)
    async def test_create_valid_transaction(self, mock_redis, mock_create, mock_cat, client):
        mock_cat.return_value = MagicMock(id=TEST_CATEGORY_ID)
        mock_create.return_value = make_mock_transaction()
        response = await client.post("/api/v1/transactions/", json={
            "amount": 50.0,
            "type": "EXPENSE",
            "category_id": str(TEST_CATEGORY_ID),
            "date": datetime.now(timezone.utc).isoformat(),
        })
        assert response.status_code == 201
        mock_redis.assert_awaited_once()

    @pytest.mark.asyncio
    @patch("src.api.v1.endpoints.transactions.crud_category.get_category", new_callable=AsyncMock)
    async def test_create_with_unknown_category_returns_400(self, mock_cat, client):
        mock_cat.return_value = None
        response = await client.post("/api/v1/transactions/", json={
            "amount": 50.0,
            "type": "EXPENSE",
            "category_id": str(TEST_CATEGORY_ID),
            "date": datetime.now(timezone.utc).isoformat(),
        })
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_create_with_negative_amount_returns_422(self, client):
        response = await client.post("/api/v1/transactions/", json={
            "amount": -10.0,
            "type": "EXPENSE",
            "category_id": str(TEST_CATEGORY_ID),
            "date": datetime.now(timezone.utc).isoformat(),
        })
        assert response.status_code == 422


class TestGetTransaction:
    @pytest.mark.asyncio
    @patch("src.api.v1.endpoints.transactions.crud_transaction.get_transaction", new_callable=AsyncMock)
    async def test_get_existing(self, mock_get, client):
        mock_get.return_value = make_mock_transaction()
        response = await client.get(f"/api/v1/transactions/{TEST_TRANSACTION_ID}")
        assert response.status_code == 200
        assert response.json()["amount"] == 50.0

    @pytest.mark.asyncio
    @patch("src.api.v1.endpoints.transactions.crud_transaction.get_transaction", new_callable=AsyncMock)
    async def test_get_nonexistent_returns_404(self, mock_get, client):
        mock_get.return_value = None
        response = await client.get(f"/api/v1/transactions/{TEST_TRANSACTION_ID}")
        assert response.status_code == 404


class TestUpdateTransaction:
    @pytest.mark.asyncio
    @patch("src.api.v1.endpoints.transactions.crud_transaction.get_transaction", new_callable=AsyncMock)
    @patch("src.api.v1.endpoints.transactions.crud_transaction.update_transaction", new_callable=AsyncMock)
    async def test_update_description(self, mock_update, mock_get, client):
        mock_get.return_value = make_mock_transaction()
        mock_update.return_value = make_mock_transaction(description="Updated")
        response = await client.put(f"/api/v1/transactions/{TEST_TRANSACTION_ID}", json={
            "description": "Updated"
        })
        assert response.status_code == 200

    @pytest.mark.asyncio
    @patch("src.api.v1.endpoints.transactions.crud_transaction.get_transaction", new_callable=AsyncMock)
    async def test_update_nonexistent_returns_404(self, mock_get, client):
        mock_get.return_value = None
        response = await client.put(f"/api/v1/transactions/{TEST_TRANSACTION_ID}", json={"description": "x"})
        assert response.status_code == 404


class TestDeleteTransaction:
    @pytest.mark.asyncio
    @patch("src.api.v1.endpoints.transactions.crud_transaction.get_transaction", new_callable=AsyncMock)
    @patch("src.api.v1.endpoints.transactions.crud_transaction.delete_transaction", new_callable=AsyncMock)
    @patch("src.api.v1.endpoints.transactions.redis_publisher.publish_event", new_callable=AsyncMock)
    async def test_delete_returns_204(self, mock_redis, mock_delete, mock_get, client):
        mock_get.return_value = make_mock_transaction()
        response = await client.delete(f"/api/v1/transactions/{TEST_TRANSACTION_ID}")
        assert response.status_code == 204
        mock_redis.assert_awaited_once()

    @pytest.mark.asyncio
    @patch("src.api.v1.endpoints.transactions.crud_transaction.get_transaction", new_callable=AsyncMock)
    async def test_delete_nonexistent_returns_404(self, mock_get, client):
        mock_get.return_value = None
        response = await client.delete(f"/api/v1/transactions/{TEST_TRANSACTION_ID}")
        assert response.status_code == 404


class TestAuthGuard:
    @pytest.mark.asyncio
    async def test_no_token_is_rejected(self):
        from httpx import ASGITransport, AsyncClient
        from src.main import app
        app.dependency_overrides.clear()
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
            response = await ac.get("/api/v1/transactions/")
        assert response.status_code in (401, 403)
