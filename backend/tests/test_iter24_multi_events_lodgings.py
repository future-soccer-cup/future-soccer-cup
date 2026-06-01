"""Iter24 — /cotizar refactor: múltiples eventos y múltiples paquetes de hospedaje.

Cubre:
- POST /api/quotes/calculate con events:[] (múltiples eventos sumando registration_fee)
- POST /api/quotes/calculate con lodgings:[] (múltiples paquetes con extras propios)
- POST /api/quotes/calculate con ambos arrays
- Compatibilidad legacy (lodging_tier + pax + categories)
- POST /api/quotes (auth) y GET/PUT /api/quotes/{id} con nuevo modelo arrays
"""
import os
import requests
import pytest

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or "https://fixture-stats-pro.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "admin@futuresoccercup.com", "password": "FSCAdmin2025!"}
COACH = {"email": "coach@test.com", "password": "Coach2025!"}


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json=ADMIN, timeout=20)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def coach_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json=COACH, timeout=20)
    assert r.status_code == 200, f"coach login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def catalog():
    """Fetch lodging tiers + tournaments from public endpoints."""
    et = requests.get(f"{API}/event-types", timeout=20).json()
    tiers = et.get("lodging_tiers", [])
    tournaments = requests.get(f"{API}/tournaments", timeout=20).json()
    assert isinstance(tiers, list) and len(tiers) >= 2, "necesitamos >=2 tiers"
    out = {"tiers": tiers, "tournaments": tournaments}
    return out


