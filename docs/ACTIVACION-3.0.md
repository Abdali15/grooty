# Instalación, acceso y activación

Esta guía sustituye instrucciones de acceso Google-only de entregas anteriores. Producción comercial permanece bloqueada por `activation-status.json` y por el backend.

## Instalación local

Node >=22. `npm ci`, `npm ci --prefix backend`, `npm ci --prefix frontend`. Copiar `backend/.env.example` a un archivo privado backend/.env. Para local: NODE_ENV=development, APP_ORIGIN=http://localhost:3000. Ejecutar backend `npm start --prefix backend`; frontend `npm run dev --prefix frontend`. Vite envía `/api` a loopback:3000. Ningún secreto va en VITE_.

Pruebas: `npm test --prefix backend`, `npm test --prefix frontend`, `npm run build --prefix frontend`, `npx playwright install chromium`, `node tests/e2e.mjs`. El último script prueba páginas locales con servicios desactivados; no sustituye checkout externo ni métricas de rendimiento. `node tests/release-gate.mjs` debe FALLAR hasta completar todas las evidencias pendientes.

## Migraciones

Backup completo y restauración en base separada primero. Conexión privilegiada solo local: DATABASE_ADMIN_URL. CONFIRM_DB_SETUP=true; `npm run migrate --prefix backend`. El migrador verifica esquema, usa advisory lock y transacción, registra checksum/version, no importa seed ni autoriza cuentas. Una base vacía exige INIT_EMPTY_DATABASE=true. El seed `supabase/seed-catalog.sql` solo puede ejecutarse después y exclusivamente en tablas vacías, con revisión separada. En rama antigua `productos`, se bloquea: hay que diseñar ETL revisado. No ejecutar scripts para vaciar o recrear producción.

El rol `grooty_app` es NOLOGIN inicialmente. Crear credencial de conexión privada con ese rol mediante operador DB, TLS verificado, pool cercano a Vercel. No usar postgres/service_role como runtime. DATABASE_ADMIN_URL nunca en Vercel runtime.

## Datos y secretos del propietario

| Configuración | Dónde / uso |
|---|---|
| APP_ORIGIN | Dominio exacto HTTPS estable por entorno |
| DATABASE_URL, DATABASE_CA_CERT si necesario | PostgreSQL aislado, runtime con rol limitado |
| GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET | App oficial Google; callback `/api/auth/google/callback` |
| MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET | App Entra compatible con cuentas personales; callback `/api/auth/microsoft/callback` |
| MICROSOFT_TENANT / MICROSOFT_ALLOWED_TENANTS | consumers por defecto; organizational tenants explícitos si autorizados |
| MFA_ENCRYPTION_KEY | 32 bytes aleatorios en Base64; secreto de servidor y copia protegida |
| MP_ACCESS_TOKEN / MP_WEBHOOK_SECRET / MP_COLLECTOR_ID | Exclusivamente comercio sandbox inicialmente; no credenciales productivas en Preview |
| CRON_SECRET | Autorización jobs internos, independiente de OAuth/pagos |
| RESEND_API_KEY / EMAIL_FROM | Preparados para adapter; worker y recibos pendientes, flag todavía bloqueado |
| Lista definitiva de propietarios | Correo + proveedor + identidad estable verificada + rol aprobado |
| Stock/precios/envío/RUC/devoluciones | Información comercial real y confirmación de política preventiva |

No enviar contraseñas, tokens privados ni claves aquí. Introducirlos directamente en gestores de secretos de cada servicio. Separar proyectos DB, proveedores de prueba, callbacks y variables Development/Preview/Production. Sin wildcard de callbacks.

## Entrar al administrador

1. Configurar un proveedor y probar callback sin permisos. El registro crea CUSTOMER; `/cuenta` recupera sesión HttpOnly.
2. El propietario inicia sesión con su identidad oficial. Revisar en DB el UUID/provider/issuer/sub/email verificado.
3. Solo después de aprobación explícita del dueño: operador privado usa `CONFIRM_OWNER_AUTHORIZATION=true`, DATABASE_ADMIN_URL y `npm run admin --prefix backend -- bootstrap-super-admin UUID`. Se bloquea si ya existe otro SUPER_ADMIN. No hay cuenta por defecto ni contraseña inventada. El candidato Lucho_8_3_03@outlook.com NO está autorizado.
4. Reingresar en `/cuenta`, configurar autenticador, confirmar código. Sin MFA no hay lectura de catálogo privado ni escritura administrativa.
5. `/admin` para catálogo. `/operaciones` para pedidos, cotizaciones y permisos. Solo SUPER_ADMIN con MFA y OAuth en últimos 5 minutos cambia autorizaciones; el afectado debe iniciar nueva sesión. Para reautenticar, cerrar sesión y entrar nuevamente con el proveedor y verificar MFA.

La demostración de catálogo conserva borradores locales y sigue identificada como demo. No publica ni representa métricas comerciales reales.

## Vercel y rollback

Proyecto Other, raíz repo, `vercel.json` instala backend/frontend y genera `frontend/dist`; `/api` llega a Function `api/index.js`. Configurar APP_ORIGIN del alias estable, región cercana a PostgreSQL, variables Preview aisladas; comenzar con flags false. Para catálogo vivo configurar `VITE_CATALOG_API=/api/store/catalog` en Preview y probar guardado → lectura pública. No reemplazar catálogo estático sin DB preparada.

No se ha promovido ni desplegado esta rama desde esta entrega. Crear Preview manual tras CI, pruebas DB y revisión de secretos. Verificar `/api/health`, `/api/auth/config`, login/cierre/revocación/MFA/RBAC, CRUD y checkout sandbox. Nunca promover mientras `release-gate.mjs` falle. Producción de pagos sigue bloqueada en código: retirarla exige nueva revisión e integración financiera completa, no solo introducir secretos.

Rollback: desactivar flags antes de restaurar despliegue aprobado; preservar DB/journals. No borrar migraciones/tablas ni restaurar backup sobre pedidos nuevos. La migración 003 es aditiva; para revertir código conservar datos y desactivar commerce. Exportar backup cifrado fuera del repo; comprobar restore y conteos/transacciones en staging antes de ventas. Monitorizar 5xx, callbacks, webhooks rechazados, pedidos pendientes/expirados, pagos tardíos y diferencias de conciliación. Configurar WAF/rate limiting de plataforma y alarmas, además del limitador DB existente.
