import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from tests.conftest import TEST_FIREBASE_UID

TEST_CATEGORY_ID = uuid.uuid4()


def make_mock_category(**overrides):
    defaults = {
        "id": TEST_CATEGORY_ID,
        "name": "Groceries",
        "icon": "shopping-cart",
        "color": "#4CAF50",
        "type": "EXPENSE",
        "user_id": TEST_FIREBASE_UID,
    }
    defaults.update(overrides)
    mock = MagicMock()
    for k, v in defaults.items():
        setattr(mock, k, v)
    return mock


class TestListCategories:
    @pytest.mark.asyncio
    @patch("src.api.v1.endpoints.categories.crud_category.get_categories", new_callable=AsyncMock)
    async def test_returns_empty_list(self, mock_get, client):
        mock_get.return_value = []
        response = await client.get("/api/v1/categories/")
        assert response.status_code == 200
        assert response.json() == []

    @pytest.mark.asyncio
    @patch("src.api.v1.endpoints.categories.crud_category.get_categories", new_callable=AsyncMock)
    async def test_returns_categories(self, mock_get, client):
        mock_get.return_value = [make_mock_category()]
        response = await client.get("/api/v1/categories/")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "Groceries"
        assert data[0]["type"] == "EXPENSE"


class TestGetCategory:
    @pytest.mark.asyncio
    @patch("src.api.v1.endpoints.categories.crud_category.get_category", new_callable=AsyncMock)
    async def test_get_existing(self, mock_get, client):
        mock_get.return_value = make_mock_category()
        response = await client.get(f"/api/v1/categories/{TEST_CATEGORY_ID}")
        assert response.status_code == 200
        assert response.json()["name"] == "Groceries"

    @pytest.mark.asyncio
    @patch("src.api.v1.endpoints.categories.crud_category.get_category", new_callable=AsyncMock)
    async def test_get_nonexistent_returns_404(self, mock_get, client):
        mock_get.return_value = None
        response = await client.get(f"/api/v1/categories/{TEST_CATEGORY_ID}")
        assert response.status_code == 404


class TestCreateCategory:
    @pytest.mark.asyncio
    @patch("src.api.v1.endpoints.categories.crud_category.create_category", new_callable=AsyncMock)
    async def test_create_valid_category(self, mock_create, client):
        mock_create.return_value = make_mock_category()
        response = await client.post("/api/v1/categories/", json={
            "name": "Groceries",
            "type": "EXPENSE",
        })
        assert response.status_code == 201
        assert response.json()["name"] == "Groceries"

    @pytest.mark.asyncio
    async def test_create_missing_name_returns_422(self, client):
        response = await client.post("/api/v1/categories/", json={"type": "EXPENSE"})
        assert response.status_code == 422


class TestUpdateCategory:
    @pytest.mark.asyncio
    @patch("src.api.v1.endpoints.categories.crud_category.get_category", new_callable=AsyncMock)
    @patch("src.api.v1.endpoints.categories.crud_category.update_category", new_callable=AsyncMock)
    async def test_update_name(self, mock_update, mock_get, client):
        cat = make_mock_category()
        mock_get.return_value = cat
        mock_update.return_value = make_mock_category(name="Food")
        response = await client.put(f"/api/v1/categories/{TEST_CATEGORY_ID}", json={"name": "Food"})
        assert response.status_code == 200

    @pytest.mark.asyncio
    @patch("src.api.v1.endpoints.categories.crud_category.get_category", new_callable=AsyncMock)
    async def test_update_nonexistent_returns_404(self, mock_get, client):
        mock_get.return_value = None
        response = await client.put(f"/api/v1/categories/{TEST_CATEGORY_ID}", json={"name": "x"})
        assert response.status_code == 404

    @pytest.mark.asyncio
    @patch("src.api.v1.endpoints.categories.crud_category.get_category", new_callable=AsyncMock)
    async def test_cannot_update_default_category(self, mock_get, client):
        mock_get.return_value = make_mock_category(user_id=None)
        response = await client.put(f"/api/v1/categories/{TEST_CATEGORY_ID}", json={"name": "x"})
        assert response.status_code == 403


class TestDeleteCategory:
    @pytest.mark.asyncio
    @patch("src.api.v1.endpoints.categories.crud_category.get_category", new_callable=AsyncMock)
    @patch("src.api.v1.endpoints.categories.crud_category.get_transaction_count_for_category", new_callable=AsyncMock)
    @patch("src.api.v1.endpoints.categories.crud_category.delete_category", new_callable=AsyncMock)
    async def test_delete_returns_204(self, mock_delete, mock_count, mock_get, client):
        mock_get.return_value = make_mock_category()
        mock_count.return_value = 0
        response = await client.delete(f"/api/v1/categories/{TEST_CATEGORY_ID}")
        assert response.status_code == 204

    @pytest.mark.asyncio
    @patch("src.api.v1.endpoints.categories.crud_category.get_category", new_callable=AsyncMock)
    async def test_delete_nonexistent_returns_404(self, mock_get, client):
        mock_get.return_value = None
        response = await client.delete(f"/api/v1/categories/{TEST_CATEGORY_ID}")
        assert response.status_code == 404

    @pytest.mark.asyncio
    @patch("src.api.v1.endpoints.categories.crud_category.get_category", new_callable=AsyncMock)
    async def test_cannot_delete_default_category(self, mock_get, client):
        mock_get.return_value = make_mock_category(user_id=None)
        response = await client.delete(f"/api/v1/categories/{TEST_CATEGORY_ID}")
        assert response.status_code == 403

    @pytest.mark.asyncio
    @patch("src.api.v1.endpoints.categories.crud_category.get_category", new_callable=AsyncMock)
    @patch("src.api.v1.endpoints.categories.crud_category.get_transaction_count_for_category", new_callable=AsyncMock)
    async def test_cannot_delete_category_with_transactions(self, mock_count, mock_get, client):
        mock_get.return_value = make_mock_category()
        mock_count.return_value = 3
        response = await client.delete(f"/api/v1/categories/{TEST_CATEGORY_ID}")
        assert response.status_code == 400
