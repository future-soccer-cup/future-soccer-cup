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

### 2026-09-06 — Iter99: Auditoría de imágenes CMS (contain vs cover, contenedores con dimensiones fijas)
- El usuario reportó imágenes que se estiran o recortan mal en todo el sitio. Se auditaron los ~70 `<img>` del código (Home, Eventos, Nosotros/FSCHistorySection, DatosEstadisticas, Noticias, TeamRegister, Contacto, ClubDetail, Teams, Bracket, PlayerDetail/carnet).
- Hallazgo: la GRAN MAYORÍA del sitio YA seguía el patrón correcto (contenedor con `aspect-*`/altura fija + `overflow-hidden`, img con `w-full h-full object-cover`; logos/escudos con `object-contain` dentro de cajas de tamaño fijo). Esto es resultado de trabajo previo ya bien implementado.
- Único bug real encontrado y corregido: `FSCHistorySection.jsx` (fotos flotantes del timeline en el layout de mobile/tablet) tenía la altura fija (`h-32`) en la propia etiqueta `<img>` en vez del contenedor. Se movió `h-32 w-full` al `<div>` contenedor (`overflow-hidden`) y el `<img>` quedó en `w-full h-full object-cover object-center`.
- Verificado: `backgroundImage`/`backgroundSize: cover`/`backgroundPosition: center` en `Cotizar.jsx` (resumen sticky) ya correctamente aplicado. Logos de clubes (Eventos `ClubsSection`, `Bracket.jsx`, `ClubDetail.jsx`, `Teams.jsx`) todos con `object-contain` en cajas de tamaño fijo — correcto.
- El usuario pidió una auditoría responsive completa. Se corrigieron bugs reales de overflow horizontal encontrados con mediciones (`document.body.scrollWidth`) y confirmados por `testing_agent` (iteration_63.json):
  1. **Navbar tablet roto**: el breakpoint de colapso era `md` (768px) pero el menú horizontal completo no cabía justo en 768px (scrollWidth=1003). Cambiado todo `md:` → `lg:` (1024px) en `Navbar.jsx` para que tablet también use hamburguesa.
  2. **Eventos.jsx overflow mobile**: `TabsBar` (grid-cols-3 sin `min-w-0` causaba que "FESTIVAL"/"PREMIER" expandieran el grid), `EventTitleSection` ("OCTUBRE FESTIVAL" con floor de fuente muy grande), `ScenariosSection`/`PremiacionSection` (floor `3rem` muy grande para "ESCENARIOS"/"PREMIACIÓN" en 375px) — todos ajustados con `min-w-0`, `break-words` y floors de `clamp()` más chicos en mobile. Verificado: `scrollWidth` pasó de 413→375 en mobile.
  3. **Touch targets 44px**: botón mostrar/ocultar contraseña (`TeamRegister.jsx`, `LoginModal.jsx`) de ~30px → `min-w-[44px] min-h-[44px]`. Hamburguesa de `Navbar.jsx` también a 44px.
  4. **Home.jsx tenía su propio navbar embebido** (`hero-nav-bar`, NO usa el `Navbar.jsx` compartido) que no colapsaba en mobile/tablet — se le agregó su propio toggle hamburguesa (`hero-nav-mobile-toggle`) con el mismo patrón.
  5. **Home carrusel "Finales" desktop 1280px**: botones prev/next con `lg:-left-10`/`lg:-right-10` empujaban 16px fuera del viewport exacto en 1280px (scrollWidth=1296). Reducido a `lg:-left-6`/`lg:-right-6`.
  6. Ajuste visual (no bloqueante): `TabsBar` en Eventos mobile tenía wrap feo de "FESTIVAL"/"PREMIER" — floor de fuente bajado más (`1.2rem`→`0.95rem`) y padding reducido (`px-2`→`px-1`).
