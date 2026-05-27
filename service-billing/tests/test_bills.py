import uuid
import pytest


TEST_BILL_PAYLOAD = {
    "name": "Netflix",
    "amount": 15.99,
    "due_day": 15,
    "frequency": "MONTHLY",
}


class TestListBills:
    @pytest.mark.asyncio
    async def test_returns_empty_list(self, client):
        response = await client.get("/api/v1/bills/")
        assert response.status_code == 200
        assert response.json() == []

    @pytest.mark.asyncio
    async def test_returns_created_bill(self, client):
        await client.post("/api/v1/bills/", json=TEST_BILL_PAYLOAD)
        response = await client.get("/api/v1/bills/")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "Netflix"


class TestCreateBill:
    @pytest.mark.asyncio
    async def test_create_valid_bill(self, client):
        response = await client.post("/api/v1/bills/", json=TEST_BILL_PAYLOAD)
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Netflix"
        assert data["amount"] == 15.99
        assert data["status"] == "UNPAID"

    @pytest.mark.asyncio
    async def test_create_with_negative_amount_returns_422(self, client):
        response = await client.post("/api/v1/bills/", json={
            **TEST_BILL_PAYLOAD,
            "amount": -10.0,
        })
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_missing_name_returns_422(self, client):
        response = await client.post("/api/v1/bills/", json={"amount": 10.0, "due_day": 5})
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_due_day_out_of_range_returns_422(self, client):
        response = await client.post("/api/v1/bills/", json={
            **TEST_BILL_PAYLOAD,
            "due_day": 32,
        })
        assert response.status_code == 422


class TestGetBill:
    @pytest.mark.asyncio
    async def test_get_existing_bill(self, client):
        create = await client.post("/api/v1/bills/", json=TEST_BILL_PAYLOAD)
        bill_id = create.json()["id"]
        response = await client.get(f"/api/v1/bills/{bill_id}")
        assert response.status_code == 200
        assert response.json()["id"] == bill_id

    @pytest.mark.asyncio
    async def test_get_nonexistent_returns_404(self, client):
        response = await client.get(f"/api/v1/bills/{uuid.uuid4()}")
        assert response.status_code == 404


class TestUpdateBill:
    @pytest.mark.asyncio
    async def test_update_bill_name(self, client):
        create = await client.post("/api/v1/bills/", json=TEST_BILL_PAYLOAD)
        bill_id = create.json()["id"]
        response = await client.put(f"/api/v1/bills/{bill_id}", json={"name": "Spotify"})
        assert response.status_code == 200
        assert response.json()["name"] == "Spotify"

    @pytest.mark.asyncio
    async def test_update_nonexistent_returns_404(self, client):
        response = await client.put(f"/api/v1/bills/{uuid.uuid4()}", json={"name": "x"})
        assert response.status_code == 404


class TestPayAndResetBill:
    @pytest.mark.asyncio
    async def test_pay_bill_changes_status(self, client):
        create = await client.post("/api/v1/bills/", json=TEST_BILL_PAYLOAD)
        bill_id = create.json()["id"]
        response = await client.post(f"/api/v1/bills/{bill_id}/pay")
        assert response.status_code == 200
        assert response.json()["status"] == "PAID"

    @pytest.mark.asyncio
    async def test_pay_nonexistent_returns_404(self, client):
        response = await client.post(f"/api/v1/bills/{uuid.uuid4()}/pay")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_reset_bill_after_pay(self, client):
        create = await client.post("/api/v1/bills/", json=TEST_BILL_PAYLOAD)
        bill_id = create.json()["id"]
        await client.post(f"/api/v1/bills/{bill_id}/pay")
        response = await client.post(f"/api/v1/bills/{bill_id}/reset")
        assert response.status_code == 200
        assert response.json()["status"] == "UNPAID"

    @pytest.mark.asyncio
    async def test_reset_nonexistent_returns_404(self, client):
        response = await client.post(f"/api/v1/bills/{uuid.uuid4()}/reset")
        assert response.status_code == 404


class TestDeleteBill:
    @pytest.mark.asyncio
    async def test_delete_returns_204(self, client):
        create = await client.post("/api/v1/bills/", json=TEST_BILL_PAYLOAD)
        bill_id = create.json()["id"]
        response = await client.delete(f"/api/v1/bills/{bill_id}")
        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_delete_actually_removes_bill(self, client):
        create = await client.post("/api/v1/bills/", json=TEST_BILL_PAYLOAD)
        bill_id = create.json()["id"]
        await client.delete(f"/api/v1/bills/{bill_id}")
        response = await client.get(f"/api/v1/bills/{bill_id}")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_nonexistent_returns_404(self, client):
        response = await client.delete(f"/api/v1/bills/{uuid.uuid4()}")
        assert response.status_code == 404


class TestBillsSummary:
    @pytest.mark.asyncio
    async def test_summary_when_empty(self, client):
        response = await client.get("/api/v1/bills/summary")
        assert response.status_code == 200
        data = response.json()
        assert data["total_bills"] == 0
        assert data["paid"] == 0
        assert data["unpaid"] == 0
        assert data["overdue"] == 0

    @pytest.mark.asyncio
    async def test_summary_counts_unpaid(self, client):
        await client.post("/api/v1/bills/", json=TEST_BILL_PAYLOAD)
        response = await client.get("/api/v1/bills/summary")
        assert response.status_code == 200
        data = response.json()
        assert data["total_bills"] == 1
        assert data["unpaid"] == 1
        assert data["paid"] == 0

    @pytest.mark.asyncio
    async def test_summary_counts_paid(self, client):
        create = await client.post("/api/v1/bills/", json=TEST_BILL_PAYLOAD)
        bill_id = create.json()["id"]
        await client.post(f"/api/v1/bills/{bill_id}/pay")
        response = await client.get("/api/v1/bills/summary")
        assert response.status_code == 200
        data = response.json()
        assert data["paid"] == 1
        assert data["unpaid"] == 0


class TestUpcomingBills:
    @pytest.mark.asyncio
    async def test_upcoming_returns_list(self, client):
        response = await client.get("/api/v1/bills/upcoming")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
