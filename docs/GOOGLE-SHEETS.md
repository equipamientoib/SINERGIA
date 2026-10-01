# Conectar Google Sheets (sincronización en vivo)

Con esto, **editas tu Google Sheet y la web se actualiza** al recargar. No se reinstala nada, no se sube código. Es gratis y no requiere cuenta de servicio ni credenciales.

---

## Paso a paso

1. **Sube la hoja maestra a Google Sheets**
   Google Drive → Nuevo → Google Sheets → **Archivo → Importar** → sube `data/sinergia-hoja-maestra.xlsx` → *Reemplazar hoja de cálculo*.

2. **Abre el editor de scripts**
   En esa hoja: **Extensiones → Apps Script**.

3. **Pega el conector**
   Borra el contenido y pega **todo** `google-apps-script/Codigo.gs`. Guarda (💾).

4. **Publica como aplicación web**
   **Implementar → Nueva implementación** → engranaje → **Aplicación web**.
   - Descripción: `Catálogo Sinergia`
   - **Ejecutar como:** Yo
   - **Quién tiene acceso:** Cualquier usuario
   - **Implementar** → autoriza con tu cuenta.

5. **Copia la URL**
   Termina en `/exec`, por ejemplo:
   `https://script.google.com/macros/s/AKf.../exec`
   Ábrela en el navegador: debe mostrar el JSON del catálogo.

6. **Conéctala a la web**
   En `index.html`, cambia:
   ```js
   const CONFIG = { DATA_URL: "https://script.google.com/macros/s/AKf.../exec" };
   ```
   Sube el cambio. Listo: a partir de ahora, lo que edites en el Google Sheet aparece en la web.

> Si más adelante editas el código del Apps Script, vuelve a **Implementar → Administrar implementaciones → editar → Nueva versión** para que tome los cambios.

---

## Mapeo de columnas (qué lee la web de cada hoja)

### Hoja **Equipos**

| Columna | Qué es | Ejemplo |
|---|---|---|
| `id` | identificador único (sin espacios) | `esa620` |
| `grupo` | categoría grande | `Analizadores y simuladores` |
| `categoria` | tipo corto | `Analizador eléctrico` |
| `nombre` | nombre que se muestra | `Analizador de seguridad eléctrica` |
| `marca` | marca · procedencia | `Fluke ESA620 · EE.UU.` |
| `tier` | gama | `Premium` / `Estándar` |
| `icono` | ícono SVG (`ecg`, `pulse`, `num`, `gauge`, `tools`) | `ecg` |
| `codigo` | etiqueta corta | `ESA620` |
| `foto` | ruta o URL de la foto de portada | `img/esa620.jpg` |
| `precio_dia` | **precio por día (con IGV)** — editable | `270` |
| `precio_semana` / `precio_mes` | fórmulas `=día×4` / `=día×12` | |
| `ficha_pdf` | enlace al PDF de la ficha técnica | (URL de Drive) |
| `apoyo` | `sí` si es herramienta complementaria | |
| `descripcion` | resumen técnico del equipo | |
| `specs_json` | ficha en formato `{"Marca":"Fluke",...}` | |

> `precio_semana` y `precio_mes` se recalculan solos desde `precio_dia` (la web usa día×4 y día×12).

### Hoja **Paquetes**

| Columna | Qué es |
|---|---|
| `id`, `app`, `nivel`, `nombre` | identidad del paquete |
| `incluye_ids` | ids de equipos separados por coma (`esa620,sp-sim,ms400`) |
| `kit_apoyo` | `sí` si incluye el kit (multímetro + herramientas) |
| `equipos_hora`, `equipos_dia` | cuántos equipos se atienden (para las condiciones) |
| `por_equipo`, `por_hora`, `por_dia` | **precios por modalidad (con IGV)** — editables |
| `por_semana`, `por_mes` | fórmulas `=día×4` / `=día×12` |
| `descripcion` | resumen del paquete |

---

## Foto y ficha por equipo

- **Foto:** sube la imagen a Drive, ábrela, *Compartir → Cualquiera con el enlace (Lector)*, y pega un enlace **directo** a la imagen en `foto`. (También puedes dejar las que vienen en `/img`.)
- **Ficha técnica (PDF):** sube el PDF a Drive, compártelo como *Lector*, y pega el enlace en `ficha_pdf`. En la web aparece el botón **"Ver ficha técnica (PDF)"**.

---

## Si el navegador bloquea la lectura (CORS)

Las apps web de Apps Script suelen leerse sin problema desde el navegador. Si en algún caso se bloquea, alternativas:
- Publicar la hoja como CSV (*Archivo → Compartir → Publicar en la web*) y leer ese CSV, o
- Pasar a la **fase productiva** (Next.js), donde la lectura se hace del lado del servidor con una cuenta de servicio. Ver `ARQUITECTURA.md`.


---

## Hoja "Proyectos" (sección Nuestros clientes)

