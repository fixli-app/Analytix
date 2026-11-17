import { useEffect, useMemo, useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { SheetColumn } from '../store/workbook'
import type { AttributeControlChartKind } from '../quality/advancedControlCharts'

export type AdvancedControlChartRequest =
  | {
      kind: 'attribute'
      chartKind: AttributeControlChartKind
      countColumnId: string
      sizeColumnId?: string
      constantSampleSize?: number
    }
  | {
      kind: 'cusum'
      columnId: string
      target: number
      sigma: number
      referenceValue: number
      decisionInterval: number
    }
  | {
      kind: 'ewma'
      columnId: string
      target: number
      sigma: number
      lambda: number
      width: number
    }
  | {
      kind: 'zmr'
      columnId: string
      target: number
      sigma: number
    }

interface AdvancedControlChartDialogProps {
  open: boolean
  columns: SheetColumn[]
  initialColumn: string
  language: string
  onOpenChange: (open: boolean) => void
  onSubmit: (request: AdvancedControlChartRequest) => void
}

type ChartSelection = AttributeControlChartKind | 'cusum' | 'ewma' | 'zmr'

const chartLabels: Record<ChartSelection, [string, string]> = {
  p: ['P-diagram', 'P chart'],
  pPrime: ['P′-diagram (Laney)', 'P′ chart (Laney)'],
  np: ['NP-diagram', 'NP chart'],
  c: ['C-diagram', 'C chart'],
  u: ['U-diagram', 'U chart'],
  uPrime: ['U′-diagram (Laney)', 'U′ chart (Laney)'],
  cusum: ['CUSUM', 'CUSUM'],
  ewma: ['EWMA', 'EWMA'],
  zmr: ['Z-MR', 'Z-MR'],
}

export function AdvancedControlChartDialog({
  open,
  columns,
  initialColumn,
  language,
  onOpenChange,
  onSubmit,
}: AdvancedControlChartDialogProps) {
  const isSwedish = language === 'sv'
  const numericColumns = useMemo(
    () => columns.filter((column) => column.type === 'numeric'),
    [columns],
  )
  const [chart, setChart] = useState<ChartSelection>('p')
  const [countColumnId, setCountColumnId] = useState(initialColumn)
  const [sizeColumnId, setSizeColumnId] = useState('')
  const [constantSampleSize, setConstantSampleSize] = useState('100')
  const [target, setTarget] = useState('0')
  const [sigma, setSigma] = useState('1')
  const [referenceValue, setReferenceValue] = useState('0.5')
  const [decisionInterval, setDecisionInterval] = useState('5')
  const [lambda, setLambda] = useState('0.2')
  const [width, setWidth] = useState('3')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setChart('p')
    setCountColumnId(
      numericColumns.some((column) => column.id === initialColumn)
        ? initialColumn
        : (numericColumns[0]?.id ?? ''),
    )
    setSizeColumnId(numericColumns[1]?.id ?? numericColumns[0]?.id ?? '')
    setConstantSampleSize('100')
    setTarget('0')
    setSigma('1')
    setReferenceValue('0.5')
    setDecisionInterval('5')
    setLambda('0.2')
    setWidth('3')
    setError('')
  }, [initialColumn, numericColumns, open])

  const selectedCountColumn = numericColumns.some((column) => column.id === countColumnId)
    ? countColumnId
    : (numericColumns[0]?.id ?? '')
  const selectedSizeColumn = numericColumns.some((column) => column.id === sizeColumnId)
    ? sizeColumnId
    : (numericColumns[1]?.id ?? numericColumns[0]?.id ?? '')
  const usesAttributeChart = ['p', 'pPrime', 'np', 'c', 'u', 'uPrime'].includes(chart)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (usesAttributeChart) {
      if (!selectedCountColumn) return
      if (chart === 'p' || chart === 'pPrime' || chart === 'u' || chart === 'uPrime') {
        if (!selectedSizeColumn || selectedCountColumn === selectedSizeColumn) return
        onSubmit({
          kind: 'attribute',
          chartKind: chart,
          countColumnId: selectedCountColumn,
          sizeColumnId: selectedSizeColumn,
        })
      } else if (chart === 'np') {
        const sampleSize = Number(constantSampleSize)
        if (!Number.isInteger(sampleSize) || sampleSize < 1) {
          setError(
            isSwedish
              ? 'Stickprovsstorleken måste vara ett positivt heltal.'
              : 'Sample size must be a positive integer.',
          )
          return
        }
        onSubmit({
          kind: 'attribute',
          chartKind: chart,
          countColumnId: selectedCountColumn,
          constantSampleSize: sampleSize,
        })
      } else if (chart === 'c') {
        onSubmit({ kind: 'attribute', chartKind: chart, countColumnId: selectedCountColumn })
      } else {
        return
      }
    } else {
      const selectedTarget = Number(target)
      const selectedSigma = Number(sigma)
      if (
        !selectedCountColumn ||
        !Number.isFinite(selectedTarget) ||
        !Number.isFinite(selectedSigma)
      )
        return
      if (chart === 'cusum') {
        const k = Number(referenceValue)
        const h = Number(decisionInterval)
        if (!Number.isFinite(k) || !Number.isFinite(h) || k <= 0 || h <= 0) {
          setError(
            isSwedish
              ? 'CUSUM k och h måste vara större än 0.'
              : 'CUSUM k and h must be greater than 0.',
          )
          return
        }
        onSubmit({
          kind: 'cusum',
          columnId: selectedCountColumn,
          target: selectedTarget,
          sigma: selectedSigma,
          referenceValue: k,
          decisionInterval: h,
        })
      } else if (chart === 'ewma') {
        const smoothing = Number(lambda)
        const limitWidth = Number(width)
        if (
          !Number.isFinite(smoothing) ||
          smoothing <= 0 ||
          smoothing > 1 ||
          !Number.isFinite(limitWidth) ||
          limitWidth <= 0
        ) {
          setError(
            isSwedish
              ? 'EWMA λ måste vara inom (0, 1] och L måste vara större än 0.'
              : 'EWMA λ must be in (0, 1] and L must be greater than 0.',
          )
          return
        }
        onSubmit({
          kind: 'ewma',
          columnId: selectedCountColumn,
          target: selectedTarget,
          sigma: selectedSigma,
          lambda: smoothing,
          width: limitWidth,
        })
      } else {
        onSubmit({
          kind: 'zmr',
          columnId: selectedCountColumn,
          target: selectedTarget,
          sigma: selectedSigma,
        })
      }
    }
    onOpenChange(false)
  }

  function options() {
    return numericColumns.map((column) => (
      <option value={column.id} key={column.id}>
        {column.id} · {column.name}
      </option>
    ))
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content advanced-control-dialog">
          <div className="dialog-heading">
            <div>
              <Dialog.Title className="dialog-title">
                {isSwedish
                  ? 'Attribut-, CUSUM-, EWMA- och Z-MR-diagram'
                  : 'Attribute, CUSUM, EWMA, and Z-MR charts'}
              </Dialog.Title>
              <Dialog.Description className="dialog-description">
                {isSwedish
                  ? 'Välj ett styrdiagram och kolumner för mätningar eller defekter.'
                  : 'Choose a control chart and columns for measurements or defects.'}
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
                value={chart}
                onChange={(event) => setChart(event.target.value as ChartSelection)}
              >
                {(Object.keys(chartLabels) as ChartSelection[]).map((kind) => (
                  <option value={kind} key={kind}>
                    {chartLabels[kind][isSwedish ? 0 : 1]}
                  </option>
                ))}
              </select>
            </label>
            <label className="dialog-field">
              <span>
                {usesAttributeChart
                  ? isSwedish
                    ? 'Defektantal'
                    : 'Defect count'
                  : isSwedish
                    ? 'Mätkolumn'
                    : 'Measurement column'}
              </span>
              <select
                value={selectedCountColumn}
                onChange={(event) => setCountColumnId(event.target.value)}
              >
                {options()}
              </select>
            </label>
            {(chart === 'p' || chart === 'pPrime' || chart === 'u' || chart === 'uPrime') && (
              <label className="dialog-field">
                <span>
                  {chart === 'p' || chart === 'pPrime'
                    ? isSwedish
                      ? 'Stickprovsstorlek per subgrupp'
                      : 'Sample size per subgroup'
                    : isSwedish
                      ? 'Antal enheter / möjligheter'
                      : 'Units / opportunities'}
                </span>
                <select
                  value={selectedSizeColumn}
                  onChange={(event) => setSizeColumnId(event.target.value)}
                >
                  {options()}
                </select>
              </label>
            )}
            {chart === 'np' && (
              <label className="dialog-field">
                <span>{isSwedish ? 'Konstant stickprovsstorlek' : 'Constant sample size'}</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={constantSampleSize}
                  onChange={(event) => setConstantSampleSize(event.target.value)}
                  required
                />
              </label>
            )}
            {(chart === 'cusum' || chart === 'ewma' || chart === 'zmr') && (
              <div className="data-operation-grid">
                <label className="dialog-field">
                  <span>{isSwedish ? 'Mål / centrum' : 'Target / center'}</span>
                  <input
                    type="number"
                    step="any"
                    value={target}
                    onChange={(event) => setTarget(event.target.value)}
                    required
                  />
                </label>
                <label className="dialog-field">
                  <span>{isSwedish ? 'Känd σ' : 'Known σ'}</span>
                  <input
                    type="number"
                    min="0.000001"
                    step="any"
                    value={sigma}
                    onChange={(event) => setSigma(event.target.value)}
                    required
                  />
                </label>
              </div>
            )}
            {chart === 'cusum' && (
              <div className="data-operation-grid">
                <label className="dialog-field">
                  <span>k</span>
                  <input
                    type="number"
                    min="0.000001"
                    step="any"
                    value={referenceValue}
                    onChange={(event) => setReferenceValue(event.target.value)}
                    required
                  />
                </label>
                <label className="dialog-field">
                  <span>h</span>
                  <input
                    type="number"
                    min="0.000001"
                    step="any"
                    value={decisionInterval}
                    onChange={(event) => setDecisionInterval(event.target.value)}
                    required
                  />
                </label>
              </div>
            )}
            {chart === 'ewma' && (
              <div className="data-operation-grid">
                <label className="dialog-field">
                  <span>λ</span>
                  <input
                    type="number"
                    min="0.0001"
                    max="1"
                    step="any"
                    value={lambda}
                    onChange={(event) => setLambda(event.target.value)}
                    required
                  />
                </label>
                <label className="dialog-field">
                  <span>L</span>
                  <input
                    type="number"
                    min="0.0001"
                    step="any"
                    value={width}
                    onChange={(event) => setWidth(event.target.value)}
                    required
                  />
                </label>
              </div>
            )}
            {error && (
              <p className="quality-error" role="alert">
                {error}
              </p>
            )}
            <p className="session-caption">
              {['p', 'pPrime', 'np', 'c', 'u', 'uPrime'].includes(chart)
                ? isSwedish
                  ? 'Attributdiagram använder 3σ-gränser; P/U med varierande nämnare får subgruppsspecifika gränser. Data måste vara kompletta heltalsräkningar.'
                  : 'Attribute charts use 3σ limits; P/U charts with varying denominators use subgroup-specific limits. Counts must be complete integers.'
                : chart === 'cusum'
                  ? isSwedish
                    ? 'Tvåsidig standardiserad tabell-CUSUM med beslutströskel h och referensvärde k. σ anges av användaren.'
                    : 'Two-sided standardized tabular CUSUM with decision interval h and reference value k. σ is user-specified.'
                  : chart === 'ewma'
                    ? isSwedish
                      ? 'EWMA-gränser varierar med tid och närmar sig stationära gränser. λ, L och σ anges av användaren.'
                      : 'EWMA limits vary over time and approach steady-state limits. λ, L, and σ are user-specified.'
                    : isSwedish
                      ? 'Z-diagram standardiserar mätningar med användarangivet mål och σ; MR-z använder 3,267 × genomsnittlig absolut intilliggande differens.'
                      : 'The Z chart standardizes measurements using the user-specified target and σ; MR-z uses 3.267 times the average adjacent absolute difference.'}
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
                disabled={numericColumns.length === 0}
              >
                {isSwedish ? 'Kör styrdiagram' : 'Run control chart'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
