/* ---- NUESTROS CLIENTES / PROYECTOS ---- */
/* Datos de ejemplo: reemplázalos desde la hoja "Proyectos" (Excel / Google Sheets).
   La clave de acceso NUNCA viaja en texto plano: aquí solo va su hash SHA-256.
   Clave de demostración para los tres proyectos: demo123                       */
let PROYECTOS=[
  {id:"clinica-monitores", cliente:"Clínica privada · San Isidro", titulo:"Calibración de monitores multiparamétricos", servicio:"Metrología · Pack Monitores", fecha:"Junio 2026", foto:"img/proyectos/clinica-monitores.jpg", estado:"En curso", avance:65,
   desc:"Verificación de seguridad eléctrica y desempeño de 24 monitores de paciente en dos sedes, con certificado trazable por equipo.",
   hitos:[{t:"Levantamiento y cronograma",d:true},{t:"Seguridad eléctrica (IEC 62353)",d:true},{t:"Verificación de SpO2 y NIBP",d:false},{t:"Entrega de certificados",d:false}],
   clave_hash:"d3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791"},
  {id:"hospital-desfibriladores", cliente:"Hospital regional · Lima Norte", titulo:"Verificación de desfibriladores en emergencia", servicio:"Metrología · Pack Desfibriladores", fecha:"Mayo 2026", foto:"img/proyectos/hospital-desfibriladores.jpg", estado:"En curso", avance:40,
   desc:"Medición de energía entregada, tiempo de carga y sincronización de 12 desfibriladores del área de emergencia y UCI.",
   hitos:[{t:"Inventario y plan de trabajo",d:true},{t:"Pruebas de energía (50 Ω)",d:true},{t:"Cardioversión sincronizada",d:false},{t:"Informe y certificados",d:false}],
   clave_hash:"d3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791"},
  {id:"taller-inhouse", cliente:"Ingeniería clínica · in-house", titulo:"Taller de seguridad eléctrica IEC 62353", servicio:"Taller práctico · 8 horas", fecha:"Abril 2026", foto:"img/proyectos/taller-inhouse.jpg", estado:"Completado", avance:100,
   desc:"Capacitación práctica al equipo de ingeniería clínica con el analizador Fluke ESA620: corrientes de fuga, aislamiento y protocolo de pruebas.",
   hitos:[{t:"Diagnóstico de necesidades",d:true},{t:"Sesión teórica y normativa",d:true},{t:"Práctica sobre equipos reales",d:true},{t:"Evaluación y constancias",d:true}],
   clave_hash:"d3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791"}
];
const PR_OPEN=new Set(); // proyectos desbloqueados en esta sesión (solo en memoria)
const PR_KEY={};              // hash de la clave por proyecto (solo en memoria)
const PR_DET={};              // detalle ya descargado, para no volver a pedirlo
let DET_TAB='eq';            // pestaña activa: res | val | eq
let DET_Q='', DET_SOLO=true, DET_ORDEN='';
let TAB_AREAS=[], TAB_ESTADOS=[];
/* Selección múltiple por columna */
const SEL={servicio:new Set(), ambiente:new Set(), equipo:new Set(),
           valorizacion:new Set(), criticidad:new Set(), proximo:new Set(), avance:new Set()};
/* Valorizaciones en las que se atendió el equipo */
/* ── Criticidad asistencial ──
   Riesgo para el paciente si el equipo falla:
   ALTA  · soporte vital        MEDIA · diagnóstico y terapéutico    BAJA · apoyo clínico
   Si la hoja trae una columna CRITICIDAD, ese valor manda sobre la regla. */
const CRIT_ALTA=['VENTILADOR','DESFIBRILADOR','ANESTESIA','INCUBADORA','CUNA RADIANTE',
  'MONITOR','ASPIRADOR','HUMIDIFICADOR','BOMBA DE INFUSION','ELECTROBISTURI'];
const CRIT_MEDIA=['ECOGRAFO','ELECTROCARDIOGRAFO','PULSIOXIMETRO','PULSOXIMETRO','DETECTOR DE LATIDOS',
  'LAMPARA','MESA DE OPERACIONES','MESA DE PARTO','RAYOS X','TOMOGRAFO','MAMOGRAFO','ARCO EN C',
  'RESONADOR','AUTOCLAVE','ESTERILIZADOR','ANALIZADOR','MICROSCOPIO','CENTRIFUGA'];
const CRIT_ROT={ALTA:'Alta · soporte vital',MEDIA:'Media · diagnóstico',BAJA:'Baja · apoyo'};

function criticidadDe(e){
  const c=(e.criticidad||'').toUpperCase().trim();
  if(c==='ALTA'||c==='MEDIA'||c==='BAJA')return c;
  const n=(e.nom||'').toUpperCase();
  if(CRIT_ALTA.some(k=>n.indexOf(k)>=0))return 'ALTA';
  if(CRIT_MEDIA.some(k=>n.indexOf(k)>=0))return 'MEDIA';
  return 'BAJA';
}

/* ── Programación: cuándo toca el próximo mantenimiento ──
   Se calcula con la última ejecución y la frecuencia del contrato
   (servicios/año). Si hay fecha programada pendiente, esa manda.      */
function aDate(s){
  const m=String(s||'').match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  return m?new Date(+m[3],+m[2]-1,+m[1]):null;
}
function masMeses(d,n){
  const x=new Date(d.getTime()), dia=x.getDate();
  x.setMonth(x.getMonth()+n);
  if(x.getDate()<dia)x.setDate(0);          // 31 de enero + 1 mes = 28/29 de feb
  return x;
}
function fmtFecha(d){
  return ('0'+d.getDate()).slice(-2)+'/'+('0'+(d.getMonth()+1)).slice(-2)+'/'+d.getFullYear();
}
function proximoDe(e){
  const hoy=new Date(); hoy.setHours(0,0,0,0);
  /* 0) La fecha calculada en la hoja manda sobre cualquier estimación.
        Con varios años cargados hay muchas filas por equipo, así que:
        · si quedan intervenciones SIN ejecutar -> la más próxima de ellas
        · si todas están ejecutadas -> la proyección de la ÚLTIMA ejecutada  */
  const pend=e.intervenciones.filter(i=>!i.hecho)
              .map(i=>aDate(i.proximo)||aDate(i.programada)).filter(Boolean).sort((a,b)=>a-b);
  let f=pend[0]||null;
  if(!f){
    const eje=e.intervenciones.filter(i=>i.hecho&&aDate(i.fecha))
               .sort((a,b)=>aDate(a.fecha)-aDate(b.fecha));
    const ultima=eje[eje.length-1];
    if(ultima)f=aDate(ultima.proximo);
  }
  if(f){
    const dias=Math.round((f-hoy)/86400000);
    return {estado:dias<0?'VENCIDO':(dias<=30?'PROXIMO':'ALDIA'),dias,fecha:f,txt:fmtFecha(f),
            fuente:'hoja',
            ultima:(()=>{const e2=e.intervenciones.filter(i=>i.hecho&&aDate(i.fecha))
                          .sort((a,b)=>aDate(a.fecha)-aDate(b.fecha));
                         return e2.length?e2[e2.length-1].fecha:'';})()};
  }
  // 1) intervención pendiente con fecha programada
  const prog=e.intervenciones.filter(i=>!i.hecho&&aDate(i.programada))
                             .map(i=>aDate(i.programada)).sort((a,b)=>a-b)[0];
  // 2) si no, se proyecta desde la última ejecución
  const hechas=e.intervenciones.filter(i=>i.hecho&&aDate(i.fecha))
                               .map(i=>aDate(i.fecha)).sort((a,b)=>a-b);
  const ultima=hechas[hechas.length-1]||null;
  let fx=prog||null, proyectada=false;
  if(!fx&&ultima&&e.servicios>0){ fx=masMeses(ultima,Math.round(12/e.servicios)); proyectada=true; }
  if(!fx) return {estado:'SIN',txt:'Por programar',dias:null,ultima:ultima?fmtFecha(ultima):''};
  const dias=Math.round((fx-hoy)/86400000);
  const estado = dias<0?'VENCIDO':(dias<=30?'PROXIMO':'ALDIA');
  return {estado,dias,fecha:fx,txt:fmtFecha(fx),proyectada,ultima:ultima?fmtFecha(ultima):''};
}
const PROX_ROT={VENCIDO:'Vencidos',PROXIMO:'Por vencer (30 días)',ALDIA:'Al día',SIN:'Por programar'};

function valsDe(e){
  return [...new Set(e.intervenciones.filter(i=>i.hecho&&i.valorizacion).map(i=>i.valorizacion))].sort();
}
function selLimpia(){Object.values(SEL).forEach(s=>s.clear());}
function cumpleAvance(e,k){
  const h=e.intervenciones.filter(i=>i.hecho);
  if(k==='COMPLETO')  return e.intervenciones.length&&h.length>=e.intervenciones.length;
  if(k==='EJECUTADO') return h.length>0;
  if(k==='PENDIENTE') return e.intervenciones.some(i=>!i.hecho);
  return h.some(i=>(i.estado||'').toUpperCase()===k);
}
let AREAS_OPEN=false;
let VAL_EST='', VAL_Q='';   // filtro y búsqueda de valorizaciones   // el bloque de áreas arranca plegado

function prBadge(p){return p.estado==='Completado'?'<span class="st fin">COMPLETADO</span>':'<span class="st curso">EN CURSO</span>';}
function prImg(p){
  if(p.foto)return `<img src="${p.foto}" alt="${p.titulo}" loading="lazy" decoding="async">`;
  return `<svg viewBox="0 0 312 200" role="img" aria-label="${p.titulo}"><rect x="40" y="30" width="232" height="140" rx="16" fill="#2A2D33"/><rect x="58" y="48" width="196" height="74" rx="8" fill="#0E1A14"/><polyline points="74,85 110,85 122,62 138,104 152,74 164,85 238,85" fill="none" stroke="#67d3ad" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="156" cy="148" r="13" fill="none" stroke="#9A7F4E" stroke-width="2"/><rect x="153" y="138" width="6" height="9" rx="3" fill="#9A7F4E"/></svg>`;
}
function cardProyecto(p){
  return `<div class="pr">
    <div class="img">${prBadge(p)}${prImg(p)}</div>
    <div class="body">
      <div class="cli">${p.cliente}</div>
      <h3>${p.titulo}</h3>
      <div class="desc">${p.desc}</div>
      <div class="meta">${p.servicio} · ${p.fecha}</div>
      <div class="foot">
        <span class="inc-lbl">${p.estado==='Completado'?'Proyecto cerrado':'Servicio activo'}</span>
        <button class="lockbtn" onclick="go('#/proyecto/${p.id}')">Ver seguimiento</button>
      </div>
    </div></div>`;
}
function pintarProyectos(){
  const g=document.getElementById('prGrid'), hm=document.getElementById('prHome'), c=document.getElementById('countPr');
  if(g)g.innerHTML=PROYECTOS.map(cardProyecto).join('')||'<p style="color:var(--gris);grid-column:1/-1">Aún no hay proyectos publicados.</p>';
  if(hm)hm.innerHTML=PROYECTOS.slice(0,3).map(cardProyecto).join('');
  if(c)c.textContent=PROYECTOS.length+(PROYECTOS.length===1?' proyecto':' proyectos');
}

