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
### 2026-02-26 — Iter42: Carga masiva alineada al schema actual + dropdowns dinámicos
- **Plantilla Equipos** ahora incluye: `Club`, `Nombre del equipo`, `Evento` (festival/premier_par/premier_impar), `Categoría`, `Año de nacimiento`, `Designación (Único/A/B)`, `Grupo`, `DT`, `Ciudad`, `País`, `Presidente`, `Teléfono delegado`, `Color HEX`. Dropdowns en Excel para Evento (desde `db.event_types`), Categoría (desde `db.categories` — dinámico según catálogo actual del admin) y Designación.
- **Plantilla Jugadores** añade `Número COMET` (columna faltante). Dropdowns para `Posición` (18 valores válidos, publicados en hoja `Listas`) y `Género` (M/F). Se mantienen los datos del acudiente (nombre, doc, parentesco, teléfono).
- **`_build_styled_template`** acepta parámetro `validations={col_1based: [values]}` y crea `DataValidation` con estrategia inline (<240 chars) o vía rango en hoja `Listas` para listas largas.
- **Import Equipos** ahora:
   - Valida `category` contra `db.categories` (fallback a `CATEGORIES` constante) — permite Sub-8/Sub-18 legacy o 2009/2010/… nuevos según lo que el admin configuró.
   - Valida `event_type` contra `EVENT_TYPES` keys.
   - Resuelve `club_name` → `club_id`. Si el club no existe, se **auto-crea en estado `pendiente`** con `country`, `city`, `color` heredados de la fila.
   - Devuelve nuevo campo `clubs_auto_created: [{id, name}]` para que el admin apruebe manualmente.
- **Import Jugadores** persiste `comet_number`.
- **`AdminBulkUpload.jsx`** actualizado con descripciones acordes y sección "Clubes creados automáticamente" en amber para que el admin apruebe.
- **Verificado E2E** vía curl: descarga de ambas plantillas (7.5KB/7.8KB, con 3 y 2 data validations respectivamente), preview con errores (categoría inválida, nombre vacío) y confirmación de import saved=true creando 3 equipos + 2 clubes pendientes + 1 jugador con COMET; delete cascade limpia todo correctamente.


### 2026-02-26 — Iter41: Footer global, mascota XL, colores por categoría en carnet + logo FSC junto al QR
- **Footer global (`Footer.jsx`)**: teléfono unificado al mismo tamaño del email (`text-lg md:text-xl lg:text-2xl whitespace-nowrap`). Aplica a Nosotros, Eventos, Estadísticas, Noticias, Contacto, Registro y todas las páginas no-Home. Las redes (IG, FB, YouTube) ya estaban renderizadas condicionalmente desde `home_settings`.
- **Home — Mascota XL**: la mascota entre Festival y Premier crece de `max-h-[780px]` a `max-h-[1000px] + scale-110 origin-bottom` (desktop) y de `max-h-[600px]` a `max-h-[780px]` (mobile).
- **Categorías con color (admin → carnet)**:
  - Backend: `db.categories` ahora persiste campo `color` (hex). Endpoint público `GET /api/categories` cambia de `List[str]` a `List[{id, name, color?, sort_order}]`. `POST` y `PUT /admin/categories` aceptan `color`. Seed automático añade `color: ""`.
  - Admin (`AdminCategories.jsx`): nueva columna "Color carnet" con `<input type="color">` + input text hex sincronizado. Modal de creación también incluye picker.
  - Carnet (`PlayerDetail.jsx`): nuevo helper `darkenHex` + `paletteFor(category, categories)` — si el catálogo tiene `color` para la categoría del equipo, se usa como `from` y se oscurece 55% para generar el `to` del gradiente. Si no hay color asignado, mantiene el fallback hardcoded por categoría (Sub-8…Sub-18). Backward compatible.
  - `CarnetSheet.jsx` y `AdminCarnets.jsx` pasan `categories` como prop por toda la cadena de carnets (lista admin + individuales). `CategorySelect.jsx` ahora extrae `.name` para mantener compat con el nuevo schema.
