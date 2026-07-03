# Manual de Usuario — Future Soccer Cup

Bienvenido/a a la plataforma **Future Soccer Cup (FSC)**. Este manual te explica **paso a paso**, **campo por campo** y **botón por botón** cómo usar el sistema, aunque nunca lo hayas visto antes.

Está organizado por rol:

- 👤 **Administrador (Admin)** — Personal organizador de FSC.
- 🎯 **Director Técnico (Directivo)** — Representante legal / DT del club.
- 🎽 **Cuerpo Técnico (CT)** — Auxiliares del club (preparadores, delegados, médicos, utileros).

Al final tienes una sección extendida de **Preguntas Frecuentes** (más de 20 casos reales).

> 💡 **Consejo antes de empezar**: guarda el sitio en favoritos y usa siempre el mismo navegador para tu sesión (Chrome, Edge o Firefox actualizado). En móvil funciona, pero para tareas largas (cargas masivas, generación de fixture, revisión de 50 pagos) es más cómodo desde computador.

---

# PARTE 1 · ACCESO A LA PLATAFORMA (para todos los roles)

## 1.1 Crear tu cuenta

En la barra superior del sitio verás la palabra **REGISTRO**. Al presionarla te aparece una pantalla con dos tarjetas para elegir:

### Tarjeta A — "Soy Familiar / Aficionado"
Se usa si NO representas a un club (por ejemplo, un padre que quiere seguir el torneo o recibir comunicaciones). Solo pide:

| Campo               | ¿Qué escribir?                                            | Obligatorio | Si lo dejas vacío o mal   |
|---------------------|-----------------------------------------------------------|-------------|---------------------------|
| Nombre completo     | Tu nombre real, ej. `Ana María Pérez`                     | Sí          | El sistema no te deja continuar. |
| Correo electrónico  | Tu email, ej. `ana.perez@gmail.com`                       | Sí          | Muestra error "correo requerido". Si el correo ya está registrado, verás "email ya existe". |
| Teléfono            | Con indicativo, ej. `+57 300 123 4567`                    | No          | Se queda vacío; no pasa nada. |
| Contraseña          | Al menos 6 caracteres, combina letras y números.          | Sí          | Muestra "mínimo 6 caracteres". |
| Acepto tratamiento de datos ✔ | Casilla de aceptación de la política de datos.  | Sí          | El botón **Crear cuenta** queda deshabilitado. |

Botón **Crear cuenta** → te registra e inicia sesión automáticamente. Verás un mensaje verde "Bienvenido/a".

### Tarjeta B — "Soy Director Técnico / Cuerpo Técnico de un Club"
Te lleva a un formulario más largo (`/registro-equipo`). Los campos dependen del rol que elijas.

**Primero eliges tu rol** con el selector **"Rol dentro del club"**:

- **Directivo** — Eres el representante del club (presidente, DT principal). Podrás **crear tu club nuevo** desde este mismo formulario y luego cotizar.
- **Cuerpo Técnico** — Ya perteneces a un club existente (auxiliar, preparador, médico, delegado). Solo podrás **elegir de la lista de clubes aprobados**.

#### Si elegiste **Directivo**, verás estos campos:

| Campo                       | Ejemplo                             | Obligatorio | Nota                                                 |
|-----------------------------|-------------------------------------|-------------|------------------------------------------------------|
| Nombre completo del manager | `Carlos Ramírez`                    | Sí          | Es tu nombre, aparecerá en cotizaciones y contactos. |
| Cargo (manager_role)        | Directivo (ya seleccionado)         | Sí          | —                                                    |
| Documento del manager       | `71.123.456`                        | Recomendado | Ayuda al Admin a validarte.                          |
| Teléfono del manager        | `+57 300 111 2222`                  | Sí          | —                                                    |
| Correo electrónico          | `dt.esperanza@correo.com`           | Sí          | Debe ser único; con este correo iniciarás sesión.    |
| Contraseña                  | Mínimo 6 caracteres.                | Sí          | —                                                    |
| **Nombre del club**         | `Club Deportivo La Esperanza`       | Sí          | Ejemplo. Si escribes un club que YA existe, el Admin recibirá una advertencia; deberías usar la opción Cuerpo Técnico. |
| País                        | `Colombia`                          | Sí          | Selector de lista.                                   |
| Ciudad                      | `Bogotá`                            | Sí          | —                                                    |
| Color del club (HEX)        | Selector de color                   | No          | Sirve para el carnet y personalización del perfil.   |
| ✔ Acepto tratamiento de datos y uso de imagen | Casilla obligatoria. | Sí | Sin marcarla, el botón permanece deshabilitado. |

Botón **Registrar mi club** → crea tu usuario **y** crea el club en estado **pendiente**. Debes esperar a que un Admin lo apruebe para poder aparecer en listas públicas y cotizar.

⚠ **Importante**: mientras tu club esté "pendiente", verás un banner amarillo en la parte superior de la pantalla informando el estado.

#### Si elegiste **Cuerpo Técnico**:

| Campo                    | Ejemplo                             | Obligatorio | Nota                                    |
|--------------------------|-------------------------------------|-------------|-----------------------------------------|
| Nombre completo          | `Laura Molina`                      | Sí          | —                                       |
| Cargo específico         | `Preparadora física`                | Sí          | Ej: Asistente técnico, Delegado, Médico, Utilero, Presidente. |
| Documento                | `1.023.456.789`                     | Sí          | —                                       |
| Teléfono                 | `+57 310 555 0033`                  | Sí          | —                                       |
| Correo                   | `laura.m@correo.com`                | Sí          | —                                       |
| Contraseña               | Mínimo 6 caracteres.                | Sí          | —                                       |
| **Club existente**       | Selector de clubes aprobados        | Sí          | Si tu club NO aparece en el selector, es porque aún está en estado pendiente. Pídele al Directivo del club que espere la aprobación o que el Admin acelere la revisión. |
| ✔ Acepto tratamiento de datos | Casilla obligatoria             | Sí          | —                                       |

Botón **Registrarme al club** → tu usuario queda vinculado al club. NO puedes cotizar (esa acción es exclusiva del Directivo).

---

## 1.2 Iniciar sesión

1. Toca **INGRESO** en el menú superior.
2. Escribe tu **correo** y **contraseña**.
3. Toca **Entrar**.
4. Al éxito verás:
   - **Admin** → menú lateral con todos los módulos administrativos.
   - **Directivo / CT** → link "Mi Club" en el menú principal.

⚠ **Bloqueo por seguridad**: si ingresas la contraseña incorrecta **5 veces seguidas**, tu cuenta se bloquea por 15 minutos. Espera o pide ayuda al Admin.

## 1.3 Recuperar contraseña

1. En la pantalla de ingreso, toca **"¿Olvidaste tu clave?"**.
2. Escribe tu correo y confirma.
3. Verás un mensaje verde: "Solicitud enviada. Un administrador te contactará".
4. El Admin recibirá tu petición en su módulo **Recuperaciones**. Cuando la apruebe, recibirás un correo con un enlace único.
5. Abre el enlace, escribe una contraseña nueva (dos veces para confirmar) y toca **Restablecer**.

⚠ El enlace **caduca en 24 horas**. Si no lo usaste a tiempo, repite el proceso.

---

# PARTE 2 · GUÍA PARA EL ADMINISTRADOR

Como Admin, al iniciar sesión verás una **barra lateral azul oscura** con todos los módulos. Vamos módulo por módulo.

## 2.1 Dashboard (Panel principal)

Solo lectura. Al entrar ves:

