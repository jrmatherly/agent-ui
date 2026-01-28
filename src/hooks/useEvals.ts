'use client'

import { useState, useEffect, useCallback } from 'react'
import { useStore } from '@/store'
import { APIRoutes } from '@/api/routes'
import { constructEndpointUrl } from '@/lib/constructEndpointUrl'
import type { EvalRun } from '@/types/os'

interface UseEvalsOptions {
  agentId?: string
  limit?: number
}

export function useEvals(options: UseEvalsOptions = {}) {
  const { agentId, limit = 20 } = options
  const selectedEndpoint = useStore((state) => state.selectedEndpoint)
  const authToken = useStore((state) => state.authToken)
  const [evalRuns, setEvalRuns] = useState<EvalRun[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const getHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }
    return headers
  }, [authToken])

  const fetchEvals = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const endpointUrl = constructEndpointUrl(selectedEndpoint)
      let url = APIRoutes.GetEvals(endpointUrl)

      const params = new URLSearchParams()
      params.set('limit', String(limit))
      if (agentId) {
        params.set('agent_id', agentId)
      }
      url += `?${params.toString()}`

      const response = await fetch(url, {
        headers: getHeaders()
      })

      if (!response.ok) {
        throw new Error('Failed to fetch evals')
      }

      const data = await response.json()
      setEvalRuns(data.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [selectedEndpoint, agentId, limit, getHeaders])

  useEffect(() => {
    fetchEvals()
  }, [fetchEvals])

  return {
    evalRuns,
    isLoading,
    error,
    refetch: fetchEvals
  }
}
