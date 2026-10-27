import { oneSampleT } from './oneSampleT'

export interface PairedTResult {
  pairCount: number
  meanDifference: number
  standardDeviation: number
  standardError: number
  hypothesizedDifference: number
  statistic: number
  degreesOfFreedom: number
  pValue: number
  alpha: number
  confidenceInterval: [number, number]
}

export function pairedT(
  firstValues: readonly (number | null | undefined)[],
  secondValues: readonly (number | null | undefined)[],
  hypothesizedDifference = 0,
  alpha = 0.05,
): PairedTResult {
  if (firstValues.length !== secondValues.length) {
    throw new Error('Parade kolumner måste ha lika många rader.')
  }

  const differences: number[] = []
  for (let index = 0; index < firstValues.length; index += 1) {
    const first = firstValues[index]
    const second = secondValues[index]
    if (first === null || first === undefined || second === null || second === undefined) continue
    if (!Number.isFinite(first) || !Number.isFinite(second)) {
      throw new Error('Parade kolumner innehåller värden som inte är ändliga tal.')
    }
    differences.push(first - second)
  }

  const result = oneSampleT(differences, hypothesizedDifference, alpha)
  return {
    pairCount: result.count,
    meanDifference: result.mean,
    standardDeviation: result.standardDeviation,
    standardError: result.standardError,
    hypothesizedDifference: result.hypothesizedMean,
    statistic: result.statistic,
    degreesOfFreedom: result.degreesOfFreedom,
    pValue: result.pValue,
    alpha: result.alpha,
    confidenceInterval: result.confidenceInterval,
  }
}
