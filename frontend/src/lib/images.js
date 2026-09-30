import { SITE } from "../config.js";
import { esc } from "./dom.js";

/* ───────────── URLs (ImageKit) ───────────── */
const isIK = (u) => /^https?:\/\/ik\.imagekit\.io\//.test(u || "");

export function imgUrl(url, w, { canvas = false } = {}) {
  if (!url || !SITE.imageTransforms || !isIK(url)) return url;
  const u = new URL(url);
  u.searchParams.set('tr', `w-${w},${canvas ? `h-${Math.round(w*1.25)},cm-pad_resize,bg-E8EDE2,` : ''}q-80,f-auto`);
  return u.href;
}
export function imgSrcset(url, widths, options) {
  if (!url || !SITE.imageTransforms || !isIK(url)) return "";
  return widths.map((w) => `${imgUrl(url, w, options)} ${w}w`).join(", ");
}

/* CORS anónimo permite leer píxeles para detectar el fondo. Si el CDN no lo permite,
   se desactiva solo (sessionStorage) y todo sigue funcionando sin la detección. */
const corsOk = () => {
  try {
    return sessionStorage.getItem("grooty:v4:cors") !== "0";
  } catch {
    return true;
  }
};

/**
 * Imagen de producto dentro de un "image stage".
 * El stage es un contenedor cuadrado-relativo; la imagen nunca se deforma ni se recorta.
 */
export function stage(url, alt, { sizes = "300px", widths = [320, 480, 720, 960], eager = false, probe = true, cls = "", vtMain = false, canvas = false } = {}) {
  const srcset = imgSrcset(url, widths, { canvas });
  const src = imgUrl(url, widths[Math.min(1, widths.length - 1)], { canvas });
  const cors = probe && corsOk() ? ' crossorigin="anonymous"' : "";
  return `<div class="image-stage ${cls}"${vtMain ? " data-vt-main" : ""}>
    <img src="${esc(src)}" ${srcset ? `srcset="${esc(srcset)}" sizes="${esc(sizes)}"` : ""} data-orig="${esc(url)}" data-probe="${probe ? 1 : 0}"${cors}
      alt="${esc(alt)}" ${eager ? 'fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"'}>
  </div>`;
}

/* ───────────── Detección de fondo ───────────── */
/**
 * Clasifica el borde de la imagen:
 *  - alpha: fondo transparente → se ve el color del tile
 *  - light: fondo casi blanco  → multiply, el blanco toma el color del tile
 *  - solid: fondo uniforme oscuro/color → recuadro redondeado que abraza la imagen
 *  - photo: fondo complejo → recuadro redondeado
 */
function analyze(img) {
  const w = img.naturalWidth,
    h = img.naturalHeight;
  if (!w || !h) return null;
  const ar = w / h;
  const S = 32;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  let data;
  try {
    ctx.drawImage(img, 0, 0, S, S);
    data = ctx.getImageData(0, 0, S, S).data;
  } catch {
    return { ar, mode: "unknown" };
  }
  let n = 0,
    transparent = 0,
    r = 0,
    g = 0,
    b = 0;
  const ring = [];
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if (x > 1 && x < S - 2 && y > 1 && y < S - 2) continue;
      const i = (y * S + x) * 4;
      n++;
      if (data[i + 3] < 40) {
        transparent++;
        continue;
      }
      ring.push(data[i], data[i + 1], data[i + 2]);
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }
  }
  if (transparent / n > 0.5) return { ar, mode: "alpha" };
  const m = ring.length / 3 || 1;
  r /= m;
  g /= m;
  b /= m;
  let close = 0;
  for (let i = 0; i < ring.length; i += 3) {
    if (Math.max(Math.abs(ring[i] - r), Math.abs(ring[i + 1] - g), Math.abs(ring[i + 2] - b)) < 38) close++;
  }
  const uniform = close / m > 0.82;
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  if (uniform && lum > 0.9) return { ar, mode: "light" };
  if (uniform) return { ar, mode: "solid", color: `rgb(${r | 0} ${g | 0} ${b | 0})` };
  return { ar, mode: "photo" };
}

const cache = new Map();
function applyProbe(img) {
  const st = img.closest(".image-stage");
  if (!st) return;
  const key = img.currentSrc || img.src;
  img.classList.add("is-loaded");
  let res = cache.get(key);
  if (!res) {
    res = img.dataset.probe === "1" && img.crossOrigin ? analyze(img) : null;
    if (res) cache.set(key, res);
  }
  if (!res || res.mode === "unknown") return; // sin lectura de píxeles: contain simple, sin recuadro
  st.style.setProperty("--ar", res.ar.toFixed(4));
  st.dataset.bg = res.mode;
  st.dataset.probed = "1";
  if (res.color) st.style.setProperty("--solid", res.color);
}

/** Listeners globales (captura): no hace falta enlazar imagen por imagen. */
export function initImages() {
  document.addEventListener(
    "load",
    (e) => {
      const t = e.target;
      if (t && t.tagName === "IMG" && t.dataset.probe) applyProbe(t);
    },
    true
  );
  document.addEventListener(
    "error",
    (e) => {
      const t = e.target;
      if (!t || t.tagName !== "IMG" || !t.dataset.orig) return;
      if (t.crossOrigin) {
        try {
          sessionStorage.setItem("grooty:v4:cors", "0");
        } catch {}
        t.removeAttribute("crossorigin");
        t.removeAttribute("srcset");
        t.src = t.dataset.orig;
        return;
      }
      if (t.src !== t.dataset.orig) {
        t.removeAttribute("srcset");
        t.src = t.dataset.orig;
        return;
      }
      t.closest(".image-stage")?.classList.add("is-broken");
    },
    true
  );
}

/** Para imágenes ya cargadas cuando se inserta el HTML (caché): reevalúa. */
export function probeWithin(root) {
  root.querySelectorAll("img[data-probe]").forEach((img) => {
    if (img.complete && img.naturalWidth) applyProbe(img);
  });
}

/** Miniatura simple (listas, drawer, búsqueda): sin detección de fondo. */
export function thumb(url, w = 160, cls = "") {
  return `<span class="thumb ${cls}"><img src="${esc(imgUrl(url, w))}" data-orig="${esc(url)}" alt="" loading="lazy" decoding="async"></span>`;
}
