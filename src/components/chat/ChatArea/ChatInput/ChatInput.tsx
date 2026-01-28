'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { TextArea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store'
import useAIChatStreamHandler from '@/hooks/useAIStreamHandler'
import { useQueryState } from 'nuqs'
import Icon from '@/components/ui/icon'
import { cancelRunAPI } from '@/api/os'

const ChatInput = () => {
  const { chatInputRef } = useStore()

  const { handleStreamResponse } = useAIChatStreamHandler()
  const [selectedAgent] = useQueryState('agent')
  const [teamId] = useQueryState('team')
  const [inputMessage, setInputMessage] = useState('')
  const isStreaming = useStore((state) => state.isStreaming)
  const currentRunId = useStore((state) => state.currentRunId)
  const mode = useStore((state) => state.mode)
  const selectedEndpoint = useStore((state) => state.selectedEndpoint)
  const authToken = useStore((state) => state.authToken)

  const handleCancel = async () => {
    if (!currentRunId) return
    const entityId = mode === 'team' ? teamId : selectedAgent
    if (!entityId) return

    try {
      await cancelRunAPI(
        selectedEndpoint,
        mode,
        entityId,
        currentRunId,
        authToken
      )
    } catch (error) {
      toast.error(
        `Failed to cancel: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  const handleSubmit = async () => {
    if (!inputMessage.trim()) return

    const currentMessage = inputMessage
    setInputMessage('')

    try {
      await handleStreamResponse(currentMessage)
    } catch (error) {
      toast.error(
        `Error in handleSubmit: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
  }

  return (
    <div className="font-geist relative mx-auto mb-1 flex w-full max-w-2xl items-end justify-center gap-x-2">
      <TextArea
        placeholder={'Ask anything'}
        value={inputMessage}
        onChange={(e) => setInputMessage(e.target.value)}
        onKeyDown={(e) => {
          if (
            e.key === 'Enter' &&
            !e.nativeEvent.isComposing &&
            !e.shiftKey &&
            !isStreaming
          ) {
            e.preventDefault()
            handleSubmit()
          }
        }}
        className="border-accent bg-secondary text-primary focus:border-accent w-full border px-4 text-sm"
        disabled={!(selectedAgent || teamId)}
        ref={chatInputRef}
      />
      {isStreaming ? (
        <Button
          onClick={handleCancel}
          size="icon"
          variant="ghost"
          className="bg-destructive/10 hover:bg-destructive/20 rounded-xl p-5 transition-colors"
        >
          <Icon type="stop" className="text-destructive" />
        </Button>
      ) : (
        <Button
          onClick={handleSubmit}
          disabled={!(selectedAgent || teamId) || !inputMessage.trim()}
          size="icon"
          className="bg-brand hover:bg-brand/90 active:bg-brand/80 rounded-xl p-5 text-white transition-colors"
        >
          <Icon type="send" className="text-white" />
        </Button>
      )}
    </div>
  )
}

export default ChatInput
