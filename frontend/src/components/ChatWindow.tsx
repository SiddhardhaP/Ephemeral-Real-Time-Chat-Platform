import { useEffect, useRef } from 'react'
import type { ChatMessage } from '../types/message'
import MessageBubble from './MessageBubble'

interface ChatWindowProps {
  messages: ChatMessage[]
}

export default function ChatWindow({ messages }: ChatWindowProps): JSX.Element {
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <section className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white shadow-soft">
      <div className="border-b border-slate-100 px-4 py-3 text-xs font-medium text-slate-500">
        Messages disappear after 5 minutes
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="text-sm text-slate-400">No messages yet. Start the conversation.</p>
        ) : (
          messages.map((message, index) => (
            <MessageBubble
              key={`${message.timestamp}-${message.sender_id}-${message.receiver_id}-${index}`}
              message={message}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </section>
  )
}
