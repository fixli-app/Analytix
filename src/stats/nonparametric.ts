import jStat from 'jstat'

export interface MannWhitneyResult {
  count1: number
  count2: number
  uStatistic: number
  zStatistic: number
  pValue: number
  rankBiserialCorrelation: number
  alpha: number
}

export interface KruskalWallisGroup {
  group: string
  count: number
  median: number
  meanRank: number
}

export interface KruskalWallisResult {
  count: number
  groupCount: number
  groups: KruskalWallisGroup[]
  statistic: number
  degreesOfFreedom: number
  pValue: number
  tieCorrection: number
  alpha: number
}

export interface SignTestResult {
  hypothesizedMedian: number
  positive: number
  negative: number
  ties: number
  effectiveCount: number
  pValue: number
  alpha: number
}

export interface RunsTestResult {
  median: number
  below: number
  above: number
  ties: number
  runs: number
  expectedRuns: number
  zStatistic: number
  pValue: number
  alpha: number
}

export interface WilcoxonSignedRankResult {
  hypothesizedMedian: number
  count: number
  zeroDifferences: number
  positiveRankSum: number
  statistic: number
  zStatistic: number
  pValue: number
  hodgesLehmannEstimate: number
  alpha: number
}

export interface MoodMedianGroup {
  group: string
  below: number
  above: number
  ties: number
}

export interface MoodMedianResult {
  count: number
  median: number
  groups: MoodMedianGroup[]
  statistic: number
  degreesOfFreedom: number
  pValue: number
  tiesExcluded: number
  alpha: number
}

export interface FriedmanTreatment {
  treatment: string
  meanRank: number
}

export interface FriedmanResult {
  blocks: number
  treatmentCount: number
  treatments: FriedmanTreatment[]
  statistic: number
  degreesOfFreedom: number
  pValue: number
  tieCorrection: number
  alpha: number
}

function validateAlpha(alpha: number): void {
  if (!Number.isFinite(alpha) || alpha <= 0 || alpha >= 1) {
    throw new Error('Alpha must be greater than 0 and less than 1.')
  }
}

function completeNumeric(values: readonly (number | null | undefined)[]): number[] {
  const complete = values.filter((value) => value !== null && value !== undefined)
  if (complete.some((value) => !Number.isFinite(value))) {
    throw new Error('Observations must be finite numbers.')
  }
  return complete as number[]
}

function median(values: readonly number[]): number {
  const ordered = [...values].sort((left, right) => left - right)
  const middle = Math.floor(ordered.length / 2)
  return ordered.length % 2 === 0
    ? ordered[middle - 1] + (ordered[middle] - ordered[middle - 1]) / 2
    : ordered[middle]
}

function twoSidedNormalP(z: number): number {
  return Math.min(1, 2 * (1 - jStat.normal.cdf(Math.abs(z), 0, 1)))
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

function exactTwoSidedSignP(positive: number, negative: number): number {
  const count = positive + negative
  const tail = Math.min(positive, negative)
  let probability = Math.exp(
    logGamma(count + 1) - logGamma(tail + 1) - logGamma(count - tail + 1) - count * Math.log(2),
  )
  let cumulative = probability
  for (let successes = tail; successes > 0; successes--) {
    probability *= successes / (count - successes + 1)
    cumulative += probability
  }
  return Math.min(1, 2 * cumulative)
}

function averageRanks(values: readonly number[]): number[] {
  const order = values
    .map((value, index) => ({ value, index }))
    .sort((left, right) => left.value - right.value || left.index - right.index)
  const ranks = values.map(() => 0)
  for (let start = 0; start < order.length;) {
    let end = start + 1
    while (end < order.length && order[end].value === order[start].value) end++
    const average = (start + 1 + end) / 2
    for (let index = start; index < end; index++) ranks[order[index].index] = average
    start = end
  }
  return ranks
}

function tieCorrection(values: readonly number[]): number {
  const counts = new Map<number, number>()
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1))
  const count = values.length
  const tieTerm = [...counts.values()].reduce((sum, size) => sum + size ** 3 - size, 0)
  return 1 - tieTerm / (count ** 3 - count)
}

