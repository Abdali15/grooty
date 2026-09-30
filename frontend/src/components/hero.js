import { esc, $, $$, motionAllowed } from "../lib/dom.js";
import { money } from "../lib/format.js";
import { icons } from "../lib/icons.js";
import { stage } from "../lib/images.js";
import { heroProducts } from "../data.js";
import { badge } from "./card.js";
import { motion, EASE } from "../motion/index.js";

const SALE_TONES = ["sage", "olive", "dark"];
const AUTOPLAY_MS = 8500;

export function heroHTML() {
  const list = heroProducts(5);
  if (!list.length) return "";
  let sale = 0;
  const slides = list.map((p) => ({ p, tone: p.isPre ? "champagne" : SALE_TONES[sale++ % SALE_TONES.length] }));
  const n = String(slides.length).padStart(2, "0");
  return `<section class="hero" data-hero data-tone="${slides[0].tone}" data-parallax aria-roledescription="carrusel" aria-label="Figuras destacadas">
    <h1 class="sr-only">Grooty Store: figuras de colección, preventas y novedades en Perú</h1>
    <div class="hero-bgword layer-far" aria-hidden="true"><span data-hero-word>${esc(list[0].brand)}</span></div>
    <div class="hero-orbit" aria-hidden="true"><i></i><i></i></div>
    <div class="hero-grain" aria-hidden="true"></div>
    <div class="hero-slides">
      ${slides
        .map(
          ({ p, tone }, i) => `<article class="hero-slide ${i === 0 ? "is-active" : ""}" data-slide="${i}" data-tone="${tone}" data-word="${esc(p.brand)}" role="group" aria-roledescription="diapositiva" aria-label="${i + 1} de ${slides.length}" ${i === 0 ? "" : 'aria-hidden="true" inert'}>
        <div class="hero-copy">
          <p class="hero-eyebrow"><span class="signal-dot" aria-hidden="true"></span>Selección Grooty</p>
          <p class="hero-brand"><span class="mask"><span class="mask-in">${esc(p.brand)}</span></span></p>
          <p class="hero-title" data-hero-title>${esc(p.name)}</p>
          ${p.line ? `<p class="hero-line">${esc(p.line)}</p>` : ""}
          <div class="hero-meta">${badge(p)}<span class="hero-sku">${esc(p.stock === 0 ? "Agotado" : p.isPre ? "Consulta esta preventa" : Number.isInteger(p.stock) ? "Stock informado" : "Consulta disponibilidad")}</span></div>
          <div class="hero-price"><strong>${money(p.precio)}</strong>${p.isPre && p.precio_reserva != null ? `<span>Reserva ${money(p.precio_reserva)}</span>` : ""}</div>
          <div class="hero-actions">
            <a class="btn btn-hero" href="${p.url}" data-nav data-magnetic>Ver figura ${icons.arrow}</a>
            <button class="btn btn-ghost" type="button" ${p.stock===0 ? "disabled" : ""} data-add="${p.id}">${icons.plus}<span>Mi selección</span></button>
          </div>
        </div>
        <div class="hero-visual layer-near">
          <div class="hero-frame" data-tilt>
            <span class="frame-corner frame-corner--tl" aria-hidden="true"></span><span class="frame-corner frame-corner--br" aria-hidden="true"></span>
            ${stage(p.image, `${p.brand} — ${p.titulo}`, { sizes: "(min-width:1024px) 520px, 88vw", widths: [480, 720, 960, 1200], eager: i === 0, cls: "hero-stage" })}
            <span class="hero-frame-label" aria-hidden="true">GROOTY / FIGURAS DE COLECCIÓN</span>
            <span class="hero-glare" aria-hidden="true"></span>
          </div>
        </div>
      </article>`
        )
        .join("")}
    </div>
    <div class="hero-ui">
      <div class="hero-count sr-only" aria-hidden="true"><b data-hero-cur>01</b><span>/ ${n}</span></div>
      <div class="hero-dots" role="group" aria-label="Elegir figura destacada">
        ${slides.map(({ p }, i) => `<button class="hero-dot ${i === 0 ? "is-active" : ""}" type="button" data-dot="${i}" aria-label="Ver figura ${i + 1}: ${esc(p.name)}" ${i === 0 ? 'aria-current="true"' : ""}><span class="dot-fill"></span></button>`).join("")}
      </div>
      <div class="hero-controls">
        <button class="round-btn" type="button" data-hero-prev aria-label="Figura anterior">${icons.arrowLeft}</button>
        <button class="round-btn" type="button" data-hero-toggle aria-label="Pausar rotación automática" data-playing="true"><span class="ic-pause">${icons.pause}</span><span class="ic-play">${icons.play}</span></button>
        <button class="round-btn" type="button" data-hero-next aria-label="Figura siguiente">${icons.arrow}</button>
      </div>
    </div>
    <p class="sr-only" aria-live="polite" data-hero-live></p>
  </section>`;
}

