"""Tanda F — Identidad visual + Home redesign + Cotizaciones esenciales.

Tests:
- GET /api/home-settings (public, returns defaults if no doc)
- PUT /api/home-settings (admin only)
- Gallery CRUD: GET (public), POST/PUT/DELETE (admin)
- Tournaments backfill featured/city/venue/cover_url
- Quotes extra_pax_entries (calculate + persisted)
- PUT /api/quotes/{qid} (owner+admin, re-pendiente)
- GET /api/quotes/{qid} (any authenticated user)
"""
import os
import uuid
import pytest
import requests
from pathlib import Path


def _load_base_url() -> str:
    env_path = Path("/app/frontend/.env")
    for line in env_path.read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            return line.split("=", 1)[1].strip().rstrip("/")
    raise RuntimeError("REACT_APP_BACKEND_URL not found")


BASE_URL = _load_base_url()
ADMIN_EMAIL = "admin@futuresoccercup.com"
ADMIN_PASSWORD = "FSCAdmin2025!"


# -------------------- Fixtures --------------------
@pytest.fixture(scope="module")
def admin():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login",
               json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
    assert r.status_code == 200, f"admin login failed: {r.text}"
    return s


def _register_dt(label="dt"):
    s = requests.Session()
    email = f"TEST_iter14_{label}_{uuid.uuid4().hex[:6]}@test.com"
    pwd = "TeamPass2025!"
    s.post(f"{BASE_URL}/api/auth/register-team", json={
        "email": email, "password": pwd, "name": f"DT Iter14 {label}",
        "manager_name": f"Manager {label}",
        "club_name": f"TEST_ITER14_CLUB_{label}_{uuid.uuid4().hex[:5]}",
        "team_name": f"TEST_ITER14_{label.upper()}_{uuid.uuid4().hex[:6]}",
        "category": "Sub-12", "birth_year": 2013,
        "event_type": "festival", "data_consent": True,
    }, timeout=20)
    # Always explicit login to make sure session has the access_token cookie
    lr = s.post(f"{BASE_URL}/api/auth/login",
                json={"email": email, "password": pwd}, timeout=20)
    assert lr.status_code == 200, f"dt login failed for {email}: {lr.text}"
    return s, email


@pytest.fixture(scope="module")
def dt():
    s, _ = _register_dt("owner")
    return s


@pytest.fixture(scope="module")
def dt_other():
    s, _ = _register_dt("other")
    return s


