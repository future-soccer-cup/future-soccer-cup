# Manual de Usuario — Future Soccer Cup

**Bienvenido/a a la plataforma Future Soccer Cup (FSC).**

Esta guía está pensada para que aprendas a usar el sistema sin necesidad de conocimientos técnicos. Cubre los tres tipos de usuarios que existen en la plataforma:

1. 👤 **Administrador (Admin)** — Equipo organizador de FSC.
2. 🎯 **Director Técnico (Directivo)** — Responsable de un club (inscribe equipos y cotiza).
3. 🎽 **Cuerpo Técnico** — Auxiliar del club (auxiliares, preparadores, delegados).

Al final encontrarás una sección de **Preguntas Frecuentes y Solución de Problemas**.

---

## 1. Cómo ingresar a la plataforma

La plataforma tiene dos URLs:
- **Sitio público** (para todos): la página principal del torneo, donde cualquier persona ve calendarios, resultados y noticias.
- **Área privada** (solo con cuenta): donde gestionas tu club, cotizas o administras el torneo.

### Paso a paso: crear una cuenta
1. Entra al sitio principal y toca **REGISTRO** en el menú superior.
2. Verás dos opciones:
   - **"Soy Familiar / Aficionado"** → cuenta básica (no puedes inscribir equipos, solo comprar tickets/mercancía si aplica).
   - **"Soy Director Técnico / Cuerpo Técnico de un Club"** → te lleva al formulario de inscripción de club/equipo.
3. Completa el formulario y marca la casilla **"Acepto el tratamiento de datos"** (obligatoria).
4. Recibirás un correo de bienvenida y podrás iniciar sesión.

### Paso a paso: iniciar sesión
1. Toca **INGRESO** en el menú.
2. Escribe tu correo y contraseña.
3. Presiona **Entrar**.
4. Si eres Admin, la barra lateral aparecerá automáticamente con las secciones administrativas. Si eres Directivo/CT, verás **"Mi Club"** en el menú.

### ¿Olvidaste tu contraseña?
- En la pantalla de ingreso, toca **"¿Olvidaste tu clave?"**.
- Escribe tu correo. Un administrador recibirá tu solicitud y te enviará un enlace para restablecerla.
- Abre el enlace desde tu correo y elige una contraseña nueva (mínimo 6 caracteres).

---

## 2. Guía para el ADMINISTRADOR (Admin)

Como Admin ves un menú lateral azul con acceso a todos los módulos. Cada módulo tiene sus propios botones de crear, editar, aprobar y eliminar.

### 2.1 Panel principal (Dashboard)
Al iniciar sesión ves un resumen con:
- Total de clubes, equipos, jugadores.
- Cotizaciones pendientes.
- Últimos partidos.

Es solo lectura. Sirve para revisar el estado general de un vistazo.

### 2.2 Home (CMS del sitio público)
Aquí decides cómo se ve la página principal.

- **Navbar**: subes el logo y el escudo.
- **Hero** (el bloque grande de la portada):
  - Título "EDICIÓN 2026".
  - Los dos badges de meses ("Octubre" / "Diciembre").
  - La imagen de fondo.
  - Un **carrusel** de imágenes de mascota o niños jugando (arrastras varias imágenes y rotarán solas).
- **Estadísticas**: los 4 números grandes ("+1K clubes", "+10K deportistas", etc.). Puedes cambiar tanto el número como el texto.
- **Finales**: subtítulo, botón CTA y galería (se administra desde el módulo "Galería" — ver §2.4).
- **Región + Mascota**: título y subtítulo (ej: "El Eje Cafetero los espera / Comfenalco Soleden") y la imagen de la mascota.
- **Festival y Premier**: los cuadros rojos con categorías, la fecha del evento y el logo.
- **Contacto/Footer**: teléfono, correo, redes sociales (Instagram / Facebook / YouTube), WhatsApp.
- **Páginas secundarias**: cada página (Nosotros, Eventos, Contacto, Noticias, Estadísticas) tiene su propio bloque con: título en cursiva pequeño (kicker), título grande, descripción, imagen de fondo y color del overlay (rojo o azul).

