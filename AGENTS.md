# Repository Guidelines

## Project Structure & Module Organization

FinTrack-OS is split into `frontend/` and `backend/`. The frontend uses Next.js App Router under `frontend/src/app/`, feature modules under `frontend/src/modules/`, shared shadcn components under `frontend/src/shared/ui/`, shared utilities under `frontend/src/shared/lib/`, and route constants under `frontend/src/shared/config/`. Static assets remain in `frontend/public/`. The backend keeps Node/Express source under `backend/src/`, currently centered on `app.ts` and `server.ts`. Keep routes thin: route files should import module pages, not hold feature logic.

## Build, Test, and Development Commands

Use `pnpm`, matching the existing lockfiles.

- `cd frontend && pnpm dev`: start the local Next.js development server.
- `cd frontend && pnpm build`: create the production frontend build.
- `cd frontend && pnpm lint`: run Next.js/TypeScript ESLint checks.
- `cd backend && pnpm test`: currently a placeholder that fails until backend tests are added.

Add backend `dev`, `build`, and test scripts before relying on backend automation in CI.

## Coding Style & Naming Conventions

Use TypeScript for application code. Follow the frontend's existing two-space indentation, Tailwind utility classes, and shadcn components from `@/shared/ui`. Feature code belongs in module folders such as `src/modules/home` or `src/modules/auth/login`; cross-cutting helpers belong in `src/shared`. Backend files currently use ESM imports; keep backend modules small and named by responsibility, such as `auth.service.ts`, `transactions.route.ts`, or `monthly-summary.schema.ts`.

For React work, prefer stable props, derived values, and event handlers that avoid unnecessary rerenders. Use `useMemo`, `useCallback`, `useEffectEvent`, `memo`, and related patterns only when they materially reduce render work or preserve identity for child components, and keep the dependency arrays minimal and correct. Do not add memoization by reflex, but do add it when it prevents repeated expensive calculation, child churn, or callback identity thrash.

## Testing Guidelines

No test framework is fully configured yet. When adding tests, colocate focused unit tests near the code or place integration tests in a dedicated `tests/` folder inside the relevant app. Use descriptive names such as `transactions.service.test.ts` or `dashboard-summary.spec.ts`. Cover finance calculations, authentication, monthly rollups, and debt-payment rules before shipping related features.

## Commit & Pull Request Guidelines

Git history is minimal, so use Conventional Commits going forward, for example `feat(frontend): add onboarding survey` or `fix(backend): validate monthly expense totals`. PRs should include a concise summary, test results, linked issues when available, and screenshots for UI changes.

## Agent-Specific Instructions

Before any Git commit, read this file and use the installed `git-commit` skill. Use `grill-me` automatically for architecture or best-practice decisions that need stress testing. For any frontend design, UX, UI polish, layout, accessibility, or visual decision, use both `ui-ux-pro-max` and `impeccable`. Use these canonical installed skill names exactly.
For any Node.js, Express, backend, REST API, middleware, server configuration, or Prisma backend task, use the installed `nodejs-backend-patterns` skill automatically. Use this canonical installed skill name exactly.
If a code change introduces or depends on a Prisma schema or database-structure change, run the required Prisma migration automatically before finishing the task. Do not wait for the user to report runtime errors such as missing columns, missing tables, or drift caused by unapplied migrations.
Use the installed Superpowers skill set automatically whenever it applies. Use these canonical installed skill names exactly: `using-superpowers`, `writing-plans`, `executing-plans`, `systematic-debugging`, `test-driven-development`, `verification-before-completion`, `requesting-code-review`, `receiving-code-review`, `dispatching-parallel-agents`, `subagent-driven-development`, `brainstorming`, `using-git-worktrees`, `finishing-a-development-branch`, and `writing-skills`.