- 4 tarjetas con: total de clubes, equipos, jugadores y cotizaciones pendientes.
- Últimos 5 partidos programados.
- Últimas 5 cotizaciones.

No hay botones. Es la vista general.

---

## 2.2 Home (CMS de la página principal del sitio público)

Este es el módulo más grande. Todo lo que se ve en la portada del sitio se edita aquí. Está dividido en pestañas:

### Pestaña "Navbar y Logotipo"
- **Logo Wordmark (`nav_logo_url`)** — Imagen del logo con letras (opcional). Al subirla se muestra en el menú superior.
- **Escudo (`nav_shield_url`)** — Escudo circular junto al texto.

Botón de cada campo: **Cambiar imagen** → abre un selector de archivo. Al subirla, el sistema la convierte a WebP automáticamente para que cargue rápido. Máx. 5 MB.

### Pestaña "Hero" (bloque grande al abrir el sitio)
- **Etiqueta EDICIÓN** (`hero_edition_label`) — Texto pequeño arriba del año. Por defecto "EDICIÓN".
- **Año** (`hero_edition_year`) — Ej. "2026".
- **Mes 1 / Mes 2** (`hero_month_1`, `hero_month_2`) — Los dos botones-badge blancos. Ej. "Octubre" / "Diciembre". Al hacer click en el sitio público estos botones bajan a la sección de stats.
- **Imagen de fondo** (`hero_image_url`) — Foto de estadio/multitud. Se muestra oscurecida detrás del texto.
- **Carrusel de imágenes al frente** (`hero_foreground_urls`) — Puedes subir **varias** imágenes que rotarán solas con crossfade cada 4.5 segundos. Botón **+ Agregar imagen** para cada una. Botones ↑ ↓ para reordenar. 🗑 para eliminar.

⚠ Si subes 2+ imágenes y NO ves rotación, refresca con Ctrl+F5.

### Pestaña "Estadísticas" (los 4 números grandes)
Para cada uno de los 4 slots:
- **Número** — Puede ser texto libre: `11`, `+1K`, `+10K`. Se anima con conteo al hacer scroll.
- **Etiqueta** — Texto debajo. Ej. "Ediciones", "Deportistas".

### Pestaña "Sección Finales"
- **Subtítulo** — Ej. "Estadio Centenario de Armenia".
- **Texto del botón CTA** — Ej. "Conoce más de FSC".
- **URL del botón CTA** — A dónde va cuando lo tocan. Ej. `/nosotros` o `https://…`.

La galería de fotos que rota abajo se administra desde el módulo **Galería** (2.4).

### Pestaña "Región + Mascota + Festival + Premier"
- **Título región** — Ej. "EL EJE CAFETERO LOS ESPERA".
- **Subtítulo región** — Ej. "Comfenalco Soleden".
- **Imagen de la mascota** — Se muestra grande entre las columnas Festival y Premier.
- **Título Festival** / **Logo Festival** / **Badge fecha Festival** (ej. "2 OCT") / **Categorías Festival** (lista de strings separados: "Sub-8", "Sub-10", …) / **URL botón "Acepta el reto"** — por defecto `/registro-equipo`.
- Mismo bloque para **Premier**, con dos listas de categorías (`categorías par` y `categorías impar`).

### Pestaña "Contacto y Footer"
- **Correo de contacto** (`contact_email`).
- **Teléfono** (`contact_phone`).
- **URL WhatsApp** (`whatsapp_url`) — Formato `https://wa.me/57XXXXXXXXXX`.
- **Instagram / Facebook / YouTube** — URL completa. Si dejas vacío, ese icono NO aparece en el footer.
- **Encabezado del footer** — Ej. "¿Y SI NOS TOMAMOS UN CAFECITO JUNTOS?".

### Pestaña "Páginas secundarias"
Bloques idénticos para: **Nosotros**, **Eventos**, **Contacto**, **Noticias**, **Estadísticas**.

Para cada una:
- **Kicker** (cursiva pequeña) — Ej. "conócenos".
- **Título** — Ej. "NOSOTROS".
- **Descripción** — Párrafo corto.
- **Imagen de fondo del hero**.
- **Overlay** — Color transparente sobre la imagen: `blue` o `red`.

Adicional en **Nosotros**: 4 tarjetas pill (título + descripción corta cada una).
Adicional en **Contacto**: kicker y título del formulario.

Botón **Guardar cambios** al final de cada bloque → refresca el sitio público al instante. No se envía notificación a nadie.

---

## 2.3 Galería

Muestra las fotos que rotan en la sección "Finales" del Home.

Botón **+ Nueva imagen**:
- **Título** (opcional) — Aparece como caption.
- **Imagen** — Botón "Subir foto".
- Botón **Guardar** → se agrega a la galería.

Cada fila:
- 🖼 Vista previa.
- ✏️ Editar título.
- ↑ / ↓ Reordenar.
- 🗑 Eliminar (pide confirmación; irreversible).

⚠ **Recomendación**: sube entre 3 y 12 imágenes. Menos de 3 no permite rotación; más de 12 hace que el carrusel sea lento.

---

## 2.4 Noticias (Posts)

### Crear noticia
Botón **+ Nueva noticia**:

| Campo         | Ejemplo                                     | Obligatorio | Nota                                          |
|---------------|---------------------------------------------|-------------|-----------------------------------------------|
| Título        | `Comienza la Edición 2026`                  | Sí          | —                                             |
| Subtítulo     | `El torneo arranca el 15 de octubre`        | No          | —                                             |
| Fecha         | Selector de fecha                           | Sí          | Se usa para ordenar el feed público.          |
| Portada       | Imagen que se muestra en el listado y arriba del artículo. | Sí | Máx. 5 MB. |
| Contenido     | Texto largo. Soporta párrafos, negritas.    | Sí          | Al menos 50 caracteres.                       |
| Destacada ✔   | Marca para fijarla arriba del feed público. | No          | Solo la última destacada aparece en portada.  |

Botón **Publicar** → aparece de inmediato en `/noticias`. **⚠ Es visible para todo el mundo apenas la publicas**.

Botón **Guardar como borrador** → NO se muestra pública hasta que la marques como "Publicada".

### Importar noticia desde URL
Botón **Importar desde URL** → pega la URL de un artículo (por ejemplo un medio deportivo). El sistema intenta traer título, imagen y descripción. Puedes editar antes de publicar. **Verifica siempre los datos importados**.

### Editar / eliminar
- Cada noticia tiene botones ✏️ **Editar** y 🗑 **Eliminar**.
- ⚠ Eliminar es **irreversible**.

---

## 2.5 Mensajes (bandeja del formulario de Contacto)

Vista de tabla con: fecha, nombre, correo, teléfono, mensaje, estado (leído/no leído).

- Icono ✉️ → marca como leído.
- Icono 🗑 → elimina (pide confirmación).

No hay respuesta directa desde la plataforma: para responder, copia el correo y contesta desde tu email personal o corporativo.

**Permisos**: solo Admin puede ver esta bandeja.

---

## 2.6 Categorías (catálogo global)

Aquí decides las categorías que existen en todo el sistema. Estas se usan para:
- Definir los equipos (Sub-8, Sub-12, o por año 2014, etc.).
- Filtrar en el fixture, tabla de posiciones.
- **Colorear el carnet oficial** de los jugadores.

Vista de tabla con estas columnas:

