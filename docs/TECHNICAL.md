# Future Soccer Cup — Documento Técnico

Aplicación full-stack para la gestión integral de eventos de fútbol formativo (FUTRE SOCCER CUP). Cubre portal público (Home, Nosotros, Eventos, Estadísticas, Noticias, Contacto, Cotizador), portales privados (Director técnico y Cuerpo técnico) y panel de administración completo (torneos, fixtures, resultados, cotizaciones, pagos manuales, PDFs, CMS).

Última revisión: **Iter 42 — Feb 2026**.

---

## 1. Stack tecnológico

### Backend
| Paquete             | Versión   | Uso                                            |
|---------------------|-----------|------------------------------------------------|
| Python              | 3.11      | Runtime                                        |
| FastAPI             | 0.110.1   | HTTP framework                                 |
| Starlette           | 0.37.2    | ASGI (dependencia de FastAPI)                  |
| Uvicorn             | —         | Servidor ASGI (gestionado por supervisor)      |
| Pydantic            | 2.12.5    | Validación de schemas                          |
| Motor               | 3.3.1     | Cliente MongoDB async                          |
| PyMongo             | 4.5.0     | Motor bajo Motor                               |
| python-jose         | 3.5.0     | JWT                                            |
| bcrypt              | 4.1.3     | Hashing de contraseñas                         |
| passlib             | 1.7.4     | Wrapper de hashing                             |
| python-multipart    | 0.0.24    | Upload de archivos                             |
| reportlab           | 5.0.0     | Generación de PDF (carnets, cotización, fixture) |
| openpyxl            | 3.1.5     | Lectura/escritura XLSX (carga masiva)          |
| Pillow              | reciente  | Conversión PNG/JPG → WebP                      |
| stripe (SDK python) | —         | Pagos (test key en `STRIPE_API_KEY`)           |
| emergentintegrations| 0.1.0     | Universal Key para LLMs (opcional)             |

### Frontend
| Paquete             | Versión   | Uso                                            |
|---------------------|-----------|------------------------------------------------|
| Node                | ≥18       | Build tooling                                  |
| React               | 19.0.0    | UI                                             |
| React Router DOM    | 7.5.1     | Routing SPA                                    |
| CRACO + react-scripts | 5.0.1 / 7.1.0 | Build                                    |
| Tailwind CSS        | 3.4.17    | Utilidades CSS                                 |
| shadcn/ui + Radix   | varias    | Primitives accesibles (`/components/ui/*`)     |
| lucide-react        | 0.507.0   | Iconos                                         |
| sonner              | 2.0.3     | Notificaciones toast                           |
| axios               | 1.8.4     | HTTP cliente                                   |
| framer-motion       | 12.42.0   | Animaciones (carrusel Finales, entradas)       |
| qrcode.react        | 4.2.0     | QR de carnets                                  |
| jspdf + html2canvas | 4.2.1 / 1.4.1 | Descarga cliente-side de carnets            |
| recharts            | 3.6.0     | Gráficas de estadísticas                       |
| react-hook-form + zod | 7.56.2 / 3.24.4 | Formularios y validación                |
| date-fns            | 4.1.0     | Formato de fechas                              |

### Infraestructura local
- **MongoDB** local (URL en `MONGO_URL`).
- **Supervisor** administra procesos `backend` y `frontend` (no usar `uvicorn` directamente).
- **Kubernetes ingress**: todas las rutas `/api/*` se redirigen internamente al backend `:8001`; el resto va al frontend `:3000`.

---

## 2. Estructura de carpetas

```
/app
├── backend/
│   ├── server.py               # Monolito FastAPI (≈6000 líneas)
│   ├── requirements.txt
│   ├── .env                    # Vars sensibles (ver §7)
│   ├── scripts/                # Utilidades ad-hoc
│   └── tests/                  # pytest (backend_test.py + iter*.py)
├── frontend/
│   ├── package.json
│   ├── craco.config.js
│   ├── tailwind.config.js
│   ├── public/
│   │   ├── fonts/              # Plane Crash, Agency FB (precargadas)
│   │   ├── fonts.css
│   │   └── index.html
│   └── src/
│       ├── App.js              # Router + layouts
│       ├── App.css / index.css # Estilos globales + animaciones
│       ├── components/         # Reutilizables (Navbar, Footer, Carnet, etc.)
│       │   └── ui/             # shadcn primitives
│       ├── pages/              # Rutas públicas y privadas
│       │   └── admin/          # Rutas /admin/*
│       ├── context/            # AuthContext (JWT en cookie httpOnly)
│       ├── hooks/              # useAuth, etc.
│       └── lib/                # api.js (axios), designSystem.js, playerValidation.js, dateFormat.js
├── memory/                     # PRD.md, test_credentials.md
├── test_reports/               # Salidas del testing agent (iter{N}.json)
├── docs/
│   ├── TECHNICAL.md            # (este archivo)
│   └── USER_MANUAL.md          # Manual funcional para usuarios
└── design_guidelines.json
```