export function mannWhitney(
  firstValues: readonly (number | null | undefined)[],
  secondValues: readonly (number | null | undefined)[],
  alpha = 0.05,
): MannWhitneyResult {
  validateAlpha(alpha)
  const first = completeNumeric(firstValues)
  const second = completeNumeric(secondValues)
  if (first.length === 0 || second.length === 0) {
    throw new Error('Mann-Whitney requires at least one complete observation per group.')
  }
  const pooled = [...first, ...second]
  const ranks = averageRanks(pooled)
  const firstRankSum = ranks.slice(0, first.length).reduce((sum, value) => sum + value, 0)
  const u1 = firstRankSum - (first.length * (first.length + 1)) / 2
  const totalPairs = first.length * second.length
  const uStatistic = Math.min(u1, totalPairs - u1)
  const count = pooled.length
  const tieTerm = [...new Set(pooled)].reduce((sum, value) => {
    const size = pooled.filter((item) => item === value).length
    return sum + size ** 3 - size
  }, 0)
  const variance =
    (first.length * second.length * (count + 1 - tieTerm / (count * (count - 1)))) / 12
  if (variance <= 0) throw new Error('Mann-Whitney requires at least two distinct pooled values.')
  const meanU = totalPairs / 2
  const distance = Math.max(0, Math.abs(u1 - meanU) - 0.5)
  const zStatistic = Math.sign(u1 - meanU) * (distance / Math.sqrt(variance))
  return {
    count1: first.length,
    count2: second.length,
    uStatistic,
    zStatistic,
    pValue: twoSidedNormalP(zStatistic),
    rankBiserialCorrelation: (2 * u1) / totalPairs - 1,
    alpha,
  }
}

export function kruskalWallis(
  values: readonly (number | null | undefined)[],
  groups: readonly (string | null | undefined)[],
  alpha = 0.05,
): KruskalWallisResult {
  validateAlpha(alpha)
  if (values.length !== groups.length) {
    throw new Error('Measurement and group columns must have the same number of rows.')
  }
  const observations: { value: number; group: string }[] = []
  for (let index = 0; index < values.length; index++) {
    const value = values[index]
    const group = groups[index]?.trim() ?? ''
    if (value === null || value === undefined || group === '') continue
    if (!Number.isFinite(value)) throw new Error(`Observation on row ${index + 1} is not finite.`)
    observations.push({ value, group })
  }
  const groupNames = [...new Set(observations.map((item) => item.group))].sort((a, b) =>
    a.localeCompare(b, 'sv'),
  )
  if (groupNames.length < 2) throw new Error('Kruskal-Wallis requires at least two groups.')
  if (observations.length <= groupNames.length) {
    throw new Error('Kruskal-Wallis requires more observations than groups.')
  }

  const valuesOnly = observations.map((item) => item.value)
  const ranks = averageRanks(valuesOnly)
  const groupStats = groupNames.map((group) => {
    const indexes = observations.flatMap((item, index) => (item.group === group ? [index] : []))
    const groupValues = indexes.map((index) => observations[index].value)
    const rankSum = indexes.reduce((sum, index) => sum + ranks[index], 0)
    return {
      group,
      count: groupValues.length,
      median: median(groupValues),
      rankSum,
      meanRank: rankSum / groupValues.length,
    }
  })
  const count = observations.length
  const rawStatistic =
    (12 / (count * (count + 1))) *
      groupStats.reduce((sum, group) => sum + group.rankSum ** 2 / group.count, 0) -
    3 * (count + 1)
  const correction = tieCorrection(valuesOnly)
  if (correction <= 0) throw new Error('Kruskal-Wallis requires at least two distinct values.')
  const statistic = Math.max(0, rawStatistic / correction)
  const degreesOfFreedom = groupNames.length - 1
  return {
    count,
    groupCount: groupNames.length,
    groups: groupStats.map(({ group, count: groupCount, median: groupMedian, meanRank }) => ({
      group,
      count: groupCount,
      median: groupMedian,
      meanRank,
    })),
    statistic,
    degreesOfFreedom,
    pValue: Math.max(0, 1 - jStat.chisquare.cdf(statistic, degreesOfFreedom)),
    tieCorrection: correction,
    alpha,
  }
}

export function signTest(
  values: readonly (number | null | undefined)[],
  hypothesizedMedian: number,
  alpha = 0.05,
): SignTestResult {
  validateAlpha(alpha)
  if (!Number.isFinite(hypothesizedMedian)) throw new Error('Hypothesized median must be finite.')
  const observations = completeNumeric(values)
  const positive = observations.filter((value) => value > hypothesizedMedian).length
  const negative = observations.filter((value) => value < hypothesizedMedian).length
  const ties = observations.length - positive - negative
  const effectiveCount = positive + negative
  if (effectiveCount === 0) throw new Error('Sign test has no non-tied observations.')
  const pValue = exactTwoSidedSignP(positive, negative)
  return {
    hypothesizedMedian,
    positive,
    negative,
    ties,
    effectiveCount,
    pValue,
    alpha,
  }
}

