/* =====================================================================
   03-extras.js — AMBIENTES ADICIONALES POR PLANOS
   ---------------------------------------------------------------------
   El PMA no siempre trae todo lo que el plano dibuja. Cuando aparece un
   ambiente en los planos que el programa no programó, hay que poder
   añadirlo, darle su ambiente de la NTS y que se equipe como cualquier
   otro: si no, se queda fuera del metrado y el expediente sale corto.

   Van APARTE del PMA a propósito. El PMA es el documento y no se toca:
   estos ambientes son un añadido de Luis, se guardan con su revisión
   —en el navegador, en el respaldo .json y en el archivo que nos pasa—
   y llevan código propio, PREFIJO-P01, para que nadie los confunda con
   los del programa. En el Excel salen marcados como «Añadido por
   planos» para que el supervisor sepa de dónde vienen.

   Los equipos salen de la NTS igual que siempre: se elige el ambiente
   normativo de la 113 o la 110, se jala su lista, el OC queda fuera y
   se multiplica por el número de ambientes.
   ===================================================================== */

const EXT = {upss: '', q: '', ntsx: [], amb: '', n: 1, abierto: false, ver: null};

function pmeExtras(){
  if(!PME_U.extra) PME_U.extra = [];
  return PME_U.extra;
}

/* El código: la sigla de su unidad y una serie propia con P de plano,
   para que se distinga de un vistazo de los del PMA. */
function extCodigo(upss){
  const base = (PME_D.match.find(m => m.upss === upss) || {}).cods || 'ADI-000';
  const pre = base.split('-')[0];
  /* El correlativo cuenta AMBIENTES, no fichas: uno del plano con N.º
     2 se lleva dos códigos, así que el siguiente empieza después. */
  let n = 1;
  pmeExtras().filter(e => e.upss === upss)
    .forEach(e => { n += Math.max(1, Number(e.n) || 1); });
  return pre + '-P' + String(n).padStart(2, '0');
}

/* Los códigos de un añadido: uno por ambiente físico, como en el PMA.
   El primero es el que se guardó al darlo de alta —ahí está colgada tu
   revisión—, y los demás van detrás. */
function extCods(e){
  const n = Math.max(1, extVeces(e));
  const base = e.cod || 'ADI-P01';
  const pre = base.split('-P')[0];
  const k = parseInt(base.split('-P')[1], 10) || 1;
  const out = [];
  for(let i = 0; i < n; i++) out.push(pre + '-P' + String(k + i).padStart(2, '0'));
  return out;
}

/* Cómo se escribe eso en una celda: «CES-P01» o «CES-P01 a CES-P03». */
function extCodsTxt(e){
  const l = extCods(e);
  return l.length === 1 ? l[0] : l[0] + ' a ' + l[l.length - 1];
}

/* Los ambientes de la NTS que se pueden elegir. Se busca por nombre o
   por código; se enseñan los de la unidad elegida primero. */
function extBuscarNts(q, upss){
  const todo = PME_D.ntsTodo || {};
  const t = (q || '').toLowerCase().trim();
  const out = [];
  ['113', '110'].forEach(n => {
    (todo[n] ? todo[n].amb : []).forEach(a => {
      const texto = (a[2] + ' ' + a[3] + ' ' + a[1]).toLowerCase();
      if(t && texto.indexOf(t) < 0) return;
      out.push({n: n, id: a[0], upss: a[1], cod: a[2], amb: a[3], eq: a[4]});
    });
  });
  /* Primero los de su misma unidad productora: es donde suele estar. */
  const mia = (upss || '').toLowerCase();
  out.sort((x, y) => (y.upss.toLowerCase() === mia) - (x.upss.toLowerCase() === mia));
  return out.slice(0, 40);
}

function extNts(id){
  const todo = PME_D.ntsTodo || {};
  for(const n of ['113', '110']){
    const a = (todo[n] ? todo[n].amb : []).find(x => x[0] === id);
    if(a) return {n: n, id: a[0], upss: a[1], cod: a[2], amb: a[3], eq: a[4]};
  }
  return null;
}

/* Los ambientes de la norma con los que se equipa un añadido. Puede
   ser más de uno: en el plano también hay ambientes unificados —una
   sala de espera que hace de informes, por ejemplo—, y entonces se
   eligen los dos y se unen sus listas. Lo guardado antes llevaba un
   solo id en «nts»; se sigue leyendo. */
function extIds(e){
  if(e.ntsx && e.ntsx.length) return e.ntsx;
  return e.nts ? [e.nts] : [];
}

