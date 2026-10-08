import { randomUUID } from 'node:crypto';
import { transaction } from './db.js';
import { HttpError } from './security.js';
import { product,id,revision,settings,brand,slug } from './validation.js';
import { audit } from './auth.js';
const columns=['sku','title','condition','sale_type','price','reservation_price','stock','published','archived','revision','franchise','character_name','description','includes_text','box_note'];
function values(p){return [p.sku,p.titulo,p.estado,p.tipo,p.precio,p.precio_reserva,p.stock,p.published,p.archived,p.revision,p.franchise,p.character_name,p.description,p.includes_text,p.box_note];}
export async function catalog(db,admin=false){
  return transaction(db,async c=>{
    await c.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const {rows}=await c.query(`select p.*,b.name marca,coalesce((select jsonb_agg(jsonb_build_object('url',i.url,'posicion',i.position) order by i.position,i.id) from public.product_images i where i.product_id=p.id),'[]'::jsonb) imagenes_producto from public.products p join public.brands b on b.id=p.brand_id ${admin?'':'where p.published=true and p.archived=false and b.active=true'} order by p.id desc`);
    const products=rows.map(p=>({id:Number(p.id),sku:p.sku||'',titulo:p.title,marca:p.marca,estado:p.condition,tipo:p.sale_type,precio:Number(p.price),precio_reserva:p.reservation_price===null?null:Number(p.reservation_price),stock:p.stock,published:p.published,archived:p.archived,revision:p.revision,...Object.fromEntries(['franchise','character_name','description','includes_text','box_note'].map(k=>[k,p[k]||''])),imagenes_producto:p.imagenes_producto}));
    const brands=(await c.query('select name from public.brands where active=true order by name')).rows.map(b=>b.name);
    const stored=(await c.query("select value,revision from public.store_settings where key='storefront'")).rows[0];
    const value={...(stored?.value||{}),...(admin?{settingsRevision:stored?.revision||1}:{})};
    return {products,...(admin?{brands}:{}),settings:value};
  });
}
async function images(c,productId,list){await c.query('delete from public.product_images where product_id=$1',[productId]);for(const i of list)await c.query('insert into public.product_images(product_id,url,position) values($1,$2,$3)',[productId,i.url,i.posicion]);}
export async function saveProduct(db,actor,body,pathId=null){
  const p=product(body);if(pathId!==null && id(body.id)!==pathId)throw new HttpError(400,'El código de ruta no coincide.');
  return transaction(db,async c=>{
    const b=(await c.query('select id from public.brands where name=$1 and active=true',[p.marca])).rows[0];if(!b)throw new HttpError(400,'Selecciona una marca registrada.');
    let saved;
    if(pathId===null){
      // Identity determines the ID; provisional frontend ID is ignored.
      p.revision=1;
      const qs=values(p);qs.push(b.id,slug(p.titulo)+'-'+randomUUID());
      saved=(await c.query(`insert into public.products(${columns.join(',')},brand_id,slug) values(${qs.map((_,i)=>'$'+(i+1)).join(',')}) returning id,revision`,qs)).rows[0];
    }else{
      const previous=(await c.query('select stock from public.products where id=$1 for update',[pathId])).rows[0];
      const qs=values(p);qs.push(b.id,pathId,p.revision);
      saved=(await c.query(`update public.products set ${columns.filter(k=>k!=='revision').map(k=>`${k}=$${columns.indexOf(k)+1}`).join(',')},revision=$10::integer+1,brand_id=$16,updated_at=now() where id=$17 and revision=$18 returning id,revision`,qs)).rows[0];
      if(!saved)throw new HttpError(409,'La figura cambió. Recarga antes de editarla.');
      // Unknown stock has no numeric delta; audit the first explicit confirmation separately.
      if(previous.stock!==p.stock){
        const commerce=(await c.query("select to_regclass('grooty_commerce.inventory_movements') exists")).rows[0].exists;
        if(commerce)await c.query('insert into grooty_commerce.inventory_movements(product_id,delta,reason) values($1,$2,$3)',[pathId,(p.stock??0)-(previous.stock??0),previous.stock===null?'stock.confirmed':p.stock===null?'stock.unknown':'manual.adjustment']);
      }
    }
    await images(c,saved.id,p.imagenes_producto);await audit(c,actor,pathId===null?'product.create':'product.update',saved.id,{revision:saved.revision});
    return {product:{...p,id:Number(saved.id),revision:saved.revision}};
  });
}
export async function archiveProduct(db,actor,pathId,body){
  if(typeof body.archived!=='boolean')throw new HttpError(400,'Estado de archivo no válido.');revision(body.revision);
  return transaction(db,async c=>{const {rows}=await c.query('update public.products set archived=$1,revision=revision+1,updated_at=now() where id=$2 and revision=$3 returning id,revision',[body.archived,pathId,body.revision]);if(!rows.length)throw new HttpError(409,'La figura cambió. Recarga antes de editarla.');await audit(c,actor,'product.archive',pathId,{archived:body.archived});return {ok:true};});
}
export async function saveBrand(db,actor,body){const name=brand(body.name);return transaction(db,async c=>{await c.query('insert into public.brands(name,slug) values($1,$2)',[name,slug(name)]);await audit(c,actor,'brand.create',name);return {brand:name};});}
export async function saveSettings(db,actor,body){const value=settings(body);return transaction(db,async c=>{
  // Storefront revision is separate from product revisions.
  const previous=(await c.query("select revision from public.store_settings where key='storefront' for update")).rows[0];
  if(!previous)throw new HttpError(503,'Importa primero la configuración de tienda.');
  if(!Number.isInteger(body.settingsRevision)||body.settingsRevision!==previous.revision)throw new HttpError(409,'El contenido cambió. Recarga antes de guardarlo.');
  if(value.heroIds.length){const {rows}=await c.query('select id from public.products where id=any($1::bigint[]) and published=true and archived=false',[value.heroIds]);if(rows.length!==value.heroIds.length)throw new HttpError(400,'Los destacados deben estar publicados.');}
  await c.query("update public.store_settings set value=$1,revision=revision+1,updated_at=now() where key='storefront'",[JSON.stringify(value)]);await audit(c,actor,'settings.update','storefront');return {ok:true};
});}
