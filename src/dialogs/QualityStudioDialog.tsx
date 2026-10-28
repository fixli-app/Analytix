import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Plus, Trash2, X } from 'lucide-react'
import { calculateDefectMetrics, type DefectMetricsInput } from '../quality/defectMetrics'
import { calculateRiskPriorityNumber } from '../quality/fmea'

type QualityTool = 'dmaic' | 'sipoc' | 'ishikawa' | 'fiveWhy' | 'fmea' | 'checkSheet' | 'metrics'
type DmaicPhase = 'Define' | 'Measure' | 'Analyze' | 'Improve' | 'Control'
type FishboneCategory = 'People' | 'Machine' | 'Method' | 'Material' | 'Measurement' | 'Environment'
type SipocSection = 'suppliers' | 'inputs' | 'process' | 'outputs' | 'customers'
type FmeaScore = 'severity' | 'occurrence' | 'detection'

interface FmeaRow {
  id: string
  processStep: string
  failureMode: string
  effect: string
  cause: string
  severity: number
  occurrence: number
  detection: number
  action: string
}

interface CheckSheetRow {
  id: string
  category: string
  count: number
}

interface QualityWorkspace {
  dmaicPhaseNotes: Record<DmaicPhase, string>
  dmaicChecks: Record<DmaicPhase, boolean[]>
  sipoc: Record<SipocSection, string>
  fishboneEffect: string
  fishboneCauses: Record<FishboneCategory, string>
  fiveWhyProblem: string
  fiveWhyAnswers: string[]
  fmeaRows: FmeaRow[]
  checkSheetRows: CheckSheetRow[]
  defectMetrics: DefectMetricsInput
}

interface QualityStudioDialogProps {
  open: boolean
  language: string
  onOpenChange: (open: boolean) => void
}

const phases: DmaicPhase[] = ['Define', 'Measure', 'Analyze', 'Improve', 'Control']
const phaseSteps: Record<DmaicPhase, string[]> = {
  Define: ['Problemformulering och avgränsning', 'Kundkrav / VOC', 'CTQ och projektmål'],
  Measure: ['Operativ definition', 'Datainsamlingsplan', 'Mätsystem kontrollerat'],
  Analyze: ['Process- och datadiagram', 'Möjliga rotorsaker', 'Rotorsak verifierad'],
  Improve: ['Lösningsalternativ', 'Pilot och riskanalys', 'Effekt verifierad'],
  Control: ['Kontrollplan', 'Ägare och reaktionsplan', 'Överlämning genomförd'],
}
const fishboneCategories: FishboneCategory[] = [
  'People',
  'Machine',
  'Method',
  'Material',
  'Measurement',
  'Environment',
]
const sipocSections: SipocSection[] = ['suppliers', 'inputs', 'process', 'outputs', 'customers']
const toolList: { id: QualityTool; label: [string, string] }[] = [
  { id: 'dmaic', label: ['DMAIC-fas', 'DMAIC phase'] },
  { id: 'sipoc', label: ['SIPOC', 'SIPOC'] },
  { id: 'ishikawa', label: ['Fiskben', 'Ishikawa'] },
  { id: 'fiveWhy', label: ['5 varför', '5 Why'] },
  { id: 'fmea', label: ['FMEA', 'FMEA'] },
  { id: 'checkSheet', label: ['Datainsamling', 'Check sheet'] },
  { id: 'metrics', label: ['DPMO / PPM / DPU', 'DPMO / PPM / DPU'] },
]

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function defaultFmeaRow(): FmeaRow {
  return {
    id: newId(),
    processStep: '',
    failureMode: '',
    effect: '',
    cause: '',
    severity: 1,
    occurrence: 1,
    detection: 1,
    action: '',
  }
}

function createDefaultWorkspace(): QualityWorkspace {
  return {
    dmaicPhaseNotes: { Define: '', Measure: '', Analyze: '', Improve: '', Control: '' },
    dmaicChecks: {
      Define: [false, false, false],
      Measure: [false, false, false],
      Analyze: [false, false, false],
      Improve: [false, false, false],
      Control: [false, false, false],
    },
    sipoc: { suppliers: '', inputs: '', process: '', outputs: '', customers: '' },
    fishboneEffect: '',
    fishboneCauses: {
      People: '',
      Machine: '',
      Method: '',
      Material: '',
      Measurement: '',
      Environment: '',
    },
    fiveWhyProblem: '',
    fiveWhyAnswers: ['', '', '', '', ''],
    fmeaRows: [defaultFmeaRow()],
    checkSheetRows: [{ id: newId(), category: '', count: 0 }],
    defectMetrics: {
      units: 100,
      defectiveUnits: 1,
      defects: 1,
      opportunitiesPerUnit: 1,
      sigmaShift: 1.5,
    },
  }
}

