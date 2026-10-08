-- CreateEnum
CREATE TYPE "DebtStrategy" AS ENUM ('AVALANCHE', 'HIGHEST_PAYMENT', 'LOWEST_PAYMENT', 'RECOMMENDED');

-- AlterTable
ALTER TABLE "finance_settings" ADD COLUMN     "debt_strategy" "DebtStrategy" NOT NULL DEFAULT 'AVALANCHE';
