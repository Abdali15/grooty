import {readFile} from 'node:fs/promises';
import {database,transaction} from '../lib/db.js';
import {audit} from '../lib/auth.js';
export function approvalsInput(value){
 if(!Array.isArray(value)||!value.length||value.length>20)throw Error('Lista privada de aprobación inválida.');
 const seen=new Set();return value.map(a=>{
  if(!a||Object.keys(a).sort().join(',')!=='email,provider,role'||!['google','microsoft'].includes(a.provider)||!['CATALOG_MANAGER','ORDER_MANAGER','ADMIN'].includes(a.role)||typeof a.email!=='string'||!/^\S+@[^\s@]+\.[^\s@]+$/.test(a.email)||a.email.length>254)throw Error('Correo, proveedor o rol inválido. No admite SUPER_ADMIN.');
  const email=a.email.toLowerCase(),key=a.provider+':'+email;if(seen.has(key))throw Error('Aprobación duplicada.');seen.add(key);return {...a,email};
 });
}
export async function approveAdmins(db,list){
 const records=approvalsInput(list);return transaction(db,async c=>{
  for(const a of records){
   const row=await c.query(`insert into grooty_commerce.admin_allowlist(email,provider,role,status,approved_at,approval_expires_at,approval_actor)
    values($1,$2,$3,'PENDING',now(),now()+interval '30 days','owner-approved-private-cli')
    on conflict(provider,email) do nothing returning id`,[a.email,a.provider,a.role]);
   if(!row.rows.length)throw Error('Ya existe una autorización. Revísala con el propietario; no se reactiva una cuenta revocada automáticamente.');
   await audit(c,'owner-approved-private-cli','authorization.approve',row.rows[0].id,{provider:a.provider,role:a.role});
  }return {approved:records.length};
 });
}
// Private CLI only. The input file is never imported into the frontend or committed.
if(process.argv[1]?.endsWith('/approve-admins.js')){
 if(process.env.CONFIRM_OWNER_AUTHORIZATION!=='true'||!process.env.DATABASE_ADMIN_URL||!process.argv[2])throw Error('Requiere aprobación del dueño, DATABASE_ADMIN_URL y archivo JSON privado.');
 const list=JSON.parse(await readFile(process.argv[2],'utf8'));process.env.DATABASE_URL=process.env.DATABASE_ADMIN_URL;const db=database();
 try{const result=await approveAdmins(db,list);console.log('Aprobaciones privadas registradas:',result.approved);}finally{await db.end();}
}
