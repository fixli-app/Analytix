import { describe, expect, it } from 'vitest'
import { twoProportions } from '../twoProportions'

describe('twoProportions', () => {
  it('uses the pooled null standard error and Newcombe-Wilson interval', () => {
    const first = [...Array<number>(26).fill(1), ...Array<number>(14).fill(0)]
    const second = [...Array<number>(18).fill(1), ...Array<number>(22).fill(0)]
    const result = twoProportions(first, second)

    expect(result.count1).toBe(40)
    expect(result.count2).toBe(40)
    expect(result.proportion1).toBe(0.65)
    expect(result.proportion2).toBe(0.45)
    expect(result.pooledProportion).toBe(0.55)
    expect(result.statistic).toBeCloseTo(1.7978662999, 10)
    expect(result.pValue).toBeCloseTo(0.0721981977, 10)
    expect(result.confidenceInterval[0]).toBeCloseTo(-0.01684653197, 10)
    expect(result.confidenceInterval[1]).toBeCloseTo(0.39231707467, 10)
    expect(result.expectedSuccesses1).toBe(22)
    expect(result.expectedFailures2).toBe(18)
  })

  it('omits missing observations independently in each group', () => {
    const result = twoProportions([1, 0, 1, null], [0, 1, 0, 1, undefined])

    expect(result.count1).toBe(3)
    expect(result.count2).toBe(4)
    expect(result.successes1).toBe(2)
    expect(result.successes2).toBe(2)
  })

  it('rejects invalid alpha, non-binary data, empty groups, and zero pooled variance', () => {
    expect(() => twoProportions([0, 1], [1, 0], 1)).toThrow(
      'Alfa måste vara större än 0 och mindre än 1.',
    )
    expect(() => twoProportions([0, 2], [1, 0])).toThrow(
      'Grupperna måste bara innehålla värdena 0 och 1.',
    )
    expect(() => twoProportions([], [1])).toThrow('Minst en observation krävs i varje grupp.')
    expect(() => twoProportions([1, 1], [1, 1])).toThrow(
      'Det poolade utfallet har ingen variation under H₀.',
    )
  })
})
