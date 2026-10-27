import { describe, expect, it } from 'vitest'
import { standardize } from '../transform'

describe('standardize', () => {
  it('uses the sample mean and sample standard deviation', () => {
    const result = standardize([1, 2, 3])

    expect(result.mean).toBe(2)
    expect(result.standardDeviation).toBe(1)
    expect(result.values).toEqual([-1, 0, 1])
  })

  it('preserves missing and non-finite positions', () => {
    const result = standardize([1, null, 3, Number.NaN])

    expect(result.values[0]).toBeCloseTo(-Math.SQRT1_2, 12)
    expect(result.values[1]).toBeNull()
    expect(result.values[2]).toBeCloseTo(Math.SQRT1_2, 12)
    expect(result.values[3]).toBeNull()
  })

  it('rejects constant columns', () => {
    expect(() => standardize([4, 4, 4])).toThrow(
      'Kolumnen måste variera för att kunna standardiseras.',
    )
  })

  it('rejects undersized columns', () => {
    expect(() => standardize([5])).toThrow('Minst två numeriska värden krävs för standardisering.')
  })

  it('rejects columns without numeric observations', () => {
    expect(() => standardize([null, Number.NaN])).toThrow(
      'Kolumnen innehåller inga numeriska värden.',
    )
  })
})
