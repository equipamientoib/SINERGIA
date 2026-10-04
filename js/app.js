/* ===== js/00-config.js ===== */
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
};

;
/* ===== js/01-componentes.js ===== */
/* =====================================================================
   01-componentes.js — Header y footer UNIVERSALES
   Se construyen una sola vez desde los datos de SITE (js/00-config.js).
   Para cambiar un enlace, un correo o el RUC: edita 00-config.js.
   Los logos viven aquí inline (SVG) para que usen la tipografía de la
   página; hay copias de referencia en img/logos/.
   ===================================================================== */

const LOGO_HEADER = `<svg class="logo-h logo-svg" viewBox="0 0 880 240" role="img" aria-label="${SITE.nombre}" onclick="go('#/')">
  <text x="40" y="208" font-weight="700" font-size="212" textLength="252" lengthAdjust="spacingAndGlyphs"><tspan fill="#9A7F4E">S</tspan><tspan fill="#2A2D33">B</tspan></text>
  <text x="342" y="158" font-weight="700" font-size="100" fill="#17191D" textLength="498" lengthAdjust="spacingAndGlyphs">SINERGIA</text>
  <text x="342" y="212" font-weight="600" font-size="52" fill="#2A2D33" textLength="498" lengthAdjust="spacingAndGlyphs">BIOMÉDICA</text>
  <rect x="342" y="228" width="498" height="3" fill="#9A7F4E"/>
</svg>`;

const LOGO_FOOTER = `<svg class="footer-logo logo-svg" width="250" viewBox="0 0 880 265" role="img" aria-label="${SITE.nombre}">
  <text x="40" y="208" font-weight="700" font-size="212" textLength="252" lengthAdjust="spacingAndGlyphs"><tspan fill="#C0A56E">S</tspan><tspan fill="#AEB4BC">B</tspan></text>
  <text x="342" y="158" font-weight="700" font-size="100" fill="#F5F3EE" textLength="498" lengthAdjust="spacingAndGlyphs">SINERGIA</text>
  <text x="342" y="212" font-weight="600" font-size="52" fill="#AEB4BC" textLength="498" lengthAdjust="spacingAndGlyphs">BIOMÉDICA</text>
  <rect x="342" y="228" width="498" height="3" fill="#C0A56E"/>
  <text x="342" y="256" font-weight="400" font-size="18.6" fill="#9aa0a8" textLength="498" lengthAdjust="spacingAndGlyphs">${SITE.lema}</text>
</svg>`;

function navLinks(indent){
  /* El header muestra solo las entradas principales; el pie las muestra todas. */
  const menu=SITE.nav.filter(n=>!n.pie);
  return menu.map(n=>`${indent}<a data-route="${n.r}"${n.modo?` data-modo="${n.modo}"`:''} onclick="go('${n.r}')">${n.t}</a>`).join('\n');
}

/* Selector de sección: Venta | Alquiler. El activo lo marca la clase del
   body (modo-venta / modo-alquiler) que pone 07-router.js. */
function selectorModo(cls){
  return `<div class="${cls}" role="group" aria-label="Sección"><a data-sw="venta" onclick="go('#/venta')">Venta</a><a data-sw="alquiler" onclick="go('#/alquiler')">Alquiler</a></div>`;
}

function renderHeader(){
  const el=document.getElementById('app-header'); if(!el)return;
  el.outerHTML=`<header>
  <div class="wrap nav">
    ${LOGO_HEADER}
    <div class="menu">
      ${selectorModo('modo-sw')}
${navLinks('      ')}
      <a class="btn" onclick="go('${SITE.portal.r}')">${SITE.portal.t}</a>
    </div>
    <button class="burger" onclick="toggleMenu()" aria-label="Menú">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
    </button>
  </div>
  <div class="mobile-menu" id="mobileMenu">
    ${selectorModo('modo-sw modo-sw-movil')}
${navLinks('    ')}
    <a onclick="go('${SITE.portal.r}')" style="color:var(--cobre-d)">${SITE.portal.t}</a>
  </div>
</header>`;
}

function renderFooter(){
  const el=document.getElementById('app-footer'); if(!el)return;
  el.outerHTML=`<footer>
  <div class="wrap fgrid">
    <div style="max-width:360px">
      ${LOGO_FOOTER}
      <p>${SITE.razonSocial}<br>${SITE.direccion}</p>
      <div class="wa-row">
        <a class="wa" id="waLink" href="https://wa.me/${SITE.whatsapp}" target="_blank" rel="noopener">WhatsApp</a>
        <a class="wa2" onclick="go('#/contacto')">· solicitar cotización →</a>
      </div>
    </div>
    <div>
      <div class="tt">Navegación</div>
      <div class="fnav">
${SITE.nav.filter(n=>n.r!=='#/').map(n=>`        <a onclick="go('${n.r}')">${n.pieT||n.t}</a>`).join('\n')}
      </div>
    </div>
    <div>
      <div class="tt">Contacto</div>
      <p>${SITE.email}<br>${SITE.web}<br>${SITE.telefono}<br>Lun a vie · 8:00 a.m. – 5:00 p.m.</p>
      <div class="ruc">RUC ${SITE.ruc}</div>
    </div>
  </div>
</footer>`;
}

renderHeader();
renderFooter();

;
/* ===== js/02-datos.js ===== */
/* =====================================================================
   02-datos.js — DATOS DE RESPALDO
   ---------------------------------------------------------------------
   Este archivo es SOLO el último recurso: se usa si no responde ni
   data/catalogo.json ni el Apps Script de Google Sheets.

   NO SE EDITA A MANO. Es un espejo de data/catalogo.json y se regenera
   con:  python3 scripts/sync_respaldo.py
   ===================================================================== */

let EQUIPOS = [
  {"id": "esa620", "cat": "Analizador eléctrico", "g": "ansim", "scr": "ecg", "code": "ESA620", "photo": "https://lh3.googleusercontent.com/d/1CgzYTMecptuSqUY1LAh24ZkEHV7heGC7", "fotos": ["https://lh3.googleusercontent.com/d/1CgzYTMecptuSqUY1LAh24ZkEHV7heGC7", "https://lh3.googleusercontent.com/d/1iPDKbLYWF2Fa9smDeyRCn2j15jId9Y8o"], "nom": "Analizador de seguridad eléctrica", "marca": "Fluke ESA620 · EE.UU.", "tier": "Premium", "dia": 270, "sem": 1080, "mes": 3240, "ficha": "", "ficha_dl": "", "cal_ini": "", "cal_fin": "", "cal_pdf": "", "cal_dl": "", "desc": "Analizador de seguridad eléctrica biomédico que verifica el cumplimiento de las normas IEC 62353 e IEC 60601-1. Mide corrientes de fuga, resistencia de tierra y aislamiento, con selección de partes aplicadas y simulación de fallas. Ideal para validaciones post-mantenimiento y auditorías; llega con certificado de calibración vigente.", "specs": {"Marca": "Fluke", "Modelo": "ESA620", "Origen": "Estados Unidos", "Normas": "IEC 62353 · 60601-1"}},
  {"id": "defib", "cat": "Analizador de desfibrilador", "g": "ansim", "scr": "pulse", "code": "DEFIB", "photo": "https://lh3.googleusercontent.com/d/1iBW1VsoYCNN-i4yui2-yBdSeg_zEtLEg", "fotos": ["https://lh3.googleusercontent.com/d/1iBW1VsoYCNN-i4yui2-yBdSeg_zEtLEg", "https://lh3.googleusercontent.com/d/1eyohw3fm2SxKLjNJ01uoR-Mc0eHbfLNG"], "nom": "Analizador de desfibriladores", "marca": "Meditech DEFI-SENSE · China", "tier": "Estándar", "dia": 228, "sem": 912, "mes": 2736, "ficha": "", "ficha_dl": "", "cal_ini": "", "cal_fin": "", "cal_pdf": "", "cal_dl": "", "desc": "Analizador de desfibriladores que mide la energía entregada (joules) sobre carga de 50 Ω, el tiempo de carga y la sincronización en cardioversión. Permite comprobar que el equipo descarga dentro de la tolerancia del fabricante, en modo manual y sincronizado. Incluye certificado de calibración vigente.", "specs": {"Marca": "Meditech", "Modelo": "DEFI-SENSE", "Origen": "China", "Uso": "Desfibriladores"}},
  {"id": "ms400", "cat": "Simulador de paciente", "g": "ansim", "scr": "ecg", "code": "MS400", "nom": "Simulador ECG", "marca": "Contec MS400 · China", "tier": "Estándar", "dia": 195, "sem": 780, "mes": 2340, "ficha": "", "ficha_dl": "", "cal_ini": "", "cal_fin": "", "cal_pdf": "", "cal_dl": "", "desc": "Simulador de paciente multiparamétrico para monitores y electrocardiógrafos. Genera ECG con ritmo normal y arritmias seleccionables, además de señales de respiración, para verificar la respuesta y exactitud del equipo sin un paciente real. Incluye certificado de calibración vigente.", "specs": {"Marca": "Contec", "Modelo": "MS400", "Origen": "China", "Parámetros": "ECG · Resp · Temp"}},
  {"id": "sp-sim", "cat": "Simulador SpO2", "g": "ansim", "scr": "ecg", "code": "SP-SiM", "photo": "https://lh3.googleusercontent.com/d/1hD5mnnX102PZUkRJ2WNUweOtPzk3K9Jf", "fotos": ["https://lh3.googleusercontent.com/d/1hD5mnnX102PZUkRJ2WNUweOtPzk3K9Jf"], "nom": "Simulador de SpO2 para pulsioxímetros", "marca": "Rigel SP-SiM · Reino Unido", "tier": "Premium", "dia": 252, "sem": 1008, "mes": 3024, "ficha": "", "ficha_dl": "", "cal_ini": "", "cal_fin": "", "cal_pdf": "", "cal_dl": "", "desc": "Probador y simulador de SpO₂ para pulsioxímetros y módulos de oximetría. Simula distintos niveles de saturación, frecuencia de pulso e índice de perfusión, compatible con las principales marcas mediante curvas R. Verificación rápida y trazable; llega con certificado de calibración vigente.", "specs": {"Marca": "Rigel", "Modelo": "SP-SiM", "Origen": "Reino Unido", "Uso": "Verificación SpO2"}},
  {"id": "fluke-945", "cat": "Sonómetro", "g": "med", "scr": "num", "code": "dB", "photo": "https://lh3.googleusercontent.com/d/1B9G4JWbNvuFKSclONH-71ZVuri2eGwU4", "fotos": ["https://lh3.googleusercontent.com/d/1B9G4JWbNvuFKSclONH-71ZVuri2eGwU4", "https://lh3.googleusercontent.com/d/1IuCCUbUmktDvXUW-DKXJFsHeAjF35mho"], "nom": "Sonómetro", "marca": "Fluke 945 · EE.UU.", "tier": "Premium", "dia": 108, "sem": 432, "mes": 1296, "ficha": "", "ficha_dl": "", "cal_ini": "", "cal_fin": "", "cal_pdf": "", "cal_dl": "", "desc": "Sonómetro digital para medir el nivel de presión sonora (dB) con ponderaciones A y C. Útil para verificar niveles de ruido en quirófanos, unidades dentales y salas de equipos, como apoyo al control de condiciones ambientales. Incluye certificado de calibración vigente.", "specs": {"Marca": "Fluke", "Modelo": "945", "Origen": "Estados Unidos", "Mide": "Nivel sonoro dBA/dBC"}},
  {"id": "fluke-51", "cat": "Termómetro", "g": "med", "scr": "num", "code": "°C", "nom": "Termómetro digital (tipo termocupla)", "marca": "Fluke 51 II · EE.UU.", "tier": "Premium", "dia": 90, "sem": 360, "mes": 1080, "ficha": "", "ficha_dl": "", "cal_ini": "", "cal_fin": "", "cal_pdf": "", "cal_dl": "", "desc": "Termómetro digital de alta precisión con entrada de termocupla tipo J/K y resolución de 0,1°. Ideal para verificar la temperatura de incubadoras, baños térmicos y refrigeración de medicamentos. Robusto para campo; llega con certificado de calibración vigente.", "specs": {"Marca": "Fluke", "Modelo": "51 II", "Origen": "Estados Unidos", "Entrada": "Termocupla tipo K"}},
  {"id": "manometro", "cat": "Manómetro", "g": "med", "scr": "gauge", "code": "BAR", "photo": "https://lh3.googleusercontent.com/d/1cBQBZ0w13RYfseqTG8dYOshCw5sFpkIt", "fotos": ["https://lh3.googleusercontent.com/d/1cBQBZ0w13RYfseqTG8dYOshCw5sFpkIt"], "nom": "Manómetro diferencial digital", "marca": "AUTOOL PT520 · China", "tier": "Estándar", "dia": 117, "sem": 468, "mes": 1404, "ficha": "", "ficha_dl": "", "cal_ini": "", "cal_fin": "", "cal_pdf": "", "cal_dl": "", "desc": "Manómetro diferencial digital para pruebas de presión y verificación de presión no invasiva (NIBP) en monitores y equipos neumáticos. Mide presión positiva y diferencial con lectura clara, útil para comprobar canales, fugas y exactitud de manguitos. Incluye certificado de calibración vigente.", "specs": {"Marca": "AUTOOL", "Modelo": "PT520", "Origen": "China", "Uso": "Presión / NIBP"}},
  {"id": "luxometro", "cat": "Luxómetro", "g": "med", "scr": "num", "code": "LUX", "photo": "https://lh3.googleusercontent.com/d/1zg5DTWSMHEyagYCGwQ9O7-a6SUuvegxq", "fotos": ["https://lh3.googleusercontent.com/d/1zg5DTWSMHEyagYCGwQ9O7-a6SUuvegxq", "https://lh3.googleusercontent.com/d/10mS8pA2flmiltBKKwJkbS5Rz664O0K3P"], "nom": "Luxómetro", "marca": "TASI TA630B · China", "tier": "Estándar", "dia": 59, "sem": 236, "mes": 708, "ficha": "", "ficha_dl": "", "cal_ini": "", "cal_fin": "", "cal_pdf": "", "cal_dl": "", "desc": "Luxómetro digital para medir el nivel de iluminación (lux) en quirófanos y áreas clínicas. Permite verificar que las lámparas cialíticas y la iluminación general cumplan los niveles adecuados. Portátil y de lectura inmediata; llega con certificado de calibración vigente.", "specs": {"Marca": "TASI", "Modelo": "TA630B", "Origen": "China", "Mide": "Iluminancia (lux)"}},
  {"id": "tacometro", "cat": "Tacómetro", "g": "med", "scr": "num", "code": "RPM", "nom": "Tacómetro dual (contacto / óptico)", "marca": "TASI TA500C · China", "tier": "Estándar", "dia": 59, "sem": 236, "mes": 708, "ficha": "", "ficha_dl": "", "cal_ini": "", "cal_fin": "", "cal_pdf": "", "cal_dl": "", "desc": "Tacómetro digital de doble modo (contacto y óptico) para medir velocidad de rotación (rpm) en centrífugas y equipos rotativos. El modo óptico mide sin contacto con cinta reflectante. Ideal para verificar la velocidad real frente al valor programado. Incluye certificado de calibración vigente.", "specs": {"Marca": "TASI", "Modelo": "TA500C", "Origen": "China", "Modo": "Contacto / óptico"}},
  {"id": "multimetro", "cat": "Multímetro", "g": "elec", "scr": "num", "code": "V", "nom": "Multímetro digital", "marca": "Sanwa CD771 · Japón", "tier": "Premium", "dia": 65, "sem": 260, "mes": 780, "ficha": "", "ficha_dl": "", "cal_ini": "", "cal_fin": "", "cal_pdf": "", "cal_dl": "", "desc": "Multímetro digital profesional para medir tensión (CA/CC), corriente, resistencia, continuidad, frecuencia y capacitancia. Herramienta base para el diagnóstico eléctrico y electrónico durante el mantenimiento de equipos médicos. Robusto y confiable; llega con certificado de calibración vigente.", "specs": {"Marca": "Sanwa", "Modelo": "CD771", "Origen": "Japón", "Mide": "V · A · Ω · Hz · F"}},
  {"id": "set-46", "cat": "Herramientas manuales", "g": "apoyo", "scr": "tools", "code": "46", "nom": "Set de herramientas 46 pzs", "marca": "Kit técnico · China", "tier": "Estándar", "apoyo": true, "ficha": "", "ficha_dl": "", "cal_ini": "", "cal_fin": "", "cal_pdf": "", "cal_dl": "", "desc": "Juego de 46 piezas para mantenimiento e intervención técnica en sitio. Complementaria: se incluye en los paquetes de Mantenimiento.", "specs": {"Marca": "Kit técnico", "Origen": "China", "Piezas": "46", "Uso": "Mantenimiento en sitio"}},
  {"id": "destornillador-elec", "cat": "Destornillador eléctrico", "g": "apoyo", "scr": "tools", "code": "SCREW", "nom": "Destornillador eléctrico inalámbrico", "marca": "Genérico · China", "tier": "Estándar", "apoyo": true, "ficha": "", "ficha_dl": "", "cal_ini": "", "cal_fin": "", "cal_pdf": "", "cal_dl": "", "desc": "Destornillador eléctrico inalámbrico con puntas para intervención en sitio. Complementaria: se incluye en los paquetes de Mantenimiento.", "specs": {"Marca": "Genérico", "Origen": "China", "Tipo": "Inalámbrico", "Accesorios": "Juego de puntas"}},
  {"id": "phantom-flujo", "cat": "Phantom de flujo", "g": "ansim", "scr": "pulse", "code": "FLOW", "photo": "https://lh3.googleusercontent.com/d/1tx7UIbvxin8hqGDQFuCWPWyQcDRebhZ5", "fotos": ["https://lh3.googleusercontent.com/d/1tx7UIbvxin8hqGDQFuCWPWyQcDRebhZ5"], "nom": "Phantom de flujo sanguíneo para punción ecoguiada", "marca": "Genérico · China", "tier": "Estándar", "dia": 50, "sem": 200, "mes": 600, "ficha": "", "ficha_dl": "", "cal_ini": "", "cal_fin": "", "cal_pdf": "", "cal_dl": "", "desc": "Phantom de tejido blando con bomba de circulación que simula flujo sanguíneo. Permite practicar accesos vasculares guiados por ecografía y verificar la respuesta Doppler de ecógrafos. Se usa también en los talleres prácticos de Sinergia Biomédica.", "specs": {"Marca": "Genérico", "Origen": "China", "Uso": "Punción ecoguiada · Doppler", "Incluye": "Almohadilla + bomba de circulación"}}
];

const APOYO = {"multimetro":"Multímetro digital Sanwa","destornillador-elec":"Destornillador eléctrico inalámbrico","set-46":"Set de herramientas 46 pzs"};
const KIT=["multimetro","destornillador-elec","set-46"];


/* Parámetros del modelo (se sobreescriben desde la hoja vía loadData) */
let TEC_DIA=120;         // instrumentista S/ por día
let TEC_MIN=60;          // mínimo: medio día
/* Descuento por combinar instrumentos: mientras más lleva, más baja el
   precio del día. Se puede cambiar desde data/tarifas-alquiler.json. */
let DESC_COMB={"2":0.10,"3":0.14,"4":0.18,"5":0.20};
/* El descuento del tramo que le toca a esa cantidad de instrumentos. */
function descuentoPor(n){
  let d = 0;
  Object.keys(DESC_COMB).forEach(k => { if(n >= Number(k)) d = Math.max(d, DESC_COMB[k]); });
  return d;
}

const byId=id=>EQUIPOS.find(e=>e.id===id);
/* Tarifas acordadas (data/tarifas-alquiler.json). Mandan sobre la hoja para
   poder publicarlas sin esperar a que la hoja se actualice. */
let TARIFAS = {};
function aplicarTarifas(){
  EQUIPOS.forEach(e => { const d = TARIFAS[e.id];
    if(d > 0){ e.dia = d; e.sem = d*4; e.mes = d*12; } });
}
fetch('data/tarifas-alquiler.json', {cache:'no-cache'}).then(r => r.ok ? r.json() : null)
  .then(d => { if(!d) return;
    if(d.medioDiaDesde) MEDIO_MIN = d.medioDiaDesde;
    if(d.medioDiaMinimo) MEDIO_PISO = d.medioDiaMinimo;
    if(d.instrumentistaMedioDia) TEC_MIN = d.instrumentistaMedioDia;
    if(d.descuentos) DESC_COMB = d.descuentos;
    if(d.garantiaProvincia > 0) GARANTIA_PROV = d.garantiaProvincia;
    if(d.viaje){
      if(d.viaje.viaticoDia > 0) VIAJE.viaticoDia = d.viaje.viaticoDia;
      if(d.viaje.hospedajeNoche > 0) VIAJE.hospedajeNoche = d.viaje.hospedajeNoche;
      if(d.viaje.zonas) VIAJE.zonas = d.viaje.zonas;
    }
    if(Array.isArray(d.ciudades) && d.ciudades.length) CIUDADES = d.ciudades;
    if(d.dia){ TARIFAS = d.dia; aplicarTarifas();
    if(typeof repintarTodo === 'function') repintarTodo(); } }).catch(() => {});
/* Medio día = un turno de 4 h (9:00–13:00 o 14:00–18:00). Cuesta el 60 % del
   día, no la mitad: llevar, recoger y revisar el instrumento cuesta igual.
   Es el mínimo de alquiler; por eso ya no se alquila por hora ni por equipo. */
const MEDIO_PCT=0.6, HORARIO_MANANA='9:00 a 13:00', HORARIO_TARDE='14:00 a 18:00';
/* Medio día solo en los instrumentos de S/ 100 el día a más: por debajo, el
   viaje de entrega y recojo cuesta más que el alquiler. Y ningún pedido baja
   de PEDIDO_MIN, venga un instrumento o varios. */
let MEDIO_MIN=60, MEDIO_PISO=50, PEDIDO_MIN=0;
/* Instrumentos que se alquilan SIN instrumentista: el cliente los recoge en
   oficina y deja garantía (en soles) + DNI. El resto va con instrumentista.
   La hoja puede cambiar la lista (modelo.sin_tecnico = {"id": garantía}). */
let SIN_TECNICO = {manometro:100, luxometro:100, tacometro:100};
/* Garantía en depósito de los instrumentos que normalmente van con
   instrumentista, cuando viajan solos a provincia. */
let GARANTIA_PROV = 300;
/* ── Viaje del instrumentista a provincia ─────────────────────────────
   El pasaje de ida y vuelta se cobra una sola vez y depende de la ciudad:
   no cuesta lo mismo Ica que Iquitos. Las ciudades están agrupadas en
   cuatro zonas, y cada zona tiene su pasaje estimado de ida y vuelta.
   La alimentación se cobra por día de trabajo y el hospedaje por noche:
   si el trabajo dura un día, el instrumentista no se queda a dormir. */
let VIAJE = {
  viaticoDia: 50,        // alimentación por día de trabajo
  hospedajeNoche: 90,    // hospedaje por noche (noches = días − 1)
  zonas: {1: 80, 2: 150, 3: 260, 4: 700}
};
const VIAJE_ZONAS = {
  1: 'Cerca de Lima (bus, hasta 5 h)',
  2: 'Costa y sierra centro (bus, 5 a 10 h)',
  3: 'Norte, sur y selva (bus, más de 10 h)',
  4: 'Solo por avión'
};
let CIUDADES = [
  {n:'Barranca', z:1}, {n:'Huacho', z:1}, {n:'Cañete', z:1}, {n:'Chincha', z:1},
  {n:'Pisco', z:1}, {n:'Ica', z:1},
  {n:'Nazca', z:2}, {n:'Huaraz', z:2}, {n:'Chimbote', z:2}, {n:'Trujillo', z:2},
  {n:'Huancayo', z:2}, {n:'Huánuco', z:2}, {n:'Ayacucho', z:2},
  {n:'Chiclayo', z:3}, {n:'Piura', z:3}, {n:'Sullana', z:3}, {n:'Tumbes', z:3},
  {n:'Cajamarca', z:3}, {n:'Jaén', z:3}, {n:'Tarapoto', z:3}, {n:'Moyobamba', z:3},
  {n:'Pucallpa', z:3}, {n:'Arequipa', z:3}, {n:'Moquegua', z:3}, {n:'Tacna', z:3},
  {n:'Cusco', z:3}, {n:'Abancay', z:3}, {n:'Juliaca', z:3}, {n:'Puno', z:3},
  {n:'Iquitos', z:4}, {n:'Puerto Maldonado', z:4}, {n:'Otra ciudad (en avión)', z:4}
];
const ciudadDe = n => CIUDADES.find(c => c.n === n);
const pasajeDe = n => { const c = ciudadDe(n); return c ? (VIAJE.zonas[c.z] || 0) : 0; };
const soloEquipo = id => Object.prototype.hasOwnProperty.call(SIN_TECNICO, id);
/* Complementarias: no se alquilan solas (herramientas de apoyo). */
let COMPLEMENTOS = ['set-46', 'destornillador-elec'];
const esComplemento = e => !!e.apoyo || COMPLEMENTOS.indexOf(e.id) >= 0;
/* Lo que va SIN COSTO en todo alquiler con instrumentista. El multímetro sí
   se alquila solo, pero si ya viene el instrumentista, se incluye. */
/* Ya no se regala nada con el alquiler: cada instrumento tiene su precio
   y el descuento por combinar es lo que premia llevar varios. */
let INCLUIDOS = [];
const incluidos = id => EQUIPOS.filter(e => e.id !== id && INCLUIDOS.indexOf(e.id) >= 0);
const garantiaDe = id => SIN_TECNICO[id] || 0;
/* Medio día: el 60 % del día, pero nunca menos de MEDIO_PISO: por debajo,
   preparar, entregar y revisar el instrumento cuesta más que el alquiler. */
const precioMedio=d=>Math.max(MEDIO_PISO, Math.round(d*MEDIO_PCT));
const tieneMedio=d=>Number(d) >= MEDIO_MIN;
/* Precio de partida de un instrumento: medio día si lo tiene, si no el día. */
const precioDesde=d=>tieneMedio(d) ? precioMedio(d) : Number(d);
const unidadDesde=d=>tieneMedio(d) ? 'medio día' : 'día';
/* Interruptor general de precios (js/00-config.js -> CONFIG.MOSTRAR_PRECIOS).
   La hoja de Google puede sobrescribirlo con modelo.mostrar_precios. */
let VER_PRECIOS = (typeof CONFIG!=='undefined' && CONFIG.MOSTRAR_PRECIOS!==undefined) ? !!CONFIG.MOSTRAR_PRECIOS : true;
/* Vista previa: ?precios=1 enciende los precios solo para quien abra ese
   enlace, para probar el cotizador antes de publicarlos. */
let PRECIOS_PRUEBA = false;
try{ if(location.search.indexOf('precios=1') >= 0){ VER_PRECIOS = true; PRECIOS_PRUEBA = true; } }catch(e){}
const sumItems=p=>p.items.reduce((s,id)=>s+byId(id).dia,0);
const fmt=n=>Number(n).toLocaleString('es-PE');

function screen(scr,code){
  if(scr==='ecg') return `<polyline points="116,96 130,96 137,78 147,112 157,84 165,96 196,96" fill="none" stroke="#67d3ad" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  if(scr==='pulse') return `<polyline points="116,96 138,96 144,72 150,118 156,96 196,96" fill="none" stroke="#67d3ad" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  if(scr==='gauge') return `<path d="M126 104 A30 30 0 0 1 186 104" fill="none" stroke="#67d3ad" stroke-width="2.5"/><line x1="156" y1="104" x2="172" y2="82" stroke="#C0A56E" stroke-width="2.5" stroke-linecap="round"/>`;
  if(scr==='tools') return `<path d="M140 76 l16 16 m-16 0 l16 -16" stroke="#C0A56E" stroke-width="3" stroke-linecap="round"/><rect x="150" y="92" width="22" height="6" rx="3" transform="rotate(45 161 95)" fill="#67d3ad"/>`;
  return `<text x="156" y="103" text-anchor="middle" font-family="Chakra Petch" font-weight="700" font-size="26" fill="#67d3ad">${code}</text>`;
}
function device(e){
  const premium=e.tier==='Premium', bumper=premium?'#2A2D33':'#43474E', dial=premium?'#9A7F4E':'#6E727A';
  return `<svg viewBox="0 0 312 200" role="img" aria-label="${e.nom}">
    <path d="M120 44 C120 24 96 24 96 10" fill="none" stroke="${dial}" stroke-width="3.5" stroke-linecap="round"/><circle cx="96" cy="9" r="6" fill="${dial}"/>
    <rect x="108" y="40" width="96" height="150" rx="22" fill="${bumper}"/><rect x="120" y="52" width="72" height="126" rx="12" fill="#3A3F47"/>
    <rect x="112" y="62" width="88" height="58" rx="7" fill="#0E1A14"/>${screen(e.scr,e.code)}
    <text x="120" y="76" font-family="Chakra Petch" font-weight="600" font-size="10" fill="#9aa0a8">${e.code}</text>
    <circle cx="156" cy="150" r="18" fill="#23262C"/><circle cx="156" cy="150" r="18" fill="none" stroke="${dial}" stroke-width="2"/><rect x="153" y="136" width="6" height="11" rx="3" fill="${dial}"/>
    <rect x="120" y="132" width="22" height="13" rx="4" fill="#23262C"/><rect x="170" y="132" width="22" height="13" rx="4" fill="#23262C"/></svg>`;
}
/* Las fotos del Drive vienen de la hoja SIN tamaño, y así lh3 entrega el
   original: varios MB cada una. Pidiendo siete de golpe (galería del detalle)
   Google corta las primeras y salen rotas. Con "=w<ancho>" las entrega ya
   redimensionadas, una por caja, y dejan de fallar. Solo se le añade a las
   de lh3 que no traigan ya un tamaño; las locales quedan intactas. */
/* Mapa «id de Drive → archivo de este sitio», que llega en el catálogo
   publicado. Lo rellena bajar_fotos.py. Se guarda aparte y no se borra al
   llegar los datos en vivo: la respuesta del Apps Script trae las URL de
   Drive (la hoja es la que manda), pero servirlas desde Drive es lo que
   hacía fallar las fotos. */
/* ¿Entiende WebP este navegador? Se pregunta una vez, al cargar. Todos lo
   soportan desde 2020, y el que no, recibe el JPEG y ve exactamente lo mismo.
   Medido sobre estas fotos: en WebP pesan un 44 % menos con calidad
   indistinguible del JPEG. Peso que se ahorra sin pagar nada a cambio. */
