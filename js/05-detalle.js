/* ---- DETALLE ---- */
function renderEquipo(id){
  const e=EQUIPOS.find(x=>x.id===id);
  const body=document.getElementById('equipoBody');
  if(!e){body.innerHTML='<div class="pagehead"><h1>Equipo no encontrado</h1></div>';return;}
  const items=galleryItems(e);
  const idx=EQUIPOS.indexOf(e);
  const specRows=Object.entries(e.specs).map(([k,v])=>`<div class="row"><span class="l">${k}</span><span class="v">${v}</span></div>`).join('');
  const isA=e.apoyo;
  const priceHTML=isA
    ?`<div class="pricebox"><span class="pp" style="font-size:19px">Complementaria</span><span class="pu">· incluida en paquetes de Mantenimiento</span></div>`
    :`<div class="pricebox"><span class="desde-d">Desde</span><span class="pp">S/ ${precioHora(e.dia)}</span><span class="pu">/ hora · IGV incluido</span><span class="tag">${e.tier}</span></div>`;
  const btnsHTML=isA
    ?`<div class="dbtns"><a class="btn btn-lg" onclick="go('#/contacto')">Consultar</a></div>`
    :`<div class="dbtns"><button class="btn btn-fill btn-lg" onclick="abrir(${idx})">Reservar por días</button><a class="btn btn-lg" onclick="go('#/contacto')">Consultar</a></div>`;
  const tarifasHTML=isA?'':`<div class="spec"><div class="sh">Tarifas de alquiler</div><div class="row"><span class="l">Día</span><span class="v">S/ ${fmt(e.dia)}</span></div><div class="row"><span class="l">Semana</span><span class="v">S/ ${fmt(e.sem)}</span></div><div class="row"><span class="l">Mes</span><span class="v">S/ ${fmt(e.mes)}</span></div></div>`;
  body.innerHTML=`
    <div class="crumb"><a onclick="go('#/catalogo')">Catálogo</a> &nbsp;/&nbsp; ${e.nom}</div>
    <div class="detail">
      <div class="gallery">
        <div class="main" id="galMain">${items[0]}<span class="gp"></span></div>
        <div class="thumbs" id="galThumbs">
          ${items.map((it,i)=>`<div class="thumb ${i===0?'on':''}" onclick="swapGal(${i})">${it}</div>`).join('')}
        </div>
      </div>
      <div class="dinfo">
        <div class="dcat">${e.cat}</div>
        <h1>${e.nom}</h1>
        <div class="dmarca">${e.marca}</div>
        ${priceHTML}
        ${isA?'':`<div class="pmodbig">Modalidades (IGV incluido): &nbsp;por equipo S/ ${precioEquipo(e.dia)} &nbsp;·&nbsp; por hora S/ ${precioHora(e.dia)} &nbsp;·&nbsp; por día S/ ${e.dia} &nbsp;·&nbsp; semana S/ ${fmt(e.dia*4)} &nbsp;·&nbsp; mes S/ ${fmt(e.dia*12)}</div><div class="modnote">Van de menor a mayor; el precio principal es por día. Elige la modalidad al reservar.</div>`}
        <div class="ddesc">${e.desc}</div>
        ${btnsHTML}
        ${e.ficha?`<a class="btn-ficha" href="${e.ficha}" target="_blank" rel="noopener">Ver ficha técnica (PDF)</a>`:`<div class="ficha-soon">Ficha técnica (PDF) · próximamente</div>`}
        <div class="dnote">${isA?'Complementaria. Se entrega dentro de los paquetes de Mantenimiento.':'Incluye personal técnico especializado y certificado de calibración vigente.'}</div>
        ${tarifasHTML}<div class="spec"><div class="sh">Ficha técnica</div>${specRows}</div>
      </div>
    </div>`;
  window._galItems=items;
}
function renderPaquete(id){
  const p=PAQUETES.find(x=>x.id===id);
  const body=document.getElementById('equipoBody');
  if(!p){body.innerHTML='<div class="pagehead"><h1>Paquete no encontrado</h1></div>';return;}
  const items=p.items.map(x=>byId(x));
  const rows=items.map(e=>`<div class="row" onclick="go('#/equipo/${e.id}')"><span>${e.nom}</span><span class="v">S/ ${e.dia}/día</span></div>`).join('');
  const kitRows=p.kit.map(k=>`<div class="row"><span>${APOYO[k]}</span><span class="v">incluido</span></div>`).join('');
  const kitBlock=p.kit.length?`<div class="pkinc"><div class="sh">Kit de intervención (+ S/ ${KIT_DIA}/día)</div>${kitRows}</div>`:'';
  body.innerHTML=`
    <div class="crumb"><a onclick="go('#/catalogo')">Catálogo</a> &nbsp;/&nbsp; Paquetes &nbsp;/&nbsp; ${p.nom}</div>
    <div class="detail">
      <div class="gallery">
        <div class="main" id="galMain">${device(items[0])}<span class="gp"></span></div>
        <div class="thumbs">${items.map((e,i)=>`<div class="thumb ${i===0?'on':''}" onclick="swapPk(${i})">${device(e)}</div>`).join('')}</div>
      </div>
      <div class="dinfo">
        <div class="dcat">Paquete · ${p.nivel}</div>
        <h1>${p.nom}</h1>
        <div class="dmarca">${items.length} instrumentos${p.kit.length?' + kit de intervención':''} · técnico incluido</div>
        <div class="pricebox"><span class="pp">S/ ${p.dia}</span><span class="pu">/ día · IGV incluido</span></div>
        <div class="pmodbig">Modalidades (IGV incluido): &nbsp;por equipo S/ ${p.pe} &nbsp;·&nbsp; por hora S/ ${p.ph} &nbsp;·&nbsp; por día S/ ${p.dia} &nbsp;·&nbsp; semana S/ ${fmt(p.psem)} &nbsp;·&nbsp; mes S/ ${fmt(p.pmes)}</div>
        <div class="modnote">Van de menor a mayor: a más tiempo, menor precio por equipo. En 1 h se atienden ~${p.eqh} equipos; en un día (7 h efectivas) hasta ~${p.eqd}. Elige la modalidad al reservar.</div>
        <div class="ddesc">${p.desc}</div>
        <div class="dbtns"><button class="btn btn-fill btn-lg" onclick="abrirPaq('${p.id}')">Reservar paquete</button><a class="btn btn-lg" onclick="go('#/contacto')">Consultar</a></div>
        <div class="dnote">Cada equipo del paquete llega con personal técnico y certificado de calibración vigente.</div>
        <div class="spec"><div class="sh">Tarifas del paquete</div><div class="row"><span class="l">Día</span><span class="v">S/ ${fmt(p.dia)}</span></div><div class="row"><span class="l">Semana</span><span class="v">S/ ${fmt(p.psem)}</span></div><div class="row"><span class="l">Mes</span><span class="v">S/ ${fmt(p.pmes)}</span></div></div><div class="pkinc"><div class="sh">Instrumentos (${items.length})</div>${rows}</div>${kitBlock}
      </div>
    </div>`;
  window._pkItems=items;
}
function swapPk(i){
  document.getElementById('galMain').innerHTML=device(window._pkItems[i])+'<span class="gp"></span>';
  document.querySelectorAll('#equipoBody .thumb').forEach((t,j)=>t.classList.toggle('on',j===i));
}
function swapGal(i){
  document.getElementById('galMain').innerHTML=window._galItems[i]+'<span class="gp"></span>';
  document.querySelectorAll('#galThumbs .thumb').forEach((t,j)=>t.classList.toggle('on',j===i));
}

