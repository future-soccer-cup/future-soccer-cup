"""
Importa las posiciones históricas del archivo
'FIXTURE DICIEMBRE 2025 IMPARES.xls' como un torneo archivado.

Parsea las hojas R-X-Y (standings) y carga cada fila a `db.historical_standings`,
creando el torneo padre en `db.tournaments` con flag `archived=True`.

Uso:
    python /app/backend/scripts/import_historical_dic2025.py /tmp/fixture_dic25.xls
"""
import sys
import os
import uuid
import asyncio
import xlrd
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

# Hojas con datos REALES de clubes (las demás contienen plantilla de prueba con países/letras).
SHEET_TO_CATEGORY = {
    "R-3-4": "Sub-12",   # COMFENALCO, GATO PEREZ, QUINDIO FC, ACADEMIA DEP. PEREIRA, LA ESPERANZA...
    "R-5-6": "Sub-10",   # DITD QUINDIO, CD CELTIC, QUINDIANOS, DEP. PEREIRA DIV MENORES...
    "R-9-10": "Sub-16",  # KANTERANOS, DEPORTIVO PEREIRA, CLUB ATLETICO BOCA, BELHORIZON FC...
}

# Términos genéricos/plantilla a descartar
INVALID_NAMES = {
    "DESCANSA", "EQUIPOS", "FUTURE SOCCER CUP",
}

TOURNAMENT_NAME = "Diciembre 2025 Impares (Histórico)"
TOURNAMENT_SEASON = "2025"


def _int(v, default=0):
    try:
        if v in (None, ""):
            return default
        return int(float(v))
    except (TypeError, ValueError):
        return default


def parse_standings(xls_path: str):
    wb = xlrd.open_workbook(xls_path, on_demand=True)
    out = []  # list of {category, group_name, rank, team_name, played, won, drawn, lost, gf, ga, gd, fair_play, points}
    for sn in wb.sheet_names():
        if not sn.startswith("R-"):
            continue
        category = SHEET_TO_CATEGORY.get(sn)
        if not category:
            continue
        sh = wb.sheet_by_name(sn)
        current_group = None
        for r in range(sh.nrows):
            row = [sh.cell_value(r, c) for c in range(min(sh.ncols, 12))]
            # Detectar header del grupo: col0='N°' col1='Grupo X' col2='P J' col10='PTOS'
            if (str(row[0]).strip() == "N°"
                and "P J" in str(row[2])
                and "PTOS" in str(row[10])):
                current_group = str(row[1]).strip()
                continue
            # Filas de equipo: col0 = rank (int), col1 = team_name (str non-empty)
            if not current_group:
                continue
            try:
                rank = int(float(row[0]))
            except (TypeError, ValueError):
                continue
            team_name = str(row[1]).strip()
            if not team_name or team_name in ("0", "0.0"):
                continue
            # Filtrar plantilla: nombres <= 2 chars o términos genéricos
            tn_upper = team_name.upper()
            if len(team_name) < 3 or tn_upper in INVALID_NAMES:
                continue
            # Skip totales/footers
            played = _int(row[2])
            # Solo importar equipos con al menos 1 partido jugado
            if played < 1:
                continue
            won = _int(row[3])
            lost = _int(row[4])
            drawn = _int(row[5])
            gf = _int(row[6])
            ga = _int(row[7])
            gd = _int(row[8])
            fp = _int(row[9])
            pts = _int(row[10])
            out.append({
                "category": category,
                "group_name": current_group,
                "rank": rank,
                "team_name": team_name,
                "played": played,
                "won": won,
                "drawn": drawn,
                "lost": lost,
                "gf": gf,
                "ga": ga,
                "gd": gd if gd else (gf - ga),
                "fair_play": fp,
                "points": pts,
            })
    return out


async def import_to_mongo(rows):
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    # Crear torneo histórico (si no existe ya)
    existing = await db.tournaments.find_one({"name": TOURNAMENT_NAME, "season": TOURNAMENT_SEASON}, {"_id": 0})
    if existing:
        tid = existing["id"]
        print(f"Reutilizando torneo histórico existente id={tid}")
        # Limpiar standings previos para idempotencia
        deleted = await db.historical_standings.delete_many({"tournament_id": tid})
        print(f"Eliminados {deleted.deleted_count} standings previos")
    else:
        tid = str(uuid.uuid4())
        tdoc = {
            "id": tid,
            "name": TOURNAMENT_NAME,
            "season": TOURNAMENT_SEASON,
            "category": "Mixto",
            "start_date": "2025-12-01",
            "end_date": "2025-12-20",
            "event_type": "premier_impar",
            "fmt": "cuadrangular_x2",
            "archived": True,
        }
        await db.tournaments.insert_one(tdoc)
        print(f"Torneo histórico creado id={tid}")
    # Insertar standings
    docs = []
    for r in rows:
        docs.append({
            "id": str(uuid.uuid4()),
            "tournament_id": tid,
            **r,
        })
    if docs:
        await db.historical_standings.insert_many(docs)
    print(f"Importados {len(docs)} filas de standings")
    # resumen
    by_cat_group = {}
    for d in docs:
        key = (d["category"], d["group_name"])
        by_cat_group[key] = by_cat_group.get(key, 0) + 1
    for (cat, grp), n in sorted(by_cat_group.items()):
        print(f"  {cat} | {grp}: {n} equipos")
    client.close()


def main():
    xls_path = sys.argv[1] if len(sys.argv) > 1 else "/tmp/fixture_dic25.xls"
    if not os.path.exists(xls_path):
        print(f"ERROR: no existe {xls_path}")
        sys.exit(1)
    rows = parse_standings(xls_path)
    print(f"Parseadas {len(rows)} filas de standings desde {xls_path}")
    asyncio.run(import_to_mongo(rows))


if __name__ == "__main__":
    main()
