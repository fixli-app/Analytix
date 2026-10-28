import { useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { SheetColumn } from '../store/workbook'

interface FisherExactDialogProps {
  open: boolean
  initialColumn1: string
  initialColumn2: string
  columns: SheetColumn[]
  language: string
  onOpenChange: (open: boolean) => void
  onSubmit: (columnId1: string, columnId2: string) => void
}

export function FisherExactDialog({
  open,
  initialColumn1,
  initialColumn2,
  columns,
  language,
  onOpenChange,
  onSubmit,
}: FisherExactDialogProps) {
  const [columnId1, setColumnId1] = useState(initialColumn1)
  const [columnId2, setColumnId2] = useState(initialColumn2)
  const isSwedish = language === 'sv'

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!columnId1 || !columnId2 || columnId1 === columnId2) return
    onSubmit(columnId1, columnId2)
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
                {isSwedish ? 'Fishers exakta test' : "Fisher's exact test"}
              </Dialog.Title>
              <Dialog.Description className="dialog-description">
                {isSwedish
                  ? 'Tvåsidigt exakt test för en 2×2-tabell med fasta marginaler.'
                  : 'Two-sided exact test for a 2x2 table with fixed margins.'}
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
                <span>
                  {isSwedish ? `Kategorikolumn ${index + 1}` : `Category column ${index + 1}`}
                </span>
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
