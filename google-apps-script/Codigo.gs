/**
 * Sinergia Biomédica — Apps Script
 *
 * DOS RESPUESTAS DISTINTAS SEGÚN QUIÉN PREGUNTE:
 *
 *  A) Sin parámetros  ->  datos PÚBLICOS
 *     Catálogo, paquetes y, de cada proyecto, solo agregados
 *     (% de avance, avance por área). Nada de series ni informes.
 *
 *  B) ?proyecto=ID&clave=LACLAVE  ->  DETALLE PRIVADO
 *     Solo si la clave es correcta devuelve la lista de equipos del
 *     cliente con su estado y el enlace a cada informe.
 *     Si la clave es incorrecta, responde {ok:false} y NO envía nada.
 *
 * Esto es una cerradura de verdad: el detalle no sale de Google
 * mientras no se envíe la clave correcta.
 *
 * INSTALACIÓN
 *  1) Extensiones > Apps Script > pega esto > Guardar.
 *  2) Llena CATALOGO_ID y PROYECTOS.
 *  3) Ejecuta `probar` (▶) para verificar.
 *  4) Implementar > Nueva implementación > Aplicación web
 *       Ejecutar como: Yo  ·  Acceso: Cualquier persona
 *  5) Pega la URL /exec en js/00-config.js -> CONFIG.DATA_URL
 *
 * Al cambiar el código: Implementar > Gestionar implementaciones >
 * (lápiz) > Versión: Nueva versión. La URL no cambia.
 */

// ═════════════════════ CONFIGURACIÓN ═════════════════════

var CATALOGO_ID = "PEGA_AQUI_EL_ID";   // hoja con las pestañas Equipos y Paquetes

var PROYECTOS = [
  {
    id: "limatambo-2026",
    sheetId: "1eoRDmBHflCvtpOVFt7nubsal_MXRb5n2bkgqPd3QU30",
    cliente: "Clínica Limatambo Cajamarca",
    titulo: "Mantenimiento preventivo de equipos biomédicos",
    servicio: "Contrato COT-SB-0726-01",
    fecha: "2026",
    foto: "",
    clave: "CAMBIA_ESTA_CLAVE",   // la que entregas al cliente
    desc: "Programa anual de mantenimiento preventivo sobre 90 equipos biomédicos " +
          "en 15 áreas, con informe individual por intervención y trazabilidad por equipo.",
    hojaResumen: "RESUMEN",
    hojaPreventivos: "PREVENTIVOS",
    hojaControl: "CONTROL SEGUN COTIZACION",  // pestaña del listado de equipos
    porArea: true
  }
];

var MODELO = {
  igv: 0.18, alquiler_pct: 0.30, horas_efectivas: 7,
  descuento_hora: 0.10, descuento_dia: 0.45,
  instrumentista_dia: 120, instrumentista_min: 60,
  mult_semana: 4, mult_mes: 12, kit_dia: 40,
  descuento_combinar: { "2": 0.10, "3": 0.12, "4": 0.15 }
};

// ═════════════════════ utilidades ═════════════════════

function s_(v) { return v === null || v === undefined ? '' : String(v).trim(); }

function num_(v) {
  if (v === null || v === undefined || v === '') return null;
  var f = Number(String(v).replace('%', '').replace(',', '.'));
  if (isNaN(f)) return null;
  return f === Math.floor(f) ? Math.floor(f) : f;
}

/* Formato de fecha SIN llamar a la API de Google.

   ANTES esto usaba Utilities.formatDate, que es una llamada al servicio
   de Apps Script. Con 107 intervenciones y dos fechas cada una, eran más
   de 200 llamadas por cada vez que un cliente abría su proyecto: una de
   las causas principales de la demora.

   Los objetos Date que devuelve Sheets ya vienen en la zona horaria del
   proyecto, así que getDate()/getMonth() dan el mismo resultado.
   REQUISITO: la zona horaria del proyecto debe ser America/Lima
   (Configuración del proyecto > Zona horaria).                        */
