/* =====================================================================
   13-cotizador.js — Cotizador de alquiler (#/cotizar)

   Una página propia donde el cliente arma su alquiler: marca los
   instrumentos que necesita, elige la modalidad y ve el total con todo
   lo que acordamos aplicado:

     · medio día (un turno de 4 h) solo en los instrumentos de S/ 100 el
       día a más; en los económicos, desde un día completo;
     · descuento por combinar varios instrumentos;
     · instrumentista aparte, con mínimo de medio día, cuando algún
       instrumento lo lleva;
     · garantía en depósito (se devuelve) cuando el cliente recoge los
       instrumentos en oficina y va sin instrumentista;
     · herramientas incluidas sin costo cuando va el instrumentista.

   #/cotizar/<id> entra con ese instrumento ya marcado: es a donde llevan
   los botones «Calcular mi alquiler» de las páginas de cada equipo.
   ===================================================================== */
var COT = {sel: new Set(), mod: 'medio', qty: 1, d1: '', d2: ''};

const cotEsc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c =>
  ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));

/* Instrumentos que se pueden cotizar (las complementarias van incluidas). */
const cotLista = () => EQUIPOS.filter(e => !esComplemento(e) && e.dia > 0);

function cotMarcar(id, on){
  on ? COT.sel.add(id) : COT.sel.delete(id);
  cotPintar();
}
function cotMod(m){ COT.mod = m; cotPintar(); }
function cotCantidad(v){ COT.qty = Math.max(1, parseInt(v, 10) || 1); cotResumen(); }
function cotFechas(){
  COT.d1 = (document.getElementById('cotD1') || {}).value || '';
  COT.d2 = (document.getElementById('cotD2') || {}).value || '';
  cotResumen();
}
function cotLimpiar(){ COT.sel.clear(); COT.qty = 1; COT.d1 = COT.d2 = ''; cotPintar(); }

/* ── Cálculo ──────────────────────────────────────────────────────────
   Una sola función con toda la cuenta, para que el resumen y el mensaje
   que se envía nunca puedan decir cosas distintas. */
function cotCalcular(){
  const sel = [...COT.sel].map(byId).filter(Boolean);
  const base = sel.reduce((s, e) => s + Number(e.dia || 0), 0);
  const desc = sel.length >= 4 ? (DESC_COMB['4'] || 0.15) : (DESC_COMB[String(sel.length)] || 0);
  const dia = Math.round(base * (1 - desc));
  /* Medio día: solo si TODOS los elegidos lo tienen. */
  const hayMedio = sel.length > 0 && sel.every(e => tieneMedio(e.dia));
  const mod = (COT.mod === 'medio' && !hayMedio) ? 'dia' : COT.mod;
  const unit = {medio: precioMedio(dia), dia: dia, semana: dia * 4, mes: dia * 12}[mod];
  /* Cantidad: por días, del calendario; en el resto, a mano. */
  let qty = COT.qty, fechasOk = true;
  if(mod === 'dia'){
    const a = new Date(COT.d1), b = new Date(COT.d2);
    if(COT.d1 && COT.d2 && !isNaN(a) && !isNaN(b) && b >= a) qty = Math.round((b - a) / 86400000) + 1;
    else { fechasOk = !!(COT.d1 || COT.d2) ? false : true; qty = COT.qty; }
  }
  const alquiler = unit * qty;
  /* Instrumentista: va si algún instrumento lo lleva. */
  const conTecnico = sel.some(e => !soloEquipo(e.id));
  const tunit = {medio: TEC_MIN, dia: TEC_DIA, semana: TEC_DIA * 4, mes: TEC_DIA * 12}[mod];
  const tecnico = conTecnico ? Math.max(TEC_MIN, tunit * qty) : 0;
  /* Garantía: solo cuando el cliente se los lleva sin instrumentista. */
  const garantia = conTecnico ? 0 : sel.reduce((s, e) => s + garantiaDe(e.id), 0);
  return {sel, base, desc, dia, mod, hayMedio, unit, qty, alquiler, conTecnico, tecnico,
          garantia, total: alquiler + tecnico, fechasOk};
}

