# Reporte de validación

Cada punto indica **cómo** se verificó. Lo no verificado se marca explícitamente como tal,
con el motivo — no se reporta ningún número (Lighthouse, contraste, etc.) sin haberlo
calculado de verdad.

## Entorno de prueba

Esta entrega se validó en un contenedor sin acceso de navegador a internet abierto: el
CDN de imágenes del catálogo (`ik.imagekit.io`) y la tienda anterior en Vercel no son
alcanzables desde aquí (confirmado: `curl` a `ik.imagekit.io` devuelve `403
host_not_allowed` del proxy de red del entorno). Por eso, todo lo que depende de esas
fotos reales se probó con un **set de datos de prueba aparte** (mismo `catalog.json`, con
las 88 URLs de imagen sustituidas por 5 imágenes sintéticas que cubren los 5 casos de
fondo) en una copia separada del proyecto, nunca en los archivos que se entregan. El
`catalog.json` real y todo el código se probaron sin modificar para lo demás (rutas,
filtros, búsqueda, WhatsApp, accesibilidad de la estructura, etc.).

## Build y datos

- `npm run build` (incluye `validate:data`) — **verificado**, termina sin errores.
  Salida real: 88 productos · 6 marcas (Mafex: 35, Marvel Legends: 27, Sh Figuarts: 20,
  Revoltech: 4, INART: 1, Yolopark: 1) · 18 preventas.
- Checksum SHA-256 de `catalog.json` antes/después: **idéntico**
  (`25901ceb5cb35fe1665b7c04b4e83d3d372e9b705e7e85c040f5562f03d0fc12`) — los 88 productos
  no se tocaron.
