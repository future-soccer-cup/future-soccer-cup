# Reporte de bugs de responsive/UI — Future Soccer Cup

Diagnóstico hecho leyendo directamente el código fuente (no son suposiciones de diseño:
cada punto cita el archivo, la línea y el fragmento exacto responsable del bug). Pensado
para pasarlo a una IA de código (o a un desarrollador) y que aplique las correcciones
una por una, en orden.

Convención: cada bug tiene **Síntoma** (lo que ve el usuario), **Causa raíz** (línea de
código responsable), y **Qué cambiar** (instrucción concreta, no ambigua).

## Estado

Los 6 puntos de este reporte ya fueron aplicados en el código (frontend recompiló sin
errores tras cada cambio). Detalle de qué opción se tomó en cada caso:

- **1 (imagen Ingreso)** → Opción A: `self-stretch` + `object-cover` en `LoginModal.jsx`.
- **2 (formulario Registro)** → se quitó el scroll interno y se hicieron responsive los
  tamaños de fuente/padding de todos los inputs y selects.
- **3 (imagen mascota/Nosotros)** → opción intermedia: se mantuvo `object-cover` pero se
  ajustó `objectPosition` a `"center 25%"` para priorizar la parte superior de la foto.
- **4.a (imágenes Home que desaparecen)** → se reemplazó `hidden md:block` por un layout
  en flujo normal en mobile (imagen visible, centrada, tamaño fijo) que pasa a absoluto
  desde `md`.
- **4.b (alto fijo 780px)** → se cambió a `clamp(560px, 100vh, 780px)`.
- **4.c (galería Finales)** → sin cambios: a diferencia de 4.a, ahí las fotos ocultas en
  mobile siguen siendo accesibles con las flechas prev/next, así que no es el mismo bug.

**Pendiente de verificar visualmente:** la base de datos local de desarrollo no tiene
fotos reales cargadas (el `home_settings` se sembró con valores por defecto, sin
`nosotros_history_timeline` con fotos). El fix del punto 3 no se pudo confirmar
visualmente contra la foto real de la mascota — recomendable revisarlo en el admin
(`/admin/home`) subiendo una foto de prueba antes de dar por cerrado ese punto.

---

## 1. Página de Ingreso (Login) — la imagen no ocupa todo el alto de la tarjeta

**Archivo:** `frontend/src/components/LoginModal.jsx`

**Síntoma:** en desktop, la columna derecha con la imagen (KOW) queda más corta que la
columna del formulario, dejando espacio vacío arriba y/o abajo dentro de la tarjeta roja.

**Causa raíz:**
- La tarjeta es un flex-row (`flex flex-col lg:flex-row`, línea 157). Por defecto, en flex
  los hijos se estiran (`align-items: stretch`) para igualar la altura del más alto.
- Pero la columna de la imagen tiene `self-center` (línea 404), que **anula ese
  estiramiento** y en su lugar centra la columna según su propio contenido.
- El ancho de esa columna lo calcula el hook `useAutoFitSideImage` (`frontend/src/hooks/useAutoFitSideImage.js`),
  que hace: `width = height_del_formulario * proporción_real_de_la_imagen`, pero luego
  **recorta ese ancho** con `Math.min(width, containerWidth * maxWidthRatio)` (línea 47
  del hook; `maxWidthRatio = 0.46` pasado en `LoginModal.jsx` línea 39).
- Resultado: si la imagen es más ancha que alta (panorámica), el ancho que necesitaría
  para llenar el alto completo supera el 46% del ancho de la tarjeta, así que se recorta
  el ancho — y como la imagen usa `object-contain` (línea 413, sin recorte de contenido),
  se reduce también su alto renderizado, dejando huecos verticales.

**Qué cambiar (elegir UNA de estas dos opciones):**

**Opción A (recomendada, más simple y predecible):** hacer que la imagen SIEMPRE llene
el 100% del alto disponible, aceptando que se recorte un poco en los bordes si la
proporción no calza exacto.
1. En `LoginModal.jsx` línea 403-406, cambiar `self-center` por `self-stretch` (o
   quitarlo, ya que stretch es el default).
2. En la misma línea, cambiar el `<img>` (línea 409-414): quitar `object-contain` y
   `h-auto`, usar `className="block w-full h-full object-cover"`.
3. El wrapper (línea 404) puede quedar con `height: "100%"` explícito en vez de depender
   solo del contenido.