function fecha_(v) {
  if (v instanceof Date) {
    var d = v.getDate(), m = v.getMonth() + 1, y = v.getFullYear();
    return (d < 10 ? '0' : '') + d + '/' + (m < 10 ? '0' : '') + m + '/' + y;
  }
  return s_(v);
}

/* Expresiones regulares creadas UNA vez, no en cada una de las cientos
   de llamadas que hace la lectura de informes. */
var RE_DRIVE_D   = /\/d\/([a-zA-Z0-9_-]{20,})/;
var RE_DRIVE_ID  = /[?&]id=([a-zA-Z0-9_-]{20,})/;
var RE_DRIVE_RAW = /^([a-zA-Z0-9_-]{25,})$/;

function driveId_(txt) {
  var t = s_(txt);
  if (!t) return '';
  var m = t.match(RE_DRIVE_D) || t.match(RE_DRIVE_ID) || t.match(RE_DRIVE_RAW);
  return m ? m[1] : '';
}

function foto_(txt) {
  var t = s_(txt);
  if (!t || t.indexOf('img/') === 0) return t;
  var id = driveId_(t);
  return id ? 'https://lh3.googleusercontent.com/d/' + id : t;
}

function pdf_(txt) {
  var id = driveId_(txt);
  if (!id) return { ver: '', descargar: '' };
  return {
    ver: 'https://drive.google.com/file/d/' + id + '/preview',
    descargar: 'https://drive.google.com/uc?export=download&id=' + id
  };
}

