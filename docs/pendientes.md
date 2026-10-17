# Pendientes

Lista viva de lo que falta. Se va tachando de arriba abajo, de uno en uno.
Última revisión: 17 de octubre de 2026.

## Arreglos chicos anotados el 17/10/2026

Ninguno es urgente. Los tres salieron de trabajar en los PR #135 y #136.

- [ ] **El robot de venta no publica el feed de Google.** Su `git add` lleva
  `venta sitemap.xml index.html data/venta-vivo.json` y deja fuera
  `feed-google.xml`, `promociones/index.html` y las hojas A4 de
  `fichas/venta/`. Por eso el feed anunciaba dos equipos dados de baja, con
  enlace a una página que ya no existe. Arreglo: añadirlos al `git add` del
  robot (`.github/workflows/paginas-venta.yml`).
- [ ] **`/promociones/` desaparece del sitemap 20 minutos al día.**
  `generar_paginas.py` reescribe el sitemap y del anterior solo conserva las
  URL que llevan `/venta/`, así que a las 06:00 la borra y a las 06:20 el
  generador de venta la vuelve a poner. Arreglo: una línea en
  `scripts/generar_paginas.py` (la de `filas += [u for u in …]`).
- [ ] **La segunda página de los PDF imprime el gris del fondo.** Solo
  afecta a los PDF que pasan de una página (hoy, los dos Biobase con
  parámetros). El arreglo son tres palabras de CSS en la plantilla A4, pero
  esa plantilla la comparten las 164 hojas y regenera más de 150 PDF: hacerlo
  en un PR de limpieza, solo, y revisando qué archivos salen modificados.

## Ahora

- [ ] **Publicar el PR #115.** La página de promociones con la tarjeta nueva:
  solo el aviso diseñado y «Ver el equipo» debajo.
  <https://github.com/equipamientoib/SINERGIA/pull/115>

## Lo de Google, uno por uno

En este orden. Cada uno se cierra antes de empezar el siguiente. Los cuatro
los tiene que hacer el dueño: necesitan su cuenta de Google.

- [ ] **1. Search Console** — pedir indexación de `/promociones/`, `/venta/` y
  la portada, y comprobar que el sitemap esté dado de alta. Es lo que más
  acelera y es gratis.
- [ ] **2. Merchant Center** — registrar `https://sinergiabiomedica.pe/feed-google.xml`
  como fuente de datos desde archivo, que lo lea a diario, y activar las
  fichas gratuitas de productos. Con eso los 144 equipos del feed salen en
  la pestaña «Compras».
- [ ] **3. Analytics** — crear la propiedad y pegar el identificador `G-…` en
  `js/00-config.js` › `ANALYTICS`. Vacío no carga nada, a propósito.
- [ ] **4. Google Business Profile** — la ficha de empresa en Maps, con la
  dirección de Pueblo Libre. Pesa mucho para «equipos biomédicos Lima».

## En Apps Script, cuando haya tiempo

- [ ] **Columnas de promoción** — reemplazar `Venta.gs` por el de este
  repositorio y ejecutar la función `prepararPromociones` (▶). Crea
  `precio_promo`, `promo_hasta` y `remate` al final de la hoja de venta.
  Hasta que esto se haga, las promociones solo se pueden poner desde
  `data/venta.json`, que es más incómodo.
- [ ] **Reintento al abrir una hoja** — reemplazar solo la función
  `abrirLibro_` en `Codigo.gs` y en `Venta.gs`. Evita el correo de error de
  Google cuando el servicio de Hojas de cálculo tropieza un segundo.

## Datos que faltan en el catálogo

Esto no lo puede inventar nadie: sale del proveedor o del dueño.

- [ ] **13 equipos sin marca**, entre ellos los ecógrafos de S/ 271 000,
  S/ 144 000 y S/ 69 000. Sin marca no hay confianza ni expediente, y Google
  no los puede clasificar.
- [ ] **9 equipos sin foto.** Un equipo sin foto casi no se cotiza.
- [ ] **Ninguna ficha técnica en PDF** (0 de 152). Depende del proveedor.
- [ ] **Código NTS**: hay 71 cargados. Faltan los de las 4 autoclaves Biobase
  y los del resto del catálogo, si los tienen.
- [ ] **Fecha de fin de la promoción**, si se quiere una. Hoy dice «hasta
  agotar stock» y no vence sola.

## Decidido, no se toca

- **Precio tachado: no va.** Los clientes vuelven a comprar y negocian;
  anunciar la rebaja deja la sensación de que el precio de lista estaba
  inflado. Se muestra un solo precio con la etiqueta «Precio especial».
- **La palabra «remate»: no va.** Suena a liquidación de lo que nadie quiso.
  Todo dice «promoción» y «precio especial». El dato interno sigue
  llamándose `remate` porque es la columna de la hoja de cálculo; nadie lo ve.
- **El aviso diseñado no es la foto principal del equipo.** Va de segunda en
  la galería de la ficha. Google Shopping rechaza las imágenes con precio o
  teléfono encima, y perderíamos las fichas gratuitas.
- **Expediente de San Marcos: se queda como está.** El expediente y los
  planos se pueden descargar sin clave desde la web. Se ofreció cifrarlos o
  quitarlos y se decidió dejarlo. Se puede retomar cuando se quiera.
