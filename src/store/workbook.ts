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
  insertRow: (rowIndex: number) => void
  addColumn: () => void
  deleteRow: (rowIndex: number) => void
  deleteColumn: (columnId: string) => boolean
  renameColumn: (columnId: string, name: string) => void
  replaceMissing: (columnId: string, replacement: string) => void
  replaceData: (columns: SheetColumn[], rows: SheetRow[]) => void
  sortByColumn: (columnId: string, direction?: 'ascending' | 'descending') => void
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
    insertRow: (rowIndex) =>
      set((state) => {
        state.past.push(snapshot(state))
        state.future = []
        const index = Math.max(0, Math.min(rowIndex, state.rows.length))
        state.rows.splice(
          index,
          0,
          Object.fromEntries(state.columns.map((column) => [column.id, ''])),
        )
        state.activeCell.row = index
      }),
    addColumn: () =>
      set((state) => {
        state.past.push(snapshot(state))
        state.future = []
        let nextNumber = state.columns.length + 1
        while (state.columns.some((column) => column.id === `C${nextNumber}`)) nextNumber += 1
        const id = `C${nextNumber}`
        state.columns.push({ id, name: `Variabel ${state.columns.length + 1}`, type: 'numeric' })
        state.rows.forEach((row) => {
          row[id] = ''
        })
      }),
    deleteRow: (rowIndex) =>
      set((state) => {
        if (rowIndex < 0 || rowIndex >= state.rows.length) return
        state.past.push(snapshot(state))
        state.future = []
        state.rows.splice(rowIndex, 1)
        state.activeCell.row = Math.min(rowIndex, Math.max(state.rows.length - 1, 0))
      }),
    deleteColumn: (columnId) => {
      let deleted = false
      set((state) => {
        if (state.columns.length <= 1 || !state.columns.some((column) => column.id === columnId))
          return
        state.past.push(snapshot(state))
        state.future = []
        const columnIndex = state.columns.findIndex((column) => column.id === columnId)
        state.columns.splice(columnIndex, 1)
        state.rows.forEach((row) => {
          delete row[columnId]
        })
        state.activeCell.column = Math.min(columnIndex, state.columns.length - 1)
        deleted = true
      })
      return deleted
    },
    renameColumn: (columnId, name) =>
      set((state) => {
        state.past.push(snapshot(state))
        state.future = []
        const column = state.columns.find((item) => item.id === columnId)
        if (column) column.name = name
      }),
    replaceMissing: (columnId, replacement) =>
      set((state) => {
        if (!state.rows.some((row) => row[columnId] === '' || row[columnId] === undefined)) return
        state.past.push(snapshot(state))
        state.future = []
        state.rows.forEach((row) => {
          if (row[columnId] === '' || row[columnId] === undefined) row[columnId] = replacement
        })
      }),
    replaceData: (columns, rows) =>
      set((state) => {
        state.past.push(snapshot(state))
        state.future = []
        state.columns = columns
        state.rows = rows
        state.activeCell = { row: 0, column: 0 }
      }),
    sortByColumn: (columnId, direction = 'ascending') =>
      set((state) => {
        state.past.push(snapshot(state))
        state.future = []
        const column = state.columns.find((item) => item.id === columnId)
        state.rows.sort((left, right) => {
          const a = left[columnId] ?? ''
          const b = right[columnId] ?? ''
          const comparison =
            column?.type === 'numeric'
              ? (Number(a) || 0) - (Number(b) || 0)
              : a.localeCompare(b, 'sv')
          return direction === 'ascending' ? comparison : -comparison
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
