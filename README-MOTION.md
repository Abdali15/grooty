# Motion — qué librería controla qué

Principio general: **el contenido funciona sin ninguna animación.** Todo lo de este
documento es una capa que se puede desactivar por completo (`?motion=off`, o
`prefers-reduced-motion: reduce`) sin perder ninguna funcionalidad, botón o dato.

## Librerías usadas y por qué

| Librería | Se usa para | Por qué esta y no otra |
|---|---|---|
| **GSAP** (core) | Timelines de entrada, transiciones del hero, reveals de sección | Motor único de animación: evita mezclar 3-4 librerías distintas para lo mismo |
| **GSAP ScrollTrigger** | Reveals al hacer scroll (`data-reveal`, `data-reveal-group`) | Viene con GSAP, se registra una sola vez en `motion/index.js` |
| **GSAP SplitText** | Título del hero y `data-split` (títulos de página) | Incluida en el paquete gratuito de GSAP 3.13; si tu versión no la trae, ver nota abajo |
| **GSAP Flip** | Reordenar el catálogo al filtrar/ordenar/buscar | Es exactamente para esto: mide posiciones antes/después y anima el cambio de layout. Se carga como chunk aparte (`gsap/Flip`) solo en la vista de catálogo |
| **Swiper** | Galería de la ficha de producto y rieles (`rail`) | Toca, arrastra, teclado y paginación accesible ya resueltos; se carga como chunk aparte, no en el bundle principal |
| **Fuse.js** | Búsqueda difusa (paleta `Ctrl/Cmd+K` y buscador del catálogo) | Búsqueda aproximada ("spiderman" = "spider man", "batmn" → "Batman") sin servidor. Se carga al primer foco del buscador, no al inicio |
| **View Transitions API** (nativa del navegador) | Transición entre rutas y la imagen compartida card → ficha | Es nativa: no es una librería. Con navegadores que no la soportan, se usa un fallback sin animación (ver `router.js`) |

**Nota de seguridad — Swiper:** `npm audit` reporta una vulnerabilidad crítica de
prototype pollution en swiper < 12.1.2 (`GHSA-hmx5-qpq5-p643`), explotable solo cuando una
app pasa un objeto de configuración **no confiable** a `Swiper.extendDefaults()`. En este
proyecto no ocurre: `views/product-gallery.js` construye la configuración de Swiper como
un objeto fijo, sin mezclar datos externos ni de `catalog.json`, así que la ruta de
explotación no existe aquí. Se intentó actualizar a swiper 14.x (la única versión
parcheada, un salto de versión mayor) y **se revirtió**: rompía la apertura del lightbox
en las pruebas (ver `REPORTE-VALIDACION.md`) y no había margen para revalidar a fondo un
cambio de versión mayor de una librería de terceros. Queda como tarea documentada:
actualizar a swiper ≥ 12.1.2 con su propio ciclo de pruebas antes de la siguiente entrega.

**No se usó:** AutoAnimate (GSAP Flip ya cubre listas pequeñas: drawer, favoritos), Lenis
(el scroll nativo es más predecible para restaurar la posición al volver de una ficha),
Vanilla Tilt (el tilt/parallax/magnetic de `motion/pointer.js` son ~80 líneas propias, un
solo listener y un solo `requestAnimationFrame`, sin dependencia extra), Lottie, Rive,
Three.js, Barba.js, AOS, Animate.css, jQuery.

**Nota sobre SplitText:** es parte del "Business/Bonus" de GSAP en versiones anteriores,
pero desde GSAP 3.13 se distribuye en el paquete gratuito de npm. Si en tu cuenta de
gsap.com no aparece disponible, el único cambio necesario es sustituir los tres `import`
de `gsap/SplitText` (en `motion/index.js` y `components/hero.js`) por la librería
`split-type`, que tiene una API de líneas equivalente.

## Qué anima cada cosa

| Elemento | Cómo | Archivo |
|---|---|---|
| Entrada de la navbar (primera carga) | GSAP timeline, stagger corto | `router.js` (`motion.enter`) |
| Hero: entrada inicial y cambio de slide | GSAP timeline + SplitText, autoplay con barra CSS | `components/hero.js` |
| Reveals al hacer scroll | `ScrollTrigger.batch`, una sola vez (`once:true`) | `motion/index.js` |
| Título de página (serif grande) | SplitText por líneas con máscara | `motion/index.js` (`data-split`) |
| Reordenar catálogo al filtrar/ordenar/buscar | GSAP Flip (fade + scale leve + reflow) | `views/catalog.js` |
| Marquee de marcas | CSS puro (`animation` + `animation-play-state`) | `styles/components.css` |
| Hover de card, botones | CSS (`transition`) | `styles/components.css` |
| Quick view, drawer, hoja de filtros, paleta de búsqueda | CSS + clases `is-open`/`is-closing` | `components/overlay.js` |
| Cambios de ruta / imagen compartida card→ficha | View Transitions API nativa | `router.js` |
| Parallax del hero, tilt de tarjetas destacadas, botones "magnéticos" | Un `pointermove` delegado + un `rAF` con interpolación | `motion/pointer.js` |
| Corazón de favoritos, botón "+" → "✓" | CSS (`transition`/`animation` corta) | `styles/components.css` |

## Jerarquía de intensidad

Hero (mucha personalidad) → secciones destacadas (media) → grid de productos (ligera,
solo las primeras filas visibles) → utilidad/toolbar/drawer (mínima). Nunca se animan las
88 cards a la vez: solo las que entran al viewport (`ScrollTrigger.batch`) o las nuevas
tras "Ver más" (`motion.revealCards`).

## Fallback y robustez

- Si GSAP, Flip o Swiper fallan al cargar (red, bloqueo de terceros), `motion/index.js`
  captura el error, agrega la clase `.no-motion` a `<html>` y el contenido queda visible y
  usable — nunca depende de que la animación termine para mostrarse.
- Cada vista tiene una función `cleanup()` que revierte su contexto de GSAP
  (`gsap.context().revert()`) al salir, para no acumular listeners ni ScrollTriggers.

## `prefers-reduced-motion: reduce`

Aplicado automáticamente (`motion/index.js` escucha el media query): sin autoplay del
hero, sin parallax/tilt/magnetic, sin stagger complejo, marquee estático y desplazable,
transiciones de ruta reducidas a un fallback sin animación. Nada de esto quita
funcionalidad: los botones, filtros y navegación siguen exactamente igual.

## Cómo probarlo

Agrega `?motion=off` al final de cualquier URL (se guarda en `sessionStorage` para el
resto de la sesión; `?motion=on` lo revierte). Es el mismo interruptor que usa
`REPORTE-VALIDACION.md` para probar la tienda "en frío".
