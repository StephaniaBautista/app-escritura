import { describe, expect, it } from 'vitest'
import { mergeUniqueTags } from '../merge-tags'

describe('mergeUniqueTags', () => {
  it('keeps existing chips and appends new ones without case duplicates', () => {
    expect(mergeUniqueTags(['Angst'], ['angst', 'Dead Dove: Do Not Eat'])).toEqual(['Angst', 'Dead Dove: Do Not Eat'])
  })
})
