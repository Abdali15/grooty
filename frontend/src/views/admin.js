import { esc, $ } from '../lib/dom.js';
import { money } from '../lib/format.js';
import { icons } from '../lib/icons.js';
import { imgUrl } from '../lib/images.js';
import { adminRequest, acceptSession, clearSession, loadDemo, saveDemo, exportDemo, validateAdminProduct, safeImageUrl } from '../lib/admin-client.js';
import { SITE } from '../config.js';
import { normalizeStoreSettings, youtubeVideoId } from '../lib/cinema.js';
import { catalogQualityIssues } from '../lib/catalog-quality.js';
import { imageLines, selectCover } from '../lib/photo-editor.js';

const options = (values, current) => values.map(v => `<option value="${esc(v)}" ${v === current ? 'selected' : ''}>${esc(v)}</option>`).join('');
const modalHTML = () => `<dialog class="admin-dialog" data-editor aria-labelledby="editor-title">
  <form data-product-form>
    <header class="admin-dialog-head"><div><p class="eyebrow">Ficha de producto</p><h2 id="editor-title">Editar figura</h2></div><button type="button" class="close-btn" data-editor-close aria-label="Cerrar editor">${icons.close}</button></header>
    <div class="admin-editor-quality" data-editor-quality role="note" aria-label="Información pendiente de la ficha"></div>
    <div class="admin-form-grid">
      <label class="admin-field admin-field--wide">Nombre de la figura<input name="titulo" required minlength="2" maxlength="180"></label>
      <label class="admin-field">Marca<select name="marca" required></select></label>
      <label class="admin-field">Código SKU<input name="sku" maxlength="64" required></label>
      <label class="admin-field">Estado<select name="estado"><option>Sellado</option><option>Open</option></select></label>
      <label class="admin-field">Modalidad<select name="tipo"><option value="venta">Venta</option><option value="preventa">Preventa</option></select></label>
      <label class="admin-field">Precio total (S/)<input name="precio" type="number" required min="0.01" max="999999" step="0.01"></label>
      <label class="admin-field">Reserva (S/)<input name="precio_reserva" type="number" min="0" step="0.01"><small>Solo preventas. No puede superar el total.</small></label>
      <label class="admin-field">Stock<input name="stock" type="number" min="0" max="9999" step="1" placeholder="Por confirmar"><small>Vacío = desconocido. 0 = agotado.</small></label>
      <label class="admin-field">Visibilidad<select name="published"><option value="true">Publicado</option><option value="false">Oculto</option></select></label>
      <label class="admin-field">Franquicia<input name="franchise" maxlength="3000"></label>
      <label class="admin-field">Personaje<input name="character_name" maxlength="3000"></label>
      <label class="admin-field admin-field--wide">Descripción<textarea name="description" rows="3" maxlength="3000" placeholder="Describe detalles verificados de la figura."></textarea></label>
      <label class="admin-field">Qué incluye<textarea name="includes_text" rows="3" maxlength="3000"></textarea></label>
      <label class="admin-field">Estado de la caja<textarea name="box_note" rows="3" maxlength="3000"></textarea></label>
      <label class="admin-field admin-field--wide">Fotos · una URL HTTPS por línea<textarea name="images" rows="3" required placeholder="https://ik.imagekit.io/..."></textarea><small>De 1 a 8 fotos. La primera es la portada. Usa la figura y edición exactas, fondo neutro y encuadre 4:5 con el producto completo y centrado. Evita márgenes dentro del archivo; las tarjetas ya añaden su espacio.</small></label>
      <p class="admin-photo-guide admin-field--wide">Recomendado: foto frontal, otra vista y detalles de caja y accesorios. Para una figura Open, muestra su estado real. Una foto de la caja no sustituye la foto de la figura.</p>
      <div class="admin-photo-preview admin-field--wide" data-photo-preview></div>
    </div>
    <footer class="admin-dialog-foot"><p data-editor-status role="status"></p><button type="submit" class="btn btn-primary" data-product-save>Guardar cambios</button></footer>
  </form>
</dialog>`;