**Guardar los cambios**: cada bloque tiene botón "Guardar". Los cambios se reflejan inmediatamente en el sitio público.

### 2.3 Galería
- Sube nuevas fotos para la sección "Finales" del Home.
- Cada imagen tiene un título opcional. Puedes reordenarlas y eliminarlas.
- La galería del Home rota automáticamente cada 5 segundos.

### 2.4 Noticias
- **+ Nueva noticia** abre un formulario con título, subtítulo, contenido, imagen de portada y fecha.
- **Importar desde URL**: pegas una URL de un artículo externo y el sistema intenta traer el título e imagen automáticamente.
- Puedes marcar noticias como **destacadas** para que aparezcan primero en el feed público.

### 2.5 Mensajes
- Bandeja de entrada del formulario de "Contacto" del sitio.
- Cada mensaje muestra el nombre, correo, teléfono y texto del visitante.
- Botones: **Marcar como leído**, **Eliminar**.

### 2.6 Categorías
Aquí gestionas el catálogo de categorías que usarás en todo el sistema (Sub-8, Sub-10, o por año de nacimiento).

Cada categoría tiene:
- **Nombre** (obligatorio; ej. "Sub-12" o "2014").
- **Orden** (para el orden de aparición en menús).
- **Color del carnet** (importante ✨): elige un color con el selector. Ese color se usará como fondo en el carnet oficial de todos los jugadores y cuerpo técnico de esa categoría.

Botones: **Nueva categoría**, **Guardar** por fila, **Eliminar**.

### 2.7 Tipos de Evento
Define los 3 tipos de torneos que ofrece FSC (Festival, Premier Par, Premier Impar). Puedes cambiar nombres, descripciones, meses, años de nacimiento admitidos y tarifas por año.

### 2.8 Torneos (Eventos)
- **+ Nuevo torneo**: nombre, temporada, categorías (con tarifa por categoría en COP y USD), fechas, tipo de evento, ciudad, sede, imagen de portada.
- Marca uno como **Destacado** para que aparezca en la sección "Eventos" del Home.
- **Archivar** un torneo lo mueve al histórico (deja de mostrarse en secciones live).

### 2.9 Paquetes (Inventario)
Es donde defines los productos que aparecen en el Cotizador:
- **Hospedaje**: nombre, categoría (5 estrellas / apart-hotel…), precio por persona en 5 noches, precio noche adicional, comidas incluidas.
- **Transportes**: rutas con precio por persona (ida, vuelta, ida-vuelta).
- **Tours**: nombre, descripción, precio.
- **Comidas adicionales** (meal add-ons): desayuno, almuerzo, cena con precio unitario.

### 2.10 Cotizaciones
Lista de todas las cotizaciones creadas por directivos.

- **Filtros**: por estado (pendiente / aprobada / rechazada / pagada).
- **Buscar**: por cliente, evento, categoría o hospedaje.
- **Exportar CSV**: descarga todo el listado con totales.
- Por cada cotización puedes:
  - **Ver detalle** (icono ojo): abre el desglose completo (eventos, hospedaje, transporte, tours, comidas, inscripción, otros cobros).
  - **Cambiar estado** con el selector.
  - **Agregar Otros Cobros**: valor adicional con concepto (ej: "kit del torneo"). No modifica los subtotales previos.
  - **Descargar PDF** de la cotización.
  - **Eliminar** (nuevo 🗑): pide confirmación con un modal. Elimina para siempre.

### 2.11 Pagos manuales
Los directivos pueden subir comprobantes de pago (transferencia, consignación, PSE, Nequi, etc.). Aquí tú revisas cada uno.

- **Filtros**: estado (sin verificar / aprobado / saldo pendiente / rechazado) y tipo (cotización / inscripción).
- **Buscar** por DT, email, referencia, monto, método.
- Botón **Revisar** en cada fila abre un modal con:
  - Nombre del DT + email.
  - Método y fecha.
  - Referencia bancaria y notas del DT.
  - **Vista previa del comprobante** (imagen o PDF).
  - Un campo "Nota interna" para dejar tu comentario.
  - Botones **Aprobar**, **Marcar saldo pendiente**, **Rechazar**.
