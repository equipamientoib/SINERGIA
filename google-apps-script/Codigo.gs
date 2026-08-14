/**
 * Sinergia Biomédica — Apps Script  ·  versión UNIFICADA
 *
 * Junta las DOS ramas que se habían separado:
 *   · La que está publicada hoy  -> tiene galería de fotos, calibración
 *     y valorizaciones, pero lee las hojas enteras en CADA petición.
 *   · La que quedó en el repositorio (google-apps-script/Codigo.gs)
 *     -> tiene caché y lecturas memorizadas, pero le faltan esas tres
 *     funciones nuevas.
 *
 * Esta versión tiene TODO: las funciones nuevas y el rendimiento.
 *
 * QUÉ CAMBIA RESPECTO A LO QUE ESTÁ PUBLICADO
 *  1) Cada hoja se lee UNA sola vez por petición (antes PREVENTIVOS se
 *     leía dos veces: para el resumen y para las intervenciones).
 *  2) fecha_() ya no llama a Utilities.formatDate. Con 107 intervenciones
 *     y dos fechas cada una eran más de 200 llamadas al servidor de
 *     Google por visita.  ⚠ REQUISITO: Configuración del proyecto >
 *     Zona horaria = America/Lima.
 *  3) La respuesta se guarda en la caché de Apps Script (30 min) y se
 *     parte en trozos, porque Google admite 100 KB por clave.
 *  4) Se atiende ?ping=1, que es lo que la web manda para "despertar" el
 *     script mientras el cliente escribe su clave. Hasta ahora ese ping
 *     disparaba una lectura completa de las hojas: hacía justo lo
 *     contrario de lo que buscaba.
 *  5) ?refrescar=1 salta la caché cuando quieres ver datos frescos ya.
 *
 * ⚠ ESTE ARCHIVO CONTIENE LA CLAVE DEL CLIENTE.
 *   Va SOLO dentro de Apps Script. NUNCA lo subas a GitHub.
 *
 * INSTALACIÓN
 *  1) Apps Script > selecciona todo el Code.gs > pega esto > Guardar.
 *  2) Configuración del proyecto > Zona horaria: America/Lima.
 *  3) Ejecuta `probar` (▶) para verificar.
 *  4) Implementar > Gestionar implementaciones > (lápiz) >
 *     Versión: NUEVA VERSIÓN > Implementar.   ← sin esto no cambia nada
 *  5) Activadores (reloj) > Añadir > calentarCache · cada 10 minutos.
 */

// ═════════════════════ CONFIGURACIÓN ═════════════════════

var CATALOGO_ID = "PEGA_AQUI_EL_ID";   // libro Sinergia-Web

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
    hojaControl: "CONTROL SEGUN COTIZACION",
    hojaValorizaciones: "CONTROL_VALORIZACIONES",
    inicioContrato: "2026-08",
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

/* Fecha SIN llamar a la API de Google. Los Date que devuelve Sheets ya
   vienen en la zona horaria del proyecto, así que getDate()/getMonth()
   dan el mismo resultado que Utilities.formatDate, pero sin el viaje.
   REQUISITO: zona horaria del proyecto = America/Lima.               */
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

function sha256_(txt) {
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, txt, Utilities.Charset.UTF_8);
  return raw.map(function (b) {
    var v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

// ═════════════════ lectura de hojas (memorizada) ═════════════════
/* Cada hoja se trae UNA vez por petición y se guarda en memoria.
   Antes PREVENTIVOS se leía dos veces —para el resumen y para las
   intervenciones— y cada lectura era un viaje al servidor.          */
var LIM_CABECERA = 40;
var _hojasLeidas = {};
var _libros = {};

function abrirLibro_(id) {
  if (_libros[id]) return _libros[id];
  var ss = SpreadsheetApp.openById(id);
  _libros[id] = ss;
  return ss;
}

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

/** Encuentra la fila de encabezados en las primeras filas de la hoja. */
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

    var extra = fotos_(r.fotos);
    if (extra.length) {
      e.fotos = extra;
      if (!e.photo) e.photo = extra[0];
    }

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

    e.cal_ini = fecha_(r.cal_inicio);
    e.cal_fin = fecha_(r.cal_fin);
    var cal = pdf_(r.cal_certificado);
    e.cal_pdf = cal.ver; e.cal_dl = cal.descargar;

    e.desc = s_(r.descripcion);
    try { e.specs = JSON.parse(s_(r.specs_json) || '{}'); } catch (err) { e.specs = {}; }
    return e;
  });
}

