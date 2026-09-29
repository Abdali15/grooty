import { esc, $ } from "../lib/dom.js";
import { icons } from "../lib/icons.js";
import { productCard, rail, sectionHead } from "../components/card.js";
import { heroHTML, mountHero } from "../components/hero.js";
import { brandMarquee, brandCard } from "../components/brands.js";
import { preorderSteps } from "../components/blocks.js";
import { latest, preorders, brands, getProduct } from "../data.js";
import { recentIds } from "../store.js";
import { SITE } from "../config.js";
import { waLabel } from "../lib/whatsapp.js";
import { probeWithin } from "../lib/images.js";

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
      <div class="container hero-wrap">${heroHTML()}</div>
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
    return mountHero(root, { intro: true });
  }
};
