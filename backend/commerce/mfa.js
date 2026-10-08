import { createCipheriv,createDecipheriv,randomBytes } from 'node:crypto';
import { TOTP,Secret } from 'otpauth';
import { transaction } from '../lib/db.js';
import { HttpError } from '../lib/security.js';
import { limit,audit } from '../lib/auth.js';
function key(cfg){const k=Buffer.from(cfg.env.MFA_ENCRYPTION_KEY||'','base64');if(k.length!==32)throw new HttpError(503,'Configura la clave privada de MFA.');return k;}
export function encrypt(secret,cfg,identity){
 const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',key(cfg),iv);c.setAAD(Buffer.from(identity));
 const body=Buffer.concat([c.update(secret,'utf8'),c.final()]);return [iv,c.getAuthTag(),body].map(b=>b.toString('base64')).join('.');
}
export function decrypt(cipher,cfg,identity){
 const [iv,tag,body]=cipher.split('.').map(s=>Buffer.from(s,'base64')),d=createDecipheriv('aes-256-gcm',key(cfg),iv);d.setAAD(Buffer.from(identity));d.setAuthTag(tag);return Buffer.concat([d.update(body),d.final()]).toString('utf8');
}
const totp=(secret,label)=>new TOTP({issuer:'Grooty Store',label,algorithm:'SHA1',digits:6,period:30,secret:Secret.fromBase32(secret)});
export async function enrollMfa(db,cfg,s){
 if(s.role==='CUSTOMER')throw new HttpError(403,'MFA administrativo requiere autorización previa.');
 if(Date.now()-new Date(s.reauthenticated_at).getTime()>300000)throw new HttpError(403,'Vuelve a iniciar sesión antes de configurar MFA.');
 await limit(db,'mfa-enroll:'+s.identity_id,5,600);
 const secret=new Secret({size:20}).base32;
 const row=await db.query('insert into grooty_commerce.mfa_credentials(identity_id,encrypted_secret) values($1,$2) on conflict(identity_id) do update set encrypted_secret=excluded.encrypted_secret where grooty_commerce.mfa_credentials.confirmed_at is null returning identity_id',[s.identity_id,encrypt(secret,cfg,s.identity_id)]);
 if(!row.rows.length)throw new HttpError(409,'MFA ya está configurado.');
 await audit(db,s.profile_id,'mfa.enroll',s.identity_id);
 return {uri:totp(secret,s.email).toString(),secret};
}
export async function verifyMfa(db,cfg,s,code){
 if(typeof code!=='string'||!/^\d{6}$/.test(code))throw new HttpError(400,'Código de seis dígitos requerido.');
 await limit(db,'mfa-verify:'+s.identity_id,8,300);
 return transaction(db,async c=>{
   const m=(await c.query('select * from grooty_commerce.mfa_credentials where identity_id=$1 for update',[s.identity_id])).rows[0];
   if(!m)throw new HttpError(403,'Configura MFA primero.');
   const now=Date.now(),delta=totp(decrypt(m.encrypted_secret,cfg,s.identity_id),s.email).validate({token:code,timestamp:now,window:1});
   const counter=Math.floor(now/30000)+(delta??0);
   if(delta===null||counter<=Number(m.last_counter))throw new HttpError(403,'Código inválido o utilizado.');
   await c.query('update grooty_commerce.mfa_credentials set confirmed_at=coalesce(confirmed_at,now()),last_counter=$2 where identity_id=$1',[s.identity_id,counter]);
   await c.query('update grooty_commerce.sessions set mfa_at=now() where token_hash=$1',[s.token_hash]);
   await audit(c,s.profile_id,'mfa.verify',s.identity_id);return {ok:true};
 });
}
