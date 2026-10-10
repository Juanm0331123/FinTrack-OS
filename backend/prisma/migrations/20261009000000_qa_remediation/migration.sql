-- QA remediation: sesiones con familia, idempotencia financiera, rate limiting compartido
-- y ownership reforzado en SQL. Conserva los datos existentes.

-- 1. Verificación previa de ownership. Si existen filas cuyo dueño no coincide con el de su
--    recurso padre, la migración se detiene sin cambios: no hay forma segura de corregirlas
--    automáticamente. Ver docs/qa-backend-remediacion.md (procedimiento de migración).
DO $$
DECLARE
    entry_sheet_mismatch INTEGER;
    entry_account_mismatch INTEGER;
    entry_debt_mismatch INTEGER;
    spend_entry_mismatch INTEGER;
BEGIN
    SELECT COUNT(*) INTO entry_sheet_mismatch
    FROM "month_entries" e JOIN "month_sheets" s ON s."id" = e."sheet_id"
    WHERE s."user_id" <> e."user_id";

    SELECT COUNT(*) INTO entry_account_mismatch
    FROM "month_entries" e JOIN "money_accounts" a ON a."id" = e."account_id"
    WHERE a."user_id" <> e."user_id";

    SELECT COUNT(*) INTO entry_debt_mismatch
    FROM "month_entries" e JOIN "debts" d ON d."id" = e."debt_id"
    WHERE d."user_id" <> e."user_id";

    SELECT COUNT(*) INTO spend_entry_mismatch
    FROM "pocket_spends" p JOIN "month_entries" e ON e."id" = p."entry_id"
    WHERE e."user_id" <> p."user_id";

    IF entry_sheet_mismatch + entry_account_mismatch + entry_debt_mismatch + spend_entry_mismatch > 0 THEN
        RAISE EXCEPTION 'Ownership inconsistente: filas/hoja=%, filas/cuenta=%, filas/deuda=%, gastos/fila=%. Resuelve con scripts/check-migration-conflicts.ts antes de migrar.',
            entry_sheet_mismatch, entry_account_mismatch, entry_debt_mismatch, spend_entry_mismatch;
    END IF;
END $$;

-- CreateEnum
CREATE TYPE "SessionRevokeReason" AS ENUM ('LOGOUT', 'LOGOUT_ALL', 'PASSWORD_RESET', 'PASSWORD_CHANGE', 'EMAIL_CHANGE', 'REFRESH_REUSE');

-- CreateEnum
CREATE TYPE "FinanceOperationKind" AS ENUM ('CREATE_SHEET', 'COPY_PREVIOUS_SHEET');

-- AlterEnum
ALTER TYPE "AuthTokenType" ADD VALUE 'EMAIL_CHANGE';

-- AlterTable
ALTER TABLE "auth_tokens" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "target_email" VARCHAR(255);

-- 2. Sesiones: cada refresh token existente se convierte en su propia familia, conservando
--    dispositivo, IP, agente, creación, expiración y revocación.
CREATE TABLE "auth_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "device_name" VARCHAR(150),
    "ip_address" VARCHAR(100),
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idle_expires_at" TIMESTAMP(3) NOT NULL,
    "absolute_expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "revoke_reason" "SessionRevokeReason",

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

INSERT INTO "auth_sessions" (
    "id", "user_id", "device_name", "ip_address", "user_agent", "created_at",
    "last_used_at", "idle_expires_at", "absolute_expires_at", "revoked_at"
)
SELECT "id", "user_id", "device_name", "ip_address", "user_agent", "created_at",
       "created_at", "expires_at", "expires_at", "revoked_at"
FROM "refresh_tokens";

ALTER TABLE "refresh_tokens" ADD COLUMN "session_id" UUID,
ADD COLUMN     "used_at" TIMESTAMP(3);

UPDATE "refresh_tokens" SET "session_id" = "id";

ALTER TABLE "refresh_tokens" ALTER COLUMN "session_id" SET NOT NULL,
DROP COLUMN "device_name",
DROP COLUMN "ip_address",
DROP COLUMN "user_agent";

-- CreateTable
CREATE TABLE "finance_operations" (
    "user_id" UUID NOT NULL,
    "key" UUID NOT NULL,
    "kind" "FinanceOperationKind" NOT NULL,
    "year_month" VARCHAR(7) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_operations_pkey" PRIMARY KEY ("user_id","key")
);

-- CreateTable
CREATE TABLE "rate_limit_buckets" (
    "key" VARCHAR(200) NOT NULL,
    "hits" INTEGER NOT NULL,
    "reset_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limit_buckets_pkey" PRIMARY KEY ("key")
);

