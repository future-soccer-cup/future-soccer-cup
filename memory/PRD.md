# Future Soccer Cup (FSC) – PRD

## Original Problem Statement
Aplicación versátil para una empresa que organiza eventos de fútbol infantil y juvenil. Necesita: fixture, carga de resultados de partidos por torneo, información de jugadores y equipos, posibilidad de cargar nuevos equipos y jugadores, estadísticas, módulo de solicitud de reservas (hoteles, transportes y tours) para las familias, y diseño de carnets a partir del logo del club FSC.

## User Choices (confirmed)
1. Roles: admin organizador + familias registradas + público sin login.
2. Login: JWT email/password (cookies httpOnly).
3. Reservas: solicitud sin pago en línea (organizador contacta luego).
4. Carnets: completos con foto, nombre, equipo, dorsal, categoría, fecha de nacimiento, doc, logo FSC y código QR.
5. Estadísticas: tabla de posiciones + goleadores.

## Architecture
- **Backend**: FastAPI + Motor (MongoDB). Auth con bcrypt + PyJWT (httpOnly cookies + Bearer fallback). Brute-force lockout. Seed de admin + inventario demo en startup.
- **Frontend**: React 19 + React Router 7 + Tailwind + shadcn/ui + sonner. Tipografía Barlow Condensed (display) + Manrope (body). Colores FSC #1d4ed8 azul + #dc2626 rojo. QR con `qrcode.react`.
- **Idioma UI**: Español.

## Personas
- **Organizador (admin)**: gestiona torneos, equipos, jugadores, partidos, resultados, inventario y reservas.
- **Familia**: registrada para reservar hoteles/transporte/tours y dar seguimiento.
- **Público**: ve fixture, posiciones, equipos y jugadores sin login.

## Implemented (2026-02)
- Auth JWT con admin seed (`admin@futuresoccercup.com / FSCAdmin2025!`), registro de familias, /me, refresh, logout, brute-force lockout.
- Equipos & jugadores: CRUD admin, listado y detalle público.
- Torneos & partidos: programación, edición de resultados con goleadores; status programado/en_curso/finalizado.
- Stats: standings (PJ-G-E-P-GF-GC-DG-PTS) y goleadores top.
- Inventario: hoteles, transportes, tours – CRUD admin, listado público (seed con 6 demos).
- Reservas: solicitud por familias, listado propio, gestión admin con estados pendiente/confirmada/cancelada.
- Carnets oficiales: tarjeta dark-mode con logo FSC, foto, dorsal, equipo, categoría, doc, fecha nac. y QR enlazando al perfil; vista individual e impresión masiva en `/admin/carnets`.
- Páginas públicas con diseño Swiss + Performance Pro (hero alto contraste, tablas densas, chips de filtros).

## Iteration 2 (2026-02-28)
- **Registro de equipos**: nuevo rol `team` con endpoint `/api/auth/register-team` que crea usuario + equipo en una sola llamada. Página `/registro-equipo`.
- **Dashboard de equipos** `/mi-equipo`: el responsable edita los datos de su club y administra (CRUD) sus jugadores. RBAC en backend (un team solo puede tocar su propio team_id y sus jugadores).
- **Categorías por edad** enforced: enum `[Sub-8, Sub-10, Sub-12, Sub-14, Sub-16, Sub-18]` con endpoint `/api/categories` y dropdown reutilizable `CategorySelect` en todos los formularios.
- **Subida de imágenes**: integración con Emergent Object Storage. Endpoint `/api/upload` (auth) + `/api/files/{path}` público para servir; componente `ImageUpload` reemplaza los inputs de URL en admin (equipos, jugadores, hoteles, transportes, tours) y en `/mi-equipo`. Foto de jugador, escudos y portadas de hoteles/transportes/tours ahora se cargan desde el dispositivo.
- **CORS**: ajustado a orígenes explícitos + cookies SameSite=None/Secure para soportar cross-origin con credenciales.

## Backlog (P0/P1/P2)
- **P1**: Recuperación de contraseña (forgot/reset).
- **P1**: Tarjetas (amarillas/rojas) y asistencias en partidos.
- **P2**: Notificaciones por email a familias y a equipos cuando cambia estado/fixture.
- **P2**: Pagos en línea (Stripe) para confirmar reservas automáticamente.
- **P2**: Vista de bracket (eliminación) automatizada para fases finales.
- **P2**: Cache-Control en `/api/files` para imágenes públicas.

## Iteration 3 (2026-04-29) — Fixture engine
- **Modelo extendido**: `Team.birth_year` (opcional, ej. 2014) y `Team.group_name` (Grupo A / Unigrupo); `Match.matchday` (jornada).
- **Juego Limpio (J.L)**: nuevo campo `home_fair_play` / `away_fair_play` en resultados; columna J.L en tabla pública con desempate Pts → DG → GF → J.L.
- **Generador automático de fixture** (`POST /api/fixtures/generate`): round-robin con método circle, alternancia local/visitante por jornada, soporte de número impar de equipos (DESCANSA por ronda), distribución cíclica de canchas y horarios. Modos preview / save.
- **UI nueva** (`/admin/generador-fixture`): elige categoría → filtra equipos → marca participantes → define inicio, días entre jornadas, lista de canchas y de horarios → vista previa con tabla de partidos + descansos por ronda → botón Guardar.
- **Filtro por jornada** en `/fixture` público (chips F1, F2, F3...).

## Iteration 4 (2026-04-30) — Workflows de aprobación + planilla completa
- **Aprobaciones**: equipos auto-registrados via `/api/auth/register-team` y jugadores agregados por team-managers nacen con `status="pendiente"`. Admin (con superusuario) tiene página `/admin/aprobaciones` con tabs Equipos/Jugadores + filtros por estado y botones Aprobar/Rechazar. Endpoints: `PUT /api/teams/{id}/status`, `PUT /api/players/{id}/status`.
- **Visibilidad pública**: `/api/teams` y `/api/players` (sin auth) solo retornan registros aprobados; el admin con `?status=` ve cualquier estado; team-managers ven sus propios pendientes.
- **Planilla extendida (jugador)**: agregados `nickname`, `gender`, `eps`, `guardian_name`, `guardian_doc`, `guardian_relation`, `guardian_phone` en formulario de "Mi equipo".
- **Planilla extendida (equipo)**: agregados `country`, `president`, `delegate_phone`, `cuerpo_tecnico` (JSON list).
- **Tarjetas amarilla/roja** en resultados de partidos: nuevo `CardsEditor` en modal de resultados; persistidas en `match.cards`. Nuevo endpoint `/api/stats/discipline` agrega tarjetas por jugador.
- **Banner de estado** en `/mi-equipo`: el equipo en estado pendiente ve un aviso amarillo de "En revisión".

## Iteration 5 (2026-04-30) — Carga masiva + Simon Guzman admin
- **Promoción**: `guzmangue@hotmail.com` (Simon Guzman) ahora tiene `role="admin"` (mantiene su contraseña previa).
- **Endpoints de import**:
  - `GET /api/import/template/{teams|players}` → descarga plantilla CSV con encabezados oficiales y fila de ejemplo.
  - `POST /api/import/teams?preview=true|false` (multipart `file`) → vista previa o guardado de equipos.
  - `POST /api/import/players?preview=true|false` → equivalente para jugadores; vincula por `team_name` (case-insensitive).
- Soporta `.csv` (UTF-8) y `.xlsx` (openpyxl). Tope 5MB. Registros importados nacen `status="aprobado"`.
- **UI**: `/admin/carga-masiva` con tabs Equipos/Jugadores, descarga de plantilla, picker de archivo, vista previa con stats (filas/OK/errores) y botón Confirmar.
- `requirements.txt`: agregados `openpyxl==3.1.5` y `xlrd==1.2.0`.

## Iteration 6 (2026-04-30) — Logo en registro + Cotización de evento
- **Logo durante registro de equipo**: `/registro-equipo` ahora tiene file picker con preview del escudo; al enviar, registra el equipo (auto-login) → sube la imagen a object storage → asocia logo_url al equipo → redirige a `/mi-equipo`.
- **Tipos de evento (3)**: `festival`, `premier_par`, `premier_impar`. Cada uno con sus categorías permitidas y fee de inscripción ($250 / $450 / $450). Endpoint `GET /api/event-types`.
- **Niveles de hospedaje**: Diamante / Gold / Silver / Bronce, con tarifas por tipo de habitación (single/double/triple/quadruple). Configurados en `LODGING_TIERS`.
- **Cotización**:
  - `POST /api/quotes/calculate` — estimación pública en vivo (sin guardar).
  - `POST /api/quotes` — crear cotización (auth requerida) con `status="pendiente"`.
  - `GET /api/quotes/mine` — historial del usuario.
  - `GET /api/quotes` — admin ve todas.
  - `PUT /api/quotes/{id}/status` — admin: pendiente/aprobada/rechazada/pagada.
  - `PUT /api/quotes/{id}/payment-proof` — adjuntar comprobante (owner o admin).
- **UI**:
  - `/cotizar` (público): wizard de pasos (Evento → Categoría → Hospedaje → PAX/Noches → Adicionales) con resumen lateral en vivo del total.
  - `/mis-cotizaciones`: historial del usuario con badges de estado.
  - `/admin/cotizaciones`: tabla con filtros y dropdown de estado.
  - `/mi-equipo` ahora tiene 2 CTAs: "Cotizar evento" y "Mis cotizaciones".
  - Navbar público: link "Cotizar".

## Iteration 7 (2026-04-30) — Stripe (COP) + Clubes + Limpieza
- **Moneda: COP (Pesos Colombianos)**. Tarifas del backend actualizadas:
  - Inscripción equipos: Festival $1.000.000, Premier Par/Impar $1.800.000.
  - Hospedaje per pax/noche: Diamante $720k-$400k; Gold $520k-$280k; Silver $380k-$200k; Bronce $240k-$130k.
  - Adicionales por pax: Transporte $100k, Parque $140k, Tour $110k.
