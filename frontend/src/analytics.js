/**
 * Capa de analítica local. Hoy solo registra (consola en desarrollo + memoria);
 * mañana se conecta a Supabase/GA cambiando `sink`.
 *
 * Eventos: view_product, card_click, quick_view, favorite_add, favorite_remove,
 * add_selection, remove_selection, search, filter_change, brand_click,
 * preorder_view, whatsapp_click
 */
const buffer = [];
let sink = null;

export function setAnalyticsSink(fn) {
  sink = typeof fn === "function" ? fn : null;
}

export function track(name, payload = {}) {
  const evt = { name, payload, at: new Date().toISOString() };
  buffer.push(evt);
  if (buffer.length > 200) buffer.shift();
  try {
    sink?.(evt);
    window.dispatchEvent(new CustomEvent("grooty:track", { detail: evt }));
  } catch {}
  if (import.meta.env.DEV) console.debug("[track]", name, payload);
}

export const trackedEvents = () => [...buffer];
