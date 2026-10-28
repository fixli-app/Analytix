import { useEffect, useRef, useState } from 'react'
import type { Data, Layout } from 'plotly.js'
import type { ImrControlChartResult } from '../stats/imrControlChart'

interface ImrControlChartsProps {
  result: ImrControlChartResult
  language: string
  theme: 'light' | 'dark'
}

export function ImrControlCharts({ result, language, theme }: ImrControlChartsProps) {
  const individualRef = useRef<HTMLDivElement>(null)
  const movingRangeRef = useRef<HTMLDivElement>(null)
  const [loadError, setLoadError] = useState(false)
  const isSwedish = language === 'sv'

  useEffect(() => {
    const individualElement = individualRef.current
    const movingRangeElement = movingRangeRef.current
    if (!individualElement || !movingRangeElement) return

    let active = true
    let plotly: typeof import('plotly.js') | null = null
    const textColor = theme === 'dark' ? '#e4eee8' : '#23322d'
    const gridColor = theme === 'dark' ? '#35483f' : '#dce3dd'
    const signalObservations = new Set(
      result.signals
        .filter((signal) => signal.chart === 'I')
        .flatMap((signal) => signal.observations),
    )
    const movingRangeSignalObservations = new Set(
      result.signals
        .filter((signal) => signal.chart === 'MR')
        .flatMap((signal) => signal.observations),
    )
    const individualX = result.individuals.points.map((point) => point.observation)
    const individualY = result.individuals.points.map((point) => point.value)
    const movingRangeX = result.movingRange.points.map((point) => point.observation)
    const movingRangeY = result.movingRange.points.map((point) => point.value)
    const individualData = makeChartData(
      individualX,
      individualY,
      result.individuals.lowerControlLimit,
      result.individuals.centerLine,
      result.individuals.upperControlLimit,
      signalObservations,
      isSwedish ? 'Individer' : 'Individuals',
      isSwedish,
    )
    const movingRangeData = makeChartData(
      movingRangeX,
      movingRangeY,
      result.movingRange.lowerControlLimit,
      result.movingRange.centerLine,
      result.movingRange.upperControlLimit,
      movingRangeSignalObservations,
      isSwedish ? 'Rörlig variationsbredd' : 'Moving range',
      isSwedish,
    )
    const individualLayout = makeLayout(
      isSwedish ? 'Individvärden' : 'Individual values',
      isSwedish ? 'Observation' : 'Observation',
      isSwedish ? 'Individvärde' : 'Individual value',
      textColor,
      gridColor,
    )
    const movingRangeLayout = makeLayout(
      isSwedish ? 'Rörlig variationsbredd' : 'Moving range',
      isSwedish ? 'Observation' : 'Observation',
      isSwedish ? 'Absolut differens' : 'Absolute difference',
      textColor,
      gridColor,
    )

    void import('plotly.js-dist-min')
      .then(({ default: loadedPlotly }) => {
        plotly = loadedPlotly
        if (!active) {
          loadedPlotly.purge(individualElement)
          loadedPlotly.purge(movingRangeElement)
          return
        }
        return Promise.all([
          loadedPlotly.react(individualElement, individualData, individualLayout, {
            responsive: true,
            displaylogo: false,
          }),
          loadedPlotly.react(movingRangeElement, movingRangeData, movingRangeLayout, {
            responsive: true,
            displaylogo: false,
          }),
        ]).catch(() => {
          if (active) setLoadError(true)
        })
      })
      .catch(() => {
        if (active) setLoadError(true)
      })

    return () => {
      active = false
      if (plotly) {
        plotly.purge(individualElement)
        plotly.purge(movingRangeElement)
      }
    }
  }, [isSwedish, result, theme])

  return (
    <div className="imr-chart-grid">
      <div className="imr-chart-panel">
        <h5>{isSwedish ? 'Individdiagram' : 'Individuals chart'}</h5>
        <ChartLegend isSwedish={isSwedish} />
        <div
          ref={individualRef}
          className="imr-plot"
          role="img"
          aria-label={
            isSwedish ? 'Individdiagram med styrgränser' : 'Individuals chart with control limits'
          }
        />
      </div>
      <div className="imr-chart-panel">
        <h5>{isSwedish ? 'MR-diagram' : 'Moving range chart'}</h5>
        <ChartLegend isSwedish={isSwedish} />
        <div
          ref={movingRangeRef}
          className="imr-plot"
          role="img"
          aria-label={
            isSwedish ? 'MR-diagram med styrgräns' : 'Moving range chart with control limit'
          }
        />
      </div>
      {loadError && (
        <p className="session-caption" role="alert">
          {isSwedish ? 'Diagrammet kunde inte laddas.' : 'The chart could not be loaded.'}
        </p>
      )}
    </div>
  )
}

