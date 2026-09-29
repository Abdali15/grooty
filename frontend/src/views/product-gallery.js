import Swiper from "swiper";
import { Navigation, Pagination, Keyboard, A11y } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { $, $$ } from "../lib/dom.js";

/** Galería con Swiper (touch, drag, teclado, paginación accesible) + miniaturas sincronizadas */
export function initGallery(root, { onIndex } = {}) {
  const el = $(".gallery-swiper", root);
  if (!el) return null;
  const thumbs = $$("[data-thumb]", root);
  const sw = new Swiper(el, {
    modules: [Navigation, Pagination, Keyboard, A11y],
    slidesPerView: 1,
    spaceBetween: 12,
    keyboard: { enabled: true, onlyInViewport: true },
    pagination: { el: $(".swiper-pagination", el), clickable: true },
    navigation: { prevEl: $("[data-g-prev]", root), nextEl: $("[data-g-next]", root) },
    a11y: { prevSlideMessage: "Foto anterior", nextSlideMessage: "Foto siguiente", paginationBulletMessage: "Ir a la foto {{index}}", containerMessage: "Galería de fotos del producto" },
    on: {
      slideChange(s) {
        thumbs.forEach((t, i) => {
          t.classList.toggle("is-on", i === s.activeIndex);
          t.setAttribute("aria-current", i === s.activeIndex ? "true" : "false");
        });
        onIndex?.(s.activeIndex);
      }
    }
  });
  thumbs.forEach((t, i) => t.addEventListener("click", () => sw.slideTo(i)));
  return sw;
}
