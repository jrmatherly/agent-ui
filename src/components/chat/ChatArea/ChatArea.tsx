'use client'

import ChatInput from './ChatInput'
import MessageArea from './MessageArea'
import { HITLConfirmationModal } from './HITLConfirmationModal'
import { useHITLHandler } from '@/hooks/useHITLHandler'
import { useStore } from '@/store'
import { useQueryState } from 'nuqs'

const ChatArea = () => {
  const pausedRun = useStore((state) => state.pausedRun)
  const { confirmTool, rejectTool } = useHITLHandler()
  const [agentId] = useQueryState('agent')
  const [sessionId] = useQueryState('session')

  return (
    <main className="bg-background relative m-1.5 flex grow flex-col rounded-xl">
      <MessageArea />
      <div className="sticky bottom-0 ml-9 px-4 pb-2">
        <ChatInput />
      </div>
      {pausedRun && pausedRun.tools.length > 0 && (
        <HITLConfirmationModal
          open={true}
          tool={pausedRun.tools[0]}
          onConfirm={(tool) => {
            if (agentId && sessionId) {
              confirmTool(agentId, pausedRun.run_id, sessionId, tool)
            }
          }}
          onReject={(tool) => {
            if (agentId && sessionId) {
              rejectTool(agentId, pausedRun.run_id, sessionId, tool)
            }
          }}
        />
      )}
    </main>
  )
}

export default ChatArea
