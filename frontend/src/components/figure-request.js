import { esc } from '../lib/dom.js';
import { icons } from '../lib/icons.js';
import { brands } from '../data.js';
import { SITE } from '../config.js';
import { waReady, waDirectReady, waLabel, sendWhatsApp } from '../lib/whatsapp.js';
import { normalizeFigureRequest, figureRequestMessage } from '../lib/figure-request.js';
import { commerceRequest } from '../lib/commerce-client.js';

export function figureRequestPanel({ standalone = false, compact = false } = {}) {
  const tag = standalone ? 'h1' : 'h2';
  const brandField = `<label class="request-field">Marca preferida<select name="brand"><option value="">Sin preferencia</option>${brands.map(b => `<option value="${esc(b.name)}">${esc(b.name)}</option>`).join('')}<option value="Otra marca">Otra marca (indícala en los detalles)</option></select></label>`;
  return `<section class="request-panel ${compact ? 'request-panel--compact' : ''}" aria-labelledby="request-title" data-reveal>
    <div class="request-copy">
      <p class="eyebrow"><span class="signal-dot" aria-hidden="true"></span> Figuras por encargo</p>
      <${tag} class="${standalone ? 'h-page' : 'h-section'}" id="request-title">Tu próxima figura.<br><em>Aún por encontrar.</em></${tag}>
      <p>¿No está en el catálogo? Cuéntanos cuál buscas y preguntaremos si podemos traerla para tu colección.</p>
      ${!compact ? '<ol class="request-steps"><li><span>01</span><div><strong>Cuéntanos qué buscas</strong><p>Nombre, personaje o una referencia.</p></div></li><li><span>02</span><div><strong>Consulta con la tienda</strong><p>Revisamos opciones y disponibilidad.</p></div></li><li><span>03</span><div><strong>Decide con todos los detalles</strong><p>Confirma precio y plazo antes de reservar.</p></div></li></ol>' : ''}
      <a class="link-arrow" href="${compact ? '/a-pedido' : '/catalogo'}" data-nav>${compact ? 'Cómo funciona el pedido por encargo' : 'Seguir explorando el catálogo'} ${icons.arrow}</a>
    </div>
    <form class="request-form" data-figure-request>
      <div class="request-form-head"><span class="request-symbol" aria-hidden="true">${icons.search}</span><div><h3>Busquemos esa pieza.</h3><p>Solo el nombre es obligatorio.</p></div></div>
      <label class="request-field">Figura o personaje (obligatorio)<input name="figure" type="text" required minlength="2" maxlength="180" placeholder="Ej. Spider-Man, versión que buscas" autocomplete="off"></label>
      ${compact ? '' : brandField}
      <details class="request-details"><summary>Añadir detalles a la búsqueda <span>Opcional ${icons.plus}</span></summary><div class="request-extra">
        ${compact ? brandField : ''}
        <label class="request-field">Presupuesto aproximado (S/)<input name="budget" type="number" inputmode="decimal" min="0.01" max="100000" step="0.01" placeholder="Sin compromiso"></label>
        <label class="request-field">Enlace de referencia<input name="reference" type="url" maxlength="500" placeholder="https://…" aria-describedby="request-reference-help"></label><p id="request-reference-help" class="request-fine">Un enlace a la figura o una foto publicada. No subimos archivos.</p>
        <label class="request-field">Versión, escala u otros detalles<textarea name="details" rows="3" maxlength="600" placeholder="Marca, edición, tamaño o accesorios que buscas"></textarea></label>
      </div></details>
      <button class="btn btn-primary btn-block request-submit" type="submit">${waReady() ? icons.whatsapp : icons.copy}<span>${waLabel('Consultar por WhatsApp')}</span>${icons.arrow}</button>
      <button class="btn btn-secondary btn-block" type="button" data-online-request hidden>Registrar solicitud en mi cuenta</button>
      <p class="request-fine">${waDirectReady() ? 'Abriremos el chat de la tienda con tu consulta. Tú decides cuándo enviarla.' : waReady() ? 'Abriremos el grupo de WhatsApp de la tienda y copiaremos tu consulta para pegarla allí. Si prefieres una consulta privada, usa Instagram.' : 'Copia el mensaje y envíalo al chat de la tienda o a nuestro Instagram.'} La disponibilidad, el precio y el plazo se confirman con Grooty.</p>
      ${!waDirectReady() ? `<a class="link-btn" href="${esc(SITE.instagram)}" target="_blank" rel="noopener">${icons.instagram} Consulta privada por Instagram</a>` : ''}
      <p class="request-status" role="status" aria-live="polite" data-request-status></p>
      <div class="request-preview" data-request-preview hidden><label class="request-field">Tu consulta preparada<textarea name="preview" readonly rows="7" aria-label="Consulta preparada para copiar"></textarea></label></div>
    </form>
  </section>`;
}

export function mountFigureRequest(root) {
  const form = root.querySelector('[data-figure-request]');
  if (!form) return () => {};
  let disposed = false;
  const status = form.querySelector('[data-request-status]');
  const online=form.querySelector('[data-online-request]');
  commerceRequest('/auth/config').then(flags=>{if(!disposed&&flags.customRequests)online.hidden=false;}).catch(()=>{});
  async function register(){online.disabled=true;try{
    if(!form.reportValidity())return;
    await commerceRequest('/account/session');
    const r=normalizeFigureRequest(Object.fromEntries(new FormData(form)));
    const saved=await commerceRequest('/requests',{method:'POST',body:{character:r.figure,brand:r.brand,reference:'',url:r.reference||'',franchise:'',quantity:1,notes:r.details||''}});
    if(!disposed)status.textContent='Solicitud registrada: '+saved.id+'. La tienda revisará tu referencia antes de cotizar.';
  }catch(error){if(!disposed)status.textContent=error.status===401?'Inicia sesión en Mi cuenta para registrar la solicitud.':error.message;}finally{online.disabled=false;}}
  online.addEventListener('click',register);
  const submit = async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    try {
      const request = normalizeFigureRequest(Object.fromEntries(new FormData(form)));
      const message = figureRequestMessage(request);
      form.elements.preview.value = message;
      form.querySelector('[data-request-preview]').hidden = waDirectReady();
      status.textContent = waDirectReady() ? 'Consulta preparada. Revisa el mensaje en el chat antes de enviarlo.' : waReady() ? 'Consulta preparada. Abrimos el grupo de WhatsApp; pega allí el mensaje si deseas compartirlo con el grupo.' : 'Consulta preparada. También puedes seleccionar y copiar el mensaje de abajo.';
      await sendWhatsApp(links => figureRequestMessage(request, { links }), 'figure_request');
    } catch (error) {
      if (!disposed) status.textContent = error.message || 'No se pudo preparar la consulta. Vuelve a intentarlo.';
    } finally { if (!disposed) button.disabled = false; }
  };
  form.addEventListener('submit', submit);
  return () => { disposed = true; form.removeEventListener('submit', submit); online.removeEventListener('click',register); };
}
