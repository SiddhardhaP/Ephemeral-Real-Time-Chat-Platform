export interface User {
  id: number
  username: string
  created_at: string
  is_online: boolean
}

export interface LoginPayload {
  username_or_email: string
  password: string
}

export interface RegisterPayload {
  username: string
  email: string
  password: string
}

export interface AuthTokenResponse {
  access_token: string
  token_type: 'bearer'
}
