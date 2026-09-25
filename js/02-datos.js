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

function fotoURL(u, ancho){
  if(!u) return u;
  /* Si la foto ya está en el sitio, se sirve de aquí. Medido en el
     navegador con las mismas 30 fotos a la vez: desde Drive llegaron 4
     y fallaron 26 con «429 demasiadas peticiones»; desde aquí, las 30
     en una décima de segundo. Google limita cuántas imágenes sirve por
     navegador, y una ficha con cinco fotos se pasa de la raya. */
  const id = (u.match(/(?:\/d\/|id=|\/file\/d\/)([A-Za-z0-9_-]{20,})/) || [])[1];
  if(id && FOTOS_LOCALES[id]) return FOTOS_LOCALES[id];
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

