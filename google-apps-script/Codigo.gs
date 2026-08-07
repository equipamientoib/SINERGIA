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

function fecha_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'America/Lima', 'dd/MM/yyyy');
  return s_(v);
}

function driveId_(txt) {
  var t = s_(txt);
  if (!t) return '';
  var m = t.match(/\/d\/([a-zA-Z0-9_-]{20,})/)
       || t.match(/[?&]id=([a-zA-Z0-9_-]{20,})/)
       || t.match(/^([a-zA-Z0-9_-]{25,})$/);
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

function filas_(ss, nombreHoja) {
  var sh = ss.getSheetByName(nombreHoja);
  if (!sh) return [];
  var vals = sh.getDataRange().getValues();
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

/** Encuentra la fila de encabezados en cualquier parte de la hoja. */
function tabla_(ss, nombreHoja, columnasClave) {
  var sh = ss.getSheetByName(nombreHoja);
  if (!sh) return [];
  var vals = sh.getDataRange().getValues();
  var fh = -1, heads = null;
  for (var i = 0; i < vals.length && fh < 0; i++) {
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

function doGet(e) {
  var p = (e && e.parameter) ? e.parameter : {};

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

    try { return json_(detalle_(cfg)); }
    catch (err) { return json_({ ok: false, motivo: 'error al leer la hoja: ' + err }); }
  }

  // ── Petición pública ──
  return json_(buildPublico_());
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
