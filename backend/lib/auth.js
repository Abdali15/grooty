import { createRemoteJWKSet, jwtVerify } from 'jose';
import { token,hash,challenge,cookie,cookieName,cookies,identity,HttpError,equal } from './security.js';
import { transaction } from './db.js';
const keys=createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'),{timeoutDuration:5000});
export async function googleToken(jwt,cfg,nonce,jwks=keys){const {payload}=await jwtVerify(jwt,jwks,{issuer:['https://accounts.google.com','accounts.google.com'],audience:cfg.clientId,algorithms:['RS256'],maxTokenAge:'10m'});return identity(payload,nonce,cfg.clientId);}
export async function limit(db,key,max,seconds){
  const {rows}=await db.query(`insert into grooty_private.rate_limits(key,count,expires_at) values($1,1,now()+make_interval(secs=>$2)) on conflict(key) do update set count=case when grooty_private.rate_limits.expires_at<=now() then 1 else grooty_private.rate_limits.count+1 end, expires_at=case when grooty_private.rate_limits.expires_at<=now() then excluded.expires_at else grooty_private.rate_limits.expires_at end returning count`,[hash(key),seconds]);
  if(rows[0].count>max)throw new HttpError(429,'Demasiadas solicitudes. Espera unos minutos.');
}
export async function beginGoogle(db,cfg,req,res){
  if(req.headers['sec-fetch-site']==='cross-site')throw new HttpError(403,'Inicia el acceso desde el panel.');
  // Global database-backed limit cannot be bypassed with spoofed IP headers.
  await limit(db,'google-start',120,600);
  const state=token(),browser=token(),verifier=token(),nonce=token();
  await db.query('delete from grooty_private.oauth_attempts where expires_at<=now()');
  await db.query('insert into grooty_private.oauth_attempts values($1,$2,$3,$4,now()+interval \'10 minutes\')',[hash(state),hash(browser),verifier,nonce]);
  res.setHeader('Set-Cookie',cookie(cfg,'oauth',browser,600));
  const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search=new URLSearchParams({client_id:cfg.clientId,redirect_uri:cfg.callback,response_type:'code',scope:'openid email',state,nonce,code_challenge:challenge(verifier),code_challenge_method:'S256',prompt:'select_account'}).toString();
  res.writeHead(302,{Location:url.href});res.end();
}
export async function finishGoogle(db,cfg,req,res,url,verify=googleToken){
  const state=url.searchParams.get('state'),browser=cookies(req)[cookieName(cfg,'oauth')];
  const stateValid=/^[\w-]{43}$/.test(state||'') && /^[\w-]{43}$/.test(browser||'');
  res.setHeader('Set-Cookie',cookie(cfg,'oauth','',0));
  if(!stateValid)throw new HttpError(403,'Acceso vencido. Vuelve a intentarlo desde el panel.');
  const {rows}=await db.query('delete from grooty_private.oauth_attempts where state_hash=$1 and browser_hash=$2 and expires_at>now() returning verifier,nonce',[hash(state),hash(browser)]);
  if(!rows.length)throw new HttpError(403,'Acceso vencido. Vuelve a intentarlo desde el panel.');
  if(url.searchParams.has('error'))throw new HttpError(403,'Acceso cancelado.');
  const code=url.searchParams.get('code');if(!code||code.length>4096)throw new HttpError(400,'Respuesta de Google no válida.');
  await limit(db,'google-callback',120,600);
  const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',code,client_id:cfg.clientId,client_secret:cfg.clientSecret,redirect_uri:cfg.callback,code_verifier:rows[0].verifier}),signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw new HttpError(403,'No se pudo validar el acceso con Google.');
  const auth=await response.json();const who=await verify(auth.id_token,cfg,rows[0].nonce);
  const session=token(),csrf=token();
  await transaction(db,async client=>{
    const account=(await client.query('select * from grooty_private.admin_accounts where email=$1 and active=true for update',[who.email])).rows[0];
    if(!account || (account.google_sub && !equal(account.google_sub,who.sub)))throw new HttpError(403,'Esta cuenta no está autorizada para administrar la tienda.');
    await client.query('update grooty_private.admin_accounts set google_sub=$2 where email=$1',[who.email,who.sub]);
    await client.query('delete from grooty_private.sessions where expires_at<=now()');
    const previous=cookies(req)[cookieName(cfg)];if(previous)await client.query('delete from grooty_private.sessions where token_hash=$1',[hash(previous)]);
    await client.query('insert into grooty_private.sessions(token_hash,email,csrf,expires_at) values($1,$2,$3,now()+interval \'8 hours\')',[hash(session),who.email,csrf]);
    await audit(client,who.email,'login','account');
  });
  res.setHeader('Set-Cookie',[cookie(cfg,'oauth','',0),cookie(cfg,'session',session,28800)]);
  res.writeHead(303,{Location:'/admin'});res.end();
}
export async function session(db,cfg,req){
  const value=cookies(req)[cookieName(cfg)];if(!/^[\w-]{43}$/.test(value||''))throw new HttpError(401,'Inicia sesión con Google.');
  const {rows}=await db.query(`select s.token_hash,s.csrf,a.email,a.role from grooty_private.sessions s join grooty_private.admin_accounts a on a.email=s.email where s.token_hash=$1 and s.expires_at>now() and a.active=true and a.google_sub is not null`,[hash(value)]);
  if(!rows.length)throw new HttpError(401,'Tu sesión terminó o el acceso fue retirado.');return rows[0];
}
export async function audit(db,actor,action,entity,detail={}){await db.query('insert into grooty_private.audit_log(actor,action,entity,detail) values($1,$2,$3,$4)',[actor,action,String(entity),JSON.stringify(detail)]);}
