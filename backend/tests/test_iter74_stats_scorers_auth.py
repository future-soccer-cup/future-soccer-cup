"""Iter74 regression tests:
 - Auth playbook checks (bcrypt format, httpOnly cookies, CORS credentials, brute-force lockout)
 - Public stats endpoints for tournament PRUEBA 2028 (group_name case fix)
 - Match result save with scorers carrying team_id (FEATURE2)
 - CMS home-settings estadisticas persistence (FEATURE4 backend side)
"""
import os
import time
import uuid

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")
INTERNAL_URL = "http://localhost:8001"  # only for checks the ingress intercepts (CORS preflight)

ADMIN_EMAIL = "admin@futuresoccercup.com"
ADMIN_PASSWORD = "FSCAdmin2025!"

TOURNAMENT_ID = "982d9f06-60b5-4681-8b9e-7e9b63915d3d"  # PRUEBA 2028
CATEGORY = "2009"
GROUP = "Grupo H"
MATCH_ID = "b439fac5-db4e-462e-ab1c-bba114f9f713"  # AMERICA 2-0 BOGOTA
AMERICA_ID = "3be8eeb7-fce2-4600-8f2e-49e6b386e6dd"
AMERICA_P1 = "b0f020e7-daa0-4ce4-864a-08acc18f1d3d"
AMERICA_P2 = "c96775dd-5219-43f1-90d2-4c7dce5dcc9c"


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    if r.status_code != 200:
        pytest.fail(f"Admin login failed: {r.status_code} {r.text[:300]}")
    return s


