// src/types/__tests__/evals.test.ts
import { describe, it, expect } from 'vitest'
import type { EvalResult, EvalRun, EvalListResponse } from '../os'

describe('Eval types', () => {
  it('should define EvalResult interface', () => {
    const result: EvalResult = {
      eval_id: 'eval-123',
      input: 'What is the capital of France?',
      expected_output: 'Paris',
      actual_output: 'Paris is the capital of France.',
      score: 0.95,
      passed: true,
      feedback: 'Correct answer with additional context'
    }
    expect(result.score).toBe(0.95)
    expect(result.passed).toBe(true)
  })

  it('should define EvalRun interface', () => {
    const run: EvalRun = {
      run_id: 'run-456',
      agent_id: 'agent-789',
      eval_set_name: 'accuracy_test',
      created_at: 1706400000,
      completed_at: 1706400060,
      status: 'completed',
      results: [],
      metrics: {
        accuracy: 0.92,
        avg_latency_ms: 1500,
        total_runs: 50,
        passed_count: 46,
        failed_count: 4
      }
    }
    expect(run.metrics.accuracy).toBe(0.92)
  })

  it('should define EvalListResponse interface', () => {
    const response: EvalListResponse = {
      data: [],
      meta: {
        page: 1,
        limit: 20,
        total_count: 0,
        total_pages: 0
      }
    }
    expect(response.data).toEqual([])
  })
})
