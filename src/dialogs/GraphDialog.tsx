import { useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { SheetColumn } from '../store/workbook'
import type { GraphKind } from '../charts/graphData'

export interface GraphSelection {
  kind: GraphKind
  valueColumnId?: string
  xColumnId?: string
  yColumnId?: string
  categoryColumnId?: string
}

interface GraphDialogProps {
  open: boolean
  initialColumn: string
  numericColumns: SheetColumn[]
  categoryColumns: SheetColumn[]
  language: string
  onOpenChange: (open: boolean) => void
  onSubmit: (selection: GraphSelection) => void
}

const graphKinds: GraphKind[] = [
  'histogram',
  'boxplot',
  'individual',
  'scatter',
  'bar',
  'pareto',
  'ecdf',
  'timeSeries',
]

export function GraphDialog({
  open,
  initialColumn,
  numericColumns,
  categoryColumns,
  language,
  onOpenChange,
  onSubmit,
}: GraphDialogProps) {
  const [kind, setKind] = useState<GraphKind>('histogram')
  const [valueColumnId, setValueColumnId] = useState(initialColumn)
  const [xColumnId, setXColumnId] = useState(initialColumn)
  const [yColumnId, setYColumnId] = useState(numericColumns[1]?.id ?? initialColumn)
  const [categoryColumnId, setCategoryColumnId] = useState('')
  const isSwedish = language === 'sv'
  const selectedValueColumn = selectAvailable(valueColumnId, numericColumns)
  const selectedXColumn = selectAvailable(xColumnId, numericColumns)
  const selectedYColumn = selectAvailable(yColumnId, numericColumns)
  const selectedCategoryColumn = selectAvailable(categoryColumnId, categoryColumns)
  const selectedGroupColumn = categoryColumns.some((column) => column.id === categoryColumnId)
    ? categoryColumnId
    : ''
  const usesNumericValue = !['scatter', 'bar', 'pareto'].includes(kind)
  const usesCategory = ['boxplot', 'individual'].includes(kind)
  const canSubmit =
    kind === 'scatter'
      ? numericColumns.length >= 2 && selectedXColumn !== selectedYColumn
      : kind === 'bar' || kind === 'pareto'
        ? Boolean(selectedCategoryColumn)
        : Boolean(selectedValueColumn)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) return
    onSubmit({
      kind,
      ...(usesNumericValue ? { valueColumnId: selectedValueColumn } : {}),
      ...(kind === 'scatter' ? { xColumnId: selectedXColumn, yColumnId: selectedYColumn } : {}),
      ...(kind === 'bar' || kind === 'pareto' || usesCategory
        ? {
            categoryColumnId: usesCategory
              ? selectedGroupColumn || undefined
              : selectedCategoryColumn,
          }
        : {}),
    })
    onOpenChange(false)
  }

  function columnOptions(columns: SheetColumn[]) {
    return columns.map((column) => (
      <option value={column.id} key={column.id}>
        {column.id} · {column.name}
      </option>
    ))
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content graph-dialog">
          <div className="dialog-heading">
            <div>
              <Dialog.Title className="dialog-title">
                {isSwedish ? 'Skapa diagram' : 'Create graph'}
              </Dialog.Title>
              <Dialog.Description className="dialog-description">
                {isSwedish
                  ? 'Välj diagramtyp och variabler från arbetsbladet.'
                  : 'Choose a graph type and worksheet variables.'}
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
          <form onSubmit={submit}>
            <label className="dialog-field">
              <span>{isSwedish ? 'Diagramtyp' : 'Graph type'}</span>
              <select value={kind} onChange={(event) => setKind(event.target.value as GraphKind)}>
                {graphKinds.map((graphKind) => (
                  <option value={graphKind} key={graphKind}>
                    {graphKindLabel(graphKind, isSwedish)}
                  </option>
                ))}
              </select>
            </label>
            {kind === 'scatter' ? (
              <>
                <label className="dialog-field">
                  <span>{isSwedish ? 'X-variabel' : 'X variable'}</span>
                  <select
                    value={selectedXColumn}
                    onChange={(event) => setXColumnId(event.target.value)}
                  >
                    {columnOptions(numericColumns)}
                  </select>
                </label>
                <label className="dialog-field">
                  <span>{isSwedish ? 'Y-variabel' : 'Y variable'}</span>
                  <select
                    value={selectedYColumn}
                    onChange={(event) => setYColumnId(event.target.value)}
                  >
                    {columnOptions(numericColumns)}
                  </select>
                </label>
              </>
            ) : usesNumericValue ? (
              <label className="dialog-field">
                <span>{isSwedish ? 'Numerisk variabel' : 'Numeric variable'}</span>
                <select
                  value={selectedValueColumn}
                  onChange={(event) => setValueColumnId(event.target.value)}
                >
                  {columnOptions(numericColumns)}
                </select>
              </label>
            ) : (
              <label className="dialog-field">
                <span>{isSwedish ? 'Kategorivariabel' : 'Category variable'}</span>
                <select
                  value={selectedGroupColumn}
                  onChange={(event) => setCategoryColumnId(event.target.value)}
                >
                  {columnOptions(categoryColumns)}
                </select>
              </label>
            )}
            {usesCategory && (
              <label className="dialog-field">
                <span>{isSwedish ? 'Gruppera efter (valfritt)' : 'Group by (optional)'}</span>
                <select
                  value={selectedCategoryColumn}
                  onChange={(event) => setCategoryColumnId(event.target.value)}
                >
                  <option value="">{isSwedish ? 'Ingen gruppering' : 'No grouping'}</option>
                  {columnOptions(categoryColumns)}
                </select>
              </label>
            )}
            <p className="session-caption">
              {isSwedish
                ? 'Saknade observationer utelämnas; diagram visar data men testar inte modellantaganden.'
                : 'Missing observations are omitted; charts display data but do not test model assumptions.'}
            </p>
            <div className="dialog-actions">
              <Dialog.Close asChild>
                <button className="dialog-button secondary" type="button">
                  {isSwedish ? 'Avbryt' : 'Cancel'}
                </button>
              </Dialog.Close>
              <button className="dialog-button primary" type="submit" disabled={!canSubmit}>
                {isSwedish ? 'Skapa diagram' : 'Create graph'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function selectAvailable(value: string, columns: SheetColumn[]): string {
  return columns.some((column) => column.id === value) ? value : (columns[0]?.id ?? '')
}

function graphKindLabel(kind: GraphKind, isSwedish: boolean): string {
  const labels: Record<GraphKind, [string, string]> = {
    histogram: ['Histogram', 'Histogram'],
    boxplot: ['Lådagram', 'Boxplot'],
    individual: ['Individvärdediagram', 'Individual value plot'],
    scatter: ['Punktdiagram', 'Scatterplot'],
    bar: ['Stapeldiagram', 'Bar chart'],
    pareto: ['Pareto', 'Pareto'],
    ecdf: ['Empirisk fördelningsfunktion', 'Empirical CDF'],
    timeSeries: ['Tidsseriediagram', 'Time series plot'],
  }
  return labels[kind][isSwedish ? 0 : 1]
}
