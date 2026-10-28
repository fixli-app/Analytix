import { describe, expect, it } from 'vitest'
import { fisherExactTwoSided } from '../fisherExact'

function classicTable(): [string[], string[]] {
  const first: string[] = []
  const second: string[] = []
  for (const [row, column, count] of [
    ['A', 'X', 1],
    ['A', 'Y', 9],
    ['B', 'X', 11],
    ['B', 'Y', 3],
  ] as const) {
    for (let index = 0; index < count; index += 1) {
      first.push(row)
      second.push(column)
    }
  }
  return [first, second]
}

describe('fisherExactTwoSided', () => {
  it('matches a classic two-sided 2x2 exact-test fixture', () => {
    const [first, second] = classicTable()
    const result = fisherExactTwoSided(first, second)

    expect(result.count).toBe(24)
    expect(result.observed).toEqual([
      [1, 9],
      [11, 3],
    ])
    expect(result.pValue).toBeCloseTo(0.0027594561852200836, 12)
    expect(result.oddsRatio).toBeCloseTo(1 / 33, 12)
    expect(result.alternative).toBe('two-sided')
  })

  it('omits incomplete pairs and returns a finite exact p-value', () => {
    const result = fisherExactTwoSided(['A', 'A', 'B', 'B', null], ['X', 'Y', 'X', 'Y', 'X'])

    expect(result.count).toBe(4)
    expect(Number.isFinite(result.pValue)).toBe(true)
  })

  it('rejects empty, non-finite, and non-2x2 data', () => {
    expect(() => fisherExactTwoSided([null], ['A'])).toThrow(
      'Inga kompletta observationer finns för Fishers test.',
    )
    expect(() => fisherExactTwoSided([1, Number.NaN], ['A', 'B'])).toThrow(
      'Fishers testkolumner innehåller värden som inte är ändliga tal.',
    )
    expect(() => fisherExactTwoSided(['A', 'B', 'C'], ['X', 'Y', 'X'])).toThrow(
      'Fishers exakta test kräver exakt två kategorier i varje kolumn.',
    )
  })
})