/* SHA-256: usa la API nativa (https/localhost) o el respaldo puro JS (file://) */
function sha256js(ascii){
  function rr(v,c){return (v>>>c)|(v<<(32-c));}
  const mathPow=Math.pow, maxWord=mathPow(2,32); let result='';
  const words=[], asciiBitLength=ascii.length*8;
  let hash=sha256js.h=sha256js.h||[], k=sha256js.k=sha256js.k||[], primeCounter=k.length;
  const isComposite={};
  for(let candidate=2; primeCounter<64; candidate++){
    if(!isComposite[candidate]){
      for(let i=0;i<313;i+=candidate){isComposite[i]=candidate;}
      hash[primeCounter]=(mathPow(candidate,.5)*maxWord)|0;
      k[primeCounter++]=(mathPow(candidate,1/3)*maxWord)|0;
    }
  }
  ascii+='\x80';
  while(ascii.length%64-56)ascii+='\x00';
  for(let i=0;i<ascii.length;i++){
    const j=ascii.charCodeAt(i); if(j>>8)return '';
    words[i>>2]|=j<<((3-i)%4)*8;
  }
  words[words.length]=(asciiBitLength/maxWord)|0;
  words[words.length]=asciiBitLength;
  for(let j=0;j<words.length;){
    const w=words.slice(j,j+=16), oldHash=hash;
    hash=hash.slice(0,8);
    for(let i=0;i<64;i++){
      const w15=w[i-15], w2=w[i-2];
      const a=hash[0], e=hash[4];
      const temp1=hash[7]
        +(rr(e,6)^rr(e,11)^rr(e,25))
        +((e&hash[5])^((~e)&hash[6]))
        +k[i]
        +(w[i]=(i<16)?w[i]:(w[i-16]
          +(rr(w15,7)^rr(w15,18)^(w15>>>3))
          +w[i-7]
          +(rr(w2,17)^rr(w2,19)^(w2>>>10)))|0);
      const temp2=(rr(a,2)^rr(a,13)^rr(a,22))+((a&hash[1])^(a&hash[2])^(hash[1]&hash[2]));
      hash=[(temp1+temp2)|0].concat(hash);
      hash[4]=(hash[4]+temp1)|0;
    }
    for(let i=0;i<8;i++){hash[i]=(hash[i]+oldHash[i])|0;}
  }
  for(let i=0;i<8;i++){
    for(let j=3;j+1;j--){
      const b=(hash[i]>>(j*8))&255;
      result+=((b<16)?0:'')+b.toString(16);
    }
  }
  return result;
}
async function sha256(s){
  try{
    if(window.crypto&&crypto.subtle){
      const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));
      return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
    }
  }catch(e){}
  return sha256js(unescape(encodeURIComponent(s)));
}

function renderProyecto(id){
  const p=PROYECTOS.find(x=>x.id===id);
  const body=document.getElementById('equipoBody');
  if(!p){body.innerHTML='<div class="pagehead"><h1>Proyecto no encontrado</h1></div>';return;}
  if(!PR_OPEN.has(id)){
    body.innerHTML=`
      <div class="crumb"><a onclick="go('#/clientes')">Nuestros clientes</a> &nbsp;/&nbsp; ${p.titulo}</div>
      <div class="lockcard">
        <div class="lock-ico"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg></div>
        <h2>Seguimiento privado</h2>
        <p><b>${p.titulo}</b><br>${p.cliente}</p>
        <div class="lockerr" id="lockErr">Clave incorrecta. Verifica e intenta de nuevo.</div>
        <div class="field"><label for="prKey">Clave de acceso</label><input type="password" id="prKey" placeholder="Ingresa tu clave" autocomplete="off" onkeydown="if(event.key==='Enter')tryUnlock('${p.id}')"></div>
        <button class="btn btn-fill" onclick="tryUnlock('${p.id}')">Ver avance del proyecto</button>
        <div class="locknote">La clave se entrega al iniciar el servicio. Si eres cliente y no la tienes, <a onclick="go('#/contacto')" style="color:var(--cobre-d);font-weight:600;cursor:pointer">escríbenos</a>.</div>
      </div>`;
    const k=document.getElementById('prKey'); if(k)k.focus();
    return;
  }
  const r=p.resumen||{};
  body.innerHTML=`
    <div class="crumb"><a onclick="go('#/clientes')">Nuestros clientes</a> &nbsp;/&nbsp; ${p.titulo}</div>
    <header class="pr-head">
      <div class="ph-eyebrow">
        <span>${p.cliente}</span>
        <span class="ph-estado ${p.estado==='Completado'?'fin':''}">${p.estado}</span>
      </div>
      <h1>${p.titulo}</h1>
      <dl class="ph-meta">
        <div><dt>Contrato</dt><dd>${p.servicio.replace(/^Contrato\s*/i,'')}</dd></div>
        <div><dt>Periodo</dt><dd>${p.fecha}</dd></div>
        <div><dt>Intervenciones</dt><dd>${r.intervenciones||'—'}</dd></div>
        <div><dt>Ejecutadas</dt><dd>${r.ejecutadas||0}</dd></div>
      </dl>
    </header>
    <div id="prDet"></div>`;
  pintarPanel(id);
  cargarDetalle(id);
}

/* ---- Panel con pestañas: Resumen · Valorizaciones · Equipos ---- */
function pintarPanel(id){
  const cont=document.getElementById('prDet'); if(!cont)return;
  const y=window.pageYOffset;                 // conservar la posición al redibujar
  const p=PROYECTOS.find(x=>x.id===id), d=PR_DET[id];
  const nv=d&&d.valorizaciones?d.valorizaciones.length:0;
  let pane='';
  const mm=d?metricas(d):{venc:0};
  if(DET_TAB==='val')       pane=d?paneValorizaciones(id,d):paneCargando();
  else if(DET_TAB==='rep')  pane=d?paneReportes(id,d):paneCargando();
  else if(DET_TAB==='falla')pane=d?paneFalla(id,d):paneCargando();
  else                      pane=d?paneEquipos(id,p,d):paneCargando();
  cont.innerHTML=`<div class="dash-card det-card">${tabsDet(id,nv,mm.venc)}${pane}</div>`;
  if(DET_TAB==='eq'){
    setTimeout(()=>{const b=document.getElementById('prBar');if(b)b.style.width=p.avance+'%';},80);
    pintarLista(id);
  }
  if(window.pageYOffset!==y) window.scrollTo(0,y);
}

function paneCargando(){
  return '<p class="dnote" style="padding:18px 0">Cargando el detalle…</p>';
}


