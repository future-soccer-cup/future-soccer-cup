"""
Iter21 — Roles (Directivo / Cuerpo Técnico), register-team con existing_club_id,
/auth/me devuelve manager_role+club_id, gate Cuerpo Técnico en POST /quotes,
flujo aprobación cotización + bloqueo de pago en estado 'pendiente'.
"""
import os
import time
import uuid
import requests
import pytest

def _load_backend_url():
    url = os.environ.get("REACT_APP_BACKEND_URL")
    if not url:
        try:
            with open("/app/frontend/.env") as f:
                for line in f:
                    if line.strip().startswith("REACT_APP_BACKEND_URL="):
                        url = line.split("=", 1)[1].strip().strip('"').strip("'")
                        break
        except FileNotFoundError:
            pass
    if not url:
        raise RuntimeError("REACT_APP_BACKEND_URL not set")
    return url.rstrip("/")


BASE_URL = _load_backend_url()
API = f"{BASE_URL}/api"
ADMIN_EMAIL = "admin@futuresoccercup.com"
ADMIN_PASSWORD = "FSCAdmin2025!"

SUFFIX = uuid.uuid4().hex[:8]


# ---------- Helpers / fixtures ----------

def _new_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_sess():
    s = _new_session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def created_state():
    """Holds ids to clean up later."""
    return {"club_ids": [], "user_emails": [], "team_ids": [], "quote_ids": []}


@pytest.fixture(scope="module")
def approved_club(admin_sess, created_state):
    """Create a Directivo user with new club, admin approves it. Returns club_id, dt session."""
    dt_email = f"directivo_{SUFFIX}@test.com"
    dt_password = "Directivo2025!"
    sess = _new_session()
    payload = {
        "email": dt_email,
        "password": dt_password,
        "manager_name": "Directivo Iter21",
        "manager_phone": "3001112233",
        "manager_role": "Directivo",
        "club_name": f"TEST_iter21 Club {SUFFIX}",
        "club_country": "Colombia",
        "data_consent": True,
    }
    r = sess.post(f"{API}/auth/register-team", json=payload)
    assert r.status_code == 200, f"Directivo register failed: {r.status_code} {r.text}"
    body = r.json()
    assert body["role"] == "team"
    assert body["manager_role"] == "Directivo"
    assert body["club_id"]
    club_id = body["club_id"]
    created_state["club_ids"].append(club_id)
    created_state["user_emails"].append(dt_email)
    if body.get("team_id"):
        created_state["team_ids"].append(body["team_id"])

    # Admin approves the club
    r2 = admin_sess.put(f"{API}/clubs/{club_id}/status", params={"status": "aprobado"})
    assert r2.status_code == 200, f"Club approve failed: {r2.status_code} {r2.text}"
    return {"club_id": club_id, "dt_session": sess, "dt_email": dt_email, "dt_password": dt_password}


# ---------- TESTS ----------

# 1. /auth/register-team CT + existing_club_id (no club_name) → 200, no nuevo club
def test_register_team_cuerpo_tecnico_with_existing_club(admin_sess, approved_club, created_state):
    # Count clubs before
    r_before = admin_sess.get(f"{API}/clubs")
    assert r_before.status_code == 200
    count_before = len(r_before.json())

    ct_email = f"ct_{SUFFIX}@test.com"
    sess = _new_session()
    payload = {
        "email": ct_email,
        "password": "Ct2025!",
        "manager_name": "Cuerpo Tecnico Iter21",
        "manager_role": "Cuerpo Técnico",
        "existing_club_id": approved_club["club_id"],
        "data_consent": True,
    }
    r = sess.post(f"{API}/auth/register-team", json=payload)
    assert r.status_code == 200, f"CT register failed: {r.status_code} {r.text}"
    body = r.json()
    assert body["manager_role"] == "Cuerpo Técnico"
    assert body["club_id"] == approved_club["club_id"]
    assert body.get("team_id") is None
    created_state["user_emails"].append(ct_email)

    # Count clubs after — debe ser IGUAL (no se creó club nuevo)
    r_after = admin_sess.get(f"{API}/clubs")
    assert r_after.status_code == 200
    count_after = len(r_after.json())
    assert count_after == count_before, f"Club count diff: before={count_before} after={count_after}"


