import { describe, expect, it } from 'vitest'
import { gageLinearityAndBias, gageRunChart, nestedGageRr, type1GageStudy } from '../gageStudy'

describe('gageRunChart', () => {
  it('creates ordered operator series from a balanced crossed study', () => {
    const result = gageRunChart({
      parts: ['P2', 'P2', 'P1', 'P1', 'P2', 'P2', 'P1', 'P1'],
      operators: ['B', 'B', 'B', 'B', 'A', 'A', 'A', 'A'],
      measurements: [20.1, 19.9, 10.1, 9.9, 20.2, 20, 10.2, 10],
    })

    expect(result.partCount).toBe(2)
    expect(result.operatorCount).toBe(2)
    expect(result.replicatesPerCell).toBe(2)
    expect(result.measurementCount).toBe(8)
    expect(result.operators.map((series) => series.operator)).toEqual(['A', 'B'])
    expect(result.operators[0].points).toEqual([
      { part: 'P1', replicate: 1, measurement: 10.2 },
      { part: 'P1', replicate: 2, measurement: 10 },
      { part: 'P2', replicate: 1, measurement: 20.2 },
      { part: 'P2', replicate: 2, measurement: 20 },
    ])
  })

  it('rejects incomplete or unbalanced run-chart studies', () => {
    expect(() =>
      gageRunChart({
        parts: ['P1', 'P1', 'P2'],
        operators: ['A', 'B', 'A'],
        measurements: [1, 2, 3],
      }),
    ).toThrow('Minst två replikat per del-operatörskombination')
    expect(() =>
      gageRunChart({
        parts: ['P1', 'P1', 'P2', 'P2'],
        operators: ['A', 'A', 'A', 'B'],
        measurements: [1, 2, 3, 4],
      }),
    ).toThrow('komplett, balanserat')
  })
})

describe('type1GageStudy', () => {
  it('calculates repeatability, bias, Cg, Cgk, and a bias interval', () => {
    const result = type1GageStudy({
      measurements: [9.9, 10, 10.1, 10.2, 9.8, 10, 10.1, 9.9],
      referenceValue: 10,
      tolerance: 2,
    })

    expect(result.count).toBe(8)
    expect(result.mean).toBeCloseTo(10, 12)
    expect(result.bias).toBeCloseTo(0, 12)
    expect(result.standardDeviation).toBeCloseTo(Math.sqrt(0.12 / 7), 12)
    expect(result.percentTolerance).toBeCloseTo((6 * Math.sqrt(0.12 / 7) * 100) / 2, 10)
    expect(result.cg).toBeCloseTo((0.2 * 2) / (6 * Math.sqrt(0.12 / 7)), 10)
    expect(result.cgk).toBeCloseTo(result.cg, 10)
    expect(result.biasPValue).toBeCloseTo(1, 12)
    expect(result.biasConfidenceInterval[0]).toBeLessThan(0)
    expect(result.biasConfidenceInterval[1]).toBeGreaterThan(0)
  })

  it('rejects constant measurements and invalid study settings', () => {
    expect(() =>
      type1GageStudy({ measurements: [5, 5, 5], referenceValue: 5, tolerance: 1 }),
    ).toThrow('utan observerad mätvariation')
    expect(() => type1GageStudy({ measurements: [1, 2], referenceValue: 1, tolerance: 0 })).toThrow(
      'Tolerans',
    )
  })
})

describe('gageLinearityAndBias', () => {
  it('detects a linear change in bias across reference levels', () => {
    const result = gageLinearityAndBias({
      referenceValues: [1, 2, 3, 4],
      measurements: [1.1, 2.2, 3.3, 4.4],
    })

    expect(result.count).toBe(4)
    expect(result.levelCount).toBe(4)
    expect(result.slope).toBeCloseTo(0.1, 12)
    expect(result.intercept).toBeCloseTo(0, 12)
    expect(result.rSquared).toBeCloseTo(1, 10)
    expect(result.slopePValue).toBeLessThan(0.05)
    expect(result.slopeConfidenceInterval[0]).toBeCloseTo(0.1, 8)
    expect(result.slopeConfidenceInterval[1]).toBeCloseTo(0.1, 8)
    expect(result.fittedBiasAtMinimum).toBeCloseTo(0.1, 12)
    expect(result.fittedBiasAtMaximum).toBeCloseTo(0.4, 12)
  })

  it('omits incomplete pairs but requires three reference levels', () => {
    const result = gageLinearityAndBias({
      referenceValues: [1, 2, null, 3, 4],
      measurements: [1.1, 2.2, 3, 3.3, 4.4],
    })
    expect(result.count).toBe(4)

    expect(() =>
      gageLinearityAndBias({ referenceValues: [1, 1, 2], measurements: [1, 1.1, 2.1] }),
    ).toThrow('tre referensnivåer')
  })

  it('rejects mismatched lengths and invalid significance levels', () => {
    expect(() =>
      gageLinearityAndBias({ referenceValues: [1, 2, 3], measurements: [1, 2] }),
    ).toThrow('samma antal rader')
    expect(() =>
      gageLinearityAndBias({ referenceValues: [1, 2, 3], measurements: [1, 2, 3], alpha: 1 }),
    ).toThrow('Signifikansnivån')
  })
})

describe('nestedGageRr', () => {
  function nestedFixture() {
    const parts: string[] = []
    const operators: string[] = []
    const measurements: number[] = []
    for (const [operator, operatorEffect] of [
      ['A', -1],
      ['B', 0],
      ['C', 1],
    ] as const) {
      for (const [part, partEffect] of [
        ['Part 1', -1],
        ['Part 2', 1],
      ] as const) {
        for (const repeatEffect of [-0.1, 0.1]) {
          operators.push(operator)
          parts.push(part)
          measurements.push(10 + operatorEffect + partEffect + repeatEffect)
        }
      }
    }
    return { parts, operators, measurements }
  }

  it('estimates nested operator, part-within-operator, and repeatability components', () => {
    const result = nestedGageRr({ ...nestedFixture(), tolerance: 3 })
    expect(result.operatorCount).toBe(3)
    expect(result.partsPerOperator).toBe(2)
    expect(result.replicatesPerPart).toBe(2)
    expect(result.measurementCount).toBe(12)
    expect(result.varianceComponents.repeatability).toBeCloseTo(0.02, 12)
    expect(result.varianceComponents.partWithinOperator).toBeCloseTo(1.99, 12)
    expect(result.varianceComponents.operator).toBeCloseTo(0, 12)
    expect(result.varianceComponents.gageRr).toBeCloseTo(0.02, 12)
    expect(result.percentTolerance).toBeCloseTo((6 * Math.sqrt(0.02) * 100) / 3, 10)
    expect(result.numberOfDistinctCategories).toBe(14)
  })

  it('rejects incomplete or unbalanced nested layouts', () => {
    const fixture = nestedFixture()
    expect(() => nestedGageRr({ ...fixture, parts: fixture.parts.slice(1) })).toThrow(
      'samma antal rader',
    )
    expect(() =>
      nestedGageRr({ ...fixture, measurements: [null, ...fixture.measurements.slice(1)] }),
    ).toThrow('kompletta')
    expect(() =>
      nestedGageRr({
        parts: ['P1', 'P1', 'P2', 'P2', 'P3', 'P3', 'P4', 'P4', 'P5', 'P5'],
        operators: ['A', 'A', 'A', 'A', 'A', 'A', 'B', 'B', 'B', 'B'],
        measurements: [1, 2, 2, 3, 3, 4, 1, 2, 2, 3],
      }),
    ).toThrow('samma antal delar per operatör')
  })
})
