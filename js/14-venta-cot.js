/* =====================================================================
   14-venta-cot.js — Cotizador de venta (#/cotizar-venta)

   El cliente arma su lista de equipos desde la tienda, con cantidades, y
   ve el total al instante. Después manda el pedido por WhatsApp con el
   enlace de su solicitud; la cotización formal, con membrete y firma, la
   emite la empresa desde #/emitir, igual que en alquiler.

   La lista se guarda en el navegador del cliente, así no se pierde
   mientras recorre la tienda ni al volver después.
   ===================================================================== */
/* El carrito vive en js/carrito.js, que también usan las páginas sueltas
   de producto. Aquí solo se lee y se escribe a través de él. */
const vcItems = () => (window.SBCarrito ? SBCarrito.items() : {});

/* Términos de la cotización de venta: se pueden cambiar sin tocar código. */
var VCOT_TERM = {vigenciaDias: 15, plazoStock: 'de 2 a 5 días hábiles',
  plazoPedido: 'se confirma al emitir la cotización', garantiaMeses: 12,
  pago: '50 % con la orden de compra y 50 % contra entrega, salvo acuerdo distinto por escrito.',
  incluye: 'Manual de usuario, certificado de garantía y capacitación de uso en la entrega.'};
fetch('data/terminos-venta.json', {cache: 'no-cache'}).then(r => r.ok ? r.json() : null)
  .then(d => { if(d) Object.keys(VCOT_TERM).forEach(k => { if(d[k] != null) VCOT_TERM[k] = d[k]; }); })
  .catch(() => {});

/* ── Carrito ────────────────────────────────────────────────────────── */
const vcProducto = id => ((VENTA && VENTA.productos) || []).find(p => p.id === id);
const vcCuenta = () => (window.SBCarrito ? SBCarrito.cuenta() : 0);

function vcAgregar(id, cuantos){
  const p = vcProducto(id);
  if(window.SBCarrito) SBCarrito.agregar(id, p ? {
    nom: p.nom, mm: [p.marca, p.modelo].filter(Boolean).join(' '),
    nts: p.clave || '', precio: Number(p.precio || 0), foto: vFoto(p, 0, true) || ''
  } : null, cuantos || 1);
  vcPintarTodo();
}
function vcCantidad(id, v){ if(window.SBCarrito) SBCarrito.cantidad(id, v); vcPintarTodo(); }
function vcQuitar(id){ if(window.SBCarrito) SBCarrito.quitar(id); vcPintarTodo(); }
function vcVaciar(){ if(window.SBCarrito) SBCarrito.vaciar(); vcPintarTodo(); }

/* ── Cuenta ─────────────────────────────────────────────────────────── */
/* Manda el catálogo cuando está cargado; si no (o si el equipo ya no está
   en la hoja), vale lo que se guardó al agregarlo. */
function vcCalcular(){
  const g = vcItems();
  const items = Object.keys(g)
    .map(id => {
      const y = g[id], v = vcProducto(id);
      /* Con catálogo manda el catálogo; sin él, lo que se guardó al agregar. */
      const p = v || {id: id, nom: y.nom || id, marca: y.mm || '', modelo: '', clave: y.nts || '',
        precio: Number(y.precio || 0)};
      const foto = v ? (vFoto(v, 0, true) || y.foto || '') : (y.foto || '');
      return {p: p, q: Number(y.q || 0), foto: foto};
    })
    .filter(x => x.q > 0)
    .map(x => ({p: x.p, q: x.q, foto: x.foto, precio: Number(x.p.precio || 0),
                total: Number(x.p.precio || 0) * x.q}));
  const total = items.reduce((s, x) => s + x.total, 0);
  const sinPrecio = items.filter(x => !x.precio).length;
  return {items, total, sinPrecio, unidades: items.reduce((s, x) => s + x.q, 0)};
}

