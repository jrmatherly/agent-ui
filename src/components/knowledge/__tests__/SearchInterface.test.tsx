// src/components/knowledge/__tests__/SearchInterface.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SearchInterface } from '../SearchInterface'

describe('SearchInterface', () => {
  it('should render search input', () => {
    render(<SearchInterface onSearch={vi.fn()} results={[]} />)
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
  })

  it('should call onSearch when submitted', () => {
    const onSearch = vi.fn()
    render(<SearchInterface onSearch={onSearch} results={[]} />)

    const input = screen.getByPlaceholderText(/search/i)
    fireEvent.change(input, { target: { value: 'test query' } })
    fireEvent.submit(input.closest('form')!)

    expect(onSearch).toHaveBeenCalledWith('test query')
  })

  it('should render results', () => {
    const results = [
      {
        document_id: 'doc-1',
        document_name: 'policy.pdf',
        chunk_id: 'chunk-1',
        content: 'Matching content here',
        score: 0.92,
        metadata: {}
      }
    ]
    render(<SearchInterface onSearch={vi.fn()} results={results} />)
    expect(screen.getByText('policy.pdf')).toBeInTheDocument()
    expect(screen.getByText(/Matching content/)).toBeInTheDocument()
  })

  it('should show score percentage', () => {
    const results = [
      {
        document_id: 'doc-1',
        document_name: 'policy.pdf',
        chunk_id: 'chunk-1',
        content: 'Content',
        score: 0.92,
        metadata: {}
      }
    ]
    render(<SearchInterface onSearch={vi.fn()} results={results} />)
    expect(screen.getByText('92%')).toBeInTheDocument()
  })
})
