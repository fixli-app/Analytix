# StatLab

StatLab is an independent, Swedish-first statistical analysis application built with React 18, strict TypeScript, and Vite. Its goal is a spreadsheet-centered workflow with transparent statistical output. It is not affiliated with or a copy of any commercial statistics product.

## Conventions

- Keep statistical functions pure and framework-independent under `src/stats`.
- Label each analysis as unverified until it has a fixture-based comparison against a trusted reference.
- Handle missing, empty, constant, collinear, and undersized data with explicit errors; do not silently return misleading output.
- Keep UI accessible, responsive, keyboard-friendly, and localized in Swedish and English.
- Record scope decisions and deviations in `DECISIONS.md`; keep `PROGRESS.md` current.
- Prefer small, tested changes. Do not claim feature completeness or verification that has not been demonstrated.

## Commands

- `npm install` - install dependencies.
- `npm run dev` - start the local app.
- `npm run typecheck` - check strict TypeScript types.
- `npm run lint` - lint the project.
- `npm test` - run unit tests.
- `npm run build` - create a production build.

## Required workflow

Implement features in the order in `PROGRESS.md`. For each coherent module, add or update tests, run typecheck, lint, and tests, then update progress. Only mark an analysis verified after a passing comparison against a documented reference value and tolerance. Commit and tag phase releases only when that phase is actually complete and verified; never create a release tag for a partial phase.

## Architecture target

Use React 18 + strict TypeScript + Vite; Zustand/Immer; Tailwind and accessible Radix primitives; TanStack Table with virtualization; Plotly; pure local statistical implementations under `src/stats`; Comlink workers; IndexedDB; CSV/XLSX import/export; Vitest/Testing Library and Playwright; Swedish/English i18n; ESLint/Prettier and suitable pre-commit checks. Keep dependencies limited to those needed by implemented features.
