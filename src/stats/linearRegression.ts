import jStat from 'jstat'
import { LuDecomposition, Matrix, QrDecomposition } from 'ml-matrix'

export interface LinearRegressionPredictor {
  name: string
  values: readonly (number | null | undefined)[]
}

export interface LinearRegressionCoefficient {
  term: string
  estimate: number
  standardError: number
  tStatistic: number
  pValue: number
  confidenceInterval: [number, number]
  vif: number | null
}

export interface LinearRegressionAnovaRow {
  source: 'regression' | 'error' | 'total'
  sumSquares: number
  degreesOfFreedom: number
  meanSquare: number | null
  fStatistic: number | null
  pValue: number | null
}

export interface LinearRegressionObservation {
  sourceRow: number
  observed: number
  fitted: number
  residual: number
  leverage: number
  standardizedResidual: number
  cooksDistance: number
  fittedConfidenceInterval: [number, number]
  predictionInterval: [number, number]
}

export interface LinearRegressionResult {
  responseName: string
  predictorNames: string[]
  count: number
  droppedCount: number
  degreesOfFreedom: number
  regressionSumSquares: number
  errorSumSquares: number
  totalSumSquares: number
  regressionMeanSquare: number
  errorMeanSquare: number
  fStatistic: number
  modelPValue: number
  rSquared: number
  adjustedRSquared: number
  durbinWatson: number
  alpha: number
  coefficients: LinearRegressionCoefficient[]
  anova: LinearRegressionAnovaRow[]
  observations: LinearRegressionObservation[]
}

interface CompleteObservation {
  sourceRow: number
  response: number
  predictors: number[]
}

function sumSquares(values: readonly number[], center: number): number {
  return values.reduce((sum, value) => sum + (value - center) ** 2, 0)
}

function squareUpperTriangle(matrix: Matrix, size: number): Matrix {
  const result = new Matrix(size, size)
  for (let rowIndex = 0; rowIndex < size; rowIndex++) {
    for (let columnIndex = rowIndex; columnIndex < size; columnIndex++) {
      result.set(rowIndex, columnIndex, matrix.get(rowIndex, columnIndex))
    }
  }
  return result
}

function inverseProductDiagonal(matrix: Matrix): number[] {
  const decomposition = new LuDecomposition(matrix)
  if (decomposition.isSingular()) throw new Error('Regression design matrix is singular.')
  const inverse = decomposition.solve(Matrix.eye(matrix.rows))
  const covariance = inverse.mmul(inverse.transpose())
  return Array.from({ length: matrix.rows }, (_, index) => covariance.get(index, index))
}

