"""
Tests for the NEW features (iteration 2):
- /api/categories
- /api/auth/register-team (creates user role=team + team in single call)
- /api/auth/me returns team_id
- Team-manager scoped permissions on /teams and /players
- /api/upload (multipart) + /api/files/{path:path}
"""
import io
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://fixture-stats-pro.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@futuresoccercup.com"
ADMIN_PASSWORD = "FSCAdmin2025!"

EXPECTED_CATEGORIES = ["Sub-8", "Sub-10", "Sub-12", "Sub-14", "Sub-16", "Sub-18"]

# A 1x1 PNG (smallest valid)
PNG_BYTES = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xf8\xcf"
    b"\xc0\x00\x00\x00\x03\x00\x01\xa6\xc4\xae\xa0\x00\x00\x00\x00IEND\xaeB`\x82"
)


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(scope="module")
def team_session():
    """Register a brand-new team account."""
    s = requests.Session()
    email = f"test_team_{uuid.uuid4().hex[:8]}@test.com"
    payload = {
        "email": email,
        "password": "Team2025!",
        "manager_name": "TEST Manager",
        "team_name": f"TEST_TeamReg_{uuid.uuid4().hex[:5]}",
        "category": "Sub-12",
        "coach": "Coach X",
        "city": "CDMX",
        "color": "#22c55e",
    }
    r = s.post(f"{API}/auth/register-team", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["role"] == "team"
    assert "team_id" in data and data["team_id"]
    s.team_id = data["team_id"]  # type: ignore
    s.user_id = data["id"]  # type: ignore
    s.email = email  # type: ignore
    return s


@pytest.fixture(scope="module")
def other_team_session():
    """Second team account for cross-team permission tests."""
    s = requests.Session()
    email = f"test_team_{uuid.uuid4().hex[:8]}@test.com"
    r = s.post(f"{API}/auth/register-team", json={
        "email": email, "password": "Team2025!",
        "manager_name": "TEST Manager 2", "team_name": f"TEST_TeamReg2_{uuid.uuid4().hex[:5]}",
        "category": "Sub-14", "color": "#0ea5e9"
    })
    assert r.status_code == 200, r.text
    s.team_id = r.json()["team_id"]  # type: ignore
    return s


# -------------------- Categories --------------------
class TestCategories:
    def test_list_categories(self):
        """Iter41: endpoint público devuelve objetos {name, color?, sort_order?} en vez de strings."""
        r = requests.get(f"{API}/categories")
        assert r.status_code == 200
        data = r.json()
        names = [c["name"] if isinstance(c, dict) else c for c in data]
        assert names == EXPECTED_CATEGORIES


# -------------------- Register team --------------------
class TestRegisterTeam:
    def test_register_team_creates_user_and_team(self, team_session):
        # /auth/me must include team_id
        r = team_session.get(f"{API}/auth/me")
        assert r.status_code == 200
        me = r.json()
        assert me["role"] == "team"
        assert me["team_id"] == team_session.team_id  # type: ignore

        # team must exist in collection
        g = requests.get(f"{API}/teams/{team_session.team_id}")  # type: ignore
        assert g.status_code == 200
        assert g.json()["id"] == team_session.team_id  # type: ignore

    def test_register_team_invalid_category(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/register-team", json={
            "email": f"test_team_{uuid.uuid4().hex[:6]}@test.com",
            "password": "Team2025!", "manager_name": "X",
            "team_name": "TEST_Bad", "category": "Sub-99"
        })
        assert r.status_code == 400

    def test_register_team_duplicate_email(self, team_session):
        r = requests.post(f"{API}/auth/register-team", json={
            "email": team_session.email,  # type: ignore
            "password": "x123456", "manager_name": "X",
            "team_name": "TEST_Dup", "category": "Sub-12"
        })
        assert r.status_code == 400

    def test_admin_me_team_id_null(self, admin_session):
        r = admin_session.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json().get("team_id") in (None, "")


# -------------------- Team RBAC --------------------
class TestTeamPermissions:
    def test_team_manager_can_edit_own_team(self, team_session):
        r = team_session.put(f"{API}/teams/{team_session.team_id}", json={  # type: ignore
            "name": "TEST_TeamReg_Renamed", "category": "Sub-12",
            "coach": "New Coach", "city": "GDL", "color": "#22c55e"
        })
        assert r.status_code == 200
        assert r.json()["name"] == "TEST_TeamReg_Renamed"

    def test_team_manager_cannot_edit_other_team(self, team_session, other_team_session):
        r = team_session.put(f"{API}/teams/{other_team_session.team_id}", json={  # type: ignore
            "name": "Hack", "category": "Sub-14", "color": "#000"
        })
        assert r.status_code == 403

    def test_admin_create_team_invalid_category(self, admin_session):
        r = admin_session.post(f"{API}/teams", json={"name": "TEST_BadCat", "category": "U-99"})
        assert r.status_code == 400

    def test_admin_create_team_valid_category(self, admin_session):
        r = admin_session.post(f"{API}/teams", json={"name": f"TEST_OK_{uuid.uuid4().hex[:4]}", "category": "Sub-16"})
        assert r.status_code == 200


