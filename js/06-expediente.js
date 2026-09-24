/* =====================================================================
   06-expediente.js — PANEL DE CLIENTE PARA PROYECTOS TIPO "EXPEDIENTE"
   ---------------------------------------------------------------------
   El portal (06-clientes.js) está hecho para contratos de mantenimiento:
   equipos, intervenciones, valorizaciones. Un expediente técnico de
   equipamiento es otra cosa: anexos N1–N13, metrado por ambiente,
   láminas. Este archivo pinta ese panel.

   CÓMO ENTRA UN EXPEDIENTE AL PORTAL
     · El proyecto lleva  tipo: "expediente"  y  datos: "<url del JSON>".
     · El JSON lo genera el motor del expediente (py run.py web) y se
       publica en el repositorio (data/expediente-<id>.json) o en Drive.
     · Tarjeta, candado y clave son los mismos del portal: 06-clientes.js
       decide por `tipo` a quién le entrega el proyecto una vez abierto.

   PROTOTIPO: mientras el Apps Script no publique el proyecto, se
   declara aquí (EXPEDIENTES_LOCAL) y se mezcla con los que lleguen en
   vivo. Cuando pase al Apps Script, se vacía esta lista y listo.
   ===================================================================== */

const EXPEDIENTES_LOCAL = [
  {
    id: 'huari-2026',
    tipo: 'expediente',
    cliente: 'Municipalidad Distrital de San Marcos · Huari, Áncash',
    titulo: 'Expediente técnico de equipamiento — Centro de Salud San Marcos',
    servicio: 'Contrato 191-2025-MDSM/GM',
    fecha: 'Set 2026',
    /* Render del proyecto, servido desde Drive (RENDER_PAGINA_WEB.png).
       Las imágenes pesadas no van al repositorio: GitHub es limitado y el
       Drive no. Basta con que el archivo esté compartido por enlace.
       El "=w800" se lo pide ya redimensionado: 597 KB en vez de 2,5 MB,
       de sobra para una tarjeta de 312 px aunque la pantalla sea retina. */
    foto: 'https://lh3.googleusercontent.com/d/1Tzls67EtPknY0EO16iWr1fEY4BOHU5xX=w800',
    desc: 'Componente de equipamiento del expediente técnico del C.S. San Marcos (I‑4): ' +
          'metrado por ambiente, anexos N1–N13, memoria de cálculo, presupuesto y planos.',
    estado: 'En curso',
    avance: 0,                       // se actualiza con el JSON
    /* SHA-256 de la clave de demostración «huari26-sb». En producción
       el hash lo calcula el Apps Script a partir de la clave real.    */
    clave_hash: 'bd12755a16dc611d4e3a86a923dd69e0ba2533af53cf6a2743919d47fab10582',
    /* Apps Script que responde `?estado=huari-2026` (interruptor mostrar). Vacío = el del sitio
       (CONFIG.DATA_URL), que es donde está HUARI-26.gs. */
    script: '',
    detalle: true,
    datos: 'data/expediente-huari.json'
  }
];

const EX_DET = {};            // JSON ya descargado por proyecto
let EX_TAB = 'res';           // res | met | pre | pi | obs | doc
let EX_AVANCE_ABIERTO = false; // bloque "Avance del expediente" dentro de Resumen

/* Mezcla los expedientes locales con PROYECTOS (idempotente). */
/* Interruptor "Mostrar": en el Apps Script del sitio cada expediente tiene su archivo
   (HUARI-26.gs, …) con mostrar: true/false; Expedientes.gs responde `?estado=<id>`. Al
   cargar, la web pregunta por cada expediente (en paralelo, tope 8 s); con mostrar:false el
   proyecto desaparece del portal sin tocar la web. Si el script no responde, se muestra. */
const EXPEDIENTES_ESTADO={};                 // id -> {mostrar}
let EX_ESTADO_PEDIDO=false;
function expedienteVisible(id){ const e=EXPEDIENTES_ESTADO[id]; return !e || e.mostrar!==false; }
/* Apps Script atiende UNA petición por vez: si se le pregunta el estado mientras
   trae el catálogo, la del catálogo se pasa del tiempo límite y el portal se queda
   sin los proyectos de la hoja. Por eso el estado se consulta DESPUÉS de que
   lleguen los datos del sitio, de uno en uno, y se guarda en la sesión.        */
const EX_ESTADO_CACHE='sb-ex-estado', EX_ESTADO_MIN=30;
function estadoCacheLeer(){
  try{ const o=JSON.parse(sessionStorage.getItem(EX_ESTADO_CACHE)||'null');
    if(o&&o.t&&(Date.now()-o.t)/60000<EX_ESTADO_MIN) return o.d; }catch(e){}
  return null;
}
function estadoCacheGuardar(){ try{ sessionStorage.setItem(EX_ESTADO_CACHE, JSON.stringify({t:Date.now(), d:EXPEDIENTES_ESTADO})); }catch(e){} }
async function consultarEstadoExpedientes(){
  if(EX_ESTADO_PEDIDO) return; EX_ESTADO_PEDIDO=true;
  const guardado=estadoCacheLeer();
  if(guardado){ Object.assign(EXPEDIENTES_ESTADO, guardado); repintarSiCambio(); return; }
  /* esperar a que el sitio termine con la hoja (o se rinda) antes de preguntar:
     Apps Script atiende de a una, y si se le pregunta antes, la petición del
     catálogo se pasa del tiempo límite y el portal se queda sin proyectos. */
  for(let i=0;i<180 && !(typeof DATOS_LISTOS!=='undefined'&&DATOS_LISTOS);i++) await new Promise(r=>setTimeout(r,500));

  /* Si el portal arrancó con una copia guardada de antes, los interruptores
     llegan unos segundos después, con la respuesta de la hoja. Se le da ese
     margen antes de preguntar nada.                                      */
  for(let i=0;i<16 && !window.EX_SITIO;i++) await new Promise(r=>setTimeout(r,500));

  /* Camino normal: el catálogo ya trajo los interruptores, así que no hay
     nada que preguntar y el cliente no espera detrás de ninguna consulta. */
  if(window.EX_SITIO){
    EXPEDIENTES_LOCAL.forEach(e=>{
      const d=window.EX_SITIO[e.id];
      if(d) EXPEDIENTES_ESTADO[e.id]={mostrar:d.mostrar!==false};
    });
    repintarSiCambio(); estadoCacheGuardar(); return;
  }

  /* Respaldo, sólo si el script todavía es de una versión anterior: se
     pregunta de a uno, despacio y nunca mientras el cliente está dentro
     de un proyecto (cada pregunta le quitaría el turno). */
  await new Promise(r=>setTimeout(r,1500));
  const base=(typeof CONFIG!=='undefined'&&CONFIG.DATA_URL)||'';
  for(const e of EXPEDIENTES_LOCAL.map(e=>Object.assign({},e,{script:e.script||base})).filter(e=>/^https?:/.test(e.script))){
    for(let i=0;i<120 && location.hash.indexOf('#/proyecto/')===0;i++) await new Promise(r=>setTimeout(r,500));
    const ctrl=('AbortController' in window)?new AbortController():null;
    const corte=setTimeout(()=>{ if(ctrl) ctrl.abort(); },10000);
    try{
      const r=await fetch(e.script+(e.script.indexOf('?')>=0?'&':'?')+'estado='+encodeURIComponent(e.id),{cache:'no-store',signal:ctrl?ctrl.signal:undefined});
      const d=await r.json();
      if(d&&d.ok!==false){ EXPEDIENTES_ESTADO[e.id]={mostrar:d.mostrar!==false}; repintarSiCambio(); }
    }catch(x){}                      // sin respuesta: el proyecto se sigue mostrando
    finally{ clearTimeout(corte); }
  }
  estadoCacheGuardar();
}
function repintarSiCambio(){
  const ocultos=EXPEDIENTES_LOCAL.filter(e=>!expedienteVisible(e.id)).length;
  const enLista=(typeof PROYECTOS!=='undefined'?PROYECTOS:[]).filter(p=>EXPEDIENTES_LOCAL.some(e=>e.id===p.id)).length;
  if(ocultos&&enLista){ try{ pintarProyectos(); }catch(x){} try{ if(location.hash.indexOf('#/proyecto/')===0) route(true); }catch(x){} }
}
function mezclarExpedientes(){
  if(typeof PROYECTOS==='undefined') return;
  consultarEstadoExpedientes();
  EXPEDIENTES_LOCAL.forEach(e=>{
    const i=PROYECTOS.findIndex(p=>p.id===e.id);
    if(!expedienteVisible(e.id)){ if(i>=0) PROYECTOS.splice(i,1); return; }
    const d=EX_DET[e.id];
    if(d){ e.avance=d.avance; e.estado=d.avance>=100?'Completado':'En curso'; }
    /* Si el proyecto llega además desde la hoja, se respeta lo que diga la
       hoja, pero lo que allí venga vacío se completa con esta ficha: la
       foto vive aquí y no debe perderse por ese camino.                 */
    if(i<0) PROYECTOS.push(e);
    else PROYECTOS[i]=Object.assign(PROYECTOS[i],{tipo:e.tipo,datos:e.datos},
                                    PROYECTOS[i].foto?{}:{foto:e.foto});
  });
}

