import { products, PRICE_BUCKETS, brands } from "./data.js";
import { searchIds } from "./search.js";
import { norm } from "./lib/format.js";

export const SORTS = [
  { key: "novedades", label: "Novedades" },
  { key: "precio-asc", label: "Precio: menor a mayor" },
  { key: "precio-desc", label: "Precio: mayor a menor" },
  { key: "az", label: "Nombre A–Z" }
];
const SORT_KEYS = new Set([...SORTS.map((s) => s.key), "relevancia"]);
const list = (v) => (v ? v.split(",").map((x) => x.trim()).filter(Boolean) : []);

/** URL → estado de filtros */
export function parseFilters(search) {
  const p = new URLSearchParams(search);
  const brandSlugs = new Set(brands.map((b) => b.slug));
  const orden = p.get("orden") || "";
  return {
    q: (p.get("q") || "").slice(0, 80),
    marcas: list(p.get("marca")).filter((s) => brandSlugs.has(s)),
    modo: ["venta", "preventa"].includes(p.get("modo")) ? p.get("modo") : "",
    estados: list(p.get("estado")).filter((s) => ["sellado", "open"].includes(s)),
    precio: PRICE_BUCKETS.some((b) => b.key === p.get("precio")) ? p.get("precio") : "",
    orden: SORT_KEYS.has(orden) ? orden : ""
  };
}

/** Estado → query string (omite lo fijo por la ruta y los valores por defecto) */
export function toQuery(f, fixed = {}) {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (!fixed.marca && f.marcas.length) p.set("marca", f.marcas.join(","));
  if (!fixed.modo && f.modo) p.set("modo", f.modo);
  if (f.estados.length) p.set("estado", f.estados.join(","));
  if (f.precio) p.set("precio", f.precio);
  if (f.orden && f.orden !== "novedades" && !(f.orden === "relevancia" && f.q)) p.set("orden", f.orden);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export const emptyFilters = () => ({ q: "", marcas: [], modo: "", estados: [], precio: "", orden: "" });

export function activeCount(f, fixed = {}) {
  return (fixed.marca ? 0 : f.marcas.length) + f.estados.length + (f.precio ? 1 : 0);
}

/** Aplica filtros. `omit` ignora una faceta (para calcular conteos reales de sus opciones). */
export function applyFilters(f, fixed = {}, omit = "") {
  let out = products;
  const marcas = fixed.marca ? [fixed.marca] : f.marcas;
  if (omit !== "marca" && marcas.length) out = out.filter((p) => marcas.includes(p.brandSlug));
  const modo = fixed.modo || f.modo;
  if (omit !== "modo" && modo) out = out.filter((p) => (modo === "preventa") === p.isPre);
  if (omit !== "estado" && f.estados.length) out = out.filter((p) => f.estados.includes(norm(p.estado)));
  if (omit !== "precio" && f.precio) {
    const b = PRICE_BUCKETS.find((x) => x.key === f.precio);
    if (b) out = out.filter((p) => b.test(p.precio));
  }
  let rank = null;
  if (f.q) {
    rank = new Map(searchIds(f.q).map((r, i) => [r.id, i]));
    out = out.filter((p) => rank.has(p.id));
  }
  const sort = f.orden || (f.q ? "relevancia" : "novedades");
  out = [...out];
  if (sort === "relevancia" && rank) out.sort((a, b) => rank.get(a.id) - rank.get(b.id));
  else if (sort === "precio-asc") out.sort((a, b) => a.precio - b.precio || a.index - b.index);
  else if (sort === "precio-desc") out.sort((a, b) => b.precio - a.precio || a.index - b.index);
  else if (sort === "az") out.sort((a, b) => a.name.localeCompare(b.name, "es") || a.index - b.index);
  else out.sort((a, b) => a.index - b.index);
  return out;
}

/** Conteos reales por opción */
export function facets(f, fixed = {}) {
  const byBrand = {};
  applyFilters(f, fixed, "marca").forEach((p) => (byBrand[p.brandSlug] = (byBrand[p.brandSlug] || 0) + 1));
  const modoList = applyFilters(f, fixed, "modo");
  const estList = applyFilters(f, fixed, "estado");
  const priceList = applyFilters(f, fixed, "precio");
  return {
    brand: byBrand,
    modo: { all: modoList.length, venta: modoList.filter((p) => !p.isPre).length, preventa: modoList.filter((p) => p.isPre).length },
    estado: { sellado: estList.filter((p) => norm(p.estado) === "sellado").length, open: estList.filter((p) => norm(p.estado) === "open").length },
    precio: Object.fromEntries(PRICE_BUCKETS.map((b) => [b.key, priceList.filter((p) => b.test(p.precio)).length]))
  };
}
