# Resultados ejecutados — 2026-10-08

No son resultados contra producción ni contra proveedores de cobro.

| Comprobación | Resultado real | Evidencia |
|---|---|---|
| Backend Node tests | 26/26 aprobadas | backend-tests.txt |
| Propiedades generadas | 4.384 entradas distintas: money 1.084, cart 1.100, RBAC 1.100, webhook 1.100 | Seeds 1001–1004 en properties.test.js; logs |
| Migración + catálogo PostgreSQL PGlite | Aplicada; preserva 88 productos; allowlist vacía | commerce.test.js |
| Idempotencia pago/stock | Evento duplicado consume una vez; importe falso rechazado | commerce.test.js |
| Autorización/MFA | CUSTOMER bloqueado, MFA requerido, replay código bloqueado | commerce.test.js |
| Identidad | Tokens firmados localmente; claims/expiración/nonce/tenant probados; email igual no une perfiles | commerce.test.js |
| Frontend búsqueda/seguridad | Aprobados | frontend-tests.txt |
| Build Vite | Aprobado; conserva 88 productos, 11 preventas y hash original | frontend-build.txt |
| npm audit frontend/backend | 0 vulnerabilidades conocidas después de corrección | frontend-audit.json, backend-audit.json |
| E2E Playwright navegador | BLOQUEADO: ejecutable ausente, descarga de Chromium no válida | Script tests/e2e.mjs preparado para CI; no existe resultado aprobado |
| Concurrencia conexiones PostgreSQL independientes | NO ejecutada; instalación sistema falló por privilegios | No extrapolar PGlite a concurrencia real |
| OAuth real / Mercado Pago sandbox | NO ejecutados, faltan configuración/credenciales aisladas | Flags desactivados y producción bloqueada |
| ZAP, Semgrep, Gitleaks, axe, Lighthouse, k6 | NO ejecutados | Pendientes para revisión completa |

El número de entradas generadas no incluye duplicados del generador ni aserciones múltiples ni repeticiones de tests. Son pruebas de propiedades, no 4.384 compras reales ni garantía de conformidad ASVS. Los 12 tests de regresión antiguos ejercitan legacy-app.js aislado; los nueve commerce tests y cinco de propiedades ejercitan la nueva base. El adaptador Vercel importa únicamente backend/app.js nuevo.

Publicación comercial BLOQUEADA. Los criterios de aceptación completos del prompt todavía no se cumplen. Ver activation-status.json, AUDITORIA-3.0.md y ACTIVACION-3.0.md para pendientes exactos. No basta introducir credenciales para retirar los bloqueos financieros.
