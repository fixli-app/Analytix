import type { SheetColumn, SheetRow, WorksheetSnapshot } from '../store/workbook'

export type SubsetOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'isMissing'
  | 'isNotMissing'
  | 'greaterThan'
  | 'greaterOrEqual'
  | 'lessThan'
  | 'lessOrEqual'
  | 'between'
export type ConditionLogic = 'and' | 'or'
export type TieMethod = 'average' | 'minimum' | 'maximum'
export type RandomDistribution =
  | 'uniform'
  | 'normal'
  | 'binomial'
  | 'poisson'
  | 'exponential'
  | 'gamma'
  | 'chiSquare'
  | 'f'
  | 'weibull'
  | 'lognormal'
  | 'studentT'

export interface SubsetCondition {
  column: SheetColumn
  operator: SubsetOperator
  criterion?: string
  upperCriterion?: string
}

export interface StackedData {
  columns: SheetColumn[]
  rows: SheetRow[]
}

export interface NamedWorksheetData extends StackedData {
  name: string
}

export interface ColumnConversion {
  values: (string | null)[]
  invalidRows: number[]
}

export function subsetRows(
  rows: readonly SheetRow[],
  column: SheetColumn,
  operator: SubsetOperator,
  criterion = '',
): SheetRow[] {
  return subsetRowsByConditions(rows, [{ column, operator, criterion }], 'and')
}

