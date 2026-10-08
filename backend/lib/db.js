import pg from 'pg';
let pool;
export function database(){
  if(!process.env.DATABASE_URL) throw Object.assign(new Error('Base de datos pendiente de configurar.'),{status:503});
  if(!pool){const url=new URL(process.env.DATABASE_URL);const local=['localhost','127.0.0.1','::1'].includes(url.hostname);for(const key of ['sslmode','sslcert','sslkey','sslrootcert'])url.searchParams.delete(key);
    pool=new pg.Pool({connectionString:url.href,max:3,connectionTimeoutMillis:5000,idleTimeoutMillis:15000,statement_timeout:8000,lock_timeout:3000,idle_in_transaction_session_timeout:10000,ssl:local && process.env.NODE_ENV!=='production'?false:{rejectUnauthorized:true,...(process.env.DATABASE_CA_CERT?{ca:process.env.DATABASE_CA_CERT}: {})}});
  }return pool;
}
export async function transaction(db,fn){ const client=await db.connect();try{await client.query('BEGIN');const value=await fn(client);await client.query('COMMIT');return value;}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}}
