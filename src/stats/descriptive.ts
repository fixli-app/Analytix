export interface DescriptiveSummary {
  count: number
  mean: number
  median: number
  standardDeviation: number
  variance: number
  standardError: number
  firstQuartile: number
  thirdQuartile: number
  range: number
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
  const quantile = (probability: number) => {
    const position = (ordered.length - 1) * probability
    const lowerIndex = Math.floor(position)
    const upperIndex = Math.ceil(position)
    return (
      ordered[lowerIndex] + (ordered[upperIndex] - ordered[lowerIndex]) * (position - lowerIndex)
    )
  }
  const variance = valid.length > 1 ? sumSquaredDifferences / (valid.length - 1) : 0
  const standardDeviation = Math.sqrt(variance)

  return {
    count: valid.length,
    mean: sum / valid.length,
    median,
    standardDeviation,
    variance,
    standardError: standardDeviation / Math.sqrt(valid.length),
    firstQuartile: quantile(0.25),
    thirdQuartile: quantile(0.75),
    range: ordered[ordered.length - 1] - ordered[0],
    minimum: ordered[0],
    maximum: ordered[ordered.length - 1],
  }
}
