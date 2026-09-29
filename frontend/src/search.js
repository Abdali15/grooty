import { searchDocs, byId, products } from "./data.js";
import { norm, compact } from "./lib/format.js";

/** Alias simétricos (español ↔ inglés, formas sin espacio). Solo términos que existen en el catálogo. */
const ALIASES = [
  ["gambit", "gambito"],
  ["green goblin", "duende verde"],
  ["captain america", "capitan america"],
  ["black panther", "pantera negra"],
  ["spider man", "spiderman"],
  ["shf", "sh figuarts"],
  ["figuarts", "sh figuarts"],
  ["marvel", "marvel legends"],
  ["doctor doom", "doom"]
];

let fuse = null;
let fuseLoose = null;
let loading = null;

export function ensureFuse() {
  if (loading) return loading;
  loading = import("fuse.js")
    .then(({ default: Fuse }) => {
      const keys = [
        { name: "name", weight: 0.5 },
        { name: "brand", weight: 0.25 },
        { name: "compact", weight: 0.2 },
        { name: "line", weight: 0.15 },
        { name: "sku", weight: 0.1 }
      ];
      const base = { keys, ignoreLocation: true, includeScore: true, minMatchCharLength: 2 };
      fuse = new Fuse(searchDocs, { ...base, threshold: 0.36 });
      fuseLoose = new Fuse(searchDocs, { ...base, threshold: 0.55 });
      return fuse;
    })
    .catch(() => null); // si falla, queda la búsqueda simple
  return loading;
}
export const fuseReady = () => !!fuse;

function variants(nq) {
  const set = new Set([nq]);
  const c = compact(nq);
  if (c && c !== nq) set.add(c);
  for (const [a, b] of ALIASES) {
    if (nq.includes(a)) set.add(nq.replace(a, b));
    if (nq.includes(b) && a !== b) set.add(nq.replace(b, a));
  }
  return [...set].filter((v) => v.length >= 2);
}

function simple(nq) {
  const toks = nq.split(/\s+/).filter(Boolean);
  const c = compact(nq);
  return searchDocs
    .filter((d) => {
      const hay = `${d.name} ${d.line} ${d.brand} ${d.sku} ${d.mode}`;
      return toks.every((t) => hay.includes(t)) || (c.length > 2 && d.compact.includes(c));
    })
    .map((d) => ({ id: d.id, score: 0.1 }));
}

/** Devuelve [{id, score}] ordenado por relevancia (menor score = mejor). */
export function searchIds(q) {
  const nq = norm(q).trim();
  if (nq.length < 1) return [];
  const best = new Map();
  const put = (id, score) => {
    if (!best.has(id) || best.get(id) > score) best.set(id, score);
  };
  if (!fuse) {
    variants(nq).forEach((v) => simple(v).forEach((r) => put(r.id, r.score)));
  } else {
    const c = compact(nq);
    for (const v of variants(nq)) {
      fuse.search(v).forEach((r) => {
        const d = searchDocs[r.refIndex];
        const exact = d.name.includes(v) || d.compact.includes(compact(v)) || d.brand.includes(v);
        put(d.id, exact ? r.score * 0.4 : r.score);
      });
    }
    // asegura coincidencias literales aunque Fuse las puntúe bajo
    simple(nq).forEach((r) => put(r.id, Math.min(best.get(r.id) ?? 1, 0.12)));
    if (c.length > 2) searchDocs.forEach((d) => d.compact.includes(c) && put(d.id, Math.min(best.get(d.id) ?? 1, 0.1)));
  }
  return [...best.entries()].map(([id, score]) => ({ id, score })).sort((a, b) => a.score - b.score || byId.get(a.id).index - byId.get(b.id).index);
}

/** "¿Quisiste decir…?": mejor candidato con umbral laxo cuando no hay resultados. */
export function didYouMean(q) {
  if (!fuseLoose) return null;
  const nq = norm(q).trim();
  if (nq.length < 3) return null;
  const hit = fuseLoose.search(nq, { limit: 1 })[0];
  if (!hit || hit.score > 0.5) return null;
  return byId.get(searchDocs[hit.refIndex].id);
}

export const SUGGESTIONS = [
  { label: "Mafex", q: "mafex" },
  { label: "Spider-Man", q: "spider man" },
  { label: "Marvel Legends", q: "marvel legends" },
  { label: "Preventa", q: "preventa" }
];
export const total = products.length;
