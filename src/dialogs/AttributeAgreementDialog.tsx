import { useEffect, useMemo, useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { SheetColumn } from '../store/workbook'

export interface AttributeAgreementRequest {
  itemColumnId: string
  referenceColumnId: string | undefined
  raterColumnIds: string[]
  weighting: 'none' | 'linear' | 'quadratic'
  categoryOrder: string[]
}

interface AttributeAgreementDialogProps {
  open: boolean
  columns: SheetColumn[]
  language: string
  onOpenChange: (open: boolean) => void
  onSubmit: (request: AttributeAgreementRequest) => void
}

export function AttributeAgreementDialog({
  open,
  columns,
  language,
  onOpenChange,
  onSubmit,
}: AttributeAgreementDialogProps) {
  const isSwedish = language === 'sv'
  const [itemColumnId, setItemColumnId] = useState('')
  const [referenceColumnId, setReferenceColumnId] = useState('')
  const [raterColumnIds, setRaterColumnIds] = useState<string[]>([])
  const [weighting, setWeighting] = useState<'none' | 'linear' | 'quadratic'>('none')
  const [categoryOrder, setCategoryOrder] = useState('')
  const availableRaters = useMemo(
    () => columns.filter((column) => column.id !== itemColumnId && column.id !== referenceColumnId),
    [columns, itemColumnId, referenceColumnId],
  )

  useEffect(() => {
    if (!open) return
    const item = columns[0]?.id ?? ''
    setItemColumnId(item)
    setReferenceColumnId('')
    setWeighting('none')
    setCategoryOrder('')
    setRaterColumnIds(
      columns
        .filter((column) => column.id !== item)
        .slice(0, 2)
        .map((column) => column.id),
    )
  }, [columns, open])

  const validRaterColumnIds = raterColumnIds.filter(
    (columnId) => columnId !== itemColumnId && columnId !== referenceColumnId,
  )
  const orderedCategories = categoryOrder
    .split(/[\n,]/)
    .map((category) => category.trim())
    .filter(Boolean)

  function toggleRater(columnId: string, checked: boolean) {
    setRaterColumnIds((current) =>
      checked ? [...current, columnId] : current.filter((selectedId) => selectedId !== columnId),
    )
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!itemColumnId || validRaterColumnIds.length < 2) return
    onSubmit({
      itemColumnId,
      referenceColumnId: referenceColumnId || undefined,
      raterColumnIds: validRaterColumnIds,
      weighting,
      categoryOrder: orderedCategories,
    })
    onOpenChange(false)
  }

  function options() {
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
        <Dialog.Content className="dialog-content attribute-agreement-dialog">
          <div className="dialog-heading">
            <div>
              <Dialog.Title className="dialog-title">
                {isSwedish ? 'Attributöverensstämmelse' : 'Attribute Agreement Analysis'}
              </Dialog.Title>
              <Dialog.Description className="dialog-description">
                {isSwedish
                  ? 'Jämför upprepade klassificeringar mellan bedömare och, valfritt, mot en standard.'
                  : 'Compare repeated classifications across appraisers and, optionally, against a standard.'}
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
              <span>{isSwedish ? 'Item / prov-ID' : 'Item / sample ID'}</span>
              <select
                value={itemColumnId}
                onChange={(event) => {
                  const nextItemId = event.target.value
                  setItemColumnId(nextItemId)
                  setRaterColumnIds((current) => current.filter((id) => id !== nextItemId))
                }}
              >
                {options()}
              </select>
            </label>
            <label className="dialog-field">
              <span>{isSwedish ? 'Standard (valfri)' : 'Reference standard (optional)'}</span>
              <select
                value={referenceColumnId}
                onChange={(event) => {
                  const nextReferenceId = event.target.value
                  setReferenceColumnId(nextReferenceId)
                  setRaterColumnIds((current) => current.filter((id) => id !== nextReferenceId))
                }}
              >
                <option value="">{isSwedish ? 'Ingen standard' : 'No standard'}</option>
                {columns
                  .filter((column) => column.id !== itemColumnId)
                  .map((column) => (
                    <option value={column.id} key={column.id}>
                      {column.id} · {column.name}
                    </option>
                  ))}
              </select>
            </label>
            <fieldset className="attribute-rater-list">
              <legend>
                {isSwedish
                  ? 'Bedömarkolumner (minst två)'
                  : 'Appraiser columns (select at least two)'}
              </legend>
              {availableRaters.map((column) => (
                <label key={column.id}>
                  <input
                    type="checkbox"
                    checked={validRaterColumnIds.includes(column.id)}
                    onChange={(event) => toggleRater(column.id, event.target.checked)}
                  />
                  <span>
                    {column.id} · {column.name}
                  </span>
                </label>
              ))}
            </fieldset>
            <label className="dialog-field">
              <span>{isSwedish ? 'Kappaviktning' : 'Kappa weighting'}</span>
              <select
                value={weighting}
                onChange={(event) =>
                  setWeighting(event.target.value as 'none' | 'linear' | 'quadratic')
                }
              >
                <option value="none">
                  {isSwedish ? 'Oviktad (nominal)' : 'Unweighted (nominal)'}
                </option>
                <option value="linear">
                  {isSwedish ? 'Linjär (ordinal)' : 'Linear (ordinal)'}
                </option>
                <option value="quadratic">
                  {isSwedish ? 'Kvadratisk (ordinal)' : 'Quadratic (ordinal)'}
                </option>
              </select>
            </label>
            {weighting !== 'none' && (
              <label className="dialog-field">
                <span>
                  {isSwedish
                    ? 'Kategorier i ordning, lägst till högst'
                    : 'Categories in order, lowest to highest'}
                </span>
                <input
                  value={categoryOrder}
                  onChange={(event) => setCategoryOrder(event.target.value)}
                  placeholder={isSwedish ? 'Låg, Medel, Hög' : 'Low, Medium, High'}
                />
              </label>
            )}
            <p className="session-caption">
              {isSwedish
                ? weighting === 'none'
                  ? 'Varje rad är ett försök för ett item; upprepade item-ID:n används för repeterbarhet. Kappa kräver variation i kategorierna. Saknade klassificeringar utelämnas.'
                  : 'Viktad kappa kräver kategorierna explicit ordnade från lägst till högst. Linjär och kvadratisk viktning rapporteras separat från oviktad kappa.'
                : weighting === 'none'
                  ? 'Each row is a trial for an item; repeated item IDs are used for repeatability. Kappa requires category variation. Missing ratings are omitted.'
                  : 'Weighted kappa requires categories explicitly ordered from lowest to highest. Linear and quadratic weights are reported separately from unweighted kappa.'}
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
                disabled={
                  validRaterColumnIds.length < 2 ||
                  !itemColumnId ||
                  (weighting !== 'none' &&
                    (orderedCategories.length < 2 ||
                      new Set(orderedCategories).size !== orderedCategories.length))
                }
              >
                {isSwedish ? 'Kör överensstämmelseanalys' : 'Run agreement analysis'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
