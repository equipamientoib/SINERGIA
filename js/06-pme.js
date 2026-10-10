/* =====================================================================
   06-pme.js — PESTAÑA «PME EN BASE PMF/PMA/NTS»
   ---------------------------------------------------------------------
   El PME (Programa Médico de Equipamiento) no se arma de la nada: sale
   de cruzar tres documentos.

     · El PMF dice qué ambientes pidió el establecimiento.
     · El PMA es el que manda el alcance: los ambientes que de verdad se
       construyen, con su área y su número.
     · La NTS —113 para el nivel I, 110 para el II— dice qué equipos
       lleva cada ambiente y cuántos.

   Esta pestaña enseña ese cruce ambiente por ambiente: qué pidió cada
   documento, con qué ambiente de la norma se emparejó, qué renglones
   entraron al metrado y cuáles no, y por qué. Es lo que un supervisor
   abre para comprobar que el metrado no se inventó nada.

   LAS COLUMNAS SON LAS DEL LS
   Cada renglón se enseña con las mismas columnas de la hoja
   PI_POR_ESPECILIDAD_F5: A (NTS), O (código), P (descripción),
   Q (cantidad), R (tipo) y S/T (EQ/OC), y cada una lleva su letra. Así
   lo que se mira aquí y lo que se corrige allá son la misma cosa.

   DE LECTURA
   Por ahora sólo se consulta. Corregir cantidades, observar y añadir
   ambientes del plano se hace en la herramienta de armado; el botón de
   sincronizar con el LS del Drive viene después.

   El módulo y su dato se cargan al abrir la pestaña, no al entrar al
   expediente: es cerca de 1 MB que no tiene por qué pagar quien sólo
   mira el avance.
   ===================================================================== */

/* Todo va POR EXPEDIENTE. Si el dato fuera uno solo para la página, al
   pasar de un proyecto a otro el panel seguiría enseñando las cifras
   del anterior: el peor error posible en un portal con clave. */
const PME_DATOS = {};         // id -> JSON descargado
const PME_EST = {};           // id -> no | cargando | listo | error
const PME_ERR = {};           // id -> motivo
const PME_IX = {};            // id -> índice masticado

function pmeEstado(id){ return PME_EST[id] || 'no'; }

/* Dónde está el PME de este expediente. Lo dice el propio JSON del
   expediente (campo «pme»); sin eso, no hay pestaña ni petición. */
function pmeUrl(d, id){
  return (d && typeof d.pme === 'string') ? d.pme : 'data/pme-' + id + '.json';
}

/* Qué se busca, qué unidad se mira, qué fila está abierta. */
const PMEV = {q: '', upss: '', abierto: null, plegadas: {}};

function paneExPme(d, id){
  if(pmeEstado(id) === 'error'){
    return `<div class="cargando-proy">
      <p>No se pudo traer el PME.</p>
      <span>${esc(PME_ERR[id] || '')}</span>
      <p style="margin-top:12px"><button class="btn btn-fill"
        onclick="delete PME_EST['${id}'];pintarExpediente('${id}')">Reintentar</button></p>
    </div>`;
  }
  if(pmeEstado(id) !== 'listo'){
    return `<div class="cargando-proy"><div class="cp-barra"><i></i></div>
      <p>Trayendo el PME y la lista de la norma…</p>
      <span>Es cerca de un megabyte: los ambientes del PMA con su equipo.</span></div>`;
  }
  return pmePane(d, id);
}

/* Lo llama 06-expediente.js cada vez que se pinta la pestaña. */
function montarExPme(d, id){
  const e = pmeEstado(id);
  if(e === 'cargando' || e === 'listo') return;
  PME_EST[id] = 'cargando';
  fetch(pmeUrl(d, id), {cache: 'no-cache'}).then(r => {
    if(!r.ok) throw new Error('El archivo del PME no está publicado (' + r.status + ').');
    return r.json();
  }).then(j => {
    PME_DATOS[id] = j;
    PME_EST[id] = 'listo';
    pintarExpediente(id);
  }).catch(err => {
    PME_EST[id] = 'error';
    PME_ERR[id] = err.message || String(err);
    pintarExpediente(id);
  });
}

