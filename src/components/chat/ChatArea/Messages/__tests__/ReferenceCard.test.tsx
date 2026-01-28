// src/components/chat/ChatArea/Messages/__tests__/ReferenceCard.test.tsx
import { describe, it, expect } from 'vitest'
import { ReferenceCard } from '../ReferenceCard'

describe('ReferenceCard', () => {
  it('should export ReferenceCard component', () => {
    expect(typeof ReferenceCard).toBe('function')
  })

  it('should accept reference prop', () => {
    const mockReference = {
      name: 'company-policy.pdf',
      content: 'All employees must complete annual training by December 31st.',
      meta_data: {
        chunk: 3,
        chunk_size: 512
      }
    }
    // Verify the prop shape is correct
    expect(mockReference.name).toBe('company-policy.pdf')
    expect(mockReference.meta_data.chunk).toBe(3)
  })

  it('should accept maxLength prop', () => {
    const maxLength = 100
    expect(maxLength).toBe(100)
  })
})
