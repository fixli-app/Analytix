import { describe, expect, it } from 'vitest'
import { analyzeAttributeAgreement } from '../attributeAgreement'

const fixture = {
  items: ['P1', 'P1', 'P2', 'P2', 'P3', 'P3'],
  reference: ['A', 'A', 'B', 'B', 'A', 'A'],
  raters: [
    { name: 'Rater 1', ratings: ['A', 'A', 'B', 'B', 'A', 'B'] },
    { name: 'Rater 2', ratings: ['A', 'B', 'B', 'B', 'A', 'A'] },
  ],
}

describe('analyzeAttributeAgreement', () => {
  it('calculates repeatability, inter-appraiser agreement, kappa, and reference accuracy', () => {
    const result = analyzeAttributeAgreement(fixture)

    expect(result.itemCount).toBe(3)
    expect(result.trialCount).toBe(6)
    expect(result.completeRows).toBe(6)
    expect(result.overallAgreementPercent).toBeCloseTo((4 / 6) * 100, 12)
    expect(result.fleissKappa).toBeCloseTo(1 / 3, 12)
    expect(result.pairResults[0].kappa).toBeCloseTo(1 / 3, 12)
    expect(result.raterResults[0].repeatabilityPercent).toBeCloseTo((2 / 3) * 100, 12)
    expect(result.raterResults[1].repeatabilityPercent).toBeCloseTo((2 / 3) * 100, 12)
    expect(result.raterResults[0].referenceAgreementPercent).toBeCloseTo((5 / 6) * 100, 12)
    expect(result.referenceAgreementPercent).toBeCloseTo((5 / 6) * 100, 12)
  })

  it('omits missing ratings from pairwise comparisons and accepts no standard', () => {
    const result = analyzeAttributeAgreement({
      items: ['P1', 'P1', 'P2', 'P2'],
      raters: [
        { name: 'A', ratings: ['Pass', null, 'Fail', 'Fail'] },
        { name: 'B', ratings: ['Pass', 'Pass', 'Fail', 'Pass'] },
      ],
    })
    expect(result.completeRows).toBe(3)
    expect(result.raterResults.every((rater) => rater.referenceAgreementPercent === null)).toBe(
      true,
    )
    expect(result.overallAgreementPercent).toBeCloseTo((2 / 3) * 100, 12)
  })

  it('calculates ordered weighted kappa and standard accuracy by category', () => {
    const result = analyzeAttributeAgreement({
      items: ['P1', 'P2', 'P3'],
      reference: ['A', 'B', 'C'],
      raters: [
        { name: 'Rater 1', ratings: ['A', 'B', 'C'] },
        { name: 'Rater 2', ratings: ['A', 'C', 'C'] },
      ],
      weighting: 'linear',
      categoryOrder: ['A', 'B', 'C'],
    })

    expect(result.weighting).toBe('linear')
    expect(result.pairResults[0].kappa).toBeCloseTo(0.5, 12)
    expect(result.pairResults[0].weightedKappa).toBeCloseTo(2 / 3, 12)
    expect(result.raterResults[0].referenceWeightedKappa).toBe(1)
    expect(result.raterResults[1].referenceWeightedKappa).toBeCloseTo(2 / 3, 12)
    expect(result.referenceCategoryResults).toEqual([
      { category: 'A', comparisonCount: 2, correctCount: 2, agreementPercent: 100 },
      { category: 'B', comparisonCount: 2, correctCount: 1, agreementPercent: 50 },
      { category: 'C', comparisonCount: 2, correctCount: 2, agreementPercent: 100 },
    ])

    const quadratic = analyzeAttributeAgreement({
      items: ['P1', 'P2', 'P3'],
      raters: [
        { name: 'Rater 1', ratings: ['A', 'B', 'C'] },
        { name: 'Rater 2', ratings: ['A', 'C', 'C'] },
      ],
      weighting: 'quadratic',
      categoryOrder: ['A', 'B', 'C'],
    })
    expect(quadratic.pairResults[0].weightedKappa).toBeCloseTo(0.8, 12)
  })

  it('requires an explicit complete order for weighted categories', () => {
    expect(() =>
      analyzeAttributeAgreement({
        items: ['P1', 'P2'],
        raters: [
          { name: 'A', ratings: ['Low', 'High'] },
          { name: 'B', ratings: ['Low', 'High'] },
        ],
        weighting: 'linear',
        categoryOrder: ['Low'],
      }),
    ).toThrow('unique ordered list')
    expect(() =>
      analyzeAttributeAgreement({
        items: ['P1', 'P2'],
        raters: [
          { name: 'A', ratings: ['Low', 'High'] },
          { name: 'B', ratings: ['Low', 'High'] },
        ],
        weighting: 'quadratic',
        categoryOrder: ['Low', 'Medium'],
      }),
    ).toThrow('include every observed rating')
  })

  it('rejects missing appraisers, mismatched lengths, duplicate names, and a single category', () => {
    expect(() =>
      analyzeAttributeAgreement({ items: ['P1'], raters: [{ name: 'A', ratings: ['x'] }] }),
    ).toThrow('At least two appraisers')
    expect(() =>
      analyzeAttributeAgreement({
        items: ['P1'],
        raters: [
          { name: 'A', ratings: ['x'] },
          { name: 'B', ratings: [] },
        ],
      }),
    ).toThrow('same number of rows')
    expect(() =>
      analyzeAttributeAgreement({
        items: ['P1'],
        raters: [
          { name: 'A', ratings: ['x'] },
          { name: 'A', ratings: ['y'] },
        ],
      }),
    ).toThrow('unique')
    expect(() =>
      analyzeAttributeAgreement({
        items: ['P1', 'P2'],
        raters: [
          { name: 'A', ratings: ['x', 'x'] },
          { name: 'B', ratings: ['x', 'x'] },
        ],
      }),
    ).toThrow('two rating categories')
  })
})
