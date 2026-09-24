# Grooty · Propuesta de rediseño

Propuesta navegable para mostrar al cliente. Catálogo de 88 productos publicado en la tienda original el 24/09/2026, incluyendo venta, preventa, precios de reserva y seis marcas. Conserva URLs de imágenes originales.

## Ejecutar
Node.js 22 o posterior:
```
npm ci
npm run build
npx vite dist --host 0.0.0.0
```
Abrir la URL mostrada por Vite. Para una revisión sin servidor, es necesario servir dist por HTTP; abrir index.html con file:// no permite cargar catalog.json.

## Vercel
Importar el repositorio; Root Directory: frontend. Framework: Other. Install: npm ci. Build: npm run build. Output: dist. La propuesta no requiere variables. Desplegar primero Preview. No reemplazar la tienda existente hasta aprobar diseño e integrar backend.

## Incluye
Diseño responsive, logo con rebote al pasar mouse/enfocar, entradas escalonadas, tarjetas con zoom, favoritos animados, menú Hamburgers, galería, carrito lateral y copia de consulta. Búsqueda, filtro por marca/estado/tipo, ordenación, paginación y persistencia local. Respeta prefers-reduced-motion y navegación por teclado.

Animate.css 4.1.1 (MIT) y Hamburgers 1.2.1 (MIT), distribuidos localmente en el build. No se cargan todas las bibliotecas de la lista porque duplican efectos; se usan las dos que corresponden a estas interacciones. Transiciones adicionales en CSS propio. Google Fonts: DM Sans y Barlow Condensed, con fallback local del sistema.

## Límites de esta propuesta
Lee un snapshot en catalog.json; no consulta stock en tiempo real, no cobra, no reserva ni confirma pedidos. La consulta se copia y se abre Instagram. La clave de Supabase y las credenciales NO están incorporadas. Las imágenes externas requieren conexión y disponibilidad del proveedor. Sin panel administrativo porque el backend lo desarrollará el propietario.

Para conectar la base, sigue el contrato de ../backend/README.md. Conserva consultas y escrituras administrativas en el servidor. Completa WhatsApp comercial, condiciones de preventa y entrega antes de publicar para ventas reales.
