require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { createProvisioningClients } = require('../platform/provisioning');
const { audit } = require('../platform/audit');

const BRAND_ID = 'legacy-ilmio-brand';
function validEmail(value) {
  return typeof value === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
}

async function main() {
  const email = (process.env.ILMIO_BRAND_ADMIN_EMAIL || '').trim().toLowerCase();
  if (!validEmail(email)) throw new Error('Set ILMIO_BRAND_ADMIN_EMAIL to the existing Il Mio administrator address.');
  if (!process.env.ADMIN_INVITE_REDIRECT_URL) throw new Error('Set ADMIN_INVITE_REDIRECT_URL to the admin password setup route.');

  const db = new PrismaClient();
  try {
    const clients = createProvisioningClients();
    const brand = await db.brand.findUnique({ where: { id: BRAND_ID }, include: { org: true } });
    if (!brand || brand.status !== 'active' || brand.org.status !== 'active') {
      throw new Error('The migrated active Il Mio brand was not found. Apply the reviewed migration first.');
    }

    const existingUser = await clients.findUserByEmail(email);
    const existingProfile = await db.adminProfile.findUnique({ where: { email } });
    if (existingProfile && existingProfile.status !== 'active') throw new Error('The existing admin profile is inactive; review it manually.');
    if (existingProfile?.supabaseUserId && (!existingUser || existingProfile.supabaseUserId !== existingUser.id)) {
      throw new Error('The existing admin profile is linked to a different Supabase identity. Refusing to change it.');
    }

    const existingMembership = existingProfile
      ? await db.brandMembership.findUnique({ where: { profileId_brandId: { profileId: existingProfile.id, brandId: BRAND_ID } } })
      : null;
    const apply = process.argv.includes('--apply');
    const sendSetup = process.argv.includes('--send-setup');
    if (!apply || !sendSetup) {
      console.log(JSON.stringify({ brandFound: true, profileFound: Boolean(existingProfile), membershipFound: Boolean(existingMembership), authUserFound: Boolean(existingUser), emailConfirmed: existingUser?.emailConfirmed || false, applyRequired: !apply, sendSetupRequired: !sendSetup }));
      return;
    }

    const profile = await db.$transaction(async tx => {
      const current = await tx.adminProfile.findUnique({ where: { email } });
      if (current && current.status !== 'active') throw new Error('The existing admin profile is inactive; review it manually.');
      if (current?.supabaseUserId && (!existingUser || current.supabaseUserId !== existingUser.id)) {
        throw new Error('The existing admin profile is linked to a different Supabase identity. Refusing to change it.');
      }
      const saved = await tx.adminProfile.upsert({
        where: { email },
        create: { email, supabaseUserId: existingUser?.id || null, name: 'Il Mio Administrator' },
        update: existingUser ? { supabaseUserId: existingUser.id } : {}
      });
      const membership = await tx.brandMembership.upsert({
        where: { profileId_brandId: { profileId: saved.id, brandId: BRAND_ID } },
        create: { profileId: saved.id, brandId: BRAND_ID, role: 'BRAND_ADMIN' },
        update: {}
      });
      if (!existingMembership) {
        await audit(tx, null, { orgId: brand.orgId, brandId: BRAND_ID }, 'BrandMembership', membership.id, 'brand_admin.bootstrap', { source: 'ilmio_migration' });
      }
      return saved;
    });

    let user = existingUser;
    if (!user) {
      user = await clients.inviteUserByEmail(email, 'Il Mio Administrator');
    } else {
      await clients.sendSetupEmail(email, user.emailConfirmed);
    }
    if (profile.supabaseUserId !== user.id) {
      await db.adminProfile.update({ where: { id: profile.id }, data: { supabaseUserId: user.id } });
    }
    console.log('Il Mio Brand Admin membership is ready and a Supabase setup email was requested. No password was set or logged.');
  } finally {
    await db.$disconnect();
  }
}

main().catch(error => {
  console.error(error.message || 'Il Mio administrator setup failed.');
  process.exitCode = 1;
});
