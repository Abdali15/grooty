import { esc } from "../lib/dom.js";
import { icons } from "../lib/icons.js";
import { PREORDER_STEPS } from "../config.js";

export function preorderSteps({ compact = false } = {}) {
  return `<ol class="steps ${compact ? "steps--compact" : ""}" data-reveal-group>
    ${PREORDER_STEPS.map((t, i) => `<li class="step" data-reveal-item><span class="step-n" aria-hidden="true">${i + 1}</span><p>${esc(t)}</p></li>`).join("")}
  </ol>`;
}

export function breadcrumb(items) {
  return `<nav class="crumbs" aria-label="Ruta de navegación"><ol>${items
    .map((it, i) => (it.href ? `<li><a href="${it.href}" data-nav>${esc(it.label)}</a></li>` : `<li aria-current="page">${esc(it.label)}</li>`))
    .join("")}</ol></nav>`;
}

/** Bloque "sigue explorando" para que ninguna vista termine sin siguiente paso */
export function keepExploring({ brands = [], showPre = true, showSurprise = true } = {}) {
  return `<section class="keep" aria-labelledby="keep-title" data-reveal>
    <h2 class="h-keep" id="keep-title">Sigue explorando</h2>
    <div class="keep-body">
      ${brands.length ? `<div class="keep-col"><p class="keep-label">Otras marcas</p><div class="chip-row">${brands.map((b) => `<a class="chip chip--link" href="${b.url}" data-nav data-brand="${b.slug}">${esc(b.name)}<span class="chip-n">${b.count}</span></a>`).join("")}</div></div>` : ""}
      <div class="keep-col keep-actions">
        ${showPre ? `<a class="btn btn-secondary" href="/preventas" data-nav>${icons.tag}<span>Ver preventas</span></a>` : ""}
        ${showSurprise ? `<button class="btn btn-secondary" type="button" data-surprise>${icons.dice}<span>Sorpréndeme</span></button>` : ""}
        <button class="btn btn-ghost" type="button" data-scroll-top>Volver arriba</button>
      </div>
    </div>
  </section>`;
}
