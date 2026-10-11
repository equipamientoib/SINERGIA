/* =====================================================================
   02-fiscalizacion.js — PESTAÑA «FISCALIZACIÓN»
   ---------------------------------------------------------------------
   Una fila por ambiente y tres columnas enfrentadas —PMF, PMA, NTS—
   para poder decir en voz alta, delante de un supervisor:

     «este ambiente el PMF lo llama así, el PMA así, en la NTS es este
      otro; la norma le da estos renglones, se copiaron éstos, éstos no
      y por esto».

   Al abrir una fila sale LA LISTA DE LA NORMA TAL CUAL, renglón por
   renglón y en su orden, con lo que pasó con cada uno:

     · COPIADO            entró al PME con su cantidad.
     · NO SE METRA (OC)   la norma lo marca OC: queda fuera por regla.
     · ANULADO            el ambiente está unificado y el código ya lo
                          lleva el ambiente destino. No se suma, manda
                          la mayor cantidad.
     · REPETIDO EN LA NORMA  la propia NTS trae el renglón dos veces, y
                          el ambiente termina con el doble. Esto sí es
                          un error y va en rojo.
     · EL AMBIENTE NO SE EQUIPA  retirado, sin N.º o funciona en otro:
                          todo queda en 0, pero se enseña igual.

   De dónde sale cada cosa:
     PME_D.nts[ia]  la lista de la norma del ambiente (de la NTS)
     PME_D.cat      código → [descripción, tipo, EQ/OC]
     PME_D.pme      lo que entró al PME, con r.ia apuntando al ambiente
     PME_D.match    la fila del PMA ya emparejada
     PME_D.pmf      la fila del PMF

   Esta pestaña NO edita: las cantidades se corrigen en la pestaña PME.
   ===================================================================== */

const FIS = {q: '', upss: '', alerta: '', abierto: null, cod: null};

/* UPSS plegadas. Son 23 bloques y 232 ambientes: poder cerrar los que
   no se están revisando es la diferencia entre auditar y hacer scroll. */
const FIS_PLEGADAS = new Set();

/* El documento que se está mirando en el cajón de la derecha:
   {doc: 'pmf'|'pma', pag: n, amb: i} o null. */
let FIS_FUENTE = null;

/* Los documentos de origen. En la versión de un solo archivo los PDF van
   dentro (armar-unico.py los mete aquí como data URI) y el Excel de
   normas no, porque pesa 1,4 MB y no se puede enseñar en el navegador. */
const FIS_DOCS = {
  /* `pag` lleva una página suelta cada una: el visor del navegador ignora
     el «#page=N» cuando el PDF va dentro de un iframe y enseña siempre la
     primera. Cargando el archivo de una página no hay equivocación
     posible, y pesa lo mismo. Las arma scripts/enderezar-pdf.py. */
  pmf: {nom: 'Programa Médico Funcional compartido', pags: 2,
        pag: n => '../../data/pachas/paginas/pmf-' + n + '.pdf',
        abrir: n => '../../data/pachas/PMF-visado.pdf#page=' + n},
  pma: {nom: 'Programa Médico Arquitectónico compartido', pags: 4,
        pag: n => '../../data/pachas/paginas/pma-' + n + '.pdf',
        abrir: n => '../../data/pachas/PMA-visado.pdf#page=' + n},
  /* `arch` es el nombre que se enseña. `src` puede acabar siendo un data
     URI de 1,8 MB —en la versión de un solo archivo el Excel va dentro—,
     y de ahí no se puede sacar un nombre legible. */
  xls: {src: '../../data/pachas/NTS_MINSA_113_110_119.xlsx', arch: 'NTS_MINSA_113_110_119.xlsx',
        nom: 'Excel de normas NTS 113 / 110 / 119'}
};

/* Cómo se le pide la página al visor del navegador: sin su barra de
   herramientas —son 56 px que aquí no sobran— y con la página entera a
   la vista, que con tres paneles es lo único que deja ver de qué va el
   documento. El zoom del propio visor sigue estando con Ctrl + rueda. */
const FIS_VISOR = '#toolbar=0&navpanes=0&view=Fit';

let FIS_IX = null;

/* ─────────────────────── ÍNDICE ─────────────────────── */

/* Se recorre todo una vez y se deja masticado: qué renglones de norma y
   qué líneas de PME tiene cada ambiente, en qué ambientes está cada
   código y qué avisos lleva cada ambiente. */
function fisIdx(){
  if(FIS_IX) return FIS_IX;

  const porAmb = {};
  PME_D.match.forEach((m, i) => { porAmb[i] = {i: i, m: m, ls: [], alertas: []}; });

  /* Los ambientes añadidos por planos se fiscalizan igual que los del
     PMA: se les arma aquí la misma ficha —con su lista de la norma— y
     de ahí en adelante no se distinguen. Lo único que no tienen es
     página del PMA ni fila del Excel de normas: no salen de ahí. */
  pmeExtras().forEach(e => {
    const ambs = extAmbs(e);
    const i = 'P' + e.id;
    porAmb[i] = {
      i: i, ls: [], alertas: [], extra: e,
      m: {upss: e.upss, tipo: 'Añadido por planos', zona: '', amb: e.amb,
          n: e.n, area: '', obs: e.nota || '', estado: 'Añadido por planos',
          grupo: '', pmf: '', pag: '',
          norma: ambs.length ? 'NTS ' + ambs[0].n : 'Propuesta',
          cod: ambs.map(a => a.cod).filter(Boolean).join(' + '),
          ambnts: ambs.map(a => a.amb).join(' + '),
          conf: 'Añadido por planos',
          nota: 'Ambiente del plano que no está en el PMA; se equipa con '
              + (ambs.length > 1 ? 'las listas de ' + ambs.length + ' ambientes de la NTS'
                                 : 'la lista de la NTS que elegiste'),
          cods: extCodsTxt(e), codsl: extCods(e)},
      ntsExtra: ambs.length ? {
        id: ambs.map(a => a.id).join(' + '), n: ambs[0].n,
        cod: ambs.map(a => a.cod).filter(Boolean).join(' + '),
        amb: ambs.map(a => a.amb).join(' + '),
        upss: ambs[0].upss, tipo: 'Añadido por planos', zona: '',
        hoja: '', f0: '', f1: '', fil: [], eq: extEq(e),
        partes: ambs.length > 1 ? ambs.map(a => ({
          id: a.id, n: a.n, cod: a.cod, amb: a.amb, upss: a.upss,
          tipo: '', zona: '', hoja: '', f0: '', f1: '', fil: [], ne: a.eq.length
        })) : []
      } : null
    };
  });

  const porCod = {};
  pmeLineas().forEach(r => {
    const a = porAmb[r.ia];
    if(a) a.ls.push(r);
    (porCod[r.c] || (porCod[r.c] = {c: r.c, d: r.d, t: r.t, amb: []})).amb.push(r);
  });

  const disPmf = {};
  PME_D.pmf.forEach(p => { if(p.res !== 'Compatible') disPmf[p.cod] = p; });

  /* Cuántos ambientes tiene cada grupo, para poder decirlo en el aviso
     sin haber armado todavía el índice de grupos. */
  const porGrupoTmp = {};
  Object.values(porAmb).forEach(a => {
    if(a.m.grupo) porGrupoTmp[a.m.grupo] = (porGrupoTmp[a.m.grupo] || 0) + 1;
  });

  Object.values(porAmb).forEach(a => {
    const m = a.m, al = a.alertas;
    a.nts = a.ntsExtra || PME_D.nts[a.i] || null;
    a.ren = fisRenglones(a);
    a.unid = a.ls.reduce((s, r) => s + pmeQ(r), 0);
    a.oc = a.ren.filter(x => x.p === 'OC').length;
    a.dups = [...new Set(a.ren.filter(x => x.est === 'dup').map(x => x.c))];
    a.anul = a.ren.filter(x => x.est === 'anul').length;

    const oA = PME_U.obs && PME_U.obs[m.cods];
    const oR = Object.keys(PME_U.obsr || {}).filter(k => k.split('|')[0] === m.cods).length;
    if((oA && ((oA.t || '').trim() || oA.mal)) || oR){
      al.push({t: 'obs', txt: 'Tienes puesta una observación' + (oR ? ' y ' + oR + ' en renglones' : '') +
        ((oA && oA.mal) ? ' · marcado como que está mal' : '')});
    }
    /* Dos ambientes de la norma detrás de una sola línea del PMA: hay
       que decirlo arriba, porque cambia lo que se espera ver abajo. */
    if(a.nts && a.nts.partes && a.nts.partes.length > 1){
      al.push({t: 'unidos', txt: 'Esta línea del PMA junta ' + a.nts.partes.length +
        ' ambientes de la norma (' + a.nts.partes.map(p => p.id + ' ' + p.amb).join(' + ') +
        '): se equipa con las dos listas, y de los códigos que piden las dos manda la mayor cantidad, no se suman'});
    }
    if(m.grupo) al.push({t: 'unif2', txt: 'Unificado en el grupo ' + m.grupo + ' con ' +
      ((porGrupoTmp[m.grupo] || 1) - 1) + ' ambiente(s) más: la lista de equipos se une y no se suma'});
    if(a.dups.length) al.push({t: 'dup', txt: 'La norma trae el renglón repetido y el ambiente se lleva el doble: ' +
      a.dups.join(', ')});
    if((m.conf || '').indexOf('Propuesta') === 0 || m.conf === 'Sin match'){
      al.push({t: 'prop', txt: 'Ambiente emparejado con la NTS por propuesta nuestra' + (m.nota ? ' — ' + m.nota : '')});
    }
    if(!m.ambnts) al.push({t: 'sinnts', txt: 'Sin ambiente equivalente en la NTS 113, la 110 ni la 119' +
      (m.nota ? ' — ' + m.nota : '')});
    if(a.anul) al.push({t: 'unif', txt: a.anul + (a.anul === 1 ? ' renglón anulado' : ' renglones anulados') +
      ' por unificación (no se suma, manda la mayor cantidad)'});
    if(m.estado === 'Retirado por demanda' || m.estado === 'Sin N° Amb.' || m.estado === 'Funciona en otro'){
      al.push({t: 'cero', txt: m.estado + (m.obs ? ' — ' + m.obs : '')});
    }
    if(m.pmf && disPmf[m.pmf]) al.push({t: 'pmf', txt: 'Discrepancia PMF–PMA: ' + disPmf[m.pmf].det});
  });

  /* Los grupos de unificación, para poder enseñar el grupo entero desde
     cualquiera de sus ambientes. El PMA los marca de dos maneras —área
     en celda combinada, u observación «funciona en …»— y las dos acaban
     aquí, porque para el metrado son lo mismo: una sola lista de equipos
     entre varios ambientes. */
  const porGrupo = {};
  Object.values(porAmb).forEach(a => {
    if(a.m.grupo) (porGrupo[a.m.grupo] || (porGrupo[a.m.grupo] = [])).push(a);
  });

  /* El orden es el del PMA, y cada añadido por planos va detrás del
     último ambiente de SU unidad productora: buscarlo al final de la
     lista, después de la cocina y las cisternas, no tiene sentido
     cuando lo que se está revisando es consulta externa. */
  const extrasUpss = {};
  Object.values(porAmb).forEach(a => {
    if(a.extra) (extrasUpss[a.m.upss] || (extrasUpss[a.m.upss] = [])).push(a);
  });
  const lista = [];
  PME_D.match.forEach((m, i) => {
    lista.push(porAmb[i]);
    const sig = PME_D.match[i + 1];
    if(extrasUpss[m.upss] && (!sig || sig.upss !== m.upss)){
      extrasUpss[m.upss].forEach(a => lista.push(a));
      delete extrasUpss[m.upss];
    }
  });
  /* Lo que se añadió en una unidad que el PMA no programó va al final. */
  Object.values(extrasUpss).forEach(ls => ls.forEach(a => lista.push(a)));

  FIS_IX = {porAmb: porAmb, porCod: porCod, porGrupo: porGrupo, lista: lista};
  return FIS_IX;
}

/* La unión de equipos de un grupo unificado: un renglón por código, con
   lo que pedía cada ambiente y la cantidad que quedó.

   La regla es que NO se suma: se toma la mayor. Esta tabla existe para
   poder enseñar justo eso —qué pedía cada uno, cuál mandó y cuáles se
   descartaron—, que es lo primero que pregunta un supervisor. */
function fisGrupo(g){
  const ix = fisIdx();
  const miembros = ix.porGrupo[g] || [];
  const cods = {};
  miembros.forEach(a => {
    a.ls.forEach(r => {
      const o = cods[r.c] || (cods[r.c] = {c: r.c, d: r.d, t: r.t, por: {}, fin: 0});
      /* `calc` es lo que pedía ese ambiente antes de aplicar la regla;
         `fin` es lo que quedó. Sólo uno del grupo se queda con el código. */
      o.por[a.i] = {pedia: r.calc, queda: pmeQ(r), anulado: (r.obs || '').indexOf('Ambiente unificado') === 0};
      o.fin = Math.max(o.fin, pmeQ(r));
    });
  });
  return {miembros: miembros, cods: Object.values(cods)};
}

/* Los renglones de la norma del ambiente, en el orden de la norma, cada
   uno con la línea del PME que le corresponde y qué pasó con él.

   El emparejamiento se hace recorriendo las dos listas a la vez: las
   líneas del PME salen de la norma y en su mismo orden, y sólo de los
   renglones EQ. Cuando aun así no coinciden —un ambiente de propuesta
   al que se le armó la lista de otra manera— se cae a buscar por
   código, que es lo peor que puede pasar y no se calla: queda marcado. */
function fisRenglones(a){
  const out = [];
  const libres = a.ls.slice();
  const vistos = {};

  if(a.nts){
    /* Cada renglón dice de qué parte viene: con «Consultorio CRED +
       Estimulación temprana» detrás hay dos listas de la norma puestas
       una tras otra. El repetido se cuenta DENTRO de cada parte —que
       las dos listas pidan papelera no es que la norma se repita— y el
       renglón que perdió la unión viene ya marcado desde el metrado. */
    const vistosP = {};
    a.nts.eq.forEach((par, j) => {
      const cod = par[0], qn = par[1], ip = par[2] || 0, unido = par[3] === 1;
      const c = PME_D.cat[cod] || ['(sin descripción en el catálogo)', '', 'EQ'];
      const p = c[2];
      const kv = ip + '|' + cod;
      vistosP[kv] = (vistosP[kv] || 0) + 1;
      vistos[cod] = (vistos[cod] || 0) + 1;

      let ln = null;
      if(p !== 'OC'){
        /* El anulado sólo se queda con una línea si es la que tú
           reactivaste; las demás son de los renglones que mandaron. */
        const k = libres.findIndex(r => unido ? (r.forzada && r.c === cod)
                                              : (!r.forzada && r.c === cod));
        if(k >= 0) ln = libres.splice(k, 1)[0];
      }

      let est = 'ok';
      if(p === 'OC') est = 'oc';
      else if(unido) est = ln ? 'react' : 'anul';
      else if(!ln) est = 'falta';
      else if((ln.obs || '').indexOf('Ambiente unificado') === 0) est = 'anul';
      else if(pmeQ(ln) === 0) est = 'cero';
      /* El rojo es para la segunda aparición en adelante: el primer
         renglón es legítimo, el que sobra es el repetido. */
      if(p !== 'OC' && !unido && vistosP[kv] > 1) est = 'dup';

      out.push({j: j + 1, c: cod, d: c[0], t: c[1], p: p, qn: qn, ln: ln, est: est,
                vez: vistosP[kv], ip: ip, unido: unido});
    });
  }

  /* Lo que está en el PME y no en la lista de la norma. En este proyecto
     no pasa, pero si un día pasa tiene que verse, no desaparecer. */
  libres.forEach(r => {
    out.push({j: '', c: r.c, d: r.d, t: r.t, p: r.p, qn: r.qn, ln: r,
              est: a.nts ? 'extra' : 'sinnorma', vez: 1});
  });
  return out;
}

