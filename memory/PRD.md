# PRD — FUTRE SOCCER CUP

## Problema y objetivo
Aplicación versátil para una empresa que organiza eventos de fútbol infantil y juvenil (FUTRE SOCCER CUP). Portal público + Admin, generación de fixtures, resultados, registro de clubes/equipos/jugadores, cotización multi-moneda (USD/COP) y multi-evento/hospedaje, pagos manuales con recibos bancarios, generación PDF de carnets, control de roles (Admin / Directivo / Cuerpo Técnico) e identidad visual robusta.

## Stack
- Frontend: React + Tailwind + shadcn/ui
- Backend: FastAPI + MongoDB
- Pagos: Stripe (sk_test_emergent)
- Storage de fotos: Emergent Object Storage

## Roles
- **Admin**: gestión completa (inventario, torneos, carnets, aprobaciones).
- **Directivo (Director Técnico)**: cotiza tras aprobación del club, crea equipos enlazados a cotizaciones aprobadas, registra jugadores y staff.
- **Cuerpo Técnico (CT)**: registra jugadores y staff; no cotiza.

## Estado de implementación (Feb 2026)
- ✅ Cotizar multi-evento + multi-hospedaje con toggle USD/COP en vivo.
- ✅ Catálogo de precios dual COP/USD en Admin (paquetes, eventos). Inscripción USD usa `CurrencyInput` con separador de miles y sin cero a la izquierda.
- ✅ Aprobación admin obligatoria antes de pagar cotizaciones.
- ✅ Pagos manuales con info bancaria; validación estricta de moneda (USD↔USD, COP↔COP).
- ✅ Generación PDF de carnets (solo admin); Directivo/CT no ven módulo.
- ✅ Filtros en cascada Admin Carnets (Club→Evento→Categoría→Equipo).
- ✅ Subida de foto para Jugadores y Staff (ImageUpload).
- ✅ Registro completo de jugador (los 13 campos en los 3 sitios: MyTeam-Directivo/CT, MyTeam-DT, AdminPlayers): Nombre, Apodo/Nick, Género, Dorsal, Posición (18 opciones), Fecha nac., Documento, EPS, Foto, Acudiente (nombre/doc/parentesco/teléfono).
- ✅ Staff con rol, documento, teléfono y foto.
- ✅ Sidebar Admin reordenado.
- ✅ Admin Quotes detail muestra Club y Teléfono de contacto.
- ✅ Editar cotización: moneda bloqueada en la moneda original (no se permite cambiar).

## Backlog priorizado
- **P1** Notificaciones por email (Resend o SendGrid) al aprobar/rechazar clubes, equipos, cotizaciones y pagos.
- **P2** Stripe Webhook signature verification.
- **P2** Refactor `server.py` (>4300 líneas) → `/app/backend/routes/`.
- **P3** Dashboard de estadísticas avanzadas (goleadores, tarjetas).
- **P3** Exportación XLSX/CSV de listados por torneo/categoría.
- **P3** Notificaciones in-app (campanita).

## Modelos clave
- `quotes`: `{currency: USD|COP, lodgings:[{tier_id,pax,...}], status:pendiente|aprobada, contact_phone}`
- `pricing_catalog`: `{type, price, price_usd, ...}`
- `teams`: `{tournament_id, category, status, ...}`
- `players`: `{name, nickname, gender, jersey_number, position, birth_date, document_id, eps, photo_url, guardian_name, guardian_doc, guardian_relation, guardian_phone, ...}`
- `staff`: `{name, role, document, phone, photo_url, ...}`

## Endpoints clave
- POST /api/quotes/calculate
- GET  /api/quotes/{qid}  (incluye club_name y contact_phone)
- POST /api/clubs/{cid}/teams
- POST /api/payments  (valida moneda)
- GET  /api/admin/catalog
- GET  /api/quotes/mine
- POST /api/players, PUT /api/players/{id}
- POST /api/team-roster/import?preview=

## Credenciales de prueba
Ver `/app/memory/test_credentials.md`.
