import { useEffect, useRef, useState } from 'react'
import type { Data, Layout } from 'plotly.js'
import type { GraphModel, GraphTrace } from './graphData'

interface GraphPlotProps {
  graph: GraphModel
  language: string
  theme: 'light' | 'dark'
}

const palette = ['#2f7861', '#e16d4c', '#d2a23b', '#6484a2', '#8e6e9e']

export function GraphPlot({ graph, language, theme }: GraphPlotProps) {
  const plotRef = useRef<HTMLDivElement>(null)
  const [loadError, setLoadError] = useState(false)
  const isSwedish = language === 'sv'

  useEffect(() => {
    const element = plotRef.current
    if (!element) return
    let active = true
    let plotly: typeof import('plotly.js') | null = null
    const data = graph.data.map((trace, index) => toPlotlyTrace(trace, index))
    const textColor = theme === 'dark' ? '#e4eee8' : '#23322d'
    const gridColor = theme === 'dark' ? '#35483f' : '#dce3dd'
    const layout: Partial<Layout> = {
      title: { text: graph.title, x: 0.02, xanchor: 'left' },
      autosize: true,
      height: 390,
      margin: { l: 58, r: graph.cumulativeAxis ? 58 : 20, t: 54, b: 55 },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: { family: 'DM Sans, sans-serif', color: textColor, size: 11 },
      showlegend: graph.data.length > 1,
      legend: { orientation: 'h', y: 1.14, x: 0 },
      bargap: 0.15,
      xaxis: { title: { text: graph.xTitle }, automargin: true, gridcolor: gridColor },
      yaxis: {
        title: { text: graph.yTitle },
        automargin: true,
        gridcolor: gridColor,
        zeroline: false,
      },
      ...(graph.cumulativeAxis
        ? {
            yaxis2: {
              title: { text: isSwedish ? 'Kumulativ procent' : 'Cumulative percent' },
              overlaying: 'y',
              side: 'right',
              range: [0, 100],
              ticksuffix: '%',
              automargin: true,
            },
          }
        : {}),
    }

    void import('plotly.js-dist-min')
      .then(({ default: loadedPlotly }) => {
        plotly = loadedPlotly
        if (!active) {
          loadedPlotly.purge(element)
          return
        }
        return loadedPlotly
          .react(element, data, layout, { responsive: true, displaylogo: false })
          .catch(() => {
            if (active) setLoadError(true)
          })
      })
      .catch(() => {
        if (active) setLoadError(true)
      })

    return () => {
      active = false
      plotly?.purge(element)
    }
  }, [graph, isSwedish, theme])

  return (
    <section className="general-graph" aria-label={graph.title}>
      <header className="general-graph-heading">
        <div>
          <h4>{graph.title}</h4>
          <p>
            {isSwedish
              ? `${graph.sampleCount} kompletta observationer`
              : `${graph.sampleCount} complete observations`}
          </p>
        </div>
      </header>
      <div
        ref={plotRef}
        className="graph-plot"
        role="img"
        aria-label={
          isSwedish ? `${graph.title}, interaktivt diagram` : `${graph.title}, interactive chart`
        }
      />
      {loadError && (
        <p className="session-caption" role="alert">
          {isSwedish ? 'Diagrammet kunde inte laddas.' : 'The chart could not be loaded.'}
        </p>
      )}
    </section>
  )
}

function toPlotlyTrace(trace: GraphTrace, index: number): Data {
  const color = palette[index % palette.length]
  if (trace.type === 'histogram') {
    return { type: 'histogram', x: trace.x as number[], name: trace.name, marker: { color } }
  }
  if (trace.type === 'box') {
    return {
      type: 'box',
      y: trace.y,
      x: trace.x as string[] | undefined,
      name: trace.name,
      marker: { color },
    }
  }
  if (trace.type === 'bar') {
    return { type: 'bar', x: trace.x as string[], y: trace.y, name: trace.name, marker: { color } }
  }
  return {
    type: (trace.x?.length ?? 0) > 5000 ? 'scattergl' : 'scatter',
    x: trace.x as (number | string)[],
    y: trace.y,
    mode: trace.mode,
    name: trace.name,
    yaxis: trace.yAxis,
    marker: { color, size: 7 },
    line: { color, shape: trace.lineShape ?? 'linear', width: 1.6 },
  }
}