function extAmbs(e){
  return extIds(e).map(extNts).filter(Boolean);
}

/* Todos los renglones de la norma de un añadido —EQ y OC—, en el orden
   de la norma, diciendo de qué ambiente viene cada uno y cuál perdió la
   unión. Es lo mismo que el metrado del PMA guarda en «ren», y sirve
   para lo mismo: que el añadido se pueda fiscalizar como cualquier otro
   ambiente, renglón por renglón. */
function extOcur(e){
  const ambs = extAmbs(e);
  const ocur = [];
  ambs.forEach((a, ip) => {
    const vez = {};
    a.eq.forEach(par => {
      const c = PME_D.cat[par[0]] || ['(sin descripción en el catálogo)', '', 'EQ'];
      vez[par[0]] = (vez[par[0]] || 0) + 1;
      ocur.push({a: a, ip: ip, c: par[0], q: par[1], vez: vez[par[0]],
                 d: c[0], t: c[1], p: c[2], fuera: false});
    });
  });
  if(ambs.length > 1){
    const manda = {};
    ocur.forEach(x => {
      const k = x.c + '|' + x.vez;
      if(!manda[k] || x.q > manda[k].q) manda[k] = x;
    });
    ocur.forEach(x => { x.fuera = manda[x.c + '|' + x.vez] !== x; });
  }
  return ocur;
}

/* Los mismos renglones con la forma que usa la fiscalización. */
function extEq(e){
  return extOcur(e).map(x => [x.c, x.q, x.ip, x.fuera ? 1 : 0]);
}

/* Las líneas de equipo de un ambiente añadido, sacadas de la norma en
   el momento: no se guardan, se calculan, igual que las del PMA.

   Con dos ambientes de la norma detrás se aplica la misma regla que en
   el PMA: las listas se unen y de los códigos que piden las dos manda
   la MAYOR cantidad, no se suman. */
/* Cuántos ambientes físicos trae el añadido. Del formulario sale un
   entero, pero una revisión editada a mano puede traer texto, decimales
   o un negativo, y un negativo daba cantidades negativas. */
function extVeces(e){
  const n = Math.trunc(Number(e.n));
  return Number.isFinite(n) ? Math.max(0, n) : 1;
}

function extLineas(e){
  const ambs = extAmbs(e);
  if(!ambs.length) return [];
  const ocur = extOcur(e).filter(x => x.p !== 'OC');   // el OC no se metra

  const cods = ambs.map(a => a.cod).filter(Boolean).join(' + ');
  const nombres = ambs.map(a => a.amb).join(' + ');
  const codsl = extCods(e);
  const codsTxt = extCodsTxt(e);
  const out = [];
  let k = 0;
  ocur.forEach(x => {
    if(x.fuera) return;                      // unido: no se suma, manda la mayor
    k++;
    out.push({
      n: 'P' + e.id + '-' + k, ia: 'P' + e.id, extra: true,
      upss: e.upss, tipo: 'Añadido por planos', zona: '', amb: e.amb,
      pag: '', namb: e.n, estado: 'Añadido por planos', pmf: '',
      nAmbNorma: x.a.n, codAmb: cods, ambNts: nombres,
      c: x.c, d: x.d, t: x.t, p: x.p,
      qn: x.q, calc: x.q * extVeces(e), fin: x.q * extVeces(e),
      nEq: x.a.n, obs: 'Ambiente que no está en el PMA: sale de los planos'
        + (ambs.length > 1 ? ' - unido de ' + ambs.length + ' ambientes de la NTS' : ''),
      conf: 'Añadido por planos', nota: e.nota || '', area: e.area || '',
      grupo: '', cods: codsTxt, codsl: codsl,
    });
  });
  return out;
}

/* Todas las líneas del PME: las del PMA, las de los añadidos por
   planos y las que reactivaste de entre las anuladas por unificación.
   Es lo que miran el resumen, la pestaña PME y el Excel. */
function pmeLineas(){
  const ex = pmeExtras();
  const base = ex.length
    ? PME_D.pme.concat(ex.reduce((a, e) => a.concat(extLineas(e)), []))
    : PME_D.pme;
  const fz = pmeForzadas();
  return fz.length ? base.concat(fz) : base;
}

/* ─────────────────────── ALTA Y BAJA ─────────────────────── */

function extForm(k, v){ EXT[k] = v; pintarPme(); }

/* Desplegar los equipos del añadido aquí mismo. Son los mismos que se
   ven al fiscalizarlo —la lista de la norma, con su OC y lo que la
   unión anuló—, pero a mano: el que acaba de añadir un ambiente del
   plano quiere ajustarle las cantidades sin irse a otra tabla. */
