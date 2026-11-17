export type ExpandedGageRrSource =
  | 'part'
  | 'operator'
  | 'condition'
  | 'partOperator'
  | 'partCondition'
  | 'operatorCondition'
  | 'partOperatorCondition'
  | 'repeatability'

export interface ExpandedGageRrInput {
  parts: readonly (string | null | undefined)[]
  operators: readonly (string | null | undefined)[]
  conditions: readonly (string | null | undefined)[]
  measurements: readonly (number | null | undefined)[]
  tolerance?: number | null
}

export interface ExpandedGageRrAnovaRow {
  source: ExpandedGageRrSource
  sumSquares: number
  degreesOfFreedom: number
  meanSquare: number
}

export interface ExpandedGageRrResult {
  partCount: number
  operatorCount: number
  conditionCount: number
  replicatesPerCell: number
  measurementCount: number
  tolerance: number | null
  anova: ExpandedGageRrAnovaRow[]
  varianceComponents: Record<ExpandedGageRrSource | 'total', number>
  percentContribution: Record<ExpandedGageRrSource | 'total', number>
  percentTolerance: number | null
}

interface Cell {
  part: string
  operator: string
  condition: string
  values: number[]
}

export function expandedGageRr(input: ExpandedGageRrInput): ExpandedGageRrResult {
  const { parts, operators, conditions, measurements, tolerance = null } = input
  if (
    parts.length !== operators.length ||
    parts.length !== conditions.length ||
    parts.length !== measurements.length
  ) {
    throw new Error('Part, operatör, extra faktor och mätkolumn måste ha samma antal rader.')
  }
  if (tolerance !== null && (!Number.isFinite(tolerance) || tolerance <= 0)) {
    throw new Error('Tolerans måste vara ett ändligt tal större än 0.')
  }

  const partLevels = new Set<string>()
  const operatorLevels = new Set<string>()
  const conditionLevels = new Set<string>()
  const cells = new Map<string, Cell>()
  for (let index = 0; index < measurements.length; index += 1) {
    const part = parts[index]?.trim()
    const operator = operators[index]?.trim()
    const condition = conditions[index]?.trim()
    const measurement = measurements[index]
    if (!part || !operator || !condition || measurement === null || measurement === undefined) {
      throw new Error('Expanded Gage R&R kräver kompletta faktor- och mätvärden på varje rad.')
    }
    if (!Number.isFinite(measurement)) throw new Error('Mätvärden måste vara ändliga tal.')
    partLevels.add(part)
    operatorLevels.add(operator)
    conditionLevels.add(condition)
    const key = JSON.stringify([part, operator, condition])
    const cell = cells.get(key) ?? { part, operator, condition, values: [] }
    cell.values.push(measurement)
    cells.set(key, cell)
  }

  const orderedParts = [...partLevels].sort((left, right) => left.localeCompare(right))
  const orderedOperators = [...operatorLevels].sort((left, right) => left.localeCompare(right))
  const orderedConditions = [...conditionLevels].sort((left, right) => left.localeCompare(right))
  if (orderedParts.length < 2 || orderedOperators.length < 2 || orderedConditions.length < 2) {
    throw new Error('Expanded Gage R&R kräver minst två nivåer för del, operatör och extra faktor.')
  }
  const replicatesPerCell = cells.values().next().value?.values.length ?? 0
  if (replicatesPerCell < 2) throw new Error('Minst två replikat per faktorcelle krävs.')
  if (
    cells.size !== orderedParts.length * orderedOperators.length * orderedConditions.length ||
    [...cells.values()].some((cell) => cell.values.length !== replicatesPerCell)
  ) {
    throw new Error('Expanded Gage R&R kräver ett komplett, balanserat faktoriellt upplägg.')
  }

  const partCount = orderedParts.length
  const operatorCount = orderedOperators.length
  const conditionCount = orderedConditions.length
  const replicateCount = replicatesPerCell
  const grandMean = mean(measurements as readonly number[])
  const getCell = (part: string, operator: string, condition: string) =>
    cells.get(JSON.stringify([part, operator, condition]))!
  const cellMean = (part: string, operator: string, condition: string) =>
    mean(getCell(part, operator, condition).values)
  const partMean = (part: string) =>
    mean(
      orderedOperators.flatMap((operator) =>
        orderedConditions.flatMap((condition) => getCell(part, operator, condition).values),
      ),
    )
  const operatorMean = (operator: string) =>
    mean(
      orderedParts.flatMap((part) =>
        orderedConditions.flatMap((condition) => getCell(part, operator, condition).values),
      ),
    )
  const conditionMean = (condition: string) =>
    mean(
      orderedParts.flatMap((part) =>
        orderedOperators.flatMap((operator) => getCell(part, operator, condition).values),
      ),
    )
  const partOperatorMean = (part: string, operator: string) =>
    mean(orderedConditions.flatMap((condition) => getCell(part, operator, condition).values))
  const partConditionMean = (part: string, condition: string) =>
    mean(orderedOperators.flatMap((operator) => getCell(part, operator, condition).values))
  const operatorConditionMean = (operator: string, condition: string) =>
    mean(orderedParts.flatMap((part) => getCell(part, operator, condition).values))

  const sumSquares = (values: readonly number[]) => values.reduce((sum, value) => sum + value, 0)
  const partSs =
    operatorCount *
    conditionCount *
    replicateCount *
    sumSquares(orderedParts.map((part) => (partMean(part) - grandMean) ** 2))
  const operatorSs =
    partCount *
    conditionCount *
    replicateCount *
    sumSquares(orderedOperators.map((operator) => (operatorMean(operator) - grandMean) ** 2))
  const conditionSs =
    partCount *
    operatorCount *
    replicateCount *
    sumSquares(orderedConditions.map((condition) => (conditionMean(condition) - grandMean) ** 2))
  const partOperatorSs =
    conditionCount *
    replicateCount *
    sumSquares(
      orderedParts.flatMap((part) =>
        orderedOperators.map(
          (operator) =>
            (partOperatorMean(part, operator) -
              partMean(part) -
              operatorMean(operator) +
              grandMean) **
            2,
        ),
      ),
    )
  const partConditionSs =
    operatorCount *
    replicateCount *
    sumSquares(
      orderedParts.flatMap((part) =>
        orderedConditions.map(
          (condition) =>
            (partConditionMean(part, condition) -
              partMean(part) -
              conditionMean(condition) +
              grandMean) **
            2,
        ),
      ),
    )
  const operatorConditionSs =
    partCount *
    replicateCount *
    sumSquares(
      orderedOperators.flatMap((operator) =>
        orderedConditions.map(
          (condition) =>
            (operatorConditionMean(operator, condition) -
              operatorMean(operator) -
              conditionMean(condition) +
              grandMean) **
            2,
        ),
      ),
    )
  const threeWaySs =
    replicateCount *
    sumSquares(
      orderedParts.flatMap((part) =>
        orderedOperators.flatMap((operator) =>
          orderedConditions.map(
            (condition) =>
              (cellMean(part, operator, condition) -
                partOperatorMean(part, operator) -
                partConditionMean(part, condition) -
                operatorConditionMean(operator, condition) +
                partMean(part) +
                operatorMean(operator) +
                conditionMean(condition) -
                grandMean) **
              2,
          ),
        ),
      ),
    )
  const repeatabilitySs = sumSquares(
    [...cells.values()].flatMap((cell) => {
      const average = mean(cell.values)
      return cell.values.map((value) => (value - average) ** 2)
    }),
  )

  const partDf = partCount - 1
  const operatorDf = operatorCount - 1
  const conditionDf = conditionCount - 1
  const partOperatorDf = partDf * operatorDf
  const partConditionDf = partDf * conditionDf
  const operatorConditionDf = operatorDf * conditionDf
  const threeWayDf = partDf * operatorDf * conditionDf
  const repeatabilityDf = partCount * operatorCount * conditionCount * (replicateCount - 1)
  const meanSquares = {
    part: partSs / partDf,
    operator: operatorSs / operatorDf,
    condition: conditionSs / conditionDf,
    partOperator: partOperatorSs / partOperatorDf,
    partCondition: partConditionSs / partConditionDf,
    operatorCondition: operatorConditionSs / operatorConditionDf,
    partOperatorCondition: threeWaySs / threeWayDf,
    repeatability: repeatabilitySs / repeatabilityDf,
  }
  const varianceComponents: Record<ExpandedGageRrSource | 'total', number> = {
    repeatability: meanSquares.repeatability,
    partOperatorCondition: Math.max(
      0,
      (meanSquares.partOperatorCondition - meanSquares.repeatability) / replicateCount,
    ),
    partOperator: 0,
    partCondition: 0,
    operatorCondition: 0,
    part: 0,
    operator: 0,
    condition: 0,
    total: 0,
  }
  varianceComponents.partOperator = Math.max(
    0,
    (meanSquares.partOperator - meanSquares.partOperatorCondition) /
      (conditionCount * replicateCount),
  )
  varianceComponents.partCondition = Math.max(
    0,
    (meanSquares.partCondition - meanSquares.partOperatorCondition) /
      (operatorCount * replicateCount),
  )
  varianceComponents.operatorCondition = Math.max(
    0,
    (meanSquares.operatorCondition - meanSquares.partOperatorCondition) /
      (partCount * replicateCount),
  )
  varianceComponents.part = Math.max(
    0,
    (meanSquares.part -
      meanSquares.partOperator -
      meanSquares.partCondition +
      meanSquares.partOperatorCondition) /
      (operatorCount * conditionCount * replicateCount),
  )
  varianceComponents.operator = Math.max(
    0,
    (meanSquares.operator -
      meanSquares.partOperator -
      meanSquares.operatorCondition +
      meanSquares.partOperatorCondition) /
      (partCount * conditionCount * replicateCount),
  )
  varianceComponents.condition = Math.max(
    0,
    (meanSquares.condition -
      meanSquares.partCondition -
      meanSquares.operatorCondition +
      meanSquares.partOperatorCondition) /
      (partCount * operatorCount * replicateCount),
  )
  varianceComponents.total = (Object.keys(varianceComponents) as (ExpandedGageRrSource | 'total')[])
    .filter((source) => source !== 'total')
    .reduce((sum, source) => sum + varianceComponents[source], 0)

  const anova: ExpandedGageRrAnovaRow[] = (
    [
      ['part', partSs, partDf],
      ['operator', operatorSs, operatorDf],
      ['condition', conditionSs, conditionDf],
      ['partOperator', partOperatorSs, partOperatorDf],
      ['partCondition', partConditionSs, partConditionDf],
      ['operatorCondition', operatorConditionSs, operatorConditionDf],
      ['partOperatorCondition', threeWaySs, threeWayDf],
      ['repeatability', repeatabilitySs, repeatabilityDf],
    ] as const
  ).map(([source, sourceSs, degreesOfFreedom]) => ({
    source,
    sumSquares: sourceSs,
    degreesOfFreedom,
    meanSquare: sourceSs / degreesOfFreedom,
  }))
  const percentContribution = Object.fromEntries(
    (Object.keys(varianceComponents) as (ExpandedGageRrSource | 'total')[]).map((source) => [
      source,
      source === 'total' ? 100 : (varianceComponents[source] / varianceComponents.total) * 100,
    ]),
  ) as Record<ExpandedGageRrSource | 'total', number>
  const expandedGageRrStudyVariation =
    6 *
    Math.sqrt(
      varianceComponents.repeatability +
        varianceComponents.operator +
        varianceComponents.condition +
        varianceComponents.partOperator +
        varianceComponents.partCondition +
        varianceComponents.operatorCondition +
        varianceComponents.partOperatorCondition,
    )

  return {
    partCount,
    operatorCount,
    conditionCount,
    replicatesPerCell,
    measurementCount: measurements.length,
    tolerance,
    anova,
    varianceComponents,
    percentContribution,
    percentTolerance: tolerance === null ? null : (expandedGageRrStudyVariation / tolerance) * 100,
  }
}

function mean(values: readonly number[]): number {
  let average = 0
  values.forEach((value, index) => {
    average += (value - average) / (index + 1)
  })
  return average
}
