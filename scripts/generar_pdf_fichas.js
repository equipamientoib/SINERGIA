#!/usr/bin/env node
/* generar_pdf_fichas.js — Convierte cada hoja A4 fichas/<id>/index.html
   (la escribe generar_paginas.py) en fichas/ficha-tecnica-<id>.pdf.

   Uso, desde la raíz del repositorio:
       python3 -m http.server 8765 &     (sirve el sitio)
       node scripts/generar_pdf_fichas.js
       python3 scripts/generar_paginas.py   (para que aparezca el botón)

   Opciones:
       --todos    rehace TODOS los PDF, aunque su huella no haya cambiado.
                  Hace falta cuando cambia algo que la huella no ve: otra
                  versión de Chromium, o una fuente del sistema.

   Necesita Playwright con Chromium.

   POR QUÉ HAY UNA HUELLA
   Comparar los bytes del PDF no basta para saber si hay que escribirlo.
   Un PDF sale distinto aunque su contenido no haya cambiado ni una letra:
   basta con que el navegador sea de otra versión y cambian el subconjunto
   de fuentes incrustado y el orden interno de los objetos. El 17/10/2026
   una corrida reescribió 98 PDF cuyo contenido era idéntico; solo dos
   habían cambiado de verdad, y había que devolver los otros 96 a mano.

   Así que no se pregunta «¿salió distinto el PDF?» sino «¿cambió lo que
   lo genera?». La huella se calcula sobre la HOJA y sobre todo lo que la
   hoja carga —la hoja de estilos de las fuentes y las imágenes— y se
   guarda en fichas/.huellas.json. Si la huella no cambió, ese PDF ni
   siquiera se abre en el navegador. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
let pw;
try { pw = require('playwright'); }
catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }

const RAIZ = path.join(__dirname, '..');
const BASE = process.env.SITIO_LOCAL || 'http://localhost:8765';
const HUELLAS = path.join(RAIZ, 'fichas', '.huellas.json');
const TODOS = process.argv.includes('--todos');

/* La huella de una hoja: su HTML más los archivos del sitio que enlaza.
   Sin lo segundo, cambiar la foto de un equipo o la hoja de fuentes no
   movería la huella y el PDF se quedaría con la imagen vieja. */
function huella(htmlRuta) {
  const html = fs.readFileSync(htmlRuta);
  const h = crypto.createHash('sha256').update(html);
  const refs = new Set();
  for (const m of String(html).matchAll(/(?:src|href)="(\/[^"]+)"/g)) refs.add(m[1]);
  for (const ref of [...refs].sort()) {
    const f = path.join(RAIZ, ref.split('?')[0].replace(/^\//, ''));
    h.update(ref);
    try { h.update(fs.readFileSync(f)); } catch (e) { h.update('(no está)'); }
  }
  return h.digest('hex');
}

(async () => {
  /* Dos juegos de fichas con la misma plantilla: las de alquiler viven en
     fichas/<id>/ y las de venta en fichas/venta/<id>/. */
  const juegos = [
    { dir: path.join(RAIZ, 'fichas'), url: '/fichas/' },
    { dir: path.join(RAIZ, 'fichas', 'venta'), url: '/fichas/venta/' },
  ];
  const tareas = [];
  for (const j of juegos) {
    if (!fs.existsSync(j.dir)) continue;
    for (const id of fs.readdirSync(j.dir)) {
      const html = path.join(j.dir, id, 'index.html');
      if (fs.existsSync(html)) tareas.push({ id, html, ...j });
    }
  }
  if (!tareas.length) { console.log('No hay fichas.'); return; }

  let previas = {};
  try { previas = JSON.parse(fs.readFileSync(HUELLAS, 'utf8')); } catch (e) { previas = {}; }
  const ahora = {};

  const pendientes = [];
  for (const t of tareas) {
    const clave = t.url + t.id;
    ahora[clave] = huella(t.html);
    const pdf = path.join(t.dir, `ficha-tecnica-${t.id}.pdf`);
    if (!TODOS && previas[clave] === ahora[clave] && fs.existsSync(pdf)) continue;
    pendientes.push({ ...t, pdf, clave });
  }

  if (!pendientes.length) {
    fs.writeFileSync(HUELLAS, JSON.stringify(ahora, null, 1) + '\n');
    console.log(`Sin cambios: ${tareas.length} fichas, ninguna que rehacer.`);
    return;
  }
  console.log(`${pendientes.length} de ${tareas.length} fichas por rehacer${TODOS ? ' (--todos)' : ''}.`);

  const b = await pw.chromium.launch();
  const p = await b.newPage();
  let escritos = 0;
  for (const { id, dir, url, pdf, clave } of pendientes) {
    await p.goto(`${BASE}${url}${id}/`, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    /* Se genera en memoria y se fija la fecha antes de escribir. Sin esto
       cada PDF cambia en cada corrida —solo por la hora— y cada
       actualizacion del catalogo metia 27 MB de PDF nuevos en el
       repositorio sin que el contenido hubiera cambiado. La fecha se
       reemplaza por otra del mismo largo, para no mover los desplazamientos
       internos del PDF. */
    let buf = await p.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
    buf = Buffer.from(String(buf.toString('latin1'))
      .replace(/\/(CreationDate|ModDate)\s*\(D:\d{14}\+00'00'\)/g,
               (m, k) => `/${k} (D:20260101000000+00'00')`), 'latin1');
    /* Segunda red: aunque la huella diga que hay que rehacerlo, si sale
       byte por byte igual no se toca el archivo. */
    if (fs.existsSync(pdf) && Buffer.compare(fs.readFileSync(pdf), buf) === 0) {
      console.log(`igual: ${path.relative(RAIZ, pdf)}`);
      continue;
    }
    fs.writeFileSync(pdf, buf);
    escritos++;
    console.log('PDF:', path.relative(RAIZ, pdf));
  }
  await b.close();
  fs.writeFileSync(HUELLAS, JSON.stringify(ahora, null, 1) + '\n');
  console.log(`Escritos ${escritos} de ${pendientes.length} rehechos.`);
})();
