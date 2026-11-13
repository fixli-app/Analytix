import { useEffect, useMemo, useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { SheetColumn, SheetRow } from '../store/workbook'
import { calculateColumnFormula, type CalculatedColumn } from '../utils/columnFormula'

interface ColumnFormulaDialogProps {
  open: boolean
  columns: SheetColumn[]
  rows: SheetRow[]
  language: string
  onOpenChange: (open: boolean) => void
  onSubmit: (column: CalculatedColumn) => void
}

export function ColumnFormulaDialog({
  open,
  columns,
  rows,
  language,
  onOpenChange,
  onSubmit,
}: ColumnFormulaDialogProps) {
  const isSwedish = language === 'sv'
  const numericColumns = useMemo(
    () => columns.filter((column) => column.type === 'numeric'),
    [columns],
  )
  const [formula, setFormula] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setFormula(numericColumns[0] ? `${numericColumns[0].id} * 2` : '')
    setName(isSwedish ? 'Beräknat värde' : 'Calculated value')
    setError('')
  }, [isSwedish, numericColumns, open])

  function insertToken(token: string) {
    setFormula((current) => {
      const needsSeparator = current.trim() && /[A-Za-z0-9.)]$/.test(current.trim())
      return `${current}${needsSeparator ? ' ' : ''}${token}`
    })
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      const result = calculateColumnFormula(formula, name, columns, rows)
      onSubmit(result)
      onOpenChange(false)
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : isSwedish
            ? 'Formeln kunde inte beräknas.'
            : 'The formula could not be calculated.',
      )
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content formula-dialog">
          <div className="dialog-heading">
            <div>
              <Dialog.Title className="dialog-title">
                {isSwedish ? 'Beräkna kolumn' : 'Calculate column'}
              </Dialog.Title>
              <Dialog.Description className="dialog-description">
                {isSwedish
                  ? 'Beräkna en ny numerisk kolumn rad för rad.'
                  : 'Calculate a new numeric column row by row.'}
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
          <form onSubmit={submit}>
            <label className="dialog-field">
              <span>{isSwedish ? 'Formel' : 'Formula'}</span>
              <textarea
                autoFocus
                rows={2}
                value={formula}
                onChange={(event) => setFormula(event.target.value)}
                placeholder={
                  isSwedish ? 'Exempel: sqrt(C1^2 + C2^2)' : 'Example: sqrt(C1^2 + C2^2)'
                }
                aria-label={isSwedish ? 'Formeluttryck' : 'Formula expression'}
                required
              />
            </label>
            <div
              className="formula-token-group"
              aria-label={isSwedish ? 'Kolumnreferenser' : 'Column references'}
            >
              {numericColumns.map((column) => (
                <button
                  type="button"
                  className="formula-token"
                  key={column.id}
                  onClick={() => insertToken(column.id)}
                  title={column.name}
                >
                  {column.id}
                </button>
              ))}
              {['IF(', 'AND(', 'OR(', 'NOT(', 'MIN(', 'MAX(', 'SUM(', 'MEAN(', 'ROUND('].map(
                (token) => (
                  <button
                    type="button"
                    className="formula-token formula-function"
                    key={token}
                    onClick={() => insertToken(token)}
                  >
                    {token}
                  </button>
                ),
              )}
              {['+', '-', '*', '/', '^', '(', ')', ',', '=', '<>', '<', '<=', '>', '>='].map(
                (token) => (
                  <button
                    type="button"
                    className="formula-token formula-operator"
                    key={token}
                    aria-label={`${isSwedish ? 'Infoga' : 'Insert'} ${token}`}
                    onClick={() => insertToken(token)}
                  >
                    {token}
                  </button>
                ),
              )}
            </div>
            <p className="session-caption">
              {isSwedish
                ? 'Operatorer: + − × ÷ ^, =, <>, <, <=, >, >= och parenteser. IF(villkor, sant, falskt), AND, OR, NOT; MIN/MAX/SUM/MEAN tar flera argument. Matematikfunktioner: abs, sqrt, exp, ln, log10, sin, cos, tan, floor, ceil, round. Decimaler skrivs med punkt; saknade celler ger saknat resultat.'
                : 'Operators: + − × ÷ ^, =, <>, <, <=, >, >= and parentheses. IF(condition, true, false), AND, OR, NOT; MIN/MAX/SUM/MEAN accept multiple arguments. Math functions: abs, sqrt, exp, ln, log10, sin, cos, tan, floor, ceil, round. Use a decimal point; missing cells produce missing results.'}
            </p>
            <label className="dialog-field">
              <span>{isSwedish ? 'Namn på ny kolumn' : 'New column name'}</span>
              <input value={name} onChange={(event) => setName(event.target.value)} required />
            </label>
            {error && (
              <p className="quality-error" role="alert">
                {error}
              </p>
            )}
            <div className="dialog-actions">
              <Dialog.Close asChild>
                <button className="dialog-button secondary" type="button">
                  {isSwedish ? 'Avbryt' : 'Cancel'}
                </button>
              </Dialog.Close>
              <button
                className="dialog-button primary"
                type="submit"
                disabled={numericColumns.length === 0 || rows.length === 0}
              >
                {isSwedish ? 'Beräkna' : 'Calculate'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