/* El ambiente del PMA se identifica por su número de fila y el añadido
   por planos por un id de texto («Pmv2rmdae»). En un onclick el número
   va suelto y el texto tiene que ir entre comillas, o el navegador lo
   lee como el nombre de una variable y no pasa nada al pulsar. */
function fisId(i){ return typeof i === 'string' ? "'" + i + "'" : i; }

function fisOlvidar(){ FIS_IX = null; FIS_FZ = null; }

/* ─────────── RENGLONES ANULADOS QUE SE REACTIVAN ───────────
   La unificación descarta el renglón que pide menos. Casi siempre está
   bien, pero a veces el ambiente de verdad lleva los dos —dos sillas,
   una por puesto— y hay que poder decirlo sin tocar la regla.

   Reactivar no borra nada ni cambia el metrado de los demás: añade una
   línea más al PME, marcada, con la cantidad que pongas. Bajarla a cero
   la quita y el renglón vuelve a estar anulado, que es su estado
   natural. Se guarda con la revisión, no con los datos.

   La clave lleva una «u» para no chocar con la del renglón que sí
   mandó, que tiene el mismo ambiente y el mismo código. */
let FIS_FZ = null;

function fisClaveFz(cods, cod, j){ return cods + '|' + cod + '|u' + j; }

function fisForzar(ia, j, d){
  const a = fisIdx().porAmb[ia];
  if(!a) return;
  const x = a.ren.find(y => String(y.j) === String(j));
  if(!x) return;
  if(!PME_U.forz) PME_U.forz = {};
  const k = fisClaveFz(a.m.cods, x.c, j);
  const v = Math.max(0, (Number(PME_U.forz[k]) || 0) + d);
  if(v) PME_U.forz[k] = v; else delete PME_U.forz[k];
  pmeGuardarLS();
  fisOlvidar();
  pintarPme();
}

/* Las líneas que salen de lo reactivado. Se arman de los datos, no del
   índice de fiscalización, porque ese índice las necesita a ellas. */
function pmeForzadas(){
  if(FIS_FZ) return FIS_FZ;
  const fz = PME_U.forz || {};
  const out = [];
  if(Object.keys(fz).length){
    const mete = (m, nts, eq, ia) => {
      if(!nts) return;
      eq.forEach((par, j) => {
        if(par[3] !== 1) return;                 // sólo los anulados
        const c = PME_D.cat[par[0]];
        if(!c || c[2] === 'OC') return;
        const q = Number(fz[fisClaveFz(m.cods, par[0], j + 1)]) || 0;
        if(q <= 0) return;
        out.push({
          n: 'R' + ia + '-' + (j + 1), ia: ia, forzada: true,
          upss: m.upss, tipo: m.tipo, zona: m.zona, amb: m.amb,
          pag: m.pag, namb: m.n, estado: m.estado, pmf: m.pmf,
          nAmbNorma: nts.n, codAmb: m.cod, ambNts: m.ambnts,
          c: par[0], d: c[0], t: c[1], p: c[2],
          qn: par[1], calc: q, fin: q, nEq: nts.n,
          obs: 'Renglón anulado por unificación que reactivaste a mano',
          conf: m.conf, nota: m.nota, area: m.area, grupo: m.grupo,
          cods: m.cods, codsl: m.codsl,
        });
      });
    };
    PME_D.match.forEach((m, i) => {
      const nts = PME_D.nts[i];
      if(nts) mete(m, nts, nts.eq, i);
    });
    pmeExtras().forEach(e => {
      const ambs = extAmbs(e);
      if(!ambs.length) return;
      const m = {upss: e.upss, tipo: 'Añadido por planos', zona: '', amb: e.amb,
                 pag: '', n: e.n, estado: 'Añadido por planos', pmf: '',
                 cod: ambs.map(a => a.cod).filter(Boolean).join(' + '),
                 ambnts: ambs.map(a => a.amb).join(' + '),
                 conf: 'Añadido por planos', nota: '', area: '', grupo: '',
                 cods: extCodsTxt(e), codsl: extCods(e)};
      mete(m, {n: ambs[0].n}, extEq(e), 'P' + e.id);
    });
  }
  FIS_FZ = out;
  return out;
}

const FIS_ALERTAS = {
  obs:    ['Con observación tuya', 'lo que marcaste al fiscalizar'],
  unif2:  ['Ambientes unificados', 'comparten ambiente: la lista se une'],
  unidos: ['Dos ambientes en una línea', 'el PMA junta dos ambientes de la NTS'],
  dup:    ['Repetido en la norma', 'la NTS trae el renglón dos veces'],
  pmf:    ['Discrepancia PMF–PMA', 'el PMF y el PMA no dicen lo mismo'],
  prop:   ['Emparejado por propuesta', 'el ambiente NTS lo elegimos nosotros'],
  sinnts: ['Sin ambiente en la NTS', 'no se equipa, queda declarado'],
  unif:   ['Renglones anulados', 'unificación: no se suma, manda la mayor'],
  cero:   ['No se equipa', 'retirado, sin N.º o funciona en otro']
};

/* Cómo se enseña cada renglón de la norma. */
const FIS_EST = {
  ok:       ['copiado', 'ok'],
  oc:       ['no se metra · OC', 'oc'],
  anul:     ['anulado por unificación', 'unif'],
  react:    ['lo reactivaste tú', 'react'],
  dup:      ['repetido en la norma', 'mal'],
  cero:     ['en cero', 'unif'],
  falta:    ['no llegó al PME', 'mal'],
  extra:    ['está en el PME y no en la norma', 'mal'],
  sinnorma: ['sin lista de norma', 'oc']
};

/* ─────────────────────── FILTRO ─────────────────────── */

function fisFiltradas(){
  const ix = fisIdx();
  const q = FIS.q.trim().toLowerCase();
  return ix.lista.filter(a => {
    const m = a.m;
    if(FIS.upss && m.upss !== FIS.upss) return false;
    if(FIS.alerta && !a.alertas.some(x => x.t === FIS.alerta)) return false;
    /* «grupo:ADM» en el buscador deja sólo ese grupo unificado. */
    if(q.indexOf('grupo:') === 0) return (m.grupo || '').toLowerCase() === q.slice(6).trim();
    if(q){
      const cab = (m.upss + ' ' + m.amb + ' ' + (m.ambnts || '') + ' ' + (m.cod || '') +
                   ' ' + (m.cods || '') +
                   ' ' + (m.pmf || '') + ' ' + (m.obs || '') + ' ' + (m.nota || '') +
                   ' ' + (a.nts ? a.nts.id : '')).toLowerCase();
      if(cab.indexOf(q) < 0 && !a.ren.some(x => (x.c + ' ' + x.d).toLowerCase().indexOf(q) >= 0)) return false;
    }
    return true;
  });
}

function fisFil(k, v){
  FIS[k] = v;
  if(k === 'q'){
    const pos = document.activeElement && document.activeElement.selectionStart;
    pintarPme();
    const n = document.querySelector('.fis-fila input[type=search]');
    if(n){ n.focus(); try{ n.setSelectionRange(pos, pos); }catch(e){} }
  }else{
    pintarPme();
  }
}
function fisAlerta(t){ FIS.alerta = FIS.alerta === t ? '' : t; FIS.abierto = null; pintarPme(); }

/* Dejar en la tabla sólo los ambientes de un grupo unificado: se busca
   por su nombre de grupo, que es lo que llevan todos sus miembros. */
function fisVerGrupo(g){
  FIS.alerta = '';
  FIS.upss = '';
  FIS.q = 'grupo:' + g;
  FIS.abierto = null;
  FIS_PLEGADAS.clear();
  pintarPme();
}
function fisAbrir(i){
  /* El añadido por planos no está en el match: su unidad se mira en el
     índice, que los tiene a todos. */
  const a = fisIdx().porAmb[i];
  if(a) FIS_PLEGADAS.delete(a.m.upss);
  const abre = FIS.abierto !== i;
  FIS.abierto = abre ? i : null;
  pintarPme();
  /* La página no se mueve: el detalle se abre debajo de la fila y el
     clic deja la vista donde estaba. Mover la página bajo el cursor
     justo después de pulsar desorienta más de lo que ayuda. */
}
function fisCod(c){
  const abre = FIS.cod !== c;
  FIS.cod = abre ? c : null;
  pintarPme();
  if(abre) setTimeout(() => {
    const e = document.querySelector('.fis-ficha');
    if(e) e.scrollIntoView({block: 'center', behavior: 'smooth'});
  }, 40);
}

/* ─────────────────────── PINTADO ─────────────────────── */

function paneFis(){
  const ix = fisIdx();
  /* Con el cajón de cotejo abierto quedan ~780 px para 17 columnas: no
     caben sin partir las palabras letra a letra. En ese caso se enseñan
     sólo las que identifican el ambiente y se dejan fuera las que están
     repetidas en el detalle (nombre del PMF, área, emparejado, normas).
     Nada se pierde: todo sigue en la fila abierta. */
  const angosto = !!FIS_FUENTE;
  const fs = fisFiltradas();
  const upss = [...new Set(PME_D.match.map(r => r.upss))];
  const cuenta = {};
  Object.keys(FIS_ALERTAS).forEach(t => {
    cuenta[t] = ix.lista.filter(a => a.alertas.some(x => x.t === t)).length;
  });

  /* Totales de la norma contra el PME: el titular de la fiscalización. */
  const ren = ix.lista.reduce((s, a) => s + a.ren.filter(x => x.j !== '').length, 0);
  const oc = ix.lista.reduce((s, a) => s + a.oc, 0);
  const cop = ix.lista.reduce((s, a) => s + a.ls.length, 0);
  const mal = ix.lista.reduce((s, a) => s + a.ren.filter(x => x.est === 'falta' || x.est === 'extra').length, 0);

  return `
  ${pmeSeccion(1, 'La norma contra el PME', 'Lo que la NTS manda y lo que se copió')}
  <div class="kpis">
    <div class="kpi dark"><b>${pmeNum(ren)}</b><span>Renglones de la NTS<br>en los ${pmeNum(ix.lista.filter(a => a.nts).length)} ambientes con norma</span></div>
    <div class="kpi"><b>${pmeNum(ren - oc)}</b><span>Son EQ<br>y se metran</span></div>
    <div class="kpi"><b>${pmeNum(oc)}</b><span>Son OC<br>quedan fuera por regla</span></div>
    <div class="kpi"><b>${pmeNum(cop)}</b><span>Líneas en el PME<br>${cop === ren - oc ? 'cuadra con los EQ' : 'NO cuadra con los EQ'}</span></div>
    <div class="kpi ${mal ? 'alerta' : ''}"><b>${pmeNum(mal)}</b><span>Renglones sin pareja<br>ni falta ni sobra nada</span></div>
  </div>

  ${pmeSeccion(2, 'Qué hay que mirar', 'Cada cuadro filtra la tabla de abajo')}
  <p class="ex-nota">Un código <b>repetido en la norma</b> sí es un error: la lista de la NTS trae el renglón dos
    veces y el ambiente termina con el doble. Un renglón <b>anulado por unificación</b> no lo es: es la regla de no
    sumar. Un <b>OC</b> tampoco: no se metra. Y un código que aparece en muchos ambientes es lo normal; haz clic en
    él y sale en cuáles.</p>
  <div class="kpis fis-kpis">
    ${Object.keys(FIS_ALERTAS).map(t => `
      <button type="button" class="kpi ${FIS.alerta === t ? 'act' : ''} ${cuenta[t] && (t === 'dup' || t === 'pmf') ? 'alerta' : ''}"
        onclick="fisAlerta('${t}')">
        <b>${pmeNum(cuenta[t])}</b><span>${esc(FIS_ALERTAS[t][0])}<br>${esc(FIS_ALERTAS[t][1])}</span>
      </button>`).join('')}
  </div>

  ${fisListaObs()}

  ${extPanel()}

  ${FIS.cod ? fisFichaCod(FIS.cod) : ''}

  ${pmeSeccion((pmeCuantasObs() ? 1 : 0) + (pmeExtras().length ? 1 : 0) + 4, 'PMF · PMA · NTS, ambiente por ambiente', 'Abre una fila y sale la lista de la norma tal cual')}
  <div class="pme-fila fis-fila">
    <input type="search" placeholder="Buscar ambiente, código de ambiente o código de equipo (M-9, D-140, 113-94…)"
      value="${esc(FIS.q)}" oninput="fisFil('q', this.value)">
    <select onchange="fisFil('upss', this.value)">
      <option value="">Todas las UPSS / UPS</option>
      ${upss.map(u => `<option value="${esc(u)}" ${FIS.upss === u ? 'selected' : ''}>${esc(u)}</option>`).join('')}
    </select>
    ${FIS.alerta ? `<button type="button" class="ex-btn" onclick="fisAlerta('${FIS.alerta}')">
      Quitar el filtro «${esc(FIS_ALERTAS[FIS.alerta][0])}» ✕</button>` : ''}
    <button type="button" class="ex-btn" onclick="fisPlegarTodas(true)">Plegar todas</button>
    <button type="button" class="ex-btn" onclick="fisPlegarTodas(false)">Desplegar todas</button>
    <span class="det-n"><b>${pmeNum(fs.length)}</b> de ${pmeNum(ix.lista.length)} ambientes</span>
  </div>

  ${fs.length ? `<div class="pme-wrap fis-wrap">
    <table class="pme-tabla fis-tabla">
      <!-- Los porcentajes suman 96,5 y no 100: el resto se lo lleva la
           columna del botón de abrir, que va en píxeles. Si se pasan de
           ahí, vuelve la barra horizontal. -->
      ${angosto ? `<colgroup>
        <col style="width:26px">
        <col style="width:7%">
        <col style="width:9%"><col style="width:21.5%"><col style="width:4%"><col style="width:10%">
        <col style="width:7%"><col style="width:17%">
        <col style="width:5.5%"><col style="width:9%">
      </colgroup>
      <thead>
        <tr class="fis-grupos">
          <th></th>
          <th class="g-pmf">PMF</th>
          <th colspan="4" class="g-pma">En el PMA <em>manda el alcance</em></th>
          <th colspan="2" class="g-nts">En la NTS <em>de aquí salen los equipos</em></th>
          <th class="g-eq">Eq.</th>
          <th></th>
        </tr>
        <tr>
          <th></th><th>Cód. PMF</th>
          <th>Cód. amb.</th><th>Ambiente (PMA)</th><th class="n">Pág.</th><th>Estado</th>
          <th>Cód. NTS</th><th>Ambiente (NTS)</th>
          <th class="n">Unid.</th><th>Avisos</th>
        </tr>
      </thead>` : `<colgroup>
        <col style="width:26px">
        <col style="width:5.5%"><col style="width:10%">
        <col style="width:7%"><col style="width:11%"><col style="width:3%"><col style="width:3.5%">
        <col style="width:4.5%"><col style="width:7.5%">
        <col style="width:4.5%"><col style="width:4.5%"><col style="width:10%"><col style="width:5.5%">
        <col style="width:4.5%"><col style="width:3.5%"><col style="width:3.5%">
        <col style="width:8.5%">
      </colgroup>
      <thead>
        <tr class="fis-grupos">
          <th></th>
          <th colspan="2" class="g-pmf">En el PMF</th>
          <th colspan="6" class="g-pma">En el PMA <em>manda el alcance</em></th>
          <th colspan="4" class="g-nts">En la NTS <em>de aquí salen los equipos</em></th>
          <th colspan="3" class="g-eq">Equipos</th>
          <th></th>
        </tr>
        <tr>
          <th></th>
          <th>Código</th><th>Ambiente (PMF)</th>
          <th>Cód. amb.</th><th>Ambiente (PMA)</th><th class="n">Pág.</th><th class="n">N.º amb.</th><th class="n">Área</th><th>Estado</th>
          <th>Norma</th><th>Código</th><th>Ambiente (NTS)</th><th>Emparejado</th>
          <th class="n">Norma</th><th class="n">PME</th><th class="n">Unid.</th>
          <th>Avisos</th>
        </tr>
      </thead>`}
      <tbody>${fisCuerpoTabla(fs)}</tbody>
    </table>
  </div>` : '<p class="ex-nota">Ningún ambiente cumple el filtro.</p>'}`;
}

