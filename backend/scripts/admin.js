import { database,transaction } from '../lib/db.js';
import { audit } from '../lib/auth.js';
const [action,email,role='admin']=process.argv.slice(2);
if(!['grant','revoke'].includes(action)||!email||! /^[^\s@]+@gmail\.com$/.test(email)||!['owner','admin'].includes(role))throw Error('Uso: npm run admin -- grant correo@gmail.com owner|admin / revoke correo@gmail.com. Solo correos autorizados.');
if(process.env.DATABASE_ADMIN_URL)process.env.DATABASE_URL=process.env.DATABASE_ADMIN_URL;
const db=database();try{await transaction(db,async c=>{
  if(action==='grant')await c.query(`insert into grooty_private.admin_accounts(email,role) values($1,$2) on conflict(email) do update set role=excluded.role,active=true`,[email,role]);
  else {await c.query('update grooty_private.admin_accounts set active=false where email=$1',[email]);await c.query('delete from grooty_private.sessions where email=$1',[email]);}
  await audit(c,'private-cli',action,'account',{email,role});
});console.log('Permiso actualizado. No se creó ninguna contraseña.');}finally{await db.end();}
