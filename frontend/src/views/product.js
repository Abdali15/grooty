import { esc, $, $$ } from "../lib/dom.js";
import { money } from "../lib/format.js";
import { icons } from "../lib/icons.js";
import { stage, imgUrl, imgSrcset, thumb, probeWithin } from "../lib/images.js";
import { productFromPath, brandBySlug, moreFromBrand, related, getProduct } from "../data.js";
import { PREORDER_POLICY, SITE } from "../config.js";
import { badge, heartButton, rail } from "../components/card.js";
import { breadcrumb, keepExploring } from "../components/blocks.js";
import { sectionHead } from "../components/card.js";
import { openOverlay, closeOverlay, overlayPanel } from "../components/overlay.js";
import { recentIds, pushRecent } from "../store.js";
import { waLabel, waDirectReady, waContactNote, copyText } from "../lib/whatsapp.js";
import { toast } from "../components/toast.js";
import { track } from "../analytics.js";
import { notFoundHTML } from "./notfound.js";
import { brands } from "../data.js";
import { purchaseDetails } from "../components/purchase-details.js";

export const prefetchProduct = () => import("./product-gallery.js");

const alt = (p) => `${p.brand} — ${p.titulo}`;

function gallery(p) {
  const tone = p.isPre ? "pre" : "sale";
  const sizes = "(min-width:1024px) 640px, 100vw";
  const one = (u, i) =>
    `<div class="gallery-slide card-tile" data-tone="${tone}" data-zoom-open="${i}" role="button" tabindex="0" aria-label="Ampliar foto ${i + 1}">${stage(u, alt(p), { sizes, eager: i === 0, widths: [640, 960, 1280, 1600], vtMain: i === 0 })}<span class="zoom-hint" aria-hidden="true">${icons.zoom}</span></div>`;
  const help = `<div class="gallery-help"><p>Imágenes publicadas por la tienda. Toca una foto para ampliarla.</p><button type="button" class="link-btn" data-wa="product-details" data-id="${p.id}">${icons.zoom}${waDirectReady() ? 'Pedir fotos y detalles' : 'Pedir fotos en el grupo de WhatsApp'}</button></div>`;
  if (p.images.length <= 1) return `<div class="gallery"><div class="gallery-main">${one(p.image, 0)}${badge(p)}</div>${help}</div>`;
  return `<div class="gallery">
    <div class="gallery-main">
      <div class="swiper gallery-swiper"><div class="swiper-wrapper">${p.images.map((u, i) => `<div class="swiper-slide">${one(u, i)}</div>`).join("")}</div></div>
      ${badge(p)}
      <div class="gallery-nav"><button class="round-btn" type="button" data-g-prev aria-label="Foto anterior">${icons.arrowLeft}</button><button class="round-btn" type="button" data-g-next aria-label="Foto siguiente">${icons.arrow}</button></div>
    </div>
    <div class="swiper-pagination"></div>
    <div class="thumbs" role="group" aria-label="Fotos">${p.images.map((u, i) => `<button class="thumb-btn ${i === 0 ? "is-on" : ""}" type="button" data-thumb="${i}" aria-label="Ver foto ${i + 1}" aria-current="${i === 0}">${thumb(u, 160)}</button>`).join("")}</div>
    ${help}
  </div>`;
}

