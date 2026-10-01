/* =====================================================================
   proveedor-atl.js — botón «Actualizar Sinergia» para altokelite.com
   ---------------------------------------------------------------------
   NO es parte de la web: lo carga un favorito del navegador estando
   DENTRO del portal del proveedor (ya con usuario y clave). El portal
   solo acepta conexiones desde Perú, por eso la lectura no puede hacerla
   un servidor: la hace el navegador de Sinergia.

   Qué hace:
   1. Pide al Apps Script los códigos de la hoja de venta.
   2. Usa la propia función del portal (searchProdBloque) para traer el
      catálogo en bloques y lee de cada tarjeta:
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
  var BLOQUE = 250;           // productos por consulta si el portal pagina
  var MAX_CONSULTAS = 8;      // tope total de consultas al portal por uso
  var PAUSA = 4000;           // ms entre una consulta y la siguiente
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
  function cerrar() { caja.remove(); }
  function error(t) { txt('<b style="color:#ff9b8a">No se pudo completar.</b><br>' + t); boton('Cerrar', cerrar); }

  /* ── Comprobaciones ─────────────────────────────────────────────── */
  if (!CFG.k || !CFG.u) return error('El favorito no tiene la clave. Vuelve a crearlo con crearBotonProveedor() en Apps Script.');
  if (!/altokelite\.com$/.test(location.hostname)) return error('Abre primero <b>altokelite.com</b> (con tu sesión iniciada) y luego toca el favorito.');
  if (typeof window.searchProdBloque !== 'function') {
    txt('Te llevo a la página de Productos del portal. Cuando cargue, toca el favorito otra vez.');
    setTimeout(function () { location.href = '/view/products/?s='; }, 1500);
    return;
  }

  var cod6 = function (c) { var d = String(c).replace(/\D/g, ''); return ('000000' + d).slice(-6); };
  var tcM = (document.body.innerText.match(/TC:\s*S\/\s*([\d.,]+)/) || [])[1];
  var TC = tcM ? Number(tcM.replace(',', '.')) : 0;
  var RX = /addCesta\(\s*'([\d.]+)'\s*,\s*'(\d+)'\s*,\s*'[^']*'\s*,\s*'[^']*'\s*,\s*'([\d.]+)'/g;

  /* Pide un bloque [desde, hasta] con la función del portal en un div oculto
     y devuelve el HTML cuando terminó de cargar. */
  var oculto = document.createElement('div');
  oculto.style.display = 'none';
  document.body.appendChild(oculto);
  var nDiv = 0;
  function bloque(desde, hasta, pagina) {
    return new Promise(function (ok) {
      var id = 'sbAtlTmp' + (++nDiv);
      var d = document.createElement('div'); d.id = id; oculto.appendChild(d);
      try { window.searchProdBloque('', '', '', String(desde), String(hasta), id, '9999', String(pagina), '', '', '', ''); }
      catch (e) { ok(''); return; }
      var t0 = Date.now(), vioCarga = false;
      (function mirar() {
        var h = d.innerHTML, cargando = /Cargando la informaci/i.test(h);
        if (cargando) vioCarga = true;
        /* Listo: hay contenido sin «Cargando», o terminó de cargar y quedó vacío. */
        var listo = !cargando && (h || vioCarga || Date.now() - t0 > 12000);
        if (listo || Date.now() - t0 > ESPERA_MAX) { d.remove(); ok(listo ? h || '' : ''); }
        else setTimeout(mirar, 400);
      })();
    });
  }
  function leer(html, mapa) {
    var m, n = 0; RX.lastIndex = 0;
    while ((m = RX.exec(html))) {
      var k = cod6(m[1]);
      if (!mapa[k]) n++;
      mapa[k] = { c: m[1], s: Number(m[2]) || 0, p: Number(m[3]) || 0 };
    }
    return n;
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

  /* ── Flujo principal ────────────────────────────────────────────── */
  async function correr() {
    try {
      txt('Leyendo tu lista de equipos…');
      var j = await pedirJSON(CFG.u + '?atl=codigos&k=' + encodeURIComponent(CFG.k));
      if (!j.ok) return error('El Apps Script respondió: ' + (j.motivo || 'error') + '.');
      var mios = {}; (j.codigos || []).forEach(function (c) { mios[cod6(c)] = 1; });
      var total = Object.keys(mios).length;
      if (!total) return error('La hoja de venta no tiene códigos de proveedor.');

      /* Primero se pide todo de una vez (1 consulta). Solo si el portal
         entrega menos, se sigue por bloques, de uno en uno y con pausa,
         hasta encontrar tus equipos o llegar al tope de consultas. */
      var mapa = {}, consultas = 1;
      var espera = function (ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); };
      var hallados = function () { return Object.keys(mios).filter(function (c) { return mapa[c]; }).length; };
      txt('Leyendo el catálogo del proveedor (1 consulta)…');
      leer(await bloque(1, 10000, 1), mapa);
      if (Object.keys(mapa).length < 200 && hallados() < total) {
        var desde = Object.keys(mapa).length + 1, pag = 2;
        while (consultas < MAX_CONSULTAS && hallados() < total) {
          await espera(PAUSA);
          consultas++;
          var nuevos = leer(await bloque(desde, desde + BLOQUE - 1, pag), mapa);
          bar(hallados() / total);
          txt('Consulta ' + consultas + ' de máx. ' + MAX_CONSULTAS + ' · catálogo leído: <b>' + Object.keys(mapa).length +
            '</b> · tuyos: <b>' + hallados() + ' de ' + total + '</b>');
          if (!nuevos) break;
          desde += BLOQUE; pag++;
        }
      }
      var items = Object.keys(mios).filter(function (c) { return mapa[c]; }).map(function (c) { return mapa[c]; });
      var leidos = Object.keys(mapa).length;
      bar(1);
      if (!leidos) return error('El portal no devolvió productos. Revisa que tu sesión siga abierta y vuelve a intentar.');

      try { localStorage.setItem('sbAtlUltimo', String(Date.now())); } catch (e) { }
      txt('Enviando <b>' + items.length + '</b> precios y stocks a tu hoja…');
      await enviar(JSON.stringify({ k: CFG.k, tc: TC, completo: leidos >= 1000, items: items }));
      /* La respuesta del POST es opaca (otro dominio): el resultado se pide aparte. */
      await new Promise(function (ok) { setTimeout(ok, 2500); });
      var est = {};
      try { est = await pedirJSON(CFG.u + '?atl=estado&k=' + encodeURIComponent(CFG.k)); } catch (e) { }
      var faltan = total - items.length;
      txt('<b style="color:#9be3b5">¡Listo!</b> Se actualizaron <b>' + (est.actualizados != null ? est.actualizados : items.length) + '</b> equipos' +
        (TC ? ' con TC S/ ' + TC : '') + '.<br>' +
        (faltan ? faltan + ' código(s) de tu hoja no aparecen hoy en el portal' + (leidos >= 1000 ? ' (quedan con stock 0 = «A pedido»)' : '') + '.<br>' : '') +
        '<span style="color:#aeb4bc">La web se actualiza sola en unos minutos.</span>');
      boton('Cerrar', cerrar);
    } catch (e) {
      error(String(e && e.message || e));
    }
  }
})();
