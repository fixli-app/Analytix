import { useEffect, useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { SheetColumn } from '../store/workbook'

interface OneWayAnovaDialogProps {
  open: boolean
  initialMeasurementColumn: string
  initialGroupColumn: string
  numericColumns: SheetColumn[]
  categoryColumns: SheetColumn[]
  language: string
  onOpenChange: (open: boolean) => void
  onSubmit: (measurementColumnId: string, groupColumnId: string, alpha: number) => void
}

export function OneWayAnovaDialog({
  open,
  initialMeasurementColumn,
  initialGroupColumn,
  numericColumns,
  categoryColumns,
  language,
  onOpenChange,
  onSubmit,
}: OneWayAnovaDialogProps) {
  const [measurementColumnId, setMeasurementColumnId] = useState(initialMeasurementColumn)
  const [groupColumnId, setGroupColumnId] = useState(initialGroupColumn)
  const [alpha, setAlpha] = useState('0.05')
  const isSwedish = language === 'sv'

  useEffect(() => {
    if (!open) return
    setMeasurementColumnId(initialMeasurementColumn)
    setGroupColumnId(initialGroupColumn)
    setAlpha('0.05')
  }, [initialGroupColumn, initialMeasurementColumn, open])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const significance = Number(alpha)
    if (
      !measurementColumnId ||
      !groupColumnId ||
      measurementColumnId === groupColumnId ||
      !Number.isFinite(significance) ||
      significance <= 0 ||
      significance >= 1
    ) {
      return
    }
    onSubmit(measurementColumnId, groupColumnId, significance)
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
                {isSwedish ? 'Envägs-ANOVA' : 'One-way ANOVA'}
              </Dialog.Title>
              <Dialog.Description className="dialog-description">
                {isSwedish
                  ? 'Jämför medelvärden mellan oberoende grupper med Tukey-Kramer post-hoc.'
                  : 'Compare independent group means with Tukey-Kramer post-hoc comparisons.'}
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
              <span>{isSwedish ? 'Mätkolumn' : 'Measurement column'}</span>
              <select
                value={measurementColumnId}
                onChange={(event) => setMeasurementColumnId(event.target.value)}
              >
                {numericColumns.map((column) => (
                  <option value={column.id} key={column.id}>
                    {column.id} · {column.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="dialog-field">
              <span>{isSwedish ? 'Gruppkolumn' : 'Grouping column'}</span>
              <select
                value={groupColumnId}
                onChange={(event) => setGroupColumnId(event.target.value)}
              >
                {categoryColumns.map((column) => (
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
                ? 'Kräver minst två kompletta observationer per grupp och positiv inomgruppsvariation. Jämn varians antas men testas inte.'
                : 'Requires at least two complete observations per group and positive within-group variation. Equal variance is assumed, not tested.'}
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
                disabled={numericColumns.length === 0 || categoryColumns.length === 0}
              >
                {isSwedish ? 'Kör ANOVA' : 'Run ANOVA'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
