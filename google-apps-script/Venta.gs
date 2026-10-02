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
 *     lee los EQUIPOS del portal del proveedor (altokelite.com) y:
 *       · guarda la lista completa en la pestaña «Proveedor»;
 *       · pone precio y stock a cada fila de la hoja de venta: por su
 *         codigo_proveedor y, si no tiene, por marca + modelo (y escribe
 *         el código encontrado);
 *       · deja en la columna «coincidencia» cómo se encontró cada fila;
 *       · al final ofrece copiar a Drive las fotos de todos los equipos
 *         del portal, por código (carpeta «Sinergia - Fotos venta» y
 *         pestaña «Fotos»), de 100 en 100.
 *  3) La web solo muestra equipos con stock (fila «solo con stock» | NO
 *     arriba de los encabezados para mostrar todos).
 *  4) agregarEquiposNuevos (▶, una vez): publica los equipos con stock
 *     preparados en data/venta-nuevos.json.
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
/* Dirección publicada de ESTE proyecto (Implementar › Gestionar implementaciones).
   Hace falta porque, desde el editor, Google devuelve la de pruebas (/dev). */
var URL_PUBLICA = "https://script.google.com/macros/s/AKfycbySXJ34IsPuR98QvLbIpiSh7-N6-PG6xsbFuuDPuNv9eNAFONN3Ndh3I4jYJe9KvHFuDw/exec";
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
     A3 stock %     B3 30          (% del stock del proveedor que se muestra)
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
  var libro = abrirLibro_(VENTA_ID), sh = hojaVenta_(libro);
  var fotoCod = fotosPorCodigo_(libro);
  var vals = sh.getDataRange().getValues();
  var margen = 35, actualizado = '', fh = -1, soloStock = true;
  for (var k = 0; k < Math.min(vals.length, LIM_CABECERA); k++) {
    var et = s_(vals[k][0]).toLowerCase();
    if (et === 'margen' && num_(vals[k][1]) !== null) margen = num_(vals[k][1]);
    if (et === 'solo con stock' && s_(vals[k][1]).toUpperCase() === 'NO') soloStock = false;
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
    /* Sin stock no se muestra (vuelve sola cuando el proveedor repone).
       Para mostrar todo: en las filas de arriba, «solo con stock» | NO. */
    if (soloStock && !(stock > 0)) continue;

    var p = {
      id: s_(r.id), cat: s_(r.categoria), nom: s_(r.nombre),
      marca: s_(r.marca), modelo: s_(r.modelo), origen: s_(r.origen),
      resumen: s_(r.resumen),
      caracteristicas: lista_(r.caracteristicas, /[|\n]+/),
      expediente: s_(r.expediente), clave: s_(r.clave),
      areas: lista_(r.areas, /[,;\n]+/)
    };
    if (num_(r.destacado)) p.destacado = num_(r.destacado);
    if (num_(r.ranking)) p.ranking = num_(r.ranking);      // puesto del tipo en el estudio de compras públicas
    if (precio) p.precio = precio;
    if (stock !== null) p.stock = stock;
    var fotos = fotos_(r.fotos);
    var fc = fotoCod[codAtl_(r.codigo_proveedor)];
    if (!fotos.length && fc) { fotos = [foto_(fc)]; p.fotoProv = 1; }   // foto del proveedor (pestaña «Fotos»)
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
  /* Stock mostrado = % del stock del proveedor (B3), redondeado hacia abajo;
     mínimo 1 si el proveedor tiene, 0 si no tiene. */
  if (s_(sh.getRange('A3').getValue()) === '') {
    sh.getRange('A3:C3').setValues([['stock %', 30, '← % del stock del proveedor que se muestra en la web']]);
  }
  var KK = K + ini + ':' + K, Kp = KK + '*$B$3/100';
  sh.getRange(ini, cSS).setFormula('=ARRAYFORMULA(IF(' + KK + '="","",IF(' + KK + '<=0,0,IF(' + Kp + '<1,1,ROUNDDOWN(' + Kp + ',0)))))');
  sh.getRange(fh, 1, 1, heads.length).setFontWeight('bold').setFontColor('#ffffff').setBackground('#1f2a36').setWrap(true);
  sh.getRange(fh, cPP).setBackground('#b7791f'); sh.getRange(fh, cSP).setBackground('#b7791f');
  sh.getRange(fh, cPub).setBackground('#2f7d4f'); sh.getRange(fh, cSS).setBackground('#2f7d4f');
  sh.getRange(ini, cPP, n, 1).setNumberFormat('#,##0.00');
  sh.getRange(ini, cPub, n, 1).setNumberFormat('#,##0');
  sh.getRange(ini, col('codigo_proveedor'), n, 1).setNumberFormat('000.000');
  sh.getRange('B2').setNumberFormat('dd/mm/yyyy');
  sh.getRange('A1:A3').setFontWeight('bold'); sh.getRange('B1:B3').setBackground('#fce9c8');
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
  /* Desde el editor, getUrl() devuelve la dirección de PRUEBAS (/dev), que
     no sirve fuera de tu sesión. El botón necesita la publicada (/exec). */
  var url = URL_PUBLICA || String(ScriptApp.getService().getUrl() || '');
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
/* ── Match por marca + modelo ──────────────────────────────────────
   Para filas sin código de proveedor: se busca en la lista del portal un
   equipo cuya descripción tenga el modelo (iM20, SE-1200 Express…) y la
   marca, descartando accesorios y repuestos («Batería p. monitor iM20»).
   Si hay varias versiones, gana la que más se parece al nombre y luego la
   más barata (versión base). */
var ACCESORIO_ = /^(bateria|cable|bandeja|filtro|sensor|brazalete|kit|soporte|base|adaptador|transductor|panel|repuesto|altavoz|estuche|cargador|clamp|electrobomba|helice|interruptor|anillo|boton|calibrador|control|papel|sonda|manguera|tubo|valvula|tarjeta|placa|modulo|fusible|empaque|jarra|frasco|tapa|rueda|pedal|funda|cubierta|electrodo|parche|pinza|cubeta|reactivo|accesorio|juego de|set de|impresora|cabezal|carcasa|adhesivo|canastilla|pantalla|turbina|capucha|diafragma|amortiguador|fuente|camara|software|licencia|tornillo|motor|teclado|mando|membrana|paleta|sticker|lamina|protector|etiqueta|manual)/;
var EQUIPO_ = /^(monitor|electrocardiografo|desfibrilador|incubadora|cuna|servocuna|bomba|ventilador|aspirador|autoclave|esterilizador|lampara qx|lampara quirurgica|mesa|maquina|ecografo|analizador|centrifuga|microscopio|balanza|cama|camilla|refrigeradora|congelador|cabina|espectrofotometro|tensiometro|estetoscopio|detector|pulsioximetro|electrobisturi|coche de paro|equipo|esterilizadora|lampara|nebulizador|oximetro|termometro|otoscopio|oftalmoscopio|laringoscopio|negatoscopio|doppler|holter|sistema|unidad|cardiotocografo|fotometro|agitador|baño|estufa|horno|destilador|campana)/;
var STOP_ = { de: 1, del: 1, la: 1, el: 1, con: 1, para: 1, y: 1, en: 1, a: 1, por: 1, x: 1 };

function nrm_(t) { return s_(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
function patModelo_(modelo) {
  var m = nrm_(modelo).replace(/\b(serie|series|modelo|mod)\b/g, ' ').replace(/\s+/g, '');
  if (m.length < 2) return null;
  return new RegExp('(^|[^a-z0-9])' + m.split('').join('[ ]?') + '($|[^a-z0-9])');
}
function tieneMarca_(marca, dn) {
  var mc = nrm_(marca).replace(/ /g, ''), dd = ' ' + dn + ' ';
  if (mc.length >= 3 && dn.replace(/ /g, '').indexOf(mc) >= 0) return true;
  return nrm_(marca).split(' ').some(function (w) { return w.length >= 4 && dd.indexOf(' ' + w + ' ') >= 0; });
}
function esAccesorio_(dn) {
  if (ACCESORIO_.test(dn)) return true;
  return / (p|para)( |$)/.test(dn) && !EQUIPO_.test(dn);     // «… p. monitor iM20», «… para desfibrilador»
}
function afinidad_(nombre, dn) {
  var dd = ' ' + dn + ' ', n = 0;
  nrm_(nombre).split(' ').forEach(function (t) { if (t.length > 2 && !STOP_[t] && dd.indexOf(' ' + t.slice(0, 6)) >= 0) n++; });
  return n;
}
function matchModelo_(marca, modelo, nombre, lista) {
  var re = patModelo_(modelo); if (!re) return null;
  var cand = lista.filter(function (x) { return re.test(x.dn) && !esAccesorio_(x.dn); });
  var conMarca = cand.filter(function (x) { return tieneMarca_(marca, x.dn); });
  if (conMarca.length) cand = conMarca;
  else if (nrm_(modelo).replace(/ /g, '').length < 5) return null;   // modelo corto y sin marca: dudoso
  if (!cand.length) return null;
  cand.forEach(function (x) { x.af = afinidad_(nombre, x.dn); });
  cand = cand.filter(function (x) { return x.af > 0 || EQUIPO_.test(x.dn); });   // tiene que parecer el equipo
  if (!cand.length) return null;
  cand.sort(function (a, b) { return (b.af - a.af) || ((Number(a.p) || 1e12) - (Number(b.p) || 1e12)); });
  return { it: cand[0], n: cand.length };
}

/* Pestaña «Proveedor»: la lista completa leída del portal en la última
   actualización (se reemplaza cada vez). */
function hojaProveedor_(ss, lista, tc) {
  var sh = ss.getSheetByName('Proveedor') || ss.insertSheet('Proveedor');
  sh.clear();
  var filas = [['codigo', 'descripcion', 'modelo_proveedor', 'stock', 'precio_usd', 'precio_soles', 'imagen']];
  lista.slice().sort(function (a, b) { return a.dn < b.dn ? -1 : 1; }).forEach(function (x) {
    filas.push(["'" + x.c, x.d || '', x.mo || '', Number(x.s) || 0, Number(x.p) || '',
      tc && Number(x.p) ? Math.round(Number(x.p) * tc * 100) / 100 : '', x.img || '']);
  });
  sh.getRange(1, 1, filas.length, filas[0].length).setValues(filas);
  sh.getRange(1, 1, 1, filas[0].length).setFontWeight('bold').setFontColor('#ffffff').setBackground('#1f2a36');
  sh.setFrozenRows(1);
  sh.getRange(2, 6, Math.max(filas.length - 1, 1), 1).setNumberFormat('#,##0.00');
  sh.setColumnWidth(2, 520);
}

function atlActualizar_(datos) {
  var ss = SpreadsheetApp.openById(VENTA_ID), sh = hojaVenta_(ss);
  var vals = sh.getDataRange().getValues(), fh = -1;
  for (var k = 0; k < Math.min(vals.length, LIM_CABECERA); k++) if (s_(vals[k][0]).toLowerCase() === 'id') { fh = k; break; }
  if (fh < 0) throw new Error('hoja de venta sin encabezados');
  var heads = vals[fh].map(function (h) { return s_(h); });
  ['precio_proveedor_usd', 'coincidencia'].forEach(function (c) {      // columnas nuevas, al final
    if (heads.indexOf(c) < 0) { sh.getRange(fh + 1, heads.length + 1).setValue(c); heads.push(c); }
  });
  var col = function (n) { return heads.indexOf(n); };
  var cCod = col('codigo_proveedor'), cPP = col('precio_proveedor'), cSP = col('stock_proveedor'),
      cUSD = col('precio_proveedor_usd'), cCoi = col('coincidencia');
  var tc = Number(datos.tc) || 0;
  var lista = (datos.items || []).map(function (x) { x.dn = nrm_((x.d || '') + ' ' + (x.mo || '')); return x; });
  var mapa = {};
  lista.forEach(function (it) { var cd = codAtl_(it.c); if (cd) mapa[cd] = it; });
  if (datos.todos && lista.length) hojaProveedor_(ss, lista, tc);

  var n = vals.length - fh - 1, act = 0, porModelo = 0, sinStock = 0, pubSin = 0;
  var rango = function (c) { return sh.getRange(fh + 2, c + 1, n, 1); };
  var cod = rango(cCod).getValues(), pp = rango(cPP).getValues(), sp = rango(cSP).getValues(),
      usd = rango(cUSD).getValues(), coi = rango(cCoi).getValues();
  for (var i = 0; i < n; i++) {
    var fila = vals[fh + 1 + i];
    if (!s_(fila[0])) continue;
    var pub = s_(fila[col('publicar')]).toUpperCase() === 'SI';
    var cd = codAtl_(cod[i][0]), it = cd ? mapa[cd] : null, via = 'código';
    if (!it && !cd && datos.todos) {                         // sin código: marca + modelo
      var m = matchModelo_(fila[col('marca')], fila[col('modelo')], fila[col('nombre')], lista);
      if (m) { it = m.it; via = 'marca+modelo' + (m.n > 1 ? ' (de ' + m.n + ' versiones)' : ''); cod[i][0] = "'" + it.c; porModelo++; }
    }
    if (it) {
      usd[i][0] = Number(it.p) || '';
      if (tc && Number(it.p)) pp[i][0] = Math.round(Number(it.p) * tc * 100) / 100;
      sp[i][0] = Number(it.s) || 0;
      coi[i][0] = via + ': ' + s_(it.d).slice(0, 120);
      act++;
    } else {
      if (datos.completo && cd) { sp[i][0] = 0; sinStock++; }
      if (datos.todos) {
        var alt = cd ? matchModelo_(fila[col('marca')], fila[col('modelo')], fila[col('nombre')], lista) : null;
        coi[i][0] = cd ? 'no aparece hoy en el portal (¿sin stock?)' +
            (alt && codAtl_(alt.it.c) !== cd ? ' · parecido en stock: ' + alt.it.c + ' ' + s_(alt.it.d).slice(0, 80) : '')
          : 'sin código; no se encontró por marca y modelo';
      }
      if (pub) pubSin++;
    }
  }
  rango(cCod).setValues(cod); rango(cPP).setValues(pp); rango(cSP).setValues(sp);
  rango(cUSD).setValues(usd); rango(cCoi).setValues(coi);
  sh.getRange('B2').setValue(new Date());
  if (tc) { sh.getRange('D2').setValue('Tipo de cambio usado: S/ ' + tc); }
  limpiarCache();
  var res = { ok: true, id: datos.id || '', actualizados: act, por_modelo: porModelo, sin_stock: sinStock,
    pub_sin: pubSin, proveedor: lista.length, tc: tc, fecha: new Date().toISOString() };
  PropertiesService.getScriptProperties().setProperty('ATL_ULTIMO', JSON.stringify(res));
  return res;
}


/* ── Agregar equipos con stock (dos pasos) ─────────────────────────
   La lista está en el sitio (data/venta-nuevos.json), elegida según el
   estudio de compras públicas 2024-2025: primero los tipos del ranking
   con stock en el proveedor, luego complementarios.
   1.ª vez que ejecutas agregarEquiposNuevos (▶): crea la pestaña
      «Para revisar» con la lista (puesto en el estudio, precio, stock) y
      se detiene. Ahí cambias a NO lo que no quieras publicar.
   2.ª vez: publica solo los SI. Si ya hay una fila con ese código la
      activa y le pone los textos limpios; si no, agrega una fila nueva.
      Además pone «ranking» (puesto del tipo en el estudio) a todas las
      filas, renueva los «más pedidos» (destacado) y copia precio y stock
      desde la pestaña «Proveedor». */
var URL_NUEVOS = 'https://sinergiabiomedica.pe/data/venta-nuevos.json';

function agregarEquiposNuevos() {
  var datos = JSON.parse(UrlFetchApp.fetch(URL_NUEVOS + '?t=' + Date.now()).getContentText());
  var lista = datos.equipos || [];
  var ss = SpreadsheetApp.openById(VENTA_ID);
  var rev = ss.getSheetByName('Para revisar');
  if (!rev) { crearRevision_(ss, lista); return; }

  var ok = {};                                            // códigos aprobados (SI)
  rev.getDataRange().getValues().forEach(function (r) {
    if (s_(r[0]).toUpperCase() === 'SI' && codAtl_(r[10])) ok[codAtl_(r[10])] = 1;
  });
  var sh = hojaVenta_(ss);
  var vals = sh.getDataRange().getValues(), fh = -1;
  for (var k = 0; k < Math.min(vals.length, LIM_CABECERA); k++) if (s_(vals[k][0]).toLowerCase() === 'id') { fh = k; break; }
  if (fh < 0) throw new Error('hoja de venta sin encabezados');
  var heads = vals[fh].map(function (h) { return s_(h); });
  if (heads.indexOf('ranking') < 0) {                    // columna nueva, al final
    sh.getRange(fh + 1, heads.length + 1).setValue('ranking'); heads.push('ranking');
    vals = sh.getDataRange().getValues();
  }
  var col = function (n) { return heads.indexOf(n); };
  var porCod = {}, porId = {};
  for (var i = fh + 1; i < vals.length; i++) {
    if (!s_(vals[i][0])) continue;
    porId[s_(vals[i][0])] = i;
    var cd = codAtl_(vals[i][col('codigo_proveedor')]);
    if (cd && porCod[cd] === undefined) porCod[cd] = i;
  }
  var CAMPOS = ['categoria', 'nombre', 'marca', 'modelo', 'origen', 'resumen', 'caracteristicas', 'areas'];
  /* Se escribe columna por columna y nunca en precio_publicado ni
     stock_sinergia: son fórmulas ARRAYFORMULA y un valor encima las rompe. */
  var ESCRIBIR = ['id', 'publicar', 'codigo_proveedor', 'destacado', 'ranking'].concat(CAMPOS);
  var nFil = vals.length - fh - 1;
  var colVals = {};
  ESCRIBIR.forEach(function (c) { if (col(c) >= 0) colVals[c] = vals.slice(fh + 1).map(function (r) { return [r[col(c)]]; }); });
  var nuevos = [], act = 0, cods = 0;
  lista.forEach(function (e) {
    var cd = codAtl_(e.codigo);
    if (e.fila) {                                         // solo poner el código
      var f = porId[e.fila];
      if (f !== undefined && !codAtl_(vals[f][col('codigo_proveedor')])) { colVals.codigo_proveedor[f - fh - 1][0] = "'" + e.codigo; cods++; }
      return;
    }
    if (!ok[cd]) return;                                  // no aprobado en «Para revisar»
    if (porCod[cd] !== undefined) {                       // fila existente: publicar y limpiar
      var j = porCod[cd] - fh - 1;
      colVals.publicar[j][0] = 'SI';
      CAMPOS.forEach(function (c) { if (colVals[c] && e[c]) colVals[c][j][0] = e[c]; });
      act++;
    } else {
      var nf = {}; nf.id = e.id; nf.publicar = 'SI'; nf.codigo_proveedor = "'" + e.codigo;
      CAMPOS.forEach(function (c) { nf[c] = e[c] || ''; });
      nuevos.push(nf);
    }
  });
  /* Filas nuevas: debajo de la última fila con id. */
  var ultima = fh;
  for (var u = fh + 1; u < vals.length; u++) if (s_(vals[u][0])) ultima = u;
  var j0 = ultima - fh, total = Math.max(nFil, j0 + nuevos.length);
  ESCRIBIR.forEach(function (c) {
    if (!colVals[c]) return;
    while (colVals[c].length < total) colVals[c].push(['']);
    nuevos.forEach(function (nf, q) { colVals[c][j0 + q][0] = nf[c] || ''; });
  });
  /* Ranking del estudio y «más pedidos», por código, en todas las filas. */
  var rk = datos.ranking || {}, dest = datos.destacados || {}, rkCod = {}, dCod = {};
  Object.keys(rk).forEach(function (c) { rkCod[codAtl_(c)] = rk[c]; });
  Object.keys(dest).forEach(function (c) { dCod[codAtl_(c)] = dest[c]; });
  for (var q = 0; q < total; q++) {
    var cq = codAtl_(colVals.codigo_proveedor[q][0]);
    if (colVals.ranking) colVals.ranking[q][0] = rkCod[cq] || '';
    if (colVals.destacado) colVals.destacado[q][0] = dCod[cq] || '';
  }
  ESCRIBIR.forEach(function (c) { if (colVals[c]) sh.getRange(fh + 2, col(c) + 1, total, 1).setValues(colVals[c]); });
  var res = precioDesdeProveedor_();
  rev.setName('Para revisar (aplicado ' + Utilities.formatDate(new Date(), 'America/Lima', 'dd/MM') + ')');
  Logger.log('Listo. Publicados (filas que ya estaban): %s · filas nuevas: %s · códigos puestos: %s · filas con precio: %s',
    act, nuevos.length, cods, res);
}

/* Pestaña «Para revisar»: la lista con su puesto en el estudio, stock y
   precio aproximado en la web, para aprobar (SI/NO) antes de publicar. */
function crearRevision_(ss, lista) {
  var pv = ss.getSheetByName('Proveedor'), prov = {};
  if (pv) pv.getDataRange().getValues().slice(1).forEach(function (r) { prov[codAtl_(r[0])] = r; });
  var sh = hojaVenta_(ss), margen = 35;
  sh.getRange(1, 1, 3, 2).getValues().forEach(function (r) { if (s_(r[0]).toLowerCase() === 'margen' && num_(r[1]) !== null) margen = num_(r[1]); });
  var rev = ss.insertSheet('Para revisar');
  var filas = [['publicar', 'puesto en el estudio', 'tipo de equipo (estudio)', 'nombre en la web', 'marca', 'modelo', 'categoría',
    'stock proveedor', 'precio proveedor US$', 'precio web aprox. S/', 'codigo']];
  lista.forEach(function (e) {
    if (e.fila) return;
    var p = prov[codAtl_(e.codigo)] || [];
    filas.push(['SI', e.puesto || '', e.tipo || '', e.nombre, e.marca, e.modelo, e.categoria,
      Number(p[3]) || '', Number(p[4]) || '', Number(p[5]) ? Math.round(Number(p[5]) * (1 + margen / 100)) : '', "'" + e.codigo]);
  });
  rev.getRange(1, 1, filas.length, filas[0].length).setValues(filas);
  rev.getRange(1, 1, 1, filas[0].length).setFontWeight('bold').setFontColor('#ffffff').setBackground('#1f2a36').setWrap(true);
  rev.getRange(2, 1, filas.length - 1, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['SI', 'NO'], true).build())
    .setBackground('#fce9c8').setFontWeight('bold');
  rev.getRange(2, 10, filas.length - 1, 1).setNumberFormat('#,##0');
  rev.setFrozenRows(1); rev.setColumnWidth(4, 340); rev.setColumnWidth(3, 220);
  ss.setActiveSheet(rev);
  Logger.log('Creé la pestaña «Para revisar» con %s equipos. Cambia a NO los que no quieras y vuelve a ejecutar agregarEquiposNuevos.', filas.length - 1);
}

/* Copia precio y stock de la pestaña «Proveedor» a la hoja de venta, por
   código (sin volver a consultar el portal). Devuelve cuántas filas. */
function precioDesdeProveedor_() {
  var ss = SpreadsheetApp.openById(VENTA_ID), pv = ss.getSheetByName('Proveedor');
  if (!pv) return 0;
  var pvals = pv.getDataRange().getValues().slice(1);
  var items = pvals.map(function (r) { return { c: s_(r[0]).replace(/^'/, ''), d: r[1], mo: r[2], s: r[3], p: r[4], img: r[6] }; });
  var tc = 0;
  pvals.some(function (r) { if (Number(r[4]) && Number(r[5])) { tc = Number(r[5]) / Number(r[4]); return true; } });
  return atlActualizar_({ items: items, tc: Math.round(tc * 1000) / 1000, todos: false, id: 'manual' }).actualizados;
}

/* ── Fotos del proveedor → Drive (una vez por código) ──────────────
   Se guardan las fotos de TODOS los equipos del portal (con y sin stock),
   así un equipo ya tiene foto el día que se publica o vuelve el stock.
   El botón pide la lista (atl=fotos), baja cada foto en el navegador (el
   portal solo abre desde Perú) y la manda aquí: va a la carpeta
   «Sinergia - Fotos venta» con el código como nombre y se anota en la
   pestaña «Fotos» (codigo | enlace | fecha). La web usa esa foto cuando
   la fila no tiene una propia en «fotos» ni en el sitio (img/venta/). */
function carpetaFotos_() {
  var pr = PropertiesService.getScriptProperties(), id = pr.getProperty('FOTOS_CARPETA');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var dest = DriveApp.getFileById(VENTA_ID).getParents();
  var base = dest.hasNext() ? dest.next() : DriveApp.getRootFolder();
  var f = base.createFolder('Sinergia - Fotos venta');
  pr.setProperty('FOTOS_CARPETA', f.getId());
  return f;
}

function hojaFotos_(ss) {
  var sh = ss.getSheetByName('Fotos');
  if (!sh) {
    sh = ss.insertSheet('Fotos');
    sh.getRange(1, 1, 1, 3).setValues([['codigo', 'enlace', 'fecha']]).setFontWeight('bold').setFontColor('#ffffff').setBackground('#1f2a36');
    sh.setFrozenRows(1);
  }
  return sh;
}

/* codigo (6 dígitos) → enlace de Drive de su foto. */
function fotosPorCodigo_(ss) {
  var sh = ss.getSheetByName('Fotos'), m = {};
  if (sh) sh.getDataRange().getValues().slice(1).forEach(function (r) { var c = codAtl_(r[0]); if (c && s_(r[1])) m[c] = s_(r[1]); });
  return m;
}

function atlFotosPendientes_() {
  var ss = SpreadsheetApp.openById(VENTA_ID), sh = hojaVenta_(ss), pv = ss.getSheetByName('Proveedor');
  if (!pv) return [];
  var hechas = fotosPorCodigo_(ss);
  var conFotoSitio = {};
  try {
    (JSON.parse(UrlFetchApp.fetch('https://sinergiabiomedica.pe/data/venta.json').getContentText()).productos || [])
      .forEach(function (p) { if (p.fotos && p.fotos.length) conFotoSitio[p.id] = 1; });
  } catch (e) {}
  /* Prioridad: 1 publicados, 2 con stock, 3 el resto. Se saltan los que ya
     tienen foto propia (columna fotos o img/venta/ del sitio). */
  var vals = sh.getDataRange().getValues(), fh = -1, prio = {}, propia = {};
  for (var k = 0; k < Math.min(vals.length, LIM_CABECERA); k++) if (s_(vals[k][0]).toLowerCase() === 'id') { fh = k; break; }
  var heads = vals[fh].map(function (h) { return s_(h); }), col = function (n) { return heads.indexOf(n); };
  for (var i = fh + 1; i < vals.length; i++) {
    var cd = codAtl_(vals[i][col('codigo_proveedor')]); if (!cd) continue;
    if (s_(vals[i][col('fotos')]) || conFotoSitio[s_(vals[i][0])]) propia[cd] = 1;
    if (s_(vals[i][col('publicar')]).toUpperCase() === 'SI') prio[cd] = 1;
  }
  var out = [];
  pv.getDataRange().getValues().slice(1).forEach(function (r) {
    var cd = codAtl_(r[0]), img = s_(r[6]);
    if (!cd || !img || hechas[cd] || propia[cd]) return;
    out.push({ c: cd, img: img, p: prio[cd] || (Number(r[3]) > 0 ? 2 : 3) });
  });
  out.sort(function (a, b) { return a.p - b.p; });
  return out;
}

function atlGuardarFoto_(f) {
  var cd = codAtl_(f.c);
  if (!cd) return { ok: false, motivo: 'sin código' };
  var ss = SpreadsheetApp.openById(VENTA_ID);
  if (fotosPorCodigo_(ss)[cd]) return { ok: true, repetida: true };
  var ext = /png/.test(f.mime) ? 'png' : /webp/.test(f.mime) ? 'webp' : 'jpg';
  var nombre = cd.slice(0, 3) + '.' + cd.slice(3) + '.' + ext;
  var file = carpetaFotos_().createFile(Utilities.newBlob(Utilities.base64Decode(f.b64), f.mime || 'image/png', nombre));
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  hojaFotos_(ss).appendRow(["'" + cd.slice(0, 3) + '.' + cd.slice(3), 'https://drive.google.com/file/d/' + file.getId() + '/view', new Date()]);
  limpiarCache();
  return { ok: true };
}


// ═════════════════════ web ═════════════════════

function doGet(e) {
  var p = (e && e.parameter) ? e.parameter : {};
  if (p.ping) return json_({ ok: true });

  if (p.atl) {                                   // botón del proveedor
    if (!claveAtl_() || p.k !== claveAtl_()) return json_({ ok: false, motivo: 'clave incorrecta' });
    if (p.atl === 'codigos') return json_({ ok: true, codigos: atlCodigos_() });
    if (p.atl === 'fotos') return json_({ ok: true, fotos: atlFotosPendientes_() });
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
  if (datos.foto) {
    try { return json_(atlGuardarFoto_(datos.foto)); } catch (err) { return json_({ ok: false, motivo: String(err) }); }
  }
  try { return json_(atlActualizar_(datos)); }
  catch (err) {
    var res = { ok: false, id: datos.id || '', motivo: String(err) };
    PropertiesService.getScriptProperties().setProperty('ATL_ULTIMO', JSON.stringify(res));
    return json_(res);
  }
}

/** Ejecuta (▶) para revisar sin publicar. */
function probar() {
  var v = venta_();
  Logger.log('Productos publicados: %s · actualizado: %s', v ? v.productos.length : 0, v ? v.actualizado : '-');
}