- **Carnet — Logo FSC sin fondo junto al QR**: añadido `<img src={FSC_LOGO}>` (h-16 w-16, `drop-shadow-md`, sin `bg-white`) a la izquierda del QR en la sección inferior del carnet. `data-testid=carnet-fsc-logo`.
- **Tests actualizados**: `test_iter17_categories_eventtypes_meal_addon.py::TestPublicCategories` ahora valida objetos `{name, ...}` en vez de strings. `test_new_features.py::TestCategories` extrae `.name` antes de comparar con `EXPECTED_CATEGORIES`. Ambos PASS verificados manualmente.


### 2026-02-26 — Iter40: Eliminaciones admin con modales + retoques visuales Home
- **Admin DELETE UX (4 paneles)**: Botones papelera añadidos en `AdminClubsTree.jsx` (cascada club → equipos → jugadores → cotizaciones → pagos), `AdminQuotes.jsx`, `AdminPayments.jsx` y `AdminFixtureGenerator.jsx` (sustituyendo `window.confirm`). Todos usan el componente reutilizable `ConfirmDeleteDialog.jsx` (AlertDialog de shadcn con estado loading + data-testids `{prefix}-content/-cancel/-confirm`).
- **Backend cascada**: `DELETE /api/clubs/{cid}` borra en orden players → teams → quotes → payments → club, devolviendo métricas por cada colección. Mostradas en el toast de éxito.
- **Home — segundo chevron**: añadida clase `fsc-bounce` al chevron debajo de "Conoce más de FSC" (`data-testid=finales-chevron`) para igualar la animación de rebote del chevron del hero.
- **Home — teléfono footer**: tamaño unificado al del email (`text-lg md:text-xl lg:text-2xl whitespace-nowrap`).
- **Tests**: `/app/backend/tests/test_iter40_delete_endpoints.py` — 8/8 PASS (cascada club, quote, payment, fixture; auth admin requerido, 401 sin token, 404 segunda llamada). Frontend verificado E2E por testing agent (4 modales abren, confirman, cierran, lista se refresca).
- **Cosmético menor**: `testIdPrefix` del modal de payments unificado a `admin-pay-delete-modal-{id}` (consistencia con trigger).


### 2026-02-25 — Galería Finales: transición slide horizontal
- Reemplazado el cambio brusco (fade simple) por **slide horizontal animado** con `framer-motion` (`AnimatePresence` + `motion.img`, `mode="popLayout"`).
- Nuevo estado `gDirection` (+1/-1) pasado como `custom` a AnimatePresence para que el slide entre/salga por el lado correcto: avance → nueva imagen entra desde la derecha, anterior sale hacia la izquierda. Retroceso (prev) invierte la dirección.
- Handler unificado `advanceGallery(dir)` reemplaza los dos onClicks previos y deja gIdx + gDirection en sincronía. Auto-rotate cada 5s también setea `gDirection=1`.
- Transición: `duration: 0.7s, ease: cubic-bezier(0.4, 0, 0.2, 1)`.
- Cada slot mantiene su ratio aspecto y `overflow-hidden` para recortar la imagen que sale.
- Flechas prev/next preservadas y funcionan con el mismo slide (sin saltos).

### 2026-02-25 — Galería de Finales con auto-rotación
- `Home.jsx`: nuevo `useEffect` que avanza `gIdx` cada **5 segundos** vía `setInterval`. Solo activo si `gallery.length > 3` (con ≤3 no aporta porque ya se ven todas). Cleanup al desmontar.
- `index.css`: keyframe `fsc-gallery-fade-in` (0.7s ease-out). Aplicado a cada `<img>` de la galería con `className="fsc-gallery-img"` + `key={img.id}` para que cada cambio de imagen tenga fade-in suave.
- Los botones manuales de prev/next se mantienen funcionales (siguen siendo CTAs explícitos del usuario).

