export type AttributeControlChartKind = 'p' | 'np' | 'c' | 'u' | 'pPrime' | 'uPrime'

export interface AttributeControlChartPoint {
  observation: number
  value: number
  centerLine: number
  lowerControlLimit: number
  upperControlLimit: number
  signal: boolean
}

export interface AttributeControlChartResult {
  kind: AttributeControlChartKind
  count: number
  centerLine: number
  dispersionMultiplier?: number
  points: AttributeControlChartPoint[]
  signals: { observation: number; value: number }[]
}

export interface CusumControlChartPoint {
  observation: number
  value: number
  positiveCusum: number
  negativeCusum: number
  upperControlLimit: number
  lowerControlLimit: number
  signal: boolean
}

export interface CusumControlChartResult {
  count: number
  target: number
  sigma: number
  referenceValue: number
  decisionInterval: number
  points: CusumControlChartPoint[]
  signals: { observation: number; value: number }[]
}

export interface EwmaControlChartPoint {
  observation: number
  value: number
  centerLine: number
  upperControlLimit: number
  lowerControlLimit: number
  signal: boolean
}

export interface EwmaControlChartResult {
  count: number
  target: number
  sigma: number
  lambda: number
  width: number
  points: EwmaControlChartPoint[]
  signals: { observation: number; value: number }[]
}

export interface ZMrControlChartPoint {
  observation: number
  value: number
  centerLine: number
  lowerControlLimit: number
  upperControlLimit: number
  signal: boolean
}

export interface ZMrMovingRangePoint {
  observation: number
  value: number
  centerLine: number
  lowerControlLimit: number
  upperControlLimit: number
  signal: boolean
}

export interface ZMrControlChartResult {
  count: number
  target: number
  sigma: number
  averageMovingRange: number
  points: ZMrControlChartPoint[]
  movingRanges: ZMrMovingRangePoint[]
  signals: { chart: 'Z' | 'MR'; observation: number; value: number }[]
}

export type AdvancedControlChartResult =
  | { kind: 'attribute'; result: AttributeControlChartResult }
  | { kind: 'cusum'; result: CusumControlChartResult }
  | { kind: 'ewma'; result: EwmaControlChartResult }
  | { kind: 'zmr'; result: ZMrControlChartResult }

export function zMrControlChart(
  values: readonly (number | null | undefined)[],
  target: number,
  sigma: number,
): ZMrControlChartResult {
  if (!Number.isFinite(target)) throw new Error('Target must be a finite number.')
  if (!Number.isFinite(sigma) || sigma <= 0) {
    throw new Error('Sigma must be finite and greater than 0.')
  }
  const standardized: { observation: number; value: number }[] = []
  values.forEach((value, index) => {
    if (value === null || value === undefined) return
    if (!Number.isFinite(value)) throw new Error('Measurements must be finite numbers.')
    standardized.push({ observation: index + 1, value: (value - target) / sigma })
  })
  if (standardized.length < 2) throw new Error('At least two complete measurements are required.')

  const movingRanges: { observation: number; value: number }[] = []
  for (let index = 1; index < standardized.length; index += 1) {
    const previous = standardized[index - 1]
    const current = standardized[index]
    if (current.observation !== previous.observation + 1) continue
    movingRanges.push({
      observation: current.observation,
      value: Math.abs(current.value - previous.value),
    })
  }
  if (movingRanges.length === 0) {
    throw new Error('At least one adjacent pair of complete measurements is required.')
  }

  const averageMovingRange = mean(movingRanges.map((point) => point.value))
  const points: ZMrControlChartPoint[] = standardized.map((point) => ({
    ...point,
    centerLine: 0,
    lowerControlLimit: -3,
    upperControlLimit: 3,
    signal: point.value < -3 || point.value > 3,
  }))
  const movingRangePoints: ZMrMovingRangePoint[] = movingRanges.map((point) => ({
    ...point,
    centerLine: averageMovingRange,
    lowerControlLimit: 0,
    upperControlLimit: 3.267 * averageMovingRange,
    signal: point.value > 3.267 * averageMovingRange,
  }))
  return {
    count: points.length,
    target,
    sigma,
    averageMovingRange,
    points,
    movingRanges: movingRangePoints,
    signals: [
      ...points
        .filter((point) => point.signal)
        .map((point) => ({
          chart: 'Z' as const,
          observation: point.observation,
          value: point.value,
        })),
      ...movingRangePoints
        .filter((point) => point.signal)
        .map((point) => ({
          chart: 'MR' as const,
          observation: point.observation,
          value: point.value,
        })),
    ],
  }
}

