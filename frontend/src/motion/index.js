import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { $, $$, motionAllowed, prefersReducedMotion } from "../lib/dom.js";
import { initPointerEffects } from "./pointer.js";

gsap.registerPlugin(ScrollTrigger, SplitText);

/**
 * Capa de motion (mejora progresiva).
 * Las vistas solo marcan elementos con atributos declarativos:
 *   data-reveal            → aparece con fade-up al entrar al viewport
 *   data-reveal-group      → sus [data-reveal-item] aparecen en cascada
 *   data-split             → título con SplitText (líneas con máscara)
 * Si algo falla, se activa `.no-motion` y todo queda visible.
 */
export const EASE = "power3.out";
let ctx = null;
let enabled = false;

const inView = (el) => {
  const r = el.getBoundingClientRect();
  return r.top < innerHeight * 0.95 && r.bottom > 0;
};

function fail(err) {
  console.warn("[motion] desactivado:", err);
  document.documentElement.classList.add("no-motion");
  enabled = false;
  try {
    ctx?.revert();
  } catch {}
}

export const motion = {
  get enabled() {
    return enabled;
  },
  gsap,
  SplitText,
  ScrollTrigger,

  init() {
    const apply = () => {
      enabled = motionAllowed();
      document.documentElement.classList.toggle("no-motion", !enabled);
    };
    apply();
    matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", apply);
    if (enabled) initPointerEffects();
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
  },

  leave() {
    try {
      ctx?.revert();
    } catch {}
    ctx = null;
  },

  enter(root, { first = false, vt = false } = {}) {
    if (!enabled) return;
    try {
      ctx = gsap.context(() => {
        if (first) {
          gsap.from(".site-header .navbar > *", { y: -10, opacity: 0, duration: 0.5, stagger: 0.06, ease: EASE, clearProps: "all" });
        }

        // Escena orbital: se ejecuta solo mientras entra en el viewport.
        const orbits = $$(".hero-orbit", root);
        if (orbits.length) gsap.fromTo(orbits, { rotate: -5, scale: 0.96 }, { rotate: 7, scale: 1.04, ease: "none", scrollTrigger: { trigger: root.querySelector(".hero"), start: "top top", end: "bottom top", scrub: 1 } });
        const discovery = root.querySelector(".discovery-panel");
        if (discovery) gsap.fromTo(discovery, { backgroundPosition: "50% 40%" }, { backgroundPosition: "50% 65%", ease: "none", scrollTrigger: { trigger: discovery, start: "top bottom", end: "bottom top", scrub: 1 } });

        // Títulos con SplitText (solo los marcados)
        $$("[data-split]", root).forEach((el) => {
          if (vt && inView(el) && !first) return;
          const run = () => {
            const split = SplitText.create(el, { type: "lines", mask: "lines", linesClass: "split-line" });
            gsap.from(split.lines, { yPercent: 105, duration: 0.8, stagger: 0.09, ease: EASE, delay: first ? 0.1 : 0, onComplete: () => split.revert() });
          };
          document.fonts?.ready ? document.fonts.ready.then(run) : run();
        });

        // Elementos sueltos
        const singles = $$("[data-reveal]", root).filter((el) => !(vt && inView(el)));
        if (singles.length) {
          gsap.set(singles, { opacity: 0, y: 22 });
          ScrollTrigger.batch(singles, {
            start: "top 92%",
            once: true,
            onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, duration: 0.7, stagger: 0.08, ease: EASE, overwrite: true, clearProps: "transform,opacity" })
          });
        }

        // Grupos (cards, pasos, marcas)
        $$("[data-reveal-group]", root).forEach((group) => {
          const items = $$("[data-reveal-item]", group).filter((el) => !(vt && inView(el)));
          if (!items.length) return;
          gsap.set(items, { opacity: 0, y: 26 });
          ScrollTrigger.batch(items, {
            start: "top 94%",
            once: true,
            interval: 0.08,
            batchMax: 8,
            onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, duration: 0.6, stagger: 0.055, ease: EASE, overwrite: true, clearProps: "transform,opacity" })
          });
        });
      }, root);
    } catch (e) {
      fail(e);
    }
  },

  /** Primeras cards del catálogo: cascada corta (no anima las 88) */
  introCards(cards) {
    if (!enabled || !cards.length) return;
    try {
      const vis = cards.filter(inView).slice(0, 12);
      if (vis.length) gsap.from(vis, { opacity: 0, y: 22, duration: 0.55, stagger: 0.045, ease: EASE, clearProps: "opacity,transform" });
    } catch (e) {
      fail(e);
    }
  },

  /** Nuevas cards tras "Ver más" */
  revealCards(cards) {
    if (!enabled || !cards.length) return;
    gsap.from(cards, { opacity: 0, y: 20, duration: 0.5, stagger: 0.04, ease: EASE, clearProps: "opacity,transform" });
  }
};
