"""Iter41 - Backend tests for DESCANSA (BYE) matches in fixture generation.

Validates:
- POST /api/fixtures/generate with matrix_matches involving BYE positions
  produces matches enriched with home_team_name/away_team_name == "DESCANSA",
  is_bye=true, status="descansa", venue="", and match_date time == 00:00:00.
- Non-BYE matches keep venue + non-zero time slot.
- GET /api/fixtures/{id}/matches returns the same BYE labels.
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


@pytest.fixture(scope="module")
def admin():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def scenario(admin):
    """Create tournament + 5 teams for the BYE fixture test."""
    sfx = uuid.uuid4().hex[:6]
    # Tournament
    rt = admin.post(f"{API}/tournaments", json={
        "name": f"TEST_ByeTour_{sfx}",
        "season": "2025",
        "category": "Sub-12",
        "categories": [{"name": "Sub-12", "fee": 250000}],
        "start_date": "2025-08-01",
        "end_date": "2025-12-31",
        "event_type": "festival",
    })
    assert rt.status_code == 200, f"create tournament: {rt.status_code} {rt.text}"
    tour_id = rt.json()["id"]

    # Create 5 clubs+teams (odd -> triggers BYE)
    team_ids = []
    club_ids = []
    for i in range(5):
        rc = admin.post(f"{API}/clubs", json={
            "name": f"TEST_ClubBye_{sfx}_{i}",
            "city": "Bogotá",
            "country": "CO",
        })
        assert rc.status_code == 200, f"create club[{i}]: {rc.status_code} {rc.text}"
        club_ids.append(rc.json()["id"])
        rte = admin.post(f"{API}/teams", json={
            "name": f"TEST_TeamBye_{sfx}_{i}",
            "club_id": club_ids[-1],
            "category": "Sub-12",
            "event_type": "festival",
        })
        assert rte.status_code == 200, f"create team[{i}]: {rte.status_code} {rte.text}"
        team_ids.append(rte.json()["id"])

    yield {"tournament_id": tour_id, "team_ids": team_ids, "club_ids": club_ids, "sfx": sfx}

    # Teardown: delete clubs (cascade removes teams). Fixtures deleted by test itself.
    for cid in club_ids:
        admin.delete(f"{API}/clubs/{cid}")
    admin.delete(f"{API}/tournaments/{tour_id}")


class TestByeFixture:
    def test_generate_fixture_with_bye_matches(self, admin, scenario):
        """5 teams matrix round1: (1v6), (2v5), (3v4). Position 6 -> BYE for team 1."""
        team_ids = scenario["team_ids"]
        matrix = [
            {"matchday": 1, "home_pos": 1, "away_pos": 6},  # BYE for team1
            {"matchday": 1, "home_pos": 2, "away_pos": 5},
            {"matchday": 1, "home_pos": 3, "away_pos": 4},
        ]
        payload = {
            "tournament_id": scenario["tournament_id"],
            "category": "Sub-12",
            "group_name": "A",
            "team_ids": team_ids,
            "start_date": "2025-08-10",
            "matchdays_per_day": 1,
            "venues": ["Cancha 1", "Cancha 2"],
            "time_slots": ["09:00", "11:00"],
            "matrix_matches": matrix,
            "preview": False,
        }
        r = admin.post(f"{API}/fixtures/generate", json=payload)
        assert r.status_code == 200, f"generate: {r.status_code} {r.text}"
        data = r.json()
        fid = data.get("id") or data.get("fixture_id")
        matches = data.get("matches") or []
        assert len(matches) == 3, f"expected 3 matches, got {len(matches)}: {matches}"

        bye = [m for m in matches if m.get("is_bye")]
        normal = [m for m in matches if not m.get("is_bye")]
        assert len(bye) == 1, f"expected 1 BYE match, got {len(bye)}"
        assert len(normal) == 2, f"expected 2 normal matches, got {len(normal)}"

        b = bye[0]
        # BYE assertions
        assert b["status"] == "descansa", b
        assert b.get("venue", "") in ("", None), f"BYE venue should be empty: {b}"
        assert (
            b["home_team_name"] == "DESCANSA" or b["away_team_name"] == "DESCANSA"
        ), f"BYE match missing DESCANSA label: {b}"
        # time must be 00:00 (isoformat ...T00:00:00)
        assert "T00:00:00" in b["match_date"], f"BYE match_date has non-zero time: {b['match_date']}"

        # Normal matches must have venue and non-zero time (09:00 or 11:00)
        for m in normal:
            assert m["home_team_name"] != "DESCANSA" and m["away_team_name"] != "DESCANSA"
            assert m.get("venue"), f"normal match should have venue: {m}"
            assert ("T09:00:00" in m["match_date"]) or ("T11:00:00" in m["match_date"]), m

        # GET fixture matches should reflect same labels
        if fid:
            rg = admin.get(f"{API}/fixtures/{fid}/matches")
            assert rg.status_code == 200, rg.text
            gj = rg.json()
            gm = gj.get("matches", gj) if isinstance(gj, dict) else gj
            gbye = [m for m in gm if m.get("is_bye")]
            assert len(gbye) == 1
            assert (gbye[0]["home_team_name"] == "DESCANSA" or gbye[0]["away_team_name"] == "DESCANSA")
            # Cleanup
            admin.delete(f"{API}/fixtures/{fid}")

    def test_matches_endpoint_returns_descansa_labels(self, admin, scenario):
        """GET /api/matches?tournament_id=X should also label BYE matches with DESCANSA."""
        team_ids = scenario["team_ids"]
        matrix = [
            {"matchday": 1, "home_pos": 6, "away_pos": 2},  # team2 vs BYE (away/home order variant)
            {"matchday": 1, "home_pos": 1, "away_pos": 3},
        ]
        payload = {
            "tournament_id": scenario["tournament_id"],
            "category": "Sub-12",
            "group_name": "B",
            "team_ids": team_ids,
            "start_date": "2025-09-01",
            "matchdays_per_day": 1,
            "venues": ["Cancha X"],
            "time_slots": ["10:00"],
            "matrix_matches": matrix,
            "preview": False,
        }
        r = admin.post(f"{API}/fixtures/generate", json=payload)
        assert r.status_code == 200, r.text
        fid = r.json().get("id")

        rm = admin.get(f"{API}/matches", params={"tournament_id": scenario["tournament_id"]})
        assert rm.status_code == 200, rm.text
        all_m = rm.json()
        # There should be at least 1 BYE labeled match with group_name == "B"
        bye_b = [m for m in all_m if m.get("group_name") == "B" and m.get("is_bye")]
        assert len(bye_b) >= 1, f"no BYE match in /matches for group B: {all_m}"
        b = bye_b[0]
        assert b["home_team_name"] == "DESCANSA" or b["away_team_name"] == "DESCANSA"
        assert b.get("venue", "") in ("", None)

        # Cleanup fixture
        if fid:
            admin.delete(f"{API}/fixtures/{fid}")
