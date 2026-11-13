import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import * as Dialog from '@radix-ui/react-dialog'
import Papa from 'papaparse'
import {
  Activity,
  ArrowDownAZ,
  BarChart3,
  Check,
  ChevronDown,
  CircleHelp,
  Clipboard,
  Clock3,
  Columns3,
  Download,
  Grid2X2,
  Languages,
  Moon,
  MoreHorizontal,
  Pencil,
  Plus,
  Redo2,
  Rows3,
  Search,
  Save,
  Sigma,
  Sun,
  Trash2,
  Undo2,
  Upload,
  X,
} from 'lucide-react'
import './i18n'
import './App.css'
import i18n from './i18n'
import {
  useWorkbookStore,
  type SheetColumn,
  type SheetRow,
  type WorkbookDocument,
  type WorkbookSnapshot,
  type WorksheetSnapshot,
} from './store/workbook'
import { statsWorker } from './workers/client'
import { loadAutosave, saveAutosave } from './utils/projects'
import { workbookDocument } from './store/workbook'
import { filterRowIndexes } from './utils/filterRows'
import { selectionBounds, selectionToTsv } from './utils/worksheetSelection'
import type { DescriptiveSummary } from './stats/descriptive'
import type { OneSampleTResult } from './stats/oneSampleT'
import type { TwoSampleTResult } from './stats/twoSampleT'
import type { PairedTResult } from './stats/pairedT'
import type { OneProportionResult } from './stats/oneProportion'
import type { TwoProportionsResult } from './stats/twoProportions'
import type { CorrelationResult } from './stats/correlation'
import type { OneSamplePoissonRateResult } from './stats/oneSamplePoissonRate'
import type { OneSampleZResult } from './stats/oneSampleZ'
import type { NormalKsResult } from './stats/normalKs'
import type { AndersonDarlingNormalResult } from './stats/normalAndersonDarling'
import type { PoissonGoodnessOfFitResult } from './stats/poissonGoodnessOfFit'
import type { ChiSquareIndependenceResult } from './stats/chiSquare'
import type { ChiSquareGoodnessOfFitResult } from './stats/chiSquareGoodnessOfFit'
import type { CategoryProbability } from './stats/chiSquareGoodnessOfFit'
import type { FisherExactResult } from './stats/fisherExact'
import type { ProcessCapabilityResult } from './stats/processCapability'
import type { ImrControlChartResult } from './stats/imrControlChart'
import type { GraphModel } from './charts/graphData'
import { powerCurveGraph, survivalGraph, timeSeriesGraph } from './charts/analysisGraphs'
import type { GageRrResult } from './quality/gageRr'
import type { SubgroupChartKind, SubgroupControlChartResult } from './quality/subgroupControlChart'
import type { TwoSampleZResult } from './stats/twoSampleZ'
import type { TwoSamplePoissonRateResult } from './stats/twoSamplePoissonRate'
import type { VarianceComparisonResult } from './stats/compareVariances'
import type { OneWayAnovaResult } from './stats/oneWayAnova'
import type { TwoWayAnovaResult } from './stats/twoWayAnova'
import type { TwoLevelFactorialAnalysis } from './doe/twoLevelFactorial'
import { createTwoLevelFactorial } from './doe/twoLevelFactorial'
import type { LinearRegressionResult } from './stats/linearRegression'
import type { KaplanMeierResult } from './stats/survival'
import type { ParametricSurvivalResult } from './stats/parametricSurvival'
import type { TimeSeriesOptions, TimeSeriesResult } from './stats/timeSeries'
import type { PowerRequest, PowerResult, PowerTest } from './stats/power'
import { LinearRegressionDialog } from './dialogs/LinearRegressionDialog'
import { SurvivalDialog } from './dialogs/SurvivalDialog'
import { TimeSeriesDialog } from './dialogs/TimeSeriesDialog'
import { PowerDialog } from './dialogs/PowerDialog'
import { FlowchartEditor } from './diagrams/FlowchartEditor'
import type { NonparametricResult, NonparametricRequest } from './dialogs/NonparametricDialog'
import type { ResamplingRequest, ResamplingResult } from './dialogs/ResamplingDialog'
import { OneSampleTDialog } from './dialogs/OneSampleTDialog'
import { DataOperationsDialog, type DataOperationResult } from './dialogs/DataOperationsDialog'
import { ColumnFormulaDialog } from './dialogs/ColumnFormulaDialog'
import { type CalculatedColumn } from './utils/columnFormula'
import { TwoSampleTDialog } from './dialogs/TwoSampleTDialog'
import { PairedTDialog } from './dialogs/PairedTDialog'
import { OneProportionDialog } from './dialogs/OneProportionDialog'
import { TwoProportionsDialog } from './dialogs/TwoProportionsDialog'
import { CorrelationDialog } from './dialogs/CorrelationDialog'
import { OneSamplePoissonRateDialog } from './dialogs/OneSamplePoissonRateDialog'
import { OneSampleZDialog } from './dialogs/OneSampleZDialog'
import { NormalKSDialog } from './dialogs/NormalKSDialog'
import { AndersonDarlingDialog } from './dialogs/AndersonDarlingDialog'
import { PoissonGoodnessOfFitDialog } from './dialogs/PoissonGoodnessOfFitDialog'
import { ChiSquareDialog } from './dialogs/ChiSquareDialog'
import { ChiSquareGoodnessOfFitDialog } from './dialogs/ChiSquareGoodnessOfFitDialog'
import { FisherExactDialog } from './dialogs/FisherExactDialog'
import { ProcessCapabilityDialog } from './dialogs/ProcessCapabilityDialog'
import { ImrControlChartDialog } from './dialogs/ImrControlChartDialog'
import { ImrControlCharts } from './charts/ImrControlCharts'
import { GraphPlot } from './charts/GraphPlot'
import { GraphDialog, type GraphSelection } from './dialogs/GraphDialog'
import { QualityStudioDialog } from './dialogs/QualityStudioDialog'
import { GageRrDialog } from './dialogs/GageRrDialog'
import { SubgroupControlChartDialog } from './dialogs/SubgroupControlChartDialog'
import { SubgroupControlCharts } from './charts/SubgroupControlCharts'
import { TwoSampleZDialog } from './dialogs/TwoSampleZDialog'
import { TwoSamplePoissonRateDialog } from './dialogs/TwoSamplePoissonRateDialog'
import { CompareVariancesDialog } from './dialogs/CompareVariancesDialog'
import { OneWayAnovaDialog } from './dialogs/OneWayAnovaDialog'
import { TwoWayAnovaDialog } from './dialogs/TwoWayAnovaDialog'
import { NonparametricDialog } from './dialogs/NonparametricDialog'
import { ResamplingDialog } from './dialogs/ResamplingDialog'
import {
  TwoLevelFactorialDialog,
  type TwoLevelFactorialRequest,
} from './dialogs/TwoLevelFactorialDialog'

const menuKeys = [
  'file',
  'edit',
  'data',
  'calculate',
  'statistics',
  'graphs',
  'quality',
  'editor',
  'tools',
  'window',
  'help',
] as const
const menuContent: Record<string, string[]> = {
  file: ['newProject', 'openProject', 'saveProject', 'importData', 'exportCsv'],
  edit: ['undo', 'redo', 'copySession'],
  data: [
    'sortAscending',
    'sortDescending',
    'deleteActiveRow',
    'deleteActiveColumn',
    'replaceMissing',
    'addRow',
    'addColumn',
    'dataOperations',
  ],
  calculate: ['descriptiveStatistics', 'standardizeColumn', 'columnCalculator'],
  statistics: [
    'oneSampleT',
    'oneSampleZ',
    'twoSampleZ',
    'twoSampleT',
    'pairedT',
    'oneProportion',
    'twoProportions',
    'correlation',
    'oneSamplePoissonRate',
    'twoSamplePoissonRate',
    'compareVariances',
    'oneWayAnova',
    'twoWayAnova',
    'twoLevelFactorial',
    'linearRegression',
    'survivalAnalysis',
    'timeSeriesAnalysis',
    'powerSampleSize',
    'nonparametricTests',
    'resamplingTests',
    'normalAD',
    'poissonGOF',
    'normalKS',
    'chiSquare',
    'chiSquareUniform',
    'fisherExact',
    'processCapability',
  ],
  graphs: ['imrControlChart', 'chartBuilder'],
  quality: ['qualityStudio', 'gageRr', 'subgroupControlChart'],
  editor: ['flowchartEditor'],
  tools: ['settings'],
  window: ['worksheetWindow', 'sessionWindow'],
  help: ['aboutStatLab', 'analysisStatus'],
}
const actionLabelKeys: Record<string, string> = {
  newProject: 'newProject',
  openProject: 'openProject',
  saveProject: 'saveProject',
  importData: 'importData',
  exportCsv: 'export',
  copySession: 'copySession',
  undo: 'undo',
  redo: 'redo',
  descriptiveStatistics: 'descriptiveStatistics',
  columnCalculator: 'columnCalculator',
  settings: 'settings',
  worksheetWindow: 'worksheetWindow',
  sessionWindow: 'sessionWindow',
  aboutStatLab: 'aboutStatLab',
  analysisStatus: 'analysisStatus',
  sortAscending: 'sortAscending',
  sortDescending: 'sortDescending',
  deleteActiveRow: 'deleteActiveRow',
  deleteActiveColumn: 'deleteActiveColumn',
  replaceMissing: 'replaceMissing',
  addRow: 'addRow',
  addColumn: 'addColumn',
  dataOperations: 'dataOperations',
  standardizeColumn: 'standardizeColumn',
  oneSampleT: 'oneSampleT',
  oneSampleZ: 'oneSampleZ',
  twoSampleZ: 'twoSampleZ',
  twoSampleT: 'twoSampleT',
  pairedT: 'pairedT',
  oneProportion: 'oneProportion',
  twoProportions: 'twoProportions',
  correlation: 'correlation',
  oneSamplePoissonRate: 'oneSamplePoissonRate',
  twoSamplePoissonRate: 'twoSamplePoissonRate',
  compareVariances: 'compareVariances',
  oneWayAnova: 'oneWayAnova',
  twoWayAnova: 'twoWayAnova',
  twoLevelFactorial: 'twoLevelFactorial',
  linearRegression: 'linearRegression',
  survivalAnalysis: 'survivalAnalysis',
  timeSeriesAnalysis: 'timeSeriesAnalysis',
  powerSampleSize: 'powerSampleSize',
  flowchartEditor: 'flowchartEditor',
  nonparametricTests: 'nonparametricTests',
  resamplingTests: 'resamplingTests',
  normalKS: 'normalKS',
  normalAD: 'normalAD',
  poissonGOF: 'poissonGOF',
  chiSquare: 'chiSquare',
  chiSquareUniform: 'chiSquareUniform',
  fisherExact: 'fisherExact',
  processCapability: 'processCapability',
  imrControlChart: 'imrControlChart',
  chartBuilder: 'chartBuilder',
  qualityStudio: 'qualityStudio',
  gageRr: 'gageRr',
  subgroupControlChart: 'subgroupControlChart',
}

interface SessionResult {
  title: string
  columnName: string
  summary?: DescriptiveSummary
  oneSampleT?: OneSampleTResult
  oneSampleZ?: OneSampleZResult
  normalKS?: NormalKsResult
  normalAD?: AndersonDarlingNormalResult
  poissonGoodnessOfFit?: PoissonGoodnessOfFitResult
  chiSquare?: ChiSquareIndependenceResult
  chiSquareGoodnessOfFit?: ChiSquareGoodnessOfFitResult
  fisherExact?: FisherExactResult
  processCapability?: ProcessCapabilityResult
  imrControlChart?: ImrControlChartResult
  graph?: GraphModel
  gageRr?: GageRrResult
  subgroupControlChart?: SubgroupControlChartResult
  twoSampleZ?: TwoSampleZResult
  twoSampleT?: TwoSampleTResult
  pairedT?: PairedTResult
  oneProportion?: OneProportionResult
  twoProportions?: TwoProportionsResult
  correlation?: CorrelationResult
  oneSamplePoissonRate?: OneSamplePoissonRateResult
  twoSamplePoissonRate?: TwoSamplePoissonRateResult
  varianceComparison?: VarianceComparisonResult
  oneWayAnova?: OneWayAnovaResult
  twoWayAnova?: TwoWayAnovaResult
  nonparametric?: NonparametricResult
  resampling?: ResamplingResult
  twoLevelFactorial?: TwoLevelFactorialAnalysis
  linearRegression?: LinearRegressionResult
  survival?: KaplanMeierResult
  parametricSurvival?: ParametricSurvivalResult
  timeSeries?: TimeSeriesResult
  power?: PowerResult
  powerGraph?: GraphModel
  survivalGraph?: GraphModel
  timeSeriesGraph?: GraphModel
  createdAt: Date
}

interface AppCommand {
  action: string
  group: string
  label: string
  disabled: boolean
}

function formatValue(value: number): string {
  return new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 3 }).format(value)
}

function formatPValue(value: number, language: string): string {
  if (value < 0.001) return language === 'sv' ? '< 0,001' : '< 0.001'
  return new Intl.NumberFormat(language === 'sv' ? 'sv-SE' : 'en-US', {
    maximumFractionDigits: 3,
  }).format(value)
}

function powerTestLabel(test: PowerTest, language: string): string {
  const labels: Record<PowerTest, [string, string]> = {
    oneSampleZ: ['1-urvals Z-medelvärde', 'One-sample Z mean'],
    twoSampleZ: ['2-urvals Z-medelvärde', 'Two-sample Z means'],
    oneProportion: ['1-proportion Z', 'One-proportion Z'],
    twoProportions: ['2-proportion Z', 'Two-proportion Z'],
    oneSamplePoisson: ['1-urvals Poisson-hastighet', 'One-sample Poisson rate'],
    twoSamplePoisson: ['2-urvals Poisson-hastighet', 'Two-sample Poisson rates'],
  }
  return labels[test][language === 'sv' ? 0 : 1]
}

function powerUsesTwoGroups(test: PowerTest): boolean {
  return test === 'twoSampleZ' || test === 'twoProportions' || test === 'twoSamplePoisson'
}

function gageAnovaLabel(
  source: GageRrResult['anova'][number]['source'],
  isSwedish: boolean,
): string {
  const labels = {
    part: ['Del', 'Part'],
    operator: ['Operatör', 'Operator'],
    partOperator: ['Del × operatör', 'Part × operator'],
    repeatability: ['Upprepbarhet / fel', 'Repeatability / error'],
  } as const
  return labels[source][isSwedish ? 0 : 1]
}

function gageComponentLabel(
  component: keyof GageRrResult['varianceComponents'],
  isSwedish: boolean,
): string {
  const labels: Record<keyof GageRrResult['varianceComponents'], [string, string]> = {
    repeatability: ['Upprepbarhet', 'Repeatability'],
    operator: ['Operatör', 'Operator'],
    partOperator: ['Del × operatör', 'Part × operator'],
    reproducibility: ['Reproducerbarhet', 'Reproducibility'],
    gageRr: ['Gage R&R', 'Gage R&R'],
    partToPart: ['Del-till-del', 'Part-to-part'],
    total: ['Total variation', 'Total variation'],
  }
  return labels[component][isSwedish ? 0 : 1]
}

function GridCell({
  rowIndex,
  column,
  value,
  isActive,
  isSelected,
  isDragging,
  onActivate,
  onExtendSelection,
  onDragStart,
  onDragEnter,
  onDraftChange,
  onCommit,
}: {
  rowIndex: number
  column: SheetColumn
  value: string
  isActive: boolean
  isSelected: boolean
  isDragging: boolean
  onActivate: (extend: boolean) => void
  onExtendSelection: (rowDelta: number, columnDelta: number) => void
  onDragStart: () => void
  onDragEnter: () => void
  onDraftChange: (dirty: boolean) => void
  onCommit: (value: string) => void
}) {
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)
  const pointerActivated = useRef(false)

  return (
    <input
      ref={inputRef}
      aria-label={`${column.name}, rad ${rowIndex + 1}`}
      className={`cell-input${column.type === 'text' ? ' text-cell' : ''}${value === '' ? ' missing' : ''}${isSelected ? ' selected' : ''}`}
      data-column={column.id}
      data-row={rowIndex}
      value={draft}
      placeholder="*"
      onMouseDown={(event) => {
        if (event.button !== 0) return
        pointerActivated.current = true
        onActivate(event.shiftKey)
        onDragStart()
      }}
      onMouseEnter={() => {
        if (isDragging) onDragEnter()
      }}
      onClick={() => {
        pointerActivated.current = false
      }}
      onFocus={() => {
        if (pointerActivated.current) {
          pointerActivated.current = false
          return
        }
        if (!isActive) onActivate(false)
      }}
      onChange={(event) => {
        setDraft(event.target.value)
        onDraftChange(event.target.value !== value)
      }}
      onBlur={() => {
        if (draft !== value) onCommit(draft)
        onDraftChange(false)
      }}
      onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
        if (event.shiftKey && draft === value) {
          const movement: Record<string, [number, number]> = {
            ArrowDown: [1, 0],
            ArrowLeft: [0, -1],
            ArrowRight: [0, 1],
            ArrowUp: [-1, 0],
          }
          const delta = movement[event.key]
          if (delta) {
            event.preventDefault()
            onExtendSelection(...delta)
            return
          }
        }
        if (event.key === 'Enter') {
          event.preventDefault()
          inputRef.current?.blur()
          document
            .querySelector<HTMLInputElement>(
              `[data-row="${rowIndex + 1}"][data-column="${column.id}"]`,
            )
            ?.focus()
        }
        if (event.key === 'Escape') {
          setDraft(value)
          onDraftChange(false)
          inputRef.current?.blur()
        }
      }}
    />
  )
}

function inferColumnType(values: string[]): SheetColumn['type'] {
  const present = values.filter((value) => value.trim() !== '')
  if (present.length > 0 && present.every((value) => Number.isFinite(Number(value))))
    return 'numeric'
  if (present.length > 0 && present.every((value) => !Number.isNaN(Date.parse(value))))
    return 'date'
  return 'text'
}

function parseTable(data: unknown[][]): { columns: SheetColumn[]; rows: SheetRow[] } | null {
  const nonEmpty = data.filter((row) => row.some((value) => String(value ?? '').trim() !== ''))
  if (nonEmpty.length < 2) return null
  const headers = nonEmpty[0].map((value, index) => String(value || `Variabel ${index + 1}`))
  const body = nonEmpty.slice(1).map((row) => headers.map((_, index) => String(row[index] ?? '')))
  const columns = headers.map((name, index): SheetColumn => ({
    id: `C${index + 1}`,
    name,
    type: inferColumnType(body.map((row) => row[index])),
  }))
  const rows = body.map((values) =>
    Object.fromEntries(columns.map((column, index) => [column.id, values[index]])),
  )
  return { columns, rows }
}

function isWorkbookSnapshot(value: unknown): value is WorkbookSnapshot {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    Array.isArray(candidate.columns) &&
    candidate.columns.every(
      (column) =>
        typeof column === 'object' &&
        column !== null &&
        typeof (column as SheetColumn).id === 'string' &&
        typeof (column as SheetColumn).name === 'string' &&
        ['text', 'numeric', 'date'].includes((column as SheetColumn).type),
    ) &&
    Array.isArray(candidate.rows) &&
    candidate.rows.every(
      (row) =>
        typeof row === 'object' &&
        row !== null &&
        !Array.isArray(row) &&
        Object.values(row).every((cell) => typeof cell === 'string'),
    )
  )
}

function isWorkbookDocument(value: unknown): value is WorkbookDocument {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  if (
    candidate.version !== 1 ||
    typeof candidate.activeSheetId !== 'string' ||
    !Array.isArray(candidate.sheets) ||
    candidate.sheets.length === 0
  ) {
    return false
  }
  const sheets = candidate.sheets as unknown[]
  return (
    sheets.every(
      (sheet) =>
        typeof sheet === 'object' &&
        sheet !== null &&
        typeof (sheet as WorksheetSnapshot).id === 'string' &&
        typeof (sheet as WorksheetSnapshot).name === 'string' &&
        isWorkbookSnapshot(sheet),
    ) &&
    sheets.some((sheet) => (sheet as WorksheetSnapshot).id === candidate.activeSheetId) &&
    new Set(sheets.map((sheet) => (sheet as WorksheetSnapshot).id)).size === sheets.length
  )
}

