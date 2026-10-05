/* Banderas compartidas de carga. Se declaran aquí porque 00-config.js es
   el primer archivo que carga y otros las consultan.

   DATOS_LISTOS    -> ya llegaron los datos EN VIVO del Apps Script.
                      Lo usan los proyectos (06-clientes.js), que solo
                      aceptan la fuente en vivo.
   CATALOGO_LISTO  -> ya llegó una fuente buena del catálogo, sea el
                      archivo del repositorio o la hoja en vivo. Hasta
                      que sea true, el catálogo muestra marcadores de
                      carga en vez de los datos de respaldo: así el
                      cliente nunca ve el "parpadeo" de datos viejos. */
let DATOS_LISTOS = false;
let CATALOGO_LISTO = false;

/* =====================================================================
   00-config.js — EDITA AQUÍ los datos de tu empresa y ajustes del sitio
   Todo lo que está en este archivo se refleja automáticamente en el
   header, el footer, el botón de WhatsApp y la sincronización de datos.
   ===================================================================== */

const SITE = {
  nombre: "Sinergia Biomédica",
  razonSocial: "Servicios Integrales Sinergia S.A.C.",
  ruc: "20615862682",
  /* Datos de pago: salen en la cotización que genera el cotizador. */
  banco: "Banco Internacional del Perú S.A.A. (INTERBANK)",
  cuenta: "7023008608425",
  cci: "00370200300860842585",

  /* Clave para emitir cotizaciones (#/emitir/…): solo viaja su hash SHA-256,
     nunca la clave. Para cambiarla, reemplaza este hash. */

  lema: "Herramientas de metrología que distinguen su servicio",
  direccion: "Pueblo Libre, Lima — Perú",

  // Contacto (se muestra en el footer)
  email: "logistica@sinergiabiomedica.pe",
  web: "sinergiabiomedica.pe",
  /* TELÉFONO Y WHATSAPP — fuente única de la verdad.
     Todo el sitio, el botón flotante, los formularios, el membrete de los
     informes impresos y las exportaciones a Excel leen de aquí.
     · telefono: como se MUESTRA, con espacios.
     · whatsapp: como se ENVÍA, código de país pegado y sin signos.       */
  telefono: "+51 908 704 131",
  whatsapp: "51908704131",

  // Navegación (header, menú móvil y footer se generan de esta lista)
  /* nav: el header muestra estas entradas. Las marcadas con pie:true salen
     solo en el pie de página, para no recargar el menú de arriba.
     modo: la web tiene dos secciones, Venta y Alquiler, y cada una tiene
     su menú. Una entrada con modo solo se ve en esa sección; sin modo se
     ve en las dos (Servicios, Clientes, Contacto). Antes había un solo
     menú y, estando en Venta, «Catálogo» llevaba al catálogo de alquiler.
     El cambio de sección va en el selector Venta | Alquiler del header.
     pieT: el texto en el pie, donde las dos secciones salen juntas.     */
  nav: [
    { t: "Inicio",        r: "#/venta",     modo: "venta",    pieT: "Venta de equipos" },
    { t: "Tienda",        r: "#/venta/tienda", modo: "venta", pieT: "Tienda de venta" },
    { t: "Promociones",   r: "/promociones/",  modo: "venta", pieT: "Promociones" },
    { t: "Inicio",        r: "#/alquiler",  modo: "alquiler", pieT: "Alquiler de equipos" },
    { t: "Catálogo",      r: "#/catalogo",  modo: "alquiler", pieT: "Catálogo de alquiler" },
    { t: "Servicios",     r: "#/servicios" },
    { t: "Talleres",      r: "#/talleres",  modo: "alquiler" },
    { t: "Clientes",      r: "#/clientes" },
    { t: "Contacto",      r: "#/contacto" },
    { t: "Quiénes somos", r: "#/nosotros",  pie: true },
  ],
  portal: { t: "Portal distribuidores", r: "#/contacto" },
};

