import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
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
  FileText,
  Grid2X2,
  Languages,
  Moon,
  MoreHorizontal,
  Plus,
  Redo2,
  Rows3,
  Save,
  Search,
  Sigma,
  Sun,
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
  type WorkbookSnapshot,
} from './store/workbook'
import { statsWorker } from './workers/client'
import { loadAutosave, saveAutosave } from './utils/projects'
import { filterRowIndexes } from './utils/filterRows'
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
import type { ChiSquareIndependenceResult } from './stats/chiSquare'
import type { ChiSquareGoodnessOfFitResult } from './stats/chiSquareGoodnessOfFit'
import type { FisherExactResult } from './stats/fisherExact'
import type { ProcessCapabilityResult } from './stats/processCapability'
import type { ImrControlChartResult } from './stats/imrControlChart'
import type { TwoSampleZResult } from './stats/twoSampleZ'
import type { TwoSamplePoissonRateResult } from './stats/twoSamplePoissonRate'
import type { VarianceComparisonResult } from './stats/compareVariances'
import { OneSampleTDialog } from './dialogs/OneSampleTDialog'
import { TwoSampleTDialog } from './dialogs/TwoSampleTDialog'
import { PairedTDialog } from './dialogs/PairedTDialog'
import { OneProportionDialog } from './dialogs/OneProportionDialog'
import { TwoProportionsDialog } from './dialogs/TwoProportionsDialog'
import { CorrelationDialog } from './dialogs/CorrelationDialog'
import { OneSamplePoissonRateDialog } from './dialogs/OneSamplePoissonRateDialog'
import { OneSampleZDialog } from './dialogs/OneSampleZDialog'
import { NormalKSDialog } from './dialogs/NormalKSDialog'
import { ChiSquareDialog } from './dialogs/ChiSquareDialog'
import { ChiSquareGoodnessOfFitDialog } from './dialogs/ChiSquareGoodnessOfFitDialog'
import { FisherExactDialog } from './dialogs/FisherExactDialog'
import { ProcessCapabilityDialog } from './dialogs/ProcessCapabilityDialog'
import { ImrControlChartDialog } from './dialogs/ImrControlChartDialog'
import { ImrControlCharts } from './charts/ImrControlCharts'
import { TwoSampleZDialog } from './dialogs/TwoSampleZDialog'
import { TwoSamplePoissonRateDialog } from './dialogs/TwoSamplePoissonRateDialog'
import { CompareVariancesDialog } from './dialogs/CompareVariancesDialog'

const menuKeys = [
  'file',
  'edit',
  'data',
  'calculate',
  'statistics',
  'graphs',
  'editor',
  'tools',
  'window',
  'help',
] as const
const menuContent: Record<string, string[]> = {
  file: ['Nytt projekt', 'Öppna projekt…', 'Spara projekt', 'Importera data…', 'Exportera som CSV'],
  edit: ['Ångra', 'Gör om', 'Kopiera session'],
  data: [
    'sortAscending',
    'sortDescending',
    'deleteActiveRow',
    'deleteActiveColumn',
    'replaceMissing',
    'addRow',
    'addColumn',
  ],
  calculate: ['Beskrivande statistik', 'standardizeColumn'],
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
    'normalKS',
    'chiSquare',
    'chiSquareUniform',
    'fisherExact',
    'processCapability',
    'Beskrivande statistik',
    'Fler analyser kommer i kommande faser',
  ],
  graphs: ['imrControlChart'],
  editor: ['Makron kommer i kommande faser'],
  tools: ['Inställningar'],
  window: ['Arbetsblad', 'Session'],
  help: ['Om StatLab', 'Analysstatus'],
}
const actionLabelKeys: Record<string, string> = {
  sortAscending: 'sortAscending',
  sortDescending: 'sortDescending',
  deleteActiveRow: 'deleteActiveRow',
  deleteActiveColumn: 'deleteActiveColumn',
  replaceMissing: 'replaceMissing',
  addRow: 'addRow',
  addColumn: 'addColumn',
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
  normalKS: 'normalKS',
  chiSquare: 'chiSquare',
  chiSquareUniform: 'chiSquareUniform',
  fisherExact: 'fisherExact',
  processCapability: 'processCapability',
  imrControlChart: 'imrControlChart',
}

