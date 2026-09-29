import { SITE } from "../config.js";

const nf = new Intl.NumberFormat("es-PE", { style: "currency", currency: SITE.currency });
export const money = (n) => nf.format(Number(n || 0));

/** minúsculas + sin tildes */
export const norm = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export const slugify = (s) =>
  norm(s)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/** sin espacios ni signos: "Spider-Man" y "spider man" → "spiderman" */
export const compact = (s) => norm(s).replace(/[^a-z0-9]+/g, "");

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
