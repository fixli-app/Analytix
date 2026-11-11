import { describe, expect, it } from 'vitest'
import { normalAndersonDarling } from '../normalAndersonDarling'

describe('normalAndersonDarling', () => {
  it('calculates the adjusted statistic and approximate p-value for estimated normal parameters', () => {
    const result = normalAndersonDarling([1, 2, 3, 4, 5, 6, 7, 8])

    expect(result.count).toBe(8)
    expect(result.mean).toBeCloseTo(4.5, 12)
    expect(result.standardDeviation).toBeCloseTo(Math.sqrt(6), 12)
    expect(result.statistic).toBeGreaterThan(0)
    expect(result.adjustedStatistic).toBeGreaterThan(result.statistic)
    expect(result.pValue).toBeGreaterThanOrEqual(0)
    expect(result.pValue).toBeLessThanOrEqual(1)
    expect(result.rejectNormality).toBe(result.pValue < result.alpha)
  })

  it('is invariant to input order and omits missing observations', () => {
    const forward = normalAndersonDarling([1, 2, 3, 4, 5, 6, 7, 8, null])
    const reverse = normalAndersonDarling([8, 7, 6, 5, 4, 3, 2, 1, undefined])

    expect(forward.count).toBe(8)
    expect(reverse.count).toBe(8)
    expect(reverse.statistic).toBeCloseTo(forward.statistic, 12)
    expect(reverse.pValue).toBeCloseTo(forward.pValue, 12)
  })

  it('rejects a strongly non-normal sample at the selected alpha', () => {
    const result = normalAndersonDarling([0, 0, 0, 0, 0, 0, 0, 100], 0.05)

    expect(result.adjustedStatistic).toBeGreaterThan(0.6)
    expect(result.pValue).toBeLessThan(0.05)
    expect(result.rejectNormality).toBe(true)
  })

  it('uses the requested alpha and validates undersized, non-finite, constant, and invalid-alpha data', () => {
    const result = normalAndersonDarling([1, 2, 3, 4, 5, 6, 7, 8], 0.1)
    expect(result.alpha).toBe(0.1)

    expect(() => normalAndersonDarling([1, 2, 3, 4, 5, 6, 7])).toThrow(
      'Minst åtta kompletta observationer krävs för Anderson-Darling-testet.',
    )
    expect(() => normalAndersonDarling([1, 2, 3, 4, 5, 6, 7, Number.NaN])).toThrow(
      'Kolumnen innehåller värden som inte är ändliga tal.',
    )
    expect(() => normalAndersonDarling(Array(8).fill(2))).toThrow(
      'Anderson-Darling-test kan inte beräknas för en konstant kolumn.',
    )
    expect(() => normalAndersonDarling([1, 2, 3, 4, 5, 6, 7, 8], 1)).toThrow(
      'Alfa måste vara större än 0 och mindre än 1.',
    )
  })
})
