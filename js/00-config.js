/* Bandera compartida: en true cuando ya llegaron los datos en vivo del
   Apps Script. Se declara aquí porque 00-config.js es el primer archivo
   que carga y otros la consultan (06-clientes.js, 07-router.js).        */
let DATOS_LISTOS = false;

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
  telefono: "+51 956 614 346",
  whatsapp: "51956614346",   // número con código de país; activa el botón flotante y el enlace del footer

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
};
