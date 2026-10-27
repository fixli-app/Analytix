import jStat from 'jstat'

export interface NormalKsResult {
  count: number
  dPlus: number
  dMinus: number
  statistic: number
  pValue: number
  hypothesizedMean: number
  hypothesizedStandardDeviation: number
}

export function normalKolmogorovSmirnov(
  values: readonly (number | null | undefined)[],
  hypothesizedMean: number,
  hypothesizedStandardDeviation: number,
): NormalKsResult {
  if (!Number.isFinite(hypothesizedMean)) {
    throw new Error('Det hypotetiska medelvärdet måste vara ett ändligt tal.')
  }
  if (!Number.isFinite(hypothesizedStandardDeviation) || hypothesizedStandardDeviation <= 0) {
    throw new Error('Hypotetisk standardavvikelse måste vara större än 0.')
  }

  const observations = values.filter((value) => value !== null && value !== undefined)
  if (observations.some((value) => !Number.isFinite(value))) {
    throw new Error('Kolumnen innehåller värden som inte är ändliga tal.')
  }
  if (observations.length < 2) {
    throw new Error('Minst två observationer krävs för Kolmogorov-Smirnov-testet.')
  }

  const ordered = [...observations].sort((left, right) => left - right)
  let dPlus = 0
  let dMinus = 0
  ordered.forEach((value, index) => {
    const cdf = jStat.normal.cdf(value, hypothesizedMean, hypothesizedStandardDeviation)
    dPlus = Math.max(dPlus, (index + 1) / ordered.length - cdf)
    dMinus = Math.max(dMinus, cdf - index / ordered.length)
  })
  const statistic = Math.max(dPlus, dMinus)
  const rootCount = Math.sqrt(ordered.length)
  const lambda = (rootCount + 0.12 + 0.11 / rootCount) * statistic

  return {
    count: ordered.length,
    dPlus,
    dMinus,
    statistic,
    pValue: kolmogorovTail(lambda),
    hypothesizedMean,
    hypothesizedStandardDeviation,
  }
}

function kolmogorovTail(lambda: number): number {
  let sum = 0
  for (let index = 1; index <= 1000; index += 1) {
    const term = Math.exp(-2 * index ** 2 * lambda ** 2)
    sum += index % 2 === 1 ? term : -term
    if (term < 1e-14) break
  }
  return Math.max(0, Math.min(1, 2 * sum))
}
