import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {commerceRequest,clearCommerceSession} from '../src/lib/commerce-client.js';
const originalFetch=globalThis.fetch;
afterEach(()=>{globalThis.fetch=originalFetch;clearCommerceSession();});
test('component cancellation preserves the request deadline instead of disabling it',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const component=new AbortController();globalThis.fetch=async(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));
 const pending=commerceRequest('/auth/config',{signal:component.signal});const rejected=assert.rejects(pending,{name:'TimeoutError'});t.mock.timers.tick(10001);await rejected;assert.equal(component.signal.aborted,false);
});
test('leaving a view immediately cancels its API request',async()=>{
 const component=new AbortController();globalThis.fetch=async(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));
 const pending=commerceRequest('/account/session',{signal:component.signal}),rejected=assert.rejects(pending,{name:'AbortError'});component.abort();await rejected;
});
test('server CSRF remains in memory, goes only to same-origin writes and is cleared on logout',async()=>{
 let step=0;globalThis.fetch=async(url,options)=>{assert.ok(url.startsWith('/api/'));assert.equal(options.credentials,'same-origin');if(step===0)assert.equal(options.headers['X-CSRF-Token'],undefined);if(step===1)assert.equal(options.headers['X-CSRF-Token'],'test-csrf');if(step===2)assert.equal(options.headers['X-CSRF-Token'],'');step++;return {ok:true,headers:new Headers({'content-type':'application/json'}),json:async()=>step===1?{csrf:'test-csrf'}:{ok:true}};};
 await commerceRequest('/account/session');await commerceRequest('/account/profile',{method:'PUT',body:{displayName:'test'}});clearCommerceSession();await commerceRequest('/account/logout',{method:'POST',body:{}});assert.equal(step,3);
 await assert.rejects(commerceRequest('//attacker.example'),/Ruta/);
});
