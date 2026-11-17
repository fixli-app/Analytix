export type SwotQuadrant = 'strengths' | 'weaknesses' | 'opportunities' | 'threats'

export type DmaicToolsTab =
  | 'swot'
  | 'brainstorm'
  | 'decision'
  | 'pugh'
  | 'relations'
  | 'kaizen'
  | 'pokaYoke'
  | 'faultTree'
  | 'copq'
  | 'benchmark'
  | 'beforeAfter'

export interface SwotRow {
  id: string
  text: string
}

export interface BrainstormRow {
  id: string
  idea: string
  affinityGroup: string
}

export interface DecisionCriterion {
  id: string
  name: string
  weight: number
}

export interface DecisionAlternative {
  id: string
  name: string
  scores: Record<string, number>
}

export interface DecisionAlternativeResult {
  id: string
  name: string
  weightedScore: number
  maximumScore: number
  normalizedScore: number
}

export type PughScore = 'plus' | 'same' | 'minus'

export interface PughCriterion {
  id: string
  name: string
}

export interface PughAlternative {
  id: string
  name: string
  scores: Record<string, PughScore>
}

export interface PughAlternativeResult {
  id: string
  name: string
  plus: number
  same: number
  minus: number
  net: number
}

export interface RelationNode {
  id: string
  label: string
}

export interface RelationLink {
  id: string
  fromId: string
  toId: string
}

export interface RelationNodeResult {
  id: string
  label: string
  outgoing: number
  incoming: number
  totalConnections: number
}

export interface BenchmarkRow {
  id: string
  metric: string
  ours: number
  benchmark: number
  direction: 'higher' | 'lower'
  unit: string
}

export interface BenchmarkResult {
  id: string
  metric: string
  ours: number
  benchmark: number
  unit: string
  gap: number
  gapPercent: number | null
  position: 'behind' | 'at' | 'ahead'
}

export interface BeforeAfterRow {
  id: string
  metric: string
  before: number
  after: number
  direction: 'higher' | 'lower'
  unit: string
}

export interface BeforeAfterResult {
  id: string
  metric: string
  before: number
  after: number
  unit: string
  change: number
  improvement: number
  improvementPercent: number | null
  status: 'improved' | 'unchanged' | 'worsened'
}

export interface KaizenRow {
  id: string
  issue: string
  currentCondition: string
  rootCause: string
  countermeasure: string
  owner: string
  dueDate: string
  status: 'planned' | 'doing' | 'checked' | 'standardized'
}

export interface PokaYokeRow {
  id: string
  processStep: string
  failureMode: string
  method: 'prevention' | 'detection'
  deviceOrCheck: string
  verification: string
  owner: string
  status: 'planned' | 'implemented' | 'verified'
}

export interface FaultTreeNode {
  id: string
  parentId: string
  label: string
  kind: 'and' | 'or' | 'event'
  probability: number
}

export interface CopqInput {
  currency: string
  internalFailure: number
  externalFailure: number
  appraisal: number
  prevention: number
}

export interface CopqResult {
  costOfPoorQuality: number
  costOfGoodQuality: number
  totalQualityCost: number
  failureCostPercent: number | null
  categoryPercent: Record<keyof Omit<CopqInput, 'currency'>, number | null>
}

export interface DmaicToolsWorkspace {
  swot: Record<SwotQuadrant, SwotRow[]>
  brainstormRows: BrainstormRow[]
  decisionCriteria: DecisionCriterion[]
  decisionAlternatives: DecisionAlternative[]
  pughCriteria: PughCriterion[]
  pughAlternatives: PughAlternative[]
  pughBaselineId: string
  relationNodes: RelationNode[]
  relationLinks: RelationLink[]
  benchmarkRows: BenchmarkRow[]
  beforeAfterRows: BeforeAfterRow[]
  kaizenRows: KaizenRow[]
  pokaYokeRows: PokaYokeRow[]
  faultTreeNodes: FaultTreeNode[]
  copq: CopqInput
}

