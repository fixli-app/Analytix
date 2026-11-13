import { describe, expect, it } from 'vitest'
import { analyzeTimeSeries } from '../timeSeries'

describe('analyzeTimeSeries', () => {
  it('fits a linear trend with QR and forecasts future observations', () => {
    const values = Array.from({ length: 10 }, (_, index) => 4 + 2 * (index + 1))
    const result = analyzeTimeSeries(values, {
      method: 'linearTrend',
      forecastHorizon: 2,
    })

    expect(result.trendCoefficients?.intercept).toBeCloseTo(4, 12)
    expect(result.trendCoefficients?.slope).toBeCloseTo(2, 12)
    expect(result.rSquared).toBeCloseTo(1, 12)
    expect(result.forecasts.map((point) => point.value)).toEqual([
      expect.closeTo(26, 12),
      expect.closeTo(28, 12),
    ])
  })

  it('computes a trailing moving average without changing source row indices', () => {
    const result = analyzeTimeSeries([1, 2, null, 4, 5, 6], {
      method: 'movingAverage',
      window: 2,
    })

    expect(result.omittedCount).toBe(1)
    expect(result.points.map((point) => point.observation)).toEqual([1, 2, 4, 5, 6])
    expect(result.points.map((point) => point.fitted)).toEqual([null, 1.5, null, 4.5, 5.5])
  })

  it('computes simple and Holt exponential forecasts', () => {
    const simple = analyzeTimeSeries([10, 12, 14], {
      method: 'simpleExponential',
      alpha: 0.5,
      forecastHorizon: 2,
    })
    expect(simple.points.map((point) => point.fitted)).toEqual([null, 10, 11])
    expect(simple.forecasts.map((point) => point.value)).toEqual([12.5, 12.5])

    const holt = analyzeTimeSeries([10, 12, 14], {
      method: 'holt',
      alpha: 1,
      beta: 1,
      forecastHorizon: 2,
    })
    expect(holt.forecasts.map((point) => point.value)).toEqual([16, 18])
  })

  it('computes ACF and PACF lags and validates forecast and lag settings', () => {
    const result = analyzeTimeSeries([1, -1, 1, -1, 1, -1], {
      method: 'acf',
      maxLag: 3,
    })
    expect(result.lagCorrelations[0].acf).toBe(1)
    expect(result.lagCorrelations[1].acf).toBeCloseTo(-5 / 6, 12)
    expect(result.lagCorrelations[1].pacf).toBeCloseTo(-5 / 6, 12)
    expect(result.lagCorrelations).toHaveLength(4)
    expect(() => analyzeTimeSeries([1, 2, 3], { method: 'holt', forecastHorizon: 0 })).toThrow(
      'Enter a forecast horizon',
    )
    expect(() => analyzeTimeSeries([1, 2, 3], { method: 'acf', maxLag: 3 })).toThrow(
      'Maximum lag must be',
    )
    expect(() => analyzeTimeSeries([1, null, 2, 3], { method: 'acf', maxLag: 1 })).toThrow(
      'ACF and PACF require an uninterrupted series',
    )
  })
})
