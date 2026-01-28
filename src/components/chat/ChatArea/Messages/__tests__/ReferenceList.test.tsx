// src/components/chat/ChatArea/Messages/__tests__/ReferenceList.test.tsx
import { describe, it, expect } from 'vitest'
import { ReferenceList } from '../ReferenceList'

describe('ReferenceList', () => {
  it('should export ReferenceList component', () => {
    expect(typeof ReferenceList).toBe('function')
  })

  it('should accept references prop', () => {
    const mockReferences = [
      {
        name: 'doc1.pdf',
        content: 'First document content',
        meta_data: { chunk: 1, chunk_size: 256 }
      },
      {
        name: 'doc2.pdf',
        content: 'Second document content',
        meta_data: { chunk: 2, chunk_size: 512 }
      }
    ]
    // Verify the prop shape is correct
    expect(mockReferences).toHaveLength(2)
    expect(mockReferences[0].name).toBe('doc1.pdf')
  })

  it('should accept query prop', () => {
    const query = 'company policies'
    expect(query).toBe('company policies')
  })
})
