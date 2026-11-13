export type BootstrapStatistic = 'mean' | 'median' | 'standardDeviation' | 'variance'
export type PermutationStatistic = 'mean' | 'median'

export interface BootstrapIntervalResult {
  count: number
  estimate: number
  confidenceInterval: [number, number]
  statistic: BootstrapStatistic
  resamples: number
  alpha: number
  seed: number
}

export interface PermutationDifferenceResult {
  count1: number
  count2: number
  observedDifference: number
  statistic: PermutationStatistic
  pValue: number
  permutations: number
  alpha: number
  seed: number
}

const maximumResamplingWork = 10_000_000

function validateResampling(resamples: number, seed: number, alpha: number, sampleSize: number) {
  if (!Number.isInteger(resamples) || resamples < 100 || resamples > 100_000) {
    throw new Error('Resamples must be an integer from 100 to 100000.')
  }
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new Error('Seed must be an integer between 0 and 4294967295.')
  }
  if (!Number.isFinite(alpha) || alpha <= 0 || alpha >= 1) {
    throw new Error('Alpha must be greater than 0 and less than 1.')
  }
  if (resamples * sampleSize > maximumResamplingWork) {
    throw new Error('Resampling work exceeds the 10000000-operation limit.')
  }
}

function complete(values: readonly (number | null | undefined)[]): number[] {
  const observations = values.filter((value) => value !== null && value !== undefined)
  if (observations.some((value) => !Number.isFinite(value))) {
    throw new Error('Resampling data must contain only finite numbers or missing values.')
  }
  return observations as number[]
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function sampleVariance(values: readonly number[]): number {
  const average = mean(values)
  return values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1)
}

function evaluateStatistic(values: readonly number[], statistic: BootstrapStatistic): number {
  if (statistic === 'mean') return mean(values)
  if (statistic === 'median') return median(values)
  const variance = sampleVariance(values)
  return statistic === 'variance' ? variance : Math.sqrt(variance)
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? sorted[middle - 1] + (sorted[middle] - sorted[middle - 1]) / 2
    : sorted[middle]
}

function quantile(sorted: readonly number[], probability: number): number {
  const position = (sorted.length - 1) * probability
  const lowerIndex = Math.floor(position)
  const upperIndex = Math.ceil(position)
  return sorted[lowerIndex] + (sorted[upperIndex] - sorted[lowerIndex]) * (position - lowerIndex)
}

export function bootstrapInterval(
  values: readonly (number | null | undefined)[],
  statistic: BootstrapStatistic,
  resamples: number,
  seed: number,
  alpha = 0.05,
): BootstrapIntervalResult {
  const observations = complete(values)
  if (observations.length < 2)
    throw new Error('Bootstrap interval requires at least two observations.')
  validateResampling(resamples, seed, alpha, observations.length)
  const estimate = evaluateStatistic(observations, statistic)
  const random = seededRandom(seed)
  const samples = new Array<number>(resamples)
  const sample = new Array<number>(observations.length)
  for (let iteration = 0; iteration < resamples; iteration++) {
    for (let index = 0; index < observations.length; index++) {
      sample[index] = observations[Math.floor(random() * observations.length)]
    }
    samples[iteration] = evaluateStatistic(sample, statistic)
  }
  samples.sort((left, right) => left - right)
  return {
    count: observations.length,
    estimate,
    confidenceInterval: [quantile(samples, alpha / 2), quantile(samples, 1 - alpha / 2)],
    statistic,
    resamples,
    alpha,
    seed,
  }
}

export function permutationDifference(
  firstValues: readonly (number | null | undefined)[],
  secondValues: readonly (number | null | undefined)[],
  permutations: number,
  seed: number,
  alpha = 0.05,
  statistic: PermutationStatistic = 'mean',
): PermutationDifferenceResult {
  const first = complete(firstValues)
  const second = complete(secondValues)
  if (first.length < 2 || second.length < 2) {
    throw new Error('Permutation test requires at least two observations in each group.')
  }
  const pooled = [...first, ...second]
  validateResampling(permutations, seed, alpha, pooled.length)
  const evaluate = statistic === 'mean' ? mean : median
  const observedDifference = evaluate(first) - evaluate(second)
  const shuffled = [...pooled]
  const random = seededRandom(seed)
  let extreme = 0
  for (let iteration = 0; iteration < permutations; iteration++) {
    for (let index = shuffled.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(random() * (index + 1))
      ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
    }
    const permutedDifference =
      evaluate(shuffled.slice(0, first.length)) - evaluate(shuffled.slice(first.length))
    if (Math.abs(permutedDifference) >= Math.abs(observedDifference) - 1e-12) extreme++
  }
  return {
    count1: first.length,
    count2: second.length,
    observedDifference,
    statistic,
    pValue: (extreme + 1) / (permutations + 1),
    permutations,
    alpha,
    seed,
  }
}
