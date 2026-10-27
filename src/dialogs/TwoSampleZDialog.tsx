import { useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { SheetColumn } from '../store/workbook'

interface TwoSampleZDialogProps {
  open: boolean
  initialColumn1: string
  initialColumn2: string
  columns: SheetColumn[]
  language: string
  onOpenChange: (open: boolean) => void
  onSubmit: (
    columnId1: string,
    columnId2: string,
    sigma1: number,
    sigma2: number,
    hypothesizedDifference: number,
    alpha: number,
  ) => void
}

export function TwoSampleZDialog({
  open,
  initialColumn1,
  initialColumn2,
  columns,
  language,
  onOpenChange,
  onSubmit,
}: TwoSampleZDialogProps) {
  const [columnId1, setColumnId1] = useState(initialColumn1)
  const [columnId2, setColumnId2] = useState(initialColumn2)
  const [sigma1, setSigma1] = useState('1')
  const [sigma2, setSigma2] = useState('1')
  const [hypothesizedDifference, setHypothesizedDifference] = useState('0')
  const [alpha, setAlpha] = useState('0.05')
  const isSwedish = language === 'sv'

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const standardDeviation1 = Number(sigma1)
    const standardDeviation2 = Number(sigma2)
    const difference = Number(hypothesizedDifference)
    const significance = Number(alpha)
    if (
      !columnId1 ||
      !columnId2 ||
      !Number.isFinite(standardDeviation1) ||
      !Number.isFinite(standardDeviation2) ||
      !Number.isFinite(difference) ||
      !Number.isFinite(significance)
    ) {
      return
    }
    onSubmit(columnId1, columnId2, standardDeviation1, standardDeviation2, difference, significance)
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
                {isSwedish ? '2-urvals Z-test' : 'Two-sample Z-test'}
              </Dialog.Title>
              <Dialog.Description className="dialog-description">
                {isSwedish
                  ? 'Testa två oberoende medelvärden med kända populationsstandardavvikelser.'
                  : 'Test two independent means with known population standard deviations.'}
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
              <div className="dialog-group" key={index}>
                <label className="dialog-field">
                  <span>{isSwedish ? `Grupp ${index + 1}` : `Group ${index + 1}`}</span>
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
                <label className="dialog-field">
                  <span>
                    {isSwedish
                      ? `Känd populationsstandardavvikelse σ${index + 1}`
                      : `Known population standard deviation σ${index + 1}`}
                  </span>
                  <input
                    type="number"
                    min="0.0001"
                    step="any"
                    value={index === 0 ? sigma1 : sigma2}
                    onChange={(event) =>
                      index === 0 ? setSigma1(event.target.value) : setSigma2(event.target.value)
                    }
                    required
                  />
                </label>
              </div>
            ))}
            <label className="dialog-field">
              <span>
                {isSwedish ? 'Hypotetisk skillnad (μ₁ − μ₂)' : 'Hypothesized difference (μ₁ − μ₂)'}
              </span>
              <input
                type="number"
                step="any"
                value={hypothesizedDifference}
                onChange={(event) => setHypothesizedDifference(event.target.value)}
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
              <button className="dialog-button primary" type="submit" disabled={columns.length < 2}>
                {isSwedish ? 'Kör test' : 'Run test'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
