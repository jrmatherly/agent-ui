import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ConnectionStatus } from '../connection-status'

// Mock the store
vi.mock('@/store', () => ({
  useStore: vi.fn()
}))

import { useStore } from '@/store'

describe('ConnectionStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render connected status when agents exist and not loading', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useStore).mockImplementation((selector: any) => {
      const state = {
        agents: [{ id: '1', name: 'Agent 1' }],
        isEndpointLoading: false
      }
      return selector(state)
    })

    render(<ConnectionStatus />)
    expect(screen.getByText('Connected')).toBeInTheDocument()
  })

  it('should render connecting status when loading', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useStore).mockImplementation((selector: any) => {
      const state = {
        agents: [],
        isEndpointLoading: true
      }
      return selector(state)
    })

    render(<ConnectionStatus />)
    expect(screen.getByText('Connecting')).toBeInTheDocument()
  })

  it('should render offline status when no agents and not loading', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useStore).mockImplementation((selector: any) => {
      const state = {
        agents: [],
        isEndpointLoading: false
      }
      return selector(state)
    })

    render(<ConnectionStatus />)
    expect(screen.getByText('Offline')).toBeInTheDocument()
  })
})
