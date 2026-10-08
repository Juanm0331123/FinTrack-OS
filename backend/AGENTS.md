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

Solapamientos y resolución:

- **Tests:** `testing-best-practices` gobierna el diseño de tests. Las reglas `test-*` de `nestjs-best-practices` (TestingModule) no aplican.
- **Validación de entrada:** Zod, ya adoptado; `class-validator` no se introduce.
- **Tipos vs framework:** la forma de los tipos la decide `typescript-best-practices`; la estructura de módulos, las reglas arquitectónicas de este archivo.

Carga contextual:

- diseño o código del servidor: `typescript-best-practices`, y además `nestjs-best-practices` para decisiones de arquitectura, seguridad o base de datos;
- tests: `testing-best-practices`;
- decisión de diseño que el Project Owner quiere poner a prueba: `grill-me`.

Las skills del frontend no se usan en este boundary.
