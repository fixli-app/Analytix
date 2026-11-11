import { useEffect, useRef, useState } from 'react'
import type { Data, Layout } from 'plotly.js'
import type {
  SubgroupChartLimits,
  SubgroupControlChartResult,
} from '../quality/subgroupControlChart'

interface SubgroupControlChartsProps {
  result: SubgroupControlChartResult
  language: string
  theme: 'light' | 'dark'
}

export function SubgroupControlCharts({ result, language, theme }: SubgroupControlChartsProps) {
  const xbarRef = useRef<HTMLDivElement>(null)
  const variabilityRef = useRef<HTMLDivElement>(null)
  const [loadError, setLoadError] = useState(false)
  const isSwedish = language === 'sv'

  useEffect(() => {
    const xbarElement = xbarRef.current
    const variabilityElement = variabilityRef.current
    if (!xbarElement || !variabilityElement) return

    let active = true
    let plotly: typeof import('plotly.js') | null = null
    const textColor = theme === 'dark' ? '#e4eee8' : '#23322d'
    const gridColor = theme === 'dark' ? '#35483f' : '#dce3dd'
    const xbarData = makeSubgroupData(result.xbar, isSwedish ? 'Xbar' : 'Xbar', isSwedish)
    const variabilityData = makeSubgroupData(
      result.variability,
      result.variabilityChart.toUpperCase(),
      isSwedish,
    )
    const xbarLayout = makeLayout(
      isSwedish ? 'Subgruppsmedelvärde' : 'Subgroup means',
      isSwedish ? 'Subgrupp' : 'Subgroup',
      isSwedish ? 'Medelvärde' : 'Mean',
      textColor,
      gridColor,
    )
    const variabilityTitle = result.variabilityChart.toUpperCase()
    const variabilityLayout = makeLayout(
      isSwedish ? `${variabilityTitle}-diagram` : `${variabilityTitle} chart`,
      isSwedish ? 'Subgrupp' : 'Subgroup',
      result.variabilityChart === 'r'
        ? isSwedish
          ? 'Variationsbredd'
          : 'Range'
        : isSwedish
          ? 'Standardavvikelse'
          : 'Standard deviation',
      textColor,
      gridColor,
    )

    void import('plotly.js-dist-min')
      .then(({ default: loadedPlotly }) => {
        plotly = loadedPlotly
        if (!active) {
          loadedPlotly.purge(xbarElement)
          loadedPlotly.purge(variabilityElement)
          return
        }
        return Promise.all([
          loadedPlotly.react(xbarElement, xbarData, xbarLayout, {
            responsive: true,
            displaylogo: false,
          }),
          loadedPlotly.react(variabilityElement, variabilityData, variabilityLayout, {
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
        plotly.purge(xbarElement)
        plotly.purge(variabilityElement)
      }
    }
  }, [isSwedish, result, theme])

  return (
    <div className="imr-chart-grid">
      <div className="imr-chart-panel">
        <h5>{isSwedish ? 'Xbar-diagram' : 'Xbar chart'}</h5>
        <div
          ref={xbarRef}
          className="imr-plot"
          role="img"
          aria-label={isSwedish ? 'Xbar-diagram med styrgränser' : 'Xbar chart with control limits'}
        />
      </div>
      <div className="imr-chart-panel">
        <h5>
          {isSwedish
            ? `${result.variabilityChart.toUpperCase()}-diagram`
            : `${result.variabilityChart.toUpperCase()} chart`}
        </h5>
        <div
          ref={variabilityRef}
          className="imr-plot"
          role="img"
          aria-label={
            isSwedish
              ? `${result.variabilityChart.toUpperCase()}-diagram med styrgränser`
              : `${result.variabilityChart.toUpperCase()} chart with control limits`
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

function makeSubgroupData(chart: SubgroupChartLimits, name: string, isSwedish: boolean): Data[] {
  const x = chart.points.map((point) => point.subgroup)
  const y = chart.points.map((point) => point.value)
  const line = (value: number, label: string, color: string, dash: 'solid' | 'dash'): Data => ({
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
      marker: { color: '#2f7861', size: 7 },
      hovertemplate: `${isSwedish ? 'Subgrupp' : 'Subgroup'} %{x}<br>%{y}<extra></extra>`,
    },
    line(chart.upperControlLimit, 'UCL', '#d34f3f', 'dash'),
    line(chart.centerLine, isSwedish ? 'Centrumlinje' : 'Center line', '#63756c', 'solid'),
    line(chart.lowerControlLimit, 'LCL', '#d34f3f', 'dash'),
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
    showlegend: true,
    legend: { orientation: 'h', y: 1.16, x: 0 },
    xaxis: { title: { text: xTitle }, automargin: true, gridcolor: gridColor, type: 'category' },
    yaxis: { title: { text: yTitle }, automargin: true, gridcolor: gridColor, zeroline: false },
  }
}