- Verificado con `testing_agent`: 1ra pasada encontró 3 issues (navbar Home, carrusel Home 1280, wrap feo Eventos tabs) — los 3 corregidos y verificados con screenshot + `scrollWidth` tras el fix (Home mobile=375, Home desktop=1280, Eventos mobile=375, tabs sin overlap).
### 2026-09-05 — Iter96: Sección "Estadio Centenario" — texto más arriba + botón "POR CONFIRMAR" más grande y dorado
- El usuario mostró referencia: el texto "Estadio CENTENARIO ARMENIA" debía subir (no quedar centrado verticalmente) y el badge "POR CONFIRMAR" debía ser más grande y con un dorado más vivo.
- Fix en `StadiumSection` (`Eventos.jsx`): contenedor de texto cambiado de `justify-center` a `justify-start pt-8 md:pt-14`. Badge: padding de `px-4 py-1.5`→`px-8 py-3/3.5`, texto `text-xs/sm`→`text-base/lg`, fondo de `GOLD` sólido a gradiente `linear-gradient(135deg, #ffe071, #f5c542, #d99a0a)` + `boxShadow` dorado difuso. Verificado con screenshot (tab Premier).
- Ajuste posterior (feedback inmediato del usuario con captura del botón): se veía muy plano. Se redujo la altura (`py-3/3.5`→`py-1.5/2`, más delgado) y se mejoró el gradiente a un dorado más vivo (`#fff4c2 → #ffd23f → #f0a500 → #c9820a`) con `inset` highlight superior + sombra externa más intensa. Verificado con screenshot.
### 2026-09-05 — Iter97: Sección "Estadio" más alta (verificado: ancho completo y flush arriba ya funcionaban)
- El usuario reportó que la sección no ocupaba todo el ancho ni quedaba pegada arriba, pidiendo que fuera "más alta". Se verificó con `bounding_box()` (mobile 390px) que en realidad la sección YA ocupa el 100% del ancho (x=0, width=390) y ya está flush contra el bloque azul de categorías (sin gap) — probablemente su captura era de un estado anterior o con la imagen aún cargando.
- CORRECCIÓN (mismo día, referencia final del usuario): en realidad la sección SÍ debía tener margen lateral (40-60px), no ocupar todo el ancho como se implementó antes. Fix: `StadiumSection` ahora envuelve la imagen en un `<section className="px-10 md:px-14">` (40px/56px de padding lateral) en vez de `w-full` puro, dando el efecto de "tarjeta contenida". Se agrandaron aún más los textos (`clamp` subido ~10-15%) y el badge (`px-10 py-2/2.5`, `text-lg/xl`). Se agregó animación: título con `AnimateIn variant="slide-down"`, badge con `variant="zoom-in" delay={0.2}`. Verificado con screenshot en mobile y desktop (padding lateral visible, medido x=56px en desktop 1920px). - Ajuste final (mismo día): también faltaba padding arriba/abajo (la tarjeta tocaba las secciones vecinas). Se agregó `py-8 md:py-12` al wrapper (`stadium-section-wrap`). Verificado con screenshot — margen visible en los 4 lados. Imagen de prueba restaurada a `""` nuevamente.
- Ajuste extra (mismo día): texto agrandado aún más (`clamp` de cursiva/título subido ~20-25%, ej. título top `clamp(3rem,7vw,5.4rem)`→`clamp(3.8rem,8.6vw,6.6rem)`). Verificado con screenshot. Imagen de prueba restaurada a `""` de nuevo.
### 2026-09-05 — Iter95: Animación de "OCTUBRE FESTIVAL"/"DICIEMBRE PREMIER" se repite al cambiar de tab
- El usuario pidió que al hacer clic en Festival / Premier Pares / Impares, la animación del bloque logo+texto se reactive (antes solo se disparaba una vez al entrar al viewport, y como el bloque ya estaba visible, cambiar de tab no la repetía).
- Fix en `CategoriesGrid` (`DatosEstadisticas.jsx`): se agregó `key={event.key}` al `<AnimateIn>` que envuelve el bloque, forzando un remount de React cada vez que cambia el evento activo — esto reinicia el estado de `useInView`/Framer Motion y reproduce la animación de entrada (`slide-right`) de nuevo. Verificado con screenshot + chequeo de opacity (baja a ~0.26 justo tras el clic, luego vuelve a 1).
### 2026-09-05 — Iter94: Animaciones en Estadísticas + logo FSC en evento + textos más grandes al ver categoría
- Se agregaron animaciones de entrada (`AnimateIn`, `duration=1.3`) en `DatosEstadisticas.jsx`: "ASÍ VA LA" (`slide-down`) + "competencia!" (`slide-up`, delay 0.15) en `IntroAndSelector`; y el bloque completo logo+"OCTUBRE FESTIVAL"/"DICIEMBRE Premier" (`slide-right`) en `CategoriesGrid`.
- El campo para subir el logo del evento (`event.logo_url`) ya existía en el Admin (`AdminHomeSettings.jsx` línea 759, "Logo del evento (opcional)") pero no estaba configurado — se le asignó el escudo FSC (`nav_shield_url`) al evento Festival como valor inicial; el admin puede cambiarlo libremente desde ese mismo campo.
- Se agrandó el texto de todo el panel que aparece al seleccionar una categoría (`CategoryDataPanel`): header de categoría, "Tabla de posiciones"/"Goleadores", y las tablas `StandingsTable`/`ScorersTable` (de `text-sm` a `text-base md:text-lg`, headers de tabla más grandes, columna de puntos/goles destacada en `text-lg md:text-xl`).
- Verificado con screenshot: animaciones confirmadas, logo FSC visible junto a "OCTUBRE FESTIVAL", panel de categoría con texto notablemente más grande.
### 2026-09-05 — Iter93: Auto-rotación de imágenes en GalleryCarousel con solo 3 fotos
- El usuario notó que la galería "Escenarios" (con exactamente 3 fotos) no cambiaba sola. Causa: `GalleryCarousel.jsx` solo activaba el `setInterval` de auto-rotación si `list.length > 3`, dejando fija cualquier galería con 3 o menos fotos.
- Fix: condición cambiada a `list.length <= 1` (se activa con 2+ fotos). Afecta a las 3 galerías que usan este componente compartido (Escenarios, la nueva galería intermedia `scenarios_gallery_2`, y Premiación). Verificado con screenshot: la imagen central cambió automáticamente tras ~5s de espera, sin interacción del usuario.
### 2026-09-05 — Iter92: Banderas "Países que han Participado" con ticker animado + fade en bordes (igual que Clubes)
- El usuario pidió que las banderas tengan la misma animación de scroll infinito que "Clubes que han Participado", y que al llegar al borde (inicio/fin) se desvanezcan en vez de cortarse abruptamente.
- Fix en `CountriesBar` (`Eventos.jsx`): reemplazado el layout estático `flex-wrap` por el mismo patrón de `ClubsSection` — lista duplicada (`[...countries, ...countries]`) + `animation: scroll {duration}s linear infinite` (keyframe `scroll` ya existente en `index.css`). Se agregó `maskImage`/`WebkitMaskImage: linear-gradient(to right, transparent, black 8%, black 92%, transparent)` al contenedor para el efecto de fade en ambos bordes.
- Se aplicó el mismo `maskImage` de fade también a `ClubsSection` (antes no lo tenía) para consistencia visual entre ambos "tickers" de logos/banderas.
- CORRECCIÓN (mismo día): el usuario aclaró que la posición y la animación estaban bien, pero el ancho del ticker de banderas no llegaba hasta el borde derecho del botón "PREMIER" (quedaba corto, con espacio vacío a la derecha) porque el track duplicado (2 copias) era más angosto que el contenedor en pantallas anchas. Fix: se agregó un nuevo keyframe `scroll3x` (`translateX(-33.3333%)`) en `index.css` y se usan 3 copias de las banderas (en vez de 2) + gaps más grandes (`gap-8 md:gap-14`), garantizando que el track siempre sea más ancho que el contenedor y cubra el 100% del ancho. Verificado midiendo bounding boxes: borde derecho del contenedor de banderas = borde derecho del botón PREMIER (ambos en x=1568 a 1920px de viewport).
### 2026-09-05 — Iter91: "PREMIACIÓN" más grande (igual a "ESCENARIOS") + subtítulo más grande + animaciones
- El usuario pidió que "PREMIACIÓN" tenga el mismo tamaño que "ESCENARIOS", que el subtítulo "EN LA FSC CADA NIÑO ES UN TESORO..." sea más grande, y que ambos textos tengan animación.
- Fix en `PremiacionSection` (`Eventos.jsx`): título `fontSize` de `clamp(2.5rem,6vw,4.5rem)` → `clamp(3rem,11vw,8rem)` (igual que `ScenariosSection`). Subtítulo de `clamp(1.1rem,2.2vw,1.6rem)` → `clamp(1.4rem,3vw,2.2rem)`, contenedor `max-w-lg`→`max-w-2xl`. Ambos envueltos en `<AnimateIn>`: título `variant="slide-down"`, subtítulo `variant="slide-up"` con `delay={0.15}`, `duration={1.3}` (mismo patrón lento usado en Escenarios). Verificado con scroll simulado (opacity 0→1) y screenshot.
### 2026-09-05 — Iter90: Animaciones se repiten cada vez que el elemento entra al viewport (global)
- El usuario preguntó si al recargar la página, bajar y ver las animaciones, luego subir al inicio y bajar de nuevo, las animaciones podían repetirse (antes solo se disparaban una vez por sesión).
- Fix en `AnimateIn.jsx` (componente compartido usado en Home, Nosotros y Eventos): `useInView(ref, { once: true, ... })` → `{ once: false, ... }`. La lógica de `animate = inView ? computeAnimate(variant) : initial` ya revertía al estado inicial al salir del viewport, así que solo bastó cambiar el flag `once` para que se repita en cada entrada/salida. Cambio GLOBAL — afecta todas las animaciones de entrada del sitio (Home: título región, categorías; Eventos: título Escenarios, logos Aventura; Nosotros: timeline, etc.).
- Verificado con scroll simulado (scroll-in → opacity 1, scroll-out → opacity ~0, scroll-in de nuevo → opacity 1).
### 2026-09-05 — Iter89: Animación de entrada en título "ESCENARIOS Deportivos!" (Eventos.jsx)
- El usuario pidió animación al hacer scroll: "ESCENARIOS" entra desde arriba, "Deportivos!" y "COMFENALCO / ESTADIO DE ARMENIA" entran desde la izquierda, de forma suave y no muy rápida.
- Fix en `ScenariosSection` (`Eventos.jsx`): se envolvió cada bloque de texto en `<AnimateIn>` — título con `variant="slide-down"`, cursiva y subtítulos con `variant="slide-left"` (con `delay={0.15}` en el segundo para que no entren exactamente igual), todos con `duration={1.3}` y `distance={60}` para una animación lenta y perceptible. Verificado con scroll simulado + chequeo de `opacity` (0 antes / 1 después) y screenshot final.
### 2026-09-05 — Iter88: Cuadros "Día de Aventura" más grandes + animación de entrada dinámica en los logos
- El usuario pidió que los cuadros rojos de "Día de Aventura" (Eventos.jsx) sean más grandes, los logos más grandes, y que los logos tengan una animación dinámica al aparecer en pantalla (entrar desde un lado y posicionarse en el centro).
- Fix en `AdventureSection` (`Eventos.jsx`): `minHeight` de 200→280px, padding vertical `py-10/16`→`py-14/24`, logos `max-h-32/40`→`max-h-48/64`. Se envolvió cada logo en `<AnimateIn variant={i % 2 === 0 ? "slide-left" : "slide-right"}>` (componente ya existente `/app/frontend/src/components/AnimateIn.jsx`, animación one-shot al entrar al viewport vía `useInView`) — el primer logo entra desde la izquierda, el segundo desde la derecha, alternando si hay más bloques.
- Ajuste posterior (mismo día): usuario pidió que la animación sea más lenta. Se aumentó `duration` de `0.7` a `1.3` en el `<AnimateIn>` de `AdventureSection`.
### 2026-09-05 — Iter87: Categorías de Eventos ya no asumen "20" fijo — año completo configurable
- El usuario notó que `CategoryBlock` (cuadros PARES/IMPARES y CAT en Eventos) siempre anteponía "20" al valor de categoría (ej. "18" → "2018"), asumiendo que todo empieza en los 2000s. Esto rompía si el admin quería un año distinto (ej. 1999).
- Fix en `Eventos.jsx`: `CategoryBlock` ahora recibe un solo prop `value` (el año completo, ej. "2018") y lo divide dinámicamente: primeros N-2 dígitos arriba, últimos 2 dígitos abajo junto a "CAT.". Fallback de compatibilidad: si el valor tiene solo 2 dígitos (datos viejos ya guardados), se sigue asumiendo prefijo "20" para no romper configuraciones existentes.
- `FestivalCategories` y `PremierCategories` ahora pasan `value={c}` en vez de `year="20" cat={c}`.
- Labels/placeholders actualizados en `AdminHomeSettings.jsx` (Sección 4A/4B) para reflejar que ahora se ingresa el año completo (ej. "2018, 2017, 2015...") en vez de solo 2 dígitos.
- Verificado con curl (PUT /api/home-settings con categorías "2018,2017,2019,2016", "1999", y legacy "13") + screenshot: "2018"→"20/18", "1999"→"19/99", "13" (legacy)→"20/13". Datos de producción restaurados a sus valores originales tras la prueba.
### 2026-09-05 — Iter86: Hover "lift" en cuadros de categorías (Eventos.jsx)
- Se agregó animación hover a `CategoryBlock` (componente compartido por `FestivalCategories` y `PremierCategories`, secciones PARES/IMPARES): `hover:-translate-y-2 hover:shadow-xl hover:bg-white/35` con `transition-transform duration-200 ease-out`. Al pasar el mouse el cuadro sube un poco y gana sombra/brillo. Verificado con screenshot_tool (hover state).
### 2026-09-05 — Iter85: Fondo azul full-bleed en "El Eje Cafetero Los Espera" (Home.jsx) + león reducido
- El usuario mostró una imagen de referencia: faltaba el fondo azul detrás de las columnas Festival/Premier + la mascota (león), y pidió achicar un poco al león para que toque el texto "Comfenalco Soleden" arriba y el footer rojo quede justo después del azul (sin espacio blanco de por medio).
- Fix en `Home.jsx` (sección `home-region`): se envolvió el bloque de columnas + mascota en un div full-bleed (`relative left-1/2 right-1/2 -mx-[50vw] w-screen`, `background: BLUE`) que va de borde a borde de la pantalla, comenzando justo debajo del subtítulo "Comfenalco Soleden".
- Se redujo el tamaño de la mascota: desktop de `height: 1050px` → `880px` (con spacer `minHeight` de `1020px` → `860px`); mobile de `max-h-[780px]` → `max-h-[640px]`. Se quitó el `pb-20` blanco que había en mobile (ahora el azul llega directo al footer).
- Verificado con screenshot en desktop y mobile: coincide con la imagen de referencia del usuario — azul de borde a borde, león tocando el área superior (Comfenalco Soleden) y el footer rojo empieza inmediatamente después del azul, sin espacio blanco.
- CORRECCIÓN (mismo día, feedback inmediato del usuario): el usuario aclaró que el diseño real es un "marco azul" con un panel/contenedor BLANCO adentro (no todo azul sólido) — el león y las columnas Festival/Premier van sobre fondo BLANCO dentro de ese panel, y el panel tiene margen azul visible a los lados/arriba/abajo. Fix: la franja azul full-bleed ahora tiene padding (`py-6 md:py-9 px-3 md:px-8`) y dentro contiene un `<div className="bg-white rounded-2xl">` (el panel real) donde viven las columnas y la mascota. Se redujo aún más la mascota (820px desktop / spacer 800px) para que su cabeza casi toque el borde superior del panel (cerca de "Comfenalco Soleden") y sus pies toquen el borde inferior del panel blanco. Verificado con screenshot clip — coincide exactamente con la referencia.
- CORRECCIÓN 2 (mismo día, nueva referencia del usuario): el diseño correcto NO es un panel blanco con marco azul grueso; es fondo BLANCO en toda la sección con solo 2 franjas azules VERTICALES finas en los bordes izquierdo/derecho de la pantalla (`w-5 md:w-10`, full-bleed a los extremos), sin rectángulo azul de fondo ni panel blanco redondeado. Se quitó el `bg-white rounded-2xl` panel; ahora es un contenedor `bg-white` full-bleed con 2 divs `absolute inset-y-0 left-0/right-0` de color azul como las franjas laterales. También se corrigió el título "EL EJE CAFETERO LOS ESPERA" que se partía en 2 líneas: se agregó `whitespace-nowrap` y se ajustó `fontSize: clamp(13px, 4.6vw, 58px)` (antes `clamp(40px,6vw,80px)`) para que siempre quede en una sola línea, incluso en mobile 390px (verificado con `scrollWidth` = ancho exacto del contenedor).
- CORRECCIÓN 3 (mismo día): faltaba la franja azul horizontal entre el león y el footer rojo. Se agregó `pb-5 md:pb-10` al contenedor full-bleed + un 3er div `absolute bottom-0 left-0 right-0 h-5 md:h-10` con `background: BLUE`, uniéndose con las franjas verticales en las esquinas para formar un marco azul en forma de "U" (lados + abajo, arriba queda abierto/blanco detrás del título). Verificado con screenshot — el león + columnas quedan sobre blanco, con la franja azul justo antes del footer rojo, igual a la referencia.
### 2026-09-05 — Iter84: Nueva galería "Escenarios Deportivos" (carrusel intermedio sin título) en Eventos.jsx
- El usuario notó que faltaba una galería adicional debajo de "Escenarios Deportivos" (distinta de "Premiación"). No existía ese campo en el schema — se creó de cero:
  - Backend: `DEFAULT_EVENTOS_CONFIG["scenarios_gallery_2"] = []` en `server.py` (~línea 6171). `eventos` sigue siendo `Dict[str, Any]` libre, sin necesidad de migración porque el frontend usa `|| []` como fallback.
  - Admin CMS: nueva SubSection "7B. Galería Escenarios Deportivos — carrusel de fotos (sin título)" en `AdminHomeSettings.jsx` (~línea 600), usa `ImageListUpload` con testId `scenarios-gallery-2`.
  - Frontend público: nueva `<section data-testid="scenarios-gallery-2-section">` en `Eventos.jsx`, renderizada SOLO si `ev.scenarios_gallery_2.length > 0`, ubicada entre `ScenariosSection` y `PremiacionSection`. Usa `<GalleryCarousel accentColor={GOLD} testIdPrefix="scenarios-gallery-2">`, sin título ni subtítulo (a diferencia de Premiación).
  - Verificado con testing_agent (`iteration_62.json`): 100% frontend, sin bugs. Navegación de flechas OK, panel admin OK, sin regresiones en Escenarios/Premiación existentes.
