const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const jwt=require('jsonwebtoken');
const {PrismaClient}=require('@prisma/client');
const {createApp}=require('../../app');
const {hash}=require('../../platform/storeAuth');
const {duplicateGroups,mergeBrands}=require('../../scripts/reconcile-duplicate-brands');
const {mergeOrganizations}=require('../../scripts/reconcile-duplicate-organizations');
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
test('organization endpoints disambiguate duplicate names and reject new duplicate organizations',async()=>{
 await db.organization.createMany({data:[
  {id:'same-owner-a',name:'Il Mio Cioccolato'},
  {id:'same-owner-b',name:'Il Mio Cioccolato'}
 ]});
 const orgs=await ok('/admin/orgs');
 const duplicates=orgs.filter(org=>org.id.startsWith('same-owner-'));
 assert.equal(duplicates.length,2);
 assert.notEqual(duplicates[0].displayName,duplicates[1].displayName);
 assert.ok(duplicates.every(org=>org.displayName.includes(org.id)));
 const me=await ok('/admin/me');
 const meDuplicates=me.orgs.filter(org=>org.id.startsWith('same-owner-'));
 assert.deepEqual(meDuplicates.map(org=>org.displayName),duplicates.map(org=>org.displayName));
 assert.equal((await call('/admin/orgs',{method:'POST',body:{name:' il mio cioccolato '}})).status,409);
 const created=await ok('/admin/orgs',{method:'POST',body:{name:'Unique Organization'}});
 assert.equal(created.displayName,'Unique Organization');
 assert.equal((await call('/admin/orgs',{method:'POST',body:{name:'unique organization'}})).status,409);
});
test('platform dashboard reports recently active tablet devices and offline stores',async()=>{
 const now=new Date();
 await db.storeSession.createMany({data:[
  {id:'dashboard-online',storeId:'downtown',tokenVersion:0,refreshHash:'test-hash',deviceLabel:'Front counter',expiresAt:new Date(now.getTime()+86400000),lastSeenAt:now},
  {id:'dashboard-stale',storeId:'marina',tokenVersion:0,refreshHash:'test-hash',deviceLabel:'Old tablet',expiresAt:new Date(now.getTime()+86400000),lastSeenAt:new Date(now.getTime()-30*60*1000)}
 ]});
 const dashboard=await ok('/admin/dashboard');
 assert.equal(dashboard.onlineWindowMinutes,10);
 assert.equal(dashboard.stores.find(store=>store.id==='downtown').devices[0].deviceLabel,'Front counter');
 assert.deepEqual(dashboard.stores.find(store=>store.id==='marina').devices,[]);
 assert.equal((await call('/admin/dashboard',{actor:'ownerA'})).status,403);
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
test('store deletion removes only stores without published menu history',async()=>{
 const removable=await db.store.create({data:{
  id:'store-removable',orgId:'org-a',name:'Unpublished store',slug:'unpublished-store',
  loginCode:'unpublished-store',passwordHash:await hash('tablet-password-123')
 }});
 const assignment=await db.storeBrand.create({data:{storeId:removable.id,brandId:'brand-a',approvedBy:uid.super}});
 await db.storeSession.create({data:{
  id:'session-removable',storeId:removable.id,tokenVersion:0,refreshHash:'test-hash',
  expiresAt:new Date(Date.now()+86400000)
 }});
 const deleted=await call('/admin/orgs/org-a/stores/'+removable.id,{method:'DELETE'});
 assert.equal(deleted.status,204);
 assert.equal(await db.store.findUnique({where:{id:removable.id}}),null);
 assert.equal(await db.storeBrand.findUnique({where:{id:assignment.id}}),null);
 assert.equal(await db.storeSession.findUnique({where:{id:'session-removable'}}),null);
 const audit=await db.auditLog.findFirst({where:{action:'delete',storeId:removable.id}});
 assert.deepEqual(audit.diff,{removedAssignments:1,removedDeviceSessions:1});

 const protectedStore=await db.store.create({data:{
  id:'store-protected',orgId:'org-a',name:'Published store',slug:'published-store',
  loginCode:'published-store',passwordHash:await hash('tablet-password-123')
 }});
 const protectedAssignment=await db.storeBrand.create({data:{storeId:protectedStore.id,brandId:'brand-a',approvedBy:uid.super,nextVersion:1}});
 await db.menuVersion.create({data:{
  id:'protected-menu-version',storeBrandId:protectedAssignment.id,version:1,snapshot:{categories:[]}
 }});
 const rejected=await call('/admin/orgs/org-a/stores/'+protectedStore.id,{method:'DELETE'});
 assert.equal(rejected.status,409);
 assert.match(rejected.body.error,/published menu history/);
 assert.ok(await db.store.findUnique({where:{id:protectedStore.id}}));
 assert.ok(await db.storeBrand.findUnique({where:{id:protectedAssignment.id}}));
 assert.ok(await db.menuVersion.findUnique({where:{id:'protected-menu-version'}}));
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
 const downtownSessionId=jwt.decode(downtown.accessToken).sessionId;
 const staleCheckIn=new Date(Date.now()-11*60*1000);
 await db.storeSession.update({where:{id:downtownSessionId},data:{lastSeenAt:staleCheckIn}});
 let r=await call('/menu',{token:downtown.accessToken});assert.equal(r.status,200);assert.equal(r.body.brands.length,2);
 assert.ok((await db.storeSession.findUnique({where:{id:downtownSessionId}})).lastSeenAt>staleCheckIn);
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
test('Super Admin can atomically create brand branches and safely delete empty brands',async()=>{
 const details={name:'Brand-owned branch',slug:'brand-owned-branch',loginCode:'brand-owned-tablet',password:'tablet-123',address:'Main street',timezone:'Asia/Dubai'};
 assert.equal((await call('/admin/brands/brand-b/stores',{actor:'brandB',method:'POST',body:details})).status,403);
 const created=await call('/admin/brands/brand-b/stores',{method:'POST',body:details});
 assert.equal(created.status,201,JSON.stringify(created.body));
 assert.equal(created.body.data.passwordConfigured,true);
 assert.equal(Object.hasOwn(created.body.data,'passwordHash'),false);
 const assignment=await db.storeBrand.findUnique({where:{storeId_brandId:{storeId:created.body.data.id,brandId:'brand-b'}}});
 assert.ok(assignment);
 assert.equal((await db.store.findUnique({where:{id:created.body.data.id}})).address,'Main street');
 const branches=await ok('/admin/brands/brand-b/stores');
 assert.equal(branches.some(item=>item.store.id===created.body.data.id),true);

 assert.equal((await call('/admin/brands/brand-a',{method:'DELETE'})).status,400);
 assert.equal((await call('/admin/brands/brand-b',{method:'DELETE'})).status,400);
 const empty=await ok('/admin/brands',{method:'POST',body:{orgId:'org-a',name:'Disposable brand',slug:'disposable-brand'}});
 assert.equal((await call('/admin/brands/'+empty.id,{method:'DELETE'})).status,204);
 assert.equal(await db.brand.findUnique({where:{id:empty.id}}),null);
});
test('duplicate brand reconciliation preserves memberships, assignments, categories, assets and audit history',async()=>{
 await db.brand.createMany({data:[
  {id:'merge-canonical',orgId:'org-a',name:'Il Mio',slug:'merge-canonical'},
  {id:'merge-duplicate',orgId:'org-a',name:' il mio ',slug:'merge-duplicate'}
 ]});
 await db.brandMembership.create({data:{profileId:uid.brandA,brandId:'merge-duplicate'}});
 await db.category.create({data:{brandId:'merge-duplicate',code:'merge-category',name:'Merged category'}});
 await db.storeBrand.create({data:{storeId:'downtown',brandId:'merge-duplicate',approvedBy:uid.super}});
 await db.asset.create({data:{brandId:'merge-duplicate',publicId:'merge-asset',url:'https://example.test/merge.png'}});
 await db.auditLog.create({data:{actorType:'system',brandId:'merge-duplicate',entity:'Brand',entityId:'merge-duplicate',action:'old-event'}});
 const groups=duplicateGroups([
  {id:'merge-canonical',orgId:'org-a',name:'Il Mio'},
  {id:'merge-duplicate',orgId:'org-a',name:' il mio '}
 ]);
 assert.equal(groups.length,1);
 const result=await mergeBrands(db,'merge-canonical',['merge-duplicate']);
 assert.deepEqual(result.removedBrandIds,['merge-duplicate']);
 assert.equal(result.movedMemberships,1);
 assert.equal(result.movedAssignments,1);
 assert.equal(result.movedCategories,1);
 assert.equal(result.movedAssets,1);
 assert.equal(await db.brand.findUnique({where:{id:'merge-duplicate'}}),null);
 assert.ok(await db.brandMembership.findUnique({where:{profileId_brandId:{profileId:uid.brandA,brandId:'merge-canonical'}}}));
 assert.ok(await db.storeBrand.findUnique({where:{storeId_brandId:{storeId:'downtown',brandId:'merge-canonical'}}}));
 assert.ok(await db.category.findFirst({where:{brandId:'merge-canonical',code:'merge-category'}}));
 assert.ok(await db.asset.findFirst({where:{brandId:'merge-canonical',publicId:'merge-asset'}}));
 assert.ok(await db.auditLog.findFirst({where:{brandId:'merge-canonical',action:'old-event'}}));
});
test('duplicate organization reconciliation migrates memberships, brands, stores and audit history',async()=>{
 await db.organization.createMany({data:[
  {id:'org-merge-canonical',name:'Merge Company'},
  {id:'org-merge-duplicate',name:' merge company '}
 ]});
 await db.orgMembership.create({data:{profileId:uid.brandA,orgId:'org-merge-duplicate'}});
 await db.brand.create({data:{id:'org-merge-brand',orgId:'org-merge-duplicate',name:'Merge Brand',slug:'merge-brand'}});
 const passwordHash=await hash('branch-password-123');
 await db.store.create({data:{id:'org-merge-store',orgId:'org-merge-duplicate',name:'Merge Branch',slug:'merge-branch',loginCode:'merge-branch-id',passwordHash}});
 await db.auditLog.create({data:{actorType:'system',orgId:'org-merge-duplicate',entity:'Organization',entityId:'org-merge-duplicate',action:'old-owner-event'}});
 const result=await mergeOrganizations(db,'org-merge-canonical',['org-merge-duplicate']);
 assert.deepEqual(result.removedOrganizationIds,['org-merge-duplicate']);
 assert.equal(result.movedMemberships,1);
 assert.equal(result.movedBrands,1);
 assert.equal(result.movedStores,1);
 assert.equal(await db.organization.findUnique({where:{id:'org-merge-duplicate'}}),null);
 assert.ok(await db.orgMembership.findUnique({where:{profileId_orgId:{profileId:uid.brandA,orgId:'org-merge-canonical'}}}));
 assert.equal((await db.brand.findUnique({where:{id:'org-merge-brand'}})).orgId,'org-merge-canonical');
 assert.equal((await db.store.findUnique({where:{id:'org-merge-store'}})).orgId,'org-merge-canonical');
 assert.ok(await db.auditLog.findFirst({where:{orgId:'org-merge-canonical',action:'old-owner-event'}}));
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