| Columna         | ¿Qué es?                                                                    |
|-----------------|-----------------------------------------------------------------------------|
| Nombre          | Ej. `Sub-12`, `2014`, `Femenino Sub-15`. **Debe ser único.**               |
| Orden           | Número que decide cómo se muestran (0 primero). Ej: 0, 1, 2, 3…            |
| Color carnet    | Selector visual + campo HEX (`#1d4ed8`). Este color se usará como fondo del gradiente en el carnet oficial. |
| Acciones        | 💾 Guardar / 🗑 Eliminar                                                    |

Botón **+ Nueva categoría** abre un modal:
- **Nombre** (obligatorio).
- **Orden** (opcional, por defecto al final).
- **Color del carnet** (selector visual + input hex).

Botón **Crear** → aparece inmediatamente en la lista.

⚠ **Advertencia al eliminar**: si eliminas una categoría, los equipos y jugadores ya asociados a ella NO se borran, pero esa categoría ya no aparecerá en los selectores. Los usuarios verán "—" en lugar del nombre.

**Permisos**: solo Admin.

---

## 2.7 Tipos de Evento

Catálogo de eventos que ofrece FSC. Por defecto vienen 3: **Festival**, **Premier Par**, **Premier Impar**.

Por cada uno:
- **ID interno** (`festival`, `premier_par`, `premier_impar`) — NO se puede cambiar una vez creado.
- **Nombre visible** — Ej. "Festival".
- **Descripción** — Ej. "Evento temático para iniciación. Octubre.".
- **Mes** — Ej. "Octubre".
- **Años de nacimiento admitidos** — Lista separada por comas: `2013, 2014, 2015, 2016, 2017, 2018`.
- **Tarifa por año** — Por cada año, precio en COP. Ej. `2014 → 2.400.000`.
- **Tarifa por defecto** — Se usa si un año específico no tiene tarifa.

Botón **Guardar cambios** por evento.

**Permisos**: solo Admin.

---

## 2.8 Torneos (Eventos concretos de una temporada)

Un Tipo de Evento (Festival) puede tener muchos torneos concretos (Festival 2026, Festival 2027, etc.).

Botón **+ Nuevo torneo**:

| Campo               | Ejemplo                              | Obligatorio | Nota                                            |
|---------------------|--------------------------------------|-------------|-------------------------------------------------|
| Nombre              | `Festival Armenia 2026`              | Sí          | —                                               |
| Temporada           | `2026`                               | Sí          | Se usa para el histórico.                       |
| Tipo de evento      | Selector (festival, premier_par, premier_impar) | Sí | —                                        |
| Ciudad              | `Armenia`                            | No          | —                                               |
| Sede principal      | `Estadio Centenario`                 | No          | —                                               |
| Imagen de portada   | Botón "Subir imagen"                 | No          | Se muestra en /eventos.                         |
| Fecha inicio        | Selector fecha                       | Sí          | —                                               |
| Fecha fin           | Selector fecha                       | Sí          | Debe ser posterior a la de inicio.              |
| Formato             | `Round Robin`, `Cuadrangular ×2`, `Eliminación` | Sí | Afecta el generador de fixture.        |
| **Categorías + tarifas** (tabla)  | | Sí | Al menos una. Botón "+ Agregar categoría". Por cada fila: nombre categoría, fee COP, fee USD, puntos por victoria/empate/derrota, puntos base fair-play, puntos por amarilla/roja/otra falta. |
| Archivado           | Casilla                              | No          | Al archivarlo, deja de aparecer como activo.    |
| Destacado           | Casilla                              | No          | Solo uno debería estar destacado a la vez.      |

⚠ **Cuidado al archivar**: los equipos ya inscritos al torneo archivado quedan asociados a él, pero el torneo no aparece en /eventos ni en las estadísticas live. Sí aparece en /historico.

Botón **Guardar** → crea el torneo.
Botón **Editar** por fila.
Botón 🗑 **Eliminar torneo** (⚠ irreversible; solo úsalo si NO tiene equipos asociados).

**Permisos**: solo Admin.

---

## 2.9 Paquetes (Inventario del Cotizador)

Aquí defines TODO lo que un cliente puede cotizar. Tabs:

### Hospedajes
Botón **+ Nuevo hospedaje**:
- **Nombre del hotel** — Ej. `Hotel Estelar Armenia`.
- **Categoría** — `5 estrellas`, `4 estrellas`, `Apart-hotel`, `Hostel`.
- **Precio por persona / 5 noches (COP)** — Ej. `1.500.000`.
- **Precio noche adicional / persona (COP)** — Ej. `250.000`.
- **Precio por persona / 5 noches (USD)** — Ej. `380`.
- **Precio noche adicional / persona (USD)** — Ej. `65`.
- **Acomodación** — Ej. `Habitación doble con desayuno buffet`.
- **Incluye** — Lista: `Wifi, piscina, desayuno`.
- **Imagen** — Foto del hotel.
- **Activo ✔** — Si desmarcas, deja de aparecer en el cotizador.

### Transportes
- **Nombre / ruta** — Ej. `Aeropuerto El Edén → Hotel`.
- **Precio por persona (ida)**, **precio ida-vuelta**, **precio grupal 30+**.
- **Descripción**.
- **Activo ✔**.

### Tours
- **Nombre** — Ej. `Tour Salento + Cocora`.
- **Duración** — Ej. `1 día`.
- **Precio por persona**.
- **Descripción**, **imagen**, **activo**.

### Comidas adicionales (Meal add-ons)
- **Nombre** — Ej. `Desayuno buffet extra`.
- **Tipo** — `breakfast`, `lunch`, `dinner`.
- **Precio unitario**.

Todos con botón 💾 **Guardar** y 🗑 **Eliminar** (pide confirmación).

**Permisos**: solo Admin.

---

## 2.10 Cotizaciones (revisión y aprobación)

### Vista principal
Tabla con: Cliente, Club, Evento, Categoría, Hospedaje, Pax × Noches, Total, Fecha, Estado, Acciones.

**Filtros de estado** (botones): Todas / pendiente / aprobada / rechazada / pagada.

**Buscador**: por cliente, evento, categoría o hospedaje.

Botón **Exportar CSV** → descarga la tabla filtrada actual.

### Acciones por cotización
- 👁 **Ver detalle** → abre modal con el desglose completo.
- Selector de **Estado** para cambiar directamente.
- 🗑 **Eliminar** (nuevo) → modal de confirmación.

⚠ **Al eliminar una cotización**: el pago manual asociado (si existía) NO se borra. Se queda huérfano y debes revisarlo manualmente en el módulo Pagos. Los cambios son irreversibles.

### Modal de detalle
Muestra:
- Datos del cliente, club, teléfono, moneda.
- Resumen económico: hospedaje subtotal + personas adicionales + alimentación + transporte + tours + inscripción + otros cobros = TOTAL.
- Desglose por evento con las categorías inscritas y su fee.
- Desglose por paquete de hospedaje con pax, noches, personas adicionales.
- Alimentación (fecha, tipo, personas, unitario, subtotal).
- Transporte (ruta, personas, fecha, subtotal).
- Tours (nombre, personas, subtotal).
- Notas del DT.

**Sección "Otros cobros"** (⚠ solo Admin):
- Valor adicional en la moneda de la cotización.
- Concepto — Ej. `Seguro de viaje` o `Kit del torneo`.
- Botón **Guardar** → aparece como una línea extra en el PDF.

Botón **📥 PDF** → descarga la cotización con el diseño oficial (para enviar al cliente).

Botón **✖ Cerrar** en la esquina superior derecha.

**Permisos**: solo Admin.

---

## 2.11 Pagos manuales

Aquí revisas los comprobantes que los Directivos subieron.

**Filtros**: Todos / sin_verificar / aprobado / saldo_pendiente / rechazado. También por Tipo (cotización / inscripción).

