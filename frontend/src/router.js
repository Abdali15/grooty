import { $, motionAllowed, motionOff } from "./lib/dom.js";
import { updateActive } from "./components/header.js";
import { footer } from "./components/footer.js";
import { closeOverlay, isOverlayOpen } from "./components/overlay.js";
import { motion } from "./motion/index.js";
import { track } from "./analytics.js";

/**
 * Router SPA (History API) con:
 *  - restauración de scroll y de estado de vista (p. ej. cuántas cards estaban cargadas)
 *  - View Transitions API como mejora progresiva (+ elemento compartido card → ficha)
 *  - gestión de foco y anuncio de cambio de ruta para lectores de pantalla
 */
let routes = [];
export const defineRoutes = (r) => (routes = r);

const app = () => document.getElementById("app");
const NAV_KEY = "grooty:v4:nav";
const newKey = () => Math.random().toString(36).slice(2, 10);

let session = { pos: {}, view: {} };
try {
  session = JSON.parse(sessionStorage.getItem(NAV_KEY)) || session;
} catch {}
const persist = () => {
  try {
    sessionStorage.setItem(NAV_KEY, JSON.stringify(session));
  } catch {}
};

let currentKey = null;
let cleanup = null;
let current = null; // { route, out }
let first = true;
let rendering = false;

if ("scrollRestoration" in history) history.scrollRestoration = "manual";

/* Estado por entrada de historial (persistente en la sesión) */
export const getViewState = () => session.view[currentKey] || {};
export const setViewState = (patch) => {
  session.view[currentKey] = { ...(session.view[currentKey] || {}), ...patch };
  persist();
};

/* Query sin re-render (filtros del catálogo) */
export function replaceQuery(search) {
  const url = location.pathname + (search || "") + location.hash;
  history.replaceState(history.state, "", url);
}
export const currentPath = () => location.pathname.replace(/\/+$/, "") || "/";

/* Scroll tracking */
let ticking = false;
window.addEventListener(
  "scroll",
  () => {
    if (ticking || !currentKey || rendering) return;
    ticking = true;
    requestAnimationFrame(() => {
      session.pos[currentKey] = window.scrollY;
      ticking = false;
    });
  },
  { passive: true }
);
window.addEventListener("pagehide", persist);

function matchRoute(path) {
  for (const route of routes) {
    const params = route.match(path);
    if (params) return { route, params };
  }
  return null;
}

const canVT = () => typeof document.startViewTransition === "function";
const setVTName = (el, on) => el && (el.style.viewTransitionName = on ? "product-img" : "");

function setMeta(out) {
  document.title = out.title;
  let robots = document.querySelector('meta[name="robots"]');
  if (!robots) { robots = document.createElement("meta"); robots.name = "robots"; document.head.appendChild(robots); }
  robots.content = currentPath() === "/admin" ? "noindex,nofollow" : "index,follow";
  let m = document.querySelector('meta[name="description"]');
  if (m && out.description) m.setAttribute("content", out.description);
}

