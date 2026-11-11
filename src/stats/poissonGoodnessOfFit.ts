import jStat from 'jstat'

export interface PoissonGoodnessOfFitResult {
  count: number
  estimatedRate: number
  categories: string[]
  observed: number[]
  expected: number[]
  statistic: number
  degreesOfFreedom: number
  pValue: number
  alpha: number
  minimumExpectedCount: number
}

interface PooledCategory {
  first: number
  last: number
  observed: number
  expected: number
}

export function poissonGoodnessOfFit(
  values: readonly (number | null | undefined)[],
  alpha = 0.05,
  minimumExpectedCount = 5,
): PoissonGoodnessOfFitResult {
  if (!Number.isFinite(alpha) || alpha <= 0 || alpha >= 1) {
    throw new Error('Alfa måste vara större än 0 och mindre än 1.')
  }
  if (!Number.isFinite(minimumExpectedCount) || minimumExpectedCount <= 0) {
    throw new Error('Minsta förväntade antal måste vara större än 0.')
  }
  const observations = values.filter(
    (value): value is number => value !== null && value !== undefined,
  )
  if (observations.some((value) => !Number.isFinite(value))) {
    throw new Error('Poisson-data innehåller värden som inte är ändliga tal.')
  }
  if (observations.some((value) => !Number.isInteger(value) || value < 0)) {
    throw new Error('Poisson-data måste vara icke-negativa heltalsräkningar.')
  }
  if (observations.length === 0) {
    throw new Error('Minst en Poisson-observation krävs.')
  }

  const count = observations.length
  const estimatedRate = mean(observations)
  if (estimatedRate <= 0) {
    throw new Error('Poisson-goodness-of-fit kräver en positiv skattad hastighet.')
  }
  const maximumObserved = Math.max(...observations)
  const cutoff = Math.min(
    maximumObserved,
    Math.ceil(estimatedRate + 10 * Math.sqrt(estimatedRate + 1) + 10),
  )
  const frequencies = new Array<number>(cutoff + 1).fill(0)
  observations.forEach((value) => {
    if (value <= cutoff) frequencies[value] += 1
  })

  const probabilities = new Array<number>(cutoff + 1)
  probabilities[0] = Math.exp(-estimatedRate)
  for (let category = 1; category <= cutoff; category += 1) {
    probabilities[category] = (probabilities[category - 1] * estimatedRate) / category
  }
  const cumulativeProbability = probabilities.reduce((total, probability) => total + probability, 0)
  const tailProbability = Math.max(0, 1 - cumulativeProbability)
  const rawExpected = probabilities.map((probability) => probability * count)
  const rawObserved = [...frequencies]
  rawExpected.push(tailProbability * count)
  rawObserved.push(observations.filter((value) => value > cutoff).length)

  const pooled = poolAdjacentCategories(rawObserved, rawExpected, minimumExpectedCount)
  const degreesOfFreedom = pooled.length - 1 - 1
  if (degreesOfFreedom < 1) {
    throw new Error('För få kategorier återstår efter sammanslagning för ett Poisson-chi-två-test.')
  }
  const statistic = pooled.reduce(
    (total, category) => total + (category.observed - category.expected) ** 2 / category.expected,
    0,
  )

  return {
    count,
    estimatedRate,
    categories: pooled.map((category, index) =>
      formatCategory(category, index === pooled.length - 1),
    ),
    observed: pooled.map((category) => category.observed),
    expected: pooled.map((category) => category.expected),
    statistic,
    degreesOfFreedom,
    pValue: Math.max(0, Math.min(1, 1 - jStat.chisquare.cdf(statistic, degreesOfFreedom))),
    alpha,
    minimumExpectedCount: Math.min(...pooled.map((category) => category.expected)),
  }
}

function mean(values: readonly number[]): number {
  let average = 0
  values.forEach((value, index) => {
    average += (value - average) / (index + 1)
  })
  return average
}

function poolAdjacentCategories(
  observed: readonly number[],
  expected: readonly number[],
  minimumExpectedCount: number,
): PooledCategory[] {
  const pooled: PooledCategory[] = []
  let current: PooledCategory | null = null
  for (let index = 0; index < expected.length; index += 1) {
    current = current
      ? {
          ...current,
          last: index,
          observed: current.observed + observed[index],
          expected: current.expected + expected[index],
        }
      : { first: index, last: index, observed: observed[index], expected: expected[index] }
    if (current.expected >= minimumExpectedCount) {
      pooled.push(current)
      current = null
    }
  }
  if (current) {
    const previous = pooled.pop()
    if (previous) {
      pooled.push({
        ...previous,
        last: current.last,
        observed: previous.observed + current.observed,
        expected: previous.expected + current.expected,
      })
    } else {
      pooled.push(current)
    }
  }
  return pooled
}

function formatCategory(category: PooledCategory, isLast: boolean): string {
  if (category.first === category.last) {
    return isLast ? `≥${category.first}` : String(category.first)
  }
  if (isLast) return `≥${category.first}`
  return `${category.first}–${category.last}`
}