/* Trae el dato del expediente (una vez) y actualiza la tarjeta.
   1) fetch del JSON (servidor web o GitHub Pages).
   2) Si falla —p. ej. index.html abierto directo desde la carpeta, donde
      el navegador no deja leer archivos con fetch— carga el .js gemelo
      que deja el dato en window.EXPEDIENTES_DATA[id].
   3) Si tampoco, se muestra un aviso en vez de "cargando" para siempre. */
const EX_ERR = {};
async function cargarExpediente(id, reintento){
  const p=PROYECTOS.find(x=>x.id===id); if(!p||!p.datos) return null;
  if(EX_DET[id]) return EX_DET[id];
  const listo=d=>{ EX_DET[id]=d; delete EX_ERR[id]; mezclarExpedientes(); try{ pintarProyectos(); }catch(e){} return d; };
  const enMemoria=()=>window.EXPEDIENTES_DATA&&window.EXPEDIENTES_DATA[id];
  if(enMemoria()) return listo(enMemoria());
  try{
    const r=await fetch(p.datos,{cache:'no-store'});
    const d=r.ok?await r.json():null;
    if(!d||!d.ok) throw new Error('JSON inválido');
    return listo(d);
  }catch(e){
    const js=p.datos.replace(/\.json(\?.*)?$/,'.js');
    const ok=await new Promise(res=>{
      const s=document.createElement('script'); s.src=js;
      s.onload=()=>res(!!enMemoria()); s.onerror=()=>res(false);
      document.head.appendChild(s);
    });
    if(ok) return listo(enMemoria());
    EX_ERR[id]='No se pudo leer '+p.datos+' ('+e.message+').';
    console.warn('Expediente: '+EX_ERR[id]);
    if(location.hash.indexOf(id)>=0){ try{ pintarExpediente(id); }catch(x){} }
    return null;
  }
}

/* ───────────────────────── encabezado ───────────────────────── */
function renderExpediente(p){
  const body=document.getElementById('equipoBody'); if(!body) return;
  /* El panel del expediente usa (casi) todo el ancho de la pantalla: tablas de
     10 columnas, visor y tablero lo necesitan. El resto del sitio sigue a 1140. */
  body.classList.add('ex-ancho');
  const d=EX_DET[p.id];
  const pr=d?d.proyecto:{};
  const r=d?d.resumen:{};
  body.innerHTML=`
    <div class="crumb"><a onclick="go('#/clientes')">Nuestros clientes</a> &nbsp;/&nbsp; ${p.titulo}</div>
    <header class="pr-head ex-head">
      <div class="ph-eyebrow">
        <span>${p.cliente}</span>
        <span class="ph-estado ${p.estado==='Completado'?'fin':''}">${p.estado}</span>
      </div>
      <h1>${p.titulo}</h1>
      ${pr.nombre?`<p class="ex-nombre">${pr.nombre}</p>`:''}
      <dl class="ph-meta">
        <div><dt>Contrato</dt><dd>${(p.servicio||'').replace(/^Contrato\s*/i,'')||'—'}</dd></div>
        <div><dt>CUI</dt><dd>${pr.cui||'—'}</dd></div>
        <div><dt>Categoría</dt><dd>${pr.categoria||'—'}</dd></div>
        <div><dt>Ubicación</dt><dd>${pr.ubicacion||'—'}${pr.altitud?` · ${pr.altitud} msnm`:''}</dd></div>
        <div><dt>Entrega</dt><dd>${pr.mes||p.fecha||'—'}</dd></div>
        <div><dt>Última generación</dt><dd>${d?d.generado:'—'}</dd></div>
      </dl>
    </header>
    <div id="prDet"></div>`;
  pintarExpediente(p.id);
  if(!d) cargarExpediente(p.id).then(()=>{ if(location.hash.indexOf(p.id)>=0){ renderExpediente(PROYECTOS.find(x=>x.id===p.id)); } });
}

function pintarExpediente(id){
  const cont=document.getElementById('prDet'); if(!cont) return;
  if(typeof tbCerrarMenus==='function') tbCerrarMenus();
  const d=EX_DET[id];
  if(typeof TB_EXP!=='undefined') TB_EXP=d;      // para la descarga en PDF con membrete
  const y=window.pageYOffset;
  let pane='';
  if(!d) pane=EX_ERR[id]?paneExError(id):paneExCargando();
  else if(EX_TAB==='met') pane=paneExMetrado(d);
  else if(EX_TAB==='pre') pane=paneTbPresupuesto(d);
  else if(EX_TAB==='pi') pane=paneTbPreinst(d);
  else if(EX_TAB==='doc') pane=paneExDocs(d);
  else pane=paneTbResumen(d)+`<details class="bloque ex-avance" ${EX_AVANCE_ABIERTO?'open':''} ontoggle="EX_AVANCE_ABIERTO=this.open"><summary><span>Avance del expediente</span><i>${d.avance}% · ${d.resumen.anexos_completos} de ${d.resumen.anexos_total} anexos completos</i></summary><div class="ex-avance-cuerpo">${paneExResumen(d)}</div></details>`;
  cont.innerHTML=`<div class="dash-card det-card ex-card">${tabsEx(id,d)}${pane}</div>`;
  /* En pantallas angostas la barra de pestañas se desplaza: que la activa se vea. */
  const bar=cont.querySelector('.det-tabs'), act=cont.querySelector('.det-tabs button.on');
  if(bar&&act&&bar.scrollWidth>bar.clientWidth) bar.scrollLeft=act.offsetLeft-(bar.clientWidth-act.offsetWidth)/2;
  cerrarVisorCad();                       // el visor vive en Documentación › Planos; se monta al desplegarlo
  if(EX_TAB==='doc' && d) precargarVisor(d);          // se va trayendo el visor mientras mira los documentos
  if(EX_TAB==='doc' && d && EX_DOC_SEC==='visor' && (d.visor||[]).length) setTimeout(()=>montarVisorCad(d),30);
  if(EX_TAB==='met' && d) montarMetrado(d);
  if(EX_TAB==='res' && d) montarTbResumen(d);
  if(EX_TAB==='pre' && d) montarTbPresupuesto(d);
  if(EX_TAB==='pi' && d) montarTbPreinst(d);
  if(EX_TAB==='res' && d){
    setTimeout(()=>{ const b=document.getElementById('exBar'); if(b) b.style.width=d.avance+'%'; },80);
  }
  if(window.pageYOffset!==y) window.scrollTo(0,y);
}

function setExTab(id,t){ EX_TAB=t; pintarExpediente(id); }

