/* ═══════════════════════════════════════════════════════════════════
   05-archivo.js — guardar en TU archivo, no en la carpeta de descargas.

   Descargar deja un .xlsx nuevo cada vez —con (1), (2), (3) detrás— y
   luego hay que acordarse de cuál era el bueno. Esto es lo otro: se
   elige UNA vez el archivo del disco y a partir de ahí el botón
   «Guardar» lo sobrescribe, como cualquier programa.

   Se apoya en el acceso a archivos del navegador (File System Access),
   que va en Chrome y en Edge. Firefox no lo trae: ahí el botón avisa y
   queda la descarga de siempre. El permiso lo da Luis al elegir el
   archivo, y el navegador lo vuelve a pedir si pasa tiempo o se cierra;
   la herramienta nunca toca nada fuera de ese archivo.

   El enlace al archivo se guarda en IndexedDB, que es lo único que
   conserva un «handle» de archivo entre sesiones: en localStorage no
   cabe, porque no es texto.

   ESTO NO ES TODAVÍA sincronizar el libro LS entero. Escribe la hoja
   PI_POR_ESPECILIDAD_F5 en un .xlsx propio, siempre el mismo. Meter la
   hoja DENTRO del libro oficial —con sus otras doce hojas y sus
   fórmulas— es el paso siguiente y pide abrir y rearmar ese libro.
   ═══════════════════════════════════════════════════════════════════ */

const ARCH_DB = 'pme-pachas-archivos';
const ARCH_LS = 'hojaLs';

let ARCH_HANDLE = null;         // el archivo vinculado, si ya se eligió
let ARCH_NOMBRE = '';

function archDb(){
  return new Promise((ok, mal) => {
    const p = indexedDB.open(ARCH_DB, 1);
    p.onupgradeneeded = () => p.result.createObjectStore('h');
    p.onsuccess = () => ok(p.result);
    p.onerror = () => mal(p.error);
  });
}

function archLeer(clave){
  return archDb().then(db => new Promise(ok => {
    const p = db.transaction('h').objectStore('h').get(clave);
    p.onsuccess = () => ok(p.result || null);
    p.onerror = () => ok(null);
  })).catch(() => null);
}

function archEscribir(clave, valor){
  return archDb().then(db => new Promise(ok => {
    const p = db.transaction('h', 'readwrite').objectStore('h').put(valor, clave);
    p.onsuccess = () => ok(true);
    p.onerror = () => ok(false);
  })).catch(() => false);
}

function archHay(){ return typeof window.showSaveFilePicker === 'function'; }

/* Al arrancar se recupera el archivo de la última vez, sólo para poder
   enseñar su nombre; el permiso no se pide hasta que se guarda. */
function archCargar(){
  if(!archHay()) return Promise.resolve();
  return archLeer(ARCH_LS).then(h => {
    if(h){ ARCH_HANDLE = h; ARCH_NOMBRE = h.name || ''; pintarPme(); }
  });
}

function archPermiso(h, escribir){
  const o = {mode: escribir ? 'readwrite' : 'read'};
  if(!h.queryPermission) return Promise.resolve(true);
  return h.queryPermission(o).then(p => p === 'granted' ? true
    : h.requestPermission(o).then(p2 => p2 === 'granted'));
}