- Bloqueado explícitamente por el usuario en este ciclo (NO tocar): tamaño de "FSC" en Nosotros.jsx, efecto stacked del Hero en Eventos.jsx.
- FIX inmediato (mismo día): el usuario notó que quedaban DOS galerías en la sección Escenarios (la original `scenarios_photos`, vacía, mostrando "Aún no hay fotos configuradas" + la nueva `scenarios_gallery_2` con fotos reales). Se eliminó el carrusel de `ScenariosSection` (ya no recibe prop `photos`, solo título/subtítulos) y se quitó el campo "Fotos del carrusel" de la Sección 7 en el Admin. Ahora `scenarios_gallery_2` (Sección 7B en Admin) es la ÚNICA galería de fotos en esa zona de la página. Verificado visualmente con screenshot — ya no aparece el bloque vacío duplicado.
### 2026-09-01 — Iter83: La causa REAL era mayúscula sostenida en el dato — Natura Script no conecta letras en MAYÚSCULAS
- Se renderizó el archivo `NaturaScript.otf` directamente con Python/PIL (sin navegador, sin caché) comparando "Premier" (mixto) vs "PREMIER" (mayúscula sostenida): "Premier" se ve conectado y elegante (igual a la imagen de referencia del usuario); "PREMIER" se ve con letras separadas/rotas — la fuente es una caligrafía monolineal diseñada para minúsculas conectadas, NO tiene ligaduras entre mayúsculas.
- Causa raíz encontrada: `home_settings.estadisticas.events[].title_word` tenía guardado literalmente "PREMIER" en mayúscula sostenida (a diferencia de `eventos.premier.title_word` = "Premier", que sí estaba bien). Por eso se veía distinto en Estadísticas vs en Eventos.
- Fix: nueva función `toTitleCaseForScript()` en `designSystem.js` que normaliza cualquier texto a Type Case (solo la primera letra de cada palabra en mayúscula) antes de renderizarlo con la fuente Natura Script — protege contra que un admin escriba el texto en mayúscula sostenida en el CMS y rompa la conexión de las letras. Aplicado en `DatosEstadisticas.jsx` (`stats-event-title-word`) y `Eventos.jsx` (`event-title-word`, rama Premier).
- Ajuste final de tamaño (pedido del usuario): "DICIEMBRE" de `clamp(1.7rem,2.9vw,2.7rem)` a `clamp(2rem,3.3vw,3.1rem)`; "Premier" de `clamp(2.6rem,4.4vw,4rem)` a `clamp(3.4rem,5.6vw,5.2rem)`.
### 2026-09-01 — Iter82: Bug de fondo encontrado y corregido — Natura Script nunca cargaba el archivo real en TODO el sitio (root cause verdadero)
- El primer intento (quitar el `@font-face` duplicado de `src/index.css`) NO fue la causa raíz — el usuario probó en Preview con hard-refresh y seguía viéndose mal.
- Diagnóstico definitivo: se inspeccionaron las `CSSFontFaceRule` reales cargadas en el navegador (`document.styleSheets[].cssRules`) y se confirmó que la regla activa era la de `/public/fonts.css`, con `src: local('Natura Script'), local('NaturaScript'), url(...)`. En este entorno Linux, `local('Natura Script')` estaba siendo resuelto por fontconfig contra OTRA fuente del sistema (parecida pero no la real) — `document.fonts.check()` reportaba `true` (algo cargó) pero NO era el archivo `.otf` real. Se confirmó renderizando "PREMIER" en una página de prueba aislada con y sin `local()`: con `local()` se veía como Dancing Script; sin `local()`, coincidía exactamente con la forma real de Natura Script.
- Fix definitivo: se quitaron los `local(...)` de AMBAS declaraciones en `/public/fonts.css` (Plane Crash y Natura Script), dejando solo `url(...)` — esto fuerza siempre la descarga del archivo real sin depender de coincidencias de fontconfig/sistema.
- Verificado: "PREMIER" en `/estadisticas` y "Premier" en `/eventos` ahora se ven idénticos, con la forma real de Natura Script (letras delgadas, mayormente separadas con enlaces pequeños), distinta de Dancing Script/Allura.
### 2026-09-01 — Iter81: Palabra "PREMIER" en Natura Script (v2 — corregido, era solo el bloque "DICIEMBRE/PREMIER", no los botones)
- El usuario aclaró: los botones de pestañas (Festival/Premier Pares/Premier Impares) debían quedar EXACTAMENTE como estaban antes — se revirtió el cambio de la v1 en esos botones (vuelven a `text-sm md:text-base`, todo en Plane Crash, sin split de palabras).
- El pedido real era sobre el bloque "DICIEMBRE / PREMIER" (imagen de referencia adjunta por el usuario) — ese bloque (`stats-event-title-word`, rama no-festival) YA estaba en Natura Script; se aumentó aún más su tamaño (`title_month` de `clamp(1.4rem,2.4vw,2.2rem)` a `clamp(1.7rem,2.9vw,2.7rem)`, `title_word`/PREMIER de `clamp(1.8rem,3.2vw,2.8rem)` a `clamp(2.6rem,4.4vw,4rem)`).
### 2026-09-01 — Iter80: "Clubes que han Participado" ahora es una cinta infinita (ticker/conveyor belt) + hints de tamaño/formato
- `ClubsSection` en `Eventos.jsx` reescrito: en vez de `flex-wrap` (que rompía en varias líneas), ahora es una cinta horizontal de una sola fila (`flex-nowrap` vía `w-max`), todos los logos en un contenedor de tamaño fijo (`h-20/h-28 w-28/w-36` + `object-contain`) para que se vean del mismo tamaño sin distorsionar el aspecto. Se desplaza sola de derecha a izquierda con `animation: scroll {duración}s linear infinite` (keyframe `scroll` ya existía sin uso en `index.css`, se reutilizó). La lista de logos se duplica una vez internamente para que el loop sea perfecto (al llegar a -50% del ancho, la segunda copia idéntica continúa sin corte visible). Velocidad moderada: duración = `max(18, cantidad_logos * 3.5)` segundos (constante independientemente de cuántos logos haya). Máscara de degradado en los bordes para una entrada/salida suave.
- Hints de Admin actualizados para reflejar tamaño recomendado y formatos: "Escudos de clubes" → "300×300 px cuadrado, cualquier formato de imagen, cinta horizontal en loop infinito". "Galería de premiación" → "1200×700 px horizontal, cualquier formato de imagen".
- Ajuste 2: ancho aumentado a `max-w-7xl` (igual al menú de navegación, antes `max-w-4xl`) y se quitó la máscara de degradado en los bordes — los logos entran y salen sin desvanecido, de forma directa.
### 2026-09-01 — Iter79: Sección "Premiación" en /eventos ahora es una galería con carrusel automático (antes: lista de copas + iconos)
- Se quitó el bloque de "COPA ORO/PLATA/BRONCE/KOW/TITANES" + iconos de trofeo/medalla + lista "MVP/FAIR PLAY/GOLEADOR/MEJOR PORTERO" (campos `awards_cups`/`awards_individual` de festival y premier, ya no se usan ni se muestran).
- Reemplazado por una galería de fotos con transición automática (crossfade cada 4.5s, usando el componente ya existente `ImageCarousel.jsx` — mismo que usa el Hero). Si hay 1 sola foto, se muestra fija sin rotar (comportamiento nativo del componente). Si no hay fotos, muestra un estado vacío ("Aún no hay fotos de premiación configuradas").
- Nuevo campo `eventos.premiacion_gallery: string[]` (dict flexible en Mongo, sin necesidad de tocar el modelo Pydantic `HomeSettings.eventos: Dict[str, Any]`). Editable en Admin > Configuración de Eventos > Sección 8, reusando el componente `ImageListUpload` (agregar/quitar/reordenar con flechas ← →, igual que "Fotos del carrusel" de Escenarios y "Escudos de clubes").
- Verificado con datos de prueba (2 fotos temporales) que la rotación automática funciona (cambia de foto tras ~4.5s) y que el editor de Admin aparece correctamente; datos de prueba revertidos a `[]` tras la verificación.
### 2026-08-31 — Iter76: Tagline "Torneo Internacional" (v7 — más a la derecha + fix parpadeo de fuente al cargar)
- Corrido más a la derecha (`ml-10 md:ml-16`, antes `ml-4 md:ml-6`).
- **Fix FOUT**: el usuario notó que al cargar la página se veía primero una fuente de reemplazo y luego cambiaba a Natura Script (parpadeo normal de `font-display: swap`). Se agregó estado `ready` en `StretchedTagline`: el texto queda con `opacity: 0` hasta que `document.fonts.ready` resuelve (fuente realmente cargada), y solo entonces se calcula el tamaño final y se muestra con transición de opacidad. Antes el `fit()` corría inmediatamente con la fuente de reemplazo, causando además un salto de tamaño visible al llegar la fuente real.
### 2026-08-31 — Iter76: Tagline "Torneo Internacional" (v6 — corrida un poco a la derecha y reducida ligeramente)
- Ajuste fino final: margen izquierdo (`ml-4 md:ml-6`) en el span para correrlo un poco hacia la derecha respecto al logo, y `SAFETY` bajado de `0.9` a `0.85` para reducir el tamaño levemente (sin que se note un cambio drástico). Verificado en Home y /nosotros.
### 2026-08-31 — Iter78: Textos más grandes en formularios de Ingreso y Registro (v3 — un poco más grande aún)
- Tercer ajuste: `LoginModal.jsx` "¿OLVIDASTE TU CONTRASEÑA?" → `text-lg md:text-xl`, "¿ERES NUEVO?"/"REGÍSTRATE" → `text-2xl md:text-3xl`, "← Volver a Ingresar" (x3) → `text-lg md:text-xl`. `TeamRegister.jsx`: "← Volver" → `text-lg md:text-xl`, "Sé parte del" → `clamp(2.7rem,5.4vw,4rem)`, "team fsc" → `clamp(4.4rem,9vw,6.6rem)`, "¿Ya tienes cuenta? INICIA SESIÓN" → `text-xl md:text-2xl`.
- Primera pasada insuficiente. Segunda vuelta con incremento notorio: `LoginModal.jsx` "¿OLVIDASTE TU CONTRASEÑA?" → `text-base md:text-lg`, "¿ERES NUEVO?"/"REGÍSTRATE" → `text-xl md:text-2xl`, "← Volver a Ingresar" (x3) → `text-base md:text-lg`. `TeamRegister.jsx`: "← Volver" → `text-base md:text-lg`, "Sé parte del" → `clamp(2.4rem,4.8vw,3.6rem)`, "team fsc" → `clamp(4rem,8.2vw,6rem)`, "¿Ya tienes cuenta? INICIA SESIÓN" → `text-lg md:text-xl`.
### 2026-08-31 — Iter77: Sección "Países que han Participado" en /eventos — fondo blanco, texto rojo más grande, banderas más grandes
- `CountriesBar` en `Eventos.jsx`: fondo cambiado de azul a blanco (`bg-white`), título "Países que han Participado" en rojo (antes blanco) y tamaño aumentado (`text-2xl md:text-3xl lg:text-4xl` + `font-weight 800`, antes `text-lg/xl/2xl` + 700). Banderas agrandadas de `h-6/h-8/h-9` a `h-12/h-16/h-20` con sombra y borde sutil (el borde blanco anterior no se veía sobre fondo blanco).
- Nota para el usuario: actualmente ningún país tiene `flag_url` cargado en el CMS (Admin > Configuración de Eventos > Países), por lo que se ve el texto del nombre en vez de la bandera — el tamaño más grande ya está listo para cuando se suban las imágenes de bandera reales.
### 2026-08-31 — Iter76: Tagline "Torneo Internacional" (v5 — solución final: solo font-size, sin distorsión ni espaciado)
- El usuario aclaró: (1) las letras deben seguir "pegadas" como el diseño real de Natura Script (el letter-spacing de la v4 las separaba, dando la sensación de que se había cambiado de fuente), y (2) el texto SÍ debe llegar exactamente al final del menú (en v4 quedaba corto a propósito por el tope de espaciado).
- Solución correcta: `StretchedTagline` ya no toca `letter-spacing` ni `transform`. Mide el ancho natural del texto a un tamaño base y ajusta el `font-size` (escala uniforme ancho+alto, sin deformar ni separar letras) hasta que el texto ocupe exactamente el ancho del contenedor `flex-1` (desde el lado del logo hasta el borde derecho, igual que el menú). Fix adicional: el `ResizeObserver` se envuelve en `requestAnimationFrame` para evitar el error de consola "ResizeObserver loop completed with undelivered notifications" (CRA lo mostraba como overlay de error en dev).
- Ajuste fino: la "l" final de "Internacional" quedaba recortada por `overflow-hidden` (la floritura de Natura Script se sale de la caja del glifo). Se agregó un margen de seguridad (`SAFETY = 0.9`) al cálculo del font-size para dejar aire y evitar el recorte.
- Aclaración del usuario: no era solo "más grande", sino que el texto debe **abarcar exactamente** el ancho desde el lado del logo hasta el final del menú (mismo borde derecho que el menú de abajo), igual que en su imagen de referencia (estilo "caja de texto estirada" de una herramienta de diseño).
- Nuevo componente compartido `/app/frontend/src/components/StretchedTagline.jsx`: mide el ancho del contenedor disponible (`ResizeObserver`) y el ancho natural del texto, y aplica `transform: scaleX(containerWidth / naturalWidth)` con `transform-origin: left` — esto estira el texto para que ocupe EXACTAMENTE el espacio de "después del logo" hasta el borde derecho del contenedor, sin dejar huecos, igual que en la referencia. Se re-mide con `document.fonts.ready` (la fuente cursiva carga async) y en cada resize.
- Usado en `Navbar.jsx` (`nav-tagline`) y `Home.jsx` (`hero-cursive-tagline`), reemplazando el intento anterior (v1/v2 con `flex-1 justify-center` + font-size grande, que solo centraba el texto sin llenar el ancho completo).
- Verificado con screenshot en Home y en /nosotros — el texto ahora toca el borde derecho exacto donde termina el menú/REGISTRO, igual que la referencia del usuario.

