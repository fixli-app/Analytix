import jStat from 'jstat'

export interface Type1GageInput {
  measurements: readonly (number | null | undefined)[]
  referenceValue: number
  tolerance: number
  alpha?: number
}

export interface Type1GageResult {
  count: number
  alpha: number
  referenceValue: number
  tolerance: number
  mean: number
  standardDeviation: number
  bias: number
  biasTStatistic: number
  biasPValue: number
  biasConfidenceInterval: [number, number]
  percentTolerance: number
  cg: number
  cgk: number
}

export interface GageLinearityInput {
  referenceValues: readonly (number | null | undefined)[]
  measurements: readonly (number | null | undefined)[]
  alpha?: number
}

export interface GageLinearityResult {
  count: number
  alpha: number
  levelCount: number
  minimumReference: number
  maximumReference: number
  meanBias: number
  intercept: number
  slope: number
  slopeStandardError: number
  slopeTStatistic: number
  slopePValue: number
  slopeConfidenceInterval: [number, number]
  rSquared: number
  fittedBiasAtMinimum: number
  fittedBiasAtMaximum: number
  points: { reference: number; bias: number; fittedBias: number }[]
}

export interface NestedGageRrInput {
  parts: readonly (string | null | undefined)[]
  operators: readonly (string | null | undefined)[]
  measurements: readonly (number | null | undefined)[]
  tolerance?: number | null
}

export interface NestedGageRrResult {
  operatorCount: number
  partsPerOperator: number
  replicatesPerPart: number
  measurementCount: number
  tolerance: number | null
  anova: {
    source: 'operator' | 'partWithinOperator' | 'repeatability'
    sumSquares: number
    degreesOfFreedom: number
    meanSquare: number
    fStatistic: number | null
    pValue: number | null
  }[]
  varianceComponents: {
    repeatability: number
    operator: number
    partWithinOperator: number
    gageRr: number
    total: number
  }
  percentContribution: {
    repeatability: number
    operator: number
    gageRr: number
    partWithinOperator: number
  }
  percentStudyVariation: {
    repeatability: number
    operator: number
    gageRr: number
    partWithinOperator: number
  }
  percentTolerance: number | null
  numberOfDistinctCategories: number
}

export interface GageRunChartPoint {
  part: string
  replicate: number
  measurement: number
}

export interface GageRunChartOperatorSeries {
  operator: string
  points: GageRunChartPoint[]
}

export interface GageRunChartResult {
  partCount: number
  operatorCount: number
  replicatesPerCell: number
  measurementCount: number
  operators: GageRunChartOperatorSeries[]
}

export interface GageRunChartInput {
  parts: readonly (string | null | undefined)[]
  operators: readonly (string | null | undefined)[]
  measurements: readonly (number | null | undefined)[]
}

export function gageRunChart({
  parts,
  operators,
  measurements,
}: GageRunChartInput): GageRunChartResult {
  if (parts.length !== operators.length || parts.length !== measurements.length) {
    throw new Error('Part, operatör och mätkolumn måste ha samma antal rader.')
  }
  const cells = new Map<string, { part: string; operator: string; measurements: number[] }>()
  const partLabels = new Set<string>()
  const operatorLabels = new Set<string>()
  for (let index = 0; index < measurements.length; index += 1) {
    const part = parts[index]?.trim()
    const operator = operators[index]?.trim()
    const measurement = measurements[index]
    if (!part || !operator || measurement === null || measurement === undefined) {
      throw new Error('Gage Run Chart kräver kompletta del-, operatörs- och mätvärden.')
    }
    if (!Number.isFinite(measurement)) throw new Error('Mätvärden måste vara ändliga tal.')
    partLabels.add(part)
    operatorLabels.add(operator)
    const key = JSON.stringify([part, operator])
    const cell = cells.get(key) ?? { part, operator, measurements: [] }
    cell.measurements.push(measurement)
    cells.set(key, cell)
  }

  const orderedParts = [...partLabels].sort((left, right) => left.localeCompare(right))
  const orderedOperators = [...operatorLabels].sort((left, right) => left.localeCompare(right))
  if (orderedParts.length < 2 || orderedOperators.length < 2) {
    throw new Error('Gage Run Chart kräver minst två delar och två operatörer.')
  }
  const replicatesPerCell = cells.values().next().value?.measurements.length ?? 0
  if (replicatesPerCell < 2)
    throw new Error('Minst två replikat per del-operatörskombination krävs.')
  if (
    cells.size !== orderedParts.length * orderedOperators.length ||
    [...cells.values()].some((cell) => cell.measurements.length !== replicatesPerCell)
  ) {
    throw new Error(
      'Gage Run Chart kräver ett komplett, balanserat antal replikat per kombination.',
    )
  }

  const operatorSeries = orderedOperators.map((operator) => {
    const points: GageRunChartPoint[] = []
    orderedParts.forEach((part) => {
      const cell = cells.get(JSON.stringify([part, operator]))!
      cell.measurements.forEach((measurement, index) => {
        points.push({ part, replicate: index + 1, measurement })
      })
    })
    return { operator, points }
  })
  return {
    partCount: orderedParts.length,
    operatorCount: orderedOperators.length,
    replicatesPerCell,
    measurementCount: measurements.length,
    operators: operatorSeries,
  }
}