### 2026-02-25 — Bug fix carrusel hero foreground (no se mostraba con 2+ imágenes)
- **Causa raíz**: en `ImageCarousel`, el wrapper para el caso multi-imagen aplicaba `style={{ position: "relative", ...style }}`. El `position: relative` inline ganaba sobre el `absolute` del Tailwind (`className="hidden md:block absolute right-4 ..."`) porque inline styles tienen mayor especificidad que las clases. Resultado: el wrapper quedaba en el flujo normal (no posicionado en la esquina derecha del hero), oculto detrás de los textos.
- **Fix**: el wrapper del caso multi-imagen ahora preserva el `className`/`style` del usuario sin modificarlos. Se añadió un **inner div** con `position: relative` (`width: 100%; height: 100%`) que sirve como contexto de posicionamiento para las `<img>` superpuestas. Esto permite que el outer wrapper conserve su `position: absolute` (de Tailwind) y posiciones de offset.
- **Mejora adicional**: el caso 1-imagen ahora renderiza un `<img>` plano sin wrapper (compat 100% con el markup original `<img src=...>`). El caso multi-imagen usa `height: 585px` fijo (en lugar de `height: 75%` percentage que no resolvía con parent `min-height`).
- Verificado vía API: backend persiste 5 URLs correctamente. Lint ✅ en los 2 archivos.

### 2026-02-25 — Bug fix carrusel multi-imagen + galería con imagen central destacada
- **Bug fix carrusel hero foreground**: el admin podía subir múltiples imágenes pero solo guardaba la primera. La causa era un doble `upd("hero_foreground_urls", arr); upd("hero_foreground_url", arr[0])` consecutivo: el segundo `setS` usaba el `s` obsoleto del closure y pisaba el array recién agregado. Fix: un solo `setS(prev => ({...}))` con functional updater, además de cambiar el helper `upd` a `setS(prev => ({...prev, [k]: v}))` para blindar el resto de las casillas contra el mismo patrón. Verificado vía PUT/GET con 3 URLs: el backend persiste el array correctamente.
- **Galería Finales — imagen central destacada**: cambio de `grid-cols-3` (3 columnas iguales) a `grid-cols-12` con `col-span-3` para las laterales y `col-span-6` para la central. La imagen del medio aparece al doble de ancho con `aspect-[16/11]` (más alta), `ring-4 ring-white` y `shadow-2xl` para destacarla visualmente.

### 2026-02-25 — 4 fixes post-animaciones (FOUC, timings, Counter bug, carrusel hero)
- **FOUC fix**: precarga de la fuente `PlaneCrash.ttf` vía `<link rel="preload" as="font">` en `index.html`. `fonts.css` cambia `font-display: swap` → `block`. Script inline aplica clase `fsc-fonts-ready` al `<html>` cuando `document.fonts.load("1em 'Plane Crash'")` resuelve (fallback 800ms). CSS regla: `html:not(.fsc-fonts-ready) .fsc-needs-plane-crash { visibility: hidden }`. Los títulos del hero (`EDICION`, `2026`) llevan la clase `fsc-needs-plane-crash` y permanecen invisibles hasta que la fuente cargue → cero parpadeo.
- **Animaciones más perceptibles**: durations actualizadas — `fsc-anim-hero-edition` 0.9s @ 0.1s delay; `fsc-anim-hero-year` 0.9s @ 0.4s delay (0.3s después de EDICIÓN); `fsc-anim-hero-badges` 0.7s @ 1.0s delay. Easing cambiado de `cubic-bezier(0.22, 1, 0.36, 1)` (snap final) → `cubic-bezier(0.4, 0, 0.2, 1)` (Material standard, movimiento más visible).
- **Counter bug fix**: `<Counter>` ahora acepta prop `transform` (función aplicada al string final). Home.jsx pasa `transform={planeCrashSafe}` para que el output "+10K" se renderice como "+10k" (la fuente Plane Crash sólo tiene glifos lowercase). Adicionalmente: al terminar la animación se renderiza el string ORIGINAL exacto (no formato de `toLocaleString`) para evitar discrepancias en separadores/decimales.
- **Carrusel hero foreground**: backend `HomeSettings` añadió campo `hero_foreground_urls: List[str]`. Nuevo componente `ImageCarousel.jsx` (crossfade automático cada 4.5s, fade 1s; si solo 1 imagen → estática, si 0 → null). Nuevo componente `ImageListUpload.jsx` en admin para subir/ordenar/eliminar múltiples imágenes con miniaturas + flechas izq/der. Backward compat: si `hero_foreground_urls` está vacío, usa `hero_foreground_url` único como fallback.

