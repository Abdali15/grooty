# Base de datos para tu backend

La tienda de referencia YA utiliza Supabase. Se verificaron 88 productos públicos el 24/09/2026. No se ha modificado esa base, creado otra instancia ni comprobado sus políticas privadas.

Esta carpeta entrega SQL y el contrato para el backend que desarrollarás; no incluye un servidor nuevo.

## Nuevo proyecto Supabase
1. Crea un proyecto desde tu cuenta de Supabase (elige región y plan según tus necesidades).
2. En SQL Editor ejecuta `database/001_schema.sql`, solo en una base nueva.
3. Ejecuta `database/002_catalog_seed.sql`. Importa los 88 productos y sus URLs originales; el stock queda NULL porque el catálogo público no proporciona cantidades.
4. Comprueba con una clave pública que solo puedas leer productos publicados y sus imágenes. Comprueba que insertar, editar y borrar sean rechazados para visitantes y usuarios no administradores.
5. Conserva DATABASE_URL y SUPABASE_SERVICE_ROLE_KEY exclusivamente en variables del servidor. Nunca en frontend ni GitHub.

Si reutilizas la base existente, compara su esquema primero. NO ejecutes estas migraciones a ciegas: la tabla productos ya existe en ella.

## Contrato recomendado
GET /api/catalog -> arreglo con id, sku, marca, titulo, estado, precio (número), precio_reserva (número o null), tipo (venta/preventa), imagenes_producto:[{url,posicion}]. Solo publicado=true y archivado=false.

El frontend de propuesta lee frontend/public/catalog.json. Para integrarlo, cambia esa URL en la función load() de app.js por /api/catalog y configura un proxy de mismo origen en Vercel hacia tu backend.

POST /api/quotes -> recibe [{id,quantity}], vuelve a consultar precios y stock en PostgreSQL y calcula importes en centavos. Nunca confíes en totales del navegador. No descuenta stock ni registra una venta hasta definir el proceso comercial.

Las rutas de administración deben validar sesión y rol en el servidor. Si usas Supabase Auth, valida el JWT y consulta una tabla privada de administradores; no aceptes un rol enviado por el navegador ni guardado en user_metadata editable. El registro normal NO debe dar permisos administrativos. Usa rate limiting, validación de archivos y auditoría.

El SQL concede únicamente lectura pública mediante RLS. No concede escrituras a authenticated. Un backend con service_role evita RLS y, por ello, debe validar autorización antes de cada operación. Mantén las imágenes fuera del disco temporal de Vercel (Supabase Storage o el proveedor existente). Las URLs actuales son ImageKit y dependen de ese proveedor; el SQL no copia los archivos.

## Comprobación
El esquema y la semilla se entregan para instalar. No se ejecutaron en una instancia remota: no se dispone de conexión administrativa a Supabase. Verifica migraciones en una base vacía antes de producción.
