"""
Seed de datos mínimos para desarrollo local.

Reutiliza los mismos modelos, constantes y funciones de seed que ya usa
server.py (CATEGORIES, EVENT_TYPES, HomeSettings, seed_admin, seed_demo_inventory)
para que los datos de prueba sean consistentes con lo que la app espera.

Uso (con el venv del backend activado y backend/.env apuntando a Mongo local):
    python seed_data.py
"""
import asyncio
import uuid
from datetime import datetime, timezone

from server import (
    db,
    seed_admin,
    seed_demo_inventory,
    CATEGORIES,
    EVENT_TYPES,
    HOME_SETTINGS_ID,
    HomeSettings,
    DEFAULT_HISTORY_TIMELINE,
    DEFAULT_EVENTOS_CONFIG,
    DEFAULT_ESTADISTICAS_CONFIG,
    DEFAULT_NOTICIAS_CONFIG,
    DEFAULT_CONTACTO_CONFIG,
)


async def seed_categories():
    if await db.categories.count_documents({}) > 0:
        print("  categories: ya hay datos, se omite")
        return
    now = datetime.now(timezone.utc).isoformat()
    await db.categories.insert_many([
        {"id": str(uuid.uuid4()), "name": n, "sort_order": i, "color": "", "created_at": now}
        for i, n in enumerate(CATEGORIES)
    ])
    print(f"  categories: {len(CATEGORIES)} creadas ({', '.join(CATEGORIES)})")


async def seed_event_types():
    if await db.event_types.count_documents({}) > 0:
        print("  event_types: ya hay datos, se omite")
        return
    now = datetime.now(timezone.utc).isoformat()
    docs = [
        {
            "id": key,
            "name": ev.get("name", key),
            "description": ev.get("description", ""),
            "registration_fee_per_team": float(ev.get("registration_fee_per_team", 0) or 0),
            "month": ev.get("month", ""),
            "sort_order": i,
            "created_at": now,
        }
        for i, (key, ev) in enumerate(EVENT_TYPES.items())
    ]
    await db.event_types.insert_many(docs)
    print(f"  event_types: {len(docs)} creados ({', '.join(d['name'] for d in docs)})")


async def seed_home_settings():
    if await db.home_settings.find_one({"id": HOME_SETTINGS_ID}):
        print("  home_settings: ya existe, se omite")
        return
    doc = HomeSettings().model_dump()
    doc["id"] = HOME_SETTINGS_ID
    doc["nosotros_history_timeline"] = DEFAULT_HISTORY_TIMELINE
    doc["eventos"] = DEFAULT_EVENTOS_CONFIG
    doc["estadisticas"] = DEFAULT_ESTADISTICAS_CONFIG
    doc["noticias"] = DEFAULT_NOTICIAS_CONFIG
    doc["contacto"] = DEFAULT_CONTACTO_CONFIG
    await db.home_settings.insert_one(doc)
    print("  home_settings: documento por defecto creado")


async def seed_demo_club():
    if await db.clubs.count_documents({}) > 0:
        print("  clubs: ya hay datos, se omite")
        return
    now = datetime.now(timezone.utc).isoformat()
    await db.clubs.insert_one({
        "id": str(uuid.uuid4()),
        "name": "Club Deportivo Demo",
        "country": "Colombia",
        "city": "Armenia",
        "phone": "+57 300 000 0000",
        "email": "contacto@clubdemo.com",
        "website": "",
        "logo_url": "",
        "color": "#1d4ed8",
        "status": "aprobado",
        "manager_user_id": "",
        "image_name": "",
        "created_at": now,
    })
    print("  clubs: 1 club de prueba creado (Club Deportivo Demo)")


async def main():
    print("Sembrando datos mínimos en la base de datos local...\n")
    await seed_admin()
    print("  users: admin asegurado (credenciales en backend/.env: ADMIN_EMAIL / ADMIN_PASSWORD)")
    await seed_categories()
    await seed_event_types()
    await seed_demo_inventory()
    print("  pricing_catalog: hospedaje/comidas/transporte/tours sembrados")
    await seed_home_settings()
    await seed_demo_club()
    print("\nListo. La base de datos local ya tiene datos mínimos para navegar la app.")


if __name__ == "__main__":
    asyncio.run(main())