---

## 3. Componentes principales del frontend

### 3.1 Layouts y navegación (`App.js`)
- **`PublicLayout`**: envuelve todas las rutas públicas con `<Navbar />` + `<Footer />` (excepto Home, que renderiza su propio footer inline).
- **`ProtectedRoute` + `AdminLayout`**: protegen `/mi-equipo`, `/mis-cotizaciones` (rol `team`) y `/admin/*` (rol `admin`).

### 3.2 Rutas frontend

**Públicas**
| Ruta                          | Componente         | Descripción                                    |
|-------------------------------|--------------------|------------------------------------------------|
| `/`                           | `Home`             | Landing con carrusel hero, stats, galería Finales, categorías, footer contacto |
| `/nosotros`                   | `Nosotros`         | Misión + 4 tarjetas                            |
| `/eventos`                    | `Eventos`          | Listado de torneos activos + calendario        |
| `/datos-estadisticas`         | `DatosEstadisticas`| Página resumen de estadísticas                 |
| `/fixture`                    | `Fixture`          | Fixture público del torneo destacado           |
| `/posiciones`                 | `Standings`        | Tabla de posiciones                            |
| `/bracket`                    | `Bracket`          | Bracket de eliminación                         |
| `/equipos`, `/equipos/:id`    | `Teams` / `TeamDetail` | Directorio y detalle de equipo            |
| `/clubes/:slug`               | `ClubDetail`       | Perfil de club                                 |
| `/jugadores`, `/jugadores/:id`| `Players` / `PlayerDetail` | Roster + **carnet oficial** con QR + logo FSC |
| `/noticias`                   | `Noticias`         | Feed con paginación                            |
| `/contacto`                   | `Contacto`         | Form → `POST /api/contact-messages`            |
| `/cotizar`                    | `Cotizar`          | Cotizador multi-evento / multi-hospedaje (COP/USD) |
| `/login`, `/registro`, `/registro-equipo` | Login/Register/TeamRegister | Auth JWT (cookie httpOnly) |
| `/recuperar-clave`, `/restablecer-clave` | `ForgotPassword` / `ResetPassword` | Flujo de reseteo                 |
| `/pago-exitoso`               | `PaymentSuccess`   | Callback Stripe (polling de estado)            |

**Privadas (rol `team`)**
| Ruta                | Componente     | Rol requerido                        |
|---------------------|----------------|--------------------------------------|
| `/mi-equipo`        | `MyTeam`       | `team` (Directivo o Cuerpo Técnico)  |
| `/mis-cotizaciones` | `MyQuotes`     | `team` (solo Directivo)              |

**Admin (rol `admin`)**
| Ruta                          | Componente                | Función                                 |
|-------------------------------|---------------------------|-----------------------------------------|
| `/admin`                      | `AdminDashboard`          | Métricas rápidas                        |
| `/admin/home`                 | `AdminHomeSettings`       | CMS del sitio (§8)                      |
| `/admin/galeria`              | `AdminGallery`            | Galería finales del Home                |
| `/admin/noticias`             | `AdminPosts`              | Crear/editar/importar posts             |
| `/admin/mensajes`             | `AdminMessages`           | Bandeja de contact form                 |
| `/admin/categorias`           | `AdminCategories`         | Catálogo global + color por categoría (usado en carnet) |
| `/admin/tipos-evento`         | `AdminEventTypes`         | Catálogo Festival/Premier               |
| `/admin/eventos` (torneos)    | `AdminTournaments`        | Torneos + tarifas por categoría         |
| `/admin/paquetes`             | `AdminInventory`          | Hospedaje, transporte, tours, meal add-ons |
| `/admin/cotizaciones`         | `AdminQuotes`             | Cotizaciones (aprobar / rechazar / **eliminar**) |
| `/admin/pagos`                | `AdminPayments`           | Pagos manuales (aprobar / rechazar / **eliminar**) |
| `/admin/clubes`               | `AdminClubsTree`          | Árbol Club→Equipos→Jugadores + **eliminar (cascada)** |
| `/admin/equipos`              | `AdminTeams`              | CRUD de equipos                         |
| `/admin/jugadores`            | `AdminPlayers`            | CRUD de jugadores                       |
| `/admin/aprobaciones`         | `AdminApprovals`          | Cola unificada de aprobaciones          |
| `/admin/generador-fixture`    | `AdminFixtureGenerator`   | Generar fixtures + **eliminar** con modal |
| `/admin/partidos`             | `AdminMatches`            | Programar/editar/cargar resultados      |
| `/admin/bracket`              | `AdminBracketGenerator`   | Bracket de eliminatoria                 |
| `/admin/carnets`              | `AdminCarnets`            | Ficha imprimible (batch + individual PDF) |
| `/admin/carga-masiva`         | `AdminBulkUpload`         | Import XLSX de equipos y jugadores (§6) |
| `/admin/recuperaciones`       | `AdminPasswordResets`     | Solicitudes de reseteo pendientes       |

