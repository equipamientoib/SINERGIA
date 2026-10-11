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
  function anchoCajon(){
    try{
      var n = Math.round(window.innerWidth * 0.5);
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
})();
