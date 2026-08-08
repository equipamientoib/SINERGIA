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
let DET_AREA='', DET_Q='', DET_SOLO=true, DET_EST='';
let TAB_AREAS=[], TAB_ESTADOS=[];

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
  body.innerHTML=`
    <div class="crumb"><a onclick="go('#/clientes')">Nuestros clientes</a> &nbsp;/&nbsp; ${p.titulo}</div>
    <div class="dash-head" style="padding-top:18px">
      <div>
        <div class="k">${p.cliente}</div>
        <h1 style="font-size:clamp(22px,3vw,32px);font-weight:700;letter-spacing:-.8px;margin-top:8px">${p.titulo}</h1>
        <p style="color:var(--gris);font-size:13.5px;margin-top:6px">${p.servicio} · ${p.fecha}</p>
      </div>
      ${prBadge(p).replace('class="st','style="position:static" class="st')}
    </div>
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
  if(DET_TAB==='val') pane=d?paneValorizaciones(id,d):paneCargando();
  else                pane=d?paneEquipos(id,p,d):paneCargando();
  cont.innerHTML=`<div class="dash-card det-card">${tabsDet(id,nv)}${pane}</div>`;
  if(DET_TAB!=='val'){
    setTimeout(()=>{const b=document.getElementById('prBar');if(b)b.style.width=p.avance+'%';},80);
    pintarLista(id);
  }
  if(window.pageYOffset!==y) window.scrollTo(0,y);
}

function paneCargando(){
  return '<p class="dnote" style="padding:18px 0">Cargando el detalle…</p>';
}


function metricas(d){
  let equipos=0,inter=0,ejec=0,inop=0,eqListos=0,eqIniciados=0;
  d.equipos.forEach(e=>{
    if(!e.alcance)return;
    equipos++;
    let malo=false,h=0,t=0;
    e.intervenciones.forEach(i=>{inter++;t++; if(i.hecho){ejec++;h++;
      if((i.estado||'').toUpperCase().indexOf('INOPER')===0)malo=true;}});
    if(t&&h>=t)eqListos++;
    if(h)eqIniciados++;
    if(malo)inop++;
  });
  return {equipos,inter,ejec,inop,eqListos,eqIniciados,pend:inter-ejec,
          pct:inter?Math.round(ejec*100/inter):0};
}

/* Barras por área — cada fila abre la lista filtrada */
function tableroAreas(id,d){
  const m={};
  d.equipos.forEach(e=>{
    if(!e.alcance)return;
    const a=e.area||'—';
    m[a]=m[a]||{eq:0,inter:0,ejec:0,inop:0};
    m[a].eq++;
    e.intervenciones.forEach(i=>{m[a].inter++;
      if(i.hecho){m[a].ejec++; if((i.estado||'').toUpperCase().indexOf('INOPER')===0)m[a].inop++;}});
  });
  const filas=Object.keys(m).map(a=>({a,...m[a],pct:m[a].inter?Math.round(m[a].ejec*100/m[a].inter):0}))
                            .sort((x,y)=>y.pct-x.pct||y.inter-x.inter);
  TAB_AREAS=filas;
  return `<div class="tab-areas">${filas.map((f,ix)=>`
      <button type="button" class="ta-row${DET_AREA===f.a?' act':''}"
              onclick="irAEquipos('${id}',{area:TAB_AREAS[${ix}].a})">
        <span class="ta-nom">${f.a}${f.inop?`<i class="ta-alerta" title="${f.inop} inoperativo(s)">${f.inop}</i>`:''}</span>
        <span class="ta-eq">${f.eq} equipo${f.eq===1?'':'s'}</span>
        <span class="ta-bar"><i style="width:${f.pct}%"></i></span>
        <span class="ta-num">${f.ejec}/${f.inter}</span>
        <span class="ta-pct">${f.pct}%</span>
      </button>`).join('')}</div>`;
}


function paneValorizaciones(id,d){
  const vals=d.valorizaciones||[];
  if(!vals.length) return '<p class="dnote" style="padding:14px 0">Aún no hay valorizaciones registradas.</p>';
  return `<div class="det-n">${vals.length} valorizaci${vals.length===1?'ón':'ones'} · se listan solo los informes ya emitidos</div>
    ${vals.map(v=>valBloque(v)).join('')}`;
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
    PR_DET[id]=d; DET_AREA=''; DET_Q=''; DET_EST=''; pintarPanel(id);
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

function tabsDet(id,nv){
  return `<div class="det-tabs">
    <button type="button" class="${DET_TAB==='eq'?'on':''}" onclick="setDetTab('${id}','eq')">Equipos y avance</button>
    <button type="button" class="${DET_TAB==='val'?'on':''}" onclick="setDetTab('${id}','val')">Valorizaciones${nv?` <em>${nv}</em>`:''}</button>
  </div>`;
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
  const f=[];
  if(v.presentacion)          f.push(`<span><i>Presentada</i>${v.presentacion}</span>`);
  else if(v.presentacion_max) f.push(`<span><i>Se presenta hasta el</i>${v.presentacion_max}</span>`);
  if(v.conformidad)                      f.push(`<span><i>Conformidad</i>${v.conformidad}</span>`);
  else if(v.conformidad_max && !abierta) f.push(`<span><i>Conformidad (máx.)</i>${v.conformidad_max}</span>`);
  if(!f.length) return '';
  const acceso = (!abierta && v.pdf)
    ? `<button type="button" class="ibtn" onclick="verInforme('${v.pdf}','Valorización ${v.n}')">Ver valorización</button>`
    : (abierta ? '<span class="val-nota">Periodo en curso · aún no se presenta</span>' : '');
  return `<div class="valfechas">${f.join('')}${acceso}</div>`;
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

function valBloque(v){
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
      ${items.length?items.map(i=>`
        <div class="intv hecho">
          <div class="itxt">
            <b>${i.cod}</b>
            <span>${i.equipo}</span>
            <span class="ifec">${i.area} · ${i.tipo==='MC'?'Correctivo':'Preventivo'} · ${i.fecha}</span>
            ${i.estado?`<span class="iest ${i.estado.toUpperCase().indexOf('INOPER')===0?'bad':'good'}">${i.estado}</span>`:''}
          </div>
          ${botonesInforme(i)}
        </div>`).join(''):'<p class="dnote">Aún no hay informes emitidos en este periodo.</p>'}
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
    if(DET_AREA&&e.area!==DET_AREA)return false;
    if(DET_EST){
      const hechas=e.intervenciones.filter(i=>i.hecho);
      if(DET_EST==='PENDIENTE'){ if(!e.intervenciones.some(i=>!i.hecho))return false; }
      else if(DET_EST==='EJECUTADO'){ if(!hechas.length)return false; }
      else if(DET_EST==='COMPLETO'){ if(!e.intervenciones.length||hechas.length<e.intervenciones.length)return false; }
      else if(!hechas.some(i=>(i.estado||'').toUpperCase()===DET_EST))return false;
    }
    if(!q)return true;
    return (e.nom+' '+e.marca+' '+e.modelo+' '+e.serie+' '+e.cod).toLowerCase().includes(q);
  });
}

/* Filtra la lista desde el tablero, sin salir de la vista */
function irAEquipos(id,f){
  DET_AREA=f.area||''; DET_EST=f.estado||''; DET_Q='';
  if(f.solo!==undefined)DET_SOLO=f.solo;
  DET_TAB='eq'; pintarPanel(id);
}
function limpiarFiltros(id){
  DET_AREA=''; DET_EST=''; DET_Q=''; DET_SOLO=true; pintarPanel(id);
}
function filtrosActivos(){
  const f=[];
  if(DET_AREA)f.push(DET_AREA);
  if(DET_EST)f.push(DET_EST==='PENDIENTE'?'Con intervenciones pendientes'
    :(DET_EST==='EJECUTADO'?'Con intervenciones ejecutadas'
    :(DET_EST==='COMPLETO'?'Servicio completo':DET_EST)));
  if(!DET_SOLO)f.push('Incluye fuera de alcance');
  return f;
}

function paneEquipos(id,p,d){
  const areas=[...new Set(d.equipos.map(e=>e.area))].filter(Boolean).sort();
  const m=metricas(d), f=filtrosActivos();
  return `
    <div class="avance-band">
      <div class="ab-txt">
        <span class="ab-lbl">Avance del contrato</span>
        <span class="ab-det">${m.ejec} de ${m.inter} intervenciones ejecutadas</span>
      </div>
      <div class="ab-bar"><i id="prBar"></i></div>
      <span class="ab-pct">${p.avance}%</span>
    </div>

    <details class="bloque" open>
      <summary><span>Avance por área</span><i>toca un área para filtrar la lista</i></summary>
      ${tableroAreas(id,d)}
    </details>

    <div class="kpis">
      <button type="button" class="kpi${!f.length?' act':''}" onclick="irAEquipos('${id}',{})">
        <b>${m.equipos}</b><span>equipos totales en el alcance</span></button>
      <button type="button" class="kpi${DET_EST==='EJECUTADO'?' act':''}" onclick="irAEquipos('${id}',{estado:'EJECUTADO'})">
        <b>${m.ejec}<em>/${m.inter}</em></b><span>intervenciones ejecutadas</span></button>
      <button type="button" class="kpi${DET_EST==='COMPLETO'?' act':''}" onclick="irAEquipos('${id}',{estado:'COMPLETO'})">
        <b>${m.eqListos}<em>/${m.equipos}</em></b><span>equipos ejecutados</span></button>
      <button type="button" class="kpi ${m.inop?'alerta':''}${DET_EST==='INOPERATIVO'?' act':''}"
              onclick="irAEquipos('${id}',{estado:'INOPERATIVO'})">
        <b>${m.inop}</b><span>equipos inoperativos</span></button>
    </div>

    <div class="lista-head" id="listaEquipos">
      <h4>Lista de equipos</h4>
      <span class="th-nota">${d.totales.equipos} registrados · ${m.equipos} dentro del contrato</span>
    </div>
    <div class="det-filtros">
      <select onchange="DET_AREA=this.value;pintarPanel('${id}')">
        <option value="">Todas las áreas</option>
        ${areas.map(a=>`<option${a===DET_AREA?' selected':''}>${a}</option>`).join('')}
      </select>
      <input type="search" placeholder="Buscar equipo, marca o serie" value="${DET_Q}"
             oninput="DET_Q=this.value;pintarLista('${id}')">
      <div class="chips" role="group" aria-label="Filtros rápidos">
        ${[['','Todos'],['COMPLETO','Ejecutados'],['PENDIENTE','Pendientes'],
           ['INOPERATIVO','Inoperativos'],['OPERATIVO','Operativos']]
          .map(([k,t])=>`<button type="button" class="chip${DET_EST===k?' on':''}"
             onclick="DET_EST='${k}';pintarPanel('${id}')">${t}</button>`).join('')}
      </div>
      <label class="det-chk"><input type="checkbox"${DET_SOLO?' checked':''}
             onchange="DET_SOLO=this.checked;pintarPanel('${id}')"> Solo en alcance</label>
    </div>
    ${f.length?`<div class="filtro-act">
      <span>Filtrando por: ${f.map(x=>`<b>${x}</b>`).join(' · ')}</span>
      <button type="button" onclick="limpiarFiltros('${id}')">Quitar filtros</button></div>`:''}
    <div id="detLista"></div>

    <details class="bloque ficha-serv">
      <summary><span>Datos del servicio</span></summary>
      <div class="res-pie">
        <div class="spec">
          <div class="row"><span class="l">Servicio</span><span class="v">${p.servicio}</span></div>
          <div class="row"><span class="l">Inicio</span><span class="v">${p.fecha}</span></div>
          <div class="row"><span class="l">Estado</span><span class="v">${p.estado}</span></div>
          <div class="row"><span class="l">Equipos</span><span class="v">${m.equipos} en alcance</span></div>
        </div>
        <p class="dnote">${p.desc}<br><br>¿Consultas sobre el avance?
          <a onclick="go('#/contacto')" style="color:var(--cobre-d);font-weight:600;cursor:pointer">Contáctanos</a>.</p>
      </div>
    </details>`;
}

let EQ_SEL='';

function pintarLista(id){
  const cont=document.getElementById('detLista'); if(!cont)return;
  const lista=detFiltrados(id);
  if(!lista.length){cont.innerHTML='<p class="dnote">No hay equipos que coincidan con el filtro.</p>';return;}
  cont.innerHTML='<div class="det-n">'+lista.length+' equipos</div>'+
    '<div class="eqlista">'+lista.map(e=>{
      const hechas=e.intervenciones.filter(i=>i.hecho).length, tot=e.intervenciones.length;
      const est=tot&&hechas>=tot?'ok':(hechas?'medio':'pend');
      return `
      <button type="button" class="eqcard${e.alcance?'':' fuera'}${EQ_SEL===e.cod?' sel':''}"
              onclick="abrirEquipo('${id}','${e.cod}')">
        <span class="ec-cod">${e.cod}</span>
        <span class="ec-nom">${e.nom}<em>${[e.marca,e.modelo].filter(x=>x&&x!=='S/M').join(' ')||'—'}</em></span>
        <span class="ec-area">${e.area}</span>
        <span class="eqpill ${est}">${tot?hechas+'/'+tot:'sin servicio'}</span>
        <span class="ec-ir" aria-hidden="true">›</span>
      </button>`;
    }).join('')+'</div>';
}

/* ---- Panel lateral con la ficha del equipo ---- */
function abrirEquipo(id,cod){
  const d=PR_DET[id]; if(!d)return;
  const e=d.equipos.find(x=>x.cod===cod); if(!e)return;
  EQ_SEL=cod; cerrarEquipo(true);
  const prev=e.intervenciones.filter(i=>i.tipo!=='MC').sort((a,b)=>a.n-b.n);
  const corr=e.intervenciones.filter(i=>i.tipo==='MC').sort((a,b)=>a.n-b.n);
  const hechas=e.intervenciones.filter(i=>i.hecho).length, tot=e.intervenciones.length;

  const ov=document.createElement('div');
  ov.className='eqov'; ov.id='eqOv';
  ov.innerHTML=`
    <aside class="eqpanel" role="dialog" aria-modal="true" aria-label="${e.nom}">
      <header class="ep-head">
        <div class="ep-ruta">${e.cod} &nbsp;·&nbsp; ${e.minsa||'—'} &nbsp;·&nbsp; ${e.area||'—'}</div>
        <h3>${e.nom}</h3>
        <div class="ep-chips">
          <span class="chip-est ${e.alcance?'on':''}">${e.alcance?'En alcance':'Fuera de alcance'}</span>
          <span class="chip-est">${tot?`${hechas} de ${tot} intervenciones`:'Sin servicio contratado'}</span>
          ${e.servicios?`<span class="chip-est">${e.servicios} servicio${e.servicios===1?'':'s'}/año</span>`:''}
        </div>
        <button class="ep-x" onclick="cerrarEquipo()" aria-label="Cerrar">✕</button>
      </header>
      <div class="ep-body">
        <div class="ep-foto">${e.foto?`<img src="${e.foto}" alt="${e.nom}" loading="lazy">`
          :'<span class="sinfoto">Sin fotografía del equipo</span>'}</div>
        <div class="ep-sub">Características</div>
        <div class="ep-datos">
          <span><i>Marca</i>${e.marca||'—'}</span>
          <span><i>Modelo</i>${e.modelo&&e.modelo!=='S/M'?e.modelo:'—'}</span>
          <span><i>Serie</i>${e.serie&&e.serie!=='S/S'?e.serie:'—'}</span>
          <span><i>Código MINSA</i>${e.minsa||'—'}</span>
          <span><i>Área</i>${e.area||'—'}</span>
          <span><i>Ítem cotización</i>${e.item||'—'}</span>
        </div>
        <div class="ep-sub">Historial de intervenciones</div>
        <div class="ep-hist">
          <div class="hgrupo">Preventivo${prev.length?` <em>${prev.filter(i=>i.hecho).length}/${prev.length}</em>`:''}</div>
          ${prev.length?prev.map(i=>hitoIntervencion(i)).join('')
            :'<p class="dnote">Sin preventivos programados en el contrato.</p>'}
          <div class="hgrupo">Correctivo${corr.length?` <em>${corr.length}</em>`:''}</div>
          ${corr.length?corr.map(i=>hitoIntervencion(i)).join('')
            :'<p class="dnote">Sin correctivos registrados.</p>'}
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
  return `
    <div class="hito ${cls}">
      <div class="h-line"><b>${i.tipo==='MC'?'Correctivo':'Preventivo'} ${i.n}</b>
        ${i.estado?`<span class="iest ${cls==='bad'?'bad':'good'}">${i.estado}</span>`:''}
        ${i.preliminar?'<span class="tag-prelim">preliminar</span>':''}
      </div>
      <div class="h-meta">${i.informe||''}</div>
      <div class="h-meta">${i.fecha?`Ejecutado el ${i.fecha}`
        :(i.programada?`Programado para el ${i.programada}`:'Sin fecha programada')}</div>
      ${i.falla?`<div class="h-meta">Falla reportada: ${i.falla}</div>`:''}
      ${i.trabajo?`<div class="h-meta">Trabajo realizado: ${i.trabajo}</div>`:''}
      <div class="h-btns">${botonesInforme(i)}</div>
    </div>`;
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

