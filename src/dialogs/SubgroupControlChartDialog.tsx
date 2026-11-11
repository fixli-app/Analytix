import { useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { SheetColumn } from '../store/workbook'
import type { SubgroupChartKind } from '../quality/subgroupControlChart'

interface SubgroupControlChartDialogProps {
  open: boolean
  initialGroupColumn: string
  initialMeasurementColumn: string
  categoryColumns: SheetColumn[]
  numericColumns: SheetColumn[]
  language: string
  onOpenChange: (open: boolean) => void
  onSubmit: (kind: SubgroupChartKind, groupColumnId: string, measurementColumnId: string) => void
}

export function SubgroupControlChartDialog({
  open,
  initialGroupColumn,
  initialMeasurementColumn,
  categoryColumns,
  numericColumns,
  language,
  onOpenChange,
  onSubmit,
}: SubgroupControlChartDialogProps) {
  const [kind, setKind] = useState<SubgroupChartKind>('xbar-r')
  const [groupColumnId, setGroupColumnId] = useState(initialGroupColumn)
  const [measurementColumnId, setMeasurementColumnId] = useState(initialMeasurementColumn)
  const isSwedish = language === 'sv'
  const selectedGroupColumn = selectAvailable(groupColumnId, categoryColumns)
  const selectedMeasurementColumn = selectAvailable(measurementColumnId, numericColumns)
  const canSubmit = Boolean(selectedGroupColumn && selectedMeasurementColumn)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) return
    onSubmit(kind, selectedGroupColumn, selectedMeasurementColumn)
    onOpenChange(false)
  }

  function options(columns: SheetColumn[]) {
    return columns.map((column) => (
      <option value={column.id} key={column.id}>
        {column.id} · {column.name}
      </option>
    ))
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <div className="dialog-heading">
            <div>
              <Dialog.Title className="dialog-title">
                {isSwedish ? 'Xbar-R / Xbar-S-styrdiagram' : 'Xbar-R / Xbar-S control chart'}
              </Dialog.Title>
              <Dialog.Description className="dialog-description">
                {isSwedish
                  ? 'Mätningar grupperas efter en subgroupkolumn. Varje grupp måste ha samma antal observationer.'
                  : 'Measurements are grouped by a subgroup column. Every group must have the same number of observations.'}
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
              <span>{isSwedish ? 'Diagramtyp' : 'Chart type'}</span>
              <select
                value={kind}
                onChange={(event) => setKind(event.target.value as SubgroupChartKind)}
              >
                <option value="xbar-r">Xbar-R</option>
                <option value="xbar-s">Xbar-S</option>
              </select>
            </label>
            <label className="dialog-field">
              <span>{isSwedish ? 'Subgroup / delgrupp' : 'Subgroup'}</span>
              <select
                value={selectedGroupColumn}
                onChange={(event) => setGroupColumnId(event.target.value)}
              >
                {options(categoryColumns)}
              </select>
            </label>
            <label className="dialog-field">
              <span>{isSwedish ? 'Numeriskt mätvärde' : 'Numeric measurement'}</span>
              <select
                value={selectedMeasurementColumn}
                onChange={(event) => setMeasurementColumnId(event.target.value)}
              >
                {options(numericColumns)}
              </select>
            </label>
            <p className="session-caption">
              {isSwedish
                ? 'Styrkonstanter finns för gruppstorlek 2–10. Grupperna måste vara kompletta och balanserade; normalitet och oberoende testas inte.'
                : 'Control constants are available for subgroup sizes 2–10. Groups must be complete and balanced; normality and independence are not tested.'}
            </p>
            <div className="dialog-actions">
              <Dialog.Close asChild>
                <button className="dialog-button secondary" type="button">
                  {isSwedish ? 'Avbryt' : 'Cancel'}
                </button>
              </Dialog.Close>
              <button className="dialog-button primary" type="submit" disabled={!canSubmit}>
                {isSwedish ? 'Visa styrdiagram' : 'Show control chart'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function selectAvailable(value: string, columns: SheetColumn[]): string {
  return columns.some((column) => column.id === value) ? value : (columns[0]?.id ?? '')
}
