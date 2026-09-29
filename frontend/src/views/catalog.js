import { esc, $, $$, debounce, isDesktopWidth, motionAllowed } from "../lib/dom.js";
import { plural, money } from "../lib/format.js";
import { icons } from "../lib/icons.js";
import { products, brands, brandBySlug, preorders, PRICE_BUCKETS } from "../data.js";
import { productCard } from "../components/card.js";
import { preorderSteps, breadcrumb, keepExploring } from "../components/blocks.js";
import { openOverlay, overlayKind, overlayPanel, closeOverlay } from "../components/overlay.js";
import { parseFilters, toQuery, applyFilters, facets, emptyFilters, activeCount, SORTS } from "../filters.js";
import { ensureFuse, didYouMean } from "../search.js";
import { replaceQuery, getViewState, setViewState } from "../router.js";
import { motion, EASE } from "../motion/index.js";
import { track } from "../analytics.js";
import { notFoundHTML } from "./notfound.js";
import { probeWithin } from "../lib/images.js";

const PAGE = 24;

/* ───────────── HTML ───────────── */
function pageHead(kind, brand) {
  const total = products.length;
  if (kind === "brand") {
    return `<header class="page-head container" data-reveal>
      ${breadcrumb([{ label: "Marcas", href: "/marcas" }, { label: brand.name }])}
      <div class="page-head-row"><h1 class="h-page" data-split>${esc(brand.name)}</h1>
      <p class="page-sub">${plural(brand.count, "figura", "figuras")}${brand.preCount ? ` · ${brand.preCount} en preventa` : ""}</p></div>
    </header>`;
  }
  if (kind === "preorders") {
    return `<header class="page-head page-head--pre container">
      <div class="page-head-row" data-reveal><h1 class="h-page" data-split>Preventas</h1>
      <p class="page-sub">${plural(preorders.length, "figura", "figuras")} para reservar. Cada ficha indica el monto de reserva.</p></div>
      <div class="pre-policy"><h2 class="h-mini">Cómo funcionan</h2>${preorderSteps({ compact: true })}</div>
    </header>`;
  }
  return `<header class="page-head container" data-reveal>
    <div class="page-head-row"><h1 class="h-page" data-split>Catálogo</h1>
    <p class="page-sub">${plural(total, "figura", "figuras")} · ${preorders.length} en preventa</p></div>
  </header>`;
}

function toolbarHTML(f, fixed, kind) {
  const n = activeCount(f, fixed);
  const sortVal = f.orden || (f.q ? "relevancia" : "novedades");
  const opts = [...(f.q ? [{ key: "relevancia", label: "Más relevantes" }] : []), ...SORTS];
  return `<div class="toolbar-wrap" data-toolbar>
    <div class="container toolbar">
      <div class="toolbar-row">
        <label class="search-field">${icons.search}<span class="sr-only">Buscar figuras</span>
          <input id="cat-q" type="search" inputmode="search" enterkeyhint="search" autocomplete="off" spellcheck="false" placeholder="Buscar figuras, personajes o marcas" value="${esc(f.q)}">
          <button class="clear-q" type="button" data-clear-q aria-label="Borrar búsqueda" ${f.q ? "" : "hidden"}>${icons.close}</button>
        </label>
        <div class="filter-anchor">
          <button class="tool-btn" type="button" data-filters-open aria-haspopup="dialog" aria-expanded="false" aria-controls="filter-pop">${icons.sliders}<span>Filtros</span><span class="count" data-filter-n ${n ? "" : "hidden"}>${n}</span></button>
          <div class="filter-pop" id="filter-pop" role="dialog" aria-label="Filtros" hidden><div data-filter-body></div></div>
        </div>
        <label class="sort-field"><span class="sr-only">Ordenar por</span>
          <select id="cat-sort" aria-label="Ordenar por">${opts.map((o) => `<option value="${o.key}" ${o.key === sortVal ? "selected" : ""}>${o.label}</option>`).join("")}</select>${icons.chevron}
        </label>
      </div>
      <div class="toolbar-row toolbar-row--2">
        ${kind === "preorders" ? "" : `<div class="segment" role="group" aria-label="Tipo de venta" data-segment></div>`}
        <div class="chip-row chips-active" data-chips aria-label="Filtros activos"></div>
      </div>
    </div>
  </div>`;
}

