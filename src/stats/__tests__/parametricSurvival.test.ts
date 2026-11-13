import { describe, expect, it } from 'vitest'
import { parametricSurvival } from '../parametricSurvival'

describe('parametricSurvival', () => {
  it('matches the closed-form exponential MLE with uncensored observations', () => {
    const result = parametricSurvival([2, 4, 6], [1, 1, 1])
    const exponential = result.groups[0].fits.find((fit) => fit.distribution === 'exponential')!
    const expectedLogLikelihood = -3 * Math.log(4) - 3

    expect(exponential.scale).toBe(4)
    expect(exponential.median).toBeCloseTo(4 * Math.LN2, 12)
    expect(exponential.logLikelihood).toBeCloseTo(expectedLogLikelihood, 12)
    expect(exponential.aic).toBeCloseTo(2 - 2 * expectedLogLikelihood, 12)
    expect(exponential.bic).toBeCloseTo(Math.log(3) - 2 * expectedLogLikelihood, 12)
  })

  it('fits Weibull and exponential models using right-censored likelihood terms', () => {
    const result = parametricSurvival([1, 2, 4, 6], [1, 1, 0, 0])
    const group = result.groups[0]
    const exponential = group.fits.find((fit) => fit.distribution === 'exponential')!
    const weibull = group.fits.find((fit) => fit.distribution === 'weibull')!

    expect(result.count).toBe(4)
    expect(group.eventCount).toBe(2)
    expect(exponential.scale).toBe(6.5)
    expect(weibull.shape).toBeGreaterThan(0)
    expect(weibull.scale).toBeGreaterThan(0)
    expect(weibull.logLikelihood).toBeGreaterThanOrEqual(exponential.logLikelihood - 1e-10)
    expect(weibull.aic).toBeGreaterThan(weibull.logLikelihood * -2)
    expect(result.curves).toHaveLength(2)
    expect(
      result.curves.every((curve) => curve.times.length === 81 && curve.survival[0] === 1),
    ).toBe(true)
  })

  it('returns an unavailable group fit when no events occur and handles boundary shape estimates', () => {
    const censored = parametricSurvival([1, 2, 3], [0, 0, 0])
    expect(censored.groups[0].fits).toEqual([])
    expect(censored.groups[0].unavailableReason).toMatch(/event is required/)

    const equalFailureTimes = parametricSurvival([1, 1, 1], [1, 1, 0])
    expect(equalFailureTimes.groups[0].fits.map((fit) => fit.distribution)).toEqual(['exponential'])
    expect(equalFailureTimes.groups[0].unavailableReason).toMatch(/Weibull shape/)

    const zeroTime = parametricSurvival([0, 2, 3], [1, 1, 0])
    expect(zeroTime.groups[0].fits.map((fit) => fit.distribution)).toEqual(['exponential'])
    expect(zeroTime.groups[0].unavailableReason).toMatch(/strictly positive/)
  })

  it('rejects invalid time/status, mismatched arrays, and more than two groups', () => {
    expect(() => parametricSurvival([1], [1, 0])).toThrow('same number of rows')
    expect(() => parametricSurvival([-1], [1])).toThrow('finite nonnegative value')
    expect(() => parametricSurvival([1], [2])).toThrow('must be coded 0 (censored) or 1 (event)')
    expect(() => parametricSurvival([1, 2, 3], [1, 1, 1], ['A', 'B', 'C'])).toThrow(
      'at most two groups.',
    )
  })
})
