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

/* Firmas separadas: el catálogo y los proyectos se repintan por su
   cuenta. Antes bastaba con que llegaran los proyectos para repintar
   TODO el catálogo (y recargar todas las fotos) aunque no hubiera
   cambiado ni un precio. Ahora cada parte se toca solo si cambió.   */
let HUELLA_CAT = '';   // firma del catálogo ya pintado (equipos + paquetes + modelo)
let HUELLA_PRO = '';   // firma de los proyectos ya pintados
let PRO_PINTADOS = false;

function firmaCatalogo(d){
  return JSON.stringify([
    (d.equipos ||[]).map(e=>[e.id,e.nom,e.dia,e.photo,e.cal_fin]),
    (d.paquetes||[]).map(p=>[p.id,p.nom,p.dia]),
    d.modelo || null
  ]);
}
function firmaProyectos(d){
  return JSON.stringify((d.proyectos||[]).map(p=>[p.id,p.avance]));
}

function aplicarDatos(d, enVivo){
  if(!d) return false;
  if(enVivo) DATOS_LISTOS = true;

  const primeraVez = !CATALOGO_LISTO;
  const fCat = firmaCatalogo(d);
  const cambioCat = (fCat !== HUELLA_CAT);

  if(cambioCat){
    HUELLA_CAT = fCat;
    if(Array.isArray(d.equipos)  && d.equipos.length)  EQUIPOS  = d.equipos;
    if(Array.isArray(d.paquetes) && d.paquetes.length) PAQUETES = d.paquetes;
    if(d.modelo){
      const m=d.modelo;
      if(m.instrumentista_dia!=null) TEC_DIA=m.instrumentista_dia;
      if(m.instrumentista_min!=null) TEC_MIN=m.instrumentista_min;
      if(m.kit_dia!=null) KIT_DIA=m.kit_dia;
      if(m.descuento_combinar) DESC_COMB=m.descuento_combinar;
    }
  }

  /* Los proyectos SOLO se toman de una fuente confiable (Apps Script en vivo
     o la caché de esta sesión, que vino de él). El archivo del repositorio
     puede traer proyectos de ejemplo desactualizados.                   */
  let cambioPro = false;
  if(enVivo){
    const fPro = firmaProyectos(d);
    if(fPro !== HUELLA_PRO || !PRO_PINTADOS){
      HUELLA_PRO = fPro; cambioPro = true;
      if(Array.isArray(d.proyectos)) PROYECTOS = d.proyectos;
    }
  }

  CATALOGO_LISTO = true;

  if(cambioCat || primeraVez){
    repintarCatalogo();
  }
  if(cambioPro || primeraVez){
    seguro('proyectos', ()=>pintarProyectos());
    if(enVivo) PRO_PINTADOS = true;
  }
  if(cambioCat || cambioPro || primeraVez) route(true);   // sin mover la vista
  return true;
}

/* Cada sección se repinta por separado y con su propio try. Si una
   falla (por ejemplo, una fila incompleta en la hoja), las demás se
   pintan igual y el error queda registrado en la consola, en vez de
   dejar la web congelada con los datos anteriores.                  */
function seguro(nombre, fn){
  try{ fn(); }catch(e){ console.error('Sinergia: falló '+nombre+' -> '+e.message); }
}
function repintarCatalogo(){
  seguro('filtros',      ()=>buildFacetsEq());
  seguro('equipos',      ()=>pintar());
  seguro('paquetes',     ()=>pintarPaquetes());
  seguro('destacados',   ()=>pintarDestacados());
  seguro('form contacto',()=>pintarSelectContacto());
}
/* Pintado completo. Solo se usa como último recurso, cuando no llegó
   ninguna fuente y hay que mostrar los datos de respaldo.            */
function repintarTodo(){
  repintarCatalogo();
  seguro('proyectos', ()=>pintarProyectos());
}

/* Descarga con límite de tiempo. Sin esto, si Google se queda pensando
   la promesa nunca se resuelve: la web se quedaba esperando para
   siempre y el reintento de proyectos (06-clientes.js) seguía girando. */
