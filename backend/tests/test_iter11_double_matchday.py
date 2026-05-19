"""Tanda C — Fixture doble jornada + edición manual de partidos (PUT /api/matches/{mid}).

Cubre:
- POST /api/fixtures/generate con double_matchday=true (preview): F1/F2 mismo día, slots alternan.
- double_matchday=true con 1 solo slot (ambas jornadas mismo slot pero mismo día).
- double_matchday=false (default) — comportamiento previo (cada jornada en día distinto).
- PUT /api/matches/{mid} con MatchUpdateIn: actualiza match_date/venue/matchday/group_name/stage.
- PUT /api/matches/{mid} body vacío => 400.
- PUT /api/matches/{mid} match_date inválido => 400.
- PUT /api/matches/{mid} id inexistente => 404.
- PUT /api/matches/{mid} sin auth admin => 401/403.
- PUT /api/matches/{mid} home==away => 400.
- PUT /api/matches/{mid}/result sigue funcionando (regresión).
"""
import os
import uuid
import pytest
import requests
from datetime import datetime
from pathlib import Path

# Load REACT_APP_BACKEND_URL from frontend/.env (no default to fail fast)
def _load_base_url() -> str:
    env_path = Path("/app/frontend/.env")
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith("REACT_APP_BACKEND_URL="):
                return line.split("=", 1)[1].strip().rstrip("/")
    raise RuntimeError("REACT_APP_BACKEND_URL not found in /app/frontend/.env")

BASE_URL = _load_base_url()
ADMIN_EMAIL = "admin@futuresoccercup.com"
ADMIN_PASSWORD = "FSCAdmin2025!"


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def dt_session():
    """Crea DT temporal para probar 403/401."""
    s = requests.Session()
    email = f"TEST_iter11_dt_{uuid.uuid4().hex[:8]}@test.com"
    payload = {
        "email": email,
        "password": "TeamPass2025!",
        "name": "DT Iter11",
        "team_name": f"TEST_ITER11_{uuid.uuid4().hex[:6]}",
        "category": "Sub-12",
        "event_type": "festival",
        "data_consent": True,
    }
    r = s.post(f"{BASE_URL}/api/auth/register-team", json=payload, timeout=20)
    if r.status_code not in (200, 201):
        # try login fallback (already exists)
        s.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": "TeamPass2025!"}, timeout=20)
    return s


@pytest.fixture(scope="module")
def approved_teams(admin_session):
    """Crea (o reutiliza) 4 equipos aprobados Sub-12 para fixture testing."""
    # List existing
    r = admin_session.get(f"{BASE_URL}/api/teams?category=Sub-12", timeout=20)
    assert r.status_code == 200, r.text
    existing = [t for t in r.json() if t.get("status") == "aprobado"]
    teams = list(existing)
    needed = 4 - len(teams)
    created = []
    for i in range(max(0, needed)):
        new_team = {
            "name": f"TEST_ITER11_TEAM_{uuid.uuid4().hex[:6]}",
            "category": "Sub-12",
            "city": "Bogotá",
            "coach_name": "Test Coach",
            "status": "aprobado",
        }
        rc = admin_session.post(f"{BASE_URL}/api/teams", json=new_team, timeout=20)
        assert rc.status_code in (200, 201), rc.text
        body = rc.json()
        teams.append(body)
        created.append(body)
    return [t["id"] for t in teams[:4]]


# ============== POST /api/fixtures/generate — DOUBLE MATCHDAY ==============

