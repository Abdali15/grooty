import {esc,$} from '../lib/dom.js';
import {commerceRequest,clearCommerceSession} from '../lib/commerce-client.js';
import {money} from '../lib/format.js';
export const account={
 render(){return {title:'Mi cuenta · Grooty Store',description:'Tus pedidos y tu cuenta de Grooty Store.',html:`<section class="container commerce-wrap"><p class="eyebrow">Tu universo Grooty</p><h1 class="h-page">Mi cuenta</h1><p class="page-sub">Tu colección, tus pedidos y tus solicitudes en un solo lugar.</p><div data-account aria-live="polite"><p>Comprobando sesión…</p></div><p data-account-status role="status"></p></section>`};},
 mount(root){
  const ac=new AbortController(),target=$('[data-account]',root),status=$('[data-account-status]',root);let session;
  const api=(path,options={})=>commerceRequest(path,{...options,signal:ac.signal});
  async function load(){
   try{
    session=await api('/account/session');if(ac.signal.aborted)return;
    target.innerHTML=`<div class="commerce-grid"><article class="commerce-panel"><h2>Hola, coleccionista.</h2><p>${esc(session.user.email)} · ${esc(session.user.provider)}</p><form data-profile><label class="admin-field">Nombre para tu perfil<input name="displayName" maxlength="120" required autocomplete="name"></label><button class="btn btn-secondary">Guardar nombre</button></form><div class="commerce-actions"><button class="link-btn" data-logout>Cerrar sesión</button><button class="link-btn" data-revoke>Cerrar todas mis sesiones</button></div><details><summary>Solicitar eliminación de cuenta</summary><p>Registraremos tu solicitud para revisar la eliminación y los registros comerciales que deban conservarse.</p><button class="btn btn-secondary" data-delete>Registrar solicitud</button></details></article><article class="commerce-panel"><h2>Mis pedidos</h2><div data-orders>Cargando pedidos…</div></article>${session.user.role!=='CUSTOMER'?`<article class="commerce-panel"><h2>Acceso administrativo</h2><p>Rol: ${esc(session.user.role)}. La tienda comprueba tus permisos en cada operación.</p>${!session.mfaEnrolled?'<button class="btn btn-secondary" data-enroll>Configurar segundo factor</button>':''}<div data-mfa-secret></div><form data-mfa><label class="admin-field">Código de tu autenticador<input name="code" pattern="[0-9]{6}" inputmode="numeric" maxlength="6" autocomplete="one-time-code" required></label><button class="btn btn-primary">Verificar MFA</button></form>${session.mfaVerified?'<div class="commerce-actions"><a class="btn btn-secondary" href="/admin">Catálogo</a><a class="btn btn-secondary" href="/operaciones">Pedidos y permisos</a></div>':'<p>Verifica MFA para abrir las herramientas del panel.</p>'}</article>`:''}</div>`;
    const {orders}=await api('/account/orders');if(ac.signal.aborted)return;$('[data-orders]',root).innerHTML=orders.length?orders.map(o=>`<article class="commerce-order"><a href="/checkout?order=${esc(o.id)}">Pedido ${esc(o.id.slice(0,8))}</a><p>${esc(o.status)} · ${money(Number(o.total_cents)/100)}</p></article>`).join(''):'<p>Aún no tienes pedidos registrados.</p>';
   }catch(e){
    if(ac.signal.aborted)return;
    if(e.status!==401){status.textContent=e.message;target.innerHTML='<a class="btn btn-secondary" href="/cuenta?retry=1">Reintentar</a>';return;}
    try{const flags=await api('/auth/config');if(ac.signal.aborted)return;target.innerHTML=`<article class="commerce-panel commerce-login"><h2>Tu próxima figura empieza aquí.</h2><p>Entra con tu cuenta. No necesitas crear una contraseña.</p>${flags.google?'<a class="btn btn-primary" href="/api/auth/google/start">Continuar con Google</a>':''}${flags.microsoft?'<a class="btn btn-secondary" href="/api/auth/microsoft/start">Continuar con Microsoft</a>':''}${!flags.google&&!flags.microsoft?'<p>El acceso con cuentas está pendiente de configuración.</p>':''}<p>El registro crea una cuenta de comprador. El acceso administrativo requiere autorización y MFA.</p></article>`;}catch(error){status.textContent=error.message;}
   }
  }
  root.addEventListener('submit',async e=>{
   if(!e.target.matches('[data-profile],[data-mfa]'))return;e.preventDefault();status.textContent='Guardando…';
   try{const values=Object.fromEntries(new FormData(e.target));await api(e.target.matches('[data-mfa]')?'/account/mfa/verify':'/account/profile',{method:e.target.matches('[data-mfa]')?'POST':'PUT',body:values});status.textContent='Cambios confirmados por el servidor.';await load();}catch(error){status.textContent=error.message;}
  },{signal:ac.signal});
  root.addEventListener('click',async e=>{
   const b=e.target.closest('[data-logout],[data-revoke],[data-delete],[data-enroll]');if(!b)return;b.disabled=true;
   try{
    if(b.hasAttribute('data-enroll')){const m=await api('/account/mfa/enroll',{method:'POST',body:{}});if(ac.signal.aborted)return;const box=$('[data-mfa-secret]',root);box.innerHTML='<p>Añade esta clave en tu aplicación autenticadora y verifica el código. Guarda la clave de forma privada.</p><code data-secret></code>';$('[data-secret]',box).textContent=m.secret;return;}
    await api(b.hasAttribute('data-delete')?'/account/deletion-request':b.hasAttribute('data-revoke')?'/account/revoke-sessions':'/account/logout',{method:'POST',body:{}});clearCommerceSession();status.textContent=b.hasAttribute('data-delete')?'Solicitud registrada.':'Sesión cerrada.';await load();
   }catch(error){status.textContent=error.message;}finally{b.disabled=false;}
  },{signal:ac.signal});
  load();return ()=>ac.abort();
 }
};
