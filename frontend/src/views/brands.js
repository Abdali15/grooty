import { brands, products, preorders } from "../data.js";
import { brandCard } from "../components/brands.js";
import { keepExploring } from "../components/blocks.js";
import { plural } from "../lib/format.js";
import { probeWithin } from "../lib/images.js";

const SIZES = ["lg", "md", "md", "sm", "sm", "sm"];

export const brandsPage = {
  render() {
    return {
      title: "Marcas · Grooty Store",
      description: "Explora las marcas del catálogo de Grooty Store: Mafex, Marvel Legends, Sh Figuarts y más.",
      html: `<header class="page-head container" data-reveal>
        <div class="page-head-row"><h1 class="h-page" data-split>Marcas</h1>
        <p class="page-sub">${plural(brands.length, "marca", "marcas")} · ${plural(products.length, "figura", "figuras")} en total</p></div>
      </header>
      <section class="container" aria-label="Marcas">
        <div class="brand-grid brand-grid--all" data-reveal-group>
          ${brands.map((b, i) => brandCard(b, { size: SIZES[i] || "sm", i })).join("")}
        </div>
      </section>
      <div class="container">${keepExploring({ brands: [], showPre: true })}</div>`
    };
  },
  mount(root) {
    probeWithin(root);
  }
};
