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

## Last Test Run
- iteration_2: 44/44 backend pytest passing (24 regression + 20 nuevos). Frontend: 100% en flujos verificados (registro de equipo, mi equipo, ImageUpload + CategorySelect en admin). Sin issues bloqueantes.
