import { useEffect, useMemo, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { ChartNoAxesCombined, Plus, Trash2, X } from 'lucide-react'
import { buildGraph } from '../charts/graphData'
import { GraphPlot } from '../charts/GraphPlot'
import { calculateDefectMetrics, type DefectMetricsInput } from '../quality/defectMetrics'
import { calculateRiskPriorityNumber } from '../quality/fmea'
import { classifyKano, type KanoResponse } from '../quality/kano'
import { calculateOeeTakt, type OeeTaktInput } from '../quality/oeeTakt'
import {
  createDefaultDmaicTools,
  type DmaicToolsTab,
  type DmaicToolsWorkspace,
} from '../quality/dmaicTools'
import {
  calculateValueStream,
  type ValueStreamInput,
  type ValueStreamStep,
} from '../quality/valueStream'
import { DmaicToolsPanel } from './DmaicToolsPanel'

type QualityTool =
  | 'dmaic'
  | 'sipoc'
  | 'ishikawa'
  | 'fiveWhy'
  | 'fmea'
  | 'checkSheet'
  | 'pareto'
  | 'controlPlan'
  | 'vocCtq'
  | 'oeeTakt'
  | 'valueStream'
  | 'fiveS'
  | 'pdca'
  | DmaicToolsTab
  | 'metrics'
type DmaicPhase = 'Define' | 'Measure' | 'Analyze' | 'Improve' | 'Control'
type FishboneCategory = 'People' | 'Machine' | 'Method' | 'Material' | 'Measurement' | 'Environment'
type SipocSection = 'suppliers' | 'inputs' | 'process' | 'outputs' | 'customers'
type FmeaScore = 'severity' | 'occurrence' | 'detection'
type FiveSKey = 'sort' | 'setInOrder' | 'shine' | 'standardize' | 'sustain'
type PdcaStatus = 'planned' | 'doing' | 'checked' | 'standardized'

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

interface ControlPlanRow {
  id: string
  processStep: string
  characteristic: string
  specification: string
  measurementMethod: string
  sampleSize: string
  frequency: string
  controlMethod: string
  owner: string
  reactionPlan: string
}

interface VocRow {
  id: string
  segment: string
  need: string
  importance: number
  functionalResponse: KanoResponse | ''
  dysfunctionalResponse: KanoResponse | ''
}

interface CtqRow {
  id: string
  vocId: string
  driver: string
  measure: string
  target: string
  unit: string
}

interface PdcaRow {
  id: string
  plan: string
  do: string
  check: string
  act: string
  owner: string
  status: PdcaStatus
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
  controlPlanRows: ControlPlanRow[]
  vocRows: VocRow[]
  ctqRows: CtqRow[]
  oeeTakt: OeeTaktInput
  valueStream: ValueStreamInput
  fiveSChecks: Record<FiveSKey, boolean>
  pdcaRows: PdcaRow[]
  dmaicTools: DmaicToolsWorkspace
  defectMetrics: DefectMetricsInput
}

interface QualityStudioDialogProps {
  open: boolean
  language: string
  theme: 'light' | 'dark'
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
  { id: 'pareto', label: ['Pareto', 'Pareto'] },
  { id: 'controlPlan', label: ['Kontrollplan', 'Control plan'] },
  { id: 'vocCtq', label: ['VOC / CTQ', 'VOC / CTQ'] },
  { id: 'oeeTakt', label: ['OEE / Takt', 'OEE / Takt'] },
  { id: 'valueStream', label: ['Värdeflöde', 'Value stream'] },
  { id: 'fiveS', label: ['5S-audit', '5S audit'] },
  { id: 'pdca', label: ['PDCA', 'PDCA'] },
  { id: 'swot', label: ['SWOT', 'SWOT'] },
  { id: 'brainstorm', label: ['Brainstorm / Affinitet', 'Brainstorm / Affinity'] },
  { id: 'decision', label: ['Beslutsmatris', 'Decision matrix'] },
  { id: 'pugh', label: ['Pugh-matris', 'Pugh matrix'] },
  { id: 'relations', label: ['Relationsdiagram', 'Relations diagram'] },
  { id: 'kaizen', label: ['Kaizen', 'Kaizen'] },
  { id: 'pokaYoke', label: ['Poka-Yoke', 'Poka-Yoke'] },
  { id: 'faultTree', label: ['Felträd', 'Fault tree'] },
  { id: 'copq', label: ['COPQ', 'COPQ'] },
  { id: 'benchmark', label: ['Benchmarking', 'Benchmarking'] },
  { id: 'beforeAfter', label: ['Före / efter', 'Before / after'] },
  { id: 'metrics', label: ['DPMO / PPM / DPU', 'DPMO / PPM / DPU'] },
]

const kanoResponses: KanoResponse[] = ['like', 'expect', 'neutral', 'tolerate', 'dislike']
const fiveSItems: { key: FiveSKey; label: [string, string]; criterion: [string, string] }[] = [
  {
    key: 'sort',
    label: ['Sortera', 'Sort'],
    criterion: [
      'Onödiga föremål är borttagna från arbetsplatsen.',
      'Unneeded items are removed from the work area.',
    ],
  },
  {
    key: 'setInOrder',
    label: ['Systematisera', 'Set in order'],
    criterion: [
      'Nödvändiga verktyg har bestämda, märkta platser.',
      'Needed tools have assigned, labeled locations.',
    ],
  },
  {
    key: 'shine',
    label: ['Städa', 'Shine'],
    criterion: [
      'Rengöring används också för att upptäcka avvikelser.',
      'Cleaning is also used to detect abnormalities.',
    ],
  },
  {
    key: 'standardize',
    label: ['Standardisera', 'Standardize'],
    criterion: [
      'Visuella standarder gör de tre första S:en repeterbara.',
      'Visual standards make the first three S steps repeatable.',
    ],
  },
  {
    key: 'sustain',
    label: ['Skapa vana', 'Sustain'],
    criterion: [
      'Ansvar och återkommande audit håller standarden vid liv.',
      'Ownership and recurring audits sustain the standard.',
    ],
  },
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

function defaultControlPlanRow(): ControlPlanRow {
  return {
    id: newId(),
    processStep: '',
    characteristic: '',
    specification: '',
    measurementMethod: '',
    sampleSize: '',
    frequency: '',
    controlMethod: '',
    owner: '',
    reactionPlan: '',
  }
}

function defaultVocRow(): VocRow {
  return {
    id: newId(),
    segment: '',
    need: '',
    importance: 3,
    functionalResponse: '',
    dysfunctionalResponse: '',
  }
}

function defaultCtqRow(vocId = ''): CtqRow {
  return { id: newId(), vocId, driver: '', measure: '', target: '', unit: '' }
}

function defaultFiveSChecks(): Record<FiveSKey, boolean> {
  return { sort: false, setInOrder: false, shine: false, standardize: false, sustain: false }
}

function defaultPdcaRow(): PdcaRow {
  return { id: newId(), plan: '', do: '', check: '', act: '', owner: '', status: 'planned' }
}

function defaultValueStreamInput(): ValueStreamInput {
  return {
    availableProductionTime: 450,
    demandPerShift: 700,
    steps: [
      {
        id: newId(),
        name: '',
        cycleTime: 1,
        changeoverTime: 0,
        uptimePercent: 100,
        inventoryBefore: 0,
      },
    ],
  }
}

function defaultOeeTaktInput(): OeeTaktInput {
  return {
    availableTime: 480,
    plannedDowntime: 30,
    unplannedDowntime: 45,
    idealCycleTime: 0.5,
    totalUnits: 720,
    goodUnits: 684,
    customerDemand: 700,
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
    controlPlanRows: [defaultControlPlanRow()],
    vocRows: [defaultVocRow()],
    ctqRows: [defaultCtqRow()],
    oeeTakt: defaultOeeTaktInput(),
    valueStream: defaultValueStreamInput(),
    fiveSChecks: defaultFiveSChecks(),
    pdcaRows: [defaultPdcaRow()],
    dmaicTools: createDefaultDmaicTools(),
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
      controlPlanRows: Array.isArray(saved.controlPlanRows)
        ? saved.controlPlanRows
        : defaults.controlPlanRows,
      vocRows: Array.isArray(saved.vocRows) ? saved.vocRows : defaults.vocRows,
      ctqRows: Array.isArray(saved.ctqRows) ? saved.ctqRows : defaults.ctqRows,
      oeeTakt: { ...defaults.oeeTakt, ...saved.oeeTakt },
      valueStream: saved.valueStream
        ? {
            ...defaults.valueStream,
            ...saved.valueStream,
            steps: Array.isArray(saved.valueStream.steps)
              ? saved.valueStream.steps
              : defaults.valueStream.steps,
          }
        : defaults.valueStream,
      fiveSChecks: { ...defaults.fiveSChecks, ...saved.fiveSChecks },
      pdcaRows: Array.isArray(saved.pdcaRows) ? saved.pdcaRows : defaults.pdcaRows,
      dmaicTools: saved.dmaicTools
        ? {
            ...defaults.dmaicTools,
            ...saved.dmaicTools,
            swot: { ...defaults.dmaicTools.swot, ...saved.dmaicTools.swot },
            brainstormRows: Array.isArray(saved.dmaicTools.brainstormRows)
              ? saved.dmaicTools.brainstormRows
              : defaults.dmaicTools.brainstormRows,
            decisionCriteria: Array.isArray(saved.dmaicTools.decisionCriteria)
              ? saved.dmaicTools.decisionCriteria
              : defaults.dmaicTools.decisionCriteria,
            decisionAlternatives: Array.isArray(saved.dmaicTools.decisionAlternatives)
              ? saved.dmaicTools.decisionAlternatives
              : defaults.dmaicTools.decisionAlternatives,
            pughCriteria: Array.isArray(saved.dmaicTools.pughCriteria)
              ? saved.dmaicTools.pughCriteria
              : defaults.dmaicTools.pughCriteria,
            pughAlternatives: Array.isArray(saved.dmaicTools.pughAlternatives)
              ? saved.dmaicTools.pughAlternatives
              : defaults.dmaicTools.pughAlternatives,
            pughBaselineId:
              typeof saved.dmaicTools.pughBaselineId === 'string'
                ? saved.dmaicTools.pughBaselineId
                : defaults.dmaicTools.pughBaselineId,
            relationNodes: Array.isArray(saved.dmaicTools.relationNodes)
              ? saved.dmaicTools.relationNodes
              : defaults.dmaicTools.relationNodes,
            relationLinks: Array.isArray(saved.dmaicTools.relationLinks)
              ? saved.dmaicTools.relationLinks
              : defaults.dmaicTools.relationLinks,
            benchmarkRows: Array.isArray(saved.dmaicTools.benchmarkRows)
              ? saved.dmaicTools.benchmarkRows
              : defaults.dmaicTools.benchmarkRows,
            beforeAfterRows: Array.isArray(saved.dmaicTools.beforeAfterRows)
              ? saved.dmaicTools.beforeAfterRows
              : defaults.dmaicTools.beforeAfterRows,
            kaizenRows: Array.isArray(saved.dmaicTools.kaizenRows)
              ? saved.dmaicTools.kaizenRows
              : defaults.dmaicTools.kaizenRows,
            pokaYokeRows: Array.isArray(saved.dmaicTools.pokaYokeRows)
              ? saved.dmaicTools.pokaYokeRows
              : defaults.dmaicTools.pokaYokeRows,
            faultTreeNodes: Array.isArray(saved.dmaicTools.faultTreeNodes)
              ? saved.dmaicTools.faultTreeNodes
              : defaults.dmaicTools.faultTreeNodes,
            copq: { ...defaults.dmaicTools.copq, ...saved.dmaicTools.copq },
          }
        : defaults.dmaicTools,
      defectMetrics: { ...defaults.defectMetrics, ...saved.defectMetrics },
    }
  } catch {
    return defaults
  }
}

export function QualityStudioDialog({
  open,
  language,
  theme,
  onOpenChange,
}: QualityStudioDialogProps) {
  const [tool, setTool] = useState<QualityTool>('dmaic')
  const [phase, setPhase] = useState<DmaicPhase>('Define')
  const [workspace, setWorkspace] = useState<QualityWorkspace>(loadWorkspace)
  const isSwedish = language === 'sv'
  const controlPlanRows = workspace.controlPlanRows ?? []
  const vocRows = workspace.vocRows ?? []
  const ctqRows = workspace.ctqRows ?? []
  const oeeTaktInput = workspace.oeeTakt ?? defaultOeeTaktInput()
  const valueStreamInput = workspace.valueStream ?? defaultValueStreamInput()
  const fiveSChecks = workspace.fiveSChecks ?? defaultFiveSChecks()
  const pdcaRows = workspace.pdcaRows ?? []
  const dmaicTools = workspace.dmaicTools ?? createDefaultDmaicTools()
  const paretoGraph = useMemo(() => {
    try {
      return buildGraph({
        kind: 'pareto',
        categoryCounts: workspace.checkSheetRows.map(({ category, count }) => ({
          category,
          count,
        })),
        language,
      })
    } catch {
      return null
    }
  }, [language, workspace.checkSheetRows])

  useEffect(() => {
    try {
      localStorage.setItem('statlab-quality-workspace', JSON.stringify(workspace))
    } catch {
      return
    }
  }, [workspace])

  useEffect(() => {
    if (Array.isArray(workspace.controlPlanRows)) return
    setWorkspace((current) => ({ ...current, controlPlanRows: [defaultControlPlanRow()] }))
  }, [workspace.controlPlanRows])

  useEffect(() => {
    if (Array.isArray(workspace.vocRows) && Array.isArray(workspace.ctqRows)) return
    setWorkspace((current) => ({
      ...current,
      vocRows: current.vocRows ?? [defaultVocRow()],
      ctqRows: current.ctqRows ?? [defaultCtqRow()],
    }))
  }, [workspace.vocRows, workspace.ctqRows])

  useEffect(() => {
    if (workspace.oeeTakt) return
    setWorkspace((current) => ({ ...current, oeeTakt: defaultOeeTaktInput() }))
  }, [workspace.oeeTakt])

  useEffect(() => {
    if (workspace.valueStream) return
    setWorkspace((current) => ({ ...current, valueStream: defaultValueStreamInput() }))
  }, [workspace.valueStream])

  useEffect(() => {
    if (workspace.fiveSChecks && Array.isArray(workspace.pdcaRows)) return
    setWorkspace((current) => ({
      ...current,
      fiveSChecks: current.fiveSChecks ?? defaultFiveSChecks(),
      pdcaRows: current.pdcaRows ?? [defaultPdcaRow()],
    }))
  }, [workspace.fiveSChecks, workspace.pdcaRows])

  useEffect(() => {
    if (workspace.dmaicTools) return
    setWorkspace((current) => ({ ...current, dmaicTools: createDefaultDmaicTools() }))
  }, [workspace.dmaicTools])

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

  function updateControlPlanRow(id: string, field: keyof ControlPlanRow, value: string) {
    updateWorkspace(
      'controlPlanRows',
      controlPlanRows.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    )
  }

  function updateVocRow(id: string, field: keyof VocRow, value: string | number) {
    updateWorkspace(
      'vocRows',
      vocRows.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    )
  }

  function updateCtqRow(id: string, field: keyof CtqRow, value: string) {
    updateWorkspace(
      'ctqRows',
      ctqRows.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    )
  }

  function updateMetrics(field: keyof DefectMetricsInput, value: number) {
    updateWorkspace('defectMetrics', { ...workspace.defectMetrics, [field]: value })
  }

  function updateOeeTakt(field: keyof OeeTaktInput, value: number) {
    updateWorkspace('oeeTakt', { ...oeeTaktInput, [field]: value })
  }

  function updateValueStreamField(field: Exclude<keyof ValueStreamInput, 'steps'>, value: number) {
    updateWorkspace('valueStream', { ...valueStreamInput, [field]: value })
  }

  function updateValueStreamStep(id: string, field: keyof ValueStreamStep, value: string | number) {
    updateWorkspace('valueStream', {
      ...valueStreamInput,
      steps: valueStreamInput.steps.map((step) =>
        step.id === id ? { ...step, [field]: value } : step,
      ),
    })
  }

  function updatePdcaRow(id: string, field: keyof PdcaRow, value: string) {
    updateWorkspace(
      'pdcaRows',
      pdcaRows.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    )
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
            {tool === 'vocCtq' && (
              <section aria-label={isSwedish ? 'VOC och CTQ' : 'VOC and CTQ'}>
                <h3 className="quality-section-title">
                  {isSwedish ? 'Voice of the Customer' : 'Voice of the Customer'}
                </h3>
                <div className="quality-table-wrap">
                  <table className="quality-table voc-table">
                    <thead>
                      <tr>
                        <th>{isSwedish ? 'Kundsegment' : 'Customer segment'}</th>
                        <th>{isSwedish ? 'Kundbehov / VOC' : 'Customer need / VOC'}</th>
                        <th>{isSwedish ? 'Vikt (1–5)' : 'Importance (1–5)'}</th>
                        <th>{isSwedish ? 'Funktionellt svar' : 'Functional response'}</th>
                        <th>{isSwedish ? 'Dysfunktionellt svar' : 'Dysfunctional response'}</th>
                        <th>Kano</th>
                        <th>{isSwedish ? 'Ta bort' : 'Remove'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vocRows.map((row, index) => {
                        const kanoCategory =
                          row.functionalResponse && row.dysfunctionalResponse
                            ? classifyKano(row.functionalResponse, row.dysfunctionalResponse)
                            : null
                        const responseLabel = (response: KanoResponse) =>
                          ({
                            like: isSwedish ? 'Gillar' : 'Like',
                            expect: isSwedish ? 'Förväntar mig' : 'Expect',
                            neutral: isSwedish ? 'Neutral' : 'Neutral',
                            tolerate: isSwedish ? 'Accepterar' : 'Tolerate',
                            dislike: isSwedish ? 'Ogillar' : 'Dislike',
                          })[response]
                        return (
                          <tr key={row.id}>
                            <td>
                              <input
                                aria-label={`${isSwedish ? 'Kundsegment' : 'Customer segment'} ${index + 1}`}
                                value={row.segment}
                                onChange={(event) =>
                                  updateVocRow(row.id, 'segment', event.target.value)
                                }
                              />
                            </td>
                            <td>
                              <input
                                aria-label={`${isSwedish ? 'VOC-kundbehov' : 'VOC customer need'} ${index + 1}`}
                                value={row.need}
                                onChange={(event) =>
                                  updateVocRow(row.id, 'need', event.target.value)
                                }
                              />
                            </td>
                            <td>
                              <select
                                aria-label={`${isSwedish ? 'Vikt' : 'Importance'} ${index + 1}`}
                                value={row.importance}
                                onChange={(event) =>
                                  updateVocRow(row.id, 'importance', Number(event.target.value))
                                }
                              >
                                {[1, 2, 3, 4, 5].map((value) => (
                                  <option value={value} key={value}>
                                    {value}
                                  </option>
                                ))}
                              </select>
                            </td>
                            {(['functionalResponse', 'dysfunctionalResponse'] as const).map(
                              (field) => (
                                <td key={field}>
                                  <select
                                    aria-label={`${field === 'functionalResponse' ? (isSwedish ? 'Funktionellt svar' : 'Functional response') : isSwedish ? 'Dysfunktionellt svar' : 'Dysfunctional response'} ${index + 1}`}
                                    value={row[field]}
                                    onChange={(event) =>
                                      updateVocRow(row.id, field, event.target.value)
                                    }
                                  >
                                    <option value="">
                                      {isSwedish ? 'Välj svar' : 'Select response'}
                                    </option>
                                    {kanoResponses.map((response) => (
                                      <option value={response} key={response}>
                                        {responseLabel(response)}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                              ),
                            )}
                            <td>
                              {kanoCategory ? kanoCategoryLabel(kanoCategory, isSwedish) : '—'}
                            </td>
                            <td>
                              <button
                                className="icon-button"
                                type="button"
                                aria-label={`${isSwedish ? 'Ta bort VOC-rad' : 'Remove VOC row'} ${index + 1}`}
                                onClick={() =>
                                  updateWorkspace(
                                    'vocRows',
                                    vocRows.filter((item) => item.id !== row.id),
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
                  onClick={() => updateWorkspace('vocRows', [...vocRows, defaultVocRow()])}
                >
                  <Plus size={14} /> {isSwedish ? 'Lägg till kundbehov' : 'Add customer need'}
                </button>
                <p className="session-caption">
                  {isSwedish
                    ? 'Kano-klassen beräknas från paret funktionell/dysfunktionell respons. Den ersätter inte segmentering eller validering med kunddata.'
                    : 'The Kano category is calculated from the functional/dysfunctional response pair. It does not replace customer segmentation or validation with customer data.'}
                </p>
                <h3 className="quality-section-title">{isSwedish ? 'CTQ-träd' : 'CTQ tree'}</h3>
                <div className="quality-table-wrap">
                  <table className="quality-table ctq-table">
                    <thead>
                      <tr>
                        <th>{isSwedish ? 'Kundbehov' : 'Customer need'}</th>
                        <th>{isSwedish ? 'Drivare' : 'Driver'}</th>
                        <th>CTQ</th>
                        <th>{isSwedish ? 'Mätbar definition' : 'Operational measure'}</th>
                        <th>{isSwedish ? 'Mål / gräns' : 'Target / limit'}</th>
                        <th>{isSwedish ? 'Enhet' : 'Unit'}</th>
                        <th>{isSwedish ? 'Ta bort' : 'Remove'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ctqRows.map((row, index) => (
                        <tr key={row.id}>
                          <td>
                            <select
                              aria-label={`${isSwedish ? 'CTQ-kundbehov' : 'CTQ customer need'} ${index + 1}`}
                              value={
                                vocRows.some((voc) => voc.id === row.vocId)
                                  ? row.vocId
                                  : (vocRows[0]?.id ?? '')
                              }
                              onChange={(event) =>
                                updateCtqRow(row.id, 'vocId', event.target.value)
                              }
                            >
                              {vocRows.map((voc) => (
                                <option value={voc.id} key={voc.id}>
                                  {voc.need || (isSwedish ? 'Nytt kundbehov' : 'New customer need')}
                                </option>
                              ))}
                            </select>
                          </td>
                          {(['driver', 'measure', 'target', 'unit'] as const).map((field) => (
                            <td key={field}>
                              <input
                                aria-label={`${field === 'driver' ? (isSwedish ? 'CTQ-drivare' : 'CTQ driver') : field === 'measure' ? (isSwedish ? 'CTQ-mått' : 'CTQ measure') : field === 'target' ? (isSwedish ? 'CTQ-mål' : 'CTQ target') : isSwedish ? 'CTQ-enhet' : 'CTQ unit'} ${index + 1}`}
                                value={row[field]}
                                onChange={(event) =>
                                  updateCtqRow(row.id, field, event.target.value)
                                }
                              />
                            </td>
                          ))}
                          <td>
                            <button
                              className="icon-button"
                              type="button"
                              aria-label={`${isSwedish ? 'Ta bort CTQ-rad' : 'Remove CTQ row'} ${index + 1}`}
                              onClick={() =>
                                updateWorkspace(
                                  'ctqRows',
                                  ctqRows.filter((item) => item.id !== row.id),
                                )
                              }
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  className="quality-add-button"
                  type="button"
                  onClick={() =>
                    updateWorkspace('ctqRows', [...ctqRows, defaultCtqRow(vocRows[0]?.id ?? '')])
                  }
                >
                  <Plus size={14} /> {isSwedish ? 'Lägg till CTQ' : 'Add CTQ'}
                </button>
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
            {tool === 'controlPlan' && (
              <section aria-label={isSwedish ? 'Kontrollplan' : 'Control plan'}>
                <p className="session-caption">
                  {isSwedish
                    ? 'Knyt varje CTQ till en mätmetod, kontrollfrekvens, ägare och tydlig reaktionsplan.'
                    : 'Link each CTQ to a measurement method, control frequency, owner, and clear reaction plan.'}
                </p>
                <div className="quality-table-wrap">
                  <table className="quality-table control-plan-table">
                    <thead>
                      <tr>
                        <th>{isSwedish ? 'Processsteg' : 'Process step'}</th>
                        <th>CTQ / {isSwedish ? 'karakteristik' : 'characteristic'}</th>
                        <th>{isSwedish ? 'Specifikation / gräns' : 'Specification / limit'}</th>
                        <th>{isSwedish ? 'Mätmetod' : 'Measurement method'}</th>
                        <th>n</th>
                        <th>{isSwedish ? 'Frekvens' : 'Frequency'}</th>
                        <th>{isSwedish ? 'Ägare' : 'Owner'}</th>
                        <th>{isSwedish ? 'Reaktionsplan' : 'Reaction plan'}</th>
                        <th>{isSwedish ? 'Ta bort' : 'Remove'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {controlPlanRows.map((row, index) => {
                        const field = (key: Exclude<keyof ControlPlanRow, 'id'>, label: string) => (
                          <input
                            aria-label={`${label} ${index + 1}`}
                            value={row[key]}
                            onChange={(event) =>
                              updateControlPlanRow(row.id, key, event.target.value)
                            }
                          />
                        )
                        return (
                          <tr key={row.id}>
                            <td>
                              {field('processStep', isSwedish ? 'Processsteg' : 'Process step')}
                            </td>
                            <td>
                              {field(
                                'characteristic',
                                isSwedish ? 'CTQ-karakteristik' : 'CTQ characteristic',
                              )}
                            </td>
                            <td>
                              {field(
                                'specification',
                                isSwedish ? 'Specifikation' : 'Specification',
                              )}
                            </td>
                            <td>
                              {field(
                                'measurementMethod',
                                isSwedish ? 'Mätmetod' : 'Measurement method',
                              )}
                            </td>
                            <td>
                              {field('sampleSize', isSwedish ? 'Stickprovsstorlek' : 'Sample size')}
                            </td>
                            <td>
                              {field(
                                'frequency',
                                isSwedish ? 'Kontrollfrekvens' : 'Control frequency',
                              )}
                            </td>
                            <td>{field('owner', isSwedish ? 'Processägare' : 'Process owner')}</td>
                            <td>
                              {field('reactionPlan', isSwedish ? 'Reaktionsplan' : 'Reaction plan')}
                            </td>
                            <td>
                              <button
                                className="icon-button"
                                type="button"
                                aria-label={`${isSwedish ? 'Ta bort kontrollplanrad' : 'Remove control plan row'} ${index + 1}`}
                                onClick={() =>
                                  updateWorkspace(
                                    'controlPlanRows',
                                    controlPlanRows.filter((item) => item.id !== row.id),
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
                    updateWorkspace('controlPlanRows', [
                      ...controlPlanRows,
                      defaultControlPlanRow(),
                    ])
                  }
                >
                  <Plus size={14} />
                  {isSwedish ? 'Lägg till kontrollsteg' : 'Add control step'}
                </button>
                <p className="session-caption">
                  {isSwedish
                    ? 'Kontrollplanen är ett arbetsunderlag. Frekvens, gränser och reaktion ska godkännas av processägare innan användning.'
                    : 'This control plan is a working document. Frequency, limits, and reactions must be approved by the process owner before use.'}
                </p>
              </section>
            )}
            {tool === 'pareto' && (
              <section aria-label="Pareto">
                {paretoGraph ? (
                  <GraphPlot graph={paretoGraph} language={language} theme={theme} />
                ) : (
                  <p className="session-caption" role="status">
                    {isSwedish
                      ? 'Lägg till kategorier med positiva antal i datainsamlingsbladet för att visa Pareto-diagrammet.'
                      : 'Add categories with positive counts to the check sheet to display the Pareto chart.'}
                  </p>
                )}
                <button
                  className="quality-add-button"
                  type="button"
                  onClick={() => setTool('checkSheet')}
                >
                  <ChartNoAxesCombined size={14} />
                  {isSwedish ? 'Redigera datainsamling' : 'Edit check sheet'}
                </button>
              </section>
            )}
            {tool === 'fiveS' && (
              <FiveSAuditPanel
                isSwedish={isSwedish}
                checks={fiveSChecks}
                onChange={(checks) => updateWorkspace('fiveSChecks', checks)}
              />
            )}
            {tool === 'valueStream' && (
              <ValueStreamPanel
                isSwedish={isSwedish}
                input={valueStreamInput}
                onFieldChange={updateValueStreamField}
                onStepChange={updateValueStreamStep}
                onAddStep={() =>
                  updateWorkspace('valueStream', {
                    ...valueStreamInput,
                    steps: [
                      ...valueStreamInput.steps,
                      {
                        id: newId(),
                        name: '',
                        cycleTime: 1,
                        changeoverTime: 0,
                        uptimePercent: 100,
                        inventoryBefore: 0,
                      },
                    ],
                  })
                }
                onRemoveStep={(id) =>
                  updateWorkspace('valueStream', {
                    ...valueStreamInput,
                    steps: valueStreamInput.steps.filter((step) => step.id !== id),
                  })
                }
              />
            )}
            {tool === 'pdca' && (
              <PdcaPanel
                isSwedish={isSwedish}
                rows={pdcaRows}
                onChange={updatePdcaRow}
                onAdd={() => updateWorkspace('pdcaRows', [...pdcaRows, defaultPdcaRow()])}
                onRemove={(id) =>
                  updateWorkspace(
                    'pdcaRows',
                    pdcaRows.filter((item) => item.id !== id),
                  )
                }
              />
            )}
            {(tool === 'swot' ||
              tool === 'brainstorm' ||
              tool === 'decision' ||
              tool === 'pugh' ||
              tool === 'relations' ||
              tool === 'kaizen' ||
              tool === 'pokaYoke' ||
              tool === 'faultTree' ||
              tool === 'copq' ||
              tool === 'benchmark' ||
              tool === 'beforeAfter') && (
              <DmaicToolsPanel
                tool={tool}
                data={dmaicTools}
                isSwedish={isSwedish}
                onChange={(next) => updateWorkspace('dmaicTools', next)}
              />
            )}
            {tool === 'metrics' && (
              <DefectMetricsPanel
                isSwedish={isSwedish}
                input={workspace.defectMetrics}
                onChange={updateMetrics}
              />
            )}
            {tool === 'oeeTakt' && (
              <OeeTaktPanel isSwedish={isSwedish} input={oeeTaktInput} onChange={updateOeeTakt} />
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

function ValueStreamPanel({
  isSwedish,
  input,
  onFieldChange,
  onStepChange,
  onAddStep,
  onRemoveStep,
}: {
  isSwedish: boolean
  input: ValueStreamInput
  onFieldChange: (field: 'availableProductionTime' | 'demandPerShift', value: number) => void
  onStepChange: (id: string, field: keyof ValueStreamStep, value: string | number) => void
  onAddStep: () => void
  onRemoveStep: (id: string) => void
}) {
  let result: ReturnType<typeof calculateValueStream> | null = null
  let error = ''
  try {
    result = calculateValueStream(input)
  } catch (caught) {
    error = caught instanceof Error ? caught.message : 'Ogiltiga indata.'
  }
  const numberField = (
    label: string,
    value: number,
    onChange: (value: number) => void,
    min: number,
    step: string,
  ) => (
    <label className="dialog-field">
      <span>{label}</span>
      <input
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )

  return (
    <section aria-label={isSwedish ? 'Värdeflödeskarta' : 'Value stream map'}>
      <div className="quality-metrics-inputs">
        {numberField(
          isSwedish
            ? 'Tillgänglig produktionstid/skift (min)'
            : 'Available production time/shift (min)',
          input.availableProductionTime,
          (value) => onFieldChange('availableProductionTime', value),
          0.000001,
          'any',
        )}
        {numberField(
          isSwedish ? 'Kundbehov/skift' : 'Customer demand/shift',
          input.demandPerShift,
          (value) => onFieldChange('demandPerShift', value),
          1,
          '1',
        )}
      </div>
      <div className="quality-table-wrap">
        <table className="quality-table value-stream-table">
          <thead>
            <tr>
              <th>{isSwedish ? 'Processteg' : 'Process step'}</th>
              <th>{isSwedish ? 'Cykeltid (min)' : 'Cycle time (min)'}</th>
              <th>{isSwedish ? 'Ställtid (min)' : 'Changeover (min)'}</th>
              <th>Uptime (%)</th>
              <th>WIP {isSwedish ? 'före steg' : 'before step'}</th>
              <th>{isSwedish ? 'Ta bort' : 'Remove'}</th>
            </tr>
          </thead>
          <tbody>
            {input.steps.map((step, index) => (
              <tr key={step.id}>
                <td>
                  <input
                    aria-label={`${isSwedish ? 'Processteg' : 'Process step'} ${index + 1}`}
                    value={step.name}
                    onChange={(event) => onStepChange(step.id, 'name', event.target.value)}
                  />
                </td>
                {(['cycleTime', 'changeoverTime', 'uptimePercent', 'inventoryBefore'] as const).map(
                  (field) => (
                    <td key={field}>
                      <input
                        aria-label={`${field === 'cycleTime' ? (isSwedish ? 'Cykeltid' : 'Cycle time') : field === 'changeoverTime' ? (isSwedish ? 'Ställtid' : 'Changeover') : field === 'uptimePercent' ? 'Uptime' : 'WIP'} ${index + 1}`}
                        type="number"
                        min={
                          field === 'uptimePercent'
                            ? 0
                            : field === 'inventoryBefore' || field === 'changeoverTime'
                              ? 0
                              : 0.000001
                        }
                        max={field === 'uptimePercent' ? 100 : undefined}
                        step={field === 'inventoryBefore' ? 1 : 'any'}
                        value={step[field]}
                        onChange={(event) =>
                          onStepChange(step.id, field, Number(event.target.value))
                        }
                      />
                    </td>
                  ),
                )}
                <td>
                  <button
                    className="icon-button"
                    type="button"
                    aria-label={`${isSwedish ? 'Ta bort processteg' : 'Remove process step'} ${index + 1}`}
                    onClick={() => onRemoveStep(step.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="quality-add-button" type="button" onClick={onAddStep}>
        <Plus size={14} /> {isSwedish ? 'Lägg till processteg' : 'Add process step'}
      </button>
      {error && (
        <p className="quality-error" role="alert">
          {error}
        </p>
      )}
      {result && (
        <div className="stat-grid quality-metrics-grid">
          <Metric
            label={isSwedish ? 'Takttid (min/enhet)' : 'Takt time (min/unit)'}
            value={formatMetric(result.taktTime, isSwedish)}
          />
          <Metric
            label={isSwedish ? 'Värdeadderad tid (min)' : 'Value-added time (min)'}
            value={formatMetric(result.valueAddedTime, isSwedish)}
          />
          <Metric
            label={isSwedish ? 'Väntetid från WIP (min)' : 'WIP waiting time (min)'}
            value={formatMetric(result.waitingTime, isSwedish)}
          />
          <Metric
            label={isSwedish ? 'Lead time (min)' : 'Lead time (min)'}
            value={formatMetric(result.leadTime, isSwedish)}
          />
          <Metric
            label={isSwedish ? 'Värdeadderad andel' : 'Value-added share'}
            value={`${formatMetric(result.valueAddedPercent, isSwedish)}%`}
          />
          <Metric
            label={isSwedish ? 'Flaskhals' : 'Bottleneck'}
            value={`${result.bottleneckStep} (${formatMetric(result.bottleneckCycleTime, isSwedish)} min)`}
          />
          <Metric
            label={isSwedish ? 'Flaskhals − takt (min)' : 'Bottleneck − takt (min)'}
            value={formatMetric(result.bottleneckTaktGap, isSwedish)}
          />
        </div>
      )}
      <p className="session-caption">
        {isSwedish
          ? 'Väntetid uppskattas som WIP/kundbehov × tillgänglig produktionstid per skift. Ställtid visas separat och ingår inte i styckvis lead time.'
          : 'Waiting time is estimated as WIP/customer demand × available production time per shift. Changeover is shown separately and is not included in per-unit lead time.'}
      </p>
    </section>
  )
}

function FiveSAuditPanel({
  isSwedish,
  checks,
  onChange,
}: {
  isSwedish: boolean
  checks: Record<FiveSKey, boolean>
  onChange: (checks: Record<FiveSKey, boolean>) => void
}) {
  const completed = Object.values(checks).filter(Boolean).length
  return (
    <section aria-label="5S">
      <h3 className="quality-section-title">5S</h3>
      <div className="stat-grid quality-metrics-grid">
        <Metric
          label={isSwedish ? 'Uppfyllda kriterier' : 'Criteria met'}
          value={`${completed} / 5`}
        />
        <Metric
          label={isSwedish ? 'Poäng' : 'Score'}
          value={`${formatMetric((completed / 5) * 100, isSwedish)}%`}
        />
      </div>
      <div className="quality-checklist">
        {fiveSItems.map((item) => (
          <label className="quality-check-item" key={item.key}>
            <input
              type="checkbox"
              checked={checks[item.key]}
              onChange={(event) => onChange({ ...checks, [item.key]: event.target.checked })}
            />
            <span>
              <strong>{item.label[isSwedish ? 0 : 1]}</strong> · {item.criterion[isSwedish ? 0 : 1]}
            </span>
          </label>
        ))}
      </div>
      <p className="session-caption">
        {isSwedish
          ? 'Poängen är en checklista, inte en certifiering. Bedöm kriterierna på den faktiska arbetsplatsen.'
          : 'The score is a checklist, not a certification. Assess criteria at the actual work area.'}
      </p>
    </section>
  )
}

function PdcaPanel({
  isSwedish,
  rows,
  onChange,
  onAdd,
  onRemove,
}: {
  isSwedish: boolean
  rows: PdcaRow[]
  onChange: (id: string, field: keyof PdcaRow, value: string) => void
  onAdd: () => void
  onRemove: (id: string) => void
}) {
  return (
    <section aria-label="PDCA">
      <div className="quality-table-wrap">
        <table className="quality-table pdca-table">
          <thead>
            <tr>
              <th>Plan</th>
              <th>Do</th>
              <th>Check</th>
              <th>Act</th>
              <th>{isSwedish ? 'Ägare' : 'Owner'}</th>
              <th>{isSwedish ? 'Status' : 'Status'}</th>
              <th>{isSwedish ? 'Ta bort' : 'Remove'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const field = (key: Exclude<keyof PdcaRow, 'id' | 'status'>, label: string) => (
                <input
                  aria-label={`${label} ${index + 1}`}
                  value={row[key]}
                  onChange={(event) => onChange(row.id, key, event.target.value)}
                />
              )
              return (
                <tr key={row.id}>
                  <td>{field('plan', 'Plan')}</td>
                  <td>{field('do', 'Do')}</td>
                  <td>{field('check', 'Check')}</td>
                  <td>{field('act', 'Act')}</td>
                  <td>{field('owner', isSwedish ? 'Ägare' : 'Owner')}</td>
                  <td>
                    <select
                      aria-label={`${isSwedish ? 'PDCA-status' : 'PDCA status'} ${index + 1}`}
                      value={row.status}
                      onChange={(event) => onChange(row.id, 'status', event.target.value)}
                    >
                      <option value="planned">{isSwedish ? 'Planerad' : 'Planned'}</option>
                      <option value="doing">{isSwedish ? 'Pågår' : 'In progress'}</option>
                      <option value="checked">{isSwedish ? 'Kontrollerad' : 'Checked'}</option>
                      <option value="standardized">
                        {isSwedish ? 'Standardiserad' : 'Standardized'}
                      </option>
                    </select>
                  </td>
                  <td>
                    <button
                      className="icon-button"
                      type="button"
                      aria-label={`${isSwedish ? 'Ta bort PDCA-rad' : 'Remove PDCA row'} ${index + 1}`}
                      onClick={() => onRemove(row.id)}
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
      <button className="quality-add-button" type="button" onClick={onAdd}>
        <Plus size={14} /> {isSwedish ? 'Lägg till förbättringscykel' : 'Add improvement cycle'}
      </button>
    </section>
  )
}

function OeeTaktPanel({
  isSwedish,
  input,
  onChange,
}: {
  isSwedish: boolean
  input: OeeTaktInput
  onChange: (field: keyof OeeTaktInput, value: number) => void
}) {
  let result: ReturnType<typeof calculateOeeTakt> | null = null
  let error = ''
  try {
    result = calculateOeeTakt(input)
  } catch (caught) {
    error = caught instanceof Error ? caught.message : 'Ogiltiga indata.'
  }

  const fields: { key: keyof OeeTaktInput; label: string; min: number; step: string }[] = [
    {
      key: 'availableTime',
      label: isSwedish ? 'Tillgänglig skifttid (min)' : 'Available shift time (min)',
      min: 0.000001,
      step: 'any',
    },
    {
      key: 'plannedDowntime',
      label: isSwedish ? 'Planerade stopp (min)' : 'Planned downtime (min)',
      min: 0,
      step: 'any',
    },
    {
      key: 'unplannedDowntime',
      label: isSwedish ? 'Oplanerade stopp (min)' : 'Unplanned downtime (min)',
      min: 0,
      step: 'any',
    },
    {
      key: 'idealCycleTime',
      label: isSwedish ? 'Ideal cykeltid (min/enhet)' : 'Ideal cycle time (min/unit)',
      min: 0.000001,
      step: 'any',
    },
    {
      key: 'totalUnits',
      label: isSwedish ? 'Producerat antal' : 'Total units produced',
      min: 1,
      step: '1',
    },
    {
      key: 'goodUnits',
      label: isSwedish ? 'Godkänt antal' : 'Good units',
      min: 0,
      step: '1',
    },
    {
      key: 'customerDemand',
      label: isSwedish ? 'Kundbehov per skift' : 'Customer demand per shift',
      min: 1,
      step: '1',
    },
  ]

  return (
    <section aria-label="OEE and takt time">
      <div className="quality-metrics-inputs">
        {fields.map(({ key, label, min, step }) => (
          <label className="dialog-field" key={key}>
            <span>{label}</span>
            <input
              type="number"
              min={min}
              step={step}
              value={input[key]}
              onChange={(event) => onChange(key, Number(event.target.value))}
            />
          </label>
        ))}
      </div>
      {error && (
        <p className="quality-error" role="alert">
          {error}
        </p>
      )}
      {result && (
        <div className="stat-grid quality-metrics-grid">
          <Metric label="OEE" value={`${formatMetric(result.oee * 100, isSwedish)}%`} />
          <Metric
            label={isSwedish ? 'Tillgänglighet' : 'Availability'}
            value={`${formatMetric(result.availability * 100, isSwedish)}%`}
          />
          <Metric
            label={isSwedish ? 'Prestanda' : 'Performance'}
            value={`${formatMetric(result.performance * 100, isSwedish)}%`}
          />
          <Metric
            label={isSwedish ? 'Kvalitetsgrad' : 'Quality rate'}
            value={`${formatMetric(result.quality * 100, isSwedish)}%`}
          />
          <Metric
            label={isSwedish ? 'Takttid (min/enhet)' : 'Takt time (min/unit)'}
            value={formatMetric(result.taktTime, isSwedish)}
          />
          <Metric
            label={isSwedish ? 'Teoretisk kapacitet/skift' : 'Theoretical shift capacity'}
            value={formatMetric(result.theoreticalCapacity, isSwedish)}
          />
          <Metric
            label={isSwedish ? 'Kapacitetsmarginal' : 'Capacity margin'}
            value={formatMetric(result.capacityGap, isSwedish)}
          />
        </div>
      )}
      {result && result.warnings.length > 0 && (
        <ul className="imr-signal-list" role="status">
          {result.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
      <p className="session-caption">
        {isSwedish
          ? 'Tider anges i minuter. OEE = tillgänglighet × prestanda × kvalitet; planerade stopp dras bort före beräkningen. Bekräfta att ideal cykeltid och kundbehov avser samma produkt och skift.'
          : 'Times are entered in minutes. OEE = availability × performance × quality; planned downtime is excluded before calculation. Ensure ideal cycle time and demand refer to the same product and shift.'}
      </p>
    </section>
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

function kanoCategoryLabel(category: ReturnType<typeof classifyKano>, isSwedish: boolean): string {
  const labels = {
    attractive: ['Attraktiv', 'Attractive'],
    performance: ['Prestation', 'Performance'],
    mustBe: ['Måste-krav', 'Must-be'],
    indifferent: ['Likgiltig', 'Indifferent'],
    reverse: ['Omvänd', 'Reverse'],
    questionable: ['Tveksam', 'Questionable'],
  } as const
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
