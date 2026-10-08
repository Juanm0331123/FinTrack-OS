-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING_VERIFICATION');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AuthTokenType" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "OAuthProvider" AS ENUM ('GOOGLE', 'GITHUB');

-- CreateEnum
CREATE TYPE "EntryCategory" AS ENUM ('SUBSCRIPTION', 'FIXED', 'POCKET', 'SAVINGS', 'DEBT', 'OTHER');

-- CreateEnum
CREATE TYPE "LeftoverDestination" AS ENUM ('AVAILABLE', 'SAVINGS');

-- CreateEnum
CREATE TYPE "DebtStatus" AS ENUM ('ACTIVE', 'PAID');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "preferred_currency_code" CHAR(3) NOT NULL DEFAULT 'COP',
    "timezone" VARCHAR(100) NOT NULL DEFAULT 'UTC',
    "last_login_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "device_name" VARCHAR(150),
    "ip_address" VARCHAR(100),
    "user_agent" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "AuthTokenType" NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "token_salt" VARCHAR(255),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" "OAuthProvider" NOT NULL,
    "provider_account_id" VARCHAR(255) NOT NULL,
    "provider_email" VARCHAR(255),
    "display_name" VARCHAR(255),
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oauth_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_settings" (
    "user_id" UUID NOT NULL,
    "cushion_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "benefits_rate" DECIMAL(6,4) NOT NULL DEFAULT 0.08,
    "redirect_debt_overpayments" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_settings_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "money_accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "money_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "month_sheets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "year_month" VARCHAR(7) NOT NULL,
    "salary" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "benefits_override" DECIMAL(14,2),
    "transport_allowance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "other_deductions" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "disability_income" DECIMAL(14,2),
    "previous_leftover" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "leftover_destination" "LeftoverDestination" NOT NULL DEFAULT 'AVAILABLE',
    "notes" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "month_sheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "month_entries" (
    "id" UUID NOT NULL,
    "sheet_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "account_id" UUID,
    "debt_id" UUID,
    "concept" VARCHAR(120) NOT NULL,
    "amount" DECIMAL(14,2),
    "category" "EntryCategory" NOT NULL DEFAULT 'OTHER',
    "due_day" SMALLINT,
    "note" VARCHAR(200),
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "month_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "debts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "lender" VARCHAR(120),
    "dates_note" VARCHAR(120),
    "due_day" SMALLINT,
    "total_balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "shared_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "shared_percent" DECIMAL(5,2),
    "shared_with" VARCHAR(60),
    "monthly_rate" DECIMAL(9,6) NOT NULL DEFAULT 0,
    "insurance_rate" DECIMAL(9,6) NOT NULL DEFAULT 0,
    "minimum_payment" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "partner_contribution" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "my_minimum_override" DECIMAL(14,2),
    "payment_cap" DECIMAL(14,2),
    "status" "DebtStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" VARCHAR(300),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "debts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "auth_tokens_token_hash_key" ON "auth_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "auth_tokens_user_id_type_idx" ON "auth_tokens"("user_id", "type");

-- CreateIndex
CREATE INDEX "auth_tokens_user_id_type_revoked_at_used_at_idx" ON "auth_tokens"("user_id", "type", "revoked_at", "used_at");

-- CreateIndex
CREATE INDEX "auth_tokens_expires_at_idx" ON "auth_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "oauth_accounts_user_id_idx" ON "oauth_accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_accounts_provider_provider_account_id_key" ON "oauth_accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE INDEX "money_accounts_user_id_idx" ON "money_accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "money_accounts_user_id_name_key" ON "money_accounts"("user_id", "name");

-- CreateIndex
CREATE INDEX "month_sheets_user_id_idx" ON "month_sheets"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "month_sheets_user_id_year_month_key" ON "month_sheets"("user_id", "year_month");

-- CreateIndex
CREATE INDEX "month_entries_sheet_id_sort_order_idx" ON "month_entries"("sheet_id", "sort_order");

-- CreateIndex
CREATE INDEX "month_entries_user_id_idx" ON "month_entries"("user_id");

-- CreateIndex
CREATE INDEX "month_entries_account_id_idx" ON "month_entries"("account_id");

-- CreateIndex
CREATE INDEX "month_entries_debt_id_idx" ON "month_entries"("debt_id");

-- CreateIndex
CREATE INDEX "debts_user_id_idx" ON "debts"("user_id");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_settings" ADD CONSTRAINT "finance_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "money_accounts" ADD CONSTRAINT "money_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "month_sheets" ADD CONSTRAINT "month_sheets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "month_entries" ADD CONSTRAINT "month_entries_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "money_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "month_entries" ADD CONSTRAINT "month_entries_debt_id_fkey" FOREIGN KEY ("debt_id") REFERENCES "debts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "month_entries" ADD CONSTRAINT "month_entries_sheet_id_fkey" FOREIGN KEY ("sheet_id") REFERENCES "month_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "month_entries" ADD CONSTRAINT "month_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debts" ADD CONSTRAINT "debts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