const USA_WEBP = (function(){
  try{ return document.createElement('canvas')
         .toDataURL('image/webp').indexOf('data:image/webp') === 0; }
  catch(e){ return false; }
})();

/* MAPA-FOTOS-LOCALES: lo reescribe bajar_fotos.py. Va aquí y no solo en
   data/catalogo.json porque el archivo publicado no siempre se lee: si el
   visitante ya tiene datos guardados de la sesión, la web tira de ellos y
   el mapa no llegaría. Aquí carga siempre y antes de pintar nada. */
let FOTOS_LOCALES = {
   "1CgzYTMecptuSqUY1LAh24ZkEHV7heGC7": "img/catalogo/esa620-01.jpg",
   "1iPDKbLYWF2Fa9smDeyRCn2j15jId9Y8o": "img/catalogo/esa620-02.jpg",
   "1skpycp6fkEvDwY3axq7qbU5Kepw8wtRu": "img/catalogo/esa620-03.jpg",
   "1XsuXcGvyB92-6-anXGxgX7oc8f0E0zyP": "img/catalogo/esa620-04.jpg",
   "1vWjvgZ5CN3_BWTLryaZkvy-F2jx5zHUx": "img/catalogo/esa620-05.jpg",
   "1iBW1VsoYCNN-i4yui2-yBdSeg_zEtLEg": "img/catalogo/defib-01.jpg",
   "1eyohw3fm2SxKLjNJ01uoR-Mc0eHbfLNG": "img/catalogo/defib-02.jpg",
   "14SVCuRxa4PsYNQ62FDJjSwlvPWqd6YBg": "img/catalogo/defib-03.jpg",
   "1PzEihjQ11aOhmPWOl6n2cN2s8O7JP7aY": "img/catalogo/defib-04.jpg",
   "1mWGh7QbejkJYHy161yzyav7evNflF7Gh": "img/catalogo/defib-05.jpg",
   "1BfVK0f3fjPN8zXZ1PGi8C2S_mmdKLaUQ": "img/catalogo/ms400-01.jpg",
   "1eD9czzNe7hQXFu-gXjW0O6Mm8Tr8dc4b": "img/catalogo/ms400-02.jpg",
   "1d0X1hBXgViYdi_fdET6ckxWggb8TYtVu": "img/catalogo/ms400-03.jpg",
   "1j9y40H9Qb7pGS6YKcaHptI3Es9rEtew7": "img/catalogo/ms400-04.jpg",
   "1hD5mnnX102PZUkRJ2WNUweOtPzk3K9Jf": "img/catalogo/sp-sim-01.jpg",
   "1IU2lH0RnnfHy48aWFMFt36azcUAoQbsl": "img/catalogo/sp-sim-02.jpg",
   "1k318GrIZPgaI__ZyTnqu_zQnyxAD3Y3K": "img/catalogo/sp-sim-03.jpg",
   "1B9G4JWbNvuFKSclONH-71ZVuri2eGwU4": "img/catalogo/fluke-945-01.jpg",
   "1IuCCUbUmktDvXUW-DKXJFsHeAjF35mho": "img/catalogo/fluke-945-02.jpg",
   "1axsKX46UhYFTyCQF0P185ySTwqXVxfgu": "img/catalogo/fluke-945-03.jpg",
   "1sE_BNyav94WMNVHRhXQ6zRE2JV9UuEms": "img/catalogo/fluke-51-01.jpg",
   "1b9mab3Eee9BMm0cm2NIrmt2vILFridNf": "img/catalogo/fluke-51-02.jpg",
   "1NNHRnI90HU95uQ5wulNYQKDFKUCUbovJ": "img/catalogo/fluke-51-03.jpg",
   "1Sj1YSWM0R0_hULNR4V9zsSwLJNH6wgC8": "img/catalogo/fluke-51-04.jpg",
   "1cBQBZ0w13RYfseqTG8dYOshCw5sFpkIt": "img/catalogo/manometro-01.jpg",
   "14Ei7FHbcvfdvdFUZbSM1tyIt47Ke5gJz": "img/catalogo/manometro-02.jpg",
   "1zg5DTWSMHEyagYCGwQ9O7-a6SUuvegxq": "img/catalogo/luxometro-01.jpg",
   "10mS8pA2flmiltBKKwJkbS5Rz664O0K3P": "img/catalogo/luxometro-02.jpg",
   "1ipd3EJDHlt0Pysq47Jbhmq14Dg06wULQ": "img/catalogo/luxometro-03.jpg",
   "1nV5x33fK3JID9dN00CGY_D0DXmmWdP8R": "img/catalogo/luxometro-04.jpg",
   "1PRMs4HmfapeIYEK3YvhASWAKyA_ySXHG": "img/catalogo/luxometro-05.jpg",
   "1tx7UIbvxin8hqGDQFuCWPWyQcDRebhZ5": "img/catalogo/phantom-flujo-01.jpg",
   "1XAnI4hWRv-94Rs1_Z3_L43-8dr_Qls-H": "img/catalogo/limatambo-2026-01.jpg",
   "1JJnFPVxYD7z58iGuC2XYd5Z14g8-p9NZ": "img/catalogo/limatambo-2026-02.jpg",
   "1Tzls67EtPknY0EO16iWr1fEY4BOHU5xX": "img/catalogo/expediente-1Tzls67E.png"
  };
/* MAPA-FIN */
function fotosLocales(mapa){ if(mapa) FOTOS_LOCALES = mapa; }
/* Fotos guardadas en el sitio para equipos sin foto en la hoja, o una foto
   de estudio de portada (data/fotos-extra.json; generar_paginas.py las
   escribe en index.html). Van delante de las de la hoja, sin repetirse. */
function conFotosExtra(equipos){
  const ex = window.FOTOS_EXTRA || {};
  (equipos||[]).forEach(e=>{
    const f = e && ex[e.id];
    if(!f || !f.length) return;
    const hoja = (e.fotos&&e.fotos.length) ? e.fotos : (e.photo ? [e.photo] : []);
    e.fotos = f.concat(hoja.filter(u=>!f.includes(u)));
    e.photo = e.fotos[0];
  });
}

function fotoURL(u, ancho, ligera){
  if(!u) return u;
  /* Si la foto ya está en el sitio, se sirve de aquí. Medido en el
     navegador con las mismas 30 fotos a la vez: desde Drive llegaron 4
     y fallaron 26 con «429 demasiadas peticiones»; desde aquí, las 30
     en una décima de segundo. Google limita cuántas imágenes sirve por
     navegador, y una ficha con cinco fotos se pasa de la raya. */
  const id = (u.match(/(?:\/d\/|id=|\/file\/d\/)([A-Za-z0-9_-]{20,})/) || [])[1];
  /* Las de data/fotos-extra.json ya vienen como ruta del sitio (img/…). */
  const propia = /^\/?img\//.test(u) ? u.replace(/^\//,'') : '';
  if(propia || (id && FOTOS_LOCALES[id])){
    const f = propia || FOTOS_LOCALES[id];
    /* «ligera» es la de 700 px, para las tarjetas del catálogo: ahí la foto
       se ve a 347 px y la grande manda doce veces los píxeles que caben.
       La ficha y la portada siguen con la grande, que ahí sí se aprovecha. */
    let r = (ligera && /\.jpe?g$/i.test(f)) ? f.replace(/\.jpe?g$/i, '-m.jpg') : f;
    if(USA_WEBP) r = r.replace(/\.(jpe?g|png)$/i, '.webp');
    return r;
  }
  return (/lh3\.googleusercontent\.com/.test(u) && !/=[ws]\d/.test(u)) ? u+'=w'+ancho : u;
}
// galería: foto real (si existe) + vista técnica ilustrada
function galleryItems(e, ancho){
  const items=[];
  const fotos=(e.fotos&&e.fotos.length)?e.fotos:(e.photo?[e.photo]:[]);
  fotos.forEach(u=>items.push(`<img src="${fotoURL(u, ancho||900)}" alt="${e.nom}">`));
  if(!items.length) items.push(device(e));   // el ícono solo cuando no hay foto
  return items;
}

;
/* ===== js/03-catalogo.js ===== */
/* ---- CATÁLOGO ---- */
const grid=document.getElementById('grid');
const GRUPOS={ansim:"Analizadores y simuladores",med:"Instrumentos de medición",elec:"Medidores eléctricos",apoyo:"Herramientas de apoyo"};
/* Lecturas a prueba de filas incompletas. Si un equipo de la hoja llega
   sin columna Marca u Origen, antes esto lanzaba un error que tumbaba el
   repintado COMPLETO del catálogo, en silencio, y la web se quedaba con
   los datos anteriores.                                                */
const eqBrand=e=>(e&&e.specs&&e.specs.Marca)||'—',
      eqOrigen=e=>(e&&e.specs&&e.specs.Origen)||'—',
      uniq=a=>[...new Set(a)];
const F={grupo:new Set(),marca:new Set(),tipo:new Set(),origen:new Set()};
let curGrupo='all';

function facetSection(title,key,opts,labelFn){
  return `<details class="facet" open><summary>${title}</summary><div class="opts">`+
    opts.map(o=>`<label><input type="checkbox" value="${o}" onchange="toggleF('${key}',this.value,this.checked)"> ${labelFn?labelFn(o):o}</label>`).join('')+
    `</div></details>`;
}
/* ── Marcadores mientras carga el catálogo ─────────────────────────────
   Mientras CATALOGO_LISTO sea false se pintan tarjetas fantasma. Evita
   que el cliente alcance a ver los datos de respaldo de 02-datos.js y
   luego un salto cuando llegan los buenos.                            */
function huesoEq(n){
  return Array.from({length:n},()=>`
    <div class="eq eq-hueso">
      <div class="hu-img"></div>
      <div class="body">
        <span class="ln w35"></span><span class="ln w85"></span>
        <span class="ln w60"></span><span class="ln w85"></span>
      </div>
    </div>`).join('');
}
function huesoFacetas(){
  return `<div class="facet-hueso">
    <span class="ln w60"></span><span class="ln w85"></span><span class="ln w85"></span>
    <span class="ln w60"></span><span class="ln w85"></span><span class="ln w85"></span>
  </div>`;
}

/* Las herramientas de apoyo (set de 46 piezas, destornillador) no se alquilan
   solas: van dentro de los paquetes de Mantenimiento. Siguen en EQUIPOS para
   los paquetes, pero no salen como tarjeta ni en los filtros del catálogo. */
const enCatalogo = () => EQUIPOS.filter(e=>!esComplemento(e));

function buildFacetsEq(){
  if(!CATALOGO_LISTO){ document.getElementById('filtersSide').innerHTML=huesoFacetas(); return; }
  const eqs=enCatalogo();
  document.getElementById('filtersSide').innerHTML=
    facetSection('Marca','marca',uniq(eqs.map(eqBrand)).sort())+
    facetSection('Tipo','tipo',uniq(eqs.map(e=>e.cat)).sort())+
    facetSection('Procedencia','origen',uniq(eqs.map(eqOrigen)).sort())+
    `<div class="filters-clear"><button onclick="clearF()">Limpiar filtros</button></div>`;
}
function toggleF(k,v,on){on?F[k].add(v):F[k].delete(v);pintar();}
function clearF(){Object.values(F).forEach(s=>s.clear());document.querySelectorAll('#filtersSide input').forEach(i=>i.checked=false);pintar();}
function matchEq(e){
  if(curGrupo!=='all'&&e.g!==curGrupo)return false;
  if(F.marca.size&&!F.marca.has(eqBrand(e)))return false;
  if(F.tipo.size&&!F.tipo.has(e.cat))return false;
  if(F.origen.size&&!F.origen.has(eqOrigen(e)))return false;
  return true;
}
/* El clic en un equipo abre su página de alquiler (alquiler/<tipo>/), que
   es la que Google indexa. PAGINA_TIPO la escribe generar_paginas.py en
   index.html; un equipo que aún no tiene página va a su ficha #/equipo. */
function urlEquipo(id){ return (window.PAGINA_TIPO||{})[id] || '#/equipo/'+id; }
function irEquipo(id){
  const u = (window.PAGINA_TIPO||{})[id];
  if(u) location.href = u; else go('#/equipo/'+id);
}
function cardEq(e){
  const idx=EQUIPOS.indexOf(e);
  const badge=esComplemento(e)?`<span class="badge" style="background:rgba(154,127,78,.13);color:var(--cobre-d);border-color:var(--linea-b)">COMPLEMENTARIA</span>`:`<span class="badge">DISPONIBLE</span>`;
  const foot=esComplemento(e)
    ?`<div class="foot"><div class="price" style="font-size:14px;color:var(--gris);font-family:var(--ff-d);font-weight:600">Sin costo<small style="font-weight:400">va incluida con tu alquiler</small></div><button class="btn" onclick="go('#/equipo/${e.id}')">Ver detalle</button></div>`
    :(VER_PRECIOS
      ?`<div class="foot"><div class="price"><span class="desde">Desde</span>S/ ${fmt(precioDesde(e.dia))}<span>/${unidadDesde(e.dia)} · IGV incl.</span><small>${tieneMedio(e.dia)?`día S/ ${fmt(e.dia)}`:'desde un día completo'}</small></div><button class="btn" onclick="go('#/cotizar/'+'${e.id}')">Cotizar</button></div>`
      :`<div class="foot"><div class="price" style="font-size:15px;color:var(--gris);font-family:var(--ff-d);font-weight:600">Consultar tarifa<small style="font-weight:400">te respondemos con precio y disponibilidad</small></div><button class="btn" onclick="go('#/contacto')">Cotizar</button></div>`);
  /* Varias fotos: se ve la primera y las flechas pasan a las demás. La primera suele ser la de
     estudio y las siguientes, el instrumento midiendo en un equipo real:
     eso es lo que distingue un catálogo propio de uno bajado del fabricante. */
  const fotos=(e.fotos&&e.fotos.length)?e.fotos:(e.photo?[e.photo]:[]);
  const carr=fotos.length>1
    ? `<div class="eqcar" data-i="0">
         ${fotos.map((u,i)=>`<img class="photo${i?'':' on'}" ${i?'data-src':'src'}="${fotoURL(u,600,true)}" alt="${e.nom}"
              loading="lazy" decoding="async" onerror="eqcarQuitar(this)">`).join('')}
         <button class="eqcar-f izq" onclick="eqcarMover(event,-1)" aria-label="Foto anterior">&#10094;</button>
         <button class="eqcar-f der" onclick="eqcarMover(event,1)" aria-label="Foto siguiente">&#10095;</button>
         <span class="eqcar-p">${fotos.map((u,i)=>`<i class="${i?'':'on'}"></i>`).join('')}</span>
       </div>`
    : (fotos.length?`<img class="photo" src="${fotoURL(fotos[0],600,true)}" alt="${e.nom}" loading="lazy" decoding="async">`:device(e));
  return `<div class="eq">
      <div class="img${fotos.length?' has-photo':''}" onclick="irEquipo('${e.id}')">
        ${fotos.length?'':'<span class="grid-bg"></span>'}
        ${badge}<span class="tier">${e.tier}</span>
        ${carr}
      </div>
      <div class="body">
        <div class="cat">${e.cat}</div>
        <h3><a href="${urlEquipo(e.id)}">${e.nom}</a></h3>
        <div class="marca">${e.marca}</div>
      ${e.cal_fin?`<div class="calchip" style="margin-top:7px;display:inline-block;font-family:var(--ff-d);font-size:10px;letter-spacing:.6px;padding:3px 8px;border-radius:5px;background:rgba(46,139,107,.10);color:var(--ok);border:1px solid rgba(46,139,107,.25)">CALIBRACIÓN VIGENTE HASTA ${e.cal_fin}</div>`:''}
        <div class="desc">${e.desc}</div>
        ${foot}
      </div></div>`;
}
function pintar(){
  if(!CATALOGO_LISTO){
    grid.innerHTML=huesoEq(6);
    document.getElementById('countEq').textContent='';
    return;
  }
  const list=enCatalogo().filter(matchEq);
  grid.innerHTML=list.map(cardEq).join('')||'<p style="color:var(--gris);grid-column:1/-1">No hay equipos con esos filtros.</p>';
  document.getElementById('countEq').textContent=list.length+(list.length===1?' equipo':' equipos');
}

function setGrupo(g){curGrupo=g;document.querySelectorAll('#subEq button').forEach(b=>b.classList.toggle('on',b.dataset.g===g));pintar();}

const DESTACADOS=["esa620","sp-sim","defib"];
function pintarDestacados(){
  const g=document.getElementById('eqHome');if(!g)return;
  if(!CATALOGO_LISTO){ g.innerHTML=huesoEq(3); return; }
  g.innerHTML=DESTACADOS.map(id=>byId(id)).filter(Boolean).map(cardEq).join('');
}
/* Primer pintado: solo marcadores. Los datos reales los pinta
   aplicarDatos() en js/07-router.js cuando llega la primera fuente buena. */
buildFacetsEq();pintar();pintarDestacados();
function toggleFiltros(){document.getElementById('filtersSide').classList.toggle('open');}



/* ── Carrusel de las tarjetas del catálogo ────────────────────────────
   Las tarjetas NO pasan las fotos solas: con varias tarjetas cambiando a
   la vez la rejilla no paraba quieta. Queda la primera foto fija y las
   flechas para quien quiera ver más; el pase automático vive solo en la
   ficha del equipo (05-detalle.js).
   Si una foto no carga, se retira sin dejar hueco.                     */
function eqcarQuitar(img){
  const c=img.closest('.eqcar'); if(!c) return;
  const i=[...c.querySelectorAll('img')].indexOf(img);
  const p=c.querySelectorAll('.eqcar-p i')[i]; if(p) p.remove();
  img.remove();
  const q=[...c.querySelectorAll('img')];
  if(!q.length){ c.remove(); return; }
  if(q.length===1) c.classList.add('una');
  eqcarIr(c,0);
}
/* La tarjeta entera es un enlace a la ficha: sin detener el evento, pasar
   una foto te sacaría de la página. */
function eqcarMover(ev, paso){
  ev.stopPropagation(); ev.preventDefault();
  const c = ev.currentTarget.closest('.eqcar'); if(!c) return;
  eqcarIr(c, (+c.dataset.i || 0) + paso);
}
function eqcarIr(c,n){
  const im=[...c.querySelectorAll('img')]; if(!im.length) return;
  n=(n+im.length)%im.length; c.dataset.i=n;
  /* Solo la primera foto de cada tarjeta lleva dirección; las demás esperan
     en data-src. Aquí se pide la que toca y la siguiente, para que el cambio
     no se vea vacío. Antes bajaban las 48 fotos del catálogo de golpe: 1,6 MB
     para enseñar once. */
  [n, (n+1)%im.length].forEach(k=>{
    const f=im[k];
    if(f && f.dataset.src){ f.src=f.dataset.src; f.removeAttribute('data-src'); }
  });
  im.forEach((x,k)=>x.classList.toggle('on',k===n));
  c.querySelectorAll('.eqcar-p i').forEach((x,k)=>x.classList.toggle('on',k===n));
}

;
/* ===== js/05-detalle.js ===== */
/* ---- DETALLE ---- */
function renderEquipo(id){
  const e=EQUIPOS.find(x=>x.id===id);
  const body=document.getElementById('equipoBody');
  if(!e){body.innerHTML='<div class="pagehead"><h1>Equipo no encontrado</h1></div>';return;}
  const items=galleryItems(e);
  const minis=galleryItems(e,200);          // la miniatura mide 82 px: no hace falta más
  const idx=EQUIPOS.indexOf(e);
  /* Un equipo nuevo de la hoja puede venir sin ficha: no debe romper la página. */
  const specRows=Object.entries(e.specs||{}).map(([k,v])=>`<div class="row"><span class="l">${k}</span><span class="v">${v}</span></div>`).join('');
  const isA=esComplemento(e);
  const priceHTML=isA
    ?`<div class="pricebox"><span class="pp" style="font-size:19px">Sin costo</span><span class="pu">· se incluye en todo alquiler con instrumentista</span></div>`
    :(VER_PRECIOS
      ?`<div class="pricebox"><span class="desde-d">Desde</span><span class="pp">S/ ${fmt(precioDesde(e.dia))}</span><span class="pu">/ ${unidadDesde(e.dia)} · IGV incluido</span><span class="tag">${e.tier}</span></div>`
      :`<div class="pricebox"><span class="pp" style="font-size:21px">Consultar tarifa</span><span class="pu">· te respondemos con precio y disponibilidad</span><span class="tag">${e.tier}</span></div>`);
  const btnsHTML=isA
    ?`<div class="dbtns"><a class="btn btn-lg" onclick="go('#/contacto')">Consultar</a></div>`
    :(VER_PRECIOS
      ?`<div class="dbtns"><button class="btn btn-fill btn-lg" onclick="go('#/cotizar/'+'${e.id}')">Calcular mi alquiler</button><a class="btn btn-lg" onclick="go('#/contacto')">Consultar</a></div>`
      :`<div class="dbtns"><a class="btn btn-fill btn-lg" onclick="go('#/contacto')">Solicitar cotización</a></div>`);
  /* Bloque de calibración: fechas y certificado (hoja Equipos, columnas cal_*). */
  const calHTML=(e.cal_fin||e.cal_pdf)?`<div class="spec"><div class="sh">Certificado de calibración</div>`
    +(e.cal_ini?`<div class="row"><span class="l">Emitido</span><span class="v">${e.cal_ini}</span></div>`:'')
    +(e.cal_fin?`<div class="row"><span class="l">Vigente hasta</span><span class="v">${e.cal_fin}</span></div>`:'')
    +(e.cal_pdf?`<div class="row"><span class="l">Documento</span><span class="v"><a href="${e.cal_pdf}" target="_blank" rel="noopener">Ver certificado</a></span></div>`:'')
    +`</div>`:'';
  const tarifasHTML=(isA||!VER_PRECIOS)?'':`<div class="spec"><div class="sh">Tarifas de alquiler</div>${tieneMedio(e.dia)?`<div class="row"><span class="l">Medio día (4 h)</span><span class="v">S/ ${fmt(precioMedio(e.dia))}</span></div>`:''}<div class="row"><span class="l">Día</span><span class="v">S/ ${fmt(e.dia)}</span></div><div class="row"><span class="l">Semana</span><span class="v">S/ ${fmt(e.sem)}</span></div><div class="row"><span class="l">Mes</span><span class="v">S/ ${fmt(e.mes)}</span></div></div>`;
  body.innerHTML=`
    <div class="crumb"><a onclick="go('#/catalogo')">Catálogo</a> &nbsp;/&nbsp; ${e.nom}</div>
    <div class="detail">
      <div class="gallery">
        <div class="main" id="galMain">${carrusel(items)}<span class="gp"></span></div>
        <div class="thumbs" id="galThumbs">
          ${minis.map((it,i)=>`<div class="thumb ${i===0?'on':''}" onclick="swapGal(${i})">${it}</div>`).join('')}
        </div>
      </div>
      <div class="dinfo">
        <div class="dcat">${e.cat}</div>
        <h1>${e.nom}</h1>
        <div class="dmarca">${e.marca}</div>
        ${priceHTML}
        ${(isA||!VER_PRECIOS)?'':`<div class="pmodbig">Modalidades (IGV incluido): ${tieneMedio(e.dia)?`&nbsp;medio día S/ ${fmt(precioMedio(e.dia))} &nbsp;·&nbsp;`:''} día S/ ${fmt(e.dia)}</div><div class="modnote">${tieneMedio(e.dia)?`Medio día es un turno de 4 h (${HORARIO_MANANA} o ${HORARIO_TARDE}) y el día completo son los dos turnos.`:`Este instrumento se alquila desde un día completo (${HORARIO_MANANA} y ${HORARIO_TARDE}).`} ${soloEquipo(e.id) ? `Lo recoges en nuestra oficina: sin instrumentista, con DNI y S/ ${fmt(garantiaDe(e.id))} de garantía que se te devuelve.` : 'Va con nuestro instrumentista, que se cobra aparte.'}</div>`}
        <div class="ddesc">${e.desc}</div>
        ${btnsHTML}
        ${e.ficha?`<a class="btn-ficha" href="${e.ficha}" target="_blank" rel="noopener">Ver ficha técnica (PDF)</a>`:`<div class="ficha-soon">Ficha técnica (PDF) · próximamente</div>`}
        <div class="dnote">${isA?'Complementaria: no se alquila sola. Va sin costo con cualquier equipo que lleve instrumentista.':'Se entrega con su certificado de calibración vigente.'}</div>
        ${calHTML}${tarifasHTML}${specRows?`<div class="spec"><div class="sh">Ficha técnica</div>${specRows}</div>`:''}
      </div>
    </div>`;
  window._galItems=items;
  setTimeout(galSiguienteFoto, 400);   // tras dar tiempo a la portada
}
function swapPk(i){
  document.getElementById('galMain').innerHTML=window._pkGal[i]+'<span class="gp"></span>';
  document.querySelectorAll('#equipoBody .thumb').forEach((t,j)=>t.classList.toggle('on',j===i));
}
/* Las fotos se apilan y se funden entre sí, como en «Nuestros clientes».
   Antes se reemplazaba el HTML entero al cambiar: la foto nueva empezaba
   a descargarse en ese momento y se veía el hueco. Ahora ya están todas
   cargadas y el cambio es instantáneo. */
function carrusel(items){
  const una = items.length < 2;
  /* Solo la primera lleva src. Las demás esperan en data-src y se piden
     de una en una en cuanto la anterior llega. Si se piden las cinco de
     golpe, Drive las sirve a 0,9 s cada una y compiten entre sí: la
     portada, que es la única que el visitante está mirando, tarda lo
     mismo que la última. Así aparece enseguida y el resto entra sin
     que se note. */
  const fotos = items.map(function(it, i){
    if(it.indexOf('<img') !== 0) return `<span class="photo${i?'':' on'}">${it}</span>`;
    const etiquetado = it.replace('<img', `<img class="photo${i?'':' on'}"`);
    return i === 0 ? etiquetado : etiquetado.replace(' src=', ' data-src=');
  }).join('');
  const puntos = una ? '' :
    `<span class="galcar-p">${items.map((_,i)=>`<i class="${i?'':'on'}" onclick="swapGal(${i})"></i>`).join('')}</span>`;
  /* Los puntos dicen cuántas fotos hay; las flechas invitan a pasarlas.
     Con solo puntos, mucha gente no se da cuenta de que puede moverse. */
  const flechas = una ? '' :
    `<button class="galcar-f izq" onclick="galMover(-1)" aria-label="Foto anterior">&#10094;</button>
     <button class="galcar-f der" onclick="galMover(1)" aria-label="Foto siguiente">&#10095;</button>`;
  return `<div class="galcar${una?' una':''}" data-i="0">${fotos}${flechas}${puntos}</div>`;
}
function swapGal(i, auto){
  const c = document.querySelector('#galMain .galcar');
  if(!c) return;
  const n = c.querySelectorAll('.photo').length;
  if(i >= n) i = 0;
  c.dataset.i = i;
  c.querySelectorAll('.photo').forEach((f,j)=>f.classList.toggle('on', j===i));
  c.querySelectorAll('.galcar-p i').forEach((d,j)=>d.classList.toggle('on', j===i));
  document.querySelectorAll('#galThumbs .thumb').forEach((t,j)=>t.classList.toggle('on', j===i));
  /* Si lo tocó una persona, la rotación se detiene un rato: no hay nada
     más molesto que una foto que se va justo cuando la estabas mirando. */
  if(!auto) GAL_TOCADO = Date.now();
}
function galMover(paso){
  const c = document.querySelector('#galMain .galcar');
  if(!c) return;
  const n = c.querySelectorAll('.photo').length;
  swapGal(((+c.dataset.i || 0) + paso + n) % n);
}
let GAL_TOCADO = 0;

/* Encadena las descargas: cada foto pide la siguiente al terminar. */
function galSiguienteFoto(){
  const f = document.querySelector('#galMain .galcar img[data-src]');
  if(!f) return;
  f.addEventListener('load', galSiguienteFoto, {once:true});
  f.addEventListener('error', galSiguienteFoto, {once:true});
  f.src = f.dataset.src;
  f.removeAttribute('data-src');
}
setInterval(function(){
  const c = document.querySelector('#galMain .galcar:not(.una)');
  if(!c || Date.now() - GAL_TOCADO < 15000) return;
  const p = document.getElementById('page-equipo');
  if(!p || !p.classList.contains('active') || document.hidden) return;
  swapGal((+c.dataset.i || 0) + 1, true);
}, 5000);

;
/* ===== js/06-portal.js ===== */
/* =====================================================================
   06-portal.js — CARGA DIFERIDA DEL PORTAL DE CLIENTES
   ---------------------------------------------------------------------
   El portal de clientes (js/06-clientes.js + css/13-clientes.css) pesa
   unos 150 KB: más de la mitad de todo lo que cargaba la web. Pero es la
   zona privada del contrato, que la mayoría de visitantes nunca abre.

   Antes se descargaba siempre, antes de que la portada apareciera.
   Ahora se carga aparte:

     · Si el visitante entra directo a #/clientes o a un #/proyecto/...,
       se descarga de inmediato.
     · En cualquier otra página se descarga en segundo plano, cuando el
       navegador ya está libre. Mientras tanto la sección de proyectos
       muestra sus marcadores, igual que antes (los proyectos vienen del
       Apps Script, así que de todos modos había que esperarlos).

   Este archivo declara PROYECTOS y deja versiones provisionales de
   pintarProyectos() y renderProyecto(); cuando llega 06-clientes.js las
   reemplaza por las de verdad.
   ===================================================================== */

let PROYECTOS = [];            // lo rellena el router al llegar los datos
let PORTAL_ESTADO = 'no';      // no | cargando | listo | error

/* Marcadores de carga, idénticos a los que pinta el portal ya cargado. */
function huesoProyectos(n){
  return Array.from({length:n},()=>`
    <article class="pr pr-hueso">
      <div class="ph-img"></div>
      <div class="ph-txt"><span class="ln w35"></span><span class="ln w85"></span>
        <span class="ln w60"></span></div>
    </article>`).join('');
}