function parseOrderedValue(value: string, type: SheetColumn['type']): number | null {
  if (type === 'numeric') {
    const parsed = Number(value.trim().replace(',', '.'))
    return Number.isFinite(parsed) ? parsed : null
  }
  if (type === 'date') {
    const parsed = Date.parse(value.trim())
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

function matchesSubsetCondition(row: SheetRow, condition: SubsetCondition): boolean {
  const raw = row[condition.column.id] ?? ''
  const value = raw.trim()
  const criterion = condition.criterion?.trim() ?? ''
  const normalizedValue = value.toLocaleLowerCase()
  const normalizedCriterion = criterion.toLocaleLowerCase()
  if (condition.operator === 'isMissing') return value === ''
  if (condition.operator === 'isNotMissing') return value !== ''
  if (condition.operator === 'equals') return normalizedValue === normalizedCriterion
  if (condition.operator === 'notEquals') return normalizedValue !== normalizedCriterion
  if (condition.operator === 'contains') return normalizedValue.includes(normalizedCriterion)

  const orderedValue = parseOrderedValue(value, condition.column.type)
  const lower = parseOrderedValue(criterion, condition.column.type)
  const upper = parseOrderedValue(condition.upperCriterion?.trim() ?? '', condition.column.type)
  if (orderedValue === null || lower === null) return false
  switch (condition.operator) {
    case 'greaterThan':
      return orderedValue > lower
    case 'greaterOrEqual':
      return orderedValue >= lower
    case 'lessThan':
      return orderedValue < lower
    case 'lessOrEqual':
      return orderedValue <= lower
    case 'between':
      return upper !== null && orderedValue >= lower && orderedValue <= upper
    default:
      return false
  }
}

export function subsetRowsByConditions(
  rows: readonly SheetRow[],
  conditions: readonly SubsetCondition[],
  logic: ConditionLogic,
): SheetRow[] {
  if (conditions.length === 0) throw new Error('Add at least one subset condition.')
  return rows
    .filter((row) => {
      const results = conditions.map((condition) => matchesSubsetCondition(row, condition))
      return logic === 'and' ? results.every(Boolean) : results.some(Boolean)
    })
    .map((row) => ({ ...row }))
}

export function rankValues(
  values: readonly (number | null)[],
  tieMethod: TieMethod = 'average',
): (number | null)[] {
  const ranked: (number | null)[] = values.map(() => null)
  const ordered = values
    .map((value, index) => {
      if (value !== null && !Number.isFinite(value)) {
        throw new Error('Rank values must be finite numbers or missing.')
      }
      return value === null ? null : { value, index }
    })
    .filter((item): item is { value: number; index: number } => item !== null)
    .sort((left, right) => left.value - right.value || left.index - right.index)

  for (let start = 0; start < ordered.length;) {
    let end = start + 1
    while (end < ordered.length && ordered[end].value === ordered[start].value) end++
    const minimumRank = start + 1
    const maximumRank = end
    const rank =
      tieMethod === 'minimum'
        ? minimumRank
        : tieMethod === 'maximum'
          ? maximumRank
          : (minimumRank + maximumRank) / 2
    for (let index = start; index < end; index++) ranked[ordered[index].index] = rank
    start = end
  }
  return ranked
}

export function encodeCategories(values: readonly (string | null | undefined)[]) {
  const categories = [...new Set(values.map((value) => value?.trim() ?? '').filter(Boolean))].sort(
    (left, right) => left.localeCompare(right, 'sv'),
  )
  const codes = new Map(categories.map((category, index) => [category, index + 1]))
  return {
    categories,
    values: values.map((value) => {
      const normalized = value?.trim() ?? ''
      return normalized ? (codes.get(normalized) ?? null) : null
    }),
  }
}

export function stackColumns(
  rows: readonly SheetRow[],
  columns: readonly SheetColumn[],
  selectedColumnIds: readonly string[],
): StackedData {
  const selected = columns.filter((column) => selectedColumnIds.includes(column.id))
  if (selected.length < 2) throw new Error('Select at least two columns to stack.')

  const valueType = selected.every((column) => column.type === selected[0].type)
    ? selected[0].type
    : 'text'
  const resultColumns: SheetColumn[] = [
    { id: 'C1', name: 'Value', type: valueType },
    { id: 'C2', name: 'Source', type: 'text' },
  ]
  const resultRows: SheetRow[] = []
  for (const column of selected) {
    for (const row of rows) {
      const value = row[column.id] ?? ''
      if (value.trim() === '') continue
      resultRows.push({ C1: value, C2: column.name })
    }
  }
  return { columns: resultColumns, rows: resultRows }
}

export function splitRowsByCategory(
  rows: readonly SheetRow[],
  columns: readonly SheetColumn[],
  categoryColumnId: string,
  namePrefix: string,
): NamedWorksheetData[] {
  const categoryColumn = columns.find((column) => column.id === categoryColumnId)
  if (!categoryColumn) throw new Error('Select a category column to split by.')
  const categories = [
    ...new Set(rows.map((row) => row[categoryColumnId]?.trim() ?? '').filter(Boolean)),
  ].sort((left, right) => left.localeCompare(right, 'sv'))
  if (categories.length === 0) throw new Error('The category column contains no values to split.')

  return categories.map((category, index) => ({
    name: `${namePrefix.trim() || categoryColumn.name} - ${category} (${index + 1})`,
    columns: columns.map((column) => ({ ...column })),
    rows: rows
      .filter((row) => row[categoryColumnId]?.trim() === category)
      .map((row) => ({ ...row })),
  }))
}

export function unstackColumn(
  rows: readonly SheetRow[],
  columns: readonly SheetColumn[],
  valueColumnId: string,
  sourceColumnId: string,
): StackedData {
  const valueColumn = columns.find((column) => column.id === valueColumnId)
  const sourceColumn = columns.find((column) => column.id === sourceColumnId)
  if (!valueColumn || !sourceColumn || valueColumnId === sourceColumnId) {
    throw new Error('Select different value and source columns to unstack.')
  }
  const categories = [
    ...new Set(rows.map((row) => row[sourceColumnId]?.trim() ?? '').filter(Boolean)),
  ].sort((left, right) => left.localeCompare(right, 'sv'))
  if (categories.length === 0) throw new Error('The source column contains no values to unstack.')

  const resultColumns = categories.map((category, index) => ({
    id: `C${index + 1}`,
    name: category,
    type: valueColumn.type,
  }))
  const occurrenceByCategory = new Map(categories.map((category) => [category, 0]))
  const resultRows: SheetRow[] = []
  for (const row of rows) {
    const category = row[sourceColumnId]?.trim() ?? ''
    const value = row[valueColumnId] ?? ''
    if (!category || value.trim() === '') continue
    const resultRowIndex = occurrenceByCategory.get(category) ?? 0
    occurrenceByCategory.set(category, resultRowIndex + 1)
    while (resultRows.length <= resultRowIndex) resultRows.push({})
    const resultColumn = resultColumns.find((column) => column.name === category)
    if (resultColumn) resultRows[resultRowIndex][resultColumn.id] = value
  }
  return { columns: resultColumns, rows: resultRows }
}

export function sampleRows(
  rows: readonly SheetRow[],
  sampleSize: number,
  seed: number,
): SheetRow[] {
  if (!Number.isInteger(sampleSize) || sampleSize < 1 || sampleSize > rows.length) {
    throw new Error('Sample size must be an integer between 1 and the number of rows.')
  }
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new Error('Seed must be an integer between 0 and 4294967295.')
  }

  let state = seed >>> 0
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }

  const indexes = rows.map((_, index) => index)
  for (let index = indexes.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[indexes[index], indexes[swapIndex]] = [indexes[swapIndex], indexes[index]]
  }
  return indexes
    .slice(0, sampleSize)
    .sort((left, right) => left - right)
    .map((index) => ({ ...rows[index] }))
}

