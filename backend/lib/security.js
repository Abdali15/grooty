import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
export class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
export const token = () => randomBytes(32).toString('base64url');
export const hash = value => createHash('sha256').update(value).digest('hex');
export const challenge = value => createHash('sha256').update(value).digest('base64url');
export function equal(a,b) { return typeof a==='string' && typeof b==='string' && Buffer.byteLength(a)===Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a),Buffer.from(b)); }
export function config(env=process.env) {
  const development=env.NODE_ENV!=='production';
  const origin=env.APP_ORIGIN || (development?'http://localhost:3000':'');
  let u; try { u=new URL(origin); } catch { throw new HttpError(503,'Configura el dominio del servidor.'); }
  if(u.origin!==origin || (!development && u.protocol!=='https:') || u.username || u.password || !['http:','https:'].includes(u.protocol)) throw new HttpError(503,'Dominio del servidor no válido.');
  return {origin,secure:u.protocol==='https:',enabled:env.ADMIN_ENABLED==='true' && Boolean(env.DATABASE_URL && env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),clientId:env.GOOGLE_CLIENT_ID,clientSecret:env.GOOGLE_CLIENT_SECRET,callback:origin+'/api/auth/google/callback'};
}
export function cookieName(cfg,kind='session'){ return (cfg.secure?'__Host-':'')+'grooty_'+kind; }
export function cookie(cfg,name,value,age){ return `${cookieName(cfg,name)}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${cfg.secure?'; Secure':''}`; }
export function cookies(req){ const values=Object.create(null); for(const item of String(req.headers.cookie||'').split(';')) { const ix=item.indexOf('='); if(ix>0) values[item.slice(0,ix).trim()]=item.slice(ix+1).trim(); } return values; }
export function verifyWrite(req,cfg,csrf){ if(req.headers.origin!==cfg.origin || !equal(req.headers['x-csrf-token'],csrf)) throw new HttpError(403,'Solicitud no autorizada. Recarga el panel.'); }
export async function readJson(req){
  if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||'')) throw new HttpError(415,'Usa JSON para esta operación.');
  if(req.headers['content-length'] && Number(req.headers['content-length'])>65536) throw new HttpError(413,'Solicitud demasiado grande.');
  // Vercel may supply an already parsed body.
  if(req.body!==undefined){ const raw=typeof req.body==='string'?req.body:JSON.stringify(req.body); if(Buffer.byteLength(raw)>65536)throw new HttpError(413,'Solicitud demasiado grande.'); return parse(raw); }
  const chunks=[];let size=0;for await(const chunk of req){size+=Buffer.byteLength(chunk);if(size>65536)throw new HttpError(413,'Solicitud demasiado grande.');chunks.push(Buffer.from(chunk));}return parse(Buffer.concat(chunks).toString());
}
function parse(text){try{const v=JSON.parse(text);if(!v || typeof v!=='object' || Array.isArray(v))throw Error();return v;}catch{throw new HttpError(400,'JSON no válido.');}}
export function identity(payload,nonce,clientId){
  if(!equal(payload.nonce,nonce) || payload.email_verified!==true || typeof payload.sub!=='string' || payload.sub.length>255 || !payload.sub || typeof payload.email!=='string' || !/^[^\s@]+@gmail\.com$/i.test(payload.email) || (payload.azp && payload.azp!==clientId)) throw new HttpError(403,'Usa una cuenta de Gmail verificada y autorizada.');
  return {sub:payload.sub,email:payload.email.toLowerCase()};
}
