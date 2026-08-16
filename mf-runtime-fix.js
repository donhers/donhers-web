(()=>{
  const NAV_LOGO='/images/Recursos/logo-donhers-gold-navbar.png';
  const HERO_LOGO='/images/Recursos/logo-donhers-gold-transparent-1024.png';
  const styles={
    sutil:{label:'Clásico',text:'Un reloj simple, prolijo y fácil de combinar.',img:'/images/cab-clasico-original.png'},
    presencia:{label:'Elegante',text:'Un reloj que se nota sin ser demasiado llamativo.',img:'/images/cab-esfera-lisa-negro.png'},
    audaz:{label:'Llamativo',text:'Un reloj con más diseño y personalidad.',img:'/images/DON0016.png'}
  };

  function paint(){
    try{
      const root=document.getElementById('app');
      if(root&&!root.children.length&&typeof render==='function') render();
    }catch(e){console.error('[MF] render inicial',e)}
  }

  function apply(){
    const brand=document.querySelector('.brand img');
    if(brand&&brand.getAttribute('src')!==NAV_LOGO) brand.src=NAV_LOGO;
    const hero=document.querySelector('.hero-logo img');
    if(hero&&hero.getAttribute('src')!==HERO_LOGO) hero.src=HERO_LOGO;

    document.querySelectorAll('.style[data-style]').forEach(card=>{
      const key=card.dataset.style;
      const cfg=styles[key];
      if(!cfg) return;
      const img=card.querySelector('img');
      const h=card.querySelector('h2');
      const p=card.querySelector('p');
      const sm=card.querySelector('small');
      if(img&&img.getAttribute('src')!==cfg.img) img.src=cfg.img;
      if(h) h.textContent=cfg.label;
      if(p) p.textContent=cfg.text;
      if(sm) sm.textContent='VER RELOJES →';
    });

    document.querySelectorAll('.choice-banner strong span').forEach(el=>{
      const t=el.textContent.trim();
      if(t==='Sutil')el.textContent='Clásico';
      if(t==='Presencia')el.textContent='Elegante';
      if(t==='Audaz')el.textContent='Llamativo';
    });
  }

  paint();
  apply();
  const root=document.getElementById('app');
  if(root){new MutationObserver(()=>{apply()}).observe(root,{childList:true,subtree:true});}
  document.addEventListener('DOMContentLoaded',()=>{paint();apply()});
  setTimeout(()=>{paint();apply()},250);
  setTimeout(()=>{paint();apply()},1000);
})();
