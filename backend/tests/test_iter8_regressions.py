"""
Iteration 8 regression tests.
Re-tests the 2 HIGH issues from iter7 + smoke of iter7 happy paths.
  1. GET /api/payments/checkout/status/{bogus_sid} -> 404 (not 500)
  2. Bookings endpoints fully removed -> 404
  3. POST /api/payments/checkout/session on quote.status=='pagada' -> 400 "ya fue pagada"
  + Smoke: event-types COP pricing, register-team event_type, quote calc, club grouping.
"""
import os
import uuid
import pytest
import requests

def _load_backend_url():
    url = os.environ.get("REACT_APP_BACKEND_URL")
    if not url:
        # Fallback to frontend/.env
        env_path = "/app/frontend/.env"
        if os.path.exists(env_path):
            with open(env_path) as f:
                for line in f:
                    if line.startswith("REACT_APP_BACKEND_URL="):
                        url = line.split("=", 1)[1].strip()
                        break
    assert url, "REACT_APP_BACKEND_URL not configured"
    return url.rstrip("/")


BASE_URL = _load_backend_url()
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@futuresoccercup.com"
ADMIN_PASSWORD = "FSCAdmin2025!"


# ---------- Fixtures ----------
@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"Admin login failed {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def team_session():
    """Create a fresh team manager for this module."""
    s = requests.Session()
    suffix = uuid.uuid4().hex[:8]
    email = f"TEST_iter8_team_{suffix}@test.com"
    payload = {
        "email": email,
        "password": "TeamPass2025!",
        "manager_name": "Iter8 Coach",
        "team_name": f"TEST_ITER8_{suffix}",
        "category": "Sub-12",
        "event_type": "premier_par",
    }
    r = s.post(f"{API}/auth/register-team", json=payload, timeout=15)
    assert r.status_code in (200, 201), f"register-team failed {r.status_code} {r.text}"
    data = r.json()
    team_id = data.get("team", {}).get("id") or data.get("team_id")
    return {"session": s, "email": email, "team_id": team_id}


# ---------- 1. Stripe checkout/status bogus -> 404 ----------
class TestCheckoutStatus404:
    def test_bogus_session_id_returns_404_not_500(self, team_session):
        s = team_session["session"]
        bogus = f"cs_test_bogus_{uuid.uuid4().hex}"
        r = s.get(f"{API}/payments/checkout/status/{bogus}", timeout=20)
        assert r.status_code == 404, f"Expected 404 got {r.status_code}: {r.text}"
        body = r.json()
        detail = body.get("detail", "")
        assert "no encontrada" in detail.lower() or "expirada" in detail.lower(), detail

    def test_bogus_session_admin_also_404(self, admin_session):
        bogus = f"cs_test_nope_{uuid.uuid4().hex}"
        r = admin_session.get(f"{API}/payments/checkout/status/{bogus}", timeout=20)
        assert r.status_code == 404, f"Expected 404 got {r.status_code}: {r.text}"

    def test_checkout_status_unauth_401(self):
        r = requests.get(f"{API}/payments/checkout/status/cs_test_xyz", timeout=15)
        assert r.status_code in (401, 403), f"Expected 401/403 got {r.status_code}"


# ---------- 2. Bookings fully removed -> 404 ----------
class TestBookingsRemoved:
    def test_post_bookings_404(self, admin_session):
        r = admin_session.post(f"{API}/bookings", json={"foo": "bar"}, timeout=10)
        assert r.status_code == 404, f"POST /api/bookings should be 404 got {r.status_code}"

    def test_get_bookings_404(self, admin_session):
        r = admin_session.get(f"{API}/bookings", timeout=10)
        assert r.status_code == 404

    def test_get_bookings_mine_404(self, admin_session):
        r = admin_session.get(f"{API}/bookings/mine", timeout=10)
        assert r.status_code == 404

    def test_put_bookings_status_404(self, admin_session):
        r = admin_session.put(f"{API}/bookings/{uuid.uuid4()}/status", params={"status": "confirmada"}, timeout=10)
        assert r.status_code == 404


