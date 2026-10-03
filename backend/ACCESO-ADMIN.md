# Acceso real de propietarios con Google

Estado: código preparado y probado, acceso cerrado hasta configurar proveedor, DB y cuentas.

1. Elegir el dominio de producción y dejarlo estable antes de configurar OAuth.
2. Crear un proyecto Google Cloud del propietario. Configurar OAuth consent, usuario externo, scopes openid/email; si está en Testing, añadir los Gmail autorizados como test users. Revisar los requisitos de publicación antes de usarlo con clientes.
3. Crear OAuth Client ID de tipo Web application. URI de redirección EXACTA: `https://TU-DOMINIO/api/auth/google/callback`. Guardar Client ID/Secret exclusivamente en variables de servidor de Vercel.
4. Crear PostgreSQL/Supabase del propietario y aplicar schema.sql, admin.sql y seed-catalog.sql (este último solo si nueva/vacía). Usar conexión pooler preparada para serverless con TLS verificable.
5. Habilitar privadamente LOGIN y contraseña de `grooty_app`. Guardar su conexión como DATABASE_URL. La conexión administrativa para migraciones/permisos se conserva fuera del runtime público.
6. En el equipo privado, usando DATABASE_ADMIN_URL con permisos administrativos, ejecutar `npm run admin -- grant CORREO_REAL@gmail.com owner` desde backend para cada dueño; `admin` para gestores. No se publica esa lista en frontend ni se autorizó ninguna cuenta durante esta preparación.
7. Variables servidor: APP_ORIGIN=https://TU-DOMINIO, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, DATABASE_URL, opcional DATABASE_CA_CERT y ADMIN_ENABLED=true. Variable frontend pública: VITE_CATALOG_API=/api/store/catalog. VITE_ADMIN_API_BASE=/api/admin es opcional.
8. Redesplegar desde la raíz. Entrar a `/admin` → Continuar con Google → elegir cuenta autorizada. No existe contraseña específica de Grooty.
9. Verificar visitante, Gmail no autorizado y cuenta autorizada; modificar producto de prueba, comprobar DB y tienda pública, restaurarlo y cerrar sesión. Después revocar una cuenta y comprobar que una sesión abierta ya no accede.

## Retirar un acceso

`npm run admin -- revoke CORREO_REAL@gmail.com` desactiva la cuenta y elimina sus sesiones. Mantiene el identificador Google vinculado: reactivar no reasigna la cuenta a otra identidad. No hay botón de otorgar roles a visitantes ni credenciales predeterminadas.

## Cuidado con credenciales

Nunca pegar contraseñas, GOOGLE_CLIENT_SECRET ni DATABASE_URL en chat, GitHub o variables VITE_. Deben configurarse privadamente. La lista de correos por sí sola no activa OAuth: también faltan conexión, proveedor y prueba real. Usar MFA en Google/Vercel/Supabase/GitHub del dueño; la aplicación no obliga por sí sola a que Google tenga MFA.

## Local

APP_ORIGIN debe ser el origen del frontend Vite (por ejemplo http://localhost:5173); backend loopback 3000. Registrar también la callback local exacta en Google durante desarrollo. Nunca usar HTTP para producción ni bajar validación TLS para solventar errores.
