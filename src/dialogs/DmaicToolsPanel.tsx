import { Plus, Trash2 } from 'lucide-react'
import {
  calculateCopq,
  calculateDecisionMatrix,
  calculatePughMatrix,
  compareBenchmark,
  compareBeforeAfter,
  analyzeRelations,
  evaluateFaultTree,
  type BrainstormRow,
  type CopqInput,
  type DecisionAlternative,
  type DecisionCriterion,
  type DmaicToolsTab,
  type DmaicToolsWorkspace,
  type BeforeAfterRow,
  type BenchmarkRow,
  type FaultTreeNode,
  type KaizenRow,
  type PughAlternative,
  type PughCriterion,
  type PughScore,
  type PokaYokeRow,
  type RelationLink,
  type RelationNode,
  type SwotQuadrant,
  type SwotRow,
} from '../quality/dmaicTools'

interface DmaicToolsPanelProps {
  tool: DmaicToolsTab
  data: DmaicToolsWorkspace
  isSwedish: boolean
  onChange: (data: DmaicToolsWorkspace) => void
}

const swotQuadrants: { key: SwotQuadrant; labels: [string, string] }[] = [
  { key: 'strengths', labels: ['Styrkor', 'Strengths'] },
  { key: 'weaknesses', labels: ['Svagheter', 'Weaknesses'] },
  { key: 'opportunities', labels: ['Möjligheter', 'Opportunities'] },
  { key: 'threats', labels: ['Hot', 'Threats'] },
]

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function number(value: number, isSwedish: boolean, maximumFractionDigits = 2) {
  return new Intl.NumberFormat(isSwedish ? 'sv-SE' : 'en-US', { maximumFractionDigits }).format(
    value,
  )
}

function DmaicMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-cell">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export function DmaicToolsPanel({ tool, data, isSwedish, onChange }: DmaicToolsPanelProps) {
  if (tool === 'swot') return <SwotPanel data={data} isSwedish={isSwedish} onChange={onChange} />
  if (tool === 'brainstorm') {
    return <BrainstormPanel data={data} isSwedish={isSwedish} onChange={onChange} />
  }
  if (tool === 'decision')
    return <DecisionPanel data={data} isSwedish={isSwedish} onChange={onChange} />
  if (tool === 'pugh') return <PughPanel data={data} isSwedish={isSwedish} onChange={onChange} />
  if (tool === 'relations') {
    return <RelationsPanel data={data} isSwedish={isSwedish} onChange={onChange} />
  }
  if (tool === 'kaizen')
    return <KaizenPanel data={data} isSwedish={isSwedish} onChange={onChange} />
  if (tool === 'pokaYoke') {
    return <PokaYokePanel data={data} isSwedish={isSwedish} onChange={onChange} />
  }
  if (tool === 'faultTree') {
    return <FaultTreePanel data={data} isSwedish={isSwedish} onChange={onChange} />
  }
  if (tool === 'benchmark') {
    return <BenchmarkPanel data={data} isSwedish={isSwedish} onChange={onChange} />
  }
  if (tool === 'beforeAfter') {
    return <BeforeAfterPanel data={data} isSwedish={isSwedish} onChange={onChange} />
  }
  return <CopqPanel data={data} isSwedish={isSwedish} onChange={onChange} />
}