function tabsEx(id,d){
  const nAnx=d?`${d.resumen.anexos_completos}/${d.resumen.anexos_total}`:'';
  return `<div class="det-tabs">
    <button type="button" class="${EX_TAB==='res'?'on':''}" onclick="setExTab('${id}','res')">Resumen</button>
    <button type="button" class="${EX_TAB==='met'?'on':''}" onclick="setExTab('${id}','met')">Metrado</button>
    <button type="button" class="${EX_TAB==='pre'?'on':''}" onclick="setExTab('${id}','pre')">Presupuesto</button>
    <button type="button" class="${EX_TAB==='pi'?'on':''}" onclick="setExTab('${id}','pi')">Preinstalación</button>
    <button type="button" class="${EX_TAB==='doc'?'on':''}" onclick="setExTab('${id}','doc')">Documentación</button>
    <div class="det-actu"><span>${d?'Generado el '+d.generado:''}</span></div>
  </div>`;
}

function paneExError(id){
  return `<div class="cargando-proy">
    <p>No se pudo cargar el avance del expediente.</p>
    <span>${esc(EX_ERR[id]||'')} Genera el dato con <code>py run.py web</code> y abre la página desde un servidor
      (<code>node "PAGINA WEB/servidor.js"</code>) o vuelve a intentar.</span>
    <p style="margin-top:12px"><button class="btn btn-fill" onclick="delete EX_ERR['${id}'];pintarExpediente('${id}');cargarExpediente('${id}').then(()=>renderExpediente(PROYECTOS.find(x=>x.id==='${id}')))">Reintentar</button></p>
  </div>`;
}
function paneExCargando(){
  return `<div class="cargando-proy"><div class="cp-barra"><i></i></div>
    <p>Cargando el expediente…</p><span>Estamos trayendo el avance desde el motor de generación.</span></div>`;
}

/* ───────────────────────── helpers ───────────────────────── */
const nf=n=>String(Math.round(Number(n||0))).replace(/\B(?=(\d{3})+(?!\d))/g,' ');   // 1 787
const EX_EST={completo:['ok','Completo'],parcial:['medio','En curso'],pendiente:['pend','Pendiente']};
function pillEx(estado){ const e=EX_EST[estado]||EX_EST.pendiente; return `<span class="eqpill ${e[0]}">${e[1]}</span>`; }
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function titulo(s){
  return String(s||'').toLowerCase()
    .replace(/(^|[^a-záéíóúñü0-9])([a-záéíóúñü])/g,(m,a,b)=>a+b.toUpperCase())
    .replace(/\s(De|Del|La|El|Los|Las|Y|E|O|Con|Para|Por|En|A|Al|Sin)\s/g,m=>m.toLowerCase());
}

/* ───────────────────────── RESUMEN ───────────────────────── */
function paneExResumen(d){
  const r=d.resumen;
  const grupos=d.grupos.map(g=>{
    const pct=g.items?Math.round(g.fichas*100/g.items):0;
    return `<tr>
      <td><span class="ec-cod">${g.grupo}</span></td>
      <td>${g.nombre}</td>
      <td class="n">${nf(g.items)}</td>
      <td class="n">${nf(g.cantidad)}</td>
      <td><div class="ex-mini ${pct<100?'w':''}" title="${g.fichas} de ${g.items} fichas técnicas"><i style="width:${pct}%"></i></div>
          <small>${g.fichas}/${g.items}</small></td>
    </tr>`;}).join('');
  const totI=d.grupos.reduce((n,g)=>n+g.items,0), totC=d.grupos.reduce((n,g)=>n+g.cantidad,0),
        totF=d.grupos.reduce((n,g)=>n+g.fichas,0);
  const hitos=d.hitos.map(h=>`<li class="${h.d?'done':''}"><div><b>${esc(h.t)}</b><small>${esc(h.s)}</small></div></li>`).join('');
  return `
    <div class="avance-band">
      <div><span class="ab-lbl">Avance global del expediente</span>
        <span class="ab-det">${r.anexos_completos} de ${r.anexos_total} anexos completos · ${r.sin_precio} precios y ${r.sin_ficha} fichas por cerrar</span></div>
      <div class="ab-bar"><i id="exBar"></i></div>
      <div class="ab-pct">${d.avance}%</div>
    </div>
    <div class="kpis ex-kpis">
      <div class="kpi"><b>${nf(r.codigos_eq)}</b><span>Códigos de equipamiento<br>${nf(r.unidades_eq)} unidades</span></div>
      <div class="kpi"><b>${nf(r.ambientes)}</b><span>Ambientes equipados<br>${r.upss} UPSS · ${nf(r.filas_distribucion)} filas</span></div>
      <div class="kpi"><b>${nf(r.laminas)}</b><span>Láminas de equipamiento<br>Anexo N12</span></div>
      <div class="kpi ${r.sin_precio?'alerta':''}"><b>${nf(r.sin_precio)}</b><span>Códigos sin precio<br>estudio de mercado</span></div>
      <div class="kpi ${r.sin_ficha?'alerta':''}"><b>${nf(r.sin_ficha)}</b><span>Fichas técnicas por redactar<br>Anexo N13</span></div>
    </div>
    <div class="res-grid">
      <div>
        <div class="tab-head"><h4>Consolidado por grupo genérico</h4><span class="th-nota">Anexo N3A · sólo equipamiento (EQ.)</span></div>
        <table class="ex-tabla">
          <thead><tr><th>Grupo</th><th>Descripción</th><th class="n">Ítems</th><th class="n">Cant.</th><th>Fichas N13</th></tr></thead>
          <tbody>${grupos}
            <tr class="tot"><td></td><td>Total</td><td class="n">${nf(totI)}</td><td class="n">${nf(totC)}</td><td><small>${totF}/${totI}</small></td></tr>
          </tbody>
        </table>
      </div>
      <div>
        <div class="tab-head"><h4>Hitos del expediente</h4></div>
        <ul class="hitos ex-hitos">${hitos}</ul>
        <p class="ex-nota">Codificación según ${Object.keys(r.normas||{}).filter(k=>k.indexOf('NTS')===0).join(' / ')||'NTS'}.
          Los importes del presupuesto se publican al cerrar el estudio de mercado.</p>
      </div>
    </div>`;
}

/* ───────────────────────── METRADO ─────────────────────────
   Matriz F5 (una línea por ambiente × código) con el motor de 06-tablero.js:
   cabeceras con menú tipo Excel (orden + filtro), buscador, paginación,
   totales y descarga.                                                    */
let MET_FILTRO_INICIAL=null;      // lo usa "Ver en Metrado" desde el visor
function paneExMetrado(d){
  CAD.datos=d;
  return `
    <div class="chips ex-chips met-vistas">
      ${MET_VISTAS.map(v=>`<button type="button" class="chip ${MET_VISTA===v.k?'on':''}" data-k="${v.k}" onclick="setMetVista('${v.k}')"><b>${v.num}</b> Anexo ${v.k} · ${v.t}</button>`).join('')}
    </div>
    <div id="metVista"></div>`;
}
function montarMetrado(d){ if(MET_FILTRO_INICIAL) MET_VISTA='N2'; montarVistaMet(d); }

/* ───────────────────────── OBSERVACIONES ───────────────────────── */
/* Las observaciones (pendientes internos) ya no se muestran al cliente: el motor las escribe en 2. EXPEDIENTE/PENDIENTES.md */

/* ───────────────────────── DOCUMENTACIÓN ─────────────────────────
   Dos secciones: los documentos del expediente (memoria, anexos) y los
   planos. Cada fila tiene el PDF (se previsualiza en la web) y el
   editable (Word/Excel/DWG, se descarga). Las URL vienen en el JSON.  */
let EX_DOC_SEC = 'docs';           // docs | planos
const EX_DOC_ABIERTOS = new Set();  // anexos desplegados en Documentación

