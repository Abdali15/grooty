# Entrar al panel de Grooty

## Acceso disponible en esta vista previa

Abre `/admin` y pulsa **Probar demostración**. No requiere correo ni contraseña. El inventario, el stock, las marcas, los destacados y el contenido se guardan como borradores en ese navegador. No se publican en el catálogo real.

No se han creado usuarios reales, no hay una base conectada y no existen contraseñas predeterminadas. Un formulario de login por sí solo no activa cuentas ni protege endpoints.

## Activar cuentas reales con tu backend

1. Conecta tu backend a PostgreSQL/Supabase y ejecuta el esquema revisado en `supabase/schema.sql`.
2. Crea una cuenta por propietario usando sus correos reales. Si usas Supabase Auth, las altas administrativas se realizan desde un proceso privado del servidor con `supabase.auth.admin.createUser`. Las claves secretas y las contraseñas no se escriben en el código del frontend ni en GitHub.
3. Asigna el rol `owner` en una fuente controlada por servidor, por ejemplo `app_metadata` administrado por Supabase, y valídalo en cada operación. No confíes en `user_metadata`, campos enviados por el navegador ni en que el usuario visite `/admin`.
4. Implementa `/api/admin/login`, `/session` y `/logout` según `README.md`. El login valida contraseña y rol, emite una sesión revocable y devuelve el token CSRF. Las escrituras comprueban sesión, permisos, Origin y CSRF.
5. Implementa los endpoints de productos, marcas y settings. Publica exclusivamente el catálogo autorizado y completa las cuentas de los dueños antes de entregarles sus accesos.
6. Entonces cada dueño entra en `/admin` con **su correo real y su contraseña privada**. Verifica creación, edición, archivado y actualización de stock contra la base; la demostración sigue separada.

Referencia oficial: https://supabase.com/docs/reference/javascript/auth-admin-createuser

## Actualizar WhatsApp y el tráiler

En el panel entra a **Contenido**. Puedes definir un número directo verificado, mostrar/ocultar la sección editorial, cambiar el título, el enlace de YouTube, su fuente oficial y el personaje que relaciona figuras.

Con número directo, las consultas abren `wa.me` con el texto. Sin número, se usa el grupo publicado en el código de la tienda original: se abre WhatsApp y el mensaje se copia para pegarlo. Un grupo no permite precargar un mensaje como un chat individual y la consulta es visible para sus miembros; Instagram ofrece la alternativa privada. No se inventó un número telefónico.

Los cambios de Contenido en modo demostración no se publican. Con el backend conectado, `/api/admin/settings` guarda la configuración y `/api/store/catalog` la entrega en `settings` al cargar la tienda.

## Completar las fichas

En **Inventario → Fichas por completar** encontrarás los productos sin stock confirmado, franquicia, personaje, descripción, accesorios, estado de caja o una segunda foto. El editor muestra qué queda pendiente mientras escribes. Es una recomendación de calidad, no una validación de autenticidad ni una obligación de inventar datos.

Deja el stock vacío si todavía no está confirmado; usa 0 solo para agotado. Las cantidades de Mi selección respetan el stock informado y tienen un tope técnico de 9 unidades por figura. Las consultas siguen requiriendo confirmación de la tienda.

Para homogeneizar las fotos, utiliza el producto y edición exactos, encuadre 4:5 y fondo neutro, con el objeto completo y centrado. Publica frontal, otra vista y detalles de accesorios/caja; las figuras Open necesitan fotos de su estado real. Las tarjetas ya normalizan el lienzo y mantienen las proporciones, pero no pueden igualar el tamaño de los objetos dentro de fotos con márgenes distintos.

En el editor, cada foto muestra una vista previa 4:5. Pulsa **Usar portada** en la fotografía frontal más adecuada y luego **Guardar cambios**. Esto reordena las URLs sin borrar ni alterar ninguna fotografía. En demostración solo cambia el borrador del navegador.

La ficha pública distingue información confirmada de datos por completar. El botón para pedir fotos prepara una consulta de la figura, accesorios y caja; para preventas también pregunta la llegada estimada. No envía mensajes ni confirma compras automáticamente.
