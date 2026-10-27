import jStat from 'jstat'
import { wilsonScoreInterval } from './oneProportion'

export interface TwoProportionsResult {
  count1: number
  count2: number
  successes1: number
  successes2: number
  proportion1: number
  proportion2: number
  difference: number
  pooledProportion: number
  standardError: number
  statistic: number
  pValue: number
  alpha: number
  confidenceInterval: [number, number]
  expectedSuccesses1: number
  expectedFailures1: number
  expectedSuccesses2: number
  expectedFailures2: number
}

export function twoProportions(
  firstValues: readonly (number | null | undefined)[],
  secondValues: readonly (number | null | undefined)[],
  alpha = 0.05,
): TwoProportionsResult {
  if (!Number.isFinite(alpha) || alpha <= 0 || alpha >= 1) {
    throw new Error('Alfa måste vara större än 0 och mindre än 1.')
  }

  const first = completeCases(firstValues)
  const second = completeCases(secondValues)
  if (first.length === 0 || second.length === 0) {
    throw new Error('Minst en observation krävs i varje grupp.')
  }

  const successes1 = first.reduce((total, value) => total + value, 0)
  const successes2 = second.reduce((total, value) => total + value, 0)
  const count1 = first.length
  const count2 = second.length
  const proportion1 = successes1 / count1
  const proportion2 = successes2 / count2
  const pooledProportion = (successes1 + successes2) / (count1 + count2)
  const standardError = Math.sqrt(
    pooledProportion * (1 - pooledProportion) * (1 / count1 + 1 / count2),
  )
  if (standardError === 0) {
    throw new Error('Det poolade utfallet har ingen variation under H₀.')
  }

  const difference = proportion1 - proportion2
  const statistic = difference / standardError
  const pValue = Math.min(1, 2 * (1 - jStat.normal.cdf(Math.abs(statistic), 0, 1)))
  const criticalValue = jStat.normal.inv(1 - alpha / 2, 0, 1)
  const interval1 = wilsonScoreInterval(successes1, count1, criticalValue)
  const interval2 = wilsonScoreInterval(successes2, count2, criticalValue)
  const confidenceInterval: [number, number] = [
    difference - Math.sqrt((proportion1 - interval1[0]) ** 2 + (interval2[1] - proportion2) ** 2),
    difference + Math.sqrt((interval1[1] - proportion1) ** 2 + (proportion2 - interval2[0]) ** 2),
  ]

  return {
    count1,
    count2,
    successes1,
    successes2,
    proportion1,
    proportion2,
    difference,
    pooledProportion,
    standardError,
    statistic,
    pValue,
    alpha,
    confidenceInterval,
    expectedSuccesses1: count1 * pooledProportion,
    expectedFailures1: count1 * (1 - pooledProportion),
    expectedSuccesses2: count2 * pooledProportion,
    expectedFailures2: count2 * (1 - pooledProportion),
  }
}

function completeCases(values: readonly (number | null | undefined)[]): number[] {
  const observations = values.filter((value) => value !== null && value !== undefined)
  if (observations.some((value) => !Number.isFinite(value) || (value !== 0 && value !== 1))) {
    throw new Error('Grupperna måste bara innehålla värdena 0 och 1.')
  }
  return observations
}
