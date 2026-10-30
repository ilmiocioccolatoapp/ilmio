const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const { fail, Problem } = require('./http');
const { audit } = require('./audit');
function verifier() {
  const { SUPABASE_URL:url, SUPABASE_PUBLISHABLE_KEY:key } = process.env;
  if (!url || !key) return async () => { throw new Problem(503, 'Admin authentication is not configured.'); };
  const client = createClient(url, key, {auth:{autoRefreshToken:false,detectSessionInUrl:false,persistSession:false}});
  return async token => {
    const { data, error } = await client.auth.getUser(token);
    if (error) throw new Problem([400,401,403].includes(error.status) ? 401 : 503, 'Could not verify your admin session.');
    return data.user;
  };
}
const tokenOf = req => { const m = (req.get('Authorization') || '').match(/^Bearer\s+(\S+)$/i); if (!m) fail(401, 'Sign in is required.'); return m[1]; };
function createAdminAuth(db, verifyIdentity = verifier()) {
  return async (req, res, next) => {
    res.set('Cache-Control','no-store');
    const token = tokenOf(req);
    if (jwt.decode(token)?.realm === 'store') fail(403, 'A store session cannot access administration.');
    const user = await verifyIdentity(token);
    if (!user?.id || !user.email) fail(401, 'Invalid admin session.');
    let profile = await db.adminProfile.findUnique({where:{supabaseUserId:user.id},include:{orgMemberships:true,brandMemberships:true}});
    if (!profile && user.email_confirmed_at) {
      // An owner may pre-authorize a verified email without knowing an Auth UUID.
      // Bind it once, then use the immutable Supabase user ID on every request.
      await db.$transaction(async tx => {
        const bound = await tx.adminProfile.updateMany({where:{email:user.email.toLowerCase(),supabaseUserId:null},data:{supabaseUserId:user.id}});
        if(bound.count) await audit(tx,null,{},'AdminProfile',user.id,'bind-verified-identity');
      });
      profile = await db.adminProfile.findUnique({where:{supabaseUserId:user.id},include:{orgMemberships:true,brandMemberships:true}});
    }
    const bootstrap = process.env.BOOTSTRAP_PLATFORM_ADMIN_EMAIL;
    if (!profile?.isPlatformAdmin && bootstrap && user.email_confirmed_at && user.email.toLowerCase() === bootstrap.toLowerCase()) {
      profile = await db.$transaction(async tx => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('platform-admin-bootstrap'))`;
        if (await tx.adminProfile.count({where:{isPlatformAdmin:true}})) fail(403, 'Your account has no platform membership.');
        const created = await tx.adminProfile.upsert({where:{supabaseUserId:user.id},create:{supabaseUserId:user.id,email:user.email.toLowerCase(),isPlatformAdmin:true},update:{isPlatformAdmin:true},include:{orgMemberships:true,brandMemberships:true}});
        await audit(tx, created, {}, 'AdminProfile', created.id, 'bootstrap', {isPlatformAdmin:true});
        return created;
      });
    }
    if (!profile || profile.status !== 'active' || (!profile.isPlatformAdmin && !profile.orgMemberships.length && !profile.brandMemberships.length)) fail(403, 'Your account has no active membership.');
    req.admin = profile; req.adminUser = {id:user.id,email:user.email,profileId:profile.id}; next();
  };
}
async function orgScope(db, actor, id) {
  if (!actor.isPlatformAdmin && !actor.orgMemberships.some(m => m.orgId === id && m.role === 'ORG_ADMIN')) fail(404, 'Organization not found.');
  const org = await db.organization.findUnique({where:{id}});
  if (!org || (!actor.isPlatformAdmin && org.status !== 'active')) fail(404, 'Organization not found.');
  return org;
}
async function brandCatalogScope(db, actor, id) {
  const brand = await db.brand.findUnique({where:{id},include:{org:true}});
  if (!brand) fail(404, 'Brand not found.');
  if (!actor.isPlatformAdmin && (brand.org.status !== 'active' || !actor.brandMemberships.some(m => m.brandId === id && m.role === 'BRAND_ADMIN'))) fail(404, 'Brand not found.');
  return brand;
}
async function brandOpsScope(db, actor, orgId) { return orgScope(db, actor, orgId); }
function platformAdminScope(actor) { if (!actor?.isPlatformAdmin) fail(403, 'Platform administrator access is required.'); return actor; }
function brandWhere(actor) {
  return actor.isPlatformAdmin ? {} : {org:{status:'active'},OR:[{orgId:{in:actor.orgMemberships.filter(m=>m.role==='ORG_ADMIN').map(m=>m.orgId)}},{id:{in:actor.brandMemberships.filter(m=>m.role==='BRAND_ADMIN').map(m=>m.brandId)}}]};
}
module.exports = { createAdminAuth, orgScope, brandCatalogScope, brandOpsScope, platformAdminScope, brandWhere, tokenOf };
