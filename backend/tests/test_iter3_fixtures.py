"""
Iteration 3 tests:
- Team birth_year + group_name accepted
- Standings include fair_play (J.L) sorted by pts->gd->gf->fair_play
- Standings supports group_name filter
- Match result accepts home_fair_play / away_fair_play
- /api/fixtures/generate (preview & save) for even/odd team counts
- Validation: invalid category, <2 teams
- Round distributes time_slots and venues round-robin
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


def _create_team(admin, name, category="Sub-12", birth_year=None, group_name=None):
    payload = {"name": name, "category": category, "color": "#dc2626"}
    if birth_year is not None:
        payload["birth_year"] = birth_year
    if group_name is not None:
        payload["group_name"] = group_name
    r = admin.post(f"{API}/teams", json=payload)
    assert r.status_code == 200, r.text
    return r.json()


# -------------------- Team model birth_year + group_name --------------------
class TestTeamFields:
    def test_create_team_with_birth_year_and_group(self, admin_session):
        t = _create_team(admin_session, f"TEST_BY_{uuid.uuid4().hex[:5]}", "Sub-10", 2014, "Grupo A")
        assert t["birth_year"] == 2014
        assert t["group_name"] == "Grupo A"
        # persistence
        g = requests.get(f"{API}/teams/{t['id']}").json()
        assert g["birth_year"] == 2014
        assert g["group_name"] == "Grupo A"


# -------------------- Standings fair_play + group filter + tiebreakers --------------------
class TestStandingsFairPlay:
    @pytest.fixture(scope="class")
    def setup_matches(self, admin_session):
        # Two teams in Grupo A, two in Grupo B (Sub-16 to keep isolated)
        cat = "Sub-16"
        a1 = _create_team(admin_session, f"TEST_FP_A1_{uuid.uuid4().hex[:4]}", cat, 2009, "Grupo A")
        a2 = _create_team(admin_session, f"TEST_FP_A2_{uuid.uuid4().hex[:4]}", cat, 2009, "Grupo A")
        b1 = _create_team(admin_session, f"TEST_FP_B1_{uuid.uuid4().hex[:4]}", cat, 2009, "Grupo B")
        b2 = _create_team(admin_session, f"TEST_FP_B2_{uuid.uuid4().hex[:4]}", cat, 2009, "Grupo B")
        # Match in Grupo A: a1 1-1 a2, fair play 5 vs 2
        m = admin_session.post(f"{API}/matches", json={
            "tournament_id": "tfp", "home_team_id": a1["id"], "away_team_id": a2["id"],
            "match_date": "2026-02-10T15:00:00Z", "venue": "V", "stage": "grupos",
            "group_name": "Grupo A", "matchday": 1
        }).json()
        r = admin_session.put(f"{API}/matches/{m['id']}/result", json={
            "home_score": 1, "away_score": 1,
            "home_fair_play": 5, "away_fair_play": 2
        })
        assert r.status_code == 200, r.text
        # Match in Grupo B: b1 2-0 b2
        m2 = admin_session.post(f"{API}/matches", json={
            "tournament_id": "tfp", "home_team_id": b1["id"], "away_team_id": b2["id"],
            "match_date": "2026-02-10T15:00:00Z", "venue": "V", "stage": "grupos",
            "group_name": "Grupo B", "matchday": 1
        }).json()
        admin_session.put(f"{API}/matches/{m2['id']}/result", json={
            "home_score": 2, "away_score": 0, "home_fair_play": 3, "away_fair_play": 1
        })
        return {"cat": cat, "a1": a1["id"], "a2": a2["id"], "b1": b1["id"], "b2": b2["id"]}

    def test_standings_includes_fair_play(self, setup_matches):
        r = requests.get(f"{API}/stats/standings", params={"category": setup_matches["cat"]})
        assert r.status_code == 200
        rows = r.json()
        a1 = next((x for x in rows if x["team_id"] == setup_matches["a1"]), None)
        a2 = next((x for x in rows if x["team_id"] == setup_matches["a2"]), None)
        assert a1 and a2
        assert "fair_play" in a1
        assert a1["fair_play"] == 5
        assert a2["fair_play"] == 2

    def test_standings_group_filter(self, setup_matches):
        r = requests.get(f"{API}/stats/standings",
                         params={"category": setup_matches["cat"], "group_name": "Grupo A"})
        assert r.status_code == 200
        rows = r.json()
        ids = {x["team_id"] for x in rows}
        assert setup_matches["a1"] in ids
        assert setup_matches["a2"] in ids
        assert setup_matches["b1"] not in ids
        assert setup_matches["b2"] not in ids

    def test_standings_tiebreaker_order(self, setup_matches):
        # In Grupo B, b1 has 3 pts (won 2-0). b2 has 0.
        r = requests.get(f"{API}/stats/standings",
                         params={"category": setup_matches["cat"], "group_name": "Grupo B"})
        rows = r.json()
        assert rows[0]["team_id"] == setup_matches["b1"]
        assert rows[0]["points"] == 3 and rows[0]["gd"] == 2


# -------------------- /api/fixtures/generate --------------------
class TestFixtureGenerate:
    @pytest.fixture(scope="class")
    def four_teams(self, admin_session):
        ids = []
        for i in range(4):
            t = _create_team(admin_session, f"TEST_FX4_{i}_{uuid.uuid4().hex[:4]}", "Sub-18")
            ids.append(t["id"])
        return ids

    @pytest.fixture(scope="class")
    def five_teams(self, admin_session):
        ids = []
        for i in range(5):
            t = _create_team(admin_session, f"TEST_FX5_{i}_{uuid.uuid4().hex[:4]}", "Sub-14")
            ids.append(t["id"])
        return ids

    def test_preview_4_teams(self, admin_session, four_teams):
        r = admin_session.post(f"{API}/fixtures/generate", json={
            "category": "Sub-18", "group_name": "Grupo A", "team_ids": four_teams,
            "start_date": "2026-03-01", "days_between_rounds": 7,
            "venues": ["Cancha 1", "Cancha 2"], "time_slots": ["09:00", "11:00"],
            "preview": True
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["saved"] is False
        assert data["rounds"] == 3
        matches = data["matches"]
        assert len(matches) == 6
        # matchdays expected: [1,1,2,2,3,3]
        mds = [m["matchday"] for m in matches]
        assert mds == [1, 1, 2, 2, 3, 3], f"got {mds}"
        # Each team appears 3 times
        cnt = {}
        for m in matches:
            cnt[m["home_team_id"]] = cnt.get(m["home_team_id"], 0) + 1
            cnt[m["away_team_id"]] = cnt.get(m["away_team_id"], 0) + 1
        assert all(c == 3 for c in cnt.values())
        # Confirm not saved: matchday-filtered list should not contain them
        listed = requests.get(f"{API}/matches").json()
        gen_ids = {m["id"] for m in matches}
        for lm in listed:
            assert lm["id"] not in gen_ids, "preview should not persist"

    def test_preview_5_teams_byes(self, admin_session, five_teams):
        r = admin_session.post(f"{API}/fixtures/generate", json={
            "category": "Sub-14", "group_name": "Grupo Z", "team_ids": five_teams,
            "start_date": "2026-04-01", "days_between_rounds": 7,
            "venues": ["V1"], "time_slots": ["10:00"],
            "preview": True
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["rounds"] == 5
        # Each round has 2 matches (5 teams -> 1 bye per round)
        per_round = {}
        for m in data["matches"]:
            per_round[m["matchday"]] = per_round.get(m["matchday"], 0) + 1
        for md, c in per_round.items():
            assert c == 2, f"matchday {md} has {c} matches"
        # 5 byes total, one per round
        assert len(data["byes_per_round"]) == 5
        bye_rounds = sorted([b["round"] for b in data["byes_per_round"]])
        assert bye_rounds == [1, 2, 3, 4, 5]
        # Each team plays exactly 4 matches
        cnt = {tid: 0 for tid in five_teams}
        for m in data["matches"]:
            cnt[m["home_team_id"]] += 1
            cnt[m["away_team_id"]] += 1
        assert all(c == 4 for c in cnt.values()), cnt

    def test_save_persists_and_updates_teams(self, admin_session):
        # Fresh teams to avoid contaminating other tests
        ids = []
        for i in range(4):
            t = _create_team(admin_session, f"TEST_FXSAVE_{i}_{uuid.uuid4().hex[:4]}", "Sub-8")
            ids.append(t["id"])
        r = admin_session.post(f"{API}/fixtures/generate", json={
            "category": "Sub-8", "group_name": "Unigrupo", "team_ids": ids,
            "start_date": "2026-05-01", "days_between_rounds": 3,
            "venues": ["Cancha A", "Cancha B"], "time_slots": ["09:00", "10:30"],
            "preview": False
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["saved"] is True
        assert len(data["matches"]) == 6
        gen_ids = {m["id"] for m in data["matches"]}
        # Verify in DB via /matches
        listed = requests.get(f"{API}/matches", params={"category": "Sub-8"}).json()
        listed_ids = {m["id"] for m in listed}
        assert gen_ids.issubset(listed_ids), "generated matches not persisted"
        # Verify teams updated
        for tid in ids:
            t = requests.get(f"{API}/teams/{tid}").json()
            assert t["group_name"] == "Unigrupo"
            assert t["category"] == "Sub-8"

    def test_invalid_category(self, admin_session, four_teams):
        r = admin_session.post(f"{API}/fixtures/generate", json={
            "category": "Sub-99", "group_name": "A", "team_ids": four_teams,
            "start_date": "2026-03-01", "days_between_rounds": 7, "preview": True
        })
        assert r.status_code == 400

    def test_less_than_two_teams(self, admin_session, four_teams):
        r = admin_session.post(f"{API}/fixtures/generate", json={
            "category": "Sub-18", "group_name": "A", "team_ids": [four_teams[0]],
            "start_date": "2026-03-01", "days_between_rounds": 7, "preview": True
        })
        assert r.status_code == 400

    def test_venues_and_slots_distributed(self, admin_session, four_teams):
        r = admin_session.post(f"{API}/fixtures/generate", json={
            "category": "Sub-18", "group_name": "Grupo D", "team_ids": four_teams,
            "start_date": "2026-06-01", "days_between_rounds": 7,
            "venues": ["V1", "V2"], "time_slots": ["08:00", "10:00"],
            "preview": True
        })
        data = r.json()
        # In every round (2 matches each), the two matches use different venues and slots
        by_round = {}
        for m in data["matches"]:
            by_round.setdefault(m["matchday"], []).append(m)
        for md, ms in by_round.items():
            venues = sorted([m["venue"] for m in ms])
            assert venues == ["V1", "V2"], f"round {md} venues {venues}"
            times = sorted([m["match_date"][11:16] for m in ms])
            assert times == ["08:00", "10:00"], f"round {md} times {times}"

    def test_admin_required(self, four_teams):
        # No auth
        r = requests.post(f"{API}/fixtures/generate", json={
            "category": "Sub-18", "group_name": "A", "team_ids": four_teams,
            "start_date": "2026-03-01", "days_between_rounds": 7, "preview": True
        })
        assert r.status_code == 401


# -------------------- Cleanup --------------------
@pytest.fixture(scope="module", autouse=True)
def _cleanup(admin_session):
    yield
    try:
        teams = requests.get(f"{API}/teams").json()
        for t in teams:
            if t.get("name", "").startswith("TEST_"):
                admin_session.delete(f"{API}/teams/{t['id']}")
    except Exception as e:
        print("cleanup err", e)
