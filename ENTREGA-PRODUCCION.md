# Entrega de Grooty Store

La tienda previa y el contacto +51 936 804 577 están conservados. El backend y administrador con Google están implementados; su activación depende de DB remota, OAuth y correos autorizados. CIERRE-PRODUCCION.md registra lo hecho y los pasos pendientes: no confundir código probado localmente con un servicio remoto habilitado.

## Al vender o transferir

Entregar repositorio GitHub y proyecto Vercel bajo cuentas del propietario, dominio/DNS, proyecto Google OAuth, PostgreSQL/Supabase y acceso a los archivos de imagen con sus derechos. Revisar servicios/costos con el cliente; no se adquirió ningún dominio. El enlace publicado por sí solo no transfiere el código ni la propiedad de las cuentas.

Compartir capacitación, alcance de mantenimiento y procedimiento de backup/restore. Los secretos se configuran privadamente: nunca se envían en el ZIP, GitHub, chat o frontend. Cada dueño accede con su Gmail autorizado y cuenta Google propia; no hay contraseña común ni predeterminada.

## Datos incluidos

schema.sql y admin.sql son migraciones. seed-catalog.sql importa el catálogo de 88 figuras, 6 marcas y 100 URLs en una base NUEVA vacía. No es dump de la base original; no incluye usuarios, sesiones existentes ni fotografías descargadas. catalog.json es copia pública del catálogo original. No sobrescribir una base en funcionamiento con el seed.

Para respaldar una DB real, exportar desde la cuenta autorizada del proveedor y ensayar restauración, incluyendo por separado archivos de imágenes y permisos. El backup de datos privados no debe publicarse ni anexarse a un repositorio.

## Publicación de la siguiente versión

Desplegar desde la raíz del repositorio, que contiene api/, backend/, frontend/ y vercel.json. Tras configurar las variables y ejecutar la lista de aceptación, promover el despliegue READY a Production. Mantener el despliegue anterior como rollback.

La dirección corta depende de disponibilidad y configuración de Vercel. Si se cambia el dominio, actualizar APP_ORIGIN y la callback Google exacta y volver a probar login/CSRF. No se sustituye automáticamente el proyecto original tienda-grooty por promover otro proyecto.

## Alcance actual

Catálogo, filtros, favoritos, selección y consultas WhatsApp; admin gestiona productos, stock, fotos por URL, marcas, destacados, contacto y tráiler. No hay pagos en línea, pedidos ni descuento automático de stock. Para activar, consultar backend/ACCESO-ADMIN.md. El administrador tiene demo local independiente y la gestión real queda desactivada por defecto hasta completar configuración y pruebas.
