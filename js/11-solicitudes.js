/* =====================================================================
   11-solicitudes.js — ENVÍO REAL DE SOLICITUDES
   ---------------------------------------------------------------------
   Antes los dos formularios (contacto y reserva) mostraban un aviso que
   decía "Prototipo". Un cliente que llenaba el formulario no enviaba
   nada y se llevaba una mala impresión.

   Ahora arman la solicitud y la mandan por WhatsApp o por correo, sin
   necesidad de servidor. Si algún día contratas un endpoint (Formspree,
   Getform, etc.), pon la URL en CONFIG.FORM_ENDPOINT (js/00-config.js)
   y se enviará ahí en segundo plano, además de abrir WhatsApp/correo.
   ===================================================================== */

/* ── utilidades ─────────────────────────────────────────────────────── */
const val = id => { const el = document.getElementById(id); return el ? String(el.value || '').trim() : ''; };

function avisar(id, texto, tipo){
  const el = document.getElementById(id); if(!el) return;
  el.textContent = texto || '';
  el.className = 'form-msg' + (texto ? ' show ' + (tipo || 'info') : '');
}

function correoValido(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }
function telefonoValido(v){ return String(v).replace(/\D/g, '').length >= 6; }

/* Valida nombre + al menos una forma de contacto. Devuelve null si todo
   está bien, o el texto del error.                                     */
function validarContacto(nom, mail, tel){
  if(nom.length < 2)                       return 'Escribe tu nombre o el de la institución.';
  if(!mail && !tel)                        return 'Déjanos un correo o un teléfono para responderte.';
  if(mail && !correoValido(mail))          return 'Revisa el correo: parece incompleto.';
  if(tel && !telefonoValido(tel))          return 'Revisa el teléfono: faltan dígitos.';
  return null;
}

/* Envío opcional a un endpoint externo. Nunca bloquea al usuario: si
   falla, la solicitud igual sale por WhatsApp o correo.               */
function enviarAlEndpoint(datos){
  const url = (typeof CONFIG !== 'undefined' && CONFIG.FORM_ENDPOINT) || '';
  if(url.indexOf('http') !== 0) return;
  try{
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(datos)
    }).catch(() => {});
  }catch(e){}
}

/* Abre WhatsApp o el correo. Se usa un <a> temporal en vez de
   window.open porque algunos navegadores móviles bloquean el popup.   */
function abrirCanal(via, texto, asunto){
  if(via === 'correo'){
    const destino = (typeof SITE !== 'undefined' && SITE.email) || '';
    location.href = 'mailto:' + destino +
      '?subject=' + encodeURIComponent(asunto) +
      '&body=' + encodeURIComponent(texto);
    return;
  }
  const n = String((typeof CONFIG !== 'undefined' && CONFIG.WHATSAPP) || '').replace(/\D/g, '');
  if(!n){                                   // sin número: se cae al correo
    abrirCanal('correo', texto, asunto);
    return;
  }
  const a = document.createElement('a');
  a.href = 'https://wa.me/' + n + '?text=' + encodeURIComponent(texto);
  a.target = '_blank'; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
}

/* ── formulario de contacto ─────────────────────────────────────────── */
function enviarContacto(via){
  const nom = val('cNom'), mail = val('cMail'), tel = val('cTel'), msg = val('cMsg');
  const sel = document.getElementById('cEq');
  const eq  = sel && sel.selectedIndex > 0 ? sel.value : '';

  const error = validarContacto(nom, mail, tel);
  if(error){ avisar('cAviso', error, 'err'); return; }

  const lineas = [
    'Solicitud de cotización — ' + ((typeof SITE !== 'undefined' && SITE.nombre) || 'Sinergia Biomédica'),
    '',
    'Nombre / institución: ' + nom,
    mail ? 'Correo: ' + mail : '',
    tel  ? 'Teléfono: ' + tel : '',
    eq   ? 'Equipo de interés: ' + eq : '',
    msg  ? '' : null,
    msg  ? 'Mensaje:' : null,
    msg  || null
  ].filter(x => x !== null && x !== '');

  const texto = lineas.join('\n');
  enviarAlEndpoint({ tipo: 'contacto', nombre: nom, correo: mail, telefono: tel, equipo: eq, mensaje: msg });
  avisar('cAviso', via === 'correo'
    ? 'Abriendo tu correo con la solicitud lista para enviar…'
    : 'Abriendo WhatsApp con la solicitud lista para enviar…', 'ok');
  abrirCanal(via, texto, 'Solicitud de cotización' + (eq ? ' · ' + eq : ''));
}

/* ── formulario del modal de reserva ────────────────────────────────── */
function enviar(via){
  if(!actual){ return; }
  const nom = val('mNom'), mail = val('mMail'), tel = val('mTel');

  const error = validarContacto(nom, mail, tel);
  if(error){ avisar('mAviso', error, 'err'); return; }

  const leer = id => { const el = document.getElementById(id); return el ? el.textContent : '—'; };
  const modLbl = { equipo:'por equipo', hora:'por hora', dia:'por día', semana:'por semana', mes:'por mes' }[actual.mod] || actual.mod;

  const lineas = [
    'Solicitud de reserva — ' + ((typeof SITE !== 'undefined' && SITE.nombre) || 'Sinergia Biomédica'),
    '',
    'Equipo / paquete: ' + actual.nom,
    'Modalidad: ' + modLbl,
    'Cantidad: ' + leer('cDias'),
    'Alquiler: ' + leer('cTot') + ' (IGV incluido)',
    'Instrumentista: ' + leer('cTec'),
    'Total general: ' + leer('cGrand'),
    '',
    'Nombre / institución: ' + nom,
    mail ? 'Correo: ' + mail : '',
    tel  ? 'Teléfono: ' + tel : ''
  ].filter(Boolean);

  const texto = lineas.join('\n');
  enviarAlEndpoint({ tipo:'reserva', equipo: actual.nom, modalidad: actual.mod,
                     total: leer('cGrand'), nombre: nom, correo: mail, telefono: tel });
  avisar('mAviso', via === 'correo'
    ? 'Abriendo tu correo con la reserva lista para enviar…'
    : 'Abriendo WhatsApp con la reserva lista para enviar…', 'ok');
  abrirCanal(via, texto, 'Solicitud de reserva · ' + actual.nom);
}

/* ── datos de contacto en el bloque "facts" ─────────────────────────── */
/* Antes estaban escritos a mano en el HTML (el teléfono incluso como
   "+51 9XX XXX XXX"). Ahora todos salen de SITE: se editan en un solo
   sitio, js/00-config.js, y no pueden quedar desfasados entre sí.     */
(function(){
  if(typeof SITE === 'undefined') return;
  const poner = (id, txt) => { const el = document.getElementById(id); if(el && txt) el.textContent = txt; };
  poner('factTel',  SITE.telefono);
  poner('factMail', SITE.email);
  poner('factWeb',  SITE.web);
  poner('factRuc',  SITE.ruc);
})();
