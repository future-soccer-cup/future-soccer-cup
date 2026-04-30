"""
Iteration 5 tests: Bulk Import (CSV/XLSX) for teams + players;
Simon Guzman admin promotion verification.
"""
import os
import io
import csv
import uuid
import pytest
import requests
from openpyxl import Workbook
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://fixture-stats-pro.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@futuresoccercup.com"
ADMIN_PASSWORD = "FSCAdmin2025!"


# -------------------- Fixtures --------------------
@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(scope="module")
def anon_session():
    return requests.Session()


def _csv_bytes(headers, rows):
    out = io.StringIO()
    w = csv.writer(out)
    w.writerow(headers)
    for r in rows:
        w.writerow(r)
    return out.getvalue().encode("utf-8")


def _xlsx_bytes(headers, rows):
    wb = Workbook()
    ws = wb.active
    ws.append(headers)
    for r in rows:
        ws.append(r)
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


TEAM_HEADERS = ["name", "category", "birth_year", "group_name", "coach", "city", "country",
                "president", "delegate_phone", "color"]
PLAYER_HEADERS = ["team_name", "name", "jersey_number", "position", "birth_date", "document_id",
                  "nickname", "gender", "eps", "guardian_name", "guardian_doc",
                  "guardian_relation", "guardian_phone"]


# -------------------- Simon Guzman admin promotion --------------------
class TestSimonGuzmanAdmin:
    def test_simon_guzman_user_exists_with_admin_role(self):
        mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
        db_name = os.environ.get("DB_NAME", "test_database")

        async def _check():
            client = AsyncIOMotorClient(mongo_url)
            db = client[db_name]
            user = await db.users.find_one({"email": "guzmangue@hotmail.com"})
            client.close()
            return user

        user = asyncio.get_event_loop().run_until_complete(_check())
        assert user is not None, "Simon Guzman user not found in db.users"
        assert user.get("role") == "admin", f"Expected role=admin, got {user.get('role')}"
        assert user.get("password_hash"), "password_hash missing"
        assert user["password_hash"].startswith("$2"), "password_hash is not a bcrypt hash"


# -------------------- Templates --------------------
class TestTemplates:
    def test_template_teams_csv(self, admin_session):
        r = admin_session.get(f"{API}/import/template/teams")
        assert r.status_code == 200
        assert "text/csv" in r.headers.get("content-type", "")
        text = r.content.decode("utf-8")
        reader = list(csv.reader(io.StringIO(text)))
        assert reader[0] == TEAM_HEADERS
        assert len(reader) >= 2  # header + at least 1 sample row
        assert reader[1][0]  # sample team name not empty

    def test_template_players_csv(self, admin_session):
        r = admin_session.get(f"{API}/import/template/players")
        assert r.status_code == 200
        assert "text/csv" in r.headers.get("content-type", "")
        text = r.content.decode("utf-8")
        reader = list(csv.reader(io.StringIO(text)))
        assert reader[0] == PLAYER_HEADERS
        assert len(reader) >= 2

    def test_template_invalid_kind(self, admin_session):
        r = admin_session.get(f"{API}/import/template/invalid")
        assert r.status_code == 400

    def test_template_requires_admin(self, anon_session):
        r = anon_session.get(f"{API}/import/template/teams")
        # should be 401 or 403 (not authenticated)
        assert r.status_code in (401, 403)


