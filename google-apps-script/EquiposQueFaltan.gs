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