async function traer(url, ms){
  const limite = ms || (typeof CONFIG!=='undefined' && CONFIG.TIMEOUT_MS) || 12000;
  const ctrl = (typeof AbortController!=='undefined') ? new AbortController() : null;
  const corte = setTimeout(()=>{ if(ctrl) ctrl.abort(); }, limite);
  try{
    /* El archivo del repositorio puede venir de la caché del navegador
       (se revalida por cabeceras en vercel.json); la hoja en vivo no.  */
    const local = url.indexOf('http')!==0;
    const r = await fetch(url, {
      cache: local ? 'default' : 'no-store',
      signal: ctrl ? ctrl.signal : undefined
    });
    if(!r.ok) throw new Error('HTTP '+r.status);
    return await r.json();
  }catch(e){
    if(e && e.name==='AbortError') throw new Error('tiempo de espera agotado ('+limite+' ms)');
    throw e;
  }finally{
    clearTimeout(corte);
  }
}

/* ── Respaldos, en dos niveles ────────────────────────────────────────
   respaldoCatalogo() -> el catálogo se pinta ya, con los datos de
     js/02-datos.js (espejo de data/catalogo.json). Los proyectos siguen
     esperando, porque solo son válidos si vienen en vivo.
   rendirse()         -> se deja de esperar del todo: los proyectos pasan
     de "cargando" a su estado final.                                   */
function respaldoCatalogo(motivo){
  if(CATALOGO_LISTO) return;
  CATALOGO_LISTO = true;
  repintarCatalogo();
  route(true);
  console.warn('Sinergia: catálogo de respaldo ('+motivo+')');
}
function rendirse(motivo){
  respaldoCatalogo(motivo);
  if(DATOS_LISTOS) return;
  DATOS_LISTOS = true;              // nada más va a llegar
  seguro('proyectos', ()=>pintarProyectos());
  route(true);
  console.warn('Sinergia: sin datos en vivo ('+motivo+')');
}
/* Compatibilidad con el nombre anterior. */
function usarRespaldo(motivo){ rendirse(motivo); }

/* Red de seguridad por si una petición se queda colgada sin dar error. */
const _ESPERA = ((typeof CONFIG!=='undefined' && CONFIG.TIMEOUT_MS) || 12000);
setTimeout(()=>rendirse('sin respuesta a tiempo'), _ESPERA + 2000);

async function loadData(){
  /* ── 1. copia local: lo que ya tenemos a mano ──────────────────────
     Timeout corto: es un archivo del mismo servidor. Si no llega, no se
     hace esperar al visitante mirando marcadores: se pinta el respaldo
     integrado y el catálogo aparece igual.                            */
  let hayDatos = false;
  try{
    const guardado = sessionStorage.getItem(CACHE_KEY);
    if(guardado){
      hayDatos = aplicarDatos(JSON.parse(guardado), true);   // la caché vino del Apps Script
    }else{
      /* index.html arrancó esta descarga en el <head>, antes de que
         existiera este archivo. Aquí solo se recoge el resultado, así
         que normalmente ya está lista y no se espera nada.          */
      let d = null;
      if(window.__catalogo) d = await window.__catalogo;
      if(!d && CONFIG.CACHE_URL) d = await traer(CONFIG.CACHE_URL, 5000);
      hayDatos = aplicarDatos(d, false);
    }
  }catch(e){
    console.warn('Sinergia: no se pudo leer la copia local ('+e.message+')');
  }
  if(!hayDatos) respaldoCatalogo('la copia local no respondió');

  /* ── 2. datos en vivo ─────────────────────────────────────────────── */
  if(!CONFIG.DATA_URL){ rendirse('sin DATA_URL configurada'); return; }
  try{
    const d = await traer(CONFIG.DATA_URL, _ESPERA);
    aplicarDatos(d, true);
    try{ sessionStorage.setItem(CACHE_KEY, JSON.stringify(d)); }catch(e){}
    console.info('Sinergia: datos sincronizados desde la hoja');
  }catch(e){
    rendirse('no se cargó el Apps Script: '+e.message);
  }
}
loadData();

