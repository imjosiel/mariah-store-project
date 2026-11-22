-- CreateEnum
CREATE TYPE "SaleChannel" AS ENUM ('ONLINE', 'LOJA');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PIX', 'DINHEIRO', 'CARTAO', 'GATEWAY', 'OUTRO');

-- CreateEnum
CREATE TYPE "FinancialEventType" AS ENUM ('PAYMENT_RECEIVED', 'COMMISSION_PAID', 'COMMISSION_REFUNDED', 'ORDER_REFUNDED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "channel" "SaleChannel" NOT NULL DEFAULT 'ONLINE',
ADD COLUMN     "paymentMethod" "PaymentMethod";

-- CreateTable
CREATE TABLE "FinancialEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "type" "FinancialEventType" NOT NULL,
    "amountInCents" INTEGER NOT NULL,
    "storeAmountInCents" INTEGER,
    "feeInCents" INTEGER NOT NULL DEFAULT 0,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "externalId" TEXT,
    "receiptUrl" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinancialEvent_externalId_key" ON "FinancialEvent"("externalId");

-- CreateIndex
CREATE INDEX "FinancialEvent_occurredAt_idx" ON "FinancialEvent"("occurredAt");

-- AddForeignKey
ALTER TABLE "FinancialEvent" ADD CONSTRAINT "FinancialEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
