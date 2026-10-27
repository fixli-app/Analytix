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

  it('deletes a row and restores it with undo', () => {
    useWorkbookStore.setState({ rows: [{ C1: '1' }, { C1: '2' }] })
    useWorkbookStore.getState().deleteRow(0)
    expect(useWorkbookStore.getState().rows.map((row) => row.C1)).toEqual(['2'])

    useWorkbookStore.getState().undo()
    expect(useWorkbookStore.getState().rows.map((row) => row.C1)).toEqual(['1', '2'])
  })

  it('does not allow deleting the last column', () => {
    expect(useWorkbookStore.getState().deleteColumn('C1')).toBe(false)
    expect(useWorkbookStore.getState().columns).toHaveLength(1)
  })

  it('deletes a column and restores it with undo', () => {
    useWorkbookStore.setState({
      columns: [
        { id: 'C1', name: 'A', type: 'numeric' },
        { id: 'C2', name: 'B', type: 'text' },
      ],
      rows: [{ C1: '1', C2: 'x' }],
    })
    expect(useWorkbookStore.getState().deleteColumn('C2')).toBe(true)
    expect(useWorkbookStore.getState().rows[0].C2).toBeUndefined()

    useWorkbookStore.getState().undo()
    expect(useWorkbookStore.getState().rows[0].C2).toBe('x')
  })

  it('replaces missing cells in one column and supports undo', () => {
    useWorkbookStore.setState({ rows: [{ C1: '1' }, { C1: '' }, {}] })
    useWorkbookStore.getState().replaceMissing('C1', '0')
    expect(useWorkbookStore.getState().rows.map((row) => row.C1)).toEqual(['1', '0', '0'])

    useWorkbookStore.getState().undo()
    expect(useWorkbookStore.getState().rows.map((row) => row.C1)).toEqual(['1', '', undefined])
  })

  it('sorts numeric values in descending order', () => {
    useWorkbookStore.setState({ rows: [{ C1: '2' }, { C1: '10' }, { C1: '1' }] })
    useWorkbookStore.getState().sortByColumn('C1', 'descending')
    expect(useWorkbookStore.getState().rows.map((row) => row.C1)).toEqual(['10', '2', '1'])
  })

  it('keeps missing numeric values last in either sort direction', () => {
    for (const direction of ['ascending', 'descending'] as const) {
      useWorkbookStore.setState({ rows: [{ C1: '2' }, { C1: '' }, { C1: '10' }] })
      useWorkbookStore.getState().sortByColumn('C1', direction)
      expect(useWorkbookStore.getState().rows.map((row) => row.C1)).toEqual(
        direction === 'ascending' ? ['2', '10', ''] : ['10', '2', ''],
      )
    }
  })

  it('appends a derived numeric column as one undoable change', () => {
    const columnId = useWorkbookStore.getState().appendNumericColumn('Z(Value)', ['-1', '1'])
    expect(columnId).toBe('C2')
    expect(useWorkbookStore.getState().columns[1]).toEqual({
      id: 'C2',
      name: 'Z(Value)',
      type: 'numeric',
    })
    expect(useWorkbookStore.getState().rows[0][columnId]).toBe('-1')

    useWorkbookStore.getState().undo()
    expect(useWorkbookStore.getState().columns).toHaveLength(1)
  })
})
