# Grooty — pasos para cerrar la entrega

Actualizado: 3 de octubre de 2026. Esta lista distingue código preparado de servicios realmente activados.

## Preparado y comprobado localmente

- [x] Frontend, catálogo exportado y diseño previo conservados; contacto +51 936 804 577.
- [x] Panel con Google en lugar de formulario de contraseña, habilitado solo con backend configurado.
- [x] Backend Node: sesión, productos/stock/fotos por URL/marcas/archivado/portada/WhatsApp/tráiler.
- [x] Migraciones PostgreSQL, RLS, permisos privados, sesiones, OAuth, rate limit y auditoría.
- [x] Importación inicial protegida contra sobrescribir una DB existente; 88 productos/6 marcas/100 URLs.
- [x] Lista privada de cuentas; acceso denegado por defecto, Google sub vinculado y revocación.
- [x] Pruebas HTTP/SQL locales de autorización, CSRF, concurrencia, inyección, rollback y JWT hostil.
- [x] Compilación frontend y auditoría de dependencias.

## Necesario para activar en servicios reales

- [ ] Confirmar dominio final del proyecto y cuentas propietarias de GitHub/Vercel/Google Cloud/Supabase.
- [ ] Crear DB remota, guardar conexión administrativa privada y revisar certificados/pooler.
- [ ] Aplicar schema.sql → admin.sql → seed-catalog.sql; no ejecutar seed sobre DB con datos.
- [ ] Habilitar la conexión de runtime restringida grooty_app y configurar DATABASE_URL en Vercel.
- [ ] Configurar OAuth Google con callback EXACTA del dominio y credenciales servidor.
- [ ] Recibir lista de Gmail y rol autorizado por cada cuenta; otorgar permisos por CLI privado.
- [ ] Configurar ADMIN_ENABLED=true, APP_ORIGIN y VITE_CATALOG_API=/api/store/catalog; redeploy.
- [ ] Verificar de extremo a extremo con Google real: autorizado entra, otro Gmail no, visitante no escribe.
- [ ] Alta/edición/stock/fotos/archivar/restaurar; confirmar persistencia DB y tienda tras recarga.
- [ ] Cerrar sesión y revocar un acceso; comprobar que ya no funciona la sesión anterior.
- [ ] Prueba en iPhone y Android físicos, navegación, galería, formularios y WhatsApp.
- [ ] Backup remoto, restauración ensayada, retención/purga de auditoría y sesiones con el propietario.
- [ ] Configurar monitorización y límites de gasto del servicio; revisar WAF/rate limit con plan contratado.
- [ ] Promover esta versión completa tras esas pruebas; registrar URL y commit entregados.

ADMIN_ENABLED=false conserva demo y bloquea acceso real. Sin VITE_CATALOG_API la tienda conserva el catálogo importado, por lo que el dueño no debe empezar a editar DB hasta activar y verificar ese enlace. No hay cuentas reales autorizadas, secretos, DB remota creada ni login Google real ejecutado en esta preparación.

## Comandos locales

Desde la raíz: npm ci --prefix backend; npm ci --prefix frontend; npm test; npm run build.
En backend, copiar .env.example a .env y completar privadamente:

- Migración: CONFIRM_DB_SETUP=true. IMPORT_CATALOG=true solo para base nueva. npm run migrate.
- Cuenta autorizada: npm run admin -- grant CORREO_REAL@gmail.com owner.
- Retirar cuenta: npm run admin -- revoke CORREO_REAL@gmail.com.

Usar DATABASE_ADMIN_URL solo localmente para migrar/autorizar; DATABASE_URL restringida en servidor. No se incluyen contraseñas. Antes de transferir/vender, entregar repo, proyecto Vercel, proveedor DB, dominio y derechos de imágenes al dueño; no basta con el link.

## Lo que no forma parte de esta entrega

No se implementan pagos automáticos, pedidos, descuento de stock por compra, uploader de archivos ni renovación automática del tráiler. Las fotos son URLs existentes: garantizar permisos y control del almacenamiento antes de vender. SEO estático requiere rebuild al cambiar figuras o desarrollo adicional para SEO dinámico.