/* ── Página ─────────────────────────────────────────────────────────── */
function vcAbrir(){
  /* La página ya tiene su botón de WhatsApp: el verde flotante sobraba y
     encima tapaba el formulario. */
  document.body.classList.add('wa-propio');
  vcPintarTodo();
  /* Si se vino del carrito tocando «Enviar por WhatsApp», se baja al
     formulario y se intenta enviar de una vez. */
  let ir = '';
  try{ ir = sessionStorage.getItem('sb-ir-enviar') || ''; sessionStorage.removeItem('sb-ir-enviar'); }catch(e){}
  if(ir) setTimeout(() => vcEnviar('whatsapp'), 350);
}
/* Los botones +/− del panel del carrito también repintan esta página. */
window.addEventListener('sb-carrito', () => { if(document.getElementById('vcBody')) vcPintar(); });

function vcPintarTodo(){
  vcPintar();
  vcChip();
  if(window.SBCarrito) SBCarrito.pintar();
}

/* Contador en el menú de venta, para volver a la lista desde cualquier sitio. */
function vcChip(){
  document.querySelectorAll('[data-vc-cuenta]').forEach(el => {
    const n = vcCuenta();
    el.textContent = n ? String(n) : '';
    el.hidden = !n;
  });
}

/* El catálogo se pide una sola vez, para refrescar precios y stock; la
   página NO lo espera, porque el carrito ya guarda lo necesario de cada
   equipo. Antes, si se entraba directo a esta dirección, se quedaba en
   «Cargando el catálogo…» para siempre. */
var VCOT_PEDIDO = false;
function vcCatalogo(){
  if(VCOT_PEDIDO || (VENTA && VENTA.productos) || typeof cargarVenta !== 'function') return;
  VCOT_PEDIDO = true;
  cargarVenta().then(() => { if(document.getElementById('vcBody')) vcPintar(); }).catch(() => {});
}

function vcPintar(){
  const caja = document.getElementById('vcBody');
  if(!caja) return;
  vcCatalogo();
  const c = vcCalcular();
  if(!c.items.length){
    caja.innerHTML = `<div class="wrap vc-vacio">
      <h1>Tu cotización está vacía</h1>
      <p>Entra a la tienda, abre los equipos que te interesan y toca «Agregar a mi cotización».
        Puedes poner cuántas unidades necesitas de cada uno y aquí verás el total al instante.</p>
      <a class="btn btn-fill btn-lg" onclick="go('#/venta/tienda')">Ver la tienda</a>
    </div>`;
    return;
  }
  const neto = Math.round(c.total / 1.18);
  caja.innerHTML = `
    <div class="wrap pagehead"><div class="k">Venta de equipos</div>
      <h1>Tu cotización</h1>
      <p>Revisa las cantidades, déjanos tus datos y te respondemos con la cotización formal,
        la disponibilidad y el plazo de entrega. Todos los precios incluyen IGV.</p>
    </div>
    <div class="wrap vc-grid">
      <div>
        <div class="cot-paso uno"><b>1</b> Tus equipos <i>${c.unidades} ${c.unidades === 1 ? 'unidad' : 'unidades'}</i></div>
        <div class="vc-lista">${c.items.map(vcFila).join('')}</div>
        <button type="button" class="cot-limpiar" onclick="vcVaciar()">Vaciar la lista</button>
      </div>
      <aside class="cot-res">
        <div class="cot-top">
          <span>Tu cotización · ${c.items.length} ${c.items.length === 1 ? 'equipo' : 'equipos'}</span>
          <b>${vSoles(c.total)}</b>
          <small>IGV incluido · precios referenciales</small>
          <div class="cot-acc">
            <button class="btn btn-fill" onclick="vcEnviar('whatsapp')">Enviar mi pedido por WhatsApp</button>
            <button class="btn" onclick="vcVista()">Ver el resumen</button>
          </div>
        </div>

        <div class="cot-paso"><b>2</b> El detalle</div>
        <ul class="cot-sel">${c.items.map(x =>
          `<li><span>${vEsc(x.p.nom)}${x.q > 1 ? ' × ' + x.q : ''}</span><span>${vSoles(x.total)}</span></li>`).join('')}
        </ul>
        <div class="cot-cuenta">
  <div class="sub"><span>Subtotal</span><span>${vSoles(neto)}</span></div>
          <div class="sub"><span>IGV (18 %)</span><span>${vSoles(c.total - neto)}</span></div>
          <div class="gran"><span>Total con IGV</span><span>${vSoles(c.total)}</span></div>
        </div>
        <p class="cot-aviso"><b>Es un precio referencial.</b> Lo confirmamos al emitir la cotización
          formal, junto con el stock y el plazo de entrega de cada equipo.</p>

        <div class="cot-paso"><b>3</b> Tus datos</div>
        <div class="cot-form" id="vcForm">
          <label>Nombre o institución<input id="vcNom" type="text" autocomplete="organization" placeholder="Clínica, hospital o nombre"></label>
          <div class="cot-f2">
            <label>Correo<input id="vcMail" type="email" autocomplete="email" inputmode="email" placeholder="correo@ejemplo.com"></label>
            <label>Teléfono<input id="vcTel" type="tel" autocomplete="tel" inputmode="tel" placeholder="999 999 999"></label>
          </div>
          <label>¿Algo que debamos saber?<textarea id="vcMsg" rows="2" placeholder="Para qué área, si es para un expediente, fechas…"></textarea></label>
          <div class="form-msg" id="vcAviso" role="status" aria-live="polite"></div>
          <p class="cot-mail">Con tus datos listos, toca «Enviar mi pedido por WhatsApp».
            ¿Prefieres correo? <button type="button" onclick="vcEnviar('correo')">Enviar por correo</button>
            · <button type="button" onclick="vcCopiar()">Copiar el mensaje</button></p>
        </div>
        <p class="cot-nota">Entrega en Lima. A provincia se envía por agencia de transporte; el envío
          lo contrata y lo paga el cliente.</p>
      </aside>
    </div>`;
  vcRestaurar();
}

