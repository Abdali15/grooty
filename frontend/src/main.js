import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/views.css";
import "./styles/motion.css";

import { initImages } from "./lib/images.js";
import { renderShell, initHeader, updateActive } from "./components/header.js";
import { initOverlays } from "./components/overlay.js";
import { initActions } from "./actions.js";
import { defineRoutes, startRouter } from "./router.js";
import { motion } from "./motion/index.js";

import { home } from "./views/home.js";
import { catalogPage, brandPage, preordersPage } from "./views/catalog.js";
import { brandsPage } from "./views/brands.js";
import { product } from "./views/product.js";
import { help } from "./views/help.js";
import { notfound } from "./views/notfound.js";

defineRoutes([
  { name: "home", match: (p) => (p === "/" ? {} : null), view: home },
  { name: "catalog", match: (p) => (p === "/catalogo" ? {} : null), view: catalogPage },
  { name: "preorders", match: (p) => (p === "/preventas" ? {} : null), view: preordersPage },
  { name: "brands", match: (p) => (p === "/marcas" ? {} : null), view: brandsPage },
  { name: "brand", match: (p) => (p.match(/^\/marcas\/([^/]+)$/) ? { slug: p.split("/")[2] } : null), view: brandPage },
  { name: "product", match: (p) => (p.startsWith("/figura/") ? {} : null), view: product },
  { name: "help", match: (p) => (p === "/ayuda" ? {} : null), view: help },
  { name: "notfound", match: () => null, view: notfound }
]);

initImages();
document.getElementById("shell").innerHTML = renderShell();
initHeader();
initOverlays();
initActions();
motion.init();
startRouter();
