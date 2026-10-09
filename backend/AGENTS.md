# Backend — Agent Instructions

Especializa el `AGENTS.md` raíz para `backend/` sin contradecirlo.

## Alcance

- Stack: Node.js 24 (ESM, TypeScript ejecutado con type stripping e imports con extensión `.ts`) + Express 5 + Prisma 7 con `@prisma/adapter-pg` + PostgreSQL en Neon + Zod 4 + `jose` (JWT) + `bcryptjs` + `nodemailer`.
- Organización por capability en `src/modules/<capability>/`: `*.routes.ts`, `*.controller.ts`, `*.service.ts`, `*.repository.ts`, `*.schemas.ts` y `*.types.ts`. Lo transversal vive en `src/config`, `src/middlewares` y `src/utils`.
- El backend posee autenticación, autorización, persistencia y validación de los datos financieros. Cada consulta financiera filtra por el usuario autenticado.

## Reglas arquitectónicas que prevalecen sobre cualquier skill

- Las rutas solo componen middlewares (auth, rate limit, validación) y delegan en el controller.
- Los controllers traducen entre HTTP y servicios; no contienen reglas de negocio ni acceden a Prisma.
- Los services orquestan casos de uso; los repositories concentran el acceso a Prisma y seleccionan solo los campos necesarios.
- La validación de entrada se hace con Zod en el borde (`validate` middleware). Los errores se lanzan como subclases de `AppError` y los traduce `error.middleware.ts`.
- Los cálculos puros no importan Express ni Prisma.
- No crear God services, `utils` genéricos ni dependencias circulares. Un abstraction layer existe solo cuando protege una frontera real.

## Base de datos (Prisma + Neon)

- `DATABASE_URL` es la cadena pooled de Neon que usa la app en runtime; `DIRECT_URL` es la cadena directa que usa el CLI de Prisma para migraciones.
- Todo cambio de `prisma/schema.prisma` lleva su migración (`pnpm prisma:migrate:dev --name <cambio>`) aplicada antes de terminar. En entornos nuevos se usa `pnpm prisma:migrate:deploy`.
- Los montos son `Decimal(14, 2)` y se convierten a `number` solo en el borde de salida.

## Skills

Instaladas en `backend/.agents/skills/`, con espejo en `backend/.claude/skills/`.

