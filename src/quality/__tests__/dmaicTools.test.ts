import { describe, expect, it } from 'vitest'
import {
  analyzeRelations,
  calculateCopq,
  calculateDecisionMatrix,
  calculatePughMatrix,
  compareBeforeAfter,
  compareBenchmark,
  evaluateFaultTree,
} from '../dmaicTools'

describe('calculateDecisionMatrix', () => {
  it('ranks alternatives by weighted score and normalizes to the available maximum', () => {
    const results = calculateDecisionMatrix(
      [
        { id: 'cost', name: 'Cost', weight: 3 },
        { id: 'quality', name: 'Quality', weight: 5 },
      ],
      [
        { id: 'a', name: 'A', scores: { cost: 5, quality: 3 } },
        { id: 'b', name: 'B', scores: { cost: 3, quality: 5 } },
      ],
    )
    expect(results.map((result) => result.name)).toEqual(['B', 'A'])
    expect(results[0].weightedScore).toBe(34)
    expect(results[0].maximumScore).toBe(40)
    expect(results[0].normalizedScore).toBe(85)
  })
})

describe('calculatePughMatrix', () => {
  it('compares alternatives against a same-rated baseline and ranks net advantages', () => {
    const results = calculatePughMatrix(
      [
        { id: 'cost', name: 'Cost' },
        { id: 'quality', name: 'Quality' },
        { id: 'time', name: 'Time' },
      ],
      [
        { id: 'base', name: 'Baseline', scores: { cost: 'same', quality: 'same', time: 'same' } },
        { id: 'a', name: 'Option A', scores: { cost: 'plus', quality: 'plus', time: 'minus' } },
        { id: 'b', name: 'Option B', scores: { cost: 'plus', quality: 'same', time: 'minus' } },
      ],
      'base',
    )
    expect(results.map((result) => [result.name, result.net])).toEqual([
      ['Option A', 1],
      ['Option B', 0],
    ])
  })
})

describe('analyzeRelations', () => {
  it('counts incoming/outgoing relations and ranks the most connected factors', () => {
    const result = analyzeRelations(
      [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
        { id: 'c', label: 'C' },
      ],
      [
        { id: 'ab', fromId: 'a', toId: 'b' },
        { id: 'ac', fromId: 'a', toId: 'c' },
        { id: 'bc', fromId: 'b', toId: 'c' },
      ],
    )
    expect(result[0]).toMatchObject({ label: 'A', outgoing: 2, incoming: 0, totalConnections: 2 })
    expect(result.find((node) => node.label === 'C')).toMatchObject({ incoming: 2, outgoing: 0 })
  })
})

describe('benchmark and before-after comparisons', () => {
  it('reports the direction and relative size of a benchmark gap', () => {
    const results = compareBenchmark([
      { id: 'a', metric: 'Yield', ours: 80, benchmark: 90, direction: 'higher', unit: '%' },
      { id: 'b', metric: 'Lead time', ours: 12, benchmark: 10, direction: 'lower', unit: 'days' },
      { id: 'c', metric: 'Cost', ours: 95, benchmark: 90, direction: 'higher', unit: 'SEK' },
    ])
    expect(results.map((row) => row.position)).toEqual(['behind', 'behind', 'ahead'])
    expect(results[0].gapPercent).toBeCloseTo((10 / 90) * 100, 12)
    expect(results[1].gapPercent).toBe(20)
  })

  it('compares pre/post values according to the desired direction', () => {
    const results = compareBeforeAfter([
      { id: 'a', metric: 'Yield', before: 80, after: 90, direction: 'higher', unit: '%' },
      { id: 'b', metric: 'Lead time', before: 12, after: 9, direction: 'lower', unit: 'days' },
      { id: 'c', metric: 'Defects', before: 3, after: 5, direction: 'lower', unit: 'ppm' },
    ])
    expect(results.map((row) => row.status)).toEqual(['improved', 'improved', 'worsened'])
    expect(results[0].improvementPercent).toBe(12.5)
    expect(results[1].improvementPercent).toBe(25)
  })
})

describe('calculateCopq', () => {
  it('separates failure cost from appraisal and prevention cost', () => {
    const result = calculateCopq({
      currency: 'SEK',
      internalFailure: 12000,
      externalFailure: 8000,
      appraisal: 5000,
      prevention: 5000,
    })
    expect(result.costOfPoorQuality).toBe(20000)
    expect(result.costOfGoodQuality).toBe(10000)
    expect(result.totalQualityCost).toBe(30000)
    expect(result.failureCostPercent).toBeCloseTo((2 / 3) * 100, 12)
  })
})

describe('evaluateFaultTree', () => {
  it('calculates independent AND and OR gate probabilities', () => {
    const nodes = [
      { id: 'top', parentId: '', label: 'Top event', kind: 'or' as const, probability: 0 },
      { id: 'a', parentId: 'top', label: 'A', kind: 'event' as const, probability: 0.1 },
      { id: 'b', parentId: 'top', label: 'B gate', kind: 'and' as const, probability: 0 },
      { id: 'c', parentId: 'b', label: 'C', kind: 'event' as const, probability: 0.2 },
      { id: 'd', parentId: 'b', label: 'D', kind: 'event' as const, probability: 0.3 },
    ]
    const result = evaluateFaultTree(nodes)
    expect(result.root).toBe('Top event')
    expect(result.probability).toBeCloseTo(1 - (1 - 0.1) * (1 - 0.06), 12)
  })

  it('rejects cyclic trees and invalid gate layouts', () => {
    expect(() =>
      evaluateFaultTree([
        { id: 'a', parentId: 'b', label: 'A', kind: 'or', probability: 0 },
        { id: 'b', parentId: 'a', label: 'B', kind: 'or', probability: 0 },
      ]),
    ).toThrow('innehåller en cykel')
    expect(() =>
      evaluateFaultTree([
        { id: 'top', parentId: '', label: 'Top', kind: 'and', probability: 0 },
        { id: 'a', parentId: 'top', label: 'A', kind: 'event', probability: 0.1 },
      ]),
    ).toThrow('minst två underhändelser')
  })
})