function vcFila(x){
  const p = x.p, foto = x.foto;
  return `<div class="vc-i">
    ${foto ? `<img class="vc-f" src="${foto}" alt="" loading="lazy" decoding="async">` : '<span class="vc-f sin"></span>'}
    <div class="vc-n">
      <b>${vEsc(p.nom)}</b>
      <small>${vEsc([p.marca, p.modelo].filter(Boolean).join(' '))}${p.clave ? ' · NTS ' + vEsc(p.clave) : ''}</small>
      ${p.stock != null ? vStock(p) : ''}
    </div>
    <div class="vc-q">
      <button type="button" onclick="vcCantidad('${p.id}',${x.q - 1})" aria-label="Quitar uno">−</button>
      <input type="number" min="1" step="1" value="${x.q}" onchange="vcCantidad('${p.id}',this.value)" aria-label="Cantidad">
      <button type="button" onclick="vcCantidad('${p.id}',${x.q + 1})" aria-label="Agregar uno">+</button>
    </div>
    <div class="vc-p"><b>${vSoles(x.total)}</b>${x.q > 1 ? `<small>${vSoles(x.precio)} c/u</small>` : ''}</div>
    <button type="button" class="vc-x" onclick="vcQuitar('${p.id}')" aria-label="Quitar de la lista">✕</button>
  </div>`;
}

/* Los datos del cliente no se pierden al repintar. */
var VCOT_DATOS = {nom: '', mail: '', tel: '', msg: ''};
function vcDatos(){
  const v = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  return {nom: v('vcNom') || VCOT_DATOS.nom, mail: v('vcMail') || VCOT_DATOS.mail,
          tel: v('vcTel') || VCOT_DATOS.tel, msg: v('vcMsg') || VCOT_DATOS.msg};
}
function vcRestaurar(){
  [['vcNom','nom'],['vcMail','mail'],['vcTel','tel'],['vcMsg','msg']].forEach(([id, k]) => {
    const el = document.getElementById(id); if(!el) return;
    if(VCOT_DATOS[k]) el.value = VCOT_DATOS[k];
    el.addEventListener('input', () => { VCOT_DATOS[k] = el.value; });
  });
}

/* ── Documento de venta ──────────────────────────────────────────────
   Mismo motor que el alquiler (cotHTML), con el cuadro armado por
   unidades y sus propios términos. Así el resumen del cliente y la
   cotización formal salen con el mismo formato de la empresa. */
