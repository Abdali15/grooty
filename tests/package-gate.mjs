import {readFile,readdir,stat} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {commerceConfig} from '../backend/commerce/config.js';
const root=path.resolve(new URL('..',import.meta.url).pathname);
const read=async name=>JSON.parse(await readFile(path.join(root,name),'utf8'));
const metadata=await read('package.json');assert.equal(metadata.version,'3.0.0-rc.1');
const config=commerceConfig({NODE_ENV:'development'});assert.equal(Object.values(config.flags).some(Boolean),false);assert.equal(config.provider,'mock');
const vercel=await read('vercel.json');assert.equal(vercel.outputDirectory,'frontend/dist');assert.ok(vercel.rewrites.some(r=>r.source==='/api/:path*'));assert.ok(vercel.functions['api/index.js']);
for(const route of ['/admin','/cuenta','/checkout','/operaciones'])assert.ok(vercel.headers.some(h=>h.source===route&&h.headers.some(v=>v.key==='Cache-Control'&&v.value==='no-store')));
const migrations=await readFile(path.join(root,'backend/scripts/migrate.js'),'utf8');for(const version of ['003_commerce.sql','004_admin_approvals.sql'])assert.ok(migrations.includes(version));
const suspicious=[];let files=0;const secretPattern=/(?:sk_(?:live|test)_[A-Za-z0-9]{8,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|postgres(?:ql)?:\/\/[^\s"']+:[^\s"']+@|AIza[0-9A-Za-z_-]{30,})/;
async function scan(folder){for(const entry of await readdir(folder,{withFileTypes:true})){const file=path.join(folder,entry.name);if(entry.isDirectory())await scan(file);else{files++;assert.ok(!/owner-approvals|\.env(?:\.|$)/i.test(entry.name),'Private configuration in dist');const size=(await stat(file)).size;if(size<5_000_000&&/\.(html|js|json|css|txt)$/i.test(entry.name)&&secretPattern.test(await readFile(file,'utf8')))suspicious.push(path.relative(root,file));}}}
await scan(path.join(root,'frontend/dist'));assert.deepEqual(suspicious,[],'Possible exposed secret; review and block delivery');
console.log(`PACKAGE CHECK PASS: ${metadata.version}; ${files} public artifacts checked; integrations disabled by default. This is not commercial certification.`);
