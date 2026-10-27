import jStat from 'jstat'

export interface TwoSamplePoissonRateResult {
  observationCount1: number
  observationCount2: number
  eventCount1: number
  eventCount2: number
  totalExposure1: number
  totalExposure2: number
  rate1: number
  rate2: number
  difference: number
  standardError: number
  statistic: number
  pValue: number
  alpha: number
  confidenceInterval: [number, number]
  expectedEvents1: number
  expectedEvents2: number
}

export function twoSamplePoissonRate(
  counts1: readonly (number | null | undefined)[],
  exposurePerObservation1: number,
  counts2: readonly (number | null | undefined)[],
  exposurePerObservation2: number,
  alpha = 0.05,
): TwoSamplePoissonRateResult {
  if (
    !Number.isFinite(exposurePerObservation1) ||
    exposurePerObservation1 <= 0 ||
    !Number.isFinite(exposurePerObservation2) ||
    exposurePerObservation2 <= 0
  ) {
    throw new Error('Exponeringen per observation måste vara större än 0.')
  }
  if (!Number.isFinite(alpha) || alpha <= 0 || alpha >= 1) {
    throw new Error('Alfa måste vara större än 0 och mindre än 1.')
  }

  const observations1 = completeCounts(counts1)
  const observations2 = completeCounts(counts2)
  if (observations1.length === 0 || observations2.length === 0) {
    throw new Error('Minst en observation krävs i varje grupp.')
  }

  const eventCount1 = observations1.reduce((total, count) => total + count, 0)
  const eventCount2 = observations2.reduce((total, count) => total + count, 0)
  const totalExposure1 = observations1.length * exposurePerObservation1
  const totalExposure2 = observations2.length * exposurePerObservation2
  const rate1 = eventCount1 / totalExposure1
  const rate2 = eventCount2 / totalExposure2
  const pooledRate = (eventCount1 + eventCount2) / (totalExposure1 + totalExposure2)
  const nullStandardError = Math.sqrt(pooledRate * (1 / totalExposure1 + 1 / totalExposure2))
  if (nullStandardError === 0) {
    throw new Error('Den poolade hastigheten har ingen variation under H₀.')
  }

  const difference = rate1 - rate2
  const statistic = difference / nullStandardError
  const pValue = Math.min(1, 2 * (1 - jStat.normal.cdf(Math.abs(statistic), 0, 1)))
  const standardError = Math.sqrt(
    eventCount1 / totalExposure1 ** 2 + eventCount2 / totalExposure2 ** 2,
  )
  const criticalValue = jStat.normal.inv(1 - alpha / 2, 0, 1)
  const margin = criticalValue * standardError

  return {
    observationCount1: observations1.length,
    observationCount2: observations2.length,
    eventCount1,
    eventCount2,
    totalExposure1,
    totalExposure2,
    rate1,
    rate2,
    difference,
    standardError,
    statistic,
    pValue,
    alpha,
    confidenceInterval: [difference - margin, difference + margin],
    expectedEvents1: pooledRate * totalExposure1,
    expectedEvents2: pooledRate * totalExposure2,
  }
}

function completeCounts(values: readonly (number | null | undefined)[]): number[] {
  const observations = values.filter((value) => value !== null && value !== undefined)
  if (
    observations.some((value) => !Number.isFinite(value) || value < 0 || !Number.isInteger(value))
  ) {
    throw new Error('Poisson-data måste vara icke-negativa heltalsräkningar.')
  }
  return observations
}
