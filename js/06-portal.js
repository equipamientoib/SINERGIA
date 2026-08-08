/* =====================================================================
   06-portal.js — CARGA DIFERIDA DEL PORTAL DE CLIENTES
   ---------------------------------------------------------------------
   El portal de clientes (js/06-clientes.js + css/13-clientes.css) pesa
   unos 150 KB: más de la mitad de todo lo que cargaba la web. Pero es la
   zona privada del contrato, que la mayoría de visitantes nunca abre.

   Antes se descargaba siempre, antes de que la portada apareciera.
   Ahora se carga aparte:

     · Si el visitante entra directo a #/clientes o a un #/proyecto/...,
       se descarga de inmediato.
     · En cualquier otra página se descarga en segundo plano, cuando el
       navegador ya está libre. Mientras tanto la sección de proyectos
       muestra sus marcadores, igual que antes (los proyectos vienen del
       Apps Script, así que de todos modos había que esperarlos).

   Este archivo declara PROYECTOS y deja versiones provisionales de
   pintarProyectos() y renderProyecto(); cuando llega 06-clientes.js las
   reemplaza por las de verdad.
   ===================================================================== */

let PROYECTOS = [];            // lo rellena el router al llegar los datos
let PORTAL_ESTADO = 'no';      // no | cargando | listo | error

/* Marcadores de carga, idénticos a los que pinta el portal ya cargado. */
function huesoProyectos(n){
  return Array.from({length:n},()=>`
    <article class="pr pr-hueso">
      <div class="ph-img"></div>
      <div class="ph-txt"><span class="ln w35"></span><span class="ln w85"></span>
        <span class="ln w60"></span></div>
    </article>`).join('');
}

function cargarPortal(){
  if(PORTAL_ESTADO!=='no') return;
  PORTAL_ESTADO='cargando';

  const css=document.createElement('link');
  css.rel='stylesheet'; css.href='css/13-clientes.css';
  document.head.appendChild(css);

  const js=document.createElement('script');
  js.src='js/06-clientes.js';
  js.onload=()=>{
    PORTAL_ESTADO='listo';
    /* Ya existen las funciones reales: se pinta lo que corresponda. */
    try{ pintarProyectos(); }catch(e){}
    try{ if(location.hash.indexOf('#/proyecto/')===0) route(true); }catch(e){}
  };
  js.onerror=()=>{
    PORTAL_ESTADO='error';
    const g=document.getElementById('prGrid'), hm=document.getElementById('prHome');
    const aviso='<p style="color:var(--gris);grid-column:1/-1">No se pudo cargar esta sección. Recarga la página.</p>';
    if(g)g.innerHTML=aviso; if(hm)hm.innerHTML='';
  };
  document.head.appendChild(js);
}

/* Versiones provisionales: solo marcadores. 06-clientes.js las sustituye.
   pintarProyectos NO dispara la descarga a propósito: el router la llama
   en cada repintado y eso anularía todo el diferido. La descarga la
   deciden los tres disparadores de más abajo.                          */
function pintarProyectos(){
  const g=document.getElementById('prGrid'), hm=document.getElementById('prHome'),
        c=document.getElementById('countPr');
  if(g)g.innerHTML=huesoProyectos(3);
  if(hm)hm.innerHTML=huesoProyectos(3);
  if(c)c.textContent='';
}
/* Esta sí: si se está abriendo un proyecto, el portal hace falta ya. */
function renderProyecto(){
  const body=document.getElementById('equipoBody');
  if(body) body.innerHTML=`
    <div class="cargando-proy">
      <div class="cp-barra"><i></i></div>
      <p>Cargando el proyecto…</p>
      <span>Estamos trayendo la información desde el sistema de mantenimiento.</span>
    </div>`;
  cargarPortal();
}

/* Disparadores de la descarga */
(function(){
  const esRutaPortal = h => h.indexOf('#/clientes')===0 || h.indexOf('#/proyecto/')===0;

  /* 1. Enlace directo al portal: se necesita ya. */
  if(esRutaPortal(location.hash||'')) { cargarPortal(); return; }

  /* 2. Al navegar hacia el portal desde otra página. */
  addEventListener('hashchange',()=>{ if(esRutaPortal(location.hash||'')) cargarPortal(); });

  /* 3. En cualquier otro caso, en cuanto el navegador esté desocupado.
        La portada muestra los últimos proyectos, así que igual hace
        falta, pero sin estorbar al primer pintado.                    */
  const luego = () => {
    if('requestIdleCallback' in window) requestIdleCallback(cargarPortal,{timeout:2500});
    else setTimeout(cargarPortal,900);
  };
  if(document.readyState==='complete') luego();
  else addEventListener('load',luego,{once:true});
})();