function loadWorkspace(): QualityWorkspace {
  const defaults = createDefaultWorkspace()
  try {
    const saved = JSON.parse(
      localStorage.getItem('statlab-quality-workspace') ?? 'null',
    ) as Partial<QualityWorkspace> | null
    if (!saved) return defaults
    return {
      ...defaults,
      ...saved,
      dmaicPhaseNotes: { ...defaults.dmaicPhaseNotes, ...saved.dmaicPhaseNotes },
      dmaicChecks: { ...defaults.dmaicChecks, ...saved.dmaicChecks },
      sipoc: { ...defaults.sipoc, ...saved.sipoc },
      fishboneCauses: { ...defaults.fishboneCauses, ...saved.fishboneCauses },
      fiveWhyAnswers: Array.isArray(saved.fiveWhyAnswers)
        ? Array.from({ length: 5 }, (_, index) => saved.fiveWhyAnswers?.[index] ?? '')
        : defaults.fiveWhyAnswers,
      fmeaRows: Array.isArray(saved.fmeaRows) ? saved.fmeaRows : defaults.fmeaRows,
      checkSheetRows: Array.isArray(saved.checkSheetRows)
        ? saved.checkSheetRows
        : defaults.checkSheetRows,
      defectMetrics: { ...defaults.defectMetrics, ...saved.defectMetrics },
    }
  } catch {
    return defaults
  }
}

