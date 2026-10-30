BEGIN;

CREATE TABLE "LegacyRouteHit" (
  "id" TEXT NOT NULL,
  "route" TEXT NOT NULL,
  "ip" TEXT NOT NULL,
  "userAgent" TEXT NOT NULL,
  "at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LegacyRouteHit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LegacyRouteHit_route_at_idx" ON "LegacyRouteHit"("route", "at");
CREATE INDEX "LegacyRouteHit_at_idx" ON "LegacyRouteHit"("at");

CREATE TABLE "LegacyRouteMonitor" (
  "id" TEXT NOT NULL,
  "startedAt" TIMESTAMPTZ(3),
  CONSTRAINT "LegacyRouteMonitor_pkey" PRIMARY KEY ("id")
);
INSERT INTO "LegacyRouteMonitor"("id") VALUES ('legacy-menu-v1');

ALTER TABLE "LegacyRouteHit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LegacyRouteMonitor" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "LegacyRouteHit" FROM PUBLIC;
REVOKE ALL ON TABLE "LegacyRouteMonitor" FROM PUBLIC;
DO $$
DECLARE r TEXT;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=r) THEN
      EXECUTE format('REVOKE ALL ON TABLE "LegacyRouteHit" FROM %I',r);
      EXECUTE format('REVOKE ALL ON TABLE "LegacyRouteMonitor" FROM %I',r);
    END IF;
  END LOOP;
END $$;

COMMIT;
