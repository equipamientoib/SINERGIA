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
  return SITE.nav.map(n=>`${indent}<a data-route="${n.r}" onclick="go('${n.r}')">${n.t}</a>`).join('\n');
}

function renderHeader(){
  const el=document.getElementById('app-header'); if(!el)return;
  el.outerHTML=`<header>
  <div class="wrap nav">
    ${LOGO_HEADER}
    <div class="menu">
${navLinks('      ')}
      <a class="btn" onclick="go('${SITE.portal.r}')">${SITE.portal.t}</a>
    </div>
    <button class="burger" onclick="toggleMenu()" aria-label="Menú">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
    </button>
  </div>
  <div class="mobile-menu" id="mobileMenu">
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
        <a class="wa" id="waLink" href="https://wa.me/${SITE.whatsapp}" target="_blank" rel="noopener">WhatsApp</a>
        <a class="wa2" onclick="go('#/contacto')">· solicitar cotización →</a>
      </div>
    </div>
    <div>
      <div class="tt">Navegación</div>
      <div class="fnav">
${SITE.nav.filter(n=>n.r!=='#/').map(n=>`        <a onclick="go('${n.r}')">${n.t}</a>`).join('\n')}
      </div>
    </div>
    <div>
      <div class="tt">Contacto</div>
      <p>${SITE.email}<br>${SITE.web}<br>${SITE.telefono}</p>
      <div class="ruc">RUC ${SITE.ruc}</div>
    </div>
  </div>
</footer>`;
}

renderHeader();
renderFooter();
