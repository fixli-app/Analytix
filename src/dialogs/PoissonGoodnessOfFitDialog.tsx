import { useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { SheetColumn } from '../store/workbook'

interface PoissonGoodnessOfFitDialogProps {
  open: boolean
  initialColumn: string
  columns: SheetColumn[]
  language: string
  onOpenChange: (open: boolean) => void
  onSubmit: (columnId: string, alpha: number) => void
}

export function PoissonGoodnessOfFitDialog({
  open,
  initialColumn,
  columns,
  language,
  onOpenChange,
  onSubmit,
}: PoissonGoodnessOfFitDialogProps) {
  const [columnId, setColumnId] = useState(initialColumn)
  const [alpha, setAlpha] = useState('0.05')
  const isSwedish = language === 'sv'
  const selectedColumn = columns.some((column) => column.id === columnId)
    ? columnId
    : (columns[0]?.id ?? '')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const significance = Number(alpha)
    if (
      !selectedColumn ||
      !Number.isFinite(significance) ||
      significance <= 0 ||
      significance >= 1
    ) {
      return
    }
    onSubmit(selectedColumn, significance)
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
                {isSwedish ? 'Poisson goodness-of-fit' : 'Poisson goodness-of-fit'}
              </Dialog.Title>
              <Dialog.Description className="dialog-description">
                {isSwedish
                  ? 'Testar om räknedata följer en Poissonfördelning med skattad λ.'
                  : 'Tests whether count data follow a Poisson distribution with estimated λ.'}
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
              <span>{isSwedish ? 'Numerisk räkningskolumn' : 'Numeric count column'}</span>
              <select value={selectedColumn} onChange={(event) => setColumnId(event.target.value)}>
                {columns.map((column) => (
                  <option value={column.id} key={column.id}>
                    {column.id} · {column.name}
                  </option>
                ))}
              </select>
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
            <p className="session-caption">
              {isSwedish
                ? 'λ skattas från medelvärdet. Intilliggande klasser slås samman tills förväntat antal når tröskeln; p-värdet är chi-två-approximerat.'
                : 'λ is estimated by the sample mean. Adjacent classes are pooled to meet the expected-count threshold; the p-value uses a chi-square approximation.'}
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
                {isSwedish ? 'Kör test' : 'Run test'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
