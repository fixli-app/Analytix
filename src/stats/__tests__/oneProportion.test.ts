import { describe, expect, it } from 'vitest'
import { oneProportion } from '../oneProportion'

describe('oneProportion', () => {
  it('matches a hand-calculated binary sample fixture', () => {
    const result = oneProportion([...Array<number>(26).fill(1), ...Array<number>(14).fill(0)], 0.5)

    expect(result.count).toBe(40)
    expect(result.successes).toBe(26)
    expect(result.observedProportion).toBe(0.65)
    expect(result.standardError).toBeCloseTo(Math.sqrt(0.25 / 40), 12)
    expect(result.statistic).toBeCloseTo(1.8973665961010275, 12)
    expect(result.pValue).toBeCloseTo(0.05778, 4)
    expect(result.confidenceInterval[0]).toBeCloseTo(0.49505880837, 10)
    expect(result.confidenceInterval[1]).toBeCloseTo(0.77865471127, 10)
    expect(result.expectedSuccesses).toBe(20)
    expect(result.expectedFailures).toBe(20)
  })

  it('omits missing observations', () => {
    const result = oneProportion([1, 0, null, 1, undefined, 0], 0.5)

    expect(result.count).toBe(4)
    expect(result.successes).toBe(2)
    expect(result.observedProportion).toBe(0.5)
  })

  it('rejects non-binary, undersized, invalid null proportion, and invalid alpha', () => {
    expect(() => oneProportion([0, 2, 1], 0.5)).toThrow(
      'Kolumnen måste bara innehålla värdena 0 och 1.',
    )
    expect(() => oneProportion([1], 0.5)).toThrow('Minst två binära observationer krävs.')
    expect(() => oneProportion([0, 1], 0)).toThrow(
      'Den hypotetiska andelen måste vara större än 0 och mindre än 1.',
    )
    expect(() => oneProportion([0, 1], 0.5, 1)).toThrow(
      'Alfa måste vara större än 0 och mindre än 1.',
    )
  })
})
