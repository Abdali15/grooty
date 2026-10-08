# Refuerzo de acceso, Perú y protección de solicitudes — 2026-10-08

## Estado verificable

El propietario confirmó dos cuentas, una Microsoft y una Google, para rol ADMIN. Su archivo `backend/private/owner-approvals.json` queda fuera de git, del build y del ZIP público. No se concedió SUPER_ADMIN. No hay contraseña propia: ingreso social con identidad verificada y MFA obligatorio. No se aplicó ninguna autorización sobre una DB real: el proyecto Vercel consultado no tiene variables backend configuradas. No se desplegó ni se modificó producción.

La migración 004 permite aprobar previamente una identidad pendiente durante 30 días desde la importación. Solo un correo verificado por el proveedor correcto se vincula a su identificador estable al finalizar OAuth. El navegador no puede enviar roles ni activar autorizaciones. No reactiva permisos revocados, vencidos ni autorizaciones existentes. Las pruebas usan correos ficticios de dominio example.test, nunca cuentas del dueño.

## Aplicación de las aprobaciones privadas

1. Preparar staging y restauración de backup. Ejecutar migraciones 003 y 004 mediante el migrador, sin volver a ejecutar esquemas de base vacía sobre la tienda existente.
2. Descargar el archivo privado entregado por separado y colocarlo en `backend/private/owner-approvals.json`; verificar proveedor y rol. Nunca ponerlo en `frontend/public` ni en GitHub.
3. En una terminal privada, desde backend, usar DATABASE_ADMIN_URL con conexión privilegiada y CONFIRM_OWNER_AUTHORIZATION=true; ejecutar:

```bash
node --env-file-if-exists=.env scripts/approve-admins.js private/owner-approvals.json
```

La CLI usa una transacción y registra auditoría. No requiere que los usuarios hayan iniciado sesión antes. Un registro previo/revocado bloquea la importación para que no se cambien permisos silenciosamente. La aprobación caduca si no se vincula en 30 días.

4. Configurar aplicaciones oficiales Google/Microsoft, callbacks exactos y MFA_ENCRYPTION_KEY privada. Configurar Microsoft para cuentas personales; la validación exige email verificado confiable, no solo preferred_username.
5. Cada persona entra por `/cuenta`, con su proveedor, y configura su autenticador. Luego ingresa a `/admin` (catálogo) o `/operaciones` (pedidos). Hasta verificar MFA no hay operaciones privadas. Una identidad Microsoft y una Google con igual correo no se fusionan.
6. La gestión de permisos futura requiere un SUPER_ADMIN explícitamente autorizado y vinculado mediante la CLI ya documentada. El rol ADMIN solicitado aquí no concede esa capacidad.

## Pagos peruanos

Moneda autoritativa PEN, importes en céntimos calculados por servidor. Mercado Pago Checkout Pro se conserva como primera pasarela: el proveedor documenta Yape junto a tarjetas y cuenta Mercado Pago en Perú. El medio concreto se selecciona dentro del checkout alojado; su disponibilidad debe comprobarse en la cuenta del comercio. No se añadió scraping de Yape, API no oficial, lectura de SMS, QR con confirmación automática ni aprobación mediante capturas. WhatsApp queda para atención comercial.

No se implementa un formulario propio que recoja OTP de Yape ni datos de tarjetas. El servidor crea la preferencia, consulta el pago oficial, verifica receptor, PEN, referencia, importe y entorno y procesa el journal idempotente. Redirecciones y mensajes del navegador no aprueban un pago. Se rechazan configuraciones proveedor/entorno incompatibles. `PAYMENTS_ENABLED=false` por defecto; mock no cobra ni declara pagos exitosos. Producción financiera sigue bloqueada hasta completar reembolsos, conciliación y pruebas externas reales.

Crear una cuenta e integrar el API no significa cobros gratis. Mercado Pago indica comisiones sobre cobros acreditados; tarifas y habilitación Yape dependen del comercio. No se puede prometer infraestructura, WAF ni transacciones productivas sin coste. El sandbox se usa sin dinero real.