export function generateRandomValues(
  count: number,
  seed: number,
  distribution: RandomDistribution,
  firstParameter: number,
  secondParameter = 0,
): number[] {
  if (!Number.isInteger(count) || count < 1 || count > 500_000) {
    throw new Error('Generated row count must be an integer from 1 to 500000.')
  }
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new Error('Seed must be an integer between 0 and 4294967295.')
  }
  if (!Number.isFinite(firstParameter) || !Number.isFinite(secondParameter)) {
    throw new Error('Distribution parameters must be finite numbers.')
  }
  if (distribution === 'uniform' && firstParameter >= secondParameter) {
    throw new Error('Uniform minimum must be less than its maximum.')
  }
  if (distribution === 'normal' && secondParameter <= 0) {
    throw new Error('Normal standard deviation must be greater than zero.')
  }
  if (distribution === 'exponential' && firstParameter <= 0) {
    throw new Error('Exponential rate must be greater than zero.')
  }
  if (
    distribution === 'gamma' &&
    (firstParameter <= 0 || secondParameter <= 0 || firstParameter > 1_000_000)
  ) {
    throw new Error('Gamma shape must be in (0, 1000000] and scale must be greater than zero.')
  }
  if (distribution === 'chiSquare' && (firstParameter <= 0 || firstParameter > 1_000_000)) {
    throw new Error('Chi-square degrees of freedom must be in (0, 1000000].')
  }
  if (
    distribution === 'f' &&
    (firstParameter <= 0 ||
      secondParameter <= 0 ||
      firstParameter > 1_000_000 ||
      secondParameter > 1_000_000)
  ) {
    throw new Error('F degrees of freedom must be in (0, 1000000].')
  }
  if (
    distribution === 'weibull' &&
    (firstParameter <= 0 || secondParameter <= 0 || firstParameter > 1_000_000)
  ) {
    throw new Error('Weibull shape must be in (0, 1000000] and scale must be greater than zero.')
  }
  if (distribution === 'lognormal' && secondParameter <= 0) {
    throw new Error('Lognormal standard deviation must be greater than zero.')
  }
  if (distribution === 'studentT' && (firstParameter <= 0 || firstParameter > 1_000_000)) {
    throw new Error('Student t degrees of freedom must be in (0, 1000000].')
  }
  if (
    distribution === 'binomial' &&
    (!Number.isInteger(firstParameter) ||
      firstParameter < 1 ||
      firstParameter > 10_000 ||
      secondParameter < 0 ||
      secondParameter > 1 ||
      count * firstParameter > 10_000_000)
  ) {
    throw new Error('Binomial trials, probability, or total work is outside supported limits.')
  }
  if (
    distribution === 'poisson' &&
    (firstParameter < 0 || firstParameter > 50 || count * firstParameter > 10_000_000)
  ) {
    throw new Error('Poisson rate or total work is outside supported limits (0 to 50).')
  }

  let state = seed >>> 0
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }

  const standardNormal = () => {
    const radius = Math.sqrt(-2 * Math.log(Math.max(random(), Number.MIN_VALUE)))
    return radius * Math.cos(2 * Math.PI * random())
  }

  const gammaSample = (shape: number, scale: number): number => {
    if (shape < 1) {
      return (
        gammaSample(shape + 1, scale) * Math.pow(Math.max(random(), Number.MIN_VALUE), 1 / shape)
      )
    }
    const adjustedShape = shape - 1 / 3
    const adjustment = 1 / Math.sqrt(9 * adjustedShape)
    for (let attempt = 0; attempt < 1000; attempt++) {
      const normal = standardNormal()
      const base = 1 + adjustment * normal
      if (base <= 0) continue
      const cube = base * base * base
      const uniform = random()
      if (uniform < 1 - 0.0331 * normal ** 4) return scale * adjustedShape * cube
      if (
        Math.log(Math.max(uniform, Number.MIN_VALUE)) <
        0.5 * normal * normal + adjustedShape * (1 - cube + Math.log(cube))
      ) {
        return scale * adjustedShape * cube
      }
    }
    throw new Error('Gamma sampler did not converge within its iteration limit.')
  }

  const generated = Array.from({ length: count }, () => {
    if (distribution === 'uniform') {
      return firstParameter + random() * (secondParameter - firstParameter)
    }
    if (distribution === 'normal') {
      return firstParameter + secondParameter * standardNormal()
    }
    if (distribution === 'binomial') {
      let successes = 0
      for (let trial = 0; trial < firstParameter; trial++) {
        if (random() < secondParameter) successes++
      }
      return successes
    }
    if (distribution === 'poisson') {
      const threshold = Math.exp(-firstParameter)
      let product = 1
      let events = 0
      do {
        events++
        product *= random()
      } while (product > threshold)
      return events - 1
    }
    if (distribution === 'exponential') {
      return -Math.log(Math.max(random(), Number.MIN_VALUE)) / firstParameter
    }
    if (distribution === 'gamma') return gammaSample(firstParameter, secondParameter)
    if (distribution === 'chiSquare') return gammaSample(firstParameter / 2, 2)
    if (distribution === 'f') {
      const numerator = gammaSample(firstParameter / 2, 2) / firstParameter
      const denominator = gammaSample(secondParameter / 2, 2) / secondParameter
      return numerator / denominator
    }
    if (distribution === 'weibull') {
      return (
        secondParameter *
        Math.pow(-Math.log(Math.max(random(), Number.MIN_VALUE)), 1 / firstParameter)
      )
    }
    if (distribution === 'lognormal') {
      return Math.exp(firstParameter + secondParameter * standardNormal())
    }
    return standardNormal() / Math.sqrt(gammaSample(firstParameter / 2, 2) / firstParameter)
  })
  if (!generated.every(Number.isFinite)) {
    throw new Error('Generated values exceeded the supported numeric range.')
  }
  return generated
}

