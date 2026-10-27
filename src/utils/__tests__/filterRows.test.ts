import { describe, expect, it } from 'vitest'
import { filterRowIndexes } from '../filterRows'

const rows = [
  { C1: 'B-101', C2: 'Morgon' },
  { C1: 'B-102', C2: 'Kväll' },
  { C1: 'B-103', C2: 'Natt' },
]

describe('filterRowIndexes', () => {
  it('returns all rows for an empty query', () => {
    expect(filterRowIndexes(rows, '  ')).toEqual([0, 1, 2])
  })

  it('matches values across all columns without changing row order', () => {
    expect(filterRowIndexes(rows, 'B-10')).toEqual([0, 1, 2])
    expect(filterRowIndexes(rows, 'Kväll')).toEqual([1])
  })

  it('matches case-insensitively using Swedish casing', () => {
    expect(filterRowIndexes(rows, 'KVÄLL')).toEqual([1])
  })

  it('returns no matches for a missing query', () => {
    expect(filterRowIndexes(rows, 'B-999')).toEqual([])
  })
})