/* El PMA viene ordenado por unidad productora y cada UPSS ocupa un solo
   bloque —se comprueba abajo—, así que basta con meter una banda cada
   vez que cambia. Repetir la UPSS en una columna, 232 veces y con lo
   larga que es, se come el ancho que necesitan los tres documentos. */
function fisCuerpoTabla(fs){
  const out = [];
  const bandas = [];
  let upss = null, cur = null;
  fs.forEach(a => {
    if(a.m.upss !== upss){
      upss = a.m.upss;
      cur = {nom: upss, amb: 0, eq: 0, unid: 0, i: out.length};
      bandas.push(cur);
      out.push(null);                       // sitio reservado para la banda
    }
    cur.amb++;
    cur.eq += a.ls.length;
    cur.unid += a.unid;
    /* Plegada: la banda se queda, las filas no. */
    if(!FIS_PLEGADAS.has(upss)) out.push(fisFila(a));
  });
  bandas.forEach(b => {
    const pl = FIS_PLEGADAS.has(b.nom);
    out[b.i] = `<tr class="fis-upss ${pl ? 'plegada' : ''}"><td colspan="${FIS_FUENTE ? 10 : 17}">
      <button type="button" onclick="fisPlegar(${JSON.stringify(b.nom)})" aria-expanded="${!pl}">
        <i>${pl ? '+' : '−'}</i>
        <b>${esc(b.nom)}</b>
        <span>${pmeNum(b.amb)} ${b.amb === 1 ? 'ambiente' : 'ambientes'} ·
          ${pmeNum(b.eq)} ${b.eq === 1 ? 'equipo' : 'equipos'} ·
          ${pmeNum(b.unid)} ${b.unid === 1 ? 'unidad' : 'unidades'}${pl ? ' · plegada' : ''}</span>
      </button>
    </td></tr>`;
  });
  return out.join('');
}

function fisPlegar(u){
  if(FIS_PLEGADAS.has(u)) FIS_PLEGADAS.delete(u); else FIS_PLEGADAS.add(u);
  pintarPme();
}
function fisPlegarTodas(plegar){
  FIS_PLEGADAS.clear();
  if(plegar){
    fisFiltradas().forEach(a => FIS_PLEGADAS.add(a.m.upss));
    FIS.abierto = null;          // no tiene sentido dejar abierto algo escondido
  }
  pintarPme();
}

/* Por qué un ambiente no se equipa. El estado sale del PMA, y lo que hay
   que poder leer es la frase del PMA, no nuestra etiqueta. */
const FIS_PORQUE = {
  'Retirado por demanda': 'el PMA lo da de baja: no se construye, así que no se equipa',
  'Sin N° Amb.': 'el PMA no le puso número de ambientes, así que no hay por cuánto multiplicar',
  'Funciona en otro': 'el PMA dice que su función la cumple otro ambiente',
  'Unificado': 'comparte ambiente con otro: la lista de equipos se une y no se suma'
};

/* — Una fila del cotejo, y debajo el detalle si está abierta — */
function fisFila(a){
  const m = a.m, ab = FIS.abierto === a.i;
  const p = PME_D.pmf.find(x => x.cod === m.pmf);
  const grave = a.alertas.some(x => x.t === 'dup' || x.t === 'pmf');
  const ren = a.ren.filter(x => x.j !== '').length;

  const angosto = !!FIS_FUENTE;
  const abrir = `<td class="fis-abrir"><button type="button" onclick="fisAbrir(${fisId(a.i)})"
      aria-expanded="${ab}" aria-label="Ver la lista de la norma">${ab ? '−' : '+'}</button></td>`;
  const avisos = `<td>${a.alertas.length ? `<span class="cmp-marcas">${a.alertas.map(x =>
      `<i class="fis-m ${x.t}" title="${esc(x.txt)}">${esc(FIS_ALERTAS[x.t][0])}</i>`).join('')}</span>` : ''}</td>`;

  if(angosto) return `<tr class="fis-r ${ab ? 'abierta' : ''} ${grave ? 'grave' : ''}" id="fisu-${a.i}">
      ${abrir}
      <td class="pme-cod c-pmf">${m.pmf ? esc(m.pmf) : '<span class="fis-nd">—</span>'}</td>
      <td class="pme-cod c-pma">${esc(m.cods || '')}</td>
      <td class="pme-amb c-pma"><b>${esc(m.amb)}</b></td>
      <td class="n c-pma">${esc(m.pag)}</td>
      <td class="c-pma"><span class="pme-est ${pmeEstCls(m.estado)}">${esc(m.estado)}</span>
        ${m.grupo ? `<button type="button" class="fis-grupo" onclick="fisVerGrupo('${esc(m.grupo)}')">grupo ${esc(m.grupo)}</button>` : ''}</td>
      <td class="pme-cod c-nts">${a.nts && a.nts.cod ? esc(a.nts.cod) : '<span class="fis-nd">—</span>'}</td>
      <td class="pme-amb c-nts">${m.ambnts ? esc(m.ambnts) : '<span class="fis-nd">sin ambiente en la norma</span>'}</td>
      <td class="n">${pmeNum(a.unid)}</td>
      ${avisos}
    </tr>
    ${ab ? fisFilaCabNorma(a, 10) + `<tr class="fis-det-r"><td colspan="10">${fisDetalle(a)}</td></tr>` : ''}`;

  return `<tr class="fis-r ${ab ? 'abierta' : ''} ${grave ? 'grave' : ''}" id="fisu-${a.i}">
      ${abrir}

      <td class="pme-cod c-pmf">${m.pmf ? esc(m.pmf) : '<span class="fis-nd">—</span>'}</td>
      <td class="pme-amb c-pmf">${p ? esc(p.amb) : '<span class="fis-nd">no está en el PMF</span>'}</td>

      <td class="pme-cod c-pma">${esc(m.cods || '')}</td>
      <td class="pme-amb c-pma"><b>${esc(m.amb)}</b></td>
      <td class="n c-pma">${esc(m.pag)}</td>
      <td class="n c-pma">${m.n === '' || m.n == null ? '—' : esc(m.n)}</td>
      <td class="n c-pma">${m.area === '' || m.area == null ? '—' : esc(m.area)}</td>
      <td class="c-pma"><span class="pme-est ${pmeEstCls(m.estado)}">${esc(m.estado)}</span>
        ${m.grupo ? `<button type="button" class="fis-grupo" title="Ver los ambientes de este grupo"
          onclick="fisVerGrupo('${esc(m.grupo)}')">grupo ${esc(m.grupo)}</button>` : ''}
        ${m.obs ? `<small>«${esc(m.obs)}»</small>` : ''}</td>

      <td class="c-nts">${a.nts ? pmeEt(a.nts.n) : pmeEt('')}</td>
      <td class="pme-cod c-nts">${a.nts && a.nts.cod ? esc(a.nts.cod) : '<span class="fis-nd">—</span>'}</td>
      <td class="pme-amb c-nts">${m.ambnts ? esc(m.ambnts) : '<span class="fis-nd">sin ambiente en la norma</span>'}
        ${a.nts ? `<small>${esc(a.nts.id)}</small>` : ''}</td>
      <td class="c-nts">${pmeConf(m.conf)}</td>

      <td class="n">${ren ? pmeNum(ren) + (a.oc ? `<small>${a.oc} OC</small>` : '') : '—'}</td>
      <td class="n">${pmeNum(a.ls.length)}</td>
      <td class="n">${pmeNum(a.unid)}</td>

      <td>${a.alertas.length ? `<span class="cmp-marcas">${a.alertas.map(x =>
        `<i class="fis-m ${x.t}" title="${esc(x.txt)}">${esc(FIS_ALERTAS[x.t][0])}</i>`).join('')}</span>` : ''}</td>
    </tr>
    ${ab ? fisFilaCabNorma(a, 17) + `<tr class="fis-det-r"><td colspan="17">${fisDetalle(a)}</td></tr>` : ''}`;
}

/* El reparto de columnas y los títulos de la lista de la norma viven
   aquí porque se usan DOS veces: en la tabla de verdad y en la copia que
   se queda pegada bajo la fila del ambiente. Los dos tienen que llevar
   exactamente el mismo colgroup o no coincidirían las columnas. */
function fisColsNorma(uds){
  return `<colgroup>
    <col style="width:3%"><col style="width:7%"><col><col style="width:5%"><col style="width:6.5%">
    <col style="width:7%">${uds.map(() => `<col style="width:${Math.max(5, 12 / uds.length)}%">`).join('')}
    <col style="width:7%"><col style="width:${uds.length ? 22 - uds.length * 2 : 24}%">
  </colgroup>`;
}
function fisCabNorma(uds){
  return `<thead><tr>
    <th class="n">N.º</th><th>Código</th><th>Descripción</th><th>Tipo</th><th>EQ/OC</th>
    <th class="n" title="Lo que manda la NTS para este ambiente">Cant. norma</th>
    ${uds.map(c => `<th class="n" title="Lo que le toca a este ambiente">${esc(c)}</th>`).join('')}
    <th class="n" title="Lo que entra al PME: 0 si está anulado o el ambiente no se equipa">Cant. PME</th>
    <th>Qué pasó</th>
  </tr></thead>`;
}

/* La copia pegajosa. Va como fila de la tabla grande —hija directa, que
   es donde el navegador sí respeta el tope— y arranca escondida: sólo
   se enseña cuando la cabecera de verdad se ha ido por arriba. */
function fisFilaCabNorma(a, cols){
  const uds = (a.m.codsl && a.m.codsl.length > 1) ? a.m.codsl : [];
  return `<tr class="fis-cabdet" aria-hidden="true"><td colspan="${cols}">
    <table class="pme-tabla fis-eq fis-eq-copia">${fisColsNorma(uds)}${fisCabNorma(uds)}</table>
  </td></tr>`;
}

