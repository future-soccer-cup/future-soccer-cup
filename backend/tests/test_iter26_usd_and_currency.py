"""Iter 26 — USD pricing & currency switching tests.

Covers:
- POST /api/admin/catalog accepts *_usd fields for lodging, meal_addon, transport, tour
- GET /api/event-types exposes *_usd on the returned tiers/addons/routes/tours
- POST /api/quotes/calculate respects currency='USD' (uses *_usd) and currency='COP' (legacy)
- POST/GET /api/tournaments persist+return categories with fee + fee_usd
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"

ADMIN_EMAIL = "admin@futuresoccercup.com"
ADMIN_PASSWORD = "FSCAdmin2025!"


@pytest.fixture(scope="module")
def admin_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    token = r.json().get("token") or r.json().get("access_token")
    if token:
        s.headers.update({"Authorization": f"Bearer {token}"})
    return s


# ---------------- Catalog ----------------
class TestCatalogUSD:
    def test_create_lodging_with_usd(self, admin_client):
        ts = int(time.time())
        body = {
            "name": f"TEST_iter26_lodging_{ts}",
            "base_5_nights": 1000000,
            "additional_night": 200000,
            "base_5_nights_usd": 250,
            "additional_night_usd": 50,
            "available": True,
            "classification": "SAPPHIRE",
            "accommodation_type": "Doble",
        }
        r = admin_client.post(f"{BASE_URL}/api/admin/catalog/lodging", json=body)
        assert r.status_code == 200, r.text
        doc = r.json()
        assert doc["base_5_nights_usd"] == 250
        assert doc["additional_night_usd"] == 50
        # Verify exposed in /api/event-types
        r2 = requests.get(f"{BASE_URL}/api/event-types")
        assert r2.status_code == 200
        tiers = r2.json().get("lodging_tiers", [])
        found = next((t for t in tiers if t.get("id") == doc["id"]), None)
        assert found is not None, "Lodging tier not exposed in /event-types"
        assert found.get("base_5_nights_usd") == 250
        assert found.get("additional_night_usd") == 50
        # cleanup
        admin_client.delete(f"{BASE_URL}/api/admin/catalog/lodging/{doc['id']}")

    def test_create_meal_addon_with_usd(self, admin_client):
        ts = int(time.time())
        body = {
            "name": f"TEST_iter26_meal_{ts}",
            "meal_type": "ALMUERZO",
            "classification": "SAPPHIRE",
            "cost": 30000,
            "cost_usd": 8,
        }
        r = admin_client.post(f"{BASE_URL}/api/admin/catalog/meal_addon", json=body)
        assert r.status_code == 200, r.text
        doc = r.json()
        assert doc["cost"] == 30000
        assert doc["cost_usd"] == 8
        r2 = requests.get(f"{BASE_URL}/api/event-types")
        addons = r2.json().get("meal_addons", [])
        found = next((a for a in addons if a.get("id") == doc["id"]), None)
        assert found is not None
        assert found.get("cost_usd") == 8
        admin_client.delete(f"{BASE_URL}/api/admin/catalog/meal_addon/{doc['id']}")

    def test_create_transport_with_usd(self, admin_client):
        ts = int(time.time())
        body = {"name": f"TEST_iter26_transp_{ts}", "price": 50000, "price_usd": 15}
        r = admin_client.post(f"{BASE_URL}/api/admin/catalog/transport", json=body)
        assert r.status_code == 200, r.text
        doc = r.json()
        assert doc["price_usd"] == 15
        r2 = requests.get(f"{BASE_URL}/api/event-types")
        routes = r2.json().get("transport_routes", [])
        found = next((x for x in routes if x.get("id") == doc["id"]), None)
        assert found is not None
        assert found.get("price_usd") == 15
        admin_client.delete(f"{BASE_URL}/api/admin/catalog/transport/{doc['id']}")

    def test_create_tour_with_usd(self, admin_client):
        ts = int(time.time())
        body = {"name": f"TEST_iter26_tour_{ts}", "price": 80000, "price_usd": 20}
        r = admin_client.post(f"{BASE_URL}/api/admin/catalog/tour", json=body)
        assert r.status_code == 200, r.text
        doc = r.json()
        assert doc["price_usd"] == 20
        r2 = requests.get(f"{BASE_URL}/api/event-types")
        tours = r2.json().get("tours_catalog", [])
        found = next((x for x in tours if x.get("id") == doc["id"]), None)
        assert found is not None
        assert found.get("price_usd") == 20
        admin_client.delete(f"{BASE_URL}/api/admin/catalog/tour/{doc['id']}")


# ---------------- Quotes / Currency ----------------
class TestQuoteCurrency:
    @pytest.fixture(scope="class")
    def setup_catalog(self, admin_client):
        """Create lodging+meal_addon+transport+tour all with USD prices and yield ids."""
        ts = int(time.time())
        created = {}
        # lodging
        rl = admin_client.post(f"{BASE_URL}/api/admin/catalog/lodging", json={
            "name": f"TEST_iter26q_lodge_{ts}",
            "base_5_nights": 1000000, "additional_night": 200000,
            "base_5_nights_usd": 250, "additional_night_usd": 50,
            "available": True, "classification": "SAPPHIRE",
        })
        assert rl.status_code == 200, rl.text
        created["lodging"] = rl.json()["id"]
        # meal_addon
        rm = admin_client.post(f"{BASE_URL}/api/admin/catalog/meal_addon", json={
            "name": f"TEST_iter26q_meal_{ts}",
            "meal_type": "ALMUERZO", "classification": "SAPPHIRE",
            "cost": 30000, "cost_usd": 10,
        })
        assert rm.status_code == 200, rm.text
        created["meal"] = rm.json()["id"]
        # transport
        rt = admin_client.post(f"{BASE_URL}/api/admin/catalog/transport", json={
            "name": f"TEST_iter26q_transp_{ts}", "price": 60000, "price_usd": 18,
        })
        assert rt.status_code == 200, rt.text
        created["transport"] = rt.json()["id"]
        # tour
        rto = admin_client.post(f"{BASE_URL}/api/admin/catalog/tour", json={
            "name": f"TEST_iter26q_tour_{ts}", "price": 100000, "price_usd": 25,
        })
        assert rto.status_code == 200, rto.text
        created["tour"] = rto.json()["id"]
        yield created
        # teardown
        for t, rid in [("lodging", created["lodging"]), ("meal_addon", created["meal"]),
                       ("transport", created["transport"]), ("tour", created["tour"])]:
            admin_client.delete(f"{BASE_URL}/api/admin/catalog/{t}/{rid}")

    def test_quote_usd_uses_usd_prices(self, setup_catalog):
        ids = setup_catalog
        # 10 pax, 6 nights → lodging USD = 250 + 50*1 = 300/pax × 10 = 3000
        # meal: 1 entry pax=10 cost_usd=10 → 100
        # transport: 1 entry pax=10 price_usd=18 → 180
        # tour: 1 entry pax=10 price_usd=25 → 250
        # events: 1 category fee_usd=120 → 120
        # total USD = 3000 + 100 + 180 + 250 + 120 = 3650
        payload = {
            "currency": "USD",
            "nights": 6, "days": 7,
            "lodgings": [{"tier_id": ids["lodging"], "pax": 10, "nights": 6, "extra_pax_entries": []}],
            "meal_entries": [{"date": "2026-07-01", "meal_addon_id": ids["meal"], "pax": 10, "meal_type": "lunch"}],
            "transport_entries": [{"route_id": ids["transport"], "pax": 10, "date": "2026-07-01"}],
            "tour_entries": [{"tour_id": ids["tour"], "pax": 10}],
            "events": [{"tournament_name": "TEST USD Cup", "categories": [{"name": "Sub-12", "fee": 250000, "fee_usd": 120}]}],
            "include_registration": True,
        }
        r = requests.post(f"{BASE_URL}/api/quotes/calculate", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("currency") == "USD", data
        assert data["lodging_subtotal"] == 3000, data
        assert data["meals_subtotal"] == 100, data
        assert data["transport_subtotal"] == 180, data
        assert data["tours_subtotal"] == 250, data
        assert data["registration_fee"] == 120, data
        assert data["total_amount"] == 3650, data
        # rate per person should be base_5_usd + add_night_usd*(nights-5) = 300
        assert data["rate_per_person_total"] == 300, data

    def test_quote_cop_legacy(self, setup_catalog):
        ids = setup_catalog
        payload = {
            "currency": "COP",
            "nights": 6, "days": 7,
            "lodgings": [{"tier_id": ids["lodging"], "pax": 10, "nights": 6, "extra_pax_entries": []}],
            "events": [{"tournament_name": "TEST COP Cup", "categories": [{"name": "Sub-12", "fee": 250000, "fee_usd": 120}]}],
            "include_registration": True,
        }
        r = requests.post(f"{BASE_URL}/api/quotes/calculate", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("currency") == "COP"
        # lodging COP = (1_000_000 + 200_000*1) * 10 = 12_000_000
        assert data["lodging_subtotal"] == 12_000_000, data
        # registration COP fee = 250_000
        assert data["registration_fee"] == 250_000, data
        assert data["total_amount"] == 12_250_000, data

    def test_quote_default_currency_is_cop(self, setup_catalog):
        ids = setup_catalog
        payload = {
            "nights": 5, "days": 6,
            "lodgings": [{"tier_id": ids["lodging"], "pax": 5, "nights": 5}],
            "include_registration": False,
        }
        r = requests.post(f"{BASE_URL}/api/quotes/calculate", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("currency") == "COP"
        assert data["lodging_subtotal"] == 5_000_000  # 1M*5


# ---------------- Tournaments fee_usd ----------------
class TestTournamentsUSD:
    def test_create_tournament_with_fee_usd(self, admin_client):
        ts = int(time.time())
        payload = {
            "name": f"TEST_iter26_tournament_{ts}",
            "season": "2026",
            "category": "Sub-12",
            "start_date": "2026-07-01",
            "end_date": "2026-07-07",
            "categories": [
                {"name": "Sub-12", "fee": 250000, "fee_usd": 120},
                {"name": "Sub-14", "fee": 300000, "fee_usd": 150},
            ],
        }
        r = admin_client.post(f"{BASE_URL}/api/tournaments", json=payload)
        assert r.status_code == 200, r.text
        t = r.json()
        tid = t["id"]
        try:
            # GET back and verify fee_usd preserved
            r2 = requests.get(f"{BASE_URL}/api/tournaments")
            assert r2.status_code == 200
            found = next((x for x in r2.json() if x["id"] == tid), None)
            assert found is not None
            cats = found.get("categories", [])
            assert len(cats) == 2
            by_name = {c["name"]: c for c in cats}
            assert by_name["Sub-12"]["fee"] == 250000
            assert by_name["Sub-12"]["fee_usd"] == 120
            assert by_name["Sub-14"]["fee_usd"] == 150
        finally:
            admin_client.delete(f"{BASE_URL}/api/tournaments/{tid}")
