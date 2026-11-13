import jStat from 'jstat'
import type { SheetColumn, SheetRow } from '../store/workbook'

export interface FactorDefinition {
  name: string
  low: number
  high: number
}

export interface TwoLevelDesign {
  columns: SheetColumn[]
  rows: SheetRow[]
  factorColumnIds: string[]
  standardRuns: number
  totalRuns: number
  seed: number
  randomized: boolean
}

export interface FactorialEffect {
  term: string
  factors: string[]
  coefficient: number
  effect: number
  sumSquares: number
  fStatistic: number
  pValue: number
}

export interface TwoLevelFactorialAnalysis {
  count: number
  factorCount: number
  alpha: number
  responseName: string
  factors: string[]
  standardRuns: number
  centerPoints: number
  effects: FactorialEffect[]
  totalSumSquares: number
  modelSumSquares: number
  errorSumSquares: number
  errorDegreesOfFreedom: number
  errorMeanSquare: number
  rSquared: number
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

export function createTwoLevelFactorial(
  factors: readonly FactorDefinition[],
  replicates = 1,
  centerPoints = 0,
  randomize = false,
  seed = 42,
): TwoLevelDesign {
  if (factors.length < 2 || factors.length > 8) {
    throw new Error('Two-level factorial requires 2 to 8 factors.')
  }
  const names = factors.map((factor) => factor.name.trim())
  if (
    names.some((name) => name === '') ||
    new Set(names.map((name) => name.toLocaleLowerCase())).size !== names.length
  ) {
    throw new Error('Factor names must be nonempty and unique.')
  }
  if (
    factors.some(
      (factor) =>
        !Number.isFinite(factor.low) || !Number.isFinite(factor.high) || factor.low >= factor.high,
    )
  ) {
    throw new Error('Each factor low level must be less than its high level.')
  }
  if (!Number.isInteger(replicates) || replicates < 1 || replicates > 100) {
    throw new Error('Replicates must be an integer from 1 to 100.')
  }
  if (!Number.isInteger(centerPoints) || centerPoints < 0 || centerPoints > 1000) {
    throw new Error('Center points must be an integer from 0 to 1000.')
  }
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new Error('Seed must be an integer between 0 and 4294967295.')
  }
  const standardRuns = 2 ** factors.length
  const totalRuns = standardRuns * replicates + centerPoints
  if (totalRuns > 500_000) throw new Error('Design exceeds the 500000-run limit.')

  const factorColumnIds = factors.map((_, index) => `C${index + 3}`)
  const columns: SheetColumn[] = [
    { id: 'C1', name: 'StdOrder', type: 'numeric' },
    { id: 'C2', name: 'RunOrder', type: 'numeric' },
    ...factors.map((factor, index) => ({
      id: factorColumnIds[index],
      name: factor.name.trim(),
      type: 'numeric' as const,
    })),
    { id: `C${factors.length + 3}`, name: 'Response', type: 'numeric' },
  ]

  const runs: { standardOrder: number; values: number[]; center: boolean }[] = []
  for (let replicate = 0; replicate < replicates; replicate++) {
    for (let standardOrder = 0; standardOrder < standardRuns; standardOrder++) {
      runs.push({
        standardOrder: replicate * standardRuns + standardOrder + 1,
        values: factors.map((factor, index) =>
          standardOrder & (1 << index) ? factor.high : factor.low,
        ),
        center: false,
      })
    }
  }
  for (let centerPoint = 0; centerPoint < centerPoints; centerPoint++) {
    runs.push({
      standardOrder: standardRuns * replicates + centerPoint + 1,
      values: factors.map((factor) => factor.low + (factor.high - factor.low) / 2),
      center: true,
    })
  }
  if (randomize) {
    const random = seededRandom(seed)
    for (let index = runs.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(random() * (index + 1))
      ;[runs[index], runs[swapIndex]] = [runs[swapIndex], runs[index]]
    }
  }