**Buscador** por DT, email, concepto, referencia, método o monto.

Vista de tabla: DT, Concepto, Monto, Método, Fecha, Comprobante (link 🔗), Estado, Acción.

### Botón "Revisar"
Abre un modal grande con:
- Nombre y correo del DT.
- Método (transferencia, consignación, PSE, Nequi, efectivo, otro).
- Fecha del pago.
- Referencia bancaria y notas del DT.
- **Vista previa del comprobante** — Imagen incrustada o botón para abrir PDF.
- **Nota interna** — Campo de texto donde puedes escribir tu observación (ej. `Falta sello del banco. Rechazado.`).
- Botones:
   - 🟢 **Aprobar** — Cuenta como pago abonado hacia el balance del cliente.
   - 🟡 **Marcar saldo pendiente** — El pago quedó aprobado parcialmente; el cliente debe complementar.
   - 🔴 **Rechazar** — El comprobante es inválido. El DT verá tu nota y podrá subir uno nuevo.

⚠ **Antes de aprobar**, verifica:
1. Que el monto coincida.
2. Que la referencia bancaria sea legible.
3. Que la fecha del comprobante esté dentro del plazo acordado.

Botón 🗑 **Eliminar** (nuevo):
- Modal de confirmación con el monto y el DT.
- **NO modifica la cotización**. Solo borra el registro del abono.
- Es irreversible.

Exportar CSV → descarga todos los pagos filtrados.

**Permisos**: solo Admin.

---

## 2.12 Clubes (vista de árbol)

Ves los clubes como un árbol expandible: **Club → Eventos inscritos → Categorías → Equipos → Jugadores y Cuerpo técnico**.

### Cabecera de cada club
- Logo, nombre, ciudad, país, presidente, DT principal.
- Badge de estado: `aprobado` / `pendiente` / `rechazado`.
- Contador de equipos.

### Botones por club
- ✅ **Aprobar** — Habilita al club en el sitio público y le permite cotizar.
- ❌ **Rechazar** — Deshabilita. El DT verá el estado en su panel.
- ⏳ **Marcar como pendiente** — Estado neutro.
- 🗑 **Eliminar club** (con modal de cascada):

⚠ **Advertencia crítica**: eliminar un club borra **en cascada**:
- Todos sus equipos.
- Todos sus jugadores y cuerpo técnico.
- Todas las cotizaciones del club.
- Todos los pagos del club.

El modal te muestra el conteo exacto antes de confirmar. El botón dice "Sí, eliminar todo". **No hay papelera ni forma de restaurar**.

### Al expandir un club
Ves usuarios registrados (con su rol: Directivo / CT), después la estructura de equipos.

### Por cada equipo
- Nombre + ✏️ (editar nombre).
- Badge de estado.
- Contador de jugadores y staff.
- Botones: ✅ Aprobar equipo / ❌ Rechazar / ➕ Agregar jugador / ➕ Agregar staff / 📄 **Descargar Roster PDF** (fotos + datos oficiales).

### Por cada jugador y staff
- Foto o inicial.
- Nombre, dorsal (o cargo), documento.
- ✏️ Editar → abre modal con TODOS los campos (nombre, apodo, género, dorsal, posición, fecha nacimiento, documento, EPS, número COMET, foto, datos del acudiente).
- 🗑 Eliminar — pide confirmación (window.confirm actual).

**Permisos**: solo Admin.

---

## 2.13 Equipos (vista de tabla)

Alternativa a la vista árbol. Tabla con paginación de todos los equipos del sistema. Útil para operar en masa.

Cada fila:
- Nombre, Club, Evento, Categoría, Grupo, DT, Estado.
- Botones ✏️ Editar / 🗑 Eliminar.

---

## 2.14 Jugadores (vista de tabla)

Similar. Tabla con todos los jugadores del sistema, con filtros por club, equipo, categoría.

---

## 2.15 Aprobaciones (cola unificada)

Una sola pantalla con **tres tabs**: Clubes / Equipos / Jugadores.

Cada tab muestra los pendientes. Botones inline **Aprobar** / **Rechazar**.

**Uso típico**: al inicio de una temporada, entras aquí y en 5 minutos apruebas todo lo que se ha registrado.

---

## 2.16 Generador de Fixture (calendario de partidos)

### Paso a paso
1. **Selecciona el Evento (torneo)** — Del selector.
2. **Categoría** — Debe existir en el torneo.
3. **Nombre del grupo** — Ej. `Grupo A`. Si el torneo es una sola fase, usa `Unigrupo`.
4. **Equipos** — Marca los que estarán en este grupo (checkboxes).
5. **Fecha de inicio** — Selector de fecha.
6. **Fecha fin** (opcional) — Si la escribes, el sistema valida que todos los partidos generados caigan antes de esa fecha.
7. **Días entre jornadas** — Ej. `7` para semanal.
8. **Vueltas** — `1` (solo ida), `2` (ida y vuelta).
9. **Turnos horarios** — Lista tipo `08:00, 10:00, 15:00`.
10. **Canchas** — Ej. `Cancha 1, Cancha 2`.
11. **Reglas deportivas** — Puntos por victoria, empate, derrota; puntos base fair-play y por amarilla/roja/otra falta. Por defecto se cargan las de la categoría del torneo.

Botón **Vista previa** → verás una tabla editable con cada partido. Puedes cambiar la fecha, hora y cancha de cada uno antes de guardar.

Botón **Guardar fixture** → persiste. Los equipos verán el fixture en su portal y en la sección pública.

### Fixtures guardados
Lista debajo del formulario. Por cada uno:
- Torneo, categoría, grupo, fecha inicio/fin, N equipos, N partidos activos.
- Botón ✏️ Editar → abre un editor de partidos.
- Botón 🗑 Eliminar (con modal):

⚠ **Al eliminar un fixture**: se borran los partidos **programados**. Los partidos **ya finalizados NO se borran** (quedan en el histórico para no perder resultados). El modal te muestra el conteo exacto.

---

## 2.17 Partidos

Tabla con TODOS los partidos del sistema. Filtros por torneo, categoría, grupo, estado.

Cada partido:
- Fecha, hora, cancha, equipos, marcador (si está finalizado), estado.
- Botón ✏️ **Editar** → cambia fecha, cancha, o registra el resultado:
  - Marcador local / visitante.
  - Goleadores (jugador + minuto).
  - Tarjetas amarillas / rojas (jugador + minuto).
  - Puntos de fair-play por equipo.
  - Ganador (obligatorio si el partido es de eliminación y hay empate).
  - Estado: `programado`, `en curso`, `finalizado`, `cancelado`.

⚠ **Al marcar un partido como finalizado**, el sistema recalcula automáticamente la **tabla de posiciones**, los **goleadores** y el **fair-play** del torneo.

---

## 2.18 Bracket (eliminación directa)

Genera y edita el bracket de la fase final: octavos → cuartos → semifinal → final.

Similar al generador de fixture pero para partidos de eliminación. Al finalizar un partido, el ganador avanza automáticamente.

---

## 2.19 Carnets 🆔

Aquí generas los carnets oficiales para imprimir.

### Filtros disponibles
- **Club** (dropdown).
- **Torneo** (dropdown).
- **Categoría** (dropdown).
- **Equipo** (dropdown).
- **Búsqueda** por nombre.

### Tabs
- **Jugadores** — Muestra un grid con el carnet de cada jugador filtrado.
- **Cuerpo técnico** — Igual pero para staff.

