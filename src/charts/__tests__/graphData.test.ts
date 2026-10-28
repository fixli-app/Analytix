import { describe, expect, it } from 'vitest'
import { buildGraph } from '../graphData'

describe('buildGraph', () => {
  it('builds a histogram from complete numeric observations', () => {
    const graph = buildGraph({ kind: 'histogram', values: [1, null, 2, 3], language: 'sv' })

    expect(graph.title).toBe('Histogram')
    expect(graph.sampleCount).toBe(3)
    expect(graph.data[0]).toMatchObject({ type: 'histogram', x: [1, 2, 3] })
  })

  it('groups boxplots and individual value plots by category', () => {
    const input = {
      values: [2, 3, 5, null, 7],
      categories: ['B', 'A', 'B', 'A', 'A'],
      language: 'sv',
    }
    const boxplot = buildGraph({ ...input, kind: 'boxplot' })
    const individuals = buildGraph({ ...input, kind: 'individual' })

    expect(boxplot.data.map((trace) => [trace.name, trace.y])).toEqual([
      ['A', [3, 7]],
      ['B', [2, 5]],
    ])
    expect(individuals.data[0]).toMatchObject({ type: 'scatter', x: ['A', 'A'], y: [3, 7] })
    expect(individuals.sampleCount).toBe(4)
  })

  it('uses only complete pairs for scatterplots', () => {
    const graph = buildGraph({
      kind: 'scatter',
      values: [10, null, 30],
      xValues: [1, 2, 3],
      language: 'en',
    })

    expect(graph.sampleCount).toBe(2)
    expect(graph.data[0]).toMatchObject({ x: [1, 3], y: [10, 30] })

    const missingX = buildGraph({
      kind: 'scatter',
      values: [10, 20, 30],
      xValues: [1, null, 3],
      language: 'en',
    })
    expect(missingX.data[0]).toMatchObject({ x: [1, 3], y: [10, 30] })
  })

  it('aggregates bar frequencies and sorts Pareto categories by count', () => {
    const categories = ['B', 'A', 'B', 'C', 'A', 'B', null, '']
    const bar = buildGraph({ kind: 'bar', categories, language: 'en' })
    const pareto = buildGraph({ kind: 'pareto', categories, language: 'en' })

    expect(bar.data[0]).toMatchObject({ x: ['A', 'B', 'C'], y: [2, 3, 1] })
    expect(pareto.data[0]).toMatchObject({ x: ['B', 'A', 'C'], y: [3, 2, 1] })
    expect(pareto.data[1]).toMatchObject({
      x: ['B', 'A', 'C'],
      y: [50, 83.33333333333333, 100],
      yAxis: 'y2',
    })
    expect(pareto.cumulativeAxis).toBe(true)
  })

  it('builds ordered ECDF and time series points', () => {
    const ecdf = buildGraph({ kind: 'ecdf', values: [3, 1, 2], language: 'en' })
    const timeSeries = buildGraph({ kind: 'timeSeries', values: [4, null, 8], language: 'en' })

    expect(ecdf.data[0]).toMatchObject({ x: [1, 2, 3], y: [1 / 3, 2 / 3, 1] })
    expect(timeSeries.data[0]).toMatchObject({ x: [1, 3], y: [4, 8] })
  })

  it('rejects empty and non-finite input', () => {
    expect(() => buildGraph({ kind: 'histogram', values: [null], language: 'sv' })).toThrow(
      'Minst ett numeriskt värde krävs för diagrammet.',
    )
    expect(() => buildGraph({ kind: 'bar', categories: [], language: 'sv' })).toThrow(
      'Minst en kategorisk observation krävs för diagrammet.',
    )
    expect(() => buildGraph({ kind: 'histogram', values: [Number.NaN], language: 'sv' })).toThrow(
      'Diagrammet innehåller värden som inte är ändliga tal.',
    )
  })
})
