import { esc } from "../lib/dom.js";
import { icons } from "../lib/icons.js";
import { SITE, PREORDER_POLICY } from "../config.js";
import { preorderSteps } from "../components/blocks.js";
import { waLabel } from "../lib/whatsapp.js";

export const help = {
  render() {
    return {
      title: "Ayuda · Grooty Store",
      description: "Cómo comprar, cómo reservar una preventa y cómo se coordinan pagos y entrega en Grooty Store.",
      html: `<header class="page-head container" data-reveal>
        <div class="page-head-row"><h1 class="h-page" data-split>Ayuda</h1>
        <p class="page-sub">Encuentra tu próxima figura y conoce cómo comprar, reservar y coordinar la entrega.</p></div>
      </header>
      <section class="container help-grid">
        <div class="help-main">
          <article class="help-block" id="como-comprar" data-reveal>
            <h2 class="h-section">Cómo comprar</h2>
            <ol class="how how--big">
              <li><span>1</span><div><b>Elige tus figuras.</b> Usa el botón + en cualquier figura para sumarla a Mi selección.</div></li>
              <li><span>2</span><div><b>Consulta por WhatsApp.</b> Desde Mi selección se prepara un mensaje con las figuras, cantidades y precios.</div></li>
              <li><span>3</span><div><b>Coordina con la tienda.</b> Disponibilidad, medios de pago y entrega se confirman en la conversación.</div></li>
            </ol>
          </article>
          <article class="help-block" id="preventas" data-reveal>
            <h2 class="h-section">Cómo reservar una preventa</h2>
            ${preorderSteps()}
            <p class="help-fine">${esc(PREORDER_POLICY.text)}</p>
          </article>
          <article class="help-block" id="pagos" data-reveal>
            <h2 class="h-section">Pagos y entrega</h2>
            <p>Confirma con Grooty Store los medios de pago disponibles, el costo de envío y el plazo de entrega para tu ubicación antes de realizar un abono. La compra se coordina directamente con la tienda.</p>
          </article>
          <article class="help-block" id="faq" data-reveal>
            <h2 class="h-section">Preguntas frecuentes</h2>
            <div class="faq">
              <details><summary>¿Qué significa Sellado y Open?</summary><p>Sellado indica que la publicación está registrada como sellada. Open indica que está registrada como abierta. Confirma cualquier detalle del estado con la tienda antes de comprar.</p></details>
              <details><summary>¿Qué precio se muestra?</summary><p>El precio de la figura completa. En preventas también verás el monto de reserva.</p></details>
              <details><summary>¿Puedo pedir más fotos?</summary><p>Sí, puedes solicitarlas por WhatsApp. Si una figura tiene más de una foto publicada, aparece una galería en su ficha.</p></details>
              <details><summary>¿Añadir una figura confirma mi compra?</summary><p>No. Mi selección prepara tu consulta. La disponibilidad, el pago y la confirmación del pedido o reserva se coordinan con la tienda.</p></details>
              <details><summary>¿El envío está incluido en el precio?</summary><p>El catálogo muestra el precio de la figura. Consulta con la tienda el costo y el plazo de entrega para tu ubicación antes de pagar.</p></details>
              <details><summary>¿Cuándo pago el saldo de una preventa?</summary><p>${esc(PREORDER_POLICY.text)}</p></details>
              <details><summary>¿Qué hago si el botón dice Copiar mensaje?</summary><p>El botón prepara y copia tu consulta. Puedes enviarla a la tienda por Instagram usando el enlace de contacto; también puedes pegarla en tu conversación con Grooty Store.</p></details>
              <details><summary>¿Mis favoritas y mi selección se guardan?</summary><p>Se guardan en este dispositivo y navegador. Si borras los datos del navegador, se pierden.</p></details>
            </div>
          </article>
        </div>
        <aside class="help-side" data-reveal>
          <div class="help-card">
            <h2 class="h-mini">¿Hablamos?</h2>
            <p>Escríbenos y resolvemos tus dudas sobre disponibilidad, pago y entrega.</p>
            <button class="btn btn-primary btn-block" type="button" data-wa="general" data-magnetic>${icons.whatsapp}<span>${waLabel("Hablar por WhatsApp")}</span></button>
            <a class="btn btn-secondary btn-block" href="${SITE.instagram}" target="_blank" rel="noopener">${icons.instagram}<span>${esc(SITE.instagramHandle)}</span></a>
          </div>
        </aside>
      </section>`
    };
  }
};
