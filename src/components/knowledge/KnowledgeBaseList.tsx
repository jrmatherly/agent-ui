'use client'

import {
  useKnowledgeBases,
  useDeleteKnowledgeBase
} from '@/hooks/useKnowledgeBases'
import { KnowledgeBaseCard } from './KnowledgeBaseCard'
import { CreateKnowledgeBaseDialog } from './CreateKnowledgeBaseDialog'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

export function KnowledgeBaseList() {
  const { data: knowledgeBases, isLoading, error } = useKnowledgeBases()
  const deleteMutation = useDeleteKnowledgeBase()

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this knowledge base?')) return

    try {
      await deleteMutation.mutateAsync(id)
      toast.success('Knowledge base deleted')
    } catch (error) {
      toast.error(`Failed to delete: ${error}`)
    }
  }

  if (error) {
    return (
      <div className="py-8 text-center text-red-600">
        Failed to load knowledge bases: {String(error)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Knowledge Bases</h2>
          <p className="text-muted-foreground">
            Manage your team&apos;s knowledge bases and documents
          </p>
        </div>
        <CreateKnowledgeBaseDialog />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-[180px]" />
          ))}
        </div>
      ) : knowledgeBases?.length === 0 ? (
        <div className="bg-muted/50 rounded-lg py-12 text-center">
          <p className="text-muted-foreground mb-4">No knowledge bases yet</p>
          <CreateKnowledgeBaseDialog />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {knowledgeBases?.map((kb) => (
            <KnowledgeBaseCard key={kb.id} kb={kb} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  )
}
