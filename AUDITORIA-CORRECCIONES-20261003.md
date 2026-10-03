# Correcciones de experiencia de compra

- La búsqueda prioriza coincidencias literales, normaliza guiones y mantiene alias. Las erratas se muestran como sugerencias independientes. Buscar Spider-Man ya no mezcla Superman ni Batman.
- Los resultados de la búsqueda rápida anuncian el número mostrado y el total. Las sugerencias no se anuncian como coincidencias exactas.
- La consulta por WhatsApp pasa a ser la acción principal de la ficha, vista rápida y barra móvil. Se conserva Mi selección como acción secundaria.
- Se conserva el grupo oficial y se identifica como grupo. El chat privado se activa cuando se configura un número válido en VITE_WHATSAPP_NUMBER o en los ajustes del catálogo público. No se inventa el contacto de la tienda.
- Títulos de producto coherentes entre vista rápida y ficha; Instrument Serif permanece en usos editoriales. Se conservan logo, paleta y animaciones.
- Recomendaciones ponderan personaje y franquicia explícitos cuando existen; no usan Comic/Bonus como vínculo temático. La descripción no promete que todas compartan personaje.
- Novedades del catálogo sustituye afirmaciones de llegada física de mercadería.
- El formulario de propietarios solo aparece cuando el endpoint de sesión responde como backend de autenticación. Sin backend se muestra el estado y la demostración sin contraseña.

## Verificación

`cd frontend && npm test && npm run build`

Se conserva el catálogo de 88 productos, 11 preventas y todas sus fotografías originales. Las portadas tienen lienzo 4:5; una escala visual idéntica de la figura requiere portadas tomadas con encuadres similares. No se deduce stock, accesorios ni condición de la caja.

## Pendientes del propietario

1. Número privado oficial de WhatsApp.
2. Stock, accesorios y estado de cada caja verificados.
3. Fotografías de portada consistentes de la unidad/edición real.
4. Backend y cuentas privadas conforme a backend/README.md. La demostración no publica datos.
5. Validación en iPhone/Android reales y medición de rendimiento.
