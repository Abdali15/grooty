# Seguridad y alcance verificado

## Aplicado al frontend

- CSP: JavaScript solo del propio origen, sin unsafe-inline ni unsafe-eval; atributos de eventos inline bloqueados. Sin object/embed ni base URL modificable. Iframes limitados al reproductor youtube-nocookie.
- frame-ancestors none + X-Frame-Options DENY contra incrustación/clickjacking.
- nosniff; formularios del mismo origen; permisos de cámara, micrófono, geolocalización, pago y USB desactivados.
- Texto de productos y búsquedas escapado antes de renderizar HTML. Consultas por encargo aceptan referencias HTTPS sin usuario/contraseña y validan presupuesto y longitudes.
- Catálogo remoto valida IDs únicos, precio, stock entero, modalidades, URLs y límites de texto. Productos archivados/no publicados no se muestran.
- Cliente admin limita la API al mismo origen, requiere estructura de sesión owner/admin y token CSRF antes de aceptar una sesión; esto NO sustituye la autorización del servidor.
- /admin noindex y no-store. Demo local sin cuentas, sin publicación y sin acceso a una base real.
- Ventanas WhatsApp con noopener y mensajes codificados. La consulta no envía automáticamente un mensaje.
- Animaciones GSAP mantienen estilos inline; solo style-src permite unsafe-inline. Las fotos permiten HTTPS para conservar compatibilidad con alojamientos externos; no se permite JavaScript externo.

## Backend pendiente: requisitos para activar propietarios

| Riesgo | Control necesario en servidor |
|---|---|
| Inyección SQL | Consultas parametrizadas, permisos mínimos y validación de tipo/rango. Nunca concatenar filtros recibidos. |
| IDOR / escalada de privilegios | Autorizar owner/admin en cada endpoint, independientemente de botones o ruta. Verificar objeto/operación. |
| CSRF | Cookie SameSite, Origin permitido y token CSRF en todas las escrituras; rechazo antes de tocar datos. |
| Robo de sesión | Cookies HttpOnly/Secure, expiración, rotación al autenticar y revocación al salir. No guardar tokens privados en localStorage. |
| Fuerza bruta | Rate limit por cuenta y origen/IP, errores genéricos, alertas y MFA de propietarios cuando esté configurado. |
| XSS almacenado | Texto plano, escape contextual y URLs validadas también en servidor. No confiar en validación frontend. |
| SSRF / carga de archivos | No descargar URLs arbitrarias del cliente; lista de proveedores si se requiere importación. Validar MIME real, tamaño, extensión y nombre de archivos. |
| Sobrescritura concurrente | Revision/optimistic locking en SQL; 409 si otra edición ganó. |
| Manipulación comercial | Recalcular precio/reserva/stock desde la base. Mi selección es consulta, no reserva de inventario. |
| Abuso / payload excesivo | Límites de cuerpo, timeout, validación por esquema, límites de paginación y rate limit de APIs. |
| Fuga de secretos | Conexión DB/clave service_role solo en backend. No VITE_ secretos. Errores sin stack, logs sin contraseña/token. |
| Fallo operativo | Backup probado + copia de imágenes; logs y alertas. Revisar vulnerabilidades de dependencias periódicamente. |

No se afirma inmunidad a ataques ni se ha realizado un pentest. No hay servidor de inventario real donde verificar estos controles aún. HTTPS lo proporciona Vercel para dominios configurados; los ataques volumétricos requieren controles de plataforma y monitoreo.

## Validación

npm test --prefix frontend: búsqueda y tests de escape XSS, URLs hostiles, catálogos inválidos, stock, duplicados, visibilidad, estructura de sesión y cabeceras.
npm run build --prefix frontend: compilación y validación del catálogo.

Importación SQL: script generado, no ejecutado contra una base remota. Probar restauración/importación en un proyecto vacío antes de usarlo como inventario real.

Referencias:
https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html
https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html
https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html

## Dependencias

Swiper se actualizó y fijó en 12.1.2 para corregir GHSA-hmx5-qpq5-p643. `npm audit --json` del 3 de octubre de 2026: 0 vulnerabilidades reportadas (incluye herramientas de desarrollo). Esto es el resultado del registro en ese momento, no una garantía de ausencia de fallos.
