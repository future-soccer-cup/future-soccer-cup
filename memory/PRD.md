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

## Last Test Run
- iteration_5: **84/84 pytest backend en verde** (13 nuevos para iter5). Frontend verificado end-to-end (descarga plantilla → preview con errores → confirmar → equipos persistidos visibles en `/admin/equipos`).
