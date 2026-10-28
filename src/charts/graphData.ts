export type GraphKind =
  'histogram' | 'boxplot' | 'individual' | 'scatter' | 'bar' | 'pareto' | 'ecdf' | 'timeSeries'

export interface GraphTrace {
  type: 'histogram' | 'box' | 'scatter' | 'bar'
  name: string
  x?: (number | string)[]
  y?: number[]
  mode?: 'markers' | 'lines+markers' | 'lines'
  lineShape?: 'hv'
  yAxis?: 'y2'
}

export interface GraphModel {
  kind: GraphKind
  title: string
  xTitle: string
  yTitle: string
  sampleCount: number
  data: GraphTrace[]
  cumulativeAxis: boolean
}

export interface GraphInput {
  kind: GraphKind
  values?: readonly (number | null | undefined)[]
  xValues?: readonly (number | null | undefined)[]
  categories?: readonly (string | null | undefined)[]
  language: string
}

export function buildGraph(input: GraphInput): GraphModel {
  const isSwedish = input.language === 'sv'
  const numeric = input.values ? numericValues(input.values) : []
  const categorical = input.categories ?? []

  switch (input.kind) {
    case 'histogram': {
      requireNumeric(numeric)
      return model(input.kind, isSwedish, numeric.length, [
        { type: 'histogram', name: isSwedish ? 'Frekvens' : 'Frequency', x: numeric },
      ])
    }
    case 'boxplot':
    case 'individual': {
      const paired = pairWithCategories(input.values ?? [], categorical)
      if (categorical.length > 0 && paired.length === 0) {
        throw new Error(
          'Inga kompletta numeriska observationer med gruppvärden finns för diagrammet.',
        )
      }
      requireNumeric(paired.length ? paired.map((point) => point.value) : numeric)
      if (categorical.length > 0) {
        const groups = groupByCategory(paired)
        return model(
          input.kind,
          isSwedish,
          paired.length,
          input.kind === 'boxplot'
            ? groups.map(([name, values]) => ({ type: 'box', name, y: values }))
            : groups.map(([name, values]) => ({
                type: 'scatter',
                mode: 'markers',
                name,
                x: values.map(() => name),
                y: values,
              })),
        )
      }
      return model(input.kind, isSwedish, numeric.length, [
        input.kind === 'boxplot'
          ? { type: 'box', name: isSwedish ? 'Mätvärden' : 'Measurements', y: numeric }
          : {
              type: 'scatter',
              mode: 'markers',
              name: isSwedish ? 'Mätvärde' : 'Measurement',
              x: numeric.map((_, index) => index + 1),
              y: numeric,
            },
      ])
    }
    case 'scatter': {
      const pairCount = Math.min(input.values?.length ?? 0, input.xValues?.length ?? 0)
      const points: { x: number; y: number }[] = []
      for (let index = 0; index < pairCount; index += 1) {
        const x = input.xValues?.[index]
        const y = input.values?.[index]
        if (x === null || x === undefined || y === null || y === undefined) continue
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          throw new Error('Punktdiagrammet innehåller värden som inte är ändliga tal.')
        }
        points.push({ x, y })
      }
      requireNumeric(points.map((point) => point.x))
      return model(input.kind, isSwedish, points.length, [
        {
          type: 'scatter',
          mode: 'markers',
          name: isSwedish ? 'Observationer' : 'Observations',
          x: points.map((point) => point.x),
          y: points.map((point) => point.y),
        },
      ])
    }
    case 'bar':
    case 'pareto': {
      const validCategories = categorical.filter(isCategory)
      const counts = countCategories(validCategories)
      if (counts.length === 0)
        throw new Error('Minst en kategorisk observation krävs för diagrammet.')
      const ordered =
        input.kind === 'pareto'
          ? [...counts].sort(
              (left, right) => right.count - left.count || left.name.localeCompare(right.name),
            )
          : counts
      const labels = ordered.map((item) => item.name)
      const frequencies = ordered.map((item) => item.count)
      const data: GraphTrace[] = [
        {
          type: 'bar',
          name: isSwedish ? 'Frekvens' : 'Frequency',
          x: labels,
          y: frequencies,
        },
      ]
      if (input.kind === 'pareto') {
        let cumulative = 0
        data.push({
          type: 'scatter',
          mode: 'lines+markers',
          name: isSwedish ? 'Kumulativ procent' : 'Cumulative percent',
          x: labels,
          y: frequencies.map((frequency) => {
            cumulative += frequency
            return (100 * cumulative) / validCategories.length
          }),
          yAxis: 'y2',
        })
      }
      return model(input.kind, isSwedish, validCategories.length, data)
    }
    case 'ecdf': {
      requireNumeric(numeric)
      const ordered = [...numeric].sort((left, right) => left - right)
      return model(input.kind, isSwedish, ordered.length, [
        {
          type: 'scatter',
          mode: 'lines',
          lineShape: 'hv',
          name: isSwedish ? 'Empirisk CDF' : 'Empirical CDF',
          x: ordered,
          y: ordered.map((_, index) => (index + 1) / ordered.length),
        },
      ])
    }
    case 'timeSeries': {
      const observations = (input.values ?? [])
        .map((value, index) => ({ value, observation: index + 1 }))
        .filter(
          (point): point is { value: number; observation: number } =>
            point.value !== null && point.value !== undefined,
        )
      if (observations.some((point) => !Number.isFinite(point.value))) {
        throw new Error('Tidsserien innehåller värden som inte är ändliga tal.')
      }
      requireNumeric(observations.map((point) => point.value))
      return model(input.kind, isSwedish, observations.length, [
        {
          type: 'scatter',
          mode: 'lines+markers',
          name: isSwedish ? 'Mätvärde' : 'Measurement',
          x: observations.map((point) => point.observation),
          y: observations.map((point) => point.value),
        },
      ])
    }
  }
}

