import { esc } from "../lib/dom.js";
import { icons } from "../lib/icons.js";
import { thumb } from "../lib/images.js";
import { brands } from "../data.js";

/** Franja de marcas: marquee CSS infinito y lento; se pausa con hover/foco. */
export function brandMarquee() {
  const set = (hidden) =>
    `<div class="mq-set" ${hidden ? 'aria-hidden="true"' : ""}>${brands
      .map(
        (b) => `<a class="mq-item" href="${b.url}" data-nav data-brand="${b.slug}" ${hidden ? 'tabindex="-1"' : ""}>
          <span class="mq-name">${esc(b.name)}</span>
          <span class="mq-arrow">${icons.arrow}</span>
        </a>`
      )
      .join("")}</div>`;
  return `<div class="marquee" role="region" aria-label="Marcas disponibles"><div class="mq-track">${set(false)}${set(true)}${set(true)}</div></div>`;
}

const TONES = { mafex: "deep", "marvel-legends": "sage", "sh-figuarts": "olive", revoltech: "paper", inart: "sage", yolopark: "olive" };

/** Tarjeta de colección: composición propia por marca (tono, tamaño y collage de figuras reales) */
export function brandCard(b, { size = "md", i = 0 } = {}) {
  const pics = b.items.filter((p) => p.image).slice(0, size === "lg" ? 3 : 2);
  const tone = TONES[b.slug] || ["sage", "olive", "paper"][i % 3];
  return `<a class="brand-card brand-card--${size}" data-tone="${tone}" href="${b.url}" data-nav data-brand="${b.slug}" data-reveal-item ${size === "lg" ? "data-tilt" : ""}>
    <span class="bc-word" aria-hidden="true">${esc(b.name)}</span>
    <div class="bc-top">
      <span class="bc-count"><b>${b.count}</b>${b.count === 1 ? "figura" : "figuras"}</span>
      ${b.preCount ? `<span class="bc-pre">${b.preCount} en preventa</span>` : ""}
    </div>
    <div class="bc-collage" aria-hidden="true">${pics.map((p, n) => `<span class="bc-pic bc-pic--${n}">${thumb(p.image, 360)}</span>`).join("")}</div>
    <div class="bc-bottom"><h3 class="bc-name">${esc(b.name)}</h3><span class="bc-cta">Explorar ${icons.arrow}</span></div>
  </a>`;
}
