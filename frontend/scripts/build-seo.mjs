/**
 * Post-build: genera "shells" HTML por ruta con <title>, descripción y Open Graph correctos
 * (los previews de WhatsApp/Instagram no ejecutan JavaScript), JSON-LD de producto,
 * sitemap.xml y robots.txt. La app SPA se sigue cargando igual encima.
 *
 * URL pública: SITE_URL (ej. https://grooty.pe) o VERCEL_PROJECT_PRODUCTION_URL.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
if (!existsSync(join(dist, "index.html"))) {
  console.error("dist/index.html no existe: ejecuta vite build primero.");
  process.exit(1);
}
const base = readFileSync(join(dist, "index.html"), "utf8");
const data = JSON.parse(readFileSync(join(root, "src/data/catalog.json"), "utf8"));
const site = (process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "")).replace(/\/$/, "");

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const slugify = (s) => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const money = (n) => new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(n);
const ogImg = (u) => (/^https:\/\/ik\.imagekit\.io\//.test(u) ? `${u}${u.includes("?") ? "&" : "?"}tr=w-1000,q-80,f-jpg` : u);

const routes = []; // { path, title, description, image?, ld? }
routes.push({ path: "/catalogo", title: "Catálogo · Grooty Store", description: `Catálogo de figuras de colección de Grooty Store: ${data.length} piezas.` });
routes.push({ path: "/preventas", title: "Preventas · Grooty Store", description: "Figuras en preventa: reserva con el monto indicado. Condiciones claras." });
routes.push({ path: "/marcas", title: "Marcas · Grooty Store", description: "Explora las marcas del catálogo de Grooty Store." });
routes.push({ path: "/ayuda", title: "Ayuda · Grooty Store", description: "Cómo comprar, cómo reservar una preventa y cómo se coordinan pagos y entrega." });

const byBrand = new Map();
data.forEach((p) => byBrand.set(slugify(p.marca), [...(byBrand.get(slugify(p.marca)) || []), p]));
byBrand.forEach((items, slug) =>
  routes.push({ path: `/marcas/${slug}`, title: `${items[0].marca} · Grooty Store`, description: `${items.length} figuras de ${items[0].marca} en Grooty Store. Fotos, estado y precio.`, image: items[0].imagenes_producto?.[0]?.url })
);

data.forEach((p) => {
  const [name] = p.titulo.split(" - ");
  const pre = p.tipo === "preventa";
  const path = `/figura/${slugify(p.titulo)}-${p.id}`;
  const image = p.imagenes_producto?.[0]?.url;
  const offers = { "@type": "Offer", price: p.precio, priceCurrency: "PEN" };
  if (pre) offers.availability = "https://schema.org/PreOrder"; // sin dato de stock, no se declara disponibilidad en ventas
  if (site) offers.url = site + path;
  routes.push({
    path,
    title: `${name.trim()} · ${p.marca} · Grooty Store`,
    description: `${p.titulo} (${p.marca}). ${pre ? "Preventa" : "En venta"} desde ${money(p.precio)}. Grooty Store Perú.`,
    image,
    ld: { "@context": "https://schema.org", "@type": "Product", name: p.titulo, sku: p.sku, brand: { "@type": "Brand", name: p.marca }, image: (p.imagenes_producto || []).map((i) => ogImg(i.url)), offers }
  });
});

function shell(r) {
  let html = base
    .replace(/<title>.*?<\/title>/, `<title>${esc(r.title)}</title>`)
    .replace(/<meta name="description" content=".*?" \/>/, `<meta name="description" content="${esc(r.description)}" />`)
    .replace(/<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="${esc(r.title)}" />`)
    .replace(/<meta property="og:description" content=".*?" \/>/, `<meta property="og:description" content="${esc(r.description)}" />`);
  const extra = [];
  if (r.image) extra.push(`<meta property="og:image" content="${esc(ogImg(r.image))}" />`);
  if (site) extra.push(`<meta property="og:url" content="${esc(site + r.path)}" />`, `<link rel="canonical" href="${esc(site + r.path)}" />`);
  if (r.ld) extra.push(`<script type="application/ld+json">${JSON.stringify(r.ld).replace(/</g, "\\u003c")}</script>`);
  return html.replace("</head>", `  ${extra.join("\n  ")}\n</head>`);
}

routes.forEach((r) => {
  const dir = join(dist, r.path);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), shell(r));
});

const urls = ["/", ...routes.map((r) => r.path)];
if (site) {
  writeFileSync(join(dist, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${site}${u}</loc></url>`).join("\n")}\n</urlset>\n`);
}
writeFileSync(join(dist, "robots.txt"), `User-agent: *\nAllow: /\n${site ? `Sitemap: ${site}/sitemap.xml\n` : ""}`);
console.log(`✔ SEO: ${routes.length} shells HTML${site ? ` + sitemap (${site})` : " (sin SITE_URL: sin sitemap ni canonical)"}`);
