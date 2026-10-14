/* ═══════════ MODO EMPOTRADO: SÓLO LA FISCALIZACIÓN ═══════════

   Esta carpeta es la herramienta de armado tal cual, y suelta funciona
   igual que en el equipo. Pero dentro de la pestaña «PME en base
   PMF/PMA/NTS» del expediente no se quiere la herramienta entera: el
   expediente ya tiene su cabecera y sus pestañas, y de aquí sólo
   interesa la Fiscalización.

   Con «?solo=fis» se arranca en esa pestaña y se esconde lo que
   duplicaría al expediente: la cabecera del sitio, la miga de pan, la
   ficha del proyecto, la barra de pestañas de la herramienta y el pie.
   Nada se quita del código: se oculta con una clase, así que la misma
   carpeta abierta aparte sigue siendo la herramienta completa.

   Va al final, después de 01-pme.js, para pisar el PME_TAB que deja el
   arranque sin tocar ese archivo.                                    */

(function empotrado(){
  var q = new URLSearchParams(location.search);
  if(q.get('solo') !== 'fis') return;

  document.documentElement.classList.add('pme-empotrado');

  /* La pestaña de arranque. pmeArrancar() ya pintó con 'res', así que
     se cambia y se repinta: es lo mismo que pulsar «Fiscalización». */
  try{
    if(typeof setPmeTab === 'function') setPmeTab('fis');
    else { PME_TAB = 'fis'; if(typeof pintarPme === 'function') pintarPme(); }
  }catch(e){}

  /* El cajón de cotejo se cuelga de la ventana —que aquí es la del
     marco— y mide su ancho con innerWidth. Al empotrar, la ventana es
     más estrecha que la pantalla: se le deja la mitad justa y se olvida
     el ancho guardado de cuando se usó suelta. */
  /* Medir puede salir mal: el marco todavía no está maquetado, o la
     pestaña está escondida, y entonces innerWidth es 0. Guardar ese 0
     no deja un cajón estrecho, deja un cajón de cero píxeles —y como se
     guarda, se lo lleva a la siguiente sesión, cuando ya no hay forma
     de ensancharlo porque no se ve ni el tirador—. Así que una medida
     que no llega al mínimo no se usa ni se guarda: se deja la que
     hubiera, que la herramienta ya sabe acotar. */
  var CAJON_MIN = 420;
  function anchoCajon(){
    try{
      var w = window.innerWidth;
      if(!w || w < CAJON_MIN + 120) return;        // no cabe: no se toca nada
      var n = Math.min(Math.max(Math.round(w * 0.5), CAJON_MIN), Math.round(w * 0.8));
      localStorage.setItem('pme-cajon-ancho', n);
      document.documentElement.style.setProperty('--cajon', n + 'px');
    }catch(e){}
  }
  anchoCajon();
  addEventListener('resize', function(){
    if(document.querySelector('.fis-cajon')) anchoCajon();
  });

  /* Cotejar necesita ALTO: tres documentos apilados en el alto de una
     pestaña no se leen, y al repartirlos con el tirador chocan con el
     mínimo y se pliegan. Así que se avisa a la página de fuera cuando
     el cajón se abre y se cierra, y ella le da al marco la pantalla
     entera mientras dure. Cuando se cierra, el marco vuelve a su sitio
     dentro de la pestaña. */
  var abierto = null;
  function avisar(){
    var hay = !!document.querySelector('.fis-cajon');
    if(hay === abierto) return;
    abierto = hay;
    try{ parent.postMessage({pme: 'cotejo', abierto: hay}, '*'); }catch(e){}
    if(hay) anchoCajon();
  }
  new MutationObserver(avisar).observe(document.body, {childList: true, subtree: true});
  avisar();

  /* El Excel de normas son 1,4 MB y leerlo con SheetJS tarda. Si se
     empieza cuando se abre el cotejo, el tercer panel se queda en
     «Leyendo el Excel de normas…» un buen rato, justo cuando se quiere
     mirar. Se empieza a traer en cuanto la fiscalización está en
     pantalla, en segundo plano: cuando se abra el cajón, ya está.

     FIS_LIBRO es un `let` del módulo, no de window, pero este archivo
     carga después, así que se alcanza por su nombre. Si alguien abre el
     cotejo antes de que termine, fisCargarLibro() lo lee por su cuenta y
     no pasa nada: el segundo en llegar ve FIS_LIBRO puesto. */
  setTimeout(function(){
    try{
      if(typeof FIS_LIBRO !== 'undefined' && FIS_LIBRO) return;
      pmeSheetJs().then(function(XLSX){
        return fetch(FIS_DOCS.xls.src).then(function(r){
          if(!r.ok) throw new Error('no está');
          return r.arrayBuffer();
        }).then(function(buf){
          if(!FIS_LIBRO) FIS_LIBRO = XLSX.read(buf, {type: 'array'});
        });
      }).catch(function(){ /* sin red: se leerá al abrir el cotejo */ });
    }catch(e){}
  }, 800);
})();
