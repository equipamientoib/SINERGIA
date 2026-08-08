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
     solo en el pie de página, para no recargar el menú de arriba. */
  nav: [
    { t: "Inicio",        r: "#/" },
    { t: "Servicios",     r: "#/servicios" },
    { t: "Catálogo",      r: "#/catalogo" },
    { t: "Talleres",      r: "#/talleres" },
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
  MOSTRAR_PRECIOS: false,

  /* De dónde lee la web el catálogo, paquetes y proyectos:
     - "data/catalogo.json"  -> archivo del repo (Opción B: Excel + build_catalogo.py)
     - URL de Apps Script    -> Google Sheets EN VIVO (Opción A)                    */
  /* Archivo del repositorio: se lee primero para que la web aparezca al instante.
     Regenéralo con scripts/build_catalogo.py cuando cambie el catálogo. */
  CACHE_URL: "data/catalogo.json",

  DATA_URL: "https://script.google.com/macros/s/AKfycbyCC42QwfzqLYKo0J9ahH_m1upJ0uMIhd2hF2R7YOdNhtceXmhzRVYlydhkdjk-Xh_1Rg/exec",
  WHATSAPP: SITE.whatsapp,

  /* Tiempo máximo de espera de una descarga, en milisegundos. Si Google
     no responde a tiempo se corta y la web muestra su copia local, en
     vez de quedarse esperando indefinidamente.                        */
  TIMEOUT_MS: 12000,

  /* OPCIONAL. Si algún día contratas un servicio de formularios
     (Formspree, Getform, Basin…), pega aquí la URL del endpoint y las
     solicitudes también se enviarán ahí. Vacío = solo WhatsApp/correo. */
  FORM_ENDPOINT: "",
};
