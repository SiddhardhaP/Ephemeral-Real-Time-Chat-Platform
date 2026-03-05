import type {
  ChatMessage,
  ConnectionAcceptedPayload,
  ConnectionRequestPayload,
  PresencePayload,
  WsEnvelope,
} from '../types/message'

type MessageHandler = (message: ChatMessage) => void
type PresenceHandler = (presence: PresencePayload) => void
type ConnectionRequestHandler = (payload: ConnectionRequestPayload) => void
type ConnectionAcceptedHandler = (payload: ConnectionAcceptedPayload) => void
type ConnectionRejectedHandler = (payload: ConnectionAcceptedPayload) => void
type ErrorHandler = (error: string) => void
type OpenHandler = () => void

export class ChatWebSocketService {
  private socket: WebSocket | null = null
  private reconnectAttempts = 0
  private shouldReconnect = true
  private reconnectTimer: number | null = null
  private manuallyClosing = false

  constructor(
    private readonly baseWsUrl: string,
    private readonly currentUserId: number,
    private readonly token: string,
  ) {}

  onMessage: MessageHandler | null = null
  onPresence: PresenceHandler | null = null
  onConnectionRequest: ConnectionRequestHandler | null = null
  onConnectionAccepted: ConnectionAcceptedHandler | null = null
  onConnectionRejected: ConnectionRejectedHandler | null = null
  onError: ErrorHandler | null = null
  onOpen: OpenHandler | null = null

  connect(): void {
    this.shouldReconnect = true
    this.manuallyClosing = false
    this.openSocket()
  }

  private openSocket(): void {
    const url = `${this.baseWsUrl}/ws/${this.currentUserId}?token=${encodeURIComponent(this.token)}`
    this.socket = new WebSocket(url)

    this.socket.onopen = () => {
      this.reconnectAttempts = 0
      this.onOpen?.()
    }

    this.socket.onmessage = (event) => {
      try {
        const envelope: WsEnvelope = JSON.parse(event.data)
        if (envelope.event === 'message' && envelope.data) {
          this.onMessage?.(envelope.data as ChatMessage)
          return
        }
        if (envelope.event === 'presence' && envelope.data) {
          this.onPresence?.(envelope.data as PresencePayload)
          return
        }
        if (envelope.event === 'connection_request' && envelope.data) {
          this.onConnectionRequest?.(envelope.data as ConnectionRequestPayload)
          return
        }
        if (envelope.event === 'connection_accepted' && envelope.data) {
          this.onConnectionAccepted?.(envelope.data as ConnectionAcceptedPayload)
          return
        }
        if (envelope.event === 'connection_rejected' && envelope.data) {
          this.onConnectionRejected?.(envelope.data as ConnectionAcceptedPayload)
          return
        }
        if (envelope.event === 'error') {
          this.onError?.(envelope.detail ?? 'WebSocket error event')
        }
      } catch {
        this.onError?.('Invalid WebSocket payload received')
      }
    }

    this.socket.onclose = (event) => {
      // Expected close path (navigation, logout, provider cleanup).
      if (this.manuallyClosing || [1000, 1001].includes(event.code)) {
        return
      }
      if (!this.shouldReconnect) {
        return
      }
      const backoff = Math.min(30000, 1000 * 2 ** this.reconnectAttempts)
      this.reconnectAttempts += 1
      this.reconnectTimer = window.setTimeout(() => this.openSocket(), backoff)
    }

    this.socket.onerror = () => {
      if (this.manuallyClosing) {
        return
      }
      this.onError?.('WebSocket connection error')
    }
  }

  sendMessage(receiverId: number, content: string): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.onError?.('WebSocket is not connected')
      return
    }

    this.socket.send(
      JSON.stringify({
        receiver_id: receiverId,
        content,
      }),
    )
  }

  disconnect(): void {
    this.manuallyClosing = true
    this.shouldReconnect = false
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.socket?.close()
    this.socket = null
  }
}
