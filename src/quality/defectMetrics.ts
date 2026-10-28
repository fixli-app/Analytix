import jStat from 'jstat'

export interface DefectMetricsInput {
  units: number
  defectiveUnits: number
  defects: number
  opportunitiesPerUnit: number
  sigmaShift: number
}

export interface DefectMetrics {
  units: number
  defectiveUnits: number
  defects: number
  totalOpportunities: number
  dpu: number
  ppm: number
  dpmo: number
  firstPassYield: number
  sigmaLevel: number | null
  sigmaShift: number
}

export function calculateDefectMetrics(input: DefectMetricsInput): DefectMetrics {
  const { units, defectiveUnits, defects, opportunitiesPerUnit, sigmaShift } = input
  if (!Number.isInteger(units) || units <= 0) {
    throw new Error('Antal enheter måste vara ett positivt heltal.')
  }
  if (!Number.isInteger(defectiveUnits) || defectiveUnits < 0 || defectiveUnits > units) {
    throw new Error('Antal defekta enheter måste vara ett heltal mellan 0 och antal enheter.')
  }
  if (!Number.isInteger(defects) || defects < defectiveUnits) {
    throw new Error(
      'Antal defekter måste vara ett heltal och minst lika stort som antal defekta enheter.',
    )
  }
  if (!Number.isInteger(opportunitiesPerUnit) || opportunitiesPerUnit <= 0) {
    throw new Error('Möjligheter per enhet måste vara ett positivt heltal.')
  }
  if (!Number.isFinite(sigmaShift) || sigmaShift < 0) {
    throw new Error('Sigma-skiftet måste vara ett ändligt, icke-negativt tal.')
  }

  const totalOpportunities = units * opportunitiesPerUnit
  const dpu = defects / units
  const ppm = (defectiveUnits / units) * 1_000_000
  const dpmo = (defects / totalOpportunities) * 1_000_000
  const firstPassYield = 1 - defects / totalOpportunities
  const sigmaLevel =
    dpmo === 0
      ? Number.POSITIVE_INFINITY
      : firstPassYield <= 0
        ? null
        : jStat.normal.inv(firstPassYield, 0, 1) + sigmaShift

  return {
    units,
    defectiveUnits,
    defects,
    totalOpportunities,
    dpu,
    ppm,
    dpmo,
    firstPassYield,
    sigmaLevel,
    sigmaShift,
  }
}