# -------------------- Player RBAC --------------------
class TestPlayerPermissions:
    def test_team_can_create_own_player(self, team_session):
        r = team_session.post(f"{API}/players", json={
            "name": "TEST Player T1", "team_id": team_session.team_id,  # type: ignore
            "jersey_number": 7, "position": "Delantero", "birth_date": "2014-01-01"
        })
        assert r.status_code == 200, r.text
        team_session.player_id = r.json()["id"]  # type: ignore

    def test_team_cannot_create_player_for_other_team(self, team_session, other_team_session):
        r = team_session.post(f"{API}/players", json={
            "name": "Hack", "team_id": other_team_session.team_id,  # type: ignore
            "jersey_number": 99, "position": "Defensa", "birth_date": "2014-01-01"
        })
        assert r.status_code == 403

    def test_team_can_update_own_player(self, team_session):
        pid = team_session.player_id  # type: ignore
        r = team_session.put(f"{API}/players/{pid}", json={
            "name": "TEST Player Updated", "team_id": team_session.team_id,  # type: ignore
            "jersey_number": 8, "position": "Delantero", "birth_date": "2014-01-01"
        })
        assert r.status_code == 200
        assert r.json()["jersey_number"] == 8

    def test_team_cannot_update_other_teams_player(self, admin_session, team_session, other_team_session):
        # admin creates a player on the other team
        cr = admin_session.post(f"{API}/players", json={
            "name": "TEST Other Player", "team_id": other_team_session.team_id,  # type: ignore
            "jersey_number": 11, "position": "Mediocampista", "birth_date": "2012-05-05"
        })
        assert cr.status_code == 200
        other_pid = cr.json()["id"]
        r = team_session.put(f"{API}/players/{other_pid}", json={
            "name": "Hack", "team_id": other_team_session.team_id,  # type: ignore
            "jersey_number": 11, "position": "Mediocampista", "birth_date": "2012-05-05"
        })
        assert r.status_code == 403
        # delete cleanup via admin
        admin_session.delete(f"{API}/players/{other_pid}")

    def test_team_can_delete_own_player(self, team_session):
        pid = team_session.player_id  # type: ignore
        r = team_session.delete(f"{API}/players/{pid}")
        assert r.status_code == 200
        # gone
        g = requests.get(f"{API}/players/{pid}")
        assert g.status_code == 404


# -------------------- Inventory still admin-only --------------------
class TestInventoryAdminOnly:
    def test_team_cannot_create_hotel(self, team_session):
        r = team_session.post(f"{API}/hotels", json={
            "name": "TEST_TeamHotel", "description": "x", "price_per_night": 1.0
        })
        assert r.status_code == 403

    def test_team_cannot_create_transport(self, team_session):
        r = team_session.post(f"{API}/transports", json={
            "name": "TEST_TeamTr", "description": "x", "type": "bus", "price": 1.0
        })
        assert r.status_code == 403

    def test_team_cannot_create_tour(self, team_session):
        r = team_session.post(f"{API}/tours", json={
            "name": "TEST_TeamTour", "description": "x", "duration": "1h", "price": 1.0
        })
        assert r.status_code == 403


# -------------------- Upload / File serve --------------------
class TestUpload:
    def test_upload_requires_auth(self):
        files = {"file": ("a.png", io.BytesIO(PNG_BYTES), "image/png")}
        r = requests.post(f"{API}/upload", files=files)
        assert r.status_code == 401

    def test_upload_rejects_non_image(self, admin_session):
        files = {"file": ("a.txt", io.BytesIO(b"hello"), "text/plain")}
        r = admin_session.post(f"{API}/upload", files=files)
        assert r.status_code == 400

    def test_upload_and_serve_image(self, admin_session):
        files = {"file": (f"t_{uuid.uuid4().hex[:6]}.png", io.BytesIO(PNG_BYTES), "image/png")}
        r = admin_session.post(f"{API}/upload", files=files)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "id" in data and "url" in data and "path" in data
        assert data["url"].startswith("/api/files/")
        # GET via public url (no auth)
        served = requests.get(f"{BASE_URL}{data['url']}")
        assert served.status_code == 200, served.text
        assert "image" in served.headers.get("content-type", "")
        assert served.content == PNG_BYTES


# -------------------- Cleanup --------------------
@pytest.fixture(scope="module", autouse=True)
def _cleanup_module(admin_session):
    yield
    try:
        teams = requests.get(f"{API}/teams").json()
        for t in teams:
            n = t.get("name", "")
            if n.startswith("TEST_"):
                admin_session.delete(f"{API}/teams/{t['id']}")
    except Exception as e:
        print("cleanup err", e)
