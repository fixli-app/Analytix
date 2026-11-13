import { Matrix, QrDecomposition } from 'ml-matrix'

export type TimeSeriesMethod =
  'linearTrend' | 'quadraticTrend' | 'movingAverage' | 'simpleExponential' | 'holt' | 'acf'

export interface TimeSeriesOptions {
  method: TimeSeriesMethod
  window?: number
  forecastHorizon?: number
  alpha?: number
  beta?: number
  maxLag?: number
}

export interface TimeSeriesPoint {
  observation: number
  value: number
  fitted: number | null
  residual: number | null
}

export interface TimeSeriesResult {
  method: TimeSeriesMethod
  count: number
  omittedCount: number
  mean: number
  standardDeviation: number
  minimum: number
  maximum: number
  rSquared: number | null
  rootMeanSquareError: number | null
  trendCoefficients: { intercept: number; slope: number; quadratic: number | null } | null
  smoothingParameters: { alpha: number; beta: number | null } | null
  window: number | null
  points: TimeSeriesPoint[]
  forecasts: { observation: number; value: number }[]
  lagCorrelations: { lag: number; acf: number; pacf: number | null }[]
}

interface CompletePoint {
  observation: number
  value: number
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function summarize(values: readonly number[]) {
  const average = mean(values)
  const sumSquared = values.reduce((sum, value) => sum + (value - average) ** 2, 0)
  return {
    mean: average,
    standardDeviation: Math.sqrt(sumSquared / (values.length - 1)),
    minimum: values.reduce((minimum, value) => Math.min(minimum, value), Infinity),
    maximum: values.reduce((maximum, value) => Math.max(maximum, value), -Infinity),
    sumSquared,
  }
}

function makeResult(
  method: TimeSeriesMethod,
  originalLength: number,
  values: readonly number[],
  points: TimeSeriesPoint[],
  forecasts: { observation: number; value: number }[] = [],
  options: {
    rSquared?: number | null
    rootMeanSquareError?: number | null
    trendCoefficients?: TimeSeriesResult['trendCoefficients']
    smoothingParameters?: TimeSeriesResult['smoothingParameters']
    window?: number | null
    lagCorrelations?: TimeSeriesResult['lagCorrelations']
  } = {},
): TimeSeriesResult {
  const summary = summarize(values)
  return {
    method,
    count: values.length,
    omittedCount: originalLength - values.length,
    mean: summary.mean,
    standardDeviation: summary.standardDeviation,
    minimum: summary.minimum,
    maximum: summary.maximum,
    rSquared: options.rSquared ?? null,
    rootMeanSquareError: options.rootMeanSquareError ?? null,
    trendCoefficients: options.trendCoefficients ?? null,
    smoothingParameters: options.smoothingParameters ?? null,
    window: options.window ?? null,
    points,
    forecasts,
    lagCorrelations: options.lagCorrelations ?? [],
  }
}

function fitTrend(
  points: readonly CompletePoint[],
  method: 'linearTrend' | 'quadraticTrend',
  originalLength: number,
  horizon: number,
): TimeSeriesResult {
  const parameterCount = method === 'linearTrend' ? 2 : 3
  if (points.length <= parameterCount) {
    throw new Error('Trend analysis needs more complete observations than model parameters.')
  }
  const times = points.map((point) => point.observation)
  const timeCenter = mean(times)
  const design = new Matrix(points.length, parameterCount)
  const response = new Matrix(points.length, 1)
  points.forEach((point, index) => {
    const centeredTime = point.observation - timeCenter
    design.set(index, 0, 1)
    design.set(index, 1, centeredTime)
    if (method === 'quadraticTrend') design.set(index, 2, centeredTime ** 2)
    response.set(index, 0, point.value)
  })
  const qr = new QrDecomposition(design)
  if (!qr.isFullRank()) throw new Error('Trend design matrix is rank deficient.')
  const parameters = qr.solve(response)
  const centeredIntercept = parameters.get(0, 0)
  const centeredSlope = parameters.get(1, 0)
  const quadratic = method === 'quadraticTrend' ? parameters.get(2, 0) : 0
  const intercept = centeredIntercept - centeredSlope * timeCenter + quadratic * timeCenter ** 2
  const slope = centeredSlope - 2 * quadratic * timeCenter
  const fittedValues = points.map(
    (point) => intercept + slope * point.observation + quadratic * point.observation ** 2,
  )
  const residuals = points.map((point, index) => point.value - fittedValues[index])
  const summary = summarize(points.map((point) => point.value))
  const residualSumSquares = residuals.reduce((sum, residual) => sum + residual ** 2, 0)
  const rSquared =
    summary.sumSquared === 0
      ? null
      : Math.max(0, Math.min(1, 1 - residualSumSquares / summary.sumSquared))
  const forecasts = Array.from({ length: horizon }, (_, index) => {
    const observation = originalLength + index + 1
    return { observation, value: intercept + slope * observation + quadratic * observation ** 2 }
  })
  return makeResult(
    method,
    originalLength,
    points
      .map((point, index) => ({
        observation: point.observation,
        value: point.value,
        fitted: fittedValues[index],
        residual: residuals[index],
      }))
      .map((point) => point.value),
    points.map((point, index) => ({
      observation: point.observation,
      value: point.value,
      fitted: fittedValues[index],
      residual: residuals[index],
    })),
    forecasts,
    {
      rSquared,
      rootMeanSquareError: Math.sqrt(residualSumSquares / points.length),
      trendCoefficients: {
        intercept,
        slope,
        quadratic: method === 'quadraticTrend' ? quadratic : null,
      },
    },
  )
}

function movingAverage(
  points: readonly CompletePoint[],
  originalLength: number,
  window: number,
): TimeSeriesResult {
  if (!Number.isInteger(window) || window < 2 || window > points.length) {
    throw new Error(
      'Moving-average window must be an integer from 2 to the complete series length.',
    )
  }
  let runningSum = 0
  let windowValues: number[] = []
  let previousObservation: number | null = null
  const pointsWithFit = points.map((point) => {
    if (previousObservation !== null && point.observation !== previousObservation + 1) {
      runningSum = 0
      windowValues = []
    }
    previousObservation = point.observation
    windowValues.push(point.value)
    runningSum += point.value
    if (windowValues.length > window) runningSum -= windowValues.shift()!
    const fitted = windowValues.length === window ? runningSum / window : null
    return {
      observation: point.observation,
      value: point.value,
      fitted,
      residual: fitted === null ? null : point.value - fitted,
    }
  })
  return makeResult(
    'movingAverage',
    originalLength,
    points.map((point) => point.value),
    pointsWithFit,
    [],
    { window },
  )
}

function exponentialSmoothing(
  points: readonly CompletePoint[],
  originalLength: number,
  horizon: number,
  alpha: number,
  beta: number | undefined,
): TimeSeriesResult {
  if (!Number.isFinite(alpha) || alpha <= 0 || alpha > 1) {
    throw new Error('Smoothing alpha must be greater than 0 and at most 1.')
  }
  const isHolt = beta !== undefined
  if (isHolt && (!Number.isFinite(beta) || beta <= 0 || beta > 1)) {
    throw new Error('Holt trend beta must be greater than 0 and at most 1.')
  }
  if (isHolt && points.length < 3)
    throw new Error('Holt smoothing requires at least three complete observations.')
  let level = points[0].value
  let trend = isHolt ? points[1].value - points[0].value : 0
  const fitted = points.map((point, index) => {
    if (index === 0)
      return { observation: point.observation, value: point.value, fitted: null, residual: null }
    const prediction = isHolt ? level + trend : level
    const priorLevel = level
    level = alpha * point.value + (1 - alpha) * prediction
    if (isHolt) trend = beta! * (level - priorLevel) + (1 - beta!) * trend
    return {
      observation: point.observation,
      value: point.value,
      fitted: prediction,
      residual: point.value - prediction,
    }
  })
  const residuals = fitted.flatMap((point) => (point.residual === null ? [] : [point.residual]))
  const rootMeanSquareError = Math.sqrt(
    residuals.reduce((sum, residual) => sum + residual ** 2, 0) / residuals.length,
  )
  const forecasts = Array.from({ length: horizon }, (_, index) => ({
    observation: originalLength + index + 1,
    value: isHolt ? level + (index + 1) * trend : level,
  }))
  return makeResult(
    isHolt ? 'holt' : 'simpleExponential',
    originalLength,
    points.map((point) => point.value),
    fitted,
    forecasts,
    { rootMeanSquareError, smoothingParameters: { alpha, beta: isHolt ? beta! : null } },
  )
}

function autocorrelations(
  points: readonly CompletePoint[],
  maxLag: number,
): TimeSeriesResult['lagCorrelations'] {
  if (!Number.isInteger(maxLag) || maxLag < 1 || maxLag >= points.length || maxLag > 200) {
    throw new Error('Maximum lag must be an integer from 1 to min(n - 1, 200).')
  }
  const values = points.map((point) => point.value)
  const average = mean(values)
  const denominator = values.reduce((sum, value) => sum + (value - average) ** 2, 0)
  if (denominator === 0) throw new Error('Autocorrelation requires a nonconstant series.')
  const acf = [1]
  for (let lag = 1; lag <= maxLag; lag++) {
    let numerator = 0
    for (let index = lag; index < values.length; index++) {
      numerator += (values[index] - average) * (values[index - lag] - average)
    }
    acf.push(numerator / denominator)
  }
  const pacf = [1]
  let previous = [1]
  for (let order = 1; order <= maxLag; order++) {
    const denominatorAtOrder =
      1 -
      previous.slice(1).reduce((sum, coefficient, index) => sum + coefficient * acf[index + 1], 0)
    if (Math.abs(denominatorAtOrder) < 1e-12) {
      throw new Error('Partial autocorrelation recursion is numerically singular for this series.')
    }
    const numerator =
      acf[order] -
      previous
        .slice(1)
        .reduce((sum, coefficient, index) => sum + coefficient * acf[order - index - 1], 0)
    const reflection = numerator / denominatorAtOrder
    const current = [
      1,
      ...previous
        .slice(1)
        .map((coefficient, index) => coefficient - reflection * previous[order - index - 1]),
      reflection,
    ]
    pacf.push(reflection)
    previous = current
  }
  return Array.from({ length: maxLag + 1 }, (_, lag) => ({
    lag,
    acf: acf[lag],
    pacf: lag === 0 ? null : pacf[lag],
  }))
}

export function analyzeTimeSeries(
  input: readonly (number | null | undefined)[],
  options: TimeSeriesOptions,
): TimeSeriesResult {
  const points: CompletePoint[] = []
  input.forEach((value, index) => {
    if (value === null || value === undefined) return
    if (!Number.isFinite(value))
      throw new Error(`Time-series value on row ${index + 1} is not finite.`)
    points.push({ observation: index + 1, value })
  })
  if (points.length < 3)
    throw new Error('Time-series analysis requires at least three complete observations.')
  const horizon = options.forecastHorizon ?? 0
  if (!Number.isInteger(horizon) || horizon < 0 || horizon > 100) {
    throw new Error('Forecast horizon must be an integer from 0 to 100.')
  }
  switch (options.method) {
    case 'linearTrend':
    case 'quadraticTrend':
      return fitTrend(points, options.method, input.length, horizon)
    case 'movingAverage':
      return movingAverage(points, input.length, options.window ?? 3)
    case 'simpleExponential':
      if (horizon < 1) throw new Error('Enter a forecast horizon from 1 to 100.')
      return exponentialSmoothing(points, input.length, horizon, options.alpha ?? 0.3, undefined)
    case 'holt':
      if (horizon < 1) throw new Error('Enter a forecast horizon from 1 to 100.')
      return exponentialSmoothing(
        points,
        input.length,
        horizon,
        options.alpha ?? 0.3,
        options.beta ?? 0.2,
      )
    case 'acf': {
      if (points.length !== input.length) {
        throw new Error(
          'ACF and PACF require an uninterrupted series without missing observations.',
        )
      }
      const lagCorrelations = autocorrelations(
        points,
        options.maxLag ?? Math.min(20, points.length - 1),
      )
      const average = mean(points.map((point) => point.value))
      const series = points.map((point) => ({
        ...point,
        fitted: null,
        residual: point.value - average,
      }))
      return makeResult(
        'acf',
        input.length,
        points.map((point) => point.value),
        series,
        [],
        { lagCorrelations },
      )
    }
  }
}
