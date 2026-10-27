import { useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { SheetColumn } from '../store/workbook'

interface TwoSamplePoissonRateDialogProps {
  open: boolean
  initialColumn1: string
  initialColumn2: string
  columns: SheetColumn[]
  language: string
  onOpenChange: (open: boolean) => void
  onSubmit: (
    columnId1: string,
    exposurePerObservation1: number,
    columnId2: string,
    exposurePerObservation2: number,
    alpha: number,
  ) => void
}

export function TwoSamplePoissonRateDialog({
  open,
  initialColumn1,
  initialColumn2,
  columns,
  language,
  onOpenChange,
  onSubmit,
}: TwoSamplePoissonRateDialogProps) {
  const [columnId1, setColumnId1] = useState(initialColumn1)
  const [columnId2, setColumnId2] = useState(initialColumn2)
  const [exposure1, setExposure1] = useState('1')
  const [exposure2, setExposure2] = useState('1')
  const [alpha, setAlpha] = useState('0.05')
  const isSwedish = language === 'sv'

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const time1 = Number(exposure1)
    const time2 = Number(exposure2)
    const significance = Number(alpha)
    if (
      !columnId1 ||
      !columnId2 ||
      !Number.isFinite(time1) ||
      !Number.isFinite(time2) ||
      !Number.isFinite(significance)
    ) {
      return
    }
    onSubmit(columnId1, time1, columnId2, time2, significance)
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
                {isSwedish ? '2-urvals Poisson-hastighet' : 'Two-sample Poisson rate'}
              </Dialog.Title>
              <Dialog.Description className="dialog-description">
                {isSwedish
                  ? 'Jämför händelsehastigheter för två oberoende grupper.'
                  : 'Compare event rates for two independent groups.'}
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
            {[
              {
                column: columnId1,
                setColumn: setColumnId1,
                exposure: exposure1,
                setExposure: setExposure1,
                index: 1,
              },
              {
                column: columnId2,
                setColumn: setColumnId2,
                exposure: exposure2,
                setExposure: setExposure2,
                index: 2,
              },
            ].map((group) => (
              <div className="dialog-group" key={group.index}>
                <label className="dialog-field">
                  <span>
                    {isSwedish ? `Räkningskolumn ${group.index}` : `Count column ${group.index}`}
                  </span>
                  <select
                    value={group.column}
                    onChange={(event) => group.setColumn(event.target.value)}
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
                      ? `Exponering per rad ${group.index}`
                      : `Exposure per row ${group.index}`}
                  </span>
                  <input
                    type="number"
                    min="0.0001"
                    step="any"
                    value={group.exposure}
                    onChange={(event) => group.setExposure(event.target.value)}
                    required
                  />
                </label>
              </div>
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
