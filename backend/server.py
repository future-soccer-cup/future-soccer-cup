from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
import uuid
import bcrypt
import jwt
import secrets
import requests
import re
import csv
import io
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Query, UploadFile, File
from fastapi.responses import Response as FastAPIResponse, StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from openpyxl import load_workbook, Workbook
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest

# -------------------- Categories --------------------
CATEGORIES = ["Sub-8", "Sub-10", "Sub-12", "Sub-14", "Sub-16", "Sub-18"]

# -------------------- Event Types & Lodging Tiers --------------------
# Precios en COP (Pesos Colombianos)
EVENT_TYPES = {
    "festival": {
        "id": "festival",
        "name": "Festival",
        "description": "Evento temático para iniciación. Octubre.",
        "birth_years": [2013, 2014, 2015, 2016, 2017, 2018],
        "dates": "Octubre",
        "fees_by_year": {
            "2013": 2400000.0,
            "2014": 2400000.0,
            "2015": 2300000.0,
            "2016": 2300000.0,
            "2017": 2300000.0,
            "2018": 2300000.0,
        },
        "registration_fee_per_team": 2400000.0,  # fallback
    },
    "premier_par": {
        "id": "premier_par",
        "name": "Premier Par",
        "description": "Premier elite. Diciembre. Años pares.",
        "birth_years": [2010, 2012, 2014, 2016, 2018],
        "dates": "Diciembre",
        "fees_by_year": {
            "2010": 3200000.0,
            "2012": 3200000.0,
            "2014": 2800000.0,
            "2016": 2600000.0,
            "2018": 2600000.0,
        },
        "registration_fee_per_team": 2800000.0,
    },
    "premier_impar": {
        "id": "premier_impar",
        "name": "Premier Impar",
        "description": "Premier elite. Diciembre. Años impares.",
        "birth_years": [2009, 2011, 2013, 2015, 2017],
        "dates": "Diciembre",
        "fees_by_year": {
            "2009": 3200000.0,
            "2011": 3200000.0,
            "2013": 2800000.0,
            "2015": 2600000.0,
            "2017": 2600000.0,
        },
        "registration_fee_per_team": 2800000.0,
    },
}

# Designaciones por club/categoría
TEAM_DESIGNATIONS = ["Único", "Equipo A", "Equipo B"]

# Paquetes de hospedaje (VALORES PARA WEB - PDF oficial 2026).
# Precio por persona: paquete normal de 5 noches + costo por noche adicional.
# Los nombres de hoteles internos no se exponen al cliente: solo el paquete.
LODGING_TIERS = {
    "sapphire": {"id": "sapphire", "name": "Sapphire", "description": "Hotel dentro del complejo deportivo. Incluye alojamiento, alimentación, restaurante y parqueadero privado.",
                 "includes": ["Acomodación múltiple", "5 Desayunos", "4 Almuerzos", "5 Cenas", "Restaurante dentro del complejo", "Parqueadero privado", "Piscinas semiolímpicas", "Piscina para niños", "Acuaparque (toboganes y piscina para bebés)", "5 canchas de fútbol 11", "3 canchas de fútbol 8", "2 canchas de fútbol 5", "Tenis de campo (7 canchas)", "Voleibol y baloncesto", "Minitejo cubierto y tejo abierto", "Salón de juegos", "Tirolina y muro escalador", "Bicicleta acuática y lago", "Sendero ecológico", "Bolera"],
                 "base_5_nights": 1320000, "additional_night": 264000, "available": True},
    "diamond":  {"id": "diamond",  "name": "Diamond",  "description": "A 12 minutos de la sede deportiva. Incluye alojamiento, alimentación, piscina, restaurante y jacuzzi.",
                 "includes": ["Acomodación múltiple", "5 Desayunos", "4 Almuerzos", "5 Cenas", "Piscina", "Restaurante", "Jacuzzi", "Salón de juegos (billar, pin pon, juegos de mesa)", "Zona Wi-Fi", "Parqueadero privado"],
                 "base_5_nights": 1280000, "additional_night": 256000, "available": True},
    "gold":     {"id": "gold",     "name": "Gold",     "description": "A 5 minutos de la sede deportiva. Villa para 13/14 personas con piscina privada, cocina, comedor y sala.",
                 "includes": ["Acomodación múltiple", "Villa para 13/14 personas", "Piscina privada", "Cocina, comedor y sala", "5 habitaciones con baño privado", "Zona de lavandería", "5 Desayunos", "4 Almuerzos", "5 Cenas", "Restaurante dentro del hotel", "Wi-Fi fibra óptica 24 horas", "Capilla y salón de eventos"],
                 "base_5_nights": 1130000, "additional_night": 226000, "available": True},
    "silver":   {"id": "silver",   "name": "Silver",   "description": "A 5 minutos de la sede deportiva. Incluye alojamiento, alimentación, piscina, jacuzzi y fonda típica.",
                 "includes": ["Acomodación múltiple", "5 Desayunos", "4 Almuerzos", "5 Cenas", "Alimentación dentro del hotel", "Piscina", "Jacuzzi", "Turco", "Fonda típica", "Sala de juegos", "Parqueadero privado"],
                 "base_5_nights":  960000, "additional_night": 192000, "available": True},
    "bronze":   {"id": "bronze",   "name": "Bronze",   "description": "A 25 minutos de la sede deportiva. Incluye alojamiento, alimentación, piscina, salón de juegos y restaurante.",
                 "includes": ["Acomodación múltiple", "5 Desayunos", "4 Almuerzos", "5 Cenas", "Parqueadero privado", "Piscina", "Salón de juegos", "Restaurante"],
                 "base_5_nights":  800000, "additional_night": 160000, "available": True},
    "domicilio":{"id": "domicilio","name": "Domicilio","description": "Sin hospedaje. El equipo se aloja en viviendas particulares y solo paga las comidas adicionales que requiera por fecha.",
                 "includes": ["Sin hospedaje incluido", "Alimentación opcional por fecha y número de personas", "Acceso al evento deportivo"],
                 "base_5_nights": 0,       "additional_night": 0,       "available": True, "no_lodging": True},
}

# Planes de alimentación POR PERSONA POR DÍA en COP, por paquete (PDF oficial).
# value 0 => "N/A" (no disponible para ese paquete).
MEAL_PLANS = {
    "breakfast": {"id": "breakfast", "name": "Desayuno", "per_day_by_tier": {
        "sapphire": 25000, "diamond": 20000, "gold": 28000, "silver": 21000, "bronze": 18000, "domicilio": 21000,
    }},
    "lunch":     {"id": "lunch",     "name": "Almuerzo", "per_day_by_tier": {
        "sapphire": 35000, "diamond": 41000, "gold": 38000, "silver": 0,     "bronze": 23000, "domicilio": 25000,
    }},
    "dinner":    {"id": "dinner",    "name": "Cena",     "per_day_by_tier": {
        "sapphire": 41000, "diamond": 38000, "gold": 33000, "silver": 23000, "bronze": 23000, "domicilio": 25000,
    }},
}

# Transporte POR PERSONA por trayecto (PDF oficial 2026).
TRANSPORT_ROUTES = {
    "airport_to_hotel":   {"id": "airport_to_hotel",   "name": "Aeropuerto → Hotel",        "price": 16000},
    "hotel_to_airport":   {"id": "hotel_to_airport",   "name": "Hotel → Aeropuerto",        "price": 16000},
    "hotel_to_courts":    {"id": "hotel_to_courts",    "name": "Hotel ↔ Canchas (ida y vuelta)", "price": 16000},
}

# Tours/Recreación POR PERSONA en COP (PDF oficial 2026).
TOURS_CATALOG = {
    "parque_del_cafe": {"id": "parque_del_cafe", "name": "Parque del Café", "price": 99000},
}

# Configuración del evento (días fijos del torneo)
EVENT_NIGHTS = 5
EVENT_DAYS = 6

# Compat: ADDON_PRICES legacy - mantenido para no romper viejas pantallas
ADDON_PRICES = {
    "transport": 100000.0,
    "parque":    140000.0,
    "tour":      110000.0,
}

CURRENCY = "cop"

# -------------------- Object Storage --------------------
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
APP_NAME = os.environ.get("APP_NAME", "future-soccer-cup")
_storage_key: Optional[str] = None

def init_storage() -> Optional[str]:
    global _storage_key
    if _storage_key:
        return _storage_key
    key = os.environ.get("EMERGENT_LLM_KEY")
    if not key:
        return None
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": key}, timeout=30)
        resp.raise_for_status()
        _storage_key = resp.json()["storage_key"]
        return _storage_key
    except Exception as e:
        logging.error(f"Storage init failed: {e}")
        return None

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if not key:
        raise HTTPException(status_code=503, detail="Almacenamiento no disponible")
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120,
    )
    if resp.status_code == 403:
        # refresh key
        global _storage_key
        _storage_key = None
        key = init_storage()
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data, timeout=120,
        )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str):
    key = init_storage()
    if not key:
        raise HTTPException(status_code=503, detail="Almacenamiento no disponible")
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60,
    )
    if resp.status_code == 403:
        global _storage_key
        _storage_key = None
        key = init_storage()
        resp = requests.get(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key}, timeout=60,
        )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

MIME = {
    # Bitmap / common
    "jpg": "image/jpeg", "jpeg": "image/jpeg",
    "png": "image/png",
    "gif": "image/gif",
    "webp": "image/webp",
    "bmp": "image/bmp",
    "tif": "image/tiff", "tiff": "image/tiff",
    "heic": "image/heic", "heif": "image/heif",
    "svg": "image/svg+xml",
    # RAW formats (most camera makers)
    "raw": "image/x-panasonic-rw2", "cr2": "image/x-canon-cr2", "cr3": "image/x-canon-cr3",
    "nef": "image/x-nikon-nef", "arw": "image/x-sony-arw", "dng": "image/x-adobe-dng",
    "orf": "image/x-olympus-orf", "rw2": "image/x-panasonic-rw2", "raf": "image/x-fuji-raf",
    "pef": "image/x-pentax-pef", "srw": "image/x-samsung-srw",
    # Document
    "pdf": "application/pdf",
}

# Logo en caché global para evitar descargar el archivo remoto en CADA generación de PDF (era el principal cuello de botella).
FSC_LOGO_URL = "https://customer-assets.emergentagent.com/job_dd2523b3-e20b-4cc5-9d6d-534c6d02a185/artifacts/y4ulg6l9_FUTRE%20SOCCER%20CUP%202025_Mesa%20de%20trabajo%201.png"
_LOGO_CACHE = {"bytes": None, "tried": False}

def _get_fsc_logo_bytes():
    if _LOGO_CACHE["bytes"] is not None or _LOGO_CACHE["tried"]:
        return _LOGO_CACHE["bytes"]
    try:
        import httpx
        r = httpx.get(FSC_LOGO_URL, timeout=2.0)
        if r.status_code == 200:
            _LOGO_CACHE["bytes"] = r.content
    except Exception:
        pass
    _LOGO_CACHE["tried"] = True
    return _LOGO_CACHE["bytes"]


# -------------------- Setup --------------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_ALGORITHM = "HS256"

def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

app = FastAPI(title="Future Soccer Cup API")
api = APIRouter(prefix="/api")

# -------------------- Helpers --------------------
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id, "email": email, "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=60),
        "type": "access"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, httponly=True, secure=True, samesite="none", max_age=3600, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=True, samesite="none", max_age=604800, path="/")

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        h = request.headers.get("Authorization", "")
        if h.startswith("Bearer "):
            token = h[7:]
    if not token:
        raise HTTPException(status_code=401, detail="No autenticado")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Token inválido")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Usuario no encontrado")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores")
    return user


async def _record_audit(entity_type: str, entity_id: str, action: str, prev_status: Optional[str], new_status: Optional[str], user: dict, note: str = "") -> dict:
    """Persist an audit-trail entry (Ley 1581) and return the metadata to merge into the target doc."""
    now = datetime.now(timezone.utc).isoformat()
    actor = {
        "reviewed_by_user_id": user.get("id", ""),
        "reviewed_by_email": user.get("email", ""),
        "reviewed_by_name": user.get("name", ""),
        "reviewed_at": now,
        "reviewed_status": new_status or "",
    }
    if note:
        actor["reviewed_note"] = note
    log_entry = {
        "id": str(uuid.uuid4()),
        "entity_type": entity_type,
        "entity_id": entity_id,
        "action": action,
        "previous_status": prev_status or "",
        "new_status": new_status or "",
        "note": note or "",
        "user_id": user.get("id", ""),
        "user_email": user.get("email", ""),
        "user_name": user.get("name", ""),
        "created_at": now,
    }
    await db.audit_log.insert_one(log_entry)
    return actor

