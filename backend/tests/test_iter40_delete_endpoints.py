"""Iter40 - Backend tests for the 4 admin DELETE endpoints with cascade & 401.

Covers:
- DELETE /api/clubs/{cid}   (cascade teams + players, 404 second call, 401 unauth)
- DELETE /api/quotes/{qid}  (delete quote, 404 second call, 401 unauth)
- DELETE /api/admin/payments/{pid} (delete payment, 404 second call, 401 unauth)
- DELETE /api/fixtures/{fid} smoke (admin auth still required - 401 unauth)
"""
import os
import uuid
import requests
import pytest

def _read_base_url():
    v = os.environ.get("REACT_APP_BACKEND_URL", "")
    if not v:
        try:
            with open("/app/frontend/.env") as f:
                for line in f:
                    if line.startswith("REACT_APP_BACKEND_URL="):
                        v = line.split("=", 1)[1].strip()
                        break
        except Exception:
            pass
    return v.rstrip("/")

BASE_URL = _read_base_url()
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@futuresoccercup.com"
ADMIN_PASS = "FSCAdmin2025!"


# --- Fixtures -----------------------------------------------------------------
@pytest.fixture(scope="module")
def admin():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture()
def fresh_club(admin):
    """Create a club + team + player (cascade target) and return their ids."""
    sfx = uuid.uuid4().hex[:6]
    # club
    rc = admin.post(f"{API}/clubs", json={
        "name": f"TEST_ClubDel_{sfx}",
        "city": "Bogotá",
        "country": "CO",
    })
    assert rc.status_code == 200, f"create club: {rc.status_code} {rc.text}"
    cid = rc.json()["id"]
    # team
    rt = admin.post(f"{API}/teams", json={
        "name": f"TEST_TeamDel_{sfx}",
        "club_id": cid,
        "category": "Sub-12",
        "event_type": "festival",
    })
    assert rt.status_code == 200, f"create team: {rt.status_code} {rt.text}"
    tid = rt.json()["id"]
    # player
    rp = admin.post(f"{API}/players", json={
        "name": f"TEST_Player_{sfx}",
        "team_id": tid,
        "jersey_number": 10,
        "position": "Delantero",
        "birth_date": "2014-05-10",
        "document_id": f"DOC{sfx}",
    })
    assert rp.status_code in (200, 201), f"create player: {rp.status_code} {rp.text}"
    return {"club_id": cid, "team_id": tid, "player_id": rp.json().get("id")}


def _create_quote(admin):
    """Admin creates a small quote (admin role bypasses team/club checks)."""
    payload = {
        "event_type": "festival",
        "birth_year": 2012,
        "lodging_tier": "gold",
        "room_type": "double",
        "pax": 4,
        "nights": 3,
        "days": 4,
        "include_registration": True,
    }
    r = admin.post(f"{API}/quotes", json=payload)
    assert r.status_code == 200, f"create quote: {r.status_code} {r.text}"
    q = r.json()
    assert q.get("total_amount", 0) > 0
    return q


# --- DELETE /api/clubs/{cid} --------------------------------------------------
class TestDeleteClub:
    def test_delete_club_cascade_admin(self, admin, fresh_club):
        cid = fresh_club["club_id"]
        r = admin.delete(f"{API}/clubs/{cid}")
        assert r.status_code == 200, f"delete club: {r.status_code} {r.text}"
        data = r.json()
        assert data["ok"] is True
        assert data["teams_deleted"] >= 1, data
        assert data["players_deleted"] >= 1, data
        # second call 404
        r2 = admin.delete(f"{API}/clubs/{cid}")
        assert r2.status_code == 404

    def test_delete_club_unauth_401(self):
        s = requests.Session()
        r = s.delete(f"{API}/clubs/{uuid.uuid4()}")
        assert r.status_code in (401, 403), f"expected 401/403 got {r.status_code} {r.text}"


# --- DELETE /api/quotes/{qid} -------------------------------------------------
class TestDeleteQuote:
    def test_delete_quote_admin(self, admin):
        q = _create_quote(admin)
        qid = q["id"]
        r = admin.delete(f"{API}/quotes/{qid}")
        assert r.status_code == 200, f"delete quote: {r.status_code} {r.text}"
        assert r.json()["ok"] is True
        # second
        r2 = admin.delete(f"{API}/quotes/{qid}")
        assert r2.status_code == 404

    def test_delete_quote_unauth_401(self):
        s = requests.Session()
        r = s.delete(f"{API}/quotes/{uuid.uuid4()}")
        assert r.status_code in (401, 403)


# --- DELETE /api/admin/payments/{pid} -----------------------------------------
class TestDeletePayment:
    def test_delete_payment_admin(self, admin):
        q = _create_quote(admin)
        qid = q["id"]
        amount = min(50000.0, float(q["total_amount"]))
        # admin can submit payment (bypasses approval gate)
        rp = admin.post(f"{API}/payments", json={
            "target_type": "quote",
            "target_id": qid,
            "amount": amount,
            "currency": (q.get("currency") or "COP").upper(),
            "method": "efectivo",
            "reference": "TEST_iter40",
            "receipt_url": "https://example.com/test_receipt.pdf",
        })
        assert rp.status_code == 200, f"create payment: {rp.status_code} {rp.text}"
        pid = rp.json()["id"]
        # delete
        r = admin.delete(f"{API}/admin/payments/{pid}")
        assert r.status_code == 200, f"delete payment: {r.status_code} {r.text}"
        assert r.json()["ok"] is True
        # second
        r2 = admin.delete(f"{API}/admin/payments/{pid}")
        assert r2.status_code == 404
        # cleanup quote
        admin.delete(f"{API}/quotes/{qid}")

    def test_delete_payment_unauth_401(self):
        s = requests.Session()
        r = s.delete(f"{API}/admin/payments/{uuid.uuid4()}")
        assert r.status_code in (401, 403)


# --- DELETE /api/fixtures/{fid} smoke -----------------------------------------
class TestDeleteFixtureAuth:
    def test_delete_fixture_unauth_401(self):
        s = requests.Session()
        r = s.delete(f"{API}/fixtures/{uuid.uuid4()}")
        assert r.status_code in (401, 403)

    def test_delete_fixture_admin_404_for_unknown(self, admin):
        # smoke: endpoint reachable as admin; unknown id should be 404
        r = admin.delete(f"{API}/fixtures/{uuid.uuid4()}")
        assert r.status_code in (200, 404), f"got {r.status_code} {r.text}"
