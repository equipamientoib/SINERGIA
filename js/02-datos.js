
let EQUIPOS = [
  {id:"esa620", cat:"Analizador eléctrico", g:"ansim", scr:"ecg", code:"ESA620", photo:"img/tienda/esa620.jpg", nom:"Analizador de seguridad eléctrica", marca:"Fluke ESA620 · EE.UU.", tier:"Premium", dia:270, sem:1080, mes:3240, ficha:"",
   desc:"Analizador de seguridad eléctrica biomédico que verifica el cumplimiento de las normas IEC 62353 e IEC 60601-1. Mide corrientes de fuga, resistencia de tierra y aislamiento, con selección de partes aplicadas y simulación de fallas. Ideal para validaciones post-mantenimiento y auditorías; llega con certificado de calibración vigente.",
   specs:{"Marca":"Fluke","Modelo":"ESA620","Origen":"Estados Unidos","Normas":"IEC 62353 · 60601-1","Calibración":"Certificado vigente"}},
  {id:"defib", cat:"Analizador de desfibrilador", g:"ansim", scr:"pulse", code:"DEFIB", nom:"Analizador de desfibriladores", marca:"Meditech MDP-8082255 · China", tier:"Estándar", dia:228, sem:912, mes:2736, ficha:"",
   desc:"Analizador de desfibriladores que mide la energía entregada (joules) sobre carga de 50 Ω, el tiempo de carga y la sincronización en cardioversión. Permite comprobar que el equipo descarga dentro de la tolerancia del fabricante, en modo manual y sincronizado. Incluye certificado de calibración vigente.",
   specs:{"Marca":"Meditech","Modelo":"MDP-8082255","Origen":"China","Uso":"Desfibriladores"}},
  {id:"ms400", cat:"Simulador de paciente", g:"ansim", scr:"ecg", code:"MS400", nom:"Simulador ECG", marca:"Contec MS400 · China", tier:"Estándar", dia:195, sem:780, mes:2340, ficha:"",
   desc:"Simulador de paciente multiparamétrico para monitores y electrocardiógrafos. Genera ECG con ritmo normal y arritmias seleccionables, además de señales de respiración, para verificar la respuesta y exactitud del equipo sin un paciente real. Incluye certificado de calibración vigente.",
   specs:{"Marca":"Contec","Modelo":"MS400","Origen":"China","Parámetros":"ECG · Resp · Temp"}},
  {id:"sp-sim", cat:"Simulador SpO2", g:"ansim", scr:"ecg", code:"SP-SiM", photo:"img/tienda/sp-sim.jpg", nom:"Simulador de SpO2 para pulsioxímetros", marca:"Rigel SP-SiM · Reino Unido", tier:"Premium", dia:252, sem:1008, mes:3024, ficha:"",
   desc:"Probador y simulador de SpO₂ para pulsioxímetros y módulos de oximetría. Simula distintos niveles de saturación, frecuencia de pulso e índice de perfusión, compatible con las principales marcas mediante curvas R. Verificación rápida y trazable; llega con certificado de calibración vigente.",
   specs:{"Marca":"Rigel","Modelo":"SP-SiM","Origen":"Reino Unido","Uso":"Verificación SpO2"}},
  {id:"fluke-945", cat:"Sonómetro", g:"med", scr:"num", code:"dB", nom:"Sonómetro", marca:"Fluke 945 · EE.UU.", tier:"Premium", dia:108, sem:432, mes:1296, ficha:"",
   desc:"Sonómetro digital para medir el nivel de presión sonora (dB) con ponderaciones A y C. Útil para verificar niveles de ruido en quirófanos, unidades dentales y salas de equipos, como apoyo al control de condiciones ambientales. Incluye certificado de calibración vigente.",
   specs:{"Marca":"Fluke","Modelo":"945","Origen":"Estados Unidos","Uso":"Nivel de ruido (dB)"}},
  {id:"fluke-51", cat:"Termómetro", g:"med", scr:"num", code:"°C", nom:"Termómetro digital (tipo termocupla)", marca:"Fluke 51 II · EE.UU.", tier:"Premium", dia:90, sem:360, mes:1080, ficha:"",
   desc:"Termómetro digital de alta precisión con entrada de termocupla tipo J/K y resolución de 0,1°. Ideal para verificar la temperatura de incubadoras, baños térmicos y refrigeración de medicamentos. Robusto para campo; llega con certificado de calibración vigente.",
   specs:{"Marca":"Fluke","Modelo":"51 II","Origen":"Estados Unidos","Entrada":"Termocupla tipo K"}},
  {id:"manometro", cat:"Manómetro", g:"med", scr:"gauge", code:"BAR", nom:"Manómetro diferencial digital", marca:"Genérico · China", tier:"Estándar", dia:117, sem:468, mes:1404, ficha:"",
   desc:"Manómetro diferencial digital para pruebas de presión y verificación de presión no invasiva (NIBP) en monitores y equipos neumáticos. Mide presión positiva y diferencial con lectura clara, útil para comprobar canales, fugas y exactitud de manguitos. Incluye certificado de calibración vigente.",
   specs:{"Marca":"Genérico","Origen":"China","Uso":"Presión / NIBP"}},
  {id:"luxometro", cat:"Luxómetro", g:"med", scr:"num", code:"LUX", nom:"Luxómetro", marca:"TASI TA630B · China", tier:"Estándar", dia:59, sem:236, mes:708, ficha:"",
   desc:"Luxómetro digital para medir el nivel de iluminación (lux) en quirófanos y áreas clínicas. Permite verificar que las lámparas cialíticas y la iluminación general cumplan los niveles adecuados. Portátil y de lectura inmediata; llega con certificado de calibración vigente.",
   specs:{"Marca":"TASI","Modelo":"TA630B","Origen":"China","Uso":"Iluminación (lux)"}},
  {id:"tacometro", cat:"Tacómetro", g:"med", scr:"num", code:"RPM", nom:"Tacómetro dual (contacto / óptico)", marca:"TASI TA500C · China", tier:"Estándar", dia:59, sem:236, mes:708, ficha:"",
   desc:"Tacómetro digital de doble modo (contacto y óptico) para medir velocidad de rotación (rpm) en centrífugas y equipos rotativos. El modo óptico mide sin contacto con cinta reflectante. Ideal para verificar la velocidad real frente al valor programado. Incluye certificado de calibración vigente.",
   specs:{"Marca":"TASI","Modelo":"TA500C","Origen":"China","Modo":"Contacto / óptico"}},
  {id:"multimetro", cat:"Multímetro", g:"elec", scr:"num", code:"V", nom:"Multímetro digital", marca:"Sanwa CD771 · Japón", tier:"Premium", dia:65, sem:260, mes:780, ficha:"",
   desc:"Multímetro digital profesional para medir tensión (CA/CC), corriente, resistencia, continuidad, frecuencia y capacitancia. Herramienta base para el diagnóstico eléctrico y electrónico durante el mantenimiento de equipos médicos. Robusto y confiable; llega con certificado de calibración vigente.",
   specs:{"Marca":"Sanwa","Modelo":"CD771","Origen":"Japón","Mide":"V · A · Ω · Hz · F"}},
  {id:"set-46", cat:"Herramientas manuales", g:"apoyo", apoyo:true, scr:"tools", code:"46", nom:"Set de herramientas 46 pzs", marca:"Kit técnico · China", tier:"Estándar", ficha:"",
   desc:"Juego de 46 piezas para mantenimiento e intervención técnica en sitio. Complementaria: se incluye en los paquetes de Mantenimiento.",
   specs:{"Marca":"Kit técnico","Origen":"China","Piezas":"46","Uso":"Mantenimiento en sitio"}},
  {id:"destornillador-elec", cat:"Destornillador eléctrico", g:"apoyo", apoyo:true, scr:"tools", code:"SCREW", nom:"Destornillador eléctrico inalámbrico", marca:"Genérico · China", tier:"Estándar", ficha:"",
   desc:"Destornillador eléctrico inalámbrico con puntas para intervención en sitio. Complementaria: se incluye en los paquetes de Mantenimiento.",
   specs:{"Marca":"Genérico","Origen":"China","Tipo":"Inalámbrico","Accesorios":"Juego de puntas"}},
];

