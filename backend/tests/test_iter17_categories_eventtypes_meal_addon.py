"""
Iteration 17 — Backend tests for:
- /api/admin/categories CRUD (admin)
- /api/categories public (returns list[str])
- /api/admin/event-types CRUD (admin)
- /api/admin/catalog/meal_addon create/update (with classification + meal_type uppercased)
- /api/admin/catalog/tour create with description
- POST /api/teams accepts custom category (validation relaxed to non-empty)
- Regression: POST /api/admin/catalog/lodging with classification+accommodation_type still works
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ADMIN_EMAIL = "admin@futuresoccercup.com"
ADMIN_PASSWORD = "FSCAdmin2025!"


@pytest.fixture(scope="session")
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login",
               json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
               timeout=20)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return s


# ---------- /api/categories public ----------
class TestPublicCategories:
    def test_public_returns_objects_with_name(self):
        """Iter41: el endpoint público devuelve objetos con `name` (+ opcional `color`, `sort_order`)
        en vez de strings. Los consumidores (CategorySelect) extraen `.name` para compatibilidad."""
        r = requests.get(f"{BASE_URL}/api/categories", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        for item in data:
            assert isinstance(item, dict), f"Expected dict but got {type(item)}: {item}"
            assert "name" in item and isinstance(item["name"], str) and item["name"]


# ---------- Categories admin CRUD ----------
class TestAdminCategoriesCRUD:
    created_id = None

    def test_list_seeds_six_defaults(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/admin/categories", timeout=15)
        assert r.status_code == 200
        rows = r.json()
        assert isinstance(rows, list) and len(rows) >= 6
        names = {row["name"] for row in rows}
        for n in ("Sub-8", "Sub-10", "Sub-12", "Sub-14", "Sub-16", "Sub-18"):
            assert n in names, f"Default category {n} missing"
        for row in rows:
            assert "id" in row and "name" in row
            assert "_id" not in row

    def test_create_and_persist(self, admin_session):
        name = f"TEST_Femenino-{uuid.uuid4().hex[:6]}"
        r = admin_session.post(f"{BASE_URL}/api/admin/categories",
                               json={"name": name}, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["name"] == name
        assert "id" in data
        TestAdminCategoriesCRUD.created_id = data["id"]

        # GET to verify persistence
        r2 = admin_session.get(f"{BASE_URL}/api/admin/categories", timeout=15)
        assert any(c["id"] == data["id"] and c["name"] == name for c in r2.json())

    def test_create_duplicate_rejected(self, admin_session):
        name = f"TEST_Dup-{uuid.uuid4().hex[:6]}"
        r1 = admin_session.post(f"{BASE_URL}/api/admin/categories",
                                json={"name": name}, timeout=15)
        assert r1.status_code == 200
        cid = r1.json()["id"]
        r2 = admin_session.post(f"{BASE_URL}/api/admin/categories",
                                json={"name": name}, timeout=15)
        assert r2.status_code == 400
        admin_session.delete(f"{BASE_URL}/api/admin/categories/{cid}", timeout=15)

    def test_update_persists(self, admin_session):
        assert TestAdminCategoriesCRUD.created_id, "No category id from prior test"
        new_name = f"TEST_Renamed-{uuid.uuid4().hex[:6]}"
        r = admin_session.put(
            f"{BASE_URL}/api/admin/categories/{TestAdminCategoriesCRUD.created_id}",
            json={"name": new_name}, timeout=15)
        assert r.status_code == 200
        # Verify via list
        rows = admin_session.get(f"{BASE_URL}/api/admin/categories", timeout=15).json()
        assert any(c["id"] == TestAdminCategoriesCRUD.created_id and c["name"] == new_name
                   for c in rows)

    def test_delete_persists(self, admin_session):
        cid = TestAdminCategoriesCRUD.created_id
        assert cid
        r = admin_session.delete(f"{BASE_URL}/api/admin/categories/{cid}", timeout=15)
        assert r.status_code == 200
        rows = admin_session.get(f"{BASE_URL}/api/admin/categories", timeout=15).json()
        assert not any(c["id"] == cid for c in rows)

    def test_admin_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/admin/categories", timeout=15)
        assert r.status_code in (401, 403)


# ---------- Event Types admin CRUD ----------
class TestAdminEventTypesCRUD:
    created_id = None

    def test_list_seeds_defaults(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/admin/event-types", timeout=15)
        assert r.status_code == 200
        rows = r.json()
        assert isinstance(rows, list) and len(rows) >= 3
        # Each row has expected fields
        for row in rows:
            assert "id" in row and "name" in row
            assert "registration_fee_per_team" in row
            assert "_id" not in row

    def test_create_event_type(self, admin_session):
        name = f"TEST_EvType-{uuid.uuid4().hex[:6]}"
        r = admin_session.post(
            f"{BASE_URL}/api/admin/event-types",
            json={"name": name, "month": "Marzo", "registration_fee_per_team": 1500000},
            timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["name"] == name
        assert data["month"] == "Marzo"
        assert float(data["registration_fee_per_team"]) == 1500000.0
        TestAdminEventTypesCRUD.created_id = data["id"]

    def test_update_event_type_fee(self, admin_session):
        eid = TestAdminEventTypesCRUD.created_id
        assert eid
        r = admin_session.put(
            f"{BASE_URL}/api/admin/event-types/{eid}",
            json={"registration_fee_per_team": 2000000}, timeout=15)
        assert r.status_code == 200
        rows = admin_session.get(f"{BASE_URL}/api/admin/event-types", timeout=15).json()
        row = next((x for x in rows if x["id"] == eid), None)
        assert row and float(row["registration_fee_per_team"]) == 2000000.0

    def test_delete_event_type(self, admin_session):
        eid = TestAdminEventTypesCRUD.created_id
        assert eid
        r = admin_session.delete(f"{BASE_URL}/api/admin/event-types/{eid}", timeout=15)
        assert r.status_code == 200
        rows = admin_session.get(f"{BASE_URL}/api/admin/event-types", timeout=15).json()
        assert not any(x["id"] == eid for x in rows)


# ---------- meal_addon ----------
class TestMealAddonCatalog:
    created_id = None

    def test_create_meal_addon_uppercases(self, admin_session):
        name = f"TEST_Desayuno-{uuid.uuid4().hex[:6]}"
        r = admin_session.post(
            f"{BASE_URL}/api/admin/catalog/meal_addon",
            json={"name": name, "meal_type": "desayuno",
                  "classification": "sapphire", "cost": 25000},
            timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["meal_type"] == "DESAYUNO"
        assert data["classification"] == "SAPPHIRE"
        assert float(data["cost"]) == 25000.0
        TestMealAddonCatalog.created_id = data["id"]

    def test_update_meal_addon_cost(self, admin_session):
        rid = TestMealAddonCatalog.created_id
        assert rid
        r = admin_session.put(
            f"{BASE_URL}/api/admin/catalog/meal_addon/{rid}",
            json={"name": "TEST_Updated", "meal_type": "almuerzo",
                  "classification": "gold", "cost": 33000},
            timeout=15)
        assert r.status_code == 200
        catalog = admin_session.get(f"{BASE_URL}/api/admin/catalog", timeout=15).json()
        row = next((x for x in catalog if x.get("id") == rid and x.get("type") == "meal_addon"), None)
        assert row is not None
        assert row["meal_type"] == "ALMUERZO"
        assert row["classification"] == "GOLD"
        assert float(row["cost"]) == 33000.0

    def test_reject_invalid_meal_type(self, admin_session):
        r = admin_session.post(
            f"{BASE_URL}/api/admin/catalog/meal_addon",
            json={"name": f"TEST_Bad-{uuid.uuid4().hex[:6]}",
                  "meal_type": "snack",
                  "classification": "GOLD", "cost": 10000},
            timeout=15)
        assert r.status_code == 400

    def test_cleanup(self, admin_session):
        rid = TestMealAddonCatalog.created_id
        if rid:
            r = admin_session.delete(
                f"{BASE_URL}/api/admin/catalog/meal_addon/{rid}", timeout=15)
            assert r.status_code == 200


# ---------- tour with description ----------
class TestTourWithDescription:
    created_id = None

    def test_create_tour_with_description(self, admin_session):
        name = f"TEST_Tour-{uuid.uuid4().hex[:6]}"
        r = admin_session.post(
            f"{BASE_URL}/api/admin/catalog/tour",
            json={"name": name, "price": 80000,
                  "description": "Recorrido por el centro histórico"},
            timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["description"] == "Recorrido por el centro histórico"
        assert float(data["price"]) == 80000.0
        TestTourWithDescription.created_id = data["id"]

    def test_update_tour_description(self, admin_session):
        rid = TestTourWithDescription.created_id
        assert rid
        r = admin_session.put(
            f"{BASE_URL}/api/admin/catalog/tour/{rid}",
            json={"name": "TEST_Tour_v2", "price": 90000,
                  "description": "Descripción actualizada"},
            timeout=15)
        assert r.status_code == 200
        catalog = admin_session.get(f"{BASE_URL}/api/admin/catalog", timeout=15).json()
        row = next((x for x in catalog if x.get("id") == rid and x.get("type") == "tour"), None)
        assert row is not None
        assert row["description"] == "Descripción actualizada"

    def test_cleanup(self, admin_session):
        rid = TestTourWithDescription.created_id
        if rid:
            admin_session.delete(f"{BASE_URL}/api/admin/catalog/tour/{rid}", timeout=15)


# ---------- Custom category accepted on /teams ----------
class TestTeamCustomCategory:
    created_team_id = None

    def test_create_team_custom_category(self, admin_session):
        name = f"TEST_Equipo-{uuid.uuid4().hex[:6]}"
        r = admin_session.post(
            f"{BASE_URL}/api/teams",
            json={"name": name, "category": "Femenino",
                  "birth_year": 2014, "coach": "DT Test"},
            timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["category"] == "Femenino"
        TestTeamCustomCategory.created_team_id = data["id"]

    def test_empty_category_rejected(self, admin_session):
        r = admin_session.post(
            f"{BASE_URL}/api/teams",
            json={"name": "TEST_NoCat", "category": "",
                  "birth_year": 2014, "coach": "DT Test"},
            timeout=15)
        assert r.status_code == 400

    def test_cleanup(self, admin_session):
        tid = TestTeamCustomCategory.created_team_id
        if tid:
            admin_session.delete(f"{BASE_URL}/api/teams/{tid}", timeout=15)


# ---------- Regression: lodging with classification + accommodation_type ----------
class TestLodgingRegression:
    created_id = None

    def test_create_lodging_with_classification(self, admin_session):
        name = f"TEST_Lodg-{uuid.uuid4().hex[:6]}"
        r = admin_session.post(
            f"{BASE_URL}/api/admin/catalog/lodging",
            json={"name": name, "base_5_nights": 1320000,
                  "additional_night": 200000,
                  "classification": "sapphire",
                  "accommodation_type": "Doble",
                  "available": True},
            timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["classification"] == "SAPPHIRE"
        assert data["accommodation_type"] == "Doble"
        assert float(data["base_5_nights"]) == 1320000.0
        TestLodgingRegression.created_id = data["id"]

    def test_cleanup(self, admin_session):
        rid = TestLodgingRegression.created_id
        if rid:
            admin_session.delete(f"{BASE_URL}/api/admin/catalog/lodging/{rid}", timeout=15)
