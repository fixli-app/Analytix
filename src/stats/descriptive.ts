export interface DescriptiveSummary {
  count: number
  mean: number
  median: number
  standardDeviation: number
  minimum: number
  maximum: number
}

export function describe(values: readonly (number | null | undefined)[]): DescriptiveSummary {
  const valid = values.filter(
    (value): value is number => value !== null && value !== undefined && Number.isFinite(value),
  )

  if (valid.length === 0) {
    throw new Error('Kolumnen innehåller inga numeriska värden.')
  }

  let sum = 0
  let compensation = 0
  let runningMean = 0
  let sumSquaredDifferences = 0

  valid.forEach((value, index) => {
    const adjusted = value - compensation
    const nextSum = sum + adjusted
    compensation = nextSum - sum - adjusted
    sum = nextSum

    const delta = value - runningMean
    runningMean += delta / (index + 1)
    sumSquaredDifferences += delta * (value - runningMean)
  })

  const ordered = [...valid].sort((left, right) => left - right)
  const middle = Math.floor(ordered.length / 2)
  const median =
    ordered.length % 2 === 0
      ? ordered[middle - 1] + (ordered[middle] - ordered[middle - 1]) / 2
      : ordered[middle]

  return {
    count: valid.length,
    mean: sum / valid.length,
    median,
    standardDeviation: valid.length > 1 ? Math.sqrt(sumSquaredDifferences / (valid.length - 1)) : 0,
    minimum: ordered[0],
    maximum: ordered[ordered.length - 1],
  }
}
