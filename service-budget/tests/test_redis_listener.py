import pytest
import uuid
import json
from datetime import datetime
from src.services.redis_service import redis_subscriber
from unittest.mock import ANY

@pytest.mark.asyncio
async def test_redis_listener_updates_budget(client, mock_redis):
    category_id = str(uuid.uuid4())
    now = datetime.now()
    payload = {
        "category_id": category_id,
        "month": now.month,
        "year": now.year,
        "monthly_limit": 500.0
    }
    # Create a budget
    budget_res = await client.post("/api/v1/budgets/", json=payload)
    budget_id = budget_res.json()["id"]

    # Manually trigger the _handle_event method which simulates receiving a redis message
    event_data = {
        "user_id": "test-user-id",
        "category_id": category_id,
        "amount": 100.0,
        "type": "expense"
    }
    await redis_subscriber._handle_event("TransactionCreated", event_data)

    # Fetch budget to see if spent_amount increased
    check_res = await client.get(f"/api/v1/budgets/{budget_id}")
    assert check_res.json()["spent_amount"] == 100.0

@pytest.mark.asyncio
async def test_redis_listener_budget_exceeded(client, mock_redis):
    category_id = str(uuid.uuid4())
    now = datetime.now()
    payload = {
        "category_id": category_id,
        "month": now.month,
        "year": now.year,
        "monthly_limit": 100.0
    }
    # Create a budget
    budget_res = await client.post("/api/v1/budgets/", json=payload)
    
    await redis_subscriber.connect() # Ensure connected to mock
    
    event_data = {
        "user_id": "test-user-id",
        "category_id": category_id,
        "amount": 150.0,
        "type": "expense"
    }
    await redis_subscriber._handle_event("TransactionCreated", event_data)

    # Should publish BudgetExceeded
    mock_redis.publish.assert_called_with("BudgetExceeded", ANY)
