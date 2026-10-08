import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import http from 'node:http';
import {PGlite} from '@electric-sql/pglite';
import {TOTP,Secret} from 'otpauth';
import {generateKeyPair,exportJWK,createLocalJWKSet,SignJWT} from 'jose';
import {createHandler} from '../app.js';
import {commerceConfig} from '../commerce/config.js';
import {token,hash,cookieName} from '../lib/security.js';
import {createOrder,settlePayment,expireOrders} from '../commerce/orders.js';
import {verifyIdentity,finishIdentity} from '../commerce/identity.js';
import {encrypt,decrypt,enrollMfa,verifyMfa} from '../commerce/mfa.js';
import {verifyMpSignature,MockGateway,MercadoPagoGateway} from '../payments/gateway.js';
import {createHmac,randomBytes} from 'node:crypto';
let sql,db,server,base,cfg,sid,csrf,identity,profile,env;
before(async()=>{
 sql=new PGlite();db={query:(s,p)=>sql.query(s,p),connect:async()=>({...db,release(){}})};
 await sql.exec('create role anon;create role authenticated;');
 for(const f of ['../../supabase/schema.sql','../../supabase/admin.sql','../database/003_commerce.sql','../database/004_admin_approvals.sql','../../supabase/seed-catalog.sql'])await sql.exec((await readFile(new URL(f,import.meta.url),'utf8')).replace('create extension if not exists pgcrypto;',''));
 server=http.createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;
 env={AUTH_ADMIN_ONLY:'false',NODE_ENV:'development',APP_ORIGIN:base,DATABASE_URL:'test',AUTH_GOOGLE_ENABLED:'true',AUTH_MICROSOFT_ENABLED:'true',GOOGLE_CLIENT_ID:'google-test',GOOGLE_CLIENT_SECRET:'test',MICROSOFT_CLIENT_ID:'ms-test',MICROSOFT_CLIENT_SECRET:'test',MFA_ENCRYPTION_KEY:randomBytes(32).toString('base64'),PAYMENTS_ENABLED:'true',PAYMENT_PROVIDER:'mock',PAYMENT_ENVIRONMENT:'mock'};cfg=commerceConfig(env);
 server.on('request',createHandler({dbFactory:()=>db,env}));
 profile=(await sql.query('insert into grooty_commerce.profiles default values returning id')).rows[0].id;
 identity=(await sql.query("insert into grooty_commerce.user_identities(profile_id,provider,issuer,subject,email,verified_at) values($1,'google','https://accounts.google.com','test-sub','test@example.com',now()) returning id",[profile])).rows[0].id;
 sid=token();csrf=token();await sql.query("insert into grooty_commerce.sessions(token_hash,identity_id,csrf,expires_at,reauthenticated_at) values($1,$2,$3,now()+interval '1 hour',now())",[hash(sid),identity,csrf]);
});
after(async()=>{await new Promise(r=>server.close(r));await sql.close();});
const req=(path,method='GET',body,headers={})=>fetch(base+path,{method,headers:{Cookie:cookieName(cfg)+'='+sid,...(body?{'Content-Type':'application/json',Origin:base,'X-CSRF-Token':csrf}:{}),...headers},body:body?JSON.stringify(body):undefined,redirect:'manual'});
const address={name:'Test customer',phone:'999999999',line1:'Test address',district:'Test district',province:'Test province',department:'Test department'};
const orderInput=(id,quantity=1,key=token())=>({items:[{productId:id,quantity}],address,idempotencyKey:key});
test('migration keeps catalog; no candidate authorization; private RLS and financial journals',async()=>{
 assert.equal((await sql.query('select count(*) n from public.products')).rows[0].n,88);
 assert.equal((await sql.query('select count(*) n from grooty_commerce.admin_allowlist')).rows[0].n,0);
 await sql.exec('set role authenticated');try{await assert.rejects(sql.query('select * from grooty_commerce.orders'),/permission denied/);}finally{await sql.exec('reset role');}
 await sql.exec('set role grooty_app');try{
   await assert.rejects(sql.query("insert into grooty_commerce.admin_allowlist(email,provider,role) values('attacker@gmail.com','google','SUPER_ADMIN')"),/permission denied/);
   await assert.rejects(sql.query('delete from grooty_commerce.payment_events'),/permission denied/);
 }finally{await sql.exec('reset role');}
});
test('customer cannot reach admin; role injection, CSRF and BOLA fail',async()=>{
 assert.equal((await req('/api/admin/catalog')).status,403);
 assert.equal((await req('/api/account/profile','PUT',{displayName:'test',role:'SUPER_ADMIN'})).status,400);
 assert.equal((await req('/api/account/logout','POST',{}, {'X-CSRF-Token':'wrong'})).status,403);
 assert.equal((await req('/api/account/profile','PUT',{displayName:'x'},{Origin:'https://attacker.example'})).status,403);
 assert.equal((await req('/api/orders/00000000-0000-0000-0000-000000000001')).status,404);
});
test('unknown/zero stock, browser price and unpublished product cannot be ordered',async()=>{
 await assert.rejects(createOrder(db,profile,orderInput(101)),/disponibilidad/);
 const p=(await sql.query("select id from public.products where sale_type='venta' limit 1")).rows[0];
 await sql.query('update public.products set stock=0 where id=$1',[p.id]);await assert.rejects(createOrder(db,profile,orderInput(Number(p.id))),/Stock/);
 await assert.rejects(createOrder(db,profile,{...orderInput(Number(p.id)),price:1}),/Campos/);
 await sql.query('update public.products set stock=2,published=false where id=$1',[p.id]);await assert.rejects(createOrder(db,profile,orderInput(Number(p.id))),/disponibilidad/);
 await sql.query('update public.products set published=true where id=$1',[p.id]);
});
test('order authoritative cents, idempotent replay, stock held, duplicate payment consumes once',async()=>{
 const p=(await sql.query("select id,price from public.products where sale_type='venta' and stock=2 limit 1")).rows[0];
 const input=orderInput(Number(p.id),2),created=await createOrder(db,profile,input),id=created.order.id;
 assert.equal(Number(created.order.total_cents),Math.round(Number(p.price)*100)*2);
 assert.equal((await createOrder(db,profile,input)).order.id,id);
 await assert.rejects(createOrder(db,profile,{...input,items:[{productId:Number(p.id),quantity:1}]}),/clave/);
 await assert.rejects(createOrder(db,profile,orderInput(Number(p.id))),/Stock/);
 await sql.query("insert into grooty_commerce.payments(order_id,provider,environment,amount_cents) values($1,'mock','mock',$2)",[id,created.order.total_cents]);
 const payment={orderId:id,provider:'mock',environment:'mock',providerId:'test-payment',amountCents:Number(created.order.total_cents),currency:'PEN',state:'PAID',eventKey:'test-payment:approved'};
 await assert.rejects(settlePayment(db,{...payment,amountCents:1}),/corresponde/);
 assert.equal((await settlePayment(db,payment)).status,'PAID');assert.equal((await settlePayment(db,payment)).duplicate,true);
 assert.equal((await sql.query('select stock from public.products where id=$1',[p.id])).rows[0].stock,0);
 assert.equal(Number((await sql.query('select count(*) n from grooty_commerce.inventory_movements where order_id=$1',[id])).rows[0].n),1);
 // URL status parameters never mutate payment or inventory.
 const response=await req('/api/orders/'+id+'?status=approved');assert.equal((await response.json()).order.status,'PAID');
});
test('expiry releases holds; late payment cannot steal inventory; promotion sets server expiry',async()=>{
 const p=(await sql.query("select id from public.products where sale_type='venta' and stock is null limit 1")).rows[0];await sql.query('update public.products set stock=1 where id=$1',[p.id]);
 await sql.query("insert into grooty_commerce.promotions(product_id,unit_cents,starts_at,ends_at,active) values($1,100,now()-interval '1 hour',now()+interval '2 minutes',true)",[p.id]);
 const {order}=await createOrder(db,profile,orderInput(Number(p.id)));assert.equal(Number(order.total_cents),100);
 await sql.query("update grooty_commerce.orders set expires_at=now()-interval '1 minute' where id=$1",[order.id]);
 await sql.query("insert into grooty_commerce.payments(order_id,provider,environment,amount_cents) values($1,'mock','mock',100)",[order.id]);
 await assert.rejects(settlePayment(db,{orderId:order.id,provider:'mock',environment:'mock',providerId:'late',amountCents:100,currency:'PEN',state:'PAID',eventKey:'late'}),/tardío/);
 assert.equal((await expireOrders(db)).expired,1);
 assert.equal((await sql.query('select stock from public.products where id=$1',[p.id])).rows[0].stock,1);
});
test('MFA encrypted with identity binding; required for admin and TOTP replay denied',async()=>{
 await sql.query("insert into grooty_commerce.admin_allowlist(email,provider,identity_id,role,status,activated_at) values('test@example.com','google',$1,'SUPER_ADMIN','ACTIVE',now())",[identity]);
 assert.equal((await req('/api/admin/catalog')).status,403);
 const s={identity_id:identity,profile_id:profile,email:'test@example.com',role:'SUPER_ADMIN',token_hash:hash(sid),reauthenticated_at:new Date()};
 const enrolled=await enrollMfa(db,cfg,s),otp=new TOTP({issuer:'Grooty Store',label:s.email,secret:Secret.fromBase32(enrolled.secret),digits:6,period:30});
 const cipher=encrypt(enrolled.secret,cfg,identity);assert.equal(decrypt(cipher,cfg,identity),enrolled.secret);assert.throws(()=>decrypt(cipher,cfg,'other-identity'));
 await verifyMfa(db,cfg,s,otp.generate());await assert.rejects(verifyMfa(db,cfg,s,otp.generate()),/utilizado/);
 assert.equal((await req('/api/admin/catalog')).status,200);
 assert.equal((await req('/api/account/deletion-request','POST',{})).status,409);
 await assert.rejects(sql.query("update grooty_commerce.admin_allowlist set status='REVOKED' where identity_id=$1",[identity]),/last SUPER_ADMIN/);
});
test('official signed JWT validation for Google/Microsoft: no unverified email or issuer/tenant bypass',async()=>{
 const {privateKey,publicKey}=await generateKeyPair('RS256'),jwk=await exportJWK(publicKey),keys=createLocalJWKSet({keys:[{...jwk,kid:'test',alg:'RS256'}]}),nonce=token(),tid='9188040d-6c67-4c5b-b112-36a304b66dad';
 const mint=(provider,data={},aud=provider==='google'?'google-test':'ms-test',exp='2m')=>new SignJWT({nonce,email:'same@example.com',...(provider==='google'?{email_verified:true}:{xms_edov:true,tid}),...data}).setProtectedHeader({alg:'RS256',kid:'test'}).setIssuer(provider==='google'?'https://accounts.google.com':`https://login.microsoftonline.com/${tid}/v2.0`).setSubject('stable-sub').setAudience(aud).setIssuedAt().setExpirationTime(exp).sign(privateKey);
 for(const p of ['google','microsoft']){
   assert.equal((await verifyIdentity(await mint(p),cfg,p,nonce,keys)).email,'same@example.com');
   await assert.rejects(verifyIdentity(await mint(p),cfg,p,'wrong',keys));
   await assert.rejects(verifyIdentity(await mint(p,{},'attacker'),cfg,p,nonce,keys));
   await assert.rejects(verifyIdentity(await mint(p,{},undefined,'-1m'),cfg,p,nonce,keys));
 }
 await assert.rejects(verifyIdentity(await mint('google',{email_verified:false}),cfg,'google',nonce,keys));
 await assert.rejects(verifyIdentity(await mint('microsoft',{xms_edov:false}),cfg,'microsoft',nonce,keys));
 await assert.rejects(verifyIdentity(await mint('microsoft',{tid:'00000000-0000-0000-0000-000000000000'}),cfg,'microsoft',nonce,keys));
});
test('OAuth same email creates separate profiles; state bound to browser and single use',async()=>{
 for(const provider of ['google','microsoft']){
  const state=token(),browser=token(),nonce=token();await sql.query("insert into grooty_commerce.oauth_attempts values($1,$2,$3,$4,$5,now()+interval '5 minutes')",[hash(state),hash(browser),provider,token(),nonce]);
  const req={headers:{cookie:cookieName(cfg,'oauth')+'='+browser}},res={setHeader(){},writeHead(){},end(){}},url=new URL(base+'/api/auth/'+provider+'/callback?state='+state+'&code=test');
  const verify=async()=>({provider,issuer:provider==='google'?'https://accounts.google.com':'https://login.microsoftonline.com/personal/v2.0',subject:'separate-test',email:'same@example.com'}),fetcher=async()=>({ok:true,json:async()=>({id_token:'test-only'})});
  await assert.rejects(finishIdentity(db,cfg,{headers:{cookie:cookieName(cfg,'oauth')+'='+token()}},res,url,provider,verify,fetcher),/vencido/);
  await finishIdentity(db,cfg,req,res,url,provider,verify,fetcher);await assert.rejects(finishIdentity(db,cfg,req,res,url,provider,verify,fetcher),/vencido/);
 }
 const rows=(await sql.query("select profile_id from grooty_commerce.user_identities where email='same@example.com'")).rows;assert.equal(rows.length,2);assert.notEqual(rows[0].profile_id,rows[1].profile_id);
});
test('webhook HMAC freshness and body independent API verification; sandbox never reports a paid mock',async()=>{
 const ts=Math.floor(Date.now()/1000).toString(),u=new URL(base+'/api/payments/mercadopago/webhook?data.id=123'),secret='test-secret',requestId='request-test';
 const sig=createHmac('sha256',secret).update(`id:123;request-id:${requestId};ts:${ts};`).digest('hex'),r={headers:{'x-request-id':requestId,'x-signature':`ts=${ts},v1=${sig}`}};
 assert.equal(verifyMpSignature(r,u,secret),'123');assert.throws(()=>verifyMpSignature(r,u,'wrong'));assert.throws(()=>verifyMpSignature(r,u,secret,Date.now()+600000));
 assert.equal((await new MockGateway().createCheckout({id:token()})).url,null);
 const mp=new MercadoPagoGateway({...cfg,env:{MP_ACCESS_TOKEN:'test',MP_COLLECTOR_ID:'99'}},async()=>({ok:true,json:async()=>({id:123,collector_id:99,currency_id:'PEN',live_mode:true})}));await assert.rejects(mp.retrievePayment('123'),/entorno/);
 assert.throws(()=>commerceConfig({...env,PAYMENT_ENVIRONMENT:'production'}),/certificación/);
});