async def require_admin_or_team(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") not in ("admin", "team"):
        raise HTTPException(status_code=403, detail="Solo administradores o equipos")
    return user

# -------------------- Password Reset --------------------
class ForgotPasswordIn(BaseModel):
    email: EmailStr

class ResetPasswordIn(BaseModel):
    email: EmailStr
    code: str = Field(min_length=4, max_length=12)
    new_password: str = Field(min_length=6)


def _generate_reset_code() -> str:
    return "".join(secrets.choice("0123456789") for _ in range(8))


@api.post("/auth/forgot-password")
async def forgot_password(payload: ForgotPasswordIn):
    """Crea un código de reset de 8 dígitos. Por seguridad responde igual exista o no el usuario."""
    email = payload.email.lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if user:
        code = _generate_reset_code()
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(hours=24)
        # Invalidate any prior pending codes for this email
        await db.password_resets.update_many(
            {"email": email, "status": "pending"},
            {"$set": {"status": "expired"}},
        )
        await db.password_resets.insert_one({
            "id": str(uuid.uuid4()),
            "email": email,
            "user_id": user["id"],
            "user_name": user.get("name", ""),
            "code": code,
            "status": "pending",
            "created_at": now.isoformat(),
            "expires_at": expires_at.isoformat(),
        })
    return {"ok": True, "message": "Si el correo existe, se generó un código de recuperación. Solicítaselo al administrador."}


@api.post("/auth/reset-password")
async def reset_password(payload: ResetPasswordIn):
    email = payload.email.lower()
    code = payload.code.strip()
    reset = await db.password_resets.find_one(
        {"email": email, "code": code, "status": "pending"}, {"_id": 0}
    )
    if not reset:
        raise HTTPException(status_code=400, detail="Código inválido o expirado")
    expires_at = datetime.fromisoformat(reset["expires_at"])
    now = datetime.now(timezone.utc)
    if expires_at < now:
        await db.password_resets.update_one({"id": reset["id"]}, {"$set": {"status": "expired"}})
        raise HTTPException(status_code=400, detail="Código vencido. Solicita uno nuevo.")

    # Update password and mark code as used
    new_hash = hash_password(payload.new_password)
    await db.users.update_one({"email": email}, {"$set": {"password_hash": new_hash}})
    await db.password_resets.update_one(
        {"id": reset["id"]},
        {"$set": {"status": "used", "used_at": now.isoformat()}},
    )
    return {"ok": True, "message": "Contraseña actualizada"}


@api.get("/admin/password-resets")
async def list_password_resets(_: dict = Depends(require_admin)):
    """Lista códigos de reset pendientes para que el admin los entregue al usuario."""
    items = await db.password_resets.find({"status": "pending"}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return items


@api.post("/admin/password-resets/{rid}/cancel")
async def cancel_password_reset(rid: str, _: dict = Depends(require_admin)):
    res = await db.password_resets.update_one({"id": rid, "status": "pending"}, {"$set": {"status": "cancelled"}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Código no encontrado")
    return {"ok": True}

# -------------------- Models --------------------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)
    data_consent: bool = False

class TeamRegisterIn(BaseModel):
    # Team manager + Club info, all in one payload
    email: EmailStr
    password: str = Field(min_length=6)
    manager_name: str = Field(min_length=1)
    manager_phone: Optional[str] = ""
    manager_role: Optional[str] = "Director técnico"
    manager_document: Optional[str] = ""
    # Club info (created if doesn't exist) — solo para rol "Directivo"
    # Si el rol es "Cuerpo Técnico" se debe enviar existing_club_id (no club_name).
    club_name: Optional[str] = None
    existing_club_id: Optional[str] = None
    club_country: Optional[str] = "Colombia"
    club_city: Optional[str] = ""
    club_phone: Optional[str] = ""
    club_email: Optional[str] = ""
    club_website: Optional[str] = ""
    logo_url: Optional[str] = ""
    color: Optional[str] = "#1d4ed8"
    # First team registered with the club (OPCIONAL — si no se envía, solo se crea el club)
    event_type: Optional[str] = None
    birth_year: Optional[int] = None
    designation: Optional[Literal["Único", "Equipo A", "Equipo B"]] = "Único"
    data_consent: bool = False

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str

# -------- Venues (canchas / escenarios deportivos) --------
class VenueIn(BaseModel):
    name: str = Field(min_length=1)
    city: Optional[str] = ""
    address: Optional[str] = ""
    notes: Optional[str] = ""

class VenueOut(VenueIn):
    id: str
    created_at: str

# -------- Clubs --------
class ClubIn(BaseModel):
    name: str = Field(min_length=1)
    country: Optional[str] = "Colombia"
    city: Optional[str] = ""
    phone: Optional[str] = ""
    email: Optional[str] = ""
    website: Optional[str] = ""
    logo_url: Optional[str] = ""
    color: Optional[str] = "#1d4ed8"

class ClubOut(ClubIn):
    id: str
    status: str
    manager_user_id: Optional[str] = ""
    created_at: str
    image_name: Optional[str] = ""
    reviewed_by_user_id: Optional[str] = None
    reviewed_by_email: Optional[str] = None
    reviewed_by_name: Optional[str] = None
    reviewed_at: Optional[str] = None
    reviewed_status: Optional[str] = None

class TeamIn(BaseModel):
    name: str  # Visible name = "{ClubName} {Año} {Designation}"
    club_id: Optional[str] = ""
    category: Optional[str] = ""  # Legacy "Sub-X" (kept for backwards compat)
    birth_year: Optional[int] = None  # Año de nacimiento (ej. 2014)
    designation: Optional[str] = "Único"
    coach: Optional[str] = ""
    city: Optional[str] = ""
    country: Optional[str] = ""
    president: Optional[str] = ""
    delegate_phone: Optional[str] = ""
    logo_url: Optional[str] = ""
    color: Optional[str] = "#1d4ed8"
    group_name: Optional[str] = ""  # Grupo A, Grupo B, Unigrupo
    cuerpo_tecnico: Optional[List[dict]] = []  # [{name, document, role, doc_type}]
    event_type: Optional[str] = ""  # festival | premier_par | premier_impar
    registration_fee: Optional[float] = 0.0
    registration_payment_status: Optional[str] = "pending"  # pending | paid | waived

class TeamOut(TeamIn):
    id: str
    created_at: str
    # Audit-trail (Ley 1581). Optional to keep response-shape stable for older docs.
    reviewed_by_user_id: Optional[str] = None
    reviewed_by_email: Optional[str] = None
    reviewed_by_name: Optional[str] = None
    reviewed_at: Optional[str] = None
    reviewed_status: Optional[str] = None
    # Estado de aprobación + nuevos campos del flujo Tournament+Category.
    status: Optional[str] = None
    tournament_id: Optional[str] = None
    tournament_name: Optional[str] = None
    club_name: Optional[str] = None
    manager_user_id: Optional[str] = None

class PlayerIn(BaseModel):
    name: str
    team_id: str
    jersey_number: int
    position: str  # Portero, Defensa, Mediocampista, Delantero
    birth_date: str  # ISO date
    photo_url: Optional[str] = ""
    document_id: Optional[str] = ""
    nickname: Optional[str] = ""
    gender: Optional[str] = ""  # M / F
    eps: Optional[str] = ""
    comet_number: Optional[str] = ""  # Número COMET (federación)
    guardian_name: Optional[str] = ""
    guardian_doc: Optional[str] = ""
    guardian_relation: Optional[str] = ""
    guardian_phone: Optional[str] = ""

class PlayerOut(PlayerIn):
    id: str
    created_at: str
    reviewed_by_user_id: Optional[str] = None
    reviewed_by_email: Optional[str] = None
    reviewed_by_name: Optional[str] = None
    reviewed_at: Optional[str] = None
    reviewed_status: Optional[str] = None

class TournamentIn(BaseModel):
    name: str
    season: str  # e.g., 2025
    category: str  # categoría principal (compat). Para múltiples usar `categories`.
    # Lista de categorías con su costo de inscripción independiente
    categories: Optional[List[dict]] = []  # [{name: "Sub-12", fee: 250000}, ...]
    start_date: str
    end_date: str
    # Tipo de torneo dentro de FSC (opcional)
    event_type: Optional[str] = ""  # "festival" | "premier_par" | "premier_impar" | ""
    # Formato del torneo
    fmt: Optional[Literal["round_robin", "cuadrangular_x2", "eliminacion"]] = "round_robin"
    # Marca torneos históricos / archivados (no entran al stats live por defecto)
    archived: Optional[bool] = False
    # Torneo destacado en Home (solo uno a la vez idealmente, no enforced).
    featured: Optional[bool] = False
    # Ciudad / sede / cover_url para mostrar en Home
    city: Optional[str] = ""
    venue: Optional[str] = ""
    cover_url: Optional[str] = ""

class TournamentOut(TournamentIn):
    id: str

class TournamentUpdateIn(BaseModel):
    name: Optional[str] = None
    season: Optional[str] = None
    category: Optional[str] = None
    categories: Optional[List[dict]] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    event_type: Optional[str] = None
    fmt: Optional[Literal["round_robin", "cuadrangular_x2", "eliminacion"]] = None
    archived: Optional[bool] = None
    featured: Optional[bool] = None
    city: Optional[str] = None
    venue: Optional[str] = None
    cover_url: Optional[str] = None

class MatchIn(BaseModel):
    tournament_id: str
    home_team_id: str
    away_team_id: str
    match_date: str  # ISO datetime
    venue: Optional[str] = ""
    group_name: Optional[str] = ""
    matchday: Optional[int] = None  # Jornada (Fecha 1, Fecha 2, ...)
    stage: Optional[str] = "grupos"  # grupos, octavos, cuartos, semis, final
    # Tipo de partido (regular o intergrupos para garantizar 4 partidos en cuadrangulares)
    match_type: Optional[Literal["regular", "intergrupo"]] = "regular"
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    status: Optional[str] = "programado"  # programado, en_curso, finalizado

class MatchOut(MatchIn):
    id: str

class MatchResultIn(BaseModel):
    home_score: int
    away_score: int
    scorers: Optional[List[dict]] = []  # [{player_id, team_id, minute}]
    cards: Optional[List[dict]] = []  # [{player_id, team_id, type: 'yellow'|'red', minute}]
    home_fair_play: Optional[int] = 0
    away_fair_play: Optional[int] = 0
    winner_team_id: Optional[str] = None  # required for ties in bracket matches

class FixtureGenerateIn(BaseModel):
    tournament_id: str  # Obligatorio: el fixture nace asociado a un Evento.
    category: str
    group_name: str
    team_ids: List[str]
    start_date: str  # YYYY-MM-DD
    days_between_rounds: int = 7
    venues: List[str] = []
    time_slots: List[str] = []  # ["08:00", "09:30"]
    rounds: int = 1  # 1 = una vuelta, 2 = ida y vuelta, etc.
    # Reglas deportivas (puntos + Juego Limpio) — opcional. Si vienen, sobreescriben
    # la configuración de la categoría dentro del torneo.
    points_win: Optional[int] = None
    points_draw: Optional[int] = None
    points_loss: Optional[int] = None
    fairplay_base: Optional[int] = None
    fairplay_yellow: Optional[int] = None
    fairplay_red: Optional[int] = None
    fairplay_other: Optional[int] = None
    # Doble jornada: dos jornadas el mismo día (mañana + tarde). Cada equipo juega 2 veces/día.
    # Cuando es True: la jornada r usa el slot time_slots[r % len(time_slots)] (alternando),
    # y dos jornadas consecutivas (r y r+1) caen en la misma fecha.
    double_matchday: bool = False
    preview: bool = False  # If true, do not save


class MatchUpdateIn(BaseModel):
    """Edición manual de un partido programado (fecha, hora, cancha, etc.)."""
    match_date: Optional[str] = None
    venue: Optional[str] = None
    matchday: Optional[int] = Field(default=None, gt=0)
    group_name: Optional[str] = None
    stage: Optional[Literal["grupos", "octavos", "cuartos", "semis", "final", "treintaidosavos"]] = None
    match_type: Optional[Literal["regular", "intergrupo"]] = None
    home_team_id: Optional[str] = None
    away_team_id: Optional[str] = None
    status: Optional[Literal["programado", "en_curso", "finalizado", "cancelado"]] = None

class QuoteMealEntry(BaseModel):
    date: str            # YYYY-MM-DD
    # Nuevo: id del meal_addon creado por el admin. Si viene, prioriza sobre meal_type.
    meal_addon_id: Optional[str] = ""
    # Legacy: tipo de comida (breakfast/lunch/dinner) usando matriz por tier.
    meal_type: Optional[Literal["breakfast", "lunch", "dinner"]] = None
    # ge=0: permitimos que el DT escriba 0 sin romper la cotización (se ignora la línea).
    pax: int = Field(ge=0)


class QuoteTourEntry(BaseModel):
    tour_id: str
    # ge=0: permitimos que el DT escriba 0 sin romper la cotización (se ignora la línea).
    pax: int = Field(ge=0)


class QuoteIn(BaseModel):
    # === LEGACY scalars (mantenidos para compatibilidad con cotizaciones antiguas) ===
    event_type: Optional[str] = "festival"  # legacy single event_type
    birth_year: Optional[int] = None
    category: Optional[str] = ""  # legacy
    tournament_id: Optional[str] = None
    tournament_name: Optional[str] = None
    categories: Optional[List[dict]] = []  # legacy single-event categories
    lodging_tier: Optional[str] = ""  # legacy single tier
    room_type: Optional[str] = ""  # legacy, no longer used for pricing
    pax: Optional[int] = 0  # legacy single pax
    nights: int = Field(default=5, ge=1)
    days: int = Field(default=6, ge=1)
    extra_pax_entries: Optional[List[dict]] = []  # legacy global extra pax

    # === NUEVO modelo multi-eventos / multi-paquetes ===
    # events: lista de eventos a cotizar. Cada uno con sus categorías inscritas.
    # Cada entry: {tournament_id, tournament_name, event_type, categories: [{name, fee, fee_usd?}]}
    events: Optional[List[dict]] = []
    # lodgings: lista de paquetes a cotizar. Cada uno con su pax/nights y bloques de personas adicionales.
    # Cada entry: {tier_id, pax, nights, extra_pax_entries: [{label, pax, nights, date_from, date_to}]}
    lodgings: Optional[List[dict]] = []
    # Moneda en la que se calcula el TOTAL: "COP" (default) o "USD".
    currency: Optional[Literal["COP", "USD"]] = "COP"
    # Alimentación incluida en el paquete: 5 desayunos + 4 almuerzos + 5 cenas.
    # Estos toggles agregan comidas **adicionales** (llegadas tempranas, días extra)
    # multiplicadas por `meal_days` cuando no se usa meal_entries.
    includes_breakfast: bool = False
    includes_lunch: bool = False
    includes_dinner: bool = False
    meal_days: Optional[int] = None  # defaults to days
    # Para conservar compat: lista de rutas seleccionadas (ids).
    transport_routes: Optional[List[str]] = []
    # Nuevo: rutas con cantidad y fecha (toma precedencia si está presente).
    transport_entries: Optional[List[dict]] = []  # [{route_id, pax, date}]
    # Para Domicilio: alimentación específica por fecha + pax (más granular que pax × days).
    meal_entries: Optional[List[QuoteMealEntry]] = []
    # Transporte
    transport_routes: Optional[List[str]] = []  # ids de TRANSPORT_ROUTES
    # Tours: ahora cada uno con pax independiente (puede que solo parte del equipo vaya).
    tour_entries: Optional[List[QuoteTourEntry]] = []
    tour_ids: Optional[List[str]] = []  # legacy (asume pax del paquete)
    # Inscripción equipo (opcional al cotizar)
    include_registration: bool = True
    # Compat con flujo anterior (deprecated)
    includes_transport: bool = False
    includes_parque: bool = False
    includes_tour: bool = False
    notes: Optional[str] = ""
    contact_phone: Optional[str] = ""
    # === Otros cobros (manual, admin/director) ===
    other_charges_amount: Optional[float] = 0.0
    other_charges_concept: Optional[str] = ""

class PostIn(BaseModel):
    title: str
    content: str
    image_url: Optional[str] = ""
    instagram_url: Optional[str] = ""
    category: Optional[str] = "evento"  # evento, resultado, anuncio, foto

class PostOut(PostIn):
    id: str
    published_at: str
    created_at: str

class HotelIn(BaseModel):
    name: str
    description: str
    address: Optional[str] = ""
    price_per_night: float
    image_url: Optional[str] = ""
    amenities: Optional[List[str]] = []
    capacity: Optional[int] = 4
    tier: Optional[str] = ""  # diamond | gold | silver | bronze (opcional)
    stars: Optional[int] = 0

class HotelOut(HotelIn):
    id: str

class TransportIn(BaseModel):
    name: str
    description: str
    type: str  # bus, van, taxi
    price: float
    image_url: Optional[str] = ""
    capacity: Optional[int] = 10

class TransportOut(TransportIn):
    id: str

class TourIn(BaseModel):
    name: str
    description: str
    duration: str
    price: float
    image_url: Optional[str] = ""

class TourOut(TourIn):
    id: str

# -------------------- Auth --------------------
@api.post("/auth/register")
async def register(payload: RegisterIn, response: Response):
    """⛔ Endpoint deshabilitado: solo se permiten cuentas de Director Técnico (POST /auth/register-team)."""
    raise HTTPException(
        status_code=403,
        detail="El registro de cuentas familiares fue deshabilitado. Solo los directores técnicos pueden registrarse.",
    )

@api.post("/auth/register-team")
async def register_team(payload: TeamRegisterIn, response: Response):
    email = payload.email.lower()
    if not payload.data_consent:
        raise HTTPException(status_code=400, detail="Debes aceptar el tratamiento de datos personales para continuar.")
    # event_type/birth_year son opcionales — si vienen, validamos. Si no, registramos solo el club.
    event = None
    if payload.event_type:
        event = EVENT_TYPES.get(payload.event_type)
        if not event:
            raise HTTPException(status_code=400, detail="Tipo de evento inválido")
        if payload.birth_year is not None and payload.birth_year not in event["birth_years"]:
            raise HTTPException(status_code=400, detail=f"El año {payload.birth_year} no aplica al {event['name']}. Años válidos: {event['birth_years']}")
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="El correo ya está registrado")

    user_id = str(uuid.uuid4())
    team_id = str(uuid.uuid4()) if event and payload.birth_year else None
    now = datetime.now(timezone.utc).isoformat()

    # 1) Find or create Club
    # - Si existing_club_id viene: el user (Cuerpo Técnico) se vincula a ese club; NO se crea uno nuevo.
    # - Si NO: el rol es Directivo y se crea/encuentra el club por nombre.
    if payload.existing_club_id:
        club = await db.clubs.find_one({"id": payload.existing_club_id}, {"_id": 0})
        if not club:
            raise HTTPException(status_code=400, detail="El club seleccionado no existe")
        club_id = club["id"]
        club_name_norm = club["name"]
    else:
        if not payload.club_name or not payload.club_name.strip():
            raise HTTPException(status_code=400, detail="El nombre del club es obligatorio para registrar como Directivo")
        club_name_norm = payload.club_name.strip()
        club = await db.clubs.find_one({"name": {"$regex": f"^{club_name_norm}$", "$options": "i"}}, {"_id": 0})
        if not club:
            club_id = str(uuid.uuid4())
            club = {
                "id": club_id,
                "name": club_name_norm,
                "country": payload.club_country or "Colombia",
                "city": payload.club_city or "",
                "phone": payload.club_phone or "",
                "email": payload.club_email or email,
                "website": payload.club_website or "",
                "logo_url": payload.logo_url or "",
                "color": payload.color or "#1d4ed8",
                "status": "pendiente",
                "manager_user_id": user_id,
                "created_at": now,
            }
            await db.clubs.insert_one(club)
            club.pop("_id", None)
        else:
            club_id = club["id"]

    # 2) Compute registration fee from event + birth_year (solo si hay evento)
    fee = 0.0
    if event and payload.birth_year:
        fee = float(event.get("fees_by_year", {}).get(str(payload.birth_year), event["registration_fee_per_team"]))

    # 3) Create team (SOLO si event_type + birth_year fueron suministrados)
    team_doc = None
    if event and payload.birth_year:
        visible_name = f"{club_name_norm} {payload.birth_year} {payload.designation}".strip()
        team_doc = {
            "id": team_id,
            "name": visible_name,
            "club_id": club_id,
            "club_name": club_name_norm,
            "birth_year": payload.birth_year,
            "designation": payload.designation or "Único",
            "category": f"Año {payload.birth_year}",
            "coach": payload.manager_name,
            "city": payload.club_city or "",
            "country": payload.club_country or "Colombia",
            "logo_url": payload.logo_url or "",
            "color": payload.color or "#1d4ed8",
            "manager_user_id": user_id,
            "status": "pendiente",
            "event_type": payload.event_type,
            "registration_fee": fee,
            "registration_payment_status": "pending",
            "cuerpo_tecnico": [],
            "created_at": now,
        }
    user_doc = {
        "id": user_id,
        "email": email,
        "name": payload.manager_name,
        "phone": payload.manager_phone or "",
        "role": "team",
        "manager_role": payload.manager_role or "Director técnico",
        "document": payload.manager_document or "",
        "team_id": team_id,
        "club_id": club_id,
        "password_hash": hash_password(payload.password),
        "data_consent": True,
        "consent_at": now,
        "created_at": now,
    }
    if team_doc:
        await db.teams.insert_one(team_doc)
    await db.users.insert_one(user_doc)

    access = create_access_token(user_id, email, "team")
    refresh = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh)
    return {
        "id": user_id, "email": email, "name": payload.manager_name,
        "role": "team", "team_id": team_id,
        "manager_role": payload.manager_role or "",
        "club_id": club_id,
    }

@api.post("/auth/login")
async def login(payload: LoginIn, request: Request, response: Response):
    email = payload.email.lower()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"

    attempts_doc = await db.login_attempts.find_one({"identifier": identifier})
    if attempts_doc:
        if attempts_doc.get("locked_until"):
            try:
                lu = datetime.fromisoformat(attempts_doc["locked_until"])
                if lu > datetime.now(timezone.utc):
                    raise HTTPException(status_code=429, detail="Demasiados intentos. Espere 15 minutos.")
            except ValueError:
                pass

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        # increment attempts
        new_count = (attempts_doc.get("count", 0) if attempts_doc else 0) + 1
        update = {"count": new_count, "identifier": identifier}
        if new_count >= 5:
            update["locked_until"] = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
        await db.login_attempts.update_one({"identifier": identifier}, {"$set": update}, upsert=True)
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    await db.login_attempts.delete_one({"identifier": identifier})
    access = create_access_token(user["id"], user["email"], user["role"])
    refresh = create_refresh_token(user["id"])
    set_auth_cookies(response, access, refresh)
    return {
        "id": user["id"], "email": user["email"], "name": user["name"], "role": user["role"],
        "team_id": user.get("team_id"),
        "manager_role": user.get("manager_role", ""),
        "club_id": user.get("club_id"),
    }

@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}

@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return {
        "id": user["id"], "email": user["email"], "name": user["name"],
        "role": user["role"], "team_id": user.get("team_id"),
        "manager_role": user.get("manager_role", ""),
        "club_id": user.get("club_id"),
    }

@api.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    rt = request.cookies.get("refresh_token")
    if not rt:
        raise HTTPException(status_code=401, detail="Sin refresh token")
    try:
        payload = jwt.decode(rt, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Token inválido")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Usuario no encontrado")
        access = create_access_token(user["id"], user["email"], user["role"])
        response.set_cookie("access_token", access, httponly=True, secure=True, samesite="none", max_age=3600, path="/")
        return {"ok": True}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Refresh inválido")

# -------------------- Teams --------------------
@api.get("/teams", response_model=List[TeamOut])
async def list_teams(category: Optional[str] = None, status: Optional[str] = None, request: Request = None):
    q = {}
    if category:
        q["category"] = category
    # Public endpoint: by default show only approved teams (legacy teams without status field also visible)
    is_admin = False
    try:
        token = request.cookies.get("access_token") if request else None
        if token:
            payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
            user_doc = await db.users.find_one({"id": payload["sub"]}, {"role": 1})
            is_admin = user_doc and user_doc.get("role") == "admin"
    except Exception:
        pass
    if status and is_admin:
        q["status"] = status
    elif not is_admin:
        q["$or"] = [{"status": "aprobado"}, {"status": {"$exists": False}}]
    items = await db.teams.find(q, {"_id": 0}).sort("name", 1).to_list(500)
    return items

@api.get("/teams/{team_id}", response_model=TeamOut)
async def get_team(team_id: str):
    t = await db.teams.find_one({"id": team_id}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    return t

@api.post("/teams", response_model=TeamOut)
async def create_team(payload: TeamIn, _: dict = Depends(require_admin)):
    if not (payload.category or '').strip():
        raise HTTPException(status_code=400, detail="La categoría es obligatoria")
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["status"] = "aprobado"
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.teams.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.get("/teams/{team_id}/roster.pdf")
async def team_roster_pdf(team_id: str, user: dict = Depends(get_current_user)):
    """PDF profesional con cuerpo técnico + jugadores del equipo. Accesible admin o usuarios del club."""
    team = await db.teams.find_one({"id": team_id}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    # Permisos
    if user.get("role") != "admin":
        if user.get("role") != "team":
            raise HTTPException(status_code=403, detail="No autorizado")
        same_team = user.get("team_id") == team_id
        same_club = user.get("club_id") and team.get("club_id") == user.get("club_id")
        if not (same_team or same_club):
            raise HTTPException(status_code=403, detail="No autorizado")

    players = await db.players.find({"team_id": team_id}, {"_id": 0}).sort("jersey_number", 1).to_list(200)
    staff = team.get("cuerpo_tecnico") or []
    club_doc = await db.clubs.find_one({"id": team.get("club_id")}, {"_id": 0, "name": 1, "logo_url": 1}) if team.get("club_id") else None
    home = await db.home_settings.find_one({"id": HOME_SETTINGS_ID}, {"_id": 0}) or {}
    contact_email = home.get("contact_email") or "info@futuresoccercup.com"
    contact_phone = home.get("contact_phone") or "+57 (000) 000-0000"
    instagram = home.get("instagram") or ""
    facebook = home.get("facebook") or ""

    logo_bytes = _get_fsc_logo_bytes()

    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_LEFT, TA_RIGHT
    from reportlab.lib import colors
    from reportlab.lib.units import inch
    from reportlab.platypus import BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle
    from io import BytesIO

    BRAND_BLUE = colors.HexColor("#0640c8")
    BRAND_DARK = colors.HexColor("#0a1426")
    LIGHT = colors.HexColor("#f5f8ff")
    BORDER = colors.HexColor("#cbd5e1")
    EMERALD = colors.HexColor("#059669")

    styles = getSampleStyleSheet()
    H2 = ParagraphStyle("H2", parent=styles["Heading2"], fontSize=11, textColor=BRAND_BLUE, leading=14, spaceBefore=12, spaceAfter=4, fontName="Helvetica-Bold")
    N = ParagraphStyle("N", parent=styles["Normal"], fontSize=8.5, leading=11)
    SMALL = ParagraphStyle("SMALL", parent=N, fontSize=7.5, textColor=colors.grey, leading=10)

    buf = BytesIO()

    def _hf(canvas, doc_):
        canvas.saveState()
        canvas.setFillColor(BRAND_DARK)
        canvas.rect(0, letter[1] - 1.1 * inch, letter[0], 1.1 * inch, fill=1, stroke=0)
        if logo_bytes:
            try:
                from reportlab.lib.utils import ImageReader
                canvas.drawImage(ImageReader(BytesIO(logo_bytes)), 0.5 * inch, letter[1] - 1.0 * inch, width=0.9 * inch, height=0.9 * inch, preserveAspectRatio=True, mask='auto')
            except Exception:
                pass
        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica-Bold", 18)
        canvas.drawString(1.55 * inch, letter[1] - 0.55 * inch, "FUTURE SOCCER CUP")
        canvas.setFont("Helvetica-Oblique", 10)
        canvas.setFillColor(colors.HexColor("#9bb6ff"))
        canvas.drawString(1.55 * inch, letter[1] - 0.78 * inch, "Somos más que un torneo")
        canvas.setFont("Helvetica-Bold", 9)
        canvas.drawRightString(letter[0] - 0.5 * inch, letter[1] - 0.55 * inch, "ROSTER OFICIAL")
        canvas.setFillColor(BRAND_BLUE)
        canvas.rect(0, letter[1] - 1.13 * inch, letter[0], 0.03 * inch, fill=1, stroke=0)
        # Footer
        canvas.setFillColor(BRAND_BLUE)
        canvas.rect(0, 0, letter[0], 0.55 * inch, fill=1, stroke=0)
        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica-Bold", 8)
        canvas.drawString(0.5 * inch, 0.34 * inch, contact_email)
        canvas.setFont("Helvetica", 8)
        canvas.drawString(0.5 * inch, 0.18 * inch, contact_phone)
        social_parts = []
        if instagram: social_parts.append(f"IG: {instagram}")
        if facebook: social_parts.append(f"FB: {facebook}")
        if social_parts:
            canvas.drawRightString(letter[0] - 0.5 * inch, 0.34 * inch, "  ·  ".join(social_parts))
        canvas.setFont("Helvetica-Oblique", 7)
        canvas.drawRightString(letter[0] - 0.5 * inch, 0.18 * inch, f"www.futuresoccercup.com  ·  Generado {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')} UTC")
        canvas.restoreState()

    doc = BaseDocTemplate(buf, pagesize=letter, leftMargin=0.5 * inch, rightMargin=0.5 * inch, topMargin=1.25 * inch, bottomMargin=0.7 * inch)
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="main")
    doc.addPageTemplates([PageTemplate(id="default", frames=[frame], onPage=_hf)])

    story = []
    # Estilos dedicados para el banner del equipo (evita superposición de fuentes mixtas)
    BANNER_LABEL = ParagraphStyle("RBANNER_LABEL", parent=N, fontSize=9, textColor=colors.HexColor("#9bb6ff"), leading=11)
    BANNER_BIG = ParagraphStyle("RBANNER_BIG", parent=N, fontSize=18, textColor=colors.white, fontName="Helvetica-Bold", leading=22)
    BANNER_MED = ParagraphStyle("RBANNER_MED", parent=N, fontSize=14, textColor=colors.white, fontName="Helvetica-Bold", leading=17)

    # Banner del equipo
    left_cell = [
        Paragraph("<b>EQUIPO</b>", BANNER_LABEL),
        Paragraph(f"{team.get('name','—')}", BANNER_BIG),
        Spacer(1, 2),
        Paragraph(f"Categoría: {team.get('category','—')}  ·  Año: {team.get('birth_year') or '—'}", BANNER_LABEL),
    ]
    right_cell = [
        Paragraph("Club", BANNER_LABEL),
        Paragraph(f"{(club_doc or {}).get('name') or team.get('club_name') or '—'}", BANNER_MED),
        Spacer(1, 2),
        Paragraph(f"{team.get('city') or ''}", BANNER_LABEL),
    ]
    banner = Table([[left_cell, right_cell]], colWidths=[4.0 * inch, 3.5 * inch])
    banner.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BRAND_DARK),
        ("LEFTPADDING", (0, 0), (-1, -1), 12), ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 10), ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(banner)

    # === Cuerpo Técnico ===
    story.append(Paragraph(f"CUERPO TÉCNICO ({len(staff)})", H2))
    if staff:
        data = [["Nombre", "Rol", "Documento", "N° COMET", "Teléfono"]]
        for s in staff:
            data.append([
                s.get("name") or "—",
                s.get("role") or "—",
                s.get("document") or "—",
                s.get("comet_number") or "—",
                s.get("phone") or "—",
            ])
        t = Table(data, colWidths=[2.2 * inch, 1.6 * inch, 1.4 * inch, 1.1 * inch, 1.2 * inch], repeatRows=1)
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), EMERALD),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0fdf4")]),
            ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
            ("LINEBELOW", (0, 0), (-1, 0), 0.5, colors.white),
            ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(t)
    else:
        story.append(Paragraph("<i>Sin cuerpo técnico registrado.</i>", SMALL))

    # === Jugadores ===
    story.append(Paragraph(f"JUGADORES ({len(players)})", H2))
    if players:
        CELL = ParagraphStyle("CELL", parent=N, fontSize=7.5, leading=9)
        CELL_C = ParagraphStyle("CELL_C", parent=CELL, alignment=TA_LEFT)
        data = [["#", "Nombre", "Apodo", "Pos.", "Doc.", "N° COMET", "F. nac.", "EPS"]]
        for p in players:
            data.append([
                str(p.get("jersey_number") or ""),
                Paragraph(p.get("name") or "—", CELL_C),
                Paragraph(p.get("nickname") or "—", CELL_C),
                Paragraph(p.get("position") or "—", CELL_C),
                Paragraph(p.get("document_id") or "—", CELL_C),
                Paragraph(p.get("comet_number") or "—", CELL_C),
                Paragraph(p.get("birth_date") or "—", CELL_C),
                Paragraph(p.get("eps") or "—", CELL_C),
            ])
        col_widths = [0.35 * inch, 1.55 * inch, 0.85 * inch, 1.05 * inch, 0.95 * inch, 0.85 * inch, 0.85 * inch, 1.05 * inch]
        t = Table(data, colWidths=col_widths, repeatRows=1)
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), BRAND_BLUE),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 8),
            ("ALIGN", (0, 0), (0, -1), "CENTER"),
            ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 1), (0, -1), 8),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT]),
            ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
            ("LINEBELOW", (0, 0), (-1, 0), 0.5, colors.white),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 4), ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
        story.append(t)
    else:
        story.append(Paragraph("<i>Sin jugadores registrados.</i>", SMALL))

    story.append(Spacer(1, 14))
    story.append(Paragraph(
        "Roster oficial generado por la plataforma FUTURE SOCCER CUP. Los datos personales se manejan bajo la Ley 1581 de 2012.",
        SMALL
    ))

    doc.build(story)
    pdf_bytes = buf.getvalue()
    buf.close()
    from fastapi.responses import Response
    safe_name = "".join(c for c in (team.get("name") or "equipo") if c.isalnum() or c in "-_")[:50] or "equipo"
    return Response(content=pdf_bytes, media_type="application/pdf", headers={
        "Content-Disposition": f"attachment; filename=roster_{safe_name}.pdf"
    })

    doc["status"] = "aprobado"  # Admin-created teams are auto-approved
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.teams.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.put("/teams/{team_id}", response_model=TeamOut)
async def update_team(team_id: str, payload: TeamIn, user: dict = Depends(get_current_user)):
    if user.get("role") == "team":
        target = await db.teams.find_one({"id": team_id}, {"_id": 0, "club_id": 1})
        if not target:
            raise HTTPException(status_code=404, detail="Equipo no encontrado")
        same_team = user.get("team_id") == team_id
        same_club = user.get("club_id") and target.get("club_id") == user["club_id"]
        if not (same_team or same_club):
            raise HTTPException(status_code=403, detail="Solo puedes editar equipos de tu club")
    elif user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    if not (payload.category or '').strip():
        raise HTTPException(status_code=400, detail="La categoría es obligatoria")
    res = await db.teams.update_one({"id": team_id}, {"$set": payload.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    t = await db.teams.find_one({"id": team_id}, {"_id": 0})
    return t

@api.patch("/teams/{team_id}/name")
async def update_team_name(team_id: str, payload: dict, user: dict = Depends(get_current_user)):
    """Edición parcial — actualiza SOLO el nombre del equipo sin afectar club_id, tournament_id,
    birth_year, cuerpo_tecnico ni demás campos. Admin o cualquier usuario del mismo club."""
    target = await db.teams.find_one({"id": team_id}, {"_id": 0, "club_id": 1})
    if not target:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    if user.get("role") != "admin":
        if user.get("role") != "team":
            raise HTTPException(status_code=403, detail="No autorizado")
        same_team = user.get("team_id") == team_id
        same_club = user.get("club_id") and target.get("club_id") == user["club_id"]
        if not (same_team or same_club):
            raise HTTPException(status_code=403, detail="Solo puedes editar equipos de tu club")
    new_name = (payload.get("name") or "").strip()
    if not new_name:
        raise HTTPException(status_code=400, detail="El nombre del equipo es obligatorio")
    await db.teams.update_one({"id": team_id}, {"$set": {"name": new_name}})
    t = await db.teams.find_one({"id": team_id}, {"_id": 0})
    return t

@api.patch("/teams/{team_id}/staff")
async def update_team_staff(team_id: str, payload: dict, user: dict = Depends(get_current_user)):
    """Actualiza el array completo `cuerpo_tecnico` del equipo. Admin o usuarios del mismo club."""
    target = await db.teams.find_one({"id": team_id}, {"_id": 0, "club_id": 1})
    if not target:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    if user.get("role") != "admin":
        if user.get("role") != "team":
            raise HTTPException(status_code=403, detail="No autorizado")
        same_team = user.get("team_id") == team_id
        same_club = user.get("club_id") and target.get("club_id") == user["club_id"]
        if not (same_team or same_club):
            raise HTTPException(status_code=403, detail="Solo puedes editar equipos de tu club")
    staff = payload.get("cuerpo_tecnico")
    if not isinstance(staff, list):
        raise HTTPException(status_code=400, detail="cuerpo_tecnico debe ser una lista")
    await db.teams.update_one({"id": team_id}, {"$set": {"cuerpo_tecnico": staff}})
    t = await db.teams.find_one({"id": team_id}, {"_id": 0})
    return t

@api.delete("/teams/{team_id}")
async def delete_team(team_id: str, _: dict = Depends(require_admin)):
    res = await db.teams.delete_one({"id": team_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    await db.players.delete_many({"team_id": team_id})
    return {"ok": True}

# -------------------- Players --------------------
@api.get("/players", response_model=List[PlayerOut])
async def list_players(team_id: Optional[str] = None, status: Optional[str] = None, request: Request = None):
    q = {}
    if team_id:
        q["team_id"] = team_id
    is_admin = False
    is_team = False
    user_team_id = None
    user_club_id = None
    user_id = None
    try:
        token = request.cookies.get("access_token") if request else None
        if token:
            payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
            user_id = payload["sub"]
            user_doc = await db.users.find_one({"id": user_id}, {"role": 1, "team_id": 1, "club_id": 1})
            if user_doc:
                is_admin = user_doc.get("role") == "admin"
                if user_doc.get("role") == "team":
                    is_team = True
                    user_team_id = user_doc.get("team_id")
                    user_club_id = user_doc.get("club_id")
    except Exception:
        pass
    # Admin: ve TODOS los jugadores (cualquier status). Si se pasa ?status=X, se filtra por ese status.
    if is_admin:
        if status:
            q["status"] = status
        # else: sin filtro → todos
    # Team manager: ve jugadores PENDIENTES y APROBADOS de cualquier equipo de SU club.
    # Si se filtra por team_id concreto, ese debe pertenecer a su club (o ser su propio team).
    elif is_team:
        if team_id and team_id == user_team_id:
            pass  # acceso directo
        elif team_id and user_club_id:
            # Verificar que team_id pertenece al club del usuario.
            t_doc = await db.teams.find_one({"id": team_id}, {"_id": 0, "club_id": 1})
            if not t_doc or t_doc.get("club_id") != user_club_id:
                q["$or"] = [{"status": "aprobado"}, {"status": {"$exists": False}}]
        elif not team_id and user_club_id:
            # Sin team_id explícito: limitar a equipos del club del usuario.
            team_ids_club = [t["id"] async for t in db.teams.find({"club_id": user_club_id}, {"_id": 0, "id": 1})]
            if team_ids_club:
                q["team_id"] = {"$in": team_ids_club}
            else:
                q["$or"] = [{"status": "aprobado"}, {"status": {"$exists": False}}]
        elif not team_id:
            q["$or"] = [{"status": "aprobado"}, {"status": {"$exists": False}}]
    else:
        # Public: only approved
        q["$or"] = [{"status": "aprobado"}, {"status": {"$exists": False}}]
    items = await db.players.find(q, {"_id": 0}).sort("jersey_number", 1).to_list(2000)
    return items

@api.get("/players/{player_id}", response_model=PlayerOut)
async def get_player(player_id: str):
    p = await db.players.find_one({"id": player_id}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Jugador no encontrado")
    return p

@api.post("/players", response_model=PlayerOut)
async def create_player(payload: PlayerIn, user: dict = Depends(require_admin_or_team)):
    team = await db.teams.find_one({"id": payload.team_id})
    if not team:
        raise HTTPException(status_code=400, detail="Equipo inválido")
    # Permite a cualquier usuario del CLUB (Directivo o Cuerpo Técnico) gestionar jugadores de cualquier
    # equipo de su club. El check antiguo de team_id se mantiene como fallback.
    if user["role"] == "team":
        same_club = user.get("club_id") and team.get("club_id") == user["club_id"]
        same_team = user.get("team_id") and user["team_id"] == payload.team_id
        if not (same_club or same_team):
            raise HTTPException(status_code=403, detail="Solo puedes agregar jugadores a equipos de tu club")
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["status"] = "aprobado" if user["role"] == "admin" else "pendiente"
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.players.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.put("/players/{player_id}", response_model=PlayerOut)
async def update_player(player_id: str, payload: PlayerIn, user: dict = Depends(require_admin_or_team)):
    existing = await db.players.find_one({"id": player_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Jugador no encontrado")
    if user["role"] == "team":
        cur_team = await db.teams.find_one({"id": existing["team_id"]}, {"_id": 0, "club_id": 1})
        new_team = await db.teams.find_one({"id": payload.team_id}, {"_id": 0, "club_id": 1})
        user_club = user.get("club_id")
        if not (user_club and cur_team and new_team and cur_team.get("club_id") == user_club and new_team.get("club_id") == user_club):
            raise HTTPException(status_code=403, detail="Solo puedes editar jugadores de equipos de tu club")
    await db.players.update_one({"id": player_id}, {"$set": payload.model_dump()})
    p = await db.players.find_one({"id": player_id}, {"_id": 0})
    return p

@api.delete("/players/{player_id}")
async def delete_player(player_id: str, user: dict = Depends(require_admin_or_team)):
    existing = await db.players.find_one({"id": player_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Jugador no encontrado")
    if user["role"] == "team":
        t = await db.teams.find_one({"id": existing["team_id"]}, {"_id": 0, "club_id": 1})
        if not (user.get("club_id") and t and t.get("club_id") == user["club_id"]):
            raise HTTPException(status_code=403, detail="Solo puedes eliminar jugadores de equipos de tu club")
    await db.players.delete_one({"id": player_id})
    return {"ok": True}

# -------------------- Approval Workflows --------------------
@api.put("/teams/{team_id}/status")
async def set_team_status(team_id: str, status: str, user: dict = Depends(require_admin)):
    if status not in {"pendiente", "aprobado", "rechazado"}:
        raise HTTPException(status_code=400, detail="Estado inválido")
    prev = await db.teams.find_one({"id": team_id}, {"_id": 0, "status": 1})
    if not prev:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    actor = await _record_audit("team", team_id, "status_change", prev.get("status"), status, user)
    await db.teams.update_one({"id": team_id}, {"$set": {"status": status, **actor}})
    return {"ok": True}

@api.put("/players/{player_id}/status")
async def set_player_status(player_id: str, status: str, user: dict = Depends(require_admin)):
    if status not in {"pendiente", "aprobado", "rechazado"}:
        raise HTTPException(status_code=400, detail="Estado inválido")
    prev = await db.players.find_one({"id": player_id}, {"_id": 0, "status": 1})
    if not prev:
        raise HTTPException(status_code=404, detail="Jugador no encontrado")
    actor = await _record_audit("player", player_id, "status_change", prev.get("status"), status, user)
    await db.players.update_one({"id": player_id}, {"$set": {"status": status, **actor}})
    return {"ok": True}

# -------------------- Tournaments --------------------
@api.get("/tournaments", response_model=List[TournamentOut])
async def list_tournaments(archived: Optional[bool] = None):
    q = {}
    if archived is not None:
        q["archived"] = archived
    items = await db.tournaments.find(q, {"_id": 0}).sort("start_date", -1).to_list(200)
    # Backfill defaults para torneos antiguos sin estos campos
    for t in items:
        t.setdefault("event_type", "")
        t.setdefault("fmt", "round_robin")
        t.setdefault("archived", False)
        t.setdefault("featured", False)
        t.setdefault("city", "")
        t.setdefault("venue", "")
        t.setdefault("cover_url", "")
        t.setdefault("categories", [])
    return items

@api.post("/tournaments", response_model=TournamentOut)
async def create_tournament(payload: TournamentIn, _: dict = Depends(require_admin)):
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    await db.tournaments.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.put("/tournaments/{tid}", response_model=TournamentOut)
async def update_tournament(tid: str, payload: TournamentUpdateIn, _: dict = Depends(require_admin)):
    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Nada que actualizar")
    res = await db.tournaments.update_one({"id": tid}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    t = await db.tournaments.find_one({"id": tid}, {"_id": 0})
    t.setdefault("event_type", "")
    t.setdefault("fmt", "round_robin")
    t.setdefault("archived", False)
    t.setdefault("featured", False)
    t.setdefault("city", "")
    t.setdefault("venue", "")
    t.setdefault("cover_url", "")
    t.setdefault("categories", [])
    return t

@api.delete("/tournaments/{tid}")
async def delete_tournament(tid: str, _: dict = Depends(require_admin)):
    await db.tournaments.delete_one({"id": tid})
    return {"ok": True}


# -------------------- Venues / Canchas --------------------
@api.get("/venues", response_model=List[VenueOut])
async def list_venues():
    items = await db.venues.find({}, {"_id": 0}).sort("name", 1).to_list(500)
    return items

@api.post("/venues", response_model=VenueOut)
async def create_venue(payload: VenueIn, _: dict = Depends(require_admin)):
    doc = payload.dict()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.venues.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.put("/venues/{vid}", response_model=VenueOut)
async def update_venue(vid: str, payload: VenueIn, _: dict = Depends(require_admin)):
    upd = {k: v for k, v in payload.dict().items() if v is not None}
    res = await db.venues.update_one({"id": vid}, {"$set": upd})
    if res.matched_count == 0:
        raise HTTPException(404, "Cancha no encontrada")
    doc = await db.venues.find_one({"id": vid}, {"_id": 0})
    return doc

@api.delete("/venues/{vid}")
async def delete_venue(vid: str, _: dict = Depends(require_admin)):
    await db.venues.delete_one({"id": vid})
    return {"ok": True}


# -------------------- Matches --------------------
@api.get("/matches")
async def list_matches(tournament_id: Optional[str] = None, status: Optional[str] = None):
    q = {}
    if tournament_id:
        q["tournament_id"] = tournament_id
    if status:
        q["status"] = status
    items = await db.matches.find(q, {"_id": 0}).sort("match_date", 1).to_list(2000)
    # enrich with team names
    team_ids = list({m["home_team_id"] for m in items} | {m["away_team_id"] for m in items})
    teams = await db.teams.find({"id": {"$in": team_ids}}, {"_id": 0}).to_list(1000)
    tmap = {t["id"]: t for t in teams}
    for m in items:
        ht = tmap.get(m["home_team_id"], {})
        at = tmap.get(m["away_team_id"], {})
        m["home_team_name"] = ht.get("name", "—")
        m["home_team_logo"] = ht.get("logo_url", "")
        m["away_team_name"] = at.get("name", "—")
        m["away_team_logo"] = at.get("logo_url", "")
    return items

@api.post("/matches", response_model=MatchOut)
async def create_match(payload: MatchIn, _: dict = Depends(require_admin)):
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    await db.matches.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.put("/matches/{mid}")
async def update_match(mid: str, payload: MatchUpdateIn, _: dict = Depends(require_admin)):
    """Edición manual de un partido programado: fecha/hora, cancha, jornada, grupo, fase, equipos."""
    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Nada que actualizar")
    if "match_date" in updates and updates["match_date"]:
        # Normalizamos: aceptamos "YYYY-MM-DDTHH:MM" o ISO completo.
        try:
            dt = datetime.fromisoformat(updates["match_date"])
            updates["match_date"] = dt.isoformat()
        except Exception:
            raise HTTPException(status_code=400, detail="Formato de fecha/hora inválido")
    # Validar home != away comparando contra el doc final (mezcla DB + updates).
    if "home_team_id" in updates or "away_team_id" in updates:
        current = await db.matches.find_one({"id": mid}, {"_id": 0})
        if not current:
            raise HTTPException(status_code=404, detail="Partido no encontrado")
        final_home = updates.get("home_team_id", current.get("home_team_id"))
        final_away = updates.get("away_team_id", current.get("away_team_id"))
        if final_home == final_away:
            raise HTTPException(status_code=400, detail="Local y visitante deben ser distintos")
    res = await db.matches.update_one({"id": mid}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    m = await db.matches.find_one({"id": mid}, {"_id": 0})
    return m


@api.put("/matches/{mid}/result")
async def update_match_result(mid: str, payload: MatchResultIn, _: dict = Depends(require_admin)):
    res = await db.matches.update_one(
        {"id": mid},
        {"$set": {
            "home_score": payload.home_score,
            "away_score": payload.away_score,
            "status": "finalizado",
            "scorers": payload.scorers or [],
            "cards": payload.cards or [],
            "home_fair_play": payload.home_fair_play or 0,
            "away_fair_play": payload.away_fair_play or 0,
            **({"winner_team_id": payload.winner_team_id} if payload.winner_team_id else {}),
        }}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    m = await db.matches.find_one({"id": mid}, {"_id": 0})
    # Auto-advance winner if this match is part of a bracket
    if m.get("bracket_id"):
        await _advance_bracket_winner(m, payload.home_score, payload.away_score, payload.winner_team_id)
    return m

@api.delete("/matches/{mid}")
async def delete_match(mid: str, _: dict = Depends(require_admin)):
    await db.matches.delete_one({"id": mid})
    return {"ok": True}

# -------------------- Fixture Generator (Round Robin) --------------------
def _round_robin_pairs(team_ids: List[str], rounds_n: int = 1) -> List[List[tuple]]:
    """Return list of rounds, each round is list of (home, away) pairs.
    Uses 'circle method'. Adds None for byes if odd count.
    If rounds_n > 1: repeats the schedule rounds_n times, flipping home/away each full pass."""
    teams = list(team_ids)
    if len(teams) < 2:
        return []
    if len(teams) % 2 == 1:
        teams.append(None)  # BYE marker
    n = len(teams)
    base_rounds = []
    arr = teams[:]
    for r in range(n - 1):
        round_matches = []
        for i in range(n // 2):
            home = arr[i]
            away = arr[n - 1 - i]
            # Alternate home/away by round to balance
            if r % 2 == 1:
                home, away = away, home
            if home is not None and away is not None:
                round_matches.append((home, away))
        base_rounds.append(round_matches)
        # rotate keeping arr[0] fixed
        arr = [arr[0]] + [arr[-1]] + arr[1:-1]
    if rounds_n <= 1:
        return base_rounds
    out = []
    for pass_idx in range(max(1, int(rounds_n))):
        for rd in base_rounds:
            if pass_idx % 2 == 0:
                out.append(list(rd))
            else:
                # vuelta: swap home/away
                out.append([(a, h) for (h, a) in rd])
    return out

def _byes_per_round(team_ids: List[str]) -> dict:
    teams = list(team_ids)
    if len(teams) % 2 == 0:
        return {}
    teams.append(None)
    n = len(teams)
    arr = teams[:]
    out = {}
    for r in range(n - 1):
        for i in range(n // 2):
            home = arr[i]
            away = arr[n - 1 - i]
            if home is None:
                out[r + 1] = away
                break
            if away is None:
                out[r + 1] = home
                break
        arr = [arr[0]] + [arr[-1]] + arr[1:-1]
    return out

@api.post("/fixtures/generate")
async def generate_fixture(payload: FixtureGenerateIn, _: dict = Depends(require_admin)):
    if not (payload.category or '').strip():
        raise HTTPException(status_code=400, detail="La categoría es obligatoria")
    if len(payload.team_ids) < 2:
        raise HTTPException(status_code=400, detail="Se requieren al menos 2 equipos")
    if not (payload.tournament_id or '').strip():
        raise HTTPException(status_code=400, detail="El Evento (torneo) es obligatorio")
    # El torneo debe existir y estar activo (no archivado)
    tournament = await db.tournaments.find_one({"id": payload.tournament_id}, {"_id": 0})
    if not tournament:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    if tournament.get("archived"):
        raise HTTPException(status_code=400, detail="No se puede generar fixture sobre un evento archivado/histórico")
    teams = await db.teams.find({"id": {"$in": payload.team_ids}}, {"_id": 0}).to_list(500)
    if len(teams) != len(payload.team_ids):
        raise HTTPException(status_code=400, detail="Algunos equipos no existen")

    tournament_id = payload.tournament_id

    rounds = _round_robin_pairs(payload.team_ids, rounds_n=max(1, int(payload.rounds or 1)))
    byes = _byes_per_round(payload.team_ids)
    tmap = {t["id"]: t for t in teams}

    # Persistir reglas deportivas (si vinieron en el payload y no es vista previa)
    rule_fields = ["points_win", "points_draw", "points_loss",
                   "fairplay_base", "fairplay_yellow", "fairplay_red", "fairplay_other"]
    rules_provided = {k: getattr(payload, k) for k in rule_fields if getattr(payload, k) is not None}
    if rules_provided and not payload.preview:
        cats = list(tournament.get("categories") or [])
        found = False
        for i, c in enumerate(cats):
            if (c or {}).get("name") == payload.category:
                cats[i] = {**c, **rules_provided}
                found = True
                break
        if not found:
            cats.append({"name": payload.category, "fee": 0, "fee_usd": 0, **rules_provided})
        await db.tournaments.update_one({"id": tournament_id}, {"$set": {"categories": cats}})

    try:
        start = datetime.strptime(payload.start_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de fecha inválido (YYYY-MM-DD)")

    venues = payload.venues or [""]
    slots = payload.time_slots or ["10:00"]

    generated = []
    for r_idx, pairs in enumerate(rounds):
        # Doble jornada: dos jornadas (r_idx) caen en el mismo día.
        # day_index = r_idx // 2, y la jornada usa el slot[r_idx % len(slots)].
        if payload.double_matchday:
            day_index = r_idx // 2
            jornada_slot = slots[r_idx % len(slots)] if slots else "10:00"
        else:
            day_index = r_idx
            jornada_slot = None
        round_date = start + timedelta(days=day_index * payload.days_between_rounds)
        for i, (home_id, away_id) in enumerate(pairs):
            if payload.double_matchday:
                slot = jornada_slot
            else:
                slot = slots[i % len(slots)]
            venue = venues[i % len(venues)]
            try:
                hh, mm = slot.split(":")
                match_dt = round_date.replace(hour=int(hh), minute=int(mm), second=0, microsecond=0)
            except Exception:
                match_dt = round_date
            doc = {
                "id": str(uuid.uuid4()),
                "tournament_id": tournament_id,
                "home_team_id": home_id,
                "away_team_id": away_id,
                "match_date": match_dt.isoformat(),
                "venue": venue,
                "group_name": payload.group_name,
                "matchday": r_idx + 1,
                "stage": "grupos",
                "status": "programado",
                "home_score": None,
                "away_score": None,
            }
            generated.append(doc)

    if not payload.preview:
        if generated:
            await db.matches.insert_many(generated)
        # Update teams to assign group_name + category
        await db.teams.update_many(
            {"id": {"$in": payload.team_ids}},
            {"$set": {"group_name": payload.group_name, "category": payload.category}}
        )

    # Strip _id and enrich with team names for preview
    enriched = []
    for d in generated:
        d.pop("_id", None)
        ht = tmap.get(d["home_team_id"], {})
        at = tmap.get(d["away_team_id"], {})
        enriched.append({
            **d,
            "home_team_name": ht.get("name", ""),
            "away_team_name": at.get("name", ""),
        })

    return {
        "tournament_id": tournament_id,
        "rounds": len(rounds),
        "matches": enriched,
        "byes_per_round": [{"round": k, "team_id": v, "team_name": tmap.get(v, {}).get("name", "")} for k, v in byes.items()],
        "saved": not payload.preview,
    }


# -------------------- Intergrupos (garantiza 4 partidos en cuadrangulares x2) --------------------
class IntergroupGenerateIn(BaseModel):
    tournament_id: str
    category: str
    group_a: str  # ej. "Grupo A"
    group_b: str  # ej. "Grupo B"
    match_date: str  # YYYY-MM-DD
    pairing: Literal["standings", "random", "seed"] = "standings"
    venues: List[str] = []
    time_slots: List[str] = []
    preview: bool = False


async def _group_team_order(tournament_id: str, category: str, group_name: str, mode: str) -> List[dict]:
    """Devuelve los equipos del grupo ordenados según el modo:
    - standings: orden actual de la tabla (Pts → FP → DG → GF).
    - seed: orden de creación (insert order).
    - random: aleatorio.
    """
    teams = await db.teams.find(
        {"category": category, "group_name": group_name, "status": "aprobado"},
        {"_id": 0},
    ).to_list(100)
    if mode == "random":
        import random as _rnd
        _rnd.shuffle(teams)
        return teams
    if mode == "seed":
        return teams
    # standings
    rows = await standings(category=category, group_name=group_name, tournament_id=tournament_id)
    tmap = {t["id"]: t for t in teams}
    ordered = [tmap[r["team_id"]] for r in rows if r["team_id"] in tmap]
    return ordered or teams


@api.post("/fixtures/intergroup")
async def generate_intergroup(payload: IntergroupGenerateIn, _: dict = Depends(require_admin)):
    """Crea 1 partido intergrupos por equipo: 1°A vs 1°B, 2°A vs 2°B, etc. (según pairing)."""
    if not (payload.category or '').strip():
        raise HTTPException(status_code=400, detail="La categoría es obligatoria")
    if payload.group_a == payload.group_b:
        raise HTTPException(status_code=400, detail="Los grupos A y B deben ser distintos")
    a = await _group_team_order(payload.tournament_id, payload.category, payload.group_a, payload.pairing)
    b = await _group_team_order(payload.tournament_id, payload.category, payload.group_b, payload.pairing)
    if not a or not b:
        raise HTTPException(status_code=400, detail="Uno de los grupos no tiene equipos aprobados")
    n = min(len(a), len(b))
    if n < 1:
        raise HTTPException(status_code=400, detail="Cada grupo debe tener al menos 1 equipo")
    try:
        base_dt = datetime.strptime(payload.match_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de fecha inválido (YYYY-MM-DD)")
    venues = payload.venues or [""]
    slots = payload.time_slots or ["10:00"]
    generated = []
    for i in range(n):
        slot = slots[i % len(slots)]
        venue = venues[i % len(venues)]
        try:
            hh, mm = slot.split(":")
            mdt = base_dt.replace(hour=int(hh), minute=int(mm), second=0, microsecond=0)
        except Exception:
            mdt = base_dt
        doc = {
            "id": str(uuid.uuid4()),
            "tournament_id": payload.tournament_id,
            "home_team_id": a[i]["id"],
            "away_team_id": b[i]["id"],
            "match_date": mdt.isoformat(),
            "venue": venue,
            "group_name": f"{payload.group_a} vs {payload.group_b}",
            "matchday": None,
            "stage": "grupos",
            "match_type": "intergrupo",
            "status": "programado",
            "home_score": None,
            "away_score": None,
        }
        generated.append(doc)
    if not payload.preview:
        if generated:
            await db.matches.insert_many(generated)
    # enrich
    enriched = []
    for d, ha, hb in zip(generated, a[:n], b[:n]):
        d.pop("_id", None)
        enriched.append({**d, "home_team_name": ha.get("name", ""), "away_team_name": hb.get("name", "")})
    return {"matches": enriched, "count": len(enriched), "saved": not payload.preview}


# -------------------- Historical standings (datos archivados) --------------------
class HistoricalStandingIn(BaseModel):
    tournament_id: str
    category: str
    group_name: str
    rank: int = Field(ge=1)
    team_name: str
    played: int = 0
    won: int = 0
    drawn: int = 0
    lost: int = 0
    gf: int = 0
    ga: int = 0
    gd: int = 0
    fair_play: int = 0
    points: int = 0


@api.get("/historical/standings")
async def list_historical_standings(tournament_id: Optional[str] = None, category: Optional[str] = None, group_name: Optional[str] = None):
    q = {}
    if tournament_id:
        q["tournament_id"] = tournament_id
    if category:
        q["category"] = category
    if group_name:
        q["group_name"] = group_name
    items = await db.historical_standings.find(q, {"_id": 0}).sort([("category", 1), ("group_name", 1), ("rank", 1)]).to_list(2000)
    return items


@api.post("/historical/standings", response_model=List[HistoricalStandingIn])
async def bulk_create_historical_standings(rows: List[HistoricalStandingIn], _: dict = Depends(require_admin)):
    """Carga masiva de standings históricos (lo usa el script de import)."""
    if not rows:
        return []
    docs = []
    for r in rows:
        d = r.model_dump()
        d["id"] = str(uuid.uuid4())
        d["gd"] = d["gf"] - d["ga"] if d["gd"] == 0 else d["gd"]
        docs.append(d)
    await db.historical_standings.insert_many(docs)
    return [{k: v for k, v in d.items() if k != "_id" and k != "id"} for d in docs]


@api.delete("/historical/standings")
async def delete_historical_standings(tournament_id: str, _: dict = Depends(require_admin)):
    res = await db.historical_standings.delete_many({"tournament_id": tournament_id})
    return {"deleted": res.deleted_count}


# -------------------- Plantilla Excel estándar (matches) --------------------
@api.get("/import/matches-template")
async def download_matches_template(_: dict = Depends(require_admin)):
    """Plantilla XLSX para cargar partidos de un torneo histórico."""
    from openpyxl import Workbook
    from io import BytesIO
    wb = Workbook()
    ws = wb.active
    ws.title = "Partidos"
    headers = [
        "fecha (YYYY-MM-DD)",
        "hora (HH:MM)",
        "categoria",
        "grupo",
        "jornada",
        "fase",
        "match_type (regular|intergrupo)",
        "local",
        "visitante",
        "marcador_local",
        "marcador_visitante",
        "fair_play_local",
        "fair_play_visitante",
        "cancha",
    ]
    ws.append(headers)
    ws.append(["2025-12-15", "10:00", "Sub-12", "Grupo A", 1, "grupos", "regular", "JAGUARES", "FORTALEZA", 3, 1, 200, 180, "Cancha 1"])
    # Style header
    from openpyxl.styles import Font, PatternFill
    bold = Font(bold=True, color="FFFFFF")
    fill = PatternFill(start_color="1d4ed8", end_color="1d4ed8", fill_type="solid")
    for col_idx in range(1, len(headers) + 1):
        c = ws.cell(row=1, column=col_idx)
        c.font = bold
        c.fill = fill
        ws.column_dimensions[c.column_letter].width = 20
    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="fsc_partidos_template.xlsx"'},
    )


# -------------------- Bracket (eliminación directa) --------------------
BRACKET_SIZES = [4, 8, 16, 32]
STAGE_BY_OFFSET = {0: "final", 1: "semis", 2: "cuartos", 3: "octavos", 4: "treintaidosavos"}


def _bracket_seed_order(n: int) -> List[int]:
    """Standard bracket seeding so top seeds meet only in late rounds.
    Returns list of seed numbers (1..n) in slot order for round 1."""
    if n == 1:
        return [1]
    prev = _bracket_seed_order(n // 2)
    out = []
    for s in prev:
        out.append(s)
        out.append(n + 1 - s)
    return out


class BracketIn(BaseModel):
    name: str
    category: str
    size: Literal[4, 8, 16, 32]
    team_ids: List[str]  # length == size; in seed order 1..N
    include_third_place: bool = False
    start_date: str  # YYYY-MM-DD for round 1
    days_between_rounds: int = 7
    venues: List[str] = []
    time_slots: List[str] = []
    tournament_id: Optional[str] = None
    preview: bool = False


@api.get("/brackets")
async def list_brackets(category: Optional[str] = None):
    q = {}
    if category:
        q["category"] = category
    items = await db.brackets.find(q, {"_id": 0}).sort("created_at", -1).to_list(200)
    return items


@api.get("/brackets/{bid}")
async def get_bracket(bid: str):
    bracket = await db.brackets.find_one({"id": bid}, {"_id": 0})
    if not bracket:
        raise HTTPException(status_code=404, detail="Bracket no encontrado")
    matches = await db.matches.find({"bracket_id": bid}, {"_id": 0}).sort("bracket_round", 1).to_list(500)
    # Enrich with team names
    team_ids_flat = set(bracket["team_ids"])
    for m in matches:
        if m.get("home_team_id"): team_ids_flat.add(m["home_team_id"])
        if m.get("away_team_id"): team_ids_flat.add(m["away_team_id"])
    teams = await db.teams.find({"id": {"$in": list(team_ids_flat)}}, {"_id": 0, "id": 1, "name": 1, "logo_url": 1, "color": 1}).to_list(500)
    tmap = {t["id"]: t for t in teams}
    for m in matches:
        if m.get("home_team_id"):
            t = tmap.get(m["home_team_id"], {})
            m["home_team_name"] = t.get("name", "")
            m["home_team_logo"] = t.get("logo_url", "")
            m["home_team_color"] = t.get("color", "")
        else:
            m["home_team_name"] = "Por definir"
        if m.get("away_team_id"):
            t = tmap.get(m["away_team_id"], {})
            m["away_team_name"] = t.get("name", "")
            m["away_team_logo"] = t.get("logo_url", "")
            m["away_team_color"] = t.get("color", "")
        else:
            m["away_team_name"] = "Por definir"
    bracket["matches"] = matches
    bracket["teams"] = [tmap.get(tid, {"id": tid, "name": "—"}) for tid in bracket["team_ids"]]
    return bracket


@api.post("/brackets")
async def create_bracket(payload: BracketIn, _: dict = Depends(require_admin)):
    if payload.size not in BRACKET_SIZES:
        raise HTTPException(status_code=400, detail=f"Tamaño inválido. Permitidos: {BRACKET_SIZES}")
    if len(payload.team_ids) != payload.size:
        raise HTTPException(status_code=400, detail=f"Se requieren exactamente {payload.size} equipos sembrados")
    if len(set(payload.team_ids)) != len(payload.team_ids):
        raise HTTPException(status_code=400, detail="Hay equipos duplicados en la siembra")
    # Validate teams exist
    existing = await db.teams.find({"id": {"$in": payload.team_ids}}, {"_id": 0, "id": 1}).to_list(64)
    if len(existing) != payload.size:
        raise HTTPException(status_code=400, detail="Uno o más equipos no existen")

    bid = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    total_rounds = {4: 2, 8: 3, 16: 4, 32: 5}[payload.size]
    seed_order = _bracket_seed_order(payload.size)  # seed numbers in slot order
    # slot_team[i] = team_id at slot i (0-indexed) for round 1
    slot_team = [payload.team_ids[s - 1] for s in seed_order]

    # Parse start date
    try:
        start = datetime.fromisoformat(payload.start_date).date()
    except Exception:
        raise HTTPException(status_code=400, detail="start_date inválida (YYYY-MM-DD)")

    venues = payload.venues or [""]
    slots = payload.time_slots or ["10:00"]

    # Build matches per round. Round r (1-indexed) has size / 2^r matches.
    # match_ids[(round, position)] = id  — to wire next_match references
    match_ids: dict = {}
    all_matches: List[dict] = []
    for r in range(1, total_rounds + 1):
        n_matches = payload.size // (2 ** r)
        round_date = start + timedelta(days=payload.days_between_rounds * (r - 1))
        for pos in range(n_matches):
            mid = str(uuid.uuid4())
            match_ids[(r, pos)] = mid
            home_team_id = slot_team[pos * 2] if r == 1 else None
            away_team_id = slot_team[pos * 2 + 1] if r == 1 else None
            stage = STAGE_BY_OFFSET.get(total_rounds - r, f"ronda_{r}")
            time_slot = slots[pos % len(slots)]
            venue = venues[pos % len(venues)]
            match_dt = datetime.combine(round_date, datetime.strptime(time_slot, "%H:%M").time(), tzinfo=timezone.utc)
            all_matches.append({
                "id": mid,
                "tournament_id": payload.tournament_id or bid,
                "home_team_id": home_team_id,
                "away_team_id": away_team_id,
                "match_date": match_dt.isoformat(),
                "venue": venue,
                "group_name": "",
                "matchday": None,
                "stage": stage,
                "home_score": None,
                "away_score": None,
                "status": "programado",
                "bracket_id": bid,
                "bracket_round": r,
                "bracket_position": pos,
                "is_third_place": False,
                "created_at": now,
            })

    # Wire next_match_id / next_match_slot for rounds 1..total_rounds-1
    for r in range(1, total_rounds):
        n_matches = payload.size // (2 ** r)
        for pos in range(n_matches):
            mid = match_ids[(r, pos)]
            parent = match_ids[(r + 1, pos // 2)]
            slot = "home" if pos % 2 == 0 else "away"
            # find this match in all_matches and patch
            for m in all_matches:
                if m["id"] == mid:
                    m["next_match_id"] = parent
                    m["next_match_slot"] = slot
                    break

    # Third place match: winner of each semi loser plays. We only mark loser_next_match_id
    # on the two semi matches.
    third_place_id = None
    if payload.include_third_place and total_rounds >= 2:
        third_place_id = str(uuid.uuid4())
        # third place plays the same day as final (or day before — keep same day)
        final_match = next(m for m in all_matches if m["bracket_round"] == total_rounds)
        all_matches.append({
            "id": third_place_id,
            "tournament_id": payload.tournament_id or bid,
            "home_team_id": None,
            "away_team_id": None,
            "match_date": final_match["match_date"],
            "venue": final_match["venue"],
            "group_name": "",
            "matchday": None,
            "stage": "tercer_puesto",
            "home_score": None,
            "away_score": None,
            "status": "programado",
            "bracket_id": bid,
            "bracket_round": total_rounds,  # same level as final, but separate
            "bracket_position": -1,
            "is_third_place": True,
            "created_at": now,
        })
        # patch semi matches to send losers to third_place
        for m in all_matches:
            if m["bracket_round"] == total_rounds - 1 and not m.get("is_third_place"):
                m["loser_next_match_id"] = third_place_id
                m["loser_next_match_slot"] = "home" if m["bracket_position"] == 0 else "away"

    bracket_doc = {
        "id": bid,
        "name": payload.name,
        "category": payload.category,
        "size": payload.size,
        "team_ids": payload.team_ids,
        "include_third_place": payload.include_third_place,
        "third_place_match_id": third_place_id,
        "total_rounds": total_rounds,
        "tournament_id": payload.tournament_id or bid,
        "status": "activo",
        "created_at": now,
    }

    if payload.preview:
        return {**bracket_doc, "matches": [dict(m) for m in all_matches], "saved": False}

    await db.brackets.insert_one(bracket_doc)
    if all_matches:
        await db.matches.insert_many(all_matches)
    bracket_doc.pop("_id", None)
    return {**bracket_doc, "matches": [{k: v for k, v in m.items() if k != "_id"} for m in all_matches], "saved": True}


@api.delete("/brackets/{bid}")
async def delete_bracket(bid: str, _: dict = Depends(require_admin)):
    res = await db.brackets.delete_one({"id": bid})
    await db.matches.delete_many({"bracket_id": bid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bracket no encontrado")
    return {"ok": True}


async def _advance_bracket_winner(match_doc: dict, home_score: int, away_score: int, winner_team_id: Optional[str] = None):
    """If the match is part of a bracket, propagate winner (and loser → third place if applicable)."""
    bracket_id = match_doc.get("bracket_id")
    if not bracket_id:
        return
    home_id = match_doc.get("home_team_id")
    away_id = match_doc.get("away_team_id")
    if not home_id or not away_id:
        return
    if home_score > away_score:
        winner, loser = home_id, away_id
    elif away_score > home_score:
        winner, loser = away_id, home_id
    elif winner_team_id in (home_id, away_id):
        winner = winner_team_id
        loser = away_id if winner == home_id else home_id
    else:
        # tie without resolution — do not advance
        return

    next_id = match_doc.get("next_match_id")
    next_slot = match_doc.get("next_match_slot")
    if next_id and next_slot in ("home", "away"):
        field = "home_team_id" if next_slot == "home" else "away_team_id"
        await db.matches.update_one({"id": next_id}, {"$set": {field: winner}})

    loser_next_id = match_doc.get("loser_next_match_id")
    loser_slot = match_doc.get("loser_next_match_slot")
    if loser_next_id and loser_slot in ("home", "away"):
        field = "home_team_id" if loser_slot == "home" else "away_team_id"
        await db.matches.update_one({"id": loser_next_id}, {"$set": {field: loser}})


# -------------------- Stats --------------------
def _cat_config(tournament: dict, category: str) -> dict:
    """Devuelve la configuración por categoría dentro de un torneo, con defaults seguros."""
    defaults = {
        "points_win": 3, "points_draw": 1, "points_loss": 0,
        "fairplay_base": 200, "fairplay_yellow": 10, "fairplay_red": 20, "fairplay_other": 5,
    }
    if not tournament:
        return defaults
    for c in (tournament.get("categories") or []):
        if (c or {}).get("name") == category:
            out = dict(defaults)
            for k in defaults:
                if c.get(k) is not None:
                    try:
                        out[k] = int(c.get(k))
                    except Exception:
                        pass
            return out
    return defaults


@api.get("/stats/standings")
async def standings(category: Optional[str] = None, group_name: Optional[str] = None, tournament_id: Optional[str] = None):
    q_team = {}
    if category:
        q_team["category"] = category
    if group_name:
        q_team["group_name"] = group_name
    teams = await db.teams.find(q_team, {"_id": 0}).to_list(500)
    team_ids = [t["id"] for t in teams]

    q_match = {"status": "finalizado", "home_team_id": {"$in": team_ids}}
    if tournament_id:
        q_match["tournament_id"] = tournament_id
    matches = await db.matches.find(q_match, {"_id": 0}).to_list(2000)

    # Carga configuración J.L / puntos del torneo+categoría (defaults si no hay)
    tournament = None
    if tournament_id:
        tournament = await db.tournaments.find_one({"id": tournament_id}, {"_id": 0})
    cfg = _cat_config(tournament, category or "")

    table = {t["id"]: {
        "team_id": t["id"], "team_name": t["name"], "team_logo": t.get("logo_url", ""),
        "category": t["category"], "group_name": t.get("group_name", ""),
        "played": 0, "won": 0, "drawn": 0, "lost": 0,
        "gf": 0, "ga": 0, "gd": 0, "points": 0,
        "yellow_cards": 0, "red_cards": 0, "other_cards": 0,
        "fair_play": cfg["fairplay_base"],
    } for t in teams}

    for m in matches:
        h, a = m["home_team_id"], m["away_team_id"]
        hs, as_ = m.get("home_score") or 0, m.get("away_score") or 0
        if h not in table or a not in table:
            continue
        table[h]["played"] += 1
        table[a]["played"] += 1
        table[h]["gf"] += hs; table[h]["ga"] += as_
        table[a]["gf"] += as_; table[a]["ga"] += hs
        # Tarjetas por equipo en este partido → descontar J.L.
        for c in (m.get("cards") or []):
            tid = c.get("team_id")
            if tid not in table:
                continue
            ctype = c.get("type")
            if ctype == "yellow":
                table[tid]["yellow_cards"] += 1
                table[tid]["fair_play"] -= cfg["fairplay_yellow"]
            elif ctype == "red":
                table[tid]["red_cards"] += 1
                table[tid]["fair_play"] -= cfg["fairplay_red"]
            elif ctype == "other":
                table[tid]["other_cards"] += 1
                table[tid]["fair_play"] -= cfg["fairplay_other"]
        # Puntos
        if hs > as_:
            table[h]["won"] += 1; table[h]["points"] += cfg["points_win"]
            table[a]["lost"] += 1; table[a]["points"] += cfg["points_loss"]
        elif hs < as_:
            table[a]["won"] += 1; table[a]["points"] += cfg["points_win"]
            table[h]["lost"] += 1; table[h]["points"] += cfg["points_loss"]
        else:
            table[h]["drawn"] += 1; table[h]["points"] += cfg["points_draw"]
            table[a]["drawn"] += 1; table[a]["points"] += cfg["points_draw"]

    rows = list(table.values())
    for r in rows:
        r["gd"] = r["gf"] - r["ga"]
    # Orden de desempate FSC (spec final):
    #   1) PTOS (mayor)
    #   2) PG (mayor)
    #   3) GF (mayor)
    #   4) GC (menor)
    #   5) DG (mayor)
    #   6) J.L (mayor)
    rows.sort(key=lambda r: (-r["points"], -r["won"], -r["gf"], r["ga"], -r["gd"], -r["fair_play"]))
    return rows

@api.get("/stats/top-scorers")
async def top_scorers(category: Optional[str] = None, limit: int = 20):
    q = {"status": "finalizado"}
    matches = await db.matches.find(q, {"_id": 0}).to_list(2000)
    counter = {}
    for m in matches:
        for s in (m.get("scorers") or []):
            pid = s.get("player_id")
            if not pid:
                continue
            counter[pid] = counter.get(pid, 0) + 1
    if not counter:
        return []
    pids = list(counter.keys())
    players = await db.players.find({"id": {"$in": pids}}, {"_id": 0}).to_list(2000)
    team_ids = list({p["team_id"] for p in players})
    teams = await db.teams.find({"id": {"$in": team_ids}}, {"_id": 0}).to_list(500)
    tmap = {t["id"]: t for t in teams}
    rows = []
    for p in players:
        t = tmap.get(p["team_id"], {})
        if category and t.get("category") != category:
            continue
        rows.append({
            "player_id": p["id"], "name": p["name"], "photo_url": p.get("photo_url", ""),
            "team_name": t.get("name", "—"), "team_logo": t.get("logo_url", ""),
            "goals": counter[p["id"]],
            "category": t.get("category", "")
        })
    rows.sort(key=lambda r: -r["goals"])
    return rows[:limit]

@api.get("/stats/discipline")
async def discipline(category: Optional[str] = None, limit: int = 50):
    matches = await db.matches.find({"status": "finalizado"}, {"_id": 0}).to_list(2000)
    yc = {}
    rc = {}
    for m in matches:
        for c in (m.get("cards") or []):
            pid = c.get("player_id")
            if not pid:
                continue
            if c.get("type") == "yellow":
                yc[pid] = yc.get(pid, 0) + 1
            elif c.get("type") == "red":
                rc[pid] = rc.get(pid, 0) + 1
    pids = list(set(yc.keys()) | set(rc.keys()))
    if not pids:
        return []
    players = await db.players.find({"id": {"$in": pids}}, {"_id": 0}).to_list(2000)
    team_ids = list({p["team_id"] for p in players})
    teams = await db.teams.find({"id": {"$in": team_ids}}, {"_id": 0}).to_list(500)
    tmap = {t["id"]: t for t in teams}
    rows = []
    for p in players:
        t = tmap.get(p["team_id"], {})
        if category and t.get("category") != category:
            continue
        rows.append({
            "player_id": p["id"], "name": p["name"],
            "team_name": t.get("name", "—"), "team_logo": t.get("logo_url", ""),
            "yellow_cards": yc.get(p["id"], 0),
            "red_cards": rc.get(p["id"], 0),
            "category": t.get("category", ""),
        })
    rows.sort(key=lambda r: (-r["red_cards"], -r["yellow_cards"]))
    return rows[:limit]

# -------------------- PDFs de Fixture / Tabla / Juego Limpio (Admin / DT / CT) --------------------
def _pdf_header_logo(canvas_or_story, logo_bytes):
    """Genera un encabezado con el logo (si está cacheado) y devuelve el flowable Image (o None)."""
    if not logo_bytes:
        return None
    from reportlab.platypus import Image as RLImage
    from io import BytesIO as _BIO
    try:
        return RLImage(_BIO(logo_bytes), width=70, height=70, kind="bound")
    except Exception:
        return None


async def _build_fixture_pdf(tournament_id: str, category: Optional[str], group: Optional[str]):
    """Construye un PDF del fixture / calendario, agrupado por jornada, con resultados ya jugados."""
    from io import BytesIO
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_LEFT, TA_CENTER
    from reportlab.lib.units import inch
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak

    tournament = await db.tournaments.find_one({"id": tournament_id}, {"_id": 0})
    if not tournament:
        raise HTTPException(404, "Evento no encontrado")
    q_team = {}
    if category: q_team["category"] = category
    if group: q_team["group_name"] = group
    teams = await db.teams.find(q_team, {"_id": 0}).to_list(500)
    tmap = {t["id"]: t for t in teams}
    q_match = {"tournament_id": tournament_id}
    if category:
        q_match["$or"] = [{"home_team_id": {"$in": [t["id"] for t in teams]}}, {"away_team_id": {"$in": [t["id"] for t in teams]}}]
    if group: q_match["group_name"] = group
    matches = await db.matches.find(q_match, {"_id": 0}).sort("matchday", 1).to_list(2000)

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter, leftMargin=0.5 * inch, rightMargin=0.5 * inch, topMargin=0.5 * inch, bottomMargin=0.5 * inch, title="Fixture")
    styles = getSampleStyleSheet()
    N = styles["BodyText"]
    H1 = ParagraphStyle("H1", parent=styles["Heading1"], fontSize=18, leading=22, textColor=colors.HexColor("#0f172a"), spaceAfter=4)
    H2 = ParagraphStyle("H2", parent=styles["Heading2"], fontSize=11, leading=14, textColor=colors.HexColor("#1d4ed8"), spaceAfter=4)
    SUB = ParagraphStyle("SUB", parent=N, fontSize=9, textColor=colors.HexColor("#475569"), leading=11)

    story = []
    logo_img = _pdf_header_logo(None, _get_fsc_logo_bytes())
    head_cell = [Paragraph(f"<b>FIXTURE</b>", H1),
                 Paragraph(f"<b>{tournament.get('name','—')}</b> · Temporada {tournament.get('season','—')}", H2),
                 Paragraph(f"Categoría: {category or 'Todas'} · Grupo: {group or 'Todos'}", SUB)]
    if logo_img:
        header = Table([[logo_img, head_cell]], colWidths=[0.85 * inch, None])
        header.setStyle(TableStyle([("VALIGN", (0,0), (-1,-1), "MIDDLE"), ("LEFTPADDING", (0,0), (-1,-1), 0)]))
        story.append(header)
    else:
        for c in head_cell: story.append(c)
    story.append(Spacer(1, 8))

    by_md = {}
    for m in matches:
        k = m.get("matchday") or 0
        by_md.setdefault(k, []).append(m)

    if not by_md:
        story.append(Paragraph("Sin partidos programados para este criterio.", N))
    for k in sorted(by_md.keys()):
        story.append(Paragraph(f"JORNADA {k if k else '—'}", H2))
        data = [["Fecha", "Cancha", "Local", "", "Visitante", "Grupo", "Resultado"]]
        for m in by_md[k]:
            ht = tmap.get(m["home_team_id"], {})
            at = tmap.get(m["away_team_id"], {})
            fecha = (m.get("match_date") or "")
            if fecha:
                try:
                    fdt = datetime.fromisoformat(fecha.replace("Z", "+00:00")) if "T" in fecha else datetime.strptime(fecha, "%Y-%m-%d")
                    fecha = fdt.strftime("%d/%m/%Y %H:%M")
                except Exception:
                    fecha = fecha[:16]
            if m.get("status") == "finalizado":
                score = f"{m.get('home_score', 0)} - {m.get('away_score', 0)}"
            else:
                score = "—"
            data.append([fecha, m.get("venue", "") or "—",
                         ht.get("name", "—"), "vs", at.get("name", "—"),
                         m.get("group_name", "") or "—", score])
        col_widths = [1.05 * inch, 1.1 * inch, 1.6 * inch, 0.25 * inch, 1.6 * inch, 0.7 * inch, 0.7 * inch]
        t = Table(data, colWidths=col_widths, repeatRows=1)
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1d4ed8")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("ALIGN", (3, 1), (3, -1), "CENTER"),
            ("ALIGN", (-1, 1), (-1, -1), "CENTER"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f1f5f9")]),
            ("LEFTPADDING", (0, 0), (-1, -1), 4), ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("BOX", (0, 0), (-1, -1), 0.4, colors.HexColor("#cbd5e1")),
        ]))
        story.append(t)
        story.append(Spacer(1, 8))

    doc.build(story)
    return buf.getvalue()


async def _build_standings_pdf(tournament_id: str, category: Optional[str], group: Optional[str], fairplay_only: bool = False):
    """PDF de tabla de clasificación O reporte de Juego Limpio."""
    from io import BytesIO
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_LEFT
    from reportlab.lib.units import inch
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

    tournament = await db.tournaments.find_one({"id": tournament_id}, {"_id": 0})
    if not tournament:
        raise HTTPException(404, "Evento no encontrado")
    # Re-usamos el endpoint standings (refactor mínimo)
    rows = await standings(category=category, group_name=group, tournament_id=tournament_id)

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter, leftMargin=0.5*inch, rightMargin=0.5*inch, topMargin=0.5*inch, bottomMargin=0.5*inch, title=("Juego Limpio" if fairplay_only else "Clasificación"))
    styles = getSampleStyleSheet()
    N = styles["BodyText"]
    H1 = ParagraphStyle("H1", parent=styles["Heading1"], fontSize=18, leading=22, textColor=colors.HexColor("#0f172a"), spaceAfter=4)
    H2 = ParagraphStyle("H2", parent=styles["Heading2"], fontSize=11, leading=14, textColor=colors.HexColor("#1d4ed8"), spaceAfter=4)
    SUB = ParagraphStyle("SUB", parent=N, fontSize=9, textColor=colors.HexColor("#475569"), leading=11)

    story = []
    logo_img = _pdf_header_logo(None, _get_fsc_logo_bytes())
    title_text = "REPORTE DE JUEGO LIMPIO" if fairplay_only else "TABLA DE CLASIFICACIÓN"
    head_cell = [Paragraph(f"<b>{title_text}</b>", H1),
                 Paragraph(f"<b>{tournament.get('name','—')}</b> · Temporada {tournament.get('season','—')}", H2),
                 Paragraph(f"Categoría: {category or 'Todas'} · Grupo: {group or 'Todos'}", SUB)]
    if logo_img:
        header = Table([[logo_img, head_cell]], colWidths=[0.85 * inch, None])
        header.setStyle(TableStyle([("VALIGN", (0,0), (-1,-1), "MIDDLE"), ("LEFTPADDING", (0,0), (-1,-1), 0)]))
        story.append(header)
    else:
        for c in head_cell: story.append(c)
    story.append(Spacer(1, 10))

    if fairplay_only:
        data = [["#", "Equipo", "Amarillas", "Rojas", "Otras", "J.L"]]
        for i, r in enumerate(rows, start=1):
            data.append([str(i), r["team_name"], str(r.get("yellow_cards", 0)), str(r.get("red_cards", 0)), str(r.get("other_cards", 0)), str(r.get("fair_play", 0))])
        col_widths = [0.4*inch, 3.0*inch, 0.9*inch, 0.9*inch, 0.9*inch, 1.0*inch]
    else:
        data = [["#", "Equipo", "PJ", "PG", "PE", "PP", "GF", "GC", "DG", "J.L", "PTOS"]]
        for i, r in enumerate(rows, start=1):
            dg = r.get("gd", 0)
            data.append([str(i), r["team_name"], str(r["played"]), str(r["won"]), str(r["drawn"]), str(r["lost"]),
                         str(r["gf"]), str(r["ga"]), (f"+{dg}" if dg > 0 else str(dg)), str(r.get("fair_play", 0)), str(r["points"])])
        col_widths = [0.35*inch, 2.0*inch, 0.45*inch, 0.45*inch, 0.45*inch, 0.45*inch, 0.5*inch, 0.5*inch, 0.55*inch, 0.6*inch, 0.65*inch]

    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1d4ed8")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (2, 0), (-1, -1), "CENTER"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f1f5f9")]),
        ("LEFTPADDING", (0, 0), (-1, -1), 4), ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("BOX", (0, 0), (-1, -1), 0.4, colors.HexColor("#cbd5e1")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(t)

    cfg = _cat_config(tournament, category or "")
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        f"<b>Configuración de J.L:</b> Base {cfg['fairplay_base']} pts. Descuentos: "
        f"Amarilla −{cfg['fairplay_yellow']}, Roja −{cfg['fairplay_red']}, Otras −{cfg['fairplay_other']}.  ·  "
        f"Puntos: Ganado {cfg['points_win']}, Empate {cfg['points_draw']}, Perdido {cfg['points_loss']}.",
        SUB))
    story.append(Paragraph(
        "<b>Orden de desempate:</b> PTOS → PG → GF → GC (menor) → DG → J.L.", SUB))

    doc.build(story)
    return buf.getvalue()


async def _require_auth_for_pdf(user: dict = Depends(get_current_user)) -> dict:
    """Las descargas PDF de fixture/clasificación/juego limpio son solo para roles autenticados."""
    if user.get("role") not in ("admin", "team"):
        raise HTTPException(status_code=403, detail="Solo Admin, Director o Cuerpo Técnico pueden descargar este PDF")
    return user


@api.get("/tournaments/{tid}/fixture.pdf")
async def tournament_fixture_pdf(tid: str, category: Optional[str] = None, group: Optional[str] = None, _: dict = Depends(_require_auth_for_pdf)):
    pdf = await _build_fixture_pdf(tid, category, group)
    fname = f"fixture_{tid[:8]}.pdf"
    return Response(content=pdf, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={fname}"})


@api.get("/tournaments/{tid}/standings.pdf")
async def tournament_standings_pdf(tid: str, category: Optional[str] = None, group: Optional[str] = None, _: dict = Depends(_require_auth_for_pdf)):
    pdf = await _build_standings_pdf(tid, category, group, fairplay_only=False)
    fname = f"clasificacion_{tid[:8]}.pdf"
    return Response(content=pdf, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={fname}"})


@api.get("/tournaments/{tid}/fairplay.pdf")
async def tournament_fairplay_pdf(tid: str, category: Optional[str] = None, group: Optional[str] = None, _: dict = Depends(_require_auth_for_pdf)):
    pdf = await _build_standings_pdf(tid, category, group, fairplay_only=True)
    fname = f"juego_limpio_{tid[:8]}.pdf"
    return Response(content=pdf, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={fname}"})



# -------------------- Inventory: Hotels / Transports / Tours --------------------
def _crud_endpoints(name: str, ModelIn, ModelOut, collection):
    @api.get(f"/{name}", response_model=List[ModelOut])
    async def _list():
        items = await db[collection].find({}, {"_id": 0}).to_list(500)
        return items

    @api.get(f"/{name}/{{iid}}", response_model=ModelOut)
    async def _get(iid: str):
        item = await db[collection].find_one({"id": iid}, {"_id": 0})
        if not item:
            raise HTTPException(status_code=404, detail="No encontrado")
        return item

    @api.post(f"/{name}", response_model=ModelOut)
    async def _create(payload: ModelIn, _: dict = Depends(require_admin)):
        doc = payload.model_dump()
        doc["id"] = str(uuid.uuid4())
        await db[collection].insert_one(doc)
        doc.pop("_id", None)
        return doc

    @api.put(f"/{name}/{{iid}}", response_model=ModelOut)
    async def _update(iid: str, payload: ModelIn, _: dict = Depends(require_admin)):
        res = await db[collection].update_one({"id": iid}, {"$set": payload.model_dump()})
        if res.matched_count == 0:
            raise HTTPException(status_code=404, detail="No encontrado")
        return await db[collection].find_one({"id": iid}, {"_id": 0})

    @api.delete(f"/{name}/{{iid}}")
    async def _delete(iid: str, _: dict = Depends(require_admin)):
        await db[collection].delete_one({"id": iid})
        return {"ok": True}

# Legacy inventory endpoints (hotels/transports/tours) removed in iter18 — replaced by
# the unified /api/event-types + /api/admin/catalog pricing catalog backed by db.pricing_catalog.

# -------------------- Health --------------------
@api.get("/")
async def root():
    return {"app": "Future Soccer Cup", "ok": True}

@api.get("/categories")
async def list_categories():
    """Return categories from DB (admin-editable). Falls back to seed constants if empty."""
    rows = await db.categories.find({}, {"_id": 0}).sort([("sort_order", 1), ("name", 1)]).to_list(200)
    if not rows:
        return CATEGORIES
    return [r["name"] for r in rows]


@api.get("/admin/categories")
async def admin_list_categories(_: dict = Depends(require_admin)):
    rows = await db.categories.find({}, {"_id": 0}).sort([("sort_order", 1), ("name", 1)]).to_list(200)
    # Seed defaults on first call so admin sees the existing list immediately.
    if not rows:
        for i, n in enumerate(CATEGORIES):
            await db.categories.insert_one({"id": str(uuid.uuid4()), "name": n, "sort_order": i, "created_at": datetime.now(timezone.utc).isoformat()})
        rows = await db.categories.find({}, {"_id": 0}).sort([("sort_order", 1), ("name", 1)]).to_list(200)
    return rows


@api.post("/admin/categories")
async def admin_create_category(body: dict, user: dict = Depends(require_admin)):
    name = (body.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="El nombre es obligatorio")
    if await db.categories.find_one({"name": name}):
        raise HTTPException(status_code=400, detail="Ya existe una categoría con ese nombre")
    last = await db.categories.find({}, {"_id": 0, "sort_order": 1}).sort("sort_order", -1).limit(1).to_list(1)
    doc = {"id": str(uuid.uuid4()), "name": name, "sort_order": int(body.get("sort_order", (last[0]["sort_order"] + 1) if last else 0)), "created_at": datetime.now(timezone.utc).isoformat()}
    await db.categories.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/admin/categories/{cid}")
async def admin_update_category(cid: str, body: dict, _: dict = Depends(require_admin)):
    update = {}
    if "name" in body:
        n = (body.get("name") or "").strip()
        if not n:
            raise HTTPException(status_code=400, detail="El nombre es obligatorio")
        update["name"] = n
    if "sort_order" in body:
        try: update["sort_order"] = int(body["sort_order"])
        except Exception: pass
    if not update:
        raise HTTPException(status_code=400, detail="Nada para actualizar")
    res = await db.categories.update_one({"id": cid}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    return {"ok": True, **update}


@api.delete("/admin/categories/{cid}")
async def admin_delete_category(cid: str, _: dict = Depends(require_admin)):
    res = await db.categories.delete_one({"id": cid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    return {"ok": True}


# ----------------- Event Types CRUD (admin) -----------------
@api.get("/admin/event-types")
async def admin_list_event_types(_: dict = Depends(require_admin)):
    rows = await db.event_types.find({}, {"_id": 0}).sort([("sort_order", 1), ("name", 1)]).to_list(200)
    if not rows:
        # Seed from in-memory constants on first access.
        for i, (key, ev) in enumerate(EVENT_TYPES.items()):
            await db.event_types.insert_one({
                "id": key, "name": ev.get("name", key), "description": ev.get("description", ""),
                "registration_fee_per_team": float(ev.get("registration_fee_per_team", 0) or 0),
                "month": ev.get("month", ""), "sort_order": i,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
        rows = await db.event_types.find({}, {"_id": 0}).sort([("sort_order", 1), ("name", 1)]).to_list(200)
    return rows


@api.post("/admin/event-types")
async def admin_create_event_type(body: dict, _: dict = Depends(require_admin)):
    name = (body.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="El nombre es obligatorio")
    rid = body.get("id") or _slugify(name)
    if await db.event_types.find_one({"id": rid}):
        raise HTTPException(status_code=400, detail="Ya existe un tipo de evento con ese id")
    last = await db.event_types.find({}, {"_id": 0, "sort_order": 1}).sort("sort_order", -1).limit(1).to_list(1)
    doc = {
        "id": rid, "name": name, "description": (body.get("description") or "").strip(),
        "registration_fee_per_team": float(body.get("registration_fee_per_team", 0) or 0),
        "month": (body.get("month") or "").strip(),
        "sort_order": int(body.get("sort_order", (last[0]["sort_order"] + 1) if last else 0)),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.event_types.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/admin/event-types/{eid}")
async def admin_update_event_type(eid: str, body: dict, _: dict = Depends(require_admin)):
    update = {}
    for k in ("name", "description", "month"):
        if k in body:
            update[k] = (body.get(k) or "").strip()
    if "registration_fee_per_team" in body:
        try: update["registration_fee_per_team"] = max(0.0, float(body["registration_fee_per_team"] or 0))
        except Exception: pass
    if "sort_order" in body:
        try: update["sort_order"] = int(body["sort_order"])
        except Exception: pass
    if not update:
        raise HTTPException(status_code=400, detail="Nada para actualizar")
    res = await db.event_types.update_one({"id": eid}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tipo de evento no encontrado")
    return {"ok": True, **update}


@api.delete("/admin/event-types/{eid}")
async def admin_delete_event_type(eid: str, _: dict = Depends(require_admin)):
    res = await db.event_types.delete_one({"id": eid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tipo de evento no encontrado")
    return {"ok": True}

async def _load_catalog() -> dict:
    """Load pricing catalog from MongoDB and shape it like the legacy in-memory dicts.
    Falls back to the seed constants if a row is missing so /cotizar never breaks."""
    rows = await db.pricing_catalog.find({}, {"_id": 0}).sort("sort_order", 1).to_list(200)
    lodging, meals, meal_addons, transport, tours = {}, {}, {}, {}, {}
    for r in rows:
        t = r.get("type")
        if t == "lodging":
            lodging[r["id"]] = {
                "id": r["id"], "name": r["name"], "description": r.get("description", ""),
                "includes": r.get("includes", []),
                "base_5_nights": float(r.get("base_5_nights", 0) or 0),
                "additional_night": float(r.get("additional_night", 0) or 0),
                "base_5_nights_usd": float(r.get("base_5_nights_usd", 0) or 0),
                "additional_night_usd": float(r.get("additional_night_usd", 0) or 0),
                "available": bool(r.get("available", True)),
                "free_21st_enabled": bool(r.get("free_21st_enabled", False)),
                "classification": r.get("classification", ""),
                "accommodation_type": r.get("accommodation_type", ""),
                **({"no_lodging": True} if r.get("no_lodging") else {}),
            }
        elif t == "meal":
            meals[r["id"]] = {
                "id": r["id"], "name": r["name"],
                "per_day_by_tier": {k: float(v or 0) for k, v in (r.get("per_day_by_tier") or {}).items()},
            }
        elif t == "meal_addon":
            meal_addons[r["id"]] = {
                "id": r["id"], "name": r["name"],
                "meal_type": (r.get("meal_type") or "").upper(),
                "classification": (r.get("classification") or "").upper(),
                "cost": float(r.get("cost", 0) or 0),
                "cost_usd": float(r.get("cost_usd", 0) or 0),
            }
        elif t == "transport":
            transport[r["id"]] = {"id": r["id"], "name": r["name"], "price": float(r.get("price", 0) or 0), "price_usd": float(r.get("price_usd", 0) or 0)}
        elif t == "tour":
            tours[r["id"]] = {"id": r["id"], "name": r["name"], "description": r.get("description", ""), "price": float(r.get("price", 0) or 0), "price_usd": float(r.get("price_usd", 0) or 0)}
    # Fallback to constants when DB is empty (only on the very first request after deploy).
    return {
        "lodging": lodging or LODGING_TIERS,
        "meals": meals or MEAL_PLANS,
        "meal_addons": meal_addons,
        "transport": transport or TRANSPORT_ROUTES,
        "tours": tours or TOURS_CATALOG,
    }


@api.get("/event-types")
async def list_event_types():
    """Return all event types with their birth_years (and legacy fields) plus lodging/addons.
    Lodging/meal/transport/tour catalogs are now sourced from MongoDB so the admin can edit them.
    """
    cat = await _load_catalog()
    return {
        "events": list(EVENT_TYPES.values()),
        "lodging_tiers": list(cat["lodging"].values()),
        "meal_plans": list(cat["meals"].values()),
        "meal_addons": list((cat.get("meal_addons") or {}).values()),
        "transport_routes": list(cat["transport"].values()),
        "tours_catalog": list(cat["tours"].values()),
        "addons": ADDON_PRICES,  # legacy
        "designations": TEAM_DESIGNATIONS,
        "staff_roles": STAFF_ROLES,
        "event_nights": EVENT_NIGHTS,
        "event_days": EVENT_DAYS,
    }


# ============================================================
# Pricing catalog (lodging / meal / transport / tour) — admin
# ============================================================
CATALOG_TYPES = {"lodging", "meal", "meal_addon", "transport", "tour"}


def _slugify(name: str) -> str:
    import unicodedata
    s = unicodedata.normalize("NFKD", name or "").encode("ascii", "ignore").decode("ascii")
    s = re.sub(r"[^a-zA-Z0-9]+", "_", s).strip("_").lower()
    return s or str(uuid.uuid4())[:8]


def _validate_catalog_row(t: str, body: dict) -> dict:
    """Coerce + validate fields by row type. Returns the writable subset to $set."""
    if t not in CATALOG_TYPES:
        raise HTTPException(status_code=400, detail=f"Tipo de catálogo inválido: {t}")
    name = (body.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="El nombre es obligatorio")
    out = {"name": name, "updated_at": datetime.now(timezone.utc).isoformat()}
    if "description" in body:
        out["description"] = (body.get("description") or "").strip()
    if "sort_order" in body:
        try: out["sort_order"] = int(body["sort_order"])
        except Exception: pass
    if t == "lodging":
        out["base_5_nights"] = max(0.0, float(body.get("base_5_nights", 0) or 0))
        out["additional_night"] = max(0.0, float(body.get("additional_night", 0) or 0))
        # Precios en dólares (opcional). 0 = no definido en USD.
        out["base_5_nights_usd"] = max(0.0, float(body.get("base_5_nights_usd", 0) or 0))
        out["additional_night_usd"] = max(0.0, float(body.get("additional_night_usd", 0) or 0))
        out["available"] = bool(body.get("available", True))
        out["no_lodging"] = bool(body.get("no_lodging", False))
        # Promo "21 sale gratis" — 1 persona gratis por cada 20 alojadas en la misma reserva (no en total).
        out["free_21st_enabled"] = bool(body.get("free_21st_enabled", False))
        # Clasificación oficial FSC (Esmerald / Sapphire / Diamond / Gold / Silver / Bronze).
        # Tipo de acomodación (Múltiple / Triple / Doble) y descripción larga del paquete.
        if "classification" in body:
            out["classification"] = (body.get("classification") or "").strip().upper()
        if "accommodation_type" in body:
            out["accommodation_type"] = (body.get("accommodation_type") or "").strip()
        if "includes" in body:
            inc = body.get("includes") or []
            if isinstance(inc, str):
                inc = [s.strip() for s in inc.split("\n") if s.strip()]
            out["includes"] = [str(x) for x in inc if str(x).strip()]
    elif t == "meal":
        per_day = body.get("per_day_by_tier") or {}
        out["per_day_by_tier"] = {k: max(0.0, float(v or 0)) for k, v in per_day.items()}
        # Las comidas también pueden estar asociadas a una clasificación FSC.
        if "classification" in body:
            out["classification"] = (body.get("classification") or "").strip().upper()
    elif t == "meal_addon":
        # Alimentación adicional: {meal_type, classification, cost, cost_usd}.
        mt = (body.get("meal_type") or "").strip().upper()
        if mt and mt not in ("DESAYUNO", "ALMUERZO", "CENA"):
            raise HTTPException(status_code=400, detail="meal_type debe ser DESAYUNO, ALMUERZO o CENA")
        out["meal_type"] = mt
        out["classification"] = (body.get("classification") or "").strip().upper()
        out["cost"] = max(0.0, float(body.get("cost", 0) or 0))
        out["cost_usd"] = max(0.0, float(body.get("cost_usd", 0) or 0))
    elif t in ("transport", "tour"):
        out["price"] = max(0.0, float(body.get("price", 0) or 0))
        out["price_usd"] = max(0.0, float(body.get("price_usd", 0) or 0))
    return out


@api.get("/admin/catalog")
async def admin_list_catalog(_: dict = Depends(require_admin)):
    rows = await db.pricing_catalog.find({}, {"_id": 0}).sort([("type", 1), ("sort_order", 1)]).to_list(500)
    return rows


@api.post("/admin/catalog/{t}")
async def admin_create_catalog(t: str, body: dict, user: dict = Depends(require_admin)):
    if t not in CATALOG_TYPES:
        raise HTTPException(status_code=400, detail="Tipo inválido")
    update = _validate_catalog_row(t, body)
    # Generar id base: si es lodging, incluir la acomodación para diferenciar paquetes con el mismo nombre.
    base_slug_parts = [update["name"]]
    if t == "lodging" and update.get("accommodation_type"):
        base_slug_parts.append(update["accommodation_type"])
    rid = (body.get("id") or _slugify(" ".join(base_slug_parts)))
    # Si el id ya existe, agregar sufijo numérico (-2, -3, ...) hasta encontrar uno libre.
    if await db.pricing_catalog.find_one({"id": rid, "type": t}):
        if body.get("id"):
            raise HTTPException(status_code=400, detail="Ya existe un ítem con ese id")
        n = 2
        while await db.pricing_catalog.find_one({"id": f"{rid}-{n}", "type": t}):
            n += 1
        rid = f"{rid}-{n}"
    # Default sort_order = max + 1 of its type
    if "sort_order" not in update:
        last = await db.pricing_catalog.find({"type": t}, {"_id": 0, "sort_order": 1}).sort("sort_order", -1).limit(1).to_list(1)
        update["sort_order"] = (last[0]["sort_order"] + 1) if last else 0
    doc = {"id": rid, "type": t, "created_at": update["updated_at"], **update}
    await db.pricing_catalog.insert_one(doc)
    await _record_audit(f"catalog_{t}", rid, "create", None, "active", user)
    doc.pop("_id", None)
    return doc


@api.put("/admin/catalog/{t}/{rid}")
async def admin_update_catalog(t: str, rid: str, body: dict, user: dict = Depends(require_admin)):
    if t not in CATALOG_TYPES:
        raise HTTPException(status_code=400, detail="Tipo inválido")
    prev = await db.pricing_catalog.find_one({"id": rid, "type": t}, {"_id": 0})
    if not prev:
        raise HTTPException(status_code=404, detail="Ítem no encontrado")
    update = _validate_catalog_row(t, body)
    await db.pricing_catalog.update_one({"id": rid, "type": t}, {"$set": update})
    await _record_audit(f"catalog_{t}", rid, "update", "active", "active", user, note=f"Actualizado: {', '.join(update.keys())}")
    return {**prev, **update}


@api.delete("/admin/catalog/{t}/{rid}")
async def admin_delete_catalog(t: str, rid: str, user: dict = Depends(require_admin)):
    if t not in CATALOG_TYPES:
        raise HTTPException(status_code=400, detail="Tipo inválido")
    res = await db.pricing_catalog.delete_one({"id": rid, "type": t})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Ítem no encontrado")
    await _record_audit(f"catalog_{t}", rid, "delete", "active", "deleted", user)
    return {"ok": True}

# -------------------- Clubs CRUD --------------------
@api.get("/clubs", response_model=List[ClubOut])
async def list_clubs(status: Optional[str] = None):
    q = {}
    if status:
        q["status"] = status
    items = await db.clubs.find(q, {"_id": 0}).sort("name", 1).to_list(2000)
    return items

@api.get("/clubs/{cid}", response_model=ClubOut)
async def get_club(cid: str):
    item = await db.clubs.find_one({"id": cid}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Club no encontrado")
    return item

@api.post("/clubs", response_model=ClubOut)
async def create_club(payload: ClubIn, _: dict = Depends(require_admin)):
    doc = {**payload.model_dump(), "id": str(uuid.uuid4()), "status": "aprobado", "created_at": datetime.now(timezone.utc).isoformat()}
    await db.clubs.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.put("/clubs/{cid}", response_model=ClubOut)
async def update_club(cid: str, payload: ClubIn, user: dict = Depends(get_current_user)):
    # admin OR the club manager can update
    club = await db.clubs.find_one({"id": cid}, {"_id": 0})
    if not club:
        raise HTTPException(status_code=404, detail="Club no encontrado")
    if user.get("role") != "admin" and club.get("manager_user_id") != user["id"]:
        raise HTTPException(status_code=403, detail="No autorizado")
    update = payload.model_dump()
    await db.clubs.update_one({"id": cid}, {"$set": update})
    return {**club, **update}

@api.delete("/clubs/{cid}")
async def delete_club(cid: str, _: dict = Depends(require_admin)):
    res = await db.clubs.delete_one({"id": cid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Club no encontrado")
    return {"ok": True}

@api.patch("/clubs/{cid}/logo")
async def update_club_logo(cid: str, payload: dict, user: dict = Depends(get_current_user)):
    """Solo admin o el Director (manager_user_id del club) pueden actualizar el logo.
    El Cuerpo Técnico NO tiene este permiso, aunque pertenezca al club."""
    club = await db.clubs.find_one({"id": cid}, {"_id": 0})
    if not club:
        raise HTTPException(status_code=404, detail="Club no encontrado")
    if user.get("role") != "admin" and club.get("manager_user_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Solo el Director del club puede actualizar el logo.")
    logo_url = (payload.get("logo_url") or "").strip()
    await db.clubs.update_one({"id": cid}, {"$set": {"logo_url": logo_url}})
    return {"ok": True, "logo_url": logo_url}

@api.put("/clubs/{cid}/status")
async def set_club_status(cid: str, status: str, user: dict = Depends(require_admin)):
    if status not in {"pendiente", "aprobado", "rechazado"}:
        raise HTTPException(status_code=400, detail="Estado inválido")
    prev = await db.clubs.find_one({"id": cid}, {"_id": 0, "status": 1})
    if not prev:
        raise HTTPException(status_code=404, detail="Club no encontrado")
    actor = await _record_audit("club", cid, "status_change", prev.get("status"), status, user)
    await db.clubs.update_one({"id": cid}, {"$set": {"status": status, **actor}})
    return {"ok": True}

# DT can register additional teams under their existing club
class TeamAddIn(BaseModel):
    # Modelo legacy (event_type + birth_year + designation)
    event_type: Optional[Literal["festival", "premier_par", "premier_impar"]] = None
    birth_year: Optional[int] = Field(default=None, ge=2008, le=2030)
    designation: Optional[Literal["Único", "Equipo A", "Equipo B"]] = "Único"
    # Modelo nuevo: vinculado a un Tournament del Admin + Categoría con fee.
    tournament_id: Optional[str] = ""
    category_name: Optional[str] = ""
    team_name: Optional[str] = ""

@api.post("/clubs/{cid}/teams")
async def add_team_to_club(cid: str, payload: TeamAddIn, user: dict = Depends(get_current_user)):
    if user.get("role") not in ("admin", "team"):
        raise HTTPException(status_code=403, detail="No autorizado")
    club = await db.clubs.find_one({"id": cid}, {"_id": 0})
    if not club:
        raise HTTPException(status_code=404, detail="Club no encontrado")
    # Autorización: admin OK; o cualquier usuario (Directivo / Cuerpo Técnico) cuyo club_id = cid;
    # o el manager histórico (legacy donde club_id pudiera no estar seteado).
    if user.get("role") != "admin":
        is_member = user.get("club_id") == cid
        is_manager = club.get("manager_user_id") == user["id"]
        if not (is_member or is_manager):
            raise HTTPException(status_code=403, detail="No autorizado")
    if user.get("role") != "admin" and (club.get("status") or "pendiente") != "aprobado":
        raise HTTPException(
            status_code=403,
            detail=f"Tu club '{club.get('name','')}' está en estado '{club.get('status','pendiente')}'. Espera la aprobación del administrador para inscribir equipos a eventos.",
        )

    now = datetime.now(timezone.utc).isoformat()

    # --- Nuevo flujo: tournament_id + category_name + team_name ---
    if payload.tournament_id:
        t = await db.tournaments.find_one({"id": payload.tournament_id}, {"_id": 0})
        if not t:
            raise HTTPException(status_code=404, detail="Evento no encontrado")
        name = (payload.team_name or "").strip()
        if not name:
            raise HTTPException(status_code=400, detail="El nombre del equipo es obligatorio")
        cat_name = (payload.category_name or "").strip()
        if not cat_name:
            raise HTTPException(status_code=400, detail="Debes seleccionar una categoría")
        cats = t.get("categories") or []
        cat_match = next((c for c in cats if (c.get("name") or "").strip() == cat_name), None)
        if not cat_match:
            raise HTTPException(status_code=400, detail=f"La categoría '{cat_name}' no pertenece al evento '{t.get('name','')}'")
        existing = await db.teams.find_one({
            "club_id": cid,
            "tournament_id": payload.tournament_id,
            "category": cat_name,
            "name": name,
        })
        if existing:
            raise HTTPException(status_code=400, detail="Ya existe un equipo con ese nombre en esa categoría del evento")
        fee = float(cat_match.get("fee", 0) or 0)
        tid = str(uuid.uuid4())
        team_doc = {
            "id": tid,
            "name": name,
            "club_id": cid,
            "club_name": club["name"],
            "tournament_id": payload.tournament_id,
            "tournament_name": t.get("name", ""),
            "event_type": t.get("event_type", "festival"),
            "category": cat_name,
            "designation": "Único",
            "coach": user.get("name", ""),
            "city": club.get("city", ""),
            "country": club.get("country", ""),
            "logo_url": club.get("logo_url", ""),
            "color": club.get("color", "#1d4ed8"),
            "manager_user_id": club.get("manager_user_id", ""),
            "status": "pendiente",
            "registration_fee": fee,
            "registration_payment_status": "pending",
            "cuerpo_tecnico": [],
            "created_at": now,
        }
        await db.teams.insert_one(team_doc)
        team_doc.pop("_id", None)
        return team_doc

    # --- Flujo legacy: event_type + birth_year ---
    if not payload.event_type or not payload.birth_year:
        raise HTTPException(status_code=400, detail="Debes seleccionar Evento, Categoría y Nombre del equipo")
    event = EVENT_TYPES.get(payload.event_type)
    if payload.birth_year not in event["birth_years"]:
        raise HTTPException(status_code=400, detail=f"El año {payload.birth_year} no aplica al {event['name']}")
    existing = await db.teams.find_one({
        "club_id": cid,
        "event_type": payload.event_type,
        "birth_year": payload.birth_year,
        "designation": payload.designation,
    })
    if existing:
        raise HTTPException(status_code=400, detail="Ya tienes un equipo con esa designación para ese evento y año")

    fee = float(event.get("fees_by_year", {}).get(str(payload.birth_year), event["registration_fee_per_team"]))
    tid = str(uuid.uuid4())
    team_doc = {
        "id": tid,
        "name": f"{club['name']} {payload.birth_year} {payload.designation}".strip(),
        "club_id": cid,
        "club_name": club["name"],
        "birth_year": payload.birth_year,
        "designation": payload.designation or "Único",
        "category": f"Año {payload.birth_year}",
        "coach": user.get("name", ""),
        "city": club.get("city", ""),
        "country": club.get("country", ""),
        "logo_url": club.get("logo_url", ""),
        "color": club.get("color", "#1d4ed8"),
        "manager_user_id": club.get("manager_user_id", ""),
        "status": "pendiente",
        "event_type": payload.event_type,
        "registration_fee": fee,
        "registration_payment_status": "pending",
        "cuerpo_tecnico": [],
        "created_at": now,
    }
    await db.teams.insert_one(team_doc)
    team_doc.pop("_id", None)
    return team_doc

@api.get("/clubs/{cid}/teams")
async def list_club_teams(cid: str):
    items = await db.teams.find({"club_id": cid}, {"_id": 0}).sort("birth_year", 1).to_list(500)
    return items


async def _require_club_approved(user: dict, *, action: str = "esta acción"):
    """Raise 403 si el usuario es DT (rol=team) y su club aún no fue aprobado.
    Admins y otros roles pasan sin restricción."""
    if user.get("role") != "team":
        return
    team_id = user.get("team_id")
    if not team_id:
        return
    team = await db.teams.find_one({"id": team_id}, {"_id": 0, "club_id": 1})
    if not team:
        return
    cid = team.get("club_id")
    if not cid:
        return
    club = await db.clubs.find_one({"id": cid}, {"_id": 0, "status": 1, "name": 1})
    if not club:
        return
    status = club.get("status") or "pendiente"
    if status != "aprobado":
        raise HTTPException(
            status_code=403,
            detail=f"Tu club '{club.get('name','')}' aún está en estado '{status}'. No puedes realizar {action} hasta que el administrador lo apruebe.",
        )


@api.get("/admin/clubs/{cid}/users")
async def list_club_users(cid: str, _: dict = Depends(require_admin)):
    """Lista los usuarios registrados asociados a un club (manager + cualquier user con club_id o team del club)."""
    club = await db.clubs.find_one({"id": cid}, {"_id": 0})
    if not club:
        raise HTTPException(status_code=404, detail="Club no encontrado")
    manager_id = club.get("manager_user_id")
    # Usuarios con club_id apuntando a este club (incluye Directivo y Cuerpo Técnico).
    team_ids = [t["id"] async for t in db.teams.find({"club_id": cid}, {"_id": 0, "id": 1})]
    user_ids = set()
    if manager_id:
        user_ids.add(manager_id)
    # 1) Cualquier usuario con club_id = cid (Directivo, Cuerpo Técnico, futuros roles).
    async for u in db.users.find({"club_id": cid}, {"_id": 0, "id": 1}):
        user_ids.add(u["id"])
    # 2) Fallback legacy: usuarios con team_id de algún team del club (registros viejos sin club_id).
    if team_ids:
        async for u in db.users.find({"team_id": {"$in": team_ids}}, {"_id": 0, "id": 1}):
            user_ids.add(u["id"])
    if not user_ids:
        return []
    users = await db.users.find(
        {"id": {"$in": list(user_ids)}},
        {"_id": 0, "id": 1, "name": 1, "email": 1, "role": 1, "team_id": 1, "manager_role": 1, "phone": 1, "created_at": 1}
    ).to_list(200)
    return users


@api.get("/admin/clubs-tree")
async def admin_clubs_tree(_: dict = Depends(require_admin)):
    """Vista jerárquica: cada club con sus equipos agrupados por (event_type, category).
    Incluye jugadores y cuerpo técnico de cada equipo."""
    clubs = await db.clubs.find({}, {"_id": 0}).sort("name", 1).to_list(500)
    if not clubs:
        return []
    club_ids = [c["id"] for c in clubs]
    teams = await db.teams.find({"club_id": {"$in": club_ids}}, {"_id": 0}).to_list(2000)
    team_ids = [t["id"] for t in teams]
    players = []
    if team_ids:
        players = await db.players.find({"team_id": {"$in": team_ids}}, {"_id": 0}).to_list(5000)
    # Group players by team_id
    players_by_team = {}
    for p in players:
        players_by_team.setdefault(p["team_id"], []).append(p)
    # Group teams by club_id
    teams_by_club = {}
    for t in teams:
        teams_by_club.setdefault(t["club_id"], []).append(t)
    result = []
    for c in clubs:
        c_teams = teams_by_club.get(c["id"], [])
        for t in c_teams:
            t["players"] = players_by_team.get(t["id"], [])
        c["teams"] = c_teams
        result.append(c)
    return result

# -------------------- Quotes (Cotizaciones) --------------------
def _calc_lodging_block(tier: dict, pax: int, nights: int, extras: list, currency: str = "COP") -> dict:
    """Calcula el bloque de hospedaje para un paquete: principal + extras (personas adicionales).
    Si `currency=='USD'`, usa los precios *_usd. Si en USD un valor es 0, no se cobra (no hace fallback a COP)."""
    is_usd = (currency == "USD")
    base_5 = float((tier or {}).get("base_5_nights_usd" if is_usd else "base_5_nights", 0) or 0)
    add_night = float((tier or {}).get("additional_night_usd" if is_usd else "additional_night", 0) or 0)
    extra_nights = max(0, int(nights or 0) - 5)
    rate_per_person = base_5 + add_night * extra_nights

    # Promo 21 gratis (solo a pax principal).
    free_21_enabled = bool((tier or {}).get("free_21st_enabled"))
    pax = max(0, int(pax or 0))
    free_units = (pax // 20) if free_21_enabled else 0
    paying_pax = max(0, pax - free_units)
    main_subtotal = rate_per_person * paying_pax

    # Personas adicionales (acompañantes) DENTRO de este paquete.
    # Por solicitud del usuario: valor unitario = NOCHE ADICIONAL del paquete.
    # Subtotal = additional_night × noches × pax.
    extras_total = 0.0
    extras_breakdown = []
    for ep in (extras or []):
        try:
            ep_pax = int(ep.get("pax") or 0)
            ep_nights = int(ep.get("nights") or 0)
        except (TypeError, ValueError):
            continue
        if ep_pax <= 0 or ep_nights <= 0 or add_night <= 0:
            continue
        ep_rate = add_night  # valor unitario = noche adicional
        ep_sub = ep_rate * ep_nights * ep_pax
        extras_total += ep_sub
        extras_breakdown.append({
            "label": str(ep.get("label", "")),
            "pax": ep_pax,
            "nights": ep_nights,
            "date_from": str(ep.get("date_from", "") or ep.get("start_date", "")),
            "date_to": str(ep.get("date_to", "") or ep.get("end_date", "")),
            "rate_per_person": ep_rate,
            "subtotal": ep_sub,
        })

    return {
        "tier_id": (tier or {}).get("id"),
        "tier_name": (tier or {}).get("name"),
        "tier_description": (tier or {}).get("description", ""),
        "tier_includes": (tier or {}).get("includes", []),
        "tier_accommodation": (tier or {}).get("accommodation_type", "") or (tier or {}).get("classification", ""),
        "pax": pax,
        "nights": int(nights or 0),
        "extra_nights": extra_nights,
        "rate_per_person_5nights": base_5,
        "rate_per_person_additional_night": add_night,
        "rate_per_person_total": rate_per_person,
        "free_21_enabled": free_21_enabled,
        "free_lodging_units": free_units,
        "paying_pax_lodging": paying_pax,
        "main_subtotal": main_subtotal,
        "extra_pax_subtotal": extras_total,
        "extra_pax_breakdown": extras_breakdown,
        "subtotal": main_subtotal + extras_total,
    }


def _calculate_quote(payload: QuoteIn, catalog: dict) -> dict:
    lodging_cat = catalog["lodging"] or {}
    meal_plans = catalog["meals"] or {}

    nights = payload.nights or EVENT_NIGHTS
    days = payload.days or EVENT_DAYS
    meal_days = payload.meal_days or days
    currency = (payload.currency or "COP").upper()
    is_usd = (currency == "USD")

    # ============ HOSPEDAJE — soporta múltiples paquetes (nuevo) o legacy single ============
    lodgings_breakdown = []
    if payload.lodgings:
        for ld in payload.lodgings:
            tier_id = (ld or {}).get("tier_id") or ""
            tier = lodging_cat.get(tier_id)
            if not tier:
                continue
            block = _calc_lodging_block(
                tier,
                pax=int((ld or {}).get("pax") or 0),
                nights=int((ld or {}).get("nights") or nights),
                extras=(ld or {}).get("extra_pax_entries") or [],
                currency=currency,
            )
            lodgings_breakdown.append(block)
    elif payload.lodging_tier:
        # Legacy single lodging path
        tier = lodging_cat.get(payload.lodging_tier)
        if not tier:
            raise HTTPException(status_code=400, detail="Paquete de hospedaje inválido")
        block = _calc_lodging_block(
            tier,
            pax=int(payload.pax or 0),
            nights=int(nights),
            extras=payload.extra_pax_entries or [],
            currency=currency,
        )
        lodgings_breakdown.append(block)

    lodging_total = sum(b["subtotal"] for b in lodgings_breakdown)
    extra_pax_total = sum(b["extra_pax_subtotal"] for b in lodgings_breakdown)

    # Para compat con UI antigua: primer paquete dicta los "headline" stats
    headline = lodgings_breakdown[0] if lodgings_breakdown else {}
    primary_tier_id = headline.get("tier_id") or payload.lodging_tier or ""

    # ============ ALIMENTACIÓN ============
    # Prioridad 1: si una meal_entry trae `meal_addon_id`, usar el catálogo meal_addons del admin (precio unitario).
    # Prioridad 2 (legacy): meal_type + matriz per_day_by_tier (paquete actual).
    meal_addons_cat = catalog.get("meal_addons") or {}
    breakfast_per_day = float((meal_plans.get("breakfast") or {}).get("per_day_by_tier", {}).get(primary_tier_id, 0) or 0)
    lunch_per_day = float((meal_plans.get("lunch") or {}).get("per_day_by_tier", {}).get(primary_tier_id, 0) or 0)
    dinner_per_day = float((meal_plans.get("dinner") or {}).get("per_day_by_tier", {}).get(primary_tier_id, 0) or 0)
    rate_by_meal = {"breakfast": breakfast_per_day, "lunch": lunch_per_day, "dinner": dinner_per_day}

    total_lodging_pax = sum(b.get("pax", 0) for b in lodgings_breakdown) or int(payload.pax or 0)

    breakfast_total = lunch_total = dinner_total = 0.0
    meals_breakdown = []
    if payload.meal_entries:
        for me in payload.meal_entries:
            pax_n = int(me.pax or 0)
            if pax_n <= 0:
                continue
            unit = 0.0
            name = ""
            mtype = (me.meal_type or "").lower()
            if me.meal_addon_id and me.meal_addon_id in meal_addons_cat:
                ma = meal_addons_cat[me.meal_addon_id]
                unit = float(ma.get("cost_usd" if is_usd else "cost", 0) or 0)
                name = ma.get("name", "")
                mtype_raw = (ma.get("meal_type") or "").lower()
                if "desayuno" in mtype_raw or mtype_raw == "breakfast":
                    mtype = "breakfast"
                elif "almuerzo" in mtype_raw or mtype_raw == "lunch":
                    mtype = "lunch"
                elif "cena" in mtype_raw or mtype_raw == "dinner":
                    mtype = "dinner"
            elif mtype in rate_by_meal and not is_usd:
                # Legacy: la matriz per_day_by_tier solo está en COP.
                unit = float(rate_by_meal.get(mtype, 0) or 0)
                name = {"breakfast": "Desayuno", "lunch": "Almuerzo", "dinner": "Cena"}.get(mtype, mtype)
            if unit <= 0:
                continue
            sub = unit * pax_n
            meals_breakdown.append({
                "date": me.date,
                "meal_addon_id": me.meal_addon_id or "",
                "meal_type": mtype,
                "name": name,
                "pax": pax_n,
                "unit": unit,
                "subtotal": sub,
            })
            if mtype == "breakfast": breakfast_total += sub
            elif mtype == "lunch": lunch_total += sub
            elif mtype == "dinner": dinner_total += sub
    else:
        breakfast_total = breakfast_per_day * total_lodging_pax * meal_days if payload.includes_breakfast and breakfast_per_day > 0 else 0
        lunch_total     = lunch_per_day     * total_lodging_pax * meal_days if payload.includes_lunch     and lunch_per_day     > 0 else 0
        dinner_total    = dinner_per_day    * total_lodging_pax * meal_days if payload.includes_dinner    and dinner_per_day    > 0 else 0
    meals_total = breakfast_total + lunch_total + dinner_total

    # ============ TRANSPORTE (global) ============
    _price_field = "price_usd" if is_usd else "price"
    transport_entries_calc = []
    if payload.transport_entries:
        for te in payload.transport_entries:
            rid = (te or {}).get("route_id")
            qty = int((te or {}).get("pax") or 0)
            if not rid or qty <= 0:
                continue
            price = float((catalog["transport"].get(rid, {}) or {}).get(_price_field, 0) or 0)
            route_name = (catalog["transport"].get(rid, {}) or {}).get("name", "") or rid
            transport_entries_calc.append({
                "route_id": rid,
                "route_name": route_name,
                "pax": qty,
                "date": (te or {}).get("date", ""),
                "subtotal": price * qty,
            })
        transport_total = sum(t["subtotal"] for t in transport_entries_calc)
        transport_routes = [t["route_id"] for t in transport_entries_calc]
    else:
        transport_total = sum(
            float((catalog["transport"].get(r, {}) or {}).get(_price_field, 0) or 0) * total_lodging_pax for r in (payload.transport_routes or [])
        )
        transport_routes = list(payload.transport_routes or [])
        if payload.includes_transport and not transport_routes:
            transport_routes = ["airport_to_hotel", "hotel_to_airport"]
            transport_total = sum(
                float((catalog["transport"].get(r, {}) or {}).get(_price_field, 0) or 0) * total_lodging_pax for r in transport_routes
            )

    # ============ TOURS (global) ============
    tour_subtotals = []
    if payload.tour_entries:
        for te in payload.tour_entries:
            price = float((catalog["tours"].get(te.tour_id, {}) or {}).get(_price_field, 0) or 0)
            tname = (catalog["tours"].get(te.tour_id, {}) or {}).get("name", "") or te.tour_id
            tour_subtotals.append({"tour_id": te.tour_id, "tour_name": tname, "pax": te.pax, "subtotal": price * int(te.pax)})
    else:
        tour_ids = list(payload.tour_ids or [])
        if (payload.includes_parque or payload.includes_tour) and "parque_del_cafe" not in tour_ids:
            tour_ids.append("parque_del_cafe")
        for tid in tour_ids:
            price = float((catalog["tours"].get(tid, {}) or {}).get(_price_field, 0) or 0)
            tname = (catalog["tours"].get(tid, {}) or {}).get("name", "") or tid
            tour_subtotals.append({"tour_id": tid, "tour_name": tname, "pax": total_lodging_pax, "subtotal": price * total_lodging_pax})
    tours_total = sum(t["subtotal"] for t in tour_subtotals)
    tour_ids_applied = [t["tour_id"] for t in tour_subtotals]

    # ============ INSCRIPCIÓN — soporta múltiples eventos o legacy ============
    registration = 0.0
    registration_breakdown = []
    events_breakdown = []

    if payload.include_registration:
        if payload.events:
            # Nuevo: múltiples eventos, cada uno con sus categorías inscritas.
            _fee_key = "fee_usd" if is_usd else "fee"
            for ev in payload.events:
                ev_name = str((ev or {}).get("tournament_name") or (ev or {}).get("name") or "")
                ev_cats = (ev or {}).get("categories") or []
                ev_cats_norm = []
                ev_subtotal = 0.0
                for c in ev_cats:
                    try:
                        cfee = float((c or {}).get(_fee_key, 0) or 0)
                    except (TypeError, ValueError):
                        cfee = 0.0
                    cname = str((c or {}).get("name", ""))
                    ev_cats_norm.append({"name": cname, "fee": cfee})
                    registration_breakdown.append({"name": f"{ev_name} · {cname}" if ev_name else cname, "fee": cfee})
                    ev_subtotal += cfee
                events_breakdown.append({
                    "tournament_id": (ev or {}).get("tournament_id", ""),
                    "tournament_name": ev_name,
                    "event_type": (ev or {}).get("event_type", ""),
                    "categories": ev_cats_norm,
                    "subtotal": ev_subtotal,
                })
                registration += ev_subtotal
        elif payload.categories:
            _fee_key = "fee_usd" if is_usd else "fee"
            for c in payload.categories:
                try:
                    cfee = float(c.get(_fee_key, 0) or 0)
                except (TypeError, ValueError):
                    cfee = 0.0
                registration += cfee
                registration_breakdown.append({"name": str(c.get("name", "")), "fee": cfee})
        else:
            # No hay events ni categories seleccionados → no se cobra inscripción.
            # (Antes caía al fallback EVENT_TYPES legacy y mostraba un valor "fantasma".)
            registration = 0.0

    other_charges = float(payload.other_charges_amount or 0)
    total = lodging_total + meals_total + transport_total + tours_total + registration + other_charges

    # Display labels
    if payload.events:
        display_event_name = " · ".join([str(ev.get("tournament_name") or ev.get("name") or "") for ev in payload.events if (ev.get("tournament_name") or ev.get("name"))]) or "Múltiples eventos"
    elif payload.tournament_name:
        display_event_name = payload.tournament_name
    else:
        ev = EVENT_TYPES.get(payload.event_type) or {}
        display_event_name = ev.get("name", "")

    if len(lodgings_breakdown) > 1:
        display_lodging_name = f"{len(lodgings_breakdown)} paquetes"
    elif lodgings_breakdown:
        display_lodging_name = lodgings_breakdown[0].get("tier_name") or ""
    else:
        display_lodging_name = ""

    return {
        "lodging_subtotal": lodging_total,
        "lodgings_breakdown": lodgings_breakdown,
        "extra_pax_subtotal": extra_pax_total,
        # Headline (primer paquete) para compat con UI legacy
        "extra_pax_breakdown": headline.get("extra_pax_breakdown", []),
        "rate_per_person_total": headline.get("rate_per_person_total", 0),
        "rate_per_person_5nights": headline.get("rate_per_person_5nights", 0),
        "rate_per_person_additional_night": headline.get("rate_per_person_additional_night", 0),
        "extra_nights": headline.get("extra_nights", 0),
        "free_21_enabled": headline.get("free_21_enabled", False),
        "free_lodging_units": sum(b.get("free_lodging_units", 0) for b in lodgings_breakdown),
        "paying_pax_lodging": sum(b.get("paying_pax_lodging", 0) for b in lodgings_breakdown),
        "meals_subtotal": meals_total,
        "meals_breakdown": meals_breakdown,
        "breakfast_subtotal": breakfast_total,
        "lunch_subtotal": lunch_total,
        "dinner_subtotal": dinner_total,
        "transport_subtotal": transport_total,
        "transport_routes_applied": transport_routes,
        "transport_entries_breakdown": transport_entries_calc,
        "tours_subtotal": tours_total,
        "tour_subtotals": tour_subtotals,
        "tour_ids_applied": tour_ids_applied,
        "parque_subtotal": next((t["subtotal"] for t in tour_subtotals if t["tour_id"] == "parque_del_cafe"), 0),
        "tour_subtotal": 0,
        "registration_fee": registration,
        "registration_breakdown": registration_breakdown,
        "events_breakdown": events_breakdown,
        "other_charges_amount": other_charges,
        "other_charges_concept": (payload.other_charges_concept or ""),
        "total_amount": total,
        "currency": currency,
        "event_name": display_event_name,
        "lodging_name": display_lodging_name,
        "nights": nights,
        "days": days,
        "pax": total_lodging_pax,
    }

@api.post("/quotes/calculate")
async def calculate_quote(payload: QuoteIn):
    """Public estimate without saving."""
    cat = await _load_catalog()
    return _calculate_quote(payload, cat)

@api.post("/quotes")
async def create_quote(payload: QuoteIn, user: dict = Depends(get_current_user)):
    if user.get("role") not in ("team", "admin"):
        raise HTTPException(status_code=403, detail="Solo los usuarios de club pueden enviar cotizaciones")
    # Solo el Directivo del club puede cotizar — el Cuerpo Técnico no.
    if user.get("role") == "team" and (user.get("manager_role") or "").strip().lower() not in ("directivo", "director técnico", "director tecnico", "presidente"):
        raise HTTPException(status_code=403, detail="Solo el Directivo del club puede realizar cotizaciones. El Cuerpo Técnico no tiene este permiso.")
    await _require_club_approved(user, action="cotizaciones")
    cat = await _load_catalog()
    breakdown = _calculate_quote(payload, cat)
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "user_name": user["name"],
        "user_email": user["email"],
        "team_id": user.get("team_id"),
        **payload.model_dump(),
        **breakdown,
        "status": "pendiente",  # pendiente, aprobada, rechazada, pagada
        "payment_proof_url": "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.quotes.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.put("/quotes/{qid}")
async def update_quote(qid: str, payload: QuoteIn, user: dict = Depends(get_current_user)):
    """El dueño (DT/presidente) o admin puede editar su cotización. Cualquier edición la deja en 'pendiente'."""
    existing = await db.quotes.find_one({"id": qid}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    is_owner = existing.get("user_id") == user["id"]
    is_admin = user.get("role") == "admin"
    if not (is_owner or is_admin):
        raise HTTPException(status_code=403, detail="No puedes editar esta cotización")
    if existing.get("status") == "pagada" and not is_admin:
        raise HTTPException(status_code=400, detail="No se puede editar una cotización pagada")
    cat = await _load_catalog()
    breakdown = _calculate_quote(payload, cat)
    updates = {
        **payload.model_dump(),
        **breakdown,
        # Si edita el admin: preservar estado actual (puede ser aprobada).
        # Si edita el dueño: vuelve a pendiente para re-aprobación.
        "status": existing.get("status") if is_admin else "pendiente",
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    actor = await _record_audit("quote", qid, "owner_edit", existing.get("status"), "pendiente", user)
    updates.update(actor)
    await db.quotes.update_one({"id": qid}, {"$set": updates})
    doc = await db.quotes.find_one({"id": qid}, {"_id": 0})
    return doc

@api.patch("/quotes/{qid}/other-charges")
async def patch_other_charges(qid: str, payload: dict, user: dict = Depends(get_current_user)):
    """Edita SOLO Otros Cobros (amount + concept) sin recalcular el resto del breakdown.
    Solo admin. El total se ajusta sumando/restando la diferencia con el valor previo."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo el administrador puede agregar otros cobros")
    existing = await db.quotes.find_one({"id": qid}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    try:
        new_amount = float(payload.get("other_charges_amount") or 0)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Valor inválido")
    new_concept = str(payload.get("other_charges_concept") or "").strip()
    prev_amount = float(existing.get("other_charges_amount") or 0)
    prev_total = float(existing.get("total_amount") or 0)
    new_total = prev_total - prev_amount + new_amount
    await db.quotes.update_one({"id": qid}, {"$set": {
        "other_charges_amount": new_amount,
        "other_charges_concept": new_concept,
        "total_amount": new_total,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }})
    doc = await db.quotes.find_one({"id": qid}, {"_id": 0})
    return doc

@api.get("/quotes/mine")
async def my_quotes(user: dict = Depends(get_current_user)):
    # Devuelve cotizaciones propias + del mismo club (para que Cuerpo Técnico también vea las del Directivo).
    or_filters = [{"user_id": user["id"]}]
    if user.get("club_id"):
        # Buscamos otros usuarios del mismo club y agregamos sus cotizaciones.
        club_users = await db.users.find({"club_id": user["club_id"]}, {"_id": 0, "id": 1}).to_list(50)
        club_uids = [u["id"] for u in club_users if u.get("id")]
        if club_uids:
            or_filters.append({"user_id": {"$in": club_uids}})
    items = await db.quotes.find({"$or": or_filters}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items

@api.get("/quotes/{qid}")
async def get_quote_detail(qid: str, _: dict = Depends(get_current_user)):
    """Detalles de cotización visibles para CUALQUIER usuario autenticado (admin, DT, presidente, etc.)."""
    q = await db.quotes.find_one({"id": qid}, {"_id": 0})
    if not q:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    # Enriquecer con el nombre del CLUB del usuario que cotizó (rol team o admin actuando para club).
    if not q.get("club_name") or not q.get("contact_phone"):
        uid = q.get("user_id")
        club_name = q.get("club_name") or ""
        contact_phone = q.get("contact_phone") or ""
        if uid:
            u = await db.users.find_one({"id": uid}, {"_id": 0, "team_id": 1, "club_id": 1, "phone": 1})
            if u:
                # Fallback de teléfono: phone del usuario → phone del club
                if not contact_phone:
                    contact_phone = u.get("phone") or ""
                if u.get("club_id"):
                    club = await db.clubs.find_one({"id": u["club_id"]}, {"_id": 0, "name": 1, "phone": 1})
                    if club:
                        if not club_name:
                            club_name = club.get("name") or ""
                        if not contact_phone:
                            contact_phone = club.get("phone") or ""
                if not club_name and u.get("team_id"):
                    t = await db.teams.find_one({"id": u["team_id"]}, {"_id": 0, "club_name": 1, "name": 1})
                    if t:
                        club_name = t.get("club_name") or t.get("name") or ""
        q["club_name"] = club_name
        q["contact_phone"] = contact_phone
    q.setdefault("contact_phone", "")

    # Enriquecer breakdowns con nombres/descripciones del catálogo (para cotizaciones legacy
    # que solo guardaron IDs). Esto se hace al leer; no muta el snapshot guardado.
    try:
        cat = await _load_catalog()
        lodging_cat = cat.get("lodging") or {}
        transport_cat = cat.get("transport") or {}
        tours_cat = cat.get("tours") or {}

        # Hospedaje: añadir descripción y acomodación si faltan
        for b in (q.get("lodgings_breakdown") or []):
            tier = lodging_cat.get(b.get("tier_id"))
            if tier:
                if not b.get("tier_name"):
                    b["tier_name"] = tier.get("name", "")
                if not b.get("tier_description"):
                    b["tier_description"] = tier.get("description", "")
                if not b.get("tier_accommodation"):
                    b["tier_accommodation"] = tier.get("accommodation_type", "") or tier.get("classification", "")
                if not b.get("tier_includes"):
                    b["tier_includes"] = tier.get("includes", [])

        # Transporte: añadir route_name si falta
        for t in (q.get("transport_entries_breakdown") or []):
            if not t.get("route_name"):
                rid = t.get("route_id")
                r = transport_cat.get(rid) if rid else None
                t["route_name"] = (r or {}).get("name", "") or (rid or "")

        # Tours: añadir tour_name si falta
        for ts in (q.get("tour_subtotals") or []):
            if not ts.get("tour_name"):
                tid = ts.get("tour_id")
                tr = tours_cat.get(tid) if tid else None
                ts["tour_name"] = (tr or {}).get("name", "") or (tid or "")
    except Exception:
        # No bloquear el detalle si falla el enriquecimiento.
        pass

    return q

def _fmt_money_pdf(amount, currency):
    try:
        n = float(amount or 0)
    except Exception:
        n = 0.0
    if currency == "USD":
        return f"US$ {n:,.2f} USD"
    # COP: separador con punto
    return f"$ {int(round(n)):,} COP".replace(",", ".")

@api.get("/quotes/{qid}/pdf")
async def quote_pdf(qid: str, user: dict = Depends(get_current_user)):
    """Genera un PDF de la cotización con identidad visual FSC + datos de contacto del Home."""
    q = await get_quote_detail(qid, user)  # type: ignore
    is_admin = user.get("role") == "admin"
    is_owner = q.get("user_id") == user.get("id")
    if not (is_admin or is_owner):
        u_club = user.get("club_id")
        if not u_club:
            raise HTTPException(status_code=403, detail="No autorizado")
        owner_doc = await db.users.find_one({"id": q.get("user_id")}, {"_id": 0, "club_id": 1}) if q.get("user_id") else None
        if not owner_doc or owner_doc.get("club_id") != u_club:
            raise HTTPException(status_code=403, detail="No autorizado")

    # Cargar Home settings para contacto/redes
    home = await db.home_settings.find_one({"id": HOME_SETTINGS_ID}, {"_id": 0}) or {}
    contact_email = home.get("contact_email") or "info@futuresoccercup.com"
    contact_phone = home.get("contact_phone") or "+57 (000) 000-0000"
    instagram = home.get("instagram") or ""
    facebook = home.get("facebook") or ""
    youtube = home.get("youtube") or ""

    # Logo cacheado en memoria
    logo_bytes = _get_fsc_logo_bytes()

    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_RIGHT, TA_LEFT, TA_CENTER
    from reportlab.lib import colors
    from reportlab.lib.units import inch
    from reportlab.platypus import (
        BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle, Image
    )
    from io import BytesIO

    BRAND_BLUE = colors.HexColor("#0640c8")
    BRAND_DARK = colors.HexColor("#0a1426")
    BRAND_RED = colors.HexColor("#e11d48")
    LIGHT_BG = colors.HexColor("#f5f8ff")
    BORDER = colors.HexColor("#cbd5e1")

    buf = BytesIO()

    styles = getSampleStyleSheet()
    H1 = ParagraphStyle("H1", parent=styles["Heading1"], fontSize=22, textColor=colors.white, leading=24, alignment=TA_LEFT, spaceAfter=0)
    H2 = ParagraphStyle("H2", parent=styles["Heading2"], fontSize=11, textColor=BRAND_BLUE, leading=14, spaceBefore=12, spaceAfter=4, fontName="Helvetica-Bold")
    N = ParagraphStyle("N", parent=styles["Normal"], fontSize=9, leading=12)
    NB = ParagraphStyle("NB", parent=N, fontName="Helvetica-Bold")
    SMALL = ParagraphStyle("SMALL", parent=N, fontSize=7.5, textColor=colors.grey, leading=10)
    WHITE_SMALL = ParagraphStyle("WHITE_SMALL", parent=N, fontSize=8, textColor=colors.white, leading=10)
    WHITE_BIG = ParagraphStyle("WHITE_BIG", parent=N, fontSize=18, textColor=colors.white, fontName="Helvetica-Bold", alignment=TA_RIGHT, leading=20)

    def _header_footer(canvas, doc_):
        canvas.saveState()
        # === HEADER ===
        canvas.setFillColor(BRAND_DARK)
        canvas.rect(0, letter[1] - 1.1 * inch, letter[0], 1.1 * inch, fill=1, stroke=0)
        # Logo
        if logo_bytes:
            try:
                from reportlab.lib.utils import ImageReader
                img = ImageReader(BytesIO(logo_bytes))
                canvas.drawImage(img, 0.5 * inch, letter[1] - 1.0 * inch, width=0.9 * inch, height=0.9 * inch, preserveAspectRatio=True, mask='auto')
            except Exception:
                pass
        # Texto del header
        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica-Bold", 18)
        canvas.drawString(1.55 * inch, letter[1] - 0.55 * inch, "FUTURE SOCCER CUP")
        canvas.setFont("Helvetica-Oblique", 10)
        canvas.setFillColor(colors.HexColor("#9bb6ff"))
        canvas.drawString(1.55 * inch, letter[1] - 0.78 * inch, "Somos más que un torneo")
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.white)
        canvas.drawString(1.55 * inch, letter[1] - 0.98 * inch, "Iniciativa del Grupo Empresarial Ancla — Colombia")
        # Right-side label
        canvas.setFillColor(colors.HexColor("#9bb6ff"))
        canvas.setFont("Helvetica-Bold", 9)
        canvas.drawRightString(letter[0] - 0.5 * inch, letter[1] - 0.55 * inch, "COTIZACIÓN")
        # Línea azul fuerte
        canvas.setFillColor(BRAND_BLUE)
        canvas.rect(0, letter[1] - 1.13 * inch, letter[0], 0.03 * inch, fill=1, stroke=0)

        # === FOOTER ===
        canvas.setFillColor(BRAND_BLUE)
        canvas.rect(0, 0, letter[0], 0.55 * inch, fill=1, stroke=0)
        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica-Bold", 8)
        canvas.drawString(0.5 * inch, 0.34 * inch, contact_email)
        canvas.setFont("Helvetica", 8)
        canvas.drawString(0.5 * inch, 0.18 * inch, contact_phone)
        # Redes a la derecha
        social_parts = []
        if instagram: social_parts.append(f"IG: {instagram}")
        if facebook: social_parts.append(f"FB: {facebook}")
        if youtube: social_parts.append(f"YT: {youtube}")
        if social_parts:
            canvas.drawRightString(letter[0] - 0.5 * inch, 0.34 * inch, "  ·  ".join(social_parts))
        canvas.setFont("Helvetica-Oblique", 7)
        canvas.drawRightString(letter[0] - 0.5 * inch, 0.18 * inch, f"www.futuresoccercup.com   ·   FSC {datetime.now(timezone.utc).year}")
        canvas.restoreState()

    doc = BaseDocTemplate(buf, pagesize=letter, leftMargin=0.5 * inch, rightMargin=0.5 * inch, topMargin=1.25 * inch, bottomMargin=0.7 * inch)
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="main")
    doc.addPageTemplates([PageTemplate(id="default", frames=[frame], onPage=_header_footer)])

    cur = q.get("currency") or "COP"
    story = []

    # === BANNER COTIZACIÓN + TOTAL DESTACADO ===
    # Estilos dedicados con leading apropiado para cada tamaño de fuente.
    BANNER_LABEL = ParagraphStyle("BANNER_LABEL", parent=N, fontSize=8, textColor=colors.HexColor("#9bb6ff"), leading=10)
    BANNER_LABEL_R = ParagraphStyle("BANNER_LABEL_R", parent=BANNER_LABEL, alignment=TA_RIGHT)
    BANNER_TEXT = ParagraphStyle("BANNER_TEXT", parent=N, fontSize=9, textColor=colors.white, leading=11)
    BANNER_BIG_R = ParagraphStyle("BANNER_BIG_R", parent=N, fontSize=22, textColor=colors.white, fontName="Helvetica-Bold", alignment=TA_RIGHT, leading=26)

    left_cell = [
        Paragraph("<b>COTIZACIÓN</b>", BANNER_TEXT),
        Paragraph(f"ID: {q.get('id','')[:8].upper()}", BANNER_LABEL),
        Paragraph(f"Fecha: {(q.get('created_at') or '')[:10]}", BANNER_LABEL),
        Paragraph(f"<b>Estado:</b> {q.get('status','pendiente').upper()}", BANNER_TEXT),
    ]
    right_cell = [
        Paragraph(f"TOTAL {cur}", BANNER_LABEL_R),
        Spacer(1, 2),
        Paragraph(f"{_fmt_money_pdf(q.get('total_amount',0), cur)}", BANNER_BIG_R),
    ]
    banner_inner = Table([[left_cell, right_cell]], colWidths=[3.4 * inch, 4.1 * inch])
    banner_inner.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BRAND_DARK),
        ("LEFTPADDING", (0, 0), (-1, -1), 12), ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 10), ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
        ("VALIGN", (0, 0), (0, -1), "TOP"),
        ("VALIGN", (1, 0), (1, -1), "MIDDLE"),
    ]))
    story.append(banner_inner)
    story.append(Spacer(1, 12))

    # === CLIENTE ===
    story.append(Paragraph("CLIENTE", H2))
    cliente_rows = [
        ["Cliente", q.get("user_name") or "—"],
        ["Club", q.get("club_name") or "—"],
        ["Teléfono", q.get("contact_phone") or "—"],
        ["Email", q.get("user_email") or "—"],
    ]
    tbl_cli = Table(cliente_rows, colWidths=[1.2 * inch, 6.3 * inch])
    tbl_cli.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), LIGHT_BG),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
        ("LINEBELOW", (0, 0), (-1, -2), 0.3, BORDER),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(tbl_cli)

    # === HOSPEDAJE ===
    lodgings = q.get("lodgings_breakdown") or []
    if lodgings:
        story.append(Paragraph("PAQUETES DE HOSPEDAJE", H2))
        for i, b in enumerate(lodgings, 1):
            label_cell = Paragraph(
                f"<font color='#0640c8'><b>Paquete {i}</b></font> · <b>{b.get('tier_name','')}</b> "
                f"· {b.get('pax', 0)} pax"
                + (f"<br/><font size='7.5' color='#475569'><i>{b.get('tier_description','')}</i></font>" if b.get('tier_description') else "")
                + (f"<br/><font size='7.5'><b>Acomodación:</b> {b.get('tier_accommodation','')}</font>" if b.get('tier_accommodation') else ""),
                N
            )
            data = [
                [label_cell, Paragraph(f"<para align='right'><b>Subtotal</b><br/>{_fmt_money_pdf(b.get('subtotal',0), cur)}</para>", N)],
            ]
            tbl = Table(data, colWidths=[5.0 * inch, 2.5 * inch])
            tbl.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), LIGHT_BG),
                ("BOX", (0, 0), (-1, -1), 0.5, BRAND_BLUE),
                ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]))
            story.append(tbl)
            # Detalle valor paquete / noche adicional
            rows = [
                ["Valor Paquete", _fmt_money_pdf(b.get("rate_per_person_5nights", 0), cur)],
                ["Noche adicional", _fmt_money_pdf(b.get("rate_per_person_additional_night", 0), cur)],
            ]
            detail_tbl = Table(rows, colWidths=[5.0 * inch, 2.5 * inch])
            detail_tbl.setStyle(TableStyle([
                ("FONTSIZE", (0, 0), (-1, -1), 8.5),
                ("LINEBELOW", (0, 0), (-1, -1), 0.3, BORDER),
                ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]))
            story.append(detail_tbl)
            story.append(Spacer(1, 6))

    # === ALIMENTACIÓN ===
    meals = q.get("meals_breakdown") or []
    if meals:
        story.append(Paragraph("ALIMENTACIÓN", H2))
        data = [["Concepto", "Pax", "Subtotal"]]
        for m in meals:
            data.append([m.get("name") or m.get("meal_type",""), str(m.get("pax",0)), _fmt_money_pdf(m.get("subtotal",0), cur)])
        story.append(_section_table(data, [4.7 * inch, 0.8 * inch, 2.0 * inch], BRAND_BLUE, BORDER))

    # === TRANSPORTE ===
    transp = q.get("transport_entries_breakdown") or []
    if transp:
        story.append(Paragraph("TRANSPORTE", H2))
        data = [["Ruta", "Pax", "Fecha", "Subtotal"]]
        for r in transp:
            data.append([r.get("route_name") or r.get("route_id",""), str(r.get("pax",0)), r.get("date") or "—", _fmt_money_pdf(r.get("subtotal",0), cur)])
        story.append(_section_table(data, [3.5 * inch, 0.7 * inch, 1.3 * inch, 2.0 * inch], BRAND_BLUE, BORDER))

    # === TOURS ===
    tours = q.get("tour_subtotals") or []
    if tours:
        story.append(Paragraph("TOURS", H2))
        data = [["Tour", "Pax", "Subtotal"]]
        for t_ in tours:
            data.append([t_.get("tour_name") or t_.get("tour_id",""), str(t_.get("pax",0)), _fmt_money_pdf(t_.get("subtotal",0), cur)])
        story.append(_section_table(data, [4.7 * inch, 0.8 * inch, 2.0 * inch], BRAND_BLUE, BORDER))

    # === INSCRIPCIÓN ===
    reg = float(q.get("registration_fee") or 0)
    if reg:
        story.append(Paragraph("INSCRIPCIÓN", H2))
        reg_tbl = Table([["Inscripción total", _fmt_money_pdf(reg, cur)]], colWidths=[5.5 * inch, 2.0 * inch])
        reg_tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), LIGHT_BG),
            ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
            ("ALIGN", (1, 0), (1, -1), "RIGHT"), ("FONTNAME", (1, 0), (1, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9.5),
            ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(reg_tbl)

    # === OTROS COBROS ===
    other_amt = float(q.get("other_charges_amount") or 0)
    if other_amt:
        story.append(Paragraph("OTROS COBROS", H2))
        oc_data = [
            [Paragraph(f"<b>Concepto:</b><br/>{q.get('other_charges_concept') or '—'}", N),
             Paragraph(f"<para align='right'><b>Valor</b><br/><font size='12'>{_fmt_money_pdf(other_amt, cur)}</font></para>", N)],
        ]
        oc_tbl = Table(oc_data, colWidths=[5.0 * inch, 2.5 * inch])
        oc_tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fffbeb")),
            ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#f59e0b")),
            ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(oc_tbl)

    # === TOTAL ===
    story.append(Spacer(1, 10))
    total_tbl = Table([[
        Paragraph("<font color='white' size='12'><b>TOTAL A PAGAR</b></font>", N),
        Paragraph(f"<para align='right'><font color='white' size='18'><b>{_fmt_money_pdf(q.get('total_amount',0), cur)}</b></font></para>", N),
    ]], colWidths=[3.5 * inch, 4.0 * inch])
    total_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BRAND_RED),
        ("LEFTPADDING", (0, 0), (-1, -1), 14), ("RIGHTPADDING", (0, 0), (-1, -1), 14),
        ("TOPPADDING", (0, 0), (-1, -1), 10), ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
    ]))
    story.append(total_tbl)

    # === NOTAS ===
    if q.get("notes"):
        story.append(Spacer(1, 10))
        story.append(Paragraph("OBSERVACIONES", H2))
        story.append(Paragraph(str(q.get("notes")), N))

    story.append(Spacer(1, 14))
    story.append(Paragraph(
        "Esta cotización es informativa y sujeta a las condiciones generales del evento. "
        "Confirmamos su validez al recibir el pago correspondiente. Para más información, contáctenos por los medios indicados en el pie de página.",
        SMALL
    ))

    doc.build(story)
    pdf_bytes = buf.getvalue()
    buf.close()
    from fastapi.responses import Response
    return Response(content=pdf_bytes, media_type="application/pdf", headers={
        "Content-Disposition": f"attachment; filename=cotizacion_{qid[:8]}.pdf"
    })


def _section_table(data, col_widths, header_bg, border):
    """Helper para tablas de secciones con header de color."""
    from reportlab.lib import colors as _c
    from reportlab.platypus import Table, TableStyle
    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), header_bg),
        ("TEXTCOLOR", (0, 0), (-1, 0), _c.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8.5),
        ("FONTSIZE", (0, 1), (-1, -1), 8.5),
        ("ALIGN", (-1, 0), (-1, -1), "RIGHT"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [_c.white, _c.HexColor("#f9fafb")]),
        ("BOX", (0, 0), (-1, -1), 0.5, border),
        ("LINEBELOW", (0, 0), (-1, 0), 0.3, _c.white),
        ("LEFTPADDING", (0, 0), (-1, -1), 7), ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return t


@api.get("/quotes")
async def all_quotes(_: dict = Depends(require_admin)):
    items = await db.quotes.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    # Default defensivo: garantizamos que el campo siempre existe.
    for q in items:
        q.setdefault("club_name", "")
    # Enriquecer cada cotización con el nombre del club asociado al user (rol team) o user.name.
    user_ids = list({q.get("user_id") for q in items if q.get("user_id")})
    if user_ids:
        users = await db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "team_id": 1}).to_list(len(user_ids))
        user_to_team = {u["id"]: u.get("team_id") for u in users if u.get("team_id")}
        team_ids = list({tid for tid in user_to_team.values() if tid})
        team_to_club = {}
        if team_ids:
            teams = await db.teams.find({"id": {"$in": team_ids}}, {"_id": 0, "id": 1, "club_name": 1, "name": 1}).to_list(len(team_ids))
            team_to_club = {t["id"]: (t.get("club_name") or t.get("name") or "") for t in teams}
        for q in items:
            uid = q.get("user_id")
            tid = user_to_team.get(uid)
            q["club_name"] = team_to_club.get(tid, "")
    return items

@api.put("/quotes/{qid}/status")
async def update_quote_status(qid: str, status: str, user: dict = Depends(require_admin)):
    if status not in {"pendiente", "aprobada", "rechazada", "pagada"}:
        raise HTTPException(status_code=400, detail="Estado inválido")
    prev = await db.quotes.find_one({"id": qid}, {"_id": 0, "status": 1})
    if not prev:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    actor = await _record_audit("quote", qid, "status_change", prev.get("status"), status, user)
    await db.quotes.update_one({"id": qid}, {"$set": {"status": status, **actor}})
    return {"ok": True}

@api.put("/quotes/{qid}/payment-proof")
async def attach_payment_proof(qid: str, payload: dict, user: dict = Depends(get_current_user)):
    quote = await db.quotes.find_one({"id": qid}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    if quote["user_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    url = payload.get("url", "")
    await db.quotes.update_one({"id": qid}, {"$set": {"payment_proof_url": url}})
    return {"ok": True}

# -------------------- Manual Payments (Abonos con comprobantes) --------------------
PAYMENT_STATUSES = ["sin_verificar", "aprobado", "saldo_pendiente", "rechazado"]
PAYMENT_TARGET_TYPES = ["quote", "team_registration"]


class PaymentIn(BaseModel):
    target_type: Literal["quote", "team_registration"]
    target_id: str
    amount: float = Field(gt=0)
    currency: Optional[Literal["COP", "USD"]] = "COP"  # moneda en la que se reporta el abono.
    payment_date: Optional[str] = None  # ISO date
    method: Optional[str] = "transferencia"  # transferencia | efectivo | pse | otro
    receipt_url: Optional[str] = ""
    reference: Optional[str] = ""  # nro. de comprobante/operación
    notes: Optional[str] = ""


class PaymentStatusUpdate(BaseModel):
    status: Literal["sin_verificar", "aprobado", "saldo_pendiente", "rechazado"]
    admin_note: Optional[str] = ""


async def _target_total(target_type: str, target_id: str) -> Optional[float]:
    if target_type == "quote":
        q = await db.quotes.find_one({"id": target_id}, {"_id": 0})
        return float(q["total_amount"]) if q else None
    if target_type == "team_registration":
        t = await db.teams.find_one({"id": target_id}, {"_id": 0})
        return float(t.get("registration_fee", 0)) if t else None
    return None


async def _can_pay(user: dict, target_type: str, target_id: str) -> bool:
    if user.get("role") == "admin":
        return True
    if target_type == "quote":
        q = await db.quotes.find_one({"id": target_id}, {"_id": 0})
        return q and q.get("user_id") == user["id"]
    if target_type == "team_registration":
        t = await db.teams.find_one({"id": target_id}, {"_id": 0})
        return t and t.get("manager_user_id") == user["id"]
    return False


async def _recompute_balance(target_type: str, target_id: str) -> dict:
    """Sum approved payments and update parent record's payment state.
    Idempotent: reverts paid_at and status when paid drops below total (e.g. admin
    rejects a previously-approved payment)."""
    total = await _target_total(target_type, target_id) or 0
    approved = await db.payments.aggregate([
        {"$match": {"target_type": target_type, "target_id": target_id, "status": "aprobado"}},
        {"$group": {"_id": None, "sum": {"$sum": "$amount"}}}
    ]).to_list(1)
    paid = float(approved[0]["sum"]) if approved else 0.0
    balance = max(total - paid, 0)
    fully_paid = total > 0 and paid >= total
    now = datetime.now(timezone.utc).isoformat()
    if target_type == "quote":
        update = {"amount_paid": paid, "amount_balance": balance}
        unset = {}
        if fully_paid:
            update["status"] = "pagada"
            update["payment_status"] = "paid"
            update["paid_at"] = now
        else:
            # Revert "pagada" if it had been marked previously
            quote = await db.quotes.find_one({"id": target_id}, {"_id": 0, "status": 1})
            if quote and quote.get("status") == "pagada":
                update["status"] = "aprobada"
            update["payment_status"] = "partial" if paid > 0 else "pending"
            unset["paid_at"] = ""
        op = {"$set": update}
        if unset:
            op["$unset"] = unset
        await db.quotes.update_one({"id": target_id}, op)
    elif target_type == "team_registration":
        update = {"registration_amount_paid": paid, "registration_amount_balance": balance}
        unset = {}
        if fully_paid:
            update["registration_payment_status"] = "paid"
            update["registration_paid_at"] = now
        else:
            update["registration_payment_status"] = "partial" if paid > 0 else "pending"
            unset["registration_paid_at"] = ""
        op = {"$set": update}
        if unset:
            op["$unset"] = unset
        await db.teams.update_one({"id": target_id}, op)
    return {"total": total, "paid": paid, "balance": balance}


# Receipt URL formats accepted:
#  - /api/files/...  (uploaded via /api/upload — preferred)
#  - http(s)://...   (external URL, e.g. cloud storage)
RECEIPT_URL_RE = re.compile(r"^(/api/files/[A-Za-z0-9._\-/]+|https?://[^\s]+)$")


def _validate_receipt_url(url: Optional[str]) -> str:
    url = (url or "").strip()
    if not url:
        raise HTTPException(status_code=400, detail="Debes adjuntar el comprobante de pago (receipt_url).")
    if not RECEIPT_URL_RE.match(url):
        raise HTTPException(status_code=400, detail="receipt_url inválido. Sube el comprobante con /api/upload o usa una URL https válida.")
    return url


async def _pending_balance(target_type: str, target_id: str, exclude_pid: Optional[str] = None) -> dict:
    """Returns {total, paid_approved, pending_sin_verificar, remaining_for_new_payment}.

    remaining_for_new_payment = max(total - approved - sin_verificar, 0)
    so a DT can't queue abonos that, combined, exceed the total target.
    """
    total = await _target_total(target_type, target_id) or 0
    q_match = {"target_type": target_type, "target_id": target_id}
    if exclude_pid:
        q_match["id"] = {"$ne": exclude_pid}
    pipeline = [
        {"$match": q_match},
        {"$group": {"_id": "$status", "sum": {"$sum": "$amount"}}}
    ]
    by_status = {row["_id"]: float(row["sum"]) for row in await db.payments.aggregate(pipeline).to_list(50)}
    approved = by_status.get("aprobado", 0.0)
    pending = by_status.get("sin_verificar", 0.0) + by_status.get("saldo_pendiente", 0.0)
    remaining = max(total - approved - pending, 0.0)
    return {"total": float(total), "approved": approved, "pending": pending, "remaining": remaining}


@api.post("/payments")
async def submit_payment(payload: PaymentIn, user: dict = Depends(get_current_user)):
    if not await _can_pay(user, payload.target_type, payload.target_id):
        raise HTTPException(status_code=403, detail="No autorizado")
    # Política: las cotizaciones solo aceptan abonos cuando han sido aprobadas por el Admin.
    if payload.target_type == "quote":
        q = await db.quotes.find_one({"id": payload.target_id}, {"_id": 0, "status": 1, "currency": 1})
        qstatus = (q or {}).get("status", "")
        qcurrency = ((q or {}).get("currency") or "COP").upper()
        if user.get("role") != "admin" and qstatus not in ("aprobada", "pagada"):
            raise HTTPException(
                status_code=400,
                detail=f"Esta cotización está en estado '{qstatus}'. El administrador debe aprobarla antes de poder registrar abonos.",
            )
        pcurrency = (payload.currency or "COP").upper()
        if user.get("role") != "admin" and pcurrency != qcurrency:
            raise HTTPException(
                status_code=400,
                detail=f"El abono debe ser en {qcurrency}: la cotización está expresada en esa moneda.",
            )
    receipt_url = _validate_receipt_url(payload.receipt_url)
    total = await _target_total(payload.target_type, payload.target_id)
    if total is None:
        raise HTTPException(status_code=404, detail="Recurso no encontrado")
    amount = float(payload.amount)
    # Cap: amount cannot exceed remaining (total - aprobados - en_revision)
    bal = await _pending_balance(payload.target_type, payload.target_id)
    if bal["remaining"] <= 0:
        raise HTTPException(status_code=400, detail="El target ya cubre su valor con abonos aprobados o en revisión.")
    if amount > bal["remaining"] + 0.5:  # tolerate cent rounding
        raise HTTPException(
            status_code=400,
            detail=f"El monto excede el saldo disponible ({int(bal['remaining']):,} COP). Aprobados: {int(bal['approved']):,}, en revisión: {int(bal['pending']):,}.".replace(",", ".")
        )
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid.uuid4()),
        "target_type": payload.target_type,
        "target_id": payload.target_id,
        "amount": amount,
        "currency": (payload.currency or "COP").upper(),
        "payment_date": payload.payment_date or now,
        "method": payload.method or "transferencia",
        "receipt_url": receipt_url,
        "reference": payload.reference or "",
        "notes": payload.notes or "",
        "user_id": user["id"],
        "user_email": user["email"],
        "user_name": user.get("name", ""),
        "status": "sin_verificar",
        "admin_note": "",
        "created_at": now,
    }
    await db.payments.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/payments/mine")
async def my_payments(user: dict = Depends(get_current_user)):
    items = await db.payments.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items


@api.get("/payments/by-target")
async def payments_by_target(target_type: str, target_id: str, user: dict = Depends(get_current_user)):
    if not await _can_pay(user, target_type, target_id):
        raise HTTPException(status_code=403, detail="No autorizado")
    items = await db.payments.find({"target_type": target_type, "target_id": target_id}, {"_id": 0}).sort("created_at", -1).to_list(500)
    balance = await _recompute_balance(target_type, target_id)
    return {"items": items, "balance": balance}


@api.get("/admin/payments")
async def admin_list_payments(status: Optional[str] = None, target_type: Optional[str] = None, _: dict = Depends(require_admin)):
    q = {}
    if status:
        q["status"] = status
    if target_type:
        q["target_type"] = target_type
    items = await db.payments.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)
    # Enrich each item with target name
    for it in items:
        if it["target_type"] == "quote":
            tg = await db.quotes.find_one({"id": it["target_id"]}, {"_id": 0, "id": 1, "event_name": 1, "total_amount": 1})
            it["target_label"] = f"Cotización · {tg['event_name']}" if tg else "Cotización"
            it["target_total"] = float(tg["total_amount"]) if tg else 0
        elif it["target_type"] == "team_registration":
            tg = await db.teams.find_one({"id": it["target_id"]}, {"_id": 0, "id": 1, "name": 1, "registration_fee": 1})
            it["target_label"] = f"Inscripción · {tg['name']}" if tg else "Inscripción"
            it["target_total"] = float(tg.get("registration_fee", 0)) if tg else 0
    return items


@api.put("/admin/payments/{pid}/status")
async def admin_set_payment_status(pid: str, payload: PaymentStatusUpdate, user: dict = Depends(require_admin)):
    p = await db.payments.find_one({"id": pid}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
    actor = await _record_audit("payment", pid, "status_change", p.get("status"), payload.status, user, note=payload.admin_note or "")
    update = {"status": payload.status, "admin_note": payload.admin_note or "", **actor}
    await db.payments.update_one({"id": pid}, {"$set": update})
    bal = await _recompute_balance(p["target_type"], p["target_id"])
    return {"ok": True, "balance": bal}


@api.get("/admin/audit-log")
async def admin_audit_log(
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    limit: int = 200,
    _: dict = Depends(require_admin),
):
    q = {}
    if entity_type: q["entity_type"] = entity_type
    if entity_id:   q["entity_id"] = entity_id
    items = await db.audit_log.find(q, {"_id": 0}).sort("created_at", -1).to_list(min(max(limit, 1), 1000))
    return items


# -------------------- Stripe Payments --------------------
class CheckoutSessionIn(BaseModel):
    quote_id: str
    origin_url: str

class RegistrationCheckoutIn(BaseModel):
    team_id: str
    origin_url: str


def _get_stripe(http_request: Request):
    api_key = os.environ.get("STRIPE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="Stripe no configurado")
    host_url = str(http_request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    return StripeCheckout(api_key=api_key, webhook_url=webhook_url)


@api.post("/payments/checkout/session")
async def create_checkout(payload: CheckoutSessionIn, http_request: Request, user: dict = Depends(get_current_user)):
    quote = await db.quotes.find_one({"id": payload.quote_id}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    if quote["user_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    if quote.get("status") == "pagada" or quote.get("payment_status") == "paid":
        raise HTTPException(status_code=400, detail="Esta cotización ya fue pagada")
    if quote["status"] != "aprobada":
        raise HTTPException(status_code=400, detail="Solo cotizaciones aprobadas pueden pagarse")

    stripe = _get_stripe(http_request)
    success_url = f"{payload.origin_url}/pago-exitoso?session_id={{CHECKOUT_SESSION_ID}}&kind=quote"
    cancel_url = f"{payload.origin_url}/mis-cotizaciones"
    amount = float(quote["total_amount"])

    req = CheckoutSessionRequest(
        amount=amount,
        currency=CURRENCY,
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "kind": "quote",
            "quote_id": payload.quote_id,
            "user_id": user["id"],
            "user_email": user["email"],
        },
    )
    session = await stripe.create_checkout_session(req)

    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "kind": "quote",
        "quote_id": payload.quote_id,
        "user_id": user["id"],
        "user_email": user["email"],
        "amount": amount,
        "currency": CURRENCY,
        "payment_status": "initiated",
        "metadata": {"kind": "quote", "quote_id": payload.quote_id},
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"url": session.url, "session_id": session.session_id}


@api.post("/payments/registration/session")
async def create_registration_checkout(payload: RegistrationCheckoutIn, http_request: Request, user: dict = Depends(get_current_user)):
    team = await db.teams.find_one({"id": payload.team_id}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    if team.get("manager_user_id") != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    if team.get("registration_payment_status") == "paid":
        raise HTTPException(status_code=400, detail="La inscripción ya fue pagada")
    event = EVENT_TYPES.get(team.get("event_type") or "")
    if not event:
        raise HTTPException(status_code=400, detail="El equipo no tiene un evento asociado")

    stripe = _get_stripe(http_request)
    success_url = f"{payload.origin_url}/pago-exitoso?session_id={{CHECKOUT_SESSION_ID}}&kind=registration"
    cancel_url = f"{payload.origin_url}/mi-equipo"
    amount = float(event["registration_fee_per_team"])

    req = CheckoutSessionRequest(
        amount=amount,
        currency=CURRENCY,
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "kind": "registration",
            "team_id": payload.team_id,
            "event_type": team["event_type"],
            "user_id": user["id"],
            "user_email": user["email"],
        },
    )
    session = await stripe.create_checkout_session(req)

    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "kind": "registration",
        "team_id": payload.team_id,
        "event_type": team["event_type"],
        "user_id": user["id"],
        "user_email": user["email"],
        "amount": amount,
        "currency": CURRENCY,
        "payment_status": "initiated",
        "metadata": {"kind": "registration", "team_id": payload.team_id},
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"url": session.url, "session_id": session.session_id}


async def _apply_paid_transaction(tx: dict):
    """Idempotently mark the owning resource (quote or team) as paid."""
    kind = tx.get("kind") or (tx.get("metadata") or {}).get("kind") or "quote"
    if kind == "registration":
        tid = tx.get("team_id") or (tx.get("metadata") or {}).get("team_id")
        if tid:
            await db.teams.update_one(
                {"id": tid},
                {"$set": {"registration_payment_status": "paid", "registration_paid_at": datetime.now(timezone.utc).isoformat()}}
            )
    else:
        qid = tx.get("quote_id") or (tx.get("metadata") or {}).get("quote_id")
        if qid:
            await db.quotes.update_one({"id": qid}, {"$set": {"status": "pagada", "payment_status": "paid"}})


@api.get("/payments/checkout/status/{session_id}")
async def get_checkout_status(session_id: str, user: dict = Depends(get_current_user)):
    api_key = os.environ.get("STRIPE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="Stripe no configurado")
    stripe = StripeCheckout(api_key=api_key, webhook_url="")
    status = None
    try:
        status = await stripe.get_checkout_status(session_id)
    except Exception as e:
        logging.warning(f"Stripe status lookup failed for {session_id}: {e}")
        raise HTTPException(status_code=404, detail="Sesión de pago no encontrada o expirada")
    if status is None:
        raise HTTPException(status_code=404, detail="Sesión de pago no encontrada o expirada")

    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if tx and tx.get("payment_status") != "paid" and status.payment_status == "paid":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": "paid", "stripe_status": status.status, "paid_at": datetime.now(timezone.utc).isoformat()}}
        )
        await _apply_paid_transaction(tx)
    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency,
        "metadata": status.metadata,
        "kind": (tx or {}).get("kind") or (status.metadata or {}).get("kind") or "quote",
    }


@api.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    api_key = os.environ.get("STRIPE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="Stripe no configurado")
    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    stripe = StripeCheckout(api_key=api_key, webhook_url="")
    try:
        evt = await stripe.handle_webhook(body, sig)
    except Exception as e:
        logging.error(f"Stripe webhook error: {e}")
        raise HTTPException(status_code=400, detail="Webhook inválido")

    if evt.payment_status == "paid":
        sid = evt.session_id
        tx = await db.payment_transactions.find_one({"session_id": sid}, {"_id": 0})
        if tx and tx.get("payment_status") != "paid":
            await db.payment_transactions.update_one(
                {"session_id": sid},
                {"$set": {"payment_status": "paid", "paid_at": datetime.now(timezone.utc).isoformat()}}
            )
            await _apply_paid_transaction(tx)
    return {"ok": True}

# -------------------- Posts (Noticias / Eventos) --------------------
@api.get("/posts", response_model=List[PostOut])
async def list_posts(limit: int = 50):
    items = await db.posts.find({}, {"_id": 0}).sort("published_at", -1).to_list(limit)
    return items

@api.get("/posts/{pid}", response_model=PostOut)
async def get_post(pid: str):
    p = await db.posts.find_one({"id": pid}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Publicación no encontrada")
    return p

@api.post("/posts", response_model=PostOut)
async def create_post(payload: PostIn, _: dict = Depends(require_admin)):
    now = datetime.now(timezone.utc).isoformat()
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["published_at"] = now
    doc["created_at"] = now
    await db.posts.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.put("/posts/{pid}", response_model=PostOut)
async def update_post(pid: str, payload: PostIn, _: dict = Depends(require_admin)):
    res = await db.posts.update_one({"id": pid}, {"$set": payload.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Publicación no encontrada")
    return await db.posts.find_one({"id": pid}, {"_id": 0})

@api.delete("/posts/{pid}")
async def delete_post(pid: str, _: dict = Depends(require_admin)):
    await db.posts.delete_one({"id": pid})
    return {"ok": True}

@api.post("/posts/import-from-url")
async def import_post_from_url(payload: dict, _: dict = Depends(require_admin)):
    """Fetches Open Graph metadata from a URL (Instagram public post or any link).
    Returns prefilled post data the admin can review and save."""
    url = payload.get("url", "").strip()
    if not url.startswith("http"):
        raise HTTPException(status_code=400, detail="URL inválida")
    try:
        r = requests.get(url, headers={"User-Agent": "Mozilla/5.0 FSC-Bot"}, timeout=15)
        html = r.text
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"No se pudo cargar la URL: {e}")

    import re
    def og(prop: str) -> str:
        m = re.search(rf'<meta\s+property=["\']og:{prop}["\']\s+content=["\']([^"\']+)["\']', html, re.IGNORECASE)
        if m:
            return m.group(1)
        m = re.search(rf'<meta\s+name=["\']og:{prop}["\']\s+content=["\']([^"\']+)["\']', html, re.IGNORECASE)
        return m.group(1) if m else ""

    title = og("title") or ""
    description = og("description") or ""
    image = og("image") or ""
    return {
        "title": title[:200],
        "content": description[:1000],
        "image_url": image,
        "instagram_url": url if "instagram.com" in url else "",
    }

@api.get("/social/instagram")
async def social_instagram():
    return {
        "handle": os.environ.get("INSTAGRAM_HANDLE", "futuresoccercup"),
        "url": os.environ.get("INSTAGRAM_URL", "https://www.instagram.com/futuresoccercup"),
    }

# -------------------- Uploads --------------------
@api.post("/upload")
async def upload_file(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    ext = (file.filename.rsplit(".", 1)[-1] if "." in (file.filename or "") else "bin").lower()
    if ext not in MIME:
        raise HTTPException(status_code=400, detail="Formato no soportado. Acepta: JPG, PNG, GIF, BMP, TIFF, WebP, HEIC, SVG, RAW (CR2/CR3/NEF/ARW/DNG/ORF/RW2/RAF/PEF/SRW) o PDF.")
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Archivo mayor a 5MB")
    storage_path = f"{APP_NAME}/uploads/{user['id']}/{uuid.uuid4()}.{ext}"
    content_type = file.content_type or MIME[ext]
    result = put_object(storage_path, data, content_type)
    file_id = str(uuid.uuid4())
    await db.files.insert_one({
        "id": file_id,
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": content_type,
        "size": result.get("size", len(data)),
        "user_id": user["id"],
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    # Return a URL the frontend can drop directly into <img src>
    return {"id": file_id, "url": f"/api/files/{result['path']}", "path": result["path"]}

@api.get("/files/{path:path}")
async def serve_file(path: str):
    record = await db.files.find_one({"storage_path": path, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    data, ct = get_object(path)
    return FastAPIResponse(content=data, media_type=record.get("content_type", ct))

# -------------------- Bulk Import (XLSX) --------------------
TEAM_TEMPLATE_HEADERS = ["name", "category", "birth_year", "group_name", "coach", "city", "country", "president", "delegate_phone", "color"]
PLAYER_TEMPLATE_HEADERS = ["team_name", "name", "jersey_number", "position", "birth_date", "document_id", "nickname", "gender", "eps", "guardian_name", "guardian_doc", "guardian_relation", "guardian_phone"]

# Spanish display headers + import alias mapping (Spanish → canonical English keys used internally)
TEAM_HEADERS_ES = [
    ("name",            "Nombre"),
    ("category",        "Categoría"),
    ("birth_year",      "Año de nacimiento"),
    ("group_name",      "Grupo"),
    ("coach",           "Director técnico"),
    ("city",            "Ciudad"),
    ("country",         "País"),
    ("president",       "Presidente"),
    ("delegate_phone",  "Teléfono delegado"),
    ("color",           "Color (HEX)"),
]
TEAM_SAMPLE_ES = ["Leones FC", "Sub-12", 2014, "Grupo A", "Pedro Coach", "Bogotá", "Colombia", "María Pdta.", "+57 310 123 4567", "#1d4ed8"]

PLAYER_HEADERS_ES = [
    ("team_name",         "Equipo"),
    ("name",              "Nombre del jugador"),
    ("jersey_number",     "Dorsal"),
    ("position",          "Posición"),
    ("birth_date",        "Fecha de nacimiento (AAAA-MM-DD)"),
    ("document_id",       "Documento de identidad"),
    ("nickname",          "Apodo"),
    ("gender",            "Género (M/F)"),
    ("eps",               "EPS / Seguro médico"),
    ("guardian_name",     "Nombre del acudiente"),
    ("guardian_doc",      "Documento del acudiente"),
    ("guardian_relation", "Parentesco"),
    ("guardian_phone",    "Teléfono del acudiente"),
]
PLAYER_SAMPLE_ES = ["Leones FC", "Carlos Pérez", 10, "Delantero", "2014-03-15", "1750000000", "Pipo", "M", "Sanitas", "María Pérez", "0701234567", "Madre", "+57 310 765 4321"]

STAFF_ROLES = [
    "Director técnico",
    "Asistente técnico",
    "Preparador físico",
    "Entrenador de arqueros",
    "Fisioterapeuta",
    "Médico",
    "Psicólogo",
    "Nutricionista",
    "Delegado",
    "Presidente",
    "Coordinador deportivo",
    "Utilero",
    "Otro",
]

STAFF_HEADERS_ES = [
    ("name",     "Nombre completo"),
    ("role",     "Rol / Cargo"),
    ("document", "Documento de identidad"),
    ("phone",    "Teléfono"),
]
STAFF_SAMPLE_ES = ["Pedro Coach", "Director técnico", "1700000000", "+57 310 555 0001"]

# Aliases: lowercased Spanish/English variants → canonical English key
HEADER_ALIASES = {
    # Equipos
    "nombre": "name", "name": "name", "nombre del equipo": "team_name",
    "equipo": "team_name", "team_name": "team_name",
    "categoria": "category", "categoría": "category", "category": "category",
    "ano de nacimiento": "birth_year", "año de nacimiento": "birth_year", "birth_year": "birth_year",
    "grupo": "group_name", "group_name": "group_name",
    "director tecnico": "coach", "director técnico": "coach", "dt": "coach", "coach": "coach",
    "ciudad": "city", "city": "city",
    "pais": "country", "país": "country", "country": "country",
    "presidente": "president", "president": "president",
    "telefono delegado": "delegate_phone", "teléfono delegado": "delegate_phone", "delegate_phone": "delegate_phone",
    "color (hex)": "color", "color": "color",
    # Jugadores
    "nombre del jugador": "name",
    "dorsal": "jersey_number", "numero": "jersey_number", "número": "jersey_number", "jersey_number": "jersey_number",
    "posicion": "position", "posición": "position", "position": "position",
    "fecha de nacimiento": "birth_date", "fecha de nacimiento (aaaa-mm-dd)": "birth_date", "birth_date": "birth_date",
    "documento de identidad": "document_id", "documento": "document_id", "document_id": "document_id",
    "apodo": "nickname", "nickname": "nickname",
    "genero": "gender", "género": "gender", "género (m/f)": "gender", "genero (m/f)": "gender", "gender": "gender",
    "eps": "eps", "eps / seguro medico": "eps", "eps / seguro médico": "eps",
    "nombre del acudiente": "guardian_name", "guardian_name": "guardian_name",
    "documento del acudiente": "guardian_doc", "guardian_doc": "guardian_doc",
    "parentesco": "guardian_relation", "guardian_relation": "guardian_relation",
    "telefono del acudiente": "guardian_phone", "teléfono del acudiente": "guardian_phone", "guardian_phone": "guardian_phone",
    # Cuerpo técnico
    "nombre completo": "name",
    "rol": "role", "rol / cargo": "role", "cargo": "role", "role": "role",
    "telefono": "phone", "teléfono": "phone", "phone": "phone",
}

def _norm_key(h: str) -> str:
    k = (h or "").strip().lower()
    return HEADER_ALIASES.get(k, k)


def _build_styled_template(sheet_name: str, headers_es: list, sample: list, *, brand_color: str = "1D4ED8", instructions: list = None) -> bytes:
    """Build a styled XLSX template with Spanish headers, bold colored header row, borders, and column widths.
    Optional instructions go into a separate 'Instrucciones' sheet so they aren't parsed as data."""
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter
    wb = Workbook()
    ws = wb.active
    ws.title = sheet_name
    spanish = [h[1] for h in headers_es]
    ws.append(spanish)
    ws.append(sample)

    header_fill = PatternFill("solid", fgColor=brand_color)
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    border = Border(
        left=Side(style="thin", color="DDDDDD"),
        right=Side(style="thin", color="DDDDDD"),
        top=Side(style="thin", color="DDDDDD"),
        bottom=Side(style="thin", color="DDDDDD"),
    )
    center = Alignment(horizontal="center", vertical="center", wrap_text=True)
    left = Alignment(horizontal="left", vertical="center", wrap_text=True)

    for col_idx in range(1, len(spanish) + 1):
        c = ws.cell(row=1, column=col_idx)
        c.fill = header_fill
        c.font = header_font
        c.alignment = center
        c.border = border
        ws.column_dimensions[get_column_letter(col_idx)].width = max(20, len(spanish[col_idx - 1]) + 4)
        s = ws.cell(row=2, column=col_idx)
        s.alignment = left
        s.border = border
        s.font = Font(name="Calibri", size=10, italic=True, color="64748B")

    ws.row_dimensions[1].height = 30
    ws.freeze_panes = "A2"

    # Instructions in separate sheet
    if instructions:
        wsi = wb.create_sheet("Instrucciones")
        wsi.column_dimensions["A"].width = 110
        wsi.cell(row=1, column=1, value="📝 Plantilla de carga masiva — Future Soccer Cup").font = Font(bold=True, size=14, color=brand_color)
        for i, line in enumerate(instructions):
            wsi.cell(row=3 + i, column=1, value=line).font = Font(size=11, color="334155")

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.getvalue()


def _parse_uploaded(file: UploadFile, raw: bytes) -> List[dict]:
    """Returns list of dicts keyed by canonical English keys; accepts Spanish or English headers."""
    name = (file.filename or "").lower()
    if name.endswith(".csv"):
        text = raw.decode("utf-8-sig", errors="replace")
        reader = csv.DictReader(io.StringIO(text))
        return [{_norm_key(k): (v or "").strip() for k, v in row.items()} for row in reader]
    elif name.endswith(".xlsx"):
        wb = load_workbook(io.BytesIO(raw), data_only=True)
        ws = wb.active
        headers = [_norm_key(str(c.value or "")) for c in next(ws.iter_rows(max_row=1))]
        rows = []
        for r in ws.iter_rows(min_row=2, values_only=True):
            if not any(r):
                continue
            d = {h: ("" if v is None else str(v).strip()) for h, v in zip(headers, r)}
            rows.append(d)
        return rows
    else:
        raise HTTPException(status_code=400, detail="Formato no soportado. Usa .xlsx")

@api.get("/import/template/{kind}")
async def download_template(kind: str, _: dict = Depends(require_admin)):
    base_instr = [
        "• Conserva el nombre y el orden de las columnas. Puedes traducirlos, pero no los borres.",
        "• La fila 2 es un ejemplo: bórrala antes de cargar tu información real.",
        "• Formato de fecha: AAAA-MM-DD (ejemplo: 2014-03-15).",
        "• Categoría válida: Sub-8, Sub-10, Sub-12, Sub-14, Sub-16, Sub-18.",
        "• Para Jugadores: la columna 'Equipo' debe coincidir con el nombre del equipo ya creado en la plataforma.",
        "• Color en formato HEX (ej. #1d4ed8). Si no lo sabes, déjalo en blanco.",
    ]
    if kind == "teams":
        content = _build_styled_template("Equipos", TEAM_HEADERS_ES, TEAM_SAMPLE_ES, brand_color="1D4ED8", instructions=base_instr)
    elif kind == "players":
        content = _build_styled_template("Jugadores", PLAYER_HEADERS_ES, PLAYER_SAMPLE_ES, brand_color="DC2626", instructions=base_instr)
    else:
        raise HTTPException(status_code=400, detail="Tipo inválido (teams|players)")
    return FastAPIResponse(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=fsc-{kind}-plantilla.xlsx"},
    )

@api.post("/import/teams")
async def import_teams(file: UploadFile = File(...), preview: bool = False, _: dict = Depends(require_admin)):
    raw = await file.read()
    if len(raw) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Archivo > 5MB")
    rows = _parse_uploaded(file, raw)

    created, errors = [], []
    for idx, r in enumerate(rows, start=2):
        name = r.get("name") or r.get("nombre") or ""
        category = r.get("category") or r.get("categoria") or ""
        if not name:
            errors.append({"row": idx, "error": "Falta el nombre del equipo"})
            continue
        if category not in CATEGORIES:
            errors.append({"row": idx, "error": f"Categoría '{category}' inválida (use {', '.join(CATEGORIES)})"})
            continue
        doc = {
            "id": str(uuid.uuid4()),
            "name": name,
            "category": category,
            "birth_year": int(r["birth_year"]) if r.get("birth_year", "").isdigit() else None,
            "group_name": r.get("group_name", ""),
            "coach": r.get("coach", ""),
            "city": r.get("city", ""),
            "country": r.get("country", ""),
            "president": r.get("president", ""),
            "delegate_phone": r.get("delegate_phone", ""),
            "color": r.get("color") or "#1d4ed8",
            "logo_url": "",
            "status": "aprobado",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        created.append(doc)

    if not preview and created:
        await db.teams.insert_many([dict(d) for d in created])
        for d in created:
            d.pop("_id", None)

    return {"total_rows": len(rows), "ok": len(created), "errors": errors, "saved": not preview, "created": [{"id": d["id"], "name": d["name"], "category": d["category"]} for d in created]}

@api.post("/import/players")
async def import_players(file: UploadFile = File(...), preview: bool = False, _: dict = Depends(require_admin)):
    raw = await file.read()
    if len(raw) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Archivo > 5MB")
    rows = _parse_uploaded(file, raw)

    teams = await db.teams.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(2000)
    name_to_id = {t["name"].lower(): t["id"] for t in teams}

    created, errors = [], []
    for idx, r in enumerate(rows, start=2):
        team_name = (r.get("team_name") or r.get("equipo") or "").lower()
        team_id = name_to_id.get(team_name)
        if not team_id:
            errors.append({"row": idx, "error": f"Equipo no encontrado: '{r.get('team_name')}'"})
            continue
        name = r.get("name") or r.get("nombre") or ""
        if not name:
            errors.append({"row": idx, "error": "Falta el nombre del jugador"})
            continue
        try:
            jersey = int(r.get("jersey_number") or r.get("dorsal") or 0)
        except ValueError:
            errors.append({"row": idx, "error": "Dorsal inválido"})
            continue
        doc = {
            "id": str(uuid.uuid4()),
            "team_id": team_id,
            "name": name,
            "jersey_number": jersey,
            "position": r.get("position") or "Mediocampista",
            "birth_date": r.get("birth_date") or "",
            "document_id": r.get("document_id") or "",
            "nickname": r.get("nickname") or "",
            "gender": r.get("gender") or "",
            "eps": r.get("eps") or "",
            "guardian_name": r.get("guardian_name") or "",
            "guardian_doc": r.get("guardian_doc") or "",
            "guardian_relation": r.get("guardian_relation") or "",
            "guardian_phone": r.get("guardian_phone") or "",
            "photo_url": "",
            "status": "aprobado",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        created.append(doc)

    if not preview and created:
        await db.players.insert_many([dict(d) for d in created])
        for d in created:
            d.pop("_id", None)

    return {"total_rows": len(rows), "ok": len(created), "errors": errors, "saved": not preview, "created": [{"id": d["id"], "name": d["name"], "team_id": d["team_id"]} for d in created]}

# -------------------- Bulk Import (Team Manager - Multi-sheet XLSX) --------------------

def _parse_xlsx_sheets(raw: bytes) -> dict:
    """Parse all sheets in an XLSX as canonical-keyed dicts (Spanish→English aliases). Returns {sheet_name_lower: [rows]}."""
    wb = load_workbook(io.BytesIO(raw), data_only=True)
    out = {}
    for sh in wb.sheetnames:
        ws = wb[sh]
        try:
            headers = [_norm_key(str(c.value or "")) for c in next(ws.iter_rows(max_row=1))]
        except StopIteration:
            headers = []
        rows = []
        for r in ws.iter_rows(min_row=2, values_only=True):
            if not any(r):
                continue
            rows.append({h: ("" if v is None else str(v).strip()) for h, v in zip(headers, r)})
        out[sh.lower()] = rows
    return out

@api.get("/team-roster/template")
async def download_team_roster_template(user: dict = Depends(get_current_user)):
    """Multi-sheet XLSX template (styled, Spanish): Jugadores + Cuerpo Técnico."""
    if user.get("role") not in ("team", "admin"):
        raise HTTPException(status_code=403, detail="Solo directores técnicos")
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter

    wb = Workbook()
    # Sheet 1: Jugadores (skip team_name; implícito por el equipo del DT)
    ws1 = wb.active
    ws1.title = "Jugadores"
    headers_jug = PLAYER_HEADERS_ES[1:]  # quitar "Nombre del equipo"
    sample_jug = PLAYER_SAMPLE_ES[1:]
    ws1.append([h[1] for h in headers_jug])
    ws1.append(sample_jug)

    # Sheet 2: Cuerpo Técnico
    ws2 = wb.create_sheet("Cuerpo Tecnico")
    ws2.append([h[1] for h in STAFF_HEADERS_ES])
    ws2.append(STAFF_SAMPLE_ES)

    # Styling helper
    border = Border(left=Side(style="thin", color="DDDDDD"), right=Side(style="thin", color="DDDDDD"),
                    top=Side(style="thin", color="DDDDDD"), bottom=Side(style="thin", color="DDDDDD"))
    center = Alignment(horizontal="center", vertical="center", wrap_text=True)
    left = Alignment(horizontal="left", vertical="center", wrap_text=True)

    def style(ws, hdrs, color):
        fill = PatternFill("solid", fgColor=color)
        font_h = Font(bold=True, color="FFFFFF", size=11)
        font_s = Font(size=10, italic=True, color="64748B")
        for col_idx in range(1, len(hdrs) + 1):
            c = ws.cell(row=1, column=col_idx); c.fill = fill; c.font = font_h; c.alignment = center; c.border = border
            ws.column_dimensions[get_column_letter(col_idx)].width = max(20, len(hdrs[col_idx - 1]) + 4)
            s = ws.cell(row=2, column=col_idx); s.alignment = left; s.border = border; s.font = font_s
        ws.row_dimensions[1].height = 28
        ws.freeze_panes = "A2"

    style(ws1, [h[1] for h in headers_jug], "DC2626")
    style(ws2, [h[1] for h in STAFF_HEADERS_ES], "1D4ED8")

    # Instrucciones en hoja separada (no se parsean como datos)
    wsi = wb.create_sheet("Instrucciones")
    wsi.column_dimensions["A"].width = 110
    wsi.cell(row=1, column=1, value="📝 Plantilla del equipo — Future Soccer Cup").font = Font(bold=True, size=14, color="DC2626")
    notes = [
        "• Hoja 'Jugadores': lista de jugadores del equipo. La fila 2 es un ejemplo, bórrala antes de cargar.",
        "• Hoja 'Cuerpo Tecnico': director técnico, asistentes, preparador físico, fisioterapeuta, médico, psicólogo, nutricionista, delegado, presidente, coordinador deportivo, utilero, etc.",
        "• Conserva el nombre y orden de las columnas. Puedes traducirlas, pero no las borres.",
        "• Formato de fecha: AAAA-MM-DD (ejemplo: 2014-03-15).",
        "• La categoría se hereda del equipo registrado en la plataforma.",
        "• Las fotos se cargan luego desde Mi Equipo > editar jugador.",
    ]
    for i, line in enumerate(notes):
        wsi.cell(row=3 + i, column=1, value=line).font = Font(size=11, color="334155")

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return FastAPIResponse(
        content=buf.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=fsc-equipo-plantilla.xlsx"},
    )

@api.post("/team-roster/import")
async def import_team_roster(file: UploadFile = File(...), preview: bool = False, user: dict = Depends(get_current_user)):
    """Team manager uploads multi-sheet XLSX for their own team: Jugadores + Cuerpo Técnico."""
    if user.get("role") not in ("team", "admin"):
        raise HTTPException(status_code=403, detail="Solo directores técnicos")
    team_id = user.get("team_id")
    if not team_id:
        raise HTTPException(status_code=400, detail="No tienes un equipo asignado")
    fname = (file.filename or "").lower()
    if not fname.endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Usa el formato Excel (.xlsx) de la plantilla oficial")
    raw = await file.read()
    if len(raw) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Archivo > 5MB")

    sheets = _parse_xlsx_sheets(raw)
    # Normalize sheet names (accepting common variants)
    players_sheet = None
    staff_sheet = None
    for sn in sheets.keys():
        if "jugador" in sn:
            players_sheet = sn
        elif "tecnic" in sn or "cuerpo" in sn or "staff" in sn:
            staff_sheet = sn
    if not players_sheet:
        raise HTTPException(status_code=400, detail="No se encontró la hoja 'Jugadores' en el archivo")

    players_created, player_errors = [], []
    for idx, r in enumerate(sheets[players_sheet], start=2):
        name = r.get("name") or r.get("nombre") or ""
        if not name:
            player_errors.append({"row": idx, "error": "Falta nombre"})
            continue
        try:
            jersey = int(r.get("jersey_number") or r.get("dorsal") or 0)
        except ValueError:
            player_errors.append({"row": idx, "error": "Dorsal inválido"})
            continue
        players_created.append({
            "id": str(uuid.uuid4()),
            "team_id": team_id,
            "name": name,
            "jersey_number": jersey,
            "position": r.get("position") or "Mediocampista",
            "birth_date": r.get("birth_date") or "",
            "document_id": r.get("document_id") or "",
            "nickname": r.get("nickname") or "",
            "gender": r.get("gender") or "",
            "eps": r.get("eps") or "",
            "guardian_name": r.get("guardian_name") or "",
            "guardian_doc": r.get("guardian_doc") or "",
            "guardian_relation": r.get("guardian_relation") or "",
            "guardian_phone": r.get("guardian_phone") or "",
            "photo_url": "",
            "status": "pendiente",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    staff_created, staff_errors = [], []
    if staff_sheet:
        for idx, r in enumerate(sheets[staff_sheet], start=2):
            nm = r.get("name") or r.get("nombre") or ""
            if not nm:
                staff_errors.append({"row": idx, "error": "Falta nombre"})
                continue
            staff_created.append({
                "name": nm,
                "role": r.get("role") or r.get("rol") or "Director técnico",
                "document": r.get("document") or r.get("documento") or "",
                "phone": r.get("phone") or r.get("telefono") or r.get("teléfono") or "",
            })

    if not preview:
        if players_created:
            await db.players.insert_many([dict(d) for d in players_created])
            for d in players_created:
                d.pop("_id", None)
        if staff_created:
            # Merge with existing cuerpo_tecnico
            team = await db.teams.find_one({"id": team_id}, {"_id": 0})
            current = list(team.get("cuerpo_tecnico", []) or []) if team else []
            await db.teams.update_one({"id": team_id}, {"$set": {"cuerpo_tecnico": current + staff_created}})

    return {
        "players": {"total": len(sheets[players_sheet]), "ok": len(players_created), "errors": player_errors},
        "staff": {"total": len(sheets.get(staff_sheet, [])) if staff_sheet else 0, "ok": len(staff_created), "errors": staff_errors},
        "saved": not preview,
    }

# -------------------- Gallery (imágenes de ediciones pasadas) --------------------
class GalleryImageIn(BaseModel):
    title: Optional[str] = ""
    image_url: str  # /api/files/... o https://...
    caption: Optional[str] = ""
    sort_order: Optional[int] = 0


class GalleryImageOut(GalleryImageIn):
    id: str
    created_at: str


@api.get("/gallery", response_model=List[GalleryImageOut])
async def list_gallery():
    items = await db.gallery_images.find({}, {"_id": 0}).sort([("sort_order", 1), ("created_at", -1)]).to_list(500)
    for it in items:
        it.setdefault("title", "")
        it.setdefault("caption", "")
        it.setdefault("sort_order", 0)
    return items


@api.post("/gallery", response_model=GalleryImageOut)
async def add_gallery_image(payload: GalleryImageIn, _: dict = Depends(require_admin)):
    if not payload.image_url:
        raise HTTPException(status_code=400, detail="image_url es requerido")
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.gallery_images.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/gallery/{gid}", response_model=GalleryImageOut)
async def update_gallery_image(gid: str, payload: GalleryImageIn, _: dict = Depends(require_admin)):
    res = await db.gallery_images.update_one({"id": gid}, {"$set": payload.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Imagen no encontrada")
    doc = await db.gallery_images.find_one({"id": gid}, {"_id": 0})
    return doc


@api.delete("/gallery/{gid}")
async def delete_gallery_image(gid: str, _: dict = Depends(require_admin)):
    res = await db.gallery_images.delete_one({"id": gid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Imagen no encontrada")
    return {"ok": True}


# -------------------- Home Settings (contenido editable del home) --------------------
HOME_SETTINGS_ID = "default"


class HomeSettings(BaseModel):
    # Hero
    hero_edition: Optional[str] = ""  # Ej. "Edición 2026" / "Premier Diciembre 2025"
    hero_title: Optional[str] = "Future Soccer Cup"
    hero_subtitle: Optional[str] = "La cumbre del fútbol formativo infantil & juvenil."
    hero_cta_label: Optional[str] = "Inscribe tu equipo"
    hero_cta_url: Optional[str] = "/registro-equipo"
    hero_image_url: Optional[str] = ""
    # Próximo Evento (estático opcional, complementa el torneo featured)
    upcoming_name: Optional[str] = ""
    upcoming_city: Optional[str] = ""
    upcoming_venue: Optional[str] = ""
    upcoming_start_date: Optional[str] = ""
    upcoming_end_date: Optional[str] = ""
    upcoming_categories: Optional[str] = ""  # "Sub-8, Sub-10, ..."
    upcoming_cover_url: Optional[str] = ""
    # Nosotros
    about_title: Optional[str] = "Somos más que un torneo"
    about_body: Optional[str] = "Future Soccer Cup es una iniciativa del Grupo Empresarial Ancla para impulsar el talento del fútbol infantil y juvenil en Colombia."
    about_image_url: Optional[str] = ""
    # Contacto / Redes
    contact_email: Optional[str] = "info@futuresoccercup.com"
    contact_phone: Optional[str] = "+57 (000) 000-0000"
    instagram: Optional[str] = "@FutureSoccerCup"
    facebook: Optional[str] = ""
    youtube: Optional[str] = ""


@api.get("/home-settings", response_model=HomeSettings)
async def get_home_settings():
    doc = await db.home_settings.find_one({"id": HOME_SETTINGS_ID}, {"_id": 0})
    if not doc:
        return HomeSettings().model_dump()
    return doc


@api.put("/home-settings", response_model=HomeSettings)
async def update_home_settings(payload: HomeSettings, _: dict = Depends(require_admin)):
    data = payload.model_dump()
    data["id"] = HOME_SETTINGS_ID
    await db.home_settings.update_one(
        {"id": HOME_SETTINGS_ID}, {"$set": data}, upsert=True,
    )
    doc = await db.home_settings.find_one({"id": HOME_SETTINGS_ID}, {"_id": 0})
    return doc


# -------------------- Contact Messages (buzón admin) --------------------
class ContactMessageIn(BaseModel):
    name: str = Field(min_length=2)
    email: EmailStr
    phone: Optional[str] = ""
    message: str = Field(min_length=5)


class ContactMessageOut(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str] = ""
    message: str
    is_read: bool
    created_at: str


@api.post("/contact-messages", response_model=ContactMessageOut)
async def create_contact_message(payload: ContactMessageIn):
    """Endpoint PÚBLICO para envío de mensajes desde la página de Contacto."""
    doc = {
        "id": str(uuid.uuid4()),
        "name": payload.name.strip(),
        "email": payload.email,
        "phone": (payload.phone or "").strip(),
        "message": payload.message.strip(),
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.contact_messages.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


@api.get("/contact-messages", response_model=List[ContactMessageOut])
async def list_contact_messages(_: dict = Depends(require_admin)):
    items = await db.contact_messages.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items


@api.put("/contact-messages/{mid}/read")
async def mark_contact_message_read(mid: str, _: dict = Depends(require_admin)):
    res = await db.contact_messages.update_one({"id": mid}, {"$set": {"is_read": True}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Mensaje no encontrado")
    return {"ok": True}


@api.delete("/contact-messages/{mid}")
async def delete_contact_message(mid: str, _: dict = Depends(require_admin)):
    res = await db.contact_messages.delete_one({"id": mid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Mensaje no encontrado")
    return {"ok": True}



# -------------------- Startup --------------------
async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "name": "Administrador FSC",
            "role": "admin",
            "password_hash": hash_password(admin_password),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}}
        )

async def seed_demo_inventory():
    """Seed pricing catalog (paquetes, comidas, transporte, tours) from defaults in this module
    ONLY when the collection is empty. After that, the admin manages prices via /admin/catalog.

    Also drops legacy 'hotels', 'transports', 'tours' demo collections — the catalog is the only
    source of truth used by /cotizar and /admin/inventario.
    """
    # Drop legacy inventory collections (replaced by pricing_catalog).
    for coll in ("hotels", "transports", "tours"):
        try:
            await db[coll].drop()
        except Exception:
            pass

    if await db.pricing_catalog.count_documents({}) > 0:
        return

    now = datetime.now(timezone.utc).isoformat()
    rows: list = []
    # Lodging packages (defaults from LODGING_TIERS constants in module).
    for i, (key, t) in enumerate(LODGING_TIERS.items()):
        rows.append({
            "id": key, "type": "lodging", "name": t["name"], "description": t.get("description", ""),
            "includes": t.get("includes", []),
            "base_5_nights": float(t.get("base_5_nights", 0) or 0),
            "additional_night": float(t.get("additional_night", 0) or 0),
            "available": bool(t.get("available", True)),
            "no_lodging": bool(t.get("no_lodging", False)),
            "sort_order": i, "created_at": now, "updated_at": now,
        })
    # Meals.
    for i, (key, m) in enumerate(MEAL_PLANS.items()):
        rows.append({
            "id": key, "type": "meal", "name": m["name"],
            "per_day_by_tier": {k: float(v or 0) for k, v in m["per_day_by_tier"].items()},
            "sort_order": i, "created_at": now, "updated_at": now,
        })
    # Transport routes.
    for i, (key, r) in enumerate(TRANSPORT_ROUTES.items()):
        rows.append({
            "id": key, "type": "transport", "name": r["name"], "price": float(r["price"] or 0),
            "sort_order": i, "created_at": now, "updated_at": now,
        })
    # Tours.
    for i, (key, t) in enumerate(TOURS_CATALOG.items()):
        rows.append({
            "id": key, "type": "tour", "name": t["name"], "price": float(t["price"] or 0),
            "sort_order": i, "created_at": now, "updated_at": now,
        })
    await db.pricing_catalog.insert_many(rows)

@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.teams.create_index("id", unique=True)
    await db.clubs.create_index("id", unique=True)
    await db.clubs.create_index("name")
    await db.players.create_index("id", unique=True)
    await db.matches.create_index("id", unique=True)
    await db.audit_log.create_index("id", unique=True)
    await db.audit_log.create_index([("entity_type", 1), ("entity_id", 1)])
    await db.audit_log.create_index([("created_at", -1)])
    await db.pricing_catalog.create_index([("type", 1), ("id", 1)], unique=True)
    await db.pricing_catalog.create_index([("type", 1), ("sort_order", 1)])
    await db.brackets.create_index("id", unique=True)
    await db.matches.create_index("bracket_id")
    await db.quotes.create_index("id", unique=True)
    await db.posts.create_index("id", unique=True)
    await db.payment_transactions.create_index("session_id", unique=True)
    await db.payments.create_index("id", unique=True)
    await db.payments.create_index([("target_type", 1), ("target_id", 1)])
    await db.payments.create_index("user_id")
    await db.payments.create_index("status")
    await db.files.create_index("storage_path")
    await db.login_attempts.create_index("identifier")
    await seed_admin()
    await seed_demo_inventory()
    await migrate_teams_to_clubs()
    init_storage()


async def migrate_teams_to_clubs():
    """Idempotent migration: for each team without club_id, create a Club from team.name (or set existing)."""
    cursor = db.teams.find({"$or": [{"club_id": {"$exists": False}}, {"club_id": ""}]}, {"_id": 0})
    teams = await cursor.to_list(5000)
    if not teams:
        return
    logging.info(f"[migrate_teams_to_clubs] {len(teams)} equipos sin club_id")
    name_to_club: dict = {}
    for t in teams:
        name = (t.get("name") or "").strip()
        if not name:
            continue
        # Try to extract a "club_name" by removing trailing year+designation. Fallback: whole name.
        club_name = name
        for d in ("Equipo A", "Equipo B", "Único"):
            club_name = club_name.replace(d, "").strip()
        # strip trailing 4-digit year
        parts = club_name.split()
        if parts and parts[-1].isdigit() and len(parts[-1]) == 4:
            parts = parts[:-1]
        club_name = " ".join(parts).strip() or name

        key = club_name.lower()
        if key in name_to_club:
            club_id = name_to_club[key]
        else:
            existing = await db.clubs.find_one({"name": {"$regex": f"^{club_name}$", "$options": "i"}}, {"_id": 0})
            if existing:
                club_id = existing["id"]
            else:
                club_id = str(uuid.uuid4())
                await db.clubs.insert_one({
                    "id": club_id,
                    "name": club_name,
                    "country": t.get("country") or "Colombia",
                    "city": t.get("city") or "",
                    "phone": t.get("delegate_phone") or "",
                    "email": "",
                    "website": "",
                    "logo_url": t.get("logo_url") or "",
                    "color": t.get("color") or "#1d4ed8",
                    "status": t.get("status") or "aprobado",
                    "manager_user_id": t.get("manager_user_id") or "",
                    "created_at": t.get("created_at") or datetime.now(timezone.utc).isoformat(),
                })
            name_to_club[key] = club_id
        # Update team
        update = {"club_id": club_id, "club_name": club_name}
        if not t.get("designation"):
            update["designation"] = "Único"
        await db.teams.update_one({"id": t["id"]}, {"$set": update})
    logging.info(f"[migrate_teams_to_clubs] done; {len(name_to_club)} clubes")

@app.on_event("shutdown")
async def shutdown():
    client.close()

# -------------------- Mount router & CORS --------------------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
