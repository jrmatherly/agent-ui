'use client'

import { useState } from 'react'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent
} from '@/components/ui/collapsible'
import Icon from '@/components/ui/icon'
import { ReasoningSteps } from '@/types/os'
import { cn } from '@/lib/utils'

interface ReasoningCollapsibleProps {
  reasoning: ReasoningSteps[]
}

interface ReasoningStepDetailProps {
  step: ReasoningSteps
  index: number
}

const ReasoningStepDetail = ({ step, index }: ReasoningStepDetailProps) => (
  <div className="border-border flex flex-col gap-2 border-l-2 py-2 pl-4">
    <div className="flex items-center gap-2">
      <span className="bg-accent text-foreground rounded px-2 py-0.5 text-xs font-medium">
        STEP {index + 1}
      </span>
      <span className="text-foreground text-sm font-medium">{step.title}</span>
      {step.confidence !== undefined && (
        <span className="text-muted-foreground text-xs">
          ({Math.round(step.confidence * 100)}% confidence)
        </span>
      )}
    </div>
    {step.reasoning && (
      <p className="text-muted-foreground text-xs">{step.reasoning}</p>
    )}
    {step.action && (
      <div className="text-xs">
        <span className="text-muted-foreground">Action: </span>
        <span className="text-foreground">{step.action}</span>
      </div>
    )}
    {step.result && (
      <div className="text-xs">
        <span className="text-muted-foreground">Result: </span>
        <span className="text-foreground">{step.result}</span>
      </div>
    )}
  </div>
)

export default function ReasoningCollapsible({
  reasoning
}: ReasoningCollapsibleProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="hover:bg-accent flex items-center gap-2 rounded-lg px-2 py-1 transition-colors">
        <Icon type="reasoning" size="sm" />
        <span className="text-foreground text-sm font-medium">
          Reasoning ({reasoning.length} step{reasoning.length !== 1 ? 's' : ''})
        </span>
        <Icon
          type="chevron-down"
          size="xs"
          className={cn(
            'text-muted-foreground transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 space-y-2">
        {reasoning.map((step, index) => (
          <ReasoningStepDetail
            key={`${step.title}-${index}`}
            step={step}
            index={index}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}