/* ─────────────────────── EL ÍNDICE ───────────────────────
   Se recorre todo una vez y se deja masticado: qué líneas del PME tiene
   cada ambiente, qué renglones de la norma le tocan y qué pasó con cada
   uno. Pintar después es sólo recorrer.                               */
function pmeIdx(id){
  if(PME_IX[id]) return PME_IX[id];
  const j = PME_DATOS[id] || {};
  const amb = (j.match || []).map((m, i) => ({i: i, m: m, ls: [], nts: (j.nts || {})[i] || null}));
  (j.pme || []).forEach(r => { const a = amb[r.ia]; if(a) a.ls.push(r); });

  const disPmf = {};
  (j.pmf || []).forEach(p => { if(p.res !== 'Compatible') disPmf[p.cod] = p; });

  amb.forEach(a => {
    const m = a.m;
    a.ren = pmeRenglones(a, j);
    a.unid = a.ls.reduce((s, r) => s + (r.fin || 0), 0);
    a.oc = a.ren.filter(x => x.p === 'OC').length;
    a.anul = a.ren.filter(x => x.est === 'anul').length;
    a.cero = a.ren.filter(x => x.est === 'cero').length;
    a.avisos = [];
    if(a.nts && (a.nts.partes || []).length > 1){
      a.avisos.push(['unidos', 'Dos ambientes en una línea',
        'El PMA junta dos ambientes de la norma en esta línea: se equipa con las dos listas, y de los '
        + 'códigos que piden las dos manda la mayor cantidad, no se suman']);
    }
    if(a.anul) a.avisos.push(['unif', 'Renglones anulados',
      a.anul + (a.anul === 1 ? ' renglón anulado' : ' renglones anulados') + ' por unificación']);
    if((m.conf || '').indexOf('Propuesta') === 0){
      a.avisos.push(['prop', 'Emparejado por propuesta',
        'El ambiente de la NTS lo elegimos nosotros' + (m.nota ? ' — ' + m.nota : '')]);
    }
    if(!m.ambnts) a.avisos.push(['sinnts', 'Sin ambiente en la NTS',
      'No se equipa, queda declarado' + (m.nota ? ' — ' + m.nota : '')]);
    if(m.pmf && disPmf[m.pmf]) a.avisos.push(['pmf', 'Discrepancia PMF–PMA', disPmf[m.pmf].det]);
    if(a.cero) a.avisos.push(['cero', 'En cero', a.cero + ' renglones declarados y en cero']);
  });

  PME_IX[id] = {amb: amb, j: j};
  return PME_IX[id];
}

/* Los renglones de la norma del ambiente, en el orden de la norma, cada
   uno con su línea del PME y qué pasó con él. Las líneas del PME salen
   de la norma y en su mismo orden, así que se recorren a la vez. */
function pmeRenglones(a, j){
  const out = [];
  if(!a.nts) return out;
  const libres = a.ls.slice();
  const vistos = {};
  a.nts.eq.forEach((par, k) => {
    const cod = par[0], qn = par[1], ip = par[2] || 0, unido = par[3] === 1;
    const c = (j.cat || {})[cod] || ['(sin descripción en el catálogo)', '', 'EQ'];
    const p = c[2];
    const kv = ip + '|' + cod;
    vistos[kv] = (vistos[kv] || 0) + 1;

    let ln = null;
    if(p !== 'OC' && !unido){
      const n = libres.findIndex(r => r.c === cod);
      if(n >= 0) ln = libres.splice(n, 1)[0];
    }
    let est = 'ok';
    if(p === 'OC') est = 'oc';
    else if(unido) est = 'anul';
    else if(!ln) est = 'falta';
    else if((ln.fin || 0) === 0) est = 'cero';
    /* El rojo es para la segunda aparición en adelante: el primer
       renglón es legítimo, el que sobra es el repetido. */
    if(p !== 'OC' && !unido && vistos[kv] > 1) est = 'dup';

    const parte = (a.nts.partes || [])[ip] || null;
    out.push({j: k + 1, c: cod, d: c[0], t: c[1], p: p, qn: qn, ln: ln, est: est,
              ip: ip, parte: parte, norma: parte ? parte.n : a.nts.n});
  });
  return out;
}

