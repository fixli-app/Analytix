export interface ParametricSurvivalFit {
  distribution: 'exponential' | 'weibull'
  shape: number | null
  scale: number
  logLikelihood: number
  aic: number
  bic: number
  median: number
}

export interface ParametricSurvivalCurve {
  group: string
  distribution: 'exponential' | 'weibull'
  times: number[]
  survival: number[]
}

export interface ParametricSurvivalGroupFit {
  group: string
  count: number
  eventCount: number
  fits: ParametricSurvivalFit[]
  unavailableReason: string | null
}

export interface ParametricSurvivalResult {
  count: number
  droppedCount: number
  groups: ParametricSurvivalGroupFit[]
  curves: ParametricSurvivalCurve[]
}

interface LifetimeObservation {
  time: number
  event: boolean
  group: string
}

function exponentialFit(observations: readonly LifetimeObservation[]): ParametricSurvivalFit {
  const eventCount = observations.filter((observation) => observation.event).length
  const totalTime = observations.reduce((sum, observation) => sum + observation.time, 0)
  const scale = totalTime / eventCount
  if (!Number.isFinite(scale) || scale <= 0) {
    throw new Error('Exponential scale is not estimable from these survival times.')
  }
  const logLikelihood = -eventCount * Math.log(scale) - totalTime / scale
  const aic = 2 - 2 * logLikelihood
  const bic = Math.log(observations.length) - 2 * logLikelihood
  return {
    distribution: 'exponential',
    shape: null,
    scale,
    logLikelihood,
    aic,
    bic,
    median: scale * Math.LN2,
  }
}

function weibullScore(
  shape: number,
  logTimes: readonly number[],
  eventLogs: readonly number[],
): number {
  const maximumLogTime = logTimes.reduce((maximum, value) => Math.max(maximum, value), -Infinity)
  const weights = logTimes.map((value) => Math.exp(shape * (value - maximumLogTime)))
  const weightTotal = weights.reduce((sum, value) => sum + value, 0)
  const weightedMeanLogTime =
    weights.reduce((sum, weight, index) => sum + weight * logTimes[index], 0) / weightTotal
  return (
    eventLogs.length / shape +
    eventLogs.reduce((sum, value) => sum + value, 0) -
    eventLogs.length * weightedMeanLogTime
  )
}

function weibullShape(logTimes: readonly number[], eventLogs: readonly number[]): number {
  let lower = 1e-8
  let upper = 1
  while (weibullScore(upper, logTimes, eventLogs) > 0 && upper < 2048) upper *= 2
  if (
    weibullScore(lower, logTimes, eventLogs) <= 0 ||
    weibullScore(upper, logTimes, eventLogs) > 0
  ) {
    throw new Error('Weibull shape has no finite maximum-likelihood estimate for these data.')
  }
  for (let iteration = 0; iteration < 100; iteration++) {
    const midpoint = (lower + upper) / 2
    if (weibullScore(midpoint, logTimes, eventLogs) > 0) lower = midpoint
    else upper = midpoint
  }
  return (lower + upper) / 2
}

function weibullFit(observations: readonly LifetimeObservation[]): ParametricSurvivalFit {
  if (observations.some((observation) => observation.time <= 0)) {
    throw new Error('Weibull fitting requires strictly positive survival times.')
  }
  const eventCount = observations.filter((observation) => observation.event).length
  const logTimes = observations.map((observation) => Math.log(observation.time))
  const eventLogs = observations
    .filter((observation) => observation.event)
    .map((observation) => Math.log(observation.time))
  const shape = weibullShape(logTimes, eventLogs)
  const maximumLogTime = logTimes.reduce((maximum, value) => Math.max(maximum, value), -Infinity)
  const poweredTimeSum = logTimes.reduce(
    (sum, value) => sum + Math.exp(shape * (value - maximumLogTime)),
    0,
  )
  const logScale = maximumLogTime + (Math.log(poweredTimeSum) - Math.log(eventCount)) / shape
  const scale = Math.exp(logScale)
  const poweredHazards = logTimes.reduce(
    (sum, value) => sum + Math.exp(shape * (value - logScale)),
    0,
  )
  const logLikelihood =
    eventCount * Math.log(shape) -
    eventCount * shape * logScale +
    (shape - 1) * eventLogs.reduce((sum, value) => sum + value, 0) -
    poweredHazards
  const parameterCount = 2
  return {
    distribution: 'weibull',
    shape,
    scale,
    logLikelihood,
    aic: 2 * parameterCount - 2 * logLikelihood,
    bic: parameterCount * Math.log(observations.length) - 2 * logLikelihood,
    median: scale * Math.LN2 ** (1 / shape),
  }
}

