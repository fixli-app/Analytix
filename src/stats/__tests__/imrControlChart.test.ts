import { describe, expect, it } from 'vitest'
import { findNelsonRuleSignals, imrControlChart } from '../imrControlChart'

describe('imrControlChart', () => {
  it('calculates individual and moving-range limits for a hand-worked fixture', () => {
    const result = imrControlChart([1, 2, 3, 4, 5])

    expect(result.count).toBe(5)
    expect(result.mean).toBe(3)
    expect(result.averageMovingRange).toBe(1)
    expect(result.withinStandardDeviation).toBeCloseTo(1 / 1.128, 12)
    expect(result.individuals.lowerControlLimit).toBeCloseTo(3 - 3 / 1.128, 12)
    expect(result.individuals.centerLine).toBe(3)
    expect(result.individuals.upperControlLimit).toBeCloseTo(3 + 3 / 1.128, 12)
    expect(result.movingRange.lowerControlLimit).toBe(0)
    expect(result.movingRange.centerLine).toBe(1)
    expect(result.movingRange.upperControlLimit).toBeCloseTo(3.267, 12)
    expect(result.signals).toEqual([])
  })

  it('flags beyond-limit points and eight consecutive points on one side', () => {
    const outlier = imrControlChart([0, 0, 0, 0, 20])
    expect(outlier.signals).toContainEqual({
      chart: 'I',
      rule: 'beyond-limit',
      observations: [5],
    })
    expect(outlier.signals).toContainEqual({
      chart: 'MR',
      rule: 'beyond-limit',
      observations: [5],
    })

    const shifted = imrControlChart([
      0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 5, 6, 5, 6, 5, 6, 5, 6, 5, 6,
    ])
    expect(shifted.signals).toContainEqual({
      chart: 'I',
      rule: 'eight-on-one-side',
      observations: [21, 22, 23, 24, 25, 26, 27, 28],
    })
    expect(shifted.signals.filter((signal) => signal.rule === 'eight-on-one-side')).toEqual([
      { chart: 'I', rule: 'eight-on-one-side', observations: [1, 2, 3, 4, 5, 6, 7, 8] },
      { chart: 'I', rule: 'eight-on-one-side', observations: [21, 22, 23, 24, 25, 26, 27, 28] },
    ])
  })

  it('preserves row positions and does not calculate moving ranges across missing rows', () => {
    const result = imrControlChart([1, null, 3, 4])

    expect(result.individuals.points.map((point) => point.observation)).toEqual([1, 3, 4])
    expect(result.movingRange.points).toEqual([{ observation: 4, value: 1 }])
  })

  it('does not count a run across a missing observation', () => {
    const result = imrControlChart([0, 1, 0, 1, null, 0, 1, 0, 1, 10, 11, 10, 11])

    expect(result.signals.filter((signal) => signal.rule === 'eight-on-one-side')).toEqual([])
  })

  it('detects Nelson rules 2 through 8 with contiguous windows', () => {
    const cases = [
      { rule: 'nelson-rule-2', values: Array.from({ length: 9 }, () => 0.25) },
      { rule: 'nelson-rule-3', values: [-0.5, -0.3, -0.1, 0.1, 0.3, 0.5] },
      { rule: 'nelson-rule-4', values: Array.from({ length: 14 }, (_, index) => index % 2) },
      { rule: 'nelson-rule-5', values: [2.1, 0, 2.2] },
      { rule: 'nelson-rule-6', values: [1.1, 1.2, 0, 1.3, 1.4] },
      { rule: 'nelson-rule-7', values: Array.from({ length: 15 }, () => 0.5) },
      { rule: 'nelson-rule-8', values: [1.1, -1.1, 1.2, -1.2, 1.1, -1.1, 1.2, -1.2] },
    ] as const

    cases.forEach(({ rule, values }) => {
      const points = values.map((value, index) => ({ observation: index + 1, value }))
      expect(findNelsonRuleSignals(points, 0, 1)).toContainEqual(expect.objectContaining({ rule }))
    })
  })

  it('breaks Nelson rule windows at missing observations and replaces the basic eight-run rule', () => {
    const gapPoints = [1, 2, 3, 4, 6, 7, 8, 9, 10].map((observation) => ({
      observation,
      value: 0.25,
    }))
    expect(findNelsonRuleSignals(gapPoints, 0, 1)).toEqual([])

    const values = [
      0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 5, 6, 5, 6, 5, 6, 5, 6, 5, 6,
    ]
    const basic = imrControlChart(values)
    const nelson = imrControlChart(values, 'nelson')
    expect(basic.signals.some((signal) => signal.rule === 'eight-on-one-side')).toBe(true)
    expect(nelson.ruleSet).toBe('nelson')
    expect(nelson.signals.some((signal) => signal.rule === 'eight-on-one-side')).toBe(false)
    expect(nelson.signals.some((signal) => signal.rule === 'nelson-rule-2')).toBe(true)
  })

  it('rejects invalid values and insufficient adjacent observations', () => {
    expect(() => imrControlChart([1, Number.NaN])).toThrow(
      'Kolumnen innehåller värden som inte är ändliga tal.',
    )
    expect(() => imrControlChart([1, null])).toThrow(
      'Minst två numeriska observationer krävs för I-MR-diagrammet.',
    )
    expect(() => imrControlChart([1, null, 3])).toThrow(
      'Minst ett par intilliggande numeriska observationer krävs för I-MR-diagrammet.',
    )
  })
})