export function attributeControlChart(
  kind: AttributeControlChartKind,
  defectCounts: readonly number[],
  sampleSizes?: readonly number[],
): AttributeControlChartResult {
  if (defectCounts.length < 2)
    throw new Error('Minst två subgrupper krävs för ett attributdiagram.')
  if (defectCounts.some((count) => !Number.isInteger(count) || count < 0)) {
    throw new Error('Defektantal måste vara icke-negativa heltal.')
  }

  if (kind === 'c') {
    const centerLine = mean(defectCounts)
    const spread = 3 * Math.sqrt(centerLine)
    return makeAttributeResult(
      kind,
      defectCounts,
      defectCounts.map(() => 1),
      centerLine,
      (size) => ({
        lower: Math.max(0, centerLine - spread),
        upper: centerLine + spread,
        size,
      }),
    )
  }

  if (!sampleSizes || sampleSizes.length !== defectCounts.length) {
    throw new Error('Varje subgrupp måste ha ett giltigt stickprovs- eller enhetsantal.')
  }
  if (sampleSizes.some((size) => !Number.isFinite(size) || size <= 0)) {
    throw new Error('Stickprovsstorlekar eller enhetsantal måste vara ändliga och större än 0.')
  }

  if (kind === 'pPrime' || kind === 'uPrime') {
    if (kind === 'pPrime' && sampleSizes.some((size) => !Number.isInteger(size))) {
      throw new Error('Stickprovsstorlekar måste vara heltal för P-diagram.')
    }
    if (kind === 'pPrime' && defectCounts.some((count, index) => count > sampleSizes[index])) {
      throw new Error('Antalet defekta enheter får inte överstiga stickprovsstorleken.')
    }
    const totalUnits = sampleSizes.reduce((sum, size) => sum + size, 0)
    const centerProportion = defectCounts.reduce((sum, count) => sum + count, 0) / totalUnits
    const centerLine =
      kind === 'pPrime'
        ? centerProportion
        : defectCounts.reduce((sum, count) => sum + count, 0) / totalUnits
    if (centerLine === 0) {
      throw new Error('Laney-diagram kräver minst en observerad defekt för att skatta sigma-z.')
    }
    const standardized = defectCounts.map((count, index) => {
      const observedRate = count / sampleSizes[index]
      const standardError =
        kind === 'pPrime'
          ? Math.sqrt((centerProportion * (1 - centerProportion)) / sampleSizes[index])
          : Math.sqrt(centerLine / sampleSizes[index])
      return (observedRate - centerLine) / standardError
    })
    const averageMovingRange =
      standardized
        .slice(1)
        .reduce((sum, value, index) => sum + Math.abs(value - standardized[index]), 0) /
      (standardized.length - 1)
    const dispersionMultiplier = averageMovingRange / 1.128
    if (!Number.isFinite(dispersionMultiplier) || dispersionMultiplier <= 0) {
      throw new Error(
        'Laney-diagram kräver varierande standardiserade värden för att skatta sigma-z.',
      )
    }
    const limits = (size: number) => {
      const standardError =
        kind === 'pPrime'
          ? Math.sqrt((centerProportion * (1 - centerProportion)) / size)
          : Math.sqrt(centerLine / size)
      const spread = 3 * dispersionMultiplier * standardError
      return { lower: Math.max(0, centerLine - spread), upper: centerLine + spread, size }
    }
    const result = makeAttributeResult(kind, defectCounts, sampleSizes, centerLine, limits)
    return { ...result, dispersionMultiplier }
  }

  if (kind === 'p' || kind === 'np') {
    if (sampleSizes.some((size) => !Number.isInteger(size))) {
      throw new Error('Stickprovsstorlekar måste vara heltal för P- och NP-diagram.')
    }
    if (defectCounts.some((count, index) => count > sampleSizes[index])) {
      throw new Error('Antalet defekta enheter får inte överstiga stickprovsstorleken.')
    }
    if (kind === 'np' && sampleSizes.some((size) => size !== sampleSizes[0])) {
      throw new Error('NP-diagram kräver samma stickprovsstorlek i varje subgrupp.')
    }
    const totalUnits = sampleSizes.reduce((sum, size) => sum + size, 0)
    const centerProportion = defectCounts.reduce((sum, count) => sum + count, 0) / totalUnits
    const centerLine = kind === 'p' ? centerProportion : centerProportion * sampleSizes[0]
    return makeAttributeResult(kind, defectCounts, sampleSizes, centerLine, (size) => {
      const standardError =
        kind === 'p'
          ? Math.sqrt((centerProportion * (1 - centerProportion)) / size)
          : Math.sqrt(size * centerProportion * (1 - centerProportion))
      return {
        lower: Math.max(0, centerLine - 3 * standardError),
        upper: centerLine + 3 * standardError,
        size,
      }
    })
  }

  const totalUnits = sampleSizes.reduce((sum, size) => sum + size, 0)
  const centerLine = defectCounts.reduce((sum, count) => sum + count, 0) / totalUnits
  return makeAttributeResult(kind, defectCounts, sampleSizes, centerLine, (size) => {
    const spread = 3 * Math.sqrt(centerLine / size)
    return { lower: Math.max(0, centerLine - spread), upper: centerLine + spread, size }
  })
}

