import { describe, expect, it } from 'vitest'
import { bootstrapInterval, permutationDifference } from '../resampling'

describe('resampling inference', () => {
  it('creates deterministic percentile bootstrap intervals for means and medians', () => {
    const values = [1, 2, 3, 4, 5]
    const meanResult = bootstrapInterval(values, 'mean', 5000, 123)
    expect(meanResult).toEqual(bootstrapInterval(values, 'mean', 5000, 123))
    expect(meanResult.estimate).toBe(3)
    expect(meanResult.confidenceInterval[0]).toBeLessThanOrEqual(3)
    expect(meanResult.confidenceInterval[1]).toBeGreaterThanOrEqual(3)

    const medianResult = bootstrapInterval(values, 'median', 5000, 123)
    expect(medianResult.estimate).toBe(3)
    expect(medianResult.confidenceInterval[0]).toBeLessThanOrEqual(
      medianResult.confidenceInterval[1],
    )
    expect(bootstrapInterval(values, 'standardDeviation', 5000, 123).estimate).toBeCloseTo(
      Math.sqrt(2.5),
      12,
    )
    expect(bootstrapInterval(values, 'variance', 5000, 123).estimate).toBeCloseTo(2.5, 12)
  })

  it('estimates the two-sided permutation p-value for a small exact fixture', () => {
    const result = permutationDifference([1, 2, 3], [4, 5, 6], 20000, 19)
    expect(result).toEqual(permutationDifference([1, 2, 3], [4, 5, 6], 20000, 19))
    expect(result.observedDifference).toBe(-3)
    expect(result.pValue).toBeCloseTo(0.1, 2)
    const medianResult = permutationDifference([1, 2, 100], [3, 4, 5], 20000, 19, 0.05, 'median')
    expect(medianResult.statistic).toBe('median')
    expect(medianResult.observedDifference).toBe(-2)
    expect(medianResult.pValue).toBeGreaterThan(0)
    expect(medianResult.pValue).toBeLessThanOrEqual(1)
  })

  it('rejects invalid sample sizes, alpha, seed, nonfinite data, and excessive work', () => {
    expect(() => bootstrapInterval([1], 'mean', 100, 1)).toThrow(
      'Bootstrap interval requires at least two observations.',
    )
    expect(() => bootstrapInterval([1, 2], 'mean', 99, 1)).toThrow(
      'Resamples must be an integer from 100 to 100000.',
    )
    expect(() => bootstrapInterval([1, Number.NaN], 'mean', 100, 1)).toThrow(
      'Resampling data must contain only finite numbers or missing values.',
    )
    expect(() => permutationDifference([1], [2, 3], 100, 1)).toThrow(
      'Permutation test requires at least two observations in each group.',
    )
    expect(() => bootstrapInterval([1, 2], 'mean', 100, 1, 1)).toThrow(
      'Alpha must be greater than 0 and less than 1.',
    )
    expect(() => bootstrapInterval([1, 2], 'mean', 100, -1)).toThrow(
      'Seed must be an integer between 0 and 4294967295.',
    )
    expect(() => bootstrapInterval(new Array(101).fill(1), 'mean', 100000, 1)).toThrow(
      'Resampling work exceeds the 10000000-operation limit.',
    )
  })
})