/* — El detalle: la lista de la norma tal cual — */
function fisDetalle(a){
  const m = a.m;
  const cabecera = fisBotonesFuente(a) + fisPorque(a) + (m.grupo ? fisBloqueGrupo(a) : '');
  if(!a.nts){
    return `<div class="fis-det-caja">
      ${cabecera}
      <p class="fis-no"><b>Este ambiente no tiene lista de norma.</b> No se encontró equivalente en la NTS 113,
        la 110 ni la 119${m.nota ? ' — ' + esc(m.nota) : ''}. No se equipa, pero queda en el PME para que se vea
        que se miró y no que se olvidó.</p>
      ${fisCajaObs(a.i, null, 'Tu observación sobre este ambiente')}
    </div>`;
  }
  const ix = fisIdx();
  const eq = a.ren.filter(x => x.j !== '' && x.p !== 'OC').length;
  /* Una columna por ambiente FÍSICO. Si el PMA pide dos consultorios
     iguales son dos ambientes, con dos códigos, y cada uno se lleva la
     cantidad de la norma: la columna «× N.º amb.» se parte en una por
     código. Con un solo ambiente queda una columna, la de siempre. */
  /* Sólo se abre una columna por ambiente físico cuando hay más de uno.
     Con un único ambiente esa columna repetía la cantidad de la norma y
     no decía nada: se queda «Cant. norma» (lo que manda la NTS) y
     «Cant. PME» (lo que entra, que puede ser 0 o estar corregido). */
  const uds = (m.codsl && m.codsl.length > 1) ? m.codsl : [];

  return `<div class="fis-det-caja">
    ${cabecera}
    <p class="fis-cab">
      <span class="fis-cod-amb">${esc(m.cods || '')}</span>
      <b>${(a.nts.partes && a.nts.partes.length > 1
        ? a.nts.partes.map(p => (p.n === '113' ? 'NTS 113' : 'NTS ' + p.n) +
            (p.cod ? ' · ' + p.cod : '') + ' · ' + p.id + ' · ' + p.amb).map(esc).join(' <span class="fis-mas-amb">+</span> ')
        : (esc(a.nts.n === '113' ? 'NTS 113' : 'NTS ' + a.nts.n) +
           (a.nts.cod ? ' · ' + esc(a.nts.cod) : '') + ' · ' + esc(a.nts.id) + ' · ' + esc(a.nts.amb)))}</b>${
        m.pmf ? ` <span class="fis-cod-pmf">código del PMF: <b>${esc(m.pmf)}</b></span>` : ''}
      trae <b>${pmeNum(a.ren.filter(x => x.j !== '').length)}</b> renglones:
      <b>${pmeNum(eq)}</b> EQ que se metran y <b>${pmeNum(a.oc)}</b> OC que no.
      Al PME entraron <b>${pmeNum(a.ls.length)}</b> ${a.ls.length === 1 ? 'línea' : 'líneas'}
      y <b>${pmeNum(a.unid)}</b> ${a.unid === 1 ? 'unidad' : 'unidades'}
      (la cantidad de la norma × ${m.n === '' || m.n == null ? 'el N.º de ambientes' : '<b>' + esc(m.n) + '</b>'}).
      ${a.nts.zona ? 'Zona: ' + esc(a.nts.zona) + '. ' : ''}${esc(a.nts.tipo)}.
    </p>
    ${a.alertas.length ? `<ul class="fis-avisos">${a.alertas.map(x =>
      `<li class="${x.t}">${esc(x.txt)}</li>`).join('')}</ul>` : ''}
    <h5 class="fis-tit">${m.grupo ? 'Tabla 2 de 2 · ' : ''}La lista de la NTS de <b>${esc(m.cods || m.amb)}</b>,
      renglón por renglón${m.grupo ? ' — sólo de este ambiente, no de todo el grupo' : ''}</h5>
    <table class="pme-tabla fis-eq">
      ${fisColsNorma(uds)}${fisCabNorma(uds)}
      <tbody>${(() => { let parte = -1; return a.ren.map(x => {
        const ln = x.ln, q = ln ? pmeQ(ln) : 0;
        /* Con dos listas pegadas, una banda dice dónde empieza cada
           una: si no, parece una sola lista de la norma con renglones
           repetidos sin motivo. */
        let banda = '';
        const ps = (a.nts.partes || []);
        if(ps.length > 1 && x.j !== '' && x.ip !== parte){
          parte = x.ip;
          const p = ps[x.ip];
          banda = `<tr class="fis-parte"><td colspan="${8 + uds.length}">
            <b>${esc(String.fromCharCode(65 + x.ip))} · ${esc(p.id)} · ${esc(p.amb)}</b>
            <small>${esc(p.cod ? p.cod + ' · ' : '')}NTS ${esc(p.n)} · ${pmeNum(p.ne)} renglones de la norma</small></td></tr>`;
        }
        const oo = fisObs(a.i, x.j || 0);
        const oren = ((oo.t || '').trim() || oo.mal) ? oo : null;
        const et = FIS_EST[x.est];
        const otros = ix.porCod[x.c]
          ? ix.porCod[x.c].amb.filter(y => y.ia !== a.i && pmeQ(y) > 0)
              .reduce((s, y) => { if(s.indexOf(y.ia) < 0) s.push(y.ia); return s; }, []).length
          : 0;
        return banda + `<tr class="${x.est}">
          <td class="n">${x.j || '+'}</td>
          <td><button type="button" class="pme-cod fis-codbtn" onclick="fisCod('${esc(x.c)}')">${esc(x.c)}</button></td>
          <td class="pme-desc">${esc(x.d)}</td>
          <td>${esc(x.t)}</td>
          <td>${esc(x.p)}</td>
          <td class="n">${pmeNum(x.qn)}</td>
          ${uds.map(() => `<td class="n">${ln ? pmeNum(x.qn) : '—'}</td>`).join('')}
          <td class="n pme-q">${(x.est === 'anul' || x.est === 'react')
            /* Un renglón anulado por unificación no tiene línea, pero se
               puede reactivar: el + le da la primera unidad y el − lo
               devuelve a anulado cuando llega a cero. */
            ? `<button type="button" class="fis-mas" title="Una menos"
                onclick="fisForzar(${fisId(a.i)}, ${x.j}, -1)"
                ${q <= 0 ? 'disabled' : ''}>−</button>
              <b class="${q > 0 ? 'tocada' : ''}">${pmeNum(q)}</b>
              <button type="button" class="fis-mas" title="Reactivarlo: entra al PME con esta cantidad"
                onclick="fisForzar(${fisId(a.i)}, ${x.j}, 1)">+</button>`
            : (ln ? `<button type="button" class="fis-mas" title="Una menos"
                onclick="fisSumar(${ln.n}, -1)" ${q <= 0 ? 'disabled' : ''}>−</button>
              <b class="${pmeTocada(ln) ? 'tocada' : ''}">${pmeNum(q)}</b>
              <button type="button" class="fis-mas" title="Una más"
                onclick="fisSumar(${ln.n}, 1)">+</button>` : '—')}</td>
          <td><span class="fis-rep ${et[1]}">${esc(et[0])}${x.est === 'dup' ? ' · ' + x.vez + '.º renglón' : ''}</span>
            ${x.est === 'anul' && ln ? `<small>${esc(ln.obs.replace('Ambiente unificado: se considera en ', 'ya va en '))}</small>` : ''}
            ${x.unido && x.est === 'anul' ? `<small>ya va en la otra lista de este mismo ambiente · no se suma, manda la mayor</small>` : ''}
            ${x.est === 'react' ? `<small>lo anuló la unificación y lo volviste a meter: entra como línea aparte</small>` : ''}
            ${x.est === 'cero' && ln && ln.obs ? `<small>${esc(ln.obs)}</small>` : ''}
            <button type="button" class="fis-lapiz ${oren ? 'puesta' : ''} ${oren && oren.mal ? 'mal' : ''}"
              title="Observar este renglón" onclick="fisAbrirObsRen(${fisId(a.i)}, ${x.j || 0})">✎</button></td>
        </tr>
        <tr class="fis-obsr ${oren ? 'abierta' : ''}" id="obsr-${a.i}-${x.j || 0}">
          <td colspan="9">${fisCajaObs(a.i, x.j || 0,
            'Observación sobre el renglón ' + (x.j || '') + ' · ' + esc(x.c))}</td>
        </tr>`;
      }).join(''); })()}</tbody>
      <tfoot><tr>
        <td colspan="${6 + uds.length}">${pmeNum(a.ren.filter(x => x.j !== '').length)} renglones de la norma ·
          ${pmeNum(a.ls.length)} al PME${a.oc ? ` · ${pmeNum(a.oc)} OC fuera` : ''}${a.anul ? ` · ${pmeNum(a.anul)} anulados` : ''}</td>
        <td class="n">${pmeNum(a.unid)}</td><td></td>
      </tr></tfoot>
    </table>
    ${fisCajaObs(a.i, null, 'Tu observación sobre este ambiente')}
  </div>`;
}

/* ───────────────── EL CAJÓN DE LAS FUENTES ─────────────────
   Auditar es cotejar contra el papel. Estos botones abren el PMF o el
   PMA visados en la página exacta de la que se transcribió la fila, en
   un cajón a la derecha, para poder leer el documento y la herramienta
   a la vez. El visor de PDF del navegador entiende #page=N.           */

/* El cajón guarda sólo QUÉ ambiente se está cotejando; los tres paneles
   se arman de ahí. Las páginas se cambian tocando el src del iframe a
   mano, y los paneles se pliegan tocando una clase: si repintáramos la
   pestaña entera, el visor recargaría el PDF en cada clic. */
function fisVer(ia){
  FIS_FUENTE = {amb: ia};
  pintarPme();
}

/* El cajón vive fuera del pane y sólo se vuelve a armar cuando cambia el
   ambiente que se está cotejando. Si se repintara con la pestaña, cada
   clic en un filtro recargaría los dos PDF, que tardan. */
let FIS_CAJON_PUESTO = null;

function fisPintarCajon(){
  const sitio = document.getElementById('pmeFuente');
  if(!sitio) return;
  const clave = (PME_TAB === 'fis' && FIS_FUENTE) ? FIS_FUENTE.amb : null;
  if(clave === FIS_CAJON_PUESTO) return;
  FIS_CAJON_PUESTO = clave;
  sitio.innerHTML = clave === null ? '' : fisCajonFuente();
  if(clave !== null && fisEnExcel(clave)) fisCargarLibro(clave);
}
function fisCerrarFuente(){ FIS_FUENTE = null; pintarPme(); }

/* El cajón no tapa la página: la empuja. Se le pone al <body> un hueco
   a la derecha del ancho del cajón, así la tabla se corre y se siguen
   viendo las dos cosas, que es de lo que va auditar. */
const FIS_ANCHO_LS = 'pme-cajon-ancho';

function fisAplicarAncho(){
  const guardado = Number(localStorage.getItem(FIS_ANCHO_LS)) || 0;
  const ancho = Math.min(Math.max(guardado || Math.round(innerWidth * 0.52), 420),
                         Math.round(innerWidth * 0.8));
  document.documentElement.style.setProperty('--cajon', ancho + 'px');
  document.body.classList.toggle('con-cajon', !!FIS_FUENTE);
}

/* Arrastrar el borde izquierdo para darle más o menos sitio. */
function fisTirar(ev){
  ev.preventDefault();
  /* Si hubo movimiento, al soltar hay que comerse el «click» que el
     navegador manda a lo que quede bajo el cursor: suele ser la
     cabecera del panel de abajo, y repartir el alto acababa
     plegándolo. */
  let movido = false;
  const mover = e => {
    movido = true;
    const x = (e.touches ? e.touches[0].clientX : e.clientX);
    const ancho = Math.min(Math.max(innerWidth - x, 420), Math.round(innerWidth * 0.8));
    document.documentElement.style.setProperty('--cajon', ancho + 'px');
    try{ localStorage.setItem(FIS_ANCHO_LS, ancho); }catch(e){}
  };
  const soltar = () => {
    document.removeEventListener('mousemove', mover);
    document.removeEventListener('mouseup', soltar);
    document.removeEventListener('touchmove', mover);
    document.removeEventListener('touchend', soltar);
    document.body.classList.remove('tirando');
    if(movido) document.addEventListener('click', e => {
      e.stopPropagation(); e.preventDefault();
    }, {capture: true, once: true});
  };
  document.body.classList.add('tirando');
  document.addEventListener('mousemove', mover);
  document.addEventListener('mouseup', soltar);
  document.addEventListener('touchmove', mover, {passive: false});
  document.addEventListener('touchend', soltar);
}

/* Pasar página sin repintar: se toca el src del iframe y el rótulo. */
function fisFuentePag(doc, d){
  const caja = document.getElementById('fuente-' + doc);
  if(!caja) return;
  const t = FIS_DOCS[doc];
  const pag = Math.min(t.pags, Math.max(1, (Number(caja.dataset.pag) || 1) + d));
  caja.dataset.pag = pag;
  caja.querySelector('iframe').src = t.pag(pag) + FIS_VISOR;
  caja.querySelector('.fis-pan-p b').textContent = pag;
  caja.querySelectorAll('.fis-pan-nav button')[0].disabled = pag <= 1;
  caja.querySelectorAll('.fis-pan-nav button')[1].disabled = pag >= t.pags;
  caja.querySelector('.fis-pan-abrir').href = t.abrir(pag);
}
/* El visor de PDF del navegador se queda en blanco de vez en cuando, y
   ni el zoom ni el desplazamiento lo despiertan. Volver a asignarle el
   src lo obliga a dibujar de nuevo. */
function fisRecargar(doc){
  const caja = document.getElementById('fuente-' + doc);
  if(!caja) return;
  const marco = caja.querySelector('iframe');
  if(!marco) return;
  const src = marco.src;
  marco.src = 'about:blank';
  setTimeout(() => { marco.src = src; }, 60);
}

function fisPlegarPanel(doc){
  const caja = document.getElementById('fuente-' + doc);
  if(caja) caja.classList.toggle('plegado');
}

/* Tres documentos apilados en una pantalla no dan para leerlos los tres
   a la vez; esto deja uno grande y los otros dos en su título, de un
   clic, y del siguiente los devuelve a tercios. */
function fisSoloEste(doc){
  const paneles = [...document.querySelectorAll('.fis-cajon-c .fis-pan')];
  const yo = document.getElementById('fuente-' + doc);
  const solo = paneles.every(p => (p === yo) === !p.classList.contains('plegado'));
  paneles.forEach(p => {
    p.style.flex = '';                       // se olvida lo que se arrastró
    p.classList.toggle('plegado', !solo && p !== yo);
  });
}

/* Los tres paneles se reparten el alto del cajón y se ven a la vez: de
   eso va el cotejo. Para darle más sitio a uno sin perder los otros de
   vista, se arrastra la línea que los separa. */
function fisSeparar(ev, i){
  ev.preventDefault();
  const paneles = [...document.querySelectorAll('.fis-cajon-c .fis-pan')];
  const a = paneles[i], b = paneles[i + 1];
  if(!a || !b) return;
  const y0 = ev.touches ? ev.touches[0].clientY : ev.clientY;
  /* Se fija el alto actual de los TRES en el flex antes de tocar nada:
     si no, el que no se arrastra conserva su `flex:1` y, al lado de unos
     grow de varios cientos, se queda sin sitio. */
  paneles.forEach(p => { p.style.flex = p.offsetHeight + ' 0 0px'; });
  const ha = a.offsetHeight, hb = b.offsetHeight;
  const suma = ha + hb;

  /* Si hubo movimiento, al soltar hay que comerse el «click» que el
     navegador manda a lo que quede bajo el cursor: suele ser la
     cabecera del panel de abajo, y repartir el alto acababa
     plegándolo. */
  let movido = false;
  const mover = e => {
    movido = true;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    /* 60 px es poco más que la cabecera: ningún panel se queda sin nada. */
    const nueva = Math.min(Math.max(ha + (y - y0), 60), suma - 60);
    a.style.flex = nueva + ' 0 0px';
    b.style.flex = (suma - nueva) + ' 0 0px';
  };
  const soltar = () => {
    document.removeEventListener('mousemove', mover);
    document.removeEventListener('mouseup', soltar);
    document.removeEventListener('touchmove', mover);
    document.removeEventListener('touchend', soltar);
    document.body.classList.remove('tirando');
    if(movido) document.addEventListener('click', e => {
      e.stopPropagation(); e.preventDefault();
    }, {capture: true, once: true});
  };
  document.body.classList.add('tirando');
  document.addEventListener('mousemove', mover);
  document.addEventListener('mouseup', soltar);
  document.addEventListener('touchmove', mover, {passive: false});
  document.addEventListener('touchend', soltar);
}

/* — El cajón: PMF, PMA y NTS apilados, para cotejar los tres a la vez — */
function fisCajonFuente(){
  if(!FIS_FUENTE) return '';
  const a = fisIdx().porAmb[FIS_FUENTE.amb];
  if(!a) return '';
  const m = a.m;
  const p = PME_D.pmf.find(x => x.cod === m.pmf);

  return `<div class="fis-cajon">
    <div class="fis-tirador" onmousedown="fisTirar(event)" ontouchstart="fisTirar(event)"
      title="Arrastra para darle más o menos sitio"></div>
    <div class="fis-cajon-h">
      <div>
        <b>Cotejo del ambiente</b>
        <span>${esc(m.amb)} · ${esc(m.upss)}</span>
      </div>
      <button type="button" class="ex-btn ver" onclick="fisCerrarFuente()">Cerrar ✕</button>
    </div>
    <div class="fis-cajon-c">
      ${fisPanelPdf('pmf', p ? p.pag : null, a,
        p ? `${esc(p.cod)} · ${esc(p.amb)}` : 'Este ambiente no está en el PMF')}
      <div class="fis-sep" onmousedown="fisSeparar(event,0)" ontouchstart="fisSeparar(event,0)"
        title="Arrastra para repartir el alto"></div>
      ${fisPanelPdf('pma', m.pag, a, esc(m.amb))}
      <div class="fis-sep" onmousedown="fisSeparar(event,1)" ontouchstart="fisSeparar(event,1)"
        title="Arrastra para repartir el alto"></div>
      ${fisPanelNts(a)}
    </div>
  </div>`;
}

