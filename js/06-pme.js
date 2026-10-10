/* =====================================================================
   06-pme.js — PESTAÑA «PME EN BASE PMF/PMA/NTS»
   ---------------------------------------------------------------------
   El PME (Programa Médico de Equipamiento) no se arma de la nada: sale
   de cruzar tres documentos.

     · El PMF dice qué ambientes pidió el establecimiento.
     · El PMA es el que manda el alcance: los ambientes que de verdad se
       van a construir, con su área y su número.
     · La NTS —113 para el nivel I, 110 para el II— dice qué equipos
       lleva cada ambiente y cuántos.

   Esta pestaña enseña ese cruce ambiente por ambiente: qué pidió cada
   documento, con qué ambiente de la norma se emparejó, qué renglones
   entraron al metrado y cuáles no, y por qué. Es lo que un supervisor
   abre para comprobar que el metrado no se inventó nada.

   El módulo se carga a demanda desde 06-expediente.js: la lista de la
   norma de los 152 ambientes con norma pesa, y quien entra a ver el
   avance del expediente no tiene por qué descargarla.

   DE DÓNDE SALEN LOS DATOS
   De data/pme-<id>.json, que genera la herramienta de armado del PME
   (PME-PROPIO) con el mismo cruce que se usa para el expediente. Aquí
   sólo se pinta: ninguna regla de metrado vive en esta página.
   ===================================================================== */

/* Todo va POR EXPEDIENTE. La primera versión guardaba un único dato y,
   al pasar de Pachas a otro proyecto, el panel seguía enseñando las
   cifras del anterior: el peor error posible en un portal donde cada
   cliente entra con su clave. */
const PME_DATOS = {};         // id -> JSON descargado
const PME_EST = {};           // id -> no | cargando | listo | error
const PME_ERR = {};           // id -> motivo

function pmeEstado(id){ return PME_EST[id] || 'no'; }

/* Dónde está el PME de este expediente. Lo dice el propio JSON del
   expediente (campo «pme»); sin eso, no hay pestaña ni petición. */
function pmeUrl(d, id){
  return (d && typeof d.pme === 'string') ? d.pme : 'data/pme-' + id + '.json';
}

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
      <span>Son los ${d && d.resumen ? d.resumen.ambientes || '' : ''} ambientes del PMA con su equipo.</span></div>`;
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

/* ─────────────────────── EL PANEL ───────────────────────
   De momento, la cabecera y las cifras del cruce. La tabla ambiente por
   ambiente —con la lista de la norma, el cotejo contra el PMF y el PMA
   y los avisos— entra en el paso siguiente, con el dato ya publicado. */
function pmePane(d, id){
  const j = PME_DATOS[id] || {};
  const m = j.meta || {};
  const c = j.c || {};
  const cif = (n, t, s) => `<div class="ex-cifra"><b>${esc(nf(n))}</b><span>${esc(t)}</span>
    ${s ? `<i>${esc(s)}</i>` : ''}</div>`;

  return `<div class="pme-pane">
    <div class="tab-head">
      <h4>El PME contra el PMF, el PMA y la NTS</h4>
      <span class="th-nota">${esc(m.normas || '')}${m.generado ? ' · armado el ' + esc(m.generado) : ''}</span>
    </div>
    <p class="ex-nota">El alcance lo manda el <b>PMA</b>; el <b>PMF</b> aporta los códigos de ambiente y
      debe estar contenido en él. Las listas de equipos salen de la <b>NTS</b>, y cuando el ambiente no
      está en la norma se declara y no se equipa. Sólo se metra el equipo <b>EQ</b>: el <b>OC</b> queda
      fuera por regla. Las líneas en cero no se borran: son la trazabilidad de lo descartado.</p>
    <div class="ex-cifras">
      ${cif(c.act || 0, 'ambientes con norma', 'de ' + nf(c.amb || 0) + ' del PMA')}
      ${cif(c.lineas || 0, 'líneas de equipo', 'una por ambiente y código')}
      ${cif(c.unid || 0, 'unidades', 'sólo EQ')}
      ${cif(c.sinm || 0, 'sin ambiente en la NTS', 'declarados, sin equipar')}
      ${cif(c.dis || 0, 'discrepancias PMF–PMA', 'por resolver')}
    </div>
    <p class="ex-nota">La tabla ambiente por ambiente llega en el siguiente paso.</p>
  </div>`;
}
