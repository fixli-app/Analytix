import jStat from 'jstat'

export interface ProcessCapabilityResult {
  count: number
  mean: number
  withinStandardDeviation: number
  overallStandardDeviation: number
  cp: number
  cpk: number
  pp: number
  ppk: number
  cpm: number | null
  target: number | null
  observedPpm: number
  expectedOverallPpm: number
  zBenchWithin: number
  outOfSpecCount: number
  lowerSpecLimit: number
  upperSpecLimit: number
}

const movingRangeD2 = 1.128

export function normalProcessCapability(
  values: readonly (number | null | undefined)[],
  lowerSpecLimit: number,
  upperSpecLimit: number,
  target: number | null = null,
): ProcessCapabilityResult {
  if (!Number.isFinite(lowerSpecLimit) || !Number.isFinite(upperSpecLimit)) {
    throw new Error('Specifikationsgränserna måste vara ändliga tal.')
  }
  if (lowerSpecLimit >= upperSpecLimit) {
    throw new Error('Nedre specifikationsgränsen måste vara lägre än den övre.')
  }
  if (target !== null && !Number.isFinite(target)) {
    throw new Error('Målvärdet måste vara ett ändligt tal.')
  }

  const observations = values.filter((value) => value !== null && value !== undefined)
  if (observations.some((value) => !Number.isFinite(value))) {
    throw new Error('Kolumnen innehåller värden som inte är ändliga tal.')
  }
  if (observations.length < 2) {
    throw new Error('Minst två numeriska observationer krävs för kapabilitetsanalysen.')
  }

  let mean = 0
  let sumSquaredDifferences = 0
  let movingRangeSum = 0
  let outOfSpecCount = 0
  observations.forEach((value, index) => {
    const delta = value - mean
    mean += delta / (index + 1)
    sumSquaredDifferences += delta * (value - mean)
    if (value < lowerSpecLimit || value > upperSpecLimit) outOfSpecCount += 1
    if (index > 0) movingRangeSum += Math.abs(value - observations[index - 1])
  })

  const overallStandardDeviation = Math.sqrt(sumSquaredDifferences / (observations.length - 1))
  const withinStandardDeviation = movingRangeSum / (observations.length - 1) / movingRangeD2
  if (overallStandardDeviation === 0 || withinStandardDeviation === 0) {
    throw new Error('Kapabilitet kan inte beräknas för en process utan observerad variation.')
  }

  const specificationWidth = upperSpecLimit - lowerSpecLimit
  const distanceToNearestLimit = Math.min(upperSpecLimit - mean, mean - lowerSpecLimit)
  const expectedOverallPpm =
    (jStat.normal.cdf(lowerSpecLimit, mean, overallStandardDeviation) +
      1 -
      jStat.normal.cdf(upperSpecLimit, mean, overallStandardDeviation)) *
    1_000_000

  return {
    count: observations.length,
    mean,
    withinStandardDeviation,
    overallStandardDeviation,
    cp: specificationWidth / (6 * withinStandardDeviation),
    cpk: distanceToNearestLimit / (3 * withinStandardDeviation),
    pp: specificationWidth / (6 * overallStandardDeviation),
    ppk: distanceToNearestLimit / (3 * overallStandardDeviation),
    cpm:
      target === null
        ? null
        : specificationWidth /
          (6 * Math.sqrt(overallStandardDeviation ** 2 + (mean - target) ** 2)),
    target,
    observedPpm: (outOfSpecCount / observations.length) * 1_000_000,
    expectedOverallPpm,
    zBenchWithin: distanceToNearestLimit / withinStandardDeviation,
    outOfSpecCount,
    lowerSpecLimit,
    upperSpecLimit,
  }
}