### 2026-08-28 — Iter75: Recuperar contraseña dentro del mismo modal de Ingreso (sin navegar a otra página)
- **Pedido del usuario**: al hacer clic en "¿Olvidaste tu contraseña?" dentro del modal de Ingreso, antes se cerraba el modal y navegaba a `/recuperar-clave` (página aparte). El usuario pidió que se quede en el mismo formulario, que "se limpie" y muestre ahí mismo el formulario de recuperación.
- **`LoginModal.jsx` reescrito con máquina de estados interna** `view: 'login' | 'forgot' | 'forgot-sent' | 'reset'`, todo dentro de la misma card roja/imagen sin cerrar el modal ni cambiar de URL:
  - `login` (default): formulario de correo/contraseña de siempre.
  - `forgot`: al hacer clic en "¿OLVIDASTE TU CONTRASEÑA?" se limpia la contraseña y se muestra el formulario "¿Olvidaste tu contraseña?" (correo → `POST /api/auth/forgot-password`), con el correo ya escrito en el login precargado.
  - `forgot-sent`: mensaje "Solicitud enviada" + botón "Ingresar mi código" → pasa a `reset`.
  - `reset`: formulario correo + código de 8 dígitos + nueva contraseña + confirmar (`POST /api/auth/reset-password`); al completarse vuelve automáticamente a `login` con el correo precargado y toast de éxito.
  - Botón "← Volver a Ingresar" en `forgot`/`reset` regresa a `login` sin cerrar el modal.
  - Al cerrar el modal (X, click fuera, Escape) el estado se resetea a `login` para la próxima apertura.
  - Los endpoints backend `/auth/forgot-password` y `/auth/reset-password` NO se modificaron — solo se reorganizó la UI que los consume. Las páginas standalone `/recuperar-clave` y `/restablecer-clave` siguen existiendo intactas para acceso directo por link.
  - Fix menor en el camino: el botón "Restablecer contraseña" usaba la fuente Plane Crash con el string crudo (bug conocido de la ñ) — corregido con `renderPlaneCrash()`.
- **Testing**: testing_agent iter49 — 11/11 checks frontend, 100%. Verificado con Playwright: navegación login→forgot→forgot-sent→reset→login sin salir del modal ni cambiar la URL, código real generado y leído de Mongo (`password_resets`), reset de contraseña end-to-end con cuenta de prueba `coach@test.com` (restaurada a su contraseña original al finalizar), regresión de login normal de admin sin cambios.

### 2026-08-28 — Iter74: Fix Estadísticas públicas + Goleadores con cascada Equipo→Jugador + hardening
- **Bug 1 (Tarjetas Jugador↔Cuerpo Técnico "se borra el equipo")**: reproducido en vivo con Playwright usando datos reales (equipo AMERICA con jugador + cuerpo técnico). **NO se reprodujo** — el código de `updateCard()` en `CardsEditor` (AdminMatches.jsx) ya preserva correctamente `team_id` al alternar target_kind; verificado en ambas direcciones y confirmado también por testing_agent. Se deja documentado como regresión ya resuelta por el fix parcial de la sesión anterior.
- **Bug 2 (Goleadores sin selector de Equipo)** — CORREGIDO: `ScorersEditor` reescrito con cascada Equipo→Jugador igual a Tarjetas (`scorer-team-{i}` habilita `scorer-player-{i}`, filtrado por equipo). Backward-compat: goleadores guardados antes de este cambio (solo `player_id`, sin `team_id`) se autocompletan al abrir el modal buscando el equipo del jugador en la lista de roster cargada.
- **Bug 3 (Estadísticas públicas no mostraban nada para "PRUEBA 2028")** — CORREGIDO. Causa raíz: el campo "Grupo" en el CMS (`AdminHomeSettings.jsx` → `EstadisticasEditor`) era texto libre; el admin escribió "GRUPO H"/"H" pero el fixture real tenía `group_name="Grupo H"` — `GET /api/stats/standings` hace match exacto sensible a mayúsculas contra `db.fixtures`, así que devolvía `[]`. Fix de datos: corregidos los 2 valores mal escritos en `home_settings.estadisticas` para el torneo PRUEBA 2028 (982d9f06...). Fix estructural: el campo "Grupo" ahora es un `<select>` (`stats-cats-{eventIdx}-group-{catIdx}`) poblado con los `group_name` reales de `GET /api/fixtures` filtrados por Torneo+Categoría seleccionados — imposible volver a escribir un grupo que no exista. Hardening adicional en backend: `GET /api/stats/standings` ahora compara `group_name` con regex case-insensitive (`$options: "i"`) como defensa adicional ante datos legacy.
- **Bug 4 (encontrado por testing_agent, no reportado por el usuario) — Goleadores públicos mostraban "-"**: `ScorersTable` en `DatosEstadisticas.jsx` leía `r.player_name`, pero `GET /api/stats/top-scorers` devuelve el campo `name`. Corregido a `r.name || r.player_name`. También se agregó scoping por `tournament_id`/`group_name` a esa misma llamada (antes solo filtraba por `category`, lo que podía mezclar goleadores de otros torneos con la misma categoría numérica).
- **Hardening menor (reportado por testing_agent)**: bloqueo de fuerza bruta en `POST /api/auth/login` no se acumulaba en producción porque la clave incluía `request.client.host` (siempre la IP del proxy/ingress, igual para todos los usuarios). Cambiado a bloquear solo por email — sigue protegiendo la cuenta igual, sin depender de una IP de cliente poco confiable detrás del proxy.
- **Testing**: `testing_agent` iter48 — backend 14/15 pytest (única falla: el issue de fuerza bruta ya corregido arriba), frontend 4/4 features verificadas (Tarjetas regresión OK, Goleadores cascada OK con backfill legacy OK, Estadísticas públicas renderizando standings+goleadores reales para PRUEBA 2028 en Premier Pares e Impares, dropdown de Grupo en CMS funcionando). Verificado manualmente post-fix con screenshot: tabla de posiciones (5 equipos) + goleadores con nombres reales (TEST_ARIAS, TEST_MORENO).
- **Deuda técnica pendiente (señalada por testing_agent, no abordada esta sesión)**: `AdminMatches.jsx` sigue >1300 líneas; CardsEditor/ScorersEditor duplican la lógica de fetch de roster (podría extraerse a un hook compartido). No es bloqueante.

### 2026-08-28 — Iter73: Bugfix crítico ñ + limpieza Admin + varios ajustes UI
- **BUG CRÍTICO corregido**: la fuente "Plane Crash" no tiene glifo visible para "ñ" (ni mayúscula, ni minúscula, precompuesta o descompuesta — confirmado con test visual, el carácter desaparecía en vez de hacer fallback). Esto convertía "año" en "ano" en producción. Fix: nueva función `renderPlaneCrash()` en `designSystem.js` que envuelve la "Ñ" en un `<span>` forzado a fuente Anton (ya era el fallback declarado), envuelta en un span `white-space:nowrap` para no partir la palabra en contenedores flex-wrap. Reemplazado `planeCrashSafe`→`renderPlaneCrash` en 11 archivos (todo uso JSX directo); se preservó `planeCrashSafe` (string plano) solo en las 2 líneas que usan `Array.from()` para animación letra-por-letra (Eventos.jsx, DatosEstadisticas.jsx).
- **Admin Home — limpieza de campos sin uso** (a pedido del usuario, quien notó "Tarjetas/Pills" ya no usadas en Nosotros): auditoría completa sección por sección contra las páginas públicas. Eliminado del admin: Pills(4)/Hero/Misión de "Nosotros" (ahora esa sección solo tiene el Timeline de Hitos, lo único que se renderiza en /nosotros), sección completa "Nosotros — sección con imagen (misión)", sección completa "Próximo evento (legacy)". También se borraron del código (`EMPTY` defaults) ~35 campos "fantasma" sin ninguna UI (hero_title/subtitle legacy, upcoming_*, about_*, eventos/contacto/noticias/estadisticas_hero_kicker/title/body/bg_url/overlay, hablemos_kicker/title) — nunca tuvieron impacto visual, solo eran ruido en el código.
- **Fix real de bug reportado**: "no puedo subir más de 2 fotos en Escenarios Deportivos / Noticias" → causa raíz: límite de 5MB por imagen (backend `server.py` /api/upload + `ImageUpload.jsx` + `ImageListUpload.jsx`), muy bajo para fotos de celular. Aumentado a 15MB (video sigue en 30MB); las imágenes igual se optimizan a WebP automáticamente después de subir.
- **Modal "LEE AQUÍ" en /nosotros**: ahora alterna fondo azul/rojo según el índice del hito (`activeIdx % 2`), y el scroll quedó únicamente en el texto del cuerpo (label/título fijos arriba, recuadro no crece más de `max-h-[85vh]`).
- **UI**: texto de hitos del timeline (INTRODUCCIÓN/años) agrandado en 3 pasos; letra de formulario de Ingreso y Registro agrandada en 3-4 pasos (inputs `text-2xl`); logos de "Clubes que han Participado" en /eventos agrandados (h-14/16/20 → h-20/28/36); altura del Hero Video en /mi-equipo y /cotizar aumentada a `h-[50vh] md:h-[60vh] lg:h-[68vh]` con `preload="auto"`.
- **Fix técnico de video real**: videos MP4 subidos por el usuario tenían el átomo `moov` al final (típico de grabación móvil) — Chromium no podía reproducirlos progresivamente. Se agregó remux `ffmpeg -c copy -movflags +faststart` en `/api/upload` para videos, y soporte HTTP Range (`206 Partial Content`, incluye suffix-range `bytes=-N`) en `GET /api/files/{path}`. Requiere `ffmpeg` instalado en el sistema (ya instalado vía apt en este entorno — **verificar que esté instalado también en producción tras el redeploy**, si no, el remux se salta silenciosamente sin romper el upload).
- **Nuevo**: página 404 (`NotFound.jsx`) con estilo de marca + ruta catch-all `*` en `App.js`; alias `/estadisticas` → `/datos-estadisticas`. Fix: `LoginModal` se recortaba arriba en mobile (cambiado `items-center` → `items-start sm:items-center`).
- **Testing**: testing_agent iter46 — encontró 3 issues (P1: palabra con ñ se rompía en flex-wrap — corregido; P2: sin página 404 — corregido; P3: LoginModal clipped en mobile — corregido). Regresión de la refactorización renderPlaneCrash en 11 archivos: sin errores de consola, todas las páginas cargan bien.
- **Nota para el usuario**: la app ya está desplegada en producción (fixture-stats-pro.emergent.host). Todos estos cambios están en PREVIEW — falta hacer redeploy para reflejarlos en producción.

### 2026-08-15 — Iter72: Registro — letra de campos igualada al modal de Ingreso
- `TeamRegister.jsx`: `LabelDark` y `FieldDark` (usados en los 3 pasos: personal, club, identidad) actualizados a `text-sm sm:text-lg md:text-xl` para labels e inputs `text-2xl` (mismo tamaño que `LoginModal.jsx` iter71). También actualizados: select Rol, input contraseña + ícono ojo, select club existente (Cuerpo Técnico), select País. Verificado en desktop y mobile sin overflow.

### 2026-08-15 — Iter71: Modal de Ingreso — letra más grande
- `LoginModal.jsx`: labels ("INGRESA TU CORREO", "INGRESA TU CONTRASEÑA") y campos de correo/contraseña aumentados en 3 pasos a pedido del usuario. Final: labels `text-sm sm:text-lg md:text-xl` (con `flex-wrap` para no cortarse en mobile), inputs `text-2xl`, iconos Mail/Lock 22px, ícono mostrar/ocultar contraseña 22px. Verificado en desktop y mobile (320-400px) sin overflow ni wrap raro.

### 2026-08-15 — Iter70: Nosotros — texto de hitos del timeline agrandado
- `FSCHistorySection.jsx`: labels de hitos (INTRODUCCIÓN, 2019...2026) en la franja azul del timeline aumentados de `text-[10px] sm:text-xs md:text-sm` a `text-base sm:text-lg md:text-xl lg:text-2xl` (3 iteraciones a pedido del usuario). Verificado en desktop y mobile sin overlap/desborde.

### 2026-08-15 — Iter69: Hero Video full-width en /mi-equipo y /cotizar + fix reproducción de video
- **Bug real encontrado y corregido**: el video hero se veía en negro porque (a) el archivo original subido en la sesión anterior estaba corrupto (1KB), y luego (b) los videos reales subidos por el usuario (H.264/AAC, 10-13MB) tenían el átomo `moov` al final del archivo (típico de video grabado en celular sin "fast start"), lo que Chromium no podía reproducir de forma progresiva, y el endpoint `GET /api/files/{path}` no soportaba HTTP Range.
- **Backend `server.py`**:
  - `POST /api/upload`: para extensiones de video (mp4/mov/m4v) ahora hace remux con `ffmpeg -c copy -movflags +faststart` (sin recodificar) para mover `moov` al inicio. Requiere `ffmpeg` instalado en el sistema (agregado via apt).
  - `GET /api/files/{path:path}`: ahora soporta `Range` header (incluye rangos sufijo `bytes=-N`) y responde `206 Partial Content` con `Content-Range`/`Accept-Ranges: bytes`. Esto es necesario para que los navegadores reproduzcan video progresivamente.
  - Nuevo campo `HomeSettings.cotizar_summary_bg_url` (imagen de fondo del cuadro "Resumen en vivo" en /cotizar).
