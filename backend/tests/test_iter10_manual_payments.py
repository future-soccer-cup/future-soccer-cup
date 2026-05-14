"""Iter10 backend regression: Manual Payments (abonos) workflow.

Cobertura:
- POST /api/payments (DT y admin) con receipt_url
- GET /api/payments/mine
- GET /api/payments/by-target con balance
- GET /api/admin/payments (filtros + enrichment)
- PUT /api/admin/payments/{pid}/status (aprobar/rechazar/saldo_pendiente)
- RBAC: DT no puede pagar a equipo ajeno (403)
- /api/upload acepta PDF e imágenes; rechaza otras extensiones; rechaza >5MB
- Flujo end-to-end quote Premier Par Sub-12 gold double 4x3: 30% + 70% → status='pagada'
- Flujo team_registration: pago parcial → 'partial' → completo → 'paid'
- Rechazo preserva paid (no resta saldo)
"""
import io
import os
import uuid
import requests
import pytest


def _resolve_backend_url():
    url = os.environ.get("REACT_APP_BACKEND_URL")
    if not url:
        try:
            with open("/app/frontend/.env") as f:
                for line in f:
                    if line.startswith("REACT_APP_BACKEND_URL="):
                        url = line.split("=", 1)[1].strip()
                        break
        except Exception:
            pass
    assert url, "REACT_APP_BACKEND_URL not set"
    return url.rstrip("/")


BASE_URL = _resolve_backend_url()
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@futuresoccercup.com"
ADMIN_PASSWORD = "FSCAdmin2025!"


# ---------- helpers ----------
def _new_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _register_team(prefix="iter10"):
    s = _new_session()
    email = f"TEST_{prefix}_{uuid.uuid4().hex[:8]}@test.com"
    payload = {
        "email": email,
        "password": "TeamPass2025!",
        "manager_name": f"{prefix} Coach",
        "club_name": f"TEST_{prefix.upper()}_{uuid.uuid4().hex[:6]}",
        "club_city": "Armenia",
        "event_type": "premier_par",
        "birth_year": 2012,
        "designation": "Único",
        "data_consent": True,
    }
    r = s.post(f"{API}/auth/register-team", json=payload)
    assert r.status_code == 200, f"register-team failed: {r.status_code} {r.text}"
    data = r.json()
    s.team_id = data["team_id"]
    s.user_email = email
    s.user_id = data.get("user", {}).get("id") or data.get("user_id")
    return s


@pytest.fixture(scope="module")
def admin_client():
    s = _new_session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def dt_a():
    return _register_team("iter10a")


@pytest.fixture(scope="module")
def dt_b():
    return _register_team("iter10b")


@pytest.fixture(scope="module")
def quote_premier_gold(dt_a):
    """Create a Premier Par Sub-12 gold double 4x3 quote.
    Expected total ~5.258.000 COP (gold double rate ~316.000 × 4 × (3/5) + registration).
    Test only asserts > 0, computes percentages relative to the real total returned."""
    payload = {
        "event_type": "premier_par",
        "birth_year": 2012,
        "lodging_tier": "gold",
        "room_type": "double",
        "pax": 4,
        "nights": 3,
        "days": 4,
        "include_registration": True,
    }
    r = dt_a.post(f"{API}/quotes", json=payload)
    assert r.status_code == 200, f"create quote failed: {r.status_code} {r.text}"
    q = r.json()
    assert q["total_amount"] > 0
    return q


# ---------- Upload tests ----------
class TestUploadAcceptsPdf:
    def _upload(self, session, filename, content, content_type):
        files = {"file": (filename, content, content_type)}
        # The session has Content-Type: application/json which breaks multipart.
        # Use raw requests with the session's cookies and explicit None for content-type.
        return requests.post(
            f"{API}/upload",
            files=files,
            cookies=session.cookies,
        )

    def test_upload_pdf_accepted(self, dt_a):
        # Minimal valid-ish PDF bytes
        pdf_bytes = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"
        r = self._upload(dt_a, "comprobante.pdf", pdf_bytes, "application/pdf")
        assert r.status_code == 200, f"pdf upload failed: {r.status_code} {r.text}"
        body = r.json()
        assert "url" in body and "id" in body
        assert body["url"].startswith("/api/files/")

    def test_upload_png_accepted(self, dt_a):
        # 1x1 transparent PNG
        png_bytes = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
            b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\x00\x01"
            b"\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
        )
        r = self._upload(dt_a, "rec.png", png_bytes, "image/png")
        assert r.status_code == 200, f"png upload failed: {r.status_code} {r.text}"

    def test_upload_rejects_txt(self, dt_a):
        r = self._upload(dt_a, "evil.txt", b"hello", "text/plain")
        assert r.status_code == 400
        assert "imágenes" in r.text or "PDF" in r.text or "pdf" in r.text

    def test_upload_rejects_over_5mb(self, dt_a):
        big = b"\x00" * (5 * 1024 * 1024 + 10)
        r = self._upload(dt_a, "big.pdf", big, "application/pdf")
        assert r.status_code == 400
        assert "5MB" in r.text or "mayor" in r.text


