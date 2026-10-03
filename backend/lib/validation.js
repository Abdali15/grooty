import { HttpError } from './security.js';
import { validateCinema } from '../../frontend/src/lib/cinema.js';
const bad=message=>{throw new HttpError(400,message);};
function text(value,max,min=0){if(typeof value!=='string'||value.length>max||value.trim().length<min)bad('Revisa los textos de la ficha.');return value.trim();}
export function id(value){if(!/^[1-9]\d{0,14}$/.test(String(value))||!Number.isSafeInteger(Number(value)))bad('Identificador no válido.');return Number(value);}
export function revision(value){if(!Number.isSafeInteger(value)||value<0)bad('Versión no válida.');return value;}
export function imageUrl(value){try{const u=new URL(value);return typeof value==='string'&&value.length<=2048&&u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}}
export function product(v){
  const p={titulo:text(v.titulo,180,2),marca:text(v.marca,60,2),sku:text(v.sku,64,1),estado:v.estado,tipo:v.tipo,precio:v.precio,precio_reserva:v.precio_reserva,stock:v.stock,published:v.published,archived:v.archived,revision:revision(v.revision)};
  if(!['Sellado','Open'].includes(p.estado)||!['venta','preventa'].includes(p.tipo))bad('Estado o modalidad no válido.');
  if(!Number.isFinite(p.precio)||p.precio<=0||p.precio>999999)bad('Precio no válido.');
  if(p.stock!==null&&(!Number.isInteger(p.stock)||p.stock<0||p.stock>9999))bad('Stock no válido.');
  if(typeof p.published!=='boolean'||typeof p.archived!=='boolean')bad('Visibilidad no válida.');
  if(p.tipo==='venta')p.precio_reserva=null;
  else if(p.precio_reserva!==null&&(!Number.isFinite(p.precio_reserva)||p.precio_reserva<0||p.precio_reserva>p.precio))bad('Reserva no válida.');
  p.precio=Math.round(p.precio*100)/100;if(p.precio<=0)bad("El precio mínimo es S/ 0.01.");if(p.precio_reserva!==null)p.precio_reserva=Math.round(p.precio_reserva*100)/100;
  for(const key of ['description','includes_text','box_note','franchise','character_name'])p[key]=text(v[key]??'',3000);
  if(!Array.isArray(v.imagenes_producto)||v.imagenes_producto.length<1||v.imagenes_producto.length>8||v.imagenes_producto.some(i=>!i||!imageUrl(i.url)))bad('Usa entre 1 y 8 imágenes HTTPS sin credenciales.');
  p.imagenes_producto=v.imagenes_producto.map((i,posicion)=>({url:i.url,posicion}));return p;
}
export function settings(v){
  if(!Array.isArray(v.heroIds)||v.heroIds.length>5||v.heroIds.some(i=>!Number.isSafeInteger(i)||i<1)||new Set(v.heroIds).size!==v.heroIds.length)bad('Selecciona hasta cinco destacados distintos.');
  if(typeof v.whatsapp!=='string'||(v.whatsapp&&!/^[1-9]\d{7,14}$/.test(v.whatsapp)))bad('Número de WhatsApp no válido.');
  try{return {heroIds:v.heroIds,whatsapp:v.whatsapp,cinema:validateCinema(v.cinema)};}catch(e){bad(e.message);}
}
export function brand(v){return text(v,60,2);}
export function slug(value){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'figura';}
