import jStat from 'jstat'

export interface AnovaGroupSummary {
  group: string
  count: number
  mean: number
  standardDeviation: number
}

export interface TukeyPairwiseResult {
  group1: string
  group2: string
  meanDifference: number
  standardError: number
  qStatistic: number
  adjustedPValue: number
  confidenceInterval: [number, number]
}

export interface OneWayAnovaResult {
  count: number
  groupCount: number
  groups: AnovaGroupSummary[]
  betweenGroupSumSquares: number
  withinGroupSumSquares: number
  totalSumSquares: number
  betweenGroupDegreesOfFreedom: number
  withinGroupDegreesOfFreedom: number
  betweenGroupMeanSquare: number
  withinGroupMeanSquare: number
  fStatistic: number
  pValue: number
  etaSquared: number
  omegaSquared: number
  alpha: number
  pairwise: TukeyPairwiseResult[]
}

interface GroupValues {
  group: string
  values: number[]
}

function simpsonIntegral(
  fn: (value: number) => number,
  lower: number,
  upper: number,
  intervals: number,
): number {
  const step = (upper - lower) / intervals
  let total = fn(lower) + fn(upper)
  for (let index = 1; index < intervals; index++) {
    total += (index % 2 === 0 ? 2 : 4) * fn(lower + index * step)
  }
  return (total * step) / 3
}

function logGamma(value: number): number {
  const coefficients = [
    676.5203681218851, -1259.1392167224028, 771.3234287776531, -176.6150291621406,
    12.507343278686905, -0.13857109526572012, 9.984369578019572e-6, 1.5056327351493116e-7,
  ]
  const shifted = value - 1
  let sum = 0.9999999999998099
  for (let index = 0; index < coefficients.length; index++) {
    sum += coefficients[index] / (shifted + index + 1)
  }
  const scale = shifted + coefficients.length - 0.5
  return 0.9189385332046727 + (shifted + 0.5) * Math.log(scale) - scale + Math.log(sum)
}

function normalRangeCdf(range: number, groupCount: number): number {
  if (range <= 0) return 0
  const density = (value: number) => Math.exp(-0.5 * value * value) / Math.sqrt(2 * Math.PI)
  const integrand = (minimum: number) =>
    groupCount *
    density(minimum) *
    Math.max(0, jStat.normal.cdf(minimum + range, 0, 1) - jStat.normal.cdf(minimum, 0, 1)) **
      (groupCount - 1)
  return Math.min(1, Math.max(0, simpsonIntegral(integrand, -8, 8, 128)))
}

export function studentizedRangeCdf(
  q: number,
  groupCount: number,
  degreesOfFreedom: number,
): number {
  if (q <= 0) return 0
  if (groupCount === 2) {
    return Math.max(0, Math.min(1, 2 * jStat.studentt.cdf(q / Math.SQRT2, degreesOfFreedom) - 1))
  }
  if (degreesOfFreedom > 20_000) return normalRangeCdf(q, groupCount)
  const standardDeviation = Math.sqrt(2 * degreesOfFreedom)
  const lower = Math.max(-8, -degreesOfFreedom / standardDeviation)
  const integrand = (standardizedVariance: number) => {
    const variance = degreesOfFreedom + standardDeviation * standardizedVariance
    if (variance <= 0) return 0
    const shape = degreesOfFreedom / 2
    const chiSquareDensity =
      variance === 0
        ? shape === 1
          ? 0.5
          : 0
        : Math.exp(
            (shape - 1) * Math.log(variance) - variance / 2 - shape * Math.log(2) - logGamma(shape),
          )
    const range = q * Math.sqrt(variance / degreesOfFreedom)
    return normalRangeCdf(range, groupCount) * chiSquareDensity * standardDeviation
  }
  return Math.min(1, Math.max(0, simpsonIntegral(integrand, lower, 8, 128)))
}

function studentizedRangeQuantile(
  probability: number,
  groupCount: number,
  degreesOfFreedom: number,
): number {
  if (groupCount === 2) {
    return Math.SQRT2 * jStat.studentt.inv((1 + probability) / 2, degreesOfFreedom)
  }
  let lower = 0
  let upper = 16
  while (studentizedRangeCdf(upper, groupCount, degreesOfFreedom) < probability && upper < 128) {
    upper *= 2
  }
  for (let iteration = 0; iteration < 32; iteration++) {
    const midpoint = (lower + upper) / 2
    if (studentizedRangeCdf(midpoint, groupCount, degreesOfFreedom) < probability) lower = midpoint
    else upper = midpoint
  }
  return (lower + upper) / 2
}

