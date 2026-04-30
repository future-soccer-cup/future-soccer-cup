"""
Iteration 4 tests: approval workflows, extended player/team data, match cards,
discipline stats.
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://fixture-stats-pro.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@futuresoccercup.com"
ADMIN_PASSWORD = "FSCAdmin2025!"


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(scope="module")
def team_session():
    s = requests.Session()
    email = f"test_iter4_{uuid.uuid4().hex[:8]}@test.com"
    r = s.post(f"{API}/auth/register-team", json={
        "email": email, "password": "Team2025!",
        "manager_name": "TEST Mgr Iter4",
        "team_name": f"TEST_ITER4_{uuid.uuid4().hex[:5]}",
        "category": "Sub-12",
    })
    assert r.status_code == 200, r.text
    s.team_id = r.json()["team_id"]
    s.email = email
    return s


# -------------------- Team approval --------------------
class TestTeamApproval:
    def test_register_team_status_pendiente(self, team_session):
        # Admin sees the team as pendiente
        admin = requests.Session()
        admin.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        r = admin.get(f"{API}/teams", params={"status": "pendiente"})
        assert r.status_code == 200
        assert any(t["id"] == team_session.team_id for t in r.json())

    def test_admin_created_team_status_aprobado(self, admin_session):
        r = admin_session.post(f"{API}/teams", json={
            "name": f"TEST_APR_{uuid.uuid4().hex[:5]}", "category": "Sub-10"
        })
        assert r.status_code == 200
        tid = r.json()["id"]
        # Should appear in public list (no auth)
        public = requests.get(f"{API}/teams").json()
        assert any(t["id"] == tid for t in public)
        # And in admin filter status=aprobado
        ar = admin_session.get(f"{API}/teams", params={"status": "aprobado"})
        assert any(t["id"] == tid for t in ar.json())

    def test_public_list_excludes_pendiente(self, team_session):
        public = requests.get(f"{API}/teams").json()
        assert all(t["id"] != team_session.team_id for t in public), \
            "pendiente team should NOT appear in public list"

    def test_admin_filter_status_pendiente(self, admin_session, team_session):
        r = admin_session.get(f"{API}/teams", params={"status": "pendiente"})
        assert r.status_code == 200
        ids = {t["id"] for t in r.json()}
        assert team_session.team_id in ids

    def test_set_team_status_aprobado(self, admin_session, team_session):
        r = admin_session.put(f"{API}/teams/{team_session.team_id}/status",
                              params={"status": "aprobado"})
        assert r.status_code == 200
        # Now appears in public list
        public = requests.get(f"{API}/teams").json()
        assert any(t["id"] == team_session.team_id for t in public)

    def test_set_team_status_rechazado(self, admin_session):
        # Create another team via register-team and reject it
        s = requests.Session()
        email = f"test_rej_{uuid.uuid4().hex[:8]}@test.com"
        r = s.post(f"{API}/auth/register-team", json={
            "email": email, "password": "Team2025!",
            "manager_name": "Rej Mgr",
            "team_name": f"TEST_REJ_{uuid.uuid4().hex[:5]}",
            "category": "Sub-12",
        })
        assert r.status_code == 200
        tid = r.json()["team_id"]
        rj = admin_session.put(f"{API}/teams/{tid}/status", params={"status": "rechazado"})
        assert rj.status_code == 200
        # Not in public
        public = requests.get(f"{API}/teams").json()
        assert all(t["id"] != tid for t in public)
        # Admin can see with filter
        ar = admin_session.get(f"{API}/teams", params={"status": "rechazado"})
        assert any(t["id"] == tid for t in ar.json())

    def test_set_team_status_invalid(self, admin_session, team_session):
        r = admin_session.put(f"{API}/teams/{team_session.team_id}/status",
                              params={"status": "invalid"})
        assert r.status_code == 400


# -------------------- Player approval --------------------
class TestPlayerApproval:
    @pytest.fixture(scope="class")
    def approved_team(self, admin_session):
        r = admin_session.post(f"{API}/teams", json={
            "name": f"TEST_PAPR_{uuid.uuid4().hex[:5]}", "category": "Sub-12"
        })
        return r.json()["id"]

    def test_team_added_player_status_pendiente(self, admin_session, team_session):
        # First approve team_session's team so it can act
        admin_session.put(f"{API}/teams/{team_session.team_id}/status",
                          params={"status": "aprobado"})
        r = team_session.post(f"{API}/players", json={
            "name": "TEST Pending Player",
            "team_id": team_session.team_id,
            "jersey_number": 22, "position": "Delantero",
            "birth_date": "2014-01-01",
            "nickname": "Pendi", "gender": "M", "eps": "Sura",
            "guardian_name": "Mom", "guardian_doc": "G123",
            "guardian_relation": "Madre", "guardian_phone": "555-1234"
        })
        assert r.status_code == 200, r.text
        data = r.json()
        # Extended fields persisted
        assert data["nickname"] == "Pendi"
        assert data["gender"] == "M"
        assert data["eps"] == "Sura"
        assert data["guardian_name"] == "Mom"
        assert data["guardian_doc"] == "G123"
        assert data["guardian_relation"] == "Madre"
        assert data["guardian_phone"] == "555-1234"
        team_session.pending_player_id = data["id"]

        # Public list does NOT show this player
        pub = requests.get(f"{API}/players", params={"team_id": team_session.team_id}).json()
        assert all(p["id"] != data["id"] for p in pub), "pendiente player leaked to public"

        # Team manager CAN see their own pending player
        own = team_session.get(f"{API}/players", params={"team_id": team_session.team_id}).json()
        assert any(p["id"] == data["id"] for p in own)

    def test_admin_added_player_status_aprobado(self, admin_session, approved_team):
        r = admin_session.post(f"{API}/players", json={
            "name": "TEST Admin Player",
            "team_id": approved_team,
            "jersey_number": 9, "position": "Delantero",
            "birth_date": "2014-01-01"
        })
        assert r.status_code == 200
        pid = r.json()["id"]
        pub = requests.get(f"{API}/players", params={"team_id": approved_team}).json()
        assert any(p["id"] == pid for p in pub)

    def test_admin_filter_pending_players(self, admin_session, team_session):
        r = admin_session.get(f"{API}/players", params={"status": "pendiente"})
        assert r.status_code == 200
        assert any(p["id"] == team_session.pending_player_id for p in r.json())

    def test_set_player_status_aprobado(self, admin_session, team_session):
        pid = team_session.pending_player_id
        r = admin_session.put(f"{API}/players/{pid}/status", params={"status": "aprobado"})
        assert r.status_code == 200
        pub = requests.get(f"{API}/players", params={"team_id": team_session.team_id}).json()
        assert any(p["id"] == pid for p in pub)

    def test_non_admin_cannot_change_player_status(self, team_session):
        pid = team_session.pending_player_id
        r = team_session.put(f"{API}/players/{pid}/status", params={"status": "rechazado"})
        assert r.status_code == 403

    def test_invalid_player_status(self, admin_session, team_session):
        pid = team_session.pending_player_id
        r = admin_session.put(f"{API}/players/{pid}/status", params={"status": "bogus"})
        assert r.status_code == 400


# -------------------- Extended team fields --------------------
class TestTeamExtendedFields:
    def test_team_extended_fields_persisted(self, admin_session):
        r = admin_session.post(f"{API}/teams", json={
            "name": f"TEST_EXT_{uuid.uuid4().hex[:5]}",
            "category": "Sub-14",
            "country": "Colombia",
            "president": "Juan P",
            "delegate_phone": "555-9000",
            "cuerpo_tecnico": [
                {"name": "DT1", "document": "D1", "role": "Director Técnico"},
                {"name": "PF1", "document": "D2", "role": "Preparador Físico"},
            ]
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["country"] == "Colombia"
        assert data["president"] == "Juan P"
        assert data["delegate_phone"] == "555-9000"
        assert len(data["cuerpo_tecnico"]) == 2
        # Persistence
        g = requests.get(f"{API}/teams/{data['id']}").json()
        assert g["country"] == "Colombia"
        assert len(g["cuerpo_tecnico"]) == 2


# -------------------- Match cards + discipline --------------------
class TestMatchCardsAndDiscipline:
    @pytest.fixture(scope="class")
    def setup(self, admin_session):
        # Two approved teams + 2 players on team A
        ta = admin_session.post(f"{API}/teams", json={
            "name": f"TEST_DISC_A_{uuid.uuid4().hex[:4]}", "category": "Sub-18"
        }).json()
        tb = admin_session.post(f"{API}/teams", json={
            "name": f"TEST_DISC_B_{uuid.uuid4().hex[:4]}", "category": "Sub-18"
        }).json()
        p1 = admin_session.post(f"{API}/players", json={
            "name": "TEST Disc P1", "team_id": ta["id"],
            "jersey_number": 5, "position": "Defensa", "birth_date": "2008-01-01"
        }).json()
        p2 = admin_session.post(f"{API}/players", json={
            "name": "TEST Disc P2", "team_id": ta["id"],
            "jersey_number": 6, "position": "Defensa", "birth_date": "2008-01-01"
        }).json()
        m = admin_session.post(f"{API}/matches", json={
            "tournament_id": "tdisc",
            "home_team_id": ta["id"], "away_team_id": tb["id"],
            "match_date": "2026-02-15T15:00:00Z",
            "venue": "V", "stage": "grupos"
        }).json()
        return {"ta": ta, "tb": tb, "p1": p1, "p2": p2, "m": m}

    def test_result_with_cards_persisted(self, admin_session, setup):
        cards = [
            {"player_id": setup["p1"]["id"], "team_id": setup["ta"]["id"], "type": "yellow", "minute": 22},
            {"player_id": setup["p1"]["id"], "team_id": setup["ta"]["id"], "type": "yellow", "minute": 60},
            {"player_id": setup["p2"]["id"], "team_id": setup["ta"]["id"], "type": "red", "minute": 75},
        ]
        r = admin_session.put(f"{API}/matches/{setup['m']['id']}/result", json={
            "home_score": 1, "away_score": 0, "scorers": [], "cards": cards
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert "cards" in data
        assert len(data["cards"]) == 3
        types = sorted([c["type"] for c in data["cards"]])
        assert types == ["red", "yellow", "yellow"]

    def test_discipline_stats(self, setup):
        r = requests.get(f"{API}/stats/discipline", params={"category": "Sub-18"})
        assert r.status_code == 200
        rows = r.json()
        p1 = next((x for x in rows if x["player_id"] == setup["p1"]["id"]), None)
        p2 = next((x for x in rows if x["player_id"] == setup["p2"]["id"]), None)
        assert p1 is not None, f"p1 missing in discipline: {rows}"
        assert p2 is not None
        assert p1["yellow_cards"] == 2
        assert p1["red_cards"] == 0
        assert p2["yellow_cards"] == 0
        assert p2["red_cards"] == 1
        # Sort: red first
        assert rows[0]["red_cards"] >= rows[-1]["red_cards"]


# -------------------- Cleanup --------------------
@pytest.fixture(scope="module", autouse=True)
def _cleanup(admin_session):
    yield
    try:
        # Need to fetch ALL statuses to cleanup
        for st in ("pendiente", "aprobado", "rechazado"):
            teams = admin_session.get(f"{API}/teams", params={"status": st}).json()
            for t in teams:
                n = t.get("name", "")
                if n.startswith("TEST_") or n.startswith("TEST_ITER4") or n.startswith("TEST_DISC") \
                        or n.startswith("TEST_APR") or n.startswith("TEST_REJ") \
                        or n.startswith("TEST_PAPR") or n.startswith("TEST_EXT"):
                    admin_session.delete(f"{API}/teams/{t['id']}")
    except Exception as e:
        print("cleanup err", e)
