// src/components/knowledge/__tests__/ChunkViewer.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChunkViewer } from '../ChunkViewer'

describe('ChunkViewer', () => {
  const mockChunks = [
    {
      id: 'chunk-1',
      document_id: 'doc-1',
      content: 'First chunk content',
      chunk_index: 0,
      start_char: 0,
      end_char: 512,
      embedding_status: 'completed' as const,
      metadata: { page: 1 }
    },
    {
      id: 'chunk-2',
      document_id: 'doc-1',
      content: 'Second chunk content',
      chunk_index: 1,
      start_char: 512,
      end_char: 1024,
      embedding_status: 'completed' as const,
      metadata: { page: 1 }
    }
  ]

  it('should render all chunks', () => {
    render(<ChunkViewer chunks={mockChunks} documentName="policy.pdf" />)
    expect(screen.getByText('First chunk content')).toBeInTheDocument()
    expect(screen.getByText('Second chunk content')).toBeInTheDocument()
  })

  it('should render document name', () => {
    render(<ChunkViewer chunks={mockChunks} documentName="policy.pdf" />)
    expect(screen.getByText('policy.pdf')).toBeInTheDocument()
  })

  it('should render chunk indices', () => {
    render(<ChunkViewer chunks={mockChunks} documentName="policy.pdf" />)
    expect(screen.getByText('Chunk 1')).toBeInTheDocument()
    expect(screen.getByText('Chunk 2')).toBeInTheDocument()
  })

  it('should render character ranges', () => {
    render(<ChunkViewer chunks={mockChunks} documentName="policy.pdf" />)
    expect(screen.getByText(/0-512/)).toBeInTheDocument()
  })
})