function info(p) {
  const balance = p.isPre && p.precio_reserva != null ? p.precio - p.precio_reserva : null;
  return `<div class="pdp-info">
    <p class="pdp-brand"><a href="/marcas/${p.brandSlug}" data-nav data-brand="${p.brandSlug}">${esc(p.brand)}</a></p>
    <h1 class="pdp-title">${esc(p.name)}</h1>
    ${p.line ? `<p class="pdp-line">${esc(p.line)}</p>` : ""}
    <p class="pdp-price-label">Precio total de la figura</p>
    <div class="pdp-price"><strong>${money(p.precio)}</strong>${p.isPre && p.precio_reserva != null ? `<span class="pdp-reserve">Reserva ${money(p.precio_reserva)}</span>` : ""}</div>
    <p class="pdp-availability ${p.stock === 0 ? 'is-empty' : ''}">${p.stock === 0 ? 'Agotado · puedes consultar otras opciones' : Number.isInteger(p.stock) ? `${p.stock} ${p.stock === 1 ? 'unidad disponible' : 'unidades disponibles'}` : 'Disponibilidad por confirmar con la tienda'}</p>
    ${
      p.isPre
        ? `<div class="pre-box"><p class="pre-box-title">Preventa</p>
            ${balance != null ? `<p class="pre-split"><span>Hoy reservas <b>${money(p.precio_reserva)}</b></span><span>Al llegar completas <b>${money(balance)}</b></span></p>` : ""}
            <p class="pre-policy-text">${esc(PREORDER_POLICY.text)}</p></div>`
        : `<p class="pdp-note">Confirma disponibilidad, pago y entrega con la tienda antes de comprar.</p>`
    }
    <div class="pdp-actions">
      <button class="btn btn-secondary btn-lg" type="button" ${p.stock===0 ? "disabled" : ""} data-add="${p.id}" data-add-label>${icons.plus}<span>${p.stock===0 ? "Agotado" : "Añadir a Mi selección"}</span></button>
      <button class="btn btn-primary btn-lg" type="button" data-wa="product" data-id="${p.id}">${icons.whatsapp}<span>${waLabel("Consultar por WhatsApp")}</span></button>
      ${heartButton(p, "fav-btn--inline fav-btn--lg")}
    </div>
    <div class="pdp-contact-note"><p>${esc(waContactNote())}</p>${!waDirectReady() ? `<a class="link-btn" href="${esc(SITE.instagram)}" target="_blank" rel="noopener">${icons.instagram}Consulta privada por Instagram</a>` : ''}</div>
    <dl class="meta-row meta-row--lg"><div><dt>Marca</dt><dd>${esc(p.brand)}</dd></div>${p.line ? `<div><dt>Línea / edición</dt><dd>${esc(p.line)}</dd></div>` : ""}${Number.isInteger(p.stock) ? `<div><dt>Stock</dt><dd>${p.stock===0 ? "Agotado" : `${p.stock} ${p.stock===1 ? "unidad" : "unidades"}`}</dd></div>` : ""}${p.franchise ? `<div><dt>Franquicia</dt><dd>${esc(p.franchise)}</dd></div>` : ""}${p.character_name ? `<div><dt>Personaje</dt><dd>${esc(p.character_name)}</dd></div>` : ""}<div><dt>Fotos publicadas</dt><dd>${p.images.length}</dd></div><div><dt>Estado</dt><dd>${esc(p.estado)}</dd></div><div><dt>Modalidad</dt><dd>${p.isPre ? "Preventa" : "Venta"}</dd></div><div><dt>Código</dt><dd>${esc(p.sku)}</dd></div></dl>
    ${p.description ? `<section class="pdp-details"><h2 class="h-mini">Sobre esta figura</h2><p>${esc(p.description)}</p></section>` : ""}
    ${purchaseDetails(p)}
    <button class="link-btn" type="button" data-copy-link>${icons.share}Copiar enlace de esta figura</button>
  </div>`;
}

