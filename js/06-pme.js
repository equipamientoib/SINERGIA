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
const PMEV = {q: '', upss: '', abierto: null, plegadas: {},
              alerta: '', cod: '', res: false, log: false, pmf: false};

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

  /* Cuantos ambientes comparten cada grupo de unificacion. */
  const porGrupo = {};
  amb.forEach(a => { if(a.m.grupo) porGrupo[a.m.grupo] = (porGrupo[a.m.grupo] || 0) + 1; });

  amb.forEach(a => {
    const m = a.m;
    a.ren = pmeRenglones(a, j, id);
    a.unid = a.ren.reduce((s, x) => s + (x.p === 'OC' ? 0 : x.q), 0);
    a.react = a.ren.filter(x => x.est === 'react').length;
    a.oc = a.ren.filter(x => x.p === 'OC').length;
    a.anul = a.ren.filter(x => x.est === 'anul').length;
    a.cero = a.ren.filter(x => x.est === 'cero').length;
    a.avisos = [];
    const oAmb = pmeRev(id).obs[m.cods || ''];
    const oRen = a.ren.filter(x => pmeRev(id).obsr[(m.cods || '') + '|' + x.c + '|' + x.j]).length;
    if(oAmb || oRen) a.avisos.push(['obs', 'Con observación tuya',
      (oAmb ? 'Tienes puesta una observación' : 'Tienes observaciones')
      + (oRen ? ' y ' + oRen + ' en renglones' : '') + ' en este ambiente']);
    if(a.react) a.avisos.push(['react', 'Reactivado por ti',
      a.react + (a.react === 1 ? ' renglón que la unificación había anulado y volviste a meter'
                               : ' renglones que la unificación había anulado y volviste a meter')]);
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
    /* Un codigo que la NTS trae dos veces en la misma lista: el ambiente
       se lleva el doble y eso si es un error de la norma. */
    const dups = [...new Set(a.ren.filter(x => x.est === 'dup').map(x => x.c))];
    if(dups.length) a.avisos.push(['dup', 'Repetido en la norma',
      'La norma trae el renglon repetido y el ambiente se lleva el doble: ' + dups.join(', ')]);
    if(m.grupo) a.avisos.push(['unif2', 'Ambientes unificados',
      'Unificado en el grupo ' + m.grupo + ' con ' + ((porGrupo[m.grupo] || 1) - 1)
      + ' ambiente(s) mas: la lista de equipos se une y no se suma']);
  });

  PME_IX[id] = {amb: amb, j: j};
  return PME_IX[id];
}

/* Los renglones de la norma del ambiente, en el orden de la norma, cada
   uno con su línea del PME y qué pasó con él. Las líneas del PME salen
   de la norma y en su mismo orden, así que se recorren a la vez. */
function pmeRenglones(a, j, id){
  const out = [];
  if(!a.nts) return out;
  const libres = a.ls.slice();
  const vistos = {};
  /* La llave de una cantidad corregida es CÓDIGO DE AMBIENTE | código |
     la vez que ese código se repite dentro del ambiente, la misma que
     usa la herramienta local. Nada de índices: así lo corregido sigue
     en su sitio cuando la base se vuelve a generar. */
  const veces = {};
  const cods = a.m.cods || '';
  const rev = pmeRev(id);
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

    /* Cuánto vale hoy este renglón: lo que trae el dato publicado, o lo
       que corregiste al fiscalizar. El anulado no tiene línea, pero si
       lo reactivaste entra con tu cantidad. */
    let kq = '', q = 0, tocada = false;
    const kf = cods + '|' + cod + '|u' + (k + 1);
    if(unido && p !== 'OC'){
      q = Math.max(0, Number(rev.forz[kf]) || 0);
    }else if(ln){
      veces[cod] = (veces[cod] || 0) + 1;
      kq = cods + '|' + cod + '|' + veces[cod];
      q = pmeQRev(id, kq, ln.fin || 0);
      tocada = q !== (ln.fin || 0);
    }

    let est = 'ok';
    if(p === 'OC') est = 'oc';
    else if(unido) est = q > 0 ? 'react' : 'anul';
    else if(!ln) est = 'falta';
    else if(q === 0) est = 'cero';
    /* El rojo es para la segunda aparición en adelante: el primer
       renglón es legítimo, el que sobra es el repetido. */
    if(p !== 'OC' && !unido && vistos[kv] > 1) est = 'dup';

    const parte = (a.nts.partes || [])[ip] || null;
    out.push({j: k + 1, c: cod, d: c[0], t: c[1], p: p, qn: qn, ln: ln, est: est,
              ip: ip, parte: parte, norma: parte ? parte.n : a.nts.n,
              kq: kq, kf: kf, q: q, tocada: tocada, unido: unido, vez: vistos[kv]});
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

  /* Con la clave de revisión se abre la herramienta de armado tal cual
     es —la misma de la carpeta 0. PME, con su cabecera, sus pestañas y
     su cajón de cotejo—, no una copia suya. Lo que se corrige dentro se
     guarda en el navegador igual que en local. */
  if(PME_EDITA && PME_HERRAMIENTA[id]){
    /* El marco no se pinta aquí: cuelga del <body>. Ver pmeHerramienta(). */
    return `<div class="pme-pane" data-id="${esc(id)}">
      <p class="ex-nota">La herramienta de armado está abierta a pantalla completa.</p>
    </div>`;
  }
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

    ${pmeBarraEdicion(id)}
    ${pmeAvisos(id)}
    ${pmeFicha(id)}
    ${pmePmfPma(id)}
    ${pmeBitacora(id)}
    ${pmeConsolidado(id)}

    <h5 class="pme-h5">PMF · PMA · NTS, ambiente por ambiente</h5>
    <div class="pme-filtros">
      <input type="search" class="pme-buscar" value="${esc(PMEV.q)}"
        placeholder="Buscar ambiente, código de ambiente o de equipo (M-9, D-140, CES-002…)"
        oninput="pmeBuscar(this.value)">
      <select onchange="pmeFiltroUpss(this.value)">
        <option value="">Todas las UPSS / UPS</option>
        ${upss.map(u => `<option value="${esc(u)}" ${PMEV.upss === u ? 'selected' : ''}>${esc(u)}</option>`).join('')}
      </select>
      ${PMEV.alerta ? `<button type="button" class="ex-btn" onclick="pmeAlerta('${PMEV.alerta}')">
        Quitar el filtro «${esc(PME_ALERTAS[PMEV.alerta][0])}» ✕</button>` : ''}
      <button type="button" class="ex-btn" onclick="pmePlegarTodas(true)">Plegar todas</button>
      <button type="button" class="ex-btn" onclick="pmePlegarTodas(false)">Desplegar todas</button>
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
    if(PMEV.alerta && !a.avisos.some(x => x[0] === PMEV.alerta)) return false;
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
    /* Sin lista de norma no hay nada que equipar, pero el ambiente sí
       está en el PMA: cotejarlo contra su página es justamente lo que
       hay que hacer para ver por qué no tiene equivalente. */
    return `<div class="pme-caja">
      ${pmeFuentes(a, j)}
      <p class="pme-no"><b>Este ambiente no tiene lista de norma.</b>
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
      <td class="n pme-q">${pmeCeldaQ(a, x)}</td>
      <td><span class="pme-rep ${et[1]}">${esc(et[0])}${
          x.est === 'dup' ? ' · ' + x.vez + '.º renglón' : ''}</span>
        ${x.est === 'react' ? '<small>lo anuló la unificación y lo volviste a meter: entra como línea aparte</small>' : ''}
        ${PME_EDITA ? `<button type="button" class="pme-lapiz ${oRen(a, x) ? 'puesta' : ''}
          ${oRen(a, x) && oRen(a, x).mal ? 'mal' : ''}" title="Observar este renglón"
          onclick="pmeAbrirObsRen(${a.i}, ${x.j})">✎</button>` : ''}</td>
    </tr>${PME_EDITA ? `
    <tr class="pme-obsr ${oRen(a, x) ? 'abierta' : ''}" id="pme-obsr-${a.i}-${x.j}">
      <td colspan="9">${pmeCajaObs((a.m.cods || '') + '|' + x.c + '|' + x.j, true,
        'Observación sobre el renglón ' + x.j + ' · ' + x.c)}</td>
    </tr>` : ''}`;
  }).join('');

  return `<div class="pme-caja">
    ${pmeFuentes(a, j)}
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
    ${PME_EDITA ? pmeCajaObs(m.cods || '', false, 'Tu observación sobre este ambiente') : ''}
    <p class="th-nota">Cada columna lleva la letra que le toca en la hoja
      <b>PI_POR_ESPECILIDAD_F5</b> del LS, para cotejar una contra otra sin traducir nada.</p>
  </div>`;
}

