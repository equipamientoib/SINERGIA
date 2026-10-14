/* =====================================================================
   whatsapp.js — Abrir WhatsApp de verdad, sobre todo en el celular

   El problema que arregla: todos los enlaces de WhatsApp del sitio
   abrían en una pestaña nueva (target="_blank"). En el celular eso NO
   abre la aplicación: abre el navegador en la página de wa.me, con un
   botón «Continuar al chat» que hay que volver a tocar. Mucha gente no
   lo toca, y esa cotización se pierde: no llega por ningún lado, porque
   el sitio no tiene servidor que la guarde.

   La regla, en una línea: en el celular, ir a wa.me en la MISMA pestaña.
   Así el sistema operativo reconoce el enlace y entrega el mensaje a la
   aplicación de WhatsApp. En la computadora se sigue abriendo aparte,
   para no sacar al visitante de la página.
   ===================================================================== */
(function () {
  'use strict';

  /* iPad con iPadOS 13 o más dice ser un Macintosh: por eso no basta con
     mirar el nombre del navegador, hay que mirar también si hay pantalla
     táctil. */
  function movil() {
    var ua = navigator.userAgent || '';
    if (/Android|iPhone|iPod|Opera Mini|IEMobile|Mobile/i.test(ua)) return true;
    return /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  }

  /* En el celular, wa.me entrega el mensaje a la aplicación. En la
     computadora, wa.me enseña una página intermedia que con mensajes
     largos se ve rota: ahí conviene ir directo a WhatsApp Web. */
  function direccion(numero, texto) {
    var n = String(numero || '').replace(/\D/g, '');
    if (!n) return '';
    return movil()
      ? 'https://wa.me/' + n + '?text=' + encodeURIComponent(texto || '')
      : 'https://web.whatsapp.com/send?phone=' + n + '&text=' + encodeURIComponent(texto || '');
  }

  function abrir(numero, texto) {
    var url = direccion(numero, texto);
    if (!url) return false;
    ir(url);
    return true;
  }

  function ir(url) {
    if (movil()) { location.href = url; return; }      // misma pestaña: abre la app
    var a = document.createElement('a');                // escritorio: pestaña aparte
    a.href = url; a.target = '_blank'; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
  }

  /* Los enlaces sueltos del sitio (el botón flotante, el pie, las fichas
     de equipo) siguen escritos con target="_blank" porque en la
     computadora está bien. En el celular se les quita al vuelo. */
  document.addEventListener('click', function (e) {
    if (!movil()) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.href.indexOf('wa.me/') < 0) return;
    if (!a.target || a.target === '_self') return;      // ya va en la misma pestaña
    e.preventDefault();
    location.href = a.href;
  }, true);

  window.SBWhatsApp = {movil: movil, direccion: direccion, abrir: abrir, ir: ir};
})();