export const admin = {
  render() {
    return { title: 'Administración · Grooty Store', description: 'Acceso de propietarios para gestionar el catálogo de Grooty Store.', html: `<section class="container admin-wrap"><header class="admin-page-head"><div><p class="eyebrow">Grooty / Propietarios</p><h1 class="h-page">Centro de control</h1><p class="page-sub">Productos, stock y la próxima pieza que verá tu comunidad.</p></div><a href="/" data-nav class="btn btn-secondary">${icons.arrowLeft}Volver a la tienda</a></header><div data-admin-body><p class="admin-loading">Comprobando conexión…</p></div>${modalHTML()}</section>` };
  },
  mount(root) {
    const ac = new AbortController(); const sig = { signal: ac.signal };
    const body = $('[data-admin-body]', root); const dialog = $('[data-editor]', root);
    const form = $('[data-product-form]', root);
    let connection = 'checking';
    let mode = 'login', user = null, data = null, current = null, tab = 'products', busy = false;
    let search = '', filter = 'all', focusBefore = null;
    const alive = () => !ac.signal.aborted;
    function notice(text, error = false) { const p = $('[data-admin-status]', root); if (p) { p.textContent = text; p.classList.toggle('is-error', error); } }
    function loginView(message = '') {
      body.innerHTML = `<div class="admin-access-grid"><article class="admin-access-card"><p class="eyebrow">Solo administradores</p><h2>Administrar Grooty Store</h2><p>Entra con una cuenta Google o Microsoft autorizada por el propietario. La tienda y el catálogo son públicos y no requieren iniciar sesión.</p><a href="/cuenta" class="btn btn-primary btn-block">Iniciar sesión de administrador ${icons.arrow}</a><p class="admin-access-fine">La identidad y los permisos se comprueban en el servidor. Segundo factor obligatorio.</p><p class="admin-status" data-admin-status role="status">${esc(message)}</p><a href="/catalogo" data-nav class="link-btn">Volver al catálogo público</a></article></div>`;
    }
    async function loadLive() {
      const result = await adminRequest('/catalog', { signal: ac.signal });
      if (!Array.isArray(result.products) || !Array.isArray(result.brands)) throw new Error('El servidor no devolvió un catálogo válido.');
      if (result.brands.some(b => typeof b !== 'string' || b.length < 2 || b.length > 60)) throw new Error('El servidor devolvió marcas no válidas.');
      const products = result.products.map(p => validateAdminProduct({ description: '', includes_text: '', box_note: '', franchise: '', character_name: '', ...p }, result.brands));
      data = { products, brands: result.brands, settings: normalizeStoreSettings(result.settings || { heroIds: [] }, {whatsapp:SITE.whatsappNumber,cinema:SITE.cinema}) };
    }
    function dashboard() {
      const active = data.products.filter(p => !p.archived);
      body.innerHTML = `<div class="admin-mode-bar"><p><span class="signal-dot" aria-hidden="true"></span>${mode === 'demo' ? '<b>Demostración</b> · Borradores locales; no se publican en la tienda.' : `<b>Sesión de propietario</b> · ${esc(user.email)}`}</p><button type="button" class="link-btn" data-admin-logout>${mode === 'demo' ? 'Salir de la demostración' : 'Cerrar sesión'}</button></div>
      <div class="admin-metrics"><article><span>Figuras activas</span><strong>${active.length}</strong></article><article><span>Publicadas</span><strong>${active.filter(p => p.published).length}</strong></article><article><span>Stock por confirmar</span><strong>${active.filter(p => p.stock == null).length}</strong></article><article><span>Fichas por completar</span><strong>${active.filter(p => catalogQualityIssues(p).length).length}</strong></article></div>
      <div class="admin-workspace"><nav class="admin-tabs" aria-label="Secciones de administración">${[['products','Inventario'],['brands','Marcas'],['home','Portada'],['content','Contenido']].map(([key,name]) => `<button type="button" data-admin-tab="${key}" ${key===tab ? 'aria-current="page" class="is-on"' : ''}>${name}</button>`).join('')}<button type="button" data-admin-export>Exportar catálogo ${icons.arrow}</button></nav><div class="admin-content" data-admin-content></div></div><p class="admin-status" data-admin-status role="status"></p>`;
      renderContent();
    }
    function renderContent() {
      const target = $('[data-admin-content]', root);
      if (tab === 'brands') {
        target.innerHTML = `<div class="admin-section-head"><div><h2>Marcas de la colección</h2><p>Crea una marca antes de añadir sus figuras.</p></div></div><form data-brand-form class="admin-brand-form"><label class="admin-field">Nueva marca<input name="name" minlength="2" maxlength="60" required placeholder="Nombre de la marca"></label><button class="btn btn-primary" type="submit">Añadir marca ${icons.plus}</button></form><div class="admin-brand-grid">${data.brands.map(b => `<article><h3>${esc(b)}</h3><p>${data.products.filter(p=>p.marca===b && !p.archived).length} figuras activas</p></article>`).join('')}</div>`;
      } else if (tab === 'content') {
        const feature=data.settings.cinema;
        target.innerHTML = `<div class="admin-section-head"><div><h2>Contacto y universos en pantalla</h2><p>Actualiza el tráiler cuando haya una publicación oficial y elige qué figuras mostrar.</p></div></div><form data-content-form class="admin-content-form"><fieldset><legend>WhatsApp directo</legend><label class="admin-field">Número con código de país<input name="whatsapp" type="tel" inputmode="tel" maxlength="22" value="${esc(data.settings.whatsapp||'')}" placeholder="Número verificado de la tienda"><small>Vacío: se usa el grupo publicado por Grooty. Con número: las consultas abren el chat privado con el mensaje preparado.</small></label></fieldset><fieldset><legend>Tráiler destacado</legend><label class="admin-field">Mostrar sección<select name="enabled"><option value="true" ${feature.enabled?'selected':''}>Visible</option><option value="false" ${!feature.enabled?'selected':''}>Oculta</option></select></label><label class="admin-field">Película o serie<input name="title" required minlength="2" maxlength="120" value="${esc(feature.title)}"></label><label class="admin-field">Descripción<textarea name="summary" required maxlength="500" rows="3">${esc(feature.summary)}</textarea></label><label class="admin-field">Enlace del tráiler oficial en YouTube<input name="video" type="url" required maxlength="500" value="https://www.youtube.com/watch?v=${feature.videoId}"><small>Verifica que sea del canal oficial de Marvel o Disney. Se reproduce solo cuando el visitante pulsa Ver tráiler.</small></label><label class="admin-field">Fuente oficial de Marvel / Disney<input name="source" type="url" required maxlength="1000" value="${esc(feature.source)}"></label><label class="admin-field">Personaje o palabra para relacionar figuras<input name="query" maxlength="80" value="${esc(feature.query)}" placeholder="Ej. Doom"><small>Busca en títulos, personaje y franquicia. No asocia automáticamente una figura con una versión de la película.</small></label></fieldset><button type="submit" class="btn btn-primary">Guardar contacto y contenido</button><p class="admin-access-fine">${mode==='demo'?'Esta demostración guarda contenido en un borrador local; no modifica la portada publicada.':'El catálogo público leerá estos datos desde tu backend.'}</p></form>`;
      } else if (tab === 'home') {
        target.innerHTML = `<div class="admin-section-head"><div><h2>Figuras destacadas</h2><p>Selecciona hasta 5 figuras para el carrusel principal.</p></div></div><form data-home-form><div class="admin-featured-grid">${Array.from({length:5},(_,i)=>`<label class="admin-field">Destacado ${i+1}<select name="slot${i}"><option value="">Sin figura</option>${data.products.filter(p=>!p.archived && p.published).map(p=>`<option value="${p.id}" ${data.settings.heroIds?.[i]===p.id?'selected':''}>${esc(p.titulo)} · ${esc(p.marca)}</option>`).join('')}</select></label>`).join('')}</div><button type="submit" class="btn btn-primary">Guardar destacados</button></form>`;
      } else {
        target.innerHTML = `<div class="admin-section-head"><div><h2>Inventario</h2><p>Edita la ficha completa o archiva una figura que quieras retirar.</p></div><button type="button" class="btn btn-primary" data-admin-new>${icons.plus}Nueva figura</button></div><div class="admin-inventory-tools"><label class="admin-search"><span class="sr-only">Buscar en inventario</span>${icons.search}<input type="search" data-admin-search value="${esc(search)}" placeholder="Buscar nombre, marca o código"></label><label class="admin-field"><span class="sr-only">Estado del inventario</span><select data-admin-filter>${[['all','Figuras activas'],['published','Publicadas'],['hidden','Ocultas'],['unknown','Stock por confirmar'],['incomplete','Fichas por completar'],['empty','Agotadas'],['archived','Archivadas']].map(([v,l])=>`<option value="${v}" ${v===filter?'selected':''}>${l}</option>`).join('')}</select></label></div><p class="admin-result-count" data-admin-count aria-live="polite"></p><div class="admin-product-list" data-admin-list></div>`;
        renderList();
      }
    }
    function renderList() {
      const q = search.toLocaleLowerCase('es').trim();
      const list = data.products.filter(p => (filter === 'archived' ? p.archived : !p.archived) && (!q || `${p.titulo} ${p.marca} ${p.sku}`.toLocaleLowerCase('es').includes(q)) && (filter !== 'published' || p.published) && (filter !== 'hidden' || !p.published) && (filter !== 'unknown' || p.stock == null) && (filter !== 'empty' || p.stock === 0) && (filter !== 'incomplete' || catalogQualityIssues(p).length > 0));
      $('[data-admin-count]',root).textContent = `${list.length} ${list.length===1?'figura':'figuras'}`;
      $('[data-admin-list]',root).innerHTML = list.length ? list.map(p => `<article class="admin-product-row"><img src="${esc(imgUrl(p.imagenes_producto?.[0]?.url || '',160))}" alt="" loading="lazy"><div class="admin-product-name"><span>${esc(p.marca)}</span><h3>${esc(p.titulo)}</h3><p>${esc(p.sku)} · ${p.tipo==='preventa'?'Preventa':'Venta'} · ${esc(p.estado)}</p>${catalogQualityIssues(p).length ? `<p class="admin-quality-hint">Pendiente: ${esc(catalogQualityIssues(p).slice(0,3).join(', '))}${catalogQualityIssues(p).length > 3 ? '…' : ''}</p>` : '<p class="admin-quality-hint is-complete">Ficha completa</p>'}</div><div class="admin-product-price">${money(p.precio)}<span>${p.tipo==='preventa' && p.precio_reserva!=null ? `Reserva ${money(p.precio_reserva)}` : 'Precio total'}</span></div><div class="admin-product-stock"><strong>${p.stock==null?'—':p.stock}</strong><span>${p.stock==null?'Por confirmar':'unidades'}</span></div><span class="admin-publish-state ${p.published && !p.archived?'is-on':''}">${p.archived?'Archivada':p.published?'Publicada':'Oculta'}</span><div class="admin-row-actions"><button type="button" class="btn btn-secondary btn-sm" data-admin-edit="${p.id}">Editar</button><button type="button" class="link-btn" data-admin-archive="${p.id}">${p.archived?'Restaurar':'Archivar'}</button></div></article>`).join('') : '<div class="zero"><p>No hay figuras con esos criterios.</p></div>';
    }
    function persistDemo(next) { saveDemo(next); data = next; }
    function openEditor(p) {
      current = structuredClone(p); focusBefore = document.activeElement;
      const fields = form.elements;
      fields.marca.innerHTML = options(data.brands,current.marca);
      for(const key of ['titulo','sku','estado','tipo','precio','precio_reserva','stock','franchise','character_name','description','includes_text','box_note']) fields[key].value = current[key] ?? '';
      fields.published.value = String(current.published);
      fields.images.value = (current.imagenes_producto||[]).map(i=>i.url).join('\n');
      $('#editor-title',root).textContent = data.products.some(p=>p.id===current.id) ? 'Editar figura' : 'Nueva figura';
      $('[data-editor-status]',root).textContent = '';
      photoPreview(); editorQuality(); syncReserve(); dialog.showModal();
    }
    function editorQuality() {
      const fields = form.elements;
      const draft = {stock: fields.stock.value === '' ? null : Number(fields.stock.value), imagenes_producto: fields.images.value.split('\n').map(u=>u.trim()).filter(safeImageUrl)};
      for (const key of ['franchise','character_name','description','includes_text','box_note']) draft[key] = fields[key].value;
      const issues = catalogQualityIssues(draft);
      $('[data-editor-quality]',root).textContent = issues.length ? `Por completar: ${issues.join(', ')}. Añade solo información confirmada; puedes guardar el borrador y continuar después.` : 'Ficha completa: stock, datos de la figura y al menos dos fotos. Revisa que coincidan con la pieza real.';
    }
    function syncReserve() { form.elements.precio_reserva.disabled = form.elements.tipo.value !== 'preventa'; }
    function photoPreview() {
      const urls = imageLines(form.elements.images.value).slice(0,8);
      $('[data-photo-preview]',root).innerHTML=urls.map((u,i)=>safeImageUrl(u) ? `<figure><img src="${esc(imgUrl(u,240,{canvas:true}))}" alt="Vista previa de foto ${i+1}" loading="lazy" width="120" height="150"><figcaption>${i===0?'Portada':`Foto ${i+1}`}</figcaption><button type="button" data-photo-cover="${i}" aria-pressed="${i===0}" aria-label="${i===0?'Foto 1: portada actual':`Foto ${i+1}: usar como portada`}">${i===0?'Portada actual':'Usar portada'}</button></figure>` : '').join('');
    }
    async function handleExpired(error) {
      if(error.status===401){ mode='login'; clearSession(); loginView('Tu sesión terminó. Vuelve a entrar para guardar cambios.'); }
      else notice(error.message,true);
    }
    root.addEventListener('submit', async e => {
      const brandForm=e.target.closest('[data-brand-form]');
      const homeForm=e.target.closest('[data-home-form]');
      const contentForm=e.target.closest('[data-content-form]');
      if(!brandForm && !homeForm && !contentForm && e.target!==form)return;
      e.preventDefault(); if(busy)return;
      busy=true; const button=e.target.querySelector('button[type="submit"]'); if(button)button.disabled=true;
      try {
        if(brandForm){
          const name=brandForm.elements.name.value.trim();
          if(name.length<2 || name.length>60 || data.brands.some(b=>b.toLowerCase()===name.toLowerCase()))throw Error('Escribe una marca nueva de 2 a 60 caracteres.');
          if(mode==='demo')persistDemo({...data,brands:[...data.brands,name]});
          else { await adminRequest('/brands',{method:'POST',body:{name},signal:ac.signal}); await loadLive(); }
          if(alive()){dashboard();notice(mode==='demo'?'Marca añadida al borrador.':'Marca guardada.');}
        } else if(contentForm){
          const f=contentForm.elements;
          const settings=normalizeStoreSettings({...data.settings,whatsapp:f.whatsapp.value,cinema:{enabled:f.enabled.value==='true',title:f.title.value,summary:f.summary.value,videoId:youtubeVideoId(f.video.value),source:f.source.value,query:f.query.value}},data.settings);
          if(mode==='demo')persistDemo({...data,settings});
          else{await adminRequest('/settings',{method:'PUT',body:settings,signal:ac.signal});await loadLive();}
          if(alive()){dashboard();notice(mode==='demo'?'Contacto y estreno guardados en el borrador local.':'Contacto y estreno actualizados.');}
        } else if(homeForm){
          const ids=Array.from({length:5},(_,i)=>Number(homeForm.elements[`slot${i}`].value)).filter(Boolean);
          if(new Set(ids).size!==ids.length)throw Error('Elige figuras distintas para cada destacado.');
          if(mode==='demo')persistDemo({...data,settings:{...data.settings,heroIds:ids}});
          else { await adminRequest('/settings',{method:'PUT',body:{...data.settings,heroIds:ids},signal:ac.signal});await loadLive(); }
          if(alive()){dashboard();notice(mode==='demo'?'Destacados guardados como borrador local.':'Portada actualizada.');}
        } else {
          const f=form.elements;
          const input={...current,titulo:f.titulo.value,marca:f.marca.value,sku:f.sku.value.trim(),estado:f.estado.value,tipo:f.tipo.value,precio:Number(f.precio.value),precio_reserva:f.precio_reserva.value===''?null:Number(f.precio_reserva.value),stock:f.stock.value===''?null:Number(f.stock.value),published:f.published.value==='true',franchise:f.franchise.value,character_name:f.character_name.value,description:f.description.value,includes_text:f.includes_text.value,box_note:f.box_note.value,imagenes_producto:f.images.value.split('\n').map(v=>v.trim()).filter(Boolean).map((url,posicion)=>({url,posicion}))};
          const product=validateAdminProduct(input,data.brands);
          if(data.products.some(p=>p.id!==product.id && p.sku===product.sku))throw Error('Ya existe una figura con ese código SKU.');
          if(mode==='demo'){
            const next={...data,products:[...data.products.filter(p=>p.id!==product.id),{...product,revision:product.revision+1}]};persistDemo(next);
          } else {
            const exists=data.products.some(p=>p.id===product.id);
            await adminRequest(exists?`/products/${product.id}`:'/products',{method:exists?'PUT':'POST',body:product,signal:ac.signal});await loadLive();
          }
          if(alive()){dialog.close();dashboard();notice(mode==='demo'?'Figura guardada en el borrador. La tienda pública no cambió.':'Figura guardada en el catálogo.');}
        }
      } catch(error){if(!alive())return;if(e.target===form)$('[data-editor-status]',root).textContent=error.message;else await handleExpired(error);}
      finally {busy=false;if(button?.isConnected)button.disabled=false;}
    },sig);
    root.addEventListener('click', async e=>{
      const t=e.target.closest('button');if(!t || busy)return;
      if(t.dataset.photoCover !== undefined){
        try {
          form.elements.images.value = selectCover(form.elements.images.value,Number(t.dataset.photoCover));
          photoPreview(); editorQuality();
          $('[data-photo-cover="0"]',root)?.focus();
          $('[data-editor-status]',root).textContent = 'Portada seleccionada. Pulsa Guardar cambios para conservar el nuevo orden.';
        } catch(error) { $('[data-editor-status]',root).textContent = error.message; }
        return;
      }
      if(import.meta.env.DEV && t.hasAttribute('data-admin-demo')){mode='demo';data=loadDemo();tab='products';dashboard();return;}
      if(t.hasAttribute('data-editor-close')){dialog.close();return;}
      if(t.dataset.adminTab){tab=t.dataset.adminTab;dashboard();return;}
      if(t.hasAttribute('data-admin-export')){exportDemo(data);notice('Copia del catálogo exportada.');return;}
      if(t.hasAttribute('data-admin-new')){const id=Math.max(0,...data.products.map(p=>p.id))+1;openEditor({id,titulo:'',marca:data.brands[0]||'',sku:`GRT-${id}`,estado:'Sellado',tipo:'venta',precio:'',precio_reserva:null,stock:null,published:false,archived:false,revision:0,imagenes_producto:[]});return;}
      if(t.dataset.adminEdit){openEditor(data.products.find(p=>p.id===Number(t.dataset.adminEdit)));return;}
      if(t.dataset.adminArchive){
        const p=data.products.find(p=>p.id===Number(t.dataset.adminArchive));busy=true;
        try{
          if(mode==='demo')persistDemo({...data,products:data.products.map(x=>x.id===p.id?{...x,archived:!p.archived,revision:x.revision+1}:x)});
          else{await adminRequest(`/products/${p.id}`,{method:'PATCH',body:{archived:!p.archived,revision:p.revision},signal:ac.signal});await loadLive();}
          if(alive()){dashboard();notice(p.archived?'Figura restaurada.':'Figura archivada. Puedes restaurarla desde el filtro Archivadas.');}
        }catch(error){if(alive())await handleExpired(error);}finally{busy=false;}
        return;
      }
      if(t.hasAttribute('data-admin-logout')){
        try{if(mode==='live')await adminRequest('/logout',{method:'POST',body:{},signal:ac.signal});if(alive()){clearSession();mode='login';loginView();}}
        catch(error){if(alive())notice(error.message,true);}
      }
    },sig);
    root.addEventListener('input',e=>{
      if(e.target.hasAttribute('data-admin-search')){search=e.target.value;renderList();}
      if(e.target===form.elements.images)photoPreview();
      if(e.target.closest('[data-product-form]'))editorQuality();
    },sig);
    root.addEventListener('change',e=>{
      if(e.target.hasAttribute('data-admin-filter')){filter=e.target.value;renderList();}
      if(e.target===form.elements.tipo)syncReserve();
    },sig);
    dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();},sig);
    dialog.addEventListener('close',()=>focusBefore?.isConnected && focusBefore.focus(),sig);
    const authError=new URLSearchParams(location.search).get('auth_error');
    loginView(authError==='denied'?'Acceso cancelado o cuenta no autorizada.':authError?'No se pudo completar el acceso. Vuelve a intentarlo.':'');
    (async()=>{
      let restoring = false;
      try {
        const session = await adminRequest('/session',{signal:ac.signal});
        if (!alive() || mode !== 'login' || busy) return;
        connection = 'ready'; user = acceptSession(session); restoring = true; busy = true;
        await loadLive();
        if (alive()) { mode = 'live'; dashboard(); }
      } catch(error) {
        if (alive() && (restoring || (mode === 'login' && !busy))) {
          connection = [401,403].includes(error.status) ? 'ready' : 'unavailable';
          clearSession(); mode = 'login'; loginView(error.status === 401 ? (authError==='denied'?'Acceso cancelado o cuenta no autorizada.':'') : error.message);
        }
      } finally { if (restoring) busy = false; }
    })();
    return ()=>{ac.abort();clearSession();if(dialog.open)dialog.close();};
  }
};
