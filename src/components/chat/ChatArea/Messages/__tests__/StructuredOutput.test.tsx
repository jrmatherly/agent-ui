// src/components/chat/ChatArea/Messages/__tests__/StructuredOutput.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StructuredOutput } from '../StructuredOutput'

describe('StructuredOutput', () => {
  it('should render array data as table', () => {
    const data = [
      { name: 'Alice', age: 30, role: 'Developer' },
      { name: 'Bob', age: 25, role: 'Designer' }
    ]
    render(<StructuredOutput data={data} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('should render object data as key-value pairs', () => {
    const data = {
      name: 'Product X',
      price: 99.99,
      inStock: true
    }
    render(<StructuredOutput data={data} />)
    expect(screen.getByText('name')).toBeInTheDocument()
    expect(screen.getByText('Product X')).toBeInTheDocument()
    expect(screen.getByText('price')).toBeInTheDocument()
  })

  it('should render nested objects as collapsible JSON', () => {
    const data = {
      user: {
        name: 'Alice',
        address: {
          city: 'NYC'
        }
      }
    }
    render(<StructuredOutput data={data} />)
    expect(screen.getByText(/user/)).toBeInTheDocument()
  })

  it('should handle primitive values', () => {
    render(<StructuredOutput data="Simple string" />)
    expect(screen.getByText('Simple string')).toBeInTheDocument()
  })
})