function segmentHTML(f, fx) {
  const cur = f.modo;
  const b = (val, label, n) => `<button type="button" class="seg ${cur === val ? "is-on" : ""}" data-modo="${val}" aria-pressed="${cur === val}">${label}<span class="seg-n">${n}</span></button>`;
  return b("", "Todas", fx.modo.all) + b("venta", "Venta", fx.modo.venta) + b("preventa", "Preventas", fx.modo.preventa);
}

function chipsHTML(f, fixed) {
  const chips = [];
  if (!fixed.marca) f.marcas.forEach((s) => chips.push([`marca:${s}`, brandBySlug(s)?.name || s]));
  f.estados.forEach((s) => chips.push([`estado:${s}`, s === "open" ? "Open" : "Sellado"]));
  if (f.precio) chips.push([`precio:${f.precio}`, PRICE_BUCKETS.find((b) => b.key === f.precio)?.label]);
  const html = chips.map(([k, l]) => `<button type="button" class="chip chip--on" data-chip="${k}" aria-label="Quitar filtro ${esc(l)}">${esc(l)}${icons.close}</button>`).join("");
  return html + (chips.length > 1 ? `<button type="button" class="link-btn" data-clear-all>Limpiar todo</button>` : "");
}

function panelHTML(f, fixed, fx, kind) {
  const opt = (facet, value, label, n, on) =>
    `<button type="button" class="opt" data-facet="${facet}" data-value="${value}" data-key="${facet}:${value}" aria-pressed="${on}" ${n === 0 && !on ? "disabled" : ""}><span>${esc(label)}</span><span class="opt-n">${n}</span></button>`;
  return `${fixed.marca ? "" : `<div class="facet"><h3 class="facet-title">Marca</h3><div class="facet-opts">${brands.map((b) => opt("marca", b.slug, b.name, fx.brand[b.slug] || 0, f.marcas.includes(b.slug))).join("")}</div></div>`}
    <div class="facet"><h3 class="facet-title">Estado</h3><div class="facet-opts">${opt("estado", "sellado", "Sellado", fx.estado.sellado, f.estados.includes("sellado"))}${opt("estado", "open", "Open", fx.estado.open, f.estados.includes("open"))}</div></div>
    <div class="facet"><h3 class="facet-title">Precio</h3><div class="facet-opts">${PRICE_BUCKETS.map((b) => opt("precio", b.key, b.label, fx.precio[b.key], f.precio === b.key)).join("")}</div></div>`;
}

