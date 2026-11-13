import { describe, expect, it } from 'vitest'
import { analyzeTwoLevelFactorial, createTwoLevelFactorial } from '../twoLevelFactorial'

const factors = [
  { name: 'A', low: -1, high: 1 },
  { name: 'B', low: -1, high: 1 },
]

describe('two-level full factorial DOE', () => {
  it('creates coded designs with reproducible randomized run order', () => {
    const first = createTwoLevelFactorial(factors, 2, 2, true, 17)
    const second = createTwoLevelFactorial(factors, 2, 2, true, 17)

    expect(first.rows).toEqual(second.rows)
    expect(first.totalRuns).toBe(10)
    expect(first.columns.map((column) => column.name)).toEqual([
      'StdOrder',
      'RunOrder',
      'A',
      'B',
      'Response',
    ])
    expect(first.rows.map((row) => row.C2)).toEqual(
      Array.from({ length: 10 }, (_, index) => String(index + 1)),
    )
    expect(first.rows.filter((row) => row.C3 === '0' && row.C4 === '0')).toHaveLength(2)
  })

  it('estimates hand-calculated main effects, interaction, and error', () => {
    const design = createTwoLevelFactorial(factors, 1, 2)
    const rows = design.rows.map((row, index) => {
      const a = Number(row.C3)
      const b = Number(row.C4)
      const response = a === 0 && b === 0 ? (index === 4 ? 9 : 11) : 10 + 2 * a + 3 * b + 4 * a * b
      return { ...row, C5: String(response) }
    })
    const result = analyzeTwoLevelFactorial(
      rows,
      [...design.columns.slice(0, -1), { id: 'C5', name: 'Yield', type: 'numeric' }],
      'C5',
      design.factorColumnIds,
    )

    expect(result.effects.map((effect) => effect.term)).toEqual(['A', 'B', 'A*B'])
    expect(result.effects.map((effect) => effect.coefficient)).toEqual([2, 3, 4])
    expect(result.effects.map((effect) => effect.effect)).toEqual([4, 6, 8])
    expect(result.effects.map((effect) => effect.sumSquares)).toEqual([16, 36, 64])
    expect(result.totalSumSquares).toBe(118)
    expect(result.modelSumSquares).toBe(116)
    expect(result.errorSumSquares).toBe(2)
    expect(result.errorDegreesOfFreedom).toBe(2)
    expect(result.rSquared).toBeCloseTo(116 / 118, 12)
    expect(result.effects[0].pValue).toBeCloseTo(1 - Math.sqrt(16 / 18), 10)
  })

  it('rejects invalid design settings and incomplete factorials', () => {
    expect(() => createTwoLevelFactorial(factors, 0)).toThrow('Replicates must be an integer')
    expect(() => createTwoLevelFactorial(factors, 1, 0, false, -1)).toThrow(
      'Seed must be an integer',
    )

    const design = createTwoLevelFactorial(factors, 1, 2)
    const rows = design.rows.slice(1).map((row, index) => ({
      ...row,
      C5: String(index + 1),
    }))
    const columns = [
      ...design.columns.slice(0, -1),
      { id: 'C5', name: 'Response', type: 'numeric' as const },
    ]
    expect(() => analyzeTwoLevelFactorial(rows, columns, 'C5', design.factorColumnIds)).toThrow(
      'Design is missing one or more full-factorial corner runs.',
    )
  })

  it('rejects analyses that exceed the design-term operation budget', () => {
    const factorColumnIds = Array.from({ length: 8 }, (_, index) => `C${index + 1}`)
    const columns = [
      ...factorColumnIds.map((id, index) => ({
        id,
        name: String.fromCharCode(65 + index),
        type: 'numeric' as const,
      })),
      { id: 'C9', name: 'Response', type: 'numeric' as const },
    ]
    const rows = Array.from({ length: 19_609 }, () => ({}))

    expect(() => analyzeTwoLevelFactorial(rows, columns, 'C9', factorColumnIds)).toThrow(
      'Analysis exceeds the 5000000 design-term operation limit.',
    )
  })
})
