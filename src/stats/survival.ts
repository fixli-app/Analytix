import jStat from 'jstat'

export interface KaplanMeierPoint {
  time: number
  atRisk: number
  events: number
  censored: number
  survival: number
  lowerConfidenceLimit: number
  upperConfidenceLimit: number
}

export interface KaplanMeierCurve {
  group: string
  count: number
  eventCount: number
  censoredCount: number
  median: number | null
  medianConfidenceInterval: [number | null, number | null]
  points: KaplanMeierPoint[]
}

export interface LogRankResult {
  observedMinusExpected: number
  variance: number
  chiSquare: number
  degreesOfFreedom: 1
  pValue: number
}

export interface KaplanMeierResult {
  count: number
  droppedCount: number
  eventCount: number
  censoredCount: number
  alpha: number
  curves: KaplanMeierCurve[]
  logRank: LogRankResult | null
}

interface SurvivalObservation {
  time: number
  event: boolean
  group: string
}

function confidenceLimits(survival: number, greenwood: number, alpha: number): [number, number] {
  if (survival <= 0) return [0, 0]
  if (survival >= 1 || greenwood <= 0) return [survival, survival]
  const z = jStat.normal.inv(1 - alpha / 2, 0, 1)
  const logLog = Math.log(-Math.log(survival))
  const standardError = Math.sqrt(greenwood) / Math.abs(Math.log(survival))
  const lower = Math.exp(-Math.exp(logLog + z * standardError))
  const upper = Math.exp(-Math.exp(logLog - z * standardError))
  return [Math.max(0, lower), Math.min(1, upper)]
}

function buildCurve(
  group: string,
  observations: readonly SurvivalObservation[],
  alpha: number,
): KaplanMeierCurve {
  const ordered = observations
    .filter((observation) => observation.group === group)
    .sort((left, right) => left.time - right.time)
  const points: KaplanMeierPoint[] = [
    {
      time: 0,
      atRisk: ordered.length,
      events: 0,
      censored: 0,
      survival: 1,
      lowerConfidenceLimit: 1,
      upperConfidenceLimit: 1,
    },
  ]
  let survival = 1
  let greenwood = 0
  let atRisk = ordered.length
  let cursor = 0

  while (cursor < ordered.length) {
    const time = ordered[cursor].time
    let end = cursor + 1
    while (end < ordered.length && ordered[end].time === time) end++
    const tied = ordered.slice(cursor, end)
    const events = tied.filter((observation) => observation.event).length
    const censored = tied.length - events
    if (events > 0) {
      survival *= 1 - events / atRisk
      if (atRisk > events) greenwood += events / (atRisk * (atRisk - events))
      else greenwood = Number.POSITIVE_INFINITY
    }
    const [lowerConfidenceLimit, upperConfidenceLimit] = confidenceLimits(
      survival,
      greenwood,
      alpha,
    )
    points.push({
      time,
      atRisk,
      events,
      censored,
      survival,
      lowerConfidenceLimit,
      upperConfidenceLimit,
    })
    atRisk -= tied.length
    cursor = end
  }

  const medianPoint = points.find((point) => point.survival <= 0.5)
  const lowerMedianPoint = points.find((point) => point.lowerConfidenceLimit <= 0.5)
  const upperMedianPoint = points.find((point) => point.upperConfidenceLimit <= 0.5)
  return {
    group,
    count: ordered.length,
    eventCount: ordered.filter((observation) => observation.event).length,
    censoredCount: ordered.filter((observation) => !observation.event).length,
    median: medianPoint?.time ?? null,
    medianConfidenceInterval: [lowerMedianPoint?.time ?? null, upperMedianPoint?.time ?? null],
    points,
  }
}

function logRankTest(
  observations: readonly SurvivalObservation[],
  group1: string,
  group2: string,
): LogRankResult | null {
  const countsByTime = new Map<
    number,
    { events1: number; events2: number; removed1: number; removed2: number }
  >()
  let risk1 = 0
  let risk2 = 0
  for (const observation of observations) {
    const counts = countsByTime.get(observation.time) ?? {
      events1: 0,
      events2: 0,
      removed1: 0,
      removed2: 0,
    }
    if (observation.group === group1) {
      risk1++
      counts.removed1++
      if (observation.event) counts.events1++
    } else if (observation.group === group2) {
      risk2++
      counts.removed2++
      if (observation.event) counts.events2++
    }
    countsByTime.set(observation.time, counts)
  }
  let observedMinusExpected = 0
  let variance = 0
  for (const [, counts] of [...countsByTime.entries()].sort(([left], [right]) => left - right)) {
    const risk = risk1 + risk2
    const events = counts.events1 + counts.events2
    if (risk > 1 && events > 0 && events < risk) {
      observedMinusExpected += counts.events1 - (events * risk1) / risk
      variance += (risk1 * risk2 * events * (risk - events)) / (risk ** 2 * (risk - 1))
    }
    risk1 -= counts.removed1
    risk2 -= counts.removed2
  }
  if (variance <= 0) return null
  const chiSquare = observedMinusExpected ** 2 / variance
  return {
    observedMinusExpected,
    variance,
    chiSquare,
    degreesOfFreedom: 1,
    pValue: Math.max(0, 1 - jStat.chisquare.cdf(chiSquare, 1)),
  }
}

export function kaplanMeier(
  times: readonly (number | null | undefined)[],
  eventStatuses: readonly (number | null | undefined)[],
  groupLabels?: readonly (string | null | undefined)[],
  alpha = 0.05,
): KaplanMeierResult {
  if (!Number.isFinite(alpha) || alpha <= 0 || alpha >= 1) {
    throw new Error('Alpha must be greater than 0 and less than 1.')
  }
  if (
    times.length !== eventStatuses.length ||
    (groupLabels && groupLabels.length !== times.length)
  ) {
    throw new Error('Time, status, and group columns must have the same number of rows.')
  }

  const observations: SurvivalObservation[] = []
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
    ) {
      continue
    }
    if (!Number.isFinite(time) || time < 0) {
      throw new Error(`Survival time on row ${index + 1} must be a finite nonnegative value.`)
    }
    if (status !== 0 && status !== 1) {
      throw new Error(`Event status on row ${index + 1} must be coded 0 (censored) or 1 (event).`)
    }
    observations.push({ time, event: status === 1, group })
  }
  if (observations.length === 0)
    throw new Error('At least one complete survival observation is required.')
  const groups = [...new Set(observations.map((observation) => observation.group))].sort(
    (left, right) => left.localeCompare(right, 'sv'),
  )
  if (groups.length > 2)
    throw new Error('Kaplan-Meier comparison currently supports at most two groups.')

  const curves = groups.map((group) => buildCurve(group, observations, alpha))
  const eventCount = observations.filter((observation) => observation.event).length
  return {
    count: observations.length,
    droppedCount: times.length - observations.length,
    eventCount,
    censoredCount: observations.length - eventCount,
    alpha,
    curves,
    logRank: groups.length === 2 ? logRankTest(observations, groups[0], groups[1]) : null,
  }
}
