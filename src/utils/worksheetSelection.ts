import type { SheetColumn, SheetRow } from '../store/workbook'

export interface CellPosition {
  row: number
  column: number
}

export function selectionBounds(anchor: CellPosition, focus: CellPosition) {
  return {
    firstRow: Math.min(anchor.row, focus.row),
    lastRow: Math.max(anchor.row, focus.row),
    firstColumn: Math.min(anchor.column, focus.column),
    lastColumn: Math.max(anchor.column, focus.column),
  }
}

export function selectionToTsv(
  rows: readonly SheetRow[],
  columns: readonly SheetColumn[],
  anchor: CellPosition,
  focus: CellPosition,
): string {
  if (rows.length === 0 || columns.length === 0) return ''
  const bounds = selectionBounds(anchor, focus)
  const selectedColumns = columns.slice(bounds.firstColumn, bounds.lastColumn + 1)
  return rows
    .slice(bounds.firstRow, bounds.lastRow + 1)
    .map((row) => selectedColumns.map((column) => row[column.id] ?? '').join('\t'))
    .join('\n')
}
