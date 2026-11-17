export interface AttributeAgreementRaterInput {
  name: string
  ratings: readonly (string | null | undefined)[]
}

export interface AttributeAgreementInput {
  items: readonly (string | null | undefined)[]
  raters: readonly AttributeAgreementRaterInput[]
  reference?: readonly (string | null | undefined)[]
  weighting?: 'linear' | 'quadratic'
  categoryOrder?: readonly string[]
}

export interface AttributeAgreementRaterResult {
  name: string
  repeatabilityPercent: number | null
  referenceAgreementPercent: number | null
  referenceWeightedKappa: number | null
}

export interface AttributeAgreementPairResult {
  rater1: string
  rater2: string
  agreementPercent: number | null
  kappa: number | null
  weightedKappa: number | null
}

export interface AttributeReferenceCategoryResult {
  category: string
  comparisonCount: number
  correctCount: number
  agreementPercent: number | null
}

export interface AttributeAgreementResult {
  itemCount: number
  trialCount: number
  completeRows: number
  categories: string[]
  overallAgreementPercent: number | null
  fleissKappa: number | null
  raterResults: AttributeAgreementRaterResult[]
  pairResults: AttributeAgreementPairResult[]
  referenceAgreementPercent: number | null
  weighting: 'none' | 'linear' | 'quadratic'
  referenceCategoryResults: AttributeReferenceCategoryResult[]
}

