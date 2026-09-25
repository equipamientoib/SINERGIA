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

  /* ── VISTA PREVIA LOCAL · REVERTIR ANTES DE PUBLICAR ──────────────
     Con DATA_URL vacío la web usa solo data/catalogo.json, que aquí
     lleva las fotos de uso. Si no, la respuesta en vivo del Apps
     Script las reemplazaría a los pocos segundos.                  */
  DATA_URL: "https://script.google.com/macros/s/AKfycbyCC42QwfzqLYKo0J9ahH_m1upJ0uMIhd2hF2R7YOdNhtceXmhzRVYlydhkdjk-Xh_1Rg/exec",
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
  return menu.map(n=>`${indent}<a data-route="${n.r}" onclick="go('${n.r}')">${n.t}</a>`).join('\n');
}

function renderHeader(){
  const el=document.getElementById('app-header'); if(!el)return;
  el.outerHTML=`<header>
  <div class="wrap nav">
    ${LOGO_HEADER}
    <div class="menu">
${navLinks('      ')}
      <a class="btn" onclick="go('${SITE.portal.r}')">${SITE.portal.t}</a>
    </div>
    <button class="burger" onclick="toggleMenu()" aria-label="Menú">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
    </button>
  </div>
  <div class="mobile-menu" id="mobileMenu">
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
${SITE.nav.filter(n=>n.r!=='#/').map(n=>`        <a onclick="go('${n.r}')">${n.t}</a>`).join('\n')}
      </div>
    </div>
    <div>
      <div class="tt">Contacto</div>
      <p>${SITE.email}<br>${SITE.web}<br>${SITE.telefono}</p>
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

let PAQUETES = [
  {"id": "pkg-monitores-cal", "app": "Monitores de paciente", "nivel": "Calibración", "nom": "Pack Monitores de paciente · Calibración", "items": ["esa620", "sp-sim", "ms400", "manometro"], "kit": [], "pe": 108, "ph": 146, "dia": 624, "psem": 2496, "pmes": 7488, "eqh": 1.5, "eqd": 10, "desc": "Instrumentos para calibrar y certificar monitores: seguridad eléctrica + SpO2 + ECG/multiparámetro + presión (NIBP)."},
  {"id": "pkg-monitores-mant", "app": "Monitores de paciente", "nivel": "Mantenimiento", "nom": "Pack Monitores de paciente · Mantenimiento", "items": ["esa620", "sp-sim", "ms400", "manometro"], "kit": ["multimetro", "destornillador-elec", "set-46"], "pe": 124, "ph": 168, "dia": 718, "psem": 2872, "pmes": 8616, "eqh": 1.5, "eqd": 10, "desc": "Todo lo del paquete de Calibración + multímetro y herramientas de apoyo para mantenimiento preventivo/correctivo en sitio."},
  {"id": "pkg-desfib-cal", "app": "Desfibriladores", "nivel": "Calibración", "nom": "Pack Desfibriladores · Calibración", "items": ["esa620", "defib"], "kit": [], "pe": 120, "ph": 162, "dia": 693, "psem": 2772, "pmes": 8316, "eqh": 1.5, "eqd": 10, "desc": "Seguridad eléctrica + energía entregada (joules) y sincronía."},
  {"id": "pkg-desfib-mant", "app": "Desfibriladores", "nivel": "Mantenimiento", "nom": "Pack Desfibriladores · Mantenimiento", "items": ["esa620", "defib"], "kit": ["multimetro", "destornillador-elec", "set-46"], "pe": 138, "ph": 186, "dia": 797, "psem": 3188, "pmes": 9564, "eqh": 1.5, "eqd": 10, "desc": "Todo lo del paquete de Calibración + multímetro y herramientas de apoyo para mantenimiento preventivo/correctivo en sitio."},
  {"id": "pkg-centrifugas-cal", "app": "Centrífugas", "nivel": "Calibración", "nom": "Pack Centrífugas · Calibración", "items": ["esa620", "tacometro"], "kit": [], "pe": 100, "ph": 135, "dia": 578, "psem": 2312, "pmes": 6936, "eqh": 2, "eqd": 14, "desc": "Seguridad eléctrica + verificación de rpm."},
  {"id": "pkg-centrifugas-mant", "app": "Centrífugas", "nivel": "Mantenimiento", "nom": "Pack Centrífugas · Mantenimiento", "items": ["esa620", "tacometro"], "kit": ["multimetro", "destornillador-elec", "set-46"], "pe": 115, "ph": 155, "dia": 665, "psem": 2660, "pmes": 7980, "eqh": 2, "eqd": 14, "desc": "Todo lo del paquete de Calibración + multímetro y herramientas de apoyo para mantenimiento preventivo/correctivo en sitio."},
  {"id": "pkg-lamparas-cal", "app": "Lámparas cialíticas", "nivel": "Calibración", "nom": "Pack Lámparas cialíticas · Calibración", "items": ["esa620", "luxometro"], "kit": [], "pe": 120, "ph": 162, "dia": 693, "psem": 2772, "pmes": 8316, "eqh": 2, "eqd": 14, "desc": "Seguridad eléctrica + nivel de iluminación (lux)."},
  {"id": "pkg-lamparas-mant", "app": "Lámparas cialíticas", "nivel": "Mantenimiento", "nom": "Pack Lámparas cialíticas · Mantenimiento", "items": ["esa620", "luxometro"], "kit": ["multimetro", "destornillador-elec", "set-46"], "pe": 138, "ph": 186, "dia": 797, "psem": 3188, "pmes": 9564, "eqh": 2, "eqd": 14, "desc": "Todo lo del paquete de Calibración + multímetro y herramientas de apoyo para mantenimiento preventivo/correctivo en sitio."},
  {"id": "pkg-dental-cal", "app": "Unidad dental", "nivel": "Calibración", "nom": "Pack Unidad dental · Calibración", "items": ["esa620", "fluke-945", "manometro"], "kit": [], "pe": 90, "ph": 121, "dia": 520, "psem": 2080, "pmes": 6240, "eqh": 1.5, "eqd": 10, "desc": "Seguridad eléctrica + ruido (sonómetro) + presión (manómetro)."},
  {"id": "pkg-dental-mant", "app": "Unidad dental", "nivel": "Mantenimiento", "nom": "Pack Unidad dental · Mantenimiento", "items": ["esa620", "fluke-945", "manometro"], "kit": ["multimetro", "destornillador-elec", "set-46"], "pe": 103, "ph": 140, "dia": 598, "psem": 2392, "pmes": 7176, "eqh": 1.5, "eqd": 10, "desc": "Todo lo del paquete de Calibración + multímetro y herramientas de apoyo para mantenimiento preventivo/correctivo en sitio."}
];

/* Parámetros del modelo (se sobreescriben desde la hoja vía loadData) */
let TEC_DIA=120;         // instrumentista S/ por día
let TEC_MIN=60;          // mínimo: medio día
let KIT_DIA=40;          // extra kit en "Arma tu paquete"
let DESC_COMB={"2":0.10,"3":0.12,"4":0.15}; // descuentos por combinar

const byId=id=>EQUIPOS.find(e=>e.id===id);
/* Divisores de modalidad para equipos individuales (única fuente de la verdad) */
const DIV_EQUIPO=8, DIV_HORA=6;
/* Interruptor general de precios (js/00-config.js -> CONFIG.MOSTRAR_PRECIOS).
   La hoja de Google puede sobrescribirlo con modelo.mostrar_precios. */
let VER_PRECIOS = (typeof CONFIG!=='undefined' && CONFIG.MOSTRAR_PRECIOS!==undefined) ? !!CONFIG.MOSTRAR_PRECIOS : true;
const precioEquipo=d=>Math.round(d/DIV_EQUIPO), precioHora=d=>Math.round(d/DIV_HORA);
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

function fotoURL(u, ancho, ligera){
  if(!u) return u;
  /* Si la foto ya está en el sitio, se sirve de aquí. Medido en el
     navegador con las mismas 30 fotos a la vez: desde Drive llegaron 4
     y fallaron 26 con «429 demasiadas peticiones»; desde aquí, las 30
     en una décima de segundo. Google limita cuántas imágenes sirve por
     navegador, y una ficha con cinco fotos se pasa de la raya. */
  const id = (u.match(/(?:\/d\/|id=|\/file\/d\/)([A-Za-z0-9_-]{20,})/) || [])[1];
  if(id && FOTOS_LOCALES[id]){
    const f = FOTOS_LOCALES[id];
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
const FP={app:new Set()};
let curNivel='all', curGrupo='all';

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
function huesoPk(n){
  return Array.from({length:n},()=>`
    <div class="pkg pkg-hueso">
      <span class="ln w35"></span><span class="ln w85"></span>
      <span class="ln w60"></span><span class="ln w85"></span>
      <span class="ln w60"></span>
    </div>`).join('');
}
function huesoFacetas(){
  return `<div class="facet-hueso">
    <span class="ln w60"></span><span class="ln w85"></span><span class="ln w85"></span>
    <span class="ln w60"></span><span class="ln w85"></span><span class="ln w85"></span>
  </div>`;
}

function buildFacetsEq(){
  if(!CATALOGO_LISTO){ document.getElementById('filtersSide').innerHTML=huesoFacetas(); return; }
  document.getElementById('filtersSide').innerHTML=
    facetSection('Marca','marca',uniq(EQUIPOS.map(eqBrand)).sort())+
    facetSection('Tipo','tipo',uniq(EQUIPOS.map(e=>e.cat)).sort())+
    facetSection('Procedencia','origen',uniq(EQUIPOS.map(eqOrigen)).sort())+
    `<div class="filters-clear"><button onclick="clearF()">Limpiar filtros</button></div>`;
}
function buildFacetsPk(){
  if(!CATALOGO_LISTO){ document.getElementById('filtersSide').innerHTML=huesoFacetas(); return; }
  document.getElementById('filtersSide').innerHTML=
    `<details class="facet" open><summary>Aplicación</summary><div class="opts">`+
    uniq(PAQUETES.map(p=>p.app)).map(a=>`<label><input type="checkbox" value="${a}" onchange="toggleFP(this.value,this.checked)"> ${a}</label>`).join('')+
    `</div></details><div class="filters-clear"><button onclick="clearFP()">Limpiar filtros</button></div>`;
}
function toggleF(k,v,on){on?F[k].add(v):F[k].delete(v);pintar();}
function clearF(){Object.values(F).forEach(s=>s.clear());document.querySelectorAll('#filtersSide input').forEach(i=>i.checked=false);pintar();}
function toggleFP(v,on){on?FP.app.add(v):FP.app.delete(v);pintarPaquetes();}
function clearFP(){FP.app.clear();document.querySelectorAll('#filtersSide input').forEach(i=>i.checked=false);pintarPaquetes();}
function matchEq(e){
  if(curGrupo!=='all'&&e.g!==curGrupo)return false;
  if(F.marca.size&&!F.marca.has(eqBrand(e)))return false;
  if(F.tipo.size&&!F.tipo.has(e.cat))return false;
  if(F.origen.size&&!F.origen.has(eqOrigen(e)))return false;
  return true;
}
function cardEq(e){
  const idx=EQUIPOS.indexOf(e);
  const badge=e.apoyo?`<span class="badge" style="background:rgba(154,127,78,.13);color:var(--cobre-d);border-color:var(--linea-b)">COMPLEMENTARIA</span>`:`<span class="badge">DISPONIBLE</span>`;
  const foot=e.apoyo
    ?`<div class="foot"><div class="price" style="font-size:14px;color:var(--gris);font-family:var(--ff-d);font-weight:600">Complementaria<small style="font-weight:400">incluida en Mantenimiento</small></div><button class="btn" onclick="go('#/equipo/${e.id}')">Ver detalle</button></div>`
    :(VER_PRECIOS
      ?`<div class="foot"><div class="price"><span class="desde">Desde</span>S/ ${precioHora(e.dia)}<span>/hora · IGV incl.</span><small>día S/ ${fmt(e.dia)} · sem S/ ${fmt(e.sem)} · mes S/ ${fmt(e.mes)}</small></div><button class="btn" onclick="abrir(${idx})">Reservar</button></div>`
      :`<div class="foot"><div class="price" style="font-size:15px;color:var(--gris);font-family:var(--ff-d);font-weight:600">Consultar tarifa<small style="font-weight:400">te respondemos con precio y disponibilidad</small></div><button class="btn" onclick="go('#/contacto')">Cotizar</button></div>`);
  /* Varias fotos: la tarjeta las pasa sola. La primera suele ser la de
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
      <div class="img${fotos.length?' has-photo':''}" onclick="go('#/equipo/${e.id}')">
        ${fotos.length?'':'<span class="grid-bg"></span>'}
        ${badge}<span class="tier">${e.tier}</span>
        ${carr}
      </div>
      <div class="body">
        <div class="cat">${e.cat}</div>
        <h3 onclick="go('#/equipo/${e.id}')">${e.nom}</h3>
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
  const list=EQUIPOS.filter(matchEq);
  grid.innerHTML=list.map(cardEq).join('')||'<p style="color:var(--gris);grid-column:1/-1">No hay equipos con esos filtros.</p>';
  document.getElementById('countEq').textContent=list.length+(list.length===1?' equipo':' equipos');
}

/* PAQUETES */
function pintarPaquetes(){
  const cont=document.getElementById('pkgs');
  if(!CATALOGO_LISTO){
    cont.innerHTML=huesoPk(4);
    document.getElementById('countPk').textContent='';
    return;
  }
  const list=PAQUETES.filter(p=>(curNivel==='all'||p.nivel===curNivel)&&(!FP.app.size||FP.app.has(p.app)));
  cont.innerHTML=list.map(p=>{
    const items=p.items.map(id=>byId(id));
    const kitLine=p.kit.length?`<li style="opacity:.7">+ Kit de intervención: ${p.kit.map(k=>APOYO[k]).join(', ')}</li>`:'';
    const badge=p.nivel==='Calibración'?`<span class="ptag">CALIBRACIÓN</span>`:`<span class="ptag" style="background:var(--onix)">MANTENIMIENTO</span>`;
    const pkFoto=(p.fotos&&p.fotos.length)?p.fotos[0]:(p.foto||'');
    const pkImg=pkFoto?`<div class="pkimg" onclick="go('#/paquete/${p.id}')" style="height:172px;margin:0 0 16px;overflow:hidden;border-radius:12px;border:1px solid var(--linea);cursor:pointer;background:var(--blanco)"><img src="${fotoURL(pkFoto,600,true)}" alt="${p.nom}" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover;display:block"></div>`:'';
    return `<div class="pkg">
      ${badge}
      ${pkImg}
      <h3 onclick="go('#/paquete/${p.id}')">${p.nom}</h3>
      <div class="pdesc">${p.desc}</div>
      <ul class="inc">${items.map(e=>`<li>${e.nom}</li>`).join('')}${kitLine}</ul>
      ${VER_PRECIOS?`<div class="pfoot">
        <div class="pprice">S/ ${p.dia}<span>/día · IGV incluido</span></div>
        <div class="pmod">Otras modalidades: por equipo S/ ${p.pe} · por hora S/ ${p.ph} · semana S/ ${fmt(p.psem)} · mes S/ ${fmt(p.pmes)}</div>
      </div>`:`<div class="pfoot"><div class="pprice" style="font-size:17px;color:var(--gris)">Consultar tarifa<span style="display:block">te respondemos con precio y disponibilidad</span></div></div>`}
      <div class="pbtns">${VER_PRECIOS?`<button class="btn btn-fill" onclick="abrirPaq('${p.id}')">Reservar paquete</button>`:`<button class="btn btn-fill" onclick="go('#/contacto')">Solicitar cotización</button>`}<a class="btn" onclick="go('#/paquete/${p.id}')">Ver detalle</a></div>
    </div>`;
  }).join('')||'<p style="color:var(--gris);grid-column:1/-1">No hay paquetes con esos filtros.</p>';
  document.getElementById('countPk').textContent=list.length+(list.length===1?' paquete':' paquetes');
}
function setNivel(n){curNivel=n;document.querySelectorAll('#subPk button').forEach(b=>b.classList.toggle('on',b.dataset.niv===n));pintarPaquetes();}
function setGrupo(g){curGrupo=g;document.querySelectorAll('#subEq button').forEach(b=>b.classList.toggle('on',b.dataset.g===g));pintar();}

