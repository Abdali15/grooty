# Grooty backend — Google + PostgreSQL

Implementación Node.js con API del mismo origen, Google OpenID Connect y PostgreSQL compatible con Supabase. Los endpoints y migraciones están probados localmente. No hay base remota ni OAuth configurados por este cambio; el acceso queda cerrado por defecto. No hay contraseñas predeterminadas ni correos autorizados incluidos en GitHub.

## Carpetas y ejecución

- `frontend/`: tienda Vite y panel existente, preservando diseño y animaciones.
- `backend/`: API, autenticación, validadores, comandos privados y pruebas.
- `api/index.js`: adaptador para Vercel Functions. Desplegar desde la raíz del repositorio, NO solo frontend.
- `supabase/schema.sql`, `admin.sql`: tablas públicas, RLS y tablas privadas.
- `supabase/seed-catalog.sql`: importación inicial de 88 figuras, 6 marcas, 100 URLs de fotografías. Solo en base nueva y vacía; no es backup ni incluye archivos de fotografías.

Requiere Node >=22. `npm ci --prefix backend`; `npm ci --prefix frontend`; `npm test`; `npm run build`.
Para desarrollo copia `.env.example` a `.env` dentro de backend, con NODE_ENV=development y APP_ORIGIN=http://localhost:5173. Ejecuta backend en 3000 y Vite en 5173; Vite proxy envía /api a loopback. El backend no sirve archivos del frontend.

## Activación

Sigue `../CIERRE-PRODUCCION.md` y `ACCESO-ADMIN.md`. La lista de cuentas vive en `grooty_private.admin_accounts`; el servidor vincula el correo verificado al identificador Google `sub` tras el primer acceso. Una cuenta autenticada no obtiene rol automáticamente. `owner` y `admin` gestionan catálogo/contenido; los permisos solo se conceden o revocan con el comando privado, fuera del navegador.

Google procesa el inicio de sesión directamente. Supabase se usa como PostgreSQL; esta implementación no requiere Supabase Auth. No se solicita acceso a Gmail, Drive ni contactos: scopes openid/email.

## Contrato API

| Método | Ruta | Función |
|---|---|---|
| GET | /api/health | Proceso disponible; no prueba la base ni Google. |
| GET | /api/auth/config | Proveedor y disponibilidad de configuración, sin secretos. |
| GET | /api/auth/google/start | State, nonce y PKCE; redirección a Google. |
| GET | /api/auth/google/callback | Verifica JWT Google, cuenta autorizada y crea sesión. |
| GET | /api/store/catalog | Catálogo publicado y configuración pública. |
| GET | /api/admin/session | Usuario, rol y CSRF; 401 sin sesión. |
| GET | /api/admin/catalog | Catálogo completo, marcas y settingsRevision. |
| POST | /api/admin/logout | Revoca cookie/sesión. |
| POST | /api/admin/products | Alta; ID definitivo asignado por DB. |
| PUT | /api/admin/products/:id | Edición + fotos en transacción; exige ID coincidente y revision. |
| PATCH | /api/admin/products/:id | Archivar/restaurar con revision; no elimina físicamente. |
| POST | /api/admin/brands | Marca nueva; rechaza duplicados sin distinguir mayúsculas. |
| PUT | /api/admin/settings | Destacados, WhatsApp y cine; exige settingsRevision. |

JSON compatible con `frontend/src/lib/admin-client.js`. Errores {error}; 409 por cambios concurrentes/duplicados. Precio en soles, stock null significa desconocido, 0 significa agotado. Todos los endpoints administrativos comprueban sesión y permiso vigente. POST/PUT/PATCH requieren Origin exacto y X-CSRF-Token. El endpoint anterior de email/password se retiró: nunca captures contraseñas Google en el panel.

## Seguridad aplicada

Firma JWT RS256/JWKS oficiales, issuer/audience/expiry/maxTokenAge/nonce/email_verified/azp, cuentas exclusivamente gmail.com autorizadas y vinculación sub; OAuth state ligado a cookie de navegador y consumido una sola vez; PKCE; sin refresh/access tokens persistidos.
Sesiones opacas de 8 horas, hash SHA256 en PostgreSQL y cookie HttpOnly/Secure/SameSite=Lax con prefijo __Host- en HTTPS. Logout y revocación de cuenta bloquean la sesión; role se consulta en cada petición. Origin + CSRF obligatorio en escrituras. Consultas parametrizadas; validación servidor, límite 64 KiB, TLS verificado a DB, transacciones y revisiones para productos/contenido, auditoría sin secretos, rate limit persistente. Credenciales exclusivamente servidor.

La cuenta `grooty_app` se crea NOLOGIN con permisos restringidos. No concede roles ni borra auditoría. La configuración privada debe habilitar LOGIN con contraseña fuerte, fuera de GitHub, y usar el pooler/certificado del proveedor. `DATABASE_ADMIN_URL` se reserva al equipo encargado de migraciones y autorizaciones; no se instala en Vercel runtime.

Las imágenes se gestionan por URLs HTTPS y orden de portada; NO hay uploader binario. La API no descarga URLs proporcionadas por usuarios. Si se agrega subida, validar bytes/tamaño/MIME, reencodear y configurar almacenamiento por separado. Mi selección abre una consulta; no cobra ni descuenta stock.

## Límites de validación

Pruebas SQL sobre PostgreSQL embebido PGlite y HTTP local, no una conexión Supabase remota. Token Google firmado de prueba/JWKS locales para casos hostiles; no hubo inicio de sesión con una cuenta Google real. Falta comprobar OAuth real, TLS/pooler del proveedor, Vercel Functions, móvil físico y recuperación de backup antes de activar.

No se incluye checkout, gestión de pedidos, pagos ni sincronización automática del catálogo original. El SEO estático usa el catálogo exportado: regenerar el build o implementar SEO dinámico cuando cambien las figuras. El catálogo público consulta DB en la siguiente carga al activar VITE_CATALOG_API=/api/store/catalog; no actualiza pestañas ya abiertas en tiempo real. Si API falla se conserva catálogo importado y se muestra aviso de confirmar precio/disponibilidad.
