import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const catalogPath = new URL('../../frontend/src/data/catalog.json', import.meta.url);
const source = readFileSync(catalogPath,'utf8');
const products = JSON.parse(source);
const slug = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
const sql = v => v == null ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g,"''")}'`;
const brands = [...new Set(products.map(p=>p.marca))];
const lines = [
  '-- IMPORTACIÓN INICIAL, NO ES UN DUMP DE LA BASE ORIGINAL.',
  '-- Ejecutar schema.sql primero, únicamente en una base NUEVA y vacía.',
  '-- No incluye usuarios, sesiones ni archivos de imagen; conserva sus URLs públicas.',
  `-- Catálogo SHA256: ${createHash('sha256').update(source).digest('hex')}`,
  'BEGIN;',
  `DO $$ BEGIN IF EXISTS (SELECT 1 FROM public.products) OR EXISTS (SELECT 1 FROM public.brands) OR EXISTS (SELECT 1 FROM public.store_settings) THEN RAISE EXCEPTION 'Importación inicial: la base debe estar vacía. No se sobrescribieron datos.'; END IF; END $$;`
];
for (const brand of brands) lines.push(`INSERT INTO public.brands (name,slug) VALUES (${sql(brand)},${sql(slug(brand))});`);
for (const p of products) {
  lines.push(`INSERT INTO public.products (id,sku,brand_id,title,slug,condition,sale_type,price,reservation_price,stock,published,archived,revision,franchise,character_name,includes_text,box_note,description) VALUES (${sql(p.id)},${sql(p.sku)},(SELECT id FROM public.brands WHERE name=${sql(p.marca)}),${sql(p.titulo)},${sql(slug(p.titulo)+'-'+p.id)},${sql(p.estado)},${sql(p.tipo)},${sql(p.precio)},${sql(p.precio_reserva)},${sql(p.stock)},true,false,1,${sql(p.franchise)},${sql(p.character_name)},${sql(p.includes_text)},${sql(p.box_note)},${sql(p.description)});`);
  for (const image of p.imagenes_producto) lines.push(`INSERT INTO public.product_images (product_id,url,position) VALUES (${sql(p.id)},${sql(image.url)},${sql(image.posicion ?? 0)});`);
}
const settings = {heroIds:[103,101,100,99,95],whatsapp:'51936804577',cinema:{enabled:true,title:'Avengers: Doomsday',summary:'Del próximo universo en pantalla a tu próxima pieza en colección. Descubre figuras de personajes de Marvel en nuestro catálogo.',videoId:'gcjnEYJ4OB8',source:'https://prensa.disney.es/noticias/yadisponibleelnuevotr%C3%A1ilerdevengadores:doomsdaypresentadodurantelad23:theultimatedisneyfanevent',query:'Doom'}};
lines.push(`INSERT INTO public.store_settings (key,value) VALUES ('storefront',${sql(JSON.stringify(settings))}::jsonb);`);
lines.push("SELECT setval(pg_get_serial_sequence('public.products','id'),(SELECT max(id) FROM public.products),true);",'COMMIT;','');
writeFileSync(new URL('../seed-catalog.sql',import.meta.url),lines.join('\n'));
console.log(`Importación inicial generada: ${products.length} productos, ${brands.length} marcas, ${products.reduce((n,p)=>n+p.imagenes_producto.length,0)} URLs de imágenes. No se contactó ninguna base.`);
