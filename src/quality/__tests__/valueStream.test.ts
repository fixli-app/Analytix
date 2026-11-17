import { describe, expect, it } from 'vitest'
import { calculateValueStream } from '../valueStream'

const fixture = {
  availableProductionTime: 450,
  demandPerShift: 90,
  steps: [
    {
      id: '1',
      name: 'Cut',
      cycleTime: 3,
      changeoverTime: 15,
      uptimePercent: 95,
      inventoryBefore: 45,
    },
    {
      id: '2',
      name: 'Assemble',
      cycleTime: 6,
      changeoverTime: 20,
      uptimePercent: 90,
      inventoryBefore: 90,
    },
    {
      id: '3',
      name: 'Inspect',
      cycleTime: 2,
      changeoverTime: 0,
      uptimePercent: 99,
      inventoryBefore: 0,
    },
  ],
}

describe('calculateValueStream', () => {
  it('calculates takt, WIP waiting, lead time, value-added share, and bottleneck', () => {
    const result = calculateValueStream(fixture)
    expect(result.taktTime).toBe(5)
    expect(result.valueAddedTime).toBe(11)
    expect(result.waitingTime).toBe(675)
    expect(result.leadTime).toBe(686)
    expect(result.valueAddedPercent).toBeCloseTo((11 / 686) * 100, 12)
    expect(result.bottleneckStep).toBe('Assemble')
    expect(result.bottleneckCycleTime).toBe(6)
    expect(result.bottleneckTaktGap).toBe(1)
    expect(result.totalChangeoverTime).toBe(35)
  })

  it('rejects invalid demand, missing steps, and invalid process observations', () => {
    expect(() => calculateValueStream({ ...fixture, demandPerShift: 0 })).toThrow('Kundbehov')
    expect(() => calculateValueStream({ ...fixture, steps: [] })).toThrow('minst ett processteg')
    expect(() =>
      calculateValueStream({
        ...fixture,
        steps: [{ ...fixture.steps[0], uptimePercent: 101 }],
      }),
    ).toThrow('Uptime')
    expect(() =>
      calculateValueStream({
        ...fixture,
        steps: [{ ...fixture.steps[0], inventoryBefore: -1 }],
      }),
    ).toThrow('WIP')
  })
})
