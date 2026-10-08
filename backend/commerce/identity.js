import { createRemoteJWKSet,jwtVerify,decodeJwt } from 'jose';
import { token,hash,challenge,cookie,cookieName,cookies,HttpError,equal } from '../lib/security.js';
import { transaction } from '../lib/db.js';
import { limit,audit } from '../lib/auth.js';
const googleKeys=createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'),{timeoutDuration:5000});
const msKeys=createRemoteJWKSet(new URL('https://login.microsoftonline.com/common/discovery/v2.0/keys'),{timeoutDuration:5000});
const personalTenant='9188040d-6c67-4c5b-b112-36a304b66dad';
function providerConfig(cfg,p){
 if(!['google','microsoft'].includes(p)||!cfg.flags[p==='google'?'AUTH_GOOGLE_ENABLED':'AUTH_MICROSOFT_ENABLED'])throw new HttpError(503,'Proveedor de acceso desactivado.');
 const ms=p==='microsoft', tenant=cfg.env.MICROSOFT_TENANT||'consumers';
 if(!['consumers','common'].includes(tenant)&&!/^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/.test(tenant))throw new HttpError(503,'Tenant inválido.');
 return {clientId:cfg.env[ms?'MICROSOFT_CLIENT_ID':'GOOGLE_CLIENT_ID'],secret:cfg.env[ms?'MICROSOFT_CLIENT_SECRET':'GOOGLE_CLIENT_SECRET'],
   callback:cfg.origin+'/api/auth/'+p+'/callback',
   authorization:ms?`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`:'https://accounts.google.com/o/oauth2/v2/auth',
   exchange:ms?`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`:'https://oauth2.googleapis.com/token'};
}
export async function verifyIdentity(jwt,cfg,provider,nonce,jwks){
 const p=providerConfig(cfg,provider);let issuer;
 if(provider==='microsoft'){
   const untrusted=decodeJwt(jwt); // ONLY chooses a strict fixed-host issuer; trust begins after signature validation.
   if(!/^[0-9a-f-]{36}$/i.test(untrusted.tid||''))throw new HttpError(403,'Tenant inválido.');
   const allowed=(cfg.env.MICROSOFT_ALLOWED_TENANTS||personalTenant).split(',');
   if(!allowed.includes(untrusted.tid))throw new HttpError(403,'Organización no autorizada.');
   issuer=`https://login.microsoftonline.com/${untrusted.tid}/v2.0`;
 }else issuer=['https://accounts.google.com','accounts.google.com'];
 const {payload}=await jwtVerify(jwt,jwks||(provider==='google'?googleKeys:msKeys),{issuer,audience:p.clientId,algorithms:['RS256'],maxTokenAge:'10m',requiredClaims:['exp','iat','sub','nonce','email']});
 if(!equal(payload.nonce,nonce)||typeof payload.sub!=='string'||!payload.sub||payload.sub.length>255||(payload.azp&&payload.azp!==p.clientId))throw new HttpError(403,'Identidad inválida.');
 // Microsoft must emit xms_edov optional claim. preferred_username is never proof of email ownership.
 if(provider==='google'?payload.email_verified!==true:payload.xms_edov!==true)throw new HttpError(403,'El proveedor no confirmó el correo.');
 if(typeof payload.email!=='string'||!/^\S+@[^\s@]+\.[^\s@]+$/.test(payload.email)||payload.email.length>254)throw new HttpError(403,'Correo inválido.');
 return {provider,issuer:provider==='google'?'https://accounts.google.com':payload.iss,subject:payload.sub,email:payload.email.toLowerCase()};
}
export async function beginIdentity(db,cfg,req,res,provider){
 const p=providerConfig(cfg,provider);
 if(req.headers['sec-fetch-site']==='cross-site')throw new HttpError(403,'Inicia sesión desde la tienda.');
 await limit(db,'oauth:'+provider,120,600);
 const state=token(),browser=token(),verifier=token(),nonce=token();
 await db.query('delete from grooty_commerce.oauth_attempts where expires_at<=now()');
 await db.query("insert into grooty_commerce.oauth_attempts values($1,$2,$3,$4,$5,now()+interval '10 minutes')",[hash(state),hash(browser),provider,verifier,nonce]);
 res.setHeader('Set-Cookie',cookie(cfg,'oauth',browser,600));
 const u=new URL(p.authorization);u.search=new URLSearchParams({client_id:p.clientId,redirect_uri:p.callback,response_type:'code',scope:'openid email profile',state,nonce,code_challenge:challenge(verifier),code_challenge_method:'S256',prompt:'select_account'}).toString();
 res.writeHead(302,{Location:u.href});res.end();
}
export async function finishIdentity(db,cfg,req,res,url,provider,verify=verifyIdentity,fetcher=fetch){
 const p=providerConfig(cfg,provider),state=url.searchParams.get('state'),browser=cookies(req)[cookieName(cfg,'oauth')];
 res.setHeader('Set-Cookie',cookie(cfg,'oauth','',0));
 if(!/^[\w-]{43}$/.test(state||'')||!/^[\w-]{43}$/.test(browser||''))throw new HttpError(403,'Acceso vencido.');
 const attempt=(await db.query('delete from grooty_commerce.oauth_attempts where state_hash=$1 and browser_hash=$2 and provider=$3 and expires_at>now() returning *',[hash(state),hash(browser),provider])).rows[0];
 if(!attempt||url.searchParams.has('error'))throw new HttpError(403,'Acceso vencido o cancelado.');
 const code=url.searchParams.get('code');if(!code||code.length>4096)throw new HttpError(400,'Código inválido.');
 await limit(db,'oauth-callback:'+provider,120,600);
 const response=await fetcher(p.exchange,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',code,client_id:p.clientId,client_secret:p.secret,redirect_uri:p.callback,code_verifier:attempt.verifier}),signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw new HttpError(403,'No se pudo verificar el acceso.');
 const auth=await response.json(),who=await verify(auth.id_token,cfg,provider,attempt.nonce);
 const sid=token(),csrf=token();
 await transaction(db,async c=>{
   await c.query('select pg_advisory_xact_lock(hashtextextended($1,0))',[who.provider+':'+who.issuer+':'+who.subject]);
   let identity=(await c.query('select * from grooty_commerce.user_identities where provider=$1 and issuer=$2 and subject=$3',[who.provider,who.issuer,who.subject])).rows[0];
   if(!identity){
     const profile=(await c.query('insert into grooty_commerce.profiles default values returning id')).rows[0];
     identity=(await c.query('insert into grooty_commerce.user_identities(profile_id,provider,issuer,subject,email,verified_at) values($1,$2,$3,$4,$5,now()) returning *',[profile.id,who.provider,who.issuer,who.subject,who.email])).rows[0];
   }
   if((await c.query('select deletion_requested_at from grooty_commerce.profiles where id=$1',[identity.profile_id])).rows[0].deletion_requested_at)throw new HttpError(403,'Cuenta pendiente de revisión.');
   await c.query('select grooty_commerce.bind_approved_identity($1)',[identity.id]);
   const previous=cookies(req)[cookieName(cfg)];if(previous)await c.query('delete from grooty_commerce.sessions where token_hash=$1',[hash(previous)]);
   await c.query("insert into grooty_commerce.sessions(token_hash,identity_id,csrf,expires_at,reauthenticated_at) values($1,$2,$3,now()+interval '8 hours',now())",[hash(sid),identity.id,csrf]);
   await audit(c,identity.profile_id,'identity.login',identity.id,{provider});
 });
 res.setHeader('Set-Cookie',[cookie(cfg,'oauth','',0),cookie(cfg,'session',sid,28800)]);
 res.writeHead(303,{Location:'/cuenta'});res.end();
}
export async function commerceSession(db,cfg,req){
 const sid=cookies(req)[cookieName(cfg)];if(!/^[\w-]{43}$/.test(sid||''))throw new HttpError(401,'Inicia sesión para continuar.');
 const s=(await db.query(`select s.*,i.profile_id,i.email,i.provider,coalesce(a.role,'CUSTOMER') role,
   exists(select 1 from grooty_commerce.mfa_credentials m where m.identity_id=i.id and m.confirmed_at is not null) mfa_enrolled
   from grooty_commerce.sessions s join grooty_commerce.user_identities i on i.id=s.identity_id
   join grooty_commerce.profiles p on p.id=i.profile_id and p.deletion_requested_at is null
   left join grooty_commerce.admin_allowlist a on a.identity_id=i.id and a.status='ACTIVE' and a.provider=i.provider
   where s.token_hash=$1 and s.expires_at>now()`,[hash(sid)])).rows[0];
 if(!s)throw new HttpError(401,'Sesión vencida o revocada.');return s;
}
