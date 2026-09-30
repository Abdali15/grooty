import { $, $$, motionAllowed } from "./lib/dom.js";
import { addToSelection, toggleFavorite, isFavorite, on } from "./store.js";
import { getProduct, randomProduct, productFromPath } from "./data.js";
import { toast } from "./components/toast.js";
import { openQuickView } from "./components/quickview.js";
import { openCollection } from "./components/drawer.js";
import { openPalette } from "./components/palette.js";
import { isOverlayOpen } from "./components/overlay.js";
import { sendWhatsApp, productMessage, selectionMessage, generalMessage } from "./lib/whatsapp.js";
import { navigate, currentPath } from "./router.js";
import { prefetchProduct } from "./views/product.js";
import { track } from "./analytics.js";

function flash(btn, cls, ms) {
  btn.classList.add(cls);
  setTimeout(() => btn.classList.remove(cls), ms);
}

function paintFavorites() {
  $$("[data-fav]").forEach((b) => {
    const p = getProduct(b.dataset.fav);
    const on = isFavorite(b.dataset.fav);
    b.setAttribute("aria-pressed", on);
    if (p) b.setAttribute("aria-label", `${on ? "Quitar de favoritos" : "Guardar en favoritos"}: ${p.name}`);
  });
}

export function initActions() {
  on("favorites", paintFavorites);

  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-add],[data-fav],[data-quick],[data-collection],[data-search-open],[data-wa],[data-surprise],[data-scroll-top],[data-rail-prev],[data-rail-next],[data-brand]");
    if (!t) return;

    if (t.dataset.add) {
      e.preventDefault();
      const p = getProduct(t.dataset.add);
      if (!p) return;
      if (p.stock === 0) return toast("Esta figura está agotada. Consulta otras piezas del catálogo.");
      addToSelection(p.id);
      track("add_selection", { id: p.id });
      flash(t, "is-done", 950);
      toast("Añadido a Mi selección", { action: { label: "Ver", fn: () => openCollection("selection") } });
      return;
    }
    if (t.dataset.fav) {
      e.preventDefault();
      const id = Number(t.dataset.fav);
      const now = toggleFavorite(id);
      track(now ? "favorite_add" : "favorite_remove", { id });
      $$(`[data-fav="${id}"]`).forEach((b) => now && flash(b, "is-pop", 520));
      return;
    }
    if (t.dataset.quick) {
      e.preventDefault();
      openQuickView(t.dataset.quick);
      return;
    }
    if (t.dataset.collection) {
      openCollection(t.dataset.collection);
      return;
    }
    if (t.hasAttribute("data-search-open")) {
      openPalette();
      return;
    }
    if (t.dataset.wa) {
      e.preventDefault();
      if (t.dataset.wa === "product") {
        const p = getProduct(t.dataset.id);
        if (p) sendWhatsApp(() => productMessage(p), "product");
      } else if (t.dataset.wa === "selection") sendWhatsApp((links) => selectionMessage({ links }), "selection");
      else sendWhatsApp(() => generalMessage(), "general");
      return;
    }
    if (t.hasAttribute("data-surprise")) {
      const cur = productFromPath(currentPath());
      const p = randomProduct(cur?.id);
      if (p) navigate(p.url);
      return;
    }
    if (t.hasAttribute("data-scroll-top")) {
      window.scrollTo({ top: 0, behavior: motionAllowed() ? "smooth" : "instant" });
      return;
    }
    const rail = t.closest("[data-rail]")?.querySelector(".rail");
    if (rail && (t.hasAttribute("data-rail-prev") || t.hasAttribute("data-rail-next"))) {
      const dir = t.hasAttribute("data-rail-next") ? 1 : -1;
      rail.scrollBy({ left: dir * rail.clientWidth * 0.85, behavior: motionAllowed() ? "smooth" : "instant" });
      return;
    }
    if (t.dataset.brand) track("brand_click", { brand: t.dataset.brand });
  });

  /* Arrastrar rieles con el ratón */
  let drag = null;
  document.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    const rail = e.target.closest(".rail");
    if (!rail || e.target.closest("button")) return;
    drag = { rail, x: e.clientX, left: rail.scrollLeft, moved: false };
  });
  document.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 6) {
      drag.moved = true;
      drag.rail.classList.add("is-dragging");
    }
    if (drag.moved) drag.rail.scrollLeft = drag.left - dx;
  });
  const endDrag = () => {
    if (!drag) return;
    const r = drag.rail;
    const moved = drag.moved;
    drag = null;
    if (moved) setTimeout(() => r.classList.remove("is-dragging"), 0);
  };
  document.addEventListener("pointerup", endDrag);
  document.addEventListener("pointercancel", endDrag);
  document.addEventListener("click", (e) => e.target.closest(".rail.is-dragging") && (e.preventDefault(), e.stopPropagation()), true);

  /* Atajos de teclado */
  document.addEventListener("keydown", (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      openPalette();
    } else if (e.key === "/" && !typing && !isOverlayOpen()) {
      e.preventDefault();
      openPalette();
    }
  });

  /* Precarga intención: al pasar sobre una card, adelanta el chunk de la galería */
  let warmed = false;
  document.addEventListener("pointerover", (e) => {
    if (!warmed && e.target.closest?.(".card")) {
      warmed = true;
      prefetchProduct().catch(() => {});
    }
  }, { passive: true });
}
