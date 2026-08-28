"""Iter47 — smoke backend para las 3 features de Admin > Partidos / Estadísticas.

Módulos cubiertos:
  - GET /api/tournaments  (fuente de los selectores en cascada del CMS)
  - GET /api/matches      (listado usado por Admin > Partidos y el reporte de Tarjetas)
  - GET /api/players?team_id=  (dropdown de jugadores filtrado por equipo)
  - PUT /api/matches/{id}/result -> persistencia de `cards` (player + staff)
  - GET /api/home-settings -> estadisticas.events[].categories[] con tournament_id/category
"""
import os

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")

ADMIN = {"email": "admin@futuresoccercup.com", "password": "FSCAdmin2025!"}
TID = "982d9f06-60b5-4681-8b9e-7e9b63915d3d"          # PRUEBA 2028 (cat 2009)
MATCH_ID = "b439fac5-db4e-462e-ab1c-bba114f9f713"     # AMERICA vs BOGOTA
AMERICA = "3be8eeb7-fce2-4600-8f2e-49e6b386e6dd"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=ADMIN)
    if r.status_code != 200:
        pytest.fail(f"admin login failed: {r.status_code} {r.text[:300]}")
    return s


# --- Tournaments (cascada del CMS de Estadísticas) ---
class TestTournaments:
    def test_list_tournaments(self, client):
        r = client.get(f"{BASE_URL}/api/tournaments")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) > 0
        for t in data:
            assert "_id" not in t
            assert isinstance(t["id"], str) and t["name"]
        target = [t for t in data if t["id"] == TID]
        assert target, "PRUEBA 2028 no encontrado"
        assert [c["name"] for c in target[0].get("categories", [])] == ["2009"]


# --- Matches + cards ---
class TestMatchesCards:
    def test_list_matches(self, client):
        r = client.get(f"{BASE_URL}/api/matches")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) > 0
        assert all("_id" not in m for m in data)

    def test_players_filtered_by_team(self, client):
        r = client.get(f"{BASE_URL}/api/players?team_id={AMERICA}")
        assert r.status_code == 200
        players = r.json()
        assert len(players) >= 2
        assert all(p["team_id"] == AMERICA for p in players), "el filtro team_id devuelve jugadores de otros equipos"

    def test_cards_persisted_player_and_staff(self, client):
        r = client.get(f"{BASE_URL}/api/matches")
        match = next(m for m in r.json() if m["id"] == MATCH_ID)
        cards = match.get("cards") or []
        assert len(cards) >= 2, f"se esperaban >=2 tarjetas guardadas, hay {len(cards)}"
        yellow = [c for c in cards if c["type"] == "yellow"]
        red = [c for c in cards if c["type"] == "red"]
        assert yellow and yellow[0].get("player_id"), "tarjeta amarilla sin player_id"
        assert yellow[0]["team_id"] == AMERICA
        assert yellow[0]["minute"] == 31
        assert red and red[0].get("staff_name") == "TEST_DT PEREZ"
        assert red[0].get("target_kind") == "staff"
        assert red[0]["minute"] == 55

    def test_result_update_roundtrip(self, client):
        """PUT /result no debe perder las tarjetas existentes."""
        match = next(m for m in client.get(f"{BASE_URL}/api/matches").json() if m["id"] == MATCH_ID)
        payload = {
            "home_score": match.get("home_score") or 2,
            "away_score": match.get("away_score") or 0,
            "scorers": match.get("scorers") or [],
            "cards": match.get("cards") or [],
            "home_fair_play": match.get("home_fair_play") or 0,
            "away_fair_play": match.get("away_fair_play") or 0,
        }
        put = client.put(f"{BASE_URL}/api/matches/{MATCH_ID}/result", json=payload)
        assert put.status_code == 200
        after = next(m for m in client.get(f"{BASE_URL}/api/matches").json() if m["id"] == MATCH_ID)
        assert len(after.get("cards") or []) == len(payload["cards"])
        assert after["status"] == "finalizado"


# --- Home settings: estructura de estadisticas ---
class TestHomeSettingsStats:
    def test_estadisticas_shape(self, client):
        r = client.get(f"{BASE_URL}/api/home-settings")
        assert r.status_code == 200
        est = r.json().get("estadisticas")
        assert isinstance(est, dict)
        events = est.get("events") or []
        assert len(events) >= 1
        for ev in events:
            for cat in ev.get("categories") or []:
                assert "tournament_id" in cat and "category" in cat
