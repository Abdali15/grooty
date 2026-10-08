let csrf='';
export async function commerceRequest(path,{method='GET',body,signal}={}){
 if(!/^\/(?!\/)[\w/?=&-]+$/.test(path))throw Error('Ruta inválida.');
 const controller=new AbortController(),cancel=()=>controller.abort(signal?.reason),timer=setTimeout(()=>controller.abort(new DOMException('El servicio tardó demasiado. Reintenta.','TimeoutError')),10000);
 if(signal?.aborted)cancel();else signal?.addEventListener('abort',cancel,{once:true});
 try{
 const response=await fetch('/api'+path,{method,credentials:'same-origin',headers:{Accept:'application/json',...(body?{'Content-Type':'application/json'}:{}),...(method!=='GET'?{'X-CSRF-Token':csrf}:{})},body:body?JSON.stringify(body):undefined,signal:controller.signal});
 if(!response.headers.get('content-type')?.includes('application/json'))throw Error('El servicio todavía no está conectado.');
 const value=await response.json();if(!response.ok){const e=Error(value.error||'No se pudo completar la operación.');e.status=response.status;throw e;}if(value.csrf)csrf=value.csrf;return value;
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
}
export const clearCommerceSession=()=>{csrf='';};
