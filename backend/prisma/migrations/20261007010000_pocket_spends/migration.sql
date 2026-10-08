-- CreateTable
CREATE TABLE "pocket_spends" (
    "id" UUID NOT NULL,
    "entry_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "note" VARCHAR(120),
    "spent_on" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pocket_spends_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pocket_spends_entry_id_spent_on_idx" ON "pocket_spends"("entry_id", "spent_on");

-- CreateIndex
CREATE INDEX "pocket_spends_user_id_idx" ON "pocket_spends"("user_id");

-- AddForeignKey
ALTER TABLE "pocket_spends" ADD CONSTRAINT "pocket_spends_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "month_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pocket_spends" ADD CONSTRAINT "pocket_spends_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
