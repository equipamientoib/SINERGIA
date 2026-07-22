/* ---- MEJORAS DE INTERFAZ ---- */
// Sombra del header al hacer scroll
const _hdr=document.querySelector('header');
addEventListener('scroll',()=>{
  _hdr.classList.toggle('scrolled',scrollY>8);
  const t=document.getElementById('toTop'); if(t)t.classList.toggle('show',scrollY>420);
},{passive:true});
// Revelado suave de secciones estáticas
(function(){
  if(!('IntersectionObserver' in window))return;
  const els=document.querySelectorAll('.svc .card,.step,.wcard,.facts,.shead,.custom-cta,.nota');
  els.forEach(el=>el.classList.add('rv'));
  const io=new IntersectionObserver(es=>es.forEach(x=>{if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}}),{threshold:.12});
  els.forEach(el=>io.observe(el));
})();
// WhatsApp: si CONFIG.WHATSAPP tiene número, activa botón flotante y enlace del footer
(function(){
  const n=String(CONFIG.WHATSAPP||'').replace(/\D/g,'');
  if(!n)return;
  const url='https://wa.me/'+n+'?text='+encodeURIComponent('Hola Sinergia Biomédica, quiero solicitar una cotización.');
  const f=document.getElementById('waFab'); if(f){f.href=url;f.classList.add('show');}
  const l=document.getElementById('waLink'); if(l){l.href=url;l.target='_blank';l.rel='noopener';l.removeAttribute('onclick');}
})();