- **Evento en registro del equipo**: `TeamRegisterIn.event_type` requerido. Al crear el equipo se guardan `event_type`, `registration_fee` y `registration_payment_status="pending"`. El registro **no se bloquea** por falta de pago — el responsable puede pagar después desde `/mi-equipo`.
- **Stripe Checkout (emergentintegrations)**:
  - `POST /api/payments/registration/session` — crea checkout para pagar la inscripción del equipo (COP).
  - `POST /api/payments/checkout/session` — crea checkout para pagar una cotización aprobada (COP).
  - `GET /api/payments/checkout/status/{sid}` — polling idempotente. kind=="registration" → `teams.registration_payment_status="paid"`; kind=="quote" → `quotes.status="pagada"`.
  - `POST /api/webhook/stripe` — transición idempotente.
  - Colección `payment_transactions` con `kind/session_id/amount/currency/payment_status`.
- **Frontend**:
  - `/registro-equipo`: bloque "Evento" con 3 cards (pricing COP) y filtro de categorías por evento.
  - `/mi-equipo`: banner Pagada/Pendiente + CTA "Pagar inscripción", CRUD de **Cuerpo técnico** (nombre, rol, documento, teléfono), CTAs a Cotizar / Mis cotizaciones.
  - `/mis-cotizaciones`: botón "Pagar" si `status=="aprobada"` y `payment_status!="paid"`.
  - `/pago-exitoso`: polling con kind + mensaje contextual.
  - `/equipos` (Clubes) → agrupación Club → Categorías (chips). `/clubes/:slug` (nuevo): detalle con secciones por categoría y plantillas.
  - Navbar limpio: eliminados Bookings/MyBookings/AdminBookings/AdminInventory. Admin side-nav agrega "Noticias".
  - Formato numérico es-CO en Cotizar, MyQuotes, MyTeam, AdminQuotes.

## Iteration 8 (2026-04-30) — Regresiones post-iter7
- **Bookings eliminado del backend**: removidos `BookingIn/BookingOut`, endpoints `POST/GET/PUT /api/bookings*`, e índice `db.bookings` en startup. Rutas ahora devuelven 404.
- **Stripe status resiliente**: `GET /api/payments/checkout/status/{sid}` con `try/except` devuelve `404 "Sesión de pago no encontrada o expirada"` en lugar de 500 si Stripe no encuentra la sesión.
- **Cotización ya pagada**: Reordenado el guard en `POST /api/payments/checkout/session` para que el check `status=='pagada' or payment_status=='paid'` corra ANTES del check de `aprobada`, garantizando el mensaje correcto.
- **UI copy**: `Login.jsx` actualizado "gestionar reservas" → "gestionar cotizaciones".

## Iteration 9 (2026-04-30) — Roles + Consent + Carga masiva DT + Inventario

- **Consent de datos**: nuevo campo obligatorio `data_consent` + `consent_at` en `users`. `/api/auth/register` y `/api/auth/register-team` devuelven 400 si no se acepta. UI con bloque `ConsentBlock` en ambos formularios.
- **Registro diferenciado por rol**: `/registro` ahora muestra selector "¿Cómo te registras?" (Director Técnico / Familiar). DT → redirige a `/registro-equipo`; Familiar → formulario inline con checkbox.
- **Carga masiva del DT (multi-hoja XLSX)**: endpoints `GET /api/team-roster/template` (descarga plantilla con hojas Jugadores + Cuerpo Técnico) y `POST /api/team-roster/import?preview=…` (auth team/admin). UI en `/mi-equipo` con preview (counts OK/errors) y botón confirmar.
- **Inventario admin recuperado**: `AdminInventory.jsx` re-creado con tabs Hoteles/Transportes/Tours, CRUD completo + `tier` + stars para hoteles. Ruta `/admin/inventario` y enlace en side-nav.
- **Integración inventario en Cotizar**: tiers genéricos mantenidos para estimación rápida; dentro del tier elegido aparecen los hoteles reales del inventario (filtrados por tier) para selección específica. Transportes y tours pickeables al activar el toggle correspondiente. Los picks se registran en `notes` de la cotización.

## Iteration 10 (2026-04-30) — Bugfix lote: Plantilla CSV + Carnets PDF

- **Plantilla CSV** disponible en `/mi-equipo` (botón "CSV" además de "XLSX"). Backend `POST /api/team-roster/import` ahora acepta `.xlsx` (multi-hoja) o `.csv` (jugadores). Generación de CSV en frontend (sin call al backend) → descarga inmediata.
- **Carnets PDF descargable** en `/admin/carnets` con `jspdf` + `html2canvas`. Botón "Descargar PDF" genera A4 con 8 carnets/página (2 columnas × 4 filas), respetando proporción y con QR de cada jugador. Incluye logo del club en el carnet (si está cargado). Backend ya filtraba a `status="aprobado"`.
- **Crear equipo**: validado E2E con Playwright — campos mínimos (manager, email, password, evento, nombre, categoría, consent) → redirige a `/mi-equipo` y muestra banner de inscripción pendiente con CTA Stripe.

## Iteration 11 (2026-05-14) — Sprint 3: Pagos Manuales con Abonos

- **Modelo `db.payments`**: `{id, target_type, target_id, amount, payment_date, method, receipt_url, reference, notes, user_id/email/name, status, admin_note, reviewed_at, created_at}` con índices compuestos `(target_type, target_id)`, `user_id`, `status`.
- **Estados de abono**: `sin_verificar` (inicial) · `aprobado` · `saldo_pendiente` · `rechazado`.
- **target_types**: `quote` y `team_registration` (extensible).
- **Endpoints**:
  - `POST /api/payments` — DT/admin registra abono con receipt_url.
  - `GET /api/payments/mine` — historial del DT.
  - `GET /api/payments/by-target?target_type=&target_id=` — listado + balance `{total, paid, balance}` (paid solo cuenta `aprobado`).
  - `GET /api/admin/payments?status=&target_type=` — admin lista con enrichment `target_label/target_total`.
  - `PUT /api/admin/payments/{pid}/status` body `{status, admin_note}` — admin aprueba/rechaza.
- **`_recompute_balance` idempotente**: al aprobar→ `payment_status=paid` y `status=pagada` (quote) o `registration_payment_status=paid` (team). Al rechazar un abono previamente aprobado de un target ya "pagado", revierte `status=aprobada` / `registration_payment_status=pending` y `$unset paid_at`/`registration_paid_at`.
- **`/api/upload` extendido**: ahora acepta `pdf` además de imágenes (jpg/jpeg/png/gif/webp) hasta 5MB.
- **Frontend**:
  - `/mis-cotizaciones`: toggle por cotización con panel de abonos (total/pagado/saldo), historial con badges + link al comprobante, botón "Registrar abono" abre `PaymentForm`. El botón "Pagar saldo con Stripe" sigue disponible para cotizaciones aprobadas.
  - `/mi-equipo`: banner de inscripción ahora tiene CTA "Abonos" con el mismo panel + form para registrar abono manual de la inscripción.
  - `/admin/pagos` (nueva): tabla con filtros por status y target_type, modal de revisión con vista previa del comprobante (PDF o imagen), botones Aprobar/Saldo pendiente/Rechazar + nota interna. Sidenav admin: nuevo ítem **Pagos**.
- **Componentes nuevos**: `FileUpload.jsx` (imagen/PDF), `PaymentForm.jsx`, `PaymentsList.jsx` + `PaymentStatusBadge`.
- **Tests**: `/app/backend/tests/test_iter10_manual_payments.py` (21/21 PASS). Cobertura: submit, mine, by-target, admin list+filtros, status updates, RBAC, /upload pdf, flujo E2E quote 30%+70%, team registration full pay, validación Pydantic.

## Iteration 12 (2026-05-14) — Sprint 4 (parcial): Paginación + Búsqueda en tablas admin

- **Componente reutilizable** `/app/frontend/src/components/PagedTable.jsx` con:
  - Hook `usePagedSearch(items, matchFn, pageSize=15)` — filtrado + paginación client-side; reinicia a página 1 cuando cambia la búsqueda; auto-clampea cuando los filtros reducen el dataset.
  - `<SearchBar>` con input + contador `filteredCount / totalCount`.
  - `<Pagination>` con prev/next + window deslizante de 5 páginas (no renderiza si `totalPages < 2`).
- **Aplicado a 5 tablas admin** (15 items/pág):
  - `/admin/aprobaciones` — busca por nombre, ciudad/equipo, categoría/dorsal según el tab activo (clubs/teams/players).
  - `/admin/equipos` — nombre, categoría, ciudad, DT, año.
  - `/admin/jugadores` — nombre, dorsal, documento, posición, equipo asociado.
  - `/admin/cotizaciones` — cliente, evento, categoría, hospedaje (combinable con filtro de estado).
  - `/admin/pagos` — DT, email, concepto, referencia, método, monto (combinable con filtro status + target_type).
- **Testids agregados**: `{prefix}-search-input`, `{prefix}-count`, `{prefix}-pagination`, `{prefix}-page-{n}`, `{prefix}-page-prev`, `{prefix}-page-next` (donde prefix ∈ teams/players/quotes/payments/approvals).
- **UX**: estado vacío diferenciado ("Sin resultados" cuando hay filtro activo vs. "Sin equipos"/etc. cuando el dataset está vacío).
- Smoke-test Playwright: contadores y filtros validados (3→1→0 con búsqueda 'cristiano', empty state, contador "1 / 3 resultados").

## Iteration 13 (2026-05-14) — Sprint 4: Export CSV en tablas admin

- **Nuevo componente** `/app/frontend/src/components/ExportCsvButton.jsx` + helpers `buildCsv` / `downloadCsv`:
  - CSV con BOM UTF-8 (Excel abre correctamente caracteres con tildes).
  - Escape RFC 4180 (quotes, comas, saltos de línea).
  - Filename con timestamp `{name}_{YYYY-MM-DD}.csv`.
  - Botón se deshabilita cuando no hay filas (rows = 0).