interface SessionResult {
  title: string
  columnName: string
  summary?: DescriptiveSummary
  oneSampleT?: OneSampleTResult
  oneSampleZ?: OneSampleZResult
  normalKS?: NormalKsResult
  chiSquare?: ChiSquareIndependenceResult
  chiSquareGoodnessOfFit?: ChiSquareGoodnessOfFitResult
  fisherExact?: FisherExactResult
  processCapability?: ProcessCapabilityResult
  imrControlChart?: ImrControlChartResult
  twoSampleZ?: TwoSampleZResult
  twoSampleT?: TwoSampleTResult
  pairedT?: PairedTResult
  oneProportion?: OneProportionResult
  twoProportions?: TwoProportionsResult
  correlation?: CorrelationResult
  oneSamplePoissonRate?: OneSamplePoissonRateResult
  twoSamplePoissonRate?: TwoSamplePoissonRateResult
  varianceComparison?: VarianceComparisonResult
  createdAt: Date
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

function GridCell({
  rowIndex,
  column,
  value,
  onActivate,
  onDraftChange,
  onCommit,
}: {
  rowIndex: number
  column: SheetColumn
  value: string
  onActivate: () => void
  onDraftChange: (dirty: boolean) => void
  onCommit: (value: string) => void
}) {
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <input
      ref={inputRef}
      aria-label={`${column.name}, rad ${rowIndex + 1}`}
      className={`cell-input${column.type === 'text' ? ' text-cell' : ''}${value === '' ? ' missing' : ''}`}
      data-column={column.id}
      data-row={rowIndex}
      value={draft}
      placeholder="*"
      onFocus={onActivate}
      onChange={(event) => {
        setDraft(event.target.value)
        onDraftChange(event.target.value !== value)
      }}
      onBlur={() => {
        if (draft !== value) onCommit(draft)
        onDraftChange(false)
      }}
      onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
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

function App() {
  const [language, setLanguage] = useState(i18n.language)
  const t = (key: string) => i18n.t(key, { lng: language })
  const columns = useWorkbookStore((state) => state.columns)
  const rows = useWorkbookStore((state) => state.rows)
  const activeCell = useWorkbookStore((state) => state.activeCell)
  const setCell = useWorkbookStore((state) => state.setCell)
  const pasteCells = useWorkbookStore((state) => state.pasteCells)
  const insertRow = useWorkbookStore((state) => state.insertRow)
  const addColumn = useWorkbookStore((state) => state.addColumn)
  const appendNumericColumn = useWorkbookStore((state) => state.appendNumericColumn)
  const deleteRow = useWorkbookStore((state) => state.deleteRow)
  const deleteColumn = useWorkbookStore((state) => state.deleteColumn)
  const replaceMissing = useWorkbookStore((state) => state.replaceMissing)
  const renameColumn = useWorkbookStore((state) => state.renameColumn)
  const replaceData = useWorkbookStore((state) => state.replaceData)
  const sortByColumn = useWorkbookStore((state) => state.sortByColumn)
  const setActiveCell = useWorkbookStore((state) => state.setActiveCell)
  const undo = useWorkbookStore((state) => state.undo)
  const redo = useWorkbookStore((state) => state.redo)
  const [targetColumn, setTargetColumn] = useState('C4')
  const [filterQuery, setFilterQuery] = useState('')
  const [sortDirection, setSortDirection] = useState<'ascending' | 'descending'>('ascending')
  const [session, setSession] = useState<SessionResult | null>(null)
  const [oneSampleTDialogOpen, setOneSampleTDialogOpen] = useState(false)
  const [oneSampleZDialogOpen, setOneSampleZDialogOpen] = useState(false)
  const [normalKSDialogOpen, setNormalKSDialogOpen] = useState(false)
  const [chiSquareDialogOpen, setChiSquareDialogOpen] = useState(false)
  const [chiSquareGoodnessOfFitDialogOpen, setChiSquareGoodnessOfFitDialogOpen] = useState(false)
  const [fisherExactDialogOpen, setFisherExactDialogOpen] = useState(false)
  const [processCapabilityDialogOpen, setProcessCapabilityDialogOpen] = useState(false)
  const [imrControlChartDialogOpen, setImrControlChartDialogOpen] = useState(false)
  const [twoSampleZDialogOpen, setTwoSampleZDialogOpen] = useState(false)
  const [twoSampleTDialogOpen, setTwoSampleTDialogOpen] = useState(false)
  const [pairedTDialogOpen, setPairedTDialogOpen] = useState(false)
  const [oneProportionDialogOpen, setOneProportionDialogOpen] = useState(false)
  const [twoProportionsDialogOpen, setTwoProportionsDialogOpen] = useState(false)
  const [correlationDialogOpen, setCorrelationDialogOpen] = useState(false)
  const [oneSamplePoissonDialogOpen, setOneSamplePoissonDialogOpen] = useState(false)
  const [twoSamplePoissonDialogOpen, setTwoSamplePoissonDialogOpen] = useState(false)
  const [varianceDialogOpen, setVarianceDialogOpen] = useState(false)
  const [hasDraft, setHasDraft] = useState(false)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    localStorage.getItem('statlab-theme') === 'dark' ? 'dark' : 'light',
  )
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const projectInputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const visibleRowIndexes = useMemo(() => filterRowIndexes(rows, filterQuery), [filterQuery, rows])

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
    document.documentElement.dataset.theme = theme
    localStorage.setItem('statlab-theme', theme)
  }, [theme])

  useEffect(() => {
    let active = true
    void loadAutosave()
      .then((saved) => {
        if (active && saved?.columns.length && saved.rows.length) {
          useWorkbookStore.setState({ columns: saved.columns, rows: saved.rows })
        }
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const state = useWorkbookStore.getState()
      const snapshot: WorkbookSnapshot = { columns: state.columns, rows: state.rows }
      void saveAutosave(snapshot)
        .then(() => setSavedAt(new Date()))
        .catch(() => undefined)
    }, 700)
    return () => window.clearTimeout(timer)
  }, [columns, rows])

  useEffect(() => {
    const listener = (event: globalThis.KeyboardEvent) => {
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
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2800)
    return () => window.clearTimeout(timer)
  }, [toast])

  const activeColumn = columns[activeCell.column]
  const numericColumns = columns.filter((column) => column.type === 'numeric')

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

  async function runChiSquareGoodnessOfFit(columnId: string, alpha: number) {
    const column = columns.find((item) => item.id === columnId)
    if (!column) {
      setToast('Välj en kategorikolumn för goodness-of-fit-testet.')
      return
    }
    const values = rows.map((row) => row[column.id] ?? null)
    try {
      const result = await statsWorker.chiSquareUniformGoodnessOfFit(values, alpha)
      setSession({
        title: 'Chi-två goodness-of-fit (lika andelar)',
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

  function showMenuAction(action: string) {
    setMenuOpen(null)
    if (action === 'addRow') insertRow(activeCell.row)
    else if (action === 'addColumn') addColumn()
    else if (action === 'Ångra') undo()
    else if (action === 'Gör om') redo()
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
    } else if (action === 'Exportera som CSV') exportCsv()
    else if (action === 'Importera data…') fileInputRef.current?.click()
    else if (action === 'Öppna projekt…') projectInputRef.current?.click()
    else if (action === 'Spara projekt') saveProject()
    else if (action === 'Beskrivande statistik') void runAnalysis()
    else if (action === 'standardizeColumn') void standardizeSelectedColumn()
    else if (action === 'oneSampleT') setOneSampleTDialogOpen(true)
    else if (action === 'oneSampleZ') setOneSampleZDialogOpen(true)
    else if (action === 'twoSampleZ') setTwoSampleZDialogOpen(true)
    else if (action === 'normalKS') setNormalKSDialogOpen(true)
    else if (action === 'chiSquare') setChiSquareDialogOpen(true)
    else if (action === 'chiSquareUniform') setChiSquareGoodnessOfFitDialogOpen(true)
    else if (action === 'fisherExact') setFisherExactDialogOpen(true)
    else if (action === 'processCapability') setProcessCapabilityDialogOpen(true)
    else if (action === 'imrControlChart') setImrControlChartDialogOpen(true)
    else if (action === 'twoSampleT') setTwoSampleTDialogOpen(true)
    else if (action === 'pairedT') setPairedTDialogOpen(true)
    else if (action === 'oneProportion') setOneProportionDialogOpen(true)
    else if (action === 'twoProportions') setTwoProportionsDialogOpen(true)
    else if (action === 'correlation') setCorrelationDialogOpen(true)
    else if (action === 'oneSamplePoissonRate') setOneSamplePoissonDialogOpen(true)
    else if (action === 'twoSamplePoissonRate') setTwoSamplePoissonDialogOpen(true)
    else if (action === 'compareVariances') setVarianceDialogOpen(true)
    else setToast(`${action}: inte tillgängligt i denna första version.`)
  }

  function exportCsv() {
    const csv = Papa.unparse({
      fields: columns.map((column) => column.name),
      data: rows.map((row) => columns.map((column) => row[column.id] ?? '')),
    })
    downloadFile(csv, 'statlab-data.csv', 'text/csv;charset=utf-8')
  }

  function saveProject() {
    const data: WorkbookSnapshot = { columns, rows }
    downloadFile(JSON.stringify(data, null, 2), 'analys.statlab', 'application/json')
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
      const value = JSON.parse(await file.text()) as WorkbookSnapshot
      if (!Array.isArray(value.columns) || !Array.isArray(value.rows))
        throw new Error('Projektfilen har fel format.')
      replaceData(value.columns, value.rows)
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

  async function copySession() {
    if (!session) return
    const { summary } = session
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
                              : session.fisherExact
                                ? `\nFishers tvåsidiga p-värde: ${formatPValue(session.fisherExact.pValue, language)}\nOddskvot: ${session.fisherExact.oddsRatio === null ? 'odefinierad' : formatValue(session.fisherExact.oddsRatio)}`
                                : session.processCapability
                                  ? `\nCp/Cpk: ${formatValue(session.processCapability.cp)} / ${formatValue(session.processCapability.cpk)}\nPp/Ppk: ${formatValue(session.processCapability.pp)} / ${formatValue(session.processCapability.ppk)}\nZ-bench inom: ${formatValue(session.processCapability.zBenchWithin)}\nObserverade PPM: ${formatValue(session.processCapability.observedPpm)}\nFörväntade PPM (normal): ${formatValue(session.processCapability.expectedOverallPpm)}`
                                  : session.imrControlChart
                                    ? `\nI-centrum: ${formatValue(session.imrControlChart.individuals.centerLine)}\nI-LCL/UCL: ${formatValue(session.imrControlChart.individuals.lowerControlLimit)} / ${formatValue(session.imrControlChart.individuals.upperControlLimit)}\nMR̄: ${formatValue(session.imrControlChart.averageMovingRange)}\nMR-UCL: ${formatValue(session.imrControlChart.movingRange.upperControlLimit)}\nRegelsignaler: ${session.imrControlChart.signals.length}`
                                    : session.normalKS
                                      ? `\nD+: ${formatValue(session.normalKS.dPlus)}\nD−: ${formatValue(session.normalKS.dMinus)}\nD: ${formatValue(session.normalKS.statistic)}\np-värde: ${formatPValue(session.normalKS.pValue, language)}\nμ: ${formatValue(session.normalKS.hypothesizedMean)}\nσ: ${formatValue(session.normalKS.hypothesizedStandardDeviation)}`
                                      : ''
    const summaryText = summary
      ? `\nAntal: ${summary.count}\nMedelvärde: ${formatValue(summary.mean)}\nMedian: ${formatValue(summary.median)}\nStandardavvikelse: ${formatValue(summary.standardDeviation)}\nVarians: ${formatValue(summary.variance)}\nStandardfel: ${formatValue(summary.standardError)}\nQ1 (R-7): ${formatValue(summary.firstQuartile)}\nQ3 (R-7): ${formatValue(summary.thirdQuartile)}\nVariationsbredd: ${formatValue(summary.range)}\nMin: ${formatValue(summary.minimum)}\nMax: ${formatValue(summary.maximum)}`
      : ''
    const text = `${session.title}: ${session.columnName}${summaryText}${testResult}\nEj verifierad analys.`
    await navigator.clipboard.writeText(text)
    setToast('Sessionsresultatet kopierat.')
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
          <strong>Produktionsanalys</strong>
          <span> / </span>Batchdata
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
            setLanguage(nextLanguage)
            void i18n.changeLanguage(nextLanguage)
          }}
        >
          <Languages size={16} />
        </button>
      </header>

      <nav className="menubar" aria-label="Huvudmeny">
        {menuKeys.map((key) => (
          <button
            key={key}
            className="menu-button"
            type="button"
            aria-expanded={menuOpen === key}
            onClick={() => setMenuOpen(menuOpen === key ? null : key)}
          >
            {t(key)}
          </button>
        ))}
        {menuOpen && (
          <div className="menu-popover" role="menu">
            {menuContent[menuOpen].map((action) => (
              <button
                key={action}
                type="button"
                role="menuitem"
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
          <div className="nav-section">Arbetsbok</div>
          <button
            className="nav-item active"
            type="button"
            onClick={() => setToast('Arbetsblad 1 är aktivt.')}
          >
            <Grid2X2 size={14} />
            Arbetsblad 1<span className="nav-count">{rows.length}</span>
          </button>
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
          <div className="nav-section">Utdata</div>
          <button
            className="nav-item"
            type="button"
            onClick={() => setToast('Grafer kommer i en senare fas.')}
          >
            <Activity size={14} />
            Grafer<span className="nav-count">0</span>
          </button>
          <button
            className="nav-item"
            type="button"
            onClick={() => setToast('Makron kommer i en senare fas.')}
          >
            <FileText size={14} />
            Makron<span className="nav-count">0</span>
          </button>
          <div className="nav-bottom">
            Lokal arbetsbok
            <br />
            Senast sparad{' '}
            {savedAt
              ? savedAt.toLocaleTimeString(i18n.language === 'sv' ? 'sv-SE' : 'en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'nyss'}
            <div className="verification-chip">
              <CircleHelp size={11} />
              {t('unverified')}
            </div>
          </div>
        </aside>

        <main className="main-column" id="arbetsblad">
          <div className="sheet-heading">
            <div>
              <div className="eyebrow">DATA · PRODUKTION</div>
              <h1>{language === 'sv' ? 'Batchresultat' : 'Batch results'}</h1>
              <p>
                {language === 'sv'
                  ? 'Utbyte från linje 04 · provtagning vecka 42'
                  : 'Yield from line 04 · week 42 sampling'}
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
          <div className="sheet-tabs">
            <button className="sheet-tab active" type="button">
              <Grid2X2 size={13} />
              {t('sheet')}
            </button>
            <button
              className="sheet-tab add-tab"
              type="button"
              title={
                language === 'sv' ? 'Nytt arbetsblad kommer senare' : 'New worksheet coming later'
              }
              onClick={() => setToast('Flera arbetsblad kommer i en senare fas.')}
            >
              <Plus size={14} />
            </button>
          </div>
          <div className="sheet-scroll" ref={scrollRef} onPaste={handlePaste}>
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
                        <td className="cell" key={column.id}>
                          <GridCell
                            key={`${rowIndex}-${column.id}-${row[column.id] ?? ''}`}
                            rowIndex={rowIndex}
                            column={column}
                            value={row[column.id] ?? ''}
                            onActivate={() => setActiveCell(rowIndex, columnIndex)}
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

        <aside className="session-panel" id="session" aria-label={t('session')}>
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
                      ? 'Chi-två goodness-of-fit · lika andelar'
                      : 'Chi-square goodness-of-fit · equal proportions'}
                  </h4>
                  <div className="contingency-scroll">
                    <table className="contingency-table">
                      <thead>
                        <tr>
                          <th scope="col">{language === 'sv' ? 'Kategori' : 'Category'}</th>
                          <th scope="col">{language === 'sv' ? 'Observerad' : 'Observed'}</th>
                          <th scope="col">{language === 'sv' ? 'Förväntad' : 'Expected'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {session.chiSquareGoodnessOfFit.categories.map((category, index) => (
                          <tr key={category}>
                            <th scope="row">{category}</th>
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
                      ? `${session.chiSquareGoodnessOfFit.pValue < session.chiSquareGoodnessOfFit.alpha ? 'Förkasta' : 'Förkasta inte'} H₀ om lika kategorisannolikheter (α = ${formatValue(session.chiSquareGoodnessOfFit.alpha)}).`
                      : `${session.chiSquareGoodnessOfFit.pValue < session.chiSquareGoodnessOfFit.alpha ? 'Reject' : 'Do not reject'} H₀ of equal category probabilities (α = ${formatValue(session.chiSquareGoodnessOfFit.alpha)}).`}
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
              {session.summary && (
                <>
                  <p className="session-caption">
                    Stickprovsstandardavvikelse med Welford. Kvartiler med R-7-interpolation.
                    Saknade värden uteslöts.
                  </p>
                  <p className="session-caption">
                    Beskrivande statistik sammanfattar fördelningen; ingen hypotesprövning har
                    utförts.
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
      <ChiSquareGoodnessOfFitDialog
        open={chiSquareGoodnessOfFitDialogOpen}
        initialColumn={columns[0]?.id ?? ''}
        columns={columns}
        language={language}
        onOpenChange={setChiSquareGoodnessOfFitDialogOpen}
        onSubmit={(columnId, alpha) => {
          void runChiSquareGoodnessOfFit(columnId, alpha)
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
