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
  if(VENTA && VENTA_VIVO){
    /* Si la hoja aún no tiene fotos de un equipo, se usan las del sitio (img/venta/). */
    const base = new Map((VENTA.base || VENTA.productos).map(p => [p.id, p]));
    VENTA.base = VENTA.base || VENTA.productos;
    VENTA.productos = VENTA_VIVO.productos.map(p => {
      const fija = (VENTA.fijas||{})[p.id];          // foto corregida a mano (la del proveedor estaba mal)
      if(Array.isArray(fija) && fija.length) return Object.assign({}, p, {fotos: fija});
      const b = base.get(p.id);
      /* Orden de prioridad: foto corregida (fotosFijas) › foto de la hoja o
         del proveedor (modelo real) › foto antigua del sitio (respaldo). */
      const respaldo = b && b.fotosSitio && b.fotosSitio.length;
      return respaldo && !(p.fotos && p.fotos.length) ? Object.assign({}, p, {fotos: b.fotosSitio}) : p;
    });
    VENTA.actualizado = VENTA_VIVO.actualizado;
  }
}

function cargarVenta(){
  if(!VENTA_CARGA){
    VENTA_CARGA = fetch('data/venta.json', {cache:'no-cache'})
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .catch(() => ({categorias:[], productos:[]}))
      .then(d => { VENTA = {categorias: d.categorias||[], productos: (d.productos||[]).filter(p => p && p.id && p.nom).map(p => p.fotos || !p.fotosSitio ? p : Object.assign({}, p, {fotos: p.fotosSitio})), fijas: d.fotosFijas||{}, primeros: d.primerosWeb||[]}; vMezclar(); return VENTA; });
    /* Precios y stock en vivo desde el Apps Script de venta (si está configurado). */
    const vu = (typeof CONFIG!=='undefined' && CONFIG.VENTA_URL) || '';
    if(vu) fetch(vu, {cache:'no-store'}).then(r => r.json()).then(d => { if(d && d.ok !== false) ventaEnVivo(d); }).catch(() => {});
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
    ? `<div class="v-cuenta">${r.length} ${r.length===1?'resultado':'resultados'} para «${vEsc(q)}»</div><div class="grid">${r.map(vCard).join('')}</div>`
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
/* En la ficha (detalle=true) se muestra siempre la cantidad; en las tarjetas,
   solo cuando quedan pocas unidades. */
function vStock(p, detalle){
  if(p.stock === undefined || p.stock === null || p.stock === '') return '';
  const n = Number(p.stock);
  if(!(n > 0)) return '<span class="v-stock">A pedido</span>';
  const cant = detalle || n <= 5 ? ' · ' + n + (n === 1 ? ' unidad' : (detalle ? ' unidades' : ' und.')) : '';
  return `<span class="v-stock si">En stock${cant}</span>`;
}

/* Foto del producto: la versión ligera (-m) en tarjetas y la grande en la ficha. */
function vFoto(p, i, ligera){ const u=(p.fotos||[])[i||0]; return u ? fotoURL(u, ligera?700:1200, ligera) : ''; }

/* Tarjeta con el mismo formato que la del catálogo de alquiler (.eq):
   foto arriba con etiquetas, categoría, nombre, marca y pie con precio. */
/* Marca, modelo y origen como una franja de ficha técnica: tres columnas
   alineadas (título pequeño arriba, dato abajo), sin cajitas, entre dos
   líneas finas. Se lee de un vistazo y no compite con el nombre. Si un
   dato es largo, la columna baja de línea en vez de cortarse. */
function vMarcaModelo(p, grande){
  const d = [['Marca', p.marca, 'marca'], ['Modelo', p.modelo, 'modelo'], ['Origen', p.origen, 'origen']].filter(x => x[1]);
  if(!d.length) return '';
  return `<dl class="v-ft${grande?' v-ft-g':''}">${d.map(([k,v,c]) =>
    `<div class="v-ft-${c}"><dt>${k}</dt><dd>${vEsc(v)}</dd></div>`).join('')}</dl>`;
}

/* Vigencia del precio: 14 días desde la última actualización con el
   portal del proveedor (fecha «actualizado» de la hoja, dd/mm/aaaa).
   Devuelve '15/10/2026' o '' si no hay fecha; vencida → 'vencido'. */
const V_VIGENCIA_DIAS = 14;
function vVigencia(){
  const m = String((VENTA && VENTA.actualizado) || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if(!m) return '';
  const f = new Date(+m[3], +m[2]-1, +m[1] + V_VIGENCIA_DIAS);
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  if(f < hoy) return 'vencido';
  const d2 = n => String(n).padStart(2,'0');
  return `${d2(f.getDate())}/${d2(f.getMonth()+1)}/${f.getFullYear()}`;
}
function vNotaPrecio(larga){
  const v = vVigencia();
  if(v === 'vencido') return larga ? 'Precio referencial, por confirmar en la cotización' : 'por confirmar';
  if(v) return larga ? `Precio vigente hasta el ${v} · se confirma en la cotización` : `vigente hasta el ${v}`;
  return larga ? 'Precio referencial, sujeto a confirmación en la cotización' : 'sujeto a confirmación';
}

/* Cada equipo tiene su página propia (venta/<id>/, la genera
   scripts/generar_paginas_venta.py y la anota en window.PAGINA_VENTA).
   Si un equipo es nuevo y aún no tiene página, se abre la ficha interna. */
function vPagina(id){ return (window.PAGINA_VENTA || {})[id] || ''; }
function vAbrir(id){ const u = vPagina(id); if(u) location.href = u; else go('#/venta/p/' + id); }

function vCard(p){
  const c = vCat(p.cat);
  const foto = vFoto(p, 0, true);
  const url = `#/venta/p/${p.id}`;   // referencia; los clics van por vAbrir()
  const st = (p.stock === undefined || p.stock === null || p.stock === '') ? '' :
    (Number(p.stock) > 0 ? '<span class="badge">EN STOCK</span>' : '<span class="badge v-apedido">A PEDIDO</span>');
  const tag = p._top ? '<span class="tier">Más pedido</span>' : '';
  const pie = p.precio
    ? `<div class="price"><span class="desde">Precio referencial</span>${vSoles(p.precio)}<small>${vNotaPrecio(false)}</small></div>`
    : `<div class="price v-consulta">Consultar precio<small>te respondemos con precio y plazo</small></div>`;
  return `<div class="eq v-eq">
    <div class="img${foto?' has-photo':''}" onclick="vAbrir('${p.id}')">
      ${foto?'':'<span class="grid-bg"></span>'}${st}${tag}
      ${foto?`<img class="photo" src="${foto}" alt="${vEsc(p.nom)} ${vEsc(p.marca||'')} ${vEsc(p.modelo||'')}" loading="lazy" decoding="async">`:`<span class="v-sinfoto">${vIco(p.cat,'v-ico-xl')}</span>`}
    </div>
    <div class="body">
      <div class="cat">${vEsc(c?c.nombre:'')}</div>
      <h3><a onclick="vAbrir('${p.id}')">${vEsc(p.nom)}</a></h3>
      ${vMarcaModelo(p)}
      ${p.clave?`<div class="v-exp" title="Código en expedientes técnicos (NTS 113-MINSA)">Expediente ${vEsc(p.clave)}</div>`:''}
      <div class="desc">${vEsc(p.resumen||'')}</div>
      <div class="foot">${pie}<a class="btn" href="${vWA('Hola Sinergia Biomédica, quiero cotizar: '+p.nom+(p.marca?' '+p.marca:'')+(p.modelo?' '+p.modelo:''))}" target="_blank" rel="noopener">Cotizar</a></div>
    </div>
  </div>`;
}

function vHueso(){
  return `<div class="wrap pagehead"><span class="ln w35"></span></div><section><div class="wrap v-cats">${
    Array.from({length:8},()=>'<div class="v-cat v-hueso"></div>').join('')}</div></section>`;
}

/* ── Orden de la tienda ─────────────────────────────────────────────
   1) Los fijados en data/venta.json («primerosWeb»), en ese orden.
   2) Hasta S/ 60 000 antes; los más caros al final.
   3) Dentro de cada tramo, variado y según el estudio de compras
      públicas: primero una opción de cada tipo de equipo (la
      representativa de la hoja o la más accesible), en el orden del
      ranking; luego la segunda opción de cada tipo; etc.
   Marca _top (etiqueta «Más pedido») al primero de cada tipo del ranking. */
const V_CARO = 60000;
function vOrden(lista){
  const pin = (VENTA && VENTA.primeros) || [];
  const grupos = new Map();
  lista.forEach(p => { const k = p.ranking ? 'r'+p.ranking : 'c'+p.cat; if(!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(p); });
  const key = new Map();
  grupos.forEach(g => {
    /* Primera opción de cada tipo: la fijada, luego la elegida como
       representativa en la hoja (destacado) y luego por precio. */
    const fij = p => pin.includes(p.id) ? 0 : 1, des = p => p.destacado ? 0 : 1;
    g.sort((a,b) => fij(a)-fij(b) || des(a)-des(b) || (a.precio||Infinity)-(b.precio||Infinity));
    const ronda = [0,0];
    g.forEach(p => { const t = (p.precio||0) > V_CARO ? 1 : 0; const r = ronda[t]++; key.set(p, [t, r]); p._top = !!(p.ranking && r === 0) || pin.includes(p.id); });
  });
  return lista.slice().sort((a,b) => {
    const pa = pin.indexOf(a.id), pb = pin.indexOf(b.id);
    if(pa >= 0 || pb >= 0) return (pa < 0 ? 999 : pa) - (pb < 0 ? 999 : pb);
    const ka = key.get(a), kb = key.get(b);
    return ka[0]-kb[0] || ka[1]-kb[1] || (a.ranking||999)-(b.ranking||999) || (a.precio||Infinity)-(b.precio||Infinity);
  });
}

/* ── Portada de venta ─────────────────────────────────────────────── */
function vPortada(){
  /* Mismo esquema que el inicio de alquiler: hero con imagen, franja de
     marcas, «más pedidos» con acceso a la tienda y accesos por categoría.
     destacado = puesto según las compras públicas 2024-2025 (OECE). */
  const dest = vOrden(VENTA.productos).filter(p => p._top);
  const n = VENTA.productos.length;
  const mosaico = dest.filter(p => (p.fotos||[]).length).slice(0,4);
  const marcas = ['EDAN','TUTTNAUER','KLS MARTIN','CU MEDICAL','SIARE','MEMMERT'];
  return `
  <div class="wrap hero-grid v-hero2">
    <div>
      <div class="eyebrow">Venta · Equipamiento · Expedientes</div>
      <h1>Equipamiento médico con <em>respaldo técnico</em>.</h1>
      <p class="lead">${n} equipos de marcas como Edan, Tuttnauer, KLS Martin y CU Medical para hospitales, clínicas y obras de equipamiento en Lima y provincias.</p>
      <div class="hero-props">
        <span>Ficha técnica y código de expediente</span>
        <span>Mantenimiento después de la venta</span>
      </div>
      <div class="hero-cta">
        <a class="btn btn-fill btn-lg" onclick="go('#/venta/tienda')">Ver la tienda</a>
        <a class="btn btn-lg" onclick="document.getElementById('cotiza-lista').scrollIntoView({behavior:'smooth',block:'center'})">Cotizar mi lista</a>
      </div>
    </div>
    <div class="hero-stage v-mosaico">
      <div class="v-mos">${mosaico.map(p => `<a onclick="vAbrir('${p.id}')" title="${vEsc(p.nom)}"><img src="${vFoto(p,0,true)}" alt="${vEsc(p.nom)}"></a>`).join('')}</div>
      <div class="cap"><span>Los más comprados por hospitales en 2024 y 2025</span><span><b>VENTA</b></span></div>
    </div>
  </div>
  <div class="marcas v-marcas">
    <div class="wrap"><span class="lab">Marcas que vendemos</span>
      <div class="names">${marcas.map(m => `<span>${m}</span>`).join('')}</div>
    </div>
  </div>

  <section><div class="wrap">
    <div class="v-portada-busca">${vBuscador('vResPortada')}</div>
    <div id="vResPortada"></div>
    <div data-sin-busqueda>
      <div class="shead">
        <div><div class="k">Tienda de venta</div><h2>Equipos más pedidos</h2></div>
        <a class="btn btn-fill" onclick="go('#/venta/tienda')">Ver toda la tienda →</a>
      </div>
      <div class="grid">${dest.slice(0,8).map(vCard).join('')}</div>
      <div class="cat-chips">
        <span>Ir directo a</span>
        ${VENTA.categorias.filter(c => vDeCat(c.id).length).map(c => `<button class="chip" onclick="go('#/venta/cat/${c.id}')">${vEsc(c.nombre)}</button>`).join('')}
      </div>
    </div>
  </div></section>

  <section style="padding-top:0" data-sin-busqueda><div class="wrap v-dos">
    <div class="v-panel oscuro">
      <div class="k">Obras y proyectos</div>
      <h3>¿Equipas una obra? Hacemos el expediente técnico.</h3>
      <p>Metrado por ambiente, especificaciones técnicas, memoria de cálculo, presupuesto y planos del componente de equipamiento.</p>
      <a class="btn btn-fill" onclick="go('#/clientes')">Ver proyectos realizados →</a>
    </div>
    ${vListaCaja()}
  </div></section>

  <section style="padding-top:0" data-sin-busqueda><div class="wrap">
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



/* ── Tienda: todo el catálogo de venta con filtros ─────────────────────
   Mismo esquema que el catálogo de alquiler: filtros a la izquierda
   (categoría, marca, procedencia, disponibilidad), buscador y orden
   arriba. #/venta/cat/<id> abre la tienda con esa categoría marcada.
   Filtrar solo repinta la grilla, así el buscador no pierde el foco. */
var VT = {q:'', cat:new Set(), marca:new Set(), origen:new Set(), precio:new Set(), stock:false, orden:'dest'};

/* Tramos de precio de la tienda (S/). Orden por defecto: por tramo, de menor
   a mayor, y dentro de cada tramo por «más pedidos» (puesto del tipo de
   equipo en el estudio de compras públicas 2024-2025). */
const V_TRAMOS = [            // límite superior y nombre (con espacios que no se cortan)
  [2000,     'Hasta S/ 2 000'],
  [6000,     'S/ 2 000 – 6 000'],
  [15000,    'S/ 6 000 – 15 000'],
  [40000,    'S/ 15 000 – 40 000'],
  [100000,   'S/ 40 000 – 100 000'],
  [Infinity, 'Más de S/ 100 000']
];
function vTramo(p){ return p.precio ? V_TRAMOS.findIndex(t => p.precio <= t[0]) : V_TRAMOS.length; }
function vTramoNombre(i){ return i < V_TRAMOS.length ? V_TRAMOS[i][1] : 'Consultar precio'; }

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
  VT.q=''; VT.marca.clear(); VT.origen.clear(); VT.precio.clear(); VT.stock=false;
  VT.cat = new Set(catInicial && vCat(catInicial) ? [catInicial] : []);
  const cc = vtConteo('cat'), cm = vtConteo('marca'), co = vtConteo('origen');
  const cats = VENTA.categorias.filter(c => cc.get(c.id)).map(c => [c.id, c.nombre, cc.get(c.id)]);
  const marcas = [...cm].sort((a,b) => a[0].localeCompare(b[0])).map(([v,n]) => [v,v,n]);
  const origenes = [...co].sort((a,b) => a[0].localeCompare(b[0])).map(([v,n]) => [v,v,n]);
  const hayStock = VENTA.productos.some(p => p.stock !== undefined && p.stock !== null && p.stock !== '');
  const hayPrecio = VENTA.productos.some(p => p.precio);
  const ct = new Map(); VENTA.productos.forEach(p => { const t = String(vTramo(p)); ct.set(t, (ct.get(t)||0)+1); });
  const tramos = [...V_TRAMOS.keys(), V_TRAMOS.length].filter(i => ct.get(String(i))).map(i => [String(i), vTramoNombre(i), ct.get(String(i))]);
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
        ${hayPrecio ? vtFaceta('Precio','precio',tramos) : ''}
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
            <option value="dest">Por precio y más pedidos</option>
            <option value="az">Nombre (A–Z)</option>
            ${hayPrecio ? '<option value="pmen">Precio: menor a mayor</option><option value="pmay">Precio: mayor a menor</option>' : ''}
          </select>
        </div>
        <div class="vt-activos" id="vtActivos"></div>
        <div class="v-cuenta" id="vtCuenta"></div>
        <div class="grid vt-grid" id="vtGrid"></div>
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
    if(VT.precio.size && !VT.precio.has(String(vTramo(p)))) return false;
    if(VT.stock && !(Number(p.stock) > 0)) return false;
    if(t.length){
      const c = vCat(p.cat);
      const txt = vNorm([p.nom,p.marca,p.modelo,p.expediente,p.clave,c&&c.nombre,(p.areas||[]).join(' '),(p.caracteristicas||[]).join(' ')].join(' '));
      if(!t.every(w => txt.includes(w))) return false;
    }
    return true;
  });
  if(VT.orden==='az') l.sort((a,b) => a.nom.localeCompare(b.nom));
  else if(VT.orden==='pmen') l.sort((a,b) => (a.precio||Infinity)-(b.precio||Infinity));
  else if(VT.orden==='pmay') l.sort((a,b) => (b.precio||0)-(a.precio||0));
  else {
    vOrden(VENTA.productos);                 // marca «Más pedido» (_top) sobre todo el catálogo
    const rk = p => p.ranking ? Number(p.ranking) : 999;
    l.sort((a,b) => vTramo(a)-vTramo(b) || rk(a)-rk(b) || (b._top?1:0)-(a._top?1:0) || (a.precio||Infinity)-(b.precio||Infinity));
  }
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
  VT.precio.forEach(v => chips.push(['precio',v,vTramoNombre(Number(v))]));
  document.getElementById('vtActivos').innerHTML = chips.map(([k,v,t]) =>
    `<button onclick="vtMarcar('${k}','${vEsc(v)}',false,true)">${vEsc(t)} ✕</button>`).join('');
  /* En el orden por defecto, un título por cada tramo de precio. */
  let html = '';
  if(VT.orden === 'dest'){
    let t = -1;
    l.forEach(p => {
      const tp = vTramo(p);
      if(tp !== t){ t = tp; const n = l.filter(x => vTramo(x) === tp).length;
        html += `<div class="v-tramo"><b>${vTramoNombre(tp)}</b><span>${n} ${n===1?'equipo':'equipos'}</span></div>`; }
      html += vCard(p);
    });
  } else html = l.map(vCard).join('');
  g.innerHTML = l.length ? html : `<div class="v-vacio" style="grid-column:1/-1"><h3>No hay equipos con esos filtros</h3><p>Igual podemos conseguirlo. Escríbenos qué necesitas y te enviamos opciones con su ficha técnica.</p><div class="hero-cta"><a class="btn btn-fill" href="${vWA('Hola Sinergia Biomédica, busco: '+(VT.q||'un equipo'))}" target="_blank" rel="noopener">Cotizar por WhatsApp</a><button class="btn" onclick="vtLimpiar()">Limpiar filtros</button></div></div>`;
}
function vtMarcar(clave, v, on, desmarcar){
  on ? VT[clave].add(v) : VT[clave].delete(v);
  if(desmarcar) document.querySelectorAll('#vtSide input').forEach(i => { if(i.value===v) i.checked=false; });
  vtPintar();
}
function vtLimpiar(){
  ['cat','marca','origen','precio'].forEach(k => VT[k].clear()); VT.stock=false; VT.q='';
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
  const chips = [['Garantía',p.garantia]].filter(x=>x[1]);   // marca, modelo y origen ya van arriba (vMarcaModelo)
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
        ${vMarcaModelo(p, true)}
        ${p.resumen?`<p class="v-resumen">${vEsc(p.resumen)}</p>`:''}
        ${p.precio||vStock(p)?`<div class="v-precio-caja">${p.precio?`<b>${vSoles(p.precio)}</b>`:''}${vStock(p,true)}<small>${p.precio?vNotaPrecio(true):'Consulta precio y plazo de entrega'}</small></div>`:''}
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
    ${otros.length?`<section class="v-sec" style="padding-bottom:0"><div class="shead"><div><div class="k">Misma categoría</div><h2>También te puede interesar</h2></div></div><div class="grid">${otros.map(vCard).join('')}</div></section>`:''}
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
  if(parte[0]==='p' && vPagina(parte[1])){ location.replace(vPagina(parte[1])); return; }   // enlaces viejos → página propia
  el.innerHTML = tienda ? vTienda(parte[0]==='cat' ? parte[1] : null) : parte[0]==='p' ? vProducto(parte[1]) : vPortada();
  if(tienda) vtPintar();
}
