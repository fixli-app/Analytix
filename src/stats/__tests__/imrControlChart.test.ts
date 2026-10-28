import { describe, expect, it } from 'vitest'
import { imrControlChart } from '../imrControlChart'

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
