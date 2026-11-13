import {
  linearRegression,
  type LinearRegressionPredictor,
  type LinearRegressionResult,
} from './linearRegression'

export type RegressionInputValue = number | string | null | undefined

export interface RegressionModelVariable {
  name: string
  type: 'numeric' | 'categorical'
  values: readonly RegressionInputValue[]
}

export interface RegressionModelOptions {
  responseName?: string
  alpha?: number
  includeInteractions?: boolean
  quadraticPredictors?: readonly string[]
}

interface ModelTerm extends LinearRegressionPredictor {
  sourceName: string
}

function numericValues(variable: RegressionModelVariable): (number | null)[] {
  return variable.values.map((value, rowIndex) => {
    if (
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.trim() === '')
    ) {
      return null
    }
    const numeric = typeof value === 'number' ? value : Number(value.trim().replace(',', '.'))
    if (!Number.isFinite(numeric)) {
      throw new Error(`Predictor ${variable.name} has a nonnumeric value on row ${rowIndex + 1}.`)
    }
    return numeric
  })
}

export function multipleLinearRegression(
  response: readonly (number | null | undefined)[],
  variables: readonly RegressionModelVariable[],
  options: RegressionModelOptions = {},
): LinearRegressionResult {
  if (variables.length < 1 || variables.length > 12) {
    throw new Error('Regression requires 1 to 12 selected variables.')
  }
  if (variables.some((variable) => !variable.name.trim())) {
    throw new Error('Predictor names must be nonempty.')
  }
  if (
    new Set(variables.map((variable) => variable.name.trim().toLocaleLowerCase())).size !==
    variables.length
  ) {
    throw new Error('Predictor names must be unique.')
  }
  if (variables.some((variable) => variable.values.length !== response.length)) {
    throw new Error('Response and predictor columns must have the same number of rows.')
  }

  const terms: ModelTerm[] = []
  const mainTermsByVariable = new Map<string, ModelTerm[]>()
  for (const variable of variables) {
    const mainTerms: ModelTerm[] = []
    if (variable.type === 'numeric') {
      mainTerms.push({
        name: variable.name,
        sourceName: variable.name,
        values: numericValues(variable),
      })
    } else {
      const normalizedValues = variable.values.map((value) =>
        typeof value === 'string' && value.trim() !== '' ? value.trim() : null,
      )
      const levels = [
        ...new Set(normalizedValues.filter((value): value is string => value !== null)),
      ].sort((left, right) => left.localeCompare(right, 'sv'))
      if (levels.length < 2) {
        throw new Error(
          `Categorical predictor ${variable.name} requires at least two observed levels.`,
        )
      }
      for (const level of levels.slice(1)) {
        mainTerms.push({
          name: `${variable.name}[${level}]`,
          sourceName: variable.name,
          values: normalizedValues.map((value) =>
            value === null ? null : Number(value === level),
          ),
        })
      }
    }
    terms.push(...mainTerms)
    mainTermsByVariable.set(variable.name, mainTerms)
  }

  const quadraticNames = new Set(options.quadraticPredictors ?? [])
  const knownNumericNames = new Set(
    variables.filter((variable) => variable.type === 'numeric').map((variable) => variable.name),
  )
  for (const name of quadraticNames) {
    if (!knownNumericNames.has(name)) {
      throw new Error(`Quadratic term ${name} requires a selected numeric predictor.`)
    }
    const variable = variables.find((candidate) => candidate.name === name)!
    const values = numericValues(variable)
    const observed = values.filter((value): value is number => value !== null)
    const center = observed.reduce((sum, value) => sum + value, 0) / observed.length
    terms.push({
      name: `${name}^2`,
      sourceName: name,
      values: values.map((value) => (value === null ? null : (value - center) ** 2)),
    })
  }

  if (options.includeInteractions) {
    for (let first = 0; first < variables.length; first++) {
      for (let second = first + 1; second < variables.length; second++) {
        const firstVariable = variables[first]
        const secondVariable = variables[second]
        const firstTerms = mainTermsByVariable.get(firstVariable.name)!
        const secondTerms = mainTermsByVariable.get(secondVariable.name)!
        for (const firstTerm of firstTerms) {
          for (const secondTerm of secondTerms) {
            terms.push({
              name: `${firstTerm.name}:${secondTerm.name}`,
              sourceName: `${firstVariable.name}:${secondVariable.name}`,
              values: firstTerm.values.map((firstValue, rowIndex) => {
                const secondValue = secondTerm.values[rowIndex]
                return firstValue === null ||
                  firstValue === undefined ||
                  secondValue === null ||
                  secondValue === undefined
                  ? null
                  : firstValue * secondValue
              }),
            })
          }
        }
      }
    }
  }

  if (terms.length > 12) {
    throw new Error('Expanded regression model exceeds the 12-term limit.')
  }
  return linearRegression(response, terms, options)
}