- Botón **Eliminar** 🗑 (nuevo): pide confirmación. La cotización asociada no se modifica.

### 2.12 Clubes
Vista de árbol: **Club → Equipos inscritos por evento y categoría → Jugadores y Cuerpo técnico**.

En cada club:
- Verás si está **aprobado / pendiente / rechazado** y cuántos usuarios están asociados.
- Puedes **aprobar** ✅, **rechazar** ❌ o marcar como **pendiente** ⏳.
- Puedes **eliminar** el club 🗑: se abre un modal con la cuenta exacta de equipos, jugadores, cotizaciones y pagos que se eliminarán en cascada. Confirmar es irreversible.

Expandiendo un equipo:
- Verás su plantilla de jugadores (foto, dorsal, posición, documento).
- Verás el cuerpo técnico.
- Puedes agregar, editar y eliminar jugadores/staff individualmente.
- Descargar el **roster PDF** del equipo.

### 2.13 Equipos / Jugadores (vistas de tabla)
Alternativa a la vista de árbol. Utiliza búsqueda + paginación para ver todos los registros de una sola vez y editarlos en masa.

### 2.14 Aprobaciones
Cola unificada de todo lo pendiente de aprobación:
- Clubes nuevos.
- Equipos.
- Jugadores.
- Cuerpo técnico.

Un solo click aprueba / rechaza cada elemento.

### 2.15 Generador de Fixture
Para crear el calendario de partidos de un torneo:

1. Selecciona el **Evento (torneo)**.
2. Selecciona la **Categoría**.
3. Escribe el **Nombre del grupo** (ej. "Grupo A").
4. Elige los **equipos** que van en ese grupo.
5. Fija **fecha de inicio**, días entre fechas, cantidad de vueltas.
6. Escribe los **turnos horarios** (ej. "08:00", "10:00").
7. Escribe las **canchas** disponibles.
8. Ajusta las reglas (puntos por victoria, empate, Fair Play).
9. Toca **Generar** → verás una vista previa editable (puedes cambiar fecha, hora y cancha de cada partido).
10. Toca **Guardar fixture**.

Debajo verás la lista de **fixtures guardados**. Cada uno tiene:
- **Editar** ✏️: modifica partidos individuales.
- **Eliminar** 🗑 (nuevo): modal de confirmación. Los partidos ya finalizados NO se borran; solo se limpian los programados.

### 2.16 Partidos
Vista de todos los partidos del sistema. Puedes:
- Editar fecha/hora/cancha.
- **Cargar resultados**: goles de cada equipo, goleadores (jugador + minuto), tarjetas amarillas/rojas, puntos de fair-play.
- Marcar como **finalizado** o **cancelado**.

### 2.17 Bracket
Genera y edita brackets de eliminación directa (octavos, cuartos, semis, final).

### 2.18 Carnets
Aquí generas los carnets oficiales para imprimir.

- Filtros: por Club, Torneo, Categoría o Equipo.
- Pestañas: **Jugadores** / **Cuerpo Técnico**.
- Cada carnet muestra:
  - Foto (o inicial del nombre si no hay foto).
  - Dorsal, Nombre, Posición, Categoría, Equipo.
  - Documento, número COMET, fecha de nacimiento.
  - **QR** que apunta al perfil del jugador en el sitio público.
  - **Logo Future Soccer Cup** (sin fondo, junto al QR) 🆕.
  - **Color del carnet** según la categoría (definido en §2.6) 🆕.
- Selecciona uno o varios (checkbox) y toca **Descargar PDF** para bajar el lote en una hoja imprimible.
- El botón individual "PDF" (aparece al pasar el mouse) descarga un solo carnet.

### 2.19 Carga masiva
Para importar equipos y jugadores en lote (útil al inicio de una temporada).

Dos pestañas: **Equipos** y **Jugadores**.

