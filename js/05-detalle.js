/* ---- DETALLE ---- */
function renderEquipo(id){
  const e=EQUIPOS.find(x=>x.id===id);
  const body=document.getElementById('equipoBody');
  if(!e){body.innerHTML='<div class="pagehead"><h1>Equipo no encontrado</h1></div>';return;}
  const items=galleryItems(e);
  const minis=galleryItems(e,200);          // la miniatura mide 82 px: no hace falta más
  const idx=EQUIPOS.indexOf(e);
  /* Un equipo nuevo de la hoja puede venir sin ficha: no debe romper la página. */
  const specRows=Object.entries(e.specs||{}).map(([k,v])=>`<div class="row"><span class="l">${k}</span><span class="v">${v}</span></div>`).join('');
  const isA=esComplemento(e);
  const priceHTML=isA
    ?`<div class="pricebox"><span class="pp" style="font-size:19px">Sin costo</span><span class="pu">· se incluye en todo alquiler con instrumentista</span></div>`
    :(VER_PRECIOS
      ?`<div class="pricebox"><span class="desde-d">Desde</span><span class="pp">S/ ${fmt(precioDesde(e.dia))}</span><span class="pu">/ ${unidadDesde(e.dia)} · IGV incluido</span><span class="tag">${e.tier}</span></div>`
      :`<div class="pricebox"><span class="pp" style="font-size:21px">Consultar tarifa</span><span class="pu">· te respondemos con precio y disponibilidad</span><span class="tag">${e.tier}</span></div>`);
  const btnsHTML=isA
    ?`<div class="dbtns"><a class="btn btn-lg" onclick="go('#/contacto')">Consultar</a></div>`
    :(VER_PRECIOS
      ?`<div class="dbtns"><button class="btn btn-fill btn-lg" onclick="go('#/cotizar/'+'${e.id}')">Calcular mi alquiler</button><a class="btn btn-lg" onclick="go('#/contacto')">Consultar</a></div>`
      :`<div class="dbtns"><a class="btn btn-fill btn-lg" onclick="go('#/contacto')">Solicitar cotización</a></div>`);
  /* Bloque de calibración: fechas y certificado (hoja Equipos, columnas cal_*). */
  const calHTML=(e.cal_fin||e.cal_pdf)?`<div class="spec"><div class="sh">Certificado de calibración</div>`
    +(e.cal_ini?`<div class="row"><span class="l">Emitido</span><span class="v">${e.cal_ini}</span></div>`:'')
    +(e.cal_fin?`<div class="row"><span class="l">Vigente hasta</span><span class="v">${e.cal_fin}</span></div>`:'')
    +(e.cal_pdf?`<div class="row"><span class="l">Documento</span><span class="v"><a href="${e.cal_pdf}" target="_blank" rel="noopener">Ver certificado</a></span></div>`:'')
    +`</div>`:'';
  const tarifasHTML=(isA||!VER_PRECIOS)?'':`<div class="spec"><div class="sh">Tarifas de alquiler</div>${tieneMedio(e.dia)?`<div class="row"><span class="l">Medio día (4 h)</span><span class="v">S/ ${fmt(precioMedio(e.dia))}</span></div>`:''}<div class="row"><span class="l">Día</span><span class="v">S/ ${fmt(e.dia)}</span></div><div class="row"><span class="l">Semana</span><span class="v">S/ ${fmt(e.sem)}</span></div><div class="row"><span class="l">Mes</span><span class="v">S/ ${fmt(e.mes)}</span></div></div>`;
  body.innerHTML=`
    <div class="crumb"><a onclick="go('#/catalogo')">Catálogo</a> &nbsp;/&nbsp; ${e.nom}</div>
    <div class="detail">
      <div class="gallery">
        <div class="main" id="galMain">${carrusel(items)}<span class="gp"></span></div>
        <div class="thumbs" id="galThumbs">
          ${minis.map((it,i)=>`<div class="thumb ${i===0?'on':''}" onclick="swapGal(${i})">${it}</div>`).join('')}
        </div>
      </div>
      <div class="dinfo">
        <div class="dcat">${e.cat}</div>
        <h1>${e.nom}</h1>
        <div class="dmarca">${e.marca}</div>
        ${priceHTML}
        ${(isA||!VER_PRECIOS)?'':`<div class="pmodbig">Modalidades (IGV incluido): ${tieneMedio(e.dia)?`&nbsp;medio día S/ ${fmt(precioMedio(e.dia))} &nbsp;·&nbsp;`:''} día S/ ${fmt(e.dia)}</div><div class="modnote">${tieneMedio(e.dia)?`Medio día es un turno de 4 h (${HORARIO_MANANA} o ${HORARIO_TARDE}) y el día completo son los dos turnos.`:`Este instrumento se alquila desde un día completo (${HORARIO_MANANA} y ${HORARIO_TARDE}).`} ${soloEquipo(e.id) ? `Lo recoges en nuestra oficina: sin instrumentista, con DNI y S/ ${fmt(garantiaDe(e.id))} de garantía que se te devuelve.` : 'Va con nuestro instrumentista, que se cobra aparte.'}</div>`}
        <div class="ddesc">${e.desc}</div>
        ${btnsHTML}
        ${e.ficha?`<a class="btn-ficha" href="${e.ficha}" target="_blank" rel="noopener">Ver ficha técnica (PDF)</a>`:`<div class="ficha-soon">Ficha técnica (PDF) · próximamente</div>`}
        <div class="dnote">${isA?'Complementaria: no se alquila sola. Va sin costo con cualquier equipo que lleve instrumentista.':'Se entrega con su certificado de calibración vigente.'}</div>
        ${calHTML}${tarifasHTML}${specRows?`<div class="spec"><div class="sh">Ficha técnica</div>${specRows}</div>`:''}
      </div>
    </div>`;
  window._galItems=items;
  setTimeout(galSiguienteFoto, 400);   // tras dar tiempo a la portada
}
function swapPk(i){
  document.getElementById('galMain').innerHTML=window._pkGal[i]+'<span class="gp"></span>';
  document.querySelectorAll('#equipoBody .thumb').forEach((t,j)=>t.classList.toggle('on',j===i));
}
/* Las fotos se apilan y se funden entre sí, como en «Nuestros clientes».
   Antes se reemplazaba el HTML entero al cambiar: la foto nueva empezaba
   a descargarse en ese momento y se veía el hueco. Ahora ya están todas
   cargadas y el cambio es instantáneo. */
