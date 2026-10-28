import { useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { SheetColumn } from '../store/workbook'

interface ProcessCapabilityDialogProps {
  open: boolean
  initialColumn: string
  columns: SheetColumn[]
  language: string
  onOpenChange: (open: boolean) => void
  onSubmit: (
    columnId: string,
    lowerSpecLimit: number,
    upperSpecLimit: number,
    target: number | null,
  ) => void
}

export function ProcessCapabilityDialog({
  open,
  initialColumn,
  columns,
  language,
  onOpenChange,
  onSubmit,
}: ProcessCapabilityDialogProps) {
  const [columnId, setColumnId] = useState(initialColumn)
  const [lowerSpecLimit, setLowerSpecLimit] = useState('')
  const [upperSpecLimit, setUpperSpecLimit] = useState('')
  const [target, setTarget] = useState('')
  const [validationMessage, setValidationMessage] = useState('')
  const isSwedish = language === 'sv'
  const selectedColumnId = columns.some((column) => column.id === columnId)
    ? columnId
    : (columns[0]?.id ?? '')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const lower = Number(lowerSpecLimit)
    const upper = Number(upperSpecLimit)
    const targetValue = target.trim() === '' ? null : Number(target)
    if (!selectedColumnId || !Number.isFinite(lower) || !Number.isFinite(upper)) return
    if (lower >= upper) {
      setValidationMessage(
        isSwedish
          ? 'Nedre specifikationsgränsen måste vara lägre än den övre.'
          : 'The lower specification limit must be less than the upper limit.',
      )
      return
    }
    if (targetValue !== null && !Number.isFinite(targetValue)) return
    setValidationMessage('')
    onSubmit(selectedColumnId, lower, upper, targetValue)
    onOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <div className="dialog-heading">
            <div>
              <Dialog.Title className="dialog-title">
                {isSwedish
                  ? 'Processkapabilitet (normal, individdata)'
                  : 'Process capability (normal, individual data)'}
              </Dialog.Title>
              <Dialog.Description className="dialog-description">
                {isSwedish
                  ? 'Ange specifikationsgränser. Raderna behandlas i aktuell ordning som individmätningar.'
                  : 'Enter specification limits. Rows are treated in their current order as individual measurements.'}
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
              <span>{isSwedish ? 'Numerisk kolumn' : 'Numeric column'}</span>
              <select
                value={selectedColumnId}
                onChange={(event) => setColumnId(event.target.value)}
              >
                {columns.map((column) => (
                  <option value={column.id} key={column.id}>
                    {column.id} · {column.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="dialog-field">
              <span>
                {isSwedish ? 'Nedre specifikationsgräns (LSL)' : 'Lower specification limit (LSL)'}
              </span>
              <input
                type="number"
                step="any"
                value={lowerSpecLimit}
                onChange={(event) => setLowerSpecLimit(event.target.value)}
                required
              />
            </label>
            <label className="dialog-field">
              <span>
                {isSwedish ? 'Övre specifikationsgräns (USL)' : 'Upper specification limit (USL)'}
              </span>
              <input
                type="number"
                step="any"
                value={upperSpecLimit}
                onChange={(event) => setUpperSpecLimit(event.target.value)}
                required
              />
            </label>
            <label className="dialog-field">
              <span>{isSwedish ? 'Målvärde för Cpm (valfritt)' : 'Target for Cpm (optional)'}</span>
              <input
                type="number"
                step="any"
                value={target}
                onChange={(event) => setTarget(event.target.value)}
              />
            </label>
            {validationMessage && (
              <p className="session-caption" role="alert">
                {validationMessage}
              </p>
            )}
            <p className="session-caption">
              {isSwedish
                ? 'Within-s skattas från genomsnittlig rörlig variationsbredd (MR̄/1,128). Processstabilitet och normalitet kontrolleras inte.'
                : 'Within s is estimated from average moving range (MR̄/1.128). Process stability and normality are not checked.'}
            </p>
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
                {isSwedish ? 'Beräkna kapabilitet' : 'Calculate capability'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
