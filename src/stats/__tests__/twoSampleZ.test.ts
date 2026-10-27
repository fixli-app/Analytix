import { describe, expect, it } from 'vitest'
import { twoSampleZ } from '../twoSampleZ'

describe('twoSampleZ', () => {
  it('uses separate known population standard deviations', () => {
    const result = twoSampleZ([2, 3, 4, 5], [1, 2, 3, 4], 1, 1)

    expect(result.count1).toBe(4)
    expect(result.count2).toBe(4)
    expect(result.mean1).toBe(3.5)
    expect(result.mean2).toBe(2.5)
    expect(result.standardError).toBeCloseTo(Math.sqrt(0.5), 12)
    expect(result.statistic).toBeCloseTo(Math.SQRT2, 12)
    expect(result.pValue).toBeCloseTo(0.15729920705028513, 12)
    expect(result.confidenceInterval[0]).toBeCloseTo(-0.38590382435, 10)
    expect(result.confidenceInterval[1]).toBeCloseTo(2.38590382435, 10)
  })

  it('omits missing observations independently', () => {
    const result = twoSampleZ([2, null, 4, 5], [1, 2, undefined, 4], 1, 2)

    expect(result.count1).toBe(3)
    expect(result.count2).toBe(3)
  })

  it('rejects invalid sigma, invalid mean difference, alpha, and empty groups', () => {
    expect(() => twoSampleZ([1], [2], 0, 1)).toThrow(
      'Båda kända populationsstandardavvikelserna måste vara större än 0.',
    )
    expect(() => twoSampleZ([1], [2], 1, 1, Number.NaN)).toThrow(
      'Den hypotetiska skillnaden måste vara ett ändligt tal.',
    )
    expect(() => twoSampleZ([1], [2], 1, 1, 0, 1)).toThrow(
      'Alfa måste vara större än 0 och mindre än 1.',
    )
    expect(() => twoSampleZ([null], [2], 1, 1)).toThrow('Minst en observation krävs i varje grupp.')
  })
})
