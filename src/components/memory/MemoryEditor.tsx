'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TextArea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { X, Plus } from 'lucide-react'
import type { MemoryEntry } from '@/types/os'

interface MemoryEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  memory?: MemoryEntry | null
  onSave: (data: { memory: string; topics: string[] }) => Promise<void>
  isLoading?: boolean
}

export function MemoryEditor({
  open,
  onOpenChange,
  memory,
  onSave,
  isLoading
}: MemoryEditorProps) {
  const [content, setContent] = useState('')
  const [topics, setTopics] = useState<string[]>([])
  const [newTopic, setNewTopic] = useState('')

  const isEditing = !!memory

  // Reset form when dialog opens/closes or memory changes
  useEffect(() => {
    if (open) {
      setContent(memory?.memory || '')
      setTopics(memory?.topics || [])
      setNewTopic('')
    }
  }, [open, memory])

  const addTopic = () => {
    const trimmed = newTopic.trim().toLowerCase()
    if (trimmed && !topics.includes(trimmed)) {
      setTopics([...topics, trimmed])
      setNewTopic('')
    }
  }

  const removeTopic = (topic: string) => {
    setTopics(topics.filter((t) => t !== topic))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTopic()
    }
  }

  const handleSave = async () => {
    if (!content.trim()) return
    await onSave({ memory: content.trim(), topics })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Memory' : 'Add Memory'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the memory content and topics.'
              : 'Create a new memory that agents can reference in future conversations.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Memory content */}
          <div className="space-y-2">
            <Label htmlFor="memory-content">Memory</Label>
            <TextArea
              id="memory-content"
              placeholder="Enter the memory content..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Topics */}
          <div className="space-y-2">
            <Label>Topics</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add a topic..."
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={addTopic}
                disabled={!newTopic.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {topics.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {topics.map((topic) => (
                  <Badge
                    key={topic}
                    variant="secondary"
                    className="cursor-pointer gap-1"
                  >
                    {topic}
                    <button
                      onClick={() => removeTopic(topic)}
                      className="hover:text-foreground ml-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-muted-foreground text-xs">
              Topics help organize memories and improve search relevance.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!content.trim() || isLoading}
            className="bg-brand text-white"
          >
            {isLoading ? 'Saving...' : isEditing ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