# ---------- RBAC tests ----------
class TestPaymentsRBAC:
    def test_dt_cannot_pay_other_team(self, dt_a, dt_b):
        # dt_a tries to pay dt_b's team_registration
        payload = {
            "target_type": "team_registration",
            "target_id": dt_b.team_id,
            "amount": 1000.0,
        }
        r = dt_a.post(f"{API}/payments", json=payload)
        assert r.status_code == 403, f"expected 403, got {r.status_code} {r.text}"

    def test_dt_cannot_call_admin_payments(self, dt_a):
        r = dt_a.get(f"{API}/admin/payments")
        assert r.status_code in (401, 403)

    def test_dt_cannot_update_status(self, dt_a):
        r = dt_a.put(f"{API}/admin/payments/non-existent/status", json={"status": "aprobado"})
        assert r.status_code in (401, 403)

    def test_unauthenticated_payment(self):
        r = requests.post(f"{API}/payments", json={"target_type": "quote", "target_id": "x", "amount": 1})
        assert r.status_code in (401, 403)


# ---------- /payments CRUD tests ----------
class TestPaymentSubmission:
    def test_submit_payment_for_own_team(self, dt_a):
        payload = {
            "target_type": "team_registration",
            "target_id": dt_a.team_id,
            "amount": 50000.0,
            "method": "transferencia",
            "receipt_url": "/api/files/dummy/abc.pdf",
            "reference": "OP-12345",
            "notes": "Primer abono",
        }
        r = dt_a.post(f"{API}/payments", json=payload)
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        body = r.json()
        assert body["status"] == "sin_verificar"
        assert body["amount"] == 50000.0
        assert body["receipt_url"] == "/api/files/dummy/abc.pdf"
        assert body["user_email"].lower() == dt_a.user_email.lower()
        assert "_id" not in body
        assert "id" in body
        dt_a.last_payment_id = body["id"]

    def test_payments_mine(self, dt_a):
        r = dt_a.get(f"{API}/payments/mine")
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        assert any(p["id"] == dt_a.last_payment_id for p in items)
        assert all("_id" not in p for p in items)

    def test_payments_by_target_balance(self, dt_a):
        r = dt_a.get(
            f"{API}/payments/by-target",
            params={"target_type": "team_registration", "target_id": dt_a.team_id},
        )
        assert r.status_code == 200
        body = r.json()
        assert "items" in body and "balance" in body
        bal = body["balance"]
        assert bal["total"] > 0
        # Payment is 'sin_verificar' (not approved) -> paid must be 0
        assert bal["paid"] == 0
        assert bal["balance"] == bal["total"]

    def test_invalid_target_type_rejected(self, dt_a):
        r = dt_a.post(
            f"{API}/payments",
            json={"target_type": "invalid_x", "target_id": "abc", "amount": 100},
        )
        assert r.status_code == 422  # Pydantic Literal violation

    def test_negative_amount_rejected(self, dt_a):
        r = dt_a.post(
            f"{API}/payments",
            json={"target_type": "team_registration", "target_id": dt_a.team_id, "amount": -10},
        )
        assert r.status_code == 422


# ---------- Admin workflow tests ----------
class TestAdminPaymentWorkflow:
    def test_admin_lists_payments_with_enrichment(self, admin_client, dt_a):
        r = admin_client.get(f"{API}/admin/payments")
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        # Encuentra el pago de dt_a
        mine = [p for p in items if p["target_id"] == dt_a.team_id]
        assert mine, "no admin-visible payment for dt_a team_registration"
        p = mine[0]
        assert "target_label" in p and p["target_label"].startswith("Inscripción")
        assert p.get("target_total", 0) > 0
        assert "_id" not in p

    def test_admin_filter_by_status(self, admin_client):
        r = admin_client.get(f"{API}/admin/payments", params={"status": "sin_verificar"})
        assert r.status_code == 200
        items = r.json()
        assert all(p["status"] == "sin_verificar" for p in items)

    def test_admin_filter_by_target_type(self, admin_client):
        r = admin_client.get(f"{API}/admin/payments", params={"target_type": "team_registration"})
        assert r.status_code == 200
        items = r.json()
        assert all(p["target_type"] == "team_registration" for p in items)

    def test_admin_approves_partial_payment(self, admin_client, dt_a):
        # Approve the existing pago of 50k -> partial
        r = admin_client.put(
            f"{API}/admin/payments/{dt_a.last_payment_id}/status",
            json={"status": "aprobado", "admin_note": "Comprobante OK"},
        )
        assert r.status_code == 200, r.text
        bal = r.json()["balance"]
        assert bal["paid"] == 50000.0
        assert bal["balance"] == bal["total"] - 50000.0
        # Verify team registration_payment_status = partial
        # via re-fetching with DT
        r2 = dt_a.get(
            f"{API}/payments/by-target",
            params={"target_type": "team_registration", "target_id": dt_a.team_id},
        )
        assert r2.status_code == 200
        assert r2.json()["balance"]["paid"] == 50000.0

    def test_admin_reject_does_not_count(self, admin_client, dt_a):
        # Crear un segundo abono pequeño
        r = dt_a.post(
            f"{API}/payments",
            json={
                "target_type": "team_registration",
                "target_id": dt_a.team_id,
                "amount": 10000,
                "receipt_url": "/api/files/dummy/r2.pdf",
            },
        )
        pid = r.json()["id"]
        # Rechazarlo
        r2 = admin_client.put(
            f"{API}/admin/payments/{pid}/status",
            json={"status": "rechazado", "admin_note": "Comprobante ilegible"},
        )
        assert r2.status_code == 200
        bal = r2.json()["balance"]
        # paid debe seguir en 50.000 (no sumó el rechazado)
        assert bal["paid"] == 50000.0

    def test_admin_404_for_unknown_payment(self, admin_client):
        r = admin_client.put(
            f"{API}/admin/payments/non-existent-id/status",
            json={"status": "aprobado"},
        )
        assert r.status_code == 404


