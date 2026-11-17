import { describe, expect, it } from 'vitest'
import {
  binomialAcceptanceProbability,
  findAttributeSamplingPlan,
  finiteLotAcceptanceProbability,
} from '../acceptanceSampling'

describe('attribute acceptance sampling', () => {
  it('matches hand-calculated binomial acceptance probabilities', () => {
    expect(binomialAcceptanceProbability(5, 1, 0.1)).toBeCloseTo(0.91854, 12)
    expect(binomialAcceptanceProbability(10, 5, 0.5)).toBeCloseTo(0.623046875, 12)
    expect(binomialAcceptanceProbability(5, 0, 0)).toBe(1)
    expect(binomialAcceptanceProbability(5, 4, 1)).toBe(0)
    expect(binomialAcceptanceProbability(10, 10, 0.4)).toBe(1)
  })

  it('finds the minimum sample plan satisfying producer and consumer risks', () => {
    const plan = findAttributeSamplingPlan({
      aql: 0.1,
      rql: 0.6,
      producerRisk: 0.05,
      consumerRisk: 0.65,
      maxSampleSize: 10,
    })

    expect(plan.sampleSize).toBe(2)
    expect(plan.acceptanceNumber).toBe(1)
    expect(plan.probabilityAtAql).toBeCloseTo(0.99, 12)
    expect(plan.probabilityAtRql).toBeCloseTo(0.64, 12)
    expect(plan.producerRisk).toBeCloseTo(0.01, 12)
    expect(plan.consumerRisk).toBeCloseTo(0.64, 12)
    expect(plan.ocCurve.some((point) => point.defectiveFraction === 0.1)).toBe(true)
    expect(plan.ocCurve.some((point) => point.defectiveFraction === 0.6)).toBe(true)
  })

  it('uses the exact hypergeometric probability for a finite lot', () => {
    expect(finiteLotAcceptanceProbability(3, 0, 2, 10)).toBeCloseTo(7 / 15, 12)
    expect(finiteLotAcceptanceProbability(3, 1, 2, 10)).toBeCloseTo(14 / 15, 12)
    expect(finiteLotAcceptanceProbability(3, 2, 2, 10)).toBe(1)
  })

  it('finds a finite-lot plan using the specified AQL/RQL defect counts', () => {
    const plan = findAttributeSamplingPlan({
      aql: 0.1,
      rql: 0.4,
      producerRisk: 0.1,
      consumerRisk: 0.2,
      maxSampleSize: 10,
      lotSize: 10,
    })

    expect(plan.sampleSize).toBe(6)
    expect(plan.acceptanceNumber).toBe(1)
    expect(plan.defectivesAtAql).toBe(1)
    expect(plan.defectivesAtRql).toBe(4)
    expect(plan.probabilityAtAql).toBeCloseTo(1, 12)
    expect(plan.probabilityAtRql).toBeCloseTo(25 / 210, 12)
    expect(plan.ocCurve.every((point) => Number.isInteger(point.defectiveFraction * 10))).toBe(true)
  })

  it('rounds finite-lot defect counts correctly near floating-point integers', () => {
    const plan = findAttributeSamplingPlan({
      aql: 0.29,
      rql: 0.51,
      producerRisk: 0.9,
      consumerRisk: 0.9,
      maxSampleSize: 1,
      lotSize: 100,
    })

    expect(plan.defectivesAtAql).toBe(29)
    expect(plan.defectivesAtRql).toBe(51)
  })

  it('rejects invalid risk criteria and reports when no plan is found', () => {
    expect(() =>
      findAttributeSamplingPlan({ aql: 0.2, rql: 0.1, producerRisk: 0.05, consumerRisk: 0.1 }),
    ).toThrow('AQL måste vara lägre än RQL.')
    expect(() =>
      findAttributeSamplingPlan({
        aql: 0.01,
        rql: 0.02,
        producerRisk: 0.01,
        consumerRisk: 0.01,
        maxSampleSize: 1,
      }),
    ).toThrow('Ingen plan uppfyller båda riskkraven inom maximal stickprovsstorlek.')
  })
})
