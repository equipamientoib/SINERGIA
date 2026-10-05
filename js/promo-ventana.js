/* =====================================================================
   promo-ventana.js — La ventana de remates que saluda al entrar a la tienda

   Qué hace: al abrir la tienda, si hay equipos en remate, aparece una
   ventana flotante con UNO de ellos elegido al azar, mostrado con su
   aviso completo (el que ya está diseñado, con foto, precio y stock).
   Al azar a propósito: quien entra otro día ve un equipo distinto, y así
   los cuatro tienen su turno.

   Cuándo NO aparece, a propósito:
     · si no hay ningún equipo en remate;
     · si el visitante ya la cerró hoy (se recuerda un día, para no
       cansar a quien entra varias veces);
     · si está imprimiendo, o si el navegador pide menos animación.

   No se carga sola: la llama la tienda (12-venta.js) o la página
   /venta/, que le pasan la lista ya armada. Así este archivo no sabe
   nada de precios ni de la hoja; solo pinta.
   ===================================================================== */
(function () {
  'use strict';

  var CLAVE = 'sb-promo-vista';     // la cerró: no insistir en un día
  var VISITA = 'sb-promo-visita';   // ya la vio en esta visita: no repetir
  var UN_DIA = 24 * 60 * 60 * 1000;

  function vistaHoy() {
    try { if (sessionStorage.getItem(VISITA)) return true; } catch (e) {}
    try {
      var t = Number(localStorage.getItem(CLAVE) || 0);
      return t && (Date.now() - t) < UN_DIA;
    } catch (e) { return false; }   // navegación privada: se muestra igual
  }

  /* Dos memorias distintas, a propósito:
     · quien la CIERRA está diciendo «no me interesa»: no vuelve en un día;
     · quien ENTRA a la promoción sí tiene interés, así que solo se calla
       durante esa visita y la próxima vez vuelve a saludar. Antes el clic
       en «Ver todas las promociones» la apagaba un día entero, que es lo
       contrario de lo que uno quiere con un cliente que mordió el anzuelo. */
  function recordar() {
    try { localStorage.setItem(CLAVE, String(Date.now())); } catch (e) {}
    soloEstaVisita();
  }

  function soloEstaVisita() {
    try { sessionStorage.setItem(VISITA, '1'); } catch (e) {}
  }

  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c];
    });
  };
  var soles = function (n) {
    return 'S/ ' + Math.round(Number(n) || 0).toLocaleString('es-PE');
  };

  function cerrar(sinRecordar) {
    var v = document.getElementById('sbPromo');
    if (!v) return;
    v.classList.remove('on');
    if (sinRecordar) soloEstaVisita(); else recordar();
    setTimeout(function () { if (v.parentNode) v.parentNode.removeChild(v); }, 260);
    document.body.classList.remove('sb-promo-abierta');
  }

  /* lista: [{id, nom, mm, precio, foto, aviso, url}], hasta: Date|null
     «aviso» es la imagen completa del equipo en remate; si falta, se arma
     una tarjeta con la foto y el precio para no dejar el hueco. */
  function abrir(lista, hasta) {
    if (!Array.isArray(lista) || !lista.length) return;
    if (vistaHoy() || document.getElementById('sbPromo')) return;
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var x = lista[Math.floor(Math.random() * lista.length)];   // uno al azar
    var fin = hasta instanceof Date && !isNaN(hasta)
      ? ' hasta el ' + hasta.toLocaleDateString('es-PE') : '';
    var cuerpo = x.aviso
      ? '<a class="sbp-aviso" href="' + esc(x.url) + '">' +
          '<img src="' + esc(x.aviso) + '" alt="' + esc(x.nom + ' ' + (x.mm || '')) + '">' +
        '</a>'
      : '<a class="sbp-i" href="' + esc(x.url) + '">' +
          (x.foto ? '<img src="' + esc(x.foto) + '" alt="' + esc(x.nom) + '">'
                  : '<span class="sbp-sinfoto"></span>') +
          '<span class="sbp-t"><b>' + esc(x.nom) + '</b>' +
            '<small>' + esc(x.mm || '') + '</small>' +
            '<i>' + soles(x.precio) + ' <em>Precio especial</em></i></span></a>';

    var v = document.createElement('div');
    v.id = 'sbPromo';
    v.className = 'sbp' + (x.aviso ? ' con-aviso' : '');
    v.setAttribute('role', 'dialog');
    v.setAttribute('aria-modal', 'true');
    v.setAttribute('aria-label', 'Equipo en promoción');
    v.innerHTML =
      '<div class="sbp-fondo" data-x></div>' +
      '<div class="sbp-caja">' +
        '<button type="button" class="sbp-x" data-x aria-label="Cerrar">&#10005;</button>' +
        (x.aviso ? '' :
          '<div class="sbp-cab"><span class="sbp-k">Promoción</span>' +
            '<h2>Precio especial</h2>' +
            '<p>Por tiempo limitado' + esc(fin) + '. Lo que se va, se va.</p></div>') +
        cuerpo +
        '<div class="sbp-pie">' +
          '<a class="btn fill" href="/promociones/" data-x>Ver todas las promociones</a>' +
          '<button type="button" class="sbp-no" data-x>Seguir viendo la tienda</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(v);
    document.body.classList.add('sb-promo-abierta');
    /* Todo lo que saca de la ventana la cierra, también los enlaces: antes,
       al tocar «ver promociones» la ventana se quedaba encima. */
    /* Los enlaces se tratan aparte (abajo): si entraran por aquí también,
       se guardaría el «no insistir en un día» de quien sí tuvo interés. */
    v.querySelectorAll('[data-x]:not([href])').forEach(function (b) {
      b.addEventListener('click', function () { cerrar(); });
    });
    v.querySelectorAll('a[href]').forEach(function (a) {
      a.addEventListener('click', function () { cerrar(true); });   // entró: no se le castiga un día
    });
    requestAnimationFrame(function () { v.classList.add('on'); });
    addEventListener('keydown', function esc2(e) {
      if (e.key === 'Escape') { cerrar(); removeEventListener('keydown', esc2); }
    });
    setTimeout(function () { var b = v.querySelector('.sbp-x'); if (b) b.focus(); }, 300);
  }

  window.SBPromo = {abrir: abrir, cerrar: cerrar, vistaHoy: vistaHoy,
                  olvidar: function () {   // para probar: SBPromo.olvidar() y recargar
                    try { localStorage.removeItem(CLAVE); sessionStorage.removeItem(VISITA); } catch (e) {}
                  }};

  /* Las páginas sueltas dejan la lista en window.SB_PROMOS y no tienen que
     programar nada más. */
  function sola() {
    var d = window.SB_PROMOS;
    if (d && d.lista && d.lista.length) {
      setTimeout(function () { abrir(d.lista, d.hasta ? new Date(d.hasta + 'T23:59:59') : null); }, 700);
    }
  }
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', sola);
  else sola();
})();
