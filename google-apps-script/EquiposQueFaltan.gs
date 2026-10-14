/**
 * Sinergia Biomédica — ¿Qué me falta publicar del proveedor?
 *
 * Archivo APARTE, para añadir al MISMO proyecto de Apps Script que ya
 * tiene Venta.gs («Sinergia — Venta»). No hay que volver a publicar la
 * implementación: estas funciones se ejecutan a mano con ▶.
 *
 * Usa lo que Venta.gs ya define (VENTA_ID, hojaVenta_, codAtl_, nrm_,
 * esAccesorio_, EQUIPO_, s_, num_), así que los dos archivos tienen que
 * vivir en el mismo proyecto.
 *
 * CÓMO SE USA
 *   1) Toca el marcador AJR-SINERGIA en el portal del proveedor, para que
 *      la pestaña «Proveedor» esté al día.
 *   2) Aquí arriba elige «equiposQueFaltan» y toca ▶.
 *   3) Mira «Registro de ejecución» para las cuentas, y la pestaña nueva
 *      «Equipos que faltan» para la lista.
 *
 * La pestaña nueva trae las filas listas: revisa, borra lo que no quieras
 * vender y copia el resto a la hoja «Venta». Al siguiente toque del
 * marcador entran solos a la web con su precio y su stock.
 */

/* Columnas de la pestaña «Proveedor», tal como las escribe Venta.gs:
   A codigo · B descripcion · C modelo_proveedor · D stock · E precio_usd
   F precio_soles · G imagen */
var PV_COD = 0, PV_DESC = 1, PV_MOD = 2, PV_STOCK = 3, PV_USD = 4, PV_SOLES = 5, PV_IMG = 6;

