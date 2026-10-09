# Remediación del QA backend de FinTrack OS

Entrega para revisión independiente del agente auditor original. Este documento **no** es un aval: la aceptación corresponde al auditor tras revisar el código, reproducir las pruebas y verificar esta matriz. Ninguna auditoría demuestra ausencia absoluta de vulnerabilidades; aquí se reportan solo validaciones ejecutadas de verdad.

- Baseline auditado: `main` / `origin/main` `e9208dc67062aaad1aa215f50b289bb93ddb82c3` (informe `.local/backend-qa/backend-qa-report.json`, 45 entradas: 12 altas, 28 medias, 5 bajas).
- Rama de entrega: `fix/backend-qa-remediation` (sin integrar en `main`, sin desplegar). Commits y archivos: ver [Identificación de la entrega](#identificación-de-la-entrega).
- Fecha: 2026-10-09. Segunda ronda (19 incidencias de la revisión independiente sobre `72c8d60`): ver [Segunda ronda](#segunda-ronda-revisión-independiente-19-incidencias).

## Cómo reproducir

Requisitos: Node 24.16, pnpm 11.27.1, Docker. Nada de esto usa `.local/`, secretos personales ni la base de Neon.

```bash
# PostgreSQL aislado (postgres:18, puerto 55433 solo en loopback)
cd backend
docker compose -f test/compose.yaml up -d
export TEST_DATABASE_URL=postgresql://fintrack_test:fintrack_test_only@127.0.0.1:55433/fintrack_test

pnpm install --frozen-lockfile
DATABASE_URL=$TEST_DATABASE_URL pnpm prisma:generate   # Prisma 7 no genera el cliente al instalar
pnpm typecheck
pnpm test                 # unitarias (node:test)
pnpm test:migrations      # base nueva, actualización con datos, aborto por ownership inconsistente
pnpm test:integration     # API Express + PostgreSQL reales (aplica migraciones con migrate deploy)
DATABASE_URL=$TEST_DATABASE_URL DIRECT_URL=$TEST_DATABASE_URL pnpm prisma:validate
bash scripts/docker-smoke.sh   # imagen de producción, TLS verify-full, salud, SIGTERM

cd ../frontend
pnpm install --frozen-lockfile
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Salvaguardas de las pruebas:

- `test/support/test-database.ts` rechaza cualquier `TEST_DATABASE_URL` que no sea local (o esté en `TEST_DATABASE_ALLOWED_HOSTS`, usado solo por CI) o cuyo nombre de base no contenga `test`/`qa`. `test/support/env.ts` fija `DATABASE_URL`/`DIRECT_URL` a esa base aunque exista un `.env` local, y los procesos de Prisma reciben `DOTENV_CONFIG_PATH` inexistente.
- Usuarios sintéticos `*@fintrack.test`, nunca la cuenta del Project Owner. Cada archivo borra lo que crea en `after`, y el *global setup* limpia restos antes de empezar. Las bases temporales de migraciones se crean con nombre aleatorio y se eliminan en `after` aunque la prueba falle.
- Correo y OAuth se sustituyen solo en la frontera HTTP (`EMAIL_PROVIDER=outbox`, válido únicamente con `NODE_ENV=test`, e interceptación de `fetch` hacia Google/GitHub/Resend en `test/support/fake-providers.ts`). La API y PostgreSQL funcionan de verdad.

## Validaciones ejecutadas (primera ronda, hasta `f74e338`)

| Comprobación | Entorno | Resultado |
|---|---|---|
| `pnpm typecheck` backend | Windows 11, Node 24.16.0 | aprobado |
| `pnpm test` backend (unitarias) | Windows y contenedor Linux limpio | aprobado: 89/89 |
| `pnpm test:migrations` | Docker `postgres:18` local | aprobado: 4/4 |
| `pnpm test:integration` | Windows + `postgres:18` | 102 pruebas: 101 aprobadas, 1 omitida (SIGTERM real: Windows no entrega señales POSIX) |
| `pnpm test:integration` desde checkout limpio | Contenedor `node:24.16.0-bookworm-slim` + `postgres:18` | aprobado: 102/102, 0 omitidas (incluye SIGTERM real con request en curso) |
| `pnpm prisma:validate`, `migrate diff` sin drift, `migrate status` | base de prueba | aprobado |
| `bash scripts/docker-smoke.sh` | Docker Desktop (Linux) | aprobado: migraciones con imagen `migrator`, TLS `verify-full` con CA propia, `/health/live` 200, `/health/ready` 200, run.app directo 403, con secreto 401, logs JSON, sin `.env` en la imagen, usuario no root, SIGTERM → salida 0 en 1 s, sin `prisma:warn` |
| `pnpm audit` backend (prod + dev + opcionales) | registro npm | 0 avisos |
| `pnpm audit --prod` frontend | registro npm | 0 avisos |
| Frontend `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` | Windows | aprobado: lint limpio, 108/108 pruebas, build con Proxy |
| Recorrido en navegador (Chrome) del build de producción del frontend + proxy de borde + backend contra la base de prueba | localhost | aprobado: login; ningún JWT en `localStorage`/`sessionStorage` (solo la marca `fintrack.auth.has-session`); cookie de refresh no legible por JS; recarga simultánea de dos pestañas restaura la sesión sin 409 ni cierre; cambio de contraseña desde Configuración; logout; tras logout, `/dashboard` redirige sin llamar a `/refresh`; sin errores de consola |
| CI en GitHub Actions | — | **no ejecutado**: la rama no se ha subido al remoto |
| Staging (dominios, TLS gestionado, rewrite real, OAuth/correo reales, cold starts, backup/restore) | — | **bloqueado**: no existen aún los recursos de nube (ver pendientes) |

Ciclo TDD: se observó el fallo antes de corregir en el redondeo (`money.test.ts` con la regla anterior: `1.005 → 1.00`), en los reintentos del store del frontend (3 pruebas en rojo), en la revocación por reutilización de refresh (la suite detectó que la revocación no se esperaba) y en los fallos de entorno reales encontrados al correr en Linux. El resto de las pruebas se escribieron junto con el cambio: el arnés depende de contratos nuevos (proveedor `outbox`, claims, rutas), por lo que no puede ejecutarse contra el baseline; el fallo previo de esos casos es el reproducido por el QA original (`.local/backend-qa/*.json`).

## Matriz de cierre

Estados: **CV** = CORREGIDO Y VERIFICADO (local, con API y PostgreSQL reales salvo que se indique), **EXT** = IMPLEMENTADO, VERIFICACIÓN EXTERNA PENDIENTE. Ninguna entrada quedó BLOQUEADA ni NO APLICA. Las pruebas viven en `backend/test/integration/*.test.ts` (nombre del `describe`), `backend/test/migrations/`, `backend/src/**/*.test.ts` y `frontend/src/**/*.test.ts`.

| ID | Prio. | Causa raíz | Solución | Archivos principales | Pruebas | Evidencia | Estado | Riesgo residual |
|---|---|---|---|---|---|---|---|---|
| AUTH-01 | Alta | Vincular OAuth por correo a una cuenta **pendiente** conservaba la contraseña elegida por quien la registró. | Al vincular a una cuenta pendiente se reemplaza la contraseña por un hash inutilizable, se adoptan nombre/apellido del proveedor y se revocan códigos y sesiones previos, en una transacción. Una cuenta activa (correo ya probado por su dueño) conserva su contraseña. GitHub usa solo correos verificados de `/user/emails`. | `auth.repository.ts` (`linkOAuthAccount`), `auth.service.ts` (`handleOAuthCallback`), `oauth.client.ts` | `auth-accounts`: «OAuth linking (AUTH-01)» Google y GitHub, pendiente y activa, correo no verificado, `state` falso | 6/6 aprobadas; la contraseña del pre-registro devuelve 401 tras la verificación del dueño | CV | Proveedores reales solo en staging. Las cuentas creadas por OAuth no tienen contraseña utilizable hasta usar «Olvidé mi contraseña» (documentado en la UI). |
| AUTH-02 | Alta | `PATCH /users/:id` cambiaba correo y contraseña solo con un bearer. | PATCH ya no acepta `email` ni `password` (422). Nuevos `POST /api/auth/password` (contraseña actual, cierra las demás sesiones) y `POST /api/auth/email-change` + `/confirm` (contraseña actual, código al correo nuevo con intentos limitados, el correo cambia solo al confirmar, cierra las demás sesiones y avisa al correo anterior). UI «Seguridad de la cuenta» en Configuración. | `auth.routes.ts`, `auth.service.ts`, `users.schemas.ts`, `frontend/.../account-security-panel.tsx` | `auth-accounts`: «sensitive account changes (AUTH-02)»; navegador: cambio de contraseña | 4/4; recorrido en Chrome aprobado | CV | Entrega de correo real en staging. La sesión actual se conserva tras el cambio (decisión de UX). |
| AUTH-03 | Alta | Rotación de refresh y consumo de códigos leían y luego actualizaban por id sin condición: dos peticiones simultáneas consumían lo mismo. | Tabla `auth_sessions` (familia). El refresh se consume con `UPDATE … WHERE used_at IS NULL AND revoked_at IS NULL` y el sucesor se crea en la misma transacción. Una réplica concurrente dentro de `REFRESH_REUSE_GRACE_SECONDS` (30 s) recibe 409 `REFRESH_TOKEN_ROTATED` sin revocar; el cliente reintenta con la cookie nueva. Códigos de verificación, recuperación, sesión de recuperación y cambio de correo usan el mismo consumo condicional. | `auth.repository.ts` (`rotateRefreshToken`, `consumeCodeToken`), `session-policy.ts`, migración `20261009000000_qa_remediation` | `auth-sessions`: «refresh rotation (AUTH-03)»; `auth-accounts`: «one-time codes» (verificación ×3 simultáneas, código y reset ×2) | Exactamente un 200 y el resto 409/401; una sola rama válida en la base | CV | Ver AUTH-04 sobre la ventana de gracia. |
| AUTH-04 | Alta | La rama `revokedAt` revocaba **todas** las sesiones antes de verificar firma y expiración. | Orden nuevo: firma, `exp`, `iss`, `aud`, `typ` primero (un token vencido o falso nunca toca estado); luego estado de la sesión. Solo un token vigente ya rotado que llega fuera de la ventana de gracia revoca **su propia familia**. | `auth.service.ts` (`refresh`, `handleConsumedRefresh`) | `auth-sessions`: «old refresh tokens (AUTH-04)», «reuse … closes only that family» | Token antiguo/vencido: 401 sin efecto; otros dispositivos siguen activos | CV | Un token robado reenviado dentro de los 30 s posteriores al uso legítimo recibe 409 (no obtiene tokens ni revoca). |
| AUTH-05 | Alta | La configuración de producción no se validaba: `COOKIE_SECURE=false`, códigos expuestos y URLs http eran aceptados. | `env-schema.ts` con `parseEnv`: en producción exige `COOKIE_SECURE`, prohíbe `EXPOSE_DEV_AUTH_TOKENS`, exige https en frontend/orígenes/callbacks, `sslmode=verify-full`, `EDGE_PROXY_SECRET` ≥ 32, proveedor de correo real, prohíbe `TRUST_PROXY=true` y lista todos los problemas. Duraciones validadas al arrancar. Desarrollo local sin cambios. | `src/config/env-schema.ts`, `env.ts`, `.env.example` | `src/config/env.test.ts` (21 casos) | 21/21; smoke Docker arranca con configuración segura inyectada | CV | — |
| DATA-13 (agrupado en AUTH-05) | Media | La URL de base de producción solo exigía ser no vacía. | Producción exige `sslmode=verify-full` y rechaza `uselibpqcompat=true`, `disable`, `no-verify` y ausencia de `sslmode`. | `env-schema.ts`, `docs/despliegue.md` | `env.test.ts`; smoke Docker con CA propia y `verify-full` | Readiness 200 sobre TLS verificado | EXT | Falta comprobar `verify-full` contra el certificado real de Neon (staging). |
| AUTH-06 | Media | El access token no estaba ligado a una sesión: seguía válido tras logout, logout-all y recuperación. | El access token lleva `sid`; el middleware verifica, en la misma consulta que carga al usuario, que la sesión siga abierta. Logout cierra la sesión del token; logout-all, recuperación, cambio de contraseña/correo y desactivación cierran las que corresponda. | `auth.middleware.ts`, `auth.repository.ts` (`findActiveSessionUser`) | `auth-sessions`: «bearer invalidation (AUTH-06)»; `auth-accounts`: recuperación cierra bearers | Bearers previos → 401 de inmediato | CV | — |
| AUTH-07 | Media | Cada refresh creaba una sesión nueva de 7 días sin límite absoluto ni retención. | Sesión con `idle_expires_at` (7 d desde la última renovación) y `absolute_expires_at` (30 d desde el login, `SESSION_ABSOLUTE_TTL`). Política pura con tiempo inyectado. Retención: purga por usuario al iniciar sesión y `scripts/cleanup-auth.ts` (30 días, en el flujo de backup). | `session-policy.ts`, `auth.service.ts`, `scripts/cleanup-auth.ts` | `session-policy.test.ts` (fechas fijas); `auth-sessions`: «session lifetime»; `workbook-import`: «auth data retention script» | Renovación tras límite absoluto → 401 `SESSION_EXPIRED` | CV | La limpieza global se programa al activar el backup (hoy manual). |
| AUTH-08 | Media | Un único limitador por IP para todas las rutas de auth, contando solo fallos. | Presupuestos separados: login por IP (30 fallos/15 min) y por cuenta (10), códigos por IP + 5 intentos por código en base, registro por IP (10/h), envío de correo por dirección (1/min y 5/h) y por IP, refresh por IP (120/15 min), OAuth y cambios de credenciales por usuario. Contadores en PostgreSQL compartido (ver OPS-05). 429 con `Retry-After` y `RateLimit-*`. | `rate-limit.middleware.ts`, `rate-limit-store.ts`, `auth.routes.ts` | `operations`: «separate auth budgets»; `auth-accounts`: «email sending limits», «revokes a code after repeated wrong attempts» | Fallos contra una cuenta no bloquean refresh ni a otra cuenta tras la misma NAT; IP rotativa no evita el límite por cuenta | CV | Una cuenta atacada queda limitada 15 min también para su dueño (compromiso consciente: el dueño puede recuperar acceso por correo). |
| OPS-04 (agrupado en AUTH-08) | Media | Mismo contador para registro, verificación, login, OAuth y refresh. | Igual que AUTH-08. | Igual que AUTH-08 | Igual que AUTH-08 | 10 fallos de login no producen 429 en refresh | CV | — |
| AUTH-09 | Media | Zod contaba caracteres y bcrypt usa 72 bytes: claves Unicode distintas coincidían. | Contraseñas nuevas limitadas a 72 bytes UTF-8 (registro, recuperación, cambio y alta por admin, también en el frontend). Login acepta claves heredadas más largas, pero si coinciden y superan 72 bytes responde 403 `PASSWORD_RESET_REQUIRED` y envía un código: ni la clave original ni su gemela truncada abren sesión, y el usuario fija una clave nueva. Sin migración irreversible de hashes. | `auth.schemas.ts`, `auth.service.ts`, `frontend/.../password-rules.ts`, `login-form.tsx`, `forgot-password-flow.tsx` | `auth-accounts`: «bcrypt 72-byte limit» | Gemela truncada → 403 sin token | CV | Usuarios con clave heredada larga deben pasar por recuperación una vez. |
| AUTH-10 | Media | Respuestas distintas por estado de cuenta y login sin bcrypt para correos inexistentes. | Login compara siempre contra un hash bcrypt de coste 12 (ficticio si no hay usuario) y responde igual. Reenvío de código y solicitud de recuperación responden 200 con la misma forma para correo inexistente, pendiente o activo, con duración mínima (`AUTH_NEUTRAL_RESPONSE_MS`). Verificación responde igual para correo inexistente, activo o inactivo; «código vencido» solo con el código correcto. Registro: activo e inactivo devuelven el mismo 409. | `auth.service.ts` | `auth-accounts`: «account enumeration (AUTH-10)» | Formas idénticas; login desconocido ejecuta bcrypt | CV | El registro de un correo ya activo sigue respondiendo 409 (decisión explícita: conflicto real visible, ver REG-01), mitigado por límites. La duración mínima no oculta latencias SMTP extremas. |
| AUTH-11 | Media | `fetch` sin plazo y respuestas de terceros aceptadas con assertions de tipo. | `oauth.client.ts`: `AbortSignal.timeout` por llamada, validación Zod de token, perfil y correos, clasificación (timeout/red → 503, 5xx → 503, rechazo → 401, forma inválida → 502). El canje del código no se reintenta. Resend con plazo e `Idempotency-Key`; Gmail con timeouts explícitos; sin reintentos automáticos. | `oauth.client.ts`, `email.service.ts` | `auth-accounts`: «provider deadlines and validation (AUTH-11)» | Cada caso clasificado en < 3 s | CV | Comportamiento real de los proveedores en staging. |
| AUTH-12 | Baja | `decodeURIComponent` sobre todas las cookies lanzaba `URIError` → 500. | Se analiza solo la cookie pedida y su decodificación fallida se ignora. | `auth.cookies.ts` | `auth-sessions`: «cookie parsing (AUTH-12)» | Cookie ajena dañada → refresh 200; refresh dañado → 401 | CV | — |
| AUTH-13 | Baja | `jwtVerify` no exigía `exp`, `iss`, `aud` ni tipo. | HS256 explícito, `iss`, `aud` distintos para access y refresh, cabecera `typ` (`at+jwt`/`rt+jwt`), `requiredClaims` (`exp`, `iat`, `jti`, `sub`) y claims validados con Zod; secretos distintos. Sin JWE: los claims no son confidenciales. | `auth.tokens.ts` | `auth-sessions`: «JWT claims (AUTH-13)» | Alterado, vencido, sin `exp`, audiencia o tipo cruzado → 401 | CV | — |
| DATA-01 | Alta | Pool `pg` sin `max` explícito, sin plazo de adquisición ni timeouts de consulta. | Pool configurable (`DB_POOL_MAX`=5 por réplica, `connectionTimeoutMillis`, `idleTimeoutMillis`). Transacciones con `SET LOCAL statement_timeout/lock_timeout` (compatible con el pooler de Neon, que rechaza esos parámetros de arranque) y `maxWait`/`timeout` de Prisma. Errores de saturación, lock o statement → 503 `DB_UNAVAILABLE`/`DB_BUSY` con `Retry-After`. Plazo de request de aplicación (`REQUEST_TIMEOUT_MS`). | `config/prisma.ts`, `config/database-errors.ts`, `error.middleware.ts`, `request-deadline.middleware.ts` | `operations`: «database budgets (DATA-01, OPS-08)» (pool agotado y recuperación; lock con `SET LOCAL`) | 503 en < 5 s y 200 tras liberar | CV | No se promete capacidad a partir de localhost. |
| OPS-08 (agrupado en DATA-01) | Alta | Concurrencia de Cloud Run (80 por defecto) frente a pool sin presupuesto. | Documentado: `--concurrency 20`, `--timeout 35`, 5 conexiones por réplica (≤ 10 con 2 réplicas) y `ALTER ROLE … SET statement_timeout/lock_timeout` para consultas sueltas. Señales de pool en métricas. | `docs/despliegue.md`, `deploy-backend.yml`, `config/metrics.ts` | — (infraestructura) | Flags en el flujo de deploy | EXT | Aplicar `ALTER ROLE` en Neon y medir en staging con datos representativos. |
| DATA-02 | Media | Ownership y mutaciones cargaban hojas completas; el workbook serializaba columnas internas. | Referencias ligeras para ownership; mutaciones por `(id, user_id)`; `select` de solo los campos públicos; lectura opcional por período (`?from=&to=`); cuotas (240 meses, 300 filas por mes, 500 gastos por bolsillo, 50 cuentas, 100 deudas); meses limitados a 2000–2099. El frontend sigue cargando todo el historial a propósito (resumen anual y copia de meses lo necesitan); medición abajo. | `finance.repository.ts`, `finance.service.ts`, `finance.schemas.ts` | `finance`: «payload and quotas (DATA-02)», contrato del consumidor | 36 meses × 30 filas: payload < 500 KB y < 2 s en local, sin campos internos | CV | Las cuotas se comprueban antes de insertar (una carrera puede exceder en uno). |
| DATA-03 | Media | La idempotencia solo comprobaba el usuario y devolvía una fila de otro mes o bolsillo. | Reintento con mismo id: mismo dueño, mismo padre (hoja/bolsillo) y mismo contenido → 200 con la fila (`Idempotent-Replayed: true`); cualquier diferencia o dueño distinto → 409 `IDEMPOTENCY_CONFLICT` sin contenido. Creaciones simultáneas con el mismo id resuelven como reintento. El frontend reintenta con el estado actual y, ante conflicto, concilia con PATCH. | `finance.service.ts`, `finance.controller.ts`, `frontend/.../workbook-store.ts` | `finance`: «idempotent creation (DATA-03)»; `workbook-store.test.ts` | 201 + 200 + 409; nunca revela filas ajenas | CV | — |
| DATA-04 | Media | `Math.round(valor * 100) / 100` opera sobre binario: `1.005 → 1.00`. | `roundHalfUpToCents`: mitad alejándose de cero sobre la representación decimal (regla de `ROUND(x; 2)` de Excel, igual que el cast a `numeric` de PostgreSQL y `roundMoney` del frontend); el máximo se valida ya redondeado. | `finance/money.ts`, `finance.schemas.ts`, `workbook-import.ts` | `money.test.ts` (17 casos, rojo observado con la regla anterior); `finance`: «money precision (DATA-04)» entrada → base → respuesta → workbook | 1.005 → 1.01 en respuesta, base y workbook | EXT | El libro Excel de referencia no está en el repositorio ni en el equipo: los valores esperados siguen la semántica documentada de `ROUND`. Pendiente confirmarlos con el libro original. |
| DATA-05 | Media | `spentOn` se validaba como fecha, no contra el mes de la hoja. | Crear y editar exigen que la fecha pertenezca al mes de la hoja del bolsillo; fechas imposibles ya se rechazaban. El frontend ya acotaba `min`/`max`. | `finance.service.ts` | `finance`: «spend dates (DATA-05)» | Límites de mes, otros meses y 30 de febrero → 422 | CV | — |
| DATA-06 | Media | Cambiar un bolsillo con gastos a otra categoría los dejaba fuera de los totales. | Se rechaza (409 `POCKET_HAS_SPENDS`) mientras existan gastos; la fila se bloquea (`FOR UPDATE`) y el registro de gastos bloquea la misma fila (`FOR SHARE`). Bolsillos vacíos se convierten. La UI bloquea la categoría y explica por qué. | `finance.repository.ts`, `finance.service.ts`, `frontend/.../entry-drawer.tsx` | `finance`: «pocket conversion (DATA-06)» | Ningún gasto borrado | CV | — |
| DATA-07 | Media | Unicidad sensible a mayúsculas en base y verificación previa separada. | Columna `name_key` (minúsculas + NFC) con `UNIQUE (user_id, name_key)`. La migración renombra duplicados existentes con sufijo ` (n)` sin borrar nada; `pnpm db:check-migration` los reporta antes. | migración, `finance.repository.ts`, `scripts/check-migration-conflicts.ts` | `finance`: «accounts (DATA-07, DATA-08)»; `migration-upgrade.test.ts` | 3 creaciones simultáneas → 201 + 409 + 409 | CV | Los duplicados existentes cambian de nombre visible (sin pérdida). |
| DATA-08 | Media | Conteo de uso y borrado separados, con `ON DELETE SET NULL`. | FK `month_entries(account_id, user_id) → money_accounts ON DELETE NO ACTION`: el borrado se intenta y, si la base lo rechaza por referencias (incluida una inserción concurrente), la cuenta se archiva. | migración, `finance.repository.ts` (`deleteOrArchiveAccount`) | `finance`: «archives instead of deleting when an entry is inserted while the delete runs» | Fila concurrente conserva su cuenta | CV | — |
| DATA-09 | Media | La copia calculaba fuera de la transacción y sobrescribía el salario; sin idempotencia. | Copia en transacción con `FOR UPDATE` sobre la hoja, orden calculado dentro y salario copiado solo si sigue en 0 al escribir. `operationId` opcional (tabla `finance_operations`): mismo id = reintento (no copia otra vez), id nuevo = copia intencional. Igual en crear hoja. El frontend reutiliza el id solo tras fallos reintentables. | `finance.repository.ts`, `finance.schemas.ts`, `workbook-store.ts` | `finance`: «copying the previous month (DATA-09)»; `workbook-store.test.ts` | Salario confirmado sobrevive; reintento simultáneo copia una vez; órdenes únicos | CV | Clientes que no envían `operationId` mantienen la semántica anterior de copia repetida (atómica). |
| DATA-10 | Media | `--replace` borraba deudas por nombre y las recreaba con otro id. | Las deudas se actualizan conservando el id (emparejadas por nombre); solo se borran los meses del archivo; las deudas fuera del archivo no se tocan; nombres ambiguos detienen la importación. | `finance/workbook-import.ts`, `scripts/import-workbook.ts` | `workbook-import`: «import --replace keeps retained months linked» | Septiembre conserva el mismo `debt_id` | CV | — |
| DATA-11 | Media | `JSON.parse(...) as WorkbookFile` sin validación; referencias desconocidas → `null`; recortes silenciosos. | Esquema Zod estricto del archivo completo (montos, meses, textos sin recorte, referencias a cuentas y deudas, duplicados) antes de escribir; aplicación en una transacción; el CLI simula por defecto y escribe solo con `--apply`, mostrando el host de destino. Transformaciones documentadas en el código. | `workbook-import.ts`, `import-workbook.ts` | `workbook-import`: «import validation (DATA-11)» (incluye rollback con fallo simulado), «import CLI» | Errores claros; rollback total | CV | — |
| DATA-12 | Baja | Ownership garantizado solo por servicios. | Claves únicas `(id, user_id)` y FKs compuestas: filas→hoja, filas→cuenta, filas→deuda (además del `SET NULL` existente) y gastos→fila. Mutaciones del repositorio filtran por usuario. La migración verifica antes datos inconsistentes y aborta sin cambios. No se afirmó un IDOR HTTP previo. | migración, `schema.prisma`, `finance.repository.ts` | `finance`: «ownership enforced by the database (DATA-12)», «ownership between users»; `migration-upgrade.test.ts` (aborto) | Inserciones cruzadas → P2003 | CV | — |
| DATA-14 | Media | `upsert` de settings en cada GET compite consigo mismo (P2002). | `INSERT … ON CONFLICT DO NOTHING` (`createMany skipDuplicates`) y lectura posterior; cuenta por defecto igual. | `finance.repository.ts` (`ensureFinanceDefaults`) | `finance`: «workbook initialisation (DATA-14)» | 8 primeras lecturas simultáneas → 8 × 200, sin duplicados | CV | — |
| OPS-01 | Alta | `console.error(error)` volcaba el cuerpo crudo del parser y `morgan` la URL con `code`/`state`. | Logger JSON propio con redacción de claves sensibles, JWT y bearer en texto y parámetros de URL; errores descritos sin mensaje en errores del parser ni de Prisma; access log propio (se retiró `morgan`). | `config/logger.ts`, `config/redact.ts`, `request-context.middleware.ts`, `error.middleware.ts` | `operations`: «logs without secrets (OPS-01)» (stdout y stderr de un proceso real) | Ningún marcador ficticio en los logs | CV | — |
| OPS-02 | Media | Errores conocidos de body-parser llegaban como 500. | Mapeo por `type`: 400 `MALFORMED_JSON`, 413 `PAYLOAD_TOO_LARGE`, 415 `UNSUPPORTED_MEDIA_TYPE`, etc., con mensajes en español. | `error.middleware.ts` | `operations`: «parser errors (OPS-02)» | 400/413/415 sin fragmentos del cuerpo | CV | — |
| OPS-03 | Alta | Finanzas autenticaba y consultaba la base antes de cualquier límite. | Límite perimetral por IP en todo `/api` (salvo salud) antes de parsear y autenticar; limitador de credenciales inválidas antes de verificar JWT; cuotas por usuario de lectura y escritura después. | `app.ts`, `rate-limit.middleware.ts`, `finance.routes.ts` | `operations`: «protection before expensive work (OPS-03)» | Tras el 429, el contador de adquisiciones del pool no cambia | CV | Perímetro y cuotas en memoria por réplica (con 2 réplicas, hasta el doble). |
| OPS-05 | Media | `MemoryStore` por proceso: contadores multiplicados por réplicas y borrados al escalar a cero. | Almacén compartido en PostgreSQL (`rate_limit_buckets`, incremento atómico de una sentencia) para los límites de seguridad; ante fallo del almacén, respaldo en memoria por réplica (sigue protegiendo y no bloquea la app). | `rate-limit-store.ts` | `operations`: «shared counters across replicas (OPS-05)» (dos procesos; almacén caído) | 10 intentos en total entre dos procesos; con la tabla caída, login legítimo 200 y límite vigente | CV | Durante una caída del almacén el límite es por réplica. Cada intento de auth cuesta una escritura en la base. |
| OPS-06 | Alta | `TRUST_PROXY=true` y origen `run.app` público. | `TRUST_PROXY` validado (prohibido `true` en producción; `1` para Cloud Run). Secreto de borde obligatorio en producción, añadido por `frontend/src/proxy.ts`; sin él la API responde 403. IP de cliente desde la cabecera del proxy solo con secreto válido. CORS no se usa como control de ingreso. | `edge-proxy.middleware.ts`, `env-schema.ts`, `frontend/src/proxy.ts`, `frontend/src/shared/lib/edge-proxy.ts` | `operations`: «origin protection and client IP (OPS-06)»; `edge-proxy.test.ts`; smoke Docker; navegador vía proxy | Directo 403; XFF falsificado no cambia la identidad | EXT | La cadena real Vercel → Google Front End (qué cabeceras fija cada salto) solo se verifica en staging. Si el secreto se filtra, hay que rotarlo. |
| OPS-07 | Media | `/api/health` respondía 200 sin comprobar la base. | `/api/health` y `/api/health/live` (liveness, sin dependencias) y `/api/health/ready` (consulta con plazo de 2 s; 503 sin detalles durante caída o cierre). | `routes/index.ts` | `operations`: «health checks (OPS-07)» | Base inaccesible: live 200, ready 503 en < 4 s | CV | Configurar sondas de Cloud Run en staging. |
| OPS-09 | Media | `server.close` sin plazo ni manejo de errores. | Cierre idempotente: readiness 503, drenaje, corte forzado antes de `SHUTDOWN_TIMEOUT_MS` (8 s), cierre de Prisma y pool con manejo de errores, salida 0/1 y temporizador duro. | `config/graceful-shutdown.ts`, `server.ts` | `graceful-shutdown.test.ts` (4 casos); `operations`: «graceful shutdown of a real process» (Linux); smoke Docker | Request en curso respondida; salida 0 en < 9 s | CV | — |
| OPS-10 | Media | Docker, rewrite, CI, migraciones y backups pendientes del plan. | `backend/Dockerfile` (+ `migrator`), `.dockerignore`, smoke, proxy de Next, `ci.yml`, `deploy-backend.yml` (solo manual, environment protegido), `backup-db.yml` (manual, cifrado AES-256) y procedimiento de restauración. Sin certificados en Express. | `backend/Dockerfile`, `.github/workflows/*`, `docs/despliegue.md` | smoke Docker; CI definido | Smoke aprobado | EXT | Recursos de nube, WIF, TLS gestionado, cold starts y backup/restore real en staging. |
| OPS-12 (agrupado en OPS-10) | — | `pnpm start` exigía `.env`. | Scripts con `--env-file-if-exists`; la imagen arranca solo con variables inyectadas. | `backend/package.json`, `Dockerfile` | smoke Docker | Arranque sin `.env` | CV | — |
| OPS-11 | Alta | La suite no cubría auth, HTTP, base ni concurrencia, y no había CI. | Arnés de integración permanente (`backend/test/`), migraciones, unitarias nuevas y CI que las ejecuta contra PostgreSQL. | `backend/test/**`, `.github/workflows/ci.yml` | 89 + 4 + 102 pruebas | Ver «Validaciones ejecutadas» | CV | CI aún no ejecutado en GitHub (rama sin subir). |
| OPS-13 | Baja | Sin `engines` ni garantía de sintaxis ejecutable por Node. | `engines.node >=24.11 <25`, `erasableSyntaxOnly`, pnpm fijado en `devEngines`, imagen Node 24.16 por digest. | `package.json`, `tsconfig.json`, `Dockerfile` | typecheck; contenedor limpio | Checkout limpio en Linux aprobado | CV | — |
| OPS-14 | Media | Sin `requestId`, latencias ni señales de dependencias. | `X-Request-Id` (acepta uno seguro o genera UUID), `traceId` de Cloud Run, access log JSON con duración, métricas en proceso de cardinalidad acotada (rutas normalizadas, histograma, errores por dependencia, pool, event loop, en curso) publicadas como log periódico. | `request-context.middleware.ts`, `config/metrics.ts`, `config/logger.ts` | `operations`: «request correlation (OPS-14)» | Rutas sin ids concretos | CV | Métricas basadas en logs a configurar en Cloud Logging. |
| OPS-15 | Media | Renovación no coordinada entre módulos y pestañas; cualquier error borraba la sesión. | `session-manager.ts`: una renovación en curso por pestaña, Web Locks + BroadcastChannel entre pestañas, 401/403 cierran, 409 reintenta, 429 respeta `Retry-After`, 5xx/red conservan la sesión con reintentos acotados; plazos en `fetch`; finanzas usa el mismo gestor. | `frontend/src/modules/auth/*`, `finance-api.ts`, `finance-shell.tsx` | `session-manager.test.ts` (11); navegador (dos pestañas) | Sin 409 ni cierre al recargar dos pestañas | CV | Navegadores sin Web Locks renuevan por pestaña; el 409 del servidor evita perder la sesión. |
| OPS-16 | Baja | Mensajes en inglés y nombres de constraint en respuestas. | Códigos estables en todos los errores, CORS en español, locale `es` de Zod con «Campo no permitido», conflictos genéricos sin columnas, detalles internos solo en desarrollo. | `utils/app-error.ts`, `error.middleware.ts`, `zod-locale.ts`, `app.ts` | `operations`: «public errors (OPS-16)» | Sin `constraint`/`name_key` en respuestas | CV | — |
| OPS-17 | Media | El plan presentaba la alerta de USD 1 como garantía de no cobro. | Documentación corregida: la alerta notifica, no limita; respuesta operativa paso a paso y controles de abuso. | `docs/despliegue.md` | revisión documental | Sección «Protección de costos» | CV | Configurar la alerta y practicar la respuesta en la nube. |
| REG-01 | Media | Creación concurrente del mismo correo pendiente devolvía 409 de índice (`Unique constraint violation`). | Registro atómico: la violación única se resuelve releyendo la cuenta (si sigue pendiente, 201 con código nuevo; si se activó, 409 real `EMAIL_ALREADY_REGISTERED`); el límite por correo frena el duplicado inmediato con 429 claro; formulario con envío único (`single-flight`); trazas `auth_event` con seudónimo HMAC del correo. | `auth.service.ts` (`register`), `auth.repository.ts` (`createPendingUser`), `register-form.tsx`, `single-flight.ts` | `auth-accounts`: «registration (REG-01)»; `single-flight.test.ts` | Pares simultáneos → 201/201 o 201/429, una sola cuenta, sin texto de índice | CV | Ver análisis del incidente abajo. |
| DEP-01 | Alta | `compression` 1.8.1 con aviso alto aplicable. | `compression` 1.8.2. | `backend/package.json`, lockfile | `pnpm audit`; suites | 0 avisos | CV | — |
| DEP-02 | Media | 28 avisos en el árbol runtime. | `nodemailer` 10.0.10, `express-rate-limit` 8.7.0, `helmet` 8.3.0, `jose` 6.2.12, `pg` 8.23.0, `zod` 4.6.5, Prisma 7.10.0; transitivas (`body-parser`, `qs`, `proxy-addr`, `ip-address`) actualizadas dentro de rango; `morgan` retirado. | `backend/package.json`, lockfile | `pnpm audit --prod` | 28 → 0 | CV | Avisos futuros: CI bloquea altos/críticos. |
| DEP-03 | Alta | pnpm 11.3.0 (18 avisos) y 25 avisos en el árbol opcional del CLI de Prisma. | pnpm 11.27.1 en `devEngines`, CI y Docker; Prisma CLI 7.10.0 con `overrides` de `deepmerge-ts` ^8 y `mysql2` ^3.23.1 (generate, validate, migrate y smoke verificados). | `package.json`, `pnpm-workspace.yaml` | `pnpm audit` completo; migraciones | pnpm 11.27.1: 0 avisos (auditoría npm del paquete); árbol completo backend: 0 | CV | Los `overrides` deben revisarse al actualizar Prisma. |
| CLIENT-01 | Media | Access token persistido en `localStorage`. | Token solo en memoria; marca sin secretos para decidir si renovar; limpieza del token heredado; callback OAuth sin tokens en la URL (obtiene la sesión por `/auth/refresh`); estado de verificación en `sessionStorage`. CSRF: cookie `SameSite=Lax`, ruta `/api/auth`, refresh y logout solo por cookie con verificación de `Origin`/`Sec-Fetch-Site`. | `frontend/src/modules/auth/*`, `auth.controller.ts`, `trusted-origin.middleware.ts` | `session-manager.test.ts`; `auth-sessions`: «refresh cookie contract» (CSRF, cuerpo ignorado); navegador | Ningún JWT en almacenamiento web | CV | Un XSS activo aún podría usar el token en memoria mientras la página vive; no hay CSP propia en el frontend (Next) todavía. |

## Segunda ronda: revisión independiente (19 incidencias)

El auditor revisó la rama en `72c8d60` (CI en verde), rechazó el aval completo y confirmó 19 incidencias nuevas: 6 altas, 11 medias y 2 bajas. Esta ronda parte de `72c8d60` y conserva su corrección del smoke de Docker. Cada incidencia tiene primero una regresión permanente, que se ejecutó y falló por la causa descrita antes de corregir, y luego la corrección de la causa raíz. Las pruebas no dependen de `.local/`. Las entradas originales que reabrió el auditor (AUTH-01/02/06/08/09, REG-01, DATA-02/03/04/06/09/10/11, OPS-03/05/06/07/09/10/15/16 y CLIENT-01) remiten a esta tabla. **Estado «CV»** significa corregido y verificado localmente por quien implementó; la aceptación corresponde al auditor.

| ID | Sev. | Causa raíz | Solución | Regresión (fallo observado antes del fix) | Resultado real | Estado |
|---|---|---|---|---|---|---|
| RAUTH-01 | Alta | El código de verificación activaba la contraseña que tuviera la cuenta en ese momento: un re-registro tras OAuth la reemplazaba y el código del dueño la activaba. | `users.security_stamp` cambia con todo cambio de credenciales. Cada código guarda el sello con que se emitió y solo se consume si coincide, con la fila del usuario bloqueada (`FOR UPDATE`). Los códigos de registro o login exigen además la contraseña (`auth_tokens.requires_password`); los de OAuth no, pero un re-registro los invalida. El frontend envía la contraseña escrita, o la pide si la página se recargó. | `auth-credential-races.test.ts` «pending account credentials…» (5). Antes: verificación 200 y login del atacante 200; luego 422 por falta de campo. | 5/5 aprobadas | CV |
| RAUTH-02 | Alta | El login validaba la contraseña y creaba la sesión sin volver a mirar el estado: un cambio de contraseña, una recuperación, una desactivación o un logout-all intermedios no lo detenían. | `createSession` bloquea al usuario y compara sello y estado; si cambiaron, responde 401 `CREDENTIALS_CHANGED`. Logout-all, los cambios de estado y la baja rotan el sello. | Misma suite, «sessions only open…» (5, con barreras sobre PostgreSQL). Antes: se creaba la sesión obsoleta. | 5/5 aprobadas | CV |
| RAUTH-03 | Media | Un hash heredado de una contraseña de más de 72 bytes coincidía con su prefijo exacto de 72 bytes. | `users.password_hash_version`: 1 = heredado, 2 = regla de 72 bytes. Una entrada de 72 bytes contra un hash versión 1 exige recuperar la contraseña (403 `PASSWORD_RESET_REQUIRED`). | Misma suite, «legacy hashes…» (3). Antes: el prefijo iniciaba sesión. | 3/3 aprobadas | CV |
| RCLIENT-01 | Alta | Una renovación que terminaba tarde adoptaba y difundía su sesión aunque se hubiera cerrado sesión o cambiado de cuenta. | Generaciones en `session-manager.ts`: cerrar sesión, iniciar otra o recibir un cambio de otra pestaña invalida las renovaciones en curso, que ya no adoptan, difunden, cierran ni marcan nada. Al cerrar sesión además se cancela la petición. Si la cookie resulta de otra cuenta, se cierra la sesión en vez de cambiar de cuenta en silencio. `ensureAccessToken({ userId })` rechaza con `SessionChangedError`. | `session-manager.test.ts` «late refreshes…» (8: cierre, cambio A→B, otra pestaña, 401 obsoleto, cancelación). Antes: 8 en rojo. | 8/8 aprobadas | CV |
| RCLIENT-02 | Alta | El libro de A seguía montado tras cambiar de cuenta y su cola podía guardar cambios de A autenticada como B. Los temporizadores quedaban huérfanos y el proveedor no tenía `dispose`. | `WorkbookProvider` se monta con `key={userId}` y con `createFinanceApi({ userId })`. Al desmontarse, `store.stop()` descarta temporizadores, parches, trabajos no iniciados y fallos, cancela las peticiones en vuelo e ignora cargas tardías. Al cerrar sesión, los cambios pendientes se guardan antes, con tope de 4 s. | `finance-api.test.ts` «the workbook never carries…» (5). Antes: el parche de A salía con la identidad B, el temporizador seguía vivo y se aplicaba la carga tardía. | 5/5 aprobadas | CV |
| RCLIENT-03 | Alta | El reintento automático tras un 401 pedía el token sin comprobar la identidad y reenviaba la operación de A como B. | Toda petición, incluido el reintento, pide el token ligado a su `userId`. Si la sesión es de otra cuenta, falla con 401 `SESSION_CHANGED` y no envía nada. | `finance-api.test.ts` «finance requests stay bound…» (4). Antes: identidades `['A', 'B']`. | 4/4 aprobadas | CV |
| RDATA-01 | Media | Una clave de operación existente se trataba como reintento sin comparar tipo, mes ni origen de copia. | Columna `finance_operations.fingerprint` (con `copyFrom` al crear hoja). Solo se reproduce el reintento si coinciden tipo, mes y huella; si no, 409 `IDEMPOTENCY_CONFLICT`. | `finance-consistency.test.ts` «operation ids only replay…» (3). Antes: 200 con 0 filas. | 3/3 aprobadas | CV |
| RDATA-02 | Media | La copia registraba la operación antes de comprobar que existía el mes anterior, y el 404 confirmaba ese registro. | La operación se registra solo cuando la copia se hace. | «a failed copy…». Antes: la operación existía tras el 404. | aprobada | CV |
| RDATA-03 | Media | Las cuotas se contaban antes de escribir, fuera de transacción, y la copia y la importación no las aplicaban. | Cuentas, deudas, meses, copias e importación se deciden bajo `pg_advisory_xact_lock` por usuario. Filas y gastos, con la hoja o la fila bloqueadas. La copia y la importación validan el estado final. | «quotas hold…» (5: dos copias de 300 filas, 4 filas, meses, cuentas, deudas y gastos simultáneos, importación del mes 241). Antes: 600 filas, 4/4 creaciones y 241 meses. | 5/5 aprobadas | CV |
| RDATA-04 | Media | Solo se bloqueaba y comprobaba si la lectura previa de la fila era bolsillo. | Toda categoría distinta de bolsillo bloquea la fila y decide sobre sus gastos actuales dentro de la transacción. | «category changes…» (con bloqueo real y espera en `pg_stat_activity`). Antes: 200 con el gasto oculto. | aprobada (409 `POCKET_HAS_SPENDS`) | CV |
| RDATA-05 | Alta | `applyWorkbookImport` siempre borraba los meses del archivo y no revalidaba nada después del plan. | Recibe `{ replace }` explícito. Con el bloqueo del usuario, vuelve a comprobar meses, deudas ambiguas y cuotas dentro de la transacción. Sin `--replace` nunca borra. | «an import without --replace…» (2). Antes: el mes creado después del plan desaparecía. | 2/2 aprobadas | CV |
| RDATA-06 | Baja | La cuota se evaluaba antes de resolver el reintento. | El reintento se resuelve primero, dentro de la transacción. | «the last allowed month…». Antes: 409 `LIMIT_REACHED`. | aprobada (200, mismo id) | CV |
| RDATA-07 | Media | Las tasas se guardaban redondeadas por la escala SQL, pero el reintento comparaba el valor sin redondear. | `roundHalfUpTo` (regla ROUND de Excel) normaliza las tasas a 6 decimales, la tasa de prestaciones a 4 y el porcentaje a 2, antes de guardar y antes de comparar. | «rates are normalized…» (2) y `money.test.ts` (10 casos nuevos). Antes: 409 en el reintento idéntico. | aprobadas | CV |
| RDATA-08 | Media | Una colisión única al crear cuenta se traducía siempre en nombre ocupado. | Bajo el bloqueo del usuario, la colisión se resuelve releyendo por id: si es el mismo dueño con el mismo nombre, se devuelve el reintento. | «concurrent retries of an account…». Antes: 201/409/409. | aprobada (201/200/200) | CV |
| ROPS-01 | Media | El preflight consultaba tablas que todavía no existían. | Comprueba con `to_regclass` qué tablas existen. Con la base vacía reporta `bootstrap: true` y sale con 0; con tablas existentes mantiene el bloqueo por ownership. | `migration-upgrade.test.ts` (3 nuevos). Antes: `relation "money_accounts" does not exist`. | 3/3 aprobadas | CV |
| ROPS-02 | Media | `shutdown` salía con `exit(0)` antes de que llegara el `exit(1)` del manejador. | `shutdown(reason, { exitCode })`: el error fatal sale con 1 después de drenar y cerrar recursos. | `graceful-shutdown.test.ts` (1) y `operations` «fatal errors in a real process» (proceso real con precarga que lanza desde un temporizador). Antes: salida 0. | 2/2 aprobadas | CV |
| ROPS-03 | Media | El decremento iba al primario aunque el incremento hubiera caído en el respaldo. | Cada incremento recuerda su almacén en el contexto de la petición (AsyncLocalStorage, vigente en `finish`) y el decremento se aplica allí. Sin contexto, se prefiere el respaldo si tiene incrementos pendientes de la ventana. Un decremento fallido del primario no se traslada al respaldo. | `rate-limit-store.test.ts` (5, con caída y recuperación intercaladas). Antes: primario 6 y respaldo 1. | 5/5 aprobadas | CV |
| ROPS-04 | Media | La readiness pública hacía una consulta a la base por visita. | `createReadinessProbe`: resultado compartido durante 2 s y una sola comprobación en curso a la vez. | `readiness.test.ts` (3) y `operations` (20 lecturas simultáneas). Antes: 21 consultas. | aprobadas (1 consulta) | CV |
| ROPS-05 | Baja | `noStore` se aplicaba después de los middlewares que ya respondían. | `noStore` en `/api` antes de CORS y del perímetro. | `operations` «no-store on every API answer…» (403 de borde, 403 de CORS y 429, en proceso real). Antes: `cache-control` nulo. | aprobada | CV |

Cambios de contrato de esta ronda:

- `POST /api/auth/verify-email-code` acepta `password`, obligatoria cuando el código lo emitió un registro o un login con contraseña. Sin ella o con otra, responde 401 `EMAIL_VERIFICATION_INVALID` y suma un intento fallido.
- Login, verificación y OAuth pueden responder 401 `CREDENTIALS_CHANGED` si las credenciales o el estado cambiaron durante el inicio de sesión.
- Finanzas:
  - `copy-previous` puede responder 409 `IDEMPOTENCY_CONFLICT` o 409 `LIMIT_REACHED`.
  - Crear hoja con una clave ya usada para otro `copyFrom` responde 409 `IDEMPOTENCY_CONFLICT`.
  - Las tasas se devuelven normalizadas a su escala.
- `/api/health/ready` puede reflejar un estado de hasta 2 s de antigüedad.
- Todas las respuestas de `/api`, incluidos los rechazos del perímetro, llevan `no-store`.
- CLI de importación: `--apply` sin `--replace` falla si al escribir ya existe alguno de los meses. Las cuotas se validan sobre el estado final.

Migraciones nuevas, solo columnas con valor por defecto y probadas sobre base nueva y actualizada:

- `20261010000000_credential_binding`: `security_stamp`, `password_hash_version`, `requires_password` y el sello en `auth_tokens`.
- `20261010010000_operation_fingerprint`.

Efecto al desplegar:

- Los códigos de verificación pendientes emitidos antes quedan sin sello y no sirven; hay que pedir uno nuevo.
- Las cuentas existentes quedan con hash versión 1. Solo una contraseña de exactamente 72 bytes tendrá que restablecerse.

Riesgos residuales:

- Si otra pestaña inicia sesión con otra cuenta, los cambios del libro de la primera que aún no se habían enviado se descartan: no se pueden guardar con la identidad nueva.
- Un refresh abortado al cerrar sesión puede rotar la cookie en el servidor sin que el navegador reciba la nueva. Es inocuo porque la sesión se cierra.
- Las cuotas por usuario serializan las altas de cuentas, deudas y meses de un mismo usuario. Es aceptable para el volumen previsto.
- El proveedor React (`key` y `stop` al desmontar) se cubre con pruebas del store y de la API, sin pruebas de componente: el frontend no tiene Testing Library y no se añadieron dependencias.

Validaciones de esta ronda (Windows 11, Node 24.16.0, `postgres:18` en Docker; resultados reales):

| Comprobación | Resultado |
|---|---|
| Backend `pnpm typecheck` | aprobado |
| Backend `pnpm test` (unitarias) | aprobado: 108/108 |
| Backend `pnpm test:migrations` | aprobado: 7/7 |
| Backend `pnpm test:integration` | 134 pruebas: 133 aprobadas, 1 omitida (SIGTERM real: Windows no entrega señales POSIX; se ejecuta en CI Linux) |
| `pnpm prisma:validate` y `migrate diff --from-config-datasource` contra la base de prueba | aprobado, sin diferencias |
| `bash scripts/docker-smoke.sh` (en Git Bash con `MSYS_NO_PATHCONV=1`) | aprobado: `SMOKE OK` |
| `pnpm audit` backend y `pnpm audit --prod` frontend | 0 avisos |
| Frontend `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` | aprobado: lint limpio, 125/125, build con Proxy |
| CI en GitHub Actions sobre la rama | ver [Identificación de la entrega](#identificación-de-la-entrega) |
| Recorrido en navegador de esta ronda | **no ejecutado**: los cambios de sesión y libro se cubren con Vitest; queda para la revisión del auditor |

## Informe técnico

### Resumen del diff y decisiones

- **Sesiones** (AUTH-03/04/06/07/13, CLIENT-01, OPS-15): familia de refresh tokens en `auth_sessions`, consumo atómico con ventana de gracia de 30 s para pestañas concurrentes, revocación limitada a la familia, access token ligado a la sesión y verificado contra la base en cada request (misma consulta que ya cargaba al usuario), token del navegador solo en memoria. *Tradeoff*: un 409 retornable en vez de emitir dos ramas o cerrar todo; requiere cliente que reintente (implementado).
- **Configuración** (AUTH-05, DATA-13, OPS-06, OPS-13): un único parser validado que falla al arrancar con la lista completa de problemas en producción.
- **Limitación** (AUTH-08, OPS-03, OPS-04, OPS-05): presupuestos por operación, por IP y por cuenta; seguridad en PostgreSQL compartido con respaldo en memoria; perímetro barato en memoria antes de cualquier trabajo. *Tradeoff*: una escritura en base por intento de auth, aceptable para el volumen previsto y sin servicios nuevos.
- **Datos** (DATA-*): atomicidad en la base (FK, bloqueos de fila, consumos condicionales, `ON CONFLICT`) en lugar de comprobaciones previas; ownership también en SQL.
- **Operación** (OPS-*): logs JSON redactados, métricas acotadas, salud separada, cierre con plazo, imagen reproducible, CI y despliegue manual.
- Sin servicios ni dependencias de pago nuevos. Dependencias nuevas: ninguna (se retiró `morgan`).

### Cambios de API

Inventario: **44 rutas** (baseline 39): auth 18 (+3), users 5, finance 18, health 3 (+2).

| Cambio | Contrato |
|---|---|
| `POST /api/auth/password` (nuevo) | `{ currentPassword, newPassword }` → 200 `{ passwordChanged, otherSessionsClosed }`; 403 `CURRENT_PASSWORD_INVALID` |
| `POST /api/auth/email-change` (nuevo) | `{ currentPassword, newEmail }` → 200 `{ email, expiresAt }`; 409 `EMAIL_ALREADY_REGISTERED` |
| `POST /api/auth/email-change/confirm` (nuevo) | `{ code }` → 200 `{ user, otherSessionsClosed }`; 400 `EMAIL_CHANGE_CODE_INVALID`/`_EXPIRED` |
| `GET /api/health/live`, `GET /api/health/ready` (nuevos) | live 200 sin dependencias; ready 200/503 `NOT_READY`/`SHUTTING_DOWN`. `/api/health` = live, sin `environment` ni `uptime`. |
| `POST /api/auth/refresh`, `logout` | Solo cookie (cuerpo con `refreshToken` → 422; cabecera `x-refresh-token` ignorada). 403 `ORIGIN_NOT_ALLOWED` desde otro sitio. 409 `REFRESH_TOKEN_ROTATED` reintentable. Cuerpo de respuesta sin refresh token. |
| `PATCH /api/users/:id` | Ya no acepta `email` ni `password`. |
| Callback OAuth | El fragmento de redirección ya no incluye `accessToken` ni `user`. |
| Login | 403 `PASSWORD_RESET_REQUIRED` para claves heredadas > 72 bytes. 401 `INVALID_CREDENTIALS`. |
| Registro | Activo o inactivo → 409 `EMAIL_ALREADY_REGISTERED` (antes 409/403). |
| Reenvío de código / recuperación | Siempre 200 con la misma forma. |
| Finanzas | Creaciones repetidas → 200 con `Idempotent-Replayed: true`; 409 `IDEMPOTENCY_CONFLICT`, `POCKET_HAS_SPENDS`, `ACCOUNT_NAME_TAKEN`, `LIMIT_REACHED`, `SHEET_EXISTS`; `operationId` opcional en crear y copiar hoja; `GET /workbook?from=&to=`; meses 2000–2099. |
| Errores | Todos con `code` estable; 400/413/415 del parser; 503 `DB_UNAVAILABLE`/`DB_BUSY`/`REQUEST_TIMEOUT` con `Retry-After`; 429 con `Retry-After` y `details.retryAfterSeconds`; 403 `EDGE_PROXY_REQUIRED`. Todas las respuestas de `/api` con `Cache-Control: no-store` y `X-Request-Id`. |

Consumidor actualizado: `frontend/src/modules/auth/*` (gestor de sesión, formularios, callback OAuth, recuperación), `finance-api.ts`, `workbook-store.ts`, `entry-drawer.tsx`, `settings-page.tsx` y panel de seguridad. La suite `finance.test.ts` valida el contrato del workbook con un esquema escrito desde el lado del consumidor.

### Esquema, migraciones y compatibilidad de datos

Migración única `20261009000000_qa_remediation` (no se editó ninguna aplicada):

1. Verificación previa de ownership (filas/hoja, filas/cuenta, filas/deuda, gastos/fila): si hay inconsistencias, `RAISE EXCEPTION` y nada cambia (probado).
2. `auth_sessions` con backfill 1:1 desde cada refresh token existente (dispositivo, IP, agente, fechas y revocación conservados); `refresh_tokens.session_id` y `used_at`.
3. `auth_tokens.attempts`, `target_email`; valor `EMAIL_CHANGE` del enum.
4. `money_accounts.name_key` con renombrado determinista de duplicados (la cuenta más antigua conserva el nombre; las demás reciben ` (n)` evitando nombres ya usados).
5. Claves únicas `(id, user_id)` y FKs compuestas; filas→cuenta pasa a `NO ACTION`.
6. `finance_operations` y `rate_limit_buckets`.

Probado sobre el esquema anterior con datos sintéticos (`test/migrations/baseline-seed.sql`) y sobre base nueva, sin drift contra `schema.prisma`. Antes de producción: `pnpm db:check-migration` (solo lectura). Efecto visible: tras desplegar, cada usuario inicia sesión una vez (los tokens anteriores no cumplen los claims nuevos).

### Política de sesiones, cookies y limitación

| Elemento | Valor |
|---|---|
| Access token | 15 min, en memoria del navegador, `typ at+jwt`, `aud fintrack-api`, ligado a `sid` |
| Refresh token | Cookie `refresh_token` HttpOnly, `Secure` en producción, `SameSite=Lax`, `Path=/api/auth`; rotación en cada uso |
| Inactividad / absoluta | 7 días / 30 días |
| Reintento concurrente | 30 s → 409 sin revocar; después → revoca la familia |
| Revocación | logout: la sesión; logout-all, recuperación: todas; cambio de contraseña o correo: todas menos la actual; desactivación o borrado por admin: todas |
| Retención | 30 días tras vencer o revocarse (purga por usuario y script programable) |
| Códigos | 6 dígitos, 10 min, 5 intentos, un solo uso |
| Límites | perímetro 600/5 min por IP; credenciales inválidas 60/15 min por IP; login 30 fallos/15 min por IP y 10 por cuenta; códigos 30 fallos/15 min por IP; registro 10/h por IP; correo 1/min y 5/h por dirección, 30/h por IP; refresh 120/15 min por IP; finanzas 300 lecturas y 1200 escrituras/15 min por usuario |

### Prisma, Neon, TLS, pool y concurrencia

Ver `docs/despliegue.md`, sección «Base de datos: pool, timeouts y TLS». Clave: 5 conexiones por réplica, adquisición acotada a 5 s, `SET LOCAL` de timeouts por transacción (el pooler de Neon rechaza enviarlos al conectar), `ALTER ROLE` para consultas sueltas, `sslmode=verify-full` obligatorio en producción, Cloud Run `concurrency 20`.

### Dependencias antes y después

| Árbol | Baseline | Ahora |
|---|---|---|
| Backend runtime | 28 avisos (1 crítico condicional `proxy-addr`, `compression` alto, `nodemailer`, `morgan`, `ip-address`, `qs`, `body-parser`) | 0 |
| Backend CLI de Prisma (opcional) | 25 | 0 (Prisma 7.10.0 + 2 overrides) |
| pnpm (gestor) | 11.3.0, 18 avisos | 11.27.1, 0 |
| Frontend runtime (`--prod`) | 73 avisos al iniciar esta tarea (Next 16.2.9 crítico, `sharp`, `postcss`, CLI `shadcn` mal clasificado como runtime) | 0 (Next 16.3.8, `shadcn` en devDependencies, 2 overrides de herramientas de build) |
| Frontend desarrollo | — | 24 avisos en herramientas (vitest/tinypool, eslint, CLI de shadcn): no se empaquetan ni se ejecutan en producción; recomendación: actualizar vitest a la siguiente major en una tarea aparte |

Excepción a la política de versiones con ≥ 2 semanas: Next 16.3.8 (8 días) es la primera versión que corrige los avisos críticos.

### Incidente de registro (409 y AUTH_RATE_LIMITED)

- El cuerpo de 66 bytes coincide exactamente con `{"success":false,"message":"Ya existe una cuenta con ese correo."}`: el correo de ese intento correspondía a una cuenta **activa**. Ese 409 era un conflicto real y se conserva (ahora con `code` `EMAIL_ALREADY_REGISTERED`).
- El 201 posterior no puede atribuirse a la carrera sin conocer el correo y el estado de ambas peticiones: la carrera reproducida (201 + 409 de 70 bytes con texto de índice) produce un cuerpo distinto. La causa más compatible es un segundo intento con otro correo (o una cuenta pendiente). Ya no hay registros del caso original para confirmarlo.
- `AUTH_RATE_LIMITED` provenía del limitador único de auth (10 fallos por IP en 15 min, compartido por login, registro, verificación y refresh). Corregido por AUTH-08.
- Corrección de la carrera demostrada: ver REG-01. Trazabilidad para casos futuros: cada intento emite `auth_event` (`register` con `created`, `pending_refreshed`, `race_resolved`, `conflict`, `race_conflict`) con `requestId` y un seudónimo HMAC del correo (`emailFingerprint`), sin el correo ni datos sensibles.
- Frontend: el login usa `/api/auth/login` y el registro `/api/auth/register` (verificado en `auth.api.ts`); el doble envío efectivo se evita con `single-flight`.

### Pendientes externos y procedimiento de verificación

Requieren recursos que no existen todavía (Neon de producción/staging, proyecto GCP, Vercel, apps OAuth, contraseña de aplicación de Gmail). Nada de esto se marcó como aprobado.

1. **CI en GitHub**: subir la rama y comprobar `ci.yml` en verde (backend, frontend, smoke de Docker).
2. **Staging** con un proyecto o rama de Neon de prueba, un servicio Cloud Run `fintrack-backend-staging` y un preview de Vercel con `BACKEND_ORIGIN` y `EDGE_PROXY_SECRET`:
   - `curl -I https://<staging>.vercel.app/` y `https://<servicio>.run.app/api/health/live`: certificados válidos y cabeceras de Helmet.
   - `curl -s -o /dev/null -w '%{http_code}' https://<servicio>.run.app/api/auth/me` → 403; vía Vercel → 401.
   - Iniciar sesión en el navegador y comprobar en DevTools: `Set-Cookie: refresh_token; Secure; HttpOnly; SameSite=Lax; Path=/api/auth` en el dominio de Vercel, ningún JWT en almacenamiento, renovación pasados 15 min (también en Safari/iPhone).
   - En Cloud Logging, los `http_request` muestran la IP del visitante (no la de Vercel) y ningún `code`, `state`, contraseña o token.
   - Repetir 31 logins fallidos desde una red: 429 en login sin afectar el refresh de otra sesión.
   - Registro con correo real, Google y GitHub, recuperación, cambio de correo y contraseña.
   - Dejar escalar a cero y medir la primera petición; con Neon suspendido, `/api/health/ready` 503 → 200 sin reinicios de instancia.
   - Ejecutar `backup-db.yml` manualmente y restaurar en una rama temporal (procedimiento en `docs/despliegue.md`).
3. **Neon**: `ALTER ROLE` de timeouts y comprobar `sslmode=verify-full` contra el certificado real (DATA-13, OPS-08).
4. **Excel de referencia**: confirmar con el libro original los valores de redondeo de `money.test.ts` (DATA-04).

## Identificación de la entrega

- Rama: `fix/backend-qa-remediation`, creada desde `e9208dc`, subida al remoto. No integrada en `main` y no desplegada.
- Primera ronda: `e9208dc..f74e338`; corrección del smoke por el auditor: `72c8d60`; segunda ronda: `72c8d60..HEAD` (`git log --oneline 72c8d60..fix/backend-qa-remediation`).
- Archivos afectados: `git diff --stat e9208dc..fix/backend-qa-remediation`. Principales: `backend/src/**`, `backend/prisma/**`, `backend/scripts/**`, `backend/test/**`, `backend/Dockerfile`, `backend/test/compose.yaml`, `frontend/src/modules/auth/**`, `frontend/src/modules/finance/{api,store,month,settings,shell}/**`, `frontend/src/proxy.ts`, `frontend/src/shared/lib/edge-proxy*.ts`, `.github/workflows/*`, `docs/despliegue.md`, este documento, `AGENTS.md` y `backend/AGENTS.md`.
- CI: el resultado de GitHub Actions para el commit final se informa en la entrega al auditor (no se escribe aquí para no fijar un estado que este mismo commit cambia).
- Working tree al entregar: limpio salvo archivos ignorados (`.local/`, `.tmp/`, `.env`).

## Recomendación

**LISTO PARA NUEVA REVISIÓN INDEPENDIENTE.** Las 19 incidencias de la segunda ronda tienen regresión permanente con fallo observado antes de la corrección, corrección de causa raíz y verificación local con API y PostgreSQL reales (o Vitest en el cliente). Esto no es un aval: el auditor decide si se cierran. **No** está listo para producción: siguen pendientes el entorno de staging y las verificaciones externas listadas (OPS-06, OPS-08, OPS-10, DATA-13, DATA-04 contra el Excel) y el recorrido en navegador de los cambios de sesión de esta ronda. Esta recomendación no autoriza integrar en `main` ni desplegar.
