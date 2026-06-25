"""Iter38 - Fixture module CRUD + end_date validation + double_matchday legacy ignore."""
import os
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://fixture-stats-pro.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@futuresoccercup.com"
ADMIN_PASS = "FSCAdmin2025!"


@pytest.fixture(scope="module")
def admin():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=30)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def setup_ctx(admin):
    """Find/create a tournament + 2 teams in same category for fixture generation."""
    # Pick tournament with categories
    trs = admin.get(f"{API}/tournaments").json()
    teams = admin.get(f"{API}/teams").json()
    cat_with_teams = {}
    for t in teams:
        cat_with_teams.setdefault(t.get("category"), []).append(t["id"])
    # Iterate tournaments looking for any category match
    for tr in trs:
        if tr.get("archived"):
            continue
        cats = [c.get("name") for c in (tr.get("categories") or [])]
        if not cats and tr.get("category"):
            cats = [tr.get("category")]
        for cat in cats:
            if cat in cat_with_teams and len(cat_with_teams[cat]) >= 2:
                return {"tournament_id": tr["id"], "category": cat, "team_ids": cat_with_teams[cat][:2]}
    # Fallback: just pick any cat with 2+ teams and use first non-archived tournament
    non_archived = [t for t in trs if not t.get("archived") and not t.get("is_historical")]
    if non_archived:
        for cat, ids in cat_with_teams.items():
            if cat and len(ids) >= 2:
                return {"tournament_id": non_archived[0]["id"], "category": cat, "team_ids": ids[:2]}
    pytest.skip(f"No category has 2+ teams. cats: {list(cat_with_teams.keys())}")


# ---------- GET /api/fixtures returns 200 array ----------
def test_list_fixtures_empty_or_array(admin):
    r = admin.get(f"{API}/fixtures")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ---------- Preview generation ----------
def test_generate_preview(admin, setup_ctx):
    payload = {
        "tournament_id": setup_ctx["tournament_id"],
        "category": setup_ctx["category"],
        "group_name": "TEST_Grupo_Iter38",
        "team_ids": setup_ctx["team_ids"],
        "start_date": "2026-03-15",
        "end_date": "2026-12-31",
        "days_between_rounds": 7,
        "rounds": 1,
        "venues": ["Cancha 1"],
        "time_slots": ["10:00"],
        "preview": True,
    }
    r = admin.post(f"{API}/fixtures/generate", json=payload)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("fixture_id") is None, f"preview should return fixture_id=null, got {body.get('fixture_id')}"
    assert isinstance(body.get("matches"), list) and len(body["matches"]) >= 1


# ---------- end_date older than last match -> 400 ----------
def test_generate_end_date_too_early(admin, setup_ctx):
    payload = {
        "tournament_id": setup_ctx["tournament_id"],
        "category": setup_ctx["category"],
        "group_name": "TEST_Grupo_Iter38",
        "team_ids": setup_ctx["team_ids"],
        "start_date": "2026-03-15",
        "end_date": "2026-03-14",  # before start, definitely before last match
        "days_between_rounds": 7,
        "rounds": 2,
        "venues": ["Cancha 1"],
        "time_slots": ["10:00"],
        "preview": True,
    }
    r = admin.post(f"{API}/fixtures/generate", json=payload)
    assert r.status_code == 400, f"expected 400, got {r.status_code}: {r.text}"
    assert "fecha fin" in r.text.lower(), r.text


# ---------- Save (preview=false), GET /fixtures, GET /fixtures/{id}/matches ----------
@pytest.fixture(scope="module")
def saved_fixture(admin, setup_ctx):
    payload = {
        "tournament_id": setup_ctx["tournament_id"],
        "category": setup_ctx["category"],
        "group_name": "TEST_SavedFix_Iter38",
        "team_ids": setup_ctx["team_ids"],
        "start_date": "2026-04-01",
        "end_date": "2026-12-31",
        "days_between_rounds": 7,
        "rounds": 1,
        "venues": ["TEST_Cancha"],
        "time_slots": ["11:30"],
        "preview": False,
    }
    r = admin.post(f"{API}/fixtures/generate", json=payload)
    assert r.status_code == 200, r.text
    body = r.json()
    assert isinstance(body.get("fixture_id"), str) and len(body["fixture_id"]) >= 8
    yield {"fixture_id": body["fixture_id"], "matches": body["matches"]}
    # cleanup
    try:
        admin.delete(f"{API}/fixtures/{body['fixture_id']}")
    except Exception:
        pass


