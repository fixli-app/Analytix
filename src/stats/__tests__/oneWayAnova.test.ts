import { describe, expect, it } from 'vitest'
import jStat from 'jstat'
import { oneWayAnova, studentizedRangeCdf } from '../oneWayAnova'

describe('oneWayAnova', () => {
  it('computes hand-checked sums of squares, F statistic, and effect sizes', () => {
    const result = oneWayAnova(
      [8, 9, 10, 11, 12, 13, 14, 15, 16],
      ['A', 'A', 'A', 'B', 'B', 'B', 'C', 'C', 'C'],
    )

    expect(result.groups.map((group) => group.mean)).toEqual([9, 12, 15])
    expect(result.betweenGroupSumSquares).toBe(54)
    expect(result.withinGroupSumSquares).toBe(6)
    expect(result.betweenGroupDegreesOfFreedom).toBe(2)
    expect(result.withinGroupDegreesOfFreedom).toBe(6)
    expect(result.fStatistic).toBe(27)
    expect(result.etaSquared).toBeCloseTo(0.9, 12)
    expect(result.omegaSquared).toBeCloseTo(52 / 61, 12)
    expect(result.pValue).toBeCloseTo(0.001, 10)
  })

  it('matches Tukey-Kramer with a two-sided pooled t test for two groups', () => {
    const result = oneWayAnova([1, 2, 3, 5, 6, 8], ['A', 'A', 'A', 'B', 'B', 'B'])
    const pair = result.pairwise[0]
    const pooledTTwoSided =
      2 *
      (1 - jStat.studentt.cdf(pair.qStatistic / Math.sqrt(2), result.withinGroupDegreesOfFreedom))

    expect(pair.adjustedPValue).toBeCloseTo(pooledTTwoSided, 12)
    expect(pair.confidenceInterval[0]).toBeLessThan(pair.meanDifference)
    expect(pair.confidenceInterval[1]).toBeGreaterThan(pair.meanDifference)
  })

  it('computes monotone studentized-range probabilities and rejects invalid designs', () => {
    const lower = studentizedRangeCdf(2, 3, 12)
    const upper = studentizedRangeCdf(4, 3, 12)
    expect(lower).toBeGreaterThan(0)
    expect(upper).toBeGreaterThan(lower)
    expect(upper).toBeLessThan(1)

    expect(() => oneWayAnova([1, 2], ['A', 'A'])).toThrow(
      'One-way ANOVA requires at least two groups.',
    )
    expect(() => oneWayAnova([1, null, 2], ['A', 'A', 'B'])).toThrow(
      'Every group must contain at least two complete observations.',
    )
    expect(() => oneWayAnova([1, 1, 2, 2], ['A', 'A', 'B', 'B'])).toThrow(
      'Within-group variation must be greater than zero for ANOVA.',
    )
  })
})
