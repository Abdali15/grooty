import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MercadoPagoGateway,MockGateway,gateway} from '../payments/gateway.js';
import {commerceConfig} from '../commerce/config.js';
const orderId='00000000-0000-4000-8000-000000000001';
const cfg={origin:'https://store.example.test',env:{MP_ACCESS_TOKEN:'fake-test-only',MP_COLLECTOR_ID:'99'}};
const payment={id:123,collector_id:99,currency_id:'PEN',live_mode:false,status:'approved',status_detail:'accredited',transaction_amount:'24.50',transaction_amount_refunded:0,external_reference:orderId,date_last_updated:'2026-10-08T06:00:00.000Z'};
const adapter=(data,onRequest=()=>{})=>new MercadoPagoGateway(cfg,async(url,options)=>{onRequest(url,options);return {ok:true,json:async()=>data};});
test('sandbox payment is retrieved from fixed official origin with server credential; redirects prohibited',async()=>{
 const value=await adapter(payment,(url,options)=>{
  assert.equal(url,'https://api.mercadopago.com/v1/payments/123');assert.equal(options.redirect,'error');assert.equal(options.headers.Authorization,'Bearer fake-test-only');assert.ok(options.signal);
 }).retrievePayment('123');assert.equal(value.amountCents,2450);assert.equal(value.currency,'PEN');assert.equal(value.environment,'sandbox');assert.equal(value.state,'PAID');assert.equal(value.orderId,orderId);
});
test('sandbox denies wrong receiver, currency, live mode, payment ID or reference',async()=>{
 for(const change of [{collector_id:100},{currency_id:'USD'},{live_mode:true},{live_mode:undefined},{id:124},{external_reference:'approved-in-browser'}])await assert.rejects(adapter({...payment,...change}).retrievePayment('123'));
 let calls=0;await assert.rejects(adapter(payment,()=>calls++).retrievePayment('https://attacker.example'));assert.equal(calls,0);
});
test('pending, unaccredited, refunded and incomplete transactions never become paid',async()=>{
 for(const change of [{status:'pending'},{status:'in_process'},{status:'refunded'},{status:'constructor'},{status:'__proto__'},{status_detail:'pending_contingency'},{captured:false},{transaction_amount_refunded:1},{transaction_amount_refunded:undefined},{date_last_updated:undefined},{date_last_updated:'invalid'},{transaction_amount:'24.501'}])await assert.rejects(adapter({...payment,...change}).retrievePayment('123'));
});
test('checkout uses authoritative cents, idempotency and identical non-authoritative return URLs',async()=>{
 const value=await adapter({id:'preference-test',collector_id:99,sandbox_init_point:'https://www.mercadopago.com.pe/checkout/v1/redirect?pref_id=test'},(url,options)=>{
  assert.equal(url,'https://api.mercadopago.com/checkout/preferences');assert.equal(options.headers['X-Idempotency-Key'],orderId);
  const body=JSON.parse(options.body);assert.equal(body.items[0].unit_price,24.5);assert.equal(body.items[0].currency_id,'PEN');assert.equal(body.external_reference,orderId);
  assert.equal(body.notification_url,cfg.origin+'/api/payments/mercadopago/webhook');assert.equal(new Set(Object.values(body.back_urls)).size,1);assert.equal(body.expires,true);
 }).createCheckout({id:orderId,expires_at:'2026-10-08T06:15:00Z'},[{product_id:1,title:'Test figure',quantity:1,unit_cents:2450}]);assert.equal(value.environment,'sandbox');
});
test('unsafe checkout destinations and provider errors cannot create a successful result',async()=>{
 for(const url of ['http://www.mercadopago.com.pe/pay','https://mercadopago.com.pe.attacker.example/pay','https://user:password@mercadopago.com.pe/pay','https://mercadopago.com.pe:9443/pay'])await assert.rejects(adapter({id:'test',collector_id:99,sandbox_init_point:url}).createCheckout({id:orderId,expires_at:'2026-10-08T06:15:00Z'},[]));
 await assert.rejects(new MercadoPagoGateway(cfg,async()=>({ok:false})).retrievePayment('123'),/pasarela/);
 await assert.rejects(new MercadoPagoGateway(cfg,async()=>{throw new Error('Network failure');}).retrievePayment('123'),/Network/);
});
test('Culqi remains explicitly unavailable and mock cannot report real payment success',async()=>{
 assert.throws(()=>commerceConfig({NODE_ENV:'development',PAYMENTS_ENABLED:'true',PAYMENT_PROVIDER:'culqi',PAYMENT_ENVIRONMENT:'sandbox'}),/certificación/);
 await assert.rejects(gateway({provider:'culqi'}).createCheckout({id:orderId}),/no configurada/);
 const result=await new MockGateway().createCheckout({id:orderId});assert.equal(result.url,null);assert.equal(result.environment,'mock');assert.equal(result.state,undefined);await assert.rejects(new MockGateway().retrievePayment('123'));
});
