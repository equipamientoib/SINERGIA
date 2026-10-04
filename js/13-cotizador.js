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
var COT = {sel: new Set(), mod: 'medio', qty: 1, sede: 'lima'};
/* Fuera de Lima el instrumento viaja: sale, se usa y vuelve. Por eso el
   alquiler a provincia parte de varios días y no tiene medio día. */
const PROV_DIAS = 3;
/* Desde este número de días el alquiler se conversa directamente: a esa
   altura cambian el precio, la logística y la calibración. */
const COT_LARGO = 7;

const cotEsc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c =>
  ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));

/* Instrumentos que se pueden cotizar (las complementarias van incluidas). */
const cotLista = () => EQUIPOS.filter(e => !esComplemento(e) && e.dia > 0);

function cotMarcar(id, on){
  on ? COT.sel.add(id) : COT.sel.delete(id);
  cotPintar();
}
function cotSede(v){
  COT.sede = v;
  /* Si el instrumento viaja solo por agencia, el mínimo de días manda. */
  if(v === 'provincia' && COT.qty < PROV_DIAS && !cotCalcular().conTecnico) COT.qty = PROV_DIAS;
  cotPintar();
}
function cotMod(m){ COT.mod = m; cotPintar(); }
function cotCantidad(v){ COT.qty = Math.max(1, parseInt(v, 10) || 1); cotResumen(); }
function cotLimpiar(){ COT.sel.clear(); COT.qty = 1; COT.sede = 'lima'; cotPintar(); }

/* ── Cálculo ──────────────────────────────────────────────────────────
   Una sola función con toda la cuenta, para que el resumen y el mensaje
   que se envía nunca puedan decir cosas distintas. */
function cotCalcular(){
  const sel = [...COT.sel].map(byId).filter(Boolean);
  const base = sel.reduce((s, e) => s + Number(e.dia || 0), 0);
  const desc = descuentoPor(sel.length);
  const dia = Math.round(base * (1 - desc));
  /* Medio día si al menos un instrumento lo tiene: los económicos, solos,
     van desde un día completo, pero acompañando a uno que ya sale en medio
     día el viaje ya está pagado, y el precio sale prorrateado del conjunto.
     Fuera de Lima no hay medio día: el instrumento viaja. */
  const prov = COT.sede === 'provincia';
  const hayMedio = !prov && sel.some(e => tieneMedio(e.dia));
  const mod = (COT.mod === 'medio' && !hayMedio) ? 'dia' : COT.mod;
  const unit = mod === 'medio' ? precioMedio(dia) : dia;
  /* Instrumentista: va si algún instrumento lo lleva. */
  const conTecnico = sel.some(e => !soloEquipo(e.id));
  /* En provincia, el instrumento que viaja solo por agencia está fuera
     varios días; si va el instrumentista, él lo lleva y lo trae en el
     mismo viaje (sale de noche y vuelve de noche), así que se cobran solo
     los días de trabajo. */
  const qty = (prov && !conTecnico) ? Math.max(PROV_DIAS, COT.qty) : COT.qty;
  const alquiler = unit * qty;
  const tunit = mod === 'medio' ? TEC_MIN : TEC_DIA;
  const tecnico = conTecnico ? Math.max(TEC_MIN, tunit * qty) : 0;
  /* Viaje del instrumentista a provincia: el pasaje de ida y vuelta se
     cobra una sola vez; la alimentación, por cada día de trabajo. */
  const viaja = prov && conTecnico;
  const pasaje = viaja ? VIAJE_PASAJE : 0;
  const viatico = viaja ? VIAJE_VIATICO * qty : 0;
  /* Garantía: solo cuando los instrumentos se van sin instrumentista. Si
     viajan solos a provincia, también la dejan los que normalmente van
     acompañados. Con instrumentista no hay garantía: él los custodia. */
  const garantia = conTecnico ? 0
    : sel.reduce((s, e) => s + (garantiaDe(e.id) || (prov ? GARANTIA_PROV : 0)), 0);
  /* Lo único que ya no se cotiza solo: una semana o más. */
  const largo = mod === 'dia' && qty >= COT_LARGO;
  return {sel, base, desc, dia, mod, hayMedio, unit, qty, alquiler, conTecnico, tecnico, prov,
          viaja, pasaje, viatico, garantia, total: alquiler + tecnico + pasaje + viatico, largo};
}

/* ── Ofertas: «por S/ X más, llévate también…» ─────────────────────────
   Al agregar un instrumento sube el descuento por combinar, así que lo que
   cuesta de más casi siempre es menos que su precio suelto. Se calcula de
   verdad: se simula el total con ese instrumento y se resta el actual. */
function cotSimular(id){
  const antes = COT.sel;
  COT.sel = new Set([...antes, id]);
  const c = cotCalcular();
  COT.sel = antes;
  return c;
}
function cotOfertas(c, cuantas){
  if(!c.sel.length || c.largo) return [];
  const yaEstan = new Set(c.sel.map(e => e.id));
  return cotLista()
    .filter(e => !yaEstan.has(e.id))
    .map(e => {
      const sim = cotSimular(e.id);
      return {e: e, mas: Math.max(0, sim.total - c.total), suelto: sim.unit - c.unit};
    })
    .sort((a, b) => a.mas - b.mas)
    .slice(0, cuantas || 3);
}

/* ── Ofertas: «por S/ X más, llévate también…» ─────────────────────────
   Al agregar un instrumento sube el descuento por combinar, así que lo que
   cuesta de más casi siempre es menos que su precio suelto. Se calcula de
   verdad: se simula el total con ese instrumento y se resta el actual. */
function cotSimular(id){
  const antes = COT.sel;
  COT.sel = new Set([...antes, id]);
  const c = cotCalcular();
  COT.sel = antes;
  return c;
}
function cotOfertas(c, cuantas){
  if(!c.sel.length || c.largo) return [];
  const yaEstan = new Set(c.sel.map(e => e.id));
  return cotLista()
    .filter(e => !yaEstan.has(e.id))
    .map(e => {
      const sim = cotSimular(e.id);
      return {e: e, mas: Math.max(0, sim.total - c.total), suelto: sim.unit - c.unit};
    })
    .sort((a, b) => a.mas - b.mas)
    .slice(0, cuantas || 3);
}

/* «1 medio día», «2 medios días», «3 días». */
const cotPlural = (u, q) => q === 1 ? u : (u === 'medio día' ? 'medios días' : u + 's');

/* Solo medio día y día: de una semana en adelante se habla directamente. */
const COT_MOD = [['medio', 'Medio día'], ['dia', 'Por día']];
const COT_UNI = {medio: 'medio día', dia: 'día'};
const COT_CANT = {medio: 'Turnos de medio día', dia: 'Días'};

