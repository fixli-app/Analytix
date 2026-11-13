import jStat from 'jstat'

export type PowerTest =
  | 'oneSampleZ'
  | 'twoSampleZ'
  | 'oneProportion'
  | 'twoProportions'
  | 'oneSamplePoisson'
  | 'twoSamplePoisson'

export type PowerMode = 'power' | 'sampleSize'

export interface PowerRequest {
  test: PowerTest
  mode: PowerMode
  alpha: number
  sampleSize: number
  targetPower: number
  nullMean?: number
  alternativeMean?: number
  sigma?: number
  mean1?: number
  mean2?: number
  sigma1?: number
  sigma2?: number
  nullProportion?: number
  alternativeProportion?: number
  proportion1?: number
  proportion2?: number
  nullRate?: number
  alternativeRate?: number
  rate1?: number
  rate2?: number
  exposure?: number
}

export interface PowerCurvePoint {
  sampleSize: number
  power: number
}

export interface PowerResult {
  test: PowerTest
  mode: PowerMode
  alpha: number
  targetPower: number | null
  sampleSizePerGroup: number
  totalSampleSize: number
  achievedPower: number
  effect: number
  curve: PowerCurvePoint[]
}

type PowerAt = (sampleSizePerGroup: number) => number

function inUnitInterval(value: number | undefined, name: string, allowBoundary: boolean): number {
  const lowerValid = value !== undefined && (allowBoundary ? value >= 0 : value > 0)
  const upperValid = value !== undefined && (allowBoundary ? value <= 1 : value < 1)
  if (!Number.isFinite(value) || !lowerValid || !upperValid) {
    throw new Error(
      `${name} must be ${allowBoundary ? 'between 0 and 1' : 'greater than 0 and less than 1'}.`,
    )
  }
  return value
}