### Cada carnet muestra
- Foto grande (o inicial del nombre si no hay foto).
- Nombre completo.
- Cargo (Delantero, Portero, Director técnico, etc.).
- Dorsal (jugadores) o siglas del cargo (staff).
- Categoría.
- Escudo del club (izquierda) y logo del equipo (derecha).
- **Logo Future Soccer Cup** al lado del QR (🆕).
- **QR** que apunta al perfil público del jugador.
- Datos: documento, número COMET, fecha de nacimiento.
- **Color de fondo** según la categoría (definido en 2.6).

### Descarga
- **Individual**: pasa el mouse sobre un carnet → aparece botón "PDF" arriba a la derecha. Descarga solo ese.
- **Por lote**: marca las casillas ✔ de los carnets que quieras (o **Seleccionar todos** con un solo click), luego **Descargar PDF (N)**. Todos aparecen en una hoja imprimible tamaño carta.

⚠ **Recomendación**: no descargues más de 30 carnets por lote (el navegador puede quedarse sin memoria). Divide en lotes.

**Permisos**: **solo Admin puede ver y descargar carnets**. Ni el Directivo ni el Cuerpo Técnico tienen acceso a esta sección (por política de seguridad, para evitar que se generen credenciales no autorizadas).

---

## 2.20 Carga masiva (importar XLSX)

Sección con dos pestañas: **Equipos** y **Jugadores**.

### Flujo estándar (aplica a ambas pestañas)
1. Toca **Descargar plantilla XLSX**. Se descarga un Excel con:
   - Encabezados en español.
   - Una fila 2 de ejemplo (bórrala antes de subir tu data real).
   - **Listas desplegables dinámicas** (Categoría, Evento, Posición, Género, Designación).
   - Una hoja adicional **"Instrucciones"** con las reglas.
   - Una hoja **"Listas"** con los valores válidos (referencia).
2. Abre la plantilla en Excel, LibreOffice o Google Sheets.
3. Llena las filas con tu información. Usa las listas desplegables cuando estén disponibles para evitar errores.
4. Guarda el archivo (siempre en `.xlsx`).
5. Regresa a la plataforma. Toca **"Click para elegir archivo"** y selecciona el archivo.
6. Toca **Vista previa** → el sistema valida sin guardar y te muestra:
   - Cuántas filas están OK.
   - Cuántas tienen errores y la razón (por fila).
7. Si todo está bien → **Confirmar e importar**.

### Plantilla Equipos — columnas
| Columna                          | ¿Qué escribir?                                             | Obligatorio |
|----------------------------------|------------------------------------------------------------|-------------|
| Club                             | Nombre exacto del club. Si NO existe, se crea en pendiente.| Sí          |
| Nombre del equipo                | Ej. `Club Deportivo La Esperanza 2014 Único`               | Sí          |
| Evento                           | `festival`, `premier_par` o `premier_impar` (dropdown).    | Sí          |
| Categoría                        | Valor del dropdown (según catálogo actual).                | Sí          |
| Año de nacimiento                | Ej. `2014`                                                 | No          |
| Designación (Único/A/B)          | Dropdown. Sirve para diferenciar dos equipos del mismo club en el mismo año. | No |
| Grupo                            | Ej. `Grupo A`, `Unigrupo`. Puede quedar vacío si el fixture aún no está definido. | No |
| Director técnico                 | Nombre del DT.                                             | No          |
| Ciudad                           | Ej. `Bogotá`                                               | No          |
| País                             | Ej. `Colombia`                                             | No          |
| Presidente                       | Nombre.                                                    | No          |
| Teléfono delegado                | Ej. `+57 310 555 0001`                                     | No          |
| Color (HEX)                      | Ej. `#1d4ed8`                                              | No          |

### Plantilla Jugadores — columnas
| Columna                              | ¿Qué escribir?                                             | Obligatorio |
|--------------------------------------|------------------------------------------------------------|-------------|
| Equipo                               | Nombre exacto del equipo ya creado.                        | Sí          |
| Nombre del jugador                   | Ej. `Carlos Pérez`                                         | Sí          |
| Dorsal                               | Número entero, ej. `10`                                    | Sí          |
| Posición                             | Dropdown (18 valores válidos: Portero, Defensa central, …).| Sí          |
| Fecha de nacimiento (AAAA-MM-DD)     | Ej. `2014-03-15`                                           | Sí          |
| Documento de identidad               | Ej. `1750000000`                                           | Recomendado |
| Número COMET                         | Ej. `COMET-12345`                                          | No          |
| Apodo                                | Ej. `Pipo`                                                 | No          |
| Género (M/F)                         | Dropdown.                                                  | No          |
| EPS / Seguro médico                  | Ej. `Sanitas`                                              | No          |
| Nombre del acudiente                 | Padre/madre/tutor.                                         | No          |
| Documento del acudiente              | —                                                          | No          |
| Parentesco                           | Ej. `Madre`                                                | No          |
| Teléfono del acudiente               | Ej. `+57 310 765 4321`                                     | No          |

### Después de importar

En el panel de resultados verás:
- **Total de filas** procesadas.
- **OK** — cuántas se importaron con éxito.
- **Errores** — lista con el número de fila y la razón.
- **Creados** — lista de los equipos/jugadores creados con su ID.
- **Clubes creados automáticamente** (solo para Equipos) — En amber, con la nota "quedan en pendiente. Apruébalos en /admin/clubes".

⚠ **Recomendación**: haz **siempre Vista previa antes** de "Confirmar e importar". Una vez importado, para deshacer tendrías que eliminar registro por registro (o borrar el club en cascada).

**Permisos**: solo Admin.

---

## 2.21 Recuperaciones (Password Resets)

Bandeja con las solicitudes pendientes de reseteo de contraseña.

Cada solicitud muestra:
- Fecha, correo del usuario, nombre.
- Botón **Enviar enlace de reseteo** → genera un enlace único y lo envía por email al usuario (dura 24h).
- Botón **Cancelar solicitud** → si sospechas fraude o el usuario ya la resolvió.

**Permisos**: solo Admin.

---

# PARTE 3 · GUÍA PARA EL DIRECTOR TÉCNICO (DIRECTIVO)

Como Directivo, tu menú superior tiene: **Inicio**, **Estadísticas**, **Equipos**, **Noticias**, **Contacto**, **Cotizar**, **Mi Equipo**, **Mis Cotizaciones**, y a la derecha tu **avatar / menú de sesión**.

## 3.1 Mi Club / Mi Equipo

Al entrar a **Mi Equipo** ves:

### Bloque "Datos del club"
- Logo del club (visible).
- Nombre, país, ciudad, estado (badge).
- Botón **✏️ Editar datos**:
  | Campo         | Editable por | Nota                                             |
  |---------------|--------------|--------------------------------------------------|
  | Nombre        | Directivo    | Cambiarlo también cambia el nombre público.      |
  | País, ciudad  | Directivo    | —                                                |
  | Teléfono, correo, sitio web | Directivo | —                                        |
  | **Logo del club** | **Solo Directivo** | ⛔ El Cuerpo Técnico NO puede cambiar el logo. |
  | Color         | Directivo    | —                                                |

⚠ Si tu club está en estado **pendiente**, verás un banner amarillo: "Tu club está pendiente de aprobación. No puedes inscribir equipos ni cotizar hasta que el Administrador lo apruebe.". No es un error; es normal. Suele resolverse en 24-48 horas hábiles.

### Bloque "Equipos del club"
Lista de tus equipos. Por cada uno:
- Categoría, evento, grupo (si asignado), estado (aprobado/pendiente/rechazado).
- Contador: jugadores / cuerpo técnico.
- Botón **Ver plantilla** → abre la lista de jugadores.
- Botón **📄 Descargar Roster PDF** → PDF oficial con foto y datos.

