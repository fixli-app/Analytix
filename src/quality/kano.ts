export type KanoResponse = 'like' | 'expect' | 'neutral' | 'tolerate' | 'dislike'
export type KanoCategory =
  'attractive' | 'performance' | 'mustBe' | 'indifferent' | 'reverse' | 'questionable'

const classification: Record<KanoResponse, Record<KanoResponse, KanoCategory>> = {
  like: {
    like: 'questionable',
    expect: 'attractive',
    neutral: 'attractive',
    tolerate: 'attractive',
    dislike: 'performance',
  },
  expect: {
    like: 'reverse',
    expect: 'indifferent',
    neutral: 'indifferent',
    tolerate: 'indifferent',
    dislike: 'mustBe',
  },
  neutral: {
    like: 'reverse',
    expect: 'indifferent',
    neutral: 'indifferent',
    tolerate: 'indifferent',
    dislike: 'mustBe',
  },
  tolerate: {
    like: 'reverse',
    expect: 'indifferent',
    neutral: 'indifferent',
    tolerate: 'indifferent',
    dislike: 'mustBe',
  },
  dislike: {
    like: 'reverse',
    expect: 'reverse',
    neutral: 'reverse',
    tolerate: 'reverse',
    dislike: 'questionable',
  },
}

export function classifyKano(functional: KanoResponse, dysfunctional: KanoResponse): KanoCategory {
  return classification[functional][dysfunctional]
}