export function type1GageStudy({
  measurements,
  referenceValue,
  tolerance,
  alpha = 0.05,
}: Type1GageInput): Type1GageResult {
  validateAlpha(alpha)
  if (!Number.isFinite(referenceValue))
    throw new Error('Referensvärdet måste vara ett ändligt tal.')
  if (!Number.isFinite(tolerance) || tolerance <= 0) {
    throw new Error('Tolerans måste vara ett ändligt tal större än 0.')
  }

  const values = completeNumericValues(measurements)
  if (values.length < 2) throw new Error('Minst två kompletta mätningar krävs för Type 1-studien.')

  const mean = average(values)
  const standardDeviation = sampleStandardDeviation(values)
  if (standardDeviation <= 0) {
    throw new Error('Type 1-studien kan inte beräknas utan observerad mätvariation.')
  }

  const bias = mean - referenceValue
  const standardError = standardDeviation / Math.sqrt(values.length)
  const degreesOfFreedom = values.length - 1
  const biasTStatistic = bias / standardError
  const criticalValue = jStat.studentt.inv(1 - alpha / 2, degreesOfFreedom)

  return {
    count: values.length,
    alpha,
    referenceValue,
    tolerance,
    mean,
    standardDeviation,
    bias,
    biasTStatistic,
    biasPValue: twoSidedTProbability(biasTStatistic, degreesOfFreedom),
    biasConfidenceInterval: [
      bias - criticalValue * standardError,
      bias + criticalValue * standardError,
    ],
    percentTolerance: (6 * standardDeviation * 100) / tolerance,
    cg: (0.2 * tolerance) / (6 * standardDeviation),
    cgk: (0.1 * tolerance - Math.abs(bias)) / (3 * standardDeviation),
  }
}

