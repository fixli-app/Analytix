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
- Statistics menu: two-sided one-sample t-test with editable hypothesized mean and α, p-value, confidence interval, conclusion, and explicit untested assumptions.
- Statistics menu: one-sample Z-test with explicitly known population standard deviation, editable hypothesized mean and α, p-value, and confidence interval.
- Statistics menu: two-sample Z-test for independent means with separately known population standard deviations, hypothesized difference, α, p-value, and confidence interval.
- Statistics menu: two-sided Welch two-sample t-test with selectable numeric columns, hypothesized mean difference, α, p-value, confidence interval, conclusion, and explicit untested assumptions.
- Statistics menu: paired t-test based on row-aligned observations, with pairwise missing-data handling, α, confidence interval, conclusion, and explicit untested assumptions.
- Statistics menu: one-proportion Z-test for binary 0/1 columns, with normal-approximation expected counts and a Wilson score confidence interval.
- Statistics menu: two-proportion Z-test for two independent binary columns, using pooled null standard error and a Newcombe-Wilson confidence interval.
- Statistics menu: Pearson correlation and sample covariance, with two-sided t inference and Fisher-z confidence interval.
- Statistics menu: one-sample Poisson event-rate score test with exposure input, normal-approximation p-value, and Garwood confidence interval.
- Statistics menu: two-sample Poisson rate test with separate exposures, pooled null-rate variance, and a confidence interval for the rate difference.
- Statistics menu: compare two variances with F, Bartlett, and median-centered Levene tests; normality assumptions for F/Bartlett are disclosed.
- Statistics menu: Pearson chi-square independence test with observed and expected contingency counts, Cramér's V, and small-cell diagnostics.
- Statistics menu: chi-square goodness-of-fit for equal category probabilities, with observed/expected counts and small-cell warnings.
- Statistics menu: two-sided Fisher exact test for 2×2 tables, with fixed margins and an odds-ratio estimate.
- Statistics menu: two-sided Kolmogorov-Smirnov test against a fully specified normal distribution; μ and σ are supplied by the user.
- CSV and XLSX import; CSV export; JSON `.statlab` project open/save; browser IndexedDB autosave.
- Swedish default language with an English toggle; light/dark theme.
- Worker-backed descriptive summary: count, mean, median, sample standard deviation, variance, standard error, R-7 quartiles, range, minimum, and maximum. Missing/non-finite observations are excluded; an empty numeric sample returns a readable error.
- Session result panel with an explicit unverified label, copy, and plain-text export.

## Verification status