export function calculatePughMatrix(
  criteria: readonly PughCriterion[],
  alternatives: readonly PughAlternative[],
  baselineId: string,
): PughAlternativeResult[] {
  if (criteria.length === 0) throw new Error('Pugh-matrisen kräver minst ett kriterium.')
  if (alternatives.length < 2)
    throw new Error('Pugh-matrisen kräver en baslinje och minst ett alternativ.')
  if (!alternatives.some((alternative) => alternative.id === baselineId)) {
    throw new Error('Välj en baslinje som finns i Pugh-matrisen.')
  }
  criteria.forEach((criterion, index) => {
    if (!criterion.name.trim()) throw new Error(`Pugh-kriterium ${index + 1} saknar namn.`)
  })
  alternatives.forEach((alternative) => {
    if (!alternative.name.trim()) throw new Error('Alla Pugh-alternativ måste ha namn.')
  })
  const baseline = alternatives.find((alternative) => alternative.id === baselineId)!
  criteria.forEach((criterion) => {
    if (baseline.scores[criterion.id] !== 'same') {
      throw new Error('Baslinjens betyg måste vara samma för varje kriterium.')
    }
  })
  return alternatives
    .filter((alternative) => alternative.id !== baselineId)
    .map((alternative) => {
      let plus = 0
      let same = 0
      let minus = 0
      criteria.forEach((criterion) => {
        const score = alternative.scores[criterion.id]
        if (score === 'plus') plus += 1
        else if (score === 'same') same += 1
        else if (score === 'minus') minus += 1
        else throw new Error(`Sätt ett Pugh-betyg för ${alternative.name} och ${criterion.name}.`)
      })
      return {
        id: alternative.id,
        name: alternative.name.trim(),
        plus,
        same,
        minus,
        net: plus - minus,
      }
    })
    .sort((left, right) => right.net - left.net || left.name.localeCompare(right.name))
}

export function analyzeRelations(
  nodes: readonly RelationNode[],
  links: readonly RelationLink[],
): RelationNodeResult[] {
  if (nodes.length < 2) throw new Error('Relationsdiagram kräver minst två faktorer.')
  const nodeIds = new Set(nodes.map((node) => node.id))
  if (nodeIds.size !== nodes.length || nodes.some((node) => !node.label.trim())) {
    throw new Error('Relationsfaktorer måste ha unika ID:n och ifyllda namn.')
  }
  const linkIds = new Set<string>()
  const pairs = new Set<string>()
  const counts = new Map(nodes.map((node) => [node.id, { outgoing: 0, incoming: 0 }]))
  links.forEach((link) => {
    if (linkIds.has(link.id)) throw new Error('Relations-ID:n måste vara unika.')
    linkIds.add(link.id)
    if (!nodeIds.has(link.fromId) || !nodeIds.has(link.toId)) {
      throw new Error('Varje relation måste länka två befintliga faktorer.')
    }
    if (link.fromId === link.toId) throw new Error('En faktor kan inte relatera till sig själv.')
    const pair = JSON.stringify([link.fromId, link.toId])
    if (pairs.has(pair)) throw new Error('Samma riktade relation kan bara läggas till en gång.')
    pairs.add(pair)
    counts.get(link.fromId)!.outgoing += 1
    counts.get(link.toId)!.incoming += 1
  })
  return nodes
    .map((node) => {
      const count = counts.get(node.id)!
      return {
        id: node.id,
        label: node.label.trim(),
        ...count,
        totalConnections: count.incoming + count.outgoing,
      }
    })
    .sort(
      (left, right) =>
        right.totalConnections - left.totalConnections || left.label.localeCompare(right.label),
    )
}

export function compareBenchmark(rows: readonly BenchmarkRow[]): BenchmarkResult[] {
  return rows.map((row, index) => {
    if (!row.metric.trim()) throw new Error(`Benchmarkmått ${index + 1} saknar namn.`)
    if (!Number.isFinite(row.ours) || !Number.isFinite(row.benchmark)) {
      throw new Error(`Benchmarkvärden för ${row.metric} måste vara ändliga tal.`)
    }
    const gap = row.direction === 'higher' ? row.benchmark - row.ours : row.ours - row.benchmark
    const position = gap > 0 ? 'behind' : gap < 0 ? 'ahead' : 'at'
    return {
      id: row.id,
      metric: row.metric.trim(),
      ours: row.ours,
      benchmark: row.benchmark,
      unit: row.unit,
      gap,
      gapPercent: row.benchmark === 0 ? null : (gap / Math.abs(row.benchmark)) * 100,
      position,
    }
  })
}

