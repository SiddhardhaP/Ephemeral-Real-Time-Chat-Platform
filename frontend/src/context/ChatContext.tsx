import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react'
import { useAuth } from './AuthContext'
import { api } from '../services/api'
import { ChatWebSocketService } from '../services/websocket'
import type { ChatMessage, ConnectionAcceptedPayload, ConnectionRequestPayload } from '../types/message'

interface ChatContextValue {
  messagesByPeer: Record<number, ChatMessage[]>
  onlineMap: Record<number, boolean>
  pendingRequestIds: number[]
  requestedUserIds: number[]
  lastAcceptedPeerId: number | null
  clearAcceptedPeer: () => void
  sendConnectionRequest: (receiverId: number) => Promise<void>
  acceptConnectionRequest: (senderId: number) => Promise<void>
  rejectConnectionRequest: (senderId: number) => Promise<void>
  sendMessage: (receiverId: number, content: string) => void
  openConversation: (peerId: number) => void
  exitChat: (peerId: number) => void
  wsError: string | null
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined)

const WS_BASE_URL =
  import.meta.env.VITE_WS_BASE_URL ??
  (import.meta.env.DEV ? `ws://${window.location.hostname}:8000` : 'ws://localhost:8000')

export function ChatProvider({ children }: PropsWithChildren): JSX.Element {
  const { token, userId, isAuthenticated } = useAuth()
  const [messagesByPeer, setMessagesByPeer] = useState<Record<number, ChatMessage[]>>({})
  const [onlineMap, setOnlineMap] = useState<Record<number, boolean>>({})
  const [pendingRequestIds, setPendingRequestIds] = useState<number[]>([])
  const [requestedUserIds, setRequestedUserIds] = useState<number[]>([])
  const [lastAcceptedPeerId, setLastAcceptedPeerId] = useState<number | null>(null)
  const [mutedPeers, setMutedPeers] = useState<Set<number>>(new Set())
  const [wsError, setWsError] = useState<string | null>(null)
  const [wsService, setWsService] = useState<ChatWebSocketService | null>(null)
  const mutedPeersRef = useRef<Set<number>>(new Set())

  useEffect(() => {
    mutedPeersRef.current = mutedPeers
  }, [mutedPeers])

  useEffect(() => {
    const loadPendingRequests = async (): Promise<void> => {
      try {
        const response = await api.get<{ requests: Array<{ sender_id: number }> }>('/users/connect/pending')
        setPendingRequestIds(
          Array.from(new Set(response.data.requests.map((request) => request.sender_id))).sort((a, b) => a - b),
        )
      } catch {
        // keep dashboard usable if pending request fetch fails
      }
    }

    if (!isAuthenticated || !token || !userId) {
      wsService?.disconnect()
      setWsService(null)
      setPendingRequestIds([])
      setRequestedUserIds([])
      setLastAcceptedPeerId(null)
      return
    }

    void loadPendingRequests()

    const service = new ChatWebSocketService(WS_BASE_URL, userId, token)

    service.onMessage = (message) => {
      const peerId = message.sender_id === userId ? message.receiver_id : message.sender_id
      if (mutedPeersRef.current.has(peerId)) {
        return
      }
      setMessagesByPeer((prev) => ({
        ...prev,
        [peerId]: [...(prev[peerId] ?? []), message],
      }))
    }

    service.onPresence = (presence) => {
      setOnlineMap((prev) => ({
        ...prev,
        [presence.user_id]: presence.is_online,
      }))
    }
    service.onConnectionRequest = (payload: ConnectionRequestPayload) => {
      setPendingRequestIds((prev) => {
        if (prev.includes(payload.from_user_id)) {
          return prev
        }
        return [...prev, payload.from_user_id].sort((a, b) => a - b)
      })
    }
    service.onConnectionAccepted = (payload: ConnectionAcceptedPayload) => {
      setLastAcceptedPeerId(payload.user_id)
      setRequestedUserIds((prev) => prev.filter((id) => id !== payload.user_id))
      setPendingRequestIds((prev) => prev.filter((id) => id !== payload.user_id))
    }
    service.onConnectionRejected = (payload: ConnectionAcceptedPayload) => {
      setRequestedUserIds((prev) => prev.filter((id) => id !== payload.user_id))
    }

    service.onError = (error) => {
      setWsError(error)
    }
    service.onOpen = () => {
      setWsError(null)
    }

    service.connect()
    setWsService(service)

    return () => {
      service.disconnect()
    }
  }, [isAuthenticated, token, userId])

  const sendConnectionRequest = useCallback(async (receiverId: number) => {
    await api.post('/users/connect/request', { receiver_id: receiverId })
    setRequestedUserIds((prev) => {
      if (prev.includes(receiverId)) {
        return prev
      }
      return [...prev, receiverId]
    })
  }, [])

  const acceptConnectionRequest = useCallback(async (senderId: number) => {
    await api.post(`/users/connect/accept/${senderId}`)
    setPendingRequestIds((prev) => prev.filter((id) => id !== senderId))
    setLastAcceptedPeerId(senderId)
  }, [])

  const rejectConnectionRequest = useCallback(async (senderId: number) => {
    await api.post(`/users/connect/reject/${senderId}`)
    setPendingRequestIds((prev) => prev.filter((id) => id !== senderId))
  }, [])

  const sendMessage = useCallback(
    (receiverId: number, content: string) => {
      setMutedPeers((prev) => {
        if (!prev.has(receiverId)) {
          return prev
        }
        const next = new Set(prev)
        next.delete(receiverId)
        return next
      })
      wsService?.sendMessage(receiverId, content)
    },
    [wsService],
  )

  const openConversation = useCallback((peerId: number) => {
    setMutedPeers((prev) => {
      if (!prev.has(peerId)) {
        return prev
      }
      const next = new Set(prev)
      next.delete(peerId)
      return next
    })
  }, [])

  const exitChat = useCallback((peerId: number) => {
    setMutedPeers((prev) => {
      if (prev.has(peerId)) {
        return prev
      }
      const next = new Set(prev)
      next.add(peerId)
      return next
    })
    setMessagesByPeer((prev) => {
      if (!(peerId in prev)) {
        return prev
      }
      const next = { ...prev }
      delete next[peerId]
      return next
    })
  }, [])

  const value = useMemo<ChatContextValue>(
    () => ({
      messagesByPeer,
      onlineMap,
      pendingRequestIds,
      requestedUserIds,
      lastAcceptedPeerId,
      clearAcceptedPeer: () => setLastAcceptedPeerId(null),
      sendConnectionRequest,
      acceptConnectionRequest,
      rejectConnectionRequest,
      sendMessage,
      openConversation,
      exitChat,
      wsError,
    }),
    [
      messagesByPeer,
      onlineMap,
      pendingRequestIds,
      requestedUserIds,
      lastAcceptedPeerId,
      sendConnectionRequest,
      acceptConnectionRequest,
      rejectConnectionRequest,
      sendMessage,
      openConversation,
      exitChat,
      wsError,
    ],
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChat(): ChatContextValue {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChat must be used within ChatProvider')
  }
  return context
}
