import { useEffect, useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Plus, X } from 'lucide-react'
import type { SheetColumn, SheetRow, WorksheetSnapshot } from '../store/workbook'
import {
  convertColumnValues,
  encodeCategories,
  generateRandomValues,
  mergeWorksheets,
  rankValues,
  sampleRows,
  splitRowsByCategory,
  stackColumns,
  subsetRowsByConditions,
  unstackColumn,
  type ConditionLogic,
  type RandomDistribution,
  type SubsetCondition,
  type SubsetOperator,
  type TieMethod,
} from '../utils/dataOperations'

export type DataOperationResult =
  | {
      kind: 'worksheets'
      worksheets: { name: string; columns: SheetColumn[]; rows: SheetRow[] }[]
      summary: string
    }
  | {
      kind: 'worksheet'
      name: string
      columns: SheetColumn[]
      rows: SheetRow[]
      summary: string
    }
  | {
      kind: 'column'
      name: string
      type: SheetColumn['type']
      values: (string | null)[]
      summary: string
    }

interface DataOperationsDialogProps {
  open: boolean
  columns: SheetColumn[]
  rows: SheetRow[]
  worksheets: WorksheetSnapshot[]
  initialColumn: string
  language: string
  onOpenChange: (open: boolean) => void
  onSubmit: (result: DataOperationResult) => void
}

type Operation =
  | 'subset'
  | 'rank'
  | 'encode'
  | 'stack'
  | 'split'
  | 'unstack'
  | 'sample'
  | 'convert'
  | 'merge'
  | 'generate'

interface SubsetConditionDraft {
  columnId: string
  operator: SubsetCondition['operator']
  criterion: string
  upperCriterion: string
}

const randomDistributionDefaults: Record<RandomDistribution, [string, string]> = {
  uniform: ['0', '1'],
  normal: ['0', '1'],
  binomial: ['10', '0.5'],
  poisson: ['4', '0'],
  exponential: ['2', '0'],
  gamma: ['2', '3'],
  chiSquare: ['4', '0'],
  f: ['5', '20'],
  weibull: ['1.5', '2'],
  lognormal: ['0', '0.25'],
  studentT: ['5', '0'],
}