-- 3. Nombres de cuenta únicos sin distinguir mayúsculas. Los duplicados existentes no se
--    borran: la cuenta más antigua conserva su nombre y las demás reciben un sufijo " (n)".
--    Sus filas y gastos siguen asociados a la misma cuenta.
ALTER TABLE "money_accounts" ADD COLUMN "name_key" VARCHAR(60);

UPDATE "money_accounts" SET "name_key" = lower(normalize(btrim("name"), NFC));

DO $$
DECLARE
    duplicate RECORD;
    suffix_number INTEGER;
    candidate_name TEXT;
    renamed_count INTEGER := 0;
BEGIN
    FOR duplicate IN
        SELECT "id", "user_id", "name"
        FROM (
            SELECT "id", "user_id", "name",
                   ROW_NUMBER() OVER (PARTITION BY "user_id", "name_key" ORDER BY "created_at", "id") AS position
            FROM "money_accounts"
        ) ranked
        WHERE position > 1
    LOOP
        suffix_number := 2;

        LOOP
            candidate_name := left(btrim(duplicate."name"), 60 - length(' (' || suffix_number || ')'))
                || ' (' || suffix_number || ')';

            EXIT WHEN NOT EXISTS (
                SELECT 1 FROM "money_accounts"
                WHERE "user_id" = duplicate."user_id"
                  AND "name_key" = lower(normalize(candidate_name, NFC))
            );

            suffix_number := suffix_number + 1;
        END LOOP;

        UPDATE "money_accounts"
        SET "name" = candidate_name, "name_key" = lower(normalize(candidate_name, NFC))
        WHERE "id" = duplicate."id";

        renamed_count := renamed_count + 1;
    END LOOP;

    IF renamed_count > 0 THEN
        RAISE NOTICE 'Cuentas renombradas por nombre duplicado: %', renamed_count;
    END IF;
END $$;

ALTER TABLE "money_accounts" ALTER COLUMN "name_key" SET NOT NULL;

-- DropIndex
DROP INDEX "money_accounts_user_id_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "money_accounts_user_id_name_key_key" ON "money_accounts"("user_id", "name_key");

-- 4. Ownership compuesto: los hijos solo pueden referenciar padres del mismo usuario.
-- CreateIndex
CREATE UNIQUE INDEX "debts_id_user_id_key" ON "debts"("id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "money_accounts_id_user_id_key" ON "money_accounts"("id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "month_entries_id_user_id_key" ON "month_entries"("id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "month_sheets_id_user_id_key" ON "month_sheets"("id", "user_id");

-- DropForeignKey
ALTER TABLE "month_entries" DROP CONSTRAINT "month_entries_account_id_fkey";

-- DropForeignKey
ALTER TABLE "month_entries" DROP CONSTRAINT "month_entries_sheet_id_fkey";

-- DropForeignKey
ALTER TABLE "pocket_spends" DROP CONSTRAINT "pocket_spends_entry_id_fkey";

-- CreateIndex
CREATE INDEX "auth_sessions_user_id_revoked_at_idx" ON "auth_sessions"("user_id", "revoked_at");

-- CreateIndex
CREATE INDEX "auth_sessions_absolute_expires_at_idx" ON "auth_sessions"("absolute_expires_at");

-- CreateIndex
CREATE INDEX "finance_operations_created_at_idx" ON "finance_operations"("created_at");

-- CreateIndex
CREATE INDEX "rate_limit_buckets_reset_at_idx" ON "rate_limit_buckets"("reset_at");

-- CreateIndex
CREATE INDEX "refresh_tokens_session_id_idx" ON "refresh_tokens"("session_id");

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "auth_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: una cuenta usada no se puede borrar (se archiva); evita perder la asociación.
ALTER TABLE "month_entries" ADD CONSTRAINT "month_entries_account_id_user_id_fkey" FOREIGN KEY ("account_id", "user_id") REFERENCES "money_accounts"("id", "user_id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "month_entries" ADD CONSTRAINT "month_entries_debt_owner_fkey" FOREIGN KEY ("debt_id", "user_id") REFERENCES "debts"("id", "user_id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "month_entries" ADD CONSTRAINT "month_entries_sheet_id_user_id_fkey" FOREIGN KEY ("sheet_id", "user_id") REFERENCES "month_sheets"("id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pocket_spends" ADD CONSTRAINT "pocket_spends_entry_id_user_id_fkey" FOREIGN KEY ("entry_id", "user_id") REFERENCES "month_entries"("id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_operations" ADD CONSTRAINT "finance_operations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
