import jStat from 'jstat'

export interface ChiSquareGoodnessOfFitResult {
  count: number
  categories: string[]
  observed: number[]
  expected: number[]
  statistic: number
  degreesOfFreedom: number
  pValue: number
  minimumExpectedCount: number
  cellsBelowFive: number
  alpha: number
}

export function chiSquareUniformGoodnessOfFit(
  values: readonly (string | number | null | undefined)[],
  alpha = 0.05,
): ChiSquareGoodnessOfFitResult {
  if (!Number.isFinite(alpha) || alpha <= 0 || alpha >= 1) {
    throw new Error('Alfa måste vara större än 0 och mindre än 1.')
  }
  const observations = values.filter((value) => value !== null && value !== undefined)
  if (
    observations.some(
      (value) =>
        (typeof value === 'number' && !Number.isFinite(value)) ||
        (typeof value === 'string' && value.trim() === ''),
    )
  ) {
    throw new Error('Kategorikolumnen innehåller ogiltiga värden.')
  }
  if (observations.length === 0) {
    throw new Error('Inga observationer finns för goodness-of-fit-testet.')
  }

  const categories = [...new Set(observations.map(String))].sort((a, b) => a.localeCompare(b, 'sv'))
  if (categories.length < 2) {
    throw new Error('Goodness-of-fit-test kräver minst två kategorier.')
  }

  const counts = new Map(categories.map((category) => [category, 0]))
  observations.forEach((value) => counts.set(String(value), counts.get(String(value))! + 1))
  const observed = categories.map((category) => counts.get(category)!)
  const expectedCount = observations.length / categories.length
  const expected = categories.map(() => expectedCount)
  const statistic = observed.reduce(
    (total, observedCount) => total + (observedCount - expectedCount) ** 2 / expectedCount,
    0,
  )
  const degreesOfFreedom = categories.length - 1

  return {
    count: observations.length,
    categories,
    observed,
    expected,
    statistic,
    degreesOfFreedom,
    pValue: Math.max(0, 1 - jStat.chisquare.cdf(statistic, degreesOfFreedom)),
    minimumExpectedCount: expectedCount,
    cellsBelowFive: expected.filter((count) => count < 5).length,
    alpha,
  }
}
