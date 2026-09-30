import { money } from './format.js';

export function normalizeFigureRequest(values) {
  const text = (key, max) => String(values[key] ?? '').trim().slice(0, max);
  const figure = text('figure', 180);
  if (figure.length < 2) throw new Error('Escribe el nombre de la figura o personaje que buscas.');
  const budgetText = text('budget', 20);
  const budget = budgetText ? Number(budgetText) : null;
  if (budget !== null && (!Number.isFinite(budget) || budget <= 0 || budget > 100000)) throw new Error('Indica un presupuesto entre S/ 0.01 y S/ 100,000 o déjalo vacío.');
  let reference = text('reference', 500);
  if (reference) {
    let url;
    try { url = new URL(reference); } catch { throw new Error('El enlace de referencia debe ser una dirección HTTPS válida.'); }
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Usa un enlace HTTPS de referencia, sin credenciales.');
    reference = url.href;
  }
  return { figure, brand: text('brand', 80), budget, reference, details: text('details', 600) };
}

export function figureRequestMessage(request, { links = true } = {}) {
  const parts = ['Hola Grooty Store 👋 ¿Pueden conseguir esta figura a pedido?', `Figura / personaje: ${request.figure}`];
  if (request.brand) parts.push(`Marca preferida: ${request.brand}`);
  if (request.budget !== null) parts.push(`Presupuesto referencial: ${money(request.budget)}`);
  if (request.details) parts.push(`Detalles: ${request.details}`);
  if (links && request.reference) parts.push(`Referencia: ${request.reference}`);
  parts.push('¿Me confirman si pueden traerla, su precio total y el plazo estimado? Entiendo que esta consulta no es una compra ni una reserva.');
  return parts.join('\n\n');
}
