/**
 * Sinergia Biomédica — Apps Script de VENTA (proyecto propio)
 *
 * Proyecto SEPARADO del principal (el de alquiler, clientes y
 * expedientes), para no tocar lo que ya funciona. Hace dos cosas:
 *
 *  1) Publica el catálogo de venta: lee la hoja «Sinergia - Venta
 *     (catálogo en vivo)» y responde con los equipos publicar = SI
 *     (precio publicado, stock y fecha). La web lo pide a VENTA_URL
 *     (js/00-config.js).
 *  2) Recibe el botón «Actualizar Sinergia» (js/proveedor-atl.js), que
 *     lee precios y stock en el portal del proveedor (altokelite.com)
 *     y los escribe en la hoja.
 *
 * INSTALACIÓN (una vez)
 *  1) script.google.com › Nuevo proyecto › pega este archivo › Guardar.
 *     Nombre del proyecto: «Sinergia — Venta».
 *  2) Configuración del proyecto (engranaje) › Zona horaria: America/Lima.
 *  3) Ejecuta prepararHojaVenta (▶) y autoriza.
 *  4) Ejecuta crearBotonProveedor (▶) y copia el favorito desde Registros.
 *  5) Implementar › Nueva implementación › Aplicación web ·
 *     Ejecutar como: Yo · Acceso: Cualquier usuario › Implementar.
 *     La URL /exec va en VENTA_URL (js/00-config.js).
 *  Después de editar este archivo: Implementar › Gestionar
 *  implementaciones › editar › Nueva versión.
 */

var VENTA_ID = "11fnh5teSU1ysJUpUiq-hYgmqVUoj4Dq9wnWWT_XybyY";   // hoja «Sinergia - Venta (catálogo en vivo)»
var LIM_CABECERA = 40;
var CACHE_VENTA = 'venta_v1', CACHE_SEG = 600;

// ═════════════════════ utilidades ═════════════════════

function s_(v) { return v === null || v === undefined ? '' : String(v).trim(); }

function num_(v) {
  if (v === null || v === undefined || v === '') return null;
  var f = Number(String(v).replace('%', '').replace(',', '.'));
  if (isNaN(f)) return null;
  return f === Math.floor(f) ? Math.floor(f) : f;
}

function num_(v) {
  if (v === null || v === undefined || v === '') return null;
  var f = Number(String(v).replace('%', '').replace(',', '.'));
  if (isNaN(f)) return null;
  return f === Math.floor(f) ? Math.floor(f) : f;
}

function fecha_(v) {
  if (v instanceof Date) {
    var d = v.getDate(), m = v.getMonth() + 1, y = v.getFullYear();
    return (d < 10 ? '0' : '') + d + '/' + (m < 10 ? '0' : '') + m + '/' + y;
  }
  return s_(v);
}

var RE_DRIVE_D   = /\/d\/([a-zA-Z0-9_-]{20,})/;
var RE_DRIVE_ID  = /[?&]id=([a-zA-Z0-9_-]{20,})/;
var RE_DRIVE_RAW = /^([a-zA-Z0-9_-]{25,})$/;

function driveId_(txt) {
  var t = s_(txt);
  if (!t) return '';
  var m = t.match(RE_DRIVE_D) || t.match(RE_DRIVE_ID) || t.match(RE_DRIVE_RAW);
  return m ? m[1] : '';
}

/* URL para MOSTRAR una foto de Drive dentro de la web.
   Antes: lh3.googleusercontent.com/d/ID  -> endpoint no documentado, da
   403 intermitente al llamarlo desde sinergiabiomedica.pe y el panel
   caía al "Sin fotografía".
   Ahora: drive.google.com/thumbnail      -> soportado para incrustar.
   sz=w800 pide la imagen a 800 px de ancho: suficiente para el panel y
   evita descargar el original de ~2 MB.                              */
var FOTO_ANCHO = 800;

function foto_(txt) {
  var t = s_(txt);
  if (!t || t.indexOf('img/') === 0) return t;
  var id = driveId_(t);
  return id ? 'https://drive.google.com/thumbnail?id=' + id + '&sz=w' + FOTO_ANCHO : t;
}

/** Varias fotos separadas por coma, punto y coma o salto de línea. */
function fotos_(txt) {
  return s_(txt).split(/[\n,;]+/)
    .map(function (x) { return foto_(x.trim()); })
    .filter(function (x) { return x; });
}

