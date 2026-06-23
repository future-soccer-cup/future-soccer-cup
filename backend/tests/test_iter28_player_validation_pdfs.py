"""Iter28 - 5 ajustes FSC:
- Validación birth_year (POST/PUT /players)
- Quote PDF con INSCRIPCIÓN breakdown + datos bancarios
- Roster PDF header 'Dorsal'
"""
import os
import uuid
import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
ADMIN_EMAIL = "admin@futuresoccercup.com"
ADMIN_PASS = "FSCAdmin2025!"
EXISTING_QUOTE = "36fb2e35-bcd5-44bd-bee6-5dd3b220073d"


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=15)
    assert r.status_code == 200, f"login admin failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def test_team(admin_session):
    """Use an existing team with birth_year if available, else try to create one."""
    r = admin_session.get(f"{BASE}/api/teams", timeout=15)
    assert r.status_code == 200
    teams = r.json()
    candidate = next((t for t in teams if t.get("birth_year") == 2014), None)
    if not candidate:
        candidate = next((t for t in teams if t.get("birth_year")), None)
    if not candidate:
        # Try to create via API; if not possible (known issue), skip dependent tests
        payload = {"name": f"TEST_iter28_team_{uuid.uuid4().hex[:6]}", "category": "Sub-12", "birth_year": 2014}
        r2 = admin_session.post(f"{BASE}/api/teams", json=payload, timeout=15)
        if r2.status_code in (200, 201):
            candidate = r2.json()
        else:
            pytest.skip(f"No team with birth_year and POST /teams broken: {r2.status_code}")
    assert candidate.get("birth_year"), "team must have birth_year"
    return candidate


def _gen_doc():
    return f"TEST{uuid.uuid4().hex[:8].upper()}"


def test_create_player_older_than_team_rejected(admin_session, test_team):
    """birth_year < team.birth_year → 400"""
    team_year = int(test_team["birth_year"])
    older_year = team_year - 1
    payload = {
        "team_id": test_team["id"],
        "name": "TEST_OlderPlayer Iter28",
        "first_name": "TEST_OlderPlayer",
        "last_name": "Iter28",
        "position": "MED",
        "birth_date": f"{older_year}-05-01",
        "document_id": _gen_doc(),
        "jersey_number": 99,
    }
    r = admin_session.post(f"{BASE}/api/players", json=payload, timeout=15)
    assert r.status_code == 400, f"expected 400 got {r.status_code}: {r.text}"
    detail = (r.json().get("detail") or "").lower()
    assert "mayor" in detail or "categor" in detail, f"unexpected message: {detail}"
    assert str(older_year) in r.json().get("detail", "")


def test_create_player_valid_age_passes(admin_session, test_team):
    """birth_year >= team.birth_year → 200 OK, then cleanup."""
    team_year = int(test_team["birth_year"])
    payload = {
        "team_id": test_team["id"],
        "name": "TEST_OkPlayer Iter28",
        "first_name": "TEST_OkPlayer",
        "last_name": "Iter28",
        "position": "DEF",
        "birth_date": f"{team_year}-03-15",
        "document_id": _gen_doc(),
        "jersey_number": 88,
    }
    r = admin_session.post(f"{BASE}/api/players", json=payload, timeout=15)
    assert r.status_code in (200, 201), f"expected 200 got {r.status_code}: {r.text}"
    data = r.json()
    assert data["birth_date"].startswith(str(team_year))
    pid = data["id"]
    # GET to verify persistence
    r2 = admin_session.get(f"{BASE}/api/players/{pid}", timeout=15)
    assert r2.status_code == 200
    # cleanup
    admin_session.delete(f"{BASE}/api/players/{pid}", timeout=15)


