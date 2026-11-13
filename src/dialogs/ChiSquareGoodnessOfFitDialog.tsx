import { useEffect, useMemo, useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Plus, X } from 'lucide-react'
import type { SheetColumn, SheetRow } from '../store/workbook'
import type { CategoryProbability } from '../stats/chiSquareGoodnessOfFit'

interface ChiSquareGoodnessOfFitDialogProps {
  open: boolean
  initialColumn: string
  columns: SheetColumn[]
  rows: SheetRow[]
  language: string
  onOpenChange: (open: boolean) => void
  onSubmit: (columnId: string, alpha: number, probabilities: CategoryProbability[] | null) => void
}

export function ChiSquareGoodnessOfFitDialog({
  open,
  initialColumn,
  columns,
  rows,
  language,
  onOpenChange,
  onSubmit,
}: ChiSquareGoodnessOfFitDialogProps) {
  const [columnId, setColumnId] = useState(initialColumn)
  const [alpha, setAlpha] = useState('0.05')
  const [probabilityMode, setProbabilityMode] = useState<'equal' | 'specified'>('equal')
  const [probabilityRows, setProbabilityRows] = useState<
    { category: string; probability: string }[]
  >([])
  const [error, setError] = useState('')
  const isSwedish = language === 'sv'
  const categories = useMemo(
    () =>
      [...new Set(rows.map((row) => row[columnId]?.trim() ?? '').filter(Boolean))].sort(
        (left, right) => left.localeCompare(right, 'sv'),
      ),
    [columnId, rows],
  )

  useEffect(() => {
    if (!open) return
    setColumnId(initialColumn)
    setProbabilityMode('equal')
    setProbabilityRows(
      categories.map((category) => ({
        category,
        probability: categories.length ? String(1 / categories.length) : '',
      })),
    )
    setError('')
  }, [categories, initialColumn, open])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const significance = Number(alpha)
    if (!columnId || !Number.isFinite(significance)) return
    let probabilities: CategoryProbability[] | null = null
    if (probabilityMode === 'specified') {
      probabilities = probabilityRows.map((item) => ({
        category: item.category.trim(),
        probability: Number(item.probability),
      }))
      const sum = probabilities.reduce((total, item) => total + item.probability, 0)
      if (
        probabilities.length < 2 ||
        probabilities.some(
          (item) => !item.category || !Number.isFinite(item.probability) || item.probability <= 0,
        ) ||
        new Set(probabilities.map((item) => item.category)).size !== probabilities.length ||
        Math.abs(sum - 1) > 1e-8
      ) {
        setError(
          isSwedish
            ? 'Ange unika kategorier och positiva sannolikheter som summerar till 1.'
            : 'Enter unique categories and positive probabilities that sum to 1.',
        )
        return
      }
    }
    onSubmit(columnId, significance, probabilities)
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
                {isSwedish ? 'Chi-två goodness-of-fit' : 'Chi-square goodness-of-fit'}
              </Dialog.Title>
              <Dialog.Description className="dialog-description">
                {isSwedish
                  ? 'Jämför observerade kategorifrekvenser med förväntade sannolikheter.'
                  : 'Compare observed category frequencies with expected probabilities.'}
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
              <span>{isSwedish ? 'Kategorikolumn' : 'Category column'}</span>
              <select value={columnId} onChange={(event) => setColumnId(event.target.value)}>
                {columns.map((column) => (
                  <option value={column.id} key={column.id}>
                    {column.id} · {column.name}
                  </option>
                ))}
              </select>
            </label>
            <div
              className="data-operation-tabs"
              role="group"
              aria-label={isSwedish ? 'Sannolikhetsmodell' : 'Probability model'}
            >
              <button
                className="data-operation-tab"
                type="button"
                aria-pressed={probabilityMode === 'equal'}
                onClick={() => setProbabilityMode('equal')}
              >
                {isSwedish ? 'Lika sannolikhet' : 'Equal probabilities'}
              </button>
              <button
                className="data-operation-tab"
                type="button"
                aria-pressed={probabilityMode === 'specified'}
                onClick={() => setProbabilityMode('specified')}
              >
                {isSwedish ? 'Ange sannolikheter' : 'Specify probabilities'}
              </button>
            </div>
            {probabilityMode === 'specified' ? (
              <div className="probability-list">
                {probabilityRows.map((item, index) => (
                  <div className="probability-row" key={index}>
                    <label className="dialog-field">
                      <span>{isSwedish ? 'Kategori' : 'Category'}</span>
                      <input
                        value={item.category}
                        onChange={(event) =>
                          setProbabilityRows((current) =>
                            current.map((row, rowIndex) =>
                              rowIndex === index ? { ...row, category: event.target.value } : row,
                            ),
                          )
                        }
                      />
                    </label>
                    <label className="dialog-field">
                      <span>{isSwedish ? 'Sannolikhet' : 'Probability'}</span>
                      <input
                        type="number"
                        min="0.0000001"
                        max="1"
                        step="any"
                        value={item.probability}
                        onChange={(event) =>
                          setProbabilityRows((current) =>
                            current.map((row, rowIndex) =>
                              rowIndex === index
                                ? { ...row, probability: event.target.value }
                                : row,
                            ),
                          )
                        }
                      />
                    </label>
                    <button
                      className="icon-button probability-remove"
                      type="button"
                      disabled={probabilityRows.length <= 2}
                      aria-label={
                        isSwedish ? `Ta bort kategori ${index + 1}` : `Remove category ${index + 1}`
                      }
                      title={isSwedish ? 'Ta bort kategori' : 'Remove category'}
                      onClick={() =>
                        setProbabilityRows((current) =>
                          current.filter((_, rowIndex) => rowIndex !== index),
                        )
                      }
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <button
                  className="dialog-button secondary add-condition"
                  type="button"
                  onClick={() =>
                    setProbabilityRows((current) => [...current, { category: '', probability: '' }])
                  }
                >
                  <Plus size={14} />
                  {isSwedish ? 'Lägg till kategori' : 'Add category'}
                </button>
                <p className="session-caption">
                  {isSwedish
                    ? 'Sannolikheterna måste summera till 1.'
                    : 'Probabilities must sum to 1.'}
                </p>
              </div>
            ) : (
              <p className="session-caption">
                {isSwedish
                  ? 'Nollhypotesen antar lika sannolikhet för varje observerad kategori.'
                  : 'The null hypothesis assumes equal probability for every observed category.'}
              </p>
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
            {error && (
              <p className="dialog-error" role="alert">
                {error}
              </p>
            )}
            <div className="dialog-actions">
              <Dialog.Close asChild>
                <button className="dialog-button secondary" type="button">
                  {isSwedish ? 'Avbryt' : 'Cancel'}
                </button>
              </Dialog.Close>
              <button
                className="dialog-button primary"
                type="submit"
                disabled={columns.length === 0}
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
