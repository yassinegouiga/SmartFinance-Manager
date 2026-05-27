import pytest
import uuid

@pytest.mark.asyncio
async def test_create_budget(client):
    category_id = str(uuid.uuid4())
    payload = {
        "category_id": category_id,
        "month": 5,
        "year": 2026,
        "monthly_limit": 500.0,
        "alert_threshold": 0.8
    }
    response = await client.post("/api/v1/budgets/", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["monthly_limit"] == 500.0
    assert data["spent_amount"] == 0.0

@pytest.mark.asyncio
async def test_get_budgets(client):
    category_id = str(uuid.uuid4())
    payload = {
        "category_id": category_id,
        "month": 5,
        "year": 2026,
        "monthly_limit": 500.0
    }
    await client.post("/api/v1/budgets/", json=payload)
    
    response = await client.get("/api/v1/budgets/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1

@pytest.mark.asyncio
async def test_duplicate_budget(client):
    category_id = str(uuid.uuid4())
    payload = {
        "category_id": category_id,
        "month": 5,
        "year": 2026,
        "monthly_limit": 500.0
    }
    await client.post("/api/v1/budgets/", json=payload)
    response = await client.post("/api/v1/budgets/", json=payload)
    assert response.status_code == 400