const PME_QUE_PASO = {
  ok:    ['copiado', 'ok'],
  oc:    ['no se metra · OC', 'oc'],
  anul:  ['anulado por unificación', 'unif'],
  dup:   ['repetido en la norma', 'mal'],
  cero:  ['en cero', 'unif'],
  falta: ['no llegó al PME', 'mal'],
};

/* ─────────────────────── EL PANEL ─────────────────────── */

function pmePane(d, id){
  const ix = pmeIdx(id);
  const j = ix.j, m = j.meta || {}, c = j.c || {};
  const cif = (n, t, s) => `<div class="ex-cifra"><b>${esc(nf(n))}</b><span>${esc(t)}</span>
    ${s ? `<i>${esc(s)}</i>` : ''}</div>`;

  const upss = [];
  ix.amb.forEach(a => { if(upss.indexOf(a.m.upss) < 0) upss.push(a.m.upss); });

  return `<div class="pme-pane" data-id="${esc(id)}">
    <div class="tab-head">
      <h4>El PME contra el PMF, el PMA y la NTS</h4>
      <span class="th-nota">${esc(m.normas || '')}${m.generado ? ' · armado el ' + esc(m.generado) : ''}</span>
    </div>
    <p class="ex-nota">El alcance lo manda el <b>PMA</b>; el <b>PMF</b> aporta los códigos de ambiente y
      debe estar contenido en él. Las listas de equipos salen de la <b>NTS</b>, y cuando el ambiente no
      está en la norma se declara y no se equipa. Sólo se metra el equipo <b>EQ</b>: el <b>OC</b> queda
      fuera por regla. Las líneas en cero no se borran: son la trazabilidad de lo descartado.</p>
    <div class="ex-cifras">
      ${cif(c.act || 0, 'ambientes con norma', 'de ' + nf((j.match || []).length) + ' del PMA')}
      ${cif(c.lineas || 0, 'líneas de equipo', 'una por ambiente y código')}
      ${cif(c.unid || 0, 'unidades', 'sólo EQ')}
      ${cif(c.sinm || 0, 'sin ambiente en la NTS', 'declarados, sin equipar')}
      ${cif(c.dis || 0, 'discrepancias PMF–PMA', 'por resolver')}
    </div>

    <div class="pme-filtros">
      <input type="search" class="pme-buscar" value="${esc(PMEV.q)}"
        placeholder="Buscar ambiente, código de ambiente o de equipo (M-9, D-140, CES-002…)"
        oninput="pmeBuscar(this.value)">
      <select onchange="pmeFiltroUpss(this.value)">
        <option value="">Todas las UPSS / UPS</option>
        ${upss.map(u => `<option value="${esc(u)}" ${PMEV.upss === u ? 'selected' : ''}>${esc(u)}</option>`).join('')}
      </select>
      <span class="th-nota" id="pmeCuenta">${pmeFiltradas(id).length} de ${ix.amb.length} ambientes</span>
    </div>

    <div class="pme-wrap">${pmeTabla(id)}</div>
  </div>`;
}

/* El id del expediente que se está mirando, para los manejadores de los
   controles: así no hay que meterlo en cada atributo. */
function pmeId(){
  const e = document.querySelector('.pme-pane');
  return e ? e.getAttribute('data-id') : '';
}

function pmeBuscar(v){ PMEV.q = v; pmeRepintar(); }
function pmeFiltroUpss(v){ PMEV.upss = v; PMEV.abierto = null; pmeRepintar(); }
function pmeAbrir(i){ PMEV.abierto = (PMEV.abierto === i) ? null : i; pmeRepintar(); }
function pmePlegar(u){ PMEV.plegadas[u] = !PMEV.plegadas[u]; pmeRepintar(); }

/* Se repinta sólo la tabla: con la pestaña entera, el buscador perdería
   el cursor a cada letra. */
function pmeRepintar(){
  const id = pmeId();
  const caja = document.querySelector('.pme-wrap');
  if(id && caja) caja.innerHTML = pmeTabla(id);
}

function pmeFiltradas(id){
  const ix = pmeIdx(id);
  const q = PMEV.q.trim().toLowerCase();
  return ix.amb.filter(a => {
    const m = a.m;
    if(PMEV.upss && m.upss !== PMEV.upss) return false;
    if(!q) return true;
    const cab = (m.upss + ' ' + m.amb + ' ' + (m.ambnts || '') + ' ' + (m.cod || '') + ' ' +
                 (m.cods || '') + ' ' + (m.pmf || '') + ' ' + (m.nota || '')).toLowerCase();
    if(cab.indexOf(q) >= 0) return true;
    return a.ren.some(x => (x.c + ' ' + x.d).toLowerCase().indexOf(q) >= 0);
  });
}

