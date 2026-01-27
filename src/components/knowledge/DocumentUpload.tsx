'use client'

import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Upload, File, X, Loader2 } from 'lucide-react'
import { useUploadDocument } from '@/hooks/useKnowledgeBases'
import { toast } from 'sonner'

interface DocumentUploadProps {
  kbId: string
  kbName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DocumentUpload({
  kbId,
  kbName,
  open,
  onOpenChange
}: DocumentUploadProps) {
  const [files, setFiles] = useState<File[]>([])
  const [dragActive, setDragActive] = useState(false)
  const uploadMutation = useUploadDocument(kbId)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    setFiles((prev) => [...prev, ...droppedFiles])
  }, [])

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const selectedFiles = Array.from(e.target.files)
        setFiles((prev) => [...prev, ...selectedFiles])
      }
    },
    []
  )

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleUpload = async () => {
    for (const file of files) {
      try {
        await uploadMutation.mutateAsync(file)
        toast.success(`Uploaded ${file.name}`)
      } catch (error) {
        toast.error(`Failed to upload ${file.name}: ${error}`)
      }
    }
    setFiles([])
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload to {kbName}</DialogTitle>
        </DialogHeader>

        <div
          className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
            dragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
          <p className="text-muted-foreground mb-2 text-sm">
            Drag and drop files here, or click to select
          </p>
          <input
            type="file"
            multiple
            className="hidden"
            id="file-upload"
            onChange={handleFileSelect}
            accept=".pdf,.txt,.md,.docx,.csv,.json"
          />
          <label htmlFor="file-upload">
            <Button variant="outline" asChild>
              <span>Select Files</span>
            </Button>
          </label>
          <p className="text-muted-foreground mt-2 text-xs">
            Supported: PDF, TXT, MD, DOCX, CSV, JSON
          </p>
        </div>

        {files.length > 0 && (
          <div className="max-h-40 space-y-2 overflow-y-auto">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="bg-muted flex items-center justify-between rounded p-2"
              >
                <div className="flex items-center gap-2">
                  <File className="h-4 w-4" />
                  <span className="max-w-[200px] truncate text-sm">
                    {file.name}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={files.length === 0 || uploadMutation.isPending}
          >
            {uploadMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Upload {files.length > 0 && `(${files.length})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