function alternarDocCad(k){
  const g=document.querySelector(`.ex-doc-grupo[data-k="${k}"]`); if(!g) return;
  const sub=g.nextElementSibling; const abrir=!EX_DOC_ABIERTOS.has(k);
  if(abrir) EX_DOC_ABIERTOS.add(k); else EX_DOC_ABIERTOS.delete(k);
  g.classList.toggle('abierto',abrir); g.querySelector('.ex-desplegar').textContent=abrir?'−':'+';
  if(sub) sub.hidden=!abrir;
}

function nombreArchivo(url){ try{ return decodeURIComponent(url.split('/').pop()); }catch(e){ return url; } }

/* Enlaces a Drive (producción): el atributo download no aplica entre dominios; se abren aparte
   y Drive entrega la descarga. Los locales (prototipo / GitHub) descargan directo. */
function extAttr(url){ return /^https?:\/\//i.test(url||'')?'target="_blank" rel="noopener"':'download'; }
function botonesArchivo(pdf, edit, titulo){
  let h='';
  if(pdf&&pdf.ver){
    h+=`<button type="button" class="ex-btn ver" onclick="verPdfEx('${pdf.ver}','${esc(titulo).replace(/'/g,'&#39;')}','${pdf.descargar||''}')" title="Ver el PDF aquí mismo">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>PDF</button>`;
    h+=`<a class="ex-btn" href="${pdf.descargar||pdf.ver}" ${extAttr(pdf.descargar||pdf.ver)} title="Descargar el PDF${pdf.mb?' · '+pdf.mb+' MB':''}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></a>`;
  }else{
    h+=`<span class="ex-btn off">PDF pendiente</span>`;
  }
  if(edit&&edit.url){
    h+=`<a class="ex-btn edit" href="${edit.url}" ${extAttr(edit.url)} title="Descargar el editable${edit.mb?' · '+edit.mb+' MB':''}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>.${edit.tipo||'docx'}</a>`;
  }
  return `<div class="ex-btns">${h}</div>`;
}

/* Expediente completo: el PDF consolidado (todos los anexos foliados) que arma el motor. */
function paneExConsolidado(c){
  if(!c||!c.url) return '';
  const secs=(c.secciones||[]);
  return `<div class="ex-consolidado">
      <div class="ex-cons-txt">
        <span class="ex-cons-k">Expediente completo</span>
        <b>PDF consolidado del expediente de equipamiento</b>
        <small>${c.folios?`<b>${c.folios}</b> folios · `:''}${c.mb} MB · armado el ${tbEsc(c.fecha||'')}${c.externo?' · alojado en Drive':''} · ${tbEsc(c.nombre||'')}</small>
      </div>
      <div class="ex-cons-btns">
        ${((c.ver||!c.externo)&&(c.mb||0)<=100)?`<button type="button" class="ex-btn ver ex-cons-ver" onclick="verPdfEx('${c.ver||c.url}','Expediente completo · PDF consolidado','${c.url}')" title="Ver el PDF aquí mismo (se va cargando por páginas)">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>Ver PDF</button>`:''}
        <a class="ex-btn ver ex-cons-descarga" href="${c.url}" ${extAttr(c.url)} title="Descargar${c.mb?' · '+c.mb+' MB':''}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Descargar</a>
        ${secs.length?`<button type="button" class="ex-btn edit" onclick="const e=document.getElementById('exFolios');e.hidden=!e.hidden;this.textContent=e.hidden?'Índice de folios':'Ocultar índice'">Índice de folios</button>`:''}
        ${((c.mb||0)>100&&c.ver)?`<a class="ex-btn edit" href="${c.ver.replace('/preview','/view')}" target="_blank" rel="noopener" title="Drive no previsualiza archivos tan grandes: se abre en Drive">Abrir en Drive</a>`:''}
      </div>
      ${secs.length?`<div class="ex-folios" id="exFolios" hidden><table><thead><tr><th>Sección</th><th class="n">Páginas</th><th class="n">Folios</th></tr></thead>
        <tbody>${secs.map(x=>`<tr><td>${tbEsc(x.seccion)}</td><td class="n">${tbEsc(x.paginas)}</td><td class="n">${tbEsc(x.folios)}</td></tr>`).join('')}</tbody></table>
        <p class="ex-nota">FOLIO 001 = última hoja (foliado de atrás hacia adelante, como exige la entidad).</p></div>`:''}
    </div>`;
}
function paneExDocs(d){
  const docs=d.documentos||[], planos=d.planos||[];
  const titulos={}; (d.anexos||[]).forEach(a=>titulos[a.cod]=a.titulo);
  const estadoDe=cod=>{ const a=(d.anexos||[]).find(x=>x.cod===cod); return a?a.estado:''; };
  const detalleDe=cod=>{ const a=(d.anexos||[]).find(x=>x.cod===cod); return a?a.detalle:''; };
  const porAnexo={};
  docs.forEach(x=>{ (porAnexo[x.anexo||'OTROS']=porAnexo[x.anexo||'OTROS']||[]).push(x); });
  const ordenAnexos=(d.anexos||[]).map(a=>a.cod);
  Object.keys(porAnexo).forEach(k=>{ if(k!=='MD'&&k!=='OTROS'&&ordenAnexos.indexOf(k)<0) ordenAnexos.push(k); });
  const tam=x=>`${esc(x.nombre)}${x.editable?' · .'+x.editable.tipo+(x.editable.mb?' '+x.editable.mb+' MB':''):''}${x.pdf&&x.pdf.mb?' · PDF '+x.pdf.mb+' MB':''}`;
  const btns=(pdf,edit,tit)=>botonesArchivo(pdf,edit,tit).replace(/^<div class="ex-btns">|<\/div>$/g,'');

  const fila=(num,tit,x,sub,est)=>`<div class="ex-doc ${sub?'ex-doc-sub':''}">
      <span class="ex-num">${num}</span>
      <div><b>${esc(tit)}</b><small>${tam(x)}</small></div>
      <div class="ex-btns">${est&&est!=='completo'?pillEx(est):''}${btns(x.pdf,x.editable,tit)}</div>
    </div>`;
  const grupo=(clave,num,tit,lista,est,subtit)=>{
    const abierto=EX_DOC_ABIERTOS.has(clave);
    const det=detalleDe(clave);
    return `<div class="ex-doc ex-doc-grupo ${abierto?'abierto':''}" data-k="${clave}" onclick="alternarDocCad('${clave}')">
        <span class="ex-num">${num}</span>
        <div><b>${esc(tit)}</b><small>${subtit||(lista.length+' documentos')}${det&&est&&est!=='completo'?' · '+esc(det):''}</small></div>
        ${est&&est!=='completo'?pillEx(est):''}
        <span class="ex-desplegar" aria-hidden="true">${abierto?'−':'+'}</span>
      </div>
      <div class="ex-sublista" ${abierto?'':'hidden'}>
        ${lista.map((x,i)=>fila(`${num}.${i+1}`,x.titulo,x,true)).join('')}
      </div>`;
  };
  const seccion=(num,tit,nota)=>`<div class="ex-seccion"><span class="ex-num">${num}.</span><b>${tit}</b>${nota?`<span class="th-nota">${nota}</span>`:''}</div>`;

  /* ── Documentación: 1. Memoria · 2. Anexos · 3. Otros ── */
  let hd='';
  const md=porAnexo.MD||[];
  hd+=seccion(1,'Memoria descriptiva');
  hd+=md.length?md.map((x,i)=>fila(md.length>1?`1.${i+1}`:'1',x.titulo,x)).join(''):'<p class="hvacio">Aún no generada.</p>';
  const conDocs=ordenAnexos.filter(k=>porAnexo[k]);
  hd+=seccion(2,'Anexos',`${conDocs.length} anexos · ${docs.filter(x=>x.anexo&&x.anexo!=='MD'&&x.anexo!=='OTROS').length} documentos`);
  conDocs.forEach((k,i)=>{
    const lista=porAnexo[k], num=`2.${i+1}`, tit=`${k} · ${titulos[k]||k}`, est=estadoDe(k);
    hd+=lista.length===1?fila(num,tit,lista[0],false,est):grupo(k,num,tit,lista,est);
  });
  const otros=porAnexo.OTROS||[];
  if(otros.length){ hd+=seccion(3,'Otros documentos'); hd+=otros.map((x,i)=>fila(`3.${i+1}`,x.titulo,x)).join(''); }

  /* ── Planos: láminas en PDF ── */
  const pisos=[...new Set(planos.map(p=>p.piso))].filter(Boolean);
  let hp=seccion(1,'Láminas de equipamiento',`Entrega del ${d.planos_fecha||'—'} · ${planos.length} láminas · ${pisos.length} niveles · ${planos.filter(p=>p.pdf).length} con PDF`);
  hp+=planos.map((p,i)=>`<div class="ex-doc">
      <span class="ex-num">1.${i+1}</span>
      <div><b>${p.lamina} · ${titulo(p.nombre)}</b><small>${p.piso?'Piso '+p.piso+' · ':''}${titulo(p.bloque)} · Esc. ${p.escala}</small></div>
      ${botonesArchivo(p.pdf,null,p.lamina+' · '+titulo(p.nombre))}
    </div>`).join('')||'<p class="hvacio">Sin láminas registradas.</p>';

  /* ── Visor DWG ── */
  const vis=(d.visor||[])[0];
  if(vis){ CAD.datos=d; CAD.actual=vis.nombre; }
  const hv=vis?paneExVisor(d):'<p class="hvacio">No hay plano preparado para el visor (carpeta BIND de la entrega).</p>';

  const chip=(k,t,n)=>`<button type="button" class="chip ${EX_DOC_SEC===k?'on':''}" data-sec="${k}" onclick="setExDocSec('${k}')">${t}<em>${n}</em></button>`;
  return `
    <div class="chips ex-chips ex-docchips">
      ${chip('docs','Documentación',docs.length)}
      ${chip('planos','Planos',planos.length)}
      ${chip('visor','Visor DWG',vis?vis.mb+' MB':'—')}
    </div>
    <div class="ex-docsec" data-sec="docs" ${EX_DOC_SEC==='docs'?'':'hidden'}>
      ${paneExConsolidado(d.consolidado)}
      <div class="det-filtros ex-buscador">
        <input type="search" placeholder="Buscar documento… (título, N7, presupuesto, fichas, nombre de archivo)" oninput="filtrarDocs(this)">
        <span class="det-n" data-total="${docs.length}">${docs.length} documentos</span>
      </div>
      <div class="lista-head"><h4>Índice del expediente</h4><span class="th-nota">Generado el ${d.generado} · ${docs.length} documentos · ${docs.filter(x=>x.pdf).length} con PDF</span></div>
      <div class="ex-lista ex-indice">${hd}</div>
      <p class="ex-nota">Los renglones con <b>+</b> se despliegan (tomos del N13, sub‑memorias del N11, cuadros del N9). El PDF se previsualiza en la web y también se descarga; el editable (Word / Excel) se descarga.</p>
    </div>
    <div class="ex-docsec" data-sec="planos" ${EX_DOC_SEC==='planos'?'':'hidden'}>
      <div class="det-filtros ex-buscador">
        <input type="search" placeholder="Buscar lámina… (EQ-05, zonificación, preinstalación, piso 2)" oninput="filtrarDocs(this)">
        <span class="det-n" data-total="${planos.length}">${planos.length} láminas</span>
      </div>
      <div class="ex-lista ex-indice">${hp}</div>
      <p class="ex-nota">Cada lámina se abre en PDF aquí mismo o se descarga. El plano completo editable está en la pestaña <b>Visor DWG</b>.</p>
    </div>
    <div class="ex-docsec" data-sec="visor" ${EX_DOC_SEC==='visor'?'':'hidden'}>
      ${hv}
    </div>`;
}

/* Buscador de Documentación / Planos: filtra los renglones por texto sin
   repintar. Con texto, los grupos que contienen coincidencias se despliegan;
   las secciones sin resultados se ocultan.                                */
function filtrarDocs(inp){
  const q=(inp.value||'').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
  const norm=t=>(t||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
  const sec=inp.closest('.ex-docsec'); const lista=sec.querySelector('.ex-lista'); if(!lista) return;
  let vistos=0;
  const hijos=[...lista.children];
  hijos.forEach(el=>{
    if(el.classList.contains('ex-doc-grupo')){
      const sub=el.nextElementSibling; const subs=sub?[...sub.querySelectorAll('.ex-doc-sub')]:[];
      let alguno=false;
      subs.forEach(r=>{ const ok=!q||norm(r.innerText).indexOf(q)>=0; r.hidden=!ok; if(ok){alguno=true; if(q) vistos++;} });
      const propio=!q||norm(el.innerText).indexOf(q)>=0;
      if(propio&&q){ subs.forEach(r=>r.hidden=false); alguno=true; vistos+=subs.length; }
      const mostrar=!q||propio||alguno;
      el.hidden=!mostrar;
      if(sub){ sub.hidden=!mostrar||!(q||EX_DOC_ABIERTOS.has(el.dataset.k)); }
      el.classList.toggle('abierto',!sub.hidden); el.querySelector('.ex-desplegar').textContent=sub.hidden?'+':'−';
      if(!q) vistos+=subs.length;
    }else if(el.classList.contains('ex-doc')){
      const ok=!q||norm(el.innerText).indexOf(q)>=0; el.hidden=!ok; if(ok) vistos++;
    }
  });
  /* secciones: ocultar las que quedan sin renglones */
  hijos.forEach((el,i)=>{
    if(!el.classList.contains('ex-seccion')) return;
    let hay=false;
    for(let j=i+1;j<hijos.length&&!hijos[j].classList.contains('ex-seccion');j++){ if(hijos[j].classList.contains('ex-doc')&&!hijos[j].hidden){hay=true;break;} }
    el.hidden=!hay;
  });
  const n=sec.querySelector('.det-n'); if(n){ const tot=n.dataset.total; n.textContent=q?`${vistos} de ${tot}`:`${tot} ${sec.dataset.sec==='planos'?'láminas':'documentos'}`; }
  const vacio=sec.querySelector('.ex-sinres');
  if(q&&!vistos){ if(!vacio){ const p=document.createElement('p'); p.className='hvacio ex-sinres'; p.textContent='Ningún documento coincide con “'+inp.value+'”.'; lista.after(p);} }
  else if(vacio) vacio.remove();
}

/* Cambio de sub-pestaña sin repintar (el visor cargado se conserva). */
function setExDocSec(sec){
  EX_DOC_SEC=sec;
  document.querySelectorAll('.ex-docchips .chip').forEach(c=>c.classList.toggle('on',c.dataset.sec===sec));
  document.querySelectorAll('.ex-docsec').forEach(e=>{ e.hidden=e.dataset.sec!==sec; });
  if(sec==='visor'&&!CAD.viewer&&CAD.datos&&(CAD.datos.visor||[]).length) setTimeout(()=>montarVisorCad(CAD.datos),30);
}

/* Precarga del visor: mientras el cliente está en Documentación se van trayendo,
   con prioridad baja, la librería, la fuente y la planta que se abre primero.
   Así el clic en "Visor DWG" ya no espera la descarga (≈1,5 MB). */
let CAD_PRECARGA=false;
function precargarVisor(d){
  if(CAD_PRECARGA) return; CAD_PRECARGA=true;
  const v=(d&&d.visor||[])[0]; if(!v) return;
  const pz=(v.pisos||[])[0];
  const lista=[['js/lib/dxf-viewer.esm.js','script'],['fonts/Roboto-Latin.ttf','font'],
               [v.datos,'script'],[pz?pz.url:v.url,'script']].filter(x=>x[0]);
  const lanzar=()=>lista.forEach(([href,as])=>{
    const l=document.createElement('link');
    l.rel='prefetch'; l.href=href; l.as=as;
    if(as==='font') l.crossOrigin='anonymous';
    document.head.appendChild(l);
  });
  if(window.requestIdleCallback) requestIdleCallback(lanzar,{timeout:3000}); else setTimeout(lanzar,1200);
}

/* Visor de PDF dentro de la web (misma caja que los informes del portal). */
function verPdfEx(url,titulo,descarga){
  const prev=document.getElementById('pdfOv'); if(prev) prev.remove();
  const ov=document.createElement('div');
  ov.className='pdfov'; ov.id='pdfOv';
  ov.innerHTML=`
    <div class="pdfbox" role="dialog" aria-modal="true" aria-label="${titulo}">
      <div class="pdfhead">
        <span>${titulo}</span>
        <a href="${url}" target="_blank" rel="noopener">Abrir en pestaña nueva</a>
        <a href="${descarga||url}" ${extAttr(descarga||url)}>Descargar</a>
        <button onclick="cerrarPdfEx()" aria-label="Cerrar">✕</button>
      </div>
      <iframe src="${/^https?:/i.test(url)?url:url+'#toolbar=1&view=FitH'}" loading="lazy" allow="autoplay"></iframe>
    </div>`;
  ov.addEventListener('click',ev=>{ if(ev.target===ov) cerrarPdfEx(); });
  document.body.appendChild(ov);
  document.body.classList.add('lock');
}
function cerrarPdfEx(){
  const o=document.getElementById('pdfOv'); if(o) o.remove();
  document.body.classList.remove('lock');
}
document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&document.getElementById('pdfOv')) cerrarPdfEx(); });