function pmeTabla(id){
  const ix = pmeIdx(id);
  const ls = pmeFiltradas(id);
  const cuenta = document.getElementById('pmeCuenta');
  if(cuenta) cuenta.textContent = ls.length + ' de ' + ix.amb.length + ' ambientes';
  if(!ls.length) return '<p class="pme-no">Nada con ese texto.</p>';

  let upss = null, h = `<table class="ex-tabla pme-tabla"><thead><tr>
      <th></th><th>Cód. PMF</th><th>Ambiente (PMF)</th>
      <th>Cód. amb.</th><th>Ambiente (PMA)</th><th class="n">Pág.</th><th class="n">N.º</th><th class="n">Área</th>
      <th>Norma</th><th>Cód. NTS</th><th>Ambiente (NTS)</th><th>Emparejado</th>
      <th class="n">Norma</th><th class="n">PME</th><th class="n">Unid.</th><th>Avisos</th>
    </tr></thead><tbody>`;

  ls.forEach(a => {
    const m = a.m;
    if(m.upss !== upss){
      upss = m.upss;
      const dentro = ls.filter(x => x.m.upss === upss);
      const pl = !!PMEV.plegadas[upss];
      h += `<tr class="pme-upss"><td colspan="16">
        <button type="button" onclick="pmePlegar(${JSON.stringify(upss).replace(/"/g, '&quot;')})">${pl ? '+' : '−'}</button>
        <b>${esc(upss)}</b>
        <small>${dentro.length} ambientes · ${nf(dentro.reduce((s, x) => s + x.ls.length, 0))} líneas ·
          ${nf(dentro.reduce((s, x) => s + x.unid, 0))} unidades</small></td></tr>`;
    }
    if(PMEV.plegadas[upss]) return;

    const ab = PMEV.abierto === a.i;
    h += `<tr class="pme-fila ${ab ? 'abierta' : ''}">
      <td class="pme-abrir"><button type="button" onclick="pmeAbrir(${a.i})"
        aria-expanded="${ab}">${ab ? '−' : '+'}</button></td>
      <td class="pme-cod">${m.pmf ? esc(m.pmf) : '<span class="pme-nd">—</span>'}</td>
      <td class="pme-amb">${m.pmf ? esc(pmeAmbPmf(ix.j, m.pmf)) : '<span class="pme-nd">no está en el PMF</span>'}</td>
      <td class="pme-cod">${esc(m.cods || '')}</td>
      <td class="pme-amb"><b>${esc(m.amb)}</b>${m.obs ? `<small>«${esc(m.obs)}»</small>` : ''}</td>
      <td class="n">${esc(m.pag)}</td>
      <td class="n">${m.n === '' || m.n == null ? '—' : esc(m.n)}</td>
      <td class="n">${m.area ? esc(m.area) : '—'}</td>
      <td>${esc(m.norma || '')}</td>
      <td class="pme-cod">${m.cod ? esc(m.cod) : '<span class="pme-nd">—</span>'}</td>
      <td class="pme-amb">${m.ambnts ? esc(m.ambnts) : '<span class="pme-nd">sin ambiente en la NTS</span>'}
        ${a.nts ? `<small>${esc(a.nts.id)}</small>` : ''}</td>
      <td class="pme-conf">${esc(m.conf || '')}</td>
      <td class="n">${a.ren.length ? nf(a.ren.length) : '—'}${a.oc ? `<small>${a.oc} OC</small>` : ''}</td>
      <td class="n">${nf(a.ls.length)}</td>
      <td class="n">${nf(a.unid)}</td>
      <td class="pme-avisos">${a.avisos.map(x =>
        `<span class="pme-av ${x[0]}" title="${esc(x[2])}">${esc(x[1])}</span>`).join('')}</td>
    </tr>`;
    if(ab) h += `<tr class="pme-det"><td colspan="16">${pmeDetalle(a, ix.j)}</td></tr>`;
  });

  return h + '</tbody></table>';
}

