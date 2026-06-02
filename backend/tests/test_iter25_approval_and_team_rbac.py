"""
Iter25 — Validation tests:
  1) POST /api/payments target_type=quote
     - 400 when quote.status == 'pendiente' (non-admin)
     - 200 when quote.status == 'aprobada' or 'pagada' (non-admin)
     - admin can pay regardless of status
  2) POST /api/clubs/{cid}/teams
     - New flow (tournament_id + category_name + team_name)
     - Validation errors (missing name, invalid category, missing tournament)
     - Legacy flow (event_type + birth_year + designation) still works
  3) POST /api/players RBAC by club_id (Cuerpo Técnico with team_id=null)
  4) PUT /api/teams/{team_id} RBAC by club_id
  5) Regression: POST /api/quotes/calculate still working
"""
import os
import time
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@futuresoccercup.com"
ADMIN_PASSWORD = "FSCAdmin2025!"
COACH_EMAIL = "coach@test.com"
COACH_PASSWORD = "Coach2025!"
CT_EMAIL = "ct_smoke2_1780348474@test.com"
CT_PASSWORD = "abc123"

COACH_CLUB_ID = "e13098dc-99a5-42ca-ba0e-24035f959ff5"


def _login(email, password):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=15)
    assert r.status_code == 200, f"login failed for {email}: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def admin():
    return _login(ADMIN_EMAIL, ADMIN_PASSWORD)


@pytest.fixture(scope="module")
def coach():
    return _login(COACH_EMAIL, COACH_PASSWORD)


@pytest.fixture(scope="module")
def coach_me(coach):
    r = coach.get(f"{API}/auth/me", timeout=10)
    assert r.status_code == 200
    return r.json()


@pytest.fixture(scope="module")
def ct_session(admin):
    """CT user has a club assigned via DB. Just login; tests handle club differences."""
    try:
        s = _login(CT_EMAIL, CT_PASSWORD)
    except AssertionError:
        pytest.skip("CT user cannot login")
    return s


@pytest.fixture(scope="module")
def ct_me(ct_session):
    return ct_session.get(f"{API}/auth/me", timeout=10).json()


@pytest.fixture(scope="module")
def team_in_ct_club(admin, ct_me, tournament_with_categories):
    """Ensure there's at least one team in CT's club. Admin creates one if needed."""
    cid = ct_me.get("club_id")
    if not cid:
        pytest.skip("CT user has no club_id")
    teams = admin.get(f"{API}/clubs/{cid}/teams", timeout=10).json()
    if isinstance(teams, list) and teams:
        return teams[0]
    # create via admin POST /api/teams
    cat = tournament_with_categories["categories"][0]
    payload = {
        "name": f"TEST_iter25_ctclub_{uuid.uuid4().hex[:6]}",
        "club_id": cid,
        "club_name": "AuditClub",
        "event_type": tournament_with_categories.get("event_type", "festival"),
        "birth_year": (cat.get("birth_years") or [2014])[0],
        "category": cat["name"],
        "designation": "Único",
        "coach": "TEST",
        "city": "",
        "country": "",
        "logo_url": "",
        "color": "#1d4ed8",
        "tournament_id": tournament_with_categories["id"],
        "tournament_name": tournament_with_categories.get("name", ""),
        "registration_fee": float(cat.get("fee", 0)),
        "registration_payment_status": "pending",
        "cuerpo_tecnico": [],
    }
    r = admin.post(f"{API}/teams", json=payload, timeout=10)
    assert r.status_code in (200, 201), f"admin create team for CT club failed: {r.status_code} {r.text}"
    return r.json()


# ============================================================
# 1) PAYMENT vs QUOTE STATUS
# ============================================================

def _pick_lodging_tier(admin):
    items = admin.get(f"{API}/admin/catalog", timeout=10).json()
    if isinstance(items, list):
        for it in items:
            if it.get("type") == "lodging" and it.get("available", True) and not it.get("no_lodging"):
                return it["id"]
    return "paquete_1"


@pytest.fixture(scope="module")
def lodging_tier_id(admin):
    return _pick_lodging_tier(admin)


@pytest.fixture(scope="module")
def fresh_quote(coach, lodging_tier_id):
    """Create a fresh quote in 'pendiente' status for coach."""
    payload = {
        "categories": [{"event_type": "festival", "birth_year": 2014}],
        "lodging_tier": lodging_tier_id,
        "pax": 2,
        "nights": 5,
        "meals_count": 0,
        "transport_count": 0,
        "tours_count": 0,
    }
    r = coach.post(f"{API}/quotes/calculate", json=payload, timeout=15)
    assert r.status_code == 200, f"calc failed {r.text}"
    calc = r.json()
    create_payload = {**payload, "calc_total": calc.get("total", 0), "client_name": "TEST_iter25"}
    r = coach.post(f"{API}/quotes", json=create_payload, timeout=15)
    assert r.status_code in (200, 201), f"create quote failed {r.status_code} {r.text}"
    q = r.json()
    assert q.get("status") == "pendiente"
    return q


