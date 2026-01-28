import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import SidebarUserProfile from '../SidebarUserProfile'

// Mock dependencies
vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: vi.fn(() => ({
    user: { name: 'Test User', email: 'test@example.com' },
    isLoading: false,
    isAuthenticated: true
  }))
}))

vi.mock('@/hooks/useUIPermissions', () => ({
  useUIPermissions: vi.fn(() => ({
    nav: { admin: false }
  }))
}))

vi.mock('@/store', () => ({
  useStore: vi.fn((selector) => {
    const state = {
      agents: [{ id: '1' }],
      isEndpointLoading: false
    }
    return selector(state)
  })
}))

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() }))
}))

vi.mock('@/lib/auth-client', () => ({
  signOut: vi.fn()
}))

describe('SidebarUserProfile', () => {
  it('should render ConnectionStatus below user profile', () => {
    render(<SidebarUserProfile />)
    // The ConnectionStatus should render StatusBadge with "Connected"
    expect(screen.getByText('Connected')).toBeInTheDocument()
  })

  it('should render AgentOS label next to connection status', () => {
    render(<SidebarUserProfile />)
    expect(screen.getByText('AgentOS')).toBeInTheDocument()
  })
})
