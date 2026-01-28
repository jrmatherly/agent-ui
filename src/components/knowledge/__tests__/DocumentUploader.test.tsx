// src/components/knowledge/__tests__/DocumentUploader.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DocumentUploader } from '../DocumentUploader'

describe('DocumentUploader', () => {
  it('should render upload area', () => {
    render(<DocumentUploader onUpload={vi.fn()} />)
    expect(screen.getByText(/drag and drop/i)).toBeInTheDocument()
  })

  it('should render file input', () => {
    render(<DocumentUploader onUpload={vi.fn()} />)
    expect(screen.getByLabelText(/upload/i)).toBeInTheDocument()
  })

  it('should show uploading state', () => {
    render(<DocumentUploader onUpload={vi.fn()} isUploading={true} />)
    expect(screen.getByText(/uploading/i)).toBeInTheDocument()
  })

  it('should accept supported file types', () => {
    render(<DocumentUploader onUpload={vi.fn()} />)
    const input = screen.getByLabelText(/upload/i)
    expect(input).toHaveAttribute('accept', '.pdf,.txt,.md,.docx')
  })
})
