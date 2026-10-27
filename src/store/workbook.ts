import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export interface SheetColumn {
  id: string
  name: string
  type: 'text' | 'numeric' | 'date'
}

export type SheetRow = Record<string, string>

export interface WorkbookSnapshot {
  columns: SheetColumn[]
  rows: SheetRow[]
}

interface WorkbookState extends WorkbookSnapshot {
  activeCell: { row: number; column: number }
  past: WorkbookSnapshot[]
  future: WorkbookSnapshot[]
  setActiveCell: (row: number, column: number) => void
  setCell: (row: number, columnId: string, value: string) => void
  pasteCells: (row: number, column: number, values: string[][]) => void
  addRow: () => void
  addColumn: () => void
  renameColumn: (columnId: string, name: string) => void
  replaceData: (columns: SheetColumn[], rows: SheetRow[]) => void
  sortByColumn: (columnId: string) => void
  undo: () => void
  redo: () => void
}

const starterColumns: SheetColumn[] = [
  { id: 'C1', name: 'Batch', type: 'text' },
  { id: 'C2', name: 'Temp °C', type: 'numeric' },
  { id: 'C3', name: 'Tryck', type: 'numeric' },
  { id: 'C4', name: 'Utbyte %', type: 'numeric' },
  { id: 'C5', name: 'Skift', type: 'text' },
]

const starterRows: SheetRow[] = [
  ['B-101', '78.2', '4.1', '92.4', 'Morgon'],
  ['B-102', '79.1', '4.3', '94.1', 'Morgon'],
  ['B-103', '77.8', '4.0', '91.8', 'Kväll'],
  ['B-104', '80.4', '4.5', '95.6', 'Kväll'],
  ['B-105', '78.9', '4.2', '93.7', 'Morgon'],
  ['B-106', '81.2', '4.7', '96.3', 'Natt'],
  ['B-107', '77.5', '3.9', '90.9', 'Natt'],
  ['B-108', '79.8', '4.4', '94.8', 'Kväll'],
  ['B-109', '80.1', '4.6', '95.1', 'Morgon'],
  ['B-110', '78.4', '4.1', '92.8', 'Natt'],
  ['B-111', '81.0', '4.8', '96.0', 'Kväll'],
  ['B-112', '79.3', '4.3', '', 'Morgon'],
].map((values) =>
  Object.fromEntries(starterColumns.map((column, index) => [column.id, values[index]])),
)

function snapshot(state: WorkbookSnapshot): WorkbookSnapshot {
  return {
    columns: state.columns.map((column) => ({ ...column })),
    rows: state.rows.map((row) => ({ ...row })),
  }
}

export const useWorkbookStore = create<WorkbookState>()(
  immer((set) => ({
    columns: starterColumns,
    rows: starterRows,
    activeCell: { row: 0, column: 0 },
    past: [],
    future: [],
    setActiveCell: (row, column) =>
      set((state) => {
        state.activeCell = { row, column }
      }),
    setCell: (row, columnId, value) =>
      set((state) => {
        state.past.push(snapshot(state))
        state.future = []
        if (!state.rows[row]) state.rows[row] = {}
        state.rows[row][columnId] = value
      }),
    pasteCells: (startRow, startColumn, values) =>
      set((state) => {
        state.past.push(snapshot(state))
        state.future = []
        values.forEach((line, rowOffset) => {
          const rowIndex = startRow + rowOffset
          while (state.rows.length <= rowIndex) {
            state.rows.push(Object.fromEntries(state.columns.map((column) => [column.id, ''])))
          }
          line.forEach((value, columnOffset) => {
            const column = state.columns[startColumn + columnOffset]
            if (column) state.rows[rowIndex][column.id] = value
          })
        })
      }),
    addRow: () =>
      set((state) => {
        state.past.push(snapshot(state))
        state.future = []
        state.rows.push(Object.fromEntries(state.columns.map((column) => [column.id, ''])))
      }),
    addColumn: () =>
      set((state) => {
        state.past.push(snapshot(state))
        state.future = []
        const id = `C${state.columns.length + 1}`
        state.columns.push({ id, name: `Variabel ${state.columns.length + 1}`, type: 'numeric' })
        state.rows.forEach((row) => {
          row[id] = ''
        })
      }),
    renameColumn: (columnId, name) =>
      set((state) => {
        state.past.push(snapshot(state))
        state.future = []
        const column = state.columns.find((item) => item.id === columnId)
        if (column) column.name = name
      }),
    replaceData: (columns, rows) =>
      set((state) => {
        state.past.push(snapshot(state))
        state.future = []
        state.columns = columns
        state.rows = rows
        state.activeCell = { row: 0, column: 0 }
      }),
    sortByColumn: (columnId) =>
      set((state) => {
        state.past.push(snapshot(state))
        state.future = []
        const column = state.columns.find((item) => item.id === columnId)
        state.rows.sort((left, right) => {
          const a = left[columnId] ?? ''
          const b = right[columnId] ?? ''
          if (column?.type === 'numeric') return (Number(a) || 0) - (Number(b) || 0)
          return a.localeCompare(b, 'sv')
        })
      }),
    undo: () =>
      set((state) => {
        const previous = state.past.pop()
        if (!previous) return
        state.future.unshift(snapshot(state))
        state.columns = previous.columns
        state.rows = previous.rows
      }),
    redo: () =>
      set((state) => {
        const next = state.future.shift()
        if (!next) return
        state.past.push(snapshot(state))
        state.columns = next.columns
        state.rows = next.rows
      }),
  })),
)

export function workbookSnapshot(state: WorkbookSnapshot): WorkbookSnapshot {
  return snapshot(state)
}
