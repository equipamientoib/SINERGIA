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

/* Firma del catálogo: si no cambia, no se repinta (y no se recargan todas
   las fotos por nada). OJO con lo que entra aquí: durante meses solo
   miraba «photo», la portada. Al añadir fotos a una ficha sin cambiar la
   portada, la firma salía idéntica, se daba el catálogo por igual y NUNCA
   se aplicaban: el archivo publicado traía 43 fotos y la web seguía
   pintando 30. Por eso la lista entera cuenta, no solo la primera. */
function firmaCatalogo(d){
  return JSON.stringify([
    (d.equipos ||[]).map(e=>[e.id,e.nom,e.dia,e.photo,(e.fotos||[]).join('|'),e.cal_fin]),
    (d.paquetes||[]).map(p=>[p.id,p.nom,p.dia,(p.fotos||[]).join('|')]),
    d.modelo || null
  ]);
}
function firmaProyectos(d){
  return JSON.stringify((d.proyectos||[]).map(p=>[p.id,p.avance]));
}

let REF_EQUIPOS = 0, REF_PROYECTOS = 0;

/* El Apps Script contesta a medias de vez en cuando: devuelve el JSON con
   alguna sección vacía. Si se aplica tal cual, desaparecen proyectos de la
   pantalla; y como además se guarda 24 h, siguen desaparecidos al volver.
   Es lo que hacía que «Nuestros clientes» perdiera Limatambo cada tanto.

   Una sección vacía cuando el archivo publicado la traía llena no es un
   borrado del cliente: es una respuesta incompleta. Se descarta. */
function llegaAMedias(d){
  if(!d) return true;
  if(REF_EQUIPOS   && !(d.equipos   || []).length) return 'sin equipos';
  if(REF_PROYECTOS && !(d.proyectos || []).length) return 'sin proyectos';
  return false;
}

