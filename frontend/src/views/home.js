import { esc, $ } from "../lib/dom.js";
import { icons } from "../lib/icons.js";
import { productCard, rail, sectionHead } from "../components/card.js";
import { heroHTML, mountHero } from "../components/hero.js";
import { brandMarquee, brandCard } from "../components/brands.js";
import { preorderSteps } from "../components/blocks.js";
import { latest, preorders, brands, products, getProduct } from "../data.js";
import { recentIds } from "../store.js";
import { SITE } from "../config.js";
import { waLabel } from "../lib/whatsapp.js";
import { probeWithin } from "../lib/images.js";
import { figureRequestPanel, mountFigureRequest } from "../components/figure-request.js";
import { cinemaPanel, mountCinema } from "../components/cinema.js";

export const home = {
  render() {
    const fresh = latest(8);
    const pre = preorders.slice(0, 8);
    const seen = recentIds().map(getProduct).filter(Boolean).slice(0, 12);
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
        <a href="/a-pedido" data-nav class="request-teaser"><span>${icons.search} ¿Buscas una figura que no está aquí?</span><strong>Consúltanos a pedido ${icons.arrow}</strong></a>
      </div>
      <div class="band band--sage band--marquee">${brandMarquee()}</div>

      <section class="band band--paper" aria-labelledby="new-title">
        <div class="container">
          ${sectionHead({
            title: '<span id="new-title">Novedades del catálogo</span>',
            sub: `${brands.reduce((total, b) => total + b.count, 0)} figuras · ${brands.length} marcas · ${preorders.length} preventas para explorar.`,
            action: `<a class="link-arrow" href="/catalogo" data-nav>Ver todo el catálogo ${icons.arrow}</a><button class="btn btn-ghost btn-sm" type="button" data-surprise>${icons.dice}<span>Sorpréndeme</span></button>`
          })}
          <div class="product-grid" data-reveal-group>${fresh.map((p, i) => productCard(p, { eager: i < 4, extra: "" }).replace('class="card ', 'data-reveal-item class="card ')).join("")}</div>
        </div>
      </section>

      <section class="band discovery-band" aria-labelledby="discovery-title">
        <div class="container discovery-panel" data-reveal>
          <div class="discovery-copy"><p class="eyebrow">Tu colección, a tu manera</p><h2 class="h-section" id="discovery-title">Encuentra tu<br><em>próxima pieza.</em></h2><p>Empieza por una marca, descubre una preventa o encuentra esa figura que estabas buscando.</p></div>
          <div class="discovery-paths">
            <a href="/catalogo?modo=venta" data-nav><span class="path-number">01</span><div><h3>Explorar figuras</h3><p>Fotos, estado y precio de cada pieza.</p></div>${icons.arrow}</a>
            <a href="/preventas" data-nav><span class="path-number">02</span><div><h3>Planear la próxima</h3><p>Reserva y saldo, siempre visibles.</p></div>${icons.arrow}</a>
            <button type="button" data-search-open><span class="path-number">03</span><div><h3>Encontrar la indicada</h3><p>Busca por nombre, marca o código.</p></div>${icons.search}</button>
          </div>
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
          <div class="pre-steps-wrap">${preorderSteps()}</div>
        </div>
      </section>

      <section class="band band--olive" aria-labelledby="brands-title">
        <div class="container">
          ${sectionHead({
            title: '<span id="brands-title">Explora por marca</span>',
            sub: `${brands.length} marcas en el catálogo.`,
            action: `<a class="link-arrow" href="/marcas" data-nav>Ver las ${brands.length} marcas ${icons.arrow}</a>`
          })}
          <div class="brand-grid brand-grid--home" data-reveal-group>${top.map((b, i) => brandCard(b, { size: "md", i })).join("")}</div>
        </div>
      </section>

      <div class="container request-home" id="figuras-a-pedido">${figureRequestPanel()}</div>
      <div class="container">${cinemaPanel()}</div>

      ${
        seen.length
          ? `<section class="band band--paper" aria-labelledby="seen-title"><div class="container">${sectionHead({ title: '<span id="seen-title">Vuelve a verlas</span>', sub: "Las últimas figuras que revisaste." })}${rail(seen, { label: "Vistas recientemente" })}</div></section>`
          : ""
      }

      <section class="band band--cta" aria-labelledby="cta-title">
        <div class="container">
          <div class="cta-card" data-reveal>
            <div><h2 class="h-section" id="cta-title">¿Dudas sobre una figura?</h2>
            <p class="section-sub">Consulta disponibilidad, pago y entrega directamente con Grooty Store.</p></div>
            <div class="cta-actions">
              <button class="btn btn-primary btn-lg" type="button" data-wa="general" data-magnetic>${icons.whatsapp}<span>${waLabel("Hablar por WhatsApp")}</span></button>
              <a class="btn btn-secondary btn-lg" href="${SITE.instagram}" target="_blank" rel="noopener">${icons.instagram}<span>${esc(SITE.instagramHandle)}</span></a>
            </div>
          </div>
        </div>
      </section>`
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
