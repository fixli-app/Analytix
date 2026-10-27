import jStat from 'jstat'

export interface TwoSampleZResult {
  count1: number
  count2: number
  mean1: number
  mean2: number
  knownStandardDeviation1: number
  knownStandardDeviation2: number
  hypothesizedDifference: number
  difference: number
  standardError: number
  statistic: number
  pValue: number
  alpha: number
  confidenceInterval: [number, number]
}

export function twoSampleZ(
  firstValues: readonly (number | null | undefined)[],
  secondValues: readonly (number | null | undefined)[],
  knownStandardDeviation1: number,
  knownStandardDeviation2: number,
  hypothesizedDifference = 0,
  alpha = 0.05,
): TwoSampleZResult {
  if (
    !Number.isFinite(knownStandardDeviation1) ||
    knownStandardDeviation1 <= 0 ||
    !Number.isFinite(knownStandardDeviation2) ||
    knownStandardDeviation2 <= 0
  ) {
    throw new Error('Båda kända populationsstandardavvikelserna måste vara större än 0.')
  }
  if (!Number.isFinite(hypothesizedDifference)) {
    throw new Error('Den hypotetiska skillnaden måste vara ett ändligt tal.')
  }
  if (!Number.isFinite(alpha) || alpha <= 0 || alpha >= 1) {
    throw new Error('Alfa måste vara större än 0 och mindre än 1.')
  }

  const first = completeCases(firstValues)
  const second = completeCases(secondValues)
  if (first.length === 0 || second.length === 0) {
    throw new Error('Minst en observation krävs i varje grupp.')
  }

  const mean1 = first.reduce((sum, value) => sum + value, 0) / first.length
  const mean2 = second.reduce((sum, value) => sum + value, 0) / second.length
  const difference = mean1 - mean2
  const standardError = Math.sqrt(
    knownStandardDeviation1 ** 2 / first.length + knownStandardDeviation2 ** 2 / second.length,
  )
  const statistic = (difference - hypothesizedDifference) / standardError
  const pValue = Math.min(1, 2 * (1 - jStat.normal.cdf(Math.abs(statistic), 0, 1)))
  const criticalValue = jStat.normal.inv(1 - alpha / 2, 0, 1)
  const margin = criticalValue * standardError

  return {
    count1: first.length,
    count2: second.length,
    mean1,
    mean2,
    knownStandardDeviation1,
    knownStandardDeviation2,
    hypothesizedDifference,
    difference,
    standardError,
    statistic,
    pValue,
    alpha,
    confidenceInterval: [difference - margin, difference + margin],
  }
}

function completeCases(values: readonly (number | null | undefined)[]): number[] {
  const observations = values.filter((value) => value !== null && value !== undefined)
  if (observations.some((value) => !Number.isFinite(value))) {
    throw new Error('Grupperna innehåller värden som inte är ändliga tal.')
  }
  return observations
}
