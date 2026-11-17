export interface ControlChartPoint {
  observation: number
  value: number
}

export type ImrRuleSet = 'basic' | 'nelson'

export interface ControlChartSignal {
  chart: 'I' | 'MR'
  rule:
    | 'beyond-limit'
    | 'eight-on-one-side'
    | 'nelson-rule-2'
    | 'nelson-rule-3'
    | 'nelson-rule-4'
    | 'nelson-rule-5'
    | 'nelson-rule-6'
    | 'nelson-rule-7'
    | 'nelson-rule-8'
  observations: number[]
}

export interface ImrControlChartResult {
  count: number
  ruleSet: ImrRuleSet
  mean: number
  averageMovingRange: number
  withinStandardDeviation: number
  individuals: {
    points: ControlChartPoint[]
    lowerControlLimit: number
    centerLine: number
    upperControlLimit: number
  }
  movingRange: {
    points: ControlChartPoint[]
    lowerControlLimit: number
    centerLine: number
    upperControlLimit: number
  }
  signals: ControlChartSignal[]
}

const movingRangeD2 = 1.128
const movingRangeD4 = 3.267

export function imrControlChart(
  values: readonly (number | null | undefined)[],
  ruleSet: ImrRuleSet = 'basic',
): ImrControlChartResult {
  const observations: ControlChartPoint[] = []
  values.forEach((value, index) => {
    if (value === null || value === undefined) return
    if (!Number.isFinite(value)) {
      throw new Error('Kolumnen innehåller värden som inte är ändliga tal.')
    }
    observations.push({ observation: index + 1, value })
  })
  if (observations.length < 2) {
    throw new Error('Minst två numeriska observationer krävs för I-MR-diagrammet.')
  }

  const movingRanges: ControlChartPoint[] = []
  for (let index = 1; index < observations.length; index += 1) {
    const previous = observations[index - 1]
    const current = observations[index]
    if (current.observation !== previous.observation + 1) continue
    movingRanges.push({
      observation: current.observation,
      value: Math.abs(current.value - previous.value),
    })
  }
  if (movingRanges.length === 0) {
    throw new Error(
      'Minst ett par intilliggande numeriska observationer krävs för I-MR-diagrammet.',
    )
  }

  const mean = stableMean(observations.map((point) => point.value))
  const averageMovingRange = stableMean(movingRanges.map((point) => point.value))
  const withinStandardDeviation = averageMovingRange / movingRangeD2
  const individuals = {
    points: observations,
    lowerControlLimit: mean - 3 * withinStandardDeviation,
    centerLine: mean,
    upperControlLimit: mean + 3 * withinStandardDeviation,
  }
  const movingRange = {
    points: movingRanges,
    lowerControlLimit: 0,
    centerLine: averageMovingRange,
    upperControlLimit: movingRangeD4 * averageMovingRange,
  }

  return {
    count: observations.length,
    ruleSet,
    mean,
    averageMovingRange,
    withinStandardDeviation,
    individuals,
    movingRange,
    signals: [
      ...findBeyondLimitSignals(
        'I',
        individuals.points,
        individuals.lowerControlLimit,
        individuals.upperControlLimit,
      ),
      ...findBeyondLimitSignals(
        'MR',
        movingRange.points,
        movingRange.lowerControlLimit,
        movingRange.upperControlLimit,
      ),
      ...(ruleSet === 'basic'
        ? findEightOnOneSideSignals(individuals.points, mean)
        : findNelsonRuleSignals(individuals.points, mean, withinStandardDeviation)),
    ],
  }
}

function stableMean(values: readonly number[]): number {
  let mean = 0
  values.forEach((value, index) => {
    mean += (value - mean) / (index + 1)
  })
  return mean
}

function findBeyondLimitSignals(
  chart: 'I' | 'MR',
  points: readonly ControlChartPoint[],
  lowerControlLimit: number,
  upperControlLimit: number,
): ControlChartSignal[] {
  return points
    .filter((point) => point.value < lowerControlLimit || point.value > upperControlLimit)
    .map((point) => ({ chart, rule: 'beyond-limit', observations: [point.observation] }))
}

