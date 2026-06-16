ALTER TABLE "auth_tokens"
ADD COLUMN "token_salt" VARCHAR(255),
ADD COLUMN "revoked_at" TIMESTAMP(3);

CREATE INDEX "auth_tokens_user_id_type_revoked_at_used_at_idx"
ON "auth_tokens"("user_id", "type", "revoked_at", "used_at");
