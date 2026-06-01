"""Iter 20 — Tanda FSC ajustes pequeños.

Covers:
- POST/PUT /api/admin/catalog/lodging with free_21st_enabled persistence
- POST /api/quotes/calculate promo "21 gratis" math (pax 21/40/19, free disabled, extra_pax not affected)
- POST /api/auth/register-team without event_type/birth_year (only club + user)
- POST /api/auth/register-team back-compat with event_type+birth_year
- POST /api/quotes/calculate accepts lodging_tier='paquete_1' (str, no Literal error)
"""
import os
import time
import uuid

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ADMIN_EMAIL = "admin@futuresoccercup.com"
ADMIN_PASSWORD = "FSCAdmin2025!"


# ------------- Fixtures -------------
@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=20,
    )
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def paquete_1_state(admin_session):
    """Capture original free_21st_enabled state of paquete_1 and restore at end."""
    r = admin_session.get(f"{BASE_URL}/api/event-types", timeout=20)
    assert r.status_code == 200
    tiers = r.json().get("lodging_tiers", [])
    p1 = next((t for t in tiers if t.get("id") == "paquete_1"), None)
    assert p1 is not None, "paquete_1 missing in catalog"
    original = bool(p1.get("free_21st_enabled", False))
    yield p1, original
    # Restore original
    body = {
        "name": p1["name"],
        "description": p1.get("description", ""),
        "base_5_nights": p1.get("base_5_nights", 0),
        "additional_night": p1.get("additional_night", 0),
        "available": p1.get("available", True),
        "free_21st_enabled": original,
        "includes": p1.get("includes", []),
        "classification": p1.get("classification", ""),
        "accommodation_type": p1.get("accommodation_type", ""),
    }
    admin_session.put(
        f"{BASE_URL}/api/admin/catalog/lodging/paquete_1", json=body, timeout=20
    )


# ============================================================
# Admin catalog: free_21st_enabled persistence
# ============================================================
class TestCatalogFree21Flag:
    def test_create_lodging_with_free21_enabled(self, admin_session):
        body = {
            "name": "TEST_iter20_lodging",
            "description": "test",
            "base_5_nights": 100000,
            "additional_night": 20000,
            "available": True,
            "free_21st_enabled": True,
            "classification": "GOLD",
            "accommodation_type": "Triple",
            "includes": ["wifi"],
        }
        r = admin_session.post(
            f"{BASE_URL}/api/admin/catalog/lodging", json=body, timeout=20
        )
        assert r.status_code == 200, r.text
        data = r.json()
        # capture id for cleanup
        created_id = data.get("id") or data.get("_id")
        if not created_id:
            # Try refetch from catalog
            cat = admin_session.get(f"{BASE_URL}/api/event-types", timeout=20).json()
            row = next(
                (
                    t
                    for t in cat["lodging_tiers"]
                    if t.get("name") == "TEST_iter20_lodging"
                ),
                None,
            )
            assert row is not None
            created_id = row["id"]

        # Re-fetch
        cat = admin_session.get(f"{BASE_URL}/api/event-types", timeout=20).json()
        row = next(
            (t for t in cat["lodging_tiers"] if t.get("id") == created_id), None
        )
        assert row is not None
        assert row.get("free_21st_enabled") is True

        # Toggle to false via PUT
        body2 = dict(body)
        body2["free_21st_enabled"] = False
        r2 = admin_session.put(
            f"{BASE_URL}/api/admin/catalog/lodging/{created_id}",
            json=body2,
            timeout=20,
        )
        assert r2.status_code == 200, r2.text

        cat2 = admin_session.get(f"{BASE_URL}/api/event-types", timeout=20).json()
        row2 = next(
            (t for t in cat2["lodging_tiers"] if t.get("id") == created_id), None
        )
        assert row2 is not None
        assert row2.get("free_21st_enabled") is False

        # Cleanup
        admin_session.delete(
            f"{BASE_URL}/api/admin/catalog/lodging/{created_id}", timeout=20
        )


