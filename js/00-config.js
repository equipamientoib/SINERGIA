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
  email: "ventas@sinergiabiomedica.pe",
  web: "sinergiabiomedica.pe",
  telefono: "+51 9XX XXX XXX",
  whatsapp: "51987654321",   // número con código de país; activa el botón flotante y el enlace del footer

  // Navegación (header, menú móvil y footer se generan de esta lista)
  nav: [
    { t: "Inicio",        r: "#/" },
    { t: "Quiénes somos", r: "#/nosotros" },
    { t: "Servicios",     r: "#/servicios" },
    { t: "Talleres",      r: "#/talleres" },
    { t: "Catálogo",      r: "#/catalogo" },
    { t: "Clientes",      r: "#/clientes" },
    { t: "Contacto",      r: "#/contacto" },
  ],
  portal: { t: "Portal distribuidores", r: "#/contacto" },
};

const CONFIG = {
  /* De dónde lee la web el catálogo, paquetes y proyectos:
     - "data/catalogo.json"  -> archivo del repo (Opción B: Excel + build_catalogo.py)
     - URL de Apps Script    -> Google Sheets EN VIVO (Opción A)                    */
  DATA_URL: "data/catalogo.json",
  WHATSAPP: SITE.whatsapp,
};
