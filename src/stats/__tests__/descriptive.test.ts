import { describe, expect, it } from 'vitest'
import { describe as describeValues } from '../descriptive'

describe('describe', () => {
  it('matches the textbook summary for a four-value sample', () => {
    const result = describeValues([1, 2, 3, 4])

    expect(result.count).toBe(4)
    expect(result.mean).toBe(2.5)
    expect(result.median).toBe(2.5)
    expect(result.standardDeviation).toBeCloseTo(1.2909944487358056, 12)
    expect(result.variance).toBeCloseTo(5 / 3, 12)
    expect(result.standardError).toBeCloseTo(1.2909944487358056 / 2, 12)
    expect(result.firstQuartile).toBe(1.75)
    expect(result.thirdQuartile).toBe(3.25)
    expect(result.range).toBe(3)
    expect(result.minimum).toBe(1)
    expect(result.maximum).toBe(4)
  })

  it('ignores missing and non-finite observations', () => {
    expect(describeValues([2, null, Number.NaN, 4, undefined, Number.POSITIVE_INFINITY]).mean).toBe(
      3,
    )
  })

  it('reports zero sample deviation for a single value', () => {
    expect(describeValues([7]).standardDeviation).toBe(0)
  })

  it('uses a stable mean for values with a large shared offset', () => {
    expect(describeValues([1e12 + 1, 1e12 + 2, 1e12 + 3]).mean).toBe(1e12 + 2)
  })

  it('rejects a column without usable numeric values', () => {
    expect(() => describeValues([null, Number.NaN])).toThrow(
      'Kolumnen innehåller inga numeriska värden.',
    )
  })
})
