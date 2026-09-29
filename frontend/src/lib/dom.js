export const $ = (s, root = document) => root.querySelector(s);
export const $$ = (s, root = document) => [...root.querySelectorAll(s)];

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
/** Escapa texto no confiable (nombres de producto, búsquedas) antes de usarlo en HTML. */
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESC[c]);

export const debounce = (fn, ms = 160) => {
  let t;
  const d = (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
  d.cancel = () => clearTimeout(t);
  return d;
};

export const raf = (fn) => requestAnimationFrame(fn);

export const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

export const prefersReducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
export const canHover = () => matchMedia("(hover:hover) and (pointer:fine)").matches;
export const isDesktopWidth = () => matchMedia("(min-width: 768px)").matches;

/** Interruptor de pruebas: ?motion=off desactiva toda la capa de animación. */
export const motionOff = () => {
  try {
    const p = new URLSearchParams(location.search).get("motion");
    if (p === "off") sessionStorage.setItem("grooty:v4:motion", "off");
    if (p === "on") sessionStorage.removeItem("grooty:v4:motion");
    return sessionStorage.getItem("grooty:v4:motion") === "off";
  } catch {
    return false;
  }
};
export const motionAllowed = () => !prefersReducedMotion() && !motionOff();
