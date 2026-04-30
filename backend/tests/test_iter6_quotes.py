"""Iter6 tests: /api/event-types, /api/quotes/* endpoints + regression for iter1-5."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://fixture-stats-pro.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_EMAIL = "admin@futuresoccercup.com"
ADMIN_PASS = "FSCAdmin2025!"


@pytest.fixture(scope="module")
def admin_sess():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=15)
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(scope="module")
def team_sess():
    s = requests.Session()
    email = f"TEST_iter6_{uuid.uuid4().hex[:8]}@test.com"
    payload = {
        "email": email, "password": "TeamPass123!", "manager_name": "Iter6 Manager",
        "team_name": f"TEST_ITER6_TEAM_{uuid.uuid4().hex[:6]}",
        "category": "Sub-12", "coach": "Coach", "city": "Quito",
    }
    r = s.post(f"{API}/auth/register-team", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    s.email = email
    s.user_id = data["id"]
    s.team_id = data["team_id"]
    return s


# ---- Event types ----
class TestEventTypes:
    def test_event_types_schema(self):
        r = requests.get(f"{API}/event-types", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "events" in data and "lodging_tiers" in data and "addons" in data
        ids = {e["id"] for e in data["events"]}
        assert ids == {"festival", "premier_par", "premier_impar"}
        for e in data["events"]:
            assert isinstance(e["categories"], list) and len(e["categories"]) > 0
            assert isinstance(e["registration_fee_per_team"], (int, float))
        tier_ids = {t["id"] for t in data["lodging_tiers"]}
        assert tier_ids == {"diamond", "gold", "silver", "bronze"}
        for t in data["lodging_tiers"]:
            rates = t["rates"]
            for room in ("single", "double", "triple", "quadruple"):
                assert room in rates and isinstance(rates[room], (int, float))
        assert set(data["addons"].keys()) == {"transport", "parque", "tour"}


# ---- Quote calculation ----
class TestQuoteCalculate:
    def test_calculate_festival_sub12_gold_double_4pax_3nights(self):
        # expected: gold.double=100 -> 100*4*3=1200 lodging; fest fee=250; no addons => 1450
        r = requests.post(f"{API}/quotes/calculate", json={
            "event_type": "festival", "category": "Sub-12", "lodging_tier": "gold",
            "room_type": "double", "pax": 4, "nights": 3,
            "includes_transport": False, "includes_parque": False, "includes_tour": False,
        }, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["lodging_subtotal"] == 1200
        assert d["registration_fee"] == 250.0
        assert d["transport_subtotal"] == 0
        assert d["parque_subtotal"] == 0
        assert d["tour_subtotal"] == 0
        assert d["total_amount"] == 1450

    def test_calculate_with_all_addons(self):
        # gold.double=100 * 4pax * 2n = 800 ; transport 25*4=100 ; parque 35*4=140 ; tour 28*4=112 ; fee 450 => 1602
        r = requests.post(f"{API}/quotes/calculate", json={
            "event_type": "premier_par", "category": "Sub-14", "lodging_tier": "gold",
            "room_type": "double", "pax": 4, "nights": 2,
            "includes_transport": True, "includes_parque": True, "includes_tour": True,
        }, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["lodging_subtotal"] == 800
        assert d["transport_subtotal"] == 100
        assert d["parque_subtotal"] == 140
        assert d["tour_subtotal"] == 112
        assert d["registration_fee"] == 450.0
        assert d["total_amount"] == 800 + 100 + 140 + 112 + 450

    def test_calculate_invalid_category_for_event(self):
        # Sub-8 is not in premier_par categories
        r = requests.post(f"{API}/quotes/calculate", json={
            "event_type": "premier_par", "category": "Sub-8", "lodging_tier": "gold",
            "room_type": "double", "pax": 2, "nights": 1,
        }, timeout=15)
        assert r.status_code == 400

    def test_calculate_invalid_event_type(self):
        r = requests.post(f"{API}/quotes/calculate", json={
            "event_type": "bogus", "category": "Sub-12", "lodging_tier": "gold",
            "room_type": "double", "pax": 2, "nights": 1,
        }, timeout=15)
        assert r.status_code == 422  # pydantic Literal rejects

    def test_calculate_invalid_tier(self):
        r = requests.post(f"{API}/quotes/calculate", json={
            "event_type": "festival", "category": "Sub-12", "lodging_tier": "platinum",
            "room_type": "double", "pax": 2, "nights": 1,
        }, timeout=15)
        assert r.status_code == 422

    def test_calculate_invalid_room_type(self):
        r = requests.post(f"{API}/quotes/calculate", json={
            "event_type": "festival", "category": "Sub-12", "lodging_tier": "gold",
            "room_type": "suite", "pax": 2, "nights": 1,
        }, timeout=15)
        assert r.status_code == 422


# ---- Quote persistence & auth ----
class TestQuoteCreateAndList:
    def test_create_quote_requires_auth(self):
        r = requests.post(f"{API}/quotes", json={
            "event_type": "festival", "category": "Sub-12", "lodging_tier": "gold",
            "room_type": "double", "pax": 4, "nights": 3,
        }, timeout=15)
        assert r.status_code == 401

    def test_create_quote_as_team_manager(self, team_sess):
        payload = {
            "event_type": "festival", "category": "Sub-12", "lodging_tier": "gold",
            "room_type": "double", "pax": 4, "nights": 3,
            "includes_transport": True, "includes_parque": False, "includes_tour": False,
            "notes": "TEST_ITER6", "contact_phone": "+593999",
        }
        r = team_sess.post(f"{API}/quotes", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        # Persisted quote must match calculate math
        assert d["status"] == "pendiente"
        assert d["user_id"] == team_sess.user_id
        assert d["team_id"] == team_sess.team_id
        assert d["lodging_subtotal"] == 1200
        assert d["transport_subtotal"] == 100
        assert d["total_amount"] == 1200 + 100 + 250
        assert "id" in d
        team_sess.quote_id = d["id"]

    def test_mine_returns_own_quotes(self, team_sess):
        r = team_sess.get(f"{API}/quotes/mine", timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert any(q["id"] == team_sess.quote_id for q in items)
        # All items are owned by this user
        assert all(q["user_id"] == team_sess.user_id for q in items)

    def test_admin_list_all_quotes(self, admin_sess, team_sess):
        r = admin_sess.get(f"{API}/quotes", timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert any(q["id"] == team_sess.quote_id for q in items)

    def test_non_admin_cannot_list_all_quotes(self, team_sess):
        r = team_sess.get(f"{API}/quotes", timeout=15)
        assert r.status_code == 403


class TestQuoteStatus:
    def test_admin_update_status_valid(self, admin_sess, team_sess):
        r = admin_sess.put(f"{API}/quotes/{team_sess.quote_id}/status", params={"status": "aprobada"}, timeout=15)
        assert r.status_code == 200
        # verify persistence
        r2 = admin_sess.get(f"{API}/quotes", timeout=15)
        items = r2.json()
        my = next(q for q in items if q["id"] == team_sess.quote_id)
        assert my["status"] == "aprobada"

    def test_admin_update_status_invalid(self, admin_sess, team_sess):
        r = admin_sess.put(f"{API}/quotes/{team_sess.quote_id}/status", params={"status": "bogus"}, timeout=15)
        assert r.status_code == 400

    def test_non_admin_cannot_update_status(self, team_sess):
        r = team_sess.put(f"{API}/quotes/{team_sess.quote_id}/status", params={"status": "aprobada"}, timeout=15)
        assert r.status_code == 403


class TestPaymentProof:
    def test_owner_can_attach(self, team_sess):
        r = team_sess.put(f"{API}/quotes/{team_sess.quote_id}/payment-proof",
                          json={"url": "https://example.com/proof.png"}, timeout=15)
        assert r.status_code == 200

    def test_admin_can_attach(self, admin_sess, team_sess):
        r = admin_sess.put(f"{API}/quotes/{team_sess.quote_id}/payment-proof",
                           json={"url": "https://example.com/admin-proof.png"}, timeout=15)
        assert r.status_code == 200

    def test_stranger_cannot_attach(self, team_sess):
        # Create a second team manager and ensure he cannot set proof on team_sess's quote
        s = requests.Session()
        email = f"TEST_iter6b_{uuid.uuid4().hex[:8]}@test.com"
        r = s.post(f"{API}/auth/register-team", json={
            "email": email, "password": "P@ssword1", "manager_name": "Other",
            "team_name": f"TEST_ITER6_OTHER_{uuid.uuid4().hex[:6]}",
            "category": "Sub-10",
        }, timeout=15)
        assert r.status_code == 200
        r2 = s.put(f"{API}/quotes/{team_sess.quote_id}/payment-proof",
                   json={"url": "https://evil.com"}, timeout=15)
        assert r2.status_code == 403


# ---- Cleanup ----
@pytest.fixture(scope="module", autouse=True)
def _cleanup(admin_sess):
    yield
    # Delete test teams + quotes is not needed; just leave TEST_ITER6 tagged - admin test db
    try:
        teams = admin_sess.get(f"{API}/teams", timeout=15).json()
        for t in teams:
            if t.get("name", "").startswith("TEST_ITER6"):
                admin_sess.delete(f"{API}/teams/{t['id']}", timeout=15)
    except Exception:
        pass