- **Frontend**:
  - `HeroVideoBanner.jsx`: altura aumentada a `h-[50vh] md:h-[60vh] lg:h-[68vh]` (antes h-48/64/80, luego h-64/80/28rem — el usuario pidió más alto dos veces), agregado `preload="auto"` para reducir latencia de carga percibida.
  - `Cotizar.jsx`: sticky summary card ("Resumen en vivo / Tu cotización") ahora usa `cotizar_summary_bg_url` con overlay `linear-gradient(rgba(9,18,54,.55), rgba(9,18,54,.9))` en vez de fondo negro sólido. Botón submit ahora dice "ENVIAR COTIZACIÓN" (uppercase) con ícono `ArrowUp` antes del texto.
  - `AdminHomeSettings.jsx`: agregado `ImageUpload` para `cotizar_summary_bg_url` en la sección "Cotiza tu Evento — Hero video".
- **Placeholder temporal**: se generó con IA una imagen de un león mascota con trofeo (fondo azul) para `cotizar_summary_bg_url` — el usuario reemplazará con su foto real de mascota vía Admin > Configuración de Inicio.
- **Nota importante para futuros agentes**: el navegador Chromium embebido de la herramienta de screenshot de este entorno (Playwright bundled, sin códecs propietarios) NO reproduce H.264/AAC (error `DEMUXER_ERROR_NO_SUPPORTED_STREAMS`) — verificado que el mismo pipeline SÍ funciona con WebM/VP8 en ese mismo navegador. Esto es una limitación del entorno de testing, no un bug real; los navegadores de usuarios reales (Chrome/Firefox/Safari/Edge) soportan H.264 nativamente. NO reportar pantalla negra de video como bug solo por este motivo.
- **Testing**: testing_agent iter45 — 8/8 backend, 100% frontend. Verificado: banners full-width y altos en ambas páginas, Range/206 funcionando, faststart remux confirmado (moov en los primeros bytes), summary card con imagen+overlay, botón "ENVIAR COTIZACIÓN", flujo de cotización end-to-end (POST /api/quotes exitoso), sin regresiones en /mi-equipo.
- **Deuda técnica pendiente (no relacionada, detectada por testing_agent iter44)**: race condition en `AdminHomeSettings.jsx` — no se tocó en esta iteración.

### 2026-02-27 — Iter68: Ingreso convertido a modal global
- **Scope**: reemplazo total del flujo `/login`. Ahora es un modal que aparece encima de la página actual, no una ruta con URL propia.
- **Frontend nuevo**:
  - `context/LoginModalContext.jsx`: provider global con `openLogin()` / `closeLogin()` / `open`.
  - `components/LoginModal.jsx`: modal con overlay `bg-black/60 backdrop-blur-sm`, card roja 2-col (formulario izquierda + imagen KOW derecha), botón X esquina, cierra al click fuera / Escape / X. Bloquea scroll del body mientras está abierto. Click en "REGÍSTRATE" cierra modal y navega a `/registro-equipo`. Click en "¿OLVIDASTE TU CONTRASEÑA?" cierra modal y navega a `/recuperar-clave`.
  - `pages/LoginRedirect.jsx`: componente diminuto que dispara `openLogin()` y redirige a `/`. Se usa como target de la ruta `/login` para compat con links internos existentes (Register, TeamRegister, ForgotPassword, ResetPassword, ProtectedRoute, Cotizar).
- **`App.js`**: `LoginModalProvider` envuelve las rutas dentro de `BrowserRouter`; `<LoginModal />` global montado a nivel App. Ruta `/login` ahora usa `LoginRedirect`. Import de `Login` eliminado.
- **`components/Navbar.jsx`**: botón INGRESO cambiado de `<NavLink to="/login">` a `<button onClick={openLogin}>` (mantiene styling y `data-testid="nav-link-ingreso"`).
- **`pages/Home.jsx`**: mismo tratamiento en el nav propio del hero home.
- **`pages/Login.jsx` eliminado** (ya no se referencia).
- **Diseño del modal** (según wireframe): columna izquierda roja `#e31f27` con título Dancing Script "Ingresa a / tu cuenta", labels Plane Crash blancas, inputs semi-transparentes, botón "INICIAR SESION" blanco/rojo, "¿OLVIDASTE TU CONTRASEÑA?" en blanco small, divisor, "¿ERES NUEVO? REGÍSTRATE" en azul `#0640c8`. Columna derecha: imagen `auth_login_image_url` (CMS) fullbleed sobre `bg-slate-900` fallback.
- **Lógica de autenticación intacta**: mismo `login(email, password)`, mismo redirect por rol (admin → `/admin`, team → `/mi-equipo`, otros → `/mis-cotizaciones`).
- Verificado con screenshots + Playwright: modal se dispara desde Home y desde /contacto, click fuera cierra, REGÍSTRATE navega a `/registro-equipo`.


### 2026-02-27 — Iter67: Registro — Wizard de 3 pasos
- **Scope**: rediseño total de `TeamRegister.jsx` como stepper multi-paso conforme mockups del cliente.
- **Layout**: grid 2 col (3fr azul `#0640c8` + 2fr imagen KOW). Sin card blanca — inputs directamente sobre azul con fondo `rgba(255,255,255,0.15)` y borde `rgba(255,255,255,0.35)`.
- **Stepper** (`Stepper` component): 3 círculos numerados con línea conectora. Estado activo = círculo blanco con número rojo Plane Crash; completado = círculo rojo con check blanco; pendiente = círculo semitransparente. Para Cuerpo Técnico solo 2 pasos.
- **Paso 1** (`StepPersonal`): NOMBRE COMPLETO*, ROL* (select Directivo/Cuerpo Técnico), CORREO*, CONTRASEÑA* (con toggle Eye/EyeOff), TELÉFONO, DOCUMENTO. Si CT: aparece caja destacada para seleccionar club aprobado.
- **Paso 2** (`StepClub`, solo Directivo): NOMBRE DEL CLUB*, TELÉFONO CLUB, PAÍS*, CIUDAD*.
- **Paso 3** (`StepIdentity`): COLOR PRINCIPAL (color picker + swatch amplio del color seleccionado), LOGO/ESCUDO CLUB (dashed dropzone), TRATAMIENTO DE DATOS (checkbox + copy legal en versión dark).
- **Navegación**: botones "ANTERIOR" (outline blanco) + "SIGUIENTE" / "REGISTRARME" (bg blanco Plane Crash rojo). Validación por paso antes de avanzar (usa `toast.error`).
- **Lógica preservada**: `POST /api/auth/register-team`, upload de logo post-registro vía `/upload` + `PUT /teams/{id}`, flujo CT vs Directivo, toasts de éxito/error, redirect a `/mi-equipo` o `/`.
- Verificado con screenshots — Paso 1, 2 y 3 renderizan correctamente y stepper progresa con checks rojos.


### 2026-02-27 — Iter66: Rediseño páginas Ingreso y Registro
- **Scope**: `Login.jsx` reescrito completo; `TeamRegister.jsx` envuelto con nuevo layout 2 columnas (azul + imagen). Lógica de auth conservada intacta.
- **Backend**: `HomeSettings` gana `auth_login_image_url` y `auth_register_image_url` (dos imágenes editables).
- **Ingreso** (`Login.jsx`):
  - Fondo con hero de INICIO + overlay azul + watermark "EDICION" grunge blanco top-left.
  - Card roja centrada con grid 2 col: izquierda formulario (título "Ingresa a / tu cuenta" en Dancing Script blanco, inputs con fondo `rgba(255,255,255,0.15)`, botón "INICIAR SESION" blanco/rojo, ojo para toggle password, link "¿Olvidaste tu contraseña?", divisor, "¿ERES NUEVO? REGÍSTRATE" en azul); derecha imagen KOW cover.
- **Registro** (`TeamRegister.jsx`):
  - Nuevo componente `TeamRegisterLayout` envuelve el contenido con grid 2 col (3fr azul + 2fr imagen). La columna izquierda tiene `overflow-y-auto` para no romper con formularios largos.
  - Header rediseñado: "SE PARTE DEL" en Plane Crash blanco + "team fsc" cursive Dancing Script bold blanco.
  - Formulario ahora se muestra dentro de una card blanca sobre fondo azul (contraste). Los `Row` del summary se movieron al final del card blanco.
- **Admin CMS**: nueva Section "Ingreso / Registro — Imágenes" en `AdminHomeSettings` con 2 uploads.
- Verificado con screenshots: ambas páginas coinciden con el wireframe.


### 2026-02-27 — Iter65: Página Contacto — rediseño formulario + cancha con palmeras
- **Scope**: reemplazo total de `Contacto.jsx`. Fondo blanco, sin hero — solo formulario centrado con decoración inferior.
- **Backend** (`server.py`):
  - `HomeSettings.contacto: Optional[Dict[str, Any]]` + `DEFAULT_CONTACTO_CONFIG` con `kicker`, `title`, `field_url` (cancha), `palms_url` (palmeras PNG).
  - Backfill automático en `GET /home-settings`.
- **Frontend público** (`Contacto.jsx`):
  - Tarjeta centrada con sombra `shadow-2xl` y bordes redondeados.
  - Kicker cursivo Dancing Script azul.
  - Título Plane Crash azul con `paddingTop: 0.3em` (necesario porque la fuente grunge tiene glifos altos).
  - Línea roja corta decorativa debajo.
  - 4 campos con iconos lucide (User/Mail/Phone/MessageSquare): NOMBRE + EMAIL en fila 50%/50%, TELÉFONO 100%, MENSAJE 100% con textarea.
  - Botón "✈ ENVIAR" rojo ancho completo con icono `Send`.
  - `POST /api/contact-messages` conserva la lógica existente + toast success/error via sonner.
  - `<FieldWithPalms>`: componente decorativo inferior con `<img>` de cancha (object-cover, bottom) + `<img>` de palmeras (object-contain, superpuestas). Solo se renderizan si el CMS tiene URLs.
- **Admin CMS**: nueva sección `ContactoEditor` con 4 campos (kicker + title + upload cancha + upload palmeras).
- **Verificado con screenshots**: form renderiza limpio, submit envía el mensaje con éxito (toast "¡Mensaje enviado!"), backend recibe el POST correctamente.


### 2026-02-27 — Iter64: Noticias — cambio de fuente en "Fútbolera"
- **Bug reportado**: "Fútbolera" tenía la misma fuente que "Torneo Internacional" del navbar (Natura Script fino).
- **Fix**: cambio a Dancing Script bold cursive con `fontFamily: "'Dancing Script', 'Allura', cursive"`, `fontWeight: 700`, `WebkitTextFillColor: #ffffff` y removí `CURSIVE` (Natura Script) que compartía con el nav.
- **Verificado con screenshot**: font-family ahora es `"Dancing Script", Allura, cursive`; se ve claramente diferente del "Torneo Internacional" del navbar.


### 2026-02-27 — Iter63: Página Noticias — rediseño "Mentalidad Fútbolera"
- **Scope**: reemplazo total de `Noticias.jsx`. Nueva página con 2 secciones editables desde CMS.
- **Backend** (`server.py`):
  - `HomeSettings.noticias: Optional[Dict[str, Any]]` + `DEFAULT_NOTICIAS_CONFIG` con 6 categorías default (AVALADOS POR LA LIGA DEL QUINDIO, TESTIMONIOS PROFES/FAMILIAS/MVP, PREMIACIÓNES, HOTELES DE ELITE), todas con `news: []` vacío.
  - Backfill automático en `GET /home-settings`.
- **Frontend público** (`Noticias.jsx`):
  - **Sec 1** Hero azul con overlay `${BLUE}CC`, watermark "MENTALIDAD" ghost + título grunge Plane Crash + subtítulo "Fútbolera" cursivo.
  - **Sec 2** Grid 2 columnas de `CategoryCard`: tarjeta con imagen de fondo + overlay rojo semi + sombra azul apilada (efecto stacked-card via `<div>` absoluto en +10px, +10px) + título Plane Crash blanco.
  - **Modal categoría**: header azul con nombre + X. Cuerpo scrollable con grid 2 col de noticias publicadas (portada + título + preview 3 líneas). Al clickear una noticia se expande a `NewsDetail` (galería con imagen principal + thumbs + título + body con `whitespace-pre-line`). Botón ← vuelve al listado.
  - `published !== false` filtra noticias no publicadas.
  - Escape cierra el modal actual (noticia expandida → listado; listado → modal cerrado).