function aplicarDatos(d, enVivo){
  if(!d) return false;
  if(enVivo) DATOS_LISTOS = true;
  /* El mapa de fotos locales solo viene en el archivo publicado, nunca en
     la respuesta en vivo. Se guarda la primera vez y no se pisa después:
     si se perdiera, la web volvería a pedirle las fotos a Drive y Drive
     las rechazaría con 429. */
  if(d.local) fotosLocales(d.local);
  /* Del archivo publicado se anota CUÁNTO traía. Sirve de vara de medir
     para descartar respuestas en vivo que lleguen a medias. */
  if(!enVivo){
    REF_EQUIPOS   = Math.max(REF_EQUIPOS,   (d.equipos   || []).length);
    REF_PROYECTOS = Math.max(REF_PROYECTOS, (d.proyectos || []).length);
  }

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
  /* Se acepta «generado» o «actualizado»: el Apps Script pone uno u otro
     según por dónde salga la respuesta, y exigir solo el primero dejó la
     sección sin proyectos. Lo que importa es que el archivo lleve una marca
     de tiempo puesta por el script, no que se llame de una manera concreta:
     un archivo de ejemplo escrito a mano seguiría sin entrar. */
  if(!enVivo && !PRO_PINTADOS && (d.generado || d.actualizado)
     && Array.isArray(d.proyectos) && d.proyectos.length && !PROYECTOS.length){
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

/* Petición con reintentos cortos, SIEMPRE de a una.
   Medido contra el sitio en producción: el script se ejecuta siempre en
   0,6 s, pero la capa pública de Google contesta a veces en 1,5 s, a veces
   en 8 s, a veces se cuelga y a veces devuelve 404. Un intento suelto falla
   a menudo; dos o tres seguidos, casi nunca.

   Por eso se prefieren varios intentos CORTOS antes que uno largo: esperar
   25 s a una petición que ya se colgó no la salva, solo hace esperar al
   cliente. Peor caso ≈ 41 s en vez de los 150 s que llegaba a acumular.  */
const REINTENTOS = [10000, 12000, 15000];     // tiempo límite de cada intento
const PAUSAS     = [1500, 3000];              // espera entre uno y otro

async function traerPronto(url, ms){
  const tope = ms || (typeof CONFIG!=='undefined' && CONFIG.TIMEOUT_MS) || 25000;
  let ultimo;
  for(let i=0; i<REINTENTOS.length; i++){
    try{
      return await traer(url, Math.min(REINTENTOS[i], tope));
    }catch(e){
      ultimo = e;
      if(i < PAUSAS.length){
        console.warn('Sinergia: intento '+(i+1)+' sin suerte ('+e.message+'), reintentando');
        await new Promise(r=>setTimeout(r, PAUSAS[i]));
      }
    }
  }
  throw ultimo;
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
setTimeout(()=>rendirse('sin respuesta a tiempo'), 45000);   // los tres intentos caben de sobra

/* Última respuesta buena del Apps Script, guardada en el navegador (24 h).
   Sirve para que el portal muestre los proyectos aunque Google tarde o falle;
   el dato sigue viniendo de la hoja, solo que de la visita anterior.        */
const VIVO_KEY = 'sb-datos-vivo', VIVO_HORAS = 24;
function vivoGuardar(d){
  try{ localStorage.setItem(VIVO_KEY, JSON.stringify({t:Date.now(), d:d})); }catch(e){}
}
function vivoLeer(publicado){
  try{
    const o = JSON.parse(localStorage.getItem(VIVO_KEY) || 'null');
    if(!o || !o.t || (Date.now()-o.t)/3600000 >= VIVO_HORAS) return null;
    /* Esta copia se pinta ENCIMA de data/catalogo.json. Si el archivo
       publicado es más nuevo que ella, aplicarla sería retroceder: el
       visitante que ya entró antes vería el catálogo viejo hasta 24 h
       después de publicar. Pasó con las fotos de las herramientas: ya
       estaban publicadas y la página seguía pintando las de antes. */
    if(publicado && o.d && o.d.actualizado && o.d.actualizado < publicado){
      localStorage.removeItem(VIVO_KEY);
      return null;
    }
    if(llegaAMedias(o.d)){       // guardada de una respuesta mala anterior
      localStorage.removeItem(VIVO_KEY);
      return null;
    }
    return o.d;
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
    /* SIEMPRE se parte del archivo publicado, aunque haya copia de sesión.
       Antes, si la había, se pintaba esa y ya: el archivo ni se miraba. Y
       como esa copia puede venir de una respuesta incompleta de la hoja,
       no había forma de saber que faltaba algo ni con qué compararlo. De
       ahí que «Nuestros clientes» perdiera Limatambo cada tanto.

       index.html arrancó esta descarga en el <head>, antes de que
       existiera este archivo: aquí solo se recoge, ya suele estar lista. */
    let d = null;
    if(window.__catalogo) d = await window.__catalogo;
    if(!d && CONFIG.CACHE_URL) d = await traer(CONFIG.CACHE_URL, 5000);
    hayDatos = aplicarDatos(d, false);          // base completa y vara de medir

    /* Y encima, lo más fresco que haya de la hoja: primero lo de esta
       sesión; si no, la última respuesta buena guardada. Cualquiera de las
       dos se descarta si llega a medias. */
    const guardado = sessionStorage.getItem(CACHE_KEY);
    const extra = guardado ? JSON.parse(guardado) : vivoLeer(d && d.actualizado);
    if(extra && !llegaAMedias(extra)) hayDatos = aplicarDatos(extra, true) || hayDatos;
    else if(extra){
      console.warn('Sinergia: copia guardada incompleta, se descarta');
      try{ sessionStorage.removeItem(CACHE_KEY); }catch(e){}
    }
  }catch(e){
    console.warn('Sinergia: no se pudo leer la copia local ('+e.message+')');
  }
  if(!hayDatos) respaldoCatalogo('la copia local no respondió');

  /* ── 2. datos en vivo ─────────────────────────────────────────────── */
  if(!CONFIG.DATA_URL){ rendirse('sin DATA_URL configurada'); return; }

  /* Se espera a que la página esté cargada. Medido: esta llamada ocupa una
     conexión de 10 s (el Apps Script tarda o no contesta y hay que
     reintentar), y arrancaba a los 300 ms, compitiendo por el ancho de
     banda con las fotos justo cuando el visitante está mirando. No corre
     prisa: la página ya se pintó con el archivo publicado, que va completo;
     esto solo sirve por si la hoja cambió después de publicar. */
  await new Promise(function(listo){
    const seguir = () => window.requestIdleCallback
      ? requestIdleCallback(listo, {timeout: 2000})   // el 2º argumento son opciones, no ms
      : setTimeout(listo, 1);
    if(document.readyState === 'complete') seguir();
    else addEventListener('load', seguir, {once:true});
  });

  try{
    const d = await traerPronto(CONFIG.DATA_URL, _ESPERA);
    const falta = llegaAMedias(d);
    if(falta){
      /* Ni se pinta ni se guarda: se deja lo que ya había, que está completo. */
      console.warn('Sinergia: respuesta incompleta de la hoja ('+falta+'), se ignora');
      return;
    }
    aplicarDatos(d, true);
    try{ sessionStorage.setItem(CACHE_KEY, JSON.stringify(d)); }catch(e){}
    vivoGuardar(d);
    console.info('Sinergia: datos sincronizados desde la hoja');
  }catch(e){
    rendirse('no se cargó el Apps Script: '+e.message);
  }
}
loadData();