export function DataOperationsDialog({
  open,
  columns,
  rows,
  worksheets,
  initialColumn,
  language,
  onOpenChange,
  onSubmit,
}: DataOperationsDialogProps) {
  const [operation, setOperation] = useState<Operation>('subset')
  const [columnId, setColumnId] = useState(initialColumn)
  const [valueColumnId, setValueColumnId] = useState('')
  const [sourceColumnId, setSourceColumnId] = useState('')
  const [selectedColumnIds, setSelectedColumnIds] = useState<string[]>([])
  const [selectedWorksheetIds, setSelectedWorksheetIds] = useState<string[]>([])
  const [conditions, setConditions] = useState<SubsetConditionDraft[]>([])
  const [conditionLogic, setConditionLogic] = useState<ConditionLogic>('and')
  const [tieMethod, setTieMethod] = useState<TieMethod>('average')
  const [sampleSize, setSampleSize] = useState('10')
  const [randomSeed, setRandomSeed] = useState('42')
  const [targetType, setTargetType] = useState<SheetColumn['type']>('text')
  const [randomDistribution, setRandomDistribution] = useState<RandomDistribution>('normal')
  const [randomCount, setRandomCount] = useState('100')
  const [randomParameter1, setRandomParameter1] = useState('0')
  const [randomParameter2, setRandomParameter2] = useState('1')
  const [randomColumnName, setRandomColumnName] = useState('Value')
  const [outputName, setOutputName] = useState('')
  const [error, setError] = useState('')
  const isSwedish = language === 'sv'
  const numericColumns = columns.filter((column) => column.type === 'numeric')

  useEffect(() => {
    if (!open) return
    setOperation('subset')
    setColumnId(
      columns.some((column) => column.id === initialColumn)
        ? initialColumn
        : (columns[0]?.id ?? ''),
    )
    setSelectedColumnIds(columns.slice(0, 2).map((column) => column.id))
    setSelectedWorksheetIds(worksheets.slice(0, 2).map((worksheet) => worksheet.id))
    setValueColumnId(columns[0]?.id ?? '')
    setSourceColumnId(columns[1]?.id ?? columns[0]?.id ?? '')
    setConditions([
      {
        columnId: columns[0]?.id ?? '',
        operator: 'equals',
        criterion: '',
        upperCriterion: '',
      },
    ])
    setConditionLogic('and')
    setTieMethod('average')
    setSampleSize(String(Math.min(10, rows.length)))
    setRandomSeed('42')
    setTargetType('text')
    setRandomDistribution('normal')
    setRandomCount('100')
    setRandomParameter1('0')
    setRandomParameter2('1')
    setRandomColumnName('Value')
    setOutputName('')
    setError('')
  }, [columns, initialColumn, open, rows.length, worksheets])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    try {
      if (operation === 'subset') {
        const selectedConditions = conditions.map((condition) => {
          const source = columns.find((column) => column.id === condition.columnId)
          if (!source) throw new Error(isSwedish ? 'Välj en kolumn.' : 'Select a column.')
          return { ...condition, column: source }
        })
        const resultRows = subsetRowsByConditions(rows, selectedConditions, conditionLogic)
        if (resultRows.length === 0)
          throw new Error(
            isSwedish ? 'Villkoret matchade inga rader.' : 'The condition matched no rows.',
          )
        onSubmit({
          kind: 'worksheet',
          name: outputName.trim() || (isSwedish ? 'Delmängd' : 'Subset'),
          columns: columns.map((column) => ({ ...column })),
          rows: resultRows,
          summary: isSwedish
            ? `${resultRows.length} rader kopierades till ett nytt arbetsblad.`
            : `${resultRows.length} rows were copied to a new worksheet.`,
        })
      } else if (operation === 'rank') {
        const source = numericColumns.find((column) => column.id === columnId)
        if (!source)
          throw new Error(isSwedish ? 'Välj en numerisk kolumn.' : 'Select a numeric column.')
        const values = rows.map((row) => {
          const raw = row[source.id]?.trim()
          return raw ? Number(raw.replace(',', '.')) : null
        })
        const ranked = rankValues(values, tieMethod)
        onSubmit({
          kind: 'column',
          name: outputName.trim() || `${isSwedish ? 'Rang' : 'Rank'}(${source.name})`,
          type: 'numeric',
          values: ranked.map((value) => (value === null ? null : String(value))),
          summary: isSwedish
            ? `Rangordning skapad från ${source.name}; saknade värden bevaras.`
            : `Ranks created from ${source.name}; missing values are preserved.`,
        })
      } else if (operation === 'encode') {
        const source = columns.find((column) => column.id === columnId)
        if (!source) throw new Error(isSwedish ? 'Välj en kolumn.' : 'Select a column.')
        const encoded = encodeCategories(rows.map((row) => row[source.id]))
        if (encoded.categories.length === 0)
          throw new Error(
            isSwedish
              ? 'Kolumnen saknar kategorier att koda.'
              : 'The column has no categories to encode.',
          )
        onSubmit({
          kind: 'column',
          name: outputName.trim() || `${isSwedish ? 'Kod' : 'Code'}(${source.name})`,
          type: 'numeric',
          values: encoded.values.map((value) => (value === null ? null : String(value))),
          summary: isSwedish
            ? `${encoded.categories.length} kategorier kodades alfabetiskt från 1.`
            : `${encoded.categories.length} categories were coded alphabetically from 1.`,
        })
      } else if (operation === 'convert') {
        const source = columns.find((column) => column.id === columnId)
        if (!source) throw new Error(isSwedish ? 'Välj en kolumn.' : 'Select a column.')
        const converted = convertColumnValues(
          rows.map((row) => row[source.id]),
          targetType,
        )
        if (converted.invalidRows.length > 0) {
          const invalidList = converted.invalidRows.slice(0, 5).join(', ')
          throw new Error(
            isSwedish
              ? `Konverteringen avbröts. Ogiltiga värden på rad: ${invalidList}.`
              : `Conversion stopped. Invalid values on row(s): ${invalidList}.`,
          )
        }
        onSubmit({
          kind: 'column',
          name: outputName.trim() || `${source.name} (${isSwedish ? 'text' : targetType})`,
          type: targetType,
          values: converted.values,
          summary: isSwedish
            ? `${source.name} konverterades till ${targetType}; källkolumnen lämnades orörd.`
            : `${source.name} converted to ${targetType}; the source column was preserved.`,
        })
      } else if (operation === 'stack') {
        const result = stackColumns(rows, columns, selectedColumnIds)
        if (result.rows.length === 0)
          throw new Error(
            isSwedish
              ? 'Valda kolumner innehåller inga värden.'
              : 'Selected columns contain no values.',
          )
        onSubmit({
          kind: 'worksheet',
          name: outputName.trim() || (isSwedish ? 'Staplad data' : 'Stacked data'),
          ...result,
          summary: isSwedish
            ? `${result.rows.length} värden staplades till ett nytt arbetsblad.`
            : `${result.rows.length} values were stacked into a new worksheet.`,
        })
      } else if (operation === 'split') {
        const source = columns.find((column) => column.id === columnId)
        if (!source)
          throw new Error(isSwedish ? 'Välj en kategorikolumn.' : 'Select a category column.')
        const worksheets = splitRowsByCategory(rows, columns, source.id, outputName || source.name)
        onSubmit({
          kind: 'worksheets',
          worksheets,
          summary: isSwedish
            ? `${worksheets.length} arbetsblad skapades från ${source.name}.`
            : `${worksheets.length} worksheets were created from ${source.name}.`,
        })
      } else if (operation === 'merge') {
        const result = mergeWorksheets(worksheets, selectedWorksheetIds)
        onSubmit({
          kind: 'worksheet',
          name: outputName.trim() || (isSwedish ? 'Sammanfogad data' : 'Merged data'),
          ...result,
          summary: isSwedish
            ? `${selectedWorksheetIds.length} arbetsblad sammanfogades utan att källbladen ändrades.`
            : `${selectedWorksheetIds.length} worksheets were merged without changing the source sheets.`,
        })
      } else if (operation === 'unstack') {
        const result = unstackColumn(rows, columns, valueColumnId, sourceColumnId)
        if (result.rows.length === 0)
          throw new Error(
            isSwedish ? 'Inga värden kunde avstaplas.' : 'No values could be unstacked.',
          )
        onSubmit({
          kind: 'worksheet',
          name: outputName.trim() || (isSwedish ? 'Avstaplad data' : 'Unstacked data'),
          ...result,
          summary: isSwedish
            ? `${result.columns.length} källkolumner avstaplades.`
            : `${result.columns.length} source columns were unstacked.`,
        })
      } else if (operation === 'sample') {
        const requestedSize = Number(sampleSize)
        const seed = Number(randomSeed)
        const sampled = sampleRows(rows, requestedSize, seed)
        onSubmit({
          kind: 'worksheet',
          name: outputName.trim() || (isSwedish ? 'Slumpurval' : 'Random sample'),
          columns: columns.map((column) => ({ ...column })),
          rows: sampled,
          summary: isSwedish
            ? `${sampled.length} rader valdes utan återläggning (seed ${seed}).`
            : `${sampled.length} rows were sampled without replacement (seed ${seed}).`,
        })
      } else {
        const count = Number(randomCount)
        const seed = Number(randomSeed)
        const firstParameter = Number(randomParameter1)
        const secondParameter = Number(randomParameter2)
        const generated = generateRandomValues(
          count,
          seed,
          randomDistribution,
          firstParameter,
          secondParameter,
        )
        const distributionLabels = {
          uniform: 'Uniform',
          normal: 'Normal',
          binomial: 'Binomial',
          poisson: 'Poisson',
          exponential: 'Exponential',
          gamma: 'Gamma',
          chiSquare: 'Chi-square',
          f: 'F',
          weibull: 'Weibull',
          lognormal: 'Lognormal',
          studentT: 'Student t',
        }
        onSubmit({
          kind: 'worksheet',
          name: outputName.trim() || (isSwedish ? 'Slumpdata' : 'Random data'),
          columns: [
            {
              id: 'C1',
              name: randomColumnName.trim() || distributionLabels[randomDistribution],
              type: 'numeric',
            },
          ],
          rows: generated.map((value) => ({ C1: String(value) })),
          summary: isSwedish
            ? `${count} ${distributionLabels[randomDistribution]}-värden skapades med seed ${seed}.`
            : `${count} ${distributionLabels[randomDistribution]} values generated with seed ${seed}.`,
        })
      }
      onOpenChange(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Operationen kunde inte genomföras.')
    }
  }

  const title = isSwedish ? 'Dataoperationer' : 'Data operations'
  const labels: Record<Operation, string> = isSwedish
    ? {
        subset: 'Delmängd',
        rank: 'Rangordna',
        encode: 'Koda',
        stack: 'Stapla',
        split: 'Dela',
        unstack: 'Avstapla',
        sample: 'Slumpurval',
        convert: 'Konvertera',
        merge: 'Sammanfoga',
        generate: 'Generera data',
      }
    : {
        subset: 'Subset',
        rank: 'Rank',
        encode: 'Code',
        stack: 'Stack',
        split: 'Split',
        unstack: 'Unstack',
        sample: 'Random sample',
        convert: 'Convert type',
        merge: 'Merge sheets',
        generate: 'Generate data',
      }
  const parameterLabels: Record<RandomDistribution, [string, string?]> = isSwedish
    ? {
        uniform: ['Minsta värde', 'Största värde'],
        normal: ['Medelvärde', 'Standardavvikelse'],
        binomial: ['Försök', 'Sannolikhet'],
        poisson: ['λ'],
        exponential: ['Hastighet λ'],
        gamma: ['Form α', 'Skala θ'],
        chiSquare: ['Frihetsgrader'],
        f: ['Täljare df', 'Nämnare df'],
        weibull: ['Form k', 'Skala λ'],
        lognormal: ['Log-medelvärde', 'Log-standardavvikelse'],
        studentT: ['Frihetsgrader'],
      }
    : {
        uniform: ['Minimum', 'Maximum'],
        normal: ['Mean', 'Standard deviation'],
        binomial: ['Trials', 'Probability'],
        poisson: ['λ'],
        exponential: ['Rate λ'],
        gamma: ['Shape α', 'Scale θ'],
        chiSquare: ['Degrees of freedom'],
        f: ['Numerator df', 'Denominator df'],
        weibull: ['Shape k', 'Scale λ'],
        lognormal: ['Log mean', 'Log standard deviation'],
        studentT: ['Degrees of freedom'],
      }
  const hasSecondParameter = parameterLabels[randomDistribution][1] !== undefined
  const positiveFirstParameter = [
    'binomial',
    'exponential',
    'gamma',
    'chiSquare',
    'f',
    'weibull',
    'studentT',
  ].includes(randomDistribution)
  const positiveSecondParameter = ['normal', 'gamma', 'f', 'weibull', 'lognormal'].includes(
    randomDistribution,
  )

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content data-operations-dialog">
          <div className="dialog-heading">
            <div>
              <Dialog.Title className="dialog-title">{title}</Dialog.Title>
              <Dialog.Description className="dialog-description">
                {isSwedish
                  ? 'Skapa ett nytt blad eller en ny kolumn från befintliga data.'
                  : 'Create a new worksheet or column from existing data.'}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                className="icon-button"
                type="button"
                aria-label={isSwedish ? 'Stäng dialog' : 'Close dialog'}
              >
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>
          <div className="data-operation-tabs" role="tablist" aria-label={title}>
            {(Object.keys(labels) as Operation[]).map((item) => (
              <button
                key={item}
                className="data-operation-tab"
                type="button"
                role="tab"
                aria-selected={operation === item}
                onClick={() => {
                  setOperation(item)
                  setError('')
                }}
              >
                {labels[item]}
              </button>
            ))}
          </div>
          <form onSubmit={submit}>
            {operation === 'subset' && (
              <div className="data-condition-list">
                {conditions.length > 1 && (
                  <label className="dialog-field">
                    <span>{isSwedish ? 'Kombinera villkor' : 'Combine conditions'}</span>
                    <select
                      value={conditionLogic}
                      onChange={(event) => setConditionLogic(event.target.value as ConditionLogic)}
                    >
                      <option value="and">AND</option>
                      <option value="or">OR</option>
                    </select>
                  </label>
                )}
                {conditions.map((condition, index) => {
                  const source = columns.find((column) => column.id === condition.columnId)
                  const isOrderedColumn = source?.type === 'numeric' || source?.type === 'date'
                  return (
                    <div className="data-condition-row" key={index}>
                      <label className="dialog-field">
                        <span>{isSwedish ? 'Kolumn' : 'Column'}</span>
                        <select
                          value={condition.columnId}
                          onChange={(event) => {
                            const nextColumn = columns.find(
                              (column) => column.id === event.target.value,
                            )
                            const orderedOperators: SubsetOperator[] = [
                              'greaterThan',
                              'greaterOrEqual',
                              'lessThan',
                              'lessOrEqual',
                              'between',
                            ]
                            setConditions((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      columnId: event.target.value,
                                      operator:
                                        nextColumn?.type === 'text' &&
                                        orderedOperators.includes(item.operator)
                                          ? 'equals'
                                          : item.operator,
                                    }
                                  : item,
                              ),
                            )
                          }}
                        >
                          {columns.map((column) => (
                            <option key={column.id} value={column.id}>
                              {column.id} · {column.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="dialog-field">
                        <span>{isSwedish ? 'Villkor' : 'Condition'}</span>
                        <select
                          value={condition.operator}
                          onChange={(event) =>
                            setConditions((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, operator: event.target.value as SubsetOperator }
                                  : item,
                              ),
                            )
                          }
                        >
                          <option value="equals">{isSwedish ? 'Är lika med' : 'Equals'}</option>
                          <option value="notEquals">
                            {isSwedish ? 'Är inte lika med' : 'Does not equal'}
                          </option>
                          <option value="contains">{isSwedish ? 'Innehåller' : 'Contains'}</option>
                          <option value="isMissing">
                            {isSwedish ? 'Är saknad' : 'Is missing'}
                          </option>
                          <option value="isNotMissing">
                            {isSwedish ? 'Är inte saknad' : 'Is not missing'}
                          </option>
                          {isOrderedColumn && (
                            <>
                              <option value="greaterThan">
                                {isSwedish ? 'Större än' : 'Greater than'}
                              </option>
                              <option value="greaterOrEqual">
                                {isSwedish ? 'Minst' : 'At least'}
                              </option>
                              <option value="lessThan">
                                {isSwedish ? 'Mindre än' : 'Less than'}
                              </option>
                              <option value="lessOrEqual">{isSwedish ? 'Högst' : 'At most'}</option>
                              <option value="between">{isSwedish ? 'Mellan' : 'Between'}</option>
                            </>
                          )}
                        </select>
                      </label>
                      {!condition.operator.startsWith('is') && (
                        <label className="dialog-field">
                          <span>{isSwedish ? 'Värde' : 'Value'}</span>
                          <input
                            value={condition.criterion}
                            onChange={(event) =>
                              setConditions((current) =>
                                current.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, criterion: event.target.value }
                                    : item,
                                ),
                              )
                            }
                          />
                        </label>
                      )}
                      {condition.operator === 'between' && (
                        <label className="dialog-field">
                          <span>{isSwedish ? 'Till och med' : 'Through'}</span>
                          <input
                            value={condition.upperCriterion}
                            onChange={(event) =>
                              setConditions((current) =>
                                current.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, upperCriterion: event.target.value }
                                    : item,
                                ),
                              )
                            }
                          />
                        </label>
                      )}
                      <button
                        className="icon-button condition-remove"
                        type="button"
                        disabled={conditions.length === 1}
                        aria-label={
                          isSwedish
                            ? `Ta bort villkor ${index + 1}`
                            : `Remove condition ${index + 1}`
                        }
                        title={isSwedish ? 'Ta bort villkor' : 'Remove condition'}
                        onClick={() =>
                          setConditions((current) =>
                            current.filter((_, itemIndex) => itemIndex !== index),
                          )
                        }
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )
                })}
                <button
                  className="dialog-button secondary add-condition"
                  type="button"
                  onClick={() =>
                    setConditions((current) => [
                      ...current,
                      {
                        columnId: columns[0]?.id ?? '',
                        operator: 'equals',
                        criterion: '',
                        upperCriterion: '',
                      },
                    ])
                  }
                  disabled={columns.length === 0}
                >
                  <Plus size={14} />
                  {isSwedish ? 'Lägg till villkor' : 'Add condition'}
                </button>
              </div>
            )}
            {operation === 'split' && (
              <label className="dialog-field">
                <span>{isSwedish ? 'Dela efter kolumn' : 'Split by column'}</span>
                <select value={columnId} onChange={(event) => setColumnId(event.target.value)}>
                  {columns.map((column) => (
                    <option key={column.id} value={column.id}>
                      {column.id} · {column.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {operation === 'rank' && (
              <>
                <label className="dialog-field">
                  <span>{isSwedish ? 'Numerisk kolumn' : 'Numeric column'}</span>
                  <select value={columnId} onChange={(event) => setColumnId(event.target.value)}>
                    {numericColumns.map((column) => (
                      <option key={column.id} value={column.id}>
                        {column.id} · {column.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="dialog-field">
                  <span>{isSwedish ? 'Hantering av lika värden' : 'Tie handling'}</span>
                  <select
                    value={tieMethod}
                    onChange={(event) => setTieMethod(event.target.value as TieMethod)}
                  >
                    <option value="average">{isSwedish ? 'Medelrang' : 'Average rank'}</option>
                    <option value="minimum">{isSwedish ? 'Lägsta rang' : 'Minimum rank'}</option>
                    <option value="maximum">{isSwedish ? 'Högsta rang' : 'Maximum rank'}</option>
                  </select>
                </label>
              </>
            )}
            {operation === 'encode' && (
              <label className="dialog-field">
                <span>{isSwedish ? 'Kategorikolumn' : 'Category column'}</span>
                <select value={columnId} onChange={(event) => setColumnId(event.target.value)}>
                  {columns.map((column) => (
                    <option key={column.id} value={column.id}>
                      {column.id} · {column.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {operation === 'convert' && (
              <div className="data-operation-grid">
                <label className="dialog-field">
                  <span>{isSwedish ? 'Källkolumn' : 'Source column'}</span>
                  <select value={columnId} onChange={(event) => setColumnId(event.target.value)}>
                    {columns.map((column) => (
                      <option key={column.id} value={column.id}>
                        {column.id} · {column.name} ({column.type})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="dialog-field">
                  <span>{isSwedish ? 'Ny typ' : 'Target type'}</span>
                  <select
                    value={targetType}
                    onChange={(event) => setTargetType(event.target.value as SheetColumn['type'])}
                  >
                    <option value="text">{isSwedish ? 'Text' : 'Text'}</option>
                    <option value="numeric">{isSwedish ? 'Numerisk' : 'Numeric'}</option>
                    <option value="date">{isSwedish ? 'Datum' : 'Date'}</option>
                  </select>
                </label>
              </div>
            )}
            {operation === 'stack' && (
              <fieldset className="data-operation-columns">
                <legend>
                  {isSwedish ? 'Välj minst två kolumner' : 'Select at least two columns'}
                </legend>
                {columns.map((column) => (
                  <label key={column.id}>
                    <input
                      type="checkbox"
                      checked={selectedColumnIds.includes(column.id)}
                      onChange={(event) =>
                        setSelectedColumnIds((current) =>
                          event.target.checked
                            ? [...current, column.id]
                            : current.filter((id) => id !== column.id),
                        )
                      }
                    />
                    <span>
                      {column.id} · {column.name}
                    </span>
                  </label>
                ))}
              </fieldset>
            )}
            {operation === 'unstack' && (
              <div className="data-operation-grid">
                <label className="dialog-field">
                  <span>{isSwedish ? 'Värdekolumn' : 'Value column'}</span>
                  <select
                    value={valueColumnId}
                    onChange={(event) => setValueColumnId(event.target.value)}
                  >
                    {columns.map((column) => (
                      <option key={column.id} value={column.id}>
                        {column.id} · {column.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="dialog-field">
                  <span>{isSwedish ? 'Källkolumn' : 'Source column'}</span>
                  <select
                    value={sourceColumnId}
                    onChange={(event) => setSourceColumnId(event.target.value)}
                  >
                    {columns.map((column) => (
                      <option key={column.id} value={column.id}>
                        {column.id} · {column.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
            {operation === 'sample' && (
              <div className="data-operation-grid">
                <label className="dialog-field">
                  <span>{isSwedish ? 'Antal rader' : 'Number of rows'}</span>
                  <input
                    type="number"
                    min="1"
                    max={rows.length}
                    step="1"
                    value={sampleSize}
                    onChange={(event) => setSampleSize(event.target.value)}
                    required
                  />
                </label>
                <label className="dialog-field">
                  <span>Seed</span>
                  <input
                    type="number"
                    min="0"
                    max="4294967295"
                    step="1"
                    value={randomSeed}
                    onChange={(event) => setRandomSeed(event.target.value)}
                    required
                  />
                </label>
              </div>
            )}
            {operation === 'generate' && (
              <>
                <div className="data-operation-grid">
                  <label className="dialog-field">
                    <span>{isSwedish ? 'Antal värden' : 'Number of values'}</span>
                    <input
                      type="number"
                      min="1"
                      max="500000"
                      step="1"
                      value={randomCount}
                      onChange={(event) => setRandomCount(event.target.value)}
                      required
                    />
                  </label>
                  <label className="dialog-field">
                    <span>Seed</span>
                    <input
                      type="number"
                      min="0"
                      max="4294967295"
                      step="1"
                      value={randomSeed}
                      onChange={(event) => setRandomSeed(event.target.value)}
                      required
                    />
                  </label>
                </div>
                <label className="dialog-field">
                  <span>{isSwedish ? 'Fördelning' : 'Distribution'}</span>
                  <select
                    value={randomDistribution}
                    onChange={(event) => {
                      const nextDistribution = event.target.value as RandomDistribution
                      setRandomDistribution(nextDistribution)
                      setRandomParameter1(randomDistributionDefaults[nextDistribution][0])
                      setRandomParameter2(randomDistributionDefaults[nextDistribution][1])
                    }}
                  >
                    <option value="uniform">Uniform</option>
                    <option value="normal">Normal</option>
                    <option value="binomial">Binomial</option>
                    <option value="poisson">Poisson</option>
                    <option value="exponential">Exponential</option>
                    <option value="gamma">Gamma</option>
                    <option value="chiSquare">{isSwedish ? 'Chi-två' : 'Chi-square'}</option>
                    <option value="f">F</option>
                    <option value="weibull">Weibull</option>
                    <option value="lognormal">Lognormal</option>
                    <option value="studentT">Student t</option>
                  </select>
                </label>
                <div className="data-operation-grid">
                  <label className="dialog-field">
                    <span>{parameterLabels[randomDistribution][0]}</span>
                    <input
                      type="number"
                      min={
                        positiveFirstParameter
                          ? randomDistribution === 'binomial'
                            ? '1'
                            : '0.000001'
                          : randomDistribution === 'poisson'
                            ? '0'
                            : undefined
                      }
                      max={
                        randomDistribution === 'binomial'
                          ? '10000'
                          : randomDistribution === 'poisson'
                            ? '50'
                            : undefined
                      }
                      step={randomDistribution === 'binomial' ? '1' : 'any'}
                      value={randomParameter1}
                      onChange={(event) => setRandomParameter1(event.target.value)}
                      required
                    />
                  </label>
                  {hasSecondParameter && (
                    <label className="dialog-field">
                      <span>{parameterLabels[randomDistribution][1]}</span>
                      <input
                        type="number"
                        min={
                          randomDistribution === 'binomial'
                            ? 0
                            : positiveSecondParameter
                              ? '0.000001'
                              : undefined
                        }
                        max={randomDistribution === 'binomial' ? 1 : undefined}
                        step="any"
                        value={randomParameter2}
                        onChange={(event) => setRandomParameter2(event.target.value)}
                        required
                      />
                    </label>
                  )}
                </div>
                <label className="dialog-field">
                  <span>{isSwedish ? 'Kolumnnamn' : 'Column name'}</span>
                  <input
                    value={randomColumnName}
                    maxLength={64}
                    onChange={(event) => setRandomColumnName(event.target.value)}
                    required
                  />
                </label>
              </>
            )}
            {operation === 'merge' && (
              <fieldset className="data-operation-columns">
                <legend>
                  {isSwedish ? 'Välj minst två arbetsblad' : 'Select at least two worksheets'}
                </legend>
                {worksheets.map((worksheet) => (
                  <label key={worksheet.id}>
                    <input
                      type="checkbox"
                      checked={selectedWorksheetIds.includes(worksheet.id)}
                      onChange={(event) =>
                        setSelectedWorksheetIds((current) =>
                          event.target.checked
                            ? [...current, worksheet.id]
                            : current.filter((id) => id !== worksheet.id),
                        )
                      }
                    />
                    <span>
                      {worksheet.name} ({worksheet.rows.length})
                    </span>
                  </label>
                ))}
              </fieldset>
            )}
            <label className="dialog-field">
              <span>
                {operation === 'rank' || operation === 'encode' || operation === 'convert'
                  ? isSwedish
                    ? 'Ny kolumns namn'
                    : 'New column name'
                  : operation === 'subset' ||
                      operation === 'stack' ||
                      operation === 'split' ||
                      operation === 'unstack' ||
                      operation === 'sample' ||
                      operation === 'merge' ||
                      operation === 'generate'
                    ? isSwedish
                      ? 'Nytt arbetsbladsnamn'
                      : 'New worksheet name'
                    : ''}
              </span>
              <input
                value={outputName}
                maxLength={64}
                onChange={(event) => setOutputName(event.target.value)}
                placeholder={isSwedish ? 'Lämna tomt för standardnamn' : 'Leave blank for default'}
              />
            </label>
            {error && (
              <p className="dialog-error" role="alert">
                {error}
              </p>
            )}
            <div className="dialog-actions">
              <Dialog.Close asChild>
                <button className="dialog-button secondary" type="button">
                  {isSwedish ? 'Avbryt' : 'Cancel'}
                </button>
              </Dialog.Close>
              <button
                className="dialog-button primary"
                type="submit"
                disabled={columns.length === 0}
              >
                {isSwedish ? 'Kör' : 'Run'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
