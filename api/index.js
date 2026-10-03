import handler from '../backend/app.js';
// Explicit Vercel rewrite retains OAuth query parameters and the logical API path.
export default function api(req,res){
  const url=new URL(req.url,'http://local.invalid');
  const route=req.query?.__route ?? url.searchParams.get('__route');
  if(route!==null && route!==undefined){
    if(typeof route!=='string' || !/^[a-zA-Z0-9/_-]+$/.test(route)) {res.statusCode=400;res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({error:'Ruta no válida.'}));}
    url.searchParams.delete('__route');req.url='/api/'+route+(url.search?'?'+url.searchParams.toString():'');
  }
  return handler(req,res);
}
