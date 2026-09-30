import raw from '../data/catalog.json';
import { SITE } from '../config.js';
const KEY = 'grooty:v5:admin-demo';
const configured = import.meta.env.VITE_ADMIN_API_BASE || '/api/admin';
// Only a same-origin path: cookies and CSRF values never go to arbitrary servers.
const BASE = /^\/(?!\/)[a-zA-Z0-9/_-]+$/.test(configured) ? configured.replace(/\/$/, '') : '/api/admin';
let csrf = '';
export class AdminError extends Error {
  constructor(message, status = 0) { super(message); this.status = status; }
}
export async function adminRequest(path, { method = 'GET', body, signal } = {}) {
  const headers = { Accept: 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  if (method !== 'GET' && csrf) headers['X-CSRF-Token'] = csrf;
  let response;
  try { response = await fetch(BASE + path, { method, headers, credentials: 'same-origin', body: body ? JSON.stringify(body) : undefined, signal: signal || AbortSignal.timeout(10000) }); }
  catch (e) { if (e.name === 'AbortError') throw e; throw new AdminError('No se pudo contactar al servidor. Comprueba la conexión.'); }
  if (!response.headers.get('content-type')?.includes('application/json')) throw new AdminError('El backend de administración todavía no está conectado.', 503);
  const result = await response.json();
  if (!response.ok) throw new AdminError(result.error || 'No se pudo completar la operación.', response.status);
  return result;
}
export function acceptSession(session) {
  if (!session?.user || !['owner', 'admin'].includes(session.user.role) || typeof session.csrf !== 'string' || session.csrf.length < 16) throw new AdminError('Esta cuenta no tiene acceso de propietario.', 403);
  csrf = session.csrf;
  return session.user;
}
export function clearSession() { csrf = ''; }
export function seedDemo() {
  return { version: 1, products: raw.map(p => ({ ...structuredClone(p), stock: null, published: true, archived: false, revision: 0 })), brands: [...new Set(raw.map(p => p.marca))], settings: { heroIds: [...SITE.heroIds] } };
}
export function safeImageUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return false;
  if (/^\/(?!\/)[a-zA-Z0-9/_ .-]+\.(webp|png|jpe?g)$/i.test(value)) return true;
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password; } catch { return false; }
}
export function validateAdminProduct(input, brands) {
  if (!Number.isSafeInteger(input.id) || input.id < 1) throw new AdminError('Código interno no válido.');
  if (typeof input.titulo !== 'string' || input.titulo.trim().length < 2 || input.titulo.length > 180) throw new AdminError('Escribe un nombre de 2 a 180 caracteres.');
  if (!brands.includes(input.marca)) throw new AdminError('Selecciona una marca registrada.');
  if (!['Sellado', 'Open'].includes(input.estado) || !['venta', 'preventa'].includes(input.tipo)) throw new AdminError('Revisa estado y modalidad.');
  if (!Number.isFinite(input.precio) || input.precio <= 0 || input.precio > 999999) throw new AdminError('El precio debe ser mayor a cero.');
  if (input.stock !== null && (!Number.isInteger(input.stock) || input.stock < 0 || input.stock > 9999)) throw new AdminError('Stock: usa un entero entre 0 y 9999, o déjalo por confirmar.');
  if (input.tipo === 'preventa' && input.precio_reserva !== null && (!Number.isFinite(input.precio_reserva) || input.precio_reserva < 0 || input.precio_reserva > input.precio)) throw new AdminError('La reserva no puede superar el precio total.');
  if (!Array.isArray(input.imagenes_producto) || input.imagenes_producto.length < 1 || input.imagenes_producto.length > 8 || input.imagenes_producto.some(i => !safeImageUrl(i.url))) throw new AdminError('Añade de 1 a 8 imágenes con una URL HTTPS válida.');
  for (const key of ['description', 'includes_text', 'box_note', 'franchise', 'character_name']) if (typeof input[key] !== 'string' || input[key].length > 3000) throw new AdminError('Revisa los datos y limita cada texto a 3000 caracteres.');
  if (typeof input.sku !== 'string' || input.sku.length > 64) throw new AdminError('El código SKU admite hasta 64 caracteres.');
  if (typeof input.published !== 'boolean' || typeof input.archived !== 'boolean' || !Number.isInteger(input.revision) || input.revision < 0) throw new AdminError('Publicación o versión no válida.');
  return { ...input, titulo: input.titulo.trim(), precio: Math.round(input.precio * 100) / 100, precio_reserva: input.tipo === 'venta' ? null : input.precio_reserva };
}
export function loadDemo() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY));
    if (value?.version === 1 && Array.isArray(value.products) && Array.isArray(value.brands) && value.settings && value.brands.every(b => typeof b === 'string' && b.length <= 60)) {
      value.products = value.products.map(p => validateAdminProduct({ description: '', includes_text: '', box_note: '', franchise: '', character_name: '', ...p }, value.brands));
      return value;
    }
  } catch {}
  return seedDemo();
}
export function saveDemo(value) {
  try { localStorage.setItem(KEY, JSON.stringify(value)); }
  catch { throw new AdminError('No se pudo guardar el borrador en este navegador. Exporta una copia antes de salir.'); }
}
export function exportDemo(value) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = url; a.download = 'grooty-borrador-catalogo.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
