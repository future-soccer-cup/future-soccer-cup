"""Iter47: backup/restore de home_settings.estadisticas para pruebas no destructivas.
Uso: python3 iter47_backup_estadisticas.py backup | restore
"""
import json
import os
import sys

import requests
from dotenv import dotenv_values

fe = dotenv_values("/app/frontend/.env")
BASE = (os.environ.get("REACT_APP_BACKEND_URL") or fe.get("REACT_APP_BACKEND_URL")).rstrip("/")
PATH = "/app/test_reports/iter47_estadisticas_backup.json"

s = requests.Session()
s.post(f"{BASE}/api/auth/login", json={"email": "admin@futuresoccercup.com", "password": "FSCAdmin2025!"})
mode = sys.argv[1] if len(sys.argv) > 1 else "backup"

if mode == "backup":
    h = s.get(f"{BASE}/api/home-settings").json()
    with open(PATH, "w", encoding="utf-8") as f:
        json.dump(h.get("estadisticas"), f, ensure_ascii=False)
    print("backup saved")
else:
    with open(PATH, encoding="utf-8") as f:
        est = json.load(f)
    h = s.get(f"{BASE}/api/home-settings").json()
    h.pop("_id", None)
    h["estadisticas"] = est
    r = s.put(f"{BASE}/api/home-settings", json=h)
    print("restore", r.status_code, r.text[:200])
