CREATE TYPE "BudgetBucket" AS ENUM ('NEEDS', 'WANTS', 'SAVINGS_DEBT');

ALTER TABLE "categories"
ADD COLUMN "budget_bucket" "BudgetBucket";