/* Dial de avance: escala de instrumento con marcas cada 10% */
function dialAvance(pct){
  const R=52, C=Math.PI*R, len=C*Math.max(0,Math.min(100,pct))/100;
  const ticks=[];
  for(let i=0;i<=10;i++){
    const ang=Math.PI*(1-i/10), x1=64+Math.cos(ang)*62, y1=68-Math.sin(ang)*62;
    const l=i%5===0?9:5;
    const x2=64+Math.cos(ang)*(62-l), y2=68-Math.sin(ang)*(62-l);
    ticks.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"
      stroke="${i%5===0?'rgba(255,255,255,.45)':'rgba(255,255,255,.2)'}" stroke-width="${i%5===0?1.4:1}"/>`);
  }
  return `<svg class="dial" viewBox="0 0 128 84" role="img" aria-label="Avance ${pct}%">
    ${ticks.join('')}
    <path d="M12 68 A52 52 0 0 1 116 68" fill="none" stroke="rgba(255,255,255,.13)" stroke-width="7" stroke-linecap="butt"/>
    <path d="M12 68 A52 52 0 0 1 116 68" fill="none" stroke="url(#gdial)" stroke-width="7" stroke-linecap="butt"
      stroke-dasharray="${len.toFixed(1)} ${C.toFixed(1)}" class="dial-arco"/>
    <defs><linearGradient id="gdial" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#8A6A38"/><stop offset="1" stop-color="#C9A96A"/></linearGradient></defs>
    <text x="64" y="62" text-anchor="middle" class="dial-num">${pct}<tspan class="dial-pc">%</tspan></text>
  </svg>`;
}

function metricas(d,lista){
  let equipos=0,inter=0,ejec=0,inop=0,eqListos=0,eqIniciados=0,venc=0,prox=0,vencAlta=0,alta=0;
  (lista||d.equipos).forEach(e=>{
    if(!e.alcance)return;
    equipos++;
    let malo=false,h=0,t=0;
    e.intervenciones.forEach(i=>{inter++;t++; if(i.hecho){ejec++;h++;
      if((i.estado||'').toUpperCase().indexOf('INOPER')===0)malo=true;}});
    const px=proximoDe(e);
    if(px.estado==='VENCIDO'){venc++; if(criticidadDe(e)==='ALTA')vencAlta++;}
    else if(px.estado==='PROXIMO')prox++;
    if(criticidadDe(e)==='ALTA')alta++;
    if(t&&h>=t)eqListos++;
    if(h)eqIniciados++;
    if(malo)inop++;
  });
  return {equipos,inter,ejec,inop,eqListos,eqIniciados,venc,prox,vencAlta,alta,pend:inter-ejec,
          pct:inter?Math.round(ejec*100/inter):0};
}

/* Barras por área — cada fila abre la lista filtrada */
/* Agrupa ambientes en el servicio al que pertenecen (Cláusula Segunda del contrato):
   SOP1/SOP2/SOP3/SOP-NEO/SOP-URPA -> CENTRO QUIRÚRGICO · UCI-309/310/307/ALMACEN -> UCI */
function grupoDe(area){
  const a=(area||'').toUpperCase().trim();
  if(a.indexOf('SOP')===0)return 'CENTRO QUIRÚRGICO';
  if(a.indexOf('UCI')===0)return 'UCI';
  return a||'—';
}

function agrupaAreas(d){
  const m={};
  d.equipos.forEach(e=>{
    if(!e.alcance)return;
    const g=grupoDe(e.area);
    m[g]=m[g]||{eq:0,inter:0,ejec:0,inop:0,amb:new Set()};
    m[g].eq++; m[g].amb.add(e.area||'—');
    e.intervenciones.forEach(i=>{m[g].inter++;
      if(i.hecho){m[g].ejec++; if((i.estado||'').toUpperCase().indexOf('INOPER')===0)m[g].inop++;}});
  });
  return Object.keys(m).map(a=>({a,...m[a],amb:m[a].amb.size,
                                 pct:m[a].inter?Math.round(m[a].ejec*100/m[a].inter):0}))
                       .sort((x,y)=>y.pct-x.pct||y.inter-x.inter);
}

/* Resumen que se lee sin abrir el bloque */
function resumenAreas(d){
  const m=agrupaAreas(d), con=m.filter(a=>a.ejec>0).length;
  return `${m.length} áreas · ${con} con avance`;
}

/* Rejilla compacta: cada tarjeta filtra la lista de equipos */
function tableroAreas(id,d){
  const filas=agrupaAreas(d);
  TAB_AREAS=filas;
  return `<div class="areas-grid">${filas.map((f,ix)=>`
      <button type="button" class="ac${SEL.servicio.has(f.a)?' act':''}${f.pct?'':' cero'}"
              onclick="irAEquipos('${id}',{grupo:TAB_AREAS[${ix}].a})" title="${f.a}">
        <span class="ac-top"><b>${f.a}</b>${f.inop?`<i class="ta-alerta">${f.inop}</i>`:''}</span>
        <span class="ac-bar"><i style="width:${f.pct}%"></i></span>
        <span class="ac-pie">${f.eq} eq${f.amb>1?` · ${f.amb} amb.`:''} · ${f.ejec}/${f.inter}<em>${f.pct}%</em></span>
      </button>`).join('')}</div>`;
}

function paneValorizaciones(id,d){
  const vals=d.valorizaciones||[];
  if(!vals.length) return '<p class="dnote" style="padding:14px 0">Aún no hay valorizaciones registradas.</p>';
  const lista=vals.filter(v=>{
    if(!VAL_EST)return true;
    if(VAL_EST==='PROGRAMADA')return !!v.futura;
    if(v.futura)return false;
    if(VAL_EST==='CURSO')return v.estado==='En ejecución';
    if(VAL_EST==='PRESENTADA')return v.estado==='Presentada';
    if(VAL_EST==='CERRADA')return v.estado==='Cerrada'||v.estado==='Con conformidad';
    return true;
  });
  const n=k=>vals.filter(v=>k==='PROGRAMADA'?!!v.futura
            :(!v.futura&&(k===''||(k==='CURSO'&&v.estado==='En ejecución')
              ||(k==='PRESENTADA'&&v.estado==='Presentada')
              ||(k==='CERRADA'&&(v.estado==='Cerrada'||v.estado==='Con conformidad'))))).length;
  return `
    <div class="val-head">
      <input type="search" class="val-buscar" placeholder="Buscar equipo, código o informe"
             value="${VAL_Q}" oninput="VAL_Q=this.value;filtrarItems()">
      <div class="chips">
        ${[['','Todas'],['CURSO','En curso'],['PRESENTADA','Presentadas'],
           ['CERRADA','Cerradas'],['PROGRAMADA','Programadas']]
          .filter(([k])=>k===''||n(k))
          .map(([k,t])=>`<button type="button" class="chip${VAL_EST===k?' on':''}"
             onclick="VAL_EST='${k}';pintarPanel('${id}')">${t}<em>${n(k)}</em></button>`).join('')}
      </div>
      <span class="th-nota">se listan solo los informes ya emitidos</span>
    </div>
    ${lista.length?lista.map(v=>valBloque(v)).join('')
      :'<p class="dnote" style="padding:14px 0">No hay valorizaciones con ese estado.</p>'}`;
}

/* Deja el panel a la vista al cambiar de pestaña */
function verPanel(destino){
  const c=document.querySelector(destino||'#prDet .det-card'); if(!c)return;
  const y=c.getBoundingClientRect().top+window.pageYOffset-90;
  window.scrollTo({top:y<0?0:y,behavior:'smooth'});
}

function setDetTab(id,t){
  DET_TAB=t; pintarPanel(id);
  if(!PR_DET[id]) cargarDetalle(id);
}

async function cargarDetalle(id){
  const cont=document.getElementById('prDet'); if(!cont)return;
  const p=PROYECTOS.find(x=>x.id===id);
  const url=(typeof CONFIG!=='undefined'&&CONFIG.DATA_URL)||'';
  if(!p||!p.detalle||url.indexOf('http')!==0){cont.innerHTML='';return;}
  if(PR_DET[id]){pintarPanel(id);return;}
  try{
    const q=url+(url.indexOf('?')>=0?'&':'?')+'proyecto='+encodeURIComponent(id)+'&clave='+encodeURIComponent(PR_KEY[id]||'');
    const r=await fetch(q,{cache:'no-store'});
    const d=await r.json();
    if(!d||!d.ok)throw new Error((d&&d.motivo)||'sin acceso');
    PR_DET[id]=d; selLimpia(); DET_Q=''; pintarPanel(id);
  }catch(e){
    cont.innerHTML='<div class="dash-card det-card">'+tabsDet(id,0)+
      '<p class="dnote" style="padding:14px 0">No se pudo cargar el detalle ('+e.message+'). '+
      'Puedes reintentar más tarde o escribirnos.</p></div>';
  }
}

async function tryUnlock(id){
  const inp=document.getElementById('prKey'), err=document.getElementById('lockErr');
  const v=(inp&&inp.value||'').trim();
  if(!v){if(err)err.classList.add('show');return;}
  const h=await sha256(v);
  const p=PROYECTOS.find(x=>x.id===id);
  if(p&&h===p.clave_hash){PR_OPEN.add(id);PR_KEY[id]=h;renderProyecto(id);}
  else{if(err)err.classList.add('show');if(inp){inp.value='';inp.focus();}}
}

function tabsDet(id,nv,nvenc){
  return `<div class="det-tabs">
    <button type="button" class="${DET_TAB==='eq'?'on':''}" onclick="setDetTab('${id}','eq')">Equipos y avance</button>
    <button type="button" class="${DET_TAB==='val'?'on':''}" onclick="setDetTab('${id}','val')">Valorizaciones${nv?` <em>${nv}</em>`:''}</button>
    <button type="button" class="${DET_TAB==='rep'?'on':''}" onclick="setDetTab('${id}','rep')">Reportes</button>
    <button type="button" class="${DET_TAB==='falla'?'on':''}" onclick="setDetTab('${id}','falla')">Reportar falla</button>
  </div>`;
}

/* Reporte de una valorización, con el mismo formato del metrado */
function reporteValorizacion(vn,fmt){
  const id=MENU_ID||PROY_ACT;
  const g={servicio:[...SEL.servicio],ambiente:[...SEL.ambiente],equipo:[...SEL.equipo],
    valorizacion:[...SEL.valorizacion],criticidad:[...SEL.criticidad],proximo:[...SEL.proximo],
    avance:[...SEL.avance],q:DET_Q,solo:DET_SOLO};
  selLimpia(); DET_Q=''; SEL.valorizacion.add(vn);
  DOC_TITULO=`Valorización ${vn} · detalle de intervenciones`;
  if(fmt==='pdf') imprimirReporte(id); else exportarExcel(id);
  setTimeout(()=>{DOC_TITULO=''; restaurarFiltros(g,id);},800);
}
let DOC_TITULO='', PROY_ACT='';

/* ════════ REPORTAR FALLA ════════
   Solicitud de atención que registra logística de la clínica. El equipo puede
   identificarse por código o por descripción: si no lo tienen a mano, igual se envía
   y nosotros completamos el dato al atenderla. */
function paneFalla(id,d){
  PROY_ACT=id;
  const eq=d.equipos.slice().sort((a,b)=>a.nom.localeCompare(b.nom));
  const areas=[...new Set(d.equipos.map(e=>e.area))].filter(Boolean).sort();
  return `
    <p class="rep-intro">Complete lo que tenga a la mano. <b>Ningún campo del equipo es
      obligatorio</b>: si no conoce el código, describa el equipo y nosotros lo identificamos
      al atender la solicitud.</p>
    <form class="fform" onsubmit="enviarFalla(event,'${id}')">
      <div class="ff-fila">
        <label class="ff">
          <span>Equipo o código <i>opcional</i></span>
          <input name="equipo" list="listaEq" autocomplete="off"
                 placeholder="Ej.: CL-D118-01, ventilador de la cama 3…">
          <datalist id="listaEq">
            ${eq.map(e=>`<option value="${e.cod} · ${e.nom}">`).join('')}
          </datalist>
        </label>
        <label class="ff ff-sm">
          <span>Área o ambiente</span>
          <input name="area" list="listaAr" autocomplete="off" placeholder="Ej.: UCI-309">
          <datalist id="listaAr">${areas.map(a=>`<option value="${a}">`).join('')}</datalist>
        </label>
      </div>

      <label class="ff">
        <span>¿Qué está ocurriendo? <i>requerido</i></span>
        <textarea name="falla" rows="3" required
          placeholder="Describa la falla: qué hace el equipo, desde cuándo, si hay alarma o mensaje en pantalla…"></textarea>
      </label>

      <fieldset class="ff-urg">
        <legend>Urgencia</legend>
        <label><input type="radio" name="urgencia" value="ALTA" required>
          <b>Detiene la atención</b><em>El equipo no se puede usar o hay riesgo para el paciente</em></label>
        <label><input type="radio" name="urgencia" value="MEDIA">
          <b>Funciona con fallas</b><em>Se puede usar, pero con limitaciones</em></label>
        <label><input type="radio" name="urgencia" value="BAJA">
          <b>No urgente</b><em>Puede programarse en la próxima visita</em></label>
      </fieldset>

      <div class="ff-fila">
        <label class="ff"><span>Reportado por</span>
          <input name="quien" required placeholder="Nombre y apellido"></label>
        <label class="ff ff-sm"><span>Cargo o servicio <i>opcional</i></span>
          <input name="cargo" placeholder="Ej.: Logística"></label>
      </div>

      <div class="ff-acc">
        <button type="submit" class="ibtn ff-env">Enviar solicitud</button>
        <span class="ff-nota">Se registra con la fecha y hora de envío.</span>
      </div>
    </form>
    <div id="ffOK"></div>`;
}

function enviarFalla(ev,id){
  ev.preventDefault();
  const f=ev.target, v=n=>(f.elements[n]&&f.elements[n].value||'').trim();
  const urg=(f.elements['urgencia'].value||'').toUpperCase();
  const h=new Date();
  const dosd=n=>('0'+n).slice(-2);
  const fecha=`${dosd(h.getDate())}/${dosd(h.getMonth()+1)}/${h.getFullYear()}`;
  const hora=`${dosd(h.getHours())}:${dosd(h.getMinutes())}`;
  const nro=`SOL-${h.getFullYear()}${dosd(h.getMonth()+1)}${dosd(h.getDate())}-${dosd(h.getHours())}${dosd(h.getMinutes())}`;
  const ROTU={ALTA:'Detiene la atención',MEDIA:'Funciona con fallas',BAJA:'No urgente'};
  const p=PROYECTOS.find(x=>x.id===id)||{};
  const texto=`SOLICITUD DE ATENCIÓN ${nro}\n`
    +`${p.cliente||''} · ${(p.servicio||'').replace(/^Contrato\s*/i,'')}\n\n`
    +`Equipo: ${v('equipo')||'(por identificar)'}\n`
    +`Área: ${v('area')||'(no indicada)'}\n`
    +`Urgencia: ${ROTU[urg]||urg}\n`
    +`Falla: ${v('falla')}\n`
    +`Reporta: ${v('quien')}${v('cargo')?' · '+v('cargo'):''}\n`
    +`Fecha: ${fecha} ${hora}`;
  const S=(typeof SITE!=='undefined')?SITE:{};
  const wa=`https://wa.me/${String(S.whatsapp||'51956614346').replace(/\D/g,'')}?text=${encodeURIComponent(texto)}`;

  document.getElementById('ffOK').innerHTML=`
    <div class="ff-ok">
      <div class="ff-ok-t"><b>Solicitud ${nro}</b>
        <span class="urg-${urg.toLowerCase()}">${ROTU[urg]||urg}</span></div>
      <dl class="ff-res">
        <div><dt>Equipo</dt><dd>${v('equipo')||'Por identificar'}</dd></div>
        <div><dt>Área</dt><dd>${v('area')||'No indicada'}</dd></div>
        <div><dt>Reporta</dt><dd>${v('quien')}${v('cargo')?' · '+v('cargo'):''}</dd></div>
        <div><dt>Registrada</dt><dd>${fecha} ${hora}</dd></div>
      </dl>
      <p class="ff-falla">${v('falla')}</p>
      <div class="ff-acc">
        <a class="ibtn wa-btn" target="_blank" rel="noopener" href="${wa}">Enviar por WhatsApp</a>
        <button type="button" class="acc" onclick="copiarTexto(this,${JSON.stringify(JSON.stringify(texto))})">Copiar</button>
        <button type="button" class="acc" onclick="setDetTab('${id}','falla')">Nueva solicitud</button>
      </div>
      <p class="ff-aviso">Guarde el número de solicitud. Nuestro equipo la revisa y coordina
        la visita según la urgencia indicada.</p>
    </div>`;
  document.getElementById('ffOK').scrollIntoView({behavior:'smooth',block:'center'});
}

function copiarTexto(btn,txt){
  navigator.clipboard.writeText(txt).then(()=>{
    const o=btn.textContent; btn.textContent='Copiado'; setTimeout(()=>btn.textContent=o,1600);
  });
}

/* ════════ REPORTES ════════ */
const REPORTES=[
  {k:'todo',   t:'Inventario completo',        d:'Todos los equipos del contrato con su estado y sus informes.'},
  {k:'venc',   t:'Mantenimientos vencidos',    d:'Solo lo atrasado. Útil para priorizar la próxima visita.'},
  {k:'alta',   t:'Equipos de alta criticidad', d:'Soporte vital: ventiladores, desfibriladores, anestesia, incubadoras.'},
  {k:'inop',   t:'Equipos inoperativos',       d:'Los que quedaron fuera de servicio en la última intervención.'},
  {k:'ejec',   t:'Intervenciones ejecutadas',  d:'Lo realizado a la fecha, con enlace a cada informe.'},
  {k:'pend',   t:'Intervenciones pendientes',  d:'Lo programado que aún no se ejecuta.'}
];

function paneReportes(id,d){
  PROY_ACT=id;
  return `
    <p class="rep-intro">Cada reporte sale con el membrete de Sinergia Biomédica, el detalle
      de intervenciones y el enlace a cada informe. Se puede imprimir o descargar en Excel.</p>
    <div class="rep-grid">
      ${REPORTES.map(r=>`
        <article class="rep-card">
          <h4>${r.t}</h4><p>${r.d}</p>
          <div class="rep-acc">
            <button type="button" class="acc" onclick="reporteRapido('${id}','${r.k}','pdf')">Imprimir</button>
            <button type="button" class="acc" onclick="reporteRapido('${id}','${r.k}','xls')">Excel</button>
          </div>
        </article>`).join('')}
    </div>
    <p class="rep-pie">¿Necesitas otro corte? Filtra la lista en <b>Equipos y avance</b>
      y usa Exportar o Imprimir: el reporte respeta los filtros que tengas puestos.</p>`;
}

/* Aplica el filtro del reporte, genera el documento y deja los filtros como estaban */
function reporteRapido(id,k,fmt){
  const guardado={servicio:[...SEL.servicio],ambiente:[...SEL.ambiente],equipo:[...SEL.equipo],
    valorizacion:[...SEL.valorizacion],criticidad:[...SEL.criticidad],proximo:[...SEL.proximo],
    avance:[...SEL.avance],q:DET_Q,solo:DET_SOLO};
  selLimpia(); DET_Q='';
  if(k==='venc')      SEL.proximo.add('VENCIDO');
  else if(k==='alta') SEL.criticidad.add('ALTA');
  else if(k==='inop') SEL.avance.add('INOPERATIVO');
  else if(k==='ejec') SEL.avance.add('EJECUTADO');
  else if(k==='pend') SEL.avance.add('PENDIENTE');
  if(!detFiltrados(id).length){
    restaurarFiltros(guardado,id);
    alert('No hay equipos que cumplan ese criterio con los datos actuales.');
    return;
  }
  if(fmt==='pdf') imprimirReporte(id); else exportarExcel(id);
  setTimeout(()=>restaurarFiltros(guardado,id),800);
}
function restaurarFiltros(g,id){
  selLimpia();
  ['servicio','ambiente','equipo','valorizacion','criticidad','proximo','avance']
    .forEach(c=>g[c].forEach(v=>SEL[c].add(v)));
  DET_Q=g.q; DET_SOLO=g.solo; pintarPanel(id);
}

function valEstadoClase(e){
  const t=(e||'').toLowerCase();
  if(t.indexOf('cerrada')>=0||t.indexOf('conformidad')>=0)return 'ok';
  if(t.indexOf('presentada')>=0)return 'medio';
  if(t.indexOf('sin movimiento')>=0)return 'pend';
  return 'curso';
}

/* Fechas de la valorización + acceso al documento, solo cuando corresponde */
function bloqueFechas(v){
  const abierta = v.estado==='En ejecución';
  const c=[];
  c.push(v.presentacion
    ? `<div><dt>Presentada</dt><dd>${v.presentacion}</dd></div>`
    : `<div><dt>Presentación (máx.)</dt><dd>${v.presentacion_max||'—'}</dd></div>`);
  c.push(v.conformidad
    ? `<div><dt>Conformidad</dt><dd>${v.conformidad}</dd></div>`
    : `<div><dt>Conformidad (máx.)</dt><dd class="${abierta?'gris':''}">${abierta?'—':(v.conformidad_max||'—')}</dd></div>`);
  c.push(`<div><dt>Informes del periodo</dt><dd>${v.total}</dd></div>`);
  const docs = `<div class="val-docs">
      <button type="button" class="acc" onclick="reporteValorizacion('${v.n}','pdf')">Imprimir</button>
      <button type="button" class="acc" onclick="reporteValorizacion('${v.n}','xls')">Excel</button>
    </div>`;
  const acceso = (!abierta && v.pdf)
    ? `<button type="button" class="ibtn" onclick="verInforme('${v.pdf}','Valorización ${v.n}')">Ver valorización</button>`
    : (abierta ? '<span class="val-nota">Periodo en curso · aún no se presenta</span>' : '');
  return `<div class="val-info"><dl class="val-kv">${c.join('')}</dl>
    <div class="val-acc">${acceso||''}${docs}</div></div>`;
}

/* Aviso de plazo de conformidad (Cláusula Tercera: 7 días calendario) */
function avisoConformidad(v){
  if(v.estado!=='Presentada'||v.dias_conformidad===null||v.dias_conformidad===undefined)return '';
  const d=v.dias_conformidad;
  if(d>0) return `<div class="valaviso">Pendiente de su conformidad · quedan <b>${d} día${d===1?'':'s'}</b>
    (hasta el ${v.conformidad_max||''}).</div>`;
  if(d===0) return `<div class="valaviso urge">Último día para dar conformidad (${v.conformidad_max||''}).</div>`;
  return `<div class="valaviso ok">Venció el plazo de revisión el ${v.conformidad_max||''} sin observaciones:
    conforme al contrato, se entiende otorgada la conformidad.</div>`;
}

/* Filtra las filas de informe de todas las valorizaciones abiertas */
function filtrarItems(){
  const q=VAL_Q.trim().toLowerCase();
  document.querySelectorAll('.valrow').forEach(row=>{
    let vis=0;
    row.querySelectorAll('.vitem').forEach(it=>{
      const ok=!q||(it.dataset.buscar||'').indexOf(q)>=0;
      it.style.display=ok?'':'none'; if(ok)vis++;
    });
    const n=row.querySelector('.vi-nada');
    if(n)n.style.display=(q&&!vis)?'':'none';
    if(q&&vis&&!row.classList.contains('open'))row.classList.add('open');
  });
}

function valBloque(v){
  // Valorización futura: solo se anuncia, no se puede abrir
  if(v.futura) return `
    <div class="valrow futura" aria-disabled="true">
      <div class="valhead nolink">
        <span class="valn">${v.n}</span>
        <span class="valmes">${v.mes||''}<em>Se presenta hasta el ${v.presentacion_max||'—'}</em></span>
        <span class="eqpill pend">Programada</span>
      </div>
    </div>`;
  const items=(v.items||[]).slice().sort((a,b)=>(a.area||'').localeCompare(b.area||''));
  return `
  <div class="valrow${v.total?'':' vacia'}">
    <button type="button" class="valhead" onclick="this.parentNode.classList.toggle('open')">
      <span class="valn">${v.n}</span>
      <span class="valmes">${v.mes||''}<em>${v.total} informe${v.total===1?'':'s'}</em></span>
      <span class="eqpill ${valEstadoClase(v.estado)}">${v.estado}</span>
    </button>
    <div class="valbody">
      ${bloqueFechas(v)}
      ${avisoConformidad(v)}
      ${items.some(i=>i.preliminar)?`<div class="valaviso prelim">
        <b>Informes preliminares.</b> Esta valorización sigue en ejecución: los PDF que ve aquí son
        referenciales, para control de avance, y pueden variar. Los informes oficiales son los
        <b>firmados</b>, que se publican al presentarse la valorización.</div>`:''}
      ${v.obs?`<p class="dnote">${v.obs}</p>`:''}
      ${items.length?`<div class="vlista">
        <div class="vcab"><span>Código</span><span>Equipo</span><span>Ejecutado</span><span>Estado</span><span>Informe</span></div>
        ${items.map(i=>`
        <div class="vitem" data-buscar="${[i.cod,i.equipo,i.area,i.informe].join(' ').toLowerCase()}">
          <span class="vi-cod">${i.cod}</span>
          <span class="vi-eq">${i.equipo}<em>${i.area} · ${i.tipo==='MC'?'Correctivo':'Preventivo'}</em></span>
          <span class="vi-fec">${i.fecha||'—'}</span>
          ${i.estado?`<span class="iest ${i.estado.toUpperCase().indexOf('INOPER')===0?'bad':'good'}">${i.estado}</span>`:'<span></span>'}
          ${botonesInforme(i)}
        </div>`).join('')}
        <p class="vi-nada hvacio" style="display:none">Ningún informe coincide con la búsqueda.</p>
      </div>`:'<p class="hvacio">Aún no hay informes emitidos en este periodo.</p>'}
    </div>
  </div>`;
}

/* Informe firmado (escaneado) primero; el PDF preliminar mientras no exista */
function botonesInforme(i){
  const t=(i.informe||'Informe').replace(/'/g,'');
  if(i.scan) return `<span class="ibtns">
      <button type="button" class="ibtn" onclick="verInforme('${i.scan}','${t} (firmado)')">Ver informe firmado</button>
      ${i.pdf?`<button type="button" class="ibtn alt" onclick="verInforme('${i.pdf}','${t}')">PDF</button>`:''}
    </span>`;
  if(i.pdf) return `<span class="ibtns">
      <button type="button" class="ibtn prelim" onclick="verInforme('${i.pdf}','${t} — preliminar')">Ver PDF preliminar</button>
    </span>`;
  return '<span class="ibtn off">Sin informe</span>';
}

function detFiltrados(id){
  const d=PR_DET[id]; if(!d)return [];
  const q=DET_Q.toLowerCase();
  return d.equipos.filter(e=>{
    if(DET_SOLO&&!e.alcance)return false;
    if(SEL.servicio.size&&!SEL.servicio.has(grupoDe(e.area)))return false;
    if(SEL.ambiente.size&&!SEL.ambiente.has(e.area))return false;
    if(SEL.equipo.size  &&!SEL.equipo.has(e.nom))return false;
    if(SEL.valorizacion.size){
      const v=valsDe(e);
      const ok=v.length?v.some(x=>SEL.valorizacion.has(x)):SEL.valorizacion.has('SIN');
      if(!ok)return false;
    }
    if(SEL.criticidad.size&&!SEL.criticidad.has(criticidadDe(e)))return false;
    if(SEL.proximo.size &&!SEL.proximo.has(proximoDe(e).estado))return false;
    if(SEL.avance.size  &&![...SEL.avance].some(k=>cumpleAvance(e,k)))return false;
    if(!q)return true;
    return (e.nom+' '+e.marca+' '+e.modelo+' '+e.serie+' '+e.cod+' '+e.area).toLowerCase().includes(q);
  });
}

/* Filtra la lista desde el tablero, sin salir de la vista */
function irAEquipos(id,f){
  selLimpia();
  if(f.grupo)SEL.servicio.add(f.grupo);
  if(f.area)SEL.ambiente.add(f.area);
  if(f.tipo)SEL.equipo.add(f.tipo);
  if(f.estado)SEL.avance.add(f.estado);
  if(f.proximo)SEL.proximo.add(f.proximo);
  if(f.criticidad)SEL.criticidad.add(f.criticidad);
  DET_Q='';
  if(f.solo!==undefined)DET_SOLO=f.solo;
  DET_TAB='eq'; pintarPanel(id);
}
function limpiarFiltros(id){
  selLimpia(); DET_Q=''; DET_SOLO=true; DET_ORDEN=''; pintarPanel(id);
}
function filtrosActivos(){
  const ROT={COMPLETO:'Servicio completo',EJECUTADO:'Con ejecutadas',PENDIENTE:'Con pendientes',
             OPERATIVO:'Operativos',INOPERATIVO:'Inoperativos'};
  const f=[];
  SEL.servicio.forEach(v=>f.push(v));
  SEL.ambiente.forEach(v=>f.push(v));
  SEL.equipo.forEach(v=>f.push(v));
  SEL.valorizacion.forEach(v=>f.push(v==='SIN'?'Sin valorizar':'Valorización '+v));
  SEL.proximo.forEach(v=>f.push(PROX_ROT[v]||v));
  SEL.criticidad.forEach(v=>f.push('Criticidad '+v.toLowerCase()));
  SEL.avance.forEach(v=>f.push(ROT[v]||v));
  
  if(!DET_SOLO)f.push('Incluye fuera de alcance');
  return f;
}

function paneEquipos(id,p,d){
  const f=filtrosActivos();
  const m=metricas(d, f.length?detFiltrados(id):null);   // los indicadores siguen la selección
  return `
    <div class="avance-band">
      <div class="ab-txt">
        <span class="ab-lbl">Avance del contrato</span>
        <span class="ab-det">${m.ejec} de ${m.inter} intervenciones ejecutadas</span>
      </div>
      <div class="ab-bar"><i id="prBar"></i></div>
      <span class="ab-pct">${p.avance}%</span>
    </div>

    <details class="bloque areas"${AREAS_OPEN?' open':''} ontoggle="AREAS_OPEN=this.open">
      <summary><span>Avance por área</span><i>${resumenAreas(d)}</i></summary>
      ${tableroAreas(id,d)}
    </details>

    <div class="kpis">
      <button type="button" class="kpi${!f.length?' act':''}" onclick="irAEquipos('${id}',{})">
        <b>${m.equipos}</b><span>equipos totales en el alcance</span></button>
      <button type="button" class="kpi${SEL.avance.has('EJECUTADO')?' act':''}" onclick="irAEquipos('${id}',{estado:'EJECUTADO'})">
        <b>${m.ejec}<em>/${m.inter}</em></b><span>intervenciones ejecutadas</span></button>
      <button type="button" class="kpi${SEL.avance.has('COMPLETO')?' act':''}" onclick="irAEquipos('${id}',{estado:'COMPLETO'})">
        <b>${m.eqListos}<em>/${m.equipos}</em></b><span>equipos ejecutados</span></button>
      <button type="button" class="kpi ${m.venc?'alerta':''}${SEL.proximo.has('VENCIDO')?' act':''}"
              onclick="irAEquipos('${id}',{proximo:'VENCIDO'})">
        <b>${m.venc}</b><span>vencidos${m.vencAlta?` · ${m.vencAlta} de alta criticidad`:''}</span></button>
      <button type="button" class="kpi ${m.inop?'alerta':''}${SEL.avance.has('INOPERATIVO')?' act':''}"
              onclick="irAEquipos('${id}',{estado:'INOPERATIVO'})">
        <b>${m.inop}</b><span>equipos inoperativos</span></button>
    </div>

    ${membrete(id)}
    <div class="lista-head" id="listaEquipos">
      <h4>Lista de equipos</h4>
      <div class="lh-acc">
        <span class="th-nota">${f.length?`${m.equipos} en la selección · `:''}${d.totales.equipos} registrados</span>
        <button type="button" class="acc" onclick="exportarCSV('${id}')" title="Descargar la vista actual en Excel">
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.4">
            <path d="M8 2v8m0 0 3-3m-3 3L5 7M2.5 12.5h11"/></svg>Exportar</button>
        <button type="button" class="acc" onclick="imprimirReporte('${id}')" title="Reporte con informes e intervenciones">
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.4">
            <path d="M4.5 6V2.5h7V6M4.5 12H3V6h10v6h-1.5M4.5 9.5h7v4h-7z"/></svg>Imprimir</button>
      </div>
    </div>
    <div class="det-filtros">
      <input type="search" placeholder="Buscar equipo, código, serie o ambiente" value="${DET_Q}"
             oninput="DET_Q=this.value;pintarLista('${id}')">
      <div class="chips" role="group" aria-label="Filtros rápidos">
        ${[['','Todos'],['COMPLETO','Ejecutados'],['PENDIENTE','Pendientes'],
           ['INOPERATIVO','Inoperativos'],['OPERATIVO','Operativos']]
          .map(([k,t])=>`<button type="button" class="chip${(k?SEL.avance.has(k):!SEL.avance.size)?' on':''}"
             onclick="${k?`SEL.avance.has('${k}')?SEL.avance.delete('${k}'):SEL.avance.add('${k}')`
                        :'SEL.avance.clear()'};pintarPanel('${id}')">${t}</button>`).join('')}
      </div>
      <label class="det-chk"><input type="checkbox"${DET_SOLO?' checked':''}
             onchange="DET_SOLO=this.checked;pintarPanel('${id}')"> Solo en alcance</label>
    </div>
    ${f.length?`<div class="filtro-act">
      <span>Filtrando por: ${f.map(x=>`<b>${x}</b>`).join(' · ')}</span>
      <button type="button" onclick="limpiarFiltros('${id}')">Quitar filtros</button></div>`:''}
    <div id="detLista"></div>

    <footer class="pie-serv">
      <p class="ps-desc">${p.desc}</p>
      <div class="ps-cta">
        <span>¿Consultas sobre el avance del servicio?</span>
        <a class="ibtn wa-btn" target="_blank" rel="noopener"
           href="${waLink(p)}">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
            <path d="M17.5 14.4c-.3-.2-1.8-.9-2-1-.3-.1-.5-.2-.7.1-.2.3-.7 1-.9 1.2-.2.2-.3.2-.6.1-1.7-.9-2.9-1.6-4-3.5-.3-.5.3-.5.8-1.5.1-.2 0-.4 0-.5s-.7-1.6-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.3 5.2 4.6 1.9.8 2.7.9 3.6.8.6-.1 1.8-.7 2-1.5.2-.7.2-1.4.2-1.5-.1-.1-.3-.2-.6-.3z"/>
            <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2z"/></svg>
          Escribir por WhatsApp</a>
      </div>
    </footer>`;
}

let EQ_SEL='';

/* ── Encabezados con menú de filtro ── */
function cabeceraCols(id){
  const col=(campo,txt)=>{
    const n=SEL[campo]?SEL[campo].size:0, act=n||(campo==='codigo'&&DET_ORDEN);
    return `<button type="button" class="th${act?' on':''}"
      onclick="menuCol(event,'${id}','${campo}')">${txt}${n?`<b>${n}</b>`:''}<i>▾</i></button>`;};
  return `<div class="eqcab">
    ${col('servicio','Servicio')}
    ${col('codigo','Código')}
    ${col('equipo','Equipo')}
    ${col('criticidad','Criticidad')}
    ${col('ambiente','Ambiente')}
    ${col('valorizacion','Valoriz.')}
    ${col('proximo','Próximo')}
    ${col('avance','Avance')}
    <span></span></div>`;
}

function menuCol(ev,id,campo){
  ev.stopPropagation(); cerrarMenuCol();
  const d=PR_DET[id]; if(!d)return;
  const base=d.equipos.filter(e=>!DET_SOLO||e.alcance);
  MENU_ID=id; MENU_CAMPO=campo;
  const m=document.createElement('div'); m.className='colmenu'; m.id='colMenu';

  if(campo==='codigo'){
    m.innerHTML=`<div class="cm-tit">Ordenar la lista</div>
      ${[['','Agrupado por servicio'],['asc','Código A → Z'],['desc','Código Z → A']]
        .map(([v,t])=>`<button type="button" class="cm-op${DET_ORDEN===v?' on':''}"
          onclick="DET_ORDEN='${v}';cerrarMenuCol();pintarPanel('${id}')"><span>${t}</span></button>`).join('')}`;
    return montarMenu(m,ev);
  }

  let ops;
  if(campo==='servicio')      ops=[...new Set(base.map(e=>grupoDe(e.area)))].sort()
        .map(v=>({v,t:v,n:base.filter(e=>grupoDe(e.area)===v).length}));
  else if(campo==='ambiente') ops=[...new Set(base.map(e=>e.area))].filter(Boolean).sort()
        .map(v=>({v,t:v,n:base.filter(e=>e.area===v).length}));
  else if(campo==='equipo')   ops=[...new Set(base.map(e=>e.nom))].filter(Boolean).sort()
        .map(v=>({v,t:v,n:base.filter(e=>e.nom===v).length}));
  else if(campo==='criticidad'){
    ops=['ALTA','MEDIA','BAJA'].map(v=>({v,t:CRIT_ROT[v],
      n:base.filter(e=>criticidadDe(e)===v).length})).filter(o=>o.n);
  }
  else if(campo==='proximo'){
    ops=['VENCIDO','PROXIMO','ALDIA','SIN'].map(v=>({v,t:PROX_ROT[v],
      n:base.filter(e=>proximoDe(e).estado===v).length})).filter(o=>o.n);
  }
  else if(campo==='valorizacion'){
    const todas=[...new Set(base.flatMap(e=>valsDe(e)))].sort();
    ops=todas.map(v=>({v,t:v,n:base.filter(e=>valsDe(e).includes(v)).length}));
    const sinVal=base.filter(e=>!valsDe(e).length).length;
    if(sinVal)ops.push({v:'SIN',t:'Sin valorizar aún',n:sinVal});
  }
  else ops=[['COMPLETO','Servicio completo'],['EJECUTADO','Con ejecutadas'],
            ['PENDIENTE','Con pendientes'],['OPERATIVO','Operativos'],['INOPERATIVO','Inoperativos']]
        .map(([v,t])=>({v,t,n:base.filter(e=>cumpleAvance(e,v)).length}));

  MENU_OPS=ops;
  const sel=SEL[campo], todos=sel.size===0;
  m.innerHTML=`
    <div class="cm-tit">Filtrar por ${campo}
      <button type="button" class="cm-lim" onclick="SEL['${campo}'].clear();cerrarMenuCol();pintarPanel('${id}')">Limpiar</button></div>
    ${ops.length>8?'<input type="search" class="cm-buscar" placeholder="Buscar…" oninput="filtrarOpciones(this.value)">':''}
    <label class="cm-op cm-todos${todos?' on':''}">
      <input type="checkbox" ${todos?'checked':''}
             onchange="SEL['${campo}'].clear();cerrarMenuCol();pintarPanel('${id}')">
      <span>Seleccionar todos</span></label>
    <div class="cm-lista">${ops.map((o,ix)=>`
      <label class="cm-op${sel.has(o.v)?' on':''}" data-txt="${o.t.toLowerCase()}">
        <input type="checkbox" ${sel.has(o.v)?'checked':''} onchange="marcarCol(${ix},this.checked)">
        <span>${o.t}</span><em>${o.n}</em></label>`).join('')}</div>`;
  montarMenu(m,ev);
}

let MENU_CAMPO='', MENU_OPS=[];
function marcarCol(ix,on){
  const v=MENU_OPS[ix].v, s=SEL[MENU_CAMPO];
  on?s.add(v):s.delete(v);
  const l=document.querySelectorAll('#colMenu .cm-lista .cm-op')[ix];
  if(l)l.classList.toggle('on',on);
  const t=document.querySelector('#colMenu .cm-todos');
  if(t){t.classList.toggle('on',s.size===0); t.querySelector('input').checked=s.size===0;}
  pintarPanel(MENU_ID);
}
function filtrarOpciones(q){
  q=(q||'').toLowerCase();
  document.querySelectorAll('#colMenu .cm-lista .cm-op').forEach(l=>{
    l.style.display=(l.dataset.txt||'').indexOf(q)>=0?'':'none';});
}
function montarMenu(m,ev){
  document.body.appendChild(m);
  const r=ev.currentTarget.getBoundingClientRect();
  m.style.left=Math.min(r.left,window.innerWidth-m.offsetWidth-14)+'px';
  m.style.top=(r.bottom+6)+'px';
  m.addEventListener('click',e=>e.stopPropagation());
  setTimeout(()=>document.addEventListener('click',cerrarMenuCol,{once:true}),0);
}

function aplicarCol(v){ if(MENU_SET)MENU_SET(v); cerrarMenuCol(); pintarPanel(MENU_ID); }
function cerrarMenuCol(){ const m=document.getElementById('colMenu'); if(m)m.remove(); }

/* Descarga la vista actual (con sus filtros) como CSV para Excel */
/* Membrete que solo aparece al imprimir */
/* Enlace de WhatsApp con el contexto del contrato ya escrito */
function waLink(p){
  const S=(typeof SITE!=='undefined')?SITE:{};
  const num=String(S.whatsapp||'51956614346').replace(/\D/g,'');
  const texto=`Hola, soy de ${p.cliente||'la clínica'}. `
    +`Tengo una consulta sobre el avance del contrato ${(p.servicio||'').replace(/^Contrato\s*/i,'')}.`;
  return `https://wa.me/${num}?text=${encodeURIComponent(texto)}`;
}

function membrete(id){
  const p=PROYECTOS.find(x=>x.id===id)||{}, d=PR_DET[id]||{};
  const f=filtrosActivos();
  const hoy=new Date();
  const fecha=('0'+hoy.getDate()).slice(-2)+'/'+('0'+(hoy.getMonth()+1)).slice(-2)+'/'+hoy.getFullYear();
  const n=detFiltrados(id).length;
  const S=(typeof SITE!=='undefined')?SITE:{};
  return `
  <header class="membrete">
    <div class="mb-top">
      <svg class="mb-logo" viewBox="0 0 470 116" xmlns="http://www.w3.org/2000/svg"
           role="img" aria-label="Sinergia Biomédica">
        <text x="0" y="86" font-family="Chakra Petch, sans-serif" font-size="96"
              font-weight="700" fill="#9A7F4E">S</text>
        <text x="56" y="86" font-family="Chakra Petch, sans-serif" font-size="96"
              font-weight="700" fill="#17191D">B</text>
        <text x="128" y="52" font-family="Chakra Petch, sans-serif" font-size="46"
              font-weight="700" letter-spacing="1" fill="#17191D">SINERGIA</text>
        <text x="129" y="88" font-family="Chakra Petch, sans-serif" font-size="27"
              font-weight="600" letter-spacing="8.5" fill="#17191D">BIOMÉDICA</text>
        <line x1="128" y1="97" x2="466" y2="97" stroke="#9A7F4E" stroke-width="2"/>
        <text x="128" y="112" font-family="Titillium Web, sans-serif" font-size="14"
              fill="#6E727A">Herramientas de metrología que distinguen su servicio</text>
      </svg>
      <div class="mb-contacto">
        <span>${S.direccion||'Av. Simón Bolívar 2150 · Pueblo Libre, Lima'}</span>
        <span>T. 956 614 346</span>
        <span>logistica@sinergiabiomedica.pe</span>
        <b>${S.web||'www.sinergiabiomedica.pe'}</b>
      </div>
    </div>
    <div class="mb-doc">
      <h2>${DOC_TITULO||'Reporte de informes de mantenimiento'}</h2>
      <span>Emitido el ${fecha}</span>
    </div>
    <dl class="mb-datos">
      <div><dt>Cliente</dt><dd>${p.cliente||''}</dd></div>
      <div><dt>Contrato</dt><dd>${(p.servicio||'').replace(/^Contrato\s*/i,'')}</dd></div>
      <div><dt>Equipos listados</dt><dd>${n} de ${d.totales?d.totales.equipos:n}</dd></div>
      <div><dt>Filtros</dt><dd>${f.length?f.join(' · '):'Sin filtros'}</dd></div>
    </dl>
  </header>
  <footer class="pie-impreso">
    ${S.razonSocial||'SERVICIOS INTEGRALES SINERGIA S.A.C.'} &nbsp;·&nbsp; RUC ${S.ruc||'20615862682'}
  </footer>`;
}

/* ── Filas del reporte: una por intervención, como el metrado de la cotización ── */
function filasReporte(id){
  const out=[];
  detFiltrados(id).forEach(e=>{
    const px=proximoDe(e);
    const ints=e.intervenciones.slice().sort((a,b)=>(a.tipo===b.tipo?a.n-b.n:(a.tipo==='MC'?1:-1)));
    if(!ints.length){ out.push({e,px,i:null}); return; }
    ints.forEach(i=>out.push({e,px,i}));
  });
  return out;
}

function datosCabecera(id){
  const p=PROYECTOS.find(x=>x.id===id)||{}, d=PR_DET[id]||{};
  const h=new Date();
  return {p,d,
    fecha:('0'+h.getDate()).slice(-2)+'/'+('0'+(h.getMonth()+1)).slice(-2)+'/'+h.getFullYear(),
    filtros:filtrosActivos(), m:metricas(d,detFiltrados(id))};
}

/* ── Exportar a Excel con membrete y pie, no un CSV pelado ── */
function exportarCSV(id){ exportarExcel(id); }

function exportarExcel(id){
  const {p,d,fecha,filtros,m}=datosCabecera(id);
  const filas=filasReporte(id);
  if(!filas.length)return;
  const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const lim=s=>(s&&s!=='S/M'&&s!=='S/S'&&s!=='—')?esc(s):'';
  const N=11;

  const cab=['AMBIENTE','CÓDIGO','EQUIPO','MARCA','MODELO','SERIE',
             'ESTADO','EJECUTADA','PRÓXIMO MANT.','VAL.','N° DE INFORME'];
  const anchos=[130,88,205,90,80,105,88,78,88,52,215];

  let grupo='';
  const cuerpo=filas.map(({e,px,i},ix)=>{
    const g=grupoDe(e.area), nuevoG=g!==grupo; grupo=g;
    const est=(i&&i.estado||'').toUpperCase();
    const inf=i&&(i.scan||i.pdf)
      ? `<a href="${esc(i.scan||i.pdf)}">${esc(i.informe)}</a>` : esc(i&&i.informe);
    return `${nuevoG?`<tr><td colspan="${N}" class="rg">${esc(g)}</td></tr>`:''}
      <tr class="${ix%2?'par':''}">
      <td>${esc(e.area)}</td><td class="cod">${esc(e.cod)}</td><td class="eq">${esc(e.nom)}</td>
      <td>${lim(e.marca)}</td><td>${lim(e.modelo)}</td><td class="ser">${lim(e.serie)}</td>
      <td class="${est.indexOf('INOPER')===0?'mal':(est?'bien':'')}">${esc(i&&i.estado)}</td>
      <td class="f">${esc(i&&i.fecha)}</td>
      <td class="f ${px.estado==='VENCIDO'?'mal':(px.estado==='PROXIMO'?'ojo':'')}">${esc(px.txt||'')}</td>
      <td class="c">${esc(i&&i.valorizacion)}</td>
      <td class="cod lk">${inf}</td></tr>`;
  }).join('');

  const nEj=filas.filter(x=>x.i&&x.i.hecho).length;
  const nInf=filas.filter(x=>x.i&&(x.i.scan||x.i.pdf)).length;

  const html=`<html xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8">
  <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
    <x:Name>Reporte</x:Name><x:WorksheetOptions>
      <x:FreezePanes/><x:FrozenNoSplit/><x:SplitHorizontalPosition>11</x:SplitHorizontalPosition>
      <x:TopRowBottomPane>11</x:TopRowBottomPane><x:ActivePane>2</x:ActivePane>
      <x:Print><x:ValidPrinterInfo/><x:Orientation>Landscape</x:Orientation>
        <x:FitWidth>1</x:FitWidth><x:FitHeight>0</x:FitHeight>
        <x:Header x:Margin="0.3"/><x:Footer x:Data="&amp;CSERVICIOS INTEGRALES SINERGIA S.A.C. · RUC 20615862682&amp;RPág. &amp;P de &amp;N"/>
      </x:Print></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
  <style>
    table{border-collapse:collapse}
    td,th{font-family:Calibri,Arial;font-size:9.5pt;vertical-align:middle;border:none;
          mso-number-format:"\@"}
    .t1{font-size:16pt;font-weight:bold;color:#2A2D33;letter-spacing:1pt}
    .t2{font-size:9pt;color:#8A8578}
    .tr{font-size:9pt;color:#8A8578;text-align:right}
    .web{font-size:9pt;color:#9A7F4E;font-weight:bold;text-align:right}
    .rule{background:#9A7F4E;font-size:2pt}
    .doc{font-size:13pt;font-weight:bold;color:#2A2D33;letter-spacing:.5pt}
    .lbl{font-size:7.5pt;color:#8A8578;background:#F2F1ED;border:.5pt solid #BFBBB0}
    .val{font-size:10pt;font-weight:bold;color:#2A2D33;background:#F2F1ED;border:.5pt solid #BFBBB0}
    th{background:#2A2D33;color:#F5F3EE;font-size:8.5pt;font-weight:bold;padding:6px 5px;
       text-align:left;border-bottom:1.5pt solid #9A7F4E}
    td{padding:3px 5px;border-bottom:.5pt solid #BFBBB0}
    .par td{background:#F4F0E6}
    .rg{background:#F2F1ED;color:#2A2D33;font-size:8.5pt;font-weight:bold;letter-spacing:.5pt;
        border-top:.5pt solid #9A7F4E;border-bottom:.5pt solid #BFBBB0;padding:4px 5px}
    .cod{font-size:8.5pt;color:#8A8578}
    .eq{font-weight:bold;color:#2A2D33}
    .ser{font-size:8.5pt;color:#8A8578}
    .f{mso-number-format:"dd\/mm\/yyyy";text-align:center}
    .c{text-align:center}
    .bien{color:#1E6B2F;font-weight:bold} .mal{color:#9E342C;font-weight:bold}
    .ojo{color:#9A7F4E;font-weight:bold}
    .lk a{color:#9A7F4E;font-size:8.5pt}
    .tot td{background:#2A2D33;color:#F5F3EE;font-size:9pt;font-weight:bold;letter-spacing:.5pt;
            border-top:1.5pt solid #9A7F4E;padding:5px}
    .pie{font-size:8pt;color:#8A8578;border-top:1pt solid #9A7F4E;padding-top:4px}
  </style></head><body>
  <table>
    <colgroup>${anchos.map(a=>`<col width="${a}">`).join('')}</colgroup>
    <tr><td colspan="5" class="t1">SINERGIA BIOMÉDICA</td>
        <td colspan="6" class="tr">Av. Simón Bolívar 2150 · Pueblo Libre, Lima</td></tr>
    <tr><td colspan="5" class="t2">Servicios Integrales Sinergia S.A.C. · RUC 20615862682</td>
        <td colspan="6" class="tr">T. 956 614 346 · logistica@sinergiabiomedica.pe</td></tr>
    <tr><td colspan="5" class="t2">Herramientas de metrología que distinguen su servicio</td>
        <td colspan="6" class="web">www.sinergiabiomedica.pe</td></tr>
    <tr><td colspan="${N}" class="rule"></td></tr>
    <tr><td colspan="${N}"></td></tr>
    <tr><td colspan="7" class="doc">${(DOC_TITULO||'Reporte de informes de mantenimiento').toUpperCase()}</td>
        <td colspan="4" class="tr">Emitido el ${fecha}</td></tr>
    <tr><td colspan="${N}"></td></tr>
    <tr><td class="lbl">CLIENTE</td><td colspan="3" class="val">${esc(p.cliente)}</td>
        <td class="lbl">CONTRATO</td><td colspan="2" class="val">${esc((p.servicio||'').replace(/^Contrato\s*/i,''))}</td>
        <td class="lbl">EQUIPOS</td><td class="val">${m.equipos}</td>
        <td class="lbl">VENCIDOS</td><td class="val">${m.venc}</td></tr>
    <tr><td class="lbl">FILTROS</td>
        <td colspan="${N-1}" class="val">${esc(filtros.length?filtros.join(' · '):'Sin filtros')}</td></tr>
    <tr><td colspan="${N}"></td></tr>
    <tr>${cab.map(c=>`<th>${c}</th>`).join('')}</tr>
    ${cuerpo}
    <tr class="tot"><td colspan="6">TOTAL</td><td>${nEj} ejecutadas</td>
      <td colspan="2">${filas.length} intervenciones · ${m.equipos} equipos</td>
      <td></td><td>${nInf} informes</td></tr>
    <tr><td colspan="${N}"></td></tr>
    <tr><td colspan="${N}" class="pie">SERVICIOS INTEGRALES SINERGIA S.A.C. · RUC 20615862682 ·
        Generado desde el portal de clientes el ${fecha}</td></tr>
  </table></body></html>`;

  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob(['\ufeff'+html],{type:'application/vnd.ms-excel;charset=utf-8;'}));
  a.download=`reporte-mantenimiento-${(p.servicio||'contrato').replace(/[^\w-]+/g,'-')}-${new Date().toISOString().slice(0,10)}.xls`;
  document.body.appendChild(a); a.click(); a.remove();
}

