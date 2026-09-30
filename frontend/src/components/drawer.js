import { esc, $, $$ } from "../lib/dom.js";
import { money } from "../lib/format.js";
import { icons } from "../lib/icons.js";
import { thumb } from "../lib/images.js";
import { getProduct, latest } from "../data.js";
import { PREORDER_STEPS, SITE } from "../config.js";
import { favoriteIds, qtyOf, selectionLimit, setQty, selectionCount, on, snapshotSelection, restoreSelection, clearSelection, toggleFavorite, removeFromSelection } from "../store.js";
import { summarize } from "../lib/cart.js";
import { openOverlay, overlayPanel, overlayKind, closeOverlay } from "./overlay.js";
import { toast } from "./toast.js";
import { waLabel, waContactNote, waDirectReady, selectionMessage, copyText } from "../lib/whatsapp.js";
import { track } from "../analytics.js";

let tab = "selection";
let unsubs = [];

const lineImg = (p) => `<a class="line-img" href="${p.url}" data-nav aria-label="Ver ${esc(p.name)}">${thumb(p.image, 160)}</a>`;

function selectionLine(l) {
  const { p, qty } = l;
  return `<li class="line" data-line="${p.id}">
    ${lineImg(p)}
    <div class="line-info">
      <p class="card-brand">${esc(p.brand)}${p.isPre ? ' <span class="mini-tag">Preventa</span>' : ""}</p>
      <a class="line-title" href="${p.url}" data-nav>${esc(p.name)}</a>
      <p class="line-price">${money(p.precio)}${p.isPre && p.precio_reserva != null ? ` <span>· reserva ${money(p.precio_reserva)}</span>` : ""}</p>
      <div class="qty" role="group" aria-label="Cantidad de ${esc(p.name)}">
        <button type="button" data-qty-dec="${p.id}" aria-label="Restar una unidad">${icons.minus}</button>
        <output aria-live="polite" data-qty-out="${p.id}">${qty}</output>
        <button type="button" data-qty-inc="${p.id}" aria-label="Sumar una unidad" ${qty >= selectionLimit(p.id) ? "disabled" : ""}>${icons.plus}</button>
      </div>
    </div>
    <button class="line-remove" type="button" data-remove="${p.id}" aria-label="Quitar ${esc(p.name)}">${icons.trash}</button>
  </li>`;
}
function favoriteLine(p) {
  return `<li class="line" data-line="${p.id}">
    ${lineImg(p)}
    <div class="line-info">
      <p class="card-brand">${esc(p.brand)}${p.isPre ? ' <span class="mini-tag">Preventa</span>' : ""}</p>
      <a class="line-title" href="${p.url}" data-nav>${esc(p.name)}</a>
      <p class="line-price">${money(p.precio)}</p>
      <button class="mini-btn" type="button" ${p.stock === 0 ? 'disabled' : ''} data-add="${p.id}">${icons.plus}<span>${p.stock === 0 ? 'Agotado' : `Mi selección${qtyOf(p.id) ? ` (${qtyOf(p.id)})` : ''}`}</span></button>
    </div>
    <button class="line-remove" type="button" data-unfav="${p.id}" aria-label="Quitar ${esc(p.name)} de favoritos">${icons.close}</button>
  </li>`;
}

function emptyState(kind) {
  const sugg = latest(3);
  return `<div class="empty-state">
    <p class="empty-title">${kind === "selection" ? "Tu selección está vacía" : "Aún no guardas favoritas"}</p>
    <p class="empty-sub">${kind === "selection" ? "Añade figuras con el botón + y consúltalas juntas por WhatsApp." : "Toca el corazón en cualquier figura para guardarla aquí."}</p>
    <div class="empty-actions"><a class="btn btn-primary" href="/catalogo" data-nav>Explorar el catálogo</a><a class="btn btn-secondary" href="/preventas" data-nav>Ver preventas</a></div>
    <p class="empty-hint">Recién llegadas</p>
    <ul class="lines lines--compact">${sugg.map((p) => `<li class="line">${lineImg(p)}<div class="line-info"><a class="line-title" href="${p.url}" data-nav>${esc(p.name)}</a><p class="line-price">${money(p.precio)}</p></div><button class="mini-btn mini-btn--icon" type="button" data-add="${p.id}" aria-label="Añadir ${esc(p.name)}">${icons.plus}</button></li>`).join("")}</ul>
  </div>`;
}

function summaryHTML(s) {
  return `<div class="summary">
    ${s.sale.length ? `<div class="sum-row"><span>Piezas en venta</span><strong>${money(s.saleTotal)}</strong></div>` : ""}
    ${s.pre.length ? `<div class="sum-row"><span>Preventas (precio total)</span><strong>${money(s.preTotal)}</strong></div>${s.reserveKnown ? `<p class="sum-sub">Reserva ${money(s.reserveTotal)} · saldo al llegar ${money(s.balance)}</p>` : ""}` : ""}
    <div class="sum-row sum-total"><span>Total referencial</span><strong>${money(s.total)}</strong></div>
    <p class="sum-note">Referencial: disponibilidad, pago y entrega se confirman por WhatsApp.${s.pre.length ? ` ${esc(PREORDER_STEPS[2])}` : ""}</p>
  </div>`;
}

