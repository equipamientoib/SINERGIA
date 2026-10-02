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
var COT = {sel: new Set(), mod: 'dia', qty: 1, d1: '', d2: ''};

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
  const nota = soloEquipo(e.id)
    ? `Retiro en oficina · garantía S/ ${fmt(garantiaDe(e.id))}`
    : (tieneMedio(e.dia) ? 'Desde medio día · con instrumentista' : 'Desde un día · con instrumentista');
  return `<label class="cot-i${marcado ? ' on' : ''}">
    <input type="checkbox" ${marcado ? 'checked' : ''} onchange="cotMarcar('${e.id}',this.checked)">
    <span class="cot-n"><b>${cotEsc(e.nom)}</b><small>${cotEsc(e.marca || '')}</small><i>${nota}</i></span>
    <span class="cot-p">S/ ${fmt(e.dia)}<small>día</small></span>
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
    caja.innerHTML = `<div class="cot-paso"><b>2</b> ¿Por cuánto tiempo?</div>
      <p class="cot-vacio">Marca al menos un instrumento de la lista y aquí aparece el precio,
      con el IGV incluido y el descuento si combinas varios.</p>`;
    return;
  }
  /* Modalidades: medio día solo si todos lo tienen; si no, se dice por qué. */
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
  const sub = c.alquiler / 1.18;
  const unidad = COT_UNI[c.mod];
  caja.innerHTML = `
    <div class="cot-paso"><b>2</b> ¿Por cuánto tiempo?</div>
    <div class="cot-seg">${seg}</div>
    ${c.mod === 'medio'
      ? `<p class="cot-ayuda">Un turno de 4 h: ${HORARIO_MANANA} o ${HORARIO_TARDE}.</p>`
      : (sinMedio.length ? `<p class="cot-ayuda">No hay medio día porque ${sinMedio.length === 1
            ? 'el ' + cotEsc(sinMedio[0].nom.toLowerCase()) + ' se alquila' : 'algunos se alquilan'} desde un día completo.</p>` : '')}
    ${cant}

    <div class="cot-paso"><b>3</b> Tu cuenta</div>
    <ul class="cot-sel">${c.sel.map(e =>
      `<li><span>${cotEsc(e.nom)}</span><span>S/ ${fmt(e.dia)}</span></li>`).join('')}
      ${c.desc ? `<li class="des"><span>Descuento por combinar ${n} (${Math.round(c.desc * 100)} %)</span><span>− S/ ${fmt(Math.round(c.base * c.desc))}</span></li>` : ''}
    </ul>
    <div class="cot-cuenta">
      <div><span>Precio por ${unidad}</span><span>S/ ${fmt(c.unit)}</span></div>
      <div><span>× ${c.qty} ${c.qty === 1 ? unidad : (unidad === 'mes' ? 'meses' : unidad + 's')}</span><span>S/ ${c.alquiler.toFixed(2)}</span></div>
      ${c.conTecnico ? `<div><span>Instrumentista (mínimo medio día)</span><span>S/ ${c.tecnico.toFixed(2)}</span></div>` : ''}
      <div class="fino"><span>Incluye IGV 18 %</span><span>S/ ${(c.alquiler - sub).toFixed(2)}</span></div>
    </div>
    <div class="cot-grand"><span>Total a pagar</span><span>S/ ${c.total.toFixed(2)}</span></div>
    ${c.garantia ? `<p class="cot-aviso"><b>Además dejas S/ ${fmt(c.garantia)} de garantía.</b>
      No es un cobro: se te devuelve cuando regreses el equipo. Lo recoges en nuestra oficina con tu DNI.</p>` : ''}
    ${inc.length ? `<p class="cot-aviso ok"><b>Incluido sin costo:</b> ${inc.map(x => cotEsc(x.nom)).join(' · ')}.</p>` : ''}

    <div class="cot-paso"><b>4</b> Tus datos y te respondemos</div>
    <div class="cot-form">
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
}

function cotEnviar(via){
  const c = cotCalcular();
  if(!c.sel.length) return;
  const v = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  const nom = v('cotNom'), mail = v('cotMail'), tel = v('cotTel');
  const error = (typeof validarContacto === 'function') ? validarContacto(nom, mail, tel) : '';
  if(error){ avisar('cotAviso', error, 'err'); return; }
  const lineas = [
    'Solicitud de alquiler — ' + ((typeof SITE !== 'undefined' && SITE.nombre) || 'Sinergia Biomédica'), '',
    'Instrumentos:', ...c.sel.map(e => ' · ' + e.nom + (e.modelo ? ' ' + e.modelo : '')),
    '', 'Modalidad: por ' + COT_UNI[c.mod], COT_CANT[c.mod] + ': ' + c.qty,
    c.mod === 'dia' && c.d1 ? 'Fechas: ' + COT.d1 + ' a ' + COT.d2 : '',
    'Alquiler: S/ ' + c.alquiler.toFixed(2) + ' (IGV incluido)',
    c.conTecnico ? 'Instrumentista: S/ ' + c.tecnico.toFixed(2) : 'Retiro en oficina · garantía S/ ' + fmt(c.garantia),
    'Total general: S/ ' + c.total.toFixed(2), '',
    'Nombre / institución: ' + nom, mail ? 'Correo: ' + mail : '', tel ? 'Teléfono: ' + tel : ''
  ].filter(Boolean);
  if(typeof enviarAlEndpoint === 'function')
    enviarAlEndpoint({tipo: 'cotizador', equipo: c.sel.map(e => e.nom).join(' + '), modalidad: c.mod,
                      total: 'S/ ' + c.total.toFixed(2), nombre: nom, correo: mail, telefono: tel});
  avisar('cotAviso', via === 'correo'
    ? 'Abriendo tu correo con la solicitud lista para enviar…'
    : 'Abriendo WhatsApp con la solicitud lista para enviar…', 'ok');
  abrirCanal(via, lineas.join('\n'), 'Solicitud de alquiler');
}

/* Entrada desde las páginas de cada equipo: #/cotizar/<id>. Los datos del
   catálogo pueden tardar, así que se reintenta mientras llegan. */
function cotAbrir(id, intento){
  if(!id){ cotPintar(); return; }
  if(byId(id)){ COT.sel.add(id); cotPintar(); return; }
  if((intento || 0) < 240) setTimeout(() => cotAbrir(id, (intento || 0) + 1), 250);
  else cotPintar();
}