const APOYO = {"multimetro":"Multímetro digital Sanwa","destornillador-elec":"Destornillador eléctrico inalámbrico","set-46":"Set de herramientas 46 pzs"};
const KIT=["multimetro","destornillador-elec","set-46"];
let PAQUETES = [
  {id:"pkg-monitores-cal", app:"Monitores de paciente", nivel:"Calibración", nom:"Pack Monitores de paciente · Calibración", items:["esa620","sp-sim","ms400","manometro"], kit:[], pe:108, ph:146, dia:624, psem:2496, pmes:7488, eqh:1.5, eqd:10, desc:"Instrumentos para calibrar y certificar monitores: seguridad eléctrica + SpO2 + ECG/multiparámetro + presión (NIBP)."},
  {id:"pkg-monitores-mant", app:"Monitores de paciente", nivel:"Mantenimiento", nom:"Pack Monitores de paciente · Mantenimiento", items:["esa620","sp-sim","ms400","manometro"], kit:KIT, pe:124, ph:168, dia:718, psem:2872, pmes:8616, eqh:1.5, eqd:10, desc:"Todo lo del paquete de Calibración + multímetro y herramientas de apoyo para mantenimiento preventivo/correctivo en sitio."},
  {id:"pkg-desfib-cal", app:"Desfibriladores", nivel:"Calibración", nom:"Pack Desfibriladores · Calibración", items:["esa620","defib"], kit:[], pe:120, ph:162, dia:693, psem:2772, pmes:8316, eqh:1.5, eqd:10, desc:"Seguridad eléctrica + energía entregada (joules) y sincronía."},
  {id:"pkg-desfib-mant", app:"Desfibriladores", nivel:"Mantenimiento", nom:"Pack Desfibriladores · Mantenimiento", items:["esa620","defib"], kit:KIT, pe:138, ph:186, dia:797, psem:3188, pmes:9564, eqh:1.5, eqd:10, desc:"Todo lo del paquete de Calibración + multímetro y herramientas de apoyo para mantenimiento preventivo/correctivo en sitio."},
  {id:"pkg-centrifugas-cal", app:"Centrífugas", nivel:"Calibración", nom:"Pack Centrífugas · Calibración", items:["esa620","tacometro"], kit:[], pe:75, ph:135, dia:578, psem:2312, pmes:6936, eqh:2, eqd:14, desc:"Seguridad eléctrica + verificación de rpm."},
  {id:"pkg-centrifugas-mant", app:"Centrífugas", nivel:"Mantenimiento", nom:"Pack Centrífugas · Mantenimiento", items:["esa620","tacometro"], kit:KIT, pe:86, ph:155, dia:665, psem:2660, pmes:7980, eqh:2, eqd:14, desc:"Todo lo del paquete de Calibración + multímetro y herramientas de apoyo para mantenimiento preventivo/correctivo en sitio."},
  {id:"pkg-lamparas-cal", app:"Lámparas cialíticas", nivel:"Calibración", nom:"Pack Lámparas cialíticas · Calibración", items:["esa620","luxometro"], kit:[], pe:90, ph:162, dia:693, psem:2772, pmes:8316, eqh:2, eqd:14, desc:"Seguridad eléctrica + nivel de iluminación (lux)."},
  {id:"pkg-lamparas-mant", app:"Lámparas cialíticas", nivel:"Mantenimiento", nom:"Pack Lámparas cialíticas · Mantenimiento", items:["esa620","luxometro"], kit:KIT, pe:103, ph:186, dia:797, psem:3188, pmes:9564, eqh:2, eqd:14, desc:"Todo lo del paquete de Calibración + multímetro y herramientas de apoyo para mantenimiento preventivo/correctivo en sitio."},
  {id:"pkg-dental-cal", app:"Unidad dental", nivel:"Calibración", nom:"Pack Unidad dental · Calibración", items:["esa620","fluke-945","manometro"], kit:[], pe:90, ph:122, dia:520, psem:2080, pmes:6240, eqh:1.5, eqd:10, desc:"Seguridad eléctrica + ruido (sonómetro) + presión (manómetro)."},
  {id:"pkg-dental-mant", app:"Unidad dental", nivel:"Mantenimiento", nom:"Pack Unidad dental · Mantenimiento", items:["esa620","fluke-945","manometro"], kit:KIT, pe:103, ph:140, dia:598, psem:2392, pmes:7176, eqh:1.5, eqd:10, desc:"Todo lo del paquete de Calibración + multímetro y herramientas de apoyo para mantenimiento preventivo/correctivo en sitio."},
];
/* Parámetros del modelo (se sobreescriben desde la hoja vía loadData) */
let TEC_DIA=120;         // instrumentista S/ por día
let TEC_MIN=60;          // mínimo: medio día
let KIT_DIA=40;          // extra kit en "Arma tu paquete"
let DESC_COMB={"2":0.10,"3":0.12,"4":0.15}; // descuentos por combinar

const byId=id=>EQUIPOS.find(e=>e.id===id);
/* Divisores de modalidad para equipos individuales (única fuente de la verdad) */
const DIV_EQUIPO=8, DIV_HORA=6;
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
// galería: foto real (si existe) + vista técnica ilustrada
function galleryItems(e){
  const items=[];
  const fotos=(e.fotos&&e.fotos.length)?e.fotos:(e.photo?[e.photo]:[]);
  fotos.forEach(u=>items.push(`<img src="${u}" alt="${e.nom}">`));
  items.push(device(e));
  return items;
}

