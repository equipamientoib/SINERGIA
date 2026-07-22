/* ---- MODAL RESERVA ---- */
let actual=null;
function techRates(eqd){return {equipo:TEC_DIA/(eqd||8), hora:TEC_DIA/7, dia:TEC_DIA, semana:TEC_DIA*4, mes:TEC_DIA*12};}
const MODLBL={equipo:['Precio por equipo','Equipos','Cantidad de equipos a atender'],hora:['Precio por hora','Horas','Cantidad de horas'],dia:['Precio por día','Días','Días'],semana:['Precio por semana','Semanas','Cantidad de semanas'],mes:['Precio por mes','Meses','Cantidad de meses']};
function pkgConds(p){return {equipo:'Pagas por cada equipo atendido. Ideal para 1–2 equipos.',hora:`Por hora de servicio. En 1 h se atienden ~${p.eqh} equipos.`,dia:`Jornada de 7 h efectivas (8 h − 1 h de almuerzo). Hasta ~${p.eqd} equipos.`,semana:'Tarifa semanal: equivale a 4 días (descuento por volumen).',mes:'Tarifa mensual: equivale a 12 días (mayor descuento).'};}
function eqConds(){return {equipo:'Pagas por cada equipo que atiendas con el instrumento.',hora:'Por hora de uso del instrumento.',dia:'Jornada de 7 h efectivas (8 h − 1 h de almuerzo).',semana:'Tarifa semanal: equivale a 4 días.',mes:'Tarifa mensual: equivale a 12 días.'};}
function openModal(nom,marca,prices,conds,tec,igvInc,mod0){
  actual={nom,prices,conds,tec,igvInc:!!igvInc,mod:'dia'};
  document.getElementById('mTitulo').textContent=nom;
  document.getElementById('mMarca').textContent=marca;
  document.getElementById('d1').value='';document.getElementById('d2').value='';
  document.getElementById('nQty').value='1';
  setMod(mod0||'hora');
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
  document.getElementById('cTecUnitLbl').textContent={equipo:'Por equipo',hora:'Por hora',dia:'Por día',semana:'Por semana',mes:'Por mes'}[m];
  document.getElementById('cTecQtyLbl').textContent=L[1];
  document.getElementById('cDia').textContent='S/ '+actual.prices[m];
  document.getElementById('modCond').textContent=actual.conds[m]||'';
  calc();
}
function clearCalc(){['cDias','cSub','cIgv','cTot','cTecUnit','cTecQty','cTec','cGrand'].forEach(id=>document.getElementById(id).textContent='—');}
function abrirPaq(id){const p=PAQUETES.find(x=>x.id===id);openModal(p.nom,'Paquete '+p.nivel+' · IGV incluido',{equipo:p.pe,hora:p.ph,dia:p.dia,semana:p.psem,mes:p.pmes},pkgConds(p),techRates(p.eqd),true,'dia');}
function abrir(idx){
  const e=EQUIPOS[idx];
  openModal(e.nom, e.marca, {equipo:precioEquipo(e.dia), hora:precioHora(e.dia), dia:e.dia, semana:e.dia*4, mes:e.dia*12}, eqConds(), techRates(8), true, 'hora');
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
  const tunit=actual.tec[m]||0;
  const rentTot=qty*unit, rSub=rentTot/1.18, rIgv=rentTot-rSub;
  const tecTot=Math.max(TEC_MIN, qty*tunit), grand=rentTot+tecTot;
  document.getElementById('cDias').textContent=qty;
  document.getElementById('cSub').textContent='S/ '+rSub.toFixed(2);
  document.getElementById('cIgv').textContent='incl. S/ '+rIgv.toFixed(2);
  document.getElementById('cTot').textContent='S/ '+rentTot.toFixed(2);
  document.getElementById('cTecUnit').textContent='S/ '+tunit.toFixed(2);
  document.getElementById('cTecQty').textContent=qty;
  document.getElementById('cTec').textContent='S/ '+tecTot.toFixed(2);
  document.getElementById('cGrand').textContent='S/ '+grand.toFixed(2);
}
function enviar(){alert('Prototipo: aquí la solicitud se enviaría a tu correo (Formspree) y/o se guardaría como reserva.\n\nEquipo: '+actual.nom);cerrar();}
