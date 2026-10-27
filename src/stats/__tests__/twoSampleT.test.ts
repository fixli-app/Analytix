import { describe, expect, it } from 'vitest'
import { twoSampleT } from '../twoSampleT'

describe('twoSampleT', () => {
  it('matches a hand-calculated equal-size Welch fixture', () => {
    const result = twoSampleT([5, 7, 8, 6, 9], [2, 3, 4, 5, 6])

    expect(result.count1).toBe(5)
    expect(result.count2).toBe(5)
    expect(result.mean1).toBe(7)
    expect(result.mean2).toBe(4)
    expect(result.standardError).toBe(1)
    expect(result.statistic).toBe(3)
    expect(result.degreesOfFreedom).toBe(8)
    expect(result.pValue).toBeCloseTo(0.01707168123378411, 12)
    expect(result.confidenceInterval[0]).toBeCloseTo(0.69399586665, 10)
    expect(result.confidenceInterval[1]).toBeCloseTo(5.30600413335, 10)
  })

  it('omits explicitly missing values independently in each group', () => {
    const result = twoSampleT([5, 7, null, 8, 6, 9], [2, 3, 4, undefined, 5, 6])

    expect(result.count1).toBe(5)
    expect(result.count2).toBe(5)
    expect(result.statistic).toBe(3)
  })

  it('allows one constant group when the other group varies', () => {
    const result = twoSampleT([4, 4, 4], [1, 2, 3])

    expect(result.standardDeviation1).toBe(0)
    expect(Number.isFinite(result.statistic)).toBe(true)
  })

  it('rejects invalid alpha, non-finite observations, undersized, and constant groups', () => {
    expect(() => twoSampleT([1, 2], [3, 4], 0, 0)).toThrow(
      'Alfa måste vara större än 0 och mindre än 1.',
    )
    expect(() => twoSampleT([1, Number.NaN], [3, 4])).toThrow(
      'Grupperna innehåller värden som inte är ändliga tal.',
    )
    expect(() => twoSampleT([1], [3, 4])).toThrow('Minst två observationer krävs i varje grupp.')
    expect(() => twoSampleT([4, 4], [8, 8])).toThrow(
      'Båda grupperna är konstanta; t-testet kan inte beräknas.',
    )
  })
})