export function analyzeAttributeAgreement(
  input: AttributeAgreementInput,
): AttributeAgreementResult {
  const { items, raters, reference } = input
  const weighting = input.weighting ?? 'none'
  if (raters.length < 2) throw new Error('At least two appraisers are required.')
  if (raters.some((rater) => !rater.name.trim()))
    throw new Error('Appraiser names cannot be empty.')
  if (new Set(raters.map((rater) => rater.name)).size !== raters.length) {
    throw new Error('Appraiser names must be unique.')
  }
  if (raters.some((rater) => rater.ratings.length !== items.length)) {
    throw new Error('Item and rating columns must have the same number of rows.')
  }
  if (reference && reference.length !== items.length) {
    throw new Error('Reference and item columns must have the same number of rows.')
  }

  const normalizedItems = items.map(normalize)
  const normalizedRatings = raters.map((rater) => rater.ratings.map(normalize))
  const normalizedReference = reference?.map(normalize)
  const validItemIndexes = normalizedItems
    .map((item, index) => (item ? index : -1))
    .filter((index) => index >= 0)
  if (validItemIndexes.length === 0) throw new Error('At least one item with ratings is required.')

  const categories = new Set<string>()
  normalizedRatings.forEach((ratings) =>
    ratings.forEach((rating) => rating && categories.add(rating)),
  )
  normalizedReference?.forEach((rating) => rating && categories.add(rating))
  if (categories.size < 2) throw new Error('At least two rating categories are required.')
  const orderedCategories =
    input.categoryOrder?.map((category) => category.trim()).filter(Boolean) ?? []
  if (weighting !== 'none') {
    if (
      orderedCategories.length < 2 ||
      new Set(orderedCategories).size !== orderedCategories.length
    ) {
      throw new Error('Weighted kappa requires a unique ordered list of at least two categories.')
    }
    if ([...categories].some((category) => !orderedCategories.includes(category))) {
      throw new Error(
        'The ordered categories must include every observed rating and standard value.',
      )
    }
  }

  const groupedRatings = raters.map((_, raterIndex) => {
    const byItem = new Map<string, string[]>()
    for (const index of validItemIndexes) {
      const rating = normalizedRatings[raterIndex][index]
      if (!rating) continue
      const item = normalizedItems[index]!
      const values = byItem.get(item) ?? []
      values.push(rating)
      byItem.set(item, values)
    }
    return byItem
  })

  const repeatability = groupedRatings.map((byItem) => {
    let agreements = 0
    let comparisons = 0
    for (const values of byItem.values()) {
      for (let first = 0; first < values.length; first += 1) {
        for (let second = first + 1; second < values.length; second += 1) {
          comparisons += 1
          if (values[first] === values[second]) agreements += 1
        }
      }
    }
    return comparisons === 0 ? null : (agreements / comparisons) * 100
  })

  const pairResults: AttributeAgreementPairResult[] = []
  let totalAgreements = 0
  let totalComparisons = 0
  for (let first = 0; first < raters.length; first += 1) {
    for (let second = first + 1; second < raters.length; second += 1) {
      const left: string[] = []
      const right: string[] = []
      validItemIndexes.forEach((index) => {
        const leftRating = normalizedRatings[first][index]
        const rightRating = normalizedRatings[second][index]
        if (leftRating && rightRating) {
          left.push(leftRating)
          right.push(rightRating)
        }
      })
      const result = agreement(left, right)
      if (result.agreementPercent !== null) {
        totalAgreements += (result.agreementPercent / 100) * result.count
        totalComparisons += result.count
      }
      pairResults.push({
        rater1: raters[first].name,
        rater2: raters[second].name,
        ...result,
        weightedKappa:
          weighting === 'none'
            ? null
            : weightedAgreementKappa(left, right, orderedCategories, weighting),
      })
    }
  }

  const completeIndexes = validItemIndexes.filter((index) =>
    normalizedRatings.every((ratings) => ratings[index] !== null),
  )
  const fleissKappa = calculateFleissKappa(
    completeIndexes.map((index) => normalizedRatings.map((ratings) => ratings[index]!)),
    [...categories],
  )

  const raterResults = raters.map((rater, raterIndex) => {
    let agreements = 0
    let comparisons = 0
    if (normalizedReference) {
      validItemIndexes.forEach((index) => {
        const rating = normalizedRatings[raterIndex][index]
        const standard = normalizedReference[index]
        if (!rating || !standard) return
        comparisons += 1
        if (rating === standard) agreements += 1
      })
    }
    return {
      name: rater.name,
      repeatabilityPercent: repeatability[raterIndex],
      referenceAgreementPercent:
        !normalizedReference || comparisons === 0 ? null : (agreements / comparisons) * 100,
      referenceWeightedKappa: (() => {
        if (!normalizedReference || weighting === 'none') return null
        const pairedRatings: string[] = []
        const pairedStandards: string[] = []
        validItemIndexes.forEach((index) => {
          const rating = normalizedRatings[raterIndex][index]
          const standard = normalizedReference[index]
          if (!rating || !standard) return
          pairedRatings.push(rating)
          pairedStandards.push(standard)
        })
        return weightedAgreementKappa(pairedRatings, pairedStandards, orderedCategories, weighting)
      })(),
    }
  })
  const referenceMatches = raterResults
    .map((rater) => rater.referenceAgreementPercent)
    .filter((value): value is number => value !== null)
  const referenceCategoryResults: AttributeReferenceCategoryResult[] = normalizedReference
    ? [...new Set(validItemIndexes.map((index) => normalizedReference[index]).filter(normalize))]
        .sort((left, right) => left.localeCompare(right))
        .map((category) => {
          let comparisonCount = 0
          let correctCount = 0
          validItemIndexes.forEach((index) => {
            if (normalizedReference[index] !== category) return
            normalizedRatings.forEach((ratings) => {
              const rating = ratings[index]
              if (!rating) return
              comparisonCount += 1
              if (rating === category) correctCount += 1
            })
          })
          return {
            category,
            comparisonCount,
            correctCount,
            agreementPercent: comparisonCount === 0 ? null : (correctCount / comparisonCount) * 100,
          }
        })
    : []

  return {
    itemCount: new Set(validItemIndexes.map((index) => normalizedItems[index])).size,
    trialCount: validItemIndexes.length,
    completeRows: completeIndexes.length,
    categories:
      weighting === 'none'
        ? [...categories].sort((left, right) => left.localeCompare(right))
        : orderedCategories.filter((category) => categories.has(category)),
    overallAgreementPercent:
      totalComparisons === 0 ? null : (totalAgreements / totalComparisons) * 100,
    fleissKappa,
    raterResults,
    pairResults,
    referenceAgreementPercent:
      referenceMatches.length === 0
        ? null
        : referenceMatches.reduce((sum, value) => sum + value, 0) / referenceMatches.length,
    weighting,
    referenceCategoryResults,
  }
}

