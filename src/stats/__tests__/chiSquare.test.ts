import { describe, expect, it } from 'vitest'
import { chiSquareIndependence } from '../chiSquare'

function makeTable(): [string[], string[]] {
  const first: string[] = []
  const second: string[] = []
  for (const [row, column, count] of [
    ['A', 'X', 10],
    ['A', 'Y', 20],
    ['B', 'X', 20],
    ['B', 'Y', 10],
  ] as const) {
    for (let index = 0; index < count; index += 1) {
      first.push(row)
      second.push(column)
    }
  }
  return [first, second]
}

describe('chiSquareIndependence', () => {
  it('calculates Pearson chi-square expected counts and Cramér V', () => {
    const [first, second] = makeTable()
    const result = chiSquareIndependence(first, second)

    expect(result.count).toBe(60)
    expect(result.observed).toEqual([
      [10, 20],
      [20, 10],
    ])
    expect(result.expected).toEqual([
      [15, 15],
      [15, 15],
    ])
    expect(result.statistic).toBeCloseTo(6.666666666666667, 12)
    expect(result.degreesOfFreedom).toBe(1)
    expect(result.pValue).toBeCloseTo(0.009823274507519247, 10)
    expect(result.cramersV).toBeCloseTo(1 / 3, 12)
    expect(result.cellsBelowFive).toBe(0)
  })

  it('omits incomplete pairs and counts small expected cells', () => {
    const result = chiSquareIndependence(
      ['A', 'A', 'A', 'B', 'B', 'B', null],
      ['X', 'X', 'Y', 'X', 'Y', 'Y', 'X'],
    )

    expect(result.count).toBe(6)
    expect(result.cellsBelowFive).toBe(4)
  })

  it('rejects mismatched, empty, single-category, and non-finite data', () => {
    expect(() => chiSquareIndependence(['A'], ['A', 'B'])).toThrow(
      'Korstabellskolumner måste ha lika många rader.',
    )
    expect(() => chiSquareIndependence([null], ['A'])).toThrow(
      'Inga kompletta observationer finns för korstabellen.',
    )
    expect(() => chiSquareIndependence(['A', 'A'], ['X', 'Y'])).toThrow(
      'Chi-två-test för samband kräver minst två kategorier i varje kolumn.',
    )
    expect(() => chiSquareIndependence([1, Number.NaN], ['A', 'B'])).toThrow(
      'Korstabellen innehåller värden som inte är ändliga tal.',
    )
    expect(() => chiSquareIndependence(['A', 'B'], ['X', 'Y'], 1)).toThrow(
      'Alfa måste vara större än 0 och mindre än 1.',
    )
  })
})