function pdf_(txt) {
  var id = driveId_(txt);
  if (!id) return { ver: '', descargar: '' };
  return {
    ver: 'https://drive.google.com/file/d/' + id + '/preview',
    descargar: 'https://drive.google.com/uc?export=download&id=' + id
  };
}


function abrirLibro_(id) { return SpreadsheetApp.openById(id); }

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ═════════════════════ venta ═════════════════════
/* Arriba de los encabezados van dos parámetros:
     A1 margen      B1 35          (% que se suma al precio del proveedor)
     A2 actualizado B2 06/10/2026  (fecha de la última revisión, cada lunes)
   Solo se envían a la web las filas con publicar = SI y solo las columnas
   públicas: el precio y el stock del proveedor NO salen de aquí.        */
function hojaVenta_(ss) {
  return ss.getSheetByName('Venta') || ss.getSheets()[0];
}

function lista_(v, sep) {
  return s_(v).split(sep).map(function (x) { return x.trim(); }).filter(String);
}

function venta_() {
  if (!VENTA_ID) return null;
  var sh = hojaVenta_(abrirLibro_(VENTA_ID));
  var vals = sh.getDataRange().getValues();
  var margen = 35, actualizado = '', fh = -1;
  for (var k = 0; k < Math.min(vals.length, LIM_CABECERA); k++) {
    var et = s_(vals[k][0]).toLowerCase();
    if (et === 'margen' && num_(vals[k][1]) !== null) margen = num_(vals[k][1]);
    if (et === 'actualizado') actualizado = fecha_(vals[k][1]);
    if (et === 'id') { fh = k; break; }
  }
  if (fh < 0) return null;
  var heads = vals[fh].map(function (h) { return s_(h); });
  var productos = [];
  for (var i = fh + 1; i < vals.length; i++) {
    var r = {};
    for (var j = 0; j < heads.length; j++) if (heads[j]) r[heads[j]] = vals[i][j];
    if (!s_(r.id) || !s_(r.nombre) || s_(r.publicar).toUpperCase() !== 'SI') continue;

    /* Precio publicado: el de la hoja (la fórmula de la columna) o, si la
       fórmula falta o da error, el del proveedor + margen calculado aquí. */
    var prov = num_(r.precio_proveedor);
    var precio = num_(r.precio_publicado);
    if (precio === null && prov !== null) precio = Math.round(prov * (1 + margen / 100));
    var stock = num_(r.stock_sinergia);
    if (stock === null) stock = num_(r.stock_proveedor);

    var p = {
      id: s_(r.id), cat: s_(r.categoria), nom: s_(r.nombre),
      marca: s_(r.marca), modelo: s_(r.modelo), origen: s_(r.origen),
      resumen: s_(r.resumen),
      caracteristicas: lista_(r.caracteristicas, /[|\n]+/),
      expediente: s_(r.expediente), clave: s_(r.clave),
      areas: lista_(r.areas, /[,;\n]+/)
    };
    if (num_(r.destacado)) p.destacado = num_(r.destacado);
    if (precio) p.precio = precio;
    if (stock !== null) p.stock = stock;
    var fotos = fotos_(r.fotos);
    if (fotos.length) p.fotos = fotos;
    var fp = pdf_(r.ficha_pdf);
    if (fp.ver) p.ficha_pdf = fp.ver;
    productos.push(p);
  }
  return { actualizado: actualizado, productos: productos };
}

/* Ejecuta UNA vez desde el editor (▶) después de crear la hoja:
   nombra la pestaña, pone las fórmulas del precio y del stock, da
   formato a los encabezados y la lista SI/NO en «publicar».          */