**Flujo típico**:
1. Toca **Descargar plantilla XLSX** — la plantilla ya trae:
   - Encabezados en español.
   - Un ejemplo en la fila 2 (bórralo antes de subir).
   - **Listas desplegables** en las columnas de Categoría, Evento, Designación (equipos) y Posición, Género (jugadores). Las listas se generan con los datos actuales del sistema.
   - Una hoja **"Instrucciones"** al final con las reglas.
2. Abre la plantilla en Excel/LibreOffice/Google Sheets y llena la información.
3. Guárdala y arrástrala al recuadro **Click para elegir archivo**.
4. Toca **Vista previa**: el sistema valida todo sin guardar. Verás cuántas filas están OK y cuáles tienen errores (con la razón).
5. Si todo se ve bien → **Confirmar e importar**.

En Equipos, si escribes un nombre de club que no existe en el sistema, se crea automáticamente en estado **"pendiente"** y aparecerá listado en amber al final del resultado ("Clubes creados automáticamente"). Ve a **Clubes** para aprobarlos.

En Jugadores, la columna "Equipo" debe coincidir **exactamente** con el nombre del equipo previamente creado.

### 2.20 Recuperaciones (Password Resets)
Ves todas las solicitudes de recuperación de contraseña. Cada una tiene:
- Nombre y correo del usuario.
- Botón para **enviar el enlace de reseteo** o **cancelar** la solicitud (si detectas fraude).

---

## 3. Guía para el DIRECTOR TÉCNICO (Directivo)

Como Directivo (rol `team` + `manager_role = "Director técnico"`), tu menú principal contiene: **Mi Club**, **Mis Cotizaciones**, y las secciones públicas.

### 3.1 Mi Club
Es tu hogar en la plataforma. Aquí:

- **Datos del club**: nombre, país, ciudad, teléfono, correo, sitio web, logo, color.
  - El **logo del club** solo lo puedes cambiar tú (los Cuerpos Técnicos no).
  - Toca el botón **Editar** y guarda.
- **Estado**: verás si tu club está pendiente, aprobado o rechazado. Los equipos y jugadores solo aparecen en las listas públicas cuando el club está **aprobado**.
- **Equipos**: cada equipo del club aparece con su categoría, evento (Festival/Premier), grupo y plantilla.
- **Nuevo equipo**: botón para inscribir un equipo adicional.

### 3.2 Cargar plantilla del equipo (Roster)
Dentro de "Mi Equipo" tienes dos formas de cargar jugadores:

**Opción A — Individual**:
1. En el equipo, toca **+ Agregar jugador**.
2. Completa: nombre, dorsal, posición (selector), fecha de nacimiento, documento, apodo, género, EPS, número COMET, foto, datos del acudiente.
3. **Guardar**.

**Opción B — Carga masiva (XLSX)**:
1. Toca **Descargar plantilla** — trae dos hojas: **"Jugadores"** y **"Cuerpo Técnico"**.
2. Llénala en Excel y guárdala.
3. Toca **Importar plantilla** y sube el archivo.
4. Verás vista previa; si todo bien, confirma.

### 3.3 Cuerpo técnico
En cada equipo hay una sección **Cuerpo técnico** donde agregas a tu Director Técnico, asistente, preparador físico, médico, delegado, etc. Cada uno lleva: nombre, rol, documento, teléfono y foto.

### 3.4 Cotizar
Solo los Directivos pueden usar el cotizador (los Cuerpos Técnicos ven un mensaje bloqueando el acceso).

1. Entra a **Cotizar** en el menú público.
2. Selecciona uno o varios **Eventos** y sus **categorías** (para calcular la inscripción por categoría).
3. Elige uno o varios **paquetes de hospedaje** (con cantidad de personas, noches y personas adicionales).
4. Marca los **tours** que te interesan.
5. Añade **comidas adicionales** (desayunos, almuerzos, cenas por fecha).
6. Añade **rutas de transporte**.
7. Elige la **moneda** (COP o USD).
8. Toca **Calcular** y verás el total con desglose.
9. Toca **Guardar cotización**: quedará en estado "pendiente" hasta que el Admin la revise.

