const messages=Object.freeze({
 'order.registered':['Pedido registrado','Tu pedido quedó registrado y está pendiente de pago.'],
 'payment.paid':['Pago confirmado','El proveedor confirmó tu pago. Prepararemos tu pedido.'],
 'payment.payment_failed':['Pago no completado','El proveedor no confirmó el pago. Revisa el estado en tu cuenta.'],
 'preorder.available':['Tu preventa llegó','Tu figura está disponible. Tienes 7 días para completar la compra. Revisa tu cuenta y las instrucciones de la tienda.'],
 'preorder.reminder':['Plazo de preventa','El plazo de compra de tu preventa está próximo a vencer.'],
 'order.processing':['Pedido en preparación','Estamos preparando tu pedido.'],
 'order.shipped':['Pedido enviado','Tu pedido ha sido enviado. Consulta los detalles en tu cuenta.'],
 'payment.refunded':['Reembolso efectuado','El proveedor confirmó el reembolso. Revisa tu cuenta.']
});
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function notificationTemplate(kind,resourceId,origin){
 const [subject,text]=messages[kind]||['Actualización de Grooty Store','Hay una actualización sobre tu solicitud.'];
 return {subject,text:`${text}\nReferencia: ${resourceId}\nMi cuenta: ${origin}/cuenta`,html:`<!doctype html><html lang="es"><body><h1>${escape(subject)}</h1><p>${escape(text)}</p><p>Referencia: ${escape(resourceId)}</p><p><a href="${escape(origin)}/cuenta">Consultar mi cuenta</a></p></body></html>`};
}
export class DevelopmentNotifier {
 async send(message){console.info('Notification development only',{kind:message.kind,resourceId:message.resourceId});return {delivered:false};}
}
export class ResendNotifier {
 constructor(env,fetcher=fetch){this.env=env;this.fetcher=fetcher;}
 async send(message){
  const r=await this.fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+this.env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'grooty-'+message.id},body:JSON.stringify({from:this.env.EMAIL_FROM,to:[message.to],subject:message.subject,html:message.html,text:message.text}),signal:AbortSignal.timeout(8000)});
  if(!r.ok)throw Error('Notification provider failure');return {accepted:true,delivered:false};
  // Provider acceptance is not a delivery receipt. Delivery webhook integration is still required.
 }
}
