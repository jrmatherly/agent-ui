import { describe, it, expect } from 'vitest'
import type {
  KnowledgeDocument,
  KnowledgeChunk,
  KnowledgeSearchResult
} from '../os'

describe('Knowledge types', () => {
  it('should define KnowledgeDocument interface', () => {
    const doc: KnowledgeDocument = {
      id: 'doc-123',
      name: 'company-policy.pdf',
      content_type: 'application/pdf',
      size_bytes: 102400,
      status: 'processed',
      chunk_count: 15,
      created_at: 1706400000,
      updated_at: 1706400000
    }
    expect(doc.id).toBe('doc-123')
    expect(doc.status).toBe('processed')
  })

  it('should define KnowledgeChunk interface', () => {
    const chunk: KnowledgeChunk = {
      id: 'chunk-456',
      document_id: 'doc-123',
      content: 'This is the chunk content...',
      chunk_index: 3,
      start_char: 1024,
      end_char: 1536,
      embedding_status: 'completed',
      metadata: { page: 2 }
    }
    expect(chunk.chunk_index).toBe(3)
  })

  it('should define KnowledgeSearchResult interface', () => {
    const result: KnowledgeSearchResult = {
      document_id: 'doc-123',
      document_name: 'policy.pdf',
      chunk_id: 'chunk-456',
      content: 'Matching content...',
      score: 0.92,
      metadata: {}
    }
    expect(result.score).toBe(0.92)
  })
})
