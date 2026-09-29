# UX — qué cambió y por qué

Este documento explica las decisiones, no repite el código. Para el detalle de animación
ver `README-MOTION.md`; para el origen de cada dato, `DATA-DICTIONARY.md`.

## 1. Identidad Grooty, aplicada de verdad

La paleta original (`--grooty-ink`, `--grooty-olive`, `--grooty-green`, `--grooty-paper`,
etc.) vuelve como tokens **con un rol**, no solo declarados en `:root`: superficie de
página, superficie de tile en venta/preventa, texto primario/secundario, acento, borde. Se
usan en hero, CTAs, badges, chips, marquee de marcas, preventas, drawer y footer — la
lista de la auditoría original. Un solo ajuste deliberado sobre el valor original: el gris
de texto secundario se oscureció ligeramente (`#65695f` → `#565a51`) porque el original no
llegaba a 4.5:1 de contraste sobre el tile sage; en todo lo demás la paleta es la
declarada.

## 2. Logo real, sin inventar uno

El ZIP de origen no incluye ningún archivo de logo. En vez de crear una "G" genérica, la
tienda **detecta** si existe `frontend/public/logo.svg`: si no está, usa un wordmark
tipográfico limpio ("GROOTY / STORE") en navbar y footer; en el momento en que agregues el
archivo real, aparece automáticamente sin tocar código (`components/header.js`,
`loadLogo()`). Esto se documenta también en el `README.md` principal.

## 3. Un solo eje de layout

Antes: la sensación de "demasiado ancho" venía de que cada sección definía su propio
margen. Ahora todo (navbar, hero, headings, toolbar, grid, footer) usa el mismo
`.container` con el mismo sistema de gutters por breakpoint (`styles/tokens.css`).

## 4. Product Stage: la solución al problema de imágenes descuadradas

Sin tocar ningún archivo original, `lib/images.js` lee los 32 píxeles del borde de cada
imagen ya cargada (con Canvas) y clasifica el fondo en tres casos, aplicando la regla
correcta a cada uno:

- **Transparente** → la imagen se apoya directamente sobre el tile de color Grooty (sage o
  el tono de preventa). Es el caso más común y el más "vitrina".
- **Casi blanco uniforme** → `mix-blend-mode: multiply` para que el blanco se funda con el
  tile, sin la caja blanca típica de fondo de estudio.
- **Oscuro/de color uniforme, o foto compleja** → en vez de forzar el tile Grooty (que
  se vería como una caja negra encima de sage, el problema que señalaba el brief), la
  imagen recibe su propio recuadro redondeado con sombra — se trata como una foto de
  producto legítima en vez de pelear contra su fondo.

Si la detección falla (imagen sin CORS, error de red), el resultado es simplemente
`object-fit: contain` centrado — nunca una imagen deformada o recortada, y nunca rompe la
tarjeta.

## 5. Catálogo: estado en la URL, sin perder nada al volver

Filtros, orden y búsqueda viven en la URL (`/catalogo?marca=mafex&modo=preventa&...`), así
que un enlace de catálogo filtrado es compartible. Al abrir una ficha y volver:

- se restauran los filtros (por la URL),
- se restaura cuántas cards estaban cargadas ("Ver más" no se pierde),
- se restaura la posición exacta del scroll (`router.js`, `history.scrollRestoration =
  "manual"` + estado propio por entrada de historial).

Esto estaba explícitamente pedido como "muy importante para UX" y es fácil de romper sin
querer, así que quedó cubierto por pruebas automatizadas (ver `REPORTE-VALIDACION.md`).

## 6. Facetas con conteos reales

Cada opción de filtro (marca, estado, precio) muestra cuántos resultados tendría *antes*
de aplicarla, calculado sobre los datos reales (`filters.js`, `facets()`), y se deshabilita
si daría cero resultados. No hay conteos inventados.

## 7. Búsqueda que realmente encuentra

`search.js` combina Fuse.js con una lista corta de alias reales del catálogo (inglés↔
español, "spider man"↔"spiderman", "shf"↔"sh figuarts") y una forma "compacta" sin
espacios ni guiones. Si no hay resultados exactos, se ofrece "¿Quisiste decir…?" con el
mejor candidato aproximado, en vez de un vacío sin salida.

## 8. Nunca un callejón sin salida

Todas las vistas terminan con una acción siguiente real (`components/blocks.js`,
`keepExploring`): más marcas, preventas, "Sorpréndeme" (una figura al azar respetando
filtros), o volver arriba. La ficha de producto añade además "Más de esta marca",
"También puede interesarte" (por coincidencia de palabras del título, no aleatorio) y
"Vuelve a verlas". Nada de esto usa datos inventados: si no hay suficientes relacionados
reales, la sección simplemente no aparece.

## 9. WhatsApp: mensaje estructurado, nunca un enlace roto

`lib/whatsapp.js` arma un mensaje agrupado (venta / preventa, con reserva y saldo
calculado) y lo abre en `wa.me` solo si `config.whatsappNumber` tiene un valor. Sin
número, el botón se convierte en "Copiar mensaje" — nunca se abre un enlace inválido ni se
inventa un número. Si el mensaje de una selección grande supera el límite razonable de una
URL, se reintenta sin los enlaces por línea y, si aun así es muy largo, se copia al
portapapeles en vez de truncarse en silencio.

## 10. Preventas: una sola fuente de verdad

El texto exacto de la política vive una vez en `config.js` (`PREORDER_STEPS` /
`PREORDER_POLICY`) y se reutiliza literalmente en la ficha, el drawer, `/preventas` y
`/ayuda` — así es imposible que dos páginas digan cosas distintas sobre el mismo plazo de
7 días.

## 11. Nada inventado

Sin stock, descuentos, temporizadores, "solo queda 1", reseñas ni popularidad. El único
tope numérico de la interfaz es un máximo técnico de 9 unidades por línea en el selector
de cantidad, y no se presenta como información de stock.

## Fuera de alcance en esta entrega

- Fotos reales de producto: en este entorno de trabajo no hay acceso de red al proveedor
  de imágenes (ImageKit) para verificar visualmente cómo se ve cada una de las 88 fotos
  reales; la lógica de Product Stage se validó con un juego de imágenes de prueba que
  cubre los 5 casos de fondo (transparente, casi blanco, oscuro uniforme, de color
  uniforme, foto compleja). Ver `REPORTE-VALIDACION.md`.
- Logo real: no venía en el ZIP de origen (punto 2).
- Supabase, backend y pagos: fuera de alcance, tal como se pidió.
