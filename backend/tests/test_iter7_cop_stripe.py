"""Iter7 tests: COP pricing, event_type validation on register-team, Stripe
registration & quote checkout flows, posts, instagram social endpoint."""

import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://fixture-stats-pro.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@futuresoccercup.com"
ADMIN_PASSWORD = "FSCAdmin2025!"


# ---------------- helpers & fixtures ----------------
def _session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_client():
    s = _session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"admin login failed {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def team_client():
    """Create a team manager via register-team so we have ownership tests."""
    s = _session()
    uniq = uuid.uuid4().hex[:8]
    payload = {
        "email": f"TEST_iter7_team_{uniq}@test.com",
        "password": "TestPass2025!",
        "manager_name": "Iter7 Manager",
        "team_name": f"TEST_ITER7_TEAM_{uniq}",
        "category": "Sub-12",
        "event_type": "premier_par",
        "coach": "Coach I7",
        "city": "Bogota",
    }
    r = s.post(f"{API}/auth/register-team", json=payload)
    assert r.status_code == 200, f"register-team failed {r.status_code} {r.text}"
    data = r.json()
    s.team_id = data["team_id"]
    s.user_id = data["id"]
    s.email = data["email"]
    return s


@pytest.fixture(scope="module")
def other_team_client():
    """Second team manager to verify 403 on cross-ownership registration payment."""
    s = _session()
    uniq = uuid.uuid4().hex[:8]
    r = s.post(f"{API}/auth/register-team", json={
        "email": f"TEST_iter7_other_{uniq}@test.com",
        "password": "TestPass2025!",
        "manager_name": "Other Manager",
        "team_name": f"TEST_ITER7_OTHER_{uniq}",
        "category": "Sub-12",
        "event_type": "festival",
    })
    assert r.status_code == 200
    return s


@pytest.fixture(scope="module", autouse=True)
def cleanup(admin_client, request):
    yield
    # Delete teams created by TEST_iter7_* & their users
    try:
        teams = admin_client.get(f"{API}/teams").json()
        for t in teams:
            if str(t.get("name", "")).startswith("TEST_ITER7_"):
                admin_client.delete(f"{API}/teams/{t['id']}")
    except Exception as e:
        print("cleanup teams err", e)


# ==================================================
# 1. /api/event-types COP pricing
# ==================================================
class TestEventTypes:
    def test_event_types_cop_pricing(self):
        r = requests.get(f"{API}/event-types")
        assert r.status_code == 200
        data = r.json()
        events = {e["id"]: e for e in data["events"]}
        assert events["festival"]["registration_fee_per_team"] == 1000000.0
        assert events["premier_par"]["registration_fee_per_team"] == 1800000.0
        assert events["premier_impar"]["registration_fee_per_team"] == 1800000.0
        # Categories per event
        assert set(events["festival"]["categories"]) == {"Sub-8", "Sub-10", "Sub-12"}
        assert set(events["premier_par"]["categories"]) == {"Sub-12", "Sub-14", "Sub-16"}
        assert "Sub-16" in events["premier_impar"]["categories"]

        tiers = {t["id"]: t for t in data["lodging_tiers"]}
        # gold double per person per night = 400000
        assert tiers["gold"]["rates"]["double"] == 400000
        # addons in COP
        assert data["addons"]["transport"] == 100000.0
        assert data["addons"]["parque"] == 140000.0
        assert data["addons"]["tour"] == 110000.0


