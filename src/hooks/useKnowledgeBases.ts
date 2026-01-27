'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  KnowledgeBaseWithStats,
  CreateKnowledgeBase
} from '@/lib/knowledge/types'

async function fetchKnowledgeBases(): Promise<KnowledgeBaseWithStats[]> {
  const response = await fetch('/api/knowledge')
  if (!response.ok) throw new Error('Failed to fetch knowledge bases')
  return response.json()
}

async function createKnowledgeBase(
  data: CreateKnowledgeBase
): Promise<KnowledgeBaseWithStats> {
  const response = await fetch('/api/knowledge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create knowledge base')
  }
  return response.json()
}

async function deleteKnowledgeBase(id: string): Promise<void> {
  const response = await fetch(`/api/knowledge/${id}`, { method: 'DELETE' })
  if (!response.ok) throw new Error('Failed to delete knowledge base')
}

async function uploadDocument(kbId: string, file: File): Promise<void> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`/api/knowledge/${kbId}/documents`, {
    method: 'POST',
    body: formData
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to upload document')
  }
}

export function useKnowledgeBases() {
  return useQuery({
    queryKey: ['knowledgeBases'],
    queryFn: fetchKnowledgeBases
  })
}

export function useCreateKnowledgeBase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createKnowledgeBase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledgeBases'] })
    }
  })
}

export function useDeleteKnowledgeBase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteKnowledgeBase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledgeBases'] })
    }
  })
}

export function useUploadDocument(kbId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (file: File) => uploadDocument(kbId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledgeBases'] })
    }
  })
}
