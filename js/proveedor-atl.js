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
      productos», en bloques de 500 (≈17 consultas, una a la vez y con
      pausa), y lee de cada tarjeta:
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
  var BLOQUES = [500, 250];   // productos por consulta (si 500 falla, 250)
  var MAX_CONSULTAS = 36;     // tope total de consultas al portal por uso
  var PAUSA = 3000;           // ms entre una consulta y la siguiente
  var REUSO_MIN = 60;         // si se usó hace menos de esto, pide confirmar
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
  /* Sin filtro puesto, se usa Tipo = EQUIPOS (tp=2, ≈789 productos): 2 consultas. */
  if (!(FIL.s || FIL.m || FIL.c || FIL.p || FIL.u || FIL.u2 || FIL.tp)) FIL.tp = '2';
  var FILTRADO = true;

  function bloque(desde, hasta, pagina, nrodivs) {
    return new Promise(function (ok) {
      var f = new FormData();
      [['tipoAccion', 'searchProdBloque'], ['searchProd', FIL.s], ['searchMarca', FIL.m], ['searchCategoria', FIL.c],
       ['inicio', desde], ['final', hasta], ['nrodivs', nrodivs], ['idDiv', pagina],
       ['searchPais', FIL.p], ['searchPrecio', FIL.u], ['searchPrecio2', FIL.u2], ['searchTipoprd', FIL.tp]]
        .forEach(function (x) { f.append(x[0], String(x[1])); });
      var x = new XMLHttpRequest();
      x.open('POST', '/controlador/controller_home.php', true);
      x.timeout = 90000;
      x.onload = function () { ok(x.status === 200 ? x.responseText : ''); };
      x.onerror = x.ontimeout = function () { ok(''); };
      x.send(f);
    });
  }
  /* Lee las tarjetas de producto del HTML tal como llega del portal (sin
     pasar por el DOM: el portal no escapa las comillas del título y el DOM
     lo corta en «5"»). De cada tarjeta: código, stock y precio (addCesta),
     descripción completa, modelo del proveedor y foto.
     Devuelve {nuevos, tarjetas}; las tarjetas sin botón de compra (sin
     stock) cuentan para avanzar de página pero no se guardan. */
  var DEC = document.createElement('textarea');
  function texto(t) { DEC.innerHTML = String(t || '').replace(/<[^>]*>/g, ' '); return DEC.value.replace(/\s+/g, ' ').trim(); }
  function leer(html, mapa) {
    var trozos = String(html || '').split(/class="card card-product/).slice(1), nuevos = 0;
    if (!trozos.length) trozos = [String(html || '')];
    trozos.forEach(function (t) {
      RX.lastIndex = 0;
      var m = RX.exec(t); if (!m) return;
      var tit = (t.match(/<h3[^>]*?title="([\s\S]*?)">/) || [])[1] || (t.match(/<h3[^>]*>([\s\S]*?)<\/h3>/) || [])[1] || '';
      var al = (t.match(/class="alert[^"]*"[^>]*>([\s\S]*?)<\/div>/) || [])[1] || '';
      var src = (t.match(/<img[^>]*src="([^"]+)"/) || [])[1] || '';
      try { src = src && !/img_default/.test(src) ? new URL(src, location.href).href : ''; } catch (e) { src = ''; }
      var k = cod6(m[1]); if (!mapa[k]) nuevos++;
      mapa[k] = { c: m[1], s: Number(m[2]) || 0, p: Number(m[3]) || 0, d: texto(tit), mo: texto(al), img: src };
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
  function xhr(metodo, url, cuerpo, ms) {
    return new Promise(function (ok, no) {
      var x = new XMLHttpRequest();
      x.open(metodo, url, true);
      x.timeout = ms;
      if (cuerpo) x.setRequestHeader('Content-Type', 'text/plain;charset=utf-8');
      x.onload = function () { ok(x.responseText); };
      x.onerror = function () { no(new Error('red')); };
      x.ontimeout = function () { no(new Error('tiempo')); };
      x.send(cuerpo || null);
    });
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
  async function ofrecerFotos() {
    var fp = {};
    try { fp = await pedirJSON(CFG.u + '?atl=fotos&k=' + encodeURIComponent(CFG.k)); } catch (e) { return; }
    var lista = (fp && fp.fotos) || [];
    if (!lista.length) return;
    var p = document.createElement('div');
    p.style.cssText = 'margin-top:10px;padding-top:10px;border-top:1px solid #333';
    p.innerHTML = '📷 <b>' + lista.length + '</b> equipos publicados no tienen foto. Puedo copiar la del proveedor a tu Drive ' +
      '(una descarga por foto, una sola vez, ~' + Math.ceil(lista.length * 2.5 / 60) + ' min).';
    document.getElementById('sbAtlTxt').appendChild(p);
    boton('Copiar ' + lista.length + ' fotos', function () { this.remove(); copiarFotos(lista); });
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
        await enviar(JSON.stringify({ k: CFG.k, foto: { id: f.id, mime: b.type, b64: await aBase64(b) } }));
        hechas++;
      } catch (e) { fallas++; }
      await espera(1500);
    }
    bar(1);
    var quedan = '';
    try { var fp = await pedirJSON(CFG.u + '?atl=fotos&k=' + encodeURIComponent(CFG.k)); quedan = (fp.fotos || []).length; } catch (e) { }
    txt('<b style="color:#9be3b5">Fotos listas.</b> Se enviaron <b>' + hechas + '</b> a tu Drive (carpeta «Sinergia - Fotos venta»)' +
      (fallas ? '; ' + fallas + ' no se pudieron bajar' : '') + '.' +
      (quedan ? '<br>Quedan ' + quedan + ' sin foto: vuelve a tocar el favorito más tarde para reintentar.' : '') +
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
      var mapa = {}, consultas = 0, completo = false;
      var espera = function (ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); };
      var hallados = function () { return Object.keys(mios).filter(function (c) { return mapa[c]; }).length; };
      /* 1.ª consulta: bloque grande. Luego se sigue desde donde terminó lo
         recibido hasta que el portal devuelva un bloque vacío (fin de la
         lista). Así sirve tanto si el portal respeta el rango pedido como
         si recorta cada respuesta. */
      var P = 0, r = null;
      for (var t = 0; t < BLOQUES.length && !P; t++) {
        if (consultas) await espera(PAUSA);
        consultas++;
        txt('Leyendo los equipos del proveedor (consulta ' + consultas + ')…');
        r = leer(await bloque(1, BLOQUES[t], 1, Math.ceil(9000 / BLOQUES[t])), mapa);
        if (r.tarjetas === 20) return error('El portal entrega solo 20 productos por consulta. Para no hacer cientos de consultas, me detuve. Avísale a Claude.');
        if (r.tarjetas) P = BLOQUES[t];
      }
      if (!P) return error('El portal no devolvió productos. Revisa que tu sesión siga abierta y vuelve a intentar más tarde.');
      var desde = 1 + r.tarjetas, pag = 2;
      while (consultas < MAX_CONSULTAS) {
        bar(Math.min(0.9, desde / 900));
        txt('Consulta ' + consultas + ' · equipos leídos: <b>' + Object.keys(mapa).length + '</b>…');
        await espera(PAUSA);
        consultas++;
        var html = await bloque(desde, desde + P - 1, pag, Math.ceil(9000 / P));
        if (!html) { await espera(PAUSA); consultas++; html = await bloque(desde, desde + P - 1, pag, Math.ceil(9000 / P)); }
        if (!html) break;                                   // sin respuesta: se envía lo leído
        r = leer(html, mapa);
        if (!r.tarjetas || !r.nuevos) { completo = true; break; }   // fin de la lista
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
      await enviar(JSON.stringify({ k: CFG.k, id: id, tc: TC, todos: true, completo: completo && !FILTRADO && leidos >= 1000, items: items }));
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
      txt('<b style="color:#9be3b5">¡Listo!</b> Se leyeron <b>' + leidos + '</b> equipos del proveedor' + (TC ? ' (TC S/ ' + TC + ')' : '') + '.<br>' +
        'Tus equipos con precio y stock: <b>' + est.actualizados + '</b>' +
        (est.por_modelo ? ' (' + est.por_modelo + ' encontrados por marca y modelo)' : '') + '.<br>' +
        (est.pub_sin ? '<b>' + est.pub_sin + '</b> publicados no aparecen hoy en el portal: mira la columna «coincidencia».<br>' : '') +
        '<span style="color:#aeb4bc">La lista completa quedó en la pestaña «Proveedor». La web se actualiza sola en unos minutos.</span>');
      await ofrecerFotos();
      boton('Cerrar', cerrar);
    } catch (e) {
      error(String(e && e.message || e));
    }
  }
})();
