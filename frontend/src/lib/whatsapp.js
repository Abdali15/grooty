import { SITE } from "../config.js";
import { money } from "./format.js";
import { summarize } from "./cart.js";
import { track } from "../analytics.js";
import { toast } from "../components/toast.js";

export const waDirectReady = () => /^[1-9]\d{7,14}$/.test(SITE.whatsappNumber);
export const waReady = () => waDirectReady() || !!SITE.whatsappGroup;
/** Si falta un chat directo se usa el grupo oficial; sin ningún canal, se ofrece copiar. */
export const waLabel = (label) => waDirectReady() ? label : SITE.whatsappGroup ? "Consultar en el grupo" : "Copiar mensaje";
export const waContactNote = () => waDirectReady()
  ? "Se abrirá el chat privado con tu consulta. Tú decides cuándo enviarla."
  : SITE.whatsappGroup
    ? "WhatsApp abre el grupo de la tienda. Tu consulta se copia para pegarla allí y será visible para sus integrantes."
    : "Prepararemos tu consulta para copiarla. También puedes contactar con la tienda por Instagram.";

const origin = () => location.origin;

export function productMessage(p) {
  const res = p.isPre && p.precio_reserva != null ? ` (reserva ${money(p.precio_reserva)})` : "";
  return `Hola Grooty Store 👋 Quisiera consultar por esta figura:\n\n${p.brand} — ${p.titulo}\n${p.isPre ? "Preventa" : "En venta"} · ${p.estado} · ${money(p.precio)}${res}\nCódigo ${p.sku}\n${origin()}${p.url}\n\n¿Me confirman disponibilidad, pago y entrega?`;
}

export function productDetailsMessage(p) {
  return `${productMessage(p)}\n\nTambién quisiera fotos adicionales de la figura y la caja, confirmar los accesorios incluidos y cualquier detalle de su estado.${p.isPre ? ' ¿Cuál es el plazo estimado de llegada?' : ''}`;
}

export function selectionMessage({ links = true } = {}) {
  const s = summarize();
  const row = (l) => {
    let t = `${l.qty}× ${l.p.brand} — ${l.p.titulo} — ${money(l.p.precio)}`;
    if (l.p.isPre && l.p.precio_reserva != null) t += `\n   Reserva ${money(l.p.precio_reserva)} · Saldo ${money(l.p.precio - l.p.precio_reserva)}`;
    if (links) t += `\n   ${origin()}${l.p.url}`;
    return t;
  };
  const parts = ["Hola Grooty Store 👋 Quisiera consultar por esta selección:"];
  if (s.sale.length) parts.push(`EN VENTA\n${s.sale.map(row).join("\n")}`);
  if (s.pre.length) parts.push(`PREVENTA\n${s.pre.map(row).join("\n")}`);
  const tot = [];
  if (s.sale.length) tot.push(`Piezas en venta: ${money(s.saleTotal)}`);
  if (s.pre.length && s.reserveKnown) tot.push(`Reservas de preventa: ${money(s.reserveTotal)}`);
  tot.push(`Total referencial: ${money(s.total)}`);
  parts.push(tot.join("\n"));
  parts.push("¿Me confirman disponibilidad, pago y entrega?");
  return parts.join("\n\n");
}

export const generalMessage = () => "Hola Grooty Store 👋 Quisiera hacer una consulta sobre sus figuras.";

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;opacity:0;top:0;left:0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/** Abre WhatsApp con el mensaje. `build(links)` permite reintentar sin enlaces si la URL es muy larga. */
export async function sendWhatsApp(build, source) {
  track("whatsapp_click", { source });
  const text = build(true);
  if (!waDirectReady() && SITE.whatsappGroup) {
    // Abre durante el gesto del usuario, antes del await, para evitar bloqueo de popups.
    window.open(SITE.whatsappGroup, "_blank", "noopener");
    const ok = await copyText(text);
    toast(ok ? "Abrimos el grupo de WhatsApp. Tu consulta se copió para que puedas pegarla allí." : "Abrimos el grupo de WhatsApp. Copia tu consulta desde la vista previa.");
    return;
  }
  if (!waReady()) {
    const ok = await copyText(text);
    toast(
      import.meta.env.DEV
        ? "Falta el número: edita whatsappNumber en src/config.js. El mensaje se copió."
        : ok
          ? "Mensaje copiado. Pégalo en WhatsApp o escríbenos por Instagram."
          : "No se pudo copiar el mensaje."
    );
    return;
  }
  const base = `https://wa.me/${SITE.whatsappNumber}`;
  let url = `${base}?text=${encodeURIComponent(text)}`;
  if (url.length > 1900) url = `${base}?text=${encodeURIComponent(build(false))}`;
  if (url.length > 1900) {
    await copyText(build(false));
    toast("La selección es larga: copiamos el mensaje. Pégalo en el chat.");
    window.open(base, "_blank", "noopener");
    return;
  }
  window.open(url, "_blank", "noopener");
}
