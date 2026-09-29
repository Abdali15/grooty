import { SITE } from "../config.js";
import { money } from "./format.js";
import { summarize } from "./cart.js";
import { track } from "../analytics.js";
import { toast } from "../components/toast.js";

export const waReady = () => !!SITE.whatsappNumber;
/** Sin número en producción el CTA se convierte en "Copiar mensaje" (nunca abre un wa.me inválido). */
export const waLabel = (label) => (waReady() || import.meta.env.DEV ? label : "Copiar mensaje");

const origin = () => location.origin;

export function productMessage(p) {
  const res = p.isPre && p.precio_reserva != null ? ` (reserva ${money(p.precio_reserva)})` : "";
  return `Hola Grooty Store 👋 Quisiera consultar por esta figura:\n\n${p.brand} — ${p.titulo}\n${p.isPre ? "Preventa" : "En venta"} · ${p.estado} · ${money(p.precio)}${res}\nCódigo ${p.sku}\n${origin()}${p.url}\n\n¿Me confirman disponibilidad, pago y entrega?`;
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
