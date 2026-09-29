import { esc, motionAllowed } from "../lib/dom.js";

/**
 * Gestor único de overlays (modal, drawer, paleta, hoja, lightbox).
 * Da: focus trap, ESC, clic en backdrop, bloqueo de scroll, `inert` al resto y retorno de foco.
 */
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
let current = null;

const rootEl = () => document.getElementById("overlay-root");

function lock(on) {
  const html = document.documentElement;
  if (on) {
    const sbw = window.innerWidth - html.clientWidth;
    html.style.setProperty("--sbw", `${Math.max(0, sbw)}px`);
    html.classList.add("is-locked");
  } else {
    html.classList.remove("is-locked");
    html.style.removeProperty("--sbw");
  }
}
function setInert(on) {
  ["shell", "app"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.inert = on;
  });
}

export const isOverlayOpen = () => !!current;
export const overlayPanel = () => current?.panel || null;
export const overlayKind = () => current?.kind || null;

export function openOverlay({ kind = "modal", label = "", html = "", focus = "", onClose = null, className = "" } = {}) {
  if (current) closeOverlay({ immediate: true, restore: false });
  const opener = document.activeElement;
  const root = rootEl();
  root.innerHTML = `<div class="overlay overlay--${kind} ${className}" data-overlay>
    <div class="overlay-backdrop" data-close-overlay></div>
    <div class="overlay-panel" role="dialog" aria-modal="true" aria-label="${esc(label)}" tabindex="-1">${html}</div>
  </div>`;
  const el = root.firstElementChild;
  const panel = el.querySelector(".overlay-panel");
  lock(true);
  setInert(true);
  current = { el, panel, opener, onClose, kind };
  requestAnimationFrame(() => {
    el.classList.add("is-open");
    const target = (focus && panel.querySelector(focus)) || panel.querySelector("[data-autofocus]") || panel;
    target.focus({ preventScroll: true });
  });
  return panel;
}

export function closeOverlay({ immediate = false, restore = true } = {}) {
  if (!current) return;
  const { el, opener, onClose } = current;
  current = null;
  el.classList.remove("is-open");
  el.classList.add("is-closing");
  lock(false);
  setInert(false);
  const done = () => el.remove();
  if (immediate || !motionAllowed()) done();
  else setTimeout(done, 240);
  try {
    onClose?.();
  } catch {}
  if (restore && opener && document.contains(opener) && typeof opener.focus === "function") opener.focus({ preventScroll: true });
}

export function initOverlays() {
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-close-overlay]") && current) closeOverlay();
  });
  document.addEventListener("keydown", (e) => {
    if (!current) return;
    if (e.key === "Escape") {
      e.preventDefault();
      closeOverlay();
      return;
    }
    if (e.key !== "Tab") return;
    const nodes = [...current.panel.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null || n === document.activeElement);
    if (!nodes.length) {
      e.preventDefault();
      return;
    }
    const first = nodes[0],
      last = nodes[nodes.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === current.panel)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
}
