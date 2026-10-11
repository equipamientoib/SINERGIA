/* ═══════════════════════════════════════════════════════════════════
   04-xlsx.js — escribir un .xlsx CON FORMATO desde el navegador.

   SheetJS, que es lo que usa el resto de la herramienta, no escribe
   estilos en su versión libre: el archivo sale correcto pero en blanco
   y negro. Para la hoja del LS eso no vale, porque lo que se pide es
   justamente «como está en Huari»: la cabecera gris, la banda naranja
   de cada ambiente, el gris de las filas y la fila azul que separa.

   Así que el .xlsx se arma a mano. Un .xlsx es un ZIP con unos cuantos
   XML dentro, y el ZIP se puede escribir sin comprimir —método
   «stored»—, que es legal y lo abre Excel igual. Lo único que hace
   falta de verdad es el CRC32 de cada archivo. Sale más pesado que uno
   comprimido, pero con 1 100 filas son unos pocos MB.

   No pretende ser una librería: sólo lo que esta herramienta usa
   —texto, número, fórmula, relleno, fuente, bordes, anchos, columnas
   ocultas, panel inmovilizado y autofiltro—.
   ═══════════════════════════════════════════════════════════════════ */

/* ── CRC32, que es lo único que el ZIP exige calcular ── */
const XL_CRC = (() => {
  const t = new Uint32Array(256);
  for(let n = 0; n < 256; n++){
    let c = n;
    for(let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

function xlCrc32(bytes){
  let c = 0xFFFFFFFF;
  for(let i = 0; i < bytes.length; i++) c = XL_CRC[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

/* ── ZIP sin comprimir ──
   Cabecera local por archivo, luego el directorio central y el final.
   Las fechas van en el formato de MS-DOS que pide el formato. */
function xlZip(archivos){
  const enc = new TextEncoder();
  const partes = [], centro = [];
  let desp = 0;
  const h = new Date();
  const hora = ((h.getHours() << 11) | (h.getMinutes() << 5) | (h.getSeconds() >> 1)) & 0xFFFF;
  const fecha = (((h.getFullYear() - 1980) << 9) | ((h.getMonth() + 1) << 5) | h.getDate()) & 0xFFFF;

  archivos.forEach(f => {
    const nombre = enc.encode(f.nombre);
    const datos = enc.encode(f.texto);
    const crc = xlCrc32(datos);

    const loc = new DataView(new ArrayBuffer(30));
    loc.setUint32(0, 0x04034b50, true); loc.setUint16(4, 20, true);
    loc.setUint16(6, 0, true); loc.setUint16(8, 0, true);          // sin comprimir
    loc.setUint16(10, hora, true); loc.setUint16(12, fecha, true);
    loc.setUint32(14, crc, true);
    loc.setUint32(18, datos.length, true); loc.setUint32(22, datos.length, true);
    loc.setUint16(26, nombre.length, true); loc.setUint16(28, 0, true);
    partes.push(new Uint8Array(loc.buffer), nombre, datos);

    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 20, true);
    cen.setUint16(8, 0, true); cen.setUint16(10, 0, true);
    cen.setUint16(12, hora, true); cen.setUint16(14, fecha, true);
    cen.setUint32(16, crc, true);
    cen.setUint32(20, datos.length, true); cen.setUint32(24, datos.length, true);
    cen.setUint16(28, nombre.length, true);
    cen.setUint32(42, desp, true);
    centro.push(new Uint8Array(cen.buffer), nombre);
    desp += 30 + nombre.length + datos.length;
  });

  const largoCentro = centro.reduce((s, p) => s + p.length, 0);
  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true);
  fin.setUint16(8, archivos.length, true); fin.setUint16(10, archivos.length, true);
  fin.setUint32(12, largoCentro, true); fin.setUint32(16, desp, true);

  return new Blob(partes.concat(centro, [new Uint8Array(fin.buffer)]),
                  {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}

function xlEsc(t){
  return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    /* Los caracteres de control rompen el XML y Excel se niega a abrir
       el archivo sin decir por qué. */
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}

function xlCol(n){                        // 0 → A, 26 → AA
  let s = '';
  for(n = n + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + (n - 1) % 26) + s;
  return s;
}

/* ── El libro ──
   hoja = {nombre, cols:[{ancho, oculta}], filas:[{alto, celdas:[...]}],
           freeze:{x,y}, filtro:'A1:T10'}
   celda = null | {v, f, s}   v valor (texto o número), f fórmula, s estilo
   estilo = {fondo:'B7B7B7', color:'FFFFFF', negrita, tachado, tam, fuente,
             borde:true, centro:true, medio:true, wrap:true, fmt:'0'} */
function xlLibro(hoja){
  /* Los estilos se juntan: Excel quiere una tabla y cada celda apunta a
     una fila de esa tabla por número. */
  const fuentes = [], rellenos = ['none', 'gray125'], bordes = [], xfs = [];
  const idx = {};

  const pide = (lista, clave) => {
    const k = JSON.stringify(clave);
    if(idx[lista.nombre + k] === undefined){
      idx[lista.nombre + k] = lista.length;
      lista.push(clave);
    }
    return idx[lista.nombre + k];
  };
  fuentes.nombre = 'f'; rellenos.nombre = 'r'; bordes.nombre = 'b'; xfs.nombre = 'x';
  pide(fuentes, {tam: 10, fuente: 'Arial'});
  pide(bordes, {});

  const estiloDe = e => {
    if(!e) return 0;
    const f = pide(fuentes, {tam: e.tam || 10, fuente: e.fuente || 'Arial',
                             negrita: !!e.negrita, color: e.color || null,
                             tachado: !!e.tachado});
    const r = e.fondo ? pide(rellenos, {fondo: e.fondo}) : 0;
    const b = pide(bordes, {borde: !!e.borde});
    /* +1 porque la tabla de estilos empieza con el xf de Excel por
       defecto, el que usan las celdas sin estilo. Sin ese uno de más
       toda la hoja sale corrida una fila de estilo. */
    return pide(xfs, {f: f, r: r, b: b, centro: !!e.centro, medio: !!e.medio,
                      wrap: !!e.wrap, fmt: e.fmt || null, izq: !!e.izq}) + 1;
  };

  /* Primero las celdas, que es lo que llena la tabla de estilos. */
  const filasXml = hoja.filas.map((fila, i) => {
    const n = i + 1;
    const celdas = fila.celdas.map((c, j) => {
      if(c === null || c === undefined) return '';
      const ref = xlCol(j) + n;
      const s = estiloDe(c.s);
      const sa = s ? ` s="${s}"` : '';
      if(c.f !== undefined && c.f !== null) return `<c r="${ref}"${sa}><f>${xlEsc(c.f)}</f></c>`;
      if(c.v === null || c.v === undefined || c.v === '') return `<c r="${ref}"${sa}/>`;
      if(typeof c.v === 'number') return `<c r="${ref}"${sa}><v>${c.v}</v></c>`;
      return `<c r="${ref}"${sa} t="inlineStr"><is><t xml:space="preserve">${xlEsc(c.v)}</t></is></c>`;
    }).join('');
    return `<row r="${n}"${fila.alto ? ` ht="${fila.alto}" customHeight="1"` : ''}>${celdas}</row>`;
  }).join('');

  const fmts = [];
  xfs.forEach(x => { if(x.fmt && fmts.indexOf(x.fmt) < 0) fmts.push(x.fmt); });

  const estilos = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="${fmts.length}">${fmts.map((f, i) =>
  `<numFmt numFmtId="${164 + i}" formatCode="${xlEsc(f)}"/>`).join('')}</numFmts>
<fonts count="${fuentes.length}">${fuentes.map(f =>
  `<font><sz val="${f.tam}"/><name val="${xlEsc(f.fuente)}"/>${f.negrita ? '<b/>' : ''}${
    f.tachado ? '<strike/>' : ''}${
    f.color ? `<color rgb="FF${f.color}"/>` : ''}</font>`).join('')}</fonts>
<fills count="${rellenos.length}">${rellenos.map(r =>
  typeof r === 'string' ? `<fill><patternFill patternType="${r}"/></fill>`
    : `<fill><patternFill patternType="solid"><fgColor rgb="FF${r.fondo}"/><bgColor indexed="64"/></patternFill></fill>`).join('')}</fills>
<borders count="${bordes.length}">${bordes.map(b => b.borde
  ? '<border><left style="thin"><color rgb="FF000000"/></left><right style="thin"><color rgb="FF000000"/></right><top style="thin"><color rgb="FF000000"/></top><bottom style="thin"><color rgb="FF000000"/></bottom><diagonal/></border>'
  : '<border><left/><right/><top/><bottom/><diagonal/></border>').join('')}</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="${xfs.length + 1}"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>${
  xfs.map(x => {
    const nf = x.fmt ? 164 + fmts.indexOf(x.fmt) : 0;
    const al = (x.centro || x.medio || x.wrap || x.izq)
      ? `<alignment${x.centro ? ' horizontal="center"' : (x.izq ? ' horizontal="left"' : '')}${
          x.medio ? ' vertical="center"' : ''}${x.wrap ? ' wrapText="1"' : ''}/>` : '';
    return `<xf numFmtId="${nf}" fontId="${x.f}" fillId="${x.r}" borderId="${x.b}" xfId="0"`
      + ` applyFont="1" applyFill="1" applyBorder="1"${x.fmt ? ' applyNumberFormat="1"' : ''}`
      + (al ? ` applyAlignment="1">${al}</xf>` : '/>');
  }).join('')}</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

  const cols = (hoja.cols || []).map((c, i) => c
    ? `<col min="${i + 1}" max="${i + 1}"${c.ancho ? ` width="${c.ancho}" customWidth="1"` : ''}${
        c.oculta ? ' hidden="1"' : ''}/>` : '').join('');

  const freeze = hoja.freeze
    ? `<sheetView workbookViewId="0"><pane xSplit="${hoja.freeze.x || 0}" ySplit="${hoja.freeze.y || 0}"`
      + ` topLeftCell="${xlCol(hoja.freeze.x || 0)}${(hoja.freeze.y || 0) + 1}" activePane="bottomRight" state="frozen"/></sheetView>`
    : '<sheetView workbookViewId="0"/>';

  const hojaXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetViews>${freeze}</sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
${cols ? `<cols>${cols}</cols>` : ''}
<sheetData>${filasXml}</sheetData>
${hoja.filtro ? `<autoFilter ref="${hoja.filtro}"/>` : ''}
</worksheet>`;

  return xlZip([
    {nombre: '[Content_Types].xml', texto: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`},
    {nombre: '_rels/.rels', texto: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`},
    {nombre: 'xl/workbook.xml', texto: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${xlEsc(hoja.nombre)}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`},
    {nombre: 'xl/_rels/workbook.xml.rels', texto: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`},
    {nombre: 'xl/styles.xml', texto: estilos},
    {nombre: 'xl/worksheets/sheet1.xml', texto: hojaXml},
  ]);
}