function paquetes_(ss) {
  return filas_(ss, 'Paquetes').map(function (r) {
    function ids(v) { return s_(v).split(',').map(function (x) { return x.trim(); }).filter(String); }
    var p = {
      id: s_(r.id), app: s_(r.app), nivel: s_(r.nivel), nom: s_(r.nombre),
      items: ids(r.incluye_ids), kit: ids(r.kit_apoyo),
      pe: num_(r.por_equipo), ph: num_(r.por_hora), dia: num_(r.por_dia),
      psem: num_(r.por_semana), pmes: num_(r.por_mes),
      eqh: num_(r.equipos_hora), eqd: num_(r.equipos_dia),
      desc: s_(r.descripcion)
    };

    var f = foto_(r.foto);
    if (f) p.foto = f;
    var g = fotos_(r.fotos);
    if (g.length) { p.fotos = g; if (!p.foto) p.foto = g[0]; }

    return p;
  });
}

// ═════════════════════ proyectos: parte PÚBLICA ═════════════════════

function resumen_(ss, cfg) {
  var filas = tabla_(ss, cfg.hojaResumen, ['AREA', 'INTERVENCIONES', 'EJECUTADAS']);
  var areas = [], total = 0, hechas = 0, fin = false;
  filas.forEach(function (r) {
    if (fin) return;
    var area = s_(r['AREA']).toUpperCase();
    var inter = num_(r['INTERVENCIONES']) || 0;
    var ejec = num_(r['EJECUTADAS']) || 0;
    if (!area) return;
    if (area === 'TOTAL') { total = inter; hechas = ejec; fin = true; return; }
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
    detalle: true
  };
  var ss;
  try { ss = abrirLibro_(cfg.sheetId); }
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

function detalle_(cfg) {
  var ss = abrirLibro_(cfg.sheetId);

  // 1) Equipos del contrato
  var control = tabla_(ss, cfg.hojaControl, ['ITEM COT', 'AREA', 'EQUIPO', 'CODIGO EQUIPO']);
  var equipos = {}, orden = [];
  control.forEach(function (r) {
    var cod = s_(r['CODIGO EQUIPO']);
    if (!cod) return;
    equipos[cod] = {
      cod: cod,
      foto: foto_(r['FOTO EQUIPO']),
      criticidad: s_(r['CRITICIDAD']),
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
    var listo = s_(r['ESTADO FINAL']) !== '';
    var p = listo ? pdf_(r['LINK INFORME PDF']) : { ver: '', descargar: '' };
    var sc = listo ? pdf_(r['LINK INFORME SCAN']) : { ver: '', descargar: '' };
    equipos[cod].intervenciones.push({
      tipo: 'MP',
      n: num_(r['SERV. N']) || 1,
      informe: s_(r['N DE INFORME / CARPETA']),
      fecha: fecha_(r['FECHA EJEC.']),
      programada: fecha_(r['FECHA PROGR.']),
      proximo: fecha_(r['PROXIMO MANT.']),
      estado: s_(r['ESTADO FINAL']),
      hecho: listo,
      pdf: p.ver, pdf_dl: p.descargar,
      scan: sc.ver, scan_dl: sc.descargar
    });
  });

  // 3) Correctivos (si los hay)
  var corr = tabla_(ss, 'CORRECTIVOS', ['CODIGO EQUIPO', 'N DE INFORME / CARPETA']);
  corr.forEach(function (r) {
    var cod = s_(r['CODIGO EQUIPO']);
    if (!cod || !equipos[cod]) return;
    var listo = s_(r['ESTADO FINAL']) !== '';
    var p = listo ? pdf_(r['LINK INFORME PDF']) : { ver: '', descargar: '' };
    var sc = listo ? pdf_(r['LINK INFORME SCAN']) : { ver: '', descargar: '' };
    equipos[cod].intervenciones.push({
      tipo: 'MC',
      n: num_(r['CORR. N']) || 1,
      informe: s_(r['N DE INFORME / CARPETA']),
      fecha: fecha_(r['FECHA']),
      falla: s_(r['FALLA REPORTADA']),
      trabajo: s_(r['TRABAJO REALIZADO']),
      estado: s_(r['ESTADO FINAL']),
      hecho: listo,
      pdf: p.ver, pdf_dl: p.descargar,
      scan: sc.ver, scan_dl: sc.descargar
    });
  });

  var lista = orden.map(function (c) { return equipos[c]; });

  /* Cláusula Tercera: la valorización se presenta el mes siguiente.
     Mientras el mes sigue abierto, el informe firmado aún no existe:
     solo se publica el PDF y se marca como PRELIMINAR.                */
  var estadosVal = estadosValorizacion_(ss, cfg);
  lista.forEach(function (e) {
    e.intervenciones.forEach(function (i) {
      if (!i.hecho) return;
      var idx = indiceValorizacion_(mesDe_(i.fecha), cfg.inicioContrato);
      var n = idx ? 'V-' + ('0' + idx).slice(-2) : '';
      var est = estadosVal[n] || 'En ejecución';
      i.valorizacion = n;
      i.preliminar = (est === 'En ejecución');
      if (i.preliminar) { i.scan = ''; i.scan_dl = ''; }
    });
  });

  var vals = valorizaciones_(ss, cfg, lista);
  return {
    ok: true,
    /* Momento en que se leyó la hoja DE VERDAD. Va dentro de la respuesta,
       así que se guarda con ella en la caché: cuando el panel muestra una
       respuesta cacheada, el sello sigue diciendo la verdad en vez de la
       hora en que el navegador la recibió.                              */
    generado: new Date().toISOString(),
    proyecto: cfg.id,
    cliente: cfg.cliente,
    equipos: lista,
    valorizaciones: vals,
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

// ═════════════════════ valorizaciones ═════════════════════

function mesDe_(v) {
  if (v instanceof Date) return v.getFullYear() + '-' + ('0' + (v.getMonth() + 1)).slice(-2);
  var t = s_(v);
  var m = t.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);   // dd/mm/aaaa
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2);
  m = t.match(/^(\d{4})-(\d{2})/);                              // aaaa-mm
  if (m) return m[1] + '-' + m[2];
  return '';
}

function indiceValorizacion_(mes, inicio) {
  if (!mes || !inicio) return 0;
  var a = mes.split('-'), b = inicio.split('-');
  var n = (Number(a[0]) - Number(b[0])) * 12 + (Number(a[1]) - Number(b[1])) + 1;
  return n > 0 ? n : 0;
}

/** Estado que ve el cliente: sin información comercial. */
function estadoPublico_(e) {
  var t = s_(e).toLowerCase();
  if (t.indexOf('factur') >= 0 || t.indexOf('pagad') >= 0) return 'Cerrada';
  if (t.indexOf('conformidad') >= 0) return 'Con conformidad';
  if (t.indexOf('presentad') >= 0) return 'Presentada';
  if (t.indexOf('sin movimiento') >= 0) return 'Sin movimiento';
  return 'En ejecución';
}

function aFecha_(v) {
  if (v instanceof Date) return v;
  var m = s_(v).match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : null;
}

function diasHasta_(v) {
  var f = aFecha_(v);
  if (!f) return null;
  var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  return Math.round((f - hoy) / 86400000);
}

function estadosValorizacion_(ss, cfg) {
  var out = {};
  tabla_(ss, cfg.hojaValorizaciones, ['N', 'MES EJECUTADO', 'ESTADO']).forEach(function (r) {
    var n = s_(r['N']).toUpperCase();
    if (n) out[n] = estadoPublico_(r['ESTADO']);
  });
  return out;
}

function valorizaciones_(ss, cfg, equipos) {
  var cab = {};
  tabla_(ss, cfg.hojaValorizaciones, ['N', 'MES EJECUTADO', 'ESTADO']).forEach(function (r) {
    var n = s_(r['N']).toUpperCase();
    if (!n) return;
    var p = pdf_(r['LINK VALORIZACION']);
    cab[n] = {
      n: n,
      mes: s_(r['MES EJECUTADO']),
      estado: estadoPublico_(r['ESTADO']),
      presentacion_max: fecha_(r['PRESENTACION MAX']),
      conformidad_max: fecha_(r['CONFORMIDAD MAX']),
      presentacion: fecha_(r['FECHA PRESENTACION']),
      conformidad: fecha_(r['FECHA CONFORMIDAD']),
      obs: s_(r['OBSERVACIONES']),
      pdf: p.ver,
      dias_conformidad: diasHasta_(r['CONFORMIDAD MAX']),
      anio_contrato: num_(r['AÑO CONTRATO']) || null,
      items: []
    };
  });

  equipos.forEach(function (e) {
    e.intervenciones.forEach(function (i) {
      if (!i.hecho) return;
      var idx = indiceValorizacion_(mesDe_(i.fecha), cfg.inicioContrato);
      if (!idx) return;
      var n = 'V-' + ('0' + idx).slice(-2);
      if (!cab[n]) cab[n] = { n: n, mes: '', estado: 'En ejecución', items: [] };
      cab[n].items.push({
        cod: e.cod, equipo: e.nom, area: e.area,
        marca: e.marca, modelo: e.modelo, serie: e.serie,
        tipo: i.tipo, informe: i.informe, fecha: i.fecha,
        estado: i.estado, pdf: i.pdf, pdf_dl: i.pdf_dl,
        scan: i.scan, scan_dl: i.scan_dl, preliminar: !!i.preliminar
      });
    });
  });

  var lista = Object.keys(cab).sort().map(function (k) {
    var v = cab[k];
    v.total = v.items.length;
    return v;
  });

  var PROXIMAS = 3, futuras = 0, out = [];
  lista.forEach(function (v) {
    var activa = v.total > 0 || v.presentacion || v.estado === 'Sin movimiento';
    if (activa) { out.push(v); return; }
    if (futuras < PROXIMAS) { v.futura = true; futuras++; out.push(v); }
  });
  return out;
}

// ═════════════════════ salida ═════════════════════

function json_(obj) {
  var out = ContentService.createTextOutput(JSON.stringify(obj));
  out.setMimeType(ContentService.MimeType.JSON);
  return out;
}

function textoJson_(texto) {
  var out = ContentService.createTextOutput(texto);
  out.setMimeType(ContentService.MimeType.JSON);
  return out;
}

function buildPublico_() {
  var equipos = [], paquetes = [];
  if (CATALOGO_ID && CATALOGO_ID.indexOf('PEGA') !== 0) {
    try {
      var cat = abrirLibro_(CATALOGO_ID);
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

// ═════════════════════ caché del servidor ═════════════════════
/* La caché de Apps Script admite 100 KB por clave, así que las
   respuestas grandes se parten en trozos y se reconstruyen al leer.
   Para forzar datos frescos: ?refrescar=1 o limpiarCache().          */

var CACHE_SEG   = 1800;     // 30 minutos
var CACHE_TROZO = 90000;    // 90 KB por trozo
var CACHE_LLAVE = 'publico_v3';

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

function publicoCacheado_(refrescar, sinFreno) {
  var c = cache_();
  if (refrescar && !sinFreno && !puedeRefrescar_(c, CACHE_LLAVE)) refrescar = false;
  if (c && !refrescar) {
    var g = cacheLeer_(c, CACHE_LLAVE);
    if (g) return g;
  }
  var texto = JSON.stringify(buildPublico_());
  if (c) cacheGuardar_(c, CACHE_LLAVE, texto, CACHE_SEG);
  return texto;
}

/* ── Freno del botón «Actualizar» ─────────────────────────────────────
   El botón del panel manda ?refrescar=1, que salta la caché y vuelve a
   leer las hojas. Sin freno, diez clics seguidos son diez lecturas
   completas y volvemos justo al problema que acabamos de resolver.

   Con esto, un refresco de verdad se concede como mucho cada 45 s; los
   clics de más reciben la respuesta cacheada, que de todos modos tiene
   segundos de vida. El cliente no nota la diferencia.               */
var REFRESCO_ESPERA = 45;

function puedeRefrescar_(c, llave) {
  if (!c) return true;
  try {
    if (c.get('frena_' + llave)) return false;
    c.put('frena_' + llave, '1', REFRESCO_ESPERA);
  } catch (err) {}
  return true;
}

function detalleCacheado_(cfg, refrescar, sinFreno) {
  var c = cache_(), llave = 'det_' + cfg.id;
  if (refrescar && !sinFreno && !puedeRefrescar_(c, llave)) refrescar = false;
  if (c && !refrescar) {
    var g = cacheLeer_(c, llave);
    if (g) return g;
  }
  var texto = JSON.stringify(detalle_(cfg));
  if (c) cacheGuardar_(c, llave, texto, CACHE_SEG);
  return texto;
}

/* ── Precalentado automático ──────────────────────────────────────────
   Deja la caché lista ANTES de que llegue ningún cliente.
   Activadores (reloj) > Añadir activador > Función: calentarCache ·
   Basado en tiempo · Temporizador por minutos · Cada 10 minutos.     */
function calentarCache() {
  _hojasLeidas = {}; _libros = {};
  var ok = 0, fallos = [];
  try { publicoCacheado_(true, true); ok++; } catch (err) { fallos.push('público: ' + err); }
  PROYECTOS.forEach(function (cfg) {
    try { detalleCacheado_(cfg, true, true); ok++; }
    catch (err) { fallos.push(cfg.id + ': ' + err); }
  });
  Logger.log('Caché precalentada: %s bloques. %s', ok,
    fallos.length ? 'Fallos -> ' + fallos.join(' | ') : 'Sin fallos.');
}

// ═════════════════════ punto de entrada ═════════════════════

function doGet(e) {
  var p = (e && e.parameter) ? e.parameter : {};
  _hojasLeidas = {}; _libros = {};   // cada petición parte de cero

  /* Despertador: la web lo lanza cuando el cliente llega a la pantalla
     de la clave. Debe responder al instante y NO leer ninguna hoja. */
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

/** Ejecuta desde el editor (▶) para verificar sin publicar. */
function probar() {
  _hojasLeidas = {}; _libros = {};
  var t0 = new Date().getTime();
  var d = buildPublico_();
  Logger.log('PÚBLICO en %s ms · equipos: %s · paquetes: %s',
    new Date().getTime() - t0, d.equipos.length, d.paquetes.length);

  var conFoto = d.equipos.filter(function (e) { return e.photo; }).length;
  var conGal = d.equipos.filter(function (e) { return e.fotos && e.fotos.length; }).length;
  var conCal = d.equipos.filter(function (e) { return e.cal_fin; }).length;
  Logger.log('Con portada: %s · con galería: %s · con calibración: %s', conFoto, conGal, conCal);

  d.proyectos.forEach(function (p) {
    Logger.log('%s → %s%% (%s/%s)%s', p.id, p.avance,
      p.resumen ? p.resumen.ejecutadas : '?', p.resumen ? p.resumen.intervenciones : '?',
      p.error ? ' · ERROR: ' + p.error : '');
  });

  var t1 = new Date().getTime();
  var det = detalle_(PROYECTOS[0]);
  Logger.log('DETALLE en %s ms → %s equipos · %s en alcance · %s intervenciones (%s hechas)',
    new Date().getTime() - t1, det.totales.equipos, det.totales.en_alcance,
    det.totales.intervenciones, det.totales.ejecutadas);
  (det.valorizaciones || []).forEach(function (v) {
    Logger.log('%s (%s) → %s · %s informes', v.n, v.mes, v.estado, v.total);
  });
  Logger.log('TOTAL: %s ms. Si el público pasa de 10 000 ms, la web se rinde.',
    new Date().getTime() - t0);
}
