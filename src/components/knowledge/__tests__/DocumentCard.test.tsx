// src/components/knowledge/__tests__/DocumentCard.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DocumentCard } from '../DocumentCard'

describe('DocumentCard', () => {
  const mockDoc = {
    id: 'doc-123',
    name: 'company-policy.pdf',
    content_type: 'application/pdf',
    size_bytes: 102400,
    status: 'processed' as const,
    chunk_count: 15,
    created_at: 1706400000,
    updated_at: 1706400000
  }

  it('should render document name', () => {
    render(
      <DocumentCard
        document={mockDoc}
        onDelete={vi.fn()}
        onViewChunks={vi.fn()}
      />
    )
    expect(screen.getByText('company-policy.pdf')).toBeInTheDocument()
  })

  it('should render file size', () => {
    render(
      <DocumentCard
        document={mockDoc}
        onDelete={vi.fn()}
        onViewChunks={vi.fn()}
      />
    )
    expect(screen.getByText('100 KB')).toBeInTheDocument()
  })

  it('should render chunk count', () => {
    render(
      <DocumentCard
        document={mockDoc}
        onDelete={vi.fn()}
        onViewChunks={vi.fn()}
      />
    )
    expect(screen.getByText('15 chunks')).toBeInTheDocument()
  })

  it('should render status badge', () => {
    render(
      <DocumentCard
        document={mockDoc}
        onDelete={vi.fn()}
        onViewChunks={vi.fn()}
      />
    )
    expect(screen.getByText('processed')).toBeInTheDocument()
  })

  it('should call onDelete when delete clicked', () => {
    const onDelete = vi.fn()
    render(
      <DocumentCard
        document={mockDoc}
        onDelete={onDelete}
        onViewChunks={vi.fn()}
      />
    )
    fireEvent.click(screen.getByLabelText('Delete document'))
    expect(onDelete).toHaveBeenCalledWith('doc-123')
  })

  it('should call onViewChunks when view clicked', () => {
    const onViewChunks = vi.fn()
    render(
      <DocumentCard
        document={mockDoc}
        onDelete={vi.fn()}
        onViewChunks={onViewChunks}
      />
    )
    fireEvent.click(screen.getByText('View Chunks'))
    expect(onViewChunks).toHaveBeenCalledWith('doc-123')
  })
})
