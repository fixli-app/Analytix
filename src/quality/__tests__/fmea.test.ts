import { describe, expect, it } from 'vitest'
import { calculateRiskPriorityNumber } from '../fmea'

describe('calculateRiskPriorityNumber', () => {
  it('multiplies severity, occurrence, and detection scores', () => {
    expect(calculateRiskPriorityNumber({ severity: 8, occurrence: 5, detection: 3 })).toBe(120)
  })

  it('keeps the full 1-to-10 scale endpoints', () => {
    expect(calculateRiskPriorityNumber({ severity: 1, occurrence: 1, detection: 1 })).toBe(1)
    expect(calculateRiskPriorityNumber({ severity: 10, occurrence: 10, detection: 10 })).toBe(1000)
  })

  it('rejects scores outside the defined integer scale', () => {
    expect(() => calculateRiskPriorityNumber({ severity: 0, occurrence: 2, detection: 3 })).toThrow(
      'severity måste vara ett heltal mellan 1 och 10.',
    )
    expect(() =>
      calculateRiskPriorityNumber({ severity: 1, occurrence: 1.5, detection: 3 }),
    ).toThrow('occurrence måste vara ett heltal mellan 1 och 10.')
  })
})
