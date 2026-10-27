import { describe, expect, it } from 'vitest'
import { oneSampleT } from '../oneSampleT'

describe('oneSampleT', () => {
  it('matches a hand-calculated five-observation reference fixture', () => {
    const result = oneSampleT([2, 3, 5, 4, 6], 3)

    expect(result.count).toBe(5)
    expect(result.mean).toBe(4)
    expect(result.standardDeviation).toBeCloseTo(Math.sqrt(2.5), 12)
    expect(result.statistic).toBeCloseTo(Math.SQRT2, 12)
    expect(result.degreesOfFreedom).toBe(4)
    expect(result.pValue).toBeCloseTo(0.2301996410804992, 12)
    expect(result.confidenceInterval[0]).toBeCloseTo(2.036756, 5)
    expect(result.confidenceInterval[1]).toBeCloseTo(5.963244, 5)
  })

  it('omits explicitly missing observations and reports the analyzed count', () => {
    const result = oneSampleT([2, null, 3, 5, undefined, 4, 6], 3)

    expect(result.count).toBe(5)
    expect(result.statistic).toBeCloseTo(Math.SQRT2, 12)
  })

  it('supports a caller-selected significance level', () => {
    const result = oneSampleT([2, 3, 5, 4, 6], 3, 0.1)

    expect(result.alpha).toBe(0.1)
    expect(result.confidenceInterval[0]).toBeGreaterThan(2.036756)
  })

  it('rejects invalid alpha and non-finite observations', () => {
    expect(() => oneSampleT([1, 2], 0, 1)).toThrow('Alfa måste vara större än 0 och mindre än 1.')
    expect(() => oneSampleT([1, Number.NaN], 0)).toThrow(
      'Kolumnen innehåller värden som inte är ändliga tal.',
    )
  })

  it('rejects undersized, empty, and constant samples', () => {
    expect(() => oneSampleT([2])).toThrow('Minst två observationer krävs för ett 1-urvals t-test.')
    expect(() => oneSampleT([null, undefined])).toThrow(
      'Kolumnen innehåller inga numeriska värden.',
    )
    expect(() => oneSampleT([4, 4, 4])).toThrow('Ett 1-urvals t-test kräver en varierande kolumn.')
  })
})