/* ── Página ─────────────────────────────────────────────────────────── */
/* Barra fija del celular: el total siempre a la vista. */
function cotBarra(c){
  const b = document.getElementById('cotBarra');
  if(!b) return;
  b.hidden = !c.sel.length;
  document.body.classList.toggle('cot-conbarra', !!c.sel.length);
  if(!c.sel.length){ b.innerHTML = ''; return; }
  b.innerHTML = c.largo
    ? `<div><span>${c.qty} días</span><b>Conversémoslo</b></div>
       <button class="btn btn-fill" onclick="cotEnviar('whatsapp')">Escríbenos</button>`
    : `<div><span>${c.sel.length} ${c.sel.length === 1 ? 'instrumento' : 'instrumentos'} · ${c.qty} ${cotPlural(COT_UNI[c.mod], c.qty)}</span>
         <b>S/ ${c.total.toFixed(2)}</b></div>
       <button class="btn btn-fill" onclick="cotVista()">Ver</button>`;
}

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
  const esc = document.getElementById('cotEsc');
  if(esc){
    const n = COT.sel.size, tramos = Object.keys(DESC_COMB).map(Number).sort((a, b) => a - b);
    esc.innerHTML = tramos.map(t =>
      `<span class="${n >= t ? 'on' : ''}">${t}${t === tramos[tramos.length - 1] ? ' o más' : ''}
        instrumento${t > 1 ? 's' : ''} · −${Math.round(DESC_COMB[t] * 100)} %</span>`).join('');
  }
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
  cotBarra(c);
  document.getElementById('cotCuenta').textContent =
    n ? (n + (n === 1 ? ' instrumento elegido' : ' instrumentos elegidos')) : '';
  if(!n){
    caja.innerHTML = `<div class="cot-top vacio"><span>Tu cotización</span><b>— —</b></div>
      <p class="cot-vacio">Marca al menos un instrumento de la lista. Aquí aparece el total
      y, con un clic, nos mandas tu pedido por WhatsApp.</p>`;
    return;
  }
  const sinMedio = c.sel.filter(e => !tieneMedio(e.dia));
  const mods = COT_MOD.filter(([m]) => m !== 'medio' || c.hayMedio);
  const seg = mods.map(([m, t]) =>
    `<button type="button" class="${c.mod === m ? 'on' : ''}" onclick="cotMod('${m}')">${t}</button>`).join('');
  const cant = `<label class="cot-f1">${COT_CANT[c.mod]}<input type="number" min="1" step="1" value="${c.qty}"
      oninput="cotCantidad(this.value)" onchange="cotCantidad(this.value)"></label>`;
  const inc = c.conTecnico ? incluidos('') : [];
  const u = COT_UNI[c.mod];
  /* Lo primero que se ve: el total y los dos botones. El detalle queda
     debajo, para quien quiera revisarlo. */
  /* Lo primero que se ve: el total y los botones. Y si pide una semana o
     más, en vez del total va la invitación a conversarlo. */
  const arriba = c.largo
    ? `<div class="cot-top largo">
         <span>${c.qty} días · una semana o más</span>
         <b>Conversémoslo</b>
         <small>A partir de ${COT_LARGO} días el precio se arma caso por caso: cambian la
           logística, la calibración y la disponibilidad. Te respondemos el mismo día.</small>
         <div class="cot-acc">
           <button class="btn btn-fill" onclick="cotEnviar('whatsapp')">Escríbenos por WhatsApp</button>
         </div>
       </div>`
    : `<div class="cot-top">
         <span>Tu cotización · ${c.qty} ${cotPlural(u, c.qty)}${c.prov ? ' · provincia' : ''}</span>
         <b>S/ ${c.total.toFixed(2)}</b>
         <small>IGV incluido${c.garantia ? ' · + S/ ' + fmt(c.garantia) + ' de garantía que se devuelve' : ''}</small>
         <div class="cot-acc">
           <button class="btn btn-fill" onclick="cotEnviar('whatsapp')">Enviar mi pedido por WhatsApp</button>
           <button class="btn" onclick="cotVista()">Ver el resumen</button>
         </div>
       </div>`;
  caja.innerHTML = `
    ${arriba}

    <div class="cot-paso"><b>2</b> ¿Dónde lo vas a usar?</div>
    <div class="cot-seg">
      <button type="button" class="${c.prov ? '' : 'on'}" onclick="cotSede('lima')">Lima</button>
      <button type="button" class="${c.prov ? 'on' : ''}" onclick="cotSede('provincia')">Provincia</button>
    </div>
    <p class="cot-ayuda">${!c.prov
      ? 'Retiro y devolución en nuestra oficina de Pueblo Libre, Lima.'
      : c.conTecnico
        ? `Viaja nuestro instrumentista con los instrumentos: sale de noche y regresa de noche, así que
           solo pagas los días de trabajo. Al total se le suman los pasajes de ida y vuelta (una sola vez)
           y los viáticos por día. Fuera de Lima no hay medio día.`
        : `Los instrumentos viajan por agencia; el envío de ida y vuelta lo contrata y lo paga el cliente.
           Como están fuera varios días, el alquiler va desde ${PROV_DIAS} días y sin medio día.`}</p>

    <div class="cot-paso"><b>3</b> ¿Por cuánto tiempo?</div>
    <div class="cot-seg">${seg}</div>
    ${c.mod === 'medio'
      ? `<p class="cot-ayuda">Un turno de 4 h: ${HORARIO_MANANA} o ${HORARIO_TARDE}.${
          sinMedio.length ? ' ' + (sinMedio.length === 1
            ? 'El ' + cotEsc(sinMedio[0].nom.toLowerCase()) + ', solo, va desde un día completo'
            : 'Los instrumentos económicos, solos, van desde un día completo') +
            '; acompañando a los demás entra en el medio día y el precio sale prorrateado.' : ''}</p>`
      : (c.hayMedio ? '' : c.prov ? '' : `<p class="cot-ayuda">No hay medio día porque ${c.sel.length === 1
            ? 'el ' + cotEsc(c.sel[0].nom.toLowerCase()) + ' se alquila' : 'todos los elegidos se alquilan'
          } desde un día completo. Si agregas uno de los grandes, entran todos en medio día.</p>`)}
    ${cant}
    ${(c.largo || c.mod !== 'dia') ? '' : `<p class="cot-ayuda">¿Lo necesitas una semana o más? Ese caso lo vemos
      directamente: pon los días y te aparece cómo escribirnos.</p>`}

    <div class="cot-paso"><b>4</b> El detalle</div>
    <ul class="cot-sel">${c.sel.map(e =>
      `<li><span>${cotEsc(e.nom)}</span><span>S/ ${fmt(e.dia)}</span></li>`).join('')}
      ${c.desc ? `<li class="des"><span>Descuento por combinar ${n} (${Math.round(c.desc * 100)} %)</span><span>− S/ ${fmt(Math.round(c.base * c.desc))}</span></li>` : ''}
    </ul>
    ${c.largo ? `<p class="cot-aviso"><b>No ponemos precio a ${c.qty} días en automático.</b>
      Para una semana o más lo vemos contigo: escríbenos y te pasamos el precio del plazo completo.</p>`
    : `<div class="cot-cuenta">
      <div><span>Precio por ${u}</span><span>S/ ${fmt(c.unit)}</span></div>
      <div><span>× ${c.qty} ${cotPlural(u, c.qty)}</span><span>S/ ${c.alquiler.toFixed(2)}</span></div>
      ${c.conTecnico ? `<div><span>Instrumentista metrológico (mínimo medio día)</span><span>S/ ${c.tecnico.toFixed(2)}</span></div>` : ''}
      ${c.viaja ? `<div><span>Pasajes ida y vuelta (una sola vez)</span><span>S/ ${c.pasaje.toFixed(2)}</span></div>
        <div><span>Viáticos · S/ ${fmt(VIAJE_VIATICO)} × ${c.qty} ${c.qty === 1 ? 'día' : 'días'}</span><span>S/ ${c.viatico.toFixed(2)}</span></div>` : ''}
      <div class="fino"><span>Incluye IGV 18 %</span><span>S/ ${(c.total / 1.18 * 0.18).toFixed(2)}</span></div>
    </div>`}
    ${cotOfertasHTML(c)}
    ${c.viaja ? `<p class="cot-aviso"><b>El viaje ya está incluido en el total.</b>
      Pasajes de ida y vuelta S/ ${fmt(c.pasaje)}, una sola vez, y viáticos de S/ ${fmt(VIAJE_VIATICO)}
      por día. El pasaje va de S/ ${fmt(VIAJE_PASAJE_MIN)} a S/ ${fmt(VIAJE_PASAJE)} según la distancia:
      calculamos con el mayor y lo ajustamos al emitir la cotización.</p>` : ''}
    ${c.garantia ? `<p class="cot-aviso"><b>Además dejas S/ ${fmt(c.garantia)} de garantía.</b>
      No es un cobro: se te devuelve cuando regreses el equipo. Lo recoges en nuestra oficina con tu DNI.</p>` : ''}
    ${inc.length ? `<p class="cot-aviso ok"><b>Incluido sin costo:</b> ${inc.map(x => cotEsc(x.nom)).join(' · ')}.</p>` : ''}

    <div class="cot-paso"><b>5</b> Tus datos</div>
    <div class="cot-form" id="cotForm">
      <label>Nombre o institución<input id="cotNom" type="text" autocomplete="organization" placeholder="Clínica, hospital o nombre"></label>
      <div class="cot-f2">
        <label>Correo<input id="cotMail" type="email" autocomplete="email" inputmode="email" placeholder="correo@ejemplo.com"></label>
        <label>Teléfono<input id="cotTel" type="tel" autocomplete="tel" inputmode="tel" placeholder="999 999 999"></label>
      </div>
      <div class="form-msg" id="cotAviso" role="status" aria-live="polite"></div>
      <p class="cot-mail">Con tus datos listos, usa el botón de arriba.
        ${c.largo ? '' : `¿Prefieres correo? <button type="button" onclick="cotEnviar('correo')">Enviar por correo</button>`}</p>
    </div>
    <p class="cot-nota">${c.prov
      ? 'El envío por agencia, de ida y vuelta, lo contrata y lo paga el cliente. El plazo se cuenta desde el despacho en Lima hasta el retorno a nuestra oficina.'
      : 'Entrega y devolución en nuestra oficina de Pueblo Libre, Lima, presentando documento de identidad.'}</p>
    <button type="button" class="cot-limpiar" onclick="cotLimpiar()">Empezar de nuevo</button>`;
  cotRestaurar();
}

