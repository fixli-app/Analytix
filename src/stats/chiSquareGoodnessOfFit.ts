import jStat from 'jstat'

export interface ChiSquareGoodnessOfFitResult {
  count: number
  categories: string[]
  probabilities: number[]
  probabilitySource: 'equal' | 'specified'
  observed: number[]
  expected: number[]
  statistic: number
  degreesOfFreedom: number
  pValue: number
  minimumExpectedCount: number
  cellsBelowFive: number
  alpha: number
}

export interface CategoryProbability {
  category: string
  probability: number
}

export function chiSquareGoodnessOfFit(
  values: readonly (string | number | null | undefined)[],
  categoryProbabilities: readonly CategoryProbability[],
  alpha = 0.05,
): ChiSquareGoodnessOfFitResult {
  if (!Number.isFinite(alpha) || alpha <= 0 || alpha >= 1) {
    throw new Error('Alfa måste vara större än 0 och mindre än 1.')
  }
  if (categoryProbabilities.length < 2) {
    throw new Error('Goodness-of-fit-test kräver minst två förväntade kategorier.')
  }
  const categories = categoryProbabilities.map(({ category }) => category.trim())
  const probabilities = categoryProbabilities.map(({ probability }) => probability)
  if (
    categories.some((category) => category.trim() === '') ||
    new Set(categories).size !== categories.length
  ) {
    throw new Error('Förväntade kategorier måste vara unika och icke-tomma.')
  }
  if (
    probabilities.some((probability) => !Number.isFinite(probability) || probability <= 0) ||
    Math.abs(probabilities.reduce((total, probability) => total + probability, 0) - 1) > 1e-8
  ) {
    throw new Error('Förväntade sannolikheter måste vara positiva och summera till 1.')
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
  const categorySet = new Set(categories)
  if (observations.some((value) => !categorySet.has(String(value).trim()))) {
    throw new Error('Observation innehåller en kategori utan angiven sannolikhet.')
  }
  const counts = new Map(categories.map((category) => [category, 0]))
  observations.forEach((value) => {
    const category = String(value).trim()
    counts.set(category, counts.get(category)! + 1)
  })
  const observed = categories.map((category) => counts.get(category)!)
  const expected = probabilities.map((probability) => observations.length * probability)
  const statistic = observed.reduce(
    (total, observedCount, index) =>
      total + (observedCount - expected[index]) ** 2 / expected[index],
    0,
  )
  const degreesOfFreedom = categories.length - 1

  return {
    count: observations.length,
    categories,
    probabilities,
    probabilitySource: 'specified',
    observed,
    expected,
    statistic,
    degreesOfFreedom,
    pValue: Math.max(0, 1 - jStat.chisquare.cdf(statistic, degreesOfFreedom)),
    minimumExpectedCount: Math.min(...expected),
    cellsBelowFive: expected.filter((count) => count < 5).length,
    alpha,
  }
}

export function chiSquareUniformGoodnessOfFit(
  values: readonly (string | number | null | undefined)[],
  alpha = 0.05,
): ChiSquareGoodnessOfFitResult {
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
  const categories = [...new Set(observations.map((value) => String(value).trim()))].sort((a, b) =>
    a.localeCompare(b, 'sv'),
  )
  if (categories.length < 2) {
    throw new Error('Goodness-of-fit-test kräver minst två kategorier.')
  }
  const probability = 1 / categories.length
  const result = chiSquareGoodnessOfFit(
    values,
    categories.map((category) => ({ category, probability })),
    alpha,
  )
  return { ...result, probabilitySource: 'equal' }
}