export function nestedGageRr({
  parts,
  operators,
  measurements,
  tolerance = null,
}: NestedGageRrInput): NestedGageRrResult {
  if (parts.length !== operators.length || parts.length !== measurements.length) {
    throw new Error('Part, operatör och mätkolumn måste ha samma antal rader.')
  }
  if (tolerance !== null && (!Number.isFinite(tolerance) || tolerance <= 0)) {
    throw new Error('Tolerans måste vara ett ändligt tal större än 0.')
  }

  const cells = new Map<string, { operator: string; part: string; values: number[] }>()
  const operatorParts = new Map<string, Set<string>>()
  for (let index = 0; index < measurements.length; index += 1) {
    const part = parts[index]
    const operator = operators[index]
    const measurement = measurements[index]
    if (!part || !operator || measurement === null || measurement === undefined) {
      throw new Error('Nested Gage R&R kräver kompletta part-, operatörs- och mätvärden.')
    }
    if (!Number.isFinite(measurement)) throw new Error('Mätvärden måste vara ändliga tal.')
    const key = JSON.stringify([operator, part])
    const cell = cells.get(key) ?? { operator, part, values: [] }
    cell.values.push(measurement)
    cells.set(key, cell)
    const nestedParts = operatorParts.get(operator) ?? new Set<string>()
    nestedParts.add(part)
    operatorParts.set(operator, nestedParts)
  }

  const operatorsList = [...operatorParts.keys()].sort((left, right) => left.localeCompare(right))
  if (operatorsList.length < 2) throw new Error('Nested Gage R&R kräver minst två operatörer.')
  const partsPerOperator = operatorParts.get(operatorsList[0])?.size ?? 0
  if (partsPerOperator < 2) throw new Error('Minst två delar per operatör krävs.')
  if (operatorsList.some((operator) => operatorParts.get(operator)?.size !== partsPerOperator)) {
    throw new Error('Nested Gage R&R kräver samma antal delar per operatör.')
  }

  const cellsList = [...cells.values()]
  const replicatesPerPart = cellsList[0]?.values.length ?? 0
  if (replicatesPerPart < 2) throw new Error('Minst två replikat per del krävs.')
  if (
    cellsList.length !== operatorsList.length * partsPerOperator ||
    cellsList.some((cell) => cell.values.length !== replicatesPerPart)
  ) {
    throw new Error('Nested Gage R&R kräver ett komplett, balanserat antal replikat per del.')
  }

  const allMeasurements = cellsList.flatMap((cell) => cell.values)
  const grandMean = average(allMeasurements)
  const operatorMeans = new Map(
    operatorsList.map((operator) => {
      const observations = cellsList
        .filter((cell) => cell.operator === operator)
        .flatMap((cell) => cell.values)
      return [operator, average(observations)]
    }),
  )

  let operatorSumSquares = 0
  for (const operator of operatorsList) {
    operatorSumSquares +=
      partsPerOperator * replicatesPerPart * (operatorMeans.get(operator)! - grandMean) ** 2
  }
  let partWithinOperatorSumSquares = 0
  let repeatabilitySumSquares = 0
  for (const cell of cellsList) {
    const cellMean = average(cell.values)
    partWithinOperatorSumSquares +=
      replicatesPerPart * (cellMean - operatorMeans.get(cell.operator)!) ** 2
    for (const measurement of cell.values) repeatabilitySumSquares += (measurement - cellMean) ** 2
  }

  const operatorDf = operatorsList.length - 1
  const partWithinOperatorDf = operatorsList.length * (partsPerOperator - 1)
  const repeatabilityDf = operatorsList.length * partsPerOperator * (replicatesPerPart - 1)
  const operatorMeanSquare = operatorSumSquares / operatorDf
  const partWithinOperatorMeanSquare = partWithinOperatorSumSquares / partWithinOperatorDf
  const repeatabilityMeanSquare = repeatabilitySumSquares / repeatabilityDf
  const repeatabilityComponent = repeatabilityMeanSquare
  const partWithinOperatorComponent = Math.max(
    0,
    (partWithinOperatorMeanSquare - repeatabilityMeanSquare) / replicatesPerPart,
  )
  const operatorComponent = Math.max(
    0,
    (operatorMeanSquare - partWithinOperatorMeanSquare) / (partsPerOperator * replicatesPerPart),
  )
  const gageRrComponent = repeatabilityComponent + operatorComponent
  const totalComponent = gageRrComponent + partWithinOperatorComponent
  if (totalComponent <= 0) throw new Error('Gage R&R kan inte beräknas utan total mätvariation.')

  const studyVariation = (variance: number) => 6 * Math.sqrt(variance)
  const totalStudyVariation = studyVariation(totalComponent)
  const gageRrStudyVariation = studyVariation(gageRrComponent)
  const percent = (component: number) => (component / totalComponent) * 100
  const percentStudy = (component: number) =>
    totalStudyVariation === 0 ? 0 : (studyVariation(component) / totalStudyVariation) * 100
  const anova = [
    {
      source: 'operator' as const,
      sumSquares: operatorSumSquares,
      degreesOfFreedom: operatorDf,
      meanSquare: operatorMeanSquare,
      fStatistic: safeF(operatorMeanSquare, partWithinOperatorMeanSquare),
      pValue: fProbability(
        operatorMeanSquare,
        partWithinOperatorMeanSquare,
        operatorDf,
        partWithinOperatorDf,
      ),
    },
    {
      source: 'partWithinOperator' as const,
      sumSquares: partWithinOperatorSumSquares,
      degreesOfFreedom: partWithinOperatorDf,
      meanSquare: partWithinOperatorMeanSquare,
      fStatistic: safeF(partWithinOperatorMeanSquare, repeatabilityMeanSquare),
      pValue: fProbability(
        partWithinOperatorMeanSquare,
        repeatabilityMeanSquare,
        partWithinOperatorDf,
        repeatabilityDf,
      ),
    },
    {
      source: 'repeatability' as const,
      sumSquares: repeatabilitySumSquares,
      degreesOfFreedom: repeatabilityDf,
      meanSquare: repeatabilityMeanSquare,
      fStatistic: null,
      pValue: null,
    },
  ]

  return {
    operatorCount: operatorsList.length,
    partsPerOperator,
    replicatesPerPart,
    measurementCount: allMeasurements.length,
    tolerance,
    anova,
    varianceComponents: {
      repeatability: repeatabilityComponent,
      operator: operatorComponent,
      partWithinOperator: partWithinOperatorComponent,
      gageRr: gageRrComponent,
      total: totalComponent,
    },
    percentContribution: {
      repeatability: percent(repeatabilityComponent),
      operator: percent(operatorComponent),
      gageRr: percent(gageRrComponent),
      partWithinOperator: percent(partWithinOperatorComponent),
    },
    percentStudyVariation: {
      repeatability: percentStudy(repeatabilityComponent),
      operator: percentStudy(operatorComponent),
      gageRr: percentStudy(gageRrComponent),
      partWithinOperator: percentStudy(partWithinOperatorComponent),
    },
    percentTolerance: tolerance === null ? null : (gageRrStudyVariation / tolerance) * 100,
    numberOfDistinctCategories:
      gageRrComponent <= 0
        ? Number.POSITIVE_INFINITY
        : Math.floor(1.41 * Math.sqrt(partWithinOperatorComponent / gageRrComponent)),
  }
}

