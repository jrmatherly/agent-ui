'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'
import type { HITLTool } from '@/types/os'

interface HITLConfirmationModalProps {
  open: boolean
  tool: HITLTool | null
  onConfirm: (tool: HITLTool) => void
  onReject: (tool: HITLTool) => void
}

export function HITLConfirmationModal({
  open,
  tool,
  onConfirm,
  onReject
}: HITLConfirmationModalProps) {
  if (!tool) return null

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Confirmation Required
          </DialogTitle>
          <DialogDescription>
            The agent wants to execute an action that requires your approval.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-secondary rounded-lg p-3">
            <p className="text-muted-foreground text-xs uppercase">Tool</p>
            <p className="font-mono text-sm">{tool.tool_name}</p>
          </div>

          {Object.keys(tool.tool_args).length > 0 && (
            <div className="bg-secondary rounded-lg p-3">
              <p className="text-muted-foreground mb-2 text-xs uppercase">
                Arguments
              </p>
              <pre className="overflow-x-auto text-xs">
                {JSON.stringify(tool.tool_args, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onReject(tool)}>
            Reject
          </Button>
          <Button
            onClick={() => onConfirm(tool)}
            className="bg-brand text-white"
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