const COT_MOD = [['medio', 'Medio día'], ['dia', 'Por día'], ['semana', 'Por semana'], ['mes', 'Por mes']];
const COT_UNI = {medio: 'medio día', dia: 'día', semana: 'semana', mes: 'mes'};
const COT_CANT = {medio: 'Turnos de medio día', dia: 'Días', semana: 'Semanas', mes: 'Meses'};

/* ── Página ─────────────────────────────────────────────────────────── */
function cotPintar(){
  const lista = document.getElementById('cotEq');
  if(!lista) return;
  const grupos = [['ansim', 'Analizadores y simuladores'], ['med', 'Instrumentos de medición'],
                  ['elec', 'Medidores eléctricos'], ['apoyo', 'Otros']];
  const eq = cotLista();
  const hechos = new Set();
  let html = '';
  grupos.forEach(([g, label]) => {
    const items = eq.filter(e => e.g === g);
    items.forEach(e => hechos.add(e.id));
    if(!items.length) return;
    html += `<div class="cot-g"><div class="cot-gh">${label}</div>` + items.map(cotFila).join('') + '</div>';
  });
  const resto = eq.filter(e => !hechos.has(e.id));
  if(resto.length) html += `<div class="cot-g"><div class="cot-gh">Otros</div>${resto.map(cotFila).join('')}</div>`;
  lista.innerHTML = html;
  cotResumen();
}

function cotFila(e){
  const marcado = COT.sel.has(e.id);
  const solo = soloEquipo(e.id);
  /* Se dice de frente si el instrumentista va o no: es lo que más cambia el
     precio y antes había que deducirlo. */
  const et = solo
    ? `<i class="solo">Lo recoges tú · sin instrumentista · garantía S/ ${fmt(garantiaDe(e.id))}</i>`
    : `<i class="tec">Va con instrumentista (se cobra aparte)</i>`;
  const foto = (typeof fotoURL === 'function' && (e.photo || (e.fotos || [])[0]))
    ? `<img class="cot-f" src="${fotoURL(e.photo || e.fotos[0], 160, true)}" alt="" loading="lazy" decoding="async">`
    : `<span class="cot-f sin"></span>`;
  const desde = tieneMedio(e.dia) ? `S/ ${fmt(precioMedio(e.dia))}<small>medio día</small>`
                                  : `S/ ${fmt(e.dia)}<small>día</small>`;
  return `<label class="cot-i${marcado ? ' on' : ''}">
    <input type="checkbox" ${marcado ? 'checked' : ''} onchange="cotMarcar('${e.id}',this.checked)">
    ${foto}
    <span class="cot-n"><b>${cotEsc(e.nom)}</b><small>${cotEsc(e.marca || '')}</small>${et}</span>
    <span class="cot-p">${desde}</span>
  </label>`;
}

