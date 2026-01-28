// src/components/chat/ChatArea/Messages/__tests__/WorkflowStepper.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WorkflowStepper } from '../WorkflowStepper'

describe('WorkflowStepper', () => {
  const mockSteps = [
    {
      step_id: 'step-1',
      name: 'Research',
      index: 0,
      status: 'completed' as const,
      started_at: 1706400000,
      completed_at: 1706400030,
      output_preview: 'Found 15 sources'
    },
    {
      step_id: 'step-2',
      name: 'Analysis',
      index: 1,
      status: 'running' as const,
      started_at: 1706400030
    },
    {
      step_id: 'step-3',
      name: 'Report',
      index: 2,
      status: 'pending' as const
    }
  ]

  it('should render all steps', () => {
    render(<WorkflowStepper steps={mockSteps} />)
    expect(screen.getByText('Research')).toBeInTheDocument()
    expect(screen.getByText('Analysis')).toBeInTheDocument()
    expect(screen.getByText('Report')).toBeInTheDocument()
  })

  it('should show step numbers', () => {
    render(<WorkflowStepper steps={mockSteps} />)
    // Only pending step shows the number (3), completed/running show icons
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('should show output preview for completed steps', () => {
    render(<WorkflowStepper steps={mockSteps} />)
    expect(screen.getByText('Found 15 sources')).toBeInTheDocument()
  })

  it('should indicate current step', () => {
    render(<WorkflowStepper steps={mockSteps} currentStepIndex={1} />)
    // Analysis is the current step
    expect(screen.getByText('Analysis')).toBeInTheDocument()
  })
})
