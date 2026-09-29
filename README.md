# Grooty Store — V4

Rediseño funcional y de experiencia del catálogo de figuras de colección. Sigue siendo
Vite + JavaScript (ES Modules), SPA con History API, sin backend ni pagos: la tienda es
una vitrina y todo se coordina por WhatsApp.

## Qué cambió respecto a V3

Ver `README-UX.md` (decisiones de diseño) y `README-MOTION.md` (animación). El resumen:
identidad Grooty recuperada y aplicada de verdad (no solo en `:root`), sistema de layout
único, "Product Stage" que centra cualquier foto sin deformarla ni recortarla y sin tocar
los archivos originales, catálogo con estado en la URL y con restauración de scroll y
filtros al volver desde una ficha, buscador con `Ctrl/Cmd+K` y búsqueda difusa, capa de
motion con GSAP (desactivable), y helpers de WhatsApp con mensajes estructurados.

## Requisitos

Node 18+ (probado con Node 22) y npm.

## Arrancar

```bash
cd frontend
npm install
npm run dev
```

Abre la URL que muestre Vite (normalmente `http://localhost:5173`).

## Compilar para producción

```bash
cd frontend
npm run build   # valida catalog.json, compila con Vite y genera los HTML de SEO
npm run preview # sirve dist/ para probarlo localmente
```

`npm run build` falla si `catalog.json` tiene datos inválidos (ver
`scripts/validate-data.mjs`): eso es intencional, para no publicar con datos rotos.

## Configurar antes de publicar

Edita `frontend/src/config.js` (o variables de entorno, ver `.env.example`):

- `whatsappNumber`: número real con código de país, solo dígitos. **Vacío por defecto.**
  Sin número, los botones de WhatsApp se convierten en "Copiar mensaje" — nunca se abre
  un enlace `wa.me` inválido ni se inventa un número.
- `logo.src`: coloca tu logo real en `frontend/public/logo.svg`. Si el archivo no existe,
  la tienda usa automáticamente un wordmark tipográfico ("GROOTY STORE") — no se inventó
  ningún logo. En cuanto agregues el archivo, aparece solo, sin tocar código.
- `heroIds`: ids del catálogo que aparecen en el hero de la Home.

## Estructura

```
frontend/
  src/
    main.js, router.js, config.js, store.js, analytics.js, data.js, search.js, filters.js
    data/catalog.json          ← los 88 productos, sin modificar
    lib/                       ← utilidades (imágenes, WhatsApp, formato, etc.)
    components/                ← header, footer, card, drawer, quickview, paleta de búsqueda...
    motion/                    ← capa de animación (GSAP), desactivable
    views/                     ← home, catálogo, marca, preventas, producto, ayuda, 404
    styles/                    ← tokens, base, layout, componentes, vistas, motion
  scripts/
    validate-data.mjs          ← valida catalog.json antes de compilar
    build-seo.mjs              ← genera HTML con metadatos por ruta (WhatsApp/Instagram/Google)
  public/                      ← logo.svg (si lo agregas) y otros estáticos
supabase/                      ← sin conectar todavía (igual que en V3)
```

## Documentos de este proyecto

- `README-UX.md` — qué cambió y por qué.
- `README-MOTION.md` — qué librería anima qué, y cómo se desactiva.
- `DATA-DICTIONARY.md` — de dónde sale cada dato mostrado (y qué no se inventa).
- `AUDITORIA.md` — comparación tienda anterior / V3 / V4.
- `REPORTE-VALIDACION.md` — qué se probó, cómo, y qué falta por probar con datos reales.

## Rutas

`/`, `/catalogo`, `/preventas`, `/marcas`, `/marcas/:slug`, `/figura/:slug-id`, `/ayuda`.
El refresh directo en cualquiera de estas rutas funciona gracias a `frontend/vercel.json`
(rewrite a `index.html`) y a los HTML de SEO que genera `build-seo.mjs`.

## Pruebas rápidas manuales

- `?motion=off` al final de cualquier URL desactiva toda la animación (para comparar).
- Con `prefers-reduced-motion: reduce` activado en el sistema, ocurre lo mismo automáticamente.
- Vacía `whatsappNumber` (por defecto) y confirma que ningún botón abre un enlace roto.
