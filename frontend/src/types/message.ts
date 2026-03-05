export interface ChatMessage {
  sender_id: number
  receiver_id: number
  content: string
  timestamp: string
}

export interface WsEnvelope {
  event:
    | 'message'
    | 'presence'
    | 'connection_request'
    | 'connection_accepted'
    | 'connection_rejected'
    | 'error'
  data?: ChatMessage | PresencePayload | ConnectionRequestPayload | ConnectionAcceptedPayload
  detail?: string
}

export interface PresencePayload {
  user_id: number
  is_online: boolean
}

export interface ConnectionRequestPayload {
  from_user_id: number
  from_username?: string
}

export interface ConnectionAcceptedPayload {
  user_id: number
}
