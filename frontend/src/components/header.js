import { SITE } from "../config.js";
import { icons } from "../lib/icons.js";
import { $, $$ } from "../lib/dom.js";
import { favoriteIds, selectionCount, on } from "../store.js";

const NAV = [
  ["/catalogo", "Catálogo"],
  ["/preventas", "Preventas"],
  ["/marcas", "Marcas"],
  ["/ayuda", "Ayuda"]
];

export function renderShell() {
  return `
  ${SITE.announcement ? `<div class="announcement">${SITE.announcement}</div>` : ""}
  <header class="site-header" id="site-header">
    <div class="container navbar">
      <a href="/" data-nav class="brand" aria-label="Grooty Store — Inicio">
        <img class="brand-logo" src="${SITE.logo.src}" alt="" width="40" height="40">
        <span class="brand-word"><strong>GROOTY</strong><small>STORE</small></span>
      </a>
      <nav class="desktop-nav" aria-label="Principal">
        ${NAV.map(([href, label]) => `<a href="${href}" data-nav class="nav-link">${label}</a>`).join("")}
      </nav>
      <div class="nav-actions">
        <button class="search-pill" type="button" data-search-open aria-label="Buscar figuras (Ctrl K)">
          ${icons.search}<span class="search-pill-text">Buscar figuras</span><kbd class="kbd">Ctrl K</kbd>
        </button>
        <button class="icon-btn" type="button" data-collection="favorites" aria-label="Favoritos">${icons.heart}<span class="count" data-fav-count hidden></span></button>
        <button class="cta-pill" type="button" data-collection="selection" aria-label="Mi selección">${icons.bag}<span class="cta-txt">Mi selección</span><span class="count" data-sel-count hidden></span></button>
      </div>
    </div>
  </header>
  <nav class="bottom-nav" aria-label="Navegación móvil">
    <a href="/" data-nav data-match="/">${icons.home}<span>Inicio</span></a>
    <a href="/catalogo" data-nav data-match="/catalogo">${icons.grid}<span>Catálogo</span></a>
    <a href="/preventas" data-nav data-match="/preventas">${icons.tag}<span>Preventas</span></a>
    <button type="button" data-collection="favorites">${icons.heart}<span class="bn-count" data-fav-count hidden></span><span>Favoritos</span></button>
    <button type="button" data-collection="selection">${icons.bag}<span class="bn-count" data-sel-count hidden></span><span>Selección</span></button>
  </nav>`;
}

/* Logo original con alternativa tipográfica si el archivo no carga. */
export function loadLogo() {
  const probe = new Image();
  probe.onload = () => {
    const html = document.documentElement;
    html.classList.add("has-logo");
    if (!SITE.logo.showWordmark) html.classList.add("logo-only");
  };
  probe.onerror = () => document.documentElement.classList.add("logo-unavailable");
  probe.src = SITE.logo.src;
}

let lastSel = selectionCount();
export function updateCounts() {
  const fav = favoriteIds().length;
  const sel = selectionCount();
  $$("[data-fav-count]").forEach((el) => {
    el.textContent = fav;
    el.hidden = fav === 0;
  });
  $$("[data-sel-count]").forEach((el) => {
    el.textContent = sel;
    el.hidden = sel === 0;
    if (sel > lastSel) {
      el.classList.remove("bump");
      void el.offsetWidth;
      el.classList.add("bump");
    }
  });
  lastSel = sel;
}

export function updateActive(pathname) {
  $$(".nav-link").forEach((a) => {
    const h = a.getAttribute("href");
    const active = pathname === h || pathname.startsWith(h + "/") || (h === "/marcas" && pathname.startsWith("/marcas"));
    a.classList.toggle("active", active);
    active ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current");
  });
  $$(".bottom-nav a").forEach((a) => {
    const h = a.dataset.match;
    const active = h === "/" ? pathname === "/" : pathname === h || pathname.startsWith(h + "/");
    a.classList.toggle("active", active);
    active ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current");
  });
}

export function initHeader() {
  updateCounts();
  on("favorites", updateCounts);
  on("selection", updateCounts);
  // sombra/blur al hacer scroll (sentinel, sin listener de scroll)
  const header = $("#site-header");
  const sentinel = document.createElement("div");
  sentinel.style.cssText = "position:absolute;top:0;left:0;width:1px;height:16px;pointer-events:none";
  document.body.prepend(sentinel);
  new IntersectionObserver(([e]) => header.classList.toggle("is-stuck", !e.isIntersecting)).observe(sentinel);
  loadLogo();
}