function cargarPortal(){
  if(PORTAL_ESTADO!=='no') return;
  PORTAL_ESTADO='cargando';

  const css=document.createElement('link');
  css.rel='stylesheet'; css.href='css/13-clientes.css?v=3bd7c32f';
  document.head.appendChild(css);
  /* panel de expedientes (proyectos tipo "expediente"): sólo se carga con el portal,
     el resto del sitio no paga sus ~120 KB */
  const cssEx=document.createElement('link');
  cssEx.rel='stylesheet'; cssEx.href='css/15-expediente.css?v=3bd7c32f';
  document.head.appendChild(cssEx);
  ['js/06-expediente.js?v=3bd7c32f','js/06-tablero.js?v=3bd7c32f'].forEach(src=>{ const e=document.createElement('script'); e.src=src; e.async=false; document.head.appendChild(e); });

  const js=document.createElement('script');
  js.src='js/06-clientes.js?v=3bd7c32f'; js.async=false;      // async=false: se ejecuta después de los dos anteriores, en orden
  js.onload=()=>{
    PORTAL_ESTADO='listo';
    /* Ya existen las funciones reales: se pinta lo que corresponda. */
    try{ pintarProyectos(); }catch(e){}
    try{ if(location.hash.indexOf('#/proyecto/')===0) route(true); }catch(e){}
  };
  js.onerror=()=>{
    PORTAL_ESTADO='error';
    const g=document.getElementById('prGrid'), hm=document.getElementById('prHome');
    const aviso='<p style="color:var(--gris);grid-column:1/-1">No se pudo cargar esta sección. Recarga la página.</p>';
    if(g)g.innerHTML=aviso; if(hm)hm.innerHTML='';
  };
  document.head.appendChild(js);
}

/* Versiones provisionales: solo marcadores. 06-clientes.js las sustituye.
   pintarProyectos NO dispara la descarga a propósito: el router la llama
   en cada repintado y eso anularía todo el diferido. La descarga la
   deciden los tres disparadores de más abajo.                          */
function pintarProyectos(){
  const g=document.getElementById('prGrid'), hm=document.getElementById('prHome'),
        c=document.getElementById('countPr');
  if(g)g.innerHTML=huesoProyectos(3);
  if(hm)hm.innerHTML=huesoProyectos(3);
  if(c)c.textContent='';
}
/* Esta sí: si se está abriendo un proyecto, el portal hace falta ya. */
function renderProyecto(){
  const body=document.getElementById('equipoBody');
  if(body) body.innerHTML=`
    <div class="cargando-proy">
      <div class="cp-barra"><i></i></div>
      <p>Cargando el proyecto…</p>
      <span>Estamos trayendo la información desde el sistema de mantenimiento.</span>
    </div>`;
  cargarPortal();
}

/* Disparadores de la descarga */
(function(){
  const esRutaPortal = h => h.indexOf('#/clientes')===0 || h.indexOf('#/proyecto/')===0;

  /* 1. Enlace directo al portal: se necesita ya. */
  if(esRutaPortal(location.hash||'')) { cargarPortal(); return; }

  /* 2. Al navegar hacia el portal desde otra página. */
  addEventListener('hashchange',()=>{ if(esRutaPortal(location.hash||'')) cargarPortal(); });

  /* 3. En cualquier otro caso, en cuanto el navegador esté desocupado.
        La portada muestra los últimos proyectos, así que igual hace
        falta, pero sin estorbar al primer pintado.                    */
  const luego = () => {
    if('requestIdleCallback' in window) requestIdleCallback(cargarPortal,{timeout:2500});
    else setTimeout(cargarPortal,900);
  };
  if(document.readyState==='complete') luego();
  else addEventListener('load',luego,{once:true});
})();

;
/* ===== js/07-router.js ===== */
/* ---- ROUTER ---- */
const PAGES={'':'page-entrada','#/':'page-entrada','#/alquiler':'page-home','#/nosotros':'page-nosotros','#/servicios':'page-servicios','#/talleres':'page-talleres','#/catalogo':'page-catalogo','#/clientes':'page-clientes','#/contacto':'page-contacto'};
function go(hash){location.hash=hash;closeMenu();}
function route(sinMover){
  const h=location.hash||'#/';
  let pageId, navKey;
  /* La ficha de un equipo es su página alquiler/<tipo>/ (la que indexa
     Google). #/equipo/<id> queda solo para equipos sin página, y los
     enlaces antiguos se redirigen. */
  if(h.startsWith('#/equipo/') && (window.PAGINA_TIPO||{})[h.split('/')[2]]){
    location.replace(window.PAGINA_TIPO[h.split('/')[2]]); return;
  }
  /* #/cotizar/<id>: abre el cotizador de ese equipo. Es la ruta de los
     botones «Calcular mi alquiler» de las páginas propias; no se redirige,
     porque si no volvería a la página de donde vino. */
  if(h.startsWith('#/resumen/') || h.startsWith('#/cotizacion/')){
    pageId='page-cotizacion'; navKey='#/catalogo';
    const cod = h.slice(h.indexOf('/', 2) + 1);
    setTimeout(() => { if(typeof cotVer === 'function') cotVer(cod); }, 0);
  }
  else if(h.startsWith('#/emitir/')){
    pageId='page-emitir'; navKey='#/catalogo';
    const cod = h.slice('#/emitir/'.length);
    setTimeout(() => { if(typeof cotEmitir === 'function') cotEmitir(cod); }, 0);
  }
  else if(h === '#/cotizar-venta'){
    pageId='page-vcot'; navKey='#/venta/tienda';
    setTimeout(() => { if(typeof vcAbrir === 'function') vcAbrir(); }, 0);
  }
  else if(h==='#/cotizar' || h.startsWith('#/cotizar/')){
    pageId='page-cotizador'; navKey='#/catalogo';
    /* Diferido: route() puede correr mientras el paquete aún se evalúa. */
    const idc = h.split('/')[2] || '';
    setTimeout(() => { if(typeof cotAbrir === 'function') cotAbrir(idc); }, 0);
  }
  else if(h.startsWith('#/equipo/')){renderEquipo(h.split('/')[2]);pageId='page-equipo';navKey='#/catalogo';}
  else if(h.startsWith('#/proyecto/')){renderProyecto(h.split('/')[2]);pageId='page-equipo';navKey='#/clientes';}
  else if(h==='#/venta'||h.startsWith('#/venta/')){renderVenta(h.split('/').slice(2));pageId='page-venta';navKey=h==='#/venta'?'#/venta':'#/venta/tienda';}
  else if(h.startsWith('#/catalogo/')){
    const g=h.split('/')[2]||'';pageId='page-catalogo';navKey='#/catalogo';
    setGrupo(GRUPOS[g]?g:'all');
  }
  else{pageId=PAGES[h]||'page-entrada';navKey=h;}
  /* La barra fija del cotizador sube el botón de WhatsApp; fuera del
     cotizador todo vuelve a su sitio. */
  seguro('barra venta', () => { if(typeof vcBarra === 'function') vcBarra(); });
  document.body.classList.toggle('cot-conbarra',
    pageId === 'page-cotizador' && !!(document.getElementById('cotBarra') || {}).innerHTML);
  /* Sección activa: decide qué menú se ve (venta o alquiler). Las páginas
     comunes (servicios, clientes, contacto…) conservan la última sección
     en la que estuvo el visitante. */
  const enVenta = h==='#/venta' || h.startsWith('#/venta/');
  const enAlquiler = ['#/alquiler','#/catalogo','#/talleres'].includes(h) || /^#\/(catalogo|equipo|cotizar|cotizacion|resumen|emitir)\//.test(h) || h==='#/cotizar';
  let modo = enVenta ? 'venta' : enAlquiler ? 'alquiler' : null;
  try{ if(modo) sessionStorage.setItem('sb-modo', modo); else modo = sessionStorage.getItem('sb-modo'); }catch(e){}
  modo = modo || 'alquiler';
  document.body.classList.toggle('modo-venta', modo==='venta');
  document.body.classList.toggle('modo-alquiler', modo!=='venta');
  /* La entrada va sin el header ni el pie del sitio (css/16-entrada.css). */
  document.body.classList.toggle('en-entrada', pageId==='page-entrada');
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const el=document.getElementById(pageId); if(el)el.classList.add('active');
  document.querySelectorAll('[data-route]').forEach(a=>{const on=a.dataset.route===navKey;a.classList.toggle('active',on);if(on)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  if(!sinMover) window.scrollTo(0,0);   // al sincronizar datos no se mueve la vista
}
window.addEventListener('hashchange',function(){ route(); });   // al navegar SÍ sube al inicio
route();

/* ===== SINCRONIZACIÓN DE DATOS =====
   La web lee el catálogo y los precios desde una fuente externa, así
   se actualiza sola cuando editas tu hoja. Opciones para DATA_URL:
     "data/catalogo.json"  -> archivo del repo (regenéralo con scripts/build_catalogo.py)
     "https://script.google.com/.../exec"  -> Google Sheets EN VIVO (ver docs/GOOGLE-SHEETS.md)
     ""  -> usa solo los datos integrados (respaldo)                               */
/* CONFIG y SITE viven en js/00-config.js */
/* Carga en dos tiempos, para que la web no se quede esperando:

   1) CACHE_URL  → data/catalogo.json del repositorio. Es instantáneo,
      así el catálogo y las páginas se dibujan de inmediato.
   2) DATA_URL   → Apps Script en vivo. Tarda unos segundos (Google
      levanta el script en frío) y al llegar refresca todo en silencio.

   Además se guarda la última respuesta buena en sessionStorage: dentro
   de la misma sesión, las siguientes cargas ya no esperan.            */
/* DATOS_LISTOS se declara en 00-config.js, que carga primero. */
const CACHE_KEY = 'sb-datos';

/* Firmas separadas: el catálogo y los proyectos se repintan por su
   cuenta. Antes bastaba con que llegaran los proyectos para repintar
   TODO el catálogo (y recargar todas las fotos) aunque no hubiera
   cambiado ni un precio. Ahora cada parte se toca solo si cambió.   */
let HUELLA_CAT = '';   // firma del catálogo ya pintado (equipos + paquetes + modelo)
let HUELLA_PRO = '';   // firma de los proyectos ya pintados
let PRO_PINTADOS = false;

/* Firma del catálogo: si no cambia, no se repinta (y no se recargan todas
   las fotos por nada). OJO con lo que entra aquí: durante meses solo
   miraba «photo», la portada. Al añadir fotos a una ficha sin cambiar la
   portada, la firma salía idéntica, se daba el catálogo por igual y NUNCA
   se aplicaban: el archivo publicado traía 43 fotos y la web seguía
   pintando 30. Por eso la lista entera cuenta, no solo la primera. */
function firmaCatalogo(d){
  return JSON.stringify([
    (d.equipos ||[]).map(e=>[e.id,e.nom,e.dia,e.photo,(e.fotos||[]).join('|'),e.cal_fin]),
    (d.paquetes||[]).map(p=>[p.id,p.nom,p.dia,(p.fotos||[]).join('|')]),
    d.modelo || null
  ]);
}
function firmaProyectos(d){
  return JSON.stringify((d.proyectos||[]).map(p=>[p.id,p.avance]));
}

let REF_EQUIPOS = 0, REF_PROYECTOS = 0;

/* El Apps Script contesta a medias de vez en cuando: devuelve el JSON con
   alguna sección vacía. Si se aplica tal cual, desaparecen proyectos de la
   pantalla; y como además se guarda 24 h, siguen desaparecidos al volver.
   Es lo que hacía que «Nuestros clientes» perdiera Limatambo cada tanto.

   Una sección vacía cuando el archivo publicado la traía llena no es un
   borrado del cliente: es una respuesta incompleta. Se descarta. */
function llegaAMedias(d){
  if(!d) return true;
  if(REF_EQUIPOS   && !(d.equipos   || []).length) return 'sin equipos';
  if(REF_PROYECTOS && !(d.proyectos || []).length) return 'sin proyectos';
  return false;
}

function aplicarDatos(d, enVivo){
  if(!d) return false;
  if(enVivo) DATOS_LISTOS = true;
  /* El mapa de fotos locales solo viene en el archivo publicado, nunca en
     la respuesta en vivo. Se guarda la primera vez y no se pisa después:
     si se perdiera, la web volvería a pedirle las fotos a Drive y Drive
     las rechazaría con 429. */
  if(d.local) fotosLocales(d.local);
  /* Del archivo publicado se anota CUÁNTO traía. Sirve de vara de medir
     para descartar respuestas en vivo que lleguen a medias. */
  if(!enVivo){
    REF_EQUIPOS   = Math.max(REF_EQUIPOS,   (d.equipos   || []).length);
    REF_PROYECTOS = Math.max(REF_PROYECTOS, (d.proyectos || []).length);
  }

  conFotosExtra(d.equipos);
  /* Venta: manda el Apps Script propio de venta (CONFIG.VENTA_URL). El
     bloque «venta» del script principal es una lista antigua (51 equipos,
     sin precio) y, si se usaba, pisaba a la buena al llegar después. */
  if(d.venta && !(typeof CONFIG!=='undefined' && CONFIG.VENTA_URL)) ventaEnVivo(d.venta);
  const primeraVez = !CATALOGO_LISTO;
  const fCat = firmaCatalogo(d);
  const cambioCat = (fCat !== HUELLA_CAT);

  if(cambioCat){
    HUELLA_CAT = fCat;
    /* Solo se aceptan filas con id y nombre. Si la hoja cambia de forma
       (p. ej. un bloque de parámetros encima de los encabezados) llegan
       filas vacías, y pintarlas dejaba tarjetas en blanco en la web: mejor
       quedarse con lo que ya había.                                     */
    const validos = a => Array.isArray(a) ? a.filter(x => x && x.id && x.nom) : [];
    const eqOk = validos(d.equipos);
    if(eqOk.length){ EQUIPOS = eqOk; aplicarTarifas(); }
    if(d.modelo){
      const m=d.modelo;
      if(m.instrumentista_dia!=null) TEC_DIA=m.instrumentista_dia;
      if(m.instrumentista_min!=null) TEC_MIN=m.instrumentista_min;
      if(m.descuento_combinar) DESC_COMB=m.descuento_combinar;
      /* La hoja manda sobre el interruptor de precios (modelo.mostrar_precios):
         así se encienden o apagan sin tocar el código. */
      if(m.mostrar_precios!=null && !PRECIOS_PRUEBA) VER_PRECIOS = !!m.mostrar_precios;
      if(m.medio_dia_min!=null) MEDIO_MIN=m.medio_dia_min;
      if(m.pedido_min!=null) PEDIDO_MIN=m.pedido_min;
      if(m.sin_tecnico) SIN_TECNICO=m.sin_tecnico;
      if(Array.isArray(m.complementos)) COMPLEMENTOS=m.complementos;
      if(Array.isArray(m.incluidos)) INCLUIDOS=m.incluidos;
    }
  }

  /* ── De dónde salen los proyectos ──────────────────────────────────
     La respuesta en vivo del Apps Script manda siempre. Pero el sitio trae
     además una copia de esa misma respuesta (data/catalogo.json, generada
     al publicar y marcada con "generado"), y esa copia se pinta de entrada.

     Antes no: la lista esperaba a Google, y si Google tardaba o fallaba
     —pasó, con la IP limitada por exceso de peticiones— el cliente veía
     marcadores grises varios minutos y al final una lista incompleta.
     Ahora la sección abre al instante con la copia y se corrige sola en
     cuanto llega la hoja. La copia solo se acepta si trae "generado", para
     que un archivo de ejemplo escrito a mano nunca entre por aquí.    */
  /* Se acepta «generado» o «actualizado»: el Apps Script pone uno u otro
     según por dónde salga la respuesta, y exigir solo el primero dejó la
     sección sin proyectos. Lo que importa es que el archivo lleve una marca
     de tiempo puesta por el script, no que se llame de una manera concreta:
     un archivo de ejemplo escrito a mano seguiría sin entrar. */
  if(!enVivo && !PRO_PINTADOS && (d.generado || d.actualizado)
     && Array.isArray(d.proyectos) && d.proyectos.length && !PROYECTOS.length){
    PROYECTOS = d.proyectos;
    HUELLA_PRO = '';                  // la respuesta en vivo la reemplaza igual
  }

  /* Los interruptores "mostrar" de los expedientes vienen dentro del propio
     catálogo, venga de donde venga. Antes se preguntaban uno por uno: cada
     pregunta al Apps Script cuesta ~2 s y se atienden de a una, así que el
     cliente que entraba a su proyecto esperaba detrás de ellas.          */
  if(d.expedientes) window.EX_SITIO = d.expedientes;

  let cambioPro = false;
  if(enVivo){
    const fPro = firmaProyectos(d);
    if(fPro !== HUELLA_PRO || !PRO_PINTADOS){
      HUELLA_PRO = fPro; cambioPro = true;
      if(Array.isArray(d.proyectos)) PROYECTOS = d.proyectos;
    }
  }

  CATALOGO_LISTO = true;

  if(cambioCat || primeraVez){
    repintarCatalogo();
  }
  if(cambioPro || primeraVez){
    seguro('proyectos', ()=>pintarProyectos());
    if(enVivo) PRO_PINTADOS = true;
  }
  if(cambioCat || cambioPro || primeraVez) route(true);   // sin mover la vista
  return true;
}

/* Cada sección se repinta por separado y con su propio try. Si una
   falla (por ejemplo, una fila incompleta en la hoja), las demás se
   pintan igual y el error queda registrado en la consola, en vez de
   dejar la web congelada con los datos anteriores.                  */
function seguro(nombre, fn){
  try{ fn(); }catch(e){ console.error('Sinergia: falló '+nombre+' -> '+e.message); }
}
function repintarCatalogo(){
  seguro('filtros',      ()=>buildFacetsEq());
  seguro('equipos',      ()=>pintar());
  seguro('destacados',   ()=>pintarDestacados());
  seguro('form contacto',()=>pintarSelectContacto());
}
/* Pintado completo. Solo se usa como último recurso, cuando no llegó
   ninguna fuente y hay que mostrar los datos de respaldo.            */
function repintarTodo(){
  repintarCatalogo();
  seguro('proyectos', ()=>pintarProyectos());
  /* El cotizador también: si se abrió antes de que llegaran las tarifas,
     se quedaba con los precios viejos del catálogo. */
  seguro('cotizador', ()=>{ const c=document.getElementById('cotEq');
    if(c && c.innerHTML && typeof cotPintar==='function') cotPintar(); });
}

/* Descarga con límite de tiempo. Sin esto, si Google se queda pensando
   la promesa nunca se resuelve: la web se quedaba esperando para
   siempre y el reintento de proyectos (06-clientes.js) seguía girando. */
/* ── UNA petición al Apps Script a la vez ──────────────────────────────
   Google atiende de a una por cuenta. Si se le encima otra, la que llega
   de más espera decenas de segundos y a veces termina en 404: la primera
   respuesta es un 302 con una llave de un solo uso, y bajo presión esa
   llave ya no vale cuando el navegador va a buscar el contenido.

   Por eso aquí se hace cola: dos pedidos nunca salen a la vez, salgan de
   donde salgan (el catálogo al abrir la web, el detalle del proyecto, un
   reintento). Medido: una sola petición son 302 en 1,9 s + contenido en
   1,0 s; encimadas, 13 a 40 s y 404.                                    */
let _COLA = Promise.resolve();
function enCola(tarea){
  const turno = _COLA.then(tarea, tarea);
  _COLA = turno.then(()=>{}, ()=>{});     // la cola sigue aunque uno falle
  return turno;
}

/* Petición con reintentos cortos, SIEMPRE de a una.
   Medido contra el sitio en producción: el script se ejecuta siempre en
   0,6 s, pero la capa pública de Google contesta a veces en 1,5 s, a veces
   en 8 s, a veces se cuelga y a veces devuelve 404. Un intento suelto falla
   a menudo; dos o tres seguidos, casi nunca.

   Por eso se prefieren varios intentos CORTOS antes que uno largo: esperar
   25 s a una petición que ya se colgó no la salva, solo hace esperar al
   cliente. Peor caso ≈ 41 s en vez de los 150 s que llegaba a acumular.  */
const REINTENTOS = [10000, 12000, 15000];     // tiempo límite de cada intento
const PAUSAS     = [1500, 3000];              // espera entre uno y otro

async function traerPronto(url, ms){
  const tope = ms || (typeof CONFIG!=='undefined' && CONFIG.TIMEOUT_MS) || 25000;
  let ultimo;
  for(let i=0; i<REINTENTOS.length; i++){
    try{
      return await traer(url, Math.min(REINTENTOS[i], tope));
    }catch(e){
      ultimo = e;
      if(i < PAUSAS.length){
        console.warn('Sinergia: intento '+(i+1)+' sin suerte ('+e.message+'), reintentando');
        await new Promise(r=>setTimeout(r, PAUSAS[i]));
      }
    }
  }
  throw ultimo;
}

async function traer(url, ms){
  /* Lo del Apps Script va en cola; los archivos del propio sitio, no:
     esos los sirve GitHub Pages y pueden ir todos a la vez.            */
  if(/^https?:\/\/script\.google\.com/.test(url)) return enCola(()=>traerYa(url, ms));
  return traerYa(url, ms);
}

async function traerYa(url, ms){
  const limite = ms || (typeof CONFIG!=='undefined' && CONFIG.TIMEOUT_MS) || 12000;
  const ctrl = (typeof AbortController!=='undefined') ? new AbortController() : null;
  const corte = setTimeout(()=>{ if(ctrl) ctrl.abort(); }, limite);
  try{
    /* El archivo del repositorio puede venir de la caché del navegador
       (se revalida por cabeceras en vercel.json); la hoja en vivo no.  */
    const local = url.indexOf('http')!==0;
    const r = await fetch(url, {
      cache: local ? 'default' : 'no-store',
      signal: ctrl ? ctrl.signal : undefined
    });
    if(!r.ok) throw new Error('HTTP '+r.status);
    const txt = await r.text();
    if(txt.charAt(0) !== '{' && txt.charAt(0) !== '[')      // Google devuelve su página de error con código 200
      throw new Error('respuesta no válida del servidor');
    return JSON.parse(txt);
  }catch(e){
    if(e && e.name==='AbortError') throw new Error('tiempo de espera agotado ('+limite+' ms)');
    throw e;
  }finally{
    clearTimeout(corte);
  }
}

/* ── Respaldos, en dos niveles ────────────────────────────────────────
   respaldoCatalogo() -> el catálogo se pinta ya, con los datos de
     js/02-datos.js (espejo de data/catalogo.json). Los proyectos siguen
     esperando, porque solo son válidos si vienen en vivo.
   rendirse()         -> se deja de esperar del todo: los proyectos pasan
     de "cargando" a su estado final.                                   */
function respaldoCatalogo(motivo){
  if(CATALOGO_LISTO) return;
  CATALOGO_LISTO = true;
  repintarCatalogo();
  route(true);
  console.warn('Sinergia: catálogo de respaldo ('+motivo+')');
}
function rendirse(motivo){
  respaldoCatalogo(motivo);
  if(DATOS_LISTOS) return;
  DATOS_LISTOS = true;              // nada más va a llegar
  seguro('proyectos', ()=>pintarProyectos());
  route(true);
  console.warn('Sinergia: sin datos en vivo ('+motivo+')');
}
/* Compatibilidad con el nombre anterior. */
function usarRespaldo(motivo){ rendirse(motivo); }

/* Red de seguridad por si una petición se queda colgada sin dar error.
   Da margen a los dos intentos (Google a veces tarda 30 s en despertar). */
const _ESPERA = ((typeof CONFIG!=='undefined' && CONFIG.TIMEOUT_MS) || 25000);
setTimeout(()=>rendirse('sin respuesta a tiempo'), 45000);   // los tres intentos caben de sobra

/* Última respuesta buena del Apps Script, guardada en el navegador (24 h).
   Sirve para que el portal muestre los proyectos aunque Google tarde o falle;
   el dato sigue viniendo de la hoja, solo que de la visita anterior.        */
const VIVO_KEY = 'sb-datos-vivo', VIVO_HORAS = 24;
function vivoGuardar(d){
  try{ localStorage.setItem(VIVO_KEY, JSON.stringify({t:Date.now(), d:d})); }catch(e){}
}
function vivoLeer(publicado){
  try{
    const o = JSON.parse(localStorage.getItem(VIVO_KEY) || 'null');
    if(!o || !o.t || (Date.now()-o.t)/3600000 >= VIVO_HORAS) return null;
    /* Esta copia se pinta ENCIMA de data/catalogo.json. Si el archivo
       publicado es más nuevo que ella, aplicarla sería retroceder: el
       visitante que ya entró antes vería el catálogo viejo hasta 24 h
       después de publicar. Pasó con las fotos de las herramientas: ya
       estaban publicadas y la página seguía pintando las de antes. */
    if(publicado && o.d && o.d.actualizado && o.d.actualizado < publicado){
      localStorage.removeItem(VIVO_KEY);
      return null;
    }
    if(llegaAMedias(o.d)){       // guardada de una respuesta mala anterior
      localStorage.removeItem(VIVO_KEY);
      return null;
    }
    return o.d;
  }catch(e){}
  return null;
}

async function loadData(){
  /* ── 1. copia local: lo que ya tenemos a mano ──────────────────────
     Timeout corto: es un archivo del mismo servidor. Si no llega, no se
     hace esperar al visitante mirando marcadores: se pinta el respaldo
     integrado y el catálogo aparece igual.                            */
  let hayDatos = false;
  try{
    /* SIEMPRE se parte del archivo publicado, aunque haya copia de sesión.
       Antes, si la había, se pintaba esa y ya: el archivo ni se miraba. Y
       como esa copia puede venir de una respuesta incompleta de la hoja,
       no había forma de saber que faltaba algo ni con qué compararlo. De
       ahí que «Nuestros clientes» perdiera Limatambo cada tanto.

       index.html arrancó esta descarga en el <head>, antes de que
       existiera este archivo: aquí solo se recoge, ya suele estar lista. */
    let d = null;
    if(window.__catalogo) d = await window.__catalogo;
    if(!d && CONFIG.CACHE_URL) d = await traer(CONFIG.CACHE_URL, 5000);
    hayDatos = aplicarDatos(d, false);          // base completa y vara de medir

    /* Y encima, lo más fresco que haya de la hoja: primero lo de esta
       sesión; si no, la última respuesta buena guardada. Cualquiera de las
       dos se descarta si llega a medias. */
    const guardado = sessionStorage.getItem(CACHE_KEY);
    const extra = guardado ? JSON.parse(guardado) : vivoLeer(d && d.actualizado);
    if(extra && !llegaAMedias(extra)) hayDatos = aplicarDatos(extra, true) || hayDatos;
    else if(extra){
      console.warn('Sinergia: copia guardada incompleta, se descarta');
      try{ sessionStorage.removeItem(CACHE_KEY); }catch(e){}
    }
  }catch(e){
    console.warn('Sinergia: no se pudo leer la copia local ('+e.message+')');
  }
  if(!hayDatos) respaldoCatalogo('la copia local no respondió');

  /* ── 2. datos en vivo ─────────────────────────────────────────────── */
  if(!CONFIG.DATA_URL){ rendirse('sin DATA_URL configurada'); return; }

  /* Se espera a que la página esté cargada. Medido: esta llamada ocupa una
     conexión de 10 s (el Apps Script tarda o no contesta y hay que
     reintentar), y arrancaba a los 300 ms, compitiendo por el ancho de
     banda con las fotos justo cuando el visitante está mirando. No corre
     prisa: la página ya se pintó con el archivo publicado, que va completo;
     esto solo sirve por si la hoja cambió después de publicar. */
  await new Promise(function(listo){
    const seguir = () => window.requestIdleCallback
      ? requestIdleCallback(listo, {timeout: 2000})   // el 2º argumento son opciones, no ms
      : setTimeout(listo, 1);
    if(document.readyState === 'complete') seguir();
    else addEventListener('load', seguir, {once:true});
  });

  try{
    const d = await traerPronto(CONFIG.DATA_URL, _ESPERA);
    const falta = llegaAMedias(d);
    if(falta){
      /* Ni se pinta ni se guarda: se deja lo que ya había, que está completo. */
      console.warn('Sinergia: respuesta incompleta de la hoja ('+falta+'), se ignora');
      return;
    }
    aplicarDatos(d, true);
    try{ sessionStorage.setItem(CACHE_KEY, JSON.stringify(d)); }catch(e){}
    vivoGuardar(d);
    console.info('Sinergia: datos sincronizados desde la hoja');
  }catch(e){
    rendirse('no se cargó el Apps Script: '+e.message);
  }
}
loadData();

;
/* ===== js/08-ui.js ===== */
/* ---- MEJORAS DE INTERFAZ ---- */
// Sombra del header al hacer scroll
const _hdr=document.querySelector('header');
addEventListener('scroll',()=>{
  if(_hdr) _hdr.classList.toggle('scrolled',scrollY>8);
  const t=document.getElementById('toTop'); if(t)t.classList.toggle('show',scrollY>420);
},{passive:true});
// Revelado suave de secciones estáticas
(function(){
  if(!('IntersectionObserver' in window))return;
  const els=document.querySelectorAll('.svc .card,.step,.wcard,.facts,.shead,.custom-cta,.nota');
  els.forEach(el=>el.classList.add('rv'));
  const io=new IntersectionObserver(es=>es.forEach(x=>{if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}}),{threshold:.12});
  els.forEach(el=>io.observe(el));
})();
// WhatsApp: si CONFIG.WHATSAPP tiene número, activa botón flotante y enlace del footer
(function(){
  const n=String(CONFIG.WHATSAPP||'').replace(/\D/g,'');
  if(!n)return;
  const url='https://wa.me/'+n+'?text='+encodeURIComponent('Hola Sinergia Biomédica, quiero solicitar una cotización.');
  const f=document.getElementById('waFab'); if(f){f.href=url;f.classList.add('show');}
  const l=document.getElementById('waLink'); if(l){l.href=url;l.target='_blank';l.rel='noopener';l.removeAttribute('onclick');}
})();

;
/* ===== js/09-menu.js ===== */
/* ---- MENÚ MÓVIL ---- */
function toggleMenu(){document.getElementById('mobileMenu').classList.toggle('open');}
function closeMenu(){document.getElementById('mobileMenu').classList.remove('open');}

;
/* ===== js/10-modal.js ===== */
/* ---- MODAL RESERVA ---- */
const vEscT = t => String(t==null?'':t).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let actual=null;
function techRates(){return {medio:TEC_MIN, dia:TEC_DIA, semana:TEC_DIA*4, mes:TEC_DIA*12};}
const MODLBL={medio:['Precio por medio día','Medios días','Cantidad de medios días (turnos)'],dia:['Precio por día','Días','Días'],semana:['Precio por semana','Semanas','Cantidad de semanas'],mes:['Precio por mes','Meses','Cantidad de meses']};
const turnos = () => `un turno de 4 h (${HORARIO_MANANA} o ${HORARIO_TARDE})`;
function eqConds(dia, id){
  if(id && soloEquipo(id)) return {medio:`Medio día: ${turnos()}.`,
    dia:`Lo recoges y lo devuelves en nuestra oficina. No necesita instrumentista: dejas tu DNI y S/ ${fmt(garantiaDe(id))} de garantía, que se te devuelve con el equipo.`,
    semana:'Tarifa semanal: equivale a 4 días.',mes:'Tarifa mensual: equivale a 12 días.'};
  return {medio:`Medio día: ${turnos()}.`,
  dia: tieneMedio(dia) ? `Jornada completa: los dos turnos (${HORARIO_MANANA} y ${HORARIO_TARDE}).`
                       : `Este instrumento se alquila desde un día completo (${HORARIO_MANANA} y ${HORARIO_TARDE}): por su tarifa, medio día no cubre la entrega y el recojo.`,
  semana:'Tarifa semanal: equivale a 4 días.',mes:'Tarifa mensual: equivale a 12 días.'};}
function openModal(nom,marca,prices,conds,tec,igvInc,mod0,garantia){
  if(!VER_PRECIOS){ go('#/contacto'); return; }   // precios ocultos: se cotiza por contacto
  actual={nom,prices,conds,tec,igvInc:!!igvInc,mod:'dia',gar:garantia||0,id:arguments[8]||''};
  /* Sin instrumentista: en vez de la caja del técnico va la de la garantía. */
  document.getElementById('cajaTec').hidden = !!actual.gar;
  const cg = document.getElementById('cajaGar');
  cg.hidden = !actual.gar;
  if(actual.gar) document.getElementById('cGar').textContent = 'S/ ' + fmt(actual.gar);
  /* Herramientas complementarias: van sin costo cuando va el instrumentista. */
  const extra = document.getElementById('mIncluye');
  const comp = actual.gar ? [] : incluidos(actual.id);
  extra.hidden = !comp.length;
  if(comp.length) extra.innerHTML = `<b>Incluido sin costo:</b> ${comp.map(c => vEscT(c.nom)).join(' · ')}.`;
  /* Sin medio día (instrumentos económicos), se oculta ese botón. */
  const hayMedio = prices.medio != null;
  const bMedio = document.querySelector('#modSeg [data-m="medio"]');
  if(bMedio) bMedio.hidden = !hayMedio;
  if(!hayMedio && (mod0||'medio') === 'medio') mod0 = 'dia';
  document.getElementById('mMinNota').textContent = PEDIDO_MIN
    ? `Pedido mínimo S/ ${fmt(PEDIDO_MIN)} (sin contar al instrumentista).` : '';
  document.getElementById('mTitulo').textContent=nom;
  document.getElementById('mMarca').textContent=marca;
  document.getElementById('d1').value='';document.getElementById('d2').value='';
  document.getElementById('nQty').value='1';
  setMod(mod0||'medio');
  _lastFocus=document.activeElement;
  document.body.classList.add('lock');
  document.getElementById('ov').classList.add('open');
  const x=document.querySelector('#ov .x'); if(x)x.focus();
}
function setMod(m){
  if(!actual)return;
  actual.mod=m;
  document.querySelectorAll('#modSeg button').forEach(b=>b.classList.toggle('on',b.dataset.m===m));
  const isDia=m==='dia';
  document.getElementById('inDia').style.display=isDia?'':'none';
  document.getElementById('inQty').style.display=isDia?'none':'';
  const L=MODLBL[m];
  document.getElementById('qtyLabel').textContent=L[2];
  document.getElementById('cUnitLbl').textContent=L[0];
  document.getElementById('cQtyLbl').textContent=L[1];
  document.getElementById('cTecUnitLbl').textContent={medio:'Por medio día',dia:'Por día',semana:'Por semana',mes:'Por mes'}[m];
  document.getElementById('cTecQtyLbl').textContent=L[1];
  document.getElementById('cDia').textContent='S/ '+fmt(actual.prices[m]);
  document.getElementById('modCond').textContent=actual.conds[m]||'';
  calc();
}
function clearCalc(){
  ['cDias','cSub','cIgv','cTot','cTecUnit','cTecQty','cTec','cGrand'].forEach(id=>document.getElementById(id).textContent='—');
  const f=document.getElementById('cMinFila'); if(f) f.hidden=true;
}
function abrir(idx){
  const e=EQUIPOS[idx];
  const pr={dia:e.dia, semana:e.dia*4, mes:e.dia*12};
  if(tieneMedio(e.dia)) pr.medio=precioMedio(e.dia);
  openModal(e.nom, e.marca, pr, eqConds(e.dia, e.id), techRates(), true, 'medio', garantiaDe(e.id), e.id);
}
/* Abre el cotizador de un equipo por su id. El catálogo llega del Apps
   Script y puede tardar, así que reintenta unos segundos antes de rendirse. */
function abrirCotizador(id, intento){
  const i = EQUIPOS.findIndex(e => e.id === id);
  if(i >= 0){ abrir(i); return; }
  /* El catálogo llega del Apps Script y puede tardar; se reintenta hasta
     60 s antes de rendirse. */
  if((intento||0) < 240) setTimeout(() => abrirCotizador(id, (intento||0)+1), 250);
}

function cerrar(){
  document.getElementById('ov').classList.remove('open');
  document.body.classList.remove('lock');
  if(_lastFocus&&_lastFocus.focus)_lastFocus.focus();
}
let _lastFocus=null;
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.getElementById('ov').classList.contains('open'))cerrar();});
document.getElementById('ov').onclick=e=>{if(e.target.id==='ov')cerrar()};
function calc(){
  if(!actual)return;
  const m=actual.mod, unit=actual.prices[m];
  let qty=0;
  if(m==='dia'){
    const d1=new Date(document.getElementById('d1').value),d2=new Date(document.getElementById('d2').value);
    if(isNaN(d1)||isNaN(d2)||d2<d1){clearCalc();return;}
    qty=Math.max(1,Math.round((d2-d1)/86400000)+1);
  }else{
    qty=Math.max(1,parseInt(document.getElementById('nQty').value)||1);
  }
  const tunit=actual.gar ? 0 : (actual.tec[m]||0);
  /* Mínimo por pedido: cubre la entrega y el recojo aunque el alquiler sea chico. */
  const bruto=qty*unit, rentTot=Math.max(PEDIDO_MIN, bruto), rSub=rentTot/1.18, rIgv=rentTot-rSub;
  const fMin=document.getElementById('cMinFila');
  if(fMin){ fMin.hidden = !(rentTot > bruto); document.getElementById('cMin').textContent='S/ '+rentTot.toFixed(2); }
  const tecTot=actual.gar ? 0 : Math.max(TEC_MIN, qty*tunit), grand=rentTot+tecTot;
  document.getElementById('cDias').textContent=qty;
  document.getElementById('cSub').textContent='S/ '+rSub.toFixed(2);
  document.getElementById('cIgv').textContent='incl. S/ '+rIgv.toFixed(2);
  document.getElementById('cTot').textContent='S/ '+rentTot.toFixed(2);
  document.getElementById('cTecUnit').textContent='S/ '+tunit.toFixed(2);
  document.getElementById('cTecQty').textContent=qty;
  document.getElementById('cTec').textContent='S/ '+tecTot.toFixed(2);
  document.getElementById('cGrand').textContent='S/ '+grand.toFixed(2);
}
/* El envío real de la solicitud vive en js/11-solicitudes.js (función
   enviar). Antes aquí había una versión de prueba que solo mostraba un
   aviso diciendo "Prototipo" y no enviaba nada.                       */