/* ───────────────────────── VISOR CAD (pestaña) ─────────────────────────
   Muestra los dibujos de la carpeta BIND de la entrega de planos (el plano
   completo, no las láminas). El motor los deja como <nombre>.dxf.js:
   DXF aligerado, comprimido (gzip) y en base64, que carga como <script>
   —funciona también con index.html abierto desde la carpeta— y se
   descomprime en el navegador. Render: dxf-viewer (three.js) desde CDN. */
let CAD = { viewer:null, mod:null, three:null, actual:'', piso:'', cargando:false, serie:0 };   // piso: 'P1'… o '' = modelo completo

function paneExVisor(d){
  const lista=d.visor||[];
  if(!CAD.actual||!lista.some(v=>v.nombre===CAD.actual)) CAD.actual=lista[0]?lista[0].nombre:'';
  const v=lista.find(x=>x.nombre===CAD.actual)||{};
  /* por defecto se abre la primera planta (la más liviana de cargar), no el modelo entero */
  if(CAD.pisoInicial!==false){ CAD.pisoInicial=false; if(v.pisos&&v.pisos.length) CAD.piso='P'+v.pisos[0].n; }
  if(CAD.piso&&!(v.pisos||[]).some(pz=>'P'+pz.n===CAD.piso)) CAD.piso='';
  return `
    ${(v.pisos&&v.pisos.length)?`<div class="cad-pisos" onclick="event.stopPropagation()"><span class="tb-esp-lbl">Planta</span>
      ${v.pisos.map(pz=>`<button type="button" class="tb-esp-btn ${CAD.piso==='P'+pz.n?'on':''}" onclick="cambiarPisoCad('P${pz.n}')"><b>${esc(pz.nombre)}</b><small>${pz.mb} MB · carga rápida</small></button>`).join('')}
      <button type="button" class="tb-esp-btn ${CAD.piso?'':'on'}" onclick="cambiarPisoCad('')"><b>Todo el modelo</b><small>${v.mb} MB · las ${v.pisos.length} plantas</small></button>
    </div>`:''}
    <div class="cad-barra" onclick="event.stopPropagation()">
      <span class="th-nota">Rueda: zoom · arrastrar: mover · doble clic: encuadrar · clic en un equipo: su ficha</span>
      <button type="button" class="ex-btn" onclick="encuadrarCad()" title="Ver todo el dibujo">Encuadrar</button>
      <button type="button" class="ex-btn" onclick="pantallaCompletaCad()" title="Pantalla completa">Pantalla completa</button>
      ${v.dwg?`<a class="cad-descarga" href="${v.dwg.url}" ${extAttr(v.dwg.url)} title="Descargar el plano completo en DWG">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span>Descargar plano DWG<small>${esc(v.nombre)} · ${v.dwg.mb} MB</small></span></a>`:''}
    </div>
    <div class="cad-wrap" id="cadWrap">
      <div class="cad-canvas" id="cadCanvas">
        <div class="dxf-cargando" id="cadCargando"><div class="cp-barra"><i id="cadBarra"></i></div><p id="cadMsg">Preparando el visor…</p></div>
      </div>
      <aside class="dxf-capas" id="cadCapas"><div class="dxf-capas-h">Capas</div><p class="hvacio">Se listan al terminar de cargar.</p></aside>
      <div class="cad-ficha" id="cadFicha" hidden></div>
      <div class="cad-marca" id="cadMarca" hidden></div>
    </div>
    <p class="ex-nota">Visor experimental: copia simplificada del DWG (sin imágenes ni rellenos), para recorrer el plano, consultar capas y ver la ficha de cada equipo. Las láminas en PDF son la versión oficial.</p>`;
}

