import { useEffect, useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { PowerRequest, PowerTest } from '../stats/power'

interface PowerDialogProps {
  open: boolean
  language: string
  onOpenChange: (open: boolean) => void
  onSubmit: (request: PowerRequest) => void
}

type ParameterKey =
  | 'nullMean'
  | 'alternativeMean'
  | 'sigma'
  | 'mean1'
  | 'mean2'
  | 'sigma1'
  | 'sigma2'
  | 'nullProportion'
  | 'alternativeProportion'
  | 'proportion1'
  | 'proportion2'
  | 'nullRate'
  | 'alternativeRate'
  | 'rate1'
  | 'rate2'
  | 'exposure'

interface ParameterField {
  key: ParameterKey
  swedish: string
  english: string
  initial: string
  min?: string
  max?: string
  step?: string
}

const fieldsByTest: Record<PowerTest, ParameterField[]> = {
  oneSampleZ: [
    {
      key: 'nullMean',
      swedish: 'Hypotetiskt medelvärde',
      english: 'Null mean',
      initial: '0',
      step: 'any',
    },
    {
      key: 'alternativeMean',
      swedish: 'Alternativt medelvärde',
      english: 'Alternative mean',
      initial: '1',
      step: 'any',
    },
    {
      key: 'sigma',
      swedish: 'Känd standardavvikelse',
      english: 'Known standard deviation',
      initial: '1',
      min: '0.0001',
      step: 'any',
    },
  ],
  twoSampleZ: [
    { key: 'mean1', swedish: 'Medelvärde 1', english: 'Mean 1', initial: '0', step: 'any' },
    { key: 'mean2', swedish: 'Medelvärde 2', english: 'Mean 2', initial: '1', step: 'any' },
    {
      key: 'sigma1',
      swedish: 'Känd σ₁',
      english: 'Known σ₁',
      initial: '1',
      min: '0.0001',
      step: 'any',
    },
    {
      key: 'sigma2',
      swedish: 'Känd σ₂',
      english: 'Known σ₂',
      initial: '1',
      min: '0.0001',
      step: 'any',
    },
  ],
  oneProportion: [
    {
      key: 'nullProportion',
      swedish: 'Hypotetisk andel',
      english: 'Null proportion',
      initial: '0.5',
      min: '0.0001',
      max: '0.9999',
      step: 'any',
    },
    {
      key: 'alternativeProportion',
      swedish: 'Alternativ andel',
      english: 'Alternative proportion',
      initial: '0.65',
      min: '0',
      max: '1',
      step: 'any',
    },
  ],
  twoProportions: [
    {
      key: 'proportion1',
      swedish: 'Andel 1',
      english: 'Proportion 1',
      initial: '0.5',
      min: '0',
      max: '1',
      step: 'any',
    },
    {
      key: 'proportion2',
      swedish: 'Andel 2',
      english: 'Proportion 2',
      initial: '0.65',
      min: '0',
      max: '1',
      step: 'any',
    },
  ],
  oneSamplePoisson: [
    {
      key: 'nullRate',
      swedish: 'Hypotetisk hastighet',
      english: 'Null rate',
      initial: '1',
      min: '0.0001',
      step: 'any',
    },
    {
      key: 'alternativeRate',
      swedish: 'Alternativ hastighet',
      english: 'Alternative rate',
      initial: '1.5',
      min: '0.0001',
      step: 'any',
    },
    {
      key: 'exposure',
      swedish: 'Exponering per observation',
      english: 'Exposure per observation',
      initial: '1',
      min: '0.0001',
      step: 'any',
    },
  ],
  twoSamplePoisson: [
    {
      key: 'rate1',
      swedish: 'Hastighet 1',
      english: 'Rate 1',
      initial: '1',
      min: '0.0001',
      step: 'any',
    },
    {
      key: 'rate2',
      swedish: 'Hastighet 2',
      english: 'Rate 2',
      initial: '1.5',
      min: '0.0001',
      step: 'any',
    },
    {
      key: 'exposure',
      swedish: 'Exponering per gruppobservation',
      english: 'Exposure per group observation',
      initial: '1',
      min: '0.0001',
      step: 'any',
    },
  ],
}

const testLabels: Record<PowerTest, [string, string]> = {
  oneSampleZ: ['1-urvals Z-test för medelvärde', 'One-sample Z test for a mean'],
  twoSampleZ: ['2-urvals Z-test för medelvärden', 'Two-sample Z test for means'],
  oneProportion: ['1-proportion Z-test', 'One-proportion Z test'],
  twoProportions: ['2-proportion Z-test', 'Two-proportion Z test'],
  oneSamplePoisson: ['1-urvals Poisson-hastighet', 'One-sample Poisson rate'],
  twoSamplePoisson: ['2-urvals Poisson-hastighet', 'Two-sample Poisson rates'],
}

export function PowerDialog({ open, language, onOpenChange, onSubmit }: PowerDialogProps) {
  const [test, setTest] = useState<PowerTest>('oneSampleZ')
  const [mode, setMode] = useState<'power' | 'sampleSize'>('sampleSize')
  const [alpha, setAlpha] = useState('0.05')
  const [sampleSize, setSampleSize] = useState('30')
  const [targetPower, setTargetPower] = useState('0.8')
  const [parameters, setParameters] = useState<Record<string, string>>({})
  const isSwedish = language === 'sv'
  const testFields = fieldsByTest[test]

  useEffect(() => {
    if (!open) return
    setTest('oneSampleZ')
    setMode('sampleSize')
    setAlpha('0.05')
    setSampleSize('30')
    setTargetPower('0.8')
    setParameters(
      Object.fromEntries(fieldsByTest.oneSampleZ.map((field) => [field.key, field.initial])),
    )
  }, [open])

  function changeTest(nextTest: PowerTest) {
    setTest(nextTest)
    setParameters(
      Object.fromEntries(fieldsByTest[nextTest].map((field) => [field.key, field.initial])),
    )
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const request = {
      test,
      mode,
      alpha: Number(alpha),
      sampleSize: Number(sampleSize),
      targetPower: Number(targetPower),
      ...Object.fromEntries(testFields.map((field) => [field.key, Number(parameters[field.key])])),
    } as PowerRequest
    onSubmit(request)
    onOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content power-dialog">
          <div className="dialog-heading">
            <div>
              <Dialog.Title className="dialog-title">
                {isSwedish ? 'Power och stickprovsstorlek' : 'Power and sample size'}
              </Dialog.Title>
              <Dialog.Description className="dialog-description">
                {isSwedish
                  ? 'Normalapproximation för tvåsidiga Z-, proportion- och Poisson-test.'
                  : 'Normal approximation for two-sided Z, proportion, and Poisson tests.'}
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
              <span>{isSwedish ? 'Test' : 'Test'}</span>
              <select
                value={test}
                onChange={(event) => changeTest(event.target.value as PowerTest)}
              >
                {Object.entries(testLabels).map(([value, labels]) => (
                  <option value={value} key={value}>
                    {labels[isSwedish ? 0 : 1]}
                  </option>
                ))}
              </select>
            </label>
            <div
              className="power-mode"
              role="group"
              aria-label={isSwedish ? 'Beräkningsläge' : 'Calculation mode'}
            >
              <button
                type="button"
                aria-pressed={mode === 'sampleSize'}
                onClick={() => setMode('sampleSize')}
              >
                {isSwedish ? 'Hitta N' : 'Find N'}
              </button>
              <button
                type="button"
                aria-pressed={mode === 'power'}
                onClick={() => setMode('power')}
              >
                {isSwedish ? 'Hitta power' : 'Find power'}
              </button>
            </div>
            {testFields.map((field) => (
              <label className="dialog-field" key={field.key}>
                <span>{isSwedish ? field.swedish : field.english}</span>
                <input
                  type="number"
                  min={field.min}
                  max={field.max}
                  step={field.step ?? 'any'}
                  value={parameters[field.key] ?? field.initial}
                  onChange={(event) =>
                    setParameters((current) => ({ ...current, [field.key]: event.target.value }))
                  }
                  required
                />
              </label>
            ))}
            {mode === 'power' ? (
              <label className="dialog-field">
                <span>{isSwedish ? 'Stickprovsstorlek per grupp' : 'Sample size per group'}</span>
                <input
                  type="number"
                  min="2"
                  max="1000000"
                  value={sampleSize}
                  onChange={(event) => setSampleSize(event.target.value)}
                  required
                />
              </label>
            ) : (
              <label className="dialog-field">
                <span>{isSwedish ? 'Önskad power' : 'Target power'}</span>
                <input
                  type="number"
                  min="0.5001"
                  max="0.9999"
                  step="any"
                  value={targetPower}
                  onChange={(event) => setTargetPower(event.target.value)}
                  required
                />
              </label>
            )}
            <label className="dialog-field">
              <span>{isSwedish ? 'Signifikansnivå (α)' : 'Significance level (α)'}</span>
              <input
                type="number"
                min="0.0001"
                max="0.4999"
                step="any"
                value={alpha}
                onChange={(event) => setAlpha(event.target.value)}
                required
              />
            </label>
            <p className="session-caption">
              {isSwedish
                ? 'Tvåsidig normalapproximation; tvågruppsberäkningar använder lika stora grupper. T-testens exakta icke-central t-power återstår.'
                : 'Two-sided normal approximation; two-group calculations assume equal group sizes. Exact noncentral-t power for t tests remains outstanding.'}
            </p>
            <div className="dialog-actions">
              <Dialog.Close asChild>
                <button className="dialog-button secondary" type="button">
                  {isSwedish ? 'Avbryt' : 'Cancel'}
                </button>
              </Dialog.Close>
              <button className="dialog-button primary" type="submit">
                {mode === 'power'
                  ? isSwedish
                    ? 'Beräkna power'
                    : 'Calculate power'
                  : isSwedish
                    ? 'Beräkna stickprovsstorlek'
                    : 'Calculate sample size'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