| Analysis                                                                                              | Status                                            | Evidence                                                                                                                                                                               |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Descriptive summary subset (n, mean, median, sample SD, variance, SE, R-7 quartiles, range, min, max) | Implemented; not independently reference-verified | `src/stats/__tests__/descriptive.test.ts`; hand-calculated fixture `[1, 2, 3, 4]`; explicit tolerance for sample SD/variance/SE. An external NIST/R/SciPy reference comparison remains |
| Sample z-score standardization                                                                        | Implemented; not independently reference-verified | `src/stats/__tests__/transform.test.ts`; hand-calculated fixture `[1, 2, 3] -> [-1, 0, 1]`; an external reference comparison remains                                                   |
| Two-sided one-sample t-test                                                                           | Implemented; not independently reference-verified | `src/stats/__tests__/oneSampleT.test.ts`; fixture `[2, 3, 5, 4, 6]`, μ₀=3; expected p=0.23019964108; an external NIST/R/SciPy comparison remains                                       |
| Two-sided one-sample Z-test                                                                           | Implemented; not independently reference-verified | `src/stats/__tests__/oneSampleZ.test.ts`; fixture `[1, 2, 3]`, μ₀=2, known σ=1; normal p-value and CI fixture; an external reference comparison remains                                |
| Two-sided two-sample Z-test                                                                           | Implemented; not independently reference-verified | `src/stats/__tests__/twoSampleZ.test.ts`; fixture `[2, 3, 4, 5]` vs `[1, 2, 3, 4]`, known σ₁=σ₂=1; external comparison remains                                                         |
| Two-sided Welch two-sample t-test                                                                     | Implemented; not independently reference-verified | `src/stats/__tests__/twoSampleT.test.ts`; fixture `[5, 7, 8, 6, 9]` vs `[2, 3, 4, 5, 6]`; unequal-variance CI and p-value fixture; an external reference comparison remains            |
| Paired two-sided t-test                                                                               | Implemented; not independently reference-verified | `src/stats/__tests__/pairedT.test.ts`; within-row difference fixture; missing pairs omitted; an external reference comparison remains                                                  |
| Two-sided one-proportion Z-test                                                                       | Implemented; not independently reference-verified | `src/stats/__tests__/oneProportion.test.ts`; 26/40 successes vs p₀=0.5; Wilson interval and p-value fixture; an external reference comparison remains                                  |
| Two-sided two-proportion Z-test                                                                       | Implemented; not independently reference-verified | `src/stats/__tests__/twoProportions.test.ts`; 26/40 vs 18/40; pooled z and Newcombe-Wilson interval fixture; an external reference comparison remains                                  |
| Pearson correlation/covariance                                                                        | Implemented; not independently reference-verified | `src/stats/__tests__/correlation.test.ts`; five-pair fixture with r=−0.8; t p-value and Fisher-z interval fixture; an external reference comparison remains                            |
| One-sample Poisson event rate                                                                         | Implemented; not independently reference-verified | `src/stats/__tests__/oneSamplePoissonRate.test.ts`; counts `[0, 1, 2]`, exposure 1, λ₀=0.5; score p-value and Garwood interval fixture; an external reference comparison remains       |
| Two-sample Poisson event rates                                                                        | Implemented; not independently reference-verified | `src/stats/__tests__/twoSamplePoissonRate.test.ts`; 4/4 vs 12/4 events/exposure; pooled z and rate-difference interval fixture; an external reference comparison remains               |
| Two-sample variance comparisons (F, Bartlett, Levene)                                                 | Implemented; not independently reference-verified | `src/stats/__tests__/compareVariances.test.ts`; equal sample variance fixture and explicit normality caveat; external reference comparison remains                                     |
| Kolmogorov-Smirnov vs fully specified normal                                                          | Implemented; not independently reference-verified | `src/stats/__tests__/normalKs.test.ts`; fixed μ/σ fixture; estimated-parameter Lilliefors correction is not implemented                                                                |
| Chi-square test of independence                                                                       | Implemented; not independently reference-verified | `src/stats/__tests__/chiSquare.test.ts`; 2×2 fixture with expected counts and Cramér's V; external reference comparison remains                                                        |
| Uniform chi-square goodness-of-fit                                                                    | Implemented; not independently reference-verified | `src/stats/__tests__/chiSquareGoodnessOfFit.test.ts`; 3-category fixture with equal expected frequencies; arbitrary category probabilities remain unsupported                          |
| Two-sided Fisher exact test                                                                           | Implemented; not independently reference-verified | `src/stats/__tests__/fisherExact.test.ts`; classic 2×2 fixture `[[1, 9], [11, 3]]`; exact p-value and odds-ratio fixture; external reference comparison remains                        |
| Other requested statistical analyses                                                                  | Not started                                       | No implementation or reference fixture yet                                                                                                                                             |

The seventy-three current tests cover descriptive summaries, standardization, specified-normal KS, chi-square independence and uniform goodness-of-fit, Fisher exact, one-/two-sample Z, correlation/covariance, one-/two-proportion tests, one-/two-sample and paired t-tests, one-/two-sample Poisson rates, F/Bartlett/Levene comparisons, row search, and workbook editing/history/data operations. This is not the requested 90% statistics coverage target. The analysis fixtures are hand-calculated; none is currently marked independently verified.

## Architecture

- `src/stats`: pure statistical functions, independent of React.
- `src/workers`: Comlink worker entry and client.
- `src/store`: Zustand + Immer workbook state and history.
- `src/utils`: IndexedDB project autosave.
- `src/i18n`: Swedish and English resources.
- `src/components`, `src/dialogs`, `src/charts`, `src/io`, `src/macros`, and `docs` are reserved for the planned modules as they are implemented.

The app uses React 18, strict TypeScript, Vite, Tailwind CSS, TanStack Virtual, Papa Parse, SheetJS, jStat distribution functions, Plotly, Radix, Vitest/Testing Library, Playwright, ESLint, Prettier, and Husky dependencies. A dependency being installed does not imply its feature is implemented.

## Limitations

This is an initial working slice, not a complete statistical package. The KS implementation only supports a fully specified normal distribution; estimated-parameter Lilliefors correction remains unfinished. Multiple worksheets, stacking/splitting/merging/subsetting/filtering/type conversion/ranking/random sampling, remaining analysis dialogs, regression/quality/DOE methods, charts, report builder, macros, accessibility audit, offline PWA, and full help content remain unfinished. The 500,000-row performance goal has not been benchmarked. Statistical fixtures are hand-calculated and not yet independently reference-verified; results are visibly marked unverified in the session.