function vcDoc(c, d){
  return {
    tipo: 'venta',
    num: vcNumero(), fecha: new Date().toLocaleDateString('es-PE'),
    nom: d.nom, mail: d.mail, tel: d.tel, nota: d.msg || '',
    /* Solo lo imprescindible: id, cantidad y precio. El nombre, la marca y
       el código NTS se leen del catálogo al abrir el enlace, y solo viajan
       dentro cuando el equipo ya no está en el catálogo. Con esto el enlace
       no crece sin control y WhatsApp siempre lo acepta. */
    items: c.items.map(x => {
      const it = {i: x.p.id, q: x.q, pu: x.precio, t: x.total};
      if(!vcProducto(x.p.id)){
        it.n = x.p.nom;
        it.m = [x.p.marca, x.p.modelo].filter(Boolean).join(' · ');
        it.nts = x.p.clave || '';
      }
      return it;
    }),
    total: c.total, gar: 0, tec: 0, pas: 0, via: 0, inc: []
  };
}
function vcNumero(){
  const d = new Date(), z = n => String(n).padStart(2, '0');
  return 'SOL-V-' + String(d.getFullYear()).slice(2) + z(d.getMonth() + 1) + z(d.getDate()) +
         '-' + z(d.getHours()) + z(d.getMinutes());
}

/* Los datos del equipo para el documento: del catálogo si está, y si no,
   de lo que viajó dentro del enlace. */
function vcInfoDe(e){
  const p = vcProducto(e.i);
  let foto = '';
  if(p){ try{ foto = cotFotoAbs({photo: (p.fotos || [])[0]}) || ''; }catch(x){} }
  return {
    nom: p ? p.nom : (e.n || e.i || 'Equipo'),
    mm: p ? [p.marca, p.modelo].filter(Boolean).join(' · ') : (e.m || ''),
    nts: p ? (p.clave || '') : (e.nts || ''),
    foto: e.f || foto
  };
}

/* Términos de la cotización de venta. */
function vcTerminos(d){
  const T = VCOT_TERM, L = [];
  L.push(['1. Precio de la oferta.', 'Importes en Soles (S/), con IGV incluido. Corresponden a los equipos ' +
    'detallados en el Cuadro N° 1, en las cantidades indicadas.']);
  L.push(['2. Vigencia de la oferta.', T.vigenciaDias + ' días calendario contados desde la emisión de esta cotización.']);
  L.push(['3. Plazo de entrega.', 'Equipos en stock: ' + T.plazoStock + ' desde la conformidad de la orden de compra. ' +
    'Equipos a pedido: ' + T.plazoPedido + '.']);
  L.push(['4. Entrega.', 'En Lima Metropolitana, en el domicilio indicado por el cliente. Para provincias el envío ' +
    'se realiza por agencia de transporte y su costo lo asume el cliente.']);
  L.push(['5. Garantía.', T.garantiaMeses + ' meses de garantía del fabricante contra defectos de fabricación, ' +
    'con atención en nuestro taller de Lima. No cubre el daño por mal uso ni el desgaste de los consumibles.']);
  L.push(['6. Incluye.', T.incluye]);
  L.push(['7. Forma de pago.', T.pago]);
  L.push(['8. Comprobante.', 'Se emite factura electrónica a nombre de la razón social indicada por el cliente.']);
  return L;
}

/* ── Mensaje y envío ────────────────────────────────────────────────── */
function vcTexto(c, d){
  const L = [];
  L.push('SOLICITUD DE COTIZACIÓN — ' + ((typeof SITE !== 'undefined' && SITE.nombre) || 'Sinergia Biomédica'));
  L.push('N.º ' + vcNumero() + ' · ' + new Date().toLocaleDateString('es-PE'));
  L.push('');
  L.push('CLIENTE');
  L.push('  Nombre: ' + (d.nom || '—'));
  if(d.mail) L.push('  Correo: ' + d.mail);
  if(d.tel)  L.push('  Teléfono: ' + d.tel);
  L.push('');
  L.push('EQUIPOS');
  c.items.forEach((x, i) => {
    L.push((i + 1) + '. ' + x.p.nom + ' · ' + [x.p.marca, x.p.modelo].filter(Boolean).join(' ') +
           (x.q > 1 ? ' × ' + x.q : '') + ' · ' + vSoles(x.total));
  });
  L.push('');
  L.push('  TOTAL REFERENCIAL (IGV incluido): ' + vSoles(c.total));
  if(d.msg){ L.push(''); L.push('NOTA DEL CLIENTE'); L.push('  ' + d.msg); }
  L.push('');
  L.push('Entrega en Lima. A provincia, envío por agencia a cargo del cliente.');
  return L.join('\n');
}

