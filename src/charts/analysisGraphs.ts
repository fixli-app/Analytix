import type { GraphModel, GraphTrace } from './graphData'
import type { PowerResult } from '../stats/power'
import type { ParametricSurvivalResult } from '../stats/parametricSurvival'
import type { KaplanMeierResult } from '../stats/survival'
import type { TimeSeriesResult } from '../stats/timeSeries'

export function powerCurveGraph(result: PowerResult, language: string): GraphModel {
  const isSwedish = language === 'sv'
  return {
    kind: 'powerCurve',
    title: isSwedish ? 'Powerkurva' : 'Power curve',
    xTitle: isSwedish ? 'Stickprovsstorlek per grupp' : 'Sample size per group',
    yTitle: 'Power',
    sampleCount: result.curve.length,
    cumulativeAxis: false,
    data: [
      {
        type: 'scatter',
        mode: 'lines',
        name: isSwedish ? 'Uppnådd power' : 'Achieved power',
        x: result.curve.map((point) => point.sampleSize),
        y: result.curve.map((point) => point.power),
      },
    ],
  }
}

export function timeSeriesGraph(result: TimeSeriesResult, language: string): GraphModel {
  const isSwedish = language === 'sv'
  if (result.method === 'acf') {
    return {
      kind: 'autocorrelation',
      title: 'ACF / PACF',
      xTitle: isSwedish ? 'Lagg' : 'Lag',
      yTitle: 'Correlation',
      sampleCount: result.count,
      cumulativeAxis: false,
      data: [
        {
          type: 'scatter',
          mode: 'lines+markers',
          name: 'ACF',
          x: result.lagCorrelations.map((lag) => lag.lag),
          y: result.lagCorrelations.map((lag) => lag.acf),
        },
        {
          type: 'scatter',
          mode: 'lines+markers',
          name: 'PACF',
          x: result.lagCorrelations.flatMap((lag) => (lag.pacf === null ? [] : [lag.lag])),
          y: result.lagCorrelations.flatMap((lag) => (lag.pacf === null ? [] : [lag.pacf])),
        },
      ],
    }
  }
  const data: GraphTrace[] = [
    {
      type: 'scatter',
      mode: 'lines+markers',
      name: isSwedish ? 'Observerat' : 'Observed',
      x: result.points.map((point) => point.observation),
      y: result.points.map((point) => point.value),
    },
  ]
  const fitted = result.points.filter(
    (point): point is typeof point & { fitted: number } => point.fitted !== null,
  )
  if (fitted.length > 0) {
    data.push({
      type: 'scatter',
      mode: 'lines',
      name: isSwedish ? 'Anpassat' : 'Fitted',
      x: fitted.map((point) => point.observation),
      y: fitted.map((point) => point.fitted),
    })
  }
  if (result.forecasts.length > 0) {
    data.push({
      type: 'scatter',
      mode: 'lines+markers',
      lineDash: 'dash',
      name: isSwedish ? 'Prognos' : 'Forecast',
      x: result.forecasts.map((point) => point.observation),
      y: result.forecasts.map((point) => point.value),
    })
  }
  return {
    kind: 'timeSeries',
    title: isSwedish ? 'Tidsserieanalys' : 'Time-series analysis',
    xTitle: isSwedish ? 'Observation' : 'Observation',
    yTitle: isSwedish ? 'Mätvärde' : 'Value',
    sampleCount: result.count,
    cumulativeAxis: false,
    data,
  }
}

export function survivalGraph(
  result: KaplanMeierResult,
  parametric: ParametricSurvivalResult | undefined,
  language: string,
): GraphModel {
  const isSwedish = language === 'sv'
  const data = result.curves.flatMap((curve, curveIndex): GraphTrace[] => {
    const color = curveIndex === 0 ? '#2f7861' : '#e16d4c'
    const censoredPoints = curve.points.filter((point) => point.censored > 0)
    const time = curve.points.map((point) => point.time)
    return [
      {
        type: 'scatter',
        mode: 'lines',
        lineShape: 'hv',
        name: `${curve.group} upper CI`,
        x: time,
        y: curve.points.map((point) => point.upperConfidenceLimit),
        color,
        showLegend: false,
      },
      {
        type: 'scatter',
        mode: 'lines',
        lineShape: 'hv',
        name: `${curve.group} confidence interval`,
        x: time,
        y: curve.points.map((point) => point.lowerConfidenceLimit),
        color,
        fill: 'tonexty',
        fillColor: curveIndex === 0 ? 'rgba(47, 120, 97, 0.16)' : 'rgba(225, 109, 76, 0.16)',
        showLegend: false,
      },
      {
        type: 'scatter',
        mode: 'lines',
        lineShape: 'hv',
        name: curve.group,
        x: time,
        y: curve.points.map((point) => point.survival),
        color,
      },
      {
        type: 'scatter',
        mode: 'markers',
        name: isSwedish ? `Censurerad · ${curve.group}` : `Censored · ${curve.group}`,
        x: censoredPoints.map((point) => point.time),
        y: censoredPoints.map((point) => point.survival),
        color,
        showLegend: false,
      },
    ]
  })
  for (const curve of parametric?.curves ?? []) {
    const groupIndex = result.curves.findIndex((item) => item.group === curve.group)
    data.push({
      type: 'scatter',
      mode: 'lines',
      lineDash: 'dash',
      name: `${curve.group} ${curve.distribution === 'weibull' ? 'Weibull' : 'Exponential'}`,
      x: curve.times,
      y: curve.survival,
      color: groupIndex === 0 ? '#2f7861' : '#e16d4c',
    })
  }
  return {
    kind: 'survival',
    title: isSwedish ? 'Kaplan–Meier-överlevnad' : 'Kaplan-Meier survival',
    xTitle: isSwedish ? 'Tid' : 'Time',
    yTitle: isSwedish ? 'Överlevnadssannolikhet' : 'Survival probability',
    sampleCount: result.count,
    cumulativeAxis: false,
    data,
  }
}