# ==================================================
# 2. register-team event_type validation
# ==================================================
class TestRegisterTeamEventType:
    def test_requires_event_type(self):
        r = requests.post(f"{API}/auth/register-team", json={
            "email": f"TEST_iter7_noev_{uuid.uuid4().hex[:6]}@test.com",
            "password": "Pw2025!!",
            "manager_name": "NoEv",
            "team_name": "TEST_ITER7_NOEV",
            "category": "Sub-12",
        })
        assert r.status_code == 422  # pydantic missing field

    def test_invalid_event_type(self):
        r = requests.post(f"{API}/auth/register-team", json={
            "email": f"TEST_iter7_bad_{uuid.uuid4().hex[:6]}@test.com",
            "password": "Pw2025!!",
            "manager_name": "BadEv",
            "team_name": "TEST_ITER7_BAD",
            "category": "Sub-12",
            "event_type": "nope",
        })
        assert r.status_code == 422

    def test_category_not_allowed_for_event(self):
        # Festival does not allow Sub-16
        r = requests.post(f"{API}/auth/register-team", json={
            "email": f"TEST_iter7_catmismatch_{uuid.uuid4().hex[:6]}@test.com",
            "password": "Pw2025!!",
            "manager_name": "CatMismatch",
            "team_name": "TEST_ITER7_CATMIS",
            "category": "Sub-16",
            "event_type": "festival",
        })
        assert r.status_code == 400

    def test_register_team_persists_cop_fields(self, admin_client):
        uniq = uuid.uuid4().hex[:8]
        r = requests.post(f"{API}/auth/register-team", json={
            "email": f"TEST_iter7_persist_{uniq}@test.com",
            "password": "Pw2025!!",
            "manager_name": "Persist Mgr",
            "team_name": f"TEST_ITER7_PERSIST_{uniq}",
            "category": "Sub-14",
            "event_type": "premier_par",
        })
        assert r.status_code == 200
        tid = r.json()["team_id"]
        # Verify stored fields via admin GET /teams
        teams = admin_client.get(f"{API}/teams").json()
        t = next(x for x in teams if x["id"] == tid)
        assert t["event_type"] == "premier_par"
        assert t["registration_fee"] == 1800000.0
        assert t["registration_payment_status"] == "pending"


# ==================================================
# 3. /api/quotes/calculate math (COP)
# ==================================================
class TestQuotesCalculate:
    def test_premier_par_sub12_gold_double_4pax_3nights_with_transport(self):
        r = requests.post(f"{API}/quotes/calculate", json={
            "event_type": "premier_par",
            "category": "Sub-12",
            "lodging_tier": "gold",
            "room_type": "double",
            "pax": 4,
            "nights": 3,
            "includes_transport": True,
        })
        assert r.status_code == 200
        d = r.json()
        assert d["lodging_subtotal"] == 400000 * 4 * 3  # 4,800,000
        assert d["transport_subtotal"] == 100000 * 4      # 400,000
        assert d["registration_fee"] == 1800000
        assert d["total_amount"] == 4800000 + 400000 + 1800000  # 7,000,000
        assert d["rate_per_person_night"] == 400000

    def test_quote_calc_invalid_category_for_event(self):
        r = requests.post(f"{API}/quotes/calculate", json={
            "event_type": "festival",
            "category": "Sub-16",
            "lodging_tier": "gold",
            "room_type": "double",
            "pax": 2,
            "nights": 2,
        })
        assert r.status_code == 400

    def test_create_quote_persists_cop_total(self, team_client):
        r = team_client.post(f"{API}/quotes", json={
            "event_type": "premier_par",
            "category": "Sub-12",
            "lodging_tier": "gold",
            "room_type": "double",
            "pax": 4,
            "nights": 3,
            "includes_transport": True,
        })
        assert r.status_code == 200
        q = r.json()
        assert q["total_amount"] == 7000000
        assert q["status"] == "pendiente"
        team_client.quote_id = q["id"]


