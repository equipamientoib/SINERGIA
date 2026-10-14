#!/usr/bin/env node
/* generar_pdf_fichas.js — Convierte cada hoja A4 fichas/<id>/index.html
   (la escribe generar_paginas.py) en fichas/ficha-tecnica-<id>.pdf.

   Uso, desde la raíz del repositorio:
       python3 -m http.server 8765 &     (sirve el sitio)
       node scripts/generar_pdf_fichas.js
       python3 scripts/generar_paginas.py   (para que aparezca el botón)

   Necesita Playwright con Chromium. */
const fs = require('fs'), path = require('path');
let pw;
try { pw = require('playwright'); }
catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }

const RAIZ = path.join(__dirname, '..');
const BASE = process.env.SITIO_LOCAL || 'http://localhost:8765';

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
      if (fs.existsSync(path.join(j.dir, id, 'index.html'))) tareas.push({ id, ...j });
    }
  }
  if (!tareas.length) { console.log('No hay fichas.'); return; }
  const b = await pw.chromium.launch();
  const p = await b.newPage();
  for (const { id, dir, url } of tareas) {
    await p.goto(`${BASE}${url}${id}/`, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    const out = path.join(dir, `ficha-tecnica-${id}.pdf`);
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
    if (fs.existsSync(out) && Buffer.compare(fs.readFileSync(out), buf) === 0) {
      console.log(`igual: ${path.relative(RAIZ, out)}`);
      continue;
    }
    fs.writeFileSync(out, buf);
    console.log('PDF:', path.relative(RAIZ, out));
  }
  await b.close();
})();