const CONFIG = {
  /* ┌──────────────────────────────────────────────────────────────────┐
     │ MOSTRAR_PRECIOS                                                  │
     │   true  -> la web muestra tarifas y el botón «Reservar».         │
     │   false -> oculta TODOS los precios; los botones pasan a         │
     │            «Solicitar cotización» y llevan a Contacto.           │
     │ Cambia solo esta palabra cuando termines de definir tus costos.  │
     └──────────────────────────────────────────────────────────────────┘ */
  MOSTRAR_PRECIOS: true,

  /* Clave para emitir cotizaciones (#/emitir/…). Solo viaja su hash SHA-256,
     nunca la clave. Para cambiarla, reemplaza este hash por el de la nueva.
     El cliente nunca pasa por esa pantalla: su enlace es el del resumen. */
  EMITIR_HASH: "d50bf3508be54ee073f3d0c99265eb970addad7af33d9776c10e2524b4650fb2",

  /* De dónde lee la web el catálogo, paquetes y proyectos:
     - "data/catalogo.json"  -> archivo del repo (Opción B: Excel + build_catalogo.py)
     - URL de Apps Script    -> Google Sheets EN VIVO (Opción A)                    */
  /* Archivo del repositorio: se lee primero para que la web aparezca al instante.
     Regenéralo con scripts/build_catalogo.py cuando cambie el catálogo. */
  CACHE_URL: "data/catalogo.json",

  /* ── VISTA PREVIA LOCAL · REVERTIR ANTES DE PUBLICAR ──────────────
     Con DATA_URL vacío la web usa solo data/catalogo.json, que aquí
     lleva las fotos de uso. Si no, la respuesta en vivo del Apps
     Script las reemplazaría a los pocos segundos.                  */
  DATA_URL: "https://script.google.com/macros/s/AKfycbyCC42QwfzqLYKo0J9ahH_m1upJ0uMIhd2hF2R7YOdNhtceXmhzRVYlydhkdjk-Xh_1Rg/exec",
  /* VENTA_URL: Apps Script PROPIO de venta (google-apps-script/Venta.gs).
     Es un proyecto aparte del de DATA_URL para no tocar alquiler, clientes
     ni expedientes. Vacío = la venta usa solo data/venta.json.          */
  VENTA_URL: "https://script.google.com/macros/s/AKfycbySXJ34IsPuR98QvLbIpiSh7-N6-PG6xsbFuuDPuNv9eNAFONN3Ndh3I4jYJe9KvHFuDw/exec",
  WHATSAPP: SITE.whatsapp,

  /* Tiempo máximo de espera de una descarga, en milisegundos. Si Google
     no responde a tiempo se corta y la web muestra su copia local, en
     vez de quedarse esperando indefinidamente.                        */
  TIMEOUT_MS: 25000,

  /* OPCIONAL. Si algún día contratas un servicio de formularios
     (Formspree, Getform, Basin…), pega aquí la URL del endpoint y las
     solicitudes también se enviarán ahí. Vacío = solo WhatsApp/correo. */
  FORM_ENDPOINT: "",

  /* GOOGLE ANALYTICS 4 — medir cuánta gente entra y por dónde.
     Pega aquí tu identificador, con el formato G-XXXXXXXXXX, y la web
     empieza a medir sola (también las páginas sueltas de venta y de
     alquiler). Se saca en analytics.google.com › Administrar › Flujos
     de datos › Web. Vacío = no se carga nada ni se envía nada.        */
  ANALYTICS: "",
};

/* Carga de Google Analytics. Solo si hay identificador: sin él no se pide
   ni un archivo a Google, así la web no cambia para nadie. En una web de
   una sola página hay que avisar cada cambio de dirección a mano, porque
   el navegador no recarga. */
function cargarAnalytics(){
  const id = (typeof CONFIG !== 'undefined' && CONFIG.ANALYTICS) || '';
  if(!/^G-[A-Z0-9]+$/i.test(id) || window.__ga) return;
  window.__ga = true;
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function(){ window.dataLayer.push(arguments); };
  gtag('js', new Date());
  gtag('config', id);
  addEventListener('hashchange', () => gtag('event', 'page_view', {
    page_location: location.href, page_title: document.title}));
}
if(document.readyState === 'loading') addEventListener('DOMContentLoaded', cargarAnalytics);
else cargarAnalytics();