export function gageLinearityAndBias({
  referenceValues,
  measurements,
  alpha = 0.05,
}: GageLinearityInput): GageLinearityResult {
  validateAlpha(alpha)
  if (referenceValues.length !== measurements.length) {
    throw new Error('Referens- och mätkolumn måste ha samma antal rader.')
  }

  const pairs: { reference: number; bias: number }[] = []
  for (let index = 0; index < referenceValues.length; index += 1) {
    const reference = referenceValues[index]
    const measurement = measurements[index]
    if (
      reference === null ||
      reference === undefined ||
      measurement === null ||
      measurement === undefined
    ) {
      continue
    }
    if (!Number.isFinite(reference) || !Number.isFinite(measurement)) {
      throw new Error(`Referens- och mätvärden måste vara ändliga tal (rad ${index + 1}).`)
    }
    pairs.push({ reference, bias: measurement - reference })
  }

  const references = pairs.map((pair) => pair.reference)
  const referenceLevels = new Set(references)
  if (pairs.length < 3 || referenceLevels.size < 3) {
    throw new Error('Bias/Linearity kräver minst tre kompletta mätningar på tre referensnivåer.')
  }

  const meanReference = average(references)
  const meanBias = average(pairs.map((pair) => pair.bias))
  const sumReferenceSquares = pairs.reduce(
    (sum, pair) => sum + (pair.reference - meanReference) ** 2,
    0,
  )
  const sumBiasCrossProducts = pairs.reduce(
    (sum, pair) => sum + (pair.reference - meanReference) * (pair.bias - meanBias),
    0,
  )
  if (sumReferenceSquares <= 0) throw new Error('Referensnivåerna måste ha observerad variation.')

  const slope = sumBiasCrossProducts / sumReferenceSquares
  const intercept = meanBias - slope * meanReference
  const residualSumSquares = pairs.reduce(
    (sum, pair) => sum + (pair.bias - intercept - slope * pair.reference) ** 2,
    0,
  )
  const totalBiasSumSquares = pairs.reduce((sum, pair) => sum + (pair.bias - meanBias) ** 2, 0)
  const degreesOfFreedom = pairs.length - 2
  const residualMeanSquare = residualSumSquares / degreesOfFreedom
  const slopeStandardError = Math.sqrt(residualMeanSquare / sumReferenceSquares)
  const slopeTStatistic = slopeStandardError === 0 ? 0 : slope / slopeStandardError
  const criticalValue = jStat.studentt.inv(1 - alpha / 2, degreesOfFreedom)
  const slopeConfidenceInterval: [number, number] =
    slopeStandardError === 0
      ? [slope, slope]
      : [slope - criticalValue * slopeStandardError, slope + criticalValue * slopeStandardError]
  const minimumReference = references.reduce((minimum, value) => Math.min(minimum, value), Infinity)
  const maximumReference = references.reduce(
    (maximum, value) => Math.max(maximum, value),
    -Infinity,
  )

  return {
    count: pairs.length,
    alpha,
    levelCount: referenceLevels.size,
    minimumReference,
    maximumReference,
    meanBias,
    intercept,
    slope,
    slopeStandardError,
    slopeTStatistic,
    slopePValue:
      slopeStandardError === 0
        ? slope === 0
          ? 1
          : 0
        : twoSidedTProbability(slopeTStatistic, degreesOfFreedom),
    slopeConfidenceInterval,
    rSquared:
      totalBiasSumSquares === 0
        ? 1
        : Math.max(0, Math.min(1, 1 - residualSumSquares / totalBiasSumSquares)),
    fittedBiasAtMinimum: intercept + slope * minimumReference,
    fittedBiasAtMaximum: intercept + slope * maximumReference,
    points: pairs.map((pair) => ({
      reference: pair.reference,
      bias: pair.bias,
      fittedBias: intercept + slope * pair.reference,
    })),
  }
}