/* ── Reporte de impresión: una fila por intervención, con sus informes ── */
function imprimirReporte(id){
  const cont=document.getElementById('repImp')||(()=>{
    const x=document.createElement('div'); x.id='repImp'; document.body.appendChild(x); return x;})();
  const {p,d,fecha,filtros,m}=datosCabecera(id);
  const filas=filasReporte(id);
  const esc=s=>String(s==null?'':s);
  let grupo='';
  cont.innerHTML=`
    ${membrete(id)}
    <table class="rep">
      <thead><tr>
        <th>Ambiente</th><th>Código</th><th>Equipo</th><th>Marca</th><th>Modelo</th><th>Serie</th>
        <th>Estado</th><th>Ejecutada</th><th>Próximo mant.</th><th>Val.</th>
        <th>N° de informe</th></tr></thead>
      <tbody>
      ${filas.map(({e,px,i},ix)=>{
        const g=grupoDe(e.area), nuevo=g!==grupo; grupo=g;
        const est=(i&&i.estado||'').toUpperCase();
        const lim=s=>(s&&s!=='S/M'&&s!=='S/S'&&s!=='—')?esc(s):'';
        return `${nuevo?`<tr class="rg"><td colspan="11">${g}</td></tr>`:''}
        <tr class="${ix%2?'par':''}">
          <td>${esc(e.area)}</td>
          <td class="cod">${esc(e.cod)}</td>
          <td class="eq">${esc(e.nom)}</td>
          <td>${lim(e.marca)}</td><td>${lim(e.modelo)}</td><td class="ser">${lim(e.serie)}</td>
          <td class="${est.indexOf('INOPER')===0?'mal':(est?'bien':'')}">${esc(i&&i.estado)}</td>
          <td class="f">${esc(i&&i.fecha)}</td>
          <td class="f ${px.estado==='VENCIDO'?'mal':(px.estado==='PROXIMO'?'ojo':'')}">${esc(px.txt||'')}</td>
          <td class="c">${esc(i&&i.valorizacion)}</td>
          <td class="cod">${i&&(i.scan||i.pdf)
              ?`<a class="lk" href="${esc(i.scan||i.pdf)}">${esc(i.informe)} ↗</a>`
              :esc(i&&i.informe)}</td>
        </tr>`;}).join('')}
      </tbody>
      <tfoot><tr class="tot">
        <td colspan="6">TOTAL</td>
        <td>${(()=>{const n=filas.filter(x=>x.i&&x.i.hecho).length;
              return n+' ejecutada'+(n===1?'':'s');})()}</td>
        <td colspan="2">${filas.length} intervenci${filas.length===1?'ón':'ones'} ·
            ${m.equipos} equipos</td>
        <td></td>
        <td>${(()=>{const n=filas.filter(x=>x.i&&(x.i.scan||x.i.pdf)).length;
              return n+' informe'+(n===1?'':'s');})()}</td>
      </tr></tfoot>
    </table>
    <p class="rep-nota">${filas.length} línea${filas.length===1?'':'s'} ·
      ${m.equipos} equipos · ${m.ejec} de ${m.inter} intervenciones ejecutadas ·
      ${m.venc} con mantenimiento vencido. Las líneas sin fecha de ejecución corresponden
      a intervenciones programadas que aún no se realizan.</p>`;
  document.body.classList.add('imprimiendo');
  window.print();
  setTimeout(()=>document.body.classList.remove('imprimiendo'),600);
}

