import { useState, useEffect, useCallback } from 'react'
import { useStore } from '@/store'
import { APIRoutes } from '@/api/routes'
import { constructEndpointUrl } from '@/lib/constructEndpointUrl'
import type { KnowledgeDocument, KnowledgeSearchResult } from '@/types/os'

export function useKnowledgeDocuments() {
  const selectedEndpoint = useStore((state) => state.selectedEndpoint)
  const authToken = useStore((state) => state.authToken)
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const getHeaders = useCallback(() => {
    const headers: Record<string, string> = {}
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }
    return headers
  }, [authToken])

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const endpointUrl = constructEndpointUrl(selectedEndpoint)
      const response = await fetch(APIRoutes.KnowledgeUpload(endpointUrl), {
        headers: getHeaders()
      })

      if (!response.ok) {
        throw new Error('Failed to fetch documents')
      }

      const data = await response.json()
      setDocuments(data.documents ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [selectedEndpoint, getHeaders])

  const uploadDocument = useCallback(
    async (file: File) => {
      const endpointUrl = constructEndpointUrl(selectedEndpoint)
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(APIRoutes.KnowledgeUpload(endpointUrl), {
        method: 'POST',
        headers: getHeaders(),
        body: formData
      })

      if (response.ok) {
        await fetchDocuments()
      }

      return response.ok
    },
    [selectedEndpoint, getHeaders, fetchDocuments]
  )

  const deleteDocument = useCallback(
    async (documentId: string) => {
      const endpointUrl = constructEndpointUrl(selectedEndpoint)
      const response = await fetch(
        APIRoutes.KnowledgeContent(endpointUrl, documentId),
        {
          method: 'DELETE',
          headers: getHeaders()
        }
      )

      if (response.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== documentId))
      }

      return response.ok
    },
    [selectedEndpoint, getHeaders]
  )

  const searchDocuments = useCallback(
    async (query: string): Promise<KnowledgeSearchResult[]> => {
      const endpointUrl = constructEndpointUrl(selectedEndpoint)
      const response = await fetch(APIRoutes.KnowledgeSearch(endpointUrl), {
        method: 'POST',
        headers: {
          ...getHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      })

      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()
      return data.results ?? []
    },
    [selectedEndpoint, getHeaders]
  )

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  return {
    documents,
    isLoading,
    error,
    refetch: fetchDocuments,
    uploadDocument,
    deleteDocument,
    searchDocuments
  }
}