**Opción B (mantiene "sin recorte", pero acepta un panel más ancho):** en
`LoginModal.jsx` línea 39, subir o quitar el `maxWidthRatio` (ej. `maxWidthRatio: 0.7`)
para que el ancho nunca se recorte tan agresivamente. Esto no elimina el problema de raíz
para imágenes muy panorámicas, solo lo hace menos frecuente.

**Aplica también a:** `frontend/src/pages/TeamRegister.jsx` líneas 228-241 (misma imagen
lateral, mismo hook, mismo patrón `object-contain` + `h-full`) — aunque no fue reportado
explícitamente, tiene el mismo riesgo y conviene corregirlo igual para ser consistentes.

---

## 2. Página de Registro (`/registro-equipo`) — formulario enorme con scroll interno feo

**Archivo:** `frontend/src/pages/TeamRegister.jsx`

**Síntoma:** el formulario se ve desproporcionadamente grande, sobre todo en mobile, y
aparece una barra de scroll dentro del panel azul (no un scroll normal de página).

**Causa raíz (dos factores que se combinan):**
1. **Contenedor con altura forzada + scroll interno:** línea 144:
   ```jsx
   <div className="relative overflow-y-auto flex-1 min-w-0" style={{ background: BLUE, maxHeight: "calc(100vh - 4rem)" }}>
   ```
   Esto encierra TODO el formulario (título gigante + stepper + 6 campos + botones) dentro
   de una caja con altura máxima = alto de pantalla, y cuando el contenido no cabe,
   aparece un scrollbar *dentro* de esa caja en vez de dejar que la página scrollee
   normalmente. Ese scrollbar recortado dentro de un panel de color es lo que se ve
   "feo".
2. **Inputs y textos con tamaño fijo, no responsive:** por ejemplo línea 460
   (`FieldDark`): `className="mt-2 w-full px-4 py-4 rounded-md text-white text-2xl ..."`.
   `text-2xl` + `py-4` se aplican **igual en mobile que en desktop** (no hay
   `text-base sm:text-lg md:text-2xl`). El paso 1 (`StepPersonal`, línea 279) tiene 6
   campos en grid que en mobile caen todos en 1 columna (`grid sm:grid-cols-2`, por
   debajo de `sm` es 1 columna) — 6 inputs de fuente gigante apilados hacen que el
   formulario sea mucho más alto de lo necesario, y por el punto 1, todo eso queda
   comprimido dentro de una caja con `maxHeight` fija.

**Qué cambiar:**
1. En línea 144, quitar `overflow-y-auto` y `maxHeight: "calc(100vh - 4rem)"` del todo —
   dejar que el contenido fluya y sea la página (`window`) la que scrollee, no el panel
   interno. Ej.:
   ```jsx
   <div className="relative flex-1 min-w-0" style={{ background: BLUE }}>
   ```
2. En `FieldDark` (línea 450-466), `LabelDark` (línea 442), y los `<select>` de
   `StepPersonal`/`StepClub` (líneas 286-296, 324-337, 354-363), cambiar los tamaños fijos
   por escalas responsive, por ejemplo:
   - `text-2xl` → `text-base sm:text-lg md:text-2xl`
   - `py-4` → `py-2.5 sm:py-3 md:py-4`
3. Los títulos también son enormes en mobile por `clamp()` con mínimos altos (línea 159:
   `clamp(2.7rem, 5.4vw, 4rem)`; línea 162: `clamp(4.4rem, 9vw, 6.6rem)` para "team fsc").
   Bajar el mínimo del `clamp` para pantallas chicas, ej. `clamp(1.8rem, 5.4vw, 4rem)` y
   `clamp(2.8rem, 9vw, 6.6rem)` respectivamente.

---

## 3. Página Nosotros — la imagen del león (mascota) se ve recortada

**Archivo:** `frontend/src/components/FSCHistorySection.jsx`

**Síntoma:** la imagen de la mascota/león se corta (no se ve completa).

**Causa raíz:** esta sección obliga a **todas** las fotos del timeline (incluida
cualquier foto de la mascota que se suba ahí) a encajar en un recuadro con proporción
fija, recortando lo que sobra:
- Fotos flotantes del collage (modo introducción): línea 166, `aspectRatio: "4 / 3"` fijo,
  combinado con línea 187: `className="w-full h-full object-cover block"`. Si la foto
  subida no es exactamente 4:3, `object-cover` recorta los bordes (arriba/abajo si es
  muy vertical, los costados si es muy horizontal).