### 3.5 Mis Cotizaciones
Historial de todas tus cotizaciones:
- Estado (pendiente / aprobada / rechazada / pagada).
- **Descargar PDF**.
- **Subir comprobante de pago** cuando esté aprobada.

### 3.6 Pago manual (subir comprobante)
1. Dentro de una cotización aprobada, toca **Subir comprobante**.
2. Elige el monto que estás abonando (puede ser parcial).
3. Selecciona el método (transferencia, consignación, PSE, Nequi, efectivo, otro).
4. Escribe la referencia bancaria y la fecha del pago.
5. Sube la **imagen o PDF del comprobante** (obligatorio).
6. **Enviar**. Aparecerá en el panel del Admin en estado "sin verificar".

### 3.7 Descargar Roster
Desde tu equipo, toca **PDF** para descargar la plantilla oficial con foto y datos de todos los jugadores.

---

## 4. Guía para el CUERPO TÉCNICO

Como Cuerpo Técnico (rol `team` + `manager_role = "Cuerpo Técnico"`), tienes acceso limitado pero suficiente para gestionar la operativa diaria.

### Lo que SÍ puedes hacer
- Iniciar sesión y ver el club al que estás asociado.
- Consultar la lista de equipos y jugadores del club.
- Editar y agregar jugadores (dentro de los equipos del club).
- Cargar la plantilla del cuerpo técnico (nombre, rol, documento, teléfono, foto).
- Ver las cotizaciones que el Directivo ha creado (solo consulta).

### Lo que NO puedes hacer
- Crear cotizaciones (el módulo **Cotizar** te muestra un mensaje que aclara que esa acción es exclusiva del Directivo).
- Cambiar el logo o los datos generales del club.
- Aprobar/rechazar equipos o jugadores.
- Subir comprobantes de pago (solo el Directivo).

Si necesitas hacer algo bloqueado, pide al Directivo o al Admin que lo realice por ti.

---

## 5. Descarga de PDFs disponibles

| PDF                       | ¿Quién lo puede descargar?         | Desde dónde                                                       |
|---------------------------|------------------------------------|-------------------------------------------------------------------|
| Cotización                | Directivo (la suya), Admin (todas) | Módulo "Cotizaciones" o "Mis Cotizaciones", botón "PDF"           |
| Roster del equipo         | Directivo, Admin                   | En el equipo, botón "PDF"                                          |
| Carnet individual         | **Solo Admin**                     | Módulo "Carnets", al pasar el mouse sobre un carnet               |
| Hoja de carnets (batch)   | **Solo Admin**                     | Módulo "Carnets", checkbox + botón "Descargar PDF"                |
| Fixture / Standings / Fair Play del torneo | Admin, Público (según config) | Estadísticas → seleccionar torneo → botones PDF        |

Los **Cuerpos Técnicos NO tienen acceso a carnets** (política de seguridad).

---

## 6. Preguntas frecuentes y solución de problemas

### 🔐 "No puedo iniciar sesión"
- Verifica que estés usando el correo correcto (respeta mayúsculas/minúsculas del correo original).
- Si te aparece "Contraseña incorrecta" muchas veces, la cuenta puede bloquearse temporalmente por seguridad. Espera 5 minutos e inténtalo de nuevo.
- Si olvidaste la contraseña, toca **"¿Olvidaste tu clave?"** y espera el correo del admin.

### 🖼 "No carga una imagen que subí"
1. Verifica que el archivo pese **menos de 5 MB**.
2. Formatos aceptados: PNG, JPG, WEBP, PDF (para comprobantes).
3. El sistema convierte automáticamente PNG/JPG a WEBP para optimizar velocidad; si la conversión falla, prueba subir la imagen en menor resolución.
4. Refresca la página con **Ctrl+F5** (o Cmd+Shift+R en Mac).
5. Si sigue sin cargar, avisa al Admin.

### 📎 "El comprobante de pago no se sube"
- Debe ser una imagen (JPG/PNG/WEBP) o un PDF.
- Máximo 5 MB.
- Asegúrate de que sea legible (número de referencia visible).

