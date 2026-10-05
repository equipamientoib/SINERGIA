/* =====================================================================
   promo-ventana.js — La ventana de remates que saluda al entrar a la tienda

   Qué hace: al abrir la tienda de venta, si hay equipos en promoción
   (data/venta.json › promociones), aparece una ventana flotante con
   ellos: foto, precio rebajado, precio tachado y un botón para ir al
   equipo.

   Cuándo NO aparece, a propósito:
     · si no hay ningún equipo en promoción;
     · si el visitante ya la cerró hoy (se recuerda un día, para no
       cansar a quien entra varias veces);
     · si está imprimiendo, o si el navegador pide menos animación.

   No se carga sola: la llama la tienda (12-venta.js) o la página
   /venta/, que le pasan la lista ya armada. Así este archivo no sabe
   nada de precios ni de la hoja; solo pinta.
   ===================================================================== */
(function () {
  'use strict';

  var CLAVE = 'sb-promo-vista';
  var UN_DIA = 24 * 60 * 60 * 1000;

  function vistaHoy() {
    try {
      var t = Number(localStorage.getItem(CLAVE) || 0);
      return t && (Date.now() - t) < UN_DIA;
    } catch (e) { return false; }   // navegación privada: se muestra igual
  }

  function recordar() {
    try { localStorage.setItem(CLAVE, String(Date.now())); } catch (e) {}
  }

  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c];
    });
  };
  var soles = function (n) {
    return 'S/ ' + Math.round(Number(n) || 0).toLocaleString('es-PE');
  };

  function cerrar() {
    var v = document.getElementById('sbPromo');
    if (!v) return;
    v.classList.remove('on');
    recordar();
    setTimeout(function () { if (v.parentNode) v.parentNode.removeChild(v); }, 260);
    document.body.classList.remove('sb-promo-abierta');
  }

  function fila(x) {
    return '<a class="sbp-i" href="' + esc(x.url) + '">' +
      (x.foto ? '<img src="' + esc(x.foto) + '" alt="' + esc(x.nom) + '" loading="lazy" decoding="async">'
              : '<span class="sbp-sinfoto"></span>') +
      '<span class="sbp-t"><b>' + esc(x.nom) + '</b>' +
        '<small>' + esc(x.mm || '') + '</small>' +
        '<i>' + soles(x.precio) + ' <em>Precio especial</em></i>' +
      '</span></a>';
  }

  /* lista: [{id, nom, mm, precio, antes, foto, url}], hasta: Date|null */
  function abrir(lista, hasta) {
    if (!Array.isArray(lista) || !lista.length) return;
    if (vistaHoy() || document.getElementById('sbPromo')) return;
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var fin = hasta instanceof Date && !isNaN(hasta)
      ? ' hasta el ' + hasta.toLocaleDateString('es-PE') : '';
    var v = document.createElement('div');
    v.id = 'sbPromo';
    v.className = 'sbp';
    v.setAttribute('role', 'dialog');
    v.setAttribute('aria-modal', 'true');
    v.setAttribute('aria-label', 'Equipos en remate');
    v.innerHTML =
      '<div class="sbp-fondo" data-x></div>' +
      '<div class="sbp-caja">' +
        '<button type="button" class="sbp-x" data-x aria-label="Cerrar">&#10005;</button>' +
        '<div class="sbp-cab"><span class="sbp-k">Remate de stock</span>' +
          '<h2>' + (lista.length === 1 ? 'Un equipo rebajado' : lista.length + ' equipos rebajados') + '</h2>' +
          '<p>Precio especial por tiempo limitado' + esc(fin) + '. Lo que se va, se va.</p></div>' +
        '<div class="sbp-l">' + lista.slice(0, 6).map(fila).join('') + '</div>' +
        '<div class="sbp-pie">' +
          '<a class="btn fill" href="/venta/#promociones">Ver todos los remates</a>' +
          '<button type="button" class="sbp-no" data-x>Seguir viendo la tienda</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(v);
    document.body.classList.add('sb-promo-abierta');
    v.querySelectorAll('[data-x]').forEach(function (b) { b.onclick = cerrar; });
    v.querySelectorAll('.sbp-i').forEach(function (a) { a.addEventListener('click', recordar); });
    requestAnimationFrame(function () { v.classList.add('on'); });
    addEventListener('keydown', function esc2(e) {
      if (e.key === 'Escape') { cerrar(); removeEventListener('keydown', esc2); }
    });
    setTimeout(function () { var x = v.querySelector('.sbp-x'); if (x) x.focus(); }, 300);
  }

  window.SBPromo = {abrir: abrir, cerrar: cerrar, vistaHoy: vistaHoy};

  /* Las páginas sueltas (/venta/) dejan la lista en window.SB_PROMOS y no
     tienen que programar nada más. */
  function sola() {
    var d = window.SB_PROMOS;
    if (d && d.lista && d.lista.length) {
      setTimeout(function () { abrir(d.lista, d.hasta ? new Date(d.hasta + 'T23:59:59') : null); }, 700);
    }
  }
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', sola);
  else sola();
})();
