import { describe, expect, it } from 'vitest'
import jStat from 'jstat'
import { powerAndSampleSize } from '../power'

describe('powerAndSampleSize', () => {
  it('matches the two-sided normal power formula for a one-sample Z test', () => {
    const result = powerAndSampleSize({
      test: 'oneSampleZ',
      mode: 'power',
      alpha: 0.05,
      sampleSize: 100,
      targetPower: 0.8,
      nullMean: 10,
      alternativeMean: 11,
      sigma: 10,
    })
    const critical = jStat.normal.inv(0.975, 0, 1)
    const expected =
      1 - jStat.normal.cdf(critical - 1, 0, 1) + jStat.normal.cdf(-critical - 1, 0, 1)

    expect(result.achievedPower).toBeCloseTo(expected, 12)
    expect(result.sampleSizePerGroup).toBe(100)
    expect(result.totalSampleSize).toBe(100)
    expect(result.curve.length).toBeGreaterThan(20)
    expect(result.curve.at(-1)!.power).toBeGreaterThan(result.curve[0].power)
  })

  it('solves the minimum sample size and round-trips the achieved power', () => {
    const size = powerAndSampleSize({
      test: 'oneSampleZ',
      mode: 'sampleSize',
      alpha: 0.05,
      sampleSize: 2,
      targetPower: 0.8,
      nullMean: 0,
      alternativeMean: 0.5,
      sigma: 1,
    })
    const previous = powerAndSampleSize({
      test: 'oneSampleZ',
      mode: 'power',
      alpha: 0.05,
      sampleSize: size.sampleSizePerGroup - 1,
      targetPower: 0.8,
      nullMean: 0,
      alternativeMean: 0.5,
      sigma: 1,
    })

    expect(size.sampleSizePerGroup).toBeGreaterThanOrEqual(2)
    expect(size.achievedPower).toBeGreaterThanOrEqual(0.8)
    expect(previous.achievedPower).toBeLessThan(0.8)
  })

  it('computes two-group sample counts and two-proportion power', () => {
    const means = powerAndSampleSize({
      test: 'twoSampleZ',
      mode: 'sampleSize',
      alpha: 0.05,
      sampleSize: 2,
      targetPower: 0.8,
      mean1: 5,
      mean2: 6,
      sigma1: 2,
      sigma2: 2,
    })
    expect(means.totalSampleSize).toBe(2 * means.sampleSizePerGroup)
    expect(means.achievedPower).toBeGreaterThanOrEqual(0.8)

    const proportions = powerAndSampleSize({
      test: 'twoProportions',
      mode: 'power',
      alpha: 0.05,
      sampleSize: 80,
      targetPower: 0.8,
      proportion1: 0.5,
      proportion2: 0.7,
    })
    expect(proportions.achievedPower).toBeGreaterThan(0.5)
    expect(proportions.totalSampleSize).toBe(160)
  })

  it('supports one- and two-sample Poisson exposure calculations', () => {
    const one = powerAndSampleSize({
      test: 'oneSamplePoisson',
      mode: 'sampleSize',
      alpha: 0.05,
      sampleSize: 2,
      targetPower: 0.8,
      nullRate: 1,
      alternativeRate: 1.5,
      exposure: 2,
    })
    const two = powerAndSampleSize({
      test: 'twoSamplePoisson',
      mode: 'power',
      alpha: 0.05,
      sampleSize: one.sampleSizePerGroup,
      targetPower: 0.8,
      rate1: 1,
      rate2: 1.5,
      exposure: 2,
    })
    expect(one.achievedPower).toBeGreaterThanOrEqual(0.8)
    expect(two.totalSampleSize).toBe(2 * one.sampleSizePerGroup)
    const critical = jStat.normal.inv(0.975, 0, 1)
    const noncentrality = 0.5 * Math.sqrt((2 * one.sampleSizePerGroup) / 2.5)
    const expectedPower =
      1 -
      jStat.normal.cdf(critical - noncentrality, 0, 1) +
      jStat.normal.cdf(-critical - noncentrality, 0, 1)
    expect(two.achievedPower).toBeCloseTo(expectedPower, 12)
  })

  it('rejects invalid alpha, equal alternatives, and impossible sample-size requests', () => {
    expect(() =>
      powerAndSampleSize({
        test: 'oneSampleZ',
        mode: 'power',
        alpha: 1,
        sampleSize: 20,
        targetPower: 0.8,
        nullMean: 0,
        alternativeMean: 1,
        sigma: 1,
      }),
    ).toThrow('Alpha must be greater than 0')
    expect(() =>
      powerAndSampleSize({
        test: 'oneSampleZ',
        mode: 'power',
        alpha: 0.05,
        sampleSize: 20,
        targetPower: 0.8,
        nullMean: 0,
        alternativeMean: 0,
        sigma: 1,
      }),
    ).toThrow('Alternative mean must differ')
    expect(() =>
      powerAndSampleSize({
        test: 'oneSampleZ',
        mode: 'sampleSize',
        alpha: 0.05,
        sampleSize: 2,
        targetPower: 0.99,
        nullMean: 0,
        alternativeMean: 1e-8,
        sigma: 1,
      }),
    ).toThrow('1000000 sample-size limit')
  })
})