function extVer(id){
  EXT.ver = EXT.ver === id ? null : id;
  pintarPme();
}

function extEquipos(e){
  const a = fisIdx().porAmb['P' + e.id];
  if(!a) return '<p class="fis-no">Este ambiente todavía no tiene lista.</p>';
  return `<table class="pme-tabla fis-eq ext-eq">
    <thead><tr><th class="n">N.º</th><th>Código</th><th>Descripción</th><th>Tipo</th>
      <th>EQ/OC</th><th class="n">Cant. norma</th><th class="n">Cant. PME</th><th>Qué pasó</th></tr></thead>
    <tbody>${a.ren.map(x => {
      const q = x.ln ? pmeQ(x.ln) : 0;
      const et = FIS_EST[x.est] || ['', ''];
      const mas = (x.est === 'anul' || x.est === 'react')
        ? `<button type="button" class="fis-mas" onclick="fisForzar('${a.i}', ${x.j}, -1)"
             ${q <= 0 ? 'disabled' : ''}>−</button><b class="${q > 0 ? 'tocada' : ''}">${pmeNum(q)}</b>
           <button type="button" class="fis-mas" onclick="fisForzar('${a.i}', ${x.j}, 1)">+</button>`
        : (x.ln ? `<button type="button" class="fis-mas" onclick="fisSumar(${JSON.stringify(x.ln.n)}, -1)"
             ${q <= 0 ? 'disabled' : ''}>−</button><b class="${pmeTocada(x.ln) ? 'tocada' : ''}">${pmeNum(q)}</b>
           <button type="button" class="fis-mas" onclick="fisSumar(${JSON.stringify(x.ln.n)}, 1)">+</button>`
          : '—');
      return `<tr class="${x.est}">
        <td class="n">${x.j || '+'}</td>
        <td><span class="pme-cod">${esc(x.c)}</span></td>
        <td class="pme-desc">${esc(x.d)}</td>
        <td>${esc(x.t)}</td><td>${esc(x.p)}</td>
        <td class="n">${pmeNum(x.qn)}</td>
        <td class="n pme-q">${mas}</td>
        <td><span class="fis-rep ${et[1]}">${esc(et[0])}</span></td>
      </tr>`;
    }).join('')}</tbody>
    <tfoot><tr><td colspan="6">${pmeNum(a.ren.length)} renglones de la norma ·
      ${pmeNum(a.ls.length)} al PME${a.oc ? ' · ' + pmeNum(a.oc) + ' OC fuera' : ''}</td>
      <td class="n">${pmeNum(a.unid)}</td>
      <td class="ex-btns">
        <button type="button" class="ex-btn" onclick="fisVer('${a.i}')">Cotejar</button>
        <button type="button" class="ex-btn" onclick="fisIr('${a.i}')">Fiscalizarlo entero</button></td>
    </tr></tfoot>
  </table>`;
}

function extAbrir(){
  EXT.abierto = !EXT.abierto;
  if(EXT.abierto && !EXT.upss) EXT.upss = PME_D.match[0].upss;
  pintarPme();
}

/* Elegir no sustituye: suma. Un ambiente del plano puede unir dos de
   la norma, y la segunda vez que se elige otro se añade a la lista.
   Volver a tocar el mismo lo quita. */
function extElegir(id){
  if(!EXT.ntsx) EXT.ntsx = [];
  const k = EXT.ntsx.indexOf(id);
  if(k >= 0) EXT.ntsx.splice(k, 1);
  else EXT.ntsx.push(id);
  pintarPme();
}

function extAnadir(){
  if(!EXT.amb.trim()){ alert('Ponle nombre al ambiente, el que use el plano.'); return; }
  if(!EXT.ntsx || !EXT.ntsx.length){
    alert('Elige al menos un ambiente de la NTS del que se jalan los equipos.'); return;
  }
  const id = Date.now().toString(36);
  pmeExtras().push({
    id: id, upss: EXT.upss, amb: EXT.amb.trim(), n: Math.max(1, Number(EXT.n) || 1),
    ntsx: EXT.ntsx.slice(), cod: extCodigo(EXT.upss), nota: 'Añadido desde los planos',
  });
  pmeGuardarLS();
  fisOlvidar();
  EXT.amb = ''; EXT.q = ''; EXT.ntsx = []; EXT.n = 1; EXT.abierto = false;
  pintarPme();
}

