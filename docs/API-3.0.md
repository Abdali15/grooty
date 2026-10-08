# API implementada

JSON UTF-8; cookies HttpOnly y `credentials: same-origin`. Las escrituras de sesión requieren Origin exacto, X-CSRF-Token de `/api/account/session` y Content-Type application/json. Límite 64 KiB. No aceptar bearer tokens del navegador como rol. Respuestas de error genéricas para fallos internos. Webhook usa firma oficial; job usa CRON_SECRET.

| Método / ruta | Función | Control |
|---|---|---|
| GET /api/health | Liveness versión | No verifica DB |
| GET /api/store/catalog | Productos/configuración publicados | Consulta DB, excluye archivados |
| GET /api/auth/config | Flags públicos, sin secretos | APP_ORIGIN/config válida |
| GET /api/auth/google/start, callback | Authorization code + PKCE | Flag, estado/nonce, cookies, firma/verificación email |
| GET /api/auth/microsoft/start, callback | OIDC Microsoft | Flag, tenant permitido, xms_edov, issuer, firma |
| GET /api/account/session | Sesión, rol efectivo y CSRF | Cookie hash + expiración y DB |
| POST /api/account/logout | Revocar sesión actual | CSRF |
| POST /api/account/revoke-sessions | Revocar sesiones de esta identidad | CSRF |
| PUT /api/account/profile | displayName | Sin role/user_metadata |
| POST /api/account/deletion-request | Solicitud + cierre de sesiones | Sesión/CSRF; ejecución legal manual |
| POST /api/account/mfa/enroll | Secreto/URI TOTP para configuración | Admin aprobado y reauth reciente |
| POST /api/account/mfa/verify | Verificación code | Cifrado AES-GCM; contador anti-replay; rate limit |
| GET /api/account/orders | Historial (hasta 50) | profile_id de sesión |
| GET /api/orders/:uuid | Estado real + líneas | profile_id dueño; no query parameter de pago |
| POST /api/orders | Crear pedido | Flags, items [{productId,quantity}], address, idempotencyKey |
| POST /api/orders/:uuid/checkout | URL sandbox o mock sin URL | Propietario + pedido vigente |
| POST /api/payments/mercadopago/webhook | Consulta proveedor + journal/stock | HMAC, frescura, receptor, moneda, importe, entorno y referencia |
| POST /api/jobs/expire | Liberar hasta 100 pedidos vencidos | CRON_SECRET; no cron configurado automáticamente |
| GET /api/account/requests, preorders | Solicitudes/reservas propias | Sesión |
| POST /api/requests | Registrar solicitud | Flag, esquema estricto, rate limit; referencia no se descarga |
| POST /api/preorders | Reserva sin cobro | Flag, producto real preventa, evita reserva activa duplicada |
| POST /api/preorders/:uuid/order | Pedido al llegar | Perfil dueño + token hash + plazo servidor; flags; stock real |
| GET /api/admin/session, catalog | Catálogo privado | catalog.read y MFA |
| POST /api/admin/products | Alta figura real | catalog.write y MFA |
| PUT /api/admin/products/:id | Editar con revisión | catalog.write y MFA; imágenes transaccionales |
| PATCH /api/admin/products/:id | Archivar/restaurar | catalog.write y MFA + revisión |
| POST /api/admin/brands | Alta marca | catalog.write y MFA |
| PUT /api/admin/settings | Contacto/hero/tráiler | catalog.write y MFA + settingsRevision |
| GET /api/admin/orders | Hasta 100 pedidos | orders.read y MFA |
| PATCH /api/admin/orders/:uuid | PROCESSING/SHIPPED/DELIVERED | orders.fulfill y MFA; estado anterior bloqueado |
| GET /api/admin/dashboard | Cobrado/pendiente/fallos de pedidos | dashboard.read y MFA; no métricas ficticias |
| GET /api/admin/requests | Solicitudes recientes | requests.manage y MFA |
| POST /api/admin/requests/:uuid/quote | quoteCents, vence 7 días | requests.manage y MFA |
| POST /api/admin/preorders/:uuid/available | Llegada y token | orders.fulfill y MFA; falta entrega automática |
| GET /api/admin/identities | Identidades verificadas (100) | SUPER_ADMIN, MFA y reauth reciente |
| POST /api/admin/authorizations | identityId, role, status | SUPER_ADMIN, MFA/reauth; función SQL protegida, revocación sesiones, auditoría |

Consulta API usa 180 solicitudes/minuto por identidad; OAuth global 120/10 min y MFA 8 intentos/5 min. No es sustituto del WAF ante DoS sin sesión. Endpoints de exportación CSV, paginación comercial completa, aceptación de cotizaciones, refunds, reconciliación, subidas binarias y comprobantes NO se entregan como existentes.
