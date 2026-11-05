#!/usr/bin/env node
/* Arma una cotización formal en PDF y le pega el documento del fabricante.
 *
 *   node scripts/generar_cotizacion.js data/cotizaciones/COT-SB-1126-009.json
 *
 * Hasta ahora cada cotización se escribía a mano: un script nuevo por
 * cliente, con los datos copiados y el PDF del proveedor pegado aparte con
 * pdfunite. Así se coló más de un error — tildes comidas en la nota, la foto
 * del catálogo que era el cuadro gris de «imagen no disponible», un precio
 * con un cero de más. Esto lo hace siempre igual.
 *
 * Lo que hace, en orden:
 *
 *   1. Lee la solicitud: un JSON con el cliente, los equipos y el precio.
 *   2. Dibuja la hoja con cotHTML(), la MISMA función que usa el sitio. No
 *      hay una segunda plantilla que se pueda quedar atrás.
 *   3. Busca el código de proveedor del equipo en data/venta-nuevos.json y
 *      sus documentos en data/documentos.json.
 *   4. Baja de Drive el documento que corresponde y lo pega al final.
 *   5. Deja el PDF con el nombre del cliente.
 *
 * El documento del fabricante va SOLO dentro de la cotización, nunca en la
 * web: lleva el membrete del proveedor y ahí se sabe a quién le llega. En la
 * página se publica la ficha propia de Sinergia, con su logo.
 *
 * Necesita el sitio servido en localhost:8765 (python3 -m http.server 8765).
 */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const os = require('os');

const RAIZ = path.resolve(__dirname, '..');
const SITIO = process.env.SITIO_URL || 'http://localhost:8765';

/* Qué documento del fabricante se adjunta, por orden de preferencia.
 * El catálogo traducido primero: es el que el cliente puede leer. El
 * registro sanitario NUNCA se adjunta solo porque sí — es material interno,
 * y va únicamente si la solicitud lo pide expresamente. */
const ORDEN = ['CTR', 'COR', 'ETT'];

function leerJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

/* El código de proveedor de un equipo: 095.247 para el DEA, por ejemplo.
 * Vive en data/venta-nuevos.json, que es de donde salen los equipos que no
 * están en la hoja. */
function codigoDe(id) {
  const d = leerJSON(path.join(RAIZ, 'data/venta-nuevos.json'));
  const eq = (d.equipos || []).find(e => e.id === id);
  return eq ? String(eq.codigo || '') : '';
}

/* Los documentos de ese código, en el orden en que conviene adjuntarlos. */
function documentosDe(codigo, tipos) {
  if (!codigo) return [];
  const idx = leerJSON(path.join(RAIZ, 'data/documentos.json'));
  const lista = (idx.docs || {})[codigo] || [];
  const quiere = tipos && tipos.length ? tipos : ORDEN;
  const sal = [];
  quiere.forEach(t => lista.filter(d => d.tipo === t).forEach(d => sal.push(d)));
  return sal;
}

/* Drive no sirve el PDF en el enlace /view: hay que pedirlo por uc?export.
 * Para un archivo grande contesta primero una página de confirmación, así
 * que se comprueba que lo que llegó empiece por %PDF antes de darlo por
 * bueno; si no, se devuelve null y la cotización sale sin adjunto en vez de
 * salir con un HTML pegado al final. */
async function bajarDeDrive(id, destino) {
  const url = 'https://drive.google.com/uc?export=download&id=' + id;
  const r = await fetch(url, { redirect: 'follow' });
  if (!r.ok) return null;
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.slice(0, 4).toString() !== '%PDF') return null;
  fs.writeFileSync(destino, buf);
  return destino;
}