- Foto principal expandida (modo "año" seleccionado): línea 52, `COVER = { width: "100%",
  height: "100%" }`, con el mismo `object-cover` de línea 187 — se estira a ocupar toda
  el área del bloque (`md:min-h-[min(76vh,680px)]`, línea 128) recortando lo que no entra.

**Actualización — causa real confirmada (reportada por el usuario tras probar en mobile):**
el recorte del león NO viene del collage de fotos (4.), sino de la pantalla de bienvenida
"KOW" (`frontend/src/components/KowWelcome.jsx`), que sí usa `object-contain` (no debería
recortar por sí sola) pero vive dentro de un contenedor que en mobile no tenía altura
mínima definida:

- `FSCHistorySection.jsx` línea 126 y 128 (antes del fix): los wrappers de la sección solo
  definían `md:min-h-[...]` (alto mínimo SOLO desde tablet/desktop). En mobile, el alto de
  esos wrappers dependía por completo del contenido en flujo normal — y `KowWelcome` es
  `position: absolute; inset: 0`, así que NO aporta altura propia al padre.
- El wrapper interno (línea 128) además tenía `overflow-hidden` (pensado para contener las
  fotos flotantes de desktop). Como en mobile el alto podía terminar siendo menor de lo que
  la imagen + texto de Kow necesitaban, `overflow-hidden` recortaba lo que no cabía —
  típicamente la parte de abajo de la imagen del león y/o el texto, lo que además se sentía
  como una secuencia (texto visible → imagen recortada aparece al cargar → todo desaparece
  al hacer `onDone()` y pasar a la introducción) por la carga asíncrona de la imagen
  (`KowWelcome.jsx` líneas 26-36) combinada con ese recorte impredecible.

**Primer intento (insuficiente):** se agregó un `min-h-[480px]` fijo (mientras `showKow`
es `true`) y se cambió `overflow-hidden` por `overflow-visible md:overflow-hidden` en
mobile. Esto evitó el recorte, pero como `KowWelcome` seguía siendo `position: absolute`,
un `480px` adivinado no coincidía con el alto real de la imagen + texto: si la imagen real
del león era más alta que eso, el contenido se desbordaba **por debajo** del área
reservada y quedaba **superpuesto** con el siguiente bloque de la página (las flechas
◀▶ que navegan la línea de tiempo) — el usuario lo reportó así: "sale el texto, sale el
león, y el texto corre hacia abajo y queda debajo de las flechas".

**Segundo intento (regresión de UX):** se probó sacar a `KowWelcome` de `position:
absolute` en mobile (`relative md:absolute`) para que definiera su propio alto en el
flujo normal. Esto sí evitaba el desborde, pero rompía el propósito de la pantalla de
bienvenida: al estar en flujo normal ya NO tapaba el contenido de abajo, así que Kow y
"FSC EN LA HISTORIA" (el grid de introducción) se veían **los dos al mismo tiempo**, uno
debajo del otro, en vez de Kow reemplazando por completo a la introducción hasta que se
cierra.

**Corrección definitiva:** `KowWelcome` vuelve a ser `position: absolute; inset: 0`
SIEMPRE (mobile y desktop) — eso es necesario para que siga tapando por completo el grid
de introducción, que es el comportamiento esperado. Pero como al ser absoluta su alto
depende 100% del contenedor padre, y en mobile ese padre no tenía un alto de diseño fijo,
ahora se **mide el alto real** del contenido de Kow (imagen + texto) con
`ResizeObserver` y ese valor medido se usa como `min-height` del contenedor padre
mientras Kow está visible:
- `KowWelcome.jsx`: nuevo prop `onHeightChange`; un `ref` en el div del contenido
  (imagen + texto) + `ResizeObserver` reporta su alto real cada vez que cambia —
  incluido el salto de tamaño cuando la imagen termina de cargar (antes de cargar, una
  imagen con `h-auto` sin dimensiones conocidas puede ocupar 0px de alto; el
  `ResizeObserver` detecta el cambio a su alto real apenas carga).
