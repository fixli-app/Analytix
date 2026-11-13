import { describe, expect, it } from 'vitest'
import {
  friedman,
  kruskalWallis,
  mannWhitney,
  moodMedian,
  runsTest,
  signTest,
  wilcoxonSignedRank,
} from '../nonparametric'

describe('nonparametric tests', () => {
  it('computes tie-corrected Mann-Whitney U with continuity-corrected normal approximation', () => {
    const result = mannWhitney([1, 2, 3], [4, 5, 6])
    expect(result.count1).toBe(3)
    expect(result.count2).toBe(3)
    expect(result.uStatistic).toBe(0)
    expect(result.zStatistic).toBeCloseTo(-1.745743, 5)
    expect(result.pValue).toBeCloseTo(0.0808556, 5)
    expect(result.rankBiserialCorrelation).toBe(-1)

    const tied = mannWhitney([1, 2, 2], [2, 3, 4])
    expect(tied.pValue).toBeGreaterThan(0)
    expect(tied.pValue).toBeLessThan(1)
  })

  it('computes Kruskal-Wallis H and tie-corrected group summaries', () => {
    const result = kruskalWallis(
      [1, 2, 3, 4, 5, 6, 7, 8, 9],
      ['A', 'A', 'A', 'B', 'B', 'B', 'C', 'C', 'C'],
    )
    expect(result.groups.map((group) => group.meanRank)).toEqual([2, 5, 8])
    expect(result.statistic).toBeCloseTo(7.2, 12)
    expect(result.degreesOfFreedom).toBe(2)
    expect(result.pValue).toBeCloseTo(0.0273237, 6)

    const tied = kruskalWallis([1, 1, 2, 2, 3, 3], ['A', 'B', 'A', 'B', 'A', 'B'])
    expect(tied.tieCorrection).toBeLessThan(1)
    expect(tied.statistic).toBe(0)
  })

  it('computes an exact two-sided sign test and excludes ties', () => {
    const result = signTest([1, 2, 3, 4, 8], 5)
    expect(result.positive).toBe(1)
    expect(result.negative).toBe(4)
    expect(result.effectiveCount).toBe(5)
    expect(result.pValue).toBeCloseTo(0.375, 12)
    expect(signTest([4, 5, 6, 7], 5).ties).toBe(1)
  })

  it('computes median-based runs test with ties excluded', () => {
    const result = runsTest([1, 2, 3, 7, 8, 9])
    expect(result.median).toBe(5)
    expect(result.runs).toBe(2)
    expect(result.expectedRuns).toBe(4)
    expect(result.zStatistic).toBeCloseTo(-1.369306, 5)
    expect(result.pValue).toBeCloseTo(0.1709035202, 8)
    expect(runsTest([1, 2, 3, 3, 4, 5, 6]).ties).toBe(2)
  })

  it('computes Wilcoxon signed-rank with Walsh/Hodges-Lehmann estimate', () => {
    const result = wilcoxonSignedRank([1, 2, 3, 4, 5])
    expect(result.count).toBe(5)
    expect(result.positiveRankSum).toBe(15)
    expect(result.statistic).toBe(0)
    expect(result.hodgesLehmannEstimate).toBe(3)
    expect(result.pValue).toBeCloseTo(0.059, 2)
    expect(wilcoxonSignedRank([2, 2, 4, 5], 2).zeroDifferences).toBe(2)
  })

  it('computes Mood median contingency test and excludes pooled-median ties', () => {
    const result = moodMedian([1, 2, 3, 4, 6, 7, 8, 9], ['A', 'A', 'A', 'A', 'B', 'B', 'B', 'B'])
    expect(result.median).toBe(5)
    expect(result.groups.map((group) => [group.below, group.above])).toEqual([
      [4, 0],
      [0, 4],
    ])
    expect(result.statistic).toBe(8)
    expect(result.degreesOfFreedom).toBe(1)
    expect(result.pValue).toBeCloseTo(0.004677735, 7)
    expect(
      moodMedian([1, 2, 3, 3, 4, 5, 6], ['A', 'A', 'A', 'B', 'B', 'B', 'B']).tiesExcluded,
    ).toBe(2)
  })

  it('computes Friedman block ranks, tie correction, and drops incomplete blocks', () => {
    const result = friedman(
      [
        [1, 2, 3, 4, null],
        [2, 3, 4, 5, 7],
        [3, 4, 5, 6, 8],
      ],
      ['A', 'B', 'C'],
    )
    expect(result.blocks).toBe(4)
    expect(result.treatments.map((treatment) => treatment.meanRank)).toEqual([1, 2, 3])
    expect(result.statistic).toBeCloseTo(8, 12)
    expect(result.degreesOfFreedom).toBe(2)
    expect(result.pValue).toBeCloseTo(0.0183156389, 8)
    expect(result.tieCorrection).toBe(1)
  })

  it('rejects invalid or undersized inputs explicitly', () => {
    expect(() => mannWhitney([], [1])).toThrow(
      'Mann-Whitney requires at least one complete observation per group.',
    )
    expect(() => mannWhitney([1, 1], [1, 1])).toThrow(
      'Mann-Whitney requires at least two distinct pooled values.',
    )
    expect(() => kruskalWallis([1, 2], ['A', 'A'])).toThrow(
      'Kruskal-Wallis requires at least two groups.',
    )
    expect(() => signTest([3, 3], 3)).toThrow('Sign test has no non-tied observations.')
    expect(() => runsTest([1, 2, 3])).toThrow(
      'Runs test requires at least four complete observations.',
    )
    expect(() => wilcoxonSignedRank([1])).toThrow(
      'Wilcoxon signed-rank requires at least two nonzero differences.',
    )
    expect(() => moodMedian([1, 2], ['A', 'A'])).toThrow(
      'Mood median test requires at least two groups.',
    )
    expect(() =>
      friedman(
        [
          [1, 2],
          [2, 3],
        ],
        ['A', 'B'],
      ),
    ).toThrow('Friedman test requires at least three treatments.')
  })
})