function prepararHojaVenta() {
  var sh = hojaVenta_(SpreadsheetApp.openById(VENTA_ID));
  sh.setName('Venta');
  var vals = sh.getDataRange().getValues(), fh = -1;
  for (var k = 0; k < vals.length; k++) if (s_(vals[k][0]).toLowerCase() === 'id') { fh = k + 1; break; }
  if (fh < 0) throw new Error('No encuentro la fila de encabezados (la que empieza con «id»).');
  var heads = vals[fh - 1].map(function (h) { return s_(h); });
  function col(n) { return heads.indexOf(n) + 1; }
  function letra(c) { return String.fromCharCode(64 + c); }
  var ini = fh + 1, n = Math.max(sh.getMaxRows() - fh, 1);
  var cPP = col('precio_proveedor'), cPub = col('precio_publicado');
  var cSP = col('stock_proveedor'), cSS = col('stock_sinergia');
  sh.getRange(ini, cPub, n, 1).clearContent();
  sh.getRange(ini, cSS, n, 1).clearContent();
  var I = letra(cPP), K = letra(cSP);
  sh.getRange(ini, cPub).setFormula('=ARRAYFORMULA(IF(' + I + ini + ':' + I + '="","",ROUND(' + I + ini + ':' + I + '*(1+$B$1/100),0)))');
  sh.getRange(ini, cSS).setFormula('=ARRAYFORMULA(IF(' + K + ini + ':' + K + '="","",' + K + ini + ':' + K + '))');
  sh.getRange(fh, 1, 1, heads.length).setFontWeight('bold').setFontColor('#ffffff').setBackground('#1f2a36').setWrap(true);
  sh.getRange(fh, cPP).setBackground('#b7791f'); sh.getRange(fh, cSP).setBackground('#b7791f');
  sh.getRange(fh, cPub).setBackground('#2f7d4f'); sh.getRange(fh, cSS).setBackground('#2f7d4f');
  sh.getRange(ini, cPP, n, 1).setNumberFormat('#,##0.00');
  sh.getRange(ini, cPub, n, 1).setNumberFormat('#,##0');
  sh.getRange(ini, col('codigo_proveedor'), n, 1).setNumberFormat('000.000');
  sh.getRange('B2').setNumberFormat('dd/mm/yyyy');
  sh.getRange('A1:A2').setFontWeight('bold'); sh.getRange('B1:B2').setBackground('#fce9c8');
  sh.getRange(ini, col('publicar'), n, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['SI', 'NO'], true).build());
  sh.setFrozenRows(fh); sh.setFrozenColumns(5);
  Logger.log('Hoja de venta lista. Productos publicados: %s', venta_().productos.length);
}



function limpiarCache() {
  CacheService.getScriptCache().remove(CACHE_VENTA);
  Logger.log('Caché de venta limpiada.');
}

// ═════════════════════ proveedor ATL (altokelite.com) ═════════════════════
/* El portal solo deja entrar desde Perú y con usuario: la lectura la hace
   el botón en el navegador (js/proveedor-atl.js) y la manda aquí. La clave
   del botón vive en las Propiedades del script (ATL_CLAVE), no en el
   repositorio. Créala con crearBotonProveedor().                          */
function claveAtl_() { return PropertiesService.getScriptProperties().getProperty('ATL_CLAVE') || ''; }

/** Código del proveedor normalizado a 6 dígitos: 90.97 (número), "090.970" → "090970". */
function codAtl_(v) {
  if (typeof v === 'number') v = v.toFixed(3);
  var d = s_(v).replace(/\D/g, '');
  return d ? ('000000' + d).slice(-6) : '';
}

/* Ejecuta UNA vez (▶). Crea la clave y deja en el registro (Ver › Registros)
   el botón listo para copiar en la barra de favoritos del navegador. */
function crearBotonProveedor() {
  var props = PropertiesService.getScriptProperties();
  var k = props.getProperty('ATL_CLAVE');
  if (!k) { k = Utilities.getUuid().replace(/-/g, ''); props.setProperty('ATL_CLAVE', k); }
  var url = ScriptApp.getService().getUrl();
  var boton = "javascript:(function(){window.SB_ATL={k:'" + k + "',u:'" + url + "'};" +
    "var s=document.createElement('script');s.charset='utf-8';s.src='https://sinergiabiomedica.pe/js/proveedor-atl.js?'+Date.now();" +
    "document.body.appendChild(s);})()";
  Logger.log('Copia TODO lo de abajo y pégalo como dirección (URL) de un favorito llamado «Actualizar Sinergia»:\n\n' + boton);
}

/* Códigos de la hoja de venta (para que el botón sepa qué buscar). */
function atlCodigos_() {
  var sh = hojaVenta_(abrirLibro_(VENTA_ID));
  var vals = sh.getDataRange().getValues(), fh = -1;
  for (var k = 0; k < Math.min(vals.length, LIM_CABECERA); k++) if (s_(vals[k][0]).toLowerCase() === 'id') { fh = k; break; }
  var c = vals[fh].map(function (h) { return s_(h); }).indexOf('codigo_proveedor');
  var out = [];
  for (var i = fh + 1; i < vals.length; i++) { var cd = codAtl_(vals[i][c]); if (cd) out.push(cd); }
  return out;
}

