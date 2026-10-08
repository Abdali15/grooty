import { database,transaction } from './lib/db.js';
import { HttpError,readJson,verifyWrite,cookie,equal } from './lib/security.js';
import { limit,audit } from './lib/auth.js';
import { catalog,saveProduct,archiveProduct,saveBrand,saveSettings } from './lib/catalog.js';
import { commerceConfig } from './commerce/config.js';
import { beginIdentity,finishIdentity,commerceSession } from './commerce/identity.js';
import { enrollMfa,verifyMfa } from './commerce/mfa.js';
import { authorize,transition } from './commerce/policy.js';
import { createOrder,ownOrder,expireOrders,settlePayment } from './commerce/orders.js';
import { gateway,verifyMpSignature } from './payments/gateway.js';
import { customRequest,reservePreorder,preorderAvailable,preorderOrder } from './commerce/requests.js';
export function createHandler({dbFactory=database,env=process.env}={}){
 return async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  const json=(status,value)=>{res.statusCode=status;res.end(JSON.stringify(value));};let path='';
  try{
   const url=new URL(req.url,'http://local.invalid');path=url.pathname;const method=req.method;
   if(path==='/api/health'&&method==='GET')return json(200,{ok:true,version:'3.0'});
   if(path==='/api/store/catalog'&&method==='GET')return json(200,await catalog(dbFactory()));
   const cfg=commerceConfig(env);
   if(path==='/api/auth/config'&&method==='GET')return json(200,{google:cfg.flags.AUTH_GOOGLE_ENABLED,microsoft:cfg.flags.AUTH_MICROSOFT_ENABLED,payments:cfg.flags.PAYMENTS_ENABLED,paymentEnvironment:cfg.paymentEnvironment,preorders:cfg.flags.PREORDERS_ENABLED,customRequests:cfg.flags.CUSTOM_REQUESTS_ENABLED});
   const oauth=path.match(/^\/api\/auth\/(google|microsoft)\/(start|callback)$/);
   if(oauth){const db=dbFactory();return oauth[2]==='start'?await beginIdentity(db,cfg,req,res,oauth[1]):await finishIdentity(db,cfg,req,res,url,oauth[1]);}
   const db=dbFactory();
   if(path==='/api/payments/mercadopago/webhook'&&method==='POST'){
    if(!cfg.flags.PAYMENTS_ENABLED||cfg.provider!=='mercadopago')throw new HttpError(503,'Pagos desactivados.');
    const id=verifyMpSignature(req,url,env.MP_WEBHOOK_SECRET);await limit(db,'payment-webhook',300,60);return json(200,await settlePayment(db,await gateway(cfg).retrievePayment(id)));
   }
   if(path==='/api/jobs/expire'&&method==='POST'){
    if(!env.CRON_SECRET||!equal(req.headers.authorization,'Bearer '+env.CRON_SECRET))throw new HttpError(401,'No autorizado.');return json(200,await expireOrders(db));
   }
   const s=await commerceSession(db,cfg,req);await limit(db,'account:'+s.identity_id,180,60);
   if(path==='/api/account/session'&&method==='GET')return json(200,{user:{email:s.email,role:s.role,provider:s.provider},csrf:s.csrf,mfaEnrolled:s.mfa_enrolled,mfaVerified:Boolean(s.mfa_at&&Date.now()-new Date(s.mfa_at)<3600000)});
   if(path==='/api/account/orders'&&method==='GET')return json(200,{orders:(await db.query('select id,status,total_cents,currency,created_at from grooty_commerce.orders where profile_id=$1 order by created_at desc limit 50',[s.profile_id])).rows});
   if(path==='/api/account/requests'&&method==='GET')return json(200,{requests:(await db.query('select id,details,status,quote_cents,quote_expires_at from grooty_commerce.custom_figure_requests where profile_id=$1 order by created_at desc limit 50',[s.profile_id])).rows});
   if(path==='/api/account/preorders'&&method==='GET')return json(200,{preorders:(await db.query('select id,product_id,quantity,status,pay_by from grooty_commerce.preorders where profile_id=$1 order by created_at desc limit 50',[s.profile_id])).rows});
   const own=path.match(/^\/api\/orders\/([0-9a-f-]{36})$/);if(own&&method==='GET')return json(200,await ownOrder(db,s.profile_id,own[1]));
   if(path.startsWith('/api/admin/')){
    if(path==='/api/admin/session'&&method==='GET'){authorize(s,'catalog.read');return json(200,{user:{email:s.email,role:s.role},csrf:s.csrf});}
    if(path==='/api/admin/catalog'&&method==='GET'){authorize(s,'catalog.read');return json(200,await catalog(db,true));}
    if(path==='/api/admin/orders'&&method==='GET'){authorize(s,'orders.read');return json(200,{orders:(await db.query('select id,status,total_cents,currency,created_at from grooty_commerce.orders order by created_at desc limit 100')).rows});}
    if(path==='/api/admin/requests'&&method==='GET'){authorize(s,'requests.manage');return json(200,{requests:(await db.query('select id,details,status,quote_cents,quote_expires_at from grooty_commerce.custom_figure_requests order by created_at desc limit 100')).rows});}
    if(path==='/api/admin/identities'&&method==='GET'){authorize(s,'roles.manage',{critical:true});return json(200,{identities:(await db.query('select i.id,i.email,i.provider,coalesce(a.role,\'CUSTOMER\') role,a.status from grooty_commerce.user_identities i left join grooty_commerce.admin_allowlist a on a.identity_id=i.id order by i.verified_at desc limit 100')).rows});}
    if(path==='/api/admin/dashboard'&&method==='GET'){authorize(s,'dashboard.read');return json(200,(await db.query("select count(*) filter(where status='PENDING_PAYMENT') pending_orders,coalesce(sum(total_cents) filter(where status in ('PAID','PROCESSING','SHIPPED','DELIVERED')),0) collected_cents,count(*) filter(where status='PAYMENT_FAILED') failed_payments from grooty_commerce.orders")).rows[0]);}
   }
   if(!['POST','PUT','PATCH'].includes(method))throw new HttpError(404,'Ruta no encontrada.');
   verifyWrite(req,cfg,s.csrf);const body=await readJson(req);
   if(['/api/account/logout','/api/admin/logout','/api/account/revoke-sessions'].includes(path)&&method==='POST'){
    const all=path==='/api/account/revoke-sessions';await db.query(all?'delete from grooty_commerce.sessions where identity_id=$1':'delete from grooty_commerce.sessions where token_hash=$1',[all?s.identity_id:s.token_hash]);res.setHeader('Set-Cookie',cookie(cfg,'session','',0));return json(200,{ok:true});
   }
   if(path==='/api/account/mfa/enroll'&&method==='POST')return json(200,await enrollMfa(db,cfg,s));
   if(path==='/api/account/mfa/verify'&&method==='POST')return json(200,await verifyMfa(db,cfg,s,body.code));
   if(path==='/api/requests'&&method==='POST'){if(!cfg.flags.CUSTOM_REQUESTS_ENABLED)throw new HttpError(503,'Solicitudes online desactivadas.');await limit(db,'requests:'+s.profile_id,10,3600);return json(201,await customRequest(db,s,body));}
   if(path==='/api/preorders'&&method==='POST'){if(!cfg.flags.PREORDERS_ENABLED)throw new HttpError(503,'Reservas online desactivadas.');return json(201,await reservePreorder(db,s,body));}
   const reservePayment=path.match(/^\/api\/preorders\/([0-9a-f-]{36})\/order$/);
   if(reservePayment&&method==='POST'){if(!cfg.flags.PREORDERS_ENABLED||!cfg.flags.PAYMENTS_ENABLED)throw new HttpError(503,'Pago de reservas desactivado.');return json(201,await preorderOrder(db,s,reservePayment[1],body));}
   const arrival=path.match(/^\/api\/admin\/preorders\/([0-9a-f-]{36})\/available$/);
   if(arrival&&method==='POST'){authorize(s,'orders.fulfill');if(!cfg.flags.PREORDERS_ENABLED)throw new HttpError(503,'Reservas desactivadas.');return json(200,await preorderAvailable(db,s,arrival[1]));}
   const quote=path.match(/^\/api\/admin\/requests\/([0-9a-f-]{36})\/quote$/);
   if(quote&&method==='POST'){
    authorize(s,'requests.manage');if(!Number.isSafeInteger(body.quoteCents)||body.quoteCents<1||body.quoteCents>9999999999)throw new HttpError(400,'Cotización inválida.');
    const r=await db.query("update grooty_commerce.custom_figure_requests set status='QUOTED',quote_cents=$2,quote_expires_at=now()+interval '7 days' where id=$1 and status in ('SUBMITTED','REVIEWING') returning id",[quote[1],body.quoteCents]);if(!r.rows.length)throw new HttpError(409,'Solicitud no cotizable.');await audit(db,s.profile_id,'request.quote',quote[1]);return json(200,{ok:true});
   }
   if(path==='/api/account/profile'&&method==='PUT'){
    if(Object.keys(body).join(',')!=='displayName'||typeof body.displayName!=='string'||body.displayName.length>120)throw new HttpError(400,'Perfil inválido.');await db.query('update grooty_commerce.profiles set display_name=$2 where id=$1',[s.profile_id,body.displayName.trim()]);return json(200,{ok:true});
   }
   if(path==='/api/account/deletion-request'&&method==='POST'){
    if(s.role!=='CUSTOMER')throw new HttpError(409,'Retira primero la autorización administrativa mediante otro propietario.');
    await transaction(db,async c=>{await c.query('update grooty_commerce.profiles set deletion_requested_at=now() where id=$1',[s.profile_id]);await audit(c,s.profile_id,'account.deletion_requested',s.profile_id);await c.query('delete from grooty_commerce.sessions where identity_id=$1',[s.identity_id]);});res.setHeader('Set-Cookie',cookie(cfg,'session','',0));return json(202,{requested:true});
   }
   if(path==='/api/orders'&&method==='POST'){
    if(!cfg.flags.PAYMENTS_ENABLED)throw new HttpError(503,'Las compras online aún no están habilitadas.');return json(201,await createOrder(db,s.profile_id,body));
   }
   const checkout=path.match(/^\/api\/orders\/([0-9a-f-]{36})\/checkout$/);
   if(checkout&&method==='POST'){
    if(!cfg.flags.PAYMENTS_ENABLED)throw new HttpError(503,'Pagos desactivados.');const {order,items}=await ownOrder(db,s.profile_id,checkout[1]);
    const valid=(await db.query("select status='PENDING_PAYMENT' and expires_at>now() valid from grooty_commerce.orders where id=$1",[order.id])).rows[0].valid;if(!valid)throw new HttpError(409,'Pedido vencido o ya procesado.');
    const value=await gateway(cfg).createCheckout(order,items);
    await db.query('insert into grooty_commerce.payments(order_id,provider,environment,preference_id,amount_cents) values($1,$2,$3,$4,$5) on conflict(order_id) do nothing',[order.id,cfg.provider,cfg.paymentEnvironment,value.id,order.total_cents]);return json(200,value);
   }
   if(path==='/api/admin/authorizations'&&method==='POST'){
    authorize(s,'roles.manage',{critical:true});if(!/^[0-9a-f-]{36}$/.test(body.identityId||'')||!['ACTIVE','REVOKED'].includes(body.status)||!['CATALOG_MANAGER','ORDER_MANAGER','ADMIN','SUPER_ADMIN'].includes(body.role))throw new HttpError(400,'Autorización inválida.');await db.query('select grooty_commerce.change_authorization($1,$2,$3,$4)',[s.token_hash,body.identityId,body.role,body.status]);return json(200,{ok:true});
   }
   const fulfillment=path.match(/^\/api\/admin\/orders\/([0-9a-f-]{36})$/);
   if(fulfillment&&method==='PATCH'){
    authorize(s,'orders.fulfill');if(!['PROCESSING','SHIPPED','DELIVERED'].includes(body.status))throw new HttpError(400,'Estado inválido.');
    await transaction(db,async c=>{const o=(await c.query('select status from grooty_commerce.orders where id=$1 for update',[fulfillment[1]])).rows[0];if(!o)throw new HttpError(404,'Pedido no encontrado.');transition(o.status,body.status);await c.query('update grooty_commerce.orders set status=$2,updated_at=now() where id=$1',[fulfillment[1],body.status]);await audit(c,s.profile_id,'order.fulfill',fulfillment[1],{state:body.status});});return json(200,{ok:true});
   }
   if(path.startsWith('/api/admin/')){
    authorize(s,'catalog.write');if(path==='/api/admin/products'&&method==='POST')return json(201,await saveProduct(db,s.profile_id,body));
    const product=path.match(/^\/api\/admin\/products\/([1-9]\d{0,14})$/);
    if(product&&method==='PUT')return json(200,await saveProduct(db,s.profile_id,body,Number(product[1])));
    if(product&&method==='PATCH')return json(200,await archiveProduct(db,s.profile_id,Number(product[1]),body));
    if(path==='/api/admin/brands'&&method==='POST')return json(201,await saveBrand(db,s.profile_id,body));
    if(path==='/api/admin/settings'&&method==='PUT')return json(200,await saveSettings(db,s.profile_id,body));
   }
   throw new HttpError(404,'Ruta no encontrada.');
  }catch(e){
   const status=e.code==='23505'?409:e.status||500;if(/\/callback$/.test(path)){res.writeHead(303,{Location:'/cuenta?auth_error=retry'});return res.end();}
   if(status>=500)console.error('Grooty API failure',{code:e.code||'internal'});return json(status,{error:status>=500?'Servicio pendiente de configuración o temporalmente no disponible.':e.message});
  }
 };
}
export default createHandler();
