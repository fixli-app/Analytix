import { useEffect, useMemo, useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { FactorDefinition } from '../doe/twoLevelFactorial'
import type { SheetColumn } from '../store/workbook'

export type TwoLevelFactorialRequest =
  | {
      kind: 'create'
      factors: FactorDefinition[]
      replicates: number
      centerPoints: number
      randomize: boolean
      seed: number
    }
  | {
      kind: 'analyze'
      responseColumnId: string
      factorColumnIds: string[]
      alpha: number
    }

interface TwoLevelFactorialDialogProps {
  open: boolean
  columns: SheetColumn[]
  language: string
  onOpenChange: (open: boolean) => void
  onSubmit: (request: TwoLevelFactorialRequest) => void
}

export function TwoLevelFactorialDialog({
  open,
  columns,
  language,
  onOpenChange,
  onSubmit,
}: TwoLevelFactorialDialogProps) {
  const [tab, setTab] = useState<'create' | 'analyze'>('create')
  const [factors, setFactors] = useState<FactorDefinition[]>([
    { name: 'A', low: -1, high: 1 },
    { name: 'B', low: -1, high: 1 },
  ])
  const [replicates, setReplicates] = useState('1')
  const [centerPoints, setCenterPoints] = useState('2')
  const [randomize, setRandomize] = useState(true)
  const [seed, setSeed] = useState('42')
  const [responseColumnId, setResponseColumnId] = useState('')
  const [factorColumnIds, setFactorColumnIds] = useState<string[]>([])
  const [alpha, setAlpha] = useState('0.05')
  const [error, setError] = useState('')
  const isSwedish = language === 'sv'
  const numericColumns = useMemo(
    () => columns.filter((column) => column.type === 'numeric'),
    [columns],
  )

  useEffect(() => {
    if (!open) return
    setTab('create')
    setFactors([
      { name: 'A', low: -1, high: 1 },
      { name: 'B', low: -1, high: 1 },
    ])
    setReplicates('1')
    setCenterPoints('2')
    setRandomize(true)
    setSeed('42')
    setResponseColumnId(numericColumns[0]?.id ?? '')
    setFactorColumnIds(numericColumns.slice(1, 3).map((column) => column.id))
    setAlpha('0.05')
    setError('')
  }, [numericColumns, open])

  function updateFactor(index: number, field: keyof FactorDefinition, value: string) {
    setFactors((current) =>
      current.map((factor, factorIndex) =>
        factorIndex === index
          ? { ...factor, [field]: field === 'name' ? value : Number(value) }
          : factor,
      ),
    )
  }

  function changeFactorCount(value: string) {
    const count = Number(value)
    setFactors((current) =>
      Array.from(
        { length: count },
        (_, index) => current[index] ?? { name: `X${index + 1}`, low: -1, high: 1 },
      ),
    )
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (tab === 'create') {
      const replicateCount = Number(replicates)
      const centerCount = Number(centerPoints)
      const randomSeed = Number(seed)
      const normalizedNames = factors.map((factor) => factor.name.trim().toLocaleLowerCase())
      if (
        factors.some(
          (factor) =>
            !factor.name.trim() ||
            !Number.isFinite(factor.low) ||
            !Number.isFinite(factor.high) ||
            factor.low >= factor.high,
        ) ||
        new Set(normalizedNames).size !== normalizedNames.length ||
        !Number.isInteger(replicateCount) ||
        replicateCount < 1 ||
        !Number.isInteger(centerCount) ||
        centerCount < 0 ||
        !Number.isSafeInteger(randomSeed) ||
        randomSeed < 0 ||
        randomSeed > 0xffffffff
      ) {
        setError(
          isSwedish
            ? 'Kontrollera faktornamn, nivåer, replikat och seed.'
            : 'Check factor names, levels, replicates, and seed.',
        )
        return
      }
      onSubmit({
        kind: 'create',
        factors: factors.map((factor) => ({ ...factor, name: factor.name.trim() })),
        replicates: replicateCount,
        centerPoints: centerCount,
        randomize,
        seed: randomSeed,
      })
    } else {
      const significance = Number(alpha)
      if (
        factorColumnIds.length < 2 ||
        factorColumnIds.length > 8 ||
        factorColumnIds.includes(responseColumnId) ||
        !Number.isFinite(significance) ||
        significance <= 0 ||
        significance >= 1
      ) {
        setError(
          isSwedish
            ? 'Välj ett svar, 2–8 faktorer och en giltig α-nivå.'
            : 'Choose a response, 2–8 factors, and a valid alpha level.',
        )
        return
      }
      onSubmit({ kind: 'analyze', responseColumnId, factorColumnIds, alpha: significance })
    }
    onOpenChange(false)
  }

  function toggleFactor(id: string) {
    setFactorColumnIds((current) =>
      current.includes(id) ? current.filter((columnId) => columnId !== id) : [...current, id],
    )
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content doe-dialog">
          <div className="dialog-heading">
            <div>
              <Dialog.Title className="dialog-title">
                {isSwedish ? '2-nivåers faktorförsök' : 'Two-level factorial DOE'}
              </Dialog.Title>
              <Dialog.Description className="dialog-description">
                {isSwedish
                  ? 'Skapa en randomiserad fullfaktoriell design eller analysera svar med alla huvudeffekter och interaktioner.'
                  : 'Create a randomized full factorial design or analyze responses with all main effects and interactions.'}
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
          <div className="doe-tabs" role="tablist" aria-label={isSwedish ? 'DOE-läge' : 'DOE mode'}>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'create'}
              onClick={() => {
                setTab('create')
                setError('')
              }}
            >
              {isSwedish ? 'Skapa design' : 'Create design'}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'analyze'}
              onClick={() => {
                setTab('analyze')
                setError('')
              }}
            >
              {isSwedish ? 'Analysera design' : 'Analyze design'}
            </button>
          </div>
          <form onSubmit={submit}>
            {tab === 'create' ? (
              <>
                <div className="doe-parameters">
                  <label className="dialog-field">
                    <span>{isSwedish ? 'Antal faktorer' : 'Number of factors'}</span>
                    <select
                      value={factors.length}
                      onChange={(event) => changeFactorCount(event.target.value)}
                    >
                      {Array.from({ length: 7 }, (_, index) => index + 2).map((count) => (
                        <option value={count} key={count}>
                          {count}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="dialog-field">
                    <span>{isSwedish ? 'Replikat' : 'Replicates'}</span>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={replicates}
                      onChange={(event) => setReplicates(event.target.value)}
                      required
                    />
                  </label>
                  <label className="dialog-field">
                    <span>{isSwedish ? 'Centrumkörningar' : 'Center points'}</span>
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      value={centerPoints}
                      onChange={(event) => setCenterPoints(event.target.value)}
                      required
                    />
                  </label>
                </div>
                <div className="doe-factor-list">
                  {factors.map((factor, index) => (
                    <div className="doe-factor-row" key={index}>
                      <label className="dialog-field">
                        <span>{isSwedish ? `Faktor ${index + 1}` : `Factor ${index + 1}`}</span>
                        <input
                          value={factor.name}
                          onChange={(event) => updateFactor(index, 'name', event.target.value)}
                          required
                        />
                      </label>
                      <label className="dialog-field">
                        <span>{isSwedish ? 'Låg nivå' : 'Low level'}</span>
                        <input
                          type="number"
                          step="any"
                          value={factor.low}
                          onChange={(event) => updateFactor(index, 'low', event.target.value)}
                          required
                        />
                      </label>
                      <label className="dialog-field">
                        <span>{isSwedish ? 'Hög nivå' : 'High level'}</span>
                        <input
                          type="number"
                          step="any"
                          value={factor.high}
                          onChange={(event) => updateFactor(index, 'high', event.target.value)}
                          required
                        />
                      </label>
                    </div>
                  ))}
                </div>
                <div className="doe-parameters">
                  <label className="dialog-field">
                    <span>{isSwedish ? 'Slumpfrö' : 'Random seed'}</span>
                    <input
                      type="number"
                      min="0"
                      max="4294967295"
                      value={seed}
                      onChange={(event) => setSeed(event.target.value)}
                      required
                    />
                  </label>
                  <label className="doe-check">
                    <input
                      type="checkbox"
                      checked={randomize}
                      onChange={(event) => setRandomize(event.target.checked)}
                    />
                    {isSwedish ? 'Randomisera körordning' : 'Randomize run order'}
                  </label>
                </div>
              </>
            ) : (
              <>
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
                <fieldset className="doe-factor-select">
                  <legend>
                    {isSwedish
                      ? 'Faktorer, välj 2–8 numeriska kolumner'
                      : 'Factors, select 2–8 numeric columns'}
                  </legend>
                  {numericColumns
                    .filter((column) => column.id !== responseColumnId)
                    .map((column) => (
                      <label key={column.id}>
                        <input
                          type="checkbox"
                          checked={factorColumnIds.includes(column.id)}
                          onChange={() => toggleFactor(column.id)}
                        />
                        {column.id} · {column.name}
                      </label>
                    ))}
                </fieldset>
                <label className="dialog-field">
                  <span>{isSwedish ? 'Signifikansnivå (α)' : 'Significance level (alpha)'}</span>
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
                    ? 'Kräver alla 2ᵏ fullfaktoriella hörn och replikat eller centrumkörningar för att skatta fel. Modellen är ej oberoende referensverifierad.'
                    : 'Requires all 2^k full-factorial corners and replicates or center points to estimate error. Model is not independently reference-verified.'}
                </p>
              </>
            )}
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
                disabled={tab === 'analyze' && numericColumns.length < 3}
              >
                {tab === 'create'
                  ? isSwedish
                    ? 'Skapa arbetsblad'
                    : 'Create worksheet'
                  : isSwedish
                    ? 'Kör DOE-analys'
                    : 'Run DOE analysis'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
