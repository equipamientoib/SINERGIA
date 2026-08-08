# Auditoría y correcciones — sinergiabiomedica.pe

Documento de referencia de todo lo corregido. Ordenado de más a menos grave.

---

## 1. Parpadeo de datos al cargar (el problema original)

**Qué pasaba.** La web pintaba el catálogo **tres veces** en cada carga fría:

1. Al instante, con el arreglo `EQUIPOS` escrito a mano en `js/02-datos.js`
   (12 equipos, casi todos sin foto).
2. A los ~100 ms, con `data/catalogo.json` (13 equipos, con fotos).
3. Al segundo o más, con la hoja de Google vía Apps Script.

Como las tres fuentes tenían datos distintos, el cliente alcanzaba a ver el
catálogo viejo y luego un salto.

**Cómo se corrigió.** Mientras no llega una fuente buena se muestran tarjetas
fantasma (los mismos marcadores que ya usaba la sección de Proyectos), nunca
datos viejos. Además `js/02-datos.js` se regeneró como espejo exacto de
`data/catalogo.json`.

---

## 2. Otros dos bucles del mismo tipo

**Selector de equipos del formulario de contacto.** `js/04-personaliza.js` lo
llenaba una sola vez al arrancar, con los datos de respaldo, y no lo volvía a
tocar nunca. Un cliente no podía elegir un equipo nuevo de la hoja. Ahora lo
repinta el router junto con el resto del catálogo.

**Reintentos sin tope en la página de proyectos.** `js/06-clientes.js`
reintentaba dibujar el proyecto cada 400 ms durante 30 s mientras esperaba los
datos. Si Google se colgaba sin dar error, eso repintaba la pantalla unas 75
veces. Ahora hay un tope de 25 intentos (10 s) y se corta solo.

---

## 3. Fallo silencioso que congelaba el catálogo

Si un equipo de la hoja llegaba **sin la columna Marca u Origen**, la función
`eqBrand` lanzaba un error dentro de un `try/catch` vacío. Resultado: el
catálogo entero dejaba de repintarse, en silencio, y la web se quedaba con los
datos anteriores sin avisar de nada.

Se corrigió de dos formas: las lecturas ahora toleran filas incompletas, y el
repintado se hace por secciones con `seguro()`, de modo que si una falla las
demás se pintan igual y el error queda en la consola.

---

## 4. Ningún `fetch` tenía límite de tiempo

Era la causa de fondo. Si Google no respondía nunca (no un error: simplemente
no contestar), la promesa jamás se resolvía y la web esperaba para siempre.

Ahora todas las descargas abortan:

| Petición | Límite |
|---|---|
| `data/catalogo.json` (archivo local) | 5 s |
| Apps Script (hoja en vivo) | 12 s — `CONFIG.TIMEOUT_MS` |
| Panel privado del proyecto | 20 s |

Y hay dos niveles de respaldo: primero se pinta el catálogo con los datos
integrados, y solo después se da por perdida la sincronización en vivo.

**Peor caso medido** (el servidor no responde nunca): a los 5 s el catálogo
está completo, a los 10 s deja de reintentar el proyecto, a los 14 s se rinde
del todo. Cero errores de JavaScript, cero bucles.

---

## 5. Lo que restaba profesionalidad

**Los formularios no enviaban nada.** El botón de contacto mostraba un aviso
que decía literalmente *"Prototipo: este formulario se conectará a tu correo
vía Formspree"*. El botón de reserva del modal, lo mismo.

Ahora los dos validan los datos y arman la solicitud para enviarla por
WhatsApp o por correo, sin necesidad de servidor, con aviso en pantalla en vez
de una ventana emergente. Si algún día contratas un servicio de formularios,
pon la URL en `CONFIG.FORM_ENDPOINT` (`js/00-config.js`) y también se enviará
ahí.

**Datos de contacto dispersos y desactualizados.** El teléfono aparecía como
`+51 9XX XXX XXX` en la página de Contacto, y el número viejo `956 614 346`
estaba escrito a mano en cuatro sitios más de `js/06-clientes.js`, incluido el
membrete de los informes que se imprimen para el cliente y la cabecera de las
exportaciones a Excel.

Ahora **todo** sale de `js/00-config.js`:

| Dato | Valor |
|---|---|
| `telefono` | +51 908 704 131 |
| `whatsapp` | 51908704131 |
| `email` | logistica@sinergiabiomedica.pe |

