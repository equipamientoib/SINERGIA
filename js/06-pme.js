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

let PME_DATOS = null;         // el JSON, una vez descargado
let PME_ESTADO = 'no';        // no | cargando | listo | error
let PME_ERROR = '';

/* El JSON del PME de cada expediente, al lado del del expediente. */
function pmeUrl(id){ return 'data/pme-' + id.replace(/-\d+$/, '') + '.json'; }

function paneExPme(d, id){
  if(PME_ESTADO === 'error'){
    return `<div class="cargando-proy">
      <p>No se pudo traer el PME.</p>
      <span>${esc(PME_ERROR)}</span>
      <p style="margin-top:12px"><button class="btn btn-fill"
        onclick="PME_ESTADO='no';pintarExpediente('${id}')">Reintentar</button></p>
    </div>`;
  }
  if(PME_ESTADO !== 'listo'){
    return `<div class="cargando-proy"><div class="cp-barra"><i></i></div>
      <p>Trayendo el PME y la lista de la norma…</p>
      <span>Son los ${d && d.resumen ? d.resumen.ambientes || '' : ''} ambientes del PMA con su equipo.</span></div>`;
  }
  return pmePane(d, id);
}

/* Lo llama 06-expediente.js cada vez que se pinta la pestaña. */
function montarExPme(d, id){
  if(PME_ESTADO === 'cargando' || PME_ESTADO === 'listo') return;
  PME_ESTADO = 'cargando';
  fetch(pmeUrl(id), {cache: 'no-cache'}).then(r => {
    if(!r.ok) throw new Error('El archivo del PME no está publicado (' + r.status + ').');
    return r.json();
  }).then(j => {
    PME_DATOS = j;
    PME_ESTADO = 'listo';
    pintarExpediente(id);
  }).catch(e => {
    PME_ESTADO = 'error';
    PME_ERROR = e.message || String(e);
    pintarExpediente(id);
  });
}

/* ─────────────────────── EL PANEL ───────────────────────
   De momento, la cabecera y las cifras del cruce. La tabla ambiente por
   ambiente —con la lista de la norma, el cotejo contra el PMF y el PMA
   y los avisos— entra en el paso siguiente, con el dato ya publicado. */
function pmePane(d, id){
  const m = PME_DATOS.meta || {};
  const c = PME_DATOS.c || {};
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
