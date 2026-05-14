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
        "description": "Evento temático para iniciación. 5 al 10 de Octubre.",
        "birth_years": [2013, 2014, 2015, 2016, 2017],
        "dates": "5-10 Octubre",
        "fees_by_year": {
            "2017": 1800000.0,
            "2016": 2000000.0,
            "2015": 2200000.0,
            "2014": 2200000.0,
            "2013": 2200000.0,
        },
        "registration_fee_per_team": 2000000.0,  # fallback
    },
    "premier_par": {
        "id": "premier_par",
        "name": "Premier Par",
        "description": "Premier elite con temática dorada. 7 al 12 de Diciembre. Años pares.",
        "birth_years": [2010, 2012, 2014, 2016],
        "dates": "7-12 Diciembre",
        "fees_by_year": {
            "2016": 2350000.0,
            "2014": 2450000.0,
            "2012": 2700000.0,
            "2010": 3000000.0,
        },
        "registration_fee_per_team": 2450000.0,
    },
    "premier_impar": {
        "id": "premier_impar",
        "name": "Premier Impar",
        "description": "Premier elite con temática dorada. 13 al 18 de Diciembre. Años impares.",
        "birth_years": [2011, 2013, 2015, 2017],
        "dates": "13-18 Diciembre",
        "fees_by_year": {
            "2017": 2350000.0,
            "2015": 2450000.0,
            "2013": 3000000.0,
            "2011": 2700000.0,
        },
        "registration_fee_per_team": 2450000.0,
    },
}

# Designaciones por club/categoría
TEAM_DESIGNATIONS = ["Único", "Equipo A", "Equipo B"]

# Lodging tiers (precios POR PERSONA por 5 NOCHES en COP, tomados del PDF oficial)
LODGING_TIERS = {
    "esmerald": {"id": "esmerald", "name": "Esmerald", "description": "Hospedaje premium 5★. Precio por persona por 5 noches.",
                 "rates": {"single": 1450000, "double": 1550000, "triple": 1650000, "multiple": 0}},
    "sapphire": {"id": "sapphire", "name": "Sapphire", "description": "Hospedaje superior con excelente ubicación.",
                 "rates": {"single": 0, "double": 1270000, "triple": 1170000, "multiple": 1070000}},
    "diamond":  {"id": "diamond",  "name": "Diamond",  "description": "Hospedaje 4★ amplio y cómodo.",
                 "rates": {"single": 0, "double": 1170000, "triple": 1070000, "multiple": 970000}},
    "gold":     {"id": "gold",     "name": "Gold",     "description": "Hospedaje 4★ con buena relación calidad-precio.",
                 "rates": {"single": 0, "double": 1170000, "triple": 1070000, "multiple": 970000}},
    "silver":   {"id": "silver",   "name": "Silver",   "description": "Hospedaje 3★ funcional.",
                 "rates": {"single": 0, "double":  980000, "triple":  880000, "multiple": 780000}},
    "bronze":   {"id": "bronze",   "name": "Bronze",   "description": "Hospedaje básico económico.",
                 "rates": {"single": 0, "double":  860000, "triple":  760000, "multiple": 660000}},
}

# Planes de alimentación (POR PERSONA POR DÍA en COP)
MEAL_PLANS = {
    "breakfast": {"id": "breakfast", "name": "Desayuno", "per_day_by_tier": {
        "esmerald": 27000, "sapphire": 20000, "diamond": 21000, "gold": 27000, "silver": 18000, "bronze": 14000
    }},
    "lunch": {"id": "lunch", "name": "Almuerzo", "per_day_by_tier": {
        "esmerald": 37000, "sapphire": 37000, "diamond": 30000, "gold": 37000, "silver": 27000, "bronze": 22000
    }},
}

# Rutas/Tours/Transporte (POR PERSONA en COP)
TRANSPORT_ROUTES = {
    "airport_to_hotel": {"id": "airport_to_hotel", "name": "Aeropuerto → Hotel", "price": 15000},
    "hotel_to_airport": {"id": "hotel_to_airport", "name": "Hotel → Aeropuerto", "price": 15000},
    "stadium": {"id": "stadium", "name": "Hotel → Escenario deportivo (ida y vuelta)", "price": 0},
}