### Botón "+ Nuevo equipo"
Formulario:
| Campo               | Ejemplo                                        | Obligatorio | Nota                                             |
|---------------------|------------------------------------------------|-------------|--------------------------------------------------|
| Nombre del equipo   | `Club Deportivo La Esperanza 2014 Único`       | Sí          | Sugerencia: `<Club> <Año> <Designación>`         |
| Evento              | Selector (Festival, Premier Par, Premier Impar)| Sí          | —                                                |
| Categoría           | Selector según catálogo actual                 | Sí          | —                                                |
| Año de nacimiento   | Ej. `2014`                                     | Sí          | Debe coincidir con los años admitidos del evento.|
| Designación         | Único / A / B / C                              | Sí          | —                                                |
| Color               | Selector                                       | No          | —                                                |
| Logo del equipo     | Botón subir imagen                             | No          | Máx 5MB.                                         |

Botón **Crear equipo** → el equipo queda en estado **pendiente** hasta que el Admin lo apruebe. Verás un mensaje verde.

**Permisos vs Cuerpo Técnico**: el CT PUEDE crear equipos (si el admin lo permite), pero por defecto solo el Directivo lo hace.

## 3.2 Cargar plantilla de jugadores (dentro de "Mi Equipo")

Dos formas:

### Opción A — Agregar uno por uno
Botón **+ Agregar jugador**. Modal con estos campos:

| Campo                       | Ejemplo                        | Obligatorio | Nota                                             |
|-----------------------------|--------------------------------|-------------|--------------------------------------------------|
| Nombre completo             | `Carlos Pérez`                 | Sí          | —                                                |
| Apodo                       | `Pipo`                         | No          | —                                                |
| Género                      | M / F                          | No          | —                                                |
| Dorsal                      | `10`                           | Sí          | Número entero mayor a 0.                         |
| Posición                    | Selector 18 opciones           | Sí          | —                                                |
| Fecha de nacimiento         | `2014-03-15`                   | Sí          | ⚠ El sistema valida que el jugador tenga la edad correcta para la categoría del equipo. Si el año no coincide con `Sub-12`, verás error rojo. |
| Documento                   | `1750000000`                   | Recomendado | Requerido para el carnet oficial.                |
| EPS                         | `Sanitas`                      | No          | —                                                |
| Número COMET                | `COMET-12345`                  | No          | Matrícula federativa.                            |
| Foto del jugador            | Botón subir                    | Recomendado | Se usa en el carnet. Máx 5MB. Formatos: JPG, PNG, WEBP. |
| Nombre del acudiente        | `María Pérez`                  | No          | Requerido para menores de edad.                  |
| Parentesco                  | `Madre`                        | No          | —                                                |
| Teléfono del acudiente      | `+57 310 765 4321`             | No          | —                                                |

Botón **Guardar jugador** → aparece en la plantilla.

Botones por jugador ya cargado:
- ✏️ Editar (mismos campos).
- 🗑 Eliminar (pide confirmación).

### Opción B — Carga masiva (Excel)
Dentro de Mi Equipo, botón **Descargar plantilla** → obtiene un XLSX con dos hojas: **Jugadores** y **Cuerpo Técnico** SOLO para tu equipo (no ves los de otros clubes).

Llénala y súbela con **Importar plantilla**. Verás vista previa. Confirma.

⚠ **Diferencia con la carga masiva del Admin**: aquí NO puedes crear clubes ni equipos; solo poblar el equipo actual.

## 3.3 Cargar tu Cuerpo Técnico

En cada equipo hay una sección **Cuerpo técnico**. Botón **+ Agregar cuerpo técnico**:

| Campo         | Ejemplo                  | Obligatorio | Nota                                         |
|---------------|--------------------------|-------------|----------------------------------------------|
| Nombre completo | `Laura Molina`         | Sí          | —                                            |
| Rol / Cargo   | Selector (DT, Asistente, Preparador físico, Preparador de arqueros, Médico/Fisioterapeuta, Utilero, Delegado). | Sí | —                    |
| Documento     | `1023456789`             | No          | —                                            |
| Teléfono      | `+57 310 555 0033`       | No          | —                                            |
| Número COMET  | `CT-987`                 | No          | —                                            |
| Foto          | Botón subir              | Recomendado | Aparece en su carnet.                        |

Botón **Guardar** → aparece en la lista de staff.

## 3.4 Cotizar (solo Directivo)

Si eres **Cuerpo Técnico** e intentas entrar a `/cotizar`, verás un mensaje bloqueante: "Solo el Directivo del club puede crear cotizaciones. Pídele que la genere y compártela contigo."

Como Directivo, entra a **Cotizar** en el menú:

### Paso 1: Moneda
Botón grande en la parte superior: **COP** o **USD**. Todos los precios cambiarán al instante según la moneda.

### Paso 2: Elige eventos y categorías
Bloque **"Eventos"** con las tarjetas de los torneos activos. Toca una tarjeta para agregarla. Por cada evento agregado te aparece:
- La lista de categorías con checkbox al lado. Marca las que vas a inscribir. Cada categoría tiene su tarifa (visible).

Ejemplo: Marcas "Festival Armenia 2026 → Sub-12" → verás `$2.400.000 COP` como fee de inscripción.

### Paso 3: Elige paquetes de hospedaje
Botón **+ Agregar paquete de hospedaje**:
- **Hotel/tier** — Selector con los hospedajes activos.
- **Cantidad de personas** — Ej. `21`.
- **Noches** — Por defecto `5`.
- **Personas adicionales** — Sub-bloque opcional para agregar personas que llegan en fechas distintas. Cada entrada lleva: etiqueta (ej. "Padres extra"), cantidad, noches, fecha desde, fecha hasta.

⚠ **Promo 21 gratis**: si registras 21 personas exactas, automáticamente 1 persona queda gratis (así lo verás en el desglose).

### Paso 4: Comidas adicionales
Botón **+ Agregar comida**:
- Fecha, tipo (breakfast/lunch/dinner), personas.

### Paso 5: Transporte
Botón **+ Agregar ruta de transporte**:
- Ruta (selector), personas, fecha.

### Paso 6: Tours
Marca las casillas de los tours que te interesan y define cuántas personas van a cada uno.

### Paso 7: Datos de contacto
- **Nombre de quien cotiza** — Se autocompleta con tu nombre.
- **Correo** — Se autocompleta.
- **Teléfono de contacto** — Debes escribirlo si no está.
- **Notas** — Texto libre para pedir aclaraciones.

### Calcular y guardar
- Botón **Calcular** → refresca el total con todo el desglose. NO guarda.
- Botón **Guardar cotización** → persiste. Estado inicial: **pendiente**. Recibirás la respuesta del Admin por email.

⚠ Si tu club está pendiente, verás un mensaje bloqueante impidiendo guardar.

## 3.5 Mis Cotizaciones

Historial de todas tus cotizaciones:
- Fecha, evento, hospedaje, total, estado.
- 👁 Ver → abre el detalle.
- 📥 Descargar PDF.
- 💳 **Subir comprobante** (solo si está aprobada).

## 3.6 Subir comprobante de pago

Al abrir una cotización aprobada, botón **Subir comprobante**. Formulario:

