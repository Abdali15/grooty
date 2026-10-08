import { HttpError,token,hash } from '../lib/security.js';
import { transaction } from '../lib/db.js';
import { audit } from '../lib/auth.js';
import { createOrder } from './orders.js';
export function requestInput(body){
 const fields=['franchise','character','brand','reference','url','quantity','notes'];
 if(!body||Object.keys(body).some(k=>!fields.includes(k)))throw new HttpError(400,'Solicitud inválida.');
 const out={};for(const k of fields.filter(k=>k!=='quantity')){const v=body[k]??'';if(typeof v!=='string'||v.length>(k==='notes'?1500:500)||/[\u0000-\u001f]/u.test(v))throw new HttpError(400,'Texto inválido.');out[k]=v.trim();}
 if(!out.character||!Number.isInteger(body.quantity)||body.quantity<1||body.quantity>20)throw new HttpError(400,'Indica figura y cantidad.');
 if(out.url){let u;try{u=new URL(out.url);}catch{throw new HttpError(400,'Enlace inválido.');}if(u.protocol!=='https:'||u.username||u.password)throw new HttpError(400,'Usa un enlace HTTPS.');}
 // URL is stored only. Never fetched by backend (no SSRF).
 return {...out,quantity:body.quantity};
}
export async function customRequest(db,s,body){
 const details=requestInput(body);return transaction(db,async c=>{
 const r=(await c.query('insert into grooty_commerce.custom_figure_requests(profile_id,details) values($1,$2) returning id,status',[s.profile_id,JSON.stringify(details)])).rows[0];
 await audit(c,s.profile_id,'request.create',r.id);return r;});
}
export async function reservePreorder(db,s,body){
 if(Object.keys(body).sort().join(',')!=='productId,quantity'||!Number.isSafeInteger(body.productId)||!Number.isInteger(body.quantity)||body.quantity<1||body.quantity>20)throw new HttpError(400,'Reserva inválida.');
 return transaction(db,async c=>{
 const p=(await c.query("select id from public.products where id=$1 and sale_type='preventa' and published and not archived for update",[body.productId])).rows[0];
 if(!p)throw new HttpError(409,'Preventa no disponible.');
 const prior=(await c.query("select id from grooty_commerce.preorders where profile_id=$1 and product_id=$2 and status in ('RESERVED','AVAILABLE')",[s.profile_id,p.id])).rows[0];if(prior)throw new HttpError(409,'Ya tienes una reserva activa.');
 const r=(await c.query('insert into grooty_commerce.preorders(profile_id,product_id,quantity) values($1,$2,$3) returning id,status',[s.profile_id,p.id,body.quantity])).rows[0];
 await audit(c,s.profile_id,'preorder.reserve',r.id);return {reservation:r,terms:'Pago completo al llegar. Tienes 7 días desde la notificación de disponibilidad. Reserva sin cobro online.'};
 });
}
export async function preorderAvailable(db,s,id){
 const link=token();return transaction(db,async c=>{
 const p=(await c.query("update grooty_commerce.preorders set status='AVAILABLE',available_at=now(),pay_by=now()+interval '7 days',token_hash=$2 where id=$1 and status='RESERVED' returning id,profile_id,pay_by",[id,hash(link)])).rows[0];
 if(!p)throw new HttpError(409,'Reserva no disponible.');
 // No bearer token in logs or outbox. Email integration must generate signed link during delivery.
 await c.query("insert into grooty_commerce.outbox(profile_id,kind,resource_id) values($1,'preorder.available',$2)",[p.profile_id,id]);
 await audit(c,s.profile_id,'preorder.available',id);return {reservation:p,token:link};
 });
}
export async function preorderOrder(db,s,id,body){
 if(Object.keys(body).sort().join(',')!=='address,token'||typeof body.token!=='string'||!/^[\w-]{43}$/.test(body.token))throw new HttpError(400,'Enlace de reserva inválido.');
 const p=(await db.query("select * from grooty_commerce.preorders where id=$1 and profile_id=$2 and status='AVAILABLE' and pay_by>now() and token_hash=$3",[id,s.profile_id,hash(body.token)])).rows[0];
 if(!p)throw new HttpError(404,'Reserva vencida o no disponible.');
 const value=await createOrder(db,s.profile_id,{items:[{productId:Number(p.product_id),quantity:p.quantity}],address:body.address,idempotencyKey:'preorder-'+p.id},{preorderProductId:Number(p.product_id)});
 await db.query('update grooty_commerce.preorders set order_id=$2 where id=$1',[id,value.order.id]);return value;
}
