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

/* Largo máximo del enlace del resumen antes de aligerarlo. WhatsApp abre sin
   problemas por debajo de los 2 000 caracteres de mensaje; el enlace es la
   parte que más crece. */
var VCOT_ENLACE_MAX = 1400;

/* Términos de la cotización de venta: se pueden cambiar sin tocar código. */
var VCOT_TERM = {vigenciaDias: 15, plazoStock: 'de 2 a 5 días hábiles',
  plazoPedido: 'se confirma al emitir la cotización', garantiaMeses: 12,
  pago: '50 % con la orden de compra y 50 % contra entrega, salvo acuerdo distinto por escrito.',
  incluye: 'Manual de usuario, certificado de garantía y capacitación de uso en la entrega.',
  /* Cuándo el viaje corre por cuenta de Sinergia. Ver data/terminos-venta.json. */
  instalacionIncluida: {desde: 40000, topePasaje: 260, desdePasajeCompleto: 80000,
                        diasIncluidos: 2, personasIncluidas: 1}};
fetch('data/terminos-venta.json', {cache: 'no-cache'}).then(r => r.ok ? r.json() : null)
  .then(d => { if(d) Object.keys(VCOT_TERM).forEach(k => { if(d[k] != null) VCOT_TERM[k] = d[k]; }); })
  .catch(() => {});

/* ── Servicio fuera de Lima Metropolitana ───────────────────────────
   Lo piden casi siempre: el equipo se entrega en provincia y alguien
   tiene que ir a instalarlo y capacitar al personal.

   NO tiene tarifas propias: usa las mismas que el simulador de alquiler
   (data/tarifas-alquiler.json), que ya resuelve este problema desde hace
   tiempo — TEC_DIA para el personal, VIAJE.viaticoDia y
   VIAJE.hospedajeNoche para los viáticos y VIAJE.zonas para el pasaje
   según la distancia. Así una sola tabla manda en los dos sitios y no
   hay dos verdades que se contradigan. */
var VCOT_SRV = {fuera: false, ciudad: '', dias: 1, personas: 1};

/* Las tarifas del viaje, tal como las usa el alquiler. */
function vcTarifas(){
  return {personalDia: (typeof TEC_DIA !== 'undefined' ? TEC_DIA : 120),
          viaticoDia: (typeof VIAJE !== 'undefined' ? VIAJE.viaticoDia : 50),
          hospedajeNoche: (typeof VIAJE !== 'undefined' ? VIAJE.hospedajeNoche : 90)};
}

/* Cuánto del viaje corre por cuenta de Sinergia.

   La idea es simple: cuando la utilidad del pedido es grande, regalar el
   viaje compra la venta; cuando es chica, se la come.

   Quien decide es la hoja, no la web. La web nunca ve la utilidad (con
   ella se deduciría lo que cuesta el equipo en el proveedor): lo que le
   llega de cada equipo es un número chico, p.inst, que ya trae decidido
   el escalón:
     · inst = 1  → instalación, capacitación y viaje incluidos, con el
       pasaje cubierto hasta topePasaje; si la ciudad es más cara (avión),
       el cliente paga solo la diferencia.
     · inst = 2  → además el pasaje va completo, también en avión.
     · inst = 0  → ese equipo no da para regalar el viaje.
   Manda el equipo más alto del pedido: basta con que uno lo alcance.

   Si ningún equipo trae inst (catálogo viejo, o filas sin precio de
   proveedor), se usa la regla de siempre por monto del pedido, que es el
   equivalente público de la utilidad.

   Lo que pase de los días o las personas incluidas se cobra normal: sin
   ese borde, «incluido» sería un cheque en blanco. */
