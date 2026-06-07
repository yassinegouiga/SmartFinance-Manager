

from unittest.mock import AsyncMock, patch

import pytest

from tests.conftest import TEST_USER_ID, TEST_FIREBASE_UID, TEST_EMAIL




class TestHealthCheck:
    @pytest.mark.asyncio
    async def test_health_returns_200(self, client):
        response = await client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "user-service"




class TestGetMe:
    @pytest.mark.asyncio
    async def test_returns_authenticated_user_profile(self, client):
        response = await client.get("/api/v1/users/me")

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == TEST_EMAIL
        assert data["firebase_uid"] == TEST_FIREBASE_UID
        assert data["id"] == str(TEST_USER_ID)
        assert data["first_name"] == "John"
        assert data["last_name"] == "Doe"
        assert data["avatar_url"] == "https://lh3.googleusercontent.com/a/example"
        assert data["auth_provider"] == "google.com"
        assert data["currency"] == "USD"
        assert data["theme"] == "light"

    @pytest.mark.asyncio
    async def test_response_contains_timestamps(self, client):
        response = await client.get("/api/v1/users/me")

        data = response.json()
        assert "created_at" in data
        assert "updated_at" in data




class TestUpdateMe:
    @pytest.mark.asyncio
    @patch("src.api.v1.router.update_user", new_callable=AsyncMock)
    async def test_update_first_name(self, mock_update, client, test_user):
        test_user.first_name = "Jane"
        mock_update.return_value = test_user

        response = await client.put(
            "/api/v1/users/me",
            json={"first_name": "Jane"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["first_name"] == "Jane"
        mock_update.assert_awaited_once()

    @pytest.mark.asyncio
    @patch("src.api.v1.router.update_user", new_callable=AsyncMock)
    async def test_update_both_names(self, mock_update, client, test_user):
        test_user.first_name = "Alice"
        test_user.last_name = "Wonder"
        mock_update.return_value = test_user

        response = await client.put(
            "/api/v1/users/me",
            json={"first_name": "Alice", "last_name": "Wonder"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["first_name"] == "Alice"
        assert data["last_name"] == "Wonder"

    @pytest.mark.asyncio
    async def test_name_too_long_returns_422(self, client):
        response = await client.put(
            "/api/v1/users/me",
            json={"first_name": "A" * 101},
        )

        assert response.status_code == 422




class TestGetSettings:
    @pytest.mark.asyncio
    async def test_returns_user_preferences(self, client):
        response = await client.get("/api/v1/users/me/settings")

        assert response.status_code == 200
        data = response.json()
        assert data["currency"] == "USD"
        assert data["theme"] == "light"

    @pytest.mark.asyncio
    async def test_settings_response_has_only_two_fields(self, client):
        response = await client.get("/api/v1/users/me/settings")

        data = response.json()
        assert set(data.keys()) == {"currency", "theme"}




class TestUpdateSettings:
    @pytest.mark.asyncio
    @patch("src.api.v1.router.update_settings", new_callable=AsyncMock)
    async def test_update_currency(self, mock_update, client, test_user):
        test_user.currency = "EUR"
        mock_update.return_value = test_user

        response = await client.put(
            "/api/v1/users/me/settings",
            json={"currency": "EUR"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["currency"] == "EUR"

    @pytest.mark.asyncio
    @patch("src.api.v1.router.update_settings", new_callable=AsyncMock)
    async def test_update_theme_to_dark(self, mock_update, client, test_user):
        test_user.theme = "dark"
        mock_update.return_value = test_user

        response = await client.put(
            "/api/v1/users/me/settings",
            json={"theme": "dark"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["theme"] == "dark"

    @pytest.mark.asyncio
    async def test_invalid_theme_returns_422(self, client):
        response = await client.put(
            "/api/v1/users/me/settings",
            json={"theme": "neon-glow"},
        )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_currency_too_long_returns_422(self, client):
        response = await client.put(
            "/api/v1/users/me/settings",
            json={"currency": "TOOLONGCURRENCY"},
        )

        assert response.status_code == 422




class TestDeleteMe:
    @pytest.mark.asyncio
    @patch("src.api.v1.router.delete_user", new_callable=AsyncMock)
    async def test_delete_returns_204(self, mock_delete, client):
        response = await client.delete("/api/v1/users/me")

        assert response.status_code == 204
        mock_delete.assert_awaited_once()

    @pytest.mark.asyncio
    @patch("src.api.v1.router.delete_user", new_callable=AsyncMock)
    async def test_delete_has_no_response_body(self, mock_delete, client):
        response = await client.delete("/api/v1/users/me")

        assert response.text == ""




class TestAuthGuard:

    @pytest.mark.asyncio
    async def test_no_token_is_rejected(self):
        from httpx import ASGITransport, AsyncClient
        from src.main import app

        app.dependency_overrides.clear()
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
            response = await ac.get("/api/v1/users/me")

        assert response.status_code in (401, 403)
