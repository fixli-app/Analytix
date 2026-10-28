import { describe, expect, it } from 'vitest'
import { crossedGageRr } from '../gageRr'

function knownComponentFixture() {
  const partOffset = Math.sqrt(50.375)
  const operatorOffset = Math.sqrt(2.375)
  const interactionOffset = Math.sqrt(3 / 8)
  const repeatabilityOffset = Math.sqrt(0.5)
  const parts: string[] = []
  const operators: string[] = []
  const measurements: number[] = []
  const cells = [
    ['P1', 'A', -partOffset, -operatorOffset, interactionOffset],
    ['P1', 'B', -partOffset, operatorOffset, -interactionOffset],
    ['P2', 'A', partOffset, -operatorOffset, -interactionOffset],
    ['P2', 'B', partOffset, operatorOffset, interactionOffset],
  ] as const

  cells.forEach(([part, operator, partEffect, operatorEffect, interaction]) => {
    ;[-repeatabilityOffset, repeatabilityOffset].forEach((error) => {
      parts.push(part)
      operators.push(operator)
      measurements.push(partEffect + operatorEffect + interaction + error)
    })
  })

  return { parts, operators, measurements }
}

describe('crossedGageRr', () => {
  it('recovers known crossed-ANOVA variance components and study metrics', () => {
    const fixture = knownComponentFixture()
    const result = crossedGageRr({ ...fixture, tolerance: 10 })

    expect(result.partCount).toBe(2)
    expect(result.operatorCount).toBe(2)
    expect(result.replicatesPerCell).toBe(2)
    expect(result.measurementCount).toBe(8)
    expect(result.anova.map((row) => row.meanSquare)).toEqual([
      expect.closeTo(403, 10),
      expect.closeTo(19, 10),
      expect.closeTo(3, 10),
      expect.closeTo(1, 10),
    ])
    expect(result.varianceComponents.repeatability).toBeCloseTo(1, 10)
    expect(result.varianceComponents.partOperator).toBeCloseTo(1, 10)
    expect(result.varianceComponents.operator).toBeCloseTo(4, 10)
    expect(result.varianceComponents.reproducibility).toBeCloseTo(5, 10)
    expect(result.varianceComponents.gageRr).toBeCloseTo(6, 10)
    expect(result.varianceComponents.partToPart).toBeCloseTo(100, 10)
    expect(result.varianceComponents.total).toBeCloseTo(106, 10)
    expect(result.percentContribution.gageRr).toBeCloseTo((6 / 106) * 100, 10)
    expect(result.percentStudyVariation.gageRr).toBeCloseTo(
      (Math.sqrt(6) / Math.sqrt(106)) * 100,
      10,
    )
    expect(result.percentTolerance).toBeCloseTo((6 * Math.sqrt(6) * 100) / 10, 10)
    expect(result.numberOfDistinctCategories).toBe(5)
  })

  it('rejects mismatched, missing, incomplete, unbalanced, and undersized designs', () => {
    const fixture = knownComponentFixture()
    expect(() => crossedGageRr({ ...fixture, operators: fixture.operators.slice(1) })).toThrow(
      'Part, operatör och mätkolumn måste ha samma antal rader.',
    )
    expect(() =>
      crossedGageRr({ ...fixture, measurements: [null, ...fixture.measurements.slice(1)] }),
    ).toThrow('Gage R&R kräver kompletta part-, operatörs- och mätvärden på varje rad.')
    expect(() =>
      crossedGageRr({
        ...fixture,
        parts: fixture.parts.map((part) => (part === 'P2' ? 'P1' : part)),
      }),
    ).toThrow('Crossed Gage R&R kräver minst två delar och två operatörer.')
    expect(() =>
      crossedGageRr({
        parts: ['P1', 'P1', 'P2', 'P2'],
        operators: ['A', 'A', 'A', 'B'],
        measurements: [1, 2, 3, 4],
      }),
    ).toThrow('komplett, balanserat antal replikat')
    expect(() =>
      crossedGageRr({
        parts: ['P1', 'P2'],
        operators: ['A', 'A'],
        measurements: [1, 2],
      }),
    ).toThrow('Crossed Gage R&R kräver minst två delar och två operatörer.')
  })

  it('rejects invalid tolerances and non-finite measurements', () => {
    const fixture = knownComponentFixture()
    expect(() => crossedGageRr({ ...fixture, tolerance: 0 })).toThrow(
      'Tolerans måste vara ett ändligt tal större än 0.',
    )
    expect(() =>
      crossedGageRr({ ...fixture, measurements: [Number.NaN, ...fixture.measurements.slice(1)] }),
    ).toThrow('Mätvärden måste vara ändliga tal.')
  })

  it('does not turn floating-point noise into a false part-operator interaction', () => {
    const result = crossedGageRr({
      parts: ['P1', 'P1', 'P1', 'P1', 'P1', 'P1', 'P2', 'P2', 'P2', 'P2', 'P2', 'P2'],
      operators: ['A', 'A', 'A', 'B', 'B', 'B', 'A', 'A', 'A', 'B', 'B', 'B'],
      measurements: [10, 11, 9, 13, 14, 12, 20, 21, 19, 23, 24, 22],
    })
    const interaction = result.anova.find((row) => row.source === 'partOperator')!

    expect(interaction.sumSquares).toBe(0)
    expect(interaction.fStatistic).toBe(0)
    expect(interaction.pValue).toBe(1)
  })
})