### 3.3 Componentes reutilizables clave (`/frontend/src/components/`)

| Componente               | Descripción                                                           |
|--------------------------|-----------------------------------------------------------------------|
| `Navbar.jsx`             | Nav superior con logo + menú responsive                              |
| `Footer.jsx`             | Footer global en todas las páginas no-Home. Editable vía CMS         |
| `ImageCarousel.jsx`      | Crossfade automático (usado en hero foreground)                      |
| `Counter.jsx`            | Animación de conteo numérico (stats del Home)                        |
| `AnimateIn.jsx`          | Wrapper `framer-motion` de entrada (fade / slide-up / slide-in)      |
| `ChevronStack.jsx`       | Chevrons apilados animados (bounce)                                  |
| `ConfirmDeleteDialog.jsx`| Modal reutilizable de confirmación destructiva (AlertDialog shadcn)  |
| `CarnetSheet.jsx`        | Grid de carnets con selección múltiple + descarga PDF por lote      |
| `Carnet` (export desde `PlayerDetail.jsx`) | Tarjeta con foto, QR, logo FSC, colores según categoría |
| `ImageUpload.jsx` / `ImageListUpload.jsx` | Widget de subida (llama a `POST /api/upload`)            |
| `PaymentForm.jsx` / `PaymentsList.jsx`    | Formulario y listado de pagos manuales                   |
| `PagedTable.jsx`         | Hook `usePagedSearch` + `SearchBar` + `Pagination`                   |
| `CurrencyInput.jsx`      | Input con formato COP/USD                                            |
| `BirthDateField.jsx`     | Selector fecha nacimiento con validación anti-categoría              |
| `VenuePicker.jsx`        | Selector/creador de cancha                                           |
| `ProtectedRoute.jsx`     | Redirige a `/login` si no hay sesión o el rol no coincide            |
| `SecondaryHero.jsx`      | Hero reutilizable con imagen + overlay (Nosotros/Eventos/…)          |
| `Logo.jsx`               | Wordmark FSC configurable                                            |

### 3.4 Estado global y autenticación
- **`context/AuthContext.jsx`**: hook `useAuth()` que expone `user`, `login()`, `logout()`, `refresh()`.
- **Cookies**: JWT en cookie **httpOnly** (`fsc_session`). Front usa `axios.create({ withCredentials: true })`.
- **Refresh**: `POST /api/auth/refresh` renueva la cookie.
- **Roles**: `admin`, `team`. Dentro de `team` se distingue por `manager_role`: "Director técnico" (Directivo) o "Cuerpo Técnico" (CT). CT no puede cotizar ni cambiar logo del club.

---

## 4. Endpoints del backend

Base: `${REACT_APP_BACKEND_URL}/api`. Todos los endpoints están bajo el `APIRouter` prefijado con `/api`.

### 4.1 Auth
| Método | Ruta                          | Payload / Query                                        | Respuesta                                    | Auth |
|--------|-------------------------------|--------------------------------------------------------|----------------------------------------------|------|
| POST   | `/auth/register`              | `RegisterIn` (email, password, name, phone)            | `UserOut` + cookie                           | —    |
| POST   | `/auth/register-team`         | `TeamRegisterIn` (…+ club, event_type, categoría, manager_role) | `UserOut` (rol team)                | —    |
| POST   | `/auth/login`                 | `LoginIn` (email, password)                            | `UserOut` + cookie                           | —    |
| POST   | `/auth/logout`                | —                                                      | `{ok:true}` (borra cookie)                   | user |
| GET    | `/auth/me`                    | —                                                      | `UserOut`                                    | user |
| POST   | `/auth/refresh`               | —                                                      | `{ok:true}` (renueva cookie)                 | user |
| POST   | `/auth/forgot-password`       | `{email}`                                              | `{ok:true}` (crea password reset request)    | —    |
| POST   | `/auth/reset-password`        | `{token, new_password}`                                | `{ok:true}`                                  | —    |

