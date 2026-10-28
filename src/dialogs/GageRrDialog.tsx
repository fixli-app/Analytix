import { useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { SheetColumn } from '../store/workbook'

interface GageRrDialogProps {
  open: boolean
  initialPartColumn: string
  initialOperatorColumn: string
  numericColumns: SheetColumn[]
  categoryColumns: SheetColumn[]
  language: string
  onOpenChange: (open: boolean) => void
  onSubmit: (
    partColumnId: string,
    operatorColumnId: string,
    measurementColumnId: string,
    tolerance: number | null,
  ) => void
}

export function GageRrDialog({
  open,
  initialPartColumn,
  initialOperatorColumn,
  numericColumns,
  categoryColumns,
  language,
  onOpenChange,
  onSubmit,
}: GageRrDialogProps) {
  const [partColumnId, setPartColumnId] = useState(initialPartColumn)
  const [operatorColumnId, setOperatorColumnId] = useState(initialOperatorColumn)
  const [measurementColumnId, setMeasurementColumnId] = useState(numericColumns[0]?.id ?? '')
  const [tolerance, setTolerance] = useState('')
  const [error, setError] = useState('')
  const isSwedish = language === 'sv'
  const selectedPartColumn = selectAvailable(partColumnId, categoryColumns)
  const selectedOperatorColumn = selectAvailable(operatorColumnId, categoryColumns)
  const selectedMeasurementColumn = selectAvailable(measurementColumnId, numericColumns)
  const canSubmit =
    Boolean(selectedPartColumn && selectedOperatorColumn && selectedMeasurementColumn) &&
    selectedPartColumn !== selectedOperatorColumn

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) return
    const toleranceValue = tolerance.trim() === '' ? null : Number(tolerance)
    if (toleranceValue !== null && (!Number.isFinite(toleranceValue) || toleranceValue <= 0)) {
      setError(isSwedish ? 'Tolerans måste vara större än 0.' : 'Tolerance must be greater than 0.')
      return
    }
    setError('')
    onSubmit(selectedPartColumn, selectedOperatorColumn, selectedMeasurementColumn, toleranceValue)
    onOpenChange(false)
  }

  function options(columns: SheetColumn[]) {
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
        <Dialog.Content className="dialog-content">
          <div className="dialog-heading">
            <div>
              <Dialog.Title className="dialog-title">Gage R&amp;R (crossed)</Dialog.Title>
              <Dialog.Description className="dialog-description">
                {isSwedish
                  ? 'Välj del, operatör och mätvärde. Varje del-operatörskombination måste ha lika många kompletta replikat.'
                  : 'Select part, operator, and measurement. Every part-operator combination must have the same number of complete replicates.'}
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
              <span>{isSwedish ? 'Del / prov' : 'Part'}</span>
              <select
                value={selectedPartColumn}
                onChange={(event) => setPartColumnId(event.target.value)}
              >
                {options(categoryColumns)}
              </select>
            </label>
            <label className="dialog-field">
              <span>{isSwedish ? 'Operatör / bedömare' : 'Operator / appraiser'}</span>
              <select
                value={selectedOperatorColumn}
                onChange={(event) => setOperatorColumnId(event.target.value)}
              >
                {options(categoryColumns)}
              </select>
            </label>
            <label className="dialog-field">
              <span>{isSwedish ? 'Mätvärde' : 'Measurement'}</span>
              <select
                value={selectedMeasurementColumn}
                onChange={(event) => setMeasurementColumnId(event.target.value)}
              >
                {options(numericColumns)}
              </select>
            </label>
            <label className="dialog-field">
              <span>{isSwedish ? 'Tolerans (valfri)' : 'Tolerance (optional)'}</span>
              <input
                type="number"
                min="0.000001"
                step="any"
                value={tolerance}
                onChange={(event) => setTolerance(event.target.value)}
              />
            </label>
            {error && (
              <p className="quality-error" role="alert">
                {error}
              </p>
            )}
            <p className="session-caption">
              {isSwedish
                ? 'Balanserad crossed ANOVA med interaktion. Studien kräver minst 2 delar, 2 operatörer och 2 replikat per kombination. Normalitet och oberoende testas inte.'
                : 'Balanced crossed ANOVA with interaction. Requires at least 2 parts, 2 operators, and 2 replicates per combination. Normality and independence are not tested.'}
            </p>
            <div className="dialog-actions">
              <Dialog.Close asChild>
                <button className="dialog-button secondary" type="button">
                  {isSwedish ? 'Avbryt' : 'Cancel'}
                </button>
              </Dialog.Close>
              <button className="dialog-button primary" type="submit" disabled={!canSubmit}>
                {isSwedish ? 'Kör Gage R&R' : 'Run Gage R&R'}
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