| Columna | Qué va |
|---|---|
| `id` | identificador corto sin espacios, ej. `clinica-monitores` |
| `cliente` | cómo se muestra el cliente, ej. `Clínica privada · San Isidro` |
| `titulo` | nombre del proyecto |
| `servicio` | línea de servicio, ej. `Metrología · Pack Monitores` |
| `fecha` | mes de inicio, ej. `Junio 2026` |
| `foto` | ruta de la imagen en `img/` (opcional; si va vacía se usa una ilustración) |
| `estado` | `En curso` o `Completado` |
| `avance` | número de 0 a 100 |
| `clave` | la clave que le entregas a tu cliente. **Nunca se publica**: la web solo recibe su versión cifrada (SHA-256) |
| `descripcion` | resumen público del proyecto |
| `hitos` | hitos separados por `\|`; los completados empiezan con `✓`. Ej: `✓ Levantamiento \| Informe final` |

**Qué es público y qué es privado:** la tarjeta (foto, cliente, título, descripción) es pública; el panel de avance (porcentaje + hitos) pide la clave. La clave demo de los proyectos de ejemplo es `demo123`.

**Nota honesta de seguridad:** en esta versión estática la clave viaja cifrada y no puede leerse, pero los datos de avance van dentro del JSON del catálogo; una persona muy técnica podría verlos. Para confidencialidad estricta, la Fase 2 (Supabase) mueve esto a una base de datos con inicio de sesión real.

---

## Catálogo de VENTA en vivo

La sección **Venta** (`#/venta`) se alimenta de la hoja **«Sinergia - Venta (catálogo en vivo)»** (Drive › 3. Página WEB). Su ID va en `VENTA_ID`, al inicio de `google-apps-script/Codigo.gs`. Si el Apps Script no responde, la web usa `data/venta.json` como respaldo.

**Parámetros (arriba de los encabezados):**
- `A1 margen · B1 35`: el % que se suma al precio del proveedor.
- `A2 actualizado · B2 fecha`: la fecha de la última revisión de precios y stock, cada lunes. La web muestra «Precios y stock al …».

**Columnas (fila de encabezados que empieza con `id`):**

| Columna | Qué es | ¿Se publica? |
|---|---|---|
| `id` | identificador, es la dirección de la ficha (`#/venta/p/<id>`); no cambiarlo una vez publicado | sí |
| `publicar` | `SI` = aparece en la web · `NO` = solo base de datos | — |
| `destacado` | 1…8 = orden en la portada de Venta | sí |
| `categoria` | `monitoreo`, `reanimacion`, `diagnostico`, `neonatal`, `quirofano`, `uci`, `imagenes`, `esterilizacion`, `laboratorio`, `cadena-frio`, `mobiliario` | sí |
| `nombre`, `marca`, `modelo`, `origen`, `resumen` | datos del equipo | sí |
| `precio_proveedor` | lo que cobra el proveedor | **no** |
| `precio_publicado` | fórmula = proveedor × (1 + B1/100); si falta, el Apps Script la calcula | sí |
| `stock_proveedor` | stock del proveedor | **no** |
| `stock_sinergia` | fórmula = stock del proveedor; 0 o vacío = «A pedido» | sí |
| `caracteristicas` | separadas con `\|` | sí |
| `expediente`, `clave` | nombre y código en expedientes técnicos (NTS 113) | sí |
| `areas` | separadas con coma | sí |
| `fotos`, `ficha_pdf` | enlaces de Drive (compartidos con «cualquiera con el enlace») | sí |
| `codigo_proveedor`, `descripcion_proveedor`, `notas` | uso interno | **no** |

**Primera vez:** pega el `Codigo.gs` actualizado en Apps Script, ejecuta `prepararHojaVenta` (▶) una vez (nombra la pestaña, pone las fórmulas y el formato), luego **Implementar › Gestionar implementaciones › Nueva versión** y ejecuta `limpiarCache`.

### Precios y stock del proveedor (A. Jaime Rojas · altokelite.com) con un clic

El portal solo deja entrar desde Perú y con usuario, así que no lo puede leer ningún servidor. Por eso lo lee un **favorito del navegador** («Actualizar Sinergia»), con la sesión ya iniciada:

1. Toma los códigos de la hoja de venta (`codigo_proveedor`).
2. Lee el catálogo del portal con su propia función de búsqueda. En cada producto aparecen el código, el stock y el precio en US$ con IGV.
3. Toma el tipo de cambio de la cabecera del portal («TC: S/ …»).
4. Escribe en la hoja:
   - `precio_proveedor`: el precio en soles, igual a US$ × TC;
   - `precio_proveedor_usd`;
   - `stock_proveedor`;
   - la fecha en B2.

**Instalación (una vez):** pega el `Codigo.gs` actualizado, ejecuta `crearBotonProveedor` (▶) y copia lo que sale en **Ver › Registros** como dirección (URL) de un favorito nuevo. Luego publica una **Nueva versión** de la implementación.

**Cada lunes:** entra a altokelite.com, ve a **Productos** y toca el favorito.

El código del botón está en `js/proveedor-atl.js`. La clave del favorito no está en el repositorio: vive en las Propiedades del script (`ATL_CLAVE`).
