'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { MoreVertical, Trash2, Upload, FileText, Database } from 'lucide-react'
import type { KnowledgeBaseWithStats } from '@/lib/knowledge/types'
import { DocumentUpload } from './DocumentUpload'

interface KnowledgeBaseCardProps {
  kb: KnowledgeBaseWithStats
  onDelete: (id: string) => void
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function KnowledgeBaseCard({ kb, onDelete }: KnowledgeBaseCardProps) {
  const [showUpload, setShowUpload] = useState(false)

  const scopeColors: Record<string, string> = {
    organization: 'bg-purple-100 text-purple-800',
    business_unit: 'bg-blue-100 text-blue-800',
    team: 'bg-green-100 text-green-800',
    personal: 'bg-gray-100 text-gray-800'
  }

  return (
    <>
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-medium">{kb.name}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={scopeColors[kb.scopeType]}>{kb.scopeType}</Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowUpload(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Document
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={() => onDelete(kb.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          {kb.description && (
            <p className="text-muted-foreground mb-4 text-sm">
              {kb.description}
            </p>
          )}
          <div className="text-muted-foreground flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              {kb.documentCount} documents
            </div>
            <div className="flex items-center gap-1">
              <Database className="h-4 w-4" />
              {formatBytes(kb.totalSizeBytes)}
            </div>
          </div>
        </CardContent>
      </Card>

      <DocumentUpload
        kbId={kb.id}
        kbName={kb.name}
        open={showUpload}
        onOpenChange={setShowUpload}
      />
    </>
  )
}
