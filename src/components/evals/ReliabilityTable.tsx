'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import type { EvalResult } from '@/types/os'

interface ReliabilityTableProps {
  results: EvalResult[]
}

export function ReliabilityTable({ results }: ReliabilityTableProps) {
  if (results.length === 0) {
    return (
      <div className="text-muted-foreground py-8 text-center text-sm">
        No evaluation results
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[30%]">Input</TableHead>
          <TableHead className="w-[25%]">Expected</TableHead>
          <TableHead className="w-[25%]">Actual</TableHead>
          <TableHead>Score</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {results.map((result) => (
          <TableRow key={result.eval_id}>
            <TableCell className="max-w-0">
              <p className="truncate font-medium">{result.input}</p>
            </TableCell>
            <TableCell className="max-w-0">
              <p className="text-muted-foreground truncate text-sm">
                {result.expected_output ?? '-'}
              </p>
            </TableCell>
            <TableCell className="max-w-0">
              <p className="truncate text-sm">{result.actual_output}</p>
              {result.feedback && (
                <p className="text-muted-foreground mt-1 truncate text-xs">
                  {result.feedback}
                </p>
              )}
            </TableCell>
            <TableCell>
              <span className="font-mono text-sm">
                {Math.round(result.score * 100)}%
              </span>
            </TableCell>
            <TableCell>
              <Badge
                className={
                  result.passed
                    ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                    : 'bg-red-500/10 text-red-600 dark:text-red-400'
                }
              >
                {result.passed ? 'Passed' : 'Failed'}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
