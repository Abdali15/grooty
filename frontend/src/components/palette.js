import { esc, $, $$, debounce } from "../lib/dom.js";
import { money, norm } from "../lib/format.js";
import { icons } from "../lib/icons.js";
import { thumb } from "../lib/images.js";
import { getProduct, latest, products } from "../data.js";
import { ensureFuse, searchIds, didYouMean, SUGGESTIONS } from "../search.js";
import { recentSearches, pushSearch, clearSearches } from "../store.js";
import { openOverlay, overlayPanel, overlayKind, closeOverlay } from "./overlay.js";
import { track } from "../analytics.js";
import { navigate } from "../router.js";

let active = -1;
let results = [];
let query = "";

const row = (p, i) => `<a class="pal-row" role="option" id="pal-opt-${i}" aria-selected="false" data-i="${i}" href="${p.url}" data-pal-go="${p.id}" tabindex="-1">
  ${thumb(p.image, 120)}
  <span class="pal-info"><span class="pal-name">${esc(p.name)}</span><span class="pal-sub">${esc(p.brand)}${p.line ? " · " + esc(p.line) : ""}</span></span>
  <span class="pal-side"><span class="pal-price">${money(p.precio)}</span><span class="pal-state ${p.isPre ? "is-pre" : ""}">${p.isPre ? "Preventa" : esc(p.estado)}</span></span>
</a>`;

function chips(list) {
  return list.map((s) => `<button type="button" class="chip" data-pal-q="${esc(s.q ?? s)}">${esc(s.label ?? s)}</button>`).join("");
}

function idle() {
  const rec = recentSearches();
  return `${rec.length ? `<div class="pal-block"><div class="pal-block-head"><p>Búsquedas recientes</p><button type="button" class="link-btn" data-pal-clear>Borrar</button></div><div class="chip-row">${chips(rec)}</div></div>` : ""}
    <div class="pal-block"><p class="pal-block-title">Prueba con</p><div class="chip-row">${chips(SUGGESTIONS)}</div></div>
    <div class="pal-block"><p class="pal-block-title">Recién llegadas</p><div class="pal-list" role="listbox" aria-label="Recién llegadas">${latest(4).map((p, i) => row(p, i)).join("")}</div></div>`;
}

function paint() {
  const panel = overlayPanel();
  if (!panel || overlayKind() !== "palette") return;
  const body = $("#pal-body", panel);
  const input = $("#pal-input", panel);
  const q = query.trim();
  if (!q) {
    results = latest(4);
    body.innerHTML = idle();
    active = -1;
  } else {
    const ids = searchIds(q);
    results = ids.slice(0, 8).map((r) => getProduct(r.id));
    if (!results.length) {
      const guess = didYouMean(q);
      body.innerHTML = `<div class="pal-empty"><p class="empty-title">No encontramos “${esc(q)}”</p>
        ${guess ? `<p class="empty-sub">¿Quisiste decir <button type="button" class="link-inline" data-pal-q="${esc(guess.name)}">${esc(guess.name)}</button>?</p><div class="pal-list" role="listbox">${row(guess, 0)}</div>` : `<p class="empty-sub">Prueba con otra palabra, una marca o el nombre del personaje.</p>`}
        <div class="chip-row">${chips(SUGGESTIONS)}</div></div>`;
      results = guess ? [guess] : [];
    } else {
      body.innerHTML = `<div class="pal-list" role="listbox" aria-label="Resultados">${results.map(row).join("")}</div>
        ${ids.length > results.length ? `<a class="pal-all" href="/catalogo?q=${encodeURIComponent(q)}" data-pal-all>Ver los ${ids.length} resultados en el catálogo ${icons.arrow}</a>` : ""}`;
    }
    active = results.length ? 0 : -1;
  }
  input.setAttribute("aria-expanded", results.length ? "true" : "false");
  setActive(active);
  announce();
}

function announce() {
  const live = $("#pal-live", overlayPanel());
  if (!live) return;
  const q = query.trim();
  live.textContent = q ? (results.length ? `${results.length} resultados` : "Sin resultados") : "";
}

function setActive(i) {
  const panel = overlayPanel();
  if (!panel) return;
  const opts = $$('[role="option"]', panel);
  if (!opts.length) {
    active = -1;
    $("#pal-input", panel).removeAttribute("aria-activedescendant");
    return;
  }
  active = (i + opts.length) % opts.length;
  opts.forEach((o, n) => o.setAttribute("aria-selected", n === active));
  const cur = opts[active];
  $("#pal-input", panel).setAttribute("aria-activedescendant", cur.id);
  cur.scrollIntoView({ block: "nearest" });
}

function go(id) {
  const p = getProduct(id);
  if (!p) return;
  if (query.trim()) pushSearch(query);
  track("search", { q: query.trim(), results: results.length, picked: p.id });
  closeOverlay({ immediate: true, restore: false });
  navigate(p.url);
}

export function openPalette(prefill = "") {
  query = prefill;
  const panel = openOverlay({
    kind: "palette",
    label: "Buscar figuras",
    focus: "#pal-input",
    html: `<div class="pal">
      <div class="pal-input">${icons.search}
        <input id="pal-input" type="text" role="combobox" aria-expanded="false" aria-controls="pal-body" aria-autocomplete="list" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" placeholder="Busca Gambito, Mafex, Spider-Man…" aria-label="Buscar figuras" value="${esc(prefill)}" data-autofocus>
        <button class="pal-close" type="button" data-close-overlay aria-label="Cerrar búsqueda">${icons.close}</button>
      </div>
      <div class="pal-body" id="pal-body"></div>
      <p class="sr-only" id="pal-live" aria-live="polite"></p>
      <div class="pal-foot"><span><kbd class="kbd">↑</kbd><kbd class="kbd">↓</kbd> navegar</span><span><kbd class="kbd">Enter</kbd> abrir</span><span><kbd class="kbd">Esc</kbd> cerrar</span></div>
    </div>`
  });
  const input = $("#pal-input", panel);
  const idleTrack = debounce(() => query.trim().length > 1 && track("search", { q: query.trim(), results: results.length }), 900);
  input.addEventListener("input", () => {
    query = input.value;
    paint();
    idleTrack();
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(active + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(active - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const q = query.trim();
      if (active >= 0 && results[active]) go(results[active].id);
      else if (q) {
        pushSearch(q);
        closeOverlay({ immediate: true, restore: false });
        navigate(`/catalogo?q=${encodeURIComponent(q)}`);
      }
    }
  });
  panel.addEventListener("click", (e) => {
    const go1 = e.target.closest("[data-pal-go]");
    if (go1) {
      e.preventDefault();
      go(go1.dataset.palGo);
      return;
    }
    const all = e.target.closest("[data-pal-all]");
    if (all) {
      e.preventDefault();
      pushSearch(query);
      closeOverlay({ immediate: true, restore: false });
      navigate(all.getAttribute("href"));
      return;
    }
    const q = e.target.closest("[data-pal-q]");
    if (q) {
      query = q.dataset.palQ;
      input.value = query;
      input.focus();
      paint();
      return;
    }
    if (e.target.closest("[data-pal-clear]")) {
      clearSearches();
      paint();
    }
  });
  panel.addEventListener("mousemove", (e) => {
    const r = e.target.closest("[data-i]");
    if (r) setActive(Number(r.dataset.i));
  });
  ensureFuse().then(() => overlayPanel() === panel && query.trim() && paint());
  paint();
}
