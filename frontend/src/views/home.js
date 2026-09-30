import { icons } from "../lib/icons.js";
import { productCard, rail, sectionHead } from "../components/card.js";
import { heroHTML, mountHero } from "../components/hero.js";
import { brandMarquee, brandCard } from "../components/brands.js";
import { latest, preorders, brands, products, getProduct } from "../data.js";
import { recentIds } from "../store.js";
import { probeWithin } from "../lib/images.js";
import { figureRequestPanel, mountFigureRequest } from "../components/figure-request.js";
import { cinemaPanel, mountCinema } from "../components/cinema.js";

export const home = {
  render() {
    const fresh = latest(8);
    const pre = preorders.slice(0, 6);
    const seen = recentIds().map(getProduct).filter(Boolean).slice(0, 6);
    const top = brands.slice(0, 3);
    return {
      title: "Grooty Store · Figuras de colección en Perú",
      description: "Figuras de colección, preventas y novedades. Explora por marca, guarda tus favoritas y consulta tu selección por WhatsApp.",
      html: `
      <div class="container hero-wrap">
        <div class="experience-head"><p><span class="signal-dot" aria-hidden="true"></span>Figuras de colección / Perú</p><a class="link-arrow" href="/catalogo" data-nav>Explora tu próximo universo ${icons.arrow}</a></div>
        ${heroHTML()}
        <nav class="collection-stats" aria-label="Explorar la colección">
          <a href="/catalogo" data-nav><strong>${products.length}</strong><span>Figuras en catálogo</span>${icons.arrow}</a>
          <a href="/preventas" data-nav><strong>${preorders.length}</strong><span>Preventas para descubrir</span>${icons.arrow}</a>
          <a href="/marcas" data-nav><strong>${brands.length}</strong><span>Marcas de colección</span>${icons.arrow}</a>
        </nav>
      </div>
      <div class="band band--sage band--marquee">${brandMarquee()}</div>

      <section class="band band--paper" aria-labelledby="new-title">
        <div class="container">
          ${sectionHead({
            title: '<span id="new-title">Novedades del catálogo</span>',
            sub: "Descubre las últimas piezas incorporadas a Grooty.",
            action: `<a class="link-arrow" href="/catalogo" data-nav>Ver todo el catálogo ${icons.arrow}</a><button class="btn btn-ghost btn-sm" type="button" data-surprise>${icons.dice}<span>Sorpréndeme</span></button>`
          })}
          <div class="product-grid" data-reveal-group>${fresh.map((p, i) => productCard(p, { eager: i < 4, extra: "" }).replace('class="card ', 'data-reveal-item class="card ')).join("")}</div>
        </div>
      </section>

      <section class="band band--dark" aria-labelledby="pre-title">
        <div class="container">
          ${sectionHead({
            title: '<span id="pre-title">Preventas</span>',
            sub: "Reserva hoy y completa el saldo cuando llegue la figura.",
            action: `<a class="btn btn-olive" href="/preventas" data-nav>Ver todas las preventas ${icons.arrow}</a>`
          })}
          ${rail(pre, { label: "Preventas destacadas", dark: true })}
          <p class="pre-conditions">Consulta disponibilidad y plazo de llegada antes de reservar. <a class="link-inline" href="/ayuda" data-nav>Ver condiciones de preventa</a></p>
        </div>
      </section>

      <section class="band band--olive" aria-labelledby="brands-title">
        <div class="container">
          ${sectionHead({
            title: '<span id="brands-title">Explora por marca</span>',
            sub: "Busca las líneas que ya forman parte de tu colección.",
            action: `<a class="link-arrow" href="/marcas" data-nav>Ver todas las marcas ${icons.arrow}</a>`
          })}
          <div class="brand-grid brand-grid--home" data-reveal-group>${top.map((b, i) => brandCard(b, { size: "md", i })).join("")}</div>
        </div>
      </section>

      <div class="container request-home" id="figuras-a-pedido">${figureRequestPanel({ compact: true })}</div>
      <div class="container">${cinemaPanel()}</div>

      ${
        seen.length
          ? `<section class="band band--paper" aria-labelledby="seen-title"><div class="container">${sectionHead({ title: '<span id="seen-title">Vuelve a verlas</span>', sub: "Las últimas figuras que revisaste." })}${rail(seen, { label: "Vistas recientemente" })}</div></section>`
          : ""
      }`
    };
  },
  mount(root, ctx) {
    probeWithin(root);
    const stopHero = mountHero(root, { intro: true });
    const stopRequest = mountFigureRequest(root);
    const stopCinema = mountCinema(root);
    return () => { stopHero?.(); stopRequest(); stopCinema(); };
  }
};
