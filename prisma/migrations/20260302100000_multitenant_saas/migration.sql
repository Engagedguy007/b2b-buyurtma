-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('UZ', 'RU', 'EN');

-- CreateTable
CREATE TABLE "Company" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "defaultLocale" "Locale" NOT NULL DEFAULT 'UZ',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutletInvite" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "pinHash" TEXT NOT NULL,
  "outletName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "region" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT NOT NULL,
  CONSTRAINT "OutletInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");
CREATE UNIQUE INDEX "OutletInvite_token_key" ON "OutletInvite"("token");
CREATE INDEX "OutletInvite_companyId_expiresAt_idx" ON "OutletInvite"("companyId", "expiresAt");

ALTER TABLE "User" ADD COLUMN "companyId" TEXT;
ALTER TABLE "User" ADD COLUMN "locale" "Locale";
ALTER TABLE "OutletProfile" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Product" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Order" ADD COLUMN "companyId" TEXT;
ALTER TABLE "OrderTemplate" ADD COLUMN "companyId" TEXT;
ALTER TABLE "FavoriteProduct" ADD COLUMN "companyId" TEXT;

WITH default_company AS (
  INSERT INTO "Company" ("id", "name", "slug", "defaultLocale", "createdAt")
  VALUES ('company_default_seed', 'Default Company', 'default-company', 'UZ', NOW())
  ON CONFLICT ("slug") DO UPDATE SET "name" = EXCLUDED."name"
  RETURNING "id"
)
UPDATE "User"
SET "companyId" = (SELECT "id" FROM default_company)
WHERE "companyId" IS NULL;

UPDATE "OutletProfile" op
SET "companyId" = u."companyId"
FROM "User" u
WHERE op."userId" = u."id" AND op."companyId" IS NULL;

UPDATE "Product"
SET "companyId" = (SELECT "id" FROM "Company" WHERE "slug" = 'default-company' LIMIT 1)
WHERE "companyId" IS NULL;

UPDATE "Order" o
SET "companyId" = u."companyId"
FROM "User" u
WHERE o."outletId" = u."id" AND o."companyId" IS NULL;

UPDATE "OrderTemplate" ot
SET "companyId" = u."companyId"
FROM "User" u
WHERE ot."outletId" = u."id" AND ot."companyId" IS NULL;

UPDATE "FavoriteProduct" fp
SET "companyId" = u."companyId"
FROM "User" u
WHERE fp."outletId" = u."id" AND fp."companyId" IS NULL;

ALTER TABLE "User" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "OutletProfile" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "Product" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "OrderTemplate" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "FavoriteProduct" ALTER COLUMN "companyId" SET NOT NULL;

ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OutletProfile" ADD CONSTRAINT "OutletProfile_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderTemplate" ADD CONSTRAINT "OrderTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FavoriteProduct" ADD CONSTRAINT "FavoriteProduct_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OutletInvite" ADD CONSTRAINT "OutletInvite_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OutletInvite" ADD CONSTRAINT "OutletInvite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DROP INDEX IF EXISTS "Product_sku_key";
CREATE UNIQUE INDEX "Product_companyId_sku_key" ON "Product"("companyId", "sku");

CREATE INDEX "User_companyId_role_idx" ON "User"("companyId", "role");
CREATE INDEX "Product_companyId_isActive_idx" ON "Product"("companyId", "isActive");
DROP INDEX IF EXISTS "Order_outletId_createdAt_idx";
DROP INDEX IF EXISTS "Order_status_deliveryDate_idx";
CREATE INDEX "Order_companyId_outletId_createdAt_idx" ON "Order"("companyId", "outletId", "createdAt");
CREATE INDEX "Order_companyId_status_deliveryDate_idx" ON "Order"("companyId", "status", "deliveryDate");
DROP INDEX IF EXISTS "OrderTemplate_outletId_createdAt_idx";
CREATE INDEX "OrderTemplate_companyId_outletId_createdAt_idx" ON "OrderTemplate"("companyId", "outletId", "createdAt");
CREATE INDEX "FavoriteProduct_companyId_outletId_idx" ON "FavoriteProduct"("companyId", "outletId");
CREATE INDEX "OutletProfile_companyId_region_idx" ON "OutletProfile"("companyId", "region");