/* Escribe en la hoja lo que mandó el botón. items: [{c:"090.970", s:12, p:850.5}] */
function atlActualizar_(datos) {
  var sh = hojaVenta_(SpreadsheetApp.openById(VENTA_ID));
  var vals = sh.getDataRange().getValues(), fh = -1;
  for (var k = 0; k < Math.min(vals.length, LIM_CABECERA); k++) if (s_(vals[k][0]).toLowerCase() === 'id') { fh = k; break; }
  if (fh < 0) throw new Error('hoja de venta sin encabezados');
  var heads = vals[fh].map(function (h) { return s_(h); });
  if (heads.indexOf('precio_proveedor_usd') < 0) {           // columna nueva, al final
    sh.getRange(fh + 1, heads.length + 1).setValue('precio_proveedor_usd');
    heads.push('precio_proveedor_usd');
  }
  var cCod = heads.indexOf('codigo_proveedor'), cPP = heads.indexOf('precio_proveedor'),
      cSP = heads.indexOf('stock_proveedor'), cUSD = heads.indexOf('precio_proveedor_usd');
  var tc = Number(datos.tc) || 0;
  var mapa = {};
  (datos.items || []).forEach(function (it) { var cd = codAtl_(it.c); if (cd) mapa[cd] = it; });

  var n = vals.length - fh - 1, act = 0, sinStock = 0;
  var pp = sh.getRange(fh + 2, cPP + 1, n, 1).getValues();
  var sp = sh.getRange(fh + 2, cSP + 1, n, 1).getValues();
  var usd = sh.getRange(fh + 2, cUSD + 1, n, 1).getValues();
  for (var i = 0; i < n; i++) {
    var cd = codAtl_(vals[fh + 1 + i][cCod]);
    if (!cd) continue;
    var it = mapa[cd];
    if (it) {
      usd[i][0] = Number(it.p) || '';
      if (tc && Number(it.p)) pp[i][0] = Math.round(Number(it.p) * tc * 100) / 100;
      sp[i][0] = Number(it.s) || 0;
      act++;
    } else if (datos.completo) {
      sp[i][0] = 0;                       // no está en el portal: sin stock ahora
      sinStock++;
    }
  }
  sh.getRange(fh + 2, cPP + 1, n, 1).setValues(pp);
  sh.getRange(fh + 2, cSP + 1, n, 1).setValues(sp);
  sh.getRange(fh + 2, cUSD + 1, n, 1).setValues(usd);
  sh.getRange('B2').setValue(new Date());
  if (tc) { sh.getRange('D2').setValue('Tipo de cambio usado: S/ ' + tc); }
  limpiarCache();
  var res = { ok: true, actualizados: act, sin_stock: sinStock, tc: tc, fecha: new Date().toISOString() };
  PropertiesService.getScriptProperties().setProperty('ATL_ULTIMO', JSON.stringify(res));
  return res;
}


// ═════════════════════ web ═════════════════════

function doGet(e) {
  var p = (e && e.parameter) ? e.parameter : {};
  if (p.ping) return json_({ ok: true });

  if (p.atl) {                                   // botón del proveedor
    if (!claveAtl_() || p.k !== claveAtl_()) return json_({ ok: false, motivo: 'clave incorrecta' });
    if (p.atl === 'codigos') return json_({ ok: true, codigos: atlCodigos_() });
    return ContentService.createTextOutput(PropertiesService.getScriptProperties().getProperty('ATL_ULTIMO') || '{"ok":false}')
      .setMimeType(ContentService.MimeType.JSON);
  }

  // catálogo de venta (cacheado 10 minutos)
  var c = CacheService.getScriptCache();
  var t = p.refrescar ? null : c.get(CACHE_VENTA);
  if (!t) {
    var v;
    try { v = venta_() || { productos: [] }; } catch (err) { return json_({ ok: false, motivo: String(err) }); }
    v.ok = true;
    t = JSON.stringify(v);
    try { c.put(CACHE_VENTA, t, CACHE_SEG); } catch (err) {}
  }
  return ContentService.createTextOutput(t).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var datos;
  try { datos = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, motivo: 'datos ilegibles' }); }
  if (!claveAtl_() || datos.k !== claveAtl_()) return json_({ ok: false, motivo: 'clave incorrecta' });
  try { return json_(atlActualizar_(datos)); }
  catch (err) { return json_({ ok: false, motivo: String(err) }); }
}

/** Ejecuta (▶) para revisar sin publicar. */
function probar() {
  var v = venta_();
  Logger.log('Productos publicados: %s · actualizado: %s', v ? v.productos.length : 0, v ? v.actualizado : '-');
}
