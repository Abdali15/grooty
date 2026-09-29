import { esc } from "../lib/dom.js";
import { money } from "../lib/format.js";
import { icons } from "../lib/icons.js";
import { stage } from "../lib/images.js";
import { isFavorite } from "../store.js";

const SIZES = "(min-width:1200px) 300px, (min-width:768px) 31vw, 47vw";

export function badge(p) {
  if (p.isPre) return `<span class="badge badge--pre">Preventa</span>`;
  return `<span class="badge ${p.isOpen ? "badge--open" : "badge--sealed"}">${esc(p.estado)}</span>`;
}

export function heartButton(p, cls = "") {
  const on = isFavorite(p.id);
  return `<button class="fav-btn ${cls}" type="button" data-fav="${p.id}" aria-pressed="${on}" aria-label="${on ? "Quitar de favoritos" : "Guardar en favoritos"}: ${esc(p.name)}">${icons.heart}<span class="fav-burst" aria-hidden="true"></span></button>`;
}

export function priceBlock(p, { compact = false } = {}) {
  return `<p class="price">${p.isPre ? '<span class="sr-only">Precio total </span>' : ""}${money(p.precio)}</p>${p.isPre && p.precio_reserva != null ? `<p class="reserve">Reserva ${money(p.precio_reserva)}</p>` : ""}`;
}

export function addButton(p, cls = "") {
  return `<button class="add-btn ${cls}" type="button" data-add="${p.id}" aria-label="Añadir ${esc(p.name)} a Mi selección"><span class="add-ico add-ico--plus">${icons.plus}</span><span class="add-ico add-ico--check">${icons.check}</span></button>`;
}

export function productCard(p, { eager = false, sizes = SIZES, extra = "" } = {}) {
  const tone = p.isPre ? "pre" : p.isOpen ? "open" : "sale";
  return `<article class="card ${extra}" data-id="${p.id}" data-tone="${tone}">
    <div class="card-tile">
      <a class="card-cover" href="${p.url}" data-nav data-card tabindex="-1" aria-hidden="true"></a>
      ${stage(p.image, "", { sizes, eager })}
      ${badge(p)}
      ${heartButton(p)}
      <button class="quick-btn" type="button" data-quick="${p.id}" aria-label="Vista rápida: ${esc(p.name)}"><span class="quick-ico">${icons.eye}</span><span class="quick-txt">Vista rápida</span></button>
    </div>
    <div class="card-body">
      <p class="card-brand">${esc(p.brand)}</p>
      <h3 class="card-title"><a href="${p.url}" data-nav data-card>${esc(p.name)}</a></h3>
      <p class="card-line">${esc(p.line || (p.isPre ? `Estado: ${p.estado}` : "Figura de colección"))}</p>
      <div class="card-foot">
        <div class="card-price">${priceBlock(p)}</div>
        ${addButton(p)}
      </div>
    </div>
  </article>`;
}

/** Carrusel nativo (scroll-snap) con flechas y arrastre en desktop */
export function rail(items, { label, dark = false, eager = false } = {}) {
  return `<div class="rail-wrap ${dark ? "on-dark" : ""}" data-rail>
    <div class="rail" role="group" aria-roledescription="carrusel" aria-label="${esc(label)}" tabindex="0">
      ${items.map((p, i) => `<div class="rail-item">${productCard(p, { eager: eager && i < 2, sizes: "(min-width:1200px) 290px, (min-width:768px) 30vw, 62vw" })}</div>`).join("")}
    </div>
    <div class="rail-nav">
      <button class="round-btn" type="button" data-rail-prev aria-label="Anterior">${icons.arrowLeft}</button>
      <button class="round-btn" type="button" data-rail-next aria-label="Siguiente">${icons.arrow}</button>
    </div>
  </div>`;
}

export function sectionHead({ title, sub = "", action = "", level = 2 }) {
  return `<div class="section-head" data-reveal>
    <div><h${level} class="h-section">${title}</h${level}>${sub ? `<p class="section-sub">${sub}</p>` : ""}</div>
    ${action ? `<div class="section-action">${action}</div>` : ""}
  </div>`;
}
