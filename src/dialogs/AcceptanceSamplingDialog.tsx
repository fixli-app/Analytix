import { useMemo, useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { GraphPlot } from '../charts/GraphPlot'
import type { GraphModel } from '../charts/graphData'
import {
  findAttributeSamplingPlan,
  type AttributeSamplingPlan,
} from '../quality/acceptanceSampling'

interface AcceptanceSamplingDialogProps {
  open: boolean
  language: string
  theme: 'light' | 'dark'
  onOpenChange: (open: boolean) => void
}

type CriteriaField = 'aql' | 'rql' | 'producerRisk' | 'consumerRisk' | 'maxSampleSize' | 'lotSize'

export function AcceptanceSamplingDialog({
  open,
  language,
  theme,
  onOpenChange,
}: AcceptanceSamplingDialogProps) {
  const [values, setValues] = useState<Record<CriteriaField, string>>({
    aql: '1',
    rql: '5',
    producerRisk: '5',
    consumerRisk: '10',
    maxSampleSize: '2000',
    lotSize: '',
  })
  const [plan, setPlan] = useState<AttributeSamplingPlan | null>(null)
  const [error, setError] = useState('')
  const isSwedish = language === 'sv'
  const percent = useMemo(
    () =>
      new Intl.NumberFormat(isSwedish ? 'sv-SE' : 'en-US', {
        style: 'percent',
        maximumFractionDigits: 2,
      }),
    [isSwedish],
  )
  const graph = useMemo<GraphModel | null>(() => {
    if (!plan) return null
    return {
      kind: 'ocCurve',
      title: isSwedish ? 'OC-kurva' : 'OC curve',
      xTitle: isSwedish ? 'Andel defekta (%)' : 'Percent defective (%)',
      yTitle: isSwedish ? 'Sannolikhet att acceptera' : 'Probability of acceptance',
      sampleCount: plan.ocCurve.length,
      sampleLabel: isSwedish
        ? `Stickprovsstorlek n = ${plan.sampleSize}, acceptanstal c = ${plan.acceptanceNumber}`
        : `Sample size n = ${plan.sampleSize}, acceptance number c = ${plan.acceptanceNumber}`,
      data: [
        {
          type: 'scatter',
          mode: 'lines',
          name: isSwedish ? 'Sannolikhet att acceptera' : 'Probability of acceptance',
          x: plan.ocCurve.map((point) => point.defectiveFraction * 100),
          y: plan.ocCurve.map((point) => point.probabilityOfAcceptance),
        },
      ],
      cumulativeAxis: false,
    }
  }, [isSwedish, plan])

  function updateField(field: CriteriaField, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    setPlan(null)
    setError('')
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const aql = Number(values.aql) / 100
    const rql = Number(values.rql) / 100
    const producerRisk = Number(values.producerRisk) / 100
    const consumerRisk = Number(values.consumerRisk) / 100
    const maxSampleSize = Number(values.maxSampleSize)
    const lotSize = values.lotSize.trim() === '' ? undefined : Number(values.lotSize)
    if (aql >= rql) {
      setError(isSwedish ? 'AQL måste vara lägre än RQL.' : 'AQL must be lower than RQL.')
      setPlan(null)
      return
    }
    if (!Number.isInteger(maxSampleSize) || maxSampleSize < 1 || maxSampleSize > 2000) {
      setError(
        isSwedish
          ? 'Maximal stickprovsstorlek måste vara ett heltal mellan 1 och 2 000.'
          : 'Maximum sample size must be an integer between 1 and 2,000.',
      )
      setPlan(null)
      return
    }
    if (lotSize !== undefined && (!Number.isInteger(lotSize) || lotSize < 2 || lotSize > 100000)) {
      setError(
        isSwedish
          ? 'Partistorlek måste vara ett heltal mellan 2 och 100 000.'
          : 'Lot size must be an integer between 2 and 100,000.',
      )
      setPlan(null)
      return
    }
    try {
      setPlan(
        findAttributeSamplingPlan({
          aql,
          rql,
          producerRisk,
          consumerRisk,
          maxSampleSize,
          ...(lotSize === undefined ? {} : { lotSize }),
        }),
      )
      setError('')
    } catch {
      setPlan(null)
      setError(
        isSwedish
          ? 'Ingen plan uppfyller båda riskkraven inom maximal stickprovsstorlek.'
          : 'No plan satisfies both risk requirements within the maximum sample size.',
      )
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <div className="dialog-heading">
            <div>
              <Dialog.Title className="dialog-title">
                {isSwedish ? 'Acceptansprovtagning för attribut' : 'Attribute acceptance sampling'}
              </Dialog.Title>
              <Dialog.Description className="dialog-description">
                {isSwedish
                  ? 'Hitta en enkelprovplan som uppfyller producent- och konsumentrisk.'
                  : 'Find a single-sampling plan that meets producer and consumer risk limits.'}
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
            <div className="dialog-grid">
              <label className="dialog-field">
                <span>AQL (%)</span>
                <input
                  type="number"
                  min="0"
                  max="99.99"
                  step="any"
                  required
                  value={values.aql}
                  onChange={(event) => updateField('aql', event.target.value)}
                />
              </label>
              <label className="dialog-field">
                <span>RQL / LTPD (%)</span>
                <input
                  type="number"
                  min="0.01"
                  max="100"
                  step="any"
                  required
                  value={values.rql}
                  onChange={(event) => updateField('rql', event.target.value)}
                />
              </label>
              <label className="dialog-field">
                <span>{isSwedish ? 'Producentrisk α (%)' : 'Producer risk α (%)'}</span>
                <input
                  type="number"
                  min="0.01"
                  max="99.99"
                  step="any"
                  required
                  value={values.producerRisk}
                  onChange={(event) => updateField('producerRisk', event.target.value)}
                />
              </label>
              <label className="dialog-field">
                <span>{isSwedish ? 'Konsumentrisk β (%)' : 'Consumer risk β (%)'}</span>
                <input
                  type="number"
                  min="0.01"
                  max="99.99"
                  step="any"
                  required
                  value={values.consumerRisk}
                  onChange={(event) => updateField('consumerRisk', event.target.value)}
                />
              </label>
              <label className="dialog-field">
                <span>{isSwedish ? 'Maximal stickprovsstorlek' : 'Maximum sample size'}</span>
                <input
                  type="number"
                  min="1"
                  max="2000"
                  step="1"
                  required
                  value={values.maxSampleSize}
                  onChange={(event) => updateField('maxSampleSize', event.target.value)}
                />
              </label>
              <label className="dialog-field">
                <span>{isSwedish ? 'Partistorlek (valfritt)' : 'Lot size (optional)'}</span>
                <input
                  type="number"
                  min="2"
                  max="100000"
                  step="1"
                  value={values.lotSize}
                  onChange={(event) => updateField('lotSize', event.target.value)}
                />
              </label>
            </div>
            {error && (
              <p className="session-caption" role="alert">
                {error}
              </p>
            )}
            <div className="dialog-actions">
              <button className="dialog-button primary" type="submit">
                {isSwedish ? 'Sök provplan' : 'Find sampling plan'}
              </button>
            </div>
          </form>
          {plan && graph && (
            <section
              aria-label={
                isSwedish ? 'Resultat från acceptansprovtagning' : 'Acceptance sampling result'
              }
            >
              <div className="quality-table-wrap">
                <table className="quality-table acceptance-sampling-table">
                  <tbody>
                    <tr>
                      <th>{isSwedish ? 'Stickprovsstorlek (n)' : 'Sample size (n)'}</th>
                      <td>{plan.sampleSize}</td>
                      <th>{isSwedish ? 'Acceptanstal (c)' : 'Acceptance number (c)'}</th>
                      <td>{plan.acceptanceNumber}</td>
                    </tr>
                    <tr>
                      <th>{isSwedish ? 'Acceptera vid AQL' : 'Accept at AQL'}</th>
                      <td>{percent.format(plan.probabilityAtAql)}</td>
                      <th>{isSwedish ? 'Producentrisk' : 'Producer risk'}</th>
                      <td>{percent.format(plan.producerRisk)}</td>
                    </tr>
                    <tr>
                      <th>{isSwedish ? 'Acceptera vid RQL' : 'Accept at RQL'}</th>
                      <td>{percent.format(plan.probabilityAtRql)}</td>
                      <th>{isSwedish ? 'Konsumentrisk' : 'Consumer risk'}</th>
                      <td>{percent.format(plan.consumerRisk)}</td>
                    </tr>
                    {plan.lotSize !== undefined && (
                      <tr>
                        <th>{isSwedish ? 'Partistorlek (N)' : 'Lot size (N)'}</th>
                        <td>{plan.lotSize}</td>
                        <th>{isSwedish ? 'Defekta vid AQL / RQL' : 'Defectives at AQL / RQL'}</th>
                        <td>
                          {plan.defectivesAtAql} / {plan.defectivesAtRql}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <GraphPlot graph={graph} language={language} theme={theme} />
              <p className="session-caption">
                {plan.lotSize === undefined
                  ? isSwedish
                    ? 'Binomialmodell: enheter antas vara oberoende med samma defektsannolikhet. Finita partier, variabeldata och flerstegsplaner ingår inte.'
                    : 'Binomial model: units are assumed independent with the same defect probability. Finite lots, variable data, and multiple-stage plans are not included.'
                  : isSwedish
                    ? 'Exakt hypergeometrisk modell. Riskerna utvärderas vid floor(N × AQL) respektive ceil(N × RQL); OC-kurvan visar möjliga heltalsantal defekta.'
                    : 'Exact hypergeometric model. Risks use floor(N × AQL) and ceil(N × RQL), respectively; the OC curve shows attainable integer defect counts.'}
              </p>
            </section>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
