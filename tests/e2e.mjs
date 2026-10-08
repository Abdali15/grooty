import {chromium} from 'playwright';
import {readFile,stat,mkdir} from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHandler} from '../backend/app.js';
const root=path.resolve('frontend/dist'),report=[],errors=[];
const server=http.createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const handler=createHandler({env:{NODE_ENV:'development',APP_ORIGIN:origin},dbFactory:()=>{throw Object.assign(Error('Unconfigured test environment'),{status:503});}});
server.on('request',async(req,res)=>{
 if(req.url.startsWith('/api/'))return handler(req,res);
 try{const u=new URL(req.url,origin),target=path.resolve(root,'.'+decodeURIComponent(u.pathname));if(!target.startsWith(root+path.sep)&&target!==root){res.statusCode=400;return res.end();}
 let f=target;try{if(!(await stat(f)).isFile())f=path.join(root,'index.html');}catch{f=path.join(root,'index.html');}
 const type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.woff2':'font/woff2','.svg':'image/svg+xml'}[path.extname(f)]||'application/octet-stream';res.setHeader('Content-Type',type);res.end(await readFile(f));
 }catch{res.statusCode=500;res.end();}
});
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:chromium.executablePath(),args:['--no-sandbox']});
 for(const viewport of [{width:390,height:844},{width:768,height:1024},{width:1440,height:900}]){
  const context=await browser.newContext({viewport,reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  // Test local UI only: do not send load to ImageKit, YouTube, Google or live storefront.
  await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  for(const route of ['/','/catalogo','/cuenta','/checkout','/admin','/operaciones','/a-pedido']){
   await page.goto(origin+route);await page.waitForSelector('h1');await page.waitForTimeout(400);
   assert.ok(await page.locator('h1').innerText());
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);assert.equal(overflow,false,`Overflow ${route} ${viewport.width}`);
   report.push({route,width:viewport.width,heading:await page.locator('h1').innerText(),overflow});
  }
  await page.goto(origin+'/cuenta');await page.waitForTimeout(400);assert.equal(await page.getByText('Continuar con Google',{exact:true}).count(),0);assert.equal(await page.getByText('Continuar con Microsoft',{exact:true}).count(),0);
  await context.close();
 }
 assert.deepEqual(errors,[]);await mkdir('docs',{recursive:true});await import('node:fs/promises').then(fs=>fs.writeFile('docs/e2e-results.json',JSON.stringify({environment:'local, services disabled, remote requests blocked',checks:report,errors},null,2)));console.log('PASS',report.length,'route/viewport checks; zero overflow; zero page exceptions.');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
