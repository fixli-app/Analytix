import jStat from 'jstat'

export interface ChiSquareIndependenceResult {
  count: number
  rowLabels: string[]
  columnLabels: string[]
  observed: number[][]
  expected: number[][]
  statistic: number
  degreesOfFreedom: number
  pValue: number
  minimumExpectedCount: number
  cellsBelowFive: number
  cramersV: number
  alpha: number
}

export function chiSquareIndependence(
  firstValues: readonly (string | number | null | undefined)[],
  secondValues: readonly (string | number | null | undefined)[],
  alpha = 0.05,
): ChiSquareIndependenceResult {
  if (!Number.isFinite(alpha) || alpha <= 0 || alpha >= 1) {
    throw new Error('Alfa måste vara större än 0 och mindre än 1.')
  }
  if (firstValues.length !== secondValues.length) {
    throw new Error('Korstabellskolumner måste ha lika många rader.')
  }

  const pairs: [string, string][] = []
  for (let index = 0; index < firstValues.length; index += 1) {
    const first = firstValues[index]
    const second = secondValues[index]
    if (first === null || first === undefined || second === null || second === undefined) continue
    if (
      (typeof first === 'number' && !Number.isFinite(first)) ||
      (typeof second === 'number' && !Number.isFinite(second))
    ) {
      throw new Error('Korstabellen innehåller värden som inte är ändliga tal.')
    }
    pairs.push([String(first), String(second)])
  }
  if (pairs.length === 0) {
    throw new Error('Inga kompletta observationer finns för korstabellen.')
  }

  const rowLabels = [...new Set(pairs.map(([value]) => value))].sort((a, b) =>
    a.localeCompare(b, 'sv'),
  )
  const columnLabels = [...new Set(pairs.map(([, value]) => value))].sort((a, b) =>
    a.localeCompare(b, 'sv'),
  )
  if (rowLabels.length < 2 || columnLabels.length < 2) {
    throw new Error('Chi-två-test för samband kräver minst två kategorier i varje kolumn.')
  }

  const rowIndexes = new Map(rowLabels.map((label, index) => [label, index]))
  const columnIndexes = new Map(columnLabels.map((label, index) => [label, index]))
  const observed = rowLabels.map(() => columnLabels.map(() => 0))
  const rowTotals = rowLabels.map(() => 0)
  const columnTotals = columnLabels.map(() => 0)
  pairs.forEach(([rowLabel, columnLabel]) => {
    const rowIndex = rowIndexes.get(rowLabel)!
    const columnIndex = columnIndexes.get(columnLabel)!
    observed[rowIndex][columnIndex] += 1
    rowTotals[rowIndex] += 1
    columnTotals[columnIndex] += 1
  })

  const count = pairs.length
  const expected = observed.map((row, rowIndex) =>
    row.map((_, columnIndex) => (rowTotals[rowIndex] * columnTotals[columnIndex]) / count),
  )
  let statistic = 0
  let minimumExpectedCount = Number.POSITIVE_INFINITY
  let cellsBelowFive = 0
  expected.forEach((row, rowIndex) => {
    row.forEach((expectedCount, columnIndex) => {
      minimumExpectedCount = Math.min(minimumExpectedCount, expectedCount)
      if (expectedCount < 5) cellsBelowFive += 1
      statistic += (observed[rowIndex][columnIndex] - expectedCount) ** 2 / expectedCount
    })
  })

  const degreesOfFreedom = (rowLabels.length - 1) * (columnLabels.length - 1)
  const pValue = Math.max(0, 1 - jStat.chisquare.cdf(statistic, degreesOfFreedom))
  const smallerDimension = Math.min(rowLabels.length - 1, columnLabels.length - 1)

  return {
    count,
    rowLabels,
    columnLabels,
    observed,
    expected,
    statistic,
    degreesOfFreedom,
    pValue,
    minimumExpectedCount,
    cellsBelowFive,
    cramersV: Math.sqrt(statistic / (count * smallerDimension)),
    alpha,
  }
}