TOURS_CATALOG = {
    "parque_del_cafe": {"id": "parque_del_cafe", "name": "Parque del Café", "price": 105000},
    "panaca": {"id": "panaca", "name": "Panaca", "price": 25000},
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

MIME = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "gif": "image/gif", "webp": "image/webp"}

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
    # Club info (created if doesn't exist)
    club_name: str = Field(min_length=1)
    club_country: Optional[str] = "Colombia"
    club_city: Optional[str] = ""
    club_phone: Optional[str] = ""
    club_email: Optional[str] = ""
    club_website: Optional[str] = ""
    logo_url: Optional[str] = ""
    color: Optional[str] = "#1d4ed8"
    # First team registered with the club
    event_type: Literal["festival", "premier_par", "premier_impar"]
    birth_year: int = Field(ge=2008, le=2020)
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
    guardian_name: Optional[str] = ""
    guardian_doc: Optional[str] = ""
    guardian_relation: Optional[str] = ""
    guardian_phone: Optional[str] = ""

class PlayerOut(PlayerIn):
    id: str
    created_at: str

class TournamentIn(BaseModel):
    name: str
    season: str  # e.g., 2025
    category: str
    start_date: str
    end_date: str

class TournamentOut(TournamentIn):
    id: str

class MatchIn(BaseModel):
    tournament_id: str
    home_team_id: str
    away_team_id: str
    match_date: str  # ISO datetime
    venue: Optional[str] = ""
    group_name: Optional[str] = ""
    matchday: Optional[int] = None  # Jornada (Fecha 1, Fecha 2, ...)
    stage: Optional[str] = "grupos"  # grupos, octavos, cuartos, semis, final
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

class FixtureGenerateIn(BaseModel):
    tournament_id: Optional[str] = None
    category: str
    group_name: str
    team_ids: List[str]
    start_date: str  # YYYY-MM-DD
    days_between_rounds: int = 7
    venues: List[str] = []
    time_slots: List[str] = []  # ["08:00", "09:30"]
    preview: bool = False  # If true, do not save

class QuoteIn(BaseModel):
    event_type: Literal["festival", "premier_par", "premier_impar"]
    birth_year: Optional[int] = None
    category: Optional[str] = ""  # legacy
    # Hospedaje
    lodging_tier: Literal["esmerald", "sapphire", "diamond", "gold", "silver", "bronze"]
    room_type: Literal["single", "double", "triple", "multiple"]
    pax: int = Field(ge=1)
    nights: int = Field(default=5, ge=1)  # default 5 según PDF
    days: int = Field(default=6, ge=1)
    # Alimentación
    includes_breakfast: bool = False
    includes_lunch: bool = False
    meal_days: Optional[int] = None  # defaults to days
    # Transporte
    transport_routes: Optional[List[str]] = []  # ids de TRANSPORT_ROUTES
    # Tours
    tour_ids: Optional[List[str]] = []
    # Inscripción equipo (opcional al cotizar)
    include_registration: bool = True
    # Compat con flujo anterior (deprecated)
    includes_transport: bool = False
    includes_parque: bool = False
    includes_tour: bool = False
    notes: Optional[str] = ""
    contact_phone: Optional[str] = ""

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
    event = EVENT_TYPES.get(payload.event_type)
    if not event:
        raise HTTPException(status_code=400, detail="Tipo de evento inválido")
    if payload.birth_year not in event["birth_years"]:
        raise HTTPException(status_code=400, detail=f"El año {payload.birth_year} no aplica al {event['name']}. Años válidos: {event['birth_years']}")
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="El correo ya está registrado")

    user_id = str(uuid.uuid4())
    team_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    # 1) Find or create Club
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

    # 2) Compute registration fee from event + birth_year
    fee = float(event.get("fees_by_year", {}).get(str(payload.birth_year), event["registration_fee_per_team"]))

    # 3) Create team
    visible_name = f"{club_name_norm} {payload.birth_year} {payload.designation}".strip()
    team_doc = {
        "id": team_id,
        "name": visible_name,
        "club_id": club_id,
        "club_name": club_name_norm,  # denormalized for convenience
        "birth_year": payload.birth_year,
        "designation": payload.designation or "Único",
        "category": f"Año {payload.birth_year}",  # legacy display
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
    await db.teams.insert_one(team_doc)
    await db.users.insert_one(user_doc)

    access = create_access_token(user_id, email, "team")
    refresh = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh)
    return {"id": user_id, "email": email, "name": payload.manager_name, "role": "team", "team_id": team_id}

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
    return {"id": user["id"], "email": user["email"], "name": user["name"], "role": user["role"], "team_id": user.get("team_id")}

