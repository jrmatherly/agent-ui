'use client'

import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Search, X } from 'lucide-react'
import type { MemoryEntry } from '@/types/os'

interface TopicFilterProps {
  memories: MemoryEntry[]
  selectedTopics: string[]
  onTopicsChange: (topics: string[]) => void
}

export function TopicFilter({
  memories,
  selectedTopics,
  onTopicsChange
}: TopicFilterProps) {
  const [searchQuery, setSearchQuery] = useState('')

  // Extract unique topics from all memories
  const allTopics = useMemo(() => {
    const topicSet = new Set<string>()
    memories.forEach((memory) => {
      memory.topics.forEach((topic) => topicSet.add(topic))
    })
    return Array.from(topicSet).sort()
  }, [memories])

  // Filter topics by search query
  const filteredTopics = useMemo(() => {
    if (!searchQuery) return allTopics
    const query = searchQuery.toLowerCase()
    return allTopics.filter((topic) => topic.toLowerCase().includes(query))
  }, [allTopics, searchQuery])

  // Count memories per topic
  const topicCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    memories.forEach((memory) => {
      memory.topics.forEach((topic) => {
        counts[topic] = (counts[topic] || 0) + 1
      })
    })
    return counts
  }, [memories])

  const toggleTopic = (topic: string) => {
    if (selectedTopics.includes(topic)) {
      onTopicsChange(selectedTopics.filter((t) => t !== topic))
    } else {
      onTopicsChange([...selectedTopics, topic])
    }
  }

  const clearAll = () => {
    onTopicsChange([])
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Filter by Topic</h3>
        {selectedTopics.length > 0 && (
          <button
            onClick={clearAll}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Search topics..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-9 pl-9"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Selected topics */}
      {selectedTopics.length > 0 && (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs">Selected</p>
          <div className="flex flex-wrap gap-1.5">
            {selectedTopics.map((topic) => (
              <Badge
                key={topic}
                variant="default"
                className="cursor-pointer gap-1"
                onClick={() => toggleTopic(topic)}
              >
                {topic}
                <X className="h-3 w-3" />
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Available topics */}
      <div className="space-y-2">
        <p className="text-muted-foreground text-xs">
          {selectedTopics.length > 0 ? 'Available' : 'All topics'}
        </p>
        {filteredTopics.length === 0 ? (
          <p className="text-muted-foreground py-2 text-center text-sm">
            No topics found
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {filteredTopics
              .filter((topic) => !selectedTopics.includes(topic))
              .map((topic) => (
                <Badge
                  key={topic}
                  variant="secondary"
                  className={cn(
                    'cursor-pointer transition-colors',
                    'hover:bg-secondary/80'
                  )}
                  onClick={() => toggleTopic(topic)}
                >
                  {topic}
                  <span className="text-muted-foreground ml-1 text-[10px]">
                    ({topicCounts[topic]})
                  </span>
                </Badge>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