/* ═══════════════ LO QUE HAY QUE MIRAR ═══════════════
   Los mismos avisos que la herramienta de fiscalización, y cada uno
   filtra la tabla. Falta «con observación tuya»: las observaciones
   viven en el navegador de quien revisa y todavía no se publican. */

const PME_ALERTAS = {
  obs:    ['Con observación tuya', 'lo que marcaste al fiscalizar'],
  react:  ['Reactivado por ti', 'la unificación lo anuló y lo volviste a meter'],
  unif2:  ['Ambientes unificados', 'comparten ambiente: la lista se une'],
  unidos: ['Dos ambientes en una línea', 'el PMA junta dos ambientes de la NTS'],
  dup:    ['Repetido en la norma', 'la NTS trae el renglón dos veces'],
  pmf:    ['Discrepancia PMF–PMA', 'el PMF y el PMA no dicen lo mismo'],
  prop:   ['Emparejado por propuesta', 'el ambiente NTS lo elegimos nosotros'],
  sinnts: ['Sin ambiente en la NTS', 'no se equipa, queda declarado'],
  unif:   ['Renglones anulados', 'unificación: no se suma, manda la mayor'],
  cero:   ['No se equipa', 'retirado, sin N.º o funciona en otro']
};

function pmeAlerta(t){
  PMEV.alerta = PMEV.alerta === t ? '' : t;
  PMEV.abierto = null;
  pmeRepintarTodo();
}

function pmeAvisos(id){
  const ix = pmeIdx(id);
  const c = {};
  Object.keys(PME_ALERTAS).forEach(t => {
    c[t] = ix.amb.filter(a => a.avisos.some(x => x[0] === t)).length;
  });
  return `
  <h5 class="pme-h5">Qué hay que mirar</h5>
  <p class="ex-nota">Un código <b>repetido en la norma</b> sí es un error: la lista de la NTS trae el
    renglón dos veces y el ambiente termina con el doble. Un renglón <b>anulado por unificación</b> no
    lo es: es la regla de no sumar. Un <b>OC</b> tampoco: no se metra. Y un código que aparece en muchos
    ambientes es lo normal; haz clic en él y sale en cuáles.</p>
  <div class="ex-cifras pme-avb-fila">
    ${Object.keys(PME_ALERTAS).map(t => `
      <button type="button" class="ex-cifra pme-avb ${PMEV.alerta === t ? 'act' : ''}
        ${c[t] && (t === 'dup' || t === 'pmf') ? 'mal' : ''}" onclick="pmeAlerta('${t}')">
        <b>${esc(nf(c[t]))}</b><span>${esc(PME_ALERTAS[t][0])}</span>
        <i>${esc(PME_ALERTAS[t][1])}</i>
      </button>`).join('')}
  </div>`;
}

/* ═══════════════ LA FICHA DE UN CÓDIGO ═══════════════
   En qué ambientes está un equipo y con cuánto en cada uno. Es lo que
   responde «este código, ¿por qué sale 40 veces?». */

function pmeCod(c){ PMEV.cod = PMEV.cod === c ? '' : c; pmeRepintarTodo(); }

