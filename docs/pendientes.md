# Pendientes

Lista viva de lo que falta. Se va tachando de arriba abajo, de uno en uno.
Última revisión: 5 de octubre de 2026.

## Ahora

- [ ] **Publicar el PR #112.** Son 8 trabajos terminados y probados esperando:
  las 4 autoclaves Biobase en remate, la ventana flotante, la sección de
  promociones, el arreglo de seguridad y las promociones desde la hoja.
  <https://github.com/equipamientoib/SINERGIA/pull/112>

## Lo de Google, uno por uno

En este orden. Cada uno se cierra antes de empezar el siguiente.

- [ ] **1. Search Console** — pedir indexación de la tienda y de los equipos
  más vendidos. Es lo que más acelera y es gratis.
- [ ] **2. Merchant Center** — registrar `feed-google.xml` como fuente de datos
  desde archivo, que lo lea a diario, y activar las fichas gratuitas de
  productos. Con eso los equipos salen en la pestaña «Compras».
- [ ] **3. Analytics** — crear la propiedad y pegar el identificador `G-…` en
  `js/00-config.js` › `ANALYTICS`. Vacío no carga nada.
- [ ] **4. Google Business Profile** — la ficha de empresa en Maps, con la
  dirección de Pueblo Libre. Pesa mucho para «equipos biomédicos Lima».

## En Apps Script, cuando haya tiempo

- [ ] **Columnas de promoción** — reemplazar `Venta.gs` por el de este
  repositorio y ejecutar la función `prepararPromociones` (▶). Crea
  `precio_promo`, `promo_hasta` y `remate` al final de la hoja de venta.
- [ ] **Reintento al abrir una hoja** — reemplazar solo la función
  `abrirLibro_` en `Codigo.gs` y en `Venta.gs`. Evita el correo de error de
  Google cuando el servicio de Hojas de cálculo tropieza un segundo.

## Datos que faltan en el catálogo

- [ ] **13 equipos sin marca**, entre ellos los ecógrafos de S/ 271 000,
  S/ 144 000 y S/ 69 000. Sin marca no hay confianza ni expediente.
- [ ] **8 equipos sin foto.**
- [ ] **Ninguna ficha técnica en PDF** (0 de 152). Depende del proveedor.
- [ ] **Código NTS de las 4 autoclaves Biobase**, si lo tienen.
- [ ] **Fecha de fin del remate**, si se quiere una. Hoy dice «hasta agotar
  stock» y no vence solo.

## Decidido, no se toca

- **Precio tachado: no va.** Los clientes vuelven a comprar y negocian;
  anunciar la rebaja deja la sensación de que el precio de lista estaba
  inflado. Se muestra un solo precio con la etiqueta «Precio especial» o
  «Remate de stock».
- **Expediente de San Marcos: se queda como está.** El expediente y los
  planos se pueden descargar sin clave desde la web. Se ofreció cifrarlos o
  quitarlos y se decidió dejarlo. Se puede retomar cuando se quiera.