export function compareBeforeAfter(rows: readonly BeforeAfterRow[]): BeforeAfterResult[] {
  return rows.map((row, index) => {
    if (!row.metric.trim()) throw new Error(`Före/efter-mått ${index + 1} saknar namn.`)
    if (!Number.isFinite(row.before) || !Number.isFinite(row.after)) {
      throw new Error(`Före/efter-värden för ${row.metric} måste vara ändliga tal.`)
    }
    const change = row.after - row.before
    const improvement = row.direction === 'higher' ? change : -change
    return {
      id: row.id,
      metric: row.metric.trim(),
      before: row.before,
      after: row.after,
      unit: row.unit,
      change,
      improvement,
      improvementPercent: row.before === 0 ? null : (improvement / Math.abs(row.before)) * 100,
      status: improvement > 0 ? 'improved' : improvement < 0 ? 'worsened' : 'unchanged',
    }
  })
}

export function calculateDecisionMatrix(
  criteria: readonly DecisionCriterion[],
  alternatives: readonly DecisionAlternative[],
): DecisionAlternativeResult[] {
  if (criteria.length < 2) throw new Error('Minst två beslutscriteria krävs.')
  if (alternatives.length < 2) throw new Error('Minst två alternativ krävs.')
  const criterionIds = new Set<string>()
  criteria.forEach((criterion, index) => {
    if (!criterion.name.trim()) throw new Error(`Kriterium ${index + 1} saknar namn.`)
    if (criterionIds.has(criterion.id)) throw new Error('Kriterie-ID:n måste vara unika.')
    criterionIds.add(criterion.id)
    if (!Number.isInteger(criterion.weight) || criterion.weight < 1 || criterion.weight > 5) {
      throw new Error('Kriterievikt måste vara ett heltal mellan 1 och 5.')
    }
  })
  const names = new Set<string>()
  const maximumScore = criteria.reduce((sum, criterion) => sum + criterion.weight * 5, 0)
  const results = alternatives.map((alternative, index) => {
    const name = alternative.name.trim()
    if (!name) throw new Error(`Alternativ ${index + 1} saknar namn.`)
    if (names.has(name)) throw new Error('Alternativnamn måste vara unika.')
    names.add(name)
    const weightedScore = criteria.reduce((sum, criterion) => {
      const score = alternative.scores[criterion.id]
      if (!Number.isInteger(score) || score < 1 || score > 5) {
        throw new Error(`Betyg för ${name} måste vara ett heltal mellan 1 och 5.`)
      }
      return sum + criterion.weight * score
    }, 0)
    return {
      id: alternative.id,
      name,
      weightedScore,
      maximumScore,
      normalizedScore: (weightedScore / maximumScore) * 100,
    }
  })
  return results.sort(
    (left, right) =>
      right.weightedScore - left.weightedScore || left.name.localeCompare(right.name),
  )
}

export function calculateCopq(input: CopqInput): CopqResult {
  const categories: (keyof Omit<CopqInput, 'currency'>)[] = [
    'internalFailure',
    'externalFailure',
    'appraisal',
    'prevention',
  ]
  categories.forEach((category) => {
    const value = input[category]
    if (!Number.isFinite(value) || value < 0) {
      throw new Error('Kvalitetskostnader måste vara ändliga och icke-negativa.')
    }
  })
  const costOfPoorQuality = input.internalFailure + input.externalFailure
  const costOfGoodQuality = input.appraisal + input.prevention
  const totalQualityCost = costOfPoorQuality + costOfGoodQuality
  return {
    costOfPoorQuality,
    costOfGoodQuality,
    totalQualityCost,
    failureCostPercent:
      totalQualityCost === 0 ? null : (costOfPoorQuality / totalQualityCost) * 100,
    categoryPercent: Object.fromEntries(
      categories.map((category) => [
        category,
        totalQualityCost === 0 ? null : (input[category] / totalQualityCost) * 100,
      ]),
    ) as CopqResult['categoryPercent'],
  }
}