;
/* ===== js/11-solicitudes.js ===== */
/* =====================================================================
   11-solicitudes.js — ENVÍO REAL DE SOLICITUDES
   ---------------------------------------------------------------------
   Antes los dos formularios (contacto y reserva) mostraban un aviso que
   decía "Prototipo". Un cliente que llenaba el formulario no enviaba
   nada y se llevaba una mala impresión.

   Ahora arman la solicitud y la mandan por WhatsApp o por correo, sin
   necesidad de servidor. Si algún día contratas un endpoint (Formspree,
   Getform, etc.), pon la URL en CONFIG.FORM_ENDPOINT (js/00-config.js)
   y se enviará ahí en segundo plano, además de abrir WhatsApp/correo.
   ===================================================================== */

/* ── utilidades ─────────────────────────────────────────────────────── */
const val = id => { const el = document.getElementById(id); return el ? String(el.value || '').trim() : ''; };

function avisar(id, texto, tipo){
  const el = document.getElementById(id); if(!el) return;
  el.textContent = texto || '';
  el.className = 'form-msg' + (texto ? ' show ' + (tipo || 'info') : '');
}

function correoValido(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }
function telefonoValido(v){ return String(v).replace(/\D/g, '').length >= 6; }

/* Valida nombre + al menos una forma de contacto. Devuelve null si todo
   está bien, o el texto del error.                                     */
function validarContacto(nom, mail, tel){
  if(nom.length < 2)                       return 'Escribe tu nombre o el de la institución.';
  if(!mail && !tel)                        return 'Déjanos un correo o un teléfono para responderte.';
  if(mail && !correoValido(mail))          return 'Revisa el correo: parece incompleto.';
  if(tel && !telefonoValido(tel))          return 'Revisa el teléfono: faltan dígitos.';
  return null;
}

/* Envío opcional a un endpoint externo. Nunca bloquea al usuario: si
   falla, la solicitud igual sale por WhatsApp o correo.               */
function enviarAlEndpoint(datos){
  const url = (typeof CONFIG !== 'undefined' && CONFIG.FORM_ENDPOINT) || '';
  if(url.indexOf('http') !== 0) return;
  try{
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(datos)
    }).catch(() => {});
  }catch(e){}
}

/* Abre WhatsApp o el correo. Se usa un <a> temporal en vez de
   window.open porque algunos navegadores móviles bloquean el popup.   */
function abrirCanal(via, texto, asunto){
  if(via === 'correo'){
    const destino = (typeof SITE !== 'undefined' && SITE.email) || '';
    location.href = 'mailto:' + destino +
      '?subject=' + encodeURIComponent(asunto) +
      '&body=' + encodeURIComponent(texto);
    return;
  }
  const n = String((typeof CONFIG !== 'undefined' && CONFIG.WHATSAPP) || '').replace(/\D/g, '');
  if(!n){                                   // sin número: se cae al correo
    abrirCanal('correo', texto, asunto);
    return;
  }
  const a = document.createElement('a');
  a.href = urlWhatsApp(n, texto);
  a.target = '_blank'; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
}

/* En el celular, wa.me abre la aplicación. En la computadora, wa.me pasa
   por una página intermedia de WhatsApp que con mensajes largos se ve
   rota y descuadrada: ahí se va directo a WhatsApp Web, que pega el
   mensaje en el chat. */
function urlWhatsApp(numero, texto){
  const movil = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(navigator.userAgent || '');
  const base = movil ? 'https://wa.me/' + numero + '?text='
                     : 'https://web.whatsapp.com/send?phone=' + numero + '&text=';
  return base + encodeURIComponent(texto);
}

/* ── formulario de contacto ─────────────────────────────────────────── */
/* La lista de equipos del formulario se llena con el catálogo ya cargado. */
function pintarSelectContacto(){
  const sel = document.getElementById('cEq'); if(!sel) return;
  const previo = sel.value;
  sel.innerHTML = '<option value="">— Selecciona —</option>' +
    '<option value="Venta de equipamiento biomédico">Venta de equipamiento biomédico</option>' +
    EQUIPOS.map(e => `<option value="${e.nom}">${e.nom}</option>`).join('') +
    '<option value="Otro / no está en la lista">Otro / no está en la lista</option>';
  if(previo){
    const op = [...sel.options].find(o => o.value === previo);
    if(op) sel.value = previo;
  }
}
pintarSelectContacto();

function enviarContacto(via){
  const nom = val('cNom'), mail = val('cMail'), tel = val('cTel'), msg = val('cMsg');
  const sel = document.getElementById('cEq');
  const eq  = sel && sel.selectedIndex > 0 ? sel.value : '';

  const error = validarContacto(nom, mail, tel);
  if(error){ avisar('cAviso', error, 'err'); return; }

  const lineas = [
    'Solicitud de cotización — ' + ((typeof SITE !== 'undefined' && SITE.nombre) || 'Sinergia Biomédica'),
    '',
    'Nombre / institución: ' + nom,
    mail ? 'Correo: ' + mail : '',
    tel  ? 'Teléfono: ' + tel : '',
    eq   ? 'Equipo de interés: ' + eq : '',
    msg  ? '' : null,
    msg  ? 'Mensaje:' : null,
    msg  || null
  ].filter(x => x !== null && x !== '');

  const texto = lineas.join('\n');
  enviarAlEndpoint({ tipo: 'contacto', nombre: nom, correo: mail, telefono: tel, equipo: eq, mensaje: msg });
  avisar('cAviso', via === 'correo'
    ? 'Abriendo tu correo con la solicitud lista para enviar…'
    : 'Abriendo WhatsApp con la solicitud lista para enviar…', 'ok');
  abrirCanal(via, texto, 'Solicitud de cotización' + (eq ? ' · ' + eq : ''));
}

/* ── formulario del modal de reserva ────────────────────────────────── */
function enviar(via){
  if(!actual){ return; }
  const nom = val('mNom'), mail = val('mMail'), tel = val('mTel');

  const error = validarContacto(nom, mail, tel);
  if(error){ avisar('mAviso', error, 'err'); return; }

  const leer = id => { const el = document.getElementById(id); return el ? el.textContent : '—'; };
  const modLbl = { medio:'por medio día', dia:'por día', semana:'por semana', mes:'por mes' }[actual.mod] || actual.mod;

  const lineas = [
    'Solicitud de reserva — ' + ((typeof SITE !== 'undefined' && SITE.nombre) || 'Sinergia Biomédica'),
    '',
    'Equipo / paquete: ' + actual.nom,
    'Modalidad: ' + modLbl,
    'Cantidad: ' + leer('cDias'),
    'Alquiler: ' + leer('cTot') + ' (IGV incluido)',
    'Instrumentista: ' + leer('cTec'),
    'Total general: ' + leer('cGrand'),
    '',
    'Nombre / institución: ' + nom,
    mail ? 'Correo: ' + mail : '',
    tel  ? 'Teléfono: ' + tel : ''
  ].filter(Boolean);

  const texto = lineas.join('\n');
  enviarAlEndpoint({ tipo:'reserva', equipo: actual.nom, modalidad: actual.mod,
                     total: leer('cGrand'), nombre: nom, correo: mail, telefono: tel });
  avisar('mAviso', via === 'correo'
    ? 'Abriendo tu correo con la reserva lista para enviar…'
    : 'Abriendo WhatsApp con la reserva lista para enviar…', 'ok');
  abrirCanal(via, texto, 'Solicitud de reserva · ' + actual.nom);
}

/* ── datos de contacto en el bloque "facts" ─────────────────────────── */
/* Antes estaban escritos a mano en el HTML (el teléfono incluso como
   "+51 9XX XXX XXX"). Ahora todos salen de SITE: se editan en un solo
   sitio, js/00-config.js, y no pueden quedar desfasados entre sí.     */
(function(){
  if(typeof SITE === 'undefined') return;
  const poner = (id, txt) => { const el = document.getElementById(id); if(el && txt) el.textContent = txt; };
  poner('factTel',  SITE.telefono);
  poner('factMail', SITE.email);
  poner('factWeb',  SITE.web);
  poner('factRuc',  SITE.ruc);
})();

;
/* ===== js/12-venta.js ===== */
/* =====================================================================
   12-venta.js — Sección de VENTA de equipamiento biomédico
   Rutas:  #/venta              portada de venta (categorías y destacados)
           #/venta/cat/<id>     equipos de una categoría
           #/venta/p/<id>       ficha de un producto (mismo formato que el
                                alquiler: galería + datos + pestañas)
   Los datos viven en data/venta.json; se cargan la primera vez que se
   entra a Venta, no antes (la portada y el alquiler no los necesitan).
   EN VIVO: el Apps Script lee la hoja «Sinergia - Venta (catálogo en
   vivo)» y manda los productos con publicar = SI (precio publicado,
   stock y fecha de actualización incluidos). Cuando llegan, reemplazan
   a los de venta.json, que queda como respaldo si Google no responde.
   ===================================================================== */
/* var y no let: 07-router.js corre antes en el paquete y puede llamar a renderVenta al cargar. */
var VENTA = null, VENTA_CARGA = null, VENTA_VIVO = null, VENTA_FIRMA = '';

/* Llamada desde aplicarDatos (07-router.js) con d.venta del Apps Script.
   Puede llegar antes de que este archivo termine de cargar (caché de la
   sesión), por eso solo guarda y el repintado va diferido.            */
function ventaEnVivo(v){
  if(!v || !Array.isArray(v.productos)) return;
  const ok = v.productos.filter(p => p && p.id && p.nom);
  if(!ok.length) return;              // hoja vacía o mal leída: se queda lo publicado
  /* Nunca cambiar una lista con precios por otra sin precios (datos viejos). */
  if(VENTA_VIVO && VENTA_VIVO.productos.some(p => p.precio) && !ok.some(p => p.precio)) return;
  const firma = JSON.stringify([ok, v.actualizado]);
  if(firma === VENTA_FIRMA) return;   // nada cambió: no se repinta (ni se borra la búsqueda)
  VENTA_FIRMA = firma;
  VENTA_VIVO = {productos: ok, actualizado: v.actualizado || ''};
  if(VENTA){
    vMezclar();
    setTimeout(() => { if(location.hash.startsWith('#/venta')) renderVenta(location.hash.split('/').slice(2)); }, 0);
  }
}
/* Ajustes de la web sobre cada equipo (data/venta.json):
   - stock visible: el 30 % del stock del proveedor, mínimo 1 y máximo 10;
   - código NTS (y su nombre oficial) si la hoja aún no lo tiene. */
function vAjustar(p){
  const q = Object.assign({}, p), sv = (VENTA && VENTA.stockVis) || {};
  const n = Number(q.stock);
  if(q.stock !== '' && q.stock != null && n > 0)
    q.stock = Math.min(sv.maximo || 10, Math.max(1, Math.floor(n * (sv.porcentaje || 30) / 100)));
  const fx = ((VENTA && VENTA.fijos) || {})[q.id] || {};   // marca/origen que la hoja no trae
  if(!q.marca && fx.marca) q.marca = fx.marca;
  if(!q.origen && fx.origen) q.origen = fx.origen;
  if(!q.clave) q.clave = ((VENTA && VENTA.nts) || {})[q.id] || '';
  if(q.clave && !q.expediente) q.expediente = ((VENTA && VENTA.ntsNom) || {})[q.clave] || '';
  return q;
}
/* Equipos retirados a mano (data/venta.json › noPublicar): siguen con
   publicar = SI en la hoja, pero no se muestran ni se cotizan. Motivo
   anotado en el propio archivo (precio por encima de la competencia). */
function vBloqueado(id){
  const no = (VENTA && VENTA.noPublicar) || {};
  return !!id && id !== '_nota' && Object.prototype.hasOwnProperty.call(no, id);
}

function vMezclar(){
  if(VENTA && VENTA_VIVO){
    /* Si la hoja aún no tiene fotos de un equipo, se usan las del sitio (img/venta/). */
    const base = new Map((VENTA.base || VENTA.productos).map(p => [p.id, p]));
    VENTA.base = VENTA.base || VENTA.productos;
    VENTA.productos = VENTA_VIVO.productos.filter(p => !vBloqueado(p.id)).map(p => {
      p = vAjustar(p);
      const fija = (VENTA.fijas||{})[p.id];          // foto corregida a mano (la del proveedor estaba mal)
      if(Array.isArray(fija) && fija.length) return Object.assign({}, p, {fotos: fija});
      const b = base.get(p.id);
      /* Orden de prioridad: foto corregida (fotosFijas) › foto de la hoja o
         del proveedor (modelo real) › foto antigua del sitio (respaldo). */
      const respaldo = b && b.fotosSitio && b.fotosSitio.length;
      return respaldo && !(p.fotos && p.fotos.length) ? Object.assign({}, p, {fotos: b.fotosSitio}) : p;
    });
    VENTA.actualizado = VENTA_VIVO.actualizado;
  }
}

function cargarVenta(){
  if(!VENTA_CARGA){
    /* data/venta-vivo.json: copia diaria de la hoja (la deja el robot de
       «Páginas de venta»). Así, aunque Google tarde o falle —pasa seguido
       en el celular—, la tienda abre con los 150 equipos y sus precios,
       no con la lista antigua de venta.json. */
    const leerCopia = () => fetch('data/venta-vivo.json', {cache:'no-cache'}).then(r => r.ok ? r.json() : Promise.reject(r.status));
    const copia = leerCopia().catch(() => new Promise(ok => setTimeout(ok, 800)).then(leerCopia)).catch(() => null);  // 2.º intento si la red falla
    VENTA_CARGA = fetch('data/venta.json', {cache:'no-cache'})
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .catch(() => ({categorias:[], productos:[]}))
      .then(d => copia.then(c => { if(c && !VENTA_VIVO) ventaEnVivo(c); return d; }))
      .then(d => {
        VENTA = {categorias: d.categorias||[], fijas: d.fotosFijas||{}, primeros: d.primerosWeb||[],
                 noPublicar: d.noPublicar||{},
                 stockVis: d.stockVisible||{}, nts: d.codigosNTS||{}, ntsNom: d.nombresNTS||{}, fijos: d.datosFijos||{}};
        VENTA.productos = (d.productos||[]).filter(p => p && p.id && p.nom && !vBloqueado(p.id)).map(p => vAjustar(p.fotos || !p.fotosSitio ? p : Object.assign({}, p, {fotos: p.fotosSitio})));
        vMezclar(); return VENTA; });
    /* Precios y stock en vivo desde el Apps Script de venta (si está configurado). */
    const vu = (typeof CONFIG!=='undefined' && CONFIG.VENTA_URL) || '';
    if(vu) fetch(vu, {cache:'no-store'}).then(r => r.json()).then(d => { if(d && d.ok !== false) ventaEnVivo(d); }).catch(() => {});
  }
  return VENTA_CARGA;
}