# 2. Directivo nuevo (sin existing_club_id, con club_name) → crea club pendiente
def test_register_team_directivo_creates_club(admin_sess, created_state):
    email = f"directivo2_{SUFFIX}@test.com"
    sess = _new_session()
    payload = {
        "email": email,
        "password": "Directivo2025!",
        "manager_name": "Directivo 2 Iter21",
        "manager_role": "Directivo",
        "club_name": f"TEST_iter21 ClubB {SUFFIX}",
        "club_country": "Colombia",
        "data_consent": True,
    }
    r = sess.post(f"{API}/auth/register-team", json=payload)
    assert r.status_code == 200, f"Directivo register failed: {r.status_code} {r.text}"
    body = r.json()
    assert body["manager_role"] == "Directivo"
    cid = body["club_id"]
    assert cid
    created_state["club_ids"].append(cid)
    created_state["user_emails"].append(email)

    # Verify club exists with status 'pendiente'
    r2 = admin_sess.get(f"{API}/clubs/{cid}")
    assert r2.status_code == 200
    assert r2.json()["status"] == "pendiente"


# 3. CT sin existing_club_id ni club_name → 400
def test_register_team_ct_missing_club_returns_400():
    sess = _new_session()
    payload = {
        "email": f"ct_fail_{SUFFIX}@test.com",
        "password": "Ct2025!",
        "manager_name": "CT Fail",
        "manager_role": "Cuerpo Técnico",
        "data_consent": True,
    }
    r = sess.post(f"{API}/auth/register-team", json=payload)
    assert r.status_code == 400, f"Expected 400 got {r.status_code} {r.text}"
    assert "club" in r.json()["detail"].lower()


# 4. existing_club_id inexistente → 400
def test_register_team_invalid_existing_club_id_returns_400():
    sess = _new_session()
    payload = {
        "email": f"ct_invalid_{SUFFIX}@test.com",
        "password": "Ct2025!",
        "manager_name": "CT Invalid",
        "manager_role": "Cuerpo Técnico",
        "existing_club_id": "non-existent-club-id-xyz",
        "data_consent": True,
    }
    r = sess.post(f"{API}/auth/register-team", json=payload)
    assert r.status_code == 400
    assert "no existe" in r.json()["detail"].lower()


# 5. /auth/me devuelve manager_role y club_id para CT y Directivo
def test_auth_me_returns_manager_role_and_club_id(approved_club):
    # Directivo
    sess_d = approved_club["dt_session"]
    rd = sess_d.get(f"{API}/auth/me")
    assert rd.status_code == 200
    body_d = rd.json()
    assert body_d["manager_role"] == "Directivo"
    assert body_d["club_id"] == approved_club["club_id"]

    # CT — login fresh
    ct_email = f"ct_{SUFFIX}@test.com"
    sess_ct = _new_session()
    rl = sess_ct.post(f"{API}/auth/login", json={"email": ct_email, "password": "Ct2025!"})
    assert rl.status_code == 200, f"CT login failed: {rl.status_code} {rl.text}"
    rct = sess_ct.get(f"{API}/auth/me")
    assert rct.status_code == 200
    body_ct = rct.json()
    assert body_ct["manager_role"] == "Cuerpo Técnico"
    assert body_ct["club_id"] == approved_club["club_id"]


# ---------- Helpers for quote payload ----------

def _quote_payload():
    return {
        "event_type": "festival",
        "birth_year": 2013,
        "lodging_tier": "paquete_1",
        "pax": 18,
        "nights": 5,
        "days": 6,
        "include_registration": False,
        "extra_pax_entries": [],
        "transport_entries": [],
        "tour_entries": [],
    }


# 6a. POST /quotes con CT → 403
def test_post_quote_ct_returns_403(approved_club, created_state):
    ct_email = f"ct_{SUFFIX}@test.com"
    sess = _new_session()
    rl = sess.post(f"{API}/auth/login", json={"email": ct_email, "password": "Ct2025!"})
    assert rl.status_code == 200
    r = sess.post(f"{API}/quotes", json=_quote_payload())
    assert r.status_code == 403, f"Expected 403 got {r.status_code} {r.text}"
    msg = r.json()["detail"]
    assert "Directivo" in msg


