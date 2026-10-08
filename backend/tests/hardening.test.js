import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import fc from 'fast-check';
import {approveAdmins,approvalsInput} from '../scripts/approve-admins.js';
import {validateIngress,clientBucket,localAdmission,enforceIngress} from '../commerce/ingress.js';
import {createHandler} from '../app.js';
import {readJson,cookies} from '../lib/security.js';
import {commerceConfig} from '../commerce/config.js';
let sql,db;
before(async()=>{
 sql=new PGlite();db={query:(s,p)=>sql.query(s,p),connect:async()=>({...db,release(){}})};
 await sql.exec('create role anon;create role authenticated;');
 for(const f of ['../../supabase/schema.sql','../../supabase/admin.sql','../database/003_commerce.sql','../database/004_admin_approvals.sql'])await sql.exec((await readFile(new URL(f,import.meta.url),'utf8')).replace('create extension if not exists pgcrypto;',''));
});
after(()=>sql.close());
const identity=async(provider,email,subject)=>{
 const p=(await sql.query('insert into grooty_commerce.profiles default values returning id')).rows[0];
 return (await sql.query('insert into grooty_commerce.user_identities(profile_id,provider,issuer,subject,email,verified_at) values($1,$2,$3,$4,$5,now()) returning id',[p.id,provider,'test-issuer',subject,email])).rows[0].id;
};
test('private owner approval binds correct verified provider/identity; no email-only cross-provider grant',async()=>{
 const approvedEmail='owner-approved@example.test';await approveAdmins(db,[{email:approvedEmail,provider:'google',role:'ADMIN'}]);
 const wrong=await identity('microsoft',approvedEmail,'wrong-provider');await sql.query('select grooty_commerce.bind_approved_identity($1)',[wrong]);
 assert.equal((await sql.query('select status from grooty_commerce.admin_allowlist where email=$1',[approvedEmail])).rows[0].status,'PENDING');
 const right=await identity('google',approvedEmail,'right-provider');
 await sql.exec('set role grooty_app');try{await sql.query('select grooty_commerce.bind_approved_identity($1)',[right]);}finally{await sql.exec('reset role');}
 const a=(await sql.query('select * from grooty_commerce.admin_allowlist where email=$1',[approvedEmail])).rows[0];assert.equal(a.identity_id,right);assert.equal(a.status,'ACTIVE');assert.equal(a.role,'ADMIN');
 await assert.rejects(approveAdmins(db,[{email:approvedEmail,provider:'google',role:'ADMIN'}]),/Ya existe/);
 assert.throws(()=>approvalsInput([{email:approvedEmail,provider:'google',role:'SUPER_ADMIN'}]));
});
test('revoked, expired and unapproved pending records cannot reactivate through login',async()=>{
 for(const [status,approved,expired] of [['REVOKED',true,false],['PENDING',true,true],['PENDING',false,false]]){
 const email=`test-${status}-${approved}-${expired}@example.test`.toLowerCase(),id=await identity('google',email,email);
 await sql.query("insert into grooty_commerce.admin_allowlist(email,provider,role,status,approved_at,approval_expires_at,approval_actor) values($1,'google','ADMIN',$2,$3,$4,'test-owner')",[email,status,approved?new Date():null,new Date(Date.now()+(expired?-60000:60000))]);
 await sql.query('select grooty_commerce.bind_approved_identity($1)',[id]);assert.equal((await sql.query('select identity_id from grooty_commerce.admin_allowlist where email=$1',[email])).rows[0].identity_id,null);
 }
});
test('ingress denies unknown routes, bad methods, ambiguous params, compressed/oversized payloads before DB',async()=>{
 for(const req of [
  {url:'/api/unknown',method:'GET',headers:{}},
  {url:'/api/admin/catalog',method:'DELETE',headers:{}},
  {url:'/api/auth/google/callback?state=a&state=b',method:'GET',headers:{}},
  {url:'/api/account/profile',method:'PUT',headers:{'content-type':'application/json','content-encoding':'gzip'}},
  {url:'/api/account/profile',method:'PUT',headers:{'content-type':'application/json','content-length':'999999'}}
 ])assert.throws(()=>validateIngress(req));
 const handler=createHandler({dbFactory:()=>{throw Error('must not query');},env:{NODE_ENV:'development'}}),response={setHeader(){},end(body){this.body=JSON.parse(body);}};
 await handler({url:'/api/.env',method:'GET',headers:{}},response);assert.equal(response.statusCode,404);
});
test('trusted IP boundary ignores spoofed forwarded headers on non-Vercel; missing production key fails closed',()=>{
 const cfg={env:{NODE_ENV:'development',RATE_LIMIT_KEY_SECRET:'x'.repeat(32)}},req={socket:{remoteAddress:'127.0.0.1'},headers:{'x-vercel-forwarded-for':'8.8.8.8','x-forwarded-for':'1.1.1.1'}};
 assert.equal(clientBucket(req,cfg),clientBucket({...req,headers:{}},cfg));
 assert.throws(()=>clientBucket(req,{env:{NODE_ENV:'production'}}));
 assert.equal(clientBucket(req,{env:{...cfg.env,VERCEL:'1'}}),clientBucket({...req,headers:{'x-vercel-forwarded-for':'8.8.8.8'}},{env:{...cfg.env,VERCEL:'1'}}));
});
test('bounded admission drops burst/concurrency before database; release is idempotent; timed recovery',()=>{
 let now=0;const admit=localAdmission({clock:()=>now,maxConcurrent:2,maxBurst:3,maxKeys:2,windowMs:1000});
 const a=admit('a'),b=admit('b');assert.throws(()=>admit('c'),/ocupado/);a();a();const c=admit('a');c();const d=admit('a');d();assert.throws(()=>admit('a'),/solicitudes/);b();now=1001;admit('a')();
});
test('distributed admission is shared across separate requests; changing arbitrary headers does not bypass quota',async()=>{
 const cfg={env:{NODE_ENV:'development',RATE_LIMIT_KEY_SECRET:'test'.repeat(8)}},req={socket:{remoteAddress:'127.0.0.2'},headers:{}};
 for(let i=0;i<30;i++)await enforceIngress(db,req,cfg,'/api/auth/google/start');
 await assert.rejects(enforceIngress(db,{...req,headers:{'x-forwarded-for':'attacker-controlled'}},cfg,'/api/auth/microsoft/start'),/Demasiadas/);
});
test('1200 distinct generated request lengths/query injection attempts remain bounded',()=>{
 const seen=new Set();fc.assert(fc.property(fc.noBias(fc.integer({min:65537,max:999999999})),fc.string({minLength:1,maxLength:20}),(size,q)=>{
 seen.add(size+':'+q);assert.throws(()=>validateIngress({url:'/api/orders',method:'POST',headers:{'content-type':'application/json','content-length':String(size)}}));
 assert.throws(()=>validateIngress({url:'/api/auth/google/callback?state='+encodeURIComponent(q)+'&state=other',method:'GET',headers:{}}));
 }),{seed:2001,numRuns:1200});assert.ok(seen.size>=1150);console.log('Distinct new ingress cases:',seen.size);
});
test('JSON structure and cookie ambiguity rejected before processing credentials or mutable fields',async()=>{
 const request=body=>({headers:{'content-type':'application/json'},body});
 for(const body of ['{"__proto__":{"admin":true}}','{"constructor":{"prototype":{"admin":true}}}',JSON.stringify({items:Array(2100).fill(1)}),'[1,2]'])await assert.rejects(readJson(request(body)),/JSON/);
 let nested={};for(let i=0;i<20;i++)nested={child:nested};await assert.rejects(readJson(request(JSON.stringify(nested))),/complejo/);
 assert.deepEqual(await readJson(request('{"items":[{"id":1,"quantity":2}]}')),{items:[{id:1,quantity:2}]});
 assert.throws(()=>cookies({headers:{cookie:'grooty_session=a; grooty_session=b'}}),/ambigua/);
 assert.equal(cookies({headers:{cookie:'grooty_session=a'}}).grooty_session,'a');assert.equal({}.admin,undefined);
});
test('payment provider/environment pairs fail closed; production stays locked without financial certification',()=>{
 const env={NODE_ENV:'development',PAYMENTS_ENABLED:'true',MP_ACCESS_TOKEN:'test',MP_WEBHOOK_SECRET:'test',MP_COLLECTOR_ID:'1'};
 for(const [provider,environment] of [['mock','sandbox'],['mercadopago','mock'],['mercadopago','production'],['culqi','sandbox']])assert.throws(()=>commerceConfig({...env,PAYMENT_PROVIDER:provider,PAYMENT_ENVIRONMENT:environment}));
 assert.equal(commerceConfig({...env,PAYMENT_PROVIDER:'mercadopago',PAYMENT_ENVIRONMENT:'sandbox'}).provider,'mercadopago');
 assert.equal(commerceConfig({...env,PAYMENT_PROVIDER:'mock',PAYMENT_ENVIRONMENT:'mock'}).paymentEnvironment,'mock');
});
