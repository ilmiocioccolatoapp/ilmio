require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { createProvisioningClients } = require('../platform/provisioning');

function validEmail(value) {
  return typeof value === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
}

async function main() {
  const email = (process.env.BOOTSTRAP_PLATFORM_ADMIN_EMAIL || '').trim().toLowerCase();
  if (!validEmail(email)) throw new Error('Set BOOTSTRAP_PLATFORM_ADMIN_EMAIL to a valid address.');
  if (!process.env.ADMIN_INVITE_REDIRECT_URL) throw new Error('Set ADMIN_INVITE_REDIRECT_URL to the admin password setup route.');

  const db = new PrismaClient();
  try {
    const [profile, admins] = await Promise.all([
      db.adminProfile.findUnique({ where: { email } }),
      db.adminProfile.count({ where: { isPlatformAdmin: true } })
    ]);
    if (profile?.status !== undefined && profile.status !== 'active') {
      throw new Error('The existing administrator profile is inactive; review it manually.');
    }
    if (admins > 0 && !profile?.isPlatformAdmin) {
      throw new Error('A Platform Admin already exists. Use the Brands screen to provision additional administrators.');
    }

    const clients = createProvisioningClients();
    const existing = await clients.findUserByEmail(email);
    if (profile?.supabaseUserId && (!existing || profile.supabaseUserId !== existing.id)) {
      throw new Error('The existing administrator profile is linked to a different Supabase identity. Refusing to send setup email.');
    }
    if (!process.argv.includes('--send-setup')) {
      console.log(JSON.stringify({ authUserFound: Boolean(existing), emailConfirmed: existing?.emailConfirmed || false, profileFound: Boolean(profile), platformAdminExists: admins > 0, actionRequired: existing ? 'password_setup_email' : 'invite_email', sent: false }));
      return;
    }

    if (!existing) {
      if (profile?.supabaseUserId) throw new Error('The stored Supabase identity could not be found. Review it manually.');
      await clients.inviteUserByEmail(email, 'Platform Administrator');
    } else {
      await clients.sendSetupEmail(email, existing.emailConfirmed);
    }
    console.log('Supabase setup email requested for the Platform Admin. No password was set or logged.');
  } finally {
    await db.$disconnect();
  }
}

main().catch(error => {
  console.error(error.message || 'Platform administrator setup failed.');
  process.exitCode = 1;
});
