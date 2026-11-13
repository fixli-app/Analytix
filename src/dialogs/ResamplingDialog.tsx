import { useEffect, useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { SheetColumn } from '../store/workbook'
import type {
  BootstrapIntervalResult,
  BootstrapStatistic,
  PermutationDifferenceResult,
  PermutationStatistic,
} from '../stats/resampling'

export type ResamplingRequest =
  | {
      kind: 'bootstrap'
      column: string
      statistic: BootstrapStatistic
      resamples: number
      seed: number
      alpha: number
    }
  | {
      kind: 'permutation'
      column1: string
      column2: string
      permutations: number
      statistic: PermutationStatistic
      seed: number
      alpha: number
    }

export type ResamplingResult =
  | { kind: 'bootstrap'; result: BootstrapIntervalResult }
  | { kind: 'permutation'; result: PermutationDifferenceResult }

interface ResamplingDialogProps {
  open: boolean
  columns: SheetColumn[]
  initialColumn1: string
  initialColumn2: string
  language: string
  onOpenChange: (open: boolean) => void
  onSubmit: (request: ResamplingRequest) => void
}

type Method = 'bootstrap' | 'permutation'

export function ResamplingDialog({
  open,
  columns,
  initialColumn1,
  initialColumn2,
  language,
  onOpenChange,
  onSubmit,
}: ResamplingDialogProps) {
  const [method, setMethod] = useState<Method>('bootstrap')
  const [column1, setColumn1] = useState(initialColumn1)
  const [column2, setColumn2] = useState(initialColumn2)
  const [statistic, setStatistic] = useState<BootstrapStatistic>('mean')
  const [permutationStatistic, setPermutationStatistic] = useState<PermutationStatistic>('mean')
  const [iterations, setIterations] = useState('5000')
  const [seed, setSeed] = useState('42')
  const [alpha, setAlpha] = useState('0.05')
  const isSwedish = language === 'sv'

  useEffect(() => {
    if (!open) return
    setMethod('bootstrap')
    setColumn1(initialColumn1)
    setColumn2(initialColumn2)
    setStatistic('mean')
    setPermutationStatistic('mean')
    setIterations('5000')
    setSeed('42')
    setAlpha('0.05')
  }, [initialColumn1, initialColumn2, open])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const count = Number(iterations)
    const randomSeed = Number(seed)
    const significance = Number(alpha)
    if (
      !Number.isInteger(count) ||
      count < 100 ||
      count > 100_000 ||
      !Number.isInteger(randomSeed) ||
      randomSeed < 0 ||
      randomSeed > 0xffff_ffff ||
      !Number.isFinite(significance) ||
      significance <= 0 ||
      significance >= 1
    )
      return

    if (method === 'bootstrap') {
      if (!column1) return
      onSubmit({
        kind: 'bootstrap',
        column: column1,
        statistic,
        resamples: count,
        seed: randomSeed,
        alpha: significance,
      })
    } else {
      if (!column1 || !column2 || column1 === column2) return
      onSubmit({
        kind: 'permutation',
        column1,
        column2,
        permutations: count,
        statistic: permutationStatistic,
        seed: randomSeed,
        alpha: significance,
      })
    }
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
                {isSwedish ? 'Bootstrap och permutation' : 'Bootstrap and permutation'}
              </Dialog.Title>
              <Dialog.Description className="dialog-description">
                {isSwedish
                  ? 'Seedade resamplingsmetoder med begränsad beräkningsbudget.'
                  : 'Seeded resampling methods with a bounded computation budget.'}
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
          <div className="data-operation-tabs" role="tablist">
            <button
              className="data-operation-tab"
              type="button"
              role="tab"
              aria-selected={method === 'bootstrap'}
              onClick={() => setMethod('bootstrap')}
            >
              Bootstrap CI
            </button>
            <button
              className="data-operation-tab"
              type="button"
              role="tab"
              aria-selected={method === 'permutation'}
              onClick={() => setMethod('permutation')}
            >
              {isSwedish ? 'Permutationstest' : 'Permutation test'}
            </button>
          </div>
          <form onSubmit={submit}>
            <div className="data-operation-grid">
              <label className="dialog-field">
                <span>
                  {method === 'bootstrap'
                    ? isSwedish
                      ? 'Numerisk kolumn'
                      : 'Numeric column'
                    : isSwedish
                      ? 'Grupp 1'
                      : 'Group 1'}
                </span>
                <select value={column1} onChange={(event) => setColumn1(event.target.value)}>
                  {columns.map((column) => (
                    <option value={column.id} key={column.id}>
                      {column.id} · {column.name}
                    </option>
                  ))}
                </select>
              </label>
              {method === 'permutation' && (
                <label className="dialog-field">
                  <span>{isSwedish ? 'Grupp 2' : 'Group 2'}</span>
                  <select value={column2} onChange={(event) => setColumn2(event.target.value)}>
                    {columns.map((column) => (
                      <option value={column.id} key={column.id}>
                        {column.id} · {column.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            {method === 'bootstrap' && (
              <label className="dialog-field">
                <span>{isSwedish ? 'Skattning' : 'Statistic'}</span>
                <select
                  value={statistic}
                  onChange={(event) => setStatistic(event.target.value as BootstrapStatistic)}
                >
                  <option value="mean">{isSwedish ? 'Medelvärde' : 'Mean'}</option>
                  <option value="median">Median</option>
                  <option value="standardDeviation">
                    {isSwedish ? 'Standardavvikelse' : 'Standard deviation'}
                  </option>
                  <option value="variance">{isSwedish ? 'Varians' : 'Variance'}</option>
                </select>
              </label>
            )}
            {method === 'permutation' && (
              <label className="dialog-field">
                <span>{isSwedish ? 'Jämför statistik' : 'Compare statistic'}</span>
                <select
                  value={permutationStatistic}
                  onChange={(event) =>
                    setPermutationStatistic(event.target.value as PermutationStatistic)
                  }
                >
                  <option value="mean">{isSwedish ? 'Medelskillnad' : 'Mean difference'}</option>
                  <option value="median">
                    {isSwedish ? 'Medianskillnad' : 'Median difference'}
                  </option>
                </select>
              </label>
            )}
            <div className="data-operation-grid">
              <label className="dialog-field">
                <span>{isSwedish ? 'Resamplings' : 'Resamples'}</span>
                <input
                  type="number"
                  min="100"
                  max="100000"
                  step="1"
                  value={iterations}
                  onChange={(event) => setIterations(event.target.value)}
                  required
                />
              </label>
              <label className="dialog-field">
                <span>Seed</span>
                <input
                  type="number"
                  min="0"
                  max="4294967295"
                  step="1"
                  value={seed}
                  onChange={(event) => setSeed(event.target.value)}
                  required
                />
              </label>
            </div>
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
              {method === 'bootstrap'
                ? isSwedish
                  ? 'Percentilintervall med återläggning. Monte Carlo-gränserna kan variera med seed och antal resamplings.'
                  : 'Percentile interval with replacement. Monte Carlo bounds depend on seed and resample count.'
                : isSwedish
                  ? 'Tvåsidigt permutationstest; gruppernas storlekar bevaras. p = (extrema + 1)/(permutationer + 1).'
                  : 'Two-sided permutation test; group sizes are preserved. p = (extreme + 1)/(permutations + 1).'}
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
                disabled={columns.length === 0 || (method === 'permutation' && columns.length < 2)}
              >
                {isSwedish ? 'Kör resampling' : 'Run resampling'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
