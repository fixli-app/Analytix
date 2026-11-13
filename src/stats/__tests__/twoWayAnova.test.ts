import { describe, expect, it } from 'vitest'
import jStat from 'jstat'
import { twoWayAnova } from '../twoWayAnova'

function fixture() {
  const values = [6, 8, 10, 12, 14, 16, 20, 22]
  const factor1 = ['A1', 'A1', 'A1', 'A1', 'A2', 'A2', 'A2', 'A2']
  const factor2 = ['B1', 'B1', 'B2', 'B2', 'B1', 'B1', 'B2', 'B2']
  return { values, factor1, factor2 }
}

describe('twoWayAnova', () => {
  it('decomposes balanced two-factor data into main, interaction, and error terms', () => {
    const { values, factor1, factor2 } = fixture()
    const result = twoWayAnova(values, factor1, factor2, {
      response: 'Yield',
      factor1: 'Temperature',
      factor2: 'Pressure',
    })

    expect(result.count).toBe(8)
    expect(result.replicateCount).toBe(2)
    expect(result.grandMean).toBe(13.5)
    expect(result.cellMeans.map((cell) => cell.mean)).toEqual([7, 11, 15, 21])
    expect(result.table.map((row) => row.sumSquares)).toEqual([162, 50, 2, 8, 222])
    expect(result.table.map((row) => row.degreesOfFreedom)).toEqual([1, 1, 1, 4, 7])
    expect(result.table.slice(0, 3).map((row) => row.fStatistic)).toEqual([81, 25, 1])
    expect(result.table[0].partialEtaSquared).toBeCloseTo(162 / 170, 12)
    expect(result.table[0].pValue).toBeCloseTo(1 - jStat.centralF.cdf(81, 1, 4), 12)
    expect(result.errorMeanSquare).toBe(2)
  })

  it('handles complete-case rows and custom alpha', () => {
    const { values, factor1, factor2 } = fixture()
    const result = twoWayAnova(
      [...values, null],
      [...factor1, 'A1'],
      [...factor2, 'B1'],
      undefined,
      0.1,
    )

    expect(result.count).toBe(8)
    expect(result.alpha).toBe(0.1)
  })

  it('rejects invalid alpha, unbalanced cells, and zero residual variation', () => {
    const { values, factor1, factor2 } = fixture()
    expect(() => twoWayAnova(values, factor1, factor2, {}, 1)).toThrow(
      'Alpha must be greater than 0 and less than 1.',
    )
    expect(() => twoWayAnova(values.slice(1), factor1.slice(1), factor2.slice(1))).toThrow(
      'Two-way ANOVA currently requires a balanced design with equal cell sizes.',
    )

    const constantCells = [7, 7, 11, 11, 15, 15, 21, 21]
    expect(() => twoWayAnova(constantCells, factor1, factor2)).toThrow(
      'Within-cell variation must be greater than zero for two-way ANOVA.',
    )
  })
})