- `FSCHistorySection.jsx`: nuevo estado `kowHeight`, pasado como `onHeightChange`. El
  contenedor (línea ~138) aplica `style={{ minHeight: kowHeight + "px" }}` mientras
  `showKow` es `true`. Se restauró `overflow-hidden` normal (ya no hace falta el
  `overflow-visible` de mobile, porque el alto medido garantiza que el contenido
  siempre entra).

Con esto: la pantalla de Kow (imagen arriba, texto abajo — orden que ya define
`KowWelcome.jsx` con `flex-col` por defecto en mobile) tapa por completo la introducción,
sin recortarse ni desbordarse, sea cual sea el tamaño real de la imagen o el largo del
texto configurado en el admin. Al cerrarse (clic, tecla Esc o los 10s de
`AUTO_DISMISS_MS`), desaparece y recién ahí aparece "FSC EN LA HISTORIA".

**Pendiente:** no se pudo verificar visualmente contra una foto real del león (la base de
datos local de desarrollo no tiene `nosotros_kow_image_url` configurada). Confirmar en
`/admin/home` subiendo la foto real y viendo el resultado en un viewport angosto (<640px).

---

### (Diagnóstico original, ya no es la causa principal pero puede seguir aplicando a las
### fotos del collage/timeline si alguna se ve cortada por separado del león)

**Causa raíz:** esta sección obliga a **todas** las fotos del timeline (incluida
cualquier foto de la mascota que se suba ahí) a encajar en un recuadro con proporción
fija, recortando lo que sobra:
- Fotos flotantes del collage (modo introducción): línea 166, `aspectRatio: "4 / 3"` fijo,
  combinado con línea 187: `className="w-full h-full object-cover block"`. Si la foto
  subida no es exactamente 4:3, `object-cover` recorta los bordes (arriba/abajo si es
  muy vertical, los costados si es muy horizontal). **Ya se ajustó** `objectPosition:
  "center 25%"` en este punto para reducir el recorte, pero sigue siendo `object-cover`.
- Foto principal expandida (modo "año" seleccionado): línea 52, `COVER = { width: "100%",
  height: "100%" }`, con el mismo `object-cover` de línea 187 — se estira a ocupar toda
  el área del bloque (`md:min-h-[min(76vh,680px)]`, línea 128) recortando lo que no entra.

---

## 4. Home — mobile: elementos amontonados y las imágenes junto a "EDICIÓN 2026" desaparecen

**Archivo:** `frontend/src/pages/Home.jsx`

### 4.a Las imágenes (niños jugando) desaparecen por completo en mobile

**Causa raíz — línea 117-119:**
```jsx
className={isMulti
  ? "hidden md:block absolute right-4 md:right-8 bottom-0 pointer-events-none drop-shadow-2xl"
  : "hidden md:block absolute right-4 md:right-8 bottom-0 pointer-events-none drop-shadow-2xl"}
```
`hidden md:block` significa: oculto por defecto, visible solo desde `md` (≥768px) hacia
arriba. **No hay ninguna versión mobile** — la imagen simplemente no se muestra en
teléfonos. Esto es intencional en el código actual, no un accidente de CSS, pero es
exactamente el bug reportado.

**Qué cambiar:** decidir un diseño para mobile de esa imagen en lugar de ocultarla. Opciones:
- Mostrarla más pequeña, centrada, debajo del texto "EDICIÓN 2026" (quitar `hidden`,
  usar `block md:absolute` con posición estática en mobile y absoluta desde `md`).
- Mostrarla como fondo decorativo detrás del texto con opacidad reducida.

Cualquiera de las dos requiere ajustar también el `ImageCarousel` (`frontend/src/components/ImageCarousel.jsx`)
porque hoy sus estilos (línea 120-125 de `Home.jsx`) están pensados solo para la
posición absoluta de escritorio (`width: "45%", height: "585px"` fijo en píxeles).

### 4.b Contenedor del hero con alto fijo en píxeles, igual en mobile y desktop

**Causa raíz — línea 98:**
```jsx
<div className="relative max-w-7xl mx-auto px-4 md:px-8" style={{ minHeight: "780px" }}>
```
`780px` de alto mínimo se aplica igual en un teléfono de 360px de ancho que en un
monitor grande. Sin la imagen lateral (que en mobile desaparece por 4.a), el contenido de
texto es mucho más corto que 780px, lo que puede generar espacio vacío grande o forzar a
otros elementos (navbar embebida, textos, badges de mes, chevron) a reposicionarse de
forma apretada dentro de ese espacio fijo, dependiendo del contenido dinámico del CMS.

