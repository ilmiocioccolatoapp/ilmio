require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { hash } = require('../platform/storeAuth');
const { audit } = require('../platform/audit');

const STORE_ID = 'legacy-ilmio-store';
const LOGIN_CODE = 'ilmio-main';
const PLACEHOLDER_HASH = '!reset-required';

async function main() {
  const db = new PrismaClient();
  try {
    const store = await db.store.findUnique({ where: { id: STORE_ID } });
    if (!store || store.loginCode !== LOGIN_CODE) {
      throw new Error('The migrated Il Mio store/login code was not found. Apply the reviewed migration first.');
    }
    if (store.passwordHash !== PLACEHOLDER_HASH) {
      throw new Error('The initial store password is already initialized. Use the normal password rotation flow.');
    }
    if (!process.argv.includes('--apply')) {
      console.log(JSON.stringify({ storeFound: true, loginCode: LOGIN_CODE, passwordInitialized: false, applyRequired: true }));
      return;
    }

    const value = process.env.ILMIO_INITIAL_STORE_PASSWORD;
    if (typeof value !== 'string' || value.length < 20 || value.length > 1024) {
      throw new Error('Set ILMIO_INITIAL_STORE_PASSWORD to a unique password of at least 20 characters in a secure shell.');
    }
    const passwordHash = await hash(value);
    await db.$transaction(async tx => {
      const result = await tx.store.updateMany({
        where: { id: STORE_ID, loginCode: LOGIN_CODE, passwordHash: PLACEHOLDER_HASH },
        data: { passwordHash, failedLogins: 0, lockedUntil: null }
      });
      if (result.count !== 1) throw new Error('Store credentials changed during setup; no password was updated.');
      await audit(tx, null, { orgId: store.orgId, storeId: STORE_ID }, 'Store', STORE_ID, 'initial-password-set', { loginCode: LOGIN_CODE });
    });
    console.log('Il Mio store credentials initialized for login code ilmio-main. The password was not printed or logged.');
  } finally {
    await db.$disconnect();
  }
}

main().catch(error => {
  console.error(error.message || 'Il Mio store credential setup failed.');
  process.exitCode = 1;
});