function completeNumericValues(values: readonly (number | null | undefined)[]): number[] {
  const complete = values.filter((value): value is number => value !== null && value !== undefined)
  if (complete.some((value) => !Number.isFinite(value))) {
    throw new Error('Mätvärden måste vara ändliga tal.')
  }
  return complete
}

function average(values: readonly number[]): number {
  let mean = 0
  values.forEach((value, index) => {
    mean += (value - mean) / (index + 1)
  })
  return mean
}

function sampleStandardDeviation(values: readonly number[]): number {
  let mean = 0
  let sumSquares = 0
  values.forEach((value, index) => {
    const delta = value - mean
    mean += delta / (index + 1)
    sumSquares += delta * (value - mean)
    if (!Number.isFinite(sumSquares)) throw new Error('Mätvariationen är för stor att beräkna.')
  })
  return Math.sqrt(sumSquares / (values.length - 1))
}

function validateAlpha(alpha: number) {
  if (!Number.isFinite(alpha) || alpha <= 0 || alpha >= 1) {
    throw new Error('Signifikansnivån α måste ligga mellan 0 och 1.')
  }
}

function twoSidedTProbability(statistic: number, degreesOfFreedom: number): number {
  return Math.max(
    0,
    Math.min(1, 2 * (1 - jStat.studentt.cdf(Math.abs(statistic), degreesOfFreedom))),
  )
}

function safeF(numerator: number, denominator: number): number {
  if (denominator === 0) return numerator === 0 ? 0 : Number.POSITIVE_INFINITY
  return numerator / denominator
}

function fProbability(
  numerator: number,
  denominator: number,
  numeratorDegreesOfFreedom: number,
  denominatorDegreesOfFreedom: number,
): number {
  const statistic = safeF(numerator, denominator)
  if (statistic === Number.POSITIVE_INFINITY) return 0
  return Math.max(
    0,
    1 - jStat.centralF.cdf(statistic, numeratorDegreesOfFreedom, denominatorDegreesOfFreedom),
  )
}
