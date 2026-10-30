const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');

const normalize = name => name.trim().toLocaleLowerCase('en');

function duplicateGroups(brands) {
  const groups = new Map();
  for (const brand of brands) {
    const key = `${brand.orgId}:${normalize(brand.name)}`;
    const group = groups.get(key) || [];
    group.push(brand);
    groups.set(key, group);
  }
  return [...groups.values()].filter(group => group.length > 1);
}

async function mergeBrands(db, canonicalId, duplicateIds) {
  if (!canonicalId || duplicateIds.length === 0 || duplicateIds.includes(canonicalId)) {
    throw new Error('Provide one canonical brand ID and at least one different duplicate brand ID.');
  }

  return db.$transaction(async tx => {
    const ids = [...new Set([canonicalId, ...duplicateIds])];
    const brands = await tx.brand.findMany({
      where: { id: { in: ids } },
      include: { _count: { select: { products: true } } }
    });
    if (brands.length !== ids.length) throw new Error('One or more selected brand IDs do not exist.');

    const canonical = brands.find(brand => brand.id === canonicalId);
    const duplicates = duplicateIds.map(id => brands.find(brand => brand.id === id));
    if (brands.some(brand => brand.orgId !== canonical.orgId)) {
      throw new Error('Brands must belong to the same owner organization to be merged safely.');
    }
    if (brands.some(brand => normalize(brand.name) !== normalize(canonical.name))) {
      throw new Error('Brands must have the same normalized name to be merged.');
    }
    if (brands.some(brand => brand.currency !== canonical.currency)) {
      throw new Error('Brands with different currencies cannot be merged automatically.');
    }

    const plan = [];
    const plannedStoreIds = new Set();
    for (const duplicate of duplicates) {
      if (duplicate._count.products) {
        throw new Error(`Brand ${duplicate.id} has products. Product/catalog migrations require manual review.`);
      }

      const [categories, sourceAssignments, targetMemberships, sourceMemberships, overrides] = await Promise.all([
        tx.category.findMany({ where: { brandId: duplicate.id }, select: { id: true, code: true } }),
        tx.storeBrand.findMany({
          where: { brandId: duplicate.id },
          include: { store: { select: { orgId: true } } }
        }),
        tx.brandMembership.findMany({ where: { brandId: canonical.id }, select: { profileId: true, role: true } }),
        tx.brandMembership.findMany({ where: { brandId: duplicate.id }, select: { id: true, profileId: true, role: true } }),
        tx.productStoreOverride.count({ where: { brandId: duplicate.id } })
      ]);
      if (overrides) {
        throw new Error(`Brand ${duplicate.id} has store overrides. Product/catalog migrations require manual review.`);
      }
      if (sourceAssignments.some(assignment => assignment.store.orgId !== canonical.orgId)) {
        throw new Error(`Brand ${duplicate.id} has cross-owner assignments; their approval must be reviewed manually.`);
      }
      if (sourceAssignments.length && await tx.menuVersion.count({
        where: { storeBrandId: { in: sourceAssignments.map(assignment => assignment.id) } }
      })) {
        throw new Error(`Brand ${duplicate.id} has published menu history. Assignment migration requires manual review.`);
      }
      const targetCategories = await tx.category.findMany({
        where: { brandId: canonical.id, code: { in: categories.map(category => category.code) } },
        select: { code: true }
      });
      if (targetCategories.length) {
        throw new Error(`Brand ${duplicate.id} has category codes that already exist on the canonical brand.`);
      }
      const targetAssignments = await tx.storeBrand.findMany({
        where: { brandId: canonical.id, storeId: { in: sourceAssignments.map(assignment => assignment.storeId) } },
        select: { storeId: true }
      });
      if (targetAssignments.length) {
        throw new Error(`Brand ${duplicate.id} and the canonical brand are both assigned to the same store.`);
      }
      if (sourceAssignments.some(assignment => plannedStoreIds.has(assignment.storeId))) {
        throw new Error('Multiple duplicate brands are assigned to the same store; resolve that assignment conflict manually.');
      }
      sourceAssignments.forEach(assignment => plannedStoreIds.add(assignment.storeId));
      const membershipRoles = new Map(targetMemberships.map(membership => [membership.profileId, membership.role]));
      if (sourceMemberships.some(membership => {
        const role = membershipRoles.get(membership.profileId);
        return role !== undefined && role !== membership.role;
      })) {
        throw new Error(`Brand ${duplicate.id} has administrator memberships with conflicting roles.`);
      }
      plan.push({ duplicate, categories, sourceAssignments, sourceMemberships });
    }

    let movedMemberships = 0;
    let movedAssignments = 0;
    let movedCategories = 0;
    let movedAssets = 0;
    for (const item of plan) {
      for (const membership of item.sourceMemberships) {
        await tx.brandMembership.upsert({
          where: { profileId_brandId: { profileId: membership.profileId, brandId: canonical.id } },
          create: { profileId: membership.profileId, brandId: canonical.id, role: membership.role },
          update: {}
        });
        await tx.brandMembership.delete({ where: { id: membership.id } });
        movedMemberships++;
      }
      if (item.categories.length) {
        const result = await tx.category.updateMany({
          where: { brandId: item.duplicate.id },
          data: { brandId: canonical.id }
        });
        movedCategories += result.count;
      }
      if (item.sourceAssignments.length) {
        for (const assignment of item.sourceAssignments) {
          await tx.storeBrand.create({
            data: {
              storeId: assignment.storeId,
              brandId: canonical.id,
              displayOrder: assignment.displayOrder,
              status: assignment.status,
              approvedBy: assignment.approvedBy,
              nextVersion: assignment.nextVersion,
              unpublishedChanges: true
            }
          });
          await tx.storeBrand.delete({ where: { id: assignment.id } });
          movedAssignments++;
        }
        await tx.store.updateMany({
          where: { id: { in: item.sourceAssignments.map(assignment => assignment.storeId) } },
          data: { revision: { increment: 1 } }
        });
      }
      const assets = await tx.asset.updateMany({
        where: { brandId: item.duplicate.id },
        data: { brandId: canonical.id }
      });
      movedAssets += assets.count;
      await tx.auditLog.updateMany({
        where: { brandId: item.duplicate.id },
        data: { brandId: canonical.id }
      });
      await tx.auditLog.create({
        data: {
          actorType: 'system',
          orgId: canonical.orgId,
          brandId: canonical.id,
          entity: 'Brand',
          entityId: canonical.id,
          action: 'duplicate_brand.merged',
          diff: { duplicateBrandId: item.duplicate.id }
        }
      });
      await tx.brand.delete({ where: { id: item.duplicate.id } });
    }

    return {
      canonicalBrandId: canonical.id,
      removedBrandIds: duplicates.map(brand => brand.id),
      movedMemberships,
      movedAssignments,
      movedCategories,
      movedAssets
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
    const brands = await db.brand.findMany({
      include: {
        org: { select: { name: true } },
        _count: { select: { memberships: true, assignments: true, categories: true, products: true, assets: true } }
      },
      orderBy: [{ name: 'asc' }, { createdAt: 'asc' }]
    });
    const groups = duplicateGroups(brands);
    console.log(JSON.stringify(groups.map(group => group.map(({ id, name, slug, org, _count }) => ({
      id, name, slug, owner: org.name, counts: _count
    }))), null, 2));
    if (!selected.canonicalId && selected.duplicateIds.length === 0) {
      console.log('Report only. Select the canonical and duplicate IDs after reviewing the output.');
      console.log('Apply with: node scripts/reconcile-duplicate-brands.js --apply --canonical <id> --duplicates <id,id,...>');
      return;
    }
    if (!selected.apply) {
      console.log('No changes made. Add --apply after reviewing the selected IDs.');
      return;
    }
    if (!selected.canonicalId || selected.duplicateIds.length === 0) {
      throw new Error('Both --canonical and --duplicates are required with --apply.');
    }
    console.log(JSON.stringify(await mergeBrands(db, selected.canonicalId, selected.duplicateIds), null, 2));
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

module.exports = { duplicateGroups, mergeBrands, normalize };
