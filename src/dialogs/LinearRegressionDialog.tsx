import { useEffect, useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { SheetColumn } from '../store/workbook'

interface LinearRegressionDialogProps {
  open: boolean
  numericColumns: SheetColumn[]
  categoricalColumns: SheetColumn[]
  initialResponseColumn: string
  initialPredictorIds: string[]
  language: string
  onOpenChange: (open: boolean) => void
  onSubmit: (
    responseColumnId: string,
    predictorColumnIds: string[],
    alpha: number,
    options: { quadraticPredictorIds: string[]; includeInteractions: boolean },
  ) => void
}

export function LinearRegressionDialog({
  open,
  numericColumns,
  categoricalColumns,
  initialResponseColumn,
  initialPredictorIds,
  language,
  onOpenChange,
  onSubmit,
}: LinearRegressionDialogProps) {
  const initialPredictorKey = initialPredictorIds.join('|')
  const [responseColumnId, setResponseColumnId] = useState(initialResponseColumn)
  const [predictorColumnIds, setPredictorColumnIds] = useState(initialPredictorIds)
  const [quadraticPredictorIds, setQuadraticPredictorIds] = useState<string[]>([])
  const [includeInteractions, setIncludeInteractions] = useState(false)
  const [alpha, setAlpha] = useState('0.05')
  const isSwedish = language === 'sv'
  const availablePredictors = [...numericColumns, ...categoricalColumns]

  useEffect(() => {
    if (!open) return
    setResponseColumnId(initialResponseColumn)
    setPredictorColumnIds(initialPredictorKey ? initialPredictorKey.split('|') : [])
    setQuadraticPredictorIds([])
    setIncludeInteractions(false)
    setAlpha('0.05')
  }, [initialPredictorKey, initialResponseColumn, open])

  function togglePredictor(columnId: string) {
    setPredictorColumnIds((current) =>
      current.includes(columnId)
        ? current.filter((value) => value !== columnId)
        : [...current, columnId],
    )
    if (predictorColumnIds.includes(columnId)) {
      setQuadraticPredictorIds((current) => current.filter((value) => value !== columnId))
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const significance = Number(alpha)
    if (
      predictorColumnIds.length < 1 ||
      predictorColumnIds.length > 12 ||
      predictorColumnIds.includes(responseColumnId) ||
      !Number.isFinite(significance) ||
      significance <= 0 ||
      significance >= 1
    ) {
      return
    }
    onSubmit(responseColumnId, predictorColumnIds, significance, {
      quadraticPredictorIds,
      includeInteractions,
    })
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
                {isSwedish ? 'Multipel linjär regression' : 'Multiple linear regression'}
              </Dialog.Title>
              <Dialog.Description className="dialog-description">
                {isSwedish
                  ? 'Skatta en numerisk respons med flera numeriska prediktorer.'
                  : 'Model a numeric response using numeric and categorical predictors.'}
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
                onChange={(event) => {
                  setResponseColumnId(event.target.value)
                  setPredictorColumnIds((current) =>
                    current.filter((id) => id !== event.target.value),
                  )
                  setQuadraticPredictorIds((current) =>
                    current.filter((id) => id !== event.target.value),
                  )
                }}
              >
                {numericColumns.map((column) => (
                  <option value={column.id} key={column.id}>
                    {column.id} · {column.name}
                  </option>
                ))}
              </select>
            </label>
            <fieldset className="regression-predictors">
              <legend>
                {isSwedish ? 'Prediktorer, välj 1–12 kolumner' : 'Predictors, select 1–12 columns'}
              </legend>
              {availablePredictors
                .filter((column) => column.id !== responseColumnId)
                .map((column) => (
                  <label key={column.id}>
                    <input
                      type="checkbox"
                      checked={predictorColumnIds.includes(column.id)}
                      onChange={() => togglePredictor(column.id)}
                      disabled={
                        !predictorColumnIds.includes(column.id) && predictorColumnIds.length >= 12
                      }
                    />
                    {column.id} · {column.name}
                  </label>
                ))}
            </fieldset>
            <label className="doe-check">
              <input
                type="checkbox"
                checked={includeInteractions}
                onChange={(event) => setIncludeInteractions(event.target.checked)}
              />
              {isSwedish
                ? 'Inkludera alla tvåvägsinteraktioner'
                : 'Include all two-way interactions'}
            </label>
            {numericColumns.some((column) => predictorColumnIds.includes(column.id)) && (
              <fieldset className="regression-predictors">
                <legend>{isSwedish ? 'Kvadratiska termer' : 'Quadratic terms'}</legend>
                {numericColumns
                  .filter((column) => predictorColumnIds.includes(column.id))
                  .map((column) => (
                    <label key={column.id}>
                      <input
                        type="checkbox"
                        checked={quadraticPredictorIds.includes(column.id)}
                        onChange={() =>
                          setQuadraticPredictorIds((current) =>
                            current.includes(column.id)
                              ? current.filter((id) => id !== column.id)
                              : [...current, column.id],
                          )
                        }
                      />
                      {column.id} · {column.name}²
                    </label>
                  ))}
              </fieldset>
            )}
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
                ? 'Kategorier treatment-kodas med första nivån som referens. Val kan expandera till högst 12 modelltermer; saknade rader utesluts.'
                : 'Categories use treatment coding with the first level as reference. Selections may expand to at most 12 model terms; incomplete rows are excluded.'}
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
                disabled={numericColumns.length === 0 || availablePredictors.length < 2}
              >
                {isSwedish ? 'Kör regression' : 'Run regression'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