function pmeFicha(id){
  const cod = PMEV.cod;
  if(!cod) return '';
  const ix = pmeIdx(id);
  const cat = (ix.j.cat || {})[cod] || ['(sin descripción en el catálogo)', '', 'EQ'];
  const donde = [];
  ix.amb.forEach(a => {
    a.ren.forEach(x => {
      if(x.c !== cod) return;
      donde.push({a: a, x: x, q: x.ln ? (x.ln.fin || 0) : 0});
    });
  });
  const total = donde.reduce((s, d) => s + d.q, 0);
  return `<div class="pme-ficha">
    <div class="pme-ficha-cab">
      <b>${esc(cod)}</b> ${esc(cat[0])}
      <span class="th-nota">${esc(cat[2])}${cat[1] ? ' · ' + esc(cat[1]) : ''}</span>
      <button type="button" class="ex-btn" onclick="pmeCod('${esc(cod)}')">Cerrar ✕</button>
    </div>
    <p class="ex-nota">Está en <b>${esc(nf(donde.length))}</b> renglones de la norma, en
      <b>${esc(nf(new Set(donde.map(d => d.a.i)).size))}</b> ambientes, y suma
      <b>${esc(nf(total))}</b> unidades en el PME.</p>
    <table class="ex-tabla pme-tabla pme-tabla-ficha"><thead><tr>
      <th>Cód. amb.</th><th>Ambiente</th><th>UPSS / UPS</th>
      <th class="n">Norma</th><th class="n">PME</th><th>Qué pasó</th>
    </tr></thead><tbody>
    ${donde.map(d => {
      const q = PME_QUE_PASO[d.x.est] || ['copiado', 'ok'];
      return `<tr>
        <td class="pme-cod">${esc(d.a.m.cods || '')}</td>
        <td class="pme-amb">${esc(d.a.m.amb || '')}</td>
        <td class="pme-upss-c">${esc(d.a.m.upss || '')}</td>
        <td class="n">${esc(nf(d.x.qn || 0))}</td>
        <td class="n">${esc(nf(d.q))}</td>
        <td><span class="pme-rep ${q[1]}">${esc(q[0])}</span></td>
      </tr>`;
    }).join('')}
    </tbody></table>
  </div>`;
}

/* ═══════════════ EL CONSOLIDADO ═══════════════
   Todo el equipamiento sumado por código: lo que de verdad se compra. */

function pmeVerRes(){ PMEV.res = !PMEV.res; pmeRepintarTodo(); }

function pmeConsolidado(id){
  const ix = pmeIdx(id);
  const ls = ix.j.res || [];
  if(!ls.length) return '';
  const tot = ls.reduce((s, r) => s + (r.q || 0), 0);
  return `<h5 class="pme-h5">Todo el equipamiento, por código
    <button type="button" class="ex-btn" onclick="pmeVerRes()">
      ${PMEV.res ? 'Ocultar' : 'Ver los ' + nf(ls.length) + ' códigos'}</button></h5>
  <p class="ex-nota">Cada código una vez, con lo que suma en todo el establecimiento y en cuántos
    ambientes aparece. Son <b>${esc(nf(ls.length))}</b> códigos y <b>${esc(nf(tot))}</b> unidades.</p>
  ${PMEV.res ? `<div class="pme-wrap-2"><table class="ex-tabla pme-tabla"><thead><tr>
    <th>Código</th><th>Descripción</th><th>Tipo</th><th>EQ/OC</th>
    <th class="n">Unid.</th><th class="n">Ambientes</th><th>Norma</th>
  </tr></thead><tbody>
  ${ls.map(r => `<tr>
    <td class="pme-cod"><button type="button" class="pme-cod-b"
      onclick="pmeCod('${esc(r.c)}')">${esc(r.c)}</button></td>
    <td>${esc(r.d || '')}</td><td>${esc(r.t || '')}</td><td>${esc(r.p || '')}</td>
    <td class="n">${esc(nf(r.q || 0))}</td><td class="n">${esc(nf(r.amb || 0))}</td>
    <td>${esc((r.normas || []).join(' · '))}</td>
  </tr>`).join('')}
  </tbody></table></div>` : ''}`;
}

/* ═══════════════ LA BITÁCORA ═══════════════
   Por qué cada ambiente quedó emparejado como quedó. Es el rastro de la
   auditoría: quién lo decidió, qué decidió y en qué ambiente. */

function pmeVerLog(){ PMEV.log = !PMEV.log; pmeRepintarTodo(); }

function pmeBitacora(id){
  const ls = (pmeIdx(id).j.log) || [];
  if(!ls.length) return '';
  return `<h5 class="pme-h5">Bitácora del emparejamiento
    <button type="button" class="ex-btn" onclick="pmeVerLog()">
      ${PMEV.log ? 'Ocultar' : 'Ver las ' + nf(ls.length) + ' entradas'}</button></h5>
  <p class="ex-nota">Cada decisión que se tomó al emparejar el PMA con la NTS, con su porqué. Lo que
    no sale aquí es porque vino heredado del PMA visado sin cambio.</p>
  ${PMEV.log ? `<div class="pme-wrap-2"><table class="ex-tabla pme-tabla pme-log"><thead><tr>
    <th>Dónde</th><th>Qué se decidió</th><th>Quién</th>
  </tr></thead><tbody>
  ${ls.map(r => `<tr>
    <td class="pme-amb">${esc(r.where || '')}</td>
    <td>${esc(r.what || '')}</td>
    <td class="pme-quien">${esc(r.who || '')}</td>
  </tr>`).join('')}
  </tbody></table></div>` : ''}`;
}

function pmePlegarTodas(plegar){
  const ix = pmeIdx(pmeId());
  PMEV.plegadas = {};
  if(plegar) ix.amb.forEach(a => { PMEV.plegadas[a.m.upss] = true; });
  PMEV.abierto = null;
  pmeRepintar();
}

/* Al tocar un filtro o abrir una ficha cambia toda la pestaña, no sólo
   la tabla: los cuadros tienen que marcarse y la ficha aparecer. */
function pmeRepintarTodo(){
  const id = pmeId();
  const p = document.querySelector('.pme-pane');
  if(id && p) p.outerHTML = pmePane(null, id);
  pmeHerramienta();
}

/* ── La herramienta de armado, a pantalla completa ──
   Cuelga del <body> y no del panel: `.page.active` lleva un transform
   —la animación de entrada— y un transform atrapa a todo lo que esté
   `position:fixed` dentro. Dentro del panel, el marco se quedaba en
   378px de alto en vez de los 900 de la ventana, su barra de pestañas
   se anclaba al marco en vez de a la pantalla y el cajón de cotejo se
   repartía el ancho del marco. Colgado del body, el marco ES la
   ventana y la herramienta se comporta igual que con doble clic.

   Y no se vuelve a crear si ya está: el iframe recargaría, y con él la
   herramienta entera. */
function pmeHerramienta(){
  const id = pmeId();
  const quiere = id && PME_EDITA && PME_HERRAMIENTA[id] && document.querySelector('.pme-pane');
  let e = document.getElementById('pmeHerramienta');
  if(!quiere){
    if(e) e.remove();
    document.body.classList.remove('con-herramienta');
    return;
  }
  if(e) return;
  const u = PME_HERRAMIENTA[id];
  e = document.createElement('div');
  e.id = 'pmeHerramienta';
  e.className = 'pme-lleno';
  e.innerHTML = `<iframe src="${esc(u)}" title="Herramienta de armado del PME"></iframe>
    <div class="pme-lleno-b">
      <button type="button" class="ex-btn" onclick="pmeCerrarEdicion()">‹ Volver al expediente</button>
      <a class="ex-btn" href="${esc(u)}" target="_blank" rel="noopener">Abrir aparte</a>
    </div>`;
  document.body.appendChild(e);
  document.body.classList.add('con-herramienta');
}