@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}

@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return {"id": user["id"], "email": user["email"], "name": user["name"], "role": user["role"], "team_id": user.get("team_id")}

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
    if payload.category not in CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Categoría inválida. Use: {', '.join(CATEGORIES)}")
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["status"] = "aprobado"  # Admin-created teams are auto-approved
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.teams.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.put("/teams/{team_id}", response_model=TeamOut)
async def update_team(team_id: str, payload: TeamIn, user: dict = Depends(get_current_user)):
    if user.get("role") == "team":
        if user.get("team_id") != team_id:
            raise HTTPException(status_code=403, detail="Solo puedes editar tu propio equipo")
    elif user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    if payload.category not in CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Categoría inválida. Use: {', '.join(CATEGORIES)}")
    res = await db.teams.update_one({"id": team_id}, {"$set": payload.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
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
    try:
        token = request.cookies.get("access_token") if request else None
        if token:
            payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
            user_doc = await db.users.find_one({"id": payload["sub"]}, {"role": 1, "team_id": 1})
            if user_doc:
                is_admin = user_doc.get("role") == "admin"
                if user_doc.get("role") == "team":
                    is_team = True
                    user_team_id = user_doc.get("team_id")
    except Exception:
        pass
    # Admin filter override
    if status and is_admin:
        q["status"] = status
    # Team manager: see their own players regardless of status
    elif is_team and team_id == user_team_id:
        pass
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
    if user["role"] == "team" and user.get("team_id") != payload.team_id:
        raise HTTPException(status_code=403, detail="Solo puedes agregar jugadores a tu propio equipo")
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    # Admin-added players are auto-approved; team-added are pending
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
        if user.get("team_id") != existing["team_id"] or payload.team_id != existing["team_id"]:
            raise HTTPException(status_code=403, detail="Solo puedes editar jugadores de tu propio equipo")
    await db.players.update_one({"id": player_id}, {"$set": payload.model_dump()})
    p = await db.players.find_one({"id": player_id}, {"_id": 0})
    return p

@api.delete("/players/{player_id}")
async def delete_player(player_id: str, user: dict = Depends(require_admin_or_team)):
    existing = await db.players.find_one({"id": player_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Jugador no encontrado")
    if user["role"] == "team" and user.get("team_id") != existing["team_id"]:
        raise HTTPException(status_code=403, detail="Solo puedes eliminar jugadores de tu propio equipo")
    await db.players.delete_one({"id": player_id})
    return {"ok": True}

# -------------------- Approval Workflows --------------------
@api.put("/teams/{team_id}/status")
async def set_team_status(team_id: str, status: str, _: dict = Depends(require_admin)):
    if status not in {"pendiente", "aprobado", "rechazado"}:
        raise HTTPException(status_code=400, detail="Estado inválido")
    res = await db.teams.update_one({"id": team_id}, {"$set": {"status": status}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    return {"ok": True}

@api.put("/players/{player_id}/status")
async def set_player_status(player_id: str, status: str, _: dict = Depends(require_admin)):
    if status not in {"pendiente", "aprobado", "rechazado"}:
        raise HTTPException(status_code=400, detail="Estado inválido")
    res = await db.players.update_one({"id": player_id}, {"$set": {"status": status}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Jugador no encontrado")
    return {"ok": True}

# -------------------- Tournaments --------------------
@api.get("/tournaments", response_model=List[TournamentOut])
async def list_tournaments():
    items = await db.tournaments.find({}, {"_id": 0}).sort("start_date", -1).to_list(200)
    return items

@api.post("/tournaments", response_model=TournamentOut)
async def create_tournament(payload: TournamentIn, _: dict = Depends(require_admin)):
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    await db.tournaments.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.delete("/tournaments/{tid}")
async def delete_tournament(tid: str, _: dict = Depends(require_admin)):
    await db.tournaments.delete_one({"id": tid})
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
        }}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    m = await db.matches.find_one({"id": mid}, {"_id": 0})
    return m

@api.delete("/matches/{mid}")
async def delete_match(mid: str, _: dict = Depends(require_admin)):
    await db.matches.delete_one({"id": mid})
    return {"ok": True}

# -------------------- Fixture Generator (Round Robin) --------------------
def _round_robin_pairs(team_ids: List[str]) -> List[List[tuple]]:
    """Return list of rounds, each round is list of (home, away) pairs.
    Uses 'circle method'. Adds None for byes if odd count."""
    teams = list(team_ids)
    if len(teams) < 2:
        return []
    if len(teams) % 2 == 1:
        teams.append(None)  # BYE marker
    n = len(teams)
    rounds = []
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
        rounds.append(round_matches)
        # rotate keeping arr[0] fixed
        arr = [arr[0]] + [arr[-1]] + arr[1:-1]
    return rounds

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
    if payload.category not in CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Categoría inválida. Use: {', '.join(CATEGORIES)}")
    if len(payload.team_ids) < 2:
        raise HTTPException(status_code=400, detail="Se requieren al menos 2 equipos")
    teams = await db.teams.find({"id": {"$in": payload.team_ids}}, {"_id": 0}).to_list(500)
    if len(teams) != len(payload.team_ids):
        raise HTTPException(status_code=400, detail="Algunos equipos no existen")

    # Ensure tournament
    tournament_id = payload.tournament_id
    if not tournament_id:
        existing = await db.tournaments.find_one({"name": "FSC", "season": str(datetime.now().year)}, {"_id": 0})
        if existing:
            tournament_id = existing["id"]
        else:
            new_t = {
                "id": str(uuid.uuid4()),
                "name": "FSC",
                "season": str(datetime.now().year),
                "category": payload.category,
                "start_date": payload.start_date,
                "end_date": payload.start_date,
            }
            await db.tournaments.insert_one(new_t)
            tournament_id = new_t["id"]

    rounds = _round_robin_pairs(payload.team_ids)
    byes = _byes_per_round(payload.team_ids)
    tmap = {t["id"]: t for t in teams}

    try:
        start = datetime.strptime(payload.start_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de fecha inválido (YYYY-MM-DD)")

    venues = payload.venues or [""]
    slots = payload.time_slots or ["10:00"]

    generated = []
    for r_idx, pairs in enumerate(rounds):
        round_date = start + timedelta(days=r_idx * payload.days_between_rounds)
        for i, (home_id, away_id) in enumerate(pairs):
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

# -------------------- Stats --------------------
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

    table = {t["id"]: {
        "team_id": t["id"], "team_name": t["name"], "team_logo": t.get("logo_url", ""),
        "category": t["category"], "group_name": t.get("group_name", ""),
        "played": 0, "won": 0, "drawn": 0, "lost": 0,
        "gf": 0, "ga": 0, "gd": 0, "points": 0, "fair_play": 0,
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
        table[h]["fair_play"] += int(m.get("home_fair_play") or 0)
        table[a]["fair_play"] += int(m.get("away_fair_play") or 0)
        if hs > as_:
            table[h]["won"] += 1; table[h]["points"] += 3
            table[a]["lost"] += 1
        elif hs < as_:
            table[a]["won"] += 1; table[a]["points"] += 3
            table[h]["lost"] += 1
        else:
            table[h]["drawn"] += 1; table[h]["points"] += 1
            table[a]["drawn"] += 1; table[a]["points"] += 1

    rows = list(table.values())
    for r in rows:
        r["gd"] = r["gf"] - r["ga"]
    # Tiebreakers: points -> gd -> gf -> fair_play
    rows.sort(key=lambda r: (-r["points"], -r["gd"], -r["gf"], -r["fair_play"]))
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

_crud_endpoints("hotels", HotelIn, HotelOut, "hotels")
_crud_endpoints("transports", TransportIn, TransportOut, "transports")
_crud_endpoints("tours", TourIn, TourOut, "tours")

# -------------------- Health --------------------
@api.get("/")
async def root():
    return {"app": "Future Soccer Cup", "ok": True}

@api.get("/categories")
async def list_categories():
    return CATEGORIES

@api.get("/event-types")
async def list_event_types():
    """Return all event types with their birth_years (and legacy fields) plus lodging/addons."""
    return {
        "events": list(EVENT_TYPES.values()),
        "lodging_tiers": list(LODGING_TIERS.values()),
        "meal_plans": list(MEAL_PLANS.values()),
        "transport_routes": list(TRANSPORT_ROUTES.values()),
        "tours_catalog": list(TOURS_CATALOG.values()),
        "addons": ADDON_PRICES,  # legacy
        "designations": TEAM_DESIGNATIONS,
        "event_nights": EVENT_NIGHTS,
        "event_days": EVENT_DAYS,
    }

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

@api.put("/clubs/{cid}/status")
async def set_club_status(cid: str, status: str, _: dict = Depends(require_admin)):
    if status not in {"pendiente", "aprobado", "rechazado"}:
        raise HTTPException(status_code=400, detail="Estado inválido")
    res = await db.clubs.update_one({"id": cid}, {"$set": {"status": status}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Club no encontrado")
    return {"ok": True}

# DT can register additional teams under their existing club
class TeamAddIn(BaseModel):
    event_type: Literal["festival", "premier_par", "premier_impar"]
    birth_year: int = Field(ge=2008, le=2020)
    designation: Optional[Literal["Único", "Equipo A", "Equipo B"]] = "Único"

@api.post("/clubs/{cid}/teams")
async def add_team_to_club(cid: str, payload: TeamAddIn, user: dict = Depends(get_current_user)):
    if user.get("role") not in ("admin", "team"):
        raise HTTPException(status_code=403, detail="No autorizado")
    club = await db.clubs.find_one({"id": cid}, {"_id": 0})
    if not club:
        raise HTTPException(status_code=404, detail="Club no encontrado")
    if user.get("role") != "admin" and club.get("manager_user_id") != user["id"]:
        raise HTTPException(status_code=403, detail="No autorizado")
    event = EVENT_TYPES.get(payload.event_type)
    if payload.birth_year not in event["birth_years"]:
        raise HTTPException(status_code=400, detail=f"El año {payload.birth_year} no aplica al {event['name']}")
    # Uniqueness: one (club_id, event_type, birth_year, designation)
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
    now = datetime.now(timezone.utc).isoformat()
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

# -------------------- Quotes (Cotizaciones) --------------------
def _calculate_quote(payload: QuoteIn) -> dict:
    event = EVENT_TYPES.get(payload.event_type)
    tier = LODGING_TIERS.get(payload.lodging_tier)
    if not event or not tier:
        raise HTTPException(status_code=400, detail="Evento o nivel de hospedaje inválido")

    # Tarifa hospedaje (precio TOTAL por persona por 5 noches del PDF)
    rate_per_person = tier["rates"].get(payload.room_type, 0)
    if rate_per_person == 0:
        raise HTTPException(status_code=400, detail=f"El tier {tier['name']} no ofrece habitación {payload.room_type}")

    nights = payload.nights or EVENT_NIGHTS
    days = payload.days or EVENT_DAYS
    meal_days = payload.meal_days or days

    # Adjuste lineal por noches (las tarifas del PDF son para 5 noches)
    lodging_total = rate_per_person * payload.pax * (nights / EVENT_NIGHTS)

    # Alimentación
    breakfast_per_day = MEAL_PLANS["breakfast"]["per_day_by_tier"].get(payload.lodging_tier, 0)
    lunch_per_day = MEAL_PLANS["lunch"]["per_day_by_tier"].get(payload.lodging_tier, 0)
    breakfast_total = breakfast_per_day * payload.pax * meal_days if payload.includes_breakfast else 0
    lunch_total = lunch_per_day * payload.pax * meal_days if payload.includes_lunch else 0
    meals_total = breakfast_total + lunch_total

    # Transporte (rutas múltiples × pax)
    transport_routes = payload.transport_routes or []
    transport_total = sum(
        TRANSPORT_ROUTES.get(r, {}).get("price", 0) * payload.pax for r in transport_routes
    )
    # Compat: si se usó la bandera legacy `includes_transport` y no hay rutas, asume aeropuerto ida+vuelta
    if payload.includes_transport and not transport_routes:
        transport_total = (TRANSPORT_ROUTES["airport_to_hotel"]["price"] + TRANSPORT_ROUTES["hotel_to_airport"]["price"]) * payload.pax
        transport_routes = ["airport_to_hotel", "hotel_to_airport"]

    # Tours
    tour_ids = payload.tour_ids or []
    if payload.includes_parque and "parque_del_cafe" not in tour_ids:
        tour_ids.append("parque_del_cafe")
    if payload.includes_tour and "panaca" not in tour_ids:
        tour_ids.append("panaca")
    tours_total = sum(TOURS_CATALOG.get(tid, {}).get("price", 0) * payload.pax for tid in tour_ids)

    # Inscripción: prefer fees_by_year cuando birth_year disponible
    registration = 0
    if payload.include_registration:
        fees_by_year = event.get("fees_by_year") or {}
        if payload.birth_year and str(payload.birth_year) in fees_by_year:
            registration = float(fees_by_year[str(payload.birth_year)])
        else:
            registration = float(event.get("registration_fee_per_team", 0))

    total = lodging_total + meals_total + transport_total + tours_total + registration

    return {
        "lodging_subtotal": lodging_total,
        "rate_per_person_5nights": rate_per_person,
        "rate_per_person_night": int(rate_per_person / EVENT_NIGHTS) if rate_per_person else 0,
        "meals_subtotal": meals_total,
        "breakfast_subtotal": breakfast_total,
        "lunch_subtotal": lunch_total,
        "transport_subtotal": transport_total,
        "transport_routes_applied": transport_routes,
        "tours_subtotal": tours_total,
        "tour_ids_applied": tour_ids,
        # legacy keys for backwards-compat
        "parque_subtotal": TOURS_CATALOG["parque_del_cafe"]["price"] * payload.pax if "parque_del_cafe" in tour_ids else 0,
        "tour_subtotal": TOURS_CATALOG["panaca"]["price"] * payload.pax if "panaca" in tour_ids else 0,
        "registration_fee": registration,
        "total_amount": total,
        "event_name": event["name"],
        "lodging_name": tier["name"],
        "nights": nights,
        "days": days,
        "pax": payload.pax,
    }

@api.post("/quotes/calculate")
async def calculate_quote(payload: QuoteIn):
    """Public estimate without saving."""
    return _calculate_quote(payload)

@api.post("/quotes")
async def create_quote(payload: QuoteIn, user: dict = Depends(get_current_user)):
    if user.get("role") not in ("team", "admin"):
        raise HTTPException(status_code=403, detail="Solo los directores técnicos pueden enviar cotizaciones")
    breakdown = _calculate_quote(payload)
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

@api.get("/quotes/mine")
async def my_quotes(user: dict = Depends(get_current_user)):
    items = await db.quotes.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items

@api.get("/quotes")
async def all_quotes(_: dict = Depends(require_admin)):
    items = await db.quotes.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return items

@api.put("/quotes/{qid}/status")
async def update_quote_status(qid: str, status: str, _: dict = Depends(require_admin)):
    if status not in {"pendiente", "aprobada", "rechazada", "pagada"}:
        raise HTTPException(status_code=400, detail="Estado inválido")
    res = await db.quotes.update_one({"id": qid}, {"$set": {"status": status}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
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
    try:
        status = await stripe.get_checkout_status(session_id)
    except Exception as e:
        logging.warning(f"Stripe status lookup failed for {session_id}: {e}")
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
        raise HTTPException(status_code=400, detail="Solo se aceptan imágenes (jpg, jpeg, png, gif, webp)")
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Imagen mayor a 5MB")
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
        "• Hoja 'Cuerpo Tecnico': director técnico, asistentes, médico, fisioterapeuta, delegado, etc.",
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
    if await db.hotels.count_documents({}) == 0:
        await db.hotels.insert_many([
            {"id": str(uuid.uuid4()), "name": "Hotel Estadio Plaza", "description": "Hotel familiar a 5 min del estadio principal. Desayuno incluido y piscina.", "address": "Av. Deportiva 123", "price_per_night": 89.0, "image_url": "https://images.unsplash.com/photo-1747561088583-b8b849045895?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njd8MHwxfHNlYXJjaHwyfHxtb2Rlcm4lMjBmYW1pbHklMjByZXNvcnQlMjBob3RlbHxlbnwwfHx8fDE3NzczMzIxMjB8MA&ixlib=rb-4.1.0&q=85", "amenities": ["WiFi", "Desayuno", "Piscina", "Estacionamiento"], "capacity": 4},
            {"id": str(uuid.uuid4()), "name": "Resort Champions", "description": "Resort 4 estrellas con todo incluido para familias deportivas.", "address": "Costa Azul 456", "price_per_night": 145.0, "image_url": "https://images.unsplash.com/photo-1640677118257-8e13fa9ebc1a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njd8MHwxfHNlYXJjaHwzfHxtb2Rlcm4lMjBmYW1pbHklMjByZXNvcnQlMjBob3RlbHxlbnwwfHx8fDE3NzczMzIxMjB8MA&ixlib=rb-4.1.0&q=85", "amenities": ["Todo incluido", "WiFi", "Spa", "Gimnasio"], "capacity": 6},
        ])
    if await db.transports.count_documents({}) == 0:
        await db.transports.insert_many([
            {"id": str(uuid.uuid4()), "name": "Bus 40 plazas", "description": "Bus turístico para traslados entre estadios.", "type": "bus", "price": 250.0, "image_url": "https://images.pexels.com/photos/29586609/pexels-photo-29586609.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "capacity": 40},
            {"id": str(uuid.uuid4()), "name": "Van Familiar 12 plazas", "description": "Van privada con aire acondicionado.", "type": "van", "price": 120.0, "image_url": "", "capacity": 12},
        ])
    if await db.tours.count_documents({}) == 0:
        await db.tours.insert_many([
            {"id": str(uuid.uuid4()), "name": "Tour Ciudad Histórica", "description": "Recorrido guiado de 4 horas por el centro histórico.", "duration": "4h", "price": 35.0, "image_url": ""},
            {"id": str(uuid.uuid4()), "name": "Estadio + Museo del Fútbol", "description": "Visita el estadio y el museo oficial. Incluye snack.", "duration": "3h", "price": 28.0, "image_url": ""},
        ])

@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.teams.create_index("id", unique=True)
    await db.clubs.create_index("id", unique=True)
    await db.clubs.create_index("name")
    await db.players.create_index("id", unique=True)
    await db.matches.create_index("id", unique=True)
    await db.quotes.create_index("id", unique=True)
    await db.posts.create_index("id", unique=True)
    await db.payment_transactions.create_index("session_id", unique=True)
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
