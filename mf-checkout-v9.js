// Donher's v9 — checkout resistente: servidor, reintento, persistencia y fallback.
(()=>{
  const previousBind=bind;
  const legacyConfirmOrder=confirmOrder;
  const DRAFT_KEY='dh-checkout-draft-v9';

  function saveDraft(){
    try{localStorage.setItem(DRAFT_KEY,JSON.stringify({data:state.data,step:state.step,order:state.order,ts:Date.now()}))}catch{}
  }
  function clearDraft(){try{localStorage.removeItem(DRAFT_KEY)}catch{}}
  function restoreDraft(){
    try{
      const d=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');
      if(!d||!d.data||Date.now()-(d.ts||0)>24*60*60*1000)return;
      state.data={...state.data,...d.data};
      if(qty()>0&&location.pathname==='/checkout'){
        state.checkout=true;
        state.step=Math.min(4,Math.max(1,Number(d.step)||1));
        state.order=d.order||state.order||('DH-'+String(Date.now()).slice(-7));
      }
    }catch{}
  }
  const checkoutItems=()=>items().map(({p,q})=>({id:p.id,qty:q}));
  function whatsappFallback(){
    const d=state.data;
    const lines=items().map(({p,q})=>`• ${p.name} × ${q} — ${money(p.price*q)}`).join('\n');
    const text=`Hola Donher’s, quiero finalizar esta compra.\n\nPedido: ${state.order||'sin registrar'}\n${lines}\nTotal productos: ${money(total())}\n\nNombre: ${d.name}\nEmail: ${d.email}\nTeléfono: ${d.phone}\nEntrega: ${d.shippingName}\n${[d.address,d.city,d.dept].filter(Boolean).join(', ')}`;
    return 'https://wa.me/59892337486?text='+encodeURIComponent(text);
  }
  function setSubmitting(on){
    const b=document.querySelector('[data-confirm]');
    if(!b)return;
    b.disabled=on;
    b.style.opacity=on?'.62':'';
    b.textContent=on?'REGISTRANDO PEDIDO…':'CONFIRMAR PEDIDO';
  }
  function addFallback(){
    if(document.querySelector('.checkout-fallback-v9'))return;
    const box=document.querySelector('.checkout-actions-v7')||document.querySelector('.checkout-actions');
    if(!box)return;
    const a=document.createElement('a');
    a.className='checkout-fallback-v9';a.href=whatsappFallback();a.target='_blank';a.rel='noopener';a.textContent='FINALIZAR POR WHATSAPP →';
    box.appendChild(a);
  }
  async function postCheckout(payload,attempt=0){
    const ctrl=new AbortController();
    const timer=setTimeout(()=>ctrl.abort(),15000);
    try{
      const r=await fetch('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:ctrl.signal});
      const out=await r.json().catch(()=>({}));
      if(r.ok&&out.ok)return out;
      if(r.status>=500&&attempt<1){await new Promise(r=>setTimeout(r,700));return postCheckout(payload,attempt+1)}
      const e=new Error(out.error||'checkout');e.code=out.error;e.info=out;throw e;
    }catch(e){
      if(attempt<1&&(e.name==='AbortError'||e instanceof TypeError)){await new Promise(r=>setTimeout(r,700));return postCheckout(payload,attempt+1)}
      throw e;
    }finally{clearTimeout(timer)}
  }

  confirmOrder=async function(){
    if(state.submitting)return;
    state.submitting=true;saveDraft();setSubmitting(true);
    const d=state.data;
    state.order=state.order||('DH-'+String(Date.now()).slice(-7));
    const payload={
      order_id:state.order,
      customer:{email:d.email,name:d.name,phone:d.phone},
      shipping:{dept:d.dept,city:d.city,address:d.shipping==='domicilio'?d.address:'',notes:d.notes,methodId:d.shipping,methodName:d.shippingName},
      payment:d.payment,
      items:checkoutItems()
    };
    try{
      const out=await postCheckout(payload);
      state.order=out.id||state.order;
      state.paymentUrl=out.payment_url||null;
      state.paymentMode=out.payment_mode||null;
      state.serverTotal=out.total||total();
      state.cart={};persist();clearDraft();state.step=5;state.submitting=false;render();url();
    }catch(e){
      console.error('[Donhers checkout v9]',e);
      state.submitting=false;setSubmitting(false);
      if(e.code==='stock')toast('Ese modelo cambió de stock. Revisá el carrito.');
      else if(e.code==='product_unavailable')toast('Uno de los modelos ya no está disponible.');
      else{
        // Última red de seguridad: conserva el flujo anterior si Supabase sigue disponible.
        try{
          if(window.DB?.ok){
            await legacyConfirmOrder();
            if(state.step===5){clearDraft();return}
          }
        }catch{}
        toast('No pudimos registrar automáticamente. Podés finalizar por WhatsApp.');
        addFallback();
      }
    }
  };

  confirmView=function(){
    const d=state.data;
    const mpUrl=state.paymentUrl||'https://link.mercadopago.com.uy/donhers';
    const pay=d.payment==='mp'
      ?`<a class="btn gold" href="${safe(mpUrl)}" target="_blank" rel="noopener">CONTINUAR A MERCADO PAGO ↗</a>`
      :`<a class="btn gold" href="https://wa.me/59892337486?text=${encodeURIComponent('Hola Donher’s, quiero enviar el comprobante del pedido '+state.order)}" target="_blank" rel="noopener">ENVIAR COMPROBANTE →</a>`;
    const mode=d.payment==='mp'&&state.paymentMode==='generic_link'?'<small class="payment-mode-note-v9">El pedido ya quedó registrado. Mercado Pago se abre en una nueva pestaña.</small>':'';
    return `<div class="confirm confirm-v7"><div class="confirm-mark-v7">DH</div><div class="eyebrow">PEDIDO REGISTRADO</div><h1>Listo. Ya tenemos tu pedido.</h1><p>Guardá este número. El pedido quedó registrado antes de pasar al pago.</p><div class="ordercode-v7"><span>NÚMERO DE PEDIDO</span><strong>${safe(state.order)}</strong></div>${mode}<div class="confirm-actions-v7">${pay}<button class="btn" data-service>SEGUIR PEDIDO</button></div><button class="textbtn" data-finish>VOLVER A LA TIENDA</button></div>`;
  };

  bind=function(){
    previousBind();
    document.querySelectorAll('[data-field],input[name="ship"],input[name="pay"]').forEach(el=>{
      el.addEventListener('input',saveDraft);el.addEventListener('change',saveDraft);
    });
    document.querySelectorAll('[data-next],[data-prev]').forEach(el=>el.addEventListener('click',()=>setTimeout(saveDraft,0)));
  };

  restoreDraft();
  setTimeout(()=>{try{render()}catch{}},0);
})();
