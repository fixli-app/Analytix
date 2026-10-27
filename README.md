# StatLab

StatLab is a Swedish-first, local statistical workbench. It is an independent project and does not reproduce another product's branding or interface assets.

## Run locally

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

Quality commands:

```sh
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
```

## Current functionality

- Virtualized editable worksheet with an example production dataset, numeric/text columns, row and column insertion, ascending sort, keyboard undo/redo, and tab/newline paste.
- Data menu: ascending/descending typed sort, insert/delete active row, delete active column (last-column guard), and replace missing values. These operations are undoable.
- Swedish-aware, case-insensitive quick search filters visible rows without changing the underlying worksheet; the virtualized grid retains original row indexes.
- Calculate menu: worker-backed sample z-score standardization, stored in a new undoable numeric column; missing observations remain missing.
- CSV and XLSX import; CSV export; JSON `.statlab` project open/save; browser IndexedDB autosave.
- Swedish default language with an English toggle; light/dark theme.
- Worker-backed descriptive summary: count, mean, median, sample standard deviation, variance, standard error, R-7 quartiles, range, minimum, and maximum. Missing/non-finite observations are excluded; an empty numeric sample returns a readable error.
- Session result panel with an explicit unverified label, copy, and plain-text export.

## Verification status

| Analysis                                                                                              | Status                                            | Evidence                                                                                                                                                                               |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Descriptive summary subset (n, mean, median, sample SD, variance, SE, R-7 quartiles, range, min, max) | Implemented; not independently reference-verified | `src/stats/__tests__/descriptive.test.ts`; hand-calculated fixture `[1, 2, 3, 4]`; explicit tolerance for sample SD/variance/SE. An external NIST/R/SciPy reference comparison remains |
| Sample z-score standardization                                                                        | Implemented; not independently reference-verified | `src/stats/__tests__/transform.test.ts`; hand-calculated fixture `[1, 2, 3] -> [-1, 0, 1]`; an external reference comparison remains                                                   |
| Other requested statistical analyses                                                                  | Not started                                       | No implementation or reference fixture yet                                                                                                                                             |

The twenty-three current tests cover descriptive summaries, standardization, row search, and workbook editing/history/data operations. This is not the requested 90% statistics coverage target. The analysis fixtures are hand-calculated; none is currently marked independently verified.

## Architecture

- `src/stats`: pure statistical functions, independent of React.
- `src/workers`: Comlink worker entry and client.
- `src/store`: Zustand + Immer workbook state and history.
- `src/utils`: IndexedDB project autosave.
- `src/i18n`: Swedish and English resources.
- `src/components`, `src/dialogs`, `src/charts`, `src/io`, `src/macros`, and `docs` are reserved for the planned modules as they are implemented.

The app uses React 18, strict TypeScript, Vite, Tailwind CSS, TanStack Virtual, Papa Parse, SheetJS, Plotly, Radix, Vitest/Testing Library, Playwright, ESLint, Prettier, and Husky dependencies. A dependency being installed does not imply its feature is implemented.

## Limitations

This is an initial working slice, not a complete statistical package. Multiple worksheets, stacking/splitting/merging/subsetting/filtering/type conversion/ranking/random sampling, analysis dialogs, inference/regression/quality/DOE methods, charts, report builder, macros, accessibility audit, offline PWA, and full help content remain unfinished. The 500,000-row performance goal has not been benchmarked. Descriptive statistics has a hand-calculated test fixture but no independent reference verification; results are visibly marked unverified in the session.
