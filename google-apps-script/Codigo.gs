/**
 * Codigo.gs — Conector de Google Sheets para Sinergia Biomédica
 * ------------------------------------------------------------------
 * Publica el catálogo (hojas "Equipos", "Paquetes" y "Proyectos") como JSON para que
 * la web lo lea EN VIVO. Cuando editas la hoja, la web se actualiza sola.
 *
 * CÓMO USARLO:
 *  1. Sube data/sinergia-hoja-maestra.xlsx a Google Sheets (Archivo > Importar).
 *  2. En esa hoja:  Extensiones > Apps Script.
 *  3. Borra lo que haya y pega TODO este archivo. Guarda.
 *  4. Implementar > Nueva implementación > tipo "Aplicación web".
 *       - Ejecutar como:   Yo
 *       - Quién tiene acceso:  Cualquier usuario
 *  5. Copia la URL que termina en /exec.
 *  6. Pégala en index.html, en CONFIG.DATA_URL.
 * ------------------------------------------------------------------
 */

var GRUPO = {
  'Analizadores y simuladores': 'ansim',
  'Instrumentos de medición': 'med',
  'Medidores eléctricos': 'elec',
  'Herramientas de apoyo': 'apoyo'
};

var MODELO = {
  igv: 0.18, alquiler_pct: 0.30, horas_efectivas: 7,
  descuento_hora: 0.10, descuento_dia: 0.45,
  instrumentista_dia: 120, instrumentista_min: 60,
  mult_semana: 4, mult_mes: 12, kit_dia: 40,
  descuento_combinar: { '2': 0.10, '3': 0.12, '4': 0.15 }
};

function sheetRows_(name) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) return [];
  var data = sh.getDataRange().getValues();
  var head = data.shift();
  return data
    .filter(function (r) { return r[0] !== '' && r[0] != null; })
    .map(function (r) {
      var o = {}; head.forEach(function (h, i) { o[h] = r[i]; }); return o;
    });
}
function bool_(v) {
  return v === true || ['sí', 'si', 'true', 'x', '1'].indexOf(('' + v).trim().toLowerCase()) >= 0;
}
function num_(v) { var n = parseFloat(v); return isNaN(n) ? null : n; }

function sha256_(txt) {
  // La clave del cliente nunca se publica: solo su hash SHA-256
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, txt, Utilities.Charset.UTF_8);
  return raw.map(function (b) { var v = (b < 0 ? b + 256 : b).toString(16); return v.length === 1 ? '0' + v : v; }).join('');
}

function buildCatalogo_() {
  var equipos = sheetRows_('Equipos').map(function (r) {
    var dia = num_(r.precio_dia);
    var e = {
      id: r.id, cat: r.categoria || '', g: GRUPO[r.grupo] || r.grupo || '',
      scr: r.icono || 'num', code: r.codigo || '', nom: r.nombre || '',
      marca: r.marca || '', tier: r.tier || '', ficha: r.ficha_pdf || '', desc: r.descripcion || ''
    };
    if (r.foto) e.photo = r.foto;
    if (bool_(r.apoyo)) e.apoyo = true;
    if (dia != null) { e.dia = dia; e.sem = Math.round(dia * MODELO.mult_semana); e.mes = Math.round(dia * MODELO.mult_mes); }
    try { e.specs = r.specs_json ? JSON.parse(r.specs_json) : {}; } catch (err) { e.specs = {}; }
    return e;
  });
  var paquetes = sheetRows_('Paquetes').map(function (r) {
    var dia = num_(r.por_dia) || 0;
    return {
      id: r.id, app: r.app || '', nivel: r.nivel || '', nom: r.nombre || '',
      items: ('' + (r.incluye_ids || '')).split(',').map(function (s) { return s.trim(); }).filter(String),
      kit: bool_(r.kit_apoyo) ? ['multimetro', 'destornillador-elec', 'set-46'] : [],
      pe: num_(r.por_equipo), ph: num_(r.por_hora), dia: dia,
      psem: Math.round(dia * MODELO.mult_semana), pmes: Math.round(dia * MODELO.mult_mes),
      eqh: num_(r.equipos_hora), eqd: num_(r.equipos_dia), desc: r.descripcion || ''
    };
  });
  var proyectos = sheetRows_('Proyectos').map(function (r) {
    var hitos = ('' + (r.hitos || '')).split('|').map(function (h) { return h.trim(); }).filter(String)
      .map(function (h) {
        var done = h.charAt(0) === '✓' || h.toLowerCase().indexOf('ok ') === 0;
        return { t: h.replace(/^✓\s*/, ''), d: done };
      });
    var clave = ('' + (r.clave || '')).trim();
    return {
      id: r.id, cliente: r.cliente || '', titulo: r.titulo || '',
      servicio: r.servicio || '', fecha: '' + (r.fecha || ''), foto: r.foto || '',
      estado: r.estado || 'En curso', avance: Math.round(num_(r.avance) || 0),
      desc: r.descripcion || '', hitos: hitos,
      clave_hash: clave ? sha256_(clave) : ''
    };
  });

  return { equipos: equipos, paquetes: paquetes, proyectos: proyectos, modelo: MODELO };
}

function doGet() {
  var out = ContentService.createTextOutput(JSON.stringify(buildCatalogo_()));
  out.setMimeType(ContentService.MimeType.JSON);
  return out;
}
