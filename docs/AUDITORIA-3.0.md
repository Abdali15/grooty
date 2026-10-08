# Grooty Store 3.0 — auditoría y estado verificable

Fecha: 2026-10-08. Estado: desarrollo aislado; no publicación comercial autorizada.

## Base examinada

La rama solicitada `redesign-supabase-preview` (cd304c03) contiene 15 archivos y un esquema `public.productos`: propuesta visual, catálogo/seed SQL, sin pedidos ni auth/pagos de producción. La última entrega `grooty-v4-review-20260929` (dce27a44) conserva el rediseño y 88 productos y usa `public.products`, con API Node, OAuth Google para propietarios, sesiones privadas, CSRF, revisiones y RLS. Se extendió esta última para conservar el trabajo. Son esquemas diferentes: el migrador rechaza explícitamente `public.productos`; no hay transformación automática ni escritura sobre una base existente.

## Hallazgos prioritarios

| Prioridad | Hallazgo inicial | Corrección / estado |
|---|---|---|
| P0 | No existía procesamiento de pedidos/cobros | Pedidos transaccionales, precios DB, reservas, journal y adaptador mock; pagos productivos bloqueados |
| P0 | Admin sin MFA; roles solo owner/admin | Nueva identidad independiente por proveedor, RBAC servidor y MFA TOTP cifrado; endpoints antiguos no montados |
| P0 | Stock desconocido en el catálogo | NULL rechaza compra online; stock no inventado; bloqueo de productos y comprobación de reservas |
| P0 | Sin verificación financiera real | Firma HMAC + consulta API MP + receptor/PEN/importe/referencia/live_mode; falta prueba con comercio sandbox real |
| P1 | Dependencia source-map-js vulnerable (alta) | Actualizada a versión corregida; ver evidencia audit JSON |
| P1 | Router interceptaba enlaces OAuth internos | `/api/` navega al servidor sin interceptación SPA |
| P1 | Registro social podía confundir correo con permisos | CUSTOMER por defecto; allowlist ACTIVE exige identidad estable; correo candidato no insertado |
| P1 | Sin recuperación MFA ni conciliación/reembolsos completos | Bloqueos explícitos antes de activación comercial |
| P2 | Panel comercial incompleto | UI pedidos/cotizaciones/permisos y catálogo existente; aún faltan envíos/comprobantes/variantes/CSV paginado |

## Decisiones

Conservar Vite/vanilla y API Node como Vercel Function mediante `api/index.js`; no Express persistente. PostgreSQL/Supabase conserva datos; las tablas comerciales privadas no son accesibles desde roles `anon`/`authenticated`. La API es el límite de autorización; `grooty_app` es un servicio confiable con permisos acotados, no una conexión para cada cliente. Las políticas privadas no pretenden sustituir RBAC de cada endpoint.

No se adoptó Supabase Auth automáticamente: su vinculación automática de identidades por email entra en conflicto con la exigencia de no unir cuentas por correo. Se extendió el flujo OIDC/PKCE existente con validación JOSE, firmas RS256, issuer/audience/expiración, nonce, estado de un solo uso y tenant Microsoft permitido. JOSE es una biblioteca estándar, no un SDK oficial de Google/Microsoft: esta desviación requiere revisión de identidad antes de activar. Microsoft exige `xms_edov` y email; `preferred_username` nunca acredita propiedad. El proveedor puede no emitir esas claims hasta configurar Entra; entonces el acceso falla cerrado.

## Riesgos y funcionalidad pendiente (no son solo credenciales)

1. Concurrencia multi-conexión PostgreSQL real todavía no verificada. PGlite verifica SQL/atomicidad, pero tiene una conexión y no prueba carreras entre procesos. El intento de instalar PostgreSQL local falló por restricciones de privilegios del entorno.
2. OAuth real Google y Microsoft, configuración de tenant/JWKS y callbacks pendientes. Pruebas JWT locales no prueban la configuración del proveedor.
3. Mercado Pago sandbox aún no ejecutado contra un comercio de pruebas. Producción y Culqi deliberadamente no activables.
4. Reembolsos parciales/completos, segunda transacción para el mismo pedido, conciliación periódica y pagos tardíos requieren completar recuperación operativa. Un pago tardío se rechaza para revisión, nunca roba stock a otro comprador.
5. MFA sin recuperación de emergencia ni rotación automática de cifrado; conservar clave y preparar procedimiento probado antes de uso real.
6. Notificaciones tienen contratos y plantillas, pero sin worker ni receipts de entrega verificados. EMAIL_NOTIFICATIONS_ENABLED=true falla cerrado.
7. Preventa tiene reserva, llegada y token restringido a propietario/7 días; falta entrega segura del enlace, recordatorios y UI completa de pago. Cotización registra importe; aceptación y conversión a pedido aún pendientes.
8. Envíos, costos/cobertura, comprobantes tributarios, política de devoluciones, retención/eliminación de datos, categorías/variantes y almacenamiento privado de documentos todavía pendientes.
9. ASVS 5.0 sirve de criterio; no hay certificación ni revisión completa de todos sus requisitos. ZAP/Semgrep/Gitleaks/Lighthouse/axe/k6 todavía no ejecutados. WAF y protección de bots no configurados en cuentas reales.
10. Versiones de acciones CI aún etiquetadas: fijar SHA revisado y habilitar protección de rama antes de confiar CI para publicación.

Consultar `activation-status.json`: gate comercial bloqueado. Esta entrega no debe anunciarse como ecommerce terminado o listo para cobrar.

Referencias primarias consultadas: https://supabase.com/docs/guides/auth/auth-identity-linking ; https://learn.microsoft.com/en-us/entra/identity-platform/id-token-claims-reference ; https://www.mercadopago.com.pe/developers/es/docs/checkout-pro-orders/resources/notifications/webhooks ; https://github.com/OWASP/ASVS/tree/v5.0.0 ; https://resend.com/docs/api-reference/emails/send-email .
