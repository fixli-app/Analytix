export interface FmeaRisk {
  severity: number
  occurrence: number
  detection: number
}

export function calculateRiskPriorityNumber(risk: FmeaRisk): number {
  for (const [label, value] of [
    ['severity', risk.severity],
    ['occurrence', risk.occurrence],
    ['detection', risk.detection],
  ] as const) {
    if (!Number.isInteger(value) || value < 1 || value > 10) {
      throw new Error(`${label} måste vara ett heltal mellan 1 och 10.`)
    }
  }
  return risk.severity * risk.occurrence * risk.detection
}
