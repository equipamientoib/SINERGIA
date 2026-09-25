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
         ${fotos.map((u,i)=>`<img class="photo${i?'':' on'}" src="${fotoURL(u,600)}" alt="${e.nom}"
              loading="${i?'lazy':'eager'}" decoding="async" onerror="eqcarQuitar(this)">`).join('')}
         <span class="eqcar-p">${fotos.map((u,i)=>`<i class="${i?'':'on'}"></i>`).join('')}</span>
       </div>`
    : (fotos.length?`<img class="photo" src="${fotoURL(fotos[0],600)}" alt="${e.nom}" loading="lazy" decoding="async">`:device(e));
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
    const pkImg=pkFoto?`<div class="pkimg" onclick="go('#/paquete/${p.id}')" style="height:172px;margin:0 0 16px;overflow:hidden;border-radius:12px;border:1px solid var(--linea);cursor:pointer;background:var(--blanco)"><img src="${fotoURL(pkFoto,600)}" alt="${p.nom}" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover;display:block"></div>`:'';
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
function eqcarIr(c,n){
  const im=[...c.querySelectorAll('img')]; if(!im.length) return;
  n=(n+im.length)%im.length; c.dataset.i=n;
  im.forEach((x,k)=>x.classList.toggle('on',k===n));
  c.querySelectorAll('.eqcar-p i').forEach((x,k)=>x.classList.toggle('on',k===n));
}
setInterval(()=>{
  if(document.hidden) return;
  document.querySelectorAll('.eqcar').forEach(c=>{
    if(!c.offsetParent || c.querySelectorAll('img').length<2) return;
    const r=c.getBoundingClientRect();
    if(r.bottom<0 || r.top>innerHeight) return;        // fuera de pantalla, no gasta
    eqcarIr(c,(+c.dataset.i||0)+1);
  });
},5000);