async function main() {
  const spec = process.argv[2];
  if (!spec) {
    console.error('uso: node scripts/generar_cotizacion.js <solicitud.json>');
    process.exit(1);
  }
  const c = leerJSON(path.resolve(spec));
  /* La foto de un item puede venir como ruta del repositorio
     (img/cotizacion/items/…): se resuelve contra el sitio servido, para que
     la solicitud no dependa de una direccion de este equipo. */
  (c.doc.items || []).forEach(it => {
    if (it.f && !/^https?:\/\//.test(it.f)) it.f = SITIO + '/' + String(it.f).replace(/^\//, '');
  });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cot-'));

  const b = await chromium.launch({ args: ['--no-sandbox'] });
  const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
  pg.on('pageerror', e => console.log('  aviso del navegador:', e.message));
  const ruta = c.tipo === 'alquiler' ? '#/cotizar' : '#/cotizar-venta';
  await pg.goto(SITIO + '/' + ruta, { waitUntil: 'networkidle', timeout: 60000 });
  await pg.waitForTimeout(3000);

  const r = await pg.evaluate(async ({ datos, terminos }) => {
    /* Los terminos son los mismos para todo el catalogo, y casi siempre
       sirven. Pero una cotizacion de un accesorio a medida no puede decir
       «capacitacion de uso» ni «atencion en nuestro taller»: queda ridicula
       delante de un comprador. «terminos» reemplaza el texto de los que
       haga falta, buscandolos por su nombre y no por su numero, para que no
       se descoloquen si manana se agrega uno. */
    if (terminos && typeof vcTerminos === 'function') {
      const orig = vcTerminos;
      window.vcTerminos = function (d) {
        const L = orig(d);
        Object.keys(terminos).forEach(clave => {
          const i = L.findIndex(t => t[0].toLowerCase().indexOf(clave.toLowerCase()) >= 0);
          if (i >= 0) L[i] = [L[i][0], terminos[clave]];
        });
        return L;
      };
    }
    /* El catálogo de venta no se carga solo en esta pantalla; sin él los
       equipos salen sin marca y sin foto. */
    await new Promise(res => {
      try { cotConCatalogo(datos, res); setTimeout(res, 4000); } catch (e) { res(); }
    });
    try { return { html: cotHTML(datos, true) }; }
    catch (e) { return { error: String(e.message) }; }
  }, { datos: c.doc, terminos: c.terminos || null });

  if (r.error) { console.error('ERROR al dibujar la hoja:', r.error); await b.close(); process.exit(1); }

  const hoja = path.join(tmp, 'cotizacion.pdf');
  const pg2 = await b.newPage();
  await pg2.setContent(r.html, { waitUntil: 'networkidle', timeout: 60000 });
  await pg2.waitForTimeout(2500);
  await pg2.pdf({ path: hoja, format: 'A4', printBackground: true,
                  margin: { top: '0', bottom: '0', left: '0', right: '0' } });
  await b.close();
  console.log('Hoja de cotización lista.');

  /* El documento del fabricante, si el equipo tiene uno registrado. */
  const partes = [hoja];
  const id = (c.doc.items && c.doc.items[0] || {}).i;
  const cod = c.codigo || codigoDe(id);
  const docs = documentosDe(cod, c.adjuntar);
  if (!cod) {
    console.log('Sin código de proveedor para «' + id + '»: va sin adjunto.');
  } else if (!docs.length) {
    console.log('El código ' + cod + ' no tiene documentos en data/documentos.json: va sin adjunto.');
  } else {
    for (const d of docs) {
      const dest = path.join(tmp, d.tipo + '-' + d.id + '.pdf');
      const ok = await bajarDeDrive(d.id, dest);
      if (ok) { partes.push(ok); console.log('Adjunto: ' + d.nombre + ' (' + cod + ')'); }
      else    { console.log('NO se pudo bajar de Drive: ' + d.nombre + ' (' + d.id + ')'); }
    }
  }

  const salida = path.resolve(c.salida || ('Cotizacion ' + c.doc.num + '.pdf'));
  if (partes.length === 1) fs.copyFileSync(hoja, salida);
  else execFileSync('pdfunite', partes.concat([salida]));

  const kb = Math.round(fs.statSync(salida).size / 1024);
  console.log('\nPDF: ' + salida + '  (' + kb + ' KB)');
  fs.rmSync(tmp, { recursive: true, force: true });
}

main().catch(e => { console.error(e); process.exit(1); });