/* ═══════════════ PMF CONTRA PMA ═══════════════
   El PMF tiene que estar contenido en el PMA. Lo que no cuadra no cuelga
   de ningún ambiente —justamente porque no lo encontró— así que va en su
   propio bloque: si no, las discrepancias se cuentan arriba y no están
   en ninguna parte. */

function pmeVerPmf(){ PMEV.pmf = !PMEV.pmf; pmeRepintarTodo(); }

function pmePmfPma(id){
  const ls = (pmeIdx(id).j.pmf) || [];
  const mal = ls.filter(p => p.res !== 'Compatible');
  if(!ls.length) return '';
  const dis = mal.filter(p => p.res === 'Discrepancia').length;
  return `<h5 class="pme-h5">El PMF dentro del PMA
    <button type="button" class="ex-btn" onclick="pmeVerPmf()">
      ${PMEV.pmf ? 'Ocultar' : 'Ver los ' + nf(mal.length) + ' que no cuadran'}</button></h5>
  <p class="ex-nota">De los <b>${esc(nf(ls.length))}</b> renglones del PMF,
    <b>${esc(nf(ls.length - mal.length))}</b> casan con el PMA.
    Quedan <b>${esc(nf(dis))}</b> ${dis === 1 ? 'discrepancia' : 'discrepancias'} y
    <b>${esc(nf(mal.length - dis))}</b> por validar: el PMA no trae códigos, así que esos se
    emparejaron por nombre y hay que confirmarlos.</p>
  ${PMEV.pmf && mal.length ? `<div class="pme-wrap-2"><table class="ex-tabla pme-tabla pme-log"><thead><tr>
    <th>Cód. PMF</th><th>Ambiente (PMF)</th><th class="n">Pág.</th>
    <th>En el PMA</th><th>Estado</th><th>Qué pasa</th>
  </tr></thead><tbody>
  ${mal.map(p => `<tr>
    <td class="pme-cod">${esc(p.cod || '')}</td>
    <td class="pme-amb">${esc(p.amb || '')}</td>
    <td class="n">${esc(String(p.pag == null ? '' : p.pag))}</td>
    <td class="pme-amb">${esc(p.pma || '')}</td>
    <td><span class="pme-rep ${p.res === 'Discrepancia' ? 'mal' : 'unif'}">${esc(p.res || '')}</span></td>
    <td>${esc(p.det || '')}</td>
  </tr>`).join('')}
  </tbody></table></div>` : ''}`;
}

/* ═══════════════ EL CAJÓN DE COTEJO ═══════════════
   Auditar es cotejar contra el papel. Estos paneles abren el PMF y el
   PMA en la página exacta de la que salió la fila, y la hoja de la NTS
   en las filas exactas de las que salió la lista de equipos.

   El cajón vive fuera del panel y sólo se vuelve a armar cuando cambia
   el ambiente que se cotejea: si se repintara con la pestaña, cada clic
   en un filtro recargaría los dos PDF, que tardan. */

const PME_DOCS = {
  /* Cada página va en su propio archivo: el visor del navegador ignora
     el «#page=N» dentro de un iframe y enseña siempre la primera. */
  pmf: {nom: 'Programa Médico Funcional compartido', pags: 2,
        pag: n => 'data/pachas/paginas/pmf-' + n + '.pdf',
        abrir: n => 'data/pachas/PMF-visado.pdf#page=' + n},
  pma: {nom: 'Programa Médico Arquitectónico compartido', pags: 4,
        pag: n => 'data/pachas/paginas/pma-' + n + '.pdf',
        abrir: n => 'data/pachas/PMA-visado.pdf#page=' + n},
  xls: {src: 'data/pachas/NTS_MINSA_113_110_119.xlsx',
        nom: 'Excel de normas NTS 113 / 110 / 119'}
};
/* Sin la barra del visor —son 56 px que aquí no sobran— y la página
   entera a la vista, igual que en la herramienta local. Con «FitH» se
   vería más grande, pero el visor del navegador deja el panel en negro
   hasta que se desplaza: la hoja entera y el botón ⤢ para agrandarla
   son más de fiar. */
const PME_VISOR = '#toolbar=0&navpanes=0&view=Fit';

let PME_COTEJO = null;        // qué ambiente se está cotejando
let PME_CAJON_PUESTO = null;  // el que ya está armado en pantalla
let PME_LIBRO = null;         // el Excel de normas, leído una sola vez
let PME_XLSX = null;

function pmeCotejar(i){ PME_COTEJO = i; pmePintarCajon(); pmeRepintar(); }
function pmeCerrarCotejo(){ PME_COTEJO = null; pmePintarCajon(); pmeRepintar(); }

function pmePintarCajon(){
  let sitio = document.getElementById('pmeCajon');
  /* Fuera de la pestaña del PME no hay nada que cotejar: si el panel ya
     no está en pantalla, el cajón se va con él. */
  if(!document.querySelector('.pme-pane')) PME_COTEJO = null;
  if(PME_COTEJO === null){
    if(sitio) sitio.remove();
    document.body.classList.remove('con-cajon');
    PME_CAJON_PUESTO = null;
    return;
  }
  if(!sitio){
    sitio = document.createElement('div');
    sitio.id = 'pmeCajon';
    document.body.appendChild(sitio);
  }
  document.body.classList.add('con-cajon');
  pmeAnchoCajon();
  if(PME_CAJON_PUESTO === PME_COTEJO) return;
  PME_CAJON_PUESTO = PME_COTEJO;
  sitio.innerHTML = pmeCajon();
  pmeCargarLibro();
}

/* El cajón no tapa la página: la empuja. Al <body> se le pone un hueco
   a la derecha del ancho del cajón, así la tabla se corre y se siguen
   viendo las dos cosas, que es de lo que va auditar. */
const PME_ANCHO_LS = 'pme-cajon-ancho';

