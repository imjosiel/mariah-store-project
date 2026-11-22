-- CreateEnum
CREATE TYPE "PostSaleType" AS ENUM ('TROCA', 'DEVOLUCAO', 'DEFEITO');

-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'RETURNED';

-- CreateTable
CREATE TABLE "CommissionSetting" (
    "id" TEXT NOT NULL,
    "onlineGraceDays" INTEGER NOT NULL DEFAULT 7,
    "storeGraceDays" INTEGER NOT NULL DEFAULT 7,
    "commissionBps" INTEGER NOT NULL DEFAULT 1000,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedByEmail" TEXT,

    CONSTRAINT "CommissionSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostSaleEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" "PostSaleType" NOT NULL,
    "reason" TEXT NOT NULL,
    "authorizedByEmail" TEXT NOT NULL,
    "restock" BOOLEAN NOT NULL DEFAULT false,
    "refunded" BOOLEAN NOT NULL DEFAULT false,
    "commissionReversed" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostSaleEvent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PostSaleEvent" ADD CONSTRAINT "PostSaleEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