function model(
  kind: GraphKind,
  isSwedish: boolean,
  sampleCount: number,
  data: GraphTrace[],
): GraphModel {
  const labels: Record<GraphKind, [string, string, string]> = {
    histogram: [
      isSwedish ? 'Histogram' : 'Histogram',
      isSwedish ? 'Mätvärde' : 'Measurement',
      isSwedish ? 'Frekvens' : 'Frequency',
    ],
    boxplot: [
      isSwedish ? 'Lådagram' : 'Boxplot',
      isSwedish ? 'Grupp' : 'Group',
      isSwedish ? 'Mätvärde' : 'Measurement',
    ],
    individual: [
      isSwedish ? 'Individvärdediagram' : 'Individual value plot',
      isSwedish ? 'Grupp / observation' : 'Group / observation',
      isSwedish ? 'Mätvärde' : 'Measurement',
    ],
    scatter: [
      isSwedish ? 'Punktdiagram' : 'Scatterplot',
      isSwedish ? 'X-värde' : 'X value',
      isSwedish ? 'Y-värde' : 'Y value',
    ],
    bar: [
      isSwedish ? 'Stapeldiagram' : 'Bar chart',
      isSwedish ? 'Kategori' : 'Category',
      isSwedish ? 'Frekvens' : 'Frequency',
    ],
    pareto: [
      'Pareto',
      isSwedish ? 'Kategori' : 'Category',
      isSwedish ? 'Frekvens / kumulativ procent' : 'Frequency / cumulative percent',
    ],
    ecdf: [
      isSwedish ? 'Empirisk fördelningsfunktion' : 'Empirical CDF',
      isSwedish ? 'Mätvärde' : 'Measurement',
      'F(x)',
    ],
    timeSeries: [
      isSwedish ? 'Tidsseriediagram' : 'Time series plot',
      isSwedish ? 'Observation' : 'Observation',
      isSwedish ? 'Mätvärde' : 'Measurement',
    ],
  }
  const [title, xTitle, yTitle] = labels[kind]
  return { kind, title, xTitle, yTitle, sampleCount, data, cumulativeAxis: kind === 'pareto' }
}

function numericValues(values: readonly (number | null | undefined)[]): number[] {
  const present = values.filter(isPresent)
  if (present.some((value) => !Number.isFinite(value))) {
    throw new Error('Diagrammet innehåller värden som inte är ändliga tal.')
  }
  return present
}

function requireNumeric(values: readonly number[]) {
  if (values.length === 0) throw new Error('Minst ett numeriskt värde krävs för diagrammet.')
}

function pairWithCategories(
  values: readonly (number | null | undefined)[],
  categories: readonly (string | null | undefined)[],
): { value: number; category: string }[] {
  if (categories.length === 0) return []
  const points: { value: number; category: string }[] = []
  for (let index = 0; index < Math.min(values.length, categories.length); index += 1) {
    const value = values[index]
    const category = categories[index]
    if (
      value === null ||
      value === undefined ||
      category === null ||
      category === undefined ||
      category === ''
    )
      continue
    if (!Number.isFinite(value))
      throw new Error('Diagrammet innehåller värden som inte är ändliga tal.')
    points.push({ value, category })
  }
  return points
}

function groupByCategory(
  points: readonly { value: number; category: string }[],
): [string, number[]][] {
  const groups = new Map<string, number[]>()
  points.forEach(({ category, value }) => {
    const values = groups.get(category) ?? []
    values.push(value)
    groups.set(category, values)
  })
  return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right))
}

function countCategories(categories: readonly (string | null | undefined)[]) {
  const counts = new Map<string, number>()
  categories.forEach((category) => {
    if (!isPresent(category) || category === '') return
    counts.set(category, (counts.get(category) ?? 0) + 1)
  })
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => left.name.localeCompare(right.name))
}

function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

function isCategory(value: string | null | undefined): value is string {
  return value !== null && value !== undefined && value.length > 0
}