class TestFixtureDoubleMatchday:

    def test_double_matchday_true_with_2_slots_4_teams(self, admin_session, approved_teams):
        """4 equipos => 3 jornadas. F1+F2 mismo día (day0), F3 día siguiente (day1).
        F1 usa slot[0]=10:00, F2 usa slot[1]=15:00, F3 usa slot[0]=10:00 (alternancia r%2)."""
        body = {
            "category": "Sub-12",
            "group_name": "TEST_GRUPO_ITER11_A",
            "team_ids": approved_teams[:4],
            "start_date": "2030-06-01",
            "days_between_rounds": 1,
            "venues": ["Cancha 1"],
            "time_slots": ["10:00", "15:00"],
            "double_matchday": True,
            "preview": True,
        }
        r = admin_session.post(f"{BASE_URL}/api/fixtures/generate", json=body, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["rounds"] == 3
        matches = data["matches"]
        # Agrupar por matchday
        by_md = {}
        for m in matches:
            by_md.setdefault(m["matchday"], []).append(m)
        assert set(by_md.keys()) == {1, 2, 3}

        def parse_dt(s):
            return datetime.fromisoformat(s)

        d1 = parse_dt(by_md[1][0]["match_date"])
        d2 = parse_dt(by_md[2][0]["match_date"])
        d3 = parse_dt(by_md[3][0]["match_date"])
        # F1 and F2 same date (day 0), F3 next day (day 1)
        assert d1.date() == d2.date(), f"F1 ({d1}) y F2 ({d2}) deben ser mismo día"
        assert d3.date() != d1.date(), f"F3 ({d3}) debe ser día distinto a F1"
        assert (d3.date() - d1.date()).days == 1, f"F3 debe ser día siguiente: {d1}->{d3}"
        # F1 usa slot 10:00, F2 usa slot 15:00, F3 usa slot 10:00
        assert d1.hour == 10 and d1.minute == 0
        assert d2.hour == 15 and d2.minute == 0
        assert d3.hour == 10 and d3.minute == 0

    def test_double_matchday_true_with_1_slot(self, admin_session, approved_teams):
        """1 slot => ambas jornadas mismo slot (10:00) pero mismo día."""
        body = {
            "category": "Sub-12",
            "group_name": "TEST_GRUPO_ITER11_B",
            "team_ids": approved_teams[:3],
            "start_date": "2030-07-01",
            "days_between_rounds": 1,
            "venues": ["Cancha 1"],
            "time_slots": ["10:00"],
            "double_matchday": True,
            "preview": True,
        }
        r = admin_session.post(f"{BASE_URL}/api/fixtures/generate", json=body, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        # 3 equipos => 3 jornadas
        assert data["rounds"] == 3
        matches = data["matches"]
        by_md = {}
        for m in matches:
            by_md.setdefault(m["matchday"], []).append(m)
        d1 = datetime.fromisoformat(by_md[1][0]["match_date"])
        d2 = datetime.fromisoformat(by_md[2][0]["match_date"])
        assert d1.date() == d2.date(), "F1 y F2 mismo día (doble jornada con 1 slot)"
        assert d1.hour == 10 and d2.hour == 10

    def test_double_matchday_false_default_behavior(self, admin_session, approved_teams):
        """double_matchday=False => cada jornada en día distinto (comportamiento previo)."""
        body = {
            "category": "Sub-12",
            "group_name": "TEST_GRUPO_ITER11_C",
            "team_ids": approved_teams[:4],
            "start_date": "2030-08-01",
            "days_between_rounds": 7,
            "venues": ["Cancha 1"],
            "time_slots": ["10:00", "15:00"],
            "double_matchday": False,
            "preview": True,
        }
        r = admin_session.post(f"{BASE_URL}/api/fixtures/generate", json=body, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["rounds"] == 3
        matches = data["matches"]
        by_md = {}
        for m in matches:
            by_md.setdefault(m["matchday"], []).append(m)
        d1 = datetime.fromisoformat(by_md[1][0]["match_date"])
        d2 = datetime.fromisoformat(by_md[2][0]["match_date"])
        d3 = datetime.fromisoformat(by_md[3][0]["match_date"])
        assert d1.date() != d2.date(), "Sin double_matchday, F1 y F2 deben ser días distintos"
        assert d2.date() != d3.date()
        # 7 días entre jornadas
        assert (d2.date() - d1.date()).days == 7


# ============== PUT /api/matches/{mid} — MANUAL EDIT ==============

@pytest.fixture(scope="module")
def saved_match(admin_session, approved_teams):
    """Genera un fixture real (preview=false) y retorna el primer match id."""
    body = {
        "category": "Sub-12",
        "group_name": "TEST_GRUPO_ITER11_SAVED",
        "team_ids": approved_teams[:3],
        "start_date": "2030-09-01",
        "days_between_rounds": 1,
        "venues": ["Cancha 1"],
        "time_slots": ["10:00"],
        "double_matchday": False,
        "preview": False,
    }
    r = admin_session.post(f"{BASE_URL}/api/fixtures/generate", json=body, timeout=30)
    assert r.status_code == 200, r.text
    matches = r.json()["matches"]
    assert len(matches) >= 1
    return matches[0]


class TestMatchManualEdit:

    def test_update_match_full_fields(self, admin_session, saved_match):
        mid = saved_match["id"]
        new_date = "2030-09-15T16:30:00"
        payload = {
            "match_date": new_date,
            "venue": "Cancha Reubicada",
            "matchday": 5,
            "group_name": "B_REUB",
            "stage": "grupos",
        }
        r = admin_session.put(f"{BASE_URL}/api/matches/{mid}", json=payload, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        # Verify response has the updated values
        assert data["id"] == mid
        assert data["venue"] == "Cancha Reubicada"
        assert data["matchday"] == 5
        assert data["group_name"] == "B_REUB"
        assert data["stage"] == "grupos"
        # match_date debe estar normalizada en iso
        dt = datetime.fromisoformat(data["match_date"])
        assert dt.year == 2030 and dt.month == 9 and dt.day == 15
        assert dt.hour == 16 and dt.minute == 30

        # GET to verify persistence
        r2 = admin_session.get(f"{BASE_URL}/api/matches?group=B_REUB", timeout=20)
        assert r2.status_code == 200
        found = [m for m in r2.json() if m["id"] == mid]
        assert len(found) == 1
        assert found[0]["matchday"] == 5
        assert found[0]["venue"] == "Cancha Reubicada"

    def test_update_match_empty_body_400(self, admin_session, saved_match):
        mid = saved_match["id"]
        r = admin_session.put(f"{BASE_URL}/api/matches/{mid}", json={}, timeout=20)
        assert r.status_code == 400
        detail = r.json().get("detail", "")
        assert "Nada" in detail or "nada" in detail.lower()

    def test_update_match_invalid_date_400(self, admin_session, saved_match):
        mid = saved_match["id"]
        r = admin_session.put(f"{BASE_URL}/api/matches/{mid}", json={"match_date": "no-es-fecha"}, timeout=20)
        assert r.status_code == 400
        detail = r.json().get("detail", "")
        assert "fecha" in detail.lower() or "formato" in detail.lower()

    def test_update_match_nonexistent_id_404(self, admin_session):
        fake_id = f"non-existent-{uuid.uuid4().hex}"
        r = admin_session.put(f"{BASE_URL}/api/matches/{fake_id}", json={"venue": "X"}, timeout=20)
        assert r.status_code == 404
        detail = r.json().get("detail", "")
        assert "no encontr" in detail.lower() or "not found" in detail.lower()

    def test_update_match_no_admin_auth_401_or_403(self, saved_match):
        """Sin auth (sin login) => 401/403."""
        s = requests.Session()
        mid = saved_match["id"]
        r = s.put(f"{BASE_URL}/api/matches/{mid}", json={"venue": "Hack"}, timeout=20)
        assert r.status_code in (401, 403), f"Esperaba 401/403 sin auth, got {r.status_code}"

    def test_update_match_dt_role_forbidden(self, dt_session, saved_match):
        """DT (rol team) => 401/403 al intentar PUT /matches/{id}."""
        mid = saved_match["id"]
        r = dt_session.put(f"{BASE_URL}/api/matches/{mid}", json={"venue": "DT_Hack"}, timeout=20)
        assert r.status_code in (401, 403), f"Esperaba 401/403 para DT, got {r.status_code}"

    def test_update_match_same_team_home_away_400(self, admin_session, saved_match, approved_teams):
        mid = saved_match["id"]
        same_id = approved_teams[0]
        r = admin_session.put(
            f"{BASE_URL}/api/matches/{mid}",
            json={"home_team_id": same_id, "away_team_id": same_id},
            timeout=20,
        )
        assert r.status_code == 400, r.text
        detail = r.json().get("detail", "")
        assert "distint" in detail.lower() or "different" in detail.lower()


# ============== PUT /api/matches/{mid}/result — REGRESSION ==============

class TestMatchResultRegression:

    def test_update_match_result_still_works(self, admin_session, approved_teams):
        # Generate fresh fixture so we don't collide
        body = {
            "category": "Sub-12",
            "group_name": "TEST_GRUPO_ITER11_RESULT",
            "team_ids": approved_teams[:2],
            "start_date": "2030-10-01",
            "days_between_rounds": 1,
            "venues": ["Cancha 1"],
            "time_slots": ["10:00"],
            "preview": False,
        }
        r = admin_session.post(f"{BASE_URL}/api/fixtures/generate", json=body, timeout=30)
        assert r.status_code == 200, r.text
        mid = r.json()["matches"][0]["id"]
        result = {"home_score": 3, "away_score": 1}
        rr = admin_session.put(f"{BASE_URL}/api/matches/{mid}/result", json=result, timeout=20)
        assert rr.status_code == 200, rr.text
        data = rr.json()
        assert data["home_score"] == 3
        assert data["away_score"] == 1
        assert data["status"] == "finalizado"