### 2026-02-25 — Animaciones FSC (framer-motion + CSS keyframes)
- **Dependencia añadida**: `framer-motion@12.42.0`.
- **Helpers reutilizables creados**:
  - `/components/AnimateIn.jsx` — wrapper one-shot vía `useInView({once:true})` con variantes `slide-up`, `slide-left`, `scale-up`, `zoom-in`, `fade`.
  - `/components/Counter.jsx` — contador con easing (cubic-out) que arranca al entrar al viewport. Maneja sufijos `K`/`M` (ej: "+1K", "+10K") preservándolos como string.
  - `/components/ChevronStack.jsx` — flecha decorativa (ya existente).
- **CSS keyframes globales** (`index.css`): `fsc-bounce-y` (chevron del hero, infinito), `fsc-pulse-ring + fsc-pulse-scale` (WhatsApp flotante, infinito), `fsc-hero-slide-left`/`fsc-hero-scale-up`/`fsc-hero-fade-up` (entrada del hero, con `animation-delay` escalonado).
- **Home — hero**: EDICIÓN slide-left, 2026 scale-up con delay, badges OCTUBRE/DICIEMBRE + chevron fade-up con delay (CSS, no framer-motion, por mayor confiabilidad). Badges convertidos a `<button>` con `onClick → scrollIntoView({behavior:'smooth'})` hacia la sección de stats. Chevron también clickable con el mismo destino. Chevron con bounce vertical infinito.
- **Home — Stats**: contadores animados (0 → valor) al entrar al viewport, vía `<Counter>`.
- **Home — Finales**: "FINALES" y subtítulo con slide-up al entrar al viewport.
- **Home — Eje Cafetero**: título con zoom-in, subtítulo con fade, mascota león con slide-up.
- **Home — Categorías**: hover en cada chip rojo aplica `scale(1.04)` + `brightness(1.1)` con transición 200ms.
- **Home — Footer**: bloque completo entra con slide-up al hacer scroll.
- **Home — WhatsApp flotante**: pulse infinito (ring expandido + scale 1↔1.06).
- **SecondaryHero**: usado por Nosotros/Eventos/Estadísticas/Contacto. Imagen de fondo fade-in al cargar; kicker fade con delay 0.1s; título slide-left; línea decorativa scaleX 0→1; body fade-up con delay 0.55s.
- **Noticias**: título slide-left + fade, posts/cards con slide-up staggered (0.1s entre cada uno).
- **Eventos**: cards "VIGENTES" y "ARCHIVO HISTORICO" con slide-up staggered.
- **Nosotros**: 4 pills (Reglamento, Partidos, Datos, Familia) con slide-up staggered.
- **Optimizaciones**: `will-change: transform, opacity`; `loading="lazy"` en imágenes de mascota y posts; one-shot via `viewport={{once:true}}` para que las animaciones de scroll no se repitan.
- **Nota de testing**: Playwright headless con `animation-delay > 0` muestra comportamiento inconsistente (currentTime no avanza), pero las clases CSS y `getAnimations()` reportan `state: running` correctamente. En navegadores reales (Chrome, Safari, Firefox, Edge desktop/mobile) las animaciones se ejecutan normalmente.

