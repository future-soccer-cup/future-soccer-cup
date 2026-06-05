# PRD — FUTRE SOCCER CUP

## Problema y objetivo
Aplicación versátil para FUTRE SOCCER CUP: Portal público + Admin, fixtures, resultados, registro clubes/equipos/jugadores, cotización multi-moneda (USD/COP) multi-evento/hospedaje, pagos manuales con info bancaria, generación PDF carnets, control de roles (Admin/Directivo/CT), identidad visual.

## Stack
- Frontend: React + Tailwind + shadcn/ui
- Backend: FastAPI + MongoDB
- Pagos: Stripe (sk_test_emergent)
- Storage de fotos: Emergent Object Storage

## Roles
- **Admin**: gestión completa.
- **Directivo (DT)**: cotiza tras aprobación club, crea equipos, registra jugadores/staff.
- **Cuerpo Técnico (CT)**: registra jugadores/staff; no cotiza.

## Estado de implementación (Feb 2026)
- ✅ Cotizar multi-evento + multi-hospedaje, toggle USD/COP en vivo, moneda **bloqueada al editar**.
- ✅ Catálogo dual COP/USD: todos los inputs USD en Inventario (lodging, meal addons, transport, tours) y en Torneos usan `CurrencyInput` con separador de miles (200.000) sin cero a la izquierda.
- ✅ Aprobación admin obligatoria antes de pagar.
- ✅ Pagos manuales con info bancaria, validación estricta de moneda.
- ✅ PDF carnets (solo admin); Directivo/CT no ven módulo.
- ✅ Filtros cascada Admin Carnets (Club→Evento→Categoría→Equipo).
- ✅ Foto jugador y staff (ImageUpload) en 3 modales (MyTeam-Directivo/CT, MyTeam-DT, AdminPlayers) con los 13 campos: Nombre, Apodo, Género, Dorsal, Posición (18 op), Fecha nac., Documento, EPS, Foto, Acudiente (nombre/doc/parentesco/teléfono).
- ✅ Admin · Cotizaciones · Ver: muestra Club + **Teléfono contacto**, etiqueta "Valor Paquete" (antes "Valor 5n"), elimina "Noches", muestra descripción del paquete y **acomodación** (accommodation_type del catálogo).
- ✅ Admin · Cotizaciones · Ver: Transporte muestra `route_name` (no más route_id), Tours muestra `tour_name` (no más tour_id). Cotizaciones legacy hacen fallback al id.
- ✅ Admin · Cotizaciones · Ver: montos formateados con sufijo "USD" o "COP" en cada línea.
- ✅ Sidebar Admin reordenado.

## Backlog priorizado
- **P1** Notificaciones email (Resend/SendGrid) al aprobar/rechazar clubes/equipos/cotizaciones/pagos.
- **P2** Stripe Webhook signature verification.
- **P2** Refactor `server.py` (>4300 líneas) → `/app/backend/routes/`.
- **P3** Dashboard de estadísticas avanzadas.
- **P3** Exportación XLSX/CSV.
- **P3** Notificaciones in-app.

## Modelos clave
- `quotes`: `{currency, contact_phone, lodgings_breakdown:[{tier_name,tier_description,tier_accommodation,...}], transport_entries_breakdown:[{route_id,route_name,...}], tour_subtotals:[{tour_id,tour_name,...}], status}`
- `pricing_catalog`: `{type, price, price_usd, accommodation_type, description, includes, ...}`
- `players`: `{name, nickname, gender, jersey_number, position, birth_date, document_id, eps, photo_url, guardian_*}`

## Credenciales de prueba
Ver `/app/memory/test_credentials.md`.
