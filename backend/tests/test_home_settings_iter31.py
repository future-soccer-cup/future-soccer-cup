"""Backend tests for iter31: new fields on /api/home-settings (navbar shield+logo, hero bg+fg)."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://fixture-stats-pro.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@futuresoccercup.com"
ADMIN_PASSWORD = "FSCAdmin2025!"

NEW_FIELDS = [
    "nav_logo_url",
    "nav_shield_url",
    "hero_image_url",
    "hero_foreground_url",
    "hero_edition_label",
    "hero_edition_year",
    "hero_month_1",
    "hero_month_2",
]


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_session(session):
    r = session.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"login failed {r.status_code} {r.text}"
    return session


def test_home_settings_public_get(session):
    r = session.get(f"{BASE_URL}/api/home-settings")
    assert r.status_code == 200, r.text
    data = r.json()
    for f in NEW_FIELDS:
        assert f in data, f"missing field {f} in GET response"


def test_home_settings_put_persists_new_fields(admin_session):
    # capture original
    orig = admin_session.get(f"{BASE_URL}/api/home-settings").json()
    test_shield = "https://example.com/shield.png"
    test_fg = "https://example.com/kids.png"
    payload = {**orig,
               "nav_shield_url": test_shield,
               "hero_foreground_url": test_fg}
    # normalize list fields (server returns lists)
    r = admin_session.put(f"{BASE_URL}/api/home-settings", json=payload)
    assert r.status_code == 200, r.text
    # GET again
    r2 = admin_session.get(f"{BASE_URL}/api/home-settings")
    assert r2.status_code == 200
    d2 = r2.json()
    assert d2.get("nav_shield_url") == test_shield
    assert d2.get("hero_foreground_url") == test_fg

    # restore
    restore = {**orig}
    r3 = admin_session.put(f"{BASE_URL}/api/home-settings", json=restore)
    assert r3.status_code == 200
    r4 = admin_session.get(f"{BASE_URL}/api/home-settings")
    d4 = r4.json()
    assert d4.get("nav_shield_url") == orig.get("nav_shield_url", "")
    assert d4.get("hero_foreground_url") == orig.get("hero_foreground_url", "")
    # ensure label restored to original (avoid leaving test value)
    assert d4.get("hero_edition_label") == orig.get("hero_edition_label")


def test_home_settings_put_requires_auth(session):
    fresh = requests.Session()
    r = fresh.put(f"{BASE_URL}/api/home-settings", json={"nav_shield_url": "x"})
    assert r.status_code in (401, 403), f"expected 401/403, got {r.status_code}"
