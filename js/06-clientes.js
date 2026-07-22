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
    </div>`;
  setTimeout(()=>{const b=document.getElementById('prBar');if(b)b.style.width=p.avance+'%';},80);
}
async function tryUnlock(id){
  const inp=document.getElementById('prKey'), err=document.getElementById('lockErr');
  const v=(inp&&inp.value||'').trim();
  if(!v){if(err)err.classList.add('show');return;}
  const h=await sha256(v);
  const p=PROYECTOS.find(x=>x.id===id);
  if(p&&h===p.clave_hash){PR_OPEN.add(id);renderProyecto(id);}
  else{if(err)err.classList.add('show');if(inp){inp.value='';inp.focus();}}
}
pintarProyectos();

