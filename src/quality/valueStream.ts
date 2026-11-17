export interface ValueStreamStep {
  id: string
  name: string
  cycleTime: number
  changeoverTime: number
  uptimePercent: number
  inventoryBefore: number
}

export interface ValueStreamInput {
  availableProductionTime: number
  demandPerShift: number
  steps: readonly ValueStreamStep[]
}

export interface ValueStreamResult {
  taktTime: number
  valueAddedTime: number
  waitingTime: number
  leadTime: number
  valueAddedPercent: number
  bottleneckStep: string
  bottleneckCycleTime: number
  bottleneckTaktGap: number
  totalChangeoverTime: number
}

export function calculateValueStream(input: ValueStreamInput): ValueStreamResult {
  const { availableProductionTime, demandPerShift, steps } = input
  if (!Number.isFinite(availableProductionTime) || availableProductionTime <= 0) {
    throw new Error('Tillgänglig produktionstid per skift måste vara större än 0.')
  }
  if (!Number.isInteger(demandPerShift) || demandPerShift <= 0) {
    throw new Error('Kundbehov per skift måste vara ett positivt heltal.')
  }
  if (steps.length === 0) throw new Error('Värdeflödet måste innehålla minst ett processteg.')
  steps.forEach((step, index) => {
    if (!step.name.trim()) throw new Error(`Processteg ${index + 1} saknar namn.`)
    if (!Number.isFinite(step.cycleTime) || step.cycleTime <= 0) {
      throw new Error(`Cykeltid för processteg ${index + 1} måste vara större än 0.`)
    }
    if (!Number.isFinite(step.changeoverTime) || step.changeoverTime < 0) {
      throw new Error(`Ställtid för processteg ${index + 1} måste vara minst 0.`)
    }
    if (
      !Number.isFinite(step.uptimePercent) ||
      step.uptimePercent < 0 ||
      step.uptimePercent > 100
    ) {
      throw new Error(`Uptime för processteg ${index + 1} måste vara mellan 0 och 100%.`)
    }
    if (!Number.isInteger(step.inventoryBefore) || step.inventoryBefore < 0) {
      throw new Error(`WIP före processteg ${index + 1} måste vara ett icke-negativt heltal.`)
    }
  })

  const taktTime = availableProductionTime / demandPerShift
  const valueAddedTime = steps.reduce((sum, step) => sum + step.cycleTime, 0)
  const waitingTime =
    (steps.reduce((sum, step) => sum + step.inventoryBefore, 0) / demandPerShift) *
    availableProductionTime
  const leadTime = valueAddedTime + waitingTime
  const bottleneck = steps.reduce((slowest, step) =>
    step.cycleTime > slowest.cycleTime ? step : slowest,
  )

  return {
    taktTime,
    valueAddedTime,
    waitingTime,
    leadTime,
    valueAddedPercent: leadTime === 0 ? 0 : (valueAddedTime / leadTime) * 100,
    bottleneckStep: bottleneck.name,
    bottleneckCycleTime: bottleneck.cycleTime,
    bottleneckTaktGap: bottleneck.cycleTime - taktTime,
    totalChangeoverTime: steps.reduce((sum, step) => sum + step.changeoverTime, 0),
  }
}
