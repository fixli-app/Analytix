import { useEffect, useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { SheetColumn } from '../store/workbook'

interface SurvivalDialogProps {
  open: boolean
  numericColumns: SheetColumn[]
  categoryColumns: SheetColumn[]
  initialTimeColumn: string
  initialStatusColumn: string
  initialGroupColumn: string
  language: string
  onOpenChange: (open: boolean) => void
  onSubmit: (
    timeColumnId: string,
    statusColumnId: string,
    groupColumnId: string | undefined,
    alpha: number,
  ) => void
}

export function SurvivalDialog({
  open,
  numericColumns,
  categoryColumns,
  initialTimeColumn,
  initialStatusColumn,
  initialGroupColumn,
  language,
  onOpenChange,
  onSubmit,
}: SurvivalDialogProps) {
  const [timeColumnId, setTimeColumnId] = useState(initialTimeColumn)
  const [statusColumnId, setStatusColumnId] = useState(initialStatusColumn)
  const [groupColumnId, setGroupColumnId] = useState(initialGroupColumn)
  const [alpha, setAlpha] = useState('0.05')
  const isSwedish = language === 'sv'

  useEffect(() => {
    if (!open) return
    setTimeColumnId(initialTimeColumn)
    setStatusColumnId(initialStatusColumn)
    setGroupColumnId(initialGroupColumn)
    setAlpha('0.05')
  }, [initialGroupColumn, initialStatusColumn, initialTimeColumn, open])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const significance = Number(alpha)
    if (
      !timeColumnId ||
      !statusColumnId ||
      timeColumnId === statusColumnId ||
      !Number.isFinite(significance) ||
      significance <= 0 ||
      significance >= 1
    ) {
      return
    }
    onSubmit(timeColumnId, statusColumnId, groupColumnId || undefined, significance)
    onOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content survival-dialog">
          <div className="dialog-heading">
            <div>
              <Dialog.Title className="dialog-title">
                {isSwedish ? 'Överlevnadsanalys' : 'Survival analysis'}
              </Dialog.Title>
              <Dialog.Description className="dialog-description">
                {isSwedish
                  ? 'Kaplan–Meier, censurering, log-rank och exponential-/Weibull-anpassning.'
                  : 'Kaplan-Meier, censoring, log-rank, and exponential/Weibull fits.'}
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
              <span>{isSwedish ? 'Tidskolumn' : 'Time column'}</span>
              <select
                value={timeColumnId}
                onChange={(event) => setTimeColumnId(event.target.value)}
              >
                {numericColumns.map((column) => (
                  <option value={column.id} key={column.id}>
                    {column.id} · {column.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="dialog-field">
              <span>
                {isSwedish
                  ? 'Händelsestatus (1 = händelse, 0 = censurerad)'
                  : 'Event status (1 = event, 0 = censored)'}
              </span>
              <select
                value={statusColumnId}
                onChange={(event) => setStatusColumnId(event.target.value)}
              >
                {numericColumns.map((column) => (
                  <option value={column.id} key={column.id}>
                    {column.id} · {column.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="dialog-field">
              <span>{isSwedish ? 'Grupp (valfri)' : 'Group (optional)'}</span>
              <select
                value={groupColumnId}
                onChange={(event) => setGroupColumnId(event.target.value)}
              >
                <option value="">{isSwedish ? 'En gemensam kurva' : 'Single curve'}</option>
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
                ? 'Log-rank kräver informativ variation i riskmängderna. Median och KI kan vara ej skattningsbara om kurvan inte passerar 50 %.'
                : 'Log-rank requires informative risk-set variation. Median and CI may be unestimable when the curve does not cross 50%.'}
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
                disabled={numericColumns.length < 2}
              >
                {isSwedish ? 'Kör överlevnadsanalys' : 'Run survival analysis'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
