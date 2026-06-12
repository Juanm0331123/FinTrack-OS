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

## Testing Guidelines

No test framework is fully configured yet. When adding tests, colocate focused unit tests near the code or place integration tests in a dedicated `tests/` folder inside the relevant app. Use descriptive names such as `transactions.service.test.ts` or `dashboard-summary.spec.ts`. Cover finance calculations, authentication, monthly rollups, and debt-payment rules before shipping related features.

## Commit & Pull Request Guidelines

Git history is minimal, so use Conventional Commits going forward, for example `feat(frontend): add onboarding survey` or `fix(backend): validate monthly expense totals`. PRs should include a concise summary, test results, linked issues when available, and screenshots for UI changes.

## Agent-Specific Instructions

Before any Git commit, read this file and use the installed `git-commit` skill. Use `grill-me` automatically for architecture or best-practice decisions that need stress testing. For any frontend design, UX, UI polish, layout, accessibility, or visual decision, use both `ui-ux-pro-max` and `impeccable`. Use these canonical installed skill names exactly.
