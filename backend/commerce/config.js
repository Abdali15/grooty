import { config,HttpError } from '../lib/security.js';
export function commerceConfig(env=process.env){
 const cfg=config(env), flags={};
 for(const k of ['AUTH_GOOGLE_ENABLED','AUTH_MICROSOFT_ENABLED','PAYMENTS_ENABLED','PREORDERS_ENABLED','CUSTOM_REQUESTS_ENABLED','EMAIL_NOTIFICATIONS_ENABLED']){
   if(env[k]!==undefined&&!['true','false'].includes(env[k]))throw new HttpError(503,'Flag de servicio inválido.');
   flags[k]=env[k]==='true';
 }
 if(env.ADMIN_MFA_REQUIRED==='false')throw new HttpError(503,'MFA administrativo es obligatorio.');
 if(flags.EMAIL_NOTIFICATIONS_ENABLED)throw new HttpError(503,'Entrega de notificaciones pendiente de verificación.');
 const paymentEnvironment=env.PAYMENT_ENVIRONMENT||'mock',provider=env.PAYMENT_PROVIDER||'mock';
 if(!['mock','sandbox','production'].includes(paymentEnvironment)||!['mock','mercadopago','culqi'].includes(provider))throw new HttpError(503,'Configuración de pago inválida.');
 // Production remains explicitly locked until provider certification and reconciliation tests.
 if(flags.PAYMENTS_ENABLED&&(paymentEnvironment==='production'||provider==='culqi'))throw new HttpError(503,'Integración pendiente de certificación.');
 if(flags.PAYMENTS_ENABLED&&((provider==='mock'&&paymentEnvironment!=='mock')||(provider==='mercadopago'&&paymentEnvironment!=='sandbox')))throw new HttpError(503,'Proveedor y entorno de pago incompatibles.');
 if(env.VERCEL_ENV==='preview'&&paymentEnvironment==='production')throw new HttpError(503,'Preview no admite credenciales productivas.');
 if(flags.AUTH_GOOGLE_ENABLED&&(!env.GOOGLE_CLIENT_ID||!env.GOOGLE_CLIENT_SECRET))throw new HttpError(503,'Configura Google antes de activar.');
 if(flags.AUTH_MICROSOFT_ENABLED&&(!env.MICROSOFT_CLIENT_ID||!env.MICROSOFT_CLIENT_SECRET))throw new HttpError(503,'Configura Microsoft antes de activar.');
 if(flags.PAYMENTS_ENABLED&&provider==='mercadopago'&&(!env.MP_ACCESS_TOKEN||!env.MP_WEBHOOK_SECRET||!env.MP_COLLECTOR_ID))throw new HttpError(503,'Configura sandbox de pagos antes de activar.');
 return {...cfg,flags,paymentEnvironment,provider,env};
}