export function convertColumnValues(
  values: readonly (string | null | undefined)[],
  targetType: SheetColumn['type'],
): ColumnConversion {
  const invalidRows: number[] = []
  const converted = values.map((value, index) => {
    const raw = value ?? ''
    const trimmed = raw.trim()
    if (!trimmed || targetType === 'text') return trimmed ? raw : null
    if (targetType === 'numeric') {
      const number = Number(trimmed.replace(',', '.'))
      if (!Number.isFinite(number)) {
        invalidRows.push(index + 1)
        return raw
      }
      return String(number)
    }
    const timestamp = Date.parse(trimmed)
    if (Number.isNaN(timestamp)) {
      invalidRows.push(index + 1)
      return raw
    }
    return new Date(timestamp).toISOString().slice(0, 10)
  })
  return { values: converted, invalidRows }
}

export function mergeWorksheets(
  worksheets: readonly WorksheetSnapshot[],
  selectedWorksheetIds: readonly string[],
): StackedData {
  const selected = worksheets.filter((worksheet) => selectedWorksheetIds.includes(worksheet.id))
  if (selected.length < 2) throw new Error('Select at least two worksheets to merge.')
  const referenceColumns = selected[0].columns
  if (referenceColumns.length === 0) throw new Error('Worksheets must contain columns to merge.')

  const normalizedNames = referenceColumns.map((column) => column.name.trim().toLocaleLowerCase())
  if (new Set(normalizedNames).size !== normalizedNames.length) {
    throw new Error('Worksheet column names must be unique to merge by name.')
  }
  const columnMaps = selected.map((worksheet) => {
    const byName = new Map(
      worksheet.columns.map((column) => [column.name.trim().toLocaleLowerCase(), column]),
    )
    if (
      byName.size !== referenceColumns.length ||
      referenceColumns.some((column) => {
        const match = byName.get(column.name.trim().toLocaleLowerCase())
        return !match || match.type !== column.type
      })
    ) {
      throw new Error('Worksheets must have matching column names and types to merge.')
    }
    return referenceColumns.map((column) => byName.get(column.name.trim().toLocaleLowerCase())!)
  })

  const mergedRows = selected.flatMap((worksheet, worksheetIndex) =>
    worksheet.rows.map((row) =>
      Object.fromEntries(
        referenceColumns.map((column, columnIndex) => [
          column.id,
          row[columnMaps[worksheetIndex][columnIndex].id] ?? '',
        ]),
      ),
    ),
  )
  return {
    columns: referenceColumns.map((column) => ({ ...column })),
    rows: mergedRows,
  }
}
