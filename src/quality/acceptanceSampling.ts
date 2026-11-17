export interface AttributeSamplingCriteria {
  aql: number
  rql: number
  producerRisk: number
  consumerRisk: number
  maxSampleSize?: number
  lotSize?: number
}

export interface OperatingCharacteristicPoint {
  defectiveFraction: number
  probabilityOfAcceptance: number
}

export interface AttributeSamplingPlan {
  sampleSize: number
  acceptanceNumber: number
  probabilityAtAql: number
  probabilityAtRql: number
  producerRisk: number
  consumerRisk: number
  ocCurve: OperatingCharacteristicPoint[]
  lotSize?: number
  defectivesAtAql?: number
  defectivesAtRql?: number
}

const MAX_SAMPLE_SIZE = 2000
const MAX_LOT_SIZE = 100000

export function binomialAcceptanceProbability(
  sampleSize: number,
  acceptanceNumber: number,
  defectiveFraction: number,
): number {
  validatePlan(sampleSize, acceptanceNumber)
  validateFraction(defectiveFraction, 'Defektnivån')
  return binomialAcceptanceSequence(sampleSize, defectiveFraction)[acceptanceNumber]
}

export function finiteLotAcceptanceProbability(
  sampleSize: number,
  acceptanceNumber: number,
  defectiveUnits: number,
  lotSize: number,
): number {
  validatePlan(sampleSize, acceptanceNumber)
  validateLotSize(lotSize)
  if (sampleSize > lotSize)
    throw new Error('Stickprovsstorleken får inte överstiga partistorleken.')
  if (!Number.isInteger(defectiveUnits) || defectiveUnits < 0 || defectiveUnits > lotSize) {
    throw new Error('Antal defekta i partiet måste vara ett heltal mellan 0 och partistorleken.')
  }
  const logFactorials = createLogFactorials(lotSize)
  return hypergeometricAcceptanceSequence(sampleSize, defectiveUnits, lotSize, logFactorials)[
    acceptanceNumber
  ]
}

export function findAttributeSamplingPlan(
  criteria: AttributeSamplingCriteria,
): AttributeSamplingPlan {
  const { aql, rql, producerRisk, consumerRisk } = criteria
  validateFraction(aql, 'AQL')
  validateFraction(rql, 'RQL')
  validateRisk(producerRisk, 'Producentrisken')
  validateRisk(consumerRisk, 'Konsumentrisken')
  if (aql >= rql) throw new Error('AQL måste vara lägre än RQL.')
  const requestedMaxSampleSize = criteria.maxSampleSize ?? MAX_SAMPLE_SIZE
  if (
    !Number.isInteger(requestedMaxSampleSize) ||
    requestedMaxSampleSize < 1 ||
    requestedMaxSampleSize > MAX_SAMPLE_SIZE
  ) {
    throw new Error(
      `Maximal stickprovsstorlek måste vara ett heltal mellan 1 och ${MAX_SAMPLE_SIZE}.`,
    )
  }
  if (criteria.lotSize !== undefined) validateLotSize(criteria.lotSize)
  const lotSize = criteria.lotSize
  const maxSampleSize = lotSize ? Math.min(requestedMaxSampleSize, lotSize) : requestedMaxSampleSize
  const roundingTolerance = lotSize === undefined ? 0 : Number.EPSILON * lotSize * 4
  const defectivesAtAql =
    lotSize === undefined ? undefined : Math.floor(lotSize * aql + roundingTolerance)
  const defectivesAtRql =
    lotSize === undefined ? undefined : Math.ceil(lotSize * rql - roundingTolerance)
  const logFactorials = lotSize === undefined ? undefined : createLogFactorials(lotSize)

  const minimumAcceptanceAtAql = 1 - producerRisk
  for (let sampleSize = 1; sampleSize <= maxSampleSize; sampleSize += 1) {
    const aqlProbabilities =
      lotSize === undefined
        ? binomialAcceptanceSequence(sampleSize, aql)
        : hypergeometricAcceptanceSequence(sampleSize, defectivesAtAql!, lotSize, logFactorials!)
    const rqlProbabilities =
      lotSize === undefined
        ? binomialAcceptanceSequence(sampleSize, rql)
        : hypergeometricAcceptanceSequence(sampleSize, defectivesAtRql!, lotSize, logFactorials!)
    for (let acceptanceNumber = 0; acceptanceNumber <= sampleSize; acceptanceNumber += 1) {
      const probabilityAtAql = aqlProbabilities[acceptanceNumber]
      const probabilityAtRql = rqlProbabilities[acceptanceNumber]
      if (probabilityAtAql < minimumAcceptanceAtAql || probabilityAtRql > consumerRisk) {
        continue
      }

      const upperDefectiveFraction = Math.min(1, Math.max(0.2, rql * 1.5))
      const curveRates = Array.from(
        { length: 41 },
        (_, index) => (upperDefectiveFraction * index) / 40,
      )
      let ocCurve: OperatingCharacteristicPoint[]
      if (lotSize === undefined) {
        const rates = new Set(curveRates)
        rates.add(aql)
        rates.add(rql)
        ocCurve = [...rates]
          .sort((left, right) => left - right)
          .map((defectiveFraction) => ({
            defectiveFraction,
            probabilityOfAcceptance: binomialAcceptanceSequence(sampleSize, defectiveFraction)[
              acceptanceNumber
            ],
          }))
      } else {
        const defectCounts = new Set(
          curveRates.map((rate) => Math.round(lotSize * Math.min(rate, 1))),
        )
        defectCounts.add(defectivesAtAql!)
        defectCounts.add(defectivesAtRql!)
        ocCurve = [...defectCounts]
          .sort((left, right) => left - right)
          .map((defectives) => ({
            defectiveFraction: defectives / lotSize,
            probabilityOfAcceptance: hypergeometricAcceptanceSequence(
              sampleSize,
              defectives,
              lotSize,
              logFactorials!,
            )[acceptanceNumber],
          }))
      }

      return {
        sampleSize,
        acceptanceNumber,
        probabilityAtAql,
        probabilityAtRql,
        producerRisk: 1 - probabilityAtAql,
        consumerRisk: probabilityAtRql,
        ocCurve,
        ...(lotSize === undefined ? {} : { lotSize, defectivesAtAql, defectivesAtRql }),
      }
    }
  }
  throw new Error('Ingen plan uppfyller båda riskkraven inom maximal stickprovsstorlek.')
}

