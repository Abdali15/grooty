# Auditoría — anterior / V3 / V4

## Aviso sobre la tienda anterior

`https://tienda-grooty.vercel.app/` es una SPA que renderiza todo por JavaScript: el HTML
que devuelve el servidor está prácticamente vacío (confirmado con una petición directa),
y este entorno de trabajo no tiene acceso de navegador a internet abierto para ejecutar su
JavaScript y capturarla visualmente. Por honestidad, la columna "Anterior" de esta tabla
se basa **únicamente** en la paleta y la lista de funcionalidades que se describieron
explícitamente en el brief original (no en una inspección visual propia), y se marca
`NO VERIFICADO` donde corresponde. Si se necesita una comparación visual real, el paso
siguiente es correr Playwright con acceso a internet contra esa URL — está descrito como
paso obligatorio en `GROOTY-V4-MASTER-PROMPT-v2.md`, sección "Fase 0".

## Identidad cromática

| | Anterior (según brief, NO VERIFICADO) | V3 (inspeccionado) | V4 (esta entrega) |
|---|---|---|---|
| Paleta | Ink/Olive/Green/Paper declarados | No se pudo inspeccionar el CSS de V3 más allá de que compilaba con Vite; el brief afirma que "perdió gran parte de la identidad cromática" | Paleta original recuperada como **tokens con rol** (`--tile-sale`, `--tile-pre`, `--accent`, etc.), no solo en `:root`; visible en hero, CTA, badges, chips, marquee, preventas, drawer y footer (confirmado con capturas, ver `REPORTE-VALIDACION.md`) |
| Contraste | NO VERIFICADO | NO VERIFICADO | Verificado con axe-core sobre 9 estados de página; un valor de la paleta (`--text-2`) se ajustó de `#65695f` a `#565a51` para cumplir 4.5:1 sobre el tile sage (documentado en `README-UX.md`) |

## Logo

| | Anterior | V3 | V4 |
|---|---|---|---|
| Logo real | NO VERIFICADO | El ZIP entregado no contiene ningún archivo de logo | No se inventó uno: la tienda usa un wordmark tipográfico y adopta `public/logo.svg` automáticamente en cuanto se agregue (ver `README.md`) |

## Funcionalidad (lista del brief)

Todo lo listado como "no debe romperse" en el brief —Vite, SPA con History API, 88
productos, 6 marcas, las 7 rutas, búsqueda con `Ctrl/Cmd+K`, filtros, orden, favoritos, Mi
selección con `localStorage`, drawer, quick view, galería, similares, bottom nav móvil,
WhatsApp, Instagram— se confirmó funcionando en V4 mediante pruebas automatizadas con
Playwright (detalle en `REPORTE-VALIDACION.md`), no solo revisando el código.

## Tratamiento de imagen de producto

| | V3 | V4 |
|---|---|---|
| Problema reportado | Imágenes con fondos y proporciones distintas, riesgo de verse descuadradas | Se resuelve con "Product Stage": detección automática del tipo de fondo (transparente / casi blanco / oscuro-color uniforme / foto compleja) y una regla distinta para cada caso, sin tocar ningún archivo original. Probado con un set de 5 imágenes sintéticas que cubren los 5 casos (capturas en `REPORTE-VALIDACION.md`), porque las imágenes reales están en un CDN externo no accesible desde este entorno de pruebas |

## Márgenes y layout

| | V3 | V4 |
|---|---|---|
| Problema reportado | "Se siente demasiado extendida horizontalmente" | Un solo sistema de contenedor (`.container`) y gutters por breakpoint, reutilizado en navbar, hero, toolbar, grid y footer. Confirmado sin overflow horizontal en 1440/1280/1024/768/430/390 px (ver `REPORTE-VALIDACION.md`) |

## Catálogo y filtros

| | V3 | V4 |
|---|---|---|
| Estado de filtros | No se pudo confirmar si V3 reflejaba filtros en la URL (no se encontró ese patrón al inspeccionar el código entregado) | Filtros, orden y búsqueda viven en la URL; al volver desde una ficha se restauran filtros, cantidad de productos cargados y la posición exacta del scroll (confirmado con Playwright) |
| Transición al filtrar | NO VERIFICADO en V3 | GSAP Flip (fade + reflow), desactivable con `?motion=off` |

## Conclusión de la auditoría

La diferencia pedida ("que se note a primera vista, no solo sombras nuevas + GSAP") se
concentra en tres cosas verificables en este entorno: (1) la paleta aplicada como sistema
de roles en toda la interfaz, no solo declarada; (2) el catálogo con estado en la URL y
restauración de scroll/filtros, que es un cambio de comportamiento, no solo visual; (3) el
sistema de Product Stage, que resuelve el problema de imágenes descuadradas sin tocar los
archivos originales. Lo que **no** se pudo verificar en este entorno (fotos reales del
catálogo, comparación visual pixel a pixel contra la tienda anterior) queda listado como
pendiente en `REPORTE-VALIDACION.md`.
