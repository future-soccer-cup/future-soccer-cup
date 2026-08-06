"""Iter53 — Partidos adicionales (bonus matches) para fixtures de 3 o 4 equipos.

Cubre: CRUD del endpoint /api/bonus-matches, validaciones (fixture size, max per team,
team pertenece al fixture) e integración con /api/stats/standings (PJ, W/D/L, GF/GC,
tarjetas y fair play).
"""
import os
import pytest
import requests

API = os.environ.get("REACT_APP_BACKEND_URL", "https://fixture-stats-pro.preview.emergentagent.com").rstrip("/") + "/api"
ADMIN = {"email": "admin@futuresoccercup.com", "password": "FSCAdmin2025!"}


@pytest.fixture(scope="module")
def sess():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json=ADMIN, timeout=10)
    r.raise_for_status()
    return s


def _mk_fixture(sess, n_teams: int, prefix: str):
    """Crea torneo + n clubes/teams + fixture round-robin. Devuelve {tid, team_ids, fid, cat, grp}."""
    tid = sess.post(f"{API}/tournaments", json={
        "name": f"{prefix}_{n_teams}", "season": "2026", "category": "General",
        "start_date": "2026-07-01", "end_date": "2026-07-30",
        "categories": [{
            "name": "Sub-X", "color": "#f97316", "fee": 0, "fee_usd": 0,
            "points_win": 3, "points_draw": 1, "points_loss": 0,
            "fairplay_base": 200, "fairplay_yellow": 10, "fairplay_red": 20, "fairplay_other": 5,
        }],
    }).json()["id"]
    team_ids = []
    for i in range(n_teams):
        cid = sess.post(f"{API}/clubs", json={"name": f"C_{prefix}_{i}", "city": "X", "country": "CO"}).json()["id"]
        t = sess.post(f"{API}/teams", json={"name": f"T_{prefix}_{i}", "club_id": cid, "category": "Sub-X", "tournament_id": tid}).json()
        team_ids.append(t["id"])
    fx = sess.post(f"{API}/fixtures/generate", json={
        "tournament_id": tid, "category": "Sub-X", "group_name": "A", "team_ids": team_ids,
        "start_date": "2026-07-05", "end_date": "2026-07-20",
        "matchdays_per_day": 1, "rounds": 1,
        "venues": ["C1"], "time_slots": ["10:00"], "preview": False,
        # Para 5 equipos usamos matriz manual (M5) porque el round-robin auto omite BYE.
        **({"matrix_matches": [
            {"matchday": 1, "home_pos": 1, "away_pos": 6},
            {"matchday": 1, "home_pos": 2, "away_pos": 5},
            {"matchday": 1, "home_pos": 3, "away_pos": 4},
        ]} if n_teams == 5 else {}),
    }).json()
    return {"tid": tid, "team_ids": team_ids, "fid": fx["fixture_id"], "cat": "Sub-X", "grp": "A"}


def _cleanup(sess, ctx):
    try:
        for fid in [ctx["fid"]]:
            sess.delete(f"{API}/fixtures/{fid}")
        # Delete clubs (cascade teams)
        clubs = sess.get(f"{API}/clubs").json()
        prefix = "C_" + ctx.get("_prefix", "")
        for c in clubs:
            if c["name"].startswith(prefix):
                sess.delete(f"{API}/clubs/{c['id']}?cascade=true")
        sess.delete(f"{API}/tournaments/{ctx['tid']}")
    except Exception:
        pass