async function render({ isPop = false, shared = null } = {}) {
  const path = currentPath();
  const hit = matchRoute(path) || { route: routes.find((r) => r.name === "notfound"), params: {} };
  const { route, params } = hit;
  const ctx = { path, params, search: location.search, hash: location.hash, state: getViewState(), isPop, first };
  const out = route.view.render(ctx);
  const root = app();

  // ─ preparar elemento compartido para View Transition ─
  const useVT = canVT() && motionAllowed() && !first && !isOverlayOpen();
  const prevProductId = current?.out?.productId ?? null;
  let oldNamed = null;
  if (useVT) {
    if (shared?.el) {
      oldNamed = shared.el;
    } else {
      oldNamed = $("[data-vt-main]", root);
    }
    setVTName(oldNamed, true);
  }

  const update = () => {
    rendering = true;
    motion.leave();
    try {
      cleanup?.();
    } catch {}
    root.innerHTML = out.html + footer();
    setMeta(out);
    document.body.dataset.route = route.name;
    document.documentElement.classList.toggle("route-product", route.name === "product");
    updateActive(path);
    const c2 = { ...ctx, root };
    cleanup = route.view.mount?.(root, c2) || null;

    // scroll: restaurar en popstate, ir a ancla, o arriba
    let y = 0;
    if (isPop && session.pos[currentKey] != null) y = session.pos[currentKey];
    window.scrollTo({ top: y, behavior: "instant" });
    if (ctx.hash) {
      const el = document.getElementById(decodeURIComponent(ctx.hash.slice(1)));
      if (el) el.scrollIntoView({ block: "start", behavior: "instant" });
    }

    // nombrar el destino compartido
    if (useVT) {
      let target = null;
      if (shared?.el) target = $("[data-vt-main]", root);
      else if (prevProductId != null) target = root.querySelector(`.card[data-id="${prevProductId}"] .image-stage`);
      setVTName(target, true);
    }
    motion.enter(root, { first, vt: useVT, route: route.name });
    rendering = false;
  };

  let transition = null;
  if (useVT) {
    transition = document.startViewTransition(update);
    try {
      await transition.updateCallbackDone;
    } catch {}
    transition.finished.finally(() => {
      document.querySelectorAll('[style*="view-transition-name"]').forEach((el) => (el.style.viewTransitionName = ""));
    });
  } else {
    update();
  }
  current = { route, out };

  if (!first) {
    const h1 = $("h1", root);
    if (h1) {
      h1.tabIndex = -1;
      h1.focus({ preventScroll: true });
    }
    const live = $("#route-announcer");
    if (live) live.textContent = out.title;
  }
  if (first) first = false;
}

export function navigate(url, { replace = false, shared = null } = {}) {
  const u = new URL(url, location.origin);
  if (u.origin !== location.origin) {
    location.href = url;
    return;
  }
  if (isOverlayOpen()) closeOverlay({ immediate: true, restore: false });
  const same = u.pathname === location.pathname && u.search === location.search;
  if (same && !u.hash) {
    window.scrollTo({ top: 0, behavior: motionAllowed() ? "smooth" : "instant" });
    return;
  }
  if (same && u.hash) {
    history.replaceState(history.state, "", u.pathname + u.search + u.hash);
    document.getElementById(decodeURIComponent(u.hash.slice(1)))?.scrollIntoView({ behavior: motionAllowed() ? "smooth" : "instant", block: "start" });
    return;
  }
  session.pos[currentKey] = window.scrollY;
  persist();
  const key = newKey();
  history[replace ? "replaceState" : "pushState"]({ key }, "", u.pathname + u.search + u.hash);
  currentKey = key;
  return render({ shared });
}

export function startRouter() {
  motionOff();
  if (!history.state?.key) history.replaceState({ ...(history.state || {}), key: newKey() }, "");
  currentKey = history.state.key;

  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest("a[href]");
    if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
    const href = a.getAttribute("href");
    if (!href || href.startsWith("mailto:") || href.startsWith("tel:")) return;
    let u;
    try {
      u = new URL(href, location.origin);
    } catch {
      return;
    }
    if (u.origin !== location.origin) return;
    if (u.pathname === location.pathname && u.search === location.search && u.hash && !u.hash.startsWith("#!")) {
      e.preventDefault();
      navigate(u.pathname + u.search + u.hash);
      return;
    }
    e.preventDefault();
    const card = a.closest(".card");
    let shared = null;
    if (card) {
      const id = Number(card.dataset.id);
      track("card_click", { id });
      shared = { el: card.querySelector(".image-stage"), id };
    }
    navigate(u.pathname + u.search + u.hash, { shared });
  });

  window.addEventListener("popstate", () => {
    if (isOverlayOpen()) closeOverlay({ immediate: true, restore: false });
    currentKey = history.state?.key || (history.replaceState({ key: newKey() }, ""), history.state.key);
    render({ isPop: true });
  });

  return render();
}