function cotResumen(){
  const caja = document.getElementById('cotRes');
  if(!caja) return;
  const c = cotCalcular();
  const n = c.sel.length;
  document.getElementById('cotCuenta').textContent =
    n ? (n + (n === 1 ? ' instrumento elegido' : ' instrumentos elegidos')) : '';
  if(!n){
    caja.innerHTML = `<div class="cot-top vacio"><span>Tu cotización</span><b>— —</b></div>
      <p class="cot-vacio">Marca al menos un instrumento de la lista. Aquí aparece el total,
      y con un clic te llevas la cotización en PDF o nos escribes por WhatsApp.</p>`;
    return;
  }
  const sinMedio = c.sel.filter(e => !tieneMedio(e.dia));
  const mods = COT_MOD.filter(([m]) => m !== 'medio' || c.hayMedio);
  const seg = mods.map(([m, t]) =>
    `<button type="button" class="${c.mod === m ? 'on' : ''}" onclick="cotMod('${m}')">${t}</button>`).join('');
  const cant = c.mod === 'dia'
    ? `<div class="cot-f2">
         <label>Desde<input type="date" id="cotD1" value="${COT.d1}" oninput="cotFechas()" onchange="cotFechas()"></label>
         <label>Hasta<input type="date" id="cotD2" value="${COT.d2}" oninput="cotFechas()" onchange="cotFechas()"></label>
       </div>
       <p class="cot-ayuda">${COT.d1 && COT.d2
          ? `Son <b>${c.qty} ${c.qty === 1 ? 'día' : 'días'}</b>.`
          : 'Elige las fechas. Mientras tanto se calcula <b>1 día</b>.'}</p>`
    : `<label class="cot-f1">${COT_CANT[c.mod]}<input type="number" min="1" step="1" value="${c.qty}"
         oninput="cotCantidad(this.value)" onchange="cotCantidad(this.value)"></label>`;
  const inc = c.conTecnico ? incluidos('') : [];
  const u = COT_UNI[c.mod];
  /* Lo primero que se ve: el total y los dos botones. El detalle queda
     debajo, para quien quiera revisarlo. */
  caja.innerHTML = `
    <div class="cot-top">
      <span>Tu cotización · ${c.qty} ${c.qty === 1 ? u : (u === 'mes' ? 'meses' : u + 's')}</span>
      <b>S/ ${c.total.toFixed(2)}</b>
      <small>IGV incluido${c.garantia ? ' · + S/ ' + fmt(c.garantia) + ' de garantía que se devuelve' : ''}</small>
      <div class="cot-acc">
        <button class="btn btn-fill" onclick="cotEnviar('whatsapp')">Pedirla por WhatsApp</button>
        <button class="btn" onclick="cotPDF()">Ver / descargar PDF</button>
      </div>
    </div>

    <div class="cot-paso"><b>2</b> ¿Por cuánto tiempo?</div>
    <div class="cot-seg">${seg}</div>
    ${c.mod === 'medio'
      ? `<p class="cot-ayuda">Un turno de 4 h: ${HORARIO_MANANA} o ${HORARIO_TARDE}.</p>`
      : (sinMedio.length ? `<p class="cot-ayuda">No hay medio día porque ${sinMedio.length === 1
            ? 'el ' + cotEsc(sinMedio[0].nom.toLowerCase()) + ' se alquila' : 'algunos se alquilan'} desde un día completo.</p>` : '')}
    ${cant}

    <div class="cot-paso"><b>3</b> El detalle</div>
    <ul class="cot-sel">${c.sel.map(e =>
      `<li><span>${cotEsc(e.nom)}</span><span>S/ ${fmt(e.dia)}</span></li>`).join('')}
      ${c.desc ? `<li class="des"><span>Descuento por combinar ${n} (${Math.round(c.desc * 100)} %)</span><span>− S/ ${fmt(Math.round(c.base * c.desc))}</span></li>` : ''}
    </ul>
    <div class="cot-cuenta">
      <div><span>Precio por ${u}</span><span>S/ ${fmt(c.unit)}</span></div>
      <div><span>× ${c.qty} ${c.qty === 1 ? u : (u === 'mes' ? 'meses' : u + 's')}</span><span>S/ ${c.alquiler.toFixed(2)}</span></div>
      ${c.conTecnico ? `<div><span>Instrumentista metrológico (mínimo medio día)</span><span>S/ ${c.tecnico.toFixed(2)}</span></div>` : ''}
      <div class="fino"><span>Incluye IGV 18 %</span><span>S/ ${(c.alquiler / 1.18 * 0.18).toFixed(2)}</span></div>
    </div>
    ${c.garantia ? `<p class="cot-aviso"><b>Además dejas S/ ${fmt(c.garantia)} de garantía.</b>
      No es un cobro: se te devuelve cuando regreses el equipo. Lo recoges en nuestra oficina con tu DNI.</p>` : ''}
    ${inc.length ? `<p class="cot-aviso ok"><b>Incluido sin costo:</b> ${inc.map(x => cotEsc(x.nom)).join(' · ')}.</p>` : ''}

    <div class="cot-paso"><b>4</b> Tus datos</div>
    <div class="cot-form" id="cotForm">
      <label>Nombre o institución<input id="cotNom" type="text" autocomplete="organization" placeholder="Clínica, hospital o nombre"></label>
      <div class="cot-f2">
        <label>Correo<input id="cotMail" type="email" autocomplete="email" inputmode="email" placeholder="correo@ejemplo.com"></label>
        <label>Teléfono<input id="cotTel" type="tel" autocomplete="tel" inputmode="tel" placeholder="999 999 999"></label>
      </div>
      <div class="form-msg" id="cotAviso" role="status" aria-live="polite"></div>
      <div class="cot-btns">
        <button class="btn btn-fill" onclick="cotEnviar('whatsapp')">Enviar por WhatsApp</button>
        <button class="btn" onclick="cotEnviar('correo')">Enviar por correo</button>
      </div>
    </div>
    <p class="cot-nota">Entrega y devolución en nuestra oficina de Lima. A provincias se envía por agencia; el envío lo paga el cliente.</p>
    <button type="button" class="cot-limpiar" onclick="cotLimpiar()">Empezar de nuevo</button>`;
  cotRestaurar();
}