function pmeAnchoCajon(){
  let g = 0;
  try{ g = Number(localStorage.getItem(PME_ANCHO_LS)) || 0; }catch(e){}
  /* Si la ventana todavía no está medida, innerWidth vale 0 y el cajón
     se quedaba en 0 px sin volver a abrirse nunca. Un ancho de respaldo
     y un tope que nunca baja del mínimo lo evitan. */
  const w = innerWidth || 1280;
  const a = Math.min(Math.max(g || Math.round(w * 0.52), 420),
                     Math.max(Math.round(w * 0.8), 420));
  document.documentElement.style.setProperty('--pme-cajon', a + 'px');
}

/* Al cambiar el tamaño de la ventana el cajón se recalcula: si se abrió
   estrecho, deja de estarlo en cuanto hay sitio. */
addEventListener('resize', () => { if(PME_COTEJO !== null) pmeAnchoCajon(); });

function pmeTirar(ev){
  ev.preventDefault();
  const mover = e => {
    const x = (e.touches ? e.touches[0] : e).clientX;
    const a = Math.min(Math.max(innerWidth - x, 420), Math.round(innerWidth * 0.8));
    document.documentElement.style.setProperty('--pme-cajon', a + 'px');
    try{ localStorage.setItem(PME_ANCHO_LS, a); }catch(e2){}
  };
  const soltar = () => {
    removeEventListener('mousemove', mover); removeEventListener('mouseup', soltar);
    removeEventListener('touchmove', mover); removeEventListener('touchend', soltar);
  };
  addEventListener('mousemove', mover); addEventListener('mouseup', soltar);
  addEventListener('touchmove', mover, {passive: false}); addEventListener('touchend', soltar);
}

function pmeCajon(){
  const ix = pmeIdx(pmeId());
  const a = ix.amb[PME_COTEJO];
  if(!a) return '';
  const m = a.m;
  const p = (ix.j.pmf || []).find(x => x.cod === m.pmf);
  return `<div class="pme-cajon">
    <div class="pme-tirador" onmousedown="pmeTirar(event)" ontouchstart="pmeTirar(event)"
      title="Arrastra para darle más o menos sitio"></div>
    <div class="pme-cajon-h">
      <div><b>Cotejo del ambiente</b><span>${esc(m.amb || '')} · ${esc(m.upss || '')}</span></div>
      <button type="button" class="ex-btn" onclick="pmeCerrarCotejo()">Cerrar ✕</button>
    </div>
    <div class="pme-cajon-c">
      ${pmePanelPdf('pmf', p ? p.pag : null,
        p ? esc(p.cod || '') + ' · ' + esc(p.amb || '') : 'Este ambiente no está en el PMF')}
      ${pmePanelPdf('pma', m.pag, esc(m.amb || ''))}
      ${pmePanelNts(a)}
    </div>
  </div>`;
}

function pmePanelPdf(doc, pag, sub){
  const t = PME_DOCS[doc];
  if(!pag){
    return `<section class="pme-pan plegado" id="fuente-${doc}">
      <header><button type="button" class="pme-pan-t" onclick="pmePlegarPanel('${doc}')">
        <i>+</i><b>${esc(t.nom)}</b><span>${sub}</span></button></header></section>`;
  }
  return `<section class="pme-pan" id="fuente-${doc}" data-pag="${pag}">
    <header>
      <button type="button" class="pme-pan-t" onclick="pmePlegarPanel('${doc}')">
        <i>−</i><b>${esc(t.nom)}</b><span>${sub}</span></button>
      <div class="pme-pan-nav">
        <button type="button" class="ex-btn" title="Dejar sólo éste grande"
          onclick="pmeSoloEste('${doc}')">⤢</button>
        <button type="button" class="ex-btn" title="Volver a cargar la página"
          onclick="pmeRecargarDoc('${doc}')">↻</button>
        <button type="button" class="ex-btn pme-ant" ${pag <= 1 ? 'disabled' : ''}
          onclick="pmeDocPag('${doc}', -1)">‹</button>
        <span class="pme-pan-p">pág. <b>${pag}</b> de ${t.pags}</span>
        <button type="button" class="ex-btn pme-sig" ${pag >= t.pags ? 'disabled' : ''}
          onclick="pmeDocPag('${doc}', 1)">›</button>
        <a class="ex-btn" href="${t.abrir(pag)}" target="_blank" rel="noopener">Aparte</a>
      </div>
    </header>
    <div class="pme-pan-v"><iframe src="${t.pag(pag) + PME_VISOR}"
      title="${esc(t.nom)} — página ${pag}"></iframe></div>
  </section>`;
}

function pmePlegarPanel(doc){
  const s = document.getElementById('fuente-' + doc);
  if(!s) return;
  s.classList.toggle('plegado');
  const i = s.querySelector('.pme-pan-t i');
  if(i) i.textContent = s.classList.contains('plegado') ? '+' : '−';
}

/* Dejar uno grande: pliega los otros dos. Volver a pulsarlo los abre. */
function pmeSoloEste(doc){
  const otros = ['pmf', 'pma', 'xls'].filter(d => d !== doc);
  const cerrados = otros.every(d => {
    const s = document.getElementById('fuente-' + d);
    return !s || s.classList.contains('plegado');
  });
  otros.forEach(d => {
    const s = document.getElementById('fuente-' + d);
    if(!s) return;
    s.classList.toggle('plegado', !cerrados);
    const i = s.querySelector('.pme-pan-t i');
    if(i) i.textContent = s.classList.contains('plegado') ? '+' : '−';
  });
}

function pmeRecargarDoc(doc){
  const s = document.getElementById('fuente-' + doc);
  const f = s && s.querySelector('iframe');
  if(f) f.src = f.src;
}

function pmeDocPag(doc, d){
  const s = document.getElementById('fuente-' + doc);
  if(!s) return;
  const t = PME_DOCS[doc];
  const pag = Math.min(t.pags, Math.max(1, (Number(s.dataset.pag) || 1) + d));
  s.dataset.pag = pag;
  s.querySelector('iframe').src = t.pag(pag) + PME_VISOR;
  const b = s.querySelector('.pme-pan-p b');
  if(b) b.textContent = pag;
  const ant = s.querySelector('.pme-ant'), sig = s.querySelector('.pme-sig');
  if(ant) ant.disabled = pag <= 1;
  if(sig) sig.disabled = pag >= t.pags;
  const a = s.querySelector('.pme-pan-nav a');
  if(a) a.href = t.abrir(pag);
}

/* ── La hoja de la NTS, tal cual ──
   Las mismas filas de las que salió la lista, con tres de margen arriba
   y abajo para ver dónde empieza y dónde acaba el ambiente. */