**Qué cambiar:** reemplazar el `780px` fijo por algo responsive, por ejemplo:
```jsx
style={{ minHeight: "clamp(560px, 100vh, 780px)" }}
```
o con clases Tailwind: `min-h-[560px] md:min-h-[780px]` (quitando el `style` inline).

### 4.c Mismo patrón "hidden md:block" repetido en la galería de Finales

**Archivo:** `frontend/src/pages/Home.jsx`, línea 324:
```jsx
const mobileVisibility = isMiddle ? "" : "hidden md:block";
```
Esto oculta las 2 fotos laterales de la galería "Finales" en mobile (solo se ve la foto
central). No fue reportado explícitamente pero es el mismo anti-patrón que 4.a — vale la
pena revisarlo en la misma pasada ya que es la causa más probable de que "se vean cosas
incompletas" en otras partes del Home en mobile.

---

## 5. Home — interlineado muy apretado en "EDICIÓN 2026" y "FUTUR SOCCER CUP", y ese texto no es editable desde el admin

**Estado: reportado, todavía NO corregido — pendiente para la próxima pasada.**

**Archivo:** `frontend/src/pages/Home.jsx`

### 5.a Interlineado (line-height) muy apretado

**Síntoma:** el espacio vertical entre "EDICIÓN" y "2026", y entre las líneas de "FUTUR /
SOCCER / CUP" junto al logo, se ve demasiado pegado.

**Causa raíz:** los tres bloques de texto usan la clase Tailwind `leading-[0.85]`
(line-height: 0.85, o sea 85% del tamaño de fuente — muy ajustado para una fuente display
como `PLANE_CRASH`, pensado originalmente para una sola línea, no para separar bloques
apilados):
- Línea 158: `<span className="hidden sm:inline-block font-black leading-[0.85] ...">` —
  envuelve las 3 líneas "FUTUR" / "SOCCER" / "CUP" (separadas por `<br/>` en la línea 159)
  bajo el mismo `leading-[0.85]`, así que las 3 líneas quedan casi tocándose.
- Línea 230: `<h1 className="... leading-[0.85]">` para "EDICIÓN".
- Línea 237: `<div className="... leading-[0.85]">` para "2026", inmediatamente debajo del
  `<h1>` anterior sin margen entre ambos — el `leading-[0.85]` ajustado de cada uno más la
  falta de un margen/gap entre los dos elementos es lo que se ve "pegado".

**Qué cambiar:**
1. Línea 158: subir el interlineado del wordmark, ej. `leading-[0.95]` o `leading-tight`
   (Tailwind: 1.25), probando visualmente cuál se ve mejor con la fuente `PLANE_CRASH` real.
2. Líneas 230 y 237: mismo ajuste de `leading-[0.85]` a algo menos apretado (ej. `leading-[0.95]`),
   y/o agregar un pequeño margen entre "EDICIÓN" y "2026" (ej. `mt-1` o `mt-2` en el `<div>`
   de la línea 236).
3. Probar en desktop Y mobile — el `fontSize` de ambos usa `clamp()`, así que el interlineado
   visualmente relativo cambia con el tamaño de pantalla; puede que convenga un
   `leading-[...]` distinto por breakpoint (ej. `leading-[0.85] sm:leading-[0.9]`).

### 5.b El texto "FUTUR SOCCER CUP" está hardcodeado — no se puede editar desde el admin

**Síntoma:** a diferencia del resto del contenido del Home (hero, stats, footer, etc.,
todos editables desde `/admin/home`), el texto "FUTUR" / "SOCCER" / "CUP" junto al escudo
en la navbar del hero es fijo en el código.

**Causa raíz:** línea 158-159 de `Home.jsx`:
```jsx
<span className="hidden sm:inline-block font-black leading-[0.85] text-white drop-shadow-md" style={{ ...PLANE_CRASH, fontSize: "clamp(20px, 2.2vw, 32px)" }}>
  {renderPlaneCrash("FUTUR")}<br/>{renderPlaneCrash("SOCCER")}<br/>{renderPlaneCrash("CUP")}
</span>
```
Los strings `"FUTUR"`, `"SOCCER"`, `"CUP"` están escritos directo en el JSX, no vienen de
`s.algo` (el objeto `home_settings` que sí alimenta el resto del Home). El propio
comentario del backend (`backend/server.py` línea 5954) ya menciona esto: `nav_shield_url:
Optional[str] = ""  # escudo/logo circular junto al texto FUTUR SOCCER CUP` — el escudo es
editable, el texto no.