/* El resumen se repinta entero en cada cambio; sin esto, lo que el cliente
   ya escribió en el formulario se borraría al marcar otro instrumento. */
var COT_DATOS = {nom: '', mail: '', tel: ''};
function cotRestaurar(){
  [['cotNom', 'nom'], ['cotMail', 'mail'], ['cotTel', 'tel']].forEach(([id, k]) => {
    const el = document.getElementById(id);
    if(!el) return;
    el.value = COT_DATOS[k] || '';
    el.oninput = () => { COT_DATOS[k] = el.value; };
  });
}

/* Mensaje de la solicitud: numerado y con el detalle de cada instrumento,
   para que se pueda pasar tal cual a la cotización formal. */
function cotTexto(c, nom, mail, tel){
  const u = COT_UNI[c.mod], uq = c.qty === 1 ? u : (u === 'mes' ? 'meses' : u + 's');
  const L = [];
  L.push('SOLICITUD DE ALQUILER — ' + ((typeof SITE !== 'undefined' && SITE.nombre) || 'Sinergia Biomédica'));
  L.push('N.º ' + cotNumero() + ' · ' + new Date().toLocaleDateString('es-PE'));
  L.push('');
  L.push('CLIENTE');
  L.push('  Nombre: ' + (nom || '—'));
  if(mail) L.push('  Correo: ' + mail);
  if(tel)  L.push('  Teléfono: ' + tel);
  L.push('');
  L.push('PERIODO: ' + c.qty + ' ' + uq + (c.mod === 'medio' ? ' (turnos de 4 h)' : ''));
  if(c.mod === 'dia' && COT.d1 && COT.d2) L.push('  Del ' + COT.d1 + ' al ' + COT.d2);
  L.push('');
  L.push('INSTRUMENTOS');
  c.sel.forEach((e, i) => {
    L.push((i + 1) + '. ' + e.nom);
    L.push('   ' + (e.marca || '') + ' · S/ ' + fmt(e.dia) + ' por día');
  });
  L.push('');
  L.push('CUENTA');
  if(c.desc) L.push('  Suma por día: S/ ' + fmt(c.base));
  if(c.desc) L.push('  Descuento por combinar ' + c.sel.length + ': −' + Math.round(c.desc * 100) + ' % (S/ ' + fmt(Math.round(c.base * c.desc)) + ')');
  L.push('  Precio por ' + u + ': S/ ' + fmt(c.unit));
  L.push('  Alquiler (' + c.qty + ' ' + uq + '): S/ ' + c.alquiler.toFixed(2));
  if(c.conTecnico) L.push('  Instrumentista metrológico: S/ ' + c.tecnico.toFixed(2));
  L.push('  TOTAL (IGV incluido): S/ ' + c.total.toFixed(2));
  if(c.garantia) L.push('  Garantía en depósito (se devuelve): S/ ' + fmt(c.garantia));
  const inc = c.conTecnico ? incluidos('') : [];
  if(inc.length){ L.push(''); L.push('INCLUIDO SIN COSTO'); inc.forEach(x => L.push('  · ' + x.nom)); }
  L.push('');
  L.push('Entrega en oficina (Lima). A provincias, envío por agencia a cargo del cliente.');
  return L.join('\n');
}

/* Número correlativo visible, para que el cliente y nosotros hablemos del
   mismo documento: COT-AAMMDD-HHMM. */
function cotNumero(){
  const d = new Date(), p = n => String(n).padStart(2, '0');
  return 'COT-' + String(d.getFullYear()).slice(2) + p(d.getMonth() + 1) + p(d.getDate())
         + '-' + p(d.getHours()) + p(d.getMinutes());
}

