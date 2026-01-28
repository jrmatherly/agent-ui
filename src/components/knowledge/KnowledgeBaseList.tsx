'use client'

import {
  useKnowledgeBases,
  useDeleteKnowledgeBase
} from '@/hooks/useKnowledgeBases'
import { KnowledgeBaseCard } from './KnowledgeBaseCard'
import { CreateKnowledgeBaseDialog } from './CreateKnowledgeBaseDialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { FolderPlus, Database, FileText, AlertTriangle } from 'lucide-react'

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
      <Card className="border-destructive/50 bg-destructive/10 p-6">
        <div className="flex items-center gap-3">
          <AlertTriangle className="text-destructive h-5 w-5" />
          <div>
            <p className="font-medium">Failed to load knowledge bases</p>
            <p className="text-muted-foreground text-sm">{String(error)}</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      {/* Enhanced Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Knowledge Bases</h2>
          <p className="text-muted-foreground mt-1">
            Manage your team&apos;s knowledge bases and documents
          </p>
        </div>
        <CreateKnowledgeBaseDialog />
      </div>

      {/* Stats Summary Bar */}
      {knowledgeBases && knowledgeBases.length > 0 && (
        <div className="border-border/50 bg-accent/20 flex flex-wrap gap-6 rounded-lg border px-6 py-4">
          <div className="flex items-center gap-2 text-sm">
            <Database className="text-muted-foreground h-4 w-4" />
            <span className="font-medium">{knowledgeBases.length}</span>
            <span className="text-muted-foreground">knowledge bases</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <FileText className="text-muted-foreground h-4 w-4" />
            <span className="font-medium">
              {knowledgeBases.reduce(
                (sum, kb) => sum + (kb.documentCount ?? 0),
                0
              )}
            </span>
            <span className="text-muted-foreground">total documents</span>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="mb-4 h-6 w-3/4" />
              <Skeleton className="mb-2 h-4 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <div className="mt-4 flex gap-4">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Enhanced Empty State */}
      {!isLoading && knowledgeBases?.length === 0 && (
        <Card className="border-dashed">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="bg-brand/10 rounded-full p-4">
              <FolderPlus className="text-brand h-8 w-8" />
            </div>
            <h3 className="mt-6 text-lg font-semibold">
              Create your first knowledge base
            </h3>
            <p className="text-muted-foreground mt-2 max-w-md text-sm">
              Knowledge bases help your agents access relevant information.
              Upload documents, PDFs, or connect external sources to enhance
              your AI&apos;s capabilities.
            </p>
            <CreateKnowledgeBaseDialog />
          </div>
        </Card>
      )}

      {/* Grid with cards */}
      {!isLoading && knowledgeBases && knowledgeBases.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {knowledgeBases.map((kb) => (
            <KnowledgeBaseCard key={kb.id} kb={kb} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  )
}
