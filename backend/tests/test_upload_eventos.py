"""
Tests for POST /api/upload endpoint after video support was added.
Covers:
 - Auth required
 - Video (mp4) upload accepted, <30MB
 - Video upload rejected if > 30MB
 - Unsupported extension (.exe) rejected
 - Regression: normal image upload (jpg) still works, still limited to 5MB
"""
import io
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

ADMIN_EMAIL = "admin@futuresoccercup.com"
ADMIN_PASSWORD = "FSCAdmin2025!"

SAMPLE_MP4 = "/tmp/sample3.mp4"  # real playable mp4, ~2.8MB


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return s


class TestUploadAuth:
    def test_upload_requires_auth(self):
        s = requests.Session()
        files = {"file": ("test.jpg", io.BytesIO(b"\xff\xd8\xff" + b"0" * 100), "image/jpeg")}
        r = s.post(f"{BASE_URL}/api/upload", files=files)
        assert r.status_code in (401, 403)


class TestUploadVideo:
    def test_upload_valid_mp4_accepted(self, session):
        with open(SAMPLE_MP4, "rb") as f:
            data = f.read()
        assert len(data) < 30 * 1024 * 1024
        files = {"file": ("hero_test.mp4", io.BytesIO(data), "video/mp4")}
        r = session.post(f"{BASE_URL}/api/upload", files=files)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "url" in body
        assert isinstance(body["url"], str)
        assert len(body["url"]) > 0

    def test_upload_video_over_30mb_rejected(self, session):
        big_data = b"\x00\x00\x00\x18ftypmp42" + os.urandom(31 * 1024 * 1024)
        files = {"file": ("big_video.mp4", io.BytesIO(big_data), "video/mp4")}
        r = session.post(f"{BASE_URL}/api/upload", files=files)
        assert r.status_code == 400
        body = r.json()
        assert "30" in body.get("detail", "")

    def test_upload_unsupported_extension_rejected(self, session):
        files = {"file": ("malware.exe", io.BytesIO(b"MZ" + b"0" * 200), "application/octet-stream")}
        r = session.post(f"{BASE_URL}/api/upload", files=files)
        assert r.status_code == 400
        body = r.json()
        assert "detail" in body


class TestUploadImageRegression:
    def test_upload_valid_jpg_accepted(self, session):
        # Minimal valid-ish jpg bytes (header only, backend just checks ext+size+PIL for webp conv)
        jpg_bytes = b"\xff\xd8\xff\xe0" + b"0" * 500 + b"\xff\xd9"
        files = {"file": ("photo.jpg", io.BytesIO(jpg_bytes), "image/jpeg")}
        r = session.post(f"{BASE_URL}/api/upload", files=files)
        # Backend may fail webp-conversion but should still store original if PIL fails gracefully,
        # or succeed. We accept 200 as pass; report if not.
        assert r.status_code == 200, r.text
        body = r.json()
        assert "url" in body

    def test_upload_image_over_5mb_rejected(self, session):
        big_data = os.urandom(6 * 1024 * 1024)
        files = {"file": ("big_photo.jpg", io.BytesIO(big_data), "image/jpeg")}
        r = session.post(f"{BASE_URL}/api/upload", files=files)
        assert r.status_code == 400
        body = r.json()
        assert "5" in body.get("detail", "")
