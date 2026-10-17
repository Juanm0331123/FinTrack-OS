# Corrección de errores públicos y migraciones de Neon

Fecha: 2026-10-12. Base de código: `91d42bd`, con correcciones locales sin commit en `feat/landing-design`. Alcance: incidente de login reportado por el Project Owner; no sustituye un QA completo ni un aval de despliegue.

## Causas confirmadas

1. El middleware añadía `error.message` a la respuesta 500 cuando `NODE_ENV=development`. Un error de Prisma exponía su invocación, tabla y columna en la interfaz.
2. Los clientes de autenticación y finanzas confiaban en mensajes técnicos de respuestas fallidas. En finanzas, un error por campo podía prevalecer incluso con estado 503.
3. El logger excluía el mensaje directo de Prisma, pero lo reintroducía desde sus líneas multilínea al recortar `stack` por posición.
4. La base actual de Neon tenía tres migraciones pendientes: faltaban `rate_limit_buckets`, `users.password_hash_version` y otros elementos requeridos por el código. Los QA anteriores usaron PostgreSQL aislado con las migraciones aplicadas.

## Correcciones y evidencia

| Área | Corrección | Evidencia |
|---|---|---|
| Backend | Error desconocido devuelve `500 INTERNAL_ERROR` con mensaje público genérico en todos los entornos. | RED con Prisma P2022 realista en proceso de desarrollo; GREEN con 10 respuestas HTTP entre desarrollo y producción. Validación 422 y errores operativos 503 con `Retry-After` conservados. |
| Frontend | Fallos 5xx y respuestas fallidas inesperadas no usan mensajes técnicos del servidor. Auth descarta detalles/errores por campo/códigos técnicos de esos fallos. | RED de login con diagnóstico de Prisma y RED de finanzas con SQL en `errors[0]`; GREEN tras las correcciones. Se conservan validaciones 4xx, rate limit y recuperación de sesión. |
| Logs | Solo frames de V8 entran en `stack`; el texto multilínea de Prisma no vuelve a introducir argumentos de consulta. | RED con SQL/correo/contraseña sintéticos; GREEN. Se conservan nombre/código, frames reales y protección de errores de parser. |
| Neon | Aplicadas las tres migraciones versionadas, con autorización explícita del Project Owner. | Preflight en solo lectura: todas las cuentas de duplicados/propiedad y `blocking` en cero. `prisma migrate deploy` terminado con éxito; `prisma migrate status`: esquema al día. |
| TLS local | `DATABASE_URL` y `DIRECT_URL` del `.env` ignorado usan explícitamente `sslmode=verify-full`. | Sin cambios de credenciales o destino. Conexión del CLI posterior exit 0. Reiniciar el backend de desarrollo para que recargue esta configuración. |

Migraciones aplicadas:

- `20261009000000_qa_remediation`
- `20261010000000_credential_binding`
- `20261010010000_operation_fingerprint`

Los códigos de verificación antiguos sin sello dejan de ser válidos; se debe solicitar uno nuevo. No se ejecutaron `migrate dev`, reset ni DDL manual.

## Validaciones ejecutadas

- Backend: typecheck aprobado; **117/117 pruebas unitarias**, sin omitidas.
- Frontend: lint y typecheck aprobados; **219/219 pruebas**, incluidas regresiones de clientes y sesión.
- Build frontend: aprobado en copia aislada en `.local/error-handling-build/frontend`, sin archivos `.env`. La configuración copiada solo ajustó la raíz de Turbopack para resolver las dependencias existentes. Los servidores Next del Project Owner continuaron activos.
- `git diff --check`: aprobado.
- Estado de Neon: **6 migraciones aplicadas**, sin pendientes, comprobado con `pnpm.cmd exec prisma migrate status`.
- Smoke del servidor local en `/api/auth/login`: credenciales sintéticas inválidas devuelven **401 `INVALID_CREDENTIALS`**, «Correo o contraseña incorrectos.», request ID y ausencia de diagnóstico interno. Esto verifica consulta/limitador sin error de esquema; no prueba un login exitoso con una cuenta real.

En esta sesión no se repitieron las suites completas de integración/migraciones en Docker, ni el recorrido de navegador, ni CI. La privacidad HTTP se verificó con servidores Express reales y los clientes con respuestas HTTP controladas.

## Archivos y reproducción

- Backend: `src/middlewares/error.middleware.ts`, `src/config/logger.ts`, `src/config/logger.test.ts`, `test/unit/error-response.test.ts`, `test/support/error-response-probe.ts`.
- Frontend: `src/modules/auth/auth.api.ts`, `src/modules/auth/auth.api.test.ts`, `src/modules/finance/api/finance-api.ts`, `src/modules/finance/api/finance-api.test.ts`, `src/shared/lib/api-error-message.ts`.

Desde cada boundary, usar los comandos existentes de `AGENTS.md`. En este PowerShell se ejecutó `pnpm.cmd` para evitar el bloqueo del shim `pnpm.ps1`; el CLI de Prisma sí está instalado. La primera comprobación fallida del CLI no demostraba una dependencia ausente.

## Límites operativos

- El arranque de desarrollo no verifica todas las migraciones y readiness comprueba conexión con `SELECT 1`; la corrección de este incidente no añadió un gate de esquema. Mantener el preflight y `migrate deploy` antes de ejecutar código contra otra base.
- No se modificó la política financiera, la identidad de sesión ni los flujos de guardado.
- Sin commits, push, merge ni despliegue de la aplicación. Las escrituras en Neon fueron las migraciones autorizadas y el contador operativo del smoke de login; no se usaron credenciales de usuarios ni se crearon cuentas de prueba en Neon.
- El diseño sigue a cargo de Claude: C con paneles gris claro, sin partículas ni WebGL.