### 💰 "El total de la cotización no coincide con mis cálculos"
- Verifica que tengas seleccionadas las categorías correctas (la inscripción se paga por categoría).
- Revisa que el número de personas y noches sea el correcto para cada paquete de hospedaje.
- Si tu grupo tiene 21 personas, aplica la promo automática **"21 gratis"**: una persona no paga hospedaje.
- Si aún no cuadra, contacta al Admin: puede haber otros cobros o promos vigentes.

### 🧾 "Mi cotización lleva días en 'pendiente'"
El equipo de FSC debe revisarla manualmente. Los tiempos habituales son 24-48 horas hábiles. Si urge, escribe por WhatsApp desde el botón flotante verde del sitio.

### 🏆 "Mi equipo no aparece en las listas públicas"
Los equipos solo aparecen cuando:
- El **club** está en estado "aprobado".
- El **equipo** está en estado "aprobado".
- El equipo está inscrito a un **torneo activo** (no archivado).

Si tu club está pendiente hace más de 24h, escribe a `direccion@futuresoccercup.org`.

### 🪪 "Los carnets no se descargan"
- Solo los Admin descargan carnets (Directivos y CT no).
- Si eres Admin, revisa que las fotos de los jugadores estén cargadas: los carnets sin foto muestran solo la inicial.
- Si la descarga demora mucho (más de 30 segundos), reduce la selección a 20-30 carnets por lote.

### 🎨 "El color del carnet no cambió aunque asigné uno"
- Ve a **Categorías** y verifica que la categoría del equipo del jugador tenga un color asignado (hexadecimal, ej. `#ff5733`).
- Guarda con el botón 💾.
- Refresca la vista del carnet.

### 📥 "La carga masiva me da errores"
- Descarga siempre una plantilla **nueva** desde el módulo (las listas desplegables cambian si el Admin agrega categorías o eventos nuevos).
- Los errores más comunes:
  - **"Categoría inválida"**: escribe el nombre exacto que aparece en el desplegable.
  - **"Equipo no encontrado"** (jugadores): revisa que el nombre coincida letra por letra con el equipo creado en el sistema.
  - **"Falta el nombre"**: alguna fila viene vacía; elimínala o complétala.
  - **"Dorsal inválido"**: el dorsal debe ser un número entero.
- Usa **Vista previa** antes de confirmar: te muestra todos los errores sin guardar nada.

### 🗑 "Eliminé un club por accidente"
- Los borrados en cascada son **irreversibles** (se elimina el club, sus equipos, jugadores, cotizaciones y pagos).
- No hay papelera de reciclaje.
- Si acabas de hacerlo, contacta inmediatamente al equipo técnico para intentar restaurar desde el último backup.

### 🌐 "Veo la página en blanco / errores raros"
1. Refresca la página con **Ctrl+F5**.
2. Cierra sesión y vuelve a entrar.
3. Prueba en una ventana de incógnito.
4. Si el problema persiste, avisa al equipo técnico con:
   - Qué sección estabas viendo.
   - Qué acabas de hacer justo antes del error.
   - Una captura de pantalla si es posible.

### 📱 "¿Funciona bien en el celular?"
Sí. Todo el sitio está optimizado para móviles. Sin embargo, para tareas largas (Carga masiva, generar fixture, revisar 50 pagos), la experiencia es más cómoda en computadora.

### 🧑‍💼 "¿Cómo cambio mi rol de Cuerpo Técnico a Director Técnico?"
Contacta al Admin (`direccion@futuresoccercup.org`). Solo un Administrador puede cambiar el rol dentro del club.

---

## 7. Contacto y soporte

- **Correo oficial**: `direccion@futuresoccercup.org`
- **WhatsApp**: botón flotante verde en la esquina inferior derecha del sitio.
- **Redes**: @futuresoccercup en Instagram, Facebook y YouTube.
- **Horario de atención administrativa**: lunes a viernes, 8:00 AM – 6:00 PM (hora Colombia).

---

**¡Gracias por hacer parte de la familia Future Soccer Cup!** ⚽🏆

Este manual se actualiza con cada versión de la plataforma. Última actualización: **febrero 2026**.
