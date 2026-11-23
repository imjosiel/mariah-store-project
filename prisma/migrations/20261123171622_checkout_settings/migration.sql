-- CreateEnum
CREATE TYPE "CheckoutMethod" AS ENUM ('PIX_GATEWAY', 'WHATSAPP');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "gatewayPaymentId" TEXT;

-- CreateTable
CREATE TABLE "CheckoutSetting" (
    "id" TEXT NOT NULL,
    "pixGatewayEnabled" BOOLEAN NOT NULL DEFAULT false,
    "whatsappEnabled" BOOLEAN NOT NULL DEFAULT true,
    "preferredMethod" "CheckoutMethod" NOT NULL DEFAULT 'WHATSAPP',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedByEmail" TEXT,

    CONSTRAINT "CheckoutSetting_pkey" PRIMARY KEY ("id")
);
