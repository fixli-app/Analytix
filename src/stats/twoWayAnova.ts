import jStat from 'jstat'

export type TwoWayAnovaSource = 'factor1' | 'factor2' | 'interaction' | 'error' | 'total'

export interface TwoWayAnovaRow {
  source: TwoWayAnovaSource
  sumSquares: number
  degreesOfFreedom: number
  meanSquare: number | null
  fStatistic: number | null
  pValue: number | null
  partialEtaSquared: number | null
}

export interface TwoWayAnovaCellMean {
  factor1: string
  factor2: string
  count: number
  mean: number
  standardDeviation: number
}

export interface TwoWayAnovaResult {
  count: number
  factor1Name: string
  factor2Name: string
  responseName: string
  factor1Levels: string[]
  factor2Levels: string[]
  replicateCount: number
  grandMean: number
  totalSumSquares: number
  errorMeanSquare: number
  alpha: number
  table: TwoWayAnovaRow[]
  cellMeans: TwoWayAnovaCellMean[]
}

interface Observation {
  response: number
  factor1: string
  factor2: string
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function sumSquares(values: readonly number[], center: number): number {
  return values.reduce((sum, value) => sum + (value - center) ** 2, 0)
}

export function twoWayAnova(
  values: readonly (number | null | undefined)[],
  factor1Labels: readonly (string | null | undefined)[],
  factor2Labels: readonly (string | null | undefined)[],
  names: { response?: string; factor1?: string; factor2?: string } = {},
  alpha = 0.05,
): TwoWayAnovaResult {
  if (!Number.isFinite(alpha) || alpha <= 0 || alpha >= 1) {
    throw new Error('Alpha must be greater than 0 and less than 1.')
  }
  if (values.length !== factor1Labels.length || values.length !== factor2Labels.length) {
    throw new Error('Response and factor columns must have the same number of rows.')
  }

  const observations: Observation[] = []
  for (let index = 0; index < values.length; index++) {
    const response = values[index]
    const factor1 = factor1Labels[index]?.trim() ?? ''
    const factor2 = factor2Labels[index]?.trim() ?? ''
    if (response === null || response === undefined || factor1 === '' || factor2 === '') continue
    if (!Number.isFinite(response)) throw new Error(`Response on row ${index + 1} is not finite.`)
    observations.push({ response, factor1, factor2 })
  }

  const factor1Levels = [...new Set(observations.map((observation) => observation.factor1))].sort(
    (left, right) => left.localeCompare(right, 'sv'),
  )
  const factor2Levels = [...new Set(observations.map((observation) => observation.factor2))].sort(
    (left, right) => left.localeCompare(right, 'sv'),
  )
  if (factor1Levels.length < 2 || factor2Levels.length < 2) {
    throw new Error('Two-way ANOVA requires at least two levels for each factor.')
  }

  const cells = new Map<string, number[]>()
  for (const observation of observations) {
    const key = JSON.stringify([observation.factor1, observation.factor2])
    const cell = cells.get(key) ?? []
    cell.push(observation.response)
    cells.set(key, cell)
  }
  const cellCounts = factor1Levels.flatMap((factor1) =>
    factor2Levels.map((factor2) => cells.get(JSON.stringify([factor1, factor2]))?.length ?? 0),
  )
  const replicateCount = cellCounts[0]
  if (cellCounts.some((count) => count === 0)) {
    throw new Error('Every combination of factor levels must have observations.')
  }
  if (cellCounts.some((count) => count !== replicateCount)) {
    throw new Error('Two-way ANOVA currently requires a balanced design with equal cell sizes.')
  }
  if (replicateCount < 2) {
    throw new Error('Each factor combination requires at least two complete replicates.')
  }

  const count = observations.length
  const responses = observations.map((observation) => observation.response)
  const grandMean = mean(responses)
  const factor1Totals = new Map(factor1Levels.map((level) => [level, 0]))
  const factor2Totals = new Map(factor2Levels.map((level) => [level, 0]))
  for (const observation of observations) {
    factor1Totals.set(
      observation.factor1,
      factor1Totals.get(observation.factor1)! + observation.response,
    )
    factor2Totals.set(
      observation.factor2,
      factor2Totals.get(observation.factor2)! + observation.response,
    )
  }
  const factor1Means = new Map(
    factor1Levels.map((level) => [
      level,
      factor1Totals.get(level)! / (factor2Levels.length * replicateCount),
    ]),
  )
  const factor2Means = new Map(
    factor2Levels.map((level) => [
      level,
      factor2Totals.get(level)! / (factor1Levels.length * replicateCount),
    ]),
  )
  const cellMeans = factor1Levels.flatMap((factor1) =>
    factor2Levels.map((factor2) => {
      const cellValues = cells.get(JSON.stringify([factor1, factor2]))!
      const cellMean = mean(cellValues)
      return {
        factor1,
        factor2,
        count: cellValues.length,
        mean: cellMean,
        standardDeviation: Math.sqrt(sumSquares(cellValues, cellMean) / (cellValues.length - 1)),
      }
    }),
  )
  const totalSumSquares = sumSquares(responses, grandMean)
  const factor1SumSquares =
    factor2Levels.length *
    replicateCount *
    factor1Levels.reduce((sum, level) => sum + (factor1Means.get(level)! - grandMean) ** 2, 0)
  const factor2SumSquares =
    factor1Levels.length *
    replicateCount *
    factor2Levels.reduce((sum, level) => sum + (factor2Means.get(level)! - grandMean) ** 2, 0)
  const interactionSumSquares =
    replicateCount *
    cellMeans.reduce((sum, cell) => {
      const interaction =
        cell.mean - factor1Means.get(cell.factor1)! - factor2Means.get(cell.factor2)! + grandMean
      return sum + interaction ** 2
    }, 0)
  const errorSumSquares = cellMeans.reduce((sum, cell) => {
    const cellValues = cells.get(JSON.stringify([cell.factor1, cell.factor2]))!
    return sum + sumSquares(cellValues, cell.mean)
  }, 0)
  if (errorSumSquares <= 0) {
    throw new Error('Within-cell variation must be greater than zero for two-way ANOVA.')
  }

  const factor1DegreesOfFreedom = factor1Levels.length - 1
  const factor2DegreesOfFreedom = factor2Levels.length - 1
  const interactionDegreesOfFreedom = factor1DegreesOfFreedom * factor2DegreesOfFreedom
  const errorDegreesOfFreedom = factor1Levels.length * factor2Levels.length * (replicateCount - 1)
  const errorMeanSquare = errorSumSquares / errorDegreesOfFreedom
  const totalDegreesOfFreedom = count - 1
  const sources: { source: TwoWayAnovaSource; ss: number; df: number }[] = [
    { source: 'factor1', ss: factor1SumSquares, df: factor1DegreesOfFreedom },
    { source: 'factor2', ss: factor2SumSquares, df: factor2DegreesOfFreedom },
    { source: 'interaction', ss: interactionSumSquares, df: interactionDegreesOfFreedom },
    { source: 'error', ss: errorSumSquares, df: errorDegreesOfFreedom },
    { source: 'total', ss: totalSumSquares, df: totalDegreesOfFreedom },
  ]
  const table = sources.map(({ source, ss, df }): TwoWayAnovaRow => {
    if (source === 'error' || source === 'total') {
      return {
        source,
        sumSquares: ss,
        degreesOfFreedom: df,
        meanSquare: source === 'error' ? errorMeanSquare : null,
        fStatistic: null,
        pValue: null,
        partialEtaSquared: null,
      }
    }
    const meanSquare = ss / df
    const fStatistic = meanSquare / errorMeanSquare
    return {
      source,
      sumSquares: ss,
      degreesOfFreedom: df,
      meanSquare,
      fStatistic,
      pValue: Math.max(0, 1 - jStat.centralF.cdf(fStatistic, df, errorDegreesOfFreedom)),
      partialEtaSquared: ss / (ss + errorSumSquares),
    }
  })

  return {
    count,
    factor1Name: names.factor1 ?? 'Factor 1',
    factor2Name: names.factor2 ?? 'Factor 2',
    responseName: names.response ?? 'Response',
    factor1Levels,
    factor2Levels,
    replicateCount,
    grandMean,
    totalSumSquares,
    errorMeanSquare,
    alpha,
    table,
    cellMeans,
  }
}
