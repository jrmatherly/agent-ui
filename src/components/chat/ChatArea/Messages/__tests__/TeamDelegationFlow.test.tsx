// src/components/chat/ChatArea/Messages/__tests__/TeamDelegationFlow.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TeamDelegationFlow } from '../TeamDelegationFlow'

describe('TeamDelegationFlow', () => {
  const mockDelegations = [
    {
      delegation_id: 'del-1',
      from_agent: 'Leader',
      to_agent: 'Researcher',
      task: 'Find market data',
      status: 'completed' as const,
      started_at: 1706400000,
      completed_at: 1706400030
    },
    {
      delegation_id: 'del-2',
      from_agent: 'Leader',
      to_agent: 'Writer',
      task: 'Draft report',
      status: 'in_progress' as const,
      started_at: 1706400030
    }
  ]

  it('should render all delegations', () => {
    render(<TeamDelegationFlow delegations={mockDelegations} />)
    expect(screen.getByText('Researcher')).toBeInTheDocument()
    expect(screen.getByText('Writer')).toBeInTheDocument()
  })

  it('should show task descriptions', () => {
    render(<TeamDelegationFlow delegations={mockDelegations} />)
    expect(screen.getByText('Find market data')).toBeInTheDocument()
    expect(screen.getByText('Draft report')).toBeInTheDocument()
  })

  it('should show status indicators', () => {
    render(<TeamDelegationFlow delegations={mockDelegations} />)
    expect(screen.getByText('completed')).toBeInTheDocument()
    expect(screen.getByText('in_progress')).toBeInTheDocument()
  })

  it('should show from agent', () => {
    render(<TeamDelegationFlow delegations={mockDelegations} />)
    expect(screen.getAllByText('Leader')).toHaveLength(2)
  })
})