Eso alimenta el pie de página, el botón flotante de WhatsApp, el bloque de
datos de Contacto, los dos formularios, el membrete de impresión y el Excel
exportado. Para cambiar un número mañana, se toca una sola línea.

**Precios visibles con el interruptor apagado.** La sección "Arma tu paquete"
mostraba las tarifas aunque `CONFIG.MOSTRAR_PRECIOS` estuviera en `false`.

**Ventanas emergentes `alert()`** en el panel de cliente, reemplazadas por un
aviso flotante discreto.

---

## 6. Latencia de arranque

**El portal de clientes pesaba más que todo el resto junto.**
`css/13-clientes.css` (78 KB) y `js/06-clientes.js` (70 KB) suman 148 KB: el
56% de todo lo que descargaba la web. Y es la zona privada del contrato, que
la mayoría de visitantes nunca abre. Aun así se bajaba entera antes de que la
portada apareciera.

Ahora se carga aparte (`js/06-portal.js`):

- Enlace directo a `#/clientes` o a `#/proyecto/...` → se descarga de inmediato.
- Cualquier otra página → se descarga en segundo plano, cuando el navegador ya
  está libre. Mientras tanto la sección de proyectos muestra sus marcadores,
  igual que antes: los proyectos vienen del Apps Script, así que de todos modos
  había que esperarlos.

| | Antes | Ahora |
|---|---|---|
| CSS de arranque | 114,6 KB · 14 archivos | 36,2 KB · 13 archivos |
| JS de arranque | 141,0 KB · 12 archivos | 75,2 KB · 12 archivos |
| **Total** | **255,6 KB** | **111,4 KB** |

**Las fuentes ya no bloquean el pintado.** La hoja de Google Fonts era un
archivo externo que había que resolver (DNS, TLS, descarga) antes de dibujar
un solo píxel. Ahora se carga sin bloquear: la página aparece con la tipografía
del sistema y cambia sola al llegar la definitiva.

**Estilos básicos en línea.** El `<head>` lleva ahora los colores, la
tipografía y la estructura del encabezado. La página tiene forma desde el
primer momento, sin esperar ningún archivo externo.

**El catálogo empieza a descargarse en el primer milisegundo.** Antes la
petición no arrancaba hasta que los doce scripts se habían descargado y
ejecutado. Ahora sale desde el `<head>`, en paralelo con el CSS y el JS.

**Los scripts se descargan en paralelo** (`defer`), en vez de uno tras otro
bloqueando la lectura del HTML.

**Caché en el Apps Script** (`CacheService`, 5 minutos). Antes cada visitante
hacía que el script abriera y leyera las hojas completas: esa era la mayor
fuente de lentitud del lado del servidor. Ahora el primero paga la espera y
los siguientes reciben la respuesta casi al instante.
Para forzar refresco: abre la URL con `?refrescar=1`, o ejecuta
`limpiarCache()` desde el editor de Apps Script.

**`preconnect`** a `script.google.com` y a Drive: ahorra DNS y TLS del camino
crítico.

**`vercel.json`**: `catalogo.json` pasó de `no-store` (descarga completa en
cada visita) a `max-age=60` con revalidación en segundo plano. Se añadieron
cabeceras de caché para imágenes y de seguridad para todo el sitio.

---

## 7. Latencia al abrir un proyecto (la queja de los clientes)

Esta era la parte lenta de verdad. Cuando un cliente metía su clave, el
Apps Script abría la hoja del contrato y la leía entera, cada vez. Eso son
varios segundos, y se pagaban íntegros en cada apertura, cada recarga y cada
cambio de pestaña dentro del panel.

### En el servidor

**Se eliminaron ~220 llamadas a la API de Google por apertura.** `fecha_()`
usaba `Utilities.formatDate`, que es una llamada al servicio de Apps Script.
Con 107 intervenciones y dos fechas cada una, eran más de 200 llamadas.
Ahora la fecha se arma con JavaScript puro: cero llamadas.

> REQUISITO: la zona horaria del proyecto de Apps Script debe ser
> **America/Lima** (Configuración del proyecto > Zona horaria). Si no lo está,
> las fechas podrían salir corridas un día.

**Cada hoja se lee una sola vez.** `detalle_()` pedía la hoja de PREVENTIVOS
dos veces, y cada lectura es un viaje al servidor de Google.

**La búsqueda de encabezados ya no recorre la hoja entera**, solo las primeras
40 filas. Los encabezados siempre están arriba.