def test_update_player_to_older_rejected(admin_session, test_team):
    """PUT /players/{id} with older birth_year → 400."""
    team_year = int(test_team["birth_year"])
    # Create a valid player first
    create = {
        "team_id": test_team["id"],
        "name": "TEST_UpdPlayer Iter28",
        "first_name": "TEST_UpdPlayer",
        "last_name": "Iter28",
        "position": "DEL",
        "birth_date": f"{team_year}-06-10",
        "document_id": _gen_doc(),
        "jersey_number": 87,
    }
    rc = admin_session.post(f"{BASE}/api/players", json=create, timeout=15)
    assert rc.status_code in (200, 201), rc.text
    pid = rc.json()["id"]
    try:
        upd = dict(create)
        upd["birth_date"] = f"{team_year - 2}-06-10"
        ru = admin_session.put(f"{BASE}/api/players/{pid}", json=upd, timeout=15)
        assert ru.status_code == 400, f"expected 400 got {ru.status_code}: {ru.text}"
        assert "mayor" in (ru.json().get("detail") or "").lower()
    finally:
        admin_session.delete(f"{BASE}/api/players/{pid}", timeout=15)


def test_quote_pdf_contains_inscripcion_and_bank_data(admin_session):
    """GET /api/quotes/{qid}/pdf must include INSCRIPCIÓN and bank data block."""
    # First make sure the quote exists
    rq = admin_session.get(f"{BASE}/api/quotes/{EXISTING_QUOTE}", timeout=15)
    if rq.status_code != 200:
        pytest.skip(f"Quote {EXISTING_QUOTE} not accessible: {rq.status_code}")
    r = admin_session.get(f"{BASE}/api/quotes/{EXISTING_QUOTE}/pdf", timeout=30)
    assert r.status_code == 200, f"pdf endpoint failed: {r.status_code} {r.text[:200]}"
    assert r.headers.get("content-type", "").startswith("application/pdf")
    content = r.content
    assert content[:4] == b"%PDF", "not a PDF"
    assert len(content) > 1000, "pdf too small"
    # Extract text from PDF using pypdf if available, else search raw bytes for required strings
    try:
        from pypdf import PdfReader
        from io import BytesIO
        reader = PdfReader(BytesIO(content))
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
    except ImportError:
        # fallback: decode bytes with errors ignored
        text = content.decode("latin-1", errors="ignore")

    text_lower = text.lower()
    # Normalize: strip non-printable
    assert "inscripci" in text_lower, "PDF missing INSCRIPCIÓN section"
    assert "realiza tu abono" in text_lower, "PDF missing 'REALIZA TU ABONO A:' block"
    assert "bancolombia" in text_lower, "PDF missing 'Bancolombia'"
    assert "247-000006-97" in text, "PDF missing account number"
    assert "ancla" in text_lower, "PDF missing titular 'Grupo Empresarial ANCLA'"
    assert "901.523.952" in text, "PDF missing NIT"


def test_roster_pdf_header_dorsal(admin_session):
    """GET /api/teams/{tid}/roster.pdf should have 'Dorsal' column header."""
    r = admin_session.get(f"{BASE}/api/teams", timeout=15)
    teams = r.json()
    if not teams:
        pytest.skip("no teams in DB")
    # Find one with players for a meaningful test, fallback to first
    tid = None
    for t in teams:
        rp = admin_session.get(f"{BASE}/api/players?team_id={t['id']}", timeout=10)
        if rp.status_code == 200 and len(rp.json() or []) > 0:
            tid = t["id"]
            break
    if not tid:
        tid = teams[0]["id"]
    rr = admin_session.get(f"{BASE}/api/teams/{tid}/roster.pdf", timeout=30)
    assert rr.status_code == 200, rr.text[:300]
    assert rr.content[:4] == b"%PDF"
    try:
        from pypdf import PdfReader
        from io import BytesIO
        reader = PdfReader(BytesIO(rr.content))
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
    except ImportError:
        text = rr.content.decode("latin-1", errors="ignore")
    assert "Dorsal" in text, "Roster PDF must contain header 'Dorsal'"
