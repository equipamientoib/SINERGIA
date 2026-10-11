/* =====================================================================
   01-pme.js — HERRAMIENTA DE ARMADO DEL PME
   ---------------------------------------------------------------------
   El PME (Programa Médico de Equipamiento) sale de cruzar tres cosas:

     · el PMA visado, que manda el alcance —qué ambientes se equipan y
       cuántos hay de cada uno—;
     · el PMF visado, que aporta los códigos de ambiente y que debe
       estar contenido en el PMA;
     · la NTS que corresponda al nivel: 113 para el nivel I, 110 para
       el II, 119 para el III, que aporta la lista de equipos de cada
       ambiente.

   Reglas que la herramienta respeta y que no se tocan sin decirlo:
     · en ambientes unificados NO se suma: se toma la mayor cantidad;
     · nunca se borra una línea: lo retirado y lo duplicado queda en 0,
       porque el supervisor tiene que poder ver qué se descartó;
     · el equipo de tipo OC no se metra, sólo el EQ;
     · toda línea lleva su norma de origen, y cuando no hay ambiente ni
       equipo en ninguna de las tres normas se marca «Propuesta».

   QUÉ HACE ESTE ARCHIVO
     Pinta las cuatro pestañas y guarda lo que Luis corrige. El cálculo
     del preliminar ya está hecho: entra por js/00-datos.js (lo genera
     scripts/generar-datos.py desde los JSON de la transcripción). Aquí
     sólo se revisa, se corrige y se exporta.

   DÓNDE SE GUARDA LO CORREGIDO
     En localStorage del navegador, bajo PME_LS. Es por navegador y por
     equipo: el respaldo de verdad es el .json de la pestaña Exportar.
   ===================================================================== */

const PME_LS = 'pme-pachas-i4-v1';

let PME_TAB = 'res';          // res | cmp | fis | pme | exp

/* Lo que Luis corrige encima del preliminar. Se guarda aparte de los
   datos para poder regenerar el preliminar sin perder la revisión.
     q   { n.º de línea: cantidad }  cantidades cambiadas a mano
     dec { código PMF: texto }       decisión de cada discrepancia      */
/*  q    { n.º de línea: cantidad }      cantidades cambiadas a mano
    dec  { código PMF: texto }           decisión de cada discrepancia
    obs  { índice de ambiente: {...} }   observación sobre un ambiente
    obsr { «ambiente:renglón»: {...} }   observación sobre un renglón de la norma
   Las observaciones llevan {t: texto, mal: true/false}: `mal` es
   «esto está equivocado», que no es lo mismo que una anotación. */
let PME_U = {q: {}, dec: {}, obs: {}, obsr: {}, extra: [], forz: {}};

/* Estado de la pestaña PME. */
const PME_F = {q: '', upss: '', norma: '', estado: '', conf: '', cero: true, pag: 0};
const PME_X = 200;            // filas por página

/* ─────────────────────────── AYUDAS ─────────────────────────── */

