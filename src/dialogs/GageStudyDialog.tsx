import { useEffect, useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { SheetColumn } from '../store/workbook'

export type GageStudyRequest =
  | {
      kind: 'type1'
      measurementColumnId: string
      referenceValue: number
      tolerance: number
      alpha: number
    }
  | {
      kind: 'linearity'
      referenceColumnId: string
      measurementColumnId: string
      alpha: number
    }
  | {
      kind: 'nested'
      partColumnId: string
      operatorColumnId: string
      measurementColumnId: string
      tolerance: number | null
    }
  | {
      kind: 'runChart'
      partColumnId: string
      operatorColumnId: string
      measurementColumnId: string
    }

interface GageStudyDialogProps {
  open: boolean
  numericColumns: SheetColumn[]
  categoryColumns: SheetColumn[]
  language: string
  onOpenChange: (open: boolean) => void
  onSubmit: (request: GageStudyRequest) => void
}

type GageStudyMode = GageStudyRequest['kind']

export function GageStudyDialog({
  open,
  numericColumns,
  categoryColumns,
  language,
  onOpenChange,
  onSubmit,
}: GageStudyDialogProps) {
  const isSwedish = language === 'sv'
  const [mode, setMode] = useState<GageStudyMode>('type1')
  const [measurementColumnId, setMeasurementColumnId] = useState('')
  const [referenceColumnId, setReferenceColumnId] = useState('')
  const [partColumnId, setPartColumnId] = useState('')
  const [operatorColumnId, setOperatorColumnId] = useState('')
  const [referenceValue, setReferenceValue] = useState('0')
  const [tolerance, setTolerance] = useState('1')
  const [alpha, setAlpha] = useState('0.05')

  useEffect(() => {
    if (!open) return
    setMode('type1')
    setMeasurementColumnId(numericColumns[0]?.id ?? '')
    setReferenceColumnId(numericColumns[1]?.id ?? numericColumns[0]?.id ?? '')
    setPartColumnId(categoryColumns[0]?.id ?? '')
    setOperatorColumnId(categoryColumns[1]?.id ?? categoryColumns[0]?.id ?? '')
    setReferenceValue('0')
    setTolerance('1')
    setAlpha('0.05')
  }, [categoryColumns, numericColumns, open])

  const selectedReference = numericColumns.some((column) => column.id === referenceColumnId)
    ? referenceColumnId
    : (numericColumns[0]?.id ?? '')
  const selectedMeasurement = numericColumns.some((column) => column.id === measurementColumnId)
    ? measurementColumnId
    : (numericColumns[0]?.id ?? '')
  const selectedPart = categoryColumns.some((column) => column.id === partColumnId)
    ? partColumnId
    : (categoryColumns[0]?.id ?? '')
  const selectedOperator = categoryColumns.some((column) => column.id === operatorColumnId)
    ? operatorColumnId
    : (categoryColumns[1]?.id ?? categoryColumns[0]?.id ?? '')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const significance = Number(alpha)
    if (!Number.isFinite(significance) || significance <= 0 || significance >= 1) return
    if (!selectedMeasurement) return
    if (mode === 'type1') {
      const target = Number(referenceValue)
      const toleranceValue = Number(tolerance)
      if (!Number.isFinite(target) || !Number.isFinite(toleranceValue) || toleranceValue <= 0) {
        return
      }
      onSubmit({
        kind: mode,
        measurementColumnId: selectedMeasurement,
        referenceValue: target,
        tolerance: toleranceValue,
        alpha: significance,
      })
    } else if (mode === 'linearity') {
      if (!selectedReference || selectedReference === selectedMeasurement) return
      onSubmit({
        kind: mode,
        referenceColumnId: selectedReference,
        measurementColumnId: selectedMeasurement,
        alpha: significance,
      })
    } else {
      const toleranceValue = tolerance.trim() === '' ? null : Number(tolerance)
      if (
        !selectedPart ||
        !selectedOperator ||
        selectedPart === selectedOperator ||
        (toleranceValue !== null && (!Number.isFinite(toleranceValue) || toleranceValue <= 0))
      ) {
        return
      }
      onSubmit({
        kind: 'nested',
        partColumnId: selectedPart,
        operatorColumnId: selectedOperator,
        measurementColumnId: selectedMeasurement,
        tolerance: toleranceValue,
      })
    }
    onOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content gage-study-dialog">
          <div className="dialog-heading">
            <div>
              <Dialog.Title className="dialog-title">
                {isSwedish ? 'Type 1 Gage / Bias & Linearity' : 'Type 1 Gage / Bias & Linearity'}
              </Dialog.Title>
              <Dialog.Description className="dialog-description">
                {isSwedish
                  ? 'Utvärdera repeterbarhet mot en referens eller kontrollera bias över mätområdet.'
                  : 'Evaluate repeatability against a reference or check bias across the measurement range.'}
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
          <div className="data-operation-tabs" role="tablist" aria-label="Gage study mode">
            <button
              className="data-operation-tab"
              type="button"
              role="tab"
              aria-selected={mode === 'type1'}
              onClick={() => setMode('type1')}
            >
              Type 1
            </button>
            <button
              className="data-operation-tab"
              type="button"
              role="tab"
              aria-selected={mode === 'linearity'}
              onClick={() => setMode('linearity')}
            >
              {isSwedish ? 'Bias / Linearity' : 'Bias / Linearity'}
            </button>
            <button
              className="data-operation-tab"
              type="button"
              role="tab"
              aria-selected={mode === 'nested'}
              onClick={() => setMode('nested')}
            >
              {isSwedish ? 'Nested R&R' : 'Nested R&R'}
            </button>
            <button
              className="data-operation-tab"
              type="button"
              role="tab"
              aria-selected={mode === 'runChart'}
              onClick={() => setMode('runChart')}
            >
              {isSwedish ? 'Gage Run Chart' : 'Gage Run Chart'}
            </button>
          </div>
          <form onSubmit={submit}>
            {mode === 'type1' ? (
              <>
                <label className="dialog-field">
                  <span>{isSwedish ? 'Mätkolumn' : 'Measurement column'}</span>
                  <select
                    value={selectedMeasurement}
                    onChange={(event) => setMeasurementColumnId(event.target.value)}
                  >
                    {numericColumns.map((column) => (
                      <option value={column.id} key={column.id}>
                        {column.id} · {column.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="data-operation-grid">
                  <label className="dialog-field">
                    <span>{isSwedish ? 'Referensvärde' : 'Reference value'}</span>
                    <input
                      type="number"
                      step="any"
                      value={referenceValue}
                      onChange={(event) => setReferenceValue(event.target.value)}
                      required
                    />
                  </label>
                  <label className="dialog-field">
                    <span>{isSwedish ? 'Tolerans (USL − LSL)' : 'Tolerance (USL − LSL)'}</span>
                    <input
                      type="number"
                      min="0.000001"
                      step="any"
                      value={tolerance}
                      onChange={(event) => setTolerance(event.target.value)}
                      required
                    />
                  </label>
                </div>
              </>
            ) : mode === 'linearity' ? (
              <>
                <label className="dialog-field">
                  <span>{isSwedish ? 'Referensnivåkolumn' : 'Reference level column'}</span>
                  <select
                    value={selectedReference}
                    onChange={(event) => setReferenceColumnId(event.target.value)}
                  >
                    {numericColumns.map((column) => (
                      <option value={column.id} key={column.id}>
                        {column.id} · {column.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="dialog-field">
                  <span>{isSwedish ? 'Mätkolumn' : 'Measurement column'}</span>
                  <select
                    value={selectedMeasurement}
                    onChange={(event) => setMeasurementColumnId(event.target.value)}
                  >
                    {numericColumns.map((column) => (
                      <option value={column.id} key={column.id}>
                        {column.id} · {column.name}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : (
              <>
                <label className="dialog-field">
                  <span>
                    {mode === 'nested'
                      ? isSwedish
                        ? 'Del / prov (nestad)'
                        : 'Part (nested)'
                      : isSwedish
                        ? 'Del / prov'
                        : 'Part'}
                  </span>
                  <select
                    value={selectedPart}
                    onChange={(event) => setPartColumnId(event.target.value)}
                  >
                    {categoryColumns.map((column) => (
                      <option value={column.id} key={column.id}>
                        {column.id} · {column.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="dialog-field">
                  <span>{isSwedish ? 'Operatör / bedömare' : 'Operator / appraiser'}</span>
                  <select
                    value={selectedOperator}
                    onChange={(event) => setOperatorColumnId(event.target.value)}
                  >
                    {categoryColumns.map((column) => (
                      <option value={column.id} key={column.id}>
                        {column.id} · {column.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="dialog-field">
                  <span>{isSwedish ? 'Mätkolumn' : 'Measurement column'}</span>
                  <select
                    value={selectedMeasurement}
                    onChange={(event) => setMeasurementColumnId(event.target.value)}
                  >
                    {numericColumns.map((column) => (
                      <option value={column.id} key={column.id}>
                        {column.id} · {column.name}
                      </option>
                    ))}
                  </select>
                </label>
                {mode === 'nested' && (
                  <label className="dialog-field">
                    <span>{isSwedish ? 'Tolerans (valfri)' : 'Tolerance (optional)'}</span>
                    <input
                      type="number"
                      min="0.000001"
                      step="any"
                      value={tolerance}
                      onChange={(event) => setTolerance(event.target.value)}
                    />
                  </label>
                )}
              </>
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
              {mode === 'type1'
                ? isSwedish
                  ? 'Cg använder 20 % av toleransen för repeterbarhet; Cgk använder 10 % för bias. Gränserna är riktlinjer, inte automatisk acceptans.'
                  : 'Cg uses 20% of tolerance for repeatability; Cgk uses 10% for bias. These are guidelines, not automatic acceptance.'
                : mode === 'linearity'
                  ? isSwedish
                    ? 'Bias definieras som mätning − referens. Linjäritet skattas som OLS-lutningen för bias mot referensnivå.'
                    : 'Bias is measurement − reference. Linearity is estimated as the OLS slope of bias versus reference level.'
                  : mode === 'nested'
                    ? isSwedish
                      ? 'Delar är nestade inom operatör; samma antal delar och replikat krävs per operatör. Operatör × del är inte separat skattningsbar.'
                      : 'Parts are nested within operators; the same number of parts and replicates is required per operator. Operator × part is not separately estimable.'
                    : isSwedish
                      ? 'Plottar varje mätning i ett komplett crossed-upplägg. Minst två delar, operatörer och replikat per kombination krävs; diagrammet skattar inga varianskomponenter.'
                      : 'Plots each measurement in a complete crossed layout. At least two parts, operators, and replicates per combination are required; the chart does not estimate variance components.'}
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
                  numericColumns.length < (mode === 'linearity' ? 2 : 1) ||
                  ((mode === 'nested' || mode === 'runChart') && categoryColumns.length < 2)
                }
              >
                {mode === 'type1'
                  ? isSwedish
                    ? 'Kör Type 1-studie'
                    : 'Run Type 1 study'
                  : mode === 'linearity'
                    ? isSwedish
                      ? 'Kör Bias/Linearity'
                      : 'Run Bias/Linearity'
                    : mode === 'nested'
                      ? isSwedish
                        ? 'Kör Nested R&R'
                        : 'Run Nested R&R'
                      : isSwedish
                        ? 'Visa Gage Run Chart'
                        : 'Show Gage Run Chart'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
