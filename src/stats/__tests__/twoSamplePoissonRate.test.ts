import { describe, expect, it } from 'vitest'
import { twoSamplePoissonRate } from '../twoSamplePoissonRate'

describe('twoSamplePoissonRate', () => {
  it('tests independent counts with separate exposures', () => {
    const result = twoSamplePoissonRate([0, 1, 1, 2], 1, [2, 3, 4, 3], 1)

    expect(result.observationCount1).toBe(4)
    expect(result.observationCount2).toBe(4)
    expect(result.eventCount1).toBe(4)
    expect(result.eventCount2).toBe(12)
    expect(result.rate1).toBe(1)
    expect(result.rate2).toBe(3)
    expect(result.statistic).toBe(-2)
    expect(result.pValue).toBeCloseTo(0.04550026389635842, 12)
    expect(result.confidenceInterval[0]).toBeCloseTo(-3.95996398454, 10)
    expect(result.confidenceInterval[1]).toBeCloseTo(-0.04003601546, 10)
    expect(result.expectedEvents1).toBe(8)
    expect(result.expectedEvents2).toBe(8)
  })

  it('omits missing counts independently by group', () => {
    const result = twoSamplePoissonRate([1, null, 2], 2, [4, 3, undefined], 1)

    expect(result.observationCount1).toBe(2)
    expect(result.observationCount2).toBe(2)
    expect(result.totalExposure1).toBe(4)
    expect(result.totalExposure2).toBe(2)
  })

  it('rejects invalid counts, exposures, alpha, empty groups, and zero pooled rate', () => {
    expect(() => twoSamplePoissonRate([1.5], 1, [2], 1)).toThrow(
      'Poisson-data måste vara icke-negativa heltalsräkningar.',
    )
    expect(() => twoSamplePoissonRate([1], 0, [2], 1)).toThrow(
      'Exponeringen per observation måste vara större än 0.',
    )
    expect(() => twoSamplePoissonRate([1], 1, [2], 1, 1)).toThrow(
      'Alfa måste vara större än 0 och mindre än 1.',
    )
    expect(() => twoSamplePoissonRate([], 1, [2], 1)).toThrow(
      'Minst en observation krävs i varje grupp.',
    )
    expect(() => twoSamplePoissonRate([0], 1, [0], 1)).toThrow(
      'Den poolade hastigheten har ingen variation under H₀.',
    )
  })
})
