import { describe, expect, it } from 'vitest'
import { calculateDefectMetrics } from '../defectMetrics'

describe('calculateDefectMetrics', () => {
  it('calculates DPU, defective-unit PPM, DPMO, yield, and shifted sigma level', () => {
    const result = calculateDefectMetrics({
      units: 100,
      defectiveUnits: 5,
      defects: 10,
      opportunitiesPerUnit: 2,
      sigmaShift: 1.5,
    })

    expect(result.totalOpportunities).toBe(200)
    expect(result.dpu).toBe(0.1)
    expect(result.ppm).toBe(50_000)
    expect(result.dpmo).toBe(50_000)
    expect(result.firstPassYield).toBe(0.95)
    expect(result.sigmaLevel).toBeCloseTo(3.144853626951, 12)
  })

  it('supports zero defects and returns an infinite ideal sigma estimate', () => {
    const result = calculateDefectMetrics({
      units: 10,
      defectiveUnits: 0,
      defects: 0,
      opportunitiesPerUnit: 3,
      sigmaShift: 0,
    })

    expect(result.ppm).toBe(0)
    expect(result.dpmo).toBe(0)
    expect(result.firstPassYield).toBe(1)
    expect(result.sigmaLevel).toBe(Number.POSITIVE_INFINITY)
  })

  it('returns no sigma estimate when the estimated yield is zero or lower', () => {
    const result = calculateDefectMetrics({
      units: 2,
      defectiveUnits: 2,
      defects: 4,
      opportunitiesPerUnit: 2,
      sigmaShift: 1.5,
    })
    expect(result.sigmaLevel).toBeNull()
  })

  it('rejects invalid counts, opportunities, and shift', () => {
    expect(() =>
      calculateDefectMetrics({
        units: 0,
        defectiveUnits: 0,
        defects: 0,
        opportunitiesPerUnit: 1,
        sigmaShift: 1.5,
      }),
    ).toThrow('Antal enheter måste vara ett positivt heltal.')
    expect(() =>
      calculateDefectMetrics({
        units: 10,
        defectiveUnits: 11,
        defects: 11,
        opportunitiesPerUnit: 1,
        sigmaShift: 1.5,
      }),
    ).toThrow('Antal defekta enheter måste vara ett heltal mellan 0 och antal enheter.')
    expect(() =>
      calculateDefectMetrics({
        units: 10,
        defectiveUnits: 2,
        defects: 1,
        opportunitiesPerUnit: 1,
        sigmaShift: 1.5,
      }),
    ).toThrow(
      'Antal defekter måste vara ett heltal och minst lika stort som antal defekta enheter.',
    )
    expect(() =>
      calculateDefectMetrics({
        units: 10,
        defectiveUnits: 2,
        defects: 4,
        opportunitiesPerUnit: 0,
        sigmaShift: 1.5,
      }),
    ).toThrow('Möjligheter per enhet måste vara ett positivt heltal.')
    expect(() =>
      calculateDefectMetrics({
        units: 10,
        defectiveUnits: 2,
        defects: 4,
        opportunitiesPerUnit: 1,
        sigmaShift: -1,
      }),
    ).toThrow('Sigma-skiftet måste vara ett ändligt, icke-negativt tal.')
  })
})