function pmeAmbPmf(j, cod){
  const p = (j.pmf || []).find(x => x.cod === cod);
  return p ? p.amb : '';
}

/* El detalle: la lista de la norma renglón por renglón, con las mismas
   columnas del LS y su letra. */
function pmeDetalle(a, j){
  const m = a.m;
  if(!a.nts){
    return `<div class="pme-caja"><p class="pme-no"><b>Este ambiente no tiene lista de norma.</b>
      No se encontró equivalente en la NTS 113, la 110 ni la 119${m.nota ? ' — ' + esc(m.nota) : ''}.
      No se equipa, pero queda en el PME para que se vea que se miró y no que se olvidó.</p></div>`;
  }
  const partes = a.nts.partes || [];
  const eq = a.ren.filter(x => x.p !== 'OC').length;

  let parte = -1;
  const filas = a.ren.map(x => {
    let banda = '';
    /* Con dos listas pegadas, una banda dice dónde empieza cada una: si
       no, parece una sola lista con renglones repetidos sin motivo. */
    if(partes.length > 1 && x.ip !== parte){
      parte = x.ip;
      const p = partes[x.ip];
      banda = `<tr class="pme-parte"><td colspan="9"><b>${String.fromCharCode(65 + x.ip)} ·
        ${esc(p.id)} · ${esc(p.amb)}</b> <small>${esc(p.cod || '')} · NTS ${esc(p.n)} ·
        ${nf(p.ne)} renglones de la norma</small></td></tr>`;
    }
    const et = PME_QUE_PASO[x.est] || ['', ''];
    return banda + `<tr class="${x.est}">
      <td class="n">${x.j}</td>
      <td>NTS ${esc(x.norma)}</td>
      <td class="pme-cod">${esc(x.c)}</td>
      <td class="pme-desc">${esc(x.d)}</td>
      <td class="n">${nf(x.qn)}</td>
      <td>${esc(x.t)}</td>
      <td>${esc(x.p)}</td>
      <td class="n">${x.ln ? nf(x.ln.fin || 0) : '—'}</td>
      <td><span class="pme-rep ${et[1]}">${esc(et[0])}</span></td>
    </tr>`;
  }).join('');

  return `<div class="pme-caja">
    <p class="pme-cab">
      <span class="pme-cod-amb">${esc(m.cods || '')}</span>
      <b>${partes.length > 1
        ? partes.map(p => 'NTS ' + p.n + ' · ' + p.id + ' · ' + p.amb).map(esc).join(' + ')
        : esc('NTS ' + a.nts.n + ' · ' + a.nts.id + ' · ' + a.nts.amb)}</b>
      ${m.pmf ? `<span class="pme-cod-pmf">código del PMF: <b>${esc(m.pmf)}</b></span>` : ''}
      trae <b>${nf(a.ren.length)}</b> renglones: <b>${nf(eq)}</b> EQ que se metran y
      <b>${nf(a.oc)}</b> OC que no. Al PME entraron <b>${nf(a.ls.length)}</b> líneas y
      <b>${nf(a.unid)}</b> unidades.${a.nts.hoja
        ? ` Excel de normas: hoja <b>${esc(a.nts.hoja)}</b>, filas ${esc(a.nts.f0)}–${esc(a.nts.f1)}.` : ''}
    </p>
    ${a.avisos.length ? `<ul class="pme-avlista">${a.avisos.map(x =>
      `<li class="${x[0]}"><b>${esc(x[1])}</b> — ${esc(x[2])}</li>`).join('')}</ul>` : ''}
    <table class="ex-tabla pme-eq">
      <thead><tr>
        <th class="n">N.º</th><th>NTS <i>A</i></th><th>Código <i>O</i></th>
        <th>Descripción <i>P</i></th><th class="n">Cant. norma</th>
        <th>Tipo <i>R</i></th><th>EQ/OC <i>S · T</i></th>
        <th class="n">Cant. PME <i>Q</i></th><th>Qué pasó</th>
      </tr></thead>
      <tbody>${filas}</tbody>
    </table>
    <p class="th-nota">Cada columna lleva la letra que le toca en la hoja
      <b>PI_POR_ESPECILIDAD_F5</b> del LS, para cotejar una contra otra sin traducir nada.</p>
  </div>`;
}