class TestPaymentVsQuoteStatus:
    def test_payment_blocked_when_quote_pendiente(self, coach, fresh_quote):
        r = coach.post(
            f"{API}/payments",
            json={"target_type": "quote", "target_id": fresh_quote["id"], "amount": 50000, "method": "transferencia"},
            timeout=15,
        )
        assert r.status_code == 400, f"expected 400, got {r.status_code} {r.text}"
        detail = (r.json().get("detail") or "").lower()
        assert "aprob" in detail, f"expected approval message, got: {detail}"

    def test_admin_can_pay_pending_quote(self, admin, fresh_quote):
        r = admin.post(
            f"{API}/payments",
            json={
                "target_type": "quote",
                "target_id": fresh_quote["id"],
                "amount": 10000,
                "method": "transferencia",
                "receipt_url": "https://example.com/receipt-admin.png",
            },
            timeout=15,
        )
        assert r.status_code in (200, 201), f"admin payment failed: {r.status_code} {r.text}"

    def test_payment_allowed_when_quote_aprobada(self, admin, coach, fresh_quote):
        # Admin approves quote (status via query param)
        r = admin.put(f"{API}/quotes/{fresh_quote['id']}/status", params={"status": "aprobada"}, timeout=10)
        assert r.status_code == 200, f"approve failed {r.status_code} {r.text}"
        # Coach now pays
        r = coach.post(
            f"{API}/payments",
            json={
                "target_type": "quote",
                "target_id": fresh_quote["id"],
                "amount": 50000,
                "method": "transferencia",
                "receipt_url": "https://example.com/receipt-coach.png",
            },
            timeout=15,
        )
        assert r.status_code in (200, 201), f"expected success after approval, got {r.status_code} {r.text}"


# ============================================================
# 2) TEAM CREATION (new flow + legacy)
# ============================================================

@pytest.fixture(scope="module")
def tournament_with_categories(admin):
    """Find any existing tournament with categories, else create one."""
    r = admin.get(f"{API}/tournaments", timeout=10)
    assert r.status_code == 200
    items = r.json()
    for t in items:
        if t.get("categories"):
            return t
    # Create one
    payload = {
        "name": f"TEST_iter25_tournament_{int(time.time())}",
        "event_type": "festival",
        "categories": [{"name": "Sub-12 TEST", "fee": 250000.0, "birth_years": [2014, 2015]}],
    }
    r = admin.post(f"{API}/tournaments", json=payload, timeout=10)
    assert r.status_code in (200, 201), f"create tournament failed {r.text}"
    return r.json()


class TestTeamCreationNewFlow:
    def test_create_team_with_tournament(self, coach, coach_me, tournament_with_categories):
        cid = coach_me.get("club_id") or COACH_CLUB_ID
        cat = tournament_with_categories["categories"][0]
        team_name = f"TEST_iter25_team_{uuid.uuid4().hex[:8]}"
        payload = {
            "tournament_id": tournament_with_categories["id"],
            "category_name": cat["name"],
            "team_name": team_name,
        }
        r = coach.post(f"{API}/clubs/{cid}/teams", json=payload, timeout=15)
        assert r.status_code in (200, 201), f"create failed {r.status_code} {r.text}"
        team = r.json()
        assert team["name"] == team_name
        assert team["tournament_id"] == tournament_with_categories["id"]
        assert team["tournament_name"] == tournament_with_categories.get("name", "")
        assert team["category"] == cat["name"]
        assert float(team["registration_fee"]) == float(cat.get("fee", 0))
        assert team["club_id"] == cid

    def test_team_name_required(self, coach, coach_me, tournament_with_categories):
        cid = coach_me.get("club_id") or COACH_CLUB_ID
        cat = tournament_with_categories["categories"][0]
        r = coach.post(
            f"{API}/clubs/{cid}/teams",
            json={"tournament_id": tournament_with_categories["id"], "category_name": cat["name"], "team_name": ""},
            timeout=10,
        )
        assert r.status_code == 400, f"expected 400, got {r.status_code} {r.text}"

    def test_invalid_category(self, coach, coach_me, tournament_with_categories):
        cid = coach_me.get("club_id") or COACH_CLUB_ID
        r = coach.post(
            f"{API}/clubs/{cid}/teams",
            json={
                "tournament_id": tournament_with_categories["id"],
                "category_name": "NoExisteCategoria_XYZ",
                "team_name": "TEST_x",
            },
            timeout=10,
        )
        assert r.status_code == 400, f"expected 400, got {r.status_code} {r.text}"

    def test_invalid_tournament_id(self, coach, coach_me):
        cid = coach_me.get("club_id") or COACH_CLUB_ID
        r = coach.post(
            f"{API}/clubs/{cid}/teams",
            json={"tournament_id": "non-existent-id-zzz", "category_name": "X", "team_name": "TEST_x"},
            timeout=10,
        )
        assert r.status_code == 404, f"expected 404, got {r.status_code} {r.text}"


