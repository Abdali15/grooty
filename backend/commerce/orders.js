import { transaction } from '../lib/db.js';
import { HttpError, hash } from '../lib/security.js';
import { audit } from '../lib/auth.js';
import { cartInput,cents,transition } from './policy.js';

export async function createOrder(db,profileId,input,{preorderProductId=null}={}){
 const body=cartInput(input), fingerprint=hash(JSON.stringify({items:body.items,address:body.address}));
 return transaction(db,async c=>{
   // Serialize repeat operations before locking stock; deterministic lock ordering prevents deadlocks.
   await c.query('select pg_advisory_xact_lock(hashtextextended($1,0))',[profileId+':'+body.idempotencyKey]);
   const prior=(await c.query('select * from grooty_commerce.orders where profile_id=$1 and idempotency_key=$2',[profileId,body.idempotencyKey])).rows[0];
   if(prior){if(prior.request_hash!==fingerprint)throw new HttpError(409,'La clave ya pertenece a otro carrito.');return {order:prior,replayed:true};}
   const lines=[];let total=0;
   for(const item of body.items){
     const p=(await c.query('select p.* from public.products p join public.brands b on b.id=p.brand_id where p.id=$1 and p.published and not p.archived and b.active for update of p',[item.productId])).rows[0];
     if(!p||(p.sale_type!=='venta'&&Number(p.id)!==preorderProductId)||p.stock===null)throw new HttpError(409,'La figura requiere disponibilidad confirmada.');
     const held=Number((await c.query("select coalesce(sum(quantity),0) n from grooty_commerce.inventory_reservations where product_id=$1 and status='HELD' and expires_at>now()",[item.productId])).rows[0].n);
     if(p.stock-held<item.quantity)throw new HttpError(409,'Stock insuficiente. Actualiza tu selección.');
     // Never accept a promotion ID or price supplied by the browser.
     const promo=(await c.query('select unit_cents,ends_at from grooty_commerce.promotions where product_id=$1 and active and starts_at<=now() and ends_at>now() order by unit_cents limit 1',[item.productId])).rows[0];
     const unit=promo?Number(promo.unit_cents):cents(String(p.price));
     if(unit<=0)throw new HttpError(409,'Precio pendiente de confirmar.');
     total+=unit*item.quantity;lines.push({...item,title:p.title,unit,endsAt:promo?.ends_at});
   }
   if(!Number.isSafeInteger(total)||total>9999999999)throw new HttpError(400,'El pedido excede el importe permitido.');
   const order=(await c.query(`insert into grooty_commerce.orders(profile_id,total_cents,idempotency_key,request_hash,address,expires_at,status)
     values($1,$2,$3,$4,$5,least(now()+interval '15 minutes',coalesce($6::timestamptz,now()+interval '15 minutes')),'PENDING_PAYMENT') returning *`,
     [profileId,total,body.idempotencyKey,fingerprint,JSON.stringify(body.address),lines.filter(l=>l.endsAt).map(l=>new Date(l.endsAt)).sort((a,b)=>a-b)[0]||null])).rows[0];
   for(const l of lines){
     await c.query('insert into grooty_commerce.order_items values($1,$2,$3,$4,$5)',[order.id,l.productId,l.title,l.quantity,l.unit]);
     await c.query('insert into grooty_commerce.inventory_reservations(order_id,product_id,quantity,expires_at) values($1,$2,$3,$4)',[order.id,l.productId,l.quantity,order.expires_at]);
   }
   await audit(c,profileId,'order.create',order.id,{total_cents:total});
   await c.query("insert into grooty_commerce.outbox(profile_id,kind,resource_id) values($1,'order.registered',$2)",[profileId,order.id]);
   return {order,replayed:false};
 });
}
export async function ownOrder(db,profileId,id){
 if(!/^[0-9a-f-]{36}$/.test(id))throw new HttpError(404,'Pedido no encontrado.');
 const order=(await db.query('select id,status,total_cents,currency,created_at,expires_at from grooty_commerce.orders where id=$1 and profile_id=$2',[id,profileId])).rows[0];
 if(!order)throw new HttpError(404,'Pedido no encontrado.');
 const items=(await db.query('select product_id,title,quantity,unit_cents from grooty_commerce.order_items where order_id=$1',[id])).rows;
 return {order,items};
}
export async function expireOrders(db){
 return transaction(db,async c=>{
   await c.query('delete from grooty_private.rate_limits where key in (select key from grooty_private.rate_limits where expires_at<=now() limit 1000)');
   await c.query('delete from grooty_commerce.sessions where token_hash in (select token_hash from grooty_commerce.sessions where expires_at<=now() limit 1000)');
   await c.query('delete from grooty_commerce.oauth_attempts where state_hash in (select state_hash from grooty_commerce.oauth_attempts where expires_at<=now() limit 1000)');
   const {rows}=await c.query("select id from grooty_commerce.orders where status='PENDING_PAYMENT' and expires_at<=now() order by id for update skip locked limit 100");
   for(const o of rows){
     await c.query("update grooty_commerce.orders set status='PAYMENT_EXPIRED',updated_at=now() where id=$1",[o.id]);
     await c.query("update grooty_commerce.inventory_reservations set status='RELEASED' where order_id=$1 and status='HELD'",[o.id]);
     await audit(c,'system','order.expired',o.id);
   }return {expired:rows.length};
 });
}
// Called only with an independently retrieved, verified provider transaction, never a redirect.
export async function settlePayment(db,payment){
 return transaction(db,async c=>{
   const o=(await c.query('select * from grooty_commerce.orders where id=$1 for update',[payment.orderId])).rows[0];
   if(!o||payment.currency!==o.currency||payment.amountCents!==Number(o.total_cents))throw new HttpError(409,'El pago no corresponde al pedido.');
   const prior=(await c.query('select 1 from grooty_commerce.payment_events where provider=$1 and event_key=$2',[payment.provider,payment.eventKey])).rows.length;
   if(prior)return {duplicate:true};
   const existing=(await c.query('select * from grooty_commerce.payments where order_id=$1 for update',[o.id])).rows[0];
   if(!existing||existing.environment!==payment.environment||existing.provider!==payment.provider||(existing.provider_id&&existing.provider_id!==payment.providerId))throw new HttpError(409,'Transacción no vinculada.');
   if(o.status===payment.state)return {duplicate:true};
   // Late successful payments require reconciliation/refund review, not automatic stock theft.
   if(payment.state==='PAID'){
     const valid=(await c.query("select expires_at>now() valid from grooty_commerce.orders where id=$1",[o.id])).rows[0].valid;
     if(!valid)throw new HttpError(409,'Pago tardío: requiere conciliación.');
     const holds=(await c.query("select * from grooty_commerce.inventory_reservations where order_id=$1 and status='HELD' order by product_id",[o.id])).rows;
     const count=Number((await c.query('select count(*) n from grooty_commerce.order_items where order_id=$1',[o.id])).rows[0].n);
     if(holds.length!==count)throw new HttpError(409,'Reservas inconsistentes.');
     await c.query("update grooty_commerce.inventory_reservations set status='CONSUMED' where order_id=$1",[o.id]);
     for(const h of holds){
       const result=await c.query('update public.products set stock=stock-$1,revision=revision+1,updated_at=now() where id=$2 and stock>=$1 returning id',[h.quantity,h.product_id]);
       if(!result.rows.length)throw new HttpError(409,'Inventario inconsistente.');
       await c.query("insert into grooty_commerce.inventory_movements(product_id,order_id,delta,reason) values($1,$2,$3,'sale')",[h.product_id,o.id,-h.quantity]);
     }
   }
   transition(o.status,payment.state);
   await c.query('update grooty_commerce.orders set status=$2,updated_at=now() where id=$1',[o.id,payment.state]);
   await c.query('update grooty_commerce.payments set provider_id=$2,status=$3,updated_at=now() where order_id=$1',[o.id,payment.providerId,payment.state]);
   await c.query('insert into grooty_commerce.payment_events(order_id,provider,event_key,from_state,to_state) values($1,$2,$3,$4,$5)',[o.id,payment.provider,payment.eventKey,o.status,payment.state]);
   await c.query('insert into grooty_commerce.outbox(profile_id,kind,resource_id) values($1,$2,$3) on conflict do nothing',[o.profile_id,'payment.'+payment.state.toLowerCase(),o.id]);
   return {duplicate:false,status:payment.state};
 });
}
