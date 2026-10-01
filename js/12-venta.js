/* =====================================================================
   12-venta.js — Sección de VENTA de equipamiento biomédico
   Rutas:  #/venta              portada de venta (categorías y destacados)
           #/venta/cat/<id>     equipos de una categoría
           #/venta/p/<id>       ficha de un producto (mismo formato que el
                                alquiler: galería + datos + pestañas)
   Los datos viven en data/venta.json; se cargan la primera vez que se
   entra a Venta, no antes (la portada y el alquiler no los necesitan).
   EN VIVO: el Apps Script lee la hoja «Sinergia - Venta (catálogo en
   vivo)» y manda los productos con publicar = SI (precio publicado,
   stock y fecha de actualización incluidos). Cuando llegan, reemplazan
   a los de venta.json, que queda como respaldo si Google no responde.
   ===================================================================== */
/* var y no let: 07-router.js corre antes en el paquete y puede llamar a renderVenta al cargar. */
var VENTA = null, VENTA_CARGA = null, VENTA_VIVO = null, VENTA_FIRMA = '';

/* Llamada desde aplicarDatos (07-router.js) con d.venta del Apps Script.
   Puede llegar antes de que este archivo termine de cargar (caché de la
   sesión), por eso solo guarda y el repintado va diferido.            */
function ventaEnVivo(v){
  if(!v || !Array.isArray(v.productos)) return;
  const ok = v.productos.filter(p => p && p.id && p.nom);
  if(!ok.length) return;              // hoja vacía o mal leída: se queda lo publicado
  const firma = JSON.stringify([ok, v.actualizado]);
  if(firma === VENTA_FIRMA) return;   // nada cambió: no se repinta (ni se borra la búsqueda)
  VENTA_FIRMA = firma;
  VENTA_VIVO = {productos: ok, actualizado: v.actualizado || ''};
  if(VENTA){
    vMezclar();
    setTimeout(() => { if(location.hash.startsWith('#/venta')) renderVenta(location.hash.split('/').slice(2)); }, 0);
  }
}
function vMezclar(){
  if(VENTA && VENTA_VIVO){ VENTA.productos = VENTA_VIVO.productos; VENTA.actualizado = VENTA_VIVO.actualizado; }
}

