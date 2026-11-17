export interface OeeTaktInput {
  availableTime: number
  plannedDowntime: number
  unplannedDowntime: number
  idealCycleTime: number
  totalUnits: number
  goodUnits: number
  customerDemand: number
}

export interface OeeTaktResult {
  plannedProductionTime: number
  operatingTime: number
  availability: number
  performance: number
  quality: number
  oee: number
  taktTime: number
  theoreticalCapacity: number
  capacityGap: number
  warnings: string[]
}

export function calculateOeeTakt(input: OeeTaktInput): OeeTaktResult {
  const {
    availableTime,
    plannedDowntime,
    unplannedDowntime,
    idealCycleTime,
    totalUnits,
    goodUnits,
    customerDemand,
  } = input
  if (!Number.isFinite(availableTime) || availableTime <= 0) {
    throw new Error('Tillgänglig tid måste vara större än 0.')
  }
  if (
    !Number.isFinite(plannedDowntime) ||
    plannedDowntime < 0 ||
    plannedDowntime >= availableTime
  ) {
    throw new Error('Planerat stopp måste vara minst 0 och kortare än tillgänglig tid.')
  }
  const plannedProductionTime = availableTime - plannedDowntime
  if (
    !Number.isFinite(unplannedDowntime) ||
    unplannedDowntime < 0 ||
    unplannedDowntime >= plannedProductionTime
  ) {
    throw new Error('Oplanerat stopp måste vara minst 0 och kortare än planerad produktionstid.')
  }
  if (!Number.isFinite(idealCycleTime) || idealCycleTime <= 0) {
    throw new Error('Ideal cykeltid måste vara större än 0.')
  }
  if (!Number.isInteger(totalUnits) || totalUnits <= 0) {
    throw new Error('Producerat antal måste vara ett positivt heltal.')
  }
  if (!Number.isInteger(goodUnits) || goodUnits < 0 || goodUnits > totalUnits) {
    throw new Error('Godkänt antal måste vara ett heltal mellan 0 och producerat antal.')
  }
  if (!Number.isInteger(customerDemand) || customerDemand <= 0) {
    throw new Error('Kundbehov måste vara ett positivt heltal.')
  }

  const operatingTime = plannedProductionTime - unplannedDowntime
  const availability = operatingTime / plannedProductionTime
  const performance = (idealCycleTime * totalUnits) / operatingTime
  const quality = goodUnits / totalUnits
  const oee = availability * performance * quality
  const taktTime = plannedProductionTime / customerDemand
  const theoreticalCapacity = plannedProductionTime / idealCycleTime
  const capacityGap = theoreticalCapacity - customerDemand
  const warnings: string[] = []
  if (performance > 1) {
    warnings.push('Prestanda över 100 %: kontrollera ideal cykeltid, tidsenhet och antal.')
  }
  if (oee > 1) warnings.push('OEE över 100 %: kontrollera indata och tidsenheter.')
  if (taktTime < idealCycleTime) {
    warnings.push('Kundens takttid är snabbare än den teoretiska cykeltiden.')
  }

  return {
    plannedProductionTime,
    operatingTime,
    availability,
    performance,
    quality,
    oee,
    taktTime,
    theoreticalCapacity,
    capacityGap,
    warnings,
  }
}
