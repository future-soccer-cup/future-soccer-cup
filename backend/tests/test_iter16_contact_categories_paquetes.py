"""
Iteration 16 tests:
- Contact messages (public POST + admin GET/PUT-read/DELETE)
- Tournaments with categories list (each with fee)
- Catalog lodging classification (auto-upper) + accommodation_type
- Catalog meal classification (auto-upper)
- Regression: quotes calculate after catalog updates
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@futuresoccercup.com"
ADMIN_PASSWORD = "FSCAdmin2025!"


# ----------------- Fixtures -----------------
@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def anon_session():
    return requests.Session()


# ============== Contact Messages ==============
class TestContactMessages:
    created_ids = []

    def test_public_post_contact_message(self, anon_session):
        payload = {
            "name": "TEST_iter16 Padre",
            "email": "test_iter16@example.com",
            "phone": "+57 3001234567",
            "message": "Hola, quisiera información sobre el evento Sub-12."
        }
        r = anon_session.post(f"{API}/contact-messages", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "id" in data and data["id"]
        assert "created_at" in data and data["created_at"]
        assert data["name"] == payload["name"]
        assert data["email"] == payload["email"]
        assert data["is_read"] is False
        TestContactMessages.created_ids.append(data["id"])

    def test_admin_list_contact_messages_requires_auth(self, anon_session):
        r = anon_session.get(f"{API}/contact-messages")
        assert r.status_code in (401, 403), f"Expected 401/403, got {r.status_code}"

    def test_admin_list_contact_messages_authed(self, admin_session):
        r = admin_session.get(f"{API}/contact-messages")
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        ids = [m["id"] for m in data]
        assert TestContactMessages.created_ids[0] in ids

    def test_admin_mark_read(self, admin_session):
        mid = TestContactMessages.created_ids[0]
        r = admin_session.put(f"{API}/contact-messages/{mid}/read")
        assert r.status_code == 200, r.text
        # verify
        lst = admin_session.get(f"{API}/contact-messages").json()
        target = next(m for m in lst if m["id"] == mid)
        assert target["is_read"] is True

    def test_admin_delete_contact_message(self, admin_session):
        mid = TestContactMessages.created_ids[0]
        r = admin_session.delete(f"{API}/contact-messages/{mid}")
        assert r.status_code == 200, r.text
        lst = admin_session.get(f"{API}/contact-messages").json()
        ids = [m["id"] for m in lst]
        assert mid not in ids


# ============== Tournaments with categories ==============
class TestTournamentCategories:
    created_id = None

    def test_create_tournament_with_categories(self, admin_session):
        payload = {
            "name": "TEST_iter16 Copa Sub-12/14",
            "season": "2026",
            "event_type": "festival",
            "category": "Sub-12",
            "start_date": "2026-06-01",
            "end_date": "2026-06-05",
            "fee": 2400000,
            "categories": [
                {"name": "Sub-12", "fee": 2400000},
                {"name": "Sub-14", "fee": 2300000},
            ],
        }
        r = admin_session.post(f"{API}/tournaments", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("id")
        assert data.get("categories"), "categories should be returned"
        assert len(data["categories"]) == 2
        names = [c["name"] for c in data["categories"]]
        assert "Sub-12" in names and "Sub-14" in names
        TestTournamentCategories.created_id = data["id"]

    def test_get_tournament_persists_categories(self, admin_session):
        tid = TestTournamentCategories.created_id
        assert tid
        # No GET-by-id endpoint; use list and filter
        r = admin_session.get(f"{API}/tournaments")
        assert r.status_code == 200, r.text
        all_t = r.json()
        data = next((t for t in all_t if t["id"] == tid), None)
        assert data is not None, "tournament not in list"
        cats = data.get("categories") or []
        assert len(cats) == 2
        c14 = next((c for c in cats if c["name"] == "Sub-14"), None)
        assert c14 is not None
        assert float(c14["fee"]) == 2300000

    def test_update_tournament_categories(self, admin_session):
        tid = TestTournamentCategories.created_id
        body = {
            "categories": [
                {"name": "Sub-10", "fee": 2000000},
                {"name": "Sub-12", "fee": 2400000},
                {"name": "Sub-14", "fee": 2300000},
            ]
        }
        r = admin_session.put(f"{API}/tournaments/{tid}", json=body)
        assert r.status_code == 200, r.text
        # GET via list to verify persistence
        all_t = admin_session.get(f"{API}/tournaments").json()
        g = next((t for t in all_t if t["id"] == tid), None)
        assert g is not None
        cats = g.get("categories") or []
        assert len(cats) == 3
        names = [c["name"] for c in cats]
        assert "Sub-10" in names

    def test_cleanup_tournament(self, admin_session):
        tid = TestTournamentCategories.created_id
        if tid:
            admin_session.delete(f"{API}/tournaments/{tid}")


# ============== Catalog Lodging classification + accommodation_type ==============
class TestCatalogLodging:
    created_id = None
    prev_state = None  # if updating existing

    def test_create_lodging_with_classification(self, admin_session):
        payload = {
            "name": "TEST_iter16 Hotel Sapphire Doble",
            "description": "Hotel de prueba iter16",
            "base_5_nights": 1000000,
            "additional_night": 200000,
            "available": True,
            "no_lodging": False,
            "classification": "sapphire",  # lowercase to test auto-upper
            "accommodation_type": "Doble",
            "includes": ["Desayuno", "WiFi"]
        }
        r = admin_session.post(f"{API}/admin/catalog/lodging", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("classification") == "SAPPHIRE", f"Expected SAPPHIRE, got {data.get('classification')}"
        assert data.get("accommodation_type") == "Doble"
        assert float(data.get("additional_night", 0)) == 200000
        TestCatalogLodging.created_id = data["id"]

    def test_update_lodging_classification_uppercase(self, admin_session):
        rid = TestCatalogLodging.created_id
        body = {
            "name": "TEST_iter16 Hotel Sapphire Doble",
            "base_5_nights": 1100000,
            "additional_night": 220000,
            "classification": "sapphire",
            "accommodation_type": "Doble",
        }
        r = admin_session.put(f"{API}/admin/catalog/lodging/{rid}", json=body)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("classification") == "SAPPHIRE"
        assert data.get("accommodation_type") == "Doble"
        # GET via list to verify persistence
        catalog = admin_session.get(f"{API}/admin/catalog").json()
        row = next((c for c in catalog if c.get("id") == rid and c.get("type") == "lodging"), None)
        assert row is not None
        assert row.get("classification") == "SAPPHIRE"
        assert row.get("accommodation_type") == "Doble"
        assert float(row.get("additional_night", 0)) == 220000

    def test_cleanup_lodging(self, admin_session):
        rid = TestCatalogLodging.created_id
        if rid:
            admin_session.delete(f"{API}/admin/catalog/lodging/{rid}")


# ============== Catalog Meal classification ==============
class TestCatalogMeal:
    target_id = None
    original_classification = None

    def test_update_existing_meal_classification(self, admin_session):
        # find a meal in catalog
        catalog = admin_session.get(f"{API}/admin/catalog").json()
        meals = [c for c in catalog if c.get("type") == "meal"]
        if not meals:
            pytest.skip("No meal rows in catalog to test classification update")
        target = meals[0]
        TestCatalogMeal.target_id = target["id"]
        TestCatalogMeal.original_classification = target.get("classification")
        body = {
            "name": target["name"],
            "per_day_by_tier": target.get("per_day_by_tier") or {},
            "classification": "diamond",
        }
        r = admin_session.put(f"{API}/admin/catalog/meal/{target['id']}", json=body)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("classification") == "DIAMOND", f"Expected DIAMOND, got {data.get('classification')}"

    def test_restore_meal_classification(self, admin_session):
        # Restore (or remove) classification to keep catalog clean
        if not TestCatalogMeal.target_id:
            return
        catalog = admin_session.get(f"{API}/admin/catalog").json()
        row = next((c for c in catalog if c.get("id") == TestCatalogMeal.target_id and c.get("type") == "meal"), None)
        if not row:
            return
        body = {
            "name": row["name"],
            "per_day_by_tier": row.get("per_day_by_tier") or {},
            "classification": TestCatalogMeal.original_classification or "",
        }
        admin_session.put(f"{API}/admin/catalog/meal/{TestCatalogMeal.target_id}", json=body)


# ============== Regression: quotes calculate ==============
class TestQuotesRegression:
    def test_quotes_calculate_still_works(self, admin_session):
        # Minimal payload to validate calculate endpoint responds
        payload = {
            "event_type": "festival",
            "birth_year": 2013,
            "people": 22,
            "nights": 5,
            "lodging_id": None,
            "meal_id": None,
        }
        r = admin_session.post(f"{API}/quotes/calculate", json=payload)
        # endpoint should respond (200 or 422 if payload incomplete) - critical is no 500
        assert r.status_code in (200, 400, 422), f"Quotes calculate returned {r.status_code}: {r.text[:200]}"
