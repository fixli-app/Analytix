import { useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { SheetColumn } from '../store/workbook'

interface GageRrDialogProps {
  open: boolean
  initialPartColumn: string
  initialOperatorColumn: string
  initialSpecimenColumn: string
  numericColumns: SheetColumn[]
  categoryColumns: SheetColumn[]
  language: string
  onOpenChange: (open: boolean) => void
  onSubmit: (request: GageRrRequest) => void
}

export type GageRrRequest =
  | {
      kind: 'crossed'
      partColumnId: string
      operatorColumnId: string
      measurementColumnId: string
      tolerance: number | null
    }
  | {
      kind: 'destructive'
      batchColumnId: string
      operatorColumnId: string
      specimenColumnId: string
      measurementColumnId: string
      tolerance: number | null
    }
  | {
      kind: 'expanded'
      partColumnId: string
      operatorColumnId: string
      conditionColumnId: string
      measurementColumnId: string
      tolerance: number | null
    }

export function GageRrDialog({
  open,
  initialPartColumn,
  initialOperatorColumn,
  initialSpecimenColumn,
  numericColumns,
  categoryColumns,
  language,
  onOpenChange,
  onSubmit,
}: GageRrDialogProps) {
  const [mode, setMode] = useState<'crossed' | 'destructive' | 'expanded'>('crossed')
  const [partColumnId, setPartColumnId] = useState(initialPartColumn)
  const [operatorColumnId, setOperatorColumnId] = useState(initialOperatorColumn)
  const [specimenColumnId, setSpecimenColumnId] = useState(initialSpecimenColumn)
  const [conditionColumnId, setConditionColumnId] = useState(
    categoryColumns[2]?.id ?? categoryColumns[0]?.id ?? '',
  )
  const [measurementColumnId, setMeasurementColumnId] = useState(numericColumns[0]?.id ?? '')
  const [tolerance, setTolerance] = useState('')
  const [error, setError] = useState('')
  const isSwedish = language === 'sv'
  const selectedPartColumn = selectAvailable(partColumnId, categoryColumns)
  const selectedOperatorColumn = selectAvailable(operatorColumnId, categoryColumns)
  const selectedSpecimenColumn = selectAvailable(specimenColumnId, categoryColumns)
  const selectedMeasurementColumn = selectAvailable(measurementColumnId, numericColumns)
  const selectedConditionColumn = selectAvailable(conditionColumnId, categoryColumns)
  const canSubmit =
    mode === 'crossed'
      ? Boolean(selectedPartColumn && selectedOperatorColumn && selectedMeasurementColumn) &&
        selectedPartColumn !== selectedOperatorColumn
      : mode === 'destructive'
        ? Boolean(
            selectedPartColumn &&
            selectedOperatorColumn &&
            selectedSpecimenColumn &&
            selectedMeasurementColumn,
          ) &&
          new Set([selectedPartColumn, selectedOperatorColumn, selectedSpecimenColumn]).size === 3
        : Boolean(
            selectedPartColumn &&
            selectedOperatorColumn &&
            selectedConditionColumn &&
            selectedMeasurementColumn,
          ) &&
          new Set([selectedPartColumn, selectedOperatorColumn, selectedConditionColumn]).size === 3

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) return
    const toleranceValue = tolerance.trim() === '' ? null : Number(tolerance)
    if (toleranceValue !== null && (!Number.isFinite(toleranceValue) || toleranceValue <= 0)) {
      setError(isSwedish ? 'Tolerans måste vara större än 0.' : 'Tolerance must be greater than 0.')
      return
    }
    setError('')
    if (mode === 'destructive') {
      onSubmit({
        kind: mode,
        batchColumnId: selectedPartColumn,
        operatorColumnId: selectedOperatorColumn,
        specimenColumnId: selectedSpecimenColumn,
        measurementColumnId: selectedMeasurementColumn,
        tolerance: toleranceValue,
      })
    } else if (mode === 'expanded') {
      onSubmit({
        kind: mode,
        partColumnId: selectedPartColumn,
        operatorColumnId: selectedOperatorColumn,
        conditionColumnId: selectedConditionColumn,
        measurementColumnId: selectedMeasurementColumn,
        tolerance: toleranceValue,
      })
    } else {
      onSubmit({
        kind: mode,
        partColumnId: selectedPartColumn,
        operatorColumnId: selectedOperatorColumn,
        measurementColumnId: selectedMeasurementColumn,
        tolerance: toleranceValue,
      })
    }
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
              <Dialog.Title className="dialog-title">
                {mode === 'crossed'
                  ? 'Gage R&R (crossed)'
                  : mode === 'destructive'
                    ? 'Gage R&R (destructive)'
                    : 'Gage R&R (expanded)'}
              </Dialog.Title>
              <Dialog.Description className="dialog-description">
                {isSwedish
                  ? mode === 'crossed'
                    ? 'Välj del, operatör och mätvärde. Varje del-operatörskombination måste ha lika många kompletta replikat.'
                    : 'Välj homogen batch, operatör, unikt destruktivt prov-ID och mätvärde.'
                  : mode === 'crossed'
                    ? 'Select part, operator, and measurement. Every part-operator combination must have the same number of complete replicates.'
                    : mode === 'destructive'
                      ? 'Select homogeneous batch, operator, unique destructive specimen ID, and measurement.'
                      : 'Select part, operator, an additional factor, and measurement for a balanced three-factor design.'}
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
          <div className="data-operation-tabs" role="tablist" aria-label="Gage R&R design">
            <button
              className="data-operation-tab"
              type="button"
              role="tab"
              aria-selected={mode === 'crossed'}
              onClick={() => setMode('crossed')}
            >
              Crossed
            </button>
            <button
              className="data-operation-tab"
              type="button"
              role="tab"
              aria-selected={mode === 'expanded'}
              onClick={() => setMode('expanded')}
            >
              {isSwedish ? 'Expanded' : 'Expanded'}
            </button>
            <button
              className="data-operation-tab"
              type="button"
              role="tab"
              aria-selected={mode === 'destructive'}
              onClick={() => setMode('destructive')}
            >
              {isSwedish ? 'Destruktiv' : 'Destructive'}
            </button>
          </div>
          <form onSubmit={submit}>
            <label className="dialog-field">
              <span>
                {mode === 'destructive'
                  ? isSwedish
                    ? 'Homogen batch / grupp'
                    : 'Homogeneous batch / group'
                  : isSwedish
                    ? 'Del / prov'
                    : 'Part'}
              </span>
              <select
                value={selectedPartColumn}
                onChange={(event) => setPartColumnId(event.target.value)}
              >
                {options(categoryColumns)}
              </select>
            </label>
            {mode === 'destructive' && (
              <label className="dialog-field">
                <span>
                  {isSwedish ? 'Unikt destruktivt prov-ID' : 'Unique destructive specimen ID'}
                </span>
                <select
                  value={selectedSpecimenColumn}
                  onChange={(event) => setSpecimenColumnId(event.target.value)}
                >
                  {options(categoryColumns)}
                </select>
              </label>
            )}
            {mode === 'expanded' && (
              <label className="dialog-field">
                <span>{isSwedish ? 'Extra faktor / dag' : 'Additional factor / day'}</span>
                <select
                  value={selectedConditionColumn}
                  onChange={(event) => setConditionColumnId(event.target.value)}
                >
                  {options(categoryColumns)}
                </select>
              </label>
            )}
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
                ? mode === 'crossed'
                  ? 'Balanserad crossed ANOVA med interaktion. Minst 2 delar, 2 operatörer och 2 replikat per cell krävs. Normalitet och oberoende testas inte.'
                  : mode === 'destructive'
                    ? 'Varje fysisk provdel mäts en gång. Minst 2 batcher, operatörer och unika prov per batch-operatörscell krävs. Inom-cell-residualen blandar provvariation med mätfel.'
                    : 'Balanserad slumpmodell med del, operatör, extra faktor och alla interaktioner. Minst två nivåer och två replikat per cell krävs.'
                : mode === 'crossed'
                  ? 'Balanced crossed ANOVA with interaction. Requires at least 2 parts, 2 operators, and 2 replicates per cell. Normality and independence are not tested.'
                  : mode === 'destructive'
                    ? 'Each physical specimen is measured once. Requires at least 2 batches, operators, and unique specimens per batch-operator cell. Within-cell residual combines specimen variation and measurement error.'
                    : 'Balanced random-effects model with part, operator, an additional factor, and all interactions. Requires at least two levels and two replicates per cell.'}
            </p>
            <div className="dialog-actions">
              <Dialog.Close asChild>
                <button className="dialog-button secondary" type="button">
                  {isSwedish ? 'Avbryt' : 'Cancel'}
                </button>
              </Dialog.Close>
              <button className="dialog-button primary" type="submit" disabled={!canSubmit}>
                {mode === 'destructive'
                  ? isSwedish
                    ? 'Kör destruktiv Gage R&R'
                    : 'Run destructive Gage R&R'
                  : mode === 'expanded'
                    ? isSwedish
                      ? 'Kör Expanded Gage R&R'
                      : 'Run Expanded Gage R&R'
                    : isSwedish
                      ? 'Kör Gage R&R'
                      : 'Run Gage R&R'}
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