function SwotPanel({ data, isSwedish, onChange }: Omit<DmaicToolsPanelProps, 'tool'>) {
  function updateQuadrant(quadrant: SwotQuadrant, rows: SwotRow[]) {
    onChange({ ...data, swot: { ...data.swot, [quadrant]: rows } })
  }

  return (
    <section aria-label="SWOT">
      <div className="swot-grid">
        {swotQuadrants.map(({ key, labels }) => (
          <section className="swot-quadrant" key={key} aria-label={labels[isSwedish ? 0 : 1]}>
            <h3 className="quality-section-title">{labels[isSwedish ? 0 : 1]}</h3>
            {data.swot[key].map((row, index) => (
              <div className="quality-edit-row" key={row.id}>
                <input
                  aria-label={`${labels[isSwedish ? 0 : 1]} ${index + 1}`}
                  value={row.text}
                  onChange={(event) =>
                    updateQuadrant(
                      key,
                      data.swot[key].map((item) =>
                        item.id === row.id ? { ...item, text: event.target.value } : item,
                      ),
                    )
                  }
                />
                <button
                  className="icon-button"
                  type="button"
                  aria-label={`${isSwedish ? 'Ta bort rad' : 'Remove row'} ${index + 1}`}
                  onClick={() =>
                    updateQuadrant(
                      key,
                      data.swot[key].filter((item) => item.id !== row.id),
                    )
                  }
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button
              className="quality-add-button"
              type="button"
              onClick={() => updateQuadrant(key, [...data.swot[key], { id: newId(), text: '' }])}
            >
              <Plus size={14} /> {isSwedish ? 'Lägg till punkt' : 'Add item'}
            </button>
          </section>
        ))}
      </div>
    </section>
  )
}

function BrainstormPanel({ data, isSwedish, onChange }: Omit<DmaicToolsPanelProps, 'tool'>) {
  const grouped = new Map<string, number>()
  data.brainstormRows.forEach((row) => {
    const group = row.affinityGroup.trim()
    if (row.idea.trim() && group) grouped.set(group, (grouped.get(group) ?? 0) + 1)
  })
  function updateRows(rows: BrainstormRow[]) {
    onChange({ ...data, brainstormRows: rows })
  }

  return (
    <section aria-label={isSwedish ? 'Brainstorming och affinitet' : 'Brainstorming and affinity'}>
      <div className="quality-table-wrap">
        <table className="quality-table brainstorm-table">
          <thead>
            <tr>
              <th>{isSwedish ? 'Idé / observation' : 'Idea / observation'}</th>
              <th>{isSwedish ? 'Affinitetsgrupp' : 'Affinity group'}</th>
              <th>{isSwedish ? 'Ta bort' : 'Remove'}</th>
            </tr>
          </thead>
          <tbody>
            {data.brainstormRows.map((row, index) => (
              <tr key={row.id}>
                <td>
                  <input
                    aria-label={`${isSwedish ? 'Idé' : 'Idea'} ${index + 1}`}
                    value={row.idea}
                    onChange={(event) =>
                      updateRows(
                        data.brainstormRows.map((item) =>
                          item.id === row.id ? { ...item, idea: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </td>
                <td>
                  <input
                    aria-label={`${isSwedish ? 'Affinitetsgrupp' : 'Affinity group'} ${index + 1}`}
                    value={row.affinityGroup}
                    onChange={(event) =>
                      updateRows(
                        data.brainstormRows.map((item) =>
                          item.id === row.id
                            ? { ...item, affinityGroup: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </td>
                <td>
                  <button
                    className="icon-button"
                    type="button"
                    aria-label={`${isSwedish ? 'Ta bort idé' : 'Remove idea'} ${index + 1}`}
                    onClick={() =>
                      updateRows(data.brainstormRows.filter((item) => item.id !== row.id))
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        className="quality-add-button"
        type="button"
        onClick={() =>
          updateRows([...data.brainstormRows, { id: newId(), idea: '', affinityGroup: '' }])
        }
      >
        <Plus size={14} /> {isSwedish ? 'Lägg till idé' : 'Add idea'}
      </button>
      {grouped.size > 0 && (
        <div className="stat-grid quality-metrics-grid">
          {[...grouped.entries()].map(([group, count]) => (
            <div className="stat-cell" key={group}>
              <span>{group}</span>
              <strong>{count}</strong>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function DecisionPanel({ data, isSwedish, onChange }: Omit<DmaicToolsPanelProps, 'tool'>) {
  const results = (() => {
    try {
      return calculateDecisionMatrix(data.decisionCriteria, data.decisionAlternatives)
    } catch {
      return null
    }
  })()
  function updateCriteria(criteria: DecisionCriterion[], alternatives = data.decisionAlternatives) {
    onChange({ ...data, decisionCriteria: criteria, decisionAlternatives: alternatives })
  }
  function updateAlternatives(alternatives: DecisionAlternative[]) {
    onChange({ ...data, decisionAlternatives: alternatives })
  }
  function addCriterion() {
    const criterion = { id: newId(), name: '', weight: 3 }
    updateCriteria(
      [...data.decisionCriteria, criterion],
      data.decisionAlternatives.map((alternative) => ({
        ...alternative,
        scores: { ...alternative.scores, [criterion.id]: 3 },
      })),
    )
  }
  function removeCriterion(id: string) {
    updateCriteria(
      data.decisionCriteria.filter((criterion) => criterion.id !== id),
      data.decisionAlternatives.map((alternative) => {
        const scores = { ...alternative.scores }
        delete scores[id]
        return { ...alternative, scores }
      }),
    )
  }

  return (
    <section aria-label={isSwedish ? 'Viktad beslutsmatris' : 'Weighted decision matrix'}>
      <h3 className="quality-section-title">{isSwedish ? 'Kriterier' : 'Criteria'}</h3>
      <div className="quality-table-wrap">
        <table className="quality-table decision-criteria-table">
          <thead>
            <tr>
              <th>{isSwedish ? 'Kriterium' : 'Criterion'}</th>
              <th>{isSwedish ? 'Vikt (1–5)' : 'Weight (1–5)'}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.decisionCriteria.map((criterion, index) => (
              <tr key={criterion.id}>
                <td>
                  <input
                    aria-label={`${isSwedish ? 'Kriterium' : 'Criterion'} ${index + 1}`}
                    value={criterion.name}
                    onChange={(event) =>
                      updateCriteria(
                        data.decisionCriteria.map((item) =>
                          item.id === criterion.id ? { ...item, name: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </td>
                <td>
                  <select
                    aria-label={`${isSwedish ? 'Vikt' : 'Weight'} ${index + 1}`}
                    value={criterion.weight}
                    onChange={(event) =>
                      updateCriteria(
                        data.decisionCriteria.map((item) =>
                          item.id === criterion.id
                            ? { ...item, weight: Number(event.target.value) }
                            : item,
                        ),
                      )
                    }
                  >
                    {[1, 2, 3, 4, 5].map((weight) => (
                      <option value={weight} key={weight}>
                        {weight}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <button
                    className="icon-button"
                    type="button"
                    aria-label={`${isSwedish ? 'Ta bort kriterium' : 'Remove criterion'} ${index + 1}`}
                    onClick={() => removeCriterion(criterion.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="quality-add-button" type="button" onClick={addCriterion}>
        <Plus size={14} /> {isSwedish ? 'Lägg till kriterium' : 'Add criterion'}
      </button>
      <h3 className="quality-section-title">
        {isSwedish ? 'Alternativ och betyg' : 'Alternatives and scores'}
      </h3>
      <div className="quality-table-wrap">
        <table className="quality-table decision-matrix-table">
          <thead>
            <tr>
              <th>{isSwedish ? 'Alternativ' : 'Alternative'}</th>
              {data.decisionCriteria.map((criterion) => (
                <th key={criterion.id}>
                  {criterion.name || (isSwedish ? 'Kriterium' : 'Criterion')}
                </th>
              ))}
              <th>{isSwedish ? 'Viktad poäng' : 'Weighted score'}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.decisionAlternatives.map((alternative, index) => {
              const result = results?.find((item) => item.id === alternative.id)
              return (
                <tr key={alternative.id}>
                  <td>
                    <input
                      aria-label={`${isSwedish ? 'Alternativ' : 'Alternative'} ${index + 1}`}
                      value={alternative.name}
                      onChange={(event) =>
                        updateAlternatives(
                          data.decisionAlternatives.map((item) =>
                            item.id === alternative.id
                              ? { ...item, name: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </td>
                  {data.decisionCriteria.map((criterion) => (
                    <td key={criterion.id}>
                      <select
                        aria-label={`${alternative.name || `A${index + 1}`} · ${criterion.name || (isSwedish ? 'Kriterium' : 'Criterion')}`}
                        value={alternative.scores[criterion.id] ?? 3}
                        onChange={(event) =>
                          updateAlternatives(
                            data.decisionAlternatives.map((item) =>
                              item.id === alternative.id
                                ? {
                                    ...item,
                                    scores: {
                                      ...item.scores,
                                      [criterion.id]: Number(event.target.value),
                                    },
                                  }
                                : item,
                            ),
                          )
                        }
                      >
                        {[1, 2, 3, 4, 5].map((score) => (
                          <option value={score} key={score}>
                            {score}
                          </option>
                        ))}
                      </select>
                    </td>
                  ))}
                  <td>
                    {result
                      ? `${result.weightedScore} / ${result.maximumScore} · ${number(result.normalizedScore, isSwedish)}%`
                      : '—'}
                  </td>
                  <td>
                    <button
                      className="icon-button"
                      type="button"
                      aria-label={`${isSwedish ? 'Ta bort alternativ' : 'Remove alternative'} ${index + 1}`}
                      onClick={() =>
                        updateAlternatives(
                          data.decisionAlternatives.filter((item) => item.id !== alternative.id),
                        )
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <button
        className="quality-add-button"
        type="button"
        onClick={() =>
          updateAlternatives([
            ...data.decisionAlternatives,
            {
              id: newId(),
              name: '',
              scores: Object.fromEntries(
                data.decisionCriteria.map((criterion) => [criterion.id, 3]),
              ),
            },
          ])
        }
      >
        <Plus size={14} /> {isSwedish ? 'Lägg till alternativ' : 'Add alternative'}
      </button>
      {results && (
        <ol
          className="quality-ranking-list"
          aria-label={isSwedish ? 'Rangordnade alternativ' : 'Ranked alternatives'}
        >
          {results.map((result) => (
            <li key={result.id}>
              {result.name} · {result.weightedScore}/{result.maximumScore} (
              {number(result.normalizedScore, isSwedish)}%)
            </li>
          ))}
        </ol>
      )}
      <p className="session-caption">
        {isSwedish
          ? 'Betyg 1–5 multipliceras med kriterievikt 1–5. Rangordningen är ett beslutsstöd, inte ett automatiskt beslut.'
          : 'Ratings 1–5 are multiplied by criterion weights 1–5. The ranking is decision support, not an automatic decision.'}
      </p>
    </section>
  )
}

function PughPanel({ data, isSwedish, onChange }: Omit<DmaicToolsPanelProps, 'tool'>) {
  let results = null
  try {
    results = calculatePughMatrix(data.pughCriteria, data.pughAlternatives, data.pughBaselineId)
  } catch {
    results = null
  }
  const updateCriteria = (criteria: PughCriterion[], alternatives = data.pughAlternatives) =>
    onChange({ ...data, pughCriteria: criteria, pughAlternatives: alternatives })
  const updateAlternatives = (alternatives: PughAlternative[], baselineId = data.pughBaselineId) =>
    onChange({ ...data, pughAlternatives: alternatives, pughBaselineId: baselineId })

  return (
    <section aria-label="Pugh decision matrix">
      <label className="dialog-field">
        <span>{isSwedish ? 'Baslinje' : 'Baseline'}</span>
        <select
          value={data.pughBaselineId}
          onChange={(event) => {
            const baselineId = event.target.value
            updateAlternatives(
              data.pughAlternatives.map((alternative) =>
                alternative.id === baselineId
                  ? {
                      ...alternative,
                      scores: Object.fromEntries(
                        data.pughCriteria.map((criterion) => [criterion.id, 'same']),
                      ),
                    }
                  : alternative,
              ),
              baselineId,
            )
          }}
        >
          {data.pughAlternatives.map((alternative, index) => (
            <option value={alternative.id} key={alternative.id}>
              {alternative.name || `${isSwedish ? 'Alternativ' : 'Alternative'} ${index + 1}`}
            </option>
          ))}
        </select>
      </label>
      <div className="quality-table-wrap">
        <table className="quality-table pugh-criteria-table">
          <thead>
            <tr>
              <th>{isSwedish ? 'Kriterium' : 'Criterion'}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.pughCriteria.map((criterion, index) => (
              <tr key={criterion.id}>
                <td>
                  <input
                    aria-label={`${isSwedish ? 'Pugh-kriterium' : 'Pugh criterion'} ${index + 1}`}
                    value={criterion.name}
                    onChange={(event) =>
                      updateCriteria(
                        data.pughCriteria.map((item) =>
                          item.id === criterion.id ? { ...item, name: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </td>
                <td>
                  <button
                    className="icon-button"
                    type="button"
                    aria-label={`${isSwedish ? 'Ta bort Pugh-kriterium' : 'Remove Pugh criterion'} ${index + 1}`}
                    onClick={() => {
                      const criteria = data.pughCriteria.filter((item) => item.id !== criterion.id)
                      updateCriteria(
                        criteria,
                        data.pughAlternatives.map((alternative) => {
                          const scores = { ...alternative.scores }
                          delete scores[criterion.id]
                          return { ...alternative, scores }
                        }),
                      )
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        className="quality-add-button"
        type="button"
        onClick={() => {
          const criterion = { id: newId(), name: '' }
          updateCriteria(
            [...data.pughCriteria, criterion],
            data.pughAlternatives.map((alternative) => ({
              ...alternative,
              scores: { ...alternative.scores, [criterion.id]: 'same' },
            })),
          )
        }}
      >
        <Plus size={14} /> {isSwedish ? 'Lägg till kriterium' : 'Add criterion'}
      </button>
      <div className="quality-table-wrap">
        <table className="quality-table pugh-matrix-table">
          <thead>
            <tr>
              <th>{isSwedish ? 'Alternativ' : 'Alternative'}</th>
              {data.pughCriteria.map((criterion) => (
                <th key={criterion.id}>
                  {criterion.name || (isSwedish ? 'Kriterium' : 'Criterion')}
                </th>
              ))}
              <th>+ / S / −</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.pughAlternatives.map((alternative, index) => {
              const isBaseline = alternative.id === data.pughBaselineId
              const result = results?.find((item) => item.id === alternative.id)
              return (
                <tr key={alternative.id}>
                  <td>
                    <input
                      aria-label={`${isSwedish ? 'Pugh-alternativ' : 'Pugh alternative'} ${index + 1}`}
                      value={alternative.name}
                      onChange={(event) =>
                        updateAlternatives(
                          data.pughAlternatives.map((item) =>
                            item.id === alternative.id
                              ? { ...item, name: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </td>
                  {data.pughCriteria.map((criterion) => (
                    <td key={criterion.id}>
                      <select
                        aria-label={`${alternative.name || `A${index + 1}`} · ${criterion.name || (isSwedish ? 'Kriterium' : 'Criterion')}`}
                        value={isBaseline ? 'same' : (alternative.scores[criterion.id] ?? 'same')}
                        disabled={isBaseline}
                        onChange={(event) =>
                          updateAlternatives(
                            data.pughAlternatives.map((item) =>
                              item.id === alternative.id
                                ? {
                                    ...item,
                                    scores: {
                                      ...item.scores,
                                      [criterion.id]: event.target.value as PughScore,
                                    },
                                  }
                                : item,
                            ),
                          )
                        }
                      >
                        <option value="plus">+</option>
                        <option value="same">S</option>
                        <option value="minus">−</option>
                      </select>
                    </td>
                  ))}
                  <td>
                    {isBaseline
                      ? 'Baslinje'
                      : result
                        ? `${result.plus} / ${result.same} / ${result.minus} · ${result.net >= 0 ? '+' : ''}${result.net}`
                        : '—'}
                  </td>
                  <td>
                    <button
                      className="icon-button"
                      type="button"
                      aria-label={`${isSwedish ? 'Ta bort Pugh-alternativ' : 'Remove Pugh alternative'} ${index + 1}`}
                      disabled={isBaseline}
                      onClick={() =>
                        updateAlternatives(
                          data.pughAlternatives.filter((item) => item.id !== alternative.id),
                        )
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <button
        className="quality-add-button"
        type="button"
        onClick={() =>
          updateAlternatives([
            ...data.pughAlternatives,
            {
              id: newId(),
              name: '',
              scores: Object.fromEntries(
                data.pughCriteria.map((criterion) => [criterion.id, 'same']),
              ),
            },
          ])
        }
      >
        <Plus size={14} /> {isSwedish ? 'Lägg till alternativ' : 'Add alternative'}
      </button>
      <p className="session-caption">
        {isSwedish
          ? 'Varje alternativ jämförs med baslinjen per kriterium. + är bättre, S samma och − sämre; nettotalet är ett prioriteringsstöd.'
          : 'Each alternative is compared with the baseline by criterion. + is better, S same, and − worse; the net score supports prioritization.'}
      </p>
    </section>
  )
}

function RelationsPanel({ data, isSwedish, onChange }: Omit<DmaicToolsPanelProps, 'tool'>) {
  let results = null
  let error = ''
  try {
    results = analyzeRelations(data.relationNodes, data.relationLinks)
  } catch (caught) {
    error = caught instanceof Error ? caught.message : 'Ogiltigt relationsdiagram.'
  }
  const updateNodes = (relationNodes: RelationNode[]) => onChange({ ...data, relationNodes })
  const updateLinks = (relationLinks: RelationLink[]) => onChange({ ...data, relationLinks })
  return (
    <section aria-label={isSwedish ? 'Relationsdiagram' : 'Relations diagram'}>
      <h3 className="quality-section-title">{isSwedish ? 'Faktorer' : 'Factors'}</h3>
      <div className="quality-edit-list">
        {data.relationNodes.map((node, index) => (
          <div className="quality-edit-row" key={node.id}>
            <input
              aria-label={`${isSwedish ? 'Relationsfaktor' : 'Relation factor'} ${index + 1}`}
              value={node.label}
              onChange={(event) =>
                updateNodes(
                  data.relationNodes.map((item) =>
                    item.id === node.id ? { ...item, label: event.target.value } : item,
                  ),
                )
              }
            />
            <button
              className="icon-button"
              type="button"
              aria-label={`${isSwedish ? 'Ta bort faktor' : 'Remove factor'} ${index + 1}`}
              onClick={() => {
                updateNodes(data.relationNodes.filter((item) => item.id !== node.id))
                updateLinks(
                  data.relationLinks.filter(
                    (link) => link.fromId !== node.id && link.toId !== node.id,
                  ),
                )
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <div className="quality-tool-actions">
        <button
          className="quality-add-button"
          type="button"
          onClick={() => updateNodes([...data.relationNodes, { id: newId(), label: '' }])}
        >
          <Plus size={14} /> {isSwedish ? 'Lägg till faktor' : 'Add factor'}
        </button>
        <button
          className="quality-add-button"
          type="button"
          disabled={data.relationNodes.length < 2}
          onClick={() =>
            updateLinks([
              ...data.relationLinks,
              { id: newId(), fromId: data.relationNodes[0].id, toId: data.relationNodes[1].id },
            ])
          }
        >
          <Plus size={14} /> {isSwedish ? 'Lägg till relation' : 'Add relation'}
        </button>
      </div>
      <h3 className="quality-section-title">
        {isSwedish ? 'Orsak → påverkan' : 'Cause → influence'}
      </h3>
      <div className="quality-table-wrap">
        <table className="quality-table relation-table">
          <thead>
            <tr>
              <th>{isSwedish ? 'Från' : 'From'}</th>
              <th>{isSwedish ? 'Påverkar' : 'Influences'}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.relationLinks.map((link, index) => (
              <tr key={link.id}>
                <td>
                  <select
                    aria-label={`${isSwedish ? 'Från faktor' : 'From factor'} ${index + 1}`}
                    value={link.fromId}
                    onChange={(event) =>
                      updateLinks(
                        data.relationLinks.map((item) =>
                          item.id === link.id ? { ...item, fromId: event.target.value } : item,
                        ),
                      )
                    }
                  >
                    {data.relationNodes.map((node) => (
                      <option value={node.id} key={node.id}>
                        {node.label || node.id}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    aria-label={`${isSwedish ? 'Till faktor' : 'To factor'} ${index + 1}`}
                    value={link.toId}
                    onChange={(event) =>
                      updateLinks(
                        data.relationLinks.map((item) =>
                          item.id === link.id ? { ...item, toId: event.target.value } : item,
                        ),
                      )
                    }
                  >
                    {data.relationNodes.map((node) => (
                      <option value={node.id} key={node.id}>
                        {node.label || node.id}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <button
                    className="icon-button"
                    type="button"
                    aria-label={`${isSwedish ? 'Ta bort relation' : 'Remove relation'} ${index + 1}`}
                    onClick={() =>
                      updateLinks(data.relationLinks.filter((item) => item.id !== link.id))
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error && data.relationNodes.some((node) => node.label.trim()) && (
        <p className="quality-error" role="alert">
          {error}
        </p>
      )}
      {results && (
        <div className="quality-table-wrap">
          <table className="quality-table relation-table">
            <thead>
              <tr>
                <th>{isSwedish ? 'Påverkansgrad' : 'Influence'}</th>
                <th>{isSwedish ? 'Utgående' : 'Outgoing'}</th>
                <th>{isSwedish ? 'Inkommande' : 'Incoming'}</th>
                <th>{isSwedish ? 'Totalt' : 'Total'}</th>
              </tr>
            </thead>
            <tbody>
              {results.map((node) => (
                <tr key={node.id}>
                  <th scope="row">{node.label}</th>
                  <td>{node.outgoing}</td>
                  <td>{node.incoming}</td>
                  <td>{node.totalConnections}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function BenchmarkPanel({ data, isSwedish, onChange }: Omit<DmaicToolsPanelProps, 'tool'>) {
  const completedRows = data.benchmarkRows.filter((row) => row.metric.trim())
  let results = null
  let error = ''
  if (completedRows.length > 0) {
    try {
      results = compareBenchmark(completedRows)
    } catch (caught) {
      error = caught instanceof Error ? caught.message : 'Ogiltiga benchmarkdata.'
    }
  }
  const updateRows = (benchmarkRows: BenchmarkRow[]) => onChange({ ...data, benchmarkRows })
  return (
    <section aria-label="Benchmarking">
      <div className="quality-table-wrap">
        <table className="quality-table benchmark-table">
          <thead>
            <tr>
              <th>{isSwedish ? 'Mått' : 'Metric'}</th>
              <th>{isSwedish ? 'Eget värde' : 'Our value'}</th>
              <th>{isSwedish ? 'Benchmark' : 'Benchmark'}</th>
              <th>{isSwedish ? 'Bättre när' : 'Better when'}</th>
              <th>{isSwedish ? 'Enhet' : 'Unit'}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.benchmarkRows.map((row, index) => (
              <tr key={row.id}>
                <td>
                  <input
                    aria-label={`${isSwedish ? 'Benchmarkmått' : 'Benchmark metric'} ${index + 1}`}
                    value={row.metric}
                    onChange={(event) =>
                      updateRows(
                        data.benchmarkRows.map((item) =>
                          item.id === row.id ? { ...item, metric: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </td>
                <td>
                  <input
                    aria-label={`${isSwedish ? 'Eget värde' : 'Our value'} ${index + 1}`}
                    type="number"
                    step="any"
                    value={row.ours}
                    onChange={(event) =>
                      updateRows(
                        data.benchmarkRows.map((item) =>
                          item.id === row.id ? { ...item, ours: Number(event.target.value) } : item,
                        ),
                      )
                    }
                  />
                </td>
                <td>
                  <input
                    aria-label={`Benchmark ${index + 1}`}
                    type="number"
                    step="any"
                    value={row.benchmark}
                    onChange={(event) =>
                      updateRows(
                        data.benchmarkRows.map((item) =>
                          item.id === row.id
                            ? { ...item, benchmark: Number(event.target.value) }
                            : item,
                        ),
                      )
                    }
                  />
                </td>
                <td>
                  <select
                    aria-label={`${isSwedish ? 'Bättre när' : 'Better when'} ${index + 1}`}
                    value={row.direction}
                    onChange={(event) =>
                      updateRows(
                        data.benchmarkRows.map((item) =>
                          item.id === row.id
                            ? {
                                ...item,
                                direction: event.target.value as BenchmarkRow['direction'],
                              }
                            : item,
                        ),
                      )
                    }
                  >
                    <option value="higher">{isSwedish ? 'Högre' : 'Higher'}</option>
                    <option value="lower">{isSwedish ? 'Lägre' : 'Lower'}</option>
                  </select>
                </td>
                <td>
                  <input
                    aria-label={`${isSwedish ? 'Enhet' : 'Unit'} ${index + 1}`}
                    value={row.unit}
                    onChange={(event) =>
                      updateRows(
                        data.benchmarkRows.map((item) =>
                          item.id === row.id ? { ...item, unit: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </td>
                <td>
                  <button
                    className="icon-button"
                    type="button"
                    aria-label={`${isSwedish ? 'Ta bort benchmark' : 'Remove benchmark'} ${index + 1}`}
                    onClick={() =>
                      updateRows(data.benchmarkRows.filter((item) => item.id !== row.id))
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        className="quality-add-button"
        type="button"
        onClick={() =>
          updateRows([
            ...data.benchmarkRows,
            { id: newId(), metric: '', ours: 0, benchmark: 0, direction: 'higher', unit: '' },
          ])
        }
      >
        <Plus size={14} /> {isSwedish ? 'Lägg till benchmarkmått' : 'Add benchmark metric'}
      </button>
      {error && (
        <p className="quality-error" role="alert">
          {error}
        </p>
      )}
      {results && (
        <div className="quality-table-wrap">
          <table className="quality-table benchmark-table">
            <thead>
              <tr>
                <th>{isSwedish ? 'Mått' : 'Metric'}</th>
                <th>{isSwedish ? 'Gap till benchmark' : 'Gap to benchmark'}</th>
                <th>{isSwedish ? 'Gap (%)' : 'Gap (%)'}</th>
                <th>{isSwedish ? 'Position' : 'Position'}</th>
              </tr>
            </thead>
            <tbody>
              {results.map((row) => (
                <tr key={row.id}>
                  <th scope="row">{row.metric}</th>
                  <td>
                    {number(row.gap, isSwedish)} {row.unit}
                  </td>
                  <td>{row.gapPercent === null ? '—' : `${number(row.gapPercent, isSwedish)}%`}</td>
                  <td>{benchmarkPositionLabel(row.position, isSwedish)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function BeforeAfterPanel({ data, isSwedish, onChange }: Omit<DmaicToolsPanelProps, 'tool'>) {
  const completedRows = data.beforeAfterRows.filter((row) => row.metric.trim())
  let results = null
  let error = ''
  if (completedRows.length > 0) {
    try {
      results = compareBeforeAfter(completedRows)
    } catch (caught) {
      error = caught instanceof Error ? caught.message : 'Ogiltiga före/efter-data.'
    }
  }
  const updateRows = (beforeAfterRows: BeforeAfterRow[]) => onChange({ ...data, beforeAfterRows })
  return (
    <section aria-label={isSwedish ? 'Före och efter' : 'Before and after'}>
      <div className="quality-table-wrap">
        <table className="quality-table before-after-table">
          <thead>
            <tr>
              <th>{isSwedish ? 'Mått' : 'Metric'}</th>
              <th>{isSwedish ? 'Före' : 'Before'}</th>
              <th>{isSwedish ? 'Efter' : 'After'}</th>
              <th>{isSwedish ? 'Bättre när' : 'Better when'}</th>
              <th>{isSwedish ? 'Enhet' : 'Unit'}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.beforeAfterRows.map((row, index) => (
              <tr key={row.id}>
                <td>
                  <input
                    aria-label={`${isSwedish ? 'Före/efter-mått' : 'Before/after metric'} ${index + 1}`}
                    value={row.metric}
                    onChange={(event) =>
                      updateRows(
                        data.beforeAfterRows.map((item) =>
                          item.id === row.id ? { ...item, metric: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </td>
                <td>
                  <input
                    aria-label={`${isSwedish ? 'Före' : 'Before'} ${index + 1}`}
                    type="number"
                    step="any"
                    value={row.before}
                    onChange={(event) =>
                      updateRows(
                        data.beforeAfterRows.map((item) =>
                          item.id === row.id
                            ? { ...item, before: Number(event.target.value) }
                            : item,
                        ),
                      )
                    }
                  />
                </td>
                <td>
                  <input
                    aria-label={`${isSwedish ? 'Efter' : 'After'} ${index + 1}`}
                    type="number"
                    step="any"
                    value={row.after}
                    onChange={(event) =>
                      updateRows(
                        data.beforeAfterRows.map((item) =>
                          item.id === row.id
                            ? { ...item, after: Number(event.target.value) }
                            : item,
                        ),
                      )
                    }
                  />
                </td>
                <td>
                  <select
                    aria-label={`${isSwedish ? 'Bättre när' : 'Better when'} ${index + 1}`}
                    value={row.direction}
                    onChange={(event) =>
                      updateRows(
                        data.beforeAfterRows.map((item) =>
                          item.id === row.id
                            ? {
                                ...item,
                                direction: event.target.value as BeforeAfterRow['direction'],
                              }
                            : item,
                        ),
                      )
                    }
                  >
                    <option value="higher">{isSwedish ? 'Högre' : 'Higher'}</option>
                    <option value="lower">{isSwedish ? 'Lägre' : 'Lower'}</option>
                  </select>
                </td>
                <td>
                  <input
                    aria-label={`${isSwedish ? 'Enhet' : 'Unit'} ${index + 1}`}
                    value={row.unit}
                    onChange={(event) =>
                      updateRows(
                        data.beforeAfterRows.map((item) =>
                          item.id === row.id ? { ...item, unit: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </td>
                <td>
                  <button
                    className="icon-button"
                    type="button"
                    aria-label={`${isSwedish ? 'Ta bort mått' : 'Remove metric'} ${index + 1}`}
                    onClick={() =>
                      updateRows(data.beforeAfterRows.filter((item) => item.id !== row.id))
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        className="quality-add-button"
        type="button"
        onClick={() =>
          updateRows([
            ...data.beforeAfterRows,
            { id: newId(), metric: '', before: 0, after: 0, direction: 'higher', unit: '' },
          ])
        }
      >
        <Plus size={14} /> {isSwedish ? 'Lägg till mått' : 'Add metric'}
      </button>
      {error && (
        <p className="quality-error" role="alert">
          {error}
        </p>
      )}
      {results && (
        <div className="quality-table-wrap">
          <table className="quality-table before-after-table">
            <thead>
              <tr>
                <th>{isSwedish ? 'Mått' : 'Metric'}</th>
                <th>{isSwedish ? 'Förändring' : 'Change'}</th>
                <th>{isSwedish ? 'Förbättring (%)' : 'Improvement (%)'}</th>
                <th>{isSwedish ? 'Utfall' : 'Outcome'}</th>
              </tr>
            </thead>
            <tbody>
              {results.map((row) => (
                <tr key={row.id}>
                  <th scope="row">{row.metric}</th>
                  <td>
                    {number(row.change, isSwedish)} {row.unit}
                  </td>
                  <td>
                    {row.improvementPercent === null
                      ? '—'
                      : `${number(row.improvementPercent, isSwedish)}%`}
                  </td>
                  <td>{beforeAfterStatusLabel(row.status, isSwedish)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="session-caption">
        {isSwedish
          ? 'Jämförda värden är deskriptiva; signifikans kräver rådata och ett lämpligt statistiskt test.'
          : 'Compared values are descriptive; significance requires raw data and an appropriate statistical test.'}
      </p>
    </section>
  )
}

function benchmarkPositionLabel(position: 'behind' | 'at' | 'ahead', isSwedish: boolean) {
  return position === 'behind'
    ? isSwedish
      ? 'Efter benchmark'
      : 'Behind benchmark'
    : position === 'ahead'
      ? isSwedish
        ? 'Före benchmark'
        : 'Ahead of benchmark'
      : isSwedish
        ? 'I nivå'
        : 'At benchmark'
}

function beforeAfterStatusLabel(status: 'improved' | 'unchanged' | 'worsened', isSwedish: boolean) {
  return status === 'improved'
    ? isSwedish
      ? 'Förbättrad'
      : 'Improved'
    : status === 'worsened'
      ? isSwedish
        ? 'Försämrad'
        : 'Worsened'
      : isSwedish
        ? 'Oförändrad'
        : 'Unchanged'
}

function KaizenPanel({ data, isSwedish, onChange }: Omit<DmaicToolsPanelProps, 'tool'>) {
  const updateRows = (rows: KaizenRow[]) => onChange({ ...data, kaizenRows: rows })
  const fields: { key: Exclude<keyof KaizenRow, 'id' | 'status'>; label: string }[] = [
    { key: 'issue', label: isSwedish ? 'Problem / möjlighet' : 'Issue / opportunity' },
    { key: 'currentCondition', label: isSwedish ? 'Nuläge' : 'Current condition' },
    { key: 'rootCause', label: isSwedish ? 'Verifierad orsak' : 'Verified cause' },
    { key: 'countermeasure', label: isSwedish ? 'Motåtgärd' : 'Countermeasure' },
    { key: 'owner', label: isSwedish ? 'Ägare' : 'Owner' },
    { key: 'dueDate', label: isSwedish ? 'Klardatum' : 'Due date' },
  ]
  return (
    <section aria-label="Kaizen">
      <div className="quality-table-wrap">
        <table className="quality-table kaizen-table">
          <thead>
            <tr>
              {fields.map((field) => (
                <th key={field.key}>{field.label}</th>
              ))}
              <th>{isSwedish ? 'Status' : 'Status'}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.kaizenRows.map((row, index) => (
              <tr key={row.id}>
                {fields.map((field) => (
                  <td key={field.key}>
                    <input
                      aria-label={`${field.label} ${index + 1}`}
                      type={field.key === 'dueDate' ? 'date' : 'text'}
                      value={row[field.key]}
                      onChange={(event) =>
                        updateRows(
                          data.kaizenRows.map((item) =>
                            item.id === row.id
                              ? { ...item, [field.key]: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </td>
                ))}
                <td>
                  <select
                    aria-label={`${isSwedish ? 'Kaizen-status' : 'Kaizen status'} ${index + 1}`}
                    value={row.status}
                    onChange={(event) =>
                      updateRows(
                        data.kaizenRows.map((item) =>
                          item.id === row.id
                            ? { ...item, status: event.target.value as KaizenRow['status'] }
                            : item,
                        ),
                      )
                    }
                  >
                    <option value="planned">{isSwedish ? 'Planerad' : 'Planned'}</option>
                    <option value="doing">{isSwedish ? 'Pågår' : 'In progress'}</option>
                    <option value="checked">{isSwedish ? 'Kontrollerad' : 'Checked'}</option>
                    <option value="standardized">
                      {isSwedish ? 'Standardiserad' : 'Standardized'}
                    </option>
                  </select>
                </td>
                <td>
                  <button
                    className="icon-button"
                    type="button"
                    aria-label={`${isSwedish ? 'Ta bort Kaizen' : 'Remove Kaizen'} ${index + 1}`}
                    onClick={() => updateRows(data.kaizenRows.filter((item) => item.id !== row.id))}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        className="quality-add-button"
        type="button"
        onClick={() =>
          updateRows([
            ...data.kaizenRows,
            {
              id: newId(),
              issue: '',
              currentCondition: '',
              rootCause: '',
              countermeasure: '',
              owner: '',
              dueDate: '',
              status: 'planned',
            },
          ])
        }
      >
        <Plus size={14} /> {isSwedish ? 'Lägg till förbättring' : 'Add improvement'}
      </button>
    </section>
  )
}

function PokaYokePanel({ data, isSwedish, onChange }: Omit<DmaicToolsPanelProps, 'tool'>) {
  const updateRows = (rows: PokaYokeRow[]) => onChange({ ...data, pokaYokeRows: rows })
  const fields: { key: Exclude<keyof PokaYokeRow, 'id' | 'method' | 'status'>; label: string }[] = [
    { key: 'processStep', label: isSwedish ? 'Processsteg' : 'Process step' },
    { key: 'failureMode', label: isSwedish ? 'Möjligt fel' : 'Possible error' },
    {
      key: 'deviceOrCheck',
      label: isSwedish ? 'Felsäkring / kontroll' : 'Mistake-proofing / check',
    },
    { key: 'verification', label: isSwedish ? 'Verifiering' : 'Verification' },
    { key: 'owner', label: isSwedish ? 'Ägare' : 'Owner' },
  ]
  return (
    <section aria-label="Poka-Yoke">
      <div className="quality-table-wrap">
        <table className="quality-table poka-yoke-table">
          <thead>
            <tr>
              {fields.slice(0, 2).map((field) => (
                <th key={field.key}>{field.label}</th>
              ))}
              <th>{isSwedish ? 'Strategi' : 'Strategy'}</th>
              {fields.slice(2).map((field) => (
                <th key={field.key}>{field.label}</th>
              ))}
              <th>{isSwedish ? 'Status' : 'Status'}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.pokaYokeRows.map((row, index) => (
              <tr key={row.id}>
                {fields.slice(0, 2).map((field) => (
                  <td key={field.key}>
                    <input
                      aria-label={`${field.label} ${index + 1}`}
                      value={row[field.key]}
                      onChange={(event) =>
                        updateRows(
                          data.pokaYokeRows.map((item) =>
                            item.id === row.id
                              ? { ...item, [field.key]: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </td>
                ))}
                <td>
                  <select
                    aria-label={`${isSwedish ? 'Poka-Yoke-strategi' : 'Poka-Yoke strategy'} ${index + 1}`}
                    value={row.method}
                    onChange={(event) =>
                      updateRows(
                        data.pokaYokeRows.map((item) =>
                          item.id === row.id
                            ? { ...item, method: event.target.value as PokaYokeRow['method'] }
                            : item,
                        ),
                      )
                    }
                  >
                    <option value="prevention">{isSwedish ? 'Förebyggande' : 'Prevention'}</option>
                    <option value="detection">{isSwedish ? 'Detekterande' : 'Detection'}</option>
                  </select>
                </td>
                {fields.slice(2).map((field) => (
                  <td key={field.key}>
                    <input
                      aria-label={`${field.label} ${index + 1}`}
                      value={row[field.key]}
                      onChange={(event) =>
                        updateRows(
                          data.pokaYokeRows.map((item) =>
                            item.id === row.id
                              ? { ...item, [field.key]: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </td>
                ))}
                <td>
                  <select
                    aria-label={`${isSwedish ? 'Poka-Yoke-status' : 'Poka-Yoke status'} ${index + 1}`}
                    value={row.status}
                    onChange={(event) =>
                      updateRows(
                        data.pokaYokeRows.map((item) =>
                          item.id === row.id
                            ? { ...item, status: event.target.value as PokaYokeRow['status'] }
                            : item,
                        ),
                      )
                    }
                  >
                    <option value="planned">{isSwedish ? 'Planerad' : 'Planned'}</option>
                    <option value="implemented">{isSwedish ? 'Införd' : 'Implemented'}</option>
                    <option value="verified">{isSwedish ? 'Verifierad' : 'Verified'}</option>
                  </select>
                </td>
                <td>
                  <button
                    className="icon-button"
                    type="button"
                    aria-label={`${isSwedish ? 'Ta bort Poka-Yoke' : 'Remove Poka-Yoke'} ${index + 1}`}
                    onClick={() =>
                      updateRows(data.pokaYokeRows.filter((item) => item.id !== row.id))
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        className="quality-add-button"
        type="button"
        onClick={() =>
          updateRows([
            ...data.pokaYokeRows,
            {
              id: newId(),
              processStep: '',
              failureMode: '',
              method: 'prevention',
              deviceOrCheck: '',
              verification: '',
              owner: '',
              status: 'planned',
            },
          ])
        }
      >
        <Plus size={14} /> {isSwedish ? 'Lägg till felsäkring' : 'Add mistake-proofing control'}
      </button>
    </section>
  )
}

function FaultTreePanel({ data, isSwedish, onChange }: Omit<DmaicToolsPanelProps, 'tool'>) {
  let result: ReturnType<typeof evaluateFaultTree> | null = null
  let error = ''
  if (data.faultTreeNodes.length > 0) {
    try {
      result = evaluateFaultTree(data.faultTreeNodes)
    } catch (caught) {
      error = caught instanceof Error ? caught.message : 'Ogiltigt felträd.'
    }
  }
  const updateNodes = (nodes: FaultTreeNode[]) => onChange({ ...data, faultTreeNodes: nodes })
  return (
    <section aria-label={isSwedish ? 'Felträd' : 'Fault tree'}>
      <div className="quality-table-wrap">
        <table className="quality-table fault-tree-table">
          <thead>
            <tr>
              <th>{isSwedish ? 'Händelse / grind' : 'Event / gate'}</th>
              <th>{isSwedish ? 'Överordnad nod' : 'Parent node'}</th>
              <th>{isSwedish ? 'Typ' : 'Type'}</th>
              <th>{isSwedish ? 'Sannolikhet' : 'Probability'}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.faultTreeNodes.map((node, index) => (
              <tr key={node.id}>
                <td>
                  <input
                    aria-label={`${isSwedish ? 'Felträdshändelse' : 'Fault-tree event'} ${index + 1}`}
                    value={node.label}
                    onChange={(event) =>
                      updateNodes(
                        data.faultTreeNodes.map((item) =>
                          item.id === node.id ? { ...item, label: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </td>
                <td>
                  <select
                    aria-label={`${isSwedish ? 'Överordnad nod' : 'Parent node'} ${index + 1}`}
                    value={node.parentId}
                    onChange={(event) =>
                      updateNodes(
                        data.faultTreeNodes.map((item) =>
                          item.id === node.id ? { ...item, parentId: event.target.value } : item,
                        ),
                      )
                    }
                  >
                    <option value="">{isSwedish ? 'Rot' : 'Root'}</option>
                    {data.faultTreeNodes
                      .filter((item) => item.id !== node.id)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label || item.id}
                        </option>
                      ))}
                  </select>
                </td>
                <td>
                  <select
                    aria-label={`${isSwedish ? 'Felträdstyp' : 'Fault-tree type'} ${index + 1}`}
                    value={node.kind}
                    onChange={(event) =>
                      updateNodes(
                        data.faultTreeNodes.map((item) =>
                          item.id === node.id
                            ? { ...item, kind: event.target.value as FaultTreeNode['kind'] }
                            : item,
                        ),
                      )
                    }
                  >
                    <option value="event">{isSwedish ? 'Bashändelse' : 'Basic event'}</option>
                    <option value="and">AND-grind</option>
                    <option value="or">OR-grind</option>
                  </select>
                </td>
                <td>
                  <input
                    aria-label={`${isSwedish ? 'Händelsesannolikhet' : 'Event probability'} ${index + 1}`}
                    type="number"
                    min="0"
                    max="1"
                    step="any"
                    disabled={node.kind !== 'event'}
                    value={node.probability}
                    onChange={(event) =>
                      updateNodes(
                        data.faultTreeNodes.map((item) =>
                          item.id === node.id
                            ? { ...item, probability: Number(event.target.value) }
                            : item,
                        ),
                      )
                    }
                  />
                </td>
                <td>
                  <button
                    className="icon-button"
                    type="button"
                    aria-label={`${isSwedish ? 'Ta bort felträdsnod' : 'Remove fault-tree node'} ${index + 1}`}
                    onClick={() =>
                      updateNodes(
                        data.faultTreeNodes
                          .filter((item) => item.id !== node.id)
                          .map((item) =>
                            item.parentId === node.id ? { ...item, parentId: node.parentId } : item,
                          ),
                      )
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="quality-tool-actions">
        <button
          className="quality-add-button"
          type="button"
          onClick={() =>
            updateNodes([
              ...data.faultTreeNodes,
              { id: newId(), parentId: '', label: '', kind: 'or', probability: 0 },
            ])
          }
        >
          <Plus size={14} /> {isSwedish ? 'Lägg till grind / nod' : 'Add gate / event'}
        </button>
        <button
          className="quality-add-button"
          type="button"
          disabled={data.faultTreeNodes.length === 0}
          onClick={() => {
            const root = data.faultTreeNodes.find((node) => !node.parentId)
            updateNodes([
              ...data.faultTreeNodes,
              { id: newId(), parentId: root?.id ?? '', label: '', kind: 'event', probability: 0 },
            ])
          }}
        >
          <Plus size={14} /> {isSwedish ? 'Lägg till underhändelse' : 'Add child event'}
        </button>
      </div>
      {data.faultTreeNodes.length === 0 && (
        <p className="session-caption">
          {isSwedish
            ? 'Börja med en rotnod och lägg sedan till underhändelser.'
            : 'Start with a root node, then add child events.'}
        </p>
      )}
      {error && (
        <p className="quality-error" role="alert">
          {error}
        </p>
      )}
      {result && (
        <div className="stat-grid quality-metrics-grid">
          <DmaicMetric label={isSwedish ? 'Topp-händelse' : 'Top event'} value={result.root} />
          <DmaicMetric
            label={isSwedish ? 'Oberäknad sannolikhet' : 'Top-event probability'}
            value={`${number(result.probability * 100, isSwedish)}%`}
          />
        </div>
      )}
      <p className="session-caption">
        {isSwedish
          ? 'AND multiplicerar oberoende underhändelser; OR beräknas som 1 − produkten av komplementen. Oberoende antas mellan grenar.'
          : 'AND multiplies independent child events; OR is 1 minus the product of complements. Independence between branches is assumed.'}
      </p>
    </section>
  )
}

function CopqPanel({ data, isSwedish, onChange }: Omit<DmaicToolsPanelProps, 'tool'>) {
  let result: ReturnType<typeof calculateCopq> | null = null
  let error = ''
  try {
    result = calculateCopq(data.copq)
  } catch (caught) {
    error = caught instanceof Error ? caught.message : 'Ogiltiga indata.'
  }
  const labels: { key: keyof Omit<CopqInput, 'currency'>; label: string }[] = [
    {
      key: 'internalFailure',
      label: isSwedish ? 'Interna felkostnader' : 'Internal failure costs',
    },
    {
      key: 'externalFailure',
      label: isSwedish ? 'Externa felkostnader' : 'External failure costs',
    },
    { key: 'appraisal', label: isSwedish ? 'Kontroll / appraisal' : 'Appraisal costs' },
    { key: 'prevention', label: isSwedish ? 'Förebyggande kostnader' : 'Prevention costs' },
  ]
  return (
    <section aria-label="Cost of Poor Quality">
      <label className="dialog-field">
        <span>{isSwedish ? 'Valutakod' : 'Currency code'}</span>
        <input
          value={data.copq.currency}
          placeholder={isSwedish ? 't.ex. SEK' : 'e.g. USD'}
          onChange={(event) =>
            onChange({ ...data, copq: { ...data.copq, currency: event.target.value } })
          }
        />
      </label>
      <div className="quality-metrics-inputs">
        {labels.map(({ key, label }) => (
          <label className="dialog-field" key={key}>
            <span>{label}</span>
            <input
              type="number"
              min="0"
              step="any"
              value={data.copq[key]}
              onChange={(event) =>
                onChange({ ...data, copq: { ...data.copq, [key]: Number(event.target.value) } })
              }
            />
          </label>
        ))}
      </div>
      {error && (
        <p className="quality-error" role="alert">
          {error}
        </p>
      )}
      {result && (
        <div className="stat-grid quality-metrics-grid">
          <DmaicMetric
            label="COPQ"
            value={`${data.copq.currency} ${number(result.costOfPoorQuality, isSwedish)}`}
          />
          <DmaicMetric
            label={isSwedish ? 'Förebyggande + kontroll' : 'Prevention + appraisal'}
            value={`${data.copq.currency} ${number(result.costOfGoodQuality, isSwedish)}`}
          />
          <DmaicMetric
            label={isSwedish ? 'Totala kvalitetskostnader' : 'Total quality cost'}
            value={`${data.copq.currency} ${number(result.totalQualityCost, isSwedish)}`}
          />
          <DmaicMetric
            label={isSwedish ? 'Felandel av kvalitetskostnad' : 'Failure share of quality cost'}
            value={
              result.failureCostPercent === null
                ? '—'
                : `${number(result.failureCostPercent, isSwedish)}%`
            }
          />
        </div>
      )}
      <p className="session-caption">
        {isSwedish
          ? 'COPQ summerar interna och externa felkostnader. Förebyggande och kontroll rapporteras separat; ange samma period och valuta för alla poster.'
          : 'COPQ sums internal and external failure costs. Prevention and appraisal are reported separately; use the same period and currency for all entries.'}
      </p>
    </section>
  )
}