function fisPanelPdf(doc, pag, a, sub){
  const t = FIS_DOCS[doc];
  if(!pag){
    return `<section class="fis-pan plegado" id="fuente-${doc}">
      <header><button type="button" class="fis-pan-t" onclick="fisPlegarPanel('${doc}')">
        <i>+</i><b>${esc(t.nom)}</b><span>${sub}</span></button></header>
    </section>`;
  }
  return `<section class="fis-pan" id="fuente-${doc}" data-pag="${pag}">
    <header>
      <button type="button" class="fis-pan-t" onclick="fisPlegarPanel('${doc}')">
        <i>−</i><b>${esc(t.nom)}</b><span>${sub}</span></button>
      <div class="ex-btns fis-pan-nav">
        <button type="button" class="ex-btn" title="Dejar sólo éste grande"
          onclick="fisSoloEste('${doc}')">⤢</button>
        <button type="button" class="ex-btn" title="Volver a cargar la página (si el visor se queda en blanco)"
          onclick="fisRecargar('${doc}')">↻</button>
        <button type="button" class="ex-btn" ${pag <= 1 ? 'disabled' : ''} onclick="fisFuentePag('${doc}', -1)">‹</button>
        <span class="fis-pan-p">pág. <b>${pag}</b> de ${t.pags}</span>
        <button type="button" class="ex-btn" ${pag >= t.pags ? 'disabled' : ''} onclick="fisFuentePag('${doc}', 1)">›</button>
        <a class="ex-btn fis-pan-abrir" href="${t.abrir(pag)}" target="_blank" rel="noopener">Aparte</a>
      </div>
    </header>
    <div class="fis-pan-v"><iframe src="${t.pag(pag) + FIS_VISOR}"
      title="${esc(t.nom)} — página ${pag}"></iframe></div>
  </section>`;
}

/* ─────────────── LA HOJA DEL EXCEL, TAL CUAL ───────────────
   Para fiscalizar no basta con la lista ya digerida: hay que poder ver
   la hoja de normas como está, con sus columnas, sus filas y su orden.
   Se lee el .xlsx de verdad con SheetJS y se pinta la ventana de filas
   del ambiente, con el número de fila y la letra de columna de Excel.
   No es una foto de Excel —el navegador no sabe abrir Excel—, pero es
   el contenido del archivo, leído del archivo.                      */

let FIS_LIBRO = null;        // el .xlsx ya leído, para no releerlo
/* La hoja del Excel es la vista por defecto: para fiscalizar se quiere
   el documento como está, no mi resumen. El botón lleva a la lista. */
let FIS_EXCEL_ABIERTO = {};
/* Qué mitad del ambiente unido se está mirando en la hoja del Excel. */
let FIS_PARTE = {};
function fisParte(ia, ip){ FIS_PARTE[ia] = ip; fisPintarHoja(ia); fisBotonesParte(ia); }
function fisBotonesParte(ia){
  const c = document.getElementById('partes-' + ia);
  if(!c) return;
  /* Sólo los botones de parte, no los de al lado: marcar «ver» en el de
     ver la hoja o en el de agrandar los apagaría sin motivo. */
  [].forEach.call(c.querySelectorAll('button.ex-parte'), (b, k) => {
    b.classList.toggle('ver', k === (FIS_PARTE[ia] || 0));
  });
}
function fisEnExcel(ia){ return FIS_EXCEL_ABIERTO[ia] !== false; }

function fisVerExcel(ia){
  FIS_EXCEL_ABIERTO[ia] = !fisEnExcel(ia);
  /* El cajón sólo se vuelve a armar cuando cambia el ambiente —si no,
     cada filtro recargaría los PDF—. Aquí hay que forzarlo, que es lo
     único que cambia. Los PDF se recargan, pero es un clic a propósito. */
  FIS_CAJON_PUESTO = null;
  pintarPme();
  if(fisEnExcel(ia)) fisCargarLibro(ia);
}

/* El libro llega de tres sitios, en este orden: ya leído, el archivo que
   está al lado de la herramienta, o el que elija Luis a mano —que es lo
   que toca en la versión de un solo archivo, donde el Excel no va
   dentro porque pesa 1,4 MB—. */
function fisCargarLibro(ia){
  const caja = document.getElementById('excel-' + ia);
  if(!caja) return;
  if(FIS_LIBRO){ fisPintarHoja(ia); return; }

  caja.innerHTML = '<p class="fis-no">Leyendo el Excel de normas…</p>';
  pmeSheetJs().then(XLSX => {
    return fetch(FIS_DOCS.xls.src).then(r => {
      if(!r.ok) throw new Error('no está el archivo');
      return r.arrayBuffer();
    }).then(buf => {
      FIS_LIBRO = XLSX.read(buf, {type: 'array'});
      fisPintarHoja(ia);
    });
  }).catch(() => {
    caja.innerHTML = `<p class="fis-no">No se pudo abrir
      <b>${esc(FIS_DOCS.xls.src)}</b> desde aquí. Elige el Excel de normas y se lee de tu equipo:</p>
      <p><input type="file" accept=".xlsx" onchange="fisLibroDeArchivo(this, ${ia})"></p>`;
  });
}

function fisLibroDeArchivo(input, ia){
  const f = input.files && input.files[0];
  if(!f) return;
  const caja = document.getElementById('excel-' + ia);
  caja.innerHTML = '<p class="fis-no">Leyendo el Excel…</p>';
  const fr = new FileReader();
  fr.onload = () => {
    pmeSheetJs().then(XLSX => {
      FIS_LIBRO = XLSX.read(new Uint8Array(fr.result), {type: 'array'});
      fisPintarHoja(ia);
    }).catch(() => { caja.innerHTML = '<p class="fis-no">No se pudo leer ese archivo.</p>'; });
  };
  fr.readAsArrayBuffer(f);
}

/* Pinta la ventana de filas del ambiente más tres de margen arriba y
   abajo, para ver dónde empieza y dónde acaba dentro de la hoja. */
function fisPintarHoja(ia, mantener){
  const caja = document.getElementById('excel-' + ia);
  const a = fisIdx().porAmb[ia];
  if(!caja || !a || !a.nts) return;
  /* Con dos ambientes de la norma detrás, los dos van en la MISMA vista
     y se llega a ellos bajando, que es como se lee una hoja de cálculo.
     Sólo si cayeran en hojas distintas del libro hay que elegir. */
  const ps = (a.nts.partes || []).length > 1 ? a.nts.partes : [a.nts];
  const hojas = [...new Set(ps.map(p => p.hoja).filter(Boolean))];
  const hojaVer = hojas.length > 1
    ? (ps[Math.min(FIS_PARTE[ia] || 0, ps.length - 1)].hoja) : hojas[0];
  const mias = ps.filter(p => p.hoja === hojaVer && p.f0);

  if(!mias.length && a.extra){
    caja.innerHTML = `<p class="fis-no">Este ambiente sale de los <b>planos</b>, no del Excel de normas:
      la lista de equipos es la del ambiente de la NTS que elegiste, y esa sí se puede mirar ahí
      buscándola por su nombre. La lista de arriba es la que entró al PME.</p>`;
    return;
  }
  if(!mias.length){
    caja.innerHTML = `<p class="fis-no">De este ambiente no se puede señalar la fila del Excel:
      la norma repite su nombre y no hay manera de saber cuál de las copias es, así que no se cita
      ninguna. La lista de arriba sí es la suya.</p>`;
    return;
  }
  const hoja = FIS_LIBRO.Sheets[hojaVer];
  if(!hoja){
    caja.innerHTML = `<p class="fis-no">El libro no tiene la hoja <b>${esc(hojaVer)}</b>.</p>`;
    return;
  }
  const XLSX = window.XLSX;
  const rango = XLSX.utils.decode_range(hoja['!ref']);
  const margen = PME_D.margen || 25;

  /* Una ventana de filas por ambiente, con su margen; las que se tocan
     se funden en una sola para no repetir filas ni cortar por medio. */
  const vents = mias.map(p => ({d: Math.max(rango.s.r + 1, p.f0 - margen),
                                h: Math.min(rango.e.r + 1, p.f1 + margen)}))
                    .sort((x, y) => x.d - y.d);
  let juntas = [];
  vents.forEach(v => {
    const u = juntas[juntas.length - 1];
    if(u && v.d <= u.h + 1) u.h = Math.max(u.h, v.h);
    else juntas.push({d: v.d, h: v.h});
  });

  /* Si ya se amplió —a mano o bajando hasta el borde—, manda eso: una
     sola ventana continua desde donde se haya llegado. */
  const guardada = FIS_XL_VENT[ia];
  if(guardada && guardada.hoja === hojaVer && guardada.fijada){
    juntas = [{d: Math.max(rango.s.r + 1, guardada.d),
               h: Math.min(rango.e.r + 1, guardada.h)}];
  }
  FIS_XL_VENT[ia] = {
    hoja: hojaVer,
    d: juntas[0].d,
    h: juntas[juntas.length - 1].h,
    fijada: !!(guardada && guardada.hoja === hojaVer && guardada.fijada),
    tope: rango.e.r + 1,
  };

  /* Color de fondo y negrita salen del propio Excel: los trae el dato
     porque SheetJS no lee estilos. Los anchos, igual. */
  const est = (PME_D.xlst && PME_D.xlst[hojaVer]) || {};
  const anchos = (PME_D.xlw && PME_D.xlw[hojaVer]) || {};
  /* Las columnas del bloque de datos, las mismas que se ven al abrir la
     hoja en Excel. A su izquierda están el anexo, el número de norma y
     las casillas de categoría, que ahí van ocultas. */
  const bloque = (PME_D.xlbloque && PME_D.xlbloque[hojaVer]) || [rango.s.c, rango.e.c];
  /* A la izquierda del bloque hay columnas que en el archivo van
     ocultas —el anexo, el número de norma, las casillas de categoría—.
     No se enseñan de entrada porque estorban, pero a veces hay que
     mirarlas, así que se pueden desplegar. */
  const todas = !!FIS_XL_TODO[ia];
  const c0 = todas ? rango.s.c : bloque[0];
  const c1 = todas ? rango.e.c : Math.min(bloque[1], rango.e.c);
  const ocultas = (bloque[0] - rango.s.c) + Math.max(0, rango.e.c - bloque[1]);
  const cols = [];
  for(let c = c0; c <= c1; c++) cols.push(c);

  const mia = f => mias.some(p => f >= p.f0 && f <= p.f1);
  const pintaFila = (f, clase) => `<tr class="${clase}" data-f="${f}"><th class="xl-f">${f}</th>` +
    cols.map(c => {
      const celda = hoja[XLSX.utils.encode_cell({r: f - 1, c: c})];
      const v = celda ? (celda.w !== undefined ? celda.w : celda.v) : '';
      const e = (est[f] || {})[c + 1];
      const estilo = e ? ((e[0] ? 'background:#' + e[0] + ';' : '') + (e[1] ? 'font-weight:700;' : '')) : '';
      return `<td${estilo ? ` style="${estilo}"` : ''}>${esc(v === undefined || v === null ? '' : v)}</td>`;
    }).join('') + '</tr>';

  let filas = juntas[0].d > 1 ? pintaFila(1, 'titulo') : '';
  juntas.forEach((v, k) => {
    if(k){
      filas += `<tr class="xl-salto"><td colspan="${cols.length + 1}">
        ⋮ filas ${juntas[k - 1].h + 1} a ${v.d - 1} de la hoja, que no son de este ambiente</td></tr>`;
    }
    for(let f = v.d; f <= v.h; f++){
      filas += pintaFila(f, mia(f) ? 'mia' : (f === 1 ? 'titulo' : 'fuera'));
    }
  });

  /* Los anchos del Excel, pero en porcentaje: así la hoja entra entera
     en el cajón y sólo hay que subir y bajar. Sin esto hacían falta las
     dos barras y leer costaba el doble. */
  const anchoDe = c => (anchos[XLSX.utils.encode_col(c)] || 10);
  const suma = cols.reduce((s, c) => s + anchoDe(c), 0);
  /* Siete píxeles por carácter es la equivalencia de siempre del ancho
     de Excel. Si todo eso cabe, se reparte en porcentaje y no hay barra
     de abajo; si no cabe —que es lo que pasa al desplegar las columnas
     ocultas—, se respeta el ancho en píxeles y vuelve la barra: antes
     que apretar veinticinco columnas hasta dejarlas en una letra por
     línea, es mejor desplazarse. */
  const disponible = Math.max(320, (caja.clientWidth || 700) - 46 - 2);
  const cabe = suma * 7 <= disponible;
  const anchoCol = c => cabe
    ? `calc((100% - 46px) * ${(anchoDe(c) / suma).toFixed(4)})`
    : Math.max(54, Math.round(anchoDe(c) * 7)) + 'px';

  const v = FIS_XL_VENT[ia];
  /* Todo el mando del visor en UNA línea: cuanto ocupa la cabecera es
     hoja que no se ve, y la hoja es a lo que se viene. Lo que antes
     eran cuatro párrafos —navegar, columnas, de dónde sale, ir a cada
     mitad— va aquí seguido y con lo imprescindible. */
  const donde = mias.map(p => mias.length > 1
    ? `<button type="button" class="xl-ir" onclick="fisIrFila(${fisId(ia)}, ${p.f0})"
        title="${esc(p.amb)}">${esc(String.fromCharCode(65 + ps.indexOf(p)))} · ${esc(p.f0)}–${esc(p.f1)}</button>`
    : '').join('');

  caja.innerHTML = `<p class="xl-ires">
      <button type="button" class="xl-ir" ${v.d <= 1 ? 'disabled' : ''}
        onclick="fisXlMas(${fisId(ia)}, 'arriba')" title="Cargar 200 filas más por arriba">▲ 200</button>
      <button type="button" class="xl-ir" ${v.h >= v.tope ? 'disabled' : ''}
        onclick="fisXlMas(${fisId(ia)}, 'abajo')" title="Cargar 200 filas más por abajo">▼ 200</button>
      <button type="button" class="xl-ir" ${v.d <= 1 && v.h >= v.tope ? 'disabled' : ''}
        onclick="fisXlMas(${fisId(ia)}, 'todo')">Toda la hoja</button>
      ${ocultas ? `<button type="button" class="xl-ir" onclick="fisXlTodo(${fisId(ia)})">${todas
        ? 'Menos columnas' : '+' + ocultas + ' columnas'}</button>` : ''}
      ${donde}
      <span><b>${esc(hojaVer)}</b> · viendo ${pmeNum(v.d)}–${pmeNum(Math.min(v.h, v.tope))}
        de ${pmeNum(v.tope)} · el ambiente, en las ${esc(mias[0].f0)}–${esc(mias[mias.length - 1].f1)},
        va resaltado</span></p>
    <div class="xl-wrap${cabe ? '' : ' ancho'}" id="xlw-${ia}"><table class="xl-hoja${cabe ? '' : ' ancho'}">
      <colgroup><col style="width:46px">${cols.map(c =>
        `<col style="width:${anchoCol(c)}">`).join('')}</colgroup>
      <thead><tr><th class="xl-f"></th>${cols.map(c =>
        `<th>${XLSX.utils.encode_col(c)}</th>`).join('')}</tr></thead>
      <tbody>${filas}</tbody>
    </table></div>`;

  /* Con 25 filas de contexto por delante, hay que llevar la vista hasta
     el ambiente o se abre en medio de la nada. Al ampliar no: ahí se
     deja donde estaba, que para eso se amplió. */
  const caja2 = document.getElementById('xlw-' + ia);
  if(!caja2) return;
  const primera = caja2.querySelector('tr.mia');
  if(primera && !mantener) caja2.scrollTop = Math.max(0, primera.offsetTop - 60);
  else if(mantener && FIS_XL_SCROLL[ia] !== undefined) caja2.scrollTop = FIS_XL_SCROLL[ia];

  /* Llegar al borde del desplazamiento carga el trozo siguiente, como
     en cualquier lista larga: se coteja bajando, no pulsando. */
  caja2.onscroll = () => {
    FIS_XL_SCROLL[ia] = caja2.scrollTop;
    if(FIS_XL_CARGANDO[ia]) return;
    const v2 = FIS_XL_VENT[ia];
    if(caja2.scrollTop < 40 && v2.d > 1){
      FIS_XL_CARGANDO[ia] = true;
      const alto = caja2.scrollHeight;
      fisXlMas(ia, 'arriba');
      const c3 = document.getElementById('xlw-' + ia);
      /* Al meter filas por arriba, lo que se estaba mirando se va hacia
         abajo: se corrige el desplazamiento con lo que creció. */
      if(c3) c3.scrollTop = c3.scrollHeight - alto + caja2.scrollTop;
      FIS_XL_CARGANDO[ia] = false;
    }else if(caja2.scrollTop + caja2.clientHeight > caja2.scrollHeight - 40 && v2.h < v2.tope){
      FIS_XL_CARGANDO[ia] = true;
      fisXlMas(ia, 'abajo');
      FIS_XL_CARGANDO[ia] = false;
    }
  };
}