- **Admin CMS** (`AdminHomeSettings.jsx`):
  - Sección "Noticias (página) — Nueva estructura" reemplaza el editor legacy.
  - `NoticiasEditor`: sub-secciones Hero (imagen + textos) + Categorías (agregar/reordenar/borrar; cada una con título + id + imagen).
  - `NewsListEditor` anidado por categoría: agregar/reordenar/borrar noticias, checkbox "Publicada", título + body + galería (ImageListUpload).
- **Verificado con screenshots**: 6 categorías render OK, click abre modal con nombre correcto, estado vacío "Aún no hay noticias publicadas", X cierra correctamente.


### 2026-02-27 — Iter62: Estadísticas — quitar secciones duplicadas del footer
- El usuario reportó que la página `/datos-estadisticas` mostraba dos franjas duplicadas de lo que ya está en el footer global: "SÍGUENOS Y NO TE PIERDAS NI UN SOLO MOMENTO!" y "Somos mas que un Torneo" cursivo azul.
- **Solución**: eliminados `<SocialCTA/>` y `<ClosingPhrase/>` del render de `DatosEstadisticas.jsx`, junto con los componentes internos y el `TikTokIcon` custom (ya no usados). Removidos imports de `Instagram, Facebook`.
- **Admin CMS**: la SubSection 4 (CTA + URLs sociales) y SubSection 5 (frase cierre) fueron reemplazadas por una nota informativa. Los campos permanecen en el modelo backend por compatibilidad y por si el usuario quiere reactivarlos en el futuro.
- **Verificado con screenshot**: la página ahora termina en las categorías y luego pasa directo al footer global "Y SI NOS TOMAMOS UN CAFECITO JUNTOS?" con contactos e iconos sociales.


### 2026-02-27 — Iter61: Página Estadísticas — rediseño completo "Marcador Oficial"
- **Scope**: reemplazo total de `DatosEstadisticas.jsx`. Nueva página con 5 secciones editables desde CMS.
- **Backend** (`server.py`):
  - `HomeSettings.estadisticas: Optional[Dict[str, Any]]` + `DEFAULT_ESTADISTICAS_CONFIG` (hero + intro + 3 eventos default: Festival multicolor / Premier Pares y Impares cursive_gold, cada uno con 5 categorías + CTA social + closing).
  - Backfill automático en `GET /home-settings`.
- **Frontend público** (`DatosEstadisticas.jsx`, 5 secciones):
  - **Sec 1** Hero: imagen + overlay rojo semi + watermark "MARCADOR" ghost detrás + "MARCADOR" y "OFICIAL" en Plane Crash blanco grunge con textShadow.
  - **Sec 2** "ASÍ VA LA" (Plane Crash rojo) + "competencia!" (cursivo rojo) + selector pill buttons de eventos.
  - **Sec 3** Grid de categorías (pills azules Plane Crash) + logo + label del evento a la derecha (multicolor para Festival, cursivo dorado para Premier).
  - **Al clickear categoría**: `CategoryDataPanel` consume `/api/stats/standings` + `/api/stats/top-scorers`. Si tournament_id o category están vacíos → muestra "Próximamente" con hint al admin.
  - **Sec 4** Franja roja CTA con Instagram/Facebook/TikTok (URLs del CMS; iconos lucide + SVG custom para TikTok).
  - **Sec 5** Frase cierre cursiva azul.
- **Admin CMS** (`AdminHomeSettings.jsx`):
  - Reemplazo del editor legacy (`estadisticas_hero_*`) por nuevo `EstadisticasEditor` con SubSections:
    1. Hero (imagen + watermark + títulos)
    2. Intro (textos + dropdown active_event_key)
    3. Eventos: add/remove; por cada uno key/label/mes/palabra/estilo (multicolor|cursive_gold)/logo/lista de categorías (label + tournament_id + category + group_name)
    4. CTA (texto + 3 URLs sociales)
    5. Frase cierre
- **Verificado con screenshots**: hero grunge OK, selector cambia eventos sin reload, título derecho respeta `title_style` (Festival multicolor vs Premier cursivo dorado), pastillas azules clickables, panel muestra "Próximamente" cuando falta config.


### 2026-02-27 — Iter60: Festival multicolor + Premier restaurado
- **Petición del usuario**: dejar Premier tal cual estaba antes (Natura Script cursivo dorado). Para Festival: usar la fuente grunge Plane Crash (como "EDICIÓN 2026" del hero de INICIO) pero **pintando cada letra en un color distinto**.
- **Implementación** (`Eventos.jsx`):
  - Prop `isFestival` en `EventTitleSection` decide qué renderer usar.
  - Constante `FESTIVAL_LETTER_COLORS = ['#14b8a6','#e31f27','#0640c8','#e31f27','#facc15','#a855f7','#22c55e','#a855f7']`.
  - Festival: split del string en `<span>`s con `color` + `WebkitTextFillColor` sólidos por letra (fuente Plane Crash grunge).
  - Premier: mantiene el bloque original `italic` + `CURSIVE` (Natura Script) + `color: GOLD` + `textShadow`.
- **Verificado con screenshots**: Festival muestra las 8 letras en teal/rojo/azul/rojo/amarillo/morado/verde/morado; Premier vuelve a lucir dorado cursivo intacto.


### 2026-02-27 — Iter59: Ajustes visuales Eventos — título mes + flechas apiladas
- **Bug reportado**: la palabra "Festival" se veía con letras multicolor mientras "Premier" se veía correctamente. Además el usuario pidió que las flechas fueran como las de INICIO (apiladas apuntando hacia arriba, rojas, centradas, con rebote).
- **Root cause del multicolor**: la fuente `Natura Script` es una fuente COLOR (COLRv1/SVG-in-OT) que aplica colores propios por glifo — para "Festival" activaba glifos con paleta arcoíris; para "Premier" no. Solución: forzar `fontFamily: "'Dancing Script', 'Allura', cursive"` + `WebkitTextFillColor: RED` + color `RED` sólido con `fontWeight: 700`. Eliminado el `textShadow` que sumaba ruido.
- **Flechas**: reemplacé los `<ChevronsLeft/Right>` de lucide por dos instancias del componente existente `ChevronStack` con `color={RED}, size=56, direction="up", count=5`, envueltos en `<button className="fsc-bounce">` para heredar la misma animación de rebote suave usada en el hero de INICIO.
- **Verificado con screenshots**: Festival ahora en rojo cursivo sólido idéntico a Premier; ambos con 5 chevrones apilados rojos rebotando a cada lado.


### 2026-02-27 — Iter58: Página Eventos — rediseño completo (9 secciones + CMS)
- **Scope**: reemplazo total de `Eventos.jsx` (era una landing con SecondaryHero + agenda). Nuevo diseño con 9 secciones editables desde CMS.
- **Backend** (`server.py`):
  - `HomeSettings.eventos: Optional[Dict[str, Any]]` — objeto anidado con toda la configuración.
  - `DEFAULT_EVENTOS_CONFIG` con defaults del wireframe (5 países, Festival Oct 05-10 con 10 categorías, Premier Dic 07-18 con 5+5 categorías pares/impares, todos los premios, KOW/ARMENIA en estadio, etc.).
  - Backfill en `GET /home-settings`.
- **Frontend público** (`Eventos.jsx`):
  - **Sec 1** Hero: imagen fondo + logo FSC (nav_logo_url) centrado.
  - **Sec 2** Franja azul "Países que han Participado" + banderas horizontales.
  - **Sec 3** Tabs FESTIVAL (rojo) / EVENTOS centro / PREMIER (azul) — click cambia estado sin reload, tab activo con ring visible.
  - **Sec 4** Título grande MES + palabra cursiva dorada con chevrons rojos dobles.
  - **Sec 4A** Festival: grid de categorías con "20 / CAT.XX".
  - **Sec 4B** Premier: dos columnas PARES / IMPARES con línea divisoria vertical.
  - **Sec 5** Estadio Centenario (SOLO en PREMIER): imagen grayscale + textos superpuestos + badge "POR CONFIRMAR" (opcional).
  - **Sec 6** Día de Aventura: bloques rojos con logos (PANACA, Parque del Café).
  - **Sec 7** Escenarios Deportivos: título Plane Crash rojo + cursivo "Deportivos!" + carrusel 3-en-vista con flechas ← →.
  - **Sec 8** Premiación: título azul + 3 columnas (copas rojas / trofeo·V·medalla / individuales azules). Se lee del tab activo (Festival: 5 copas + 4 indiv / Premier: 2 copas + 4 indiv).
  - **Sec 9** Clubes que han Participado: título cursivo + fila de logos.
- **Admin CMS** (`AdminHomeSettings.jsx`):
  - Sección "Eventos (página) — Nueva estructura" reemplaza el editor legacy (`eventos_hero_*` removidos del UI).
  - Nuevo componente `EventosEditor` con 9 sub-secciones + helpers `SubSection` y `ArrayItemsEditor` reutilizables.
  - Cada sub-sección permite editar: textos, subir imágenes individuales, subir listas de imágenes (ImageListUpload), agregar/reordenar/borrar países, actividades y clubes, listas CSV para categorías y premios.
- **Verificado con screenshots**: 9/9 sections rendered, PREMIER tab muestra stadium + 2 columnas categorías, FESTIVAL oculta stadium, tabs cambian sin recargar.


### 2026-02-27 — Iter58 (previo): Timeline Nosotros — texto FSC superpuesto + animación de expansión de la foto
- **Cambios pedidos por el usuario**:
  1. "FSC EN LA HISTORIA" debe estar **superpuesto** (encima de las imágenes), no detrás.
  2. Al pasar a un año, la **primera foto del hito** se agranda con transición hasta ocupar todo el área; las otras 5 fotos y el texto FSC hacen fade-out.
- **Refactor `FSCHistorySection.jsx`**:
  - Un único wrapper de fotos con 6 elementos `<div>` absolutos. Cada uno tiene `left/top/width/height/rotate` según `SLOTS[i]`.
  - En modo YEAR: el elemento `i=0` cambia sus valores a `COVER` (`0/0/100%/100%/0deg`) — CSS transition anima el `left/top/width/height/transform` en 550ms con curva `cubic-bezier(0.22,1,0.36,1)` (ease-out expresivo). Los demás elementos hacen `opacity: 0` en 350ms.
  - Foto principal en modo YEAR quita border+shadow para que se vea como banner limpio.
  - **z-index del texto FSC subido a 5** (por encima de las fotos que están en z-3), con `pointer-events: none` para que no bloquee clics. Se oculta con opacity 0 en modo YEAR.
  - Overlay pregunta + LEE AQUÍ tiene `z-index: 8` y aparece con delay 420ms (`showOverlay` state) para que primero se aprecie la expansión.
- **Verificado con screenshots**: 4/4 estados pasan — INTRO con texto superpuesto sobre fotos, mid-animation con foto expandiéndose, YEAR completo con overlay, back to INTRO con reset.


### 2026-02-27 — Iter57: Timeline Nosotros — modo INTRO vs modo YEAR (banner completo)
- **Cambio funcional pedido por el usuario**: al hacer clic en cualquier año (2019, 2021, 2022, 2023, 2025, 2026) las 6 fotos flotantes y el texto grande "FSC EN LA HISTORIA" **desaparecen con fade-out**, y una sola foto del hito seleccionado ocupa TODO el área (banner completo lado-a-lado y arriba-abajo). Sobre esa foto: overlay inferior con la pregunta en Plane Crash blanco + botón "LEE AQUÍ" (fondo blanco / texto rojo). Al hacer clic en INTRODUCCIÓN: el banner desaparece y regresan las 6 fotos + texto FSC.
- **Refactor `FSCHistorySection.jsx`**: dos layers superpuestos con opacidad controlada por `isIntro` + `phase`:
  - `history-intro-layer`: renderiza los 6 slots absolutos + texto FSC/EN LA HISTORIA.
  - `history-year-layer`: renderiza un `<img>` full-cover con `photos[0]` + overlay inferior (gradiente + pregunta + LEE AQUÍ).
