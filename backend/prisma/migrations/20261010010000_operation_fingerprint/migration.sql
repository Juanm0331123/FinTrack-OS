-- Revisión independiente del QA (RDATA-01): identidad del contenido de una operación
-- idempotente. Un reintento solo se reproduce si coinciden tipo, mes y huella (por ejemplo
-- el origen de la copia al crear una hoja). Columna opcional: las operaciones anteriores
-- quedan sin huella y se comparan solo por tipo y mes.
ALTER TABLE "finance_operations" ADD COLUMN     "fingerprint" VARCHAR(100);