**Qué cambiar (agregar un campo nuevo, siguiendo el patrón que YA existe para
`footer_heading`, que es texto multi-línea editable — ver `backend/server.py` línea
~6000 y `frontend/src/pages/admin/AdminHomeSettings.jsx` líneas 279-287):**

1. **Backend** (`server.py`, junto a `nav_logo_url`/`nav_shield_url`, línea ~5953-5954),
   agregar al modelo `HomeSettings`:
   ```python
   nav_wordmark_text: Optional[str] = "FUTUR\nSOCCER\nCUP"  # texto junto al escudo (una línea por renglón)
   ```
2. **Frontend — Home.jsx**, reemplazar el texto fijo por algo que lea `s.nav_wordmark_text`,
   separe por saltos de línea, y haga fallback al valor por defecto si no está configurado:
   ```jsx
   <span className="hidden sm:inline-block font-black leading-[0.85] text-white drop-shadow-md" style={{ ...PLANE_CRASH, fontSize: "clamp(20px, 2.2vw, 32px)" }}>
     {(s.nav_wordmark_text || "FUTUR\nSOCCER\nCUP").split("\n").map((line, i, arr) => (
       <span key={i}>{renderPlaneCrash(line)}{i < arr.length - 1 && <br/>}</span>
     ))}
   </span>
   ```
3. **Admin — `AdminHomeSettings.jsx`**, agregar un `<textarea>` en la sección "Navbar (logo
   + escudo)" (línea 142-147), copiando exactamente el patrón de `footer_heading` (líneas
   279-287):
   ```jsx
   <div className="md:col-span-2">
     <label className="text-xs font-semibold text-slate-600">Texto junto al escudo (una línea por renglón)</label>
     <textarea
       rows={3}
       value={s.nav_wordmark_text || ""}
       onChange={(e) => upd("nav_wordmark_text", e.target.value)}
       className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md font-mono text-sm"
       placeholder={"FUTUR\nSOCCER\nCUP"}
       data-testid="field-nav-wordmark-text"
     />
   </div>
   ```
   También agregar `nav_wordmark_text: ""` al objeto `EMPTY` al inicio del archivo (línea
   9-15, junto a `nav_logo_url`/`nav_shield_url`).

---

## Resumen — orden sugerido de corrección

1. ~~**Home.jsx línea 117-119** — imágenes que desaparecen en mobile.~~ ✅ Corregido.
2. ~~**Home.jsx línea 98** — alto fijo del hero.~~ ✅ Corregido.
3. ~~**TeamRegister.jsx línea 144** — quitar scroll interno del formulario de registro.~~ ✅ Corregido.
4. ~~**TeamRegister.jsx** — inputs/labels con tamaño responsive.~~ ✅ Corregido.
5. ~~**LoginModal.jsx líneas 403-414** — imagen que no llena el alto completo.~~ ✅ Corregido.
6. ~~**FSCHistorySection.jsx / KowWelcome.jsx** — pantalla de bienvenida de Kow recortada
   en mobile.~~ ✅ Corregido (medición de alto real vía `ResizeObserver`, ver sección 3).
7. **Home.jsx líneas 158-159 y 230-241** — interlineado (`leading-[0.85]`) muy apretado en
   "FUTUR SOCCER CUP" y "EDICIÓN 2026" (sección 5.a). **Pendiente.**
8. **Home.jsx / server.py / AdminHomeSettings.jsx** — hacer editable desde el admin el
   texto "FUTUR SOCCER CUP" (sección 5.b). **Pendiente.**

## Patrón general a evitar hacia adelante

En varias partes del código, la estrategia para "adaptar a mobile" es **ocultar
elementos con `hidden md:block`** en vez de **redimensionarlos o reposicionarlos**. Eso
es lo que causa que en mobile la página se sienta incompleta (imágenes que faltan) en
vez de simplemente más compacta. Al revisar el resto del sitio, buscar el patrón
`hidden md:` o `hidden lg:` aplicado a contenido visual (no a menús/controles) y evaluar
si debería tener una alternativa mobile en lugar de desaparecer.