function cotDatos(){
  const v = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  return {nom: v('cotNom') || COT_DATOS.nom, mail: v('cotMail') || COT_DATOS.mail, tel: v('cotTel') || COT_DATOS.tel};
}

function cotEnviar(via){
  const c = cotCalcular();
  if(!c.sel.length) return;
  const {nom, mail, tel} = cotDatos();
  const error = (typeof validarContacto === 'function') ? validarContacto(nom, mail, tel) : '';
  if(error){
    const f = document.getElementById('cotForm');
    if(f) f.scrollIntoView({behavior: 'smooth', block: 'center'});
    avisar('cotAviso', error, 'err');
    const el = document.getElementById('cotNom'); if(el && !nom) setTimeout(() => el.focus(), 350);
    return;
  }
  const texto = cotTexto(c, nom, mail, tel);
  if(typeof enviarAlEndpoint === 'function')
    enviarAlEndpoint({tipo: 'cotizador', equipo: c.sel.map(e => e.nom).join(' + '), modalidad: c.mod,
                      total: 'S/ ' + c.total.toFixed(2), nombre: nom, correo: mail, telefono: tel});
  avisar('cotAviso', via === 'correo'
    ? 'Abriendo tu correo con la solicitud lista para enviar…'
    : 'Abriendo WhatsApp con la solicitud lista para enviar…', 'ok');
  abrirCanal(via, texto, 'Solicitud de alquiler');
}

/* ── Cotización formal ───────────────────────────────────────────────
   Mismo formato que las cotizaciones que ya emite la empresa (el modelo
   de COTIZADOR_SALCEDO): cabecera con número y fecha, bloque de datos,
   saludo, CUADRO N° 1, subtotal/IGV/total, monto en letras, condiciones
   comerciales y datos generales. Se arma en una ventana y se manda a
   imprimir: el navegador ofrece «Guardar como PDF». */

/* Monto en letras, como lo pide el formato: SON: ... CON xx/100 SOLES. */
const COT_UNI_L = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ',
  'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
const COT_DEC_L = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const COT_CEN_L = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS',
  'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
function cotLetras(n){
  n = Math.floor(n);
  if(n === 0) return 'CERO';
  if(n === 100) return 'CIEN';
  if(n < 20) return COT_UNI_L[n];
  if(n < 100){
    const d = Math.floor(n / 10), u = n % 10;
    if(d === 2) return u ? 'VEINTI' + COT_UNI_L[u].toLowerCase().toUpperCase() : 'VEINTE';
    return COT_DEC_L[d] + (u ? ' Y ' + COT_UNI_L[u] : '');
  }
  if(n < 1000){
    const c = Math.floor(n / 100), r = n % 100;
    return COT_CEN_L[c] + (r ? ' ' + cotLetras(r) : '');
  }
  if(n < 1000000){
    const m = Math.floor(n / 1000), r = n % 1000;
    return (m === 1 ? 'MIL' : cotLetras(m) + ' MIL') + (r ? ' ' + cotLetras(r) : '');
  }
  const m = Math.floor(n / 1000000), r = n % 1000000;
  return (m === 1 ? 'UN MILLON' : cotLetras(m) + ' MILLONES') + (r ? ' ' + cotLetras(r) : '');
}
function cotMontoLetras(v){
  const ent = Math.floor(v + 1e-9), cts = Math.round((v - ent) * 100);
  return 'SON: ' + cotLetras(ent) + ' CON ' + String(cts).padStart(2, '0') + '/100 SOLES';
}

/* Las condiciones comerciales del alquiler, en el mismo formato de pares
   etiqueta : texto que usa la cotización de la empresa. */
