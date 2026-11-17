import { describe, expect, it } from 'vitest'
import { calculateOeeTakt } from '../oeeTakt'

const fixture = {
  availableTime: 480,
  plannedDowntime: 30,
  unplannedDowntime: 45,
  idealCycleTime: 0.5,
  totalUnits: 720,
  goodUnits: 684,
  customerDemand: 700,
}

describe('calculateOeeTakt', () => {
  it('calculates OEE factors, takt time, and theoretical capacity', () => {
    const result = calculateOeeTakt(fixture)

    expect(result.plannedProductionTime).toBe(450)
    expect(result.operatingTime).toBe(405)
    expect(result.availability).toBeCloseTo(0.9, 12)
    expect(result.performance).toBeCloseTo(360 / 405, 12)
    expect(result.quality).toBeCloseTo(0.95, 12)
    expect(result.oee).toBeCloseTo(0.76, 12)
    expect(result.taktTime).toBeCloseTo(450 / 700, 12)
    expect(result.theoreticalCapacity).toBe(900)
    expect(result.capacityGap).toBe(200)
    expect(result.warnings).toEqual([])
  })

  it('warns when measured performance or demand exceeds the entered cycle-time model', () => {
    const result = calculateOeeTakt({
      ...fixture,
      idealCycleTime: 0.7,
      customerDemand: 500,
    })
    expect(result.performance).toBeGreaterThan(1)
    expect(result.warnings).toHaveLength(2)
  })

  it('rejects invalid time and count inputs', () => {
    expect(() => calculateOeeTakt({ ...fixture, availableTime: 0 })).toThrow('Tillgänglig tid')
    expect(() => calculateOeeTakt({ ...fixture, plannedDowntime: 480 })).toThrow('Planerat stopp')
    expect(() => calculateOeeTakt({ ...fixture, unplannedDowntime: 450 })).toThrow(
      'Oplanerat stopp',
    )
    expect(() => calculateOeeTakt({ ...fixture, totalUnits: 0 })).toThrow('Producerat antal')
    expect(() => calculateOeeTakt({ ...fixture, goodUnits: 721 })).toThrow('Godkänt antal')
    expect(() => calculateOeeTakt({ ...fixture, customerDemand: 0 })).toThrow('Kundbehov')
  })
})
