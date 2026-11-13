import { useEffect, useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { SheetColumn } from '../store/workbook'
import type { TimeSeriesMethod, TimeSeriesOptions } from '../stats/timeSeries'

interface TimeSeriesDialogProps {
  open: boolean
  columns: SheetColumn[]
  initialColumn: string
  language: string
  onOpenChange: (open: boolean) => void
  onSubmit: (columnId: string, options: TimeSeriesOptions) => void
}

const methods: TimeSeriesMethod[] = [
  'linearTrend',
  'quadraticTrend',
  'movingAverage',
  'simpleExponential',
  'holt',
  'acf',
]

export function TimeSeriesDialog({
  open,
  columns,
  initialColumn,
  language,
  onOpenChange,
  onSubmit,
}: TimeSeriesDialogProps) {
  const [columnId, setColumnId] = useState(initialColumn)
  const [method, setMethod] = useState<TimeSeriesMethod>('linearTrend')
  const [forecastHorizon, setForecastHorizon] = useState('6')
  const [window, setWindow] = useState('3')
  const [alpha, setAlpha] = useState('0.3')
  const [beta, setBeta] = useState('0.2')
  const [maxLag, setMaxLag] = useState('12')
  const isSwedish = language === 'sv'

  useEffect(() => {
    if (!open) return
    setColumnId(initialColumn)
    setMethod('linearTrend')
    setForecastHorizon('6')
    setWindow('3')
    setAlpha('0.3')
    setBeta('0.2')
    setMaxLag('12')
  }, [initialColumn, open])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const options: TimeSeriesOptions = { method }
    if (method === 'linearTrend' || method === 'quadraticTrend') {
      options.forecastHorizon = Number(forecastHorizon)
    }
    if (method === 'movingAverage') options.window = Number(window)
    if (method === 'simpleExponential' || method === 'holt') {
      options.alpha = Number(alpha)
      options.forecastHorizon = Number(forecastHorizon)
    }
    if (method === 'holt') options.beta = Number(beta)
    if (method === 'acf') options.maxLag = Number(maxLag)
    onSubmit(columnId, options)
    onOpenChange(false)
  }

  function methodLabel(value: TimeSeriesMethod): string {
    const labels: Record<TimeSeriesMethod, [string, string]> = {
      linearTrend: ['Linjär trend', 'Linear trend'],
      quadraticTrend: ['Kvadratisk trend', 'Quadratic trend'],
      movingAverage: ['Glidande medelvärde', 'Moving average'],
      simpleExponential: ['Enkel exponentiell utjämning', 'Simple exponential smoothing'],
      holt: ['Holt (nivå + trend)', 'Holt (level + trend)'],
      acf: ['ACF / PACF', 'ACF / PACF'],
    }
    return labels[value][isSwedish ? 0 : 1]
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content timeseries-dialog">
          <div className="dialog-heading">
            <div>
              <Dialog.Title className="dialog-title">
                {isSwedish ? 'Tidsserieanalys' : 'Time-series analysis'}
              </Dialog.Title>
              <Dialog.Description className="dialog-description">
                {isSwedish
                  ? 'Trend, utjämning, glidande medelvärde och autokorrelation.'
                  : 'Trend, smoothing, moving average, and autocorrelation.'}
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
              <span>{isSwedish ? 'Tidsseriekolumn' : 'Time-series column'}</span>
              <select value={columnId} onChange={(event) => setColumnId(event.target.value)}>
                {columns.map((column) => (
                  <option value={column.id} key={column.id}>
                    {column.id} · {column.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="dialog-field">
              <span>{isSwedish ? 'Metod' : 'Method'}</span>
              <select
                value={method}
                onChange={(event) => setMethod(event.target.value as TimeSeriesMethod)}
              >
                {methods.map((value) => (
                  <option value={value} key={value}>
                    {methodLabel(value)}
                  </option>
                ))}
              </select>
            </label>
            {(method === 'linearTrend' ||
              method === 'quadraticTrend' ||
              method === 'simpleExponential' ||
              method === 'holt') && (
              <label className="dialog-field">
                <span>{isSwedish ? 'Prognossteg' : 'Forecast horizon'}</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={forecastHorizon}
                  onChange={(event) => setForecastHorizon(event.target.value)}
                  required
                />
              </label>
            )}
            {method === 'movingAverage' && (
              <label className="dialog-field">
                <span>{isSwedish ? 'Fönster' : 'Window'}</span>
                <input
                  type="number"
                  min="2"
                  max="500"
                  value={window}
                  onChange={(event) => setWindow(event.target.value)}
                  required
                />
              </label>
            )}
            {(method === 'simpleExponential' || method === 'holt') && (
              <label className="dialog-field">
                <span>α</span>
                <input
                  type="number"
                  min="0.0001"
                  max="1"
                  step="any"
                  value={alpha}
                  onChange={(event) => setAlpha(event.target.value)}
                  required
                />
              </label>
            )}
            {method === 'holt' && (
              <label className="dialog-field">
                <span>β</span>
                <input
                  type="number"
                  min="0.0001"
                  max="1"
                  step="any"
                  value={beta}
                  onChange={(event) => setBeta(event.target.value)}
                  required
                />
              </label>
            )}
            {method === 'acf' && (
              <label className="dialog-field">
                <span>{isSwedish ? 'Maximalt lagg' : 'Maximum lag'}</span>
                <input
                  type="number"
                  min="1"
                  max="200"
                  value={maxLag}
                  onChange={(event) => setMaxLag(event.target.value)}
                  required
                />
              </label>
            )}
            <p className="session-caption">
              {isSwedish
                ? 'Rader med saknade värden utelämnas; glidande medelvärde återställs vid tidsluckor. ACF/PACF kräver en komplett serie.'
                : 'Rows with missing values are omitted; moving averages reset at time gaps. ACF/PACF requires a complete series.'}
            </p>
            <div className="dialog-actions">
              <Dialog.Close asChild>
                <button className="dialog-button secondary" type="button">
                  {isSwedish ? 'Avbryt' : 'Cancel'}
                </button>
              </Dialog.Close>
              <button
                className="dialog-button primary"
                type="submit"
                disabled={columns.length === 0}
              >
                {isSwedish ? 'Kör tidsserieanalys' : 'Run time-series analysis'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
