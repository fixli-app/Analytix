import { useEffect, useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { SheetColumn } from '../store/workbook'

interface TwoWayAnovaDialogProps {
  open: boolean
  numericColumns: SheetColumn[]
  factorColumns: SheetColumn[]
  initialResponseColumn: string
  initialFactor1Column: string
  initialFactor2Column: string
  language: string
  onOpenChange: (open: boolean) => void
  onSubmit: (
    responseColumnId: string,
    factor1ColumnId: string,
    factor2ColumnId: string,
    alpha: number,
  ) => void
}

export function TwoWayAnovaDialog({
  open,
  numericColumns,
  factorColumns,
  initialResponseColumn,
  initialFactor1Column,
  initialFactor2Column,
  language,
  onOpenChange,
  onSubmit,
}: TwoWayAnovaDialogProps) {
  const [responseColumnId, setResponseColumnId] = useState(initialResponseColumn)
  const [factor1ColumnId, setFactor1ColumnId] = useState(initialFactor1Column)
  const [factor2ColumnId, setFactor2ColumnId] = useState(initialFactor2Column)
  const [alpha, setAlpha] = useState('0.05')
  const isSwedish = language === 'sv'

  useEffect(() => {
    if (!open) return
    setResponseColumnId(initialResponseColumn)
    setFactor1ColumnId(initialFactor1Column)
    setFactor2ColumnId(initialFactor2Column)
    setAlpha('0.05')
  }, [initialFactor1Column, initialFactor2Column, initialResponseColumn, open])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const significance = Number(alpha)
    if (
      !responseColumnId ||
      !factor1ColumnId ||
      !factor2ColumnId ||
      factor1ColumnId === factor2ColumnId ||
      !Number.isFinite(significance) ||
      significance <= 0 ||
      significance >= 1
    ) {
      return
    }
    onSubmit(responseColumnId, factor1ColumnId, factor2ColumnId, significance)
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
                {isSwedish ? 'Tvåvägs-ANOVA' : 'Two-way ANOVA'}
              </Dialog.Title>
              <Dialog.Description className="dialog-description">
                {isSwedish
                  ? 'Testa två faktorer och deras interaktion i en balanserad design.'
                  : 'Test two factors and their interaction in a balanced design.'}
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
              <span>{isSwedish ? 'Svarskolumn' : 'Response column'}</span>
              <select
                value={responseColumnId}
                onChange={(event) => setResponseColumnId(event.target.value)}
              >
                {numericColumns.map((column) => (
                  <option value={column.id} key={column.id}>
                    {column.id} · {column.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="dialog-field">
              <span>{isSwedish ? 'Faktor A' : 'Factor A'}</span>
              <select
                value={factor1ColumnId}
                onChange={(event) => setFactor1ColumnId(event.target.value)}
              >
                {factorColumns.map((column) => (
                  <option value={column.id} key={column.id}>
                    {column.id} · {column.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="dialog-field">
              <span>{isSwedish ? 'Faktor B' : 'Factor B'}</span>
              <select
                value={factor2ColumnId}
                onChange={(event) => setFactor2ColumnId(event.target.value)}
              >
                {factorColumns.map((column) => (
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
                ? 'Kräver minst två kompletta observationer i varje faktorcell och lika cellstorlekar. Normalitet, oberoende och homogen varians antas men testas inte.'
                : 'Requires at least two complete observations in every factor cell and equal cell sizes. Normality, independence, and equal variance are assumed, not tested.'}
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
                disabled={numericColumns.length === 0 || factorColumns.length < 2}
              >
                {isSwedish ? 'Kör tvåvägs-ANOVA' : 'Run two-way ANOVA'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
