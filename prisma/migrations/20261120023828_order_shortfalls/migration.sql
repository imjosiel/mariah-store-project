-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "stockShortfalls" TEXT[] DEFAULT ARRAY[]::TEXT[];
