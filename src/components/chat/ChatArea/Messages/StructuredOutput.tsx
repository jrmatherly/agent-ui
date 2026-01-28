'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StructuredOutputProps {
  data: unknown
}

function isArrayOfObjects(data: unknown): data is Record<string, unknown>[] {
  return (
    Array.isArray(data) &&
    data.length > 0 &&
    typeof data[0] === 'object' &&
    data[0] !== null
  )
}

function isSimpleObject(data: unknown): data is Record<string, unknown> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return false
  }
  // Check if all values are primitives
  return Object.values(data).every(
    (v) => typeof v !== 'object' || v === null
  )
}

function JsonTree({ data, depth = 0 }: { data: unknown; depth?: number }) {
  const [isExpanded, setIsExpanded] = useState(depth < 2)

  if (typeof data !== 'object' || data === null) {
    return (
      <span
        className={cn(
          'font-mono text-sm',
          typeof data === 'string' && 'text-green-600 dark:text-green-400',
          typeof data === 'number' && 'text-blue-600 dark:text-blue-400',
          typeof data === 'boolean' && 'text-amber-600 dark:text-amber-400'
        )}
      >
        {JSON.stringify(data)}
      </span>
    )
  }

  const entries = Object.entries(data)
  const isArray = Array.isArray(data)

  return (
    <div className="font-mono text-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="hover:bg-accent -ml-4 rounded px-1"
      >
        {isExpanded ? (
          <ChevronDown className="inline h-3 w-3" />
        ) : (
          <ChevronRight className="inline h-3 w-3" />
        )}
        <span className="text-muted-foreground ml-1">
          {isArray ? `[${entries.length}]` : `{${entries.length}}`}
        </span>
      </button>
      {isExpanded && (
        <div className="ml-4 border-l border-dashed border-gray-300 pl-3 dark:border-gray-600">
          {entries.map(([key, value]) => (
            <div key={key} className="py-0.5">
              <span className="text-purple-600 dark:text-purple-400">
                {isArray ? '' : `${key}: `}
              </span>
              <JsonTree data={value} depth={depth + 1} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function StructuredOutput({ data }: StructuredOutputProps) {
  // Primitive values
  if (typeof data !== 'object' || data === null) {
    return <p className="text-sm">{String(data)}</p>
  }

  // Array of objects -> Table
  if (isArrayOfObjects(data)) {
    const keys = Object.keys(data[0])
    return (
      <Table>
        <TableHeader>
          <TableRow>
            {keys.map((key) => (
              <TableHead key={key} className="capitalize">
                {key}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, idx) => (
            <TableRow key={idx}>
              {keys.map((key) => (
                <TableCell key={key}>{String(row[key] ?? '')}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  // Simple flat object -> Card with key-value pairs
  if (isSimpleObject(data)) {
    return (
      <Card>
        <CardContent className="grid grid-cols-2 gap-2 p-4">
          {Object.entries(data).map(([key, value]) => (
            <div key={key}>
              <p className="text-muted-foreground text-xs">{key}</p>
              <p className="font-medium">{String(value)}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  // Complex nested object -> JSON tree
  return (
    <div className="bg-secondary/50 rounded-lg p-3">
      <JsonTree data={data} />
    </div>
  )
}
