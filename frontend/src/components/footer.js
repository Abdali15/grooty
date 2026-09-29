import { SITE } from "../config.js";
import { icons } from "../lib/icons.js";
import { waLabel } from "../lib/whatsapp.js";

export function footer() {
  return `<footer class="footer">
    <div class="container">
      <div class="footer-grid" data-reveal>
        <div class="footer-brand">
          <a href="/" data-nav class="brand brand--footer" aria-label="Grooty Store — Inicio">
            <img class="brand-logo brand-logo--footer" src="${SITE.logo.src}" alt="" width="44" height="44">
            <span class="brand-word"><strong>GROOTY</strong><small>STORE</small></span>
          </a>
          <p>Figuras de colección en Perú. Explora, guarda tus favoritas y consulta tu selección por WhatsApp.</p>
        </div>
        <div><h3>Explorar</h3><a href="/catalogo" data-nav>Catálogo</a><a href="/preventas" data-nav>Preventas</a><a href="/marcas" data-nav>Marcas</a></div>
        <div><h3>Ayuda</h3><a href="/ayuda#como-comprar" data-nav>Cómo comprar</a><a href="/ayuda#preventas" data-nav>Cómo reservar</a><a href="/ayuda#pagos" data-nav>Pagos y entrega</a></div>
        <div><h3>Contacto</h3>
          <button type="button" class="footer-link" data-wa="general">${icons.whatsapp}${waLabel("WhatsApp")}</button>
          <a href="${SITE.instagram}" target="_blank" rel="noopener" class="footer-link">${icons.instagram}${SITE.instagramHandle}</a>
          <p class="footer-country">${SITE.country}</p>
        </div>
      </div>
      <div class="footer-bottom"><span>© ${new Date().getFullYear()} Grooty Store</span><span>Figuras de colección · ${SITE.country}</span></div>
    </div>
  </footer>`;
}
