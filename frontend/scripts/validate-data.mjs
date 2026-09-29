/**
 * Valida catalog.json (sin modificarlo). Falla el build ante errores reales.
 *   npm run validate:data
 */
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const file = join(root, "src/data/catalog.json");
const raw = readFileSync(file);
const data = JSON.parse(raw.toString("utf8"));
const errors = [];
const warns = [];

const slugify = (s) => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

if (!Array.isArray(data)) errors.push("catalog.json debe ser un arreglo");
const ids = new Set();
const slugs = new Set();
const brands = new Map();
let pre = 0;

(Array.isArray(data) ? data : []).forEach((p, i) => {
  const tag = `#${i} (id ${p?.id})`;
  if (!Number.isInteger(p.id)) errors.push(`${tag}: id inválido`);
  if (ids.has(p.id)) errors.push(`${tag}: id duplicado`);
  ids.add(p.id);
  const slug = `${slugify(p.titulo)}-${p.id}`;
  if (slugs.has(slug)) errors.push(`${tag}: slug duplicado ${slug}`);
  slugs.add(slug);
  if (!p.titulo || !p.marca || !p.sku) errors.push(`${tag}: falta titulo/marca/sku`);
  if (typeof p.precio !== "number" || !(p.precio > 0)) errors.push(`${tag}: precio inválido`);
  if (!["venta", "preventa"].includes(p.tipo)) errors.push(`${tag}: tipo inválido "${p.tipo}"`);
  if (!["Sellado", "Open"].includes(p.estado)) warns.push(`${tag}: estado inesperado "${p.estado}"`);
  if (p.tipo === "preventa") {
    pre++;
    if (typeof p.precio_reserva !== "number") warns.push(`${tag}: preventa sin precio_reserva (no se mostrará reserva)`);
    else if (p.precio_reserva >= p.precio) errors.push(`${tag}: la reserva no es menor al precio`);
  }
  const imgs = p.imagenes_producto;
  if (!Array.isArray(imgs) || !imgs.length || !imgs.every((x) => /^https?:\/\//.test(x?.url || ""))) errors.push(`${tag}: imágenes inválidas`);
  brands.set(p.marca, (brands.get(p.marca) || 0) + 1);
});

const sha = createHash("sha256").update(raw).digest("hex");
const lock = join(root, "scripts/catalog.sha256");
if (existsSync(lock)) {
  const expected = readFileSync(lock, "utf8").trim();
  if (expected !== sha) warns.push("catalog.json cambió respecto al de V3 (checksum distinto). Si es intencional, actualiza scripts/catalog.sha256.");
}

console.log(`✔ ${data.length} productos · ${brands.size} marcas (${[...brands].map(([b, n]) => `${b}: ${n}`).join(", ")}) · ${pre} preventas`);
console.log(`  sha256 ${sha}`);
warns.forEach((w) => console.warn("⚠", w));
if (errors.length) {
  errors.forEach((e) => console.error("✖", e));
  process.exit(1);
}
