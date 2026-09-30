import { SITE } from '../config.js';
import { esc } from '../lib/dom.js';
import { icons } from '../lib/icons.js';
import { products } from '../data.js';
import { productCard } from './card.js';
import { norm } from '../lib/format.js';
import { track } from '../analytics.js';
import { validateCinema } from '../lib/cinema.js';

export function cinemaPanel() {
  let feature;
  try { feature=validateCinema(SITE.cinema); } catch { return ''; }
  if (!feature.enabled) return '';
  const query = norm(feature.query);
  const picked = query ? products.filter(p=>norm(`${p.titulo} ${p.character_name||''} ${p.franchise||''}`).includes(query)).slice(0,3) : [];
  const videoUrl = `https://www.youtube.com/watch?v=${feature.videoId}`;
  const catalogUrl = query ? `/catalogo?q=${encodeURIComponent(feature.query)}` : '/catalogo';
  return `<section class="cinema-section" aria-labelledby="cinema-title">
    <div class="cinema-top" data-reveal><p class="eyebrow">Universos en pantalla</p><p>Inspira tu próxima colección</p></div>
    <div class="cinema-layout" data-reveal>
      <div class="cinema-media" data-cinema-media data-tilt>
        <button type="button" class="cinema-play" data-cinema-play data-video-id="${feature.videoId}" aria-label="Reproducir tráiler oficial de ${esc(feature.title)}"><img src="https://i.ytimg.com/vi/${feature.videoId}/hqdefault.jpg" alt="" loading="lazy" decoding="async" width="480" height="360"><span class="cinema-shade" aria-hidden="true"></span><span class="cinema-play-icon" aria-hidden="true">${icons.play}</span><span class="cinema-play-label">Ver tráiler oficial</span></button>
      </div>
      <div class="cinema-copy"><h2 id="cinema-title">${esc(feature.title)}</h2><p>${esc(feature.summary)}</p><a href="${catalogUrl}" data-nav class="btn btn-primary">Explorar figuras ${icons.arrow}</a><div class="cinema-links"><a href="${feature.source}" target="_blank" rel="noopener">Fuente oficial Disney / Marvel ${icons.external}</a><a href="${videoUrl}" target="_blank" rel="noopener">Abrir en YouTube ${icons.external}</a></div><p class="cinema-fine">Material promocional de sus titulares. Grooty Store es una tienda independiente.</p></div>
    </div>
    ${picked.length ? `<div class="cinema-related"><div class="cinema-related-head"><h3>Del universo Marvel a tu colección</h3><a class="link-arrow" href="${catalogUrl}" data-nav>Ver más ${icons.arrow}</a></div><div class="product-grid cinema-products" data-reveal-group>${picked.map(p=>productCard(p).replace('class="card ','data-reveal-item class="card ')).join('')}</div><p class="cinema-fine">Figuras de personajes relacionados; revisa en cada ficha la versión y la línea de la figura.</p></div>` : ''}
  </section>`;
}

export function mountCinema(root) {
  const ac=new AbortController();
  root.addEventListener('click',event=>{
    const button=event.target.closest('[data-cinema-play]');
    if (!button || !root.contains(button)) return;
    const id=button.dataset.videoId;
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return;
    const media=button.closest('[data-cinema-media]');
    const frame=document.createElement('iframe');
    frame.src=`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`;
    frame.title='Tráiler oficial';frame.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';frame.allowFullscreen=true;
    frame.referrerPolicy='strict-origin-when-cross-origin';
    media.classList.add('is-playing');media.replaceChildren(frame);frame.focus();
    track('trailer_play',{videoId:id});
  },{signal:ac.signal});
  return ()=>ac.abort();
}
