import jStat from 'jstat'

export interface AndersonDarlingNormalResult {
  count: number
  mean: number
  standardDeviation: number
  statistic: number
  adjustedStatistic: number
  pValue: number
  alpha: number
  rejectNormality: boolean
}

export function normalAndersonDarling(
  values: readonly (number | null | undefined)[],
  alpha = 0.05,
): AndersonDarlingNormalResult {
  if (!Number.isFinite(alpha) || alpha <= 0 || alpha >= 1) {
    throw new Error('Alfa måste vara större än 0 och mindre än 1.')
  }
  const observations = values.filter(
    (value): value is number => value !== null && value !== undefined,
  )
  if (observations.some((value) => !Number.isFinite(value))) {
    throw new Error('Kolumnen innehåller värden som inte är ändliga tal.')
  }
  if (observations.length < 8) {
    throw new Error('Minst åtta kompletta observationer krävs för Anderson-Darling-testet.')
  }

  const { mean, standardDeviation } = sampleMoments(observations)
  if (standardDeviation === 0) {
    throw new Error('Anderson-Darling-test kan inte beräknas för en konstant kolumn.')
  }

  const ordered = [...observations].sort((left, right) => left - right)
  let weightedLogTailSum = 0
  ordered.forEach((value, index) => {
    const lowerZ = (value - mean) / standardDeviation
    const upperZ = (ordered[ordered.length - 1 - index] - mean) / standardDeviation
    weightedLogTailSum += (2 * index + 1) * (logNormalCdf(lowerZ) + logNormalCdf(-upperZ))
  })
  const statistic = Math.max(0, -observations.length - weightedLogTailSum / observations.length)
  const count = observations.length
  const adjustedStatistic = statistic * (1 + 0.75 / count + 2.25 / count ** 2)
  const pValue = andersonDarlingNormalPValue(adjustedStatistic)

  return {
    count,
    mean,
    standardDeviation,
    statistic,
    adjustedStatistic,
    pValue,
    alpha,
    rejectNormality: pValue < alpha,
  }
}

function sampleMoments(values: readonly number[]) {
  let mean = 0
  let sumSquaredDifferences = 0
  values.forEach((value, index) => {
    const delta = value - mean
    mean += delta / (index + 1)
    sumSquaredDifferences += delta * (value - mean)
  })
  return {
    mean,
    standardDeviation: Math.sqrt(sumSquaredDifferences / (values.length - 1)),
  }
}

function logNormalCdf(value: number): number {
  const probability = jStat.normal.cdf(value, 0, 1)
  return Math.log(probability)
}

function andersonDarlingNormalPValue(statistic: number): number {
  if (statistic < 0.2) {
    return clampProbability(1 - Math.exp(-13.436 + 101.14 * statistic - 223.73 * statistic ** 2))
  }
  if (statistic < 0.34) {
    return clampProbability(1 - Math.exp(-8.318 + 42.796 * statistic - 59.938 * statistic ** 2))
  }
  if (statistic < 0.6) {
    return clampProbability(Math.exp(0.9177 - 4.279 * statistic - 1.38 * statistic ** 2))
  }
  return clampProbability(Math.exp(1.2937 - 5.709 * statistic + 0.0186 * statistic ** 2))
}

function clampProbability(value: number): number {
  return Math.max(0, Math.min(1, value))
}
