import { describe, expect, it } from 'vitest'
import { subgroupControlChart } from '../subgroupControlChart'

describe('subgroupControlChart', () => {
  it('calculates Xbar-R limits for a hand-worked n=2 fixture', () => {
    const result = subgroupControlChart(
      ['A', 'A', 'B', 'B', 'C', 'C'],
      [1, 3, 2, 4, 3, 5],
      'xbar-r',
    )

    expect(result.subgroupCount).toBe(3)
    expect(result.subgroupSize).toBe(2)
    expect(result.subgroups.map((group) => group.mean)).toEqual([2, 3, 4])
    expect(result.subgroups.map((group) => group.range)).toEqual([2, 2, 2])
    expect(result.xbar.centerLine).toBe(3)
    expect(result.xbar.lowerControlLimit).toBeCloseTo(-0.76, 12)
    expect(result.xbar.upperControlLimit).toBeCloseTo(6.76, 12)
    expect(result.variability.lowerControlLimit).toBe(0)
    expect(result.variability.centerLine).toBe(2)
    expect(result.variability.upperControlLimit).toBeCloseTo(6.534, 12)
    expect(result.variabilityChart).toBe('r')
    expect(result.signals).toEqual([])
  })

  it('calculates Xbar-S limits and flags a mean beyond its limit', () => {
    const result = subgroupControlChart(
      ['A', 'A', 'B', 'B', 'C', 'C'],
      [0, 0, 1, 1, 20, 20],
      'xbar-s',
    )

    expect(result.variabilityChart).toBe('s')
    expect(result.variability.centerLine).toBe(0)
    expect(result.variability.upperControlLimit).toBe(0)
    expect(result.signals).toContainEqual({
      chart: 'xbar',
      subgroup: 'C',
      index: 3,
      value: 20,
      rule: 'beyond-limit',
    })
  })

  it('uses subgroup-size-specific A3, B3, and B4 constants for Xbar-S', () => {
    const result = subgroupControlChart(
      ['A', 'A', 'A', 'A', 'B', 'B', 'B', 'B', 'C', 'C', 'C', 'C'],
      [1, 2, 3, 4, 2, 3, 4, 5, 3, 4, 5, 6],
      'xbar-s',
    )
    const subgroupStandardDeviation = Math.sqrt(5 / 3)

    expect(result.subgroupSize).toBe(4)
    expect(result.variability.centerLine).toBeCloseTo(subgroupStandardDeviation, 12)
    expect(result.xbar.lowerControlLimit).toBeCloseTo(3.5 - 1.628 * subgroupStandardDeviation, 12)
    expect(result.xbar.upperControlLimit).toBeCloseTo(3.5 + 1.628 * subgroupStandardDeviation, 12)
    expect(result.variability.lowerControlLimit).toBe(0)
    expect(result.variability.upperControlLimit).toBeCloseTo(2.266 * subgroupStandardDeviation, 12)
  })

  it('rejects mismatched, missing, unbalanced, and unsupported subgroup data', () => {
    expect(() => subgroupControlChart(['A'], [1, 2], 'xbar-r')).toThrow(
      'Gruppkolumnen och mätkolumnen måste ha samma antal rader.',
    )
    expect(() => subgroupControlChart(['A', 'A', 'B', 'B'], [1, null, 2, 3], 'xbar-r')).toThrow(
      'Subgroupdiagram kräver kompletta gruppetiketter och mätvärden på varje rad.',
    )
    expect(() =>
      subgroupControlChart(['A', 'A', 'A', 'B', 'B'], [1, 2, 3, 4, 5], 'xbar-r'),
    ).toThrow('Xbar-R/S kräver lika många kompletta mätningar i varje subgrupp.')
    expect(() => subgroupControlChart(['A', 'A', 'B', 'B'], [1, 2, 3, 4], 'xbar-s')).not.toThrow()
    expect(() =>
      subgroupControlChart(
        Array.from({ length: 22 }, (_, index) => (index < 11 ? 'A' : 'B')),
        Array.from({ length: 22 }, (_, index) => index),
        'xbar-r',
      ),
    ).toThrow('Subgroupstorlek måste vara mellan 2 och 10 för tillgängliga styrkonstanter.')
  })
})
