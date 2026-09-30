import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/views.css";
import "./styles/motion.css";
import "./styles/future.css";
import "./styles/admin.css";

import { loadPublicCatalog } from "./lib/catalog-source.js";

// Los módulos del catálogo se evalúan después de cargar los datos públicos.
loadPublicCatalog().then(() => import("./bootstrap.js")).catch(error => {
  console.error("No se pudo iniciar la tienda", error);
  const app = document.getElementById("app");
  app.innerHTML = `<div class="container notfound"><h1 class="h-page">Volvemos en un momento</h1><p>No se pudo cargar la tienda. Recarga la página para volver a intentarlo.</p><button class="btn btn-primary" type="button" id="retry-store">Reintentar</button></div>`;
  document.getElementById("retry-store").addEventListener("click", () => location.reload());
});
