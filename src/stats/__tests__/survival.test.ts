import { describe, expect, it } from 'vitest'
import { kaplanMeier } from '../survival'

const times = [1, 2, 3, 2, 3, 4]
const statuses = [1, 1, 0, 1, 1, 0]
const groups = ['A', 'A', 'A', 'B', 'B', 'B']

describe('kaplanMeier', () => {
  it('computes product-limit survival, Greenwood intervals, and median survival by group', () => {
    const result = kaplanMeier(times, statuses, groups)

    expect(result.count).toBe(6)
    expect(result.eventCount).toBe(4)
    expect(result.censoredCount).toBe(2)
    expect(result.curves.map((curve) => curve.group)).toEqual(['A', 'B'])
    expect(result.curves.map((curve) => curve.median)).toEqual([2, 3])
    result.curves[0].points.forEach((point, index) => {
      expect(point.survival).toBeCloseTo([1, 2 / 3, 1 / 3, 1 / 3][index], 12)
    })
    expect(result.curves[0].points[1].lowerConfidenceLimit).toBeLessThan(2 / 3)
    expect(result.curves[0].points[1].upperConfidenceLimit).toBeGreaterThan(2 / 3)
    expect(result.curves[0].points[2].atRisk).toBe(2)
    expect(result.curves[0].points[3].censored).toBe(1)
    expect(result.curves[0].medianConfidenceInterval).toEqual([1, null])
  })

  it('computes the two-group log-rank score and chi-square statistic', () => {
    const result = kaplanMeier(times, statuses, groups)
    const logRank = result.logRank!
    const expectedScore = 0.5 + 0.2 - 1 / 3
    const expectedVariance = 0.25 + 0.36 + 2 / 9

    expect(logRank.observedMinusExpected).toBeCloseTo(expectedScore, 12)
    expect(logRank.variance).toBeCloseTo(expectedVariance, 12)
    expect(logRank.chiSquare).toBeCloseTo(expectedScore ** 2 / expectedVariance, 12)
    expect(logRank.pValue).toBeGreaterThan(0)
    expect(logRank.pValue).toBeLessThan(1)
  })

  it('supports a single all-censored curve and drops incomplete rows', () => {
    const result = kaplanMeier([1, 2, null], [0, 0, 1])

    expect(result.count).toBe(2)
    expect(result.droppedCount).toBe(1)
    expect(result.eventCount).toBe(0)
    expect(result.curves[0].median).toBeNull()
    expect(result.curves[0].points.every((point) => point.survival === 1)).toBe(true)
    expect(result.logRank).toBeNull()
  })

  it('retains two all-censored group curves when log-rank is not estimable', () => {
    const result = kaplanMeier([1, 2, 1, 2], [0, 0, 0, 0], ['A', 'A', 'B', 'B'])

    expect(result.curves).toHaveLength(2)
    expect(result.curves.every((curve) => curve.median === null)).toBe(true)
    expect(result.logRank).toBeNull()
  })

  it('rejects invalid duration/status, mismatched columns, and more than two groups', () => {
    expect(() => kaplanMeier([1], [1], [], 0.05)).toThrow(
      'Time, status, and group columns must have the same number of rows.',
    )
    expect(() => kaplanMeier([-1], [1])).toThrow('finite nonnegative value')
    expect(() => kaplanMeier([1], [2])).toThrow('must be coded 0 (censored) or 1 (event)')
    expect(() => kaplanMeier([1, 2, 3], [1, 0, 1], ['A', 'B', 'C'])).toThrow('at most two groups.')
  })
})
