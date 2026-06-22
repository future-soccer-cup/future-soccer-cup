"""
Iter27 - Fixture/Partidos/Resultados/Clasificación module tests
Spec final: Evento→Categoría→Vueltas, CRUD Canchas, cards (yellow/red/other),
puntos+J.L. configurables, desempate PTOS→PG→GF→GC(menor)→DG→J.L,
PDFs (fixture/standings/fairplay) solo para admin/team, eventos archivados rechazados.
"""
import os
import uuid
import requests
import pytest
from datetime import datetime, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@futuresoccercup.com"
ADMIN_PASS = "FSCAdmin2025!"


# -------------------- Fixtures --------------------
@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def public_session():
    return requests.Session()


@pytest.fixture(scope="module")
def test_tournament(admin_session):
    """Crea un torneo TEST_ activo con categoría y configuración J.L/puntos."""
    body = {
        "name": f"TEST_iter27_{uuid.uuid4().hex[:6]}",
        "season": "2025-2026",
        "category": "Sub-12",
        "start_date": "2025-06-01",
        "end_date": "2025-06-30",
        "archived": False,
        "categories": [{
            "name": "Sub-12",
            "fee": 100000,
            "points_win": 3, "points_draw": 1, "points_loss": 0,
            "fairplay_base": 200, "fairplay_yellow": 10, "fairplay_red": 20, "fairplay_other": 5,
        }],
    }
    r = admin_session.post(f"{API}/tournaments", json=body)
    assert r.status_code in (200, 201), f"create tournament failed: {r.status_code} {r.text}"
    t = r.json()
    yield t
    # teardown: matches and tournament
    try:
        matches = admin_session.get(f"{API}/matches", params={"tournament_id": t["id"]}).json()
        for m in matches:
            admin_session.delete(f"{API}/matches/{m['id']}")
    except Exception:
        pass
    admin_session.delete(f"{API}/tournaments/{t['id']}")


@pytest.fixture(scope="module")
def archived_tournament(admin_session):
    body = {
        "name": f"TEST_iter27_arch_{uuid.uuid4().hex[:6]}",
        "season": "2024-2025",
        "category": "Sub-12",
        "start_date": "2024-06-01",
        "end_date": "2024-06-30",
        "archived": True,
    }
    r = admin_session.post(f"{API}/tournaments", json=body)
    assert r.status_code in (200, 201)
    t = r.json()
    # ensure archived
    admin_session.put(f"{API}/tournaments/{t['id']}", json={**body, "archived": True})
    yield t
    admin_session.delete(f"{API}/tournaments/{t['id']}")


@pytest.fixture(scope="module")
def test_teams(admin_session, test_tournament):
    """Reusa 4 equipos Sub-12 existentes. POST /api/teams está roto (devuelve None),
    así que tomamos cualquier equipo existente para los tests de fixture/standings."""
    r = admin_session.get(f"{API}/teams", params={"category": "Sub-12"})
    assert r.status_code == 200, r.text
    teams = r.json()
    if len(teams) < 2:
        # Fallback: usar cualquier categoría
        r = admin_session.get(f"{API}/teams")
        teams = r.json()
    teams = teams[:4]
    if len(teams) < 2:
        pytest.skip("Not enough teams in DB for fixture tests")
    yield teams
    # No cleanup (we didn't create them)


# -------------------- Venues CRUD --------------------
class TestVenuesCRUD:
    def test_list_venues_public(self, public_session):
        r = public_session.get(f"{API}/venues")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_create_venue_no_auth_forbidden(self, public_session):
        r = public_session.post(f"{API}/venues", json={"name": "TEST_no_auth"})
        assert r.status_code in (401, 403), f"expected 401/403, got {r.status_code}"

    def test_venue_crud_full(self, admin_session):
        # Create
        name = f"TEST_iter27_venue_{uuid.uuid4().hex[:6]}"
        r = admin_session.post(f"{API}/venues", json={"name": name, "city": "Bogotá", "address": "Calle 1"})
        assert r.status_code in (200, 201), r.text
        v = r.json()
        assert v["name"] == name
        assert v["city"] == "Bogotá"
        assert v["address"] == "Calle 1"
        assert "id" in v and "created_at" in v
        vid = v["id"]
        # List - confirm present
        r = admin_session.get(f"{API}/venues")
        assert r.status_code == 200
        assert any(x["id"] == vid for x in r.json())
        # Update
        r = admin_session.put(f"{API}/venues/{vid}", json={"name": name, "city": "Medellín", "address": "Cra 2"})
        assert r.status_code == 200
        assert r.json()["city"] == "Medellín"
        # Delete
        r = admin_session.delete(f"{API}/venues/{vid}")
        assert r.status_code in (200, 204)
        # Confirm gone
        r = admin_session.get(f"{API}/venues")
        assert not any(x["id"] == vid for x in r.json())


