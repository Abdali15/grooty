# Referencia Culqi y validación de modo pruebas — 2026-10-08

Referencia proporcionada: https://www.youtube.com/watch?v=Z1P-qYCOqVw
Título y descripción obtenidos de YouTube: «Pasarela de Pago CULQI en PERÚ y Requisitos», John Colvert. El índice del autor incluye comisiones (2:24), ejemplo (6:17) y requisitos (7:48). No se pudo reproducir ni obtener transcripción española: el endpoint de subtítulos devolvió cero bytes. No se atribuyen al video recomendaciones de seguridad ni código no observado. Las instrucciones técnicas siguientes se contrastaron con documentación oficial actual.

## Decisión y estado real

Culqi es una alternativa peruana que documenta tarjetas y Yape. Dispone de entorno Integración separado de Producción, claves públicas/secretas y datos de prueba. Las transacciones con claves de prueba no pasan por las redes bancarias ni tienen costo; eso no implica cobros productivos gratuitos. La afiliación y validación del comercio deben gestionarse en el proveedor, sin credenciales inventadas.

No se cambió la pasarela existente por un video introductorio. `PAYMENT_PROVIDER=culqi` sigue previsto como configuración, pero el adaptador Culqi no está implementado: seleccionarlo no habilita cobros. Mercado Pago tiene un adaptador sandbox localmente probado con respuestas controladas; no una prueba externa completa con credenciales. `PAYMENTS_ENABLED=false` continúa por defecto y producción queda bloqueada.

## Comparación de integración

| Punto | Mercado Pago actual | Culqi pendiente |
|---|---|---|
| Interfaz | Redirección a checkout alojado | Checkout oficial y tokenización; integración de cargo distinta |
| Datos sensibles | La tienda no recibe PAN/CVV ni OTP | Checkout oficial debe recogerlos; tienda recibe solamente token autorizado |
| Importe | Servidor, céntimos y PEN | Cargo en céntimos desde pedido DB, no navegador |
| Confirmación | Firma de webhook + consulta oficial + transacción DB | Implementar mecanismos propios Culqi y reconsulta de cargo/orden; no copiar HMAC de MP |
| Prueba | Mock + contrato HTTP controlado; credenciales sandbox pendientes | Afiliación, llaves y adaptador E2E pendientes |
| Retorno | No acredita el pedido | Callback de token tampoco acredita el pedido |

La clave pública destinada al Checkout puede aparecer en el frontend; eso es parte del diseño oficial. La clave secreta, conexión DB y claves MFA jamás. No colocar una sk_test o sk_live en JavaScript público, VITE_, GitHub o chat. Si se integra el widget, actualizar CSP según dominios oficiales realmente usados y comprobar 3DS, errores y accesibilidad en navegador.

## Cómo comprobar Culqi más adelante

1. Crear/validar el comercio en CulqiPanel oficial y seleccionar **Integración**.
2. Configurar claves de prueba mediante variables privadas. La llave pública se suministra al Checkout; la secreta solo al backend. No usar claves live en Preview.
3. Implementar adaptador independiente, tokenización oficial, creación del cargo desde pedido autoritativo y recuperación segura tras fallos. Debe resolver idempotencia, vinculación token/pedido/cliente, duplicados y conciliación antes de activarlo.
4. Probar Yape con el número ficticio oficial **900000001** y un código de seis dígitos de prueba dentro del Checkout de integración. No usar una cuenta/OTP real del cliente en este banco de pruebas.
5. Verificar en API/panel de integración el cargo y su importe/referencia. Comprobar rechazo, timeout, reintento, duplicados, 3DS, stock reservado y pago tardío. Un token creado o popup exitoso no confirma dinero recibido.
6. Certificar el flujo completo con evidencias reproducibles antes de cambiar flags. No retirar el bloqueo productivo por disponer solamente de claves.

El punto 4 es una guía del proveedor, **no una prueba ejecutada en Grooty**. No se enviaron solicitudes financieras a Culqi ni se cobró dinero.

## Refuerzo aplicado al adaptador existente

Se prohíben redirecciones HTTP al consultar API financiera para mantener el origen fijo. Se rechazan destinos de checkout con credenciales en URL, puertos inesperados, HTTP o dominios falsos. Una transacción approved no se procesa como PAID si no está acreditada, declara captura false, tiene devolución o no contiene una fecha de evento válida. Devoluciones/estados pendientes requieren conciliación; no se los presenta como éxitos. Esto endurece validación, no implementa el proceso de reembolso pendiente.

Pruebas nuevas en backend/tests/payment-adapter.test.js: origen, secreto solo servidor, moneda, comercio, entorno, referencias, pending/refunds, fechas, importe, URLs de retorno, idempotency key, fallos de red y bloqueo de Culqi/mock. Fetch controlado sin dinero ni credenciales; ver backend-tests.txt y RESULTADOS-3.0.md para conteos reales.

## Fuentes oficiales consultadas

- https://docs.culqi.com/es/documentacion/pagos-online
- https://docs.culqi.com/es/documentacion/pagos-online/integracion-vs-produccion
- https://docs.culqi.com/es/documentacion/pagos-online/llaves
- https://docs.culqi.com/es/documentacion/checkout/checkout-custom
- https://docs.culqi.com/es/documentacion/pagos-online/tarjetas-de-prueba
- https://docs.culqi.com/es/documentacion/pagos-online/cargo-unico/cargos/
- https://docs.culqi.com/es/documentacion/pagos-online/webhooks
- https://apidocs.culqi.com/
- https://www.mercadopago.com.pe/developers/es/reference/online-payments/checkout-api-payments/get-payment/get