- **Hook `usePagedSearch` ahora expone `filtered`** (rows post-búsqueda, pre-paginación) además de `pageItems` — el export usa `filtered` para respetar la búsqueda activa y los filtros (status, target_type, tabs).
- **Aplicado a las 5 tablas admin** con columnas específicas por contexto:
  - **Equipos** — nombre, categoría, año, ciudad, DT, presidente, evento, fee inscripción, estado pago.
  - **Jugadores** — dorsal, nombre, equipo (joined), categoría, posición, documento, fecha nac., acudiente + tel.
  - **Cotizaciones** — cliente, evento, categoría, hospedaje, pax×noches, total, pagado, saldo, estado.
  - **Pagos** — fecha, DT, concepto, tipo, monto, método, referencia, estado, nota admin.
  - **Aprobaciones** — columnas dinámicas por tab activo (clubs/teams/players).
- **Testids agregados**: `{tabla}-export-csv` (`teams-export-csv`, `players-export-csv`, `quotes-export-csv`, `payments-export-csv`, `approvals-export-csv`).
- E2E validado: descarga de cotizaciones (13 filas, 1552 bytes), BOM presente, encoding correcto.

## Iteration 14 (2026-05-14) — Dashboard KPIs + Bracket eliminación directa

### Mini-dashboard `/admin`
- KPI cards principales (4): Clubes/Equipos/Jugadores aprobados con sub-stat de pendientes; Partidos jugados con sub-stat de programados/en curso.
- Sección Ingresos & Pagos (4 cards) + Operación (3 cards) + acciones rápidas + Pulso del torneo.

### Bracket eliminación directa
- Backend con seeding tenis-style, tamaños 4/8/16/32, auto-advance, 3er puesto opcional.
- Admin `/admin/bracket` (form + sembrado interactivo + preview).
- Público `/bracket` con árbol visual, banner de campeón, selector multi-bracket.

## Iteration 15 (2026-05-19) — Cotizar: paquetes oficiales (PDF VALORES PARA WEB)