const DESTACADOS=["esa620","sp-sim","defib"];
function pintarDestacados(){
  const g=document.getElementById('eqHome');if(!g)return;
  if(!CATALOGO_LISTO){ g.innerHTML=huesoEq(3); return; }
  g.innerHTML=DESTACADOS.map(id=>byId(id)).filter(Boolean).map(cardEq).join('');
}
/* Primer pintado: solo marcadores. Los datos reales los pinta
   aplicarDatos() en js/07-router.js cuando llega la primera fuente buena. */
buildFacetsEq();pintar();pintarPaquetes();pintarDestacados();
function setView(v){
  const eq=v==='eq', pk=v==='pk', cu=v==='custom';
  document.getElementById('viewEq').style.display=eq?'':'none';
  document.getElementById('viewPk').style.display=pk?'':'none';
  document.getElementById('viewCustom').style.display=cu?'':'none';
  document.getElementById('segEq').classList.toggle('on',eq);
  document.getElementById('segPk').classList.toggle('on',pk);
  document.getElementById('segCustom').classList.toggle('on',cu);
  const side=document.getElementById('filtersSide'), lay=document.getElementById('catLayout');
  if(cu){side.style.display='none';lay.classList.add('nofilters');buildCustom();}
  else{side.style.display='';lay.classList.remove('nofilters');if(eq){buildFacetsEq();pintar();}else{buildFacetsPk();pintarPaquetes();}}
  side.classList.remove('open');
}
function toggleFiltros(){document.getElementById('filtersSide').classList.toggle('open');}