function vcNivelInst(items){
  let hay = false, n = 0;
  (items || []).forEach(x => {
    const v = x && x.p ? x.p.inst : undefined;
    if(v === undefined || v === null) return;
    hay = true;
    if(Number(v) > n) n = Number(v);
  });
  return hay ? n : null;              // null = el catálogo no lo dice
}
function vcIncluido(base, s, T, nivel){
  const R = VCOT_TERM.instalacionIncluida || {};
  if(!R.desde || !s.ciudad) return null;
  if(nivel === null || nivel === undefined){ if(base < R.desde) return null; }
  else if(!nivel) return null;
  const diasC = Math.min(s.dias, Math.max(0, Number(R.diasIncluidos) || 0));
  const persC = Math.min(s.personas, Math.max(0, Number(R.personasIncluidas) || 0));
  if(!diasC || !persC) return null;
  const nochesC = Math.max(0, Math.min(s.noches, diasC - 1));
  const unitario = s.personas ? s.pasaje / s.personas : 0;
  const entero = (nivel === null || nivel === undefined)
    ? base >= (R.desdePasajeCompleto || Infinity)
    : nivel >= 2;
  const tope = entero ? unitario : Math.min(unitario, Number(R.topePasaje) || 0);
  const cub = {
    personal: (T.personalDia || 0) * diasC * persC,
    comida: (T.viaticoDia || 0) * diasC * persC,
    hospedaje: (T.hospedajeNoche || 0) * nochesC * persC,
    pasaje: tope * persC
  };
  cub.total = cub.personal + cub.comida + cub.hospedaje + cub.pasaje;
  cub.todo = cub.total >= s.personal + s.viatico + s.pasaje;
  cub.pasajeEntero = tope >= unitario;
  cub.dias = diasC; cub.personas = persC;
  return cub.total > 0 ? cub : null;
}

function vcServicio(base, items){
  const T = vcTarifas();
  const dias = Math.max(1, Number(VCOT_SRV.dias) || 1);
  const per = Math.max(1, Number(VCOT_SRV.personas) || 1);
  const ciudad = (typeof ciudadDe === 'function') ? ciudadDe(VCOT_SRV.ciudad) : null;
  if(!VCOT_SRV.fuera) return {hay: false, total: 0, dias: dias, personas: per, falta: false};
  /* Un trabajo de un día no tiene noche: se sale temprano y se vuelve. */
  const noches = Math.max(0, dias - 1);
  const pasaje = ciudad && typeof pasajeDe === 'function' ? pasajeDe(ciudad.n) * per : 0;
  const personal = (T.personalDia || 0) * dias * per;
  const comida = (T.viaticoDia || 0) * dias * per;
  const hospedaje = (T.hospedajeNoche || 0) * noches * per;
  const viatico = comida + hospedaje;
  const s = {hay: true, ciudad: ciudad, falta: !ciudad, dias: dias, personas: per, noches: noches,
             personal: personal, pasaje: pasaje, comida: comida, hospedaje: hospedaje,
             viatico: viatico, bruto: personal + pasaje + viatico};
  s.inc = vcIncluido(Number(base) || 0, s, T, vcNivelInst(items));
  s.dto = s.inc ? Math.min(s.inc.total, s.bruto) : 0;
  s.total = s.bruto - s.dto;
  return s;
}

/* ── Carrito ────────────────────────────────────────────────────────── */
const vcProducto = id => ((VENTA && VENTA.productos) || []).find(p => p.id === id);
const vcCuenta = () => (window.SBCarrito ? SBCarrito.cuenta() : 0);

