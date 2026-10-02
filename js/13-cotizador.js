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
      ${c.conTecnico ? `<div><span>Instrumentista metrológico (mínimo medio día)</span><span>S/ ${c.tecnico.toFixed(2)}</span></div>` : ''}
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
      <button type="button" class="btn cot-pdf" onclick="cotPDF()">Descargar mi cotización en PDF</button>
    </div>
    <p class="cot-nota">Entrega y devolución en nuestra oficina de Lima. A provincias se envía por agencia; el envío lo paga el cliente.</p>
    <button type="button" class="cot-limpiar" onclick="cotLimpiar()">Empezar de nuevo</button>`;
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
  return {nom: v('cotNom'), mail: v('cotMail'), tel: v('cotTel')};
}

function cotEnviar(via){
  const c = cotCalcular();
  if(!c.sel.length) return;
  const {nom, mail, tel} = cotDatos();
  const error = (typeof validarContacto === 'function') ? validarContacto(nom, mail, tel) : '';
  if(error){ avisar('cotAviso', error, 'err'); return; }
  const texto = cotTexto(c, nom, mail, tel);
  if(typeof enviarAlEndpoint === 'function')
    enviarAlEndpoint({tipo: 'cotizador', equipo: c.sel.map(e => e.nom).join(' + '), modalidad: c.mod,
                      total: 'S/ ' + c.total.toFixed(2), nombre: nom, correo: mail, telefono: tel});
  avisar('cotAviso', via === 'correo'
    ? 'Abriendo tu correo con la solicitud lista para enviar…'
    : 'Abriendo WhatsApp con la solicitud lista para enviar…', 'ok');
  abrirCanal(via, texto, 'Solicitud de alquiler');
}

/* ── Cotización en PDF ───────────────────────────────────────────────
   Se arma una hoja con el membrete y se manda a imprimir: el navegador
   ofrece «Guardar como PDF». Sin librerías ni servidor. */
function cotPDF(){
  const c = cotCalcular();
  if(!c.sel.length) return;
  const {nom, mail, tel} = cotDatos();
  const u = COT_UNI[c.mod], uq = c.qty === 1 ? u : (u === 'mes' ? 'meses' : u + 's');
  const S = (typeof SITE !== 'undefined') ? SITE : {};
  const filas = c.sel.map((e, i) => `<tr>
      <td class="c">${i + 1}</td>
      <td><b>${cotEsc(e.nom)}</b><br><small>${cotEsc(e.marca || '')}</small></td>
      <td class="c">${c.qty} ${uq}</td>
      <td class="d">S/ ${fmt(e.dia)}</td>
    </tr>`).join('');
  const inc = c.conTecnico ? incluidos('') : [];
  const hoy = new Date().toLocaleDateString('es-PE', {day: '2-digit', month: 'long', year: 'numeric'});
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
  <title>Cotización ${cotNumero()}</title><style>
    *{box-sizing:border-box}
    body{margin:0;padding:26mm 18mm;font:12px/1.5 Arial,Helvetica,sans-serif;color:#1a1c20}
    h1{margin:0;font-size:19px;letter-spacing:-.2px}
    .cab{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;
      border-bottom:2px solid #9A7F4E;padding-bottom:12px}
    .cab small{display:block;color:#666;font-size:11px;line-height:1.5}
    .num{text-align:right;font-size:12px}
    .num b{display:block;font-size:15px;color:#9A7F4E}
    .dat{margin:16px 0 4px;font-size:12px}
    .dat span{display:inline-block;min-width:92px;color:#666}
    table{width:100%;border-collapse:collapse;margin-top:14px;font-size:12px}
    th{background:#f3f1ec;text-align:left;padding:8px;border-bottom:1px solid #d9d4c8;font-size:11px;
      letter-spacing:.4px;text-transform:uppercase;color:#555}
    td{padding:8px;border-bottom:1px solid #eceae4;vertical-align:top}
    td small{color:#777}
    .c{text-align:center;white-space:nowrap}
    .d{text-align:right;white-space:nowrap}
    .tot{margin-top:14px;margin-left:auto;width:62%;font-size:12.5px}
    .tot div{display:flex;justify-content:space-between;padding:4px 8px}
    .tot .g{margin-top:5px;background:#1a1c20;color:#fff;font-size:14px;font-weight:bold;border-radius:4px}
    .nota{margin-top:16px;padding:10px 12px;background:#f7f6f2;border:1px solid #e4e0d6;border-radius:5px;font-size:11.5px}
    .cond{margin-top:14px;font-size:11px;color:#555;line-height:1.7}
    .pie{margin-top:26px;border-top:1px solid #d9d4c8;padding-top:10px;font-size:10.5px;color:#777}
    @media print{body{padding:14mm 12mm}}
  </style></head><body>
    <div class="cab">
      <div><h1>${cotEsc(S.nombre || 'Sinergia Biomédica')}</h1>
        <small>${cotEsc(S.razonSocial || 'Servicios Integrales Sinergia S.A.C.')}${S.ruc ? ' · RUC ' + cotEsc(S.ruc) : ''}<br>
        ${cotEsc(S.email || '')}${S.telefono ? ' · ' + cotEsc(S.telefono) : ''}</small></div>
      <div class="num">COTIZACIÓN<b>${cotNumero()}</b>${hoy}</div>
    </div>
    <p class="dat"><span>Señor(es):</span> ${cotEsc(nom || '—')}<br>
      ${mail ? '<span>Correo:</span> ' + cotEsc(mail) + '<br>' : ''}
      ${tel ? '<span>Teléfono:</span> ' + cotEsc(tel) + '<br>' : ''}
      <span>Asunto:</span> Alquiler de instrumentos de metrología biomédica</p>
    <table>
      <tr><th>Ítem</th><th>Descripción</th><th class="c">Periodo</th><th class="d">S/ por día</th></tr>
      ${filas}
    </table>
    <div class="tot">
      ${c.desc ? `<div><span>Suma por día</span><span>S/ ${fmt(c.base)}</span></div>
        <div><span>Descuento por combinar ${c.sel.length} (${Math.round(c.desc * 100)} %)</span><span>− S/ ${fmt(Math.round(c.base * c.desc))}</span></div>` : ''}
      <div><span>Precio por ${u}</span><span>S/ ${fmt(c.unit)}</span></div>
      <div><span>Alquiler · ${c.qty} ${uq}</span><span>S/ ${c.alquiler.toFixed(2)}</span></div>
      ${c.conTecnico ? `<div><span>Instrumentista metrológico</span><span>S/ ${c.tecnico.toFixed(2)}</span></div>` : ''}
      <div><span>Incluye IGV 18 %</span><span>S/ ${(c.alquiler / 1.18 * 0.18).toFixed(2)}</span></div>
      <div class="g"><span>TOTAL</span><span>S/ ${c.total.toFixed(2)}</span></div>
    </div>
    ${c.garantia ? `<p class="nota"><b>Garantía en depósito: S/ ${fmt(c.garantia)}.</b> No es un cobro.
      Se devuelve al retornar los instrumentos. Se recogen en nuestra oficina presentando DNI.</p>` : ''}
    ${inc.length ? `<p class="nota"><b>Incluido sin costo:</b> ${inc.map(x => cotEsc(x.nom)).join(' · ')}.</p>` : ''}
    <div class="cond"><b>Condiciones</b><br>
      · Precios en soles, con IGV incluido.<br>
      · Todos los instrumentos se entregan con su certificado de calibración vigente.<br>
      · Medio día es un turno de 4 h (${HORARIO_MANANA} o ${HORARIO_TARDE}); el día completo son los dos turnos.<br>
      · Entrega y devolución en nuestra oficina de Lima. A provincias, envío por agencia a cargo del cliente.<br>
      · Vigencia de esta cotización: 15 días calendario.</div>
    <div class="pie">${cotEsc(S.nombre || 'Sinergia Biomédica')} · ${cotEsc(S.web || 'sinergiabiomedica.pe')}
      · Documento generado automáticamente desde el cotizador en línea.</div>
    <script>window.onload=function(){window.print()}<\/script>
  </body></html>`;
  const w = window.open('', '_blank');
  if(!w){ avisar('cotAviso', 'Tu navegador bloqueó la ventana. Permite las ventanas emergentes y vuelve a intentarlo.', 'err'); return; }
  w.document.write(html); w.document.close();
}

/* Entrada desde las páginas de cada equipo: #/cotizar/<id>. Los datos del
   catálogo pueden tardar, así que se reintenta mientras llegan. */
function cotAbrir(id, intento){
  if(!id){ cotPintar(); return; }
  if(byId(id)){ COT.sel.add(id); cotPintar(); return; }
  if((intento || 0) < 240) setTimeout(() => cotAbrir(id, (intento || 0) + 1), 250);
  else cotPintar();
}
