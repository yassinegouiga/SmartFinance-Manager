import pytest

@pytest.mark.asyncio
async def test_create_saving_pot(client):
    payload = {
        "name": "Vacation",
        "target_amount": 1000.0
    }
    response = await client.post("/api/v1/saving-pots/", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Vacation"
    assert data["current_amount"] == 0.0

@pytest.mark.asyncio
async def test_deposit_withdraw_pot(client):
    payload = {
        "name": "Vacation",
        "target_amount": 1000.0
    }
    pot_res = await client.post("/api/v1/saving-pots/", json=payload)
    pot_id = pot_res.json()["id"]

    # Deposit
    dep_res = await client.post(f"/api/v1/saving-pots/{pot_id}/deposit", json={"amount": 200.0})
    assert dep_res.status_code == 200
    
    # Check pot amount
    pot_check = await client.get(f"/api/v1/saving-pots/{pot_id}")
    assert pot_check.json()["current_amount"] == 200.0

    # Withdraw
    with_res = await client.post(f"/api/v1/saving-pots/{pot_id}/withdraw", json={"amount": 50.0})
    assert with_res.status_code == 200

    # Check pot amount
    pot_check = await client.get(f"/api/v1/saving-pots/{pot_id}")
    assert pot_check.json()["current_amount"] == 150.0

@pytest.mark.asyncio
async def test_withdraw_insufficient_funds(client):
    payload = {
        "name": "Vacation",
        "target_amount": 1000.0
    }
    pot_res = await client.post("/api/v1/saving-pots/", json=payload)
    pot_id = pot_res.json()["id"]

    with_res = await client.post(f"/api/v1/saving-pots/{pot_id}/withdraw", json={"amount": 50.0})
    assert with_res.status_code == 400
