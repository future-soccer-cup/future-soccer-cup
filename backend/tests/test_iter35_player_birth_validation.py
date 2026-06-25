"""Iteration 35 — Player birth_year vs team category validation.

Tests the multi-source extraction logic in _validate_player_birth_vs_team:
- Sub-X category derivation (TOURNAMENT_YEAR=2026 - X)
- explicit birth_year priority
- year embedded in team.name
- PUT endpoint applies same validation
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ADMIN_EMAIL = "admin@futuresoccercup.com"
ADMIN_PWD = "FSCAdmin2025!"


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PWD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def teams(admin_session):
    r = admin_session.get(f"{BASE_URL}/api/teams")
    assert r.status_code == 200
    return r.json()


@pytest.fixture(scope="module")
def created_player_ids():
    ids = []
    yield ids
    # Cleanup
    s = requests.Session()
    s.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PWD})
    for pid in ids:
        try:
            s.delete(f"{BASE_URL}/api/players/{pid}")
        except Exception:
            pass


def _find_team(teams, predicate):
    for t in teams:
        if predicate(t):
            return t
    return None


def _payload(team_id, birth_date, name_suffix=""):
    return {
        "team_id": team_id,
        "name": f"TEST_Player_{uuid.uuid4().hex[:6]}{name_suffix}",
        "jersey_number": int(uuid.uuid4().int % 900) + 99,
        "position": "Mediocampista",
        "birth_date": birth_date,
    }


class TestSubCategoryDerivation:
    """Verifies category 'Sub-X' (no birth_year, no year in name) derives 2026-X."""

    def test_sub12_2013_should_fail(self, admin_session, teams, created_player_ids):
        team = _find_team(teams, lambda t: (t.get("category") or "").strip() == "Sub-12" and not t.get("birth_year"))
        if not team:
            pytest.skip("No Sub-12 team without explicit birth_year found in DB")
        r = admin_session.post(f"{BASE_URL}/api/players", json=_payload(team["id"], "2013-05-15"))
        assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
        detail = (r.json().get("detail") or "").lower()
        assert "año permitido: 2014" in detail, f"Expected 'año permitido: 2014' in detail, got: {detail}"

    def test_sub12_2014_should_succeed(self, admin_session, teams, created_player_ids):
        team = _find_team(teams, lambda t: (t.get("category") or "").strip() == "Sub-12" and not t.get("birth_year"))
        if not team:
            pytest.skip("No Sub-12 team without explicit birth_year found in DB")
        r = admin_session.post(f"{BASE_URL}/api/players", json=_payload(team["id"], "2014-05-15"))
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        pid = r.json().get("id")
        assert pid
        created_player_ids.append(pid)
        # Verify persistence
        g = admin_session.get(f"{BASE_URL}/api/players/{pid}")
        assert g.status_code == 200
        assert g.json()["birth_date"] == "2014-05-15"

    def test_sub8_2017_should_fail(self, admin_session, teams):
        team = _find_team(teams, lambda t: (t.get("category") or "").strip() == "Sub-8" and not t.get("birth_year"))
        if not team:
            pytest.skip("No Sub-8 team without explicit birth_year found in DB")
        r = admin_session.post(f"{BASE_URL}/api/players", json=_payload(team["id"], "2017-05-15"))
        assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
        detail = (r.json().get("detail") or "").lower()
        assert "año permitido: 2018" in detail, f"Expected 'año permitido: 2018' in detail, got: {detail}"


class TestExplicitBirthYearPriority:
    """birth_year column (when explicitly set on team) must take priority over Sub-X derivation."""

    def test_explicit_birth_year_strict(self, admin_session, teams):
        team = _find_team(teams, lambda t: t.get("birth_year") == 2014)
        if not team:
            pytest.skip("No team with explicit birth_year=2014 found")
        r = admin_session.post(f"{BASE_URL}/api/players", json=_payload(team["id"], "2013-01-01"))
        assert r.status_code == 400, f"Expected 400 for 2013 vs birth_year=2014, got {r.status_code}: {r.text}"
        detail = (r.json().get("detail") or "").lower()
        assert "2014" in detail


class TestPutValidation:
    """PUT /api/players/{id} should apply the same validation."""

    def test_put_with_invalid_year_fails(self, admin_session, teams, created_player_ids):
        # Create a valid player first
        team = _find_team(teams, lambda t: (t.get("category") or "").strip() == "Sub-12" and not t.get("birth_year"))
        if not team:
            pytest.skip("No Sub-12 team without explicit birth_year found")
        r = admin_session.post(f"{BASE_URL}/api/players", json=_payload(team["id"], "2014-06-01", "_put"))
        assert r.status_code == 200, r.text
        pid = r.json()["id"]
        created_player_ids.append(pid)

        # Try to update birth_date to an invalid (older) year
        bad = _payload(team["id"], "2012-06-01", "_put")
        bad["name"] = r.json()["name"]
        u = admin_session.put(f"{BASE_URL}/api/players/{pid}", json=bad)
        assert u.status_code == 400, f"Expected 400, got {u.status_code}: {u.text}"
        detail = (u.json().get("detail") or "").lower()
        assert "año permitido: 2014" in detail
