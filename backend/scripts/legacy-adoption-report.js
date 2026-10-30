const { PrismaClient } = require('@prisma/client');

async function main() {
  const db = new PrismaClient();
  try {
    const now = new Date();
    const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const [monitor, recentHits, lastHits] = await Promise.all([
      db.legacyRouteMonitor.findUnique({ where: { id: 'legacy-menu-v1' } }),
      db.legacyRouteHit.count({ where: { at: { gte: cutoff } } }),
      db.legacyRouteHit.groupBy({ by: ['route'], _count: { _all: true }, _max: { at: true } })
    ]);
    if (!monitor) throw new Error('Legacy monitoring has not been initialized by migration 202610300003_legacy_route_monitoring.');

    const lastHit = lastHits.reduce((latest, row) => !latest || row._max.at > latest ? row._max.at : latest, null);
    const zeroSince = monitor.startedAt && lastHit
      ? (lastHit > monitor.startedAt ? lastHit : monitor.startedAt)
      : monitor.startedAt || now;
    const eligible = Boolean(monitor.startedAt && monitor.startedAt <= cutoff && recentHits === 0);
    console.log(JSON.stringify({
      checkedAt: now.toISOString(),
      monitoringStartedAt: monitor.startedAt?.toISOString() || null,
      requiredZeroHitWindowStartsAt: cutoff.toISOString(),
      hitsInTrailing30Days: recentHits,
      consecutiveZeroHitDays: Math.max(0, Math.floor((now.getTime() - zeroSince.getTime()) / 86400000)),
      lastHitsByRoute: Object.fromEntries(lastHits.map(row => [row.route, { total: row._count._all, lastHitAt: row._max.at.toISOString() }])),
      retirementGateMet: eligible,
      requiredHumanCheck: 'Confirm every managed tablet is running the authenticated build before retiring either legacy route.'
    }, null, 2));
  } finally {
    await db.$disconnect();
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