function cotCondiciones(c){
  const u = COT_UNI[c.mod], uq = c.qty === 1 ? u : (u === 'mes' ? 'meses' : u + 's');
  const L = [
    ['PRECIO DE LA OFERTA', 'COTIZACIÓN EN SOLES (PEN), CON IGV INCLUIDO. COMPRENDE EL ALQUILER DE LOS INSTRUMENTOS POR ' +
      (c.qty + ' ' + uq).toUpperCase() + (c.conTecnico ? ' Y EL SERVICIO DE INSTRUMENTISTA METROLÓGICO.' : '.')],
    ['VIGENCIA DE LA OFERTA', '15 DÍAS CALENDARIO CONTADOS DESDE LA RECEPCIÓN DE NUESTRA COTIZACIÓN.'],
    ['CALIBRACIÓN', 'TODOS LOS INSTRUMENTOS SE ENTREGAN CON SU CERTIFICADO DE CALIBRACIÓN VIGENTE, EMITIDO POR LABORATORIO ACREDITADO.'],
    ['MODALIDAD', c.mod === 'medio'
      ? ('MEDIO DÍA ES UN TURNO DE 4 HORAS (' + HORARIO_MANANA + ' O ' + HORARIO_TARDE + ').').toUpperCase()
      : ('EL DÍA COMPLETO COMPRENDE LOS DOS TURNOS (' + HORARIO_MANANA + ' Y ' + HORARIO_TARDE + ').').toUpperCase()],
    ['LUGAR DE ENTREGA', 'ENTREGA Y DEVOLUCIÓN EN NUESTRA OFICINA DE LIMA. A PROVINCIAS SE ENVÍA POR AGENCIA; EL ENVÍO LO ASUME EL CLIENTE.']
  ];
  if(c.conTecnico)
    L.push(['INSTRUMENTISTA METROLÓGICO', 'SE COBRA APARTE, CON UN MÍNIMO DE MEDIO DÍA. INCLUYE EL MANEJO DEL INSTRUMENTO Y EL REGISTRO DE LAS MEDICIONES.']);
  else
    L.push(['GARANTÍA EN DEPÓSITO', 'S/ ' + fmt(c.garantia) + '. NO ES UN COBRO: SE DEVUELVE AL RETORNAR LOS INSTRUMENTOS EN BUEN ESTADO. SE ENTREGAN CONTRA PRESENTACIÓN DE DNI.']);
  const inc = c.conTecnico ? incluidos('') : [];
  if(inc.length) L.push(['INCLUIDO SIN COSTO', inc.map(x => x.nom).join(' · ').toUpperCase() + '.']);
  L.push(['FORMA DE PAGO', 'ÍNTEGRO A LA ENTREGA DE LOS INSTRUMENTOS, SALVO ACUERDO DISTINTO POR ESCRITO.']);
  L.push(['OBSERVACIONES', 'NO INCLUYE TRASLADOS FUERA DE LIMA METROPOLITANA NI CONSUMIBLES DEL CLIENTE.']);
  return L;
}

