-- Datos sintéticos sobre el esquema anterior a 20261009000000_qa_remediation.
-- Ninguno corresponde a personas reales. Usado por test/migrations/migration-upgrade.test.ts.
INSERT INTO "users" ("id", "first_name", "email", "password_hash", "status", "updated_at") VALUES
    ('00000000-0000-4000-8000-000000000001', 'Ana', 'ana.migracion@fintrack.test', '$2b$04$abcdefghijklmnopqrstuuJ8N3o0eqKZ6Yxq2l8Q9aR3u5k1y5S2a', 'ACTIVE', NOW()),
    ('00000000-0000-4000-8000-000000000002', 'Beto', 'beto.migracion@fintrack.test', '$2b$04$abcdefghijklmnopqrstuuJ8N3o0eqKZ6Yxq2l8Q9aR3u5k1y5S2a', 'ACTIVE', NOW());

INSERT INTO "refresh_tokens" ("id", "user_id", "token_hash", "device_name", "ip_address", "user_agent", "expires_at", "revoked_at", "created_at") VALUES
    ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000001', 'hash-activo', 'web', '203.0.113.10', 'Agente QA', NOW() + INTERVAL '6 days', NULL, NOW() - INTERVAL '1 day'),
    ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000001', 'hash-revocado', NULL, NULL, NULL, NOW() + INTERVAL '6 days', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '2 days');

INSERT INTO "money_accounts" ("id", "user_id", "name", "sort_order", "created_at", "updated_at") VALUES
    ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000001', 'Banco', 0, NOW() - INTERVAL '3 days', NOW()),
    ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000001', 'banco', 1, NOW() - INTERVAL '2 days', NOW()),
    ('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000001', 'BANCO', 2, NOW() - INTERVAL '1 day', NOW()),
    ('00000000-0000-4000-8000-000000000204', '00000000-0000-4000-8000-000000000001', 'banco (2)', 3, NOW(), NOW()),
    ('00000000-0000-4000-8000-000000000205', '00000000-0000-4000-8000-000000000002', 'Banco', 0, NOW(), NOW());

INSERT INTO "debts" ("id", "user_id", "name", "total_balance", "updated_at") VALUES
    ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000001', 'Tarjeta', 1000000.00, NOW());

INSERT INTO "month_sheets" ("id", "user_id", "year_month", "salary", "updated_at") VALUES
    ('00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000001', '2026-09', 3000000.00, NOW());

INSERT INTO "month_entries" ("id", "sheet_id", "user_id", "account_id", "debt_id", "concept", "amount", "category", "updated_at") VALUES
    ('00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000202', NULL, 'Mercado', 450000.00, 'POCKET', NOW()),
    ('00000000-0000-4000-8000-000000000502', '00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000301', 'Cuota tarjeta', 120000.00, 'DEBT', NOW());

INSERT INTO "pocket_spends" ("id", "entry_id", "user_id", "amount", "spent_on", "updated_at") VALUES
    ('00000000-0000-4000-8000-000000000601', '00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000001', 50000.00, '2026-09-05', NOW());
