import { describe } from './descriptive'

export interface StandardizationResult {
  values: (number | null)[]
  mean: number
  standardDeviation: number
}

export function standardize(values: readonly (number | null | undefined)[]): StandardizationResult {
  const summary = describe(values)
  if (summary.count < 2) {
    throw new Error('Minst två numeriska värden krävs för standardisering.')
  }
  if (summary.standardDeviation === 0) {
    throw new Error('Kolumnen måste variera för att kunna standardiseras.')
  }

  return {
    values: values.map((value) =>
      value !== null && value !== undefined && Number.isFinite(value)
        ? (value - summary.mean) / summary.standardDeviation
        : null,
    ),
    mean: summary.mean,
    standardDeviation: summary.standardDeviation,
  }
}