export function oneWayAnova(
  values: readonly (number | null | undefined)[],
  groupLabels: readonly (string | null | undefined)[],
  alpha = 0.05,
): OneWayAnovaResult {
  if (!Number.isFinite(alpha) || alpha <= 0 || alpha >= 1) {
    throw new Error('Alpha must be greater than 0 and less than 1.')
  }
  if (values.length !== groupLabels.length) {
    throw new Error('Measurement and group columns must have the same number of rows.')
  }

  const grouped = new Map<string, number[]>()
  for (let index = 0; index < values.length; index++) {
    const value = values[index]
    const label = groupLabels[index]?.trim() ?? ''
    if (value === null || value === undefined || label === '') continue
    if (!Number.isFinite(value)) throw new Error(`Measurement on row ${index + 1} is not finite.`)
    const group = grouped.get(label) ?? []
    group.push(value)
    grouped.set(label, group)
  }

  const groups: GroupValues[] = [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right, 'sv'))
    .map(([group, groupValues]) => ({ group, values: groupValues }))
  if (groups.length < 2) throw new Error('One-way ANOVA requires at least two groups.')
  if (groups.some((group) => group.values.length < 2)) {
    throw new Error('Every group must contain at least two complete observations.')
  }

  const count = groups.reduce((total, group) => total + group.values.length, 0)
  const grandMean =
    groups.reduce(
      (total, group) => total + group.values.reduce((sum, value) => sum + value, 0),
      0,
    ) / count
  const groupMeans = groups.map(
    (group) => group.values.reduce((sum, value) => sum + value, 0) / group.values.length,
  )
  const withinGroupSumSquares = groups.reduce(
    (total, group, groupIndex) =>
      total + group.values.reduce((sum, value) => sum + (value - groupMeans[groupIndex]) ** 2, 0),
    0,
  )
  if (withinGroupSumSquares <= 0) {
    throw new Error('Within-group variation must be greater than zero for ANOVA.')
  }
  const betweenGroupSumSquares = groups.reduce(
    (total, group, index) => total + group.values.length * (groupMeans[index] - grandMean) ** 2,
    0,
  )
  const totalSumSquares = withinGroupSumSquares + betweenGroupSumSquares
  const betweenGroupDegreesOfFreedom = groups.length - 1
  const withinGroupDegreesOfFreedom = count - groups.length
  const betweenGroupMeanSquare = betweenGroupSumSquares / betweenGroupDegreesOfFreedom
  const withinGroupMeanSquare = withinGroupSumSquares / withinGroupDegreesOfFreedom
  const fStatistic = betweenGroupMeanSquare / withinGroupMeanSquare
  const etaSquared = betweenGroupSumSquares / totalSumSquares
  const omegaSquared = Math.max(
    0,
    (betweenGroupSumSquares - betweenGroupDegreesOfFreedom * withinGroupMeanSquare) /
      (totalSumSquares + withinGroupMeanSquare),
  )
  const criticalRange = studentizedRangeQuantile(
    1 - alpha,
    groups.length,
    withinGroupDegreesOfFreedom,
  )
  const pairwise: TukeyPairwiseResult[] = []

  for (let first = 0; first < groups.length; first++) {
    for (let second = first + 1; second < groups.length; second++) {
      const firstGroup = groups[first]
      const secondGroup = groups[second]
      const meanDifference = groupMeans[first] - groupMeans[second]
      const standardError = Math.sqrt(
        (withinGroupMeanSquare / 2) *
          (1 / firstGroup.values.length + 1 / secondGroup.values.length),
      )
      const qStatistic = Math.abs(meanDifference) / standardError
      const adjustedPValue = Math.min(
        1,
        Math.max(
          0,
          1 - studentizedRangeCdf(qStatistic, groups.length, withinGroupDegreesOfFreedom),
        ),
      )
      const halfWidth = criticalRange * standardError
      pairwise.push({
        group1: firstGroup.group,
        group2: secondGroup.group,
        meanDifference,
        standardError,
        qStatistic,
        adjustedPValue,
        confidenceInterval: [meanDifference - halfWidth, meanDifference + halfWidth],
      })
    }
  }

  return {
    count,
    groupCount: groups.length,
    groups: groups.map((group, index) => {
      const variance =
        group.values.reduce((sum, value) => sum + (value - groupMeans[index]) ** 2, 0) /
        (group.values.length - 1)
      return {
        group: group.group,
        count: group.values.length,
        mean: groupMeans[index],
        standardDeviation: Math.sqrt(variance),
      }
    }),
    betweenGroupSumSquares,
    withinGroupSumSquares,
    totalSumSquares,
    betweenGroupDegreesOfFreedom,
    withinGroupDegreesOfFreedom,
    betweenGroupMeanSquare,
    withinGroupMeanSquare,
    fStatistic,
    pValue: Math.max(
      0,
      1 - jStat.centralF.cdf(fStatistic, betweenGroupDegreesOfFreedom, withinGroupDegreesOfFreedom),
    ),
    etaSquared,
    omegaSquared,
    alpha,
    pairwise,
  }
}
