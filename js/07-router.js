/* ---- ROUTER ---- */
const PAGES={'':'page-home','#/':'page-home','#/nosotros':'page-nosotros','#/servicios':'page-servicios','#/talleres':'page-talleres','#/catalogo':'page-catalogo','#/clientes':'page-clientes','#/contacto':'page-contacto'};
function go(hash){location.hash=hash;closeMenu();}
function route(sinMover){
  const h=location.hash||'#/';
  let pageId, navKey;
  if(h.startsWith('#/equipo/')){renderEquipo(h.split('/')[2]);pageId='page-equipo';navKey='#/catalogo';}
  else if(h.startsWith('#/paquete/')){renderPaquete(h.split('/')[2]);pageId='page-equipo';navKey='#/catalogo';}
  else if(h.startsWith('#/proyecto/')){renderProyecto(h.split('/')[2]);pageId='page-equipo';navKey='#/clientes';}
  else if(h.startsWith('#/catalogo/')){
    const g=h.split('/')[2]||'';pageId='page-catalogo';navKey='#/catalogo';
    if(g==='paquetes')setView('pk');
    else if(g==='custom')setView('custom');
    else{setView('eq');setGrupo(GRUPOS[g]?g:'all');}
  }
  else{pageId=PAGES[h]||'page-home';navKey=h;}
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const el=document.getElementById(pageId); if(el)el.classList.add('active');
  document.querySelectorAll('[data-route]').forEach(a=>{const on=a.dataset.route===navKey;a.classList.toggle('active',on);if(on)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  if(!sinMover) window.scrollTo(0,0);   // al sincronizar datos no se mueve la vista
}
window.addEventListener('hashchange',function(){ route(); });   // al navegar SÍ sube al inicio
route();

/* ===== SINCRONIZACIÓN DE DATOS =====
   La web lee el catálogo y los precios desde una fuente externa, así
   se actualiza sola cuando editas tu hoja. Opciones para DATA_URL:
     "data/catalogo.json"  -> archivo del repo (regenéralo con scripts/build_catalogo.py)
     "https://script.google.com/.../exec"  -> Google Sheets EN VIVO (ver docs/GOOGLE-SHEETS.md)
     ""  -> usa solo los datos integrados (respaldo)                               */
/* CONFIG y SITE viven en js/00-config.js */
/* Carga en dos tiempos, para que la web no se quede esperando:

   1) CACHE_URL  → data/catalogo.json del repositorio. Es instantáneo,
      así el catálogo y las páginas se dibujan de inmediato.
   2) DATA_URL   → Apps Script en vivo. Tarda unos segundos (Google
      levanta el script en frío) y al llegar refresca todo en silencio.

   Además se guarda la última respuesta buena en sessionStorage: dentro
   de la misma sesión, las siguientes cargas ya no esperan.            */
/* DATOS_LISTOS se declara en 00-config.js, que carga primero. */
const CACHE_KEY = 'sb-datos';

let HUELLA='';   // firma de los datos ya pintados, para no repintar de balde

function aplicarDatos(d, enVivo){
  if(!d) return false;
  const huella=JSON.stringify([d.equipos&&d.equipos.length, d.paquetes&&d.paquetes.length,
    enVivo?(d.proyectos||[]).map(p=>p.id+p.avance).join('|'):'',
    (d.equipos||[]).map(e=>e.id+(e.dia||'')+(e.photo||'')).join('|')]);
  if(huella===HUELLA){                      // nada cambió: no se toca la pantalla
    if(enVivo) DATOS_LISTOS=true;
    return true;
  }
  HUELLA=huella;
  if(Array.isArray(d.equipos)  && d.equipos.length)  EQUIPOS  = d.equipos;
  if(Array.isArray(d.paquetes) && d.paquetes.length) PAQUETES = d.paquetes;
  /* Los proyectos SOLO se toman de una fuente confiable (Apps Script en vivo
     o la caché de esta sesión, que vino de él). El archivo del repositorio
     puede traer proyectos de ejemplo desactualizados: si se pintaran,
     el cliente vería otros proyectos un instante antes que los suyos.   */
  if(enVivo && Array.isArray(d.proyectos))           PROYECTOS = d.proyectos;
  if(d.modelo){
    const m=d.modelo;
    if(m.instrumentista_dia!=null) TEC_DIA=m.instrumentista_dia;
    if(m.instrumentista_min!=null) TEC_MIN=m.instrumentista_min;
    if(m.kit_dia!=null) KIT_DIA=m.kit_dia;
    if(m.descuento_combinar) DESC_COMB=m.descuento_combinar;
  }
  if(enVivo) DATOS_LISTOS = true;
  try{ buildFacetsEq(); pintar(); pintarPaquetes(); pintarProyectos(); pintarDestacados(); }catch(e){}
  route(true);          // sin mover la vista: el usuario puede estar leyendo
  return true;
}

async function traer(url){
  const r = await fetch(url, {cache:'no-store'});
  if(!r.ok) throw new Error('HTTP '+r.status);
  return r.json();
}

async function loadData(){
  // ── 1. lo que ya tenemos a mano: sesión anterior o archivo del repositorio ──
  try{
    const guardado = sessionStorage.getItem(CACHE_KEY);
    if(guardado) aplicarDatos(JSON.parse(guardado), true);   // la caché vino del Apps Script
    else if(CONFIG.CACHE_URL) aplicarDatos(await traer(CONFIG.CACHE_URL), false);
  }catch(e){ /* si no hay caché, se sigue con los datos integrados */ }

  // ── 2. datos en vivo ──
  if(!CONFIG.DATA_URL) { DATOS_LISTOS = true; route(true); return; }
  try{
    const d = await traer(CONFIG.DATA_URL);
    aplicarDatos(d, true);
    try{ sessionStorage.setItem(CACHE_KEY, JSON.stringify(d)); }catch(e){}
    console.info('Sinergia: datos sincronizados desde '+CONFIG.DATA_URL);
  }catch(e){
    DATOS_LISTOS = true;   // hubo respuesta (fallida): dejar de esperar
    route(true);
    console.warn('Sinergia: usando datos locales (no se cargó '+CONFIG.DATA_URL+'): '+e.message);
  }
}
loadData();

