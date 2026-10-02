/* ---- MODAL RESERVA ---- */
const vEscT = t => String(t==null?'':t).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let actual=null;
function techRates(){return {medio:TEC_MIN, dia:TEC_DIA, semana:TEC_DIA*4, mes:TEC_DIA*12};}
const MODLBL={medio:['Precio por medio día','Medios días','Cantidad de medios días (turnos)'],dia:['Precio por día','Días','Días'],semana:['Precio por semana','Semanas','Cantidad de semanas'],mes:['Precio por mes','Meses','Cantidad de meses']};
const TURNOS = `un turno de 4 h (${HORARIO_MANANA} o ${HORARIO_TARDE})`;
function pkgConds(p){return {medio:`Medio día: ${TURNOS}. Es el mínimo de alquiler.`,dia:`Jornada completa: los dos turnos (${HORARIO_MANANA} y ${HORARIO_TARDE}). Hasta ~${p.eqd} equipos.`,semana:'Tarifa semanal: equivale a 4 días (descuento por volumen).',mes:'Tarifa mensual: equivale a 12 días (mayor descuento).'};}
function eqConds(dia, id){
  if(id && soloEquipo(id)) return {medio:`Medio día: ${TURNOS}.`,
    dia:`Lo recoges y lo devuelves en nuestra oficina. No necesita instrumentista: dejas tu DNI y S/ ${fmt(garantiaDe(id))} de garantía, que se te devuelve con el equipo.`,
    semana:'Tarifa semanal: equivale a 4 días.',mes:'Tarifa mensual: equivale a 12 días.'};
  return {medio:`Medio día: ${TURNOS}.`,
  dia: tieneMedio(dia) ? `Jornada completa: los dos turnos (${HORARIO_MANANA} y ${HORARIO_TARDE}).`
                       : `Este instrumento se alquila desde un día completo (${HORARIO_MANANA} y ${HORARIO_TARDE}): por su tarifa, medio día no cubre la entrega y el recojo.`,
  semana:'Tarifa semanal: equivale a 4 días.',mes:'Tarifa mensual: equivale a 12 días.'};}
