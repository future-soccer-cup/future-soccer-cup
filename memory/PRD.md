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