### 4.2 Catálogos públicos
| Método | Ruta                    | Notas                                                                 |
|--------|-------------------------|-----------------------------------------------------------------------|
| GET    | `/categories`           | Lista pública `[{id, name, color, sort_order}]`. Cae a constantes si BD vacía. |
| GET    | `/event-types`          | Lista pública `[{id, name, description, birth_years, fees_by_year, ...}]`     |
| GET    | `/home-settings`        | Documento CMS del Home (§8)                                            |
| PUT    | `/home-settings`        | Actualiza CMS. Requiere admin.                                         |

### 4.3 Clubes / Equipos / Jugadores
| Método | Ruta                                | Descripción                                                                 |
|--------|-------------------------------------|-----------------------------------------------------------------------------|
| GET    | `/clubs`                            | Lista pública (con filtro `?status=`)                                       |
| GET    | `/clubs/{cid}`                      | Detalle                                                                     |
| POST   | `/clubs`                            | Crear (admin o auto-inscripción). Estado inicial `pendiente`                |
| PUT    | `/clubs/{cid}/status?status=aprobado|rechazado|pendiente` | Cambia estado. Admin.                                 |
| PATCH  | `/clubs/{cid}/logo`                 | `{logo_url}`. Solo admin o Director del club.                               |
| DELETE | `/clubs/{cid}`                      | **Cascada**: borra equipos, jugadores, cotizaciones y pagos del club. Admin. Devuelve `{teams_deleted, players_deleted, quotes_deleted, payments_deleted}`. |
| POST   | `/clubs/{cid}/teams`                | Crea equipo dentro del club (admin, Director o auto-inscripción)            |
| GET    | `/admin/clubs-tree`                 | Árbol completo Club→Equipos→Jugadores→Staff. Admin.                         |
| GET    | `/admin/clubs/{cid}/users`          | Usuarios asociados al club. Admin.                                          |
| GET    | `/teams` / `/teams/{id}`            | CRUD                                                                        |
| PATCH  | `/teams/{id}/name` / `/teams/{id}/staff` | Editar nombre / cuerpo técnico                                        |
| PUT    | `/teams/{id}/status`                | Aprobar/rechazar. Admin.                                                    |
| GET    | `/teams/{id}/roster.pdf`            | PDF con roster + escudos                                                    |
| GET    | `/players` / `/players/{id}`        | CRUD. Fields en `PlayerIn` (§5).                                            |
| PUT    | `/players/{id}/status`              | Aprobar/rechazar. Admin.                                                    |

### 4.4 Torneos, Fixtures, Partidos, Brackets, Standings
| Método | Ruta                                        | Descripción                                                     |
|--------|---------------------------------------------|-----------------------------------------------------------------|
| GET/POST/PUT | `/tournaments`, `/tournaments/{tid}`  | CRUD. Categorías con `fee` y reglas.                            |
| GET    | `/tournaments/{tid}/fixture.pdf`            | PDF con calendario                                              |
| GET    | `/tournaments/{tid}/standings.pdf`          | PDF tabla posiciones                                            |
| GET    | `/tournaments/{tid}/fairplay.pdf`           | PDF Fair Play                                                   |
| POST   | `/fixtures/generate`                        | `FixtureGenerateIn` (preview / save)                            |
| POST   | `/fixtures/intergroup`                      | Genera partidos intergrupos                                     |
| GET    | `/fixtures` / `/fixtures/{id}` / `.../matches` | Listado y partidos                                        |
| DELETE | `/fixtures/{id}`                            | Borra fixture + partidos programados. Preserva finalizados. Admin. |
| GET/PUT | `/matches`, `/matches/{mid}`               | Programar / editar. Admin.                                      |
| PUT    | `/matches/{mid}/result`                     | Cargar resultado + goleadores + tarjetas + fair-play            |
| GET    | `/brackets`, `/brackets/{id}`               | Eliminatorias                                                   |
| GET    | `/stats/standings|top-scorers|discipline`   | Datos live para la UI pública                                   |
| GET    | `/historical/standings`                     | Standings de temporadas archivadas                              |

### 4.5 Cotizador (Quotes)
| Método | Ruta                                | Descripción                                                              |
|--------|-------------------------------------|--------------------------------------------------------------------------|
| POST   | `/quotes/calculate`                 | Simula totales (sin persistir). Body: `QuoteIn`.                        |
| POST   | `/quotes`                           | Crea cotización. Requiere rol `team` (Directivo) o `admin`.              |
| GET    | `/quotes/mine`                      | Del usuario logueado.                                                    |
| GET    | `/quotes`                           | Todas (admin).                                                           |
| GET    | `/quotes/{qid}` / `.../pdf`         | Detalle / PDF.                                                           |
| PUT    | `/quotes/{qid}`                     | Editar (admin).                                                          |
| PATCH  | `/quotes/{qid}/other-charges`       | `{other_charges_amount, other_charges_concept}` (admin).                 |
| PUT    | `/quotes/{qid}/status`              | `pendiente|aprobada|rechazada|pagada` (admin).                           |
| PUT    | `/quotes/{qid}/payment-proof`       | Adjunta URL de comprobante.                                              |
| DELETE | `/quotes/{qid}`                     | Elimina cotización. Admin.                                               |

