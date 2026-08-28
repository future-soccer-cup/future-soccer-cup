"""Iter47 seed: crea jugadores TEST_ y cuerpo técnico en AMERICA/BOGOTA (PRUEBA 2028 · cat 2009)
para poder probar el editor de tarjetas y el reporte de tarjetas en Admin > Partidos."""
import os
import requests
from dotenv import dotenv_values

fe = dotenv_values("/app/frontend/.env")
BASE = (os.environ.get("REACT_APP_BACKEND_URL") or fe.get("REACT_APP_BACKEND_URL")).rstrip("/")

AMERICA = "3be8eeb7-fce2-4600-8f2e-49e6b386e6dd"
BOGOTA = "edaf01b5-2249-494d-aa31-379c72022a38"

s = requests.Session()
r = s.post(f"{BASE}/api/auth/login", json={"email": "admin@futuresoccercup.com", "password": "FSCAdmin2025!"})
print("login", r.status_code)

players = [
    {"name": "TEST_ARIAS", "team_id": AMERICA, "jersey_number": 7, "position": "Delantero", "birth_date": "2009-03-10"},
    {"name": "TEST_MORENO", "team_id": AMERICA, "jersey_number": 9, "position": "Mediocampista", "birth_date": "2009-05-21"},
    {"name": "TEST_CASTRO", "team_id": BOGOTA, "jersey_number": 5, "position": "Defensa", "birth_date": "2009-08-02"},
]
for p in players:
    resp = s.post(f"{BASE}/api/players", json=p)
    print("player", p["name"], resp.status_code, resp.text[:200])

# Cuerpo técnico en AMERICA
t = s.get(f"{BASE}/api/teams/{AMERICA}")
print("team get", t.status_code)
team = t.json()
body = {k: v for k, v in team.items() if k not in ("id", "created_at", "_id")}
body["cuerpo_tecnico"] = [{"name": "TEST_DT PEREZ", "role": "Director técnico"}]
u = s.put(f"{BASE}/api/teams/{AMERICA}", json=body)
print("team put", u.status_code, u.text[:300])
