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
        "description": "Evento temático para todas las edades. Ideal como primera experiencia.",
        "categories": ["Sub-8", "Sub-10", "Sub-12"],
        "registration_fee_per_team": 1000000.0,
    },
    "premier_par": {
        "id": "premier_par",
        "name": "Premier Par",
        "description": "Premier para categorías de años pares (2014, 2012, 2010).",
        "categories": ["Sub-12", "Sub-14", "Sub-16"],
        "registration_fee_per_team": 1800000.0,
    },
    "premier_impar": {
        "id": "premier_impar",
        "name": "Premier Impar",
        "description": "Premier para categorías de años impares (2015, 2013, 2011).",
        "categories": ["Sub-10", "Sub-12", "Sub-14", "Sub-16"],
        "registration_fee_per_team": 1800000.0,
    },
}

# Lodging tiers: tarifas en COP por persona por noche
LODGING_TIERS = {
    "diamond":  {"id": "diamond",  "name": "Diamante", "description": "Hotel 5★ con todas las comodidades.", "rates": {"single": 720000, "double": 560000, "triple": 480000, "quadruple": 400000}},
    "gold":     {"id": "gold",     "name": "Gold",     "description": "Hotel 4★ confortable y bien ubicado.",  "rates": {"single": 520000, "double": 400000, "triple": 340000, "quadruple": 280000}},
    "silver":   {"id": "silver",   "name": "Silver",   "description": "Hotel 3★ limpio y acogedor.",            "rates": {"single": 380000, "double": 300000, "triple": 240000, "quadruple": 200000}},
    "bronze":   {"id": "bronze",   "name": "Bronce",   "description": "Hospedaje básico y económico.",          "rates": {"single": 240000, "double": 180000, "triple": 150000, "quadruple": 130000}},
}

ADDON_PRICES = {
    "transport": 100000.0,  # COP por persona
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

# -------------------- Models --------------------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)
    data_consent: bool = False

class TeamRegisterIn(BaseModel):
    # Team manager + team info, all in one payload
    email: EmailStr
    password: str = Field(min_length=6)
    manager_name: str = Field(min_length=1)
    team_name: str = Field(min_length=1)
    category: str
    event_type: Literal["festival", "premier_par", "premier_impar"]
    coach: Optional[str] = ""
    city: Optional[str] = ""
    logo_url: Optional[str] = ""
    color: Optional[str] = "#1d4ed8"
    data_consent: bool = False

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str

class TeamIn(BaseModel):
    name: str
    category: str  # Sub-8, Sub-10, etc.
    birth_year: Optional[int] = None  # Año de nacimiento (ej. 2014)
    coach: Optional[str] = ""
    city: Optional[str] = ""
    country: Optional[str] = ""
    president: Optional[str] = ""
    delegate_phone: Optional[str] = ""
    logo_url: Optional[str] = ""
    color: Optional[str] = "#1d4ed8"
    group_name: Optional[str] = ""  # Grupo A, Grupo B, Unigrupo
    cuerpo_tecnico: Optional[List[dict]] = []  # [{name, document, role}]
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
    category: str
    lodging_tier: Literal["diamond", "gold", "silver", "bronze"]
    room_type: Literal["single", "double", "triple", "quadruple"]
    pax: int = Field(ge=1)
    nights: int = Field(ge=1)
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
    email = payload.email.lower()
    if not payload.data_consent:
        raise HTTPException(status_code=400, detail="Debes aceptar el tratamiento de datos personales para continuar.")
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="El correo ya está registrado")
    now = datetime.now(timezone.utc).isoformat()
    user = {
        "id": str(uuid.uuid4()),
        "email": email,
        "name": payload.name,
        "role": "family",
        "password_hash": hash_password(payload.password),
        "data_consent": True,
        "consent_at": now,
        "created_at": now,
    }
    await db.users.insert_one(user)
    access = create_access_token(user["id"], user["email"], user["role"])
    refresh = create_refresh_token(user["id"])
    set_auth_cookies(response, access, refresh)
    return {"id": user["id"], "email": user["email"], "name": user["name"], "role": user["role"]}

