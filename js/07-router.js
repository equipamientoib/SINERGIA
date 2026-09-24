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

  /* ── De dónde salen los proyectos ──────────────────────────────────
     La respuesta en vivo del Apps Script manda siempre. Pero el sitio trae
     además una copia de esa misma respuesta (data/catalogo.json, generada
     al publicar y marcada con "generado"), y esa copia se pinta de entrada.

     Antes no: la lista esperaba a Google, y si Google tardaba o fallaba
     —pasó, con la IP limitada por exceso de peticiones— el cliente veía
     marcadores grises varios minutos y al final una lista incompleta.
     Ahora la sección abre al instante con la copia y se corrige sola en
     cuanto llega la hoja. La copia solo se acepta si trae "generado", para
     que un archivo de ejemplo escrito a mano nunca entre por aquí.    */
  if(!enVivo && !PRO_PINTADOS && d.generado && Array.isArray(d.proyectos) && d.proyectos.length
     && !PROYECTOS.length){
    PROYECTOS = d.proyectos;
    HUELLA_PRO = '';                  // la respuesta en vivo la reemplaza igual
  }

  /* Los interruptores "mostrar" de los expedientes vienen dentro del propio
     catálogo, venga de donde venga. Antes se preguntaban uno por uno: cada
     pregunta al Apps Script cuesta ~2 s y se atienden de a una, así que el
     cliente que entraba a su proyecto esperaba detrás de ellas.          */
  if(d.expedientes) window.EX_SITIO = d.expedientes;

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
/* ── UNA petición al Apps Script a la vez ──────────────────────────────
   Google atiende de a una por cuenta. Si se le encima otra, la que llega
   de más espera decenas de segundos y a veces termina en 404: la primera
   respuesta es un 302 con una llave de un solo uso, y bajo presión esa
   llave ya no vale cuando el navegador va a buscar el contenido.

   Por eso aquí se hace cola: dos pedidos nunca salen a la vez, salgan de
   donde salgan (el catálogo al abrir la web, el detalle del proyecto, un
   reintento). Medido: una sola petición son 302 en 1,9 s + contenido en
   1,0 s; encimadas, 13 a 40 s y 404.                                    */
let _COLA = Promise.resolve();
function enCola(tarea){
  const turno = _COLA.then(tarea, tarea);
  _COLA = turno.then(()=>{}, ()=>{});     // la cola sigue aunque uno falle
  return turno;
}

/* Petición con reintento, SIEMPRE de a una.
   Un fallo suelto (atasco de Google, 404 por encimamiento) se reintenta
   una vez, esperando un momento; nunca en paralelo.                     */
async function traerPronto(url, ms){
  const limite = ms || (typeof CONFIG!=='undefined' && CONFIG.TIMEOUT_MS) || 25000;
  try{
    return await traer(url, limite);
  }catch(e1){
    console.warn('Sinergia: reintentando ('+e1.message+')');
    await new Promise(r=>setTimeout(r, 1200));
    return await traer(url, limite);
  }
}

async function traer(url, ms){
  /* Lo del Apps Script va en cola; los archivos del propio sitio, no:
     esos los sirve GitHub Pages y pueden ir todos a la vez.            */
  if(/^https?:\/\/script\.google\.com/.test(url)) return enCola(()=>traerYa(url, ms));
  return traerYa(url, ms);
}

async function traerYa(url, ms){
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
    const txt = await r.text();
    if(txt.charAt(0) !== '{' && txt.charAt(0) !== '[')      // Google devuelve su página de error con código 200
      throw new Error('respuesta no válida del servidor');
    return JSON.parse(txt);
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

/* Red de seguridad por si una petición se queda colgada sin dar error.
   Da margen a los dos intentos (Google a veces tarda 30 s en despertar). */
const _ESPERA = ((typeof CONFIG!=='undefined' && CONFIG.TIMEOUT_MS) || 25000);
setTimeout(()=>rendirse('sin respuesta a tiempo'), _ESPERA * 2 + 3000);

/* Última respuesta buena del Apps Script, guardada en el navegador (24 h).
   Sirve para que el portal muestre los proyectos aunque Google tarde o falle;
   el dato sigue viniendo de la hoja, solo que de la visita anterior.        */
const VIVO_KEY = 'sb-datos-vivo', VIVO_HORAS = 24;
function vivoGuardar(d){
  try{ localStorage.setItem(VIVO_KEY, JSON.stringify({t:Date.now(), d:d})); }catch(e){}
}
function vivoLeer(){
  try{
    const o = JSON.parse(localStorage.getItem(VIVO_KEY) || 'null');
    if(o && o.t && (Date.now()-o.t)/3600000 < VIVO_HORAS) return o.d;
  }catch(e){}
  return null;
}

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
      /* y, si la hay, la última respuesta buena de la hoja (proyectos incluidos) */
      const vivo = vivoLeer();
      if(vivo) hayDatos = aplicarDatos(vivo, true) || hayDatos;
    }
  }catch(e){
    console.warn('Sinergia: no se pudo leer la copia local ('+e.message+')');
  }
  if(!hayDatos) respaldoCatalogo('la copia local no respondió');

  /* ── 2. datos en vivo ─────────────────────────────────────────────── */
  if(!CONFIG.DATA_URL){ rendirse('sin DATA_URL configurada'); return; }
  try{
    const d = await traerPronto(CONFIG.DATA_URL, _ESPERA);
    aplicarDatos(d, true);
    try{ sessionStorage.setItem(CACHE_KEY, JSON.stringify(d)); }catch(e){}
    vivoGuardar(d);
    console.info('Sinergia: datos sincronizados desde la hoja');
  }catch(e){
    rendirse('no se cargó el Apps Script: '+e.message);
  }
}
loadData();

