import { useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { SheetColumn } from '../store/workbook'

interface ImrControlChartDialogProps {
  open: boolean
  initialColumn: string
  columns: SheetColumn[]
  language: string
  onOpenChange: (open: boolean) => void
  onSubmit: (columnId: string) => void
}

export function ImrControlChartDialog({
  open,
  initialColumn,
  columns,
  language,
  onOpenChange,
  onSubmit,
}: ImrControlChartDialogProps) {
  const [columnId, setColumnId] = useState(initialColumn)
  const isSwedish = language === 'sv'
  const selectedColumnId = columns.some((column) => column.id === columnId)
    ? columnId
    : (columns[0]?.id ?? '')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedColumnId) return
    onSubmit(selectedColumnId)
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
                {isSwedish ? 'I-MR-styrdiagram' : 'I-MR control chart'}
              </Dialog.Title>
              <Dialog.Description className="dialog-description">
                {isSwedish
                  ? 'Visa individvärden och rörliga variationsbredder i aktuell radordning.'
                  : 'Plot individual values and moving ranges in the current row order.'}
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
            <p className="session-caption">
              {isSwedish
                ? 'Styrgränser skattas från MR̄/1,128 (I) och 3,267 × MR̄ (MR). Signaler: punkter utanför 3σ och åtta i rad på samma sida.'
                : 'Limits use MR̄/1.128 (I) and 3.267 × MR̄ (MR). Signals: points beyond 3σ and eight consecutive points on one side.'}
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
                {isSwedish ? 'Visa styrdiagram' : 'Show control chart'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