function openModal(nom,marca,prices,conds,tec,igvInc,mod0,garantia){
  if(!VER_PRECIOS){ go('#/contacto'); return; }   // precios ocultos: se cotiza por contacto
  actual={nom,prices,conds,tec,igvInc:!!igvInc,mod:'dia',gar:garantia||0,id:arguments[8]||''};
  /* Sin instrumentista: en vez de la caja del técnico va la de la garantía. */
  document.getElementById('cajaTec').hidden = !!actual.gar;
  const cg = document.getElementById('cajaGar');
  cg.hidden = !actual.gar;
  if(actual.gar) document.getElementById('cGar').textContent = 'S/ ' + fmt(actual.gar);
  /* Herramientas complementarias: van sin costo cuando va el instrumentista. */
  const extra = document.getElementById('mIncluye');
  const comp = actual.gar ? [] : incluidos(actual.id);
  extra.hidden = !comp.length;
  if(comp.length) extra.innerHTML = `<b>Incluido sin costo:</b> ${comp.map(c => vEscT(c.nom)).join(' · ')}.`;
  /* Sin medio día (instrumentos económicos), se oculta ese botón. */
  const hayMedio = prices.medio != null;
  const bMedio = document.querySelector('#modSeg [data-m="medio"]');
  if(bMedio) bMedio.hidden = !hayMedio;
  if(!hayMedio && (mod0||'medio') === 'medio') mod0 = 'dia';
  document.getElementById('mMinNota').textContent = PEDIDO_MIN
    ? `Pedido mínimo S/ ${fmt(PEDIDO_MIN)} (sin contar al instrumentista).` : '';
  document.getElementById('mTitulo').textContent=nom;
  document.getElementById('mMarca').textContent=marca;
  document.getElementById('d1').value='';document.getElementById('d2').value='';
  document.getElementById('nQty').value='1';
  setMod(mod0||'medio');
  _lastFocus=document.activeElement;
  document.body.classList.add('lock');
  document.getElementById('ov').classList.add('open');
  const x=document.querySelector('#ov .x'); if(x)x.focus();
}
function setMod(m){
  if(!actual)return;
  actual.mod=m;
  document.querySelectorAll('#modSeg button').forEach(b=>b.classList.toggle('on',b.dataset.m===m));
  const isDia=m==='dia';
  document.getElementById('inDia').style.display=isDia?'':'none';
  document.getElementById('inQty').style.display=isDia?'none':'';
  const L=MODLBL[m];
  document.getElementById('qtyLabel').textContent=L[2];
  document.getElementById('cUnitLbl').textContent=L[0];
  document.getElementById('cQtyLbl').textContent=L[1];
  document.getElementById('cTecUnitLbl').textContent={medio:'Por medio día',dia:'Por día',semana:'Por semana',mes:'Por mes'}[m];
  document.getElementById('cTecQtyLbl').textContent=L[1];
  document.getElementById('cDia').textContent='S/ '+fmt(actual.prices[m]);
  document.getElementById('modCond').textContent=actual.conds[m]||'';
  calc();
}
function clearCalc(){
  ['cDias','cSub','cIgv','cTot','cTecUnit','cTecQty','cTec','cGrand'].forEach(id=>document.getElementById(id).textContent='—');
  const f=document.getElementById('cMinFila'); if(f) f.hidden=true;
}
function abrirPaq(id){const p=PAQUETES.find(x=>x.id===id);openModal(p.nom,'Paquete '+p.nivel+' · IGV incluido',{medio:precioMedio(p.dia),dia:p.dia,semana:p.psem,mes:p.pmes},pkgConds(p),techRates(),true,'dia');}
function abrir(idx){
  const e=EQUIPOS[idx];
  const pr={dia:e.dia, semana:e.dia*4, mes:e.dia*12};
  if(tieneMedio(e.dia)) pr.medio=precioMedio(e.dia);
  openModal(e.nom, e.marca, pr, eqConds(e.dia, e.id), techRates(), true, 'medio', garantiaDe(e.id), e.id);
}
function cerrar(){
  document.getElementById('ov').classList.remove('open');
  document.body.classList.remove('lock');
  if(_lastFocus&&_lastFocus.focus)_lastFocus.focus();
}
let _lastFocus=null;
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.getElementById('ov').classList.contains('open'))cerrar();});
document.getElementById('ov').onclick=e=>{if(e.target.id==='ov')cerrar()};
function calc(){
  if(!actual)return;
  const m=actual.mod, unit=actual.prices[m];
  let qty=0;
  if(m==='dia'){
    const d1=new Date(document.getElementById('d1').value),d2=new Date(document.getElementById('d2').value);
    if(isNaN(d1)||isNaN(d2)||d2<d1){clearCalc();return;}
    qty=Math.max(1,Math.round((d2-d1)/86400000)+1);
  }else{
    qty=Math.max(1,parseInt(document.getElementById('nQty').value)||1);
  }
  const tunit=actual.gar ? 0 : (actual.tec[m]||0);
  /* Mínimo por pedido: cubre la entrega y el recojo aunque el alquiler sea chico. */
  const bruto=qty*unit, rentTot=Math.max(PEDIDO_MIN, bruto), rSub=rentTot/1.18, rIgv=rentTot-rSub;
  const fMin=document.getElementById('cMinFila');
  if(fMin){ fMin.hidden = !(rentTot > bruto); document.getElementById('cMin').textContent='S/ '+rentTot.toFixed(2); }
  const tecTot=actual.gar ? 0 : Math.max(TEC_MIN, qty*tunit), grand=rentTot+tecTot;
  document.getElementById('cDias').textContent=qty;
  document.getElementById('cSub').textContent='S/ '+rSub.toFixed(2);
  document.getElementById('cIgv').textContent='incl. S/ '+rIgv.toFixed(2);
  document.getElementById('cTot').textContent='S/ '+rentTot.toFixed(2);
  document.getElementById('cTecUnit').textContent='S/ '+tunit.toFixed(2);
  document.getElementById('cTecQty').textContent=qty;
  document.getElementById('cTec').textContent='S/ '+tecTot.toFixed(2);
  document.getElementById('cGrand').textContent='S/ '+grand.toFixed(2);
}
/* El envío real de la solicitud vive en js/11-solicitudes.js (función
   enviar). Antes aquí había una versión de prueba que solo mostraba un
   aviso diciendo "Prototipo" y no enviaba nada.                       */
