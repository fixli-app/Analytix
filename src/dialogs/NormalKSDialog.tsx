import { useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { SheetColumn } from '../store/workbook'

interface NormalKSDialogProps {
  open: boolean
  initialColumn: string
  columns: SheetColumn[]
  language: string
  onOpenChange: (open: boolean) => void
  onSubmit: (columnId: string, mean: number, standardDeviation: number) => void
}

export function NormalKSDialog({
  open,
  initialColumn,
  columns,
  language,
  onOpenChange,
  onSubmit,
}: NormalKSDialogProps) {
  const [columnId, setColumnId] = useState(initialColumn)
  const [mean, setMean] = useState('0')
  const [standardDeviation, setStandardDeviation] = useState('1')
  const isSwedish = language === 'sv'

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const hypothesizedMean = Number(mean)
    const hypothesizedStandardDeviation = Number(standardDeviation)
    if (
      !columnId ||
      !Number.isFinite(hypothesizedMean) ||
      !Number.isFinite(hypothesizedStandardDeviation)
    ) {
      return
    }
    onSubmit(columnId, hypothesizedMean, hypothesizedStandardDeviation)
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
                {isSwedish ? 'Kolmogorov-Smirnov mot normal' : 'Kolmogorov-Smirnov against normal'}
              </Dialog.Title>
              <Dialog.Description className="dialog-description">
                {isSwedish
                  ? 'Jämför data med en fullt specificerad normalfördelning.'
                  : 'Compare data with a fully specified normal distribution.'}
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
              <span>{isSwedish ? 'Kolumn' : 'Column'}</span>
              <select value={columnId} onChange={(event) => setColumnId(event.target.value)}>
                {columns.map((column) => (
                  <option value={column.id} key={column.id}>
                    {column.id} · {column.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="dialog-field">
              <span>{isSwedish ? 'Specificerat medelvärde (μ)' : 'Specified mean (μ)'}</span>
              <input
                type="number"
                step="any"
                value={mean}
                onChange={(event) => setMean(event.target.value)}
                required
              />
            </label>
            <label className="dialog-field">
              <span>
                {isSwedish
                  ? 'Specificerad standardavvikelse (σ)'
                  : 'Specified standard deviation (σ)'}
              </span>
              <input
                type="number"
                min="0.0001"
                step="any"
                value={standardDeviation}
                onChange={(event) => setStandardDeviation(event.target.value)}
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