/* Las ofertas, pintadas: el precio normal tachado y lo que cuesta sumarlo
   al pedido que ya tiene. */
function cotOfertasHTML(c){
  const of = cotOfertas(c, 3);
  if(!of.length) return '';
  const u = COT_UNI[c.mod];
  return `<div class="cot-of">
    <div class="cot-ofh">Por un poco más</div>
    ${of.map(o => {
      const solo = c.mod === 'medio' ? precioMedio(o.e.dia) : o.e.dia;
      const porUnidad = Math.round(o.mas / c.qty);
      return `<button type="button" class="cot-ofi" onclick="cotMarcar('${o.e.id}',true)">
        <span class="n">${cotEsc(o.e.nom)}</span>
        <span class="p">${o.mas <= 0 ? '<b>sin costo extra</b>'
          : `<b>+ S/ ${fmt(porUnidad)}</b> por ${u}${porUnidad < solo ? ` <s>S/ ${fmt(solo)}</s>` : ''}`}</span>
        <span class="mas">Agregar</span>
      </button>`;
    }).join('')}
    <p class="cot-ofn">Al sumar instrumentos baja el precio del día de todos: por eso el segundo
      cuesta menos que si lo alquilaras solo.</p>
  </div>`;
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
  const u = COT_UNI[c.mod], uq = cotPlural(u, c.qty);
  const L = [];
  L.push((!c.largo ? 'SOLICITUD DE ALQUILER — '
          : (c.prov && c.conTecnico) ? 'ALQUILER EN PROVINCIA CON INSTRUMENTISTA — '
          : 'ALQUILER POR UNA SEMANA O MÁS — ') +
    ((typeof SITE !== 'undefined' && SITE.nombre) || 'Sinergia Biomédica'));
  L.push('N.º ' + cotNumero() + ' · ' + new Date().toLocaleDateString('es-PE'));
  L.push('');
  L.push('CLIENTE');
  L.push('  Nombre: ' + (nom || '—'));
  if(mail) L.push('  Correo: ' + mail);
  if(tel)  L.push('  Teléfono: ' + tel);
  L.push('');
  L.push('DÓNDE: ' + (c.prov ? 'Provincia (envío por agencia, a cargo del cliente)' : 'Lima'));
  L.push('PERIODO: ' + c.qty + ' ' + uq + (c.mod === 'medio' ? ' (turnos de 4 h)' : ''));
  L.push('');
  L.push('INSTRUMENTOS');
  c.sel.forEach((e, i) => {
    L.push((i + 1) + '. ' + e.nom);
    L.push('   ' + (e.marca || '') + ' · S/ ' + fmt(e.dia) + ' por día');
  });
  L.push('');
  if(c.largo){
    L.push((c.prov && c.conTecnico)
      ? 'Es fuera de Lima y necesito al instrumentista, así que les pido su precio para mi ciudad.'
      : 'Son ' + c.qty + ' días, así que les pido su mejor precio para este plazo.');
    L.push('');
    L.push(c.prov ? 'Envío por agencia a provincia, de ida y vuelta, a cargo del cliente.'
                : 'Entrega y devolución en oficina (Pueblo Libre, Lima).');
    return L.join('\n');
  }
  L.push('CUENTA');
  if(c.desc) L.push('  Suma por día: S/ ' + fmt(c.base));
  if(c.desc) L.push('  Descuento por combinar ' + c.sel.length + ': −' + Math.round(c.desc * 100) + ' % (S/ ' + fmt(Math.round(c.base * c.desc)) + ')');
  L.push('  Precio por ' + u + ': S/ ' + fmt(c.unit));
  L.push('  Alquiler (' + c.qty + ' ' + uq + '): S/ ' + c.alquiler.toFixed(2));
  if(c.conTecnico) L.push('  Instrumentista metrológico: S/ ' + c.tecnico.toFixed(2));
  if(c.viaja){
    L.push('  Pasajes ida y vuelta (una sola vez): S/ ' + c.pasaje.toFixed(2));
    L.push('  Viáticos: S/ ' + fmt(VIAJE_VIATICO) + ' × ' + c.qty + ' día(s) = S/ ' + c.viatico.toFixed(2));
  }
  L.push('  TOTAL (IGV incluido): S/ ' + c.total.toFixed(2));
  if(c.garantia) L.push('  Garantía en depósito (se devuelve): S/ ' + fmt(c.garantia));

  const inc = c.conTecnico ? incluidos('') : [];
  if(inc.length){ L.push(''); L.push('INCLUIDO SIN COSTO'); inc.forEach(x => L.push('  · ' + x.nom)); }
  L.push('');
  L.push(c.prov ? 'Envío por agencia a provincia, de ida y vuelta, a cargo del cliente.'
                : 'Entrega y devolución en oficina (Pueblo Libre, Lima).');
  return L.join('\n');
}

/* Número correlativo visible, para que el cliente y nosotros hablemos del
   mismo documento: COT-AAMMDD-HHMM. */
/* Número de SOLICITUD, no de cotización: el correlativo COT-SB-MMAA-NN lo
   lleva la empresa a mano y se pone al emitir. Así no chocan. */