### 4.6 Pagos manuales + Stripe
| Método | Ruta                                        | Descripción                                                             |
|--------|---------------------------------------------|-------------------------------------------------------------------------|
| POST   | `/payments`                                 | Crea abono manual (con `receipt_url` obligatorio)                       |
| GET    | `/payments/mine` / `/payments/by-target`    | Míos / por target                                                       |
| GET    | `/admin/payments`                           | Listado admin (filtro `?status=&target_type=`)                          |
| PUT    | `/admin/payments/{pid}/status`              | `{status, admin_note}` (`sin_verificar|aprobado|saldo_pendiente|rechazado`) |
| DELETE | `/admin/payments/{pid}`                     | Elimina abono. Admin.                                                   |
| POST   | `/payments/checkout/session`                | Stripe Checkout — cotización (COP)                                      |
| POST   | `/payments/registration/session`            | Stripe Checkout — inscripción                                           |
| GET    | `/payments/checkout/status/{sid}`           | Polling estado                                                          |
| POST   | `/webhook/stripe`                           | Webhook                                                                 |

### 4.7 CMS, Uploads, Galería, Noticias
| Método | Ruta                              | Descripción                                                            |
|--------|-----------------------------------|------------------------------------------------------------------------|
| POST   | `/upload`                         | Sube archivo. **PNG/JPG se convierten automáticamente a WebP**. Devuelve `{url, storage_path}`. |
| GET    | `/files/{path:path}`              | Sirve archivo por path                                                  |
| GET/PUT| `/gallery`, `/gallery/{gid}`      | Galería Finales del Home                                                |
| GET/POST/PUT | `/posts`, `/posts/{id}`     | Noticias                                                                |
| POST   | `/posts/import-from-url`          | Importa metadatos desde una URL externa                                 |
| GET    | `/social/instagram`               | Feed Instagram público                                                  |

### 4.8 Catálogos admin (CRUD)
Todos requieren admin.

| Ruta base                | Colección BD           | Notas                                                          |
|--------------------------|------------------------|----------------------------------------------------------------|
| `/admin/categories`      | `categories`           | `{id, name, color, sort_order}`. Color se usa en carnet.       |
| `/admin/event-types`     | `event_types`          | Festival, Premier Par, Premier Impar                           |
| `/admin/catalog/{t}`     | `pricing_catalog`      | Genérico: `hotels`, `transports`, `tours`, `meal_addons`       |
| `/venues` / `/venues/{vid}` | `venues`            | Canchas                                                        |
| `/admin/audit-log`       | `audit_log`            | Registro de acciones sensibles                                 |
| `/admin/password-resets` | `password_resets`      | Solicitudes                                                    |
| `/admin/password-resets/{rid}/cancel` |         | Rechazar/cerrar solicitud                                      |

### 4.9 Carga masiva
| Método | Ruta                              | Descripción                                                            |
|--------|-----------------------------------|------------------------------------------------------------------------|
| GET    | `/import/template/{kind}`         | Descarga XLSX. `kind`: `teams` o `players`. Incluye **dropdowns dinámicos** (categorías desde `db.categories`, eventos desde `db.event_types`, posiciones, género). |
| POST   | `/import/teams?preview=true|false` | Valida / persiste equipos. Auto-crea clubes en estado `pendiente` cuando el `club_name` no existe. |
| POST   | `/import/players?preview=…`       | Valida / persiste jugadores. Vincula por `team_name` exacto.           |
| GET    | `/team-roster/template`           | XLSX para DT (jugadores + cuerpo técnico de un solo equipo)            |
| POST   | `/team-roster/import`             | Import por DT desde `/mi-equipo`                                       |
| GET    | `/import/matches-template`        | Plantilla partidos                                                     |

### 4.10 Contacto
| Método | Ruta                                    | Descripción                       |
|--------|-----------------------------------------|-----------------------------------|
| POST   | `/contact-messages`                     | Envía mensaje desde `/contacto`   |
| PUT    | `/contact-messages/{mid}/read`          | Marca leído (admin)               |
| DELETE | `/contact-messages/{mid}`               | Elimina (admin)                   |

**Total: 129 rutas HTTP.** El listado completo se puede regenerar con `grep -oE '^@api\.(get|post|put|patch|delete)\("[^"]+"' backend/server.py`.

