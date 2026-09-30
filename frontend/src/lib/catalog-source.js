import original from '../data/catalog.json';
import { SITE } from '../config.js';
import { validateCinema } from './cinema.js';
let catalog = original;
export const catalogSource = () => catalog;
export function validatePublicCatalog(value) {
  if (!value || !Array.isArray(value.products) || value.products.length > 10000) throw Error('Catálogo inválido');
  const ids = new Set();
  return value.products.filter(p => p.published !== false && !p.archived).map(p => {
    if (!Number.isSafeInteger(p.id) || p.id < 1 || ids.has(p.id)) throw Error('ID inválido');
    ids.add(p.id);
    if (typeof p.titulo !== 'string' || !p.titulo.trim() || typeof p.marca !== 'string' || !p.marca.trim()) throw Error('Producto inválido');
    if (!['Sellado','Open'].includes(p.estado) || !['venta','preventa'].includes(p.tipo) || !Number.isFinite(p.precio) || p.precio <= 0) throw Error('Datos comerciales inválidos');
    if (p.stock != null && (!Number.isInteger(p.stock) || p.stock < 0)) throw Error('Stock inválido');
    if (!Array.isArray(p.imagenes_producto) || !p.imagenes_producto.length || p.imagenes_producto.length > 8) throw Error('Imágenes inválidas');
    for (const image of p.imagenes_producto) {
      if (typeof image.url !== 'string') throw Error('Imagen inválida');
      const u = new URL(image.url,'https://grooty.invalid');
      if (u.protocol !== 'https:' || u.username || u.password) throw Error('URL inválida');
    }
    if (p.tipo === 'preventa' && p.precio_reserva != null && (!Number.isFinite(p.precio_reserva) || p.precio_reserva < 0 || p.precio_reserva > p.precio)) throw Error('Reserva inválida');
    return {...p, stock: p.stock ?? null};
  });
}
export async function loadPublicCatalog() {
  const path = import.meta.env.VITE_CATALOG_API;
  if (!path) return;
  if (!/^\/(?!\/)[a-zA-Z0-9/_-]+$/.test(path)) { console.warn('[catalog] Se requiere una ruta de API del mismo origen.'); return; }
  try {
    const response = await fetch(path,{headers:{Accept:'application/json'},credentials:'same-origin',signal:AbortSignal.timeout(7000),cache:'no-store'});
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw Error('No disponible');
    const value = await response.json(); const next = validatePublicCatalog(value);
    catalog = next;
    const settings = value.settings || {};
    if (Array.isArray(settings.heroIds)) SITE.heroIds = [...new Set(settings.heroIds)].filter(id=>next.some(p=>p.id===id));
    if (typeof settings.whatsapp === 'string' && /^[1-9]\d{7,14}$/.test(settings.whatsapp)) SITE.whatsappNumber = settings.whatsapp;
    if (settings.cinema) { try { SITE.cinema=validateCinema(settings.cinema); } catch { SITE.cinema.enabled=false; } }
  } catch {
    SITE.announcement = 'No pudimos actualizar el catálogo en este momento. Confirma precio y disponibilidad con la tienda.';
  }
}
