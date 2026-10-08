# Tienda en Vercel sin pasarela activa

Decisión del propietario: posponer pasarela; publicar catálogo, selección/favoritos, consultas por WhatsApp y figuras a pedido; activar administración Google cuando DB/OAuth estén configurados.

VITE_PAYMENTS_ENABLED=false oculta el botón de compra online del carrito. PAYMENTS_ENABLED=false rechaza creación de pedidos financieros, checkout, cobro de reservas y webhook antes de acceder a DB o pasarela. No crea éxitos falsos. El código de pago se conserva para desarrollo posterior, fuera del flujo comercial visible.

El número de consultas permanece 51936804577. No se cambian precios, stock ni catálogo; no se ejecutan migraciones al desplegar.

## Google administrativo, independiente de pagos

Estado comprobado al preparar esta entrega: Vercel tiene cero variables backend; no existe conexión configurada ni cliente OAuth. La aprobación del Gmail del dueño se conserva en el archivo privado entregado; no está aplicada a una DB real. Entrar con Gmail en Vercel no concede acceso al administrador de Grooty.

Para activar:
1. Preparar PostgreSQL/Supabase separado y backup; aplicar migraciones mediante el operador, sin recrear una base con datos. Importar catálogo revisado solo si las tablas están vacías.
2. En Google Auth Platform crear un cliente OAuth de tipo aplicación web para Grooty. Configurar branding/audience y usuarios de prueba si corresponde. Usar los scopes openid, email y profile. Registrar callback exacto `https://DOMINIO-ESTABLE/api/auth/google/callback`; sin comodines.
3. Configurar en Vercel (entorno aislado): APP_ORIGIN del dominio estable, DATABASE_URL de rol limitado, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, MFA_ENCRYPTION_KEY y RATE_LIMIT_KEY_SECRET. ADMIN_MFA_REQUIRED=true. Activar AUTH_GOOGLE_ENABLED=true solo después de configuración. Microsoft puede permanecer false. PAYMENTS_ENABLED sigue false.
4. Aplicar aprobaciones privadas por CLI documentada en REFUERZO-PERU-3.0.md. Autoriza ADMIN, no SUPER_ADMIN, y solo vincula proveedor e identidad verificada. No pegar correos en código público ni enviar claves por chat.
5. Activar VITE_CATALOG_API=/api/store/catalog para que los cambios de catálogo se reflejen en la tienda, después de comprobar DB, importación y permisos. El panel usa /api/admin del mismo origen.
6. Redeploy Preview. Visitar `/cuenta` → Continuar con Google → seleccionar el Gmail aprobado → configurar autenticador → verificar MFA → `/admin`. Probar crear/editar/publicar una figura y comprobar el catálogo público. `/operaciones` permanece dependiente del rol y MFA.

No hay contraseña predeterminada ni bypass temporal de MFA. Si se muestra «pendiente de configuración», no existe login real todavía. Ver ACTIVACION-3.0.md para credenciales y operación. El acceso de Vercel para abrir una Preview protegida es una cuenta de hosting distinta del login de Grooty.

## Despliegue de esta entrega

Se prepara Preview en el proyecto existente del equipo verificado. Se configuran flags únicamente en la rama de revisión, sin variables de producción ni credenciales financieras. Autenticación, reservas DB y solicitudes registradas en DB se mantienen false hasta configurar servicios. Consultas WhatsApp y catálogo incluido permanecen disponibles.

APP_ORIGIN para esta Preview se utiliza como configuración del servidor; antes de activar OAuth deberá coincidir con el dominio estable exacto elegido y su callback Google. Una variable no crea la aplicación OAuth ni la DB.

La Preview sin backend conectado puede consultar metadata pública de servicios sin una clave privada: solo expone flags/country/currency, con presupuesto local. Las APIs privadas mantienen exigencia de clave de rate limiting y fallan cerrado. El intento de guardar automáticamente esa clave fue rechazado por revisión automática; no se guardó ningún secreto. El propietario configurará sus secretos directamente en Vercel antes de activar cuentas.
