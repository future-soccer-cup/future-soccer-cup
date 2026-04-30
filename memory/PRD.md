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
