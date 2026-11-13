import { describe, expect, it } from 'vitest'
import { powerAndSampleSize } from '../../stats/power'
import { parametricSurvival } from '../../stats/parametricSurvival'
import { kaplanMeier } from '../../stats/survival'
import { analyzeTimeSeries } from '../../stats/timeSeries'
import { powerCurveGraph, survivalGraph, timeSeriesGraph } from '../analysisGraphs'

describe('analysis graph builders', () => {
  it('builds a stable power-curve model with a bounded sample-size axis', () => {
    const result = powerAndSampleSize({
      test: 'oneSampleZ',
      mode: 'sampleSize',
      alpha: 0.05,
      sampleSize: 2,
      targetPower: 0.8,
      nullMean: 0,
      alternativeMean: 0.5,
      sigma: 1,
    })
    const graph = powerCurveGraph(result, 'sv')

    expect(graph.kind).toBe('powerCurve')
    expect(graph.yTitle).toBe('Power')
    expect(graph.data[0].x).toEqual(result.curve.map((point) => point.sampleSize))
    expect(graph.data[0].y).toEqual(result.curve.map((point) => point.power))
  })

  it('builds ACF/PACF and fitted/forecast traces with the expected graph kinds', () => {
    const acfResult = analyzeTimeSeries([1, -1, 1, -1, 1, -1], {
      method: 'acf',
      maxLag: 3,
    })
    const acfGraph = timeSeriesGraph(acfResult, 'en')
    expect(acfGraph.kind).toBe('autocorrelation')
    expect(acfGraph.data.map((trace) => trace.name)).toEqual(['ACF', 'PACF'])

    const trendResult = analyzeTimeSeries([6, 8, 10, 12, 14, 16], {
      method: 'linearTrend',
      forecastHorizon: 2,
    })
    const trendGraph = timeSeriesGraph(trendResult, 'sv')
    expect(trendGraph.kind).toBe('timeSeries')
    expect(trendGraph.data.map((trace) => trace.name)).toEqual([
      'Observerat',
      'Anpassat',
      'Prognos',
    ])
  })

  it('adds Greenwood bands, censor marks, and parametric survival overlays', () => {
    const times = [1, 2, 3, 2, 3, 4]
    const statuses = [1, 1, 0, 1, 1, 0]
    const groups = ['A', 'A', 'A', 'B', 'B', 'B']
    const km = kaplanMeier(times, statuses, groups)
    const parametric = parametricSurvival(times, statuses, groups)
    const graph = survivalGraph(km, parametric, 'sv')

    expect(graph.kind).toBe('survival')
    expect(graph.data.filter((trace) => trace.fill === 'tonexty')).toHaveLength(2)
    expect(graph.data.filter((trace) => trace.mode === 'markers')).toHaveLength(2)
    expect(graph.data.filter((trace) => trace.lineDash === 'dash')).toHaveLength(4)
  })
})
