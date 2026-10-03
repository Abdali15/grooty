# Base de datos de Grooty

La tienda pública usa el catálogo JSON y el administrador es una demostración local. No hay una base nueva ni usuarios creados automáticamente.

Para una base NUEVA: ejecuta schema.sql y luego seed-catalog.sql. El seed contiene 88 productos, 6 marcas, URLs de fotos y contacto; rechaza una base con datos para evitar sobrescrituras. No es un backup de la base original.

Regenerar: node supabase/scripts/generate-seed.mjs.

Para cuentas y gestión real implementa backend/README.md y backend/ACCESO-ADMIN.md. Usa PostgreSQL/Supabase, cuentas privadas y permisos verificados en servidor. Nunca publiques service_role ni credenciales en VITE_*.

La entrega comercial, el respaldo completo de una base real y la migración de fotos se explican en ENTREGA-PRODUCCION.md.