test('admin-only OAuth denies unapproved identities without persisting profile or session; approved identity may log in',async()=>{
 const restricted=commerceConfig({...env,AUTH_ADMIN_ONLY:'true'});
 for(const approved of [false,true]){
  const state=token(),browser=token();await sql.query("insert into grooty_commerce.oauth_attempts values($1,$2,'google',$3,$4,now()+interval '5 minutes')",[hash(state),hash(browser),token(),token()]);
  const req={headers:{cookie:cookieName(cfg,'oauth')+'='+browser}},res={setHeader(){},writeHead(status){this.status=status;},end(){}},url=new URL(base+'/api/auth/google/callback?state='+state+'&code=test');
  const verify=async()=>({provider:'google',issuer:'https://accounts.google.com',subject:approved?'test-sub':'unapproved-admin-only',email:approved?'test@example.com':'unapproved@example.test'}),fetcher=async()=>({ok:true,json:async()=>({id_token:'test-only'})});
  if(approved){await finishIdentity(db,restricted,req,res,url,'google',verify,fetcher);assert.equal(res.status,303);}
  else {const count=(await sql.query('select count(*) n from grooty_commerce.sessions')).rows[0].n;await assert.rejects(finishIdentity(db,restricted,req,res,url,'google',verify,fetcher),/no está autorizada/);assert.equal((await sql.query('select count(*) n from grooty_commerce.sessions')).rows[0].n,count);assert.equal((await sql.query("select count(*) n from grooty_commerce.user_identities where subject='unapproved-admin-only'")).rows[0].n,0);}
 }
});
