import { describe, expect, it } from 'vitest'
import { multipleLinearRegression } from '../regressionModel'

describe('multipleLinearRegression model terms', () => {
  it('uses the first sorted category as the treatment reference level', () => {
    const x = [-2, -2, -1, -1, 1, 1, 2, 2]
    const group = ['A', 'B', 'A', 'B', 'A', 'B', 'A', 'B']
    const errors = [1, -1, -1, 1, -1, 1, 1, -1]
    const response = x.map(
      (value, index) => 10 + 2 * value + (group[index] === 'B' ? 3 : 0) + errors[index],
    )
    const result = multipleLinearRegression(response, [
      { name: 'Group', type: 'categorical', values: group },
      { name: 'X', type: 'numeric', values: x },
    ])

    expect(result.coefficients.map((coefficient) => coefficient.term)).toEqual([
      '(Intercept)',
      'Group[B]',
      'X',
    ])
    expect(result.coefficients.map((coefficient) => coefficient.estimate)).toEqual([
      expect.closeTo(10, 12),
      expect.closeTo(3, 12),
      expect.closeTo(2, 12),
    ])
    expect(result.errorSumSquares).toBeCloseTo(8, 12)
  })

  it('fits centered quadratic terms when requested', () => {
    const x = Array.from({ length: 8 }, (_, value) => value - 3).flatMap((value) => [
      value,
      value,
      value,
    ])
    const errors = Array.from({ length: 8 }, () => [1, -1, 0]).flat()
    const response = x.map(
      (value, index) => 3 + 2 * value + 0.5 * (value - 0.5) ** 2 + errors[index],
    )
    const result = multipleLinearRegression(response, [{ name: 'X', type: 'numeric', values: x }], {
      quadraticPredictors: ['X'],
    })

    expect(result.coefficients.map((coefficient) => coefficient.term)).toEqual([
      '(Intercept)',
      'X',
      'X^2',
    ])
    expect(result.coefficients[0].estimate).toBeCloseTo(3, 12)
    expect(result.coefficients[1].estimate).toBeCloseTo(2, 12)
    expect(result.coefficients[2].estimate).toBeCloseTo(0.5, 12)
  })

  it('fits pairwise interactions across categorical factors', () => {
    const factorA = ['A1', 'A1', 'A1', 'A1', 'A2', 'A2', 'A2', 'A2']
    const factorB = ['B1', 'B1', 'B2', 'B2', 'B1', 'B1', 'B2', 'B2']
    const response = [9, 11, 12, 14, 13, 15, 18, 20]
    const result = multipleLinearRegression(
      response,
      [
        { name: 'A', type: 'categorical', values: factorA },
        { name: 'B', type: 'categorical', values: factorB },
      ],
      { includeInteractions: true },
    )

    expect(result.coefficients.map((coefficient) => coefficient.term)).toEqual([
      '(Intercept)',
      'A[A2]',
      'B[B2]',
      'A[A2]:B[B2]',
    ])
    expect(result.coefficients.map((coefficient) => coefficient.estimate)).toEqual([
      expect.closeTo(10, 12),
      expect.closeTo(4, 12),
      expect.closeTo(3, 12),
      expect.closeTo(2, 12),
    ])
  })

  it('preserves complete-case behavior and rejects unsupported quadratic terms', () => {
    const result = multipleLinearRegression(
      [1, 3, 2, 5, 4],
      [
        { name: 'Group', type: 'categorical', values: ['A', 'B', 'A', 'B', null] },
        { name: 'X', type: 'numeric', values: [1, 2, 3, 4, 5] },
      ],
    )
    expect(result.count).toBe(4)
    expect(result.droppedCount).toBe(1)
    expect(() =>
      multipleLinearRegression(
        [1, 2, 3],
        [{ name: 'Group', type: 'categorical', values: ['A', 'B', 'A'] }],
        { quadraticPredictors: ['Group'] },
      ),
    ).toThrow('Quadratic term Group requires a selected numeric predictor.')
  })
})