class TestTeamCreationLegacyFlow:
    def test_legacy_event_type_birth_year(self, coach, coach_me):
        cid = coach_me.get("club_id") or COACH_CLUB_ID
        # try several event/year/designation combos. Either creation succeeds OR the
        # legacy duplicate-detection error is returned (both prove the legacy branch is reachable).
        last_resp = None
        for et, by, designation in [
            ("festival", 2014, "Equipo B"),
            ("festival", 2015, "Equipo B"),
            ("premier_par", 2014, "Único"),
            ("premier_impar", 2013, "Único"),
            ("festival", 2012, "Equipo B"),
        ]:
            r = coach.post(
                f"{API}/clubs/{cid}/teams",
                json={"event_type": et, "birth_year": by, "designation": designation},
                timeout=10,
            )
            last_resp = r
            if r.status_code in (200, 201):
                team = r.json()
                assert team.get("birth_year") == by
                assert team.get("event_type") == et
                return
            # If duplicate-detection error, legacy branch still works; continue trying others
            if r.status_code == 400 and "Ya tienes un equipo" in (r.text or ""):
                continue
            # Other errors -> fail immediately
            if r.status_code != 400:
                pytest.fail(f"legacy create unexpected status {r.status_code}: {r.text}")
        # All combos hit duplicate detection -> legacy branch is still reachable, regression OK
        assert last_resp.status_code == 400 and "Ya tienes un equipo" in last_resp.text, \
            f"legacy branch unreachable: {last_resp.status_code} {last_resp.text}"


# ============================================================
# 3) PLAYER RBAC by club_id (CT)
# ============================================================

class TestPlayerRBACByClub:
    def test_ct_can_create_player_in_club_team(self, ct_session, team_in_ct_club):
        team = team_in_ct_club
        payload = {
            "team_id": team["id"],
            "name": f"TEST_iter25_player_{uuid.uuid4().hex[:6]}",
            "birth_date": "2014-01-01",
            "document_id": f"TEST{uuid.uuid4().hex[:6]}",
            "position": "DEL",
            "jersey_number": 99,
        }
        r = ct_session.post(f"{API}/players", json=payload, timeout=15)
        assert r.status_code in (200, 201), f"CT could not create player in own-club team: {r.status_code} {r.text}"
        p = r.json()
        assert p["team_id"] == team["id"]

    def test_ct_cannot_create_player_in_other_club_team(self, ct_session, admin, ct_me):
        ct_club = ct_me.get("club_id")
        teams = admin.get(f"{API}/teams", timeout=10).json()
        other = next((t for t in teams if t.get("club_id") and t.get("club_id") != ct_club), None)
        if not other:
            pytest.skip("no team in other club for negative RBAC test")
        payload = {
            "team_id": other["id"],
            "name": "TEST_iter25_player_negative",
            "birth_date": "2014-01-01",
            "document_id": f"TESTNEG{uuid.uuid4().hex[:6]}",
            "position": "DEL",
            "jersey_number": 88,
        }
        r = ct_session.post(f"{API}/players", json=payload, timeout=15)
        assert r.status_code == 403, f"expected 403, got {r.status_code} {r.text}"


# ============================================================
# 4) PUT /api/teams/{team_id} by club_id
# ============================================================

class TestTeamUpdateByClub:
    def test_ct_can_update_team_in_own_club(self, ct_session, team_in_ct_club):
        team = team_in_ct_club
        # Build PUT payload from existing team data
        update = {
            "name": team.get("name", ""),
            "club_id": team.get("club_id", ""),
            "club_name": team.get("club_name", ""),
            "event_type": team.get("event_type", "festival"),
            "birth_year": team.get("birth_year") or 2014,
            "category": team.get("category", "Sub-12") or "Sub-12",
            "designation": team.get("designation", "Único"),
            "coach": "TEST_iter25_CT_updated",
            "city": team.get("city", ""),
            "country": team.get("country", ""),
            "logo_url": team.get("logo_url", ""),
            "color": team.get("color", "#1d4ed8"),
            "tournament_id": team.get("tournament_id", ""),
            "tournament_name": team.get("tournament_name", ""),
            "registration_fee": team.get("registration_fee", 0),
            "registration_payment_status": team.get("registration_payment_status", "pending"),
            "cuerpo_tecnico": team.get("cuerpo_tecnico", []),
        }
        r = ct_session.put(f"{API}/teams/{team['id']}", json=update, timeout=15)
        assert r.status_code == 200, f"CT update failed: {r.status_code} {r.text}"
        assert r.json().get("coach") == "TEST_iter25_CT_updated"


# ============================================================
# 5) REGRESSION: /quotes/calculate
# ============================================================

class TestQuotesCalculateRegression:
    def test_calculate_basic(self, coach, lodging_tier_id):
        payload = {
            "categories": [{"event_type": "festival", "birth_year": 2014}],
            "lodging_tier": lodging_tier_id,
            "pax": 2,
            "nights": 5,
            "meals_count": 0,
            "transport_count": 0,
            "tours_count": 0,
        }
        r = coach.post(f"{API}/quotes/calculate", json=payload, timeout=15)
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        data = r.json()
        # The new multi-events endpoint returns final_total / grand_total instead of total
        total_val = data.get("total") or data.get("total_amount") or data.get("final_total") or data.get("grand_total")
        assert total_val is not None and float(total_val) > 0, f"no total in response: {list(data.keys())}"
