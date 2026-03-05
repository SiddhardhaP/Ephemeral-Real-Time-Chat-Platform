import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ChatWindow from '../components/ChatWindow'
import Navbar from '../components/Navbar'
import { useChat } from '../context/ChatContext'

export default function ChatPage(): JSX.Element {
  const { userId } = useParams()
  const navigate = useNavigate()
  const receiverId = Number(userId)

  const { messagesByPeer, sendMessage, openConversation, exitChat, wsError } = useChat()
  const [draft, setDraft] = useState('')

  const messages = useMemo(() => messagesByPeer[receiverId] ?? [], [messagesByPeer, receiverId])

  useEffect(() => {
    if (Number.isFinite(receiverId)) {
      openConversation(receiverId)
    }
  }, [openConversation, receiverId])

  const onSend = (event: FormEvent): void => {
    event.preventDefault()
    const content = draft.trim()
    if (!content || !Number.isFinite(receiverId)) {
      return
    }
    sendMessage(receiverId, content)
    setDraft('')
  }

  const onExitChat = (): void => {
    if (!Number.isFinite(receiverId)) {
      navigate('/dashboard')
      return
    }
    exitChat(receiverId)
    navigate('/dashboard')
  }

  return (
    <main className="min-h-screen bg-slatebg bg-glow">
      <Navbar title="Chat Room" />
      <section className="mx-auto grid h-[calc(100vh-73px)] max-w-6xl grid-cols-1 gap-4 px-4 py-4 md:grid-cols-[280px_1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
          <h2 className="text-sm font-semibold text-slate-700">Conversation</h2>
          <p className="mt-2 text-sm text-slate-500">User ID: {receiverId}</p>
          <Link to="/dashboard" className="mt-4 inline-block text-sm font-medium text-brand hover:text-brandDark">
            Back to dashboard
          </Link>
          <button
            type="button"
            onClick={onExitChat}
            className="mt-3 block rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            Exit chat
          </button>
          {wsError && <p className="mt-4 text-xs text-amber-700">{wsError}</p>}
        </aside>

        <div className="flex min-h-0 flex-col gap-3">
          <div className="min-h-0 flex-1">
            <ChatWindow messages={messages} />
          </div>

          <form onSubmit={onSend} className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-soft">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Type a message..."
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
              maxLength={2000}
            />
            <button
              type="submit"
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brandDark"
            >
              Send
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}