---

## 5. Modelo de datos (MongoDB)

Base de datos: `DB_NAME` (env). Todas las colecciones usan `id: str (uuid4)` como identificador de negocio; el `_id` de Mongo se omite en las respuestas.

### Colecciones activas
`audit_log`, `brackets`, `categories`, `clubs`, `contact_messages`, `event_types`, `files`, `fixtures`, `gallery_images`, `historical_standings`, `home_settings`, `login_attempts`, `matches`, `password_resets`, `payment_transactions`, `payments`, `players`, `posts`, `pricing_catalog`, `quotes`, `teams`, `tournaments`, `users`, `venues`.

### 5.1 users
```
{
  id, email (unique), password_hash, name, phone,
  role: "admin" | "team",
  team_id?, club_id?, manager_role?: "Director técnico" | "Cuerpo Técnico",
  data_consent: bool, created_at
}
```
El seed inicial crea el admin con `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

### 5.2 clubs (`ClubIn`/`ClubOut`)
```
{
  id, name, country, city, phone, email, website,
  logo_url, color,
  status: "pendiente" | "aprobado" | "rechazado",
  manager_user_id, image_name,
  reviewed_by_user_id?, reviewed_by_email?, reviewed_by_name?, reviewed_at?, reviewed_status?,
  created_at
}
```

### 5.3 teams (`TeamIn`/`TeamOut`)
```
{
  id, name, club_id?, club_name?,
  category (string),           // ej: "Sub-12" o "2014"
  birth_year?, designation (Único/A/B), event_type (festival|premier_par|premier_impar),
  coach, city, country, president, delegate_phone,
  logo_url, color,
  group_name,
  cuerpo_tecnico: [{name, role, document, phone, photo_url}],
  registration_fee, registration_payment_status,
  status: "pendiente"|"aprobado"|"rechazado",
  tournament_id?, tournament_name?, manager_user_id?,
  reviewed_*,
  created_at
}
```

### 5.4 players (`PlayerIn`)
```
{
  id, team_id, name, jersey_number, position, birth_date,
  photo_url, document_id, nickname, gender ("M"/"F"),
  eps, comet_number,
  guardian_name, guardian_doc, guardian_relation, guardian_phone,
  status, reviewed_*, created_at
}
```

### 5.5 tournaments
```
{
  id, name, season, category (legacy), categories: [{name, fee, fee_usd, points_*, fairplay_*}],
  start_date, end_date, event_type,
  fmt: "round_robin"|"cuadrangular_x2"|"eliminacion",
  archived, featured, city, venue, cover_url
}
```

### 5.6 fixtures
Documento maestro por (torneo × categoría × grupo). Los partidos individuales viven en `matches` con `fixture_id`.

### 5.7 matches
```
{
  id, tournament_id, fixture_id?, home_team_id, away_team_id,
  match_date, venue, group_name, matchday, stage, match_type,
  home_score?, away_score?, status: "programado"|"en_curso"|"finalizado"|"cancelado",
  scorers: [{player_id, team_id, minute}],
  cards:   [{player_id, team_id, type: "yellow"|"red", minute}],
  home_fair_play, away_fair_play, winner_team_id?
}
```

### 5.8 quotes
Documento denso con todos los subtotales pre-calculados (hospedaje, extra pax, transporte, tours, alimentación, inscripción, otros cobros, currency). Incluye `events_breakdown`, `lodgings_breakdown`, `meals_breakdown`, `transport_entries_breakdown`, `tour_subtotals`, `amount_paid`, `amount_balance`, `status`, `payment_status`, `currency` ("COP"|"USD").

### 5.9 payments
```
{
  id, target_type: "quote"|"team_registration", target_id, target_label, target_total,
  user_id, user_email, user_name, club_id,
  amount, method: "transferencia"|"consignacion"|"efectivo"|"pse"|"nequi"|"otro",
  payment_date, reference, notes, receipt_url,
  status: "sin_verificar"|"aprobado"|"saldo_pendiente"|"rechazado",
  admin_note, reviewed_by_*, reviewed_at, created_at
}
```

### 5.10 categories (catálogo global)
`{id, name, sort_order, color, created_at}` — el `color` (hex) se aplica como gradiente en el carnet.

### 5.11 event_types
`{id, name, description, birth_years, dates, fees_by_year, registration_fee_per_team, sort_order}`.

### 5.12 home_settings (singleton)
Documento único con id fijo (`HOME_SETTINGS_ID`). Contiene ~100 campos CMS: hero, stats, finales, mascota, categorías Festival/Premier, contacto, redes, y **por página secundaria**: `nosotros_*`, `eventos_*`, `contacto_*`, `noticias_*`, `estadisticas_*`.

### 5.13 gallery_images / posts / venues / pricing_catalog / files / audit_log / login_attempts / password_resets
Ver `server.py` para el schema exacto. `pricing_catalog` es genérico (types: `hotels`, `transports`, `tours`, `meal_addons`).

---

## 6. Carga Masiva (XLSX)

### Plantilla `teams`
Columnas: `Club`, `Nombre del equipo`, `Evento` (dropdown Festival/Premier Par/Impar), `Categoría` (dropdown dinámico desde `db.categories`), `Año de nacimiento`, `Designación` (Único/A/B/C), `Grupo`, `DT`, `Ciudad`, `País`, `Presidente`, `Teléfono delegado`, `Color HEX`.

Comportamiento del import:
- Valida categoría contra la BD (fallback a constante `CATEGORIES`).
- Valida evento contra `EVENT_TYPES` keys.
- Si el `Club` no existe → **auto-crea club en estado `pendiente`**; devuelve `clubs_auto_created` en la respuesta para que el admin apruebe.

### Plantilla `players`
Columnas: `Equipo`, `Nombre`, `Dorsal`, `Posición` (dropdown, 18 valores válidos), `Fecha de nacimiento (AAAA-MM-DD)`, `Documento`, `Número COMET`, `Apodo`, `Género (M/F)` (dropdown), `EPS`, `Nombre acudiente`, `Documento acudiente`, `Parentesco`, `Teléfono acudiente`.

Vincula por nombre exacto de equipo. Persiste `comet_number` para el carnet.

Ambos endpoints soportan `?preview=true` para validar sin persistir.

---

## 7. Variables de entorno

### `backend/.env`
| Variable            | Ejemplo                                          | Descripción                                               |
|---------------------|--------------------------------------------------|-----------------------------------------------------------|
| `MONGO_URL`         | `mongodb://localhost:27017`                      | Cadena de conexión Mongo (protegida por plataforma)       |
| `DB_NAME`           | `test_database`                                  | Nombre de la base                                         |
| `CORS_ORIGINS`      | `*` o lista separada por coma                    | Orígenes permitidos                                       |
| `JWT_SECRET`        | string aleatorio ≥32 chars                       | Firma JWT (cookie httpOnly)                               |
| `ADMIN_EMAIL`       | `admin@futuresoccercup.com`                      | Seed de admin                                             |
| `ADMIN_PASSWORD`    | `FSCAdmin2025!`                                  | Password inicial (idempotente)                            |
| `FRONTEND_URL`      | URL pública del frontend                          | Usado para enlaces de reseteo, Stripe                     |
| `EMERGENT_LLM_KEY`  | `sk-emergent-…`                                  | Universal Key para LLMs (opcional)                         |
| `STRIPE_API_KEY`    | `sk_test_…`                                      | Test key de Stripe                                        |
| `APP_NAME`          | `Future Soccer Cup`                              | —                                                          |
| `INSTAGRAM_HANDLE`, `INSTAGRAM_URL` | —                                | Overrides opcionales para el feed público                 |