function cambiarDibujoCad(id,nombre){ CAD.actual=nombre; pintarExpediente(id); }
function cambiarPisoCad(k){ if(CAD.piso===k) return; CAD.piso=k; CAD.pisoInicial=false; cerrarVisorCad(); pintarExpediente(location.hash.split('/')[2]); }

/* Carga un .js (dato o tipografía) como <script>; resuelve cuando existe la clave. */
function cargarScript(src, existe){
  return new Promise(res=>{
    if(existe()) return res(true);
    const s=document.createElement('script'); s.src=src;
    s.onload=()=>res(!!existe()); s.onerror=()=>res(false);
    document.head.appendChild(s);
  });
}
async function gunzipBase64(b64, msgCbk){
  const bin=atob(b64); const u8=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) u8[i]=bin.charCodeAt(i);
  if(typeof DecompressionStream==='undefined') throw new Error('este navegador no descomprime gzip (DecompressionStream)');
  const ds=new DecompressionStream('gzip');
  const w=ds.writable.getWriter(); w.write(u8); w.close();
  return await new Response(ds.readable).text();
}

async function montarVisorCad(d){
  const cont=document.getElementById('cadCanvas'); if(!cont) return;
  if(cont.clientWidth===0){ setTimeout(()=>montarVisorCad(d),300); return; }   // sección aún oculta: esperar
  const v=(d.visor||[]).find(x=>x.nombre===CAD.actual); if(!v) return;
  /* Cada montaje lleva un número; si mientras carga se cierra el visor o se
     monta otro, la carga vieja se descarta al terminar (no bloquea nada). */
  const mio=++CAD.serie;
  const vigente=()=>mio===CAD.serie && document.getElementById('cadCanvas')===cont;
  /* vista recomendada, capas y posiciones vienen en <dibujo>.vista.js (se carga sólo aquí) */
  if(v.datos&&!(window.CAD_VISTA&&window.CAD_VISTA[v.nombre])){ await cargarScript(v.datos, ()=>window.CAD_VISTA&&window.CAD_VISTA[v.nombre]); if(mio!==CAD.serie) return; }
  const vis=(window.CAD_VISTA&&window.CAD_VISTA[v.nombre])||v;
  /* planta elegida (archivo aparte, 3-10 veces más liviano) o el modelo completo */
  const pz=CAD.piso?(v.pisos||[]).find(p=>'P'+p.n===CAD.piso):null;
  const archivo={url:pz?pz.url:v.url, clave:pz?pz.clave:v.nombre, mb:pz?pz.mb:v.mb};
  CAD.vista=(pz&&vis.pisos&&vis.pisos[CAD.piso]&&vis.pisos[CAD.piso].vista)||vis.vista||null;
  CAD.ocultas=(vis.capas&&vis.capas.ocultas)||[];
  CAD.equipos=vis.equipos||[];
  CAD.datos=d;
  const msg=t=>{ const m=document.getElementById('cadMsg'); if(m) m.textContent=t; };
  const barra=(h,t)=>{ const b=document.getElementById('cadBarra'); if(b&&t){ b.style.width=Math.round(h*100/t)+'%'; b.style.animation='none'; } };
  CAD.cargando=true;
  try{
    msg('Cargando el visor…');
    /* dxf-viewer 1.0.49 + three 0.160 empaquetados en js/lib/dxf-viewer.esm.js (propio sitio, sin CDN).
       Abriendo index.html directo (file://) el navegador no deja importar módulos locales: ahí se usa el CDN. */
    if(!CAD.mod){
      try{ CAD.mod=await import(new URL('js/lib/dxf-viewer.esm.js',document.baseURI).href); }
      catch(e){ CAD.mod=await import('https://cdn.jsdelivr.net/npm/dxf-viewer@1.0.49/+esm'); }
    }
    CAD.three=CAD.mod.three||CAD.three||(await import('https://cdn.jsdelivr.net/npm/three@0.160.0/+esm'));
    msg('Descargando '+(pz?pz.nombre.toLowerCase():'el dibujo')+' ('+archivo.mb+' MB)…');
    const nombre=archivo.clave;
    const ok=await cargarScript(archivo.url, ()=>window.CAD_DATA&&window.CAD_DATA[nombre]);
    if(!ok) throw new Error('no se pudo leer '+archivo.url);
    msg('Descomprimiendo…');
    const texto=await gunzipBase64(window.CAD_DATA[nombre].gz);
    const urlDxf=URL.createObjectURL(new Blob([texto],{type:'text/plain'}));
    /* Tipografía: local; desde file:// va por el .js en base64. */
    /* Roboto recortada a latín + símbolos de plano (11 KB en vez de 503 KB: el visor
       sólo dibuja los contornos de los textos del dibujo). */
    let fuente=new URL('fonts/Roboto-Latin.ttf',location.href).href;   // absoluta: el worker no resuelve rutas relativas
    if(location.protocol==='file:'){
      const okF=await cargarScript('fonts/Roboto-Latin.ttf.js', ()=>window.FONT_DATA&&window.FONT_DATA['Roboto-Latin.ttf']);
      if(okF){ const b=atob(window.FONT_DATA['Roboto-Latin.ttf']); const u=new Uint8Array(b.length); for(let i=0;i<b.length;i++) u[i]=b.charCodeAt(i);
               fuente=URL.createObjectURL(new Blob([u],{type:'font/ttf'})); }
      else fuente='';
    }else{
      /* Si la fuente no está (caché vieja, archivo movido…), el servidor devuelve
         su página de error y el visor fallaba entero con "Unsupported OpenType
         signature <!DO". Se comprueba antes: sin fuente, el dibujo se abre igual,
         sólo que sin los textos. */
      try{
        const rf=await fetch(fuente,{cache:'force-cache'});
        const bf=rf.ok?await rf.arrayBuffer():null;
        const firma=bf?new Uint8Array(bf).slice(0,4):null;
        const valida=firma&&(firma[0]===0||String.fromCharCode(...firma)==='true'||String.fromCharCode(...firma)==='OTTO');
        if(!valida){ console.warn('Sinergia: fuente del visor no disponible; el dibujo se abre sin textos'); fuente=''; }
        else fuente=URL.createObjectURL(new Blob([bf],{type:'font/ttf'}));
      }catch(e){ fuente=''; }
    }
    if(CAD.viewer){ try{ CAD.viewer.Destroy(); }catch(e){} CAD.viewer=null; }
    cont.querySelectorAll('canvas').forEach(c=>c.remove());
    /* Fondo negro como el espacio modelo de AutoCAD. Sin corrección de color:
       el motor escribe en el DXF el RGB exacto de AutoCAD (código 420) para
       cada capa y entidad, y se muestra tal cual. */
    CAD.viewer=new CAD.mod.DxfViewer(cont,{autoResize:true, colorCorrection:false, blackWhiteInversion:false, clearColor:new CAD.three.Color('#000000'), antialias:true});
    /* Sin worker a propósito: con el DXF aligerado el análisis tarda ~3 s en
       el hilo principal, mientras que pasar el texto al worker y traer la
       escena costaba ~20 s. Además file:// no permite crear workers.       */
    msg('Interpretando el dibujo…');
    await CAD.viewer.Load({
      url:urlDxf, fonts:fuente?[fuente]:[],
      progressCbk:(fase,hecho,tot)=>{
        if(fase==='font') msg('Cargando tipografía…');
        else if(fase==='fetch') msg('Leyendo el dibujo…');
        else if(fase==='parse') msg('Interpretando entidades…');
        else if(fase==='prepare') msg('Preparando la escena…');
        barra(hecho,tot);
      }
    });
    URL.revokeObjectURL(urlDxf);
    if(!vigente()){ try{ CAD.viewer&&CAD.viewer.Destroy(); }catch(e){} return; }
    const c=document.getElementById('cadCargando'); if(c) c.remove();
    pintarCapasCad();
    encuadrarCad();
    cont.addEventListener('dblclick',encuadrarCad);
    engancharClicCad(cont);
  }catch(e){
    if(!vigente()) return;
    console.error('Visor CAD:',e);
    const det=e&&e.message?e.message:(e&&e.type?'fallo de '+e.type+(e.filename?' en '+e.filename:''):String(e));
    msg('No se pudo abrir el dibujo ('+det+').'+(location.protocol==='file:'?' Si persiste, ábrelo con el servidor: node "PAGINA WEB/servidor.js".':''));
  }finally{ CAD.cargando=false; }
}

