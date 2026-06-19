-- CreateEnum
CREATE TYPE "ObligationType" AS ENUM ('FIXED', 'VARIABLE');

-- CreateEnum
CREATE TYPE "MonthlyObligationStatus" AS ENUM ('DRAFT', 'PAID', 'SKIPPED');

-- AlterTable
ALTER TABLE "debts"
ADD COLUMN "term_months" INTEGER;

-- AlterTable
ALTER TABLE "monthly_financial_profiles"
ADD COLUMN "carryover_source_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN "carryover_to_available_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN "carryover_to_savings_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN "initialized_at" TIMESTAMP(3),
ADD COLUMN "opening_balance" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "obligation_templates" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "obligation_type" "ObligationType" NOT NULL,
    "suggested_amount" DECIMAL(14,2),
    "suggested_due_day" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "obligation_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_obligations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "template_id" UUID,
    "category_id" UUID NOT NULL,
    "transaction_id" UUID,
    "year_month" VARCHAR(7) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "obligation_type" "ObligationType" NOT NULL,
    "status" "MonthlyObligationStatus" NOT NULL DEFAULT 'DRAFT',
    "planned_amount" DECIMAL(14,2) NOT NULL,
    "paid_amount" DECIMAL(14,2),
    "expected_on" DATE,
    "paid_on" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_obligations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paycheck_entries" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "transaction_id" UUID NOT NULL,
    "effective_month" VARCHAR(7) NOT NULL,
    "paid_on" DATE NOT NULL,
    "salary_base" DECIMAL(14,2) NOT NULL,
    "transport_allowance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_deductions" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "net_received" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paycheck_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "debt_payment_entries" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "debt_id" UUID NOT NULL,
    "transaction_id" UUID NOT NULL,
    "effective_month" VARCHAR(7) NOT NULL,
    "paid_on" DATE NOT NULL,
    "minimum_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "extra_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "debt_payment_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "obligation_templates_user_id_idx" ON "obligation_templates"("user_id");

-- CreateIndex
CREATE INDEX "obligation_templates_category_id_idx" ON "obligation_templates"("category_id");

-- CreateIndex
CREATE INDEX "obligation_templates_is_active_idx" ON "obligation_templates"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_obligations_transaction_id_key" ON "monthly_obligations"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_obligations_template_id_year_month_key" ON "monthly_obligations"("template_id", "year_month");

-- CreateIndex
CREATE INDEX "monthly_obligations_user_id_idx" ON "monthly_obligations"("user_id");

-- CreateIndex
CREATE INDEX "monthly_obligations_year_month_idx" ON "monthly_obligations"("year_month");

-- CreateIndex
CREATE INDEX "monthly_obligations_status_idx" ON "monthly_obligations"("status");

-- CreateIndex
CREATE INDEX "monthly_obligations_category_id_idx" ON "monthly_obligations"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "paycheck_entries_transaction_id_key" ON "paycheck_entries"("transaction_id");

-- CreateIndex
CREATE INDEX "paycheck_entries_user_id_idx" ON "paycheck_entries"("user_id");

-- CreateIndex
CREATE INDEX "paycheck_entries_effective_month_idx" ON "paycheck_entries"("effective_month");

-- CreateIndex
CREATE INDEX "paycheck_entries_paid_on_idx" ON "paycheck_entries"("paid_on");

-- CreateIndex
CREATE UNIQUE INDEX "debt_payment_entries_transaction_id_key" ON "debt_payment_entries"("transaction_id");

-- CreateIndex
CREATE INDEX "debt_payment_entries_user_id_idx" ON "debt_payment_entries"("user_id");

-- CreateIndex
CREATE INDEX "debt_payment_entries_debt_id_idx" ON "debt_payment_entries"("debt_id");

-- CreateIndex
CREATE INDEX "debt_payment_entries_effective_month_idx" ON "debt_payment_entries"("effective_month");

-- CreateIndex
CREATE INDEX "debt_payment_entries_paid_on_idx" ON "debt_payment_entries"("paid_on");

-- AddForeignKey
ALTER TABLE "obligation_templates" ADD CONSTRAINT "obligation_templates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obligation_templates" ADD CONSTRAINT "obligation_templates_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_obligations" ADD CONSTRAINT "monthly_obligations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_obligations" ADD CONSTRAINT "monthly_obligations_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "obligation_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_obligations" ADD CONSTRAINT "monthly_obligations_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_obligations" ADD CONSTRAINT "monthly_obligations_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paycheck_entries" ADD CONSTRAINT "paycheck_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paycheck_entries" ADD CONSTRAINT "paycheck_entries_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debt_payment_entries" ADD CONSTRAINT "debt_payment_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debt_payment_entries" ADD CONSTRAINT "debt_payment_entries_debt_id_fkey" FOREIGN KEY ("debt_id") REFERENCES "debts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debt_payment_entries" ADD CONSTRAINT "debt_payment_entries_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