function extQuitar(id){
  const e = pmeExtras().find(x => x.id === id);
  if(!e) return;
  if(!confirm('Se quita «' + e.amb + '» y sus equipos salen del PME. ¿Seguimos?')) return;
  PME_U.extra = pmeExtras().filter(x => x.id !== id);
  pmeGuardarLS();
  fisOlvidar();
  pintarPme();
}

function extCantidad(id, d){
  const e = pmeExtras().find(x => x.id === id);
  if(!e) return;
  e.n = Math.max(1, (Number(e.n) || 1) + d);
  pmeGuardarLS();
  fisOlvidar();
  pintarPme();
}

/* ─────────────────────── PINTADO ─────────────────────── */

function extPanel(){
  const ex = pmeExtras();
  const upss = [...new Set(PME_D.match.map(m => m.upss))];
  const lista = ex.map(e => {
    const ambs = extAmbs(e);
    const lin = extLineas(e);
    return `<tr>
      <td class="pme-cod">${esc(extCodsTxt(e))}</td>
      <td class="pme-amb"><b>${esc(e.amb)}</b><small>${esc(e.upss)}</small></td>
      <td class="n"><button type="button" class="fis-mas" onclick="extCantidad('${e.id}', -1)"
          ${e.n <= 1 ? 'disabled' : ''}>−</button>
        <b>${e.n}</b>
        <button type="button" class="fis-mas" onclick="extCantidad('${e.id}', 1)">+</button></td>
      <td class="pme-amb">${ambs.length ? ambs.map(a =>
        `${pmeEt(a.n)} <span class="pme-cod">${esc(a.cod || '')}</span> ${esc(a.amb)}`
        ).join(' <b class="fis-mas-amb">+</b> ') +
        `<small>${esc(ambs[0].upss)}${ambs.length > 1
          ? ' · ' + ambs.length + ' ambientes unidos: no se suman, manda la mayor'
          : ''}</small>` : '<span class="fis-nd">ya no está en la norma</span>'}</td>
      <td class="n">${pmeNum(lin.length)}</td>
      <td class="n">${pmeNum(lin.reduce((s, l) => s + l.fin, 0))}</td>
      <td class="ex-btns">
        <button type="button" class="ex-btn ${EXT.ver === e.id ? 'ver' : ''}"
          onclick="extVer('${e.id}')">${EXT.ver === e.id ? 'Ocultar equipos' : 'Ver equipos'}</button>
        <button type="button" class="ex-btn ${FIS_FUENTE && FIS_FUENTE.amb === 'P' + e.id ? 'ver' : ''}"
          onclick="fisVer('P${e.id}')" title="Abre el PMF, el PMA y la NTS al lado">Cotejar</button>
        <button type="button" class="ex-btn" onclick="extQuitar('${e.id}')">Quitar</button></td>
    </tr>
    ${EXT.ver === e.id ? `<tr class="ext-equipos"><td colspan="7">${extEquipos(e)}</td></tr>` : ''}`;
  }).join('');

  const hallados = EXT.abierto ? extBuscarNts(EXT.q, EXT.upss) : [];
  const elegidos = (EXT.ntsx || []).map(extNts).filter(Boolean);

  return `${pmeSeccion(ex.length ? 4 : 3, 'Ambientes adicionales por planos',
      ex.length ? ex.length + (ex.length === 1 ? ' añadido' : ' añadidos') : 'Para lo que está en el plano y no en el PMA')}
  <p class="ex-nota">El PMA es el documento y no se toca. Si el plano dibuja un ambiente que el programa no
    programó, se añade aquí, se le elige su ambiente de la <b>NTS</b> y se equipa como cualquier otro.
    Llevan código propio —<b>CES-P01</b>, <b>INT-P01</b>…— y salen marcados como <b>Añadido por planos</b>
    en el PME y en el Excel, para que se sepa de dónde vienen. Se guardan con tu revisión, no con los datos.</p>

  ${ex.length ? `<div class="pme-wrap" style="max-height:34vh">
    <table class="pme-tabla ext-tabla">
      <colgroup><col style="width:9%"><col style="width:24%"><col style="width:9%"><col>
        <col style="width:7%"><col style="width:7%"><col style="width:9%"></colgroup>
      <thead><tr><th>Cód. amb.</th><th>Ambiente (plano)</th><th class="n">N.º amb.</th>
        <th>Ambiente de la NTS</th><th class="n">Equipos</th><th class="n">Unid.</th><th></th></tr></thead>
      <tbody>${lista}</tbody>
    </table>
  </div>` : ''}

  <div class="ex-btns" style="margin:8px 0">
    <button type="button" class="ex-btn ${EXT.abierto ? 'ver' : ''}" onclick="extAbrir()">
      ${EXT.abierto ? 'Cancelar' : '+ Añadir un ambiente del plano'}</button>
  </div>

  ${EXT.abierto ? `<div class="ext-form">
    <div class="ext-fila">
      <label>Unidad productora
        <select onchange="extForm('upss', this.value)">
          ${upss.map(u => `<option value="${esc(u)}" ${EXT.upss === u ? 'selected' : ''}>${esc(u)}</option>`).join('')}
        </select></label>
      <label>Nombre en el plano
        <input type="text" value="${esc(EXT.amb)}" placeholder="Como lo llama el plano"
          oninput="EXT.amb = this.value"></label>
      <label class="ext-n">N.º de ambientes
        <input type="number" min="1" step="1" value="${esc(EXT.n)}" oninput="EXT.n = this.value"></label>
    </div>
    <label class="ext-busca">Ambiente de la NTS del que se jalan los equipos
      <input type="search" value="${esc(EXT.q)}" placeholder="Busca por nombre o por código: «sala de espera», «MED1»…"
        oninput="extForm('q', this.value)"></label>
    ${elegidos.length ? `<p class="ext-elegido">
      ${elegidos.length > 1
        ? '<b>' + elegidos.length + ' ambientes unidos</b> — las listas se unen y de los códigos que '
          + 'piden los dos manda la mayor cantidad, no se suman:'
        : 'Elegido:'}
      ${elegidos.map(a => `<span class="ext-chip">${pmeEt(a.n)}
        <span class="pme-cod">${esc(a.cod || '')}</span> ${esc(a.amb)} · ${a.eq.length} renglones
        <button type="button" class="fis-mas" title="Quitarlo"
          onclick="extElegir('${a.id}')">×</button></span>`).join('')}</p>` : ''}
    <p class="ex-nota">Si en el plano ese recinto junta dos ambientes de la norma, elige los dos:
      se equipa con las dos listas y de lo que piden los dos manda la mayor cantidad.</p>
    ${EXT.q.trim() ? `<div class="pme-wrap ext-hallados" style="max-height:30vh">
      <table class="pme-tabla">
        <tbody>${hallados.length ? hallados.map(a => `<tr class="${
          (EXT.ntsx || []).indexOf(a.id) >= 0 ? 'elegida' : ''}">
          <td>${pmeEt(a.n)}</td>
          <td class="pme-cod">${esc(a.cod || '')}</td>
          <td class="pme-amb">${esc(a.amb)}<small>${esc(a.upss)}</small></td>
          <td class="n">${a.eq.length}</td>
          <td><button type="button" class="ex-btn" onclick="extElegir('${a.id}')">${
            (EXT.ntsx || []).indexOf(a.id) >= 0 ? 'Quitar' : 'Elegir'}</button></td>
        </tr>`).join('') : '<tr><td class="fis-no">Nada con ese texto en la NTS 113 ni en la 110.</td></tr>'}
        </tbody>
      </table>
    </div>` : ''}
    <div class="ex-btns">
      <button type="button" class="ex-btn ver" onclick="extAnadir()">Añadir al PME</button>
    </div>
  </div>` : ''}`;
}

