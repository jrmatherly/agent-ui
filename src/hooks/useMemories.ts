import { useState, useEffect, useCallback } from 'react'
import { useStore } from '@/store'
import { APIRoutes } from '@/api/routes'
import { constructEndpointUrl } from '@/lib/constructEndpointUrl'
import type { MemoryEntry } from '@/types/os'

interface CreateMemoryInput {
  memory: string
  topics: string[]
  agent_id?: string
}

interface UpdateMemoryInput {
  memoryId: string
  memory?: string
  topics?: string[]
}

export function useMemories() {
  const selectedEndpoint = useStore((state) => state.selectedEndpoint)
  const authToken = useStore((state) => state.authToken)
  const [memories, setMemories] = useState<MemoryEntry[]>([])
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

  const fetchMemories = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const endpointUrl = constructEndpointUrl(selectedEndpoint)
      const response = await fetch(APIRoutes.GetMemories(endpointUrl), {
        headers: getHeaders()
      })

      if (!response.ok) {
        throw new Error('Failed to fetch memories')
      }

      const data = await response.json()
      setMemories(data.data ?? data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [selectedEndpoint, getHeaders])

  const createMemory = useCallback(
    async (input: CreateMemoryInput): Promise<boolean> => {
      try {
        const endpointUrl = constructEndpointUrl(selectedEndpoint)
        const response = await fetch(APIRoutes.CreateMemory(endpointUrl), {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(input)
        })

        if (!response.ok) {
          throw new Error('Failed to create memory')
        }

        const newMemory = await response.json()
        setMemories((prev) => [newMemory, ...prev])
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create memory')
        return false
      }
    },
    [selectedEndpoint, getHeaders]
  )

  const updateMemory = useCallback(
    async ({ memoryId, ...data }: UpdateMemoryInput): Promise<boolean> => {
      try {
        const endpointUrl = constructEndpointUrl(selectedEndpoint)
        const response = await fetch(
          APIRoutes.UpdateMemory(endpointUrl, memoryId),
          {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data)
          }
        )

        if (!response.ok) {
          throw new Error('Failed to update memory')
        }

        const updatedMemory = await response.json()
        setMemories((prev) =>
          prev.map((m) => (m.memory_id === memoryId ? updatedMemory : m))
        )
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update memory')
        return false
      }
    },
    [selectedEndpoint, getHeaders]
  )

  const deleteMemory = useCallback(
    async (memoryId: string): Promise<boolean> => {
      try {
        const endpointUrl = constructEndpointUrl(selectedEndpoint)
        const response = await fetch(
          APIRoutes.DeleteMemory(endpointUrl, memoryId),
          {
            method: 'DELETE',
            headers: getHeaders()
          }
        )

        if (response.ok) {
          setMemories((prev) => prev.filter((m) => m.memory_id !== memoryId))
          return true
        }
        return false
      } catch {
        return false
      }
    },
    [selectedEndpoint, getHeaders]
  )

  useEffect(() => {
    fetchMemories()
  }, [fetchMemories])

  return {
    memories,
    isLoading,
    error,
    refetch: fetchMemories,
    createMemory,
    updateMemory,
    deleteMemory
  }
}
