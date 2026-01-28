// src/api/__tests__/routes.test.ts
import { describe, it, expect } from 'vitest'
import { APIRoutes } from '../routes'

const BASE_URL = 'http://localhost:8000'

describe('APIRoutes', () => {
  describe('Workflow routes', () => {
    it('should generate GetWorkflows URL', () => {
      expect(APIRoutes.GetWorkflows(BASE_URL)).toBe(`${BASE_URL}/workflows`)
    })

    it('should generate WorkflowRun URL', () => {
      expect(APIRoutes.WorkflowRun(BASE_URL, 'wf-123')).toBe(
        `${BASE_URL}/workflows/wf-123/runs`
      )
    })
  })

  describe('Memory routes', () => {
    it('should generate GetMemories URL', () => {
      expect(APIRoutes.GetMemories(BASE_URL)).toBe(`${BASE_URL}/memories`)
    })

    it('should generate Memory CRUD URLs', () => {
      expect(APIRoutes.CreateMemory(BASE_URL)).toBe(`${BASE_URL}/memories`)
      expect(APIRoutes.UpdateMemory(BASE_URL, 'mem-1')).toBe(
        `${BASE_URL}/memories/mem-1`
      )
      expect(APIRoutes.DeleteMemory(BASE_URL, 'mem-1')).toBe(
        `${BASE_URL}/memories/mem-1`
      )
    })
  })

  describe('Run control routes', () => {
    it('should generate CancelRun URL', () => {
      expect(APIRoutes.CancelRun(BASE_URL, 'agent-1', 'run-1')).toBe(
        `${BASE_URL}/agents/agent-1/runs/run-1/cancel`
      )
    })

    it('should generate ContinueRun URL for HITL', () => {
      expect(APIRoutes.ContinueRun(BASE_URL, 'agent-1', 'run-1')).toBe(
        `${BASE_URL}/agents/agent-1/runs/run-1/continue`
      )
    })
  })

  describe('Tracing routes', () => {
    it('should generate GetTraces URL', () => {
      expect(APIRoutes.GetTraces(BASE_URL)).toBe(`${BASE_URL}/traces`)
    })

    it('should generate GetTrace URL with ID', () => {
      expect(APIRoutes.GetTrace(BASE_URL, 'trace-123')).toBe(
        `${BASE_URL}/traces/trace-123`
      )
    })

    it('should generate GetTracesBySession URL', () => {
      expect(APIRoutes.GetTracesBySession(BASE_URL, 'sess-456')).toBe(
        `${BASE_URL}/sessions/sess-456/traces`
      )
    })
  })

  describe('Evals routes', () => {
    it('should generate GetEvals URL', () => {
      expect(APIRoutes.GetEvals(BASE_URL)).toBe(`${BASE_URL}/evals`)
    })

    it('should generate GetEval URL with ID', () => {
      expect(APIRoutes.GetEval(BASE_URL, 'eval-123')).toBe(
        `${BASE_URL}/evals/eval-123`
      )
    })

    it('should generate RunEval URL', () => {
      expect(APIRoutes.RunEval(BASE_URL, 'agent-1')).toBe(
        `${BASE_URL}/agents/agent-1/evals`
      )
    })
  })
})
