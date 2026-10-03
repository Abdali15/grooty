import { readFile } from 'node:fs/promises';
import { database,transaction } from '../lib/db.js';
if(process.env.CONFIRM_DB_SETUP!=='true')throw Error('Revisa el destino DATABASE_URL y configura CONFIRM_DB_SETUP=true.');
if(process.env.DATABASE_ADMIN_URL)process.env.DATABASE_URL=process.env.DATABASE_ADMIN_URL;
const db=database();try{await transaction(db,async c=>{for(const name of ['schema.sql','admin.sql'])await c.query(await readFile(new URL('../../supabase/'+name,import.meta.url),'utf8'));});if(process.env.IMPORT_CATALOG==='true')await db.query(await readFile(new URL('../../supabase/seed-catalog.sql',import.meta.url),'utf8'));console.log('Migraciones aplicadas. No se autorizaron cuentas.');}finally{await db.end();}
