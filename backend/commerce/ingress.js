import {isIP} from 'node:net';
import {createHmac} from 'node:crypto';
import {HttpError} from '../lib/security.js';
import {limit} from '../lib/auth.js';
const rules=[
 [/^\/api\/(health|store\/catalog|auth\/config)$/,['GET']],
 [/^\/api\/auth\/(google|microsoft)\/(start|callback)$/,['GET']],
 [/^\/api\/account\/(session|orders|requests|preorders)$/,['GET']],
 [/^\/api\/account\/(logout|revoke-sessions|deletion-request|mfa\/(enroll|verify))$/,['POST']],
 [/^\/api\/account\/profile$/,['PUT']],
 [/^\/api\/(orders|requests|preorders)$/,['POST']],
 [/^\/api\/orders\/[0-9a-f-]{36}$/,['GET']],
 [/^\/api\/orders\/[0-9a-f-]{36}\/checkout$/,['POST']],
 [/^\/api\/preorders\/[0-9a-f-]{36}\/order$/,['POST']],
 [/^\/api\/admin\/(session|catalog|orders|requests|identities|dashboard)$/,['GET']],
 [/^\/api\/admin\/(logout|authorizations|products|brands)$/,['POST']],
 [/^\/api\/admin\/settings$/,['PUT']],
 [/^\/api\/admin\/products\/[1-9]\d{0,14}$/,['PUT','PATCH']],
 [/^\/api\/admin\/orders\/[0-9a-f-]{36}$/,['PATCH']],
 [/^\/api\/admin\/preorders\/[0-9a-f-]{36}\/available$/,['POST']],
 [/^\/api\/admin\/requests\/[0-9a-f-]{36}\/quote$/,['POST']],
 [/^\/api\/payments\/mercadopago\/webhook$/,['POST']],
 [/^\/api\/jobs\/expire$/,['POST']]
];
export function validateIngress(req){
 if(typeof req.url!=='string'||req.url.length>8192)throw new HttpError(414,'URL demasiado larga.');
 const u=new URL(req.url,'http://local.invalid');
 if(req.url.includes('%')&&/%(?:2f|5c|00|2e)/i.test(req.url.split('?')[0]))throw new HttpError(400,'Ruta no válida.');
 const rule=rules.find(([pattern])=>pattern.test(u.pathname));if(!rule)throw new HttpError(404,'Ruta no encontrada.');
 if(!rule[1].includes(req.method))throw new HttpError(405,'Método no permitido.');
 const seen=new Set();let count=0;for(const [k,v] of u.searchParams){if(++count>16||k.length>64||v.length>4096||seen.has(k))throw new HttpError(400,'Parámetros ambiguos o excesivos.');seen.add(k);}
 const length=req.headers['content-length'];
 if(length!==undefined&&(!/^\d{1,9}$/.test(String(length))||Number(length)>65536))throw new HttpError(413,'Solicitud demasiado grande.');
 if(length!==undefined&&req.headers['transfer-encoding'])throw new HttpError(400,'Longitud de solicitud ambigua.');
 if(req.headers['content-encoding']&&!['identity'].includes(req.headers['content-encoding']))throw new HttpError(415,'Compresión de entrada no admitida.');
 if(['POST','PUT','PATCH'].includes(req.method)&&!u.pathname.startsWith('/api/jobs/')&&!u.pathname.startsWith('/api/payments/')){
  if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||''))throw new HttpError(415,'Usa JSON para esta operación.');
 }
 return u;
}
export function clientBucket(req,cfg){
 // Platform boundary is selected by SERVER deployment environment, never by a browser header.
 const raw=cfg.env.VERCEL==='1'?req.headers['x-vercel-forwarded-for']:req.socket?.remoteAddress;
 const ip=typeof raw==='string'&&isIP(raw)?raw:'unknown';
 const secret=cfg.env.RATE_LIMIT_KEY_SECRET;
 if(!secret||secret.length<32){if(cfg.env.NODE_ENV==='production')throw new HttpError(503,'Configura la protección de solicitudes.');return 'development:'+ip;}
 return createHmac('sha256',secret).update(ip).digest('hex');
}
const budgets=path=>path.startsWith('/api/auth/')?{count:30,seconds:600}:path.includes('/mfa/')?{count:20,seconds:300}:path.endsWith('/checkout')||path==='/api/orders'?{count:20,seconds:60}:{count:180,seconds:60};
export function localAdmission({clock=Date.now,maxConcurrent=40,maxBurst=60,windowMs=5000,maxKeys=1000}={}){
 let inFlight=0;const buckets=new Map();
 return key=>{
  if(inFlight>=maxConcurrent)throw new HttpError(503,'Servicio ocupado. Reintenta en unos segundos.');
  const now=clock();let b=buckets.get(key);
  if(!b||now-b.started>=windowMs){if(buckets.size>=maxKeys)buckets.delete(buckets.keys().next().value);b={started:now,count:0};buckets.set(key,b);}
  if(++b.count>maxBurst)throw new HttpError(429,'Demasiadas solicitudes. Espera unos segundos.');
  inFlight++;let released=false;return ()=>{if(!released){released=true;inFlight--;}};
 };
}
export async function enforceIngress(db,req,cfg,path){
 const key=clientBucket(req,cfg),b=budgets(path);
 // Fixed global bucket has bounded cardinality and limits distributed abuse after platform filtering.
 await limit(db,'ingress:global',3000,60);
 await limit(db,'ingress:'+key+':'+(path.startsWith('/api/auth/')?'auth':path.includes('/mfa/')?'mfa':path.endsWith('/checkout')||path==='/api/orders'?'checkout':'api'),b.count,b.seconds);
}
