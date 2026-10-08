import {esc,$} from '../lib/dom.js';
import {summarize} from '../lib/cart.js';
import {money} from '../lib/format.js';
import {commerceRequest} from '../lib/commerce-client.js';
export const checkout={
 render(){const s=summarize();return {title:'Checkout · Grooty Store',description:'Revisa tu pedido y su estado real.',html:`<section class="container commerce-wrap"><p class="eyebrow">Tu próxima pieza</p><h1 class="h-page">Revisa tu pedido</h1><p class="page-sub">Compra en soles (PEN). La disponibilidad y el importe final se validan antes de iniciar el pago.</p><div data-checkout-state role="status">Comprobando disponibilidad del servicio…</div><div class="commerce-grid"><form class="commerce-panel" data-checkout hidden><h2>Datos de entrega</h2><div class="admin-form-grid">${[['name','Nombre completo','name'],['phone','Teléfono','tel'],['line1','Dirección','street-address'],['district','Distrito','address-level3'],['province','Provincia','address-level2'],['department','Departamento','address-level1']].map(([k,l,a])=>`<label class="admin-field">${l}<input name="${k}" autocomplete="${a}" required maxlength="180"></label>`).join('')}</div><p>El costo y cobertura de envío requieren configuración comercial antes de activar cobros reales.</p><button class="btn btn-primary" data-checkout-submit>Validar y continuar</button></form><aside class="commerce-panel"><h2>Mi selección</h2>${s.lines.length?s.lines.map(l=>`<article class="commerce-order"><h3>${esc(l.p.name)}</h3><p>${l.qty} × ${money(l.p.precio)} ${l.p.isPre?'· preventa':''}</p></article>`).join(''):'<p>No tienes figuras seleccionadas.</p>'}<p>Los importes mostrados aquí son referenciales hasta la comprobación del servidor.</p><a class="btn btn-secondary" href="/catalogo">Seguir explorando</a></aside></div></section>`};},
 mount(root){
  const ac=new AbortController(),status=$('[data-checkout-state]',root),form=$('[data-checkout]',root),orderId=new URLSearchParams(location.search).get('order');let flags,session,key=crypto.randomUUID().replaceAll('-','');
  const api=(p,o={})=>commerceRequest(p,{...o,signal:ac.signal});
  async function init(){try{
   flags=await api('/auth/config');session=await api('/account/session');if(ac.signal.aborted)return;
   if(orderId){const {order,items}=await api('/orders/'+orderId);if(ac.signal.aborted)return;status.innerHTML=`<article class="commerce-panel"><h2>Estado: ${esc(order.status)}</h2><p>Pedido ${esc(order.id)} · ${money(Number(order.total_cents)/100)}</p><p>${items.length} figuras registradas. El retorno desde la pasarela no confirma el pago.</p><a class="btn btn-secondary" href="/checkout?order=${esc(order.id)}&refresh=1">Actualizar estado</a></article>`;return;}
   if(!flags.payments){status.textContent='Las compras online todavía no están habilitadas. Puedes consultar disponibilidad con la tienda.';return;}
   const s=summarize();if(!s.lines.length){status.textContent='Añade figuras al carrito para continuar.';return;}
   if(s.pre.length||s.sale.some(l=>l.p.stock==null)){status.textContent='Esta selección contiene preventas o stock por confirmar. Consulta disponibilidad antes de comprar.';return;}
   status.textContent=flags.paymentEnvironment==='mock'?'Modo de prueba: este checkout no cobra dinero ni confirma pagos.':'Checkout sandbox: utiliza únicamente cuentas de prueba. Los medios disponibles, incluido Yape cuando esté habilitado por el comercio, se muestran dentro del checkout oficial de Mercado Pago.';form.hidden=false;
  }catch(e){if(ac.signal.aborted)return;status.innerHTML=e.status===401?'<p>Inicia sesión para revisar tu pedido.</p><a class="btn btn-primary" href="/cuenta">Ir a mi cuenta</a>':esc(e.message);}}
  form.addEventListener('submit',async e=>{e.preventDefault();const b=$('[data-checkout-submit]',root);b.disabled=true;status.textContent='Validando carrito y reservando disponibilidad…';
   try{const s=summarize(),address=Object.fromEntries(new FormData(form)),{order}=await api('/orders',{method:'POST',body:{items:s.sale.map(l=>({productId:l.p.id,quantity:l.qty})),address,idempotencyKey:key}}),payment=await api('/orders/'+order.id+'/checkout',{method:'POST',body:{}});
    if(payment.url){const u=new URL(payment.url);if(u.protocol!=='https:'||!/(^|\.)mercadopago\.(com|com\.pe)$/.test(u.hostname))throw Error('Destino de pago inválido.');location.assign(u.href);}else{status.textContent=payment.message+' Pedido pendiente: '+order.id;form.hidden=true;}
   }catch(error){status.textContent=error.message;}finally{b.disabled=false;}
  },{signal:ac.signal});init();return ()=>ac.abort();
 }
};