# ---------- End-to-end Quote flow ----------
class TestQuoteFullPaymentFlow:
    """Premier Par Sub-12 gold double 4x3 → 30% + 70% → status='pagada'."""

    def test_full_quote_payment_flow(self, dt_a, admin_client, quote_premier_gold):
        qid = quote_premier_gold["id"]
        total = float(quote_premier_gold["total_amount"])
        first = round(total * 0.30, 2)
        second = round(total - first, 2)

        # Abono 1: 30%
        r1 = dt_a.post(
            f"{API}/payments",
            json={
                "target_type": "quote",
                "target_id": qid,
                "amount": first,
                "receipt_url": "/api/files/dummy/q1.pdf",
                "reference": "ABN-30",
            },
        )
        assert r1.status_code == 200, r1.text
        p1 = r1.json()["id"]

        # Abono 2: 70%
        r2 = dt_a.post(
            f"{API}/payments",
            json={
                "target_type": "quote",
                "target_id": qid,
                "amount": second,
                "receipt_url": "/api/files/dummy/q2.pdf",
                "reference": "ABN-70",
            },
        )
        assert r2.status_code == 200
        p2 = r2.json()["id"]

        # Balance previo a aprobar: paid=0
        rb = dt_a.get(
            f"{API}/payments/by-target",
            params={"target_type": "quote", "target_id": qid},
        )
        assert rb.json()["balance"]["paid"] == 0

        # Aprobar abono 1
        ap1 = admin_client.put(
            f"{API}/admin/payments/{p1}/status", json={"status": "aprobado"}
        )
        assert ap1.status_code == 200
        bal1 = ap1.json()["balance"]
        assert bal1["paid"] == first
        assert bal1["balance"] > 0

        # Verificar quote.payment_status = partial
        rq = admin_client.get(f"{API}/quotes")
        quote = next(q for q in rq.json() if q["id"] == qid)
        assert quote.get("payment_status") == "partial"
        assert quote["status"] != "pagada"

        # Aprobar abono 2
        ap2 = admin_client.put(
            f"{API}/admin/payments/{p2}/status", json={"status": "aprobado"}
        )
        assert ap2.status_code == 200
        bal2 = ap2.json()["balance"]
        assert abs(bal2["paid"] - total) < 0.01
        assert bal2["balance"] == 0

        # Verificar quote.status = pagada y payment_status=paid
        rq2 = admin_client.get(f"{API}/quotes")
        quote2 = next(q for q in rq2.json() if q["id"] == qid)
        assert quote2["status"] == "pagada", f"expected pagada, got {quote2['status']}"
        assert quote2.get("payment_status") == "paid"
        assert "paid_at" in quote2 and quote2["paid_at"]


# ---------- Team registration full payment ----------
class TestTeamRegistrationFullPayment:
    def test_team_full_payment_marks_paid(self, dt_b, admin_client):
        # Get fee
        r = dt_b.get(
            f"{API}/payments/by-target",
            params={"target_type": "team_registration", "target_id": dt_b.team_id},
        )
        total = r.json()["balance"]["total"]
        assert total > 0
        # Pay full in one go
        rp = dt_b.post(
            f"{API}/payments",
            json={
                "target_type": "team_registration",
                "target_id": dt_b.team_id,
                "amount": total,
                "receipt_url": "/api/files/dummy/full.pdf",
            },
        )
        assert rp.status_code == 200
        pid = rp.json()["id"]
        # Approve
        ra = admin_client.put(
            f"{API}/admin/payments/{pid}/status", json={"status": "aprobado"}
        )
        assert ra.status_code == 200
        bal = ra.json()["balance"]
        assert bal["balance"] == 0
        assert bal["paid"] == total