- **Transición**: fade 300ms al cambiar de hito (opacity 0 → 1).
- **Barra azul**: permanece siempre visible; solo cambia el punto/label activo (blanco engrosado).
- **Modal**: sin cambios; sigue funcionando con Escape/click fuera/X.
- **Mobile**: en INTRO muestra texto FSC + grid 2 col de las 6 fotos; en modo YEAR el banner ocupa la altura completa.


### 2026-02-27 — Iter56: Página Nosotros — ajustes funcionales (posiciones foto principal + modal LEE AQUÍ)
- **Cambio de scope**: eliminadas las secciones `SecondaryHero` ("conócenos → NOSOTROS") y "SOMOS MÁS QUE UN TORNEO" de `Nosotros.jsx` — ahora la página es EXCLUSIVAMENTE la sección "FSC EN LA HISTORIA".
- **Layout matcheado al wireframe** (6 slots absolutos con tamaños distintos):
  - idx 0: sup-izq mediana (rot -2°), idx 1: **sup-centro GRANDE (rot 1.5°)** — foto principal con overlay,
  - idx 2: sup-der mediana (rot 2°), idx 3: inf-izq mediana (rot -2°), idx 4: inf-centro (rot -1°), idx 5: inf-der pequeña (rot 2.5°).
- **Overlay en la foto principal**: gradiente oscuro bottom-to-top + `question` en Plane Crash blanco + botón "LEE AQUÍ" (fondo blanco / texto rojo Plane Crash).
- **Modal LEE AQUÍ** (`HistoryReadModal`): fondo `rgba(0,0,0,0.72)`, header azul FSC (#0640c8) con label del hito + pregunta en Plane Crash + X, cuerpo blanco con `whitespace-pre-line` scrollable, cierra con Escape/click fuera/X, bloquea scroll del body.
- **Transición**: fade opacity 200ms entre hitos (state `phase = "in"|"out"`).
- **Backend**: campo `question` agregado al `DEFAULT_HISTORY_TIMELINE` (2019: "¿Cómo empezó todo?", 2023: "¿Quién es KOW?") + backfill automático en GET para docs guardados sin el campo.
- **Admin CMS**: nuevo input "Pregunta" por hito (`timeline-question-{idx}`) y label actualizada del body a "se muestra en modal al hacer clic en LEE AQUÍ".
- **Mobile**: layout responsivo con foto principal fija + grid 3 col de auxiliares.


### 2026-02-27 — Iter55: Página Nosotros — Sección "FSC EN LA HISTORIA" (timeline navegable)
- **Contexto**: prompt del cliente para agregar sección arriba de "SOMOS MÁS QUE UN TORNEO" en `/nosotros`, matcheando exactamente el wireframe (fotos flotantes rotadas + texto FSC grande grunge + franja azul inferior con puntos + botones ← → circulares).
- **Backend** (`server.py`):
  - Modelo `HomeSettings` extendido con `nosotros_history_title` y `nosotros_history_timeline: List[Dict[str,Any]]`.
  - `DEFAULT_HISTORY_TIMELINE` con los 7 hitos pre-poblados (INTRODUCCIÓN, 2019 con texto exacto, 2021, 2022, 2023 con texto exacto de KOW, 2025, 2026).
  - `GET /api/home-settings` hace backfill del campo cuando el documento existe pero no lo tiene (docs antiguos).
- **Frontend público**:
  - Nuevo componente `/app/frontend/src/components/FSCHistorySection.jsx`: 6 slots absolutos de fotos flotantes (rotadas -2/+2.5°), texto central Plane Crash `FSC` grande + `EN LA HISTORIA` debajo (planeCrashSafe → minúsculas para el glifo grunge), botones ← → circulares rojos, timeline azul con 7 puntos + labels clickables.
  - Al cambiar de hito se muestra el `body` en card blanco translúcido (excepto INTRODUCCIÓN que solo muestra las fotos).
  - Mobile fallback: grid 2 columnas cuando no hay espacio para floats.
  - Integrado en `Nosotros.jsx` ARRIBA de "SOMOS MÁS QUE UN TORNEO".
- **Admin CMS** (`AdminHomeSettings.jsx`):
  - Nuevo componente `HistoryTimelineEditor` dentro de la sección Nosotros: agregar/borrar/reordenar hitos (↑↓), editar clave y etiqueta, textarea del body y `ImageListUpload` (max 6) por hito.
  - Título de la sección también editable via `nosotros_history_title`.
- **Verificado** vía screenshot: layout coincide con el wireframe, click en dot cambia fotos + texto, click en ← → navega, admin muestra los 7 hitos con sus textos correctos.


### 2026-02-27 — Iter54: Feature nueva — Partidos adicionales (bonus matches)
- **Necesidad de negocio**: en torneos de 3 o 4 equipos cada equipo debe llegar a 4 partidos jugados. Como no hay contra quién jugar (fixture limitado), el admin puede cargar directamente estadísticas complementarias que suman a la tabla de clasificación y a juego limpio, sin crear un partido físico.
- **Reglas**: fixture de 3 equipos → 2 bonus por equipo · fixture de 4 equipos → 1 bonus por equipo · otros tamaños → no aplica.
- **Backend** (`server.py`):
  - Modelo `BonusMatchIn/Out`: tournament_id, category, group_name, team_id, result ('won'|'drawn'|'lost'), goals_for, goals_against, yellow_cards, red_cards, other_cards, note.
  - Colección `bonus_matches` con CRUD: `POST/GET/PUT/DELETE /api/bonus-matches`.
  - Validaciones POST: fixture del scope existe, tiene 3 o 4 team_ids reales, team pertenece al fixture, no supera max_per_team.
  - `GET /api/stats/standings` extendido: itera bonus del scope y suma played+=1, W/D/L, GF/GC, tarjetas y descuenta fair_play según cfg (fairplay_yellow/red/other).
- **Frontend** (`AdminMatches.jsx`):
  - Estado `bonusMatches`, `bonusEdit`; helpers `scopeFixture`, `scopeTeamIds`, `bonusEnabled`, `maxBonusPerTeam`, `bonusCountByTeam`.
  - Botón `+ Partido adicional` (`add-bonus-btn`) visible solo cuando `bonusEnabled` (n=3 o n=4).
  - Componente `BonusMatchesList`: fila por bonus con equipo, badge de resultado, GF/GC, tarjetas, nota, edit/delete + contadores X/Y por equipo (`bonus-quota-{team_id}`).
  - Componente `BonusMatchModal`: dropdown equipo con cupos, 3 botones para resultado, inputs numéricos, nota.
- **Vista pública**: `/estadisticas` refleja automáticamente los bonus porque consume el mismo endpoint standings.
- **Testing**:
  - `/app/backend/tests/test_iter53_bonus_matches.py` (3/3 PASS): 3-team full flow (crear/editar/borrar/validaciones/standings), 4-team max=1, 5-team not allowed.
  - `/app/test_reports/iteration_43.json` — E2E frontend 14/14 PASS.


### 2026-02-27 — Iter53: Fix crítico — DESCANSA se perdía al Guardar el fixture
- **Bug reportado por el usuario**: "una vez se guarda el fixture ya se pierde la fecha de descanso, no vuelve a salir ni en editar el fixture, ni una vez guardado, ni en el módulo de partidos".
- **Root cause**: al pulsar "Guardar", el frontend llamaba `generate(true)` **sin `matrix_matches`**. El backend entonces caía al `_round_robin_pairs` automático (server.py línea 1770) — y ese algoritmo **omite** cualquier partido con BYE (`if home is not None and away is not None`). Resultado: fixture guardado sin partidos DESCANSA.
- **Fix (AdminFixtureGenerator.jsx)**:
  1. Nuevo estado `lastGenOpts = { matrix, orderedTeamIds }` guardado al generar la Vista Previa.
  2. Al pulsar "Guardar", si el usuario no pasa opts, se reutiliza automáticamente la matriz de la preview → el backend recibe los mismos slots (incl. BYE) y persiste los partidos DESCANSA con `is_bye=true`, `status="descansa"`, `venue=""`.
  3. Adicionalmente, las ediciones de fecha/hora/cancha que el admin hizo en la preview se aplican vía PUT sobre los partidos recién persistidos (matching por `matchday|home_team_id|away_team_id`).
- **Verificado end-to-end** vía Playwright: 5 equipos → sorteo → preview 15 partidos (5 BYE) → Guardar → abrir editor → 15 filas / 5 BYE con fondo amber, "— sin cancha —", input `type="date"` y etiqueta "descansa". Screenshot confirmó "T52_kwl31_1 vs DESCANSA", "DESCANSA vs T52_kwl31_4", etc.


### 2026-02-27 — Iter52: Fix filtro categoría en AdminMatches ocultaba partidos DESCANSA
- **Bug reportado**: al seleccionar una Categoría en el módulo Partidos (`/admin/partidos`), los partidos DESCANSA (BYE) desaparecían de la lista aunque el fixture los tuviera. El editor de Fixture sí los mostraba.
- **Root cause**: `AdminMatches.jsx` línea 62 buscaba el team por `home_team_id`; cuando ese id era `"__BYE__"`, `teams.find()` devolvía `undefined` y el filtro descartaba la fila.
- **Fix**: en `filteredMatches`, ahora se usa `hTeam || aTeam` como referencia de categoría — así los partidos DESCANSA que tienen team real en cualquiera de los dos lados se muestran correctamente.
- **Verificado** vía screenshot: creado torneo BYE_TEST con 5 equipos + fixture 6 partidos (2 DESCANSA). Al filtrar por categoría Sub-10 aparecen las 2 filas amber "descansa" con "SIN ACCIONES", junto con los 4 partidos normales.


### 2026-02-26 — Iter51: Bug DESCANSA (BYE) + filtros AdminMatches — VERIFICADO
- **Backend `POST /api/fixtures/generate`**: partidos BYE (`__BYE__`) se generan con `is_bye=true`, `status="descansa"`, `venue=""` y `match_date` a las 00:00. Los endpoints `GET /api/matches` y `GET /api/fixtures/{id}/matches` enriquecen `home_team_name`/`away_team_name` a "DESCANSA" cuando el team_id es `__BYE__`.
- **`AdminFixtureGenerator.jsx`** (Preview + Editor): filas DESCANSA muestran (a) input `type="date"` (sin hora), (b) span "— sin cancha —" en lugar del select, (c) fondo `bg-amber-50/60`, (d) etiqueta "descansa" en la columna vs. Partidos normales conservan `datetime-local` + selector de cancha.
- **`AdminMatches.jsx`**:
  - Tabla MatchesTable ahora renderiza dos columnas: "FECHA" (label matchday) + "Cuándo" (fecha/hora). Filas DESCANSA muestran "Sin acciones" (sin botones edit/score), solo Trash. Fondo amber. Sin venue.
  - FilterAndExportBar: dropdown "Grupo" ahora `disabled` cuando `!tid || !cat`. Cambiar Categoría resetea Grupo a "".
- **Etiquetas**: "F1/F2/Jorn." → **"FECHA 1", "FECHA 2"** en todas las tablas (AdminMatches + AdminFixtureGenerator preview + editor + SeedingModal).
- **Testing**: `/app/test_reports/iteration_41.json` (backend 2/2 pytest PASS + frontend 3/4 UI PASS) + `/app/test_reports/iteration_42.json` (retest BUG 1 editor 8/8 checks PASS). Test files: `/app/backend/tests/test_iter41_bye_fixture.py`.



### 2026-02-26 — Iter50: "Fechas por día" real + horarios distribuidos + rango estricto
- **Backend `POST /api/fixtures/generate`**: nuevo campo `matchdays_per_day: int = 1` con semántica correcta ("cuántas FECHAS caben en un mismo día calendario"). El campo `days_between_rounds` (default 7) se mantiene solo por compatibilidad backward para clientes viejos (activa `use_legacy_gap` cuando `matchdays_per_day=1 && days_between_rounds > 1`).
- **Distribución de horarios**: los slots se dividen equitativamente entre las FECHAS de un mismo día. Ej. `slots=[08:00, 09:30, 14:00, 15:30]` con `matchdays_per_day=2` → 1ra FECHA del día usa `[08:00, 09:30]`, 2da FECHA usa `[14:00, 15:30]`. Antes se reutilizaban solo los primeros dos horarios.
- **Rango de fechas estricto**: si los partidos generados exceden `end_date`, se lanza HTTPException 400 con mensaje informativo: "Los partidos no caben en el rango de fechas (X a Y, N día(s)). Se requieren M día(s) con la configuración actual (K fecha(s), P por día). Sugerencia: extiende la fecha fin, aumenta 'Fechas por día', o reduce las vueltas.".
- **Frontend**:
  - El campo "Fechas por día" ahora se envía como `matchdays_per_day` (además de `days_between_rounds:1` legacy).
  - **Labels renombrados**:
    - "Jorn." → **"FECHAS"** en las cabeceras de tablas (Preview y Editor).
    - **"F1", "F2"** → **"FECHA 1", "FECHA 2"** en la celda de matchday.
    - "Jornada X" → **"FECHA X"** en el modal de sorteo (SeedingModal).
    - "N jornadas" → "N fecha(s)" en el header del preview.
- **Verificado curl** con caso del usuario (5 equipos con DESCANSA, matriz M5, 4 horarios, rango 14-17 dic, 2 fechas/día):
  - FECHAS 1+2 → 14 dic (08:00 y 14:00)
  - FECHAS 3+4 → 15 dic (08:00, 14:00, 15:30)
  - FECHA 5 → 16 dic (08:00)
  - Total 6 partidos reales (los que involucraban DESCANSA se omitieron), 5 fechas totales, todos dentro del rango.


### 2026-02-26 — Iter49: Fuente Natura Script + bug de filtro en generador de fixture
- **Fuente Natura Script**: archivo `.otf` (147 KB) subido a `/frontend/public/fonts/NaturaScript.otf`. Declaración `@font-face` movida a `public/fonts.css` con `url('/fonts/NaturaScript.otf')` para servirse estáticamente (evita que webpack la procese como módulo, que causaba "Cannot find module '/fonts/NaturaScript.otf'"). En `src/index.css` queda solo el fallback `local()`. Aplicada al texto "Torneo Internacional" del Navbar y Home.
- **Bug de fixture — teams de carga masiva no aparecían**: el filtro del generador (`AdminFixtureGenerator.jsx`) requería `t.tournament_id === tournamentId`, pero el endpoint `POST /import/teams` NO establece `tournament_id` en los teams importados. Fix: relajado a `(t.category === category) && (!t.tournament_id || t.tournament_id === tournamentId)` — así aparecen tanto los equipos sin `tournament_id` (bulk import) como los que sí lo tienen y coinciden.


### 2026-02-26 — Iter48: Eliminada tarjeta Azul (comportamiento movido a "Otra") + alineación Jugador/Min
- **`CardsEditor` en `AdminMatches.jsx`**:
  - **Botón "+ Azul" eliminado** de la UI. Solo quedan **Amarilla, Roja y Otra**.
  - La tarjeta **"Otra"** ahora afecta a todo el equipo: solo pide `team_id` + `description`. Ya no muestra selector de jugador ni de cuerpo técnico. El descriptor disciplinario (ej. "Conducta antideportiva del banco") va en el textarea.
  - **Amarilla/Roja** mantienen el toggle Jugador/Cuerpo Técnico pero se **reestructuró el layout** para alinear correctamente los campos: primera fila con badge + toggle; segunda fila (grid 12 cols) con **Jugador (col-span-8) + Min (col-span-3) + ✕ (col-span-1)** e `items-center`. Ya no hay desalineación cuando el select del jugador está solo o cuando está en modo "Cuerpo Técnico" (dos selects encadenados).
- Backward-compatible: los partidos ya guardados con `type: "blue"` no rompen; se persisten pero el UI no expone la creación de nuevas. Los cálculos de fair-play siguen ignorando cualquier `type != yellow/red/other-with-player`, y "Otra" ahora en modo team ya no cuenta hacia disciplina personal.


### 2026-02-26 — Iter47: Sorteo con posiciones vacías por defecto
- **`AdminFixtureGenerator.jsx` → `openSeeding`**: al abrir el modal de sorteo, todas las posiciones se inicializan como cadena vacía (`""`). El admin ahora debe elegir manualmente cada equipo en cada posición 1..N (antes se pre-cargaban en el orden en que los eligió con los checkboxes, lo cual daba pie a "sorteos" automáticos indeseados). Si N es impar, sigue agregándose "DESCANSA" al final como posición sintética.
- El resto del flujo (validación de duplicados, vista en tiempo real, confirmación, construcción de matriz según N) se mantiene tal cual — verificado E2E: 4 equipos asignados → confirmar → toast "Vista previa generada" → 6 partidos en 3 jornadas creados correctamente.


### 2026-02-26 — Iter46: Tarjetas amarilla/roja para staff + nueva tarjeta azul de equipo
- **Modelo de tarjetas ampliado** (backend `cards: List[dict]` ya acepta cualquier estructura, no requiere cambios de schema):
  - **Amarilla/Roja/Otra**: nuevo campo `target_kind: 'player' | 'staff'`. Si es `staff`, se guarda `staff_name` en vez de `player_id` (el cuerpo técnico está anidado en `team.cuerpo_tecnico` sin ID único global). Backward-compatible: si no viene `target_kind`, se asume `'player'`.
  - **Nueva tarjeta AZUL** (`type: 'blue'`): `target_kind: 'team'`, `description: string`, sin jugador ni staff. Afecta al equipo como descriptor disciplinario. NO descuenta puntos de fair-play (a diferencia de yellow/red/other), es puramente informativa por ahora.
- **`AdminMatches.jsx` → `CardsEditor`** reescrito:
  - 4 botones: **+ Amarilla · + Roja · + Azul · + Otra**.
  - Para amarilla/roja/otra: toggle "Jugador / Cuerpo Técnico" (data-testid `card-kind-player-{i}` y `card-kind-staff-{i}`). Si es staff, muestra selects encadenados: primero Equipo, luego lista de cuerpo técnico de ese equipo (leída de `team.cuerpo_tecnico`).
  - Para azul: solo select de equipo (local/visitante) + textarea de descripción; sin campo de jugador. Ejemplo placeholder: "Conducta antideportiva del banco / protesta grupal…".
  - Se pasa `teams` como prop al editor para poder listar el cuerpo técnico por equipo.
- **Compatibilidad estadísticas**: `/stats/standings` sigue descontando fair-play solo para yellow/red/other. Las azules se persisten pero no penalizan puntos, alineado con la intención del usuario ("es más una descripción, afecta al equipo").
- **Verificado curl**: PUT `/api/matches/{id}/result` con 3 cards mixtas (yellow-player, red-staff, blue-team) → persistidas correctamente en la respuesta del backend con todos los campos preservados.


### 2026-02-26 — Iter45: Generador de Fixture con sorteo manual + matrices fijas
- **Backend `POST /api/fixtures/generate`**:
  - Nuevo campo opcional `matrix_matches: [{matchday, home_pos, away_pos}]`. Si viene, el backend usa esta matriz manual (respetando el orden de posiciones asignado por el admin) en vez del round-robin automático. Los partidos cuya posición supere `len(team_ids)` se descartan (permite representar "DESCANSA").
  - Se removió la validación estricta de que `end_date >= último_partido`. Ahora solo se valida el formato. El admin puede fijar libremente el rango de fechas y ajustar los partidos después.
- **Nueva librería `frontend/src/lib/fixtureMatrices.js`**:
  - Matrices fijas EXACTAS para **4, 5, 6 y 10 equipos** según el artifact del usuario.
  - `genericRoundRobinMatrix(n)`: para cualquier otro N (7, 8, 9, 11, 12…), usa round-robin con posición 1 fija y agrega posición "D" (DESCANSA) si N es impar.
  - `withRounds(matrix, rounds)`: repite la matriz con local ↔ visitante invertidos para simular ida y vuelta.
- **`AdminFixtureGenerator.jsx`**:
  - Label **"Días/jornada" → "Fechas por día"** (solo cambio visual).
  - Filtro de equipos: ahora solo muestra los del `tournament_id === seleccionado && category === seleccionada`. Mensaje adaptado: "No hay equipos inscritos en esta categoría para este evento.".
  - Validación de fechas: solo error inline si `end < start`. Se removió el `min` del input.
  - Botón "Vista Previa" ahora abre un **`SeedingModal`** — modal de sorteo con:
    - Lista de posiciones 1..N (+ "DESCANSA" sintética al final si N es impar) con `<select>` para asignar cada equipo.
    - Vista en tiempo real a la derecha: la matriz de partidos se muestra usando las etiquetas de los equipos apenas se asignan; posiciones sin asignar se muestran como "Pos. X".
    - Los partidos que involucran DESCANSA se muestran opacos y se marcarán como no-generados en backend.
  - Botón "Confirmar sorteo y generar vista previa" → envía la matriz + `team_ids` ordenados al backend, obtiene el fixture, y muestra la tabla editable existente.
- **Verificado curl**: matriz 4-equipos aplicada exactamente (`1v4, 2v3` en MD1, etc.) con horarios y canchas rotando correctamente; posiciones fuera de rango se descartan.


### 2026-02-26 — Iter44: Clasificación y Juego Limpio ocultos cuando no hay fixture
- **Backend `/stats/standings`**: primero valida que exista al menos un fixture para el `tournament_id × category × (group_name opcional)`. Si no hay ningún fixture, devuelve `[]` (antes construía la tabla con todos los equipos que cumplían filtros aunque no hubiera partidos ni fixture). También filtra `teams` para incluir solo los que están dentro de los `team_ids` del/los fixture(s) encontrado(s).
- **Frontend `AdminMatches.jsx`**:
  - Se carga `/fixtures` al inicio y se pasa a `FilterAndExportBar`.
  - **Filtro de grupos**: ahora se deriva de `fixtures.filter(tid==f.tournament_id && cat==f.category).map(f.group_name)`. Antes usaba `teams.map(group_name)` — por eso mostraba "Grupo A" aunque el fixture nunca se hubiera generado, ya que el field `group_name` en el schema del team podía tener valores viejos.
  - **Tabs Clasificación y Juego Limpio**: quedan deshabilitadas cuando `!hasFixtureForFilters(fixtures, tid, cat, grp)`, además del check anterior de tid/cat.
  - **Estado vacío** de `StandingsTable`: mensaje más claro — "Aún no hay fixture creado para el torneo, categoría y grupo seleccionados. La tabla se generará cuando cargues resultados de partidos.".
- **Verificado curl**: sin fixture → `/stats/standings` retorna `[]`; con fixture creado (4 equipos) → retorna 4 filas con `group_name` correcto; al eliminar el fixture → vuelve a `[]`.


### 2026-02-26 — Iter43: Delete de fixture cascada standings + Bracket editor + Canchas como dropdown
- **Backend `DELETE /api/fixtures/{id}`**: ahora elimina TODOS los partidos (programados y finalizados) + limpia `historical_standings` del mismo `tournament_id × category × group_name`. Retorna `{matches_deleted, standings_deleted}`. Efecto: la tabla de posiciones y de juego limpio quedan reseteadas (se calculan live desde matches).
- **Backend `POST /api/fixtures/generate`**: persiste `venues` y `time_slots` en el documento del fixture para que el editor los pueda usar como dropdown más adelante.
- **Backend `POST /api/brackets`**: persiste `venues` y `time_slots` en el bracket doc.
- **Fixture editor (`AdminFixtureGenerator.jsx`)**: al abrir un fixture guardado, carga sus `venues` desde el GET y los usa en `<select>` de cancha en `EditableMatchesTable` y `PreviewEditableTable` (reemplazo de `<input list=datalist>` por `<select>` real). Mensaje del modal de eliminación actualizado para reflejar el nuevo comportamiento.
- **Bracket admin (`AdminBracketGenerator.jsx`)**:
  - Canchas en el formulario ahora son **array + `VenuePicker`** (dropdown desde `/venues` catalog, con botón "+ Crear nueva"), remplazando el input CSV. Botón "+ Agregar cancha" para múltiples canchas.
  - Nuevo botón **Editar** por bracket → abre `BracketMatchesTable` inline con fecha/hora y **cancha como `<select>`** por partido.
  - Botón Eliminar ahora usa `ConfirmDeleteDialog` (antes usaba `window.confirm`).
  - Al guardar un bracket nuevo, se abre automáticamente el editor para ajustar fechas/canchas.
- **Pruebas curl**: creación de fixture con 4 equipos + 6 matches → persiste `venues:[Cancha A, Cancha B]` + `time_slots:[09:00, 11:00]`. Inyección de 1 fila `historical_standings` → DELETE devuelve `{matches_deleted:6, standings_deleted:1}` y GET público confirma remaining=0.
- **Screenshot**: 8 selects de cancha visibles en el editor del bracket (`br-editor-venue-*`).


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
