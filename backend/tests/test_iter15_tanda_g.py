"""Iteration 15 - Tanda G backend tests.

Validates transport_entries new model in /quotes/calculate and persistence in
POST/PUT /quotes + GET /quotes/{id}. Also regression on extra_pax_entries.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://fixture-stats-pro.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@futuresoccercup.com"
ADMIN_PWD = "FSCAdmin2025!"
COACH_EMAIL = "coach@test.com"
COACH_PWD = "Coach2025!"


@pytest.fixture(scope="module")
def admin_client():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PWD}, timeout=30)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def coach_client():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": COACH_EMAIL, "password": COACH_PWD}, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"Coach login failed: {r.status_code} {r.text}")
    return s


@pytest.fixture(scope="module")
def catalog():
    r = requests.get(f"{API}/event-types", timeout=30)
    assert r.status_code == 200
    return r.json()


# ---- transport_entries calculation ----
def test_calculate_with_transport_entries(coach_client, catalog):
    ev = catalog["events"][0]
    routes = catalog["transport_routes"]
    # Get two routes with price > 0 ideally
    paid_routes = [r for r in routes if (r.get("price") or 0) > 0]
    if len(paid_routes) < 1:
        pytest.skip("No paid transport routes available")
    r1 = paid_routes[0]

    payload = {
        "event_type": ev["id"],
        "birth_year": ev["birth_years"][0],
        "lodging_tier": "gold",
        "pax": 10,
        "nights": 5,
        "days": 6,
        "include_registration": False,
        "transport_entries": [
            {"route_id": r1["id"], "pax": 4, "date": "2026-04-10"},
            {"route_id": r1["id"], "pax": 6, "date": "2026-04-15"},
        ],
        "transport_routes": [],
        "tour_entries": [],
        "extra_pax_entries": [],
        "meal_entries": [],
    }
    r = coach_client.post(f"{API}/quotes/calculate", json=payload, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    expected_subtotal = r1["price"] * 4 + r1["price"] * 6
    assert data["transport_subtotal"] == expected_subtotal, f"got {data['transport_subtotal']} vs {expected_subtotal}"
    bd = data.get("transport_entries_breakdown")
    assert isinstance(bd, list) and len(bd) == 2
    assert bd[0]["route_id"] == r1["id"]
    assert bd[0]["pax"] == 4
    assert bd[0]["subtotal"] == r1["price"] * 4
    assert bd[0].get("date") == "2026-04-10"
    applied = data.get("transport_routes_applied", [])
    # unique route ids
    assert applied == [r1["id"], r1["id"]] or applied == [r1["id"]]


def test_calculate_transport_entries_overrides_legacy(coach_client, catalog):
    ev = catalog["events"][0]
    routes = catalog["transport_routes"]
    paid = [r for r in routes if (r.get("price") or 0) > 0]
    if len(paid) < 2:
        pytest.skip("Need 2 paid routes")
    r1, r2 = paid[0], paid[1]
    payload = {
        "event_type": ev["id"],
        "birth_year": ev["birth_years"][0],
        "lodging_tier": "gold",
        "pax": 20,
        "nights": 5,
        "days": 6,
        "include_registration": False,
        # legacy with many pax would inflate hugely; entries should override
        "transport_routes": [r1["id"], r2["id"]],
        "transport_entries": [
            {"route_id": r1["id"], "pax": 2, "date": "2026-04-10"},
        ],
        "tour_entries": [], "extra_pax_entries": [], "meal_entries": [],
    }
    r = coach_client.post(f"{API}/quotes/calculate", json=payload, timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert data["transport_subtotal"] == r1["price"] * 2


def test_calculate_empty_transport_entries_uses_legacy(coach_client, catalog):
    ev = catalog["events"][0]
    routes = catalog["transport_routes"]
    paid = [r for r in routes if (r.get("price") or 0) > 0]
    if not paid:
        pytest.skip("No paid routes")
    r1 = paid[0]
    payload = {
        "event_type": ev["id"],
        "birth_year": ev["birth_years"][0],
        "lodging_tier": "gold",
        "pax": 5,
        "nights": 5,
        "days": 6,
        "include_registration": False,
        "transport_routes": [r1["id"]],
        "transport_entries": [],
        "tour_entries": [], "extra_pax_entries": [], "meal_entries": [],
    }
    r = coach_client.post(f"{API}/quotes/calculate", json=payload, timeout=30)
    assert r.status_code == 200
    assert r.json()["transport_subtotal"] == r1["price"] * 5


# ---- persistence of transport_entries on create + get ----
def test_create_quote_persists_transport_entries(coach_client, catalog):
    ev = catalog["events"][0]
    routes = catalog["transport_routes"]
    paid = [r for r in routes if (r.get("price") or 0) > 0]
    if not paid:
        pytest.skip("No paid routes")
    r1 = paid[0]
    payload = {
        "event_type": ev["id"],
        "birth_year": ev["birth_years"][0],
        "lodging_tier": "gold",
        "pax": 12,
        "nights": 5,
        "days": 6,
        "include_registration": False,
        "transport_routes": [],
        "transport_entries": [
            {"route_id": r1["id"], "pax": 7, "date": "2026-04-12"},
            {"route_id": r1["id"], "pax": 5, "date": "2026-04-17"},
        ],
        "tour_entries": [], "extra_pax_entries": [], "meal_entries": [],
        "notes": "TEST_iter15_persist",
    }
    r = coach_client.post(f"{API}/quotes", json=payload, timeout=30)
    assert r.status_code == 200, r.text
    qid = r.json()["id"]

    g = coach_client.get(f"{API}/quotes/{qid}", timeout=30)
    assert g.status_code == 200
    q = g.json()
    assert "transport_entries" in q
    assert len(q["transport_entries"]) == 2
    assert q["transport_entries"][0]["route_id"] == r1["id"]
    assert q["transport_entries"][0]["pax"] == 7
    assert q["transport_entries"][0]["date"] == "2026-04-12"
    assert "transport_entries_breakdown" in q
    assert len(q["transport_entries_breakdown"]) == 2
    assert q["transport_subtotal"] == r1["price"] * 12


def test_update_quote_replaces_transport_entries(coach_client, catalog):
    ev = catalog["events"][0]
    routes = catalog["transport_routes"]
    paid = [r for r in routes if (r.get("price") or 0) > 0]
    if not paid:
        pytest.skip("No paid routes")
    r1 = paid[0]
    payload = {
        "event_type": ev["id"], "birth_year": ev["birth_years"][0],
        "lodging_tier": "gold", "pax": 10, "nights": 5, "days": 6,
        "include_registration": False, "transport_routes": [],
        "transport_entries": [{"route_id": r1["id"], "pax": 3, "date": "2026-04-10"}],
        "tour_entries": [], "extra_pax_entries": [], "meal_entries": [],
        "notes": "TEST_iter15_update_initial",
    }
    r = coach_client.post(f"{API}/quotes", json=payload, timeout=30)
    assert r.status_code == 200
    qid = r.json()["id"]

    # update with different entries
    payload["transport_entries"] = [
        {"route_id": r1["id"], "pax": 8, "date": "2026-04-11"},
        {"route_id": r1["id"], "pax": 2, "date": "2026-04-18"},
    ]
    payload["notes"] = "TEST_iter15_update_after"
    u = coach_client.put(f"{API}/quotes/{qid}", json=payload, timeout=30)
    assert u.status_code == 200, u.text

    g = coach_client.get(f"{API}/quotes/{qid}", timeout=30)
    q = g.json()
    assert len(q["transport_entries"]) == 2
    assert q["transport_entries"][0]["pax"] == 8
    assert q["transport_subtotal"] == r1["price"] * 10
    # Status reverts to pendiente
    assert q["status"] == "pendiente"


# ---- regression: extra_pax_entries with dates is accepted ----
def test_extra_pax_entries_with_dates(coach_client, catalog):
    ev = catalog["events"][0]
    payload = {
        "event_type": ev["id"], "birth_year": ev["birth_years"][0],
        "lodging_tier": "gold", "pax": 10, "nights": 5, "days": 6,
        "include_registration": False,
        "extra_pax_entries": [
            {"label": "Padres", "pax": 4, "nights": 3, "start_date": "2026-04-10", "end_date": "2026-04-13"},
        ],
        "transport_entries": [], "transport_routes": [], "tour_entries": [], "meal_entries": [],
    }
    r = coach_client.post(f"{API}/quotes/calculate", json=payload, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["extra_pax_subtotal"] > 0
