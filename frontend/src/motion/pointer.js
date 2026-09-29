import { canHover, clamp } from "../lib/dom.js";

/**
 * Efectos de puntero (solo desktop con ratón, sin reduced-motion):
 *  [data-parallax] → variables --px/--py (-1…1) para capas con profundidad
 *  [data-tilt]     → inclinación mínima (≤ 4°) + brillo
 *  [data-magnetic] → desplazamiento ≤ 4 px hacia el puntero
 * Un solo listener y un solo bucle rAF con interpolación (lerp).
 */
const items = new Map(); // el → { tx, ty, cx, cy, kind }
let running = false;
let hovered = null;

const lerp = (a, b, t) => a + (b - a) * t;

function apply(el, s) {
  if (s.kind === "parallax") {
    el.style.setProperty("--px", s.cx.toFixed(3));
    el.style.setProperty("--py", s.cy.toFixed(3));
  } else if (s.kind === "tilt") {
    el.style.setProperty("--ry", (s.cx * 4).toFixed(2) + "deg");
    el.style.setProperty("--rx", (-s.cy * 4).toFixed(2) + "deg");
    el.style.setProperty("--gx", ((s.cx + 1) * 50).toFixed(1) + "%");
    el.style.setProperty("--gy", ((s.cy + 1) * 50).toFixed(1) + "%");
  } else {
    el.style.setProperty("--mx", (s.cx * 4).toFixed(2) + "px");
    el.style.setProperty("--my", (s.cy * 4).toFixed(2) + "px");
  }
}

function loop() {
  let busy = false;
  items.forEach((s, el) => {
    if (!el.isConnected) { items.delete(el); return; }
    s.cx = lerp(s.cx, s.tx, 0.12);
    s.cy = lerp(s.cy, s.ty, 0.12);
    apply(el, s);
    if (Math.abs(s.cx - s.tx) > 0.002 || Math.abs(s.cy - s.ty) > 0.002) busy = true;
    else if (s.tx === 0 && s.ty === 0) items.delete(el);
  });
  if (busy) requestAnimationFrame(loop);
  else running = false;
}
const kick = () => {
  if (!running) {
    running = true;
    requestAnimationFrame(loop);
  }
};

function target(el, kind, e) {
  const r = el.getBoundingClientRect();
  const x = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
  const y = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
  const s = items.get(el) || { cx: 0, cy: 0, tx: 0, ty: 0, kind };
  s.tx = x;
  s.ty = y;
  items.set(el, s);
  kick();
}
function release(el) {
  const s = items.get(el);
  if (s) {
    s.tx = 0;
    s.ty = 0;
    kick();
  }
}

export function initPointerEffects() {
  if (!canHover()) return;
  document.addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType !== "mouse") return;
      const px = e.target.closest?.("[data-parallax]");
      const tl = e.target.closest?.("[data-tilt]");
      const mg = e.target.closest?.("[data-magnetic]");
      const now = new Set([px, tl, mg].filter(Boolean));
      if (hovered) hovered.forEach((el) => !now.has(el) && release(el));
      hovered = now;
      if (px) target(px, "parallax", e);
      if (tl) target(tl, "tilt", e);
      if (mg) target(mg, "magnetic", e);
    },
    { passive: true }
  );
  document.addEventListener("pointerout", (e) => {
    if (!e.relatedTarget) hovered?.forEach(release);
  });
}
