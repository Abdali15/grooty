# Resultados ejecutados — 2026-10-08

No son resultados contra producción ni contra proveedores de cobro.

| Comprobación | Resultado real | Evidencia |
|---|---|---|
| Backend Node tests | 41/41 aprobadas | backend-tests.txt |
| Propiedades generadas | 5.584 entradas distintas: money 1.084, cart 1.100, RBAC 1.100, webhook 1.100, ingress 1.200 | Seeds 1001–1004 y 2001 en properties.test.js / hardening.test.js; logs |
| Migración + catálogo PostgreSQL PGlite | Aplicada; preserva 88 productos; allowlist vacía | commerce.test.js |
| Idempotencia pago/stock | Evento duplicado consume una vez; importe falso rechazado | commerce.test.js |
| Autorización/MFA | CUSTOMER bloqueado, MFA requerido, replay código bloqueado | commerce.test.js |
| Identidad | Tokens firmados localmente; claims/expiración/nonce/tenant probados; email igual no une perfiles | commerce.test.js |
| Frontend búsqueda/seguridad + cliente HTTP | Búsqueda/seguridad y 3 tests de timeout/cancelación/CSRF | frontend-tests.txt |
| Paquete RC1 | Aprobado: 124 artefactos públicos, defaults desactivados y configuración requerida | package-check.txt |
| Bloqueo comercial | FALLA correctamente por evidencias pendientes; publicación bloqueada | commercial-gate.txt |
| Build Vite | Aprobado; conserva 88 productos, 11 preventas y hash original | frontend-build.txt |
| npm audit frontend/backend | 0 vulnerabilidades conocidas después de corrección | frontend-audit.json, backend-audit.json |
| E2E Playwright navegador | BLOQUEADO: ejecutable ausente, descarga de Chromium no válida | Script tests/e2e.mjs preparado para CI; no existe resultado aprobado |
| Concurrencia conexiones PostgreSQL independientes | NO ejecutada; instalación sistema falló por privilegios | No extrapolar PGlite a concurrencia real |
| OAuth real / Mercado Pago sandbox | NO ejecutados, faltan configuración/credenciales aisladas | Flags desactivados y producción bloqueada |
| ZAP, Semgrep, Gitleaks, axe, Lighthouse, k6 | NO ejecutados | Pendientes para revisión completa |

El número de entradas generadas no incluye duplicados del generador ni aserciones múltiples ni repeticiones de tests. Son pruebas de propiedades, no 5.584 compras reales ni garantía de conformidad ASVS. Los 12 tests de regresión antiguos ejercitan legacy-app.js aislado; los nueve commerce tests, nueve hardening tests seis de payment-adapter y cinco de propiedades ejercitan la nueva base. El adaptador Vercel importa únicamente backend/app.js nuevo.

Publicación comercial BLOQUEADA. Los criterios de aceptación completos del prompt todavía no se cumplen. Ver activation-status.json, AUDITORIA-3.0.md y ACTIVACION-3.0.md para pendientes exactos. No basta introducir credenciales para retirar los bloqueos financieros.

Refuerzo posterior: migración 004 probada; aprobación privada, rechazo de proveedor incorrecto, autorizaciones revocadas/expiradas, flooding de API, JSON excesivamente complejo, cookies ambiguas y combinaciones de pago incorrectas. Vercel consultado con valores ocultos: sin variables de entorno del backend configuradas. WAF activo no pudo leerse (404); no se activaron reglas ni se realizó despliegue.

Referencia Culqi: documentación oficial contrastada, sin reproducir el video ni probar una cuenta externa. Seis tests adicionales de contrato del adaptador actual: sandbox, importe/PEN, comercio, reembolso, estados incompletos, fecha, URLs, redirecciones, errores y bloqueo Culqi/mock. Ver VALIDACION-CULQI-3.0.md. Culqi no está integrado ni activado.

Cierre RC1: no-store/noindex en cuenta/checkout/operaciones y HSTS. npm run verify incorpora control del build público y defaults seguros. Browser headless-shell también falló por ZIP incompleto; no se declara E2E aprobado. Ver VERSION-3.0-RC1.md.