function vcAgregar(id, cuantos){
  const p = vcProducto(id);
  if(window.SBCarrito) SBCarrito.agregar(id, p ? {
    nom: p.nom, mm: [p.marca, p.modelo].filter(Boolean).join(' '),
    nts: vCod(p), precio: Number(p.precio || 0), foto: vFoto(p, 0, true) || ''
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
  const equipos = items.reduce((s, x) => s + x.total, 0);
  const srv = vcServicio(equipos, items);
  const sinPrecio = items.filter(x => !x.precio).length;
  return {items, equipos, srv, total: equipos + srv.total, sinPrecio,
          unidades: items.reduce((s, x) => s + x.q, 0)};
}

/* ── Página ─────────────────────────────────────────────────────────── */
/* Lista que había antes de que un enlace empezara una nueva, para poder
   recuperarla de un toque. Solo vive mientras la pestaña está abierta. */
var VC_ANTES = null;

/* #/cotizar-venta/<id>: el enlace que viaja en el mensaje de WhatsApp de
   cada ficha. Empieza una lista NUEVA con ese equipo, no lo suma a la que
   hubiera: quien abre ese enlace casi siempre está atendiendo a un cliente
   distinto cada vez, y arrastrar el pedido anterior los mezclaría. Lo que
   había se guarda y se puede recuperar. */
function vcSoloEste(id){
  const g = vcItems(), ids = Object.keys(g);
  if(ids.length === 1 && ids[0] === id) return;      // ya está así: no se toca
  VC_ANTES = ids.length ? g : null;
  if(window.SBCarrito) SBCarrito.vaciar();
  vcAgregar(id, 1);
}
function vcDeshacer(){
  if(!VC_ANTES || !window.SBCarrito) return;
  SBCarrito.poner(VC_ANTES); VC_ANTES = null; vcPintarTodo();
}

function vcAbrir(id){
  /* La página ya tiene su botón de WhatsApp: el verde flotante sobraba y
     encima tapaba el formulario. */
  document.body.classList.add('wa-propio');
  if(id){
    /* Con el catálogo cargado, el equipo entra con nombre, precio y foto;
       sin él entraría como un código suelto. */
    const poner = () => { vcSoloEste(id); vcPintarTodo(); };
    if(VENTA && VENTA.productos) poner();
    else if(typeof cargarVenta === 'function') cargarVenta().then(poner).catch(poner);
    else poner();
  }
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
        ${VC_ANTES ? `<p class="vc-nueva">Empezamos una lista nueva con este equipo.
          <button type="button" onclick="vcDeshacer()">Recuperar la lista anterior</button></p>` : ''}
        <div class="cot-paso uno"><b>1</b> Tus equipos <i>${c.unidades} ${c.unidades === 1 ? 'unidad' : 'unidades'}</i></div>
        <div class="vc-lista">${c.items.map(vcFila).join('')}</div>
        <button type="button" class="cot-limpiar" onclick="vcVaciar()">Vaciar la lista</button>
        ${vcBloqueServicio(c.srv)}
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
        ${vcDesglose(c.srv)}
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
          <!-- Correo y teléfono, plegados: por WhatsApp el número ya viaja
               solo, y tres campos a la vista parecían trabajo. Quien
               prefiere correo los abre; al resto no le estorban. -->
          <details class="vc-mas"${VCOT_DATOS.mail || VCOT_DATOS.tel ? ' open' : ''}>
            <summary>Agregar correo y teléfono (opcional)</summary>
            <div class="cot-f2">
              <label>Correo<input id="vcMail" type="email" autocomplete="email" inputmode="email" placeholder="correo@ejemplo.com"></label>
              <label>Teléfono<input id="vcTel" type="tel" autocomplete="tel" inputmode="tel" placeholder="999 999 999"></label>
            </div>
          </details>
          <label>¿Algo que debamos saber?<textarea id="vcMsg" rows="2" placeholder="Para qué área, si es para un expediente, fechas…"></textarea></label>
          <div class="form-msg" id="vcAviso" role="status" aria-live="polite"></div>
          <p class="cot-mail">Con tu nombre basta: toca «Enviar mi pedido por WhatsApp».
            ¿Prefieres correo? <button type="button" onclick="vcEnviar('correo')">Enviar por correo</button>
            · <button type="button" onclick="vcCopiar()">Copiar el mensaje</button></p>
        </div>
        <p class="cot-nota">Entrega en Lima. A provincia se envía por agencia de transporte; el envío
          lo contrata y lo paga el cliente.</p>
      </aside>
    </div>`;
  vcRestaurar();
}

/* El bloque de «¿dónde se instala y capacita?», debajo de los equipos.
   Cerrado no estorba a quien compra para Lima; abierto pide lo justo:
   ciudad, días y cuántas personas viajan. */
function vcBloqueServicio(s){
  const ciudades = (typeof CIUDADES !== 'undefined' ? CIUDADES : []);
  const zonas = (typeof VIAJE_ZONAS !== 'undefined' ? VIAJE_ZONAS : {});
  const grupos = Object.keys(zonas).map(z => {
    const l = ciudades.filter(x => String(x.z) === String(z));
    if(!l.length) return '';
    return `<optgroup label="${vEsc(zonas[z])}">${l.map(x =>
      `<option${x.n === VCOT_SRV.ciudad ? ' selected' : ''}>${vEsc(x.n)}</option>`).join('')}</optgroup>`;
  }).join('');
  return `<div class="vc-srv">
    <div class="cot-paso"><b>+</b> Instalación y capacitación</div>
    <div class="cot-seg">
      <button type="button" class="${s.hay ? '' : 'on'}" onclick="vcFuera(false)">En Lima Metropolitana</button>
      <button type="button" class="${s.hay ? 'on' : ''}" onclick="vcFuera(true)">Fuera de Lima</button>
    </div>
    ${!s.hay
      ? '<p class="cot-ayuda">La entrega, la instalación y la capacitación de uso en Lima Metropolitana van incluidas, sin costo.</p>'
      : `<div class="vc-srv-f">
          <label>¿A qué ciudad?
            <select onchange="vcSrv('ciudad', this.value)">
              <option value="">Elige la ciudad…</option>${grupos}
            </select></label>
          <label>Días en sitio
            <input type="number" min="1" step="1" value="${s.dias}" onchange="vcSrv('dias', this.value)"></label>
          <label>Personas
            <input type="number" min="1" max="4" step="1" value="${s.personas}" onchange="vcSrv('personas', this.value)"></label>
        </div>
        ${s.falta ? '<p class="cot-ayuda vc-falta">Elige la ciudad para calcular el pasaje.</p>'
          : s.inc ? `<p class="cot-ayuda vc-ok">Por el monto de tu pedido, ${s.inc.todo
              ? 'este servicio va <b>incluido, sin costo</b>.'
              : 'cubrimos <b>' + vSoles(s.dto) + '</b> de este servicio.'}</p>`
          : '<p class="cot-ayuda">El pasaje se calcula por la distancia a Lima; los viáticos, por día de trabajo y por noche fuera.</p>'}`}
  </div>`;
}

/* El desglose, con las mismas partidas que el simulador de alquiler: así
   el cliente ve de dónde sale cada sol y no parece un recargo suelto. */
function vcDesglose(s){
  if(!s.hay || s.falta) return '';
  const T = vcTarifas(), f = n => Number(n || 0).toLocaleString('es-PE');
  const ciu = s.ciudad ? s.ciudad.n : '';
  const inc = s.inc;
  return `<div class="cot-cuenta vc-desg${inc ? ' vc-regalo' : ''}">
    <div class="vc-desg-t">Servicio fuera de Lima Metropolitana${ciu ? ', en ' + vEsc(ciu) : ''}</div>
    <div class="sub"><span>Personal calificado · S/ ${f(T.personalDia)} × ${s.dias} ${s.dias === 1 ? 'día' : 'días'}${
      s.personas > 1 ? ' × ' + s.personas + ' personas' : ''}</span><span>${vSoles(s.personal)}</span></div>
    <div class="sub"><span>Pasajes ida y vuelta${s.personas > 1 ? ' × ' + s.personas : ''}</span><span>${vSoles(s.pasaje)}</span></div>
    <div class="sub"><span>Viáticos · comida S/ ${f(T.viaticoDia)} × ${s.dias}${
      s.noches ? ' · hospedaje S/ ' + f(T.hospedajeNoche) + ' × ' + s.noches + (s.noches === 1 ? ' noche' : ' noches') : ''
    }</span><span>${vSoles(s.viatico)}</span></div>
    ${inc ? `<div class="sub vc-dto"><span>Incluido por Sinergia${
      inc.todo ? '' : ' · ' + inc.dias + (inc.dias === 1 ? ' día' : ' días') +
        (inc.pasajeEntero ? ' y el pasaje completo' : ' y hasta S/ ' + f((VCOT_TERM.instalacionIncluida || {}).topePasaje) + ' de pasaje')
    }</span><span>− ${vSoles(s.dto)}</span></div>` : ''}
    <div class="gran"><span>Total del servicio</span><span>${vSoles(s.total)}</span></div>
  </div>`;
}

function vcFuera(si){ VCOT_SRV.fuera = !!si; vcPintarTodo(); }
function vcSrv(k, v){
  VCOT_SRV[k] = (k === 'ciudad') ? v : Math.max(1, parseInt(v, 10) || 1);
  vcPintarTodo();
}

/* Pedir mas unidades de las que hay: antes seguia diciendo «En stock» y
   cotizaba igual. Ahora se avisa que es un pedido especial. */
function vcSobraStock(p, q){
  const n = Number(p && p.stock);
  return n > 0 && Number(q) > n ? n : 0;
}
function vcAviso(p, q){
  const n = vcSobraStock(p, q);
  return n ? `<span class="v-stock v-pedido">Pedido especial · ${n} en stock</span>` : '';
}

function vcFila(x){
  const p = x.p, foto = x.foto;
  return `<div class="vc-i">
    ${foto ? `<img class="vc-f" src="${vEsc(foto)}" alt="" loading="lazy" decoding="async">` : '<span class="vc-f sin"></span>'}
    <div class="vc-n">
      <b>${vEsc(p.nom)}</b>
      <small>${vEsc([p.marca, p.modelo].filter(Boolean).join(' '))}${vCodTxt(p) ? ' · ' + vEsc(vCodTxt(p)) : ''}</small>
      ${vcAviso(p, x.q) || (p.stock != null ? vStock(p) : '')}
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
    /* Nombre, marca y código NTS viajan siempre dentro del enlace: son
       cortos y hacen que el resumen se lea aunque el equipo ya no esté en
       la hoja. La foto no: esa es larga y se saca del catálogo, que para
       eso se carga al abrir el enlace (cotConCatalogo). */
    items: c.items.map(x => ({
      i: x.p.id, q: x.q, pu: x.precio, t: x.total,
      n: x.p.nom,
      m: [x.p.marca, x.p.modelo].filter(Boolean).join(' · '),
      nts: vCod(x.p)
    })),
    /* El servicio fuera de Lima, con sus partidas separadas: el documento
       lo imprime como filas propias del cuadro, igual que el alquiler. */
    srv: c.srv.hay && !c.srv.falta ? {
      ciu: c.srv.ciudad ? c.srv.ciudad.n : '', dias: c.srv.dias, per: c.srv.personas,
      noc: c.srv.noches, pers: c.srv.personal, pas: c.srv.pasaje, via: c.srv.viatico,
      dto: c.srv.dto || 0
    } : null,
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
    nts: p ? vCod(p) : (e.nts || ''),
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
  L.push(['6. Incluye.', T.incluye + ' La instalación, la puesta en funcionamiento y la capacitación ' +
    'de uso en Lima Metropolitana no tienen costo adicional.']);
  if(d && d.srv){
    L.push(['7. Servicio fuera de Lima Metropolitana' + (d.srv.ciu ? ', en ' + d.srv.ciu : '') + '.',
      'Comprende el traslado del personal calificado, su permanencia por ' + d.srv.dias +
      (d.srv.dias === 1 ? ' día' : ' días') + ' en sitio' + (d.srv.per > 1 ? ' (' + d.srv.per + ' personas)' : '') +
      ', la instalación, la puesta en funcionamiento y la capacitación del personal del cliente. ' +
      'Se detalla por partidas en el Cuadro N° 1: personal calificado, pasajes de ida y vuelta y viáticos ' +
      '(alimentación por día de trabajo y hospedaje por noche fuera).' +
      (d.srv.dto ? ' Por el monto de esta cotización, ' + (d.srv.dto >= (d.srv.pers + d.srv.pas + d.srv.via)
        ? 'este servicio va incluido sin costo.'
        : 'Sinergia asume S/ ' + Number(d.srv.dto).toFixed(2) + ' de este servicio.') : '') +
      ' El envío de los equipos a provincia se realiza por agencia de transporte y su costo lo asume el cliente.']);
  }
  L.push([(d && d.srv ? '8' : '7') + '. Forma de pago.', T.pago]);
  L.push([(d && d.srv ? '9' : '8') + '. Comprobante.', 'Se emite factura electrónica a nombre de la razón social indicada por el cliente.']);
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
    const hay = vcSobraStock(x.p, x.q);
    L.push((i + 1) + '. ' + x.p.nom + ' · ' + [x.p.marca, x.p.modelo].filter(Boolean).join(' ') +
           (x.q > 1 ? ' × ' + x.q : '') + ' · ' + vSoles(x.total) +
           (hay ? '  [PEDIDO ESPECIAL: en stock ' + hay + ']' : ''));
  });
  if(c.srv.hay && !c.srv.falta){
    L.push('');
    L.push('SERVICIO FUERA DE LIMA METROPOLITANA' + (c.srv.ciudad ? ', EN ' + c.srv.ciudad.n.toUpperCase() : ''));
    L.push('  Personal calificado (' + c.srv.dias + (c.srv.dias === 1 ? ' día' : ' días') +
           (c.srv.personas > 1 ? ' × ' + c.srv.personas + ' personas' : '') + '): ' + vSoles(c.srv.personal));
    L.push('  Pasajes ida y vuelta: ' + vSoles(c.srv.pasaje));
    L.push('  Viáticos (comida y hospedaje): ' + vSoles(c.srv.viatico));
    if(c.srv.dto) L.push('  Incluido por Sinergia: − ' + vSoles(c.srv.dto));
    L.push('  Subtotal del servicio: ' + vSoles(c.srv.total));
  }
  L.push('');
  L.push('  TOTAL REFERENCIAL (IGV incluido): ' + vSoles(c.total));
  if(d.msg){ L.push(''); L.push('NOTA DEL CLIENTE'); L.push('  ' + d.msg); }
  L.push('');
  L.push('Entrega en Lima. A provincia, envío por agencia a cargo del cliente.');
  return L.join('\n');
}

