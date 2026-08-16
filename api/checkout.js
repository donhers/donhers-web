// Donher's — checkout server-side
// Revalida productos/precios contra Supabase antes de registrar el pedido.
// Usa la publishable key porque el esquema actual permite INSERT público por RLS.
// Si existe MERCADOPAGO_ACCESS_TOKEN en Vercel, crea una preferencia exacta.

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vbbxwgmpwmusekhnjlfb.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_41pteWjq2Mx2fz-d5QS8xA_QAw10iyi';
const MP_FALLBACK = process.env.MERCADOPAGO_PAYMENT_LINK || 'https://link.mercadopago.com.uy/donhers';

const json = (res,status,body)=>res.status(status).json(body);
const clean = v => String(v == null ? '' : v).trim();
const headers = ()=>({apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json'});

async function sb(path, options={}){
  const r = await fetch(`${SUPABASE_URL}${path}`, {...options, headers:{...headers(), ...(options.headers||{})}});
  const text = await r.text();
  let data=null; try{data=text?JSON.parse(text):null}catch{data=text}
  if(!r.ok){const err=new Error(`Supabase ${r.status}`);err.status=r.status;err.data=data;throw err}
  return data;
}
function generatedId(){const rnd=Math.random().toString(36).slice(2,6).toUpperCase();return `DH-${Date.now().toString(36).toUpperCase()}-${rnd}`}
function acceptedId(v){const x=clean(v).toUpperCase();return /^DH-[A-Z0-9-]{5,32}$/.test(x)?x:generatedId()}

async function notify(req,payload){
  try{const proto=(req.headers['x-forwarded-proto']||'https').split(',')[0];const host=req.headers['x-forwarded-host']||req.headers.host||'www.donhers.com';await fetch(`${proto}://${host}/api/notify-pedido`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})}catch(e){console.error('[checkout] notify',e)}
}
async function createMercadoPagoPreference(order){
  const token=process.env.MERCADOPAGO_ACCESS_TOKEN;
  if(!token)return{url:MP_FALLBACK,mode:'generic_link'};
  const origin=process.env.PUBLIC_SITE_URL||'https://www.donhers.com';
  const body={items:order.items.map(i=>({id:i.producto_id,title:i.nombre,quantity:i.qty,unit_price:i.precio,currency_id:'UYU'})),payer:{email:order.cliente_email,name:order.cliente_nombre},external_reference:order.id,back_urls:{success:`${origin}/gracias/${encodeURIComponent(order.id)}?pago=aprobado`,pending:`${origin}/gracias/${encodeURIComponent(order.id)}?pago=pendiente`,failure:`${origin}/checkout?pago=fallido`},auto_return:'approved',statement_descriptor:'DONHERS'};
  const r=await fetch('https://api.mercadopago.com/checkout/preferences',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const out=await r.json().catch(()=>({}));
  if(!r.ok||!out.init_point){console.error('[checkout] Mercado Pago preference',r.status,out);return{url:MP_FALLBACK,mode:'generic_link'}}
  return{url:out.init_point,mode:'preference'};
}

export default async function handler(req,res){
  if(req.method!=='POST')return json(res,405,{ok:false,error:'method'});
  try{
    const b=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{}),customer=b.customer||{},shipping=b.shipping||{},payment=b.payment==='transfer'?'transfer':'mp',raw=Array.isArray(b.items)?b.items:[];
    const email=clean(customer.email).toLowerCase(),name=clean(customer.name),phone=clean(customer.phone);
    if(!email.includes('@')||!name||!phone)return json(res,400,{ok:false,error:'contact'});
    if(!raw.length||raw.length>20)return json(res,400,{ok:false,error:'items'});

    const requested=new Map();
    for(const x of raw){const id=clean(x.id||x.producto_id),q=Math.max(1,Math.min(10,Number(x.qty)||1));if(id)requested.set(id,(requested.get(id)||0)+q)}
    if(!requested.size)return json(res,400,{ok:false,error:'items'});

    const catalog=await sb('/rest/v1/productos?select=id,nombre,precio,stock,activo&activo=eq.true',{method:'GET'}),byId=new Map((catalog||[]).map(p=>[String(p.id),p])),items=[];
    for(const [id,qty] of requested){const p=byId.get(id);if(!p)return json(res,409,{ok:false,error:'product_unavailable',product:id});if(p.stock!=null&&Number(p.stock)<qty)return json(res,409,{ok:false,error:'stock',product:id,available:Number(p.stock)});items.push({producto_id:id,nombre:clean(p.nombre),precio:Number(p.precio)||0,qty})}
    const total=items.reduce((a,i)=>a+i.precio*i.qty,0);if(total<=0)return json(res,409,{ok:false,error:'total'});

    const id=acceptedId(b.order_id),datosEnvio={name,email,phone,dept:clean(shipping.dept),city:clean(shipping.city),address:clean(shipping.address),notes:clean(shipping.notes),shippingMethodId:clean(shipping.methodId),shippingMethodName:clean(shipping.methodName)};
    if(!datosEnvio.dept||!datosEnvio.city)return json(res,400,{ok:false,error:'shipping'});if(datosEnvio.shippingMethodId==='domicilio'&&!datosEnvio.address)return json(res,400,{ok:false,error:'address'});

    const pedido={id,cliente_email:email,cliente_nombre:name,total,estado:'pendiente_pago',metodo_pago:payment==='transfer'?'transferencia':'mercadopago',datos_envio:datosEnvio};
    try{await sb('/rest/v1/pedidos',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(pedido)});await sb('/rest/v1/pedido_items',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(items.map(i=>({...i,pedido_id:id})))})}
    catch(e){
      // Si el navegador reintenta después de perder la respuesta, el mismo ID puede existir.
      const duplicate=JSON.stringify(e.data||'').includes('23505')||JSON.stringify(e.data||'').toLowerCase().includes('duplicate');
      if(!duplicate)throw e;
    }

    sb('/rest/v1/rpc/registrar_cliente',{method:'POST',body:JSON.stringify({p_email:email,p_nombre:name,p_telefono:phone})}).catch(()=>{});
    let paymentUrl=null,paymentMode=null;if(payment==='mp'){const mp=await createMercadoPagoPreference({id,cliente_email:email,cliente_nombre:name,items});paymentUrl=mp.url;paymentMode=mp.mode}
    notify(req,{type:'pedido',id,total,email,metodo_pago:payment,items:items.map(i=>`${i.nombre} × ${i.qty}`).join(' · '),envio:datosEnvio.shippingMethodName,direccion:[datosEnvio.address,datosEnvio.city,datosEnvio.dept].filter(Boolean).join(', '),timestamp:new Date().toISOString()});
    return json(res,200,{ok:true,id,total,items,payment_url:paymentUrl,payment_mode:paymentMode});
  }catch(e){console.error('[checkout]',e);return json(res,500,{ok:false,error:'checkout_unavailable'})}
}
