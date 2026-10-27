import { describe, expect, it } from 'vitest'
import { compareVariances } from '../compareVariances'

describe('compareVariances', () => {
  it('returns F, Bartlett, and median-centered Levene results for equal variances', () => {
    const result = compareVariances([1, 2, 3, 4], [2, 3, 4, 5])

    expect(result.variance1).toBeCloseTo(5 / 3, 12)
    expect(result.variance2).toBeCloseTo(5 / 3, 12)
    expect(result.fStatistic).toBeCloseTo(1, 12)
    expect(result.fPValue).toBeCloseTo(1, 6)
    expect(result.bartlettStatistic).toBeCloseTo(0, 12)
    expect(result.bartlettPValue).toBeCloseTo(1, 6)
    expect(result.leveneStatistic).toBeCloseTo(0, 12)
    expect(result.levenePValue).toBeCloseTo(1, 6)
  })

  it('omits missing observations independently', () => {
    const result = compareVariances([1, 2, null, 4, 5], [2, 3, 4, 5, undefined])

    expect(result.count1).toBe(4)
    expect(result.count2).toBe(4)
  })

  it('rejects invalid alpha, undersized, non-finite, and constant groups', () => {
    expect(() => compareVariances([1, 2], [1, 2], 0)).toThrow(
      'Alfa måste vara större än 0 och mindre än 1.',
    )
    expect(() => compareVariances([1], [1, 2])).toThrow(
      'Minst två observationer krävs i varje grupp.',
    )
    expect(() => compareVariances([1, Number.NaN], [1, 2])).toThrow(
      'Grupperna innehåller värden som inte är ändliga tal.',
    )
    expect(() => compareVariances([2, 2, 2], [1, 2, 3])).toThrow(
      'Båda grupperna måste variera för variansjämförelserna.',
    )
  })
})