# ---------- Auth playbook ----------
class TestAuthPlaybook:
    def test_login_sets_httponly_cookies(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        raw = "; ".join(r.raw.headers.get_all("Set-Cookie") or [])
        assert "access_token=" in raw and "refresh_token=" in raw
        assert raw.lower().count("httponly") >= 2
        assert "Secure" in raw
        data = r.json()
        assert data["email"] == ADMIN_EMAIL and data["role"] == "admin"

    def test_bcrypt_hash_format_in_db(self):
        from pymongo import MongoClient
        env = dotenv_values("/app/backend/.env")
        client = MongoClient(env["MONGO_URL"])
        user = client[env["DB_NAME"]].users.find_one({"email": ADMIN_EMAIL})
        assert user is not None, "admin user missing (seed_admin did not run)"
        assert user["password_hash"].startswith("$2b$"), user["password_hash"][:10]

    def test_cors_allows_credentials_with_explicit_origin(self):
        """Preflight on the public URL is answered by the ingress/CDN (returns '*'),
        so the app-level CORS middleware is verified against the app directly."""
        origin = BASE_URL
        r = requests.options(
            f"{INTERNAL_URL}/api/auth/login",
            headers={"Origin": origin, "Access-Control-Request-Method": "POST",
                     "Access-Control-Request-Headers": "content-type"},
        )
        assert r.status_code in (200, 204)
        assert r.headers.get("access-control-allow-credentials") == "true"
        assert r.headers.get("access-control-allow-origin") == origin

    def test_me_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code in (401, 403)

    def test_brute_force_lockout_after_5_failures(self):
        """Lockout is keyed by '{client_ip}:{email}'. Verified against the app directly."""
        email = f"TEST_lockout_{uuid.uuid4().hex[:8]}@test.com"
        codes = []
        for _ in range(6):
            r = requests.post(f"{INTERNAL_URL}/api/auth/login", json={"email": email, "password": "wrong"})
            codes.append(r.status_code)
        assert codes[:5] == [401] * 5, codes
        assert codes[5] == 429, f"expected lockout 429 on 6th attempt, got {codes}"

    def test_brute_force_lockout_via_public_ingress(self):
        """KNOWN GAP (iter74): through the public ingress request.client.host is the proxy IP and
        varies between requests, so the ip:email counter never reaches 5 and no lockout happens."""
        email = f"TEST_lockout_pub_{uuid.uuid4().hex[:8]}@test.com"
        codes = []
        for _ in range(6):
            r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": "wrong"})
            codes.append(r.status_code)
            time.sleep(0.2)
        assert codes[5] == 429, f"lockout not enforced through public URL, got {codes}"

    def test_admin_login_still_works_after_lockout_of_other_identifier(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200
        assert r.json()["role"] == "admin"


# ---------- Public stats (FEATURE3) ----------
class TestPublicStats:
    def test_standings_with_group_name(self):
        r = requests.get(f"{BASE_URL}/api/stats/standings",
                         params={"tournament_id": TOURNAMENT_ID, "category": CATEGORY, "group_name": GROUP})
        assert r.status_code == 200
        rows = r.json()
        assert len(rows) >= 5, rows
        names = [x["team_name"] for x in rows]
        for expected in ["AMERICA", "EQUIPO ALCONES", "HALCONES", "SANTA FE", "BOGOTA"]:
            assert expected in names, f"{expected} missing from {names}"
        assert all("_id" not in x for x in rows)
        assert rows[0]["points"] >= rows[-1]["points"]

    def test_standings_uppercase_group_returns_empty(self):
        """Backend does an exact match; documents the case-sensitivity that caused the original bug."""
        r = requests.get(f"{BASE_URL}/api/stats/standings",
                         params={"tournament_id": TOURNAMENT_ID, "category": CATEGORY, "group_name": "GRUPO H"})
        assert r.status_code == 200
        assert r.json() == []

    def test_top_scorers_returns_name_and_team(self):
        r = requests.get(f"{BASE_URL}/api/stats/top-scorers",
                         params={"tournament_id": TOURNAMENT_ID, "category": CATEGORY, "limit": 10})
        assert r.status_code == 200
        rows = r.json()
        assert len(rows) >= 1
        first = rows[0]
        assert first.get("name"), f"scorer name missing: {first}"
        assert first.get("team_name")
        assert isinstance(first.get("goals"), int)


# ---------- Match result with scorer team_id (FEATURE2) ----------
class TestMatchResultScorers:
    def test_save_scorers_with_team_id_and_verify_persistence(self, admin_session):
        payload = {
            "home_score": 2, "away_score": 0,
            "scorers": [
                {"player_id": AMERICA_P1, "team_id": AMERICA_ID, "minute": 12},
                {"player_id": AMERICA_P2, "team_id": AMERICA_ID, "minute": 44},
            ],
            "cards": [
                {"team_id": AMERICA_ID, "type": "yellow", "minute": 31,
                 "target_kind": "player", "player_id": AMERICA_P1, "staff_name": ""},
                {"team_id": AMERICA_ID, "type": "red", "minute": 55,
                 "target_kind": "staff", "player_id": "", "staff_name": "TEST_DT PEREZ"},
            ],
            "home_fair_play": 0, "away_fair_play": 0,
        }
        r = admin_session.put(f"{BASE_URL}/api/matches/{MATCH_ID}/result", json=payload)
        assert r.status_code == 200, r.text[:300]
        m = r.json()
        assert m["status"] == "finalizado"
        assert len(m["scorers"]) == 2
        assert all(s["team_id"] == AMERICA_ID for s in m["scorers"])

        # GET verification via list endpoint (no single-match GET exists)
        lst = requests.get(f"{BASE_URL}/api/matches", params={"tournament_id": TOURNAMENT_ID})
        assert lst.status_code == 200
        match = next(x for x in lst.json() if x["id"] == MATCH_ID)
        assert [s["player_id"] for s in match["scorers"]] == [AMERICA_P1, AMERICA_P2]
        assert all(s.get("team_id") == AMERICA_ID for s in match["scorers"])
        kinds = sorted(c["target_kind"] for c in match["cards"])
        assert kinds == ["player", "staff"]

    def test_result_requires_admin(self):
        r = requests.put(f"{BASE_URL}/api/matches/{MATCH_ID}/result",
                         json={"home_score": 1, "away_score": 1})
        assert r.status_code in (401, 403)


# ---------- CMS home-settings estadisticas (FEATURE4 backend) ----------
class TestHomeSettingsEstadisticas:
    def test_estadisticas_group_name_matches_fixture_group(self, admin_session):
        cfg = requests.get(f"{BASE_URL}/api/home-settings").json()
        est = cfg["estadisticas"]
        cats = [c for ev in est["events"] for c in ev.get("categories", []) if c.get("tournament_id")]
        assert cats, "no configured category found"
        fr = admin_session.get(f"{BASE_URL}/api/fixtures")
        assert fr.status_code == 200, fr.text[:200]
        fixtures = fr.json()
        for c in cats:
            if not c.get("group_name"):
                continue
            groups = {f.get("group_name") for f in fixtures
                      if f.get("tournament_id") == c["tournament_id"] and f.get("category") == c["category"]}
            assert c["group_name"] in groups, f"CMS group {c['group_name']!r} not in fixture groups {groups}"

    def test_put_home_settings_requires_admin(self):
        r = requests.put(f"{BASE_URL}/api/home-settings", json={})
        assert r.status_code in (401, 403, 422)

    def test_put_home_settings_roundtrip(self, admin_session):
        cfg = admin_session.get(f"{BASE_URL}/api/home-settings").json()
        original = cfg["estadisticas"].get("hero_watermark_text", "")
        cfg["estadisticas"]["hero_watermark_text"] = "TEST_WM"
        r = admin_session.put(f"{BASE_URL}/api/home-settings", json=cfg)
        assert r.status_code == 200, r.text[:300]
        again = requests.get(f"{BASE_URL}/api/home-settings").json()
        assert again["estadisticas"]["hero_watermark_text"] == "TEST_WM"
        # restore
        cfg["estadisticas"]["hero_watermark_text"] = original
        assert admin_session.put(f"{BASE_URL}/api/home-settings", json=cfg).status_code == 200
        restored = requests.get(f"{BASE_URL}/api/home-settings").json()
        assert restored["estadisticas"]["hero_watermark_text"] == original
