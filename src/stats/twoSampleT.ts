import jStat from 'jstat'
import { describe } from './descriptive'

export interface TwoSampleTResult {
  count1: number
  count2: number
  mean1: number
  mean2: number
  standardDeviation1: number
  standardDeviation2: number
  hypothesizedDifference: number
  difference: number
  standardError: number
  statistic: number
  degreesOfFreedom: number
  pValue: number
  alpha: number
  confidenceInterval: [number, number]
}

export function twoSampleT(
  firstValues: readonly (number | null | undefined)[],
  secondValues: readonly (number | null | undefined)[],
  hypothesizedDifference = 0,
  alpha = 0.05,
): TwoSampleTResult {
  if (!Number.isFinite(hypothesizedDifference)) {
    throw new Error('Den hypotetiska skillnaden måste vara ett ändligt tal.')
  }
  if (!Number.isFinite(alpha) || alpha <= 0 || alpha >= 1) {
    throw new Error('Alfa måste vara större än 0 och mindre än 1.')
  }

  const first = completeCase(firstValues)
  const second = completeCase(secondValues)
  if (first.length < 2 || second.length < 2) {
    throw new Error('Minst två observationer krävs i varje grupp.')
  }

  const summary1 = describe(first)
  const summary2 = describe(second)
  const varianceTerm1 = summary1.standardDeviation ** 2 / summary1.count
  const varianceTerm2 = summary2.standardDeviation ** 2 / summary2.count
  const standardError = Math.sqrt(varianceTerm1 + varianceTerm2)
  if (standardError === 0) {
    throw new Error('Båda grupperna är konstanta; t-testet kan inte beräknas.')
  }

  const degreesOfFreedom =
    (varianceTerm1 + varianceTerm2) ** 2 /
    (varianceTerm1 ** 2 / (summary1.count - 1) + varianceTerm2 ** 2 / (summary2.count - 1))
  const difference = summary1.mean - summary2.mean
  const statistic = (difference - hypothesizedDifference) / standardError
  const pValue = Math.min(1, 2 * (1 - jStat.studentt.cdf(Math.abs(statistic), degreesOfFreedom)))
  const criticalValue = jStat.studentt.inv(1 - alpha / 2, degreesOfFreedom)
  const margin = criticalValue * standardError

  return {
    count1: summary1.count,
    count2: summary2.count,
    mean1: summary1.mean,
    mean2: summary2.mean,
    standardDeviation1: summary1.standardDeviation,
    standardDeviation2: summary2.standardDeviation,
    hypothesizedDifference,
    difference,
    standardError,
    statistic,
    degreesOfFreedom,
    pValue,
    alpha,
    confidenceInterval: [difference - margin, difference + margin],
  }
}

function completeCase(values: readonly (number | null | undefined)[]): number[] {
  const observations = values.filter((value) => value !== null && value !== undefined)
  if (observations.some((value) => !Number.isFinite(value))) {
    throw new Error('Grupperna innehåller värden som inte är ändliga tal.')
  }
  return observations
}
