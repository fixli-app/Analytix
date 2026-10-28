export interface FisherExactResult {
  count: number
  rowLabels: [string, string]
  columnLabels: [string, string]
  observed: [[number, number], [number, number]]
  pValue: number
  oddsRatio: number | null
  alternative: 'two-sided'
}

export function fisherExactTwoSided(
  firstValues: readonly (string | number | null | undefined)[],
  secondValues: readonly (string | number | null | undefined)[],
): FisherExactResult {
  if (firstValues.length !== secondValues.length) {
    throw new Error('Fishers testkolumner måste ha lika många rader.')
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
      throw new Error('Fishers testkolumner innehåller värden som inte är ändliga tal.')
    }
    pairs.push([String(first), String(second)])
  }
  if (pairs.length === 0) {
    throw new Error('Inga kompletta observationer finns för Fishers test.')
  }

  const rowLabels = [...new Set(pairs.map(([value]) => value))].sort((a, b) =>
    a.localeCompare(b, 'sv'),
  )
  const columnLabels = [...new Set(pairs.map(([, value]) => value))].sort((a, b) =>
    a.localeCompare(b, 'sv'),
  )
  if (rowLabels.length !== 2 || columnLabels.length !== 2) {
    throw new Error('Fishers exakta test kräver exakt två kategorier i varje kolumn.')
  }

  const observed: [[number, number], [number, number]] = [
    [0, 0],
    [0, 0],
  ]
  const rowIndexes = new Map(rowLabels.map((label, index) => [label, index]))
  const columnIndexes = new Map(columnLabels.map((label, index) => [label, index]))
  pairs.forEach(([rowLabel, columnLabel]) => {
    observed[rowIndexes.get(rowLabel)!][columnIndexes.get(columnLabel)!] += 1
  })

  const [[a, b], [c, d]] = observed
  const row1Total = a + b
  const column1Total = a + c
  const column2Total = b + d
  const total = pairs.length
  const minimumA = Math.max(0, row1Total - column2Total)
  const maximumA = Math.min(row1Total, column1Total)
  const observedProbability = hypergeometricProbability(
    a,
    row1Total,
    column1Total,
    column2Total,
    total,
  )
  let pValue = 0

  for (let candidateA = minimumA; candidateA <= maximumA; candidateA += 1) {
    const probability = hypergeometricProbability(
      candidateA,
      row1Total,
      column1Total,
      column2Total,
      total,
    )
    if (probability <= observedProbability + 1e-12) pValue += probability
  }

  const numerator = a * d
  const denominator = b * c
  const oddsRatio =
    denominator === 0
      ? numerator === 0
        ? null
        : Number.POSITIVE_INFINITY
      : numerator / denominator

  return {
    count: total,
    rowLabels: rowLabels as [string, string],
    columnLabels: columnLabels as [string, string],
    observed,
    pValue: Math.min(1, pValue),
    oddsRatio,
    alternative: 'two-sided',
  }
}

function hypergeometricProbability(
  observedTopLeft: number,
  row1Total: number,
  column1Total: number,
  column2Total: number,
  total: number,
): number {
  const logProbability =
    logCombination(column1Total, observedTopLeft) +
    logCombination(column2Total, row1Total - observedTopLeft) -
    logCombination(total, row1Total)
  return Math.exp(logProbability)
}

function logCombination(total: number, selected: number): number {
  if (selected < 0 || selected > total) return Number.NEGATIVE_INFINITY
  const count = Math.min(selected, total - selected)
  let result = 0
  for (let value = 1; value <= count; value += 1) {
    result += Math.log(total - count + value) - Math.log(value)
  }
  return result
}