function agreement(left: readonly string[], right: readonly string[]) {
  if (left.length !== right.length) throw new Error('Matched rating lengths do not agree.')
  if (left.length === 0) return { count: 0, agreementPercent: null, kappa: null }
  const categories = new Set([...left, ...right])
  const leftCounts = new Map<string, number>()
  const rightCounts = new Map<string, number>()
  let exact = 0
  for (let index = 0; index < left.length; index += 1) {
    leftCounts.set(left[index], (leftCounts.get(left[index]) ?? 0) + 1)
    rightCounts.set(right[index], (rightCounts.get(right[index]) ?? 0) + 1)
    if (left[index] === right[index]) exact += 1
  }
  const observed = exact / left.length
  const expected = [...categories].reduce(
    (sum, category) =>
      sum +
      ((leftCounts.get(category) ?? 0) / left.length) *
        ((rightCounts.get(category) ?? 0) / right.length),
    0,
  )
  return {
    count: left.length,
    agreementPercent: observed * 100,
    kappa: expected >= 1 ? (observed >= 1 ? 1 : null) : (observed - expected) / (1 - expected),
  }
}

function weightedAgreementKappa(
  left: readonly string[],
  right: readonly string[],
  categories: readonly string[],
  weighting: 'linear' | 'quadratic',
): number | null {
  if (left.length !== right.length) throw new Error('Matched rating lengths do not agree.')
  if (left.length === 0) return null
  const positions = new Map(categories.map((category, index) => [category, index]))
  const leftCounts = new Map(categories.map((category) => [category, 0]))
  const rightCounts = new Map(categories.map((category) => [category, 0]))
  const exponent = weighting === 'linear' ? 1 : 2
  const weight = (first: string, second: string) => {
    const firstPosition = positions.get(first)
    const secondPosition = positions.get(second)
    if (firstPosition === undefined || secondPosition === undefined) {
      throw new Error(
        'The ordered categories must include every observed rating and standard value.',
      )
    }
    return 1 - (Math.abs(firstPosition - secondPosition) / (categories.length - 1)) ** exponent
  }

  let observed = 0
  left.forEach((rating, index) => {
    observed += weight(rating, right[index])
    leftCounts.set(rating, (leftCounts.get(rating) ?? 0) + 1)
    rightCounts.set(right[index], (rightCounts.get(right[index]) ?? 0) + 1)
  })
  observed /= left.length
  let expected = 0
  categories.forEach((first) => {
    categories.forEach((second) => {
      expected +=
        ((leftCounts.get(first) ?? 0) / left.length) *
        ((rightCounts.get(second) ?? 0) / right.length) *
        weight(first, second)
    })
  })
  return expected >= 1 ? (observed >= 1 ? 1 : null) : (observed - expected) / (1 - expected)
}

function calculateFleissKappa(ratings: readonly string[][], categories: readonly string[]) {
  if (ratings.length === 0 || ratings[0].length < 2) return null
  const raterCount = ratings[0].length
  if (ratings.some((row) => row.length !== raterCount)) return null
  const categoryProportions = new Map(categories.map((category) => [category, 0]))
  let observedAgreement = 0

  for (const row of ratings) {
    const counts = new Map(categories.map((category) => [category, 0]))
    row.forEach((rating) => counts.set(rating, (counts.get(rating) ?? 0) + 1))
    row.forEach((rating) =>
      categoryProportions.set(rating, (categoryProportions.get(rating) ?? 0) + 1),
    )
    const squaredCounts = [...counts.values()].reduce((sum, count) => sum + count ** 2, 0)
    observedAgreement += (squaredCounts - raterCount) / (raterCount * (raterCount - 1))
  }

  const totalRatings = ratings.length * raterCount
  const expectedAgreement = [...categoryProportions.values()].reduce(
    (sum, count) => sum + (count / totalRatings) ** 2,
    0,
  )
  const meanObservedAgreement = observedAgreement / ratings.length
  return expectedAgreement >= 1
    ? meanObservedAgreement >= 1
      ? 1
      : null
    : (meanObservedAgreement - expectedAgreement) / (1 - expectedAgreement)
}

function normalize(value: string | null | undefined): string | null {
  const normalized = value?.trim()
  return normalized ? normalized : null
}
