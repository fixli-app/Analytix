export type SubgroupChartKind = 'xbar-r' | 'xbar-s'
export type SubgroupChartName = 'xbar' | 'r' | 's'

export interface SubgroupControlPoint {
  subgroup: string
  index: number
  value: number
}

export interface SubgroupControlSignal {
  chart: SubgroupChartName
  subgroup: string
  index: number
  value: number
  rule: 'beyond-limit'
}

export interface SubgroupChartLimits {
  points: SubgroupControlPoint[]
  lowerControlLimit: number
  centerLine: number
  upperControlLimit: number
}

export interface SubgroupControlChartResult {
  kind: SubgroupChartKind
  subgroupCount: number
  subgroupSize: number
  subgroups: {
    label: string
    index: number
    mean: number
    range: number
    standardDeviation: number
  }[]
  xbar: SubgroupChartLimits
  variability: SubgroupChartLimits
  variabilityChart: 'r' | 's'
  signals: SubgroupControlSignal[]
}

interface Constants {
  a2: number
  d3: number
  d4: number
  a3: number
  b3: number
  b4: number
}

const constantsBySize: Record<number, Constants> = {
  2: { a2: 1.88, d3: 0, d4: 3.267, a3: 2.659, b3: 0, b4: 3.267 },
  3: { a2: 1.023, d3: 0, d4: 2.574, a3: 1.954, b3: 0, b4: 2.568 },
  4: { a2: 0.729, d3: 0, d4: 2.282, a3: 1.628, b3: 0, b4: 2.266 },
  5: { a2: 0.577, d3: 0, d4: 2.114, a3: 1.427, b3: 0, b4: 2.089 },
  6: { a2: 0.483, d3: 0, d4: 2.004, a3: 1.287, b3: 0.03, b4: 1.97 },
  7: { a2: 0.419, d3: 0.076, d4: 1.924, a3: 1.182, b3: 0.118, b4: 1.882 },
  8: { a2: 0.373, d3: 0.136, d4: 1.864, a3: 1.099, b3: 0.185, b4: 1.815 },
  9: { a2: 0.337, d3: 0.184, d4: 1.816, a3: 1.032, b3: 0.239, b4: 1.761 },
  10: { a2: 0.308, d3: 0.223, d4: 1.777, a3: 0.975, b3: 0.284, b4: 1.716 },
}

export function subgroupControlChart(
  groups: readonly (string | null | undefined)[],
  values: readonly (number | null | undefined)[],
  kind: SubgroupChartKind,
): SubgroupControlChartResult {
  if (groups.length !== values.length) {
    throw new Error('Gruppkolumnen och mätkolumnen måste ha samma antal rader.')
  }
  const subgroupMap = new Map<string, number[]>()
  for (let index = 0; index < groups.length; index += 1) {
    const group = groups[index]
    const value = values[index]
    if (!group || value === null || value === undefined) {
      throw new Error('Subgroupdiagram kräver kompletta gruppetiketter och mätvärden på varje rad.')
    }
    if (!Number.isFinite(value)) {
      throw new Error('Mätvärden måste vara ändliga tal.')
    }
    const observations = subgroupMap.get(group) ?? []
    observations.push(value)
    subgroupMap.set(group, observations)
  }

  const subgroupEntries = [...subgroupMap.entries()]
  if (subgroupEntries.length < 2) {
    throw new Error('Minst två subgrupper krävs för subgroupdiagram.')
  }
  const subgroupSize = subgroupEntries[0][1].length
  if (subgroupSize < 2 || !constantsBySize[subgroupSize]) {
    throw new Error('Subgroupstorlek måste vara mellan 2 och 10 för tillgängliga styrkonstanter.')
  }
  if (subgroupEntries.some(([, observations]) => observations.length !== subgroupSize)) {
    throw new Error('Xbar-R/S kräver lika många kompletta mätningar i varje subgrupp.')
  }

  const subgroups = subgroupEntries.map(([label, observations], index) => {
    const subgroupMean = mean(observations)
    const range = Math.max(...observations) - Math.min(...observations)
    const sumSquaredDeviations = observations.reduce(
      (total, value) => total + (value - subgroupMean) ** 2,
      0,
    )
    return {
      label,
      index: index + 1,
      mean: subgroupMean,
      range,
      standardDeviation: Math.sqrt(sumSquaredDeviations / (subgroupSize - 1)),
    }
  })
  const xbarCenter = mean(subgroups.map((subgroup) => subgroup.mean))
  const constants = constantsBySize[subgroupSize]
  const variabilityChart = kind === 'xbar-r' ? 'r' : 's'
  const variabilityCenter = mean(
    subgroups.map((subgroup) => (kind === 'xbar-r' ? subgroup.range : subgroup.standardDeviation)),
  )
  const xbarFactor = kind === 'xbar-r' ? constants.a2 : constants.a3
  const variabilityLowerFactor = kind === 'xbar-r' ? constants.d3 : constants.b3
  const variabilityUpperFactor = kind === 'xbar-r' ? constants.d4 : constants.b4
  const variabilityValues = subgroups.map((subgroup) =>
    kind === 'xbar-r' ? subgroup.range : subgroup.standardDeviation,
  )
  const xbar: SubgroupChartLimits = {
    points: subgroups.map((subgroup) => ({
      subgroup: subgroup.label,
      index: subgroup.index,
      value: subgroup.mean,
    })),
    lowerControlLimit: xbarCenter - xbarFactor * variabilityCenter,
    centerLine: xbarCenter,
    upperControlLimit: xbarCenter + xbarFactor * variabilityCenter,
  }
  const variability: SubgroupChartLimits = {
    points: subgroups.map((subgroup, index) => ({
      subgroup: subgroup.label,
      index: subgroup.index,
      value: variabilityValues[index],
    })),
    lowerControlLimit: variabilityLowerFactor * variabilityCenter,
    centerLine: variabilityCenter,
    upperControlLimit: variabilityUpperFactor * variabilityCenter,
  }
  const signals = [...findSignals('xbar', xbar), ...findSignals(variabilityChart, variability)]

  return {
    kind,
    subgroupCount: subgroups.length,
    subgroupSize,
    subgroups,
    xbar,
    variability,
    variabilityChart,
    signals,
  }
}

function mean(values: readonly number[]): number {
  let average = 0
  values.forEach((value, index) => {
    average += (value - average) / (index + 1)
  })
  return average
}

function findSignals(
  chart: SubgroupChartName,
  limits: SubgroupChartLimits,
): SubgroupControlSignal[] {
  return limits.points
    .filter(
      (point) => point.value < limits.lowerControlLimit || point.value > limits.upperControlLimit,
    )
    .map((point) => ({ ...point, chart, rule: 'beyond-limit' }))
}
