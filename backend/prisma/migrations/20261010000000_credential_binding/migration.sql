-- Revisión independiente del QA (RAUTH-01, RAUTH-02, RAUTH-03).
-- Solo añade columnas con valores por defecto: no reescribe ni borra datos existentes.

-- Sello de seguridad: cambia con cualquier cambio de credenciales, estado o cierre total de
-- sesiones. Los códigos y la apertura de sesión se validan contra el sello vigente.
ALTER TABLE "users" ADD COLUMN     "security_stamp" UUID NOT NULL DEFAULT gen_random_uuid();

-- 1 = hash anterior a la regla de 72 bytes (puede ocultar una contraseña más larga);
-- 2 = hash creado con contraseña de 72 bytes o menos. Las cuentas existentes quedan en 1.
ALTER TABLE "users" ADD COLUMN     "password_hash_version" SMALLINT NOT NULL DEFAULT 1;

-- Códigos ligados al sello con que se emitieron; los de registro exigen además la contraseña.
-- Los códigos anteriores quedan sin sello y, por tanto, sin validez (vencen en minutos).
ALTER TABLE "auth_tokens" ADD COLUMN     "requires_password" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "security_stamp" UUID;
