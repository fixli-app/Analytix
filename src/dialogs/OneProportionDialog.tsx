import { useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { SheetColumn } from '../store/workbook'

interface OneProportionDialogProps {
  open: boolean
  initialColumn: string
  columns: SheetColumn[]
  language: string
  onOpenChange: (open: boolean) => void
  onSubmit: (columnId: string, hypothesizedProportion: number, alpha: number) => void
}

export function OneProportionDialog({
  open,
  initialColumn,
  columns,
  language,
  onOpenChange,
  onSubmit,
}: OneProportionDialogProps) {
  const [columnId, setColumnId] = useState(initialColumn)
  const [hypothesizedProportion, setHypothesizedProportion] = useState('0.5')
  const [alpha, setAlpha] = useState('0.05')
  const isSwedish = language === 'sv'

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const proportion = Number(hypothesizedProportion)
    const significance = Number(alpha)
    if (!columnId || !Number.isFinite(proportion) || !Number.isFinite(significance)) return
    onSubmit(columnId, proportion, significance)
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
                {isSwedish ? '1-proportion Z-test' : 'One-proportion Z-test'}
              </Dialog.Title>
              <Dialog.Description className="dialog-description">
                {isSwedish
                  ? 'Testa en binär kolumns andel mot ett angivet p₀.'
                  : 'Test a binary column proportion against a specified p₀.'}
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
              <span>{isSwedish ? 'Binär kolumn (0/1)' : 'Binary column (0/1)'}</span>
              <select value={columnId} onChange={(event) => setColumnId(event.target.value)}>
                {columns.map((column) => (
                  <option value={column.id} key={column.id}>
                    {column.id} · {column.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="dialog-field">
              <span>{isSwedish ? 'Hypotetisk andel (p₀)' : 'Hypothesized proportion (p₀)'}</span>
              <input
                type="number"
                min="0.0001"
                max="0.9999"
                step="any"
                value={hypothesizedProportion}
                onChange={(event) => setHypothesizedProportion(event.target.value)}
                required
              />
            </label>
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
                disabled={columns.length === 0}
              >
                {isSwedish ? 'Kör test' : 'Run test'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
