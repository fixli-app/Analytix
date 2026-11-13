import { describe, expect, it } from 'vitest'
import { chiSquareGoodnessOfFit, chiSquareUniformGoodnessOfFit } from '../chiSquareGoodnessOfFit'

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

  it('uses specified category probabilities, including categories with zero observations', () => {
    const result = chiSquareGoodnessOfFit(
      ['A', 'A', 'A', 'A', 'A', 'B', 'B', 'B', 'C', 'C'],
      [
        { category: 'A', probability: 0.4 },
        { category: 'B', probability: 0.4 },
        { category: 'C', probability: 0.2 },
        { category: 'D', probability: 0.001 },
      ].map((item) => ({
        ...item,
        probability: item.category === 'D' ? 0.001 : item.probability * (0.999 / 1),
      })),
    )

    expect(result.categories).toEqual(['A', 'B', 'C', 'D'])
    expect(result.observed).toEqual([5, 3, 2, 0])
    expect(result.expected.slice(0, 3)).toEqual([3.996, 3.996, 1.998])
    expect(result.probabilitySource).toBe('specified')
    expect(result.degreesOfFreedom).toBe(3)
    expect(result.statistic).toBeCloseTo(
      (5 - 3.996) ** 2 / 3.996 +
        (3 - 3.996) ** 2 / 3.996 +
        (2 - 1.998) ** 2 / 1.998 +
        0.01 ** 2 / 0.01,
      12,
    )
  })

  it('matches a hand-checked specified-probability fixture and rejects invalid mappings', () => {
    const result = chiSquareGoodnessOfFit(
      ['A', 'A', 'A', 'A', 'A', 'B', 'B', 'B', 'C', 'C'],
      [
        { category: 'A', probability: 0.4 },
        { category: 'B', probability: 0.4 },
        { category: 'C', probability: 0.2 },
      ],
    )
    expect(result.expected).toEqual([4, 4, 2])
    expect(result.statistic).toBeCloseTo(0.5, 12)
    expect(result.pValue).toBeCloseTo(0.7788007830714049, 12)
    expect(result.degreesOfFreedom).toBe(2)

    expect(() =>
      chiSquareGoodnessOfFit(
        ['A', 'B'],
        [
          { category: 'A', probability: 0.2 },
          { category: 'B', probability: 0.2 },
        ],
      ),
    ).toThrow('Förväntade sannolikheter måste vara positiva och summera till 1.')
    expect(() =>
      chiSquareGoodnessOfFit(
        ['A', 'C'],
        [
          { category: 'A', probability: 0.5 },
          { category: 'B', probability: 0.5 },
        ],
      ),
    ).toThrow('Observation innehåller en kategori utan angiven sannolikhet.')
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
