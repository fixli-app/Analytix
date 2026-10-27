import { useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { SheetColumn } from '../store/workbook'

interface TwoSampleTDialogProps {
  open: boolean
  initialColumn1: string
  initialColumn2: string
  columns: SheetColumn[]
  language: string
  onOpenChange: (open: boolean) => void
  onSubmit: (columnId1: string, columnId2: string, difference: number, alpha: number) => void
}

export function TwoSampleTDialog({
  open,
  initialColumn1,
  initialColumn2,
  columns,
  language,
  onOpenChange,
  onSubmit,
}: TwoSampleTDialogProps) {
  const [columnId1, setColumnId1] = useState(initialColumn1)
  const [columnId2, setColumnId2] = useState(initialColumn2)
  const [hypothesizedDifference, setHypothesizedDifference] = useState('0')
  const [alpha, setAlpha] = useState('0.05')
  const isSwedish = language === 'sv'

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const difference = Number(hypothesizedDifference)
    const significance = Number(alpha)
    if (
      !columnId1 ||
      !columnId2 ||
      columnId1 === columnId2 ||
      !Number.isFinite(difference) ||
      !Number.isFinite(significance)
    ) {
      return
    }
    onSubmit(columnId1, columnId2, difference, significance)
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
                {isSwedish ? '2-urvals t-test (Welch)' : 'Two-sample t-test (Welch)'}
              </Dialog.Title>
              <Dialog.Description className="dialog-description">
                {isSwedish
                  ? 'Jämför två oberoende medelvärden utan antagande om lika varianser.'
                  : 'Compare two independent means without assuming equal variances.'}
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
                <span>{isSwedish ? `Stickprov ${index + 1}` : `Sample ${index + 1}`}</span>
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
              <button
                className="dialog-button primary"
                type="submit"
                disabled={columns.length < 2 || columnId1 === columnId2}
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
