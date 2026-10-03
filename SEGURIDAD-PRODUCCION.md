# Seguridad de Grooty Store

## Implementado

Frontend: CSP sin scripts inline/eval, anti-framing, nosniff, política de referrer/permisos, escape HTML, validación de catálogo y enlaces, API same-origin, admin noindex/no-store. GSAP conserva estilos dinámicos; style-src permite unsafe-inline. No se exponen secretos en VITE_. Swiper corregido a 12.1.2.

Backend: Google OIDC con firma JWKS oficial, issuer/audience/expiry/nonce/email_verified y sub. PKCE y state ligado al navegador con uso único; solo cuentas Gmail previamente autorizadas. Sesión opaca en cookie HttpOnly/Secure/SameSite=Lax, hash en DB, expiración 8 horas. Role/active consultados por petición, logout y revocación. Origin exacto + CSRF obligatorio en escrituras; validación servidor, payload 64 KiB, consultas parametrizadas, transacciones/revisión para impedir pérdida de ediciones, rate limit PostgreSQL, errores sin secretos y auditoría. No se solicita acceso al buzón Gmail.

Base: tablas privadas sin acceso anon/authenticated, RLS públicas, rol de runtime grooty_app limitado que no concede roles ni borra auditoría; TLS con validación del certificado a DB. Credencial administrativa se utiliza solo fuera del runtime para migraciones/autorizaciones. Migración no autoriza cuentas ni crea contraseña.

## Comprobaciones locales

Pruebas HTTP y PostgreSQL embebido: visitante rechazado, CSRF/Origin, payload, IDs, precio/stock/fotos, duplicados, edición concurrente, archivado, rollback, restricciones de rol DB, autorización/revocación/logout, OAuth state/replay y JWT hostil. Firmas de prueba y mocks no equivalen a login Google real. npm audit en backend/frontend sin vulnerabilidades detectadas al verificar; no es prueba de inmunidad ni pentest.

## Pendiente antes de activar

Google OAuth real y callback exacta; Gmail autorizados; conexión pooler/certificados Supabase; rol LOGIN restringido; backups/restauración; Vercel Functions y pruebas de aceptación; WAF/límites de tráfico según plan; monitorización de errores y costos; política de retención/purga de tablas privadas. Mantener MFA en cuentas de proveedores y no compartir passwords.

## Límites

Las fotos admiten URLs HTTPS y se muestran en navegador; el backend no las descarga. Un uploader futuro requiere validación de bytes/MIME/tamaño y reencodeado. No se almacenan tarjetas ni procesan pagos. Las sesiones antiguas expiradas se eliminan al iniciar sesión; las cuentas pueden revocarse inmediatamente. La aplicación no impone MFA al proveedor Google. No habilitar ADMIN_ENABLED hasta completar CIERRE-PRODUCCION.md.