@api.post("/auth/register-team")
async def register_team(payload: TeamRegisterIn, response: Response):
    email = payload.email.lower()
    if not payload.data_consent:
        raise HTTPException(status_code=400, detail="Debes aceptar el tratamiento de datos personales para continuar.")
    if payload.category not in CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Categoría inválida. Use: {', '.join(CATEGORIES)}")
    event = EVENT_TYPES.get(payload.event_type)
    if not event:
        raise HTTPException(status_code=400, detail="Tipo de evento inválido")
    if payload.category not in event["categories"]:
        raise HTTPException(status_code=400, detail=f"La categoría {payload.category} no aplica al {event['name']}")
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="El correo ya está registrado")

    user_id = str(uuid.uuid4())
    team_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    team_doc = {
        "id": team_id,
        "name": payload.team_name,
        "category": payload.category,
        "coach": payload.coach or "",
        "city": payload.city or "",
        "logo_url": payload.logo_url or "",
        "color": payload.color or "#1d4ed8",
        "manager_user_id": user_id,
        "status": "pendiente",  # Self-registered, awaits admin approval
        "event_type": payload.event_type,
        "registration_fee": event["registration_fee_per_team"],
        "registration_payment_status": "pending",
        "cuerpo_tecnico": [],
        "created_at": now,
    }
    user_doc = {
        "id": user_id,
        "email": email,
        "name": payload.manager_name,
        "role": "team",
        "team_id": team_id,
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
    """Return all event types with their categories and lodging tiers."""
    return {
        "events": list(EVENT_TYPES.values()),
        "lodging_tiers": list(LODGING_TIERS.values()),
        "addons": ADDON_PRICES,
    }

# -------------------- Quotes (Cotizaciones) --------------------
def _calculate_quote(payload: QuoteIn) -> dict:
    event = EVENT_TYPES.get(payload.event_type)
    tier = LODGING_TIERS.get(payload.lodging_tier)
    if not event or not tier:
        raise HTTPException(status_code=400, detail="Evento o nivel de hospedaje inválido")
    if payload.category not in event["categories"]:
        raise HTTPException(status_code=400, detail=f"Categoría {payload.category} no aplica para {event['name']}")
    rate = tier["rates"].get(payload.room_type)
    if rate is None:
        raise HTTPException(status_code=400, detail="Tipo de habitación inválido")

    lodging_total = rate * payload.pax * payload.nights
    transport_total = ADDON_PRICES["transport"] * payload.pax if payload.includes_transport else 0
    parque_total = ADDON_PRICES["parque"] * payload.pax if payload.includes_parque else 0
    tour_total = ADDON_PRICES["tour"] * payload.pax if payload.includes_tour else 0
    registration = event["registration_fee_per_team"]
    total = lodging_total + transport_total + parque_total + tour_total + registration

    return {
        "lodging_subtotal": lodging_total,
        "transport_subtotal": transport_total,
        "parque_subtotal": parque_total,
        "tour_subtotal": tour_total,
        "registration_fee": registration,
        "total_amount": total,
        "rate_per_person_night": rate,
        "event_name": event["name"],
        "lodging_name": tier["name"],
    }

@api.post("/quotes/calculate")
async def calculate_quote(payload: QuoteIn):
    """Public estimate without saving."""
    return _calculate_quote(payload)

@api.post("/quotes")
async def create_quote(payload: QuoteIn, user: dict = Depends(get_current_user)):
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

# -------------------- Bulk Import (CSV / XLSX) --------------------
TEAM_TEMPLATE_HEADERS = ["name", "category", "birth_year", "group_name", "coach", "city", "country", "president", "delegate_phone", "color"]
PLAYER_TEMPLATE_HEADERS = ["team_name", "name", "jersey_number", "position", "birth_date", "document_id", "nickname", "gender", "eps", "guardian_name", "guardian_doc", "guardian_relation", "guardian_phone"]

def _parse_uploaded(file: UploadFile, raw: bytes) -> List[dict]:
    """Returns list of dicts with stringified cell values, keyed by lowercase headers."""
    name = (file.filename or "").lower()
    if name.endswith(".csv"):
        text = raw.decode("utf-8-sig", errors="replace")
        reader = csv.DictReader(io.StringIO(text))
        return [{(k or "").strip().lower(): (v or "").strip() for k, v in row.items()} for row in reader]
    elif name.endswith(".xlsx"):
        wb = load_workbook(io.BytesIO(raw), data_only=True)
        ws = wb.active
        headers = [str(c.value or "").strip().lower() for c in next(ws.iter_rows(max_row=1))]
        rows = []
        for r in ws.iter_rows(min_row=2, values_only=True):
            if not any(r):
                continue
            d = {h: ("" if v is None else str(v).strip()) for h, v in zip(headers, r)}
            rows.append(d)
        return rows
    else:
        raise HTTPException(status_code=400, detail="Formato no soportado. Usa .csv o .xlsx")

@api.get("/import/template/{kind}")
async def download_template(kind: str, _: dict = Depends(require_admin)):
    if kind == "teams":
        headers = TEAM_TEMPLATE_HEADERS
        sample = ["Leones FC", "Sub-12", "2014", "Grupo A", "Pedro Coach", "Quito", "Ecuador", "Maria Pdta", "+593987654321", "#1d4ed8"]
    elif kind == "players":
        headers = PLAYER_TEMPLATE_HEADERS
        sample = ["Leones FC", "Carlos Pérez", "10", "Delantero", "2014-03-15", "1750000000", "Pipo", "M", "Sanitas", "Maria Pérez", "0701234567", "Madre", "+593987654321"]
    else:
        raise HTTPException(status_code=400, detail="Tipo inválido (teams|players)")

    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(headers)
    writer.writerow(sample)
    return StreamingResponse(
        iter([out.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=fsc-{kind}-template.csv"},
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
STAFF_HEADERS = ["name", "role", "document", "phone"]

def _parse_xlsx_sheets(raw: bytes) -> dict:
    """Parse all sheets in an XLSX as lowercase-keyed dicts. Returns {sheet_name_lower: [rows]}."""
    wb = load_workbook(io.BytesIO(raw), data_only=True)
    out = {}
    for sh in wb.sheetnames:
        ws = wb[sh]
        try:
            headers = [str(c.value or "").strip().lower() for c in next(ws.iter_rows(max_row=1))]
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
    """Multi-sheet XLSX template for team managers: Jugadores + Cuerpo Técnico."""
    if user.get("role") not in ("team", "admin"):
        raise HTTPException(status_code=403, detail="Solo directores técnicos")
    wb = Workbook()
    ws1 = wb.active
    ws1.title = "Jugadores"
    ws1.append(PLAYER_TEMPLATE_HEADERS[1:])  # skip team_name (implied from current team)
    ws1.append(["Carlos Pérez", "10", "Delantero", "2014-03-15", "1750000000", "Pipo", "M", "Sanitas", "Maria Pérez", "0701234567", "Madre", "+593987654321"])
    ws2 = wb.create_sheet("Cuerpo Tecnico")
    ws2.append(STAFF_HEADERS)
    ws2.append(["Pedro Coach", "Director técnico", "1700000000", "+593987654321"])
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
    if not (fname.endswith(".xlsx") or fname.endswith(".csv")):
        raise HTTPException(status_code=400, detail="Usa formato .xlsx (con 2 hojas) o .csv (solo jugadores)")
    raw = await file.read()
    if len(raw) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Archivo > 5MB")

    sheets: dict
    if fname.endswith(".csv"):
        text = raw.decode("utf-8-sig", errors="replace")
        reader = csv.DictReader(io.StringIO(text))
        rows = [{(k or "").strip().lower(): (v or "").strip() for k, v in row.items()} for row in reader]
        sheets = {"jugadores": rows}
    else:
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
    await db.players.create_index("id", unique=True)
    await db.matches.create_index("id", unique=True)
    await db.quotes.create_index("id", unique=True)
    await db.posts.create_index("id", unique=True)
    await db.payment_transactions.create_index("session_id", unique=True)
    await db.files.create_index("storage_path")
    await db.login_attempts.create_index("identifier")
    await seed_admin()
    await seed_demo_inventory()
    init_storage()

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
