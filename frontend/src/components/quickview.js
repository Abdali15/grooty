import { esc } from "../lib/dom.js";
import { money } from "../lib/format.js";
import { icons } from "../lib/icons.js";
import { stage } from "../lib/images.js";
import { getProduct } from "../data.js";
import { PREORDER_STEPS } from "../config.js";
import { badge, heartButton, priceBlock } from "./card.js";
import { openOverlay } from "./overlay.js";
import { waLabel } from "../lib/whatsapp.js";
import { track } from "../analytics.js";

export function openQuickView(id) {
  const p = getProduct(id);
  if (!p) return;
  track("quick_view", { id: p.id });
  const tone = p.isPre ? "pre" : "sale";
  const html = `<div class="qv">
    <button class="close-btn" type="button" data-close-overlay aria-label="Cerrar vista rápida">${icons.close}</button>
    <div class="qv-media card-tile" data-tone="${tone}">
      ${stage(p.image, `${p.brand} — ${p.titulo}`, { sizes: "(min-width:768px) 520px, 100vw", eager: true, widths: [480, 720, 960] })}
      ${badge(p)}
    </div>
    <div class="qv-copy">
      <p class="card-brand">${esc(p.brand)}</p>
      <h2 class="qv-title">${esc(p.name)}</h2>
      ${p.line ? `<p class="qv-line">${esc(p.line)}</p>` : ""}
      <div class="qv-price">${priceBlock(p)}</div>
      <dl class="meta-row"><div><dt>Estado</dt><dd>${esc(p.estado)}</dd></div><div><dt>Modalidad</dt><dd>${p.isPre ? "Preventa" : "Venta"}</dd></div><div><dt>Código</dt><dd>${esc(p.sku)}</dd></div></dl>
      ${p.isPre ? `<p class="qv-note">${esc(PREORDER_STEPS[0])} ${esc(PREORDER_STEPS[1])} <a href="/ayuda#preventas" data-nav>Ver condiciones completas</a></p>` : ""}
      <div class="qv-actions">
        <button class="btn btn-primary" type="button" data-add="${p.id}" data-autofocus>${icons.plus}<span>Mi selección</span></button>
        <a class="btn btn-secondary" href="${p.url}" data-nav>Ver ficha completa</a>
        ${heartButton(p, "fav-btn--inline")}
      </div>
      <button class="link-btn" type="button" data-wa="product" data-id="${p.id}">${icons.whatsapp}${waLabel("Consultar por WhatsApp")}</button>
    </div>
  </div>`;
  openOverlay({ kind: "modal", label: `Vista rápida: ${p.titulo}`, html, className: "overlay--qv" });
}
