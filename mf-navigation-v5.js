// Navegación comercial v5: cada acceso tiene una función distinta.
(()=>{
  const originalShell=shell;
  const originalBind=bind;
  const originalDrawService=drawService;

  state.serviceMode=state.serviceMode||'help';

  shell=function(body,active=''){
    return `<div><div class="announce"><span>▱ ENVÍOS A TODO URUGUAY · COORDINACIÓN RÁPIDA</span><span>◌ PAGO SEGURO · MERCADO PAGO O TRANSFERENCIA</span></div><header class="nav"><button class="brand" data-go="home" aria-label="Volver al inicio"><img src="${LOGO}" alt="Donher’s"></button><nav class="navlinks"><button class="navlink ${active==='catalog'?'active':''}" data-go="catalog">Relojes</button><button class="navlink ${active==='collections'?'active':''}" data-go="collections">Colecciones</button><button class="navlink ${active==='tracking'?'active':''}" data-go="tracking">Seguimiento</button><button class="navlink ${active==='service'?'active':''}" data-go="service">Servicio</button></nav><div class="actions"><button class="ico" data-go="search" aria-label="Buscar reloj">${icon('search')}</button><button class="ico" data-favs aria-label="Favoritos">${icon('heart')}${state.fav.length?`<span class="count">${state.fav.length}</span>`:''}</button><button class="ico" data-cart aria-label="Carrito">${icon('bag')}${qty()?`<span class="count">${qty()}</span>`:''}</button><button class="ico menu" data-menu aria-label="Abrir menú">${icon('menu')}</button></div></header>${body}${drawers()}${checkout()}</div>`;
  };

  function collectionGroups(){
    const map=new Map();
    products.forEach(p=>{
      const name=p.cat||'Otros';
      if(!map.has(name))map.set(name,[]);
      map.get(name).push(p);
    });
    return [...map.entries()];
  }

  window.collections=function(){
    const groups=collectionGroups();
    return shell(`<main class="catalog collections-page"><div class="catalog-head"><div class="eyebrow">DONHER’S · COLECCIONES</div><h1>Elegí por tipo de reloj</h1><p>Una forma más rápida de llegar a los modelos que estás buscando.</p></div>${loadingProducts?`<div class="collection-grid">${Array.from({length:4},()=>'<div class="collection-card collection-loading"></div>').join('')}</div>`:groups.length?`<div class="collection-grid">${groups.map(([name,list])=>{const cover=list.find(p=>p.img)||list[0];return `<button class="collection-card" data-collection="${safe(name)}"><div class="collection-image">${cover?.img?`<img src="${cover.img}" alt="${safe(name)}" loading="lazy">`:''}</div><div class="collection-copy"><span>${list.length} ${list.length===1?'modelo':'modelos'}</span><h2>${safe(name)}</h2><small>VER COLECCIÓN →</small></div></button>`}).join('')}</div>`:`<div class="empty"><h2>Las colecciones se están actualizando</h2><p>Podés ver todos los relojes desde el catálogo.</p><button class="btn gold" data-go="catalog">VER RELOJES</button></div>`}</main>`,'collections');
  };

  drawService=function(){
    if(!state.service)return'';
    if(state.serviceMode==='tracking'){
      return `<div class="overlay" data-close-service></div><aside class="drawer"><div class="drawer-head"><h2>Seguimiento</h2><button class="x" data-close-service>×</button></div><div class="trackbox"><div class="eyebrow">TU PEDIDO</div><h3>Consultá el estado</h3><p class="service-copy">Ingresá el número de pedido y el email que usaste al comprar.</p><input id="trackId" placeholder="DH-1234567"><input id="trackMail" type="email" placeholder="tu@email.com"><button class="btn gold full" data-track>VER ESTADO</button>${state.track?`<div class="tracking-result">${state.track.error?state.track.error:`<b>${safe(state.track.id)}</b><br>Estado: ${safe(state.track.estado).replaceAll('_',' ')}<br>Total: ${money(state.track.total)}`}</div>`:''}<button class="textbtn service-switch" data-go="service">¿Necesitás ayuda? Ir a servicio →</button></div></aside>`;
    }
    return `<div class="overlay" data-close-service></div><aside class="drawer"><div class="drawer-head"><h2>Servicio Donher’s</h2><button class="x" data-close-service>×</button></div><div class="service-panel"><div class="eyebrow">AYUDA DIRECTA</div><h3>¿En qué te podemos ayudar?</h3><p class="service-copy">Consultas sobre modelos, compra, entrega o un pedido existente.</p><a class="btn gold full" href="https://wa.me/59892337486" target="_blank" rel="noopener">HABLAR POR WHATSAPP →</a><button class="btn full" data-go="tracking">SEGUIR UN PEDIDO</button></div><div class="service-panel compact"><b>Compra</b><span>Te ayudamos a elegir y coordinar el pago.</span><b>Entrega</b><span>Coordinamos envíos a todo Uruguay.</span><b>Postventa</b><span>Consultá el estado de tu pedido cuando quieras.</span></div></aside>`;
  };

  render=function(){
    if(!app)return;
    app.innerHTML=state.view==='home'?home():state.view==='catalog'?catalog():state.view==='collections'?collections():detail();
    bind();
  };

  go=function(v){
    state.cartOpen=state.favOpen=state.mobile=false;
    if(v==='catalog'){
      state.service=false;state.view='catalog';state.style='';state.cat='all';state.search='';
    }else if(v==='collections'){
      state.service=false;state.view='collections';
    }else if(v==='tracking'){
      state.serviceMode='tracking';state.service=true;
    }else if(v==='service'){
      state.serviceMode='help';state.service=true;
    }else if(v==='search'){
      state.service=false;state.view='catalog';state.style='';state.cat='all';
    }else{
      state.service=false;state.view=v;
    }
    render();
    if(v==='search')setTimeout(()=>document.getElementById('search')?.focus(),50);
    if(!['tracking','service'].includes(v))window.scrollTo({top:0,behavior:'smooth'});
    url();
  };

  url=function(){
    let p='/';
    if(state.checkout)p=state.step===5&&state.order?'/gracias/'+state.order:'/checkout';
    else if(state.cartOpen)p='/carrito';
    else if(state.service&&state.serviceMode==='tracking')p='/seguimiento';
    else if(state.service)p='/servicio';
    else if(state.view==='collections')p='/colecciones';
    else if(state.view==='catalog')p='/tienda';
    else if(state.view==='product'&&state.selected)p='/producto/'+state.selected;
    if(location.pathname!==p)history.pushState({},'',p);
  };

  bind=function(){
    originalBind();
    document.querySelectorAll('[data-collection]').forEach(x=>x.onclick=()=>{
      state.cat=x.dataset.collection;state.style='';state.search='';state.view='catalog';state.service=false;render();window.scrollTo({top:0,behavior:'smooth'});url();
    });
    document.querySelector('[data-choice]')?.addEventListener('click',()=>{
      if(state.view!=='home')state.view='home';
      state.mobile=false;state.service=false;render();
      setTimeout(()=>document.querySelector('.styles')?.scrollIntoView({behavior:'smooth',block:'center'}),80);
    });
  };

  const p=location.pathname;
  if(p==='/colecciones'){state.view='collections';state.service=false;render();}
  if(p==='/seguimiento'){state.serviceMode='tracking';state.service=true;render();}
  if(p==='/servicio'){state.serviceMode='help';state.service=true;render();}
})();