/* Estado inicial de capas = el del DWG en AutoCAD: las apagadas o congeladas
   arrancan ocultas (CAD.ocultas viene del motor). "Como en AutoCAD" lo
   restaura; "todas" / "ninguna" actúan sobre las capas visibles en el filtro. */
/* ── Clic sobre un equipo → ficha ──
   El motor exporta la posición (x, y en coordenadas del DWG) y el radio de
   cada bloque de equipo con código. Al hacer clic se pasa el punto de
   pantalla a coordenadas del dibujo (cámara ortográfica) y se busca el
   inserto más cercano dentro de su radio. La ficha cruza el código con el
   metrado (descripción, grupo, ambientes donde va).                     */
function engancharClicCad(cont){
  let x0=0,y0=0,t0=0;
  cont.addEventListener('pointerdown',e=>{ x0=e.clientX; y0=e.clientY; t0=Date.now(); });
  cont.addEventListener('pointerup',e=>{
    if(Math.hypot(e.clientX-x0,e.clientY-y0)>4||Date.now()-t0>400) return;     // fue un arrastre
    const w=puntoDxf(cont,e.clientX,e.clientY); if(!w) return;
    const eq=equipoEn(w.x,w.y);
    if(eq) mostrarFichaCad(eq,e.clientX,e.clientY); else cerrarFichaCad();
  });
}
function puntoDxf(cont,cx,cy){
  const v=CAD.viewer; if(!v||!v.camera) return null;
  const r=cont.getBoundingClientRect();
  const nx=((cx-r.left)/r.width)*2-1, ny=-((cy-r.top)/r.height)*2+1;
  const p=new CAD.three.Vector3(nx,ny,0).unproject(v.camera);
  const o=v.GetOrigin();
  return {x:p.x+o.x, y:p.y+o.y};
}
function equipoEn(x,y){
  let mejor=null, dm=Infinity;
  for(const e of CAD.equipos){
    const d=Math.hypot(e.x-x,e.y-y);
    if(d<=Math.max(e.r,0.35)*1.3 && d<dm){ dm=d; mejor=e; }
  }
  return mejor;
}
function infoClave(clave){
  const d=CAD.datos; const out={clave, desc:'', grupo:'', provee:'', total:0, ambientes:[]};
  if(!d||!d.metrado) return out;
  for(const u of d.metrado) for(const a of u.ambientes) for(const q of a.equipos){
    if(q.clave!==clave) continue;
    if(!out.desc){ const c=(typeof tbClaves==='function'?tbClaves(d)[clave]:null)||q; out.desc=c.desc||''; out.grupo=c.grupo||''; out.provee=c.provee||''; }
    out.total+=q.cant;
    out.ambientes.push({upss:u.upss, cod:a.cod, nombre:a.nombre, nivel:a.nivel, cant:q.cant});
  }
  return out;
}
function mostrarFichaCad(eq,cx,cy){
  const f=document.getElementById('cadFicha'), m=document.getElementById('cadMarca'); if(!f) return;
  const g=(CAD.datos&&CAD.datos.grupos||[]).find(x=>x.grupo===(infoClave(eq.c).grupo));
  const i=infoClave(eq.c);
  const amb=i.ambientes.slice(0,8).map(a=>`<li><b>${a.cod}</b> ${titulo(a.nombre)} <em>${a.cant}</em></li>`).join('');
  f.innerHTML=`
    <div class="cf-head"><span class="ec-cod">${esc(eq.c)}</span>
      <button type="button" class="cf-x" onclick="cerrarFichaCad()" aria-label="Cerrar">✕</button></div>
    <div class="cf-nom">${i.desc?titulo(i.desc):'<i>Sin descripción en el metrado</i>'}</div>
    <dl class="cf-kv">
      <div><dt>Grupo</dt><dd>${esc(i.grupo||'—')}${g?' · '+esc(g.nombre):''}</dd></div>
      <div><dt>Provee</dt><dd>${i.provee==='OC.'?'Obra civil':(i.provee?'Equipamiento':'—')}</dd></div>
      <div><dt>En el proyecto</dt><dd>${i.total?nf(i.total)+' unid. · '+i.ambientes.length+' ambientes':'—'}</dd></div>
    </dl>
    ${amb?`<div class="cf-sub">Ambientes (metrado)</div><ul class="cf-amb" id="cfAmb">${amb}${i.ambientes.length>8?`<li class="mas"><button type="button" onclick="verTodosAmbCad('${esc(eq.c)}')">… ver los ${i.ambientes.length-8} restantes</button></li>`:''}</ul>`:''}
    <button type="button" class="ex-btn" onclick="irAlMetrado('${esc(eq.c)}')">Ver en Metrado</button>`;
  f.hidden=false;
  /* marca sobre el equipo */
  const cont=document.getElementById('cadCanvas'); const r=cont.getBoundingClientRect();
  m.style.left=(cx-r.left)+'px'; m.style.top=(cy-r.top)+'px'; m.hidden=false;
}
function verTodosAmbCad(clave){
  const ul=document.getElementById('cfAmb'); if(!ul) return;
  const i=infoClave(clave);
  ul.innerHTML=i.ambientes.map(a=>`<li><b>${a.cod}</b> ${titulo(a.nombre)} <em>${a.cant}</em></li>`).join('');
  ul.classList.add('todos');
}
function cerrarFichaCad(){ const f=document.getElementById('cadFicha'), m=document.getElementById('cadMarca'); if(f) f.hidden=true; if(m) m.hidden=true; }
function irAlMetrado(clave){
  const id=location.hash.split('/')[2]||''; MET_FILTRO_INICIAL={clave:new Set([clave])}; setExTab(id,'met');
}

