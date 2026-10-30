const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const jwt=require('jsonwebtoken');
const {PrismaClient}=require('@prisma/client');
const {createApp}=require('../../app');
const {hash}=require('../../platform/storeAuth');
const db=new PrismaClient();
let server,url;
const uid={super:'super-user',ownerA:'owner-a',ownerB:'owner-b',brandA:'brand-a-user',brandB:'brand-b-user'};
const authUsers=new Map(),setupEmails=[];
const authClients={
 async findUserByEmail(email){return authUsers.get(email)||null;},
 async inviteUserByEmail(email){const user={id:'supabase-'+email,email,emailConfirmed:false};authUsers.set(email,user);uid[email.split('@')[0]]=user.id;return user;},
 async sendSetupEmail(email,emailConfirmed){setupEmails.push({email,emailConfirmed});}
};
async function call(path,{actor='super',method='GET',body,token,headers={}}={}){
 const auth=token || (actor ? actor : null);
 const response=await fetch(url+'/api'+path,{method,headers:{...(auth?{Authorization:'Bearer '+auth}:{}),...(body?{'Content-Type':'application/json'}:{}),...headers},body:body?JSON.stringify(body):undefined});
 const raw=await response.text();return {status:response.status,body:raw?JSON.parse(raw):null,headers:response.headers};
}
async function ok(path,options){const r=await call(path,options);assert.ok(r.status>=200&&r.status<300,JSON.stringify(r));return r.body?.data ?? r.body;}
before(async()=>{
 process.env.BOOTSTRAP_PLATFORM_ADMIN_EMAIL='super@example.test';
 assert.match(process.env.TEST_DATABASE_URL||'',/127\.0\.0\.1:\d+\/ilmio_test_/);
 for(const [role,id]of Object.entries(uid))await db.adminProfile.create({data:{id,supabaseUserId:id,email:role+'@example.test',isPlatformAdmin:false}});
 for(const id of ['org-a','org-b'])await db.organization.create({data:{id,name:id}});
 await db.orgMembership.createMany({data:[{profileId:uid.ownerA,orgId:'org-a'},{profileId:uid.ownerB,orgId:'org-b'}]});
 for(const [id,orgId]of [['brand-a','org-a'],['brand-b','org-b']])await db.brand.create({data:{id,orgId,name:id,slug:id}});
 await db.brandMembership.createMany({data:[{profileId:uid.brandA,brandId:'brand-a'},{profileId:uid.brandB,brandId:'brand-b'}]});
 const passwordHash=await hash('tablet-password-123');
 for(const id of ['downtown','marina'])await db.store.create({data:{id,orgId:'org-a',name:id,slug:id,loginCode:id,passwordHash}});
 const app=createApp({db,authClients,verifyIdentity:async token=>{if(!uid[token])throw new (require('../../platform/http').Problem)(401,'Invalid admin session.');return {id:uid[token],email:token+'@example.test',email_confirmed_at:new Date().toISOString()};}});
 server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));url='http://127.0.0.1:'+server.address().port;
});
after(async()=>{await new Promise(resolve=>server.close(resolve));await db.$disconnect();});
test('migration preserves original IDs, data and published legacy shape',async()=>{
 const health=await fetch(url.replace(/\/api$/,'')+'/healthz');assert.equal(health.status,200);
 const me=await ok('/admin/me');assert.equal(me.isPlatformAdmin,true);assert.equal((await db.auditLog.findFirst({where:{action:'bootstrap'}})).actorId,uid.super);
 const p=await db.product.findUnique({where:{id:'existing-product'}});
 assert.equal(p.categoryId,'existing-category');assert.equal(p.priceAmount.toString(),'12.5');assert.equal(p.legacyPrice,'AED 12.50');assert.equal(p.ingredients,'Milk and cocoa');
 const r=await call('/products/available',{actor:null});assert.equal(r.status,200);assert.equal(r.body.data[0]._id,'existing-product');assert.equal(r.body.data[0].price,'AED 12.50');
 const c=await call('/categories',{actor:null,headers:{'User-Agent':'legacy-tablet/1.0'}});assert.equal(c.body.data[0].id,'drinks');assert.equal(c.body.data[0].order,2);
 const hit=await db.legacyRouteHit.findFirst({where:{route:'categories'},orderBy:{at:'desc'}});assert.equal(hit.userAgent,'legacy-tablet/1.0');assert.ok(hit.ip);assert.ok(hit.at instanceof Date);
});
test('platform provisioning is invite-only and brand operations are role scoped',async()=>{
 const storeCredentials=await call('/admin/orgs/org-a/stores');
 assert.equal(storeCredentials.status,200);
 assert.equal(storeCredentials.body.data.find(store=>store.id==='downtown').passwordConfigured,true);
 assert.equal(Object.hasOwn(storeCredentials.body.data[0],'passwordHash'),false);
 const platformStores=await ok('/admin/stores');
 assert.equal(platformStores.some(store=>store.name==='downtown'&&store.ownerName==='org-a'),true);
 assert.equal(Object.hasOwn(platformStores[0],'passwordHash'),false);
 assert.equal((await call('/admin/stores',{actor:'ownerA'})).status,403);
 const orgBrand=(await call('/admin/brands',{actor:'ownerA',method:'POST',body:{orgId:'org-a',name:'Forbidden Brand',slug:'forbidden'}}));assert.equal(orgBrand.status,403);
 const created=await ok('/admin/brands',{method:'POST',body:{orgId:'org-a',name:'Provisioned Brand',slug:'provisioned'}});assert.equal(created.slug,'provisioned');
 assert.equal((await call('/admin/brands/brand-a/categories',{actor:'ownerA'})).status,404);
 assert.equal((await call('/admin/brands/brand-a/items',{actor:'ownerA',method:'POST',body:{name:'Not allowed'}})).status,404);
 assert.equal((await call('/admin/brands/brand-a/admins',{actor:'ownerA'})).status,403);
 const originalSlug=(await db.brand.findUnique({where:{id:'brand-a'}})).slug;
 assert.equal((await call('/admin/brands/brand-a/settings',{actor:'brandA',method:'PUT',body:{slug:'brand-a-changed'}})).status,403);
 assert.equal((await db.brand.findUnique({where:{id:'brand-a'}})).slug,originalSlug);
 const invitation=await call('/admin/brands/brand-a/admins',{method:'POST',body:{email:'brandlead@example.test',name:'Brand Lead'}});
 assert.equal(invitation.status,201);assert.equal(invitation.body.data.inviteSent,true);assert.equal(invitation.body.data.user.email,'brandlead@example.test');assert.equal(JSON.stringify(invitation.body).includes('password'),false);
 const membershipId=invitation.body.data.membership.id;
 const profile=await db.adminProfile.findUnique({where:{email:'brandlead@example.test'}});assert.equal(profile.supabaseUserId,'supabase-brandlead@example.test');
 const listed=await ok('/admin/brands/brand-a/admins');assert.equal(listed.some(m=>m.id===membershipId),true);
 assert.equal((await call('/admin/brands/brand-a/admins',{method:'POST',body:{email:'brandlead@example.test'}})).status,409);
 assert.equal((await call('/admin/brands/brand-a/admins',{method:'POST',body:{email:'another@example.test',newPassword:'must-not-be-accepted'}})).status,400);
 assert.equal((await call('/admin/brands/brand-a/items',{actor:'brandlead'})).status,200);
 assert.equal((await call('/admin/orgs/org-a/stores',{actor:'brandlead'})).status,404);
 assert.equal((await call('/admin/brands/brand-a/admins/'+membershipId+'/resend-invite',{method:'POST',body:{}})).status,204);
 assert.equal(setupEmails.at(-1).email,'brandlead@example.test');
 const auditRow=await db.auditLog.findFirst({where:{action:'brand_admin.provisioned',brandId:'brand-a'}});assert.deepEqual(auditRow.diff,{inviteSent:true});
 await ok('/admin/brands/brand-a/admins/'+membershipId,{method:'DELETE'});
 assert.equal(authUsers.has('brandlead@example.test'),true);
 assert.equal((await call('/admin/me',{actor:'brandlead'})).status,403);
});
test('store create and reset accept six-character passwords and reject shorter values',async()=>{
 const details={name:'Branch password test',slug:'branch-password-test',loginCode:'branch-password-test',password:'abcde'};
 assert.equal((await call('/admin/orgs/org-a/stores',{method:'POST',body:details})).status,400);
 const created=await call('/admin/orgs/org-a/stores',{method:'POST',body:{...details,password:'abc123'}});
 assert.equal(created.status,201);
 const storeId=created.body.data.id;
 assert.equal(created.body.data.passwordConfigured,true);
 assert.equal((await call('/admin/orgs/org-a/stores/'+storeId+'/password',{method:'POST',body:{newPassword:'12345'}})).status,400);
 assert.equal((await call('/admin/orgs/org-a/stores/'+storeId+'/password',{method:'POST',body:{newPassword:'123456'}})).status,204);
});
let ca,cb,pa,pb;
test('two independent owners can reuse category codes; APIs and DB reject cross-brand attaches',async()=>{
 ca=await ok('/admin/brands/brand-a/categories',{actor:'brandA',method:'POST',body:{code:'drinks',name:'A drinks'}});
 cb=await ok('/admin/brands/brand-b/categories',{actor:'brandB',method:'POST',body:{code:'drinks',name:'B drinks'}});
 pa=await ok('/admin/brands/brand-a/items',{actor:'brandA',method:'POST',body:{name:'A cocoa',categoryId:ca.id,priceAmount:'12.50',description:'A',ingredients:'Milk',imageUrl:'https://example.test/a.png'}});
 pb=await ok('/admin/brands/brand-b/items',{actor:'brandB',method:'POST',body:{name:'B tea',categoryId:cb.id,priceAmount:'7.00',imageUrl:'https://example.test/b.png'}});
 const bad=await call('/admin/brands/brand-a/items',{actor:'brandA',method:'POST',body:{name:'Bad attach',categoryId:cb.id,priceAmount:'1.00'}});assert.equal(bad.status,400);
 await assert.rejects(()=>db.product.update({where:{id:pa.id},data:{categoryId:cb.id}}));
 for(const actor of ['ownerA','brandA'])for(const suffix of ['items','categories','settings','stores','audit-log']){
  const r=await call('/admin/brands/brand-b/'+suffix,{actor});assert.equal(r.status,404);
 }
 assert.equal((await call('/admin/orgs/org-b/stores',{actor:'ownerA'})).status,404);
 assert.equal((await call('/admin/orgs/org-a/stores/downtown/password',{actor:'brandA',method:'POST',body:{newPassword:'another-password'}})).status,404);
});
test('only Super Admin authorizes cross-owner assignments; physical stores stay under their owner',async()=>{
 await ok('/admin/orgs/org-a/brand-assignments',{actor:'ownerA',method:'POST',body:{storeId:'downtown',brandId:'brand-a'}});
 await ok('/admin/orgs/org-a/brand-assignments',{actor:'ownerA',method:'POST',body:{storeId:'marina',brandId:'brand-a'}});
 assert.equal((await call('/admin/orgs/org-a/brand-assignments',{actor:'ownerA',method:'POST',body:{storeId:'downtown',brandId:'brand-b'}})).status,403);
 await ok('/admin/orgs/org-a/brand-assignments',{method:'POST',body:{storeId:'downtown',brandId:'brand-b'}});
 await assert.rejects(()=>db.storeBrand.create({data:{storeId:'marina',brandId:'brand-b',approvedBy:uid.ownerA}}));
 assert.equal((await call('/admin/orgs/org-a/stores/downtown/sessions',{actor:'ownerB'})).status,404);
 const list=await ok('/admin/brands/brand-b/stores',{actor:'brandB'});assert.equal(list.length,1);assert.equal(list[0].store.id,'downtown');
});
let downtown,marina;
test('store password verification does not create a session',async()=>{
 const existingSessions=await db.storeSession.count();
 const valid=await call('/auth/store/verify-password',{actor:null,method:'POST',body:{loginCode:'downtown',password:'tablet-password-123'}});
 assert.equal(valid.status,204);assert.equal(await db.storeSession.count(),existingSessions);
});
test('published snapshots, store isolation, overrides, ETags and realms',async()=>{
 await ok('/admin/brands/brand-a/publish',{actor:'brandA',method:'POST',body:{}});
 await ok('/admin/brands/brand-b/publish',{actor:'brandB',method:'POST',body:{}});
 downtown=await ok('/auth/store/login',{actor:null,method:'POST',body:{loginCode:'downtown',password:'tablet-password-123'}});
 marina=await ok('/auth/store/login',{actor:null,method:'POST',body:{loginCode:'marina',password:'tablet-password-123'}});
 let r=await call('/menu',{token:downtown.accessToken});assert.equal(r.status,200);assert.equal(r.body.brands.length,2);
 assert.equal((await call('/menu',{actor:null})).status,401);
 assert.equal((await call('/menu',{token:jwt.sign({aud:'authenticated',sub:uid.brandA},'dummy-admin-test-key')})).status,403);
 assert.equal((await call('/admin/me',{token:downtown.accessToken})).status,403);
 assert.equal((await call('/menu?brandId=brand-b',{token:marina.accessToken})).status,403);
 assert.equal((await call('/menu',{token:downtown.refreshToken})).status,401);
 const etag=r.headers.get('etag');assert.equal((await call('/menu',{token:downtown.accessToken,headers:{'If-None-Match':etag}})).status,304);
 await ok('/admin/brands/brand-a/items/'+pa.id,{actor:'brandA',method:'PUT',body:{name:'Unpublished A'}});
 r=await call('/menu',{token:downtown.accessToken});assert.equal(r.body.brands.find(b=>b.id==='brand-a').categories[0].items[0].name,'A cocoa');
 await ok('/admin/brands/brand-a/publish',{actor:'brandA',method:'POST',body:{}});
 await ok('/admin/brands/brand-a/stores/downtown/items/'+pa.id+'/override',{actor:'brandA',method:'PUT',body:{priceAmount:'20.00',isSoldOut:true}});
 const assignmentFlags=await db.storeBrand.findMany({where:{brandId:'brand-a'},select:{storeId:true,unpublishedChanges:true}});
 assert.equal(assignmentFlags.find(a=>a.storeId==='downtown').unpublishedChanges,true);
 assert.equal(assignmentFlags.find(a=>a.storeId==='marina').unpublishedChanges,false);
 await ok('/admin/brands/brand-a/stores/downtown/publish',{actor:'brandA',method:'POST',body:{}});
 r=await call('/menu',{token:downtown.accessToken,headers:{'If-None-Match':etag}});assert.equal(r.status,200);
 const item=r.body.brands.find(b=>b.id==='brand-a').categories[0].items[0];assert.equal(item.name,'Unpublished A');assert.equal(item.priceAmount,'20');assert.equal(item.availability,'soldout');
 const m=await call('/menu',{token:marina.accessToken});assert.equal(m.body.brands.length,1);assert.equal(m.body.brands[0].categories[0].items[0].priceAmount,'12.5');
 const legacy=await call('/products/available',{actor:null});assert.equal(legacy.body.data.length,1);assert.equal(legacy.body.data[0]._id,'existing-product');
});
test('concurrent publishes are ordered; DB snapshots and pointers are immutable/scoped',async()=>{
 const results=await Promise.all([ok('/admin/brands/brand-a/stores/downtown/publish',{actor:'brandA',method:'POST',body:{}}),ok('/admin/brands/brand-a/stores/downtown/publish',{actor:'brandA',method:'POST',body:{}})]);
 assert.equal(Math.abs(results[0][0].version-results[1][0].version),1);
 const a=await db.storeBrand.findUnique({where:{storeId_brandId:{storeId:'downtown',brandId:'brand-a'}},include:{currentMenu:true}});
 await assert.rejects(()=>db.menuVersion.update({where:{id:a.currentMenuVersionId},data:{snapshot:{bad:true}}}));
 const other=await db.storeBrand.findUnique({where:{storeId_brandId:{storeId:'downtown',brandId:'brand-b'}}});
 await assert.rejects(()=>db.storeBrand.update({where:{id:a.id},data:{currentMenuVersionId:other.currentMenuVersionId}}));
 await assert.rejects(()=>db.productStoreOverride.create({data:{storeBrandId:a.id,productId:pb.id,brandId:'brand-a',isSoldOut:true}}));
 await ok('/admin/brands/brand-a/items/'+pa.id,{actor:'brandA',method:'PUT',body:{isActive:false}});
 await ok('/admin/brands/brand-a/stores/downtown/publish',{actor:'brandA',method:'POST',body:{}});
 const menu=await call('/menu',{token:downtown.accessToken});assert.equal(menu.body.brands.find(b=>b.id==='brand-a').categories[0].items.length,0);
 assert.ok(await db.auditLog.count({where:{brandId:'brand-a',action:'publish'}}));
});
test('refresh rotates once; revoke/password reset reject reads before 304',async()=>{
 const refreshed=await ok('/auth/store/refresh',{actor:null,method:'POST',body:{refreshToken:downtown.refreshToken}});
 assert.equal((await call('/auth/store/refresh',{actor:null,method:'POST',body:{refreshToken:downtown.refreshToken}})).status,401);
 downtown=refreshed;
 const menu=await call('/menu',{token:downtown.accessToken});const etag=menu.headers.get('etag');
 const claims=jwt.decode(downtown.accessToken);
 await ok('/admin/orgs/org-a/stores/downtown/sessions/'+claims.sessionId+'/revoke',{actor:'ownerA',method:'POST',body:{}});
 assert.equal((await call('/menu',{token:downtown.accessToken,headers:{'If-None-Match':etag}})).status,401);
 await ok('/admin/orgs/org-a/stores/marina/password',{actor:'ownerA',method:'POST',body:{newPassword:'new-marina-password'}});
 assert.equal((await call('/menu',{token:marina.accessToken})).status,401);
});
test('two app instances share durable login limits and generic failures',async()=>{
 const a=await call('/auth/store/login',{actor:null,method:'POST',body:{loginCode:'unknown-code',password:'incorrect-password'}});
 const b=await call('/auth/store/login',{actor:null,method:'POST',body:{loginCode:'downtown',password:'incorrect-password'}});
 assert.equal(a.status,401);assert.deepEqual(a.body,b.body);
 const app2=createApp({db,verifyIdentity:async()=>null});const second=app2.listen(0,'127.0.0.1');await new Promise(resolve=>second.once('listening',resolve));
 try{for(let i=0;i<3;i++)assert.equal((await call('/auth/store/login',{actor:null,method:'POST',body:{loginCode:'downtown',password:'incorrect-password'}})).status,401);
 const r=await fetch('http://127.0.0.1:'+second.address().port+'/api/auth/store/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({loginCode:'downtown',password:'incorrect-password'})});assert.equal(r.status,429);assert.ok(r.headers.get('retry-after'));
 }finally{await new Promise(resolve=>second.close(resolve));}
});