function esc(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function pmeNum(v){
  if(v == null || v === '') return '';
  return Number(v).toLocaleString('es-PE');
}
/* Etiqueta de procedencia. «113» viene así en los datos; cuando no hay
   norma es porque el ambiente o el equipo son propuesta nuestra. */
function pmeEt(n){
  if(!n) return '<span class="pme-et prop">Propuesta</span>';
  const c = n === '113' ? 'n113' : n === '110' ? 'n110' : n === '119' ? 'n119' : 'prop';
  return `<span class="pme-et ${c}">NTS ${esc(n)}</span>`;
}
/* De dónde salió el emparejamiento del ambiente del PMA con el de la
   NTS. «Propuesta Claude» es criterio nuestro y va marcado en rojo:
   es exactamente lo que hay que validar antes de entregar. */
function pmeConf(c){
  if(!c) return '';
  const prop = c.indexOf('Propuesta') === 0 || c === 'Sin match';
  return `<span class="pme-et ${prop ? 'prop' : 'n113'}">${esc(c)}</span>`;
}
function pmeEstCls(e){
  const s = String(e || '').toLowerCase();
  if(s.indexOf('unific') === 0) return 'un';
  if(s.indexOf('retir') === 0) return 're';
  if(s.indexOf('sin programar') === 0) return 'sp';
  return '';
}
function pmeSeccion(num, tit, nota){
  return `<div class="ex-seccion"><span class="ex-num">${num}.</span><b>${esc(tit)}</b>` +
         (nota ? `<span class="th-nota">${esc(nota)}</span>` : '') + '</div>';
}

/* Cantidad vigente de una línea: la corregida si existe, si no la del
   preliminar. El 0 es un valor válido —y frecuente—, así que no vale
   preguntar por «si es falsy». */
/* ── La llave con la que se guarda lo que corriges ──
   Antes se guardaba por el número de línea y por el índice del ambiente.
   Eso aguanta mientras los datos no cambien, pero el día que se vuelve a
   generar la base —y pasó el 09/10/2026, cuando cambió el PMA— los
   números bailan y la corrección se pega al equipo equivocado, sin
   avisar. Ahora la llave es el CÓDIGO del ambiente más el CÓDIGO del
   equipo: eso significa lo mismo antes y después de regenerar.
   El tercer trozo distingue las veces que un código se repite dentro del
   mismo ambiente, que las hay. */
let PME_CLAVES = null;
/* Los añadidos por planos cambian la lista de líneas, así que la tabla
   de llaves se rehace cuando cambian. */
function pmeOlvidarClaves(){ PME_CLAVES = null; }

function pmeClaves(){
  if(PME_CLAVES) return PME_CLAVES;
  PME_CLAVES = {};
  const vistos = {};
  pmeLineas().forEach(r => {
    const k = r.cods + '|' + r.c;
    vistos[k] = (vistos[k] || 0) + 1;
    PME_CLAVES[r.n] = k + '|' + vistos[k];
  });
  return PME_CLAVES;
}
function pmeClave(r){ return pmeClaves()[r.n]; }

function pmeQ(r){
  const v = PME_U.q[pmeClave(r)];
  if(v === undefined || v === null || v === '') return r.fin || 0;
  /* El −/+ nunca deja un negativo, pero una revisión editada a mano o un
     respaldo viejo sí puede traer texto, decimales o un número por debajo
     de cero. Un metrado es un entero y no baja de cero: lo mismo que hace
     el generador del LS, o los dos no cuadran. */
  const q = Math.trunc(Number(v));
  return Number.isFinite(q) ? Math.max(0, q) : (r.fin || 0);
}
function pmeTocada(r){
  const v = PME_U.q[pmeClave(r)];
  return !(v === undefined || v === null || v === '') && Number(v) !== (r.fin || 0);
}

/* ───────────────────── GUARDADO EN EL NAVEGADOR ───────────────────── */

function pmeCargarLS(){
  try{
    const s = localStorage.getItem(PME_LS);
    /* Sin nada guardado se vuelve al preliminar limpio: esta función
       también es la que usa «Descartar la revisión». */
    const o = s ? JSON.parse(s) : {};
    PME_U = {q: o.q || {}, dec: o.dec || {}, obs: o.obs || {}, obsr: o.obsr || {}, extra: o.extra || [], forz: o.forz || {}};
    if(s && o.v !== 2) pmeMigrar();
  }catch(e){
    /* Modo privado, almacenamiento bloqueado o JSON roto: se sigue con
       el preliminar limpio. No es motivo para no abrir la herramienta. */
    PME_U = {q: {}, dec: {}, obs: {}, obsr: {}, extra: [], forz: {}};
  }
}
/* Lo guardado con el formato viejo —número de línea e índice de
   ambiente— se pasa al nuevo una sola vez. Si la base cambió desde que
   se guardó, habrá entradas que no encuentren sitio: se cuentan y se
   dicen, en vez de colocarlas donde no van. */
let PME_PERDIDAS = 0;

function pmeMigrar(){
  const q = {}, obs = {}, obsr = {};
  let perdidas = 0;
  Object.keys(PME_U.q || {}).forEach(n => {
    const r = PME_D.pme.find(x => String(x.n) === String(n));
    if(r) q[pmeClave(r)] = PME_U.q[n]; else perdidas++;
  });
  Object.keys(PME_U.obs || {}).forEach(ia => {
    const m = PME_D.match[+ia];
    if(m) obs[m.cods] = PME_U.obs[ia]; else perdidas++;
  });
  Object.keys(PME_U.obsr || {}).forEach(k => {
    const p = k.split(':'), m = PME_D.match[+p[0]];
    const r = m && PME_D.pme.find(x => x.ia === +p[0]);
    if(m && r) obsr[m.cods + '|' + (r.c || '') + '|' + p[1]] = PME_U.obsr[k];
    else perdidas++;
  });
  PME_U = {q: q, dec: PME_U.dec || {}, obs: obs, obsr: obsr, extra: PME_U.extra || [],
           forz: PME_U.forz || {}};
  PME_PERDIDAS = perdidas;
  pmeGuardarLS();
}

function pmeGuardarLS(){
  pmeOlvidarClaves();
  try{ localStorage.setItem(PME_LS, JSON.stringify(Object.assign({v: 2}, PME_U))); }
  catch(e){ /* sin almacenamiento: el respaldo es el .json de Exportar */ }
}
/* Cuántas observaciones hay puestas, entre ambientes y renglones. */
function pmeCuantasObs(){
  const con = o => Object.values(o || {}).filter(x => x && ((x.t || '').trim() || x.mal)).length;
  return con(PME_U.obs) + con(PME_U.obsr);
}

function pmeCuantasTocadas(){
  return pmeLineas().filter(pmeTocada).length;
}

/* ─────────────────────────── PESTAÑAS ─────────────────────────── */

function setPmeTab(t){
  PME_TAB = t;
  pintarPme();
  const bar = document.querySelector('.det-tabs');
  const act = document.querySelector('.det-tabs button.on');
  if(bar && act && bar.scrollWidth > bar.clientWidth){
    bar.scrollLeft = act.offsetLeft - (bar.clientWidth - act.offsetWidth) / 2;
  }
}

function pmeTabs(){
  const tocadas = pmeCuantasTocadas();
  const sinDec = PME_D.pmf.filter(r => r.res !== 'Compatible' && !(PME_U.dec[r.cod] || '').trim()).length;
  const obs = pmeCuantasObs();
  return `<div class="det-tabs">
    <button type="button" class="${PME_TAB === 'res' ? 'on' : ''}" onclick="setPmeTab('res')">Resumen</button>
    <button type="button" class="${PME_TAB === 'cmp' ? 'on' : ''}" onclick="setPmeTab('cmp')">Compatibilidad PMF / PMA${sinDec ? `<em>${sinDec}</em>` : ''}</button>
    <button type="button" class="${PME_TAB === 'fis' ? 'on' : ''}" onclick="setPmeTab('fis')">Fiscalización${obs ? `<em>${obs}</em>` : ''}</button>
    <button type="button" class="${PME_TAB === 'pme' ? 'on' : ''}" onclick="setPmeTab('pme')">PME${tocadas ? `<em>${tocadas}</em>` : ''}</button>
    <button type="button" class="${PME_TAB === 'exp' ? 'on' : ''}" onclick="setPmeTab('exp')">Exportar</button>
    <div class="det-actu"><span>Generado el ${esc(PME_D.meta.generado)}</span></div>
    <div class="fis-donde">${esc(PME_D.meta.proyecto)} · ${esc(PME_D.meta.categoria)}</div>
  </div>`;
}

function pintarPme(){
  const cont = document.getElementById('pmeDet');
  if(!cont) return;
  const y = window.pageYOffset;
  let pane = '';
  if(PME_TAB === 'cmp') pane = paneCmp();
  else if(PME_TAB === 'fis') pane = paneFis();          // 02-fiscalizacion.js
  else if(PME_TAB === 'pme') pane = panePme();
  else if(PME_TAB === 'exp') pane = paneExp();
  else pane = paneRes();
  cont.innerHTML = `<div class="dash-card det-card ex-card">${pmeTabs()}${pane}</div>`;
  if(typeof fisPintarCajon === 'function'){ fisPintarCajon(); fisAplicarAncho(); }
  pmeMedirTopes();
  if(typeof pmeCabDetalle === 'function') pmeCabDetalle();
  if(window.pageYOffset !== y) window.scrollTo(0, y);
}

/* ══════════════════════ 1 · RESUMEN ══════════════════════ */

function paneRes(){
  const c = PME_D.c;
  const vivas = pmeLineas().filter(r => pmeQ(r) > 0).length;
  const unid = pmeLineas().reduce((a, r) => a + pmeQ(r), 0);
  const tocadas = pmeCuantasTocadas();
  const sinNorma = PME_D.match.filter(r => r.norma === 'Propuesta').length;
  /* Líneas que se apoyan en un emparejamiento de ambiente propuesto por
     nosotros: no están mal, pero son las que hay que validar. */
  const propL = pmeLineas().filter(r => (r.conf || '').indexOf('Propuesta') === 0 || r.conf === 'Sin match').length;
  const cons = pmeConsolidado();

  /* Ambientes por UPSS, con cuántos se equipan de verdad. */
  const porUpss = {};
  PME_D.match.forEach(r => {
    const u = porUpss[r.upss] || (porUpss[r.upss] = {amb: 0, eq: 0, n: 0});
    u.amb++;
    if(r.estado === 'Programado' || r.estado === 'Unificado') u.eq++;
    u.n += Number(r.n) || 0;
  });
  const lineasUpss = {};
  pmeLineas().forEach(r => { lineasUpss[r.upss] = (lineasUpss[r.upss] || 0) + pmeQ(r); });

  return `
  <p class="pme-aviso">PME <b>preliminar</b> del ${esc(PME_D.meta.proyecto)}, armado a partir del PMF y del PMA
    visados por ${esc(PME_D.meta.visado)}. Las cantidades y los ambientes marcados
    <span class="pme-et prop">Propuesta</span> están <b>por validar</b>: no son normativos, son criterio nuestro
    y así quedan declarados para el supervisor.</p>

  ${pmeSeccion(1, 'Dónde está parado el PME', 'Cifras vivas, con lo que ya corregiste')}
  <div class="kpis">
    <div class="kpi dark"><b>${pmeNum(c.act)}</b><span>Ambientes a equipar<br>de ${pmeNum(PME_D.match.length)} del PMA</span></div>
    <div class="kpi"><b>${pmeNum(vivas)}</b><span>Líneas con cantidad<br>de ${pmeNum(pmeLineas().length)} en total</span></div>
    <div class="kpi"><b>${pmeNum(unid)}</b><span>Unidades de equipo<br>sólo EQ, el OC no se metra</span></div>
    <div class="kpi"><b>${pmeNum(cons.filter(x => x.q > 0).length)}</b><span>Códigos distintos<br>y ${pmeNum(cons.length - cons.filter(x => x.q > 0).length)} más que quedan en cero</span></div>
    <div class="kpi ${c.dis ? 'alerta' : ''}"><b>${pmeNum(c.dis)}</b><span>Discrepancias PMF / PMA<br>de ${pmeNum(c.ok + c.dis)} ambientes del PMF</span></div>
    <div class="kpi ${propL ? 'alerta' : ''}"><b>${pmeNum(propL)}</b><span>Líneas por validar<br>ambiente emparejado por propuesta</span></div>
    <div class="kpi ${sinNorma ? 'alerta' : ''}"><b>${pmeNum(sinNorma)}</b><span>Ambientes sin norma<br>no se equipan, quedan declarados</span></div>
  </div>
  ${tocadas ? `<p class="ex-nota">Llevas <b>${pmeNum(tocadas)}</b> ${tocadas === 1 ? 'cantidad corregida' : 'cantidades corregidas'}
    sobre el preliminar. Se guardan en este navegador; el respaldo que se puede mover de equipo es el
    <b>.json</b> de la pestaña Exportar.</p>` : ''}

  ${pmeSeccion(2, 'Reparto por unidad productora', 'Ambientes del PMA y unidades de equipo que le toca a cada una')}
  <div class="pme-wrap">
    <table class="pme-tabla">
      <thead><tr>
        <th>UPSS / UPS</th><th class="n">Ambientes</th><th class="n">Se equipan</th>
        <th class="n">N.º de ambientes</th><th class="n">Unidades</th>
      </tr></thead>
      <tbody>
        ${Object.keys(porUpss).map(u => `<tr>
          <td>${esc(u)}</td>
          <td class="n">${pmeNum(porUpss[u].amb)}</td>
          <td class="n">${pmeNum(porUpss[u].eq)}</td>
          <td class="n">${pmeNum(porUpss[u].n)}</td>
          <td class="n">${pmeNum(lineasUpss[u] || 0)}</td>
        </tr>`).join('')}
      </tbody>
      <tfoot><tr>
        <td>Total</td>
        <td class="n">${pmeNum(PME_D.match.length)}</td>
        <td class="n">${pmeNum(c.act)}</td>
        <td class="n">${pmeNum(PME_D.match.reduce((a, r) => a + (Number(r.n) || 0), 0))}</td>
        <td class="n">${pmeNum(unid)}</td>
      </tr></tfoot>
    </table>
  </div>

  ${pmeSeccion(3, 'Consolidado por código', 'Un renglón por código de equipo, como lo pide la hoja principal de la NTS')}
  <p class="ex-nota">Van los ${pmeNum(cons.length)} códigos que aparecen en el PME, incluidos los
    ${pmeNum(cons.length - cons.filter(x => x.q > 0).length)} que quedan en <b>cero</b> porque sólo salían de
    ambientes retirados o unificados. No se borran: así el supervisor ve qué se descartó y por qué.</p>
  <div class="pme-wrap" style="max-height:52vh">
    <table class="pme-tabla">
      <thead><tr>
        <th>Código</th><th>Descripción</th><th>Tipo (NTS)</th>
        <th class="n">Ambientes</th><th class="n">Cantidad</th><th>Norma</th>
      </tr></thead>
      <tbody>${cons.map(r => `<tr${r.q ? '' : ' class="cero"'}>
        <td class="pme-cod">${esc(r.c)}</td>
        <td class="pme-desc">${esc(r.d)}</td>
        <td>${esc(r.t)}</td>
        <td class="n">${pmeNum(r.amb)}</td>
        <td class="n">${pmeNum(r.q)}</td>
        <td>${r.normas.map(pmeEt).join(' ')}</td>
      </tr>`).join('')}</tbody>
      <tfoot><tr>
        <td colspan="4">${pmeNum(cons.filter(x => x.q > 0).length)} códigos con cantidad · ${pmeNum(cons.length)} en total</td>
        <td class="n">${pmeNum(unid)}</td><td></td>
      </tr></tfoot>
    </table>
  </div>

  ${pmeSeccion(4, 'Bitácora', 'Cada decisión que se tomó al armar el preliminar, con dónde se tomó')}
  <div class="pme-wrap" style="max-height:44vh">
    <table class="pme-tabla">
      <thead><tr><th>Quién</th><th>Dónde</th><th>Qué</th></tr></thead>
      <tbody>${PME_D.log.map(l => `<tr>
        <td class="pme-upss">${esc(l.who)}</td>
        <td class="pme-amb">${esc(l.where)}</td>
        <td>${esc(l.what)}</td>
      </tr>`).join('')}</tbody>
    </table>
  </div>`;
}

/* El consolidado se recalcula con las cantidades vigentes: si Luis baja
   una cantidad en la pestaña PME, el resumen por código la sigue. */
function pmeConsolidado(){
  const m = {};
  pmeLineas().forEach(r => {
    const k = r.c;
    const o = m[k] || (m[k] = {c: r.c, d: r.d, t: r.t, p: r.p, q: 0, amb: 0, normas: []});
    const q = pmeQ(r);
    o.q += q;
    if(q > 0) o.amb++;
    if(o.normas.indexOf(r.nEq) < 0) o.normas.push(r.nEq);
  });
  /* El orden lo da el consolidado del preliminar: así el Excel que sale
     de aquí se puede comparar renglón a renglón con el anterior. */
  const orden = {};
  PME_D.res.forEach((r, i) => { orden[r.c] = i; });
  return Object.keys(m).sort((a, b) => (orden[a] ?? 9e9) - (orden[b] ?? 9e9)).map(k => m[k]);
}

/* ══════════════════ 2 · COMPATIBILIDAD PMF / PMA ══════════════════ */

function paneCmp(){
  const dis = PME_D.pmf.filter(r => r.res !== 'Compatible');
  const ok = PME_D.pmf.filter(r => r.res === 'Compatible');
  const noPmf = PME_D.ups.pma_no_pmf || [];

  return `
  ${pmeSeccion(1, 'Lo que hay que decidir', `${dis.length} de ${PME_D.pmf.length} ambientes del PMF`)}
  <p class="ex-nota">El PMA nace del PMF: <b>todo ambiente del PMF tiene que estar en el PMA</b>. Cuando no está, o
    está con otro nombre, no se decide solo: se reporta y se sigue con el PMA, que es el que manda el alcance.
    Escribe abajo la decisión de cada caso; queda guardada y sale en la bitácora del Excel.</p>
  ${dis.map(cmpTarjeta).join('')}

  ${pmeSeccion(2, 'Lo compatible', `${ok.length} ambientes que cuadran y no piden nada`)}
  <details class="bloque">
    <summary><span>Ver los ${ok.length} ambientes compatibles</span><i>código del PMF idéntico en el PMA</i></summary>
    <div class="pme-wrap" style="max-height:52vh;border:0;border-radius:0">
      <table class="pme-tabla">
        <thead><tr><th>Código</th><th>Ambiente (PMF)</th><th class="n">Pág.</th><th>Ambiente (PMA)</th></tr></thead>
        <tbody>${ok.map(r => `<tr>
          <td class="pme-cod">${esc(r.cod)}</td>
          <td class="pme-amb">${esc(r.amb)}</td>
          <td class="n">${esc(r.pag)}</td>
          <td>${esc(r.pma)}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>
  </details>

  ${pmeSeccion(3, 'En el PMA pero no en el PMF', `${noPmf.length} ambientes que el PMA agrega`)}
  <p class="ex-nota">No es un error: el PMF suele programar sólo lo asistencial y el PMA agrega el desglose
    asistencial más el complementario. Se equipan igual, porque el alcance lo manda el PMA.</p>
  ${noPmf.length ? `<div class="pme-wrap" style="max-height:40vh">
    <table class="pme-tabla"><tbody>
      ${noPmf.map(x => `<tr><td>${esc(typeof x === 'string' ? x : (x.amb || JSON.stringify(x)))}</td></tr>`).join('')}
    </tbody></table></div>` : '<p class="ex-nota">Sin datos cargados.</p>'}`;
}

/* El código del PMF se pasa por su posición en PME_D.pmf, no por su
   texto: hay códigos como «ECO2(+)» que no sirven ni de id ni dentro de
   un selector CSS, y el «(+)» es del PMF, así que se respeta tal cual. */
function cmpTarjeta(r){
  const i = PME_D.pmf.indexOf(r);
  const dec = PME_U.dec[r.cod] || '';
  return `<div class="pme-dis">
    <div class="pme-dis-h">
      <span class="pme-cod">${esc(r.cod)}</span>
      <b>${esc(r.amb)}</b>
      <span class="th-nota">PMF pág. ${esc(r.pag)}</span>
    </div>
    <p>${esc(r.det)}</p>
    <dl>
      <dt>En el PMF</dt><dd>${esc(r.amb)} (${esc(r.cod)})</dd>
      <dt>En el PMA</dt><dd>${esc(r.pma)}</dd>
    </dl>
    <div class="pme-dec ${dec.trim() ? 'puesta' : ''}">
      <label>Decisión — qué se hace y con qué sustento
        <textarea placeholder="Ej.: se mantiene ECO2 por el código del PMF; el PMA cambió sólo el nombre del ambiente."
          oninput="pmeDec(${i}, this)">${esc(dec)}</textarea></label>
    </div>
  </div>`;
}

function pmeDec(i, el){
  const r = PME_D.pmf[i];
  if(!r) return;
  PME_U.dec[r.cod] = el.value;
  pmeGuardarLS();
  /* No se repinta: repintar mientras escribe le quitaría el cursor del
     textarea. La cuenta de la pestaña se refresca al cambiar de pestaña. */
  const caja = el.closest('.pme-dec');
  if(caja) caja.classList.toggle('puesta', !!el.value.trim());
}

/* ══════════════════════ 3 · PME ══════════════════════ */

function pmeFiltradas(){
  const q = PME_F.q.trim().toLowerCase();
  return pmeLineas().filter(r => {
    if(PME_F.upss && r.upss !== PME_F.upss) return false;
    if(PME_F.norma && (r.nEq || 'prop') !== PME_F.norma) return false;
    if(PME_F.estado && r.estado !== PME_F.estado) return false;
    if(PME_F.conf && (r.conf || '') !== PME_F.conf) return false;
    if(!PME_F.cero && pmeQ(r) <= 0) return false;
    if(q){
      /* El código del ambiente —CES-001, CES-P01— también se busca: es
         la forma corta de llegar a sus líneas. */
      const t = (r.c + ' ' + r.d + ' ' + r.amb + ' ' + r.upss + ' ' + (r.codAmb || '') +
                 ' ' + (r.pmf || '') + ' ' + (r.ambNts || '') + ' ' + (r.cods || '')).toLowerCase();
      if(t.indexOf(q) < 0) return false;
    }
    return true;
  });
}

function panePme(){
  const fs = pmeFiltradas();
  const unid = fs.reduce((a, r) => a + pmeQ(r), 0);
  const vivas = fs.filter(r => pmeQ(r) > 0).length;
  const pags = Math.max(1, Math.ceil(fs.length / PME_X));
  if(PME_F.pag >= pags) PME_F.pag = pags - 1;
  const desde = PME_F.pag * PME_X;
  const pagina = fs.slice(desde, desde + PME_X);

  const upss = [...new Set(pmeLineas().map(r => r.upss))];
  const estados = [...new Set(pmeLineas().map(r => r.estado))];
  const confs = [...new Set(pmeLineas().map(r => r.conf).filter(Boolean))];

  return `
  ${pmeSeccion(1, 'El PME línea por línea', 'Una línea por equipo y por ambiente; la cantidad se corrige aquí')}
  <p class="ex-nota">La cantidad se calcula como <b>cantidad de la NTS × N.º de ambientes del PMA</b>, salvo en los
    ambientes unificados, donde <b>no se suma</b>: se toma la mayor de las dos listas. Las líneas en
    <b>cero</b> —retirados, duplicados de una unificación, ambientes sin N.º— se quedan a la vista a propósito:
    son la trazabilidad de lo que se descartó. Edita la columna <b>Cant. PME</b> y queda guardada.</p>

  <div class="pme-fila">
    <input type="search" placeholder="Buscar código, equipo, ambiente o código NTS…"
      value="${esc(PME_F.q)}" oninput="pmeFil('q', this.value)">
    <select onchange="pmeFil('upss', this.value)">
      <option value="">Todas las UPSS / UPS</option>
      ${upss.map(u => `<option value="${esc(u)}" ${PME_F.upss === u ? 'selected' : ''}>${esc(u)}</option>`).join('')}
    </select>
    <select onchange="pmeFil('norma', this.value)">
      <option value="">Cualquier norma</option>
      <option value="113" ${PME_F.norma === '113' ? 'selected' : ''}>NTS 113</option>
      <option value="110" ${PME_F.norma === '110' ? 'selected' : ''}>NTS 110</option>
      <option value="119" ${PME_F.norma === '119' ? 'selected' : ''}>NTS 119</option>
    </select>
    <select onchange="pmeFil('estado', this.value)">
      <option value="">Cualquier estado</option>
      ${estados.map(e => `<option value="${esc(e)}" ${PME_F.estado === e ? 'selected' : ''}>${esc(e)}</option>`).join('')}
    </select>
    <select onchange="pmeFil('conf', this.value)" title="De dónde salió el emparejamiento del ambiente con la NTS">
      <option value="">Cualquier emparejamiento</option>
      ${confs.map(c => `<option value="${esc(c)}" ${PME_F.conf === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
    </select>
    <label class="pme-chk"><input type="checkbox" ${PME_F.cero ? 'checked' : ''}
      onchange="pmeFil('cero', this.checked)"> Mostrar las líneas en cero</label>
    <span class="det-n"><b>${pmeNum(fs.length)}</b> líneas · <b>${pmeNum(vivas)}</b> con cantidad ·
      <b>${pmeNum(unid)}</b> unidades</span>
  </div>

  <div class="pme-wrap">
    <table class="pme-tabla">
      <thead><tr>
        <th class="n">N.º</th>
        <th>UPSS / UPS</th>
        <th>Ambiente (PMA)</th>
        <th class="n">Pág.</th>
        <th class="n">N.º amb.</th>
        <th>Estado</th>
        <th>Cód. PMF</th>
        <th>Ambiente NTS</th>
        <th>Norma amb.</th>
        <th>Emparejado</th>
        <th>Código</th>
        <th>Descripción</th>
        <th>Tipo</th>
        <th class="n">NTS</th>
        <th class="n">Calc.</th>
        <th class="n">Cant. PME</th>
        <th>Norma eq.</th>
        <th>Observación</th>
      </tr></thead>
      <tbody>${pagina.map(pmeFilaHtml).join('')}</tbody>
      <tfoot><tr>
        <td colspan="15">Página ${PME_F.pag + 1} de ${pags} · ${pmeNum(fs.length)} líneas filtradas</td>
        <td class="n">${pmeNum(unid)}</td>
        <td colspan="2"></td>
      </tr></tfoot>
    </table>
  </div>
  <div class="pme-pag">
    <button type="button" class="ex-btn" ${PME_F.pag === 0 ? 'disabled' : ''} onclick="pmePag(-1)">‹ Anterior</button>
    <span>Página <b>${PME_F.pag + 1}</b> de <b>${pags}</b></span>
    <button type="button" class="ex-btn" ${PME_F.pag >= pags - 1 ? 'disabled' : ''} onclick="pmePag(1)">Siguiente ›</button>
  </div>`;
}

function pmeFilaHtml(r){
  const q = pmeQ(r);
  const cls = [q > 0 ? '' : 'cero', pmeTocada(r) ? 'tocada' : ''].filter(Boolean).join(' ');
  return `<tr${cls ? ` class="${cls}"` : ''}>
    <td class="n">${r.n}</td>
    <td class="pme-upss">${esc(r.upss)}</td>
    <td class="pme-amb">${esc(r.amb)}</td>
    <td class="n">${esc(r.pag)}</td>
    <td class="n">${esc(r.namb)}</td>
    <td><span class="pme-est ${pmeEstCls(r.estado)}">${esc(r.estado)}</span></td>
    <td class="pme-cod">${esc(r.pmf)}</td>
    <td class="pme-amb">${esc(r.ambNts)}${r.codAmb ? ` <small>${esc(r.codAmb)}</small>` : ''}</td>
    <td>${pmeEt(r.nAmbNorma)}</td>
    <td>${pmeConf(r.conf)}${r.nota ? `<br><small>${esc(r.nota)}</small>` : ''}</td>
    <td class="pme-cod">${esc(r.c)}</td>
    <td class="pme-desc">${esc(r.d)}</td>
    <td>${esc(r.t)}</td>
    <td class="n">${pmeNum(r.qn)}</td>
    <td class="n">${pmeNum(r.calc)}</td>
    <td class="n pme-q"><input type="number" min="0" step="1" value="${q}"
      onchange="pmeSetQ(${r.n}, this.value)" aria-label="Cantidad PME de la línea ${r.n}"></td>
    <td>${pmeEt(r.nEq)}</td>
    <td>${esc(r.obs)}</td>
  </tr>`;
}

function pmeFil(k, v){
  PME_F[k] = v;
  PME_F.pag = 0;
  /* El buscador repinta con la tabla, no el campo: si repintáramos todo
     el pane el foco se perdería en cada tecla. */
  if(k === 'q'){
    const sel = document.activeElement;
    const pos = sel && sel.selectionStart;
    pintarPme();
    const nuevo = document.querySelector('.pme-fila input[type=search]');
    if(nuevo){ nuevo.focus(); try{ nuevo.setSelectionRange(pos, pos); }catch(e){} }
  }else{
    pintarPme();
  }
}
function pmePag(d){
  PME_F.pag += d;
  pintarPme();
  const w = document.querySelector('.pme-wrap');
  if(w) w.scrollTop = 0;
}

function pmeSetQ(n, v){
  const r = pmeLineas().find(x => x.n === n);
  if(!r) return;
  const num = v === '' ? null : Math.max(0, Math.round(Number(v) || 0));
  const k = pmeClave(r);
  if(num === null || num === (r.fin || 0)) delete PME_U.q[k];
  else PME_U.q[k] = num;
  pmeGuardarLS();
  fisOlvidar();          // el índice de fiscalización lleva totales: se rehace
  pintarPme();
}

/* ══════════════════════ 4 · EXPORTAR ══════════════════════ */

function paneExp(){
  const tocadas = pmeCuantasTocadas();
  const decs = Object.keys(PME_U.dec).filter(k => (PME_U.dec[k] || '').trim()).length;
  return `
  ${pmeSeccion(1, 'Llevarse el PME', 'El Excel es el entregable; el .json es el respaldo del avance')}
  <div class="pme-exp">
    <div class="pme-exp-c">
      <h4>Excel del PME</h4>
      <p>Cinco hojas, como el preliminar: <b>PME</b> línea por línea, <b>Resumen por código</b>,
        <b>Compatibilidad PMF–PMA</b> con tus decisiones, <b>Match de ambientes</b> y <b>Bitácora</b>.
        Lleva las cantidades que corregiste.</p>
      <button type="button" class="ex-btn ver" onclick="pmeExcel()">Descargar .xlsx</button>
      <div class="pme-estado" id="expEstado"></div>
    </div>
    <div class="pme-exp-c">
      <h4>Metrado en el formato LS</h4>
      <p>La hoja <b>PI_POR_ESPECILIDAD_F5</b> con las columnas <b>A a T</b> en su orden, una fila por
        equipo y por ambiente. Las que en tu LS se llenan con fórmulas —NTS, descripción, tipo, familia
        y EQ/OC— van con la fórmula puesta, así que <b>copia la hoja a tu libro LS</b>: ahí están
        «NTS-LEPAS» y «ETO - F6», donde buscan. PISO y MÓDULO salen vacías: el PMA no las da.</p>
      <button type="button" class="ex-btn ver" onclick="pmeExcelLs()">Descargar hoja LS</button>
      ${archHay() ? `<button type="button" class="ex-btn ${ARCH_NOMBRE ? 'ver' : ''}" onclick="archGuardar()">${
        ARCH_NOMBRE ? 'Actualizar ' + esc(ARCH_NOMBRE) : 'Guardar en mi archivo…'}</button>
      ${ARCH_NOMBRE ? `<button type="button" class="ex-btn ver" onclick="archSincronizar()">Sincronizar: traer y volver a escribir</button>
      <button type="button" class="ex-btn" onclick="archTraer()">Sólo traer</button>
      <button type="button" class="ex-btn" onclick="archElegir()">Cambiar archivo</button>
      <button type="button" class="ex-btn" onclick="archOlvidar()">Desvincular</button>` : ''}
      <p class="ex-nota">${ARCH_NOMBRE
        ? 'Vinculado a <b>' + esc(ARCH_NOMBRE) + '</b>. <b>Sincronizar</b> es lo normal: lee las cantidades que corregiste en Excel y vuelve a escribir la hoja, así los colores y la columna OBSERVACION quedan al día. <b>Actualizar</b> sólo escribe y <b>Sólo traer</b> sólo lee. Ciérralo en Excel antes, o Windows no deja escribirlo.'
        : 'Puedes elegir <b>un archivo del disco</b> y que el botón lo sobrescriba siempre, en vez de descargar una copia nueva cada vez. Después se podrá también traer de vuelta lo que corrijas en Excel.'}</p>`
      : '<p class="ex-nota">Para guardar siempre en el mismo archivo del disco hace falta Chrome o Edge.</p>'}
    </div>
    <div class="pme-exp-c">
      <h4>Observaciones y correcciones</h4>
      <p>Lo que observaste con el lápiz y ${tocadas ? `las <b>${pmeNum(tocadas)}</b> cantidades que
        quitaste o pusiste` : 'las cantidades que quites o pongas'} con − y +, cada una con su contexto
        —ambiente, norma, renglón, cantidad de la norma y la tuya—. <b>Es el archivo que me pasas</b>
        para que lo corrija en el origen y vuelva arreglado.</p>
      <button type="button" class="ex-btn ver" onclick="fisObsExcel()">Descargar observaciones (.xlsx)</button>
      <button type="button" class="ex-btn" onclick="fisDescargarObs()">… y el .json</button>
      <p class="ex-nota">El <b>.xlsx</b> trae cuatro hojas y es para leerlo tú; el <b>.json</b> es el
        mismo contenido en el formato que yo aplico en el origen. La lista para repasarlas una a una
        está en <b>Fiscalización</b>, en «Lo que has observado y lo que has corregido».</p>
    </div>
    <div class="pme-exp-c">
      <h4>Respaldo del avance</h4>
      <p>Guarda ${tocadas ? `las <b>${pmeNum(tocadas)}</b> cantidades corregidas` : 'las cantidades corregidas'}
        y ${decs ? `las <b>${decs}</b> decisiones escritas` : 'las decisiones escritas'} en un archivo que puedes
        mover a otro equipo o adjuntar. No lleva los datos del proyecto, sólo tu revisión.</p>
      <button type="button" class="ex-btn" onclick="pmeGuardarJson()">Guardar .json</button>
      <button type="button" class="ex-btn" onclick="document.getElementById('cargaJson').click()">Cargar .json</button>
      <input type="file" id="cargaJson" accept="application/json,.json" style="display:none" onchange="pmeCargarJson(this)">
    </div>
    <div class="pme-exp-c">
      <h4>Volver al preliminar</h4>
      <p>Descarta tus correcciones y deja el PME tal como lo armó el cálculo.
        ${tocadas || decs ? 'Guarda primero el .json si quieres poder volver.' : 'Ahora mismo no hay nada que descartar.'}</p>
      <button type="button" class="ex-btn" ${tocadas || decs ? '' : 'disabled'} onclick="pmeReset()">Descartar la revisión</button>
    </div>
  </div>

  ${pmeSeccion(2, 'Qué se está exportando', 'Para que el Excel no salga con sorpresas')}
  <table class="ex-tabla">
    <tbody>
      <tr><td>Líneas del PME</td><td class="n">${pmeNum(pmeLineas().length)}</td></tr>
      <tr><td>Líneas con cantidad mayor que cero</td><td class="n">${pmeNum(pmeLineas().filter(r => pmeQ(r) > 0).length)}</td></tr>
      <tr><td>Unidades de equipo (sólo EQ)</td><td class="n">${pmeNum(pmeLineas().reduce((a, r) => a + pmeQ(r), 0))}</td></tr>
      <tr><td>Ambientes añadidos por planos</td><td class="n">${pmeNum(pmeExtras().length)}</td></tr>
      <tr><td>Cantidades corregidas a mano</td><td class="n">${pmeNum(tocadas)}</td></tr>
      <tr><td>Discrepancias PMF–PMA con decisión escrita</td><td class="n">${decs} de ${PME_D.c.dis}</td></tr>
      <tr><td>Observaciones puestas en Fiscalización</td><td class="n">${pmeNum(pmeCuantasObs())}</td></tr>
      <tr class="tot"><td>Ambientes a equipar</td><td class="n">${pmeNum(PME_D.c.act)}</td></tr>
    </tbody>
  </table>
  <p class="ex-nota">El .xlsx se arma en el navegador con la librería SheetJS, que se trae de internet la primera
    vez. Sin conexión el botón avisa y queda el .json, que tiene lo mismo.</p>`;
}

function expMsg(t, cls){
  const e = document.getElementById('expEstado');
  if(e){ e.textContent = t; e.className = 'pme-estado ' + (cls || ''); }
}

/* Descarga de un archivo armado en memoria. */
function pmeBajar(blob, nombre){
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 400);
}

function pmeSlug(){
  return PME_D.meta.proyecto.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function pmeGuardarJson(){
  const o = {
    herramienta: 'PME-PROPIO',
    proyecto: PME_D.meta.proyecto,
    guardado: new Date().toISOString(),
    v: 2,
    q: PME_U.q,
    dec: PME_U.dec,
    obs: PME_U.obs,
    obsr: PME_U.obsr,
    extra: PME_U.extra,
    forz: PME_U.forz
  };
  pmeBajar(new Blob([JSON.stringify(o, null, 2)], {type: 'application/json'}),
           'revision_PME_' + pmeSlug() + '.json');
}

function pmeCargarJson(input){
  const f = input.files && input.files[0];
  if(!f) return;
  const fr = new FileReader();
  fr.onload = () => {
    try{
      const o = JSON.parse(fr.result);
      PME_U = {q: o.q || {}, dec: o.dec || {}, obs: o.obs || {}, obsr: o.obsr || {}, extra: o.extra || [], forz: o.forz || {}};
      if(o.v !== 2) pmeMigrar();
      pmeGuardarLS();
      fisOlvidar();
      pintarPme();
      expMsg('Revisión cargada: ' + pmeCuantasTocadas() + ' cantidades corregidas.', 'bien');
    }catch(e){
      expMsg('Ese archivo no se pudo leer como respaldo de la revisión.', 'mal');
    }
    input.value = '';
  };
  fr.readAsText(f);
}

function pmeReset(){
  if(!confirm('Se descartan las cantidades corregidas y las decisiones escritas, y el PME vuelve al preliminar. ¿Seguimos?')) return;
  PME_U = {q: {}, dec: {}, obs: {}, obsr: {}, extra: [], forz: {}};
  pmeGuardarLS();
  fisOlvidar();
  pintarPme();
}

/* ─── Excel. SheetJS se trae una sola vez y se recuerda si falló. ─── */
let PME_XLSX = null;

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
  PME_XLSX.catch(() => { PME_XLSX = null; });   // que un fallo no bloquee el reintento
  return PME_XLSX;
}

/* ══════════ EL METRADO EN EL FORMATO LS ══════════
   El presupuesto se arma en el libro LS, en la hoja
   «PI_POR_ESPECILIDAD_F5» —con su errata, que es como se llama—. Esto
   escribe esa hoja con las columnas A a T en su orden y sus mismos
   títulos, para copiarla a ese libro.

   Las cinco columnas que ahí se llenan solas van con la fórmula tal
   cual: A busca la norma en «NTS-LEPAS» y P, R, S y T la descripción,
   el tipo y la familia en «ETO - F6». Son hojas del libro LS, así que
   fuera de él salen en error: esto se copia, no se usa suelto.

   El formato va dentro: la cabecera gris, la banda naranja de cada
   ambiente, el gris de la columna UPSS y la fila azul que separa, igual
   que en el LS de Huari. El .xlsx lo escribe js/04-xlsx.js, porque la
   librería que usa el resto de la herramienta no pone estilos. */
const LS_COLS = ['NTS', 'PISO', 'UPSS/UPS', 'I-1', 'I-2', 'I-3', 'I-4',
  'UNIDADES / ESTRUCTURA ORGANICA', 'PRESTACIONALES / COMPLEMENTARIO',
  'PRESTACIONES DE LA CARTERA DE SERVICIOS DE SALUD', 'ZONA', 'MODULO',
  'CODIGO DE AMBIENTE', 'AMBIENTE', 'CODIGO', 'DESCRIPCION', 'CANTIDAD',
  'TIPO', 'FAMILIA', '(EQ/OC)',
  /* La U no está en el LS de Huari: la añadimos nosotros. El color dice
     cómo quedó cada renglón, pero el color no se puede filtrar ni leer
     en una impresión; esto sí. */
  'OBSERVACION'];
const LS_N = LS_COLS.length;

/* Los anchos y las columnas escondidas del LS de Huari, columna a
   columna. D, K y L van ocultas allí; aquí también. */
const LS_ANCHOS = [7.88, 7.63, 17.25, 12.25, null, null, null, null, null, null,
  8.38, 12.25, 9.75, 19.63, 10.13, 16.5, 12.5, 4.13, null, null, 34];
const LS_OCULTAS = {3: 1, 10: 1, 11: 1};          // D, K, L

/* Los colores del LS, tal como están en Huari. */
const LS_CAB   = {fondo: 'B7B7B7', color: 'FFFFFF', borde: 1, wrap: 1, medio: 1, izq: 1};
const LS_TIT   = {fondo: 'F7CAAC', borde: 1};     // la banda de cada ambiente
const LS_UPSS  = {fondo: 'F2F2F2', borde: 1, medio: 1};
const LS_CELDA = {borde: 1};
const LS_CENT  = {borde: 1, centro: 1, medio: 1};
const LS_CANT  = {borde: 1, centro: 1, medio: 1, fmt: '0'};
const LS_SEP   = {fondo: 'CFE2F3', borde: 1};     // la fila que separa ambientes
const LS_PLANO = {fondo: 'C6E0B4', borde: 1};     // la banda del ambiente del plano
const LS_NOTA  = {borde: 1, color: '7A5B12'};     // la columna de observación

/* Lo que en el LS se llena con fórmulas —la norma, la descripción, el
   tipo y el EQ/OC— aquí va escrito: esas fórmulas buscan en hojas del
   libro de Huari, así que fuera de él salían en blanco y la hoja
   llegaba medio vacía. El dato lo tenemos de la propia NTS, que es de
   donde salen esos catálogos, así que se escribe y se ve. Si prefieres
   que manden tus catálogos, vuelve a pegar las fórmulas encima. */
const LS_OFF  = {fondo: 'D9D9D9', color: '808080', borde: 1};
const LS_OFFC = {fondo: 'D9D9D9', color: '808080', borde: 1, centro: 1, medio: 1, fmt: '0'};
const LS_ANUL = {fondo: 'D9D9D9', color: '808080', borde: 1, tachado: 1};
const LS_REAC = {fondo: 'FFE598', borde: 1};        // lo que reactivaste a mano
const LS_REACC = {fondo: 'FFE598', borde: 1, centro: 1, medio: 1, fmt: '0'};
const LS_ANULC = {fondo: 'D9D9D9', color: '808080', borde: 1, tachado: 1, centro: 1, medio: 1, fmt: '0'};

/* Una fila de veinte celdas; `base` dice el estilo de cada columna. */
function lsFila(base, datos){
  const v = [];
  for(let j = 0; j < LS_N; j++){
    const d = datos[j];
    v.push({v: d === undefined ? null : d, s: base[j] || LS_CELDA});
  }
  return {celdas: v};
}

/* El estilo de toda una fila, columna por columna, según cómo quedó. */
function lsBase(estado){
  const fondo = {ok: LS_CELDA, anul: LS_ANUL, react: LS_REAC, cero: LS_OFF}[estado] || LS_OFF;
  const b = new Array(LS_N).fill(fondo);
  if(estado === 'ok') b[20] = LS_NOTA;
  if(estado === 'ok'){
    b[1] = LS_CENT; b[2] = LS_UPSS; b[12] = LS_CENT;
    b[16] = LS_CANT; b[17] = LS_CENT; b[18] = LS_CENT; b[19] = LS_CENT;
  }else{
    const c = {anul: LS_ANULC, react: LS_REACC}[estado] || LS_OFFC;
    b[1] = c; b[12] = c; b[16] = c; b[17] = c; b[18] = c; b[19] = c;
  }
  return b;
}

function pmeExcelLs(){
  expMsg('Armando la hoja del LS…');
  const r = lsBlob();
  if(r.error){ expMsg('No se pudo armar: ' + r.error, 'mal'); return; }
  pmeBajar(r.blob, r.nombre);
  expMsg(r.resumen + ' Copia la hoja a tu libro LS.');
}

/* La hoja del LS, armada en memoria. La usan el botón de descargar y
   el de guardar en el archivo de siempre, que escriben lo mismo.

   El orden es el de la NORMA, renglón por renglón, no el de lo que
   quedó: se recorre la lista de la NTS de cada ambiente —la misma que
   se ve al fiscalizar— y cada renglón sale en su sitio, esté como esté.
   Si se sacaran sólo las líneas que sobrevivieron, el cero o el anulado
   aparecerían al final, fuera de orden, y cotejar contra la norma se
   volvería imposible. */
function lsBlob(){
  try{
    const filas = [{alto: 37.5, celdas: LS_COLS.map(t => ({v: t, s: LS_CAB}))}];
    let nAmb = 0, nCero = 0, nAnul = 0, nLin = 0, nReac = 0, nPlano = 0, unid = 0;

    fisIdx().lista.forEach(a => {
      const m = a.m;
      if(!a.ren.length) return;            // sin lista de norma no hay metrado
      nAmb++;
      const nombre = (m.ambnts || m.amb || '').toUpperCase();

      const tit = new Array(LS_N).fill(LS_CELDA);
      const banda = a.extra ? LS_PLANO : LS_TIT;
      tit[13] = banda; tit[14] = banda; tit[12] = LS_CENT; tit[20] = LS_NOTA;
      const d = []; d[12] = m.cods; d[13] = nombre;
      if(a.extra){
        nPlano++;
        d[20] = 'AMBIENTE DEL PLANO, no está en el PMA · ' + m.amb
              + (a.nts && a.nts.partes && a.nts.partes.length > 1
                 ? ' · unido de ' + a.nts.partes.length + ' ambientes de la NTS' : '');
      }
      filas.push(lsFila(tit, d));

      a.ren.forEach(x => {
        if(x.p === 'OC') return;           // el OC no se metra, nunca estuvo
        const q = x.ln ? pmeQ(x.ln) : 0;
        const estado = !x.ln ? 'anul'
          : (x.est === 'react' ? 'react' : (q === 0 ? 'cero' : 'ok'));
        if(estado === 'anul') nAnul++;
        else { nLin++; if(q === 0) nCero++; if(estado === 'react') nReac++; unid += q; }
        filas.push(lsFila(lsBase(estado), lsDatos({
          upss: m.upss, cods: m.cods, nombre: nombre,
          c: x.c, d: x.d, t: x.t, p: x.p, zona: m.zona,
          norma: x.ln && x.ln.nEq ? 'NTS ' + x.ln.nEq
               : (a.nts && a.nts.n ? 'NTS ' + a.nts.n : 'Propuesta'),
          q: q,
          nota: {
            ok: a.extra ? 'Equipo de un ambiente añadido por planos' : '',
            cero: 'EN CERO: lo pusiste en cero al fiscalizar',
            anul: 'ANULADO por unificación: el mismo código va en la otra lista '
                + 'de este ambiente y manda la mayor cantidad',
            react: 'REACTIVADO por ti: la unificación lo había anulado y lo volviste a meter',
          }[estado] || ''})));
      });

      filas.push(lsFila(new Array(LS_N).fill(LS_SEP), []));
    });

    const blob = xlLibro({
      nombre: 'PI_POR_ESPECILIDAD_F5',
      cols: LS_ANCHOS.map((a, i) => ({ancho: a, oculta: !!LS_OCULTAS[i]})),
      filas: filas,
      freeze: {x: 17, y: 1},                      // el panel queda en R2
      filtro: 'A1:U' + filas.length,
    });
    const h = new Date();
    const dia = String(h.getDate()).padStart(2, '0') + String(h.getMonth() + 1).padStart(2, '0') + h.getFullYear();
    return {
      blob: blob,
      nombre: 'PI_POR_ESPECIALIDAD_F5_' + pmeSlug() + '_' + dia + '.xlsx',
      resumen: 'Listo: ' + pmeNum(nAmb) + ' ambientes, ' + pmeNum(nLin) +
        ' líneas y ' + pmeNum(unid) + ' unidades' +
        (nCero ? ' · ' + pmeNum(nCero) + ' en cero, en gris' : '') +
        (nAnul ? ' · ' + pmeNum(nAnul) + ' anulados por unificación, en gris y tachados' : '') +
        (nReac ? ' · ' + pmeNum(nReac) + ' reactivados por ti, en amarillo' : '') +
        (nPlano ? ' · ' + pmeNum(nPlano) + (nPlano === 1 ? ' ambiente' : ' ambientes')
                + ' del plano, en verde' : '') + '.',
    };
  }catch(e){
    return {error: e.message};
  }
}

/* Las veinte columnas del LS a partir de una línea. */
function lsDatos(o){
  const d = [];
  d[20] = o.nota || null;          // OBSERVACION, la columna que añadimos
  d[0]  = o.norma;                 // NTS: la norma de la que salió el equipo
  d[2]  = o.upss;
  d[10] = o.zona || null;
  d[12] = o.cods;
  d[13] = o.nombre;
  d[14] = o.c;
  d[15] = o.d;                     // DESCRIPCION
  d[16] = o.q;
  d[17] = o.t;                     // TIPO
  d[18] = o.p;                     // FAMILIA, que en el LS es el EQ/OC
  d[19] = o.p;
  return d;
}

function pmeExcel(){
  expMsg('Armando el Excel…');
  pmeSheetJs().then(XLSX => {
    const wb = XLSX.utils.book_new();

    /* Hoja PME: mismas columnas que el preliminar, para poder comparar. */
    const det = pmeLineas().map(r => ({
      'N°': r.n, 'UPSS / UPS': r.upss, 'Tipo de ambiente': r.tipo, 'Zona': r.zona,
      'Ambiente (PMA)': r.amb, 'Pág. PMA': r.pag, 'N° Amb.': r.namb, 'Estado PMA': r.estado,
      'Cód. PMF': r.pmf,
      'Norma ambiente': r.nAmbNorma ? 'NTS ' + r.nAmbNorma : 'Propuesta',
      'Cód. amb. NTS': r.codAmb, 'Ambiente NTS': r.ambNts,
      'Emparejado por': r.conf, 'Nota del match': r.nota, 'Área PMA (m²)': r.area,
      'Código': r.c, 'Descripción': r.d, 'Tipo': r.t, 'EQ/OC': r.p,
      'Cant. NTS': r.qn, 'Cant. calculada': r.calc, 'Cant. PME': pmeQ(r),
      'Norma equipo': r.nEq ? 'NTS ' + r.nEq : 'Propuesta',
      'Observación': r.obs,
      'Corregido a mano': pmeTocada(r) ? 'Sí (preliminar: ' + (r.fin || 0) + ')' : ''
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(det), 'PME');

    const cons = pmeConsolidado().map(r => ({
      'Código': r.c, 'Descripción': r.d, 'Tipo': r.t, 'EQ/OC': r.p,
      'Ambientes': r.amb, 'Cantidad': r.q,
      'Norma': r.normas.map(n => n ? 'NTS ' + n : 'Propuesta').join(' / ')
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cons), 'Resumen por código');

    const comp = PME_D.pmf.map(r => ({
      'Cód. PMF': r.cod, 'Ambiente (PMF)': r.amb, 'Pág. PMF': r.pag,
      'Ambiente (PMA)': r.pma, 'Resultado': r.res, 'Detalle': r.det,
      'Decisión': (PME_U.dec[r.cod] || '').trim()
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(comp), 'Compatibilidad PMF-PMA');

    const mt = PME_D.match.map(r => ({
      'Pág. PMA': r.pag, 'UPSS / UPS': r.upss, 'Ambiente (PMA)': r.amb, 'N° Amb.': r.n,
      'Área (m²)': r.area, 'Observación PMA': r.obs, 'Estado': r.estado, 'Grupo': r.grupo,
      'Cód. PMF': r.pmf, 'Norma': r.norma, 'Cód. amb. NTS': r.cod, 'Ambiente NTS': r.ambnts,
      'Confianza': r.conf, 'Nota': r.nota
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mt), 'Match de ambientes');

    /* Una fila por aviso de la pestaña Fiscalización: es lo que el
       supervisor va a querer repasar sin abrir la herramienta. */
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fisParaExcel()), 'Fiscalización');

    /* La norma renglón por renglón, con lo que pasó con cada uno. Es la
       hoja con la que se defiende el metrado: enseña también lo que NO
       se copió —el OC, lo anulado— que en la hoja PME no aparece. */
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fisNormaParaExcel()), 'Norma vs PME');

    /* Lo que Luis anotó al fiscalizar. Va en hoja propia porque es lo
       primero que mira quien revisa: son los reparos, no el metrado. */
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fisObsParaExcel()), 'Observaciones');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(extParaExcel()), 'Añadidos por planos');

    const bit = PME_D.log.map(l => ({'Quién': l.who, 'Dónde': l.where, 'Qué': l.what}));
    PME_D.pmf.filter(r => (PME_U.dec[r.cod] || '').trim()).forEach(r => {
      bit.push({'Quién': 'Luis', 'Dónde': r.cod + ' — ' + r.amb, 'Qué': 'Decisión: ' + PME_U.dec[r.cod].trim()});
    });
    pmeLineas().filter(pmeTocada).forEach(r => {
      bit.push({'Quién': 'Luis', 'Dónde': r.amb + ' — ' + r.c,
                'Qué': 'Cantidad corregida de ' + (r.fin || 0) + ' a ' + pmeQ(r)});
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(bit), 'Bitácora');

    const hoy = new Date();
    const f = String(hoy.getDate()).padStart(2, '0') + String(hoy.getMonth() + 1).padStart(2, '0') + hoy.getFullYear();
    XLSX.writeFile(wb, 'PME_' + pmeSlug() + '_' + f + '.xlsx');
    expMsg('Excel descargado con ' + pmeNum(det.length) + ' líneas.', 'bien');
  }).catch(() => {
    expMsg('No se pudo traer la librería de Excel (hace falta internet la primera vez). Usa el respaldo .json.', 'mal');
  });
}

/* ─────────────────────────── ARRANQUE ─────────────────────────── */

function pmeArrancar(){
  /* js/00-datos.js son unos 700 KB: si no llegó entero —se abrió desde un
     servidor que cortó la descarga, o se movió el archivo— mejor decirlo
     que dejar la página en blanco con un error sólo en la consola. */
  if(typeof PME_D === 'undefined'){
    const d = document.getElementById('pmeDet');
    if(d) d.innerHTML = `<p class="pme-nojs">No se cargaron los datos del PME
      (<b>js/00-datos.js</b>). Comprueba que el archivo esté al lado de index.html y vuelve a cargar la página;
      si falta, se regenera con <code>py scripts/generar-datos.py</code>.</p>`;
    return;
  }
  const m = PME_D.meta;
  const h = document.getElementById('pmeHead');
  if(h){
    h.innerHTML = `
      <div class="ph-eyebrow">
        <span>${esc(m.cliente)}</span>
        <span class="ph-estado">Preliminar</span>
      </div>
      <h1>Programa Médico de Equipamiento — ${esc(m.proyecto)}</h1>
      <p class="ex-nombre">${esc(m.nombre)}</p>
      <dl class="ph-meta">
        <div><dt>CUI</dt><dd>${esc(m.cui)}</dd></div>
        <div><dt>Categoría</dt><dd>${esc(m.categoria)}</dd></div>
        <div><dt>Ubicación</dt><dd>${esc(m.ubicacion)}</dd></div>
        <div><dt>Normas</dt><dd>${esc(m.normas)}</dd></div>
        <div><dt>Programas</dt><dd>${esc(m.visado)}</dd></div>
        <div><dt>Última generación</dt><dd>${esc(m.generado)}</dd></div>
      </dl>`;
  }
  pmeCargarLS();
  pintarPme();
  pmeVigilarScroll();
  /* El archivo vinculado se recupera después de pintar: si no está, no
     pasa nada, y si está sólo cambia el texto de un botón. */
  if(typeof archCargar === 'function') archCargar();
}

/* La cabecera del proyecto ocupa casi 300 px y, pasada la primera
   mirada, sólo estorba: al bajar se repliega y la barra de pestañas se
   queda pegada arriba para no perder dónde estás. Al volver al principio
   reaparece. El margen de 90 px evita que parpadee con el rebote del
   propio repliegue. */
/* Las cabeceras pegajosas se apilan: pestañas, cabecera de la tabla y
   banda de UPSS. Sus alturas cambian con el ancho —los títulos parten en
   más o menos líneas—, así que se miden y se guardan en variables CSS en
   vez de clavarlas a mano. */
function pmeMedirTopes(){
  const tabs = document.querySelector('.det-tabs');
  const r = document.documentElement;
  const sitio = document.querySelector('body > header');
  const alto = (sitio ? sitio.offsetHeight : 70) + (tabs ? tabs.offsetHeight : 0);
  r.style.setProperty('--tope', alto + 'px');
  const fila = document.querySelector('.fis-tabla thead tr:last-child');
  if(fila) r.style.setProperty('--altoFila', fila.offsetHeight + 'px');
  const banda = document.querySelector('.fis-tabla tr.fis-upss td');
  if(banda) r.style.setProperty('--altoBanda', banda.offsetHeight + 'px');
  const amb = document.querySelector('.fis-tabla tr.fis-r.abierta');
  const altoAmb = amb ? amb.offsetHeight : 0;
  r.style.setProperty('--altoAmbiente', altoAmb + 'px');


}
window.addEventListener('resize', () => {
  if(typeof pmeMedirTopes === 'function') pmeMedirTopes();
});

function pmeVigilarScroll(){
  let puesto = false;
  const mirar = () => {
    const baja = window.pageYOffset > (puesto ? 40 : 90);
    if(baja !== puesto){
      puesto = baja;
      document.body.classList.toggle('compacto', baja);
    }
  };
  window.addEventListener('scroll', mirar, {passive: true});
  mirar();
  window.addEventListener('scroll', pmeCabDetalle, {passive: true});
}

/* La copia pegajosa de la cabecera de la lista de la norma se enseña
   sólo cuando la de verdad ya se fue por arriba. Si estuviera siempre,
   aparecería entre los botones de cotejo y el resumen del ambiente, que
   no es su sitio. */
function pmeCabDetalle(){
  const copia = document.querySelector('.fis-cabdet > td');
  const real = document.querySelector('.fis-det-caja table.fis-eq:not(.fis-eq-copia) thead');
  const puesta = document.body.classList.contains('cabdet');
  if(!copia || !real){
    if(puesta) document.body.classList.remove('cabdet');
    return;
  }
  /* El tope de la copia es su propio borde superior cuando está pegada. */
  const linea = copia.getBoundingClientRect().top;
  const caja = real.closest('table').getBoundingClientRect();
  const toca = real.getBoundingClientRect().top < linea + 2 && caja.bottom > linea + 40;
  if(toca !== puesta) document.body.classList.toggle('cabdet', toca);
}

document.addEventListener('DOMContentLoaded', pmeArrancar);
