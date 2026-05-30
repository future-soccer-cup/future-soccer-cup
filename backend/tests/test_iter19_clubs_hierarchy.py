"""Iter19 — Sub-tanda B (Clubes refactor): jerarquía, aprobaciones en cascada, CRUD jugadores."""
import os
import uuid
import requests
import pytest

def _read_env_url():
    v = os.environ.get("REACT_APP_BACKEND_URL")
    if v:
        return v.rstrip("/")
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip().rstrip("/")
    except Exception:
        pass
    raise RuntimeError("REACT_APP_BACKEND_URL not set")


BASE_URL = _read_env_url()
ADMIN_EMAIL = "admin@futuresoccercup.com"
ADMIN_PASSWORD = "FSCAdmin2025!"


def _login(email: str, password: str) -> requests.Session:
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def admin():
    return _login(ADMIN_EMAIL, ADMIN_PASSWORD)


@pytest.fixture(scope="module")
def anon():
    return requests.Session()


# ---------------- clubs-tree ----------------
class TestClubsTree:
    def test_anon_forbidden(self, anon):
        r = anon.get(f"{BASE_URL}/api/admin/clubs-tree")
        assert r.status_code in (401, 403), f"got {r.status_code}"

    def test_admin_clubs_tree_shape(self, admin):
        r = admin.get(f"{BASE_URL}/api/admin/clubs-tree")
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        sample = data[0]
        for k in ("id", "name", "status", "teams"):
            assert k in sample, f"missing key {k} in club"
        assert isinstance(sample["teams"], list)
        # find a club with at least one team to validate shape
        club_with_teams = next((c for c in data if c["teams"]), None)
        if club_with_teams:
            t = club_with_teams["teams"][0]
            for k in ("id", "name", "status", "event_type", "players"):
                assert k in t, f"missing key {k} in team"
            assert isinstance(t["players"], list)

    def test_america_fc_present_with_users(self, admin):
        r = admin.get(f"{BASE_URL}/api/admin/clubs-tree")
        assert r.status_code == 200
        tree = r.json()
        america = next((c for c in tree if "AMERICA" in (c.get("name", "") or "").upper()), None)
        assert america, "AMERICA FC club not found in tree"
        cid = america["id"]
        ru = admin.get(f"{BASE_URL}/api/admin/clubs/{cid}/users")
        assert ru.status_code == 200, ru.text
        users = ru.json()
        assert isinstance(users, list)
        assert len(users) >= 1, "AMERICA FC must have >=1 registered user"
        u = users[0]
        for k in ("id", "email", "role"):
            assert k in u

    def test_clubs_users_anon_forbidden(self, anon, admin):
        r = admin.get(f"{BASE_URL}/api/admin/clubs-tree")
        cid = r.json()[0]["id"]
        ru = anon.get(f"{BASE_URL}/api/admin/clubs/{cid}/users")
        assert ru.status_code in (401, 403)


# ---------------- Cascade block + approval flow ----------------
class TestCascadeBlock:
    """Create a temp DT user with a pending club, verify blocks, approve, verify success, cleanup."""

    @pytest.fixture(scope="class")
    def temp_ctx(self, admin):
        uniq = uuid.uuid4().hex[:8]
        coach_email = f"TEST_iter19_dt_{uniq}@test.com"
        coach_password = "TestDT2025!"
        payload = {
            "email": coach_email,
            "password": coach_password,
            "manager_name": f"TEST DT {uniq}",
            "manager_phone": "3000000000",
            "club_name": f"TEST_iter19 CLUB {uniq}",
            "club_city": "Bogota",
            "club_country": "Colombia",
            "event_type": "festival",
            "birth_year": 2014,
            "data_consent": True,
        }
        r = requests.post(f"{BASE_URL}/api/auth/register-team", json=payload)
        assert r.status_code in (200, 201), f"register-team: {r.status_code} {r.text}"
        body = r.json()
        # try to extract ids; otherwise look up
        coach_session = _login(coach_email, coach_password)
        me = coach_session.get(f"{BASE_URL}/api/auth/me").json()
        team_id = me.get("team_id")
        # get club via teams endpoint
        team_r = coach_session.get(f"{BASE_URL}/api/teams/{team_id}")
        assert team_r.status_code == 200, team_r.text
        team = team_r.json()
        club_id = team.get("club_id")
        assert club_id, f"team has no club_id: {team}"
        ctx = {
            "coach_session": coach_session,
            "team_id": team_id,
            "club_id": club_id,
            "user_id": me.get("id"),
            "email": coach_email,
        }
        yield ctx
        # Cleanup: delete team, delete club, delete user
        try:
            # delete all players first
            ps = admin.get(f"{BASE_URL}/api/players", params={"team_id": team_id}).json()
            for p in ps:
                admin.delete(f"{BASE_URL}/api/players/{p['id']}")
            admin.delete(f"{BASE_URL}/api/teams/{team_id}")
            admin.delete(f"{BASE_URL}/api/clubs/{club_id}")
            admin.delete(f"{BASE_URL}/api/admin/users/{me.get('id')}")
        except Exception:
            pass

    def test_quote_blocked_when_pending(self, temp_ctx):
        s = temp_ctx["coach_session"]
        # NOTE: QuoteIn Literal allows sapphire|diamond|gold|silver|bronze|domicilio
        # but admin catalog has been reseeded to paquete_1/paquete_2/paquete_premium.
        # Use 'domicilio' which is a no_lodging fallback covered by LODGING_TIERS constants.
        body = {
            "event_type": "festival",
            "pax": 10,
            "lodging_tier": "domicilio",
            "nights": 5,
            "days": 5,
        }
        r = s.post(f"{BASE_URL}/api/quotes", json=body)
        assert r.status_code == 403, f"expected 403, got {r.status_code} {r.text}"
        detail = (r.json().get("detail") or "").lower()
        assert "pendiente" in detail or "aprob" in detail, f"detail missing keywords: {detail}"

    def test_add_team_blocked_when_pending(self, temp_ctx):
        s = temp_ctx["coach_session"]
        cid = temp_ctx["club_id"]
        body = {"event_type": "festival", "birth_year": 2015, "designation": "Equipo A"}
        r = s.post(f"{BASE_URL}/api/clubs/{cid}/teams", json=body)
        assert r.status_code == 403, f"expected 403, got {r.status_code} {r.text}"

    def test_approve_club_then_quote_and_team_ok(self, admin, temp_ctx):
        cid = temp_ctx["club_id"]
        r = admin.put(f"{BASE_URL}/api/clubs/{cid}/status", params={"status": "aprobado"})
        assert r.status_code == 200, r.text
        # verify tree reflects status
        tree = admin.get(f"{BASE_URL}/api/admin/clubs-tree").json()
        club = next((c for c in tree if c["id"] == cid), None)
        assert club and club.get("status") == "aprobado"
        # now quote should pass guard. The actual lodging tier may not exist in catalog
        # (admin reseeded to paquete_*) so accept 200 OR 400 ("Evento o paquete inválido"),
        # but NEVER 403 anymore.
        s = temp_ctx["coach_session"]
        body = {
            "event_type": "festival",
            "pax": 10,
            "lodging_tier": "domicilio",
            "nights": 5,
            "days": 5,
        }
        rq = s.post(f"{BASE_URL}/api/quotes", json=body)
        assert rq.status_code != 403, f"guard should be lifted, got {rq.status_code} {rq.text}"
        # add team should now succeed (cascade unblock fully validated)
        rt = s.post(
            f"{BASE_URL}/api/clubs/{cid}/teams",
            json={"event_type": "festival", "birth_year": 2015, "designation": "Equipo A"},
        )
        assert rt.status_code in (200, 201), f"add team failed: {rt.status_code} {rt.text}"