export function runsTest(
  values: readonly (number | null | undefined)[],
  alpha = 0.05,
): RunsTestResult {
  validateAlpha(alpha)
  const observations = completeNumeric(values)
  if (observations.length < 4)
    throw new Error('Runs test requires at least four complete observations.')
  const center = median(observations)
  const signs = observations.map((value) => (value < center ? -1 : value > center ? 1 : 0))
  const nonTies = signs.filter((sign) => sign !== 0)
  const below = nonTies.filter((sign) => sign < 0).length
  const above = nonTies.length - below
  const ties = signs.length - nonTies.length
  if (below === 0 || above === 0)
    throw new Error('Runs test requires values on both sides of the median.')
  let runs = 1
  for (let index = 1; index < nonTies.length; index++) {
    if (nonTies[index] !== nonTies[index - 1]) runs++
  }
  const effectiveCount = below + above
  const expectedRuns = 1 + (2 * below * above) / effectiveCount
  const variance =
    (2 * below * above * (2 * below * above - below - above)) /
    (effectiveCount ** 2 * (effectiveCount - 1))
  if (variance <= 0) throw new Error('Runs test variance is zero for this sample.')
  const zStatistic =
    Math.sign(runs - expectedRuns) *
    (Math.max(0, Math.abs(runs - expectedRuns) - 0.5) / Math.sqrt(variance))
  return {
    median: center,
    below,
    above,
    ties,
    runs,
    expectedRuns,
    zStatistic,
    pValue: twoSidedNormalP(zStatistic),
    alpha,
  }
}

export function wilcoxonSignedRank(
  values: readonly (number | null | undefined)[],
  hypothesizedMedian = 0,
  alpha = 0.05,
): WilcoxonSignedRankResult {
  validateAlpha(alpha)
  if (!Number.isFinite(hypothesizedMedian)) throw new Error('Hypothesized median must be finite.')
  const observations = completeNumeric(values)
  const differences = observations
    .map((value) => value - hypothesizedMedian)
    .filter((difference) => difference !== 0)
  const zeroDifferences = observations.length - differences.length
  if (differences.length < 2)
    throw new Error('Wilcoxon signed-rank requires at least two nonzero differences.')
  if (differences.length > 2000) {
    throw new Error('Wilcoxon Walsh estimate is limited to 2000 nonzero differences.')
  }

  const absolute = differences.map(Math.abs)
  const ranks = averageRanks(absolute)
  let positiveRankSum = 0
  let tieTerm = 0
  const absoluteCounts = new Map<number, number>()
  differences.forEach((difference, index) => {
    if (difference > 0) positiveRankSum += ranks[index]
    absoluteCounts.set(absolute[index], (absoluteCounts.get(absolute[index]) ?? 0) + 1)
  })
  for (const size of absoluteCounts.values()) tieTerm += size ** 3 - size

  const count = differences.length
  const totalRankSum = (count * (count + 1)) / 2
  const statistic = Math.min(positiveRankSum, totalRankSum - positiveRankSum)
  const mean = totalRankSum / 2
  const variance = (count * (count + 1) * (2 * count + 1)) / 24 - tieTerm / 48
  if (variance <= 0) throw new Error('Wilcoxon signed-rank variance is zero.')
  const signedDistance = positiveRankSum - mean
  const zStatistic =
    Math.sign(signedDistance) * (Math.max(0, Math.abs(signedDistance) - 0.5) / Math.sqrt(variance))
  const walshAverages: number[] = []
  for (let first = 0; first < count; first++) {
    for (let second = first; second < count; second++) {
      walshAverages.push((differences[first] + differences[second]) / 2)
    }
  }

  return {
    hypothesizedMedian,
    count,
    zeroDifferences,
    positiveRankSum,
    statistic,
    zStatistic,
    pValue: twoSidedNormalP(zStatistic),
    hodgesLehmannEstimate: median(walshAverages),
    alpha,
  }
}

