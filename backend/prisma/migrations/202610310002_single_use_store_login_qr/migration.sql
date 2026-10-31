CREATE TABLE "StoreLoginQrToken" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "consumedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreLoginQrToken_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "StoreLoginQrToken_storeId_fkey" FOREIGN KEY ("storeId")
        REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "StoreLoginQrToken_tokenHash_key"
    ON "StoreLoginQrToken"("tokenHash");

CREATE INDEX "StoreLoginQrToken_storeId_expiresAt_idx"
    ON "StoreLoginQrToken"("storeId", "expiresAt");
