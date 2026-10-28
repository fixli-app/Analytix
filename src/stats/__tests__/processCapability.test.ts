import { describe, expect, it } from 'vitest'
import { normalProcessCapability } from '../processCapability'

describe('normalProcessCapability', () => {
  it('separates within and overall capability for individual observations', () => {
    const result = normalProcessCapability([1, 2, 3, 4, 5], 0, 6, 3)

    expect(result.count).toBe(5)
    expect(result.mean).toBe(3)
    expect(result.withinStandardDeviation).toBeCloseTo(1 / 1.128, 12)
    expect(result.overallStandardDeviation).toBeCloseTo(Math.sqrt(2.5), 12)
    expect(result.cp).toBeCloseTo(1.128, 12)
    expect(result.cpk).toBeCloseTo(1.128, 12)
    expect(result.pp).toBeCloseTo(6 / (6 * Math.sqrt(2.5)), 12)
    expect(result.ppk).toBeCloseTo(6 / (6 * Math.sqrt(2.5)), 12)
    expect(result.cpm).toBeCloseTo(6 / (6 * Math.sqrt(2.5)), 12)
    expect(result.observedPpm).toBe(0)
    expect(result.expectedOverallPpm).toBeGreaterThan(0)
    expect(result.zBenchWithin).toBeCloseTo(3.384, 3)
  })

  it('omits missing observations and makes target-based Cpm optional', () => {
    const result = normalProcessCapability([1, null, 2, undefined, 3], 0, 4)

    expect(result.count).toBe(3)
    expect(result.cpm).toBeNull()
    expect(result.observedPpm).toBe(0)
  })

  it('counts values outside the inclusive specification limits', () => {
    const result = normalProcessCapability([-1, 0, 2, 4, 5], 0, 4)

    expect(result.outOfSpecCount).toBe(2)
    expect(result.observedPpm).toBe(400_000)
  })

  it('rejects invalid limits, target, non-finite data, undersized, and constant samples', () => {
    expect(() => normalProcessCapability([1, 2], 3, 2)).toThrow(
      'Nedre specifikationsgränsen måste vara lägre än den övre.',
    )
    expect(() => normalProcessCapability([1, 2], 0, 3, Number.NaN)).toThrow(
      'Målvärdet måste vara ett ändligt tal.',
    )
    expect(() => normalProcessCapability([1, Number.POSITIVE_INFINITY], 0, 3)).toThrow(
      'Kolumnen innehåller värden som inte är ändliga tal.',
    )
    expect(() => normalProcessCapability([1, null], 0, 3)).toThrow(
      'Minst två numeriska observationer krävs för kapabilitetsanalysen.',
    )
    expect(() => normalProcessCapability([2, 2, 2], 0, 3)).toThrow(
      'Kapabilitet kan inte beräknas för en process utan observerad variation.',
    )
  })
})