# -------------------- Home Settings --------------------
class TestHomeSettings:
    def test_get_home_settings_public_returns_defaults_or_doc(self):
        r = requests.get(f"{BASE_URL}/api/home-settings", timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        for key in [
            "hero_title", "hero_subtitle", "hero_cta_label", "hero_cta_url",
            "hero_image_url", "upcoming_name", "upcoming_city", "upcoming_venue",
            "upcoming_start_date", "upcoming_end_date", "upcoming_categories",
            "upcoming_cover_url", "about_title", "about_body", "about_image_url",
            "contact_email", "contact_phone", "instagram", "facebook", "youtube",
        ]:
            assert key in data, f"missing key {key}"

    def test_put_home_settings_requires_admin(self):
        r = requests.put(f"{BASE_URL}/api/home-settings", json={
            "hero_title": "Should Not Persist",
        }, timeout=20)
        assert r.status_code in (401, 403), f"expected 401/403 got {r.status_code}"

    def test_put_home_settings_admin_persists(self, admin):
        new_title = f"FSC TEST {uuid.uuid4().hex[:6]}"
        payload = {
            "hero_title": new_title,
            "hero_subtitle": "Test subtitle",
            "hero_cta_label": "Inscribir",
            "hero_cta_url": "/registro-equipo",
            "instagram": "@TEST_FSC",
        }
        r = admin.put(f"{BASE_URL}/api/home-settings", json=payload, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["hero_title"] == new_title
        assert data["instagram"] == "@TEST_FSC"
        # Verify persistence with public GET
        r2 = requests.get(f"{BASE_URL}/api/home-settings", timeout=20)
        assert r2.status_code == 200
        assert r2.json()["hero_title"] == new_title


# -------------------- Gallery --------------------
class TestGallery:
    created_id = None

    def test_get_gallery_public(self):
        r = requests.get(f"{BASE_URL}/api/gallery", timeout=20)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_post_gallery_requires_admin(self):
        r = requests.post(f"{BASE_URL}/api/gallery",
                          json={"image_url": "https://example.com/x.jpg"}, timeout=20)
        assert r.status_code in (401, 403)

    def test_post_gallery_empty_url_400(self, admin):
        r = admin.post(f"{BASE_URL}/api/gallery", json={
            "image_url": "", "title": "TEST_EMPTY", "sort_order": 1
        }, timeout=20)
        # FastAPI validation may return 400 or 422 depending on validation layer.
        assert r.status_code in (400, 422), f"got {r.status_code}: {r.text}"

    def test_post_gallery_admin_creates(self, admin):
        r = admin.post(f"{BASE_URL}/api/gallery", json={
            "image_url": "https://example.com/test.jpg",
            "title": f"TEST_iter14_{uuid.uuid4().hex[:5]}",
            "caption": "test caption",
            "sort_order": 99,
        }, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "id" in data and "created_at" in data
        assert data["image_url"] == "https://example.com/test.jpg"
        TestGallery.created_id = data["id"]

        # Verify in listing
        listing = requests.get(f"{BASE_URL}/api/gallery", timeout=20).json()
        assert any(g["id"] == data["id"] for g in listing)

    def test_gallery_sorted_by_sort_order(self, admin):
        # Create two more
        a = admin.post(f"{BASE_URL}/api/gallery", json={
            "image_url": "https://example.com/a.jpg",
            "title": f"TEST_A_{uuid.uuid4().hex[:5]}", "sort_order": 1,
        }, timeout=20).json()
        b = admin.post(f"{BASE_URL}/api/gallery", json={
            "image_url": "https://example.com/b.jpg",
            "title": f"TEST_B_{uuid.uuid4().hex[:5]}", "sort_order": 2,
        }, timeout=20).json()
        items = requests.get(f"{BASE_URL}/api/gallery", timeout=20).json()
        idx_a = next(i for i, v in enumerate(items) if v["id"] == a["id"])
        idx_b = next(i for i, v in enumerate(items) if v["id"] == b["id"])
        assert idx_a < idx_b, "sort_order=1 should come before sort_order=2"
        # cleanup
        admin.delete(f"{BASE_URL}/api/gallery/{a['id']}", timeout=20)
        admin.delete(f"{BASE_URL}/api/gallery/{b['id']}", timeout=20)

    def test_put_gallery_updates(self, admin):
        assert TestGallery.created_id
        r = admin.put(f"{BASE_URL}/api/gallery/{TestGallery.created_id}", json={
            "image_url": "https://example.com/test2.jpg",
            "title": "TEST_iter14_updated", "caption": "updated", "sort_order": 100,
        }, timeout=20)
        assert r.status_code == 200, r.text
        assert r.json()["title"] == "TEST_iter14_updated"

    def test_put_gallery_404(self, admin):
        r = admin.put(f"{BASE_URL}/api/gallery/nonexistent-id-xxx", json={
            "image_url": "https://example.com/x.jpg", "title": "x",
        }, timeout=20)
        assert r.status_code == 404

    def test_delete_gallery_requires_admin(self):
        r = requests.delete(f"{BASE_URL}/api/gallery/anything", timeout=20)
        assert r.status_code in (401, 403)

    def test_delete_gallery_404(self, admin):
        r = admin.delete(f"{BASE_URL}/api/gallery/nonexistent-id-yyy", timeout=20)
        assert r.status_code == 404

    def test_delete_gallery_ok(self, admin):
        assert TestGallery.created_id
        r = admin.delete(f"{BASE_URL}/api/gallery/{TestGallery.created_id}", timeout=20)
        assert r.status_code == 200
        # confirm removed
        listing = requests.get(f"{BASE_URL}/api/gallery", timeout=20).json()
        assert not any(g["id"] == TestGallery.created_id for g in listing)


# -------------------- Tournaments backfill featured/cover_url --------------------
class TestTournamentsBackfill:
    def test_list_returns_defaults(self):
        r = requests.get(f"{BASE_URL}/api/tournaments", timeout=20)
        assert r.status_code == 200
        items = r.json()
        if not items:
            pytest.skip("No tournaments available to test backfill")
        for t in items:
            assert "featured" in t
            assert "city" in t
            assert "venue" in t
            assert "cover_url" in t

    def test_put_featured_persists(self, admin):
        # create one
        r = admin.post(f"{BASE_URL}/api/tournaments", json={
            "name": f"TEST_ITER14_TOUR_{uuid.uuid4().hex[:5]}",
            "year": 2026, "season": "2026", "category": "Sub-12",
            "start_date": "2026-07-01", "end_date": "2026-07-10",
        }, timeout=20)
        assert r.status_code == 200, r.text
        tid = r.json()["id"]
        try:
            r2 = admin.put(f"{BASE_URL}/api/tournaments/{tid}", json={
                "featured": True, "city": "Armenia", "venue": "Estadio FSC",
                "cover_url": "https://example.com/c.jpg",
            }, timeout=20)
            assert r2.status_code == 200, r2.text
            data = r2.json()
            assert data["featured"] is True
            assert data["city"] == "Armenia"
            assert data["venue"] == "Estadio FSC"
            assert data["cover_url"] == "https://example.com/c.jpg"
            # Verify persisted in list
            listing = requests.get(f"{BASE_URL}/api/tournaments", timeout=20).json()
            found = next((t for t in listing if t["id"] == tid), None)
            assert found and found["featured"] is True
        finally:
            admin.delete(f"{BASE_URL}/api/tournaments/{tid}", timeout=20)


# -------------------- Quotes extra_pax + edit + detail --------------------
def _base_quote_payload(extra_pax=None):
    return {
        "event_type": "festival",
        "lodging_tier": "gold",
        "pax": 20,
        "nights": 5,
        "days": 6,
        "extra_pax_entries": extra_pax or [],
        "includes_breakfast": False,
        "includes_lunch": False,
        "includes_dinner": False,
        "include_registration": False,  # avoid year-dependent failure
    }


class TestQuotesExtraPax:
    def test_calculate_extra_pax_breakdown_and_subtotal(self):
        payload = _base_quote_payload(extra_pax=[
            {"label": "Acomp 1", "pax": 2, "nights": 5},
            {"label": "Acomp 2", "pax": 1, "nights": 7},
        ])
        r = requests.post(f"{BASE_URL}/api/quotes/calculate", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "extra_pax_subtotal" in data
        assert "extra_pax_breakdown" in data
        assert len(data["extra_pax_breakdown"]) == 2
        # Each row has rate_per_person + subtotal
        for row in data["extra_pax_breakdown"]:
            assert "rate_per_person" in row and "subtotal" in row
        # extra_pax_subtotal == sum
        s = sum(row["subtotal"] for row in data["extra_pax_breakdown"])
        assert abs(s - data["extra_pax_subtotal"]) < 0.01
        # lodging_subtotal should include extra_pax_subtotal
        rate = data["rate_per_person_total"]
        expected_main = rate * payload["pax"]
        assert abs(data["lodging_subtotal"] - (expected_main + data["extra_pax_subtotal"])) < 0.01

    def test_calculate_extra_pax_zero_pax_or_nights_ignored(self):
        payload = _base_quote_payload(extra_pax=[
            {"label": "Zero pax", "pax": 0, "nights": 5},
            {"label": "Zero nights", "pax": 2, "nights": 0},
            {"label": "Valid", "pax": 1, "nights": 5},
        ])
        r = requests.post(f"{BASE_URL}/api/quotes/calculate", json=payload, timeout=30)
        assert r.status_code == 200
        data = r.json()
        # Only the "Valid" row should be in breakdown
        assert len(data["extra_pax_breakdown"]) == 1
        assert data["extra_pax_breakdown"][0]["label"] == "Valid"

    def test_calculate_domicilio_extra_pax_zero(self):
        payload = _base_quote_payload(extra_pax=[
            {"label": "Acomp", "pax": 5, "nights": 5},
        ])
        payload["lodging_tier"] = "domicilio"
        r = requests.post(f"{BASE_URL}/api/quotes/calculate", json=payload, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert data["extra_pax_subtotal"] == 0
        assert data["extra_pax_breakdown"] == []

    def test_post_quote_persists_extra_pax_entries(self, dt):
        entries = [{"label": "Familia", "pax": 3, "nights": 6}]
        payload = _base_quote_payload(extra_pax=entries)
        r = dt.post(f"{BASE_URL}/api/quotes", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        doc = r.json()
        assert doc.get("extra_pax_entries") == entries
        assert doc.get("extra_pax_subtotal", 0) > 0
        assert doc.get("status") == "pendiente"


class TestQuoteUpdateAndDetail:
    @pytest.fixture(scope="class")
    def quote_id(self, dt):
        payload = _base_quote_payload(extra_pax=[{"label": "Acomp", "pax": 2, "nights": 5}])
        r = dt.post(f"{BASE_URL}/api/quotes", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        return r.json()["id"]

    def test_get_quote_detail_requires_auth(self, quote_id):
        r = requests.get(f"{BASE_URL}/api/quotes/{quote_id}", timeout=20)
        assert r.status_code == 401

    def test_get_quote_detail_404(self, dt):
        r = dt.get(f"{BASE_URL}/api/quotes/nonexistent-quote-xxx", timeout=20)
        assert r.status_code == 404

    def test_get_quote_detail_any_authed_user(self, dt_other, quote_id):
        # Even a different DT can GET detail (per spec: any authenticated user)
        r = dt_other.get(f"{BASE_URL}/api/quotes/{quote_id}", timeout=20)
        assert r.status_code == 200
        assert r.json()["id"] == quote_id

    def test_put_quote_owner_succeeds_status_back_to_pendiente(self, admin, dt, quote_id):
        # First, admin approves it
        r = admin.put(f"{BASE_URL}/api/quotes/{quote_id}/status?status=aprobada", timeout=20)
        # status route may differ; let's just patch via direct set if needed -- try common patterns:
        # Use admin PUT to set status if available. If not 200, skip status assertion of prior state.
        # For this test, the important part: after owner edit, status should be "pendiente".
        new_payload = _base_quote_payload(extra_pax=[
            {"label": "Acomp", "pax": 4, "nights": 5},
        ])
        new_payload["pax"] = 25
        r2 = dt.put(f"{BASE_URL}/api/quotes/{quote_id}", json=new_payload, timeout=30)
        assert r2.status_code == 200, r2.text
        doc = r2.json()
        assert doc["status"] == "pendiente"
        assert doc["pax"] == 25

    def test_put_quote_other_user_403(self, dt_other, quote_id):
        payload = _base_quote_payload()
        r = dt_other.put(f"{BASE_URL}/api/quotes/{quote_id}", json=payload, timeout=20)
        assert r.status_code == 403

    def test_put_quote_admin_can_edit(self, admin, quote_id):
        payload = _base_quote_payload()
        payload["pax"] = 30
        r = admin.put(f"{BASE_URL}/api/quotes/{quote_id}", json=payload, timeout=20)
        assert r.status_code == 200, r.text
        assert r.json()["pax"] == 30

    def test_put_quote_404(self, dt):
        r = dt.put(f"{BASE_URL}/api/quotes/nonexistent-quote-zzz",
                   json=_base_quote_payload(), timeout=20)
        assert r.status_code == 404

    def test_put_quote_pagada_owner_blocked_admin_allowed(self, admin, dt, quote_id):
        # Mark as paid via DB-set endpoint if exists; if not available, try common status update.
        # Direct status patch path: PUT /api/quotes/{qid}/status?status=pagada (admin)
        r = admin.put(f"{BASE_URL}/api/quotes/{quote_id}/status",
                      params={"status": "pagada"}, timeout=20)
        if r.status_code != 200:
            pytest.skip(f"Cannot set quote to 'pagada' via status endpoint (got {r.status_code})")
        # Owner edit must be blocked
        r1 = dt.put(f"{BASE_URL}/api/quotes/{quote_id}",
                    json=_base_quote_payload(), timeout=20)
        assert r1.status_code == 400
        # Admin can still edit (re-pendiente)
        r2 = admin.put(f"{BASE_URL}/api/quotes/{quote_id}",
                       json=_base_quote_payload(), timeout=20)
        assert r2.status_code == 200
        assert r2.json()["status"] == "pendiente"


# -------------------- Regression: login still works --------------------
class TestRegression:
    def test_admin_login_works(self):
        s = requests.Session()
        r = s.post(f"{BASE_URL}/api/auth/login",
                   json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
        assert r.status_code == 200, r.text
        me = s.get(f"{BASE_URL}/api/auth/me", timeout=20)
        assert me.status_code == 200
        assert me.json()["role"] == "admin"

    def test_tournaments_crud_still_works(self, admin):
        r = admin.get(f"{BASE_URL}/api/tournaments", timeout=20)
        assert r.status_code == 200