**Caché de la respuesta completa**, partida en trozos porque Google solo admite
100 KB por clave. Una vez leída la hoja, las siguientes aperturas salen de
memoria.

**Precalentado automático.** Es el cambio que más se va a notar:

> **ACTIVAR UNA SOLA VEZ (30 segundos):**
> Editor de Apps Script → icono del reloj (Activadores) → Añadir activador →
> Función: `calentarCache` · Origen: Basado en tiempo · Tipo: Temporizador por
> minutos · **Cada 10 minutos** → Guardar.

Con eso la caché está siempre lista y ningún cliente paga nunca la lectura de
la hoja. Los datos que ve tienen como máximo 10 minutos.

### En el navegador del cliente

**Despertador.** Apps Script se apaga cuando nadie lo usa, y arrancar en frío
cuesta segundos. Ahora, en cuanto el cliente llega a la pantalla de la clave,
se lanza una petición mínima (`?ping=1`). Mientras escribe, Google levanta el
script; al pulsar el botón ya está caliente.

**Caché de sesión.** El detalle se guarda en el navegador 10 minutos. Recargar,
salir y volver, o cambiar de pestaña dentro del panel ya no pide nada:
es instantáneo y sin pantalla de espera.

**Aviso con etapas y cronómetro.** Si toca esperar, se dice qué está pasando
("Conectando…", "Leyendo la hoja del contrato…", "Preparando el listado de
equipos e informes…") y cuántos segundos lleva. Una pantalla que informa no
parece rota.

**Reintento automático.** Un fallo puntual de red se reintenta dos veces solo,
con espera creciente, antes de mostrar cualquier error. El cliente ni se entera.

---

## Archivos tocados

| Archivo | Cambio |
|---|---|
| `js/00-config.js` | Bandera `CATALOGO_LISTO`, `TIMEOUT_MS`, `FORM_ENDPOINT` |
| `js/02-datos.js` | Regenerado como espejo de `catalogo.json`. **No editar a mano** |
| `js/03-catalogo.js` | Marcadores de carga; lecturas tolerantes a filas incompletas |
| `js/04-personaliza.js` | Selector de contacto repintable; respeta `MOSTRAR_PRECIOS` |
| `js/05-detalle.js` | No se rompe si un equipo llega sin ficha técnica |
| `js/06-clientes.js` | Tope de reintentos; estado de carga y botón de reintento; aviso flotante. **Ya no se carga desde index.html** |
| `js/06-portal.js` | **Nuevo.** Carga diferida del portal de clientes |
| `js/07-router.js` | Firmas separadas, `fetch` con timeout, respaldo en dos niveles |
| `js/08-ui.js` | Protección si no existe el header |
| `js/10-modal.js` | Se quitó la función de prueba |
| `js/11-solicitudes.js` | **Nuevo.** Envío real de solicitudes |
| `css/05-catalogo.css` | Estilos de los marcadores de carga |
| `css/09-contacto.css` | Estilos de avisos y botones de formulario |
| `css/13-clientes.css` | Estilo del aviso flotante |
| `index.html` | Formularios reales, CSS crítico en línea, fuentes sin bloquear, scripts con `defer`, descarga anticipada del catálogo |
| `vercel.json` | Cabeceras de caché y seguridad |
| `google-apps-script/Codigo.gs` | Caché en trozos, precalentado, despertador, fechas sin API, lectura única por hoja |
| `scripts/sync_respaldo.py` | **Nuevo.** Evita que el respaldo se desincronice |

---

## Cómo subirlo

Reemplaza el contenido del repositorio con el de este ZIP y haz commit. Vercel
publica solo.

**Importante:** `google-apps-script/Codigo.gs` no se publica con la web. Ese
hay que pegarlo en el editor de Apps Script y luego:
*Implementar → Gestionar implementaciones → (lápiz) → Versión: Nueva versión.*
La URL no cambia.

---

## Mantenimiento

Cada vez que cambie el catálogo, ejecuta los dos scripts y sube ambos archivos:

    python3 scripts/build_catalogo.py     # hoja -> data/catalogo.json
    python3 scripts/sync_respaldo.py      # data/catalogo.json -> js/02-datos.js

Si `data/catalogo.json` se atrasa respecto a la hoja, el parpadeo puede volver
(más leve: solo entre la copia local y la hoja en vivo). Con los dos al día, no.