/* ── Carrusel de las tarjetas del catálogo ────────────────────────────
   Pasa solo cada 5 s, y únicamente en las tarjetas que están a la vista:
   una rejilla con doce equipos no debe estar animando lo que nadie mira.
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
   una foto te sacaría de la página. Y se marca la tarjeta como tocada para
   que deje de girar sola mientras alguien la mira. */
function eqcarMover(ev, paso){
  ev.stopPropagation(); ev.preventDefault();
  const c = ev.currentTarget.closest('.eqcar'); if(!c) return;
  eqcarIr(c, (+c.dataset.i || 0) + paso);
  c.dataset.tocado = Date.now();
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
setInterval(()=>{
  if(document.hidden) return;
  document.querySelectorAll('.eqcar').forEach(c=>{
    if(!c.offsetParent || c.querySelectorAll('img').length<2) return;
    const r=c.getBoundingClientRect();
    if(r.bottom<0 || r.top>innerHeight) return;        // fuera de pantalla, no gasta
    if(Date.now() - (+c.dataset.tocado||0) < 15000) return;  // alguien la está pasando a mano
    /* Como las fotos se piden solo cuando hacen falta, la siguiente puede no
       haber llegado. Se pide y se pasa en el turno siguiente, ya cargada: es
       preferible esperar cinco segundos más a enseñar un hueco. */
    const im = c.querySelectorAll('img');
    const sig = ((+c.dataset.i||0) + 1) % im.length, f = im[sig];
    if(f && f.dataset.src){ f.src = f.dataset.src; f.removeAttribute('data-src'); return; }
    if(f && !f.naturalWidth) return;          // pedida, aún en camino
    eqcarIr(c, sig);
  });
},5000);

;
/* ===== js/04-personaliza.js ===== */
/* ---- PERSONALIZA TU PAQUETE ---- */
const CUSTOM={sel:new Set(),kit:false};
function buildCustom(){
  /* Con CONFIG.MOSTRAR_PRECIOS en false no debe verse ningún precio.
     Antes esta lista los mostraba igual, saltándose el interruptor.  */
  const pz = txt => VER_PRECIOS ? `<span class="cp">${txt}</span>` : '';
  const groups=[['ansim','Analizadores y simuladores'],['med','Instrumentos de medición'],['elec','Medidores eléctricos']];
  let html=groups.map(([g,label])=>{
    const items=EQUIPOS.filter(e=>e.g===g&&!e.apoyo);
    if(!items.length)return '';
    return `<div class="cgroup"><div class="cgh">${label}</div>`+items.map(e=>`<label class="citem"><input type="checkbox" value="${e.id}" ${CUSTOM.sel.has(e.id)?'checked':''} onchange="toggleCustom('${e.id}',this.checked)"><span class="cn">${e.nom}</span>${pz('S/ '+e.dia+'/día')}</label>`).join('')+`</div>`;
  }).join('');
  html+=`<div class="cgroup"><div class="cgh">Extra</div><label class="citem"><input type="checkbox" ${CUSTOM.kit?'checked':''} onchange="toggleKit(this.checked)"><span class="cn">Kit de herramientas de apoyo (set 46 pzs + destornillador eléctrico)</span>${pz('+ S/ '+KIT_DIA+'/día')}</label></div>`;
  document.getElementById('customList').innerHTML=html;
  renderCustomSummary();
}
function toggleCustom(id,on){on?CUSTOM.sel.add(id):CUSTOM.sel.delete(id);renderCustomSummary();}
function toggleKit(on){CUSTOM.kit=on;renderCustomSummary();}
function customDisc(n){if(n>=4)return DESC_COMB["4"]||0.15;return DESC_COMB[String(n)]||0;}
function customCalc(){
  let sum=0;CUSTOM.sel.forEach(id=>sum+=byId(id).dia);
  const disc=customDisc(CUSTOM.sel.size);
  let dia=sum*(1-disc); if(CUSTOM.kit)dia+=KIT_DIA;
  return {sum,disc,dia:Math.round(dia)};
}
function renderCustomSummary(){
  const c=customCalc(), n=CUSTOM.sel.size;
  const items=[...CUSTOM.sel].map(id=>byId(id).nom);
  document.getElementById('customSummary').innerHTML=
    `<div class="csh">Tu paquete</div>`+
    (n?`<ul class="csel">${items.map(x=>`<li>${x}</li>`).join('')}${CUSTOM.kit?'<li>Kit de herramientas de apoyo</li>':''}</ul>`:`<div class="cempty">Aún no eliges instrumentos. Marca los que necesites a la izquierda.</div>`)+
    (n&&VER_PRECIOS?`<div class="crow"><span>Suma instrumentos</span><span>S/ ${fmt(c.sum)}/día</span></div>`:'')+
    (c.disc&&VER_PRECIOS?`<div class="crow disc"><span>Descuento por combinar (${Math.round(c.disc*100)}%)</span><span>− S/ ${fmt(Math.round(c.sum*c.disc))}</span></div>`:'')+
    (CUSTOM.kit&&VER_PRECIOS?`<div class="crow"><span>Kit de apoyo</span><span>+ S/ ${fmt(KIT_DIA)}</span></div>`:'')+
    (VER_PRECIOS
      ?`<div class="ctot"><span>Total por día</span><span>S/ ${fmt(c.dia)}</span></div>`
      +`<button class="btn btn-fill" ${n<1?'disabled':''} onclick="reservarCustom()">Reservar mi paquete</button>`
      +`<div class="cnote">Precio con IGV incluido. Al reservar eliges por día, semana, mes, etc.</div>`
      :`<div class="ctot"><span>Total por día</span><span style="font-size:16px;color:var(--gris)">Consultar</span></div>`
      +`<button class="btn btn-fill" ${n<1?'disabled':''} onclick="go('#/contacto')">Solicitar cotización</button>`
      +`<div class="cnote">Arma tu combinación y envíanosla: te respondemos con la tarifa y la disponibilidad.</div>`);
}
function reservarCustom(){
  const c=customCalc(); if(c.dia<=0)return;
  const n=CUSTOM.sel.size;
  const nom='Paquete personalizado ('+n+' instrumento'+(n!==1?'s':'')+(CUSTOM.kit?' + kit':'')+')';
  openModal(nom,'Paquete personalizado · IGV incluido',{equipo:precioEquipo(c.dia),hora:precioHora(c.dia),dia:c.dia,semana:c.dia*4,mes:c.dia*12},eqConds(),techRates(8),true,'dia');
}

/* Selector de equipos del formulario de contacto.
   ANTES: se llenaba una sola vez, al cargar el archivo, con los datos de
   respaldo — y nunca se actualizaba. Si la hoja tenía un equipo nuevo,
   el cliente no podía elegirlo. Ahora lo repinta el router cada vez que
   llegan datos buenos, conservando lo que el usuario ya había elegido. */
function pintarSelectContacto(){
  const sel=document.getElementById('cEq'); if(!sel)return;
  const previo=sel.value;
  sel.innerHTML='<option value="">— Selecciona —</option>'+
    EQUIPOS.map(e=>`<option value="${e.nom}">${e.nom}</option>`).join('')+
    '<option value="Otro / no está en la lista">Otro / no está en la lista</option>';
  if(previo){
    const op=[...sel.options].find(o=>o.value===previo);
    if(op) sel.value=previo;
  }
}
pintarSelectContacto();

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
  const isA=e.apoyo;
  const priceHTML=isA
    ?`<div class="pricebox"><span class="pp" style="font-size:19px">Complementaria</span><span class="pu">· incluida en paquetes de Mantenimiento</span></div>`
    :(VER_PRECIOS
      ?`<div class="pricebox"><span class="desde-d">Desde</span><span class="pp">S/ ${precioHora(e.dia)}</span><span class="pu">/ hora · IGV incluido</span><span class="tag">${e.tier}</span></div>`
      :`<div class="pricebox"><span class="pp" style="font-size:21px">Consultar tarifa</span><span class="pu">· te respondemos con precio y disponibilidad</span><span class="tag">${e.tier}</span></div>`);
  const btnsHTML=isA
    ?`<div class="dbtns"><a class="btn btn-lg" onclick="go('#/contacto')">Consultar</a></div>`
    :(VER_PRECIOS
      ?`<div class="dbtns"><button class="btn btn-fill btn-lg" onclick="abrir(${idx})">Reservar por días</button><a class="btn btn-lg" onclick="go('#/contacto')">Consultar</a></div>`
      :`<div class="dbtns"><a class="btn btn-fill btn-lg" onclick="go('#/contacto')">Solicitar cotización</a></div>`);
  /* Bloque de calibración: fechas y certificado (hoja Equipos, columnas cal_*). */
  const calHTML=(e.cal_fin||e.cal_pdf)?`<div class="spec"><div class="sh">Certificado de calibración</div>`
    +(e.cal_ini?`<div class="row"><span class="l">Emitido</span><span class="v">${e.cal_ini}</span></div>`:'')
    +(e.cal_fin?`<div class="row"><span class="l">Vigente hasta</span><span class="v">${e.cal_fin}</span></div>`:'')
    +(e.cal_pdf?`<div class="row"><span class="l">Documento</span><span class="v"><a href="${e.cal_pdf}" target="_blank" rel="noopener">Ver certificado</a></span></div>`:'')
    +`</div>`:'';
  const tarifasHTML=(isA||!VER_PRECIOS)?'':`<div class="spec"><div class="sh">Tarifas de alquiler</div><div class="row"><span class="l">Día</span><span class="v">S/ ${fmt(e.dia)}</span></div><div class="row"><span class="l">Semana</span><span class="v">S/ ${fmt(e.sem)}</span></div><div class="row"><span class="l">Mes</span><span class="v">S/ ${fmt(e.mes)}</span></div></div>`;
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
        ${(isA||!VER_PRECIOS)?'':`<div class="pmodbig">Modalidades (IGV incluido): &nbsp;por equipo S/ ${precioEquipo(e.dia)} &nbsp;·&nbsp; por hora S/ ${precioHora(e.dia)} &nbsp;·&nbsp; por día S/ ${e.dia} &nbsp;·&nbsp; semana S/ ${fmt(e.dia*4)} &nbsp;·&nbsp; mes S/ ${fmt(e.dia*12)}</div><div class="modnote">Van de menor a mayor; el precio principal es por día. Elige la modalidad al reservar.</div>`}
        <div class="ddesc">${e.desc}</div>
        ${btnsHTML}
        ${e.ficha?`<a class="btn-ficha" href="${e.ficha}" target="_blank" rel="noopener">Ver ficha técnica (PDF)</a>`:`<div class="ficha-soon">Ficha técnica (PDF) · próximamente</div>`}
        <div class="dnote">${isA?'Complementaria. Se entrega dentro de los paquetes de Mantenimiento.':'Se entrega con su certificado de calibración vigente.'}</div>
        ${calHTML}${tarifasHTML}${specRows?`<div class="spec"><div class="sh">Ficha técnica</div>${specRows}</div>`:''}
      </div>
    </div>`;
  window._galItems=items;
  setTimeout(galSiguienteFoto, 400);   // tras dar tiempo a la portada
}
function renderPaquete(id){
  const p=PAQUETES.find(x=>x.id===id);
  const body=document.getElementById('equipoBody');
  if(!p){body.innerHTML='<div class="pagehead"><h1>Paquete no encontrado</h1></div>';return;}
  const items=p.items.map(x=>byId(x));
  const rows=items.map(e=>`<div class="row" onclick="go('#/equipo/${e.id}')"><span>${e.nom}</span><span class="v">${VER_PRECIOS?'S/ '+e.dia+'/día':'consultar'}</span></div>`).join('');
  const kitRows=p.kit.map(k=>`<div class="row"><span>${APOYO[k]}</span><span class="v">incluido</span></div>`).join('');
  const kitBlock=p.kit.length?`<div class="pkinc"><div class="sh">Kit de intervención (+ S/ ${KIT_DIA}/día)</div>${kitRows}</div>`:'';
  /* Galería del paquete: fotos del conjunto (hoja Paquetes, columnas foto / fotos). */
  const pkFotos=(p.fotos&&p.fotos.length)?p.fotos:(p.foto?[p.foto]:[]);
  const pkGal=pkFotos.length
    ? pkFotos.map(u=>`<img src="${fotoURL(u,900)}" alt="${p.nom}">`)
    : items.map(e=>device(e));
  const pkMini=pkFotos.length
    ? pkFotos.map(u=>`<img src="${fotoURL(u,200)}" alt="${p.nom}">`)
    : pkGal;
  body.innerHTML=`
    <div class="crumb"><a onclick="go('#/catalogo')">Catálogo</a> &nbsp;/&nbsp; Paquetes &nbsp;/&nbsp; ${p.nom}</div>
    <div class="detail">
      <div class="gallery">
        <div class="main" id="galMain">${pkGal[0]}<span class="gp"></span></div>
        <div class="thumbs">${pkMini.map((it,i)=>`<div class="thumb ${i===0?'on':''}" onclick="swapPk(${i})">${it}</div>`).join('')}</div>
      </div>
      <div class="dinfo">
        <div class="dcat">Paquete · ${p.nivel}</div>
        <h1>${p.nom}</h1>
        <div class="dmarca">${items.length} instrumentos${p.kit.length?' + kit de intervención':''}</div>
        ${VER_PRECIOS?`<div class="pricebox"><span class="pp">S/ ${p.dia}</span><span class="pu">/ día · IGV incluido</span></div>
        <div class="pmodbig">Modalidades (IGV incluido): &nbsp;por equipo S/ ${p.pe} &nbsp;·&nbsp; por hora S/ ${p.ph} &nbsp;·&nbsp; por día S/ ${p.dia} &nbsp;·&nbsp; semana S/ ${fmt(p.psem)} &nbsp;·&nbsp; mes S/ ${fmt(p.pmes)}</div>`
        :`<div class="pricebox"><span class="pp" style="font-size:21px">Consultar tarifa</span><span class="pu">· te respondemos con precio y disponibilidad</span></div>`}
        <div class="modnote">Van de menor a mayor: a más tiempo, menor precio por equipo. En 1 h se atienden ~${p.eqh} equipos; en un día (7 h efectivas) hasta ~${p.eqd}. Elige la modalidad al reservar.</div>
        <div class="ddesc">${p.desc}</div>
        <div class="dbtns">${VER_PRECIOS?`<button class="btn btn-fill btn-lg" onclick="abrirPaq('${p.id}')">Reservar paquete</button><a class="btn btn-lg" onclick="go('#/contacto')">Consultar</a>`:`<a class="btn btn-fill btn-lg" onclick="go('#/contacto')">Solicitar cotización</a>`}</div>
        <div class="dnote">Cada instrumento del paquete se entrega con su certificado de calibración vigente.</div>
        ${VER_PRECIOS?`<div class="spec"><div class="sh">Tarifas del paquete</div><div class="row"><span class="l">Día</span><span class="v">S/ ${fmt(p.dia)}</span></div><div class="row"><span class="l">Semana</span><span class="v">S/ ${fmt(p.psem)}</span></div><div class="row"><span class="l">Mes</span><span class="v">S/ ${fmt(p.pmes)}</span></div></div>`:''}<div class="pkinc"><div class="sh">Instrumentos (${items.length})</div>${rows}</div>${kitBlock}
      </div>
    </div>`;
  window._pkItems=items; window._pkGal=pkGal;
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
  css.rel='stylesheet'; css.href='css/13-clientes.css?v=85cfb547';
  document.head.appendChild(css);
  /* panel de expedientes (proyectos tipo "expediente"): sólo se carga con el portal,
     el resto del sitio no paga sus ~120 KB */
  const cssEx=document.createElement('link');
  cssEx.rel='stylesheet'; cssEx.href='css/15-expediente.css?v=85cfb547';
  document.head.appendChild(cssEx);
  ['js/06-expediente.js?v=85cfb547','js/06-tablero.js?v=85cfb547'].forEach(src=>{ const e=document.createElement('script'); e.src=src; e.async=false; document.head.appendChild(e); });

  const js=document.createElement('script');
  js.src='js/06-clientes.js?v=85cfb547'; js.async=false;      // async=false: se ejecuta después de los dos anteriores, en orden
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
const PAGES={'':'page-home','#/':'page-home','#/nosotros':'page-nosotros','#/servicios':'page-servicios','#/talleres':'page-talleres','#/catalogo':'page-catalogo','#/clientes':'page-clientes','#/contacto':'page-contacto'};
function go(hash){location.hash=hash;closeMenu();}
function route(sinMover){
  const h=location.hash||'#/';
  let pageId, navKey;
  if(h.startsWith('#/equipo/')){renderEquipo(h.split('/')[2]);pageId='page-equipo';navKey='#/catalogo';}
  else if(h.startsWith('#/paquete/')){renderPaquete(h.split('/')[2]);pageId='page-equipo';navKey='#/catalogo';}
  else if(h.startsWith('#/proyecto/')){renderProyecto(h.split('/')[2]);pageId='page-equipo';navKey='#/clientes';}
  else if(h.startsWith('#/catalogo/')){
    const g=h.split('/')[2]||'';pageId='page-catalogo';navKey='#/catalogo';
    if(g==='paquetes')setView('pk');
    else if(g==='custom')setView('custom');
    else{setView('eq');setGrupo(GRUPOS[g]?g:'all');}
  }
  else{pageId=PAGES[h]||'page-home';navKey=h;}
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

  const primeraVez = !CATALOGO_LISTO;
  const fCat = firmaCatalogo(d);
  const cambioCat = (fCat !== HUELLA_CAT);

  if(cambioCat){
    HUELLA_CAT = fCat;
    if(Array.isArray(d.equipos)  && d.equipos.length)  EQUIPOS  = d.equipos;
    if(Array.isArray(d.paquetes) && d.paquetes.length) PAQUETES = d.paquetes;
    if(d.modelo){
      const m=d.modelo;
      if(m.instrumentista_dia!=null) TEC_DIA=m.instrumentista_dia;
      if(m.instrumentista_min!=null) TEC_MIN=m.instrumentista_min;
      if(m.kit_dia!=null) KIT_DIA=m.kit_dia;
      if(m.descuento_combinar) DESC_COMB=m.descuento_combinar;
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
  seguro('paquetes',     ()=>pintarPaquetes());
  seguro('destacados',   ()=>pintarDestacados());
  seguro('form contacto',()=>pintarSelectContacto());
}
/* Pintado completo. Solo se usa como último recurso, cuando no llegó
   ninguna fuente y hay que mostrar los datos de respaldo.            */
function repintarTodo(){
  repintarCatalogo();
  seguro('proyectos', ()=>pintarProyectos());
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
let actual=null;
function techRates(eqd){return {equipo:TEC_DIA/(eqd||8), hora:TEC_DIA/7, dia:TEC_DIA, semana:TEC_DIA*4, mes:TEC_DIA*12};}
const MODLBL={equipo:['Precio por equipo','Equipos','Cantidad de equipos a atender'],hora:['Precio por hora','Horas','Cantidad de horas'],dia:['Precio por día','Días','Días'],semana:['Precio por semana','Semanas','Cantidad de semanas'],mes:['Precio por mes','Meses','Cantidad de meses']};
function pkgConds(p){return {equipo:'Pagas por cada equipo atendido. Ideal para 1–2 equipos.',hora:`Por hora de servicio. En 1 h se atienden ~${p.eqh} equipos.`,dia:`Jornada de 7 h efectivas (8 h − 1 h de almuerzo). Hasta ~${p.eqd} equipos.`,semana:'Tarifa semanal: equivale a 4 días (descuento por volumen).',mes:'Tarifa mensual: equivale a 12 días (mayor descuento).'};}
function eqConds(){return {equipo:'Pagas por cada equipo que atiendas con el instrumento.',hora:'Por hora de uso del instrumento.',dia:'Jornada de 7 h efectivas (8 h − 1 h de almuerzo).',semana:'Tarifa semanal: equivale a 4 días.',mes:'Tarifa mensual: equivale a 12 días.'};}
function openModal(nom,marca,prices,conds,tec,igvInc,mod0){
  if(!VER_PRECIOS){ go('#/contacto'); return; }   // precios ocultos: se cotiza por contacto
  actual={nom,prices,conds,tec,igvInc:!!igvInc,mod:'dia'};
  document.getElementById('mTitulo').textContent=nom;
  document.getElementById('mMarca').textContent=marca;
  document.getElementById('d1').value='';document.getElementById('d2').value='';
  document.getElementById('nQty').value='1';
  setMod(mod0||'hora');
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
  document.getElementById('cTecUnitLbl').textContent={equipo:'Por equipo',hora:'Por hora',dia:'Por día',semana:'Por semana',mes:'Por mes'}[m];
  document.getElementById('cTecQtyLbl').textContent=L[1];
  document.getElementById('cDia').textContent='S/ '+actual.prices[m];
  document.getElementById('modCond').textContent=actual.conds[m]||'';
  calc();
}
function clearCalc(){['cDias','cSub','cIgv','cTot','cTecUnit','cTecQty','cTec','cGrand'].forEach(id=>document.getElementById(id).textContent='—');}
function abrirPaq(id){const p=PAQUETES.find(x=>x.id===id);openModal(p.nom,'Paquete '+p.nivel+' · IGV incluido',{equipo:p.pe,hora:p.ph,dia:p.dia,semana:p.psem,mes:p.pmes},pkgConds(p),techRates(p.eqd),true,'dia');}
function abrir(idx){
  const e=EQUIPOS[idx];
  openModal(e.nom, e.marca, {equipo:precioEquipo(e.dia), hora:precioHora(e.dia), dia:e.dia, semana:e.dia*4, mes:e.dia*12}, eqConds(), techRates(8), true, 'hora');
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
  const tunit=actual.tec[m]||0;
  const rentTot=qty*unit, rSub=rentTot/1.18, rIgv=rentTot-rSub;
  const tecTot=Math.max(TEC_MIN, qty*tunit), grand=rentTot+tecTot;
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
  a.href = 'https://wa.me/' + n + '?text=' + encodeURIComponent(texto);
  a.target = '_blank'; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
}

/* ── formulario de contacto ─────────────────────────────────────────── */
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
  const modLbl = { equipo:'por equipo', hora:'por hora', dia:'por día', semana:'por semana', mes:'por mes' }[actual.mod] || actual.mod;

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
