import { describe, expect, it } from 'vitest'
import { pairedT } from '../pairedT'

describe('pairedT', () => {
  it('tests within-row differences and returns a confidence interval', () => {
    const result = pairedT([8, 6, 9, 7, 10], [6, 5, 7, 5, 8])

    expect(result.pairCount).toBe(5)
    expect(result.meanDifference).toBeCloseTo(1.8, 12)
    expect(result.standardDeviation).toBeCloseTo(Math.sqrt(0.2), 12)
    expect(result.statistic).toBeCloseTo(9, 12)
    expect(result.degreesOfFreedom).toBe(4)
    expect(result.pValue).toBeCloseTo(0.000842, 5)
    expect(result.confidenceInterval[0]).toBeCloseTo(1.244711, 5)
    expect(result.confidenceInterval[1]).toBeCloseTo(2.355289, 5)
  })

  it('omits a pair if either observation is missing', () => {
    const result = pairedT([8, null, 9, 7, 10], [6, 5, 6, 5, 8])

    expect(result.pairCount).toBe(4)
    expect(result.meanDifference).toBe(2.25)
  })

  it('rejects mismatched column lengths and non-finite observations', () => {
    expect(() => pairedT([1, 2], [1])).toThrow('Parade kolumner måste ha lika många rader.')
    expect(() => pairedT([1, Number.NaN], [1, 2])).toThrow(
      'Parade kolumner innehåller värden som inte är ändliga tal.',
    )
  })

  it('rejects undersized and constant difference samples', () => {
    expect(() => pairedT([1, 2], [0, 1])).toThrow(
      'Ett 1-urvals t-test kräver en varierande kolumn.',
    )
    expect(() => pairedT([1], [1])).toThrow(
      'Minst två observationer krävs för ett 1-urvals t-test.',
    )
  })
})