const vEsc = s => String(s==null?'':s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const vCat = id => (VENTA.categorias||[]).find(c => c.id === id);
const vDeCat = id => VENTA.productos.filter(p => p.cat === id);

/* Íconos de línea por categoría (24×24, mismo trazo que los de Servicios). */
const V_ICO = {
  monitoreo:      '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M6 11h3l2-3 2 6 2-3h3M9 21h6M12 17v4"/>',
  emergencia:     '<path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10z"/><path d="m12 9-1.5 3h3L12 15"/>',
  reanimacion:    '<path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10z"/><path d="m12 9-1.5 3h3L12 15"/>',
  neonatal:       '<circle cx="12" cy="6" r="3"/><path d="M5 21v-3a7 7 0 0 1 14 0v3M9 14h6"/>',
  uci:            '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h8M8 12h5M12 16v3"/><circle cx="15.5" cy="16" r="1.2"/>',
  imagenes:       '<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M7 14a5 5 0 0 1 10 0M12 9v2M9 21h6"/>',
  diagnostico:    '<path d="M3 12h4l2-7 4 14 2-7h6"/>',
  quirofano:      '<circle cx="12" cy="8" r="5"/><path d="M12 13v8M8 21h8"/>',
  esterilizacion: '<rect x="4" y="6" width="16" height="14" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M8 3v3M16 3v3"/>',
  laboratorio:    '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3"/><path d="M7.5 15h9"/>',
  mobiliario:     '<path d="M3 18V8M3 14h18v4M21 18v-4M7 14v-3h10a4 4 0 0 1 4 4"/><circle cx="6" cy="11" r="1.6"/>',
  'cadena-frio':  '<rect x="6" y="3" width="12" height="18" rx="2"/><path d="M6 10h12M9 6v2M9 13v3M15 14l-2 2 2 2"/>',
  metrologia:     '<path d="M4 18h16M6 18V8M10 18v-6M14 18V6M18 18v-8"/>'
};
function vIco(id, cls){
  return `<svg class="${cls||'v-ico'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${V_ICO[id]||V_ICO.diagnostico}</svg>`;
}

/* Búsqueda: sin tildes ni mayúsculas, sobre nombre, marca, modelo, nombre y
   código NTS, categoría y áreas. Así el logístico encuentra el
   equipo pegando el nombre tal cual viene en su listado (o el código D-18). */
const vNorm = s => String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
function vBuscar(q){
  const t = vNorm(q).split(/\s+/).filter(w => w.length > 1);
  if(!t.length) return [];
  return VENTA.productos.filter(p => {
    const c = vCat(p.cat);
    const txt = vNorm([p.nom,p.marca,p.modelo,p.expediente,p.clave,c&&c.nombre,(p.areas||[]).join(' '),(p.caracteristicas||[]).join(' ')].join(' '));
    return t.every(w => txt.includes(w));
  });
}
function vBuscarEn(q, destino){
  const caja = document.getElementById(destino); if(!caja) return;
  const r = vBuscar(q);
  const otros = document.querySelectorAll('[data-sin-busqueda]');
  otros.forEach(e => e.hidden = !!q.trim());
  caja.innerHTML = !q.trim() ? '' : (r.length
    ? `<div class="v-cuenta">${r.length} ${r.length===1?'resultado':'resultados'} para «${vEsc(q)}»</div><div class="grid">${r.map(vCard).join('')}</div>`
    : `<div class="v-vacio"><h3>No encontramos «${vEsc(q)}» en el catálogo publicado</h3><p>Igual podemos conseguirlo. Escríbenos con el nombre o el código de tu listado y te enviamos opciones con su ficha técnica.</p><div class="hero-cta"><a class="btn btn-fill" href="${vWA('Hola Sinergia Biomédica, quiero cotizar: '+q)}" target="_blank" rel="noopener">Cotizar por WhatsApp</a></div></div>`);
}
function vBuscador(destino, ph){
  return `<label class="v-busca"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
    <input type="search" placeholder="${ph||'Busca por equipo, marca, modelo o código NTS (ej. D-18)'}" oninput="vBuscarEn(this.value,'${destino}')" aria-label="Buscar equipos"></label>`;
}

/* Cotizar una lista completa: el texto pegado va tal cual en el mensaje. */
/* «Cotiza tu lista completa»: en la portada de Venta y al pie de la tienda. */
function vListaCaja(){
  return `    <div class="v-panel" id="cotiza-lista">
      <div class="k">Para logística y compras</div>
      <h3>Cotiza tu lista completa</h3>
      <p>Pega tu listado tal como lo tienes (nombre, código y cantidad) y te respondemos con una sola cotización.</p>
      <textarea id="vLista" rows="4" placeholder="Ej.: D-18 MONITOR DE FUNCIONES VITALES DE 5 PARAMETROS · 4 und&#10;D-88 ASPIRADOR DE SECRECIONES RODABLE · 6 und"></textarea>
      <div class="v-lista-btns"><button type="button" class="btn btn-fill" onclick="vListaEnviar('wa')">Enviar por WhatsApp</button><button type="button" class="btn" onclick="vListaEnviar('mail')">Enviar por correo</button></div>
    </div>`;
}

function vListaEnviar(via){
  const t = (document.getElementById('vLista')||{}).value||'';
  if(!t.trim()){ document.getElementById('vLista').focus(); return; }
  const msg = 'Hola Sinergia Biomédica, quiero cotizar esta lista de equipos:\n\n'+t.trim();
  if(via==='wa') window.open(vWA(msg),'_blank','noopener');
  else location.href = `mailto:${SITE.email}?subject=${encodeURIComponent('Cotización de lista de equipos')}&body=${encodeURIComponent(msg)}`;
}

function vWA(texto){
  const n = String(SITE.whatsapp||'').replace(/\D/g,'');
  return (typeof urlWhatsApp === 'function') ? urlWhatsApp(n, texto)
       : `https://wa.me/${n}?text=${encodeURIComponent(texto)}`;
}
function vMail(asunto){
  return `mailto:${SITE.email}?subject=${encodeURIComponent(asunto)}`;
}

/* Precio publicado (proveedor + margen, calculado en la hoja) y stock. */
const vSoles = n => 'S/ ' + Number(n).toLocaleString('es-PE', {maximumFractionDigits: 0});
/* En la ficha (detalle=true) se muestra siempre la cantidad; en las tarjetas,
   solo cuando quedan pocas unidades. */
function vStock(p, detalle){
  if(p.stock === undefined || p.stock === null || p.stock === '') return '';
  const n = Number(p.stock);
  if(!(n > 0)) return '<span class="v-stock">A pedido</span>';
  const cant = detalle || n <= 5 ? ' · ' + n + (n === 1 ? ' unidad' : (detalle ? ' unidades' : ' und.')) : '';
  return `<span class="v-stock si">En stock${cant}</span>`;
}

/* Foto del producto: la versión ligera (-m) en tarjetas y la grande en la ficha. */
function vFoto(p, i, ligera){ const u=(p.fotos||[])[i||0]; return u ? fotoURL(u, ligera?700:1200, ligera) : ''; }

/* Tarjeta con el mismo formato que la del catálogo de alquiler (.eq):
   foto arriba con etiquetas, categoría, nombre, marca y pie con precio. */
/* Marca, modelo y origen como una franja de ficha técnica: tres columnas
   alineadas (título pequeño arriba, dato abajo), sin cajitas, entre dos
   líneas finas. Se lee de un vistazo y no compite con el nombre. Si un
   dato es largo, la columna baja de línea en vez de cortarse. */
function vMarcaModelo(p, grande){
  const d = [['Marca', p.marca, 'marca'], ['Modelo', p.modelo, 'modelo'], ['Origen', p.origen, 'origen']].filter(x => x[1]);
  if(!d.length) return '';
  return `<dl class="v-ft${grande?' v-ft-g':''}">${d.map(([k,v,c]) =>
    `<div class="v-ft-${c}"><dt>${k}</dt><dd>${vEsc(v)}</dd></div>`).join('')}</dl>`;
}

/* Vigencia del precio: 14 días desde la última actualización con el
   portal del proveedor (fecha «actualizado» de la hoja, dd/mm/aaaa).
   Devuelve '15/10/2026' o '' si no hay fecha; vencida → 'vencido'. */
const V_VIGENCIA_DIAS = 14;
function vVigencia(){
  const m = String((VENTA && VENTA.actualizado) || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if(!m) return '';
  const f = new Date(+m[3], +m[2]-1, +m[1] + V_VIGENCIA_DIAS);
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  if(f < hoy) return 'vencido';
  const d2 = n => String(n).padStart(2,'0');
  return `${d2(f.getDate())}/${d2(f.getMonth()+1)}/${f.getFullYear()}`;
}
function vNotaPrecio(larga){
  const v = vVigencia();
  if(v === 'vencido') return larga ? 'Precio referencial, por confirmar en la cotización' : 'por confirmar';
  if(v) return larga ? `Precio vigente hasta el ${v} · se confirma en la cotización` : `vigente hasta el ${v}`;
  return larga ? 'Precio referencial, sujeto a confirmación en la cotización' : 'sujeto a confirmación';
}

/* Cada equipo tiene su página propia (venta/<id>/, la genera
   scripts/generar_paginas_venta.py y la anota en window.PAGINA_VENTA).
   Si un equipo es nuevo y aún no tiene página, se abre la ficha interna. */
function vPagina(id){ return (window.PAGINA_VENTA || {})[id] || ''; }
function vAbrir(id){ const u = vPagina(id); if(u) location.href = u; else go('#/venta/p/' + id); }

/* Botón de carrito con los datos del equipo pegados: así funciona igual
   en la web y en las páginas sueltas de producto. */
function vBotonAdd(p, clase, texto){
  return `<button type="button" class="${clase}" data-add="${vEsc(p.id)}"
    data-nom="${vEsc(p.nom)}" data-mm="${vEsc([p.marca, p.modelo].filter(Boolean).join(' '))}"
    data-nts="${vEsc(p.clave || '')}" data-precio="${Number(p.precio || 0)}"
    data-foto="${vEsc(vFoto(p, 0, true) || '')}">${texto || 'Agregar al carrito'}</button>`;
}

function vCard(p){
  const c = vCat(p.cat);
  const foto = vFoto(p, 0, true);
  const url = `#/venta/p/${p.id}`;   // referencia; los clics van por vAbrir()
  const st = (p.stock === undefined || p.stock === null || p.stock === '') ? '' :
    (Number(p.stock) > 0 ? '<span class="badge">EN STOCK</span>' : '<span class="badge v-apedido">A PEDIDO</span>');
  const tag = p._top ? '<span class="tier">Más pedido</span>' : '';
  const pie = p.precio
    ? `<div class="price"><span class="desde">Precio referencial</span>${vSoles(p.precio)}<small>Incluye IGV · ${vNotaPrecio(false)}</small></div>`
    : `<div class="price v-consulta">Consultar precio<small>te respondemos con precio y plazo</small></div>`;
  return `<div class="eq v-eq">
    <div class="img${foto?' has-photo':''}" onclick="vAbrir('${p.id}')">
      ${foto?'':'<span class="grid-bg"></span>'}${st}${tag}
      ${foto?`<img class="photo" src="${foto}" alt="${vEsc(p.nom)} ${vEsc(p.marca||'')} ${vEsc(p.modelo||'')}" loading="lazy" decoding="async">`:`<span class="v-sinfoto">${vIco(p.cat,'v-ico-xl')}</span>`}
    </div>
    <div class="body">
      <div class="cat">${vEsc(c?c.nombre:'')}</div>
      <h3><a onclick="vAbrir('${p.id}')">${vEsc(p.nom)}</a></h3>
      ${vMarcaModelo(p)}
      ${p.clave?`<div class="v-exp" title="${vEsc(p.expediente||'Código NTS 113-MINSA')}">Código NTS ${vEsc(p.clave)}</div>`:''}
      <div class="desc">${vEsc(p.resumen||'')}</div>
      <div class="foot">${pie}${vBotonAdd(p, 'btn v-add')}</div>
    </div>
  </div>`;
}

function vHueso(){
  return `<div class="wrap pagehead"><span class="ln w35"></span></div><section><div class="wrap v-cats">${
    Array.from({length:8},()=>'<div class="v-cat v-hueso"></div>').join('')}</div></section>`;
}

/* ── Orden de la tienda ─────────────────────────────────────────────
   1) Los fijados en data/venta.json («primerosWeb»), en ese orden.
   2) Hasta S/ 60 000 antes; los más caros al final.
   3) Dentro de cada tramo, variado y según el estudio de compras
      públicas: primero una opción de cada tipo de equipo (la
      representativa de la hoja o la más accesible), en el orden del
      ranking; luego la segunda opción de cada tipo; etc.
   Marca _top (etiqueta «Más pedido») al primero de cada tipo del ranking. */
const V_CARO = 60000;
function vOrden(lista){
  const pin = (VENTA && VENTA.primeros) || [];
  const grupos = new Map();
  lista.forEach(p => { const k = p.ranking ? 'r'+p.ranking : 'c'+p.cat; if(!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(p); });
  const key = new Map();
  grupos.forEach(g => {
    /* Primera opción de cada tipo: la fijada, luego la elegida como
       representativa en la hoja (destacado) y luego por precio. */
    const fij = p => pin.includes(p.id) ? 0 : 1, des = p => p.destacado ? 0 : 1;
    g.sort((a,b) => fij(a)-fij(b) || des(a)-des(b) || (a.precio||Infinity)-(b.precio||Infinity));
    const ronda = [0,0];
    g.forEach(p => { const t = (p.precio||0) > V_CARO ? 1 : 0; const r = ronda[t]++; key.set(p, [t, r]); p._top = !!(p.ranking && r === 0) || pin.includes(p.id); });
  });
  return lista.slice().sort((a,b) => {
    const pa = pin.indexOf(a.id), pb = pin.indexOf(b.id);
    if(pa >= 0 || pb >= 0) return (pa < 0 ? 999 : pa) - (pb < 0 ? 999 : pb);
    const ka = key.get(a), kb = key.get(b);
    return ka[0]-kb[0] || ka[1]-kb[1] || (a.ranking||999)-(b.ranking||999) || (a.precio||Infinity)-(b.precio||Infinity);
  });
}

/* Inicio: exactamente el mismo orden que la tienda, los 12 primeros. */
function vPortadaTramos(){
  return `<div class="grid">${vOrdenTienda(VENTA.productos).slice(0, 12).map(vCard).join('')}</div>`;
}

/* ── Portada de venta ─────────────────────────────────────────────── */
function vPortada(){
  /* Mismo esquema que el inicio de alquiler: hero con imagen, franja de
     marcas, «más pedidos» con acceso a la tienda y accesos por categoría.
     destacado = puesto según las compras públicas 2024-2025 (OECE). */
  const dest = vOrden(VENTA.productos).filter(p => p._top);
  const n = VENTA.productos.length;
  const mosaico = dest.filter(p => (p.fotos||[]).length).slice(0,4);
  const marcas = ['EDAN','TUTTNAUER','KLS MARTIN','CU MEDICAL','SIARE','MEMMERT'];
  return `
  <div class="wrap hero-grid v-hero2">
    <div>
      <div class="eyebrow">Venta · Equipamiento · Expedientes</div>
      <h1>Equipamiento médico con <em>respaldo técnico</em>.</h1>
      <p class="lead">${n} equipos de marcas como Edan, Tuttnauer, KLS Martin y CU Medical para hospitales, clínicas y obras de equipamiento en Lima y provincias.</p>
      <div class="hero-props">
        <span>Ficha técnica y código NTS</span>
        <span>Mantenimiento después de la venta</span>
      </div>
      <div class="hero-cta">
        <a class="btn btn-fill btn-lg" onclick="go('#/venta/tienda')">Ver la tienda</a>
        <a class="btn btn-lg" onclick="document.getElementById('cotiza-lista').scrollIntoView({behavior:'smooth',block:'center'})">Cotizar mi lista</a>
      </div>
    </div>
    <div class="hero-stage v-mosaico">
      <div class="v-mos">${mosaico.map(p => `<a onclick="vAbrir('${p.id}')" title="${vEsc(p.nom)}"><img src="${vFoto(p,0,true)}" alt="${vEsc(p.nom)}"></a>`).join('')}</div>
      <div class="cap"><span>Los más comprados por hospitales en 2024 y 2025</span><span><b>VENTA</b></span></div>
    </div>
  </div>
  <div class="marcas v-marcas">
    <div class="wrap"><span class="lab">Marcas que vendemos</span>
      <div class="names">${marcas.map(m => `<span>${m}</span>`).join('')}</div>
    </div>
  </div>

  <section><div class="wrap">
    <div class="v-portada-busca">${vBuscador('vResPortada')}</div>
    <div id="vResPortada"></div>
    <div data-sin-busqueda>
      <div class="shead">
        <div><div class="k">Tienda de venta</div><h2>Equipos más pedidos</h2></div>
        <a class="btn btn-fill" onclick="go('#/venta/tienda')">Ver toda la tienda →</a>
      </div>
      ${vPortadaTramos()}
      <div class="cat-chips">
        <span>Ir directo a</span>
        ${VENTA.categorias.filter(c => vDeCat(c.id).length).map(c => `<button class="chip" onclick="go('#/venta/cat/${c.id}')">${vEsc(c.nombre)}</button>`).join('')}
      </div>
    </div>
  </div></section>

  <section style="padding-top:0" data-sin-busqueda><div class="wrap v-dos">
    <div class="v-panel oscuro">
      <div class="k">Obras y proyectos</div>
      <h3>¿Equipas una obra? Hacemos el expediente técnico.</h3>
      <p>Metrado por ambiente, especificaciones técnicas, memoria de cálculo, presupuesto y planos del componente de equipamiento.</p>
      <a class="btn btn-fill" onclick="go('#/clientes')">Ver proyectos realizados →</a>
    </div>
    ${vListaCaja()}
  </div></section>

  <section style="padding-top:0" data-sin-busqueda><div class="wrap">
    <div class="shead"><div><div class="k">Cómo trabajamos</div><h2>De tu requerimiento a la entrega</h2></div>
      <p>Una sola empresa como contacto, de la cotización al mantenimiento.</p></div>
    <div class="steps">
      <div class="step"><div class="num">1</div><h3>Nos envías tu requerimiento</h3><p>La lista de equipos, el área a equipar o el expediente técnico de tu obra.</p></div>
      <div class="step"><div class="num">2</div><h3>Te cotizamos</h3><p>Con ficha técnica, marca, modelo, plazo de entrega y condiciones claras.</p></div>
      <div class="step"><div class="num">3</div><h3>Entregamos y damos respaldo</h3><p>Coordinamos la entrega y te acompañamos con mantenimiento y verificación.</p></div>
    </div>
  </div></section>`;
}

/* ── Categoría ────────────────────────────────────────────────────── */



/* ── Tienda: todo el catálogo de venta con filtros ─────────────────────
   Mismo esquema que el catálogo de alquiler: filtros a la izquierda
   (categoría, marca, procedencia, disponibilidad), buscador y orden
   arriba. #/venta/cat/<id> abre la tienda con esa categoría marcada.
   Filtrar solo repinta la grilla, así el buscador no pierde el foco. */
var VT = {q:'', cat:new Set(), marca:new Set(), origen:new Set(), precio:new Set(), stock:false, orden:'dest'};

/* Tramos de precio de la tienda (S/). Orden por defecto: por tramo, de menor
   a mayor, y dentro de cada tramo por «más pedidos» (puesto del tipo de
   equipo en el estudio de compras públicas 2024-2025). */
const V_TRAMOS = [            // límite superior y nombre (con espacios que no se cortan)
  [2000,     'Hasta S/ 2 000'],
  [6000,     'S/ 2 000 – 6 000'],
  [15000,    'S/ 6 000 – 15 000'],
  [40000,    'S/ 15 000 – 40 000'],
  [100000,   'S/ 40 000 – 100 000'],
  [Infinity, 'Más de S/ 100 000']
];
function vTramo(p){ return p.precio ? V_TRAMOS.findIndex(t => p.precio <= t[0]) : V_TRAMOS.length; }
function vTramoNombre(i){ return i < V_TRAMOS.length ? V_TRAMOS[i][1] : 'Consultar precio'; }

function vtFaceta(titulo, clave, opciones){
  if(!opciones.length) return '';
  return `<details class="facet" open><summary>${titulo}</summary><div class="opts">${opciones.map(([v,txt,n]) =>
    `<label><input type="checkbox" value="${vEsc(v)}" ${VT[clave].has(v)?'checked':''} onchange="vtMarcar('${clave}',this.value,this.checked)"> ${vEsc(txt)} <span class="vt-n">${n}</span></label>`).join('')}</div></details>`;
}
function vtConteo(campo){
  const m = new Map();
  VENTA.productos.forEach(p => { const v = p[campo]; if(v) m.set(v, (m.get(v)||0)+1); });
  return m;
}
function vTienda(catInicial, precioInicial){
  VT.q=''; VT.marca.clear(); VT.origen.clear(); VT.precio.clear(); VT.stock=false; VT.orden='dest';
  if(precioInicial != null && precioInicial !== '') VT.precio.add(String(precioInicial));
  VT.cat = new Set(catInicial && vCat(catInicial) ? [catInicial] : []);
  const cc = vtConteo('cat'), cm = vtConteo('marca'), co = vtConteo('origen');
  const cats = VENTA.categorias.filter(c => cc.get(c.id)).map(c => [c.id, c.nombre, cc.get(c.id)]);
  const marcas = [...cm].sort((a,b) => a[0].localeCompare(b[0])).map(([v,n]) => [v,v,n]);
  const origenes = [...co].sort((a,b) => a[0].localeCompare(b[0])).map(([v,n]) => [v,v,n]);
  const hayStock = VENTA.productos.some(p => p.stock !== undefined && p.stock !== null && p.stock !== '');
  const hayPrecio = VENTA.productos.some(p => p.precio);
  const ct = new Map(); VENTA.productos.forEach(p => { const t = String(vTramo(p)); ct.set(t, (ct.get(t)||0)+1); });
  const tramos = [...V_TRAMOS.keys(), V_TRAMOS.length].filter(i => ct.get(String(i))).map(i => [String(i), vTramoNombre(i), ct.get(String(i))]);
  const c1 = VT.cat.size===1 ? vCat([...VT.cat][0]) : null;
  return `
  <div class="wrap pagehead">
    <div class="crumb"><a onclick="go('#/venta')">Venta</a> &nbsp;/&nbsp; Tienda</div>
    <div class="k">Tienda de equipamiento biomédico</div>
    <h1>${c1 ? vEsc(c1.nombre) : 'Todos los equipos'}</h1>
    <p>Filtra por categoría, marca o procedencia. Cada equipo tiene su ficha con marca, modelo y el nombre con que aparece en los expedientes técnicos.</p>
  </div>
  <section style="padding-top:30px"><div class="wrap">
    <button class="filtros-btn" onclick="document.getElementById('vtSide').classList.toggle('open')">Filtros ▾</button>
    <div class="catalog-layout">
      <aside class="filters-side" id="vtSide">
        ${hayPrecio ? vtFaceta('Precio','precio',tramos) : ''}
        ${vtFaceta('Categoría','cat',cats)}
        ${vtFaceta('Marca','marca',marcas)}
        ${vtFaceta('Procedencia','origen',origenes)}
        ${hayStock ? `<details class="facet" open><summary>Disponibilidad</summary><div class="opts"><label><input type="checkbox" onchange="VT.stock=this.checked;vtPintar()"> Solo en stock</label></div></details>` : ''}
        <div class="filters-clear"><button onclick="vtLimpiar()">Limpiar filtros</button></div>
      </aside>
      <div class="catalog-main">
        <div class="vt-barra">
          <label class="v-busca vt-busca">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            <input type="search" placeholder="Buscar equipo, marca, modelo o código (ej. D-18)" oninput="VT.q=this.value;vtPintar()" aria-label="Buscar en la tienda">
          </label>
          <select class="vt-orden" onchange="VT.orden=this.value;vtPintar()" aria-label="Ordenar">
            <option value="dest">Por precio y más pedidos</option>
            <option value="az">Nombre (A–Z)</option>
            ${hayPrecio ? '<option value="pmen">Precio: menor a mayor</option><option value="pmay">Precio: mayor a menor</option>' : ''}
          </select>
        </div>
        <div class="vt-activos" id="vtActivos"></div>
        <div class="v-cuenta" id="vtCuenta"></div>
        <div class="grid vt-grid" id="vtGrid"></div>
      </div>
    </div>
  </div></section>
  <section class="v-sec"><div class="wrap vt-lista">${vListaCaja()}</div></section>`;
}
/* Orden por defecto de la tienda (y del inicio): tramo de precio y, dentro,
   más pedidos (puesto del tipo en el estudio), «Más pedido» primero y precio. */
function vOrdenTienda(l){
  vOrden(VENTA.productos);                 // marca «Más pedido» (_top) sobre todo el catálogo
  const pin = (VENTA && VENTA.primeros) || [];
  const rk = p => p.ranking ? Number(p.ranking) : 999;
  /* Dentro de cada tramo: primero los fijados (primerosWeb), luego una
     opción de cada tipo de equipo en el orden del estudio, luego la segunda
     de cada tipo, etc. (así no salen dos microscopios seguidos). */
  const ronda = new Map(), cuenta = new Map();
  l.slice().sort((a,b) => (b._top?1:0)-(a._top?1:0) || (a.precio||Infinity)-(b.precio||Infinity)).forEach(p => {
    const k = vTramo(p) + '|' + (p.ranking ? 'r'+p.ranking : 'c'+p.cat);
    const n = cuenta.get(k) || 0; cuenta.set(k, n+1); ronda.set(p, n);
  });
  const fij = p => { const i = pin.indexOf(p.id); return i < 0 ? 999 : i; };
  return l.slice().sort((a,b) => vTramo(a)-vTramo(b) || fij(a)-fij(b) || ronda.get(a)-ronda.get(b)
    || rk(a)-rk(b) || (a.precio||Infinity)-(b.precio||Infinity));
}
function vtFiltrados(){
  const t = vNorm(VT.q).split(/\s+/).filter(w => w.length > 1);
  let l = VENTA.productos.filter(p => {
    if(VT.cat.size && !VT.cat.has(p.cat)) return false;
    if(VT.marca.size && !VT.marca.has(p.marca)) return false;
    if(VT.origen.size && !VT.origen.has(p.origen)) return false;
    if(VT.precio.size && !VT.precio.has(String(vTramo(p)))) return false;
    if(VT.stock && !(Number(p.stock) > 0)) return false;
    if(t.length){
      const c = vCat(p.cat);
      const txt = vNorm([p.nom,p.marca,p.modelo,p.expediente,p.clave,c&&c.nombre,(p.areas||[]).join(' '),(p.caracteristicas||[]).join(' ')].join(' '));
      if(!t.every(w => txt.includes(w))) return false;
    }
    return true;
  });
  if(VT.orden==='az') l.sort((a,b) => a.nom.localeCompare(b.nom));
  else if(VT.orden==='pmen') l.sort((a,b) => (a.precio||Infinity)-(b.precio||Infinity));
  else if(VT.orden==='pmay') l.sort((a,b) => (b.precio||0)-(a.precio||0));
  else l = vOrdenTienda(l);
  return l;
}
function vCarritoEngancha(){
  if(window.SBCarrito) setTimeout(() => { SBCarrito.enganchar(); SBCarrito.pintar(); }, 0);
}

function vtPintar(){
  const g = document.getElementById('vtGrid'); if(!g) return;
  const l = vtFiltrados();
  document.getElementById('vtCuenta').textContent = `${l.length} ${l.length===1?'equipo':'equipos'}`;
  const chips = [];
  VT.cat.forEach(v => { const c = vCat(v); chips.push(['cat',v,c?c.nombre:v]); });
  VT.marca.forEach(v => chips.push(['marca',v,v]));
  VT.origen.forEach(v => chips.push(['origen',v,v]));
  VT.precio.forEach(v => chips.push(['precio',v,vTramoNombre(Number(v))]));
  document.getElementById('vtActivos').innerHTML = chips.map(([k,v,t]) =>
    `<button onclick="vtMarcar('${k}','${vEsc(v)}',false,true)">${vEsc(t)} ✕</button>`).join('');
  const html = l.map(vCard).join('');
  g.innerHTML = l.length ? html : `<div class="v-vacio" style="grid-column:1/-1"><h3>No hay equipos con esos filtros</h3><p>Igual podemos conseguirlo. Escríbenos qué necesitas y te enviamos opciones con su ficha técnica.</p><div class="hero-cta"><a class="btn btn-fill" href="${vWA('Hola Sinergia Biomédica, busco: '+(VT.q||'un equipo'))}" target="_blank" rel="noopener">Cotizar por WhatsApp</a><button class="btn" onclick="vtLimpiar()">Limpiar filtros</button></div></div>`;
  vCarritoEngancha();
}
function vtMarcar(clave, v, on, desmarcar){
  on ? VT[clave].add(v) : VT[clave].delete(v);
  if(desmarcar) document.querySelectorAll('#vtSide input').forEach(i => { if(i.value===v) i.checked=false; });
  vtPintar();
}
function vtLimpiar(){
  ['cat','marca','origen','precio'].forEach(k => VT[k].clear()); VT.stock=false; VT.q='';
  document.querySelectorAll('#vtSide input').forEach(i => i.checked=false);
  const b = document.querySelector('.vt-busca input'); if(b) b.value='';
  vtPintar();
}

/* ── Ficha de producto (formato B) ────────────────────────────────── */
function vProducto(id){
  const p = VENTA.productos.find(x => x.id === id);
  if(!p) return vPortada();
  const c = vCat(p.cat);
  const fotos = (p.fotos||[]).map((u,i) => vFoto(p, i, false));
  const minis = (p.fotos||[]).map((u,i) => vFoto(p, i, true));
  const specs = (p.specs||[]).map(s => Array.isArray(s)
    ? (s.length===1 ? `<tr class="g"><th colspan="2">${vEsc(s[0])}</th></tr>` : `<tr><td>${vEsc(s[0])}</td><td>${vEsc(s[1])}</td></tr>`) : '').join('');
  const pest = [];
  if((p.caracteristicas||[]).length) pest.push(['Características', `<ul class="v-puntos">${p.caracteristicas.map(u=>`<li>${vEsc(u)}</li>`).join('')}</ul><p class="v-nota">Te enviamos la ficha técnica completa del fabricante junto con la cotización.</p>`]);
  if(p.expediente||p.clave) pest.push(['Código NTS', `<table class="v-tabla">${p.clave?`<tr><td>Código NTS</td><td><b>${vEsc(p.clave)}</b> (NTS 113-MINSA)</td></tr>`:''}${p.expediente?`<tr><td>Nombre oficial</td><td><b>${vEsc(p.expediente)}</b></td></tr>`:''}<tr><td>Modelo ofertado</td><td>${vEsc([p.marca,p.modelo].filter(Boolean).join(' '))}</td></tr></table><p class="v-nota">Envíanos la ficha técnica de tu expediente y te devolvemos el cuadro de cumplimiento, punto por punto, con el modelo ofertado.</p>`]);
  if(p.descripcion||p.resumen) pest.push(['Descripción', `<p>${vEsc(p.descripcion||p.resumen)}</p>${(p.usos||[]).length?`<ul class="v-puntos">${p.usos.map(u=>`<li>${vEsc(u)}</li>`).join('')}</ul>`:''}`]);
  if(specs) pest.push(['Especificaciones', `<table class="v-tabla">${specs}</table>`]);
  if((p.incluye||[]).length) pest.push(['Incluye', `<ul class="v-puntos">${p.incluye.map(u=>`<li>${vEsc(u)}</li>`).join('')}</ul>`]);
  const otros = vDeCat(p.cat).filter(x => x.id !== p.id).slice(0,3);
  const chips = [['Garantía',p.garantia]].filter(x=>x[1]);   // marca, modelo y origen ya van arriba (vMarcaModelo)
  const areas = (p.areas||[]).length ? `<div class="v-areas"><span>Se usa en</span>${p.areas.map(a=>`<i>${vEsc(a)}</i>`).join('')}</div>` : '';
  const texto = 'Hola Sinergia Biomédica, quiero cotizar: '+p.nom+(p.marca?' '+p.marca:'')+(p.modelo?' '+p.modelo:'');
  return `
  <div class="wrap" style="padding-top:18px">
    <button type="button" class="sb-atras" onclick="sbAtras()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
      Seguir viendo equipos</button>
    <div class="crumb"><a onclick="go('#/venta')">Venta</a> &nbsp;/&nbsp; ${c?`<a onclick="go('#/venta/cat/${c.id}')">${vEsc(c.nombre)}</a> &nbsp;/&nbsp; `:''}${vEsc(p.nom)}</div>
    <div class="v-prod">
      <div class="v-gal${fotos.length<2?' una':''}">
        ${fotos.length>1?`<div class="v-minis">${minis.map((m,i)=>`<button type="button" class="${i?'':'on'}" onclick="vVerFoto(${i})"><img src="${m}" alt="" loading="lazy"></button>`).join('')}</div>`:''}
        <div class="v-main${fotos.length?'':' sin'}">${fotos.length?`<img id="vFotoMain" src="${fotos[0]}" alt="${vEsc(p.nom)}" data-fotos='${vEsc(JSON.stringify(fotos))}'>`:vIco(p.cat,'v-ico-xl')}</div>
      </div>
      <div class="v-info">
        <div class="v-k">${vEsc(c?c.nombre:'')}</div>
        <h1>${vEsc(p.nom)}</h1>
        ${vMarcaModelo(p, true)}
        ${p.resumen?`<p class="v-resumen">${vEsc(p.resumen)}</p>`:''}
        ${p.precio||vStock(p)?`<div class="v-precio-caja">${p.precio?`<b>${vSoles(p.precio)}</b>`:''}${vStock(p,true)}<small>${p.precio?'Incluye IGV · '+vNotaPrecio(true):'Consulta precio y plazo de entrega'}</small></div>`:''}
        ${chips.length?`<div class="v-chips">${chips.map(x=>`<span>${x[0]} <b>${vEsc(x[1])}</b></span>`).join('')}</div>`:''}
        ${areas}
        <div class="v-btns">
          ${vBotonAdd(p, 'btn btn-fill btn-lg v-add', 'Agregar al carrito')}
          <a class="btn btn-lg" href="${vWA(texto)}" target="_blank" rel="noopener">Preguntar por WhatsApp</a>
        </div>
        ${p.ficha_pdf?`<a class="v-doc" href="${vEsc(p.ficha_pdf)}" target="_blank" rel="noopener"><span class="doc-ico">PDF</span><span><b>Ficha técnica</b><small>Ver o descargar</small></span></a>`:''}
      </div>
    </div>
    ${pest.length?`<div class="v-pest">
      <div class="v-tabs" role="tablist">${pest.map((t,i)=>`<button type="button" role="tab" class="${i?'':'on'}" onclick="vTab(this,${i})">${t[0]}</button>`).join('')}</div>
      ${pest.map((t,i)=>`<div class="v-panel-t" ${i?'hidden':''}>${t[1]}</div>`).join('')}
    </div>`:''}
    ${otros.length?`<section class="v-sec" style="padding-bottom:0"><div class="shead"><div><div class="k">Misma categoría</div><h2>También te puede interesar</h2></div></div><div class="grid">${otros.map(vCard).join('')}</div></section>`:''}
  </div>
  <section class="v-sec"></section>`;
}

function vVerFoto(i){
  const img = document.getElementById('vFotoMain'); if(!img) return;
  const f = JSON.parse(img.dataset.fotos||'[]'); if(f[i]) img.src = f[i];
  document.querySelectorAll('.v-minis button').forEach((b,j) => b.classList.toggle('on', j===i));
}
function vTab(btn, i){
  const caja = btn.closest('.v-pest');
  caja.querySelectorAll('.v-tabs button').forEach((b,j) => b.classList.toggle('on', j===i));
  caja.querySelectorAll('.v-panel-t').forEach((p,j) => p.hidden = (j!==i));
}

/* parte = ['cat','<id>'] | ['p','<id>'] | [] */
function renderVenta(parte){
  const el = document.getElementById('ventaBody'); if(!el) return;
  if(!VENTA){
    el.innerHTML = vHueso();
    cargarVenta().then(() => { if(location.hash.startsWith('#/venta')) renderVenta(parte); });
    return;
  }
  const tienda = parte[0]==='tienda' || parte[0]==='cat' || parte[0]==='precio';
  if(parte[0]==='p' && vPagina(parte[1])){ location.replace(vPagina(parte[1])); return; }   // enlaces viejos → página propia
  el.innerHTML = tienda ? vTienda(parte[0]==='cat' ? parte[1] : null, parte[0]==='precio' ? parte[1] : null) : parte[0]==='p' ? vProducto(parte[1]) : vPortada();
  if(tienda) vtPintar();
  vCarritoEngancha();
}

;
/* ===== js/13-cotizador.js ===== */
/* =====================================================================
   13-cotizador.js — Cotizador de alquiler (#/cotizar)

   Una página propia donde el cliente arma su alquiler: marca los
   instrumentos que necesita, elige la modalidad y ve el total con todo
   lo que acordamos aplicado:

     · medio día (un turno de 4 h) solo en los instrumentos de S/ 100 el
       día a más; en los económicos, desde un día completo;
     · descuento por combinar varios instrumentos;
     · instrumentista aparte, con mínimo de medio día, cuando algún
       instrumento lo lleva;
     · garantía en depósito (se devuelve) cuando el cliente recoge los
       instrumentos en oficina y va sin instrumentista;

   #/cotizar/<id> entra con ese instrumento ya marcado: es a donde llevan
   los botones «Calcular mi alquiler» de las páginas de cada equipo.
   ===================================================================== */
var COT = {sel: new Set(), mod: 'medio', qty: 1, sede: 'lima', ciudad: ''};
/* Fuera de Lima el instrumento viaja: sale, se usa y vuelve. Por eso el
   alquiler a provincia parte de varios días y no tiene medio día. */
const PROV_DIAS = 3;
/* Desde este número de días el alquiler se conversa directamente: a esa
   altura cambian el precio, la logística y la calibración. */
const COT_LARGO = 7;

const cotEsc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c =>
  ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));

/* Instrumentos que se pueden cotizar (las complementarias van incluidas). */
const cotLista = () => EQUIPOS.filter(e => !esComplemento(e) && e.dia > 0);

function cotMarcar(id, on){
  on ? COT.sel.add(id) : COT.sel.delete(id);
  cotPintar();
}
function cotCiudad(v){ COT.ciudad = v; cotPintar(); }
function cotSede(v){
  COT.sede = v;
  /* Si el instrumento viaja solo por agencia, el mínimo de días manda. */
  if(v === 'provincia' && COT.qty < PROV_DIAS && !cotCalcular().conTecnico) COT.qty = PROV_DIAS;
  cotPintar();
}
function cotMod(m){ COT.mod = m; cotPintar(); }
function cotCantidad(v){ COT.qty = Math.max(1, parseInt(v, 10) || 1); cotResumen(); }
function cotLimpiar(){ COT.sel.clear(); COT.qty = 1; COT.sede = 'lima'; COT.ciudad = ''; cotPintar(); }

/* ── Cálculo ──────────────────────────────────────────────────────────
   Una sola función con toda la cuenta, para que el resumen y el mensaje
   que se envía nunca puedan decir cosas distintas. */
function cotCalcular(){
  const sel = [...COT.sel].map(byId).filter(Boolean);
  const base = sel.reduce((s, e) => s + Number(e.dia || 0), 0);
  const desc = descuentoPor(sel.length);
  const dia = Math.round(base * (1 - desc));
  /* Medio día si al menos un instrumento lo tiene: los económicos, solos,
     van desde un día completo, pero acompañando a uno que ya sale en medio
     día el viaje ya está pagado, y el precio sale prorrateado del conjunto.
     Fuera de Lima no hay medio día: el instrumento viaja. */
  const prov = COT.sede === 'provincia';
  const hayMedio = !prov && sel.some(e => tieneMedio(e.dia));
  const mod = (COT.mod === 'medio' && !hayMedio) ? 'dia' : COT.mod;
  const unit = mod === 'medio' ? precioMedio(dia) : dia;
  /* Instrumentista: va si algún instrumento lo lleva. */
  const conTecnico = sel.some(e => !soloEquipo(e.id));
  /* En provincia, el instrumento que viaja solo por agencia está fuera
     varios días; si va el instrumentista, él lo lleva y lo trae en el
     mismo viaje (sale de noche y vuelve de noche), así que se cobran solo
     los días de trabajo. */
  const qty = (prov && !conTecnico) ? Math.max(PROV_DIAS, COT.qty) : COT.qty;
  const alquiler = unit * qty;
  const tunit = mod === 'medio' ? TEC_MIN : TEC_DIA;
  const tecnico = conTecnico ? Math.max(TEC_MIN, tunit * qty) : 0;
  /* Viaje del instrumentista a provincia: el pasaje de ida y vuelta se
     cobra una sola vez y depende de la ciudad; la comida, por cada día de
     trabajo, y el hospedaje por cada noche (un trabajo de un día no tiene
     noche: sale de noche y regresa de noche). */
  const viaja = prov && conTecnico;
  const ciudad = viaja ? ciudadDe(COT.ciudad) : null;
  const faltaCiudad = viaja && !ciudad;
  const noches = viaja ? Math.max(0, qty - 1) : 0;
  const pasaje = ciudad ? pasajeDe(ciudad.n) : 0;
  const comida = viaja ? VIAJE.viaticoDia * qty : 0;
  const hospedaje = VIAJE.hospedajeNoche * noches;
  const viatico = comida + hospedaje;
  /* Garantía: solo cuando los instrumentos se van sin instrumentista. Si
     viajan solos a provincia, también la dejan los que normalmente van
     acompañados. Con instrumentista no hay garantía: él los custodia. */
  const garantia = conTecnico ? 0
    : sel.reduce((s, e) => s + (garantiaDe(e.id) || (prov ? GARANTIA_PROV : 0)), 0);
  /* Lo único que ya no se cotiza solo: una semana o más. */
  const largo = mod === 'dia' && qty >= COT_LARGO;
  return {sel, base, desc, dia, mod, hayMedio, unit, qty, alquiler, conTecnico, tecnico, prov,
          viaja, ciudad, faltaCiudad, noches, pasaje, comida, hospedaje, viatico, garantia,
          total: alquiler + tecnico + pasaje + viatico, largo};
}

/* ── Ofertas: «por S/ X más, llévate también…» ─────────────────────────
   Al agregar un instrumento sube el descuento por combinar, así que lo que
   cuesta de más casi siempre es menos que su precio suelto. Se calcula de
   verdad: se simula el total con ese instrumento y se resta el actual. */
function cotSimular(id){
  const antes = COT.sel;
  COT.sel = new Set([...antes, id]);
  const c = cotCalcular();
  COT.sel = antes;
  return c;
}
function cotOfertas(c){
  if(!c.sel.length || c.largo || c.faltaCiudad) return [];
  const yaEstan = new Set(c.sel.map(e => e.id));
  /* Todos los instrumentos, los grandes primero y las herramientas de
     apoyo al final. Los que ya eligió se quedan en la lista, marcados:
     así ve de un vistazo lo que lleva y puede quitarlo. */
  return cotLista()
    .slice()
    .sort((a, b) => Number(b.dia || 0) - Number(a.dia || 0))
    .map(e => {
      /* Siempre el precio prorrateado del instrumento dentro del alquiler,
         con el descuento aplicado. Al agregarlo, el número no cambia: lo que
         cambia es que los demás bajan, que es justo lo que se quiere mostrar. */
      const on = yaEstan.has(e.id);
      const base = on ? c : cotSimular(e.id);
      const parte = base.base ? Number(e.dia || 0) * (base.unit / base.base) : 0;
      return {e: e, on: on, mas: parte * base.qty};
    });
}

/* ── Ofertas: «por S/ X más, llévate también…» ─────────────────────────
   Al agregar un instrumento sube el descuento por combinar, así que lo que
   cuesta de más casi siempre es menos que su precio suelto. Se calcula de
   verdad: se simula el total con ese instrumento y se resta el actual. */
function cotSimular(id){
  const antes = COT.sel;
  COT.sel = new Set([...antes, id]);
  const c = cotCalcular();
  COT.sel = antes;
  return c;
}
/* Lo mismo al revés: cuánto bajaría el total si lo quitara. Es lo que ese
   instrumento está aportando hoy al precio. */
function cotSimularSin(id){
  const antes = COT.sel;
  const s = new Set(antes); s.delete(id);
  COT.sel = s;
  const c = cotCalcular();
  COT.sel = antes;
  return c;
}
function cotOfertas(c){
  if(!c.sel.length || c.largo || c.faltaCiudad) return [];
  const yaEstan = new Set(c.sel.map(e => e.id));
  /* Todos los instrumentos, los grandes primero y las herramientas de
     apoyo al final. Los que ya eligió se quedan en la lista, marcados:
     así ve de un vistazo lo que lleva y puede quitarlo. */
  return cotLista()
    .slice()
    .sort((a, b) => Number(b.dia || 0) - Number(a.dia || 0))
    .map(e => {
      /* Siempre el precio prorrateado del instrumento dentro del alquiler,
         con el descuento aplicado. Al agregarlo, el número no cambia: lo que
         cambia es que los demás bajan, que es justo lo que se quiere mostrar. */
      const on = yaEstan.has(e.id);
      const base = on ? c : cotSimular(e.id);
      const parte = base.base ? Number(e.dia || 0) * (base.unit / base.base) : 0;
      return {e: e, on: on, mas: parte * base.qty};
    });
}

/* «1 medio día», «2 medios días», «3 días». */
const cotPlural = (u, q) => q === 1 ? u : (u === 'medio día' ? 'medios días' : u + 's');
/* El periodo, escrito como se habla: «medio día», no «1 medio día», que
   se lee como si fuera un día entero. */
function cotPeriodo(mod, qty){
  const u = COT_UNI[mod];
  return qty === 1 ? (mod === 'medio' ? u : '1 ' + u) : qty + ' ' + cotPlural(u, qty);
}

/* Solo medio día y día: de una semana en adelante se habla directamente. */
const COT_MOD = [['medio', 'Medio día'], ['dia', 'Por día']];
const COT_UNI = {medio: 'medio día', dia: 'día'};
const COT_CANT = {medio: 'Turnos de medio día', dia: 'Días'};

/* ── Página ─────────────────────────────────────────────────────────── */
/* Barra fija del celular: el total siempre a la vista. */
function cotBarra(c){
  const b = document.getElementById('cotBarra');
  if(!b) return;
  b.hidden = !c.sel.length;
  document.body.classList.toggle('cot-conbarra', !!c.sel.length);
  if(!c.sel.length){ b.innerHTML = ''; return; }
  const cuantos = c.sel.length + (c.sel.length === 1 ? ' instrumento' : ' instrumentos');
  b.innerHTML = c.faltaCiudad
    ? `<div><span>${cuantos} · provincia</span><b>Elige tu ciudad</b></div>
       <button class="btn btn-fill" onclick="cotIrCiudad()">Elegir</button>`
    : c.largo
    ? `<div><span>${c.qty} días</span><b>Conversémoslo</b></div>
       <button class="btn btn-fill" onclick="cotEnviar('whatsapp')">Escríbenos</button>`
    : `<div><span>${cuantos} · ${cotPeriodo(c.mod, c.qty)}</span>
         <b>S/ ${c.total.toFixed(2)}</b></div>
       <button class="btn" onclick="cotVista()">Ver</button>
       <button class="btn btn-fill" onclick="cotEnviar('whatsapp')">Enviar</button>`;
}

/* Paso 1: dónde se va a usar. Va arriba de los instrumentos, porque el
   lugar cambia las modalidades y el precio de todo lo que viene después. */
function cotSedePintar(){
  const caja = document.getElementById('cotSede');
  if(!caja) return;
  const c = cotCalcular();
  caja.innerHTML = `
    <div class="cot-seg">
      <button type="button" class="${c.prov ? '' : 'on'}" onclick="cotSede('lima')">Lima</button>
      <button type="button" class="${c.prov ? 'on' : ''}" onclick="cotSede('provincia')">Provincia</button>
    </div>
    ${c.prov && c.conTecnico ? `<label class="cot-f1">¿A qué ciudad?
      <select onchange="cotCiudad(this.value)">
        <option value="">Elige tu ciudad…</option>
        ${Object.keys(VIAJE_ZONAS).map(z => `<optgroup label="${VIAJE_ZONAS[z]}">
          ${CIUDADES.filter(x => String(x.z) === z).map(x =>
            `<option value="${cotEsc(x.n)}"${COT.ciudad === x.n ? ' selected' : ''}>${cotEsc(x.n)}</option>`).join('')}
        </optgroup>`).join('')}
      </select></label>` : ''}
    <p class="cot-ayuda">${!c.prov
      ? 'Retiro y devolución en nuestra oficina de Pueblo Libre, Lima.'
      : c.conTecnico
        ? `Viaja nuestro instrumentista con los instrumentos: sale de noche y regresa de noche, así que
           solo pagas los días de trabajo. Al total se le suman el pasaje de ida y vuelta (una sola vez,
           según la ciudad) y los viáticos: comida por día y hospedaje por noche, si se queda más de un
           día. Fuera de Lima no hay medio día.`
        : `Estos instrumentos no necesitan instrumentista: te los mandamos por Shalom (o la agencia que
           prefieras) y el envío de ida y vuelta lo contratas y lo pagas tú, directo con la agencia.
           Como están fuera varios días, el alquiler va desde ${PROV_DIAS} días y sin medio día.`}</p>`;
}

/* Lleva al desplegable de la ciudad, en el paso 1, y lo abre. */
function cotIrCiudad(){
  const sel = document.querySelector('#cotSede select');
  if(!sel) return;
  sel.scrollIntoView({behavior: 'smooth', block: 'center'});
  setTimeout(() => sel.focus(), 400);
}

function cotPintar(){
  cotSedePintar();
  const lista = document.getElementById('cotEq');
  if(!lista) return;
  const grupos = [['ansim', 'Analizadores y simuladores'], ['med', 'Instrumentos de medición'],
                  ['elec', 'Medidores eléctricos'], ['apoyo', 'Otros']];
  const eq = cotLista();
  const hechos = new Set();
  let html = '';
  grupos.forEach(([g, label]) => {
    const items = eq.filter(e => e.g === g);
    items.forEach(e => hechos.add(e.id));
    if(!items.length) return;
    html += `<div class="cot-g"><div class="cot-gh">${label}</div>` + items.map(cotFila).join('') + '</div>';
  });
  const resto = eq.filter(e => !hechos.has(e.id));
  if(resto.length) html += `<div class="cot-g"><div class="cot-gh">Otros</div>${resto.map(cotFila).join('')}</div>`;
  lista.innerHTML = html;
  const esc = document.getElementById('cotEsc');
  if(esc){
    const n = COT.sel.size, tramos = Object.keys(DESC_COMB).map(Number).sort((a, b) => a - b);
    esc.innerHTML = tramos.map(t =>
      `<span class="${n >= t ? 'on' : ''}">${t}${t === tramos[tramos.length - 1] ? ' o más' : ''}
        instrumento${t > 1 ? 's' : ''} · −${Math.round(DESC_COMB[t] * 100)} %</span>`).join('');
  }
  cotResumen();
}

function cotFila(e){
  const marcado = COT.sel.has(e.id);
  const solo = soloEquipo(e.id);
  /* Se dice de frente si el instrumentista va o no: es lo que más cambia el
     precio y antes había que deducirlo. */
  const et = solo
    ? `<i class="solo">Lo recoges tú · sin instrumentista · garantía S/ ${fmt(garantiaDe(e.id))}</i>`
    : `<i class="tec">Va con instrumentista (se cobra aparte)</i>`;
  const foto = (typeof fotoURL === 'function' && (e.photo || (e.fotos || [])[0]))
    ? `<img class="cot-f" src="${fotoURL(e.photo || e.fotos[0], 160, true)}" alt="" loading="lazy" decoding="async">`
    : `<span class="cot-f sin"></span>`;
  const desde = tieneMedio(e.dia) ? `S/ ${fmt(precioMedio(e.dia))}<small>medio día</small>`
                                  : `S/ ${fmt(e.dia)}<small>día</small>`;
  return `<label class="cot-i${marcado ? ' on' : ''}">
    <input type="checkbox" ${marcado ? 'checked' : ''} onchange="cotMarcar('${e.id}',this.checked)">
    ${foto}
    <span class="cot-n"><b>${cotEsc(e.nom)}</b><small>${cotEsc(e.marca || '')}</small>${et}</span>
    <span class="cot-p">${desde}</span>
  </label>`;
}

function cotResumen(){
  const caja = document.getElementById('cotRes');
  if(!caja) return;
  const c = cotCalcular();
  const n = c.sel.length;
  cotBarra(c);
  document.getElementById('cotCuenta').textContent =
    n ? (n + (n === 1 ? ' instrumento elegido' : ' instrumentos elegidos')) : '';
  if(!n){
    caja.innerHTML = `<div class="cot-top vacio"><span>Tu cotización</span><b>— —</b></div>
      <p class="cot-vacio">Marca al menos un instrumento de la lista. Aquí aparece el total
      y, con un clic, nos mandas tu pedido por WhatsApp.</p>`;
    return;
  }
  const sinMedio = c.sel.filter(e => !tieneMedio(e.dia));
  const mods = COT_MOD.filter(([m]) => m !== 'medio' || c.hayMedio);
  const seg = mods.map(([m, t]) =>
    `<button type="button" class="${c.mod === m ? 'on' : ''}" onclick="cotMod('${m}')">${t}</button>`).join('');
  const cant = `<label class="cot-f1">${COT_CANT[c.mod]}<input type="number" min="1" step="1" value="${c.qty}"
      oninput="cotCantidad(this.value)" onchange="cotCantidad(this.value)"></label>`;
  const u = COT_UNI[c.mod];
  /* Lo primero que se ve: el total y los dos botones. El detalle queda
     debajo, para quien quiera revisarlo. */
  /* Lo primero que se ve: el total y los botones. Y si pide una semana o
     más, en vez del total va la invitación a conversarlo. */
  const arriba = c.faltaCiudad
    ? `<div class="cot-top largo">
         <span>Provincia · con instrumentista</span>
         <b>Elige tu ciudad</b>
         <small>El pasaje del instrumentista cambia con la distancia, así que el total se calcula
           recién cuando nos dices a qué ciudad va.</small>
       </div>`
    : c.largo
    ? `<div class="cot-top largo">
         <span>${c.qty} días · una semana o más</span>
         <b>Conversémoslo</b>
         <small>A partir de ${COT_LARGO} días el precio se arma caso por caso: cambian la
           logística, la calibración y la disponibilidad. Te respondemos el mismo día.</small>
         <div class="cot-acc">
           <button class="btn btn-fill" onclick="cotEnviar('whatsapp')">Escríbenos por WhatsApp</button>
         </div>
       </div>`
    : `<div class="cot-top">
         <span>Tu cotización · ${cotPeriodo(c.mod, c.qty)}${c.prov ? ' · provincia' : ''}</span>
         <b>S/ ${c.total.toFixed(2)}</b>
         <small>IGV incluido${c.garantia ? ' · + S/ ' + fmt(c.garantia) + ' de garantía que se devuelve' : ''}</small>
         <div class="cot-acc">
           <button class="btn btn-fill" onclick="cotEnviar('whatsapp')">Enviar mi pedido por WhatsApp</button>
           <button class="btn" onclick="cotVista()">Ver el resumen</button>
         </div>
       </div>`;
  caja.innerHTML = `
    ${arriba}

    <div class="cot-paso"><b>3</b> ¿Por cuánto tiempo?</div>
    <div class="cot-seg">${seg}</div>
    ${c.mod === 'medio'
      ? `<p class="cot-ayuda">Un turno de 4 h: ${HORARIO_MANANA} o ${HORARIO_TARDE}.${
          sinMedio.length ? ' ' + (sinMedio.length === 1
            ? 'El ' + cotEsc(sinMedio[0].nom.toLowerCase()) + ', solo, va desde un día completo'
            : 'Los instrumentos económicos, solos, van desde un día completo') +
            '; acompañando a los demás entra en el medio día y el precio sale prorrateado.' : ''}</p>`
      : (c.hayMedio ? '' : c.prov ? '' : `<p class="cot-ayuda">No hay medio día porque ${c.sel.length === 1
            ? 'el ' + cotEsc(c.sel[0].nom.toLowerCase()) + ' se alquila' : 'todos los elegidos se alquilan'
          } desde un día completo. Si agregas uno de los grandes, entran todos en medio día.</p>`)}
    ${cant}
    ${(c.largo || c.mod !== 'dia') ? '' : `<p class="cot-ayuda">¿Lo necesitas una semana o más? Ese caso lo vemos
      directamente: pon los días y te aparece cómo escribirnos.</p>`}

    ${cotOfertasHTML(c)}

    <div class="cot-paso"><b>5</b> El detalle</div>
    <ul class="cot-sel">${c.sel.map(e =>
      `<li><span>${cotEsc(e.nom)}</span><span>S/ ${fmt(e.dia)}</span></li>`).join('')}
      ${c.desc ? `<li class="des"><span>Descuento por combinar ${n} (${Math.round(c.desc * 100)} %)</span><span>− S/ ${fmt(Math.round(c.base * c.desc))}</span></li>` : ''}
    </ul>
    ${c.largo ? `<p class="cot-aviso"><b>No ponemos precio a ${c.qty} días en automático.</b>
      Para una semana o más lo vemos contigo: escríbenos y te pasamos el precio del plazo completo.</p>`
    : `<div class="cot-cuenta">
      <div><span>Precio por ${u}</span><span>S/ ${fmt(c.unit)}</span></div>
      <div><span>× ${cotPeriodo(c.mod, c.qty)}</span><span>S/ ${c.alquiler.toFixed(2)}</span></div>
      ${c.conTecnico ? `<div><span>Instrumentista metrológico (mínimo medio día)</span><span>S/ ${c.tecnico.toFixed(2)}</span></div>` : ''}
      ${c.viaja && c.ciudad ? `<div><span>Pasajes ida y vuelta a ${cotEsc(c.ciudad.n)} (una sola vez)</span><span>S/ ${c.pasaje.toFixed(2)}</span></div>
        <div><span>Viáticos · comida S/ ${fmt(VIAJE.viaticoDia)} × ${c.qty}${c.noches
          ? ' · hospedaje S/ ' + fmt(VIAJE.hospedajeNoche) + ' × ' + c.noches + (c.noches === 1 ? ' noche' : ' noches') : ''}</span><span>S/ ${c.viatico.toFixed(2)}</span></div>` : ''}
      <div class="sub"><span>Subtotal (S/)</span><span>${(c.total / 1.18).toFixed(2)}</span></div>
      <div class="sub"><span>IGV (18 %) (S/)</span><span>${(c.total / 1.18 * 0.18).toFixed(2)}</span></div>
      <div class="gran"><span>Total con IGV (S/)</span><span>${c.total.toFixed(2)}</span></div>
    </div>`}
    ${c.faltaCiudad ? `<p class="cot-aviso"><b>Elige tu ciudad para ver el total.</b>
      El pasaje del instrumentista cambia con la distancia, así que el precio se calcula recién
      cuando nos dices a qué ciudad va.</p>` : ''}
    ${c.viaja && c.ciudad ? `<p class="cot-aviso"><b>El viaje ya está incluido en el total.</b>
      Pasaje de ida y vuelta a ${cotEsc(c.ciudad.n)}: S/ ${fmt(c.pasaje)}, una sola vez.
      Viáticos: comida S/ ${fmt(VIAJE.viaticoDia)} por día${c.noches
        ? ' y hospedaje S/ ' + fmt(VIAJE.hospedajeNoche) + ' por noche (' + c.noches + ')'
        : '; con un solo día no hay hospedaje'}.
      ${c.ciudad.z === 4 ? 'El pasaje de avión es referencial: se confirma con el vuelo del día.'
        : 'Es un estimado de referencia; se confirma al emitir la cotización.'}</p>` : ''}
    ${c.garantia ? `<p class="cot-aviso"><b>Además dejas S/ ${fmt(c.garantia)} de garantía.</b>
      No es un cobro: se te devuelve cuando regreses el equipo. Lo recoges en nuestra oficina con tu DNI.</p>` : ''}

    <div class="cot-paso"><b>6</b> Tus datos</div>
    <div class="cot-form" id="cotForm">
      <label>Nombre o institución<input id="cotNom" type="text" autocomplete="organization" placeholder="Clínica, hospital o nombre"></label>
      <div class="cot-f2">
        <label>Correo<input id="cotMail" type="email" autocomplete="email" inputmode="email" placeholder="correo@ejemplo.com"></label>
        <label>Teléfono<input id="cotTel" type="tel" autocomplete="tel" inputmode="tel" placeholder="999 999 999"></label>
      </div>
      <div class="form-msg" id="cotAviso" role="status" aria-live="polite"></div>
      <p class="cot-mail">Con tus datos listos, toca «Enviar mi pedido por WhatsApp».
        ${c.largo ? '' : `¿Prefieres correo? <button type="button" onclick="cotEnviar('correo')">Enviar por correo</button>`}</p>
    </div>
    <p class="cot-nota">${c.prov
      ? 'El envío por agencia, de ida y vuelta, lo contrata y lo paga el cliente. El plazo se cuenta desde el despacho en Lima hasta el retorno a nuestra oficina.'
      : 'Entrega y devolución en nuestra oficina de Pueblo Libre, Lima, presentando documento de identidad.'}</p>
    <button type="button" class="cot-limpiar" onclick="cotLimpiar()">Empezar de nuevo</button>`;
  cotRestaurar();
}

/* Las ofertas, pintadas: el precio normal tachado y lo que cuesta sumarlo
   al pedido que ya tiene. */
function cotOfertasHTML(c){
  const of = cotOfertas(c);
  if(!of.length) return '';
  const u = COT_UNI[c.mod];
  return `<div class="cot-paso"><b>4</b> Agrega por un poco más</div>
  <div class="cot-of">
    <p class="cot-ofs">Lo que costaría cada uno dentro de tu alquiler, por ${u}, al lado de su
      precio suelto. Toca para agregarlo o quitarlo; los que ya llevas salen con su check.</p>
    ${of.map(o => {
      const solo = c.mod === 'medio' ? precioMedio(o.e.dia) : o.e.dia;
      const porUnidad = Math.round(o.mas / c.qty);
      if(o.on) return `<button type="button" class="cot-ofi on" onclick="cotMarcar('${o.e.id}',false)">
        <span class="n">${cotEsc(o.e.nom)}</span>
        <span class="p"><b>S/ ${fmt(porUnidad)}</b>${porUnidad < solo ? ` <s>${fmt(solo)}</s>` : ''}</span>
        <span class="mas" aria-hidden="true">✓</span>
      </button>`;
      return `<button type="button" class="cot-ofi" onclick="cotMarcar('${o.e.id}',true)">
        <span class="n">${cotEsc(o.e.nom)}</span>
        <span class="p"><b>S/ ${fmt(porUnidad)}</b>${porUnidad < solo ? ` <s>${fmt(solo)}</s>` : ''}</span>
        <span class="mas" aria-hidden="true">+</span>
      </button>`;
    }).join('')}
    <p class="cot-ofn">Al sumar instrumentos baja el precio del día de todos: por eso cada uno
      cuesta menos que si lo alquilaras solo.</p>
  </div>`;
}

/* El resumen se repinta entero en cada cambio; sin esto, lo que el cliente
   ya escribió en el formulario se borraría al marcar otro instrumento. */
var COT_DATOS = {nom: '', mail: '', tel: ''};
function cotRestaurar(){
  [['cotNom', 'nom'], ['cotMail', 'mail'], ['cotTel', 'tel']].forEach(([id, k]) => {
    const el = document.getElementById(id);
    if(!el) return;
    el.value = COT_DATOS[k] || '';
    el.oninput = () => { COT_DATOS[k] = el.value; };
  });
}

/* Mensaje de la solicitud: numerado y con el detalle de cada instrumento,
   para que se pueda pasar tal cual a la cotización formal. */
function cotTexto(c, nom, mail, tel){
  const u = COT_UNI[c.mod], per = cotPeriodo(c.mod, c.qty);
  const L = [];
  L.push((!c.largo ? 'SOLICITUD DE ALQUILER — '
          : (c.prov && c.conTecnico) ? 'ALQUILER EN PROVINCIA CON INSTRUMENTISTA — '
          : 'ALQUILER POR UNA SEMANA O MÁS — ') +
    ((typeof SITE !== 'undefined' && SITE.nombre) || 'Sinergia Biomédica'));
  L.push('N.º ' + cotNumero() + ' · ' + new Date().toLocaleDateString('es-PE'));
  L.push('');
  L.push('CLIENTE');
  L.push('  Nombre: ' + (nom || '—'));
  if(mail) L.push('  Correo: ' + mail);
  if(tel)  L.push('  Teléfono: ' + tel);
  L.push('');
  L.push('DÓNDE: ' + (!c.prov ? 'Lima'
    : c.ciudad ? ('Provincia · ' + c.ciudad.n + ' (viaja el instrumentista)')
    : 'Provincia (envío por agencia, a cargo del cliente)'));
  L.push('PERIODO: ' + per + (c.mod === 'medio' ? ' (turno de 4 h)' : ''));
  L.push('');
  L.push('INSTRUMENTOS');
  c.sel.forEach((e, i) => {
    L.push((i + 1) + '. ' + e.nom);
    L.push('   ' + (e.marca || '') + ' · S/ ' + fmt(e.dia) + ' por día');
  });
  L.push('');
  if(c.largo){
    L.push((c.prov && c.conTecnico)
      ? 'Es fuera de Lima y necesito al instrumentista, así que les pido su precio para mi ciudad.'
      : 'Son ' + c.qty + ' días, así que les pido su mejor precio para este plazo.');
    L.push('');
    L.push(c.prov ? 'Envío por agencia a provincia, de ida y vuelta, a cargo del cliente.'
                : 'Entrega y devolución en oficina (Pueblo Libre, Lima).');
    return L.join('\n');
  }
  L.push('CUENTA');
  if(c.desc) L.push('  Suma por día: S/ ' + fmt(c.base));
  if(c.desc) L.push('  Descuento por combinar ' + c.sel.length + ': −' + Math.round(c.desc * 100) + ' % (S/ ' + fmt(Math.round(c.base * c.desc)) + ')');
  L.push('  Precio por ' + u + ': S/ ' + fmt(c.unit));
  L.push('  Alquiler (' + per + '): S/ ' + c.alquiler.toFixed(2));
  if(c.conTecnico) L.push('  Instrumentista metrológico: S/ ' + c.tecnico.toFixed(2));
  if(c.viaja && c.ciudad){
    L.push('  Pasajes ida y vuelta a ' + c.ciudad.n + ' (una sola vez): S/ ' + c.pasaje.toFixed(2));
    L.push('  Viáticos (comida y hospedaje): S/ ' + c.viatico.toFixed(2));
    L.push('    comida S/ ' + fmt(VIAJE.viaticoDia) + ' × ' + c.qty + (c.noches
      ? ' · hospedaje S/ ' + fmt(VIAJE.hospedajeNoche) + ' × ' + c.noches : ''));
  }
  L.push('  TOTAL (IGV incluido): S/ ' + c.total.toFixed(2));
  if(c.garantia) L.push('  Garantía en depósito (se devuelve): S/ ' + fmt(c.garantia));

  L.push('');
  L.push(c.prov ? 'Envío por agencia a provincia, de ida y vuelta, a cargo del cliente.'
                : 'Entrega y devolución en oficina (Pueblo Libre, Lima).');
  return L.join('\n');
}

/* Número correlativo visible, para que el cliente y nosotros hablemos del
   mismo documento: COT-AAMMDD-HHMM. */
/* Número de SOLICITUD, no de cotización: el correlativo COT-SB-MMAA-NN lo
   lleva la empresa a mano y se pone al emitir. Así no chocan. */
function cotNumero(){
  const d = new Date(), p = n => String(n).padStart(2, '0');
  return 'SOL-' + String(d.getFullYear()).slice(2) + p(d.getMonth() + 1) + p(d.getDate())
         + '-' + p(d.getHours()) + p(d.getMinutes());
}

function cotDatos(){
  const v = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  return {nom: v('cotNom') || COT_DATOS.nom, mail: v('cotMail') || COT_DATOS.mail, tel: v('cotTel') || COT_DATOS.tel};
}

function cotEnviar(via){
  const c = cotCalcular();
  if(!c.sel.length) return;
  const {nom, mail, tel} = cotDatos();
  const doc = cotDoc(c, nom, mail, tel, cotNumero());
  const error = (typeof validarContacto === 'function') ? validarContacto(nom, mail, tel) : '';
  if(error){
    const f = document.getElementById('cotForm');
    if(f) f.scrollIntoView({behavior: 'smooth', block: 'center'});
    avisar('cotAviso', error, 'err');
    const el = document.getElementById('cotNom'); if(el && !nom) setTimeout(() => el.focus(), 350);
    return;
  }
  /* Una semana o más: va el pedido sin precio, para conversarlo. */
  const texto = c.largo
    ? cotTexto(c, nom, mail, tel)
    : cotTexto(c, nom, mail, tel) + '\n\nResumen de este pedido:\n' + cotEnlace(doc);
  if(typeof enviarAlEndpoint === 'function')
    enviarAlEndpoint({tipo: 'cotizador', equipo: c.sel.map(e => e.nom).join(' + '), modalidad: c.mod,
                      total: 'S/ ' + c.total.toFixed(2), nombre: nom, correo: mail, telefono: tel});
  avisar('cotAviso', c.largo
    ? (via === 'correo' ? 'Abriendo tu correo con tu pedido…' : 'Abriendo WhatsApp con tu pedido…')
    : (via === 'correo' ? 'Abriendo tu correo con el resumen de tu pedido…'
                        : 'Abriendo WhatsApp con el resumen de tu pedido…'), 'ok');
  /* Solo viaja el enlace: el cliente no se descarga ningún documento. El
     único PDF es la cotización formal que emite la empresa. */
  abrirCanal(via, texto, !c.largo ? 'Solicitud de alquiler'
    : (c.prov && c.conTecnico) ? 'Alquiler en provincia con instrumentista'
    : 'Alquiler por una semana o más');
}

/* ── Cotización formal ───────────────────────────────────────────────
   Mismo formato que las cotizaciones que ya emite la empresa (el modelo
   de COTIZADOR_SALCEDO): cabecera con número y fecha, bloque de datos,
   saludo, CUADRO N° 1, subtotal/IGV/total, monto en letras, condiciones
   comerciales y datos generales. Se arma en una ventana y se manda a
   imprimir: el navegador ofrece «Guardar como PDF». */

/* Monto en letras, como lo pide el formato: SON: ... CON xx/100 SOLES. */
const COT_UNI_L = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ',
  'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
const COT_DEC_L = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const COT_CEN_L = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS',
  'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
function cotLetras(n){
  n = Math.floor(n);
  if(n === 0) return 'CERO';
  if(n === 100) return 'CIEN';
  if(n < 20) return COT_UNI_L[n];
  if(n < 100){
    const d = Math.floor(n / 10), u = n % 10;
    if(d === 2) return u ? 'VEINTI' + COT_UNI_L[u].toLowerCase().toUpperCase() : 'VEINTE';
    return COT_DEC_L[d] + (u ? ' Y ' + COT_UNI_L[u] : '');
  }
  if(n < 1000){
    const c = Math.floor(n / 100), r = n % 100;
    return COT_CEN_L[c] + (r ? ' ' + cotLetras(r) : '');
  }
  if(n < 1000000){
    const m = Math.floor(n / 1000), r = n % 1000;
    return (m === 1 ? 'MIL' : cotLetras(m) + ' MIL') + (r ? ' ' + cotLetras(r) : '');
  }
  const m = Math.floor(n / 1000000), r = n % 1000000;
  return (m === 1 ? 'UN MILLON' : cotLetras(m) + ' MILLONES') + (r ? ' ' + cotLetras(r) : '');
}
function cotMontoLetras(v){
  const ent = Math.floor(v + 1e-9), cts = Math.round((v - ent) * 100);
  return 'SON: ' + cotLetras(ent) + ' CON ' + String(cts).padStart(2, '0') + '/100 SOLES';
}

/* Las condiciones comerciales del alquiler, en el mismo formato de pares
   etiqueta : texto que usa la cotización de la empresa. */
/* El logo va incrustado en la hoja: se abre en una ventana aparte, que no
   puede pedir archivos del sitio. */
const COT_LOGO = `<svg xmlns="http://www.w3.org/2000/svg" class="logo" viewBox="0 0 880 240" role="img" aria-label="Sinergia Biomédica">  <text x="40" y="208" font-weight="700" font-size="212" textLength="252" lengthAdjust="spacingAndGlyphs"><tspan fill="#9A7F4E">S</tspan><tspan fill="#2A2D33">B</tspan></text>  <text x="342" y="158" font-weight="700" font-size="100" fill="#17191D" textLength="498" lengthAdjust="spacingAndGlyphs">SINERGIA</text>  <text x="342" y="212" font-weight="600" font-size="52" fill="#2A2D33" textLength="498" lengthAdjust="spacingAndGlyphs">BIOMÉDICA</text>  <rect x="342" y="228" width="498" height="3" fill="#9A7F4E"/></svg>`;

/* Documento congelado: lleva todo lo que necesita la cotización, para que
   el enlace que se comparte siga valiendo aunque mañana cambien las tarifas. */
function cotDoc(c, nom, mail, tel, numero){
  return {
    num: numero, fecha: new Date().toLocaleDateString('es-PE'),
    nom: nom, mail: mail, tel: tel,
    mod: c.mod, qty: c.qty, prov: !!c.prov,
    items: c.sel.map(e => ({n: e.nom, m: e.marca || '', d: e.dia, f: cotFotoAbs(e)})),
    base: c.base, desc: c.desc, unit: c.unit, alquiler: c.alquiler,
    tec: c.tecnico, pas: c.pasaje, via: c.viatico, noc: c.noches,
    ciu: c.ciudad ? c.ciudad.n : '', gar: c.garantia, total: c.total,
    inc: []
  };
}

/* Foto del equipo, en dirección absoluta: la hoja se abre en una ventana
   nueva, donde las rutas relativas no resuelven. */
function cotFotoAbs(e){
  const u = (typeof fotoURL === 'function') ? fotoURL(e.photo || (e.fotos || [])[0] || '', 160, true) : '';
  if(!u) return '';
  if(/^https?:/.test(u)) return u;
  return location.origin + '/' + String(u).replace(/^\//, '');
}

/* El documento viaja dentro del enlace, en base64 seguro para URL. */
function cotCodificar(doc){
  try{
    return btoa(unescape(encodeURIComponent(JSON.stringify(doc))))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }catch(e){ return ''; }
}
function cotDecodificar(txt){
  try{
    const b = txt.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(escape(atob(b))));
  }catch(e){ return null; }
}
function cotEnlace(doc, ruta){
  const base = location.origin + location.pathname;
  return base + '#/' + (ruta || 'resumen') + '/' + cotCodificar(doc);
}

/* Términos y condiciones, numerados como en las cotizaciones de la empresa. */
function cotTerminos(c){
  const u = COT_UNI[c.mod], per = cotPeriodo(c.mod, c.qty);
  const conTec = !!c.tec, gar = c.gar || 0;
  const T = [];
  T.push(['1. Precio de la oferta.', 'Importes en Soles (S/), con IGV incluido. Comprenden el alquiler ' +
    'de los instrumentos por ' + per +
    (conTec ? ' y el servicio de instrumentista metrológico.' : '.')]);
  T.push(['2. Vigencia de la oferta.', 'Quince (15) días calendario contados desde la emisión de esta cotización.']);
  T.push(['3. Calibración.', 'Todos los instrumentos se entregan con su certificado de calibración vigente, emitido por laboratorio acreditado, y se devuelven con el mismo certificado.']);
  T.push(['4. Modalidad y horario.', c.mod === 'medio'
    ? ('Medio día corresponde a un turno de cuatro (4) horas: ' + HORARIO_MANANA + ' o ' + HORARIO_TARDE + '.')
    : ('El día completo comprende los dos turnos: ' + HORARIO_MANANA + ' y ' + HORARIO_TARDE + '.')]);
  T.push(['5. Entrega y devolución.', !c.prov
    ? 'En nuestra oficina de Lima, en el horario indicado.'
    : conTec
      ? ('El instrumentista metrológico traslada los instrumentos a ' + (c.ciu || 'la ciudad del cliente') +
         '. Los días de viaje no se facturan: se cobran únicamente los días de trabajo en sitio. El pasaje ' +
         'de ida y vuelta se cobra una sola vez y los viáticos comprenden la alimentación por día' +
         (c.noc ? ' y el hospedaje por ' + c.noc + (c.noc === 1 ? ' noche' : ' noches') : '') +
         ', ambos detallados en el Cuadro N° 1. El importe del pasaje corresponde a la ciudad indicada; ' +
         'una ciudad distinta lo modifica.')
      : ('El envío se realiza por agencia de transporte (Shalom u otra), de ida y vuelta, contratado y pagado por el cliente. ' +
         'El plazo del alquiler se cuenta desde el despacho en Lima hasta el retorno a nuestra oficina, con un mínimo de ' +
         PROV_DIAS + ' días. Los instrumentos viajan en su maleta original y el cliente responde por el embalaje de retorno.')]);
  if(conTec) T.push(['6. Instrumentista metrológico.',
    'Se factura aparte, con un mínimo de medio día. Comprende el manejo del instrumento y el registro de las mediciones. No incluye la emisión de informes ni la ejecución de mantenimientos.']);
  else T.push(['6. Garantía en depósito.',
    'S/ ' + fmt(gar) + ' al retiro de los instrumentos, contra presentación del documento de identidad. No constituye un cobro: se devuelve íntegramente al retornar los instrumentos en buen estado y dentro del plazo.']);
  T.push(['7. Responsabilidad del cliente.',
    'La pérdida o el daño de un instrumento durante el alquiler obliga a su reposición, así como a la recalibración cuando el equipo se devuelva fuera de rango.']);
  T.push(['8. Forma de pago.',
    'Íntegro a la entrega de los instrumentos, salvo acuerdo distinto por escrito.']);
  T.push(['9. Ampliación del plazo.',
    'La extensión del alquiler se cotiza por separado antes de ejecutarse y se factura a la tarifa vigente.']);
  return T;
}

/* Dos documentos distintos a partir de los mismos datos:
     · formal = false → RESUMEN para el cliente: precios y detalle, pero sin
       membrete, sin firma y sin número de cotización. Es referencial.
     · formal = true  → COTIZACIÓN de la empresa, con membrete, firma, número
       propio y los ajustes que haya hecho quien la emite.
   El cliente nunca genera la segunda: eso lo decide la empresa. */
function cotHTML(d, formal){
  const S = (typeof SITE !== 'undefined') ? SITE : {};
  const venta = d.tipo === 'venta';
  const u = COT_UNI[d.mod] || 'día', per = venta ? '' : cotPeriodo(d.mod, d.qty);
  const und = (d.mod === 'medio' ? 'MEDIO DÍA' : u.toUpperCase());
  const org = location.origin;
  const neto = d.total / 1.18, igv = d.total - neto;
  /* Precio unitario prorrateado sobre el total: la suma del cuadro cuadra
     exactamente con el total que vio el cliente. */
  const factor = d.base ? d.unit / d.base : 0;
  /* Venta: cada equipo con su cantidad y su precio unitario. */
  const filasVenta = () => d.items.map((e, i) => {
    const pu = e.pu / 1.18, pt = e.t / 1.18;
    const inf = (typeof vcInfoDe === 'function') ? vcInfoDe(e)
      : {nom: e.n || e.i || 'Equipo', mm: e.m || '', nts: e.nts || '', foto: e.f || ''};
    return `<tr>
      <td class="c">${i + 1}</td>
      <td><b>${cotEsc(inf.nom.toUpperCase())}</b>
        ${inf.foto ? `<img class="mini" src="${cotEsc(inf.foto)}" alt="">` : ''}
        <span class="det">${cotEsc(inf.mm || '—')}${inf.nts ? '<br>Código NTS ' + cotEsc(inf.nts) + ' (NTS 113-MINSA)' : ''}
        <br>Equipo nuevo, con garantía del fabricante.</span></td>
      <td class="c">UNIDAD</td><td class="c">${Number(e.q).toFixed(2)}</td>
      <td class="d">${pu.toFixed(2)}</td><td class="d">${pt.toFixed(2)}</td></tr>`;
  }).join('');
  const filasAlq = () => d.items.map((e, i) => {
    const pu = e.d * factor / 1.18, pt = pu * d.qty, pr = (e.m || '').split('·');
    return `<tr>
      <td class="c">${i + 1}</td>
      <td><b>${cotEsc(e.n.toUpperCase())}</b>
        ${e.f ? `<img class="mini" src="${cotEsc(e.f)}" alt="">` : ''}
        <span class="det">Marca: ${cotEsc((pr[0] || '—').trim())}<br>
        Procedencia: ${cotEsc((pr[1] || '—').trim())}<br>
        Con certificado de calibración vigente.</span></td>
      <td class="c">${und}</td><td class="c">${d.qty}.00</td>
      <td class="d">${pu.toFixed(2)}</td><td class="d">${pt.toFixed(2)}</td></tr>`;
  }).join('') + (d.tec ? `<tr>
      <td class="c">${d.items.length + 1}</td>
      <td><b>INSTRUMENTISTA METROLÓGICO</b>
        <span class="det">Manejo del instrumento y registro de las mediciones.<br>Mínimo de medio día.</span></td>
      <td class="c">${und}</td><td class="c">${d.qty}.00</td>
      <td class="d">${(d.tec / d.qty / 1.18).toFixed(2)}</td><td class="d">${(d.tec / 1.18).toFixed(2)}</td></tr>` : '')
    + (d.pas ? `<tr>
      <td class="c">${d.items.length + 2}</td>
      <td><b>PASAJES IDA Y VUELTA${d.ciu ? ' · ' + cotEsc(d.ciu.toUpperCase()) : ''}</b>
        <span class="det">Traslado del instrumentista y de los instrumentos a la ciudad del cliente.<br>Se cobra una sola vez.</span></td>
      <td class="c">SERVICIO</td><td class="c">1.00</td>
      <td class="d">${(d.pas / 1.18).toFixed(2)}</td><td class="d">${(d.pas / 1.18).toFixed(2)}</td></tr>` : '')
    + (d.via ? `<tr>
      <td class="c">${d.items.length + 3}</td>
      <td><b>VIÁTICOS DEL INSTRUMENTISTA</b>
        <span class="det">Alimentación por cada día de trabajo en sitio${d.noc
          ? ' y hospedaje por ' + d.noc + (d.noc === 1 ? ' noche' : ' noches') : ''}.</span></td>
      <td class="c">GLOBAL</td><td class="c">1.00</td>
      <td class="d">${(d.via / 1.18).toFixed(2)}</td><td class="d">${(d.via / 1.18).toFixed(2)}</td></tr>` : '');
  const filas = venta ? filasVenta() : filasAlq();
  const cuadro = `<table>
      <tr><th style="width:34px">ÍTEM</th><th>DESCRIPCIÓN</th><th style="width:66px">UND</th>
        <th style="width:48px">CANT.</th><th style="width:70px">P. UNIT. S/</th><th style="width:74px">P. TOTAL S/</th></tr>
      ${filas}
      <tr class="tot"><td class="k" colspan="5">SUBTOTAL (S/)</td><td class="d">${neto.toFixed(2)}</td></tr>
      <tr class="tot"><td class="k" colspan="5">IGV (18%) (S/)</td><td class="d">${igv.toFixed(2)}</td></tr>
      <tr class="gran"><td class="k" colspan="5">TOTAL CON IGV (S/)</td><td class="d">${d.total.toFixed(2)}</td></tr>
    </table>`;
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
                 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];
  const hoy = new Date();
  const fechaLarga = 'Lima, ' + String(hoy.getDate()).padStart(2, '0') + ' de ' +
    meses[hoy.getMonth()] + ' de ' + hoy.getFullYear();

  /* Estilos comunes a los dos documentos. */
  const base = `
    @page{size:A4 portrait;margin:14mm 16mm 16mm}
    /* Sin esto, el navegador del celular imprime el PDF sin los fondos de
       color: la fila del total salía en blanco con el texto blanco. */
    *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    body{margin:0;background:#fff;color:#1a1a1a;font:11px/1.5 "Segoe UI",Calibri,Arial,Helvetica,sans-serif}
    .hoja{position:relative;width:210mm;min-height:297mm;margin:0 auto;padding:14mm 16mm 16mm}
    /* El membrete va en <thead>: el navegador lo repite solo en cada hoja
       impresa. El <tfoot> solo reserva el hueco de abajo; el pie se dibuja
       aparte, pegado al final de cada hoja, para que nunca quede a media
       página ni encima del texto. */
    .pag{width:100%;border-collapse:collapse}
    .pag>thead>tr>td,.pag>tfoot>tr>td,.pag>tbody>tr>td{border:0;padding:0;vertical-align:top}
    .hueco{height:0}
    table{width:100%;border-collapse:collapse;font-size:10px}
    th{background:#9A7F4E;color:#fff;border:1px solid #9A7F4E;padding:6px 5px;font-size:9.5px;
      font-weight:700;text-align:center;letter-spacing:.3px}
    td{border:1px solid #c9c2b4;padding:6px;vertical-align:top}
    td.c{text-align:center;white-space:nowrap}
    td.d{text-align:right;white-space:nowrap}
    td b{font-size:10.5px}
    td .det{display:block;margin-top:3px;color:#555;font-size:9.5px;line-height:1.45}
    td .mini{float:right;max-width:70px;max-height:56px;object-fit:contain;margin:0 0 4px 8px}
    tr.tot td{background:#f5f2ec;font-weight:700}
    tr.tot td.k{text-align:right}
    tr.gran td{background:#9A7F4E;color:#fff;font-weight:700}
    h2{margin:18px 0 6px;font-size:11.5px;font-weight:700;color:#9A7F4E;letter-spacing:.3px;text-transform:uppercase}
    .nota{margin:7px 0 0;font-size:9.5px;color:#7A7A7A;text-align:justify}
    /* Al imprimir mandan los márgenes de @page. */
    @media print{
      .hoja{width:auto;min-height:0;margin:0;padding:0}
      tr,.term{break-inside:avoid}
      .hueco{height:13mm}
      .pie{position:fixed;bottom:0;left:0;right:0;margin:0;background:#fff}
    }`;

  if(!formal){
    /* ── RESUMEN del cliente ──────────────────────────────────────────
       Tiene que verse distinto de una cotización: sello de agua, franja
       de aviso, sin carta formal, sin firma y sin datos de pago. */
    return `<!doctype html><html lang="es"><head><meta charset="utf-8">
    <title>Solicitud de cotización ${cotEsc(d.num)}</title><style>${base}
      .sello{position:absolute;top:44%;left:0;right:0;text-align:center;font-size:54px;font-weight:800;
        color:rgba(154,127,78,.10);letter-spacing:3px;transform:rotate(-20deg);z-index:0;
        pointer-events:none}
      .cont{position:relative;z-index:1}
      .cab{display:flex;justify-content:space-between;align-items:baseline;gap:12px;
        border-bottom:2px solid #9A7F4E;padding-bottom:7px;margin-bottom:12px}
      .cab b{font-size:15px;color:#9A7F4E}
      .cab span{font-size:10.5px;color:#555}
      h1{margin:0 0 10px;font-size:17px;font-weight:700;color:#1a1a1a}
      .franja{margin:0 0 14px;padding:11px 13px;background:#fdf6e6;border:1px solid #e3cf9b;
        border-left:4px solid #c9a227;border-radius:4px;font-size:10.5px;line-height:1.55;text-align:justify}
      .franja b{display:block;font-size:12px;color:#8a6d1d;margin-bottom:3px}
      .meta{display:flex;justify-content:space-between;font-size:10.5px;color:#555;margin-bottom:12px}
      .para{margin:0 0 12px;font-size:11px}
      .para b{color:#9A7F4E}
      ul.lst{margin:4px 0 0;padding-left:16px;font-size:10.5px;line-height:1.6}
      .pasos{margin-top:16px;padding:12px 14px;background:#f5f2ec;border-radius:5px;font-size:10.5px;line-height:1.6}
      .pasos b{color:#9A7F4E}
      .pie{margin-top:9mm;padding-top:3mm;border-top:1px solid #ddd8cc;
        font-size:9px;color:#8a8a8a;text-align:center}
      @media print{.pie{padding-bottom:1mm}}
    </style></head><body>
      <div class="hoja"><div class="sello">REFERENCIAL</div><table class="pag">
        <tfoot><tr><td><div class="hueco"></div></td></tr></tfoot>
        <tbody><tr><td><div class="cont">
        <div class="cab"><b>${cotEsc(S.nombre || '')}</b><span>${cotEsc(S.web || '')} · ${cotEsc(S.telefono || '')}</span></div>
        <h1>Solicitud de cotización</h1>
        <div class="franja"><b>Esto no es una cotización.</b>
          ${venta
            ? 'Es la lista que armaste en nuestra web, con precios referenciales. La cotización formal, con firma y validez comercial, la emite ' + cotEsc(S.razonSocial || '') + ' después de confirmar el stock y el plazo de entrega.'
            : 'Es un estimado que calculaste en nuestra web, sujeto a confirmar que los instrumentos estén libres en las fechas que necesitas. La cotización formal, con firma y validez comercial, la emite ' + cotEsc(S.razonSocial || '') + ' después de confirmar la disponibilidad.'}</div>
        <div class="meta"><span>Solicitud N° ${cotEsc(d.num)}</span><span>${fechaLarga}</span></div>
        <p class="para"><b>Para:</b> ${cotEsc(d.nom || '—')}${d.tel ? ' · ' + cotEsc(d.tel) : ''}${d.mail ? ' · ' + cotEsc(d.mail) : ''}
          ${venta ? '' : `<br><b>Dónde:</b> ${!d.prov ? 'Lima'
            : d.ciu ? 'Provincia · ' + cotEsc(d.ciu) + ' (viaja el instrumentista)'
            : 'Provincia (envío por agencia, a cargo del cliente)'}<br>
          <b>Periodo:</b> ${cotEsc(per)}`}</p>
        <h2>${venta ? 'Equipos y precio referencial' : 'Instrumentos y precio estimado'}</h2>
        ${cuadro}
        <p class="nota">Importes en Soles (S/), con IGV incluido. ${cotMontoLetras(d.total)}${d.gar
          ? ' Además se deja una garantía en depósito de S/ ' + fmt(d.gar) + ', que se devuelve al retornar los instrumentos.' : ''}</p>
        <h2>Qué incluye</h2>
        <ul class="lst">
          ${venta ? `<li>Equipos nuevos, con ${VCOT_TERM.garantiaMeses} meses de garantía del fabricante.</li>
            <li>${cotEsc(VCOT_TERM.incluye)}</li>
            <li>Entrega en Lima; a provincia se envía por agencia, a cargo del cliente.</li>
            <li>Factura electrónica a nombre de tu razón social.</li>` : `
          <li>Certificado de calibración vigente de cada instrumento.</li>
          ${d.tec ? '<li>Instrumentista metrológico, ya incluido en el total de arriba.</li>'
                  : '<li>Retiro y devolución en nuestra oficina de Lima, presentando documento de identidad.</li>'}
          ${d.prov && d.tec ? '<li>El instrumentista viaja a ' + cotEsc(d.ciu || 'tu ciudad') + ': sale de noche y regresa de noche, así que solo pagas los días de trabajo. El pasaje y los viáticos ya están en el cuadro de arriba.</li>' : ''}
          ${d.prov && !d.tec ? '<li>Los instrumentos viajan por agencia (Shalom o la que prefieras); el envío de ida y vuelta lo contratas y lo pagas tú, directo con la agencia.</li>' : ''}
          <li>${d.mod === 'medio' ? 'Medio día es un turno de 4 horas: ' + HORARIO_MANANA + ' o ' + HORARIO_TARDE + '.'
                                  : 'El día completo son los dos turnos: ' + HORARIO_MANANA + ' y ' + HORARIO_TARDE + '.'}</li>`}
        </ul>
        <div class="pasos"><b>Para confirmar:</b> escríbenos por WhatsApp al ${cotEsc(S.telefono || '')}
          o a ${cotEsc(S.email || '')}, indicando el número de solicitud ${cotEsc(d.num)}.
          ${venta ? 'Confirmamos el stock, el precio y el plazo de entrega, y te enviamos la cotización formal el mismo día.'
                  : 'Revisamos la disponibilidad y te enviamos la cotización formal el mismo día.'}</div>
      </div></td></tr></tbody></table>
      <div class="pie">${cotEsc(S.nombre || '')} · ${cotEsc(S.web || '')} · Documento referencial, sin validez comercial</div>
      </div>
    </body></html>`;
  }

  /* ── COTIZACIÓN formal ────────────────────────────────────────────
     Membrete arriba y pie con razón social y RUC en todas las páginas,
     como la plantilla de Word de la empresa. */
  const term = (venta && typeof vcTerminos === 'function' ? vcTerminos(d) : cotTerminos(d)).map(([k, v]) =>
    `<p class="term"><b>${cotEsc(k)}</b> ${cotEsc(v)}</p>`).join('');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
  <title>Cotización ${cotEsc(d.num)}</title><style>${base}
    .memb{padding-bottom:7mm}
    .memb img{width:100%;display:block}
    .pie{margin-top:8mm;padding-top:3mm;border-top:1px solid #d9d2c2;
      font-size:9px;color:#6b6b6b;text-align:center;letter-spacing:.2px}
    @media print{.pie{padding-bottom:1mm}}
    h1{margin:0;text-align:center;font-size:13.5px;font-weight:700;color:#9A7F4E;letter-spacing:.3px;
      text-transform:uppercase;line-height:1.35}
    .lin{height:2px;background:#9A7F4E;margin:7px 0 12px}
    .nf{display:flex;justify-content:space-between;font-size:11px;font-weight:600;margin-bottom:14px}
    .cli{margin:0 0 12px;line-height:1.55}
    .campo{margin:0 0 8px;text-align:justify}
    .campo b{color:#9A7F4E}
    .intro{margin:12px 0 16px;text-align:justify}
    .term{margin:0 0 6px;text-align:justify;font-size:10.5px}
    .dpag{margin-top:6px;font-size:10.5px}
    .dpag div{display:flex;gap:8px;padding:1px 0}
    .dpag span{min-width:160px;color:#555}
    .cierre{margin:14px 0 0;text-align:justify}
    .firma{margin-top:10px}
    .firma img{width:170px;display:block}
  </style></head><body>
    <div class="hoja"><table class="pag">
      <thead><tr><td><div class="memb"><img src="${org}/img/cotizacion/membrete.png" alt="${cotEsc(S.razonSocial || '')}"></div></td></tr></thead>
      <tfoot><tr><td><div class="hueco"></div></td></tr></tfoot>
      <tbody><tr><td>
      <h1>${venta ? 'Cotización de venta de equipamiento biomédico'
                  : 'Cotización de alquiler de instrumentos de metrología biomédica'}</h1>
      <div class="lin"></div>
      <div class="nf"><span>N° ${cotEsc(d.num)}</span><span>${fechaLarga}</span></div>
      <p class="cli">Señores:<br><b>${cotEsc((d.nom || '[RAZÓN SOCIAL DEL CLIENTE]').toUpperCase())}</b><br>
        ${d.ruc ? 'RUC: ' + cotEsc(d.ruc) + '<br>' : ''}${d.aten ? 'Atención: ' + cotEsc(d.aten) + '<br>' : ''}
        ${d.tel ? 'Teléfono: ' + cotEsc(d.tel) + '<br>' : ''}${d.mail ? 'Correo: ' + cotEsc(d.mail) + '<br>' : ''}Presente.-</p>
      <p class="campo"><b>Asunto:</b> ${venta
        ? 'Venta de equipamiento biomédico, según el detalle del Cuadro N° 1.'
        : 'Alquiler de instrumentos de metrología biomédica con certificado de calibración vigente, por ' + cotEsc(per) + '.'}</p>
      <p class="intro">Es grato dirigirnos a ustedes para saludarlos cordialmente y, en atención a su
        requerimiento, alcanzarles nuestra propuesta económica por ${venta ? 'los equipos' : 'el alquiler de los instrumentos'}
        detallados en el Cuadro N° 1.</p>
      <h2>Cuadro N° 1 — ${venta ? 'Detalle de los equipos' : 'Detalle del alquiler'}</h2>
      ${cuadro}
      <p class="nota">Importes en Soles (S/). El valor de venta asciende a S/ ${neto.toFixed(2)} sin IGV;
        el total con IGV (18%) es de S/ ${d.total.toFixed(2)}. ${cotMontoLetras(d.total)}${d.gar
        ? ' Adicionalmente se deja una garantía en depósito de S/ ' + fmt(d.gar) + ', que se devuelve al retornar los instrumentos.' : ''}</p>
      <h2>Términos y condiciones</h2>
      ${term}
      ${d.nota ? `<p class="campo"><b>Nota:</b> ${cotEsc(d.nota)}</p>` : ''}
      <h2>Datos generales para facturación y pago</h2>
      <div class="dpag">
        <div><span>Razón social:</span> ${cotEsc(S.razonSocial || '')}</div>
        <div><span>RUC:</span> ${cotEsc(S.ruc || '')}</div>
        ${S.banco ? `<div><span>Entidad bancaria:</span> ${cotEsc(S.banco)}</div>` : ''}
        ${S.cuenta ? `<div><span>N° cuenta corriente (S/):</span> ${cotEsc(S.cuenta)}</div>` : ''}
        ${S.cci ? `<div><span>CCI:</span> ${cotEsc(S.cci)}</div>` : ''}
      </div>
      <p class="cierre">Sin otro particular y a la espera de su gentil aceptación, quedamos a su
        disposición para cualquier consulta adicional.</p>
      <div class="firma">Atentamente,<br><img src="${org}/img/cotizacion/firma.png" alt="Firma"></div>
      </td></tr></tbody></table>
      <div class="pie">${cotEsc((S.razonSocial || '').toUpperCase())} &nbsp;·&nbsp; RUC ${cotEsc(S.ruc || '')}</div>
    </div>
  </body></html>`;
}

function cotImprimir(doc, formal){
  const w = window.open('', '_blank');
  if(!w){ avisar('cotAviso', 'Tu navegador bloqueó la ventana. Permite las ventanas emergentes y vuelve a intentarlo.', 'err'); return; }
  w.document.write(cotHTML(doc, formal).replace('</body>',
    '<script>window.onload=function(){window.print()}<\/script></body>'));
  w.document.close();
}
/* Vista previa en una ventana flotante, sin salir del cotizador ni
   descargar nada: el cliente mira cómo quedó y sigue editando. */
function cotVista(){
  const c = cotCalcular();
  if(!c.sel.length || c.largo) return;
  const {nom, mail, tel} = cotDatos();
  cotModal(cotDoc(c, nom, mail, tel, cotNumero()));
}
function cotModal(doc){
  let m = document.getElementById('cotModal');
  if(!m){
    m = document.createElement('div');
    m.id = 'cotModal'; m.className = 'cotm';
    document.body.appendChild(m);
    m.addEventListener('click', e => { if(e.target === m) cotModalCerrar(); });
    document.addEventListener('keydown', e => { if(e.key === 'Escape') cotModalCerrar(); });
  }
  m.innerHTML = `<div class="cotm-p" role="dialog" aria-modal="true" aria-label="Vista previa de tu solicitud">
    <div class="cotm-c">
      <div><b>Así le llega tu solicitud</b>
        <span>N° ${cotEsc(doc.num)} · S/ ${doc.total.toFixed(2)} con IGV</span></div>
      <button type="button" class="cotm-x" onclick="cotModalCerrar()" aria-label="Cerrar">✕</button>
    </div>
    <div class="cotm-h"><iframe title="Vista previa de la solicitud"></iframe></div>
    <div class="cotm-a">
      <button class="btn btn-fill" onclick="cotModalCerrar();cotEnviarDoc('${doc.tipo === 'venta' ? 'venta' : 'alquiler'}')">Enviar mi pedido por WhatsApp</button>
      <button class="btn" onclick="cotModalCerrar()">Seguir editando</button>
    </div>
  </div>`;
  const f = m.querySelector('iframe');
  f.srcdoc = cotHTML(doc, false);
  f.onload = () => cotAjustarHoja(f);
  document.body.classList.add('cot-bloq');
  m.classList.add('on');
}
/* La misma ventana sirve para el alquiler y para la venta: cada una
   manda su pedido con su propia función. */
function cotEnviarDoc(tipo){
  if(tipo === 'venta' && typeof vcEnviar === 'function') vcEnviar('whatsapp');
  else cotEnviar('whatsapp');
}
function cotModalCerrar(){
  const m = document.getElementById('cotModal');
  if(!m) return;
  m.classList.remove('on'); m.innerHTML = '';
  document.body.classList.remove('cot-bloq');
}

/* ── Página de la cotización (#/cotizacion/<codigo>) ─────────────────
   El enlace que va por WhatsApp abre esto: el resumen tal cual, solo para
   verlo en pantalla. No se descarga nada: el único PDF es la cotización
   formal que emite la empresa. El documento viaja dentro del propio
   enlace, así que no hace falta servidor ni base de datos. */
var COT_DOC = null;
function cotVer(codigo){
  const caja = document.getElementById('cotVerBody');
  if(!caja) return;
  const d = cotDecodificar(codigo || '');
  COT_DOC = d;
  if(!d || !d.items || !d.items.length){
    caja.innerHTML = `<div class="wrap"><p class="cotv-mal">No pudimos leer esta cotización.
      El enlace puede estar incompleto. Vuelve a armarla en
      <a href="#/cotizar">el cotizador</a> o escríbenos y la preparamos.</p></div>`;
    return;
  }
  const S = (typeof SITE !== 'undefined') ? SITE : {};
  const wa = urlWhatsApp(String(S.whatsapp || '').replace(/\D/g, ''),
    'Hola, quiero confirmar la solicitud ' + d.num + ' por S/ ' + d.total.toFixed(2) +
    ' y recibir la cotización formal.\n\n' + location.href);
  caja.innerHTML = `
    <div class="wrap cotv-cab">
      <div>
        <div class="k">Solicitud de cotización</div>
        <h1>${cotEsc(d.num)}</h1>
        <p>${cotEsc(d.nom || '')} · ${cotEsc(d.fecha)} · <b>S/ ${d.total.toFixed(2)}</b> con IGV</p>
      </div>
      <div class="cotv-btns">
        <a class="btn btn-fill" href="${wa}" target="_blank" rel="noopener">Enviar este resumen por WhatsApp</a>
      </div>
    </div>
    <div class="wrap"><div class="cotv-hoja"><iframe title="Solicitud ${cotEsc(d.num)}"></iframe></div></div>
    <div class="wrap"><p class="cotv-emitir"><a href="#/emitir/${cotEsc(codigo)}">Soy de ${cotEsc((typeof SITE!=='undefined'&&SITE.nombre)||'la empresa')}</a></p></div>`;
  const f = caja.querySelector('iframe');
  f.srcdoc = cotHTML(d, false);
  /* La hoja mide 210 mm (794 px). En el celular no entra, así que se
     reduce a escala hasta el ancho disponible y el marco se ajusta al
     alto real de la hoja: se ve completa, sin cortes ni hueco en blanco. */
  f.onload = () => cotAjustarHoja(f);
}

function cotAjustarHoja(f){
  try{
    /* En pantalla la hoja no necesita medir un A4 completo: sin ese mínimo
       no queda un hueco en blanco debajo del contenido. */
    const hoja = f.contentDocument.querySelector('.hoja');
    if(hoja) hoja.style.minHeight = '0';
    const caja = f.parentNode, s = Math.min(1, caja.clientWidth / 794);
    const alto = f.contentDocument.body.scrollHeight + 16;
    f.style.height = alto + 'px';
    f.style.transform = s < 1 ? 'scale(' + s + ')' : 'none';
    caja.style.height = Math.round(alto * s) + 'px';
  }catch(e){}
}
window.addEventListener('resize', () => {
  const f = document.querySelector('.cotv-hoja iframe');
  if(f && f.contentDocument) cotAjustarHoja(f);
});

/* ── Emisión de la cotización formal (#/emitir/<codigo>) ─────────────
   Solo para la empresa. Aquí se revisa el pedido, se pone el número del
   correlativo propio, se ajusta el precio si hace falta y recién entonces
   se descarga el documento con membrete y firma. El cliente nunca pasa por
   aquí: su enlace es el del resumen. */
var COT_EMI = null;

function cotClaveOk(){
  try{ return sessionStorage.getItem('sb-emitir') === '1'; }catch(e){ return false; }
}
async function cotEntrar(){
  const el = document.getElementById('emiClave');
  const v = (el && el.value || '').trim();
  const esperado = (typeof CONFIG !== 'undefined' && CONFIG.EMITIR_HASH) || '';
  let ok = false;
  try{
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v));
    ok = [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('') === esperado;
  }catch(e){ ok = false; }
  if(!ok){ avisar('emiAviso', 'Clave incorrecta.', 'err'); if(el){ el.value = ''; el.focus(); } return; }
  try{ sessionStorage.setItem('sb-emitir', '1'); }catch(e){}
  cotEmitir(location.hash.slice('#/emitir/'.length));
}

function cotEmitir(codigo){
  const caja = document.getElementById('cotEmiBody');
  if(!caja) return;
  const d = cotDecodificar(codigo || '');
  if(!d || !d.items || !d.items.length){
    caja.innerHTML = `<div class="wrap"><p class="cotv-mal">No pudimos leer esta solicitud.</p></div>`;
    return;
  }
  if(!cotClaveOk()){
    caja.innerHTML = `<div class="wrap emi-puerta">
      <h1>Emitir cotización</h1>
      <p>Esta pantalla es solo para ${cotEsc((typeof SITE !== 'undefined' && SITE.nombre) || 'la empresa')}.
        El cliente ve el resumen, no la cotización firmada.</p>
      <label>Clave de emisión<input type="password" id="emiClave" autocomplete="current-password"
        onkeydown="if(event.key==='Enter')cotEntrar()"></label>
      <div class="form-msg" id="emiAviso" role="status" aria-live="polite"></div>
      <button class="btn btn-fill" onclick="cotEntrar()">Entrar</button>
      <p class="emi-vol"><a href="#/resumen/${cotEsc(codigo)}">← Ver el resumen del cliente</a></p>
    </div>`;
    setTimeout(() => { const el = document.getElementById('emiClave'); if(el) el.focus(); }, 60);
    return;
  }
  /* Número propio sugerido, con el correlativo de la empresa. */
  const h = new Date(), p2 = n => String(n).padStart(2, '0');
  COT_EMI = Object.assign({}, d, {
    num: d.numCot || ('COT-SB-' + p2(h.getMonth() + 1) + String(h.getFullYear()).slice(2) + '-'),
    ruc: d.ruc || '', aten: d.aten || '', nota: d.nota || '', ajuste: 0
  });
  caja.innerHTML = `
    <div class="wrap emi-cab">
      <div><div class="k">Emitir cotización · solicitud ${cotEsc(d.num)}</div>
        <h1>${cotEsc(d.nom || 'Cliente sin nombre')}</h1>
        <p>${d.items.length} ${d.items.length === 1 ? 'instrumento' : 'instrumentos'} ·
          ${d.qty} ${COT_UNI[d.mod]}${d.qty === 1 ? '' : 's'} · pedido por S/ ${d.total.toFixed(2)}</p></div>
    </div>
    <div class="wrap emi">
      <div class="emi-form">
        <div class="emi-g"><b>1</b> Datos de la cotización</div>
        <label>N° de cotización <small>tu correlativo</small>
          <input id="emiNum" value="${cotEsc(COT_EMI.num)}" oninput="cotEmiCambio()"></label>
        <div class="cot-f2">
          <label>RUC del cliente<input id="emiRuc" value="${cotEsc(COT_EMI.ruc)}" oninput="cotEmiCambio()"></label>
          <label>Atención<input id="emiAten" value="${cotEsc(COT_EMI.aten)}" oninput="cotEmiCambio()"></label>
        </div>
        <label>Razón social del cliente<input id="emiNom" value="${cotEsc(d.nom || '')}" oninput="cotEmiCambio()"></label>

        <div class="emi-g"><b>2</b> Precio</div>
        <label>Descuento sobre el total <small>en soles, 0 si no aplica</small>
          <input id="emiDesc" type="number" min="0" step="1" value="0" oninput="cotEmiCambio()"></label>
        <p class="emi-tot" id="emiTot"></p>

        <div class="emi-g"><b>3</b> Nota para el cliente <small>opcional</small></div>
        <label><textarea id="emiNota" rows="3" oninput="cotEmiCambio()"
          placeholder="Disponibilidad confirmada del 10 al 14 de octubre."></textarea></label>

        <button class="btn btn-fill emi-pdf" onclick="cotImprimir(COT_EMI, true)">Descargar la cotización en PDF</button>
        <p class="emi-nota">Sale con membrete, firma y datos de pago. Revisa la vista de al lado antes de enviarla.</p>
      </div>
      <div class="emi-vista"><div class="cotv-hoja"><iframe title="Cotización"></iframe></div></div>
    </div>`;
  cotEmiCambio();
}

function cotEmiCambio(){
  if(!COT_EMI) return;
  const v = id => { const el = document.getElementById(id); return el ? el.value : ''; };
  COT_EMI.num = v('emiNum'); COT_EMI.ruc = v('emiRuc'); COT_EMI.aten = v('emiAten');
  COT_EMI.nom = v('emiNom'); COT_EMI.nota = v('emiNota');
  const desc = Math.max(0, Number(v('emiDesc')) || 0);
  COT_EMI.total = Math.max(0, (COT_EMI.totalBase || (COT_EMI.totalBase = COT_EMI.total)) - desc);
  const t = document.getElementById('emiTot');
  if(t) t.innerHTML = desc
    ? `Pedido S/ ${COT_EMI.totalBase.toFixed(2)} − descuento S/ ${desc.toFixed(2)} = <b>S/ ${COT_EMI.total.toFixed(2)}</b>`
    : `Total: <b>S/ ${COT_EMI.total.toFixed(2)}</b>`;
  const f = document.querySelector('.emi-vista iframe');
  if(f){
    f.srcdoc = cotHTML(COT_EMI, true);
    f.onload = () => { try{ f.style.height = (f.contentDocument.body.scrollHeight + 24) + 'px'; }catch(e){} };
  }
}

/* Entrada desde las páginas de cada equipo: #/cotizar/<id>. Los datos del
   catálogo pueden tardar, así que se reintenta mientras llegan. */
function cotAbrir(id, intento){
  if(!id){ cotPintar(); return; }
  if(byId(id)){ COT.sel.add(id); cotPintar(); return; }
  if((intento || 0) < 240) setTimeout(() => cotAbrir(id, (intento || 0) + 1), 250);
  else cotPintar();
}

;
/* ===== js/14-venta-cot.js ===== */
/* =====================================================================
   14-venta-cot.js — Cotizador de venta (#/cotizar-venta)

   El cliente arma su lista de equipos desde la tienda, con cantidades, y
   ve el total al instante. Después manda el pedido por WhatsApp con el
   enlace de su solicitud; la cotización formal, con membrete y firma, la
   emite la empresa desde #/emitir, igual que en alquiler.

   La lista se guarda en el navegador del cliente, así no se pierde
   mientras recorre la tienda ni al volver después.
   ===================================================================== */
/* El carrito vive en js/carrito.js, que también usan las páginas sueltas
   de producto. Aquí solo se lee y se escribe a través de él. */
const vcItems = () => (window.SBCarrito ? SBCarrito.items() : {});

/* Términos de la cotización de venta: se pueden cambiar sin tocar código. */
var VCOT_TERM = {vigenciaDias: 15, plazoStock: 'de 2 a 5 días hábiles',
  plazoPedido: 'se confirma al emitir la cotización', garantiaMeses: 12,
  pago: '50 % con la orden de compra y 50 % contra entrega, salvo acuerdo distinto por escrito.',
  incluye: 'Manual de usuario, certificado de garantía y capacitación de uso en la entrega.'};
fetch('data/terminos-venta.json', {cache: 'no-cache'}).then(r => r.ok ? r.json() : null)
  .then(d => { if(d) Object.keys(VCOT_TERM).forEach(k => { if(d[k] != null) VCOT_TERM[k] = d[k]; }); })
  .catch(() => {});

/* ── Carrito ────────────────────────────────────────────────────────── */
const vcProducto = id => ((VENTA && VENTA.productos) || []).find(p => p.id === id);
const vcCuenta = () => (window.SBCarrito ? SBCarrito.cuenta() : 0);

function vcAgregar(id, cuantos){
  const p = vcProducto(id);
  if(window.SBCarrito) SBCarrito.agregar(id, p ? {
    nom: p.nom, mm: [p.marca, p.modelo].filter(Boolean).join(' '),
    nts: p.clave || '', precio: Number(p.precio || 0), foto: vFoto(p, 0, true) || ''
  } : null, cuantos || 1);
  vcPintarTodo();
}
function vcCantidad(id, v){ if(window.SBCarrito) SBCarrito.cantidad(id, v); vcPintarTodo(); }
function vcQuitar(id){ if(window.SBCarrito) SBCarrito.quitar(id); vcPintarTodo(); }
function vcVaciar(){ if(window.SBCarrito) SBCarrito.vaciar(); vcPintarTodo(); }

/* ── Cuenta ─────────────────────────────────────────────────────────── */
/* Manda el catálogo cuando está cargado; si no (o si el equipo ya no está
   en la hoja), vale lo que se guardó al agregarlo. */
function vcCalcular(){
  const g = vcItems();
  const items = Object.keys(g)
    .map(id => {
      const y = g[id], v = vcProducto(id);
      /* Con catálogo manda el catálogo; sin él, lo que se guardó al agregar. */
      const p = v || {id: id, nom: y.nom || id, marca: y.mm || '', modelo: '', clave: y.nts || '',
        precio: Number(y.precio || 0)};
      const foto = v ? (vFoto(v, 0, true) || y.foto || '') : (y.foto || '');
      return {p: p, q: Number(y.q || 0), foto: foto};
    })
    .filter(x => x.q > 0)
    .map(x => ({p: x.p, q: x.q, foto: x.foto, precio: Number(x.p.precio || 0),
                total: Number(x.p.precio || 0) * x.q}));
  const total = items.reduce((s, x) => s + x.total, 0);
  const sinPrecio = items.filter(x => !x.precio).length;
  return {items, total, sinPrecio, unidades: items.reduce((s, x) => s + x.q, 0)};
}

/* ── Página ─────────────────────────────────────────────────────────── */
function vcAbrir(){
  vcPintarTodo();
  /* Si se vino del carrito tocando «Enviar por WhatsApp», se baja al
     formulario y se intenta enviar de una vez. */
  let ir = '';
  try{ ir = sessionStorage.getItem('sb-ir-enviar') || ''; sessionStorage.removeItem('sb-ir-enviar'); }catch(e){}
  if(ir) setTimeout(() => vcEnviar('whatsapp'), 350);
}
/* Los botones +/− del panel del carrito también repintan esta página. */
window.addEventListener('sb-carrito', () => { if(document.getElementById('vcBody')) vcPintar(); });

function vcPintarTodo(){
  vcPintar();
  vcChip();
  if(window.SBCarrito) SBCarrito.pintar();
}

/* Contador en el menú de venta, para volver a la lista desde cualquier sitio. */
function vcChip(){
  document.querySelectorAll('[data-vc-cuenta]').forEach(el => {
    const n = vcCuenta();
    el.textContent = n ? String(n) : '';
    el.hidden = !n;
  });
}

/* El catálogo se pide una sola vez, para refrescar precios y stock; la
   página NO lo espera, porque el carrito ya guarda lo necesario de cada
   equipo. Antes, si se entraba directo a esta dirección, se quedaba en
   «Cargando el catálogo…» para siempre. */
var VCOT_PEDIDO = false;
function vcCatalogo(){
  if(VCOT_PEDIDO || (VENTA && VENTA.productos) || typeof cargarVenta !== 'function') return;
  VCOT_PEDIDO = true;
  cargarVenta().then(() => { if(document.getElementById('vcBody')) vcPintar(); }).catch(() => {});
}

function vcPintar(){
  const caja = document.getElementById('vcBody');
  if(!caja) return;
  vcCatalogo();
  const c = vcCalcular();
  if(!c.items.length){
    caja.innerHTML = `<div class="wrap vc-vacio">
      <h1>Tu cotización está vacía</h1>
      <p>Entra a la tienda, abre los equipos que te interesan y toca «Agregar a mi cotización».
        Puedes poner cuántas unidades necesitas de cada uno y aquí verás el total al instante.</p>
      <a class="btn btn-fill btn-lg" onclick="go('#/venta/tienda')">Ver la tienda</a>
    </div>`;
    return;
  }
  const neto = c.total / 1.18;
  caja.innerHTML = `
    <div class="wrap pagehead"><div class="k">Venta de equipos</div>
      <h1>Tu cotización</h1>
      <p>Revisa las cantidades, déjanos tus datos y te respondemos con la cotización formal,
        la disponibilidad y el plazo de entrega. Todos los precios incluyen IGV.</p>
    </div>
    <div class="wrap vc-grid">
      <div>
        <div class="cot-paso uno"><b>1</b> Tus equipos <i>${c.unidades} ${c.unidades === 1 ? 'unidad' : 'unidades'}</i></div>
        <div class="vc-lista">${c.items.map(vcFila).join('')}</div>
        <button type="button" class="cot-limpiar" onclick="vcVaciar()">Vaciar la lista</button>
      </div>
      <aside class="cot-res">
        <div class="cot-top">
          <span>Tu cotización · ${c.items.length} ${c.items.length === 1 ? 'equipo' : 'equipos'}</span>
          <b>${vSoles(c.total)}</b>
          <small>IGV incluido · precios referenciales</small>
          <div class="cot-acc">
            <button class="btn btn-fill" onclick="vcEnviar('whatsapp')">Enviar mi pedido por WhatsApp</button>
            <button class="btn" onclick="vcVista()">Ver el resumen</button>
          </div>
        </div>

        <div class="cot-paso"><b>2</b> El detalle</div>
        <ul class="cot-sel">${c.items.map(x =>
          `<li><span>${vEsc(x.p.nom)}${x.q > 1 ? ' × ' + x.q : ''}</span><span>${vSoles(x.total)}</span></li>`).join('')}
        </ul>
        <div class="cot-cuenta">
          <div class="sub"><span>Subtotal (S/)</span><span>${neto.toFixed(2)}</span></div>
          <div class="sub"><span>IGV (18 %) (S/)</span><span>${(c.total - neto).toFixed(2)}</span></div>
          <div class="gran"><span>Total con IGV (S/)</span><span>${c.total.toFixed(2)}</span></div>
        </div>
        <p class="cot-aviso"><b>Es un precio referencial.</b> Lo confirmamos al emitir la cotización
          formal, junto con el stock y el plazo de entrega de cada equipo.</p>

        <div class="cot-paso"><b>3</b> Tus datos</div>
        <div class="cot-form" id="vcForm">
          <label>Nombre o institución<input id="vcNom" type="text" autocomplete="organization" placeholder="Clínica, hospital o nombre"></label>
          <div class="cot-f2">
            <label>Correo<input id="vcMail" type="email" autocomplete="email" inputmode="email" placeholder="correo@ejemplo.com"></label>
            <label>Teléfono<input id="vcTel" type="tel" autocomplete="tel" inputmode="tel" placeholder="999 999 999"></label>
          </div>
          <label>¿Algo que debamos saber?<textarea id="vcMsg" rows="2" placeholder="Para qué área, si es para un expediente, fechas…"></textarea></label>
          <div class="form-msg" id="vcAviso" role="status" aria-live="polite"></div>
          <p class="cot-mail">Con tus datos listos, toca «Enviar mi pedido por WhatsApp».
            ¿Prefieres correo? <button type="button" onclick="vcEnviar('correo')">Enviar por correo</button>
            · <button type="button" onclick="vcCopiar()">Copiar el mensaje</button></p>
        </div>
        <p class="cot-nota">Entrega en Lima. A provincia se envía por agencia de transporte; el envío
          lo contrata y lo paga el cliente.</p>
      </aside>
    </div>`;
  vcRestaurar();
}

function vcFila(x){
  const p = x.p, foto = x.foto;
  return `<div class="vc-i">
    ${foto ? `<img class="vc-f" src="${foto}" alt="" loading="lazy" decoding="async">` : '<span class="vc-f sin"></span>'}
    <div class="vc-n">
      <b>${vEsc(p.nom)}</b>
      <small>${vEsc([p.marca, p.modelo].filter(Boolean).join(' '))}${p.clave ? ' · NTS ' + vEsc(p.clave) : ''}</small>
      ${p.stock != null ? vStock(p) : ''}
    </div>
    <div class="vc-q">
      <button type="button" onclick="vcCantidad('${p.id}',${x.q - 1})" aria-label="Quitar uno">−</button>
      <input type="number" min="1" step="1" value="${x.q}" onchange="vcCantidad('${p.id}',this.value)" aria-label="Cantidad">
      <button type="button" onclick="vcCantidad('${p.id}',${x.q + 1})" aria-label="Agregar uno">+</button>
    </div>
    <div class="vc-p"><b>${vSoles(x.total)}</b>${x.q > 1 ? `<small>${vSoles(x.precio)} c/u</small>` : ''}</div>
    <button type="button" class="vc-x" onclick="vcQuitar('${p.id}')" aria-label="Quitar de la lista">✕</button>
  </div>`;
}

/* Los datos del cliente no se pierden al repintar. */
var VCOT_DATOS = {nom: '', mail: '', tel: '', msg: ''};
function vcDatos(){
  const v = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  return {nom: v('vcNom') || VCOT_DATOS.nom, mail: v('vcMail') || VCOT_DATOS.mail,
          tel: v('vcTel') || VCOT_DATOS.tel, msg: v('vcMsg') || VCOT_DATOS.msg};
}
function vcRestaurar(){
  [['vcNom','nom'],['vcMail','mail'],['vcTel','tel'],['vcMsg','msg']].forEach(([id, k]) => {
    const el = document.getElementById(id); if(!el) return;
    if(VCOT_DATOS[k]) el.value = VCOT_DATOS[k];
    el.addEventListener('input', () => { VCOT_DATOS[k] = el.value; });
  });
}

/* ── Documento de venta ──────────────────────────────────────────────
   Mismo motor que el alquiler (cotHTML), con el cuadro armado por
   unidades y sus propios términos. Así el resumen del cliente y la
   cotización formal salen con el mismo formato de la empresa. */
function vcDoc(c, d){
  return {
    tipo: 'venta',
    num: vcNumero(), fecha: new Date().toLocaleDateString('es-PE'),
    nom: d.nom, mail: d.mail, tel: d.tel, nota: d.msg || '',
    /* Solo lo imprescindible: id, cantidad y precio. El nombre, la marca y
       el código NTS se leen del catálogo al abrir el enlace, y solo viajan
       dentro cuando el equipo ya no está en el catálogo. Con esto el enlace
       no crece sin control y WhatsApp siempre lo acepta. */
    items: c.items.map(x => {
      const it = {i: x.p.id, q: x.q, pu: x.precio, t: x.total};
      if(!vcProducto(x.p.id)){
        it.n = x.p.nom;
        it.m = [x.p.marca, x.p.modelo].filter(Boolean).join(' · ');
        it.nts = x.p.clave || '';
      }
      return it;
    }),
    total: c.total, gar: 0, tec: 0, pas: 0, via: 0, inc: []
  };
}
function vcNumero(){
  const d = new Date(), z = n => String(n).padStart(2, '0');
  return 'SOL-V-' + String(d.getFullYear()).slice(2) + z(d.getMonth() + 1) + z(d.getDate()) +
         '-' + z(d.getHours()) + z(d.getMinutes());
}

/* Los datos del equipo para el documento: del catálogo si está, y si no,
   de lo que viajó dentro del enlace. */
function vcInfoDe(e){
  const p = vcProducto(e.i);
  let foto = '';
  if(p){ try{ foto = cotFotoAbs({photo: (p.fotos || [])[0]}) || ''; }catch(x){} }
  return {
    nom: p ? p.nom : (e.n || e.i || 'Equipo'),
    mm: p ? [p.marca, p.modelo].filter(Boolean).join(' · ') : (e.m || ''),
    nts: p ? (p.clave || '') : (e.nts || ''),
    foto: e.f || foto
  };
}

/* Términos de la cotización de venta. */
function vcTerminos(d){
  const T = VCOT_TERM, L = [];
  L.push(['1. Precio de la oferta.', 'Importes en Soles (S/), con IGV incluido. Corresponden a los equipos ' +
    'detallados en el Cuadro N° 1, en las cantidades indicadas.']);
  L.push(['2. Vigencia de la oferta.', T.vigenciaDias + ' días calendario contados desde la emisión de esta cotización.']);
  L.push(['3. Plazo de entrega.', 'Equipos en stock: ' + T.plazoStock + ' desde la conformidad de la orden de compra. ' +
    'Equipos a pedido: ' + T.plazoPedido + '.']);
  L.push(['4. Entrega.', 'En Lima Metropolitana, en el domicilio indicado por el cliente. Para provincias el envío ' +
    'se realiza por agencia de transporte y su costo lo asume el cliente.']);
  L.push(['5. Garantía.', T.garantiaMeses + ' meses de garantía del fabricante contra defectos de fabricación, ' +
    'con atención en nuestro taller de Lima. No cubre el daño por mal uso ni el desgaste de los consumibles.']);
  L.push(['6. Incluye.', T.incluye]);
  L.push(['7. Forma de pago.', T.pago]);
  L.push(['8. Comprobante.', 'Se emite factura electrónica a nombre de la razón social indicada por el cliente.']);
  return L;
}

/* ── Mensaje y envío ────────────────────────────────────────────────── */
function vcTexto(c, d){
  const L = [];
  L.push('SOLICITUD DE COTIZACIÓN — ' + ((typeof SITE !== 'undefined' && SITE.nombre) || 'Sinergia Biomédica'));
  L.push('N.º ' + vcNumero() + ' · ' + new Date().toLocaleDateString('es-PE'));
  L.push('');
  L.push('CLIENTE');
  L.push('  Nombre: ' + (d.nom || '—'));
  if(d.mail) L.push('  Correo: ' + d.mail);
  if(d.tel)  L.push('  Teléfono: ' + d.tel);
  L.push('');
  L.push('EQUIPOS');
  c.items.forEach((x, i) => {
    L.push((i + 1) + '. ' + x.p.nom + ' · ' + [x.p.marca, x.p.modelo].filter(Boolean).join(' ') +
           (x.q > 1 ? ' × ' + x.q : '') + ' · ' + vSoles(x.total));
  });
  L.push('');
  L.push('  TOTAL REFERENCIAL (IGV incluido): ' + vSoles(c.total));
  if(d.msg){ L.push(''); L.push('NOTA DEL CLIENTE'); L.push('  ' + d.msg); }
  L.push('');
  L.push('Entrega en Lima. A provincia, envío por agencia a cargo del cliente.');
  return L.join('\n');
}

function vcEnviar(via){
  const c = vcCalcular();
  if(!c.items.length) return;
  const d = vcDatos();
  const error = (typeof validarContacto === 'function') ? validarContacto(d.nom, d.mail, d.tel) : '';
  if(error){
    const f = document.getElementById('vcForm');
    if(f) f.scrollIntoView({behavior: 'smooth', block: 'center'});
    avisar('vcAviso', error, 'err');
    const el = document.getElementById('vcNom'); if(el && !d.nom) setTimeout(() => el.focus(), 350);
    return;
  }
  const doc = vcDoc(c, d);
  const enlace = cotEnlace(doc);
  let texto = vcTexto(c, d) + '\n\nResumen de este pedido:\n' + enlace;
  /* WhatsApp se queda en blanco con direcciones muy largas: si el pedido
     es grande, va el resumen corto y el enlace, que lo tiene todo. */
  if(encodeURIComponent(texto).length > 1500){
    texto = ['SOLICITUD DE COTIZACIÓN — ' + ((typeof SITE !== 'undefined' && SITE.nombre) || 'Sinergia Biomédica'),
      'Cliente: ' + (d.nom || '—') + (d.tel ? ' · ' + d.tel : ''),
      c.items.length + (c.items.length === 1 ? ' equipo' : ' equipos') + ' · ' +
        c.unidades + (c.unidades === 1 ? ' unidad' : ' unidades') +
        ' · TOTAL REFERENCIAL ' + vSoles(c.total) + ' (IGV incluido)',
      '', 'El detalle completo está aquí:', enlace].join('\n');
  }
  if(typeof enviarAlEndpoint === 'function')
    enviarAlEndpoint({tipo: 'venta-cotizador', equipo: c.items.map(x => x.p.nom).join(' + '),
                      total: vSoles(c.total), nombre: d.nom, correo: d.mail, telefono: d.tel, mensaje: d.msg});
  avisar('vcAviso', via === 'correo'
    ? 'Abriendo tu correo con el resumen de tu pedido…'
    : 'Abriendo WhatsApp con el resumen de tu pedido…', 'ok');
  abrirCanal(via, texto, 'Solicitud de cotización · venta');
}

/* Si WhatsApp no abre (pasa en algunas computadoras), el mensaje se puede
   copiar y pegar a mano. */
function vcCopiar(){
  const c = vcCalcular();
  if(!c.items.length) return;
  const d = vcDatos();
  const texto = vcTexto(c, d) + '\n\nResumen de este pedido:\n' + cotEnlace(vcDoc(c, d));
  const ok = () => avisar('vcAviso', 'Mensaje copiado: pégalo donde quieras enviarlo.', 'ok');
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(texto).then(ok).catch(() => vcCopiarViejo(texto, ok));
  }else vcCopiarViejo(texto, ok);
}
function vcCopiarViejo(texto, ok){
  const t = document.createElement('textarea');
  t.value = texto; t.style.position = 'fixed'; t.style.opacity = '0';
  document.body.appendChild(t); t.select();
  try{ document.execCommand('copy'); ok(); }catch(e){
    avisar('vcAviso', 'No se pudo copiar. Usa «Enviar por correo».', 'err');
  }
  t.remove();
}

/* Vista previa, en una ventana flotante: no descarga nada. */
function vcVista(){
  const c = vcCalcular();
  if(!c.items.length) return;
  cotModal(vcDoc(c, vcDatos()));
}
