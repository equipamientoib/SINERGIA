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
  const done=p.hitos.filter(x=>x.d).length;
  body.innerHTML=`
    <div class="crumb"><a onclick="go('#/clientes')">Nuestros clientes</a> &nbsp;/&nbsp; ${p.titulo}</div>
    <div class="dash-head" style="padding-top:18px">
      <div>
        <div class="k">${p.cliente}</div>
        <h1 style="font-size:clamp(24px,3.2vw,36px);font-weight:700;letter-spacing:-.8px;margin-top:8px">${p.titulo}</h1>
        <p style="color:var(--gris);font-size:14.5px;margin-top:8px;max-width:64ch">${p.desc}</p>
      </div>
      ${prBadge(p).replace('class="st','style="position:static" class="st')}
    </div>
    <div class="dash-grid">
      <div>
        <div class="dash-card">
          <div class="dh">Avance del proyecto</div>
          <div class="prog-row"><span class="pct" id="prPct">${p.avance}%</span><span class="lbl">${done} de ${p.hitos.length} hitos completados</span></div>
          <div class="prog"><i id="prBar"></i></div>
          <ul class="hitos">${p.hitos.map(hi=>`<li class="${hi.d?'done':''}">${hi.t}</li>`).join('')}</ul>
        </div>
      </div>
      <div>
        <div class="dash-foto">${prImg(p)}</div>
        <div class="spec"><div class="sh">Datos del servicio</div>
          <div class="row"><span class="l">Servicio</span><span class="v">${p.servicio}</span></div>
          <div class="row"><span class="l">Inicio</span><span class="v">${p.fecha}</span></div>
          <div class="row"><span class="l">Estado</span><span class="v">${p.estado}</span></div>
        </div>
        <div class="dnote" style="margin-top:16px">¿Consultas sobre el avance? <a onclick="go('#/contacto')" style="color:var(--cobre-d);font-weight:600;cursor:pointer">&nbsp;Contáctanos</a>.</div>
      </div>
    </div>
    <div id="prDet"></div>`;
  setTimeout(()=>{const b=document.getElementById('prBar');if(b)b.style.width=p.avance+'%';},80);
  cargarDetalle(id);
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

/* ---- DETALLE PRIVADO POR EQUIPO (se pide al servidor con la clave) ---- */
const PR_KEY={};              // hash de la clave por proyecto (solo en memoria)
const PR_DET={};              // detalle ya descargado, para no volver a pedirlo
let DET_AREA='', DET_Q='', DET_SOLO=true;

async function cargarDetalle(id){
  const cont=document.getElementById('prDet'); if(!cont)return;
  const p=PROYECTOS.find(x=>x.id===id);
  const url=(typeof CONFIG!=='undefined'&&CONFIG.DATA_URL)||'';
  if(!p||!p.detalle||url.indexOf('http')!==0){cont.innerHTML='';return;}
  if(PR_DET[id]){pintarDetalle(id);return;}
  cont.innerHTML='<div class="dash-card det-card"><div class="dh">Equipos del contrato</div><p class="dnote">Cargando el detalle…</p></div>';
  try{
    const q=url+(url.indexOf('?')>=0?'&':'?')+'proyecto='+encodeURIComponent(id)+'&clave='+encodeURIComponent(PR_KEY[id]||'');
    const r=await fetch(q,{cache:'no-store'});
    const d=await r.json();
    if(!d||!d.ok)throw new Error((d&&d.motivo)||'sin acceso');
    PR_DET[id]=d; DET_AREA=''; DET_Q=''; pintarDetalle(id);
  }catch(e){
    cont.innerHTML='<div class="dash-card det-card"><div class="dh">Equipos del contrato</div>'+
      '<p class="dnote">No se pudo cargar el detalle ('+e.message+'). Puedes reintentar más tarde o escribirnos.</p></div>';
  }
}

function detFiltrados(id){
  const d=PR_DET[id]; if(!d)return [];
  const q=DET_Q.toLowerCase();
  return d.equipos.filter(e=>{
    if(DET_SOLO&&!e.alcance)return false;
    if(DET_AREA&&e.area!==DET_AREA)return false;
    if(!q)return true;
    return (e.nom+' '+e.marca+' '+e.modelo+' '+e.serie+' '+e.cod).toLowerCase().includes(q);
  });
}

