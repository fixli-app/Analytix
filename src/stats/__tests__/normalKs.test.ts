import { describe, expect, it } from 'vitest'
import { normalKolmogorovSmirnov } from '../normalKs'

describe('normalKolmogorovSmirnov', () => {
  it('computes a two-sided KS statistic against a fully specified normal CDF', () => {
    const result = normalKolmogorovSmirnov([0, 0.5, 1, 1.5, 2], 1, 1)

    expect(result.count).toBe(5)
    expect(result.dPlus).toBeCloseTo(0.15865525393145707, 12)
    expect(result.dMinus).toBeCloseTo(0.15865525393145707, 12)
    expect(result.statistic).toBeCloseTo(0.15865525393145707, 12)
    expect(result.pValue).toBeGreaterThan(0.5)
  })

  it('ignores explicitly missing observations', () => {
    const result = normalKolmogorovSmirnov([0, null, 1, 2, undefined], 1, 1)

    expect(result.count).toBe(3)
  })

  it('rejects invalid mean, standard deviation, undersized, and non-finite data', () => {
    expect(() => normalKolmogorovSmirnov([1, 2], Number.NaN, 1)).toThrow(
      'Det hypotetiska medelvärdet måste vara ett ändligt tal.',
    )
    expect(() => normalKolmogorovSmirnov([1, 2], 0, 0)).toThrow(
      'Hypotetisk standardavvikelse måste vara större än 0.',
    )
    expect(() => normalKolmogorovSmirnov([1], 0, 1)).toThrow(
      'Minst två observationer krävs för Kolmogorov-Smirnov-testet.',
    )
    expect(() => normalKolmogorovSmirnov([1, Number.NaN], 0, 1)).toThrow(
      'Kolumnen innehåller värden som inte är ändliga tal.',
    )
  })
})
