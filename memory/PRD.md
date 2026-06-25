# FUTRE SOCCER CUP — PRD

## Original Problem Statement
Build a versatile application for FUTRE SOCCER CUP organizing youth football events. Public & Admin portals, Fixture generation, Match results, Club/Team/Player registration, Quotes with multi-currency (USD/COP), manual Payments with bank receipts, PDF Carnet generation, PDF Quote/Roster generation, role-based access (Admins, Directivos & Cuerpo Técnico), and a comprehensive Visual Identity. Spanish (ES) UI.

## Roles
- **Admin**: Full access to all modules.
- **Director (Directivo)**: Manages club + teams + players. Sees Otros Cobros in quotes. Can download Team Roster PDFs.
- **Cuerpo Técnico (CT)**: Manages club teams/players (read-mostly), can't change Club logo.
- **Public**: Read-only Estadísticas (fixture, results, standings) — NO PDF downloads.

## Architecture (high level)
- Frontend: React 19, Tailwind, Shadcn UI, lucide-react, sonner.
- Backend: FastAPI + Motor (async MongoDB), reportlab for PDFs, JWT auth.
- Storage: Emergent Object Storage for images/PDFs.
- Tests: pytest under `/app/backend/tests/`.

## What's been implemented (CHANGELOG)
### 2026-02-25 — Ajustes UI de páginas secundarias (heroes + colores + CMS)
- **Nosotros**: título `SOMOS MAS QUE UN TORNEO` cambiado a color rojo institucional `#e31f27`. Eliminada sección "HABLEMOS".
- **Eventos**: hero ya usa `SecondaryHero` con overlay rojo translúcido `rgba(227,31,39,0.7)` sobre imagen de fondo (editable).
- **Estadísticas**: hero monocromo negro reemplazado por `SecondaryHero` con overlay azul `rgba(6,64,200,0.7)` sobre imagen de fondo (editable).
- **Noticias**: título `NOTICIAS` cambiado a rojo institucional `#e31f27`.
- **Contacto**: hero personalizado reemplazado por `SecondaryHero` con overlay azul (editable). Eliminada sección "HABLEMOS".
- **Admin CMS**: añadidos campos `*_hero_bg_url` (ImageUpload) y selector `*_hero_overlay` (azul/rojo) en cada sección de Nosotros/Eventos/Estadísticas/Contacto en `/admin/home`. Eliminada la sección "Hablemos" del admin (ya no se renderiza en ninguna página).
- Lint OK en 5 archivos. Verificado con screenshots en `/nosotros`, `/eventos`, `/datos-estadisticas`, `/noticias`, `/contacto`.

### 2026-06-25 — Iter29 — Fuente "Plane Crash" en Home v3 (corrección)
- Diagnóstico: el preview de Emergent strippea `<style>` y `<link>` custom de `index.html`. El `@font-face` se inyecta en runtime desde `src/index.js` (idempotente, `font-display: swap`).
- La fuente Plane Crash tiene los glifos de letras mapeados a las **minúsculas** (a-z) y los dígitos; mayúsculas y acentos caen a pictogramas decorativos.
- Helper `planeCrashSafe()` en `Home.jsx` normaliza (lowercase + strip diacríticos) antes de renderizar.
- Plane Crash aplicada únicamente a: hero `EDICION 2026`, `SOMOS MAS QUE UN TORNEO`, números de stats (`11 / +1k / +100 / +10k`), `FINALES`, `EL EJE CAFETERO LOS ESPERA`, `FESTIVAL`, `PREMIER`, footer heading `Y SI NOS / TOMAMOS / UN CAFECITO / JUNTOS?`, teléfono y email del footer.
- El logo "FUTUR SOCCER CUP", tagline cursivo "Torneo Internacional", navbar y subtítulos siguen con Anton/Allura/Barlow.
- Verificado con testing_agent_v3_fork (iter29.json) — 100% pass frontend, sin regresión en /login, /admin, /cotizar.

