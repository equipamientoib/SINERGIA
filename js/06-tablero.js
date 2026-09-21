/* =====================================================================
   06-tablero.js — RESUMEN, PRESUPUESTO y PREINSTALACIÓN del expediente
   ---------------------------------------------------------------------
   Tres pestañas del panel tipo "expediente" (06-expediente.js) que comparten
   una misma pieza: la MATRIZ (tabla con filtros por columna, buscador, orden,
   paginación y descarga) y dos gráficos SVG sin librerías (barras y dona).

   Datos: d.metrado (UPSS › ambientes › equipos), d.presupuesto (precio por
   código) y d.preinst (parámetros de preinstalación por código), que exporta
   el motor con `py run.py web`.
   ===================================================================== */

/* Colores por grupo genérico: orden fijo (no se reasignan al filtrar). */
const TB_GRUPOS = ['B','C','E','INST','MA','MC','V','INF','LEN','MEN'];
/* Paleta de presentación: la familia cromática del sitio (ónix → bronce → crema),
   sin colores de fiesta. En las barras el color es único (la identidad la da el
   eje); en la dona y las tablas cada grupo toma un tono de la escala, siempre
   con etiqueta directa para que el color nunca vaya solo.                    */
const TB_COLOR  = {B:'#17191D',C:'#3A3F47',E:'#5A4F3A',INST:'#7E6234',MA:'#9A7F4E',MC:'#B5945A',V:'#D8C49A',INF:'#8A8F98',LEN:'#C9C2B2',MEN:'#E6E0D2'};
const TB_BARRA  = '#9A7F4E';           // color único de las barras
const TB_BARRA_H= '#7E6234';
const TB_CLASIF = {B:'EQUIPO BIOMEDICO',C:'EQUIPO COMPLEMENTARIO',E:'EQUIPO ELECTROMECANICO',INST:'INSTRUMENTAL',MA:'MOBILIARIO ADMINISTRATIVO',MC:'MOBILIARIO CLINICO',V:'VEHICULOS',INF:'EQUIPO INFORMATICO',LEN:'LENCERIA',MEN:'MENAJERIA'};
const TB_NOMBRE = {B:'Biomédico',C:'Complementario',E:'Electromecánico',INST:'Instrumental',MA:'Mob. administrativo',MC:'Mob. clínico',V:'Vehículos',INF:'Informático',LEN:'Lencería',MEN:'Menajería'};
const tbNorm=t=>String(t||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
const tbNum=n=>String(Math.round(Number(n||0))).replace(/\B(?=(\d{3})+(?!\d))/g,' ');
const tbSoles=n=>'S/ '+Number(n||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
const tbEsc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ───────────────────────── filas base ───────────────────────── */
/* Una fila por ambiente × código, con precio unitario y parámetros de
   preinstalación ya cruzados. Se calcula una vez por proyecto.            */
let TB_BASE=null;
let TB_CLAVES=null;
function tbClaves(d){ if(TB_CLAVES&&TB_CLAVES.d===d) return TB_CLAVES.m; const m={}; (d.claves||[]).forEach(c=>m[c.clave]=c); TB_CLAVES={d,m}; return m; }
function tbFilas(d){
  if(TB_BASE&&TB_BASE.d===d) return TB_BASE.filas;
  const precio={}; (d.presupuesto&&d.presupuesto.codigos||[]).forEach(c=>precio[c.clave]=c);
  const pre={}; (d.preinst&&d.preinst.codigos||[]).forEach(c=>pre[c.clave]=c.v);
  const cl=tbClaves(d);                      // descripción / grupo / provee por clave (el metrado sólo trae clave + cantidad)
  const filas=[]; let n=0;
  (d.metrado||[]).forEach(u=>u.ambientes.forEach(a=>a.equipos.forEach(q=>{
    const p=precio[q.clave]||{}; const c=cl[q.clave]||q;
    filas.push({n:++n, piso:(a.nivel||'').replace(/^PISO\s*0?/i,'')||'—', upss:u.upss, cod_amb:a.cod, ambiente:titulo(a.nombre),
                clave:q.clave, desc:titulo(c.desc||''), grupo:c.grupo||'—', provee:c.provee||'—', cant:q.cant,
                unit:p.unit||null, total:p.unit?Math.round(p.unit*q.cant*100)/100:0, sinPrecio:!p.unit&&c.provee==='EQ.',
                pi:pre[q.clave]||{}});
  })));
  TB_BASE={d,filas}; return filas;
}

/* ───────────────────────── gráficos SVG ───────────────────────── */
/* Barras verticales de UNA medida (dos medidas = dos gráficos, nunca doble eje). */
function tbBarras(cats, valores, colores, opts){
  opts=opts||{}; const W=opts.w||520, H=opts.h||220, mL=44, mR=10, mT=26, mB=34;
  const selec=opts.selec||null;      // grupo seleccionado (los demás se atenúan)
  const max=Math.max(1,...valores); const pw=W-mL-mR, ph=H-mT-mB;
  const bw=Math.min(44, pw/cats.length*0.56);
  const fmt=opts.fmt||tbNum;
  let g='';
  /* rejilla suave (4 líneas) */
  for(let i=1;i<=4;i++){ const y=mT+ph-ph*i/4; g+=`<line x1="${mL}" x2="${W-mR}" y1="${y}" y2="${y}" stroke="rgba(23,25,29,.08)"/><text x="${mL-6}" y="${y+3}" text-anchor="end" class="tb-eje">${fmt(max*i/4)}</text>`; }
  g+=`<line x1="${mL}" x2="${W-mR}" y1="${mT+ph}" y2="${mT+ph}" stroke="rgba(23,25,29,.25)"/>`;
  cats.forEach((c,i)=>{
    const x=mL+pw*(i+0.5)/cats.length-bw/2, h=ph*valores[i]/max, y=mT+ph-h;
    const fill=opts.porColor?colores[i]:TB_BARRA;
    const dim=selec&&!selec.has(c), sel=selec&&selec.has(c);
    g+=`<g class="tb-barra ${dim?'dim':''} ${sel?'sel':''}" data-i="${i}" ${opts.onClic?`onclick="${opts.onClic}('${tbEsc(c)}')"`:''}><rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="3" ry="3" fill="${fill}"><title>${tbEsc(c)}: ${fmt(valores[i])}</title></rect>
        <rect x="${x}" y="${mT+ph-Math.min(h,3)}" width="${bw}" height="${Math.min(h,3)}" fill="${fill}"/>
        <text x="${x+bw/2}" y="${y-6}" text-anchor="middle" class="tb-val">${valores[i]?fmt(valores[i]):''}</text>
        <text x="${x+bw/2}" y="${mT+ph+16}" text-anchor="middle" class="tb-cat">${tbEsc(c)}</text></g>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" class="tb-svg" role="img" aria-label="${tbEsc(opts.titulo||'')}">${g}</svg>`;
}
/* Dona de participación con etiquetas directas (código y %) y leyenda aparte. */
function tbDona(cats, valores, colores, opts){
  /* Pastel con etiquetas afuera (código + %) unidas por una línea guía; las etiquetas
     de cada lado se apilan para no montarse. El total va como subtítulo del gráfico. */
  opts=opts||{}; const W=360, H=232, cx=180, cy=112, R=80; const selec=opts.selec||null;
  const tot=valores.reduce((s,v)=>s+v,0)||1; let a0=-Math.PI/2; let g='';
  const fmt=opts.fmt||tbNum; const p=(a,rr)=>[cx+rr*Math.cos(a),cy+rr*Math.sin(a)];
  const etiquetas=[];
  cats.forEach((c,i)=>{
    const v=valores[i]; if(!v) return;
    const a1=a0+2*Math.PI*v/tot; const big=(a1-a0)>Math.PI?1:0;
    const [x0,y0]=p(a0,R),[x1,y1]=p(a1,R);
    const d=(a1-a0)>=2*Math.PI-1e-6?`M${cx-R},${cy} A${R},${R} 0 1 1 ${cx+R},${cy} A${R},${R} 0 1 1 ${cx-R},${cy} Z`:`M${cx},${cy} L${x0},${y0} A${R},${R} 0 ${big} 1 ${x1},${y1} Z`;
    g+=`<path class="tb-porcion ${selec&&!selec.has(c)?'dim':''} ${selec&&selec.has(c)?'sel':''}" ${opts.onClic?`onclick="${opts.onClic}('${tbEsc(c)}')"`:''} d="${d}" fill="${colores[i]}" stroke="#fff" stroke-width="2"><title>${tbEsc(c)}: ${fmt(v)} (${(100*v/tot).toFixed(1)} %)</title></path>`;
    const am=(a0+a1)/2; const [ax,ay]=p(am,R-2); const [ex,ey]=p(am,R+12);
    etiquetas.push({c,i,pct:100*v/tot,ax,ay,ex,y:ey,der:Math.cos(am)>=0,dim:selec&&!selec.has(c)});
    a0=a1;
  });
  /* apilar etiquetas por lado (mínimo 13 px entre ellas) */
  ['der','izq'].forEach(lado=>{ const l=etiquetas.filter(e=>lado==='der'?e.der:!e.der).sort((a,b)=>a.y-b.y);
    for(let k=1;k<l.length;k++) if(l[k].y<l[k-1].y+13) l[k].y=l[k-1].y+13;
    for(let k=l.length-2;k>=0;k--) if(l[k].y>l[k+1].y-13) l[k].y=l[k+1].y-13; });
  etiquetas.forEach(e=>{ const xl=e.der?cx+R+30:cx-R-30; const xt=e.der?xl+4:xl-4;
    g+=`<g class="tb-guia ${e.dim?'dim':''}"><polyline points="${e.ax},${e.ay} ${e.ex},${e.y} ${xl},${e.y}" fill="none" stroke="${colores[e.i]}" stroke-width="1.2"/><circle cx="${e.ax}" cy="${e.ay}" r="1.6" fill="${colores[e.i]}"/>
      <text x="${xt}" y="${e.y+3.5}" text-anchor="${e.der?'start':'end'}" class="tb-eti" ${opts.onClic?`onclick="${opts.onClic}('${tbEsc(e.c)}')"`:''}><tspan class="tb-eti-c">${tbEsc(e.c)}</tspan> ${e.pct.toFixed(1)} %</text></g>`; });
  g+=`<text x="${cx}" y="${H-8}" text-anchor="middle" class="tb-dona-l">Total ${tbEsc(opts.centro||'')}: <tspan class="tb-dona-n">${fmt(tot)}</tspan></text>`;
  return `<svg viewBox="0 0 ${W} ${H}" class="tb-svg tb-dona" role="img">${g}</svg>`;
}
function tbLeyenda(cats, colores, valores, fmt, onClic, selec){
  fmt=fmt||tbNum; const tot=valores?valores.reduce((s,v)=>s+v,0)||1:0;
  return `<ul class="tb-leyenda">${cats.map((c,i)=>`<li title="${tbEsc(TB_NOMBRE[c]||c)}" class="${selec&&!selec.has(c)?'dim':''} ${selec&&selec.has(c)?'sel':''}" ${onClic?`onclick="${onClic}('${tbEsc(c)}')"`:''}><i style="background:${colores[i]}"></i><b>${tbEsc(c)}</b><span>${TB_NOMBRE[c]?`<small>${tbEsc(TB_NOMBRE[c])}</small>`:''}</span>${valores?`<em>${fmt(valores[i])}</em><u>${(100*valores[i]/tot).toFixed(1)} %</u>`:''}</li>`).join('')}</ul>`;
}
/* Agrega por grupo, en el orden fijo, sólo los grupos presentes. */
function tbPorGrupo(filas, campo){
  const acc={}; const items={};
  filas.forEach(r=>{ acc[r.grupo]=(acc[r.grupo]||0)+(campo==='items'?0:(r[campo]||0)); (items[r.grupo]=items[r.grupo]||new Set()).add(r.clave); });
  const cats=TB_GRUPOS.filter(g=>items[g]).concat(Object.keys(items).filter(g=>TB_GRUPOS.indexOf(g)<0));
  return {cats, valores:cats.map(g=>campo==='items'?items[g].size:Math.round((acc[g]||0)*100)/100), colores:cats.map(g=>TB_COLOR[g]||'#999')};
}

/* ───────────────────────── MATRIZ genérica ───────────────────────── */
/* cfg: {id, filas, cols:[{k,t,cls,filtro,fmt,rot}], buscar:[k], porPag, kpis(f), extra(f)}
   Pinta en #<id>: filtros (menús por columna), buscador, tabla ordenable y
   paginada, pie con totales, descarga CSV. Cada cambio repinta sólo la tabla
   y llama a cfg.onCambio(filasVisibles) para que el tablero actualice KPIs
   y gráficos.                                                            */
const TB_MATRICES={};
function tbMatriz(cfg){
  const prev=TB_MATRICES[cfg.id];
  const m=Object.assign({q:'',sel:{},orden:{col:cfg.ordenInicial||'n',dir:1},pag:0,porPag:cfg.porPag||(cfg.compacto?1e9:100),menu:null,extraSel:{},abiertos:new Set()},cfg);
  /* cuadros que se vuelven a montar en cada cambio del tablero: conservan su orden, filtros y filas abiertas */
  if(cfg.conservar&&prev){ m.sel=prev.sel; m.orden=prev.orden; m.q=prev.q; m.abiertos=prev.abiertos; if(prev._cerrarMenu) prev._cerrarMenu(); }
  TB_MATRICES[m.id]=m;
  m.visibles=function(excluir){
    const q=tbNorm(m.q);
    let f=m.filas.filter(r=>{
      for(const k in m.sel){ if(k===excluir) continue; const s=m.sel[k]; if(s&&s.size&&!s.has(String(r[k]))) return false; }
      if(m.filtroExtra&&!m.filtroExtra(r)) return false;
      if(q&&tbNorm((m.buscar||[]).map(k=>r[k]).join(' ')).indexOf(q)<0) return false;
      return true;
    });
    const {col,dir}=m.orden;
    return f.slice().sort((a,b)=>{ const x=a[col],y=b[col]; if(typeof x==='number'&&typeof y==='number') return (x-y)*dir; return String(x==null?'':x).localeCompare(String(y==null?'':y),'es',{numeric:true})*dir; });
  };
  m.pintar=function(){
    if(m.compacto){
      /* sólo la tabla, con las mismas cabeceras (orden al clic, ▾ filtra); sin barra de filtros ni paginación */
      const box=document.getElementById(m.id); if(!box) return;
      document.querySelectorAll(`body > #${m.id}-menu`).forEach(e=>e.remove()); m.menu=null;
      box.classList.add('tb-matriz','tb-compacto'); box.style.position='relative';
      box.innerHTML=`<div class="met-menu" id="${m.id}-menu" hidden></div><div class="met-tabla-wrap"><div id="${m.id}-tabla"></div></div>`;
      m.pintarTabla(); return;
    }
    tbCerrarMenus();
    const box=document.getElementById(m.id); if(!box) return;
    box.classList.add('tb-matriz');
    const botones=m.cols.filter(c=>c.filtro&&!c.soloPdf).map(c=>{ const n=m.sel[c.k]?m.sel[c.k].size:0; return `<button type="button" class="chip met-chip ${n?'on':''}" data-col="${c.k}" onclick="tbMenu('${m.id}','${c.k}',this)">${c.t}${n?`<em>${n}</em>`:''}</button>`; }).join('');
    box.style.position='relative';
    box.innerHTML=`<div class="met-filtros">
        <div class="met-fila"><span class="met-lbl">Filtros</span>${botones}${m.extraHtml?m.extraHtml():''}</div>
        <div class="met-fila"><input type="search" placeholder="${tbEsc(m.placeholder||'Buscar…')}" value="${tbEsc(m.q)}" oninput="tbBuscar('${m.id}',this.value)">
          <button type="button" class="ex-btn" onclick="tbLimpiar('${m.id}')">Limpiar filtros</button>
          ${m.descarga!==false?`<button type="button" class="ex-btn ver" onclick="tbDescargar('${m.id}')" title="PDF con el membrete del expediente y las filas que se ven">⬇ Descargar vista</button><button type="button" class="ex-btn edit" onclick="tbDescargarCsv('${m.id}')" title="Sólo los datos, para Excel">CSV</button>`:''}
          <span class="det-n" id="${m.id}-resumen"></span></div>
        </div>
      <div class="met-menu" id="${m.id}-menu" hidden></div>
      <div id="${m.id}-arriba"></div>
      <div class="met-tabla-wrap"><div id="${m.id}-tabla"></div></div>`;
    m.pintarTabla();
  };
  m.pintarTabla=function(){
    const box=document.getElementById(m.id+'-tabla'); if(!box) return;
    const v=m.visibles();
    const paginas=Math.max(1,Math.ceil(v.length/m.porPag)); if(m.pag>=paginas) m.pag=paginas-1;
    const ini=m.pag*m.porPag, fin=Math.min(v.length,ini+m.porPag);
    const colsV=m.cols.filter(c=>!c.soloPdf);
    const cab=colsV.map(c=>{ const filtrada=m.sel[c.k]&&m.sel[c.k].size; const ord=m.orden.col===c.k;
      return `<th class="${c.cls||''} ${c.rotar?'tb-rot':''} ${ord?'ord':''} ${filtrada?'filtrada':''}" title="${tbEsc(c.titulo||c.t)}">
        <span class="tb-th" title="Clic: ordena ↑, otra vez ↓, otra vez quita el orden" onclick="tbOrdenar('${m.id}','${c.k}')">${c.t}${ord?`<i>${m.orden.dir>0?'▲':'▼'}</i>`:''}</span>
        ${c.k==='n'?'':`<button type="button" class="tb-th-btn ${filtrada?'on':''}" onclick="event.stopPropagation();tbMenu('${m.id}','${c.k}',this,true)" aria-label="Ordenar o filtrar ${tbEsc(c.t)}">▾</button>`}</th>`; }).join('');
    const celda=(c,r,i)=>{ const val=c.k==='n'?ini+i+1:r[c.k]; const txt=c.fmt?c.fmt(val,r):tbEsc(val==null?'':val); return `<td class="${c.cls||''}">${txt}</td>`; };
    const filas=v.slice(ini,fin).map((r,i)=>{
      const celdas=colsV.map(c=>celda(c,r,i)).join('');
      if(m.detalle){ const key=String(m.filaKey?m.filaKey(r):i); const ab=m.abiertos.has(key);
        return `<tr class="tb-fila-det ${ab?'abierto':''}" onclick="tbAlternarDet('${m.id}','${tbEsc(key)}')" title="Clic: ver/ocultar el detalle">${celdas}</tr>${ab?`<tr class="tb-det"><td colspan="${colsV.length}">${m.detalle(r)}</td></tr>`:''}`; }
      return `<tr ${m.filaAttr?m.filaAttr(r):''}>${celdas}</tr>`; }).join('');
    const pie=m.pie?m.pie(v):'';
    const pag=paginas>1?`<div class="met-pag"><button type="button" class="ex-btn" ${m.pag===0?'disabled':''} onclick="tbPag('${m.id}',${m.pag-1})">‹ Anterior</button><span>${tbNum(ini+1)} – ${tbNum(fin)} de ${tbNum(v.length)}</span><button type="button" class="ex-btn" ${m.pag>=paginas-1?'disabled':''} onclick="tbPag('${m.id}',${m.pag+1})">Siguiente ›</button></div>`:'';
    box.innerHTML=`<table class="met-tabla ${m.compacto?'tb-mini':''} ${m.clase||''}"><thead><tr>${cab}</tr></thead><tbody>${filas||`<tr><td colspan="${colsV.length}" class="hvacio">Ninguna línea coincide con los filtros.</td></tr>`}</tbody>${pie?`<tfoot>${pie}</tfoot>`:''}</table>${pag}`;
    const res=document.getElementById(m.id+'-resumen'); if(res) res.innerHTML=(m.resumen||(x=>`Mostrando <b>${tbNum(x.length)}</b> de ${tbNum(m.filas.length)} líneas`))(v);
    document.querySelectorAll(`#${m.id} .met-chip`).forEach(b=>{ const k=b.dataset.col; const n=m.sel[k]?m.sel[k].size:0; b.classList.toggle('on',!!n); b.innerHTML=m.cols.find(c=>c.k===k).t+(n?`<em>${n}</em>`:''); });
    if(m.onCambio) m.onCambio(v, document.getElementById(m.id+'-arriba'));
  };
  return m;
}
function tbBuscar(id,v){ const m=TB_MATRICES[id]; m.q=v; m.pag=0; m.pintarTabla(); }
function tbAlternarDet(id,key){ const m=TB_MATRICES[id]; if(!m) return; if(m.abiertos.has(key)) m.abiertos.delete(key); else m.abiertos.add(key); m.pintarTabla(); }
function tbLimpiar(id){ const m=TB_MATRICES[id]; m.sel={}; m.q=''; m.pag=0; if(m.limpiarExtra) m.limpiarExtra(); tbCerrarMenu(id); m.pintar(); }
function tbOrdenar(id,col){
  const m=TB_MATRICES[id];
  if(m.orden.col===col&&m.orden.dir===1) m.orden={col,dir:-1};            /* asc -> desc */
  else if(m.orden.col===col&&m.orden.dir===-1) m.orden={col:m.ordenInicial||'n',dir:1}; /* desc -> sin orden */
  else m.orden={col,dir:1};
  m.pag=0; m.pintarTabla();
}
function tbPag(id,p){ const m=TB_MATRICES[id]; m.pag=p; m.pintarTabla(); const w=document.querySelector(`#${id} .met-tabla-wrap`); if(w) w.scrollIntoView({block:'start',behavior:'smooth'}); }
function tbMenu(id,col,btn,desdeCabecera){
  const m=TB_MATRICES[id]; const menu=document.getElementById(id+'-menu'); if(!menu) return;
  if(m.menu===col&&!desdeCabecera){ tbCerrarMenu(id); return; }
  m.menu=col; const c=m.cols.find(x=>x.k===col);
  const guard=m.sel[col]; delete m.sel[col]; const base=m.visibles(); if(guard) m.sel[col]=guard;
  const cnt={}; base.forEach(r=>{ const v=String(r[col]==null?'':r[col]); cnt[v]=(cnt[v]||0)+1; });
  const vals=Object.keys(cnt).sort((a,b)=>a.localeCompare(b,'es',{numeric:true}));
  const sel=m.sel[col]||new Set(); const rot=v=>(c.rot&&c.rot[v])||v||'(vacío)';
  menu.innerHTML=`<div class="met-menu-h"><b>${c.titulo||c.t}</b><span>${vals.length} valores</span>
      <button type="button" class="met-menu-x" onclick="tbCerrarMenu('${id}')" aria-label="Cerrar">✕</button></div>
    <div class="tb-menu-sel"><span>Filtrar por valor</span><button type="button" onclick="tbSelTodos('${id}','${col}',true)">todos</button><button type="button" onclick="tbSelTodos('${id}','${col}',false)">ninguno</button>${m.sel[col]?`<button type="button" onclick="tbQuitarFiltro('${id}','${col}')">quitar filtro</button>`:''}</div>
    ${vals.length>8?`<input type="search" class="cad-buscar" placeholder="Buscar valor…" oninput="tbFiltrarMenu('${id}',this.value)">`:''}
    <div class="met-menu-lista">${vals.map(v=>`<label data-v="${tbEsc(tbNorm(rot(v)))}"><input type="checkbox" ${sel.has(v)?'checked':''} value="${tbEsc(v)}" onchange="tbTog('${id}','${col}',this.value,this.checked)"><span>${tbEsc(rot(v))}</span><em>${tbNum(cnt[v])}</em></label>`).join('')}</div>`;
  /* el menu se cuelga del <body>: asi no lo recorta la tabla ni lo desplaza el transform de la pagina */
  if(!menu._casa) menu._casa=menu.parentElement;
  if(menu.parentElement!==document.body) document.body.appendChild(menu);
  menu.hidden=false;
  const movil=window.innerWidth<=820;
  menu.classList.toggle('hoja',movil);
  if(movil){ menu.style.left=menu.style.top=menu.style.width=''; }
  else{
    const r=btn.getBoundingClientRect(), vw=document.documentElement.clientWidth;
    const ancho=320; menu.style.width=ancho+'px';
    menu.style.left=Math.max(4,Math.min(r.left+window.scrollX, vw-ancho-4+window.scrollX))+'px';
    menu.style.top=(r.bottom+window.scrollY+6)+'px';
  }
  const fuera=e=>{ if(menu.hidden) return; if(menu.contains(e.target)||e.target.closest('.met-chip')||e.target.closest('.tb-th-btn')){ document.addEventListener('pointerdown',fuera,{once:true}); return; } tbCerrarMenu(id); };
  setTimeout(()=>document.addEventListener('pointerdown',fuera,{once:true}),0);
  /* en escritorio el menú está anclado a la cabecera: si la tabla se desplaza o cambia el tamaño, se cierra
     (en móvil es una hoja fija abajo, no depende de la posición) */
  if(m._cerrarMenu) m._cerrarMenu();
  if(!movil){
    const wrap=btn.closest('.met-tabla-wrap');
    const cerrar=()=>{ if(!menu.hidden) tbCerrarMenu(id); };
    if(wrap) wrap.addEventListener('scroll',cerrar,{passive:true});
    window.addEventListener('resize',cerrar);
    m._cerrarMenu=()=>{ if(wrap) wrap.removeEventListener('scroll',cerrar); window.removeEventListener('resize',cerrar); m._cerrarMenu=null; };
  }
}
function tbOrdenarDir(id,col,dir){ const m=TB_MATRICES[id]; m.orden={col,dir}; m.pag=0; m.pintarTabla(); tbCerrarMenu(id); }
function tbQuitarFiltro(id,col){ const m=TB_MATRICES[id]; delete m.sel[col]; m.pag=0; m.pintarTabla(); tbCerrarMenu(id); }
/* Clic en una barra o porción: filtra la matriz por ese grupo (vuelve a tocar para quitar). */
function tbClicGrupo(id,g){
  const m=TB_MATRICES[id]; if(!m) return;
  const s=m.sel.grupo||(m.sel.grupo=new Set());
  if(s.has(g)) s.delete(g); else s.add(g);      /* se acumulan; volver a tocar quita */
  if(!s.size) delete m.sel.grupo;
  m.pag=0; m.pintarTabla();
}
/* cierra cualquier menu colgado del body (cambio de pestaña, repintado completo) */
function tbCerrarMenus(){ document.querySelectorAll('body > .met-menu').forEach(el=>{ el.hidden=true; if(el._casa&&el._casa.isConnected) el._casa.appendChild(el); else el.remove(); }); Object.values(TB_MATRICES).forEach(m=>{ m.menu=null; if(m._cerrarMenu) m._cerrarMenu(); }); }
function tbCerrarMenu(id){
  const m=TB_MATRICES[id]; const el=document.getElementById(id+'-menu');
  if(el){ el.hidden=true; if(el._casa&&el.parentElement===document.body) el._casa.appendChild(el); }
  if(m){ m.menu=null; if(m._cerrarMenu) m._cerrarMenu(); }
}
function tbFiltrarMenu(id,q){ q=tbNorm(q); document.querySelectorAll(`#${id}-menu label`).forEach(l=>{ l.style.display=!q||l.dataset.v.indexOf(q)>=0?'':'none'; }); }
function tbTog(id,col,v,on){ const m=TB_MATRICES[id]; const s=m.sel[col]||(m.sel[col]=new Set()); if(on) s.add(v); else s.delete(v); if(!s.size) delete m.sel[col]; m.pag=0; m.pintarTabla(); }
function tbSelTodos(id,col,on){ const m=TB_MATRICES[id]; const labels=[...document.querySelectorAll(`#${id}-menu label`)].filter(l=>l.style.display!=='none');
  const s=m.sel[col]||(m.sel[col]=new Set()); labels.forEach(l=>{ const i=l.querySelector('input'); i.checked=on; if(on) s.add(i.value); else s.delete(i.value); }); if(!s.size) delete m.sel[col]; m.pag=0; m.pintarTabla(); }
/* ── Descarga de la vista ─────────────────────────────────────────────────
   PDF A4 con el mismo membrete de los anexos (logo + entidad + proyecto +
   CUI/distrito/provincia/departamento/año), título "DESCARGA FILTRADA DEL
   SISTEMA", el anexo al que corresponde la vista, los filtros aplicados y
   la tabla completa (todas las filas visibles, no sólo la página).
   Usa jsPDF + AutoTable desde CDN (se cargan la primera vez); sin red cae
   al CSV. Los datos del membrete vienen en `TB_EXP.membrete` (motor).     */
/* jsPDF 2.5.1 + AutoTable 3.8.2 van en el propio sitio (js/lib/): no dependen de internet
   ni de un CDN, y se descargan sólo al primer clic en "Descargar vista". */
const TB_PDF_LIBS=['js/lib/jspdf.umd.min.js','js/lib/jspdf.plugin.autotable.min.js'];
let TB_EXP=null;                                   // expediente en pantalla (lo fija pintarExpediente)
function tbCargarScript(src){ return new Promise((ok,ko)=>{ if(document.querySelector(`script[src="${src}"]`)) return ok(); const e=document.createElement('script'); e.src=src; e.onload=ok; e.onerror=()=>ko(new Error('No se pudo cargar '+src)); document.head.appendChild(e); }); }
function tbFiltrosTexto(m){
  const partes=[];
  for(const k in m.sel){ const c=m.cols.find(x=>x.k===k); const s=m.sel[k]; if(!s||!s.size) continue;
    const vals=[...s].map(v=>(c&&c.rot&&c.rot[v])||v||'(vacío)'); partes.push(`${c?(c.titulo||c.t):k}: ${vals.length>6?vals.slice(0,6).join(', ')+` (+${vals.length-6})`:vals.join(', ')}`); }
  if(m.q) partes.push(`Búsqueda: "${m.q}"`);
  if(m.filtrosTexto) partes.push(...[].concat(m.filtrosTexto()).filter(Boolean));
  return partes.length?partes.join('  ·  '):'Sin filtros — vista completa';
}
const tbNumPdf=n=>String(Math.round(Number(n||0))).replace(/\B(?=(\d{3})+(?!\d))/g,',');   // Helvetica no tiene el espacio fino de tbNum
function tbValorPdf(c,r){ const v=r[c.k]; if(c.pdf) return c.pdf(v,r); if(c.csv&&!c.pdfCrudo) { const x=c.csv(v,r); return typeof x==='number'?tbNumPdf(x):String(x==null?'':x); } if(typeof v==='number') return tbNumPdf(v); return String(v==null?'':v); }
async function tbDescargar(id){
  const m=TB_MATRICES[id]; const btn=document.querySelector(`#${id} .ex-btn.ver`);
  try{
    if(btn){ btn.disabled=true; btn.textContent='Generando PDF…'; }
    for(const src of TB_PDF_LIBS) await tbCargarScript(src);
    tbPdf(m);
  }catch(e){
    console.warn(e); alert('No se pudo preparar el PDF (¿sin conexión?). Se descarga la vista en CSV.'); tbDescargarCsv(id);
  }finally{ if(btn){ btn.disabled=false; btn.textContent='⬇ Descargar vista'; } }
}
/* ── Membrete dinámico ───────────────────────────────────────────────────────
   El motor exporta en `membrete.formatos[A4V|A4H|A3H]` la estructura del
   encabezado y pie de Membrete.docx (párrafos con runs, tablas con grilla,
   celdas fusionadas, bordes, sombreado, logo) con los campos del proyecto ya
   resueltos. Aquí se dibuja tal cual con jsPDF: si cambia el Word del
   membrete o DATOS DEL PROYECTO, el PDF del portal cambia igual que los anexos.
   Sólo {{TITULO}}, {{PAGE}} y {{NUMPAGES}} se rellenan al generar.            */
const TB_PT=0.352778;                                  // pt -> mm
function tbMembrete(doc, logo){
  const fuente=r=>{ doc.setFont('helvetica', r.b&&r.i?'bolditalic':r.b?'bold':r.i?'italic':'normal'); doc.setFontSize(r.sz||10); };
  /* getTextWidth aplica kerning que luego text() no dibuja (las fuentes estándar no lo llevan): se mide sin kerning */
  const medir=t=>doc.getStringUnitWidth(t,{doKerning:false})*doc.getFontSize()/doc.internal.scaleFactor;
  const altoLinea=sz=>(sz||10)*TB_PT*1.17;
  const visible=b=>b&&b.val&&b.val!=='nil'&&b.val!=='none';
  const linea=(x1,y1,x2,y2,b)=>{ doc.setDrawColor(0,0,0); doc.setLineWidth(Math.max(0.15,(b.sz||4)/8*TB_PT)); doc.setLineDashPattern(/dash|dot/.test(b.val||'')?[0.7,0.7]:[],0); doc.line(x1,y1,x2,y2); doc.setLineDashPattern([],0); };
  const campos=(t,valores)=>String(t||'').replace(/\{\{([A-Z0-9_ÁÉÍÓÚÑ]+)\}\}/g,(m,k)=>valores[k]!=null?String(valores[k]):'').replace(/[  ]/g,' ');   // Helvetica no trae el espacio duro
  /* párrafo -> líneas que caben en `ancho` (segmentos palabra a palabra con su formato) */
  function lineas(p, ancho, valores){
    const tam=p.sz||((p.runs||[]).find(r=>r.sz)||{}).sz||10;
    const out=[]; let cur; const nueva=()=>{ cur={segs:[],ancho:0,alto:altoLinea(tam)}; out.push(cur); }; nueva();
    for(const r of (p.runs||[])){
      if(r.imagen){ cur.segs.push({img:r,w:r.cx}); cur.ancho+=r.cx; cur.alto=Math.max(cur.alto,r.cy); continue; }
      for(const parte of campos(r.t,valores).split(/(\n|\t)/)){
        if(parte==='\n'){ nueva(); continue; }
        if(parte==='\t'){ cur.segs.push({tab:true,w:0}); continue; }
        if(!parte) continue;
        fuente(r);
        for(const pal of parte.split(/(\s+)/)){ if(!pal) continue;
          const w=medir(pal), esp=/^\s+$/.test(pal);
          if(cur.ancho+w>ancho+0.01&&cur.ancho>0&&!esp) nueva();
          if(esp&&cur.ancho===0) continue;
          cur.segs.push({t:pal,r,w}); cur.ancho+=w; cur.alto=Math.max(cur.alto,altoLinea(r.sz||tam)); }
      }
    }
    return out;
  }
  const bordeBajo=p=>p.bordes&&visible(p.bordes.bottom)?p.bordes.bottom:null;
  function altoParrafo(p, ancho, valores){ return (p.antes||0)+lineas(p,ancho-(p.ind_izq||0)-(p.ind_der||0),valores).reduce((s,l)=>s+l.alto,0)+(p.despues||0)+(bordeBajo(p)?0.8:0); }
  function dibujarParrafo(p, x, y, ancho, valores){
    const xi=x+(p.ind_izq||0), an=ancho-(p.ind_izq||0)-(p.ind_der||0);
    let yy=y+(p.antes||0);
    for(const l of lineas(p,an,valores)){
      let xx=xi; if(p.jc==='center') xx+=(an-l.ancho)/2; else if(p.jc==='right') xx+=an-l.ancho;
      const yb=yy+l.alto*0.78;
      l.segs.forEach((s,i)=>{
        if(s.tab){ const tab=(p.tabs||[]).find(t=>t.val==='right'); const resto=l.segs.slice(i+1).reduce((a,b)=>a+(b.w||0),0); xx=tab?x+tab.pos-resto:xx+4; return; }
        if(s.img){ if(logo){ try{ doc.addImage(logo,'PNG',xx,yy+(l.alto-s.img.cy)/2,s.img.cx,s.img.cy); }catch(e){} } xx+=s.w; return; }
        fuente(s.r); doc.setTextColor(0,0,0); doc.text(s.t,xx,yb); xx+=s.w; });
      yy+=l.alto;
    }
    const bb=bordeBajo(p); if(bb){ linea(xi,yy+0.4,xi+an,yy+0.4,bb); yy+=0.8; }
    return yy+(p.despues||0);
  }
  /* tablas: grilla escalada al ancho declarado (pct de la caja de texto o dxa) */
  function geometria(t, x0, anchoDisp){
    const suma=(t.grid||[]).reduce((a,b)=>a+b,0)||1;
    const ancho=t.ancho&&t.ancho.tipo==='pct'?anchoDisp*t.ancho.w/5000:t.ancho&&t.ancho.tipo==='dxa'?t.ancho.w/56.6929:suma;
    let x=x0+(t.ind||0); if(t.jc==='center') x=x0+(anchoDisp-ancho)/2;
    const xs=[x]; (t.grid||[]).forEach(g=>xs.push(xs[xs.length-1]+g*ancho/suma));
    const cg=t.filas.map(f=>{ let col=0; return f.celdas.map(c=>{ const o={c,col,x:xs[col],w:xs[Math.min(xs.length-1,col+c.span)]-xs[col]}; col+=c.span; return o; }); });
    return {xs,ancho,cg};
  }
  const finFusion=(cg,i,col)=>{ let j=i+1; while(j<cg.length){ const q=cg[j].find(z=>z.col===col); if(!q||q.c.vmerge!=='cont') break; j++; } return j; };
  function altos(t, geo, valores){
    const m=t.margen||{}; const contenido=(o)=>o.c.bloques.reduce((s,p)=>s+altoParrafo(p,o.w-(m.izq||0)-(m.der||0),valores),0)+(m.sup||0)+(m.inf||0);
    const hs=t.filas.map((f,i)=>{ let h=f.alto||0; if(f.exacto) return h; geo.cg[i].forEach(o=>{ if(!o.c.vmerge) h=Math.max(h,contenido(o)); }); return h; });
    geo.cg.forEach((fila,i)=>fila.forEach(o=>{ if(o.c.vmerge!=='restart') return; const j=finFusion(geo.cg,i,o.col); const hc=contenido(o), disp=hs.slice(i,j).reduce((a,b)=>a+b,0); if(hc>disp) hs[j-1]+=hc-disp; }));
    return hs;
  }
  function dibujarTabla(t, x0, y0, anchoDisp, valores, soloMedir){
    const geo=geometria(t,x0,anchoDisp); const hs=altos(t,geo,valores); const m=t.margen||{};
    const ys=[y0]; hs.forEach(h=>ys.push(ys[ys.length-1]+h));
    if(soloMedir) return ys[ys.length-1];
    geo.cg.forEach((fila,i)=>fila.forEach(o=>{
      const c=o.c, y1=ys[i]; const y2=c.vmerge==='restart'?ys[finFusion(geo.cg,i,o.col)]:ys[i+1];
      const b=Object.assign({},t.bordes||{},c.bordes||{});
      if(c.fondo){ const f=c.fondo; doc.setFillColor(parseInt(f.slice(0,2),16),parseInt(f.slice(2,4),16),parseInt(f.slice(4,6),16)); doc.rect(o.x,ys[i],o.w,ys[i+1]-ys[i],'F'); }
      if(c.vmerge!=='cont'){
        const an=o.w-(m.izq||0)-(m.der||0); const hc=c.bloques.reduce((s,p)=>s+altoParrafo(p,an,valores),0);
        let yy=y1+(m.sup||0); const libre=(y2-y1)-(m.sup||0)-(m.inf||0)-hc; if(c.valign==='center') yy+=libre/2; else if(c.valign==='bottom') yy+=libre;
        c.bloques.forEach(p=>{ yy=dibujarParrafo(p,o.x+(m.izq||0),yy,an,valores); });
        if(visible(b.top)) linea(o.x,y1,o.x+o.w,y1,b.top);
      }
      if(visible(b.left)) linea(o.x,ys[i],o.x,ys[i+1],b.left);
      if(visible(b.right)) linea(o.x+o.w,ys[i],o.x+o.w,ys[i+1],b.right);
      if(visible(b.bottom)&&(c.vmerge!=='restart'||y2===ys[i+1])) linea(o.x,ys[i+1],o.x+o.w,ys[i+1],b.bottom);
    }));
    return ys[ys.length-1];
  }
  function bloques(bl, x0, y0, ancho, valores, soloMedir){
    let y=y0; (bl||[]).forEach(b=>{ y=b.tipo==='tabla'?dibujarTabla(b,x0,y,ancho,valores,soloMedir):(soloMedir?y+altoParrafo(b,ancho,valores):dibujarParrafo(b,x0,y,ancho,valores)); });
    return y;
  }
  return {dibujar:(bl,x0,y0,ancho,valores)=>bloques(bl,x0,y0,ancho,valores,false), alto:(bl,x0,ancho,valores)=>bloques(bl,x0,0,ancho,valores,true)-0,
          cajaTabla:(bl,x0,ancho)=>{ const t=(bl||[]).find(b=>b.tipo==='tabla'); if(!t) return null; const g=geometria(t,x0,ancho); return {x:g.xs[0],ancho:g.ancho}; }};
}

function tbPdf(m){
  /* PDF con el formato de los anexos del expediente: membrete (dinámico, ver tbMembrete), carátula con
     el título del anexo + "DESCARGA FILTRADA…", páginas de tabla (título en cursiva, cabecera celeste
     DDEBF7, GRUPO en BDD7EE, bordes negros, Arial 9 en mayúsculas) y el pie del membrete con las firmas,
     el título, el proyecto CON CUI y "Página N de M".                                                   */
  const {jsPDF}=window.jspdf; const d=TB_EXP||{}; const mb=d.membrete||{}; const pr=d.proyecto||{};
  const v=m.visibles(); const cols=m.cols.filter(c=>!c.pdfOmitir);
  const horizontal=!!m.pdfHorizontal||cols.length>10;
  const sinTildes=t=>String(t).normalize('NFD').replace(/[̀-ͯ]/g,'');
  const doc=new jsPDF({orientation:horizontal?'landscape':'portrait',unit:'mm',format:'a4',compress:true});
  const W=doc.internal.pageSize.getWidth(), H=doc.internal.pageSize.getHeight();
  const ahora=new Date();
  const fecha=ahora.toLocaleDateString('es-PE',{day:'2-digit',month:'2-digit',year:'numeric'})+' '+ahora.toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'});
  const titulo=(m.doc||m.titulo||m.archivo||m.id).toUpperCase().replace('N°','Nº');
  const proyecto=(mb.proyecto||pr.nombre||'').toUpperCase();
  const NEGRO=[0,0,0];
  const may=s=>String(s==null?'':s).toUpperCase().replace(/[  ]/g,' ');
  const texto=(t,x,y,o)=>doc.text(t,x,y,o);

  /* ── membrete y pie: estructura exportada de Membrete.docx; si no viene, el diseño de respaldo ── */
  let membrete, pie, xTexto, anchoTexto, yPieTop, cajaMembrete;
  const fmt=mb.formatos&&(mb.formatos[horizontal?'A4H':'A4V']||mb.formatos.A4V);
  if(fmt){
    const R=tbMembrete(doc,mb.logo); const mg=fmt.margenes;
    xTexto=mg.izq; anchoTexto=W-mg.izq-mg.der;
    const base=Object.assign({},mb.campos||{},{TITULO:titulo});
    membrete=()=>R.dibujar(fmt.encabezado,xTexto,mg.encabezado,anchoTexto,base);
    const altoPie=R.alto(fmt.pie,xTexto,anchoTexto,Object.assign({},base,{PAGE:'1',NUMPAGES:'1'}));
    yPieTop=H-mg.pie-altoPie;
    pie=pag=>R.dibujar(fmt.pie,xTexto,yPieTop,anchoTexto,Object.assign({},base,{PAGE:String(pag),NUMPAGES:'{n}'}));
    cajaMembrete=R.cajaTabla(fmt.encabezado,xTexto,anchoTexto)||{x:xTexto,ancho:anchoTexto};
  }else{
    /* respaldo (sin Membrete.docx): el diseño de 4 columnas de los anexos de Huari */
    const MX=horizontal?12:14.5, anchoM=W-2*MX; xTexto=30; anchoTexto=W-60; cajaMembrete={x:MX,ancho:anchoM};
    const entidad=(mb.entidad||pr.entidad||'').toUpperCase(); const firmantes=(mb.firmantes||[]).slice(0,3);
    membrete=()=>{
      const y0=12.4, c=[29.7,96.5,31.7,24.2].map(w=>w*anchoM/182), rh=[6.2,3.8,6.6,7.6];
      const x0=MX, x1=x0+c[0], x2=x1+c[1], x3=x2+c[2], x4=x3+c[3]; const y1=y0+rh[0], y2=y1+rh[1], y3=y2+rh[2], y4=y3+rh[3];
      doc.setDrawColor(...NEGRO); doc.setLineWidth(0.25); doc.setLineDashPattern([],0);
      doc.rect(x0,y0,x4-x0,y4-y0); doc.line(x1,y0,x1,y4); doc.line(x2,y0,x2,y4); doc.line(x1,y2,x4,y2); doc.line(x2,y1,x4,y1); doc.line(x2,y3,x4,y3); doc.line(x3,y2,x3,y4);
      if(mb.logo){ try{ const lado=Math.min(c[0]-4,y4-y0-3); doc.addImage(mb.logo,'PNG',x0+(c[0]-lado)/2,y0+(y4-y0-lado)/2,lado,lado); }catch(e){} }
      doc.setTextColor(...NEGRO); doc.setFont('helvetica','bold'); doc.setFontSize(10);
      texto(doc.splitTextToSize(entidad,c[1]-4),x1+c[1]/2,(y0+y2)/2,{align:'center',baseline:'middle'});
      doc.setFontSize(7.5); texto('PROYECTO DE INVERSION:',x1+c[1]/2,y2+3.1,{align:'center'});
      doc.setFont('helvetica','normal'); texto(doc.splitTextToSize('"'+proyecto+'"',c[1]-3).slice(0,3),x1+c[1]/2,y2+6.2,{align:'center',lineHeightFactor:1.1});
      const campo=(xa,xb,ya,yb,lbl,val)=>{ const xm=(xa+xb)/2; doc.setFontSize(7.5); doc.setFont('helvetica','bold'); texto(lbl,xm,ya+2.7,{align:'center'}); doc.setFont('helvetica','normal'); texto(val,xm,yb-1.1,{align:'center'}); };
      campo(x2,x4,y0,y1,'CENTRO DE SALUD:',may(mb.eess||pr.eess)); campo(x2,x4,y1,y2,'CUI:',String(mb.cui||pr.cui||''));
      campo(x2,x3,y2,y3,'DISTRITO:',may(mb.distrito)); campo(x3,x4,y2,y3,'PROVINCIA:',may(mb.provincia));
      campo(x2,x3,y3,y4,'DEPARTAMENTO:',may(mb.departamento)); campo(x3,x4,y3,y4,'AÑO:',String(mb.anio||''));
      return y4;
    };
    yPieTop=H-36;
    pie=pag=>{
      const xF=(W-150)/2, cw=[48.6,48.6,52.8], yLinea=H-35; let x=xF;
      doc.setDrawColor(...NEGRO); doc.setLineWidth(0.2); doc.setLineDashPattern([0.6,0.6],0);
      firmantes.forEach((f,i)=>{ doc.line(x+2,yLinea,x+cw[i]-2,yLinea); doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(...NEGRO); texto(may(f.nombre),x+cw[i]/2,yLinea+3.6,{align:'center'}); texto(may(f.cargo),x+cw[i]/2,yLinea+7.2,{align:'center'}); x+=cw[i]; });
      doc.setLineDashPattern([],0);
      const y=H-20.5; doc.setFont('helvetica','normal'); doc.setFontSize(6); texto(titulo,xF,y);
      const lp=doc.splitTextToSize('"'+proyecto+'" CON CUI '+(mb.cui||pr.cui||''),128); texto(lp.slice(0,2),xF,y+2.8,{lineHeightFactor:1.15});
      texto(`Página ${pag} de {n}`,W-xF,y+2.8+(Math.min(2,lp.length)-1)*2.8,{align:'right'});
    };
  }
  const anchoTabla=cols.length<=6?Math.min(anchoTexto,cajaMembrete.ancho):cajaMembrete.ancho;   // anexos cortos: caja de texto; anchos: caja del membrete
  const xT=cols.length<=6?xTexto+(anchoTexto-anchoTabla)/2:cajaMembrete.x;

  /* ── carátula (como la primera página del anexo) ── */
  membrete();
  doc.setTextColor(...NEGRO); doc.setFont('helvetica','bold'); doc.setFontSize(16);
  const lt=doc.splitTextToSize(titulo,Math.min(130,anchoTexto)); texto(lt,W/2,H*0.42,{align:'center',lineHeightFactor:1.25});
  let y=H*0.42+lt.length*7+8;
  doc.setFontSize(10.5); texto('DESCARGA FILTRADA DEL SISTEMA DE SEGUIMIENTO',W/2,y,{align:'center'}); y+=7;
  doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
  const lineas=doc.splitTextToSize('Filtros aplicados: '+tbFiltrosTexto(m),Math.min(130,anchoTexto)); texto(lineas,W/2,y,{align:'center',lineHeightFactor:1.3}); y+=lineas.length*4.2+1;
  const ordenTxt=(()=>{ const c=cols.find(x=>x.k===m.orden.col); return (c?(c.titulo||c.t):m.orden.col)+(m.orden.dir<0?' (descendente)':' (ascendente)'); })();
  texto(`${tbNumPdf(v.length)} filas · orden: ${ordenTxt}`,W/2,y,{align:'center'}); y+=4.2;
  texto(`Generado el ${fecha} desde el portal de seguimiento · sinergiabiomedica.pe`,W/2,y,{align:'center'});
  if(m.pdfNota){ y+=7; doc.setFont('helvetica','italic'); doc.setFontSize(8); texto(doc.splitTextToSize(m.pdfNota,Math.min(130,anchoTexto)),W/2,y,{align:'center',lineHeightFactor:1.3}); }
  pie(1);
  doc.addPage();

  /* ── páginas de tabla ── */
  const yMem=membrete();
  const yTitulo=yMem+6.5;
  const tituloTabla=()=>{ doc.setFont('helvetica','italic'); doc.setFontSize(10); doc.setTextColor(...NEGRO); texto(titulo,W/2,yTitulo,{align:'center'}); };
  tituloTabla();
  const head=[cols.map(c=>sinTildes(may((c.pdfT||c.t).replace(/<[^>]+>/g,''))))];
  const body=v.map((r,i)=>cols.map(c=>c.k==='n'?String(i+1):may(tbValorPdf(c,r))));
  const sumas=cols.map(c=>c.sumar?v.reduce((s,r)=>s+(Number(r[c.k])||0),0):null);
  const iTot=cols[0]&&cols[0].k==='n'?1:0;
  const foot=sumas.some(x=>x!=null)?[cols.map((c,i)=>{ if(sumas[i]==null) return i===iTot?'TOTAL':''; return c.pdfSuma?c.pdfSuma(sumas[i]):tbNumPdf(sumas[i]); })]:undefined;
  const ANCHOS={n:10.5,clave:16,cod_amb:17,piso:14,upss:28,grupo:14,provee:13,cant:15,unit:22,total:22,items:15,exp:19,pip:19,norma:22,namb:12,REQUIERE:15,COMPENSACION:17,pct:14};
  const iGrupo=cols.findIndex(c=>c.k==='grupo');
  const rel=m.pdfAnchos||null; const relTot=rel?cols.reduce((s,c)=>s+(rel[c.k]||10),0):0;
  const columnStyles={}; cols.forEach((c,i)=>{ const st={halign:'center'}; if(ANCHOS[c.k]) st.cellWidth=ANCHOS[c.k]; if(rel) st.cellWidth=anchoTabla*(rel[c.k]||10)/relTot; if(c.pdfAncho) st.cellWidth=c.pdfAncho;
    if(/^(desc|ambiente|nombre|param|upss)$/.test(c.k)) st.halign='left'; if(i===iGrupo) st.fillColor=[189,215,238]; columnStyles[i]=st; });
  const fs=cols.length>10?6.5:cols.length>7?8:9;
  doc.autoTable({
    head, body, foot, startY:yTitulo+2.5, margin:{left:xT,right:W-xT-anchoTabla,top:yMem+9.5,bottom:H-yPieTop+4},
    theme:'grid', tableWidth:anchoTabla,
    styles:{font:'helvetica',fontSize:fs,cellPadding:{top:1,bottom:1,left:1,right:1},lineColor:NEGRO,lineWidth:0.18,textColor:NEGRO,overflow:'linebreak',valign:'middle'},
    headStyles:{fillColor:[221,235,247],textColor:NEGRO,fontStyle:'bold',halign:'center',valign:'middle',fontSize:cols.length>7?fs-1:fs,cellPadding:{top:1,bottom:1,left:0.5,right:0.5}},
    footStyles:{fillColor:[221,235,247],textColor:NEGRO,fontStyle:'bold'},
    columnStyles, showHead:'everyPage', showFoot:'lastPage',
    didDrawPage:()=>{ const pag=doc.internal.getCurrentPageInfo().pageNumber; if(pag>2){ membrete(); tituloTabla(); } pie(pag); },
  });
  if(typeof doc.putTotalPages==='function') doc.putTotalPages('{n}');
  doc.save(`${(m.archivo||m.id)}_${ahora.toISOString().slice(0,10)}.pdf`);
}
function tbDescargarCsv(id){
  const m=TB_MATRICES[id]; const v=m.visibles();
  const e2=x=>{ const s=String(x==null?'':x); return /[";\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s; };
  const cols=m.cols.filter(c=>c.k!=='n');
  const lineas=[['N°',...cols.map(c=>c.titulo||c.t)].join(';')].concat(v.map((r,i)=>[i+1,...cols.map(c=>c.csv?c.csv(r[c.k],r):r[c.k])].map(e2).join(';')));
  const blob=new Blob(['﻿'+lineas.join('\r\n')],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`${m.archivo||m.id}_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),2000);
}
const TB_ROT_GRUPO={}; TB_GRUPOS.forEach(g=>TB_ROT_GRUPO[g]=g+' · '+TB_NOMBRE[g]);
const TB_ROT_PROVEE={'EQ.':'EQ. · Equipamiento','OC.':'OC. · Obra civil'};

/* ───────────────────────── RESUMEN (inicio) ───────────────────────── */
function paneTbResumen(d){
  return `<div id="tbRes"></div>`;
}
function montarTbResumen(d){
  const filas=tbFilas(d);
  const m=tbMatriz({id:'tbRes', filas, porPag:25, archivo:'Resumen_equipamiento', pdfAnchos:{n:7,piso:13,upss:22,cod_amb:16,ambiente:37,clave:11,desc:38,grupo:11,provee:12,cant:9}, doc:'RESUMEN DEL EQUIPAMIENTO – DETALLE POR AMBIENTE (SEGUN ANEXO Nº2)', placeholder:'Buscar código, equipo, ambiente, UPSS…',
    buscar:['clave','desc','ambiente','cod_amb','upss'],
    cols:[{k:'n',t:'N°',cls:'n'},{k:'piso',t:'Piso',filtro:true},{k:'upss',t:'UPSS/UPS',filtro:true,cls:'met-upss'},{k:'cod_amb',t:'Cód. ambiente',filtro:true,cls:'met-cod'},
          {k:'ambiente',t:'Ambiente',filtro:true},{k:'clave',t:'Código',filtro:true,cls:'met-cod met-clave'},{k:'desc',t:'Descripción'},
          {k:'grupo',t:'Grupo',filtro:true,cls:'met-cod',rot:TB_ROT_GRUPO},{k:'provee',t:'Provee',filtro:true,cls:'met-cod',rot:TB_ROT_PROVEE},{k:'cant',t:'Cant.',cls:'n',sumar:true,fmt:v=>'<b>'+tbNum(v)+'</b>'}],
    pie:v=>`<tr><td colspan="9">Total de la vista · ${tbNum(v.length)} líneas</td><td class="n"><b>${tbNum(v.reduce((s,r)=>s+r.cant,0))}</b></td></tr>`,
    resumen:v=>`Mostrando <b>${tbNum(v.length)}</b> de ${tbNum(filas.length)} líneas`,
    onCambio:(v,arriba)=>{
      const eq=v.filter(r=>r.provee==='EQ.');
      const upss=new Set(v.map(r=>r.upss)).size, amb=new Set(v.map(r=>r.cod_amb)).size;
      const cant=eq.reduce((s,r)=>s+r.cant,0), items=new Set(eq.map(r=>r.clave)).size;
      /* los gráficos se arman SIN el filtro de grupo: lo elegido se resalta y el resto queda translúcido */
      const eqG=m.visibles('grupo').filter(r=>r.provee==='EQ.');
      const gC=tbPorGrupo(eqG,'cant'), gI=tbPorGrupo(eqG,'items');
      const sg=m.sel.grupo&&m.sel.grupo.size?m.sel.grupo:null;
      arriba.innerHTML=`
        <div class="tb-kpis">
          <div class="tb-kpi c1"><span>UPSS / UPS</span><b>${tbNum(upss)}</b></div>
          <div class="tb-kpi c2"><span>Ambientes</span><b>${tbNum(amb)}</b></div>
          <div class="tb-kpi c3"><span>Cant. equipos (EQ.)</span><b>${tbNum(cant)}</b></div>
          <div class="tb-kpi c4"><span>Ítems (códigos EQ.)</span><b>${tbNum(items)}</b></div>
        </div>
        <div class="tb-graficos">
          <div class="tb-card"><div class="tb-card-h">Cantidad de equipos por grupo genérico <span class="th-nota">clic en una barra filtra</span></div>${tbBarras(gC.cats,gC.valores,gC.colores,{titulo:'Cantidad por grupo',onClic:'tbClicRes',selec:sg})}</div>
          <div class="tb-card"><div class="tb-card-h">Ítems (códigos distintos) por grupo</div>${tbBarras(gI.cats,gI.valores,gI.colores,{titulo:'Ítems por grupo',onClic:'tbClicRes',selec:sg})}</div>
          <div class="tb-card tb-card-dona"><div class="tb-card-h">Participación en unidades</div><div class="tb-dona-wrap">${tbDona(gC.cats,gC.valores,gC.colores,{centro:'unidades',onClic:'tbClicRes',selec:sg})}${tbLeyenda(gC.cats,gC.colores,gC.valores,null,'tbClicRes',sg)}</div></div>
        </div>
        <div class="tab-head"><h4>Detalle</h4><span class="th-nota">líneas ambiente × código de la selección</span></div>`;
    }});
  m.pintar();
}

function tbClicRes(g){ tbClicGrupo('tbRes',g); }
function tbClicPre(g){ tbClicGrupo('tbPre',g); }

/* ───────────────────────── PRESUPUESTO ───────────────────────── */
function paneTbPresupuesto(d){
  if(!d.presupuesto||!d.presupuesto.codigos||!d.presupuesto.codigos.length) return '<p class="hvacio">Aún no hay estudio de mercado con precios.</p>';
  return `<div class="tb-aviso">Precios de referencia del estudio de mercado (precio seleccionado por código, sin IGV salvo que el estudio lo incluya). ${d.presupuesto.sin_precio.length?`<b>${d.presupuesto.sin_precio.length} códigos aún sin precio</b>; no suman al total.`:''}</div><div id="tbPre"></div>`;
}
function montarTbPresupuesto(d){
  if(!d.presupuesto||!d.presupuesto.codigos||!d.presupuesto.codigos.length) return;
  const filas=tbFilas(d).filter(r=>r.provee==='EQ.');
  const m=tbMatriz({id:'tbPre', filas, porPag:50, archivo:'Presupuesto_por_ambiente', pdfAnchos:{n:7,upss:22,cod_amb:16,ambiente:36,clave:11,desc:38,grupo:11,unit:18,cant:9,total:19}, doc:'PRESUPUESTO REFERENCIAL DEL EQUIPAMIENTO – DETALLE POR AMBIENTE (SEGUN ANEXO Nº7)', placeholder:'Buscar código, equipo, ambiente, UPSS…', ordenInicial:'total',
    buscar:['clave','desc','ambiente','cod_amb','upss'],
    cols:[{k:'n',t:'N°',cls:'n'},{k:'upss',t:'UPSS/UPS',filtro:true,cls:'met-upss'},{k:'cod_amb',t:'Cód. amb.',filtro:true,cls:'met-cod'},{k:'ambiente',t:'Ambiente',filtro:true},
          {k:'clave',t:'Código',filtro:true,cls:'met-cod met-clave'},{k:'desc',t:'Descripción'},{k:'grupo',t:'Grupo',filtro:true,cls:'met-cod',rot:TB_ROT_GRUPO},
          {k:'unit',t:'Costo unitario',cls:'n',fmt:v=>v?tbSoles(v):'<span class="tb-sin">sin precio</span>',csv:v=>v||'',pdf:v=>v?tbSoles(v):'sin precio'},{k:'cant',t:'Cant.',cls:'n',sumar:true,fmt:v=>tbNum(v)},{k:'total',t:'Costo total',cls:'n',sumar:true,pdfSuma:tbSoles,fmt:v=>'<b>'+tbSoles(v)+'</b>',csv:v=>v,pdf:v=>tbSoles(v)}],
    pie:v=>`<tr><td colspan="8">Total de la vista · ${tbNum(v.length)} líneas</td><td class="n">${tbNum(v.reduce((s,r)=>s+r.cant,0))}</td><td class="n"><b>${tbSoles(v.reduce((s,r)=>s+r.total,0))}</b></td></tr>`,
    resumen:v=>`Mostrando <b>${tbNum(v.length)}</b> de ${tbNum(filas.length)} líneas`,
    onCambio:(v,arriba)=>{
      m.orden.dir=m.orden.col==='total'&&m.orden.dir===1&&!m._invertido?(m._invertido=true,-1):m.orden.dir;
      const cant=v.reduce((s,r)=>s+r.cant,0), total=v.reduce((s,r)=>s+r.total,0);
      const sin=new Set(v.filter(r=>r.sinPrecio).map(r=>r.clave)).size;
      const vG=m.visibles('grupo');
      const gT=tbPorGrupo(vG,'total'), gC=tbPorGrupo(vG,'cant');
      const sg=m.sel.grupo&&m.sel.grupo.size?m.sel.grupo:null;
      const totalG=vG.reduce((s,r)=>s+r.total,0);
      /* tabla por código (agregada de la selección) */
      const porCod={}; v.forEach(r=>{ const c=porCod[r.clave]||(porCod[r.clave]={clave:r.clave,desc:r.desc,grupo:r.grupo,unit:r.unit,cant:0,total:0}); c.cant+=r.cant; c.total+=r.total; });
      const codigos=Object.values(porCod).sort((a,b)=>b.total-a.total);
      const porGrupo={}; vG.forEach(r=>{ const g=porGrupo[r.grupo]||(porGrupo[r.grupo]={grupo:r.grupo,items:new Set(),cant:0,total:0}); g.items.add(r.clave); g.cant+=r.cant; g.total+=r.total; });
      const grupos=TB_GRUPOS.filter(g=>porGrupo[g]).map(g=>porGrupo[g]);
      arriba.innerHTML=`
        <div class="tb-kpis tb-kpis-3">
          <div class="tb-kpi c3"><span>Cantidad</span><b>${tbNum(cant)}</b></div>
          <div class="tb-kpi c1"><span>Costo total</span><b>${tbSoles(total)}</b></div>
          <div class="tb-kpi ${sin?'alerta':'c2'}"><span>Códigos sin precio</span><b>${tbNum(sin)}</b></div>
        </div>
        <div class="tb-graficos">
          <div class="tb-card"><div class="tb-card-h">Costo total por grupo genérico <span class="th-nota">clic en una barra filtra</span></div>${tbBarras(gT.cats,gT.valores,gT.colores,{fmt:v=>v>=1e6?(v/1e6).toFixed(2)+' M':v>=1e3?Math.round(v/1e3)+' k':tbNum(v),onClic:'tbClicPre',selec:sg})}</div>
          <div class="tb-card"><div class="tb-card-h">Cantidad por grupo genérico</div>${tbBarras(gC.cats,gC.valores,gC.colores,{onClic:'tbClicPre',selec:sg})}</div>
          <div class="tb-card tb-card-dona"><div class="tb-card-h">Participación en el costo</div><div class="tb-dona-wrap">${tbDona(gT.cats,gT.valores,gT.colores,{centro:'costo',fmt:v=>v>=1e6?'S/ '+(v/1e6).toFixed(2)+' M':tbSoles(v),onClic:'tbClicPre',selec:sg})}${tbLeyenda(gT.cats,gT.colores,gT.valores,tbSoles,'tbClicPre',sg)}</div></div>
        </div>
        <div class="tb-dos">
          <div class="tb-card"><div class="tb-card-h">Por código <span class="th-nota">${codigos.length} códigos de la selección · cabeceras: clic ordena, ▾ filtra</span></div><div id="tbPreCod"></div></div>
          <div class="tb-card"><div class="tb-card-h">Por grupo genérico <span class="th-nota">clic en una fila filtra</span></div><div id="tbPreGrupo"></div></div>
        </div>
        <div class="tab-head"><h4>Detalle por ambiente</h4><span class="th-nota">costo = cantidad del ambiente × precio unitario seleccionado</span></div>`;
      /* los dos cuadros son matrices compactas: mismas cabeceras (orden + filtro) que el resto */
      tbMatriz({id:'tbPreCod', compacto:true, conservar:true, orden:{col:'total',dir:-1}, ordenInicial:'total', filas:codigos.map((c,i)=>Object.assign({n:i+1},c)),
        cols:[{k:'clave',t:'Código',filtro:true,cls:'met-cod met-clave'},{k:'desc',t:'Descripción',filtro:true},{k:'grupo',t:'Grupo',filtro:true,cls:'met-cod',rot:TB_ROT_GRUPO},
              {k:'unit',t:'C. unitario',cls:'n',fmt:v=>v?tbSoles(v):'<span class="tb-sin">sin precio</span>'},{k:'cant',t:'Cant.',cls:'n',fmt:v=>tbNum(v)},{k:'total',t:'Costo total',cls:'n',fmt:v=>'<b>'+tbSoles(v)+'</b>'}],
        pie:x=>`<tr><td colspan="4">Total${x.length<codigos.length?` · ${x.length} de ${codigos.length}`:''}</td><td class="n">${tbNum(x.reduce((s,r)=>s+r.cant,0))}</td><td class="n"><b>${tbSoles(x.reduce((s,r)=>s+r.total,0))}</b></td></tr>`}).pintar();
      const mG=TB_MATRICES.tbPreGrupo; if(mG&&mG.orden.col==='n') mG.orden={col:'n',dir:1};
      tbMatriz({id:'tbPreGrupo', compacto:true, conservar:true, filas:grupos.map((g,i)=>({n:i+1,grupo:g.grupo,nombre:TB_NOMBRE[g.grupo]||'',items:g.items.size,cant:g.cant,total:g.total,pct:totalG?Math.round(1000*g.total/totalG)/10:0})),
        cols:[{k:'grupo',t:'Grupo',filtro:true,rot:TB_ROT_GRUPO,fmt:(v,r)=>`<i class="tb-punto" style="background:${TB_COLOR[v]||'#999'}"></i><b>${tbEsc(v)}</b> · ${tbEsc(r.nombre)}`},{k:'items',t:'Ítems',cls:'n',fmt:v=>tbNum(v)},
              {k:'cant',t:'Cant.',cls:'n',fmt:v=>tbNum(v)},{k:'total',t:'Costo total',cls:'n',fmt:v=>'<b>'+tbSoles(v)+'</b>'},{k:'pct',t:'%',cls:'n',fmt:v=>v.toFixed(1)+' %'}],
        filaAttr:r=>`onclick="tbClicPre('${tbEsc(r.grupo)}')" class="${sg&&!sg.has(r.grupo)?'dim':''} ${sg&&sg.has(r.grupo)?'sel':''}" title="Filtrar por este grupo"`,
        pie:x=>`<tr><td>Total</td><td class="n">${tbNum(new Set(vG.map(r=>r.clave)).size)}</td><td class="n">${tbNum(x.reduce((s,r)=>s+r.cant,0))}</td><td class="n"><b>${tbSoles(x.reduce((s,r)=>s+r.total,0))}</b></td><td class="n">${(x.reduce((s,r)=>s+r.pct,0)).toFixed(1)} %</td></tr>`}).pintar();
    }});
  m.orden={col:'total',dir:-1};
  m.pintar();
}

/* ───────────────────────── PREINSTALACIÓN ─────────────────────────
   Como el Anexo N°4: una fila por CÓDIGO (ítem, código, descripción, grupo,
   cantidad total, requiere, compensación) y las columnas de la especialidad
   elegida con la cabecera girada para que todo entre en pantalla. Clic en una
   fila despliega los ambientes donde va el equipo (UPSS · ambiente · cant.).  */
const TB_PI={esp:null, soloReq:false};
function paneTbPreinst(d){
  const pi=d.preinst; if(!pi||!pi.codigos||!pi.codigos.length) return '<p class="hvacio">Aún no hay datos de preinstalación (Anexo N4).</p>';
  if(!TB_PI.esp) TB_PI.esp=pi.especialidades[0].clave;
  return `<div class="tb-aviso">Requerimientos de preinstalación por equipo (Anexo N°4). Elige la <b>especialidad</b> para ver sus parámetros; clic en una fila del cuadro filtra la tabla por ese parámetro y clic en un equipo despliega los ambientes donde va.</div>
    <div class="tb-esp" id="tbEsp"><span class="tb-esp-lbl">Especialidad</span>${pi.especialidades.map(e=>{
      const con=pi.codigos.filter(c=>e.params.some(p=>c.v[p.k]!=null&&c.v[p.k]!==''&&c.v[p.k]!==0)).length;
      return `<button type="button" class="tb-esp-btn ${TB_PI.esp===e.clave?'on':''}" onclick="tbEspecialidad('${e.clave}')"><b>${tbEsc(e.nombre)}</b><small>${e.params.length} parámetros · ${tbNum(con)} códigos</small></button>`; }).join('')}</div>
    <div id="tbPi"></div>`;
}
function tbEspecialidad(k){
  TB_PI.esp=k; document.querySelectorAll('#tbEsp .tb-esp-btn').forEach(c=>c.classList.toggle('on',c.getAttribute('onclick').indexOf(`'${k}'`)>=0));
  const m=TB_MATRICES.tbPi; if(!m) return;
  /* los filtros de parámetros de otra especialidad no aplican a ésta */
  const cols=new Set(tbColsPi(m.d).map(c=>c.k)); Object.keys(m.sel).forEach(x=>{ if(!cols.has(x)) delete m.sel[x]; });
  m.cols=tbColsPi(m.d); m.pag=0; m.pintar();
}
const tbMarcaX=v=>v==='X'?'<span class="tb-x-mark">X</span>':'<span class="tb-no">·</span>';
function tbColsPi(d){
  const esp=(d.preinst.especialidades||[]).find(e=>e.clave===TB_PI.esp);
  const base=[{k:'n',t:'Ítem',cls:'n'},{k:'clave',t:'Código',filtro:true,cls:'met-cod met-clave'},{k:'desc',t:'Descripción',filtro:true},{k:'grupo',t:'Grupo',filtro:true,cls:'met-cod',rot:TB_ROT_GRUPO},
    {k:'cant',t:'Cant.',cls:'n',sumar:true,fmt:v=>'<b>'+tbNum(v)+'</b>'},{k:'namb',t:'Amb.',titulo:'Ambientes donde va (clic en la fila abre la ficha)',pdfOmitir:true,cls:'n',fmt:v=>`<span class="tb-amb-n">${tbNum(v)} ▸</span>`},
    {k:'REQUIERE',t:'Requiere pre inst.',titulo:'Requiere pre instalación',filtro:true,cls:'tb-x',rotar:true,fmt:v=>v==='X'?'<span class="tb-si">SÍ</span>':'<span class="tb-no">NO</span>',rot:{X:'Sí requiere','':'No requiere'}},
    {k:'COMPENSACION',t:'Comp. presión',titulo:'Compensación de presión (2 400 msnm)',filtro:true,cls:'tb-x',rotar:true,fmt:v=>v==='X'?'<span class="tb-si">SÍ</span>':'<span class="tb-no">NO</span>',rot:{X:'Sí','':'No'}}];
  /* una columna por parámetro con la cabecera girada (como el Anexo N4); el PDF usa las mismas columnas */
  const params=(esp?esp.params:[]).map(p=>({k:p.k,t:p.nombre,titulo:p.nombre,filtro:true,cls:'tb-x',rotar:true,
    fmt:v=>p.tipo==='num'?(v?'<b>'+tbNum(v)+'</b>':'<span class="tb-no">·</span>'):tbMarcaX(v),
    rot:p.tipo==='num'?null:{X:'Con X','':'Sin X'}}));
  return base.concat(params);
}
function tbFilasPi(d){
  const pi=d.preinst; const params=[]; pi.especialidades.forEach(e=>e.params.forEach(p=>params.push(p)));
  const porCod={};
  tbFilas(d).filter(r=>r.provee==='EQ.').forEach(r=>{
    const o=porCod[r.clave]||(porCod[r.clave]={clave:r.clave,desc:r.desc,grupo:r.grupo,cant:0,ambs:[],pi:r.pi});
    o.cant+=r.cant; o.ambs.push({upss:r.upss,ambiente:r.ambiente,cod_amb:r.cod_amb,piso:r.piso,cant:r.cant});
  });
  return Object.values(porCod).sort((a,b)=>a.clave.localeCompare(b.clave,'es',{numeric:true})).map((o,i)=>{
    o.n=i+1; o.namb=o.ambs.length; o.REQUIERE=o.pi.REQUIERE==='X'?'X':''; o.COMPENSACION=o.pi.COMPENSACION==='X'?'X':'';
    params.forEach(p=>{ o[p.k]=o.pi[p.k]==null?'':o.pi[p.k]; }); return o;
  });
}
/* Ficha del equipo (clic en la fila): ventana con su pre instalación por especialidad
   y los ambientes donde va, agrupados por UPSS. Sustituye al desplegable dentro de la tabla. */
function tbFichaPi(clave){
  const m=TB_MATRICES.tbPi; const d=TB_EXP; if(!m||!d) return;
  const r=m.filas.find(x=>x.clave===clave); if(!r) return;
  const esp=(d.preinst&&d.preinst.especialidades)||[];
  const bloques=esp.map(e=>{
    const con=e.params.filter(p=>r[p.k]!==''&&r[p.k]!=null&&r[p.k]!==0);
    if(!con.length) return '';
    return `<div class="tf-esp"><span class="tf-esp-n">${tbEsc(e.nombre)}</span><div class="tb-tags">${con.map(p=>p.tipo==='num'?`<span class="tb-tag num">${tbEsc(p.nombre)}: <b>${tbNum(r[p.k])}</b></span>`:`<span class="tb-tag">${tbEsc(p.nombre)}</span>`).join('')}</div></div>`;
  }).filter(Boolean);
  const porUpss={}; r.ambs.forEach(a=>{ (porUpss[a.upss]||(porUpss[a.upss]=[])).push(a); });
  const upss=Object.keys(porUpss).sort((a,b)=>a.localeCompare(b,'es'));
  const html=`<div class="tb-modal" id="tbFicha" onclick="if(event.target===this)tbCerrarFicha()">
    <div class="tb-ficha" role="dialog" aria-modal="true">
      <div class="tf-head">
        <div><span class="ec-cod">${tbEsc(r.clave)}</span><h4>${tbEsc(r.desc)}</h4>
          <small><i class="tb-punto" style="background:${TB_COLOR[r.grupo]||'#999'}"></i><b>${tbEsc(r.grupo)}</b> · ${tbEsc(TB_NOMBRE[r.grupo]||'')} &nbsp;·&nbsp; <b>${tbNum(r.cant)}</b> unidades en <b>${r.ambs.length}</b> ambientes</small></div>
        <button type="button" class="tf-x" onclick="tbCerrarFicha()" aria-label="Cerrar">✕</button>
      </div>
      <div class="tf-cuerpo">
        <section>
          <h5>Pre instalación</h5>
          <div class="tf-req"><span class="${r.REQUIERE==='X'?'tb-si':'tb-no'}">${r.REQUIERE==='X'?'● Requiere pre instalación':'○ No requiere pre instalación'}</span><span class="${r.COMPENSACION==='X'?'tb-si':'tb-no'}">${r.COMPENSACION==='X'?'● Compensación de presión (2 400 msnm)':'○ Sin compensación de presión'}</span></div>
          ${bloques.length?bloques.join(''):'<p class="ex-nota">Sin parámetros de pre instalación registrados.</p>'}
        </section>
        <section>
          <h5>Ambientes donde va <span class="th-nota">${r.ambs.length} ambientes · ${tbNum(r.cant)} unidades</span></h5>
          ${upss.map(u=>`<div class="tf-upss"><div class="tf-upss-n">${tbEsc(u)} <em>${tbNum(porUpss[u].reduce((s,a)=>s+a.cant,0))} unid.</em></div>
            <ul>${porUpss[u].sort((a,b)=>String(a.cod_amb).localeCompare(String(b.cod_amb),'es',{numeric:true})).map(a=>`<li><b>${tbEsc(a.cod_amb)}</b><span>${tbEsc(a.ambiente)}</span><small>${a.piso&&a.piso!=='—'?'piso '+tbEsc(a.piso):''}</small><em>${tbNum(a.cant)}</em></li>`).join('')}</ul></div>`).join('')}
        </section>
      </div>
    </div></div>`;
  tbCerrarFicha();
  document.body.insertAdjacentHTML('beforeend',html);
  document.body.classList.add('tb-modal-abierto');
  document.addEventListener('keydown',tbFichaEsc);
}
function tbFichaEsc(e){ if(e.key==='Escape') tbCerrarFicha(); }
function tbCerrarFicha(){ const el=document.getElementById('tbFicha'); if(el) el.remove(); document.body.classList.remove('tb-modal-abierto'); document.removeEventListener('keydown',tbFichaEsc); }
function montarTbPreinst(d){
  const pi=d.preinst; if(!pi||!pi.codigos||!pi.codigos.length) return;
  const filas=tbFilasPi(d);
  const m=tbMatriz({id:'tbPi', d, filas, porPag:100, archivo:'Anexo_N4_Preinstalacion', doc:'ANEXO Nº4 – LISTADO DE EQUIPAMIENTO Y SU PRE INSTALACION', pdfHorizontal:true, clase:'tb-pi',
    filtrosTexto:()=>{ const e=(pi.especialidades||[]).find(x=>x.clave===TB_PI.esp); return ['Especialidad: '+(e?e.nombre:TB_PI.esp), TB_PI.soloReq?'Sólo equipos que requieren pre instalación':'']; },
    placeholder:'Buscar código o equipo…', buscar:['clave','desc'], cols:tbColsPi(d),
    filaAttr:r=>`class="tb-fila-det" onclick="tbFichaPi('${tbEsc(r.clave)}')" title="Clic: ficha del equipo (pre instalación y ambientes)"`,
    extraHtml:()=>`<label class="met-check"><input type="checkbox" ${TB_PI.soloReq?'checked':''} onchange="TB_PI.soloReq=this.checked;TB_MATRICES.tbPi.pag=0;TB_MATRICES.tbPi.pintarTabla()"> Sólo los que requieren pre instalación</label>`,
    filtroExtra:r=>!TB_PI.soloReq||r.REQUIERE==='X', limpiarExtra:()=>{ TB_PI.soloReq=false; },
    pie:v=>`<tr><td colspan="4">Total de la vista · ${tbNum(v.length)} códigos</td><td class="n"><b>${tbNum(v.reduce((s,r)=>s+r.cant,0))}</b></td><td colspan="${m.cols.filter(c=>!c.soloPdf).length-5}"></td></tr>`,
    resumen:v=>`Mostrando <b>${tbNum(v.length)}</b> de ${tbNum(filas.length)} códigos`,
    onCambio:(v,arriba)=>{
      const esp=pi.especialidades.find(e=>e.clave===TB_PI.esp); if(!esp) return;
      const req=v.filter(r=>r.REQUIERE==='X');
      const filasCuadro=esp.params.map((p,i)=>{
        const con=v.filter(r=>r[p.k]!==''&&r[p.k]!=null&&r[p.k]!==0);
        const tot=p.tipo==='num'?con.reduce((s,r)=>s+(Number(r[p.k])||0)*r.cant,0):null;
        const max=p.tipo==='num'?Math.max(0,...con.map(r=>Number(r[p.k])||0)):null;
        return {n:i+1,k:p.k,param:p.nombre,tipo:p.tipo==='num'?'valor':'marca',items:con.length,unid:con.reduce((s,r)=>s+r.cant,0),tot,max};
      });
      arriba.innerHTML=`
        <div class="tb-kpis tb-kpis-3">
          <div class="tb-kpi c1"><span>Requieren pre instalación</span><b>${tbNum(req.length)} <small>códigos · ${tbNum(req.reduce((s,r)=>s+r.cant,0))} unid.</small></b></div>
          <div class="tb-kpi c2"><span>Con algún parámetro de ${tbEsc(esp.nombre)}</span><b>${tbNum(v.filter(r=>esp.params.some(p=>r[p.k]!==''&&r[p.k]!=null&&r[p.k]!==0)).length)} <small>códigos</small></b></div>
          <div class="tb-kpi c4"><span>Compensación de presión (2 400 msnm)</span><b>${tbNum(v.filter(r=>r.COMPENSACION==='X').length)} <small>códigos</small></b></div>
        </div>
        <div class="tab-head"><h4>Subsistemas de ${tbEsc(esp.nombre)}</h4><span class="th-nota">un cuadro por parámetro · clic filtra la tabla (otro clic quita) · ítems = códigos con dato · unidades = Σ cantidades</span></div>
        <div class="tb-param-grid">${filasCuadro.map(f=>`<button type="button" class="tb-param ${f.items?'':'cero'} ${m.sel[f.k]?'sel':''}" onclick="tbFiltrarParam('${f.k}')" title="${m.sel[f.k]?'Quitar el filtro de este parámetro':'Filtrar la tabla por este parámetro'}">
            <span class="tb-param-t">${tbEsc(f.param)}</span><span class="tb-param-tipo">${f.tipo==='valor'?'valor':'marca X'}</span>
            <span class="tb-param-n">${tbNum(f.items)}<small>códigos</small></span>
            <span class="tb-param-s"><span>${tbNum(f.unid)} unid.</span>${f.tot!=null?`<span>Σ <b>${tbNum(f.tot)}</b></span><span>máx. ${tbNum(f.max)}</span>`:''}</span>
          </button>`).join('')}</div>
        <div class="tab-head"><h4>Equipos y su pre instalación</h4><span class="th-nota">clic en la fila abre la ficha del equipo · cabeceras: clic ordena, ▾ filtra</span></div>`;
    }});
  m.pintar();
}
function tbFiltrarParam(k){ const m=TB_MATRICES.tbPi; if(!m) return; if(m.sel[k]) delete m.sel[k]; else m.sel[k]=new Set(m.filas.map(r=>String(r[k])).filter(v=>v!==''&&v!=='0')); m.pag=0; m.pintarTabla(); }


/* ───────────────────────── METRADO (mismo motor) ───────────────────────── */
function montarTbMetrado(d, filtroInicial){
  const filas=tbFilas(d);
  /* columnas del Anexo N°2: NIVEL · UPSS (NTS) · CÓDIGO AMBIENTE · AMBIENTE · CLAVE · DESCRIPCIÓN · GRUPO · PROVEE · CANT. */
  const m=tbMatriz({id:'tbMet', filas, porPag:100, archivo:'Anexo_N2_Distribucion', doc:'ANEXO Nº2 – LISTADO DE DISTRIBUCION POR AMBIENTES DEL EQUIPAMIENTO',
    pdfAnchos:{n:7,piso:13,upss:22,cod_amb:16,ambiente:37,clave:11,desc:38,grupo:11,provee:12,cant:9},
    placeholder:'Buscar clave / ambiente / equipo / UPSS…', buscar:['clave','desc','ambiente','cod_amb','upss','grupo'],
    cols:[{k:'n',t:'N°',cls:'n'},{k:'piso',t:'Nivel',filtro:true,csv:v=>'PISO '+String(v).padStart(2,'0'),rot:Object.fromEntries([1,2,3,4,5].map(i=>[String(i),'Piso '+i]))},{k:'upss',t:'UPSS (NTS)',filtro:true,cls:'met-upss'},{k:'cod_amb',t:'Código ambiente',filtro:true,cls:'met-cod'},
          {k:'ambiente',t:'Ambiente',filtro:true},{k:'clave',t:'Clave',filtro:true,cls:'met-cod met-clave'},{k:'desc',t:'Descripción',filtro:true},
          {k:'grupo',t:'Grupo',filtro:true,cls:'met-cod',rot:TB_ROT_GRUPO},{k:'provee',t:'Provee',filtro:true,cls:'met-cod',rot:TB_ROT_PROVEE},{k:'cant',t:'Cant.',cls:'n',sumar:true,fmt:v=>'<b>'+tbNum(v)+'</b>'}],
    filtrosTexto:()=>m._soloEq?'Sólo equipamiento (EQ.)':'',
    pie:v=>`<tr><td colspan="9">Total de la vista · ${tbNum(v.length)} líneas</td><td class="n"><b>${tbNum(v.reduce((s,r)=>s+r.cant,0))}</b></td></tr>`,
    resumen:v=>`Mostrando <b>${tbNum(v.length)}</b> de ${tbNum(filas.length)} líneas · <b>${tbNum(v.reduce((s,r)=>s+r.cant,0))}</b> unidades`,
    extraHtml:()=>`<label class="met-check"><input type="checkbox" ${m._soloEq?'checked':''} onchange="TB_MATRICES.tbMet._soloEq=this.checked;TB_MATRICES.tbMet.pag=0;TB_MATRICES.tbMet.pintarTabla()"> Solo equipamiento (EQ.)</label>`,
    filtroExtra:r=>!m._soloEq||r.provee==='EQ.', limpiarExtra:()=>{ m._soloEq=false; }});
  if(filtroInicial) Object.assign(m.sel, filtroInicial);
  m.pintar();
}

/* ───────────────────────── METRADO: vistas 2.1 a 2.5 ─────────────────────────
   Una sub-pestaña por anexo del metrado, con la numeración del índice de
   Documentación: 2.1 N1 Listado de claves · 2.2 N2 Distribución por ambientes ·
   2.3 N3 Por grupo genérico · 2.4 N3A Consolidado · 2.5 N3B Comparativo.       */
let MET_VISTA='N2';
const MET_VISTAS=[
  {k:'N1', num:'2.1', t:'Listado de claves utilizadas en planos'},
  {k:'N2', num:'2.2', t:'Distribución por ambientes (F5)'},
  {k:'N3', num:'2.3', t:'Equipamiento por grupo genérico'},
  {k:'N3A',num:'2.4', t:'Consolidado por grupo genérico'},
  /* {k:'N3B',num:'2.5', t:'Comparativo por grupo genérico'},   // oculto a pedido: el PIP aún no está cargado */
];
function setMetVista(k){ MET_VISTA=k; const d=CAD.datos||EX_DET[location.hash.split('/')[2]]; document.querySelectorAll('.met-vistas .chip').forEach(c=>c.classList.toggle('on',c.dataset.k===k)); montarVistaMet(d); }
function montarVistaMet(d){
  const box=document.getElementById('metVista'); if(!box) return;
  const v=MET_VISTAS.find(x=>x.k===MET_VISTA);
  box.innerHTML=`<div class="lista-head met-vista-h"><h4>${v.num} · Anexo ${v.k} · ${v.t}</h4><span class="th-nota" id="metVistaNota"></span></div><div id="tbMet"></div>`;
  if(MET_VISTA==='N1') montarMetN1(d);
  else if(MET_VISTA==='N3') montarMetN3(d);
  else if(MET_VISTA==='N3A') montarMetN3A(d);
  else if(MET_VISTA==='N3B') montarMetN3B(d);
  else montarTbMetrado(d, MET_FILTRO_INICIAL);
  MET_FILTRO_INICIAL=null;
}
/* 2.1 N1 — una fila por clave, con su codificación por norma */
function montarMetN1(d){
  const filas=(d.claves||[]).map((c,i)=>({n:i+1, clave:c.clave, desc:titulo(c.desc), grupo:c.grupo||'—', provee:c.provee||'—', norma:c.norma||'—'}));
  document.getElementById('metVistaNota').textContent=`${tbNum(filas.length)} claves · ${tbNum(filas.filter(r=>r.provee==='EQ.').length)} de equipamiento`;
  tbMatriz({id:'tbMet', filas, porPag:100, archivo:'Anexo_N1_Listado_de_claves', doc:'ANEXO Nº1 – LISTADO DE CLAVES UTILIZADAS EN PLANOS DE EQUIPAMIENTO', placeholder:'Buscar código o descripción…', buscar:['clave','desc','norma'],
    cols:[{k:'n',t:'N°',cls:'n'},{k:'clave',t:'Código',filtro:true,cls:'met-cod met-clave'},{k:'desc',t:'Descripción',filtro:true},
          {k:'grupo',t:'Grupo',filtro:true,cls:'met-cod',rot:TB_ROT_GRUPO},{k:'provee',t:'Provee',filtro:true,cls:'met-cod',rot:TB_ROT_PROVEE},{k:'norma',t:'Codificación',filtro:true,cls:'met-cod'}],
    resumen:v=>`Mostrando <b>${tbNum(v.length)}</b> de ${tbNum(filas.length)} claves`}).pintar();
}
/* 2.3 N3 — una fila por código de equipamiento con su cantidad total */
function metPorCodigo(d){
  const acc={};
  tbFilas(d).filter(r=>r.provee==='EQ.').forEach(r=>{ const c=acc[r.clave]||(acc[r.clave]={clave:r.clave,desc:r.desc,grupo:r.grupo,cant:0,ambientes:new Set()}); c.cant+=r.cant; c.ambientes.add(r.cod_amb); });
  const gi=g=>{ const i=TB_GRUPOS.indexOf(g); return i<0?99:i; };
  return Object.values(acc).sort((a,b)=>gi(a.grupo)-gi(b.grupo)||a.clave.localeCompare(b.clave,'es')).map((c,i)=>({n:i+1,clave:c.clave,desc:c.desc,grupo:c.grupo,cant:c.cant,ambientes:c.ambientes.size}));
}
function montarMetN3(d){
  const filas=metPorCodigo(d);
  document.getElementById('metVistaNota').textContent=`${tbNum(filas.length)} ítems · ${tbNum(filas.reduce((s,r)=>s+r.cant,0))} unidades (sólo EQ.)`;
  tbMatriz({id:'tbMet', filas, porPag:100, archivo:'Anexo_N3_Por_grupo', doc:'ANEXO Nº3 – LISTADO DE EQUIPAMIENTO POR GRUPO GENERICO', placeholder:'Buscar código o descripción…', buscar:['clave','desc'],
    cols:[{k:'n',t:'Ítem',cls:'n'},{k:'clave',t:'Código',filtro:true,cls:'met-cod met-clave'},{k:'desc',t:'Descripción',filtro:true},
          {k:'grupo',t:'Grupo',filtro:true,cls:'met-cod',rot:TB_ROT_GRUPO},{k:'cant',t:'Cant.',cls:'n',sumar:true,fmt:v=>'<b>'+tbNum(v)+'</b>'}],
    pie:v=>`<tr><td colspan="4">Total de la vista · ${tbNum(v.length)} ítems</td><td class="n"><b>${tbNum(v.reduce((s,r)=>s+r.cant,0))}</b></td></tr>`,
    resumen:v=>`Mostrando <b>${tbNum(v.length)}</b> de ${tbNum(filas.length)} ítems · <b>${tbNum(v.reduce((s,r)=>s+r.cant,0))}</b> unidades`}).pintar();
}
/* 2.4 N3A — consolidado por grupo */
function metPorGrupo(d){
  const cod=metPorCodigo(d); const acc={};
  cod.forEach(c=>{ const g=acc[c.grupo]||(acc[c.grupo]={grupo:c.grupo,items:0,cant:0}); g.items++; g.cant+=c.cant; });
  const orden=TB_GRUPOS.filter(g=>acc[g]).concat(Object.keys(acc).filter(g=>TB_GRUPOS.indexOf(g)<0));
  const tot=orden.reduce((s,g)=>s+acc[g].cant,0);
  return orden.map((g,i)=>({n:i+1,grupo:g,nombre:TB_NOMBRE[g]||g,items:acc[g].items,cant:acc[g].cant,pct:tot?Math.round(1000*acc[g].cant/tot)/10:0}));
}
function montarMetN3A(d){
  const filas=metPorGrupo(d);
  document.getElementById('metVistaNota').textContent=`${filas.length} grupos genéricos`;
  const m=tbMatriz({id:'tbMet', filas, porPag:50, archivo:'Anexo_N3A_Consolidado', doc:'ANEXO Nº3A – CONSOLIDADO DE EQUIPAMIENTO POR GRUPO GENERICO', descarga:true, placeholder:'Buscar grupo…', buscar:['grupo','nombre'],
    cols:[{k:'n',t:'N°',cls:'n'},{k:'nombre',t:'Clasificación',csv:(v,r)=>TB_CLASIF[r.grupo]||v},{k:'grupo',t:'Grupo',cls:'met-cod met-clave',fmt:(v,r)=>`<i class="tb-punto" style="background:${TB_COLOR[v]||'#999'}"></i><b>${tbEsc(v)}</b>`},
          {k:'items',t:'Ítems',cls:'n',sumar:true,fmt:v=>tbNum(v)},{k:'cant',t:'Cantidad',cls:'n',sumar:true,fmt:v=>'<b>'+tbNum(v)+'</b>'}],
    pie:v=>`<tr><td colspan="3">Total</td><td class="n">${tbNum(v.reduce((s,r)=>s+r.items,0))}</td><td class="n"><b>${tbNum(v.reduce((s,r)=>s+r.cant,0))}</b></td></tr>`,
    resumen:()=>'',
    onCambio:(v,arriba)=>{ const g={cats:v.map(r=>r.grupo),valores:v.map(r=>r.cant),colores:v.map(r=>TB_COLOR[r.grupo]||'#999')};
      arriba.innerHTML=`<div class="tb-graficos tb-graficos-2"><div class="tb-card"><div class="tb-card-h">Cantidad por grupo genérico</div>${tbBarras(g.cats,g.valores,g.colores)}</div>
        <div class="tb-card tb-card-dona"><div class="tb-card-h">Participación en unidades</div><div class="tb-dona-wrap">${tbDona(g.cats,g.valores,g.colores,{centro:'unidades'})}${tbLeyenda(g.cats,g.colores,g.valores)}</div></div></div>`; }});
  m.pintar();
}
/* 2.5 N3B — comparativo expediente técnico vs PIP */
function montarMetN3B(d){
  const pip=d.comparativo_pip||{}; const grupos=metPorGrupo(d);
  const filas=grupos.map((g,i)=>{ const p=pip[g.grupo]; const dif=p!=null?g.cant-p:null; return {n:i+1,grupo:g.grupo,nombre:g.nombre,exp:g.cant,pip:p,dif,pct:(p!=null&&p)?Math.round(1000*dif/p)/10:null}; });
  const conPip=filas.filter(r=>r.pip!=null).length;
  document.getElementById('metVistaNota').textContent=conPip?`PIP cargado en ${conPip} de ${filas.length} grupos`:'PIP sin cargar';
  const nota='NOTA: Se debe tener en consideración que durante el desarrollo del expediente técnico se logran optimizar los equipos a emplear en los servicios que brindará el establecimiento.';
  tbMatriz({id:'tbMet', filas, porPag:50, archivo:'Anexo_N3B_Comparativo', doc:'ANEXO Nº3B – COMPARATIVO DE EQUIPAMIENTO POR GRUPO GENERICO', pdfNota:nota, placeholder:'Buscar grupo…', buscar:['grupo','nombre'],
    cols:[{k:'n',t:'N°',cls:'n'},{k:'nombre',t:'Clasificación',csv:(v,r)=>TB_CLASIF[r.grupo]||v},{k:'grupo',t:'Grupo',cls:'met-cod met-clave',fmt:v=>`<i class="tb-punto" style="background:${TB_COLOR[v]||'#999'}"></i><b>${tbEsc(v)}</b>`},
          {k:'exp',t:'Exp. téc. cantidad',cls:'n',sumar:true,fmt:v=>'<b>'+tbNum(v)+'</b>'},{k:'pip',t:'PIP cantidad',cls:'n',sumar:true,fmt:v=>v==null?'<span class="tb-sin">sin dato</span>':tbNum(v),csv:v=>v==null?'':v}],
    pie:v=>{ const e=v.reduce((s,r)=>s+r.exp,0), p=v.reduce((s,r)=>s+(r.pip||0),0); return `<tr><td colspan="3">Total</td><td class="n"><b>${tbNum(e)}</b></td><td class="n">${tbNum(p)}</td></tr>`; },
    resumen:()=>'',
    onCambio:(v,arriba)=>{ arriba.innerHTML=`<div class="tb-aviso">${nota} El <b>PIP</b> es la cantidad del proyecto de inversión viable. ${conPip<filas.length?'<b>Falta cargar el PIP</b> en la hoja <i>CONS COMPARATIVO</i> del _BASE para los grupos "sin dato".':''}</div>`; }}).pintar();
}
