import { useEffect, useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { SheetColumn } from '../store/workbook'
import type {
  KruskalWallisResult,
  FriedmanResult,
  MannWhitneyResult,
  MoodMedianResult,
  RunsTestResult,
  SignTestResult,
  WilcoxonSignedRankResult,
} from '../stats/nonparametric'

export type NonparametricRequest =
  | { kind: 'mannWhitney'; column1: string; column2: string; alpha: number }
  | { kind: 'kruskalWallis'; measurement: string; group: string; alpha: number }
  | { kind: 'sign'; column: string; median: number; alpha: number }
  | { kind: 'runs'; column: string; alpha: number }
  | { kind: 'wilcoxon'; column: string; median: number; alpha: number }
  | { kind: 'moodMedian'; measurement: string; group: string; alpha: number }
  | { kind: 'friedman'; treatments: string[]; alpha: number }

export type NonparametricResult =
  | { kind: 'mannWhitney'; result: MannWhitneyResult }
  | { kind: 'kruskalWallis'; result: KruskalWallisResult }
  | { kind: 'sign'; result: SignTestResult }
  | { kind: 'runs'; result: RunsTestResult }
  | { kind: 'wilcoxon'; result: WilcoxonSignedRankResult }
  | { kind: 'moodMedian'; result: MoodMedianResult }
  | { kind: 'friedman'; result: FriedmanResult }

interface NonparametricDialogProps {
  open: boolean
  numericColumns: SheetColumn[]
  groupColumns: SheetColumn[]
  initialColumn1: string
  initialColumn2: string
  initialGroupColumn: string
  language: string
  onOpenChange: (open: boolean) => void
  onSubmit: (request: NonparametricRequest) => void
}

type TestKind = NonparametricRequest['kind']

export function NonparametricDialog({
  open,
  numericColumns,
  groupColumns,
  initialColumn1,
  initialColumn2,
  initialGroupColumn,
  language,
  onOpenChange,
  onSubmit,
}: NonparametricDialogProps) {
  const [test, setTest] = useState<TestKind>('mannWhitney')
  const [column1, setColumn1] = useState(initialColumn1)
  const [column2, setColumn2] = useState(initialColumn2)
  const [groupColumn, setGroupColumn] = useState(initialGroupColumn)
  const [treatmentColumns, setTreatmentColumns] = useState<string[]>([])
  const [median, setMedian] = useState('0')
  const [alpha, setAlpha] = useState('0.05')
  const isSwedish = language === 'sv'

  useEffect(() => {
    if (!open) return
    setTest('mannWhitney')
    setColumn1(initialColumn1)
    setColumn2(initialColumn2)
    setGroupColumn(initialGroupColumn)
    setTreatmentColumns(numericColumns.slice(0, 3).map((column) => column.id))
    setMedian('0')
    setAlpha('0.05')
  }, [initialColumn1, initialColumn2, initialGroupColumn, numericColumns, open])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const significance = Number(alpha)
    if (!Number.isFinite(significance) || significance <= 0 || significance >= 1) return
    if (test === 'mannWhitney') {
      if (!column1 || !column2 || column1 === column2) return
      onSubmit({ kind: test, column1, column2, alpha: significance })
    } else if (test === 'kruskalWallis') {
      if (!column1 || !groupColumn) return
      onSubmit({ kind: test, measurement: column1, group: groupColumn, alpha: significance })
    } else if (test === 'sign') {
      const hypothesizedMedian = Number(median)
      if (!column1 || !Number.isFinite(hypothesizedMedian)) return
      onSubmit({ kind: test, column: column1, median: hypothesizedMedian, alpha: significance })
    } else if (test === 'wilcoxon') {
      const hypothesizedMedian = Number(median)
      if (!column1 || !Number.isFinite(hypothesizedMedian)) return
      onSubmit({ kind: test, column: column1, median: hypothesizedMedian, alpha: significance })
    } else if (test === 'moodMedian') {
      if (!column1 || !groupColumn) return
      onSubmit({ kind: test, measurement: column1, group: groupColumn, alpha: significance })
    } else if (test === 'friedman') {
      if (treatmentColumns.length < 3) return
      onSubmit({ kind: test, treatments: treatmentColumns, alpha: significance })
    } else {
      if (!column1) return
      onSubmit({ kind: test, column: column1, alpha: significance })
    }
    onOpenChange(false)
  }

  const labels: Record<TestKind, string> = isSwedish
    ? {
        mannWhitney: 'Mann–Whitney',
        kruskalWallis: 'Kruskal–Wallis',
        sign: 'Teckentest',
        runs: 'Runs-test',
        wilcoxon: 'Wilcoxon signed-rank',
        moodMedian: 'Mood-median',
        friedman: 'Friedman',
      }
    : {
        mannWhitney: 'Mann–Whitney',
        kruskalWallis: 'Kruskal–Wallis',
        sign: 'Sign test',
        runs: 'Runs test',
        wilcoxon: 'Wilcoxon signed-rank',
        moodMedian: 'Mood median',
        friedman: 'Friedman',
      }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <div className="dialog-heading">
            <div>
              <Dialog.Title className="dialog-title">
                {isSwedish ? 'Icke-parametriska tester' : 'Nonparametric tests'}
              </Dialog.Title>
              <Dialog.Description className="dialog-description">
                {isSwedish
                  ? 'Rangbaserade alternativ och median-/slumpordningstest.'
                  : 'Rank-based alternatives and median/random-order tests.'}
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
          <div className="data-operation-tabs nonparametric-tabs" role="tablist">
            {(Object.keys(labels) as TestKind[]).map((kind) => (
              <button
                className="data-operation-tab"
                type="button"
                role="tab"
                aria-selected={test === kind}
                key={kind}
                onClick={() => setTest(kind)}
              >
                {labels[kind]}
              </button>
            ))}
          </div>
          <form onSubmit={submit}>
            {test === 'mannWhitney' && (
              <>
                {[column1, column2].map((columnId, index) => (
                  <label className="dialog-field" key={index}>
                    <span>
                      {isSwedish ? `Numerisk grupp ${index + 1}` : `Numeric group ${index + 1}`}
                    </span>
                    <select
                      value={columnId}
                      onChange={(event) =>
                        index === 0
                          ? setColumn1(event.target.value)
                          : setColumn2(event.target.value)
                      }
                    >
                      {numericColumns.map((column) => (
                        <option value={column.id} key={column.id}>
                          {column.id} · {column.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </>
            )}
            {test === 'kruskalWallis' && (
              <>
                <label className="dialog-field">
                  <span>{isSwedish ? 'Mätkolumn' : 'Measurement column'}</span>
                  <select value={column1} onChange={(event) => setColumn1(event.target.value)}>
                    {numericColumns.map((column) => (
                      <option value={column.id} key={column.id}>
                        {column.id} · {column.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="dialog-field">
                  <span>{isSwedish ? 'Gruppkolumn' : 'Group column'}</span>
                  <select
                    value={groupColumn}
                    onChange={(event) => setGroupColumn(event.target.value)}
                  >
                    {groupColumns.map((column) => (
                      <option value={column.id} key={column.id}>
                        {column.id} · {column.name}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            {(test === 'sign' || test === 'runs' || test === 'wilcoxon') && (
              <label className="dialog-field">
                <span>{isSwedish ? 'Numerisk kolumn' : 'Numeric column'}</span>
                <select value={column1} onChange={(event) => setColumn1(event.target.value)}>
                  {numericColumns.map((column) => (
                    <option value={column.id} key={column.id}>
                      {column.id} · {column.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {(test === 'sign' || test === 'wilcoxon') && (
              <label className="dialog-field">
                <span>
                  {test === 'sign'
                    ? isSwedish
                      ? 'Hypotetisk median'
                      : 'Hypothesized median'
                    : isSwedish
                      ? 'Hypotetisk median/differens'
                      : 'Hypothesized median/difference'}
                </span>
                <input
                  type="number"
                  step="any"
                  value={median}
                  onChange={(event) => setMedian(event.target.value)}
                  required
                />
              </label>
            )}
            {test === 'moodMedian' && (
              <>
                <label className="dialog-field">
                  <span>{isSwedish ? 'Mätkolumn' : 'Measurement column'}</span>
                  <select value={column1} onChange={(event) => setColumn1(event.target.value)}>
                    {numericColumns.map((column) => (
                      <option value={column.id} key={column.id}>
                        {column.id} · {column.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="dialog-field">
                  <span>{isSwedish ? 'Gruppkolumn' : 'Group column'}</span>
                  <select
                    value={groupColumn}
                    onChange={(event) => setGroupColumn(event.target.value)}
                  >
                    {groupColumns.map((column) => (
                      <option value={column.id} key={column.id}>
                        {column.id} · {column.name}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            {test === 'friedman' && (
              <fieldset className="data-operation-columns">
                <legend>
                  {isSwedish
                    ? 'Välj minst tre behandlingar/kolumner'
                    : 'Select at least three treatment columns'}
                </legend>
                {numericColumns.map((column) => (
                  <label key={column.id}>
                    <input
                      type="checkbox"
                      checked={treatmentColumns.includes(column.id)}
                      onChange={(event) =>
                        setTreatmentColumns((current) =>
                          event.target.checked
                            ? [...current, column.id]
                            : current.filter((id) => id !== column.id),
                        )
                      }
                    />
                    <span>
                      {column.id} · {column.name}
                    </span>
                  </label>
                ))}
              </fieldset>
            )}
            <label className="dialog-field">
              <span>{isSwedish ? 'Signifikansnivå (α)' : 'Significance level (α)'}</span>
              <input
                type="number"
                min="0.0001"
                max="0.9999"
                step="any"
                value={alpha}
                onChange={(event) => setAlpha(event.target.value)}
                required
              />
            </label>
            <p className="session-caption">
              {test === 'sign'
                ? isSwedish
                  ? 'Exakt tvåsidigt binomialtest; observationer lika med medianen utesluts.'
                  : 'Exact two-sided binomial test; observations equal to the median are excluded.'
                : test === 'wilcoxon'
                  ? isSwedish
                    ? 'Signed-rank normalapproximation med tie-/nollskillnadshantering; Walsh/Hodges–Lehmann-skattningen är medianen av Walsh-medelvärden.'
                    : 'Signed-rank normal approximation with tie/zero handling; the Walsh/Hodges–Lehmann estimate is the median of Walsh averages.'
                  : test === 'moodMedian'
                    ? isSwedish
                      ? 'Chi-två-test på observationer under/över den poolade medianen; medianlika värden utesluts.'
                      : 'Chi-square test of counts below/above the pooled median; median ties are excluded.'
                    : test === 'friedman'
                      ? isSwedish
                        ? 'Rangordnar behandlingarna inom varje komplett rad/block; saknade block utesluts och p-värdet använder chi-tvåapproximation.'
                        : 'Ranks treatments within each complete row/block; incomplete blocks are dropped and p-value uses a chi-square approximation.'
                      : test === 'runs'
                        ? isSwedish
                          ? 'Normalapproximation runt stickprovsmedianen; ties utesluts och oberoende antas.'
                          : 'Normal approximation around the sample median; ties are excluded and independence is assumed.'
                        : isSwedish
                          ? 'Rangbaserad normal-/chi-tvåapproximation med tie-korrigering; kontrollera gruppstorlekar och antaganden.'
                          : 'Rank-based normal/chi-square approximation with tie correction; inspect group sizes and assumptions.'}
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
                disabled={
                  numericColumns.length === 0 ||
                  ((test === 'kruskalWallis' || test === 'moodMedian') &&
                    groupColumns.length === 0) ||
                  (test === 'friedman' && treatmentColumns.length < 3)
                }
              >
                {isSwedish ? 'Kör test' : 'Run test'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