function pintarDetalle(id){
  const cont=document.getElementById('prDet'), d=PR_DET[id]; if(!cont||!d)return;
  const areas=[...new Set(d.equipos.map(e=>e.area))].filter(Boolean).sort();
  const t=d.totales;
  cont.innerHTML=`
    <div class="dash-card det-card">
      <div class="dh">Equipos del contrato</div>
      <div class="det-tot">
        <div><b>${t.en_alcance}</b><span>equipos en alcance</span></div>
        <div><b>${t.intervenciones}</b><span>intervenciones</span></div>
        <div><b>${t.ejecutadas}</b><span>ejecutadas</span></div>
        <div><b>${t.intervenciones-t.ejecutadas}</b><span>pendientes</span></div>
      </div>
      <div class="det-filtros">
        <select onchange="DET_AREA=this.value;pintarLista('${id}')">
          <option value="">Todas las áreas</option>
          ${areas.map(a=>`<option${a===DET_AREA?' selected':''}>${a}</option>`).join('')}
        </select>
        <input type="search" placeholder="Buscar equipo, marca o serie" value="${DET_Q}"
               oninput="DET_Q=this.value;pintarLista('${id}')">
        <label class="det-chk"><input type="checkbox"${DET_SOLO?' checked':''}
               onchange="DET_SOLO=this.checked;pintarLista('${id}')"> Solo en alcance</label>
      </div>
      <div id="detLista"></div>
    </div>`;
  pintarLista(id);
}

function pintarLista(id){
  const cont=document.getElementById('detLista'); if(!cont)return;
  const lista=detFiltrados(id);
  if(!lista.length){cont.innerHTML='<p class="dnote">No hay equipos que coincidan con el filtro.</p>';return;}
  cont.innerHTML='<div class="det-n">'+lista.length+' equipos</div>'+lista.map(e=>{
    const hechas=e.intervenciones.filter(i=>i.hecho).length, tot=e.intervenciones.length;
    const est=tot&&hechas>=tot?'ok':(hechas?'medio':'pend');
    return `
    <div class="eqrow${e.alcance?'':' fuera'}">
      <button class="eqhead" onclick="this.parentNode.classList.toggle('open')">
        <span class="eqcod">${e.cod}</span>
        <span class="eqnom">${e.nom}<em>${[e.marca,e.modelo].filter(x=>x&&x!=='S/M').join(' ')}</em></span>
        <span class="eqarea">${e.area}</span>
        <span class="eqpill ${est}">${tot?hechas+'/'+tot:'sin servicio'}</span>
      </button>
      <div class="eqbody">
        <div class="eqdatos">
          <span><i>Serie</i>${e.serie||'—'}</span>
          <span><i>Cód. MINSA</i>${e.minsa||'—'}</span>
          <span><i>Servicios/año</i>${e.servicios}</span>
          <span><i>Ítem</i>${e.item||'—'}</span>
        </div>
        ${tot?e.intervenciones.sort((a,b)=>a.n-b.n).map(i=>`
          <div class="intv${i.hecho?' hecho':''}">
            <div class="itxt">
              <b>${i.tipo==='MC'?'Correctivo':'Preventivo'} ${i.n}</b>
              <span>${i.informe||''}</span>
              ${i.fecha?`<span class="ifec">Ejecutado ${i.fecha}</span>`:(i.programada?`<span class="ifec">Programado ${i.programada}</span>`:'<span class="ifec">Sin programar</span>')}
              ${i.estado?`<span class="iest ${i.estado.toUpperCase().indexOf('INOPER')===0?'bad':'good'}">${i.estado}</span>`:''}
            </div>
            ${i.pdf?`<button class="ibtn" onclick="verInforme('${i.pdf}','${(i.informe||'Informe').replace(/'/g,'')}')">Ver informe</button>`:'<span class="ibtn off">Sin informe</span>'}
          </div>`).join(''):'<p class="dnote">Este equipo no tiene intervenciones programadas en el contrato.</p>'}
      </div>
    </div>`;
  }).join('');
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
  document.body.classList.remove('lock');
}
document.addEventListener('keydown',e=>{if(e.key==='Escape')cerrarInforme();});

pintarProyectos();