function leyendaEstados(){
  return `<div class="leyenda">
    <span><i class="lg ok"></i>Servicio completo</span>
    <span><i class="lg medio"></i>Parcialmente ejecutado</span>
    <span><i class="lg pend"></i>Sin ejecutar</span>
    <span class="lg-nota">La cifra indica intervenciones ejecutadas sobre las programadas en el contrato.</span>
  </div>`;
}

function pintarLista(id){
  const cont=document.getElementById('detLista'); if(!cont)return;
  const lista=detFiltrados(id).slice().sort((a,b)=>{
    const ga=grupoDe(a.area), gb=grupoDe(b.area);
    if(DET_ORDEN==='asc') return a.cod.localeCompare(b.cod);
    if(DET_ORDEN==='desc')return b.cod.localeCompare(a.cod);
    return ga.localeCompare(gb)||(a.area||'').localeCompare(b.area||'')||a.cod.localeCompare(b.cod);
  });
  if(!lista.length){cont.innerHTML='<p class="hvacio">Ningún equipo coincide con los filtros aplicados.</p>';return;}
  let grupo='';
  cont.innerHTML='<div class="det-n">'+lista.length+' equipos</div>'+
    '<div class="eqlista">'+cabeceraCols(id)+
    lista.map(e=>{
      const hechas=e.intervenciones.filter(i=>i.hecho).length, tot=e.intervenciones.length;
      const est=tot&&hechas>=tot?'ok':(hechas?'medio':'pend');
      const g=grupoDe(e.area), nuevo=!DET_ORDEN&&g!==grupo; grupo=g;
      return `
      <button type="button" class="eqcard${e.alcance?'':' fuera'}${EQ_SEL===e.cod?' sel':''}${nuevo?' g1':''}"
              onclick="abrirEquipo('${id}','${e.cod}')">
        <span class="ec-serv">${DET_ORDEN?g:(nuevo?g:'')}</span>
        <span class="ec-cod">${e.cod}</span>
        <span class="ec-nom">${e.nom}<em>${[e.marca,e.modelo].filter(x=>x&&x!=='S/M').join(' ')||'—'}</em></span>
        <span class="ec-crit ${(()=>criticidadDe(e).toLowerCase())()}" title="${(()=>CRIT_ROT[criticidadDe(e)])()}">
          ${(()=>{const c=criticidadDe(e);return c.charAt(0)+c.slice(1).toLowerCase();})()}</span>
        <span class="ec-amb">${g===(e.area||'').toUpperCase().trim()?'':(e.area||'')}</span>
        <span class="ec-val">${(()=>{const v=valsDe(e);
          return v.length?v.map(x=>`<i>${x}</i>`).join(''):'<u>—</u>';})()}</span>
        <span class="ec-prox ${(()=>proximoDe(e).estado.toLowerCase())()}">${(()=>{
          const p=proximoDe(e);
          return p.estado==='SIN'?'<u>—</u>':`<b>${p.txt}</b>${p.estado==='VENCIDO'
            ?`<i>${Math.abs(p.dias)} d. vencido</i>`:(p.estado==='PROXIMO'?`<i>en ${p.dias} d.</i>`:'')}`;
        })()}</span>
        <span class="eqpill ${est}">${tot?hechas+'/'+tot:'—'}</span>
        <span class="ec-ir" aria-hidden="true">›</span>
      </button>`;
    }).join('')+'</div>'+leyendaEstados();
}

