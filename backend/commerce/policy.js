import { HttpError } from '../lib/security.js';

export const STATES = Object.freeze({
  CREATED:['PENDING_PAYMENT','CANCELLED'],
  PENDING_PAYMENT:['PAID','PAYMENT_FAILED','PAYMENT_EXPIRED','CANCELLED'],
  PAYMENT_FAILED:['PENDING_PAYMENT','CANCELLED'],
  PAYMENT_EXPIRED:['CANCELLED'],
  PAID:['PROCESSING','REFUND_PENDING','CHARGEBACK'],
  PROCESSING:['SHIPPED','REFUND_PENDING','CHARGEBACK'],
  SHIPPED:['DELIVERED','REFUND_PENDING','CHARGEBACK'],
  DELIVERED:['REFUND_PENDING','CHARGEBACK'],
  REFUND_PENDING:['PARTIALLY_REFUNDED','REFUNDED','CHARGEBACK'],
  PARTIALLY_REFUNDED:['REFUND_PENDING','REFUNDED','CHARGEBACK'],
  REFUNDED:[], CHARGEBACK:[], CANCELLED:[]
});
export function transition(from,to){
  if(from===to)return false;
  if(!STATES[from]?.includes(to))throw new HttpError(409,'Transición de pedido no permitida.');
  return true;
}
// PostgreSQL numeric is read as text. Do not round browser prices or floating point sums.
export function cents(value){
  if(typeof value!=='string'||!/^\d{1,8}(?:\.\d{1,2})?$/.test(value))throw new HttpError(400,'Importe monetario inválido.');
  const [whole,fraction='']=value.split('.');
  return Number(BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0')));
}
export function cartInput(body){
  if(!body||Object.getPrototypeOf(body)!==Object.prototype||Object.keys(body).some(k=>!['items','address','idempotencyKey'].includes(k)))throw new HttpError(400,'Campos de checkout inválidos.');
  if(typeof body.idempotencyKey!=='string'||!/^[a-zA-Z0-9_-]{16,80}$/.test(body.idempotencyKey))throw new HttpError(400,'Clave de operación inválida.');
  if(!Array.isArray(body.items)||body.items.length<1||body.items.length>30)throw new HttpError(400,'Carrito inválido.');
  const seen=new Set();
  const items=body.items.map(i=>{
    if(!i||Object.keys(i).sort().join(',')!=='productId,quantity'||!Number.isSafeInteger(i.productId)||i.productId<1||!Number.isInteger(i.quantity)||i.quantity<1||i.quantity>20||seen.has(i.productId))throw new HttpError(400,'Línea de carrito inválida.');
    seen.add(i.productId);return {productId:i.productId,quantity:i.quantity};
  }).sort((a,b)=>a.productId-b.productId);
  const a=body.address;
  if(!a||typeof a!=='object'||Array.isArray(a)||Object.keys(a).some(k=>!['name','phone','line1','district','province','department','postalCode'].includes(k)))throw new HttpError(400,'Dirección inválida.');
  const address={};
  for(const k of ['name','phone','line1','district','province','department','postalCode']){
    const v=a[k]??'';if(typeof v!=='string'||v.length>180||/[\u0000-\u001f]/u.test(v)||(!v.trim()&&k!=='postalCode'))throw new HttpError(400,'Completa los datos de entrega.');address[k]=v.trim();
  }
  if(!/^\+?[0-9 ()-]{7,22}$/.test(address.phone))throw new HttpError(400,'Teléfono inválido.');
  return {items,address,idempotencyKey:body.idempotencyKey};
}
const permissions={
  CUSTOMER:[],CATALOG_MANAGER:['catalog.read','catalog.write'],
  ORDER_MANAGER:['orders.read','orders.fulfill','requests.manage'],
  ADMIN:['catalog.read','catalog.write','orders.read','orders.fulfill','requests.manage','dashboard.read'],
  SUPER_ADMIN:['catalog.read','catalog.write','orders.read','orders.fulfill','requests.manage','dashboard.read','roles.manage']
};
export function authorize(session,permission,{critical=false,now=Date.now()}={}){
  if(!permissions[session?.role]?.includes(permission))throw new HttpError(403,'Permiso insuficiente.');
  if(!session.mfa_at||now-new Date(session.mfa_at).getTime()>3600000)throw new HttpError(403,'Verifica tu segundo factor para administrar.');
  if(critical&&(!session.reauthenticated_at||now-new Date(session.reauthenticated_at).getTime()>300000))throw new HttpError(403,'Vuelve a autenticarte para esta operación.');
}