export function parametricSurvival(
  times: readonly (number | null | undefined)[],
  eventStatuses: readonly (number | null | undefined)[],
  groupLabels?: readonly (string | null | undefined)[],
): ParametricSurvivalResult {
  if (
    times.length !== eventStatuses.length ||
    (groupLabels && groupLabels.length !== times.length)
  ) {
    throw new Error('Time, status, and group columns must have the same number of rows.')
  }
  const observations: LifetimeObservation[] = []
  for (let index = 0; index < times.length; index++) {
    const time = times[index]
    const status = eventStatuses[index]
    const group = groupLabels ? (groupLabels[index]?.trim() ?? '') : 'All'
    if (
      time === null ||
      time === undefined ||
      status === null ||
      status === undefined ||
      group === ''
    )
      continue
    if (!Number.isFinite(time) || time < 0) {
      throw new Error(
        `Parametric survival time on row ${index + 1} must be a finite nonnegative value.`,
      )
    }
    if (status !== 0 && status !== 1) {
      throw new Error(`Event status on row ${index + 1} must be coded 0 (censored) or 1 (event).`)
    }
    observations.push({ time, event: status === 1, group })
  }
  if (observations.length === 0)
    throw new Error('At least one complete survival observation is required.')
  const groupNames = [...new Set(observations.map((observation) => observation.group))].sort(
    (left, right) => left.localeCompare(right, 'sv'),
  )
  if (groupNames.length > 2)
    throw new Error('Parametric survival comparison currently supports at most two groups.')

  const groups = groupNames.map((group): ParametricSurvivalGroupFit => {
    const groupObservations = observations.filter((observation) => observation.group === group)
    const eventCount = groupObservations.filter((observation) => observation.event).length
    if (eventCount === 0) {
      return {
        group,
        count: groupObservations.length,
        eventCount,
        fits: [],
        unavailableReason: 'At least one event is required to estimate parametric survival models.',
      }
    }
    let exponential: ParametricSurvivalFit
    try {
      exponential = exponentialFit(groupObservations)
    } catch (error) {
      return {
        group,
        count: groupObservations.length,
        eventCount,
        fits: [],
        unavailableReason:
          error instanceof Error ? error.message : 'Parametric model is not estimable.',
      }
    }
    const fits = [exponential]
    let unavailableReason: string | null = null
    try {
      fits.push(weibullFit(groupObservations))
    } catch (error) {
      unavailableReason = error instanceof Error ? error.message : 'Weibull fit is not estimable.'
    }
    return { group, count: groupObservations.length, eventCount, fits, unavailableReason }
  })

  const curves = groups.flatMap((groupFit) => {
    const observationsForGroup = observations.filter(
      (observation) => observation.group === groupFit.group,
    )
    const maximumTime = observationsForGroup.reduce(
      (maximum, observation) => Math.max(maximum, observation.time),
      0,
    )
    return groupFit.fits.map((fit) => {
      const times = Array.from({ length: 81 }, (_, index) => (maximumTime * index) / 80)
      return {
        group: groupFit.group,
        distribution: fit.distribution,
        times,
        survival: times.map((time) =>
          fit.distribution === 'exponential'
            ? Math.exp(-time / fit.scale)
            : Math.exp(-((time / fit.scale) ** fit.shape!)),
        ),
      }
    })
  })

  return {
    count: observations.length,
    droppedCount: times.length - observations.length,
    groups,
    curves,
  }
}
