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
  const dir = path.join(RAIZ, 'fichas');
  const ids = fs.existsSync(dir) ? fs.readdirSync(dir).filter(d =>
    fs.existsSync(path.join(dir, d, 'index.html'))) : [];
  if (!ids.length) { console.log('No hay fichas.'); return; }
  const b = await pw.chromium.launch();
  const p = await b.newPage();
  for (const id of ids) {
    await p.goto(`${BASE}/fichas/${id}/`, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    const out = path.join(dir, `ficha-tecnica-${id}.pdf`);
    await p.pdf({ path: out, format: 'A4', printBackground: true, preferCSSPageSize: true });
    console.log('PDF:', path.relative(RAIZ, out));
  }
  await b.close();
})();