/* Dónde estaba la vista y si ya se está ampliando, para no hacerlo dos
   veces con el mismo empujón de la rueda. */
let FIS_XL_SCROLL = {};
let FIS_XL_CARGANDO = {};

/* Enseñar u ocultar las columnas que en el archivo van escondidas. */
let FIS_XL_TODO = {};
function fisXlTodo(ia){ FIS_XL_TODO[ia] = !FIS_XL_TODO[ia]; fisPintarHoja(ia); }

/* ── Hasta dónde se está enseñando la hoja ──
   Se abre por el ambiente, con sus filas de contexto, porque es lo que
   se va a mirar el 95 % de las veces. Pero cotejar es también mirar lo
   que hay antes y después —si el ambiente de al lado se llevó un
   equipo, si la norma repite el bloque más abajo—, así que la ventana
   crece: al llegar al borde del desplazamiento se cargan 200 filas más
   por ese lado, y con un botón se carga la hoja entera.

   Se amplía en trozos en vez de pintar las 2 500 filas de salida
   porque cada fila son veintitantas celdas y el navegador tarda; así
   abre al instante y crece sólo si hace falta. */
let FIS_XL_VENT = {};

function fisVent(ia, d, h){
  if(!FIS_XL_VENT[ia]) FIS_XL_VENT[ia] = {};
  FIS_XL_VENT[ia].d = d;
  FIS_XL_VENT[ia].h = h;
}

function fisXlMas(ia, lado){
  const v = FIS_XL_VENT[ia];
  if(!v) return;
  const paso = lado === 'todo' ? 100000 : 200;
  if(lado === 'arriba' || lado === 'todo') v.d = Math.max(1, v.d - paso);
  if(lado === 'abajo' || lado === 'todo') v.h = v.h + paso;
  v.fijada = true;
  fisPintarHoja(ia, true);
}

/* Bajar la vista hasta una fila concreta de la hoja. */
function fisIrFila(ia, f){
  const caja = document.getElementById('xlw-' + ia);
  const fila = caja && caja.querySelector('tr[data-f="' + f + '"]');
  if(caja && fila) caja.scrollTo({top: Math.max(0, fila.offsetTop - 60), behavior: 'smooth'});
}

/* El tercer panel no es un PDF: es la NTS con las filas del Excel, con
   su número de fila, para poder abrir el Excel y comprobarlas una a una.
   Pasar el Excel entero a PDF daría cientos de páginas sin índice; esto
   es la misma fuente y se puede señalar con el dedo. */
function fisPanelNts(a){
  const n = a.nts;
  if(!n){
    return `<section class="fis-pan plegado" id="fuente-nts">
      <header><button type="button" class="fis-pan-t" onclick="fisPlegarPanel('nts')">
        <i>+</i><b>Norma técnica de salud</b><span>sin ambiente equivalente en la NTS</span></button></header>
    </section>`;
  }
  const fil = n.fil || [];
  return `<section class="fis-pan fis-pan-nts" id="fuente-nts">
    <header>
      <button type="button" class="fis-pan-t" onclick="fisPlegarPanel('nts')">
        <i>−</i><b>NTS ${esc(n.n)} · ${esc(n.amb)}</b>${
          (n.partes || []).length > 1 ? ` <em class="fis-mas-amb">${n.partes.length} ambientes unidos</em>` : ''}
        <span>${n.hoja ? 'hoja ' + esc(n.hoja) + ' · filas ' + esc(n.f0) + ' a ' + esc(n.f1) : esc(n.id)}</span></button>
      <div class="ex-btns" id="partes-${a.i}">
        ${((n.partes || []).length > 1 &&
           new Set(n.partes.map(p => p.hoja)).size > 1) ? n.partes.map((p, k) =>
          `<button type="button" class="ex-btn ex-parte ${k === (FIS_PARTE[a.i] || 0) ? 'ver' : ''}"
            onclick="fisParte(${fisId(a.i)}, ${k})" title="${esc(p.id + ' · ' + p.amb)}"
            >${esc(String.fromCharCode(65 + k))} · ${esc(p.amb.slice(0, 22))}</button>`).join('') : ''}
        <button type="button" class="ex-btn ${fisEnExcel(a.i) ? 'ver' : ''}"
          onclick="fisVerExcel(${fisId(a.i)})" title="Alternar entre la hoja del Excel y la lista resumida">
          ${fisEnExcel(a.i) ? 'Ver la lista' : 'Ver la hoja del Excel'}</button>
        <button type="button" class="ex-btn" title="Dejar sólo éste grande"
          onclick="fisSoloEste('nts')">⤢</button>
        <a class="ex-btn" href="${FIS_DOCS.xls.src}" download="${esc(FIS_DOCS.xls.arch)}">Descargar</a>
      </div>
    </header>
    <div class="fis-pan-c">
      ${fisEnExcel(a.i) ? `<div class="xl-caja" id="excel-${a.i}"></div>` : `
      <table class="pme-tabla fis-nts-t">
        <thead><tr>
          <th class="n">Fila</th><th>Código</th><th>Descripción</th>
          <th class="n">Cant.</th><th>Tipo</th><th>EQ/OC</th>
        </tr></thead>
        <tbody>${n.eq.map((par, j) => {
          const c = PME_D.cat[par[0]] || ['', '', ''];
          return `<tr class="${c[2] === 'OC' ? 'oc' : ''}">
            <td class="n">${fil[j] || ''}</td>
            <td class="pme-cod">${esc(par[0])}</td>
            <td class="pme-desc">${esc(c[0])}</td>
            <td class="n">${pmeNum(par[1])}</td>
            <td>${esc(c[1])}</td>
            <td>${esc(c[2])}</td>
          </tr>`;
        }).join('')}</tbody>
      </table>`}
    </div>
  </section>`;
}

/* Los botones que lo abren, dentro del detalle del ambiente. */
function fisBotonesFuente(a){
  const m = a.m;
  const p = PME_D.pmf.find(x => x.cod === m.pmf);
  const n = a.nts;
  const puesto = FIS_FUENTE && FIS_FUENTE.amb === a.i;
  return `<div class="fis-fuentes">
    <button type="button" class="ex-btn ${puesto ? 'ver' : ''}" onclick="${puesto ? 'fisCerrarFuente()' : 'fisVer(' + fisId(a.i) + ')'}">
      ${puesto ? 'Cerrar el cotejo ✕' : 'Cotejar con los documentos'}</button>
    <span class="fis-cita">${p ? 'PMF pág. ' + esc(p.pag) : 'no está en el PMF'} ·
      PMA pág. ${esc(m.pag)}${n && n.hoja ? ' · NTS ' + esc(n.n) + ' hoja ' + esc(n.hoja) +
        ' filas ' + esc(n.f0) + '–' + esc(n.f1) : (n ? ' · NTS ' + esc(n.n) : '')}</span>
  </div>`;
}

/* Subir y bajar la cantidad desde la propia lista de la norma. Es la
   corrección más frecuente al fiscalizar —«aquí van dos, no una»— y
   obligaba a irse a la pestaña PME a buscar la línea. El lápiz de al
   lado sigue siendo para otra cosa: comentar, no corregir. */
function fisSumar(n, d){
  const r = PME_D.pme.find(x => x.n === n);
  if(!r) return;
  pmeSetQ(n, Math.max(0, pmeQ(r) + d));
}

/* ─────────────── OBSERVAR: dónde se apunta un reparo ───────────────
   Fiscalizar no es sólo mirar: hay que poder decir «esto está mal» en
   el sitio exacto donde se ve, y que eso salga en el Excel. Hay dos
   niveles, porque los reparos son de dos clases:

     · sobre el AMBIENTE  — «este ambiente no corresponde», «falta un
       equipo», «el área no cuadra con el plano»;
     · sobre un RENGLÓN de la norma — «esta cantidad está mal», «este
       equipo no va aquí».

   Cada uno lleva texto y una marca de «está mal», que no es lo mismo
   que una anotación al margen. Se guardan con el resto de la revisión:
   en este navegador, en el respaldo .json y en una hoja del Excel.   */

/* La llave de una observación es el CÓDIGO del ambiente —CES-001— y, si
   es sobre un renglón, el código del equipo y el número de renglón de la
   norma. Nada de índices: así lo que escribes sigue en su sitio cuando
   se vuelve a generar la base. */
function fisClaveAmb(ia){
  const m = PME_D.match[ia] || (fisIdx().porAmb[ia] || {}).m;
  return m ? m.cods : String(ia);
}
function fisClaveRen(ia, j){
  const a = fisIdx().porAmb[ia];
  const r = a && a.ren.find(x => String(x.j) === String(j));
  return fisClaveAmb(ia) + '|' + (r ? r.c : '') + '|' + j;
}

function fisObs(ia, j){
  const m = (j === undefined || j === null) ? PME_U.obs : PME_U.obsr;
  const k = (j === undefined || j === null) ? fisClaveAmb(ia) : fisClaveRen(ia, j);
  return m[k] || {t: '', mal: false};
}

function fisPonerObs(ia, j, campo, valor){
  const suelta = (j === undefined || j === null || j === '');
  const m = suelta ? (PME_U.obs = PME_U.obs || {}) : (PME_U.obsr = PME_U.obsr || {});
  const k = suelta ? fisClaveAmb(ia) : fisClaveRen(ia, j);
  const o = m[k] || {t: '', mal: false};
  o[campo] = valor;
  if(!(o.t || '').trim() && !o.mal) delete m[k]; else m[k] = o;
  pmeGuardarLS();
  /* El índice lleva los avisos de cada ambiente, y «Con observación
     tuya» es uno: si no se tira, el cuadro de arriba se queda en cero. */
  fisOlvidar();
}

/* Escribir no repinta —se perdería el cursor—; sólo se refresca la
   marca de la fila y el contador de la pestaña al soltar el campo. */
function fisObsTexto(ia, j, el){
  fisPonerObs(ia, j, 't', el.value);
  const caja = el.closest('.fis-obs');
  if(caja) caja.classList.toggle('puesta', !!el.value.trim() || fisObs(ia, j).mal);
}
function fisObsMal(ia, j, el){
  fisPonerObs(ia, j, 'mal', el.checked);
  pintarPme();
}
/* El lápiz de cada renglón abre y cierra su cajita. */
function fisAbrirObsRen(ia, j){
  const fila = document.getElementById('obsr-' + ia + '-' + j);
  if(!fila) return;
  fila.classList.toggle('abierta');
  const ta = fila.querySelector('textarea');
  if(fila.classList.contains('abierta') && ta) ta.focus();
}

function fisCajaObs(ia, j, titulo){
  const o = fisObs(ia, j);
  const puesta = (o.t || '').trim() || o.mal;
  const jj = (j === undefined || j === null) ? "''" : j;
  return `<div class="fis-obs ${puesta ? 'puesta' : ''} ${o.mal ? 'mal' : ''}">
    <label class="fis-obs-mal"><input type="checkbox" ${o.mal ? 'checked' : ''}
      onchange="fisObsMal(${fisId(ia)}, ${jj}, this)"> Está mal</label>
    <label class="fis-obs-t">${esc(titulo)}
      <textarea rows="2" placeholder="Qué observas y por qué. Sale en la hoja «Observaciones» del Excel."
        oninput="fisObsTexto(${fisId(ia)}, ${jj}, this)"
        onchange="pintarPme()">${esc(o.t || '')}</textarea></label>
  </div>`;
}

/* — Por qué este ambiente está como está, con la frase del PMA — */
function fisPorque(a){
  const m = a.m;
  const por = FIS_PORQUE[m.estado];
  if(!por) return '';
  const cero = m.estado !== 'Unificado';
  return `<p class="fis-porque ${cero ? 'cero' : ''}">
    <b>${esc(m.estado)}</b> — ${esc(por)}.
    ${m.obs ? `El PMA lo dice así: <b>«${esc(m.obs)}»</b> (pág. ${esc(m.pag)}).`
            : `El PMA no deja observación en esta fila (pág. ${esc(m.pag)}).`}
    ${cero ? ' Sus equipos quedan en <b>cantidad 0</b>: la línea no se borra, para que el supervisor vea que el ambiente se miró y se descartó, y por qué.' : ''}
  </p>`;
}

/* — El grupo de unificación entero, visto desde cualquiera de sus
     ambientes: qué pedía cada uno y qué quedó — */
