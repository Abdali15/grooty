# Grooty: tarjetas uniformes y figuras a pedido

## Cambios de esta revisión

La captura mostraba tarjetas de preventa con anchos distintos y, por tanto, fotos y títulos que empezaban a diferentes alturas. Los ítems flex permitían que el contenido impusiera un ancho mínimo. Se fija el ancho del carrusel, se elimina ese mínimo intrínseco y se impide la compresión del bloque de imagen. Todas las tarjetas de una misma fila usan un lienzo de proporción 4:5, con márgenes iguales. Las fotografías se conservan completas: no se estiran ni se cortan figuras para aparentar que los originales tienen la misma proporción.

Se alinea el precio al final de la tarjeta y se mantiene el efecto hover, la vista rápida, el carrusel, el logo animado, GSAP y las transiciones de navegación.

El acceso **Admin** aparece en la cabecera, también en móvil. La dirección es `/admin`. **Probar demostración** abre un inventario con borradores locales. Permite probar productos, marcas, stock, archivado y destacados sin publicar modificaciones. Para operar el catálogo real, el backend debe implementar el contrato documentado en `backend/README.md`; la sesión y los permisos se validan en servidor. No hay cuentas predeterminadas ni gestión real activa por guardar un borrador.

La nueva sección **Figuras por encargo** está en Inicio y en `/a-pedido`, accesible desde la navegación, el enlace debajo del hero y el footer. Prepara una consulta con figura/personaje, marca y opcionalmente presupuesto, referencia HTTPS y detalles. Muestra el mensaje para revisarlo. Si existe un número verificado en `SITE.whatsappNumber`, abre `wa.me` con el texto; si no, permite copiarlo y abrir el Instagram de la tienda. Nunca manda un mensaje automáticamente.

No se añade un cronómetro de campaña sin una fecha de cierre confirmada por los propietarios. Una sección permanente de búsqueda por encargo resulta más útil que una urgencia inventada.

## Crítica de diseño y prioridades siguientes

1. **Fotografía:** el catálogo mezcla fotos de cajas, figuras y pósteres. Un lienzo uniforme resuelve la geometría, pero una sesión fotográfica consistente daría el mayor salto visual: fondo neutro, misma distancia, figura completa y segunda foto del empaque. No sustituir fotos reales por representaciones generadas.
2. **Información de compra:** completar stock real, escala, personaje, franquicia, contenido de caja y estado con datos de los dueños. No asumir disponibilidad por aparecer en catálogo.
3. **Confianza:** activar el número directo confirmado y publicar condiciones reales de envío, medios de pago y fechas de arribo. La reserva debe mostrar total, adelanto y saldo.
4. **Identidad futurista:** mantener verde oscuro, acentos lima, trazos finos y fondos atenuados; los controles y precios deben dominar sobre la decoración. Añadir más efectos no resuelve falta de información.
5. **Administración:** la demostración sirve para evaluar el flujo. La publicación compartida depende de conectar el backend con PostgreSQL/Supabase, sesión segura, autorización y control de revisiones.

## Límites de validación

La geometría se corrige en CSS a partir de la captura. Las verificaciones de sintaxis, integridad de los 88 productos, validación de consultas y compilación remota no sustituyen una comprobación visual interactiva en todos los tamaños. El número directo y el backend de producción siguen pendientes de configuración real.