/* El enlace del resumen, aligerado si hace falta (ver vcEnviar). */
function vcEnlaceCorto(c, d){
  const doc = vcDoc(c, d);
  let e = cotEnlace(doc);
  if(e.length > VCOT_ENLACE_MAX){
    doc.items = doc.items.map(it => vcProducto(it.i) ? {i: it.i, q: it.q, pu: it.pu, t: it.t} : it);
    e = cotEnlace(doc);
  }
  return e;
}

function vcEnviar(via){
  const c = vcCalcular();
  if(!c.items.length) return;
  const d = vcDatos();
  /* Por WhatsApp el número del cliente viaja solo: pedirle además un
     correo o un teléfono era pedir dos veces lo mismo. Basta el nombre.
     Por correo sí hace falta el correo, que si no, no hay a dónde
     responder. */
  const vale = (f, x) => typeof window[f] !== 'function' || window[f](x);
  let error = '';
  if(!d.nom || d.nom.length < 2) error = 'Escribe tu nombre o el de la institución.';
  else if(via === 'correo' && !d.mail) error = 'Para enviarlo por correo, escribe tu correo.';
  else if(d.mail && !vale('correoValido', d.mail)) error = 'Revisa el correo: parece incompleto.';
  else if(d.tel && !vale('telefonoValido', d.tel)) error = 'Revisa el teléfono: faltan dígitos.';
  if(error){
    const f = document.getElementById('vcForm');
    if(f) f.scrollIntoView({behavior: 'smooth', block: 'center'});
    avisar('vcAviso', error, 'err');
    const det = document.querySelector('.vc-mas');
    if(det && /correo|teléfono/i.test(error)) det.open = true;
    const el = document.getElementById(!d.nom ? 'vcNom' : 'vcMail');
    if(el) setTimeout(() => el.focus(), 350);
    return;
  }
  let doc = vcDoc(c, d);
  let enlace = cotEnlace(doc);
  /* El nombre, la marca y el código NTS viajan dentro del enlace para que un
     resumen viejo se lea aunque el equipo ya no esté en la hoja. Con veinte
     equipos eso dejaba el enlace en 3 700 caracteres y WhatsApp se atraganta.
     Si se pasa, se quitan de los equipos que SÍ están en el catálogo: esos se
     leen de ahí al abrir el enlace (cotConCatalogo). */
  if(enlace.length > VCOT_ENLACE_MAX){
    doc.items = doc.items.map(it => vcProducto(it.i) ? {i: it.i, q: it.q, pu: it.pu, t: it.t} : it);
    enlace = cotEnlace(doc);
  }
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
  const texto = vcTexto(c, d) + '\n\nResumen de este pedido:\n' + vcEnlaceCorto(c, d);
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
