import { esc } from '../lib/dom.js';
import { icons } from '../lib/icons.js';

/** Datos de la publicación y pendientes explícitos, sin completar datos del fabricante. */
export function purchaseDetails(p) {
  const includes = typeof p.includes_text === 'string' ? p.includes_text.trim() : '';
  const box = typeof p.box_note === 'string' ? p.box_note.trim() : '';
  return `<section class="purchase-details" aria-labelledby="purchase-details-title">
    <h2 class="h-mini" id="purchase-details-title">Antes de elegir tu pieza</h2>
    <div class="purchase-condition"><span>${esc(p.estado)}</span><p>${p.isOpen ? 'Publicada como abierta. Confirma el estado de la pieza, sus accesorios y caja.' : 'Publicada como sellada. Confirma el estado de la caja y los detalles de la edición.'}</p></div>
    <details ${p.isOpen ? 'open' : ''}><summary><span>Qué incluye</span><span class="purchase-state ${includes ? 'is-confirmed' : ''}">${includes ? 'Ver detalles' : 'Por confirmar'}</span>${icons.plus}</summary><p>${includes ? esc(includes) : 'Los accesorios no están detallados en esta publicación. Pide la lista completa y fotos antes de abonar.'}</p></details>
    <details><summary><span>Estado de la caja</span><span class="purchase-state ${box ? 'is-confirmed' : ''}">${box ? 'Ver detalles' : 'Por confirmar'}</span>${icons.plus}</summary><p>${box ? esc(box) : 'La condición de la caja todavía no está informada. Solicita fotos de las esquinas, sellos y cualquier detalle relevante.'}</p></details>
    <details><summary><span>Pago y entrega</span>${icons.plus}</summary><p>Confirma el medio de pago, costo de envío y plazo para tu ubicación directamente con Grooty. ${p.isPre ? 'En preventa, confirma también la llegada estimada antes de reservar.' : 'El catálogo no garantiza una fecha de entrega.'}</p><a class="link-inline" href="/ayuda#pagos" data-nav>Cómo coordinar tu compra</a></details>
    <p class="purchase-disclaimer">Mi selección prepara una consulta; no cobra, aparta stock ni confirma una reserva.</p>
  </section>`;
}
