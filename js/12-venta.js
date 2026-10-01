/* =====================================================================
   12-venta.js — Sección de VENTA de equipamiento biomédico
   Rutas:  #/venta              portada de venta (categorías y destacados)
           #/venta/cat/<id>     equipos de una categoría
           #/venta/p/<id>       ficha de un producto (mismo formato que el
                                alquiler: galería + datos + pestañas)
   Los datos viven en data/venta.json; se cargan la primera vez que se
   entra a Venta, no antes (la portada y el alquiler no los necesitan).
   ===================================================================== */
/* var y no let: 07-router.js corre antes en el paquete y puede llamar a renderVenta al cargar. */
var VENTA = null, VENTA_CARGA = null;

function cargarVenta(){
  if(!VENTA_CARGA){
    VENTA_CARGA = fetch('data/venta.json', {cache:'no-cache'})
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .catch(() => ({categorias:[], productos:[]}))
      .then(d => { VENTA = {categorias: d.categorias||[], productos: (d.productos||[]).filter(p => p && p.id && p.nom)}; return VENTA; });
  }
  return VENTA_CARGA;
}

const vEsc = s => String(s==null?'':s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const vCat = id => (VENTA.categorias||[]).find(c => c.id === id);
const vDeCat = id => VENTA.productos.filter(p => p.cat === id);

/* Íconos de línea por categoría (24×24, mismo trazo que los de Servicios). */
const V_ICO = {
  monitoreo:      '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M6 11h3l2-3 2 6 2-3h3M9 21h6M12 17v4"/>',
  emergencia:     '<path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10z"/><path d="m12 9-1.5 3h3L12 15"/>',
  diagnostico:    '<path d="M3 12h4l2-7 4 14 2-7h6"/>',
  quirofano:      '<circle cx="12" cy="8" r="5"/><path d="M12 13v8M8 21h8"/>',
  esterilizacion: '<rect x="4" y="6" width="16" height="14" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M8 3v3M16 3v3"/>',
  laboratorio:    '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3"/><path d="M7.5 15h9"/>',
  mobiliario:     '<path d="M3 18V8M3 14h18v4M21 18v-4M7 14v-3h10a4 4 0 0 1 4 4"/><circle cx="6" cy="11" r="1.6"/>',
  metrologia:     '<path d="M4 18h16M6 18V8M10 18v-6M14 18V6M18 18v-8"/>'
};
function vIco(id, cls){
  return `<svg class="${cls||'v-ico'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${V_ICO[id]||V_ICO.diagnostico}</svg>`;
}

function vWA(texto){
  const n = String(SITE.whatsapp||'').replace(/\D/g,'');
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`;
}
function vMail(asunto){
  return `mailto:${SITE.email}?subject=${encodeURIComponent(asunto)}`;
}

/* Foto del producto: la versión ligera (-m) en tarjetas y la grande en la ficha. */
function vFoto(p, i, ligera){ const u=(p.fotos||[])[i||0]; return u ? fotoURL(u, ligera?700:1200, ligera) : ''; }

function vCard(p){
  const c = vCat(p.cat);
  const foto = vFoto(p, 0, true);
  return `<article class="v-card" onclick="go('#/venta/p/${p.id}')">
    <div class="v-card-img${foto?'':' sin'}">${foto?`<img src="${foto}" alt="${vEsc(p.nom)}" loading="lazy" decoding="async">`:vIco(p.cat,'v-ico-xl')}</div>
    <div class="v-card-txt">
      <div class="v-k">${vEsc(c?c.nombre:'')}</div>
      <h3>${vEsc(p.nom)}</h3>
      <div class="v-marca">${vEsc([p.marca,p.modelo].filter(Boolean).join(' · '))}</div>
      ${p.resumen?`<p>${vEsc(p.resumen)}</p>`:''}
      <div class="v-card-pie"><span>Ver ficha →</span><a class="btn" href="${vWA('Hola Sinergia Biomédica, quiero cotizar: '+p.nom+(p.modelo?' ('+p.modelo+')':''))}" target="_blank" rel="noopener" onclick="event.stopPropagation()">Cotizar</a></div>
    </div>
  </article>`;
}

function vHueso(){
  return `<div class="wrap pagehead"><span class="ln w35"></span></div><section><div class="wrap v-cats">${
    Array.from({length:8},()=>'<div class="v-cat v-hueso"></div>').join('')}</div></section>`;
}

/* ── Portada de venta ─────────────────────────────────────────────── */
function vPortada(){
  const dest = VENTA.productos.filter(p => p.destacado).concat(VENTA.productos.filter(p => !p.destacado)).slice(0,6);
  return `
  <section class="v-hero"><div class="wrap v-hero-grid">
    <div>
      <div class="k">Venta de equipamiento biomédico</div>
      <h1>Equipamiento médico para tu institución, <em>con respaldo técnico</em>.</h1>
      <p class="lead">Cotizamos equipos para hospitales, clínicas y obras de equipamiento. Te entregamos especificaciones claras y te acompañamos después de la venta con mantenimiento y metrología.</p>
      <div class="hero-cta">
        <a class="btn btn-fill btn-lg" onclick="go('#/contacto')">Solicitar cotización</a>
        <a class="btn btn-lg" href="${vWA('Hola Sinergia Biomédica, quiero cotizar equipamiento biomédico.')}" target="_blank" rel="noopener">Escribir por WhatsApp</a>
      </div>
    </div>
    <ul class="v-garantias">
      <li><b>Especificaciones claras</b><span>Cada cotización con ficha técnica, marca, modelo y plazo de entrega.</span></li>
      <li><b>Entrega coordinada</b><span>En Lima y provincias, con la documentación que pide tu institución.</span></li>
      <li><b>Respaldo después de la venta</b><span>Mantenimiento preventivo y verificación con instrumentos calibrados.</span></li>
    </ul>
  </div></section>

  <section class="v-sec"><div class="wrap">
    <div class="shead"><div><div class="k">Catálogo de venta</div><h2>Explora por categoría</h2></div>
      <p>Elige el área que necesitas equipar. Si no ves el equipo, te lo cotizamos a pedido.</p></div>
    <div class="v-cats">${VENTA.categorias.map(c => {
      const n = vDeCat(c.id).length;
      return `<a class="v-cat" onclick="go('#/venta/cat/${c.id}')">
        <span class="v-cat-ico">${vIco(c.id)}</span>
        <b>${vEsc(c.nombre)}</b>
        <small>${vEsc(c.ejemplos)}</small>
        <span class="v-cat-n">${n ? n+(n===1?' equipo':' equipos') : 'Cotización a pedido'} →</span>
      </a>`;}).join('')}</div>
  </div></section>

  ${dest.length ? `<section class="v-sec"><div class="wrap">
    <div class="shead"><div><div class="k">Destacados</div><h2>Equipos disponibles</h2></div></div>
    <div class="v-grid">${dest.map(vCard).join('')}</div>
  </div></section>` : ''}

  <section class="v-sec"><div class="wrap v-dos">
    <div class="v-panel oscuro">
      <div class="k">Obras y proyectos</div>
      <h3>¿Equipas una obra? Hacemos el expediente técnico.</h3>
      <p>Metrado por ambiente, especificaciones técnicas, memoria de cálculo, presupuesto y planos del componente de equipamiento.</p>
      <a class="btn btn-fill" onclick="go('#/clientes')">Ver proyectos realizados →</a>
    </div>
    <div class="v-panel">
      <div class="k">A pedido</div>
      <h3>¿No encuentras el equipo que buscas?</h3>
      <p>Cuéntanos qué necesitas —marca, modelo o solo el uso— y te enviamos opciones con su ficha técnica.</p>
      <a class="btn" onclick="go('#/contacto')">Pedir una cotización →</a>
    </div>
  </div></section>

  <section class="v-sec"><div class="wrap">
    <div class="shead"><div><div class="k">Cómo trabajamos</div><h2>De tu requerimiento a la entrega</h2></div>
      <p>Una sola empresa como contacto, de la cotización al mantenimiento.</p></div>
    <div class="steps">
      <div class="step"><div class="num">1</div><h3>Nos envías tu requerimiento</h3><p>La lista de equipos, el área a equipar o el expediente técnico de tu obra.</p></div>
      <div class="step"><div class="num">2</div><h3>Te cotizamos</h3><p>Con ficha técnica, marca, modelo, plazo de entrega y condiciones claras.</p></div>
      <div class="step"><div class="num">3</div><h3>Entregamos y damos respaldo</h3><p>Coordinamos la entrega y te acompañamos con mantenimiento y verificación.</p></div>
    </div>
  </div></section>`;
}

/* ── Categoría ────────────────────────────────────────────────────── */
function vCategoria(id){
  const c = vCat(id);
  if(!c) return vPortada();
  const lista = vDeCat(id);
  const lado = VENTA.categorias.map(x => {
    const n = vDeCat(x.id).length;
    return `<a class="${x.id===id?'on':''}" onclick="go('#/venta/cat/${x.id}')">${vEsc(x.nombre)}<span>${n||''}</span></a>`;
  }).join('');
  const vacio = `<div class="v-vacio">
      <span class="v-cat-ico">${vIco(id)}</span>
      <h3>${vEsc(c.nombre)}: te cotizamos a pedido</h3>
      <p>Todavía no publicamos equipos de esta categoría en la web, pero sí los conseguimos: ${vEsc(c.ejemplos.charAt(0).toLowerCase()+c.ejemplos.slice(1))}. Cuéntanos qué necesitas y te enviamos opciones con su ficha técnica.</p>
      <div class="hero-cta">
        <a class="btn btn-fill" href="${vWA('Hola Sinergia Biomédica, quiero cotizar equipos de '+c.nombre+'.')}" target="_blank" rel="noopener">Cotizar por WhatsApp</a>
        <a class="btn" onclick="go('#/contacto')">Usar el formulario</a>
      </div>
    </div>`;
  return `
  <div class="wrap pagehead">
    <div class="crumb"><a onclick="go('#/venta')">Venta</a> &nbsp;/&nbsp; ${vEsc(c.nombre)}</div>
    <h1>${vEsc(c.nombre)}</h1>
    <p>${vEsc(c.ejemplos)}.</p>
  </div>
  <section style="padding-top:30px"><div class="wrap v-lista">
    <nav class="v-lado" aria-label="Categorías de venta"><div class="v-lado-t">Categorías</div>${lado}</nav>
    <div>${lista.length ? `<div class="v-cuenta">${lista.length} ${lista.length===1?'equipo':'equipos'}</div><div class="v-grid">${lista.map(vCard).join('')}</div>` : vacio}</div>
  </div></section>`;
}

/* ── Ficha de producto (formato B) ────────────────────────────────── */
function vProducto(id){
  const p = VENTA.productos.find(x => x.id === id);
  if(!p) return vPortada();
  const c = vCat(p.cat);
  const fotos = (p.fotos||[]).map((u,i) => vFoto(p, i, false));
  const minis = (p.fotos||[]).map((u,i) => vFoto(p, i, true));
  const specs = (p.specs||[]).map(s => Array.isArray(s)
    ? (s.length===1 ? `<tr class="g"><th colspan="2">${vEsc(s[0])}</th></tr>` : `<tr><td>${vEsc(s[0])}</td><td>${vEsc(s[1])}</td></tr>`) : '').join('');
  const pest = [];
  if(p.descripcion||p.resumen) pest.push(['Descripción', `<p>${vEsc(p.descripcion||p.resumen)}</p>${(p.usos||[]).length?`<ul class="v-puntos">${p.usos.map(u=>`<li>${vEsc(u)}</li>`).join('')}</ul>`:''}`]);
  if(specs) pest.push(['Especificaciones', `<table class="v-tabla">${specs}</table>`]);
  if((p.incluye||[]).length) pest.push(['Incluye', `<ul class="v-puntos">${p.incluye.map(u=>`<li>${vEsc(u)}</li>`).join('')}</ul>`]);
  const otros = vDeCat(p.cat).filter(x => x.id !== p.id).slice(0,3);
  const chips = [['Marca',p.marca],['Modelo',p.modelo],['Origen',p.origen],['Garantía',p.garantia]].filter(x=>x[1]);
  const texto = 'Hola Sinergia Biomédica, quiero cotizar: '+p.nom+(p.marca?' '+p.marca:'')+(p.modelo?' '+p.modelo:'');
  return `
  <div class="wrap" style="padding-top:34px">
    <div class="crumb"><a onclick="go('#/venta')">Venta</a> &nbsp;/&nbsp; ${c?`<a onclick="go('#/venta/cat/${c.id}')">${vEsc(c.nombre)}</a> &nbsp;/&nbsp; `:''}${vEsc(p.nom)}</div>
    <div class="v-prod">
      <div class="v-gal${fotos.length<2?' una':''}">
        ${fotos.length>1?`<div class="v-minis">${minis.map((m,i)=>`<button type="button" class="${i?'':'on'}" onclick="vVerFoto(${i})"><img src="${m}" alt="" loading="lazy"></button>`).join('')}</div>`:''}
        <div class="v-main${fotos.length?'':' sin'}">${fotos.length?`<img id="vFotoMain" src="${fotos[0]}" alt="${vEsc(p.nom)}" data-fotos='${vEsc(JSON.stringify(fotos))}'>`:vIco(p.cat,'v-ico-xl')}</div>
      </div>
      <div class="v-info">
        <div class="v-k">${vEsc(c?c.nombre:'')}</div>
        <h1>${vEsc(p.nom)}</h1>
        <div class="v-marca">${vEsc([p.marca,p.modelo,p.origen].filter(Boolean).join(' · '))}</div>
        ${p.resumen?`<p class="v-resumen">${vEsc(p.resumen)}</p>`:''}
        ${chips.length?`<div class="v-chips">${chips.map(x=>`<span>${x[0]} <b>${vEsc(x[1])}</b></span>`).join('')}</div>`:''}
        <div class="v-btns">
          <a class="btn btn-fill btn-lg" href="${vWA(texto)}" target="_blank" rel="noopener">Cotizar por WhatsApp</a>
          <a class="btn btn-lg" href="${vMail('Cotización: '+p.nom)}">Cotizar por correo</a>
        </div>
        ${p.ficha_pdf?`<a class="v-doc" href="${vEsc(p.ficha_pdf)}" target="_blank" rel="noopener"><span class="doc-ico">PDF</span><span><b>Ficha técnica</b><small>Ver o descargar</small></span></a>`:''}
      </div>
    </div>
    ${pest.length?`<div class="v-pest">
      <div class="v-tabs" role="tablist">${pest.map((t,i)=>`<button type="button" role="tab" class="${i?'':'on'}" onclick="vTab(this,${i})">${t[0]}</button>`).join('')}</div>
      ${pest.map((t,i)=>`<div class="v-panel-t" ${i?'hidden':''}>${t[1]}</div>`).join('')}
    </div>`:''}
    ${otros.length?`<section class="v-sec" style="padding-bottom:0"><div class="shead"><div><div class="k">Misma categoría</div><h2>También te puede interesar</h2></div></div><div class="v-grid">${otros.map(vCard).join('')}</div></section>`:''}
  </div>
  <section class="v-sec"></section>`;
}

function vVerFoto(i){
  const img = document.getElementById('vFotoMain'); if(!img) return;
  const f = JSON.parse(img.dataset.fotos||'[]'); if(f[i]) img.src = f[i];
  document.querySelectorAll('.v-minis button').forEach((b,j) => b.classList.toggle('on', j===i));
}
function vTab(btn, i){
  const caja = btn.closest('.v-pest');
  caja.querySelectorAll('.v-tabs button').forEach((b,j) => b.classList.toggle('on', j===i));
  caja.querySelectorAll('.v-panel-t').forEach((p,j) => p.hidden = (j!==i));
}

/* parte = ['cat','<id>'] | ['p','<id>'] | [] */
function renderVenta(parte){
  const el = document.getElementById('ventaBody'); if(!el) return;
  if(!VENTA){
    el.innerHTML = vHueso();
    cargarVenta().then(() => { if(location.hash.startsWith('#/venta')) renderVenta(parte); });
    return;
  }
  el.innerHTML = parte[0]==='cat' ? vCategoria(parte[1]) : parte[0]==='p' ? vProducto(parte[1]) : vPortada();
}