Fuentes oficiales consultadas:
- https://www.mercadopago.com.pe/developers/es/docs/checkout-pro-preferences/overview
- https://www.mercadopago.com.pe/herramientas-para-vender/check-out
- https://www.yape.com.pe/preguntas-frecuentes/compras-por-internet/como-puedo-tener-la-opcion-de-compras-por-internet-codigo-de-aprobacion-yape-en-l

## Límites de aplicación implementados

| Control | Límite inicial |
|---|---|
| Rutas/métodos | Lista cerrada; inválidos se rechazan antes de DB |
| URL/query | 8192 caracteres; 16 parámetros, sin nombres duplicados |
| JSON | 64 KiB; 16 niveles; 2048 nodos; claves peligrosas rechazadas |
| Cookies | 8192 caracteres; nombres duplicados rechazados |
| Admisión local | 40 solicitudes simultáneas por instancia; 60/5s por cliente; mapa máximo 1000 clientes |
| Presupuesto global DB | 3000/minuto |
| Cliente OAuth | 30/10 minutos |
| Cliente MFA | 20/5 minutos, además del límite de verificación 8/5 minutos |
| Crear pedido/checkout | 20/minuto por cliente |
| API general | 180/minuto por cliente; además del límite por identidad |
| Pool DB | 3 conexiones por proceso; statement timeout 8s, lock timeout 3s, transacción inactiva 10s |

Son ventanas fijas y valores iniciales para medir en staging; no equivalen a garantía de capacidad ni prevención total de DDoS. Se devuelve 429 con Retry-After. El servicio limita cardinalidad/recursos y elimina entradas DB expiradas en el trabajo de mantenimiento. Preparar un scheduler autenticado antes de activación.

En Vercel se utiliza `x-vercel-forwarded-for` solo cuando el entorno **del servidor** indica VERCEL=1; en local se utiliza la conexión socket y se ignoran headers arbitrarios. Verificar esta frontera en el despliegue real, especialmente si existe proxy externo. RATE_LIMIT_KEY_SECRET, de al menos 32 caracteres y solo servidor, calcula buckets HMAC sin guardar la IP en claro; falta de clave en producción falla cerrado. No ponerlo en VITE_.

El limitador DB funciona entre procesos; el de memoria solo reduce trabajo en cada instancia. Ataques con múltiples IP y rechazo después de invocar una Function aún consumen recursos. Un presupuesto global puede degradar la disponibilidad para compradores legítimos: monitorear y ajustar, además de WAF.

## Protección de plataforma pendiente

No se obtuvo una configuración activa del firewall del proyecto (consulta 404), por lo que no se declara WAF configurado. Aplicar la guía Vercel Firewall: reglas en borrador y modo Log primero; observar y probar navegación, móvil, login y pagos antes de publicar. Preparar límites por IP/ruta para OAuth start, checkout y API general. Nunca colocar desafíos interactivos en callbacks OAuth ni webhooks de pago: romperían entregas servidor a servidor. Los webhooks mantienen firma y reconsulta obligatorias; no tienen un bypass de autorización.

Activar alertas de errores 429/503, saturación DB, rechazos de firmas y fallos OAuth. Confirmar plan/precio de WAF y protección bots. No se ejecutó carga ni ataques contra producción o proveedores.

## Pruebas y pendientes

Ver RESULTADOS-3.0.md y backend-tests.txt: pruebas de permisos, expiración, proveedor incorrecto, límite compartido, spoofing de headers, burst/concurrencia local, complejidad JSON, cookies ambiguas y entorno de pago. Migraciones probadas en PGlite; faltan concurrencia PostgreSQL real, login cloud de ambas cuentas, navegador E2E, WAF, backup/restore y sandbox del comercio. Estos pendientes bloquean la venta comercial, aunque el código y los controles locales hayan pasado.
