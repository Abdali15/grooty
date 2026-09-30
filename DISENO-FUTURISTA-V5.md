# Grooty V5 · Galería futurista orgánica

## Dirección

Identidad verde original conservada, con grafito, bosque oscuro y acentos lima. Tipografía Instrument Serif para las piezas y titulares, DM Sans para la interfaz y Barlow Condensed para precios/etiquetas. Fotos originales de las 88 figuras, sin alteraciones comerciales.

Referencias consultadas: MAX Sneakers por Kamrul Islam (https://dribbble.com/shots/27354499-MAX-Sneakers-E-Commerce-Website-Design), Unis Footwear por Rogue (https://rogue.studio/work/unis) y el caso DeepSee Commerce de Hon Tran (https://www.hontran.dev/blog/deepsee-commerce-3d-ecommerce-website-case-study). Son referencias de dirección y presentación; no se copian imágenes ni composiciones completas.

## Cambios

- Fondo original orbital con arquitectura orgánica, bosque, grafito y luz lima; versiones WebP de 89 KB y 25 KB. Reutilizado con transparencias y encuadres distintos en portada y descubrimiento.
- Marco de producto 4:5, zona interior uniforme, object-fit contain y eliminación del tamaño intrínseco impuesto por el análisis de fondos. Las siluetas mantienen su proporción; no se garantiza que objetos físicamente distintos tengan idéntico volumen visual.
- Tarjetas estructuradas como paneles con imagen, marca, nombre, edición, precio, reserva y acción. La fotografía tiene espacio reservado frente a badges y controles.
- Carrusel GSAP/SplitText, fondos con parallax, inclinación, brillo, reveal en cascada, favoritos animados y View Transitions conservados.
- Dos movimientos ligados al scroll mediante ScrollTrigger dentro del contexto reversible de la ruta; el progreso de lectura utiliza scroll-timeline como mejora progresiva. Sin reproducción sonora ni scroll bloqueado.
- Accesos guiados: catálogo en venta, preventas y búsqueda. Conteos reales y navegación contextual.
- Superficies de búsqueda, filtros, fichas, drawer y ayuda adaptadas al tema oscuro. Controles táctiles de 44 px; reduced-motion conservado.

## Administración

Ruta `/admin`, acceso en el pie bajo «Acceso de propietarios». Inventario, búsqueda/filtros, ficha editable, stock desconocido o agotado, ocultar, archivar/restaurar, marcas, destacados y exportación JSON.

Dos estados separados: sesión real validada por el backend (role owner/admin, cookie y CSRF), y demostración explícita con borradores locales. La demostración no modifica el catálogo público. No hay usuarios ni contraseñas de prueba integrados. El stock real solo se muestra cuando existe una cantidad verificada.

El contrato y la conexión están en backend/README.md. Al configurar VITE_CATALOG_API, la tienda carga el catálogo publicado desde la API antes de inicializar sus módulos. No se configuraron variables de Vercel ni se creó una base remota. El esquema Supabase incluye stock nullable/revision y protege el índice de imágenes de figuras ocultas.

## Asset original

Generado con herramienta integrada de imágenes (no CLI): frontend/public/art/collector-portal.webp y collector-portal-small.webp.

Prompt: «Fondo ancho cinematográfico para una tienda futurista de figuras: galería arquitectónica grafito y verde bosque, portal orbital luminoso lima a la derecha, pedestal metálico, paneles lejanos y vegetación tenue; izquierda oscura y despejada para textos; sin productos, personajes, texto, logos ni marcas de agua; materiales 3D, niebla y bordes suavemente desvanecidos». Las fotos de los productos no son generadas.

## Validación y límites

Sintaxis de 41 módulos comprobada. Catálogo: 88 figuras / 6 marcas / 18 preventas, checksum original sin cambios. Render de las 88 fichas y pruebas de stock/reserva, URLs, escape HTML, separación del demo, persistencia y validación del contrato público realizadas. La seguridad real de endpoints administrativos se deberá verificar cuando el backend exista. No se afirma una prueba completa de autenticación real contra un servidor inexistente.
