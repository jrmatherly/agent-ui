'use client'

import { useState, useEffect, useCallback } from 'react'
import { useStore } from '@/store'
import { APIRoutes } from '@/api/routes'
import { constructEndpointUrl } from '@/lib/constructEndpointUrl'
import type { Trace } from '@/types/os'

interface UseTracesOptions {
  sessionId?: string
  runId?: string
  limit?: number
}

export function useTraces(options: UseTracesOptions = {}) {
  const { sessionId, runId, limit = 20 } = options
  const selectedEndpoint = useStore((state) => state.selectedEndpoint)
  const authToken = useStore((state) => state.authToken)
  const [traces, setTraces] = useState<Trace[]>([])
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

  const fetchTraces = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const endpointUrl = constructEndpointUrl(selectedEndpoint)
      let url: string

      if (sessionId) {
        url = APIRoutes.GetTracesBySession(endpointUrl, sessionId)
      } else if (runId) {
        url = APIRoutes.GetTracesByRun(endpointUrl, runId)
      } else {
        url = APIRoutes.GetTraces(endpointUrl)
      }

      url += `?limit=${limit}`

      const response = await fetch(url, {
        headers: getHeaders()
      })

      if (!response.ok) {
        throw new Error('Failed to fetch traces')
      }

      const data = await response.json()
      setTraces(data.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [selectedEndpoint, sessionId, runId, limit, getHeaders])

  useEffect(() => {
    fetchTraces()
  }, [fetchTraces])

  return {
    traces,
    isLoading,
    error,
    refetch: fetchTraces
  }
}
