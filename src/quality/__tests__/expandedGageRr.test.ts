import { describe, expect, it } from 'vitest'
import { expandedGageRr } from '../expandedGageRr'

function expandedFixture() {
  const parts: string[] = []
  const operators: string[] = []
  const conditions: string[] = []
  const measurements: number[] = []
  for (const [part, partCode] of [
    ['P1', -1],
    ['P2', 1],
  ] as const) {
    for (const [operator, operatorCode] of [
      ['A', -1],
      ['B', 1],
    ] as const) {
      for (const [condition, conditionCode] of [
        ['D1', -1],
        ['D2', 1],
      ] as const) {
        for (const repeatability of [-0.2, 0.2]) {
          parts.push(part)
          operators.push(operator)
          conditions.push(condition)
          measurements.push(
            100 +
              Math.sqrt(50.319453125) * partCode +
              Math.sqrt(2.272578125) * operatorCode +
              Math.sqrt(0.585078125) * conditionCode +
              Math.sqrt(0.256953125) * partCode * operatorCode +
              Math.sqrt(0.069453125) * partCode * conditionCode +
              Math.sqrt(0.022578125) * operatorCode * conditionCode +
              Math.sqrt(0.006953125) * partCode * operatorCode * conditionCode +
              repeatability,
          )
        }
      }
    }
  }
  return { parts, operators, conditions, measurements }
}

describe('expandedGageRr', () => {
  it('recovers known components from a balanced three-factor random design', () => {
    const result = expandedGageRr({ ...expandedFixture(), tolerance: 20 })

    expect(result.partCount).toBe(2)
    expect(result.operatorCount).toBe(2)
    expect(result.conditionCount).toBe(2)
    expect(result.replicatesPerCell).toBe(2)
    expect(result.measurementCount).toBe(16)
    expect(result.varianceComponents.part).toBeCloseTo(100, 10)
    expect(result.varianceComponents.operator).toBeCloseTo(4, 10)
    expect(result.varianceComponents.condition).toBeCloseTo(1, 10)
    expect(result.varianceComponents.partOperator).toBeCloseTo(1, 10)
    expect(result.varianceComponents.partCondition).toBeCloseTo(0.25, 10)
    expect(result.varianceComponents.operatorCondition).toBeCloseTo(0.0625, 10)
    expect(result.varianceComponents.partOperatorCondition).toBeCloseTo(0.015625, 10)
    expect(result.varianceComponents.repeatability).toBeCloseTo(0.08, 10)
    expect(result.varianceComponents.total).toBeCloseTo(106.408125, 10)
    expect(result.percentContribution.total).toBe(100)
    expect(result.percentTolerance).toBeGreaterThan(0)
  })

  it('rejects missing factors, unbalanced cells, and invalid tolerance', () => {
    const fixture = expandedFixture()
    expect(() => expandedGageRr({ ...fixture, conditions: fixture.conditions.slice(1) })).toThrow(
      'samma antal rader',
    )
    expect(() =>
      expandedGageRr({
        parts: [...fixture.parts, fixture.parts[0]],
        operators: [...fixture.operators, fixture.operators[0]],
        conditions: [...fixture.conditions, fixture.conditions[0]],
        measurements: [...fixture.measurements, fixture.measurements[0]],
      }),
    ).toThrow('balanserat faktoriellt')
    expect(() => expandedGageRr({ ...fixture, tolerance: 0 })).toThrow('Tolerans')
  })
})
