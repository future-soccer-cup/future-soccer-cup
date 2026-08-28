"""Iteration 46 smoke: GET /api/home-settings + POST /api/upload with image >5MB (15MB limit)."""
import io
import os

import pytest
import requests
from dotenv import dotenv_values
from PIL import Image

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")

ADMIN = {"email": "admin@futuresoccercup.com", "password": "FSCAdmin2025!"}


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=ADMIN, timeout=60)
    if r.status_code != 200:
        pytest.fail(f"Admin login failed {r.status_code}: {r.text[:300]}")
    return s


def test_home_settings_ok():
    r = requests.get(f"{BASE_URL}/api/home-settings", timeout=60)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict)
    assert len(data.keys()) > 50
    for key in ["nav_logo_url", "hero_edition_label", "contact_email"]:
        assert key in data
    assert "_id" not in data


def _big_png(target_mb=7):
    # noise image so PNG doesn't compress well
    px = int((target_mb * 1024 * 1024 / 3) ** 0.5)
    img = Image.frombytes("RGB", (px, px), os.urandom(px * px * 3))
    buf = io.BytesIO()
    img.save(buf, format="PNG", compress_level=0)
    return buf.getvalue()


def test_upload_image_over_5mb_accepted(admin_session):
    raw = _big_png(7)
    size_mb = len(raw) / (1024 * 1024)
    assert size_mb > 5, f"generated file too small: {size_mb:.1f}MB"
    r = admin_session.post(
        f"{BASE_URL}/api/upload",
        files={"file": ("TEST_big_iter46.png", raw, "image/png")},
        timeout=300,
    )
    assert r.status_code == 200, f"{r.status_code}: {r.text[:300]}"
    body = r.json()
    assert body.get("url"), body


def test_upload_image_over_15mb_rejected(admin_session):
    raw = _big_png(17)
    assert len(raw) / (1024 * 1024) > 15
    r = admin_session.post(
        f"{BASE_URL}/api/upload",
        files={"file": ("TEST_huge_iter46.png", raw, "image/png")},
        timeout=300,
    )
    assert r.status_code == 400, f"expected 400 got {r.status_code}: {r.text[:200]}"
    assert "15MB" in r.text