function cotHTML(c, nom, mail, tel, numero){
  const S = (typeof SITE !== 'undefined') ? SITE : {};
  const u = COT_UNI[c.mod], uq = c.qty === 1 ? u : (u === 'mes' ? 'meses' : u + 's');
  const und = (c.mod === 'medio' ? 'MEDIO DÍA' : u.toUpperCase());
  const hoy = new Date().toLocaleDateString('es-PE');
  /* El precio unitario del cuadro es el de cada instrumento prorrateado:
     así la suma del cuadro cuadra exactamente con el total. */
  const factor = c.base ? c.unit / c.base : 0;
  const filas = c.sel.map((e, i) => {
    const pu = e.dia * factor, st = pu * c.qty;
    return `<tr>
      <td class="c">${i + 1}</td><td class="c">${c.qty}</td><td class="c">${und}</td>
      <td><b>${cotEsc(e.nom.toUpperCase())}</b><br>- MARCA: ${cotEsc((e.marca || '—').split('·')[0].trim().toUpperCase())}<br>- PROCEDENCIA: ${cotEsc(((e.marca || '').split('·')[1] || '—').trim().toUpperCase())}<br>- CON CERTIFICADO DE CALIBRACIÓN VIGENTE</td>
      <td class="d">${pu.toFixed(2)}</td><td class="d">${st.toFixed(2)}</td></tr>`;
  }).join('') + (c.conTecnico ? `<tr>
      <td class="c">${c.sel.length + 1}</td><td class="c">${c.qty}</td><td class="c">${und}</td>
      <td><b>INSTRUMENTISTA METROLÓGICO</b><br>- MANEJO DEL INSTRUMENTO Y REGISTRO DE MEDICIONES<br>- MÍNIMO MEDIO DÍA</td>
      <td class="d">${(c.tecnico / c.qty).toFixed(2)}</td><td class="d">${c.tecnico.toFixed(2)}</td></tr>` : '');
  const cond = cotCondiciones(c).map(([k, v]) =>
    `<tr><th>${cotEsc(k)}</th><td class="dp">:</td><td>${cotEsc(v).replace(/\n/g, '<br>')}</td></tr>`).join('');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
  <title>Cotización ${numero}</title><style>
    *{box-sizing:border-box}
    body{margin:0;padding:16mm 14mm;font:11px/1.45 Arial,Helvetica,sans-serif;color:#000}
    .mem{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;
      border-bottom:3px solid #1F3864;padding-bottom:8px;margin-bottom:10px}
    .mem b{font-size:15px;letter-spacing:-.2px}
    .mem small{display:block;color:#444;font-size:10px;line-height:1.5}
    h1{margin:10px 0 2px;text-align:center;font-size:15px;letter-spacing:.5px}
    .fecha{text-align:right;font-size:11px;margin-bottom:10px}
    table.dat{border-collapse:collapse;font-size:11px;margin-bottom:10px}
    table.dat th{text-align:left;font-weight:bold;width:150px;vertical-align:top;padding:1px 0}
    table.dat td{vertical-align:top;padding:1px 0}
    table.dat td.dp{width:14px;text-align:center}
    .salu{margin:10px 0 4px;font-weight:bold}
    .parr{margin:0 0 12px;text-align:justify}
    .cuadro{margin:14px 0 4px;font-weight:bold;text-align:center;letter-spacing:.5px}
    table.it{width:100%;border-collapse:collapse;font-size:10px}
    table.it th{background:#1F3864;color:#fff;border:1px solid #1F3864;padding:5px 4px;font-size:9.5px;
      text-align:center;line-height:1.25}
    table.it td{border:1px solid #9aa4b8;padding:5px;vertical-align:top}
    table.it td.c{text-align:center;white-space:nowrap}
    table.it td.d{text-align:right;white-space:nowrap}
    table.tt{width:100%;border-collapse:collapse;font-size:11px;margin-top:-1px}
    table.tt td{border:1px solid #9aa4b8;padding:5px}
    table.tt td.k{text-align:right;font-weight:bold;width:82%}
    table.tt td.v{text-align:right;white-space:nowrap}
    .letras{margin:7px 0 0;font-weight:bold;font-size:10.5px}
    .sec{margin:16px 0 5px;font-weight:bold;letter-spacing:.5px}
    .firma{margin-top:22px;font-size:11px}
    .pie{margin-top:14px;border-top:3px solid #1F3864;padding-top:6px;font-size:9.5px;color:#444;text-align:center}
    @media print{body{padding:12mm 12mm}}
  </style></head><body>
    <div class="mem">
      <div><b>${cotEsc(S.nombre || 'Sinergia Biomédica')}</b>
        <small>${cotEsc(S.razonSocial || '')}<br>RUC ${cotEsc(S.ruc || '')}<br>${cotEsc(S.direccion || '')}</small></div>
      <div style="text-align:right"><small>${cotEsc(S.telefono || '')}<br>${cotEsc(S.email || '')}<br>${cotEsc(S.web || '')}</small></div>
    </div>
    <h1>COTIZACIÓN Nº ${numero}</h1>
    <div class="fecha">FECHA: ${hoy}</div>
    <table class="dat">
      <tr><th>ATENCIÓN</th><td class="dp">:</td><td>${cotEsc((nom || '—').toUpperCase())}</td></tr>
      <tr><th>SEÑOR(ES)</th><td class="dp">:</td><td>${cotEsc((nom || '—').toUpperCase())}</td></tr>
      ${mail ? `<tr><th>CORREO</th><td class="dp">:</td><td>${cotEsc(mail)}</td></tr>` : ''}
      ${tel ? `<tr><th>TELÉFONO</th><td class="dp">:</td><td>${cotEsc(tel)}</td></tr>` : ''}
      <tr><th>ASUNTO</th><td class="dp">:</td><td>ALQUILER DE INSTRUMENTOS DE METROLOGÍA BIOMÉDICA</td></tr>
      <tr><th>PERIODO</th><td class="dp">:</td><td>${cotEsc((c.qty + ' ' + uq).toUpperCase())}${c.mod === 'dia' && COT.d1 && COT.d2 ? ' (DEL ' + COT.d1 + ' AL ' + COT.d2 + ')' : ''}</td></tr>
    </table>
    <p class="salu">DE NUESTRA CONSIDERACIÓN</p>
    <p class="parr">SIRVA LA PRESENTE PARA SALUDARLO Y A LA VEZ HACER PROPICIA LA OPORTUNIDAD, PARA REMITIR CON
      LA PRESENTE NUESTRA COTIZACIÓN DETALLADA EN EL &quot;CUADRO N° 01&quot;.</p>
    <p class="cuadro">CUADRO Nº 1</p>
    <table class="it">
      <tr><th style="width:36px">ÍTEM</th><th style="width:42px">CANT</th><th style="width:72px">UND</th>
        <th>DESCRIPCIÓN</th><th style="width:88px">PRECIO UNITARIO<br>INCLUIDO IGV</th>
        <th style="width:88px">SUB TOTAL<br>INCLUIDO IGV</th></tr>
      ${filas}
    </table>
    <table class="tt">
      <tr><td class="k">SUBTOTAL</td><td class="v">${(c.total / 1.18).toFixed(2)}</td></tr>
      <tr><td class="k">IGV (18 %)</td><td class="v">${(c.total - c.total / 1.18).toFixed(2)}</td></tr>
      <tr><td class="k">TOTAL</td><td class="v">${c.total.toFixed(2)}</td></tr>
    </table>
    <p class="letras">${cotMontoLetras(c.total)}</p>
    <p class="sec">CONDICIONES COMERCIALES</p>
    <table class="dat">${cond}</table>
    <p class="sec">DATOS GENERALES</p>
    <table class="dat">
      <tr><th>RUC</th><td class="dp">:</td><td>${cotEsc(S.ruc || '')}</td></tr>
      <tr><th>RAZÓN SOCIAL</th><td class="dp">:</td><td>${cotEsc((S.razonSocial || '').toUpperCase())}</td></tr>
      ${S.banco ? `<tr><th>ENTIDAD BANCARIA</th><td class="dp">:</td><td>${cotEsc(S.banco)}</td></tr>` : ''}
      ${S.cuenta ? `<tr><th>NRO CUENTA</th><td class="dp">:</td><td>${cotEsc(S.cuenta)}</td></tr>` : ''}
      ${S.cci ? `<tr><th>CCI</th><td class="dp">:</td><td>${cotEsc(S.cci)}</td></tr>` : ''}
    </table>
    <p class="firma">ATENTAMENTE,<br><br><br>_______________________________<br>
      ${cotEsc(S.nombre || '')}<br><small>${cotEsc(S.razonSocial || '')}</small></p>
    <div class="pie">${cotEsc(S.web || '')} · ${cotEsc(S.email || '')} · ${cotEsc(S.telefono || '')}</div>
  </body></html>`;
}

function cotPDF(){
  const c = cotCalcular();
  if(!c.sel.length) return;
  const {nom, mail, tel} = cotDatos();
  const w = window.open('', '_blank');
  if(!w){ avisar('cotAviso', 'Tu navegador bloqueó la ventana. Permite las ventanas emergentes y vuelve a intentarlo.', 'err'); return; }
  w.document.write(cotHTML(c, nom, mail, tel, cotNumero()).replace('</body>',
    '<script>window.onload=function(){window.print()}<\/script></body>'));
  w.document.close();
}

/* Entrada desde las páginas de cada equipo: #/cotizar/<id>. Los datos del
   catálogo pueden tardar, así que se reintenta mientras llegan. */
function cotAbrir(id, intento){
  if(!id){ cotPintar(); return; }
  if(byId(id)){ COT.sel.add(id); cotPintar(); return; }
  if((intento || 0) < 240) setTimeout(() => cotAbrir(id, (intento || 0) + 1), 250);
  else cotPintar();
}
