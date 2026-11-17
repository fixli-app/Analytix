import { describe, expect, it } from 'vitest'
import {
  attributeControlChart,
  cusumControlChart,
  ewmaControlChart,
  zMrControlChart,
} from '../advancedControlCharts'

const defectCounts = [2, 3, 1, 25]

describe('attributeControlChart', () => {
  it('calculates a p chart with variable sample sizes and signals', () => {
    const result = attributeControlChart('p', defectCounts, [100, 100, 100, 100])
    expect(result.centerLine).toBeCloseTo(0.0775, 12)
    expect(result.points[0].value).toBe(0.02)
    expect(result.points[3].value).toBe(0.25)
    expect(result.signals.map((signal) => signal.observation)).toEqual([4])

    const variable = attributeControlChart('p', [2, 8, 3], [40, 100, 60])
    expect(variable.points[0].upperControlLimit).not.toBe(variable.points[1].upperControlLimit)
  })

  it('calculates np, c, and u charts with the proper subgroup denominators', () => {
    const np = attributeControlChart('np', defectCounts, [100, 100, 100, 100])
    expect(np.centerLine).toBeCloseTo(7.75, 12)
    expect(np.points[3].signal).toBe(true)
    expect(() => attributeControlChart('np', [2, 3], [10, 20])).toThrow('samma stickprovsstorlek')

    const c = attributeControlChart('c', defectCounts)
    expect(c.centerLine).toBeCloseTo(7.75, 12)
    expect(c.points[3].signal).toBe(true)

    const u = attributeControlChart('u', defectCounts, [10, 10, 20, 10])
    expect(u.centerLine).toBeCloseTo(0.62, 12)
    expect(u.points[2].value).toBe(0.05)
    expect(u.points[3].value).toBe(2.5)
    expect(u.points[3].signal).toBe(true)
  })

  it('clamps proportion chart limits to physically possible values', () => {
    const p = attributeControlChart('p', [1, 1], [2, 2])
    const np = attributeControlChart('np', [1, 1], [2, 2])
    expect(
      p.points.every((point) => point.lowerControlLimit >= 0 && point.upperControlLimit <= 1),
    ).toBe(true)
    expect(
      np.points.every((point) => point.lowerControlLimit >= 0 && point.upperControlLimit <= 2),
    ).toBe(true)
  })

  it('widens P-prime limits using the standardized moving-range estimate', () => {
    const counts = [0, 0, 0, 5]
    const sizes = [100, 100, 100, 100]
    const standard = attributeControlChart('p', counts, sizes)
    const laney = attributeControlChart('pPrime', counts, sizes)
    const standardError = Math.sqrt((0.0125 * 0.9875) / 100)
    const expectedDispersion = 0.05 / standardError / 3 / 1.128

    expect(laney.dispersionMultiplier).toBeCloseTo(expectedDispersion, 12)
    expect(standard.points[3].signal).toBe(true)
    expect(laney.points[3].signal).toBe(false)
    expect(laney.points[3].upperControlLimit).toBeGreaterThan(standard.points[3].upperControlLimit)
  })

  it('calculates U-prime limits from changing opportunity denominators', () => {
    const result = attributeControlChart('uPrime', [1, 2, 1, 6], [10, 20, 10, 20])
    expect(result.kind).toBe('uPrime')
    expect(result.centerLine).toBeCloseTo(10 / 60, 12)
    expect(result.dispersionMultiplier).toBeGreaterThan(0)
    expect(result.points[3].value).toBe(0.3)
    expect(result.points.every((point) => point.lowerControlLimit >= 0)).toBe(true)
  })

  it('rejects Laney charts without estimable standardized variation', () => {
    expect(() => attributeControlChart('pPrime', [2, 2, 2], [100, 100, 100])).toThrow(
      'varierande standardiserade värden',
    )
  })

  it('rejects invalid counts, denominators, and insufficient subgroups', () => {
    expect(() => attributeControlChart('c', [1])).toThrow('Minst två')
    expect(() => attributeControlChart('p', [1.5, 2], [10, 10])).toThrow('heltal')
    expect(() => attributeControlChart('p', [11, 2], [10, 10])).toThrow('överstiga')
    expect(() => attributeControlChart('u', [1, 2], [1, 0])).toThrow('större än 0')
  })
})

describe('cusumControlChart', () => {
  it('detects a sustained standardized shift using reference and decision values', () => {
    const result = cusumControlChart([0, 0, 1.5, 1.5, 1.5, 1.5], 0, 1, 0.5, 2)
    expect(result.points.map((point) => point.positiveCusum)).toEqual([0, 0, 1, 2, 3, 4])
    expect(result.signals.map((signal) => signal.observation)).toEqual([5, 6])
    expect(result.points[4].negativeCusum).toBe(0)
  })

  it('requires complete data and positive chart parameters', () => {
    expect(() => cusumControlChart([1, null], 0, 1, 0.5, 3)).toThrow('complete')
    expect(() => cusumControlChart([1, 2], 0, 0, 0.5, 3)).toThrow('Sigma')
  })
})

describe('ewmaControlChart', () => {
  it('calculates recursive EWMA values and time-varying limits', () => {
    const result = ewmaControlChart([0, 0, 4], 0, 1, 1, 3)
    expect(result.points.map((point) => point.value)).toEqual([0, 0, 4])
    expect(result.points[0].upperControlLimit).toBeCloseTo(3, 12)
    expect(result.points[2].signal).toBe(true)
    expect(result.signals.map((signal) => signal.observation)).toEqual([3])
  })

  it('validates smoothing weight and control width', () => {
    expect(() => ewmaControlChart([1, 2], 0, 1, 0, 3)).toThrow('lambda')
    expect(() => ewmaControlChart([1, 2], 0, 1, 0.2, 0)).toThrow('width')
  })
})

describe('zMrControlChart', () => {
  it('standardizes observations and calculates moving ranges without crossing gaps', () => {
    const result = zMrControlChart([10, 12, null, 8, 14], 10, 2)

    expect(result.count).toBe(4)
    expect(result.points.map((point) => [point.observation, point.value])).toEqual([
      [1, 0],
      [2, 1],
      [4, -1],
      [5, 2],
    ])
    expect(result.movingRanges).toMatchObject([
      { observation: 2, value: 1 },
      { observation: 5, value: 3 },
    ])
    expect(result.averageMovingRange).toBe(2)
    expect(result.movingRanges[0].upperControlLimit).toBeCloseTo(6.534, 12)
  })

  it('signals standardized observations beyond three sigma', () => {
    const result = zMrControlChart([10, 16.2, 10, 3.8], 10, 2)
    expect(
      result.signals.filter((signal) => signal.chart === 'Z').map((signal) => signal.observation),
    ).toEqual([2, 4])
    expect(
      result.points.every(
        (point) => point.lowerControlLimit === -3 && point.upperControlLimit === 3,
      ),
    ).toBe(true)
  })

  it('rejects invalid target, sigma, and insufficient adjacent data', () => {
    expect(() => zMrControlChart([1, 2], Number.NaN, 1)).toThrow('Target')
    expect(() => zMrControlChart([1, 2], 0, 0)).toThrow('Sigma')
    expect(() => zMrControlChart([1, null, 2], 0, 1)).toThrow('adjacent pair')
  })
})
