import jStat from 'jstat'

export interface CorrelationResult {
  count: number
  correlation: number
  covariance: number
  statistic: number
  degreesOfFreedom: number
  pValue: number
  alpha: number
  confidenceInterval: [number, number]
}

export function correlation(
  firstValues: readonly (number | null | undefined)[],
  secondValues: readonly (number | null | undefined)[],
  alpha = 0.05,
): CorrelationResult {
  if (firstValues.length !== secondValues.length) {
    throw new Error('Korrelationskolumner måste ha lika många rader.')
  }
  if (!Number.isFinite(alpha) || alpha <= 0 || alpha >= 1) {
    throw new Error('Alfa måste vara större än 0 och mindre än 1.')
  }

  const first: number[] = []
  const second: number[] = []
  for (let index = 0; index < firstValues.length; index += 1) {
    const x = firstValues[index]
    const y = secondValues[index]
    if (x === null || x === undefined || y === null || y === undefined) continue
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error('Korrelationskolumner innehåller värden som inte är ändliga tal.')
    }
    first.push(x)
    second.push(y)
  }
  if (first.length < 4) {
    throw new Error('Minst fyra kompletta par krävs för korrelation och konfidensintervall.')
  }

  let meanX = 0
  let meanY = 0
  let sumSquaresX = 0
  let sumSquaresY = 0
  let sumProducts = 0
  for (let index = 0; index < first.length; index += 1) {
    const deltaX = first[index] - meanX
    const deltaY = second[index] - meanY
    meanX += deltaX / (index + 1)
    meanY += deltaY / (index + 1)
    sumSquaresX += deltaX * (first[index] - meanX)
    sumSquaresY += deltaY * (second[index] - meanY)
    sumProducts += deltaX * (second[index] - meanY)
  }
  if (sumSquaresX === 0 || sumSquaresY === 0) {
    throw new Error('Korrelationskolumner måste variera.')
  }

  const count = first.length
  const degreesOfFreedom = count - 2
  const covariance = sumProducts / (count - 1)
  const value = sumProducts / Math.sqrt(sumSquaresX * sumSquaresY)
  const statistic =
    Math.abs(value) === 1
      ? Math.sign(value) * Number.POSITIVE_INFINITY
      : value * Math.sqrt(degreesOfFreedom / (1 - value ** 2))
  const pValue =
    Math.abs(value) === 1
      ? 0
      : Math.min(1, 2 * (1 - jStat.studentt.cdf(Math.abs(statistic), degreesOfFreedom)))
  const confidenceInterval = fisherInterval(value, count, alpha)

  return {
    count,
    correlation: value,
    covariance,
    statistic,
    degreesOfFreedom,
    pValue,
    alpha,
    confidenceInterval,
  }
}

function fisherInterval(value: number, count: number, alpha: number): [number, number] {
  if (Math.abs(value) === 1) return [value, value]
  const fisherZ = 0.5 * Math.log((1 + value) / (1 - value))
  const standardError = 1 / Math.sqrt(count - 3)
  const criticalValue = jStat.normal.inv(1 - alpha / 2, 0, 1)
  return [
    Math.tanh(fisherZ - criticalValue * standardError),
    Math.tanh(fisherZ + criticalValue * standardError),
  ]
}
