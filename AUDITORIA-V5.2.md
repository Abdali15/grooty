# Grooty: refinamiento de experiencia y sección editorial

## Decisiones visuales

DM Sans se mantiene para textos, navegación y ahora titulares principales: mejora lectura, consistencia y el carácter contemporáneo del catálogo. Instrument Serif se conserva en acentos y frases editoriales, respetando la fuente previamente aprobada. Barlow Condensed queda en etiquetas y precios. Se reduce la repetición de números del hero y se retiran cantidades del marquee de marcas; el catálogo conserva información útil de cantidad y precio.

El fondo verde oscuro mantiene la identidad de Grooty, con diferencias moderadas entre secciones y menos textura decorativa. El arte orbital se conserva en el hero y los paneles; las fotografías y los botones dominan la composición. No se agregan vídeos de fondo ni partículas permanentes.

Las portadas de producto se sirven mediante ImageKit en lienzos de proporción 4:5, con fondo común y padding, manteniendo completas las fotos y su relación original. Se mantienen dimensiones iguales de las tarjetas. Esta normalización visual no convierte una foto de caja en una foto de figura; para la siguiente mejora conviene producir fotografías consistentes de cada producto.

Se conserva GSAP, el logo animado, las transiciones de página y las microinteracciones. Se añade un barrido de luz breve al hover de cada tarjeta y profundidad moderada en la portada del tráiler. El movimiento respeta las preferencias de reducción y no bloquea controles ni obliga a desplazarse de una forma distinta.

## Contactos recuperados

El archivo del sitio original disponible en el workspace contiene Instagram, Facebook, TikTok y el grupo de WhatsApp. Se restauran sus enlaces. No contiene un número directo de WhatsApp. La lectura del sitio vivo quedó bloqueada por las herramientas de acceso; no se afirma haber recuperado un número desde su versión actual.

Los botones abren el grupo de WhatsApp cuando falta un número directo y preparan el texto para pegarlo. El formulario explica que el destino es un grupo antes de pulsar. Con un número verificado en configuración, las consultas abren el chat individual con el mensaje. Ningún mensaje se envía automáticamente.

## Universos en pantalla

Después del catálogo y de la sección a pedido se añade un panel editorial de Avengers: Doomsday. El vídeo enlazado por Disney en su comunicado de agosto se carga únicamente al pulsar Ver tráiler; se usa el reproductor de YouTube con dominio de privacidad mejorada. Hay enlace alternativo a YouTube y a la fuente oficial.

La sección conecta con figuras reales del catálogo mediante una búsqueda editorial configurable. No supone que una figura sea una edición oficial de esa película. Los dueños pueden cambiar o esconder la sección desde Admin → Contenido. Para publicar el cambio se necesita el backend; la demostración solo almacena un borrador. No hay actualización automática de noticias o vídeos.

Fuente: https://prensa.disney.es/noticias/yadisponibleelnuevotr%C3%A1ilerdevengadores:doomsdaypresentadodurantelad23:theultimatedisneyfanevent
Normalización de imágenes: https://imagekit.io/docs/image-resize-and-crop

## Próximas ideas con valor comercial

- Colecciones por personaje, franquicia y escala, cuando los propietarios completen esos datos.
- Comparación breve entre figuras (escala, accesorios, condición, precio); los datos reales deben preceder a la interfaz.
- Fotos del empaque y accesorios en cada ficha, además de la figura completa.
- Aviso de reposición por solicitud del cliente; requiere consentimiento y un backend de notificaciones.
- Seguimiento de preventas con fecha de llegada y saldo, a partir de información confirmada.
- Guía de primeras compras: Sellado/Open, tamaños y cuidados, sin promesas comerciales no verificadas.

## Administración y verificación

La demostración se muestra primero y no necesita credenciales. La guía `backend/ACCESO-ADMIN.md` explica cómo crear cuentas reales después de conectar el servidor. No se han creado usuarios, claves ni base remota.

El esquema SQL incluye configuración editorial pública con RLS de lectura y escrituras reservadas al backend. No fue ejecutado contra un proyecto de Supabase.

La comprobación visual interactiva sigue limitada por `ERR_BLOCKED_BY_CLIENT`. La sintaxis, los flujos de consulta, la validación del contenido y la compilación remota deben verificarse aparte; estos controles no equivalen a una auditoría visual completada en todos los dispositivos.
