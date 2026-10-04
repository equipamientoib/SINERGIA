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
let curGrupo='all';

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
function huesoFacetas(){
  return `<div class="facet-hueso">
    <span class="ln w60"></span><span class="ln w85"></span><span class="ln w85"></span>
    <span class="ln w60"></span><span class="ln w85"></span><span class="ln w85"></span>
  </div>`;
}

/* Las herramientas de apoyo (set de 46 piezas, destornillador) no se alquilan
   solas: van dentro de los paquetes de Mantenimiento. Siguen en EQUIPOS para
   los paquetes, pero no salen como tarjeta ni en los filtros del catálogo. */
const enCatalogo = () => EQUIPOS.filter(e=>!esComplemento(e));

function buildFacetsEq(){
  if(!CATALOGO_LISTO){ document.getElementById('filtersSide').innerHTML=huesoFacetas(); return; }
  const eqs=enCatalogo();
  document.getElementById('filtersSide').innerHTML=
    facetSection('Marca','marca',uniq(eqs.map(eqBrand)).sort())+
    facetSection('Tipo','tipo',uniq(eqs.map(e=>e.cat)).sort())+
    facetSection('Procedencia','origen',uniq(eqs.map(eqOrigen)).sort())+
    `<div class="filters-clear"><button onclick="clearF()">Limpiar filtros</button></div>`;
}
function toggleF(k,v,on){on?F[k].add(v):F[k].delete(v);pintar();}
function clearF(){Object.values(F).forEach(s=>s.clear());document.querySelectorAll('#filtersSide input').forEach(i=>i.checked=false);pintar();}
function matchEq(e){
  if(curGrupo!=='all'&&e.g!==curGrupo)return false;
  if(F.marca.size&&!F.marca.has(eqBrand(e)))return false;
  if(F.tipo.size&&!F.tipo.has(e.cat))return false;
  if(F.origen.size&&!F.origen.has(eqOrigen(e)))return false;
  return true;
}
/* El clic en un equipo abre su página de alquiler (alquiler/<tipo>/), que
   es la que Google indexa. PAGINA_TIPO la escribe generar_paginas.py en
   index.html; un equipo que aún no tiene página va a su ficha #/equipo. */
function urlEquipo(id){ return (window.PAGINA_TIPO||{})[id] || '#/equipo/'+id; }
function irEquipo(id){
  const u = (window.PAGINA_TIPO||{})[id];
  if(u) location.href = u; else go('#/equipo/'+id);
}
function cardEq(e){
  const idx=EQUIPOS.indexOf(e);
  const badge=esComplemento(e)?`<span class="badge" style="background:rgba(154,127,78,.13);color:var(--cobre-d);border-color:var(--linea-b)">COMPLEMENTARIA</span>`:`<span class="badge">DISPONIBLE</span>`;
  const foot=esComplemento(e)
    ?`<div class="foot"><div class="price" style="font-size:14px;color:var(--gris);font-family:var(--ff-d);font-weight:600">Sin costo<small style="font-weight:400">va incluida con tu alquiler</small></div><button class="btn" onclick="go('#/equipo/${e.id}')">Ver detalle</button></div>`
    :(VER_PRECIOS
      ?`<div class="foot"><div class="price"><span class="desde">Desde</span>S/ ${fmt(precioDesde(e.dia))}<span>/${unidadDesde(e.dia)} · IGV incl.</span><small>${tieneMedio(e.dia)?`día S/ ${fmt(e.dia)}`:'desde un día completo'}</small></div><button class="btn" onclick="go('#/cotizar/'+'${e.id}')">Cotizar</button></div>`
      :`<div class="foot"><div class="price" style="font-size:15px;color:var(--gris);font-family:var(--ff-d);font-weight:600">Consultar tarifa<small style="font-weight:400">te respondemos con precio y disponibilidad</small></div><button class="btn" onclick="go('#/contacto')">Cotizar</button></div>`);
  /* Varias fotos: se ve la primera y las flechas pasan a las demás. La primera suele ser la de
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
      <div class="img${fotos.length?' has-photo':''}" onclick="irEquipo('${e.id}')">
        ${fotos.length?'':'<span class="grid-bg"></span>'}
        ${badge}<span class="tier">${e.tier}</span>
        ${carr}
      </div>
      <div class="body">
        <div class="cat">${e.cat}</div>
        <h3><a href="${urlEquipo(e.id)}">${e.nom}</a></h3>
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
  const list=enCatalogo().filter(matchEq);
  grid.innerHTML=list.map(cardEq).join('')||'<p style="color:var(--gris);grid-column:1/-1">No hay equipos con esos filtros.</p>';
  document.getElementById('countEq').textContent=list.length+(list.length===1?' equipo':' equipos');
}

function setGrupo(g){curGrupo=g;document.querySelectorAll('#subEq button').forEach(b=>b.classList.toggle('on',b.dataset.g===g));pintar();}

const DESTACADOS=["esa620","sp-sim","defib"];
function pintarDestacados(){
  const g=document.getElementById('eqHome');if(!g)return;
  if(!CATALOGO_LISTO){ g.innerHTML=huesoEq(3); return; }
  g.innerHTML=DESTACADOS.map(id=>byId(id)).filter(Boolean).map(cardEq).join('');
}
/* Primer pintado: solo marcadores. Los datos reales los pinta
   aplicarDatos() en js/07-router.js cuando llega la primera fuente buena. */
buildFacetsEq();pintar();pintarDestacados();
function toggleFiltros(){document.getElementById('filtersSide').classList.toggle('open');}



/* ── Carrusel de las tarjetas del catálogo ────────────────────────────
   Las tarjetas NO pasan las fotos solas: con varias tarjetas cambiando a
   la vez la rejilla no paraba quieta. Queda la primera foto fija y las
   flechas para quien quiera ver más; el pase automático vive solo en la
   ficha del equipo (05-detalle.js).
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
   una foto te sacaría de la página. */
function eqcarMover(ev, paso){
  ev.stopPropagation(); ev.preventDefault();
  const c = ev.currentTarget.closest('.eqcar'); if(!c) return;
  eqcarIr(c, (+c.dataset.i || 0) + paso);
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