Reescritura completa del módulo `/cotizar` con precios oficiales 2026:
- 6 paquetes (Sapphire, Diamond, Gold, Silver, Bronze, **Domicilio**) con tarifas POR PERSONA por 5 noches + valor por noche adicional, sin exponer nombres de hoteles.
- 3 opciones de alimentación (Desayuno/Almuerzo/**Cena**) por paquete; N/A se deshabilita visualmente.
- Inscripciones corregidas por año de nacimiento (Festival/Premier Par/Premier Impar).
- Transporte $16.000/persona, Parque del Café $99.000/persona.
- Limpieza de `room_type` y tier `esmerald` legacy en UI.

## Iteration 16 (2026-05-19) — Audit Trail (Ley 1581) + Validación de pagos manuales

Audit `_record_audit` aplicado a teams/players/clubs/quotes/payments status endpoints. Nuevo endpoint `GET /api/admin/audit-log`. Validación de `receipt_url` (regex `/api/files/...` o `https?://...`) y tope `amount ≤ saldo` con helper `_pending_balance` en `POST /api/payments`. 7 tests curl PASS.

## Iteration 17 (2026-05-19) — Code Quality (críticos del code review)

Fixes aplicados al reporte de code review: `status` no inicializado en `get_checkout_status`, stale closures en 9 páginas admin (refactor a `useCallback`), empty catches con logging+toast, array index keys reemplazados por `_uid` en AdminMatches y `document` en MyTeam staff, AuthContext memoizado, console.error de AdminCarnets wrappeado con NODE_ENV. Lint frontend 0 issues; smoke E2E OK.

## Iteration 18 (2026-05-19) — Inventario unificado con /cotizar (catálogo en MongoDB)**Problema:** `/admin/inventario` mostraba hoteles/transportes/tours demo desconectados del módulo `/cotizar` (que leía constantes Python hardcoded). Cualquier edición en inventario no afectaba las cotizaciones.

### Backend
- **Nueva colección `db.pricing_catalog`** con documentos `{id, type, name, ...}`:
  - `type="lodging"`: `{id, name, description, base_5_nights, additional_night, available, no_lodging, sort_order}`
  - `type="meal"`: `{id, name, per_day_by_tier: {sapphire, diamond, gold, silver, bronze, domicilio}}`
  - `type="transport"`: `{id, name, price}`
  - `type="tour"`: `{id, name, price}`
- **Seed automático en startup** desde las constantes Python (`LODGING_TIERS`, `MEAL_PLANS`, `TRANSPORT_ROUTES`, `TOURS_CATALOG`) — solo si la colección está vacía.
- **`seed_demo_inventory` borra las colecciones legacy** `db.hotels`, `db.transports`, `db.tours` al arrancar (limpieza solicitada por el usuario).
- **Endpoints `/api/hotels`, `/api/transports`, `/api/tours` removidos** (`_crud_endpoints` legacy).
- **Helper `_load_catalog()`** lee de Mongo y devuelve dicts con shape compatible con `LODGING_TIERS` etc.
- **`/api/event-types`** ahora retorna el catálogo desde Mongo (no constantes) → `/cotizar` refleja cambios en vivo.
- **`_calculate_quote(payload, catalog)`** acepta catálogo inyectado; `calculate_quote` y `create_quote` cargan catálogo antes de calcular.
- **CRUD admin (require_admin)**:
  - `GET /api/admin/catalog` → todos los rows
  - `POST /api/admin/catalog/{type}` → crear (auto-slug del nombre como id, sort_order = max+1)
  - `PUT /api/admin/catalog/{type}/{id}` → actualizar campos por tipo (validación Pydantic-like: floats ≥ 0, name no vacío)
  - `DELETE /api/admin/catalog/{type}/{id}` → eliminar
  - Cada operación registra entrada en `audit_log` (Ley 1581).
- **Índices**: `db.pricing_catalog.(type, id)` unique + `(type, sort_order)`.

### Frontend
- **`AdminInventory.jsx` reescrito** con 4 pestañas:
  - **Paquetes hospedaje** (6): grid de cards editables — nombre, descripción, base 5n, noche adicional, disponible, sin hospedaje.
  - **Comidas** (3 filas × 6 columnas tier): matriz inline editable, 0 = N/A.
  - **Transporte** (3): tabla con nombre + precio editable.
  - **Tours** (1+): tabla con nombre + precio editable.
- Cada fila tiene botón "Guardar" individual (controlled inputs) + "Eliminar".
- Modal "Nuevo paquete/transporte/tour" con auto-slug.
- Testids: `inv-tab-{type}`, `inv-lodging-{id}`, `inv-meal-{id}-{tier}`, `inv-{type}-{id}`, `inv-save-{type}-{id}`, `inv-delete-{type}-{id}`, `inv-add-{type}`, `inv-create-modal`.

### Verificación
- 10/10 tests curl: catálogo seeded correctamente con valores del PDF, evento-types refleja edición, cotizar recalcula con nuevo precio (Sapphire 1.32M → 1.4M cambia subtotal 5.28M → 5.6M), CRUD completo, RBAC, auto-slug (`"Panaca"` → id `panaca`).
- Smoke E2E Playwright: 4 pestañas renderizan, 19 inputs en lodging, 18 celdas en matriz comidas.


## Iteration 19 (2026-05-19) — Tanda C: Fixture doble jornada + edición manual de partidos

### Backend
- **`FixtureGenerateIn.double_matchday: bool = False`** (nuevo). Cuando es `True`:
  - `day_index = r_idx // 2` → jornadas pares e impares comparten la misma fecha.
  - `jornada_slot = slots[r_idx % len(slots)]` → jornada 1 usa slot[0] (mañana), jornada 2 usa slot[1] (tarde), jornada 3 slot[0], etc.
  - Cada equipo juega 2 veces el mismo día (mañana + tarde) — útil para torneos cortos.
- **Nuevo endpoint `PUT /api/matches/{mid}`** (admin only) con modelo `MatchUpdateIn`:
  - Campos opcionales: `match_date`, `venue`, `matchday` (gt=0), `group_name`, `stage` (Literal enum), `home_team_id`, `away_team_id`, `status` (Literal: programado/en_curso/finalizado/cancelado).
  - Validaciones: body vacío → 400; `match_date` no ISO → 400; id inexistente → 404; `home_team_id == away_team_id` validado contra documento final (mezcla DB + updates) → 400.
  - RBAC: solo admin (401/403 sin sesión válida / DT).
- **No afecta** `PUT /api/matches/{mid}/result` (sigue funcionando igual).

### Frontend
- **`/admin/generador-fixture`**:
  - Checkbox "Doble jornada (2 jornadas por día)" con testid `fg-double-matchday`.
  - Validación cliente: al activarse requiere ≥ 2 horarios; toast "Doble jornada requiere al menos 2 horarios" si no.
  - Envía `double_matchday` en el body de POST `/fixtures/generate`.
- **`/admin/partidos`**:
  - Nuevo botón `edit-match-{id}` (icono `CalendarClock`) en cada fila.
  - Modal `manual-edit-form` con datetime-local + cancha + jornada (`manual-edit-matchday`) + grupo + fase.
  - Submit `manual-edit-save` → `PUT /api/matches/{id}` → toast "Partido actualizado" → reload tabla.
  - Helper `toLocalInput(iso)` convierte ISO a formato `YYYY-MM-DDTHH:MM` para inputs datetime-local sin desplazar horas.

### Tests
- `/app/backend/tests/test_iter11_double_matchday.py` — **11/11 PASS**:
  - 3 tests doble jornada (true+2slots, true+1slot, false default).
  - 7 tests edición manual (full, vacío, fecha inválida, 404, sin auth, DT 403, home==away).
  - 1 test regresión PUT `/result`.
- Frontend Playwright validó: checkbox doble jornada, toast de validación, preview con jornadas alternadas mismo día, edición manual end-to-end con reflejo en tabla.

### Verificación E2E
- 3 equipos Sub-12 + double=true + slots `["10:00","15:00"]` → F1 día 1 10:00, F2 día 1 15:00, F3 día 2 10:00 ✓
- Editar partido: `matchday=9` + fecha=`2030-12-25T18:00` → persiste, toast OK, fila actualizada ✓

## Backlog actualizado (P1/P2)
- **P1**: Notificaciones email (Resend/SendGrid) en cambios de estado de teams/players/quotes/payments.
- **P2**: Stripe webhook signature verification.
- **P2**: Refactor `server.py` (>3250 líneas) → `/app/backend/routes/`.
- **P3**: Limpieza de matches huérfanos (home_team_id que ya no existen en `db.teams`).



### Backend
- **`server.py:2230` get_checkout_status**: inicializa `status = None` defensivo + chequeo `if status is None` antes de usar, evitando posible `NameError` si la integración Stripe lanza una excepción inusual sin lanzar `HTTPException`.

### Frontend — Stale closure fixes (`useCallback` + dependency-correct `useEffect`)
Refactor de `const load = () => ...; useEffect(() => load(), [])` a `const load = useCallback(...); useEffect(() => load(), [load])` en:
- `AdminTeams.jsx`, `AdminQuotes.jsx`, `AdminPlayers.jsx`, `AdminMatches.jsx`, `AdminPosts.jsx`, `AdminInventory.jsx`, `AdminApprovals.jsx`, `AdminPayments.jsx`, `AdminPasswordResets.jsx`.
- Elimina los comentarios `eslint-disable-next-line` previos. Las dependencias de `load` (statusFilter/targetFilter/tab/etc.) ahora son explícitas, evitando capturas obsoletas de estado.

### Frontend — Empty catches
- `MyQuotes.jsx loadPayments`: ahora loggea + toast "No se pudieron cargar los abonos".
- `MyTeam.jsx loadRegPayments`: igual.
- `TeamRegister.jsx` (logo upload): ahora muestra warning "El logo no se pudo subir. Podrás cargarlo más tarde".

### Frontend — Stable keys
- `AdminMatches.jsx`: `ScorersEditor` y `CardsEditor` ahora generan `_uid` (crypto.randomUUID) por fila al hacer "+ Agregar". Las keys usan ese uid en vez del index → al eliminar una fila intermedia React ya no reusa erróneamente el DOM ni el estado interno de selects/inputs.
- `MyTeam.jsx`: staff cards usan `key={s.document || ${s.name}-${idx}}` en lugar del index. Errores de bulk upload usan `prow-{row}-{i}` / `srow-{row}-{i}` (estables aunque la lista es read-only).
- Inputs primitivos en `AdminFixtureGenerator` (venues/horarios) y previews read-only en `AdminBulkUpload` quedan con index keys (decisión consciente: cambio costoso para el caso de uso).

### Frontend — Performance / React optimization
- `AuthContext.jsx`: `login`, `register`, `logout` ahora son `useCallback`; el `value` del provider está envuelto en `useMemo([user, loading, login, register, logout])`. Evita re-render en cascada de **todos** los consumidores de `useAuth()` cada vez que cualquier ancestro del provider se renderiza.
- `AdminCarnets.jsx`: `console.error` envuelto en `if (process.env.NODE_ENV !== "production")` para evitar fugas en producción.

### No aplicado (false positives o costo > beneficio)
- Comparaciones `is None` (líneas 1052/1071/1074): es la forma **correcta** en Python, no `is 0` literal. El reporte interpretó mal el patrón.
- Refactor de `create_bracket` / `_calculate_quote` / `register_team` / `Cotizar.jsx` / `MyTeam.jsx` por "alta complejidad": son funciones largas pero correctas; se factoriza más adelante en el refactor de routes (P2 Sprint dedicado).
- "Hardcoded secrets" en `tests/test_*.py`: son credenciales del seed de test conocidas, documentadas en `test_credentials.md`. No son secretos.

### Verificación
- Lint frontend (14 archivos modificados): 0 issues ✓
- Lint backend (server.py): solo style warnings pre-existentes (E701/E702), 0 errores funcionales nuevos ✓
- Smoke E2E: dashboard + 6 tablas admin (equipos, jugadores, cotizaciones, pagos, aprobaciones, partidos) renderizan correctamente; home pública OK ✓
- Backend audit + payment validation tests (iter 16) siguen pasando ✓



### Audit Trail (compliance Ley 1581 — Habeas Data Colombia)
- Helper `_record_audit(entity_type, entity_id, action, prev_status, new_status, user, note="")`:
  - Persiste entrada en `db.audit_log` con `id, entity_type, entity_id, action, previous_status, new_status, note, user_id/email/name, created_at`.
  - Devuelve `{reviewed_by_user_id, reviewed_by_email, reviewed_by_name, reviewed_at, reviewed_status[, reviewed_note]}` que se mergea al documento del recurso aprobado/rechazado.
- **Aplicado a 5 endpoints de cambio de estado** (todos require_admin):
  - `PUT /api/teams/{id}/status`
  - `PUT /api/players/{id}/status`
  - `PUT /api/clubs/{id}/status`
  - `PUT /api/quotes/{id}/status`
  - `PUT /api/admin/payments/{id}/status` (la nota admin se incluye en el log)
- Modelos `TeamOut`, `PlayerOut`, `ClubOut` extendidos con campos opcionales de audit para que el frontend pueda mostrar quién/cuándo aprobó.
- **Nuevo endpoint** `GET /api/admin/audit-log?entity_type=&entity_id=&limit=200` (admin only): consulta histórica filtrable.
- Índices: `db.audit_log` unique `id` + compound `(entity_type, entity_id)` + descending `created_at`.
- Frontend: modal de revisión de pagos `/admin/pagos` muestra banner "Última revisión: {status} por {nombre} · {fecha}" con `data-testid="payment-audit-info"`.

### Validación de POST /api/payments
- **`receipt_url` obligatorio y validado** con regex `^(/api/files/[A-Za-z0-9._\-/]+|https?://[^\s]+)$`:
  - Vacío → 400 "Debes adjuntar el comprobante de pago".
  - Schemes inseguros (ej. `javascript:`) → 400 "receipt_url inválido".
  - Acepta `/api/files/...` (uploads internos) y URLs `http(s)://...`.
- **Tope `amount ≤ saldo`** via nuevo helper `_pending_balance(target_type, target_id)`:
  - Calcula `remaining = total - aprobados - en_revisión(sin_verificar+saldo_pendiente)`.
  - Si `remaining <= 0`: 400 "El target ya cubre su valor con abonos aprobados o en revisión".
  - Si `amount > remaining + 0.5`: 400 con mensaje detallado de aprobado/en revisión/saldo (formato COP).
  - Evita que DT envíe múltiples abonos pendientes que en conjunto superen el total.

### Tests E2E (curl)
- Audit: 3 cambios consecutivos → 3 entradas en `audit_log` con previous_status/new_status correctos ✓
- Audit incluido en respuesta de `GET /teams/{id}` (`reviewed_by_email`) ✓
- Pagos audit con `note="Verificado"` persiste correctamente ✓
- Receipt vacío/inválido/`javascript:` → 400; `/api/files/x.png` y `https://...` → 200 ✓
- Amount > saldo bloqueado con mensaje "excede el saldo disponible (1.900.000 COP)" ✓
- Saturación pendiente bloquea siguientes envíos ✓
- DT no puede leer `/admin/audit-log` → 403 ✓


**Cambio mayor solicitado por usuario**: en `/cotizar` no se exponen nombres de hoteles, solo paquetes. Precios alineados al PDF oficial 2026.

### Backend
- **`EVENT_TYPES.fees_by_year`** actualizado a precios oficiales:
  - Festival (Octubre): 2013–2014 = $2.400.000; 2015–2018 = $2.300.000.
  - Premier Par (Diciembre): 2010, 2012 = $3.200.000; 2014 = $2.800.000; 2016, 2018 = $2.600.000.
  - Premier Impar (Diciembre): 2009, 2011 = $3.200.000; 2013 = $2.800.000; 2015, 2017 = $2.600.000.
- **`LODGING_TIERS` simplificado** a 6 paquetes con tarifa única POR PERSONA (sin diferenciar tipo de habitación):
  - Sapphire $1.320.000 (5n) + $264.000 noche adicional
  - Diamond $1.280.000 + $256.000
  - Gold $1.130.000 + $226.000
  - Silver $960.000 + $192.000
  - Bronze $800.000 + $160.000
  - Domicilio $0 (alojamiento propio; solo opcional para alimentación/tours/transporte)
- **`MEAL_PLANS` por paquete** (POR PERSONA × día), incluyendo nuevo plan **Cena**. Valores 0 indican "No disponible" (ej.: Silver no incluye almuerzo).
- **`TRANSPORT_ROUTES`**: 3 rutas a $16.000/persona (aeropuerto↔hotel, hotel↔canchas).
- **`TOURS_CATALOG`**: solo Parque del Café a $99.000/persona (Panaca removido por no estar en el PDF).
- **`QuoteIn`** updated: removido `esmerald` y `room_type` (legacy, ahora opcional); agregado `domicilio` y `includes_dinner`.
- **`_calculate_quote`** reescrito:
  - Lodging = `(base_5n + additional_night × max(0, nights-5)) × pax`.
  - Meals = `(breakfast + lunch + dinner_per_day_for_tier) × pax × meal_days` (0 si N/A).
  - Transport y tours suman por persona × pax para los IDs seleccionados.
  - Inscripción = `fees_by_year[birth_year]` con fallback a `registration_fee_per_team`.
- Retorna además `rate_per_person_total`, `extra_nights`, `dinner_subtotal` para UI.

### Frontend
- **`Cotizar.jsx`** reescrito:
  - Tarjetas de paquetes muestran "5 noches: $X" + "Noche adicional: $Y" (sin nombres de hoteles).
  - Domicilio incluye nota "Sin hospedaje (alojamiento propio). Solo alimentación si la añades." y deshabilita el input de noches.
  - Sección Alimentación con 3 opciones (Desayuno/Almuerzo/Cena) — cada checkbox se deshabilita visualmente cuando el paquete activo no ofrece esa comida ("No disponible en este paquete").
  - Resumen lateral muestra: Tarifa/pax, noches extra (cuando aplica), hospedaje, desayunos, almuerzos, **cenas**, transporte (con conteo de rutas), tours, inscripción.
  - Testid `cotizar-total` para validación E2E.
- **`MyQuotes.jsx`** y **`AdminQuotes.jsx`**: removido `· room_type` legacy del display de cotizaciones.

### Verificación E2E
- Sapphire + Premier Par 2014 + 4 pax + 5n + 3 comidas + 3 transportes + parque = **$11.092.000** (backend curl + frontend live recalculation coinciden).
- Domicilio = $5.092.000 (mismo paquete, sin hospedaje).
- Silver desactiva almuerzo automáticamente.
- Backend lint: ✓, frontend lint: ✓.


### Mini-dashboard `/admin`
- KPI cards principales (4): Clubes/Equipos/Jugadores aprobados con sub-stat de pendientes; Partidos jugados con sub-stat de programados/en curso.
- Sección **Ingresos & Pagos** (4 cards): COP totales históricos, COP del mes, abonos por revisar (link a `/admin/pagos`), cotizaciones pagadas con facturado total.
- Sección **Operación** (3 cards): cotizaciones pendientes, aprobaciones pendientes (clubes+equipos+jugadores), total clubes inscritos.
- Acciones rápidas: revisar aprobaciones, validar abonos, generar fixture, cotizaciones, carnets, noticias.
- Panel "Pulso del torneo": resumen ejecutivo en texto.
- Testids: `kpi-{nombre}`, `dash-quick-actions`.

### Bracket eliminación directa (Sprint 4)
**Backend** (`/api/brackets`):
- Modelo `bracket`: `{id, name, category, size (4/8/16/32), team_ids (en orden de siembra), include_third_place, total_rounds, status}`.
- Endpoints: `GET /api/brackets`, `GET /api/brackets/{id}` (con enriquecimiento de nombres + logos), `POST /api/brackets` (preview o save), `DELETE /api/brackets/{id}` (admin only).
- **Seeding estándar de tenis**: `_bracket_seed_order(n)` recursivo → (1v8)(4v5)(2v7)(3v6) para 8, escala a 16/32.
- Genera partidos como documentos en `db.matches` con `bracket_id`, `bracket_round`, `bracket_position`, `next_match_id`, `next_match_slot`, `is_third_place`, `loser_next_match_id/slot` (para alimentar 3er puesto).
- **Auto-advance del ganador**: `PUT /api/matches/{id}/result` ahora propaga winner al siguiente match (next_match_id + slot home/away) y loser al match de 3er puesto cuando aplica.
- `MatchResultIn.winner_team_id` opcional → resuelve empates en bracket (sin él, los empates no avanzan, permitiendo re-PUT con winner definido por penales).
- Validaciones: tamaño en `{4,8,16,32}`, len(team_ids)==size, no duplicados, equipos existen, fecha válida.
- Índices nuevos: `db.brackets.id` (unique), `db.matches.bracket_id`.

**Frontend admin** `/admin/bracket`:
- Form: nombre, categoría, tamaño (4/8/16/32), fecha 1ª ronda, días entre rondas, canchas, horarios, toggle 3er puesto.
- Sembrado interactivo: panel "Equipos disponibles" (filtrado por categoría + aprobados, excluye ya sembrados) → click agrega como semilla; reordenar con flechas ▲▼; quitar con ✕; contador "X/N".
- Vista previa antes de guardar (lista de partidos generados).
- Listado de brackets existentes con CTA Ver/Eliminar.
- Sidenav admin: ítem **Bracket** (icono Trophy).

**Frontend público** `/bracket`:
- Árbol horizontal con columnas por ronda, espaciado vertical exponencial (2^(r-1)) para alinear cruces.
- Cada match-card: 2 lados (logo + nombre + score), ganador en verde, "Por definir" en italic cuando el slot aún no tiene equipo.
- Banner de **Campeón** cuando la final está finalizada.
- Sección dedicada al 3er puesto cuando aplica.
- Selector entre múltiples brackets si existen (`?id=` en query).
- Link "Bracket" agregado al Navbar público.

**Tests** (manuales con curl, todos PASS):
- Seeding 8 equipos: pairings 1v8, 4v5, 2v7, 3v6 ✓
- Generación R1 (4 matches) + SF (2) + Final (1) + 3er puesto (1) = 8 matches ✓
- Auto-advance home win: R1.home → SF.home slot ✓
- Auto-advance away win: R1.away → SF.away slot ✓
- 3er puesto recibe perdedores de SF ✓
- Empate sin `winner_team_id` → no avanza ✓
- Empate con `winner_team_id` → avanza ganador especificado ✓
- Validación tamaño/duplicados → 400 ✓


## Backlog actualizado (P1/P2)
- **P2**: Notificaciones email (Resend/SendGrid) en cambios de estado.
- **P2**: Stripe webhook signature verification.
- **P3**: Validar `receipt_url` (formato `/api/files/...`) y tope de `amount` ≤ balance pendiente en `POST /api/payments`.
- **P3**: Audit trail en `/admin/payments/{id}/status` (guardar `reviewed_by_user_id/email`).


## Last Test Run
- iteration_8: 13 regresiones (11 PASS + 1 skip + 1 fail re-fijado). HIGH #1 (500→404) ✅; HIGH #2 (bookings eliminados) ✅; HIGH #3 (dead-code rama "ya pagada") ✅ tras reordenar los checks (validado con curl).
- **Moneda: COP (Pesos Colombianos)**. Tarifas del backend actualizadas:
  - Inscripción equipos: Festival $1.000.000, Premier Par/Impar $1.800.000.
  - Hospedaje per pax/noche: Diamante $720k-$400k; Gold $520k-$280k; Silver $380k-$200k; Bronce $240k-$130k.
  - Adicionales por pax: Transporte $100k, Parque $140k, Tour $110k.
- **Evento en registro del equipo**: `TeamRegisterIn.event_type` requerido. Al crear el equipo se guardan `event_type`, `registration_fee` y `registration_payment_status="pending"`. El registro **no se bloquea** por falta de pago — el responsable puede pagar después desde `/mi-equipo`.
- **Stripe Checkout (emergentintegrations)**:
  - `POST /api/payments/registration/session` — crea checkout para pagar la inscripción del equipo (COP).
  - `POST /api/payments/checkout/session` — crea checkout para pagar una cotización aprobada (COP).
  - `GET /api/payments/checkout/status/{sid}` — polling idempotente. Al `payment_status=="paid"`:
    - `kind=="registration"` → `teams.registration_payment_status="paid"`.
    - `kind=="quote"` → `quotes.status="pagada"`.
  - `POST /api/webhook/stripe` — también aplica la transición idempotente.
  - Colección `payment_transactions` guarda `kind`, `session_id`, `amount`, `currency`, `payment_status`.
- **Frontend**:
  - `/registro-equipo`: bloque "Evento" con 3 cards (pricing COP) y filtro de categorías por evento.
  - `/mi-equipo`: banner de inscripción (Pagada/Pendiente) con CTA "Pagar inscripción", sección de **Cuerpo técnico** CRUD (nombre, rol, documento, teléfono) y CTAs a Cotizar / Mis cotizaciones.
  - `/mis-cotizaciones`: botón "Pagar" visible solo si `status=="aprobada"` y `payment_status!="paid"`; redirige a Stripe.
  - `/pago-exitoso`: polling con kind (registration/quote) y mensaje contextual.
  - `/equipos` → `/clubes`: agrupación Club → Categorías; card de club muestra chips de categorías y cuenta de equipos.
  - `/clubes/:slug` (nuevo): detalle del club con secciones por categoría y plantillas.
  - Navbar y rutas limpias: eliminados Bookings, MyBookings, AdminBookings, AdminInventory.
  - Rutas admin: agregada `/admin/noticias` (AdminPosts ya existente).
  - Formato numérico es-CO en Cotizar, MyQuotes, MyTeam y AdminQuotes.


## Iteration 20 (2026-05-20) — Tanda D: Datos y Estadísticas + Tournaments CRUD + Intergrupos

### Backend
- **Tie-breaker corregido** (`/api/stats/standings`): orden ahora **Pts → Fair Play → DG → GF** (FP es el PRIMER criterio de desempate por reglamento FSC).
- **Modelo `Tournament` extendido**: `event_type` (festival/premier_par/premier_impar), `fmt` (round_robin/cuadrangular_x2/eliminacion), `archived` (bool). Backfill de defaults en `GET /api/tournaments`.
- **Nuevo endpoint** `PUT /api/tournaments/{tid}` con `TournamentUpdateIn` para actualización parcial.
- **`MatchIn.match_type`** ahora es `Literal["regular", "intergrupo"]` (default "regular"). `MatchUpdateIn` también lo acepta.
- **Nuevo endpoint `POST /api/fixtures/intergroup`**: genera N partidos cruzados entre 2 grupos. Pairing `standings`/`seed`/`random`. Valida `group_a != group_b`, grupos no vacíos, fecha YYYY-MM-DD, RBAC admin.
- **Nueva colección `db.historical_standings`** + endpoints `GET /api/historical/standings`, `POST /api/historical/standings` (bulk), `DELETE /api/historical/standings?tournament_id=`.
- **Nuevo endpoint `GET /api/import/matches-template`** (admin): descarga plantilla XLSX con hoja "Partidos" y 14 columnas estándar.
- **Script `scripts/import_historical_dic2025.py`**: parsea `FIXTURE DICIEMBRE 2025 IMPARES.xls`, carga **210 standings** como torneo archivado "Diciembre 2025 Impares (Histórico)".

### Frontend
- **`/datos-estadisticas`** (público nuevo): selector de torneo (activos + archivados con `[Hist]`), tabs Posiciones/Fixture/Goleadores. Snapshot histórico para archivados, live para activos.
- **`/admin/torneos`** (nuevo): CRUD completo + botón "Plantilla partidos (XLSX)".
- **Modal sorteo intergrupos** en `/admin/partidos` (botón "Sortear intergrupos").
- **Home rediseñada**: hero más profesional, barra DT, sección Plataforma, reglamento + 4 pills, CTA exclusivo DTs (sin "Crear cuenta familiar").
- **Navbar**: nuevo link "Datos" → `/datos-estadisticas`.
- **Admin sidenav**: nuevo link "Torneos" → `/admin/torneos`.
- **`Standings.jsx`**: footnote "Desempate: Puntos → Juego Limpio (J.L) → Diferencia de gol → Goles a favor".

### Verificación
- Backend: `test_iter12_tanda_d.py` **20/20 PASS** (en DB limpia) + iter11 regression 11/11.
- Frontend Playwright: Home, Navbar, /datos-estadisticas, /posiciones, tie-breaker visual confirmado. Admin UI verificado por grep de testids.
- Fixes post-test: `group_a != group_b` → 400; hidratación `<option>` resuelta (texto plano `[Hist]`).

## Backlog actualizado (P1/P2/P3)
- **P1**: Notificaciones email (Resend/SendGrid) en cambios de estado.
- **P2**: Stripe webhook signature verification.
- **P2**: Refactor `server.py` (>3490 líneas) → `/app/backend/routes/`.
- **P3**: POST /api/historical/standings — revisar `gd = gf - ga if gd == 0 else gd` (impide registrar GD=0 real).
- **P3**: DELETE /api/historical/standings — validar existencia del torneo (404 vs {deleted:0}).
- **P3**: GET /api/import/matches-template — mover imports de openpyxl al top-level.
- **P3**: Tests iter11/iter12 no idempotentes — implementar cleanup en fixtures.
- **P3**: Implementar POST /api/import/matches para importación masiva desde la plantilla estándar.

## Iteration 21 (2026-05-21) — Tanda E: Carnets con selección por checkbox + reuso DT

### Frontend
- **Componente reutilizable `CarnetSheet.jsx`** (`/app/frontend/src/components/CarnetSheet.jsx`):
  - Props: `players`, `teams`, `lockedTeamId` (oculta selector de equipo y filtra automáticamente), `title`, `testIdPrefix`.
  - Checkbox de selección por carnet (siempre visible) + ring azul cuando seleccionado.
  - Barra azul de selección con "Seleccionar todos / Quitar selección" + contador "X de N seleccionados" + botón "limpiar".
  - Botones: "Descargar selección (N)" (PDF batch solo con seleccionados) + "Descargar todos" (lote completo) + "Vista impresión" + descarga individual al hover.
  - Selección se limpia automáticamente al cambiar de tab (jugadores ↔ staff) o de filtro de equipo.
- **`/admin/carnets`**: refactorizado a thin wrapper de `CarnetSheet` con `testIdPrefix="carnet"` (admin ve todos los jugadores aprobados + selector de equipo).
- **`/mi-equipo`**: nueva sección "Carnets del equipo" usando `CarnetSheet` con `lockedTeamId={teamId}` y `testIdPrefix="myteam-carnet"`. El DT solo ve los jugadores aprobados de SU equipo, sin selector de equipo.

### Verificación
- `/app/test_reports/iteration_13.json` — **100% PASS** (frontend Playwright).
- Confirmado: admin ve 6 jugadores → filtra a 3 con club; DT ve exactamente 3 jugadores propios; lockedTeamId oculta filter; toggle-all marca/desmarca todos; selección se limpia al cambiar tab/filter; "Descargar selección" deshabilitado con 0 seleccionados.
- No regresiones en testids legacy (`admin-carnets`, `carnet-pdf-btn`, `carnet-search`, `carnet-individual-*`).


## Iteration 22 (2026-05-28) — Tanda F: Identidad visual FSC + Home redesign + Cotizaciones esenciales (PDF Requerimientos v3)

### Identidad visual (FSC_IdentidadVisual_v1)
- Paleta: **Negro #1A1A1A / Dorado #C9A227 / Rojo #B51519 / Azul Noche #0A0A28**.
- Fuentes: **Bebas Neue** (display), **Montserrat** (body), **Dancing Script** (cursive accent).
- Tokens CSS en `/app/frontend/src/index.css` (`--fsc-negro`, `--fsc-dorado`, etc.) + `tailwind.config.js` con `fsc.*` palette y `font-{display,body,cursive}`.
- Botones renovados: `.fsc-btn-primary` (dorado), `.fsc-btn-red`, `.fsc-btn-dark` (negro con borde dorado). Shadow estilo "neobrutalist" (4px+4px en negro).

### Home rediseñado (FSC_Requerimientos_Emergent_v3)
- Hero negro con grain + stripe + ticker dorado scrolleable "FUTURE SOCCER CUP · SOMOS MÁS QUE UN TORNEO".
- Sección "Próximo Evento (Premier)": muestra el torneo `featured=true` o los datos estáticos del `home_settings.upcoming_*`.
- Sección "Nosotros" con imagen + texto editable desde admin.
- Sección "Eventos" con tarjetas dinámicas de los torneos activos.
- Sección "Galería" con carrusel editable.
- Footer dorado con tagline cursive "Somos más que un torneo" + redes sociales.
- Navbar **fijo** con menú: Inicio · Nosotros · Eventos · Contacto + dropdown "Plataforma" (Fixture/Bracket/Datos/Posiciones/Clubes/Jugadores/Noticias/Cotizar) + Ingresar/Registrarse.

### Nuevas páginas públicas
- `/nosotros` (`Nosotros.jsx`) con misión y bloque contacto.
- `/eventos` (`Eventos.jsx`) — torneos vigentes + archivo histórico.
- `/contacto` (`Contacto.jsx`) con redes y CTA.

### Backend nuevo
- **Tournament extendido**: `featured`, `city`, `venue`, `cover_url` (backfill defaults en GET).
- **`POST/PUT/DELETE /api/gallery`** + `GET /api/gallery` (público) — colección `gallery_images`.
- **`GET/PUT /api/home-settings`** — colección `home_settings` (singleton). Public GET, admin-only PUT.
- **`QuoteIn.extra_pax_entries`**: lista `{label, pax, nights}` para acompañantes con noches distintas. `_calculate_quote` suma `extra_pax_subtotal` (con `extra_pax_breakdown` por entry) al `lodging_subtotal`. Tier sin hospedaje (domicilio) → 0.
- **`PUT /api/quotes/{qid}`** (nuevo): solo dueño o admin. Cualquier edición vuelve status a "pendiente" (re-aprobación). Owner no puede editar cotizaciones "pagada"; admin sí.
- **`GET /api/quotes/{qid}`** (nuevo): cualquier usuario autenticado puede ver detalles.

### Cotizaciones esenciales (PDF)
- ❌ Eliminado campo "Días para comidas adicionales" (`meal_days` ya no se expone en UI).
- ✅ Editor "Personas adicionales con noches distintas" (`extra-pax-editor`) en paso 2.
- ✅ Botón "Editar cotización" en `/mis-cotizaciones` para todas las quotes no pagadas → abre `/cotizar?id={qid}` y al guardar llama `PUT /api/quotes/{id}`.
- ✅ Detalles de cotización accesibles para CUALQUIER usuario autenticado (GET por id).

### Login / Registro rediseñados
- `Login.jsx`: layout 5-col (panel decorativo + form), paleta dorada, iconos en inputs, links "Volver al inicio" y "Registrar mi club".
- `TeamRegister.jsx`: paleta dorada aplicada; campos eliminados: `club_email`, `club_website`, `club_country` (default Colombia oculto en estado). Sidebar resumen ahora con borde dorado.

### Admin nuevo
- `/admin/galeria` (`AdminGallery.jsx`): CRUD completo de imágenes con preview, título, caption, sort_order.
- `/admin/home` (`AdminHomeSettings.jsx`): editor de hero, próximo evento, nosotros y contacto/redes con secciones.
- `/admin/torneos`: nuevo toggle "destacado" (estrella) + campos ciudad/sede/cover_url al editar.

### Verificación
- `/app/test_reports/iteration_14.json` — **Backend 29/29 PASS · Frontend 100% testids verified**.
- Regresiones intactas: iter11/12/13.
- Fonts cargando: Bebas+Neue + Montserrat + Dancing+Script en `<link>` de index.html.

## Backlog actualizado (P0/P1/P2)
- **P0 (siguiente tanda)**: Separar roles `president` (cotiza+paga) y `team_manager` (DT — inscribe jugadores). Hoy ambos roles están fusionados en `team`. Cambio invasivo a auth/RBAC.
- **P0**: Inscripciones — permitir múltiples categorías por club + edición post-guardado + múltiples servicios con cantidades y fechas (PDF p. 6-7).
- **P1**: Notificaciones email (Resend/SendGrid) en cambios de estado.
- **P1**: Slider del Hero editable (hoy es imagen única; el PDF pide carrusel).
- **P2**: Logos de aliados en Footer.
- **P2**: Stripe webhook signature verification.
- **P2**: Refactor `server.py` (>3676 líneas) — testing agent también lo señaló.
- **P3**: Sort_order de gallery con drag-and-drop nativo.


## Iteration 23 (2026-05-28) — Tanda G: Refinamiento UI/UX según feedback usuario

### Navbar simplificado
- ❌ Eliminado dropdown "Plataforma" (con sus 8 links secundarios).
- ✅ Menú principal: **INICIO · NOSOTROS · EVENTOS · ESTADÍSTICAS · NOTICIAS · CONTACTO** + INGRESAR + REGISTRARSE.
- Logo navbar ahora renderiza correctamente (border dorado + Logo SVG inline).

### Registro DT (`/registro-equipo`)
- ❌ Eliminada sección "Primer equipo a registrar" (campos birth_year, designation pasan al panel post-aprobación).
- ✅ Toast: "Club registrado. Espera la aprobación del administrador para acceder al panel."
- Sidebar resumen ya no muestra inscripción (queda al flujo post-aprobación admin).

### Login (`/login`)
- ✅ Layout **flip**: formulario a la izquierda + panel decorativo a la derecha.
- Implementado con flexbox `lg:flex-row` + `flex-[3] / flex-[2]` (más confiable que grid + col-span).

### Cotizar (`/cotizar`)
- **Personas adicionales (`extra-pax-editor`)**: ahora 5 columnas — Etiqueta, **Cantidad** (no "pax"), Noches, **Desde** (fecha), **Hasta** (fecha).
- **Alimentación**: el editor avanzado `meal_entries` (fecha + tipo + personas) ahora se muestra SIEMPRE (no solo en domicilio). Banner amber recuerda paquete incluido (5 desayunos / 4 almuerzos / 5 cenas).
- **Transporte**: nuevo editor `transport-entries` con filas {ruta, cantidad, fecha} y botón "Agregar transporte". Reemplaza el grid de checkboxes anterior. Mantiene compat con `transport_routes` legacy.
- **Resumen sidebar**:
  - Renderiza SIEMPRE (no condicional), con $0 hasta que el usuario interactúa.
  - Flag `userTouched` + wrapper `setFormUser` evita cálculo hasta el primer cambio.
  - Botón "Enviar cotización" deshabilitado cuando `total_amount === 0`.

### Backend
- **`QuoteIn.transport_entries`**: nuevo campo `List[{route_id, pax, date}]`.
- `_calculate_quote`: si `transport_entries` está presente, calcula `sum(price × qty)` por entry y devuelve `transport_entries_breakdown` además del `transport_subtotal` y `transport_routes_applied` (uniques). Compatible con flujo legacy `transport_routes`.

### AdminQuotes — Detalle expandido
- Nuevo botón `view-quote-{id}` (icono Eye) en cada fila.
- Modal `quote-detail-modal` con:
  - Grid de datos (estado, evento, categoría, año, pax, noches, hospedaje, teléfono).
  - Resumen económico (KV grid: tarifa/pax, hospedaje, adicionales, alimentación, transporte, tours, inscripción, **TOTAL** resaltado en rojo).
  - Tabla "Personas adicionales" con `extra_pax_breakdown`.
  - Tabla "Alimentación adicional" con `meal_entries` (fecha, tipo, personas).
  - Tabla "Transporte" con `transport_entries_breakdown` (ruta, personas, fecha, subtotal) — fallback a `transport_routes_applied` si no hay entries detalladas.
  - Tabla "Tours" con `tour_entries`.
  - Notas.
- Botón cerrar `quote-detail-close`.

### Verificación
- `/app/test_reports/iteration_15.json` — **6/6 nuevos backend PASS · 29/29 regresión PASS · 8/8 frontend flows verified**.
- Login flip confirmado: `main.x < aside.x` con bounding boxes.

## Backlog actualizado (P0/P1/P2/P3)
- 🔴 **P0** — **Separar roles `president` (cotiza+paga) y `team_manager` (DT — inscribe jugadores)**. Flujo del PDF:
  1. DT se registra y SELECCIONA su club (existente).
  2. Sistema notifica al admin.
  3. Admin aprueba/rechaza.
  4. Aprobado → DT accede al panel técnico.
  5. DT registra cuerpo técnico (nombre, rol, doc) por evento y categoría.
  6. DT registra jugadores (nombre, posición, doc, fnac) por categoría inscrita.
  7. Sistema valida edad vs categoría.
- 🔴 **P0** — **Cotizar evento+múltiples categorías**: selector de evento abierto + checkbox múltiple de categorías inscritas.
- 🔴 **P0** — Admin CRUD masivo de paquetes/tours/transporte/alimentación (parcial: `/admin/inventario` ya existe; falta validar ergonomía y agregar campos faltantes).
- 🟡 **P1** — Notificaciones email (Resend/SendGrid) — incluiría el "Sistema notifica al admin" del flujo DT.
- 🟡 **P1** — Slider del Hero editable (carrusel).
- 🟢 **P2** — Logos de aliados en footer + Testimonios.
- 🟢 **P2** — Stripe webhook signature verification.
- 🟢 **P2** — Refactor `server.py` (>3700 líneas) → `/app/backend/routes/`.
- 🟢 **P3** — Gallery drag-and-drop, importación masiva XLSX de matches.



## Iteration 24 (2026-05-28) — Clasificación de Paquetes + Contact + Categorías Inscritas

### Backend (`server.py`)
- **`_validate_catalog_row` extendido**:
  - `lodging`: ahora acepta `classification` (string opcional, auto-upper) y `accommodation_type` (Múltiple/Triple/Doble, free-text).
  - `meal`: ahora acepta `classification` (auto-upper). `description` ya existía vía bloque común.
- **`TournamentIn.categories`**: lista `[{name, fee}]` para inscripciones diferenciadas por categoría dentro del mismo evento (ya estaba modelado; ahora con UI conectada).
- **Contact messages** (`/api/contact-messages`): POST público + GET/PUT/DELETE admin. Sin cambios en este sprint.

### Frontend
- **`/admin/inventario`** (Paquetes):
  - `LodgingTab`: nuevos selects "Clasificación" (ESMERALD/SAPPHIRE/DIAMOND/GOLD/SILVER/BRONZE) y "Acomodación" (Múltiple/Triple/Doble) por paquete; persistidos en PUT `/admin/catalog/lodging/{id}`.
  - `MealTab`: nueva columna "Clasificación" para etiquetar cada comida.
  - `CreateModal`: incluye los nuevos campos cuando se crea un paquete de hospedaje (`inv-new-classification`, `inv-new-accommodation`).
- **`/admin/eventos`**: `CategoriesFeesEditor` integrado al modal de creación/edición — permite definir N categorías con su fee de inscripción independiente.

### Testids agregados
- `inv-lodging-class-{id}`, `inv-lodging-acc-{id}`, `inv-meal-class-{id}`, `inv-new-classification`, `inv-new-accommodation`.
- `categories-fees-editor`, `category-fee-row-{i}`, `category-fee-input-{i}`, `add-category-fee`, `remove-category-fee-{i}`.

### Verificación
- `/app/test_reports/iteration_16.json` — **Backend 15/15 PASS · Frontend 7/7 flows PASS**.
- Backend pytest: `test_iter16_contact_categories_paquetes.py`.
- Casos validados: classification auto-upper ('sapphire'→'SAPPHIRE'), accommodation_type round-trip, categories list persistido, contact form público + admin inbox CRUD.

## Backlog actualizado (P0/P1/P2)
- 🔴 **P0** — Separar roles `president` (cotiza+paga) y `team_manager` (DT — inscribe jugadores). Flujo del PDF FSC_Requerimientos_Emergent_v3 (registro DT selecciona club existente → admin aprueba → DT registra cuerpo técnico + jugadores).
- 🔴 **P0** — Cotizar evento+múltiples categorías: selector abierto + checkboxes para inscribir varias categorías a la vez con fee por cada una.
- 🟡 **P1** — Notificaciones email (Resend/SendGrid) cambios de estado (teams/players/quotes/payments).
- 🟡 **P1** — Slider del Hero editable (carrusel) — hoy es imagen única.
- 🟢 **P2** — `GET /api/tournaments/{id}` para simetría con PUT/DELETE (sugerencia testing iter16).
- 🟢 **P2** — Logos de aliados en Footer + Testimonios.
- 🟢 **P2** — Stripe webhook signature verification.
- 🟢 **P2** — Refactor `server.py` (>3769 líneas) → `/app/backend/routes/{auth,catalog,tournaments,quotes,payments,contact}.py`.
- 🟢 **P3** — Gallery drag-and-drop, importación masiva XLSX de matches.


## Iteration 25 (2026-05-30) — Catálogos dinámicos + Paleta v2 + CurrencyInput + Auto-galería

### Backend (`server.py`)
- **CRUD `/admin/categories`** (lista, crear, actualizar, eliminar). `GET /api/categories` público ahora lee de `db.categories` (auto-seed desde constante en el primer GET admin).
- **CRUD `/admin/event-types`** (lista, crear con `_slugify`, actualizar, eliminar). Auto-seed desde `EVENT_TYPES` constante en el primer GET admin.
- **`_validate_catalog_row` acepta tipo nuevo `meal_addon`** con campos: `meal_type` (DESAYUNO/ALMUERZO/CENA — auto-upper, validado), `classification` (auto-upper) y `cost`.
- **Validación de category relajada** en `POST /teams`, `PUT /teams`, `POST /players`, `PUT /players`: ya no se valida contra constante `CATEGORIES`, solo no-vacío. Permite categorías custom creadas por el admin.

### Frontend
- **Paleta v2 (`tailwind.config.js` + `index.css`)**:
  - `#e31f27` rojo (`fsc-rojo`), `#0640c8` azul (`fsc-azul`), `#dedfe0` gris (`fsc-gris`) + variantes `-oscuro`.
  - `fsc-btn-primary` ahora azul; `fsc-btn-red` mantiene rojo; `fsc-btn-dark` con borde azul.
  - Alias legacy de `fsc-dorado*` → apuntan al azul para compat con componentes existentes.
  - **Fuentes Google Fonts equivalentes**: Bebas Neue (display) + **Exo 2** (body, sustituto Neo Sans Std) + **Allura** (cursive, sustituto Natura Script) cargadas vía `<link>`.
- **`CurrencyInput.jsx`** (nuevo): input formateado es-CO (1.500.000), sin decimales, sin ceros a la izquierda, devuelve Number. Aplicado en AdminInventory (todos los precios), AdminTournaments (fee de categorías), AdminEventTypes (registration_fee).
- **`AdminInventory.jsx` reescrito**:
  - Lodging label "Valor Paquete (COP)" (antes "Base 5 noches (COP)").
  - Tab **Alimentación adicional** (tipo `meal_addon`): tabla CRUD con columnas Nombre / Comida / Clasificación / Costo. Modal "Nueva alimentación" con selects desplegables.
  - Tab **Tours**: ahora con campo `descripción` (textarea) editable inline + modal "Nuevo tour" con descripción.
- **`AdminTournaments.jsx` reescrito**:
  - Eliminado el input "Categoría (principal)" único (junto con `CategorySelect`).
  - `Tipo de evento` ahora es selector dinámico poblado desde `/admin/event-types` + link "Gestionar tipos de evento".
  - `CategoriesFeesEditor` usa catálogo dinámico desde `/admin/categories` + link "Gestionar catálogo de categorías".
  - Backend compat: al guardar, se setea `category = categories[0].name` para no romper el modelo Pydantic legacy.
- **Nuevas páginas admin**:
  - `/admin/categorias` (`AdminCategories.jsx`): tabla con inline edit + modal de creación.
  - `/admin/tipos-evento` (`AdminEventTypes.jsx`): tabla con CurrencyInput para fee.
  - Sidebar agrega "Tipos de evento" y "Categorías".
- **`Home.jsx` galería auto-rotación**: `setInterval(5000)` selecciona índice aleatorio con guard anti-repetición. `GalleryCarousel` expone `data-testid="gallery-carousel"` con `data-active-idx={idx}` para testabilidad.

### Testids agregados
- `inv-tab-meal_addon`, `inv-add-meal_addon`, `inv-meal_addon-{id}`, `inv-meal_addon-name-{id}`, `inv-meal_addon-type-{id}`, `inv-meal_addon-class-{id}`, `inv-meal_addon-cost-{id}`, `inv-new-meal-type`, `inv-new-meal-class`, `inv-new-cost`, `inv-new-tour-desc`, `inv-tour-desc-{id}`.
- `tour-event-type`, `add-category-btn`, `cat-name-{id}`, `cat-save-{id}`, `cat-delete-{id}`, `cat-new-name`, `cat-new-submit`.
- `add-event-type-btn`, `evt-name-{id}`, `evt-fee-{id}`, `evt-save-{id}`, `evt-delete-{id}`, `evt-new-name`, `evt-new-fee`, `evt-new-submit`.
- `gallery-carousel` con `data-active-idx`, `gallery-slide-{i}` con `data-active`.

### Verificación
- `/app/test_reports/iteration_17.json` — **Backend pytest 23/23 PASS · Frontend Playwright 100%**.
- Auto-rotación de galería confirmada manualmente: idx 0 → 1 después de 6.5s.
- CurrencyInput: '1500000' → '1.500.000' OK.

## Backlog actualizado (P0/P1/P2)
- 🔴 **P0** — Separar roles `president` (cotiza/paga) vs `team_manager` (inscribe jugadores).
- 🔴 **P0** — Cotizar evento+múltiples categorías a la vez con fee por cada una.
- 🟡 **P1** — Notificaciones email (Resend/SendGrid) cambios de estado.
- 🟡 **P1** — Slider del Hero editable (carrusel).
- 🟢 **P2** — Aplicar `CurrencyInput` también en `/cotizar` y otros formularios de pago manual (hoy solo admin).
- 🟢 **P2** — Aplicar paleta v2 + Exo 2 a páginas legacy con clases `fsc-dorado*` directas (Home/Eventos secundarios) para coherencia visual total.
- 🟢 **P2** — `GET /api/tournaments/{id}`, Stripe webhook signature, refactor `server.py` (>3899 líneas) → `/app/backend/routes/`.
- 🟢 **P3** — Migración de `meal` (matriz por tier) → unificar todo en `meal_addon` (hoy coexisten).

## Iteration 26 (2026-05-30) — Sub-tanda A: Limpieza visual + Club en cotizaciones

### Backend
- **`GET /api/quotes` enriquece con `club_name`**: lookup `user.team_id` → `team.club_name` (fallback a `team.name`). `setdefault('club_name','')` defensivo.

### Frontend
- **`fsc-dorado*` eliminado de todo el JSX**: find/replace global a `fsc-azul*`. Solo quedan 3 aliases CSS en `index.css` por compat retro (apuntan al azul). El literal `#C9A227` en `TeamRegister.jsx` reemplazado por `#0640c8`.
- **Home redesign**:
  - Hero ahora `bg-gradient-to-br from-white via-fsc-gris/40 to-white` con escudo FSC en marca de agua a la derecha (`opacity-[0.06]`). Título oscuro (`text-fsc-negro`) y subtítulo cursive en rojo.
  - Galería con fondo claro (`bg-fsc-gris/30`) + marca de agua central del escudo.
  - `EventCard`: chips con TODAS las categorías inscritas al evento (no solo la primera), con fallback al `category` legacy.
- **AdminInventory**:
  - LodgingTab: input "Nombre" eliminado; el título de cada card es la clasificación en mayúsculas (`SAPPHIRE`/`ESMERALD`/etc) renderizada como `<div>` no editable.
  - MealAddonTab: columna "Nombre" eliminada. La tabla solo expone Comida + Clasificación + Costo + Acciones.
  - CreateModal: input "Nombre" solo para `transport` y `tour`. Para `lodging` el nombre se deriva de `classification`; para `meal_addon` se construye como `"DESAYUNO · SAPPHIRE"`.
  - Modal titles ahora en español: "Nuevo paquete de hospedaje", "Nueva alimentación adicional", etc.
- **AdminEventTypes**: campo `registration_fee_per_team` eliminado de la tabla, modal de creación, y `save()` (el backend lo conserva auto-seeded; deja de exponerse en UI).
- **AdminQuotes**: nueva columna **Club** después de "Cliente" con `data-testid=quote-club-{id}`; búsqueda y export CSV incluyen `club_name`.

### Verificación
- `/app/test_reports/iteration_18.json` — **Backend pytest 6/6 PASS · Frontend 5/5 PASS**.
- Smoke screenshots confirman: hero claro con marca de agua, paquetes con título=clasificación, tipos-evento sin columna fee, alimentación sin Nombre.

### Pendiente — Sub-tanda B (Refactor Clubes)
- 🔴 P0: Sidebar admin renombra "Equipos" → "Clubes".
- 🔴 P0: Vista jerárquica `/admin/clubes`: Club → Eventos inscritos → Categorías → Equipos → cuerpo técnico + jugadores.
- 🔴 P0: Bloqueo en cascada: club pendiente → users no pueden cotizar ni inscribir equipos.
- 🔴 P0: Admin aprueba/rechaza inscripción de equipos a eventos.
- 🔴 P0: Carnets admin agrupados Club > Evento > Equipo; DT/usuarios ven sin descargar.
- 🔴 P0: Aprobaciones muestra usuarios registrados por club.


## Iteration 27 (2026-05-30) — Sub-tanda B: Refactor Clubes + Aprobación en cascada

### Backend (`server.py`)
- **Helper `_require_club_approved(user, *, action)`**: lanza 403 si user.role=='team' y su club no está `aprobado`. Aplicado en:
  - `POST /api/quotes` (acción "cotizaciones")
  - `POST /api/clubs/{cid}/teams` (creación de equipos por DT)
- **`GET /api/admin/clubs-tree`** (admin): devuelve cada club con `teams[]` enriquecidos con `players[]` (sin _id), agrupables en frontend por (event_type, category).
- **`GET /api/admin/clubs/{cid}/users`** (admin): lista usuarios asociados al club (manager + cualquier user con `team_id` en equipos del club).

### Frontend
- **`AdminLayout.jsx`**: sidebar item "Equipos" renombrado a "Clubes" apuntando a `/admin/clubes`.
- **`AdminClubsTree.jsx` (nuevo)**: vista jerárquica con `ClubNode` → `TeamNode` → jugadores/staff. Filtros por status (Todos/Pendiente/Aprobado/Rechazado) + search. Acciones admin: aprobar/rechazar club (`PUT /clubs/{id}/status`), aprobar/rechazar equipo, agregar/editar/eliminar jugadores con `PlayerEditModal`.
- **`AdminApprovals.jsx`**: tab "Clubes" usa nuevo `ApprovalClubCard` expandible que muestra `[data-testid=approval-club-users-{id}]` con la lista de usuarios registrados al club.
- **`CarnetSheet.jsx`**: nuevas props `readonly` (oculta toggle-all, descargas, checkboxes y botón individual) y `showClubFilter` (selector adicional [`carnet-club-filter`] que filtra teams visibles por `club_name`).
- **`AdminCarnets.jsx`**: pasa `showClubFilter={true}`.
- **`MyTeam.jsx`**:
  - `loadTeam` resiliente a 404 (team huérfano) — no rompe la página.
  - Carga `club` via `GET /clubs/{cid}` y muestra banner [`club-status-banner`] cuando el club no está aprobado, advirtiendo el bloqueo de cotizaciones e inscripciones.
  - `CarnetSheet readonly={true}` — DTs ven sus carnets pero no descargan.
- **`App.js`**: route `clubes` → `AdminClubsTree`.

### Testids agregados
- `admin-clubs-tree`, `clubs-refresh`, `clubs-search`, `clubs-filter-{status|all}`, `clubs-count`, `club-node-{id}`, `club-toggle-{id}`, `club-status-{id}`, `club-approve-{id}`, `club-reject-{id}`, `club-users-{id}`.
- `team-node-{id}`, `team-toggle-{id}`, `team-approve-{id}`, `team-reject-{id}`, `team-add-player-{id}`, `player-row-{id}`, `player-edit-{id}`, `player-delete-{id}`.
- `player-edit-modal`, `player-name`, `player-save`.
- `approval-club-toggle-{id}`, `approval-club-users-{id}`.
- `carnet-club-filter`, `myteam-carnet-readonly-note`, `club-status-banner`.

### Verificación
- `/app/test_reports/iteration_19.json` — **Backend pytest 9/9 PASS · Frontend 100%**.
- Issue medium "MyTeam rompe con team huérfano" **resuelto** (try/catch + estado vacío).
- Cascada validada: DT con club pendiente recibe 403 informativo; al aprobar, mismo POST → 200.

## Backlog actualizado (P0/P1/P2)
- 🟢 **P2** — Resincronizar `QuoteIn.lodging_tier` (Literal estrecho) con el catálogo dinámico actual o ampliarlo a `str` (issue minor iter19).
- 🟢 **P2** — Agregar `DELETE /api/admin/users/{uid}` para limpieza idempotente de test users.
- 🟡 **P1** — Notificaciones email (Resend/SendGrid) en cambios de estado de club/team/quote/payment.
- 🟡 **P1** — Slider del Hero editable.
- 🟢 **P2** — `CurrencyInput` en `/cotizar` y formularios de pago manual del DT.
- 🟢 **P2** — `GET /api/tournaments/{id}`, Stripe webhook signature, refactor `server.py` (>3937 líneas) → `/app/backend/routes/`.

