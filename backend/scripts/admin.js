import {database,transaction} from '../lib/db.js';
import {audit} from '../lib/auth.js';
const [action,id]=process.argv.slice(2);
if(action!=='bootstrap-super-admin'||!/^[0-9a-f-]{36}$/.test(id||'')||process.env.CONFIRM_OWNER_AUTHORIZATION!=='true'||!process.env.DATABASE_ADMIN_URL)throw Error('Solo bootstrap privado: confirmar autorización del propietario y usar identidad verificada. npm run admin -- bootstrap-super-admin UUID.');
process.env.DATABASE_URL=process.env.DATABASE_ADMIN_URL;const db=database();
try{await transaction(db,async c=>{
 await c.query('select pg_advisory_xact_lock(781349012)');
 if((await c.query("select 1 from grooty_commerce.admin_allowlist where role='SUPER_ADMIN' and status='ACTIVE'")).rows.length)throw Error('Ya existe SUPER_ADMIN. Usa panel con MFA y reautenticación.');
 const i=(await c.query('select * from grooty_commerce.user_identities where id=$1',[id])).rows[0];if(!i)throw Error('Identidad inexistente. El dueño debe iniciar sesión primero.');
 await c.query("insert into grooty_commerce.admin_allowlist(email,provider,identity_id,role,status,activated_at,granted_by) values($1,$2,$3,'SUPER_ADMIN','ACTIVE',now(),$4)",[i.email,i.provider,i.id,i.profile_id]);
 await c.query('delete from grooty_commerce.sessions where identity_id=$1',[i.id]);await audit(c,'owner-approved-private-cli','authorization.bootstrap',i.id);
});console.log('Bootstrap auditado. Vuelve a iniciar sesión y configura MFA.');}finally{await db.end();}
