'use client'

import { useState, useMemo } from 'react'
import { Suspense } from 'react'
import { MemoryTable } from '@/components/memory/MemoryTable'
import { TopicFilter } from '@/components/memory/TopicFilter'
import { MemoryHeader } from '@/components/memory/MemoryHeader'
import { MemoryEditor } from '@/components/memory/MemoryEditor'
import { Skeleton } from '@/components/ui/skeleton'
import { useMemories } from '@/hooks/useMemories'
import { toast } from 'sonner'

export default function MemoryPage() {
  const { memories, isLoading, refetch, createMemory } = useMemories()
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Filter memories by selected topics
  const filteredMemories = useMemo(() => {
    if (selectedTopics.length === 0) return memories
    return memories.filter((memory) =>
      selectedTopics.some((topic) => memory.topics.includes(topic))
    )
  }, [memories, selectedTopics])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refetch()
    setIsRefreshing(false)
    toast.success('Memories refreshed')
  }

  const handleSave = async (data: { memory: string; topics: string[] }) => {
    setIsSaving(true)
    const success = await createMemory(data)
    setIsSaving(false)
    if (success) {
      toast.success('Memory created')
    } else {
      toast.error('Failed to create memory')
    }
  }

  return (
    <div className="container mx-auto space-y-6 py-6">
      <MemoryHeader
        onCreateClick={() => setIsEditorOpen(true)}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      <div className="flex gap-6">
        {/* Sidebar with topic filter */}
        <aside className="w-64 shrink-0">
          <div className="bg-card sticky top-6 rounded-lg border p-4">
            <TopicFilter
              memories={memories}
              selectedTopics={selectedTopics}
              onTopicsChange={setSelectedTopics}
            />
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1">
          <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <MemoryTable memories={filteredMemories} />
            )}
          </Suspense>
        </main>
      </div>

      {/* Create memory dialog */}
      <MemoryEditor
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        onSave={handleSave}
        isLoading={isSaving}
      />
    </div>
  )
}