# ---------------- Team approval + player CRUD ----------------
class TestTeamAndPlayers:
    @pytest.fixture(scope="class")
    def tctx(self, admin):
        # find a real team to operate on (preferably AMERICA FC)
        tree = admin.get(f"{BASE_URL}/api/admin/clubs-tree").json()
        target = None
        for c in tree:
            for t in c.get("teams", []):
                target = t
                break
            if target:
                break
        assert target, "No team found in clubs-tree to use for player CRUD"
        return {"team_id": target["id"], "orig_status": target.get("status")}

    def test_team_status_approve(self, admin, tctx):
        tid = tctx["team_id"]
        r = admin.put(f"{BASE_URL}/api/teams/{tid}/status", params={"status": "aprobado"})
        assert r.status_code == 200, r.text
        tree = admin.get(f"{BASE_URL}/api/admin/clubs-tree").json()
        found = None
        for c in tree:
            for t in c.get("teams", []):
                if t["id"] == tid:
                    found = t
                    break
        assert found and found.get("status") == "aprobado"
        # restore prev status if different
        if tctx["orig_status"] and tctx["orig_status"] != "aprobado":
            admin.put(f"{BASE_URL}/api/teams/{tid}/status", params={"status": tctx["orig_status"]})

    def test_player_create_update_delete(self, admin, tctx):
        tid = tctx["team_id"]
        # CREATE
        body = {
            "name": "TEST_iter19 Player",
            "team_id": tid,
            "jersey_number": 99,
            "position": "Delantero",
            "birth_date": "2014-05-10",
            "document_id": "TEST_iter19_doc",
        }
        rc = admin.post(f"{BASE_URL}/api/players", json=body)
        assert rc.status_code == 200, rc.text
        created = rc.json()
        assert created["name"] == body["name"]
        assert created["team_id"] == tid
        assert created["jersey_number"] == 99
        # status is stored but not in PlayerOut schema; verify via direct DB-backed list with admin
        pid = created["id"]
        list_r = admin.get(f"{BASE_URL}/api/players", params={"team_id": tid, "status": "aprobado"})
        assert list_r.status_code == 200
        assert any(p["id"] == pid for p in list_r.json()), "admin-created player must be auto-aprobado"
        # GET verify
        rg = admin.get(f"{BASE_URL}/api/players/{pid}")
        assert rg.status_code == 200
        assert rg.json()["name"] == body["name"]
        # UPDATE
        body2 = {**body, "name": "TEST_iter19 Player UPDATED", "jersey_number": 88}
        ru = admin.put(f"{BASE_URL}/api/players/{pid}", json=body2)
        assert ru.status_code == 200, ru.text
        assert ru.json()["name"] == "TEST_iter19 Player UPDATED"
        assert ru.json()["jersey_number"] == 88
        # verify persisted
        rgg = admin.get(f"{BASE_URL}/api/players/{pid}").json()
        assert rgg["name"] == "TEST_iter19 Player UPDATED"
        # DELETE
        rd = admin.delete(f"{BASE_URL}/api/players/{pid}")
        assert rd.status_code == 200
        rgone = admin.get(f"{BASE_URL}/api/players/{pid}")
        assert rgone.status_code == 404
