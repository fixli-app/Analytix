import { describe, expect, it } from 'vitest'
import { oneSamplePoissonRate } from '../oneSamplePoissonRate'

describe('oneSamplePoissonRate', () => {
  it('matches a hand-calculated count/exposure fixture', () => {
    const result = oneSamplePoissonRate([0, 1, 2], 1, 0.5)

    expect(result.observationCount).toBe(3)
    expect(result.eventCount).toBe(3)
    expect(result.totalExposure).toBe(3)
    expect(result.observedRate).toBe(1)
    expect(result.expectedEvents).toBe(1.5)
    expect(result.statistic).toBeCloseTo(1.2247448713915892, 12)
    expect(result.pValue).toBeCloseTo(0.22067136191984682, 12)
    expect(result.confidenceInterval[0]).toBeCloseTo(0.20622404096520033, 12)
    expect(result.confidenceInterval[1]).toBeCloseTo(2.922424356580775, 12)
  })

  it('omits missing counts and returns a zero lower bound for no events', () => {
    const result = oneSamplePoissonRate([0, null, 0, undefined], 2, 0.5)

    expect(result.observationCount).toBe(2)
    expect(result.totalExposure).toBe(4)
    expect(result.confidenceInterval[0]).toBe(0)
  })

  it('rejects invalid counts, exposure, null rate, alpha, and empty input', () => {
    expect(() => oneSamplePoissonRate([1, 1.5], 1, 1)).toThrow(
      'Poisson-data måste vara icke-negativa heltalsräkningar.',
    )
    expect(() => oneSamplePoissonRate([1], 0, 1)).toThrow(
      'Exponeringen per observation måste vara större än 0.',
    )
    expect(() => oneSamplePoissonRate([1], 1, 0)).toThrow(
      'Den hypotetiska hastigheten måste vara större än 0.',
    )
    expect(() => oneSamplePoissonRate([1], 1, 1, 1)).toThrow(
      'Alfa måste vara större än 0 och mindre än 1.',
    )
    expect(() => oneSamplePoissonRate([null, undefined], 1, 1)).toThrow(
      'Minst en Poisson-observation krävs.',
    )
  })
})
