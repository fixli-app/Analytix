import jStat from 'jstat'

export interface OneProportionResult {
  count: number
  successes: number
  observedProportion: number
  hypothesizedProportion: number
  standardError: number
  statistic: number
  pValue: number
  alpha: number
  confidenceInterval: [number, number]
  expectedSuccesses: number
  expectedFailures: number
}

export function oneProportion(
  values: readonly (number | null | undefined)[],
  hypothesizedProportion: number,
  alpha = 0.05,
): OneProportionResult {
  if (
    !Number.isFinite(hypothesizedProportion) ||
    hypothesizedProportion <= 0 ||
    hypothesizedProportion >= 1
  ) {
    throw new Error('Den hypotetiska andelen måste vara större än 0 och mindre än 1.')
  }
  if (!Number.isFinite(alpha) || alpha <= 0 || alpha >= 1) {
    throw new Error('Alfa måste vara större än 0 och mindre än 1.')
  }

  const observations = values.filter((value) => value !== null && value !== undefined)
  if (observations.some((value) => !Number.isFinite(value) || (value !== 0 && value !== 1))) {
    throw new Error('Kolumnen måste bara innehålla värdena 0 och 1.')
  }
  if (observations.length < 2) {
    throw new Error('Minst två binära observationer krävs.')
  }

  const successes = observations.reduce((total, value) => total + value, 0)
  const count = observations.length
  const observedProportion = successes / count
  const standardError = Math.sqrt((hypothesizedProportion * (1 - hypothesizedProportion)) / count)
  const statistic = (observedProportion - hypothesizedProportion) / standardError
  const pValue = Math.min(1, 2 * (1 - jStat.normal.cdf(Math.abs(statistic), 0, 1)))
  const criticalValue = jStat.normal.inv(1 - alpha / 2, 0, 1)

  return {
    count,
    successes,
    observedProportion,
    hypothesizedProportion,
    standardError,
    statistic,
    pValue,
    alpha,
    confidenceInterval: wilsonInterval(successes, count, criticalValue),
    expectedSuccesses: count * hypothesizedProportion,
    expectedFailures: count * (1 - hypothesizedProportion),
  }
}

function wilsonInterval(successes: number, count: number, criticalValue: number): [number, number] {
  const proportion = successes / count
  const criticalSquared = criticalValue ** 2
  const denominator = 1 + criticalSquared / count
  const center = (proportion + criticalSquared / (2 * count)) / denominator
  const margin =
    (criticalValue *
      Math.sqrt((proportion * (1 - proportion)) / count + criticalSquared / (4 * count ** 2))) /
    denominator
  return [Math.max(0, center - margin), Math.min(1, center + margin)]
}