export function cusumControlChart(
  values: readonly (number | null | undefined)[],
  target: number,
  sigma: number,
  referenceValue: number,
  decisionInterval: number,
): CusumControlChartResult {
  validateSeries(values, target, sigma)
  if (!Number.isFinite(referenceValue) || referenceValue <= 0) {
    throw new Error('CUSUM reference value k must be finite and greater than 0.')
  }
  if (!Number.isFinite(decisionInterval) || decisionInterval <= 0) {
    throw new Error('CUSUM decision interval h must be finite and greater than 0.')
  }

  let positiveCusum = 0
  let negativeCusum = 0
  const points = (values as readonly number[]).map((value, index) => {
    const standardized = (value - target) / sigma
    positiveCusum = Math.max(0, positiveCusum + standardized - referenceValue)
    negativeCusum = Math.min(0, negativeCusum + standardized + referenceValue)
    const signal = positiveCusum > decisionInterval || negativeCusum < -decisionInterval
    return {
      observation: index + 1,
      value,
      positiveCusum,
      negativeCusum,
      upperControlLimit: decisionInterval,
      lowerControlLimit: -decisionInterval,
      signal,
    }
  })
  return {
    count: points.length,
    target,
    sigma,
    referenceValue,
    decisionInterval,
    points,
    signals: points
      .filter((point) => point.signal)
      .map((point) => ({ observation: point.observation, value: point.value })),
  }
}

export function ewmaControlChart(
  values: readonly (number | null | undefined)[],
  target: number,
  sigma: number,
  lambda: number,
  width: number,
): EwmaControlChartResult {
  validateSeries(values, target, sigma)
  if (!Number.isFinite(lambda) || lambda <= 0 || lambda > 1) {
    throw new Error('EWMA lambda must be greater than 0 and at most 1.')
  }
  if (!Number.isFinite(width) || width <= 0) {
    throw new Error('EWMA control limit width L must be greater than 0.')
  }

  let ewma = target
  const points = (values as readonly number[]).map((value, index) => {
    const sample = index + 1
    ewma = lambda * value + (1 - lambda) * ewma
    const factor = Math.sqrt((lambda / (2 - lambda)) * (1 - (1 - lambda) ** (2 * sample)))
    const spread = width * sigma * factor
    const lowerControlLimit = target - spread
    const upperControlLimit = target + spread
    const signal = ewma < lowerControlLimit || ewma > upperControlLimit
    return {
      observation: sample,
      value: ewma,
      centerLine: target,
      lowerControlLimit,
      upperControlLimit,
      signal,
    }
  })
  return {
    count: points.length,
    target,
    sigma,
    lambda,
    width,
    points,
    signals: points
      .filter((point) => point.signal)
      .map((point) => ({ observation: point.observation, value: point.value })),
  }
}

function makeAttributeResult(
  kind: AttributeControlChartKind,
  defectCounts: readonly number[],
  sampleSizes: readonly number[],
  centerLine: number,
  limits: (size: number) => { lower: number; upper: number; size: number },
): AttributeControlChartResult {
  const points = defectCounts.map((count, index) => {
    const limit = limits(sampleSizes[index])
    const value =
      kind === 'p' || kind === 'pPrime' || kind === 'u' || kind === 'uPrime'
        ? count / limit.size
        : count
    const lowerControlLimit = Math.max(0, limit.lower)
    const upperControlLimit =
      kind === 'p' || kind === 'pPrime'
        ? Math.min(1, limit.upper)
        : kind === 'np'
          ? Math.min(limit.size, limit.upper)
          : limit.upper
    return {
      observation: index + 1,
      value,
      centerLine,
      lowerControlLimit,
      upperControlLimit,
      signal: value < lowerControlLimit || value > upperControlLimit,
    }
  })
  return {
    kind,
    count: points.length,
    centerLine,
    points,
    signals: points
      .filter((point) => point.signal)
      .map((point) => ({ observation: point.observation, value: point.value })),
  }
}

function validateSeries(
  values: readonly (number | null | undefined)[],
  target: number,
  sigma: number,
) {
  if (values.length < 2 || values.some((value) => value === null || value === undefined)) {
    throw new Error('At least two complete measurements are required for this control chart.')
  }
  if (values.some((value) => !Number.isFinite(value))) {
    throw new Error('Measurements must be finite numbers.')
  }
  if (!Number.isFinite(target)) throw new Error('Target must be a finite number.')
  if (!Number.isFinite(sigma) || sigma <= 0) {
    throw new Error('Sigma must be finite and greater than 0.')
  }
}

function mean(values: readonly number[]): number {
  let average = 0
  values.forEach((value, index) => {
    average += (value - average) / (index + 1)
  })
  return average
}