### `frontend/.env`
| Variable                | Valor                                             |
|-------------------------|---------------------------------------------------|
| `REACT_APP_BACKEND_URL` | URL pública del backend (sin `/api` al final)     |
| `WDS_SOCKET_PORT`       | 443 (websocket dev, evita error CRA en HTTPS)     |
| `ENABLE_HEALTH_CHECK`   | `true` en preview                                 |

> **Regla estricta**: no borrar `MONGO_URL`, `DB_NAME` ni `REACT_APP_BACKEND_URL`. No hardcodear URLs ni claves en el código.

---

## 8. CMS — Campos editables

Editables desde `/admin/home` (colección `home_settings`, singleton). Todos son opcionales; los defaults están en el schema `HomeSettings` (backend `server.py`).

### 8.1 Navbar
- `nav_logo_url` (wordmark)
- `nav_shield_url` (escudo circular)

### 8.2 Hero (Home)
- `hero_edition_label` ("EDICIÓN")
- `hero_edition_year` ("2026")
- `hero_month_1`, `hero_month_2` (botones-badge)
- `hero_image_url` (fondo)
- `hero_foreground_urls[]` (**carrusel** de imágenes de niños/mascota — crossfade automático)

### 8.3 Estadísticas (4 columnas)
- `stat_1_number/label` … `stat_4_number/label`. El número acepta sufijos `K`, `+`, etc. (Counter respeta el string original).

### 8.4 Sección Finales
- `finales_subtitle`, `finales_button_label`, `finales_button_url`.
- Galería Finales: colección `gallery_images` (ver `/admin/galeria`).