# --------- /quotes/calculate: múltiples eventos ---------
def test_calculate_multi_events_sums_registration(catalog):
    """Suma de fees de categorías de múltiples eventos = registration_fee global."""
    # Buscar 2 tournaments con al menos 1 categoría c/u
    eligible = [t for t in catalog["tournaments"] if t.get("categories")]
    if len(eligible) < 2:
        pytest.skip("Se requieren >=2 tournaments con categorias para este test")
    t1, t2 = eligible[0], eligible[1]
    cat1 = t1["categories"][0]
    cat2 = t2["categories"][0]
    payload = {
        "events": [
            {"tournament_id": t1["id"], "tournament_name": t1["name"],
             "event_type": t1.get("event_type", "festival"),
             "categories": [{"name": cat1["name"], "fee": cat1["fee"]}]},
            {"tournament_id": t2["id"], "tournament_name": t2["name"],
             "event_type": t2.get("event_type", "festival"),
             "categories": [{"name": cat2["name"], "fee": cat2["fee"]}]},
        ],
        "lodgings": [],
        "include_registration": True,
    }
    r = requests.post(f"{API}/quotes/calculate", json=payload, timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()
    expected = float(cat1["fee"]) + float(cat2["fee"])
    assert data["registration_fee"] == expected, f"expected {expected}, got {data['registration_fee']}"
    assert "events_breakdown" in data
    assert len(data["events_breakdown"]) == 2
    ev_ids = {e["tournament_id"] for e in data["events_breakdown"]}
    assert t1["id"] in ev_ids and t2["id"] in ev_ids
    # total = registration solo (sin lodging)
    assert data["total_amount"] == expected


# --------- /quotes/calculate: múltiples paquetes ---------
def test_calculate_multi_lodgings_sums_subtotals(catalog):
    """2 paquetes (tiers distintos), cada uno con extras propios → lodgings_breakdown[] suma."""
    tiers = catalog["tiers"]
    t_a, t_b = tiers[0], tiers[1]
    payload = {
        "lodgings": [
            {"tier_id": t_a["id"], "pax": 3, "nights": 5,
             "extra_pax_entries": [{"label": "Padre A", "pax": 1, "nights": 5,
                                    "date_from": "2026-03-01", "date_to": "2026-03-06"}]},
            {"tier_id": t_b["id"], "pax": 2, "nights": 6,
             "extra_pax_entries": []},
        ],
        "include_registration": False,
    }
    r = requests.post(f"{API}/quotes/calculate", json=payload, timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data.get("lodgings_breakdown"), list)
    assert len(data["lodgings_breakdown"]) == 2
    # Cada paquete tiene subtotal y extra_pax_breakdown
    for b in data["lodgings_breakdown"]:
        assert "subtotal" in b
        assert "extra_pax_breakdown" in b
    # cálculo paquete A: rate_a = base + 0 (5 noches), main = rate_a * 3 + rate_a * 1 (extra)
    base_a = float(t_a.get("base_5_nights", 0))
    add_a = float(t_a.get("additional_night", 0))
    rate_a = base_a  # 5 noches
    free_21_a = bool(t_a.get("free_21st_enabled"))
    pay_a = 3 - (3 // 20 if free_21_a else 0)
    expected_a = rate_a * pay_a + rate_a * 1  # 1 extra pax x 5 nights
    # paquete B: 6 noches → rate_b = base + add_b
    base_b = float(t_b.get("base_5_nights", 0))
    add_b = float(t_b.get("additional_night", 0))
    rate_b = base_b + add_b * 1
    free_21_b = bool(t_b.get("free_21st_enabled"))
    pay_b = 2 - (2 // 20 if free_21_b else 0)
    expected_b = rate_b * pay_b
    expected_total = expected_a + expected_b
    assert abs(data["lodging_subtotal"] - expected_total) < 0.01, (
        f"expected lodging {expected_total}, got {data['lodging_subtotal']}"
    )


# --------- /quotes/calculate: events + lodgings combinados ---------
def test_calculate_combined_events_and_lodgings(catalog):
    eligible = [t for t in catalog["tournaments"] if t.get("categories")]
    if not eligible:
        pytest.skip("Se requiere al menos 1 tournament con categorias")
    t1 = eligible[0]
    cat1 = t1["categories"][0]
    tier = catalog["tiers"][0]
    payload = {
        "events": [{"tournament_id": t1["id"], "tournament_name": t1["name"],
                    "event_type": t1.get("event_type", "festival"),
                    "categories": [{"name": cat1["name"], "fee": cat1["fee"]}]}],
        "lodgings": [{"tier_id": tier["id"], "pax": 2, "nights": 5, "extra_pax_entries": []}],
        "include_registration": True,
    }
    r = requests.post(f"{API}/quotes/calculate", json=payload, timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["registration_fee"] == float(cat1["fee"])
    assert data["lodging_subtotal"] > 0
    expected_total = (
        data["lodging_subtotal"]
        + data["meals_subtotal"]
        + data["transport_subtotal"]
        + data["tours_subtotal"]
        + data["registration_fee"]
    )
    assert abs(data["total_amount"] - expected_total) < 0.01


# --------- LEGACY compat ---------
def test_calculate_legacy_lodging_tier_still_works(catalog):
    tier = catalog["tiers"][0]
    payload = {
        "lodging_tier": tier["id"],
        "pax": 3,
        "nights": 5,
        "include_registration": False,
    }
    r = requests.post(f"{API}/quotes/calculate", json=payload, timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["lodging_subtotal"] > 0
    assert len(data["lodgings_breakdown"]) == 1
    assert data["lodgings_breakdown"][0]["tier_id"] == tier["id"]


def test_calculate_legacy_categories_still_works(catalog):
    """legacy payload with categories[] (sin events) suma registration."""
    payload = {
        "categories": [{"name": "Sub-12", "fee": 1000000}, {"name": "Sub-14", "fee": 1500000}],
        "include_registration": True,
        "lodgings": [],
    }
    r = requests.post(f"{API}/quotes/calculate", json=payload, timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["registration_fee"] == 2500000


# --------- POST /quotes (auth coach) + GET + PUT ---------
def test_create_quote_with_arrays_persists(coach_session, catalog):
    eligible = [t for t in catalog["tournaments"] if t.get("categories")]
    if not eligible:
        pytest.skip("se requiere tournament con categorias")
    t1 = eligible[0]
    cat1 = t1["categories"][0]
    tier = catalog["tiers"][0]
    payload = {
        "events": [{"tournament_id": t1["id"], "tournament_name": t1["name"],
                    "event_type": t1.get("event_type", "festival"),
                    "categories": [{"name": cat1["name"], "fee": cat1["fee"]}]}],
        "lodgings": [{"tier_id": tier["id"], "pax": 2, "nights": 5, "extra_pax_entries": []}],
        "include_registration": True,
        "notes": "TEST_iter24_multi",
    }
    r = coach_session.post(f"{API}/quotes", json=payload, timeout=20)
    if r.status_code == 403:
        pytest.skip(f"coach forbidden: {r.text}")
    assert r.status_code == 200, r.text
    quote = r.json()
    qid = quote["id"]
    assert quote.get("events") and len(quote["events"]) == 1
    assert quote.get("lodgings") and len(quote["lodgings"]) == 1
    assert quote.get("events_breakdown") and len(quote["events_breakdown"]) == 1
    assert quote.get("lodgings_breakdown") and len(quote["lodgings_breakdown"]) == 1

    # GET
    g = coach_session.get(f"{API}/quotes/{qid}", timeout=20)
    assert g.status_code == 200, g.text
    g_data = g.json()
    assert g_data.get("events") and len(g_data["events"]) == 1
    assert g_data.get("lodgings") and len(g_data["lodgings"]) == 1
    assert "events_breakdown" in g_data
    assert "lodgings_breakdown" in g_data

    # PUT: agregar segundo lodging → status vuelve a pendiente
    tier2 = catalog["tiers"][1]
    upd_payload = dict(payload)
    upd_payload["lodgings"] = payload["lodgings"] + [
        {"tier_id": tier2["id"], "pax": 1, "nights": 5, "extra_pax_entries": []}
    ]
    u = coach_session.put(f"{API}/quotes/{qid}", json=upd_payload, timeout=20)
    assert u.status_code == 200, u.text
    u_data = u.json()
    assert len(u_data["lodgings"]) == 2
    assert u_data.get("status") == "pendiente"

    # Cleanup: delete quote (admin only required? Try as coach)
    coach_session.delete(f"{API}/quotes/{qid}", timeout=20)