# ============================================================
# Quotes math
# ============================================================
class TestQuoteFree21Math:
    def _enable_paquete_1_free21(self, admin_session, p1, enable=True):
        body = {
            "name": p1["name"],
            "description": p1.get("description", ""),
            "base_5_nights": p1.get("base_5_nights", 0),
            "additional_night": p1.get("additional_night", 0),
            "available": p1.get("available", True),
            "free_21st_enabled": enable,
            "includes": p1.get("includes", []),
            "classification": p1.get("classification", ""),
            "accommodation_type": p1.get("accommodation_type", ""),
        }
        r = admin_session.put(
            f"{BASE_URL}/api/admin/catalog/lodging/paquete_1", json=body, timeout=20
        )
        assert r.status_code == 200, r.text

    def test_pax_21_enabled(self, admin_session, paquete_1_state):
        p1, _ = paquete_1_state
        self._enable_paquete_1_free21(admin_session, p1, True)
        payload = {
            "event_type": "festival",
            "lodging_tier": "paquete_1",
            "pax": 21,
            "nights": 5,
            "days": 5,
            "meal_days": 5,
        }
        r = requests.post(
            f"{BASE_URL}/api/quotes/calculate", json=payload, timeout=20
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["free_21_enabled"] is True
        assert data["free_lodging_units"] == 1
        assert data["paying_pax_lodging"] == 20
        assert data["lodging_subtotal"] == 20 * p1["base_5_nights"]

    def test_pax_40_enabled(self, admin_session, paquete_1_state):
        p1, _ = paquete_1_state
        self._enable_paquete_1_free21(admin_session, p1, True)
        payload = {
            "event_type": "festival",
            "lodging_tier": "paquete_1",
            "pax": 40,
            "nights": 5,
            "days": 5,
            "meal_days": 5,
        }
        r = requests.post(
            f"{BASE_URL}/api/quotes/calculate", json=payload, timeout=20
        )
        assert r.status_code == 200
        data = r.json()
        assert data["free_lodging_units"] == 2
        assert data["paying_pax_lodging"] == 38

    def test_pax_19_enabled(self, admin_session, paquete_1_state):
        p1, _ = paquete_1_state
        self._enable_paquete_1_free21(admin_session, p1, True)
        payload = {
            "event_type": "festival",
            "lodging_tier": "paquete_1",
            "pax": 19,
            "nights": 5,
            "days": 5,
            "meal_days": 5,
        }
        r = requests.post(
            f"{BASE_URL}/api/quotes/calculate", json=payload, timeout=20
        )
        assert r.status_code == 200
        data = r.json()
        assert data["free_lodging_units"] == 0
        assert data["paying_pax_lodging"] == 19

    def test_free21_disabled(self, admin_session, paquete_1_state):
        p1, _ = paquete_1_state
        self._enable_paquete_1_free21(admin_session, p1, False)
        payload = {
            "event_type": "festival",
            "lodging_tier": "paquete_1",
            "pax": 21,
            "nights": 5,
            "days": 5,
            "meal_days": 5,
        }
        r = requests.post(
            f"{BASE_URL}/api/quotes/calculate", json=payload, timeout=20
        )
        assert r.status_code == 200
        data = r.json()
        assert data["free_21_enabled"] is False
        assert data["free_lodging_units"] == 0
        assert data["paying_pax_lodging"] == 21

    def test_extra_pax_not_affected(self, admin_session, paquete_1_state):
        p1, _ = paquete_1_state
        self._enable_paquete_1_free21(admin_session, p1, True)
        payload = {
            "event_type": "festival",
            "lodging_tier": "paquete_1",
            "pax": 21,
            "nights": 5,
            "days": 5,
            "meal_days": 5,
            "extra_pax_entries": [{"label": "Coach", "pax": 2, "nights": 7}],
        }
        r = requests.post(
            f"{BASE_URL}/api/quotes/calculate", json=payload, timeout=20
        )
        assert r.status_code == 200, r.text
        data = r.json()
        # main reserva
        assert data["free_lodging_units"] == 1
        assert data["paying_pax_lodging"] == 20
        # extra pax sin descuento — 2 personas × (base_5 + add_night*2)
        base_5 = p1["base_5_nights"]
        add_night = p1["additional_night"]
        expected_extra = 2 * (base_5 + add_night * 2)
        assert data["extra_pax_subtotal"] == expected_extra


# ============================================================
# Quote: lodging_tier accepts str (relaxed Literal)
# ============================================================
class TestQuoteLodgingTierStr:
    def test_paquete_1_accepted(self):
        payload = {
            "event_type": "festival",
            "lodging_tier": "paquete_1",
            "pax": 10,
            "nights": 5,
            "days": 5,
            "meal_days": 5,
        }
        r = requests.post(
            f"{BASE_URL}/api/quotes/calculate", json=payload, timeout=20
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code} {r.text}"


# ============================================================
# /auth/register-team optional event_type/birth_year
# ============================================================
class TestRegisterTeamOptional:
    def test_register_without_event_type(self, admin_session):
        ts = int(time.time())
        unique = uuid.uuid4().hex[:6]
        email = f"TEST_iter20_no_event_{ts}_{unique}@test.com"
        payload = {
            "email": email,
            "password": "Test12345!",
            "manager_name": "DT Sin Evento",
            "manager_role": "Directivo",
            "club_name": f"TEST_iter20_club_{ts}_{unique}",
            "club_country": "México",
            "club_city": "CDMX",
            "data_consent": True,
        }
        s = requests.Session()
        r = s.post(
            f"{BASE_URL}/api/auth/register-team", json=payload, timeout=20
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["email"] == email.lower()
        assert data["team_id"] is None, "team_id must be None when no event provided"

        # Verify /auth/me returns user without team_id (UserOut shape may be lean)
        me = s.get(f"{BASE_URL}/api/auth/me", timeout=20)
        assert me.status_code == 200

        # Verify the club WAS created and team was NOT (admin clubs-tree)
        tree = admin_session.get(
            f"{BASE_URL}/api/admin/clubs-tree", timeout=20
        ).json()
        club_match = next(
            (c for c in tree if c.get("name") == payload["club_name"]), None
        )
        assert club_match is not None, "Club must be created"
        assert club_match.get("country") == "México"
        assert len(club_match.get("teams") or []) == 0, "No team must be created"

        # Cleanup club via admin
        cid = club_match["id"]
        admin_session.delete(f"{BASE_URL}/api/admin/clubs/{cid}", timeout=20)

    def test_register_with_event_type_back_compat(self, admin_session):
        ts = int(time.time())
        unique = uuid.uuid4().hex[:6]
        email = f"TEST_iter20_with_event_{ts}_{unique}@test.com"
        payload = {
            "email": email,
            "password": "Test12345!",
            "manager_name": "DT Con Evento",
            "manager_role": "Cuerpo Técnico",
            "club_name": f"TEST_iter20_club_evt_{ts}_{unique}",
            "club_country": "Colombia",
            "club_city": "Bogotá",
            "event_type": "festival",
            "birth_year": 2014,
            "designation": "Único",
            "data_consent": True,
        }
        s = requests.Session()
        r = s.post(
            f"{BASE_URL}/api/auth/register-team", json=payload, timeout=20
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["team_id"] is not None

        team_id = data["team_id"]
        # Cleanup: delete team + club (admin)
        admin_session.delete(f"{BASE_URL}/api/admin/teams/{team_id}", timeout=20)
        me = s.get(f"{BASE_URL}/api/auth/me", timeout=20).json()
        if me.get("club_id"):
            admin_session.delete(
                f"{BASE_URL}/api/admin/clubs/{me['club_id']}", timeout=20
            )