export function evaluateFaultTree(nodes: readonly FaultTreeNode[]) {
  if (nodes.length === 0)
    throw new Error('Felträdet måste innehålla minst en händelse eller grind.')
  const byId = new Map<string, FaultTreeNode>()
  nodes.forEach((node) => {
    if (!node.id || byId.has(node.id))
      throw new Error('Felträds-ID:n måste vara unika och ifyllda.')
    if (!node.label.trim()) throw new Error('Varje felträdsnod måste ha en beskrivning.')
    byId.set(node.id, node)
  })
  const children = new Map<string, FaultTreeNode[]>()
  nodes.forEach((node) => {
    if (!node.parentId) return
    if (!byId.has(node.parentId)) throw new Error('Överordnad felträdsnod saknas.')
    if (node.parentId === node.id)
      throw new Error('En felträdsnod kan inte vara sin egen förälder.')
    const siblings = children.get(node.parentId) ?? []
    siblings.push(node)
    children.set(node.parentId, siblings)
  })

  const ancestry = new Set<string>()
  const checkedAncestry = new Set<string>()
  const checkAncestry = (id: string) => {
    if (ancestry.has(id)) throw new Error('Felträdet innehåller en cykel.')
    if (checkedAncestry.has(id)) return
    ancestry.add(id)
    const parentId = byId.get(id)!.parentId
    if (parentId) checkAncestry(parentId)
    ancestry.delete(id)
    checkedAncestry.add(id)
  }
  nodes.forEach((node) => checkAncestry(node.id))

  const roots = nodes.filter((node) => !node.parentId)
  if (roots.length !== 1) throw new Error('Felträdet måste ha exakt en rotnod.')

  const visiting = new Set<string>()
  const visited = new Map<string, number>()
  const evaluate = (node: FaultTreeNode): number => {
    const existing = visited.get(node.id)
    if (existing !== undefined) return existing
    if (visiting.has(node.id)) throw new Error('Felträdet innehåller en cykel.')
    visiting.add(node.id)
    const descendants = children.get(node.id) ?? []
    let probability: number
    if (node.kind === 'event') {
      if (descendants.length > 0) throw new Error('En bashändelse kan inte ha undernoder.')
      if (!Number.isFinite(node.probability) || node.probability < 0 || node.probability > 1) {
        throw new Error('Bashändelsens sannolikhet måste vara mellan 0 och 1.')
      }
      probability = node.probability
    } else {
      if (descendants.length < 2) throw new Error('AND/OR-grindar kräver minst två underhändelser.')
      const childProbabilities = descendants.map(evaluate)
      probability =
        node.kind === 'and'
          ? childProbabilities.reduce((product, value) => product * value, 1)
          : 1 - childProbabilities.reduce((product, value) => product * (1 - value), 1)
    }
    visiting.delete(node.id)
    visited.set(node.id, probability)
    return probability
  }

  return { root: roots[0].label, probability: evaluate(roots[0]) }
}

export interface SwotWorkspace {
  strengths: SwotRow[]
  weaknesses: SwotRow[]
  opportunities: SwotRow[]
  threats: SwotRow[]
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function createDefaultDmaicTools(): DmaicToolsWorkspace {
  const firstCriterionId = newId()
  const secondCriterionId = newId()
  const firstPughCriterionId = newId()
  const secondPughCriterionId = newId()
  const baselineId = newId()
  const decisionAlternativeId = newId()
  return {
    swot: {
      strengths: [{ id: newId(), text: '' }],
      weaknesses: [{ id: newId(), text: '' }],
      opportunities: [{ id: newId(), text: '' }],
      threats: [{ id: newId(), text: '' }],
    },
    brainstormRows: [{ id: newId(), idea: '', affinityGroup: '' }],
    decisionCriteria: [
      { id: firstCriterionId, name: '', weight: 3 },
      { id: secondCriterionId, name: '', weight: 3 },
    ],
    decisionAlternatives: [
      {
        id: baselineId,
        name: '',
        scores: { [firstCriterionId]: 3, [secondCriterionId]: 3 },
      },
      {
        id: decisionAlternativeId,
        name: '',
        scores: { [firstCriterionId]: 3, [secondCriterionId]: 3 },
      },
    ],
    pughCriteria: [
      { id: firstPughCriterionId, name: '' },
      { id: secondPughCriterionId, name: '' },
    ],
    pughAlternatives: [
      {
        id: baselineId,
        name: '',
        scores: { [firstPughCriterionId]: 'same', [secondPughCriterionId]: 'same' },
      },
      {
        id: decisionAlternativeId,
        name: '',
        scores: { [firstPughCriterionId]: 'same', [secondPughCriterionId]: 'same' },
      },
    ],
    pughBaselineId: baselineId,
    relationNodes: [
      { id: newId(), label: '' },
      { id: newId(), label: '' },
    ],
    relationLinks: [],
    benchmarkRows: [
      { id: newId(), metric: '', ours: 0, benchmark: 0, direction: 'higher', unit: '' },
    ],
    beforeAfterRows: [
      { id: newId(), metric: '', before: 0, after: 0, direction: 'higher', unit: '' },
    ],
    kaizenRows: [
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
    ],
    pokaYokeRows: [
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
    ],
    faultTreeNodes: [],
    copq: {
      currency: '',
      internalFailure: 0,
      externalFailure: 0,
      appraisal: 0,
      prevention: 0,
    },
  }
}