| Campo               | Ejemplo                          | Obligatorio | Nota                                                |
|---------------------|----------------------------------|-------------|-----------------------------------------------------|
| Monto del abono     | `5.000.000`                      | Sí          | Puede ser parcial (no tiene que ser el total).      |
| Método              | Transferencia / Consignación / PSE / Nequi-Daviplata / Efectivo / Otro | Sí | —                        |
| Fecha del pago      | Selector                         | Sí          | —                                                   |
| Referencia bancaria | Ej. `REF-98123`                  | Sí          | Ayuda al Admin a validarlo.                         |
| Notas               | Texto libre                      | No          | Ej. `Abono parcial del hospedaje.`                  |
| **Comprobante**     | Botón subir imagen o PDF         | **Sí**      | ⛔ NO puedes enviar sin el comprobante. Máx 5MB.    |

Botón **Enviar** → el pago aparece en el panel del Admin en estado "sin verificar". Recibirás la respuesta por email.

## 3.7 Otras acciones

- **Cambiar mi contraseña**: en el menú de perfil arriba a la derecha.
- **Cerrar sesión**: mismo menú.

---

# PARTE 4 · GUÍA PARA EL CUERPO TÉCNICO

## 4.1 Alcance de tu rol

Eres un colaborador del club (auxiliar, preparador, delegado, médico). Tu rol es operativo, no comercial.

### ✅ Lo que SÍ puedes hacer
1. Iniciar sesión.
2. Ver el club al que perteneces (`Mi Equipo`).
3. Consultar los equipos y jugadores del club.
4. **Agregar y editar jugadores** de los equipos del club.
5. **Agregar y editar tu propio staff** (cuerpo técnico).
6. **Descargar la plantilla XLSX del equipo** y hacer carga masiva de jugadores.
7. **Descargar el Roster PDF** del equipo.
8. Ver las cotizaciones del club (**solo lectura**).
9. Ver las noticias, fixture, tabla de posiciones y goleadores.
10. Actualizar tu perfil personal (correo, foto, contraseña).

### ⛔ Lo que NO puedes hacer
1. Crear un nuevo club.
2. **Cambiar el logo del club** (esta acción está bloqueada por seguridad; el sistema mostrará un aviso rojo).
3. **Aprobar o rechazar** equipos, jugadores o staff (solo Admin).
4. **Crear cotizaciones** — Al entrar a `/cotizar` verás una pantalla que dice: "Esta acción es exclusiva del Directivo del club. Pídele que genere la cotización y la comparta contigo.".
5. **Subir comprobantes de pago** — Solo el Directivo puede hacerlo.
6. Ver o descargar **carnets** (política de seguridad; solo Admin).
7. Eliminar en cascada (clubes, cotizaciones, pagos).

Si necesitas hacer algo bloqueado, pídele al **Directivo del club** o al **Admin** que lo haga por ti.

## 4.2 Cómo trabajar día a día

- Al iniciar sesión ve a **Mi Equipo** para ver el estado del club y los equipos.
- Si tienes que registrar jugadores nuevos:
  - Manuales: sigue los pasos de 3.2 Opción A.
  - Por lote: descarga la plantilla XLSX del equipo (aparece dentro del equipo, botón "Descargar plantilla"), llénala, súbela.
- Para consultar noticias, resultados y fixture, usa el menú público (Estadísticas, Noticias).

---

# PARTE 5 · PDFs, IMPRESIONES Y DESCARGAS

Tabla resumen de qué PDFs puede descargar cada rol:

| Documento                                | Admin | Directivo | Cuerpo Técnico | ¿Desde dónde?                                                             |
|------------------------------------------|:-----:|:---------:|:--------------:|---------------------------------------------------------------------------|
| Cotización (individual)                  | ✅    | ✅ (solo la suya) | ❌       | Módulo Cotizaciones (Admin) / Mis Cotizaciones (Directivo), botón "PDF".  |
| Roster del equipo (fotos + datos)        | ✅    | ✅         | ✅              | En el equipo, botón "PDF".                                                |
| Carnet individual (con QR + logo FSC)    | ✅    | ❌         | ❌              | Módulo Carnets. Al pasar el mouse sobre un carnet.                        |
| Hoja de carnets (lote imprimible)        | ✅    | ❌         | ❌              | Módulo Carnets, marca checkboxes + botón "Descargar PDF".                 |
| Fixture del torneo (calendario oficial)  | ✅    | ✅         | ✅              | Estadísticas → torneo → botón "Fixture PDF".                              |
| Tabla de posiciones                      | ✅    | ✅         | ✅              | Estadísticas → torneo → botón "Standings PDF".                            |
| Fair Play                                | ✅    | ✅         | ✅              | Estadísticas → torneo → botón "Fair Play PDF".                            |

---

# PARTE 6 · PREGUNTAS FRECUENTES Y SOLUCIÓN DE PROBLEMAS

Más de 20 casos reales que puedes encontrar. Léelos antes de contactar al soporte técnico.

---

### 🔐 1. "No puedo iniciar sesión, me dice contraseña incorrecta"
1. Verifica el correo (respeta mayúsculas/minúsculas del correo).
2. Verifica que la tecla **Bloq Mayús (Caps Lock)** no esté activa.
3. Si intentaste 5+ veces, la cuenta se bloquea 15 minutos. **Espera** y reintenta.
4. Si sigue sin funcionar, usa "¿Olvidaste tu clave?" y sigue el flujo.

### 🔐 2. "Me llegó el enlace de recuperación pero al hacer click dice que caducó"
El enlace **dura 24 horas**. Vuelve a solicitar la recuperación. Si el correo tarda en llegar más de 5 minutos:
- Revisa la carpeta de **Spam / Correo no deseado**.
- Verifica que el correo esté bien escrito.

### 🖼 3. "Subí una imagen y no se ve"
- Verifica que el archivo pese menos de **5 MB**.
- Formatos aceptados: **JPG, PNG, WEBP** (y PDF para comprobantes).
- El sistema convierte automáticamente PNG/JPG a WEBP para optimizar. Si la conversión falla, sube la imagen en menor resolución (ej. 1200×900).
- Refresca con **Ctrl+F5** (o Cmd+Shift+R en Mac).
- Si el navegador es antiguo, actualiza a Chrome/Edge/Firefox reciente.

### 📎 4. "El comprobante no se sube"
- Formato debe ser JPG, PNG, WEBP o PDF.
- Máximo 5 MB.
- Nombre del archivo: no uses caracteres raros como `!@#`. Prefiere `comprobante-oct-2025.pdf`.
- Verifica que la referencia bancaria sea **visible** en la imagen; si no, el Admin la rechazará.

### 💰 5. "El total de mi cotización no coincide con lo que calculé"
- ¿Marcaste todas las categorías correctas? La inscripción se paga **por categoría**.
- ¿El número de personas y noches del hospedaje es exacto?
- Si tu grupo tiene 21 personas, aplica la **promo 21 gratis**: 1 no paga hospedaje.
- Revisa **Otros cobros**: el Admin puede haber agregado un valor (kit del torneo, seguros).
- Si sigue sin cuadrar, envía captura al soporte con el detalle del cálculo.

### 🧾 6. "Mi cotización lleva 3 días en 'pendiente'"
El equipo FSC revisa manualmente. Tiempo estándar: 24-48 horas hábiles (lunes-viernes). Si urge:
- Escribe por WhatsApp desde el botón verde flotante del sitio.
- O escribe a `direccion@futuresoccercup.org` con el ID de la cotización (visible en la URL o en tu listado).

### ✅ 7. "Aprobé un club pero sigue apareciendo como pendiente"
- Refresca con **Ctrl+F5**.
- Verifica que el estado del club se haya guardado (badge verde en `/admin/clubes`).
- Si el DT sigue viendo "pendiente" en su panel, pídele que **cierre sesión y vuelva a entrar** (los estados a veces quedan cacheados en su cliente).

