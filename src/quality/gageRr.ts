import jStat from 'jstat'

export interface GageRrInput {
  parts: readonly (string | null | undefined)[]
  operators: readonly (string | null | undefined)[]
  measurements: readonly (number | null | undefined)[]
  tolerance?: number | null
}

export interface GageRrAnovaRow {
  source: 'part' | 'operator' | 'partOperator' | 'repeatability'
  sumSquares: number
  degreesOfFreedom: number
  meanSquare: number
  fStatistic: number | null
  pValue: number | null
}

export interface GageRrResult {
  partCount: number
  operatorCount: number
  replicatesPerCell: number
  measurementCount: number
  tolerance: number | null
  anova: GageRrAnovaRow[]
  varianceComponents: {
    repeatability: number
    operator: number
    partOperator: number
    reproducibility: number
    gageRr: number
    partToPart: number
    total: number
  }
  percentContribution: {
    repeatability: number
    reproducibility: number
    gageRr: number
    partToPart: number
  }
  studyVariation: {
    repeatability: number
    reproducibility: number
    gageRr: number
    partToPart: number
    total: number
  }
  percentStudyVariation: {
    repeatability: number
    reproducibility: number
    gageRr: number
    partToPart: number
  }
  percentTolerance: number | null
  numberOfDistinctCategories: number
}

interface Cell {
  part: string
  operator: string
  values: number[]
}

