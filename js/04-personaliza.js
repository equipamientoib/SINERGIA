/* ---- PERSONALIZA TU PAQUETE ---- */
const CUSTOM={sel:new Set(),kit:false};
function buildCustom(){
  const groups=[['ansim','Analizadores y simuladores'],['med','Instrumentos de medición'],['elec','Medidores eléctricos']];
  let html=groups.map(([g,label])=>{
    const items=EQUIPOS.filter(e=>e.g===g&&!e.apoyo);
    if(!items.length)return '';
    return `<div class="cgroup"><div class="cgh">${label}</div>`+items.map(e=>`<label class="citem"><input type="checkbox" value="${e.id}" ${CUSTOM.sel.has(e.id)?'checked':''} onchange="toggleCustom('${e.id}',this.checked)"><span class="cn">${e.nom}</span><span class="cp">S/ ${e.dia}/día</span></label>`).join('')+`</div>`;
  }).join('');
  html+=`<div class="cgroup"><div class="cgh">Extra</div><label class="citem"><input type="checkbox" ${CUSTOM.kit?'checked':''} onchange="toggleKit(this.checked)"><span class="cn">Kit de herramientas de apoyo (set 46 pzs + destornillador eléctrico)</span><span class="cp">+ S/ ${KIT_DIA}/día</span></label></div>`;
  document.getElementById('customList').innerHTML=html;
  renderCustomSummary();
}
function toggleCustom(id,on){on?CUSTOM.sel.add(id):CUSTOM.sel.delete(id);renderCustomSummary();}
function toggleKit(on){CUSTOM.kit=on;renderCustomSummary();}
function customDisc(n){if(n>=4)return DESC_COMB["4"]||0.15;return DESC_COMB[String(n)]||0;}
function customCalc(){
  let sum=0;CUSTOM.sel.forEach(id=>sum+=byId(id).dia);
  const disc=customDisc(CUSTOM.sel.size);
  let dia=sum*(1-disc); if(CUSTOM.kit)dia+=KIT_DIA;
  return {sum,disc,dia:Math.round(dia)};
}
function renderCustomSummary(){
  const c=customCalc(), n=CUSTOM.sel.size;
  const items=[...CUSTOM.sel].map(id=>byId(id).nom);
  document.getElementById('customSummary').innerHTML=
    `<div class="csh">Tu paquete</div>`+
    (n?`<ul class="csel">${items.map(x=>`<li>${x}</li>`).join('')}${CUSTOM.kit?'<li>Kit de herramientas de apoyo</li>':''}</ul>`:`<div class="cempty">Aún no eliges instrumentos. Marca los que necesites a la izquierda.</div>`)+
    (n?`<div class="crow"><span>Suma instrumentos</span><span>S/ ${fmt(c.sum)}/día</span></div>`:'')+
    (c.disc?`<div class="crow disc"><span>Descuento por combinar (${Math.round(c.disc*100)}%)</span><span>− S/ ${fmt(Math.round(c.sum*c.disc))}</span></div>`:'')+
    (CUSTOM.kit?`<div class="crow"><span>Kit de apoyo</span><span>+ S/ ${fmt(KIT_DIA)}</span></div>`:'')+
    `<div class="ctot"><span>Total por día</span><span>S/ ${fmt(c.dia)}</span></div>`+
    `<button class="btn btn-fill" ${n<1?'disabled':''} onclick="reservarCustom()">Reservar mi paquete</button>`+
    `<div class="cnote">Precio con IGV incluido. El instrumentista se cobra aparte (mínimo medio día). Al reservar eliges por día, semana, mes, etc.</div>`;
}
function reservarCustom(){
  const c=customCalc(); if(c.dia<=0)return;
  const n=CUSTOM.sel.size;
  const nom='Paquete personalizado ('+n+' instrumento'+(n!==1?'s':'')+(CUSTOM.kit?' + kit':'')+')';
  openModal(nom,'Paquete personalizado · IGV incluido',{equipo:precioEquipo(c.dia),hora:precioHora(c.dia),dia:c.dia,semana:c.dia*4,mes:c.dia*12},eqConds(),techRates(8),true,'dia');
}

/* selector en contacto */
const cEq=document.getElementById('cEq');
cEq.innerHTML='<option>— Selecciona —</option>'+EQUIPOS.map(e=>`<option>${e.nom}</option>`).join('');

