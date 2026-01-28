'use client'

import { useMemo } from 'react'
import { ChevronRight, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Span } from '@/types/os'

interface TreeViewProps {
  spans: Span[]
  onSelectSpan: (span: Span) => void
  selectedSpanId?: string
}

interface SpanNode {
  span: Span
  children: SpanNode[]
}

function buildTree(spans: Span[]): SpanNode[] {
  const spanMap = new Map<string, SpanNode>()
  const roots: SpanNode[] = []

  // Create nodes
  spans.forEach((span) => {
    spanMap.set(span.span_id, { span, children: [] })
  })

  // Build tree
  spans.forEach((span) => {
    const node = spanMap.get(span.span_id)!
    if (span.parent_span_id && spanMap.has(span.parent_span_id)) {
      spanMap.get(span.parent_span_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  })

  return roots
}

function SpanTreeNode({
  node,
  depth,
  onSelectSpan,
  selectedSpanId
}: {
  node: SpanNode
  depth: number
  onSelectSpan: (span: Span) => void
  selectedSpanId?: string
}) {
  const statusColors = {
    ok: 'text-green-500',
    error: 'text-red-500',
    unset: 'text-gray-400'
  }

  return (
    <div>
      <button
        onClick={() => onSelectSpan(node.span)}
        className={cn(
          'hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
          selectedSpanId === node.span.span_id && 'bg-accent'
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {node.children.length > 0 ? (
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <Circle
            className={cn('h-2 w-2 shrink-0', statusColors[node.span.status])}
          />
        )}
        <span className="font-mono">{node.span.name}</span>
        <span className="text-muted-foreground ml-auto text-xs">
          {node.span.duration_ms}ms
        </span>
      </button>
      {node.children.map((child) => (
        <SpanTreeNode
          key={child.span.span_id}
          node={child}
          depth={depth + 1}
          onSelectSpan={onSelectSpan}
          selectedSpanId={selectedSpanId}
        />
      ))}
    </div>
  )
}

export function TreeView({
  spans,
  onSelectSpan,
  selectedSpanId
}: TreeViewProps) {
  const tree = useMemo(() => buildTree(spans), [spans])

  return (
    <div className="space-y-0.5">
      {tree.map((node) => (
        <SpanTreeNode
          key={node.span.span_id}
          node={node}
          depth={0}
          onSelectSpan={onSelectSpan}
          selectedSpanId={selectedSpanId}
        />
      ))}
    </div>
  )
}