function binomialAcceptanceSequence(sampleSize: number, defectiveFraction: number): number[] {
  if (defectiveFraction === 0) return Array.from({ length: sampleSize + 1 }, () => 1)
  if (defectiveFraction === 1) {
    return Array.from({ length: sampleSize + 1 }, (_, index) => (index === sampleSize ? 1 : 0))
  }

  const logDefective = Math.log(defectiveFraction)
  const logNonDefective = Math.log1p(-defectiveFraction)
  let logProbability = sampleSize * logNonDefective
  let logCumulative = Number.NEGATIVE_INFINITY
  const probabilities: number[] = []

  for (let defective = 0; defective <= sampleSize; defective += 1) {
    logCumulative = logAddExp(logCumulative, logProbability)
    probabilities.push(Math.min(1, Math.exp(logCumulative)))
    if (defective < sampleSize) {
      logProbability +=
        Math.log(sampleSize - defective) - Math.log(defective + 1) + logDefective - logNonDefective
    }
  }
  probabilities[sampleSize] = 1
  return probabilities
}

function logAddExp(left: number, right: number): number {
  if (left === Number.NEGATIVE_INFINITY) return right
  const maximum = Math.max(left, right)
  return maximum + Math.log1p(Math.exp(Math.min(left, right) - maximum))
}

function hypergeometricAcceptanceSequence(
  sampleSize: number,
  defectiveUnits: number,
  lotSize: number,
  logFactorials: Float64Array,
): number[] {
  const probabilities = Array.from({ length: sampleSize + 1 }, () => 0)
  const minimumDefectives = Math.max(0, sampleSize - (lotSize - defectiveUnits))
  const maximumDefectives = Math.min(sampleSize, defectiveUnits)
  const logDenominator = logChoose(lotSize, sampleSize, logFactorials)
  let logProbability =
    logChoose(defectiveUnits, minimumDefectives, logFactorials) +
    logChoose(lotSize - defectiveUnits, sampleSize - minimumDefectives, logFactorials) -
    logDenominator
  let logCumulative = Number.NEGATIVE_INFINITY

  for (let defective = minimumDefectives; defective <= maximumDefectives; defective += 1) {
    logCumulative = logAddExp(logCumulative, logProbability)
    probabilities[defective] = Math.min(1, Math.exp(logCumulative))
    if (defective < maximumDefectives) {
      logProbability +=
        Math.log(defectiveUnits - defective) -
        Math.log(defective + 1) +
        Math.log(sampleSize - defective) -
        Math.log(lotSize - defectiveUnits - sampleSize + defective + 1)
    }
  }
  for (let defective = maximumDefectives + 1; defective <= sampleSize; defective += 1) {
    probabilities[defective] = 1
  }
  probabilities[maximumDefectives] = 1
  probabilities[sampleSize] = 1
  return probabilities
}

function createLogFactorials(maximum: number): Float64Array {
  const values = new Float64Array(maximum + 1)
  for (let value = 1; value <= maximum; value += 1) {
    values[value] = values[value - 1] + Math.log(value)
  }
  return values
}

function logChoose(total: number, selected: number, logFactorials: Float64Array): number {
  if (selected < 0 || selected > total) return Number.NEGATIVE_INFINITY
  return logFactorials[total] - logFactorials[selected] - logFactorials[total - selected]
}

function validatePlan(sampleSize: number, acceptanceNumber: number) {
  if (!Number.isInteger(sampleSize) || sampleSize < 1 || sampleSize > MAX_SAMPLE_SIZE) {
    throw new Error(`Stickprovsstorlek måste vara ett heltal mellan 1 och ${MAX_SAMPLE_SIZE}.`)
  }
  if (
    !Number.isInteger(acceptanceNumber) ||
    acceptanceNumber < 0 ||
    acceptanceNumber > sampleSize
  ) {
    throw new Error('Acceptanstalet måste vara ett heltal mellan 0 och stickprovsstorleken.')
  }
}

function validateFraction(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${label} måste vara mellan 0 och 1.`)
  }
}

function validateRisk(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0 || value >= 1) {
    throw new Error(`${label} måste vara större än 0 och mindre än 1.`)
  }
}

function validateLotSize(lotSize: number) {
  if (!Number.isInteger(lotSize) || lotSize < 2 || lotSize > MAX_LOT_SIZE) {
    throw new Error(`Partistorlek måste vara ett heltal mellan 2 och ${MAX_LOT_SIZE}.`)
  }
}
