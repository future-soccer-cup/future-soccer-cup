"""
Future Soccer Cup backend tests
Covers: health, auth, teams, players, matches, stats, hotels/transports/tours, bookings
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://fixture-stats-pro.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@futuresoccercup.com"
ADMIN_PASSWORD = "FSCAdmin2025!"


# -------------------- Fixtures --------------------
@pytest.fixture(scope="session")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["role"] == "admin"
    assert data["email"] == ADMIN_EMAIL
    return s


@pytest.fixture(scope="session")
def family_session():
    s = requests.Session()
    email = f"test_family_{uuid.uuid4().hex[:8]}@test.com"
    r = s.post(f"{API}/auth/register", json={"email": email, "password": "Familia2025!", "name": "TEST Family"})
    assert r.status_code == 200, f"Register failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["role"] == "family"
    assert data["email"] == email.lower()
    s.family_email = email  # type: ignore
    return s


# -------------------- Health --------------------
class TestHealth:
    def test_root(self):
        r = requests.get(f"{API}/")
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert data["app"] == "Future Soccer Cup"


# -------------------- Auth --------------------
class TestAuth:
    def test_me_without_cookies_returns_401(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_admin_login_sets_cookies(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        cookies = s.cookies.get_dict()
        assert "access_token" in cookies
        assert "refresh_token" in cookies
        # httponly flag is in the raw header, not get_dict, check via cookies jar
        jar = [c for c in s.cookies if c.name == "access_token"]
        assert jar and jar[0].has_nonstandard_attr("HttpOnly"), "access_token should be HttpOnly"

    def test_me_with_cookies(self, admin_session):
        r = admin_session.get(f"{API}/auth/me")
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "admin"

    def test_invalid_login(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "WrongPwd123!"})
        assert r.status_code in (401, 429)

    def test_register_duplicate_fails(self, family_session):
        email = family_session.family_email  # type: ignore
        r = requests.post(f"{API}/auth/register", json={"email": email, "password": "x123456", "name": "dup"})
        assert r.status_code == 400

    def test_family_me(self, family_session):
        r = family_session.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["role"] == "family"


# -------------------- Teams & Players --------------------
class TestTeamsPlayers:
    team_id = None
    player_id = None

    def test_public_teams_list(self):
        r = requests.get(f"{API}/teams")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_non_admin_cannot_create_team(self, family_session):
        r = family_session.post(f"{API}/teams", json={"name": "X", "category": "Sub-10"})
        assert r.status_code == 403

    def test_admin_create_team(self, admin_session):
        r = admin_session.post(f"{API}/teams", json={
            "name": f"TEST_Team_{uuid.uuid4().hex[:6]}",
            "category": "Sub-12", "coach": "Coach", "city": "CDMX", "color": "#dc2626"
        })
        assert r.status_code == 200
        data = r.json()
        assert "id" in data
        assert data["category"] == "Sub-12"
        TestTeamsPlayers.team_id = data["id"]

        # verify persistence
        g = requests.get(f"{API}/teams/{data['id']}")
        assert g.status_code == 200
        assert g.json()["id"] == data["id"]

    def test_update_team(self, admin_session):
        assert TestTeamsPlayers.team_id
        r = admin_session.put(f"{API}/teams/{TestTeamsPlayers.team_id}", json={
            "name": "TEST_Team_Updated", "category": "Sub-12", "coach": "New", "city": "GDL", "color": "#1d4ed8"
        })
        assert r.status_code == 200
        assert r.json()["name"] == "TEST_Team_Updated"

    def test_admin_create_player(self, admin_session):
        assert TestTeamsPlayers.team_id
        r = admin_session.post(f"{API}/players", json={
            "name": "TEST Player", "team_id": TestTeamsPlayers.team_id,
            "jersey_number": 10, "position": "Delantero", "birth_date": "2013-05-01",
            "document_id": "DOC123"
        })
        assert r.status_code == 200, r.text
        data = r.json()
        TestTeamsPlayers.player_id = data["id"]
        assert data["jersey_number"] == 10

        g = requests.get(f"{API}/players/{data['id']}")
        assert g.status_code == 200

    def test_list_players_by_team(self):
        r = requests.get(f"{API}/players", params={"team_id": TestTeamsPlayers.team_id})
        assert r.status_code == 200
        assert any(p["id"] == TestTeamsPlayers.player_id for p in r.json())

    def test_create_player_invalid_team(self, admin_session):
        r = admin_session.post(f"{API}/players", json={
            "name": "Bad", "team_id": "does-not-exist",
            "jersey_number": 9, "position": "Delantero", "birth_date": "2013-01-01"
        })
        assert r.status_code == 400


# -------------------- Matches & Stats --------------------
class TestMatchesStats:
    team_a_id = None
    team_b_id = None
    player_a_id = None
    match_id = None

    @pytest.fixture(autouse=True)
    def _setup(self, admin_session):
        if TestMatchesStats.team_a_id:
            return
        # create two teams
        ra = admin_session.post(f"{API}/teams", json={"name": f"TEST_A_{uuid.uuid4().hex[:4]}", "category": "Sub-14"})
        rb = admin_session.post(f"{API}/teams", json={"name": f"TEST_B_{uuid.uuid4().hex[:4]}", "category": "Sub-14"})
        assert ra.status_code == 200 and rb.status_code == 200
        TestMatchesStats.team_a_id = ra.json()["id"]
        TestMatchesStats.team_b_id = rb.json()["id"]
        pa = admin_session.post(f"{API}/players", json={
            "name": "TEST Scorer", "team_id": TestMatchesStats.team_a_id,
            "jersey_number": 9, "position": "Delantero", "birth_date": "2011-01-01"
        })
        assert pa.status_code == 200
        TestMatchesStats.player_a_id = pa.json()["id"]

    def test_create_match(self, admin_session):
        r = admin_session.post(f"{API}/matches", json={
            "tournament_id": "t1",
            "home_team_id": TestMatchesStats.team_a_id,
            "away_team_id": TestMatchesStats.team_b_id,
            "match_date": "2026-02-01T15:00:00Z",
            "venue": "Estadio A", "stage": "grupos"
        })
        assert r.status_code == 200
        TestMatchesStats.match_id = r.json()["id"]

    def test_list_matches_enriched(self):
        r = requests.get(f"{API}/matches")
        assert r.status_code == 200
        m = next((x for x in r.json() if x["id"] == TestMatchesStats.match_id), None)
        assert m, "created match not found"
        assert "home_team_name" in m and "away_team_name" in m

    def test_update_result_and_standings(self, admin_session):
        r = admin_session.put(f"{API}/matches/{TestMatchesStats.match_id}/result", json={
            "home_score": 3, "away_score": 1,
            "scorers": [
                {"player_id": TestMatchesStats.player_a_id, "team_id": TestMatchesStats.team_a_id, "minute": 12},
                {"player_id": TestMatchesStats.player_a_id, "team_id": TestMatchesStats.team_a_id, "minute": 45},
                {"player_id": TestMatchesStats.player_a_id, "team_id": TestMatchesStats.team_a_id, "minute": 78},
            ]
        })
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "finalizado"
        assert data["home_score"] == 3

        # standings
        s = requests.get(f"{API}/stats/standings", params={"category": "Sub-14"})
        assert s.status_code == 200
        rows = s.json()
        home = next((x for x in rows if x["team_id"] == TestMatchesStats.team_a_id), None)
        away = next((x for x in rows if x["team_id"] == TestMatchesStats.team_b_id), None)
        assert home and away
        assert home["points"] == 3 and home["won"] == 1 and home["gf"] == 3 and home["ga"] == 1
        assert away["points"] == 0 and away["lost"] == 1

        # top scorers
        ts = requests.get(f"{API}/stats/top-scorers", params={"category": "Sub-14"})
        assert ts.status_code == 200
        top = ts.json()
        hit = next((x for x in top if x["player_id"] == TestMatchesStats.player_a_id), None)
        assert hit and hit["goals"] == 3


# -------------------- Inventory + Bookings --------------------
class TestInventoryBookings:
    hotel_id = None
    booking_id = None

    def test_seeded_hotels(self):
        r = requests.get(f"{API}/hotels")
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 2
        TestInventoryBookings.hotel_id = items[0]["id"]

    def test_seeded_transports_tours(self):
        rt = requests.get(f"{API}/transports")
        assert rt.status_code == 200 and len(rt.json()) >= 2
        rs = requests.get(f"{API}/tours")
        assert rs.status_code == 200 and len(rs.json()) >= 2

    def test_admin_hotel_crud(self, admin_session):
        r = admin_session.post(f"{API}/hotels", json={
            "name": "TEST_Hotel", "description": "t", "price_per_night": 50.0, "capacity": 2
        })
        assert r.status_code == 200
        hid = r.json()["id"]
        d = admin_session.delete(f"{API}/hotels/{hid}")
        assert d.status_code == 200

    def test_family_create_booking(self, family_session):
        assert TestInventoryBookings.hotel_id
        r = family_session.post(f"{API}/bookings", json={
            "type": "hotel", "item_id": TestInventoryBookings.hotel_id,
            "start_date": "2026-03-01", "end_date": "2026-03-05",
            "guests": 3, "notes": "TEST", "contact_phone": "555"
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["status"] == "pendiente"
        assert data["item_name"]
        TestInventoryBookings.booking_id = data["id"]

    def test_my_bookings(self, family_session):
        r = family_session.get(f"{API}/bookings/mine")
        assert r.status_code == 200
        assert any(b["id"] == TestInventoryBookings.booking_id for b in r.json())

    def test_family_cannot_list_all_bookings(self, family_session):
        r = family_session.get(f"{API}/bookings")
        assert r.status_code == 403

    def test_admin_list_and_update_booking(self, admin_session):
        r = admin_session.get(f"{API}/bookings")
        assert r.status_code == 200
        assert any(b["id"] == TestInventoryBookings.booking_id for b in r.json())
        up = admin_session.put(f"{API}/bookings/{TestInventoryBookings.booking_id}/status",
                               params={"status": "confirmada"})
        assert up.status_code == 200


# -------------------- Cleanup --------------------
@pytest.fixture(scope="session", autouse=True)
def _cleanup(admin_session):
    yield
    # Delete TEST-prefixed teams (cascades players)
    try:
        teams = requests.get(f"{API}/teams").json()
        for t in teams:
            if t["name"].startswith("TEST_"):
                admin_session.delete(f"{API}/teams/{t['id']}")
    except Exception as e:
        print("cleanup teams err", e)
