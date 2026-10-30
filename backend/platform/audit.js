function audit(db, actor, scope, entity, entityId, action, diff) {
  return db.auditLog.create({ data: { actorType:actor ? 'admin' : 'system', actorId:actor?.id, ...scope, entity, entityId, action, ...(diff ? {diff} : {}) } });
}
async function lockBrand(db, brandId) { await db.$queryRaw`SELECT "id" FROM "Brand" WHERE "id" = ${brandId} FOR UPDATE`; }
module.exports = { audit, lockBrand };