export const product = {
  render(ctx) {
    const p = productFromPath(ctx.path);
    if (!p) return notFoundHTML();
    const more = moreFromBrand(p, 8);
    const rel = related(p, 8, new Set(more.map((x) => x.id)));
    const seen = recentIds().filter((id) => id !== p.id).map(getProduct).filter(Boolean).slice(0, 8);
    const others = brands.filter((b) => b.slug !== p.brandSlug);
    const title = `${p.name} · ${p.brand} · Grooty Store`;
    return {
      title,
      productId: p.id,
      description: `${p.titulo} (${p.brand}). ${p.isPre ? "Preventa" : "En venta"} · Precio total ${money(p.precio)}. Grooty Store Perú.`,
      html: `<div class="container pdp-wrap">
        ${breadcrumb([{ label: "Catálogo", href: "/catalogo" }, { label: p.brand, href: `/marcas/${p.brandSlug}` }, { label: p.name }])}
        <div class="pdp">${gallery(p)}${info(p)}</div>
      </div>
      <div class="pdp-bar" role="region" aria-label="Acciones rápidas">
        <div class="pdp-bar-price"><strong>${money(p.precio)}</strong>${p.isPre && p.precio_reserva != null ? `<span>Reserva ${money(p.precio_reserva)}</span>` : ""}</div>
        <button class="btn btn-secondary pdp-bar-selection" type="button" ${p.stock === 0 ? 'disabled' : ''} data-add="${p.id}">${icons.plus}<span>${p.stock === 0 ? 'Agotado' : 'Mi selección'}</span></button>
        <button class="btn btn-primary pdp-bar-contact" type="button" data-wa="product" data-id="${p.id}" aria-label="${waLabel("Consultar por WhatsApp")}">${icons.whatsapp}<span>Consultar</span></button>
      </div>
      ${
        more.length
          ? `<section class="band band--sage"><div class="container">${sectionHead({ title: `Más de ${esc(p.brand)}`, sub: `Otras piezas de ${esc(p.brand)}.`, action: `<a class="link-arrow" href="/marcas/${p.brandSlug}" data-nav>Ver toda la marca ${icons.arrow}</a>` })}${rail(more, { label: `Más de ${p.brand}` })}</div></section>`
          : ""
      }
      ${rel.length ? `<section class="band"><div class="container">${sectionHead({ title: "También puede interesarte", sub: "Explora otras piezas del catálogo para tu colección." })}${rail(rel, { label: "También puede interesarte" })}</div></section>` : ""}
      ${seen.length ? `<section class="band band--olive"><div class="container">${sectionHead({ title: "Vuelve a verlas", sub: "Las últimas figuras que revisaste." })}${rail(seen, { label: "Vistas recientemente" })}</div></section>` : ""}
      <div class="container">${keepExploring({ brands: others, showPre: true })}</div>`
    };
  },

  mount(root, ctx) {
    const p = productFromPath(ctx.path);
    if (!p) return;
    pushRecent(p.id);
    track("view_product", { id: p.id, brand: p.brand });
    if (p.isPre) track("preorder_view", { id: p.id });
    probeWithin(root);
    const ac = new AbortController();
    const sig = { signal: ac.signal };
    let sw = null;
    if (p.images.length > 1) import("./product-gallery.js").then((m) => {
      if (!ac.signal.aborted) sw = m.initGallery(root);
    }).catch(() => {});

    const open = (i) => openLightbox(p, i, sw);
    root.addEventListener("click", (e) => {
      const z = e.target.closest("[data-zoom-open]");
      if (z && !e.target.closest("a,button")) open(Number(z.dataset.zoomOpen));
      if (e.target.closest("[data-copy-link]")) copyText(location.href).then((ok) => toast(ok ? "Enlace copiado" : "No se pudo copiar el enlace"));
    }, sig);
    root.addEventListener("keydown", (e) => {
      const z = e.target.closest?.("[data-zoom-open]");
      if (z && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        open(Number(z.dataset.zoomOpen));
      }
    }, sig);
    return () => { ac.abort(); sw?.destroy(true, true); };
  }
};

/* ── Lightbox: ver la foto grande y ampliar con clic/toque ── */
function openLightbox(p, start, sw) {
  let i = start;
  const n = p.images.length;
  const html = `<div class="lb">
    <button class="close-btn close-btn--light" type="button" data-close-overlay aria-label="Cerrar" data-autofocus>${icons.close}</button>
    <div class="lb-stage" data-lb-stage><img data-lb-img alt="${esc(alt(p))}"></div>
    <div class="lb-bar">
      ${n > 1 ? `<button class="round-btn round-btn--light" type="button" data-lb-prev aria-label="Foto anterior">${icons.arrowLeft}</button>` : ""}
      <span class="lb-count" data-lb-count aria-live="polite"></span>
      ${n > 1 ? `<button class="round-btn round-btn--light" type="button" data-lb-next aria-label="Foto siguiente">${icons.arrow}</button>` : ""}
    </div>
    <p class="lb-tip">Toca la imagen para ampliar</p>
  </div>`;
  const panel = openOverlay({ kind: "lightbox", label: `Foto de ${p.titulo}`, html });
  const img = $("[data-lb-img]", panel);
  const stageEl = $("[data-lb-stage]", panel);
  const show = () => {
    const u = p.images[i];
    stageEl.classList.remove("is-zoomed");
    img.style.transformOrigin = "";
    img.setAttribute("src", imgUrl(u, 1600));
    img.dataset.orig = u;
    $("[data-lb-count]", panel).textContent = `${i + 1} / ${n}`;
    sw?.slideTo(i, 0);
  };
  img.addEventListener("error", () => img.src !== img.dataset.orig && (img.src = img.dataset.orig));
  show();
  stageEl.addEventListener("click", () => stageEl.classList.toggle("is-zoomed"));
  stageEl.addEventListener("pointermove", (e) => {
    if (!stageEl.classList.contains("is-zoomed")) return;
    const r = stageEl.getBoundingClientRect();
    img.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
  });
  $("[data-lb-prev]", panel)?.addEventListener("click", () => ((i = (i - 1 + n) % n), show()));
  $("[data-lb-next]", panel)?.addEventListener("click", () => ((i = (i + 1) % n), show()));
  panel.addEventListener("keydown", (e) => {
    if (n < 2) return;
    if (e.key === "ArrowRight") ((i = (i + 1) % n), show());
    if (e.key === "ArrowLeft") ((i = (i - 1 + n) % n), show());
  });
}
