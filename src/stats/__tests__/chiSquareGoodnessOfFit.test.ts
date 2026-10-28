import { describe, expect, it } from 'vitest'
import { chiSquareUniformGoodnessOfFit } from '../chiSquareGoodnessOfFit'

describe('chiSquareUniformGoodnessOfFit', () => {
  it('tests equal expected category frequencies', () => {
    const result = chiSquareUniformGoodnessOfFit(['A', 'A', 'A', 'A', 'B', 'B', 'B', 'C'])

    expect(result.categories).toEqual(['A', 'B', 'C'])
    expect(result.observed).toEqual([4, 3, 1])
    expect(result.expected).toEqual([8 / 3, 8 / 3, 8 / 3])
    expect(result.statistic).toBeCloseTo(1.75, 12)
    expect(result.degreesOfFreedom).toBe(2)
    expect(result.pValue).toBeCloseTo(0.4168620196785084, 12)
    expect(result.cellsBelowFive).toBe(3)
  })

  it('ignores missing values', () => {
    const result = chiSquareUniformGoodnessOfFit(['A', 'B', null, 'A', undefined, 'B'])

    expect(result.count).toBe(4)
    expect(result.observed).toEqual([2, 2])
  })

  it('rejects invalid alpha, empty, single-category, and invalid categorical values', () => {
    expect(() => chiSquareUniformGoodnessOfFit(['A', 'B'], 1)).toThrow(
      'Alfa måste vara större än 0 och mindre än 1.',
    )
    expect(() => chiSquareUniformGoodnessOfFit([null, undefined])).toThrow(
      'Inga observationer finns för goodness-of-fit-testet.',
    )
    expect(() => chiSquareUniformGoodnessOfFit(['A', 'A'])).toThrow(
      'Goodness-of-fit-test kräver minst två kategorier.',
    )
    expect(() => chiSquareUniformGoodnessOfFit(['A', ''])).toThrow(
      'Kategorikolumnen innehåller ogiltiga värden.',
    )
  })
})