function positive(value: number | undefined, name: string): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be greater than 0.`)
  }
  return value
}

function finite(value: number | undefined, name: string): number {
  if (value === undefined || !Number.isFinite(value)) throw new Error(`${name} must be finite.`)
  return value
}

function twoSidedNormalPower(
  noncentrality: number,
  standardDeviationRatio: number,
  alpha: number,
): number {
  const critical = jStat.normal.inv(1 - alpha / 2, 0, 1)
  if (standardDeviationRatio <= Number.EPSILON) return Math.abs(noncentrality) >= critical ? 1 : 0
  return Math.max(
    0,
    Math.min(
      1,
      1 -
        jStat.normal.cdf((critical - noncentrality) / standardDeviationRatio, 0, 1) +
        jStat.normal.cdf((-critical - noncentrality) / standardDeviationRatio, 0, 1),
    ),
  )
}

function powerFunction(request: PowerRequest): {
  calculate: PowerAt
  effect: number
  twoGroups: boolean
} {
  switch (request.test) {
    case 'oneSampleZ': {
      const nullMean = finite(request.nullMean, 'Null mean')
      const alternativeMean = finite(request.alternativeMean, 'Alternative mean')
      const sigma = positive(request.sigma, 'Population standard deviation')
      const effect = alternativeMean - nullMean
      if (effect === 0) throw new Error('Alternative mean must differ from the null mean.')
      return {
        effect,
        twoGroups: false,
        calculate: (n) => twoSidedNormalPower((effect * Math.sqrt(n)) / sigma, 1, request.alpha),
      }
    }
    case 'twoSampleZ': {
      const mean1 = finite(request.mean1, 'Mean 1')
      const mean2 = finite(request.mean2, 'Mean 2')
      const sigma1 = positive(request.sigma1, 'Population standard deviation 1')
      const sigma2 = positive(request.sigma2, 'Population standard deviation 2')
      const effect = mean1 - mean2
      if (effect === 0) throw new Error('Alternative means must differ.')
      return {
        effect,
        twoGroups: true,
        calculate: (n) =>
          twoSidedNormalPower(
            (effect * Math.sqrt(n)) / Math.sqrt(sigma1 ** 2 + sigma2 ** 2),
            1,
            request.alpha,
          ),
      }
    }
    case 'oneProportion': {
      const nullProportion = inUnitInterval(request.nullProportion, 'Null proportion', false)
      const alternativeProportion = inUnitInterval(
        request.alternativeProportion,
        'Alternative proportion',
        true,
      )
      const effect = alternativeProportion - nullProportion
      if (effect === 0)
        throw new Error('Alternative proportion must differ from the null proportion.')
      const nullVariance = nullProportion * (1 - nullProportion)
      const alternativeVariance = alternativeProportion * (1 - alternativeProportion)
      return {
        effect,
        twoGroups: false,
        calculate: (n) =>
          twoSidedNormalPower(
            (effect * Math.sqrt(n)) / Math.sqrt(nullVariance),
            Math.sqrt(alternativeVariance / nullVariance),
            request.alpha,
          ),
      }
    }
    case 'twoProportions': {
      const proportion1 = inUnitInterval(request.proportion1, 'Proportion 1', true)
      const proportion2 = inUnitInterval(request.proportion2, 'Proportion 2', true)
      const effect = proportion1 - proportion2
      if (effect === 0) throw new Error('Alternative proportions must differ.')
      const pooled = (proportion1 + proportion2) / 2
      const nullVariance = 2 * pooled * (1 - pooled)
      const alternativeVariance = proportion1 * (1 - proportion1) + proportion2 * (1 - proportion2)
      return {
        effect,
        twoGroups: true,
        calculate: (n) =>
          twoSidedNormalPower(
            (effect * Math.sqrt(n)) / Math.sqrt(nullVariance),
            Math.sqrt(alternativeVariance / nullVariance),
            request.alpha,
          ),
      }
    }
    case 'oneSamplePoisson': {
      const nullRate = positive(request.nullRate, 'Null rate')
      const alternativeRate = positive(request.alternativeRate, 'Alternative rate')
      const exposure = positive(request.exposure, 'Exposure per observation')
      const effect = alternativeRate - nullRate
      if (effect === 0) throw new Error('Alternative rate must differ from the null rate.')
      return {
        effect,
        twoGroups: false,
        calculate: (n) =>
          twoSidedNormalPower(
            effect * Math.sqrt((exposure * n) / nullRate),
            Math.sqrt(alternativeRate / nullRate),
            request.alpha,
          ),
      }
    }
    case 'twoSamplePoisson': {
      const rate1 = positive(request.rate1, 'Rate 1')
      const rate2 = positive(request.rate2, 'Rate 2')
      const exposure = positive(request.exposure, 'Exposure per group observation')
      const effect = rate1 - rate2
      if (effect === 0) throw new Error('Alternative rates must differ.')
      return {
        effect,
        twoGroups: true,
        calculate: (n) =>
          twoSidedNormalPower(
            effect * Math.sqrt((exposure * n) / (rate1 + rate2)),
            1,
            request.alpha,
          ),
      }
    }
  }
}

function makePowerCurve(calculate: PowerAt, endpoint: number): PowerCurvePoint[] {
  const maximum = Math.min(1_000_000, Math.max(50, Math.ceil(endpoint * 1.5)))
  const points: PowerCurvePoint[] = []
  for (let index = 0; index <= 50; index++) {
    const sampleSize = Math.round(2 + ((maximum - 2) * index) / 50)
    if (points.length > 0 && points[points.length - 1].sampleSize === sampleSize) continue
    points.push({ sampleSize, power: calculate(sampleSize) })
  }
  return points
}

export function powerAndSampleSize(request: PowerRequest): PowerResult {
  if (!Number.isFinite(request.alpha) || request.alpha <= 0 || request.alpha >= 1) {
    throw new Error('Alpha must be greater than 0 and less than 1.')
  }
  const { calculate, effect, twoGroups } = powerFunction(request)
  let sampleSizePerGroup: number
  let targetPower: number | null

  if (request.mode === 'power') {
    if (
      !Number.isInteger(request.sampleSize) ||
      request.sampleSize < 2 ||
      request.sampleSize > 1_000_000
    ) {
      throw new Error('Sample size must be an integer from 2 to 1000000.')
    }
    sampleSizePerGroup = request.sampleSize
    targetPower = null
  } else {
    if (
      !Number.isFinite(request.targetPower) ||
      request.targetPower <= request.alpha ||
      request.targetPower >= 1
    ) {
      throw new Error('Target power must be greater than alpha and less than 1.')
    }
    targetPower = request.targetPower
    let lower = 2
    let upper = 4
    while (calculate(upper) < targetPower && upper < 1_000_000)
      upper = Math.min(1_000_000, upper * 2)
    if (calculate(upper) < targetPower) {
      throw new Error('Target power cannot be reached below the 1000000 sample-size limit.')
    }
    while (lower < upper) {
      const midpoint = Math.floor((lower + upper) / 2)
      if (calculate(midpoint) >= targetPower) upper = midpoint
      else lower = midpoint + 1
    }
    sampleSizePerGroup = lower
  }

  const achievedPower = calculate(sampleSizePerGroup)
  return {
    test: request.test,
    mode: request.mode,
    alpha: request.alpha,
    targetPower,
    sampleSizePerGroup,
    totalSampleSize: sampleSizePerGroup * (twoGroups ? 2 : 1),
    achievedPower,
    effect,
    curve: makePowerCurve(calculate, sampleSizePerGroup),
  }
}