function findEightOnOneSideSignals(
  points: readonly ControlChartPoint[],
  centerLine: number,
): ControlChartSignal[] {
  const signals: ControlChartSignal[] = []
  let side = 0
  let run: number[] = []
  let runReported = false
  let lastObservation = 0
  points.forEach((point) => {
    if (lastObservation !== 0 && point.observation !== lastObservation + 1) {
      side = 0
      run = []
      runReported = false
    }
    lastObservation = point.observation
    const nextSide = Math.sign(point.value - centerLine)
    if (nextSide === 0 || nextSide !== side) {
      side = nextSide
      run = nextSide === 0 ? [] : [point.observation]
      runReported = false
    } else {
      run.push(point.observation)
    }
    if (run.length === 8 && !runReported) {
      signals.push({ chart: 'I', rule: 'eight-on-one-side', observations: [...run] })
      runReported = true
    }
  })
  return signals
}

export function findNelsonRuleSignals(
  points: readonly ControlChartPoint[],
  centerLine: number,
  sigma: number,
): ControlChartSignal[] {
  if (!Number.isFinite(sigma) || sigma <= 0) return []
  const signals: ControlChartSignal[] = []
  const appendWindows = (
    segment: readonly ControlChartPoint[],
    rule: Extract<ControlChartSignal['rule'], `nelson-rule-${number}`>,
    width: number,
    isSignalWindow: (window: readonly ControlChartPoint[]) => boolean,
  ) => {
    let activeSignal = false
    for (let start = 0; start + width <= segment.length; start += 1) {
      const window = segment.slice(start, start + width)
      const matches = isSignalWindow(window)
      if (matches && !activeSignal) {
        signals.push({ chart: 'I', rule, observations: window.map((point) => point.observation) })
      }
      activeSignal = matches
    }
  }

  continuousSegments(points).forEach((segment) => {
    appendWindows(segment, 'nelson-rule-2', 9, (window) => {
      const above = window.every((point) => point.value > centerLine)
      const below = window.every((point) => point.value < centerLine)
      return above || below
    })
    appendWindows(segment, 'nelson-rule-3', 6, (window) => {
      const differences = window.slice(1).map((point, index) => point.value - window[index].value)
      return (
        differences.every((difference) => difference > 0) ||
        differences.every((difference) => difference < 0)
      )
    })
    appendWindows(segment, 'nelson-rule-4', 14, (window) => {
      const directions = window
        .slice(1)
        .map((point, index) => Math.sign(point.value - window[index].value))
      return directions.every(
        (direction, index) =>
          direction !== 0 && (index === 0 || direction === -directions[index - 1]),
      )
    })
    appendWindows(segment, 'nelson-rule-5', 3, (window) => {
      const above = window.filter((point) => point.value - centerLine > 2 * sigma).length
      const below = window.filter((point) => centerLine - point.value > 2 * sigma).length
      return above >= 2 || below >= 2
    })
    appendWindows(segment, 'nelson-rule-6', 5, (window) => {
      const above = window.filter((point) => point.value - centerLine > sigma).length
      const below = window.filter((point) => centerLine - point.value > sigma).length
      return above >= 4 || below >= 4
    })
    appendWindows(segment, 'nelson-rule-7', 15, (window) =>
      window.every((point) => Math.abs(point.value - centerLine) < sigma),
    )
    appendWindows(segment, 'nelson-rule-8', 8, (window) =>
      window.every((point) => Math.abs(point.value - centerLine) > sigma),
    )
  })
  return signals
}

function continuousSegments(points: readonly ControlChartPoint[]): ControlChartPoint[][] {
  const segments: ControlChartPoint[][] = []
  let segment: ControlChartPoint[] = []
  points.forEach((point) => {
    if (segment.length > 0 && point.observation !== segment[segment.length - 1].observation + 1) {
      segments.push(segment)
      segment = []
    }
    segment.push(point)
  })
  if (segment.length > 0) segments.push(segment)
  return segments
}
