import jStat from 'jstat'
import { describe } from './descriptive'

export interface VarianceComparisonResult {
  count1: number
  count2: number
  variance1: number
  variance2: number
  fStatistic: number
  fDegreesOfFreedom: [number, number]
  fPValue: number
  bartlettStatistic: number
  bartlettPValue: number
  leveneStatistic: number
  levenePValue: number
  alpha: number
}

export function compareVariances(
  firstValues: readonly (number | null | undefined)[],
  secondValues: readonly (number | null | undefined)[],
  alpha = 0.05,
): VarianceComparisonResult {
  if (!Number.isFinite(alpha) || alpha <= 0 || alpha >= 1) {
    throw new Error('Alfa måste vara större än 0 och mindre än 1.')
  }
  const first = completeCases(firstValues)
  const second = completeCases(secondValues)
  if (first.length < 2 || second.length < 2) {
    throw new Error('Minst två observationer krävs i varje grupp.')
  }

  const summary1 = describe(first)
  const summary2 = describe(second)
  if (summary1.variance === 0 || summary2.variance === 0) {
    throw new Error('Båda grupperna måste variera för variansjämförelserna.')
  }

  const df1 = summary1.count - 1
  const df2 = summary2.count - 1
  const fStatistic = summary1.variance / summary2.variance
  const fCdf = jStat.centralF.cdf(fStatistic, df1, df2)
  const fPValue = Math.min(1, 2 * Math.min(fCdf, 1 - fCdf))

  const totalCount = summary1.count + summary2.count
  const pooledVariance = (df1 * summary1.variance + df2 * summary2.variance) / (totalCount - 2)
  const correction = 1 + (1 / (3 * (2 - 1))) * (1 / df1 + 1 / df2 - 1 / (totalCount - 2))
  const bartlettStatistic = Math.max(
    0,
    ((totalCount - 2) * Math.log(pooledVariance) -
      df1 * Math.log(summary1.variance) -
      df2 * Math.log(summary2.variance)) /
      correction,
  )
  const bartlettPValue = 1 - jStat.chisquare.cdf(bartlettStatistic, 1)

  const deviations1 = absoluteDeviationsFromMedian(first)
  const deviations2 = absoluteDeviationsFromMedian(second)
  const meanDeviation1 = mean(deviations1)
  const meanDeviation2 = mean(deviations2)
  const grandMean =
    (deviations1.reduce((sum, value) => sum + value, 0) +
      deviations2.reduce((sum, value) => sum + value, 0)) /
    totalCount
  const between =
    summary1.count * (meanDeviation1 - grandMean) ** 2 +
    summary2.count * (meanDeviation2 - grandMean) ** 2
  const within =
    deviations1.reduce((sum, value) => sum + (value - meanDeviation1) ** 2, 0) +
    deviations2.reduce((sum, value) => sum + (value - meanDeviation2) ** 2, 0)
  const leveneStatistic =
    within === 0
      ? between === 0
        ? 0
        : Number.POSITIVE_INFINITY
      : between / (within / (totalCount - 2))
  const levenePValue =
    leveneStatistic === Number.POSITIVE_INFINITY
      ? 0
      : 1 - jStat.centralF.cdf(leveneStatistic, 1, totalCount - 2)

  return {
    count1: summary1.count,
    count2: summary2.count,
    variance1: summary1.variance,
    variance2: summary2.variance,
    fStatistic,
    fDegreesOfFreedom: [df1, df2],
    fPValue,
    bartlettStatistic,
    bartlettPValue,
    leveneStatistic,
    levenePValue,
    alpha,
  }
}

function completeCases(values: readonly (number | null | undefined)[]): number[] {
  const observations = values.filter((value) => value !== null && value !== undefined)
  if (observations.some((value) => !Number.isFinite(value))) {
    throw new Error('Grupperna innehåller värden som inte är ändliga tal.')
  }
  return observations
}

function absoluteDeviationsFromMedian(values: readonly number[]): number[] {
  const ordered = [...values].sort((left, right) => left - right)
  const middle = Math.floor(ordered.length / 2)
  const median =
    ordered.length % 2 === 0
      ? ordered[middle - 1] + (ordered[middle] - ordered[middle - 1]) / 2
      : ordered[middle]
  return values.map((value) => Math.abs(value - median))
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}