function pintarCapasCad(){
  const box=document.getElementById('cadCapas'); if(!box||!CAD.viewer) return;
  const ocultas=new Set(CAD.ocultas||[]);
  const capas=[...CAD.viewer.GetLayers()].sort((a,b)=>a.name.localeCompare(b.name));
  box.innerHTML=`<div class="dxf-capas-h">Capas <em>${capas.length}</em>
      <button type="button" onclick="capasComoAutocad()" title="Volver al estado de capas del DWG">AutoCAD</button>
      <button type="button" onclick="todasCapasCad(true)">todas</button><button type="button" onclick="todasCapasCad(false)">ninguna</button></div>
    <input type="search" class="cad-buscar" placeholder="Filtrar capas…" oninput="filtrarCapasCad(this.value)">`+
    capas.map(l=>{ const on=!ocultas.has(l.name); if(!on) CAD.viewer.ShowLayer(l.name,false);
      return `<label data-n="${esc(l.name).toLowerCase()}" class="${on?'':'apagada'}"><input type="checkbox" ${on?'checked':''} onchange="CAD.viewer.ShowLayer('${l.name.replace(/'/g,'&#39;')}',this.checked);this.parentNode.classList.toggle('apagada',!this.checked)">
      <i style="background:#${(l.color||0xffffff).toString(16).padStart(6,'0')}"></i><span title="${esc(l.name)}${on?'':' · apagada/congelada en AutoCAD'}">${esc(l.displayName||l.name)}</span></label>`;}).join('');
  if(ocultas.size){ const n=document.createElement('p'); n.className='cad-nota-capas'; n.textContent=ocultas.size+' capas ocultas como en AutoCAD'; box.insertBefore(n, box.children[2]); }
}
function capasComoAutocad(){
  const ocultas=new Set(CAD.ocultas||[]);
  document.querySelectorAll('#cadCapas label').forEach(l=>{ const i=l.querySelector('input'); const v=!ocultas.has(i.closest('label').querySelector('span').title.split(' · ')[0]); if(i.checked!==v){ i.checked=v; i.dispatchEvent(new Event('change')); } });
}
function filtrarCapasCad(q){ q=(q||'').toLowerCase(); document.querySelectorAll('#cadCapas label').forEach(l=>{ l.style.display=!q||l.dataset.n.indexOf(q)>=0?'':'none'; }); }
function todasCapasCad(v){ document.querySelectorAll('#cadCapas label').forEach(l=>{ if(l.style.display==='none') return; const i=l.querySelector('input'); if(i.checked!==v){ i.checked=v; i.dispatchEvent(new Event('change')); } }); }
/* Encuadre: usa la vista recomendada por el motor (zona del edificio) y, si no
   hay, los límites del dibujo. SetView trabaja en coordenadas de escena
   (= DXF menos el origen que el visor descuenta para no perder precisión). */
function encuadrarCad(){
  if(!CAD.viewer) return;
  const cc=document.getElementById('cadCanvas');
  if(cc&&cc.clientWidth===0){ setTimeout(encuadrarCad,400); return; }   // lienzo aún sin tamaño
  const o=CAD.viewer.GetOrigin()||{x:0,y:0};
  const v=CAD.vista;
  if(v&&v.ancho){
    const cont=document.getElementById('cadCanvas');
    const asp=cont?cont.clientWidth/Math.max(1,cont.clientHeight):1.6;
    const ancho=Math.max(v.ancho, v.alto*asp);
    CAD.viewer.SetView({x:v.cx-o.x,y:v.cy-o.y},ancho);
    return;
  }
  const b=CAD.viewer.GetBounds(); if(!b) return;
  CAD.viewer.SetView({x:(b.minX+b.maxX)/2-o.x,y:(b.minY+b.maxY)/2-o.y},(b.maxX-b.minX)*1.05);
}
function pantallaCompletaCad(){
  const w=document.getElementById('cadWrap'); if(!w) return;
  if(document.fullscreenElement){ document.exitFullscreen(); } else if(w.requestFullscreen){ w.requestFullscreen(); }
}
function cerrarVisorCad(){
  CAD.serie++;                                   // invalida cualquier carga en curso
  CAD.cargando=false;
  if(CAD.viewer){ try{ CAD.viewer.Destroy(); }catch(e){} CAD.viewer=null; }
}

/* Al cargar: que la tarjeta aparezca aunque el Apps Script tarde, y que
   el avance de la tarjeta sea el real en cuanto llegue el JSON.        */
mezclarExpedientes();
EXPEDIENTES_LOCAL.forEach(e=>cargarExpediente(e.id));
