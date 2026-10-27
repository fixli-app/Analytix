import jStat from 'jstat'
import { describe } from './descriptive'

export interface OneSampleTResult {
  count: number
  mean: number
  hypothesizedMean: number
  standardDeviation: number
  standardError: number
  statistic: number
  degreesOfFreedom: number
  pValue: number
  alpha: number
  confidenceInterval: [number, number]
}

export function oneSampleT(
  values: readonly (number | null | undefined)[],
  hypothesizedMean = 0,
  alpha = 0.05,
): OneSampleTResult {
  if (!Number.isFinite(hypothesizedMean)) {
    throw new Error('Det hypotetiska medelvärdet måste vara ett ändligt tal.')
  }
  if (!Number.isFinite(alpha) || alpha <= 0 || alpha >= 1) {
    throw new Error('Alfa måste vara större än 0 och mindre än 1.')
  }

  const observations = values.filter((value) => value !== null && value !== undefined)
  if (observations.some((value) => !Number.isFinite(value))) {
    throw new Error('Kolumnen innehåller värden som inte är ändliga tal.')
  }

  const summary = describe(observations)
  if (summary.count < 2) {
    throw new Error('Minst två observationer krävs för ett 1-urvals t-test.')
  }
  if (summary.standardDeviation === 0) {
    throw new Error('Ett 1-urvals t-test kräver en varierande kolumn.')
  }

  const degreesOfFreedom = summary.count - 1
  const statistic = (summary.mean - hypothesizedMean) / summary.standardError
  const pValue = Math.min(1, 2 * (1 - jStat.studentt.cdf(Math.abs(statistic), degreesOfFreedom)))
  const criticalValue = jStat.studentt.inv(1 - alpha / 2, degreesOfFreedom)
  const margin = criticalValue * summary.standardError

  return {
    count: summary.count,
    mean: summary.mean,
    hypothesizedMean,
    standardDeviation: summary.standardDeviation,
    standardError: summary.standardError,
    statistic,
    degreesOfFreedom,
    pValue,
    alpha,
    confidenceInterval: [summary.mean - margin, summary.mean + margin],
  }
}
