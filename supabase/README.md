# Supabase

La tienda incluida en este ZIP funciona sin Supabase y usa el catálogo JSON actual.

Cuando quieras pasar a base de datos:

1. Crea un proyecto en Supabase.
2. Ejecuta `schema.sql` desde SQL Editor.
3. Crea usuarios de administración separados para Danfer y Luis mediante Supabase Auth.
4. No publiques `service_role` ni otras claves privadas en el frontend.
5. Guarda originales en Supabase Storage y usa ImageKit para entrega/transformación.
6. Sustituye gradualmente `src/data/catalog.json` por consultas públicas a Supabase.

El panel administrativo no se publica todavía porque primero debe quedar protegido con Auth y RLS.
