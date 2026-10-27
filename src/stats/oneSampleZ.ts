import jStat from 'jstat'
import { describe } from './descriptive'

export interface OneSampleZResult {
  count: number
  mean: number
  hypothesizedMean: number
  knownStandardDeviation: number
  standardError: number
  statistic: number
  pValue: number
  alpha: number
  confidenceInterval: [number, number]
}

export function oneSampleZ(
  values: readonly (number | null | undefined)[],
  hypothesizedMean: number,
  knownStandardDeviation: number,
  alpha = 0.05,
): OneSampleZResult {
  if (!Number.isFinite(hypothesizedMean)) {
    throw new Error('Det hypotetiska medelvärdet måste vara ett ändligt tal.')
  }
  if (!Number.isFinite(knownStandardDeviation) || knownStandardDeviation <= 0) {
    throw new Error('Känd populationsstandardavvikelse måste vara större än 0.')
  }
  if (!Number.isFinite(alpha) || alpha <= 0 || alpha >= 1) {
    throw new Error('Alfa måste vara större än 0 och mindre än 1.')
  }

  const observations = values.filter((value) => value !== null && value !== undefined)
  if (observations.some((value) => !Number.isFinite(value))) {
    throw new Error('Kolumnen innehåller värden som inte är ändliga tal.')
  }
  const summary = describe(observations)
  const standardError = knownStandardDeviation / Math.sqrt(summary.count)
  const statistic = (summary.mean - hypothesizedMean) / standardError
  const pValue = Math.min(1, 2 * (1 - jStat.normal.cdf(Math.abs(statistic), 0, 1)))
  const criticalValue = jStat.normal.inv(1 - alpha / 2, 0, 1)
  const margin = criticalValue * standardError

  return {
    count: summary.count,
    mean: summary.mean,
    hypothesizedMean,
    knownStandardDeviation,
    standardError,
    statistic,
    pValue,
    alpha,
    confidenceInterval: [summary.mean - margin, summary.mean + margin],
  }
}
