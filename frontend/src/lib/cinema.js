export function youtubeVideoId(value) {
  const text = String(value ?? '').trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(text)) return text;
  let url;
  try { url = new URL(text); } catch { throw Error('Usa un enlace de YouTube válido.'); }
  if (url.protocol !== 'https:' || url.username || url.password) throw Error('Usa un enlace HTTPS de YouTube, sin credenciales.');
  let id;
  if (url.hostname === 'youtu.be') id = url.pathname.slice(1);
  else if (['youtube.com','www.youtube.com','www.youtube-nocookie.com'].includes(url.hostname)) id = url.pathname === '/watch' ? url.searchParams.get('v') : /^\/(embed|shorts)\//.test(url.pathname) ? url.pathname.split('/')[2] : '';
  if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) throw Error('Usa un enlace de vídeo de YouTube, no un canal o una playlist.');
  return id;
}

export function validateCinema(value) {
  if (!value || typeof value.enabled !== 'boolean') throw Error('Revisa la visibilidad del estreno.');
  const text = (key, max) => {
    if (typeof value[key] !== 'string' || value[key].length > max) throw Error('Revisa los textos del estreno.');
    return value[key].trim();
  };
  const title = text('title',120), summary = text('summary',500), query = text('query',80);
  if (title.length < 2 || summary.length < 2) throw Error('Añade título y descripción del estreno.');
  const videoId = youtubeVideoId(value.videoId);
  let url;
  try { url = new URL(value.source); } catch { throw Error('Añade un enlace a la fuente oficial del tráiler.'); }
  const hosts = ['marvel.com','www.marvel.com','disney.com','movies.disney.com','prensa.disney.es','press.disney.co.uk','marvel.disney.co.jp'];
  if (url.protocol !== 'https:' || url.username || url.password || !hosts.includes(url.hostname) || url.href.length > 1000) throw Error('Enlaza la fuente oficial de Marvel o Disney.');
  return { enabled:value.enabled, title, summary, query, videoId, source:url.href };
}

export function normalizeStoreSettings(value, fallback) {
  if (!value || typeof value !== 'object') throw Error('Configuración de tienda inválida.');
  const whatsapp = String(value.whatsapp ?? fallback.whatsapp ?? '').replace(/[\s()+-]/g,'');
  if (whatsapp && !/^[1-9]\d{7,14}$/.test(whatsapp)) throw Error('WhatsApp: usa el número real con código de país, sin letras.');
  return { ...value, whatsapp, cinema: validateCinema(value.cinema ?? fallback.cinema) };
}
