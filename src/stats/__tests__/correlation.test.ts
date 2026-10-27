import { describe, expect, it } from 'vitest'
import { correlation } from '../correlation'

describe('correlation', () => {
  it('matches a five-pair Pearson correlation fixture', () => {
    const result = correlation([1, 2, 3, 4, 5], [5, 3, 4, 1, 2])

    expect(result.count).toBe(5)
    expect(result.correlation).toBeCloseTo(-0.8, 12)
    expect(result.covariance).toBe(-2)
    expect(result.statistic).toBeCloseTo(-2.3094010767585034, 12)
    expect(result.degreesOfFreedom).toBe(3)
    expect(result.pValue).toBeCloseTo(0.10408803867428995, 12)
    expect(result.confidenceInterval[0]).toBeCloseTo(-0.9861961933012714, 12)
    expect(result.confidenceInterval[1]).toBeCloseTo(0.27964004196935505, 12)
  })

  it('omits a pair if either observation is missing', () => {
    const result = correlation([1, 2, null, 4, 5, 6], [1, 3, 3, 2, 5, 4])

    expect(result.count).toBe(5)
  })

  it('handles perfect positive correlation explicitly', () => {
    const result = correlation([1, 2, 3, 4], [2, 4, 6, 8])

    expect(result.correlation).toBe(1)
    expect(result.pValue).toBe(0)
    expect(result.confidenceInterval).toEqual([1, 1])
  })

  it('rejects mismatched, undersized, non-finite, constant, and invalid-alpha inputs', () => {
    expect(() => correlation([1, 2], [1])).toThrow(
      'Korrelationskolumner måste ha lika många rader.',
    )
    expect(() => correlation([1, 2, 3], [2, 1, 4])).toThrow(
      'Minst fyra kompletta par krävs för korrelation och konfidensintervall.',
    )
    expect(() => correlation([1, 2, Number.NaN, 4], [2, 1, 3, 4])).toThrow(
      'Korrelationskolumner innehåller värden som inte är ändliga tal.',
    )
    expect(() => correlation([1, 1, 1, 1], [1, 2, 3, 4])).toThrow(
      'Korrelationskolumner måste variera.',
    )
    expect(() => correlation([1, 2, 3, 4], [4, 3, 2, 1], 0)).toThrow(
      'Alfa måste vara större än 0 och mindre än 1.',
    )
  })
})
