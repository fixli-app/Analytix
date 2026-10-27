import jStat from 'jstat'

export interface OneSamplePoissonRateResult {
  observationCount: number
  eventCount: number
  totalExposure: number
  observedRate: number
  hypothesizedRate: number
  statistic: number
  pValue: number
  alpha: number
  confidenceInterval: [number, number]
  expectedEvents: number
}

export function oneSamplePoissonRate(
  counts: readonly (number | null | undefined)[],
  exposurePerObservation: number,
  hypothesizedRate: number,
  alpha = 0.05,
): OneSamplePoissonRateResult {
  if (!Number.isFinite(exposurePerObservation) || exposurePerObservation <= 0) {
    throw new Error('Exponeringen per observation måste vara större än 0.')
  }
  if (!Number.isFinite(hypothesizedRate) || hypothesizedRate <= 0) {
    throw new Error('Den hypotetiska hastigheten måste vara större än 0.')
  }
  if (!Number.isFinite(alpha) || alpha <= 0 || alpha >= 1) {
    throw new Error('Alfa måste vara större än 0 och mindre än 1.')
  }

  const observations = counts.filter((count) => count !== null && count !== undefined)
  if (
    observations.some((count) => !Number.isFinite(count) || count < 0 || !Number.isInteger(count))
  ) {
    throw new Error('Poisson-data måste vara icke-negativa heltalsräkningar.')
  }
  if (observations.length === 0) {
    throw new Error('Minst en Poisson-observation krävs.')
  }

  const eventCount = observations.reduce((total, count) => total + count, 0)
  const totalExposure = observations.length * exposurePerObservation
  const observedRate = eventCount / totalExposure
  const expectedEvents = hypothesizedRate * totalExposure
  const statistic = (eventCount - expectedEvents) / Math.sqrt(expectedEvents)
  const pValue = Math.min(1, 2 * (1 - jStat.normal.cdf(Math.abs(statistic), 0, 1)))
  const lower =
    eventCount === 0 ? 0 : (0.5 * jStat.chisquare.inv(alpha / 2, 2 * eventCount)) / totalExposure
  const upper = (0.5 * jStat.chisquare.inv(1 - alpha / 2, 2 * (eventCount + 1))) / totalExposure

  return {
    observationCount: observations.length,
    eventCount,
    totalExposure,
    observedRate,
    hypothesizedRate,
    statistic,
    pValue,
    alpha,
    confidenceInterval: [lower, upper],
    expectedEvents,
  }
}
