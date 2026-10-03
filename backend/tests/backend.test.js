import { test,before,after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import { PGlite } from '@electric-sql/pglite';
import { generateKeyPair,SignJWT,createLocalJWKSet,exportJWK } from 'jose';
import { createHandler } from '../app.js';
import { googleToken,finishGoogle } from '../lib/auth.js';
import { token,hash,cookieName,config,challenge } from '../lib/security.js';
import { catalog } from '../lib/catalog.js';
let sql,db,server,base,cfg,sid,csrf,env;
before(async()=>{
  sql=new PGlite();db={query:(s,p)=>sql.query(s,p),connect:async()=>({...db,release(){}})};
  await sql.exec('create role anon; create role authenticated;');
  const schema=await readFile(new URL('../../supabase/schema.sql',import.meta.url),'utf8');
  await sql.exec(schema.replace('create extension if not exists pgcrypto;',''));
  await sql.exec(await readFile(new URL('../../supabase/admin.sql',import.meta.url),'utf8'));
  await sql.exec(await readFile(new URL('../../supabase/seed-catalog.sql',import.meta.url),'utf8'));
  server=http.createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;
  env={NODE_ENV:'development',APP_ORIGIN:base,ADMIN_ENABLED:'true',DATABASE_URL:'test',GOOGLE_CLIENT_ID:'client.apps.googleusercontent.com',GOOGLE_CLIENT_SECRET:'test-only'};cfg=config(env);
  server.on('request',createHandler({dbFactory:()=>db,env}));sid=token();csrf=token();
  await sql.query("insert into grooty_private.admin_accounts(email,role,google_sub) values('allowed@gmail.com','owner','123')");
  await sql.query("insert into grooty_private.sessions(token_hash,email,csrf,expires_at) values($1,'allowed@gmail.com',$2,now()+interval '1 hour')",[hash(sid),csrf]);
});
after(async()=>{await new Promise(r=>server.close(r));await sql.close();});
const request=async(path,method='GET',body,extra={})=>fetch(base+path,{method,headers:{Cookie:`${cookieName(cfg)}=${sid}`,...(body!==undefined?{'Content-Type':'application/json','Origin':base,'X-CSRF-Token':csrf}:{}),...extra},body:body===undefined?undefined:JSON.stringify(body),redirect:'manual'});
test('schema + seed: 88 products, no administrative permissions for public roles',async()=>{
  const value=await catalog(db,true);assert.equal(value.products.length,88);assert.equal(value.brands.length,6);assert.equal(value.settings.settingsRevision,1);
  for(const role of ['anon','authenticated']){const q=await sql.query("select has_schema_privilege($1,'grooty_private','USAGE') allowed",[role]);assert.equal(q.rows[0].allowed,false);}
  await assert.rejects(sql.exec(await readFile(new URL('../../supabase/seed-catalog.sql',import.meta.url),'utf8')),/vacía/);await sql.exec('ROLLBACK');
});
test('private endpoints reject visitors and all writes need origin AND CSRF',async()=>{
  let r=await request('/api/admin/catalog','GET',undefined,{Cookie:''});assert.equal(r.status,401);
  r=await request('/api/admin/brands','POST',{name:'Brand'},{Origin:'https://attacker.example'});assert.equal(r.status,403);
  r=await request('/api/admin/brands','POST',{name:'Brand'},{'X-CSRF-Token':'invalid'});assert.equal(r.status,403);
  r=await request('/api/admin/products/101','PUT',{stock:9});assert.equal(r.status,400);
  r=await request('/api/admin/brands','POST',{name:'x'.repeat(70000)});assert.equal(r.status,413);
});
test('create/update/archive images and stock atomically; stale revision rejected; hidden excluded',async()=>{
  const p={...(await catalog(db,true)).products[0],id:999999,sku:'SAFE-TEST',titulo:"Figure '); DROP TABLE products; --",stock:3,published:false,archived:false,revision:0};
  let r=await request('/api/admin/products','POST',p);assert.equal(r.status,201);const created=(await r.json()).product;assert.notEqual(created.id,999999);assert.equal(created.revision,1);
  assert.equal((await catalog(db)).products.some(x=>x.id===created.id),false);
  r=await request('/api/admin/products/'+created.id,'PUT',{...created,stock:2,published:true});assert.equal(r.status,200);
  r=await request('/api/admin/products/'+created.id,'PUT',{...created,stock:999});assert.equal(r.status,409);
  r=await request('/api/admin/products/'+created.id,'PUT',{...created,id:101,revision:2});assert.equal(r.status,400);
  const current=(await catalog(db,true)).products.find(x=>x.id===created.id);assert.equal(current.stock,2);assert.equal(current.titulo,p.titulo);assert.equal(current.imagenes_producto.length,p.imagenes_producto.length);
  r=await request('/api/admin/products/'+created.id,'PATCH',{archived:true,revision:2});assert.equal(r.status,200);
  assert.equal((await catalog(db)).products.some(x=>x.id===created.id),false);
  r=await request('/api/admin/products','POST',{...p,imagenes_producto:[{url:'javascript:alert(1)'}]});assert.equal(r.status,400);
  const log=await sql.query("select count(*)::integer n from grooty_private.audit_log where entity=$1",[String(created.id)]);assert.equal(log.rows[0].n,3);
});
test('brand duplicate detection and storefront concurrency',async()=>{
  assert.equal((await request('/api/admin/brands','POST',{name:'Mafex'})).status,409);
  const s=(await catalog(db,true)).settings;
  assert.equal((await request('/api/admin/settings','PUT',{...s,whatsapp:'51936804577'})).status,200);
  assert.equal((await request('/api/admin/settings','PUT',s)).status,409);
  assert.equal((await request('/api/admin/settings','PUT',{...s,settingsRevision:2,heroIds:[999999]})).status,400);
});
test('Google JWT signature issuer audience expiry nonce verified Gmail',async()=>{
  const {privateKey,publicKey}=await generateKeyPair('RS256');const jwk=await exportJWK(publicKey);const jwks=createLocalJWKSet({keys:[{...jwk,kid:'test',alg:'RS256'}]});
  const nonce=token();const mint=(data={},aud=cfg.clientId,exp='2m')=>new SignJWT({email:'allowed@gmail.com',email_verified:true,nonce,...data}).setProtectedHeader({alg:'RS256',kid:'test'}).setSubject('123').setIssuer('https://accounts.google.com').setAudience(aud).setIssuedAt().setExpirationTime(exp).sign(privateKey);
  assert.equal((await googleToken(await mint(),cfg,nonce,jwks)).email,'allowed@gmail.com');
  await assert.rejects(googleToken(await mint(),cfg,'wrong',jwks));
  await assert.rejects(googleToken(await mint({email_verified:false}),cfg,nonce,jwks));
  await assert.rejects(googleToken(await mint({email:'allowed@other.com'}),cfg,nonce,jwks));
  await assert.rejects(googleToken(await mint({},'attacker'),cfg,nonce,jwks));
  await assert.rejects(googleToken(await mint({},cfg.clientId,'-1m'),cfg,nonce,jwks));
});
test('OAuth state must belong to browser; single use; unauthorized Gmail gets no session',async()=>{
  const state=token(),browser=token(),verifier=token(),nonce=token();await sql.query("insert into grooty_private.oauth_attempts values($1,$2,$3,$4,now()+interval '5 minutes')",[hash(state),hash(browser),verifier,nonce]);
  const url=new URL(base+'/api/auth/google/callback?state='+state+'&code=sample');const res={setHeader(){},writeHead(){},end(){}};
  await assert.rejects(finishGoogle(db,cfg,{headers:{cookie:`${cookieName(cfg,'oauth')}=${token()}`}},res,url),/vencido/);
  const savedFetch=globalThis.fetch;let sent;
  globalThis.fetch=async(u,o)=>{sent=o.body;return {ok:true,json:async()=>({id_token:'mock'})};};
  try{
    await assert.rejects(finishGoogle(db,cfg,{headers:{cookie:`${cookieName(cfg,'oauth')}=${browser}`}},res,url,async()=>({sub:'999',email:'unauthorized@gmail.com'})),/autorizada/);
    assert.equal(challenge(sent.get('code_verifier')),challenge(verifier));
    await assert.rejects(finishGoogle(db,cfg,{headers:{cookie:`${cookieName(cfg,'oauth')}=${browser}`}},res,url),/vencido/);
    assert.equal((await sql.query("select count(*)::integer n from grooty_private.sessions where email='unauthorized@gmail.com'")).rows[0].n,0);
  }finally{globalThis.fetch=savedFetch;}
});
test('permission revocation blocks existing session immediately',async()=>{
  await sql.query("update grooty_private.admin_accounts set active=false where email='allowed@gmail.com'");
  assert.equal((await request('/api/admin/session')).status,401);assert.equal((await request('/api/admin/brands','POST',{name:'Another'})).status,401);
});
test('disabled configuration rejects administration without opening database',async()=>{
  const disabled=http.createServer(createHandler({dbFactory:()=>{throw Error('DB must not open');},env:{...env,ADMIN_ENABLED:'false'}}));await new Promise(r=>disabled.listen(0,'127.0.0.1',r));
  try{const origin='http://127.0.0.1:'+disabled.address().port;const r=await fetch(origin+'/api/auth/google/start',{redirect:'manual'});assert.equal(r.status,503);}finally{await new Promise(r=>disabled.close(r));}
});
test('backend role cannot grant permissions or delete audit; session and RLS catalog work',async()=>{
  await sql.exec('set role grooty_app');
  try{
    assert.equal((await catalog(db,true)).products.length,89);
    await assert.rejects(sql.query("update grooty_private.admin_accounts set role='owner' where email='allowed@gmail.com'"),/permission denied/);
    await assert.rejects(sql.query('delete from grooty_private.audit_log'),/permission denied/);
  }finally{await sql.exec('reset role');}
});
test('OAuth authorized Gmail binds Google identity, sets HttpOnly cookie; logout revokes session',async()=>{
  await sql.query("insert into grooty_private.admin_accounts(email,role) values('second@gmail.com','admin')");
  const state=token(),browser=token(),verifier=token(),nonce=token();await sql.query("insert into grooty_private.oauth_attempts values($1,$2,$3,$4,now()+interval '5 minutes')",[hash(state),hash(browser),verifier,nonce]);
  const headers={};let destination;const res={setHeader(k,v){headers[k]=v;},writeHead(s,h){destination=h.Location;},end(){}};
  const originalFetch=globalThis.fetch;globalThis.fetch=async()=>({ok:true,json:async()=>({id_token:'signed-in-test'})});
  try{await finishGoogle(db,cfg,{headers:{cookie:`${cookieName(cfg,'oauth')}=${browser}`}},res,new URL(base+'/api/auth/google/callback?state='+state+'&code=sample'),async()=>({email:'second@gmail.com',sub:'google-456'}));}finally{globalThis.fetch=originalFetch;}
  assert.equal(destination,'/admin');const authCookie=headers['Set-Cookie'].find(c=>c.startsWith(cookieName(cfg)+'='));assert.match(authCookie,/HttpOnly; SameSite=Lax/);
  const oldSid=sid,oldCsrf=csrf;sid=authCookie.split(';')[0].split('=')[1];
  try{let r=await request('/api/admin/session');assert.equal(r.status,200);const value=await r.json();csrf=value.csrf;assert.equal(value.user.role,'admin');
    r=await request('/api/admin/logout','POST',{});assert.equal(r.status,200);assert.equal((await request('/api/admin/session')).status,401);
    assert.equal((await sql.query("select google_sub from grooty_private.admin_accounts where email='second@gmail.com'")).rows[0].google_sub,'google-456');
  }finally{sid=oldSid;csrf=oldCsrf;}
});
test('rate limit persisted across independent handler instances',async()=>{
  const {limit}=await import('../lib/auth.js');await limit(db,'test-limit',2,60);await limit(db,'test-limit',2,60);await assert.rejects(limit(db,'test-limit',2,60),e=>e.status===429);
});
test('failed photo insertion rolls back product and revision',async()=>{
  const {saveProduct}=await import('../lib/catalog.js');const original=(await catalog(db,true)).products.find(p=>p.id===101);
  const failing={...db,connect:async()=>({release(){},query(s,p){if(s.startsWith('insert into public.product_images'))throw Error('simulated DB failure');return db.query(s,p);}})};
  await assert.rejects(saveProduct(failing,'second@gmail.com',{...original,stock:19},101),/simulated DB failure/);
  const actual=(await catalog(db,true)).products.find(p=>p.id===101);assert.deepEqual(actual,original);
});