### 🏆 8. "Inscribí a mi equipo pero no aparece en el fixture"
Para que un equipo aparezca en el fixture necesita:
1. El **club** debe estar `aprobado`.
2. El **equipo** debe estar `aprobado`.
3. El equipo debe estar en un **grupo** dentro de un **fixture guardado** del torneo.

Si los 3 están OK y sigue sin aparecer, contacta al Admin: quizá el fixture aún no fue generado.

### 🪪 9. "Los carnets salen sin foto"
El carnet muestra la inicial del nombre cuando el jugador no tiene foto cargada. Ve al jugador en `/mi-equipo` (Directivo/CT) o `/admin/clubes` (Admin) y sube la foto. Refresca el módulo Carnets.

### 🎨 10. "Asigné color a la categoría pero el carnet sigue azul"
- Verifica que la categoría del **equipo del jugador** coincida exactamente con el nombre de la categoría en `/admin/categorias`.
- Guarda el color con el botón 💾 y refresca `/admin/carnets`.
- Si tienes categorías legacy (ej. "Sub-8") pero el equipo está inscrito en "2018", el carnet buscará el color de "2018", no de "Sub-8". Asigna color a la categoría correcta.

### 📥 11. "La carga masiva me dice 'Categoría inválida'"
- Descarga siempre una plantilla **nueva** desde el módulo (las listas cambian si el Admin agrega/quita categorías).
- Usa la **lista desplegable** en Excel para no cometer errores de tipeo.
- Verifica que no haya espacios al inicio o al final del nombre.

### 📥 12. "La carga masiva me dice 'Equipo no encontrado'"
- El nombre del equipo en la columna "Equipo" debe coincidir **letra por letra** con el equipo creado en el sistema. Incluye tildes, mayúsculas y espacios.
- Ejemplo: si el equipo se llama `Club Deportivo La Esperanza 2014 Único`, no funciona `club deportivo la esperanza 2014 unico`.
- Solución: descarga la plantilla desde `/mi-equipo` (Directivo): trae el nombre exacto del equipo actual.

### 🗑 13. "Eliminé un club por error"
- Los borrados en cascada son **irreversibles**.
- No hay papelera ni forma de restaurar desde la interfaz.
- Si acabas de hacerlo, contacta INMEDIATAMENTE al equipo técnico. Si aún no ha pasado más de 24 horas, puede que exista backup automático de la BD.

### 💳 14. "Aprobé un pago pero el saldo del cliente no bajó"
- Verifica que el pago esté en estado `aprobado` (verde) y no en `saldo_pendiente` (amarillo). Solo el estado verde suma al abono total.
- Refresca `/admin/pagos` con Ctrl+F5.
- Abre la cotización y valida el campo "Pagado" y "Saldo".

### 🌐 15. "Veo la página en blanco al entrar"
1. Refresca con **Ctrl+F5**.
2. Cierra sesión y vuelve a entrar.
3. Prueba en **navegación privada / incógnito** (evita extensiones interfiriendo).
4. Si sigue igual, informa al equipo técnico con:
   - Qué URL estabas viendo.
   - Qué acción hiciste justo antes.
   - Captura si es posible.

### 📱 16. "En el celular no me deja subir imagen"
- iOS: requiere iOS 14+ y Safari o Chrome actualizado.
- Android: asegúrate de dar permiso al navegador para acceder a tu galería.
- Si la foto es muy grande (>10 MB), redúcela desde la app Fotos (compartir → reducir tamaño).

### 🎽 17. "Soy Cuerpo Técnico pero no puedo cambiar el logo del club"
Correcto. Es una **restricción por diseño**: solo el Directivo del club puede cambiar el logo. Pídele al Directivo que lo haga por ti, o solicita al Admin que actualice tu rol a "Directivo" (implica cambio de responsabilidad).

### 👤 18. "Necesito cambiar mi rol de Cuerpo Técnico a Directivo"
Solo un Admin puede cambiar tu rol. Escribe a `direccion@futuresoccercup.org` con:
- Tu nombre y correo actual.
- Nombre del club al que perteneces.
- Motivo del cambio (por ejemplo, "el Directivo actual dejó el cargo y yo soy el nuevo representante").

### 💳 19. "Pagué con tarjeta (Stripe) pero mi cotización sigue pendiente"
- Después de pagar Stripe te redirige a `/pago-exitoso`. Espera 5-10 segundos: la plataforma consulta a Stripe automáticamente y actualiza el estado.
- Si tras 1 minuto no cambia, refresca la página.
- Si no cambia en 15 minutos, contacta al Admin con el ID de la sesión de Stripe (aparece en la URL).

### 📄 20. "Descargué el Roster PDF pero le falta información"
Los campos vacíos en el sistema aparecen como `—` en el PDF. Complétalos:
- Foto → sube desde el jugador.
- Documento y COMET → edita el jugador.
- Datos del acudiente → edita el jugador.
- Después de completar, vuelve a descargar el PDF.

### 🔄 21. "Cambié un dato en el CMS pero no se ve reflejado"
- El CMS aplica cambios en **tiempo real**. Sin embargo, el navegador puede tener la versión anterior en caché.
- Refresca con **Ctrl+F5**.
- En móvil: cierra la pestaña y vuelve a abrirla desde cero.

### 🏟 22. "Al generar el fixture me da error 'no hay suficientes turnos horarios'"
El generador necesita al menos:
- 1 turno horario × 1 cancha × 1 día = 1 partido por día.
- Si tienes 8 equipos jugando 7 fechas y 1 solo turno, necesitas 7 días de calendario.
- Aumenta la cantidad de turnos o canchas, o extiende la fecha fin.

### 📸 23. "Subí una imagen enorme y la app se ralentiza"
El sistema convierte automáticamente PNG/JPG a WebP para optimizar tamaño, pero si el archivo original pesa más de 5 MB rechaza la subida. Redúcelo antes de subirlo (usa herramientas como TinyPNG o Squoosh).

### 📆 24. "Un jugador aparece con edad incorrecta en el carnet"
- Revisa la **fecha de nacimiento** del jugador (formato `AAAA-MM-DD`).
- El sistema valida contra la categoría del equipo. Si el equipo es "Sub-12" y el jugador nació en 2010, verás error rojo al guardar.
- Corrige la fecha o cambia al jugador a un equipo con la categoría correcta.

### 🌍 25. "Necesito ver el sitio en inglés"
El sitio está desarrollado en español. La internacionalización no está implementada actualmente. Es un item del roadmap.

---

# PARTE 7 · CONTACTO Y SOPORTE

- **Correo oficial**: `direccion@futuresoccercup.org`
- **WhatsApp**: botón flotante verde en la esquina inferior derecha del sitio.
- **Redes sociales**: @futuresoccercup en Instagram, Facebook y YouTube.
- **Horario de atención administrativa**: lunes a viernes, 8:00 AM – 6:00 PM (hora Colombia, UTC-5).
- **Tiempo estándar de respuesta**: 24 horas hábiles.

Para reportar un problema técnico incluye:
1. Tu correo y rol.
2. Nombre del club (si aplica).
3. Qué estabas haciendo cuando ocurrió el problema.
4. Captura de pantalla del error.
5. Si es posible, la hora exacta del incidente.

---

**¡Gracias por hacer parte de la familia Future Soccer Cup!** ⚽🏆

Este manual se actualiza con cada versión de la plataforma. **Última actualización: febrero 2026 (Iter 42).**
