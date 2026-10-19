/* =====================================================================
   01-componentes.js — Header y footer UNIVERSALES
   Se construyen una sola vez desde los datos de SITE (js/00-config.js).
   Para cambiar un enlace, un correo o el RUC: edita 00-config.js.
   Los logos viven aquí inline (SVG) para que usen la tipografía de la
   página; hay copias de referencia en img/logos/.
   ===================================================================== */

const LOGO_HEADER = `<svg class="logo-h logo-svg" viewBox="0 0 880 240" role="img" aria-label="${SITE.nombre}" onclick="go('#/')">
  <text x="40" y="208" font-weight="700" font-size="212" textLength="252" lengthAdjust="spacingAndGlyphs"><tspan fill="#9A7F4E">S</tspan><tspan fill="#2A2D33">B</tspan></text>
  <text x="342" y="158" font-weight="700" font-size="100" fill="#17191D" textLength="498" lengthAdjust="spacingAndGlyphs">SINERGIA</text>
  <text x="342" y="212" font-weight="600" font-size="52" fill="#2A2D33" textLength="498" lengthAdjust="spacingAndGlyphs">BIOMÉDICA</text>
  <rect x="342" y="228" width="498" height="3" fill="#9A7F4E"/>
</svg>`;

const LOGO_FOOTER = `<svg class="footer-logo logo-svg" width="250" viewBox="0 0 880 265" role="img" aria-label="${SITE.nombre}">
  <text x="40" y="208" font-weight="700" font-size="212" textLength="252" lengthAdjust="spacingAndGlyphs"><tspan fill="#C0A56E">S</tspan><tspan fill="#AEB4BC">B</tspan></text>
  <text x="342" y="158" font-weight="700" font-size="100" fill="#F5F3EE" textLength="498" lengthAdjust="spacingAndGlyphs">SINERGIA</text>
  <text x="342" y="212" font-weight="600" font-size="52" fill="#AEB4BC" textLength="498" lengthAdjust="spacingAndGlyphs">BIOMÉDICA</text>
  <rect x="342" y="228" width="498" height="3" fill="#C0A56E"/>
  <text x="342" y="256" font-weight="400" font-size="18.6" fill="#9aa0a8" textLength="498" lengthAdjust="spacingAndGlyphs">${SITE.lema}</text>
</svg>`;

function navLinks(indent){
  /* El header muestra solo las entradas principales; el pie las muestra todas. */
  const menu=SITE.nav.filter(n=>!n.pie);
  /* Una entrada puede apuntar a una página suelta (/promociones/) en vez de
     a una ruta con #. En ese caso es un enlace normal, no una llamada a go(). */
  return menu.map(n=>`${indent}<a data-route="${n.r}"${n.modo?` data-modo="${n.modo}"`:''} ${
    n.r.charAt(0)==='#' ? `onclick="go('${n.r}')"` : `href="${n.r}"`}>${n.t}</a>`).join('\n');
}

/* Selector de sección: Venta | Alquiler. El activo lo marca la clase del
   body (modo-venta / modo-alquiler) que pone 07-router.js. */
function selectorModo(cls){
  return `<div class="${cls}" role="group" aria-label="Sección"><a data-sw="venta" onclick="go('#/venta')">Venta</a><a data-sw="alquiler" onclick="go('#/alquiler')">Alquiler</a></div>`;
}

function renderHeader(){
  const el=document.getElementById('app-header'); if(!el)return;
  el.outerHTML=`<header>
  <div class="wrap nav">
    ${LOGO_HEADER}
    <div class="menu">
      ${selectorModo('modo-sw')}
${navLinks('      ')}
      <a class="btn" onclick="go('${SITE.portal.r}')">${SITE.portal.t}</a>
    </div>
    <button class="burger" onclick="toggleMenu()" aria-label="Menú">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
    </button>
  </div>
  <div class="mobile-menu" id="mobileMenu">
    ${selectorModo('modo-sw modo-sw-movil')}
${navLinks('    ')}
    <a onclick="go('${SITE.portal.r}')" style="color:var(--cobre-d)">${SITE.portal.t}</a>
  </div>
</header>`;
}

function renderFooter(){
  const el=document.getElementById('app-footer'); if(!el)return;
  el.outerHTML=`<footer>
  <div class="wrap fgrid">
    <div style="max-width:360px">
      ${LOGO_FOOTER}
      <p>${SITE.razonSocial}<br>${SITE.direccion}</p>
      <div class="wa-row">
        <a class="wa" id="waLink" href="https://wa.me/${SITE.whatsapp}" target="_blank" rel="noopener">Escríbenos por WhatsApp</a>
        <a class="wa2" onclick="go('#/contacto')">o déjanos tus datos →</a>
      </div>
    </div>
    <div>
      <div class="tt">Navegación</div>
      <div class="fnav">
${SITE.nav.filter(n=>n.r!=='#/').map(n=>`        <a onclick="go('${n.r}')">${n.pieT||n.t}</a>`).join('\n')}
      </div>
    </div>
    <div>
      <div class="tt">Contacto</div>
      <p>${SITE.email}<br>${SITE.web}<br>${SITE.telefono}<br>Lun a vie · 8:00 a.m. – 5:00 p.m.</p>
      <div class="ruc">RUC ${SITE.ruc}</div>
    </div>
  </div>
</footer>`;
}

renderHeader();
renderFooter();

/* ── Vigencia de la calibración ───────────────────────────────────────
   «Calibración vigente hasta agosto 2027», o cadena vacía.

   Vive AQUÍ, en un solo sitio, porque lo pintan la tarjeta del catálogo
   (03-catalogo.js) y la ficha del equipo (05-detalle.js). Estaba escrito
   dos veces con formatos distintos: la ficha decía «agosto 2027» y la
   tarjeta soltaba la fecha entera, «31/08/2027», que es justo el dato
   que no se publica.

   SOLO mes y año: el cliente ve que la trazabilidad está al día y nadie
   sabe la fecha exacta en que toca renovar. El certificado NO se
   publica: lleva el número de serie del patrón y el número de
   certificado del laboratorio. Nunca pintar aquí el día, la fecha de
   emisión, el laboratorio ni el enlace al documento.

   Si la fecha ya pasó devuelve vacío: ni fecha, ni «vencido», ni aviso.
   La web no le anuncia a un cliente que un patrón está fuera de
   vigencia antes de que la empresa lo renueve. */
const SB_MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
                  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function sbCalVigente(calFin){
  const cf = String(calFin || '').trim();
  if(!cf) return '';
  const p = cf.replace(/-/g, '/').split('/').map(Number);
  if(p.length !== 3 || p.some(isNaN)) return '';
  let d, m, a;
  if(p[0] > 31){ a = p[0]; m = p[1]; d = p[2]; }      // 2027/08/31
  else { d = p[0]; m = p[1]; a = p[2]; if(a < 100) a += 2000; }   // 31/08/2027
  const fin = new Date(a, m - 1, d);
  if(fin.getFullYear() !== a || fin.getMonth() !== m - 1 || fin.getDate() !== d) return '';
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  if(fin < hoy) return '';
  return 'Calibración vigente hasta ' + SB_MESES[m - 1] + ' ' + a;
}
