/* =====================================================================
   proveedor-atl.js — botón «Actualizar Sinergia» para altokelite.com
   ---------------------------------------------------------------------
   NO es parte de la web: lo carga un favorito del navegador estando
   DENTRO del portal del proveedor (ya con usuario y clave). El portal
   solo acepta conexiones desde Perú, por eso la lectura no puede hacerla
   un servidor: la hace el navegador de Sinergia.

   Qué hace:
   1. Pide al Apps Script los códigos de la hoja de venta.
   2. Pide el catálogo al portal con la misma consulta de su botón «Ver más
      productos», en bloques de 200 (una consulta a la vez y con pausa de
      3 s), y lee de cada tarjeta:
        addCesta('009.055','5481','1','0','1.22','')
                  código    stock            precio US$ (IGV incl.)
   3. Lee el tipo de cambio de la cabecera («TC: S/ 3.471»).
   4. Manda al Apps Script solo los códigos de Sinergia; el script
      escribe precio (en soles), stock y fecha en la hoja.

   El favorito lo genera crearBotonProveedor() en Apps Script y define
   window.SB_ATL = {k: clave, u: url del Apps Script}.
   ===================================================================== */
(function () {
  'use strict';
  var CFG = window.SB_ATL || {};
  /* Trato amable con el portal: pocas consultas, una a la vez y con pausa,
     como lo haría una persona. */
  /* Bloques CHICOS. Se empezó pidiendo 500 productos de una vez y el
     portal dejó de contestar: dos consultas seguidas devolvieron algo que
     no era un listado y la corrida murió sin leer un solo equipo. Un
     bloque chico tarda menos en armarse del lado del portal, cabe en
     cualquier conexión y, si una falla, se pierde poco. Se prueban de
     mayor a menor hasta que una traiga tarjetas. */
  var BLOQUES = [200, 100, 50];
  var MAX_CONSULTAS = 48;     // tope total de consultas al portal por uso
  var PAUSA = 3000;           // ms entre una consulta y la siguiente
  var REUSO_MIN = 60;         // si se usó hace menos de esto, pide confirmar
  var LOTE_FOTOS = 100;       // fotos por clic (una descarga cada ~3 s)
  /* 20 y no más: cada equipo son 1 consulta de lista + hasta 3 descargas,
     así que 20 equipos ya son ~80 peticiones, parecido a un lote de fotos.
     Con 40 serían 160, más tráfico del que hemos hecho nunca, y un PDF pesa
     bastante más que una foto. */
  var LOTE_DOCS = 20;         // equipos a los que se les piden documentos por clic
  var ESPERA_MAX = 45000;     // ms por bloque

  /* ── Panel flotante ─────────────────────────────────────────────── */
  var caja = document.getElementById('sbAtl');
  if (caja) caja.remove();
  caja = document.createElement('div');
  caja.id = 'sbAtl';
  caja.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:2147483647;width:340px;max-width:92vw;' +
    'background:#17191d;color:#f5f3ee;border-radius:14px;box-shadow:0 18px 50px rgba(0,0,0,.35);' +
    'font:14px/1.45 system-ui,Segoe UI,Arial,sans-serif;padding:18px 18px 16px';
  caja.innerHTML = '<div style="font-weight:700;font-size:15px;margin-bottom:6px">Sinergia · actualizar precios y stock</div>' +
    '<div id="sbAtlTxt">Preparando…</div>' +
    '<div style="height:6px;background:#333;border-radius:9px;margin:12px 0 4px;overflow:hidden"><div id="sbAtlBar" style="height:100%;width:0;background:#c0a56e;transition:width .3s"></div></div>' +
    '<div id="sbAtlBtns" style="margin-top:10px;display:flex;gap:8px;justify-content:flex-end"></div>';
  document.body.appendChild(caja);
  function txt(t) { document.getElementById('sbAtlTxt').innerHTML = t; }
  /* Un mensaje con los segundos corriendo. Mientras una consulta está en
     curso el panel se quedaba con el texto fijo, sin reloj y sin señal de
     vida: no había forma de distinguir «va lento» de «se colgó». */
  function conReloj(mensaje) {
    var t0 = Date.now(), vivo = true;
    var pinta = function () {
      if (!vivo) return;
      var s = Math.round((Date.now() - t0) / 1000);
      txt(mensaje + (s ? ' · ' + s + ' s' : '') + '…');
    };
    pinta();
    var id = setInterval(pinta, 1000);
    return { parar: function () { vivo = false; clearInterval(id); } };
  }

  /* Rastro en la consola del navegador (F12 > Console). El panel negro
     dice lo justo para el dueño; aquí queda el detalle para pegárselo a
     Claude cuando algo falle: qué se pidió, qué contestó el portal, con
     qué código y en cuántos milisegundos. Sin esto, «no devolvió
     productos» puede ser cinco cosas distintas y no hay forma de saber
     cuál. */
  function log() {
    try {
      var a = ['%c[Sinergia]', 'color:#9A7F4E;font-weight:bold'];
      for (var i = 0; i < arguments.length; i++) a.push(arguments[i]);
      console.log.apply(console, a);
    } catch (e) { }
  }
  function bar(p) { document.getElementById('sbAtlBar').style.width = Math.round(p * 100) + '%'; }
  function boton(t, fn) {
    var b = document.createElement('button');
    b.textContent = t;
    b.style.cssText = 'font:inherit;font-weight:600;border:0;border-radius:8px;padding:7px 12px;cursor:pointer;background:#c0a56e;color:#17191d';
    b.onclick = fn; document.getElementById('sbAtlBtns').appendChild(b);
  }
  function cerrar() { parar = true; caja.remove(); }
  function error(t) { txt('<b style="color:#ff9b8a">No se pudo completar.</b><br>' + t); boton('Cerrar', cerrar); }

  /* ── Comprobaciones ─────────────────────────────────────────────── */
  if (!CFG.k || !CFG.u) return error('El favorito no tiene la clave. Vuelve a crearlo con crearBotonProveedor() en Apps Script.');
  if (!/altokelite\.com$/.test(location.hostname)) return error('Abre primero <b>altokelite.com</b> (con tu sesión iniciada) y luego toca el favorito.');
  if (typeof window.searchProdBloque !== 'function') {
    txt('Te llevo a la página de Productos del portal. Cuando cargue, toca el favorito otra vez.');
    setTimeout(function () { location.href = '/view/products/?s=&m=&c=&p=&u=&u2=&tp=2'; }, 1500);
    return;
  }

  var cod6 = function (c) { var d = String(c).replace(/\D/g, ''); return ('000000' + d).slice(-6); };
  /* Tipo de cambio de la cabecera («TC: S/ 3.471»). Se busca en todo el HTML
     (en pantallas angostas la cabecera puede estar oculta) y se recuerda el
     último leído por si un día no aparece. */
  var tcM = (document.documentElement.innerHTML.replace(/<[^>]+>/g, ' ').match(/TC:?\s*S\/\.?\s*([\d]+[.,]\d+)/) || [])[1];
  var TC = tcM ? Number(tcM.replace(',', '.')) : 0;
  try {
    if (TC > 1 && TC < 10) localStorage.setItem('sbAtlTC', String(TC));
    else TC = Number(localStorage.getItem('sbAtlTC')) || 0;
  } catch (e) { }
  var RX = /addCesta\(\s*'([\d.]+)'\s*,\s*'(\d+)'\s*,\s*'[^']*'\s*,\s*'[^']*'\s*,\s*'([\d.]+)'/g;

  /* Pide al portal los productos [desde, hasta] con la misma consulta que
     hace su botón «Ver más productos» (controller_home.php), pero sin
     dibujar nada ni disparar los filtros laterales: 1 consulta = 1 pedido. */
  /* Filtros que la persona dejó puestos en el portal (p. ej. «EQUIPOS»).
     Se toman tal cual del botón «Ver más productos» de la página, que ya
     trae los valores en el formato del portal; si no hay botón, de la URL. */
  var FIL = (function () {
    var el = document.querySelector('[onclick*="searchProdBloque("]');
    var m = el && el.getAttribute('onclick').match(/searchProdBloque\(([^)]*)\)/);
    if (m) {
      var a = m[1].split(',').map(function (x) { return x.trim().replace(/^'|'$/g, ''); });
      if (a.length >= 12) return { s: a[0], m: a[1], c: a[2], p: a[8], u: a[9], u2: a[10], tp: a[11] };
    }
    var q = new URLSearchParams(location.search), r = {};
    ['s', 'm', 'c', 'p', 'u', 'u2', 'tp'].forEach(function (k) { r[k] = q.get(k) || ''; });
    return r;
  })();
  /* ¿Había un filtro puesto en la página del portal? Se mira ANTES de
     forzar el nuestro. De esto depende que la hoja se atreva a poner en
     cero el stock de lo que hoy no salga: con un filtro puesto, lo que no
     sale puede estar perfectamente en stock y solo quedar fuera del filtro.

     Estaba escrito «var FILTRADO = true» a secas, sin cambiarlo nunca. Como
     la regla de poner en cero exige «!FILTRADO», esa regla NO SE EJECUTÓ
     NUNCA, ni siquiera después de arreglar el otro guardia que la bloqueaba.
     Dos candados en serie sobre la misma puerta.

     Y «Tipo = Equipos» (tp = 2) NO cuenta como filtro: es exactamente lo
     que el favorito pide por su cuenta cuando no hay ninguno, y es TODO el
     catálogo que a Sinergia le interesa. Contarlo como filtro dejaba la
     regla bloqueada otra vez para cualquiera que tuviera ese chip puesto en
     la página, que es lo normal al navegar el portal. */
  var FILTRADO = !!(FIL.s || FIL.m || FIL.c || FIL.p || FIL.u || FIL.u2 ||
                    (FIL.tp && FIL.tp !== '2'));
  if (!FIL.tp) FIL.tp = '2';

  function bloque(desde, hasta, pagina, nrodivs) {
    return new Promise(function (ok) {
      var f = new FormData();
      [['tipoAccion', 'searchProdBloque'], ['searchProd', FIL.s], ['searchMarca', FIL.m], ['searchCategoria', FIL.c],
       ['inicio', desde], ['final', hasta], ['nrodivs', nrodivs], ['idDiv', pagina],
       ['searchPais', FIL.p], ['searchPrecio', FIL.u], ['searchPrecio2', FIL.u2], ['searchTipoprd', FIL.tp]]
        .forEach(function (x) { f.append(x[0], String(x[1])); });
      var x = new XMLHttpRequest();
      x.open('POST', '/controlador/controller_home.php', true);
      /* 45 s y no 90: cuando el portal deja de contestar, el navegador se
         queda esperando el tope entero sin decir nada. Con tres tamaños de
         bloque que probar, 90 s eran cuatro minutos y medio de silencio
         antes del aviso; 45 s sobran para un bloque de 200 productos. */
      x.timeout = ESPERA_MAX;
      /* Se devuelve SIEMPRE el detalle de lo que pasó, no solo el texto.
         Antes, un 403, un 500, un corte de red y una respuesta vacía
         acababan los cuatro en la misma cadena vacía, y el aviso culpaba
         a la sesión aunque la sesión estuviera perfecta. */
      var t0 = Date.now();
      var fin = function (motivo, estado, texto) {
        var r = { texto: texto || '', estado: estado || 0, motivo: motivo,
                  ms: Date.now() - t0, kb: Math.round((texto || '').length / 1024) };
        log('consulta → ' + motivo + ' · HTTP ' + r.estado + ' · ' + r.ms + ' ms · ' + r.kb + ' KB'
            + (r.texto ? ' · ¿trae tarjetas? ' + (/card card-product/.test(r.texto) ? 'sí' : 'NO') : ''));
        if (r.texto && !/card card-product/.test(r.texto)) log('   el portal contestó: ' + recorte(r.texto));
        ok(r);
      };
      x.onload = function () {
        fin(x.status === 200 ? 'respuesta' : 'error del portal', x.status,
            x.status === 200 ? x.responseText : '');
      };
      x.onerror = function () { fin('sin respuesta (red)', 0, ''); };
      x.ontimeout = function () { fin('pasó de ' + Math.round(ESPERA_MAX / 1000) + ' segundos', 0, ''); };
      x.send(f);
    });
  }
  /* Lee las tarjetas de producto del HTML tal como llega del portal (sin
     pasar por el DOM: el portal no escapa las comillas del título y el DOM
     lo corta en «5"»). De cada tarjeta: código, stock y precio (addCesta),
     descripción completa, modelo del proveedor y foto.
     Devuelve {nuevos, tarjetas}. Las tarjetas sin botón de compra son las
     AGOTADAS, y SÍ se guardan, con stock 0: que el portal deje de ofrecer
     un equipo es justo la señal de que no hay stock, y es lo que tiene que
     llegar a la hoja para que la web deje de anunciarlo. Antes este
     comentario decía que no se guardaban; el código de abajo sí lo hacía. */
  var saltadas = 0;   // tarjetas agotadas de las que no se pudo sacar el código
  /* Y una muestra de las dos primeras, para poder mirarlas. Sin ver el HTML
     de una tarjeta de estas no hay forma de saber dónde esconde el portal su
     código, y escribir expresiones a ciegas es perder corridas. */
  var muestras = [];
  var DEC = document.createElement('textarea');
  function texto(t) { DEC.innerHTML = String(t || '').replace(/<[^>]*>/g, ' '); return DEC.value.replace(/\s+/g, ' ').trim(); }

  function leer(html, mapa) {
    var trozos = String(html || '').split(/class="card card-product/).slice(1), nuevos = 0;
    if (!trozos.length) trozos = [String(html || '')];
    trozos.forEach(function (t) {
      RX.lastIndex = 0;
      var m = RX.exec(t);
      if (!m) {
        /* «Agotado»: sin botón de compra. El código sale del nombre de la
           foto (products/080.741.png) o de algún onclick; stock 0. */
        var cm = t.match(/products\/(\d{2,3}\.\d{3})\.\w+/)
             || t.match(/onclick="[^"]*'(\d{2,3}\.\d{3})'/)
             || t.match(/\bdata-(?:cod|codigo|producto)="(\d{2,3}\.\d{3})"/)
             || t.match(/\bvalue="(\d{3}\.\d{3})"/)
             /* Último recurso: el código suelto en el texto de la tarjeta.
                Se exige que no venga pegado a otra cifra, para no confundirlo
                con un precio como «1,234.567». */
             || t.match(/(?:^|[^\d,.])(\d{3}\.\d{3})(?![\d.])/);
        /* Sin código no hay forma de casarla con la hoja. Se cuentan para
           avisarlo al final: si salen muchas, hay equipos agotados que no
           llegan a la hoja y la web los sigue anunciando con stock viejo. */
        /* EL CÓDIGO NO ESTÁ EN LA TARJETA. Comprobado el 28/10 con el HTML
           real de dos de ellas: la foto es «img_default.jpg», el chip lleva
           el MODELO («iM70», «Duplex 2.0») y el enlace lleva el código
           CIFRADO (?cd=…), nunca el 083.025. El número solo aparece dentro
           del botón «Añadir al carrito», y un equipo agotado no lo tiene.

           Así que la tarjeta ya NO se tira. Se manda sin código, con su
           descripción, su modelo y su precio, y es la hoja la que la casa
           por marca y modelo (matchModelo_ en Venta.gs). Antes se perdían
           258 de 798 en cada corrida, y sus equipos se quedaban con el
           precio y el stock del último día en que hubo existencias. */
        var pm = t.match(/US\$\s*([\d,]+(?:\.\d+)?)/);
        var sinCodigo = !cm;
        if (sinCodigo) {
          saltadas++;
          if (muestras.length < 2) muestras.push(t.slice(0, 2500));
        }
        m = [null, sinCodigo ? '' : cm[1], '0', pm ? pm[1].replace(/,/g, '') : '0'];
      }
      var tit = (t.match(/<h3[^>]*?title="([\s\S]*?)">/) || [])[1] || (t.match(/<h3[^>]*>([\s\S]*?)<\/h3>/) || [])[1] || '';
      var al = (t.match(/class="alert[^"]*"[^>]*>([\s\S]*?)<\/div>/) || [])[1] || '';
      var src = (t.match(/<img[^>]*src="([^"]+)"/) || [])[1] || '';
      try { src = src && !/img_default/.test(src) ? new URL(src, location.href).href : ''; } catch (e) { src = ''; }
      /* Enlace a la ficha del equipo. El portal identifica cada producto con
         un código cifrado (?cd=…), no con el 101.127, así que sin guardar
         este enlace no hay forma de volver a abrir su ficha después. Y es en
         esa ficha donde están los documentos. */
      var ur = (t.match(/href="([^"]*product-details[^"]*)"/) || [])[1] || '';
      try { ur = ur ? new URL(ur.replace(/&amp;/g, '&'), location.href).href : ''; } catch (e) { ur = ''; }
      /* Sin código, la clave sale del ?cd= del enlace, que el portal usa
         para identificar el producto y es único y estable. Sin algo así,
         todas las tarjetas sin código caerían en la misma clave y se
         pisarían entre ellas. */
      var cdu = sinCodigo ? ((ur.match(/[?&]cd=([^&]+)/) || [])[1] || texto(tit)) : '';
      var k = sinCodigo ? ('sc:' + cdu) : cod6(m[1]);
      if (!mapa[k]) nuevos++;
      mapa[k] = { c: m[1], s: Number(m[2]) || 0, p: Number(m[3]) || 0, d: texto(tit), mo: texto(al), img: src, u: ur };
    });
    return { nuevos: nuevos, tarjetas: /card card-product/.test(html || '') ? trozos.length : nuevos };
  }

  /* ── Conexión con el Apps Script ────────────────────────────────────
     Algunos portales reemplazan window.fetch por una versión propia que
     nunca responde a otros dominios. Se usa un fetch «limpio» tomado de un
     iframe en blanco y, si falla o tarda, XMLHttpRequest. Nunca se queda
     esperando sin límite. */
  var fetchLimpio = (function () {
    try {
      var f = document.createElement('iframe');
      f.style.display = 'none'; document.body.appendChild(f);
      var nf = f.contentWindow.fetch;
      return nf ? nf.bind(f.contentWindow) : null;
    } catch (e) { return null; }
  })();
  function conLimite(p, ms) {
    return Promise.race([p, new Promise(function (_, no) { setTimeout(function () { no(new Error('tiempo')); }, ms); })]);
  }
  /* Devuelve {estado, texto}. El estado importa: onload también se dispara
     con un 404 o un 500, así que sin mirarlo una página de error se leía
     como si fuera la respuesta buena. */
  function xhrFull(metodo, url, cuerpo, ms, cab) {
    return new Promise(function (ok, no) {
      var x = new XMLHttpRequest();
      x.open(metodo, url, true);
      x.timeout = ms;
      var tipoPuesto = false;
      if (cab) for (var k in cab) if (Object.prototype.hasOwnProperty.call(cab, k)) {
        x.setRequestHeader(k, cab[k]);
        if (k.toLowerCase() === 'content-type') tipoPuesto = true;
      }
      /* Solo para texto: a un FormData hay que dejar que el navegador ponga
         su propio Content-Type, que lleva el «boundary». */
      if (!tipoPuesto && cuerpo && typeof cuerpo === 'string') x.setRequestHeader('Content-Type', 'text/plain;charset=utf-8');
      x.onload = function () { ok({ estado: x.status, texto: x.responseText }); };
      x.onerror = function () { no(new Error('red')); };
      x.ontimeout = function () { no(new Error('tiempo')); };
      x.send(cuerpo || null);
    });
  }
  function xhr(metodo, url, cuerpo, ms) {
    return xhrFull(metodo, url, cuerpo, ms).then(function (r) { return r.texto; });
  }
  async function pedirJSON(url) {
    var errores = [];
    if (fetchLimpio) {
      try { return await conLimite(fetchLimpio(url).then(function (r) { return r.json(); }), 25000); }
      catch (e) { errores.push('fetch: ' + (e && e.message || e)); }
    }
    try { return JSON.parse(await xhr('GET', url, null, 30000)); }
    catch (e) { errores.push('xhr: ' + (e && e.message || e)); }
    throw new Error('No hubo conexión con tu hoja (' + errores.join(' · ') + ').');
  }
  async function enviar(cuerpo) {
    if (fetchLimpio) {
      try { await conLimite(fetchLimpio(CFG.u, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: cuerpo }), 30000); return; }
      catch (e) { /* se intenta con XHR */ }
    }
    /* La respuesta puede no ser legible (otro dominio); basta con que llegue. */
    try { await xhr('POST', CFG.u, cuerpo, 30000); } catch (e) { }
  }

  /* ── Evitar usos seguidos ───────────────────────────────────────── */
  var ultimo = 0;
  try { ultimo = Number(localStorage.getItem('sbAtlUltimo')) || 0; } catch (e) { }
  var hace = Math.round((Date.now() - ultimo) / 60000);
  if (ultimo && hace < REUSO_MIN) {
    txt('Ya actualizaste hace <b>' + hace + ' min</b>. Para no cargar al portal del proveedor, ' +
      'conviene usarlo solo una vez por semana (o cuando cambien precios).');
    boton('Solo fotos y documentos', function () { document.getElementById('sbAtlBtns').innerHTML = ''; txt('Buscando pendientes…');
      ofrecerFotos(true).then(ofrecerDocs.bind(null, true)).then(function () { boton('Cerrar', cerrar); }); });
    boton('Actualizar igual', function () { document.getElementById('sbAtlBtns').innerHTML = ''; correr(); });
    boton('Cerrar', cerrar);
  } else correr();

  /* ── Fotos: copia a Drive las de tus equipos publicados que no tienen ──
     Una descarga por foto, de una en una y con pausa; solo se hace una vez
     por equipo (después ya tienen foto y no vuelven a la lista). */
  var parar = false;
  function aBase64(blob) {
    return new Promise(function (ok, no) {
      var r = new FileReader();
      r.onload = function () { ok(String(r.result).split(',')[1] || ''); };
      r.onerror = no; r.readAsDataURL(blob);
    });
  }
  async function ofrecerFotos(solo) {
    var fp = {};
    try { fp = await pedirJSON(CFG.u + '?atl=fotos&k=' + encodeURIComponent(CFG.k)); } catch (e) { if (solo) txt('No pude consultar tu hoja. Intenta de nuevo.'); return; }
    var lista = (fp && fp.fotos) || [];
    if (!lista.length) { if (solo) txt('No hay fotos pendientes: las del proveedor ya están en tu Drive.'); return; }
    if (solo) txt('');
    var p = document.createElement('div');
    p.style.cssText = 'margin-top:10px;padding-top:10px;border-top:1px solid #333';
    p.innerHTML = '📷 Hay <b>' + lista.length + '</b> fotos del proveedor que aún no están en tu Drive. Se guardan una sola vez ' +
      '(primero las de tus equipos publicados) y quedan listas para cuando publiques o haya stock.';
    document.getElementById('sbAtlTxt').appendChild(p);
    var lote = lista.slice(0, LOTE_FOTOS);
    if (lista.length > LOTE_FOTOS) p.innerHTML += '<br>Se copian de ' + LOTE_FOTOS + ' en ' + LOTE_FOTOS + ': vuelve a tocar el favorito otro día para seguir.';
    boton('Copiar ' + lote.length + ' fotos', function () { this.remove(); copiarFotos(lote); });
  }
  /* ── Documentos: ficha técnica, catálogo del fabricante y registro
     sanitario ────────────────────────────────────────────────────────
     El portal los guarda por equipo y los entrega con dos llamadas:

       1. POST controller_pedido.php  tipoAccion=viewArchivosProd
          codProd=008.014            → el HTML con la lista de documentos
       2. GET  ctr_descargarDoc.php?op=<código en base64>&tipo=…&t=…
                                     → el PDF

     Se piden de LOTE_DOCS en LOTE_DOCS equipos, de uno en uno y con pausa,
     igual que las fotos. Un equipo que no tiene ninguno se anota también,
     para no volver a preguntar por él la próxima vez. */
  var RX_DESCARGA = /descargarDoc\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*\)/g;

  /* El nombre visible va ANTES del botón en el HTML del portal:

       <span …>Catálogo Traducido</span> … <button onclick="descargarDoc(…)">

     así que se busca en el trozo que PRECEDE a la llamada, no en el que
     sigue. Mirando el de después, cada documento se quedaba con el nombre
     del siguiente. */
  function nombreDoc(antes) {
    var t = String(antes || '').slice(-600), m, ult = '';
    var rx = /<span[^>]*>([^<]{3,80})<\/span>/g;
    while ((m = rx.exec(t))) { var v = texto(m[1]); if (v) ult = v; }
    return ult;
  }

  /* ── Blindaje ──────────────────────────────────────────────────────
     Un equipo marcado como «sin documentos» no se vuelve a consultar
     NUNCA. Así que esa marca solo se pone cuando hay certeza, y la
     certeza es que el portal haya devuelto el panel de documentos.

     La primera corrida real devolvió 0 de 20 en equipos que sí tienen
     documentos en el portal: la consulta no le llegó como él la espera,
     y los 20 se iban a perder. De ahí estas tres reglas:

       1. Se prueban varias formas de preguntar hasta que una devuelva el
          panel. La que funciona se recuerda y se usa primero la próxima
          vez, así el portal puede cambiar sin que haya que tocar nada.
       2. Ante la duda NO se anota nada. Ni la respuesta vacía, ni el
          error del servidor, ni la pantalla de ingreso: se reintenta.
       3. Si los primeros equipos fallan, la corrida se detiene sola en
          vez de gastar la tanda, y muestra lo que contestó el portal
          para poder arreglarlo de raíz.                                */
  function esPanel(t) {
    t = String(t || '');
    if (/descargarDoc\(/.test(t)) return true;             // trae documentos: seguro
    if (t.replace(/\s+/g, '').length < 20) return false;   // respuesta vacía
    if (/iniciar\s*sesi|ingrese\s*su|login|password|no\s*autorizado|sesi[oó]n[^<]{0,30}(expir|caduc|finaliz|cerrad)/i.test(t)) return false;
    /* Sin documentos, pero contestando: el panel tiene que hablar de
       archivos. Si no dice nada de eso, no sabemos qué nos devolvió y
       preferimos volver a preguntar otro día. */
    return /archivo|adjunt|document|descarg|no\s*se\s*(encontr|hall)|sin\s*registr/i.test(t);
  }

  /* Formas de pedir el panel. La primera es exactamente la del portal:
     jQuery manda FormData y añade solo él la cabecera X-Requested-With,
     que muchos controladores en PHP exigen para contestar. Esa cabecera
     es lo que le faltaba a la primera corrida. */
  var FORMAS_DOCS = [
    { n: 'formdata+ajax',        multi: true,  punto: true,  ajax: true },
    { n: 'formdata',             multi: true,  punto: true,  ajax: false },
    { n: 'urlencoded',           multi: false, punto: true,  ajax: true },
    { n: 'urlencoded-sin-punto', multi: false, punto: false, ajax: true }
  ];
  function formaRecordada() {
    try { return localStorage.getItem('sbAtlFormaDocs') || ''; } catch (e) { return ''; }
  }
  /* El camino bueno: abrir la ficha del equipo, igual que una persona.

     La ficha YA trae los documentos dentro, en el bloque «divDocProd»: no
     hace falta pedirle nada aparte al portal. Lo que no se puede es
     adivinar su dirección, porque el portal identifica cada producto con
     un código cifrado (?cd=…) y no con el 101.127; por eso el enlace se
     guarda en la pestaña «Proveedor» cada vez que se actualizan precios. */
  function fichaValida(t) {
    t = String(t || '');
    return /divDocProd|id="technicalSheet"/.test(t);
  }
  /* CUÁNTOS documentos dice el portal que tiene. Lo pone él mismo en la
     etiqueta de la pestaña «Ficha técnica»:

         <span class="badge …"><div id="divCountDoc">2</div></span>

     Es el único juez fiable de si los trajimos todos: el bloque de
     documentos se rellena por JavaScript al pulsar la pestaña, así que la
     página recién pedida puede venir con el bloque VACÍO aunque el equipo
     tenga seis. Sin este número, cero documentos y «no tiene ninguno» son
     indistinguibles, y el equipo se marcaba como revisado para siempre. */
  function cuantosDice(t) {
    var m = String(t || '').match(/id="divCountDoc"[^>]*>\s*(\d+)/);
    return m ? Number(m[1]) : -1;      // -1: el portal no lo dice
  }
  function docsDeFicha(html) {
    var t = String(html || ''), i = t.indexOf('divDocProd');
    if (i < 0) return [];
    var j = t.indexOf('id="healthRegistration"', i);
    return leerDocs(t.slice(i, j > i ? j : i + 30000));
  }
  /* La ficha se pide COMO LA PIDE UNA PERSONA, sin la cabecera
     «X-Requested-With». Se mandaba, y es la cabecera con la que se piden
     fragmentos por AJAX: el portal devolvía otra cosa, sin el bloque de
     documentos, así que fichaValida() fallaba y el equipo se quedaba con
     lo poco que diera el panel aparte.

     Lo que costaba: el Edan SD-5 (075.554) tiene SEIS documentos en su
     pestaña «Ficha técnica» —catálogo traducido, catálogo original,
     MANUALES, registro sanitario y dos de especificaciones técnicas— y en
     Drive solo quedó uno. Con la página guardada a mano desde el navegador
     el lector encuentra los seis.

     Si aun así no viniera el bloque, se reintenta con la cabecera: puede
     que algún día el portal cambie de idea. */
  /* Cuántos documentos dice el portal que tiene, preguntándoselo.

     El número que la página enseña en la pestaña lo pone su propio
     JavaScript con esta misma llamada (countArchivosProd en ajaxV11.js),
     así que en la página recién pedida viene VACÍO. Preguntándolo aquí se
     tiene el dato de verdad, y con él se sabe si llegaron todos o faltan.

     Si el portal no contesta un número, se devuelve -1 y se sigue como si
     no lo hubiera dicho: nunca se da un equipo por completo sin saberlo. */
  async function pedirCuantos(cod) {
    var visible = cod.slice(0, 3) + '.' + cod.slice(3);
    var cuerpo = new FormData();
    cuerpo.append('tipoAccion', 'countArchivosProd');
    cuerpo.append('codProd', visible);
    try {
      var r = await xhrFull('POST', '/controlador/controller_pedido.php', cuerpo, 20000,
                            { 'X-Requested-With': 'XMLHttpRequest' });
      if (r.estado < 200 || r.estado >= 400) return -1;
      var m = String(r.texto || '').replace(/<[^>]*>/g, ' ').match(/\d+/);
      return m ? Number(m[0]) : -1;
    } catch (e) { return -1; }
  }

  async function pedirFicha(url) {
    var ultimo = null;
    for (var i = 0; i < 2; i++) {
      var cab = i ? { 'X-Requested-With': 'XMLHttpRequest' } : null, r;
      try { r = await xhrFull('GET', url, null, 30000, cab); }
      catch (e) { ultimo = { forma: 'ficha', estado: 0, texto: String((e && e.message) || e) }; continue; }
      if (r.estado >= 200 && r.estado < 400 && fichaValida(r.texto)) return { ok: true, docs: docsDeFicha(r.texto), dice: cuantosDice(r.texto) };
      ultimo = { forma: i ? 'ficha+ajax' : 'ficha', estado: r.estado, texto: r.texto };
    }
    return { ok: false, ultimo: ultimo };
  }

  /* accion: 'viewArchivosProd' (ficha técnica, catálogo del fabricante) o
     'viewRRSSProd' (registro sanitario), que son dos consultas distintas.
     vacioVale: para el registro sanitario, una respuesta vacía con código
     200 significa «este equipo no tiene registro», y es una respuesta
     válida. Solo se acepta cuando ya sabemos que la sesión está viva. */
  async function pedirPanel(cod, accion, vacioVale) {
    accion = accion || 'viewArchivosProd';
    var visible = cod.slice(0, 3) + '.' + cod.slice(3);
    var orden = FORMAS_DOCS.slice(), buena = formaRecordada();
    if (buena) orden.sort(function (a, b) { return (b.n === buena) - (a.n === buena); });
    var ultimo = null;
    for (var i = 0; i < orden.length && !parar; i++) {
      var f = orden[i], cab = {}, cuerpo;
      var cp = f.punto ? visible : cod;
      if (f.multi) {
        cuerpo = new FormData();
        cuerpo.append('tipoAccion', accion);
        cuerpo.append('codProd', cp);
      } else {
        cuerpo = 'tipoAccion=' + accion + '&codProd=' + encodeURIComponent(cp);
        cab['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
      }
      if (f.ajax) cab['X-Requested-With'] = 'XMLHttpRequest';
      var r;
      try {
        r = await xhrFull('POST', '/controlador/controller_pedido.php', cuerpo, 30000, cab);
      } catch (e) {
        ultimo = { forma: f.n, estado: 0, texto: String((e && e.message) || e) };
        continue;
      }
      ultimo = { forma: f.n, estado: r.estado, texto: r.texto };
      var bien = r.estado >= 200 && r.estado < 400 &&
        (esPanel(r.texto) || (vacioVale && String(r.texto || '').replace(/\s+/g, '').length < 20));
      if (bien) {
        try { localStorage.setItem('sbAtlFormaDocs', f.n); } catch (e) { }
        return { ok: true, docs: leerDocs(r.texto) };
      }
      await espera(800);
    }
    return { ok: false, ultimo: ultimo };
  }

  /* Un documento que no se sepa leer se CUENTA, no se tira en silencio.
     La expresión de antes exigía las tres comillas simples con contenido y
     el paréntesis de cierre justo después, así que se perdía sin avisar
     cualquier llamada con un dato vacío, con comillas dobles o con un
     cuarto argumento. De ocho formas probadas, cinco se perdían. */
  var RX_DOC = /descargarDoc\(\s*(['"])([\s\S]*?)\1\s*,\s*(['"])([\s\S]*?)\3\s*,\s*(['"])([\s\S]*?)\5/;
  var docsIlegibles = 0;
  function leerDocs(html) {
    var partes = String(html || '').split('descargarDoc('), out = [], visto = {};
    for (var i = 1; i < partes.length; i++) {
      var m = ('descargarDoc(' + partes[i]).match(RX_DOC);
      if (!m) { docsIlegibles++; log('documento que no se pudo leer: descargarDoc(' + partes[i].slice(0, 60)); continue; }
      var op = m[2], sis = m[4], tipo = m[6];
      if (!op) { docsIlegibles++; continue; }           // sin «op» no hay nada que descargar
      var clave = op + '|' + sis + '|' + tipo;
      if (visto[clave]) continue;
      visto[clave] = 1;
      out.push({ op: op, sis: sis, tipo: tipo, nom: nombreDoc(partes[i - 1]) });
    }
    return out;
  }

  async function ofrecerDocs(solo) {
    var d;
    try { d = await pedirJSON(CFG.u + '?atl=docs&k=' + encodeURIComponent(CFG.k)); } catch (e) { return; }
    var lista = (d && d.docs) || [];
    if (!lista.length) {
      if (solo) txt('No hay equipos pendientes de documentos.');
      return;
    }
    var p = document.createElement('p');
    p.style.cssText = 'margin-top:10px;padding-top:10px;border-top:1px solid #333';
    p.innerHTML = '📄 Hay <b>' + lista.length + '</b> equipos a los que no se les han buscado documentos ' +
      '(ficha técnica, catálogo del fabricante y <b>registro sanitario</b>). Se guardan una sola vez.';
    document.getElementById('sbAtlTxt').appendChild(p);
    /* Los documentos viven en la ficha de cada equipo, y la dirección de esa
       ficha se guarda al actualizar precios. Sin ninguna guardada no hay por
       dónde empezar: se avisa en vez de gastar la tanda contra el portal. */
    if (!lista.some(function (x) { return x.u; })) {
      p.innerHTML += '<br><br><span style="color:#f0c674">Para buscar documentos hace falta primero <b>actualizar precios y stock</b> una vez: ' +
        'ahí se guarda la dirección de la ficha de cada equipo, que es donde el portal tiene los documentos. ' +
        'Hazlo y vuelve a tocar el favorito.</span>';
      return;
    }
    var lote = lista.filter(function (x) { return x.u; }).slice(0, LOTE_DOCS);
    if (lista.length > LOTE_DOCS) p.innerHTML += '<br>Se revisan de ' + LOTE_DOCS + ' en ' + LOTE_DOCS + ': vuelve a tocar el favorito otro día para seguir.';
    boton('Buscar documentos de ' + lote.length + ' equipos', function () { this.remove(); bajarDocs(lote); });
  }

  /* Un pedacito de lo que contestó el portal, para poder enseñarlo sin que
     el navegador intente dibujarlo. */
  function recorte(t) {
    return String(t || '').replace(/\s+/g, ' ').trim().slice(0, 200)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  async function bajarDocs(lista) {
    var docs = 0, equipos = 0, sin = 0, fallas = 0, seguidas = 0, cortado = false, diag = null, incompletos = 0;
    for (var i = 0; i < lista.length && !parar; i++) {
      var cod = lista[i].c, visible = cod.slice(0, 3) + '.' + cod.slice(3);
      txt('Buscando documentos: <b>' + (i + 1) + ' de ' + lista.length + '</b> equipos…<br>' +
        '<span style="color:#9be3b5">' + docs + ' documentos guardados</span>' +
        '<br><span style="color:#aeb4bc">No cierres esta pestaña.</span>');
      bar(i / lista.length);
      /* Un equipo tiene documentos en DOS sitios y hay que traerlos todos:
           · ficha técnica y catálogo del fabricante → vienen en su página
           · registro sanitario → una consulta aparte (viewRRSSProd)
         Si cualquiera de las dos falla, el equipo NO se marca y vuelve a la
         cola: así no se pierde el registro sanitario por un tropiezo. Lo
         que ya se bajó no se vuelve a bajar, la hoja lo reconoce. */
      var ft = lista[i].u ? await pedirFicha(lista[i].u) : { ok: false, ultimo: null };
      /* Que la página cargue no basta: su bloque de documentos se rellena
         por JavaScript al pulsar la pestaña, así que puede venir vacío. Si
         el portal dice que hay más de los que trajimos —o si no dijo
         nada—, se pide además el panel por la otra vía y se junta todo.

         Antes bastaba con que la página cargara para dar el equipo por
         resuelto, y la otra vía no se intentaba nunca: un equipo con seis
         documentos se marcaba «no tiene ninguno» para siempre. */
      var dice = (ft.ok && typeof ft.dice === 'number' && ft.dice >= 0) ? ft.dice : await pedirCuantos(cod);
      if (!ft.ok || dice < 0 || dice > (ft.docs || []).length) {
        var alt = await pedirPanel(cod, 'viewArchivosProd');
        if (alt.ok) {
          ft = ft.ok ? { ok: true, docs: (ft.docs || []).concat(alt.docs || []), dice: dice }
                     : { ok: true, docs: alt.docs || [], dice: dice };
        }
      }
      var rs = ft.ok ? await pedirPanel(cod, 'viewRRSSProd', true) : { ok: false, ultimo: null };
      if (!ft.ok || !rs.ok) {
        /* No se anota NADA: este equipo vuelve a la cola otro día. */
        fallas++; seguidas++;
        if (!diag) diag = (ft.ok ? rs.ultimo : ft.ultimo);
        if (seguidas >= 3) { cortado = true; break; }
        await espera(2000);
        continue;
      }
      seguidas = 0;
      var vistos = {}, hallados = [];
      ft.docs.concat(rs.docs).forEach(function (d) {
        var k = d.op + '|' + d.sis + '|' + d.tipo;
        if (vistos[k]) return;
        vistos[k] = 1; hallados.push(d);
      });
      /* El portal prometía más de los que llegaron: no se marca el equipo,
         para que vuelva a la cola en vez de quedarse así para siempre. */
      /* El contador del portal cuenta SOLO la pestaña «Ficha técnica», así
         que se compara contra esos, no contra el total ya mezclado con el
         registro sanitario: si no, un registro sanitario de más taparía una
         ficha técnica de menos. */
      var deFicha = (ft.docs || []).length;
      if (dice > deFicha) {
        incompletos++;
        log('incompleto: ' + visible + ' · el portal dice ' + dice + ' y llegaron ' + deFicha);
        fallas++;
        await espera(2000);
        continue;
      }
      if (!hallados.length) {
        sin++;
        await enviar(JSON.stringify({ k: CFG.k, sinDoc: cod }));
      } else {
        equipos++;
        var bajados = true;
        for (var j = 0; j < hallados.length && !parar; j++) {
          var h = hallados[j];
          try {
            var u = '/controlador/ctr_descargarDoc.php?op=' + encodeURIComponent(h.op) +
                    '&tipo=' + encodeURIComponent(h.sis) + '&t=' + encodeURIComponent(h.tipo);
            var resp = await fetch(new URL(u, location.href).href, { credentials: 'include' });
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            var b = await resp.blob();
            if (b.size < 1000 || b.size > 2e7) throw new Error('vacío o enorme');
            await enviar(JSON.stringify({ k: CFG.k, doc: { c: cod, t: h.tipo, n: h.nom, mime: b.type || 'application/pdf', b64: await aBase64(b) } }));
            docs++;
          } catch (e) { fallas++; bajados = false; }
          await espera(1500);
        }
        /* Solo si bajaron TODOS: si uno falló, el equipo se queda sin marca
           y mañana se reintenta lo que falta. */
        if (bajados) await enviar(JSON.stringify({ k: CFG.k, revisado: cod }));
      }
      await espera(2000);
    }
    bar(1);
    if (cortado || (fallas && !docs && !sin)) {
      /* Nada que celebrar y, sobre todo, nada anotado: los equipos siguen
         en la cola. Se muestra lo que contestó el portal para arreglarlo. */
      txt('<b style="color:#f0c674">El portal no devolvió la lista de documentos.</b> ' +
        'Me detuve a propósito para no marcar equipos por error: <b>no se anotó nada</b> ' +
        'y los ' + lista.length + ' siguen en la cola para otro día.' +
        '<br><br><span style="color:#aeb4bc">Primero entra de nuevo al portal (puede ser que la sesión se haya caído) ' +
        'y vuelve a tocar el favorito. Si sigue igual, manda esta pantalla:</span>' +
        (diag ? '<br><span style="color:#8f949b;font-size:12px">forma: ' + diag.forma +
                ' · código: ' + diag.estado + '<br>' + recorte(diag.texto) + '</span>' : ''));
      return;
    }
    txt('<b style="color:#9be3b5">Documentos listos.</b> Se guardaron <b>' + docs + '</b> de <b>' + equipos + '</b> equipos' +
      (sin ? ' · ' + sin + ' no tenían ninguno' : '') + (fallas ? ' · ' + fallas + ' fallaron (se reintentan otro día)' : '') + '.' +
      (incompletos ? '<br><span style="color:#f0c674">' + incompletos + ' equipos dicen tener más documentos de los que llegaron: no se marcan y vuelven a la cola.</span>' : '') +
      (docsIlegibles ? '<br><span style="color:#f0c674">' + docsIlegibles + ' documentos del portal no se pudieron leer. Avísame si este número no es 0.</span>' : '') +
      '<br><span style="color:#aeb4bc">Quedan en la carpeta «Sinergia - Documentos venta» de tu Drive y en la pestaña «Documentos». La web los muestra en unos minutos.</span>');
  }

  async function copiarFotos(lista) {
    var hechas = 0, fallas = 0;
    for (var i = 0; i < lista.length && !parar; i++) {
      var f = lista[i];
      txt('Copiando fotos a tu Drive: <b>' + (i + 1) + ' de ' + lista.length + '</b>…<br><span style="color:#aeb4bc">Puedes seguir usando la computadora; no cierres esta pestaña.</span>');
      bar(i / lista.length);
      try {
        var u = new URL(f.img, location.href);
        if (u.hostname !== location.hostname) throw new Error('otro sitio');
        var r = await fetch(u.href, { credentials: 'include' });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        var b = await r.blob();
        if (!/^image\//.test(b.type) || b.size > 8e6) throw new Error('no es imagen');
        await enviar(JSON.stringify({ k: CFG.k, foto: { c: f.c, mime: b.type, b64: await aBase64(b) } }));
        hechas++;
      } catch (e) { fallas++; }
      await espera(2000);
    }
    bar(1);
    var quedan = '';
    try { var fp = await pedirJSON(CFG.u + '?atl=fotos&k=' + encodeURIComponent(CFG.k)); quedan = (fp.fotos || []).length; } catch (e) { }
    txt('<b style="color:#9be3b5">Fotos listas.</b> Se enviaron <b>' + hechas + '</b> a tu Drive (carpeta «Sinergia - Fotos venta»)' +
      (fallas ? '; ' + fallas + ' no se pudieron bajar' : '') + '.' +
      (quedan ? '<br>Quedan <b>' + quedan + '</b> por copiar: vuelve a tocar el favorito otro día para seguir.' : '') +
      '<br><span style="color:#aeb4bc">La web las muestra en unos minutos.</span>');
  }
  var espera = function (ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); };

  /* ── Flujo principal ────────────────────────────────────────────── */
  async function correr() {
    try {
      txt('Leyendo tu lista de equipos…');
      var j = await pedirJSON(CFG.u + '?atl=codigos&k=' + encodeURIComponent(CFG.k));
      if (!j.ok) return error('El Apps Script respondió: ' + (j.motivo || 'error') + '.');
      var mios = {}; (j.codigos || []).forEach(function (c) { mios[cod6(c)] = 1; });
      var total = Object.keys(mios).length;

      /* Se lee el catálogo en bloques grandes, de uno en uno y con pausa.
         Si el portal no acepta 500 por consulta, se prueba con 250. */
      var mapa = {}, consultas = 0, completo = false, vacios = 0;
      var espera = function (ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); };
      var hallados = function () { return Object.keys(mios).filter(function (c) { return mapa[c]; }).length; };
      /* 1.ª consulta: bloque grande. Luego se sigue desde donde terminó lo
         recibido hasta que el portal devuelva un bloque vacío (fin de la
         lista). Así sirve tanto si el portal respeta el rango pedido como
         si recorta cada respuesta. */
      var P = 0, r = null, ult = null;
      for (var t = 0; t < BLOQUES.length && !P; t++) {
        if (consultas) await espera(PAUSA);
        consultas++;
        var reloj = conReloj('Leyendo los equipos del proveedor (consulta ' + consultas
                             + ', bloques de ' + BLOQUES[t] + ')');
        log('pidiendo productos 1 a ' + BLOQUES[t]);
        ult = await bloque(1, BLOQUES[t], 1, Math.ceil(9000 / BLOQUES[t]));
        reloj.parar();
        r = leer(ult.texto, mapa);
        if (r.tarjetas === 20) return error('El portal entrega solo 20 productos por consulta. Para no hacer cientos de consultas, me detuve. Avísale a Claude.');
        if (r.tarjetas) P = BLOQUES[t];
        /* Un 429 («demasiadas consultas») o un 403 no se arreglan pidiendo
           menos productos: el portal no llegó a mirar la consulta. Insistir
           con bloques más chicos solo le manda dos consultas más a un portal
           que acaba de pedir que pares. */
        else if (ult.estado === 429 || ult.estado === 403) { log('HTTP ' + ult.estado + ': no se insiste con bloques más chicos'); break; }
        else log('con bloques de ' + BLOQUES[t] + ' no vinieron tarjetas; se prueba más chico');
      }
      /* Tres situaciones distintas, tres avisos distintos. Antes las cinco
         terminaban en «revisa tu sesión», que mandaba al dueño a repetir
         algo que ya había hecho bien. */
      if (!P) {
        var pista = !ult ? '' :
          ult.estado === 429
            ? 'El portal te está <b>frenando</b> por hacer muchas consultas (error 429). Espera un rato largo —media hora o más— y vuelve a intentar. No toques el favorito varias veces seguidas.'
          : ult.estado === 403
            ? 'El portal <b>rechazó</b> la consulta (error 403). Vuelve a entrar al portal con tu usuario y clave, abre Productos y toca el favorito otra vez.'
          : ult.estado >= 400
            ? 'El portal respondió con un error <b>' + ult.estado + '</b>. Es un problema de su lado: espera un rato y vuelve a intentar.'
          : ult.motivo !== 'respuesta'
            ? 'El portal <b>no contestó</b> (' + ult.motivo + '). Puede ser tu conexión o que el portal esté caído.'
          : 'El portal contestó, pero <b>sin productos dentro</b>. O la sesión se cerró, o cambiaron su página. Abre F12 › Console y mándale a Claude lo que aparece ahí.';
        return error('No pude leer el catálogo.<br>' + pista);
      }
      log('bloque bueno: ' + P + ' productos por consulta');
      var desde = 1 + r.tarjetas, pag = 2;
      while (consultas < MAX_CONSULTAS) {
        bar(Math.min(0.9, desde / 900));
        /* consultas + 1: el número que se pinta es el de la consulta que
           está por hacerse, no el de la anterior ya terminada. */
        var reloj2 = conReloj('Consulta ' + (consultas + 1) + ' · equipos leídos: <b>'
                              + Object.keys(mapa).length + '</b>');
        await espera(PAUSA);
        consultas++;
        var res = await bloque(desde, desde + P - 1, pag, Math.ceil(9000 / P));
        if (!res.texto) {                                   // un fallo suelto: se reintenta una vez
          log('reintento de ' + desde + ' a ' + (desde + P - 1));
          await espera(PAUSA);
          consultas++;
          res = await bloque(desde, desde + P - 1, pag, Math.ceil(9000 / P));
        }
        reloj2.parar();
        if (!res.texto) { log('sin respuesta dos veces: se envía lo leído hasta aquí'); break; }
        r = leer(res.texto, mapa);
        log('leídos ' + r.tarjetas + ' (nuevos ' + r.nuevos + ') · total ' + Object.keys(mapa).length);
        /* Fin de la lista: SOLO cuando el portal deja de devolver tarjetas.
           Antes se paraba también cuando un bloque no traía ninguna NUEVA, y
           eso cortaba la lectura a media lista: un bloque entero de repetidos
           igual adelanta la ventana («desde += r.tarjetas»), así que el
           siguiente sí puede traer novedades. Con el corte viejo se leían 542
           productos de los ~789 que tiene el tipo EQUIPOS, y los ~247 que
           quedaban fuera salían en la hoja como «no aparece hoy en el
           portal» aunque estuvieran ahí, con su precio y su stock. */
        if (!r.tarjetas) { completo = true; break; }
        vacios = r.nuevos ? 0 : vacios + 1;
        if (vacios >= 3) { completo = true; break; }   // tres seguidos sin novedad: es el final
        desde += r.tarjetas; pag++;
      }
      /* Se manda la lista completa: la hoja guarda la base del proveedor
         (pestaña «Proveedor») y hace el match por código y por marca+modelo. */
      var items = Object.keys(mapa).map(function (c) { return mapa[c]; });
      var leidos = items.length;
      bar(1);
      if (!leidos) return error('El portal no devolvió productos. Revisa que tu sesión siga abierta.');
      if (!TC) return error('No encontré el tipo de cambio («TC: S/ …») en la página. Abre Productos del portal, espera que cargue completa y vuelve a tocar el favorito.');
      try { localStorage.setItem('sbAtlUltimo', String(Date.now())); } catch (e) { }
      var id = String(Date.now());
      txt('Enviando <b>' + leidos + '</b> equipos del proveedor a tu hoja…');
      /* ¿Se leyó el catálogo entero? De eso depende que la hoja ponga en CERO
         el stock de los equipos que hoy no estaban en el portal. Poner un
         cero de más es grave: ese equipo desaparece de la web o se anuncia
         agotado sin estarlo. Así que la regla es conservadora.

         Se compara con la MEJOR lectura que se recuerde, no con la última:
         si el portal está en mantenimiento y hoy devuelve la mitad, esa
         media lectura no puede rebajar la vara para mañana. El proveedor
         avisó de un mantenimiento de sábado y domingo; una corrida en medio
         de eso no debe vaciar el stock de medio catálogo.

         Y la PRIMERA corrida nunca pone nada en cero: todavía no hay con qué
         comparar. Se limita a guardar la marca. Como el favorito se corre
         todos los días, el coste es un día.

         Historia de los guardias que había antes, los dos inútiles:
           · «leidos >= 1000», con un catálogo de 796 → nunca se cumplía.
           · «!FILTRADO», con FILTRADO escrito a true y sin cambiar nunca. */
      var MEJOR = 0;
      try { MEJOR = Number(localStorage.getItem('sbAtlMejor')) || 0; } catch (e) { }
      var entero = !FILTRADO && completo && MEJOR > 0 && leidos >= Math.round(MEJOR * 0.8);
      if (!FILTRADO && completo && leidos > MEJOR) {
        try { localStorage.setItem('sbAtlMejor', String(leidos)); } catch (e) { }
      }
      await enviar(JSON.stringify({ k: CFG.k, id: id, tc: TC, todos: true, completo: entero, items: items }));
      /* La respuesta del POST es opaca (otro dominio): se consulta el resultado
         hasta que la hoja termine de procesar este envío. */
      var est = {};
      for (var t2 = 0; t2 < 30; t2++) {
        await espera(2000);
        try { est = await pedirJSON(CFG.u + '?atl=estado&k=' + encodeURIComponent(CFG.k)); } catch (e) { est = {}; }
        if (est.id === id) break;
      }
      if (est.id !== id) return error('Los datos se enviaron, pero tu hoja no confirmó. Revisa en unos minutos si cambió la fecha (celda B2).');
      if (!est.ok) return error('Tu hoja respondió: ' + (est.motivo || 'error') + '.');
      /* ¿Se renovó la fecha de vigencia? La hoja sella B2 solo si cuadró con
         al menos la mitad de los equipos publicados, así que conviene verlo
         aquí y no ir a mirar la celda. Si la hoja aún tiene la versión
         anterior no manda «sellada» y no se enseña nada. */
      var vig = '';
      if (est.sellada === true)
        vig = 'Vigencia renovada: se contrastaron <b>' + est.verificados + '</b> de <b>' +
              est.publicados + '</b> equipos publicados.<br>';
      else if (est.sellada === false)
        vig = '<b style="color:#ffcf8a">La vigencia NO se renovó.</b> Cuadraron ' + est.verificados +
              ' de ' + est.publicados + ' publicados, y hace falta al menos la mitad.<br>';
      txt('<b style="color:#9be3b5">¡Listo!</b> Se leyeron <b>' + leidos + '</b> equipos del proveedor' + (TC ? ' (TC S/ ' + TC + ')' : '') + '.<br>' +
        'Tus equipos con precio y stock: <b>' + est.actualizados + '</b>' +
        (est.por_modelo ? ' (' + est.por_modelo + ' encontrados por marca y modelo)' : '') + '.<br>' +
        (est.pub_sin ? '<b>' + est.pub_sin + '</b> publicados no aparecen hoy en el portal' +
            (entero ? ': se les puso el stock en <b>0</b>.' : ': mira la columna «coincidencia».') + '<br>' : '') +
        (entero ? '' : '<span style="color:#f0c674">Esta lectura no se dio por completa, así que NO se puso ningún stock en cero.</span><br>') +
        (saltadas ? '<span style="color:#aeb4bc">' + saltadas + ' de esos equipos están agotados y su tarjeta no trae el código; se reconocen por marca y modelo.</span><br>' : '') +
        vig +
        '<span style="color:#aeb4bc">La lista completa quedó en la pestaña «Proveedor». La web se actualiza sola en unos minutos.</span>');
      await ofrecerFotos();
      await ofrecerDocs();
      boton('Cerrar', cerrar);
    } catch (e) {
      error(String(e && e.message || e));
    }
  }
})();
