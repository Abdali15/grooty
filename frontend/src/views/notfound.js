import { icons } from "../lib/icons.js";
import { brands } from "../data.js";
import { esc } from "../lib/dom.js";

export function notFoundHTML() {
  return {
    title: "No encontramos esa página · Grooty Store",
    description: "Página no encontrada.",
    html: `<section class="container notfound">
      <h1 class="h-page">No encontramos esa página</h1>
      <p class="page-sub">El enlace puede estar incompleto o la figura ya no está publicada. Sigue explorando:</p>
      <div class="empty-actions"><button class="btn btn-primary" type="button" data-search-open>${icons.search}<span>Buscar figuras</span></button><a class="btn btn-secondary" href="/catalogo" data-nav>Ver catálogo</a><a class="btn btn-secondary" href="/preventas" data-nav>Ver preventas</a><button class="btn btn-ghost" type="button" data-surprise>${icons.dice}<span>Sorpréndeme</span></button></div>
      <div class="chip-row nf-brands">${brands.map((b) => `<a class="chip chip--link" href="${b.url}" data-nav>${esc(b.name)}<span class="chip-n">${b.count}</span></a>`).join("")}</div>
    </section>`
  };
}
export const notfound = { render: () => notFoundHTML() };