function App() {
  const [language, setLanguage] = useState(() => {
    const savedLanguage = localStorage.getItem('statlab-language')
    return savedLanguage === 'en' || savedLanguage === 'sv' ? savedLanguage : i18n.language
  })
  const [projectName, setProjectName] = useState(
    () => localStorage.getItem('statlab-project-name') || 'Produktionsanalys',
  )
  const t = (key: string) => i18n.t(key, { lng: language })
  const columns = useWorkbookStore((state) => state.columns)
  const rows = useWorkbookStore((state) => state.rows)
  const worksheets = useWorkbookStore((state) => state.worksheets)
  const activeSheetId = useWorkbookStore((state) => state.activeSheetId)
  const activeCell = useWorkbookStore((state) => state.activeCell)
  const setCell = useWorkbookStore((state) => state.setCell)
  const pasteCells = useWorkbookStore((state) => state.pasteCells)
  const insertRow = useWorkbookStore((state) => state.insertRow)
  const addColumn = useWorkbookStore((state) => state.addColumn)
  const appendNumericColumn = useWorkbookStore((state) => state.appendNumericColumn)
  const appendColumn = useWorkbookStore((state) => state.appendColumn)
  const deleteRow = useWorkbookStore((state) => state.deleteRow)
  const deleteColumn = useWorkbookStore((state) => state.deleteColumn)
  const replaceMissing = useWorkbookStore((state) => state.replaceMissing)
  const renameColumn = useWorkbookStore((state) => state.renameColumn)
  const replaceData = useWorkbookStore((state) => state.replaceData)
  const createWorksheet = useWorkbookStore((state) => state.createWorksheet)
  const renameWorksheetInStore = useWorkbookStore((state) => state.renameWorksheet)
  const deleteWorksheetFromStore = useWorkbookStore((state) => state.deleteWorksheet)
  const activateWorksheet = useWorkbookStore((state) => state.activateWorksheet)
  const replaceWorkbook = useWorkbookStore((state) => state.replaceWorkbook)
  const sortByColumn = useWorkbookStore((state) => state.sortByColumn)
  const setActiveCell = useWorkbookStore((state) => state.setActiveCell)
  const undo = useWorkbookStore((state) => state.undo)
  const redo = useWorkbookStore((state) => state.redo)
  const [targetColumn, setTargetColumn] = useState('C4')
  const [filterQuery, setFilterQuery] = useState('')
  const [selectionAnchor, setSelectionAnchor] = useState({ row: 0, column: 0 })
  const [isDraggingSelection, setIsDraggingSelection] = useState(false)
  const [renamingWorksheetId, setRenamingWorksheetId] = useState<string | null>(null)
  const [worksheetNameDraft, setWorksheetNameDraft] = useState('')
  const [pendingDeleteWorksheetId, setPendingDeleteWorksheetId] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'ascending' | 'descending'>('ascending')
  const [session, setSession] = useState<SessionResult | null>(null)
  const [oneSampleTDialogOpen, setOneSampleTDialogOpen] = useState(false)
  const [oneSampleZDialogOpen, setOneSampleZDialogOpen] = useState(false)
  const [normalKSDialogOpen, setNormalKSDialogOpen] = useState(false)
  const [normalADDialogOpen, setNormalADDialogOpen] = useState(false)
  const [poissonGoodnessOfFitDialogOpen, setPoissonGoodnessOfFitDialogOpen] = useState(false)
  const [chiSquareDialogOpen, setChiSquareDialogOpen] = useState(false)
  const [chiSquareGoodnessOfFitDialogOpen, setChiSquareGoodnessOfFitDialogOpen] = useState(false)
  const [fisherExactDialogOpen, setFisherExactDialogOpen] = useState(false)
  const [processCapabilityDialogOpen, setProcessCapabilityDialogOpen] = useState(false)
  const [imrControlChartDialogOpen, setImrControlChartDialogOpen] = useState(false)
  const [graphDialogOpen, setGraphDialogOpen] = useState(false)
  const [qualityStudioOpen, setQualityStudioOpen] = useState(false)
  const [gageRrDialogOpen, setGageRrDialogOpen] = useState(false)
  const [subgroupControlChartDialogOpen, setSubgroupControlChartDialogOpen] = useState(false)
  const [twoSampleZDialogOpen, setTwoSampleZDialogOpen] = useState(false)
  const [twoSampleTDialogOpen, setTwoSampleTDialogOpen] = useState(false)
  const [pairedTDialogOpen, setPairedTDialogOpen] = useState(false)
  const [oneProportionDialogOpen, setOneProportionDialogOpen] = useState(false)
  const [twoProportionsDialogOpen, setTwoProportionsDialogOpen] = useState(false)
  const [correlationDialogOpen, setCorrelationDialogOpen] = useState(false)
  const [oneSamplePoissonDialogOpen, setOneSamplePoissonDialogOpen] = useState(false)
  const [twoSamplePoissonDialogOpen, setTwoSamplePoissonDialogOpen] = useState(false)
  const [varianceDialogOpen, setVarianceDialogOpen] = useState(false)
  const [oneWayAnovaDialogOpen, setOneWayAnovaDialogOpen] = useState(false)
  const [twoWayAnovaDialogOpen, setTwoWayAnovaDialogOpen] = useState(false)
  const [twoLevelFactorialDialogOpen, setTwoLevelFactorialDialogOpen] = useState(false)
  const [linearRegressionDialogOpen, setLinearRegressionDialogOpen] = useState(false)
  const [survivalDialogOpen, setSurvivalDialogOpen] = useState(false)
  const [timeSeriesDialogOpen, setTimeSeriesDialogOpen] = useState(false)
  const [powerDialogOpen, setPowerDialogOpen] = useState(false)
  const [flowchartEditorOpen, setFlowchartEditorOpen] = useState(false)
  const [nonparametricDialogOpen, setNonparametricDialogOpen] = useState(false)
  const [resamplingDialogOpen, setResamplingDialogOpen] = useState(false)
  const [dataOperationsDialogOpen, setDataOperationsDialogOpen] = useState(false)
  const [columnFormulaDialogOpen, setColumnFormulaDialogOpen] = useState(false)
  const [hasDraft, setHasDraft] = useState(false)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState({ top: 98, left: 18 })
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [commandQuery, setCommandQuery] = useState('')
  const [commandIndex, setCommandIndex] = useState(0)
  const [appDialog, setAppDialog] = useState<'settings' | 'about' | 'analysis' | null>(null)
  const [toast, setToast] = useState('')
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    localStorage.getItem('statlab-theme') === 'dark' ? 'dark' : 'light',
  )
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const projectInputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const visibleRowIndexes = useMemo(() => filterRowIndexes(rows, filterQuery), [filterQuery, rows])
  const operationWorksheets = useMemo(
    () =>
      worksheets.map((worksheet) =>
        worksheet.id === activeSheetId ? { ...worksheet, columns, rows } : worksheet,
      ),
    [activeSheetId, columns, rows, worksheets],
  )
  const commands = useMemo<AppCommand[]>(
    () =>
      menuKeys.flatMap((menuKey) =>
        menuContent[menuKey].map((action) => ({
          action,
          group: i18n.t(menuKey, { lng: language }),
          label: i18n.t(actionLabelKeys[action] ?? action, { lng: language }),
          disabled: action === 'copySession' && !session,
        })),
      ),
    [language, session],
  )
  const filteredCommands = useMemo(() => {
    const query = commandQuery.trim().toLocaleLowerCase(language === 'sv' ? 'sv' : 'en')
    if (!query) return commands
    return commands.filter((command) =>
      `${command.label} ${command.group}`
        .toLocaleLowerCase(language === 'sv' ? 'sv' : 'en')
        .includes(query),
    )
  }, [commandQuery, commands, language])

  const virtualizer = useVirtualizer({
    count: visibleRowIndexes.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 36,
    overscan: 10,
  })
  const virtualRows = virtualizer.getVirtualItems()
  const topPadding = virtualRows[0]?.start ?? 0
  const bottomPadding =
    virtualRows.length > 0
      ? virtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end
      : 0
  const validNumericCount = useMemo(
    () =>
      rows.reduce(
        (count, row) =>
          count +
          columns.filter((column) => column.type === 'numeric' && row[column.id]?.trim()).length,
        0,
      ),
    [columns, rows],
  )

  useEffect(() => {
    const column = columns[activeCell.column]
    if (!column) return
    document
      .querySelector<HTMLInputElement>(`[data-row="${activeCell.row}"][data-column="${column.id}"]`)
      ?.focus()
  }, [activeCell.row, activeCell.column, columns])

  useEffect(() => {
    setSelectionAnchor({ row: 0, column: 0 })
  }, [activeSheetId])

  useEffect(() => {
    if (!isDraggingSelection) return
    const stopDragging = () => setIsDraggingSelection(false)
    window.addEventListener('mouseup', stopDragging)
    window.addEventListener('blur', stopDragging)
    return () => {
      window.removeEventListener('mouseup', stopDragging)
      window.removeEventListener('blur', stopDragging)
    }
  }, [isDraggingSelection])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('statlab-theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('statlab-language', language)
    void i18n.changeLanguage(language)
  }, [language])

  useEffect(() => {
    localStorage.setItem('statlab-project-name', projectName)
  }, [projectName])

  useEffect(() => {
    let active = true
    void loadAutosave()
      .then((saved) => {
        if (active && saved) {
          replaceWorkbook(saved)
        }
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [replaceWorkbook])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const state = useWorkbookStore.getState()
      void saveAutosave(workbookDocument(state))
        .then(() => setSavedAt(new Date()))
        .catch(() => undefined)
    }, 700)
    return () => window.clearTimeout(timer)
  }, [activeSheetId, columns, rows, worksheets])

  useEffect(() => {
    const listener = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setMenuOpen(null)
        setCommandQuery('')
        setCommandIndex(0)
        setCommandPaletteOpen(true)
        return
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        const focusedCell = document.activeElement
        if (focusedCell instanceof HTMLInputElement && focusedCell.classList.contains('cell-input'))
          focusedCell.blur()
        if (event.shiftKey) redo()
        else undo()
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        const focusedCell = document.activeElement
        if (focusedCell instanceof HTMLInputElement && focusedCell.classList.contains('cell-input'))
          focusedCell.blur()
        redo()
      }
    }
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [redo, undo])

  useEffect(() => {
    setCommandIndex(0)
  }, [commandQuery, commandPaletteOpen])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2800)
    return () => window.clearTimeout(timer)
  }, [toast])

  const activeColumn = columns[activeCell.column]
  const selectedBounds = selectionBounds(selectionAnchor, activeCell)
  const activeWorksheet = worksheets.find((worksheet) => worksheet.id === activeSheetId)
  const graphCount = Number(
    Boolean(
      session?.graph ||
      session?.powerGraph ||
      session?.survivalGraph ||
      session?.timeSeriesGraph ||
      session?.timeSeries ||
      session?.survival ||
      session?.parametricSurvival ||
      session?.imrControlChart ||
      session?.subgroupControlChart,
    ),
  )
  const analysisDialogKey = `${activeSheetId}:${targetColumn}:${columns
    .map((column) => `${column.id}:${column.type}`)
    .join('|')}`
  const worksheetName = (worksheet: WorksheetSnapshot) =>
    worksheet.id === 'worksheet-1' && worksheet.name === 'Arbetsblad 1'
      ? t('sheet')
      : worksheet.name
  const isSwedish = language === 'sv'
  const numericColumns = columns.filter((column) => column.type === 'numeric')
  const categoryColumns = columns.filter((column) => column.type !== 'numeric')

  async function runAnalysis(columnId = targetColumn) {
    const column = columns.find((item) => item.id === columnId)
    if (!column || column.type !== 'numeric') {
      setToast('Välj en numerisk kolumn för beskrivande statistik.')
      return
    }
    const values = rows.map((row) => {
      const raw = row[column.id]?.trim()
      return raw ? Number(raw.replace(',', '.')) : null
    })
    try {
      const summary = await statsWorker.describe(values)
      setSession({
        title: 'Beskrivande statistik',
        columnName: column.name,
        summary,
        createdAt: new Date(),
      })
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Analysen kunde inte genomföras.')
    }
  }

  async function runNonparametricAnalysis(request: NonparametricRequest) {
    try {
      let result: NonparametricResult
      let columnName: string
      if (request.kind === 'mannWhitney') {
        const firstColumn = columns.find((column) => column.id === request.column1)
        const secondColumn = columns.find((column) => column.id === request.column2)
        if (!firstColumn || !secondColumn) throw new Error('Choose both numeric group columns.')
        const first = rows.map((row) => {
          const raw = row[firstColumn.id]?.trim()
          return raw ? Number(raw.replace(',', '.')) : null
        })
        const second = rows.map((row) => {
          const raw = row[secondColumn.id]?.trim()
          return raw ? Number(raw.replace(',', '.')) : null
        })
        result = {
          kind: request.kind,
          result: await statsWorker.mannWhitney(first, second, request.alpha),
        }
        columnName = `${firstColumn.name} · ${secondColumn.name}`
      } else if (request.kind === 'kruskalWallis') {
        const measurement = columns.find((column) => column.id === request.measurement)
        const group = columns.find((column) => column.id === request.group)
        if (!measurement || !group) throw new Error('Choose measurement and group columns.')
        const values = rows.map((row) => {
          const raw = row[measurement.id]?.trim()
          return raw ? Number(raw.replace(',', '.')) : null
        })
        result = {
          kind: request.kind,
          result: await statsWorker.kruskalWallis(
            values,
            rows.map((row) => row[group.id] ?? null),
            request.alpha,
          ),
        }
        columnName = `${measurement.name} · ${group.name}`
      } else if (request.kind === 'moodMedian') {
        const measurement = columns.find((column) => column.id === request.measurement)
        const group = columns.find((column) => column.id === request.group)
        if (!measurement || !group) throw new Error('Choose measurement and group columns.')
        const values = rows.map((row) => {
          const raw = row[measurement.id]?.trim()
          return raw ? Number(raw.replace(',', '.')) : null
        })
        result = {
          kind: request.kind,
          result: await statsWorker.moodMedian(
            values,
            rows.map((row) => row[group.id] ?? null),
            request.alpha,
          ),
        }
        columnName = `${measurement.name} · ${group.name}`
      } else if (request.kind === 'friedman') {
        const treatments = request.treatments.map((id) =>
          columns.find((column) => column.id === id),
        )
        if (treatments.some((column) => !column || column.type !== 'numeric')) {
          throw new Error('Choose valid numeric treatment columns.')
        }
        const validTreatments = treatments as SheetColumn[]
        const treatmentValues = validTreatments.map((column) =>
          rows.map((row) => {
            const raw = row[column.id]?.trim()
            return raw ? Number(raw.replace(',', '.')) : null
          }),
        )
        result = {
          kind: request.kind,
          result: await statsWorker.friedman(
            treatmentValues,
            validTreatments.map((column) => column.name),
            request.alpha,
          ),
        }
        columnName = validTreatments.map((column) => column.name).join(' · ')
      } else {
        const column = columns.find((item) => item.id === request.column)
        if (!column || column.type !== 'numeric') throw new Error('Choose a numeric column.')
        const values = rows.map((row) => {
          const raw = row[column.id]?.trim()
          return raw ? Number(raw.replace(',', '.')) : null
        })
        if (request.kind === 'sign') {
          result = {
            kind: request.kind,
            result: await statsWorker.signTest(values, request.median, request.alpha),
          }
        } else if (request.kind === 'wilcoxon') {
          result = {
            kind: request.kind,
            result: await statsWorker.wilcoxonSignedRank(values, request.median, request.alpha),
          }
        } else {
          result = { kind: request.kind, result: await statsWorker.runsTest(values, request.alpha) }
        }
        columnName = column.name
      }
      setSession({
        title: language === 'sv' ? 'Icke-parametriskt test' : 'Nonparametric test',
        columnName,
        nonparametric: result,
        createdAt: new Date(),
      })
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : 'Nonparametric test could not be completed.',
      )
    }
  }

  async function runResamplingAnalysis(request: ResamplingRequest) {
    try {
      let result: ResamplingResult
      let columnName: string
      if (request.kind === 'bootstrap') {
        const column = columns.find((item) => item.id === request.column)
        if (!column || column.type !== 'numeric') throw new Error('Choose a numeric column.')
        const values = rows.map((row) => {
          const raw = row[column.id]?.trim()
          return raw ? Number(raw.replace(',', '.')) : null
        })
        result = {
          kind: 'bootstrap',
          result: await statsWorker.bootstrapInterval(
            values,
            request.statistic,
            request.resamples,
            request.seed,
            request.alpha,
          ),
        }
        columnName = column.name
      } else {
        const firstColumn = columns.find((column) => column.id === request.column1)
        const secondColumn = columns.find((column) => column.id === request.column2)
        if (
          !firstColumn ||
          !secondColumn ||
          firstColumn.type !== 'numeric' ||
          secondColumn.type !== 'numeric'
        ) {
          throw new Error('Choose two numeric columns.')
        }
        const first = rows.map((row) => {
          const raw = row[firstColumn.id]?.trim()
          return raw ? Number(raw.replace(',', '.')) : null
        })
        const second = rows.map((row) => {
          const raw = row[secondColumn.id]?.trim()
          return raw ? Number(raw.replace(',', '.')) : null
        })
        result = {
          kind: 'permutation',
          result: await statsWorker.permutationDifference(
            first,
            second,
            request.permutations,
            request.seed,
            request.alpha,
            request.statistic,
          ),
        }
        columnName = `${firstColumn.name} − ${secondColumn.name}`
      }
      setSession({
        title: language === 'sv' ? 'Resamplingstest' : 'Resampling analysis',
        columnName,
        resampling: result,
        createdAt: new Date(),
      })
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : 'Resampling analysis could not be completed.',
      )
    }
  }

  async function standardizeSelectedColumn() {
    const column = columns.find((item) => item.id === targetColumn)
    if (!column || column.type !== 'numeric') {
      setToast('Välj en numerisk kolumn för standardisering.')
      return
    }
    const values = rows.map((row) => {
      const raw = row[column.id]?.trim()
      return raw ? Number(raw.replace(',', '.')) : null
    })
    try {
      const result = await statsWorker.standardize(values)
      const name = `Z(${column.name})`
      const newColumnId = appendNumericColumn(
        name,
        result.values.map((value) => (value === null ? '' : String(value))),
      )
      setToast(`${name} lagrad i ${newColumnId}.`)
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Kolumnen kunde inte standardiseras.')
    }
  }

  function addCalculatedColumn(result: CalculatedColumn) {
    const columnId = appendNumericColumn(
      result.name,
      result.values.map((value) => (value === null ? '' : String(value))),
    )
    setTargetColumn(columnId)
    setToast(
      language === 'sv'
        ? `${result.name} lagrad i ${columnId}.`
        : `${result.name} stored in ${columnId}.`,
    )
  }

  async function runOneSampleTAnalysis(columnId: string, hypothesizedMean: number, alpha: number) {
    const column = columns.find((item) => item.id === columnId)
    if (!column || column.type !== 'numeric') {
      setToast('Välj en numerisk kolumn för 1-urvals t-testet.')
      return
    }
    const values = rows.map((row) => {
      const raw = row[column.id]?.trim()
      return raw ? Number(raw.replace(',', '.')) : null
    })
    try {
      const [result, summary] = await Promise.all([
        statsWorker.oneSampleT(values, hypothesizedMean, alpha),
        statsWorker.describe(values),
      ])
      setSession({
        title: '1-urvals t-test',
        columnName: column.name,
        summary,
        oneSampleT: result,
        createdAt: new Date(),
      })
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'T-testet kunde inte genomföras.')
    }
  }

  async function runOneSampleZAnalysis(
    columnId: string,
    hypothesizedMean: number,
    knownStandardDeviation: number,
    alpha: number,
  ) {
    const column = columns.find((item) => item.id === columnId)
    if (!column || column.type !== 'numeric') {
      setToast('Välj en numerisk kolumn för 1-urvals Z-testet.')
      return
    }
    const values = rows.map((row) => {
      const raw = row[column.id]?.trim()
      return raw ? Number(raw.replace(',', '.')) : null
    })
    try {
      const [result, summary] = await Promise.all([
        statsWorker.oneSampleZ(values, hypothesizedMean, knownStandardDeviation, alpha),
        statsWorker.describe(values),
      ])
      setSession({
        title: '1-urvals Z-test',
        columnName: column.name,
        summary,
        oneSampleZ: result,
        createdAt: new Date(),
      })
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Z-testet kunde inte genomföras.')
    }
  }

  async function runTwoSampleZAnalysis(
    columnId1: string,
    columnId2: string,
    sigma1: number,
    sigma2: number,
    hypothesizedDifference: number,
    alpha: number,
  ) {
    const column1 = columns.find((item) => item.id === columnId1)
    const column2 = columns.find((item) => item.id === columnId2)
    if (!column1 || !column2 || column1.type !== 'numeric' || column2.type !== 'numeric') {
      setToast('Välj två numeriska kolumner för 2-urvals Z-testet.')
      return
    }
    const values1 = rows.map((row) => {
      const raw = row[column1.id]?.trim()
      return raw ? Number(raw.replace(',', '.')) : null
    })
    const values2 = rows.map((row) => {
      const raw = row[column2.id]?.trim()
      return raw ? Number(raw.replace(',', '.')) : null
    })
    try {
      const [result, summary] = await Promise.all([
        statsWorker.twoSampleZ(values1, values2, sigma1, sigma2, hypothesizedDifference, alpha),
        statsWorker.describe(values1),
      ])
      setSession({
        title: '2-urvals Z-test',
        columnName: `${column1.name} − ${column2.name}`,
        summary,
        twoSampleZ: result,
        createdAt: new Date(),
      })
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Z-testet kunde inte genomföras.')
    }
  }

  async function runNormalKSAnalysis(columnId: string, mean: number, standardDeviation: number) {
    const column = columns.find((item) => item.id === columnId)
    if (!column || column.type !== 'numeric') {
      setToast('Välj en numerisk kolumn för Kolmogorov-Smirnov-testet.')
      return
    }
    const values = rows.map((row) => {
      const raw = row[column.id]?.trim()
      return raw ? Number(raw.replace(',', '.')) : null
    })
    try {
      const [result, summary] = await Promise.all([
        statsWorker.normalKolmogorovSmirnov(values, mean, standardDeviation),
        statsWorker.describe(values),
      ])
      setSession({
        title: 'Kolmogorov-Smirnov mot normal',
        columnName: column.name,
        summary,
        normalKS: result,
        createdAt: new Date(),
      })
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Normalitetstestet kunde inte genomföras.')
    }
  }

  async function runNormalADAnalysis(columnId: string, alpha: number) {
    const column = columns.find((item) => item.id === columnId)
    if (!column || column.type !== 'numeric') {
      setToast('Välj en numerisk kolumn för Anderson-Darling-testet.')
      return
    }
    const values = rows.map((row) => {
      const raw = row[column.id]?.trim()
      return raw ? Number(raw.replace(',', '.')) : null
    })
    try {
      const [result, summary] = await Promise.all([
        statsWorker.normalAndersonDarling(values, alpha),
        statsWorker.describe(values),
      ])
      setSession({
        title: 'Anderson-Darling för normalitet',
        columnName: column.name,
        summary,
        normalAD: result,
        createdAt: new Date(),
      })
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : 'Anderson-Darling-testet kunde inte genomföras.',
      )
    }
  }

  async function runProcessCapability(
    columnId: string,
    lowerSpecLimit: number,
    upperSpecLimit: number,
    target: number | null,
  ) {
    const column = columns.find((item) => item.id === columnId)
    if (!column || column.type !== 'numeric') {
      setToast('Välj en numerisk kolumn för kapabilitetsanalysen.')
      return
    }
    const values = rows.map((row) => {
      const raw = row[column.id]?.trim()
      return raw ? Number(raw.replace(',', '.')) : null
    })
    try {
      const result = await statsWorker.normalProcessCapability(
        values,
        lowerSpecLimit,
        upperSpecLimit,
        target,
      )
      setSession({
        title: 'Processkapabilitet (normal)',
        columnName: column.name,
        processCapability: result,
        createdAt: new Date(),
      })
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : 'Kapabilitetsanalysen kunde inte genomföras.',
      )
    }
  }

  async function runImrControlChartAnalysis(columnId: string) {
    const column = columns.find((item) => item.id === columnId)
    if (!column || column.type !== 'numeric') {
      setToast('Välj en numerisk kolumn för I-MR-diagrammet.')
      return
    }
    const values = rows.map((row) => {
      const raw = row[column.id]?.trim()
      return raw ? Number(raw.replace(',', '.')) : null
    })
    try {
      const result = await statsWorker.imrControlChart(values)
      setSession({
        title: 'I-MR-styrdiagram',
        columnName: column.name,
        imrControlChart: result,
        createdAt: new Date(),
      })
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'I-MR-diagrammet kunde inte beräknas.')
    }
  }

  async function runGageRrAnalysis(
    partColumnId: string,
    operatorColumnId: string,
    measurementColumnId: string,
    tolerance: number | null,
  ) {
    const partColumn = columns.find((column) => column.id === partColumnId)
    const operatorColumn = columns.find((column) => column.id === operatorColumnId)
    const measurementColumn = columns.find((column) => column.id === measurementColumnId)
    if (
      !partColumn ||
      !operatorColumn ||
      !measurementColumn ||
      measurementColumn.type !== 'numeric'
    ) {
      setToast('Välj del, operatör och numeriskt mätvärde för Gage R&R.')
      return
    }
    const measurements = rows.map((row) => {
      const raw = row[measurementColumn.id]?.trim()
      return raw ? Number(raw.replace(',', '.')) : null
    })
    try {
      const result = await statsWorker.crossedGageRr({
        parts: rows.map((row) => row[partColumn.id]?.trim() || null),
        operators: rows.map((row) => row[operatorColumn.id]?.trim() || null),
        measurements,
        tolerance,
      })
      setSession({
        title: 'Gage R&R (crossed)',
        columnName: `${measurementColumn.name} · ${partColumn.name} · ${operatorColumn.name}`,
        gageRr: result,
        createdAt: new Date(),
      })
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Gage R&R kunde inte beräknas.')
    }
  }

  async function runSubgroupControlChartAnalysis(
    kind: SubgroupChartKind,
    groupColumnId: string,
    measurementColumnId: string,
  ) {
    const groupColumn = columns.find((column) => column.id === groupColumnId)
    const measurementColumn = columns.find((column) => column.id === measurementColumnId)
    if (!groupColumn || !measurementColumn || measurementColumn.type !== 'numeric') {
      setToast('Välj en subgroupkolumn och ett numeriskt mätvärde.')
      return
    }
    const groups = rows.map((row) => row[groupColumn.id]?.trim() || null)
    const measurements = rows.map((row) => {
      const raw = row[measurementColumn.id]?.trim()
      return raw ? Number(raw.replace(',', '.')) : null
    })
    try {
      const result = await statsWorker.subgroupControlChart(groups, measurements, kind)
      setSession({
        title: kind === 'xbar-r' ? 'Xbar-R-styrdiagram' : 'Xbar-S-styrdiagram',
        columnName: `${measurementColumn.name} · ${groupColumn.name}`,
        subgroupControlChart: result,
        createdAt: new Date(),
      })
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Subgroupdiagrammet kunde inte beräknas.')
    }
  }

  async function runGraphAnalysis(selection: GraphSelection) {
    const valueColumn = columns.find((column) => column.id === selection.valueColumnId)
    const xColumn = columns.find((column) => column.id === selection.xColumnId)
    const yColumn = columns.find((column) => column.id === selection.yColumnId)
    const categoryColumn = columns.find((column) => column.id === selection.categoryColumnId)
    const readNumeric = (columnId: string | undefined) => {
      if (!columnId) return undefined
      return rows.map((row) => {
        const raw = row[columnId]?.trim()
        return raw ? Number(raw.replace(',', '.')) : null
      })
    }
    const names = [valueColumn, xColumn, yColumn, categoryColumn]
      .filter((column): column is SheetColumn => column !== undefined)
      .map((column) => column.name)
    try {
      const graph = await statsWorker.buildGraph({
        kind: selection.kind,
        values: readNumeric(
          selection.kind === 'scatter' ? selection.yColumnId : selection.valueColumnId,
        ),
        xValues: readNumeric(selection.xColumnId),
        categories: categoryColumn
          ? rows.map((row) => row[categoryColumn.id]?.trim() || null)
          : undefined,
        language,
      })
      setSession({
        title: graph.title,
        columnName: names.join(' · '),
        graph,
        createdAt: new Date(),
      })
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Diagrammet kunde inte skapas.')
    }
  }

  async function runChiSquareAnalysis(columnId1: string, columnId2: string, alpha: number) {
    const column1 = columns.find((item) => item.id === columnId1)
    const column2 = columns.find((item) => item.id === columnId2)
    if (!column1 || !column2) {
      setToast('Välj två kategorikolumner för chi-två-testet.')
      return
    }
    const values1 = rows.map((row) => row[column1.id] ?? null)
    const values2 = rows.map((row) => row[column2.id] ?? null)
    try {
      const result = await statsWorker.chiSquareIndependence(values1, values2, alpha)
      setSession({
        title: 'Korstabell och chi-två-test',
        columnName: `${column1.name} · ${column2.name}`,
        chiSquare: result,
        createdAt: new Date(),
      })
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Chi-två-testet kunde inte genomföras.')
    }
  }

  async function runChiSquareGoodnessOfFit(
    columnId: string,
    alpha: number,
    probabilities: CategoryProbability[] | null,
  ) {
    const column = columns.find((item) => item.id === columnId)
    if (!column) {
      setToast('Välj en kategorikolumn för goodness-of-fit-testet.')
      return
    }
    const values = rows.map((row) => row[column.id] ?? null)
    try {
      const result = probabilities
        ? await statsWorker.chiSquareGoodnessOfFit(values, probabilities, alpha)
        : await statsWorker.chiSquareUniformGoodnessOfFit(values, alpha)
      setSession({
        title:
          result.probabilitySource === 'equal'
            ? 'Chi-två goodness-of-fit (lika andelar)'
            : 'Chi-två goodness-of-fit (angivna sannolikheter)',
        columnName: column.name,
        chiSquareGoodnessOfFit: result,
        createdAt: new Date(),
      })
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : 'Goodness-of-fit-testet kunde inte genomföras.',
      )
    }
  }

  async function runPoissonGoodnessOfFitAnalysis(
    columnId: string,
    alpha: number,
    specifiedRate: number | null,
  ) {
    const column = columns.find((item) => item.id === columnId)
    if (!column || column.type !== 'numeric') {
      setToast('Välj en numerisk räkningskolumn för Poisson goodness-of-fit.')
      return
    }
    const values = rows.map((row) => {
      const raw = row[column.id]?.trim()
      return raw ? Number(raw.replace(',', '.')) : null
    })
    try {
      const [result, summary] = await Promise.all([
        statsWorker.poissonGoodnessOfFit(values, alpha, 5, specifiedRate),
        statsWorker.describe(values),
      ])
      setSession({
        title:
          specifiedRate === null
            ? 'Poisson goodness-of-fit (λ skattad)'
            : 'Poisson goodness-of-fit (λ specificerad)',
        columnName: column.name,
        summary,
        poissonGoodnessOfFit: result,
        createdAt: new Date(),
      })
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Poisson goodness-of-fit kunde inte köras.')
    }
  }

  async function runFisherExact(columnId1: string, columnId2: string) {
    const column1 = columns.find((item) => item.id === columnId1)
    const column2 = columns.find((item) => item.id === columnId2)
    if (!column1 || !column2) {
      setToast('Välj två kategorikolumner för Fishers test.')
      return
    }
    try {
      const result = await statsWorker.fisherExactTwoSided(
        rows.map((row) => row[column1.id] ?? null),
        rows.map((row) => row[column2.id] ?? null),
      )
      setSession({
        title: 'Fishers exakta test',
        columnName: `${column1.name} · ${column2.name}`,
        fisherExact: result,
        createdAt: new Date(),
      })
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Fishers test kunde inte genomföras.')
    }
  }

  async function runTwoSampleTAnalysis(
    columnId1: string,
    columnId2: string,
    hypothesizedDifference: number,
    alpha: number,
  ) {
    const column1 = columns.find((item) => item.id === columnId1)
    const column2 = columns.find((item) => item.id === columnId2)
    if (!column1 || !column2 || column1.type !== 'numeric' || column2.type !== 'numeric') {
      setToast('Välj två numeriska kolumner för 2-urvals t-testet.')
      return
    }
    const values1 = rows.map((row) => {
      const raw = row[column1.id]?.trim()
      return raw ? Number(raw.replace(',', '.')) : null
    })
    const values2 = rows.map((row) => {
      const raw = row[column2.id]?.trim()
      return raw ? Number(raw.replace(',', '.')) : null
    })
    try {
      const [result, summary] = await Promise.all([
        statsWorker.twoSampleT(values1, values2, hypothesizedDifference, alpha),
        statsWorker.describe(values1),
      ])
      setSession({
        title: '2-urvals t-test (Welch)',
        columnName: `${column1.name} − ${column2.name}`,
        summary,
        twoSampleT: result,
        createdAt: new Date(),
      })
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'T-testet kunde inte genomföras.')
    }
  }

  async function runPairedTAnalysis(
    columnId1: string,
    columnId2: string,
    hypothesizedDifference: number,
    alpha: number,
  ) {
    const column1 = columns.find((item) => item.id === columnId1)
    const column2 = columns.find((item) => item.id === columnId2)
    if (!column1 || !column2 || column1.type !== 'numeric' || column2.type !== 'numeric') {
      setToast('Välj två numeriska kolumner för det parade t-testet.')
      return
    }
    const values1 = rows.map((row) => {
      const raw = row[column1.id]?.trim()
      return raw ? Number(raw.replace(',', '.')) : null
    })
    const values2 = rows.map((row) => {
      const raw = row[column2.id]?.trim()
      return raw ? Number(raw.replace(',', '.')) : null
    })
    try {
      const [result, summary] = await Promise.all([
        statsWorker.pairedT(values1, values2, hypothesizedDifference, alpha),
        statsWorker.describe(values1),
      ])
      setSession({
        title: 'Parat t-test',
        columnName: `${column1.name} − ${column2.name}`,
        summary,
        pairedT: result,
        createdAt: new Date(),
      })
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : 'Det parade t-testet kunde inte genomföras.',
      )
    }
  }

  async function runOneProportionAnalysis(
    columnId: string,
    hypothesizedProportion: number,
    alpha: number,
  ) {
    const column = columns.find((item) => item.id === columnId)
    if (!column || column.type !== 'numeric') {
      setToast('Välj en numerisk 0/1-kolumn för proportionstestet.')
      return
    }
    const values = rows.map((row) => {
      const raw = row[column.id]?.trim()
      return raw ? Number(raw.replace(',', '.')) : null
    })
    try {
      const [result, summary] = await Promise.all([
        statsWorker.oneProportion(values, hypothesizedProportion, alpha),
        statsWorker.describe(values),
      ])
      setSession({
        title: '1-proportion Z-test',
        columnName: column.name,
        summary,
        oneProportion: result,
        createdAt: new Date(),
      })
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Proportionstestet kunde inte genomföras.')
    }
  }

  async function runTwoProportionsAnalysis(columnId1: string, columnId2: string, alpha: number) {
    const column1 = columns.find((item) => item.id === columnId1)
    const column2 = columns.find((item) => item.id === columnId2)
    if (!column1 || !column2 || column1.type !== 'numeric' || column2.type !== 'numeric') {
      setToast('Välj två numeriska 0/1-kolumner för proportionstestet.')
      return
    }
    const values1 = rows.map((row) => {
      const raw = row[column1.id]?.trim()
      return raw ? Number(raw.replace(',', '.')) : null
    })
    const values2 = rows.map((row) => {
      const raw = row[column2.id]?.trim()
      return raw ? Number(raw.replace(',', '.')) : null
    })
    try {
      const [result, summary] = await Promise.all([
        statsWorker.twoProportions(values1, values2, alpha),
        statsWorker.describe(values1),
      ])
      setSession({
        title: '2-proportion Z-test',
        columnName: `${column1.name} − ${column2.name}`,
        summary,
        twoProportions: result,
        createdAt: new Date(),
      })
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Proportionstestet kunde inte genomföras.')
    }
  }

  async function runCorrelationAnalysis(columnId1: string, columnId2: string, alpha: number) {
    const column1 = columns.find((item) => item.id === columnId1)
    const column2 = columns.find((item) => item.id === columnId2)
    if (!column1 || !column2 || column1.type !== 'numeric' || column2.type !== 'numeric') {
      setToast('Välj två numeriska kolumner för korrelationsanalys.')
      return
    }
    const values1 = rows.map((row) => {
      const raw = row[column1.id]?.trim()
      return raw ? Number(raw.replace(',', '.')) : null
    })
    const values2 = rows.map((row) => {
      const raw = row[column2.id]?.trim()
      return raw ? Number(raw.replace(',', '.')) : null
    })
    try {
      const [result, summary] = await Promise.all([
        statsWorker.correlation(values1, values2, alpha),
        statsWorker.describe(values1),
      ])
      setSession({
        title: 'Korrelation och kovarians',
        columnName: `${column1.name} · ${column2.name}`,
        summary,
        correlation: result,
        createdAt: new Date(),
      })
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : 'Korrelationsanalysen kunde inte genomföras.',
      )
    }
  }

  async function runOneSamplePoissonAnalysis(
    columnId: string,
    exposurePerObservation: number,
    hypothesizedRate: number,
    alpha: number,
  ) {
    const column = columns.find((item) => item.id === columnId)
    if (!column || column.type !== 'numeric') {
      setToast('Välj en numerisk kolumn med heltalsräkningar.')
      return
    }
    const counts = rows.map((row) => {
      const raw = row[column.id]?.trim()
      return raw ? Number(raw.replace(',', '.')) : null
    })
    try {
      const [result, summary] = await Promise.all([
        statsWorker.oneSamplePoissonRate(counts, exposurePerObservation, hypothesizedRate, alpha),
        statsWorker.describe(counts),
      ])
      setSession({
        title: '1-urvals Poisson-hastighet',
        columnName: column.name,
        summary,
        oneSamplePoissonRate: result,
        createdAt: new Date(),
      })
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Poisson-testet kunde inte genomföras.')
    }
  }

  async function runTwoSamplePoissonAnalysis(
    columnId1: string,
    exposurePerObservation1: number,
    columnId2: string,
    exposurePerObservation2: number,
    alpha: number,
  ) {
    const column1 = columns.find((item) => item.id === columnId1)
    const column2 = columns.find((item) => item.id === columnId2)
    if (!column1 || !column2 || column1.type !== 'numeric' || column2.type !== 'numeric') {
      setToast('Välj två numeriska kolumner med heltalsräkningar.')
      return
    }
    const counts1 = rows.map((row) => {
      const raw = row[column1.id]?.trim()
      return raw ? Number(raw.replace(',', '.')) : null
    })
    const counts2 = rows.map((row) => {
      const raw = row[column2.id]?.trim()
      return raw ? Number(raw.replace(',', '.')) : null
    })
    try {
      const [result, summary] = await Promise.all([
        statsWorker.twoSamplePoissonRate(
          counts1,
          exposurePerObservation1,
          counts2,
          exposurePerObservation2,
          alpha,
        ),
        statsWorker.describe(counts1),
      ])
      setSession({
        title: '2-urvals Poisson-hastighet',
        columnName: `${column1.name} − ${column2.name}`,
        summary,
        twoSamplePoissonRate: result,
        createdAt: new Date(),
      })
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Poisson-testet kunde inte genomföras.')
    }
  }

  async function runVarianceComparison(columnId1: string, columnId2: string, alpha: number) {
    const column1 = columns.find((item) => item.id === columnId1)
    const column2 = columns.find((item) => item.id === columnId2)
    if (!column1 || !column2 || column1.type !== 'numeric' || column2.type !== 'numeric') {
      setToast('Välj två numeriska kolumner för variansjämförelsen.')
      return
    }
    const values1 = rows.map((row) => {
      const raw = row[column1.id]?.trim()
      return raw ? Number(raw.replace(',', '.')) : null
    })
    const values2 = rows.map((row) => {
      const raw = row[column2.id]?.trim()
      return raw ? Number(raw.replace(',', '.')) : null
    })
    try {
      const [result, summary] = await Promise.all([
        statsWorker.compareVariances(values1, values2, alpha),
        statsWorker.describe(values1),
      ])
      setSession({
        title: 'Jämför två varianser',
        columnName: `${column1.name} · ${column2.name}`,
        summary,
        varianceComparison: result,
        createdAt: new Date(),
      })
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Variansjämförelsen kunde inte genomföras.')
    }
  }

  async function runOneWayAnova(measurementColumnId: string, groupColumnId: string, alpha: number) {
    const measurementColumn = columns.find((column) => column.id === measurementColumnId)
    const groupColumn = columns.find((column) => column.id === groupColumnId)
    if (!measurementColumn || measurementColumn.type !== 'numeric' || !groupColumn) {
      setToast(
        language === 'sv' ? 'Välj mät- och gruppkolumn.' : 'Select measurement and group columns.',
      )
      return
    }
    const values = rows.map((row) => {
      const raw = row[measurementColumn.id]?.trim()
      return raw ? Number(raw.replace(',', '.')) : null
    })
    const groupLabels = rows.map((row) => row[groupColumn.id] ?? null)
    try {
      const result = await statsWorker.oneWayAnova(values, groupLabels, alpha)
      setSession({
        title: language === 'sv' ? 'Envägs-ANOVA' : 'One-way ANOVA',
        columnName: `${measurementColumn.name} · ${groupColumn.name}`,
        oneWayAnova: result,
        createdAt: new Date(),
      })
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'ANOVA could not be completed.')
    }
  }

  async function runTwoWayAnova(
    responseColumnId: string,
    factor1ColumnId: string,
    factor2ColumnId: string,
    alpha: number,
  ) {
    const responseColumn = columns.find((column) => column.id === responseColumnId)
    const factor1Column = columns.find((column) => column.id === factor1ColumnId)
    const factor2Column = columns.find((column) => column.id === factor2ColumnId)
    if (
      !responseColumn ||
      responseColumn.type !== 'numeric' ||
      !factor1Column ||
      !factor2Column ||
      factor1Column.id === factor2Column.id
    ) {
      setToast(
        language === 'sv'
          ? 'Välj ett svar och två olika faktorkolumner.'
          : 'Select a response and two different factor columns.',
      )
      return
    }
    const values = rows.map((row) => {
      const raw = row[responseColumnId]?.trim()
      return raw ? Number(raw.replace(',', '.')) : null
    })
    const factor1Labels = rows.map((row) => row[factor1ColumnId] ?? null)
    const factor2Labels = rows.map((row) => row[factor2ColumnId] ?? null)
    try {
      const result = await statsWorker.twoWayAnova(
        values,
        factor1Labels,
        factor2Labels,
        {
          response: responseColumn.name,
          factor1: factor1Column.name,
          factor2: factor2Column.name,
        },
        alpha,
      )
      setSession({
        title: language === 'sv' ? 'Tvåvägs-ANOVA' : 'Two-way ANOVA',
        columnName: `${responseColumn.name} · ${factor1Column.name} · ${factor2Column.name}`,
        twoWayAnova: result,
        createdAt: new Date(),
      })
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Two-way ANOVA could not be completed.')
    }
  }

  async function runLinearRegression(
    responseColumnId: string,
    predictorColumnIds: string[],
    alpha: number,
    modelOptions: { quadraticPredictorIds: string[]; includeInteractions: boolean },
  ) {
    const responseColumn = columns.find((column) => column.id === responseColumnId)
    const predictorColumns = predictorColumnIds.map((id) =>
      columns.find((column) => column.id === id),
    )
    if (
      !responseColumn ||
      responseColumn.type !== 'numeric' ||
      predictorColumns.some((column) => !column || column.type === 'date') ||
      predictorColumnIds.includes(responseColumnId)
    ) {
      setToast(
        language === 'sv'
          ? 'Välj ett numeriskt svar och numeriska prediktorer.'
          : 'Select a numeric response and numeric predictors.',
      )
      return
    }
    const values = rows.map((row) => {
      const raw = row[responseColumnId]?.trim()
      return raw ? Number(raw.replace(',', '.')) : null
    })
    const predictors = predictorColumnIds.map((id, index) => ({
      name: predictorColumns[index]!.name,
      type:
        predictorColumns[index]!.type === 'numeric'
          ? ('numeric' as const)
          : ('categorical' as const),
      values: rows.map((row): number | string | null => {
        const raw = row[id]?.trim()
        if (!raw) return null
        return predictorColumns[index]!.type === 'numeric' ? Number(raw.replace(',', '.')) : raw
      }),
    }))
    try {
      const result = await statsWorker.multipleLinearRegression(values, predictors, {
        responseName: responseColumn.name,
        alpha,
        includeInteractions: modelOptions.includeInteractions,
        quadraticPredictors: modelOptions.quadraticPredictorIds.map(
          (id) => columns.find((column) => column.id === id)!.name,
        ),
      })
      setSession({
        title: language === 'sv' ? 'Multipel linjär regression' : 'Multiple linear regression',
        columnName: `${responseColumn.name} · ${predictorColumns.map((column) => column!.name).join(' · ')}`,
        linearRegression: result,
        createdAt: new Date(),
      })
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Linear regression could not be completed.')
    }
  }

  async function runSurvivalAnalysis(
    timeColumnId: string,
    statusColumnId: string,
    groupColumnId: string | undefined,
    alpha: number,
  ) {
    const timeColumn = columns.find((column) => column.id === timeColumnId)
    const statusColumn = columns.find((column) => column.id === statusColumnId)
    const groupColumn = groupColumnId
      ? columns.find((column) => column.id === groupColumnId)
      : undefined
    if (
      !timeColumn ||
      timeColumn.type !== 'numeric' ||
      !statusColumn ||
      statusColumn.type !== 'numeric' ||
      timeColumn.id === statusColumn.id ||
      (groupColumnId && (!groupColumn || groupColumn.type !== 'text'))
    ) {
      setToast(
        language === 'sv'
          ? 'Välj tid, status och en valfri textgrupp.'
          : 'Select time, status, and an optional text group.',
      )
      return
    }
    const times = rows.map((row) => {
      const raw = row[timeColumnId]?.trim()
      return raw ? Number(raw.replace(',', '.')) : null
    })
    const statuses = rows.map((row) => {
      const raw = row[statusColumnId]?.trim()
      return raw ? Number(raw.replace(',', '.')) : null
    })
    const groups = groupColumnId ? rows.map((row) => row[groupColumnId] ?? null) : undefined
    try {
      const [result, parametricResult] = await Promise.all([
        statsWorker.kaplanMeier(times, statuses, groups, alpha),
        statsWorker.parametricSurvival(times, statuses, groups),
      ])
      setSession({
        title: language === 'sv' ? 'Överlevnadsanalys' : 'Survival analysis',
        columnName: `${timeColumn.name} · ${statusColumn.name}${groupColumn ? ` · ${groupColumn.name}` : ''}`,
        survival: result,
        parametricSurvival: parametricResult,
        survivalGraph: survivalGraph(result, parametricResult, language),
        createdAt: new Date(),
      })
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Survival analysis could not be completed.')
    }
  }

  async function runTimeSeriesAnalysis(columnId: string, options: TimeSeriesOptions) {
    const column = columns.find((item) => item.id === columnId)
    if (!column || column.type !== 'numeric') {
      setToast(
        language === 'sv'
          ? 'Välj en numerisk tidsseriekolumn.'
          : 'Select a numeric time-series column.',
      )
      return
    }
    const values = rows.map((row) => {
      const raw = row[columnId]?.trim()
      return raw ? Number(raw.replace(',', '.')) : null
    })
    try {
      const result = await statsWorker.analyzeTimeSeries(values, options)
      setSession({
        title: language === 'sv' ? 'Tidsserieanalys' : 'Time-series analysis',
        columnName: column.name,
        timeSeries: result,
        timeSeriesGraph: timeSeriesGraph(result, language),
        createdAt: new Date(),
      })
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : 'Time-series analysis could not be completed.',
      )
    }
  }

  async function runPowerAnalysis(request: PowerRequest) {
    try {
      const result = await statsWorker.powerAndSampleSize(request)
      setSession({
        title: language === 'sv' ? 'Power och stickprovsstorlek' : 'Power and sample size',
        columnName: request.test,
        power: result,
        powerGraph: powerCurveGraph(result, language),
        createdAt: new Date(),
      })
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Power analysis could not be completed.')
    }
  }

  async function runTwoLevelFactorial(request: TwoLevelFactorialRequest) {
    try {
      if (request.kind === 'create') {
        const design = createTwoLevelFactorial(
          request.factors,
          request.replicates,
          request.centerPoints,
          request.randomize,
          request.seed,
        )
        createWorksheet('DOE')
        replaceData(design.columns, design.rows)
        setToast(
          language === 'sv'
            ? `DOE-arbetsblad skapat med ${design.totalRuns} körningar och ${request.factors.length} faktorer.`
            : `DOE worksheet created with ${design.totalRuns} runs and ${request.factors.length} factors.`,
        )
        return
      }
      const result = await statsWorker.analyzeTwoLevelFactorial(
        rows,
        columns,
        request.responseColumnId,
        request.factorColumnIds,
        request.alpha,
      )
      setSession({
        title: language === 'sv' ? '2-nivåers faktorförsök' : 'Two-level factorial DOE',
        columnName: result.responseName,
        twoLevelFactorial: result,
        createdAt: new Date(),
      })
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'DOE analysis could not be completed.')
    }
  }

  function showMenuAction(action: string) {
    setMenuOpen(null)
    if (action === 'newProject') {
      const confirmed = window.confirm(
        language === 'sv'
          ? 'Skapa ett nytt projekt? Osparade ändringar ersätts.'
          : 'Create a new project? Unsaved changes will be replaced.',
      )
      if (!confirmed) return
      replaceWorkbook({
        columns: [
          { id: 'C1', name: language === 'sv' ? 'Variabel 1' : 'Variable 1', type: 'numeric' },
        ],
        rows: [],
      })
      setSession(null)
      setFilterQuery('')
      setTargetColumn('C1')
      setProjectName(language === 'sv' ? 'Nytt projekt' : 'New project')
      setToast(language === 'sv' ? 'Nytt projekt skapat.' : 'New project created.')
    } else if (action === 'addRow') insertRow(activeCell.row)
    else if (action === 'addColumn') addColumn()
    else if (action === 'undo') undo()
    else if (action === 'redo') redo()
    else if (action === 'sortAscending' && activeColumn) {
      sortByColumn(activeColumn.id, 'ascending')
      setSortDirection('descending')
    } else if (action === 'sortDescending' && activeColumn) {
      sortByColumn(activeColumn.id, 'descending')
      setSortDirection('ascending')
    } else if (action === 'deleteActiveRow') deleteRow(activeCell.row)
    else if (action === 'deleteActiveColumn' && activeColumn) {
      if (columns.length <= 1) setToast('Minst en kolumn måste finnas kvar.')
      else {
        deleteColumn(activeColumn.id)
        const remainingNumeric = columns.find(
          (column) => column.id !== activeColumn.id && column.type === 'numeric',
        )
        setTargetColumn(
          remainingNumeric?.id ?? columns.find((column) => column.id !== activeColumn.id)!.id,
        )
      }
    } else if (action === 'replaceMissing' && activeColumn) {
      const replacement = window.prompt(`Ersätt saknade värden i ${activeColumn.name} med:`, '0')
      if (replacement !== null) replaceMissing(activeColumn.id, replacement)
    } else if (action === 'dataOperations') setDataOperationsDialogOpen(true)
    else if (action === 'exportCsv') exportCsv()
    else if (action === 'importData') fileInputRef.current?.click()
    else if (action === 'openProject') projectInputRef.current?.click()
    else if (action === 'saveProject') saveProject()
    else if (action === 'descriptiveStatistics') void runAnalysis()
    else if (action === 'copySession') void copySession()
    else if (action === 'settings') setAppDialog('settings')
    else if (action === 'aboutStatLab') setAppDialog('about')
    else if (action === 'analysisStatus') setAppDialog('analysis')
    else if (action === 'worksheetWindow') {
      document.getElementById('arbetsblad')?.scrollIntoView({ behavior: 'smooth' })
      document.querySelector<HTMLElement>('#arbetsblad [data-row]')?.focus()
    } else if (action === 'sessionWindow') {
      const panel = document.getElementById('session')
      panel?.scrollIntoView({ behavior: 'smooth' })
      panel?.focus()
    } else if (action === 'standardizeColumn') void standardizeSelectedColumn()
    else if (action === 'columnCalculator') setColumnFormulaDialogOpen(true)
    else if (action === 'oneSampleT') setOneSampleTDialogOpen(true)
    else if (action === 'oneSampleZ') setOneSampleZDialogOpen(true)
    else if (action === 'twoSampleZ') setTwoSampleZDialogOpen(true)
    else if (action === 'normalKS') setNormalKSDialogOpen(true)
    else if (action === 'normalAD') setNormalADDialogOpen(true)
    else if (action === 'poissonGOF') setPoissonGoodnessOfFitDialogOpen(true)
    else if (action === 'chiSquare') setChiSquareDialogOpen(true)
    else if (action === 'chiSquareUniform') setChiSquareGoodnessOfFitDialogOpen(true)
    else if (action === 'fisherExact') setFisherExactDialogOpen(true)
    else if (action === 'processCapability') setProcessCapabilityDialogOpen(true)
    else if (action === 'imrControlChart') setImrControlChartDialogOpen(true)
    else if (action === 'chartBuilder') setGraphDialogOpen(true)
    else if (action === 'qualityStudio') setQualityStudioOpen(true)
    else if (action === 'gageRr') setGageRrDialogOpen(true)
    else if (action === 'subgroupControlChart') setSubgroupControlChartDialogOpen(true)
    else if (action === 'twoSampleT') setTwoSampleTDialogOpen(true)
    else if (action === 'pairedT') setPairedTDialogOpen(true)
    else if (action === 'oneProportion') setOneProportionDialogOpen(true)
    else if (action === 'twoProportions') setTwoProportionsDialogOpen(true)
    else if (action === 'correlation') setCorrelationDialogOpen(true)
    else if (action === 'oneSamplePoissonRate') setOneSamplePoissonDialogOpen(true)
    else if (action === 'twoSamplePoissonRate') setTwoSamplePoissonDialogOpen(true)
    else if (action === 'compareVariances') setVarianceDialogOpen(true)
    else if (action === 'oneWayAnova') setOneWayAnovaDialogOpen(true)
    else if (action === 'twoWayAnova') setTwoWayAnovaDialogOpen(true)
    else if (action === 'twoLevelFactorial') setTwoLevelFactorialDialogOpen(true)
    else if (action === 'linearRegression') setLinearRegressionDialogOpen(true)
    else if (action === 'survivalAnalysis') setSurvivalDialogOpen(true)
    else if (action === 'timeSeriesAnalysis') setTimeSeriesDialogOpen(true)
    else if (action === 'powerSampleSize') setPowerDialogOpen(true)
    else if (action === 'flowchartEditor') setFlowchartEditorOpen(true)
    else if (action === 'nonparametricTests') setNonparametricDialogOpen(true)
    else if (action === 'resamplingTests') setResamplingDialogOpen(true)
    else setToast(`${action}: inte tillgängligt.`)
  }

  function changeLanguage(nextLanguage: 'sv' | 'en') {
    setLanguage(nextLanguage)
  }

  function exportCsv() {
    const csv = Papa.unparse({
      fields: columns.map((column) => column.name),
      data: rows.map((row) => columns.map((column) => row[column.id] ?? '')),
    })
    downloadFile(csv, 'statlab-data.csv', 'text/csv;charset=utf-8')
  }

  function exportLinearRegressionDiagnostics() {
    const result = session?.linearRegression
    if (!result) return
    const csv = Papa.unparse({
      fields: [
        'Worksheet row',
        'Observed',
        'Fitted',
        'Residual',
        'Leverage',
        'Standardized residual',
        "Cook's distance",
        'Mean CI lower',
        'Mean CI upper',
        'Prediction interval lower',
        'Prediction interval upper',
      ],
      data: result.observations.map((observation) => [
        observation.sourceRow,
        observation.observed,
        observation.fitted,
        observation.residual,
        observation.leverage,
        observation.standardizedResidual,
        observation.cooksDistance,
        observation.fittedConfidenceInterval[0],
        observation.fittedConfidenceInterval[1],
        observation.predictionInterval[0],
        observation.predictionInterval[1],
      ]),
    })
    downloadFile(csv, 'regression-diagnostics.csv', 'text/csv;charset=utf-8')
  }

  function exportSurvivalEstimates() {
    const result = session?.survival
    if (!result) return
    const csv = Papa.unparse({
      fields: [
        'Group',
        'Time',
        'At risk',
        'Events',
        'Censored',
        'Survival probability',
        'Lower confidence limit',
        'Upper confidence limit',
      ],
      data: result.curves.flatMap((curve) =>
        curve.points.map((point) => [
          curve.group,
          point.time,
          point.atRisk,
          point.events,
          point.censored,
          point.survival,
          point.lowerConfidenceLimit,
          point.upperConfidenceLimit,
        ]),
      ),
    })
    downloadFile(csv, 'kaplan-meier-estimates.csv', 'text/csv;charset=utf-8')
  }

  function saveProject() {
    const data = { ...workbookDocument(useWorkbookStore.getState()), name: projectName }
    const fileName = projectName.trim().replace(/[\\/:*?"<>|]+/g, '-') || 'statlab'
    downloadFile(JSON.stringify(data, null, 2), `${fileName}.statlab`, 'application/json')
  }

  function applyDataOperation(result: DataOperationResult) {
    if (result.kind === 'worksheets' || result.kind === 'worksheet') {
      const outputWorksheets = result.kind === 'worksheets' ? result.worksheets : [result]
      for (const worksheet of outputWorksheets) {
        createWorksheet(worksheet.name)
        const worksheetId = useWorkbookStore.getState().activeSheetId
        renameWorksheetInStore(worksheetId, worksheet.name)
        replaceData(worksheet.columns, worksheet.rows)
      }
      const state = useWorkbookStore.getState()
      setTargetColumn(state.columns.find((column) => column.type === 'numeric')?.id ?? '')
      setSelectionAnchor({ row: 0, column: 0 })
    } else {
      const columnId = appendColumn(result.name, result.type, result.values)
      setTargetColumn(columnId)
    }
    setFilterQuery('')
    if (scrollRef.current) scrollRef.current.scrollTop = 0
    setToast(result.summary)
  }

  function openWorksheet(id: string) {
    const worksheet = worksheets.find((item) => item.id === id)
    if (!worksheet) return
    setRenamingWorksheetId(null)
    setPendingDeleteWorksheetId(null)
    activateWorksheet(id)
    setTargetColumn(worksheet.columns.find((column) => column.type === 'numeric')?.id ?? '')
    setFilterQuery('')
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }

  function addWorksheet() {
    setRenamingWorksheetId(null)
    setPendingDeleteWorksheetId(null)
    createWorksheet(language === 'sv' ? 'Arbetsblad' : 'Worksheet')
    setTargetColumn('C1')
    setFilterQuery('')
    if (scrollRef.current) scrollRef.current.scrollTop = 0
    setToast(language === 'sv' ? 'Nytt arbetsblad skapat.' : 'New worksheet created.')
  }

  function renameActiveWorksheet() {
    const worksheet = worksheets.find((item) => item.id === activeSheetId)
    if (!worksheet) return
    setPendingDeleteWorksheetId(null)
    setRenamingWorksheetId(activeSheetId)
    setWorksheetNameDraft(worksheet.name)
  }

  function deleteActiveWorksheet() {
    if (worksheets.length <= 1) {
      setToast(
        language === 'sv'
          ? 'Minst ett arbetsblad måste finnas kvar.'
          : 'At least one worksheet must remain.',
      )
      return
    }
    setRenamingWorksheetId(null)
    setPendingDeleteWorksheetId(activeSheetId)
  }

  function confirmWorksheetDeletion() {
    if (!pendingDeleteWorksheetId || !deleteWorksheetFromStore(pendingDeleteWorksheetId)) return
    const state = useWorkbookStore.getState()
    const nextWorksheet = state.worksheets.find((item) => item.id === state.activeSheetId)
    setPendingDeleteWorksheetId(null)
    setTargetColumn(nextWorksheet?.columns.find((column) => column.type === 'numeric')?.id ?? '')
    setFilterQuery('')
    if (scrollRef.current) scrollRef.current.scrollTop = 0
    setToast(language === 'sv' ? 'Arbetsbladet har tagits bort.' : 'Worksheet deleted.')
  }

  function downloadFile(content: string, name: string, type: string) {
    const url = URL.createObjectURL(new Blob([content], { type }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = name
    anchor.click()
    URL.revokeObjectURL(url)
    setToast(`${name} exporterad.`)
  }

  async function handleDataFile(file?: File) {
    if (!file) return
    try {
      let data: unknown[][]
      if (/\.xlsx?$/i.test(file.name)) {
        const XLSX = await import('xlsx')
        const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
        data = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[workbook.SheetNames[0]], {
          header: 1,
          raw: false,
        })
      } else {
        const text = await file.text()
        const parsed = Papa.parse<unknown[]>(text, { skipEmptyLines: true })
        if (parsed.errors.length) throw new Error(parsed.errors[0].message)
        data = parsed.data
      }
      const parsed = parseTable(data)
      if (!parsed) throw new Error('Filen behöver innehålla en rubrikrad och minst en datarad.')
      replaceData(parsed.columns, parsed.rows)
      setTargetColumn(
        parsed.columns.find((column) => column.type === 'numeric')?.id ?? parsed.columns[0].id,
      )
      setToast(`${file.name}: ${parsed.rows.length} rader importerade.`)
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Filen kunde inte läsas.')
    }
  }

  async function openProject(file?: File) {
    if (!file) return
    try {
      const value: unknown = JSON.parse(await file.text())
      if (isWorkbookDocument(value)) replaceWorkbook(value)
      else if (isWorkbookSnapshot(value)) replaceWorkbook(value)
      else throw new Error('Projektfilen har fel format.')
      setProjectName(file.name.replace(/\.(statlab|json)$/i, ''))
      setToast(`${file.name} öppnat.`)
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Projektet kunde inte öppnas.')
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    const text = event.clipboardData.getData('text/plain')
    if (!text.includes('\t') && !text.includes('\n')) return
    event.preventDefault()
    const values = text
      .replace(/\r/g, '')
      .replace(/\n$/, '')
      .split('\n')
      .map((line) => line.split('\t'))
    pasteCells(activeCell.row, activeCell.column, values)
    setToast(
      `${values.length} rad${values.length === 1 ? '' : 'er'} inklistrad${values.length === 1 ? '' : 'e'}.`,
    )
  }

  function activateCell(row: number, column: number, extend: boolean) {
    if (!extend) setSelectionAnchor({ row, column })
    setActiveCell(row, column)
  }

  function extendActiveSelection(rowDelta: number, columnDelta: number) {
    if (visibleRowIndexes.length === 0 || columns.length === 0) return
    const visibleIndex = visibleRowIndexes.indexOf(activeCell.row)
    const nextVisibleIndex = Math.max(
      0,
      Math.min(visibleRowIndexes.length - 1, visibleIndex + rowDelta),
    )
    const nextColumn = Math.max(0, Math.min(columns.length - 1, activeCell.column + columnDelta))
    setActiveCell(visibleRowIndexes[nextVisibleIndex], nextColumn)
  }

  function handleCopy(event: ClipboardEvent<HTMLDivElement>) {
    const rowCount = selectedBounds.lastRow - selectedBounds.firstRow + 1
    const columnCount = selectedBounds.lastColumn - selectedBounds.firstColumn + 1
    const target = event.target
    if (
      rowCount * columnCount <= 1 &&
      target instanceof HTMLInputElement &&
      target.selectionStart !== target.selectionEnd
    ) {
      return
    }
    event.clipboardData.setData(
      'text/plain',
      selectionToTsv(rows, columns, selectionAnchor, activeCell),
    )
    event.preventDefault()
  }

  async function copySession() {
    if (!session) return
    const { summary } = session
    const additionalResults = Object.fromEntries(
      Object.entries(session).filter(
        ([key, value]) =>
          !['title', 'columnName', 'summary', 'createdAt'].includes(key) && value !== undefined,
      ),
    )
    const testResult = session.oneSampleT
      ? `\nt(${session.oneSampleT.degreesOfFreedom}): ${formatValue(session.oneSampleT.statistic)}\ndf: ${session.oneSampleT.degreesOfFreedom}\np-värde: ${formatPValue(session.oneSampleT.pValue, language)}\nKI: [${formatValue(session.oneSampleT.confidenceInterval[0])}, ${formatValue(session.oneSampleT.confidenceInterval[1])}]`
      : session.oneSampleZ
        ? `\nz: ${formatValue(session.oneSampleZ.statistic)}\nσ: ${formatValue(session.oneSampleZ.knownStandardDeviation)}\np-värde: ${formatPValue(session.oneSampleZ.pValue, language)}\nKI: [${formatValue(session.oneSampleZ.confidenceInterval[0])}, ${formatValue(session.oneSampleZ.confidenceInterval[1])}]`
        : session.twoSampleZ
          ? `\nz: ${formatValue(session.twoSampleZ.statistic)}\nMedelskillnad: ${formatValue(session.twoSampleZ.difference)}\nσ₁ / σ₂: ${formatValue(session.twoSampleZ.knownStandardDeviation1)} / ${formatValue(session.twoSampleZ.knownStandardDeviation2)}\np-värde: ${formatPValue(session.twoSampleZ.pValue, language)}\nKI: [${formatValue(session.twoSampleZ.confidenceInterval[0])}, ${formatValue(session.twoSampleZ.confidenceInterval[1])}]`
          : session.twoSampleT
            ? `\nt(${formatValue(session.twoSampleT.degreesOfFreedom)}): ${formatValue(session.twoSampleT.statistic)}\nMedelskillnad: ${formatValue(session.twoSampleT.difference)}\np-värde: ${formatPValue(session.twoSampleT.pValue, language)}\nKI: [${formatValue(session.twoSampleT.confidenceInterval[0])}, ${formatValue(session.twoSampleT.confidenceInterval[1])}]`
            : session.pairedT
              ? `\nt(${session.pairedT.degreesOfFreedom}): ${formatValue(session.pairedT.statistic)}\nAntal par: ${session.pairedT.pairCount}\nMedelskillnad: ${formatValue(session.pairedT.meanDifference)}\np-värde: ${formatPValue(session.pairedT.pValue, language)}\nKI: [${formatValue(session.pairedT.confidenceInterval[0])}, ${formatValue(session.pairedT.confidenceInterval[1])}]`
              : session.oneProportion
                ? `\nz: ${formatValue(session.oneProportion.statistic)}\nAndel: ${formatValue(session.oneProportion.observedProportion)}\np-värde: ${formatPValue(session.oneProportion.pValue, language)}\nKI: [${formatValue(session.oneProportion.confidenceInterval[0])}, ${formatValue(session.oneProportion.confidenceInterval[1])}]`
                : session.twoProportions
                  ? `\nz: ${formatValue(session.twoProportions.statistic)}\nAndelsskillnad: ${formatValue(session.twoProportions.difference)}\np-värde: ${formatPValue(session.twoProportions.pValue, language)}\nKI: [${formatValue(session.twoProportions.confidenceInterval[0])}, ${formatValue(session.twoProportions.confidenceInterval[1])}]`
                  : session.correlation
                    ? `\nr: ${formatValue(session.correlation.correlation)}\nKovarians: ${formatValue(session.correlation.covariance)}\nt: ${formatValue(session.correlation.statistic)}\np-värde: ${formatPValue(session.correlation.pValue, language)}\nKI: [${formatValue(session.correlation.confidenceInterval[0])}, ${formatValue(session.correlation.confidenceInterval[1])}]`
                    : session.oneSamplePoissonRate
                      ? `\nHändelser: ${session.oneSamplePoissonRate.eventCount}\nExponering: ${formatValue(session.oneSamplePoissonRate.totalExposure)}\nHastighet: ${formatValue(session.oneSamplePoissonRate.observedRate)}\nz: ${formatValue(session.oneSamplePoissonRate.statistic)}\np-värde: ${formatPValue(session.oneSamplePoissonRate.pValue, language)}\nGarwood-KI: [${formatValue(session.oneSamplePoissonRate.confidenceInterval[0])}, ${formatValue(session.oneSamplePoissonRate.confidenceInterval[1])}]`
                      : session.twoSamplePoissonRate
                        ? `\nHastighetsskillnad: ${formatValue(session.twoSamplePoissonRate.difference)}\nz: ${formatValue(session.twoSamplePoissonRate.statistic)}\np-värde: ${formatPValue(session.twoSamplePoissonRate.pValue, language)}\nKI: [${formatValue(session.twoSamplePoissonRate.confidenceInterval[0])}, ${formatValue(session.twoSamplePoissonRate.confidenceInterval[1])}]`
                        : session.varianceComparison
                          ? `\nF: ${formatValue(session.varianceComparison.fStatistic)}\nF p-värde: ${formatPValue(session.varianceComparison.fPValue, language)}\nBartlett p-värde: ${formatPValue(session.varianceComparison.bartlettPValue, language)}\nLevene p-värde: ${formatPValue(session.varianceComparison.levenePValue, language)}`
                          : session.chiSquare
                            ? `\nχ²: ${formatValue(session.chiSquare.statistic)}\ndf: ${session.chiSquare.degreesOfFreedom}\np-värde: ${formatPValue(session.chiSquare.pValue, language)}\nCramér V: ${formatValue(session.chiSquare.cramersV)}`
                            : session.chiSquareGoodnessOfFit
                              ? `\nχ²: ${formatValue(session.chiSquareGoodnessOfFit.statistic)}\ndf: ${session.chiSquareGoodnessOfFit.degreesOfFreedom}\np-värde: ${formatPValue(session.chiSquareGoodnessOfFit.pValue, language)}\nKategorier: ${session.chiSquareGoodnessOfFit.categories.join(', ')}`
                              : session.poissonGoodnessOfFit
                                ? `\nλ (${session.poissonGoodnessOfFit.rateSource}): ${formatValue(session.poissonGoodnessOfFit.rate)}\nχ²: ${formatValue(session.poissonGoodnessOfFit.statistic)}\ndf: ${session.poissonGoodnessOfFit.degreesOfFreedom}\np-värde: ${formatPValue(session.poissonGoodnessOfFit.pValue, language)}`
                                : session.fisherExact
                                  ? `\nFishers tvåsidiga p-värde: ${formatPValue(session.fisherExact.pValue, language)}\nOddskvot: ${session.fisherExact.oddsRatio === null ? 'odefinierad' : formatValue(session.fisherExact.oddsRatio)}`
                                  : session.processCapability
                                    ? `\nCp/Cpk: ${formatValue(session.processCapability.cp)} / ${formatValue(session.processCapability.cpk)}\nPp/Ppk: ${formatValue(session.processCapability.pp)} / ${formatValue(session.processCapability.ppk)}\nZ-bench inom: ${formatValue(session.processCapability.zBenchWithin)}\nObserverade PPM: ${formatValue(session.processCapability.observedPpm)}\nFörväntade PPM (normal): ${formatValue(session.processCapability.expectedOverallPpm)}`
                                    : session.imrControlChart
                                      ? `\nI-centrum: ${formatValue(session.imrControlChart.individuals.centerLine)}\nI-LCL/UCL: ${formatValue(session.imrControlChart.individuals.lowerControlLimit)} / ${formatValue(session.imrControlChart.individuals.upperControlLimit)}\nMR̄: ${formatValue(session.imrControlChart.averageMovingRange)}\nMR-UCL: ${formatValue(session.imrControlChart.movingRange.upperControlLimit)}\nRegelsignaler: ${session.imrControlChart.signals.length}`
                                      : session.graph
                                        ? `\nDiagram: ${session.graph.title}\nn: ${session.graph.sampleCount}`
                                        : session.gageRr
                                          ? `\nGage R&R: ${formatValue(session.gageRr.percentStudyVariation.gageRr)} % study variation\n% contribution: ${formatValue(session.gageRr.percentContribution.gageRr)}\nndc: ${session.gageRr.numberOfDistinctCategories}`
                                          : session.subgroupControlChart
                                            ? `\nSubgrupper: ${session.subgroupControlChart.subgroupCount}\nn/subgrupp: ${session.subgroupControlChart.subgroupSize}\nXbar-centrum: ${formatValue(session.subgroupControlChart.xbar.centerLine)}\n${session.subgroupControlChart.variabilityChart.toUpperCase()}-centrum: ${formatValue(session.subgroupControlChart.variability.centerLine)}\nRegelsignaler: ${session.subgroupControlChart.signals.length}`
                                            : session.normalAD
                                              ? `\nA²: ${formatValue(session.normalAD.statistic)}\nJusterad A²: ${formatValue(session.normalAD.adjustedStatistic)}\np-värde: ${formatPValue(session.normalAD.pValue, language)}\nα: ${formatValue(session.normalAD.alpha)}`
                                              : session.normalKS
                                                ? `\nD+: ${formatValue(session.normalKS.dPlus)}\nD−: ${formatValue(session.normalKS.dMinus)}\nD: ${formatValue(session.normalKS.statistic)}\np-värde: ${formatPValue(session.normalKS.pValue, language)}\nμ: ${formatValue(session.normalKS.hypothesizedMean)}\nσ: ${formatValue(session.normalKS.hypothesizedStandardDeviation)}`
                                                : Object.keys(additionalResults).length > 0
                                                  ? `\n${JSON.stringify(additionalResults, null, 2)}`
                                                  : ''
    const summaryText = summary
      ? `\nAntal: ${summary.count}\nMedelvärde: ${formatValue(summary.mean)}\nMedian: ${formatValue(summary.median)}\nStandardavvikelse: ${formatValue(summary.standardDeviation)}\nVarians: ${formatValue(summary.variance)}\nStandardfel: ${formatValue(summary.standardError)}\nQ1 (R-7): ${formatValue(summary.firstQuartile)}\nQ3 (R-7): ${formatValue(summary.thirdQuartile)}\nVariationsbredd: ${formatValue(summary.range)}\nMin: ${formatValue(summary.minimum)}\nMax: ${formatValue(summary.maximum)}`
      : ''
    const text = `${session.title}: ${session.columnName}${summaryText}${testResult}\nEj verifierad analys.`
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const field = document.createElement('textarea')
      field.value = text
      field.style.position = 'fixed'
      field.style.opacity = '0'
      document.body.append(field)
      field.select()
      const copied = document.execCommand('copy')
      field.remove()
      if (!copied) {
        setToast(
          language === 'sv' ? 'Sessionen kunde inte kopieras.' : 'The session could not be copied.',
        )
        return
      }
    }
    setToast(language === 'sv' ? 'Sessionsresultatet kopierat.' : 'Session result copied.')
  }

  async function runCommand(action: string) {
    setCommandPaletteOpen(false)
    setCommandQuery('')
    showMenuAction(action)
  }

  function toggleMenu(button: HTMLButtonElement, key: string) {
    if (menuOpen === key) {
      setMenuOpen(null)
      return
    }
    const bounds = button.getBoundingClientRect()
    const menuWidth = 224
    const left =
      bounds.left + menuWidth <= window.innerWidth - 8
        ? bounds.left
        : Math.max(8, bounds.right - menuWidth)
    setMenuPosition({ top: bounds.bottom, left })
    setMenuOpen(key)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#arbetsblad" aria-label="StatLab startsida">
          <span className="brand-mark">s</span>
          <span className="brand-name">
            stat<span>lab</span>
          </span>
        </a>
        <div className="project-name">
          <strong>{projectName}</strong>
          <span> / </span>
          {activeWorksheet ? worksheetName(activeWorksheet) : ''}
        </div>
        <div className="topbar-spacer" />
        <div className="topbar-note">
          <span className="live-dot" />
          Autospar aktivt
        </div>
        <button
          className="icon-button"
          type="button"
          title={t('theme')}
          aria-label={t('theme')}
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
        <button
          className="icon-button"
          type="button"
          title={t('language')}
          aria-label={t('language')}
          onClick={() => {
            const nextLanguage = language === 'sv' ? 'en' : 'sv'
            changeLanguage(nextLanguage)
          }}
        >
          <Languages size={16} />
        </button>
        <button
          className="command-search-button"
          type="button"
          title={language === 'sv' ? 'Sök kommando · Ctrl/Cmd+K' : 'Search commands · Ctrl/Cmd+K'}
          aria-label={language === 'sv' ? 'Sök kommando' : 'Search commands'}
          onClick={() => {
            setCommandQuery('')
            setCommandIndex(0)
            setCommandPaletteOpen(true)
          }}
        >
          <Search size={15} />
          <span>{language === 'sv' ? 'Sök kommando' : 'Search'}</span>
          <kbd>Ctrl K</kbd>
        </button>
      </header>

      <nav className="menubar" aria-label="Huvudmeny">
        {menuKeys.map((key) => (
          <button
            key={key}
            className="menu-button"
            type="button"
            aria-expanded={menuOpen === key}
            onClick={(event) => toggleMenu(event.currentTarget, key)}
          >
            {t(key)}
          </button>
        ))}
        {menuOpen && (
          <div
            className="menu-popover"
            role="menu"
            style={{ top: menuPosition.top, left: menuPosition.left }}
          >
            {menuContent[menuOpen].map((action) => (
              <button
                key={action}
                type="button"
                role="menuitem"
                disabled={action === 'copySession' && !session}
                onClick={() => showMenuAction(action)}
              >
                {actionLabelKeys[action] ? t(actionLabelKeys[action]) : action}
              </button>
            ))}
          </div>
        )}
      </nav>

      <section className="toolbar" aria-label="Verktygsfält">
        <button
          className="toolbar-button"
          type="button"
          title={t('undo')}
          disabled={useWorkbookStore((state) => state.past.length === 0) && !hasDraft}
          onClick={undo}
        >
          <Undo2 size={15} />
          {t('undo')}
        </button>
        <button
          className="toolbar-button"
          type="button"
          title={t('redo')}
          disabled={useWorkbookStore((state) => state.future.length === 0)}
          onClick={redo}
        >
          <Redo2 size={15} />
          {t('redo')}
        </button>
        <span className="toolbar-divider" />
        <button
          className="toolbar-button"
          type="button"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={15} />
          {t('import')}
        </button>
        <button className="toolbar-button" type="button" onClick={exportCsv}>
          <Download size={15} />
          {t('export')}
        </button>
        <label className="toolbar-search">
          <Search size={14} aria-hidden="true" />
          <input
            type="search"
            value={filterQuery}
            onChange={(event) => setFilterQuery(event.target.value)}
            placeholder={t('searchRows')}
            aria-label={t('searchRows')}
          />
        </label>
        <button className="toolbar-button" type="button" onClick={() => insertRow(activeCell.row)}>
          <Rows3 size={15} />
          {t('addRow')}
        </button>
        <button className="toolbar-button" type="button" onClick={addColumn}>
          <Columns3 size={15} />
          {t('addColumn')}
        </button>
        <div className="toolbar-spacer" />
        <label className="language-button" htmlFor="analysis-column">
          <Sigma size={13} />
          {language === 'sv' ? 'Kolumn' : 'Column'}
          <select
            id="analysis-column"
            value={targetColumn}
            onChange={(event) => setTargetColumn(event.target.value)}
            aria-label={language === 'sv' ? 'Analyskolumn' : 'Analysis column'}
          >
            {numericColumns.map((column) => (
              <option key={column.id} value={column.id}>
                {column.id} · {column.name}
              </option>
            ))}
          </select>
        </label>
        <button className="toolbar-button primary" type="button" onClick={() => void runAnalysis()}>
          <BarChart3 size={15} />
          {t('run')}
        </button>
      </section>

      <div className="workspace">
        <aside className="navigator" aria-label="Projektnavigator">
          <div className="nav-heading">
            PROJEKT <MoreHorizontal size={15} />
          </div>
          <div className="nav-section">{language === 'sv' ? 'Arbetsbok' : 'Workbook'}</div>
          {worksheets.map((worksheet) => (
            <button
              className={`nav-item${worksheet.id === activeSheetId ? ' active' : ''}`}
              type="button"
              key={worksheet.id}
              onClick={() => openWorksheet(worksheet.id)}
            >
              <Grid2X2 size={14} />
              {worksheetName(worksheet)}
              <span className="nav-count">
                {worksheet.id === activeSheetId ? rows.length : worksheet.rows.length}
              </span>
            </button>
          ))}
          <div className="nav-section">Session</div>
          <button
            className="nav-item"
            type="button"
            onClick={() =>
              document.getElementById('session')?.scrollIntoView({ behavior: 'smooth' })
            }
          >
            <Clock3 size={14} />
            Analysresultat<span className="nav-count">{session ? '1' : '0'}</span>
          </button>
          {session && (
            <button
              className="nav-item indented"
              type="button"
              onClick={() =>
                document.getElementById('session')?.scrollIntoView({ behavior: 'smooth' })
              }
            >
              <Sigma size={13} />
              {session.title}
            </button>
          )}
          <div className="nav-section">{language === 'sv' ? 'Utdata' : 'Output'}</div>
          <button
            className="nav-item"
            type="button"
            onClick={() => {
              if (graphCount === 0) setGraphDialogOpen(true)
              else {
                const panel = document.getElementById('session')
                panel?.scrollIntoView({ behavior: 'smooth' })
                panel?.focus()
              }
            }}
          >
            <Activity size={14} />
            {language === 'sv' ? 'Grafer' : 'Graphs'}
            <span className="nav-count">{graphCount}</span>
          </button>
          <div className="nav-bottom">
            {language === 'sv' ? 'Lokal arbetsbok' : 'Local workbook'}
            <br />
            {language === 'sv' ? 'Senast sparad' : 'Last saved'}{' '}
            {savedAt
              ? savedAt.toLocaleTimeString(i18n.language === 'sv' ? 'sv-SE' : 'en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : language === 'sv'
                ? 'nyss'
                : 'just now'}
            <div className="verification-chip">
              <CircleHelp size={11} />
              {t('unverified')}
            </div>
          </div>
        </aside>

        <main className="main-column" id="arbetsblad" tabIndex={-1}>
          <div className="sheet-heading">
            <div>
              <div className="eyebrow">
                {language === 'sv' ? 'DATA · ARBETSBOK' : 'DATA · WORKBOOK'}
              </div>
              <h1>{activeWorksheet ? worksheetName(activeWorksheet) : t('sheet')}</h1>
              <p>
                {language === 'sv'
                  ? `${rows.length} rader · ${columns.length} kolumner`
                  : `${rows.length} rows · ${columns.length} columns`}
              </p>
            </div>
            <div className="heading-actions">
              <button
                className="icon-button"
                type="button"
                title={language === 'sv' ? 'Sortera aktiv kolumn' : 'Sort active column'}
                aria-label={language === 'sv' ? 'Sortera aktiv kolumn' : 'Sort active column'}
                onClick={() => {
                  if (activeColumn) sortByColumn(activeColumn.id, sortDirection)
                  setSortDirection(sortDirection === 'ascending' ? 'descending' : 'ascending')
                }}
              >
                <ArrowDownAZ size={15} />
              </button>
              <button
                className="icon-button"
                type="button"
                title={language === 'sv' ? 'Spara projekt' : 'Save project'}
                aria-label={language === 'sv' ? 'Spara projekt' : 'Save project'}
                onClick={saveProject}
              >
                <Save size={15} />
              </button>
            </div>
          </div>
          <div
            className="sheet-tabs"
            role="group"
            aria-label={language === 'sv' ? 'Arbetsblad' : 'Worksheets'}
          >
            {worksheets.map((worksheet) =>
              renamingWorksheetId === worksheet.id ? (
                <form
                  className="sheet-tab-editing"
                  key={worksheet.id}
                  onSubmit={(event) => {
                    event.preventDefault()
                    const renamed = renameWorksheetInStore(worksheet.id, worksheetNameDraft)
                    if (!renamed) {
                      setToast(
                        language === 'sv'
                          ? 'Namnet måste vara unikt och får inte vara tomt.'
                          : 'Name must be unique and cannot be blank.',
                      )
                      return
                    }
                    setRenamingWorksheetId(null)
                    setToast(
                      language === 'sv' ? 'Arbetsbladet har bytt namn.' : 'Worksheet renamed.',
                    )
                  }}
                >
                  <input
                    autoFocus
                    maxLength={64}
                    value={worksheetNameDraft}
                    onChange={(event) => setWorksheetNameDraft(event.target.value)}
                    aria-label={language === 'sv' ? 'Nytt arbetsbladsnamn' : 'New worksheet name'}
                  />
                  <button
                    className="icon-button"
                    type="submit"
                    title={language === 'sv' ? 'Spara namn' : 'Save name'}
                    aria-label={language === 'sv' ? 'Spara namn' : 'Save name'}
                  >
                    <Check size={14} />
                  </button>
                  <button
                    className="icon-button"
                    type="button"
                    title={language === 'sv' ? 'Avbryt namnbyte' : 'Cancel rename'}
                    aria-label={language === 'sv' ? 'Avbryt namnbyte' : 'Cancel rename'}
                    onClick={() => setRenamingWorksheetId(null)}
                  >
                    <X size={14} />
                  </button>
                </form>
              ) : (
                <button
                  className={`sheet-tab${worksheet.id === activeSheetId ? ' active' : ''}`}
                  type="button"
                  key={worksheet.id}
                  aria-pressed={worksheet.id === activeSheetId}
                  onClick={() => openWorksheet(worksheet.id)}
                >
                  <Grid2X2 size={13} />
                  {worksheetName(worksheet)}
                </button>
              ),
            )}
            <button
              className="sheet-tab add-tab"
              type="button"
              title={language === 'sv' ? 'Nytt arbetsblad' : 'New worksheet'}
              aria-label={language === 'sv' ? 'Nytt arbetsblad' : 'New worksheet'}
              onClick={addWorksheet}
            >
              <Plus size={14} />
            </button>
            <div
              className="worksheet-actions"
              role="group"
              aria-label={language === 'sv' ? 'Arbetsbladsåtgärder' : 'Worksheet actions'}
            >
              <button
                className="icon-button"
                type="button"
                title={language === 'sv' ? 'Byt namn på arbetsbladet' : 'Rename worksheet'}
                aria-label={language === 'sv' ? 'Byt namn på arbetsbladet' : 'Rename worksheet'}
                onClick={renameActiveWorksheet}
              >
                <Pencil size={14} />
              </button>
              <button
                className="icon-button"
                type="button"
                disabled={worksheets.length <= 1}
                title={
                  worksheets.length <= 1
                    ? language === 'sv'
                      ? 'Minst ett arbetsblad måste finnas kvar'
                      : 'At least one worksheet must remain'
                    : language === 'sv'
                      ? 'Ta bort arbetsbladet'
                      : 'Delete worksheet'
                }
                aria-label={language === 'sv' ? 'Ta bort arbetsbladet' : 'Delete worksheet'}
                onClick={deleteActiveWorksheet}
              >
                <Trash2 size={14} />
              </button>
            </div>
            {pendingDeleteWorksheetId === activeSheetId && (
              <div
                className="worksheet-delete-confirm"
                role="group"
                aria-label={language === 'sv' ? 'Bekräfta borttagning' : 'Confirm deletion'}
              >
                <span>
                  {language === 'sv'
                    ? `Ta bort "${activeWorksheet ? worksheetName(activeWorksheet) : ''}"?`
                    : `Delete "${activeWorksheet ? worksheetName(activeWorksheet) : ''}"?`}
                </span>
                <button
                  className="icon-button"
                  type="button"
                  autoFocus
                  title={language === 'sv' ? 'Bekräfta borttagning' : 'Confirm deletion'}
                  aria-label={language === 'sv' ? 'Bekräfta borttagning' : 'Confirm deletion'}
                  onClick={confirmWorksheetDeletion}
                >
                  <Check size={14} />
                </button>
                <button
                  className="icon-button"
                  type="button"
                  title={language === 'sv' ? 'Avbryt' : 'Cancel'}
                  aria-label={language === 'sv' ? 'Avbryt' : 'Cancel'}
                  onClick={() => setPendingDeleteWorksheetId(null)}
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
          <div className="sheet-scroll" ref={scrollRef} onCopy={handleCopy} onPaste={handlePaste}>
            <table
              className="data-table"
              aria-label={language === 'sv' ? 'Redigerbart datablad' : 'Editable worksheet'}
            >
              <thead>
                <tr>
                  <th className="corner">#</th>
                  {columns.map((column) => (
                    <th key={column.id} style={{ width: column.type === 'text' ? 138 : 112 }}>
                      <button
                        className="column-label"
                        type="button"
                        onClick={() => {
                          const index = columns.findIndex((item) => item.id === column.id)
                          setActiveCell(activeCell.row, index)
                          if (column.type === 'numeric') setTargetColumn(column.id)
                          else {
                            const nextName = window.prompt(
                              language === 'sv' ? 'Kolumnnamn' : 'Column name',
                              column.name,
                            )
                            if (nextName?.trim()) renameColumn(column.id, nextName.trim())
                          }
                        }}
                      >
                        <span className="column-id">{column.id}</span>
                        {column.name}
                        <ChevronDown size={10} />
                      </button>
                      <span className="column-type">
                        {column.type === 'numeric'
                          ? 'numerisk'
                          : column.type === 'date'
                            ? 'datum/tid'
                            : 'text'}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRowIndexes.length === 0 && (
                  <tr>
                    <td className="empty-filter" colSpan={columns.length + 1}>
                      {t('noMatchingRows')}
                    </td>
                  </tr>
                )}
                {topPadding > 0 && (
                  <tr aria-hidden="true">
                    <td colSpan={columns.length + 1} style={{ height: topPadding }} />
                  </tr>
                )}
                {virtualRows.map((virtualRow) => {
                  const rowIndex = visibleRowIndexes[virtualRow.index]
                  const row = rows[rowIndex]
                  return (
                    <tr key={rowIndex}>
                      <td className="row-number">{rowIndex + 1}</td>
                      {columns.map((column, columnIndex) => (
                        <td
                          className={`cell${
                            rowIndex >= selectedBounds.firstRow &&
                            rowIndex <= selectedBounds.lastRow &&
                            columnIndex >= selectedBounds.firstColumn &&
                            columnIndex <= selectedBounds.lastColumn
                              ? ' selected'
                              : ''
                          }`}
                          key={column.id}
                        >
                          <GridCell
                            key={`${rowIndex}-${column.id}-${row[column.id] ?? ''}`}
                            rowIndex={rowIndex}
                            column={column}
                            value={row[column.id] ?? ''}
                            isActive={
                              activeCell.row === rowIndex && activeCell.column === columnIndex
                            }
                            isSelected={
                              rowIndex >= selectedBounds.firstRow &&
                              rowIndex <= selectedBounds.lastRow &&
                              columnIndex >= selectedBounds.firstColumn &&
                              columnIndex <= selectedBounds.lastColumn
                            }
                            isDragging={isDraggingSelection}
                            onActivate={(extend) => activateCell(rowIndex, columnIndex, extend)}
                            onExtendSelection={extendActiveSelection}
                            onDragStart={() => setIsDraggingSelection(true)}
                            onDragEnter={() => activateCell(rowIndex, columnIndex, true)}
                            onDraftChange={setHasDraft}
                            onCommit={(value) => setCell(rowIndex, column.id, value)}
                          />
                        </td>
                      ))}
                    </tr>
                  )
                })}
                {bottomPadding > 0 && (
                  <tr aria-hidden="true">
                    <td colSpan={columns.length + 1} style={{ height: bottomPadding }} />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="sheet-footer">
            <span>
              {visibleRowIndexes.length === rows.length
                ? rows.length
                : `${visibleRowIndexes.length} / ${rows.length}`}{' '}
              {t('rows')}
            </span>
            <span>
              {columns.length} {t('columns')}
            </span>
            <span>
              {validNumericCount} {language === 'sv' ? 'numeriska värden' : 'numeric values'}
            </span>
            <span className="footer-spacer" />
            <span>
              <kbd>Ctrl</kbd> + Z {t('undo').toLowerCase()}
            </span>
          </div>
        </main>

        <aside className="session-panel" id="session" aria-label={t('session')} tabIndex={-1}>
          <div className="session-title">
            <h2>{t('session')}</h2>
            <span>{session ? '1 resultat' : 'redo'}</span>
          </div>
          {session ? (
            <article className="session-entry">
              <div className="session-time">
                {session.createdAt.toLocaleTimeString(language === 'sv' ? 'sv-SE' : 'en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </div>
              <h3>
                {session.title} · {session.columnName}
              </h3>
              <div className="unverified-label">
                <CircleHelp size={12} />
                {t('unverified')}
              </div>
              {session.summary && (
                <div className="stat-grid">
                  <div className="stat-cell">
                    <span>Antal</span>
                    <strong>{session.summary.count}</strong>
                  </div>
                  <div className="stat-cell">
                    <span>Medelvärde</span>
                    <strong>{formatValue(session.summary.mean)}</strong>
                  </div>
                  <div className="stat-cell">
                    <span>Median</span>
                    <strong>{formatValue(session.summary.median)}</strong>
                  </div>
                  <div className="stat-cell">
                    <span>Std.avvikelse</span>
                    <strong>{formatValue(session.summary.standardDeviation)}</strong>
                  </div>
                  <div className="stat-cell">
                    <span>Varians</span>
                    <strong>{formatValue(session.summary.variance)}</strong>
                  </div>
                  <div className="stat-cell">
                    <span>Standardfel</span>
                    <strong>{formatValue(session.summary.standardError)}</strong>
                  </div>
                  <div className="stat-cell">
                    <span>Q1 · R-7</span>
                    <strong>{formatValue(session.summary.firstQuartile)}</strong>
                  </div>
                  <div className="stat-cell">
                    <span>Q3 · R-7</span>
                    <strong>{formatValue(session.summary.thirdQuartile)}</strong>
                  </div>
                  <div className="stat-cell">
                    <span>Variationsbredd</span>
                    <strong>{formatValue(session.summary.range)}</strong>
                  </div>
                  <div className="stat-cell">
                    <span>Minimum</span>
                    <strong>{formatValue(session.summary.minimum)}</strong>
                  </div>
                  <div className="stat-cell">
                    <span>Maximum</span>
                    <strong>{formatValue(session.summary.maximum)}</strong>
                  </div>
                </div>
              )}
              {session.oneSampleT && (
                <section
                  className="t-test-result"
                  aria-label={language === 'sv' ? 'Resultat från t-test' : 'T-test result'}
                >
                  <h4>
                    {language === 'sv' ? 'Tvåsidigt test av medelvärde' : 'Two-sided mean test'}
                  </h4>
                  <div className="stat-grid t-test-grid">
                    <div className="stat-cell">
                      <span>t</span>
                      <strong>{formatValue(session.oneSampleT.statistic)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>Frihetsgrader</span>
                      <strong>{session.oneSampleT.degreesOfFreedom}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>p-värde</span>
                      <strong>{formatPValue(session.oneSampleT.pValue, language)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>H₀ medelvärde</span>
                      <strong>{formatValue(session.oneSampleT.hypothesizedMean)}</strong>
                    </div>
                  </div>
                  <p className="session-caption">
                    {100 * (1 - session.oneSampleT.alpha)} % KI: [
                    {formatValue(session.oneSampleT.confidenceInterval[0])},{' '}
                    {formatValue(session.oneSampleT.confidenceInterval[1])}]
                  </p>
                  <p className="session-conclusion">
                    {language === 'sv'
                      ? `Vid α = ${formatValue(session.oneSampleT.alpha)} ${session.oneSampleT.pValue < session.oneSampleT.alpha ? 'förkastas H₀; resultatet är statistiskt signifikant.' : 'kan H₀ inte förkastas; resultatet är inte statistiskt signifikant.'}`
                      : `At α = ${formatValue(session.oneSampleT.alpha)} ${session.oneSampleT.pValue < session.oneSampleT.alpha ? 'reject H₀; the result is statistically significant.' : 'do not reject H₀; the result is not statistically significant.'}`}
                  </p>
                  <p className="session-caption">
                    {language === 'sv'
                      ? 'Antaganden: oberoende observationer och ungefär normal population vid små urval; antagandena har inte testats.'
                      : 'Assumptions: independent observations and an approximately normal population for small samples; assumptions were not tested.'}
                  </p>
                </section>
              )}
              {session.oneSampleZ && (
                <section
                  className="t-test-result"
                  aria-label={
                    language === 'sv' ? '1-urvals Z-testresultat' : 'One-sample Z-test result'
                  }
                >
                  <h4>
                    {language === 'sv'
                      ? 'Tvåsidigt 1-urvals Z-test'
                      : 'Two-sided one-sample Z-test'}
                  </h4>
                  <div className="stat-grid t-test-grid">
                    <div className="stat-cell">
                      <span>z</span>
                      <strong>{formatValue(session.oneSampleZ.statistic)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>n</span>
                      <strong>{session.oneSampleZ.count}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>p-värde</span>
                      <strong>{formatPValue(session.oneSampleZ.pValue, language)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>Känd σ</span>
                      <strong>{formatValue(session.oneSampleZ.knownStandardDeviation)}</strong>
                    </div>
                  </div>
                  <p className="session-caption">
                    {100 * (1 - session.oneSampleZ.alpha)} % KI: [
                    {formatValue(session.oneSampleZ.confidenceInterval[0])},{' '}
                    {formatValue(session.oneSampleZ.confidenceInterval[1])}]
                  </p>
                  <p className="session-conclusion">
                    {language === 'sv'
                      ? `Vid α = ${formatValue(session.oneSampleZ.alpha)} ${session.oneSampleZ.pValue < session.oneSampleZ.alpha ? 'förkastas H₀; resultatet är statistiskt signifikant.' : 'kan H₀ inte förkastas; resultatet är inte statistiskt signifikant.'}`
                      : `At α = ${formatValue(session.oneSampleZ.alpha)} ${session.oneSampleZ.pValue < session.oneSampleZ.alpha ? 'reject H₀; the result is statistically significant.' : 'do not reject H₀; the result is not statistically significant.'}`}
                  </p>
                  <p className="session-caption">
                    {language === 'sv'
                      ? 'Populationsstandardavvikelsen anges som känd. Oberoende och normalitet har inte testats.'
                      : 'The population standard deviation is supplied as known. Independence and normality were not tested.'}
                  </p>
                </section>
              )}
              {session.twoSampleZ && (
                <section
                  className="t-test-result"
                  aria-label={
                    language === 'sv' ? '2-urvals Z-testresultat' : 'Two-sample Z-test result'
                  }
                >
                  <h4>
                    {language === 'sv'
                      ? 'Tvåsidigt 2-urvals Z-test'
                      : 'Two-sided two-sample Z-test'}
                  </h4>
                  <div className="stat-grid t-test-grid">
                    <div className="stat-cell">
                      <span>n₁ / n₂</span>
                      <strong>
                        {session.twoSampleZ.count1} / {session.twoSampleZ.count2}
                      </strong>
                    </div>
                    <div className="stat-cell">
                      <span>Medelskillnad</span>
                      <strong>{formatValue(session.twoSampleZ.difference)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>z</span>
                      <strong>{formatValue(session.twoSampleZ.statistic)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>p-värde</span>
                      <strong>{formatPValue(session.twoSampleZ.pValue, language)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>Känd σ₁ / σ₂</span>
                      <strong>
                        {formatValue(session.twoSampleZ.knownStandardDeviation1)} /{' '}
                        {formatValue(session.twoSampleZ.knownStandardDeviation2)}
                      </strong>
                    </div>
                    <div className="stat-cell">
                      <span>H₀ skillnad</span>
                      <strong>{formatValue(session.twoSampleZ.hypothesizedDifference)}</strong>
                    </div>
                  </div>
                  <p className="session-caption">
                    {100 * (1 - session.twoSampleZ.alpha)} % KI för μ₁ − μ₂: [
                    {formatValue(session.twoSampleZ.confidenceInterval[0])},{' '}
                    {formatValue(session.twoSampleZ.confidenceInterval[1])}]
                  </p>
                  <p className="session-conclusion">
                    {language === 'sv'
                      ? `Vid α = ${formatValue(session.twoSampleZ.alpha)} ${session.twoSampleZ.pValue < session.twoSampleZ.alpha ? 'förkastas H₀; medelskillnaden är statistiskt signifikant.' : 'kan H₀ inte förkastas; medelskillnaden är inte statistiskt signifikant.'}`
                      : `At α = ${formatValue(session.twoSampleZ.alpha)} ${session.twoSampleZ.pValue < session.twoSampleZ.alpha ? 'reject H₀; the mean difference is statistically significant.' : 'do not reject H₀; the mean difference is not statistically significant.'}`}
                  </p>
                  <p className="session-caption">
                    {language === 'sv'
                      ? 'Kända populationsstandardavvikelser används. Oberoende och normalitet har inte testats.'
                      : 'Known population standard deviations are used. Independence and normality were not tested.'}
                  </p>
                </section>
              )}
              {session.twoSampleT && (
                <section
                  className="t-test-result"
                  aria-label={language === 'sv' ? 'Welch t-testresultat' : 'Welch t-test result'}
                >
                  <h4>{language === 'sv' ? 'Welch tvåsidigt test' : 'Welch two-sided test'}</h4>
                  <div className="stat-grid t-test-grid">
                    <div className="stat-cell">
                      <span>n₁ / n₂</span>
                      <strong>
                        {session.twoSampleT.count1} / {session.twoSampleT.count2}
                      </strong>
                    </div>
                    <div className="stat-cell">
                      <span>Medelskillnad</span>
                      <strong>{formatValue(session.twoSampleT.difference)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>t</span>
                      <strong>{formatValue(session.twoSampleT.statistic)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>Frihetsgrader</span>
                      <strong>{formatValue(session.twoSampleT.degreesOfFreedom)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>p-värde</span>
                      <strong>{formatPValue(session.twoSampleT.pValue, language)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>H₀ skillnad</span>
                      <strong>{formatValue(session.twoSampleT.hypothesizedDifference)}</strong>
                    </div>
                  </div>
                  <p className="session-caption">
                    {100 * (1 - session.twoSampleT.alpha)} % KI för μ₁ − μ₂: [
                    {formatValue(session.twoSampleT.confidenceInterval[0])},{' '}
                    {formatValue(session.twoSampleT.confidenceInterval[1])}]
                  </p>
                  <p className="session-conclusion">
                    {language === 'sv'
                      ? `Vid α = ${formatValue(session.twoSampleT.alpha)} ${session.twoSampleT.pValue < session.twoSampleT.alpha ? 'förkastas H₀; skillnaden är statistiskt signifikant.' : 'kan H₀ inte förkastas; skillnaden är inte statistiskt signifikant.'}`
                      : `At α = ${formatValue(session.twoSampleT.alpha)} ${session.twoSampleT.pValue < session.twoSampleT.alpha ? 'reject H₀; the difference is statistically significant.' : 'do not reject H₀; the difference is not statistically significant.'}`}
                  </p>
                  <p className="session-caption">
                    {language === 'sv'
                      ? 'Welch-metoden kräver inte lika varianser. Oberoende och normalitetsantaganden har inte testats.'
                      : 'Welch does not assume equal variances. Independence and normality assumptions were not tested.'}
                  </p>
                </section>
              )}
              {session.pairedT && (
                <section
                  className="t-test-result"
                  aria-label={language === 'sv' ? 'Parat t-testresultat' : 'Paired t-test result'}
                >
                  <h4>{language === 'sv' ? 'Parat tvåsidigt test' : 'Paired two-sided test'}</h4>
                  <div className="stat-grid t-test-grid">
                    <div className="stat-cell">
                      <span>Antal par</span>
                      <strong>{session.pairedT.pairCount}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>Medelskillnad</span>
                      <strong>{formatValue(session.pairedT.meanDifference)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>t</span>
                      <strong>{formatValue(session.pairedT.statistic)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>Frihetsgrader</span>
                      <strong>{session.pairedT.degreesOfFreedom}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>p-värde</span>
                      <strong>{formatPValue(session.pairedT.pValue, language)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>H₀ skillnad</span>
                      <strong>{formatValue(session.pairedT.hypothesizedDifference)}</strong>
                    </div>
                  </div>
                  <p className="session-caption">
                    {100 * (1 - session.pairedT.alpha)} % KI för parade skillnader: [
                    {formatValue(session.pairedT.confidenceInterval[0])},{' '}
                    {formatValue(session.pairedT.confidenceInterval[1])}]
                  </p>
                  <p className="session-conclusion">
                    {language === 'sv'
                      ? `Vid α = ${formatValue(session.pairedT.alpha)} ${session.pairedT.pValue < session.pairedT.alpha ? 'förkastas H₀; medelskillnaden är statistiskt signifikant.' : 'kan H₀ inte förkastas; medelskillnaden är inte statistiskt signifikant.'}`
                      : `At α = ${formatValue(session.pairedT.alpha)} ${session.pairedT.pValue < session.pairedT.alpha ? 'reject H₀; the mean difference is statistically significant.' : 'do not reject H₀; the mean difference is not statistically significant.'}`}
                  </p>
                  <p className="session-caption">
                    {language === 'sv'
                      ? 'Antaganden: oberoende par och ungefär normalfördelade differenser vid små urval; antagandena har inte testats.'
                      : 'Assumptions: independent pairs and approximately normal differences for small samples; assumptions were not tested.'}
                  </p>
                </section>
              )}
              {session.oneProportion && (
                <section
                  className="t-test-result"
                  aria-label={
                    language === 'sv' ? '1-proportionstestresultat' : 'One-proportion test result'
                  }
                >
                  <h4>
                    {language === 'sv'
                      ? 'Tvåsidigt 1-proportion Z-test'
                      : 'Two-sided one-proportion Z-test'}
                  </h4>
                  <div className="stat-grid t-test-grid">
                    <div className="stat-cell">
                      <span>n</span>
                      <strong>{session.oneProportion.count}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>Framgångar</span>
                      <strong>{session.oneProportion.successes}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>Observerad andel</span>
                      <strong>{formatValue(session.oneProportion.observedProportion)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>z</span>
                      <strong>{formatValue(session.oneProportion.statistic)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>p-värde</span>
                      <strong>{formatPValue(session.oneProportion.pValue, language)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>H₀ proportion</span>
                      <strong>{formatValue(session.oneProportion.hypothesizedProportion)}</strong>
                    </div>
                  </div>
                  <p className="session-caption">
                    {100 * (1 - session.oneProportion.alpha)} % Wilson-KI: [
                    {formatValue(session.oneProportion.confidenceInterval[0])},{' '}
                    {formatValue(session.oneProportion.confidenceInterval[1])}]
                  </p>
                  <p className="session-conclusion">
                    {language === 'sv'
                      ? `Vid α = ${formatValue(session.oneProportion.alpha)} ${session.oneProportion.pValue < session.oneProportion.alpha ? 'förkastas H₀; andelen skiljer sig statistiskt signifikant från p₀.' : 'kan H₀ inte förkastas; ingen statistiskt signifikant skillnad från p₀ visas.'}`
                      : `At α = ${formatValue(session.oneProportion.alpha)} ${session.oneProportion.pValue < session.oneProportion.alpha ? 'reject H₀; the proportion differs significantly from p₀.' : 'do not reject H₀; no significant difference from p₀ is shown.'}`}
                  </p>
                  <p className="session-caption">
                    {language === 'sv'
                      ? `Normalapproximation; förväntat under H₀: ${formatValue(session.oneProportion.expectedSuccesses)} framgångar och ${formatValue(session.oneProportion.expectedFailures)} misslyckanden. Små förväntade antal kan försämra approximationen.`
                      : `Normal approximation; expected under H₀: ${formatValue(session.oneProportion.expectedSuccesses)} successes and ${formatValue(session.oneProportion.expectedFailures)} failures. Small expected counts can reduce accuracy.`}
                  </p>
                </section>
              )}
              {session.twoProportions && (
                <section
                  className="t-test-result"
                  aria-label={
                    language === 'sv' ? '2-proportionstestresultat' : 'Two-proportion test result'
                  }
                >
                  <h4>
                    {language === 'sv'
                      ? 'Tvåsidigt 2-proportion Z-test'
                      : 'Two-sided two-proportion Z-test'}
                  </h4>
                  <div className="stat-grid t-test-grid">
                    <div className="stat-cell">
                      <span>n₁ / n₂</span>
                      <strong>
                        {session.twoProportions.count1} / {session.twoProportions.count2}
                      </strong>
                    </div>
                    <div className="stat-cell">
                      <span>Andel p₁</span>
                      <strong>{formatValue(session.twoProportions.proportion1)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>Andel p₂</span>
                      <strong>{formatValue(session.twoProportions.proportion2)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>Andelsskillnad</span>
                      <strong>{formatValue(session.twoProportions.difference)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>z</span>
                      <strong>{formatValue(session.twoProportions.statistic)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>p-värde</span>
                      <strong>{formatPValue(session.twoProportions.pValue, language)}</strong>
                    </div>
                  </div>
                  <p className="session-caption">
                    {100 * (1 - session.twoProportions.alpha)} % Newcombe-Wilson-KI för p₁ − p₂: [
                    {formatValue(session.twoProportions.confidenceInterval[0])},{' '}
                    {formatValue(session.twoProportions.confidenceInterval[1])}]
                  </p>
                  <p className="session-conclusion">
                    {language === 'sv'
                      ? `Vid α = ${formatValue(session.twoProportions.alpha)} ${session.twoProportions.pValue < session.twoProportions.alpha ? 'förkastas H₀; andelarna skiljer sig statistiskt signifikant.' : 'kan H₀ inte förkastas; ingen statistiskt signifikant skillnad visas.'}`
                      : `At α = ${formatValue(session.twoProportions.alpha)} ${session.twoProportions.pValue < session.twoProportions.alpha ? 'reject H₀; the proportions differ significantly.' : 'do not reject H₀; no significant difference is shown.'}`}
                  </p>
                  <p className="session-caption">
                    {language === 'sv'
                      ? `Oberoende grupper antas. Poolat under H₀: förväntat antal framgångar/misslyckanden ${formatValue(session.twoProportions.expectedSuccesses1)}/${formatValue(session.twoProportions.expectedFailures1)} och ${formatValue(session.twoProportions.expectedSuccesses2)}/${formatValue(session.twoProportions.expectedFailures2)}. Små förväntade antal kan försämra normalapproximationen.`
                      : `Independent groups are assumed. Pooled under H₀: expected successes/failures ${formatValue(session.twoProportions.expectedSuccesses1)}/${formatValue(session.twoProportions.expectedFailures1)} and ${formatValue(session.twoProportions.expectedSuccesses2)}/${formatValue(session.twoProportions.expectedFailures2)}. Small expected counts can reduce normal-approximation accuracy.`}
                  </p>
                </section>
              )}
              {session.correlation && (
                <section
                  className="t-test-result"
                  aria-label={language === 'sv' ? 'Korrelationsresultat' : 'Correlation results'}
                >
                  <h4>{language === 'sv' ? 'Pearsons korrelation' : 'Pearson correlation'}</h4>
                  <div className="stat-grid t-test-grid">
                    <div className="stat-cell">
                      <span>Kompletta par</span>
                      <strong>{session.correlation.count}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>Pearsons r</span>
                      <strong>{formatValue(session.correlation.correlation)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>Kovarians</span>
                      <strong>{formatValue(session.correlation.covariance)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>t</span>
                      <strong>{formatValue(session.correlation.statistic)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>Frihetsgrader</span>
                      <strong>{session.correlation.degreesOfFreedom}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>p-värde</span>
                      <strong>{formatPValue(session.correlation.pValue, language)}</strong>
                    </div>
                  </div>
                  <p className="session-caption">
                    {100 * (1 - session.correlation.alpha)} % Fisher-z-KI för r: [
                    {formatValue(session.correlation.confidenceInterval[0])},{' '}
                    {formatValue(session.correlation.confidenceInterval[1])}]
                  </p>
                  <p className="session-conclusion">
                    {language === 'sv'
                      ? `Vid α = ${formatValue(session.correlation.alpha)} ${session.correlation.pValue < session.correlation.alpha ? 'förkastas H₀: ρ = 0; korrelationen är statistiskt signifikant.' : 'kan H₀: ρ = 0 inte förkastas.'}`
                      : `At α = ${formatValue(session.correlation.alpha)} ${session.correlation.pValue < session.correlation.alpha ? 'reject H₀: ρ = 0; the correlation is statistically significant.' : 'do not reject H₀: ρ = 0.'}`}
                  </p>
                  <p className="session-caption">
                    {language === 'sv'
                      ? 'Pearson mäter linjärt samband. Oberoende par, linearitet och avsaknad av starka avvikare har inte testats.'
                      : 'Pearson measures linear association. Independent pairs, linearity, and absence of strong outliers were not tested.'}
                  </p>
                </section>
              )}
              {session.oneSamplePoissonRate && (
                <section
                  className="t-test-result"
                  aria-label={
                    language === 'sv' ? 'Poisson-hastighetsresultat' : 'Poisson rate result'
                  }
                >
                  <h4>
                    {language === 'sv'
                      ? 'Tvåsidigt Poisson-hastighetstest'
                      : 'Two-sided Poisson rate test'}
                  </h4>
                  <div className="stat-grid t-test-grid">
                    <div className="stat-cell">
                      <span>Observationer</span>
                      <strong>{session.oneSamplePoissonRate.observationCount}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>Händelser</span>
                      <strong>{session.oneSamplePoissonRate.eventCount}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>Total exponering</span>
                      <strong>{formatValue(session.oneSamplePoissonRate.totalExposure)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>Observerad hastighet</span>
                      <strong>{formatValue(session.oneSamplePoissonRate.observedRate)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>z</span>
                      <strong>{formatValue(session.oneSamplePoissonRate.statistic)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>p-värde</span>
                      <strong>{formatPValue(session.oneSamplePoissonRate.pValue, language)}</strong>
                    </div>
                  </div>
                  <p className="session-caption">
                    {100 * (1 - session.oneSamplePoissonRate.alpha)} % Garwood-KI: [
                    {formatValue(session.oneSamplePoissonRate.confidenceInterval[0])},{' '}
                    {formatValue(session.oneSamplePoissonRate.confidenceInterval[1])}]
                  </p>
                  <p className="session-conclusion">
                    {language === 'sv'
                      ? `Vid α = ${formatValue(session.oneSamplePoissonRate.alpha)} ${session.oneSamplePoissonRate.pValue < session.oneSamplePoissonRate.alpha ? 'förkastas H₀; hastigheten skiljer sig statistiskt signifikant från λ₀.' : 'kan H₀ inte förkastas; ingen statistiskt signifikant skillnad från λ₀ visas.'}`
                      : `At α = ${formatValue(session.oneSamplePoissonRate.alpha)} ${session.oneSamplePoissonRate.pValue < session.oneSamplePoissonRate.alpha ? 'reject H₀; the rate differs significantly from λ₀.' : 'do not reject H₀; no significant difference from λ₀ is shown.'}`}
                  </p>
                  <p className="session-caption">
                    {language === 'sv'
                      ? `Poisson-scoretest med normalapproximation. Förväntade händelser under H₀: ${formatValue(session.oneSamplePoissonRate.expectedEvents)}. Oberoende och konstant hastighet har inte testats.`
                      : `Poisson score test with normal approximation. Expected events under H₀: ${formatValue(session.oneSamplePoissonRate.expectedEvents)}. Independence and constant-rate assumptions were not tested.`}
                  </p>
                </section>
              )}
              {session.twoSamplePoissonRate && (
                <section
                  className="t-test-result"
                  aria-label={language === 'sv' ? 'Två Poisson-hastigheter' : 'Two Poisson rates'}
                >
                  <h4>
                    {language === 'sv'
                      ? 'Tvåsidigt 2-urvals Poisson-test'
                      : 'Two-sample Poisson rate test'}
                  </h4>
                  <div className="stat-grid t-test-grid">
                    <div className="stat-cell">
                      <span>Händelser 1 / 2</span>
                      <strong>
                        {session.twoSamplePoissonRate.eventCount1} /{' '}
                        {session.twoSamplePoissonRate.eventCount2}
                      </strong>
                    </div>
                    <div className="stat-cell">
                      <span>Exponering 1 / 2</span>
                      <strong>
                        {formatValue(session.twoSamplePoissonRate.totalExposure1)} /{' '}
                        {formatValue(session.twoSamplePoissonRate.totalExposure2)}
                      </strong>
                    </div>
                    <div className="stat-cell">
                      <span>Hastighet 1 / 2</span>
                      <strong>
                        {formatValue(session.twoSamplePoissonRate.rate1)} /{' '}
                        {formatValue(session.twoSamplePoissonRate.rate2)}
                      </strong>
                    </div>
                    <div className="stat-cell">
                      <span>Skillnad</span>
                      <strong>{formatValue(session.twoSamplePoissonRate.difference)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>z</span>
                      <strong>{formatValue(session.twoSamplePoissonRate.statistic)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>p-värde</span>
                      <strong>{formatPValue(session.twoSamplePoissonRate.pValue, language)}</strong>
                    </div>
                  </div>
                  <p className="session-caption">
                    {100 * (1 - session.twoSamplePoissonRate.alpha)} % KI för hastighetsskillnad: [
                    {formatValue(session.twoSamplePoissonRate.confidenceInterval[0])},{' '}
                    {formatValue(session.twoSamplePoissonRate.confidenceInterval[1])}]
                  </p>
                  <p className="session-conclusion">
                    {language === 'sv'
                      ? `Vid α = ${formatValue(session.twoSamplePoissonRate.alpha)} ${session.twoSamplePoissonRate.pValue < session.twoSamplePoissonRate.alpha ? 'förkastas H₀; hastigheterna skiljer sig statistiskt signifikant.' : 'kan H₀ inte förkastas; ingen statistiskt signifikant skillnad visas.'}`
                      : `At α = ${formatValue(session.twoSamplePoissonRate.alpha)} ${session.twoSamplePoissonRate.pValue < session.twoSamplePoissonRate.alpha ? 'reject H₀; the rates differ significantly.' : 'do not reject H₀; no significant difference is shown.'}`}
                  </p>
                  <p className="session-caption">
                    {language === 'sv'
                      ? `Oberoende grupper antas. Poolat under H₀: förväntat ${formatValue(session.twoSamplePoissonRate.expectedEvents1)} respektive ${formatValue(session.twoSamplePoissonRate.expectedEvents2)} händelser. Normalapproximationens precision beror på antal händelser.`
                      : `Independent groups are assumed. Pooled under H₀: expected ${formatValue(session.twoSamplePoissonRate.expectedEvents1)} and ${formatValue(session.twoSamplePoissonRate.expectedEvents2)} events. Normal-approximation accuracy depends on event counts.`}
                  </p>
                </section>
              )}
              {session.varianceComparison && (
                <section
                  className="t-test-result"
                  aria-label={language === 'sv' ? 'Variansjämförelser' : 'Variance comparisons'}
                >
                  <h4>{language === 'sv' ? 'Jämförelse av varianser' : 'Compare variances'}</h4>
                  <div className="stat-grid t-test-grid">
                    <div className="stat-cell">
                      <span>s₁² / s₂²</span>
                      <strong>
                        {formatValue(session.varianceComparison.variance1)} /{' '}
                        {formatValue(session.varianceComparison.variance2)}
                      </strong>
                    </div>
                    <div className="stat-cell">
                      <span>F ({session.varianceComparison.fDegreesOfFreedom.join(', ')})</span>
                      <strong>{formatValue(session.varianceComparison.fStatistic)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>F p-värde</span>
                      <strong>{formatPValue(session.varianceComparison.fPValue, language)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>Bartlett χ²</span>
                      <strong>{formatValue(session.varianceComparison.bartlettStatistic)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>Bartlett p</span>
                      <strong>
                        {formatPValue(session.varianceComparison.bartlettPValue, language)}
                      </strong>
                    </div>
                    <div className="stat-cell">
                      <span>Levene F</span>
                      <strong>{formatValue(session.varianceComparison.leveneStatistic)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>Levene p</span>
                      <strong>
                        {formatPValue(session.varianceComparison.levenePValue, language)}
                      </strong>
                    </div>
                  </div>
                  <p className="session-caption">
                    {language === 'sv'
                      ? `F- och Bartlett-test förutsätter normalfördelning; median-Levene är robustare. p-värden jämförs med α = ${formatValue(session.varianceComparison.alpha)}. Normalitet har inte testats.`
                      : `F and Bartlett tests assume normality; median-centered Levene is more robust. p-values are compared with α = ${formatValue(session.varianceComparison.alpha)}. Normality was not tested.`}
                  </p>
                </section>
              )}
              {session.oneWayAnova && (
                <section
                  className="t-test-result"
                  aria-label={language === 'sv' ? 'Envägs-ANOVA-resultat' : 'One-way ANOVA result'}
                >
                  <h4>{language === 'sv' ? 'Envägs-ANOVA' : 'One-way ANOVA'}</h4>
                  <div className="stat-grid t-test-grid">
                    <div className="stat-cell">
                      <span>{language === 'sv' ? 'Grupper' : 'Groups'}</span>
                      <strong>{session.oneWayAnova.groupCount}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>
                        F ({session.oneWayAnova.betweenGroupDegreesOfFreedom},{' '}
                        {session.oneWayAnova.withinGroupDegreesOfFreedom})
                      </span>
                      <strong>{formatValue(session.oneWayAnova.fStatistic)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>p-värde</span>
                      <strong>{formatPValue(session.oneWayAnova.pValue, language)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>η²</span>
                      <strong>{formatValue(session.oneWayAnova.etaSquared)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>ω²</span>
                      <strong>{formatValue(session.oneWayAnova.omegaSquared)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>α</span>
                      <strong>{formatValue(session.oneWayAnova.alpha)}</strong>
                    </div>
                  </div>
                  <div className="contingency-scroll">
                    <table className="contingency-table">
                      <thead>
                        <tr>
                          <th scope="col">{language === 'sv' ? 'Variationskälla' : 'Source'}</th>
                          <th scope="col">SS</th>
                          <th scope="col">df</th>
                          <th scope="col">MS</th>
                          <th scope="col">F</th>
                          <th scope="col">p</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <th scope="row">
                            {language === 'sv' ? 'Mellan grupper' : 'Between groups'}
                          </th>
                          <td>{formatValue(session.oneWayAnova.betweenGroupSumSquares)}</td>
                          <td>{session.oneWayAnova.betweenGroupDegreesOfFreedom}</td>
                          <td>{formatValue(session.oneWayAnova.betweenGroupMeanSquare)}</td>
                          <td>{formatValue(session.oneWayAnova.fStatistic)}</td>
                          <td>{formatPValue(session.oneWayAnova.pValue, language)}</td>
                        </tr>
                        <tr>
                          <th scope="row">
                            {language === 'sv' ? 'Inom grupper' : 'Within groups'}
                          </th>
                          <td>{formatValue(session.oneWayAnova.withinGroupSumSquares)}</td>
                          <td>{session.oneWayAnova.withinGroupDegreesOfFreedom}</td>
                          <td>{formatValue(session.oneWayAnova.withinGroupMeanSquare)}</td>
                          <td />
                          <td />
                        </tr>
                        <tr>
                          <th scope="row">{language === 'sv' ? 'Totalt' : 'Total'}</th>
                          <td>{formatValue(session.oneWayAnova.totalSumSquares)}</td>
                          <td>{session.oneWayAnova.count - 1}</td>
                          <td />
                          <td />
                          <td />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="contingency-scroll">
                    <table className="contingency-table">
                      <thead>
                        <tr>
                          <th scope="col">{language === 'sv' ? 'Grupp' : 'Group'}</th>
                          <th scope="col">n</th>
                          <th scope="col">{language === 'sv' ? 'Medel' : 'Mean'}</th>
                          <th scope="col">s</th>
                        </tr>
                      </thead>
                      <tbody>
                        {session.oneWayAnova.groups.map((group) => (
                          <tr key={group.group}>
                            <th scope="row">{group.group}</th>
                            <td>{group.count}</td>
                            <td>{formatValue(group.mean)}</td>
                            <td>{formatValue(group.standardDeviation)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <h4>
                    {language === 'sv'
                      ? 'Tukey-Kramer parjämförelser'
                      : 'Tukey-Kramer pairwise comparisons'}
                  </h4>
                  <div className="contingency-scroll">
                    <table className="contingency-table">
                      <thead>
                        <tr>
                          <th scope="col">{language === 'sv' ? 'Jämförelse' : 'Comparison'}</th>
                          <th scope="col">
                            {language === 'sv' ? 'Medelskillnad' : 'Mean difference'}
                          </th>
                          <th scope="col">q</th>
                          <th scope="col">{language === 'sv' ? 'Justerat p' : 'Adjusted p'}</th>
                          <th scope="col">{language === 'sv' ? 'KI' : 'CI'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {session.oneWayAnova.pairwise.map((pair) => (
                          <tr key={`${pair.group1}-${pair.group2}`}>
                            <th scope="row">
                              {pair.group1} − {pair.group2}
                            </th>
                            <td>{formatValue(pair.meanDifference)}</td>
                            <td>{formatValue(pair.qStatistic)}</td>
                            <td>{formatPValue(pair.adjustedPValue, language)}</td>
                            <td>
                              {formatValue(pair.confidenceInterval[0])} to{' '}
                              {formatValue(pair.confidenceInterval[1])}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="session-caption">
                    {language === 'sv'
                      ? 'Tukey-Kramer använder numerisk integrering av studentized-range-fördelningen. Normalitet, oberoende och lika varians har inte testats; kontrollera särskilt små grupper och extrema residualer.'
                      : 'Tukey-Kramer uses numerical integration of the studentized-range distribution. Normality, independence, and equal variance were not tested; inspect small groups and extreme residuals.'}
                  </p>
                </section>
              )}
              {session.twoLevelFactorial && (
                <section
                  className="t-test-result"
                  aria-label={language === 'sv' ? 'DOE-resultat' : 'DOE result'}
                >
                  <h4>
                    {language === 'sv' ? '2-nivåers faktorförsök' : 'Two-level factorial DOE'}
                  </h4>
                  <div className="stat-grid t-test-grid">
                    <div className="stat-cell">
                      <span>{language === 'sv' ? 'Körningar' : 'Runs'}</span>
                      <strong>{session.twoLevelFactorial.count}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>{language === 'sv' ? 'Faktorer' : 'Factors'}</span>
                      <strong>{session.twoLevelFactorial.factorCount}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>R²</span>
                      <strong>{formatValue(session.twoLevelFactorial.rSquared)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>{language === 'sv' ? 'Fel-df' : 'Error df'}</span>
                      <strong>{session.twoLevelFactorial.errorDegreesOfFreedom}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>α</span>
                      <strong>{formatValue(session.twoLevelFactorial.alpha)}</strong>
                    </div>
                  </div>
                  <div className="contingency-scroll">
                    <table className="contingency-table">
                      <thead>
                        <tr>
                          <th scope="col">Term</th>
                          <th scope="col">{language === 'sv' ? 'Koefficient' : 'Coefficient'}</th>
                          <th scope="col">{language === 'sv' ? 'Effekt' : 'Effect'}</th>
                          <th scope="col">SS</th>
                          <th scope="col">F</th>
                          <th scope="col">p</th>
                        </tr>
                      </thead>
                      <tbody>
                        {session.twoLevelFactorial.effects.map((effect) => (
                          <tr key={effect.term}>
                            <th scope="row">{effect.term}</th>
                            <td>{formatValue(effect.coefficient)}</td>
                            <td>{formatValue(effect.effect)}</td>
                            <td>{formatValue(effect.sumSquares)}</td>
                            <td>{formatValue(effect.fStatistic)}</td>
                            <td>{formatPValue(effect.pValue, language)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="session-caption">
                    {language === 'sv'
                      ? `Fullfaktoriell ortogonal modell; fel-MS ${formatValue(session.twoLevelFactorial.errorMeanSquare)}. Resultaten är inte oberoende referensverifierade.`
                      : `Orthogonal full-factorial model; error MS ${formatValue(session.twoLevelFactorial.errorMeanSquare)}. Results are not independently reference-verified.`}
                  </p>
                </section>
              )}
              {session.twoWayAnova && (
                <section
                  className="t-test-result"
                  aria-label={language === 'sv' ? 'Tvåvägs-ANOVA-resultat' : 'Two-way ANOVA result'}
                >
                  <h4>{language === 'sv' ? 'Tvåvägs-ANOVA' : 'Two-way ANOVA'}</h4>
                  <div className="stat-grid t-test-grid">
                    <div className="stat-cell">
                      <span>{language === 'sv' ? 'Observationer' : 'Observations'}</span>
                      <strong>{session.twoWayAnova.count}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>{session.twoWayAnova.factor1Name}</span>
                      <strong>{session.twoWayAnova.factor1Levels.length}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>{session.twoWayAnova.factor2Name}</span>
                      <strong>{session.twoWayAnova.factor2Levels.length}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>{language === 'sv' ? 'Replikat/cell' : 'Replicates/cell'}</span>
                      <strong>{session.twoWayAnova.replicateCount}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>{language === 'sv' ? 'Fel-MS' : 'Error MS'}</span>
                      <strong>{formatValue(session.twoWayAnova.errorMeanSquare)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>α</span>
                      <strong>{formatValue(session.twoWayAnova.alpha)}</strong>
                    </div>
                  </div>
                  <div className="contingency-scroll">
                    <table className="contingency-table">
                      <thead>
                        <tr>
                          <th scope="col">{language === 'sv' ? 'Variationskälla' : 'Source'}</th>
                          <th scope="col">SS</th>
                          <th scope="col">df</th>
                          <th scope="col">MS</th>
                          <th scope="col">F</th>
                          <th scope="col">p</th>
                          <th scope="col">{language === 'sv' ? 'η² partiell' : 'Partial η²'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {session.twoWayAnova.table.map((row) => {
                          const source = {
                            factor1: session.twoWayAnova!.factor1Name,
                            factor2: session.twoWayAnova!.factor2Name,
                            interaction: `${session.twoWayAnova!.factor1Name} × ${session.twoWayAnova!.factor2Name}`,
                            error: language === 'sv' ? 'Fel' : 'Error',
                            total: language === 'sv' ? 'Totalt' : 'Total',
                          }[row.source]
                          return (
                            <tr key={row.source}>
                              <th scope="row">{source}</th>
                              <td>{formatValue(row.sumSquares)}</td>
                              <td>{row.degreesOfFreedom}</td>
                              <td>{row.meanSquare === null ? '' : formatValue(row.meanSquare)}</td>
                              <td>{row.fStatistic === null ? '' : formatValue(row.fStatistic)}</td>
                              <td>
                                {row.pValue === null ? '' : formatPValue(row.pValue, language)}
                              </td>
                              <td>
                                {row.partialEtaSquared === null
                                  ? ''
                                  : formatValue(row.partialEtaSquared)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="contingency-scroll">
                    <table className="contingency-table">
                      <thead>
                        <tr>
                          <th scope="col">{session.twoWayAnova.factor1Name}</th>
                          <th scope="col">{session.twoWayAnova.factor2Name}</th>
                          <th scope="col">n</th>
                          <th scope="col">{language === 'sv' ? 'Medel' : 'Mean'}</th>
                          <th scope="col">s</th>
                        </tr>
                      </thead>
                      <tbody>
                        {session.twoWayAnova.cellMeans.map((cell) => (
                          <tr key={`${cell.factor1}-${cell.factor2}`}>
                            <th scope="row">{cell.factor1}</th>
                            <td>{cell.factor2}</td>
                            <td>{cell.count}</td>
                            <td>{formatValue(cell.mean)}</td>
                            <td>{formatValue(cell.standardDeviation)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="session-caption">
                    {language === 'sv'
                      ? 'Balanserad modell med interaktion. Normalitet, oberoende och homogen varians har inte testats; obalanserade data stöds inte.'
                      : 'Balanced model with interaction. Normality, independence, and equal variance were not tested; unbalanced data are not supported.'}
                  </p>
                </section>
              )}
              {session.linearRegression && (
                <section
                  className="t-test-result"
                  aria-label={language === 'sv' ? 'Regressionsresultat' : 'Regression result'}
                >
                  <h4>
                    {language === 'sv'
                      ? 'Multipel linjär regression'
                      : 'Multiple linear regression'}
                  </h4>
                  <div className="stat-grid t-test-grid">
                    <div className="stat-cell">
                      <span>n</span>
                      <strong>{session.linearRegression.count}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>{language === 'sv' ? 'Borttagna rader' : 'Rows excluded'}</span>
                      <strong>{session.linearRegression.droppedCount}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>R²</span>
                      <strong>{formatValue(session.linearRegression.rSquared)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>{language === 'sv' ? 'Justerat R²' : 'Adjusted R²'}</span>
                      <strong>{formatValue(session.linearRegression.adjustedRSquared)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>
                        F ({session.linearRegression.predictorNames.length},
                        {session.linearRegression.degreesOfFreedom})
                      </span>
                      <strong>{formatValue(session.linearRegression.fStatistic)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>{language === 'sv' ? 'Modell-p' : 'Model p'}</span>
                      <strong>
                        {formatPValue(session.linearRegression.modelPValue, language)}
                      </strong>
                    </div>
                    <div className="stat-cell">
                      <span>{language === 'sv' ? 'Durbin–Watson' : 'Durbin–Watson'}</span>
                      <strong>{formatValue(session.linearRegression.durbinWatson)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>α</span>
                      <strong>{formatValue(session.linearRegression.alpha)}</strong>
                    </div>
                  </div>
                  <h4>{language === 'sv' ? 'Koefficienter' : 'Coefficients'}</h4>
                  <div className="contingency-scroll">
                    <table className="contingency-table">
                      <thead>
                        <tr>
                          <th scope="col">{language === 'sv' ? 'Term' : 'Term'}</th>
                          <th scope="col">{language === 'sv' ? 'Skattning' : 'Estimate'}</th>
                          <th scope="col">SE</th>
                          <th scope="col">t</th>
                          <th scope="col">p</th>
                          <th scope="col">{language === 'sv' ? 'KI' : 'CI'}</th>
                          <th scope="col">VIF</th>
                        </tr>
                      </thead>
                      <tbody>
                        {session.linearRegression.coefficients.map((coefficient) => (
                          <tr key={coefficient.term}>
                            <th scope="row">{coefficient.term}</th>
                            <td>{formatValue(coefficient.estimate)}</td>
                            <td>{formatValue(coefficient.standardError)}</td>
                            <td>{formatValue(coefficient.tStatistic)}</td>
                            <td>{formatPValue(coefficient.pValue, language)}</td>
                            <td>
                              {formatValue(coefficient.confidenceInterval[0])} to{' '}
                              {formatValue(coefficient.confidenceInterval[1])}
                            </td>
                            <td>{coefficient.vif === null ? '' : formatValue(coefficient.vif)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <h4>{language === 'sv' ? 'Variansanalys' : 'Analysis of variance'}</h4>
                  <div className="contingency-scroll">
                    <table className="contingency-table">
                      <thead>
                        <tr>
                          <th scope="col">{language === 'sv' ? 'Källa' : 'Source'}</th>
                          <th scope="col">SS</th>
                          <th scope="col">df</th>
                          <th scope="col">MS</th>
                          <th scope="col">F</th>
                          <th scope="col">p</th>
                        </tr>
                      </thead>
                      <tbody>
                        {session.linearRegression.anova.map((row) => (
                          <tr key={row.source}>
                            <th scope="row">
                              {row.source === 'regression'
                                ? language === 'sv'
                                  ? 'Regression'
                                  : 'Regression'
                                : row.source === 'error'
                                  ? language === 'sv'
                                    ? 'Fel'
                                    : 'Error'
                                  : language === 'sv'
                                    ? 'Totalt'
                                    : 'Total'}
                            </th>
                            <td>{formatValue(row.sumSquares)}</td>
                            <td>{row.degreesOfFreedom}</td>
                            <td>{row.meanSquare === null ? '' : formatValue(row.meanSquare)}</td>
                            <td>{row.fStatistic === null ? '' : formatValue(row.fStatistic)}</td>
                            <td>{row.pValue === null ? '' : formatPValue(row.pValue, language)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="regression-diagnostics-heading">
                    <h4>{language === 'sv' ? 'Residualdiagnostik' : 'Residual diagnostics'}</h4>
                    <button
                      className="toolbar-button"
                      type="button"
                      onClick={exportLinearRegressionDiagnostics}
                    >
                      <Download size={14} />
                      {language === 'sv' ? 'Exportera alla' : 'Export all'}
                    </button>
                  </div>
                  <div className="contingency-scroll">
                    <table className="contingency-table">
                      <thead>
                        <tr>
                          <th scope="col">{language === 'sv' ? 'Rad' : 'Row'}</th>
                          <th scope="col">{language === 'sv' ? 'Observerat' : 'Observed'}</th>
                          <th scope="col">{language === 'sv' ? 'Skattat' : 'Fitted'}</th>
                          <th scope="col">{language === 'sv' ? 'Residual' : 'Residual'}</th>
                          <th scope="col">{language === 'sv' ? 'Hävstång' : 'Leverage'}</th>
                          <th scope="col">Cook's D</th>
                        </tr>
                      </thead>
                      <tbody>
                        {session.linearRegression.observations.slice(0, 50).map((observation) => (
                          <tr key={observation.sourceRow}>
                            <th scope="row">{observation.sourceRow}</th>
                            <td>{formatValue(observation.observed)}</td>
                            <td>{formatValue(observation.fitted)}</td>
                            <td>{formatValue(observation.residual)}</td>
                            <td>{formatValue(observation.leverage)}</td>
                            <td>{formatValue(observation.cooksDistance)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="session-caption">
                    {language === 'sv'
                      ? `QR-regression med intercept; visar högst 50 av ${session.linearRegression.count} residualrader. Inkompletta rader har uteslutits. Normalitet, oberoende och konstant varians har inte testats.`
                      : `QR regression with intercept; showing up to 50 of ${session.linearRegression.count} residual rows. Incomplete rows were excluded. Normality, independence, and constant variance were not tested.`}
                  </p>
                </section>
              )}
              {session.nonparametric && (
                <section
                  className="t-test-result"
                  aria-label={
                    language === 'sv'
                      ? 'Icke-parametriskt testresultat'
                      : 'Nonparametric test result'
                  }
                >
                  <h4>
                    {session.nonparametric.kind === 'mannWhitney'
                      ? 'Mann–Whitney'
                      : session.nonparametric.kind === 'kruskalWallis'
                        ? 'Kruskal–Wallis'
                        : session.nonparametric.kind === 'sign'
                          ? language === 'sv'
                            ? 'Teckentest'
                            : 'Sign test'
                          : session.nonparametric.kind === 'runs'
                            ? language === 'sv'
                              ? 'Runs-test'
                              : 'Runs test'
                            : session.nonparametric.kind === 'wilcoxon'
                              ? 'Wilcoxon signed-rank'
                              : session.nonparametric.kind === 'moodMedian'
                                ? 'Mood-median'
                                : 'Friedman'}
                  </h4>
                  {session.nonparametric.kind === 'mannWhitney' && (
                    <div className="stat-grid t-test-grid">
                      <div className="stat-cell">
                        <span>U</span>
                        <strong>{formatValue(session.nonparametric.result.uStatistic)}</strong>
                      </div>
                      <div className="stat-cell">
                        <span>Z</span>
                        <strong>{formatValue(session.nonparametric.result.zStatistic)}</strong>
                      </div>
                      <div className="stat-cell">
                        <span>p-värde</span>
                        <strong>
                          {formatPValue(session.nonparametric.result.pValue, language)}
                        </strong>
                      </div>
                      <div className="stat-cell">
                        <span>n₁ / n₂</span>
                        <strong>
                          {session.nonparametric.result.count1} /{' '}
                          {session.nonparametric.result.count2}
                        </strong>
                      </div>
                      <div className="stat-cell">
                        <span>Rank-biserial r</span>
                        <strong>
                          {formatValue(session.nonparametric.result.rankBiserialCorrelation)}
                        </strong>
                      </div>
                    </div>
                  )}
                  {session.nonparametric.kind === 'kruskalWallis' && (
                    <>
                      <div className="stat-grid t-test-grid">
                        <div className="stat-cell">
                          <span>H</span>
                          <strong>{formatValue(session.nonparametric.result.statistic)}</strong>
                        </div>
                        <div className="stat-cell">
                          <span>df</span>
                          <strong>{session.nonparametric.result.degreesOfFreedom}</strong>
                        </div>
                        <div className="stat-cell">
                          <span>p-värde</span>
                          <strong>
                            {formatPValue(session.nonparametric.result.pValue, language)}
                          </strong>
                        </div>
                        <div className="stat-cell">
                          <span>{language === 'sv' ? 'Tie-korrigering' : 'Tie correction'}</span>
                          <strong>{formatValue(session.nonparametric.result.tieCorrection)}</strong>
                        </div>
                      </div>
                      <div className="contingency-scroll">
                        <table className="contingency-table">
                          <thead>
                            <tr>
                              <th>{language === 'sv' ? 'Grupp' : 'Group'}</th>
                              <th>n</th>
                              <th>{language === 'sv' ? 'Median' : 'Median'}</th>
                              <th>{language === 'sv' ? 'Medelrang' : 'Mean rank'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {session.nonparametric.result.groups.map((group) => (
                              <tr key={group.group}>
                                <th scope="row">{group.group}</th>
                                <td>{group.count}</td>
                                <td>{formatValue(group.median)}</td>
                                <td>{formatValue(group.meanRank)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                  {session.nonparametric.kind === 'sign' && (
                    <div className="stat-grid t-test-grid">
                      <div className="stat-cell">
                        <span>{language === 'sv' ? 'Median under H₀' : 'Median under H₀'}</span>
                        <strong>
                          {formatValue(session.nonparametric.result.hypothesizedMedian)}
                        </strong>
                      </div>
                      <div className="stat-cell">
                        <span>{language === 'sv' ? 'Positiva' : 'Positive'}</span>
                        <strong>{session.nonparametric.result.positive}</strong>
                      </div>
                      <div className="stat-cell">
                        <span>{language === 'sv' ? 'Negativa' : 'Negative'}</span>
                        <strong>{session.nonparametric.result.negative}</strong>
                      </div>
                      <div className="stat-cell">
                        <span>{language === 'sv' ? 'Ties exkluderade' : 'Ties excluded'}</span>
                        <strong>{session.nonparametric.result.ties}</strong>
                      </div>
                      <div className="stat-cell">
                        <span>p-värde</span>
                        <strong>
                          {formatPValue(session.nonparametric.result.pValue, language)}
                        </strong>
                      </div>
                    </div>
                  )}
                  {session.nonparametric.kind === 'runs' && (
                    <div className="stat-grid t-test-grid">
                      <div className="stat-cell">
                        <span>{language === 'sv' ? 'Median' : 'Median'}</span>
                        <strong>{formatValue(session.nonparametric.result.median)}</strong>
                      </div>
                      <div className="stat-cell">
                        <span>{language === 'sv' ? 'Observerade runs' : 'Observed runs'}</span>
                        <strong>{session.nonparametric.result.runs}</strong>
                      </div>
                      <div className="stat-cell">
                        <span>{language === 'sv' ? 'Förväntade runs' : 'Expected runs'}</span>
                        <strong>{formatValue(session.nonparametric.result.expectedRuns)}</strong>
                      </div>
                      <div className="stat-cell">
                        <span>Z</span>
                        <strong>{formatValue(session.nonparametric.result.zStatistic)}</strong>
                      </div>
                      <div className="stat-cell">
                        <span>p-värde</span>
                        <strong>
                          {formatPValue(session.nonparametric.result.pValue, language)}
                        </strong>
                      </div>
                      <div className="stat-cell">
                        <span>{language === 'sv' ? 'Ties exkluderade' : 'Ties excluded'}</span>
                        <strong>{session.nonparametric.result.ties}</strong>
                      </div>
                    </div>
                  )}
                  {session.nonparametric.kind === 'wilcoxon' && (
                    <div className="stat-grid t-test-grid">
                      <div className="stat-cell">
                        <span>W</span>
                        <strong>{formatValue(session.nonparametric.result.statistic)}</strong>
                      </div>
                      <div className="stat-cell">
                        <span>Z</span>
                        <strong>{formatValue(session.nonparametric.result.zStatistic)}</strong>
                      </div>
                      <div className="stat-cell">
                        <span>p-värde</span>
                        <strong>
                          {formatPValue(session.nonparametric.result.pValue, language)}
                        </strong>
                      </div>
                      <div className="stat-cell">
                        <span>Hodges–Lehmann</span>
                        <strong>
                          {formatValue(session.nonparametric.result.hodgesLehmannEstimate)}
                        </strong>
                      </div>
                      <div className="stat-cell">
                        <span>{language === 'sv' ? 'Nollskillnader' : 'Zero differences'}</span>
                        <strong>{session.nonparametric.result.zeroDifferences}</strong>
                      </div>
                      <div className="stat-cell">
                        <span>n</span>
                        <strong>{session.nonparametric.result.count}</strong>
                      </div>
                    </div>
                  )}
                  {session.nonparametric.kind === 'moodMedian' && (
                    <>
                      <div className="stat-grid t-test-grid">
                        <div className="stat-cell">
                          <span>{language === 'sv' ? 'Poolad median' : 'Pooled median'}</span>
                          <strong>{formatValue(session.nonparametric.result.median)}</strong>
                        </div>
                        <div className="stat-cell">
                          <span>χ²</span>
                          <strong>{formatValue(session.nonparametric.result.statistic)}</strong>
                        </div>
                        <div className="stat-cell">
                          <span>df</span>
                          <strong>{session.nonparametric.result.degreesOfFreedom}</strong>
                        </div>
                        <div className="stat-cell">
                          <span>p-värde</span>
                          <strong>
                            {formatPValue(session.nonparametric.result.pValue, language)}
                          </strong>
                        </div>
                        <div className="stat-cell">
                          <span>{language === 'sv' ? 'Ties exkluderade' : 'Ties excluded'}</span>
                          <strong>{session.nonparametric.result.tiesExcluded}</strong>
                        </div>
                      </div>
                      <div className="contingency-scroll">
                        <table className="contingency-table">
                          <thead>
                            <tr>
                              <th>{language === 'sv' ? 'Grupp' : 'Group'}</th>
                              <th>{language === 'sv' ? 'Under median' : 'Below median'}</th>
                              <th>{language === 'sv' ? 'Över median' : 'Above median'}</th>
                              <th>{language === 'sv' ? 'Ties' : 'Ties'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {session.nonparametric.result.groups.map((group) => (
                              <tr key={group.group}>
                                <th scope="row">{group.group}</th>
                                <td>{group.below}</td>
                                <td>{group.above}</td>
                                <td>{group.ties}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                  {session.nonparametric.kind === 'friedman' && (
                    <>
                      <div className="stat-grid t-test-grid">
                        <div className="stat-cell">
                          <span>Q</span>
                          <strong>{formatValue(session.nonparametric.result.statistic)}</strong>
                        </div>
                        <div className="stat-cell">
                          <span>df</span>
                          <strong>{session.nonparametric.result.degreesOfFreedom}</strong>
                        </div>
                        <div className="stat-cell">
                          <span>p-värde</span>
                          <strong>
                            {formatPValue(session.nonparametric.result.pValue, language)}
                          </strong>
                        </div>
                        <div className="stat-cell">
                          <span>{language === 'sv' ? 'Kompletta block' : 'Complete blocks'}</span>
                          <strong>{session.nonparametric.result.blocks}</strong>
                        </div>
                        <div className="stat-cell">
                          <span>{language === 'sv' ? 'Tie-korrigering' : 'Tie correction'}</span>
                          <strong>{formatValue(session.nonparametric.result.tieCorrection)}</strong>
                        </div>
                      </div>
                      <div className="contingency-scroll">
                        <table className="contingency-table">
                          <thead>
                            <tr>
                              <th>{language === 'sv' ? 'Behandling' : 'Treatment'}</th>
                              <th>{language === 'sv' ? 'Medelrang' : 'Mean rank'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {session.nonparametric.result.treatments.map((treatment) => (
                              <tr key={treatment.treatment}>
                                <th scope="row">{treatment.treatment}</th>
                                <td>{formatValue(treatment.meanRank)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                  <p className="session-caption">
                    {session.nonparametric.kind === 'sign'
                      ? language === 'sv'
                        ? `Exakt binomialtest; ties uteslutna. Beslut jämförs med α = ${formatValue(session.nonparametric.result.alpha)}.`
                        : `Exact binomial test; ties excluded. Decision uses α = ${formatValue(session.nonparametric.result.alpha)}.`
                      : session.nonparametric.kind === 'wilcoxon'
                        ? language === 'sv'
                          ? `Wilcoxon signed-rank använder normalapproximation med tie- och nollskillnadshantering; Walsh-medelvärden ger Hodges–Lehmann-skattningen. α = ${formatValue(session.nonparametric.result.alpha)}.`
                          : `Wilcoxon signed-rank uses a normal approximation with tie and zero handling; Walsh averages provide the Hodges–Lehmann estimate. α = ${formatValue(session.nonparametric.result.alpha)}.`
                        : session.nonparametric.kind === 'moodMedian'
                          ? language === 'sv'
                            ? `Mood-median använder chi-tvåapproximation för antal under/över poolad median; median-ties utesluts. α = ${formatValue(session.nonparametric.result.alpha)}.`
                            : `Mood median uses a chi-square approximation for counts below/above the pooled median; median ties are excluded. α = ${formatValue(session.nonparametric.result.alpha)}.`
                          : session.nonparametric.kind === 'friedman'
                            ? language === 'sv'
                              ? `Friedman rangordnar behandlingar inom block och använder tie-korrigerad chi-tvåapproximation. Post-hoc-jämförelser ingår inte. α = ${formatValue(session.nonparametric.result.alpha)}.`
                              : `Friedman ranks treatments within blocks and uses a tie-corrected chi-square approximation. Post-hoc comparisons are not included. α = ${formatValue(session.nonparametric.result.alpha)}.`
                            : session.nonparametric.kind === 'mannWhitney'
                              ? language === 'sv'
                                ? `Normalapproximation med tie- och kontinuitetskorrigering. α = ${formatValue(session.nonparametric.result.alpha)}; formskillnad testas inte separat.`
                                : `Normal approximation with tie and continuity corrections. α = ${formatValue(session.nonparametric.result.alpha)}; distribution shape is not tested separately.`
                              : session.nonparametric.kind === 'kruskalWallis'
                                ? language === 'sv'
                                  ? `Chi-tvåapproximation med tie-korrigering; signifikant H anger att minst en grupp skiljer sig. Post-hoc-jämförelser ingår inte. α = ${formatValue(session.nonparametric.result.alpha)}.`
                                  : `Tie-corrected chi-square approximation; significant H indicates at least one group differs. Post-hoc comparisons are not included. α = ${formatValue(session.nonparametric.result.alpha)}.`
                                : language === 'sv'
                                  ? `Runs-test med normalapproximation runt stickprovsmedianen; ties uteslutna och oberoende antas. α = ${formatValue(session.nonparametric.result.alpha)}.`
                                  : `Runs test uses a normal approximation around the sample median; ties excluded and independence assumed. α = ${formatValue(session.nonparametric.result.alpha)}.`}
                  </p>
                </section>
              )}
              {session.resampling && (
                <section
                  className="t-test-result"
                  aria-label={language === 'sv' ? 'Resamplingresultat' : 'Resampling result'}
                >
                  <h4>
                    {session.resampling.kind === 'bootstrap'
                      ? language === 'sv'
                        ? `Bootstrap · ${
                            session.resampling.result.statistic === 'mean'
                              ? 'medelvärde'
                              : session.resampling.result.statistic === 'median'
                                ? 'median'
                                : session.resampling.result.statistic === 'standardDeviation'
                                  ? 'standardavvikelse'
                                  : 'varians'
                          }`
                        : `Bootstrap · ${
                            session.resampling.result.statistic === 'standardDeviation'
                              ? 'standard deviation'
                              : session.resampling.result.statistic
                          }`
                      : language === 'sv'
                        ? `Permutationstest · ${session.resampling.result.statistic === 'mean' ? 'medelskillnad' : 'medianskillnad'}`
                        : `Permutation test · ${session.resampling.result.statistic} difference`}
                  </h4>
                  {session.resampling.kind === 'bootstrap' ? (
                    <div className="stat-grid t-test-grid">
                      <div className="stat-cell">
                        <span>{language === 'sv' ? 'Kompletta värden' : 'Complete values'}</span>
                        <strong>{session.resampling.result.count}</strong>
                      </div>
                      <div className="stat-cell">
                        <span>{language === 'sv' ? 'Skattning' : 'Estimate'}</span>
                        <strong>{formatValue(session.resampling.result.estimate)}</strong>
                      </div>
                      <div className="stat-cell">
                        <span>{language === 'sv' ? 'Percentil-KI' : 'Percentile CI'}</span>
                        <strong>
                          {formatValue(session.resampling.result.confidenceInterval[0])} to{' '}
                          {formatValue(session.resampling.result.confidenceInterval[1])}
                        </strong>
                      </div>
                      <div className="stat-cell">
                        <span>{language === 'sv' ? 'Resamplings' : 'Resamples'}</span>
                        <strong>{session.resampling.result.resamples}</strong>
                      </div>
                      <div className="stat-cell">
                        <span>Seed</span>
                        <strong>{session.resampling.result.seed}</strong>
                      </div>
                      <div className="stat-cell">
                        <span>α</span>
                        <strong>{formatValue(session.resampling.result.alpha)}</strong>
                      </div>
                    </div>
                  ) : (
                    <div className="stat-grid t-test-grid">
                      <div className="stat-cell">
                        <span>
                          Δ{' '}
                          {session.resampling.result.statistic === 'mean'
                            ? language === 'sv'
                              ? 'medel'
                              : 'mean'
                            : language === 'sv'
                              ? 'median'
                              : 'median'}
                        </span>
                        <strong>{formatValue(session.resampling.result.observedDifference)}</strong>
                      </div>
                      <div className="stat-cell">
                        <span>p-värde</span>
                        <strong>{formatPValue(session.resampling.result.pValue, language)}</strong>
                      </div>
                      <div className="stat-cell">
                        <span>n₁ / n₂</span>
                        <strong>
                          {session.resampling.result.count1} / {session.resampling.result.count2}
                        </strong>
                      </div>
                      <div className="stat-cell">
                        <span>{language === 'sv' ? 'Permutationer' : 'Permutations'}</span>
                        <strong>{session.resampling.result.permutations}</strong>
                      </div>
                      <div className="stat-cell">
                        <span>Seed</span>
                        <strong>{session.resampling.result.seed}</strong>
                      </div>
                      <div className="stat-cell">
                        <span>α</span>
                        <strong>{formatValue(session.resampling.result.alpha)}</strong>
                      </div>
                    </div>
                  )}
                  <p className="session-caption">
                    {session.resampling.kind === 'bootstrap'
                      ? language === 'sv'
                        ? 'Percentilintervall från empirisk bootstrapfördelning med återläggning. Monte Carlo-osäkerhet beror på antal resamplings och seed.'
                        : 'Percentile interval from the empirical bootstrap distribution with replacement. Monte Carlo uncertainty depends on resample count and seed.'
                      : language === 'sv'
                        ? 'Tvåsidigt Monte Carlo-permutationstest under utbytbarhet mellan grupper; p-värdet använder plus-ett-korrigering.'
                        : 'Two-sided Monte Carlo permutation test under exchangeability between groups; p-value uses the plus-one correction.'}
                  </p>
                </section>
              )}
              {session.normalKS && (
                <section
                  className="t-test-result"
                  aria-label={
                    language === 'sv' ? 'Kolmogorov-Smirnov-resultat' : 'Kolmogorov-Smirnov result'
                  }
                >
                  <h4>
                    {language === 'sv'
                      ? 'Kolmogorov-Smirnov mot N(μ, σ)'
                      : 'Kolmogorov-Smirnov vs N(μ, σ)'}
                  </h4>
                  <div className="stat-grid t-test-grid">
                    <div className="stat-cell">
                      <span>Kompletta värden</span>
                      <strong>{session.normalKS.count}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>D</span>
                      <strong>{formatValue(session.normalKS.statistic)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>D+</span>
                      <strong>{formatValue(session.normalKS.dPlus)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>D−</span>
                      <strong>{formatValue(session.normalKS.dMinus)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>p-värde</span>
                      <strong>{formatPValue(session.normalKS.pValue, language)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>Specificerad μ / σ</span>
                      <strong>
                        {formatValue(session.normalKS.hypothesizedMean)} /{' '}
                        {formatValue(session.normalKS.hypothesizedStandardDeviation)}
                      </strong>
                    </div>
                  </div>
                  <p className="session-conclusion">
                    {language === 'sv'
                      ? `${session.normalKS.pValue < 0.05 ? 'Förkasta' : 'Förkasta inte'} H₀ att data följer den specificerade normalfördelningen (α = 0,05).`
                      : `${session.normalKS.pValue < 0.05 ? 'Reject' : 'Do not reject'} H₀ that data follow the specified normal distribution (α = 0.05).`}
                  </p>
                  <p className="session-caption">
                    {language === 'sv'
                      ? 'P-värdet gäller fullt specificerade μ och σ. Parametrar skattade från samma urval kräver Lilliefors-korrigering och stöds inte här.'
                      : 'The p-value assumes fully specified μ and σ. Parameters estimated from this sample require a Lilliefors correction, which is not used here.'}
                  </p>
                </section>
              )}
              {session.normalAD && (
                <section
                  className="t-test-result"
                  aria-label={
                    language === 'sv' ? 'Anderson-Darling-resultat' : 'Anderson-Darling result'
                  }
                >
                  <h4>
                    {language === 'sv'
                      ? 'Anderson-Darling för normalitet'
                      : 'Anderson-Darling normality test'}
                  </h4>
                  <div className="stat-grid t-test-grid">
                    <div className="stat-cell">
                      <span>{language === 'sv' ? 'Kompletta värden' : 'Complete values'}</span>
                      <strong>{session.normalAD.count}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>A²</span>
                      <strong>{formatValue(session.normalAD.statistic)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>{language === 'sv' ? 'Justerad A²' : 'Adjusted A²'}</span>
                      <strong>{formatValue(session.normalAD.adjustedStatistic)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>p-värde</span>
                      <strong>{formatPValue(session.normalAD.pValue, language)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>α</span>
                      <strong>{formatValue(session.normalAD.alpha)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>{language === 'sv' ? 'Skattat medel / s' : 'Estimated mean / s'}</span>
                      <strong>
                        {formatValue(session.normalAD.mean)} /{' '}
                        {formatValue(session.normalAD.standardDeviation)}
                      </strong>
                    </div>
                  </div>
                  <p className="session-conclusion">
                    {language === 'sv'
                      ? `${session.normalAD.rejectNormality ? 'Förkasta' : 'Förkasta inte'} H₀ om normalfördelning vid α = ${formatValue(session.normalAD.alpha)}.`
                      : `${session.normalAD.rejectNormality ? 'Reject' : 'Do not reject'} H₀ of normality at α = ${formatValue(session.normalAD.alpha)}.`}
                  </p>
                  <p className="session-caption">
                    {language === 'sv'
                      ? 'P-värdet är Stephens approximation med medelvärde och standardavvikelse skattade från urvalet. Minst 8 observationer krävs. Resultatet är inte oberoende referensverifierat.'
                      : 'The p-value uses the Stephens approximation with mean and standard deviation estimated from the sample. At least 8 observations are required. This result is not independently reference-verified.'}
                  </p>
                </section>
              )}
              {session.chiSquare && (
                <section
                  className="t-test-result"
                  aria-label={
                    language === 'sv'
                      ? 'Korstabell och chi-två'
                      : 'Contingency table and chi-square'
                  }
                >
                  <h4>
                    {language === 'sv'
                      ? 'Chi-två-test för samband'
                      : 'Chi-square test of independence'}
                  </h4>
                  <div className="contingency-scroll">
                    <table className="contingency-table">
                      <thead>
                        <tr>
                          <th scope="col">{session.columnName.split(' · ')[0]}</th>
                          {session.chiSquare.columnLabels.map((label) => (
                            <th scope="col" key={label}>
                              {label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {session.chiSquare.rowLabels.map((label, rowIndex) => (
                          <tr key={label}>
                            <th scope="row">{label}</th>
                            {session.chiSquare.columnLabels.map((columnLabel, columnIndex) => {
                              const expected = session.chiSquare!.expected[rowIndex][columnIndex]
                              return (
                                <td key={columnLabel}>
                                  <strong>
                                    {session.chiSquare!.observed[rowIndex][columnIndex]}
                                  </strong>
                                  <small className={expected < 5 ? 'expected-small' : ''}>
                                    {language === 'sv' ? 'förv.' : 'exp.'} {formatValue(expected)}
                                  </small>
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="stat-grid t-test-grid">
                    <div className="stat-cell">
                      <span>χ²</span>
                      <strong>{formatValue(session.chiSquare.statistic)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>Frihetsgrader</span>
                      <strong>{session.chiSquare.degreesOfFreedom}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>p-värde</span>
                      <strong>{formatPValue(session.chiSquare.pValue, language)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>Cramérs V</span>
                      <strong>{formatValue(session.chiSquare.cramersV)}</strong>
                    </div>
                  </div>
                  <p className="session-conclusion">
                    {language === 'sv'
                      ? `Vid α = ${formatValue(session.chiSquare.alpha)} ${session.chiSquare.pValue < session.chiSquare.alpha ? 'förkastas H₀ om oberoende.' : 'kan H₀ om oberoende inte förkastas.'}`
                      : `At α = ${formatValue(session.chiSquare.alpha)} ${session.chiSquare.pValue < session.chiSquare.alpha ? 'reject the independence null hypothesis.' : 'do not reject the independence null hypothesis.'}`}
                  </p>
                  <p className="session-caption">
                    {session.chiSquare.cellsBelowFive > 0
                      ? language === 'sv'
                        ? `${session.chiSquare.cellsBelowFive} celler har förväntat antal under 5; chi-två-approximationen kan vara osäker.`
                        : `${session.chiSquare.cellsBelowFive} cells have expected counts below 5; the chi-square approximation may be unreliable.`
                      : language === 'sv'
                        ? 'Alla förväntade cellantal är minst 5. Oberoende mellan observationer har inte testats.'
                        : 'All expected cell counts are at least 5. Independence of observations was not tested.'}
                  </p>
                </section>
              )}
              {session.chiSquareGoodnessOfFit && (
                <section
                  className="t-test-result"
                  aria-label={
                    language === 'sv' ? 'Goodness-of-fit-resultat' : 'Goodness-of-fit result'
                  }
                >
                  <h4>
                    {language === 'sv'
                      ? session.chiSquareGoodnessOfFit.probabilitySource === 'equal'
                        ? 'Chi-två goodness-of-fit · lika andelar'
                        : 'Chi-två goodness-of-fit · angivna sannolikheter'
                      : session.chiSquareGoodnessOfFit.probabilitySource === 'equal'
                        ? 'Chi-square goodness-of-fit · equal proportions'
                        : 'Chi-square goodness-of-fit · specified probabilities'}
                  </h4>
                  <div className="contingency-scroll">
                    <table className="contingency-table">
                      <thead>
                        <tr>
                          <th scope="col">{language === 'sv' ? 'Kategori' : 'Category'}</th>
                          <th scope="col">{language === 'sv' ? 'Sannolikhet' : 'Probability'}</th>
                          <th scope="col">{language === 'sv' ? 'Observerad' : 'Observed'}</th>
                          <th scope="col">{language === 'sv' ? 'Förväntad' : 'Expected'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {session.chiSquareGoodnessOfFit.categories.map((category, index) => (
                          <tr key={category}>
                            <th scope="row">{category}</th>
                            <td>
                              {formatValue(session.chiSquareGoodnessOfFit!.probabilities[index])}
                            </td>
                            <td>{session.chiSquareGoodnessOfFit!.observed[index]}</td>
                            <td
                              className={
                                session.chiSquareGoodnessOfFit.expected[index] < 5
                                  ? 'expected-small'
                                  : ''
                              }
                            >
                              {formatValue(session.chiSquareGoodnessOfFit.expected[index])}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="stat-grid t-test-grid">
                    <div className="stat-cell">
                      <span>χ²</span>
                      <strong>{formatValue(session.chiSquareGoodnessOfFit.statistic)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>Frihetsgrader</span>
                      <strong>{session.chiSquareGoodnessOfFit.degreesOfFreedom}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>p-värde</span>
                      <strong>
                        {formatPValue(session.chiSquareGoodnessOfFit.pValue, language)}
                      </strong>
                    </div>
                  </div>
                  <p className="session-conclusion">
                    {language === 'sv'
                      ? `${session.chiSquareGoodnessOfFit.pValue < session.chiSquareGoodnessOfFit.alpha ? 'Förkasta' : 'Förkasta inte'} H₀ om ${session.chiSquareGoodnessOfFit.probabilitySource === 'equal' ? 'lika kategorisannolikheter' : 'angivna kategorisannolikheter'} (α = ${formatValue(session.chiSquareGoodnessOfFit.alpha)}).`
                      : `${session.chiSquareGoodnessOfFit.pValue < session.chiSquareGoodnessOfFit.alpha ? 'Reject' : 'Do not reject'} H₀ of ${session.chiSquareGoodnessOfFit.probabilitySource === 'equal' ? 'equal category probabilities' : 'specified category probabilities'} (α = ${formatValue(session.chiSquareGoodnessOfFit.alpha)}).`}
                  </p>
                  <p className="session-caption">
                    {session.chiSquareGoodnessOfFit.cellsBelowFive > 0
                      ? language === 'sv'
                        ? `${session.chiSquareGoodnessOfFit.cellsBelowFive} kategorier har förväntat antal under 5; chi-två-approximationen kan vara osäker.`
                        : `${session.chiSquareGoodnessOfFit.cellsBelowFive} categories have expected counts below 5; the chi-square approximation may be unreliable.`
                      : language === 'sv'
                        ? 'Alla förväntade kategorital är minst 5.'
                        : 'All expected category counts are at least 5.'}
                  </p>
                </section>
              )}
              {session.poissonGoodnessOfFit && (
                <section
                  className="t-test-result"
                  aria-label={
                    language === 'sv'
                      ? 'Poisson goodness-of-fit-resultat'
                      : 'Poisson goodness-of-fit result'
                  }
                >
                  <h4>Poisson goodness-of-fit</h4>
                  <div className="contingency-scroll">
                    <table className="contingency-table">
                      <thead>
                        <tr>
                          <th scope="col">{language === 'sv' ? 'Räkningsklass' : 'Count class'}</th>
                          <th scope="col">{language === 'sv' ? 'Observerad' : 'Observed'}</th>
                          <th scope="col">{language === 'sv' ? 'Förväntad' : 'Expected'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {session.poissonGoodnessOfFit.categories.map((category, index) => (
                          <tr key={category}>
                            <th scope="row">{category}</th>
                            <td>{session.poissonGoodnessOfFit!.observed[index]}</td>
                            <td>{formatValue(session.poissonGoodnessOfFit.expected[index])}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="stat-grid t-test-grid">
                    <div className="stat-cell">
                      <span>
                        λ (
                        {session.poissonGoodnessOfFit.rateSource === 'estimated'
                          ? language === 'sv'
                            ? 'skattad'
                            : 'estimated'
                          : language === 'sv'
                            ? 'specificerad'
                            : 'specified'}
                        )
                      </span>
                      <strong>{formatValue(session.poissonGoodnessOfFit.rate)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>χ²</span>
                      <strong>{formatValue(session.poissonGoodnessOfFit.statistic)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>{language === 'sv' ? 'Frihetsgrader' : 'Degrees of freedom'}</span>
                      <strong>{session.poissonGoodnessOfFit.degreesOfFreedom}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>p-värde</span>
                      <strong>{formatPValue(session.poissonGoodnessOfFit.pValue, language)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>α</span>
                      <strong>{formatValue(session.poissonGoodnessOfFit.alpha)}</strong>
                    </div>
                  </div>
                  <p className="session-conclusion">
                    {language === 'sv'
                      ? `${session.poissonGoodnessOfFit.pValue < session.poissonGoodnessOfFit.alpha ? 'Förkasta' : 'Förkasta inte'} H₀ att räknedata följer en Poissonfördelning.`
                      : `${session.poissonGoodnessOfFit.pValue < session.poissonGoodnessOfFit.alpha ? 'Reject' : 'Do not reject'} H₀ that the counts follow a Poisson distribution.`}
                  </p>
                  <p className="session-caption">
                    {language === 'sv'
                      ? `${session.poissonGoodnessOfFit.rateSource === 'estimated' ? 'λ skattas från medelvärdet och en frihetsgrad dras av.' : 'λ anges under nollhypotesen och inga parametrar skattas.'} Klasser har slagits samman intill varandra till förväntat antal ≥ 5; χ²-approximationens giltighet och referensvärden är inte externt verifierade.`
                      : `${session.poissonGoodnessOfFit.rateSource === 'estimated' ? 'λ is estimated by the mean and one degree of freedom is subtracted.' : 'λ is specified under the null hypothesis; no parameter is estimated.'} Adjacent classes are pooled to expected counts ≥ 5; the chi-square approximation and reference values are not independently verified.`}
                  </p>
                </section>
              )}
              {session.fisherExact && (
                <section
                  className="t-test-result"
                  aria-label={
                    language === 'sv' ? 'Fishers exakta testresultat' : "Fisher's exact test result"
                  }
                >
                  <h4>
                    {language === 'sv' ? 'Fishers exakta 2×2-test' : "Fisher's exact 2x2 test"}
                  </h4>
                  <div className="contingency-scroll">
                    <table className="contingency-table">
                      <thead>
                        <tr>
                          <th scope="col">{session.columnName.split(' · ')[0]}</th>
                          {session.fisherExact.columnLabels.map((label) => (
                            <th scope="col" key={label}>
                              {label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {session.fisherExact.rowLabels.map((label, rowIndex) => (
                          <tr key={label}>
                            <th scope="row">{label}</th>
                            {session.fisherExact!.observed[rowIndex].map((count, columnIndex) => (
                              <td key={session.fisherExact!.columnLabels[columnIndex]}>{count}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="stat-grid t-test-grid">
                    <div className="stat-cell">
                      <span>n</span>
                      <strong>{session.fisherExact.count}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>Exakt p-värde</span>
                      <strong>{formatPValue(session.fisherExact.pValue, language)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>Oddskvot</span>
                      <strong>
                        {session.fisherExact.oddsRatio === null
                          ? 'odefinierad'
                          : session.fisherExact.oddsRatio === Number.POSITIVE_INFINITY
                            ? '∞'
                            : formatValue(session.fisherExact.oddsRatio)}
                      </strong>
                    </div>
                  </div>
                  <p className="session-caption">
                    {language === 'sv'
                      ? 'Tvåsidigt exakt hypergeometriskt p-värde med fasta marginaler; ingen chi-två-approximation används.'
                      : 'Two-sided exact hypergeometric p-value with fixed margins; no chi-square approximation is used.'}
                  </p>
                </section>
              )}
              {session.processCapability && (
                <section
                  className="t-test-result"
                  aria-label={
                    language === 'sv' ? 'Processkapabilitetsresultat' : 'Process capability result'
                  }
                >
                  <h4>
                    {language === 'sv'
                      ? 'Processkapabilitet (normal, individdata)'
                      : 'Process capability (normal, individual data)'}
                  </h4>
                  <div className="stat-grid t-test-grid">
                    <div className="stat-cell">
                      <span>n</span>
                      <strong>{session.processCapability.count}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>{language === 'sv' ? 'Medelvärde' : 'Mean'}</span>
                      <strong>{formatValue(session.processCapability.mean)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>{language === 'sv' ? 'Within-s' : 'Within s'}</span>
                      <strong>
                        {formatValue(session.processCapability.withinStandardDeviation)}
                      </strong>
                    </div>
                    <div className="stat-cell">
                      <span>{language === 'sv' ? 'Overall-s' : 'Overall s'}</span>
                      <strong>
                        {formatValue(session.processCapability.overallStandardDeviation)}
                      </strong>
                    </div>
                    <div className="stat-cell">
                      <span>Cp</span>
                      <strong>{formatValue(session.processCapability.cp)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>Cpk</span>
                      <strong>{formatValue(session.processCapability.cpk)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>Pp</span>
                      <strong>{formatValue(session.processCapability.pp)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>Ppk</span>
                      <strong>{formatValue(session.processCapability.ppk)}</strong>
                    </div>
                    {session.processCapability.cpm !== null && (
                      <div className="stat-cell">
                        <span>Cpm</span>
                        <strong>{formatValue(session.processCapability.cpm)}</strong>
                      </div>
                    )}
                    <div className="stat-cell">
                      <span>{language === 'sv' ? 'Z-bench within' : 'Z-bench within'}</span>
                      <strong>{formatValue(session.processCapability.zBenchWithin)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>{language === 'sv' ? 'Observerade PPM' : 'Observed PPM'}</span>
                      <strong>{formatValue(session.processCapability.observedPpm)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>{language === 'sv' ? 'Förväntade PPM' : 'Expected PPM'}</span>
                      <strong>{formatValue(session.processCapability.expectedOverallPpm)}</strong>
                    </div>
                  </div>
                  <p className="session-caption">
                    {language === 'sv'
                      ? `Specifikation: [${formatValue(session.processCapability.lowerSpecLimit)}, ${formatValue(session.processCapability.upperSpecLimit)}]. Inom-s = MR̄/1,128; overall-s = stickprovsstandardavvikelse. ${session.processCapability.outOfSpecCount} observationer låg utanför gränserna.`
                      : `Specifications: [${formatValue(session.processCapability.lowerSpecLimit)}, ${formatValue(session.processCapability.upperSpecLimit)}]. Within s = MR̄/1.128; overall s = sample standard deviation. ${session.processCapability.outOfSpecCount} observations were outside the limits.`}
                  </p>
                  <p className="session-caption">
                    {language === 'sv'
                      ? 'Z-bench within = 3 × Cpk utan 1,5σ-skift. Förväntade PPM bygger på normalfördelning med skattat medelvärde och overall-s. Normalitet, stabilitet och ordningsföljd har inte verifierats; raderna behandlas som tidsordnade individmätningar.'
                      : 'Z-bench within = 3 × Cpk with no 1.5σ shift. Expected PPM assumes a normal distribution using the estimated mean and overall s. Normality, stability, and sequence were not verified; rows are treated as time-ordered individual measurements.'}
                  </p>
                </section>
              )}
              {session.imrControlChart && (
                <section
                  className="t-test-result"
                  aria-label={
                    language === 'sv' ? 'I-MR-styrdiagramresultat' : 'I-MR control chart result'
                  }
                >
                  <h4>{language === 'sv' ? 'I-MR-styrdiagram' : 'I-MR control chart'}</h4>
                  <div className="stat-grid t-test-grid">
                    <div className="stat-cell">
                      <span>n</span>
                      <strong>{session.imrControlChart.count}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>{language === 'sv' ? 'I-centrum' : 'I center'}</span>
                      <strong>{formatValue(session.imrControlChart.individuals.centerLine)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>MR̄</span>
                      <strong>{formatValue(session.imrControlChart.averageMovingRange)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>{language === 'sv' ? 'Within-s' : 'Within s'}</span>
                      <strong>
                        {formatValue(session.imrControlChart.withinStandardDeviation)}
                      </strong>
                    </div>
                    <div className="stat-cell">
                      <span>I-LCL / UCL</span>
                      <strong>
                        {formatValue(session.imrControlChart.individuals.lowerControlLimit)} /{' '}
                        {formatValue(session.imrControlChart.individuals.upperControlLimit)}
                      </strong>
                    </div>
                    <div className="stat-cell">
                      <span>MR-UCL</span>
                      <strong>
                        {formatValue(session.imrControlChart.movingRange.upperControlLimit)}
                      </strong>
                    </div>
                    <div className="stat-cell">
                      <span>{language === 'sv' ? 'Regelsignaler' : 'Rule signals'}</span>
                      <strong>{session.imrControlChart.signals.length}</strong>
                    </div>
                  </div>
                  <ImrControlCharts
                    result={session.imrControlChart}
                    language={language}
                    theme={theme}
                  />
                  {session.imrControlChart.signals.length > 0 ? (
                    <ul
                      className="imr-signal-list"
                      aria-label={language === 'sv' ? 'Regelsignaler' : 'Rule signals'}
                    >
                      {session.imrControlChart.signals.map((signal) => (
                        <li key={`${signal.chart}-${signal.rule}-${signal.observations[0]}`}>
                          <strong>{signal.chart}</strong>{' '}
                          {signal.rule === 'beyond-limit'
                            ? language === 'sv'
                              ? 'utanför styrgräns'
                              : 'beyond control limit'
                            : language === 'sv'
                              ? 'åtta i rad på samma sida'
                              : 'eight consecutive on one side'}
                          : {signal.observations.join(', ')}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="session-caption">
                      {language === 'sv'
                        ? 'Inga signaler enligt dessa regler. Det bevisar inte att processen är stabil.'
                        : 'No signals under these rules. This does not prove process stability.'}
                    </p>
                  )}
                  <p className="session-caption">
                    {language === 'sv'
                      ? 'Individgränser: medelvärde ± 3 × MR̄/1,128. MR-gräns: 3,267 × MR̄. Åtta-på-en-sida är en Western Electric/Nelson-liknande regel; inga andra regler har kontrollerats.'
                      : 'Individuals limits: mean ± 3 × MR̄/1.128. MR limit: 3.267 × MR̄. Eight-on-one-side is a Western Electric/Nelson-style rule; other rules were not checked.'}
                  </p>
                </section>
              )}
              {session.timeSeries && (
                <section
                  className="t-test-result"
                  aria-label={
                    language === 'sv' ? 'Tidsserieanalysresultat' : 'Time-series analysis result'
                  }
                >
                  <h4>{session.title}</h4>
                  <div className="stat-grid t-test-grid">
                    <div className="stat-cell">
                      <span>n</span>
                      <strong>{session.timeSeries.count}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>{language === 'sv' ? 'Saknade' : 'Omitted'}</span>
                      <strong>{session.timeSeries.omittedCount}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>{language === 'sv' ? 'Medel' : 'Mean'}</span>
                      <strong>{formatValue(session.timeSeries.mean)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>s</span>
                      <strong>{formatValue(session.timeSeries.standardDeviation)}</strong>
                    </div>
                    {session.timeSeries.rSquared !== null && (
                      <div className="stat-cell">
                        <span>R²</span>
                        <strong>{formatValue(session.timeSeries.rSquared)}</strong>
                      </div>
                    )}
                    {session.timeSeries.rootMeanSquareError !== null && (
                      <div className="stat-cell">
                        <span>RMSE</span>
                        <strong>{formatValue(session.timeSeries.rootMeanSquareError)}</strong>
                      </div>
                    )}
                  </div>
                  {session.timeSeries.trendCoefficients && (
                    <div className="contingency-scroll">
                      <table className="contingency-table">
                        <thead>
                          <tr>
                            <th scope="col">{language === 'sv' ? 'Trendterm' : 'Trend term'}</th>
                            <th scope="col">{language === 'sv' ? 'Skattning' : 'Estimate'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <th scope="row">{language === 'sv' ? 'Intercept' : 'Intercept'}</th>
                            <td>{formatValue(session.timeSeries.trendCoefficients.intercept)}</td>
                          </tr>
                          <tr>
                            <th scope="row">{language === 'sv' ? 'Lutning' : 'Slope'}</th>
                            <td>{formatValue(session.timeSeries.trendCoefficients.slope)}</td>
                          </tr>
                          {session.timeSeries.trendCoefficients.quadratic !== null && (
                            <tr>
                              <th scope="row">
                                {language === 'sv' ? 'Kvadratisk term' : 'Quadratic term'}
                              </th>
                              <td>{formatValue(session.timeSeries.trendCoefficients.quadratic)}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {session.timeSeries.forecasts.length > 0 && (
                    <>
                      <h4>{language === 'sv' ? 'Prognoser' : 'Forecasts'}</h4>
                      <div className="contingency-scroll">
                        <table className="contingency-table">
                          <thead>
                            <tr>
                              <th scope="col">
                                {language === 'sv' ? 'Observation' : 'Observation'}
                              </th>
                              <th scope="col">{language === 'sv' ? 'Prognos' : 'Forecast'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {session.timeSeries.forecasts.map((forecast) => (
                              <tr key={forecast.observation}>
                                <th scope="row">{forecast.observation}</th>
                                <td>{formatValue(forecast.value)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                  {session.timeSeries.lagCorrelations.length > 0 && (
                    <div className="contingency-scroll">
                      <table className="contingency-table">
                        <thead>
                          <tr>
                            <th scope="col">{language === 'sv' ? 'Lagg' : 'Lag'}</th>
                            <th scope="col">ACF</th>
                            <th scope="col">PACF</th>
                          </tr>
                        </thead>
                        <tbody>
                          {session.timeSeries.lagCorrelations.map((lag) => (
                            <tr key={lag.lag}>
                              <th scope="row">{lag.lag}</th>
                              <td>{formatValue(lag.acf)}</td>
                              <td>{lag.pacf === null ? '' : formatValue(lag.pacf)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <GraphPlot
                    graph={{
                      stableKey: session.timeSeries,
                      kind: session.timeSeries.method === 'acf' ? 'autocorrelation' : 'timeSeries',
                      title:
                        session.timeSeries.method === 'acf'
                          ? language === 'sv'
                            ? 'ACF / PACF'
                            : 'ACF / PACF'
                          : session.title,
                      xTitle:
                        session.timeSeries.method === 'acf'
                          ? language === 'sv'
                            ? 'Lagg'
                            : 'Lag'
                          : language === 'sv'
                            ? 'Observation'
                            : 'Observation',
                      yTitle:
                        session.timeSeries.method === 'acf'
                          ? 'Correlation'
                          : language === 'sv'
                            ? 'Mätvärde'
                            : 'Value',
                      sampleCount: session.timeSeries.count,
                      cumulativeAxis: false,
                      data:
                        session.timeSeries.method === 'acf'
                          ? [
                              {
                                type: 'scatter',
                                mode: 'lines+markers',
                                name: 'ACF',
                                x: session.timeSeries.lagCorrelations.map((lag) => lag.lag),
                                y: session.timeSeries.lagCorrelations.map((lag) => lag.acf),
                              },
                              {
                                type: 'scatter',
                                mode: 'lines+markers',
                                name: 'PACF',
                                x: session.timeSeries.lagCorrelations.flatMap((lag) =>
                                  lag.pacf === null ? [] : [lag.lag],
                                ),
                                y: session.timeSeries.lagCorrelations.flatMap((lag) =>
                                  lag.pacf === null ? [] : [lag.pacf],
                                ),
                              },
                            ]
                          : [
                              {
                                type: 'scatter',
                                mode: 'lines+markers',
                                name: language === 'sv' ? 'Observerat' : 'Observed',
                                x: session.timeSeries.points.map((point) => point.observation),
                                y: session.timeSeries.points.map((point) => point.value),
                              },
                              {
                                type: 'scatter',
                                mode: 'lines',
                                name: language === 'sv' ? 'Anpassat' : 'Fitted',
                                x: session.timeSeries.points.flatMap((point) =>
                                  point.fitted === null ? [] : [point.observation],
                                ),
                                y: session.timeSeries.points.flatMap((point) =>
                                  point.fitted === null ? [] : [point.fitted],
                                ),
                              },
                              {
                                type: 'scatter',
                                mode: 'lines+markers',
                                lineDash: 'dash',
                                name: language === 'sv' ? 'Prognos' : 'Forecast',
                                x: session.timeSeries.forecasts.map((point) => point.observation),
                                y: session.timeSeries.forecasts.map((point) => point.value),
                              },
                            ],
                    }}
                    language={language}
                    theme={theme}
                  />
                  <p className="session-caption">
                    {language === 'sv'
                      ? 'Tidsseriemodellerna är ej oberoende referensverifierade; prognosintervall, säsongsmodeller och periodiska komponenter återstår.'
                      : 'Time-series models are not independently reference-verified; prediction intervals, seasonal models, and periodic components remain outstanding.'}
                  </p>
                </section>
              )}
              {session.power && (
                <section
                  className="t-test-result"
                  aria-label={language === 'sv' ? 'Powerresultat' : 'Power result'}
                >
                  <h4>
                    {language === 'sv' ? 'Power och stickprovsstorlek' : 'Power and sample size'}
                  </h4>
                  <div className="stat-grid t-test-grid">
                    <div className="stat-cell">
                      <span>{language === 'sv' ? 'Test' : 'Test'}</span>
                      <strong>{powerTestLabel(session.power.test, language)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>
                        {powerUsesTwoGroups(session.power.test)
                          ? language === 'sv'
                            ? 'n / grupp'
                            : 'n / group'
                          : 'n'}
                      </span>
                      <strong>{session.power.sampleSizePerGroup}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>{language === 'sv' ? 'Totalt N' : 'Total N'}</span>
                      <strong>{session.power.totalSampleSize}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>{language === 'sv' ? 'Uppnådd power' : 'Achieved power'}</span>
                      <strong>{formatValue(session.power.achievedPower * 100)}%</strong>
                    </div>
                    {session.power.targetPower !== null && (
                      <div className="stat-cell">
                        <span>{language === 'sv' ? 'Mål-power' : 'Target power'}</span>
                        <strong>{formatValue(session.power.targetPower * 100)}%</strong>
                      </div>
                    )}
                    <div className="stat-cell">
                      <span>α</span>
                      <strong>{formatValue(session.power.alpha)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>{language === 'sv' ? 'Effekt' : 'Effect'}</span>
                      <strong>{formatValue(session.power.effect)}</strong>
                    </div>
                  </div>
                  <GraphPlot
                    graph={{
                      stableKey: session.power,
                      kind: 'powerCurve',
                      title: language === 'sv' ? 'Powerkurva' : 'Power curve',
                      xTitle:
                        language === 'sv' ? 'Stickprovsstorlek per grupp' : 'Sample size per group',
                      yTitle: 'Power',
                      sampleCount: session.power.curve.length,
                      cumulativeAxis: false,
                      data: [
                        {
                          type: 'scatter',
                          mode: 'lines',
                          name: language === 'sv' ? 'Uppnådd power' : 'Achieved power',
                          x: session.power.curve.map((point) => point.sampleSize),
                          y: session.power.curve.map((point) => point.power),
                        },
                      ],
                    }}
                    language={language}
                    theme={theme}
                  />
                  <p className="session-caption">
                    {language === 'sv'
                      ? 'Tvåsidig normalapproximation. Tvågruppsberäkningar antar lika stora grupper; t-testens icke-centrala t-fördelning och ANOVA-power återstår. Resultatet är inte oberoende referensverifierat.'
                      : 'Two-sided normal approximation. Two-group calculations assume equal group sizes; noncentral-t power and ANOVA power remain outstanding. Results are not independently reference-verified.'}
                  </p>
                </section>
              )}
              {session.survival && (
                <section
                  className="t-test-result"
                  aria-label={language === 'sv' ? 'Överlevnadsresultat' : 'Survival result'}
                >
                  <div className="regression-diagnostics-heading">
                    <h4>{language === 'sv' ? 'Kaplan–Meier-analys' : 'Kaplan-Meier analysis'}</h4>
                    <button
                      className="toolbar-button"
                      type="button"
                      onClick={exportSurvivalEstimates}
                    >
                      <Download size={14} />
                      {language === 'sv' ? 'Exportera alla' : 'Export all'}
                    </button>
                  </div>
                  <div className="stat-grid t-test-grid">
                    <div className="stat-cell">
                      <span>{language === 'sv' ? 'Kompletta rader' : 'Complete rows'}</span>
                      <strong>{session.survival.count}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>{language === 'sv' ? 'Händelser' : 'Events'}</span>
                      <strong>{session.survival.eventCount}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>{language === 'sv' ? 'Censurerade' : 'Censored'}</span>
                      <strong>{session.survival.censoredCount}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>{language === 'sv' ? 'Uteslutna rader' : 'Rows excluded'}</span>
                      <strong>{session.survival.droppedCount}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>{language === 'sv' ? 'Grupper' : 'Groups'}</span>
                      <strong>{session.survival.curves.length}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>α</span>
                      <strong>{formatValue(session.survival.alpha)}</strong>
                    </div>
                  </div>
                  <div className="contingency-scroll">
                    <table className="contingency-table">
                      <thead>
                        <tr>
                          <th scope="col">{language === 'sv' ? 'Grupp' : 'Group'}</th>
                          <th scope="col">n</th>
                          <th scope="col">{language === 'sv' ? 'Händelser' : 'Events'}</th>
                          <th scope="col">{language === 'sv' ? 'Censurerade' : 'Censored'}</th>
                          <th scope="col">{language === 'sv' ? 'Median' : 'Median'}</th>
                          <th scope="col">{language === 'sv' ? 'Median-KI' : 'Median CI'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {session.survival.curves.map((curve) => (
                          <tr key={curve.group}>
                            <th scope="row">{curve.group}</th>
                            <td>{curve.count}</td>
                            <td>{curve.eventCount}</td>
                            <td>{curve.censoredCount}</td>
                            <td>
                              {curve.median === null
                                ? language === 'sv'
                                  ? 'Ej uppnådd'
                                  : 'Not reached'
                                : formatValue(curve.median)}
                            </td>
                            <td>
                              {curve.medianConfidenceInterval[0] === null
                                ? '–'
                                : formatValue(curve.medianConfidenceInterval[0])}
                              {language === 'sv' ? ' till ' : ' to '}
                              {curve.medianConfidenceInterval[1] === null
                                ? '–'
                                : formatValue(curve.medianConfidenceInterval[1])}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <h4>
                    {language === 'sv'
                      ? 'Riskmängd och överlevnadsskattningar'
                      : 'At-risk counts and survival estimates'}
                  </h4>
                  <div className="contingency-scroll survival-risk-scroll">
                    <table className="contingency-table">
                      <thead>
                        <tr>
                          <th scope="col">{language === 'sv' ? 'Grupp' : 'Group'}</th>
                          <th scope="col">{language === 'sv' ? 'Tid' : 'Time'}</th>
                          <th scope="col">{language === 'sv' ? 'I risk' : 'At risk'}</th>
                          <th scope="col">{language === 'sv' ? 'Händelser' : 'Events'}</th>
                          <th scope="col">{language === 'sv' ? 'Censurerade' : 'Censored'}</th>
                          <th scope="col">S(t)</th>
                          <th scope="col">{language === 'sv' ? 'KI nedre' : 'CI lower'}</th>
                          <th scope="col">{language === 'sv' ? 'KI övre' : 'CI upper'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {session.survival.curves
                          .flatMap((curve) => curve.points.map((point) => ({ curve, point })))
                          .slice(0, 100)
                          .map(({ curve, point }, index) => (
                            <tr key={`${curve.group}-${index}`}>
                              <th scope="row">{curve.group}</th>
                              <td>{formatValue(point.time)}</td>
                              <td>{point.atRisk}</td>
                              <td>{point.events}</td>
                              <td>{point.censored}</td>
                              <td>{formatValue(point.survival)}</td>
                              <td>{formatValue(point.lowerConfidenceLimit)}</td>
                              <td>{formatValue(point.upperConfidenceLimit)}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  {session.parametricSurvival && (
                    <>
                      <h4>
                        {language === 'sv'
                          ? 'Parametriska livslängdsmodeller'
                          : 'Parametric lifetime models'}
                      </h4>
                      {session.parametricSurvival.groups.map((group) => {
                        const bestAic =
                          group.fits.length > 0
                            ? Math.min(...group.fits.map((fit) => fit.aic))
                            : null
                        return (
                          <div key={group.group}>
                            <h5>{group.group}</h5>
                            {group.fits.length > 0 ? (
                              <div className="contingency-scroll">
                                <table className="contingency-table">
                                  <thead>
                                    <tr>
                                      <th scope="col">
                                        {language === 'sv' ? 'Fördelning' : 'Distribution'}
                                      </th>
                                      <th scope="col">{language === 'sv' ? 'Form' : 'Shape'}</th>
                                      <th scope="col">{language === 'sv' ? 'Skala' : 'Scale'}</th>
                                      <th scope="col">{language === 'sv' ? 'Median' : 'Median'}</th>
                                      <th scope="col">
                                        {language === 'sv' ? 'Log-likelihood' : 'Log-likelihood'}
                                      </th>
                                      <th scope="col">AIC</th>
                                      <th scope="col">BIC</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {group.fits.map((fit) => (
                                      <tr key={fit.distribution}>
                                        <th scope="row">
                                          {fit.distribution === 'weibull'
                                            ? 'Weibull'
                                            : 'Exponential'}
                                          {fit.aic === bestAic && (
                                            <small>
                                              {language === 'sv' ? ' · lägst AIC' : ' · best AIC'}
                                            </small>
                                          )}
                                        </th>
                                        <td>{fit.shape === null ? '—' : formatValue(fit.shape)}</td>
                                        <td>{formatValue(fit.scale)}</td>
                                        <td>{formatValue(fit.median)}</td>
                                        <td>{formatValue(fit.logLikelihood)}</td>
                                        <td>{formatValue(fit.aic)}</td>
                                        <td>{formatValue(fit.bic)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="session-caption">{group.unavailableReason}</p>
                            )}
                          </div>
                        )
                      })}
                    </>
                  )}
                  {session.survival.logRank && (
                    <div className="stat-grid t-test-grid">
                      <div className="stat-cell">
                        <span>χ² (1)</span>
                        <strong>{formatValue(session.survival.logRank.chiSquare)}</strong>
                      </div>
                      <div className="stat-cell">
                        <span>{language === 'sv' ? 'Log-rank p' : 'Log-rank p'}</span>
                        <strong>{formatPValue(session.survival.logRank.pValue, language)}</strong>
                      </div>
                    </div>
                  )}
                  {session.survival.curves.length === 2 && !session.survival.logRank && (
                    <p className="session-caption">
                      {language === 'sv'
                        ? 'Log-rank kunde inte skattas eftersom det saknades informativ variation i riskmängderna.'
                        : 'The log-rank test was not estimable because the risk sets had no informative variation.'}
                    </p>
                  )}
                  <GraphPlot
                    graph={{
                      stableKey: session.survival,
                      kind: 'survival',
                      title:
                        language === 'sv' ? 'Kaplan–Meier-överlevnad' : 'Kaplan-Meier survival',
                      xTitle: language === 'sv' ? 'Tid' : 'Time',
                      yTitle: language === 'sv' ? 'Överlevnadssannolikhet' : 'Survival probability',
                      sampleCount: session.survival.count,
                      cumulativeAxis: false,
                      data: [
                        ...session.survival.curves.flatMap((curve, curveIndex) => {
                          const color = curveIndex === 0 ? '#2f7861' : '#e16d4c'
                          const censoredPoints = curve.points.filter((point) => point.censored > 0)
                          const time = curve.points.map((point) => point.time)
                          return [
                            {
                              type: 'scatter' as const,
                              mode: 'lines' as const,
                              lineShape: 'hv' as const,
                              name: `${curve.group} upper CI`,
                              x: time,
                              y: curve.points.map((point) => point.upperConfidenceLimit),
                              color,
                              showLegend: false,
                            },
                            {
                              type: 'scatter' as const,
                              mode: 'lines' as const,
                              lineShape: 'hv' as const,
                              name: `${curve.group} confidence interval`,
                              x: time,
                              y: curve.points.map((point) => point.lowerConfidenceLimit),
                              color,
                              fill: 'tonexty' as const,
                              fillColor:
                                curveIndex === 0
                                  ? 'rgba(47, 120, 97, 0.16)'
                                  : 'rgba(225, 109, 76, 0.16)',
                              showLegend: false,
                            },
                            {
                              type: 'scatter' as const,
                              mode: 'lines' as const,
                              lineShape: 'hv' as const,
                              name: curve.group,
                              x: time,
                              y: curve.points.map((point) => point.survival),
                              color,
                            },
                            {
                              type: 'scatter' as const,
                              mode: 'markers' as const,
                              name:
                                language === 'sv'
                                  ? `Censurerad · ${curve.group}`
                                  : `Censored · ${curve.group}`,
                              x: censoredPoints.map((point) => point.time),
                              y: censoredPoints.map((point) => point.survival),
                              color,
                              showLegend: false,
                            },
                          ]
                        }),
                        ...(session.parametricSurvival?.curves ?? []).map((curve) => {
                          const groupIndex = session.survival!.curves.findIndex(
                            (survivalCurve) => survivalCurve.group === curve.group,
                          )
                          return {
                            type: 'scatter' as const,
                            mode: 'lines' as const,
                            lineDash: 'dash' as const,
                            name: `${curve.group} ${curve.distribution === 'weibull' ? 'Weibull' : 'Exponential'}`,
                            x: curve.times,
                            y: curve.survival,
                            color: groupIndex === 0 ? '#2f7861' : '#e16d4c',
                          }
                        }),
                      ],
                    }}
                    language={language}
                    theme={theme}
                  />
                  <p className="session-caption">
                    {language === 'sv'
                      ? 'Produkt-limit-skattning med Greenwood log–log-konfidensband. Log-rank jämför högst två grupper. Oberoende referensverifiering återstår.'
                      : 'Product-limit estimate with Greenwood log-log confidence bands. Log-rank compares at most two groups. Independent reference validation remains outstanding.'}
                  </p>
                </section>
              )}
              {session.graph && (
                <GraphPlot graph={session.graph} language={language} theme={theme} />
              )}
              {session.subgroupControlChart && (
                <section
                  className="t-test-result"
                  aria-label={
                    language === 'sv'
                      ? 'Subgroupstyrdiagramresultat'
                      : 'Subgroup control chart result'
                  }
                >
                  <h4>
                    {session.subgroupControlChart.kind === 'xbar-r' ? 'Xbar-R' : 'Xbar-S'}{' '}
                    {language === 'sv' ? 'styrdiagram' : 'control chart'}
                  </h4>
                  <div className="stat-grid t-test-grid">
                    <div className="stat-cell">
                      <span>{language === 'sv' ? 'Subgrupper' : 'Subgroups'}</span>
                      <strong>{session.subgroupControlChart.subgroupCount}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>{language === 'sv' ? 'n / subgrupp' : 'n / subgroup'}</span>
                      <strong>{session.subgroupControlChart.subgroupSize}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>Xbar center</span>
                      <strong>{formatValue(session.subgroupControlChart.xbar.centerLine)}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>Xbar LCL / UCL</span>
                      <strong>
                        {formatValue(session.subgroupControlChart.xbar.lowerControlLimit)} /{' '}
                        {formatValue(session.subgroupControlChart.xbar.upperControlLimit)}
                      </strong>
                    </div>
                    <div className="stat-cell">
                      <span>
                        {session.subgroupControlChart.variabilityChart.toUpperCase()} center
                      </span>
                      <strong>
                        {formatValue(session.subgroupControlChart.variability.centerLine)}
                      </strong>
                    </div>
                    <div className="stat-cell">
                      <span>
                        {session.subgroupControlChart.variabilityChart.toUpperCase()} LCL / UCL
                      </span>
                      <strong>
                        {formatValue(session.subgroupControlChart.variability.lowerControlLimit)} /{' '}
                        {formatValue(session.subgroupControlChart.variability.upperControlLimit)}
                      </strong>
                    </div>
                    <div className="stat-cell">
                      <span>{language === 'sv' ? 'Signaler' : 'Signals'}</span>
                      <strong>{session.subgroupControlChart.signals.length}</strong>
                    </div>
                  </div>
                  <SubgroupControlCharts
                    result={session.subgroupControlChart}
                    language={language}
                    theme={theme}
                  />
                  {session.subgroupControlChart.signals.length > 0 && (
                    <ul
                      className="imr-signal-list"
                      aria-label={language === 'sv' ? 'Styrsignaler' : 'Control signals'}
                    >
                      {session.subgroupControlChart.signals.map((signal) => (
                        <li key={`${signal.chart}-${signal.index}`}>
                          <strong>{signal.chart.toUpperCase()}</strong>{' '}
                          {language === 'sv'
                            ? 'utanför styrgräns i subgrupp'
                            : 'beyond control limit in subgroup'}{' '}
                          {signal.subgroup} ({formatValue(signal.value)})
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="session-caption">
                    {language === 'sv'
                      ? 'Standardgränser för balanserade subgrupper, storlek 2–10. Normalitet, oberoende och tidsstabilitet kontrolleras inte.'
                      : 'Standard limits for balanced subgroups, size 2–10. Normality, independence, and time stability are not checked.'}
                  </p>
                </section>
              )}
              {session.gageRr && (
                <section
                  className="t-test-result"
                  aria-label={language === 'sv' ? 'Gage R&R-resultat' : 'Gage R&R result'}
                >
                  <h4>Gage R&amp;R (crossed ANOVA)</h4>
                  <div className="stat-grid t-test-grid">
                    <div className="stat-cell">
                      <span>{language === 'sv' ? 'Delar' : 'Parts'}</span>
                      <strong>{session.gageRr.partCount}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>{language === 'sv' ? 'Operatörer' : 'Operators'}</span>
                      <strong>{session.gageRr.operatorCount}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>{language === 'sv' ? 'Replikat/cell' : 'Replicates/cell'}</span>
                      <strong>{session.gageRr.replicatesPerCell}</strong>
                    </div>
                    <div className="stat-cell">
                      <span>
                        {language === 'sv'
                          ? '% Gage R&R study variation'
                          : '% Gage R&R study variation'}
                      </span>
                      <strong>{formatValue(session.gageRr.percentStudyVariation.gageRr)}%</strong>
                    </div>
                    <div className="stat-cell">
                      <span>
                        {language === 'sv' ? '% Gage R&R bidrag' : '% Gage R&R contribution'}
                      </span>
                      <strong>{formatValue(session.gageRr.percentContribution.gageRr)}%</strong>
                    </div>
                    <div className="stat-cell">
                      <span>ndc</span>
                      <strong>
                        {session.gageRr.numberOfDistinctCategories === Number.POSITIVE_INFINITY
                          ? '∞'
                          : session.gageRr.numberOfDistinctCategories}
                      </strong>
                    </div>
                    {session.gageRr.percentTolerance !== null && (
                      <div className="stat-cell">
                        <span>% tolerance</span>
                        <strong>{formatValue(session.gageRr.percentTolerance)}%</strong>
                      </div>
                    )}
                  </div>
                  <h5 className="quality-table-title">
                    {isSwedish ? 'ANOVA-tabell' : 'ANOVA table'}
                  </h5>
                  <div className="quality-table-wrap">
                    <table className="quality-table gage-table">
                      <thead>
                        <tr>
                          <th>{isSwedish ? 'Källa' : 'Source'}</th>
                          <th>DF</th>
                          <th>SS</th>
                          <th>MS</th>
                          <th>F</th>
                          <th>p</th>
                        </tr>
                      </thead>
                      <tbody>
                        {session.gageRr.anova.map((row) => (
                          <tr key={row.source}>
                            <th scope="row">{gageAnovaLabel(row.source, isSwedish)}</th>
                            <td>{row.degreesOfFreedom}</td>
                            <td>{formatValue(row.sumSquares)}</td>
                            <td>{formatValue(row.meanSquare)}</td>
                            <td>{row.fStatistic === null ? '—' : formatValue(row.fStatistic)}</td>
                            <td>
                              {row.pValue === null ? '—' : formatPValue(row.pValue, language)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <h5 className="quality-table-title">
                    {isSwedish ? 'Varianskomponenter' : 'Variance components'}
                  </h5>
                  <div className="quality-table-wrap">
                    <table className="quality-table gage-table">
                      <thead>
                        <tr>
                          <th>{isSwedish ? 'Komponent' : 'Component'}</th>
                          <th>{isSwedish ? 'Varians' : 'Variance'}</th>
                          <th>% contribution</th>
                          <th>% study variation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(
                          [
                            [
                              'repeatability',
                              session.gageRr.varianceComponents.repeatability,
                              session.gageRr.percentContribution.repeatability,
                              session.gageRr.percentStudyVariation.repeatability,
                            ],
                            [
                              'reproducibility',
                              session.gageRr.varianceComponents.reproducibility,
                              session.gageRr.percentContribution.reproducibility,
                              session.gageRr.percentStudyVariation.reproducibility,
                            ],
                            [
                              'gageRr',
                              session.gageRr.varianceComponents.gageRr,
                              session.gageRr.percentContribution.gageRr,
                              session.gageRr.percentStudyVariation.gageRr,
                            ],
                            [
                              'partToPart',
                              session.gageRr.varianceComponents.partToPart,
                              session.gageRr.percentContribution.partToPart,
                              session.gageRr.percentStudyVariation.partToPart,
                            ],
                            ['total', session.gageRr.varianceComponents.total, 100, 100],
                          ] as const
                        ).map(([component, variance, contribution, studyVariation]) => (
                          <tr key={component}>
                            <th scope="row">{gageComponentLabel(component, isSwedish)}</th>
                            <td>{formatValue(variance)}</td>
                            <td>{formatValue(contribution)}%</td>
                            <td>{formatValue(studyVariation)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="session-caption">
                    {isSwedish
                      ? 'Crossed, balanserad slumpmodell med interaktion kvar i modellen; negativa skattade varianskomponenter sätts till 0. Normalitet, oberoende och stabilitet har inte testats. Tolkningströsklar är vägledande och kontextberoende.'
                      : 'Crossed, balanced random-effects model with interaction retained; negative variance component estimates are set to 0. Normality, independence, and stability were not tested. Interpretation thresholds are guidance and context-dependent.'}
                  </p>
                </section>
              )}
              {session.summary && (
                <>
                  <p className="session-caption">
                    {language === 'sv'
                      ? 'Stickprovsstandardavvikelse med Welford. Kvartiler med R-7-interpolation. Saknade värden uteslöts.'
                      : 'Sample standard deviation uses Welford. Quartiles use R-7 interpolation. Missing values were omitted.'}
                  </p>
                  <p className="session-caption">
                    {language === 'sv'
                      ? 'Den deskriptiva sammanfattningen visas som stöd till analysresultatet.'
                      : 'The descriptive summary is shown as supporting context for the analysis result.'}
                  </p>
                </>
              )}
            </article>
          ) : (
            <div className="session-entry">
              <p className="session-message">
                Kör en analys för att lägga till resultat här. Varje resultat behåller sina
                inställningar och går att kopiera.
              </p>
            </div>
          )}
          <div className="session-actions">
            <button
              className="session-action"
              type="button"
              onClick={() => void copySession()}
              disabled={!session}
            >
              <Clipboard size={13} />
              Kopiera
            </button>
            <button
              className="session-action"
              type="button"
              onClick={() =>
                session &&
                downloadFile(
                  `${session.title} · ${session.columnName}\n${JSON.stringify(session.summary, null, 2)}\nEj verifierad analys.`,
                  'statlab-session.txt',
                  'text/plain',
                )
              }
              disabled={!session}
            >
              <Download size={13} />
              Exportera
            </button>
          </div>
        </aside>
      </div>

      <footer className="statusbar">
        <span className="status-item">
          <Check size={11} />
          {savedAt ? 'Sparad lokalt' : 'Autospar aktivt'}
        </span>
        <span className="status-spacer" />
        <span className="status-message">
          {activeColumn ? `${activeColumn.id} · ${activeColumn.name}` : 'Cell'} {activeCell.row + 1}
        </span>
        <span>{language === 'sv' ? 'Redo' : 'Ready'}</span>
      </footer>

      <input
        ref={fileInputRef}
        className="hidden-input"
        type="file"
        accept=".csv,.tsv,.xlsx,.xls,text/csv"
        onChange={(event) => {
          void handleDataFile(event.target.files?.[0])
          event.target.value = ''
        }}
      />
      <input
        ref={projectInputRef}
        className="hidden-input"
        type="file"
        accept=".statlab,.json,application/json"
        onChange={(event) => {
          void openProject(event.target.files?.[0])
          event.target.value = ''
        }}
      />
      <Dialog.Root open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay command-palette-overlay" />
          <Dialog.Content
            className="command-palette"
            aria-describedby="command-palette-description"
          >
            <Dialog.Title className="sr-only">
              {language === 'sv' ? 'Sök kommando' : 'Search commands'}
            </Dialog.Title>
            <Dialog.Description id="command-palette-description" className="sr-only">
              {language === 'sv'
                ? 'Sök bland analyser, verktyg och arbetsboksåtgärder.'
                : 'Search analyses, tools, and worksheet actions.'}
            </Dialog.Description>
            <label className="command-palette-search">
              <Search size={18} aria-hidden="true" />
              <input
                autoFocus
                type="search"
                value={commandQuery}
                onChange={(event) => setCommandQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowDown') {
                    event.preventDefault()
                    setCommandIndex((index) => Math.min(index + 1, filteredCommands.length - 1))
                  } else if (event.key === 'ArrowUp') {
                    event.preventDefault()
                    setCommandIndex((index) => Math.max(index - 1, 0))
                  } else if (event.key === 'Enter') {
                    const command = filteredCommands[commandIndex]
                    if (command && !command.disabled) {
                      event.preventDefault()
                      runCommand(command.action)
                    }
                  }
                }}
                placeholder={
                  language === 'sv'
                    ? 'Sök analys, verktyg eller åtgärd…'
                    : 'Search analyses, tools, or actions…'
                }
                aria-label={language === 'sv' ? 'Sök kommandon' : 'Search commands'}
              />
              <kbd>ESC</kbd>
            </label>
            <div
              className="command-palette-results"
              role="listbox"
              aria-label={language === 'sv' ? 'Kommandon' : 'Commands'}
            >
              {filteredCommands.map((command, index) => (
                <button
                  type="button"
                  role="option"
                  aria-selected={index === commandIndex}
                  key={`${command.group}:${command.action}`}
                  disabled={command.disabled}
                  onMouseEnter={() => setCommandIndex(index)}
                  onClick={() => runCommand(command.action)}
                >
                  <span>{command.label}</span>
                  <small>{command.group}</small>
                </button>
              ))}
              {filteredCommands.length === 0 && (
                <p className="command-palette-empty">
                  {language === 'sv'
                    ? 'Inga kommandon matchar sökningen.'
                    : 'No commands match your search.'}
                </p>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Fragment key={analysisDialogKey}>
        <OneSampleTDialog
          open={oneSampleTDialogOpen}
          initialColumn={targetColumn}
          columns={numericColumns}
          language={language}
          onOpenChange={setOneSampleTDialogOpen}
          onSubmit={(columnId, hypothesizedMean, alpha) => {
            void runOneSampleTAnalysis(columnId, hypothesizedMean, alpha)
          }}
        />
        <OneSampleZDialog
          open={oneSampleZDialogOpen}
          initialColumn={targetColumn}
          columns={numericColumns}
          language={language}
          onOpenChange={setOneSampleZDialogOpen}
          onSubmit={(columnId, mean, standardDeviation, alpha) => {
            void runOneSampleZAnalysis(columnId, mean, standardDeviation, alpha)
          }}
        />
        <TwoSampleZDialog
          open={twoSampleZDialogOpen}
          initialColumn1={numericColumns[0]?.id ?? ''}
          initialColumn2={numericColumns[1]?.id ?? numericColumns[0]?.id ?? ''}
          columns={numericColumns}
          language={language}
          onOpenChange={setTwoSampleZDialogOpen}
          onSubmit={(columnId1, columnId2, sigma1, sigma2, difference, alpha) => {
            void runTwoSampleZAnalysis(columnId1, columnId2, sigma1, sigma2, difference, alpha)
          }}
        />
        <TwoSampleTDialog
          open={twoSampleTDialogOpen}
          initialColumn1={numericColumns[0]?.id ?? ''}
          initialColumn2={numericColumns[1]?.id ?? numericColumns[0]?.id ?? ''}
          columns={numericColumns}
          language={language}
          onOpenChange={setTwoSampleTDialogOpen}
          onSubmit={(columnId1, columnId2, difference, alpha) => {
            void runTwoSampleTAnalysis(columnId1, columnId2, difference, alpha)
          }}
        />
        <PairedTDialog
          open={pairedTDialogOpen}
          initialColumn1={numericColumns[0]?.id ?? ''}
          initialColumn2={numericColumns[1]?.id ?? numericColumns[0]?.id ?? ''}
          columns={numericColumns}
          language={language}
          onOpenChange={setPairedTDialogOpen}
          onSubmit={(columnId1, columnId2, difference, alpha) => {
            void runPairedTAnalysis(columnId1, columnId2, difference, alpha)
          }}
        />
        <OneProportionDialog
          open={oneProportionDialogOpen}
          initialColumn={targetColumn}
          columns={numericColumns}
          language={language}
          onOpenChange={setOneProportionDialogOpen}
          onSubmit={(columnId, hypothesizedProportion, alpha) => {
            void runOneProportionAnalysis(columnId, hypothesizedProportion, alpha)
          }}
        />
        <TwoProportionsDialog
          open={twoProportionsDialogOpen}
          initialColumn1={numericColumns[0]?.id ?? ''}
          initialColumn2={numericColumns[1]?.id ?? numericColumns[0]?.id ?? ''}
          columns={numericColumns}
          language={language}
          onOpenChange={setTwoProportionsDialogOpen}
          onSubmit={(columnId1, columnId2, alpha) => {
            void runTwoProportionsAnalysis(columnId1, columnId2, alpha)
          }}
        />
        <CorrelationDialog
          open={correlationDialogOpen}
          initialColumn1={numericColumns[0]?.id ?? ''}
          initialColumn2={numericColumns[1]?.id ?? numericColumns[0]?.id ?? ''}
          columns={numericColumns}
          language={language}
          onOpenChange={setCorrelationDialogOpen}
          onSubmit={(columnId1, columnId2, alpha) => {
            void runCorrelationAnalysis(columnId1, columnId2, alpha)
          }}
        />
        <NormalKSDialog
          open={normalKSDialogOpen}
          initialColumn={targetColumn}
          columns={numericColumns}
          language={language}
          onOpenChange={setNormalKSDialogOpen}
          onSubmit={(columnId, mean, standardDeviation) => {
            void runNormalKSAnalysis(columnId, mean, standardDeviation)
          }}
        />
        <AndersonDarlingDialog
          open={normalADDialogOpen}
          initialColumn={targetColumn}
          columns={numericColumns}
          language={language}
          onOpenChange={setNormalADDialogOpen}
          onSubmit={(columnId, alpha) => {
            void runNormalADAnalysis(columnId, alpha)
          }}
        />
        <PoissonGoodnessOfFitDialog
          open={poissonGoodnessOfFitDialogOpen}
          initialColumn={targetColumn}
          columns={numericColumns}
          language={language}
          onOpenChange={setPoissonGoodnessOfFitDialogOpen}
          onSubmit={(columnId, alpha, specifiedRate) => {
            void runPoissonGoodnessOfFitAnalysis(columnId, alpha, specifiedRate)
          }}
        />
        <ChiSquareDialog
          open={chiSquareDialogOpen}
          initialColumn1={columns[0]?.id ?? ''}
          initialColumn2={columns[1]?.id ?? columns[0]?.id ?? ''}
          columns={columns}
          language={language}
          onOpenChange={setChiSquareDialogOpen}
          onSubmit={(columnId1, columnId2, alpha) => {
            void runChiSquareAnalysis(columnId1, columnId2, alpha)
          }}
        />
        <FisherExactDialog
          open={fisherExactDialogOpen}
          initialColumn1={columns[0]?.id ?? ''}
          initialColumn2={columns[1]?.id ?? columns[0]?.id ?? ''}
          columns={columns}
          language={language}
          onOpenChange={setFisherExactDialogOpen}
          onSubmit={(columnId1, columnId2) => {
            void runFisherExact(columnId1, columnId2)
          }}
        />
        <ProcessCapabilityDialog
          open={processCapabilityDialogOpen}
          initialColumn={targetColumn}
          columns={numericColumns}
          language={language}
          onOpenChange={setProcessCapabilityDialogOpen}
          onSubmit={(columnId, lowerSpecLimit, upperSpecLimit, target) => {
            void runProcessCapability(columnId, lowerSpecLimit, upperSpecLimit, target)
          }}
        />
        <ImrControlChartDialog
          open={imrControlChartDialogOpen}
          initialColumn={targetColumn}
          columns={numericColumns}
          language={language}
          onOpenChange={setImrControlChartDialogOpen}
          onSubmit={(columnId) => {
            void runImrControlChartAnalysis(columnId)
          }}
        />
        <GraphDialog
          open={graphDialogOpen}
          initialColumn={targetColumn}
          numericColumns={numericColumns}
          categoryColumns={categoryColumns}
          language={language}
          onOpenChange={setGraphDialogOpen}
          onSubmit={(selection) => {
            void runGraphAnalysis(selection)
          }}
        />
        <QualityStudioDialog
          open={qualityStudioOpen}
          language={language}
          onOpenChange={setQualityStudioOpen}
        />
        <GageRrDialog
          open={gageRrDialogOpen}
          initialPartColumn={categoryColumns[0]?.id ?? ''}
          initialOperatorColumn={categoryColumns[1]?.id ?? categoryColumns[0]?.id ?? ''}
          numericColumns={numericColumns}
          categoryColumns={categoryColumns}
          language={language}
          onOpenChange={setGageRrDialogOpen}
          onSubmit={(partColumnId, operatorColumnId, measurementColumnId, tolerance) => {
            void runGageRrAnalysis(partColumnId, operatorColumnId, measurementColumnId, tolerance)
          }}
        />
        <SubgroupControlChartDialog
          open={subgroupControlChartDialogOpen}
          initialGroupColumn={categoryColumns[0]?.id ?? ''}
          initialMeasurementColumn={numericColumns[0]?.id ?? ''}
          categoryColumns={categoryColumns}
          numericColumns={numericColumns}
          language={language}
          onOpenChange={setSubgroupControlChartDialogOpen}
          onSubmit={(kind, groupColumnId, measurementColumnId) => {
            void runSubgroupControlChartAnalysis(kind, groupColumnId, measurementColumnId)
          }}
        />
        <ChiSquareGoodnessOfFitDialog
          open={chiSquareGoodnessOfFitDialogOpen}
          initialColumn={categoryColumns[0]?.id ?? columns[0]?.id ?? ''}
          columns={columns}
          rows={rows}
          language={language}
          onOpenChange={setChiSquareGoodnessOfFitDialogOpen}
          onSubmit={(columnId, alpha, probabilities) => {
            void runChiSquareGoodnessOfFit(columnId, alpha, probabilities)
          }}
        />
        <CompareVariancesDialog
          open={varianceDialogOpen}
          initialColumn1={numericColumns[0]?.id ?? ''}
          initialColumn2={numericColumns[1]?.id ?? numericColumns[0]?.id ?? ''}
          columns={numericColumns}
          language={language}
          onOpenChange={setVarianceDialogOpen}
          onSubmit={(columnId1, columnId2, alpha) => {
            void runVarianceComparison(columnId1, columnId2, alpha)
          }}
        />
        <OneWayAnovaDialog
          open={oneWayAnovaDialogOpen}
          initialMeasurementColumn={numericColumns[0]?.id ?? ''}
          initialGroupColumn={
            categoryColumns[0]?.id ?? columns.find((column) => column.type !== 'numeric')?.id ?? ''
          }
          numericColumns={numericColumns}
          categoryColumns={columns.filter((column) => column.type !== 'numeric')}
          language={language}
          onOpenChange={setOneWayAnovaDialogOpen}
          onSubmit={(measurementColumnId, groupColumnId, alpha) => {
            void runOneWayAnova(measurementColumnId, groupColumnId, alpha)
          }}
        />
        <TwoWayAnovaDialog
          open={twoWayAnovaDialogOpen}
          numericColumns={numericColumns}
          factorColumns={categoryColumns}
          initialResponseColumn={numericColumns[0]?.id ?? ''}
          initialFactor1Column={categoryColumns[0]?.id ?? ''}
          initialFactor2Column={categoryColumns[1]?.id ?? categoryColumns[0]?.id ?? ''}
          language={language}
          onOpenChange={setTwoWayAnovaDialogOpen}
          onSubmit={(responseColumnId, factor1ColumnId, factor2ColumnId, alpha) => {
            void runTwoWayAnova(responseColumnId, factor1ColumnId, factor2ColumnId, alpha)
          }}
        />
        <LinearRegressionDialog
          open={linearRegressionDialogOpen}
          numericColumns={numericColumns}
          categoricalColumns={columns.filter((column) => column.type === 'text')}
          initialResponseColumn={numericColumns[0]?.id ?? ''}
          initialPredictorIds={numericColumns.slice(1, 4).map((column) => column.id)}
          language={language}
          onOpenChange={setLinearRegressionDialogOpen}
          onSubmit={(responseColumnId, predictorColumnIds, alpha, modelOptions) => {
            void runLinearRegression(responseColumnId, predictorColumnIds, alpha, modelOptions)
          }}
        />
        <SurvivalDialog
          open={survivalDialogOpen}
          numericColumns={numericColumns}
          categoryColumns={columns.filter((column) => column.type === 'text')}
          initialTimeColumn={numericColumns[0]?.id ?? ''}
          initialStatusColumn={numericColumns[1]?.id ?? ''}
          initialGroupColumn={columns.find((column) => column.type === 'text')?.id ?? ''}
          language={language}
          onOpenChange={setSurvivalDialogOpen}
          onSubmit={(timeColumnId, statusColumnId, groupColumnId, alpha) => {
            void runSurvivalAnalysis(timeColumnId, statusColumnId, groupColumnId, alpha)
          }}
        />
        <TimeSeriesDialog
          open={timeSeriesDialogOpen}
          columns={numericColumns}
          initialColumn={numericColumns[0]?.id ?? ''}
          language={language}
          onOpenChange={setTimeSeriesDialogOpen}
          onSubmit={(columnId, options) => void runTimeSeriesAnalysis(columnId, options)}
        />
        <PowerDialog
          open={powerDialogOpen}
          language={language}
          onOpenChange={setPowerDialogOpen}
          onSubmit={(request) => void runPowerAnalysis(request)}
        />
        <FlowchartEditor
          open={flowchartEditorOpen}
          language={language}
          onOpenChange={setFlowchartEditorOpen}
        />
        <TwoLevelFactorialDialog
          open={twoLevelFactorialDialogOpen}
          columns={columns}
          language={language}
          onOpenChange={setTwoLevelFactorialDialogOpen}
          onSubmit={(request) => void runTwoLevelFactorial(request)}
        />
        <NonparametricDialog
          open={nonparametricDialogOpen}
          numericColumns={numericColumns}
          groupColumns={categoryColumns}
          initialColumn1={numericColumns[0]?.id ?? ''}
          initialColumn2={numericColumns[1]?.id ?? numericColumns[0]?.id ?? ''}
          initialGroupColumn={categoryColumns[0]?.id ?? ''}
          language={language}
          onOpenChange={setNonparametricDialogOpen}
          onSubmit={(request) => void runNonparametricAnalysis(request)}
        />
        <ResamplingDialog
          open={resamplingDialogOpen}
          columns={numericColumns}
          initialColumn1={numericColumns[0]?.id ?? ''}
          initialColumn2={numericColumns[1]?.id ?? numericColumns[0]?.id ?? ''}
          language={language}
          onOpenChange={setResamplingDialogOpen}
          onSubmit={(request) => void runResamplingAnalysis(request)}
        />
        <OneSamplePoissonRateDialog
          open={oneSamplePoissonDialogOpen}
          initialColumn={targetColumn}
          columns={numericColumns}
          language={language}
          onOpenChange={setOneSamplePoissonDialogOpen}
          onSubmit={(columnId, exposurePerObservation, hypothesizedRate, alpha) => {
            void runOneSamplePoissonAnalysis(
              columnId,
              exposurePerObservation,
              hypothesizedRate,
              alpha,
            )
          }}
        />
        <TwoSamplePoissonRateDialog
          open={twoSamplePoissonDialogOpen}
          initialColumn1={numericColumns[0]?.id ?? ''}
          initialColumn2={numericColumns[1]?.id ?? numericColumns[0]?.id ?? ''}
          columns={numericColumns}
          language={language}
          onOpenChange={setTwoSamplePoissonDialogOpen}
          onSubmit={(columnId1, exposure1, columnId2, exposure2, alpha) => {
            void runTwoSamplePoissonAnalysis(columnId1, exposure1, columnId2, exposure2, alpha)
          }}
        />
        <DataOperationsDialog
          open={dataOperationsDialogOpen}
          columns={columns}
          rows={rows}
          worksheets={operationWorksheets}
          initialColumn={targetColumn}
          language={language}
          onOpenChange={setDataOperationsDialogOpen}
          onSubmit={applyDataOperation}
        />
        <ColumnFormulaDialog
          open={columnFormulaDialogOpen}
          columns={columns}
          rows={rows}
          language={language}
          onOpenChange={setColumnFormulaDialogOpen}
          onSubmit={addCalculatedColumn}
        />
      </Fragment>
      <Dialog.Root
        open={appDialog !== null}
        onOpenChange={(open) => {
          if (!open) setAppDialog(null)
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="dialog-content app-dialog">
            <Dialog.Title className="app-dialog-title">
              {appDialog === 'settings'
                ? language === 'sv'
                  ? 'Inställningar'
                  : 'Settings'
                : appDialog === 'about'
                  ? language === 'sv'
                    ? 'Om StatLab'
                    : 'About StatLab'
                  : language === 'sv'
                    ? 'Analysstatus'
                    : 'Analysis status'}
            </Dialog.Title>
            <Dialog.Description className="app-dialog-description">
              {appDialog === 'settings'
                ? language === 'sv'
                  ? 'Välj språk och utseende för arbetsytan.'
                  : 'Choose the workspace language and appearance.'
                : appDialog === 'about'
                  ? language === 'sv'
                    ? 'StatLab är en fristående statistisk arbetsbok.'
                    : 'StatLab is an independent statistical workbook.'
                  : language === 'sv'
                    ? 'Översikt över verktyg och verifieringsstatus.'
                    : 'Overview of available tools and verification status.'}
            </Dialog.Description>
            <Dialog.Close asChild>
              <button
                className="icon-button app-dialog-close"
                type="button"
                aria-label={language === 'sv' ? 'Stäng dialog' : 'Close dialog'}
              >
                <X size={15} />
              </button>
            </Dialog.Close>
            {appDialog === 'settings' ? (
              <div className="app-settings">
                <fieldset className="app-setting-group">
                  <legend>{language === 'sv' ? 'Språk' : 'Language'}</legend>
                  <div className="app-setting-options" role="group">
                    <button
                      type="button"
                      aria-pressed={language === 'sv'}
                      onClick={() => changeLanguage('sv')}
                    >
                      Svenska
                    </button>
                    <button
                      type="button"
                      aria-pressed={language === 'en'}
                      onClick={() => changeLanguage('en')}
                    >
                      English
                    </button>
                  </div>
                </fieldset>
                <fieldset className="app-setting-group">
                  <legend>{language === 'sv' ? 'Utseende' : 'Appearance'}</legend>
                  <div className="app-setting-options" role="group">
                    <button
                      type="button"
                      aria-pressed={theme === 'light'}
                      onClick={() => setTheme('light')}
                    >
                      {language === 'sv' ? 'Ljust' : 'Light'}
                    </button>
                    <button
                      type="button"
                      aria-pressed={theme === 'dark'}
                      onClick={() => setTheme('dark')}
                    >
                      {language === 'sv' ? 'Mörkt' : 'Dark'}
                    </button>
                  </div>
                </fieldset>
              </div>
            ) : appDialog === 'about' ? (
              <p className="app-dialog-copy">
                {language === 'sv'
                  ? 'StatLab erbjuder ett virtuellt arbetsblad och lokala verktyg för statistik, diagram och kvalitetsanalys. Resultat markeras som ej verifierade tills de jämförts med dokumenterade referensvärden.'
                  : 'StatLab provides a virtual worksheet and local tools for statistics, graphs, and quality analysis. Results remain unverified until compared with documented reference values.'}
              </p>
            ) : (
              <div className="app-dialog-copy">
                <p>
                  {language === 'sv'
                    ? `${menuContent.statistics.length + 1} statistikkommandon, ${menuContent.graphs.length} diagramverktyg och ${menuContent.quality.length} kvalitetsverktyg finns i menyerna.`
                    : `${menuContent.statistics.length + 1} statistical commands, ${menuContent.graphs.length} graph tools, and ${menuContent.quality.length} quality tools are available in the menus.`}
                </p>
                <p>
                  {language === 'sv'
                    ? 'Analysresultat visar uttryckligen när oberoende referensverifiering saknas. Öppna dialoger är inte i sig ett bevis på numerisk verifiering.'
                    : 'Analysis results explicitly identify when independent reference verification is missing. An available dialog does not by itself imply numerical verification.'}
                </p>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      {toast && (
        <div className="toast" role="status">
          {toast}
          <button
            className="icon-button"
            type="button"
            aria-label="Stäng"
            onClick={() => setToast('')}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

export default App