function fisBloqueGrupo(a){
  const g = fisGrupo(a.m.grupo);
  const ms = g.miembros;
  if(ms.length < 2) return '';
  const total = g.cods.reduce((s, c) => s + c.fin, 0);
  const suma = g.cods.reduce((s, c) => s + Object.values(c.por).reduce((t, p) => t + p.pedia, 0), 0);

  return `<div class="fis-grupo-caja">
    <h5>Tabla 1 de 2 · Cómo se repartió el grupo ${esc(a.m.grupo)}, entre sus ${ms.length} ambientes</h5>
    <p class="fis-no">Estos ambientes comparten uno solo, así que comparten la lista de equipos: los códigos
      exclusivos de cada uno se conservan y los que piden varios <b>no se suman</b> — se toma la
      <b>mayor cantidad</b>. Sumando lo que pide cada ambiente por separado saldrían
      <b>${pmeNum(suma)}</b> unidades; aplicando la regla quedan <b>${pmeNum(total)}</b>.</p>
    <table class="pme-tabla fis-mi">
      <colgroup><col style="width:9%"><col><col style="width:5%"><col style="width:5%">
        <col style="width:6%"><col style="width:20%"><col style="width:7%"><col style="width:7%"></colgroup>
      <thead><tr><th>Cód. amb.</th><th>Ambiente (PMA)</th><th class="n">Pág.</th><th class="n">N.º</th>
        <th class="n">Área</th><th>Estado en el PMA</th><th class="n">Equipos</th><th></th></tr></thead>
      <tbody>${ms.map(x => `<tr class="${x.i === a.i ? 'yo' : ''}">
        <td class="pme-cod">${esc(x.m.cods || '')}</td>
        <td class="pme-amb"><b>${esc(x.m.amb)}</b></td>
        <td class="n">${esc(x.m.pag)}</td>
        <td class="n">${x.m.n === '' || x.m.n == null ? '—' : esc(x.m.n)}</td>
        <td class="n">${x.m.area === '' || x.m.area == null ? '—' : esc(x.m.area)}</td>
        <td>${esc(x.m.estado)}${x.m.obs ? `<small>«${esc(x.m.obs)}»</small>` : ''}</td>
        <td class="n">${x.ls.length ? pmeNum(x.ls.length) : '—'}</td>
        <td>${x.i === a.i ? '<em class="fis-aqui">estás aquí</em>'
             : `<button type="button" class="fis-irbtn" onclick="fisIr(${x.i})">ver</button>`}</td>
      </tr>`).join('')}</tbody>
    </table>
    <div class="pme-wrap" style="max-height:46vh">
      <table class="pme-tabla fis-eq">
        <thead><tr>
          <th>Código</th><th>Descripción</th>
          ${ms.map(x => `<th class="n">${esc(x.m.cods || '')}<small>${esc(x.m.amb)}</small></th>`).join('')}
          <th class="n">Queda</th><th>Qué se hizo</th>
        </tr></thead>
        <tbody>${g.cods.map(c => {
          const piden = Object.keys(c.por).length;
          const dup = piden > 1;
          return `<tr class="${dup ? 'anul' : ''}">
            <td><button type="button" class="pme-cod fis-codbtn" onclick="fisCod('${esc(c.c)}')">${esc(c.c)}</button></td>
            <td class="pme-desc">${esc(c.d)}</td>
            ${ms.map(x => {
              const p = c.por[x.i];
              if(!p) return '<td class="n fis-nd">—</td>';
              return `<td class="n ${p.queda ? 'fis-manda' : 'fis-desc'}">${pmeNum(p.pedia)}</td>`;
            }).join('')}
            <td class="n"><b>${pmeNum(c.fin)}</b></td>
            <td>${dup
              ? `<span class="fis-rep unif">lo piden ${piden}: se toma la mayor, no se suma</span>`
              : '<span class="fis-rep ok">lo pide uno solo: se conserva</span>'}</td>
          </tr>`;
        }).join('')}</tbody>
        <tfoot><tr>
          <td colspan="${2 + ms.length}">${pmeNum(g.cods.length)} códigos en el grupo ·
            ${pmeNum(g.cods.filter(c => Object.keys(c.por).length > 1).length)} los piden varios</td>
          <td class="n">${pmeNum(total)}</td><td></td>
        </tr></tfoot>
      </table>
    </div>
    <p class="fis-no fis-leyenda"><i class="fis-manda">en negro</i> la cantidad que manda ·
      <i class="fis-desc">tachada</i> la que se descarta por ser menor o igual</p>
  </div>`;
}

/* — Ficha de un código: en qué ambientes está y con cuánto — */
function fisFichaCod(c){
  const ix = fisIdx();
  const f = ix.porCod[c];
  const cat = PME_D.cat[c];
  if(!f && !cat) return '';

  const porAmb = {};
  (f ? f.amb : []).forEach(r => {
    const o = porAmb[r.ia] || (porAmb[r.ia] = {ia: r.ia, q: 0, veces: 0});
    o.q += pmeQ(r);
    o.veces++;
  });
  const filas = Object.values(porAmb).sort((a, b) => b.q - a.q || a.ia - b.ia);
  const total = filas.reduce((s, x) => s + x.q, 0);
  const conQ = filas.filter(x => x.q > 0).length;
  const d = f ? f.d : cat[0], t = f ? f.t : cat[1];

  /* Si es OC no está en ningún ambiente del PME, y hay que decirlo en
     lugar de enseñar una tabla vacía sin explicación. */
  if(cat && cat[2] === 'OC' && !filas.length){
    return `<div class="fis-ficha">
      <div class="fis-ficha-h"><span class="pme-cod">${esc(c)}</span><b>${esc(d)}</b>
        <span class="th-nota">${esc(t)}</span>
        <button type="button" class="ex-btn" onclick="fisCod('${esc(c)}')">Cerrar ✕</button></div>
      <p class="fis-no">La norma lo marca <b>OC</b>: no lo provee el equipamiento, así que no se metra y no está en
        ninguna línea del PME. Aparece en la lista de la norma de los ambientes que lo piden, siempre fuera.</p>
    </div>`;
  }

  return `<div class="fis-ficha">
    <div class="fis-ficha-h">
      <span class="pme-cod">${esc(c)}</span>
      <b>${esc(d)}</b>
      <span class="th-nota">${esc(t)}${cat ? ' · ' + esc(cat[2]) : ''}</span>
      <button type="button" class="ex-btn" onclick="fisCod('${esc(c)}')">Cerrar ✕</button>
    </div>
    <p class="th-nota">Está en ${conQ} ambientes con cantidad, ${pmeNum(total)} unidades en total${
      filas.length - conQ ? ` · y en ${filas.length - conQ} más que quedan en cero` : ''}.</p>
    <div class="pme-wrap" style="max-height:40vh">
      <table class="pme-tabla">
        <thead><tr><th>UPSS / UPS</th><th>Ambiente (PMA)</th><th class="n">Pág.</th>
          <th class="n">N.º amb.</th><th class="n">Cantidad</th><th>Aviso</th></tr></thead>
        <tbody>${filas.map(x => {
          const m = PME_D.match[x.ia] || (fisIdx().porAmb[x.ia] || {}).m || {};
          return `<tr${x.q > 0 ? '' : ' class="cero"'}>
            <td class="pme-upss">${esc(m.upss)}</td>
            <td class="pme-amb"><button type="button" class="fis-irbtn" onclick="fisIr(${fisId(x.ia)})">${esc(m.amb)}</button></td>
            <td class="n">${esc(m.pag)}</td>
            <td class="n">${m.n === '' || m.n == null ? '—' : esc(m.n)}</td>
            <td class="n">${pmeNum(x.q)}</td>
            <td>${x.veces > 1 ? `<span class="fis-rep mal">la norma lo trae ${x.veces} veces</span>`
                 : (x.q > 0 ? '' : '<span class="fis-rep unif">en cero</span>')}</td>
          </tr>`;
        }).join('')}</tbody>
        <tfoot><tr><td colspan="4">${filas.length} ambientes</td>
          <td class="n">${pmeNum(total)}</td><td></td></tr></tfoot>
      </table>
    </div>
  </div>`;
}

/* Saltar desde la ficha de un código al ambiente, abriéndolo. */
function fisIr(ia){
  FIS.abierto = ia;
  const a = fisIdx().porAmb[ia];
  if(a) FIS_PLEGADAS.delete(a.m.upss);        // si no, saltaría a una banda cerrada
  FIS.upss = '';
  FIS.alerta = '';
  FIS.q = '';
  pintarPme();
  setTimeout(() => {
    const e = document.getElementById('fisu-' + ia);
    if(e) e.scrollIntoView({block: 'center', behavior: 'smooth'});
  }, 60);
}

/* — Para la hoja «Fiscalización» del Excel — */
function fisParaExcel(){
  const ix = fisIdx();
  const out = [];
  ix.lista.forEach(a => {
    a.alertas.forEach(x => {
      out.push({
        'Tipo': FIS_ALERTAS[x.t][0],
        'UPSS / UPS': a.m.upss,
        'Ambiente (PMA)': a.m.amb,
        'Pág. PMA': a.m.pag,
        'N° Amb.': a.m.n,
        'Cód. PMF': a.m.pmf,
        'Ambiente NTS': a.m.ambnts,
        'Id NTS': a.nts ? (a.nts.partes && a.nts.partes.length > 1
          ? a.nts.partes.map(p => p.id).join(' + ') : a.nts.id) : '',
        'Norma': a.m.norma,
        'Renglones de la norma': a.ren.filter(y => y.j !== '').length,
        'De ellos OC': a.oc,
        'Líneas en el PME': a.ls.length,
        'Detalle': x.txt
      });
    });
  });
  return out;
}

/* ── La lista de todo lo observado ──
   Las cajas sirven para apuntar, pero para repasar hace falta verlas
   todas juntas: qué pusiste, dónde, y poder ir a ello o quitarlo. Sale
   arriba de la pestaña en cuanto hay una. */
function fisListaObs(){
  const ix = fisIdx();
  const filas = [];
  const porCod = {};
  ix.lista.forEach(a => { porCod[a.m.cods] = a; });
  let huerfanas = 0;
  Object.keys(PME_U.obs || {}).forEach(k => {
    const o = PME_U.obs[k], a = porCod[k];
    if(!(o.t || '').trim() && !o.mal) return;
    if(!a){ huerfanas++; return; }
    filas.push({ia: a.i, j: null, m: a.m, r: null, o: o});
  });
  Object.keys(PME_U.obsr || {}).forEach(k => {
    const o = PME_U.obsr[k];
    if(!(o.t || '').trim() && !o.mal) return;
    const p = k.split('|'), a = porCod[p[0]];
    if(!a){ huerfanas++; return; }
    filas.push({ia: a.i, j: p[2], m: a.m,
                r: a.ren.find(x => String(x.j) === String(p[2])) || null, o: o});
  });
  const tablaCant = fisListaCant();
  filas.sort((x, y) => x.ia - y.ia || (x.j || 0) - (y.j || 0));
  const malos = filas.filter(f => f.o.mal).length;
  const tocadas = pmeCuantasTocadas();

  return `${pmeSeccion(3, 'Lo que has observado y lo que has corregido',
      (filas.length ? filas.length + (filas.length === 1 ? ' apunte' : ' apuntes') : 'sin apuntes escritos') +
      (malos ? ' · ' + malos + ' marcados como error' : '') +
      (tocadas ? ' · ' + tocadas + (tocadas === 1 ? ' cantidad cambiada' : ' cantidades cambiadas') : '') +
      (huerfanas ? ' · ' + huerfanas + ' no encontraron su ambiente' : ''))}
  ${(!filas.length && !tablaCant) ? `<p class="ex-nota"><b>Todavía no has observado ni corregido nada.</b>
    Para observar, abre un ambiente y usa el lápiz ✎ del renglón o la caja del final; para corregir una
    cantidad, los botones <b>−</b> y <b>+</b> de <i>Cant. PME</i>. Lo que pongas aparece aquí y se va en el
    archivo del botón de abajo.</p>` : ''}
  <p class="ex-nota">Aquí está todo junto: lo que escribiste con el lápiz y lo que quitaste o pusiste
    con <b>−</b> y <b>+</b>. <b>Ir</b> te lleva al ambiente, <b>Quitar</b> borra el apunte y
    <b>Deshacer</b> devuelve la cantidad a la de la norma. Lo mismo sale en las hojas
    <b>Observaciones</b> y <b>PME</b> del Excel.</p>
  <div class="ex-btns fis-obs-btns">
    <button type="button" class="ex-btn ver" onclick="fisObsExcel()">Descargar observaciones (.xlsx)</button>
    <button type="button" class="ex-btn" onclick="fisDescargarObs()">… y el .json para corregir en el origen</button>
    <button type="button" class="ex-btn" onclick="pmeExcelLs()">Descargar la hoja del LS</button>
  </div>
  <p class="ex-nota">El <b>.xlsx</b> trae cuatro hojas —lo que escribiste, las cantidades que corregiste,
    las decisiones del PMF y los ambientes añadidos por planos— y es para leerlo tú. El <b>.json</b> es
    el mismo contenido en el formato que yo aplico en el origen. La <b>hoja del LS</b> es el metrado en
    el formato PI_POR_ESPECILIDAD_F5, para copiarla a tu libro.</p>
  <div class="pme-estado" id="expEstado"></div>
  ${!filas.length ? '' : `<div class="pme-wrap" style="max-height:40vh">
    <table class="pme-tabla fis-obslista">
      <colgroup><col style="width:9%"><col style="width:22%"><col style="width:16%"><col>
        <col style="width:7%"><col style="width:9%"></colgroup>
      <thead><tr><th>Cód. amb.</th><th>Ambiente (PMA)</th><th>Sobre</th><th>Observación</th>
        <th>¿Mal?</th><th></th></tr></thead>
      <tbody>${filas.map(f => `<tr class="${f.o.mal ? 'mal' : ''}">
        <td class="pme-cod">${esc(f.m.cods)}</td>
        <td class="pme-amb">${esc(f.m.amb)}<small>${esc(f.m.upss)}</small></td>
        <td>${f.j === null ? 'El ambiente'
             : `Renglón ${esc(f.j)} · <span class="pme-cod">${esc(f.r ? f.r.c : '')}</span>
                <small>${esc(f.r ? f.r.d : '')}</small>`}</td>
        <td>${esc((f.o.t || '').trim()) || '<span class="fis-nd">sin texto, sólo marcado</span>'}</td>
        <td>${f.o.mal ? '<span class="fis-rep mal">Está mal</span>' : ''}</td>
        <td class="ex-btns">
          <button type="button" class="ex-btn" onclick="fisIrObs(${fisId(f.ia)}, ${f.j === null ? 'null' : f.j})">Ir</button>
          <button type="button" class="ex-btn" onclick="fisQuitarObs(${fisId(f.ia)}, ${f.j === null ? 'null' : f.j})">Quitar</button>
        </td>
      </tr>`).join('')}</tbody>
    </table>
  </div>`}
  ${tablaCant}`;
}

/* ── Las cantidades que cambiaste con − y + ──
   Van al lado de las observaciones porque son lo mismo: reparos sobre
   el preliminar. La diferencia es que éstos ya traen el número puesto,
   así que lo que hace falta es poder repasarlos y deshacerlos. */