export function QualityStudioDialog({ open, language, onOpenChange }: QualityStudioDialogProps) {
  const [tool, setTool] = useState<QualityTool>('dmaic')
  const [phase, setPhase] = useState<DmaicPhase>('Define')
  const [workspace, setWorkspace] = useState<QualityWorkspace>(loadWorkspace)
  const isSwedish = language === 'sv'

  useEffect(() => {
    try {
      localStorage.setItem('statlab-quality-workspace', JSON.stringify(workspace))
    } catch {
      return
    }
  }, [workspace])

  function updateWorkspace<K extends keyof QualityWorkspace>(key: K, value: QualityWorkspace[K]) {
    setWorkspace((current) => ({ ...current, [key]: value }))
  }

  function updateDmaicCheck(index: number, checked: boolean) {
    const checks = [...workspace.dmaicChecks[phase]]
    checks[index] = checked
    updateWorkspace('dmaicChecks', { ...workspace.dmaicChecks, [phase]: checks })
  }

  function updateFmeaRow(id: string, field: keyof FmeaRow, value: string | number) {
    updateWorkspace(
      'fmeaRows',
      workspace.fmeaRows.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    )
  }

  function updateMetrics(field: keyof DefectMetricsInput, value: number) {
    updateWorkspace('defectMetrics', { ...workspace.defectMetrics, [field]: value })
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content quality-dialog">
          <div className="dialog-heading">
            <div>
              <Dialog.Title className="dialog-title">
                {isSwedish ? 'Kvalitetsverktyg' : 'Quality toolkit'}
              </Dialog.Title>
              <Dialog.Description className="dialog-description">
                {isSwedish
                  ? 'Arbetsunderlag sparas automatiskt lokalt i den här webbläsaren.'
                  : 'Working documents are automatically saved locally in this browser.'}
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
          <div
            className="quality-tool-tabs"
            role="tablist"
            aria-label={isSwedish ? 'Kvalitetsverktyg' : 'Quality tools'}
          >
            {toolList.map((item) => (
              <button
                className="quality-tool-tab"
                type="button"
                role="tab"
                aria-selected={tool === item.id}
                key={item.id}
                onClick={() => setTool(item.id)}
              >
                {item.label[isSwedish ? 0 : 1]}
              </button>
            ))}
          </div>
          <div className="quality-tool-content" role="tabpanel">
            {tool === 'dmaic' && (
              <section aria-label="DMAIC">
                <div
                  className="quality-phase-tabs"
                  role="tablist"
                  aria-label={isSwedish ? 'DMAIC-fas' : 'DMAIC phase'}
                >
                  {phases.map((item) => (
                    <button
                      className="quality-phase-tab"
                      type="button"
                      role="tab"
                      aria-selected={phase === item}
                      key={item}
                      onClick={() => setPhase(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                <h3 className="quality-section-title">
                  {phase} · {isSwedish ? 'fas' : 'phase'}
                </h3>
                <div className="quality-checklist">
                  {phaseSteps[phase].map((step, index) => (
                    <label className="quality-check-item" key={step}>
                      <input
                        type="checkbox"
                        checked={workspace.dmaicChecks[phase][index]}
                        onChange={(event) => updateDmaicCheck(index, event.target.checked)}
                      />
                      <span>{isSwedish ? step : translateDmaicStep(phase, index)}</span>
                    </label>
                  ))}
                </div>
                <label className="dialog-field">
                  <span>{isSwedish ? 'Beslut och anteckningar' : 'Decisions and notes'}</span>
                  <textarea
                    rows={4}
                    value={workspace.dmaicPhaseNotes[phase]}
                    onChange={(event) =>
                      updateWorkspace('dmaicPhaseNotes', {
                        ...workspace.dmaicPhaseNotes,
                        [phase]: event.target.value,
                      })
                    }
                  />
                </label>
              </section>
            )}
            {tool === 'sipoc' && (
              <section aria-label="SIPOC">
                <p className="session-caption">
                  {isSwedish
                    ? 'Beskriv processen från leverantör och insats till resultat och kund. Skriv en post per rad.'
                    : 'Describe the process from supplier and input to output and customer. Enter one item per line.'}
                </p>
                <div className="sipoc-grid">
                  {sipocSections.map((section) => (
                    <label className="dialog-field" key={section}>
                      <span>{sipocLabel(section, isSwedish)}</span>
                      <textarea
                        rows={7}
                        value={workspace.sipoc[section]}
                        onChange={(event) =>
                          updateWorkspace('sipoc', {
                            ...workspace.sipoc,
                            [section]: event.target.value,
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
              </section>
            )}
            {tool === 'ishikawa' && (
              <section aria-label={isSwedish ? 'Fiskbensdiagram' : 'Ishikawa diagram'}>
                <label className="dialog-field">
                  <span>{isSwedish ? 'Effekt / problem' : 'Effect / problem'}</span>
                  <input
                    value={workspace.fishboneEffect}
                    onChange={(event) => updateWorkspace('fishboneEffect', event.target.value)}
                  />
                </label>
                <div className="fishbone-spine">
                  <span>{isSwedish ? 'Möjliga orsaker' : 'Possible causes'}</span>
                  <strong>{workspace.fishboneEffect || (isSwedish ? 'Effekt' : 'Effect')}</strong>
                </div>
                <div className="fishbone-grid">
                  {fishboneCategories.map((category) => (
                    <label className="dialog-field fishbone-branch" key={category}>
                      <span>{fishboneLabel(category, isSwedish)}</span>
                      <textarea
                        rows={4}
                        placeholder={
                          isSwedish ? 'En möjlig orsak per rad' : 'One possible cause per line'
                        }
                        value={workspace.fishboneCauses[category]}
                        onChange={(event) =>
                          updateWorkspace('fishboneCauses', {
                            ...workspace.fishboneCauses,
                            [category]: event.target.value,
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
              </section>
            )}
            {tool === 'fiveWhy' && (
              <section aria-label={isSwedish ? '5 varför' : '5 Why analysis'}>
                <label className="dialog-field">
                  <span>{isSwedish ? 'Problem som ska förklaras' : 'Problem to explain'}</span>
                  <input
                    value={workspace.fiveWhyProblem}
                    onChange={(event) => updateWorkspace('fiveWhyProblem', event.target.value)}
                  />
                </label>
                <ol className="five-why-list">
                  {workspace.fiveWhyAnswers.map((answer, index) => (
                    <li key={index}>
                      <label className="dialog-field">
                        <span>{isSwedish ? `Varför ${index + 1}?` : `Why ${index + 1}?`}</span>
                        <input
                          value={answer}
                          onChange={(event) => {
                            const answers = [...workspace.fiveWhyAnswers]
                            answers[index] = event.target.value
                            updateWorkspace('fiveWhyAnswers', answers)
                          }}
                        />
                      </label>
                    </li>
                  ))}
                </ol>
              </section>
            )}
            {tool === 'fmea' && (
              <section aria-label="FMEA">
                <div className="quality-table-wrap">
                  <table className="quality-table">
                    <thead>
                      <tr>
                        <th>{isSwedish ? 'Processsteg' : 'Process step'}</th>
                        <th>{isSwedish ? 'Felmod' : 'Failure mode'}</th>
                        <th>{isSwedish ? 'Effekt' : 'Effect'}</th>
                        <th>{isSwedish ? 'Orsak' : 'Cause'}</th>
                        <th>S</th>
                        <th>O</th>
                        <th>D</th>
                        <th>RPN</th>
                        <th>{isSwedish ? 'Åtgärd' : 'Action'}</th>
                        <th>{isSwedish ? 'Ta bort' : 'Remove'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workspace.fmeaRows.map((row) => {
                        let rpn: number | null = null
                        try {
                          rpn = calculateRiskPriorityNumber(row)
                        } catch {
                          rpn = null
                        }
                        return (
                          <tr key={row.id}>
                            <td>
                              <input
                                aria-label={isSwedish ? 'Processsteg' : 'Process step'}
                                value={row.processStep}
                                onChange={(event) =>
                                  updateFmeaRow(row.id, 'processStep', event.target.value)
                                }
                              />
                            </td>
                            <td>
                              <input
                                aria-label={isSwedish ? 'Felmod' : 'Failure mode'}
                                value={row.failureMode}
                                onChange={(event) =>
                                  updateFmeaRow(row.id, 'failureMode', event.target.value)
                                }
                              />
                            </td>
                            <td>
                              <input
                                aria-label={isSwedish ? 'Feleffekt' : 'Failure effect'}
                                value={row.effect}
                                onChange={(event) =>
                                  updateFmeaRow(row.id, 'effect', event.target.value)
                                }
                              />
                            </td>
                            <td>
                              <input
                                aria-label={isSwedish ? 'Felorsak' : 'Failure cause'}
                                value={row.cause}
                                onChange={(event) =>
                                  updateFmeaRow(row.id, 'cause', event.target.value)
                                }
                              />
                            </td>
                            {(['severity', 'occurrence', 'detection'] as FmeaScore[]).map(
                              (score) => (
                                <td key={score}>
                                  <select
                                    aria-label={`${score} ${row.id}`}
                                    value={row[score]}
                                    onChange={(event) =>
                                      updateFmeaRow(row.id, score, Number(event.target.value))
                                    }
                                  >
                                    {Array.from({ length: 10 }, (_, index) => index + 1).map(
                                      (value) => (
                                        <option value={value} key={value}>
                                          {value}
                                        </option>
                                      ),
                                    )}
                                  </select>
                                </td>
                              ),
                            )}
                            <td className="quality-rpn">
                              {rpn ?? (isSwedish ? 'Ogiltig' : 'Invalid')}
                            </td>
                            <td>
                              <input
                                aria-label={
                                  isSwedish ? 'Förebyggande åtgärd' : 'Recommended action'
                                }
                                value={row.action}
                                onChange={(event) =>
                                  updateFmeaRow(row.id, 'action', event.target.value)
                                }
                              />
                            </td>
                            <td>
                              <button
                                className="icon-button"
                                type="button"
                                aria-label={isSwedish ? 'Ta bort FMEA-rad' : 'Remove FMEA row'}
                                onClick={() =>
                                  updateWorkspace(
                                    'fmeaRows',
                                    workspace.fmeaRows.filter((item) => item.id !== row.id),
                                  )
                                }
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <button
                  className="quality-add-button"
                  type="button"
                  onClick={() =>
                    updateWorkspace('fmeaRows', [...workspace.fmeaRows, defaultFmeaRow()])
                  }
                >
                  <Plus size={14} /> {isSwedish ? 'Lägg till felmod' : 'Add failure mode'}
                </button>
                <p className="session-caption">
                  {isSwedish
                    ? 'RPN = allvarlighet × förekomst × upptäckbarhet, skala 1–10. RPN ersätter inte bedömning av allvarliga risker.'
                    : 'RPN = severity × occurrence × detection, each rated 1–10. RPN does not replace review of severe risks.'}
                </p>
              </section>
            )}
            {tool === 'checkSheet' && (
              <section aria-label={isSwedish ? 'Datainsamlingsblad' : 'Check sheet'}>
                <div className="quality-table-wrap">
                  <table className="quality-table check-sheet-table">
                    <thead>
                      <tr>
                        <th>{isSwedish ? 'Kategori / feltyp' : 'Category / defect type'}</th>
                        <th>{isSwedish ? 'Antal' : 'Count'}</th>
                        <th>{isSwedish ? 'Ta bort' : 'Remove'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workspace.checkSheetRows.map((row) => (
                        <tr key={row.id}>
                          <td>
                            <input
                              aria-label={
                                isSwedish ? 'Kategori i datainsamlingsblad' : 'Check-sheet category'
                              }
                              value={row.category}
                              onChange={(event) =>
                                updateWorkspace(
                                  'checkSheetRows',
                                  workspace.checkSheetRows.map((item) =>
                                    item.id === row.id
                                      ? { ...item, category: event.target.value }
                                      : item,
                                  ),
                                )
                              }
                            />
                          </td>
                          <td>
                            <input
                              aria-label={
                                isSwedish ? 'Antal i datainsamlingsblad' : 'Check-sheet count'
                              }
                              type="number"
                              min="0"
                              step="1"
                              value={row.count}
                              onChange={(event) =>
                                updateWorkspace(
                                  'checkSheetRows',
                                  workspace.checkSheetRows.map((item) =>
                                    item.id === row.id
                                      ? {
                                          ...item,
                                          count: Math.max(
                                            0,
                                            Math.floor(Number(event.target.value) || 0),
                                          ),
                                        }
                                      : item,
                                  ),
                                )
                              }
                            />
                          </td>
                          <td>
                            <button
                              className="icon-button"
                              type="button"
                              aria-label={isSwedish ? 'Ta bort kategori' : 'Remove category'}
                              onClick={() =>
                                updateWorkspace(
                                  'checkSheetRows',
                                  workspace.checkSheetRows.filter((item) => item.id !== row.id),
                                )
                              }
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <th>{isSwedish ? 'Summa' : 'Total'}</th>
                        <td>
                          {workspace.checkSheetRows.reduce((total, row) => total + row.count, 0)}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <button
                  className="quality-add-button"
                  type="button"
                  onClick={() =>
                    updateWorkspace('checkSheetRows', [
                      ...workspace.checkSheetRows,
                      { id: newId(), category: '', count: 0 },
                    ])
                  }
                >
                  <Plus size={14} /> {isSwedish ? 'Lägg till kategori' : 'Add category'}
                </button>
              </section>
            )}
            {tool === 'metrics' && (
              <DefectMetricsPanel
                isSwedish={isSwedish}
                input={workspace.defectMetrics}
                onChange={updateMetrics}
              />
            )}
          </div>
          <div className="quality-save-status" role="status">
            {isSwedish
              ? 'Sparas automatiskt i den här webbläsaren'
              : 'Automatically saved in this browser'}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function DefectMetricsPanel({
  isSwedish,
  input,
  onChange,
}: {
  isSwedish: boolean
  input: DefectMetricsInput
  onChange: (field: keyof DefectMetricsInput, value: number) => void
}) {
  let result: ReturnType<typeof calculateDefectMetrics> | null = null
  let error = ''
  try {
    result = calculateDefectMetrics(input)
  } catch (caught) {
    error = caught instanceof Error ? caught.message : 'Ogiltiga indata.'
  }

  function numberField(field: keyof DefectMetricsInput, label: string, min: number, step = '1') {
    return (
      <label className="dialog-field" key={field}>
        <span>{label}</span>
        <input
          type="number"
          min={min}
          step={step}
          value={input[field]}
          onChange={(event) => onChange(field, Number(event.target.value))}
        />
      </label>
    )
  }

  return (
    <section aria-label={isSwedish ? 'DPMO, PPM och DPU' : 'DPMO, PPM, and DPU'}>
      <div className="quality-metrics-inputs">
        {numberField('units', isSwedish ? 'Antal enheter' : 'Number of units', 1)}
        {numberField('defectiveUnits', isSwedish ? 'Defekta enheter' : 'Defective units', 0)}
        {numberField('defects', isSwedish ? 'Totalt antal defekter' : 'Total defects', 0)}
        {numberField(
          'opportunitiesPerUnit',
          isSwedish ? 'Möjligheter per enhet' : 'Opportunities per unit',
          1,
        )}
      </div>
      <label className="quality-check-item quality-shift-toggle">
        <input
          type="checkbox"
          checked={input.sigmaShift === 1.5}
          onChange={(event) => onChange('sigmaShift', event.target.checked ? 1.5 : 0)}
        />
        <span>
          {isSwedish ? 'Lägg till 1,5σ-skift i sigma-nivån' : 'Apply a 1.5σ shift to sigma level'}
        </span>
      </label>
      {error && (
        <p className="quality-error" role="alert">
          {error}
        </p>
      )}
      {result && (
        <div className="stat-grid quality-metrics-grid">
          <Metric label="DPU" value={formatMetric(result.dpu, isSwedish)} />
          <Metric label="PPM" value={formatMetric(result.ppm, isSwedish)} />
          <Metric label="DPMO" value={formatMetric(result.dpmo, isSwedish)} />
          <Metric
            label={isSwedish ? 'Utbyte per möjlighet' : 'Yield per opportunity'}
            value={formatMetric(result.firstPassYield * 100, isSwedish) + '%'}
          />
          <Metric
            label={isSwedish ? 'Sigma-nivå' : 'Sigma level'}
            value={
              result.sigmaLevel === null
                ? isSwedish
                  ? 'Ej definierad'
                  : 'Undefined'
                : formatMetric(result.sigmaLevel, isSwedish)
            }
          />
          <Metric
            label={isSwedish ? 'Totala möjligheter' : 'Total opportunities'}
            value={formatMetric(result.totalOpportunities, isSwedish)}
          />
        </div>
      )}
      <p className="session-caption">
        {isSwedish
          ? 'PPM räknar enheter med minst en defekt. DPMO räknar defekter per möjlighetsutfall. Sigma-nivån använder normalinvers och angivet 1,5σ-skift; en beräknad nivå är inte en verifierad processkapabilitet.'
          : 'PPM counts units with at least one defect. DPMO counts defects per opportunity. Sigma level uses the inverse normal and selected 1.5σ shift; it is not a verified process capability result.'}
      </p>
    </section>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-cell">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function formatMetric(value: number, isSwedish: boolean): string {
  if (value === Number.POSITIVE_INFINITY) return '∞'
  return new Intl.NumberFormat(isSwedish ? 'sv-SE' : 'en-US', { maximumFractionDigits: 3 }).format(
    value,
  )
}

function sipocLabel(section: SipocSection, isSwedish: boolean): string {
  const labels: Record<SipocSection, [string, string]> = {
    suppliers: ['Leverantörer', 'Suppliers'],
    inputs: ['Insatsvaror', 'Inputs'],
    process: ['Process (5–7 steg)', 'Process (5–7 steps)'],
    outputs: ['Resultat', 'Outputs'],
    customers: ['Kunder', 'Customers'],
  }
  return labels[section][isSwedish ? 0 : 1]
}

function fishboneLabel(category: FishboneCategory, isSwedish: boolean): string {
  const labels: Record<FishboneCategory, [string, string]> = {
    People: ['Människa', 'People'],
    Machine: ['Maskin', 'Machine'],
    Method: ['Metod', 'Method'],
    Material: ['Material', 'Material'],
    Measurement: ['Mätning', 'Measurement'],
    Environment: ['Miljö', 'Environment'],
  }
  return labels[category][isSwedish ? 0 : 1]
}

function translateDmaicStep(phase: DmaicPhase, index: number): string {
  const steps: Record<DmaicPhase, string[]> = {
    Define: ['Problem statement and scope', 'Customer requirements / VOC', 'CTQ and project goal'],
    Measure: ['Operational definition', 'Data collection plan', 'Measurement system checked'],
    Analyze: ['Process and data charts', 'Potential root causes', 'Root cause verified'],
    Improve: ['Solution alternatives', 'Pilot and risk review', 'Effect verified'],
    Control: ['Control plan', 'Owner and reaction plan', 'Handover complete'],
  }
  return steps[phase][index]
}
