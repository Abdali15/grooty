# Grooty Store 3.0.0-rc.1 — entrega para pruebas

Estado: versión candidata de frontend/backend/SQL/documentación. No equivale a certificación comercial ni cuenta con credenciales externas activadas. Preserva catálogo, marca, diseño y animaciones de la versión anterior; no reescribe el frontend.

## Empezar

Desde la raíz, con Node >=22:

```bash
npm ci
npm ci --prefix backend
npm ci --prefix frontend
npm run verify
```

`verify` ejecuta backend, frontend, build y control del paquete público. No ejecuta pagos reales, migraciones ni despliegues. El control detecta patrones comunes de secretos en dist y comprueba flags/configuración, pero no sustituye un escáner completo ni revisión de historial.

Con Chromium instalado:

```bash
npx playwright install chromium
npm run test:e2e
```

Para el bloqueo comercial:

```bash
npm run check:commercial
```

Debe fallar mientras no existan las evidencias de activation-status.json. No modificar valores a true solo para conseguir un resultado verde.

## Navegar localmente

Copiar backend/.env.example a backend/.env privado. Configurar NODE_ENV=development y APP_ORIGIN=http://localhost:3000. Mantener todos los flags de integración false. En una terminal ejecutar `npm start --prefix backend`; en otra `npm run dev --prefix frontend`. Abrir la URL que muestra Vite. La tienda funciona con el catálogo incluido; las pantallas de cuenta y checkout explican que sus servicios están pendientes. No muestran pedidos, métricas ni pagos ficticios.

## Incluido

- Frontend premium, responsive y catálogo original de 88 figuras / 11 preventas.
- Cliente HTTP con cancelación al abandonar la vista y plazo de 10s aunque se pase AbortSignal.
- Panel de catálogo demo identificado; modo servidor preparado con RBAC/MFA y APIs reales.
- Identidad Google/Microsoft, sesiones, permisos, MFA y perfil probados localmente con identidades de prueba.
- Órdenes, reservas, stock transaccional y pasarela mock/Mercado Pago sandbox con pruebas controladas.
- Migraciones 003/004 versionadas y aprobaciones privadas de las dos cuentas solicitadas; no aplicadas a DB real.
- Headers HSTS, CSP, no-store/noindex en cuenta, checkout y operaciones; controles API y límites de solicitudes.
- Comandos reproducibles, documentación de instalación, rollback y pruebas.

## No activado / pendiente

- Base PostgreSQL de staging/producción, callbacks OAuth reales y cuentas administradoras activas.
- Recuperación MFA, backup/restore y concurrencia con conexiones independientes PostgreSQL.
- Culqi: sigue previsto, sin adaptador implementado. Ver VALIDACION-CULQI-3.0.md.
- Pagos productivos, reembolsos/conciliación, condiciones tributarias/envíos y notificaciones comerciales completas.
- Verificación visual E2E: instalación Chromium falló también con headless-shell reducido; CI preparada, resultado aprobado ausente.
- WAF/bots/monitoreo y auditoría externa de seguridad/accesibilidad.

El propietario debe introducir credenciales en los servicios correspondientes, nunca en chat, GitHub ni frontend. La activación requiere completar módulos pendientes y pruebas, no solo poner variables.

## Publicar una Preview

Usar la raíz del repositorio y su vercel.json, entorno Preview aislado, flags false, APP_ORIGIN HTTPS del alias estable y RATE_LIMIT_KEY_SECRET privado de al menos 32 caracteres. Sin catálogo DB listo, no establecer VITE_CATALOG_API ni VITE_ADMIN_API_BASE. `/api/health` debe responder 200; `/api/auth/config` debe indicar los servicios desactivados. Las rutas privadas permanecen sin acceso real.

No se publicó ni se promovió esta candidata por esta entrega. La publicación comercial sigue bloqueada. Las migraciones requieren operador, backup y pruebas en base separada; nunca ejecutarlas por el mero hecho de desplegar frontend.

La aprobación de correos se entrega aparte, en archivo privado excluido del paquete y repositorio. ADMIN no concede SUPER_ADMIN ni gestión de roles críticos.