### 2026-02-25 — Footer email compacto + categorías más grandes + león agrandado + carnets con logo del club
- **Footer email** (en `Footer.jsx` y el footer rojo de `Home.jsx`): tamaño reducido de `text-3xl md:text-4xl lg:text-5xl break-all` → `text-lg md:text-xl lg:text-2xl whitespace-nowrap` para que entre en una sola línea sin quebrar.
- **Categorías dentro del recuadro rojo** (Festival/Premier): cajas `h-8 md:h-9` → `h-10 md:h-12`, texto `text-sm md:text-base` → `text-lg md:text-xl` para mejor legibilidad.
- **Mascota / León** (sección Comfenalco Soleden): tamaño aumentado de `max-h-680/500` → `max-h-780/600` (desktop/mobile).
- **Carnets — logo del club**: el carnet ahora muestra el logo del CLUB del jugador en la cabecera izquierda (antes era el logo corporativo FSC). Lookup vía `clubs catalog` por `team.club_id` con fallback a `team.club_name`. En `/jugadores/{id}` se hace fetch directo a `/api/clubs/{cid}` para obtener el `logo_url`. Si el club no tiene logo, se mantiene el FSC_LOGO como fallback. Tamaño del logo del club aumentado a `h-14 w-14` (antes 12×12) con fondo blanco para mejor visibilidad sobre el gradiente del carnet.

### 2026-02-25 — Ajustes sección Comfenalco Soleden + nueva flecha ChevronStack
- **FESTIVAL / PREMIER títulos editables**: agregados campos `festival_title` y `premier_title` al modelo `HomeSettings` (defaults: "FESTIVAL", "PREMIER") y al admin CMS `/admin/home`.
- **Logo + título coexisten**: en `CategoryColumn`, si subes un logo ya NO reemplaza al texto. Ambos se renderizan lado a lado (logo a 40 px de alto + título en Plane Crash rojo).
- **Mascota (león)**: eliminada la imagen fallback de Unsplash. Si `mascot_image_url` está vacío, no se renderiza nada (sin placeholder). Tamaño aumentado: desktop `max-h-[680px]` (antes 520), mobile `max-h-[500px]` (antes 400).
- **Categorías visibles**: dentro de los cajones rojos (Festival/Premier), el nombre de cada categoría ahora aparece en texto blanco bold (`AGENCY_FB`, centrado, height `h-8 md:h-9`). Antes solo era accesible para screen readers.
- **Flecha decorativa nueva — `ChevronStack`**: componente reutilizable en `/components/ChevronStack.jsx` que renderiza 5 chevrones apilados con opacidad decreciente (1 → 0.4) y stroke decreciente, imitando exactamente la referencia visual del usuario. Props: `color`, `size`, `direction` (up/down), `count`. Reemplaza los 2 ChevronUp anteriores tanto en el hero (blanco, hacia abajo) como en la sección Finales (azul, hacia arriba).

### 2026-02-25 — Optimización: conversión automática de imágenes a WebP en upload
- Endpoint `POST /api/upload` ahora convierte automáticamente todo upload raster (JPG/JPEG/JFIF/PNG/APNG/GIF/BMP/DIB/TIFF/WebP) a formato **WebP** vía Pillow.
- Se excluyen: SVG (vector), PDF, ICO, formatos RAW y HEIC/HEIF/AVIF (sin librería nativa).
- Soporte completo de imágenes animadas (GIF/APNG/WebP animado) con preservación de frames y duraciones.
- Calidad: `quality=82, method=6` (mejor relación calidad/tamaño).
- Si el WebP resulta ≥ que el original (raro, fotos ya muy comprimidas), conserva el original — excepto para formatos pesados por naturaleza (BMP/TIFF/PNG) donde siempre se fuerza la conversión.
- Pruebas medidas en pod: PNG simple −68.8%, JPG q95 −88.6%. Content-Type `image/webp` correctamente servido.
- Archivos existentes NO se migran retroactivamente. Solo los uploads nuevos.

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
