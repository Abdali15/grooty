let csrf='';
export async function commerceRequest(path,{method='GET',body,signal}={}){
 if(!/^\/(?!\/)[\w/?=&-]+$/.test(path))throw Error('Ruta inválida.');
 const response=await fetch('/api'+path,{method,credentials:'same-origin',headers:{Accept:'application/json',...(body?{'Content-Type':'application/json'}:{}),...(method!=='GET'?{'X-CSRF-Token':csrf}:{})},body:body?JSON.stringify(body):undefined,signal:signal||AbortSignal.timeout(10000)});
 if(!response.headers.get('content-type')?.includes('application/json'))throw Error('El servicio todavía no está conectado.');
 const value=await response.json();if(!response.ok){const e=Error(value.error||'No se pudo completar la operación.');e.status=response.status;throw e;}if(value.csrf)csrf=value.csrf;return value;
}
export const clearCommerceSession=()=>{csrf='';};