function vcEnviar(via){
  const c = vcCalcular();
  if(!c.items.length) return;
  const d = vcDatos();
  const error = (typeof validarContacto === 'function') ? validarContacto(d.nom, d.mail, d.tel) : '';
  if(error){
    const f = document.getElementById('vcForm');
    if(f) f.scrollIntoView({behavior: 'smooth', block: 'center'});
    avisar('vcAviso', error, 'err');
    const el = document.getElementById('vcNom'); if(el && !d.nom) setTimeout(() => el.focus(), 350);
    return;
  }
  const doc = vcDoc(c, d);
  const enlace = cotEnlace(doc);
  let texto = vcTexto(c, d) + '\n\nResumen de este pedido:\n' + enlace;
  /* WhatsApp se queda en blanco con direcciones muy largas: si el pedido
     es grande, va el resumen corto y el enlace, que lo tiene todo. */
  if(encodeURIComponent(texto).length > 1500){
    texto = ['SOLICITUD DE COTIZACIÓN — ' + ((typeof SITE !== 'undefined' && SITE.nombre) || 'Sinergia Biomédica'),
      'Cliente: ' + (d.nom || '—') + (d.tel ? ' · ' + d.tel : ''),
      c.items.length + (c.items.length === 1 ? ' equipo' : ' equipos') + ' · ' +
        c.unidades + (c.unidades === 1 ? ' unidad' : ' unidades') +
        ' · TOTAL REFERENCIAL ' + vSoles(c.total) + ' (IGV incluido)',
      '', 'El detalle completo está aquí:', enlace].join('\n');
  }
  if(typeof enviarAlEndpoint === 'function')
    enviarAlEndpoint({tipo: 'venta-cotizador', equipo: c.items.map(x => x.p.nom).join(' + '),
                      total: vSoles(c.total), nombre: d.nom, correo: d.mail, telefono: d.tel, mensaje: d.msg});
  avisar('vcAviso', via === 'correo'
    ? 'Abriendo tu correo con el resumen de tu pedido…'
    : 'Abriendo WhatsApp con el resumen de tu pedido…', 'ok');
  abrirCanal(via, texto, 'Solicitud de cotización · venta');
}

/* Si WhatsApp no abre (pasa en algunas computadoras), el mensaje se puede
   copiar y pegar a mano. */
function vcCopiar(){
  const c = vcCalcular();
  if(!c.items.length) return;
  const d = vcDatos();
  const texto = vcTexto(c, d) + '\n\nResumen de este pedido:\n' + cotEnlace(vcDoc(c, d));
  const ok = () => avisar('vcAviso', 'Mensaje copiado: pégalo donde quieras enviarlo.', 'ok');
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(texto).then(ok).catch(() => vcCopiarViejo(texto, ok));
  }else vcCopiarViejo(texto, ok);
}
function vcCopiarViejo(texto, ok){
  const t = document.createElement('textarea');
  t.value = texto; t.style.position = 'fixed'; t.style.opacity = '0';
  document.body.appendChild(t); t.select();
  try{ document.execCommand('copy'); ok(); }catch(e){
    avisar('vcAviso', 'No se pudo copiar. Usa «Enviar por correo».', 'err');
  }
  t.remove();
}

/* Vista previa, en una ventana flotante: no descarga nada. */
function vcVista(){
  const c = vcCalcular();
  if(!c.items.length) return;
  cotModal(vcDoc(c, vcDatos()));
}