export function linearRegression(
  response: readonly (number | null | undefined)[],
  predictors: readonly LinearRegressionPredictor[],
  options: { responseName?: string; alpha?: number } = {},
): LinearRegressionResult {
  const alpha = options.alpha ?? 0.05
  if (!Number.isFinite(alpha) || alpha <= 0 || alpha >= 1) {
    throw new Error('Alpha must be greater than 0 and less than 1.')
  }
  if (predictors.length < 1 || predictors.length > 12) {
    throw new Error('Linear regression requires 1 to 12 numeric predictors.')
  }
  if (predictors.some((predictor) => !predictor.name.trim())) {
    throw new Error('Predictor names must be nonempty.')
  }
  if (
    new Set(predictors.map((predictor) => predictor.name.trim().toLocaleLowerCase())).size !==
    predictors.length
  ) {
    throw new Error('Predictor names must be unique.')
  }
  if (predictors.some((predictor) => predictor.values.length !== response.length)) {
    throw new Error('Response and predictor columns must have the same number of rows.')
  }

  const complete: CompleteObservation[] = []
  for (let rowIndex = 0; rowIndex < response.length; rowIndex++) {
    const responseValue = response[rowIndex]
    const predictorValues = predictors.map((predictor) => predictor.values[rowIndex])
    if (
      responseValue === null ||
      responseValue === undefined ||
      predictorValues.some((value) => value === null || value === undefined)
    ) {
      continue
    }
    if (
      !Number.isFinite(responseValue) ||
      predictorValues.some((value) => !Number.isFinite(value))
    ) {
      throw new Error(`Nonfinite value on row ${rowIndex + 1}.`)
    }
    complete.push({
      sourceRow: rowIndex + 1,
      response: responseValue,
      predictors: predictorValues as number[],
    })
  }

  const predictorCount = predictors.length
  const parameterCount = predictorCount + 1
  if (complete.length <= parameterCount) {
    throw new Error('Linear regression needs more complete observations than model parameters.')
  }
  const count = complete.length
  const degreesOfFreedom = count - parameterCount
  const responses = complete.map((observation) => observation.response)
  const responseMean = responses.reduce((sum, value) => sum + value, 0) / count
  const totalSumSquares = sumSquares(responses, responseMean)
  if (totalSumSquares <= 0) throw new Error('Response variation must be greater than zero.')

  const predictorMeans = predictors.map(
    (_, predictorIndex) =>
      complete.reduce((sum, observation) => sum + observation.predictors[predictorIndex], 0) /
      count,
  )
  const predictorScales = predictors.map((_, predictorIndex) => {
    const scale = Math.sqrt(
      complete.reduce(
        (sum, observation) =>
          sum + (observation.predictors[predictorIndex] - predictorMeans[predictorIndex]) ** 2,
        0,
      ) / count,
    )
    if (scale === 0)
      throw new Error(`Predictor ${predictors[predictorIndex].name} has no variation.`)
    return scale
  })

  const design = new Matrix(count, parameterCount)
  const responseMatrix = new Matrix(count, 1)
  complete.forEach((observation, rowIndex) => {
    design.set(rowIndex, 0, 1)
    observation.predictors.forEach((value, predictorIndex) => {
      design.set(
        rowIndex,
        predictorIndex + 1,
        (value - predictorMeans[predictorIndex]) / predictorScales[predictorIndex],
      )
    })
    responseMatrix.set(rowIndex, 0, observation.response)
  })

  const qr = new QrDecomposition(design)
  const diagonal = Array.from({ length: parameterCount }, (_, index) =>
    Math.abs(qr.upperTriangularMatrix.get(index, index)),
  )
  const largestDiagonal = Math.max(...diagonal)
  if (!qr.isFullRank() || diagonal.some((value) => value <= largestDiagonal * 1e-10)) {
    throw new Error('Predictors are collinear; the regression model is rank deficient.')
  }
  const standardizedCoefficients = qr.solve(responseMatrix)
  const upper = squareUpperTriangle(qr.upperTriangularMatrix, parameterCount)
  const inverseUpper = new LuDecomposition(upper).solve(Matrix.eye(parameterCount))
  const standardizedCovariance = inverseUpper.mmul(inverseUpper.transpose())
  const varianceInflationFactors =
    predictorCount === 1
      ? [1]
      : (() => {
          const centeredPredictors = new Matrix(count, predictorCount)
          complete.forEach((observation, rowIndex) => {
            observation.predictors.forEach((value, predictorIndex) => {
              centeredPredictors.set(
                rowIndex,
                predictorIndex,
                (value - predictorMeans[predictorIndex]) / predictorScales[predictorIndex],
              )
            })
          })
          const predictorQr = new QrDecomposition(centeredPredictors)
          const predictorDiagonal = Array.from({ length: predictorCount }, (_, index) =>
            Math.abs(predictorQr.upperTriangularMatrix.get(index, index)),
          )
          const largestPredictorDiagonal = Math.max(...predictorDiagonal)
          if (
            !predictorQr.isFullRank() ||
            predictorDiagonal.some((value) => value <= largestPredictorDiagonal * 1e-10)
          ) {
            return predictors.map(() => Number.POSITIVE_INFINITY)
          }
          return inverseProductDiagonal(
            squareUpperTriangle(predictorQr.upperTriangularMatrix, predictorCount),
          ).map((value) => value * count)
        })()
  const transform = new Matrix(parameterCount, parameterCount)
  transform.set(0, 0, 1)
  for (let predictorIndex = 0; predictorIndex < predictorCount; predictorIndex++) {
    transform.set(
      0,
      predictorIndex + 1,
      -predictorMeans[predictorIndex] / predictorScales[predictorIndex],
    )
    transform.set(predictorIndex + 1, predictorIndex + 1, 1 / predictorScales[predictorIndex])
  }

  const fittedValues = complete.map((observation, rowIndex) => {
    let fitted = standardizedCoefficients.get(0, 0)
    for (let predictorIndex = 0; predictorIndex < predictorCount; predictorIndex++) {
      fitted +=
        standardizedCoefficients.get(predictorIndex + 1, 0) *
        ((observation.predictors[predictorIndex] - predictorMeans[predictorIndex]) /
          predictorScales[predictorIndex])
    }
    return { fitted, residual: observation.response - fitted, rowIndex }
  })
  const errorSumSquares = fittedValues.reduce(
    (sum, observation) => sum + observation.residual ** 2,
    0,
  )
  if (errorSumSquares <= Number.EPSILON * Math.max(1, totalSumSquares)) {
    throw new Error('Residual variation must be greater than zero for regression inference.')
  }
  const errorMeanSquare = errorSumSquares / degreesOfFreedom
  const rawRegressionSumSquares = totalSumSquares - errorSumSquares
  const regressionSumSquares =
    rawRegressionSumSquares < 0 && Math.abs(rawRegressionSumSquares) < 1e-10 * totalSumSquares
      ? 0
      : rawRegressionSumSquares
  if (regressionSumSquares < 0)
    throw new Error('Regression sum-of-squares decomposition is numerically unstable.')
  const regressionDegreesOfFreedom = predictorCount
  const regressionMeanSquare = regressionSumSquares / regressionDegreesOfFreedom
  const fStatistic = regressionMeanSquare / errorMeanSquare
  const modelPValue = Math.max(
    0,
    1 - jStat.centralF.cdf(fStatistic, regressionDegreesOfFreedom, degreesOfFreedom),
  )
  const tCritical = jStat.studentt.inv(1 - alpha / 2, degreesOfFreedom)
  const covarianceTransform = transform.mmul(standardizedCovariance).mmul(transform.transpose())
  const coefficients: LinearRegressionCoefficient[] = []
  const originalEstimates = [
    standardizedCoefficients.get(0, 0) -
      predictors.reduce(
        (sum, _, predictorIndex) =>
          sum +
          (standardizedCoefficients.get(predictorIndex + 1, 0) * predictorMeans[predictorIndex]) /
            predictorScales[predictorIndex],
        0,
      ),
    ...predictors.map(
      (_, predictorIndex) =>
        standardizedCoefficients.get(predictorIndex + 1, 0) / predictorScales[predictorIndex],
    ),
  ]

  for (let coefficientIndex = 0; coefficientIndex < parameterCount; coefficientIndex++) {
    const estimate = originalEstimates[coefficientIndex]
    const standardError = Math.sqrt(
      Math.max(0, covarianceTransform.get(coefficientIndex, coefficientIndex) * errorMeanSquare),
    )
    const tStatistic = estimate / standardError
    const vif = coefficientIndex === 0 ? null : varianceInflationFactors[coefficientIndex - 1]
    coefficients.push({
      term: coefficientIndex === 0 ? '(Intercept)' : predictors[coefficientIndex - 1].name,
      estimate,
      standardError,
      tStatistic,
      pValue: Math.max(0, 2 * (1 - jStat.studentt.cdf(Math.abs(tStatistic), degreesOfFreedom))),
      confidenceInterval: [
        estimate - tCritical * standardError,
        estimate + tCritical * standardError,
      ],
      vif,
    })
  }

  const observations: LinearRegressionObservation[] = fittedValues.map((fit) => {
    const source = complete[fit.rowIndex]
    const designValues = [
      1,
      ...source.predictors.map(
        (value, predictorIndex) =>
          (value - predictorMeans[predictorIndex]) / predictorScales[predictorIndex],
      ),
    ]
    let leverage = 0
    for (let rowIndex = 0; rowIndex < parameterCount; rowIndex++) {
      for (let columnIndex = 0; columnIndex < parameterCount; columnIndex++) {
        leverage +=
          designValues[rowIndex] *
          standardizedCovariance.get(rowIndex, columnIndex) *
          designValues[columnIndex]
      }
    }
    leverage = Math.min(1, Math.max(0, leverage))
    const oneMinusLeverage = Math.max(Number.EPSILON, 1 - leverage)
    const standardizedResidual = fit.residual / Math.sqrt(errorMeanSquare * oneMinusLeverage)
    const cooksDistance =
      (standardizedResidual ** 2 * leverage) / (parameterCount * oneMinusLeverage)
    const meanHalfWidth = tCritical * Math.sqrt(errorMeanSquare * leverage)
    const predictionHalfWidth = tCritical * Math.sqrt(errorMeanSquare * (1 + leverage))
    const fitted = fit.fitted
    return {
      sourceRow: source.sourceRow,
      observed: source.response,
      fitted,
      residual: fit.residual,
      leverage,
      standardizedResidual,
      cooksDistance,
      fittedConfidenceInterval: [fitted - meanHalfWidth, fitted + meanHalfWidth],
      predictionInterval: [fitted - predictionHalfWidth, fitted + predictionHalfWidth],
    }
  })
  const durbinWatsonNumerator = observations
    .slice(1)
    .reduce(
      (sum, observation, index) => sum + (observation.residual - observations[index].residual) ** 2,
      0,
    )
  const durbinWatson = durbinWatsonNumerator / errorSumSquares
  const rSquared = Math.max(0, Math.min(1, regressionSumSquares / totalSumSquares))
  const adjustedRSquared = 1 - ((1 - rSquared) * (count - 1)) / degreesOfFreedom

  const anova: LinearRegressionAnovaRow[] = [
    {
      source: 'regression',
      sumSquares: regressionSumSquares,
      degreesOfFreedom: regressionDegreesOfFreedom,
      meanSquare: regressionMeanSquare,
      fStatistic,
      pValue: modelPValue,
    },
    {
      source: 'error',
      sumSquares: errorSumSquares,
      degreesOfFreedom,
      meanSquare: errorMeanSquare,
      fStatistic: null,
      pValue: null,
    },
    {
      source: 'total',
      sumSquares: totalSumSquares,
      degreesOfFreedom: count - 1,
      meanSquare: null,
      fStatistic: null,
      pValue: null,
    },
  ]

  return {
    responseName: options.responseName ?? 'Response',
    predictorNames: predictors.map((predictor) => predictor.name),
    count,
    droppedCount: response.length - count,
    degreesOfFreedom,
    regressionSumSquares,
    errorSumSquares,
    totalSumSquares,
    regressionMeanSquare,
    errorMeanSquare,
    fStatistic,
    modelPValue,
    rSquared,
    adjustedRSquared,
    durbinWatson,
    alpha,
    coefficients,
    anova,
    observations,
  }
}
