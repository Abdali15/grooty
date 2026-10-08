import { createHmac } from 'node:crypto';
import { equal,HttpError } from '../lib/security.js';
import { cents } from '../commerce/policy.js';
export class PaymentGateway {
 async createCheckout(){throw new HttpError(503,'Pasarela no configurada.');}
 async retrievePayment(){throw new HttpError(503,'Pasarela no configurada.');}
}
export class MockGateway extends PaymentGateway {
 async createCheckout(order){return {id:'mock-'+order.id,url:null,environment:'mock',message:'Prueba técnica sin cobro. Ningún pago ha sido confirmado.'};}
}
export function verifyMpSignature(req,url,secret,now=Date.now()){
 const id=url.searchParams.get('data.id'),requestId=req.headers['x-request-id'],signature=req.headers['x-signature'];
 if(!secret||!/^\d{1,30}$/.test(id||'')||typeof requestId!=='string'||!/^[\w-]{1,100}$/.test(requestId)||typeof signature!=='string')throw new HttpError(401,'Notificación no válida.');
 const m=/^ts=(\d{10,13}),v1=([0-9a-f]{64})$/.exec(signature);
 if(!m)throw new HttpError(401,'Firma inválida.');
 const timestamp=Number(m[1])*(m[1].length===10?1000:1);
 if(Math.abs(now-timestamp)>300000)throw new HttpError(401,'Notificación vencida.');
 const expected=createHmac('sha256',secret).update(`id:${id};request-id:${requestId};ts:${m[1]};`).digest('hex');
 if(!equal(expected,m[2]))throw new HttpError(401,'Firma inválida.');return id;
}
export class MercadoPagoGateway extends PaymentGateway {
 constructor(cfg,fetcher=fetch){super();this.cfg=cfg;this.fetcher=fetcher;}
 async request(path,{method='GET',body,key}={}){
   const r=await this.fetcher('https://api.mercadopago.com'+path,{method,headers:{Authorization:'Bearer '+this.cfg.env.MP_ACCESS_TOKEN,'Content-Type':'application/json',...(key?{'X-Idempotency-Key':key}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(8000),redirect:'error'});
   if(!r.ok)throw new HttpError(502,'La pasarela no pudo completar la operación.');return r.json();
 }
 async createCheckout(order,items){
   const p=await this.request('/checkout/preferences',{method:'POST',key:order.id,body:{external_reference:order.id,
     items:items.map(i=>({id:String(i.product_id),title:i.title,quantity:i.quantity,currency_id:'PEN',unit_price:Number(i.unit_cents)/100})),
     notification_url:this.cfg.origin+'/api/payments/mercadopago/webhook',
     back_urls:Object.fromEntries(['success','failure','pending'].map(k=>[k,this.cfg.origin+'/checkout?order='+order.id])),
     expires:true,expiration_date_to:new Date(order.expires_at).toISOString()}});
   if(String(p.collector_id)!==this.cfg.env.MP_COLLECTOR_ID||!p.sandbox_init_point)throw new HttpError(502,'Comercio sandbox no validado.');
   const u=new URL(p.sandbox_init_point);if(u.protocol!=='https:'||u.username||u.password||u.port||!/(^|\.)mercadopago\.(com|com\.pe)$/.test(u.hostname))throw new HttpError(502,'Destino de pago inválido.');
   return {id:String(p.id),url:u.href,environment:'sandbox'};
 }
 async retrievePayment(id){
   if(!/^\d{1,30}$/.test(id))throw new HttpError(400,'Referencia inválida.');
   const p=await this.request('/v1/payments/'+id);
   if(String(p.id)!==id||String(p.collector_id)!==this.cfg.env.MP_COLLECTOR_ID||p.currency_id!=='PEN'||p.live_mode!==false)throw new HttpError(409,'Comercio o entorno incorrecto.');
   const state=new Map([['approved','PAID'],['rejected','PAYMENT_FAILED'],['cancelled','CANCELLED'],['charged_back','CHARGEBACK']]).get(p.status);
   if(!state)throw new HttpError(409,'Estado pendiente de conciliación.');
   if(state==='PAID'&&(p.status_detail!=='accredited'||p.captured===false||cents(String(p.transaction_amount_refunded))!==0))throw new HttpError(409,'Pago sin acreditación o con devolución: requiere conciliación.');
   if(typeof p.date_last_updated!=='string'||p.date_last_updated.length>40||!Number.isFinite(Date.parse(p.date_last_updated)))throw new HttpError(409,'Evento financiero sin fecha válida.');
   if(!/^[0-9a-f-]{36}$/.test(p.external_reference||''))throw new HttpError(409,'Referencia inválida.');
   return {provider:'mercadopago',environment:'sandbox',providerId:id,orderId:p.external_reference,amountCents:cents(String(p.transaction_amount)),currency:p.currency_id,state,eventKey:id+':'+p.status+':'+p.date_last_updated};
 }
}
export const gateway=cfg=>cfg.provider==='mock'?new MockGateway():cfg.provider==='mercadopago'?new MercadoPagoGateway(cfg):new PaymentGateway();