function render(animateId = null) {
  const panel = overlayPanel();
  if (!panel || overlayKind() !== "drawer") return;
  const sel = summarize();
  const favs = favoriteIds().map(getProduct).filter(Boolean);

  $(".tabs", panel).style.setProperty("--i", tab === "selection" ? 0 : 1);
  $$('[role="tab"]', panel).forEach((t) => {
    const on = t.dataset.tab === tab;
    t.setAttribute("aria-selected", on);
    t.tabIndex = on ? 0 : -1;
  });
  $("[data-tab='selection'] .tab-n", panel).textContent = selectionCount();
  $("[data-tab='favorites'] .tab-n", panel).textContent = favs.length;

  const body = $(".drawer-body", panel);
  const foot = $(".drawer-foot", panel);
  if (tab === "selection") {
    body.innerHTML = sel.lines.length ? `<ul class="lines">${sel.lines.map(selectionLine).join("")}</ul>` : emptyState("selection");
    foot.innerHTML = sel.lines.length
      ? `${summaryHTML(sel)}
         <button class="btn btn-primary btn-block" type="button" data-wa="selection">${icons.whatsapp}<span>${waLabel("Consultar selección por WhatsApp")}</span></button>
         <p class="wa-channel-note">${esc(waContactNote())}</p>
         ${!waDirectReady() ? `<a class="link-btn" href="${esc(SITE.instagram)}" target="_blank" rel="noopener">${icons.instagram}Consulta privada por Instagram</a>` : ''}
         <div class="foot-links"><button class="link-btn" type="button" data-copy-selection>${icons.copy}Copiar selección</button><button class="link-btn link-btn--danger" type="button" data-clear-selection>Vaciar</button></div>`
      : "";
  } else {
    body.innerHTML = favs.length ? `<ul class="lines">${favs.map(favoriteLine).join("")}</ul>` : emptyState("favorites");
    foot.innerHTML = favs.length ? `<p class="sum-note">Tus favoritas se guardan en este dispositivo.</p>` : "";
  }
  if (animateId) {
    const out = $(`[data-qty-out="${animateId}"]`, panel);
    out?.classList.remove("tick");
    void out?.offsetWidth;
    out?.classList.add("tick");
  }
}

function onClick(e) {
  const t = e.target.closest("button,[data-tab]");
  if (!t) return;
  if (t.dataset.tab) {
    tab = t.dataset.tab;
    render();
    return;
  }
  const inc = t.dataset.qtyInc,
    dec = t.dataset.qtyDec;
  if (inc) {
    setQty(Number(inc), qtyOf(Number(inc)) + 1);
    render(inc);
    return;
  }
  if (dec) {
    const id = Number(dec);
    if (qtyOf(id) <= 1) return removeLine(id);
    setQty(id, qtyOf(id) - 1);
    render(dec);
    return;
  }
  if (t.dataset.remove) return removeLine(Number(t.dataset.remove));
  if (t.dataset.unfav) {
    toggleFavorite(Number(t.dataset.unfav));
    track("favorite_remove", { id: Number(t.dataset.unfav) });
    render();
    return;
  }
  if (t.hasAttribute("data-copy-selection")) {
    copyText(selectionMessage({ links: true })).then((ok) => toast(ok ? "Selección copiada" : "No se pudo copiar"));
    return;
  }
  if (t.hasAttribute("data-clear-selection")) {
    const snap = snapshotSelection();
    clearSelection();
    render();
    toast("Selección vaciada", { action: { label: "Deshacer", fn: () => restoreSelection(snap) } });
  }
}

function removeLine(id) {
  const snap = snapshotSelection();
  const li = $(`[data-line="${id}"]`, overlayPanel());
  const finish = () => {
    removeFromSelection(id);
    track("remove_selection", { id });
    render();
    toast("Quitada de tu selección", { action: { label: "Deshacer", fn: () => restoreSelection(snap) } });
  };
  if (li && !matchMedia("(prefers-reduced-motion: reduce)").matches && !document.documentElement.classList.contains("no-motion")) {
    li.classList.add("is-leaving");
    setTimeout(finish, 200);
  } else finish();
}

export function openCollection(which = "selection") {
  tab = which === "favorites" ? "favorites" : "selection";
  const panel = openOverlay({
    kind: "drawer",
    label: "Mi colección",
    focus: "[data-autofocus]",
    onClose: () => {
      unsubs.forEach((u) => u());
      unsubs = [];
    },
    html: `<div class="drawer-head"><h2 class="h-drawer">Mi colección</h2><button class="close-btn" type="button" data-close-overlay aria-label="Cerrar">${icons.close}</button></div>
      <div class="tabs" role="tablist" aria-label="Mi colección" style="--i:0">
        <span class="tab-ind" aria-hidden="true"></span>
        <button class="tab" role="tab" type="button" data-tab="selection" data-autofocus>Selección <span class="tab-n">0</span></button>
        <button class="tab" role="tab" type="button" data-tab="favorites">Favoritos <span class="tab-n">0</span></button>
      </div>
      <div class="drawer-body"></div>
      <div class="drawer-foot"></div>`
  });
  panel.addEventListener("click", onClick);
  panel.addEventListener("keydown", (e) => {
    if (!e.target.matches('[role="tab"]')) return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      tab = tab === "selection" ? "favorites" : "selection";
      render();
      $(`[data-tab="${tab}"]`, panel).focus();
    }
  });
  unsubs = [on("selection", () => render()), on("favorites", () => render())];
  render();
}

export const refreshDrawer = () => render();