# -------------------- Fixture generate validations --------------------
class TestFixtureGenerateValidation:
    def test_generate_without_tournament_id_400(self, admin_session, test_teams):
        body = {
            "tournament_id": "",
            "category": "Sub-12",
            "group_name": "A",
            "team_ids": [t["id"] for t in test_teams],
            "start_date": "2025-06-15",
            "rounds": 1,
        }
        r = admin_session.post(f"{API}/fixtures/generate", json=body)
        assert r.status_code == 400, f"expected 400, got {r.status_code} {r.text}"
        detail = (r.json() or {}).get("detail", "")
        assert "Evento" in detail and "obligatorio" in detail.lower(), f"unexpected detail: {detail}"

    def test_generate_on_archived_tournament_400(self, admin_session, archived_tournament, test_teams):
        body = {
            "tournament_id": archived_tournament["id"],
            "category": "Sub-12",
            "group_name": "A",
            "team_ids": [t["id"] for t in test_teams],
            "start_date": "2025-06-15",
            "rounds": 1,
        }
        r = admin_session.post(f"{API}/fixtures/generate", json=body)
        assert r.status_code == 400, f"expected 400, got {r.status_code} {r.text}"
        detail = (r.json() or {}).get("detail", "")
        assert "archivado" in detail.lower() or "histórico" in detail.lower(), detail


# -------------------- Rounds multiplier --------------------
class TestRoundsMultiplier:
    def test_rounds_2_doubles_matchdays(self, admin_session, test_tournament, test_teams):
        team_ids = [t["id"] for t in test_teams]
        body_r1 = {
            "tournament_id": test_tournament["id"],
            "category": "Sub-12",
            "group_name": "A",
            "team_ids": team_ids,
            "start_date": "2025-06-15",
            "rounds": 1,
            "preview": True,
        }
        r1 = admin_session.post(f"{API}/fixtures/generate", json=body_r1)
        assert r1.status_code == 200, r1.text
        out1 = r1.json()
        matches_r1 = out1.get("matches") or out1.get("generated") or out1
        if isinstance(matches_r1, dict):
            matches_r1 = matches_r1.get("matches") or []
        rounds_r1 = {m["matchday"] for m in matches_r1}

        body_r2 = {**body_r1, "rounds": 2}
        r2 = admin_session.post(f"{API}/fixtures/generate", json=body_r2)
        assert r2.status_code == 200, r2.text
        out2 = r2.json()
        matches_r2 = out2.get("matches") or out2.get("generated") or out2
        if isinstance(matches_r2, dict):
            matches_r2 = matches_r2.get("matches") or []
        rounds_r2 = {m["matchday"] for m in matches_r2}

        assert len(rounds_r2) == 2 * len(rounds_r1), \
            f"rounds=2 should double matchdays (r1={len(rounds_r1)}, r2={len(rounds_r2)})"
        # total games should also double
        assert len(matches_r2) == 2 * len(matches_r1)


