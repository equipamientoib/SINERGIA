/* ---- CATÁLOGO ---- */
const grid=document.getElementById('grid');
const GRUPOS={ansim:"Analizadores y simuladores",med:"Instrumentos de medición",elec:"Medidores eléctricos",apoyo:"Herramientas de apoyo"};
const eqBrand=e=>e.specs.Marca||'—', eqOrigen=e=>e.specs.Origen||'—', uniq=a=>[...new Set(a)];
const F={grupo:new Set(),marca:new Set(),tipo:new Set(),origen:new Set()};
const FP={app:new Set()};
let curNivel='all', curGrupo='all';

function facetSection(title,key,opts,labelFn){
  return `<details class="facet" open><summary>${title}</summary><div class="opts">`+
    opts.map(o=>`<label><input type="checkbox" value="${o}" onchange="toggleF('${key}',this.value,this.checked)"> ${labelFn?labelFn(o):o}</label>`).join('')+
    `</div></details>`;
}
function buildFacetsEq(){
  document.getElementById('filtersSide').innerHTML=
    facetSection('Marca','marca',uniq(EQUIPOS.map(eqBrand)).sort())+
    facetSection('Tipo','tipo',uniq(EQUIPOS.map(e=>e.cat)).sort())+
    facetSection('Procedencia','origen',uniq(EQUIPOS.map(eqOrigen)).sort())+
    `<div class="filters-clear"><button onclick="clearF()">Limpiar filtros</button></div>`;
}
function buildFacetsPk(){
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
    :`<div class="foot"><div class="price"><span class="desde">Desde</span>S/ ${precioHora(e.dia)}<span>/hora · IGV incl.</span><small>día S/ ${fmt(e.dia)} · sem S/ ${fmt(e.sem)} · mes S/ ${fmt(e.mes)}</small></div><button class="btn" onclick="abrir(${idx})">Reservar</button></div>`;
  return `<div class="eq">
      <div class="img${e.photo?' has-photo':''}" onclick="go('#/equipo/${e.id}')">
        ${e.photo?'':'<span class="grid-bg"></span>'}
        ${badge}<span class="tier">${e.tier}</span>
        ${e.photo?`<img class="photo" src="${e.photo}" alt="${e.nom}" loading="lazy" decoding="async">`:device(e)}
      </div>
      <div class="body">
        <div class="cat">${e.cat}</div>
        <h3 onclick="go('#/equipo/${e.id}')">${e.nom}</h3>
        <div class="marca">${e.marca}</div>
        <div class="desc">${e.desc}</div>
        ${foot}
      </div></div>`;
}
function pintar(){
  const list=EQUIPOS.filter(matchEq);
  grid.innerHTML=list.map(cardEq).join('')||'<p style="color:var(--gris);grid-column:1/-1">No hay equipos con esos filtros.</p>';
  document.getElementById('countEq').textContent=list.length+(list.length===1?' equipo':' equipos');
}

/* PAQUETES */
function pintarPaquetes(){
  const cont=document.getElementById('pkgs');
  const list=PAQUETES.filter(p=>(curNivel==='all'||p.nivel===curNivel)&&(!FP.app.size||FP.app.has(p.app)));
  cont.innerHTML=list.map(p=>{
    const items=p.items.map(id=>byId(id));
    const kitLine=p.kit.length?`<li style="opacity:.7">+ Kit de intervención: ${p.kit.map(k=>APOYO[k]).join(', ')}</li>`:'';
    const badge=p.nivel==='Calibración'?`<span class="ptag">CALIBRACIÓN</span>`:`<span class="ptag" style="background:var(--onix)">MANTENIMIENTO</span>`;
    return `<div class="pkg">
      ${badge}
      <h3 onclick="go('#/paquete/${p.id}')">${p.nom}</h3>
      <div class="pdesc">${p.desc}</div>
      <ul class="inc">${items.map(e=>`<li>${e.nom}</li>`).join('')}${kitLine}</ul>
      <div class="pfoot">
        <div class="pprice">S/ ${p.dia}<span>/día · IGV incluido</span></div>
        <div class="pmod">Otras modalidades: por equipo S/ ${p.pe} · por hora S/ ${p.ph} · semana S/ ${fmt(p.psem)} · mes S/ ${fmt(p.pmes)}</div>
      </div>
      <div class="pbtns"><button class="btn btn-fill" onclick="abrirPaq('${p.id}')">Reservar paquete</button><a class="btn" onclick="go('#/paquete/${p.id}')">Ver detalle</a></div>
    </div>`;
  }).join('')||'<p style="color:var(--gris);grid-column:1/-1">No hay paquetes con esos filtros.</p>';
  document.getElementById('countPk').textContent=list.length+(list.length===1?' paquete':' paquetes');
}
function setNivel(n){curNivel=n;document.querySelectorAll('#subPk button').forEach(b=>b.classList.toggle('on',b.dataset.niv===n));pintarPaquetes();}
function setGrupo(g){curGrupo=g;document.querySelectorAll('#subEq button').forEach(b=>b.classList.toggle('on',b.dataset.g===g));pintar();}

const DESTACADOS=["esa620","sp-sim","defib"];
function pintarDestacados(){
  const g=document.getElementById('eqHome');if(!g)return;
  g.innerHTML=DESTACADOS.map(id=>byId(id)).filter(Boolean).map(cardEq).join('');
}
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