function fisListaCant(){
  const ls = pmeLineas().filter(pmeTocada);
  if(!ls.length) return '';
  const ix = fisIdx();
  const porCod = {};
  ix.lista.forEach(a => { porCod[a.m.cods] = a; });
  const sube = ls.filter(r => pmeQ(r) > (r.fin || 0)).length;
  const baja = ls.length - sube;
  return `<h5 class="fis-tit">Cantidades que cambiaste
      <small>${pmeNum(ls.length)} ${ls.length === 1 ? 'línea' : 'líneas'}${
        sube ? ' · ' + pmeNum(sube) + ' que subiste' : ''}${
        baja ? ' · ' + pmeNum(baja) + ' que bajaste' : ''}</small></h5>
    <div class="pme-wrap" style="max-height:34vh">
    <table class="pme-tabla fis-obslista">
      <colgroup><col style="width:9%"><col style="width:22%"><col style="width:9%"><col>
        <col style="width:8%"><col style="width:8%"><col style="width:9%"></colgroup>
      <thead><tr><th>Cód. amb.</th><th>Ambiente (PMA)</th><th>Código</th><th>Descripción</th>
        <th class="n">Norma</th><th class="n">Ahora</th><th></th></tr></thead>
      <tbody>${ls.map(r => {
        const a = porCod[r.cods];
        const q = pmeQ(r);
        return `<tr>
          <td class="pme-cod">${esc(r.cods)}</td>
          <td class="pme-amb">${esc(r.amb)}<small>${esc(r.upss)}</small></td>
          <td><span class="pme-cod">${esc(r.c)}</span></td>
          <td class="pme-desc">${esc(r.d)}</td>
          <td class="n">${pmeNum(r.fin || 0)}</td>
          <td class="n"><b class="tocada">${pmeNum(q)}</b></td>
          <td class="ex-btns">
            ${a ? `<button type="button" class="ex-btn" onclick="fisIr(${fisId(a.i)})">Ir</button>` : ''}
            <button type="button" class="ex-btn" onclick="pmeSetQ(${r.n}, '')">Deshacer</button>
          </td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`;
}

/* Llevar a donde se puso, y dejar la caja abierta para corregirla. */
function fisIrObs(ia, j){
  fisIr(ia);
  setTimeout(() => {
    if(j !== null && j !== undefined){
      const fila = document.getElementById('obsr-' + ia + '-' + j);
      if(fila){
        fila.classList.add('abierta');
        const ta = fila.querySelector('textarea');
        if(ta){ ta.focus(); ta.scrollIntoView({block: 'center', behavior: 'smooth'}); }
        return;
      }
    }
    const cajas = document.querySelectorAll('.fis-det-caja > .fis-obs textarea');
    const ta = cajas[cajas.length - 1];
    if(ta){ ta.focus(); ta.scrollIntoView({block: 'center', behavior: 'smooth'}); }
  }, 260);
}

function fisQuitarObs(ia, j){
  const suelta = (j === null || j === undefined);
  const m = suelta ? PME_U.obs : PME_U.obsr;
  const k = suelta ? fisClaveAmb(ia) : fisClaveRen(ia, j);
  if(!m || !m[k]) return;
  if(!confirm('Se borra esta observación. ¿Seguimos?')) return;
  delete m[k];
  pmeGuardarLS();
  fisOlvidar();
  pintarPme();
}

/* ── Llevarse los reparos para que los apliquemos en el origen ──
   El respaldo .json de la pestaña Exportar sirve para seguir revisando
   en otro equipo, pero lleva la revisión en crudo. Esto es otra cosa:
   un archivo que se entiende solo, con cada reparo acompañado de todo
   lo que hace falta para corregirlo donde nace —el ambiente de la NTS,
   la página del PMA, el renglón, la cantidad que hay hoy—, para que lo
   arreglemos en la transcripción, en el emparejamiento o en el metrado
   y vuelva ya corregido en la siguiente versión.                      */
function fisDescargarObs(){
  const ix = fisIdx();
  const porCod = {};
  ix.lista.forEach(a => { porCod[a.m.cods] = a; });

  const ficha = (a, j) => {
    const m = a.m;
    const r = (j === null || j === undefined) ? null
            : a.ren.find(x => String(x.j) === String(j));
    const ln = r && r.ln;
    return {
      codigoAmbiente: m.cods, upss: m.upss, ambientePMA: m.amb,
      paginaPMA: m.pag, nAmb: m.n, areaPMA: m.area,
      codigoPMF: m.pmf || null,
      ambienteNTS: m.ambnts || null, codigoNTS: m.cod || null,
      idNTS: a.nts ? a.nts.id : null,
      hojaExcel: a.nts ? a.nts.hoja || null : null,
      emparejado: m.conf, notaDelEmparejamiento: m.nota || null,
      renglon: (j === null || j === undefined) ? null : Number(j),
      filaDelExcel: (r && a.nts && a.nts.fil) ? (a.nts.fil[r.j - 1] || null) : null,
      codigoEquipo: r ? r.c : null, descripcionEquipo: r ? r.d : null,
      tipo: r ? r.t : null, eqOc: r ? r.p : null,
      cantidadNorma: r ? r.qn : null,
      cantidadPME: ln ? pmeQ(ln) : null,
      quePaso: r ? FIS_EST[r.est][0] : null,
    };
  };

  const obs = [], huerfanas = [];
  Object.keys(PME_U.obs || {}).forEach(k => {
    const o = PME_U.obs[k];
    if(!(o.t || '').trim() && !o.mal) return;
    const a = porCod[k];
    if(!a){ huerfanas.push({clave: k, obs: o}); return; }
    obs.push(Object.assign({sobre: 'ambiente', estaMal: !!o.mal,
                            observacion: (o.t || '').trim()}, ficha(a, null)));
  });
  Object.keys(PME_U.obsr || {}).forEach(k => {
    const o = PME_U.obsr[k];
    if(!(o.t || '').trim() && !o.mal) return;
    const p = k.split('|'), a = porCod[p[0]];
    if(!a){ huerfanas.push({clave: k, obs: o}); return; }
    obs.push(Object.assign({sobre: 'renglon', estaMal: !!o.mal,
                            observacion: (o.t || '').trim()}, ficha(a, p[2])));
  });
  obs.sort((x, y) => (x.codigoAmbiente || '').localeCompare(y.codigoAmbiente || '') ||
                     (x.renglon || 0) - (y.renglon || 0));

  /* Las cantidades que Luis cambió a mano van también: son correcciones
     que hay que llevar al origen igual que las observaciones. */
  const cant = pmeLineas().filter(pmeTocada).map(r => ({
    codigoAmbiente: r.cods, upss: r.upss, ambientePMA: r.amb,
    codigoEquipo: r.c, descripcionEquipo: r.d,
    cantidadNorma: r.qn, cantidadPreliminar: r.fin, cantidadCorregida: pmeQ(r),
  }));

  const dec = Object.keys(PME_U.dec || {})
    .filter(k => (PME_U.dec[k] || '').trim())
    .map(k => {
      const f = PME_D.pmf.find(x => x.cod === k) || {};
      return {codigoPMF: k, ambientePMF: f.amb || null, resultado: f.res || null,
              decision: PME_U.dec[k].trim()};
    });

  const doc = {
    que: 'Observaciones y correcciones de la revisión del PME',
    comoSeUsa: 'Entrégalo para que las correcciones se apliquen en la transcripción, '
             + 'el emparejamiento con la NTS o el metrado, y vuelvan ya corregidas.',
    proyecto: PME_D.meta.proyecto, cui: PME_D.meta.cui,
    baseDeDatos: PME_D.meta.generado,
    exportado: new Date().toISOString(),
    resumen: {observaciones: obs.length, marcadasComoError: obs.filter(o => o.estaMal).length,
              cantidadesCorregidas: cant.length, decisionesPMF: dec.length,
              sinAmbiente: huerfanas.length},
    observaciones: obs, cantidadesCorregidas: cant, decisionesPMF: dec,
    sinAmbiente: huerfanas,
  };

  const hoy = new Date();
  const f = String(hoy.getDate()).padStart(2, '0') + String(hoy.getMonth() + 1).padStart(2, '0') + hoy.getFullYear();
  pmeBajar(new Blob([JSON.stringify(doc, null, 2)], {type: 'application/json'}),
           'observaciones_PME_' + pmeSlug() + '_' + f + '.json');
}

/* ── Lo observado, en Excel ──
   El .json sirve para que yo lo aplique en el origen, pero para repasar
   —y para distinguir un reparo de otro— hace falta una tabla. Son
   cuatro hojas: lo que escribiste, lo que corregiste con − y +, lo que
   decidiste del PMF y lo que añadiste por planos. */
function fisObsExcel(){
  expMsg('Armando el Excel de observaciones…');
  pmeSheetJs().then(XLSX => {
    const wb = XLSX.utils.book_new();
    const pon = (nombre, filas, vacio) => {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        filas.length ? filas : [vacio]), nombre);
    };

    const obsFilas = fisObsParaExcel();
    /* fisObsParaExcel deja una fila de aviso cuando no hay nada, para
       que la hoja no salga vacía; esa no se cuenta. */
    const nObs = obsFilas.filter(o => (o['Observación'] || '').trim()).length;
    pon('Observaciones', obsFilas, {});

    const ix = fisIdx();
    const porCod = {};
    ix.lista.forEach(a => { porCod[a.m.cods] = a; });
    const cant = pmeLineas().filter(pmeTocada).map(r => {
      const a = porCod[r.cods];
      return {
        'Cód. amb.': r.cods, 'UPSS / UPS': r.upss, 'Ambiente (PMA)': r.amb,
        'Pág. PMA': r.pag, 'Cód. PMF': r.pmf || '',
        'Ambiente NTS': r.ambNts || '', 'Id NTS': a && a.nts ? a.nts.id : '',
        'Código': r.c, 'Descripción': r.d, 'Tipo': r.t, 'EQ/OC': r.p,
        'Cant. norma': r.qn, 'Cant. preliminar': r.fin, 'Cant. corregida': pmeQ(r),
        'Diferencia': pmeQ(r) - (r.fin || 0),
        'Qué pasó': pmeQ(r) > (r.fin || 0) ? 'La subiste' : 'La bajaste'
      };
    });
    pon('Cantidades corregidas', cant, {'Cód. amb.': '', 'Ambiente (PMA)': 'Sin cantidades corregidas'});

    const dec = Object.keys(PME_U.dec || {})
      .filter(k => (PME_U.dec[k] || '').trim())
      .map(k => {
        const f = PME_D.pmf.find(x => x.cod === k) || {};
        return {'Cód. PMF': k, 'Ambiente (PMF)': f.amb || '', 'Resultado': f.res || '',
                'Detalle': f.det || '', 'Decisión': PME_U.dec[k].trim()};
      });
    pon('Decisiones PMF', dec, {'Cód. PMF': '', 'Ambiente (PMF)': 'Sin decisiones escritas'});

    pon('Añadidos por planos', extParaExcel(), {});

    const h = new Date();
    const dia = String(h.getDate()).padStart(2, '0') + String(h.getMonth() + 1).padStart(2, '0') + h.getFullYear();
    XLSX.writeFile(wb, 'observaciones_PME_' + pmeSlug() + '_' + dia + '.xlsx');
    expMsg('Listo: ' + pmeNum(nObs) + ' observaciones y ' +
           pmeNum(cant.length) + ' cantidades corregidas.');
  }).catch(e => expMsg('No se pudo armar: ' + e.message, 'mal'));
}

/* — Hoja «Observaciones»: los reparos de Luis, ambiente y renglón — */
function fisObsParaExcel(){
  const ix = fisIdx();
  const porCod = {};
  ix.lista.forEach(a => { porCod[a.m.cods] = a; });
  const out = [];
  Object.keys(PME_U.obs || {}).forEach(k => {
    const o = PME_U.obs[k], a = porCod[k];
    if(!a || (!(o.t || '').trim() && !o.mal)) return;
    out.push({'Sobre': 'Ambiente', 'Cód. amb.': a.m.cods, 'UPSS / UPS': a.m.upss,
              'Ambiente (PMA)': a.m.amb, 'Pág. PMA': a.m.pag, 'N° renglón': '',
              'Código': '', 'Descripción': '',
              '¿Está mal?': o.mal ? 'Sí' : '', 'Observación': (o.t || '').trim()});
  });
  Object.keys(PME_U.obsr || {}).forEach(k => {
    const o = PME_U.obsr[k];
    if(!(o.t || '').trim() && !o.mal) return;
    const p = k.split('|'), j = p[2];
    const a = porCod[p[0]];
    if(!a) return;
    const r = a.ren.find(x => String(x.j) === String(j)) || {};
    out.push({'Sobre': 'Renglón de la norma', 'Cód. amb.': a.m.cods, 'UPSS / UPS': a.m.upss,
              'Ambiente (PMA)': a.m.amb, 'Pág. PMA': a.m.pag, 'N° renglón': j,
              'Código': r.c || '', 'Descripción': r.d || '',
              '¿Está mal?': o.mal ? 'Sí' : '', 'Observación': (o.t || '').trim()});
  });
  return out.length ? out : [{'Sobre': '', 'Cód. amb.': '', 'UPSS / UPS': '',
      'Ambiente (PMA)': 'Sin observaciones puestas', 'Pág. PMA': '', 'N° renglón': '',
      'Código': '', 'Descripción': '', '¿Está mal?': '', 'Observación': ''}];
}

/* — Hoja «Norma vs PME»: la lista de la norma renglón por renglón — */
function fisNormaParaExcel(){
  const ix = fisIdx();
  const out = [];
  ix.lista.forEach(a => {
    a.ren.forEach(x => {
      out.push({
        'UPSS / UPS': a.m.upss,
        'Ambiente (PMA)': a.m.amb,
        'Pág. PMA': a.m.pag,
        'N° Amb.': a.m.n,
        'Cód. PMF': a.m.pmf,
        'Id NTS': a.nts ? (a.nts.partes && a.nts.partes.length > 1
          ? (a.nts.partes[x.ip] || a.nts.partes[0]).id : a.nts.id) : '',
        'Ambiente NTS': a.nts ? (a.nts.partes && a.nts.partes.length > 1
          ? (a.nts.partes[x.ip] || a.nts.partes[0]).amb : a.nts.amb) : '',
        'N° renglón': x.j,
        'Código': x.c,
        'Descripción': x.d,
        'Tipo': x.t,
        'EQ/OC': x.p,
        'Cant. norma': x.qn,
        'Cant. calculada': x.ln ? x.ln.calc : '',
        'Cant. PME': x.ln ? pmeQ(x.ln) : '',
        'Qué pasó': FIS_EST[x.est][0] + (x.est === 'dup' ? ' · ' + x.vez + '.º renglón' : ''),
        'Observación': x.ln ? x.ln.obs : ''
      });
    });
  });
  return out;
}
