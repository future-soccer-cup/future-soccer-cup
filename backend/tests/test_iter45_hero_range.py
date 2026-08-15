"""Iter 45: Verify HTTP Range/206 support and Accept-Ranges header on /api/files/{path}
for the uploaded hero videos, plus presence of new home_settings fields.
"""
import os
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or frontend_env["REACT_APP_BACKEND_URL"]).rstrip("/")


def test_home_settings_has_new_fields():
    r = requests.get(f"{BASE_URL}/api/home-settings", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert data.get("dashboard_hero_video_url"), "dashboard_hero_video_url missing"
    assert data.get("cotizar_hero_video_url"), "cotizar_hero_video_url missing"
    assert data.get("cotizar_summary_bg_url"), "cotizar_summary_bg_url missing"


def _video_url(field):
    s = requests.get(f"{BASE_URL}/api/home-settings", timeout=15).json()
    path = s[field]
    assert path.startswith("/api/files/")
    return f"{BASE_URL}{path}"


def test_dashboard_video_serves_200_with_accept_ranges():
    url = _video_url("dashboard_hero_video_url")
    r = requests.get(url, timeout=30)
    assert r.status_code == 200, f"expected 200 got {r.status_code}"
    assert r.headers.get("content-type", "").startswith("video/"), r.headers.get("content-type")
    assert r.headers.get("accept-ranges", "").lower() == "bytes"
    assert len(r.content) > 1000


def test_cotizar_video_serves_200_with_accept_ranges():
    url = _video_url("cotizar_hero_video_url")
    r = requests.get(url, timeout=30)
    assert r.status_code == 200
    assert r.headers.get("content-type", "").startswith("video/")
    assert r.headers.get("accept-ranges", "").lower() == "bytes"


def test_dashboard_video_range_returns_206():
    url = _video_url("dashboard_hero_video_url")
    r = requests.get(url, headers={"Range": "bytes=0-1023"}, timeout=30)
    assert r.status_code == 206, f"expected 206 got {r.status_code}"
    cr = r.headers.get("content-range", "")
    assert cr.startswith("bytes 0-1023/"), f"unexpected Content-Range: {cr}"
    assert r.headers.get("accept-ranges", "").lower() == "bytes"
    assert len(r.content) == 1024


def test_cotizar_video_range_returns_206():
    url = _video_url("cotizar_hero_video_url")
    r = requests.get(url, headers={"Range": "bytes=0-2047"}, timeout=30)
    assert r.status_code == 206
    assert r.headers.get("content-range", "").startswith("bytes 0-2047/")
    assert len(r.content) == 2048


def test_video_range_mid_file():
    url = _video_url("dashboard_hero_video_url")
    # Get total size via a 1-byte range request
    r0 = requests.get(url, headers={"Range": "bytes=0-0"}, timeout=15)
    assert r0.status_code == 206
    total = int(r0.headers["content-range"].split("/")[-1])
    start = total // 2
    end = start + 1023
    r = requests.get(url, headers={"Range": f"bytes={start}-{end}"}, timeout=30)
    assert r.status_code == 206
    assert r.headers.get("content-range") == f"bytes {start}-{end}/{total}"
    assert len(r.content) == 1024


def test_faststart_moov_at_start():
    """Verify ffmpeg +faststart worked: moov atom must appear near the start of the mp4
    (within the first 128KB) rather than at the tail, so browsers can begin playback early.
    """
    url = _video_url("dashboard_hero_video_url")
    r = requests.get(url, headers={"Range": "bytes=0-131071"}, timeout=30)
    assert r.status_code == 206
    assert b"moov" in r.content, "moov atom not found in first 128KB (faststart failed)"


def test_cotizar_summary_bg_image_serves():
    s = requests.get(f"{BASE_URL}/api/home-settings", timeout=15).json()
    url = f"{BASE_URL}{s['cotizar_summary_bg_url']}"
    r = requests.get(url, timeout=30)
    assert r.status_code == 200
    ct = r.headers.get("content-type", "")
    assert ct.startswith("image/"), ct
