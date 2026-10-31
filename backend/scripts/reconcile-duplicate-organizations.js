const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');

const normalize = name => name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');

function duplicateGroups(organizations) {
  const groups = new Map();
  for (const organization of organizations) {
    const key = normalize(organization.name);
    const group = groups.get(key) || [];
    group.push(organization);
    groups.set(key, group);
  }
  return [...groups.values()].filter(group => group.length > 1);
}

async function mergeOrganizations(db, canonicalId, duplicateIds) {
  if (!canonicalId || duplicateIds.length === 0 || duplicateIds.includes(canonicalId)) {
    throw new Error('Provide one canonical organization ID and at least one different duplicate organization ID.');
  }

  return db.$transaction(async tx => {
    const ids = [...new Set([canonicalId, ...duplicateIds])];
    const organizations = await tx.organization.findMany({
      where: { id: { in: ids } },
      include: { _count: { select: { brands: true, stores: true, memberships: true } } }
    });
    if (organizations.length !== ids.length) throw new Error('One or more selected organization IDs do not exist.');

    const canonical = organizations.find(organization => organization.id === canonicalId);
    const duplicates = duplicateIds.map(id => organizations.find(organization => organization.id === id));
    if (organizations.some(organization => normalize(organization.name) !== normalize(canonical.name))) {
      throw new Error('Organizations must have the same normalized name to be merged.');
    }
    if (organizations.some(organization => organization.status !== canonical.status)) {
      throw new Error('Organizations with different statuses cannot be merged safely.');
    }

    const plan = [];
    const brandSlugs = new Set((await tx.brand.findMany({
      where: { orgId: canonical.id },
      select: { slug: true }
    })).map(brand => brand.slug));
    const storeSlugs = new Set((await tx.store.findMany({
      where: { orgId: canonical.id },
      select: { slug: true }
    })).map(store => store.slug));
    const targetMemberships = await tx.orgMembership.findMany({
      where: { orgId: canonical.id },
      select: { profileId: true, role: true }
    });
    const membershipRoles = new Map(targetMemberships.map(membership => [membership.profileId, membership.role]));

    for (const duplicate of duplicates) {
      const [brands, stores, memberships] = await Promise.all([
        tx.brand.findMany({ where: { orgId: duplicate.id }, select: { slug: true } }),
        tx.store.findMany({ where: { orgId: duplicate.id }, select: { slug: true } }),
        tx.orgMembership.findMany({ where: { orgId: duplicate.id }, select: { id: true, profileId: true, role: true } })
      ]);
      if (brands.some(brand => brandSlugs.has(brand.slug))) {
        throw new Error(`Organization ${duplicate.id} has a brand slug that already exists in the canonical organization.`);
      }
      if (stores.some(store => storeSlugs.has(store.slug))) {
        throw new Error(`Organization ${duplicate.id} has a store slug that already exists in the canonical organization.`);
      }
      if (memberships.some(membership => {
        const role = membershipRoles.get(membership.profileId);
        return role !== undefined && role !== membership.role;
      })) {
        throw new Error(`Organization ${duplicate.id} has administrator memberships with conflicting roles.`);
      }
      brands.forEach(brand => brandSlugs.add(brand.slug));
      stores.forEach(store => storeSlugs.add(store.slug));
      memberships.forEach(membership => {
        if (!membershipRoles.has(membership.profileId)) membershipRoles.set(membership.profileId, membership.role);
      });
      plan.push({ duplicate, memberships });
    }

    let movedMemberships = 0;
    let movedBrands = 0;
    let movedStores = 0;
    for (const item of plan) {
      for (const membership of item.memberships) {
        await tx.orgMembership.upsert({
          where: { profileId_orgId: { profileId: membership.profileId, orgId: canonical.id } },
          create: { profileId: membership.profileId, orgId: canonical.id, role: membership.role },
          update: {}
        });
        await tx.orgMembership.delete({ where: { id: membership.id } });
        movedMemberships++;
      }
      const brands = await tx.brand.updateMany({
        where: { orgId: item.duplicate.id },
        data: { orgId: canonical.id }
      });
      movedBrands += brands.count;
      const stores = await tx.store.updateMany({
        where: { orgId: item.duplicate.id },
        data: { orgId: canonical.id, revision: { increment: 1 } }
      });
      movedStores += stores.count;
      await tx.auditLog.updateMany({
        where: { orgId: item.duplicate.id },
        data: { orgId: canonical.id }
      });
      await tx.auditLog.create({
        data: {
          actorType: 'system',
          orgId: canonical.id,
          entity: 'Organization',
          entityId: canonical.id,
          action: 'duplicate_organization.merged',
          diff: { duplicateOrganizationId: item.duplicate.id }
        }
      });
      await tx.organization.delete({ where: { id: item.duplicate.id } });
    }

    return {
      canonicalOrganizationId: canonical.id,
      removedOrganizationIds: duplicates.map(organization => organization.id),
      movedMemberships,
      movedBrands,
      movedStores
    };
  }, { timeout: 30000 });
}

function options(args) {
  const result = { apply: args.includes('--apply'), canonicalId: '', duplicateIds: [] };
  for (let index = 0; index < args.length; index++) {
    if (args[index] === '--canonical') result.canonicalId = args[++index] || '';
    if (args[index] === '--duplicates') result.duplicateIds = (args[++index] || '').split(',').filter(Boolean);
  }
  return result;
}

async function main(args) {
  const selected = options(args);
  const db = new PrismaClient();
  try {
    const organizations = await db.organization.findMany({
      include: { _count: { select: { brands: true, stores: true, memberships: true } } },
      orderBy: [{ name: 'asc' }, { createdAt: 'asc' }]
    });
    console.log(JSON.stringify(duplicateGroups(organizations).map(group => group.map(({ id, name, status, _count }) => ({
      id, name, status, counts: _count
    }))), null, 2));
    if (!selected.canonicalId && selected.duplicateIds.length === 0) {
      console.log('Report only. Select the canonical and duplicate IDs after reviewing the output.');
      console.log('Apply with: node scripts/reconcile-duplicate-organizations.js --apply --canonical <id> --duplicates <id,id,...>');
      return;
    }
    if (!selected.apply) {
      console.log('No changes made. Add --apply after reviewing the selected IDs.');
      return;
    }
    if (!selected.canonicalId || selected.duplicateIds.length === 0) {
      throw new Error('Both --canonical and --duplicates are required with --apply.');
    }
    console.log(JSON.stringify(await mergeOrganizations(db, selected.canonicalId, selected.duplicateIds), null, 2));
  } finally {
    await db.$disconnect();
  }
}

if (require.main === module) {
  main(process.argv.slice(2)).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { duplicateGroups, mergeOrganizations, normalize };