export function moodMedian(
  values: readonly (number | null | undefined)[],
  groups: readonly (string | null | undefined)[],
  alpha = 0.05,
): MoodMedianResult {
  validateAlpha(alpha)
  if (values.length !== groups.length) {
    throw new Error('Measurement and group columns must have the same number of rows.')
  }
  const observations: { value: number; group: string }[] = []
  for (let index = 0; index < values.length; index++) {
    const value = values[index]
    const group = groups[index]?.trim() ?? ''
    if (value === null || value === undefined || group === '') continue
    if (!Number.isFinite(value)) throw new Error(`Observation on row ${index + 1} is not finite.`)
    observations.push({ value, group })
  }
  const groupNames = [...new Set(observations.map((item) => item.group))].sort((a, b) =>
    a.localeCompare(b, 'sv'),
  )
  if (groupNames.length < 2) throw new Error('Mood median test requires at least two groups.')
  const center = median(observations.map((item) => item.value))
  const groupsSummary = groupNames.map((group) => {
    const members = observations.filter((item) => item.group === group)
    return {
      group,
      below: members.filter((item) => item.value < center).length,
      above: members.filter((item) => item.value > center).length,
      ties: members.filter((item) => item.value === center).length,
    }
  })
  const belowTotal = groupsSummary.reduce((sum, group) => sum + group.below, 0)
  const aboveTotal = groupsSummary.reduce((sum, group) => sum + group.above, 0)
  const count = belowTotal + aboveTotal
  if (belowTotal === 0 || aboveTotal === 0) {
    throw new Error(
      'Mood median test requires observations both below and above the pooled median.',
    )
  }
  const columnTotals = [belowTotal, aboveTotal]
  const rowTotals = groupsSummary.map((group) => group.below + group.above)
  let statistic = 0
  for (let row = 0; row < groupsSummary.length; row++) {
    const observed = [groupsSummary[row].below, groupsSummary[row].above]
    for (let column = 0; column < 2; column++) {
      const expected = (rowTotals[row] * columnTotals[column]) / count
      statistic += (observed[column] - expected) ** 2 / expected
    }
  }
  const degreesOfFreedom = groupNames.length - 1
  return {
    count,
    median: center,
    groups: groupsSummary,
    statistic,
    degreesOfFreedom,
    pValue: Math.max(0, 1 - jStat.chisquare.cdf(statistic, degreesOfFreedom)),
    tiesExcluded: observations.length - count,
    alpha,
  }
}

export function friedman(
  treatmentValues: readonly (readonly (number | null | undefined)[])[],
  treatmentNames: readonly string[],
  alpha = 0.05,
): FriedmanResult {
  validateAlpha(alpha)
  if (treatmentValues.length !== treatmentNames.length) {
    throw new Error('Each treatment column must have one matching name.')
  }
  if (treatmentValues.length < 3)
    throw new Error('Friedman test requires at least three treatments.')
  const rowCount = treatmentValues[0]?.length ?? 0
  if (treatmentValues.some((values) => values.length !== rowCount)) {
    throw new Error('Treatment columns must have the same number of rows.')
  }
  const blockRanks: number[][] = []
  const completeBlocks: number[][] = []
  for (let row = 0; row < rowCount; row++) {
    const block = treatmentValues.map((column) => column[row])
    if (block.some((value) => value === null || value === undefined)) continue
    if (block.some((value) => !Number.isFinite(value))) {
      throw new Error(`Measurement on row ${row + 1} is not finite.`)
    }
    const complete = block as number[]
    completeBlocks.push(complete)
    blockRanks.push(averageRanks(complete))
  }
  const blocks = blockRanks.length
  const treatmentCount = treatmentValues.length
  if (blocks < 2) throw new Error('Friedman test requires at least two complete blocks.')

  const rankSums = treatmentNames.map((_, treatment) =>
    blockRanks.reduce((sum, ranks) => sum + ranks[treatment], 0),
  )
  let tieTerm = 0
  for (const block of completeBlocks) {
    const counts = new Map<number, number>()
    block.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1))
    tieTerm += [...counts.values()].reduce((sum, size) => sum + size ** 3 - size, 0)
  }
  const tieCorrection = 1 - tieTerm / (blocks * (treatmentCount ** 3 - treatmentCount))
  if (tieCorrection <= 0) throw new Error('Friedman test requires varying values within blocks.')
  const rawStatistic =
    (12 / (blocks * treatmentCount * (treatmentCount + 1))) *
      rankSums.reduce((sum, value) => sum + value ** 2, 0) -
    3 * blocks * (treatmentCount + 1)
  const statistic = Math.max(0, rawStatistic / tieCorrection)
  const degreesOfFreedom = treatmentCount - 1
  return {
    blocks,
    treatmentCount,
    treatments: treatmentNames.map((treatment, index) => ({
      treatment,
      meanRank: rankSums[index] / blocks,
    })),
    statistic,
    degreesOfFreedom,
    pValue: Math.max(0, 1 - jStat.chisquare.cdf(statistic, degreesOfFreedom)),
    tieCorrection,
    alpha,
  }
}
