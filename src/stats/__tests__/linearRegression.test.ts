import { describe, expect, it } from 'vitest'
import { linearRegression } from '../linearRegression'

function regressionFixture() {
  const x = [1, 2, 3, 4, 5, 6, 7, 8]
  const z = [0, 1, 0, 1, 0, 1, 0, 1]
  const errors = [1, -1, -1, 1, -1, 1, 1, -1]
  const y = x.map((value, index) => 5 + 2 * value - 3 * z[index] + errors[index])
  return { x, z, y, errors }
}

describe('linearRegression', () => {
  it('recovers known coefficients and computes inference and diagnostics using QR', () => {
    const { x, z, y, errors } = regressionFixture()
    const result = linearRegression(y, [
      { name: 'Temperature', values: x },
      { name: 'Pressure', values: z },
    ])

    expect(result.coefficients[0].estimate).toBeCloseTo(5, 12)
    expect(result.coefficients[1].estimate).toBeCloseTo(2, 12)
    expect(result.coefficients[2].estimate).toBeCloseTo(-3, 12)
    expect(result.coefficients[0].standardError).toBeCloseTo(Math.sqrt(1.6 * 0.65), 12)
    expect(result.coefficients[1].standardError).toBeCloseTo(Math.sqrt(1.6 * 0.025), 12)
    expect(result.coefficients[2].standardError).toBeCloseTo(Math.sqrt(1.6 * 0.525), 12)
    expect(result.errorSumSquares).toBeCloseTo(8, 12)
    expect(result.degreesOfFreedom).toBe(5)
    expect(result.rSquared).toBeCloseTo(1 - 8 / result.totalSumSquares, 12)
    expect(result.adjustedRSquared).toBeLessThan(result.rSquared)
    expect(result.durbinWatson).toBeCloseTo(2.5, 12)
    result.observations.forEach((observation, index) => {
      expect(observation.residual).toBeCloseTo(errors[index], 12)
    })
    expect(
      result.observations.every(
        (observation) => observation.leverage > 0 && observation.leverage < 1,
      ),
    ).toBe(true)
    expect(
      result.observations.reduce((sum, observation) => sum + observation.leverage, 0),
    ).toBeCloseTo(3, 12)
    expect(
      result.observations.every(
        (observation) => observation.predictionInterval[0] < observation.fitted,
      ),
    ).toBe(true)
    expect(
      result.coefficients.every(
        (coefficient) =>
          coefficient.confidenceInterval[0] < coefficient.estimate &&
          coefficient.confidenceInterval[1] > coefficient.estimate,
      ),
    ).toBe(true)
    expect(result.coefficients[1].vif).toBeCloseTo(1.05, 12)
    expect(result.anova.map((row) => row.source)).toEqual(['regression', 'error', 'total'])
  })

  it('drops incomplete rows but retains original worksheet row numbers', () => {
    const { x, z, y } = regressionFixture()
    const result = linearRegression(
      [...y, null],
      [
        { name: 'X', values: [...x, 9] },
        { name: 'Z', values: [...z, null] },
      ],
    )

    expect(result.count).toBe(8)
    expect(result.droppedCount).toBe(1)
    expect(result.observations.at(-1)?.sourceRow).toBe(8)
  })

  it('rejects collinear, constant, undersized, nonfinite, and mismatched data', () => {
    const { x, y } = regressionFixture()
    expect(() =>
      linearRegression(y, [
        { name: 'X', values: x },
        { name: '2X', values: x.map((value) => value * 2) },
      ]),
    ).toThrow('Predictors are collinear')
    expect(() => linearRegression(y, [{ name: 'Constant', values: x.map(() => 1) }])).toThrow(
      'Predictor Constant has no variation.',
    )
    expect(() => linearRegression([1, 2], [{ name: 'X', values: [1, 2] }])).toThrow(
      'Linear regression needs more complete observations than model parameters.',
    )
    expect(() =>
      linearRegression([1, Number.POSITIVE_INFINITY, 3, 4], [{ name: 'X', values: [1, 2, 3, 4] }]),
    ).toThrow('Nonfinite value on row 2.')
    expect(() => linearRegression(y, [{ name: 'X', values: x.slice(1) }])).toThrow(
      'Response and predictor columns must have the same number of rows.',
    )
  })
})
