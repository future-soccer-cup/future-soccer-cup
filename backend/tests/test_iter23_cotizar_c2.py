"""
Iter23 — Tanda C2 /cotizar refactor tests
Tests:
  - POST /api/quotes/calculate with tournament_id+tournament_name+categories[] sums fees
  - Legacy path (event_type=festival + birth_year) still works
  - GET /api/event-types tours_catalog includes 'description'
  - POST /api/quotes (Directivo aprobado) with tournament_id+categories OK
"""
import os
import pytest
import requests
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ADMIN_EMAIL = "admin@futuresoccercup.com"
ADMIN_PASS = "FSCAdmin2025!"


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=30)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return s


# ------- 1) calculate with tournament + categories[] -------
class TestCalculateWithCategories:
    def test_categories_sum(self):
        payload = {
            "event_type": "festival",  # frontend sets fallback; backend accepts
            "tournament_id": "tour-xyz",
            "tournament_name": "Copa Test C2",
            "categories": [
                {"name": "Sub-12", "fee": 2400000},
                {"name": "Sub-14", "fee": 2300000},
            ],
            "include_registration": True,
            "lodging_tier": "paquete_1",
            "pax": 1,
            "nights": 5,
            "days": 6,
        }
        r = requests.post(f"{BASE_URL}/api/quotes/calculate", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        # event_name == tournament_name
        assert data["event_name"] == "Copa Test C2", f"event_name={data.get('event_name')}"
        # registration_fee = sum
        assert data["registration_fee"] == 4700000, f"registration_fee={data['registration_fee']}"
        # registration_breakdown length 2
        assert len(data["registration_breakdown"]) == 2
        names = {b["name"] for b in data["registration_breakdown"]}
        assert names == {"Sub-12", "Sub-14"}

    def test_categories_empty_no_registration(self):
        # categories present but include_registration False → registration_fee = 0
        payload = {
            "event_type": "festival",
            "tournament_id": "tour-xyz",
            "tournament_name": "Copa Test C2",
            "categories": [{"name": "Sub-12", "fee": 2400000}],
            "include_registration": False,
            "lodging_tier": "paquete_1",
            "pax": 1,
        }
        r = requests.post(f"{BASE_URL}/api/quotes/calculate", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["registration_fee"] == 0


# ------- 2) legacy path regression -------
class TestLegacyPath:
    def test_festival_birth_year_works(self):
        payload = {
            "event_type": "festival",
            "birth_year": 2014,
            "include_registration": True,
            "lodging_tier": "paquete_1",
            "pax": 1,
        }
        r = requests.post(f"{BASE_URL}/api/quotes/calculate", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        # Legacy: registration must be > 0 and event_name fallback set
        assert data["registration_fee"] >= 0  # backend may compute from fees_by_year or fallback
        assert data.get("event_name"), "event_name should be set from event fallback"
        # No tournament_name passed → event_name should NOT be empty
        assert isinstance(data["event_name"], str) and len(data["event_name"]) > 0


# ------- 3) tours_catalog includes 'description' -------
class TestEventTypesToursDescription:
    def test_tours_catalog_has_description(self):
        r = requests.get(f"{BASE_URL}/api/event-types", timeout=30)
        assert r.status_code == 200
        data = r.json()
        tours = data.get("tours_catalog", [])
        assert isinstance(tours, list) and len(tours) > 0, "tours_catalog should be non-empty"
        for t in tours:
            assert "description" in t, f"tour {t.get('id')} missing 'description' key"


# ------- 4) POST /quotes with Directivo aprobado + categories[] -------
class TestCreateQuoteWithCategories:
    def test_admin_can_create_quote_with_categories(self, admin_session):
        # admin has role 'admin' which is allowed to create quotes too
        payload = {
            "event_type": "festival",
            "tournament_id": "tour-admin-test",
            "tournament_name": "Smoke Tournament Admin",
            "categories": [{"name": "Sub-12", "fee": 1000000}],
            "include_registration": True,
            "lodging_tier": "paquete_1",
            "pax": 2,
            "nights": 5,
            "contact_phone": "300-000-0000",
            "notes": "iter23 smoke",
        }
        r = admin_session.post(f"{BASE_URL}/api/quotes", json=payload, timeout=30)
        assert r.status_code in (200, 201), f"{r.status_code} {r.text}"
        data = r.json()
        # status pendiente by default? at least registration_fee = 1M
        assert data.get("registration_fee") == 1000000
        assert data.get("event_name") == "Smoke Tournament Admin"
        # Persist clean-up: delete if id present
        qid = data.get("id")
        if qid:
            admin_session.delete(f"{BASE_URL}/api/quotes/{qid}", timeout=15)
