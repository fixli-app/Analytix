import { beforeEach, describe, expect, it } from 'vitest'
import { useWorkbookStore } from '../workbook'

describe('workbook history and editing', () => {
  beforeEach(() => {
    useWorkbookStore.setState({
      columns: [{ id: 'C1', name: 'Value', type: 'numeric' }],
      rows: [{ C1: '1' }],
      activeCell: { row: 0, column: 0 },
      past: [],
      future: [],
    })
  })

  it('undoes and redoes cell edits', () => {
    useWorkbookStore.getState().setCell(0, 'C1', '2')
    expect(useWorkbookStore.getState().rows[0].C1).toBe('2')

    useWorkbookStore.getState().undo()
    expect(useWorkbookStore.getState().rows[0].C1).toBe('1')

    useWorkbookStore.getState().redo()
    expect(useWorkbookStore.getState().rows[0].C1).toBe('2')
  })

  it('pastes a rectangular range as one undoable change', () => {
    useWorkbookStore.getState().pasteCells(0, 0, [['3'], ['4']])
    expect(useWorkbookStore.getState().rows.map((row) => row.C1)).toEqual(['3', '4'])

    useWorkbookStore.getState().undo()
    expect(useWorkbookStore.getState().rows.map((row) => row.C1)).toEqual(['1'])
  })
})