# 6b. POST /quotes con Directivo aprobado → 200 status='pendiente'
def test_post_quote_directivo_returns_200_pendiente(approved_club, created_state):
    sess = approved_club["dt_session"]
    r = sess.post(f"{API}/quotes", json=_quote_payload())
    assert r.status_code == 200, f"Directivo quote failed: {r.status_code} {r.text}"
    body = r.json()
    assert body["status"] == "pendiente"
    qid = body["id"]
    created_state["quote_ids"].append(qid)
    created_state["_quote_id"] = qid


# 7. PUT /quotes/{qid}/status?status=aprobada (admin)
def test_admin_approves_quote_then_owner_sees_aprobada(admin_sess, approved_club, created_state):
    qid = created_state["_quote_id"]
    r = admin_sess.put(f"{API}/quotes/{qid}/status", params={"status": "aprobada"})
    assert r.status_code == 200, f"Approve quote failed: {r.status_code} {r.text}"

    # Owner sees aprobada
    sess = approved_club["dt_session"]
    r2 = sess.get(f"{API}/quotes/{qid}")
    assert r2.status_code == 200
    assert r2.json()["status"] == "aprobada"


# 8a. /payments/checkout/session con quote.status='pendiente' → 400
# 8b. con 'aprobada' → NOT 400 (puede ser 200 o 500 si Stripe falla)
def test_payment_session_blocked_on_pendiente_and_allowed_on_aprobada(admin_sess, approved_club, created_state):
    sess = approved_club["dt_session"]

    # Crear segunda cotización para probar caso 'pendiente' fresh
    r_new = sess.post(f"{API}/quotes", json=_quote_payload())
    assert r_new.status_code == 200
    qid_pending = r_new.json()["id"]
    created_state["quote_ids"].append(qid_pending)

    # Intentar pagar pendiente → 400
    pay_payload = {
        "kind": "quote",
        "quote_id": qid_pending,
        "origin_url": BASE_URL,
    }
    r_p = sess.post(f"{API}/payments/checkout/session", json=pay_payload)
    assert r_p.status_code == 400, f"Expected 400 on pendiente, got {r_p.status_code} {r_p.text}"
    assert "aprobad" in r_p.json()["detail"].lower()

    # Aprobar y reintentar → NO debe ser 400 con ese mensaje
    r_app = admin_sess.put(f"{API}/quotes/{qid_pending}/status", params={"status": "aprobada"})
    assert r_app.status_code == 200

    r_p2 = sess.post(f"{API}/payments/checkout/session", json=pay_payload)
    # Acepta 200, 500, 502, 503; NO 400-blocked
    if r_p2.status_code == 400:
        body = r_p2.json()
        assert "aprobad" not in body.get("detail", "").lower(), \
            f"Should not block aprobada quote: {body}"
    # Else: pass (no 400-blocked)


# 9. PUT /quotes/{qid} (owner edit) sobre quote aprobada → resetea status a 'pendiente'
def test_owner_edit_aprobada_resets_to_pendiente(admin_sess, approved_club, created_state):
    qid = created_state["_quote_id"]  # ya aprobada en test_7
    # Confirmar que está aprobada
    sess = approved_club["dt_session"]
    r_before = sess.get(f"{API}/quotes/{qid}")
    assert r_before.status_code == 200
    assert r_before.json()["status"] == "aprobada"

    # Owner edit con payload modificado
    new_payload = _quote_payload()
    new_payload["pax"] = 22  # cambio
    r_edit = sess.put(f"{API}/quotes/{qid}", json=new_payload)
    assert r_edit.status_code == 200, f"Owner edit failed: {r_edit.status_code} {r_edit.text}"
    assert r_edit.json()["status"] == "pendiente"

    # GET posterior confirma
    r_after = sess.get(f"{API}/quotes/{qid}")
    assert r_after.status_code == 200
    assert r_after.json()["status"] == "pendiente"


# ---------- Cleanup (best effort) ----------

def test_zzz_cleanup(admin_sess, created_state):
    # Delete quotes
    for qid in created_state.get("quote_ids", []):
        admin_sess.delete(f"{API}/quotes/{qid}")
    # Delete teams (admin endpoint)
    for tid in created_state.get("team_ids", []):
        admin_sess.delete(f"{API}/admin/teams/{tid}")
    # Delete clubs
    for cid in created_state.get("club_ids", []):
        admin_sess.delete(f"{API}/admin/clubs/{cid}")
    # Users — no endpoint público de borrado; quedan como TEST_*
    assert True
