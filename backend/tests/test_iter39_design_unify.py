"""Iter39: design unification - HomeSettings 29 new fields for secondary pages."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@futuresoccercup.com"
ADMIN_PASSWORD = "FSCAdmin2025!"

NEW_FIELDS = [
    "nosotros_hero_kicker", "nosotros_hero_title", "nosotros_hero_body",
    "nosotros_mission_kicker", "nosotros_mission_body",
    "nosotros_pill_1_title", "nosotros_pill_1_body",
    "nosotros_pill_2_title", "nosotros_pill_2_body",
    "nosotros_pill_3_title", "nosotros_pill_3_body",
    "nosotros_pill_4_title", "nosotros_pill_4_body",
    "eventos_hero_kicker", "eventos_hero_title", "eventos_hero_body",
    "contacto_hero_kicker", "contacto_hero_title", "contacto_hero_body",
    "contacto_form_kicker", "contacto_form_title",
    "noticias_hero_kicker", "noticias_hero_title", "noticias_hero_body",
    "estadisticas_hero_kicker", "estadisticas_hero_title", "estadisticas_hero_body",
    "hablemos_kicker", "hablemos_title",
]


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return s


def test_home_settings_has_29_new_fields():
    r = requests.get(f"{API}/home-settings")
    assert r.status_code == 200
    data = r.json()
    missing = [f for f in NEW_FIELDS if f not in data]
    assert not missing, f"Missing fields: {missing}"
    # Non-empty defaults
    empty = [f for f in NEW_FIELDS if not (data.get(f) or "").strip()]
    assert not empty, f"Empty defaults for: {empty}"


def test_home_settings_field_count_is_29():
    assert len(NEW_FIELDS) == 29


def test_put_persists_and_revert(admin_session):
    # Get current value
    r = requests.get(f"{API}/home-settings")
    original = r.json().get("nosotros_hero_body")
    assert original

    new_val = "Test custom body iter39"
    # PUT new value (send full payload merged)
    payload = r.json()
    payload["nosotros_hero_body"] = new_val
    # Strip computed fields if any
    payload.pop("_id", None)
    payload.pop("id", None)
    payload.pop("updated_at", None)

    put = admin_session.put(f"{API}/home-settings", json=payload)
    assert put.status_code == 200, f"PUT failed: {put.status_code} {put.text}"

    # GET verifies persistence
    r2 = requests.get(f"{API}/home-settings")
    assert r2.json().get("nosotros_hero_body") == new_val

    # Revert
    payload["nosotros_hero_body"] = original
    rev = admin_session.put(f"{API}/home-settings", json=payload)
    assert rev.status_code == 200

    r3 = requests.get(f"{API}/home-settings")
    assert r3.json().get("nosotros_hero_body") == original