export function crossedGageRr(input: GageRrInput): GageRrResult {
  const { parts, operators, measurements, tolerance = null } = input
  if (parts.length !== operators.length || parts.length !== measurements.length) {
    throw new Error('Part, operatör och mätkolumn måste ha samma antal rader.')
  }
  if (tolerance !== null && (!Number.isFinite(tolerance) || tolerance <= 0)) {
    throw new Error('Tolerans måste vara ett ändligt tal större än 0.')
  }

  const partLabels = new Set<string>()
  const operatorLabels = new Set<string>()
  const cells = new Map<string, Cell>()
  for (let index = 0; index < measurements.length; index += 1) {
    const part = parts[index]
    const operator = operators[index]
    const measurement = measurements[index]
    if (!part || !operator || measurement === null || measurement === undefined) {
      throw new Error('Gage R&R kräver kompletta part-, operatörs- och mätvärden på varje rad.')
    }
    if (!Number.isFinite(measurement)) {
      throw new Error('Mätvärden måste vara ändliga tal.')
    }
    partLabels.add(part)
    operatorLabels.add(operator)
    const key = JSON.stringify([part, operator])
    const cell = cells.get(key) ?? { part, operator, values: [] }
    cell.values.push(measurement)
    cells.set(key, cell)
  }

  const orderedParts = [...partLabels].sort((left, right) => left.localeCompare(right))
  const orderedOperators = [...operatorLabels].sort((left, right) => left.localeCompare(right))
  if (orderedParts.length < 2 || orderedOperators.length < 2) {
    throw new Error('Crossed Gage R&R kräver minst två delar och två operatörer.')
  }

  const replicatesPerCell = cells.values().next().value?.values.length ?? 0
  if (replicatesPerCell < 2) {
    throw new Error('Minst två replikat per del-operatörskombination krävs.')
  }
  if (
    cells.size !== orderedParts.length * orderedOperators.length ||
    [...cells.values()].some((cell) => cell.values.length !== replicatesPerCell)
  ) {
    throw new Error(
      'Crossed Gage R&R kräver ett komplett, balanserat antal replikat per kombination.',
    )
  }

  const grandMean = mean(measurements as readonly number[])
  const partMeans = new Map(
    orderedParts.map((part) => [
      part,
      mean(orderedOperators.flatMap((operator) => getCell(cells, part, operator).values)),
    ]),
  )
  const operatorMeans = new Map(
    orderedOperators.map((operator) => [
      operator,
      mean(orderedParts.flatMap((part) => getCell(cells, part, operator).values)),
    ]),
  )

  let partSumSquares = 0
  orderedParts.forEach((part) => {
    partSumSquares +=
      orderedOperators.length * replicatesPerCell * (partMeans.get(part)! - grandMean) ** 2
  })
  let operatorSumSquares = 0
  orderedOperators.forEach((operator) => {
    operatorSumSquares +=
      orderedParts.length * replicatesPerCell * (operatorMeans.get(operator)! - grandMean) ** 2
  })
  let partOperatorSumSquares = 0
  let repeatabilitySumSquares = 0
  orderedParts.forEach((part) => {
    orderedOperators.forEach((operator) => {
      const cell = getCell(cells, part, operator)
      const cellMean = mean(cell.values)
      const interaction = cellMean - partMeans.get(part)! - operatorMeans.get(operator)! + grandMean
      partOperatorSumSquares += replicatesPerCell * interaction ** 2
      cell.values.forEach((value) => {
        repeatabilitySumSquares += (value - cellMean) ** 2
      })
    })
  })

  const sumSquaresScale = Math.max(
    partSumSquares,
    operatorSumSquares,
    partOperatorSumSquares,
    repeatabilitySumSquares,
  )
  if (partOperatorSumSquares <= Number.EPSILON * sumSquaresScale * 64) {
    partOperatorSumSquares = 0
  }

  const partDf = orderedParts.length - 1
  const operatorDf = orderedOperators.length - 1
  const interactionDf = partDf * operatorDf
  const repeatabilityDf = orderedParts.length * orderedOperators.length * (replicatesPerCell - 1)
  const partOperatorMeanSquare = partOperatorSumSquares / interactionDf
  const repeatabilityMeanSquare = repeatabilitySumSquares / repeatabilityDf
  const partMeanSquare = partSumSquares / partDf
  const operatorMeanSquare = operatorSumSquares / operatorDf
  const partOperatorComponent = Math.max(
    0,
    (partOperatorMeanSquare - repeatabilityMeanSquare) / replicatesPerCell,
  )
  const operatorComponent = Math.max(
    0,
    (operatorMeanSquare - partOperatorMeanSquare) / (orderedParts.length * replicatesPerCell),
  )
  const partComponent = Math.max(
    0,
    (partMeanSquare - partOperatorMeanSquare) / (orderedOperators.length * replicatesPerCell),
  )
  const repeatabilityComponent = repeatabilityMeanSquare
  const reproducibilityComponent = operatorComponent + partOperatorComponent
  const gageRrComponent = repeatabilityComponent + reproducibilityComponent
  const totalComponent = gageRrComponent + partComponent
  if (totalComponent <= 0) {
    throw new Error('Gage R&R kan inte beräknas när den totala mätvariationen är 0.')
  }

  const varianceComponents = {
    repeatability: repeatabilityComponent,
    operator: operatorComponent,
    partOperator: partOperatorComponent,
    reproducibility: reproducibilityComponent,
    gageRr: gageRrComponent,
    partToPart: partComponent,
    total: totalComponent,
  }
  const percentContribution = {
    repeatability: percentage(repeatabilityComponent, totalComponent),
    reproducibility: percentage(reproducibilityComponent, totalComponent),
    gageRr: percentage(gageRrComponent, totalComponent),
    partToPart: percentage(partComponent, totalComponent),
  }
  const studyVariation = {
    repeatability: studyVariationValue(repeatabilityComponent),
    reproducibility: studyVariationValue(reproducibilityComponent),
    gageRr: studyVariationValue(gageRrComponent),
    partToPart: studyVariationValue(partComponent),
    total: studyVariationValue(totalComponent),
  }
  const percentStudyVariation = {
    repeatability: percentage(studyVariation.repeatability, studyVariation.total),
    reproducibility: percentage(studyVariation.reproducibility, studyVariation.total),
    gageRr: percentage(studyVariation.gageRr, studyVariation.total),
    partToPart: percentage(studyVariation.partToPart, studyVariation.total),
  }
  const anova: GageRrAnovaRow[] = [
    {
      source: 'part',
      sumSquares: partSumSquares,
      degreesOfFreedom: partDf,
      meanSquare: partMeanSquare,
      fStatistic: safeRatio(partMeanSquare, partOperatorMeanSquare),
      pValue: fUpperTail(partMeanSquare, partOperatorMeanSquare, partDf, interactionDf),
    },
    {
      source: 'operator',
      sumSquares: operatorSumSquares,
      degreesOfFreedom: operatorDf,
      meanSquare: operatorMeanSquare,
      fStatistic: safeRatio(operatorMeanSquare, partOperatorMeanSquare),
      pValue: fUpperTail(operatorMeanSquare, partOperatorMeanSquare, operatorDf, interactionDf),
    },
    {
      source: 'partOperator',
      sumSquares: partOperatorSumSquares,
      degreesOfFreedom: interactionDf,
      meanSquare: partOperatorMeanSquare,
      fStatistic: safeRatio(partOperatorMeanSquare, repeatabilityMeanSquare),
      pValue: fUpperTail(
        partOperatorMeanSquare,
        repeatabilityMeanSquare,
        interactionDf,
        repeatabilityDf,
      ),
    },
    {
      source: 'repeatability',
      sumSquares: repeatabilitySumSquares,
      degreesOfFreedom: repeatabilityDf,
      meanSquare: repeatabilityMeanSquare,
      fStatistic: null,
      pValue: null,
    },
  ]

  return {
    partCount: orderedParts.length,
    operatorCount: orderedOperators.length,
    replicatesPerCell,
    measurementCount: measurements.length,
    tolerance,
    anova,
    varianceComponents,
    percentContribution,
    studyVariation,
    percentStudyVariation,
    percentTolerance: tolerance === null ? null : percentage(studyVariation.gageRr, tolerance),
    numberOfDistinctCategories:
      gageRrComponent <= 0
        ? Number.POSITIVE_INFINITY
        : Math.floor(1.41 * Math.sqrt(partComponent / gageRrComponent)),
  }
}

function getCell(cells: Map<string, Cell>, part: string, operator: string): Cell {
  return cells.get(JSON.stringify([part, operator]))!
}

function mean(values: readonly number[]): number {
  let average = 0
  values.forEach((value, index) => {
    average += (value - average) / (index + 1)
  })
  return average
}

function percentage(part: number, total: number): number {
  return (part / total) * 100
}

function studyVariationValue(varianceComponent: number): number {
  return 6 * Math.sqrt(varianceComponent)
}

function safeRatio(numerator: number, denominator: number): number {
  if (denominator === 0) return numerator === 0 ? 0 : Number.POSITIVE_INFINITY
  return numerator / denominator
}

function fUpperTail(
  numeratorMeanSquare: number,
  denominatorMeanSquare: number,
  numeratorDf: number,
  denominatorDf: number,
): number {
  const statistic = safeRatio(numeratorMeanSquare, denominatorMeanSquare)
  if (statistic === Number.POSITIVE_INFINITY) return 0
  return Math.max(0, 1 - jStat.centralF.cdf(statistic, numeratorDf, denominatorDf))
}