/* ---- Panel lateral con la ficha del equipo ---- */
function abrirEquipo(id,cod){
  const d=PR_DET[id]; if(!d)return;
  const e=d.equipos.find(x=>x.cod===cod); if(!e)return;
  EQ_SEL=cod; cerrarEquipo(true);
  const prev=e.intervenciones.filter(i=>i.tipo!=='MC').sort((a,b)=>a.n-b.n);
  const corr=e.intervenciones.filter(i=>i.tipo==='MC').sort((a,b)=>a.n-b.n);
  const hechas=e.intervenciones.filter(i=>i.hecho);
  const ult=hechas.length?hechas[hechas.length-1]:null;
  const estado=ult?(ult.estado||'').toUpperCase():'';
  const cls=estado.indexOf('INOPER')===0?'bad':(estado?'good':'');

  const ov=document.createElement('div');
  ov.className='eqov'; ov.id='eqOv';
  ov.innerHTML=`
    <aside class="eqpanel" role="dialog" aria-modal="true" aria-label="${e.nom}">
      <header class="ep-head">
        <button class="ep-x" onclick="cerrarEquipo()" aria-label="Cerrar">✕</button>
        <div class="ep-ruta">${e.cod}</div>
        <h3>${e.nom}</h3>
        <p class="ep-sub2">${[e.marca,e.modelo].filter(x=>x&&x!=='S/M').join(' · ')||'Sin marca registrada'}</p>
      </header>

      <div class="ep-body">
        <div class="ep-top">
          <div class="ep-foto">${e.foto?`<img src="${e.foto}" alt="${e.nom}" loading="lazy">`
            :`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" class="ep-ico">
                 <rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/>
                 <path d="m3 17 5-4 4 3 3-2 6 5"/></svg><span class="sinfoto">Sin fotografía</span>`}</div>
          <dl class="ep-kv">
            <div><dt>Criticidad</dt><dd class="crit-${(()=>criticidadDe(e).toLowerCase())()}">${(()=>CRIT_ROT[criticidadDe(e)])()}</dd></div>
            <div><dt>Ubicación</dt><dd>${e.area||'—'}</dd></div>
            <div><dt>Serie</dt><dd>${e.serie&&e.serie!=='S/S'?e.serie:'—'}</dd></div>
            <div><dt>Código MINSA</dt><dd>${e.minsa||'—'}</dd></div>
            <div><dt>Ítem del contrato</dt><dd>${e.item||'—'}</dd></div>
          </dl>
        </div>

        <div class="ep-stats">
          <div class="${(()=>{const p=proximoDe(e);return p.estado==='VENCIDO'?'bad':(p.estado==='PROXIMO'?'warn':'');})()}">
            <b>${(()=>{const p=proximoDe(e);return p.estado==='SIN'?'—':p.txt;})()}</b>
            <span>${(()=>{const p=proximoDe(e);
              return p.estado==='VENCIDO'?`vencido hace ${Math.abs(p.dias)} días`
                :(p.estado==='PROXIMO'?`próximo · en ${p.dias} días`
                :(p.estado==='SIN'?'sin programar':'próximo servicio'));})()}</span></div>
          <div><b>${e.servicios||0}</b><span>servicios/año</span></div>
          <div><b>${hechas.length}<em>/${e.intervenciones.length}</em></b><span>ejecutados</span></div>
          <div class="${cls}"><b>${estado?(cls==='bad'?'Inoperativo':'Operativo'):'—'}</b>
            <span>${ult?'último registro':'sin intervenir'}</span></div>
        </div>

        <div class="ep-sub">Historial de intervenciones</div>
        <div class="ep-hist">
          <div class="hgrupo">Preventivo${prev.length?` <em>${prev.filter(i=>i.hecho).length}/${prev.length}</em>`:''}</div>
          ${prev.length?prev.map(i=>hitoIntervencion(i)).join('')
            :'<p class="hvacio">Sin preventivos programados en el contrato.</p>'}
          <div class="hgrupo">Correctivo${corr.length?` <em>${corr.length}</em>`:''}</div>
          ${corr.length?corr.map(i=>hitoIntervencion(i)).join('')
            :'<p class="hvacio">Sin correctivos registrados.</p>'}
        </div>
      </div>
    </aside>`;
  ov.addEventListener('click',ev=>{if(ev.target===ov)cerrarEquipo();});
  document.body.appendChild(ov);
  document.body.classList.add('lock');
  requestAnimationFrame(()=>ov.classList.add('abierto'));
  pintarLista(id);
}