/** Número de una celda que puede venir como texto con comas. */
function nmr_(v) {
  if (typeof v === 'number') return v;
  var n = Number(String(v === null || v === undefined ? '' : v).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? 0 : n;
}

/** equipo · accesorio · dudoso, con el mismo criterio que usa el emparejado. */
function tipoProveedor_(descripcion) {
  var dn = nrm_(descripcion);
  if (!dn) return 'dudoso';
  if (esAccesorio_(dn)) return 'accesorio';
  return EQUIPO_.test(dn) ? 'equipo' : 'dudoso';
}

/** Los códigos de proveedor que ya están puestos en la hoja «Venta». */
function codigosEnVenta_(ss) {
  var sh = hojaVenta_(ss), vals = sh.getDataRange().getValues(), fh = -1;
  for (var i = 0; i < Math.min(vals.length, 40); i++) {
    if (s_(vals[i][0]).toLowerCase() === 'id') { fh = i; break; }
  }
  var set = {};
  if (fh < 0) return set;
  var cab = vals[fh].map(function (c) { return s_(c).toLowerCase(); });
  var cCod = cab.indexOf('codigo_proveedor');
  if (cCod < 0) return set;
  for (var r = fh + 1; r < vals.length; r++) {
    var k = codAtl_(vals[r][cCod]);
    if (k) set[k] = true;
  }
  return set;
}

/** El margen de la hoja de venta (A1:B3), por defecto 35 %. */
function margenVenta_(ss) {
  var m = 35;
  hojaVenta_(ss).getRange(1, 1, 3, 2).getValues().forEach(function (r) {
    if (s_(r[0]).toLowerCase() === 'margen' && num_(r[1]) !== null) m = num_(r[1]);
  });
  return m;
}

/**
 * ▶ Cuenta el catálogo del proveedor y deja en una pestaña nueva los
 * equipos con stock que todavía no publicas.
 */
function equiposQueFaltan() {
  var ss = SpreadsheetApp.openById(VENTA_ID);
  var pv = ss.getSheetByName('Proveedor');
  if (!pv) {
    Logger.log('No existe la pestaña «Proveedor». Toca primero el marcador AJR-SINERGIA en el portal.');
    return;
  }
  var filas = pv.getDataRange().getValues().slice(1).filter(function (r) { return s_(r[PV_COD]); });
  var yaEsta = codigosEnVenta_(ss), margen = margenVenta_(ss);

  var c = {
    total: filas.length, conStock: 0,
    equipo: 0, accesorio: 0, dudoso: 0,
    equipoConStock: 0, dudosoConStock: 0, accesorioConStock: 0,
    faltanEquipo: 0, faltanDudoso: 0, yaPublicados: 0
  };
  var nuevos = [];

  filas.forEach(function (r) {
    var tipo = tipoProveedor_(r[PV_DESC]);
    var stock = nmr_(r[PV_STOCK]);
    var hay = stock > 0;
    c[tipo]++;
    if (hay) {
      c.conStock++;
      c[tipo + 'ConStock']++;
    }
    var k = codAtl_(r[PV_COD]);
    if (yaEsta[k]) { c.yaPublicados++; return; }
    if (!hay || tipo === 'accesorio') return;
    c[tipo === 'equipo' ? 'faltanEquipo' : 'faltanDudoso']++;
    var soles = nmr_(r[PV_SOLES]);
    nuevos.push([
      'SI', tipo, s_(r[PV_DESC]), s_(r[PV_MOD]), stock,
      nmr_(r[PV_USD]) || '', soles ? Math.round(soles * (1 + margen / 100)) : '',
      "'" + s_(r[PV_COD]), s_(r[PV_IMG])
    ]);
  });

  /* Primero los que son claramente equipos, y dentro, los que más stock
     tienen: son los que puedes ofrecer con entrega inmediata. */
  nuevos.sort(function (a, b) {
    if (a[1] !== b[1]) return a[1] === 'equipo' ? -1 : 1;
    return (b[4] - a[4]) || (a[2] < b[2] ? -1 : 1);
  });

  var nom = 'Equipos que faltan';
  var vieja = ss.getSheetByName(nom);
  if (vieja) ss.deleteSheet(vieja);
  var sh = ss.insertSheet(nom);
  var cab = ['publicar', 'tipo', 'descripcion del proveedor', 'modelo', 'stock',
             'precio proveedor US$', 'precio web aprox. S/', 'codigo', 'imagen'];
  sh.getRange(1, 1, 1, cab.length).setValues([cab])
    .setFontWeight('bold').setFontColor('#ffffff').setBackground('#1f2a36');
  if (nuevos.length) {
    sh.getRange(2, 1, nuevos.length, cab.length).setValues(nuevos);
    sh.getRange(2, 7, nuevos.length, 1).setNumberFormat('#,##0');
  }
  sh.setFrozenRows(1);
  sh.setColumnWidth(3, 560);

  var L = [];
  L.push('═══ CATÁLOGO DEL PROVEEDOR ═══');
  L.push('  Filas en la pestaña «Proveedor» : ' + c.total);
  L.push('  Con stock (> 0)                 : ' + c.conStock);
  L.push('  Agotadas                        : ' + (c.total - c.conStock));
  L.push('');
  L.push('═══ DE ESAS FILAS, QUÉ SON ═══');
  L.push('  Equipos    : ' + c.equipo + '   (con stock: ' + c.equipoConStock + ')');
  L.push('  Accesorios : ' + c.accesorio + '   (con stock: ' + c.accesorioConStock + ')');
  L.push('  Dudosos    : ' + c.dudoso + '   (con stock: ' + c.dudosoConStock + ')');
  L.push('');
  L.push('═══ LO QUE TE FALTA PUBLICAR ═══');
  L.push('  Ya tienes en la hoja «Venta»    : ' + c.yaPublicados);
  L.push('  Equipos con stock sin publicar  : ' + c.faltanEquipo);
  L.push('  Dudosos con stock sin publicar  : ' + c.faltanDudoso);
  L.push('  ─────────────────────────────────');
  L.push('  En la pestaña «' + nom + '»: ' + nuevos.length + ' filas listas para revisar.');
  Logger.log(L.join('\n'));
}


/* ═══════════════════════════════════════════════════════════════════
   Publicar los equipos que ya estaban en la hoja, tenían stock y
   seguían en «publicar = no».

   Eran 17. Se publican 13: cuatro quedan fuera a propósito, y la razón
   está escrita en NO_PUBLICAR, abajo, para que dentro de seis meses se
   sepa por qué.

   Las filas venían con la descripción del proveedor como nombre
   («Autoclave mesa 28 L clase B c/bomba d.vacio, generador d.vapor e
   impres ST LIMIT TUTTNAUER»), sin modelo, sin resumen y sin áreas.
   Publicarlas así habría puesto texto de almacén en la web, así que
   esta tabla trae el nombre limpio y lo que falta.

   El código NTS se deja vacío a propósito en los que no se pudo
   confirmar: un código equivocado en un expediente es peor que ninguno.
   ═══════════════════════════════════════════════════════════════════ */

var PUBLICAR_ = [
  { id: 'heine-097596', categoria: 'diagnostico',
    nombre: 'Dermatoscopio LED con estuche y cargador', modelo: 'Delta 30',
    resumen: 'Dermatoscopio de mano con luz LED para el examen de lesiones de piel en consulta.',
    caracteristicas: 'Luz LED|Cable USB con fuente de alimentación|Examen con y sin inmersión|Estuche de transporte',
    areas: 'Consulta externa, Dermatología' },

  { id: 'heine-073492', categoria: 'diagnostico',
    nombre: 'Oftalmoscopio indirecto binocular', modelo: 'Omega 500',
    resumen: 'Oftalmoscopio binocular indirecto con cinta craneal para examen de retina y fondo de ojo.',
    caracteristicas: 'Binocular indirecto|Cinta craneal|6 V|Maletín de transporte',
    areas: 'Consulta externa, Oftalmología' },

  { id: 'boeco-082785', categoria: 'laboratorio',
    nombre: 'Termómetro digital de bolsillo con sonda', modelo: 'BOE 310',
    resumen: 'Termómetro digital de bolsillo con sonda, para control de temperatura en laboratorio.',
    caracteristicas: 'Rango de −50 °C a +300 °C|Pantalla LCD|Sonda de acero inoxidable',
    areas: 'Laboratorio' },

  { id: 'tuttnauer-087186', categoria: 'esterilizacion',
    nombre: 'Autoclave de mesa de 28 litros clase B', modelo: 'Elara 11D',
    resumen: 'Autoclave de mesa clase B con bomba de vacío e impresora, para esterilización de instrumental.',
    caracteristicas: '28 litros|Clase B|Bomba de vacío|Generador de vapor|Impresora incorporada',
    areas: 'Centro quirúrgico, Esterilización, Consulta externa' },

  { id: 'mindray-097070', categoria: 'laboratorio',
    nombre: 'Lavadora de microplacas', modelo: 'MW-12A',
    resumen: 'Lavadora automática de microplacas para pruebas de ELISA en laboratorio clínico.',
    caracteristicas: '12 canales|Programas configurables|Para microplacas de 96 pozos',
    areas: 'Laboratorio' },

  { id: 'boeco-030203', categoria: 'laboratorio',
    nombre: 'Agitador orbital universal', modelo: 'OS-20',
    resumen: 'Agitador orbital de laboratorio con plataforma universal para matraces y tubos.',
    caracteristicas: 'Movimiento orbital|Plataforma PP-4 incluida|Velocidad regulable',
    areas: 'Laboratorio' },

  { id: 'gemmy-072210', categoria: 'laboratorio',
    nombre: 'Agitador vórtex de mesa', modelo: 'VM 300P',
    resumen: 'Agitador vórtex de mesa para mezclar muestras en tubos.',
    caracteristicas: 'Velocidad regulable|Funcionamiento continuo o por contacto|Cabezal de goma',
    areas: 'Laboratorio' },

  { id: 'boeco-077672', categoria: 'laboratorio',
    nombre: 'Balanza de precisión de 2 000 g', modelo: 'BWL 51',
    resumen: 'Balanza de precisión para laboratorio, con capacidad de 2 000 gramos.',
    caracteristicas: 'Capacidad 2 000 g|Precisión 0,01 g|Pantalla digital',
    areas: 'Laboratorio' },

  { id: 'boeco-076505', categoria: 'laboratorio',
    nombre: 'Balanza de precisión de 600 g', modelo: 'BBL 64',
    resumen: 'Balanza de precisión para laboratorio, con capacidad de 600 gramos.',
    caracteristicas: 'Capacidad 600 g|Precisión 0,1 g|Pantalla digital',
    areas: 'Laboratorio' },

  { id: 'boeco-087895', categoria: 'laboratorio',
    nombre: 'Balanza analítica de 750 g', modelo: 'BPS 40 Plus',
    resumen: 'Balanza analítica de laboratorio con precisión de milésima de gramo.',
    caracteristicas: 'Capacidad 750 g|Precisión 0,001 g|Pantalla digital',
    areas: 'Laboratorio' },

  { id: 'memmert-089258', categoria: 'laboratorio',
    nombre: 'Incubadora de CO₂ de 56 litros', modelo: 'ICO 50',
    resumen: 'Incubadora de CO₂ para cultivo celular en laboratorio e investigación.',
    caracteristicas: '56 litros|Hasta 50 °C|Control de CO₂|Cámara de 40 × 42,5 × 33 cm',
    areas: 'Laboratorio' },

  { id: 'heine-083007', categoria: 'quirofano',
    nombre: 'Lámpara de exploración con mordaza para mesa', modelo: 'EL3 LED',
    resumen: 'Lámpara de exploración LED que se fija con mordaza al borde de la mesa o camilla.',
    caracteristicas: 'Luz LED|Fijación por mordaza|Brazo flexible',
    areas: 'Consulta externa, Centro quirúrgico, Emergencia' },

  { id: 'heine-084116', categoria: 'quirofano',
    nombre: 'Lámpara de exploración con trípode rodable', modelo: 'EL 10 LED',
    resumen: 'Lámpara de exploración LED sobre trípode con ruedas, para consultorio y sala de procedimientos.',
    caracteristicas: 'Luz LED|Trípode rodable|Brazo orientable',
    areas: 'Consulta externa, Centro quirúrgico, Emergencia' }
];

/* Los que NO se publican, y por qué. Se deja escrito aquí para que la
   decisión no se pierda y nadie los vuelva a encender sin saberlo. */
var NO_PUBLICAR_ = [
  ['cami-096611',       'Más caro que en Saga Falabella: S/ 634 contra S/ 547-560 del mismo CA-MI New Aspiret.'],
  ['riester-082838',    'Más caro que en Saga Falabella: S/ 4 941 contra S/ 2 798-2 999 de la misma Riester ri-magic HP LED.'],
  ['cami-096610',       'Duplicado: ya está publicado como cami-new-hospivac-350, al mismo precio.'],
  ['cu-medical-081841', 'Duplicado: ya está publicado como cu-medical-hd1, al mismo precio.']
];

/* Los que hay que APAGAR. El estudio de precios del 4 de octubre
   (docs/comparacion-falabella-2026-10-04.md) los retiró por estar más
   caros que el mismo modelo en Saga Falabella, pero se retiraron del
   catálogo estático y la hoja siguió con «publicar = SI», así que
   volvieron a salir solos. Aquí se apagan donde manda de verdad. */
var RETIRAR_ = [
  ['riester-exacta',        'Más caro que en Falabella: S/ 403 contra S/ 280 del mismo Riester Exacta (+44 %).'],
  ['riester-ri-champion-n', 'Más caro que en Falabella: S/ 745 contra S/ 426 del mismo Riester Ri-champion N (+75 %).']
];

/**
 * ▶ Limpia y publica los equipos de PUBLICAR_, y apaga los de RETIRAR_.
 * Solo toca esas filas. Lo demás de la hoja queda igual.
 */
function publicarPendientes() {
  var ss = SpreadsheetApp.openById(VENTA_ID), sh = hojaVenta_(ss);
  var vals = sh.getDataRange().getValues(), fh = -1;
  for (var i = 0; i < Math.min(vals.length, 40); i++) {
    if (s_(vals[i][0]).toLowerCase() === 'id') { fh = i; break; }
  }
  if (fh < 0) { Logger.log('No encuentro la fila de encabezados («id») en la hoja «Venta».'); return; }
  var cab = vals[fh].map(function (c) { return s_(c).toLowerCase(); });
  var col = {};
  ['publicar', 'nombre', 'modelo', 'categoria', 'resumen', 'caracteristicas', 'areas'].forEach(function (k) {
    col[k] = cab.indexOf(k);
  });
  if (col.publicar < 0) { Logger.log('La hoja «Venta» no tiene columna «publicar».'); return; }

  var fila = {};
  for (var r = fh + 1; r < vals.length; r++) {
    var id = s_(vals[r][0]);
    if (id) fila[id] = r + 1;          // fila real de la hoja (1-based)
  }

  var hechos = 0, faltantes = [];
  PUBLICAR_.forEach(function (e) {
    var f = fila[e.id];
    if (!f) { faltantes.push(e.id); return; }
    ['nombre', 'modelo', 'categoria', 'resumen', 'caracteristicas', 'areas'].forEach(function (k) {
      if (e[k] && col[k] >= 0) sh.getRange(f, col[k] + 1).setValue(e[k]);
    });
    sh.getRange(f, col.publicar + 1).setValue('SI');
    hechos++;
    Logger.log('  publicado  fila ' + f + '  ' + e.id + '  →  ' + e.nombre);
  });

  var apagados = 0;
  RETIRAR_.forEach(function (x) {
    var f = fila[x[0]];
    if (!f) return;
    if (s_(vals[f - 1][col.publicar]).toUpperCase() !== 'SI') return;   // ya estaba apagado
    sh.getRange(f, col.publicar + 1).setValue('NO');
    apagados++;
    Logger.log('  RETIRADO   fila ' + f + '  ' + x[0] + '  →  ' + x[1]);
  });

  var L = ['', '═══ RESUMEN ═══', '  Publicados: ' + hechos + ' de ' + PUBLICAR_.length];
  L.push('  Retirados por precio: ' + apagados + ' de ' + RETIRAR_.length);
  if (faltantes.length) L.push('  NO encontrados en la hoja: ' + faltantes.join(', '));
  L.push('');
  L.push('  Dejados fuera a propósito:');
  NO_PUBLICAR_.forEach(function (x) { L.push('    · ' + x[0] + ' — ' + x[1]); });
  L.push('');
  L.push('  Falta por revisar: estos equipos quedan sin código NTS.');
  L.push('  Si alguno lo tiene en tus expedientes, ponlo en la columna «clave».');
  Logger.log(L.join('\n'));

  try { limpiarCache(); } catch (e) {}
}