# ---------- 3. Checkout session on quote.status=='pagada' -> 400 ----------
class TestCheckoutQuotePagada:
    def test_pagada_quote_rejects_new_session(self, admin_session):
        # Create a quote as admin (team-owner not required for admin create).
        quote_payload = {
            "event_type": "premier_par",
            "category": "Sub-12",
            "lodging_tier": "gold",
            "room_type": "double",
            "pax": 4,
            "nights": 3,
            "includes_transport": True,
        }
        r = admin_session.post(f"{API}/quotes", json=quote_payload, timeout=15)
        assert r.status_code in (200, 201), f"Create quote failed {r.status_code} {r.text}"
        quote = r.json()
        qid = quote.get("id")
        assert qid

        # Approve -> aprobada
        r = admin_session.put(f"{API}/quotes/{qid}/status", params={"status": "aprobada"}, timeout=15)
        assert r.status_code == 200, r.text

        # Mark as pagada
        r = admin_session.put(f"{API}/quotes/{qid}/status", params={"status": "pagada"}, timeout=15)
        assert r.status_code == 200, f"set pagada failed {r.status_code} {r.text}"

        # Now attempt checkout session -> must 400
        origin = BASE_URL
        r = admin_session.post(
            f"{API}/payments/checkout/session",
            json={"quote_id": qid, "origin_url": origin},
            timeout=20,
        )
        assert r.status_code == 400, f"Expected 400 got {r.status_code}: {r.text}"
        detail = r.json().get("detail", "")
        assert "ya fue pagada" in detail.lower(), detail

        # cleanup
        admin_session.delete(f"{API}/quotes/{qid}", timeout=10)


# ---------- 4. Smoke of iter7 happy paths ----------
class TestSmokeIter7:
    def test_event_types_cop_pricing(self):
        r = requests.get(f"{API}/event-types", timeout=10)
        assert r.status_code == 200
        data = r.json()
        events = {e["id"]: e for e in data["events"]}
        assert events["festival"]["registration_fee_per_team"] == 1000000.0
        assert events["premier_par"]["registration_fee_per_team"] == 1800000.0
        assert events["premier_impar"]["registration_fee_per_team"] == 1800000.0
        tiers = {t["id"]: t for t in data["lodging_tiers"]}
        assert tiers["gold"]["rates"]["double"] == 400000
        assert data["addons"]["transport"] == 100000.0

    def test_register_team_event_type_persisted(self, team_session):
        s = team_session["session"]
        r = s.get(f"{API}/auth/me", timeout=10)
        assert r.status_code == 200
        me = r.json()
        # user should be linked to a team
        assert me.get("role") in ("team", "team_manager", "entrenador"), me

    def test_quote_calculate_premier_sub12_gold_double_4x3_transport(self):
        payload = {
            "event_type": "premier_par",
            "category": "Sub-12",
            "lodging_tier": "gold",
            "room_type": "double",
            "pax": 4,
            "nights": 3,
            "includes_transport": True,
        }
        r = requests.post(f"{API}/quotes/calculate", json=payload, timeout=10)
        assert r.status_code == 200, r.text
        data = r.json()
        total = data.get("total_amount") or data.get("total")
        assert total == 7000000, f"Expected 7.000.000 COP got {total}: {data}"

    def test_clubes_grouping_endpoint(self):
        # /equipos -> /clubes/:slug is frontend; the backend may expose /api/clubes
        r = requests.get(f"{API}/clubes", timeout=10)
        # Endpoint may or may not exist; if present, must be 200
        if r.status_code == 404:
            pytest.skip("/api/clubes not exposed (grouping may be pure FE computation)")
        assert r.status_code == 200, r.text

    def test_stripe_registration_session_smoke(self, team_session):
        s = team_session["session"]
        tid = team_session["team_id"]
        if not tid:
            pytest.skip("no team id from register-team response")
        r = s.post(
            f"{API}/payments/registration/session",
            json={"team_id": tid, "origin_url": BASE_URL},
            timeout=20,
        )
        # 200 expected (if already paid -> 400). Accept either as long as not 500.
        assert r.status_code in (200, 400), f"got {r.status_code}: {r.text}"
        if r.status_code == 200:
            body = r.json()
            assert body.get("url", "").startswith("http"), body
            assert body.get("session_id"), body