function cargarVenta(){
  if(!VENTA_CARGA){
    VENTA_CARGA = fetch('data/venta.json', {cache:'no-cache'})
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .catch(() => ({categorias:[], productos:[]}))
      .then(d => { VENTA = {categorias: d.categorias||[], productos: (d.productos||[]).filter(p => p && p.id && p.nom)}; vMezclar(); return VENTA; });
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
  reanimacion:    '<path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10z"/><path d="m12 9-1.5 3h3L12 15"/>',
  neonatal:       '<circle cx="12" cy="6" r="3"/><path d="M5 21v-3a7 7 0 0 1 14 0v3M9 14h6"/>',
  uci:            '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h8M8 12h5M12 16v3"/><circle cx="15.5" cy="16" r="1.2"/>',
  imagenes:       '<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M7 14a5 5 0 0 1 10 0M12 9v2M9 21h6"/>',
  diagnostico:    '<path d="M3 12h4l2-7 4 14 2-7h6"/>',
  quirofano:      '<circle cx="12" cy="8" r="5"/><path d="M12 13v8M8 21h8"/>',
  esterilizacion: '<rect x="4" y="6" width="16" height="14" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M8 3v3M16 3v3"/>',
  laboratorio:    '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3"/><path d="M7.5 15h9"/>',
  mobiliario:     '<path d="M3 18V8M3 14h18v4M21 18v-4M7 14v-3h10a4 4 0 0 1 4 4"/><circle cx="6" cy="11" r="1.6"/>',
  'cadena-frio':  '<rect x="6" y="3" width="12" height="18" rx="2"/><path d="M6 10h12M9 6v2M9 13v3M15 14l-2 2 2 2"/>',
  metrologia:     '<path d="M4 18h16M6 18V8M10 18v-6M14 18V6M18 18v-8"/>'
};
function vIco(id, cls){
  return `<svg class="${cls||'v-ico'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${V_ICO[id]||V_ICO.diagnostico}</svg>`;
}

/* Búsqueda: sin tildes ni mayúsculas, sobre nombre, marca, modelo, nombre y
   código del expediente, categoría y áreas. Así el logístico encuentra el
   equipo pegando el nombre tal cual viene en su listado (o el código D-18). */
const vNorm = s => String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
function vBuscar(q){
  const t = vNorm(q).split(/\s+/).filter(w => w.length > 1);
  if(!t.length) return [];
  return VENTA.productos.filter(p => {
    const c = vCat(p.cat);
    const txt = vNorm([p.nom,p.marca,p.modelo,p.expediente,p.clave,c&&c.nombre,(p.areas||[]).join(' '),(p.caracteristicas||[]).join(' ')].join(' '));
    return t.every(w => txt.includes(w));
  });
}
function vBuscarEn(q, destino){
  const caja = document.getElementById(destino); if(!caja) return;
  const r = vBuscar(q);
  const otros = document.querySelectorAll('[data-sin-busqueda]');
  otros.forEach(e => e.hidden = !!q.trim());
  caja.innerHTML = !q.trim() ? '' : (r.length
    ? `<div class="v-cuenta">${r.length} ${r.length===1?'resultado':'resultados'} para «${vEsc(q)}»</div><div class="v-grid">${r.map(vCard).join('')}</div>`
    : `<div class="v-vacio"><h3>No encontramos «${vEsc(q)}» en el catálogo publicado</h3><p>Igual podemos conseguirlo. Escríbenos con el nombre o el código de tu listado y te enviamos opciones con su ficha técnica.</p><div class="hero-cta"><a class="btn btn-fill" href="${vWA('Hola Sinergia Biomédica, quiero cotizar: '+q)}" target="_blank" rel="noopener">Cotizar por WhatsApp</a></div></div>`);
}
function vBuscador(destino, ph){
  return `<label class="v-busca"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
    <input type="search" placeholder="${ph||'Busca por equipo, marca, modelo o nombre del expediente (ej. D-18)'}" oninput="vBuscarEn(this.value,'${destino}')" aria-label="Buscar equipos"></label>`;
}

/* Cotizar una lista completa: el texto pegado va tal cual en el mensaje. */
/* «Cotiza tu lista completa»: en la portada de Venta y al pie de la tienda. */
function vListaCaja(){
  return `    <div class="v-panel" id="cotiza-lista">
      <div class="k">Para logística y compras</div>
      <h3>Cotiza tu lista completa</h3>
      <p>Pega tu listado tal como lo tienes (nombre, código y cantidad) y te respondemos con una sola cotización.</p>
      <textarea id="vLista" rows="4" placeholder="Ej.: D-18 MONITOR DE FUNCIONES VITALES DE 5 PARAMETROS · 4 und&#10;D-88 ASPIRADOR DE SECRECIONES RODABLE · 6 und"></textarea>
      <div class="v-lista-btns"><button type="button" class="btn btn-fill" onclick="vListaEnviar('wa')">Enviar por WhatsApp</button><button type="button" class="btn" onclick="vListaEnviar('mail')">Enviar por correo</button></div>
    </div>`;
}

function vListaEnviar(via){
  const t = (document.getElementById('vLista')||{}).value||'';
  if(!t.trim()){ document.getElementById('vLista').focus(); return; }
  const msg = 'Hola Sinergia Biomédica, quiero cotizar esta lista de equipos:\n\n'+t.trim();
  if(via==='wa') window.open(vWA(msg),'_blank','noopener');
  else location.href = `mailto:${SITE.email}?subject=${encodeURIComponent('Cotización de lista de equipos')}&body=${encodeURIComponent(msg)}`;
}

function vWA(texto){
  const n = String(SITE.whatsapp||'').replace(/\D/g,'');
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`;
}
function vMail(asunto){
  return `mailto:${SITE.email}?subject=${encodeURIComponent(asunto)}`;
}

/* Precio publicado (proveedor + margen, calculado en la hoja) y stock. */
const vSoles = n => 'S/ ' + Number(n).toLocaleString('es-PE', {maximumFractionDigits: 0});
function vStock(p){
  if(p.stock === undefined || p.stock === null || p.stock === '') return '';
  const n = Number(p.stock);
  return n > 0 ? `<span class="v-stock si">En stock${n<=5?' · '+n+' und.':''}</span>` : '<span class="v-stock">A pedido</span>';
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
      <div class="v-marca"><b>${vEsc(p.marca||'')}</b>${p.modelo?' · '+vEsc(p.modelo):''}</div>
      ${p.expediente?`<div class="v-exp" title="Nombre en expedientes técnicos">${vEsc(p.expediente)}${p.clave?' · '+vEsc(p.clave):''}</div>`:''}
      ${p.resumen?`<p>${vEsc(p.resumen)}</p>`:''}
      ${vStock(p)}
      <div class="v-card-pie">${p.precio?`<span class="v-precio" title="Precio referencial">${vSoles(p.precio)}</span>`:'<span>Ver ficha →</span>'}<a class="btn" href="${vWA('Hola Sinergia Biomédica, quiero cotizar: '+p.nom+(p.modelo?' ('+p.modelo+')':''))}" target="_blank" rel="noopener" onclick="event.stopPropagation()">Cotizar</a></div>
    </div>
  </article>`;
}

function vHueso(){
  return `<div class="wrap pagehead"><span class="ln w35"></span></div><section><div class="wrap v-cats">${
    Array.from({length:8},()=>'<div class="v-cat v-hueso"></div>').join('')}</div></section>`;
}

/* ── Portada de venta ─────────────────────────────────────────────── */
function vPortada(){
  /* destacado = puesto (1, 2, 3…) según las compras públicas 2024-2025 (OECE). */
  const dest = VENTA.productos.filter(p => p.destacado).sort((a,b) => Number(a.destacado)-Number(b.destacado)).slice(0,8);
  const n = VENTA.productos.length;
  return `
  <section class="v-hero"><div class="wrap v-hero-grid">
    <div>
      <div class="k">Venta de equipamiento biomédico</div>
      <h1>Equipamiento médico para tu institución, <em>con respaldo técnico</em>.</h1>
      <p class="lead">${n} equipos de marcas como Edan, Tuttnauer, KLS Martin, CU Medical y Siare para hospitales, clínicas y obras de equipamiento. Con ficha técnica, entrega coordinada y respaldo de mantenimiento.</p>
      ${vBuscador('vResPortada')}
      <div class="v-marcas-hero">Edan · Tuttnauer · KLS Martin · CU Medical · Siare · Medifa · Memmert · Boeco · Heine · Riester</div>
    </div>
    <ul class="v-garantias">
      <li><b>Especificaciones claras</b><span>Cada cotización con ficha técnica, marca, modelo y plazo de entrega.</span></li>
      <li><b>Entrega coordinada</b><span>En Lima y provincias, con la documentación que pide tu institución.</span></li>
      <li><b>Respaldo después de la venta</b><span>Mantenimiento preventivo y verificación con instrumentos calibrados.</span></li>
    </ul>
  </div></section>

  <section class="v-sec" style="padding-top:8px"><div class="wrap"><div id="vResPortada"></div></div></section>

  <section class="v-sec" data-sin-busqueda><div class="wrap">
    <div class="shead"><div><div class="k">Catálogo de venta</div><h2>Explora por tipo de equipo</h2></div>
      <p>Si no ves el equipo que buscas, te lo cotizamos a pedido. <a class="v-ir-tienda" onclick="go('#/venta/tienda')">Ver toda la tienda →</a></p></div>
    <div class="v-cats">${VENTA.categorias.map(c => {
      const n = vDeCat(c.id).length;
      return `<a class="v-cat" onclick="go('#/venta/cat/${c.id}')">
        <span class="v-cat-ico">${vIco(c.id)}</span>
        <b>${vEsc(c.nombre)}</b>
        <small>${vEsc(c.ejemplos)}</small>
        <span class="v-cat-n">${n ? n+(n===1?' equipo':' equipos') : 'Cotización a pedido'} →</span>
      </a>`;}).join('')}</div>
  </div></section>

  ${dest.length ? `<section class="v-sec" data-sin-busqueda><div class="wrap">
    <div class="shead"><div><div class="k">Destacados</div><h2>Los equipos más pedidos</h2></div><p>Los que más compraron hospitales y centros de salud públicos en 2024 y 2025.</p></div>
    <div class="v-grid">${dest.map(vCard).join('')}</div>
    <div class="v-mas"><a class="btn" onclick="go('#/venta/tienda')">Ver los ${n} equipos de la tienda →</a></div>
  </div></section>` : ''}

  <section class="v-sec" data-sin-busqueda><div class="wrap v-dos">
    <div class="v-panel oscuro">
      <div class="k">Obras y proyectos</div>
      <h3>¿Equipas una obra? Hacemos el expediente técnico.</h3>
      <p>Metrado por ambiente, especificaciones técnicas, memoria de cálculo, presupuesto y planos del componente de equipamiento.</p>
      <a class="btn btn-fill" onclick="go('#/clientes')">Ver proyectos realizados →</a>
    </div>
    ${vListaCaja()}
  </div></section>

  <section class="v-sec" data-sin-busqueda><div class="wrap">
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
    <div>${vBuscador('vResCat','Buscar en todo el catálogo de venta')}<div id="vResCat"></div>
      <div data-sin-busqueda>${lista.length ? `<div class="v-cuenta">${lista.length} ${lista.length===1?'equipo':'equipos'}</div><div class="v-grid">${lista.map(vCard).join('')}</div>` : vacio}</div></div>
  </div></section>`;
}


/* ── Tienda: todo el catálogo de venta con filtros ─────────────────────
   Mismo esquema que el catálogo de alquiler: filtros a la izquierda
   (categoría, marca, procedencia, disponibilidad), buscador y orden
   arriba. #/venta/cat/<id> abre la tienda con esa categoría marcada.
   Filtrar solo repinta la grilla, así el buscador no pierde el foco. */
var VT = {q:'', cat:new Set(), marca:new Set(), origen:new Set(), stock:false, orden:'dest'};

function vtFaceta(titulo, clave, opciones){
  if(!opciones.length) return '';
  return `<details class="facet" open><summary>${titulo}</summary><div class="opts">${opciones.map(([v,txt,n]) =>
    `<label><input type="checkbox" value="${vEsc(v)}" ${VT[clave].has(v)?'checked':''} onchange="vtMarcar('${clave}',this.value,this.checked)"> ${vEsc(txt)} <span class="vt-n">${n}</span></label>`).join('')}</div></details>`;
}
function vtConteo(campo){
  const m = new Map();
  VENTA.productos.forEach(p => { const v = p[campo]; if(v) m.set(v, (m.get(v)||0)+1); });
  return m;
}
function vTienda(catInicial){
  VT.q=''; VT.marca.clear(); VT.origen.clear(); VT.stock=false;
  VT.cat = new Set(catInicial && vCat(catInicial) ? [catInicial] : []);
  const cc = vtConteo('cat'), cm = vtConteo('marca'), co = vtConteo('origen');
  const cats = VENTA.categorias.filter(c => cc.get(c.id)).map(c => [c.id, c.nombre, cc.get(c.id)]);
  const marcas = [...cm].sort((a,b) => a[0].localeCompare(b[0])).map(([v,n]) => [v,v,n]);
  const origenes = [...co].sort((a,b) => a[0].localeCompare(b[0])).map(([v,n]) => [v,v,n]);
  const hayStock = VENTA.productos.some(p => p.stock !== undefined && p.stock !== null && p.stock !== '');
  const hayPrecio = VENTA.productos.some(p => p.precio);
  const c1 = VT.cat.size===1 ? vCat([...VT.cat][0]) : null;
  return `
  <div class="wrap pagehead">
    <div class="crumb"><a onclick="go('#/venta')">Venta</a> &nbsp;/&nbsp; Tienda</div>
    <div class="k">Tienda de equipamiento biomédico</div>
    <h1>${c1 ? vEsc(c1.nombre) : 'Todos los equipos'}</h1>
    <p>Filtra por categoría, marca o procedencia. Cada equipo tiene su ficha con marca, modelo y el nombre con que aparece en los expedientes técnicos.</p>
  </div>
  <section style="padding-top:30px"><div class="wrap">
    <button class="filtros-btn" onclick="document.getElementById('vtSide').classList.toggle('open')">Filtros ▾</button>
    <div class="catalog-layout">
      <aside class="filters-side" id="vtSide">
        ${vtFaceta('Categoría','cat',cats)}
        ${vtFaceta('Marca','marca',marcas)}
        ${vtFaceta('Procedencia','origen',origenes)}
        ${hayStock ? `<details class="facet" open><summary>Disponibilidad</summary><div class="opts"><label><input type="checkbox" onchange="VT.stock=this.checked;vtPintar()"> Solo en stock</label></div></details>` : ''}
        <div class="filters-clear"><button onclick="vtLimpiar()">Limpiar filtros</button></div>
      </aside>
      <div class="catalog-main">
        <div class="vt-barra">
          <label class="v-busca vt-busca">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            <input type="search" placeholder="Buscar equipo, marca, modelo o código (ej. D-18)" oninput="VT.q=this.value;vtPintar()" aria-label="Buscar en la tienda">
          </label>
          <select class="vt-orden" onchange="VT.orden=this.value;vtPintar()" aria-label="Ordenar">
            <option value="dest">Más pedidos primero</option>
            <option value="az">Nombre (A–Z)</option>
            ${hayPrecio ? '<option value="pmen">Precio: menor a mayor</option><option value="pmay">Precio: mayor a menor</option>' : ''}
          </select>
        </div>
        <div class="vt-activos" id="vtActivos"></div>
        <div class="v-cuenta" id="vtCuenta"></div>
        <div class="v-grid vt-grid" id="vtGrid"></div>
      </div>
    </div>
  </div></section>
  <section class="v-sec"><div class="wrap vt-lista">${vListaCaja()}</div></section>`;
}
function vtFiltrados(){
  const t = vNorm(VT.q).split(/\s+/).filter(w => w.length > 1);
  let l = VENTA.productos.filter(p => {
    if(VT.cat.size && !VT.cat.has(p.cat)) return false;
    if(VT.marca.size && !VT.marca.has(p.marca)) return false;
    if(VT.origen.size && !VT.origen.has(p.origen)) return false;
    if(VT.stock && !(Number(p.stock) > 0)) return false;
    if(t.length){
      const c = vCat(p.cat);
      const txt = vNorm([p.nom,p.marca,p.modelo,p.expediente,p.clave,c&&c.nombre,(p.areas||[]).join(' '),(p.caracteristicas||[]).join(' ')].join(' '));
      if(!t.every(w => txt.includes(w))) return false;
    }
    return true;
  });
  const orden = VENTA.categorias.map(c => c.id);
  const dest = p => p.destacado ? Number(p.destacado) : 999;
  if(VT.orden==='az') l.sort((a,b) => a.nom.localeCompare(b.nom));
  else if(VT.orden==='pmen') l.sort((a,b) => (a.precio||Infinity)-(b.precio||Infinity));
  else if(VT.orden==='pmay') l.sort((a,b) => (b.precio||0)-(a.precio||0));
  else l.sort((a,b) => dest(a)-dest(b) || orden.indexOf(a.cat)-orden.indexOf(b.cat));
  return l;
}
function vtPintar(){
  const g = document.getElementById('vtGrid'); if(!g) return;
  const l = vtFiltrados();
  document.getElementById('vtCuenta').textContent = `${l.length} ${l.length===1?'equipo':'equipos'}`;
  const chips = [];
  VT.cat.forEach(v => { const c = vCat(v); chips.push(['cat',v,c?c.nombre:v]); });
  VT.marca.forEach(v => chips.push(['marca',v,v]));
  VT.origen.forEach(v => chips.push(['origen',v,v]));
  document.getElementById('vtActivos').innerHTML = chips.map(([k,v,t]) =>
    `<button onclick="vtMarcar('${k}','${vEsc(v)}',false,true)">${vEsc(t)} ✕</button>`).join('');
  g.innerHTML = l.length ? l.map(vCard).join('') : `<div class="v-vacio" style="grid-column:1/-1"><h3>No hay equipos con esos filtros</h3><p>Igual podemos conseguirlo. Escríbenos qué necesitas y te enviamos opciones con su ficha técnica.</p><div class="hero-cta"><a class="btn btn-fill" href="${vWA('Hola Sinergia Biomédica, busco: '+(VT.q||'un equipo'))}" target="_blank" rel="noopener">Cotizar por WhatsApp</a><button class="btn" onclick="vtLimpiar()">Limpiar filtros</button></div></div>`;
}
function vtMarcar(clave, v, on, desmarcar){
  on ? VT[clave].add(v) : VT[clave].delete(v);
  if(desmarcar) document.querySelectorAll('#vtSide input').forEach(i => { if(i.value===v) i.checked=false; });
  vtPintar();
}
function vtLimpiar(){
  ['cat','marca','origen'].forEach(k => VT[k].clear()); VT.stock=false; VT.q='';
  document.querySelectorAll('#vtSide input').forEach(i => i.checked=false);
  const b = document.querySelector('.vt-busca input'); if(b) b.value='';
  vtPintar();
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
  if((p.caracteristicas||[]).length) pest.push(['Características', `<ul class="v-puntos">${p.caracteristicas.map(u=>`<li>${vEsc(u)}</li>`).join('')}</ul><p class="v-nota">Te enviamos la ficha técnica completa del fabricante junto con la cotización.</p>`]);
  if(p.expediente) pest.push(['Para expedientes técnicos', `<table class="v-tabla"><tr><td>Nombre en el expediente</td><td><b>${vEsc(p.expediente)}</b></td></tr>${p.clave?`<tr><td>Código de referencia</td><td>${vEsc(p.clave)} (según NTS 113-MINSA)</td></tr>`:''}<tr><td>Modelo ofertado</td><td>${vEsc([p.marca,p.modelo].filter(Boolean).join(' '))}</td></tr></table><p class="v-nota">Envíanos la ficha técnica de tu expediente y te devolvemos el cuadro de cumplimiento, punto por punto, con el modelo ofertado.</p>`]);
  if(p.descripcion||p.resumen) pest.push(['Descripción', `<p>${vEsc(p.descripcion||p.resumen)}</p>${(p.usos||[]).length?`<ul class="v-puntos">${p.usos.map(u=>`<li>${vEsc(u)}</li>`).join('')}</ul>`:''}`]);
  if(specs) pest.push(['Especificaciones', `<table class="v-tabla">${specs}</table>`]);
  if((p.incluye||[]).length) pest.push(['Incluye', `<ul class="v-puntos">${p.incluye.map(u=>`<li>${vEsc(u)}</li>`).join('')}</ul>`]);
  const otros = vDeCat(p.cat).filter(x => x.id !== p.id).slice(0,3);
  const chips = [['Marca',p.marca],['Modelo',p.modelo],['Origen',p.origen],['Garantía',p.garantia]].filter(x=>x[1]);
  const areas = (p.areas||[]).length ? `<div class="v-areas"><span>Se usa en</span>${p.areas.map(a=>`<i>${vEsc(a)}</i>`).join('')}</div>` : '';
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
        ${p.precio||vStock(p)?`<div class="v-precio-caja">${p.precio?`<b>${vSoles(p.precio)}</b>`:''}${vStock(p)}<small>${p.precio?'Precio referencial, sujeto a confirmación en la cotización':'Consulta precio y plazo de entrega'}${VENTA.actualizado?' · Precios y stock al '+vEsc(VENTA.actualizado):''}</small></div>`:''}
        ${chips.length?`<div class="v-chips">${chips.map(x=>`<span>${x[0]} <b>${vEsc(x[1])}</b></span>`).join('')}</div>`:''}
        ${areas}
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
  const tienda = parte[0]==='tienda' || parte[0]==='cat';
  el.innerHTML = tienda ? vTienda(parte[0]==='cat' ? parte[1] : null) : parte[0]==='p' ? vProducto(parte[1]) : vPortada();
  if(tienda) vtPintar();
}
