BEGIN;

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_category_fkey";

-- DropIndex
DROP INDEX "Category_id_key";

-- DropIndex
DROP INDEX "Category_order_idx";

-- DropIndex
DROP INDEX "Product_category_idx";

-- DropIndex
DROP INDEX "Product_available_idx";

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "brandId" TEXT,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "brandId" TEXT,
ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "currency" CHAR(3),
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "priceAmount" DECIMAL(10,2),
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#8B4513',
    "currency" CHAR(3) NOT NULL DEFAULT 'AED',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Dubai',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Dubai',
    "status" TEXT NOT NULL DEFAULT 'active',
    "loginCode" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "lastLoginAt" TIMESTAMPTZ(3),
    "failedLogins" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreBrand" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "approvedBy" TEXT,
    "currentMenuVersionId" TEXT,
    "nextVersion" INTEGER NOT NULL DEFAULT 0,
    "unpublishedChanges" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "StoreBrand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminProfile" (
    "id" TEXT NOT NULL,
    "supabaseUserId" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AdminProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgMembership" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ORG_ADMIN',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrgMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandMembership" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'BRAND_ADMIN',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductStoreOverride" (
    "id" TEXT NOT NULL,
    "storeBrandId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "priceAmount" DECIMAL(10,2),
    "isSoldOut" BOOLEAN,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ProductStoreOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuVersion" (
    "id" TEXT NOT NULL,
    "storeBrandId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "publishedBy" TEXT,
    "publishedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MenuVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreSession" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "tokenVersion" INTEGER NOT NULL,
    "refreshHash" TEXT NOT NULL,
    "deviceLabel" TEXT,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "realm" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "orgId" TEXT,
    "brandId" TEXT,
    "storeId" TEXT,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "diff" JSONB,
    "at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Brand_orgId_slug_key" ON "Brand"("orgId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Store_loginCode_key" ON "Store"("loginCode");

-- CreateIndex
CREATE UNIQUE INDEX "Store_orgId_slug_key" ON "Store"("orgId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "StoreBrand_currentMenuVersionId_key" ON "StoreBrand"("currentMenuVersionId");

-- CreateIndex
CREATE INDEX "StoreBrand_brandId_idx" ON "StoreBrand"("brandId");

-- CreateIndex
CREATE UNIQUE INDEX "StoreBrand_storeId_brandId_key" ON "StoreBrand"("storeId", "brandId");

-- CreateIndex
CREATE UNIQUE INDEX "StoreBrand_id_brandId_key" ON "StoreBrand"("id", "brandId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminProfile_supabaseUserId_key" ON "AdminProfile"("supabaseUserId");

-- CreateIndex
CREATE INDEX "OrgMembership_orgId_idx" ON "OrgMembership"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "OrgMembership_profileId_orgId_key" ON "OrgMembership"("profileId", "orgId");

-- CreateIndex
CREATE INDEX "BrandMembership_brandId_idx" ON "BrandMembership"("brandId");

-- CreateIndex
CREATE UNIQUE INDEX "BrandMembership_profileId_brandId_key" ON "BrandMembership"("profileId", "brandId");

-- CreateIndex
CREATE INDEX "ProductStoreOverride_productId_brandId_idx" ON "ProductStoreOverride"("productId", "brandId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductStoreOverride_storeBrandId_productId_key" ON "ProductStoreOverride"("storeBrandId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "MenuVersion_storeBrandId_version_key" ON "MenuVersion"("storeBrandId", "version");

-- CreateIndex
CREATE INDEX "StoreSession_storeId_idx" ON "StoreSession"("storeId");

-- CreateIndex
CREATE INDEX "LoginAttempt_realm_identifier_at_idx" ON "LoginAttempt"("realm", "identifier", "at");

-- CreateIndex
CREATE INDEX "LoginAttempt_realm_ip_at_idx" ON "LoginAttempt"("realm", "ip", "at");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_publicId_key" ON "Asset"("publicId");

-- CreateIndex
CREATE INDEX "Asset_brandId_idx" ON "Asset"("brandId");

-- CreateIndex
CREATE INDEX "AuditLog_orgId_at_idx" ON "AuditLog"("orgId", "at");

-- CreateIndex
CREATE INDEX "AuditLog_brandId_at_idx" ON "AuditLog"("brandId", "at");

-- CreateIndex
CREATE INDEX "AuditLog_storeId_at_idx" ON "AuditLog"("storeId", "at");

-- CreateIndex
CREATE INDEX "Category_brandId_order_idx" ON "Category"("brandId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Category_brandId_id_key" ON "Category"("brandId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Category_dbId_brandId_key" ON "Category"("dbId", "brandId");

-- CreateIndex
CREATE INDEX "Product_brandId_categoryId_idx" ON "Product"("brandId", "categoryId");

-- CreateIndex
CREATE INDEX "Product_brandId_available_sortOrder_idx" ON "Product"("brandId", "available", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Product_dbId_brandId_key" ON "Product"("dbId", "brandId");

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreBrand" ADD CONSTRAINT "StoreBrand_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreBrand" ADD CONSTRAINT "StoreBrand_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreBrand" ADD CONSTRAINT "StoreBrand_currentMenuVersionId_fkey" FOREIGN KEY ("currentMenuVersionId") REFERENCES "MenuVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgMembership" ADD CONSTRAINT "OrgMembership_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "AdminProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgMembership" ADD CONSTRAINT "OrgMembership_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandMembership" ADD CONSTRAINT "BrandMembership_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "AdminProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandMembership" ADD CONSTRAINT "BrandMembership_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_brandId_fkey" FOREIGN KEY ("categoryId", "brandId") REFERENCES "Category"("dbId", "brandId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ProductStoreOverride" ADD CONSTRAINT "ProductStoreOverride_storeBrandId_brandId_fkey" FOREIGN KEY ("storeBrandId", "brandId") REFERENCES "StoreBrand"("id", "brandId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductStoreOverride" ADD CONSTRAINT "ProductStoreOverride_productId_brandId_fkey" FOREIGN KEY ("productId", "brandId") REFERENCES "Product"("dbId", "brandId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuVersion" ADD CONSTRAINT "MenuVersion_storeBrandId_fkey" FOREIGN KEY ("storeBrandId") REFERENCES "StoreBrand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreSession" ADD CONSTRAINT "StoreSession_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "AdminProfile_email_key" ON "AdminProfile"("email");

-- Validate the existing catalog before enforcing ownership and exact money.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Product" WHERE "price" !~ '^(AED|€)[[:space:]]?[0-9]{1,8}[.][0-9]{2}$') THEN
    RAISE EXCEPTION 'Migration stopped: review malformed/unsupported legacy prices before retrying. No currency conversion is performed.';
  END IF;
  IF (SELECT count(DISTINCT CASE WHEN "price" LIKE '€%' THEN 'EUR' ELSE 'AED' END) FROM "Product") > 1 THEN
    RAISE EXCEPTION 'Migration stopped: the original catalog mixes currencies. Assign explicit brand ownership before retrying.';
  END IF;
END $$;
INSERT INTO "Organization" ("id","name","updatedAt") VALUES ('legacy-ilmio-org','Il Mio Cioccolato',CURRENT_TIMESTAMP);
INSERT INTO "Brand" ("id","orgId","slug","name","currency","updatedAt")
VALUES ('legacy-ilmio-brand','legacy-ilmio-org','il-mio-cioccolato','Il Mio Cioccolato',
 COALESCE((SELECT CASE WHEN "price" LIKE '€%' THEN 'EUR' ELSE 'AED' END FROM "Product" LIMIT 1),'AED'),CURRENT_TIMESTAMP);
INSERT INTO "Store" ("id","orgId","name","slug","loginCode","passwordHash","revision","updatedAt")
VALUES ('legacy-ilmio-store','legacy-ilmio-org','Il Mio Main Store','main','ilmio-main','!reset-required',1,CURRENT_TIMESTAMP);
INSERT INTO "StoreBrand" ("id","storeId","brandId","nextVersion","unpublishedChanges","updatedAt")
VALUES ('legacy-ilmio-main','legacy-ilmio-store','legacy-ilmio-brand',1,false,CURRENT_TIMESTAMP);
UPDATE "Category" SET "brandId"='legacy-ilmio-brand';
UPDATE "Product" p SET "brandId"='legacy-ilmio-brand', "categoryId"=c."dbId",
 "currency"=CASE WHEN p."price" LIKE '€%' THEN 'EUR' ELSE 'AED' END,
 "priceAmount"=regexp_replace(p."price",'^(AED|€)[[:space:]]?','')::numeric
FROM "Category" c WHERE c."id"=p."category";
ALTER TABLE "Category" ALTER COLUMN "brandId" SET NOT NULL;
ALTER TABLE "Product" ALTER COLUMN "brandId" SET NOT NULL, ALTER COLUMN "categoryId" SET NOT NULL,
 ALTER COLUMN "currency" SET NOT NULL, ALTER COLUMN "priceAmount" SET NOT NULL;
ALTER TABLE "Product" ADD CONSTRAINT "Product_price_nonnegative" CHECK ("priceAmount">=0);
ALTER TABLE "ProductStoreOverride" ADD CONSTRAINT "Override_price_nonnegative" CHECK ("priceAmount" IS NULL OR "priceAmount">=0);
ALTER TABLE "Store" ADD CONSTRAINT "Store_login_code_format" CHECK ("loginCode" ~ '^[a-z0-9][a-z0-9-]{2,39}$');
ALTER TABLE "Store" ADD CONSTRAINT "Store_counters_nonnegative" CHECK ("failedLogins">=0 AND "revision">=0 AND "tokenVersion">=0);
ALTER TABLE "OrgMembership" ADD CONSTRAINT "OrgMembership_role" CHECK ("role"='ORG_ADMIN');
ALTER TABLE "BrandMembership" ADD CONSTRAINT "BrandMembership_role" CHECK ("role"='BRAND_ADMIN');

-- Preserve an immediately usable published menu for the existing public APK.
INSERT INTO "MenuVersion" ("id","storeBrandId","version","snapshot")
SELECT 'legacy-ilmio-menu-v1','legacy-ilmio-main',1,
 jsonb_build_object('id',b."id",'name',b."name",'slug',b."slug",'logoUrl',b."logoUrl",
 'primaryColor',b."primaryColor",'currency',b."currency",'timezone',b."timezone",'storeBrandId','legacy-ilmio-main',
 'categories',COALESCE((SELECT jsonb_agg(jsonb_build_object(
   'id',c."dbId",'code',c."id",'name',c."name",'icon',c."icon",'imageUrl',c."imageUrl",'sortOrder',c."order",
   'items',COALESCE((SELECT jsonb_agg(jsonb_build_object(
     'id',p."dbId",'name',p."title",'description',p."description",'ingredients',p."ingredients",
     'imageUrl',p."image",'priceAmount',p."priceAmount"::text,'legacyPrice',p."price",'currency',p."currency",
     'availability','available','createdAt',p."createdAt",'updatedAt',p."updatedAt")
     ORDER BY p."sortOrder",p."createdAt" DESC,p."dbId") FROM "Product" p WHERE p."categoryId"=c."dbId" AND p."available"),'[]'::jsonb))
   ORDER BY c."order",c."dbId") FROM "Category" c WHERE c."brandId"=b."id" AND c."isActive"),'[]'::jsonb))
FROM "Brand" b WHERE b."id"='legacy-ilmio-brand';
UPDATE "StoreBrand" SET "currentMenuVersionId"='legacy-ilmio-menu-v1' WHERE "id"='legacy-ilmio-main';

CREATE FUNCTION menu_snapshot_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Published menu versions are immutable'; END $$;
CREATE TRIGGER "MenuVersion_immutable" BEFORE UPDATE OR DELETE ON "MenuVersion"
FOR EACH ROW EXECUTE FUNCTION menu_snapshot_immutable();

CREATE FUNCTION assignment_ownership_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE store_org text; brand_org text;
BEGIN
 IF TG_OP='UPDATE' AND (NEW."storeId"<>OLD."storeId" OR NEW."brandId"<>OLD."brandId") THEN
   RAISE EXCEPTION 'Assignment ownership is immutable';
 END IF;
 SELECT "orgId" INTO store_org FROM "Store" WHERE "id"=NEW."storeId";
 SELECT "orgId" INTO brand_org FROM "Brand" WHERE "id"=NEW."brandId";
 IF store_org<>brand_org AND NEW."status"='active' AND NOT EXISTS
   (SELECT 1 FROM "AdminProfile" WHERE "id"=NEW."approvedBy" AND "isPlatformAdmin" AND "status"='active') THEN
   RAISE EXCEPTION 'A cross-owner assignment requires platform approval';
 END IF;
 IF NEW."currentMenuVersionId" IS NOT NULL AND NOT EXISTS
   (SELECT 1 FROM "MenuVersion" WHERE "id"=NEW."currentMenuVersionId" AND "storeBrandId"=NEW."id") THEN
   RAISE EXCEPTION 'Current menu must belong to its assignment';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "StoreBrand_ownership" BEFORE INSERT OR UPDATE ON "StoreBrand"
FOR EACH ROW EXECUTE FUNCTION assignment_ownership_guard();

CREATE FUNCTION product_currency_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM "Brand" WHERE "id"=NEW."brandId" AND "currency"=NEW."currency") THEN
   RAISE EXCEPTION 'Product currency must match its brand';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "Product_currency" BEFORE INSERT OR UPDATE ON "Product"
FOR EACH ROW EXECUTE FUNCTION product_currency_guard();

-- App data is served by the authenticated Express API, never the public Data API.
DO $$
DECLARE t text; r text;
BEGIN
 FOREACH t IN ARRAY ARRAY['Organization','Brand','Store','StoreBrand','AdminProfile','OrgMembership','BrandMembership','Category','Product','ProductStoreOverride','MenuVersion','StoreSession','LoginAttempt','Asset','AuditLog'] LOOP
   EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
   EXECUTE format('REVOKE ALL ON TABLE %I FROM PUBLIC',t);
   FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
     IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=r) THEN
       EXECUTE format('REVOKE ALL ON TABLE %I FROM %I',t,r);
     END IF;
   END LOOP;
 END LOOP;
END $$;
COMMIT;
