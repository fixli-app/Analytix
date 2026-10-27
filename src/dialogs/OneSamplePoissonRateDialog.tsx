import { useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { SheetColumn } from '../store/workbook'

interface OneSamplePoissonRateDialogProps {
  open: boolean
  initialColumn: string
  columns: SheetColumn[]
  language: string
  onOpenChange: (open: boolean) => void
  onSubmit: (
    columnId: string,
    exposurePerObservation: number,
    hypothesizedRate: number,
    alpha: number,
  ) => void
}

export function OneSamplePoissonRateDialog({
  open,
  initialColumn,
  columns,
  language,
  onOpenChange,
  onSubmit,
}: OneSamplePoissonRateDialogProps) {
  const [columnId, setColumnId] = useState(initialColumn)
  const [exposurePerObservation, setExposurePerObservation] = useState('1')
  const [hypothesizedRate, setHypothesizedRate] = useState('1')
  const [alpha, setAlpha] = useState('0.05')
  const isSwedish = language === 'sv'

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const exposure = Number(exposurePerObservation)
    const rate = Number(hypothesizedRate)
    const significance = Number(alpha)
    if (
      !columnId ||
      !Number.isFinite(exposure) ||
      !Number.isFinite(rate) ||
      !Number.isFinite(significance)
    ) {
      return
    }
    onSubmit(columnId, exposure, rate, significance)
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
                {isSwedish ? '1-urvals Poisson-hastighet' : 'One-sample Poisson rate'}
              </Dialog.Title>
              <Dialog.Description className="dialog-description">
                {isSwedish
                  ? 'Testa en händelsehastighet mot ett angivet λ₀.'
                  : 'Test an event rate against a specified λ₀.'}
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
              <span>{isSwedish ? 'Kolumn med heltalsräkningar' : 'Column of integer counts'}</span>
              <select value={columnId} onChange={(event) => setColumnId(event.target.value)}>
                {columns.map((column) => (
                  <option value={column.id} key={column.id}>
                    {column.id} · {column.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="dialog-field">
              <span>{isSwedish ? 'Exponering per rad' : 'Exposure per row'}</span>
              <input
                type="number"
                min="0.0001"
                step="any"
                value={exposurePerObservation}
                onChange={(event) => setExposurePerObservation(event.target.value)}
                required
              />
            </label>
            <label className="dialog-field">
              <span>{isSwedish ? 'Hypotetisk hastighet (λ₀)' : 'Hypothesized rate (λ₀)'}</span>
              <input
                type="number"
                min="0.0001"
                step="any"
                value={hypothesizedRate}
                onChange={(event) => setHypothesizedRate(event.target.value)}
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
