import { getProduct } from "../data.js";
import { selectionIds, qtyOf, selectionCount } from "../store.js";

/** Resumen de Mi selección. Solo aritmética sobre datos reales del catálogo. */
export function summarize() {
  const lines = selectionIds()
    .map((id) => ({ p: getProduct(id), qty: qtyOf(id) }))
    .filter((l) => l.p);
  const sale = lines.filter((l) => !l.p.isPre);
  const pre = lines.filter((l) => l.p.isPre);
  const sum = (arr, f) => arr.reduce((a, l) => a + f(l) * l.qty, 0);
  const saleTotal = sum(sale, (l) => l.p.precio);
  const preTotal = sum(pre, (l) => l.p.precio);
  const reserveKnown = pre.every((l) => l.p.precio_reserva != null);
  const reserveTotal = sum(pre, (l) => l.p.precio_reserva || 0);
  return {
    lines,
    sale,
    pre,
    count: selectionCount(),
    saleTotal,
    preTotal,
    reserveTotal,
    reserveKnown,
    balance: preTotal - reserveTotal,
    total: saleTotal + preTotal
  };
}
