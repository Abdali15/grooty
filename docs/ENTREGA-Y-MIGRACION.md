# Entrega, propiedad y migración de Grooty Store

## Estado real al 8 de octubre de 2026

El código, el esquema versionado y la Preview existen. No existe todavía una base de datos de Grooty provisionada y conectada por esta entrega. La creación está pendiente de conectar Supabase a la cuenta del propietario. Tampoco hay clientes OAuth de Google/Microsoft configurados. Este documento es un procedimiento preparado, no evidencia de un respaldo o una restauración ejecutados.

La tienda es pública. AUTH_ADMIN_ONLY=true restringe el inicio de sesión a identidades aprobadas. Los dos administradores confirmados están en el archivo privado de aprobaciones, fuera de GitHub y del paquete público. Ninguno se convierte en SUPER_ADMIN automáticamente. Pagos desactivados.

## Propiedad y elementos de entrega

Todos los proyectos deben crearse en cuentas del propietario: GitHub, Vercel, Supabase, Google Auth Platform, Microsoft Entra y proveedor de imágenes. Acceso del desarrollador mediante permisos revocables, no mediante propiedad exclusiva de sus cuentas.

El paquete de entrega debe contener:
- frontend/ y backend/, lockfiles, API api/index.js y vercel.json.
- supabase/schema.sql, supabase/admin.sql y backend/database/003_commerce.sql, 004_admin_approvals.sql.
- Catálogo inicial supabase/seed-catalog.sql, que no reemplaza un respaldo de los datos vivos.
- .env.example, guías de activación, API, pruebas y riesgos conocidos.
- Respaldo PostgreSQL real, fechado y cifrado, entregado por canal privado cuando exista la base.
- Archivo de aprobaciones y claves MFA/cookies/proveedores por canal privado separado del ZIP de código.
- Imágenes originales y manifiesto de rutas, derechos de uso y asociación de cada imagen a su producto.
- Inventario de proyectos y dominios, sin secretos, y acta de transferencia de propiedad.

Un enlace de Vercel no contiene la base, los archivos de imágenes ni las credenciales.

## Respaldo portable de datos

Instalar herramientas PostgreSQL compatibles con la versión real del servidor. No están disponibles en el entorno de esta entrega y no se ha ejecutado pg_dump/pg_restore contra una base real.

Usar perfiles libpq privados pg_service.conf y pgpass/PGPASSFILE con TLS verificado. No colocar contraseñas ni URLs de conexión con contraseña en argumentos de terminal, comandos guardados, tickets o GitHub.

Ejemplo para un operador autorizado con PGSERVICE=grooty_source ya configurado de forma privada:

    pg_dump --format=custom --schema=public --schema=grooty_private --schema=grooty_commerce --exclude-table-data=grooty_commerce.sessions --exclude-table-data=grooty_commerce.oauth_attempts --exclude-table-data=grooty_private.sessions --exclude-table-data=grooty_private.oauth_attempts --file=grooty.backup

Comprobar código de salida, advertencias y archivo creado. Generar checksum SHA-256, cifrar con la herramienta aprobada del propietario y mantener una copia protegida fuera del hosting. El formato custom está comprimido, pero NO cifrado. El respaldo contiene datos personales, auditoría y claves MFA cifradas: conservarlo como confidencial.

El ejemplo exporta esquemas de la aplicación. No incluye roles globales, configuración OAuth, funciones Edge de otros proyectos, secretos de Vercel ni los archivos binarios de Supabase Storage/ImageKit. Para un traslado completo Supabase→Supabase usar también la guía oficial del proveedor; no exportar indiscriminadamente sus esquemas internos.

Revisar dependencias entre esquemas, extensiones y roles antes de restaurar. En PostgreSQL externo preparar roles anon/authenticated y grooty_app con permisos compatibles; no asignar BYPASSRLS o SUPERUSER al runtime. Un respaldo parcial de esquemas no garantiza restauración en cualquier base vacía.

## Restauración y cambio de proveedor

1. Crear destino NUEVO y separado. Revisar versión, pgcrypto, roles, cuotas, TLS y región.
2. Revisar el índice del archivo: pg_restore --list grooty.backup.
3. Con PGSERVICE=grooty_destination y destino vacío comprobado, restaurar mediante operador privado:

       pg_restore --no-owner --single-transaction --exit-on-error --dbname=service=grooty_destination grooty.backup

   No usar --clean ni restaurar sobre la producción activa. Conservar permisos ACL: no usar --no-acl sin reconstruir y probar todas las restricciones. El propietario de objetos restaurados no debe ser la credencial de runtime.
4. Validar conteos e IDs, relaciones, secuencias, precios, stock, productos archivados, allowlist, restricciones, grants y RLS. No recrear mediante seed una base con datos.
5. Mantener MFA_ENCRYPTION_KEY privada cuando se migren credenciales MFA cifradas. Cambiarla sin re-encriptación impediría descifrarlas. OAuth debe conservar proveedor/issuer/sub válidos.
6. Migrar los archivos de imágenes por herramientas del proveedor, comprobar hashes y actualizar las rutas por operación revisada. Un dump de PostgreSQL no contiene las fotografías alojadas externamente.
7. Configurar DATABASE_URL con rol limitado y TLS; callbacks exactos de Google/Microsoft y APP_ORIGIN en el destino. No compartir secretos de producción con Preview.
8. Recompilar frontend y servir frontend/dist. API en Vercel Function o backend Node detrás de proxy HTTPS. backend/server.js escucha en loopback; fuera de Vercel necesita reverse proxy del mismo origen para /api. No exponer directamente un proceso de desarrollo.
9. Probar navegador público sin sesión, login autorizado/no autorizado, MFA, revocación, edición de catálogo→lectura pública y consultas WhatsApp. PAYMENTS_ENABLED=false.
10. Para corte final, pausar escrituras, realizar respaldo final y comprobación, cambiar dominio solo después de pruebas. Si falla, volver al hosting/base anteriores; evitar escrituras simultáneas en ambas bases.

## Configuración sin secretos del servicio

El inventario debe registrar: proveedor, cuenta propietaria, ID de proyecto, región, entorno, hostname, callback Google /api/auth/google/callback, callback Microsoft /api/auth/microsoft/callback, versiones y fecha de última restauración verificada.

Los valores privados se administran por separado. VITE_* solo contiene opciones públicas; nunca DATABASE_URL, service_role, claves OAuth, MFA ni tokens de pago.

## Fuentes oficiales y limitaciones

- https://www.postgresql.org/docs/current/app-pgdump.html
- https://www.postgresql.org/docs/current/app-pgrestore.html
- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore

No se declara que la migración funcione hasta ejecutarla en el destino seleccionado y probar los controles de autorización y los datos. Los scripts SQL deben revisarse contra el esquema real antes de aplicarlos. La creación de recursos puede requerir login del propietario, condiciones de servicio o confirmación de plan; no asumir que todos los recursos son gratuitos.