### 2026-06-22 — Iter27 — Módulo Fixture/Partidos/Resultados/Clasificación (Spec Final)
- Modelo `Venue` (canchas) + CRUD `/api/venues` (GET público, POST/PUT/DELETE solo admin).
- Componente `VenuePicker.jsx` con dropdown + modal inline "+ Crear nueva cancha", integrado en FixtureGenerator y AdminMatches.
- `FixtureGenerateIn.tournament_id` ahora OBLIGATORIO; el endpoint rechaza torneos archivados.
- `_round_robin_pairs(rounds_n)` soporta N vueltas (1, 2, …) con flip home/away por pasada.
- Modelo `Match.cards[].type` extendido con `'other'`; UI con 3 botones (Amarilla/Roja/Otra).
- `Tournament.categories[]` extendido con `points_win/draw/loss` y `fairplay_base/yellow/red/other`. UI por categoría en AdminTournaments (`CategoriesFeesEditor`).
- `_cat_config()` lee la config por categoría con defaults seguros (3/1/0 puntos, 200/10/20/5 J.L.).
- `GET /api/stats/standings` recalculada con:
  - J.L. = base − (#amarillas·desc_amarilla + #rojas·desc_roja + #otras·desc_otra).
  - Orden de desempate: PTOS → PG → GF → GC (menor) → DG → J.L.
- Nuevos endpoints PDF (solo Admin/DT/CT vía `_require_auth_for_pdf`):
  - `GET /tournaments/{tid}/fixture.pdf?category=&group=`
  - `GET /tournaments/{tid}/standings.pdf?category=&group=`
  - `GET /tournaments/{tid}/fairplay.pdf?category=&group=`
- UI nueva `AdminFixtureGenerator.jsx`: flujo guiado Paso 1 Evento (activos) → Paso 2 Categoría → Paso 3 Grupo + Vueltas + Canchas + Horarios.
- Barra `PdfExportBar` en `/admin/partidos` con selectores Evento/Categoría/Grupo y 3 botones de descarga.
- Páginas públicas `/fixture` y `/datos-estadisticas` sin botones de descarga.
- **Bug crítico pre-existente resuelto**: `POST /api/teams` estaba truncado (no insertaba ni retornaba). Ahora funcional.
- Cache global del logo FSC en memoria → PDFs ~3-4× más rápidos.

### Sesiones previas
- Carnets: COMET visible siempre (jugadores y staff); búsqueda por nombre/doc/COMET/dorsal/equipo; botón "Recargar". 
- Bug "Portero/Mediocampista" resuelto (default position).
- Admin ve TODOS los jugadores (corregido filtro que escondía 'pendiente').
- Roster PDF y Quote PDF: banners sin overlap, columnas con word-wrap.
- Director ve "Otros Cobros" del admin en `/mis-cotizaciones`.
- "PDF Roster" disponible para Director y CT en sus vistas de equipo.
- Helper `downloadPdf` robusto (anchor en DOM) para todos los botones PDF.

## Key API endpoints
- `GET/POST/PUT/DELETE /api/venues`
- `POST /api/fixtures/generate` (rounds, tournament_id obligatorio, no archivados)
- `GET /api/stats/standings?tournament_id=&category=&group_name=`
- `GET /api/tournaments/{tid}/{fixture|standings|fairplay}.pdf`
- `PUT /api/matches/{id}/result` con cards[].type ∈ {yellow,red,other}
- `GET /api/teams/{team_id}/roster.pdf`
- `GET /api/quotes/{qid}/pdf`

## Backlog (priorizado)
### P1
- Notificaciones por email (Resend) sobre aprobación/rechazo de equipos/jugadores/cotizaciones/pagos.

### P2
- Verificación de firma de Webhook de Stripe.
- Refactor de `server.py` (>5400 líneas) en `/app/backend/routes/`.
- Snapshot histórico automático al archivar evento (verificar que `historical_standings` se llena automáticamente).

### P3 (ideas)
- Bracket público "Camino al título" por evento.
- COMET único por jugador (validación backend).
- Badge "Pendiente aprobación" en carnets.

## Test credentials
Ver `/app/memory/test_credentials.md`.
