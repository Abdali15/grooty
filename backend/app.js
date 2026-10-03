import { database } from './lib/db.js';
import { config,HttpError,readJson,verifyWrite,cookie } from './lib/security.js';
import { beginGoogle,finishGoogle,session,limit,audit } from './lib/auth.js';
import { catalog,saveProduct,archiveProduct,saveBrand,saveSettings } from './lib/catalog.js';
import { id } from './lib/validation.js';
export function createHandler({dbFactory=database,env=process.env}={}){
  return async function handler(req,res){
    res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
    const json=(status,value)=>{res.statusCode=status;res.end(JSON.stringify(value));};
    let url;
    try{
      url=new URL(req.url,'http://local.invalid');const path=url.pathname;const method=req.method;
      if(path==='/api/health'&&method==='GET')return json(200,{ok:true});
      if(path==='/api/store/catalog'&&method==='GET')return json(200,await catalog(dbFactory()));
      const cfg=config(env);
      if(path==='/api/auth/config'&&method==='GET')return json(200,{provider:'google',enabled:cfg.enabled});
      if(!cfg.enabled)throw new HttpError(503,'El acceso de propietarios aún no está configurado.');
      const db=dbFactory();
      if(path==='/api/auth/google/start'&&method==='GET')return await beginGoogle(db,cfg,req,res);
      if(path==='/api/auth/google/callback'&&method==='GET')return await finishGoogle(db,cfg,req,res,url);
      if(!path.startsWith('/api/admin/'))throw new HttpError(404,'Ruta no encontrada.');
      const s=await session(db,cfg,req);
      if(!['owner','admin'].includes(s.role))throw new HttpError(403,'Cuenta no autorizada.');
      await limit(db,'admin:'+s.email,240,60);
      if(path==='/api/admin/session'&&method==='GET')return json(200,{user:{email:s.email,role:s.role},csrf:s.csrf});
      if(path==='/api/admin/catalog'&&method==='GET')return json(200,await catalog(db,true));
      if(!['POST','PUT','PATCH'].includes(method))throw new HttpError(405,'Método no permitido.');
      verifyWrite(req,cfg,s.csrf);const body=await readJson(req);
      if(path==='/api/admin/logout'&&method==='POST'){
        await db.query('delete from grooty_private.sessions where token_hash=$1',[s.token_hash]);await audit(db,s.email,'logout','account');res.setHeader('Set-Cookie',cookie(cfg,'session','',0));return json(200,{ok:true});
      }
      if(path==='/api/admin/products'&&method==='POST')return json(201,await saveProduct(db,s.email,body));
      const match=path.match(/^\/api\/admin\/products\/([1-9]\d{0,14})$/);
      if(match&&method==='PUT')return json(200,await saveProduct(db,s.email,body,id(match[1])));
      if(match&&method==='PATCH')return json(200,await archiveProduct(db,s.email,id(match[1]),body));
      if(path==='/api/admin/brands'&&method==='POST')return json(201,await saveBrand(db,s.email,body));
      if(path==='/api/admin/settings'&&method==='PUT')return json(200,await saveSettings(db,s.email,body));
      throw new HttpError(404,'Ruta no encontrada.');
    }catch(error){
      const status=error.code==='23505'?409:error.status||500;
      if(url?.pathname==='/api/auth/google/callback'){
        // No Google codes, tokens, provider errors or email appear in URL or logs.
        res.writeHead(303,{Location:'/admin?auth_error='+ (status===403?'denied':'unavailable')});return res.end();
      }
      if(status>=500)console.error('Grooty API operation failed',{code:error.code||'internal',status});
      return json(status,{error:error.code==='23505'?'Ya existe ese código o marca.':status>=500?'Servicio pendiente de configuración o temporalmente no disponible.':error.message});
    }
  };
}
export default createHandler();
