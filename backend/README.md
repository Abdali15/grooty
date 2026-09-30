# Backend para Grooty V5

El propietario desarrollará el backend. Esta carpeta define el contrato que ya consume el frontend; no contiene un servidor activo ni credenciales. El administrador está en `/admin` y existe una demostración con borradores locales independiente del catálogo público.

## Activar la conexión

1. Implementa los endpoints de esta guía con PostgreSQL/Supabase y autenticación de propietarios.
2. Sirve `/api` detrás del mismo dominio de la tienda mediante un proxy. El frontend acepta rutas del mismo origen para evitar enviar cookies/CSRF a servidores arbitrarios.
3. Define `VITE_CATALOG_API=/api/store/catalog` y opcionalmente `VITE_ADMIN_API_BASE=/api/admin` al compilar. Son rutas públicas, no secretos. No se han configurado variables en Vercel durante este cambio.
4. Crea las cuentas de los propietarios por un procedimiento privado del servidor. No hay contraseñas predeterminadas. Nunca incluyas `service_role`, credenciales PostgreSQL ni claves privadas en variables `VITE_*`.
5. Verifica que un visitante no pueda consultar ni escribir endpoints administrativos. Después de guardar, la siguiente carga de la tienda leerá los cambios desde la API.

## Contrato HTTP

Todas las respuestas usan `Content-Type: application/json`. Los errores usan `{ "error": "Mensaje comprensible" }` con el estado HTTP correcto.

| Método | Ruta | Respuesta / comportamiento |
|---|---|---|
| GET | /api/store/catalog | `{ products: [...], settings: { heroIds: [93,92], whatsapp: "número real" } }`; solo publicados/no archivados. |
| GET | /api/admin/session | `{ user: { email, role: "owner" }, csrf: "token aleatorio de al menos 16 caracteres" }`; 401 si no hay sesión. |
| POST | /api/admin/login | Recibe `{ email, password }`. Valida cuenta/rol, crea cookie de sesión y devuelve la misma estructura de session. |
| POST | /api/admin/logout | Revoca sesión en servidor y limpia cookie. Devuelve `{ ok: true }`. |
| GET | /api/admin/catalog | `{ products: [...], brands: ["Mafex",...], settings: { heroIds: [...] } }`; incluye ocultos y archivados. |
| POST | /api/admin/products | Recibe el producto de abajo. Autoriza al propietario, valida y crea con ID y revisión controlados por servidor. |
| PUT | /api/admin/products/:id | Actualiza e incrementa revision solo si `revision` coincide. Devuelve `{ product }`; 409 ante edición concurrente. |
| PATCH | /api/admin/products/:id | Recibe `{ archived: true/false, revision }`. Retiro reversible; no borrado físico. |
| POST | /api/admin/brands | Recibe `{ name }`; valida duplicados/caso, genera slug y devuelve `{ brand }`. |
| PUT | /api/admin/settings | Recibe `{ heroIds: [...] }` más campos previamente entregados; valida máximo 5 IDs únicos, publicados y no archivados. |

El servidor asigna ID definitivo en altas: el ID propuesto por el cliente solo es provisional. No uses `MAX(id)+1` en SQL; usa la identity/sequence. Para modificaciones exige que el ID de ruta coincida y usa revisión en una transacción.

## Producto (contrato público y administrativo)

```json
{
  "id": 93,
  "sku": "GRT-93",
  "marca": "Mafex",
  "titulo": "Nombre exacto de la figura - Línea o edición",
  "estado": "Sellado",
  "tipo": "venta",
  "precio": 250,
  "precio_reserva": null,
  "stock": null,
  "published": true,
  "archived": false,
  "revision": 1,
  "franchise": "",
  "character_name": "",
  "description": "",
  "includes_text": "",
  "box_note": "",
  "imagenes_producto": [{ "url": "https://tu-cdn.com/foto.webp", "posicion": 0 }]
}
```

`stock: null` = por confirmar. `stock: 0` = agotado. No conviertas datos desconocidos a cero. Los importes son números en soles; reserva entre cero y precio total, solo en preventa. Los campos de descripción se muestran únicamente cuando los propietarios los completan. No se hacen cobros, reservas ni descuentos automáticos de stock por añadir a Mi selección.

Para adaptar el esquema `supabase/schema.sql`: `title→titulo`, `condition→estado`, `sale_type→tipo`, `price→precio`, `reservation_price→precio_reserva`, nombre de brands→marca y product_images→imagenes_producto. El resto conserva su nombre.

## Seguridad que debe implementar el servidor

- Sesiones revocables con cookies HttpOnly/Secure/SameSite; autorización owner/admin en **cada** endpoint administrativo. La revisión de rol del frontend no es un control de seguridad del servidor.
- CSRF con `X-CSRF-Token` y comprobación del Origin en escrituras; rate limit en login y contraseña hasheada con algoritmo adecuado.
- Validación completa de IDs, estado, modalidad, importes, stock, longitudes, URLs y revisión; consultas parametrizadas y operaciones atómicas.
- Retirar productos mediante archived. Mantener auditoría (actor, fecha y cambio) y copias de seguridad.
- Solo el backend publica imágenes verificadas. Para uploads futuros: validar bytes/MIME/tamaño, reencodear y almacenar en Supabase Storage/ImageKit con permisos adecuados. El editor actual admite URLs HTTPS de imágenes reales.
- No devuelvas contraseñas, hash, cookies o tokens privados en el catálogo. No expongas tablas administrativas públicamente.

Supabase proporciona PostgreSQL; pgAdmin es una herramienta para administrar PostgreSQL, no un proveedor alternativo de base de datos. El SQL adjunto está preparado y no se ejecutó contra una base remota.
