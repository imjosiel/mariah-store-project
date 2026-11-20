-- CreateTable
CREATE TABLE "StorageSetting" (
    "id" TEXT NOT NULL,
    "limitBytes" INTEGER NOT NULL DEFAULT 1073741824,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorageSetting_pkey" PRIMARY KEY ("id")
);
