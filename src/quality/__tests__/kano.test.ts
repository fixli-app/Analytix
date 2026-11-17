import { describe, expect, it } from 'vitest'
import { classifyKano } from '../kano'

describe('classifyKano', () => {
  it('classifies attractive, performance, must-be, indifferent, and reverse responses', () => {
    expect(classifyKano('like', 'expect')).toBe('attractive')
    expect(classifyKano('like', 'dislike')).toBe('performance')
    expect(classifyKano('expect', 'dislike')).toBe('mustBe')
    expect(classifyKano('neutral', 'expect')).toBe('indifferent')
    expect(classifyKano('dislike', 'like')).toBe('reverse')
  })

  it('marks contradictory response pairs as questionable', () => {
    expect(classifyKano('like', 'like')).toBe('questionable')
    expect(classifyKano('dislike', 'dislike')).toBe('questionable')
  })
})
