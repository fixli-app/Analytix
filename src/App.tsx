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
import type { DescriptiveSummary } from './stats/descriptive'

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
  calculate: ['Beskrivande statistik'],
  statistics: ['Beskrivande statistik', 'Fler analyser kommer i kommande faser'],
  graphs: ['Diagram kommer i kommande faser'],
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
}

interface SessionResult {
  title: string
  columnName: string
  summary: DescriptiveSummary
  createdAt: Date
}

function formatValue(value: number): string {
  return new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 3 }).format(value)
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
  const [sortDirection, setSortDirection] = useState<'ascending' | 'descending'>('ascending')
  const [session, setSession] = useState<SessionResult | null>(null)
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

  const virtualizer = useVirtualizer({
    count: rows.length,
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
    const text = `${session.title}: ${session.columnName}\nAntal: ${summary.count}\nMedelvärde: ${formatValue(summary.mean)}\nMedian: ${formatValue(summary.median)}\nStandardavvikelse: ${formatValue(summary.standardDeviation)}\nMin: ${formatValue(summary.minimum)}\nMax: ${formatValue(summary.maximum)}\nEj verifierad analys.`
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
                {topPadding > 0 && (
                  <tr aria-hidden="true">
                    <td colSpan={columns.length + 1} style={{ height: topPadding }} />
                  </tr>
                )}
                {virtualRows.map((virtualRow) => {
                  const rowIndex = virtualRow.index
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
              {rows.length} {t('rows')}
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
                  <span>Minimum</span>
                  <strong>{formatValue(session.summary.minimum)}</strong>
                </div>
                <div className="stat-cell">
                  <span>Maximum</span>
                  <strong>{formatValue(session.summary.maximum)}</strong>
                </div>
              </div>
              <p className="session-caption">
                Stickprovsstandardavvikelse, beräknad med Welfords algoritm. Saknade värden
                uteslöts.
              </p>
              <p className="session-caption">
                Beskrivande statistik sammanfattar fördelningen; ingen hypotesprövning har utförts.
              </p>
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