function ChartLegend({ isSwedish }: { isSwedish: boolean }) {
  return (
    <ul className="imr-chart-legend">
      <li>
        <span className="imr-legend-swatch imr-legend-value" />
        {isSwedish ? 'Mätvärden' : 'Measurements'}
      </li>
      <li>
        <span className="imr-legend-swatch imr-legend-signal" />
        {isSwedish ? 'Signal' : 'Signal'}
      </li>
      <li>
        <span className="imr-legend-swatch imr-legend-limit" />
        UCL / LCL
      </li>
      <li>
        <span className="imr-legend-swatch imr-legend-center" />
        {isSwedish ? 'Centrum' : 'Center'}
      </li>
    </ul>
  )
}

function makeChartData(
  x: number[],
  y: number[],
  lowerLimit: number,
  centerLine: number,
  upperLimit: number,
  signalObservations: Set<number>,
  name: string,
  isSwedish: boolean,
): Data[] {
  const signals = x
    .map((observation, index) => ({ observation, value: y[index] }))
    .filter((point) => signalObservations.has(point.observation))
  const boundaryLine = (
    value: number,
    label: string,
    color: string,
    dash: 'solid' | 'dash',
  ): Data => ({
    type: 'scatter',
    mode: 'lines',
    x: [x[0], x[x.length - 1]],
    y: [value, value],
    name: label,
    line: { color, width: 1.5, dash },
    hoverinfo: 'skip',
  })

  return [
    {
      type: 'scatter',
      mode: 'lines+markers',
      x,
      y,
      name,
      line: { color: '#2f7861', width: 1.5 },
      marker: { color: '#2f7861', size: 6 },
      hovertemplate: `${isSwedish ? 'Observation' : 'Observation'} %{x}<br>%{y}<extra></extra>`,
    },
    {
      type: 'scatter',
      mode: 'markers',
      x: signals.map((point) => point.observation),
      y: signals.map((point) => point.value),
      name: isSwedish ? 'Regelsignal' : 'Rule signal',
      marker: { color: '#d34f3f', size: 10, symbol: 'circle-open', line: { width: 2 } },
      hovertemplate: `${isSwedish ? 'Regelsignal' : 'Rule signal'}<br>${isSwedish ? 'Observation' : 'Observation'} %{x}<br>%{y}<extra></extra>`,
    },
    boundaryLine(upperLimit, 'UCL', '#d34f3f', 'dash'),
    boundaryLine(centerLine, isSwedish ? 'Centrumlinje' : 'Center line', '#63756c', 'solid'),
    boundaryLine(lowerLimit, 'LCL', '#d34f3f', 'dash'),
  ]
}

function makeLayout(
  title: string,
  xTitle: string,
  yTitle: string,
  textColor: string,
  gridColor: string,
): Partial<Layout> {
  return {
    title: { text: title, x: 0.02, xanchor: 'left' },
    autosize: true,
    height: 310,
    margin: { l: 56, r: 18, t: 54, b: 48 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { family: 'DM Sans, sans-serif', color: textColor, size: 11 },
    showlegend: false,
    xaxis: { title: { text: xTitle }, automargin: true, gridcolor: gridColor },
    yaxis: { title: { text: yTitle }, automargin: true, gridcolor: gridColor, zeroline: false },
  }
}
