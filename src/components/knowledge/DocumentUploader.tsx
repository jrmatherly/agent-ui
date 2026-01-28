'use client'

import { useCallback, useState } from 'react'
import { Upload, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DocumentUploaderProps {
  onUpload: (file: File) => Promise<void>
  isUploading?: boolean
}

export function DocumentUploader({
  onUpload,
  isUploading = false
}: DocumentUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const file = e.dataTransfer.files[0]
      if (file) {
        await onUpload(file)
      }
    },
    [onUpload]
  )

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        await onUpload(file)
        e.target.value = ''
      }
    },
    [onUpload]
  )

  return (
    <label
      className={cn(
        'border-border hover:border-primary/50 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors',
        isDragging && 'border-primary bg-primary/5',
        isUploading && 'pointer-events-none opacity-50'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isUploading ? (
        <>
          <Loader2 className="text-muted-foreground mb-2 h-8 w-8 animate-spin" />
          <p className="text-muted-foreground text-sm">Uploading...</p>
        </>
      ) : (
        <>
          <Upload className="text-muted-foreground mb-2 h-8 w-8" />
          <p className="text-muted-foreground text-sm">
            Drag and drop a file, or click to browse
          </p>
          <p className="text-muted-foreground/70 mt-1 text-xs">
            Supports PDF, TXT, MD, DOCX
          </p>
        </>
      )}
      <input
        type="file"
        className="sr-only"
        accept=".pdf,.txt,.md,.docx"
        onChange={handleFileChange}
        disabled={isUploading}
        aria-label="Upload document"
      />
    </label>
  )
}
