# Auditoría UX/UI — Grooty V4 · 29/09/2026

Actualización sobre la V4 existente. Se conserva la identidad verde, la tipografía editorial, GSAP, SplitText, ScrollTrigger, la navegación y las animaciones originales.

## Hallazgos y correcciones

| Prioridad | Hallazgo | Cambio |
| --- | --- | --- |
| Crítica | GSAP lleva la palabra decorativa del hero a opacidad 1 tras cambiar de figura, tapando los textos. | Opacidad 0.055 en el contenedor: la transición del texto mantiene su fade sin poder volverse opaca. |
| Alta | Títulos grandes y leading 0.9 comprimen las líneas; controles y sección de marcas quedan pegados. | Título hasta 82 px, leading 1.04, más espacio entre columnas, reserva inferior de 112 px y separación externa de 28–48 px. |
| Alta | Falta el logo original. | Original optimizado a WebP de 256 px / 11 KB; espacio reservado en cabecera y pie, manteniendo el hover animado y la alternativa tipográfica. |
| Alta | La búsqueda expandida y el nuevo logo pueden saturar la cabecera de tablet. | Búsqueda compacta hasta 1280 px, gaps adaptativos y distribución móvil desde 320 px. |
| Media | Tarjetas con títulos largos o sin línea de colección desalinean el pie. | Leading 1.4, altura de dos líneas, subtítulo estable, carruseles con tarjetas de igual altura, espacio y separadores suaves. |
| Media | Imagen destacada depende de un porcentaje de altura en una cuadrícula de altura intrínseca. | Marco de anchura explícita y aspect-ratio 4/5; se conserva contain y la inclinación. |
| Media | «Recién llegados» incluye productos en preventa. | «Novedades del catálogo» con conteos reales: 88 figuras, 6 marcas y 18 preventas. |
| Alta | En la ficha se confunde el precio completo con el pago de reserva. | Etiqueta de precio total; reserva, saldo y política explícitos. No se modifica ningún importe. |
| Media | Faltan datos visibles y orientación para comprar. | Marca, línea/edición cuando existe, fotos publicadas, estado, modalidad y código; ocho preguntas frecuentes sobre compra, envío, preventas y contacto. |
| Media | El bucle de parallax continúa incluso cuando el ratón está quieto. | El rAF se detiene al estabilizarse y se reactiva al mover el puntero. Se retiran elementos desmontados y se desconecta el observer del hero al salir. |

## Datos y alcance

El catálogo conserva sus 88 registros originales sin alterar IDs, precios, estados, imágenes ni reservas (checksum SHA-256 25901ceb5cb35fe1665b7c04b4e83d3d372e9b705e7e85c040f5562f03d0fc12).

La ficha acepta description, includes_text y box_note cuando el backend entregue información verificada. No se inventan accesorios, stock, fechas de llegada, transportistas, números de contacto ni condiciones de devolución.

Pendientes comerciales: número real de WhatsApp, métodos de pago, cobertura/costos/plazos de envío, stock verificado y descripciones originales del vendedor. El CTA copia el mensaje y ofrece Instagram mientras WhatsApp no está configurado.

Supabase sigue como esquema preparado; esta actualización no crea ni conecta una instancia remota. El frontend utiliza catalog.json.

## Verificación

- Sintaxis: 37 módulos JS/MJS sin errores.
- Validador de datos: 88 productos, 6 marcas, 18 preventas; checksum original intacto.
- Render con entorno Vite emulado: 88 fichas, importes/reservas/saldos, portada y 8 FAQ; textos de descripción e incluidos escapados contra inyección HTML.
- Regresión de puntero: se detiene en reposo y vuelve a animar al mover el ratón.
- Revisión visual inicial basada en la captura aportada y el código. El navegador de comprobación no pudo cargar la URL anterior (ERR_BLOCKED_BY_CLIENT); no se afirma haber completado pruebas visuales en todos los tamaños ni ejecución real de GSAP.
- Build de producción: se verificará en el despliegue de Vercel; npm local está bloqueado por el acceso al registro.