/* Elegir el archivo. Si ya hay uno, esto sirve para cambiarlo. */
function archElegir(){
  if(!archHay()){
    expMsg('Este navegador no deja escribir en un archivo del disco. '
         + 'Usa Chrome o Edge, o descarga el archivo.', 'mal');
    return;
  }
  const r = lsBlob();
  window.showSaveFilePicker({
    suggestedName: r.nombre || 'PI_POR_ESPECIALIDAD_F5.xlsx',
    types: [{description: 'Libro de Excel', accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']}}],
  }).then(h => {
    ARCH_HANDLE = h; ARCH_NOMBRE = h.name || '';
    return archEscribir(ARCH_LS, h).then(() => archGuardar());
  }).catch(e => {
    if(e && e.name === 'AbortError') return;      // lo canceló, no es un fallo
    expMsg('No se pudo elegir el archivo: ' + (e && e.message), 'mal');
  });
}

/* Escribir la hoja en el archivo de siempre. */
function archGuardar(){
  if(!ARCH_HANDLE){ archElegir(); return; }
  expMsg('Guardando en ' + ARCH_NOMBRE + '…');
  const r = lsBlob();
  if(r.error){ expMsg('No se pudo armar: ' + r.error, 'mal'); return; }
  archPermiso(ARCH_HANDLE, true).then(ok => {
    if(!ok){ expMsg('El navegador no dio permiso para escribir en ese archivo.', 'mal'); return; }
    return ARCH_HANDLE.createWritable().then(w =>
      w.write(r.blob).then(() => w.close())
    ).then(() => {
      const h = new Date();
      expMsg('Guardado en ' + ARCH_NOMBRE + ' a las ' +
        String(h.getHours()).padStart(2, '0') + ':' + String(h.getMinutes()).padStart(2, '0') +
        ' · ' + r.resumen);
      pintarPme();
    });
  }).catch(e => expMsg('No se pudo guardar: ' + (e && e.message), 'mal'));
}

function archOlvidar(){
  if(!confirm('Se desvincula el archivo. El archivo no se borra; sólo deja de actualizarse.')) return;
  ARCH_HANDLE = null; ARCH_NOMBRE = '';
  archEscribir(ARCH_LS, null).then(() => pintarPme());
}

/* ── Traer del Excel lo que cambiaste a mano ──
   El ida y vuelta: la herramienta escribe la hoja y tú corriges una
   cantidad en Excel, que al fin y al cabo es donde se trabaja. Esto lee
   el archivo vinculado y se pone al día.

   Cada renglón del Excel se reconoce por el ambiente (columna M), el
   código del equipo (O) y cuántas veces ha aparecido ese código dentro
   del ambiente: es la misma secuencia con la que se escribió, el orden
   de la norma, así que casa renglón a renglón aunque haya repetidos.
   Lo que no se reconoce se cuenta y se dice; no se inventa nada.        */
function archTraer(){
  if(!ARCH_HANDLE){ expMsg('Primero elige el archivo con «Guardar en mi archivo…».', 'mal'); return; }
  expMsg('Leyendo ' + ARCH_NOMBRE + '…');
  archPermiso(ARCH_HANDLE, false).then(ok => {
    if(!ok){ expMsg('El navegador no dio permiso para leer ese archivo.', 'mal'); return; }
    return ARCH_HANDLE.getFile().then(f => f.arrayBuffer()).then(buf =>
      pmeSheetJs().then(XLSX => archAplicar(XLSX, buf)));
  }).catch(e => expMsg('No se pudo leer: ' + (e && e.message), 'mal'));
}

function archAplicar(XLSX, buf){
  const wb = XLSX.read(buf, {type: 'array'});
  const hoja = wb.Sheets['PI_POR_ESPECILIDAD_F5'] || wb.Sheets[wb.SheetNames[0]];
  if(!hoja){ expMsg('Ese archivo no tiene la hoja del LS.', 'mal'); return; }
  const filas = XLSX.utils.sheet_to_json(hoja, {header: 1, blankrows: true});

  const ix = fisIdx();
  const porCods = {};
  ix.lista.forEach(a => { porCods[a.m.cods] = a; });

  let cambios = 0, nuevos = 0, sueltos = 0;
  const vistos = {};
  filas.forEach((f, k) => {
    if(!k) return;                                   // la cabecera
    const cods = (f[12] || '').toString().trim();    // M
    const cod = (f[14] || '').toString().trim();     // O
    if(!cods || !cod) return;                        // banda o separador
    const q = Number(f[16]);                         // Q
    if(!isFinite(q)) return;

    const a = porCods[cods];
    if(!a){ sueltos++; return; }
    const kk = cods + '|' + cod;
    vistos[kk] = (vistos[kk] || 0) + 1;
    const cand = a.ren.filter(x => x.c === cod && x.p !== 'OC');
    const x = cand[vistos[kk] - 1];
    if(!x){ sueltos++; return; }

    if(x.ln){
      if(pmeQ(x.ln) !== q){
        const clave = pmeClave(x.ln);
        if(q === (x.ln.fin || 0)) delete PME_U.q[clave];
        else PME_U.q[clave] = Math.max(0, Math.round(q));
        cambios++;
      }
    }else if(q > 0){
      /* Un renglón anulado por unificación al que le pusiste cantidad
         en el Excel: eso es reactivarlo, igual que con el + de aquí. */
      if(!PME_U.forz) PME_U.forz = {};
      PME_U.forz[fisClaveFz(cods, cod, x.j)] = Math.max(1, Math.round(q));
      nuevos++;
    }
  });

  if(!cambios && !nuevos){
    expMsg('Leído ' + ARCH_NOMBRE + ': no hay nada distinto de lo que ya tenías' +
      (sueltos ? ' · ' + sueltos + ' filas del archivo no se reconocieron' : '') + '.');
    return;
  }
  pmeGuardarLS();
  fisOlvidar();
  pintarPme();
  expMsg('Traído de ' + ARCH_NOMBRE + ': ' + pmeNum(cambios) +
    (cambios === 1 ? ' cantidad cambiada' : ' cantidades cambiadas') +
    (nuevos ? ' · ' + pmeNum(nuevos) + ' anulados que reactivaste en el Excel' : '') +
    (sueltos ? ' · ' + pmeNum(sueltos) + ' filas no reconocidas' : '') + '.');
}

/* ── Las dos cosas de una vez ──
   El uso de verdad es: corriges cantidades en Excel, vuelves aquí y
   quieres que todo cuadre. Eso son dos pasos —traer lo tuyo y volver a
   escribir la hoja, que es cuando los colores y las observaciones se
   ponen al día— y no hay motivo para hacerlos a mano por separado. */
function archSincronizar(){
  if(!ARCH_HANDLE){ archElegir(); return; }
  expMsg('Leyendo ' + ARCH_NOMBRE + '…');
  archPermiso(ARCH_HANDLE, true).then(ok => {
    if(!ok){ expMsg('El navegador no dio permiso para ese archivo.', 'mal'); return; }
    return ARCH_HANDLE.getFile().then(f => f.arrayBuffer())
      .then(buf => pmeSheetJs().then(XLSX => archAplicar(XLSX, buf)))
      .then(() => {
        const antes = document.getElementById('expEstado');
        const traido = antes ? antes.textContent : '';
        const r = lsBlob();
        if(r.error) throw new Error(r.error);
        return ARCH_HANDLE.createWritable()
          .then(w => w.write(r.blob).then(() => w.close()))
          .then(() => {
            expMsg(traido.replace(/\.$/, '') + ' · y el archivo ya está escrito de vuelta: '
              + 'los colores y la columna OBSERVACION están al día.');
            pintarPme();
          });
      });
  }).catch(e => expMsg('No se pudo sincronizar: ' + (e && e.message), 'mal'));
}
