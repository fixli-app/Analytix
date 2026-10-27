import { useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { SheetColumn } from '../store/workbook'

interface CorrelationDialogProps {
  open: boolean
  initialColumn1: string
  initialColumn2: string
  columns: SheetColumn[]
  language: string
  onOpenChange: (open: boolean) => void
  onSubmit: (columnId1: string, columnId2: string, alpha: number) => void
}

export function CorrelationDialog({
  open,
  initialColumn1,
  initialColumn2,
  columns,
  language,
  onOpenChange,
  onSubmit,
}: CorrelationDialogProps) {
  const [columnId1, setColumnId1] = useState(initialColumn1)
  const [columnId2, setColumnId2] = useState(initialColumn2)
  const [alpha, setAlpha] = useState('0.05')
  const isSwedish = language === 'sv'

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const significance = Number(alpha)
    if (!columnId1 || !columnId2 || columnId1 === columnId2 || !Number.isFinite(significance)) {
      return
    }
    onSubmit(columnId1, columnId2, significance)
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
                {isSwedish ? 'Korrelation och kovarians' : 'Correlation and covariance'}
              </Dialog.Title>
              <Dialog.Description className="dialog-description">
                {isSwedish
                  ? 'Beräkna Pearsons r, kovarians och ett tvåsidigt test.'
                  : 'Calculate Pearson r, covariance, and a two-sided test.'}
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
            {[columnId1, columnId2].map((columnId, index) => (
              <label className="dialog-field" key={index}>
                <span>
                  {isSwedish ? `Numerisk kolumn ${index + 1}` : `Numeric column ${index + 1}`}
                </span>
                <select
                  value={columnId}
                  onChange={(event) =>
                    index === 0
                      ? setColumnId1(event.target.value)
                      : setColumnId2(event.target.value)
                  }
                >
                  {columns.map((column) => (
                    <option value={column.id} key={column.id}>
                      {column.id} · {column.name}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <label className="dialog-field">
              <span>{isSwedish ? 'Signifikansnivå (α)' : 'Significance level (α)'}</span>
              <input
                type="number"
                min="0.0001"
                max="0.9999"
                step="any"
                value={alpha}
                onChange={(event) => setAlpha(event.target.value)}
                required
              />
            </label>
            <div className="dialog-actions">
              <Dialog.Close asChild>
                <button className="dialog-button secondary" type="button">
                  {isSwedish ? 'Avbryt' : 'Cancel'}
                </button>
              </Dialog.Close>
              <button
                className="dialog-button primary"
                type="submit"
                disabled={columns.length < 2 || columnId1 === columnId2}
              >
                {isSwedish ? 'Kör analys' : 'Run analysis'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