function cotNumero(){
  const d = new Date(), p = n => String(n).padStart(2, '0');
  return 'SOL-' + String(d.getFullYear()).slice(2) + p(d.getMonth() + 1) + p(d.getDate())
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
  const doc = cotDoc(c, nom, mail, tel, cotNumero());
  const error = (typeof validarContacto === 'function') ? validarContacto(nom, mail, tel) : '';
  if(error){
    const f = document.getElementById('cotForm');
    if(f) f.scrollIntoView({behavior: 'smooth', block: 'center'});
    avisar('cotAviso', error, 'err');
    const el = document.getElementById('cotNom'); if(el && !nom) setTimeout(() => el.focus(), 350);
    return;
  }
  /* Una semana o más: va el pedido sin precio, para conversarlo. */
  const texto = c.largo
    ? cotTexto(c, nom, mail, tel)
    : cotTexto(c, nom, mail, tel) + '\n\nResumen de este pedido:\n' + cotEnlace(doc);
  if(typeof enviarAlEndpoint === 'function')
    enviarAlEndpoint({tipo: 'cotizador', equipo: c.sel.map(e => e.nom).join(' + '), modalidad: c.mod,
                      total: 'S/ ' + c.total.toFixed(2), nombre: nom, correo: mail, telefono: tel});
  avisar('cotAviso', c.largo
    ? (via === 'correo' ? 'Abriendo tu correo con tu pedido…' : 'Abriendo WhatsApp con tu pedido…')
    : (via === 'correo' ? 'Abriendo tu correo con el resumen de tu pedido…'
                        : 'Abriendo WhatsApp con el resumen de tu pedido…'), 'ok');
  /* Solo viaja el enlace: el cliente no se descarga ningún documento. El
     único PDF es la cotización formal que emite la empresa. */
  abrirCanal(via, texto, !c.largo ? 'Solicitud de alquiler'
    : (c.prov && c.conTecnico) ? 'Alquiler en provincia con instrumentista'
    : 'Alquiler por una semana o más');
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
/* El logo va incrustado en la hoja: se abre en una ventana aparte, que no
   puede pedir archivos del sitio. */
const COT_LOGO = `<svg xmlns="http://www.w3.org/2000/svg" class="logo" viewBox="0 0 880 240" role="img" aria-label="Sinergia Biomédica">  <text x="40" y="208" font-weight="700" font-size="212" textLength="252" lengthAdjust="spacingAndGlyphs"><tspan fill="#9A7F4E">S</tspan><tspan fill="#2A2D33">B</tspan></text>  <text x="342" y="158" font-weight="700" font-size="100" fill="#17191D" textLength="498" lengthAdjust="spacingAndGlyphs">SINERGIA</text>  <text x="342" y="212" font-weight="600" font-size="52" fill="#2A2D33" textLength="498" lengthAdjust="spacingAndGlyphs">BIOMÉDICA</text>  <rect x="342" y="228" width="498" height="3" fill="#9A7F4E"/></svg>`;

/* Documento congelado: lleva todo lo que necesita la cotización, para que
   el enlace que se comparte siga valiendo aunque mañana cambien las tarifas. */
function cotDoc(c, nom, mail, tel, numero){
  return {
    num: numero, fecha: new Date().toLocaleDateString('es-PE'),
    nom: nom, mail: mail, tel: tel,
    mod: c.mod, qty: c.qty, prov: !!c.prov,
    items: c.sel.map(e => ({n: e.nom, m: e.marca || '', d: e.dia, f: cotFotoAbs(e)})),
    base: c.base, desc: c.desc, unit: c.unit, alquiler: c.alquiler,
    tec: c.tecnico, pas: c.pasaje, via: c.viatico, gar: c.garantia, total: c.total,
    inc: (c.conTecnico ? incluidos('') : []).map(x => x.nom)
  };
}

/* Foto del equipo, en dirección absoluta: la hoja se abre en una ventana
   nueva, donde las rutas relativas no resuelven. */
function cotFotoAbs(e){
  const u = (typeof fotoURL === 'function') ? fotoURL(e.photo || (e.fotos || [])[0] || '', 160, true) : '';
  if(!u) return '';
  if(/^https?:/.test(u)) return u;
  return location.origin + '/' + String(u).replace(/^\//, '');
}

/* El documento viaja dentro del enlace, en base64 seguro para URL. */
function cotCodificar(doc){
  try{
    return btoa(unescape(encodeURIComponent(JSON.stringify(doc))))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }catch(e){ return ''; }
}
function cotDecodificar(txt){
  try{
    const b = txt.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(escape(atob(b))));
  }catch(e){ return null; }
}
function cotEnlace(doc, ruta){
  const base = location.origin + location.pathname;
  return base + '#/' + (ruta || 'resumen') + '/' + cotCodificar(doc);
}

/* Términos y condiciones, numerados como en las cotizaciones de la empresa. */
function cotTerminos(c){
  const u = COT_UNI[c.mod], uq = cotPlural(u, c.qty);
  const conTec = !!c.tec, gar = c.gar || 0;
  const T = [];
  T.push(['1. Precio de la oferta.', 'Importes en Soles (S/), con IGV incluido. Comprenden el alquiler ' +
    'de los instrumentos por ' + c.qty + ' ' + uq +
    (conTec ? ' y el servicio de instrumentista metrológico.' : '.')]);
  T.push(['2. Vigencia de la oferta.', 'Quince (15) días calendario contados desde la emisión de esta cotización.']);
  T.push(['3. Calibración.', 'Todos los instrumentos se entregan con su certificado de calibración vigente, emitido por laboratorio acreditado, y se devuelven con el mismo certificado.']);
  T.push(['4. Modalidad y horario.', c.mod === 'medio'
    ? ('Medio día corresponde a un turno de cuatro (4) horas: ' + HORARIO_MANANA + ' o ' + HORARIO_TARDE + '.')
    : ('El día completo comprende los dos turnos: ' + HORARIO_MANANA + ' y ' + HORARIO_TARDE + '.')]);
  T.push(['5. Entrega y devolución.', !c.prov
    ? 'En nuestra oficina de Lima, en el horario indicado.'
    : conTec
      ? ('El instrumentista metrológico traslada los instrumentos a la ciudad del cliente. Los días de viaje ' +
         'no se facturan: se cobran únicamente los días de trabajo en sitio. Los pasajes de ida y vuelta se ' +
         'cobran una sola vez y los viáticos por cada día de trabajo, ambos detallados en el Cuadro N° 1. ' +
         'El pasaje corresponde a la ciudad indicada por el cliente; una ciudad distinta modifica ese importe.')
      : ('El envío se realiza por agencia de transporte, de ida y vuelta, contratado y pagado por el cliente. ' +
         'El plazo del alquiler se cuenta desde el despacho en Lima hasta el retorno a nuestra oficina, con un mínimo de ' +
         PROV_DIAS + ' días. Los instrumentos viajan en su maleta original y el cliente responde por el embalaje de retorno.')]);
  if(conTec) T.push(['6. Instrumentista metrológico.',
    'Se factura aparte, con un mínimo de medio día. Comprende el manejo del instrumento y el registro de las mediciones. No incluye la emisión de informes ni la ejecución de mantenimientos.']);
  else T.push(['6. Garantía en depósito.',
    'S/ ' + fmt(gar) + ' al retiro de los instrumentos, contra presentación del documento de identidad. No constituye un cobro: se devuelve íntegramente al retornar los instrumentos en buen estado y dentro del plazo.']);
  const inc = c.inc || [];
  if(inc.length) T.push(['7. Incluido sin costo.', inc.join(', ') + '. Se entregan y se devuelven junto con los instrumentos alquilados.']);
  T.push([(inc.length ? '8' : '7') + '. Responsabilidad del cliente.',
    'La pérdida o el daño de un instrumento durante el alquiler obliga a su reposición, así como a la recalibración cuando el equipo se devuelva fuera de rango.']);
  T.push([(inc.length ? '9' : '8') + '. Forma de pago.',
    'Íntegro a la entrega de los instrumentos, salvo acuerdo distinto por escrito.']);
  T.push([(inc.length ? '10' : '9') + '. Ampliación del plazo.',
    'La extensión del alquiler se cotiza por separado antes de ejecutarse y se factura a la tarifa vigente.']);
  return T;
}

/* Dos documentos distintos a partir de los mismos datos:
     · formal = false → RESUMEN para el cliente: precios y detalle, pero sin
       membrete, sin firma y sin número de cotización. Es referencial.
     · formal = true  → COTIZACIÓN de la empresa, con membrete, firma, número
       propio y los ajustes que haya hecho quien la emite.
   El cliente nunca genera la segunda: eso lo decide la empresa. */
function cotHTML(d, formal){
  const S = (typeof SITE !== 'undefined') ? SITE : {};
  const u = COT_UNI[d.mod], uq = cotPlural(u, d.qty);
  const und = (d.mod === 'medio' ? 'MEDIO DÍA' : u.toUpperCase());
  const org = location.origin;
  const neto = d.total / 1.18, igv = d.total - neto;
  /* Precio unitario prorrateado sobre el total: la suma del cuadro cuadra
     exactamente con el total que vio el cliente. */
  const factor = d.base ? d.unit / d.base : 0;
  const filas = d.items.map((e, i) => {
    const pu = e.d * factor / 1.18, pt = pu * d.qty, pr = (e.m || '').split('·');
    return `<tr>
      <td class="c">${i + 1}</td>
      <td><b>${cotEsc(e.n.toUpperCase())}</b>
        ${e.f ? `<img class="mini" src="${cotEsc(e.f)}" alt="">` : ''}
        <span class="det">Marca: ${cotEsc((pr[0] || '—').trim())}<br>
        Procedencia: ${cotEsc((pr[1] || '—').trim())}<br>
        Con certificado de calibración vigente.</span></td>
      <td class="c">${und}</td><td class="c">${d.qty}.00</td>
      <td class="d">${pu.toFixed(2)}</td><td class="d">${pt.toFixed(2)}</td></tr>`;
  }).join('') + (d.tec ? `<tr>
      <td class="c">${d.items.length + 1}</td>
      <td><b>INSTRUMENTISTA METROLÓGICO</b>
        <span class="det">Manejo del instrumento y registro de las mediciones.<br>Mínimo de medio día.</span></td>
      <td class="c">${und}</td><td class="c">${d.qty}.00</td>
      <td class="d">${(d.tec / d.qty / 1.18).toFixed(2)}</td><td class="d">${(d.tec / 1.18).toFixed(2)}</td></tr>` : '')
    + (d.pas ? `<tr>
      <td class="c">${d.items.length + 2}</td>
      <td><b>PASAJES IDA Y VUELTA</b>
        <span class="det">Traslado del instrumentista y de los instrumentos a la ciudad del cliente.<br>Se cobra una sola vez.</span></td>
      <td class="c">SERVICIO</td><td class="c">1.00</td>
      <td class="d">${(d.pas / 1.18).toFixed(2)}</td><td class="d">${(d.pas / 1.18).toFixed(2)}</td></tr>` : '')
    + (d.via ? `<tr>
      <td class="c">${d.items.length + 3}</td>
      <td><b>VIÁTICOS DEL INSTRUMENTISTA</b>
        <span class="det">Alimentación durante los días de trabajo en sitio.</span></td>
      <td class="c">DÍA</td><td class="c">${d.qty}.00</td>
      <td class="d">${(d.via / d.qty / 1.18).toFixed(2)}</td><td class="d">${(d.via / 1.18).toFixed(2)}</td></tr>` : '');
  const cuadro = `<table>
      <tr><th style="width:34px">ÍTEM</th><th>DESCRIPCIÓN</th><th style="width:66px">UND</th>
        <th style="width:48px">CANT.</th><th style="width:70px">P. UNIT. S/</th><th style="width:74px">P. TOTAL S/</th></tr>
      ${filas}
      <tr class="tot"><td class="k" colspan="5">SUBTOTAL (S/)</td><td class="d">${neto.toFixed(2)}</td></tr>
      <tr class="tot"><td class="k" colspan="5">IGV (18%) (S/)</td><td class="d">${igv.toFixed(2)}</td></tr>
      <tr class="gran"><td class="k" colspan="5">TOTAL CON IGV (S/)</td><td class="d">${d.total.toFixed(2)}</td></tr>
    </table>`;
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
                 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];
  const hoy = new Date();
  const fechaLarga = 'Lima, ' + String(hoy.getDate()).padStart(2, '0') + ' de ' +
    meses[hoy.getMonth()] + ' de ' + hoy.getFullYear();

  /* Estilos comunes a los dos documentos. */
  const base = `
    @page{size:A4 portrait;margin:14mm 16mm 16mm}
    *{box-sizing:border-box}
    body{margin:0;background:#fff;color:#1a1a1a;font:11px/1.5 "Segoe UI",Calibri,Arial,Helvetica,sans-serif}
    .hoja{position:relative;width:210mm;min-height:297mm;margin:0 auto;padding:14mm 16mm 16mm}
    /* El membrete va en <thead>: el navegador lo repite solo en cada hoja
       impresa. El <tfoot> solo reserva el hueco de abajo; el pie se dibuja
       aparte, pegado al final de cada hoja, para que nunca quede a media
       página ni encima del texto. */
    .pag{width:100%;border-collapse:collapse}
    .pag>thead>tr>td,.pag>tfoot>tr>td,.pag>tbody>tr>td{border:0;padding:0;vertical-align:top}
    .hueco{height:0}
    table{width:100%;border-collapse:collapse;font-size:10px}
    th{background:#9A7F4E;color:#fff;border:1px solid #9A7F4E;padding:6px 5px;font-size:9.5px;
      font-weight:700;text-align:center;letter-spacing:.3px}
    td{border:1px solid #c9c2b4;padding:6px;vertical-align:top}
    td.c{text-align:center;white-space:nowrap}
    td.d{text-align:right;white-space:nowrap}
    td b{font-size:10.5px}
    td .det{display:block;margin-top:3px;color:#555;font-size:9.5px;line-height:1.45}
    td .mini{float:right;max-width:70px;max-height:56px;object-fit:contain;margin:0 0 4px 8px}
    tr.tot td{background:#f5f2ec;font-weight:700}
    tr.tot td.k{text-align:right}
    tr.gran td{background:#9A7F4E;color:#fff;font-weight:700}
    h2{margin:18px 0 6px;font-size:11.5px;font-weight:700;color:#9A7F4E;letter-spacing:.3px;text-transform:uppercase}
    .nota{margin:7px 0 0;font-size:9.5px;color:#7A7A7A;text-align:justify}
    /* Al imprimir mandan los márgenes de @page. */
    @media print{
      .hoja{width:auto;min-height:0;margin:0;padding:0}
      tr,.term{break-inside:avoid}
      .hueco{height:13mm}
      .pie{position:fixed;bottom:0;left:0;right:0;margin:0;background:#fff}
    }`;

  if(!formal){
    /* ── RESUMEN del cliente ──────────────────────────────────────────
       Tiene que verse distinto de una cotización: sello de agua, franja
       de aviso, sin carta formal, sin firma y sin datos de pago. */
    return `<!doctype html><html lang="es"><head><meta charset="utf-8">
    <title>Solicitud de cotización ${cotEsc(d.num)}</title><style>${base}
      .sello{position:absolute;top:44%;left:0;right:0;text-align:center;font-size:54px;font-weight:800;
        color:rgba(154,127,78,.10);letter-spacing:3px;transform:rotate(-20deg);z-index:0;
        pointer-events:none}
      .cont{position:relative;z-index:1}
      .cab{display:flex;justify-content:space-between;align-items:baseline;gap:12px;
        border-bottom:2px solid #9A7F4E;padding-bottom:7px;margin-bottom:12px}
      .cab b{font-size:15px;color:#9A7F4E}
      .cab span{font-size:10.5px;color:#555}
      h1{margin:0 0 10px;font-size:17px;font-weight:700;color:#1a1a1a}
      .franja{margin:0 0 14px;padding:11px 13px;background:#fdf6e6;border:1px solid #e3cf9b;
        border-left:4px solid #c9a227;border-radius:4px;font-size:10.5px;line-height:1.55;text-align:justify}
      .franja b{display:block;font-size:12px;color:#8a6d1d;margin-bottom:3px}
      .meta{display:flex;justify-content:space-between;font-size:10.5px;color:#555;margin-bottom:12px}
      .para{margin:0 0 12px;font-size:11px}
      .para b{color:#9A7F4E}
      ul.lst{margin:4px 0 0;padding-left:16px;font-size:10.5px;line-height:1.6}
      .pasos{margin-top:16px;padding:12px 14px;background:#f5f2ec;border-radius:5px;font-size:10.5px;line-height:1.6}
      .pasos b{color:#9A7F4E}
      .pie{margin-top:9mm;padding-top:3mm;border-top:1px solid #ddd8cc;
        font-size:9px;color:#8a8a8a;text-align:center}
      @media print{.pie{padding-bottom:1mm}}
    </style></head><body>
      <div class="hoja"><div class="sello">REFERENCIAL</div><table class="pag">
        <tfoot><tr><td><div class="hueco"></div></td></tr></tfoot>
        <tbody><tr><td><div class="cont">
        <div class="cab"><b>${cotEsc(S.nombre || '')}</b><span>${cotEsc(S.web || '')} · ${cotEsc(S.telefono || '')}</span></div>
        <h1>Solicitud de cotización</h1>
        <div class="franja"><b>Esto no es una cotización.</b>
          Es un estimado que calculaste en nuestra web, sujeto a confirmar que los instrumentos estén
          libres en las fechas que necesitas. La cotización formal, con firma y validez comercial, la
          emite ${cotEsc(S.razonSocial || '')} después de confirmar la disponibilidad.</div>
        <div class="meta"><span>Solicitud N° ${cotEsc(d.num)}</span><span>${fechaLarga}</span></div>
        <p class="para"><b>Para:</b> ${cotEsc(d.nom || '—')}${d.tel ? ' · ' + cotEsc(d.tel) : ''}${d.mail ? ' · ' + cotEsc(d.mail) : ''}<br>
          <b>Dónde:</b> ${d.prov ? 'Provincia (envío por agencia, a cargo del cliente)' : 'Lima'}<br>
          <b>Periodo:</b> ${cotEsc(d.qty + ' ' + uq)}</p>
        <h2>Instrumentos y precio estimado</h2>
        ${cuadro}
        <p class="nota">Importes en Soles (S/), con IGV incluido. ${cotMontoLetras(d.total)}${d.gar
          ? ' Además se deja una garantía en depósito de S/ ' + fmt(d.gar) + ', que se devuelve al retornar los instrumentos.' : ''}</p>
        <h2>Qué incluye</h2>
        <ul class="lst">
          <li>Certificado de calibración vigente de cada instrumento.</li>
          ${d.tec ? '<li>Instrumentista metrológico, ya incluido en el total de arriba.</li>'
                  : '<li>Retiro y devolución en nuestra oficina de Lima, presentando documento de identidad.</li>'}
          ${(d.inc || []).length ? '<li>Sin costo: ' + cotEsc((d.inc || []).join(', ')) + '.</li>' : ''}
          ${d.prov && d.tec ? '<li>El instrumentista viaja a tu ciudad: sale de noche y regresa de noche, así que solo pagas los días de trabajo. Los pasajes y los viáticos ya están en el cuadro de arriba.</li>' : ''}
          ${d.prov && !d.tec ? '<li>Los instrumentos viajan por agencia; el envío de ida y vuelta lo contrata y lo paga el cliente.</li>' : ''}
          <li>${d.mod === 'medio' ? 'Medio día es un turno de 4 horas: ' + HORARIO_MANANA + ' o ' + HORARIO_TARDE + '.'
                                  : 'El día completo son los dos turnos: ' + HORARIO_MANANA + ' y ' + HORARIO_TARDE + '.'}</li>
        </ul>
        <div class="pasos"><b>Para confirmar:</b> escríbenos por WhatsApp al ${cotEsc(S.telefono || '')}
          o a ${cotEsc(S.email || '')}, indicando el número de solicitud ${cotEsc(d.num)}.
          Revisamos la disponibilidad y te enviamos la cotización formal el mismo día.</div>
      </div></td></tr></tbody></table>
      <div class="pie">${cotEsc(S.nombre || '')} · ${cotEsc(S.web || '')} · Documento referencial, sin validez comercial</div>
      </div>
    </body></html>`;
  }

  /* ── COTIZACIÓN formal ────────────────────────────────────────────
     Membrete arriba y pie con razón social y RUC en todas las páginas,
     como la plantilla de Word de la empresa. */
  const term = cotTerminos(d).map(([k, v]) =>
    `<p class="term"><b>${cotEsc(k)}</b> ${cotEsc(v)}</p>`).join('');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
  <title>Cotización ${cotEsc(d.num)}</title><style>${base}
    .memb{padding-bottom:7mm}
    .memb img{width:100%;display:block}
    .pie{margin-top:8mm;padding-top:3mm;border-top:1px solid #d9d2c2;
      font-size:9px;color:#6b6b6b;text-align:center;letter-spacing:.2px}
    @media print{.pie{padding-bottom:1mm}}
    h1{margin:0;text-align:center;font-size:13.5px;font-weight:700;color:#9A7F4E;letter-spacing:.3px;
      text-transform:uppercase;line-height:1.35}
    .lin{height:2px;background:#9A7F4E;margin:7px 0 12px}
    .nf{display:flex;justify-content:space-between;font-size:11px;font-weight:600;margin-bottom:14px}
    .cli{margin:0 0 12px;line-height:1.55}
    .campo{margin:0 0 8px;text-align:justify}
    .campo b{color:#9A7F4E}
    .intro{margin:12px 0 16px;text-align:justify}
    .term{margin:0 0 6px;text-align:justify;font-size:10.5px}
    .dpag{margin-top:6px;font-size:10.5px}
    .dpag div{display:flex;gap:8px;padding:1px 0}
    .dpag span{min-width:160px;color:#555}
    .cierre{margin:14px 0 0;text-align:justify}
    .firma{margin-top:10px}
    .firma img{width:170px;display:block}
  </style></head><body>
    <div class="hoja"><table class="pag">
      <thead><tr><td><div class="memb"><img src="${org}/img/cotizacion/membrete.png" alt="${cotEsc(S.razonSocial || '')}"></div></td></tr></thead>
      <tfoot><tr><td><div class="hueco"></div></td></tr></tfoot>
      <tbody><tr><td>
      <h1>Cotización de alquiler de instrumentos de metrología biomédica</h1>
      <div class="lin"></div>
      <div class="nf"><span>N° ${cotEsc(d.num)}</span><span>${fechaLarga}</span></div>
      <p class="cli">Señores:<br><b>${cotEsc((d.nom || '[RAZÓN SOCIAL DEL CLIENTE]').toUpperCase())}</b><br>
        ${d.ruc ? 'RUC: ' + cotEsc(d.ruc) + '<br>' : ''}${d.aten ? 'Atención: ' + cotEsc(d.aten) + '<br>' : ''}
        ${d.tel ? 'Teléfono: ' + cotEsc(d.tel) + '<br>' : ''}${d.mail ? 'Correo: ' + cotEsc(d.mail) + '<br>' : ''}Presente.-</p>
      <p class="campo"><b>Asunto:</b> Alquiler de instrumentos de metrología biomédica con certificado de
        calibración vigente, por ${cotEsc(d.qty + ' ' + uq)}.</p>
      <p class="intro">Es grato dirigirnos a ustedes para saludarlos cordialmente y, en atención a su
        requerimiento, alcanzarles nuestra propuesta económica por el alquiler de los instrumentos
        detallados en el Cuadro N° 1.</p>
      <h2>Cuadro N° 1 — Detalle del alquiler</h2>
      ${cuadro}
      <p class="nota">Importes en Soles (S/). El valor de venta asciende a S/ ${neto.toFixed(2)} sin IGV;
        el total con IGV (18%) es de S/ ${d.total.toFixed(2)}. ${cotMontoLetras(d.total)}${d.gar
        ? ' Adicionalmente se deja una garantía en depósito de S/ ' + fmt(d.gar) + ', que se devuelve al retornar los instrumentos.' : ''}</p>
      <h2>Términos y condiciones</h2>
      ${term}
      ${d.nota ? `<p class="campo"><b>Nota:</b> ${cotEsc(d.nota)}</p>` : ''}
      <h2>Datos generales para facturación y pago</h2>
      <div class="dpag">
        <div><span>Razón social:</span> ${cotEsc(S.razonSocial || '')}</div>
        <div><span>RUC:</span> ${cotEsc(S.ruc || '')}</div>
        ${S.banco ? `<div><span>Entidad bancaria:</span> ${cotEsc(S.banco)}</div>` : ''}
        ${S.cuenta ? `<div><span>N° cuenta corriente (S/):</span> ${cotEsc(S.cuenta)}</div>` : ''}
        ${S.cci ? `<div><span>CCI:</span> ${cotEsc(S.cci)}</div>` : ''}
      </div>
      <p class="cierre">Sin otro particular y a la espera de su gentil aceptación, quedamos a su
        disposición para cualquier consulta adicional.</p>
      <div class="firma">Atentamente,<br><img src="${org}/img/cotizacion/firma.png" alt="Firma"></div>
      </td></tr></tbody></table>
      <div class="pie">${cotEsc((S.razonSocial || '').toUpperCase())} &nbsp;·&nbsp; RUC ${cotEsc(S.ruc || '')}</div>
    </div>
  </body></html>`;
}

function cotImprimir(doc, formal){
  const w = window.open('', '_blank');
  if(!w){ avisar('cotAviso', 'Tu navegador bloqueó la ventana. Permite las ventanas emergentes y vuelve a intentarlo.', 'err'); return; }
  w.document.write(cotHTML(doc, formal).replace('</body>',
    '<script>window.onload=function(){window.print()}<\/script></body>'));
  w.document.close();
}
/* Vista previa en una ventana flotante, sin salir del cotizador ni
   descargar nada: el cliente mira cómo quedó y sigue editando. */
function cotVista(){
  const c = cotCalcular();
  if(!c.sel.length || c.largo) return;
  const {nom, mail, tel} = cotDatos();
  cotModal(cotDoc(c, nom, mail, tel, cotNumero()));
}
function cotModal(doc){
  let m = document.getElementById('cotModal');
  if(!m){
    m = document.createElement('div');
    m.id = 'cotModal'; m.className = 'cotm';
    document.body.appendChild(m);
    m.addEventListener('click', e => { if(e.target === m) cotModalCerrar(); });
    document.addEventListener('keydown', e => { if(e.key === 'Escape') cotModalCerrar(); });
  }
  m.innerHTML = `<div class="cotm-p" role="dialog" aria-modal="true" aria-label="Vista previa de tu solicitud">
    <div class="cotm-c">
      <div><b>Así le llega tu solicitud</b>
        <span>N° ${cotEsc(doc.num)} · S/ ${doc.total.toFixed(2)} con IGV</span></div>
      <button type="button" class="cotm-x" onclick="cotModalCerrar()" aria-label="Cerrar">✕</button>
    </div>
    <div class="cotm-h"><iframe title="Vista previa de la solicitud"></iframe></div>
    <div class="cotm-a">
      <button class="btn btn-fill" onclick="cotModalCerrar();cotEnviar('whatsapp')">Enviar mi pedido por WhatsApp</button>
      <button class="btn" onclick="cotModalCerrar()">Seguir editando</button>
    </div>
  </div>`;
  const f = m.querySelector('iframe');
  f.srcdoc = cotHTML(doc, false);
  f.onload = () => cotAjustarHoja(f);
  document.body.classList.add('cot-bloq');
  m.classList.add('on');
}
function cotModalCerrar(){
  const m = document.getElementById('cotModal');
  if(!m) return;
  m.classList.remove('on'); m.innerHTML = '';
  document.body.classList.remove('cot-bloq');
}

/* ── Página de la cotización (#/cotizacion/<codigo>) ─────────────────
   El enlace que va por WhatsApp abre esto: el resumen tal cual, solo para
   verlo en pantalla. No se descarga nada: el único PDF es la cotización
   formal que emite la empresa. El documento viaja dentro del propio
   enlace, así que no hace falta servidor ni base de datos. */
var COT_DOC = null;
function cotVer(codigo){
  const caja = document.getElementById('cotVerBody');
  if(!caja) return;
  const d = cotDecodificar(codigo || '');
  COT_DOC = d;
  if(!d || !d.items || !d.items.length){
    caja.innerHTML = `<div class="wrap"><p class="cotv-mal">No pudimos leer esta cotización.
      El enlace puede estar incompleto. Vuelve a armarla en
      <a href="#/cotizar">el cotizador</a> o escríbenos y la preparamos.</p></div>`;
    return;
  }
  const S = (typeof SITE !== 'undefined') ? SITE : {};
  const wa = 'https://wa.me/' + (S.whatsapp || '') + '?text=' + encodeURIComponent(
    'Hola, quiero confirmar la solicitud ' + d.num + ' por S/ ' + d.total.toFixed(2) +
    ' y recibir la cotización formal.\n\n' + location.href);
  caja.innerHTML = `
    <div class="wrap cotv-cab">
      <div>
        <div class="k">Solicitud de cotización</div>
        <h1>${cotEsc(d.num)}</h1>
        <p>${cotEsc(d.nom || '')} · ${cotEsc(d.fecha)} · <b>S/ ${d.total.toFixed(2)}</b> con IGV</p>
      </div>
      <div class="cotv-btns">
        <a class="btn btn-fill" href="${wa}" target="_blank" rel="noopener">Enviar este resumen por WhatsApp</a>
      </div>
    </div>
    <div class="wrap"><div class="cotv-hoja"><iframe title="Solicitud ${cotEsc(d.num)}"></iframe></div></div>
    <div class="wrap"><p class="cotv-emitir"><a href="#/emitir/${cotEsc(codigo)}">Soy de ${cotEsc((typeof SITE!=='undefined'&&SITE.nombre)||'la empresa')}</a></p></div>`;
  const f = caja.querySelector('iframe');
  f.srcdoc = cotHTML(d, false);
  /* La hoja mide 210 mm (794 px). En el celular no entra, así que se
     reduce a escala hasta el ancho disponible y el marco se ajusta al
     alto real de la hoja: se ve completa, sin cortes ni hueco en blanco. */
  f.onload = () => cotAjustarHoja(f);
}

function cotAjustarHoja(f){
  try{
    /* En pantalla la hoja no necesita medir un A4 completo: sin ese mínimo
       no queda un hueco en blanco debajo del contenido. */
    const hoja = f.contentDocument.querySelector('.hoja');
    if(hoja) hoja.style.minHeight = '0';
    const caja = f.parentNode, s = Math.min(1, caja.clientWidth / 794);
    const alto = f.contentDocument.body.scrollHeight + 16;
    f.style.height = alto + 'px';
    f.style.transform = s < 1 ? 'scale(' + s + ')' : 'none';
    caja.style.height = Math.round(alto * s) + 'px';
  }catch(e){}
}
window.addEventListener('resize', () => {
  const f = document.querySelector('.cotv-hoja iframe');
  if(f && f.contentDocument) cotAjustarHoja(f);
});

/* ── Emisión de la cotización formal (#/emitir/<codigo>) ─────────────
   Solo para la empresa. Aquí se revisa el pedido, se pone el número del
   correlativo propio, se ajusta el precio si hace falta y recién entonces
   se descarga el documento con membrete y firma. El cliente nunca pasa por
   aquí: su enlace es el del resumen. */
var COT_EMI = null;

function cotClaveOk(){
  try{ return sessionStorage.getItem('sb-emitir') === '1'; }catch(e){ return false; }
}
async function cotEntrar(){
  const el = document.getElementById('emiClave');
  const v = (el && el.value || '').trim();
  const esperado = (typeof CONFIG !== 'undefined' && CONFIG.EMITIR_HASH) || '';
  let ok = false;
  try{
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v));
    ok = [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('') === esperado;
  }catch(e){ ok = false; }
  if(!ok){ avisar('emiAviso', 'Clave incorrecta.', 'err'); if(el){ el.value = ''; el.focus(); } return; }
  try{ sessionStorage.setItem('sb-emitir', '1'); }catch(e){}
  cotEmitir(location.hash.slice('#/emitir/'.length));
}

function cotEmitir(codigo){
  const caja = document.getElementById('cotEmiBody');
  if(!caja) return;
  const d = cotDecodificar(codigo || '');
  if(!d || !d.items || !d.items.length){
    caja.innerHTML = `<div class="wrap"><p class="cotv-mal">No pudimos leer esta solicitud.</p></div>`;
    return;
  }
  if(!cotClaveOk()){
    caja.innerHTML = `<div class="wrap emi-puerta">
      <h1>Emitir cotización</h1>
      <p>Esta pantalla es solo para ${cotEsc((typeof SITE !== 'undefined' && SITE.nombre) || 'la empresa')}.
        El cliente ve el resumen, no la cotización firmada.</p>
      <label>Clave de emisión<input type="password" id="emiClave" autocomplete="current-password"
        onkeydown="if(event.key==='Enter')cotEntrar()"></label>
      <div class="form-msg" id="emiAviso" role="status" aria-live="polite"></div>
      <button class="btn btn-fill" onclick="cotEntrar()">Entrar</button>
      <p class="emi-vol"><a href="#/resumen/${cotEsc(codigo)}">← Ver el resumen del cliente</a></p>
    </div>`;
    setTimeout(() => { const el = document.getElementById('emiClave'); if(el) el.focus(); }, 60);
    return;
  }
  /* Número propio sugerido, con el correlativo de la empresa. */
  const h = new Date(), p2 = n => String(n).padStart(2, '0');
  COT_EMI = Object.assign({}, d, {
    num: d.numCot || ('COT-SB-' + p2(h.getMonth() + 1) + String(h.getFullYear()).slice(2) + '-'),
    ruc: d.ruc || '', aten: d.aten || '', nota: d.nota || '', ajuste: 0
  });
  caja.innerHTML = `
    <div class="wrap emi-cab">
      <div><div class="k">Emitir cotización · solicitud ${cotEsc(d.num)}</div>
        <h1>${cotEsc(d.nom || 'Cliente sin nombre')}</h1>
        <p>${d.items.length} ${d.items.length === 1 ? 'instrumento' : 'instrumentos'} ·
          ${d.qty} ${COT_UNI[d.mod]}${d.qty === 1 ? '' : 's'} · pedido por S/ ${d.total.toFixed(2)}</p></div>
    </div>
    <div class="wrap emi">
      <div class="emi-form">
        <div class="emi-g"><b>1</b> Datos de la cotización</div>
        <label>N° de cotización <small>tu correlativo</small>
          <input id="emiNum" value="${cotEsc(COT_EMI.num)}" oninput="cotEmiCambio()"></label>
        <div class="cot-f2">
          <label>RUC del cliente<input id="emiRuc" value="${cotEsc(COT_EMI.ruc)}" oninput="cotEmiCambio()"></label>
          <label>Atención<input id="emiAten" value="${cotEsc(COT_EMI.aten)}" oninput="cotEmiCambio()"></label>
        </div>
        <label>Razón social del cliente<input id="emiNom" value="${cotEsc(d.nom || '')}" oninput="cotEmiCambio()"></label>

        <div class="emi-g"><b>2</b> Precio</div>
        <label>Descuento sobre el total <small>en soles, 0 si no aplica</small>
          <input id="emiDesc" type="number" min="0" step="1" value="0" oninput="cotEmiCambio()"></label>
        <p class="emi-tot" id="emiTot"></p>

        <div class="emi-g"><b>3</b> Nota para el cliente <small>opcional</small></div>
        <label><textarea id="emiNota" rows="3" oninput="cotEmiCambio()"
          placeholder="Disponibilidad confirmada del 10 al 14 de octubre."></textarea></label>

        <button class="btn btn-fill emi-pdf" onclick="cotImprimir(COT_EMI, true)">Descargar la cotización en PDF</button>
        <p class="emi-nota">Sale con membrete, firma y datos de pago. Revisa la vista de al lado antes de enviarla.</p>
      </div>
      <div class="emi-vista"><div class="cotv-hoja"><iframe title="Cotización"></iframe></div></div>
    </div>`;
  cotEmiCambio();
}

function cotEmiCambio(){
  if(!COT_EMI) return;
  const v = id => { const el = document.getElementById(id); return el ? el.value : ''; };
  COT_EMI.num = v('emiNum'); COT_EMI.ruc = v('emiRuc'); COT_EMI.aten = v('emiAten');
  COT_EMI.nom = v('emiNom'); COT_EMI.nota = v('emiNota');
  const desc = Math.max(0, Number(v('emiDesc')) || 0);
  COT_EMI.total = Math.max(0, (COT_EMI.totalBase || (COT_EMI.totalBase = COT_EMI.total)) - desc);
  const t = document.getElementById('emiTot');
  if(t) t.innerHTML = desc
    ? `Pedido S/ ${COT_EMI.totalBase.toFixed(2)} − descuento S/ ${desc.toFixed(2)} = <b>S/ ${COT_EMI.total.toFixed(2)}</b>`
    : `Total: <b>S/ ${COT_EMI.total.toFixed(2)}</b>`;
  const f = document.querySelector('.emi-vista iframe');
  if(f){
    f.srcdoc = cotHTML(COT_EMI, true);
    f.onload = () => { try{ f.style.height = (f.contentDocument.body.scrollHeight + 24) + 'px'; }catch(e){} };
  }
}

/* Entrada desde las páginas de cada equipo: #/cotizar/<id>. Los datos del
   catálogo pueden tardar, así que se reintenta mientras llegan. */
function cotAbrir(id, intento){
  if(!id){ cotPintar(); return; }
  if(byId(id)){ COT.sel.add(id); cotPintar(); return; }
  if((intento || 0) < 240) setTimeout(() => cotAbrir(id, (intento || 0) + 1), 250);
  else cotPintar();
}
