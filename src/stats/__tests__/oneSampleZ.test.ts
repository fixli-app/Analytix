import { describe, expect, it } from 'vitest'
import { oneSampleZ } from '../oneSampleZ'

describe('oneSampleZ', () => {
  it('uses the known population standard deviation and normal critical value', () => {
    const result = oneSampleZ([1, 2, 3], 2, 1)

    expect(result.count).toBe(3)
    expect(result.mean).toBe(2)
    expect(result.standardError).toBeCloseTo(1 / Math.sqrt(3), 12)
    expect(result.statistic).toBe(0)
    expect(result.pValue).toBeCloseTo(1, 12)
    expect(result.confidenceInterval[0]).toBeCloseTo(0.868414265, 8)
    expect(result.confidenceInterval[1]).toBeCloseTo(3.131585735, 8)
  })

  it('omits missing observations', () => {
    const result = oneSampleZ([2, null, 4], 3, 2)

    expect(result.count).toBe(2)
    expect(result.mean).toBe(3)
    expect(result.statistic).toBe(0)
  })

  it('rejects invalid mean, standard deviation, alpha, and empty input', () => {
    expect(() => oneSampleZ([1, 2], Number.NaN, 1)).toThrow(
      'Det hypotetiska medelvärdet måste vara ett ändligt tal.',
    )
    expect(() => oneSampleZ([1, 2], 1, 0)).toThrow(
      'Känd populationsstandardavvikelse måste vara större än 0.',
    )
    expect(() => oneSampleZ([1, 2], 1, 1, 1)).toThrow(
      'Alfa måste vara större än 0 och mindre än 1.',
    )
    expect(() => oneSampleZ([null, undefined], 1, 1)).toThrow(
      'Kolumnen innehåller inga numeriska värden.',
    )
  })
})
