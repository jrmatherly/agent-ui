import { describe, it, expect } from 'vitest'
import { RunEvent } from '../os'
import type { TeamDelegation, WorkflowStep } from '../os'

describe('Team delegation types', () => {
  it('should have team delegation events', () => {
    expect(RunEvent.TeamDelegationStarted).toBe('TeamDelegationStarted')
    expect(RunEvent.TeamDelegationCompleted).toBe('TeamDelegationCompleted')
  })

  it('should define TeamDelegation interface', () => {
    const delegation: TeamDelegation = {
      delegation_id: 'del-123',
      from_agent: 'Leader',
      to_agent: 'Researcher',
      task: 'Find market data',
      status: 'in_progress',
      started_at: 1706400000
    }
    expect(delegation.from_agent).toBe('Leader')
    expect(delegation.status).toBe('in_progress')
  })
})

describe('Workflow step types', () => {
  it('should have workflow step events', () => {
    expect(RunEvent.StepStarted).toBe('StepStarted')
    expect(RunEvent.StepCompleted).toBe('StepCompleted')
  })

  it('should define WorkflowStep interface', () => {
    const step: WorkflowStep = {
      step_id: 'step-123',
      name: 'Research',
      index: 0,
      status: 'completed',
      started_at: 1706400000,
      completed_at: 1706400030,
      output_preview: 'Found 15 relevant sources...'
    }
    expect(step.index).toBe(0)
    expect(step.status).toBe('completed')
  })
})
