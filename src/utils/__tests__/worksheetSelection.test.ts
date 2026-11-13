import { describe, expect, it } from 'vitest'
import { selectionBounds, selectionToTsv } from '../worksheetSelection'

const columns = [
  { id: 'C1', name: 'A', type: 'text' as const },
  { id: 'C2', name: 'B', type: 'numeric' as const },
  { id: 'C3', name: 'C', type: 'text' as const },
]
const rows = [
  { C1: 'one', C2: '1', C3: 'x' },
  { C1: 'two', C2: '', C3: 'y' },
  { C1: 'three', C2: '3', C3: 'z' },
]

describe('worksheet selection', () => {
  it('calculates bounds regardless of selection direction', () => {
    expect(selectionBounds({ row: 2, column: 2 }, { row: 0, column: 1 })).toEqual({
      firstRow: 0,
      lastRow: 2,
      firstColumn: 1,
      lastColumn: 2,
    })
  })

  it('serializes a selected rectangle as tab/newline-separated values', () => {
    expect(selectionToTsv(rows, columns, { row: 0, column: 1 }, { row: 2, column: 2 })).toBe(
      '1\tx\n\ty\n3\tz',
    )
  })

  it('serializes one selected cell and empty workbooks', () => {
    expect(selectionToTsv(rows, columns, { row: 1, column: 0 }, { row: 1, column: 0 })).toBe('two')
    expect(selectionToTsv([], columns, { row: 0, column: 0 }, { row: 0, column: 0 })).toBe('')
  })
})
