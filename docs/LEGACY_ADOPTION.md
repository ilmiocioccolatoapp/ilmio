# Legacy menu route adoption gate

The temporary public reads are `GET /api/categories` and `GET /api/products/available`. Each successful request, disabled-route response, or unavailable-menu response is recorded in `LegacyRouteHit` before the handler continues. The stored fields are route, client IP, User-Agent, and database timestamp. A logging failure returns 503 so the platform never serves an untracked legacy response.

## Report

After migration `202610300003_legacy_route_monitoring` is deployed, run from `backend` with read access to the production database:

```sh
npm run legacy:adoption-report
```

The 30-day clock starts on the first successful `/healthz` request served by the instrumented API after migration and deployment. The report includes that start time, hits in the trailing 30 days, the latest hit per route, consecutive zero-hit days, and `retirementGateMet`. A `null` start time means the new API has not marked monitoring live. The gate remains false until the database has been monitored for a full 30 days, even when there have been no requests. Restrict the report and database access because hit rows contain client IP addresses and User-Agent strings.

## SQL view

For a read-only dashboard, use this query in a trusted SQL client. It returns one row for each route even when there were zero hits:

```sql
WITH routes(route) AS (
  VALUES ('categories'), ('products')
)
SELECT
  routes.route,
  COUNT(hit."id") FILTER (WHERE hit."at" >= NOW() - INTERVAL '30 days') AS hits_last_30_days,
  MAX(hit."at") AS last_hit_at,
  monitor."startedAt" AS monitoring_started_at,
  COALESCE(monitor."startedAt" <= NOW() - INTERVAL '30 days'
    AND COUNT(hit."id") FILTER (WHERE hit."at" >= NOW() - INTERVAL '30 days') = 0, FALSE) AS zero_hit_gate_met
FROM routes
CROSS JOIN "LegacyRouteMonitor" monitor
LEFT JOIN "LegacyRouteHit" hit ON hit."route" = routes.route
WHERE monitor."id" = 'legacy-menu-v1'
GROUP BY routes.route, monitor."startedAt"
ORDER BY routes.route;
```

Before retiring either endpoint, also confirm every managed tablet has installed the authenticated build. Zero API hits alone do not establish tablet adoption. Record that device check with the release evidence, then remove both routes together in a reviewed release.