export function mountHero(root, { intro = false } = {}) {
  const hero = $("[data-hero]", root);
  if (!hero) return () => {};
  const slides = $$(".hero-slide", hero);
  const dots = $$(".hero-dot", hero);
  const len = slides.length;
  const ac = new AbortController();
  const sig = { signal: ac.signal };
  let anim = motionAllowed();
  const flags = { hover: false, focus: false, drag: false, hidden: document.hidden, user: len <= 1, off: false };
  let idx = 0;
  let busy = false;
  const timeline = [];
  let introTimeline = null;
  hero.style.setProperty('--hero-wait', `${AUTOPLAY_MS}ms`);

  hero.classList.toggle("is-static", !anim);
  const toggleBtn = $("[data-hero-toggle]", hero);
  toggleBtn.hidden = !anim || len <= 1;
  if (len <= 1) $('.hero-ui',hero).hidden = true;

  const paused = () => Object.values(flags).some(Boolean);
  const syncPause = () => hero.classList.toggle("is-paused", paused() || !anim);
  const pauseByUser = () => {
    flags.user = true;
    toggleBtn.dataset.playing = 'false';
    toggleBtn.setAttribute('aria-label', 'Reanudar rotación automática');
    syncPause();
  };
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const refreshMotion = () => {
    anim = motionAllowed();
    if (!anim) { timeline.forEach(t => t.progress(1)); introTimeline?.progress(1); }
    hero.classList.toggle('is-static', !anim);
    toggleBtn.hidden = !anim || len <= 1;
    syncPause();
  };
  media.addEventListener('change', refreshMotion);

  function setDots(n) {
    dots.forEach((d, i) => {
      const on = i === n;
      d.classList.toggle("is-active", on);
      on ? d.setAttribute("aria-current", "true") : d.removeAttribute("aria-current");
      if (on) {
        const fill = $(".dot-fill", d);
        fill.style.animation = "none";
        void fill.offsetWidth;
        fill.style.animation = "";
      }
    });
  }

  function goTo(n, dir = 1, { manual = false } = {}) {
    if (manual) pauseByUser();
    n = (n + len) % len;
    if (n === idx) return;
    if (busy && anim) {
      // permite avanzar rápido: termina la transición anterior
      timeline.forEach((t) => t.progress(1));
    }
    const from = slides[idx];
    const to = slides[n];
    const tone = to.dataset.tone;
    hero.dataset.tone = tone;
    $("[data-hero-cur]", hero).textContent = String(n + 1).padStart(2, "0");
    if (manual) $("[data-hero-live]", hero).textContent = `Figura ${n + 1} de ${len}: ${$(".hero-title", to).textContent}`;
    setDots(n);

    to.removeAttribute("aria-hidden");
    to.inert = false;
    from.setAttribute("aria-hidden", "true");
    from.inert = true;

    const word = $("[data-hero-word]", hero);
    const swapWord = () => (word.textContent = to.dataset.word);

    if (!anim) {
      from.classList.remove("is-active");
      to.classList.add("is-active");
      swapWord();
      idx = n;
      return;
    }

    busy = true;
    const gsap = motion.gsap;
    const fromVis = $(".hero-visual", from);
    const toVis = $(".hero-visual", to);
    const fromCopy = $$(".hero-copy > *", from);
    to.classList.add("is-active");
    from.classList.add("is-leaving");
    from.classList.remove("is-active");

    const tl = gsap.timeline({
      defaults: { ease: EASE },
      onComplete: () => {
        from.classList.remove("is-leaving");
        gsap.set([fromVis, ...fromCopy], { clearProps: "all" });
        busy = false;
      }
    });
    timeline.length = 0;
    timeline.push(tl);
    // saliente
    tl.to(fromVis, { scale: 0.96, opacity: 0, x: -28 * dir, duration: 0.45, ease: "power2.in" }, 0)
      .to(fromCopy, { opacity: 0, y: -10, duration: 0.28, stagger: 0.025, ease: "power2.in" }, 0)
      // palabra de fondo
      .to(word, { opacity: 0, duration: 0.25 }, 0)
      .add(swapWord, 0.25)
      .to(word, { opacity: 1, duration: 0.5 }, 0.28);
    // entrante
    tl.fromTo(toVis, { scale: 0.94, opacity: 0, x: 36 * dir, rotate: 1.2 * dir }, { scale: 1, opacity: 1, x: 0, rotate: 0, duration: 0.85, clearProps: "transform,opacity" }, 0.18);
    const brandIn = $(".mask-in", to);
    tl.fromTo(brandIn, { yPercent: 115 }, { yPercent: 0, duration: 0.6, clearProps: "transform" }, 0.3);
    const title = $("[data-hero-title]", to);
    const split = motion.SplitText.create(title, { type: "lines", mask: "lines" });
    tl.from(split.lines, { yPercent: 110, duration: 0.75, stagger: 0.08, onComplete: () => split.revert() }, 0.34);
    tl.from($$(".hero-line, .hero-meta, .hero-price, .hero-actions > *", to), { opacity: 0, y: 16, duration: 0.55, stagger: 0.07, clearProps: "opacity,transform" }, 0.5);
    idx = n;
  }
  const next = (manual = false) => goTo(idx + 1, 1, { manual });
  const prev = () => goTo(idx - 1, -1, { manual: true });

  /* Autoplay: la barra CSS es el temporizador; pausar la animación pausa el tiempo */
  hero.addEventListener("animationend", (e) => {
    if (e.target.classList?.contains("dot-fill") && anim && motionAllowed() && !paused()) next();
  }, sig);

  $("[data-hero-next]", hero).addEventListener("click", () => next(true), sig);
  $("[data-hero-prev]", hero).addEventListener("click", () => prev(), sig);
  dots.forEach((d, i) => d.addEventListener("click", () => goTo(i, i > idx ? 1 : -1, { manual: true }), sig));
  toggleBtn.addEventListener(
    "click",
    () => {
      flags.user = !flags.user;
      toggleBtn.dataset.playing = String(!flags.user);
      toggleBtn.setAttribute("aria-label", flags.user ? "Reanudar rotación automática" : "Pausar rotación automática");
      syncPause();
    },
    sig
  );

  hero.addEventListener("pointerenter", (e) => e.pointerType === "mouse" && ((flags.hover = true), syncPause()), sig);
  hero.addEventListener("pointerleave", () => ((flags.hover = false), syncPause()), sig);
  hero.addEventListener("focusin", (e) => e.target.matches(":focus-visible") && ((flags.focus = true), syncPause()), sig);
  hero.addEventListener("focusout", () => queueMicrotask(() => {
    if (!ac.signal.aborted && !hero.contains(document.activeElement)) { flags.focus = false; syncPause(); }
  }), sig);
  document.addEventListener("visibilitychange", () => ((flags.hidden = document.hidden), syncPause()), sig);
  const observer = new IntersectionObserver(([e]) => ((flags.off = !e.isIntersecting), syncPause()), { threshold: 0.25 });
  observer.observe(hero);

  hero.addEventListener("keydown", (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.key === "ArrowRight") { e.preventDefault(); next(true); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
  }, sig);

  /* Swipe / arrastre */
  const area = $(".hero-slides", hero);
  let sx = 0, sy = 0, dx = 0, down = false, moved = false;
  area.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button,a")) return;
    down = true;
    moved = false;
    sx = e.clientX;
    sy = e.clientY;
    dx = 0;
  }, sig);
  area.addEventListener("pointermove", (e) => {
    if (!down) return;
    dx = e.clientX - sx;
    if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(e.clientY - sy)) {
      moved = true;
      flags.drag = true;
      syncPause();
    }
  }, sig);
  const end = () => {
    if (!down) return;
    down = false;
    flags.drag = false;
    if (moved && Math.abs(dx) > 50) dx < 0 ? next(true) : prev();
    syncPause();
  };
  area.addEventListener("pointerup", end, sig);
  area.addEventListener("pointercancel", end, sig);
  window.addEventListener("pointerup", end, sig);
  window.addEventListener("pointercancel", end, sig);
  area.addEventListener("click", (e) => moved && (e.preventDefault(), e.stopPropagation()), { ...sig, capture: true });

  syncPause();

  /* Entrada inicial */
  if (anim && intro) {
    const gsap = motion.gsap;
    const s = slides[0];
    document.fonts.ready.then(() => {
      if (ac.signal.aborted || !anim) return;
      const split = motion.SplitText.create($("[data-hero-title]", s), { type: "lines", mask: "lines" });
      introTimeline = gsap.timeline({ defaults: { ease: EASE } })
        .from($(".mask-in", s), { yPercent: 115, duration: 0.6, clearProps: "transform" }, 0.05)
        .from(split.lines, { yPercent: 110, duration: 0.8, stagger: 0.08, onComplete: () => split.revert() }, 0.1)
        .from($$(".hero-line, .hero-meta, .hero-price, .hero-actions > *", s), { opacity: 0, y: 16, duration: 0.6, stagger: 0.07, clearProps: "opacity,transform" }, 0.3)
        .from($(".hero-visual", s), { scale: 0.965, duration: 0.9, clearProps: "transform" }, 0)
        .from($(".hero-ui", hero), { opacity: 0, y: 10, duration: 0.6, clearProps: "opacity,transform" }, 0.5);
    });
  }

  return () => {
    ac.abort();
    observer.disconnect();
    media.removeEventListener('change', refreshMotion);
    introTimeline?.kill();
    timeline.forEach((t) => t.kill());
  };
}