  const rows = runs.map((run, index) => ({
    C1: String(run.standardOrder),
    C2: String(index + 1),
    ...Object.fromEntries(
      factorColumnIds.map((id, factorIndex) => [id, String(run.values[factorIndex])]),
    ),
    [`C${factors.length + 3}`]: '',
  }))
  return { columns, rows, factorColumnIds, standardRuns, totalRuns, seed, randomized: randomize }
}

export function analyzeTwoLevelFactorial(
  rows: readonly SheetRow[],
  columns: readonly SheetColumn[],
  responseColumnId: string,
  factorColumnIds: readonly string[],
  alpha = 0.05,
): TwoLevelFactorialAnalysis {
  if (!Number.isFinite(alpha) || alpha <= 0 || alpha >= 1) {
    throw new Error('Alpha must be greater than 0 and less than 1.')
  }
  if (factorColumnIds.length < 2 || factorColumnIds.length > 8) {
    throw new Error('Analysis requires 2 to 8 selected factors.')
  }
  if (
    new Set(factorColumnIds).size !== factorColumnIds.length ||
    factorColumnIds.includes(responseColumnId)
  ) {
    throw new Error('Factor columns must be unique and separate from the response column.')
  }
  const responseColumn = columns.find((column) => column.id === responseColumnId)
  const factorColumns = factorColumnIds.map((id) => columns.find((column) => column.id === id))
  if (
    !responseColumn ||
    responseColumn.type !== 'numeric' ||
    factorColumns.some((column) => !column || column.type !== 'numeric')
  ) {
    throw new Error('Response and factor columns must be numeric.')
  }

  const completeRows = rows.flatMap((row, rowIndex) => {
    const responseRaw = row[responseColumnId]?.trim() ?? ''
    const factorRaw = factorColumnIds.map((id) => row[id]?.trim() ?? '')
    if (!responseRaw || factorRaw.some((value) => !value)) return []
    const response = Number(responseRaw.replace(',', '.'))
    const factorValues = factorRaw.map((value) => Number(value.replace(',', '.')))
    if (!Number.isFinite(response) || factorValues.some((value) => !Number.isFinite(value))) {
      throw new Error(`Nonfinite response or factor value on row ${rowIndex + 1}.`)
    }
    return [{ response, factorValues }]
  })
  const factorCount = factorColumnIds.length
  const standardRuns = 2 ** factorCount
  if (rows.length * (standardRuns - 1) > 5_000_000) {
    throw new Error('Analysis exceeds the 5000000 design-term operation limit.')
  }
  if (completeRows.length <= standardRuns) {
    throw new Error('A replicated full factorial or center points are needed to estimate error.')
  }

  const factorLevels = factorColumnIds.map((_, factorIndex) => {
    const levels = [...new Set(completeRows.map((row) => row.factorValues[factorIndex]))].sort(
      (a, b) => a - b,
    )
    if (levels.length < 2 || levels.length > 3)
      throw new Error('Each factor must have two levels, optionally plus a center point.')
    if (
      levels.length === 3 &&
      Math.abs(levels[1] - (levels[0] + levels[2]) / 2) >
        1e-8 * Math.max(1, Math.abs(levels[2] - levels[0]))
    ) {
      throw new Error('Three-level factors must use the exact midpoint as the center point.')
    }
    return { low: levels[0], high: levels[levels.length - 1] }
  })
  const codedRows = completeRows.map((row) =>
    row.factorValues.map((value, index) => {
      const { low, high } = factorLevels[index]
      const midpoint = low + (high - low) / 2
      const coded = (value - midpoint) / ((high - low) / 2)
      if (![-1, 0, 1].some((level) => Math.abs(coded - level) < 1e-8)) {
        throw new Error('Factor values must match the coded low, center, or high levels.')
      }
      return Math.abs(coded) < 1e-8 ? 0 : Math.sign(coded)
    }),
  )

  const corners = new Set<string>()
  codedRows.forEach((values) => {
    if (values.every((value) => value !== 0)) corners.add(values.map(String).join(','))
  })
  if (corners.size !== standardRuns)
    throw new Error('Design is missing one or more full-factorial corner runs.')

  const termMasks = Array.from({ length: standardRuns - 1 }, (_, index) => index + 1)
  const termVectors = termMasks.map((mask) =>
    codedRows.map((values) => {
      let product = 1
      for (let factor = 0; factor < factorCount; factor++) {
        if (mask & (1 << factor)) product *= values[factor]
      }
      return product
    }),
  )
  const names = factorColumnIds.map((id) => columns.find((column) => column.id === id)!.name)
  const terms = termMasks.map((mask) => names.filter((_, factor) => mask & (1 << factor)))
  const count = completeRows.length
  const response = completeRows.map((row) => row.response)
  const grandMean = response.reduce((sum, value) => sum + value, 0) / count
  const totalSumSquares = response.reduce((sum, value) => sum + (value - grandMean) ** 2, 0)
  if (totalSumSquares <= 0) throw new Error('Response must vary to analyze the design.')

  const intercept = grandMean
  const coefficients = termVectors.map((vector) => {
    const denominator = vector.reduce((sum, value) => sum + value ** 2, 0)
    if (denominator === 0)
      throw new Error('A model term has no information in the selected design.')
    return (
      vector.reduce((sum, value, index) => sum + value * (response[index] - intercept), 0) /
      denominator
    )
  })
  for (let first = 0; first < termVectors.length; first++) {
    for (let second = first + 1; second < termVectors.length; second++) {
      const crossProduct = termVectors[first].reduce(
        (sum, value, index) => sum + value * termVectors[second][index],
        0,
      )
      if (Math.abs(crossProduct) > 1e-8 * count) {
        throw new Error(
          'The selected design is not orthogonal; this analysis currently requires a balanced full factorial.',
        )
      }
    }
  }
  const sumSquares = termVectors.map(
    (vector, index) =>
      coefficients[index] ** 2 * vector.reduce((sum, value) => sum + value ** 2, 0),
  )
  const modelSumSquares = sumSquares.reduce((sum, value) => sum + value, 0)
  const rawError = totalSumSquares - modelSumSquares
  const errorSumSquares = rawError < 0 && Math.abs(rawError) < 1e-8 * totalSumSquares ? 0 : rawError
  if (errorSumSquares < 0)
    throw new Error('Numerical model decomposition produced negative error sum of squares.')
  const errorDegreesOfFreedom = count - (termMasks.length + 1)
  if (errorDegreesOfFreedom <= 0)
    throw new Error('Add replicates or center points to estimate model error.')
  const errorMeanSquare = errorSumSquares / errorDegreesOfFreedom

  const effects: FactorialEffect[] = terms.map((termFactors, index) => {
    const fStatistic =
      errorMeanSquare === 0
        ? sumSquares[index] === 0
          ? 0
          : Number.POSITIVE_INFINITY
        : sumSquares[index] / errorMeanSquare
    return {
      term: termFactors.join('*'),
      factors: termFactors,
      coefficient: coefficients[index],
      effect: 2 * coefficients[index],
      sumSquares: sumSquares[index],
      fStatistic,
      pValue:
        fStatistic === Number.POSITIVE_INFINITY
          ? 0
          : Math.max(0, 1 - jStat.centralF.cdf(fStatistic, 1, errorDegreesOfFreedom)),
    }
  })

  return {
    count,
    factorCount,
    alpha,
    responseName: responseColumn.name,
    factors: names,
    standardRuns,
    centerPoints: codedRows.filter((values) => values.some((value) => value === 0)).length,
    effects,
    totalSumSquares,
    modelSumSquares,
    errorSumSquares,
    errorDegreesOfFreedom,
    errorMeanSquare,
    rSquared: Math.min(1, Math.max(0, modelSumSquares / totalSumSquares)),
  }
}