- `scripts/build-seo.mjs` genera 98 HTML (7 páginas fijas + 6 marcas + 88 duplicados por
  cada... nota: en esta corrida generó **98** porque cuenta catálogo/preventas/marcas/ayuda
  (4) + 6 páginas de marca + 88 fichas de producto = 98 — **verificado** por la salida del
  script, no estimado.
- Sin `SITE_URL` configurado no se genera `sitemap.xml` (comportamiento esperado,
  documentado en el propio script); se genera igual `robots.txt`.

## Funcional (Playwright, sobre el proyecto real servido con `vite preview`)

Verificado con navegador real headless, no solo lectura de código:

- Las 7 rutas (`/`, `/catalogo`, `/preventas`, `/marcas`, `/marcas/mafex`,
  `/marcas/marvel-legends`, `/ayuda`) cargan en 1440×900 y 390×844 sin overflow horizontal
  y sin errores de JavaScript en consola.
- Búsqueda `Ctrl/Cmd+K`: "gambit" y "spider man" devuelven resultados; "batmn" encuentra
  directamente la figura de Batman por búsqueda difusa (no cae en el estado vacío, que
  también se probó por separado con un término sin coincidencia).
- Añadir a Mi selección: aparece el toast y el contador del header se actualiza (`1`).
- Favoritos: `aria-pressed` cambia a `true` al hacer clic.
- Filtros: clic en una marca actualiza la URL (`?marca=mafex`), el contador de resultados
  ("35 figuras de 88") y reordena el grid con Flip.
- Vista rápida: se abre, `ESC` la cierra.
- Drawer de Mi selección: clic en "Consultar por WhatsApp" **sin número configurado**
  copia el mensaje y muestra el aviso correcto en vez de abrir un enlace roto — se
  confirmó el texto exacto del toast.
- Navegar a una ficha y volver: se probó explícitamente que la posición de scroll y el
  filtro de la URL se restauran cuando el elemento en el que se hace clic está dentro del
  viewport (comportamiento real de un usuario). *Nota de método:* una primera corrida del
  test hacía clic en una card fuera de pantalla; Playwright la desplazaba automáticamente
  antes del clic, lo que alteraba el scroll a comparar por sí solo. Corregido el test, la
  restauración es correcta.
- "Ver más": pasa de 24 a 48 productos visibles sin error.
- Hero: el botón de pausa cambia `data-playing` de `true` a `false`; la flecha "siguiente"
  avanza de la slide 01 a la 02.
- `?motion=off` y `prefers-reduced-motion: reduce`: ambos activan `html.no-motion`.
- Filtros en móvil (390×844): se abren como hoja inferior, aplicar un filtro actualiza la
  URL (`?estado=sellado`).
- Ruta inexistente: muestra la página 404 con buscador y navegación, no una pantalla en
  blanco.
- WhatsApp desde una ficha de producto: mismo comportamiento correcto sin número
  configurado.

### Un hallazgo real, corregido

Nada de lo anterior encontró errores de comportamiento. Sí se encontró y corrigió un
problema real de **contraste de color** (ver sección siguiente) y se evaluó una
vulnerabilidad de una dependencia (ver "Dependencias y seguridad"); tres "fallos"
adicionales que aparecieron durante las pruebas automatizadas resultaron ser del propio
script de prueba, no de la tienda (se documentan por transparencia, con cómo se
confirmó cada uno): (1) intentar hacer clic en el botón "Vista rápida" sin antes pasar el
cursor por la tarjeta — ese botón aparece al hacer hover, por diseño, igual que en la
mayoría de tiendas con este patrón; confirmado pasando el cursor por la tarjeta primero.
(2) el caso de scroll ya explicado arriba, causado porque Playwright desplaza la página
para poner en pantalla un elemento antes de hacer clic en él. (3) en la galería de la
ficha de producto, un script de prueba avanzaba a la segunda foto y luego intentaba hacer
clic usando un selector que apuntaba siempre al primer elemento en el HTML en vez de al
que estaba realmente activo — corregido el selector, la galería y el lightbox abren
correctamente en ambos casos (foto 1 sin navegar, y foto 2 tras avanzar el carrusel,
confirmado con el contador "2 / 2" del propio lightbox).

## Accesibilidad (axe-core, WCAG2A + WCAG2AA)

Escaneado sobre home, catálogo, marcas, preventas, ayuda, una ficha de producto, la
paleta de búsqueda abierta, la vista rápida abierta y el drawer de selección abierto.

- **Antes de la corrección:** 2 violaciones "serious" de `color-contrast` (el número
  dentro del segmento "Venta/Preventas" sobre fondo sage, y el subtítulo de la card
  —`.card-line`— sobre fondo sage en una sección con banda de color). Corregido oscureciendo
  el token `--text-2` de `#65695f` a `#565a51` (contraste recalculado: 5.33:1 sobre sage,
  6.55:1 sobre paper — ambos por encima del mínimo 4.5:1) y quitando una opacidad que
  diluía el color del contador del segmento.
- **Después de la corrección:** 0 violaciones "serious"/"critical" en las 9 superficies
  listadas arriba, salvo una excepción deliberada: la palabra gigante decorativa de fondo
  en las tarjetas de marca (`.bc-word`, `aria-hidden="true"`, opacidad ~8% a propósito,
  tal como pide el brief original) — axe la marca porque evalúa contraste incluso en
  elementos ocultos para lectores de pantalla, pero es un elemento puramente decorativo
  que duplica un texto ya accesible en la misma tarjeta (`.bc-name`). Se documenta como
  excepción revisada, no como pendiente.
- No se ejecutó un lector de pantalla real (NVDA/VoiceOver) — la cobertura de teclado,
  `aria-live`, `focus trap` y `aria-*` se verificó por código y por las pruebas
  funcionales de arriba (foco visible, `Escape`, roles de combobox/listbox en la
  búsqueda), pero una pasada manual con lector de pantalla real queda **pendiente**.

## Product Stage (imágenes)

**No verificado con las 88 fotos reales** (motivo: sin acceso de red a `ik.imagekit.io`
desde este entorno). Sí verificado con un set de 5 imágenes sintéticas que reproducen los
5 casos de fondo que preocupaban al brief original — capturas confirmadas visualmente:

- Fondo transparente → se apoya sobre el tile sage/oliva, sin caja.
- Fondo casi blanco uniforme → se funde por `multiply`, sin caja blanca.
- Fondo oscuro uniforme → recuadro redondeado con sombra abrazando la foto.
- Fondo de color uniforme (verde estudio) → mismo tratamiento, recuadro propio.
- Fondo de foto compleja (degradado) → mismo tratamiento, recuadro propio.

**Pendiente antes de publicar:** revisar visualmente el catálogo completo con las 88
fotos reales (`npm run dev` con red normal) y ajustar `visual-overrides.js` para
cualquier excepción puntual, como ya preveía el diseño.

## Performance

Medido (real, de la salida de `vite build`, sin imágenes por lo ya explicado):

| Métrica | Objetivo | Medido |
|---|---|---|
| JS inicial (gzip) — `index` + `gsap` (los dos que cargan sin esperar interacción) | ≤ 130 KB | ≈ 85 KB (36.4 + 48.6) |
| CSS total (gzip) | ≤ 35 KB | 13.6 KB |
| Chunks lazy (no cuentan en la carga inicial) | — | Flip 9.6 KB, Fuse 9.7 KB, galería+Swiper 27.3 KB gzip |

**No verificado:** LCP, CLS, INP y Lighthouse. Requieren red real (para las imágenes) y,
en este entorno, no hay navegador con acceso a internet abierto para ejecutar Lighthouse
de forma representativa. Comando para correrlo antes de publicar:
`npx lighthouse http://localhost:4173/ --preset=desktop` (y su equivalente `--preset=mobile`)
sobre `npm run preview`, con las imágenes reales.

## Dependencias y seguridad

`npm audit` sobre el `package.json` entregado: **1 vulnerabilidad crítica pendiente**
(swiper, `GHSA-hmx5-qpq5-p643`, prototype pollution). Se evaluó y se decidió no
actualizar a la versión parcheada en esta entrega — el detalle completo, incluyendo por
qué no es explotable en el uso actual de la librería y qué se intentó, está en
`README-MOTION.md`. Se corrigieron sin dudarlo las otras dos vulnerabilidades reportadas
(vite, ambas solo del servidor de desarrollo) actualizando de `6.4.1` a `6.4.3`, sin
cambios de comportamiento.

## No verificado / pendiente (lista completa, sin adornar)

1. Las 88 fotos reales en Product Stage (motivo: red).
2. Lighthouse / LCP / CLS / INP (motivo: red + entorno sin navegador con Lighthouse).
3. Comparación visual real contra `tienda-grooty.vercel.app` (motivo: SPA renderizada por
   JS, no accesible con las herramientas de este entorno — ver `AUDITORIA.md`).
4. Lector de pantalla real (NVDA/VoiceOver).
5. Previews de WhatsApp/Instagram con Open Graph real (los HTML se generan, pero no se
   probó pegando un enlace en un chat real).
6. Prueba de WhatsApp con un número real configurado (se probó el flujo completo con el
   número vacío, que es el estado en que se entrega).
7. Refresh directo de rutas contra un despliegue real de Vercel (el `vercel.json` incluye
   el rewrite necesario, pero no se probó contra Vercel en sí).
8. Que Vercel sirva el HTML de SEO correcto por ruta (`dist/figura/:slug/index.html`,
   generado por `build-seo.mjs`) en vez de caer siempre al `index.html` genérico por el
   rewrite catch-all de `vercel.json`. Vercel prioriza documentalmente los archivos
   estáticos existentes sobre los rewrites, que es de lo que depende este mecanismo, pero
   no se pudo confirmar contra un despliegue real. **Aunque este punto fallara, la tienda
   sigue funcionando igual para las personas** — el único efecto sería que un enlace
   compartido en WhatsApp/Instagram mostraría la vista previa genérica del sitio en vez de
   la de esa figura o marca específica. Verificar con un despliegue de prueba antes de
   confiar en las vistas previas.