| Skill | Rol en FinTrack OS | Límites y adaptaciones |
|---|---|---|
| `nestjs-best-practices` | Principios de arquitectura de servidor: módulos por feature, inyección por constructor, responsabilidad única, repository pattern, manejo de errores, seguridad, transacciones, N+1 y migraciones. | El backend es Express, no NestJS: se aplican sus principios, nunca sus decoradores ni paquetes `@nestjs/*`. Migrar a NestJS es una decisión explícita del Project Owner. |
| `typescript-best-practices` | Corrección del lenguaje: discriminated unions, exhaustividad, branded types cuando protegen identidades, validación en trust boundaries y diseño de tipos. | Su indicación de cargar `react-best-practices` no aplica: no hay React en este boundary. Sus menciones a "CLAUDE.md" se refieren al archivo de su autor. Zod ya es la librería de validación del proyecto. |
| `testing-best-practices` | Diseño de tests: estructura, aislamiento, assertions, datos, determinismo y cobertura significativa. | El runner es `node:test` (incluido en Node, sin dependencias): los ejemplos de Jest/Vitest se traducen a `describe`/`it` y `node:assert/strict`. "Mock only at boundaries" significa reemplazar repositories, no Prisma internals. |
| `api-testing` ([fuente](https://github.com/petrkindlmann/qa-skills/tree/main/skills/api-testing)) | QA de la API pública: contratos de respuesta, autenticación, autorización, CRUD, errores, headers y rendimiento contra un entorno real de prueba. | Traducir ejemplos a `node:test`, `node:assert/strict`, `fetch` de Node 24 y Zod 4, con ESM e imports `.ts`. No introducir Playwright, Supertest, AJV, generadores de schemas ni scanners por seguir ejemplos. API y PostgreSQL funcionan realmente en integración; sustituir terceros como correo. Los contratos permanecen dentro de este boundary: no crear `shared/` en la raíz ni importar frontend. Verificar expectativas del consumidor independientes del schema productor; compartir una definición no detecta por sí solo un cambio incompatible. |

Solapamientos y resolución:

- **Tests:** `testing-best-practices` gobierna el diseño de tests. Las reglas `test-*` de `nestjs-best-practices` (TestingModule) no aplican.
- **QA de API:** `api-testing` gobierna los escenarios HTTP de integración; los tests unitarios conservan el aislamiento de `testing-best-practices`. No sustituir PostgreSQL o repositories en una prueba que pretende demostrar persistencia real.
- **TDD:** `tdd`, instalada en la raíz del proyecto, guía el ciclo de desarrollo; `testing-best-practices` define aislamiento/assertions y `api-testing` los escenarios HTTP. Aplicar las adaptaciones del `AGENTS.md` raíz y conservar `node:test`.
- **Validación de entrada:** Zod, ya adoptado; `class-validator` no se introduce.
- **Tipos vs framework:** la forma de los tipos la decide `typescript-best-practices`; la estructura de módulos, las reglas arquitectónicas de este archivo.

Carga contextual:

- diseño o código del servidor: `typescript-best-practices`, y además `nestjs-best-practices` para decisiones de arquitectura, seguridad o base de datos;
- tests: `testing-best-practices`;
- TDD, nueva lógica verificable o regresión de un bug: `tdd` desde `.agents/skills/tdd/` de la raíz + `testing-best-practices`;
- QA backend, endpoints, integración o preparación para desplegar: `api-testing` y `testing-best-practices`, cargando solo las referencias pertinentes;
- decisión de diseño que el Project Owner quiere poner a prueba: `grill-me`.

Las skills del frontend no se usan en este boundary.

## QA backend antes del despliegue

Aplicar esta lista cuando se solicite QA completo o preparación para desplegar; en cambios rutinarios, validar en proporción al alcance como indica el `AGENTS.md` raíz.

1. Ejecutar `pnpm prisma:generate`, `pnpm typecheck`, `pnpm test` y `pnpm prisma:validate`; levantar el PostgreSQL de `compose.test.yaml` y correr `pnpm test:migrations` y `pnpm test:integration` con `TEST_DATABASE_URL` (la guarda de `test/support/test-database.ts` rechaza bases no locales o sin `test`/`qa` en el nombre); verificar el estado de migraciones con `pnpm exec prisma migrate status` en la base de prueba y el empaquetado con `bash scripts/docker-smoke.sh`. Este boundary no tiene scripts `lint` ni `build`. Arrancar con `pnpm start` y realizar smoke tests HTTP contra la API real; nunca usar migrate/reset ni limpieza sobre producción para hacer QA.
2. Usar PostgreSQL aislado y fixtures de al menos dos usuarios. Confirmar el destino antes de escrituras o limpieza; garantizar teardown incluso al fallar y cerrar servidor/conexiones. Cada test es independiente: un recorrido CRUD completo puede vivir en un solo test, sin depender del orden entre casos.
3. Inventariar rutas, schemas Zod y errores reales. Cubrir éxito y errores relevantes por endpoint: payload inválido o malformado, campos límite, año/mes inválidos, inexistencia, duplicados y conflictos. Validar status, estructura de respuesta, mensajes en español y ausencia de detalles internos; los códigos HTTP y permisos proceden del contrato implementado.
4. Probar registro/verificación de correo, login, refresh, logout/logout-all, recuperación y OAuth según los contratos implementados; cookies y JWT válidos, malformados y realmente expirados. Con dos usuarios, intentar leer, editar, borrar y copiar recursos financieros ajenos: comprobar rechazo y ausencia de cambios. Revisar CORS, headers de seguridad/cache y rate limit; cuando corresponda, demostrar un 429 y sus headers con assertions que siempre se ejecutan.
5. Verificar persistencia de montos `Decimal(14, 2)`, redondeo y límites; integridad de relaciones, transacciones y rollback ante fallos. Probar escrituras concurrentes, reintentos, copia de hojas y separación por año/mes para detectar pérdidas o duplicados. Comprobar la salida consumida por el frontend y la paridad financiera aplicable con fixtures del Excel.
6. Medir endpoints críticos y volumen de respuesta con datos representativos; definir presupuestos según el entorno y una medición base, sin adoptar umbrales arbitrarios de los ejemplos. Revisar queries repetidas/N+1 y errores bajo concurrencia controlada. Los checks de infraestructura externa o servicios no disponibles quedan documentados como bloqueados o no ejecutados.

Entregar el reporte con estados, evidencia y reproducción definidos en el `AGENTS.md` raíz. Los logs y ejemplos HTTP deben omitir secretos, cookies, tokens y datos personales reales.
