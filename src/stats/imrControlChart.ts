export interface ControlChartPoint {
  observation: number
  value: number
}

export interface ControlChartSignal {
  chart: 'I' | 'MR'
  rule: 'beyond-limit' | 'eight-on-one-side'
  observations: number[]
}

export interface ImrControlChartResult {
  count: number
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
      ...findEightOnOneSideSignals(individuals.points, mean),
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