/* — Para el Excel: los añadidos, con su origen — */
function extParaExcel(){
  const ex = pmeExtras();
  if(!ex.length){
    return [{'Cód. amb.': '', 'Ambiente (plano)': 'Sin ambientes añadidos', 'UPSS / UPS': '',
             'N° Amb.': '', 'Norma': '', 'Cód. NTS': '', 'Ambiente NTS': '',
             'Equipos': '', 'Unidades': '', 'Nota': ''}];
  }
  return ex.map(e => {
    const ambs = extAmbs(e);
    const lin = extLineas(e);
    return {
      'Cód. amb.': e.cod, 'Ambiente (plano)': e.amb, 'UPSS / UPS': e.upss, 'N° Amb.': e.n,
      'Norma': ambs.map(a => 'NTS ' + a.n).join(' + '),
      'Cód. NTS': ambs.map(a => a.cod).filter(Boolean).join(' + '),
      'Ambiente NTS': ambs.map(a => a.amb).join(' + '),
      'Id NTS': ambs.map(a => a.id).join(' + '),
      'Equipos': lin.length, 'Unidades': lin.reduce((s, l) => s + l.fin, 0),
      'Nota': 'Ambiente que no está en el PMA: sale de los planos'
        + (ambs.length > 1 ? ' · ' + ambs.length + ' ambientes de la NTS unidos: no se suman, manda la mayor' : ''),
    };
  });
}
