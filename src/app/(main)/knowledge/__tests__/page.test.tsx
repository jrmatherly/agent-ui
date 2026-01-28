// src/app/(main)/knowledge/__tests__/page.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import KnowledgePage from '../page'

vi.mock('@/hooks/useKnowledgeDocuments', () => ({
  useKnowledgeDocuments: () => ({
    documents: [],
    isLoading: false,
    error: null,
    uploadDocument: vi.fn(),
    deleteDocument: vi.fn(),
    searchDocuments: vi.fn()
  })
}))

describe('KnowledgePage', () => {
  it('should render page title', () => {
    render(<KnowledgePage />)
    expect(screen.getByText('Knowledge Base')).toBeInTheDocument()
  })

  it('should render upload section', () => {
    render(<KnowledgePage />)
    expect(screen.getByText(/drag and drop/i)).toBeInTheDocument()
  })

  it('should render search tab trigger', () => {
    render(<KnowledgePage />)
    expect(screen.getByRole('tab', { name: /search/i })).toBeInTheDocument()
  })
})