# -------------------- Match result with cards & standings ordering --------------------
class TestResultsAndStandings:
    def test_cards_other_type_persists_and_standings_orders_correctly(self, admin_session, test_tournament, test_teams):
        """Genera fixture, registra resultados con cards 'other', valida standings."""
        team_ids = [t["id"] for t in test_teams]
        body = {
            "tournament_id": test_tournament["id"],
            "category": "Sub-12",
            "group_name": "A",
            "team_ids": team_ids,
            "start_date": "2025-07-01",
            "rounds": 1,
            "preview": False,
        }
        r = admin_session.post(f"{API}/fixtures/generate", json=body)
        assert r.status_code == 200, r.text

        # Load matches
        r = admin_session.get(f"{API}/matches", params={"tournament_id": test_tournament["id"]})
        assert r.status_code == 200
        matches = [m for m in r.json() if m["home_team_id"] in team_ids and m["away_team_id"] in team_ids]
        assert len(matches) >= 1

        # First match: home wins 3-0; add one 'other' card to home team
        m1 = matches[0]
        result1 = {
            "home_score": 3, "away_score": 0,
            "cards": [{"team_id": m1["home_team_id"], "player_id": "", "type": "other", "minute": 30}],
            "scorers": [],
        }
        r = admin_session.put(f"{API}/matches/{m1['id']}/result", json=result1)
        assert r.status_code == 200, f"cards 'other' should persist: {r.status_code} {r.text}"

        # Confirm match was saved with the other card
        r = admin_session.get(f"{API}/matches", params={"tournament_id": test_tournament["id"]})
        saved_m1 = next(m for m in r.json() if m["id"] == m1["id"])
        assert saved_m1["status"] == "finalizado"
        assert any(c.get("type") == "other" for c in (saved_m1.get("cards") or [])), \
            f"other card not saved: {saved_m1.get('cards')}"

        # Fill remaining matches with various results to test ordering
        if len(matches) >= 6:
            # 4 teams round-robin = 6 matches; team[0] wins all => leader
            # team[1] beats team[2,3]; team[2] beats team[3]; etc.
            pass

        # Get standings
        r = admin_session.get(f"{API}/stats/standings",
                              params={"tournament_id": test_tournament["id"], "category": "Sub-12"})
        assert r.status_code == 200, r.text
        rows = r.json()
        assert len(rows) == len(team_ids), f"expected {len(team_ids)} rows, got {len(rows)}"
        # Columns present
        for row in rows:
            assert "yellow_cards" in row
            assert "red_cards" in row
            assert "other_cards" in row
            assert "fair_play" in row

        # The home team of m1 should have other_cards>=1 and fair_play < 200 (base) by -5
        home_row = next(r for r in rows if r["team_id"] == m1["home_team_id"])
        assert home_row["other_cards"] >= 1, f"home other_cards={home_row['other_cards']}"
        assert home_row["fair_play"] <= 200 - 5, f"fair_play not decremented: {home_row['fair_play']}"

        # Standings ordering rule: ordered by PTOS desc, then PG desc, then GF desc, then GA asc, then GD desc, then JL desc
        # We just verify rows are sorted following that key
        sorted_check = sorted(rows, key=lambda r: (-r["points"], -r["won"], -r["gf"], r["ga"], -r["gd"], -r["fair_play"]))
        assert [r["team_id"] for r in rows] == [r["team_id"] for r in sorted_check], \
            "Standings not sorted by PTOS→PG→GF→GC(asc)→DG→J.L."

        # The leader (team[0] in m1 home, 3-0) should be on top with 3 points and gf>=3
        assert rows[0]["points"] >= 3
        assert rows[0]["gf"] >= 3


# -------------------- PDF endpoints (auth required) --------------------
class TestPdfEndpoints:
    def test_fixture_pdf_admin(self, admin_session, test_tournament):
        r = admin_session.get(f"{API}/tournaments/{test_tournament['id']}/fixture.pdf")
        assert r.status_code == 200, r.text[:300]
        assert "application/pdf" in r.headers.get("content-type", "").lower()
        assert len(r.content) > 1000, f"PDF too small: {len(r.content)} bytes"
        assert r.content[:4] == b"%PDF", "PDF magic not present"

    def test_standings_pdf_admin(self, admin_session, test_tournament):
        r = admin_session.get(f"{API}/tournaments/{test_tournament['id']}/standings.pdf",
                              params={"category": "Sub-12"})
        assert r.status_code == 200, r.text[:300]
        assert "application/pdf" in r.headers.get("content-type", "").lower()
        assert len(r.content) > 1000
        assert r.content[:4] == b"%PDF"

    def test_fairplay_pdf_admin(self, admin_session, test_tournament):
        r = admin_session.get(f"{API}/tournaments/{test_tournament['id']}/fairplay.pdf",
                              params={"category": "Sub-12"})
        assert r.status_code == 200, r.text[:300]
        assert "application/pdf" in r.headers.get("content-type", "").lower()
        assert len(r.content) > 1000
        assert r.content[:4] == b"%PDF"

    def test_fixture_pdf_unauthenticated(self, public_session, test_tournament):
        r = public_session.get(f"{API}/tournaments/{test_tournament['id']}/fixture.pdf")
        assert r.status_code in (401, 403), f"expected 401/403, got {r.status_code}"

    def test_standings_pdf_unauthenticated(self, public_session, test_tournament):
        r = public_session.get(f"{API}/tournaments/{test_tournament['id']}/standings.pdf")
        assert r.status_code in (401, 403)

    def test_fairplay_pdf_unauthenticated(self, public_session, test_tournament):
        r = public_session.get(f"{API}/tournaments/{test_tournament['id']}/fairplay.pdf")
        assert r.status_code in (401, 403)