function carrusel(items){
  const una = items.length < 2;
  /* Solo la primera lleva src. Las demás esperan en data-src y se piden
     de una en una en cuanto la anterior llega. Si se piden las cinco de
     golpe, Drive las sirve a 0,9 s cada una y compiten entre sí: la
     portada, que es la única que el visitante está mirando, tarda lo
     mismo que la última. Así aparece enseguida y el resto entra sin
     que se note. */
  const fotos = items.map(function(it, i){
    if(it.indexOf('<img') !== 0) return `<span class="photo${i?'':' on'}">${it}</span>`;
    const etiquetado = it.replace('<img', `<img class="photo${i?'':' on'}"`);
    return i === 0 ? etiquetado : etiquetado.replace(' src=', ' data-src=');
  }).join('');
  const puntos = una ? '' :
    `<span class="galcar-p">${items.map((_,i)=>`<i class="${i?'':'on'}" onclick="swapGal(${i})"></i>`).join('')}</span>`;
  /* Los puntos dicen cuántas fotos hay; las flechas invitan a pasarlas.
     Con solo puntos, mucha gente no se da cuenta de que puede moverse. */
  const flechas = una ? '' :
    `<button class="galcar-f izq" onclick="galMover(-1)" aria-label="Foto anterior">&#10094;</button>
     <button class="galcar-f der" onclick="galMover(1)" aria-label="Foto siguiente">&#10095;</button>`;
  return `<div class="galcar${una?' una':''}" data-i="0">${fotos}${flechas}${puntos}</div>`;
}
function swapGal(i, auto){
  const c = document.querySelector('#galMain .galcar');
  if(!c) return;
  const n = c.querySelectorAll('.photo').length;
  if(i >= n) i = 0;
  c.dataset.i = i;
  c.querySelectorAll('.photo').forEach((f,j)=>f.classList.toggle('on', j===i));
  c.querySelectorAll('.galcar-p i').forEach((d,j)=>d.classList.toggle('on', j===i));
  document.querySelectorAll('#galThumbs .thumb').forEach((t,j)=>t.classList.toggle('on', j===i));
  /* Si lo tocó una persona, la rotación se detiene un rato: no hay nada
     más molesto que una foto que se va justo cuando la estabas mirando. */
  if(!auto) GAL_TOCADO = Date.now();
}
function galMover(paso){
  const c = document.querySelector('#galMain .galcar');
  if(!c) return;
  const n = c.querySelectorAll('.photo').length;
  swapGal(((+c.dataset.i || 0) + paso + n) % n);
}
let GAL_TOCADO = 0;

/* Encadena las descargas: cada foto pide la siguiente al terminar. */
function galSiguienteFoto(){
  const f = document.querySelector('#galMain .galcar img[data-src]');
  if(!f) return;
  f.addEventListener('load', galSiguienteFoto, {once:true});
  f.addEventListener('error', galSiguienteFoto, {once:true});
  f.src = f.dataset.src;
  f.removeAttribute('data-src');
}
setInterval(function(){
  const c = document.querySelector('#galMain .galcar:not(.una)');
  if(!c || Date.now() - GAL_TOCADO < 15000) return;
  const p = document.getElementById('page-equipo');
  if(!p || !p.classList.contains('active') || document.hidden) return;
  swapGal((+c.dataset.i || 0) + 1, true);
}, 5000);