function pmePanelNts(a){
  const n = a.nts;
  const t = PME_DOCS.xls;
  if(!n || !n.hoja){
    return `<section class="pme-pan plegado" id="fuente-xls">
      <header><button type="button" class="pme-pan-t" onclick="pmePlegarPanel('xls')">
        <i>+</i><b>${esc(t.nom)}</b><span>Este ambiente no está en la NTS</span></button></header>
    </section>`;
  }
  return `<section class="pme-pan" id="fuente-xls">
    <header>
      <button type="button" class="pme-pan-t" onclick="pmePlegarPanel('xls')">
        <i>−</i><b>${esc(t.nom)}</b>
        <span>NTS ${esc(n.n)} · hoja ${esc(n.hoja)} · filas ${esc(n.f0)}–${esc(n.f1)}</span></button>
      <div class="pme-pan-nav">
        <button type="button" class="ex-btn" title="Dejar sólo éste grande"
          onclick="pmeSoloEste('xls')">⤢</button>
        <a class="ex-btn" href="${t.src}" download>Bajar el Excel</a>
      </div>
    </header>
    <div class="pme-pan-v pme-pan-xls" id="pmeExcel">
      <p class="pme-no">Leyendo el Excel de normas…</p>
    </div>
  </section>`;
}

function pmeSheetJs(){
  if(window.XLSX) return Promise.resolve(window.XLSX);
  if(PME_XLSX) return PME_XLSX;
  PME_XLSX = new Promise((ok, mal) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload = () => window.XLSX ? ok(window.XLSX) : mal(new Error('sin XLSX'));
    s.onerror = () => mal(new Error('no se pudo traer SheetJS'));
    document.head.appendChild(s);
  });
  PME_XLSX.catch(() => { PME_XLSX = null; });
  return PME_XLSX;
}

function pmeCargarLibro(){
  const caja = document.getElementById('pmeExcel');
  if(!caja) return;
  if(PME_LIBRO){ pmePintarHoja(); return; }
  pmeSheetJs().then(XLSX =>
    fetch(PME_DOCS.xls.src).then(r => {
      if(!r.ok) throw new Error('no está el archivo');
      return r.arrayBuffer();
    }).then(buf => {
      PME_LIBRO = XLSX.read(buf, {type: 'array'});
      pmePintarHoja();
    })
  ).catch(() => {
    caja.innerHTML = `<p class="pme-no">No se pudo abrir el Excel de normas.
      <a href="${PME_DOCS.xls.src}" download>Bájalo aquí</a> y ábrelo en tu equipo.</p>`;
  });
}

function pmePintarHoja(){
  const caja = document.getElementById('pmeExcel');
  const ix = pmeIdx(pmeId());
  const a = ix.amb[PME_COTEJO];
  if(!caja || !a || !a.nts || !PME_LIBRO) return;
  const n = a.nts;
  const ws = PME_LIBRO.Sheets[n.hoja];
  if(!ws){
    caja.innerHTML = `<p class="pme-no">El Excel no tiene la hoja <b>${esc(n.hoja)}</b>.</p>`;
    return;
  }
  const XLSX = window.XLSX;
  const rango = XLSX.utils.decode_range(ws['!ref']);
  const desde = Math.max(rango.s.r + 1, n.f0 - 3);
  const hasta = Math.min(rango.e.r + 1, n.f1 + 3);
  const ultima = Math.min(rango.e.c, rango.s.c + 11);
  const suyas = {};
  (n.fil || []).forEach(f => { suyas[f] = true; });

  let cab = '<tr><th class="pme-xf"></th>';
  for(let c = rango.s.c; c <= ultima; c++) cab += '<th>' + XLSX.utils.encode_col(c) + '</th>';
  cab += '</tr>';

  let cuerpo = '';
  for(let f = desde; f <= hasta; f++){
    const mia = suyas[f];
    const dentro = f >= n.f0 && f <= n.f1;
    cuerpo += `<tr class="${mia ? 'pme-xr-eq' : (dentro ? 'pme-xr-amb' : '')}">
      <th class="pme-xf">${f}</th>`;
    for(let c = rango.s.c; c <= ultima; c++){
      const cel = ws[XLSX.utils.encode_cell({r: f - 1, c: c})];
      const v = cel ? (cel.w !== undefined ? cel.w : cel.v) : '';
      cuerpo += '<td>' + esc(v === undefined || v === null ? '' : String(v)) + '</td>';
    }
    cuerpo += '</tr>';
  }

  caja.innerHTML = `<p class="pme-xcab">Hoja <b>${esc(n.hoja)}</b> ·
    el ambiente ocupa las filas <b>${esc(n.f0)}–${esc(n.f1)}</b>, y las resaltadas son
    los ${esc(nf((n.fil || []).length))} renglones de equipo que se copiaron.</p>
    <table class="pme-xl"><thead>${cab}</thead><tbody>${cuerpo}</tbody></table>`;
}

/* Al cambiar de pestaña o de expediente, el cajón tiene que irse con la
   tabla. pintarExpediente es el único sitio por el que pasa todo eso. */
(function engancharCajon(){
  if(typeof window.pintarExpediente !== 'function') return;
  const antes = window.pintarExpediente;
  window.pintarExpediente = function(){
    const r = antes.apply(this, arguments);
    try{ pmePintarCajon(); }catch(e){}
    try{ pmeHerramienta(); }catch(e){}
    return r;
  };
})();

/* El botón de cotejar y la cita de dónde sale cada cosa: la página del
   PMF, la del PMA y las filas del Excel de normas. */
function pmeFuentes(a, j){
  const m = a.m;
  const cotejando = PME_COTEJO === a.i;
  const p = (j.pmf || []).find(x => x.cod === m.pmf);
  const n = a.nts;
  return `<div class="pme-fuentes">
    <button type="button" class="ex-btn ${cotejando ? 'ver' : ''}"
      onclick="${cotejando ? 'pmeCerrarCotejo()' : 'pmeCotejar(' + a.i + ')'}">
      ${cotejando ? 'Cerrar el cotejo ✕' : 'Cotejar con los documentos'}</button>
    <span class="pme-cita">${p ? 'PMF pág. ' + esc(String(p.pag)) : 'no está en el PMF'} ·
      PMA pág. ${esc(String(m.pag))}${n && n.hoja
        ? ' · NTS ' + esc(n.n) + ' hoja ' + esc(n.hoja) + ' filas ' + esc(n.f0) + '–' + esc(n.f1)
        : (n ? ' · NTS ' + esc(n.n) : ' · sin ambiente en la NTS')}</span>
  </div>`;
}

