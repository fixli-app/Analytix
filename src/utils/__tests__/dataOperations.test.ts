import { describe, expect, it } from 'vitest'
import {
  encodeCategories,
  convertColumnValues,
  generateRandomValues,
  mergeWorksheets,
  rankValues,
  sampleRows,
  splitRowsByCategory,
  stackColumns,
  subsetRows,
  subsetRowsByConditions,
  unstackColumn,
} from '../dataOperations'

const columns = [
  { id: 'C1', name: 'Group', type: 'text' as const },
  { id: 'C2', name: 'Before', type: 'numeric' as const },
  { id: 'C3', name: 'After', type: 'numeric' as const },
]
const rows = [
  { C1: 'A', C2: '8', C3: '9' },
  { C1: 'B', C2: '10', C3: '' },
  { C1: 'A', C2: '12', C3: '11' },
  { C1: '', C2: '14', C3: '13' },
]

describe('data operations', () => {
  it('subsets rows by equality, contains, and missing values without mutating input', () => {
    expect(subsetRows(rows, columns[0], 'equals', 'a').map((row) => row.C2)).toEqual(['8', '12'])
    expect(subsetRows(rows, columns[0], 'contains', 'b').map((row) => row.C2)).toEqual(['10'])
    expect(subsetRows(rows, columns[0], 'isMissing').map((row) => row.C2)).toEqual(['14'])
    expect(rows).toHaveLength(4)
  })

  it('combines multiple categorical and numeric subset rules with AND/OR logic', () => {
    expect(
      subsetRowsByConditions(
        rows,
        [
          { column: columns[0], operator: 'equals', criterion: 'A' },
          { column: columns[1], operator: 'greaterOrEqual', criterion: '10' },
        ],
        'and',
      ).map((row) => row.C2),
    ).toEqual(['12'])
    expect(
      subsetRowsByConditions(
        rows,
        [
          { column: columns[0], operator: 'equals', criterion: 'A' },
          { column: columns[1], operator: 'greaterThan', criterion: '13' },
        ],
        'or',
      ).map((row) => row.C2),
    ).toEqual(['8', '12', '14'])
    expect(
      subsetRowsByConditions(
        rows,
        [{ column: columns[1], operator: 'between', criterion: '9', upperCriterion: '12' }],
        'and',
      ).map((row) => row.C2),
    ).toEqual(['10', '12'])
  })

  it('ranks ascending values and applies selected tie rules while preserving missing cells', () => {
    const values = [3, 1, 1, null, 5]
    expect(rankValues(values)).toEqual([3, 1.5, 1.5, null, 4])
    expect(rankValues(values, 'minimum')).toEqual([3, 1, 1, null, 4])
    expect(rankValues(values, 'maximum')).toEqual([3, 2, 2, null, 4])
    expect(() => rankValues([1, Number.NaN])).toThrow(
      'Rank values must be finite numbers or missing.',
    )
  })

  it('codes trimmed categories in Swedish alphabetical order and preserves missing values', () => {
    expect(encodeCategories(['B', ' A ', null, 'B', ''])).toEqual({
      categories: ['A', 'B'],
      values: [2, 1, null, 2, null],
    })
  })

  it('stacks selected columns in order and excludes missing observations', () => {
    expect(stackColumns(rows, columns, ['C2', 'C3'])).toEqual({
      columns: [
        { id: 'C1', name: 'Value', type: 'numeric' },
        { id: 'C2', name: 'Source', type: 'text' },
      ],
      rows: [
        { C1: '8', C2: 'Before' },
        { C1: '10', C2: 'Before' },
        { C1: '12', C2: 'Before' },
        { C1: '14', C2: 'Before' },
        { C1: '9', C2: 'After' },
        { C1: '11', C2: 'After' },
        { C1: '13', C2: 'After' },
      ],
    })
    expect(() => stackColumns(rows, columns, ['C2'])).toThrow(
      'Select at least two columns to stack.',
    )
  })

  it('splits rows into alphabetically ordered category worksheets and skips missing categories', () => {
    expect(splitRowsByCategory(rows, columns, 'C1', 'Run')).toEqual([
      {
        name: 'Run - A (1)',
        columns,
        rows: [rows[0], rows[2]],
      },
      {
        name: 'Run - B (2)',
        columns,
        rows: [rows[1]],
      },
    ])
    expect(() => splitRowsByCategory(rows, columns, 'missing', 'Run')).toThrow(
      'Select a category column to split by.',
    )
  })

  it('unstacks values into source-category columns by occurrence order', () => {
    expect(
      unstackColumn(
        [
          { C1: '8', C2: 'Before' },
          { C1: '9', C2: 'After' },
          { C1: '10', C2: 'Before' },
          { C1: '', C2: 'After' },
          { C1: '11', C2: 'After' },
        ],
        [
          { id: 'C1', name: 'Value', type: 'numeric' },
          { id: 'C2', name: 'Source', type: 'text' },
        ],
        'C1',
        'C2',
      ),
    ).toEqual({
      columns: [
        { id: 'C1', name: 'After', type: 'numeric' },
        { id: 'C2', name: 'Before', type: 'numeric' },
      ],
      rows: [
        { C1: '9', C2: '8' },
        { C2: '10', C1: '11' },
      ],
    })
  })

  it('samples rows without replacement and repeats exactly for the same seed', () => {
    const first = sampleRows(rows, 3, 42)
    expect(sampleRows(rows, 3, 42)).toEqual(first)
    expect(first).toHaveLength(3)
    expect(new Set(first.map((row) => row.C2)).size).toBe(3)
    expect(() => sampleRows(rows, 5, 42)).toThrow(
      'Sample size must be an integer between 1 and the number of rows.',
    )
  })

  it('generates reproducible uniform, normal, binomial, and Poisson values within bounds', () => {
    const cases = [
      { distribution: 'uniform' as const, first: -2, second: 5, min: -2, max: 5 },
      { distribution: 'normal' as const, first: 10, second: 2, min: -Infinity, max: Infinity },
      { distribution: 'binomial' as const, first: 12, second: 0.4, min: 0, max: 12 },
      { distribution: 'poisson' as const, first: 4, second: 0, min: 0, max: Infinity },
      { distribution: 'exponential' as const, first: 2, second: 0, min: 0, max: Infinity },
      { distribution: 'gamma' as const, first: 2, second: 3, min: 0, max: Infinity },
      { distribution: 'chiSquare' as const, first: 4, second: 0, min: 0, max: Infinity },
      { distribution: 'f' as const, first: 5, second: 20, min: 0, max: Infinity },
      { distribution: 'weibull' as const, first: 1.5, second: 2, min: 0, max: Infinity },
      { distribution: 'lognormal' as const, first: 0, second: 0.25, min: 0, max: Infinity },
      { distribution: 'studentT' as const, first: 5, second: 0, min: -Infinity, max: Infinity },
    ]
    for (const item of cases) {
      const generated = generateRandomValues(20, 72, item.distribution, item.first, item.second)
      expect(generated).toEqual(
        generateRandomValues(20, 72, item.distribution, item.first, item.second),
      )
      expect(generated.every((value) => value >= item.min && value <= item.max)).toBe(true)
    }
    expect(() => generateRandomValues(1, 0, 'uniform', 3, 2)).toThrow(
      'Uniform minimum must be less than its maximum.',
    )
    expect(() => generateRandomValues(1, 0, 'normal', 0, 0)).toThrow(
      'Normal standard deviation must be greater than zero.',
    )
    expect(() => generateRandomValues(1, 0, 'gamma', 0, 1)).toThrow(
      'Gamma shape must be in (0, 1000000] and scale must be greater than zero.',
    )
  })

  it('approximates expected means for added random distributions', () => {
    const mean = (values: number[]) =>
      values.reduce((total, value) => total + value, 0) / values.length
    expect(mean(generateRandomValues(10_000, 7, 'exponential', 2))).toBeCloseTo(0.5, 1)
    expect(mean(generateRandomValues(10_000, 7, 'gamma', 2, 3))).toBeCloseTo(6, 0)
    expect(mean(generateRandomValues(10_000, 7, 'chiSquare', 4))).toBeCloseTo(4, 0)
    expect(mean(generateRandomValues(10_000, 7, 'f', 5, 20))).toBeCloseTo(20 / 18, 0)
    expect(mean(generateRandomValues(10_000, 7, 'lognormal', 0, 0.25))).toBeCloseTo(
      Math.exp(0.25 ** 2 / 2),
      1,
    )
  })

  it('converts whole columns and reports invalid rows without partial coercion', () => {
    expect(convertColumnValues(['1,5', '', '2'], 'numeric')).toEqual({
      values: ['1.5', null, '2'],
      invalidRows: [],
    })
    expect(convertColumnValues(['2026-03-04', 'bad-date'], 'date')).toEqual({
      values: ['2026-03-04', 'bad-date'],
      invalidRows: [2],
    })
    expect(convertColumnValues(['  label ', ''], 'text')).toEqual({
      values: ['  label ', null],
      invalidRows: [],
    })
  })

  it('merges worksheets by column name while allowing different column order', () => {
    const worksheets = [
      {
        id: 'one',
        name: 'One',
        columns,
        rows: [{ C1: 'A', C2: '8', C3: '9' }],
      },
      {
        id: 'two',
        name: 'Two',
        columns: [columns[2], columns[0], columns[1]],
        rows: [{ C1: 'B', C2: '10', C3: '11' }],
      },
    ]
    expect(mergeWorksheets(worksheets, ['one', 'two'])).toEqual({
      columns,
      rows: [
        { C1: 'A', C2: '8', C3: '9' },
        { C1: 'B', C2: '10', C3: '11' },
      ],
    })
    expect(() => mergeWorksheets(worksheets, ['one'])).toThrow(
      'Select at least two worksheets to merge.',
    )
  })
})
