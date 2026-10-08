# Registro de fases — alcance y pendientes

| Fase | Archivos / cambios | Verificación | Siguiente paso |
|---|---|---|---|
| A/B | AUDITORIA-3.0.md; comparación de ramas/esquemas; conserva frontend V4 | Seed/catalogo 88/6/11; auditorías npm | Revisión completa ASVS y amenazas operativas |
| C | database/003_commerce.sql; migrate.js con checksum/lock/transacción | Migración SQL PGlite y restricciones/RLS | Aplicar en DB staging con backup/restore |
| D | identity.js, mfa.js, policy.js, config.js, admin.js | JWT firmados localmente, OAuth estado, no unión email, RBAC/MFA/anti-replay | OAuth real, recovery MFA y revisión implementación JOSE |
| E | API catálogo existente + movements; account/operations UI | CRUD/revisiones pruebas previas; RBAC nueva API | Variantes, categorías, CSV, paginación, comprobantes/envíos |
| F | orders.js, requests.js y tablas privadas | NULL/stock0/ocultos, idempotencia, consumo único, expiración | Concurrencia PostgreSQL, conversión quotes y UI/entrega de preventas |
| G | payments/gateway.js (mock, MP sandbox); firma/reconsulta | HMAC + manipulaciones generadas; mock nunca confirma dinero | Comercio sandbox real, refunds, conciliación, Culqi |
| H | account.js, checkout.js, operations.js, commerce.css, router/header/drawer | Build y pruebas frontend; E2E según archivo resultados | Accesibilidad, imágenes reales, rendimiento, móviles físicos |
| I | commerce.test.js, properties.test.js, e2e.mjs; quality.yml | Resultados en backend-tests/frontend-tests/audit JSON | Integración externa, k6/ZAP/Semgrep/Gitleaks/axe/Lighthouse |
| J | API/ACTIVACION/FASES/AUDITORIA; gate comercial false | Instalación y artefacto de revisión | No promover hasta cerrar bloqueos exactos |

No se ejecutaron migraciones en una base del propietario, no se creó un administrador real, no se cobró dinero ni se publicó producción. Las pruebas usan identidades/credenciales artificiales únicamente en fixtures locales; no son cuentas para entregar.

Refuerzo adicional: backend/database/004_admin_approvals.sql, scripts/approve-admins.js, commerce/ingress.js y tests/hardening.test.js. Aprobaciones privadas preparadas sin tocar la base real; protección API ampliada; documentación Perú/Yape en REFUERZO-PERU-3.0.md.