/* La observación puesta sobre un renglón, si la hay. */
function oRen(a, x){
  return pmeRev(pmeId()).obsr[(a.m.cods || '') + '|' + x.c + '|' + x.j];
}

/* La celda de la cantidad. Mirando, el número a secas; revisando, el
   − N + que la corrige. Un renglón anulado por unificación no tiene
   línea, pero se puede reactivar: el + le da la primera unidad y el −
   lo devuelve a anulado cuando llega a cero. */
function pmeCeldaQ(a, x){
  if(x.p === 'OC') return '—';
  if(!PME_EDITA) return x.ln || x.est === 'react' ? nf(x.q) : '—';
  if(x.unido){
    return `<button type="button" class="pme-mas" title="Una menos"
        onclick="pmeForzar('${esc(a.m.cods || '')}', '${esc(x.c)}', ${x.j}, -1)"
        ${x.q <= 0 ? 'disabled' : ''}>−</button>
      <b class="${x.q > 0 ? 'tocada' : ''}">${nf(x.q)}</b>
      <button type="button" class="pme-mas" title="Reactivarlo: entra al PME con esta cantidad"
        onclick="pmeForzar('${esc(a.m.cods || '')}', '${esc(x.c)}', ${x.j}, 1)">+</button>`;
  }
  if(!x.ln) return '—';
  return `<button type="button" class="pme-mas" title="Una menos"
      onclick="pmeSumar('${esc(x.kq)}', -1, ${x.ln.fin || 0})" ${x.q <= 0 ? 'disabled' : ''}>−</button>
    <b class="${x.tocada ? 'tocada' : ''}">${nf(x.q)}</b>
    <button type="button" class="pme-mas" title="Una más"
      onclick="pmeSumar('${esc(x.kq)}', 1, ${x.ln.fin || 0})">+</button>`;
}

/* ═══════════════ FISCALIZAR DESDE LA WEB ═══════════════
   Mirar no basta: fiscalizar es poder decir «aquí van dos, no una» y
   «esto está mal» en el sitio exacto donde se ve.

   Lo que se corrige NO se guarda en el dato publicado: se guarda en el
   navegador de quien revisa, con el MISMO formato que la herramienta
   local —{v:2, q, obs, obsr, extra, forz}—, para que el .json que sale
   de aquí lo abra la herramienta y al revés. De ahí sale el LS.

   El cliente entra a mirar; editar pide una segunda clave que sólo
   tiene quien revisa. Esto no es seguridad de verdad —el dato ya está
   en el navegador de quien abre el expediente— sino el pestillo que
   evita que el cliente cambie el metrado sin querer. Lo que de verdad
   manda es que nada de esto sube a ninguna parte sin el token del
   Apps Script. */

const PME_EDITOR_HASH = '3d79d06ba1fdbdd4f003219bd9ce5ca15f4dcd4bbb4074f3f78d50acaed88605';
/* Dónde vive la herramienta de armado de cada expediente. Es la carpeta
   0. PME publicada tal cual; sin entrada aquí, la pestaña se queda en
   la vista de lectura. */
const PME_HERRAMIENTA = {'pachas-2026': 'pme/pachas/index.html'};
let PME_EDITA = false;
const PME_REV = {};              // la revisión de cada expediente

function pmeRevLs(id){ return 'pme-rev-' + id; }

function pmeRev(id){
  if(PME_REV[id]) return PME_REV[id];
  let d = null;
  try{ d = JSON.parse(localStorage.getItem(pmeRevLs(id)) || 'null'); }catch(e){}
  PME_REV[id] = {
    v: 2,
    q: (d && d.q) || {}, obs: (d && d.obs) || {}, obsr: (d && d.obsr) || {},
    extra: (d && d.extra) || [], forz: (d && d.forz) || {}
  };
  return PME_REV[id];
}

function pmeGuardarRev(id){
  try{ localStorage.setItem(pmeRevLs(id), JSON.stringify(pmeRev(id))); }catch(e){}
  PME_IX[id] = null;             // los totales cambian: el índice se rehace
  pmeRepintarTodo();
}

function pmeCuantasTocadas(id){
  const r = pmeRev(id);
  return Object.keys(r.q).length + Object.keys(r.forz).length;
}
function pmeCuantasObs(id){
  const r = pmeRev(id);
  return Object.keys(r.obs).length + Object.keys(r.obsr).length;
}

/* ── El pestillo ── */

async function pmeAbrirEdicion(){
  const i = document.getElementById('pmeClaveEd');
  const v = (i && i.value || '').trim();
  const aviso = document.getElementById('pmeEdMal');
  if(!v) return;
  let h = '';
  try{
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v));
    h = [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  }catch(e){}
  if(h !== PME_EDITOR_HASH){
    if(aviso) aviso.textContent = 'Esa clave no abre el modo revisión.';
    return;
  }
  PME_EDITA = true;
  try{ sessionStorage.setItem('pme-edita', '1'); }catch(e){}
  pmeRepintarTodo();
}
function pmeCerrarEdicion(){
  PME_EDITA = false;
  try{ sessionStorage.removeItem('pme-edita'); }catch(e){}
  pmeRepintarTodo();
}
try{ PME_EDITA = sessionStorage.getItem('pme-edita') === '1'; }catch(e){}

function pmeBarraEdicion(id){
  if(!PME_EDITA){
    return `<div class="pme-edbarra">
      <span class="th-nota">Estás mirando el PME. Para corregir cantidades y dejar
        observaciones hace falta la clave de revisión.</span>
      <input type="password" id="pmeClaveEd" placeholder="Clave de revisión"
        onkeydown="if(event.key==='Enter')pmeAbrirEdicion()">
      <button type="button" class="ex-btn" onclick="pmeAbrirEdicion()">Entrar a revisar</button>
      <span class="pme-edmal" id="pmeEdMal"></span>
    </div>`;
  }
  if(PME_HERRAMIENTA[id]){
    return `<div class="pme-edbarra act">
      <b>Modo revisión</b>
      <span class="th-nota">Ésta es la herramienta de armado completa, la misma de tu equipo.
        Lo que corrijas se guarda en este navegador.</span>
      <a class="ex-btn" href="${esc(PME_HERRAMIENTA[id])}" target="_blank" rel="noopener">Abrir aparte</a>
      <button type="button" class="ex-btn" onclick="pmeCerrarEdicion()">Volver a la vista del cliente ✕</button>
    </div>`;
  }
  const t = pmeCuantasTocadas(id), o = pmeCuantasObs(id);
  return `<div class="pme-edbarra act">
    <b>Modo revisión</b>
    <span class="th-nota">${t ? nf(t) + (t === 1 ? ' cantidad corregida' : ' cantidades corregidas') : 'sin cantidades corregidas'}
      · ${o ? nf(o) + (o === 1 ? ' observación' : ' observaciones') : 'sin observaciones'}
      · se guarda en este navegador</span>
    <button type="button" class="ex-btn" onclick="pmeBajarJson()">Guardar .json</button>
    <button type="button" class="ex-btn" onclick="pmeCargarJsonPide()">Cargar .json</button>
    <input type="file" id="pmeJsonEnt" accept=".json" style="display:none"
      onchange="pmeCargarJson(this)">
    <button type="button" class="ex-btn" onclick="pmeOlvidarRev()">Descartar</button>
    <button type="button" class="ex-btn" onclick="pmeCerrarEdicion()">Salir ✕</button>
  </div>`;
}

