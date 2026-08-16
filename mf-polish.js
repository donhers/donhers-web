(()=>{
  const map={
    Sutil:{label:'Clásico',text:'Un reloj simple, prolijo y fácil de combinar.'},
    Presencia:{label:'Elegante',text:'Un reloj que se nota sin ser demasiado llamativo.'},
    Audaz:{label:'Llamativo',text:'Un reloj con más diseño y personalidad.'}
  };
  function apply(){
    document.querySelectorAll('.style').forEach(card=>{
      const h=card.querySelector('h2');
      const p=card.querySelector('p');
      const sm=card.querySelector('small');
      if(!h)return;
      const key=h.dataset.original||h.textContent.trim();
      if(!h.dataset.original) h.dataset.original=key;
      const v=map[key];
      if(v){h.textContent=v.label;if(p)p.textContent=v.text;if(sm)sm.textContent='VER RELOJES →';}
    });
    document.querySelectorAll('.choice-banner strong span,.match strong').forEach(el=>{
      let t=el.textContent;
      Object.entries(map).forEach(([old,v])=>{t=t.replace(old,v.label)});
      el.textContent=t;
    });
  }
  const mo=new MutationObserver(apply);
  mo.observe(document.getElementById('app'),{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',apply);
  apply();
})();