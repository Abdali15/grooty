import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {database,transaction} from '../lib/db.js';
if(process.env.CONFIRM_DB_SETUP!=='true'||!process.env.DATABASE_ADMIN_URL)throw Error('Revisa destino y backup. Requiere DATABASE_ADMIN_URL privado y CONFIRM_DB_SETUP=true.');
process.env.DATABASE_URL=process.env.DATABASE_ADMIN_URL;
const db=database();
try{await transaction(db,async c=>{
 await c.query('select pg_advisory_xact_lock(781349013)');
 const existing=(await c.query("select to_regclass('public.products') products,to_regclass('public.productos') legacy")).rows[0];
 if(existing.legacy)throw Error('Esquema de rama antigua productos: requiere migración de datos revisada. No se aplicó nada.');
 if(!existing.products){
  if(process.env.INIT_EMPTY_DATABASE!=='true')throw Error('No existe el esquema V4. No se inicializa una base automáticamente.');
  for(const f of ['schema.sql','admin.sql'])await c.query(await readFile(new URL('../../supabase/'+f,import.meta.url),'utf8'));
 }
 await c.query('create table if not exists grooty_private.migrations(version text primary key,checksum text not null,applied_at timestamptz not null default now())');
 for(const f of ['003_commerce.sql']){
  const content=await readFile(new URL('../database/'+f,import.meta.url),'utf8'),checksum=createHash('sha256').update(content).digest('hex');
  const prior=(await c.query('select checksum from grooty_private.migrations where version=$1',[f])).rows[0];
  if(prior){if(prior.checksum!==checksum)throw Error('Migración aplicada ha cambiado: '+f);continue;}
  await c.query(content);await c.query('insert into grooty_private.migrations(version,checksum) values($1,$2)',[f,checksum]);
 }
});console.log('Migraciones aplicadas. No se importó catálogo ni se autorizaron cuentas.');}finally{await db.end();}