function makeView(kind) {
  const fixedFor = (params) => (kind === "brand" ? { marca: params.slug } : kind === "preorders" ? { modo: "preventa" } : {});

  return {
    render(ctx) {
      const brand = kind === "brand" ? brandBySlug(ctx.params.slug) : null;
      if (kind === "brand" && !brand) return notFoundHTML();
      const fixed = fixedFor(ctx.params);
      const f = parseFilters(ctx.search);
      if (fixed.marca) f.marcas = [];
      const universe = applyFilters(emptyFilters(), fixed);
      const list = applyFilters(f, fixed);
      const limit = Math.max(PAGE, ctx.state?.count || PAGE);
      const visible = new Set(list.slice(0, limit).map((p) => p.id));
      const ordered = [...list.slice(0, limit), ...universe.filter((p) => !visible.has(p.id))];
      const otherBrands = brands.filter((b) => b.slug !== fixed.marca);
      const title = kind === "brand" ? `${brand.name} · Grooty Store` : kind === "preorders" ? "Preventas · Grooty Store" : "Catálogo · Grooty Store";
      const description =
        kind === "brand"
          ? `${brand.count} figuras de ${brand.name} en Grooty Store. Fotos, estado y precio.`
          : kind === "preorders"
            ? "Figuras en preventa: reserva con el monto indicado. Condiciones claras."
            : `Catálogo de figuras de colección de Grooty Store: ${products.length} piezas.`;
      return {
        title,
        description,
        html: `${pageHead(kind, brand)}
        ${toolbarHTML(f, fixed, kind)}
        <section class="container catalog-body" aria-label="Resultados">
          <p class="results-line" id="results-line" aria-live="polite"></p>
          <div class="product-grid" id="grid">${ordered.map((p, i) => productCard(p, { eager: i < 4, extra: visible.has(p.id) ? "" : "is-hidden" })).join("")}</div>
          <div class="zero" id="zero" hidden></div>
          <div class="load-more" id="load-more" hidden><p id="load-note"></p><button class="btn btn-secondary" type="button" data-more>Ver más figuras</button></div>
        </section>
        <div class="container">${keepExploring({ brands: otherBrands, showPre: kind !== "preorders" })}</div>`
      };
    },

    mount(root, ctx) {
      const brand = kind === "brand" ? brandBySlug(ctx.params.slug) : null;
      if (kind === "brand" && !brand) return;
      const fixed = fixedFor(ctx.params);
      const ac = new AbortController();
      const sig = { signal: ac.signal };
      const grid = $("#grid", root);
      const els = new Map($$(".card", grid).map((el) => [Number(el.dataset.id), el]));
      probeWithin(grid);

      const S = { f: parseFilters(ctx.search), limit: Math.max(PAGE, ctx.state?.count || PAGE) };
      if (fixed.marca) S.f.marcas = [];
      let list = [];
      let Flip = null;
      let flipping = false;

      /* Flip se carga solo aquí (chunk aparte) y solo con motion activo */
      if (motionAllowed()) {
        import("gsap/Flip").then((m) => {
          Flip = m.Flip || m.default;
          motion.gsap.registerPlugin(Flip);
        }).catch(() => {});
      }

      /* ── actualizar toda la vista ── */
      function update({ animate = false, revealNew = null } = {}) {
        list = applyFilters(S.f, fixed);
        const shown = list.slice(0, S.limit);
        const showSet = new Set(shown.map((p) => p.id));
        const canFlip = animate && Flip && motion.enabled && !flipping;
        let state = null;
        if (canFlip) {
          grid.style.minHeight = grid.offsetHeight + "px";
          state = Flip.getState([...els.values()], { props: "opacity" });
        }
        // DOM en el orden visible + ocultas al final
        const frag = document.createDocumentFragment();
        shown.forEach((p) => frag.appendChild(els.get(p.id)));
        [...els.entries()].forEach(([id, el]) => !showSet.has(id) && frag.appendChild(el));
        grid.appendChild(frag);
        els.forEach((el, id) => el.classList.toggle("is-hidden", !showSet.has(id)));

        if (canFlip) {
          flipping = true;
          Flip.from(state, {
            duration: 0.55,
            ease: "power2.inOut",
            absolute: true,
            nested: false,
            stagger: 0.012,
            onEnter: (els) => motion.gsap.fromTo(els, { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.45, delay: 0.12, ease: EASE, clearProps: "opacity,transform" }),
            onLeave: (els) => motion.gsap.to(els, { opacity: 0, scale: 0.94, duration: 0.28, ease: "power2.in" }),
            onComplete: () => {
              flipping = false;
              grid.style.minHeight = "";
            }
          });
        } else if (revealNew?.length) {
          motion.revealCards(revealNew);
        }
        paintChrome(list, shown);
      }

      function paintChrome(all, shown) {
        const fx = facets(S.f, fixed);
        const line = $("#results-line", root);
        line.textContent = `${plural(all.length, "figura", "figuras")}${S.f.q ? ` para “${S.f.q}”` : ""}${all.length !== products.length && !fixed.marca && !fixed.modo ? ` de ${products.length}` : ""}`;
        const seg = $("[data-segment]", root);
        if (seg) seg.innerHTML = segmentHTML(S.f, fx);
        $("[data-chips]", root).innerHTML = chipsHTML(S.f, fixed);
        const n = activeCount(S.f, fixed);
        const badge = $("[data-filter-n]", root);
        badge.textContent = n;
        badge.hidden = !n;
        const q = $("#cat-q", root);
        if (document.activeElement !== q) q.value = S.f.q;
        $("[data-clear-q]", root).hidden = !S.f.q;
        // orden
        const sel = $("#cat-sort", root);
        const opts = [...(S.f.q ? [{ key: "relevancia", label: "Más relevantes" }] : []), ...SORTS];
        sel.innerHTML = opts.map((o) => `<option value="${o.key}">${o.label}</option>`).join("");
        sel.value = S.f.orden || (S.f.q ? "relevancia" : "novedades");
        // vacío
        const zero = $("#zero", root);
        if (!all.length) {
          const guess = S.f.q ? didYouMean(S.f.q) : null;
          zero.hidden = false;
          zero.innerHTML = `<p class="empty-title">No hay figuras con esos criterios</p>
            <p class="empty-sub">${guess ? `¿Quisiste decir <button type="button" class="link-inline" data-guess="${esc(guess.name)}">${esc(guess.name)}</button>?` : "Prueba quitando algún filtro o buscando otro nombre."}</p>
            <div class="empty-actions"><button class="btn btn-primary" type="button" data-clear-all>Limpiar filtros</button><button class="btn btn-secondary" type="button" data-surprise>${icons.dice}<span>Sorpréndeme</span></button></div>`;
        } else {
          zero.hidden = true;
          zero.innerHTML = "";
        }
        // ver más
        const more = $("#load-more", root);
        more.hidden = all.length <= shown.length;
        $("#load-note", root).textContent = `Mostrando ${shown.length} de ${all.length}`;
        // panel de filtros (si está abierto)
        renderPanel(fx);
      }

      /* ── panel de filtros: popover en desktop, hoja en móvil ── */
      const pop = $("#filter-pop", root);
      const openBtn = $("[data-filters-open]", root);
      const panelBody = () => (overlayKind() === "sheet" ? $("[data-filter-body]", overlayPanel()) : $("[data-filter-body]", pop));
      function renderPanel(fx = facets(S.f, fixed)) {
        const body = panelBody();
        if (!body || (overlayKind() !== "sheet" && pop.hidden)) return;
        const key = document.activeElement?.dataset?.key;
        body.innerHTML = panelHTML(S.f, fixed, fx, kind);
        if (key) body.querySelector(`[data-key="${key}"]`)?.focus({ preventScroll: true });
        const cta = overlayKind() === "sheet" ? $("[data-sheet-show]", overlayPanel()) : null;
        if (cta) cta.textContent = `Ver ${plural(list.length, "figura", "figuras")}`;
      }
      const closePop = (restore = true) => {
        if (pop.hidden) return;
        pop.hidden = true;
        openBtn.setAttribute("aria-expanded", "false");
        if (restore) openBtn.focus({ preventScroll: true });
      };
      function openFilters() {
        if (isDesktopWidth()) {
          if (!pop.hidden) return closePop();
          pop.hidden = false;
          openBtn.setAttribute("aria-expanded", "true");
          renderPanel();
          pop.querySelector("button:not([disabled])")?.focus({ preventScroll: true });
        } else {
          const panel = openOverlay({
            kind: "sheet",
            label: "Filtros",
            html: `<div class="sheet-head"><h2 class="h-drawer">Filtros</h2><button class="close-btn" type="button" data-close-overlay aria-label="Cerrar filtros">${icons.close}</button></div>
              <div class="sheet-body" data-filter-body></div>
              <div class="sheet-foot"><button class="link-btn" type="button" data-clear-all>Limpiar</button><button class="btn btn-primary" type="button" data-close-overlay data-sheet-show data-autofocus>Ver figuras</button></div>`
          });
          panel.addEventListener("click", onFilterClick);
          renderPanel();
        }
      }

      /* ── cambios de filtros ── */
      function commit(patch, { anim = true, evt = "filter_change" } = {}) {
        S.f = { ...S.f, ...patch };
        S.limit = PAGE;
        setViewState({ count: PAGE });
        replaceQuery(toQuery(S.f, fixed));
        update({ animate: anim });
        track(evt, { ...patch });
      }
      const toggleIn = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

      function onFilterClick(e) {
        const o = e.target.closest("[data-facet]");
        if (o) {
          const { facet, value } = o.dataset;
          if (facet === "marca") commit({ marcas: toggleIn(S.f.marcas, value) });
          if (facet === "estado") commit({ estados: toggleIn(S.f.estados, value) });
          if (facet === "precio") commit({ precio: S.f.precio === value ? "" : value });
          return;
        }
        if (e.target.closest("[data-clear-all]")) commit({ marcas: [], estados: [], precio: "", modo: "", q: "" });
      }
      pop.addEventListener("click", onFilterClick, sig);
      openBtn.addEventListener("click", openFilters, sig);

      root.addEventListener("click", (e) => {
        const modo = e.target.closest("[data-modo]");
        if (modo) return commit({ modo: modo.dataset.modo });
        const chip = e.target.closest("[data-chip]");
        if (chip) {
          const [k, v] = chip.dataset.chip.split(":");
          if (k === "marca") commit({ marcas: S.f.marcas.filter((x) => x !== v) });
          if (k === "estado") commit({ estados: S.f.estados.filter((x) => x !== v) });
          if (k === "precio") commit({ precio: "" });
          return;
        }
        if (e.target.closest("[data-clear-all]") && !e.target.closest("#filter-pop")) return commit({ marcas: [], estados: [], precio: "", modo: "", q: "" });
        if (e.target.closest("[data-clear-q]")) {
          commit({ q: "" });
          $("#cat-q", root).focus();
          return;
        }
        const g = e.target.closest("[data-guess]");
        if (g) return commit({ q: g.dataset.guess });
        if (e.target.closest("[data-more]")) {
          const before = new Set(list.slice(0, S.limit).map((p) => p.id));
          S.limit += PAGE;
          setViewState({ count: S.limit });
          const added = list.slice(0, S.limit).filter((p) => !before.has(p.id)).map((p) => els.get(p.id));
          update({ revealNew: added });
          const first = added[0]?.querySelector("a");
          first?.focus({ preventScroll: false });
        }
      }, sig);

      /* búsqueda del catálogo: Fuse se carga al enfocar */
      const q = $("#cat-q", root);
      const runSearch = debounce(() => commit({ q: q.value.trim(), orden: S.f.orden === "relevancia" ? "" : S.f.orden }, { anim: true }), 200);
      q.addEventListener("focus", () => ensureFuse().then(() => S.f.q && update()), { ...sig, once: true });
      q.addEventListener("input", runSearch, sig);
      q.addEventListener("keydown", (e) => e.key === "Escape" && q.value && ((q.value = ""), runSearch()), sig);
      $("#cat-sort", root).addEventListener("change", (e) => commit({ orden: e.target.value === "novedades" ? "" : e.target.value }), sig);

      /* cerrar popover: clic fuera / Esc */
      document.addEventListener("pointerdown", (e) => !pop.hidden && !e.target.closest(".filter-anchor") && closePop(false), sig);
      document.addEventListener("keydown", (e) => e.key === "Escape" && !pop.hidden && closePop(true), sig);

      // Fuse puede terminar de cargar mientras hay una búsqueda en la URL
      if (S.f.q) ensureFuse().then(() => update());

      update();
      motion.introCards($$(".card:not(.is-hidden)", grid));

      return () => {
        ac.abort();
        if (overlayKind() === "sheet") closeOverlay({ immediate: true, restore: false });
      };
    }
  };
}

export const catalogPage = makeView("catalog");
export const brandPage = makeView("brand");
export const preordersPage = makeView("preorders");