function cerrarEquipo(silencio){
  const o=document.getElementById('eqOv'); if(o)o.remove();
  if(!silencio){document.body.classList.remove('lock'); EQ_SEL='';}
}

/* Una intervención dentro de la línea de tiempo */
function hitoIntervencion(i){
  const cls=i.hecho?(i.estado&&i.estado.toUpperCase().indexOf('INOPER')===0?'bad':'ok'):'pend';
  const f=(i.fecha||i.programada||'').split('/');
  return `
    <div class="hito ${cls}">
      <div class="h-fecha">${f.length===3?`<b>${f[0]}</b><span>${mesCorto(f[1])} ${f[2].slice(-2)}</span>`
        :'<b>—</b><span>s/f</span>'}</div>
      <div class="h-cont">
        <div class="h-line"><b>${i.tipo==='MC'?'Correctivo':'Preventivo'} ${i.n}</b>
          ${i.estado?`<span class="iest ${cls==='bad'?'bad':'good'}">${i.estado}</span>`:''}
          ${i.preliminar?'<span class="tag-prelim">preliminar</span>':''}
          ${!i.hecho?'<span class="tag-prelim">pendiente</span>':''}
        </div>
        <div class="h-meta">${i.informe||''}</div>
        ${!i.hecho&&i.programada?`<div class="h-meta">Programado para el ${i.programada}</div>`:''}
        ${i.falla?`<div class="h-meta"><i>Falla:</i> ${i.falla}</div>`:''}
        ${i.trabajo?`<div class="h-meta"><i>Trabajo:</i> ${i.trabajo}</div>`:''}
        <div class="h-btns">${botonesInforme(i)}</div>
      </div>
    </div>`;
}