### 8.5 Sección Eje cafetero + mascota
- `region_title`, `region_subtitle`, `mascot_image_url`.
- `festival_title`, `festival_logo_url`, `festival_date_badge`, `festival_categories[]`, `festival_cta_url`.
- `premier_title`, `premier_logo_url`, `premier_date_badge`, `premier_categories_par[]`, `premier_categories_imp[]`, `premier_cta_url`.

### 8.6 Contacto + Footer
- `contact_email`, `contact_phone`, `whatsapp_url`.
- Redes: `instagram`, `facebook`, `youtube`.
- `footer_heading` ("¿Y SI NOS TOMAMOS UN CAFECITO JUNTOS?").

### 8.7 Páginas secundarias (Nosotros / Eventos / Contacto / Noticias / Estadísticas)
Cada página tiene su bloque:
- `<page>_hero_kicker` (cursiva)
- `<page>_hero_title`
- `<page>_hero_body`
- `<page>_hero_bg_url`
- `<page>_hero_overlay` (`blue` | `red`)

Para Nosotros hay adicionalmente `nosotros_mission_*` y 4 pills `nosotros_pill_{1..4}_{title,body}`.
Para Contacto: `contacto_form_kicker`, `contacto_form_title`.
Bloque compartido: `hablemos_kicker`, `hablemos_title`.

### 8.8 Legacy (mantenidos por compatibilidad)
`hero_title`, `hero_subtitle`, `hero_cta_*`, `about_*`, `upcoming_*` — aún exponibles vía API pero no usados en el layout actual del Home v2.

---

## 9. Correr el proyecto localmente

> Este repo está preparado para correr dentro de un contenedor con supervisor. Si quieres correrlo bare-metal:

### 9.1 Requisitos
- Node ≥ 18, Yarn (no npm), Python 3.11, MongoDB ≥ 6.
- Cuenta Stripe (test) opcional.

### 9.2 Backend
```bash
cd /app/backend
python -m venv .venv && source .venv/bin/activate   # opcional
pip install -r requirements.txt
# .env con las variables de §7
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### 9.3 Frontend
```bash
cd /app/frontend
yarn install
# .env con REACT_APP_BACKEND_URL apuntando a http://localhost:8001 (o proxy)
yarn start
```

### 9.4 Con supervisor (entorno de la plataforma)
```bash
sudo supervisorctl status         # verificar backend + frontend
sudo supervisorctl restart backend
sudo supervisorctl restart frontend
tail -f /var/log/supervisor/backend.err.log
```

### 9.5 Seed inicial
Al primer arranque, el backend:
1. Crea admin (`ADMIN_EMAIL` / `ADMIN_PASSWORD`) si no existe.
2. Semilla `categories` (Sub-8..Sub-18) si la colección está vacía.
3. Semilla `event_types` desde la constante `EVENT_TYPES`.
4. Semilla `home_settings` con los defaults del schema.

### 9.6 Tests
```bash
cd /app
REACT_APP_BACKEND_URL=<preview_url> pytest backend/tests/ -q
```

---

## 10. Convenciones y notas para desarrolladores

- **Cookies httpOnly**: cualquier fetch al backend debe llevar `withCredentials: true` (ya configurado en `lib/api.js`).
- **Fechas UTC**: guardar siempre `datetime.now(timezone.utc).isoformat()`. Nunca `datetime.utcnow()`.
- **Rutas API**: siempre prefijadas con `/api` (routing k8s).
- **Uploads**: use `POST /api/upload` (multipart). El backend convierte PNG/JPG → WebP automáticamente para reducir tamaño.
- **Errores admin-only**: usar `Depends(require_admin)` en el endpoint; el frontend maneja `401/403` centralmente en `axios.interceptors`.
- **Data-testids**: todos los elementos interactivos llevan `data-testid` en kebab-case para pruebas E2E.
- **Roles**: `admin` (todo), `team` con `manager_role="Director técnico"` (Directivo → cotiza), `manager_role="Cuerpo Técnico"` (solo consulta).
- **Cascada**: `DELETE /api/clubs/{cid}` borra en orden players → teams → quotes → payments → club. Los `DELETE /api/quotes/{qid}` y `DELETE /api/admin/payments/{pid}` son puntuales, no cascadan.

---

## 11. Archivos de memoria para agentes

- `/app/memory/PRD.md` — Product Requirements + changelog acumulativo.
- `/app/memory/test_credentials.md` — Credenciales de test.
- `/app/test_reports/iteration_{N}.json` — Reportes del testing agent.
- `/app/design_guidelines.json` — Guías de identidad visual.

---

**Autor**: Este documento se genera y mantiene automáticamente al final de cada iteración de desarrollo. Última actualización: **Iter 42**.
