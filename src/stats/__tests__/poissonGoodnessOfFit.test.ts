import { describe, expect, it } from 'vitest'
import { poissonGoodnessOfFit } from '../poissonGoodnessOfFit'

function poissonTwoFixture() {
  return [
    ...Array(5).fill(0),
    ...Array(8).fill(1),
    ...Array(7).fill(2),
    ...Array(5).fill(3),
    ...Array(3).fill(4),
    5,
    6,
  ]
}

describe('poissonGoodnessOfFit', () => {
  it('estimates lambda, pools low expected tails, and adjusts degrees of freedom', () => {
    const result = poissonGoodnessOfFit(poissonTwoFixture())

    expect(result.count).toBe(30)
    expect(result.rate).toBeCloseTo(2, 12)
    expect(result.rateSource).toBe('estimated')
    expect(result.categories).toEqual(['0–1', '2', '≥3'])
    expect(result.observed).toEqual([13, 7, 10])
    expect(result.expected[0]).toBeCloseTo(12.1801755, 6)
    expect(result.expected[1]).toBeCloseTo(8.120117, 6)
    expect(result.expected[2]).toBeCloseTo(9.6997075, 6)
    expect(result.expected.reduce((total, value) => total + value, 0)).toBeCloseTo(30, 10)
    expect(result.degreesOfFreedom).toBe(1)
    expect(result.statistic).toBeGreaterThan(0)
    expect(result.pValue).toBeGreaterThan(0)
    expect(result.pValue).toBeLessThan(1)
    expect(result.minimumExpectedCount).toBeGreaterThanOrEqual(5)
  })

  it('omits missing counts and respects alpha and the pooling threshold', () => {
    const result = poissonGoodnessOfFit([...poissonTwoFixture(), null, undefined], 0.1, 4)

    expect(result.count).toBe(30)
    expect(result.alpha).toBe(0.1)
    expect(result.minimumExpectedCount).toBeGreaterThanOrEqual(4)
  })

  it('uses a specified lambda without subtracting an estimated parameter from degrees of freedom', () => {
    const result = poissonGoodnessOfFit(poissonTwoFixture(), 0.05, 5, 1.5)

    expect(result.rate).toBe(1.5)
    expect(result.rateSource).toBe('specified')
    expect(result.degreesOfFreedom).toBe(result.categories.length - 1)
    expect(result.expected.reduce((total, value) => total + value, 0)).toBeCloseTo(30, 10)
  })

  it('rejects invalid counts, empty/zero-rate data, alpha, pooling threshold, and insufficient classes', () => {
    expect(() => poissonGoodnessOfFit([1, 1.5, 2])).toThrow(
      'Poisson-data måste vara icke-negativa heltalsräkningar.',
    )
    expect(() => poissonGoodnessOfFit([1, -1, 2])).toThrow(
      'Poisson-data måste vara icke-negativa heltalsräkningar.',
    )
    expect(() => poissonGoodnessOfFit([Number.NaN, 1])).toThrow(
      'Poisson-data innehåller värden som inte är ändliga tal.',
    )
    expect(() => poissonGoodnessOfFit([null, undefined])).toThrow(
      'Minst en Poisson-observation krävs.',
    )
    expect(() => poissonGoodnessOfFit([0, 0, 0])).toThrow(
      'Poisson-goodness-of-fit kräver en positiv skattad hastighet.',
    )
    expect(() => poissonGoodnessOfFit(poissonTwoFixture(), 1)).toThrow(
      'Alfa måste vara större än 0 och mindre än 1.',
    )
    expect(() => poissonGoodnessOfFit(poissonTwoFixture(), 0.05, 0)).toThrow(
      'Minsta förväntade antal måste vara större än 0.',
    )
    expect(() => poissonGoodnessOfFit(poissonTwoFixture(), 0.05, 5, 0)).toThrow(
      'Specificerad Poisson-hastighet måste vara större än 0.',
    )
    expect(() => poissonGoodnessOfFit([0, 0, 0, 0, 0, 1, 1, 1, 1, 1])).toThrow(
      'För få kategorier återstår efter sammanslagning för ett Poisson-chi-två-test.',
    )
  })
})
