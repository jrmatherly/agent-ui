'use client'

import { useState } from 'react'
import { useKnowledgeDocuments } from '@/hooks/useKnowledgeDocuments'
import { DocumentCard } from '@/components/knowledge/DocumentCard'
import { DocumentUploader } from '@/components/knowledge/DocumentUploader'
import { SearchInterface } from '@/components/knowledge/SearchInterface'
import { ChunkViewer } from '@/components/knowledge/ChunkViewer'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { KnowledgeSearchResult, KnowledgeChunk } from '@/types/os'

export default function KnowledgePage() {
  const {
    documents,
    isLoading,
    error,
    uploadDocument,
    deleteDocument,
    searchDocuments
  } = useKnowledgeDocuments()

  const [isUploading, setIsUploading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<KnowledgeSearchResult[]>(
    []
  )
  const [selectedDocumentChunks, setSelectedDocumentChunks] = useState<{
    name: string
    chunks: KnowledgeChunk[]
  } | null>(null)

  const handleUpload = async (file: File) => {
    setIsUploading(true)
    try {
      await uploadDocument(file)
    } finally {
      setIsUploading(false)
    }
  }

  const handleSearch = async (query: string) => {
    setIsSearching(true)
    try {
      const results = await searchDocuments(query)
      setSearchResults(results)
    } finally {
      setIsSearching(false)
    }
  }

  const handleViewChunks = async (documentId: string) => {
    // TODO: Fetch chunks for document
    // For now, placeholder
    const doc = documents.find((d) => d.id === documentId)
    if (doc) {
      setSelectedDocumentChunks({
        name: doc.name,
        chunks: []
      })
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <Skeleton className="mb-6 h-8 w-40" />
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-destructive rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-foreground mb-6 text-2xl font-semibold">
        Knowledge Base
      </h1>

      <Tabs defaultValue="documents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="search">Search</TabsTrigger>
          {selectedDocumentChunks && (
            <TabsTrigger value="chunks">Chunks</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="documents" className="space-y-4">
          <DocumentUploader onUpload={handleUpload} isUploading={isUploading} />

          {documents.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              No documents uploaded yet. Upload your first document to get
              started.
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  onDelete={deleteDocument}
                  onViewChunks={handleViewChunks}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="search">
          <SearchInterface
            onSearch={handleSearch}
            results={searchResults}
            isSearching={isSearching}
          />
        </TabsContent>

        {selectedDocumentChunks && (
          <TabsContent value="chunks">
            <ChunkViewer
              chunks={selectedDocumentChunks.chunks}
              documentName={selectedDocumentChunks.name}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
