import { catalogSource } from "./lib/catalog-source.js";
const products = catalogSource();
import { SITE } from "./config.js";

const K = {
  fav: "grooty:v4:favorites",
  sel: "grooty:v4:selection",
  rec: "grooty:v4:recent",
  q: "grooty:v4:searches"
};
const V3 = { fav: "grooty-v3-favorites", sel: "grooty-v3-selection" };

const validIds = new Set(products.map((p) => p.id));
const stockById = new Map(products.map((p) => [p.id, p.stock]));
const MAX_QTY = 9; // tope técnico de la interfaz; no es un dato de stock
export function selectionLimit(id) {
  id = Number(id);
  if (!validIds.has(id)) return 0;
  const stock = stockById.get(id);
  return Number.isInteger(stock) ? Math.max(0, Math.min(MAX_QTY, stock)) : MAX_QTY;
}

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}
function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* modo privado / cuota: la tienda sigue funcionando en memoria */
  }
}

/* Migración desde V3: nadie pierde sus favoritos ni su selección */
function migrate() {
  try {
    if (localStorage.getItem(K.fav) == null && localStorage.getItem(V3.fav) != null) write(K.fav, read(V3.fav, []));
    if (localStorage.getItem(K.sel) == null && localStorage.getItem(V3.sel) != null) write(K.sel, read(V3.sel, {}));
  } catch {}
}

const clean = {
  fav: (a) => [...new Set((Array.isArray(a) ? a : []).map(Number).filter((id) => validIds.has(id)))],
  sel: (o) => {
    const out = {};
    Object.entries(o && typeof o === "object" ? o : {}).forEach(([id, q]) => {
      const n = Math.min(selectionLimit(id), Math.floor(Number(q)));
      if (validIds.has(Number(id)) && n > 0) out[id] = n;
    });
    return out;
  },
  rec: (a) => clean.fav(a).slice(0, SITE.recentLimit),
  q: (a) => (Array.isArray(a) ? a.filter((s) => typeof s === "string").slice(0, 5) : [])
};

migrate();
const state = {
  favorites: new Set(clean.fav(read(K.fav, []))),
  selection: clean.sel(read(K.sel, {})),
  recent: clean.rec(read(K.rec, [])),
  searches: clean.q(read(K.q, []))
};

const subs = { favorites: new Set(), selection: new Set(), recent: new Set() };
const emit = (k, detail) => subs[k].forEach((fn) => fn(detail));
export const on = (k, fn) => {
  subs[k].add(fn);
  return () => subs[k].delete(fn);
};

/* Sincroniza entre pestañas */
window.addEventListener("storage", (e) => {
  if (e.key === K.fav) {
    state.favorites = new Set(clean.fav(read(K.fav, [])));
    emit("favorites");
  }
  if (e.key === K.sel) {
    state.selection = clean.sel(read(K.sel, {}));
    emit("selection");
  }
});

/* Favoritos */
export const isFavorite = (id) => state.favorites.has(Number(id));
export const favoriteIds = () => [...state.favorites];
export function toggleFavorite(id) {
  id = Number(id);
  const now = !state.favorites.has(id);
  now ? state.favorites.add(id) : state.favorites.delete(id);
  write(K.fav, [...state.favorites]);
  emit("favorites", { id, now });
  return now;
}

/* Selección */
export const selectionMap = () => state.selection;
export const qtyOf = (id) => state.selection[id] || 0;
export const selectionCount = () => Object.values(state.selection).reduce((a, b) => a + b, 0);
export const selectionIds = () => Object.keys(state.selection).map(Number);
export const maxQty = MAX_QTY;
export function setQty(id, qty) {
  id = Number(id);
  if (!validIds.has(id) || !Number.isFinite(Number(qty))) return;
  qty = Math.min(selectionLimit(id), Math.floor(Number(qty)));
  if (qty <= 0) delete state.selection[id];
  else state.selection[id] = qty;
  write(K.sel, state.selection);
  emit("selection", { id });
}
export const addToSelection = (id, n = 1) => setQty(id, qtyOf(id) + n);
export const removeFromSelection = (id) => setQty(id, 0);
export const snapshotSelection = () => ({ ...state.selection });
export function restoreSelection(snap) {
  state.selection = clean.sel(snap);
  write(K.sel, state.selection);
  emit("selection", {});
}
export function clearSelection() {
  state.selection = {};
  write(K.sel, state.selection);
  emit("selection", {});
}

/* Vistos recientemente */
export const recentIds = () => [...state.recent];
export function pushRecent(id) {
  id = Number(id);
  state.recent = [id, ...state.recent.filter((x) => x !== id)].slice(0, SITE.recentLimit);
  write(K.rec, state.recent);
  emit("recent");
}

/* Búsquedas recientes */
export const recentSearches = () => [...state.searches];
export function pushSearch(q) {
  q = String(q || "").trim().slice(0, 60);
  if (q.length < 2) return;
  state.searches = [q, ...state.searches.filter((s) => s.toLowerCase() !== q.toLowerCase())].slice(0, 5);
  write(K.q, state.searches);
}
export function clearSearches() {
  state.searches = [];
  write(K.q, []);
}
