import {test} from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import {cents,cartInput,authorize,STATES,transition} from '../commerce/policy.js';
import {verifyMpSignature} from '../payments/gateway.js';
import {createHmac} from 'node:crypto';
// Fixed seeds make failures reproducible; coverage counts distinct generated inputs, not assertions.
const options=seed=>({seed,numRuns:1100});
test('1100 generated money cases: exact integer minor units, no rounding or scientific notation',()=>{
 const seen=new Set();fc.assert(fc.property(fc.integer({min:0,max:99999999}),fc.integer({min:0,max:99}),(whole,fraction)=>{
  const decimal=whole+'.'+String(fraction).padStart(2,'0');seen.add(decimal);assert.equal(cents(decimal),whole*100+fraction);
  assert.throws(()=>cents(decimal+'1'));assert.throws(()=>cents('-'+decimal));
 }),options(1001));assert.ok(seen.size>=1000);console.log('Distinct money inputs:',seen.size);
});
test('1100 generated carts: canonical item locks and attacker price/quantity rejected',()=>{
 const seen=new Set();fc.assert(fc.property(fc.integer({min:1,max:2000000000}),fc.integer({min:1,max:20}),fc.integer({min:21,max:2000000000}),(productId,quantity,badQty)=>{
  seen.add([productId,quantity,badQty].join(':'));const b={idempotencyKey:'property-test-key-'+productId,items:[{productId,quantity}],address:{name:'Test',phone:'999999999',line1:'Test',district:'Test',province:'Test',department:'Test'}};
  assert.equal(cartInput(b).items[0].quantity,quantity);assert.throws(()=>cartInput({...b,items:[{productId,quantity,unitPrice:0.01}]}));assert.throws(()=>cartInput({...b,items:[{productId,quantity:badQty}]}));assert.throws(()=>cartInput({...b,items:[...b.items,...b.items]}));
 }),options(1002));assert.ok(seen.size>=1000);console.log('Distinct cart attacks:',seen.size);
});
test('1100 generated RBAC time boundaries: no MFA, stale MFA, stale reauthentication, deny unknown roles',()=>{
 const now=Date.now(),seen=new Set();fc.assert(fc.property(fc.noBias(fc.integer({min:3600001,max:999999999})),fc.constantFrom('CATALOG_MANAGER','ORDER_MANAGER','ADMIN','SUPER_ADMIN'),(age,role)=>{
  seen.add(role+':'+age);assert.throws(()=>authorize({role},'catalog.write',{now}));assert.throws(()=>authorize({role,mfa_at:new Date(now-age)},'catalog.write',{now}));
  assert.throws(()=>authorize({role:'SUPER_ADMIN',mfa_at:new Date(now),reauthenticated_at:new Date(now-age)},'roles.manage',{critical:true,now}));
  assert.throws(()=>authorize({role:'CUSTOMER',mfa_at:new Date(now),reauthenticated_at:new Date(now)},'roles.manage',{critical:true,now}));
 }),options(1003));assert.ok(seen.size>=1000);console.log('Distinct RBAC cases:',seen.size);
});
test('1100 generated webhook tampering cases: legitimate HMAC accepted, altered reference rejected',()=>{
 const now=Date.now(),ts=String(Math.floor(now/1000)),seen=new Set();fc.assert(fc.property(fc.integer({min:1,max:2000000000}),fc.integer({min:1,max:2000000000}),(id,suffix)=>{
  seen.add(id+':'+suffix);const requestId='request-'+suffix,secret='property-test-secret',u=new URL('https://store.test/webhook?data.id='+id);
  const sig=createHmac('sha256',secret).update(`id:${id};request-id:${requestId};ts:${ts};`).digest('hex'),req={headers:{'x-request-id':requestId,'x-signature':`ts=${ts},v1=${sig}`}};
  assert.equal(verifyMpSignature(req,u,secret,now),String(id));u.searchParams.set('data.id',String(id+1));assert.throws(()=>verifyMpSignature(req,u,secret,now));
 }),options(1004));assert.ok(seen.size>=1000);console.log('Distinct webhook cases:',seen.size);
});
test('all order-state edges: defined legal graph and no illegal transition',()=>{
 for(const from of Object.keys(STATES))for(const to of Object.keys(STATES)){
  if(from===to)assert.equal(transition(from,to),false);else if(STATES[from].includes(to))assert.equal(transition(from,to),true);else assert.throws(()=>transition(from,to));
 }
});
