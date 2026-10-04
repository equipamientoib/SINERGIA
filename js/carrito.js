/* =====================================================================
   carrito.js — Carrito de la zona de venta

   Vive aparte del resto de la web a propósito: las páginas de producto
   (/venta/<id>/) son páginas sueltas, ligeras, que no cargan el paquete
   grande. Este archivo, que no depende de nada, se carga en todas y da
   el mismo carrito en los dos sitios:

     · el botón con el contador, arriba, en la cabecera;
     · el panel lateral que se abre al tocarlo;
     · el aviso al agregar, con el enlace a la cotización.

   Lo que se guarda lleva los datos mínimos de cada equipo (nombre,
   marca, precio, foto), porque en una página suelta no hay catálogo del
   que sacarlos. Cuando el catálogo sí está cargado, manda el catálogo.
   ===================================================================== */
(function(){
  'use strict';
  var LLAVE = 'sb-venta-cot';

  function leer(){
    try{
      var g = JSON.parse(localStorage.getItem(LLAVE) || '{}');
      if(!g || typeof g !== 'object') return {};
      /* Formato antiguo: {id: cantidad}. Se convierte al vuelo. */
      Object.keys(g).forEach(function(k){
        if(typeof g[k] === 'number') g[k] = {q: g[k]};
      });
      return g;
    }catch(e){ return {}; }
  }
  function escribir(g){
    try{ localStorage.setItem(LLAVE, JSON.stringify(g)); }catch(e){}
    pintar();
    try{ window.dispatchEvent(new CustomEvent('sb-carrito')); }catch(e){}
  }

  var C = {};
  C.items = leer;
  C.cuenta = function(){
    var g = leer(), n = 0;
    Object.keys(g).forEach(function(k){ n += Number(g[k].q || 0); });
    return n;
  };
  C.total = function(){
    var g = leer(), t = 0;
    Object.keys(g).forEach(function(k){ t += Number(g[k].precio || 0) * Number(g[k].q || 0); });
    return t;
  };
  C.agregar = function(id, datos, cuantos){
    var g = leer(), n = Number(cuantos || 1);
    var y = g[id] || {q: 0};
    y.q = Math.max(1, Number(y.q || 0) + n);
    if(datos) ['nom', 'mm', 'precio', 'foto', 'nts'].forEach(function(k){
      if(datos[k] != null && datos[k] !== '') y[k] = datos[k];
    });
    g[id] = y; escribir(g);
    aviso(y.nom || 'Equipo agregado');
  };
  C.cantidad = function(id, v){
    var g = leer(), n = Math.max(0, parseInt(v, 10) || 0);
    if(!g[id]) return;
    if(n === 0) delete g[id]; else g[id].q = n;
    escribir(g);
  };
  C.quitar = function(id){ var g = leer(); delete g[id]; escribir(g); };
  C.vaciar = function(){ escribir({}); };

  var soles = function(n){ return 'S/ ' + Number(n || 0).toLocaleString('es-PE', {maximumFractionDigits: 0}); };
  var esc = function(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){
    return ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]; }); };

  /* ── Botón de la cabecera ─────────────────────────────────────────── */
  function botonCabecera(){
    if(document.getElementById('sbCartBtn')) return document.getElementById('sbCartBtn');
    /* La cabecera visible: puede haber más de un <header> en la página. */
    var cab = null;
    var cands = document.querySelectorAll('header .wrap, header');
    for(var i = 0; i < cands.length; i++){
      if(cands[i].offsetParent !== null || cands[i].getClientRects().length){ cab = cands[i]; break; }
    }
    if(!cab) return null;
    var b = document.createElement('button');
    b.id = 'sbCartBtn'; b.type = 'button'; b.className = 'sb-cart-btn';
    b.setAttribute('aria-label', 'Ver mi carrito');
    b.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" ' +
      'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/>' +
      '<path d="M2 3h2.2l2.3 11.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 7H5.1"/></svg>' +
      '<i class="sb-cart-n" hidden></i>';
    b.onclick = C.abrir;
    /* Antes del botón de menú, para que en el celular quede a su lado. */
    /* Junto al menú (la web) o junto al selector Venta/Alquiler (las
       páginas sueltas): así queda en la misma fila, arriba a la derecha. */
    var burger = cab.querySelector('.burger');
    var modo = cab.querySelector('nav .modo-sw');
    if(burger && burger.parentNode) burger.parentNode.insertBefore(b, burger);
    else if(modo && modo.parentNode) modo.parentNode.insertBefore(b, modo.nextSibling);
    else cab.appendChild(b);
    return b;
  }

  /* ── Panel lateral ────────────────────────────────────────────────── */
  function panel(){
    var p = document.getElementById('sbCart');
    if(p) return p;
    p = document.createElement('div');
    p.id = 'sbCart'; p.className = 'sb-cart';
    p.innerHTML = '<div class="sb-cart-p" role="dialog" aria-modal="true" aria-label="Mi carrito">' +
      '<div class="sb-cart-c"><b>Mi carrito</b>' +
      '<button type="button" class="sb-cart-x" aria-label="Cerrar">✕</button></div>' +
      '<div class="sb-cart-l"></div><div class="sb-cart-f"></div></div>';
    document.body.appendChild(p);
    p.addEventListener('click', function(e){ if(e.target === p) C.cerrar(); });
    p.querySelector('.sb-cart-x').onclick = C.cerrar;
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape') C.cerrar(); });
    return p;
  }

  C.abrir = function(){
    var p = panel();
    pintarPanel();
    p.classList.add('on');
    document.body.classList.add('sb-cart-open');
    /* El aviso de «agregado» estorba encima del panel. */
    var t = document.getElementById('sbToast');
    if(t){ t.classList.remove('on'); clearTimeout(tToast); }
  };
  C.cerrar = function(){
    var p = document.getElementById('sbCart');
    if(!p) return;
    p.classList.remove('on');
    document.body.classList.remove('sb-cart-open');
  };

  function pintarPanel(){
    var p = document.getElementById('sbCart');
    if(!p || !p.classList.contains('on') && !p.dataset.listo) { if(!p) return; }
    p.dataset.listo = '1';
    var g = leer(), ids = Object.keys(g);
    var lista = p.querySelector('.sb-cart-l'), pie = p.querySelector('.sb-cart-f');
    if(!ids.length){
      lista.innerHTML = '<p class="sb-cart-v">Tu carrito está vacío.<br>Toca «Agregar al carrito» en los equipos que te interesen.</p>';
      pie.innerHTML = '<button type="button" class="sb-cart-ir" data-ir="/#/venta/tienda">Ver la tienda</button>';
      enlazarPie(pie);
      return;
    }
    lista.innerHTML = ids.map(function(id){
      var y = g[id], t = Number(y.precio || 0) * Number(y.q || 0);
      return '<div class="sb-cart-i">' +
        (y.foto ? '<img src="' + esc(y.foto) + '" alt="" loading="lazy">' : '<span class="sin"></span>') +
        '<div class="n"><b>' + esc(y.nom || id) + '</b><small>' + esc(y.mm || '') + '</small>' +
          (y.precio ? '<span class="pu">' + soles(y.precio) + ' c/u</span>' : '<span class="pu">Consultar precio</span>') + '</div>' +
        '<div class="q"><button type="button" data-menos="' + esc(id) + '" aria-label="Quitar uno">−</button>' +
          '<span>' + Number(y.q || 0) + '</span>' +
          '<button type="button" data-mas="' + esc(id) + '" aria-label="Agregar uno">+</button></div>' +
        '<div class="t">' + (y.precio ? soles(t) : '—') +
          '<button type="button" class="x" data-quitar="' + esc(id) + '" aria-label="Quitar del carrito">Quitar</button></div>' +
      '</div>';
    }).join('');
    var tot = C.total();
    pie.innerHTML = '<div class="sb-cart-t"><span>Total referencial</span><b>' + soles(tot) + '</b></div>' +
      '<small>Incluye IGV. Lo confirmamos en la cotización.</small>' +
      '<button type="button" class="sb-cart-ir sb-cart-wa" data-enviar="1">Enviar mi pedido por WhatsApp</button>' +
      '<button type="button" class="sb-cart-ir sb-cart-2" data-ir="/#/cotizar-venta">Ver mi cotización</button>' +
      '<button type="button" class="sb-cart-seguir">Seguir viendo equipos</button>';
    enlazarPie(pie);
    lista.querySelectorAll('[data-mas]').forEach(function(b){
      b.onclick = function(){ C.agregar(b.dataset.mas, null, 1); pintarPanel(); }; });
    lista.querySelectorAll('[data-menos]').forEach(function(b){
      b.onclick = function(){ C.cantidad(b.dataset.menos, Number(leer()[b.dataset.menos].q) - 1); pintarPanel(); }; });
    lista.querySelectorAll('[data-quitar]').forEach(function(b){
      b.onclick = function(){ C.quitar(b.dataset.quitar); pintarPanel(); }; });
  }

  /* Los botones del pie: ir a la cotización y enviar por WhatsApp. Si ya
     se está en la página de la cotización, no hay a dónde navegar: basta
     con cerrar el panel (antes parecía que no pasaba nada). */
  function enlazarPie(pie){
    var seguir = pie.querySelector('.sb-cart-seguir');
    if(seguir) seguir.onclick = C.cerrar;
    pie.querySelectorAll('[data-ir]').forEach(function(b){
      b.onclick = function(){ C.cerrar(); irA(b.dataset.ir); };
    });
    var wa = pie.querySelector('[data-enviar]');
    if(wa) wa.onclick = function(){
      C.cerrar();
      /* En la web, el envío necesita los datos del cliente: se va al
         formulario y se intenta enviar; en una página suelta, primero se
         llega a la cotización. */
      if(typeof window.vcEnviar === 'function' && location.hash.indexOf('#/cotizar-venta') === 0){
        window.vcEnviar('whatsapp');
      }else{
        try{ sessionStorage.setItem('sb-ir-enviar', '1'); }catch(e){}
        irA('/#/cotizar-venta');
      }
    };
  }

  function irA(destino){
    var hash = destino.replace(/^.*#/, '#');
    if(location.hash === hash){
      /* Ya estamos ahí: solo se sube y se repinta. */
      window.scrollTo({top: 0, behavior: 'smooth'});
      if(typeof window.vcPintarTodo === 'function') window.vcPintarTodo();
      return;
    }
    if(location.pathname === '/' || location.pathname === '/index.html'){ location.hash = hash; }
    else location.href = destino;
  }

  /* ── Aviso al agregar ─────────────────────────────────────────────── */
  var tToast;
  function aviso(nom){
    var t = document.getElementById('sbToast');
    if(!t){
      t = document.createElement('div'); t.id = 'sbToast'; t.className = 'sb-toast';
      document.body.appendChild(t);
    }
    t.innerHTML = '<span>Agregado: <b>' + esc(nom) + '</b></span>' +
      '<button type="button">Ver carrito</button>';
    t.querySelector('button').onclick = function(){ C.cerrar(); C.abrir(); };
    t.classList.add('on');
    clearTimeout(tToast); tToast = setTimeout(function(){ t.classList.remove('on'); }, 4000);
  }

  /* ── Pintado del contador y de los botones ────────────────────────── */
  function enVenta(){
    return /\/venta|#\/venta|cotizar-venta/.test(location.pathname + location.hash);
  }
  function pintar(){
    var n = C.cuenta();
    var b = botonCabecera();
    if(b){
      /* En alquiler el carrito solo aparece si ya hay algo dentro. */
      b.hidden = !n && !enVenta();
      var i = b.querySelector('.sb-cart-n');
      i.textContent = n ? String(n) : '';
      i.hidden = !n;
      b.classList.toggle('lleno', !!n);
    }
    /* Botones «Agregar al carrito» de la página: los que ya están puestos
       muestran cuántos lleva. */
    var g = leer();
    document.querySelectorAll('[data-add]').forEach(function(el){
      var y = g[el.dataset.add];
      el.classList.toggle('on', !!y);
      if(el.dataset.textoOrig == null) el.dataset.textoOrig = el.textContent;
      el.textContent = y ? ('En el carrito · ' + y.q) : el.dataset.textoOrig;
    });
    pintarPanel();
  }
  C.pintar = pintar;

  /* Los botones de la página estática llevan los datos del equipo. */
  function enganchar(){
    document.querySelectorAll('[data-add]').forEach(function(el){
      if(el._sb) return;
      el._sb = 1;
      el.addEventListener('click', function(){
        C.agregar(el.dataset.add, {
          nom: el.dataset.nom, mm: el.dataset.mm, nts: el.dataset.nts,
          precio: Number(el.dataset.precio || 0), foto: el.dataset.foto
        }, 1);
      });
    });
  }
  C.enganchar = enganchar;

  function arrancar(){
    enganchar(); pintar();
    /* La web repinta su cabecera al navegar y se lleva el botón por
       delante: en cuanto eso pasa, se vuelve a poner. */
    try{
      var mo = new MutationObserver(function(){
        if(!document.getElementById('sbCartBtn')) pintar();
      });
      mo.observe(document.body, {childList: true, subtree: true});
    }catch(e){}
    window.addEventListener('hashchange', function(){ setTimeout(pintar, 30); });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar);
  else arrancar();
  /* Si el carrito cambia en otra pestaña, esta se entera. */
  window.addEventListener('storage', function(e){ if(e.key === LLAVE) pintar(); });

  /* Volver: si se llegó desde el propio sitio, atrás de verdad; si se
     entró directo desde Google, a la tienda. */
  window.sbAtras = function(){
    var mismo = document.referrer && document.referrer.indexOf(location.origin) === 0;
    if(mismo && history.length > 1) history.back();
    else location.href = '/#/venta/tienda';
  };

  window.SBCarrito = C;
})();