class TestBonusMatchesThreeTeams:
    def test_3team_bonus_flow(self, sess):
        ctx = _mk_fixture(sess, 3, "B3")
        ctx["_prefix"] = "B3"
        try:
            t1 = ctx["team_ids"][0]

            # 1st bonus (won 3-1, 2 amarillas)
            r1 = sess.post(f"{API}/bonus-matches", json={
                "tournament_id": ctx["tid"], "category": ctx["cat"], "group_name": ctx["grp"],
                "team_id": t1, "result": "won", "goals_for": 3, "goals_against": 1,
                "yellow_cards": 2, "red_cards": 0, "other_cards": 0, "note": "primero",
            })
            assert r1.status_code == 200, r1.text
            bonus1_id = r1.json()["id"]

            # 2nd bonus (drawn 1-1, 1 roja)
            r2 = sess.post(f"{API}/bonus-matches", json={
                "tournament_id": ctx["tid"], "category": ctx["cat"], "group_name": ctx["grp"],
                "team_id": t1, "result": "drawn", "goals_for": 1, "goals_against": 1,
                "yellow_cards": 0, "red_cards": 1, "other_cards": 0,
            })
            assert r2.status_code == 200, r2.text

            # 3rd should FAIL (max 2)
            r3 = sess.post(f"{API}/bonus-matches", json={
                "tournament_id": ctx["tid"], "category": ctx["cat"], "group_name": ctx["grp"],
                "team_id": t1, "result": "lost", "goals_for": 0, "goals_against": 2,
            })
            assert r3.status_code == 400
            assert "máximo permitido es 2" in r3.json()["detail"]

            # Verify standings
            st = sess.get(f"{API}/stats/standings", params={
                "tournament_id": ctx["tid"], "category": ctx["cat"], "group_name": ctx["grp"],
            }).json()
            t1_row = next(r for r in st if r["team_id"] == t1)
            assert t1_row["played"] == 2, t1_row
            assert t1_row["won"] == 1 and t1_row["drawn"] == 1 and t1_row["lost"] == 0, t1_row
            assert t1_row["gf"] == 4 and t1_row["ga"] == 2 and t1_row["gd"] == 2, t1_row
            assert t1_row["points"] == 4  # 3 (won) + 1 (drawn)
            assert t1_row["yellow_cards"] == 2 and t1_row["red_cards"] == 1, t1_row
            assert t1_row["fair_play"] == 200 - (2 * 10) - (1 * 20), t1_row  # 160

            # Test UPDATE
            upd = sess.put(f"{API}/bonus-matches/{bonus1_id}", json={
                "tournament_id": ctx["tid"], "category": ctx["cat"], "group_name": ctx["grp"],
                "team_id": t1, "result": "lost", "goals_for": 0, "goals_against": 5,
                "yellow_cards": 0, "red_cards": 0, "other_cards": 3,
            })
            assert upd.status_code == 200, upd.text

            # Test DELETE
            de = sess.delete(f"{API}/bonus-matches/{bonus1_id}")
            assert de.status_code == 200

            # After delete, played=1 for T1 (only the drawn bonus remains)
            st2 = sess.get(f"{API}/stats/standings", params={
                "tournament_id": ctx["tid"], "category": ctx["cat"], "group_name": ctx["grp"],
            }).json()
            t1_row2 = next(r for r in st2 if r["team_id"] == t1)
            assert t1_row2["played"] == 1
            assert t1_row2["drawn"] == 1
        finally:
            _cleanup(sess, ctx)


class TestBonusMatchesFourTeams:
    def test_4team_bonus_max_one(self, sess):
        ctx = _mk_fixture(sess, 4, "B4")
        ctx["_prefix"] = "B4"
        try:
            t1 = ctx["team_ids"][0]
            # 1st bonus OK
            r1 = sess.post(f"{API}/bonus-matches", json={
                "tournament_id": ctx["tid"], "category": ctx["cat"], "group_name": ctx["grp"],
                "team_id": t1, "result": "won", "goals_for": 2, "goals_against": 0,
            })
            assert r1.status_code == 200
            # 2nd bonus should FAIL (max 1 for 4-team)
            r2 = sess.post(f"{API}/bonus-matches", json={
                "tournament_id": ctx["tid"], "category": ctx["cat"], "group_name": ctx["grp"],
                "team_id": t1, "result": "drawn",
            })
            assert r2.status_code == 400
            assert "máximo permitido es 1" in r2.json()["detail"]
        finally:
            _cleanup(sess, ctx)


class TestBonusMatchesFiveTeams:
    def test_5team_not_allowed(self, sess):
        ctx = _mk_fixture(sess, 5, "B5")
        ctx["_prefix"] = "B5"
        try:
            r = sess.post(f"{API}/bonus-matches", json={
                "tournament_id": ctx["tid"], "category": ctx["cat"], "group_name": ctx["grp"],
                "team_id": ctx["team_ids"][0], "result": "won",
            })
            assert r.status_code == 400
            assert "solo aplican en fixtures de 3 o 4 equipos" in r.json()["detail"]
        finally:
            _cleanup(sess, ctx)
