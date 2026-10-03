import { catalogSource } from "./lib/catalog-source.js";
const raw = catalogSource();
import { SITE } from "./config.js";
import { norm, slugify, compact } from "./lib/format.js";

/**
 * Catálogo normalizado. `catalog.json` NO se modifica: aquí solo se derivan campos.
 * Orden del array = orden de incorporación (los más recientes primero).
 */
const STOP = new Set(["the", "and", "ver", "version", "series", "serie", "legends", "marvel", "figura", "de", "del", "la", "el", "vs", "con", "comic", "bonus", "limited", "costume", "classic", "reissue", "renewal", "movie", "suit", "black", "blue", "figure"]);

export const products = raw.map((p, index) => {
  const [name, ...rest] = String(p.titulo).split(" - ");
  const line = rest.join(" - ");
  const isPre = p.tipo === "preventa";
  const images = (p.imagenes_producto || [])
    .slice()
    .sort((a, b) => (a.posicion ?? 0) - (b.posicion ?? 0))
    .map((i) => i.url)
    .filter(Boolean);
  const slug = `${slugify(p.titulo)}-${p.id}`;
  return {
    ...p,
    index,
    name: name.trim(),
    line: line.trim(),
    isPre,
    isOpen: norm(p.estado) === "open",
    images,
    image: images[0] || "",
    slug,
    url: `/figura/${slug}`,
    brand: p.marca,
    brandSlug: slugify(p.marca),
    tokens: [...new Set(norm(p.titulo).split(/[^a-z0-9]+/).filter((t) => t.length > 3 && !STOP.has(t) && !/^\d+$/.test(t)))]
  };
});

export const byId = new Map(products.map((p) => [p.id, p]));
export const getProduct = (id) => byId.get(Number(id));
export const productFromPath = (pathname) => {
  const m = pathname.match(/-(\d+)\/?$/);
  return m ? byId.get(Number(m[1])) || null : null;
};

/* Marcas: orden por cantidad de figuras (desc), luego alfabético */
const brandMap = new Map();
products.forEach((p) => {
  if (!brandMap.has(p.brandSlug)) brandMap.set(p.brandSlug, { name: p.brand, slug: p.brandSlug, items: [] });
  brandMap.get(p.brandSlug).items.push(p);
});
export const brands = [...brandMap.values()]
  .map((b) => ({ ...b, count: b.items.length, preCount: b.items.filter((p) => p.isPre).length, url: `/marcas/${b.slug}` }))
  .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "es"));
export const brandBySlug = (slug) => brands.find((b) => b.slug === slug) || null;

export const preorders = products.filter((p) => p.isPre);
export const latest = (n = 8) => products.slice(0, n);

/** Slides del hero: ids configurables; si alguno no existe se completa con los más recientes. */
export function heroProducts(n = 5) {
  const picked = (SITE.heroIds || []).map(getProduct).filter(Boolean);
  const seen = new Set(picked.map((p) => p.id));
  for (const p of products) {
    if (picked.length >= n) break;
    if (!seen.has(p.id) && p.image) picked.push(p);
  }
  return picked.slice(0, n);
}

/** Más de esta marca (más recientes primero) */
export const moreFromBrand = (p, n = 8) => products.filter((x) => x.brandSlug === p.brandSlug && x.id !== p.id).slice(0, n);

/** También puede interesarte: comparte personajes/franquicia (palabras del título), cualquier marca. */
export function related(p, n = 8, exclude = new Set()) {
  const scored = products
    .filter((x) => x.id !== p.id && !exclude.has(x.id))
    .map((x) => {
      const sameCharacter = p.character_name && x.character_name && norm(p.character_name).trim() === norm(x.character_name).trim();
      const sameFranchise = p.franchise && x.franchise && norm(p.franchise).trim() === norm(x.franchise).trim();
      const shared = x.tokens.filter((t) => p.tokens.includes(t)).length;
      const score = (sameCharacter ? 20 : 0) + (sameFranchise ? 10 : 0) + shared * 3 + (x.isPre === p.isPre ? 1 : 0) + (x.brandSlug === p.brandSlug ? 0.5 : 0);
      return { x, score };
    })
    .filter((s) => s.score >= 3)
    .sort((a, b) => b.score - a.score || a.x.index - b.x.index)
    .map((s) => s.x);
  if (scored.length >= 4) return scored.slice(0, n);
  const fill = products.filter((x) => x.id !== p.id && !exclude.has(x.id) && !scored.includes(x))
    .sort((a, b) => Number(b.brandSlug === p.brandSlug) - Number(a.brandSlug === p.brandSlug) || a.index - b.index)
    .slice(0, n - scored.length);
  return [...scored, ...fill].slice(0, n);
}

/* Texto indexable para búsqueda */
export const searchDocs = products.map((p) => ({
  id: p.id,
  name: norm(p.name),
  line: norm(p.line),
  brand: norm(p.brand),
  sku: norm(p.sku),
  mode: p.isPre ? "preventa" : "venta",
  compact: compact(`${p.brand} ${p.titulo}`)
}));

/* Facetas: conteos reales */
export const PRICE_BUCKETS = [
  { key: "0-150", label: "Hasta S/ 150", test: (n) => n <= 150 },
  { key: "150-250", label: "S/ 150 – 250", test: (n) => n > 150 && n <= 250 },
  { key: "250-", label: "Más de S/ 250", test: (n) => n > 250 }
];

export const randomProduct = (excludeId) => {
  const pool = products.filter((p) => p.id !== excludeId && p.image);
  return pool[Math.floor(Math.random() * pool.length)];
};