function mesCorto(m){
  return ['','ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SET','OCT','NOV','DIC'][Number(m)]||'';
}

/* Visor de informes: abre el PDF de Drive dentro de la web */
function verInforme(url,titulo){
  cerrarInforme();
  const ov=document.createElement('div');
  ov.className='pdfov'; ov.id='pdfOv';
  ov.innerHTML=`
    <div class="pdfbox" role="dialog" aria-modal="true" aria-label="${titulo}">
      <div class="pdfhead">
        <span>${titulo}</span>
        <a href="${url.replace('/preview','/view')}" target="_blank" rel="noopener">Abrir en Drive</a>
        <button onclick="cerrarInforme()" aria-label="Cerrar">✕</button>
      </div>
      <iframe src="${url}" loading="lazy" allow="autoplay"></iframe>
    </div>`;
  ov.addEventListener('click',ev=>{if(ev.target===ov)cerrarInforme();});
  document.body.appendChild(ov);
  document.body.classList.add('lock');
}
function cerrarInforme(){
  const o=document.getElementById('pdfOv'); if(o)o.remove();
  if(!document.getElementById('eqOv')) document.body.classList.remove('lock');
}
document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;
  if(document.getElementById('pdfOv'))cerrarInforme(); else cerrarEquipo();});

pintarProyectos();