/* ── Las cantidades ──
   La llave es CÓDIGO DE AMBIENTE | código de equipo | la vez que ese
   código se repite dentro del ambiente. Nada de índices: así lo que
   corriges sigue en su sitio cuando la base se vuelve a generar. */

function pmeQRev(id, kq, fin){
  const v = pmeRev(id).q[kq];
  if(v === undefined || v === null || v === '') return fin || 0;
  const q = Math.trunc(Number(v));
  return Number.isFinite(q) ? Math.max(0, q) : (fin || 0);
}

function pmeSumar(kq, d, fin){
  const id = pmeId();
  const r = pmeRev(id);
  const q = Math.max(0, pmeQRev(id, kq, fin) + d);
  if(q === (fin || 0)) delete r.q[kq]; else r.q[kq] = q;
  pmeGuardarRev(id);
}

/* El renglón que la unificación anuló no tiene línea, pero se puede
   reactivar: el + le da la primera unidad y el − lo devuelve a anulado
   cuando llega a cero. */
function pmeForzar(cods, cod, j, d){
  const id = pmeId();
  const r = pmeRev(id);
  const k = cods + '|' + cod + '|u' + j;
  const q = Math.max(0, (Number(r.forz[k]) || 0) + d);
  if(q <= 0) delete r.forz[k]; else r.forz[k] = q;
  pmeGuardarRev(id);
}

/* ── Las observaciones ──
   Dos niveles, porque los reparos son de dos clases: sobre el AMBIENTE
   («este ambiente no corresponde») y sobre un RENGLÓN de la norma
   («esta cantidad está mal»). Cada uno lleva texto y una marca de «está
   mal», que no es lo mismo que una anotación al margen. */

function pmeObsLee(id, k, ren){
  return (ren ? pmeRev(id).obsr : pmeRev(id).obs)[k] || {};
}

function pmePonerObs(k, ren, campo, valor){
  const id = pmeId();
  const r = pmeRev(id);
  const d = ren ? r.obsr : r.obs;
  const o = Object.assign({}, d[k]);
  o[campo] = valor;
  if(!(o.t || '').trim() && !o.mal) delete d[k]; else d[k] = o;
  try{ localStorage.setItem(pmeRevLs(id), JSON.stringify(r)); }catch(e){}
  /* No se repinta al teclear: se perdería el cursor. El recuento de la
     barra se pone al día al cerrar la caja. */
}

function pmeAbrirObsRen(ia, j){
  const fila = document.getElementById('pme-obsr-' + ia + '-' + j);
  if(!fila) return;
  fila.classList.toggle('abierta');
  const t = fila.querySelector('textarea');
  if(fila.classList.contains('abierta') && t) t.focus();
}

function pmeCajaObs(k, ren, titulo){
  const id = pmeId();
  const o = pmeObsLee(id, k, ren);
  return `<div class="pme-obs">
    <label class="pme-obs-t">${esc(titulo)}</label>
    <textarea rows="2" placeholder="Qué has visto y por qué lo observas"
      oninput="pmePonerObs('${esc(k)}', ${ren ? 'true' : 'false'}, 't', this.value)"
      onchange="pmeRepintarBarra()">${esc(o.t || '')}</textarea>
    <label class="pme-obs-mal">
      <input type="checkbox" ${o.mal ? 'checked' : ''}
        onchange="pmePonerObs('${esc(k)}', ${ren ? 'true' : 'false'}, 'mal', this.checked); pmeRepintarBarra()">
      Esto está mal y hay que corregirlo en el origen</label>
  </div>`;
}

/* Sólo la barra, para no perder el cursor mientras se escribe. */
function pmeRepintarBarra(){
  const id = pmeId();
  const b = document.querySelector('.pme-edbarra');
  if(id && b) b.outerHTML = pmeBarraEdicion(id);
}

/* ── Llevarse la revisión, y traerla ── */

function pmeBajarJson(){
  const id = pmeId();
  const r = pmeRev(id);
  const txt = JSON.stringify(Object.assign({}, r, {
    _que: 'Revisión del PME — se abre con la herramienta de armado',
    _cuando: new Date().toISOString()
  }), null, 1);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([txt], {type: 'application/json'}));
  a.download = 'revision-' + id + '-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

function pmeCargarJsonPide(){
  const i = document.getElementById('pmeJsonEnt');
  if(i) i.click();
}

function pmeCargarJson(input){
  const f = input.files && input.files[0];
  if(!f) return;
  const id = pmeId();
  const fr = new FileReader();
  fr.onload = () => {
    try{
      const o = JSON.parse(fr.result);
      PME_REV[id] = {v: 2, q: o.q || {}, obs: o.obs || {}, obsr: o.obsr || {},
                     extra: o.extra || [], forz: o.forz || {}};
      pmeGuardarRev(id);
    }catch(e){ alert('Ese archivo no se pudo leer como revisión del PME.'); }
    input.value = '';
  };
  fr.readAsText(f);
}

function pmeOlvidarRev(){
  if(!confirm('Se borran las cantidades corregidas y las observaciones de este navegador. '
    + '¿Seguro? Si quieres conservarlas, guarda antes el .json.')) return;
  const id = pmeId();
  PME_REV[id] = {v: 2, q: {}, obs: {}, obsr: {}, extra: [], forz: {}};
  try{ localStorage.removeItem(pmeRevLs(id)); }catch(e){}
  pmeGuardarRev(id);
}
