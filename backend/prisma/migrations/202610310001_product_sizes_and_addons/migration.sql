ALTER TABLE "Product"
ADD COLUMN "sizes" JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN "addOnGroups" JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE "ProductStoreOverride"
ADD COLUMN "unavailableOptionIds" JSONB NOT NULL DEFAULT '[]'::jsonb;