function sha256_(txt) {
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, txt, Utilities.Charset.UTF_8);
  return raw.map(function (b) {
    var v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

/** Encuentra la fila de encabezados en cualquier parte de la hoja.

    ANTES recorría la hoja ENTERA buscando los encabezados, poniendo cada
    celda en mayúsculas por el camino. En una hoja de cientos de filas eso
    es trabajo desperdiciado: los encabezados siempre están arriba. Ahora
    solo mira las primeras 40 filas.

    Además, la lectura de cada hoja se guarda en memoria: `detalle_` pedía
    la misma hoja de PREVENTIVOS dos veces (una para el resumen y otra
    para las intervenciones) y cada lectura era un viaje al servidor. */
var LIM_CABECERA = 40;
var _hojasLeidas = {};

function valores_(ss, nombreHoja) {
  var llave = ss.getId() + '::' + nombreHoja;
  if (_hojasLeidas[llave]) return _hojasLeidas[llave];
  var sh = ss.getSheetByName(nombreHoja);
  var vals = sh ? sh.getDataRange().getValues() : [];
  _hojasLeidas[llave] = vals;
  return vals;
}

function filas_(ss, nombreHoja) {
  var vals = valores_(ss, nombreHoja);
  if (vals.length < 2) return [];
  var heads = vals[0].map(function (h) { return s_(h); });
  var out = [];
  for (var i = 1; i < vals.length; i++) {
    if (s_(vals[i][0]) === '') continue;
    var r = {};
    for (var j = 0; j < heads.length; j++) if (heads[j]) r[heads[j]] = vals[i][j];
    out.push(r);
  }
  return out;
}

function tabla_(ss, nombreHoja, columnasClave) {
  var vals = valores_(ss, nombreHoja);
  if (!vals.length) return [];
  var tope = Math.min(vals.length, LIM_CABECERA);
  var fh = -1, heads = null;
  for (var i = 0; i < tope && fh < 0; i++) {
    var fila = vals[i].map(function (c) { return s_(c).toUpperCase(); });
    if (columnasClave.every(function (k) { return fila.indexOf(k) >= 0; })) {
      fh = i; heads = fila;
    }
  }
  if (fh < 0) return [];
  var out = [];
  for (var r = fh + 1; r < vals.length; r++) {
    if (s_(vals[r][0]) === '') continue;
    var o = {};
    for (var j = 0; j < heads.length; j++) if (heads[j]) o[heads[j]] = vals[r][j];
    out.push(o);
  }
  return out;
}

// ═════════════════════ catálogo ═════════════════════

function equipos_(ss) {
  return filas_(ss, 'Equipos').map(function (r) {
    var e = { id: s_(r.id), cat: s_(r.categoria), g: s_(r.grupo), scr: s_(r.icono), code: s_(r.codigo) };
    var f = foto_(r.foto);
    if (f) e.photo = f;
    e.nom = s_(r.nombre); e.marca = s_(r.marca); e.tier = s_(r.tier);
    if (s_(r.apoyo).toUpperCase() === 'SI') {
      e.apoyo = true;
    } else {
      e.dia = num_(r.precio_dia);
      e.sem = num_(r.precio_semana) || (e.dia ? e.dia * MODELO.mult_semana : null);
      e.mes = num_(r.precio_mes) || (e.dia ? e.dia * MODELO.mult_mes : null);
    }
    var fp = pdf_(r.ficha_pdf);
    e.ficha = fp.ver; e.ficha_dl = fp.descargar;
    e.desc = s_(r.descripcion);
    try { e.specs = JSON.parse(s_(r.specs_json) || '{}'); } catch (err) { e.specs = {}; }
    return e;
  });
}

function paquetes_(ss) {
  return filas_(ss, 'Paquetes').map(function (r) {
    function ids(v) { return s_(v).split(',').map(function (x) { return x.trim(); }).filter(String); }
    return {
      id: s_(r.id), app: s_(r.app), nivel: s_(r.nivel), nom: s_(r.nombre),
      items: ids(r.incluye_ids), kit: ids(r.kit_apoyo),
      pe: num_(r.por_equipo), ph: num_(r.por_hora), dia: num_(r.por_dia),
      psem: num_(r.por_semana), pmes: num_(r.por_mes),
      eqh: num_(r.equipos_hora), eqd: num_(r.equipos_dia),
      desc: s_(r.descripcion)
    };
  });
}

// ═════════════════════ proyectos: parte PÚBLICA ═════════════════════

function resumen_(ss, cfg) {
  var filas = tabla_(ss, cfg.hojaResumen, ['AREA', 'INTERVENCIONES', 'EJECUTADAS']);
  var areas = [], total = 0, hechas = 0;
  filas.forEach(function (r) {
    var area = s_(r['AREA']).toUpperCase();
    var inter = num_(r['INTERVENCIONES']) || 0;
    var ejec = num_(r['EJECUTADAS']) || 0;
    if (!area) return;
    if (area === 'TOTAL') { total = inter; hechas = ejec; return; }
    if (area.indexOf('ESTADO') === 0 || area.indexOf('CORRECTIVOS') === 0) return;
    areas.push({ area: area, inter: inter, ejec: ejec });
  });
  if (!total) areas.forEach(function (a) { total += a.inter; hechas += a.ejec; });
  return { total: total, ejecutadas: hechas, areas: areas };
}

function resumenPreventivos_(ss, cfg) {
  var filas = tabla_(ss, cfg.hojaPreventivos, ['ITEM COT', 'AREA', 'ESTADO FINAL']);
  var porArea = {}, total = 0, hechas = 0;
  filas.forEach(function (r) {
    var area = s_(r['AREA']).toUpperCase();
    if (!area) return;
    porArea[area] = porArea[area] || { area: area, inter: 0, ejec: 0 };
    porArea[area].inter++; total++;
    if (s_(r['ESTADO FINAL'])) { porArea[area].ejec++; hechas++; }
  });
  return {
    total: total, ejecutadas: hechas,
    areas: Object.keys(porArea).map(function (k) { return porArea[k]; })
  };
}

function proyectoPublico_(cfg) {
  var base = {
    id: cfg.id, cliente: cfg.cliente, titulo: cfg.titulo, servicio: cfg.servicio,
    fecha: cfg.fecha, foto: foto_(cfg.foto), desc: cfg.desc,
    clave_hash: cfg.clave ? sha256_(cfg.clave) : '',
    detalle: true   // avisa a la web que hay detalle disponible al desbloquear
  };
  var ss;
  try { ss = SpreadsheetApp.openById(cfg.sheetId); }
  catch (err) {
    base.estado = 'En curso'; base.avance = 0; base.hitos = [];
    base.error = 'No se pudo abrir la hoja: ' + err;
    return base;
  }
  var r = resumen_(ss, cfg);
  if (!r.total) r = resumenPreventivos_(ss, cfg);
  var pct = r.total ? Math.round(r.ejecutadas * 100 / r.total) : 0;
  base.avance = pct;
  base.estado = pct >= 100 ? 'Completado' : 'En curso';
  base.resumen = { intervenciones: r.total, ejecutadas: r.ejecutadas, pendientes: r.total - r.ejecutadas };
  base.hitos = cfg.porArea === false ? [] : r.areas.map(function (a) {
    return { t: a.area + ' — ' + a.ejec + '/' + a.inter, d: a.inter > 0 && a.ejec >= a.inter };
  });
  return base;
}

// ═════════════════════ proyectos: DETALLE PRIVADO ═════════════════════

/**
 * Lista de equipos del cliente con su estado y sus informes.
 * Solo se ejecuta cuando la clave enviada coincide.
 */
function detalle_(cfg) {
  var ss = SpreadsheetApp.openById(cfg.sheetId);

  // 1) Equipos del contrato
  var control = tabla_(ss, cfg.hojaControl, ['ITEM COT', 'AREA', 'EQUIPO', 'CODIGO EQUIPO']);
  var equipos = {}, orden = [];
  control.forEach(function (r) {
    var cod = s_(r['CODIGO EQUIPO']);
    if (!cod) return;
    equipos[cod] = {
      cod: cod,
      item: num_(r['ITEM COT']),
      area: s_(r['AREA']),
      minsa: s_(r['COD. MINSA']),
      nom: s_(r['EQUIPO']),
      marca: s_(r['MARCA']),
      modelo: s_(r['MODELO']),
      serie: s_(r['SERIE']),
      servicios: num_(r['SERV./ANO']) || 0,
      alcance: s_(r['EN ALCANCE']).toUpperCase() === 'SI',
      intervenciones: []
    };
    orden.push(cod);
  });

  // 2) Intervenciones preventivas de cada equipo
  var prev = tabla_(ss, cfg.hojaPreventivos, ['CODIGO EQUIPO', 'N DE INFORME / CARPETA', 'ESTADO FINAL']);
  prev.forEach(function (r) {
    var cod = s_(r['CODIGO EQUIPO']);
    if (!cod || !equipos[cod]) return;
    var p = pdf_(r['LINK INFORME PDF']);
    equipos[cod].intervenciones.push({
      tipo: 'MP',
      n: num_(r['SERV. N']) || 1,
      informe: s_(r['N DE INFORME / CARPETA']),
      fecha: fecha_(r['FECHA EJEC.']),
      programada: fecha_(r['FECHA PROGR.']),
      estado: s_(r['ESTADO FINAL']),
      hecho: s_(r['ESTADO FINAL']) !== '',
      pdf: p.ver, pdf_dl: p.descargar
    });
  });

  // 3) Correctivos (si los hay)
  var corr = tabla_(ss, 'CORRECTIVOS', ['CODIGO EQUIPO', 'N DE INFORME / CARPETA']);
  corr.forEach(function (r) {
    var cod = s_(r['CODIGO EQUIPO']);
    if (!cod || !equipos[cod]) return;
    var p = pdf_(r['LINK INFORME PDF']);
    equipos[cod].intervenciones.push({
      tipo: 'MC',
      n: num_(r['CORR. N']) || 1,
      informe: s_(r['N DE INFORME / CARPETA']),
      fecha: fecha_(r['FECHA']),
      falla: s_(r['FALLA REPORTADA']),
      trabajo: s_(r['TRABAJO REALIZADO']),
      estado: s_(r['ESTADO FINAL']),
      hecho: s_(r['ESTADO FINAL']) !== '',
      pdf: p.ver, pdf_dl: p.descargar
    });
  });

  var lista = orden.map(function (c) { return equipos[c]; });
  return {
    ok: true,
    proyecto: cfg.id,
    cliente: cfg.cliente,
    equipos: lista,
    totales: {
      equipos: lista.length,
      en_alcance: lista.filter(function (e) { return e.alcance; }).length,
      intervenciones: lista.reduce(function (n, e) { return n + e.intervenciones.length; }, 0),
      ejecutadas: lista.reduce(function (n, e) {
        return n + e.intervenciones.filter(function (i) { return i.hecho; }).length;
      }, 0)
    }
  };
}

// ═════════════════════ salida ═════════════════════

function json_(obj) {
  var out = ContentService.createTextOutput(JSON.stringify(obj));
  out.setMimeType(ContentService.MimeType.JSON);
  return out;
}

function buildPublico_() {
  var equipos = [], paquetes = [];
  if (CATALOGO_ID && CATALOGO_ID.indexOf('PEGA') !== 0) {
    try {
      var cat = SpreadsheetApp.openById(CATALOGO_ID);
      equipos = equipos_(cat); paquetes = paquetes_(cat);
    } catch (err) { /* la web usa su catálogo integrado como respaldo */ }
  }
  return {
    equipos: equipos, paquetes: paquetes,
    proyectos: PROYECTOS.map(proyectoPublico_),
    modelo: MODELO,
    actualizado: new Date().toISOString()
  };
}

/* ── Caché del servidor ───────────────────────────────────────────────
   ANTES: cada vez que un cliente abría su proyecto, el script abría la
   hoja de mantenimiento y la leía completa. Eso son varios segundos, y
   se pagaban íntegros en cada visita, cada recarga y cada cambio de
   pestaña dentro del panel. Era la causa principal de la queja.

   Ahora la respuesta se guarda en la caché de Apps Script. La caché
   admite 100 KB por clave, así que las respuestas grandes se parten en
   trozos y se vuelven a unir al leerlas.

   Lo mejor es combinarla con el activador de más abajo (calentarCache):
   así la caché está siempre lista y ningún cliente paga la espera.

   Para forzar datos frescos: añade ?refrescar=1 a la URL, o ejecuta
   limpiarCache() desde el editor.                                     */
var CACHE_SEG   = 1800;     // 30 minutos
var CACHE_TROZO = 90000;    // 90 KB por trozo (el tope de Google son 100 KB)
var CACHE_LLAVE = 'publico_v2';

function cacheGuardar_(cache, llave, texto, seg) {
  try {
    var n = Math.ceil(texto.length / CACHE_TROZO);
    if (n > 40) return false;                    // demasiado grande: no se cachea
    var obj = {};
    for (var i = 0; i < n; i++) obj[llave + '_' + i] = texto.substr(i * CACHE_TROZO, CACHE_TROZO);
    obj[llave + '_n'] = String(n);
    cache.putAll(obj, seg);
    return true;
  } catch (err) { return false; }
}

function cacheLeer_(cache, llave) {
  try {
    var n = cache.get(llave + '_n');
    if (!n) return null;
    n = parseInt(n, 10);
    var claves = [];
    for (var i = 0; i < n; i++) claves.push(llave + '_' + i);
    var partes = cache.getAll(claves);
    var out = '';
    for (var j = 0; j < n; j++) {
      var p = partes[llave + '_' + j];
      if (p === undefined || p === null) return null;   // faltó un trozo: se regenera
      out += p;
    }
    return out;
  } catch (err) { return null; }
}

function cache_() {
  try { return CacheService.getScriptCache(); } catch (err) { return null; }
}

function limpiarCache() {
  var c = cache_(); if (!c) return;
  var claves = [CACHE_LLAVE + '_n'];
  for (var i = 0; i < 40; i++) claves.push(CACHE_LLAVE + '_' + i);
  PROYECTOS.forEach(function (cfg) {
    claves.push('det_' + cfg.id + '_n');
    for (var i = 0; i < 40; i++) claves.push('det_' + cfg.id + '_' + i);
  });
  try { c.removeAll(claves); } catch (err) {}
  Logger.log('Caché limpiada. La próxima petición vuelve a leer las hojas.');
}

function publicoCacheado_(refrescar) {
  var c = cache_();
  if (c && !refrescar) {
    var g = cacheLeer_(c, CACHE_LLAVE);
    if (g) return g;
  }
  var texto = JSON.stringify(buildPublico_());
  if (c) cacheGuardar_(c, CACHE_LLAVE, texto, CACHE_SEG);
  return texto;
}

function detalleCacheado_(cfg, refrescar) {
  var c = cache_(), llave = 'det_' + cfg.id;
  if (c && !refrescar) {
    var g = cacheLeer_(c, llave);
    if (g) return g;
  }
  var texto = JSON.stringify(detalle_(cfg));
  if (c) cacheGuardar_(c, llave, texto, CACHE_SEG);
  return texto;
}

/* ── Precalentado automático ──────────────────────────────────────────
   Deja la caché lista ANTES de que llegue ningún cliente, para que nunca
   les toque esperar la lectura de las hojas.

   CÓMO ACTIVARLO (una sola vez, 30 segundos):
     Editor de Apps Script > icono del reloj (Activadores) > Añadir
     activador > Función: calentarCache · Origen: Basado en tiempo ·
     Tipo: Temporizador por minutos · Cada 10 minutos > Guardar.

   Con eso, los datos que ve el cliente tienen como máximo 10 minutos.  */
function calentarCache() {
  _hojasLeidas = {};
  var ok = 0, fallos = [];
  try { publicoCacheado_(true); ok++; } catch (err) { fallos.push('público: ' + err); }
  PROYECTOS.forEach(function (cfg) {
    try { detalleCacheado_(cfg, true); ok++; }
    catch (err) { fallos.push(cfg.id + ': ' + err); }
  });
  Logger.log('Caché precalentada: %s bloques. %s', ok, fallos.length ? 'Fallos -> ' + fallos.join(' | ') : 'Sin fallos.');
}

function textoJson_(texto) {
  var out = ContentService.createTextOutput(texto);
  out.setMimeType(ContentService.MimeType.JSON);
  return out;
}

function doGet(e) {
  var p = (e && e.parameter) ? e.parameter : {};
  _hojasLeidas = {};   // cada petición parte de cero

  /* ── Despertador ──────────────────────────────────────────────────
     Petición mínima que la web lanza cuando el cliente llega a la
     pantalla de la clave. Google levanta el script mientras el cliente
     escribe, así que al pulsar el botón ya está caliente y responde de
     inmediato en vez de arrancar en frío.                            */
  if (p.ping) return textoJson_('{"ok":true}');

  // ── Petición de DETALLE: exige clave correcta ──
  if (p.proyecto) {
    var cfg = null;
    for (var i = 0; i < PROYECTOS.length; i++) {
      if (PROYECTOS[i].id === p.proyecto) cfg = PROYECTOS[i];
    }
    if (!cfg) return json_({ ok: false, motivo: 'proyecto no encontrado' });

    // Acepta la clave en texto o su hash SHA-256 (la web envía el hash)
    var enviado = s_(p.clave);
    var valido = cfg.clave && (enviado === cfg.clave || enviado === sha256_(cfg.clave));
    if (!valido) return json_({ ok: false, motivo: 'clave incorrecta' });

    try { return textoJson_(detalleCacheado_(cfg, !!p.refrescar)); }
    catch (err) { return json_({ ok: false, motivo: 'error al leer la hoja: ' + err }); }
  }

  // ── Petición pública (cacheada) ──
  return textoJson_(publicoCacheado_(!!p.refrescar));
}

/** Ejecuta desde el editor (▶) para probar sin publicar. */
function probar() {
  var d = buildPublico_();
  Logger.log('Equipos catálogo: %s · Paquetes: %s', d.equipos.length, d.paquetes.length);
  d.proyectos.forEach(function (p) {
    Logger.log('%s → %s%% (%s/%s)%s', p.id, p.avance,
      p.resumen ? p.resumen.ejecutadas : '?', p.resumen ? p.resumen.intervenciones : '?',
      p.error ? ' · ERROR: ' + p.error : '');
  });
  var det = detalle_(PROYECTOS[0]);
  Logger.log('DETALLE → %s equipos · %s en alcance · %s intervenciones (%s hechas)',
    det.totales.equipos, det.totales.en_alcance,
    det.totales.intervenciones, det.totales.ejecutadas);
  Logger.log('Ejemplo: %s', JSON.stringify(det.equipos[1]));
}
