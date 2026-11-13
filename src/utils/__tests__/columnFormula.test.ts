import { describe, expect, it } from 'vitest'
import { calculateColumnFormula } from '../columnFormula'
import type { SheetColumn, SheetRow } from '../../store/workbook'

const columns: SheetColumn[] = [
  { id: 'C1', name: 'X', type: 'numeric' },
  { id: 'C2', name: 'Y', type: 'numeric' },
  { id: 'C3', name: 'Group', type: 'text' },
]
const rows: SheetRow[] = [
  { C1: '3', C2: '4', C3: 'A' },
  { C1: '5', C2: '6', C3: 'B' },
]

describe('calculateColumnFormula', () => {
  it('respects arithmetic precedence and parentheses', () => {
    expect(calculateColumnFormula('C1 + C2 * 2', 'Result', columns, rows).values).toEqual([11, 17])
    expect(calculateColumnFormula('(C1 + C2) * 2', 'Result', columns, rows).values).toEqual([
      14, 22,
    ])
  })

  it('supports powers, unary operators, constants, and numeric functions', () => {
    const result = calculateColumnFormula(
      'sqrt(C1^2) + abs(-C2) + pi - pi',
      'Result',
      columns,
      rows,
    )
    expect(result.values).toEqual([7, 11])
    expect(calculateColumnFormula('-C1^2', 'Result', columns, rows).values).toEqual([-9, -25])
    expect(calculateColumnFormula('2^3^2', 'Result', columns, rows).values).toEqual([512, 512])
  })

  it('supports comparisons, conditional formulas, and logical functions', () => {
    expect(
      calculateColumnFormula(
        'IF(AND(C1 > 0, C2 < 5), SUM(C1, C2, 1), MEAN(C1, C2))',
        'Result',
        columns,
        rows,
      ).values,
    ).toEqual([8, 5.5])
    expect(calculateColumnFormula('IF(C1 = 3, 10, 20)', 'Result', columns, rows).values).toEqual([
      10, 20,
    ])
    expect(calculateColumnFormula('NOT(C1 <> 3)', 'Result', columns, rows).values).toEqual([1, 0])
    expect(calculateColumnFormula('MAX(C1, C2, 10)', 'Result', columns, rows).values).toEqual([
      10, 10,
    ])
    expect(calculateColumnFormula('ROUND(C1 / 3, 2)', 'Result', columns, rows).values).toEqual([
      1, 1.67,
    ])
  })

  it('short-circuits IF branches and propagates missing logical values', () => {
    expect(calculateColumnFormula('IF(C1 > 0, C1, 1 / 0)', 'Result', columns, rows).values).toEqual(
      [3, 5],
    )
    const rowsWithMissing: SheetRow[] = [{ C1: '3', C2: '' }]
    expect(
      calculateColumnFormula('IF(C2 > 0, 1, 2)', 'Result', columns, rowsWithMissing).values,
    ).toEqual([null])
    expect(
      calculateColumnFormula('AND(C1 > 0, C2 > 0)', 'Result', columns, rowsWithMissing).values,
    ).toEqual([null])
    expect(
      calculateColumnFormula('OR(C1 > 0, C2 > 0)', 'Result', columns, rowsWithMissing).values,
    ).toEqual([1])
  })

  it('preserves missing values when a referenced cell is blank', () => {
    const result = calculateColumnFormula('C1 + C2', 'Result', columns, [
      { C1: '2', C2: '3' },
      { C1: '2', C2: '' },
      { C1: '', C2: '3' },
    ])
    expect(result.values).toEqual([5, null, null])
  })

  it('rejects categorical columns and unknown identifiers', () => {
    expect(() => calculateColumnFormula('C3 + 1', 'Result', columns, rows)).toThrow(
      'C3" är inte en numerisk kolumn',
    )
    expect(() => calculateColumnFormula('C9 + 1', 'Result', columns, rows)).toThrow(
      'C9" är inte en numerisk kolumn',
    )
  })

  it('reports the row for non-finite calculations', () => {
    expect(() => calculateColumnFormula('C1 / (C2 - 4)', 'Result', columns, rows)).toThrow(
      'icke-ändligt värde (rad 1)',
    )
  })

  it('rejects malformed or unsafe syntax', () => {
    expect(() => calculateColumnFormula('C1 + )', 'Result', columns, rows)).toThrow()
    expect(() => calculateColumnFormula('C1; alert(1)', 'Result', columns, rows)).toThrow(
      'Otillåtet tecken',
    )
    expect(() => calculateColumnFormula('eval(C1)', 'Result', columns, rows)).toThrow(
      'Okänd funktion',
    )
  })
})
