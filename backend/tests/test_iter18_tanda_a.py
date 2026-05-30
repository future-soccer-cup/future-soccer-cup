"""
Iteration 18 — Sub-tanda A (UX visual + club_name in /api/quotes)

Backend coverage:
1. GET /api/quotes (admin) returns each quote with a `club_name` key (may be "").
2. GET /api/quotes without admin auth → 401/403.
3. Regression: POST /api/admin/catalog/lodging still works (classification + accommodation_type).
4. Regression: POST /api/admin/catalog/meal_addon accepts name built as "MEAL · CLASS".
5. Regression: PUT /api/admin/event-types/{id} works without registration_fee_per_team in body.
"""

import os
import uuid
import requests
import pytest

def _load_backend_url():
    val = os.environ.get("REACT_APP_BACKEND_URL")
    if not val:
        try:
            with open("/app/frontend/.env") as f:
                for line in f:
                    if line.startswith("REACT_APP_BACKEND_URL="):
                        val = line.split("=", 1)[1].strip()
                        break
        except FileNotFoundError:
            pass
    if not val:
        raise RuntimeError("REACT_APP_BACKEND_URL not set")
    return val.rstrip("/")

BASE_URL = _load_backend_url()
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@futuresoccercup.com"
ADMIN_PASS = "FSCAdmin2025!"


# ---------- fixtures ----------

@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=15)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def anon_session():
    return requests.Session()


# ---------- 1) /api/quotes club_name enrichment ----------

class TestQuotesClubName:
    def test_admin_quotes_returns_club_name_key(self, admin_session):
        r = admin_session.get(f"{API}/quotes", timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        # Every quote must have the 'club_name' key (string, possibly empty).
        for q in data:
            assert "club_name" in q, f"quote {q.get('id')} missing club_name"
            assert isinstance(q["club_name"], str), f"club_name not a string for {q.get('id')}"
        # Sanity: at least 1 quote with a non-empty club_name when any quote has user_id
        with_user = [q for q in data if q.get("user_id")]
        if with_user:
            # Not a hard requirement but informative
            non_empty = [q for q in with_user if q["club_name"]]
            print(f"INFO: {len(non_empty)}/{len(with_user)} quotes with user_id have populated club_name")

    def test_quotes_requires_admin(self, anon_session):
        r = anon_session.get(f"{API}/quotes", timeout=15)
        assert r.status_code in (401, 403), f"expected 401/403, got {r.status_code}: {r.text}"


# ---------- 2) Regression: lodging POST ----------

class TestCatalogLodgingRegression:
    def test_create_lodging_with_classification(self, admin_session):
        payload = {
            "name": "SAPPHIRE",
            "classification": "SAPPHIRE",
            "accommodation_type": "HOTEL",
            "cost_per_night": 250000,
            "base_nights": 5,
        }
        r = admin_session.post(f"{API}/admin/catalog/lodging", json=payload, timeout=15)
        assert r.status_code in (200, 201), r.text
        created = r.json()
        assert created["classification"] == "SAPPHIRE"
        # cleanup
        cid = created.get("id")
        if cid:
            admin_session.delete(f"{API}/admin/catalog/lodging/{cid}", timeout=10)


# ---------- 3) Regression: meal_addon POST with synthetic name ----------

class TestCatalogMealAddonRegression:
    def test_create_meal_addon_with_synthetic_name(self, admin_session):
        # Frontend now builds the name as "MEAL · CLASS"
        payload = {
            "name": "ALMUERZO · GOLD",
            "meal_type": "ALMUERZO",
            "classification": "GOLD",
            "cost": 35000,
        }
        r = admin_session.post(f"{API}/admin/catalog/meal_addon", json=payload, timeout=15)
        assert r.status_code in (200, 201), r.text
        created = r.json()
        assert created["meal_type"] == "ALMUERZO"
        assert created["classification"] == "GOLD"
        assert created["name"] == "ALMUERZO · GOLD"
        cid = created.get("id")
        if cid:
            admin_session.delete(f"{API}/admin/catalog/meal_addon/{cid}", timeout=10)

    def test_create_meal_addon_rejects_empty_name(self, admin_session):
        payload = {
            "name": "",
            "meal_type": "ALMUERZO",
            "classification": "GOLD",
            "cost": 35000,
        }
        r = admin_session.post(f"{API}/admin/catalog/meal_addon", json=payload, timeout=15)
        # Backend still requires name non-empty
        assert r.status_code in (400, 422), f"expected 400/422, got {r.status_code}: {r.text}"


# ---------- 4) Regression: PUT event-types without registration_fee_per_team ----------

class TestEventTypesRegression:
    def test_put_event_type_without_fee(self, admin_session):
        # Create a temp event type
        new_payload = {
            "name": f"TEST_iter18_{uuid.uuid4().hex[:6]}",
            "description": "iter18 regression test",
            "registration_fee_per_team": 0,
        }
        r = admin_session.post(f"{API}/admin/event-types", json=new_payload, timeout=15)
        assert r.status_code in (200, 201), r.text
        created = r.json()
        ev_id = created["id"]

        try:
            # PUT WITHOUT registration_fee_per_team key — should not fail
            update_payload = {
                "name": new_payload["name"],
                "description": "updated without fee",
            }
            r2 = admin_session.put(f"{API}/admin/event-types/{ev_id}", json=update_payload, timeout=15)
            assert r2.status_code == 200, f"PUT without fee failed: {r2.status_code} {r2.text}"
            updated = r2.json()
            assert updated["description"] == "updated without fee"

            # Verify persisted
            r3 = admin_session.get(f"{API}/admin/event-types", timeout=10)
            assert r3.status_code == 200
            all_evs = r3.json()
            found = next((e for e in all_evs if e["id"] == ev_id), None)
            assert found is not None, "event-type not found after PUT"
            assert found["description"] == "updated without fee"
        finally:
            admin_session.delete(f"{API}/admin/event-types/{ev_id}", timeout=10)