# ==================================================
# 4. Stripe: /payments/registration/session
# ==================================================
class TestRegistrationCheckout:
    def test_unauth_rejected(self, team_client):
        r = requests.post(f"{API}/payments/registration/session", json={
            "team_id": team_client.team_id,
            "origin_url": BASE_URL,
        })
        assert r.status_code in (401, 403)

    def test_404_team_not_found(self, team_client):
        r = team_client.post(f"{API}/payments/registration/session", json={
            "team_id": "non-existent-id-xxxx",
            "origin_url": BASE_URL,
        })
        assert r.status_code == 404

    def test_403_not_owner(self, team_client, other_team_client):
        # other_team_client trying to pay team_client's team
        r = other_team_client.post(f"{API}/payments/registration/session", json={
            "team_id": team_client.team_id,
            "origin_url": BASE_URL,
        })
        assert r.status_code == 403

    def test_owner_creates_session(self, team_client):
        r = team_client.post(f"{API}/payments/registration/session", json={
            "team_id": team_client.team_id,
            "origin_url": BASE_URL,
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert "url" in data and data["url"].startswith("http")
        assert "session_id" in data and data["session_id"]
        team_client.reg_session_id = data["session_id"]


# ==================================================
# 5. Stripe: /payments/checkout/session (quote)
# ==================================================
class TestQuoteCheckout:
    def test_400_not_approved(self, team_client):
        # team_client.quote_id is status=pendiente
        r = team_client.post(f"{API}/payments/checkout/session", json={
            "quote_id": team_client.quote_id,
            "origin_url": BASE_URL,
        })
        assert r.status_code == 400

    def test_approve_then_checkout(self, admin_client, team_client):
        r = admin_client.put(f"{API}/quotes/{team_client.quote_id}/status", params={"status": "aprobada"})
        assert r.status_code == 200
        r2 = team_client.post(f"{API}/payments/checkout/session", json={
            "quote_id": team_client.quote_id,
            "origin_url": BASE_URL,
        })
        assert r2.status_code == 200, r2.text
        data = r2.json()
        assert data["url"].startswith("http")
        assert data["session_id"]
        team_client.quote_session_id = data["session_id"]


# ==================================================
# 6. /payments/checkout/status/{sid}
# ==================================================
class TestCheckoutStatus:
    def test_registration_status_includes_kind(self, team_client):
        sid = team_client.reg_session_id
        r = team_client.get(f"{API}/payments/checkout/status/{sid}")
        assert r.status_code == 200, r.text
        d = r.json()
        assert "status" in d and "payment_status" in d
        assert d["kind"] == "registration"

    def test_quote_status_kind(self, team_client):
        sid = team_client.quote_session_id
        r = team_client.get(f"{API}/payments/checkout/status/{sid}")
        assert r.status_code == 200
        d = r.json()
        assert d["kind"] == "quote"


# ==================================================
# 7. Posts CRUD + Instagram
# ==================================================
class TestPostsAndSocial:
    def test_list_posts_public(self):
        r = requests.get(f"{API}/posts")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_posts_crud_admin(self, admin_client):
        p = admin_client.post(f"{API}/posts", json={
            "title": "TEST_ITER7_POST",
            "content": "hello iter7",
            "category": "anuncio",
        })
        assert p.status_code == 200, p.text
        pid = p.json()["id"]

        r = admin_client.put(f"{API}/posts/{pid}", json={
            "title": "TEST_ITER7_POST_UPD",
            "content": "updated",
            "category": "anuncio",
        })
        assert r.status_code == 200
        assert r.json()["title"] == "TEST_ITER7_POST_UPD"

        d = admin_client.delete(f"{API}/posts/{pid}")
        assert d.status_code == 200

        g = requests.get(f"{API}/posts/{pid}")
        assert g.status_code == 404

    def test_social_instagram(self):
        r = requests.get(f"{API}/social/instagram")
        assert r.status_code == 200
        d = r.json()
        assert "handle" in d or "url" in d


# ==================================================
# 8. Bookings/Inventory endpoints REMOVED
# ==================================================
class TestRemovedEndpoints:
    def test_no_bookings(self):
        for path in ["/bookings", "/bookings/mine", "/inventory"]:
            r = requests.get(f"{API}{path}")
            assert r.status_code in (404, 405), f"{path} returned {r.status_code}"
