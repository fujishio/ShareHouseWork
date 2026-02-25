# Refactor Plan (Housework First)

## Goal
- Prioritize housework features while improving internal structure for safe, fast future implementation.
- Keep current behavior stable; allow small UI polish only when low risk.

## Current Pain Points
- Domain logic, mock data, and presentation logic are mixed.
- Time/date handling is scattered and partly hard-coded.
- Type comments and data are partially inconsistent (`Task.points` comment vs actual values).
- No test baseline for core logic (`task prioritization`, `time formatting`).

## Target Structure
- `src/domain/*`: business rules and pure logic
- `src/features/*`: feature-specific composition and repositories
- `src/shared/*`: cross-feature helpers/utilities
- `src/components/*`: reusable UI components
- `src/app/*`: route entry points and page composition

## Phase Breakdown

### Phase 1 (Now) - Safe Reorganization
- Move housework definitions/prioritization into `src/domain/tasks`.
- Move home mock dashboard data into `src/features/home/mock`.
- Move time helpers into `src/shared/lib/time.ts`.
- Replace imports in pages/components.
- Keep compatibility shims in old `src/lib/*` files (temporary).
- Fix obvious type-comment inconsistencies.

### Phase 2 - Test Baseline (Recommended)
- Add `Vitest` (+ `@vitest/ui` optional).
- Add unit tests for:
  - task urgency ordering
  - overdue calculation
  - relative time formatting
- Add scripts: `test`, `test:watch`.

### Phase 3 - Housework Domain Expansion
- Add `TaskCompletion` service (record completion, update points, event hooks).
- Introduce repository interface:
  - `TaskRepository`
  - `CompletionRepository`
- Keep local/mock implementation first (for front-end development speed).

### Phase 4 - Data Layer Introduction (Low Cost)
- Start with one of:
  - `Supabase Postgres` free tier + Prisma
  - `Neon Postgres` free tier + Prisma
  - `Turso (SQLite)` free tier + Drizzle (lightweight)
- Keep interface from Phase 3 so swap from mock to DB is incremental.

## Execution Rules
- Default: behavior-preserving refactor first.
- Small UI polish allowed if:
  - no behavior change,
  - no large CSS rewrite,
  - no accessibility regression.
- Avoid big-bang rewrite.

## Task Checklist
- [x] Phase 1 completed and type-check passing
- [ ] Phase 2 tests added and passing
- [ ] Phase 3 repository interfaces in place
- [ ] Phase 4 selected provider + migration plan

## Notes for Next Sessions
- If work must be split, complete one phase per PR.
- Keep `src/lib/*` compatibility files until all imports are migrated, then delete.