# -------------------- Import Teams --------------------
class TestImportTeams:
    def test_import_teams_preview_no_db_writes(self, admin_session):
        prefix = f"TEST_ITER5_PREV_{uuid.uuid4().hex[:5]}"
        rows = [
            [f"{prefix}_A", "Sub-12", "2014", "Grupo A", "C1", "Quito", "Ecuador", "P1", "+593", "#1d4ed8"],
            [f"{prefix}_B", "Sub-12", "2014", "Grupo B", "C2", "Cali", "Colombia", "P2", "+571", "#dc2626"],
            [f"{prefix}_C", "Sub-14", "2012", "Grupo A", "C3", "Bogota", "Colombia", "P3", "+577", "#10b981"],
        ]
        files = {"file": ("teams.csv", _csv_bytes(TEAM_HEADERS, rows), "text/csv")}
        r = admin_session.post(f"{API}/import/teams?preview=true", files=files)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["total_rows"] == 3
        assert data["ok"] == 3
        assert data["saved"] is False
        assert data["errors"] == []

        # verify nothing persisted
        teams = admin_session.get(f"{API}/teams").json()
        names = {t["name"] for t in teams}
        for row in rows:
            assert row[0] not in names

    def test_import_teams_persist(self, admin_session):
        prefix = f"TEST_ITER5_SAVE_{uuid.uuid4().hex[:5]}"
        rows = [
            [f"{prefix}_X", "Sub-12", "2014", "Grupo A", "C1", "Quito", "Ecuador", "P1", "+593", "#1d4ed8"],
            [f"{prefix}_Y", "Sub-14", "2012", "Grupo B", "C2", "Cali", "Colombia", "P2", "+571", "#dc2626"],
        ]
        files = {"file": ("teams.csv", _csv_bytes(TEAM_HEADERS, rows), "text/csv")}
        r = admin_session.post(f"{API}/import/teams?preview=false", files=files)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["total_rows"] == 2
        assert data["ok"] == 2
        assert data["saved"] is True

        teams = admin_session.get(f"{API}/teams").json()
        by_name = {t["name"]: t for t in teams}
        assert f"{prefix}_X" in by_name
        assert by_name[f"{prefix}_X"]["category"] == "Sub-12"
        assert by_name[f"{prefix}_X"]["birth_year"] == 2014
        # Verify status=aprobado by filtering admin list
        approved = admin_session.get(f"{API}/teams", params={"status": "aprobado"}).json()
        approved_names = {t["name"] for t in approved}
        assert f"{prefix}_X" in approved_names
        assert f"{prefix}_Y" in approved_names

    def test_import_teams_invalid_category_partial(self, admin_session):
        prefix = f"TEST_ITER5_PART_{uuid.uuid4().hex[:5]}"
        rows = [
            [f"{prefix}_OK1", "Sub-12", "2014", "G", "C", "Q", "EC", "P", "+1", "#fff"],
            [f"{prefix}_BAD", "XYZ-Invalid", "2012", "G", "C", "Q", "EC", "P", "+1", "#fff"],
            [f"{prefix}_OK2", "Sub-14", "2012", "G", "C", "Q", "EC", "P", "+1", "#fff"],
        ]
        files = {"file": ("teams.csv", _csv_bytes(TEAM_HEADERS, rows), "text/csv")}
        r = admin_session.post(f"{API}/import/teams?preview=false", files=files)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["total_rows"] == 3
        assert data["ok"] == 2
        assert len(data["errors"]) == 1
        # row 3 in spreadsheet (header=1, data starts at 2, so BAD is row 3)
        assert data["errors"][0]["row"] == 3
        assert "categor" in data["errors"][0]["error"].lower() or "invalid" in data["errors"][0]["error"].lower()

    def test_import_teams_xlsx(self, admin_session):
        prefix = f"TEST_ITER5_XLSX_{uuid.uuid4().hex[:5]}"
        rows = [
            [f"{prefix}_A", "Sub-12", 2014, "Grupo A", "C1", "Quito", "Ecuador", "P1", "+593", "#1d4ed8"],
        ]
        files = {"file": ("teams.xlsx", _xlsx_bytes(TEAM_HEADERS, rows),
                          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        r = admin_session.post(f"{API}/import/teams?preview=false", files=files)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["ok"] == 1
        assert data["saved"] is True

        teams = admin_session.get(f"{API}/teams").json()
        names = {t["name"] for t in teams}
        assert f"{prefix}_A" in names

    def test_import_teams_requires_admin(self, anon_session):
        rows = [["FOO", "Sub-12", "2014", "G", "C", "Q", "EC", "P", "+1", "#fff"]]
        files = {"file": ("teams.csv", _csv_bytes(TEAM_HEADERS, rows), "text/csv")}
        r = anon_session.post(f"{API}/import/teams", files=files)
        assert r.status_code in (401, 403)

    def test_import_teams_oversize(self, admin_session):
        # > 5MB
        big = b"x" * (5 * 1024 * 1024 + 100)
        files = {"file": ("teams.csv", big, "text/csv")}
        r = admin_session.post(f"{API}/import/teams", files=files)
        assert r.status_code == 400
        assert "5MB" in r.text or "tama" in r.text.lower() or "size" in r.text.lower()


# -------------------- Import Players --------------------
class TestImportPlayers:
    @pytest.fixture(scope="class")
    def seeded_team(self, admin_session):
        prefix = f"TEST_ITER5_PLR_{uuid.uuid4().hex[:5]}"
        team_name = f"{prefix}_TEAM"
        rows = [[team_name, "Sub-12", "2014", "Grupo A", "C", "Q", "EC", "P", "+1", "#fff"]]
        files = {"file": ("teams.csv", _csv_bytes(TEAM_HEADERS, rows), "text/csv")}
        r = admin_session.post(f"{API}/import/teams?preview=false", files=files)
        assert r.status_code == 200
        return team_name

    def test_import_players_persists_extended_fields(self, admin_session, seeded_team):
        team_name = seeded_team
        # Use mixed case to test case-insensitive lookup
        team_name_mixed = team_name.lower()
        rows = [
            [team_name_mixed, "Carlos Pérez", "10", "Delantero", "2014-03-15", "1750",
             "Pipo", "M", "Sanitas", "Maria P", "0701", "Madre", "+593"],
            [team_name, "Ana López", "7", "Mediocampista", "2014-05-20", "1751",
             "Anita", "F", "Sura", "Pedro L", "0702", "Padre", "+594"],
        ]
        files = {"file": ("players.csv", _csv_bytes(PLAYER_HEADERS, rows), "text/csv")}
        r = admin_session.post(f"{API}/import/players?preview=false", files=files)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["total_rows"] == 2
        assert data["ok"] == 2
        assert data["saved"] is True

        # Verify extended fields persist
        # find team_id
        teams = admin_session.get(f"{API}/teams").json()
        team_id = next(t["id"] for t in teams if t["name"] == team_name)
        players = admin_session.get(f"{API}/players?team_id={team_id}").json()
        by_name = {p["name"]: p for p in players}
        carlos = by_name.get("Carlos Pérez")
        assert carlos is not None
        assert carlos["nickname"] == "Pipo"
        assert carlos["gender"] == "M"
        assert carlos["eps"] == "Sanitas"
        assert carlos["guardian_name"] == "Maria P"
        assert carlos["guardian_doc"] == "0701"
        assert carlos["guardian_relation"] == "Madre"
        assert carlos["guardian_phone"] == "+593"
        # status field is stripped by PlayerOut response_model; verify via filter
        approved_players = admin_session.get(
            f"{API}/players", params={"team_id": team_id, "status": "aprobado"}
        ).json()
        assert any(p["name"] == "Carlos Pérez" for p in approved_players)

    def test_import_players_unknown_team_returns_error(self, admin_session):
        rows = [
            ["NoExisteTeamXYZ_ITER5", "Jugador X", "5", "Defensa", "2014-01-01", "999",
             "", "M", "", "", "", "", ""],
        ]
        files = {"file": ("players.csv", _csv_bytes(PLAYER_HEADERS, rows), "text/csv")}
        r = admin_session.post(f"{API}/import/players?preview=false", files=files)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["ok"] == 0
        assert len(data["errors"]) == 1
        assert "equipo" in data["errors"][0]["error"].lower() or "team" in data["errors"][0]["error"].lower()


# -------------------- Cleanup --------------------
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_data(admin_session):
    yield
    # Best-effort cleanup of TEST_ITER5_ teams + their players
    try:
        teams = admin_session.get(f"{API}/teams").json()
        for t in teams:
            if t["name"].startswith("TEST_ITER5_"):
                admin_session.delete(f"{API}/teams/{t['id']}")
    except Exception:
        pass