def test_saved_fixture_appears_in_list(admin, saved_fixture):
    r = admin.get(f"{API}/fixtures")
    assert r.status_code == 200
    ids = [f["id"] for f in r.json()]
    assert saved_fixture["fixture_id"] in ids
    entry = next(f for f in r.json() if f["id"] == saved_fixture["fixture_id"])
    # Validate persisted metadata
    assert entry.get("team_ids")
    assert entry.get("start_date") == "2026-04-01"
    assert entry.get("end_date") == "2026-12-31"
    assert entry.get("category")
    assert entry.get("group_name") == "TEST_SavedFix_Iter38"


def test_get_fixture_matches(admin, saved_fixture):
    r = admin.get(f"{API}/fixtures/{saved_fixture['fixture_id']}/matches")
    assert r.status_code == 200
    body = r.json()
    assert "fixture" in body and "matches" in body
    assert isinstance(body["matches"], list) and len(body["matches"]) >= 1


# ---------- PUT /matches/{id} updates date+venue, GET verifies ----------
def test_update_match_persists(admin, saved_fixture):
    mid = saved_fixture["matches"][0]["id"]
    new_dt = "2026-05-10T15:30"
    new_venue = "TEST_Cancha_Updated"
    r = admin.put(f"{API}/matches/{mid}", json={"match_date": new_dt, "venue": new_venue})
    assert r.status_code == 200, r.text
    # Verify persisted via fixture matches endpoint
    g = admin.get(f"{API}/fixtures/{saved_fixture['fixture_id']}/matches")
    assert g.status_code == 200
    found = next((m for m in g.json()["matches"] if m["id"] == mid), None)
    assert found, "updated match not found"
    assert found.get("venue") == new_venue
    assert (found.get("match_date") or "").startswith("2026-05-10")


# ---------- double_matchday accepted and ignored (legacy) ----------
def test_double_matchday_ignored(admin, setup_ctx):
    payload = {
        "tournament_id": setup_ctx["tournament_id"],
        "category": setup_ctx["category"],
        "group_name": "TEST_DblIgn_Iter38",
        "team_ids": setup_ctx["team_ids"],
        "start_date": "2026-06-01",
        "end_date": "2026-12-31",
        "days_between_rounds": 7,
        "rounds": 2,  # produces multiple rounds for verification
        "venues": ["Cancha 1"],
        "time_slots": ["10:00", "12:00"],
        "double_matchday": True,
        "preview": True,
    }
    r = admin.post(f"{API}/fixtures/generate", json=payload)
    assert r.status_code == 200, r.text
    matches = r.json()["matches"]
    # Group by matchday: each matchday should be on a unique date (one round per day)
    by_day = {}
    for m in matches:
        by_day.setdefault(m["matchday"], set()).add((m.get("match_date") or "")[:10])
    for md, dates in by_day.items():
        assert len(dates) == 1, f"matchday {md} spans multiple dates {dates} - double_matchday not ignored"
    # Different matchdays should be on different dates (7-day separation)
    md_dates = {md: list(d)[0] for md, d in by_day.items()}
    distinct = set(md_dates.values())
    if len(md_dates) > 1:
        assert len(distinct) == len(md_dates), f"multiple matchdays share a date: {md_dates}"


# ---------- DELETE removes fixture from list ----------
def test_delete_fixture(admin, setup_ctx):
    # Create a fresh one to delete
    payload = {
        "tournament_id": setup_ctx["tournament_id"],
        "category": setup_ctx["category"],
        "group_name": "TEST_DelFix_Iter38",
        "team_ids": setup_ctx["team_ids"],
        "start_date": "2026-07-01",
        "end_date": "2026-12-31",
        "days_between_rounds": 7,
        "rounds": 1,
        "venues": ["Cancha 1"],
        "time_slots": ["10:00"],
        "preview": False,
    }
    r = admin.post(f"{API}/fixtures/generate", json=payload)
    assert r.status_code == 200, r.text
    fid = r.json()["fixture_id"]
    d = admin.delete(f"{API}/fixtures/{fid}")
    assert d.status_code == 200
    assert "matches_deleted" in d.json()
    assert d.json()["matches_deleted"] >= 1
    # Verify removed
    r2 = admin.get(f"{API}/fixtures")
    assert fid not in [f["id"] for f in r2.json()]
