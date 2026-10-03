# Grooty Store: producción y entrega

## Estado de la tienda

Frontend con catálogo de 88 figuras, 6 marcas y 11 preventas; consultas y solicitudes por encargo abren el chat privado +51 936 804 577 con mensaje preparado. El cliente decide cuándo enviarlo. La selección no cobra, reserva stock ni procesa pagos.

La página conserva navegación responsive, formularios táctiles de 16 px, controles móviles, fotos 4:5, animaciones y preferencias de movimiento reducido. Conviene validar en Android/iPhone reales antes de anunciarla.

El administrador sigue siendo demostración local; sus cambios no se publican. No hay cuentas reales ni una base conectada en este rediseño.

## Publicación y dirección corta

La compilación genera previews automáticamente desde la rama grooty-v4-review-20260929. En Vercel selecciona el despliegue validado → Promote to Production. Mantén esta rama como Production Branch si deseas que las siguientes actualizaciones se publiquen allí.

Dirección propuesta: grooty-store.vercel.app, sujeta a disponibilidad y validación en Vercel. En Settings → Domains añade la dirección. Si Vercel no admite añadir ese subdominio, cambia el Project Name a grooty-store y comprueba el dominio asignado. Conserva el dominio anterior durante la transición. Un dominio propio requiere compra y configuración del dueño; no se ha comprado ninguno.

No publiques una dirección que requiera entrar con Vercel para los compradores. Verifica la URL en una sesión sin autenticar. Los previews pueden seguir protegidos.

## ¿Qué recibe quien compra la página?

1. Código y acceso al repositorio GitHub; define si es transferencia o licencia de uso.
2. Proyecto Vercel y dominio bajo una cuenta controlada por el nuevo dueño.
3. Catálogo, esquema, importación inicial, manual y contrato HTTP del backend.
4. Imágenes originales y acceso a su alojamiento: las URLs por sí solas no garantizan la conservación de las fotos.
5. Cuentas y servicios de base de datos, autenticación, ImageKit/Storage y costos operativos, si se conectan.
6. Alcance acordado: hoy es catálogo con consultas por WhatsApp. No incluye cobros en línea ni gestión real del inventario.

## Datos disponibles

- frontend/src/data/catalog.json: copia del catálogo público, no contiene usuarios ni información privada de la base original.
- supabase/schema.sql: estructura y políticas de lectura/escritura iniciales.
- supabase/seed-catalog.sql: importación generada de 88 productos, 6 marcas, fotos por URL y ajustes de portada/contacto; SOLO para una base nueva vacía. No sobrescribe datos existentes.
- supabase/scripts/generate-seed.mjs: regenera la importación desde el catálogo.

Ejecuta primero schema.sql y después seed-catalog.sql en una base nueva. No se han ejecutado estos archivos contra ninguna base remota. El esquema sirve tanto para PostgreSQL como para Supabase; pgAdmin es una herramienta de administración, no el motor de base de datos.

Un backup completo de una base conectada se exporta con acceso del propietario mediante pg_dump o Supabase CLI. Debe incluir lo necesario para restaurar y verificarse con una prueba de restauración. Los archivos de Storage/ImageKit necesitan copia aparte. No compartas backups con datos de clientes ni credenciales como archivos públicos.

## Activar el administrador más adelante

Recomendación: Supabase (PostgreSQL + Auth) para simplificar cuentas de propietarios. Cada dueño recibe su propia cuenta privada, creada con invitación desde un proceso seguro. Nunca uses una contraseña común incrustada en la página.

1. Crear proyecto y cargar schema.sql + seed-catalog.sql en una base vacía.
2. Implementar el contrato backend/README.md: login, session, logout, catálogo, productos, marcas y settings.
3. Crear cuentas privadas y asignar owner/admin desde el servidor; verificar rol en cada operación.
4. Usar cookies HttpOnly/Secure, sesiones revocables, CSRF, límites de intentos y revisión de edición concurrente. Mantener claves privadas solo en backend.
5. Servir /api en el mismo dominio; configurar VITE_CATALOG_API=/api/store/catalog y VITE_ADMIN_API_BASE=/api/admin y volver a compilar.
6. Probar que visitantes no pueden escribir, que el propietario sí guarda en la base y que los cambios aparecen al recargar el catálogo público.

El formulario real se habilita cuando el backend de sesión responde; la demo permanece separada. No se han creado contraseñas ni cuentas.

Referencias oficiales:
- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
- https://supabase.com/docs/reference/javascript/auth-admin-createuser
- https://vercel.com/docs/deployments/promoting-a-deployment
- https://vercel.com/docs/domains/working-with-domains/add-a-domain
