# Diccionario de datos

`frontend/src/data/catalog.json` **no se modifica**. Este documento describe los campos
reales tal como llegaron (confirmados con un volcado del archivo) y qué se deriva de ellos
en `frontend/src/data.js`, sin tocar el origen.

## `catalog.json` (88 productos)

Cada producto tiene exactamente estos campos:

| Campo | Tipo | Ejemplo | Notas |
|---|---|---|---|
| `id` | number | `93` | Único. Usado en la URL de la ficha y como clave de favoritos/selección |
| `sku` | string | `"P001-091"` | Código mostrado en la ficha |
| `marca` | string | `"Marvel Legends"` | Una de 6: Mafex (35), Marvel Legends (27), Sh Figuarts (20), Revoltech (4), INART (1), Yolopark (1) |
| `titulo` | string | `"Gambito - Marvel Legends X-men 97"` | Se separa en `name` (antes del " - ") y `line` (después), solo para mostrar; el dato original no cambia |
| `estado` | string | `"Sellado"` \| `"Open"` | 83 Sellado, 5 Open |
| `precio` | number | `170` | Soles (PEN), precio completo de la figura |
| `precio_reserva` | number \| `null` | `20` | Solo en preventas; `null` en venta directa. Si en algún producto de preventa viniera `null`, la ficha no inventa un monto: omite la línea de reserva |
| `tipo` | string | `"venta"` \| `"preventa"` | 70 venta, 18 preventa |
| `imagenes_producto` | array | ver abajo | 84 productos con 1 foto, 4 con 2 fotos |

`imagenes_producto[]`: `{ url: string, posicion: number }`. Las URLs son absolutas, sobre
ImageKit (`https://ik.imagekit.io/...`). Se ordenan por `posicion` al leer; `posicion` no
se reescribe.

## Qué se deriva (sin tocar el JSON) — `data.js`

| Derivado | Regla | Por qué |
|---|---|---|
| `slug` | `slugify(titulo) + "-" + id` | URL legible y estable de la ficha (`/figura/:slug-id`) |
| `brandSlug` | `slugify(marca)` | URL de marca (`/marcas/:slug`) |
| `name` / `line` | split de `titulo` en el primer `" - "` | Solo presentación; si el título no tiene " - ", `line` queda vacío |
| `isPre` / `isOpen` | `tipo === "preventa"` / `estado` normalizado `"open"` | Para clases CSS y badges |
| `images` | `imagenes_producto` ordenadas por `posicion`, solo `url` | Galería |
| `tokens` | palabras del título en minúsculas, sin tildes, sin una lista corta de palabras vacías (`marvel`, `legends`, `version`, etc.) y sin números sueltos | Base para "También puede interesarte" |
| Orden "Recién llegados" | **el orden del array en `catalog.json`**, de arriba hacia abajo | El archivo no trae fecha de alta; se documenta aquí en vez de inventar una. Si en el futuro se agrega un campo de fecha, esta regla debe actualizarse aquí y en `data.js` (`latest()`) |
| "Más de esta marca" | mismo `brandSlug`, excluyendo el actual, en el mismo orden de llegada | — |
| "También puede interesarte" | productos que comparten `tokens` con el actual (mínimo 2 coincidencias tras ponderar), luego mismo `tipo`, luego misma marca como desempate; si no hay suficientes, se completa con los más recientes que no se repitan | Nunca aleatorio ni inventado: si no hay relación real, la sección no se ordena por casualidad, se completa con "recientes" y sigue etiquetada igual |
| Reserva y saldo en Mi selección | `precio_reserva` tal cual viene; saldo = `precio - precio_reserva` | Aritmética simple, sin redondeos especiales |

## Qué NO se muestra porque no existe en los datos

Stock/cantidad disponible, fecha de publicación, descuentos, calificaciones/reseñas,
número de ventas, popularidad. Ninguna de estas aparece en la interfaz aunque sería fácil
de "simular" — se dejó fuera a propósito.

## Validación automática

`frontend/scripts/validate-data.mjs` (se ejecuta dentro de `npm run build`) comprueba:
88 ids y slugs únicos, `precio` numérico y positivo, `tipo` válido, imágenes con URL
absoluta, y que `precio_reserva` sea menor que `precio` en toda preventa. También calcula
el checksum SHA-256 del archivo y lo compara con el de V3 (`scripts/catalog.sha256`) para
detectar cualquier cambio accidental de los datos originales.
